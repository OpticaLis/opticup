import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluate, consumeStatusChangeEvents } from "./engine.ts";

// ============================================================
// automation-engine — server-side rule evaluation Edge Function
// Module 4 CRM — M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1 (2026-05-03)
// ============================================================
// Faithful port of the browser CrmAutomation.evaluate engine.
// Called by:
//   - pg_cron event_day_status_flip + event_2_3d_before_status_flip
//     (server-driven status flips — newStatus 'event_day' / '2_3d_before')
//   - browser CrmAutomationClient (Rung 2 — dry-run preview + approve)
// Mirrors lead-intake EF boilerplate: env vars, CORS, ANON_KEY, jsonResponse,
// service-role client. Single-tenant per call; cron handles fan-out.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Legacy JWT-format anon key — same constant inlined in lead-intake.
// `SUPABASE_ANON_KEY` env returns the newer sb_publishable_* format which the
// gateway's verify_jwt rejects when the EF posts to send-message. Already
// git-tracked in js/shared.js + lead-intake/{index,dispatch}.ts so not new
// exposure.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";

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

const VALID_TRIGGER_TYPES = new Set([
  "event_status_change",
  "event_registration",
  "lead_status_change",
  "lead_intake",
  "attendee_moved",
  "attendee_status_change",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : null;
  // STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12): new "consume_status_events"
  // mode for the pg_cron consumer path. Requires tenant_id only; no trigger_type.
  const mode = (body.mode === "evaluate" || body.mode === "dispatch" || body.mode === "consume_status_events")
    ? body.mode
    : "dispatch";

  // Service-role DB client — bypasses RLS. Every query MUST manually filter
  // by tenant_id (Iron Rule 22 defense-in-depth).
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Consumer mode: pg_cron tick reading crm_status_change_events.
  if (mode === "consume_status_events") {
    if (!tenantId) return errorResponse("Missing tenant_id", 400);
    const limit = typeof body.limit === "number" ? body.limit : 100;
    try {
      const result = await consumeStatusChangeEvents(
        db, tenantId, limit, ANON_KEY,
        `${SUPABASE_URL}/functions/v1/send-message`,
      );
      return jsonResponse({ ok: true, ...result }, 200);
    } catch (e) {
      console.error("consume_status_events exception:", (e as Error).message || e);
      return errorResponse("consume failed", 500);
    }
  }

  // Evaluate / dispatch mode (the existing path).
  const triggerType = typeof body.trigger_type === "string" ? body.trigger_type : null;
  const triggerData = (body.trigger_data && typeof body.trigger_data === "object")
    ? body.trigger_data as Record<string, unknown>
    : {};
  const planItems = Array.isArray(body.plan_items) ? body.plan_items : null;
  // ATOMIC_CONFIRMATION_FLOW Part A: dispatch_messages flag (default true).
  // Set to false by client's "Confirm without notify" modal choice.
  const dispatchMessages = body.dispatch_messages === false ? false : true;

  if (!tenantId) return errorResponse("Missing tenant_id", 400);
  if (!triggerType) return errorResponse("Missing trigger_type", 400);
  if (!VALID_TRIGGER_TYPES.has(triggerType)) {
    return errorResponse(`Unknown trigger_type: ${triggerType}`, 400);
  }

  try {
    const result = await evaluate(db, {
      tenantId,
      triggerType,
      triggerData,
      mode: mode as "evaluate" | "dispatch",
      planItems,
      dispatchMessages,
      anonKey: ANON_KEY,
      sendMessageUrl: `${SUPABASE_URL}/functions/v1/send-message`,
    });
    return jsonResponse(result, 200);
  } catch (e) {
    console.error("automation-engine evaluate exception:", (e as Error).message || e);
    return errorResponse("evaluation failed", 500);
  }
});
