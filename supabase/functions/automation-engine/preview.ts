// preview.ts — server-authoritative dispatch preview builder.
// M4_DRY_RUN_PREVIEW_AND_DISPATCH Phase 2 (2026-05-14).
//
// Implements mode='dispatch_preview' for the automation-engine EF. Resolves
// the same recipients + final message bodies that mode='dispatch' would,
// but writes nothing — no crm_message_queue rows, no crm_message_log rows,
// no post-actions, no attendee upserts. Pure preview.
//
// The browser modal (crm-confirm-send-v2.js) consumes the response to render
// a recipient-first preview with per-recipient body, search, deselection,
// quick filters, and test-send. Approve in the modal triggers a separate
// mode='dispatch' call carrying the approved exclude_lead_ids.
//
// Reuses prepareRulePlan(..., 'evaluate') from prepare-plan.ts — which already
// short-circuits all side effects in evaluate mode (queue_send is skipped,
// post-actions are skipped in engine.ts). Adds 3 enrichment queries:
//   1. crm_leads.created_at  (for "Last 30 days" chip filter)
//   2. crm_message_log most-recent sent row per lead (for the body-preview
//      "Last message: <date> — <slug>" line)
//   3. crm_event_attendees aggregate counts per lead (for "No previous
//      registration" + "Customers" chip filters)
//
// Service-role DB; explicit tenant_id filter on every query (Iron Rule 22).

import { prepareRulePlan } from "./prepare-plan.ts";
import { createRun, finishRun } from "./runs.ts";
import { TRIGGER_TYPES, evaluateCondition } from "./engine.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface PreviewInput {
  tenantId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
}

// M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): the lazy per-row body fetch lives
// in preview-recipient-body.ts to keep this file under Iron Rule 12's cap.

interface PlanItem {
  rule_name?: string;
  template_slug?: string | null;
  template_id?: string | null;
  channel: string;
  recipient?: { name?: string; phone?: string; email?: string };
  variables?: Record<string, unknown>;
  composedBody?: string;
  lead_id: string;
  event_id?: string | null;
  language?: string;
}

// M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): message bodies fields kept on the
// shape for backward-compat with any caller that reads them, but the default
// path populates them as null. Bodies are composed on demand via
// previewRecipientBody (per-row click in the modal). last_message_sent_at /
// last_template_slug fields REMOVED — the prior fetchLastMessages helper
// SELECTed crm_message_log.template_slug which does not exist (drift fix).
interface RecipientView {
  lead_id: string;
  full_name: string;
  phone: string;
  email: string;
  message_body_sms: string | null;     // null in lazy default; populated only via preview_recipient_body
  message_body_email: string | null;   // null in lazy default; populated only via preview_recipient_body
  created_at: string | null;
  prior_active_attendee_count: number;
  attended_event_count: number;
}

export interface PreviewResult {
  run_id: string | null;
  fired: number;
  queued: number;
  skipped: number;
  rules: Array<{ rule_id: string; rule_name: string; template_slug: string | null; channels: string[]; recipient_count: number }>;
  channels: string[];
  recipients_by_lead: RecipientView[];
  // M4_DISPATCH_PREVIEW_LAZY_ROWS new shape fields:
  recipient_count_total: number;
  recipient_count_by_channel: Record<string, number>;
}

const ZERO: PreviewResult = {
  run_id: null, fired: 0, queued: 0, skipped: 0,
  rules: [], channels: [], recipients_by_lead: [],
  recipient_count_total: 0, recipient_count_by_channel: {},
};

