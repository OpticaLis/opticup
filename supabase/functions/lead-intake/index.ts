import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// lead-intake — Edge Function for public lead form submission
// Module 4 CRM — Go-Live Phase P1 (+ P4 dispatch wiring, 2026-04-22)
// ============================================================
// 2026-05-14 (M3_UTM_TRIPLE_LAYER_PERSISTENCE, Phase 1 P1.1): every
// lead-intake POST records a lead_submit touchpoint in
// crm_lead_touchpoints (fresh + duplicate + race branches all emit one).
// dedupe_key = 'lead_submit:' + lead_id + ':' + epoch_seconds so
// repeated submits across time are recorded individually while same-
// second collisions fold gracefully. Following the fresh-insert path
// the EF also enqueues an async resolve_touchpoints_to_lead via
// EdgeRuntime.waitUntil so prior anonymous touchpoints linked by
// phone_normalized within 30 days are backfilled. Async — does NOT
// block the 201/409 response.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";

const DEFAULT_SOURCE = "supersale_form";

const EYE_EXAM_OPTIONS: readonly string[] = [
  "לא, אין צורך בבדיקה",
  "כן, בדיקה רגילה",
  "כן, בדיקת מולטיפוקל",
  "יש לי כבר מרשם עדכני",
] as const;

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

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function boolOrFalse(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function normalizePhone(raw: string): string | null {
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

import { dispatchFreshLead, dispatchIntakeMessages } from "./dispatch.ts";

// M3_UTM_TRIPLE_LAYER_PERSISTENCE — record a lead_submit touchpoint.
// Synchronous (no waitUntil); errors swallowed (lead is already persisted).
type UtmBag = { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; utm_term: string | null; utm_campaign_id: string | null };
// deno-lint-ignore no-explicit-any
async function recordLeadSubmitTouchpoint(db: any, tenantId: string, leadId: string, phoneNormalized: string, utms: UtmBag, refererUrl: string | null, landingUrl: string | null): Promise<void> {
  try {
    const dedupeKey = `lead_submit:${leadId}:${Math.floor(Date.now() / 1000)}`;
    const { error } = await db.rpc("_record_touchpoint", {
      p_tenant_id: tenantId, p_lead_id: leadId, p_phone_normalized: phoneNormalized,
      p_touchpoint_type: "lead_submit",
      p_event_id: null, p_attendee_id: null, p_short_link_id: null, p_short_link_code: null, p_broadcast_id: null,
      p_utm_source: utms.utm_source, p_utm_medium: utms.utm_medium, p_utm_campaign: utms.utm_campaign,
      p_utm_content: utms.utm_content, p_utm_term: utms.utm_term, p_utm_campaign_id: utms.utm_campaign_id,
      p_referrer_url: refererUrl, p_landing_url: landingUrl, p_dedupe_key: dedupeKey,
    });
    if (error) console.warn("lead_submit touchpoint insert failed:", error.message);
  } catch (e) { console.warn("recordLeadSubmitTouchpoint exception:", (e as Error).message); }
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const tenantSlug = trimOrNull(body.tenant_slug);
  const name = trimOrNull(body.name);
  const phoneRaw = trimOrNull(body.phone);
  const emailRaw = trimOrNull(body.email);

  if (!tenantSlug) return errorResponse("Missing tenant_slug", 400);
  if (!name) return errorResponse("Missing name", 400);
  if (!phoneRaw) return errorResponse("Missing phone", 400);
  if (!emailRaw) return errorResponse("Missing email", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return errorResponse("Invalid email format", 400);

  const phone = normalizePhone(phoneRaw);
  if (!phone) return errorResponse("Invalid phone number", 400);

  const email = emailRaw.toLowerCase();
  const eyeExam = trimOrNull(body.eye_exam);
  if (eyeExam !== null && !EYE_EXAM_OPTIONS.includes(eyeExam)) {
    return errorResponse("INVALID_EYE_EXAM_DEFAULT", 400);
  }
  const notes = trimOrNull(body.notes);
  const language = trimOrNull(body.language) || "he";
  const source = trimOrNull(body.source) || DEFAULT_SOURCE;
  const utm_source = trimOrNull(body.utm_source);
  const utm_medium = trimOrNull(body.utm_medium);
  const utm_campaign = trimOrNull(body.utm_campaign);
  const utm_content = trimOrNull(body.utm_content);
  const utm_term = trimOrNull(body.utm_term);
  const utm_campaign_id = trimOrNull(body.utm_campaign_id);
  // M3_UTM_TRIPLE_LAYER_PERSISTENCE — optional context for touchpoint capture.
  // The storefront /supersale/ form may pass these in the future; today they
  // arrive as NULL on most submits and the touchpoint records that fact.
  const referrer_url = trimOrNull(body.referrer_url);
  const landing_url = trimOrNull(body.landing_url);
  const termsApproved = boolOrFalse(body.terms_approved);
  const marketingConsent = boolOrFalse(body.marketing_consent);
  // M4_FB_CAPI_HYBRID_DEDUPLICATION (P2.1) — optional shared FB event_id for
  // browser-CAPI dedup. NULL until storefront SPEC M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF.
  // Non-UUID values silently nulled (null-tolerant, backward-compat).
  const rawFbEventId = trimOrNull(body.fb_event_id);
  const fbEventId: string | null = rawFbEventId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawFbEventId)
    ? rawFbEventId : null;

  const clientNotes: string | null = notes ? notes : null;

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tenant, error: tenantErr } = await db
    .from("tenants")
    .select("id, is_active")
    .eq("slug", tenantSlug)
    .single();

  if (tenantErr || !tenant) {
    return errorResponse("invalid tenant", 401);
  }
  if (!tenant.is_active) {
    return errorResponse("tenant inactive", 403);
  }

  const tenantId: string = tenant.id;

  const utmsBag = {
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id,
  };

  // --- Duplicate check ---
  const { data: existing, error: dupErr } = await db
    .from("crm_leads")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();

  if (dupErr) {
    console.error("Duplicate-check error:", dupErr);
    return errorResponse("Database error", 500);
  }

  if (existing) {
    await db.from("crm_leads")
      .update({ unsubscribed_at: null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("tenant_id", tenantId)
      .not("unsubscribed_at", "is", null);

    // M3_UTM_TRIPLE_LAYER_PERSISTENCE — record duplicate submit touchpoint.
    await recordLeadSubmitTouchpoint(db, tenantId, existing.id, phone, utmsBag, referrer_url, landing_url);

    await dispatchIntakeMessages(
      db,
      tenantId,
      existing.id,
      "lead_intake_duplicate",
      existing.full_name || name,
      phone,
      email,
    );
    return jsonResponse({
      duplicate: true,
      is_new: false,
      id: existing.id,
      existing_name: existing.full_name,
    }, 409);
  }

  const nowIso = new Date().toISOString();
  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    full_name: name,
    phone,
    email,
    language,
    status: "new",
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    utm_campaign_id,
    client_notes: clientNotes,
    eye_exam_default: eyeExam,
    terms_approved: termsApproved,
    terms_approved_at: termsApproved ? nowIso : null,
    marketing_consent: marketingConsent,
    // M4_FB_CAPI_HYBRID_DEDUPLICATION — persist shared FB event_id (nullable)
    fb_event_id: fbEventId,
  };

  const { data: inserted, error: insErr } = await db
    .from("crm_leads")
    .insert(row)
    .select("id")
    .single();

  if (insErr || !inserted) {
    // deno-lint-ignore no-explicit-any
    const code = (insErr as any)?.code;
    if (code === "23505") {
      const { data: racedRow } = await db
        .from("crm_leads")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .eq("phone", phone)
        .eq("is_deleted", false)
        .limit(1)
        .maybeSingle();
      if (racedRow?.id) {
        // M3_UTM_TRIPLE_LAYER_PERSISTENCE — record touchpoint for the race
        // branch too so attribution is captured even on the lost-race path.
        await recordLeadSubmitTouchpoint(db, tenantId, racedRow.id, phone, utmsBag, referrer_url, landing_url);

        await dispatchIntakeMessages(
          db,
          tenantId,
          racedRow.id,
          "lead_intake_duplicate",
          racedRow.full_name || name,
          phone,
          email,
        );
      }
      return jsonResponse({
        duplicate: true,
        is_new: false,
        id: racedRow?.id ?? null,
        existing_name: racedRow?.full_name ?? null,
      }, 409);
    }
    console.error("Insert error:", insErr);
    return errorResponse("Could not create lead", 500);
  }

  // M3_UTM_TRIPLE_LAYER_PERSISTENCE — record fresh-insert touchpoint
  // BEFORE dispatch so the row is committed before the response returns.
  await recordLeadSubmitTouchpoint(db, tenantId, inserted.id, phone, utmsBag, referrer_url, landing_url);

  // Background: M3_UTM_TRIPLE_LAYER_PERSISTENCE — async resolve prior
  // anonymous touchpoints to this lead. Does NOT block the response.
  EdgeRuntime.waitUntil(
    db.rpc("resolve_touchpoints_to_lead", {
      p_tenant_id: tenantId,
      p_lead_id: inserted.id,
      p_phone_normalized: phone,
    }).then((res: { error: { message: string } | null }) => {
      if (res.error) {
        console.warn("[lead-intake] resolve_touchpoints_to_lead failed:", res.error.message);
      }
    }).catch((err: Error) => {
      console.warn("[lead-intake] resolve_touchpoints_to_lead exception:", err.message);
    }),
  );

  // Background: existing dispatch (T1/T5) — unchanged.
  EdgeRuntime.waitUntil(
    dispatchFreshLead(db, tenantId, inserted.id, name, phone, email)
      .catch((err) => console.error("[lead-intake] background dispatch failed", err)),
  );

  // M4_FB_CAPI_HYBRID_DEDUPLICATION — enqueue CAPI dispatch row (non-blocking, ~60s cron).
  EdgeRuntime.waitUntil(
    db.from("crm_capi_dispatch_queue").insert({
      tenant_id: tenantId,
      lead_id: inserted.id,
      event_id: fbEventId,
      event_name: "Lead",
      status: "queued",
    }).then((res: { error: { message: string } | null }) => {
      if (res.error) {
        console.warn("[lead-intake] capi_dispatch_queue insert failed:", res.error.message);
      }
    }).catch((err: Error) => {
      console.warn("[lead-intake] capi_dispatch_queue insert exception:", err.message);
    }),
  );

  return jsonResponse({
    id: inserted.id,
    is_new: true,
  }, 201);
});
