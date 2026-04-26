import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// retry-failed — OVERNIGHT_M4_SCALE_AND_UI Phase 5. Retries dispatches that
// failed during a specific automation run by re-invoking send-message for
// every crm_message_log row with status='failed' linked to that run_id.
//
// Auth: verify_jwt=true — called from the CRM UI's history drill-down.
// Input: POST { run_id: uuid, tenant_id: uuid }.
// Output: { ok, attempted, succeeded, still_failed, still_rejected }.
//
// The allowlist check lives inside send-message (layer 1); we do not
// duplicate it here. A retry of a rejected phone will still be rejected by
// send-message, and we count it as still_rejected in the return body so
// the UI can show "these 3 rejections won't ever succeed — they're not in
// the allowlist".

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";
const SEND_MESSAGE_URL = `${SUPABASE_URL}/functions/v1/send-message`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResp(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  let payload: { run_id?: string; tenant_id?: string };
  try { payload = await req.json(); } catch { return jsonResp({ ok: false, error: "invalid_json" }, 400); }
  const runId = typeof payload.run_id === "string" ? payload.run_id.trim() : "";
  const tenantId = typeof payload.tenant_id === "string" ? payload.tenant_id.trim() : "";
  if (!UUID_RE.test(runId) || !UUID_RE.test(tenantId)) {
    return jsonResp({ ok: false, error: "invalid_ids" }, 400);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch failed rows for this run. Rejected rows are intentionally skipped
  // (allowlist rejections won't succeed on retry).
  const { data: rows, error } = await db
    .from("crm_message_log")
    .select("id, tenant_id, lead_id, event_id, channel, content, template_id")
    .eq("run_id", runId)
    .eq("tenant_id", tenantId)
    .eq("status", "failed");
  if (error) {
    console.error("retry-failed: log fetch:", error);
    return jsonResp({ ok: false, error: "db_error" }, 500);
  }
  if (!rows || !rows.length) {
    return jsonResp({ ok: true, attempted: 0, succeeded: 0, still_failed: 0, still_rejected: 0 });
  }

  // For each failed row, re-fetch the lead (for phone/email) and re-invoke
  // send-message with raw body (already-composed content). This skips
  // template substitution on retry — intentional: we keep the original body.
  let succeeded = 0, stillFailed = 0, stillRejected = 0;
  for (const r of rows) {
    try {
      const leadRes = await db.from("crm_leads")
        .select("phone, email, full_name")
        .eq("id", r.lead_id).eq("tenant_id", tenantId).maybeSingle();
      if (leadRes.error || !leadRes.data) { stillFailed++; continue; }
      const variables: Record<string, string> = {
        phone: leadRes.data.phone || "",
        email: leadRes.data.email || "",
        name: leadRes.data.full_name || "",
      };
      const res = await fetch(SEND_MESSAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ANON_KEY}`,
          "apikey": ANON_KEY,
        },
        body: JSON.stringify({
          tenant_id: tenantId, lead_id: r.lead_id, event_id: r.event_id,
          channel: r.channel, body: r.content, variables,
        }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (data && (data as { ok?: boolean }).ok) {
        // Mark original row as retried; the new log row from send-message is
        // the authoritative sent record.
        await db.from("crm_message_log")
          .update({ error_message: (r as { error_message?: string }).error_message
            ? `${(r as { error_message?: string }).error_message} [retried: new log_id=${(data as { log_id?: string }).log_id}]`
            : `retried: new log_id=${(data as { log_id?: string }).log_id}` })
          .eq("id", r.id);
        succeeded++;
      } else if ((data as { error?: string }).error === "phone_not_allowed") {
        stillRejected++;
      } else {
        stillFailed++;
      }
    } catch (e) {
      console.error("retry-failed row exception:", (e as Error).message || e);
      stillFailed++;
    }
  }

  return jsonResp({
    ok: true, attempted: rows.length, succeeded, still_failed: stillFailed, still_rejected: stillRejected,
  });
});
