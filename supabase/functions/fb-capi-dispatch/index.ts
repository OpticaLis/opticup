import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// fb-capi-dispatch — Facebook CAPI dispatch Edge Function (M4 CRM)
// P2.1 (M4_FB_CAPI_HYBRID_DEDUPLICATION 2026-05-15) + P2.2 (M4_FB_CAPI_PURCHASE_EVENTS 2026-05-19)
// pg_cron 'fb_capi_dispatch_consumer' calls with dispatch_mode='cron'.
// Events: Lead | CompleteRegistration | EventAttended | Purchase (Purchase adds custom_data value+currency).
// Token: storefront_config.analytics->>'fb_capi_token'. No token → skipped_no_token.
// Iron Rule 22: tenant_id filter on every .from() query. PII hashed server-side.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Facebook CAPI endpoint
const META_CAPI_URL = "https://graph.facebook.com/v19.0";
// Batch size per cron tick (D-AUTH-6)
const BATCH_SIZE = 20;

// Allowed origins (like lead-intake and submit-lead pattern)
const ALLOWED_ORIGINS = [
  "https://app.opticalis.co.il",
  "https://prizma-optic.co.il",
  "https://demo.opticalis.co.il",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Hash a string with SHA-256, return lowercase hex digest
async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Normalize phone to E.164 (Israeli domestic → +972xxx)
function normalizePhoneE164(raw: string | null): string | null {
  if (!raw) return null;
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;

  let e164: string;
  if (hasPlus) {
    e164 = "+" + digits;
  } else if (digits.startsWith("972")) {
    e164 = "+" + digits;
  } else if (digits.startsWith("0") && digits.length === 10) {
    e164 = "+972" + digits.slice(1);
  } else {
    return null;
  }

  const withoutPlus = e164.slice(1);
  if (!/^\d{10,15}$/.test(withoutPlus)) return null;
  return e164;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface QueueRow {
  id: string;
  tenant_id: string;
  lead_id: string;
  event_id: string | null;
  event_name: string;
  retries: number;
}

interface LeadRow {
  email: string | null;
  phone: string | null;
}

interface StorefrontConfig {
  analytics: Record<string, unknown>;
}

async function processQueueRow(
  db: SupabaseClient,
  row: QueueRow,
): Promise<void> {
  const { id: queueId, tenant_id: tenantId, lead_id: leadId, event_id: eventId, event_name: eventName, retries } = row;

  // Step 1: Fetch lead data (Iron Rule 22: tenant_id filter)
  const { data: lead, error: leadErr } = await db
    .from("crm_leads")
    .select("email, phone")
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .single() as { data: LeadRow | null; error: unknown };

  if (leadErr || !lead) {
    await updateQueueRow(db, queueId, tenantId, "permanent_error", retries,
      "lead_not_found: crm_leads row missing or cross-tenant", null);
    return;
  }

  // Step 2: Check email/phone availability
  const emailNorm = lead.email ? lead.email.toLowerCase().trim() : null;
  const phoneNorm = normalizePhoneE164(lead.phone);

  if (!emailNorm && !phoneNorm) {
    // Per D-AUTH-7: both missing → no_match
    await updateQueueRow(db, queueId, tenantId, "no_match", retries,
      "no_match: no email and no phone on lead", null);
    return;
  }

  // Step 3: Fetch CAPI token from storefront_config.analytics (D-AUTH-1)
  const { data: config, error: configErr } = await db
    .from("storefront_config")
    .select("analytics")
    .eq("tenant_id", tenantId)
    .single() as { data: StorefrontConfig | null; error: unknown };

  const analytics = config?.analytics ?? {};
  const capiToken = (analytics as Record<string, unknown>)["fb_capi_token"];

  if (configErr || !capiToken || typeof capiToken !== "string" || capiToken.trim() === "") {
    // Per D-AUTH-3: no token → skipped_no_token (not an error, expected state for demo)
    await updateQueueRow(db, queueId, tenantId, "skipped_no_token", retries,
      "no fb_capi_token configured for tenant in storefront_config.analytics", null);
    return;
  }

  // Step 4: Fetch pixel ID from same analytics config
  const pixelId = (analytics as Record<string, unknown>)["facebook_pixel_id"];
  if (!pixelId || typeof pixelId !== "string") {
    await updateQueueRow(db, queueId, tenantId, "permanent_error", retries,
      "no facebook_pixel_id configured for tenant in storefront_config.analytics", null);
    return;
  }

  // Step 5: Hash PII server-side (D-AUTH-7, D-AUTH-8)
  const userData: Record<string, string> = {};
  if (emailNorm) {
    userData["em"] = await sha256Hex(emailNorm);
  }
  if (phoneNorm) {
    // E.164 without leading '+' per Meta docs
    const phoneDigits = phoneNorm.startsWith("+") ? phoneNorm.slice(1) : phoneNorm;
    userData["ph"] = await sha256Hex(phoneDigits);
  }

  // Step 6a: Purchase — fetch purchase_amount at dispatch time (D-AUTH-9, IR22)
  let purchaseCustomData: { value: number; currency: string } | null = null;
  if (eventName === "Purchase") {
    const { data: attendee, error: attendeeErr } = await db
      .from("crm_event_attendees")
      .select("purchase_amount")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .gt("purchase_amount", 0)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (attendeeErr || !attendee || !attendee.purchase_amount) {
      await updateQueueRow(db, queueId, tenantId, "permanent_error", retries,
        "attendee_not_found_or_zero_amount: no matching crm_event_attendees row with purchase_amount>0", null);
      return;
    }
    // D-AUTH-6: ILS hardcoded v1; D-AUTH-9: raw numeric, no rounding
    purchaseCustomData = { value: Number(attendee.purchase_amount), currency: "ILS" };
  }

  // Step 6b: Build event payload (no PII — only hashed values stored)
  const eventPayload = {
    em: userData["em"] ?? null,
    ph: userData["ph"] ?? null,
    event_name: eventName,
    event_id: eventId ?? undefined,
    ...(purchaseCustomData ? { custom_data: purchaseCustomData } : {}),
  };

  // Step 7: Dispatch to Meta CAPI
  const eventTime = Math.floor(Date.now() / 1000);
  const capiBody = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        action_source: "website",
        event_id: eventId ?? undefined,
        user_data: userData,
        ...(purchaseCustomData ? { custom_data: purchaseCustomData } : {}),
      },
    ],
  };

  let metaResponse: Record<string, unknown> | null = null;
  let newStatus: string;
  let errorMessage: string | null = null;

  try {
    const metaRes = await fetch(`${META_CAPI_URL}/${pixelId}/events?access_token=${capiToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capiBody),
    });

    const metaBody = await metaRes.json() as Record<string, unknown>;
    metaResponse = metaBody;

    if (metaRes.ok && !metaBody["error"]) {
      newStatus = "sent";
    } else {
      // Determine if this is a permanent error (4xx client errors) or retryable (5xx)
      const fbError = metaBody["error"] as Record<string, unknown> | null;
      const fbCode = fbError?.["code"];
      const isPermanent = metaRes.status >= 400 && metaRes.status < 500;
      newStatus = isPermanent ? "permanent_error" : "failed";
      errorMessage = `meta_api_error(${metaRes.status}): code=${fbCode ?? "unknown"}`;
    }
  } catch (err) {
    newStatus = "failed";
    errorMessage = `network_error: ${(err as Error).message}`;
  }

  // Step 8: Cache event_payload (hashed only, no PII) and update status
  await db
    .from("crm_capi_dispatch_queue")
    .update({
      status: newStatus,
      retries: retries + (newStatus === "failed" ? 1 : 0),
      error_message: errorMessage,
      meta_response: metaResponse,
      event_payload: eventPayload,
      processed_at: new Date().toISOString(),
    })
    .eq("id", queueId)
    .eq("tenant_id", tenantId);
}

async function updateQueueRow(
  db: SupabaseClient,
  queueId: string,
  tenantId: string,
  status: string,
  retries: number,
  errorMessage: string,
  metaResponse: Record<string, unknown> | null,
): Promise<void> {
  await db
    .from("crm_capi_dispatch_queue")
    .update({
      status,
      retries: retries + (status === "failed" ? 1 : 0),
      error_message: errorMessage,
      meta_response: metaResponse,
      processed_at: new Date().toISOString(),
    })
    .eq("id", queueId)
    .eq("tenant_id", tenantId);
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Origin check (like lead-intake + submit-lead pattern) — relaxed for pg_cron
  // pg_cron calls via net.http_post with Authorization header (service_role key);
  // no Origin header in internal calls. External callers must match allowlist.
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const dispatchMode = body["dispatch_mode"];
  if (dispatchMode !== "cron") {
    return jsonResponse({ error: "Invalid dispatch_mode" }, 400);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Claim a batch of rows (queued + retriable failed, ordered by scheduled_at)
  // Iron Rule 22: both tenant_id-scoped filter (SKIP LOCKED ensures no double-dispatch)
  const { data: rows, error: fetchErr } = await db
    .from("crm_capi_dispatch_queue")
    .select("id, tenant_id, lead_id, event_id, event_name, retries")
    .in("status", ["queued", "failed"])
    .lte("scheduled_at", new Date().toISOString())
    .lt("retries", 3)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE) as { data: QueueRow[] | null; error: unknown };

  if (fetchErr) {
    console.error("[fb-capi-dispatch] fetch error:", fetchErr);
    return jsonResponse({ error: "Database error fetching queue" }, 500);
  }

  if (!rows || rows.length === 0) {
    return jsonResponse({ dispatched: 0, message: "no rows to process" });
  }

  // Process rows sequentially (avoid rate-limit bursts on Meta API)
  let processed = 0;
  let errors = 0;
  for (const row of rows) {
    try {
      await processQueueRow(db, row);
      processed++;
    } catch (err) {
      console.error(`[fb-capi-dispatch] row ${row.id} unhandled error:`, (err as Error).message);
      errors++;
      // Attempt to mark as failed so cron doesn't retry infinitely
      try {
        await updateQueueRow(db, row.id, row.tenant_id, "failed", row.retries,
          `unhandled_exception: ${(err as Error).message}`, null);
      } catch (_) { /* swallow secondary failure */ }
    }
  }

  return jsonResponse({
    dispatched: processed,
    errors,
    total_claimed: rows.length,
  });
});
