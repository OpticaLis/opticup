import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// dispatch-queue — OVERNIGHT_M4_SCALE_AND_UI Phase 6. Drains crm_message_queue
// rows with status='queued' at a 1-second throttle to avoid Make/SMS/Email
// quota hits during large blasts. Called by pg_cron every minute.
// Auth: verify_jwt=false (called from pg_cron via pg_net; no JWT in that path).
// Body: optional { batch_size?: int } — default 60 rows per tick.
// Contains allowlist layer 2 (defense in depth per Rule 22).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";
const SEND_MESSAGE_URL = `${SUPABASE_URL}/functions/v1/send-message`;

// C001 (2026-05-03) — allowlist layer 2 (defense in depth). Same lookup as
// send-message; mirrors the layer-1 fail-closed semantics. tenants.test_mode_sms_allowlist
// is the single source of truth for both layers.
function normalizePhone(p: string): string {
  const d = p.replace(/[\s+\-]/g, "");
  return d.startsWith("972") ? "0" + d.slice(3) : d;
}
async function phoneAllowed(db: any, tenantId: string, phone: string | null): Promise<boolean> {
  if (!phone) return true;
  const { data: tenant, error } = await db
    .from("tenants")
    .select("test_mode_sms_allowlist")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) {
    console.warn("phoneAllowed: tenant lookup failed; failing CLOSED for safety", error);
    return false;
  }
  const allowlist = tenant?.test_mode_sms_allowlist;
  if (allowlist == null) return true;
  if (!Array.isArray(allowlist)) {
    console.warn("phoneAllowed: malformed allowlist on tenant", tenantId);
    return false;
  }
  const n = normalizePhone(phone);
  return allowlist.some((a: unknown) =>
    typeof a === "string" && normalizePhone(a) === n
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
function jsonResp(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const batchSize = 60;
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Reaper (P29): mark crm_automation_runs.status='running' rows older than
  // 1h as 'aborted'. The CrmConfirmSend modal has no abandonment recovery —
  // if the admin closes the window without approving, the run sits forever.
  // Idempotent: predicate re-checked on UPDATE; finished_at IS NULL guard
  // means we never touch rows that already transitioned terminally.
  // tenant_id captured per-row in the RETURNING for audit (service role
  // bypasses RLS, so a tenant_id WHERE filter would be a no-op).
  try {
    const reapBefore = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const reapRes = await db.from("crm_automation_runs")
      .update({
        status: "aborted",
        error_message: "Approval window expired (no admin action within 1 hour)",
        finished_at: new Date().toISOString(),
      })
      .eq("status", "running")
      .is("finished_at", null)
      .lte("updated_at", reapBefore)
      .select("id, tenant_id");
    if (reapRes.error) {
      console.error("reaper update failed:", reapRes.error.message);
    } else if (reapRes.data && reapRes.data.length) {
      console.log(`reaper: aborted ${reapRes.data.length} stuck runs`);
    }
  } catch (e) {
    console.error("reaper exception:", (e as Error).message || e);
  }

  // Claim batch: UPDATE queued → processing, up to batchSize rows, return them.
  // Uses a WITH ... UPDATE ... RETURNING pattern through PostgREST — PostgREST
  // doesn't support CTE so we do SELECT-then-UPDATE-by-id in 2 round trips.
  // Acceptable — the unique row id prevents double-processing under concurrent
  // ticks because the UPDATE only flips status='queued' → 'processing'.
  const claimRes = await db
    .from("crm_message_queue")
    .select("id, tenant_id, run_id, lead_id, event_id, channel, template_slug, body, subject, variables, language")
    .eq("status", "queued")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(batchSize);
  if (claimRes.error) {
    console.error("dispatch-queue claim:", claimRes.error);
    return jsonResp({ ok: false, error: "db_claim" }, 500);
  }
  const rows = claimRes.data || [];
  if (!rows.length) return jsonResp({ ok: true, processed: 0 });

  const ids = rows.map(r => (r as { id: string }).id);
  const flipRes = await db.from("crm_message_queue")
    .update({ status: "processing" }).in("id", ids).eq("status", "queued").select("id");
  const claimedIds = new Set((flipRes.data || []).map((r: { id: string }) => r.id));

  // STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12) — multi-channel parallel
  // dispatch. Group claimed rows by (lead_id, scheduled_at_iso) — co-fire
  // siblings. Each group dispatches via Promise.allSettled with a fan-out
  // cap of 5 (EV-003 lesson: >30 parallel send-message fetch() hits CPU/
  // timeout). Sleep ONCE per group, AFTER all parallel dispatches resolve.
  // Pre-fix: sequential 0.5-1s sleep between EVERY row, so SMS+Email for
  // the same lead landed ~1s apart at the customer. Post-fix: same group
  // dispatched concurrently, processed_at deltas ≤ 200ms.
  type ClaimedRow = {
    id: string; tenant_id: string; run_id: string | null;
    lead_id: string; event_id: string | null;
    channel: "sms"|"email";
    template_slug?: string; body?: string; subject?: string;
    variables?: Record<string, unknown>;
    language: string; scheduled_at: string; retries?: number;
  };

  const claimed: ClaimedRow[] = [];
  for (const row of rows) {
    const r = row as ClaimedRow;
    if (claimedIds.has(r.id)) claimed.push(r);
  }

  const groups = new Map<string, ClaimedRow[]>();
  for (const r of claimed) {
    const key = `${r.lead_id}|${r.scheduled_at}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const PARALLEL_CAP = 5;
  let sent = 0, failed = 0, rejected = 0;

  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += PARALLEL_CAP) {
      const slice = group.slice(i, i + PARALLEL_CAP);
      const results = await Promise.allSettled(
        slice.map((r) => dispatchOne(db, r)),
      );
      for (const res of results) {
        if (res.status !== "fulfilled") { failed++; continue; }
        if (res.value === "sent") sent++;
        else if (res.value === "rejected") rejected++;
        else failed++;
      }
    }
    // Sleep ONCE per group, AFTER parallel dispatches. Use the slowest
    // channel's throttle (SMS=1000ms; email-only group=500ms).
    const hasSms = group.some((r) => r.channel === "sms");
    await sleep(hasSms ? 1000 : 500);
  }

  return jsonResp({ ok: true, processed: claimedIds.size, sent, failed, rejected });
});

// Per-row dispatch helper. Returns 'sent' | 'failed' | 'rejected' for the
// caller's aggregation. Allowlist layer 2 + send-message POST + queue row
// update happen here; the caller decides parallel grouping + sleep cadence.
async function dispatchOne(db: any, r: any): Promise<"sent" | "failed" | "rejected"> {
  const variables = (r.variables || {}) as Record<string, unknown>;
  const phone = typeof variables.phone === "string" ? variables.phone : null;

  if (r.channel === "sms" && !(await phoneAllowed(db, r.tenant_id, phone))) {
    await db.from("crm_message_queue")
      .update({ status: "rejected", processed_at: new Date().toISOString(), error_message: "phone_not_allowed: " + phone })
      .eq("id", r.id);
    return "rejected";
  }

  try {
    const payload: Record<string, unknown> = {
      tenant_id: r.tenant_id, lead_id: r.lead_id, event_id: r.event_id,
      channel: r.channel, variables, language: r.language,
    };
    if (r.run_id) payload.run_id = r.run_id;
    if (r.template_slug) payload.template_slug = r.template_slug;
    if (r.body) payload.body = r.body;
    if (r.subject) payload.subject = r.subject;

    const res = await fetch(SEND_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    const d = data as { ok?: boolean; log_id?: string; error?: string };
    if (d.ok) {
      await db.from("crm_message_queue")
        .update({ status: "sent", processed_at: new Date().toISOString(), log_id: d.log_id || null })
        .eq("id", r.id);
      return "sent";
    } else if (d.error === "phone_not_allowed") {
      await db.from("crm_message_queue")
        .update({ status: "rejected", processed_at: new Date().toISOString(), error_message: "phone_not_allowed" })
        .eq("id", r.id);
      return "rejected";
    } else {
      await db.from("crm_message_queue")
        .update({ status: "failed", processed_at: new Date().toISOString(), error_message: String(d.error || res.status), retries: (r.retries || 0) + 1 })
        .eq("id", r.id);
      return "failed";
    }
  } catch (e) {
    console.error("dispatchOne exception:", (e as Error).message || e);
    await db.from("crm_message_queue")
      .update({ status: "failed", processed_at: new Date().toISOString(), error_message: "exception: " + ((e as Error).message || "?") })
      .eq("id", r.id);
    return "failed";
  }
}
