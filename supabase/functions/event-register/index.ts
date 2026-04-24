import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// event-register — public event registration (P16 + STOREFRONT_FORMS P-A).
// Auth modes: (a) ?token=<b64url(lead:tenant:event:exp)>.<b64url(hmac)> or
// (b) legacy ?event_id&lead_id (GET) / body UUIDs (POST). HMAC signature
// with SERVICE_ROLE_KEY is the auth (same model as unsubscribe EF).
// verify_jwt=false (public form). Duplicated HMAC helpers per M4-DEBT-FINAL-01.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Legacy JWT anon for the cross-EF call to send-message (mirrors the key in
// js/shared.js + lead-intake EF — not a new exposure).
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";

const SEND_MESSAGE_URL = `${SUPABASE_URL}/functions/v1/send-message`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s);
}

function jsonResp(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

type RegTokenPayload = { leadId: string; tenantId: string; eventId: string; exp: number };
async function verifyRegistrationToken(token: string): Promise<RegTokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const decode = (s: string) => {
      const pad = (4 - (s.length % 4)) % 4;
      const bin = atob((s + "=".repeat(pad)).replace(/-/g, "+").replace(/_/g, "/"));
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    };
    const payloadBytes = decode(parts[0]);
    const providedSig = decode(parts[1]);
    const payload = new TextDecoder().decode(payloadBytes);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(SERVICE_ROLE_KEY),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(payload)),
    );
    if (providedSig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= providedSig[i] ^ expected[i];
    if (diff !== 0) return null;
    const [leadId, tenantId, eventId, expStr] = payload.split(":");
    if (!isUuid(leadId) || !isUuid(tenantId) || !isUuid(eventId) || !expStr) return null;
    const exp = Number.parseInt(expStr, 10);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    return { leadId, tenantId, eventId, exp };
  } catch {
    return null;
  }
}

type FormBody = {
  tenant_id?: string;
  lead_id?: string;
  event_id?: string;
  arrival_time?: string;
  eye_exam?: string;
  notes?: string;
};

// Fire-and-forget SMS+email confirmation after a successful public-form
// registration (mirrors the lead-intake EF dispatch pattern). Failures are
// logged to crm_message_log but never bubble up — the attendee row is
// already persisted by the time we dispatch.
async function dispatchRegistrationMessages(
  tenantId: string,
  leadId: string,
  templateBaseSlug: string,
  variables: Record<string, string>,
  hasEmail: boolean,
): Promise<void> {
  const calls: Promise<unknown>[] = [];
  calls.push(callSendMessage(tenantId, leadId, "sms", templateBaseSlug, variables));
  if (hasEmail) {
    calls.push(callSendMessage(tenantId, leadId, "email", templateBaseSlug, variables));
  }
  await Promise.allSettled(calls);
}

