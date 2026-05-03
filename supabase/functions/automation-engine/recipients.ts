// recipients.ts — recipient resolution for automation rules.
// Port of modules/crm/crm-automation-recipient-resolvers.js (7 recipient_types).
// Service-role DB; explicit tenant_id filter on every query (Iron Rule 22).

export interface Lead {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  unsubscribed_at?: string | null;
  is_deleted?: boolean;
}

// deno-lint-ignore no-explicit-any
type Db = any;

const TIER2_STATUSES = ["waiting", "invited", "confirmed", "confirmed_verified"];

export async function resolveRecipients(
  db: Db, tenantId: string,
  recipientType: string,
  triggerData: Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  actionConfig: any,
): Promise<Lead[]> {
  const cfg = actionConfig || {};
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  const leadId = (typeof triggerData.leadId === "string") ? triggerData.leadId : null;

  if (recipientType === "trigger_lead") {
    if (!leadId) return [];
    const r = await db.from("crm_leads")
      .select("id, full_name, phone, email, unsubscribed_at, is_deleted")
      .eq("tenant_id", tenantId).eq("id", leadId).single();
    if (r.error || !r.data) return [];
    if (r.data.unsubscribed_at || r.data.is_deleted) return [];
    return [r.data];
  }

  if (recipientType === "tier2" || recipientType === "tier2_excl_registered" || recipientType === "leads_by_status") {
    const hasFilter = Array.isArray(cfg.recipient_status_filter) && cfg.recipient_status_filter.length;
    if (recipientType === "leads_by_status" && !hasFilter) {
      console.warn("automation-engine: leads_by_status requires recipient_status_filter");
      return [];
    }
    const statusList = hasFilter ? cfg.recipient_status_filter : TIER2_STATUSES;
    const lRes = await db.from("crm_leads").select("id, full_name, phone, email")
      .eq("tenant_id", tenantId).eq("is_deleted", false).is("unsubscribed_at", null)
      .in("status", statusList);
    if (lRes.error) throw new Error(`recipients tier2: ${lRes.error.message}`);
    let leads: Lead[] = lRes.data || [];
    if (recipientType === "tier2_excl_registered" && eventId) {
      const xRes = await db.from("crm_event_attendees").select("lead_id")
        .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false);
      if (xRes.error) throw new Error(`recipients exclude: ${xRes.error.message}`);
      const excluded = new Set<string>();
      (xRes.data || []).forEach((r: { lead_id: string | null }) => {
        if (r.lead_id) excluded.add(r.lead_id);
      });
      leads = leads.filter((l) => !excluded.has(l.id));
    }
    return leads;
  }

  if (recipientType === "attendees" || recipientType === "attendees_waiting" || recipientType === "attendees_all_statuses") {
    if (!eventId) return [];
    let attStatus: string[] | null;
    if (recipientType === "attendees_waiting") attStatus = ["waiting_list"];
    else if (recipientType === "attendees_all_statuses") attStatus = null;
    else attStatus = ["registered", "confirmed", "attended", "purchased", "no_show"];
    // Single-chain builder (avoids any reassignment quirks). Use a default
    // status set if attStatus is null (all_statuses → broad list covering
    // every active status the system uses today).
    const ALL = ["registered", "confirmed", "attended", "purchased", "no_show", "waiting_list", "invited", "cancelled"];
    const aRes = await db.from("crm_event_attendees").select("lead_id")
      .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false)
      .in("status", attStatus || ALL);
    if (aRes.error) throw new Error(`recipients attendees: ${aRes.error.message}`);
    return await fetchLeadsByIds(db, tenantId,
      (aRes.data || []).map((r: { lead_id: string | null }) => r.lead_id).filter((x: string | null): x is string => !!x));
  }

  if (recipientType === "attendees_with_active_coupon") {
    // 2026-05-02 — event-day reminder rule: attendees who currently hold a
    // valid coupon (coupon_sent=true AND status != 'cancelled'). Mirrors UI
    // counter logic in crm-events-detail.js / crm-event-day-coupon.js.
    if (!eventId) return [];
    const cRes = await db.from("crm_event_attendees").select("lead_id")
      .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false)
      .eq("coupon_sent", true).neq("status", "cancelled");
    if (cRes.error) throw new Error(`recipients attendees_with_active_coupon: ${cRes.error.message}`);
    return await fetchLeadsByIds(db, tenantId,
      (cRes.data || []).map((r: { lead_id: string | null }) => r.lead_id).filter((x: string | null): x is string => !!x));
  }

  if (recipientType === "cross_event_active_waitlist") {
    // Rule 2.4: invite the active waitlist of OTHER open events to a newly-
    // opened parallel event. Filter: attendee status 'waiting_list' or
    // 'invited' on a different event whose own status is registration_open
    // or waiting_list.
    const attRes = await db.from("crm_event_attendees").select("event_id, lead_id, status")
      .eq("tenant_id", tenantId)
      .in("status", ["waiting_list", "invited"])
      .eq("is_deleted", false);
    if (attRes.error) throw new Error(`recipients cross_event: ${attRes.error.message}`);
    type AttRow = { event_id: string; lead_id: string; status: string };
    const rows = (attRes.data || []).filter((r: AttRow) => r.event_id !== eventId);
    if (!rows.length) return [];
    const otherEventIds = Array.from(new Set(rows.map((r: AttRow) => r.event_id)));
    const evRes = await db.from("crm_events").select("id, status, is_deleted")
      .eq("tenant_id", tenantId).in("id", otherEventIds);
    if (evRes.error) throw new Error(`recipients cross_event events: ${evRes.error.message}`);
    const activeEvents = new Set<string>();
    (evRes.data || []).forEach((e: { id: string; status: string; is_deleted: boolean }) => {
      if (!e.is_deleted && (e.status === "registration_open" || e.status === "waiting_list")) {
        activeEvents.add(e.id);
      }
    });
    const seen = new Set<string>();
    const leadIds: string[] = [];
    rows.forEach((r: AttRow) => {
      if (!activeEvents.has(r.event_id)) return;
      if (!r.lead_id || seen.has(r.lead_id)) return;
      seen.add(r.lead_id);
      leadIds.push(r.lead_id);
    });
    return await fetchLeadsByIds(db, tenantId, leadIds);
  }

  console.warn("automation-engine: unknown recipient_type", recipientType);
  return [];
}

// Two-query helper for the attendee-resolver branches. Browser engine uses
// PostgREST embedded resource select (`crm_leads(...)`); the EF uses two
// explicit queries instead, which is more robust to service-role / partial-
// index quirks and avoids any FK-relationship ambiguity that PostgREST may
// resolve differently between authenticated-user and service-role contexts.
async function fetchLeadsByIds(db: Db, tenantId: string, leadIds: string[]): Promise<Lead[]> {
  if (!leadIds.length) return [];
  const r = await db.from("crm_leads")
    .select("id, full_name, phone, email, unsubscribed_at, is_deleted")
    .eq("tenant_id", tenantId)
    .in("id", leadIds);
  if (r.error) throw new Error(`fetchLeadsByIds: ${r.error.message}`);
  return ((r.data || []) as Lead[]).filter((l) => !l.unsubscribed_at && !l.is_deleted);
}