// In-process pagination helper — mirrors the recipients.ts paginate() so we
// don't silently cap at PostgREST's 1000-row response limit.
async function paginatedSelect<T>(
  buildQuery: () => any, // deno-lint-ignore no-explicit-any
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function fetchLeadMeta(
  db: Db, tenantId: string, leadIds: string[],
): Promise<Map<string, { created_at: string | null }>> {
  const m = new Map<string, { created_at: string | null }>();
  if (!leadIds.length) return m;
  const CHUNK = 200;
  for (let i = 0; i < leadIds.length; i += CHUNK) {
    const slice = leadIds.slice(i, i + CHUNK);
    const rows = await paginatedSelect<{ id: string; created_at: string | null }>(() =>
      db.from("crm_leads").select("id, created_at")
        .eq("tenant_id", tenantId).in("id", slice));
    rows.forEach((r) => m.set(r.id, { created_at: r.created_at }));
  }
  return m;
}

// M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): fetchLastMessages DELETED.
// The SELECT against crm_message_log.template_slug referenced a column that
// does not exist on the live DB (only template_id does). The catch at line
// ~268 swallowed the error to console.warn, leaving last_message_sent_at /
// last_template_slug always null. The "Last message" decoration in the modal
// was decorative-only (not used in any decision) — deleted entirely with the
// drift. See INCIDENT_REPORT §0 "background DB error".

async function fetchAttendeeAggregates(
  db: Db, tenantId: string, leadIds: string[],
): Promise<Map<string, { prior_active_attendee_count: number; attended_event_count: number }>> {
  const m = new Map<string, { prior_active_attendee_count: number; attended_event_count: number }>();
  if (!leadIds.length) return m;
  const ACTIVE = new Set(["registered", "confirmed", "attended", "purchased", "no_show"]);
  const CHUNK = 200;
  for (let i = 0; i < leadIds.length; i += CHUNK) {
    const slice = leadIds.slice(i, i + CHUNK);
    const rows = await paginatedSelect<{ lead_id: string; status: string }>(() =>
      db.from("crm_event_attendees").select("lead_id, status")
        .eq("tenant_id", tenantId).in("lead_id", slice).eq("is_deleted", false));
    for (const r of rows) {
      const existing = m.get(r.lead_id) || { prior_active_attendee_count: 0, attended_event_count: 0 };
      if (ACTIVE.has(r.status)) existing.prior_active_attendee_count += 1;
      if (r.status === "attended") existing.attended_event_count += 1;
      m.set(r.lead_id, existing);
    }
  }
  return m;
}

// Main entry. Reuses engine.ts TRIGGER_TYPES + evaluateCondition + the existing
// prepareRulePlan(..., 'evaluate') to avoid drift between preview and dispatch.
export async function previewDispatch(
  db: Db, input: PreviewInput,
): Promise<PreviewResult> {
  const { tenantId, triggerType, triggerData } = input;
  const map = TRIGGER_TYPES[triggerType];
  if (!map) return { ...ZERO };

  const res = await db.from("crm_automation_rules")
    .select("id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active")
    .eq("tenant_id", tenantId).eq("is_active", true)
    .eq("trigger_entity", map.entity).eq("trigger_event", map.event)
    .order("sort_order");
  if (res.error) {
    console.error("preview load rules:", res.error);
    return { ...ZERO };
  }

  const rules = (res.data || []).filter((r: { trigger_condition: unknown }) =>
    evaluateCondition(r.trigger_condition, triggerData));
  if (!rules.length) return { ...ZERO };

  // Open a run row so the modal's later mode='dispatch' call can reuse this
  // run_id as the broadcast_id (Brief §3.7 — reuse existing concept, no DDL).
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  const runId = await createRun(db, tenantId, rules, triggerType, triggerData, eventId);

  // M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): per-rule plan preparation with
  // skipBodyComposition=true (the lazy default). prepareRulePlan returns items
  // with composedBody=null but full lead identity + channel — enough to drive
  // the modal's recipient list, filter chips, and per-channel counts. The
  // per-row body comes from previewRecipientBody (separate EF call).
  const tplCache = new Map<string, unknown>();
  const allItems: PlanItem[] = [];
  let skipped = 0;
  let totalQueued = 0;
  const channelsSet = new Set<string>();
  const ruleSummaries: Array<{ rule_id: string; rule_name: string; template_slug: string | null; channels: string[]; recipient_count: number }> = [];
  for (const rule of rules) {
    try {
      const p = await prepareRulePlan(db, tenantId, rule, triggerData, tplCache, runId, "evaluate",
        { skipBodyComposition: true });
      const ruleChannels = new Set<string>();
      const ruleLeadIds = new Set<string>();
      (p.items || []).forEach((it) => {
        const pi = it as PlanItem;
        allItems.push(pi);
        if (pi.channel) { channelsSet.add(pi.channel); ruleChannels.add(pi.channel); }
        if (pi.lead_id) ruleLeadIds.add(pi.lead_id);
      });
      skipped += p.skipped || 0;
      totalQueued += p.queued || 0;
      const cfg = (rule.action_config || {}) as { template_slug?: string };
      ruleSummaries.push({
        rule_id: rule.id, rule_name: rule.name || "",
        template_slug: cfg.template_slug || null,
        channels: Array.from(ruleChannels),
        recipient_count: ruleLeadIds.size,
      });
    } catch (e) {
      console.error("preview prepareRulePlan:", (e as Error).message);
      skipped += 1;
    }
  }

  // Stamp run_id on items (parity with engine.ts evaluate path).
  if (runId) allItems.forEach((it) => { (it as unknown as Record<string, unknown>).run_id = runId; });

  // M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): group plan items by lead_id.
  // Bodies are intentionally NULL — populated on demand via previewRecipientBody.
  // Channel-presence flags drive the modal's per-row expand UI (so it knows
  // which channels to fetch when the row is clicked).
  const byLead = new Map<string, RecipientView>();
  const byChannelCount: Record<string, number> = {};
  for (const it of allItems) {
    if (!it.lead_id) continue;
    let r = byLead.get(it.lead_id);
    if (!r) {
      r = {
        lead_id: it.lead_id,
        full_name: it.recipient?.name || "",
        phone: it.recipient?.phone || "",
        email: it.recipient?.email || "",
        message_body_sms: null,
        message_body_email: null,
        created_at: null,
        prior_active_attendee_count: 0,
        attended_event_count: 0,
      };
      byLead.set(it.lead_id, r);
    }
    if (it.channel) byChannelCount[it.channel] = (byChannelCount[it.channel] || 0) + 1;
  }

  const leadIds = Array.from(byLead.keys());

  // M4_DISPATCH_PREVIEW_LAZY_ROWS: enrichment queries kept (drive chip filters)
  // but fetchLastMessages DELETED (template_slug drift; was decorative-only).
  try {
    const meta = await fetchLeadMeta(db, tenantId, leadIds);
    meta.forEach((v, k) => {
      const r = byLead.get(k);
      if (r) r.created_at = v.created_at;
    });
  } catch (e) { console.warn("preview fetchLeadMeta:", (e as Error).message); }

  try {
    const agg = await fetchAttendeeAggregates(db, tenantId, leadIds);
    agg.forEach((v, k) => {
      const r = byLead.get(k);
      if (r) {
        r.prior_active_attendee_count = v.prior_active_attendee_count;
        r.attended_event_count = v.attended_event_count;
      }
    });
  } catch (e) { console.warn("preview fetchAttendeeAggregates:", (e as Error).message); }

  // Sort by full_name ASC (alphabetical) so the "first 3" test-send subset is
  // deterministic without client-side sorting (Brief §3.6 stable subset).
  const recipients = Array.from(byLead.values()).sort((a, b) =>
    String(a.full_name || "").localeCompare(String(b.full_name || ""), "he"));

  // Close the run row — preview emits no dispatches, mark completed.
  if (runId) await finishRun(db, tenantId, runId, "completed");

  return {
    run_id: runId,
    fired: rules.length,
    queued: totalQueued,
    skipped,
    rules: ruleSummaries,
    channels: Array.from(channelsSet),
    recipients_by_lead: recipients,
    recipient_count_total: recipients.length,
    recipient_count_by_channel: byChannelCount,
  };
}

