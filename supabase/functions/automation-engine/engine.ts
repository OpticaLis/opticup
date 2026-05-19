// engine.ts — server-side rule loading + condition evaluation + main entry.
// Port of modules/crm/crm-automation-engine.js to Edge Function context.
// Service-role DB client; every query MUST filter by tenant_id explicitly
// (Iron Rule 22 — service-role bypasses RLS).

import { prepareRulePlan, type PreparedPlan } from "./prepare-plan.ts";
import { createRun, finishRun } from "./runs.ts";
import { executePostActions, attendeeUpsert } from "./post-actions.ts";
import { dispatchPlanDirect } from "./dispatch.ts";

// 6 client-side trigger types → {entity, event} columns in crm_automation_rules.
// MUST mirror modules/crm/crm-automation-engine.js TRIGGER_TYPES exactly.
// attendee_status_change added 2026-05-12 (STATUS_CHANGE_TRIGGERS_FRAMEWORK).
export const TRIGGER_TYPES: Record<string, { entity: string; event: string }> = {
  event_status_change:     { entity: "event",    event: "status_change" },
  event_registration:      { entity: "attendee", event: "created"       },
  lead_status_change:      { entity: "lead",     event: "status_change" },
  lead_intake:             { entity: "lead",     event: "created"       },
  attendee_moved:          { entity: "attendee", event: "moved"         },
  attendee_status_change:  { entity: "attendee", event: "status_change" },
};

// Condition evaluators — mirror modules/crm/crm-automation-engine.js CONDITIONS.
// deno-lint-ignore no-explicit-any
type ConditionFn = (cond: any, data: Record<string, unknown>) => boolean;
const CONDITIONS: Record<string, ConditionFn> = {
  always: () => true,
  status_equals: (cond, data) => {
    const v = data.newStatus != null ? data.newStatus
      : (data.outcome != null ? data.outcome : data.status);
    return v === cond.status;
  },
  count_threshold: (cond, data) => {
    const actual = data[cond.field];
    if (typeof actual !== "number") return false;
    if (cond.operator === ">")  return actual >  cond.value;
    if (cond.operator === ">=") return actual >= cond.value;
    if (cond.operator === "=")  return actual === cond.value;
    if (cond.operator === "<")  return actual <  cond.value;
    if (cond.operator === "<=") return actual <= cond.value;
    return false;
  },
  source_equals: (cond, data) => data.source === cond.source,
  // STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12): NULL-safe comparisons against
  // the old/new status fields the consume_status_events path populates.
  status_changed_from: (cond, data) => data.oldStatus === cond.status,
  status_changed_to:   (cond, data) => data.newStatus === cond.status,
};

export function evaluateCondition(
  conditionJson: unknown,
  data: Record<string, unknown>,
): boolean {
  if (!conditionJson || typeof conditionJson !== "object") return true;
  // deno-lint-ignore no-explicit-any
  const c = conditionJson as any;
  const type = c.type || "always";
  const fn = CONDITIONS[type];
  if (!fn) {
    console.warn("automation-engine: unknown condition type", type);
    return false;
  }
  try { return fn(c, data || {}); }
  catch (e) {
    console.error("automation-engine: condition error", (e as Error).message);
    return false;
  }
}

// deno-lint-ignore no-explicit-any
type Db = any;

export interface EvaluateInput {
  tenantId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  mode: "evaluate" | "dispatch";
  planItems: unknown[] | null;
  // ATOMIC_CONFIRMATION_FLOW Part A: when mode='dispatch', this flag controls
  // whether messages are dispatched. Post-actions + queue_send always run in
  // dispatch mode regardless. Default true (cron path + confirm-and-notify).
  // Set to false by client's "Confirm without notify" modal choice.
  dispatchMessages: boolean;
  // M4_DRY_RUN_PREVIEW (2026-05-14): per-dispatch recipient filters. Applied
  // to BOTH plan items (the dispatched messages) AND resolvedLeadIds (the set
  // post-actions + queue_send eligibility runs against), so a deselected lead
  // gets neither the message nor the side-effects. Filters are AFTER recipient
  // resolution (operator can't add a non-eligible lead — only narrow the set).
  // Both default to empty arrays (no filtering) for backward compatibility
  // with all existing callsites (cron, browser-modal-pre-v2, etc).
  excludeLeadIds?: string[];
  recipientSubset?: string[];
  anonKey: string;
  sendMessageUrl: string;
}

