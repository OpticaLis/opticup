import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// event-register — Edge Function for public event registration form
// Module 4 CRM — Go-Live P16 (2026-04-23)
// ============================================================
// POST body JSON:
//   { tenant_id, lead_id, event_id, arrival_time, eye_exam, notes }
//
// Flow: validate UUIDs → verify lead+event exist in same tenant →
//       call register_lead_to_event RPC → on success, UPDATE the
//       attendee row with form-specific fields (scheduled_time,
//       eye_exam_needed, client_notes) → return RPC result.
//
// verify_jwt is false because the caller is a public HTML form
// following an emailed link; the tenant+lead+event UUID triplet
// is the auth (same security model as the unsubscribe EF).
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

type FormBody = {
  tenant_id?: string;
  lead_id?: string;
  event_id?: string;
  arrival_time?: string;
  eye_exam?: string;
  notes?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // GET = bootstrap payload for the form (event details + lead name).
  if (req.method === "GET") {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("event_id");
    const leadId = url.searchParams.get("lead_id");
    if (!isUuid(eventId) || !isUuid(leadId)) {
      return jsonResp({ success: false, error: "invalid_ids" }, 400);
    }
    const evRes = await db.from("crm_events")
      .select("id, tenant_id, name, event_date, start_time, location_address, status, max_capacity")
      .eq("id", eventId!)
      .eq("is_deleted", false)
      .maybeSingle();
    if (evRes.error || !evRes.data) {
      return jsonResp({ success: false, error: "event_not_found" }, 404);
    }
    const leadRes = await db.from("crm_leads")
      .select("id, full_name, tenant_id")
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
      lead_name: leadRes.data.full_name || "",
      event_name: evRes.data.name || "",
      event_date: evRes.data.event_date || "",
      event_time: evRes.data.start_time || "",
      event_location: evRes.data.location_address || "",
      event_status: evRes.data.status || "",
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

  if (!isUuid(body.tenant_id) || !isUuid(body.lead_id) || !isUuid(body.event_id)) {
    return jsonResp({ success: false, error: "invalid_ids" }, 400);
  }

  // Verify lead and event both exist in the same tenant.
  const [leadRes, eventRes] = await Promise.all([
    db.from("crm_leads")
      .select("id")
      .eq("id", body.lead_id!)
      .eq("tenant_id", body.tenant_id!)
      .eq("is_deleted", false)
      .maybeSingle(),
    db.from("crm_events")
      .select("id, status")
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
  }

  return jsonResp(result, 200);
});
