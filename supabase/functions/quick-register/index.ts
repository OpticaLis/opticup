import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchQuickRegister } from "./dispatch.ts";

// ============================================================
// quick-register — Walk-in QR registration EF
// Module 4 CRM — QUICK_REGISTER_QR_FLOW SPEC, 2026-05-04
// ============================================================
// Two ops dispatched from a single endpoint:
//   default ('register'): walk-in customer scans QR, fills the storefront
//     /quick-register/?event=N form, submits → upsert lead by phone +
//     register attendee via canonical register_lead_to_event RPC.
//   'lookup_url':         Make WhatsApp branch sends event_number, EF
//     returns the storefront URL to wrap in a QR for the employee.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Storefront base URL used to build the /quick-register/ link in lookup_url.
// Hardcoded per current single-tenant SaaS deploy. When a second tenant ships,
// promote to tenant config (see FINDINGS.md).
const STOREFRONT_URL = "https://prizma-optic.co.il";

// Event statuses for which both ops accept the event. Anything else → 409.
// Matches SPEC §3.1.3 + §3.2.3 (registration_open / will_open_tomorrow / event_day).
const OPEN_STATUSES = new Set([
  "registration_open",
  "will_open_tomorrow",
  "event_day",
]);

const SOURCE_TAG = "quick_register_qr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ ok: false, error }, status);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function boolOrFalse(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * Normalize a phone number to E.164. Accepts Israeli local 0XXXXXXXXX or
 * already-international (+972..., 972...). Returns null on unknown format.
 *
 * Reused VERBATIM from supabase/functions/lead-intake/index.ts (Iron Rule 21).
 * If this drifts from lead-intake, both copies should be updated together.
 */
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

