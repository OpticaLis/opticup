// runs.ts — server port of crm-automation-runs.js.
// Per-rule-firing observability: writes rows to crm_automation_runs.
// Per-message counts derived at finalize from crm_message_log GROUP BY status.

// deno-lint-ignore no-explicit-any
type Db = any;

interface Rule { id: string; name?: string; }

export async function createRun(
  db: Db, tenantId: string, rules: Rule[],
  triggerType: string,
  triggerData: Record<string, unknown>,
  eventId: string | null,
): Promise<string | null> {
  if (!tenantId || !Array.isArray(rules) || !rules.length) return null;
  const first = rules[0];
  const row = {
    tenant_id: tenantId,
    rule_id: first.id || null,
    rule_name: rules.map((r) => r.name || "").join(" + "),
    trigger_type: triggerType,
    trigger_data: triggerData || null,
    event_id: eventId || null,
    total_recipients: 0,
    status: "running",
  };
  const res = await db.from("crm_automation_runs").insert(row).select("id").single();
  if (res.error) {
    console.error("automation-engine createRun:", res.error);
    return null;
  }
  return res.data.id;
}

export async function finishRun(
  db: Db, tenantId: string, runId: string, status: string,
): Promise<void> {
  if (!runId) return;
  // Counts derived from message_log (authoritative — send-message EF stamps
  // run_id on every log row including rejected).
  const counts = { sent: 0, failed: 0, rejected: 0 };
  try {
    const r = await db.from("crm_message_log").select("status")
      .eq("run_id", runId).eq("tenant_id", tenantId);
    if (!r.error) {
      for (const row of (r.data || []) as { status: string }[]) {
        if (row.status === "sent") counts.sent++;
        else if (row.status === "failed") counts.failed++;
        else if (row.status === "rejected") counts.rejected++;
      }
    }
  } catch (e) { console.error("automation-engine finishRun counts:", (e as Error).message); }
  try {
    await db.from("crm_automation_runs").update({
      status: status || "completed",
      finished_at: new Date().toISOString(),
      sent_count: counts.sent,
      failed_count: counts.failed,
      rejected_count: counts.rejected,
    }).eq("id", runId).eq("tenant_id", tenantId);
  } catch (e) { console.error("automation-engine finishRun:", (e as Error).message); }
}