async function callSendMessage(
  tenantId: string,
  leadId: string,
  channel: "sms" | "email",
  templateSlug: string,
  variables: Record<string, string>,
): Promise<void> {
  try {
    const res = await fetch(SEND_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        lead_id: leadId,
        channel,
        template_slug: templateSlug,
        variables,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(
        `send-message ${channel}/${templateSlug} HTTP ${res.status}: ${txt.slice(0, 200)}`,
      );
    }
  } catch (e) {
    console.error(
      `send-message ${channel}/${templateSlug} exception:`,
      (e as Error).message || e,
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // GET = bootstrap payload for the form (event details + lead pre-fill).
  if (req.method === "GET") {
    const url = new URL(req.url);
    let eventId: string | null = null;
    let leadId: string | null = null;
    const tokenParam = url.searchParams.get("token");
    if (tokenParam) {
      const parsed = await verifyRegistrationToken(tokenParam);
      if (!parsed) {
        return jsonResp({ success: false, error: "invalid_token" }, 400);
      }
      eventId = parsed.eventId;
      leadId = parsed.leadId;
    } else {
      eventId = url.searchParams.get("event_id");
      leadId = url.searchParams.get("lead_id");
    }
    if (!isUuid(eventId) || !isUuid(leadId)) {
      return jsonResp({ success: false, error: "invalid_ids" }, 400);
    }
    const evRes = await db.from("crm_events")
      .select("id, tenant_id, name, event_date, start_time, location_address, status, max_capacity, booking_fee")
      .eq("id", eventId!)
      .eq("is_deleted", false)
      .maybeSingle();
    if (evRes.error || !evRes.data) {
      return jsonResp({ success: false, error: "event_not_found" }, 404);
    }
    const leadRes = await db.from("crm_leads")
      .select("id, full_name, phone, email, tenant_id")
      .eq("id", leadId!)
      .eq("tenant_id", evRes.data.tenant_id)
      .eq("is_deleted", false)
      .maybeSingle();
    if (leadRes.error || !leadRes.data) {
      return jsonResp({ success: false, error: "lead_not_found" }, 404);
    }
    const tRes = await db.from("tenants")
      .select("name, logo_url")
      .eq("id", evRes.data.tenant_id)
      .maybeSingle();
    return jsonResp({
      success: true,
      tenant_id: evRes.data.tenant_id,
      tenant_name: tRes.data?.name || null,
      tenant_logo_url: tRes.data?.logo_url || null,
      lead_id: leadRes.data.id,
      event_id: evRes.data.id,
      lead_name: leadRes.data.full_name || "",
      lead_phone: leadRes.data.phone || "",
      lead_email: leadRes.data.email || "",
      event_name: evRes.data.name || "",
      event_date: evRes.data.event_date || "",
      event_time: evRes.data.start_time || "",
      event_location: evRes.data.location_address || "",
      event_status: evRes.data.status || "",
      booking_fee: evRes.data.booking_fee ?? 50,
    }, 200);
  }

  if (req.method !== "POST") {
    return jsonResp({ success: false, error: "method_not_allowed" }, 405);
  }

  let body: FormBody;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ success: false, error: "invalid_json" }, 400);
  }

  // STOREFRONT_FORMS P-A: when ?token=... is present, extract the ID triplet
  // from the signed payload; body values are ignored. Without token, fall back
  // to the legacy body-UUID contract (unchanged behavior for old callers).
  const postUrl = new URL(req.url);
  const postToken = postUrl.searchParams.get("token");
  if (postToken) {
    const parsed = await verifyRegistrationToken(postToken);
    if (!parsed) {
      return jsonResp({ success: false, error: "invalid_token" }, 400);
    }
    body.tenant_id = parsed.tenantId;
    body.lead_id = parsed.leadId;
    body.event_id = parsed.eventId;
  }

  if (!isUuid(body.tenant_id) || !isUuid(body.lead_id) || !isUuid(body.event_id)) {
    return jsonResp({ success: false, error: "invalid_ids" }, 400);
  }

  // Verify lead and event both exist in the same tenant. P-FINAL Track B:
  // widened SELECTs to also fetch the fields we need for the confirmation
  // dispatch variables — avoids a second round trip after the RPC.
  const [leadRes, eventRes] = await Promise.all([
    db.from("crm_leads")
      .select("id, full_name, phone, email")
      .eq("id", body.lead_id!)
      .eq("tenant_id", body.tenant_id!)
      .eq("is_deleted", false)
      .maybeSingle(),
    db.from("crm_events")
      .select("id, status, name, event_date, start_time, location_address")
      .eq("id", body.event_id!)
      .eq("tenant_id", body.tenant_id!)
      .eq("is_deleted", false)
      .maybeSingle(),
  ]);

  if (leadRes.error || !leadRes.data) {
    return jsonResp({ success: false, error: "lead_not_found" }, 404);
  }
  if (eventRes.error || !eventRes.data) {
    return jsonResp({ success: false, error: "event_not_found" }, 404);
  }

  // Call the canonical registration RPC (handles capacity, duplicate,
  // waiting-list, event_closed — single source of truth).
  const rpcRes = await db.rpc("register_lead_to_event", {
    p_tenant_id: body.tenant_id!,
    p_lead_id: body.lead_id!,
    p_event_id: body.event_id!,
    p_method: "form",
  });

  if (rpcRes.error) {
    console.error("register_lead_to_event failed:", rpcRes.error);
    return jsonResp(
      { success: false, error: "rpc_failed", detail: rpcRes.error.message },
      500,
    );
  }

  const result = (rpcRes.data ?? {}) as {
    success?: boolean;
    error?: string;
    status?: string;
    attendee_id?: string;
  };

  // Persist form-specific fields on success (best-effort — registration
  // itself is authoritative; failure here shouldn't fail the request).
  if (result.success && result.attendee_id) {
    const patch: Record<string, unknown> = {};
    if (typeof body.arrival_time === "string" && body.arrival_time.trim()) {
      patch.scheduled_time = body.arrival_time.trim();
    }
    if (typeof body.eye_exam === "string" && body.eye_exam.trim()) {
      patch.eye_exam_needed = body.eye_exam.trim();
    }
    if (typeof body.notes === "string" && body.notes.trim()) {
      patch.client_notes = body.notes.trim().slice(0, 2000);
    }
    if (Object.keys(patch).length) {
      const upd = await db
        .from("crm_event_attendees")
        .update(patch)
        .eq("id", result.attendee_id)
        .eq("tenant_id", body.tenant_id!);
      if (upd.error) {
        console.warn("attendee details update failed:", upd.error);
      }
    }

    // P-FINAL Track B (M4-QA-03): dispatch confirmation SMS + email.
    // UI-side registration goes through CrmAutomation.evaluate which loads
    // rules from crm_automation_rules. The public form bypasses the client,
    // so the template-slug mapping is hardcoded here — matches rules #9/#10
    // seeded on demo. Fire-and-forget: dispatch failure never fails the
    // form response (the attendee row is already persisted).
    const templateBase = result.status === "waiting_list"
      ? "event_waiting_list_confirmation"
      : "event_registration_confirmation";
    const lead = leadRes.data!;
    const event = eventRes.data!;
    const variables: Record<string, string> = {
      name: lead.full_name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      event_name: event.name || "",
      event_date: event.event_date || "",
      event_time: event.start_time || "",
      event_location: event.location_address || "",
    };
    await dispatchRegistrationMessages(
      body.tenant_id!,
      body.lead_id!,
      templateBase,
      variables,
      Boolean(lead.email),
    );
  }

  return jsonResp(result, 200);
});