export interface EvaluateResult {
  run_id: string | null;
  fired: number;
  sent: number;
  failed: number;
  rejected: number;
  queued: number;
  skipped: number;
  plan_items?: unknown[];
  // M4_TEMPLATE_VALIDATION_UNIFIED (2026-05-14 Phase 2 P2.3): number of plan
  // items rejected pre-enqueue by validateTemplateOutput. Each is logged as
  // a crm_message_log row with status='rejected' AND the originating rule's
  // last_error column gets a structured summary. Counted SEPARATELY from
  // rejected/failed/skipped so reporting can tell apart "doomed template"
  // vs "phone_not_allowed" vs "no recipients".
  validation_failures?: number;
}

const ZERO: EvaluateResult = {
  run_id: null, fired: 0, sent: 0, failed: 0, rejected: 0, queued: 0, skipped: 0,
  validation_failures: 0,
};

export async function evaluate(db: Db, input: EvaluateInput): Promise<EvaluateResult> {
  const {
    tenantId, triggerType, triggerData, mode, planItems,
    dispatchMessages, anonKey, sendMessageUrl,
  } = input;
  // M4_DRY_RUN_PREVIEW (2026-05-14): subset filters. Both optional/empty by default.
  const excludeSet  = new Set<string>(Array.isArray(input.excludeLeadIds)  ? input.excludeLeadIds  : []);
  const includeSet  = new Set<string>(Array.isArray(input.recipientSubset) ? input.recipientSubset : []);
  const hasInclude  = includeSet.size > 0;

  // ATOMIC_CONFIRMATION_FLOW Part A: Rung-2 short-circuit DROPPED.
  // Dispatch mode now MUST run rule re-evaluation so post-actions + queue_send
  // (which were skipped in evaluate mode) can fire here at the atomic-commit
  // point. Client's planItems are still honored at the dispatch step (no
  // preview/dispatch recipient race for messages); post-actions run on the
  // re-resolved leads, which is acceptable — race window is bounded by modal
  // open duration (seconds).

  const map = TRIGGER_TYPES[triggerType];
  if (!map) return ZERO;

  const res = await db.from("crm_automation_rules")
    .select("id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .eq("trigger_entity", map.entity)
    .eq("trigger_event", map.event)
    .order("sort_order");
  if (res.error) {
    console.error("automation-engine load rules:", res.error);
    return ZERO;
  }

  // M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 3: self-loop guard. If this SCE was
  // caused by a rule's post_action, filter that rule out of the matching set so
  // it cannot re-fire on its own derivative status change within the 1-hour
  // window that the consumer enforces by reading recent SCE rows. Cross-rule
  // chains remain allowed (rule A → status change → rule B fires is OK).
  const originRuleId = (typeof triggerData._origin_rule_id === "string" && triggerData._origin_rule_id) ? triggerData._origin_rule_id : null;
  const rules = (res.data || [])
    .filter((r: { id: string; trigger_condition: unknown }) => {
      if (originRuleId && r.id === originRuleId) return false;
      return evaluateCondition(r.trigger_condition, triggerData);
    });
  if (!rules.length) return ZERO;

  // Run row written upfront (parity with browser engine line 251). Patched
  // with total_recipients after planItems + queued counts are known.
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  const runId = await createRun(db, tenantId, rules, triggerType, triggerData, eventId);

  const tplCache = new Map<string, unknown>();
  const perRule: PreparedPlan[] = [];
  for (let i = 0; i < rules.length; i++) {
    try {
      // ATOMIC_CONFIRMATION_FLOW Part A: pass `mode` so prepareRulePlan can
      // skip queue_send writes when mode='evaluate' (preview only).
      perRule.push(await prepareRulePlan(db, tenantId, rules[i], triggerData, tplCache, runId, mode));
    } catch (e) {
      console.error("automation-engine prepareRulePlan:", (e as Error).message);
      perRule.push({ items: [], skipped: 1, resolvedLeadIds: [], queued: 0 });
    }
  }

  let allItems: unknown[] = [];
  let skipped = 0;
  let totalQueued = 0;
  let totalValidationFailures = 0;
  const ruleResolvedIds: string[][] = [];
  perRule.forEach((v, i) => {
    allItems = allItems.concat(v.items || []);
    skipped += v.skipped || 0;
    totalQueued += v.queued || 0;
    totalValidationFailures += v.validation_failures || 0;
    ruleResolvedIds[i] = v.resolvedLeadIds || [];
  });

  // M4_TEMPLATE_VALIDATION_UNIFIED — write per-rule last_error (or clear when
  // the rule passed clean). Defense-in-depth (Iron Rule 22): explicit
  // tenant_id on every UPDATE alongside the rule id. Rule stays
  // is_active=true regardless (Daniel's directive: operator SEES the error;
  // it's a hint, not a kill-switch). Only fires in dispatch mode — evaluate
  // mode is preview-only and must not mutate the rule.
  if (mode === "dispatch") {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i] as { id: string };
      const v = perRule[i];
      const newSummary = v.validation_error_summary || null;
      // Both write paths (set + clear) call UPDATE; "clear to NULL" runs
      // unconditionally so a previously-broken rule that's been fixed by
      // operator-edit shows clean on its next firing. Cost: one UPDATE per
      // rule per cron tick (~17 rules / tenant currently). Acceptable.
      try {
        await db.from("crm_automation_rules")
          .update({ last_error: newSummary })
          .eq("id", r.id)
          .eq("tenant_id", tenantId);
      } catch (e) {
        console.error("automation-engine last_error UPDATE:", (e as Error).message);
      }
    }
  }

  // M4_DRY_RUN_PREVIEW (2026-05-14): apply subset filters BEFORE post-actions
  // + dispatch. Filter every item that carries a lead_id (send_message items)
  // and every resolvedLeadIds list (post-action eligibility). queue_send rules
  // contribute no items (they wrote directly to crm_message_queue inside
  // prepareRulePlan) — those are unaffected here; this is intentional because
  // queue_send semantics are "delayed background send for this lead regardless
  // of operator curation", and operator-level deselection of a recipient does
  // not retroactively cancel a queue_send. The Phase 6 cancel-by-run_id flow
  // covers post-write cancellation of all rows including queue_send.
  if (excludeSet.size > 0 || hasInclude) {
    const passes = (id: string | null | undefined): boolean => {
      if (!id) return true; // non-lead items (defensive); send_message items always have lead_id
      if (excludeSet.has(id)) return false;
      if (hasInclude && !includeSet.has(id)) return false;
      return true;
    };
    allItems = allItems.filter((it) => passes((it as { lead_id?: string }).lead_id));
    for (let i = 0; i < ruleResolvedIds.length; i++) {
      ruleResolvedIds[i] = (ruleResolvedIds[i] || []).filter(passes);
    }
  }

  // ATOMIC_CONFIRMATION_FLOW Part A: post-actions + attendee-upsert ONLY in
  // dispatch mode. evaluate mode is preview-only — no side effects.
  if (mode === "dispatch") {
    for (let i = 0; i < rules.length; i++) {
      try { await executePostActions(db, tenantId, rules[i], ruleResolvedIds[i] || []); }
      catch (e) { console.error("automation-engine post-action:", (e as Error).message); }
      try { await attendeeUpsert(db, tenantId, rules[i], ruleResolvedIds[i] || [], triggerData); }
      catch (e) { console.error("automation-engine attendee-upsert:", (e as Error).message); }
    }
  }

  // Update total_recipients (parity with browser line 285–289).
  const totalRecipients = allItems.length + totalQueued;
  if (runId && totalRecipients > 0) {
    try {
      await db.from("crm_automation_runs").update({ total_recipients: totalRecipients })
        .eq("id", runId).eq("tenant_id", tenantId);
    } catch (e) { console.error("automation-engine total_recipients update:", (e as Error).message); }
  }

  // Stamp items with run_id (parity with browser line 303).
  if (runId) {
    allItems.forEach((it) => { (it as Record<string, unknown>).run_id = runId; });
  }

  // mode='evaluate' — return planItems for preview, NO side effects.
  // ATOMIC_CONFIRMATION_FLOW Part A: post-actions and queue_send writes were
  // skipped above in this mode — they fire only at dispatch (modal approve).
  if (mode === "evaluate") {
    if (runId) await finishRun(db, tenantId, runId, "completed");
    return {
      run_id: runId,
      fired: rules.length,
      sent: 0, failed: 0, rejected: 0,
      queued: totalQueued,
      skipped,
      plan_items: allItems,
      validation_failures: totalValidationFailures,
    };
  }

  // mode='dispatch'. Decide which items to dispatch:
  //   - if client provided plan_items (browser confirm path), use those
  //     (honors the operator's approval — no preview/dispatch recipient race);
  //   - else (cron path) use re-evaluated allItems.
  // Then: dispatchMessages flag gates the actual message send. False =
  // post-actions ran (committed) but no SMS/email dispatch ("confirm without
  // notify"). True = full dispatch (cron default OR "confirm and notify").
  let itemsToDispatch = (Array.isArray(planItems) && planItems.length > 0) ? planItems : allItems;
  // M4_DRY_RUN_PREVIEW (2026-05-14): subset filters apply to plan_items too
  // (defensive — if a client passes both planItems and exclude_lead_ids, both
  // must be honored).
  if ((excludeSet.size > 0 || hasInclude) && itemsToDispatch === planItems) {
    itemsToDispatch = (planItems || []).filter((it) => {
      const id = (it as { lead_id?: string }).lead_id;
      if (!id) return true;
      if (excludeSet.has(id)) return false;
      if (hasInclude && !includeSet.has(id)) return false;
      return true;
    });
  }
  if (!dispatchMessages || itemsToDispatch.length === 0) {
    if (runId) await finishRun(db, tenantId, runId, "completed");
    return {
      run_id: runId, fired: rules.length, sent: 0, failed: 0, rejected: 0,
      queued: totalQueued, skipped,
      validation_failures: totalValidationFailures,
    };
  }

  const r = await dispatchPlanDirect(db, itemsToDispatch, tenantId, anonKey, sendMessageUrl);
  if (runId) await finishRun(db, tenantId, runId, "completed");
  // 2026-05-12 — dispatchPlanDirect now enqueues to crm_message_queue instead
  // of fanning out parallel fetch() calls. r.queued is the number of rows
  // inserted; actual sends happen async via dispatch-queue EF (pg_cron).
  // r.sent is always 0 here; final counts land on the run row via the
  // dispatch-queue → send-message → finishRun message-log scan, OR remain
  // 0 if finishRun has already completed by then (current behavior).
  return {
    run_id: runId,
    fired: rules.length,
    sent: r.sent,
    failed: r.failed,
    rejected: r.rejected,
    queued: totalQueued + (r.queued || 0),
    skipped,
    validation_failures: totalValidationFailures,
  };
}

// STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12) consumer moved to consumer.ts
// on 2026-05-14 (M4_DRY_RUN_PREVIEW Phase 2) to keep engine.ts under the
// Iron Rule 12 cap. Re-exported here so callers that imported it from engine.ts
// continue to work.
export { consumeStatusChangeEvents } from "./consumer.ts";
