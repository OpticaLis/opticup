// WAITING_LIST_DISPATCH_FIX (2026-04-24): reduced to status-transition only.
// Previously this helper also blasted event_waiting_list to every attendee
// after transitioning — that mirrored automation rule 4257bc7d, but both
// were incorrect UX (existing registered attendees got a "waiting_list"
// notification about an event they'd already joined). The rule is now
// is_active=false on demo, and this helper no longer dispatches. The only
// waiting-list notification that fires today is event_waiting_list_confirmation
// sent to the specific newly-placed waiting_list attendee (via the EF's
// dispatchRegistrationMessages, or via attendee.created rule e1f3e039 for
// the CRM UI path).

// Returns summary for logging; never throws (fail-open, mirrors the EF's
// existing "dispatch failure never fails the form response" policy).
export async function checkAndTransitionToWaitingList(
  // deno-lint-ignore no-explicit-any
  db: any,
  tenantId: string,
  eventId: string,
): Promise<{ transitioned: boolean; reason?: string }> {
  try {
    const evRes = await db
      .from("crm_events")
      .select("status, max_capacity")
      .eq("id", eventId).eq("tenant_id", tenantId).maybeSingle();
    if (evRes.error || !evRes.data) return { transitioned: false, reason: "event_not_found" };
    const ev = evRes.data;
    if (ev.max_capacity == null) return { transitioned: false, reason: "no_max_capacity" };
    if (ev.status !== "registration_open") return { transitioned: false, reason: "not_open" };

    const countRes = await db
      .from("crm_event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false)
      .neq("status", "waiting_list").neq("status", "cancelled").neq("status", "duplicate");
    if (countRes.error) {
      console.error("capacity count failed:", countRes.error);
      return { transitioned: false, reason: "count_error" };
    }
    const count = countRes.count ?? 0;
    if (count < ev.max_capacity) return { transitioned: false, reason: "under_capacity" };

    // Idempotent guard: only flip if still registration_open (guards against
    // concurrent EF calls racing to transition the same event).
    const updRes = await db
      .from("crm_events")
      .update({ status: "waiting_list" })
      .eq("id", eventId).eq("tenant_id", tenantId).eq("status", "registration_open")
      .select("id");
    if (updRes.error) {
      console.error("status update failed:", updRes.error);
      return { transitioned: false, reason: "update_error" };
    }
    if (!updRes.data || !updRes.data.length) return { transitioned: false, reason: "race_lost" };
    return { transitioned: true };
  } catch (e) {
    console.error("checkAndTransitionToWaitingList exception:", (e as Error).message || e);
    return { transitioned: false, reason: "exception" };
  }
}