function formatHebrewDate(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const parts = String(ymd).slice(0, 10).split("-");
  if (parts.length !== 3) return String(ymd);
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

type EventRow = {
  id: string;
  name: string | null;
  event_date: string | null;
  start_time: string | null;
  status: string;
  event_number: number;
  max_capacity: number | null;
  max_coupons: number | null;
};

// deno-lint-ignore no-explicit-any
async function resolveTenantAndEvent(db: any, tenantSlug: string, eventNumber: number): Promise<
  | { ok: true; tenantId: string; event: EventRow }
  | { ok: false; status: number; error: string }
> {
  const { data: tenant, error: tenantErr } = await db
    .from("tenants")
    .select("id, is_active")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (tenantErr || !tenant) return { ok: false, status: 401, error: "invalid_tenant" };
  if (!tenant.is_active) return { ok: false, status: 403, error: "tenant_inactive" };

  const { data: event, error: evErr } = await db
    .from("crm_events")
    .select("id, name, event_date, start_time, status, event_number, max_capacity, max_coupons")
    .eq("tenant_id", tenant.id)
    .eq("event_number", eventNumber)
    .eq("is_deleted", false)
    .maybeSingle();
  if (evErr) return { ok: false, status: 500, error: "db_error" };
  if (!event) return { ok: false, status: 404, error: "event_not_found" };
  if (!OPEN_STATUSES.has(event.status)) return { ok: false, status: 409, error: "event_not_open" };

  return { ok: true, tenantId: tenant.id, event: event as EventRow };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_json", 400);
  }

  const op = (trimOrNull(body.op) || "register").toLowerCase();
  const tenantSlug = trimOrNull(body.tenant_slug);
  if (!tenantSlug) return errorResponse("missing_tenant_slug", 400);

  const eventNumberRaw = body.event_number;
  if (eventNumberRaw == null || eventNumberRaw === "") {
    return errorResponse("missing_event_number", 400);
  }
  const eventNumber = Number(eventNumberRaw);
  if (!Number.isInteger(eventNumber) || eventNumber <= 0) {
    return errorResponse("invalid_event_number", 400);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const resolved = await resolveTenantAndEvent(db, tenantSlug, eventNumber);
  if (!resolved.ok) return errorResponse(resolved.error, resolved.status);

  const tenantId = resolved.tenantId;
  const event = resolved.event;

  // ---- Op: lookup_url (Make WhatsApp branch) ----
  if (op === "lookup_url") {
    return jsonResponse({
      ok: true,
      url: `${STOREFRONT_URL}/quick-register/?event=${event.event_number}`,
      event_number: event.event_number,
      event_name: event.name ?? "",
      event_date_he: formatHebrewDate(event.event_date),
    }, 200);
  }

  if (op !== "register") return errorResponse("unknown_op", 400);

  // ---- Op: register (default) ----
  const fullName = trimOrNull(body.full_name);
  const phoneRaw = trimOrNull(body.phone);
  const emailRaw = trimOrNull(body.email);
  const eyeExamNeeded = trimOrNull(body.eye_exam_needed);
  const termsAccepted = boolOrFalse(body.terms_accepted);
  const marketingConsent = boolOrFalse(body.marketing_consent);

  if (!fullName) return errorResponse("missing_full_name", 400);
  if (!phoneRaw) return errorResponse("missing_phone", 400);
  if (!termsAccepted) return errorResponse("terms_required", 400);
  if (!eyeExamNeeded) return errorResponse("missing_eye_exam", 400);

  const phone = normalizePhone(phoneRaw);
  if (!phone) return errorResponse("invalid_phone", 400);

  if (!emailRaw) return errorResponse("missing_email", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return errorResponse("invalid_email", 400);
  }
  const email = emailRaw.toLowerCase();

  const nowIso = new Date().toISOString();

  // Upsert lead by (tenant_id, phone). Defense-in-depth: tenant_id on every
  // select/insert/update (Iron Rule 22).
  let leadId: string;
  const { data: existingLead, error: leadLookupErr } = await db
    .from("crm_leads")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();
  if (leadLookupErr) {
    console.error("lead lookup error:", leadLookupErr);
    return errorResponse("db_error", 500);
  }

  if (existingLead) {
    leadId = existingLead.id;
    // Re-subscribe (existing lead may have been unsubscribed). Don't overwrite
    // name/email — the lead's prior data is authoritative; walk-in is just
    // re-engaging, not editing the master record.
    await db
      .from("crm_leads")
      .update({ unsubscribed_at: null, updated_at: nowIso, acquired_via: SOURCE_TAG })
      .eq("id", leadId)
      .eq("tenant_id", tenantId);
  } else {
    const insertRow = {
      tenant_id: tenantId,
      full_name: fullName,
      phone,
      email,
      language: "he",
      status: "new",
      source: SOURCE_TAG,
      acquired_via: SOURCE_TAG,
      eye_exam_default: eyeExamNeeded,
      terms_approved: true,
      terms_approved_at: nowIso,
      marketing_consent: marketingConsent,
    };
    const { data: inserted, error: insErr } = await db
      .from("crm_leads")
      .insert(insertRow)
      .select("id")
      .single();
    if (insErr || !inserted) {
      // 23505: race-safety — another concurrent submit beat us. Re-fetch.
      // deno-lint-ignore no-explicit-any
      const code = (insErr as any)?.code;
      if (code === "23505") {
        const { data: raced } = await db
          .from("crm_leads")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("phone", phone)
          .eq("is_deleted", false)
          .limit(1)
          .maybeSingle();
        if (raced?.id) {
          leadId = raced.id;
        } else {
          console.error("lead insert 23505 but re-fetch returned nothing");
          return errorResponse("lead_create_failed", 500);
        }
      } else {
        console.error("lead insert failed:", insErr);
        return errorResponse("lead_create_failed", 500);
      }
    } else {
      leadId = inserted.id;
    }
  }

  // Pre-check duplicate attendee (lead already registered to this event).
  // SPEC §3.1.8: response shape requires status='already_registered' for this
  // path. The RPC may or may not return that string — we explicitly detect
  // and short-circuit instead of relying on RPC error codes.
  const { data: existingAtt } = await db
    .from("crm_event_attendees")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("event_id", event.id)
    .eq("lead_id", leadId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (existingAtt) {
    return jsonResponse({
      ok: true,
      status: "already_registered",
      coupon_available: existingAtt.status === "registered",
      lead_id: leadId,
      attendee_id: existingAtt.id,
    }, 200);
  }

  // Canonical registration RPC (capacity / waiting_list / dedup all live here).
  const rpcRes = await db.rpc("register_lead_to_event", {
    p_tenant_id: tenantId,
    p_lead_id: leadId,
    p_event_id: event.id,
    p_method: SOURCE_TAG,
  });
  if (rpcRes.error) {
    console.error("register_lead_to_event failed:", rpcRes.error);
    return errorResponse("rpc_failed", 500);
  }

  const result = (rpcRes.data ?? {}) as {
    success?: boolean;
    error?: string;
    status?: string;
    attendee_id?: string;
  };
  if (!result.success) {
    return jsonResponse({
      ok: false,
      error: result.error || "register_failed",
      lead_id: leadId,
    }, 409);
  }

  const finalStatus = result.status || "registered";

  // Public form bypasses automation rules — dispatch coupon-delivery /
  // waiting-list templates directly. Failures inside are logged + swallowed.
  await dispatchQuickRegister(tenantId, leadId, event, fullName, phone, email, finalStatus);

  return jsonResponse({
    ok: true,
    status: finalStatus,
    coupon_available: finalStatus === "registered",
    lead_id: leadId,
    attendee_id: result.attendee_id ?? null,
  }, 200);
});
