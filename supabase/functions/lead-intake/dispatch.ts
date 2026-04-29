// dispatch.ts — lead-intake message dispatch helpers.
// Extracted from index.ts during P5_V2_REBUILD_RUNG2_RULES_REWIRE (2026-04-28)
// to keep index.ts under Rule 12 cap when adding the Rule 2.1 fresh-lead path
// (active-event lookup + T5/T1 branch + attendee upsert).
//
// 2026-04-29 cutover-blocker fix: every dispatch path now opens a synthetic
// crm_automation_runs row, stamps run_id on every send-message call, and
// finalizes counts from crm_message_log so automation-history shows lead
// intake fires (T1/T2/T5) the same way it shows browser-engine fires.
//
// Failures here never bubble up — the lead is already persisted in DB and
// crm_message_log captures any send failure for operator follow-up.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Legacy JWT-format anon key — same constant inlined in index.ts.
// The `SUPABASE_ANON_KEY` env var on Supabase Edge returns the newer
// sb_publishable_* format which the gateway's verify_jwt rejects.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";
const SEND_MESSAGE_URL = `${SUPABASE_URL}/functions/v1/send-message`;

const RULE_NAMES: Record<string, string> = {
  lead_intake_new: "ליד חדש — ברוך הבא (T1)",
  lead_intake_duplicate: "ליד חוזר (T2)",
  event_invite_new: "ליד חדש לאירוע פעיל (T5)",
};

// deno-lint-ignore no-explicit-any
async function openRun(db: any, tenantId: string, leadId: string, templateBaseSlug: string, eventId: string | null): Promise<string | null> {
  try {
    const ins = await db.from("crm_automation_runs").insert({
      tenant_id: tenantId,
      rule_id: null,
      rule_name: RULE_NAMES[templateBaseSlug] || `lead-intake: ${templateBaseSlug}`,
      trigger_type: "lead_intake",
      trigger_data: { lead_id: leadId, template_slug: templateBaseSlug, event_id: eventId, source: "lead-intake-ef" },
      event_id: eventId,
      total_recipients: 0,
      status: "running",
    }).select("id").single();
    if (ins.error) { console.error("openRun:", ins.error); return null; }
    return ins.data?.id || null;
  } catch (e) {
    console.error("openRun exception:", (e as Error).message || e);
    return null;
  }
}

// deno-lint-ignore no-explicit-any
async function closeRun(db: any, runId: string | null, tenantId: string, totalRecipients: number): Promise<void> {
  if (!runId) return;
  try {
    const counts = { sent: 0, failed: 0, rejected: 0 };
    const r = await db.from("crm_message_log")
      .select("status").eq("run_id", runId).eq("tenant_id", tenantId);
    if (!r.error) {
      for (const row of (r.data || []) as { status: string }[]) {
        if (row.status === "sent") counts.sent++;
        else if (row.status === "failed") counts.failed++;
        else if (row.status === "rejected") counts.rejected++;
      }
    }
    await db.from("crm_automation_runs").update({
      status: "completed",
      finished_at: new Date().toISOString(),
      total_recipients: totalRecipients,
      sent_count: counts.sent,
      failed_count: counts.failed,
      rejected_count: counts.rejected,
    }).eq("id", runId);
  } catch (e) {
    console.error("closeRun exception:", (e as Error).message || e);
  }
}

export async function dispatchIntakeMessages(
  // deno-lint-ignore no-explicit-any
  db: any,
  tenantId: string,
  leadId: string,
  templateBaseSlug: string,
  name: string,
  phone: string,
  email: string | null,
  eventId?: string | null,
): Promise<void> {
  const runId = await openRun(db, tenantId, leadId, templateBaseSlug, eventId || null);
  const variables: Record<string, string> = { name, phone };
  if (email) variables.email = email;
  const calls: Promise<unknown>[] = [];
  let total = 1; // SMS always
  calls.push(callSendMessage(tenantId, leadId, "sms", templateBaseSlug, variables, eventId, runId));
  if (email) { calls.push(callSendMessage(tenantId, leadId, "email", templateBaseSlug, variables, eventId, runId)); total++; }
  await Promise.allSettled(calls);
  await closeRun(db, runId, tenantId, total);
}

async function callSendMessage(
  tenantId: string,
  leadId: string,
  channel: "sms" | "email",
  templateSlug: string,
  variables: Record<string, string>,
  eventId?: string | null,
  runId?: string | null,
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      tenant_id: tenantId, lead_id: leadId, channel,
      template_slug: templateSlug, variables,
    };
    if (eventId) payload.event_id = eventId;
    if (runId) payload.run_id = runId;
    const res = await fetch(SEND_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`send-message ${channel}/${templateSlug} HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
  } catch (e) {
    console.error(`send-message ${channel}/${templateSlug} exception:`, (e as Error).message || e);
  }
}

// Rung 2 — Rule 2.1 server-side path. On a fresh-lead success path, look up
// an active event for this tenant. If one exists → dispatch T5 + upsert
// crm_event_attendees. Else → fall through to T1. The duplicate (409) path
// keeps T2 unchanged.
// deno-lint-ignore no-explicit-any
export async function dispatchFreshLead(
  db: any,
  tenantId: string,
  leadId: string,
  name: string,
  phone: string,
  email: string | null,
): Promise<void> {
  const { data: ev } = await db.from("crm_events")
    .select("id").eq("tenant_id", tenantId)
    .in("status", ["registration_open", "waiting_list"])
    .eq("is_deleted", false)
    .order("event_date", { ascending: true })
    .limit(1).maybeSingle();
  if (ev?.id) {
    await dispatchIntakeMessages(db, tenantId, leadId, "event_invite_new", name, phone, email, ev.id);
    await db.from("crm_event_attendees").upsert(
      {
        tenant_id: tenantId, event_id: ev.id, lead_id: leadId,
        status: "invited",
      },
      { onConflict: "tenant_id,lead_id,event_id", ignoreDuplicates: false },
    );
    // P5_8 Fix C: T5 recipient has an active relationship — promote lead to
    // Tier 2 status='invited' so future T4 broadcasts include them and so the
    // lead-side status matches the attendee row created above. Best-effort:
    // a failure here does not bubble up — the lead is already persisted and
    // the attendee row is the authoritative invitation marker.
    try {
      await db.from("crm_leads")
        .update({ status: "invited", updated_at: new Date().toISOString() })
        .eq("id", leadId)
        .eq("tenant_id", tenantId);
    } catch (e) {
      console.error("dispatchFreshLead status='invited' update failed:", (e as Error).message || e);
    }
  } else {
    await dispatchIntakeMessages(db, tenantId, leadId, "lead_intake_new", name, phone, email);
  }
}
