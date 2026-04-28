// dispatch.ts — lead-intake message dispatch helpers.
// Extracted from index.ts during P5_V2_REBUILD_RUNG2_RULES_REWIRE (2026-04-28)
// to keep index.ts under Rule 12 cap when adding the Rule 2.1 fresh-lead path
// (active-event lookup + T5/T1 branch + attendee upsert).
//
// Failures here never bubble up — the lead is already persisted in DB and
// crm_message_log captures any send failure for operator follow-up.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SEND_MESSAGE_URL = `${SUPABASE_URL}/functions/v1/send-message`;

export async function dispatchIntakeMessages(
  tenantId: string,
  leadId: string,
  templateBaseSlug: string,
  name: string,
  phone: string,
  email: string | null,
  eventId?: string | null,
): Promise<void> {
  const variables: Record<string, string> = { name, phone };
  if (email) variables.email = email;
  const calls: Promise<unknown>[] = [];
  calls.push(callSendMessage(tenantId, leadId, "sms", templateBaseSlug, variables, eventId));
  if (email) calls.push(callSendMessage(tenantId, leadId, "email", templateBaseSlug, variables, eventId));
  await Promise.allSettled(calls);
}

async function callSendMessage(
  tenantId: string,
  leadId: string,
  channel: "sms" | "email",
  templateSlug: string,
  variables: Record<string, string>,
  eventId?: string | null,
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      tenant_id: tenantId, lead_id: leadId, channel,
      template_slug: templateSlug, variables,
    };
    if (eventId) payload.event_id = eventId;
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

// Rung 2 (P5_V2_REBUILD_RUNG2_RULES_REWIRE) — Rule 2.1 server-side path.
// On a fresh-lead success path, look up an active event for this tenant. If
// one exists → dispatch T5 (event_invite_new) bound to that event AND upsert
// crm_event_attendees row with status='הוזמן' (invited). Else → fall through
// to T1 (lead_intake_new). The duplicate (409) path keeps T2 unchanged.
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
    .in("status", ["open_for_registration", "waitlist_full"])
    .eq("is_deleted", false)
    .order("event_date", { ascending: true })
    .limit(1).maybeSingle();
  if (ev?.id) {
    await dispatchIntakeMessages(tenantId, leadId, "event_invite_new", name, phone, email, ev.id);
    await db.from("crm_event_attendees").upsert(
      {
        tenant_id: tenantId, event_id: ev.id, lead_id: leadId,
        status: "הוזמן", updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,lead_id", ignoreDuplicates: false },
    );
  } else {
    await dispatchIntakeMessages(tenantId, leadId, "lead_intake_new", name, phone, email);
  }
}
