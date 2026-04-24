// WAITING_LIST_PUBLIC_REGISTRATION_FIX (2026-04-24): server-side mirror of
// crm-event-register.js:checkAndAutoWaitingList. Public form registrations
// skip the client-side automation engine — this helper fills the gap by
// running the capacity check + waiting_list transition + hardcoded dispatch
// of the event_waiting_list template to every attendee of the event.
// Matches the pattern of dispatchRegistrationMessages in index.ts.

type SendFn = (
  tenantId: string,
  leadId: string,
  channel: "sms" | "email",
  templateSlug: string,
  variables: Record<string, string>,
) => Promise<void>;

// Returns summary for logging; never throws (fail-open, mirrors the EF's
// existing "dispatch failure never fails the form response" policy).
export async function checkAndDispatchWaitingList(
  // deno-lint-ignore no-explicit-any
  db: any,
  tenantId: string,
  eventId: string,
  sendMessage: SendFn,
): Promise<{ transitioned: boolean; dispatched: number; reason?: string }> {
  try {
    const evRes = await db
      .from("crm_events")
      .select("status, max_capacity, name, event_date, start_time, location_address")
      .eq("id", eventId).eq("tenant_id", tenantId).maybeSingle();
    if (evRes.error || !evRes.data) return { transitioned: false, dispatched: 0, reason: "event_not_found" };
    const ev = evRes.data;
    if (ev.max_capacity == null) return { transitioned: false, dispatched: 0, reason: "no_max_capacity" };
    if (ev.status !== "registration_open") return { transitioned: false, dispatched: 0, reason: "not_open" };

    const countRes = await db
      .from("crm_event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false)
      .neq("status", "waiting_list").neq("status", "cancelled").neq("status", "duplicate");
    if (countRes.error) {
      console.error("capacity count failed:", countRes.error);
      return { transitioned: false, dispatched: 0, reason: "count_error" };
    }
    const count = countRes.count ?? 0;
    if (count < ev.max_capacity) return { transitioned: false, dispatched: 0, reason: "under_capacity" };

    // Transition with idempotent guard: only flip if still registration_open.
    // Protects against a concurrent registration on another EF call.
    const updRes = await db
      .from("crm_events")
      .update({ status: "waiting_list" })
      .eq("id", eventId).eq("tenant_id", tenantId).eq("status", "registration_open")
      .select("id");
    if (updRes.error) {
      console.error("status update failed:", updRes.error);
      return { transitioned: false, dispatched: 0, reason: "update_error" };
    }
    if (!updRes.data || !updRes.data.length) {
      return { transitioned: false, dispatched: 0, reason: "race_lost" };
    }

    // Fetch all attendees' lead data via the joined view. Include every
    // non-cancelled attendee — the rule that exists in crm_automation_rules
    // (#4257bc7d) uses recipient_type='attendees_all_statuses'; this mirrors
    // that semantic for the public-form path.
    const aRes = await db
      .from("v_crm_event_attendees_full")
      .select("lead_id, full_name, phone, email")
      .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false)
      .neq("status", "cancelled");
    if (aRes.error) {
      console.error("attendees fetch failed:", aRes.error);
      return { transitioned: true, dispatched: 0, reason: "attendees_error" };
    }
    const attendees: Array<{ lead_id: string; full_name: string; phone: string; email: string }> =
      aRes.data || [];

    const baseVars: Record<string, string> = {
      event_name: ev.name ?? "",
      event_date: ev.event_date ?? "",
      event_time: ev.start_time ?? "",
      event_location: ev.location_address ?? "",
    };

    const calls: Promise<unknown>[] = [];
    for (const a of attendees) {
      if (!a.lead_id) continue;
      const v: Record<string, string> = {
        ...baseVars,
        name: a.full_name ?? "",
        phone: a.phone ?? "",
        email: a.email ?? "",
        lead_id: a.lead_id,
      };
      if (a.phone) calls.push(sendMessage(tenantId, a.lead_id, "sms", "event_waiting_list", v));
      if (a.email) calls.push(sendMessage(tenantId, a.lead_id, "email", "event_waiting_list", v));
    }
    await Promise.allSettled(calls);
    return { transitioned: true, dispatched: calls.length };
  } catch (e) {
    console.error("checkAndDispatchWaitingList exception:", (e as Error).message || e);
    return { transitioned: false, dispatched: 0, reason: "exception" };
  }
}
