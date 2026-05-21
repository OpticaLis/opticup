// recipients.ts — recipient resolution for automation rules.
// Port of modules/crm/crm-automation-recipient-resolvers.js (7 recipient_types).
// Service-role DB; explicit tenant_id filter on every query (Iron Rule 22).

import { unwrapJsonbArray } from "./rpc-shape-util.ts";

export interface Lead {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  unsubscribed_at?: string | null;
  is_deleted?: boolean;
  // M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX (2026-05-21, Sprint 1 SPEC 2):
  // include created_at directly in resolveRecipients results so preview.ts
  // doesn't need a second chunked SELECT loop (fetchLeadMeta). Saves ~89s at 84K.
  created_at?: string | null;
}

// deno-lint-ignore no-explicit-any
type Db = any;

const TIER2_STATUSES = ["waiting", "invited", "confirmed", "confirmed_verified"];

// 2026-05-12 PAGINATE_QUERY_RANGE_REBUILD — PostgREST caps every response at
// 1000 rows. Browser code goes through paginateQuery in js/supabase-ops.js;
// the EF previously did NOT paginate at all, silently capping every
// recipient resolver at 1000 (Prizma broadcast hit 1216 → got 1000).
//
// Helper rebuilds the query each page via a factory so .range() is set on
// a fresh PostgrestFilterBuilder. Same contract as the browser-side fix.
// M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX (Sprint 1 SPEC 2, 2026-05-21):
// Attempted to bump pageSize 1000 → 5000 but Supabase PostgREST has db-max-rows=1000
// enforced for SELECT calls — the larger range silently truncates to 1000 and the
// `data.length < pageSize` early-exit fires falsely, returning only 1000 of 84K leads.
// Kept at 1000 for correctness. A future Sprint can replace paginate() with a
// SECURITY DEFINER RPC that bypasses the PostgREST row cap (one round-trip total
// instead of 84). See SPEC 2 EXECUTION_REPORT for the trace.
async function paginate<T>(buildQuery: () => any, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    // deno-lint-ignore no-explicit-any
    const { data, error }: { data: T[] | null; error: any } =
      await buildQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

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
      .select("id, full_name, phone, email, unsubscribed_at, is_deleted, created_at")
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
    // M4_JSONB_RPC_SHARED_HELPER (Sprint 3 Item 1): shape-fallback codified
    // in rpc-shape-util.unwrapJsonbArray. Belt+suspenders paginate fallback if
    // RPC returns empty (caught a real Sprint-1 silent failure).
    let leads: Lead[] = [];
    const rpcRes = await db.rpc("crm_resolve_tier2_leads_jsonb", {
      p_tenant_id: tenantId,
      p_status_list: statusList,
    });
    if (rpcRes.error) {
      console.warn("automation-engine resolveRecipients tier2 RPC error, falling back to paginate:", rpcRes.error.message);
    } else {
      leads = unwrapJsonbArray<Lead>(rpcRes.data);
    }
    if (!leads.length) {
      console.warn("[m4-tier2-rpc] RPC returned 0 leads — falling back to paginate");
      leads = await paginate<Lead>(() =>
        db.from("crm_leads").select("id, full_name, phone, email, created_at")
          .eq("tenant_id", tenantId).eq("is_deleted", false).is("unsubscribed_at", null)
          .in("status", statusList));
    }
    if (recipientType === "tier2_excl_registered" && eventId) {
      const xData = await paginate<{ lead_id: string | null }>(() =>
        db.from("crm_event_attendees").select("lead_id")
          .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false));
      const excluded = new Set<string>();
      xData.forEach((r) => { if (r.lead_id) excluded.add(r.lead_id); });
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
    const aData = await paginate<{ lead_id: string | null }>(() =>
      db.from("crm_event_attendees").select("lead_id")
        .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false)
        .in("status", attStatus || ALL));
    return await fetchLeadsByIds(db, tenantId,
      aData.map((r) => r.lead_id).filter((x: string | null): x is string => !!x));
  }

  if (recipientType === "attendees_with_active_coupon") {
    // 2026-05-02 — event-day reminder rule: attendees who currently hold a
    // valid coupon (coupon_sent=true AND status != 'cancelled'). Mirrors UI
    // counter logic in crm-events-detail.js / crm-event-day-coupon.js.
    if (!eventId) return [];
    const cData = await paginate<{ lead_id: string | null }>(() =>
      db.from("crm_event_attendees").select("lead_id")
        .eq("tenant_id", tenantId).eq("event_id", eventId).eq("is_deleted", false)
        .eq("coupon_sent", true).neq("status", "cancelled"));
    return await fetchLeadsByIds(db, tenantId,
      cData.map((r) => r.lead_id).filter((x: string | null): x is string => !!x));
  }

  if (recipientType === "cross_event_active_waitlist") {
    // Rule 2.4: invite the active waitlist of OTHER open events to a newly-
    // opened parallel event. Filter: attendee status 'waiting_list' or
    // 'invited' on a different event whose own status is registration_open
    // or waiting_list.
    type AttRow = { event_id: string; lead_id: string; status: string };
    const attData = await paginate<AttRow>(() =>
      db.from("crm_event_attendees").select("event_id, lead_id, status")
        .eq("tenant_id", tenantId)
        .in("status", ["waiting_list", "invited"])
        .eq("is_deleted", false));
    const rows = attData.filter((r) => r.event_id !== eventId);
    if (!rows.length) return [];
    const otherEventIds = Array.from(new Set(rows.map((r) => r.event_id)));
    const evData = await paginate<{ id: string; status: string; is_deleted: boolean }>(() =>
      db.from("crm_events").select("id, status, is_deleted")
        .eq("tenant_id", tenantId).in("id", otherEventIds));
    const activeEvents = new Set<string>();
    evData.forEach((e) => {
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
  // Chunk to keep .in('id', [...]) URL under PostgREST's ~8KB cap
  // (200 UUIDs ≈ 7.5KB). Each chunk paginated to bypass the 1000-row default.
  const CHUNK = 200;
  const out: Lead[] = [];
  for (let i = 0; i < leadIds.length; i += CHUNK) {
    const slice = leadIds.slice(i, i + CHUNK);
    const page = await paginate<Lead>(() =>
      db.from("crm_leads")
        .select("id, full_name, phone, email, unsubscribed_at, is_deleted, created_at")
        .eq("tenant_id", tenantId)
        .in("id", slice));
    page.forEach((l) => { if (!l.unsubscribed_at && !l.is_deleted) out.push(l); });
  }
  return out;
}
