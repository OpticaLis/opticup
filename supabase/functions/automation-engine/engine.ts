// engine.ts — server-side rule loading + condition evaluation + main entry.
// Port of modules/crm/crm-automation-engine.js to Edge Function context.
// Service-role DB client; every query MUST filter by tenant_id explicitly
// (Iron Rule 22 — service-role bypasses RLS).

import { prepareRulePlan, type PreparedPlan } from "./prepare-plan.ts";
import { createRun, finishRun } from "./runs.ts";
import { executePostActions, attendeeUpsert } from "./post-actions.ts";
import { dispatchPlanDirect } from "./dispatch.ts";

// 5 client-side trigger types → {entity, event} columns in crm_automation_rules.
// MUST mirror modules/crm/crm-automation-engine.js TRIGGER_TYPES exactly.
export const TRIGGER_TYPES: Record<string, { entity: string; event: string }> = {
  event_status_change: { entity: "event",    event: "status_change" },
  event_registration:  { entity: "attendee", event: "created"       },
  lead_status_change:  { entity: "lead",     event: "status_change" },
  lead_intake:         { entity: "lead",     event: "created"       },
  attendee_moved:      { entity: "attendee", event: "moved"         },
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
}

const ZERO: EvaluateResult = {
  run_id: null, fired: 0, sent: 0, failed: 0, rejected: 0, queued: 0, skipped: 0,
};

export async function evaluate(db: Db, input: EvaluateInput): Promise<EvaluateResult> {
  const { tenantId, triggerType, triggerData, mode, planItems, anonKey, sendMessageUrl } = input;

  // Rung 2 approve-path short-circuit: caller has approved plan_items, skip
  // rule re-evaluation and dispatch directly. Prevents preview/dispatch race
  // per FOREMAN_REVIEW §2.3 clarification.
  if (mode === "dispatch" && Array.isArray(planItems) && planItems.length > 0) {
    const r = await dispatchPlanDirect(db, planItems, tenantId, anonKey, sendMessageUrl);
    return { ...ZERO, sent: r.sent, failed: r.failed, rejected: r.rejected };
  }

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

  const rules = (res.data || []).filter((r: { trigger_condition: unknown }) =>
    evaluateCondition(r.trigger_condition, triggerData)
  );
  if (!rules.length) return ZERO;

  // Run row written upfront (parity with browser engine line 251). Patched
  // with total_recipients after planItems + queued counts are known.
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  const runId = await createRun(db, tenantId, rules, triggerType, triggerData, eventId);

  const tplCache = new Map<string, unknown>();
  const perRule: PreparedPlan[] = [];
  for (let i = 0; i < rules.length; i++) {
    try {
      perRule.push(await prepareRulePlan(db, tenantId, rules[i], triggerData, tplCache, runId));
    } catch (e) {
      console.error("automation-engine prepareRulePlan:", (e as Error).message);
      perRule.push({ items: [], skipped: 1, resolvedLeadIds: [], queued: 0 });
    }
  }

  let allItems: unknown[] = [];
  let skipped = 0;
  let totalQueued = 0;
  const ruleResolvedIds: string[][] = [];
  perRule.forEach((v, i) => {
    allItems = allItems.concat(v.items || []);
    skipped += v.skipped || 0;
    totalQueued += v.queued || 0;
    ruleResolvedIds[i] = v.resolvedLeadIds || [];
  });

  // Bulk post-actions (parity with browser engine lines 270–282).
  for (let i = 0; i < rules.length; i++) {
    try { await executePostActions(db, tenantId, rules[i], ruleResolvedIds[i] || []); }
    catch (e) { console.error("automation-engine post-action:", (e as Error).message); }
    try { await attendeeUpsert(db, tenantId, rules[i], ruleResolvedIds[i] || [], triggerData); }
    catch (e) { console.error("automation-engine attendee-upsert:", (e as Error).message); }
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

  // mode='evaluate' — return planItems for preview, do not dispatch.
  // queue_send rules already wrote to crm_message_queue; post-actions
  // already ran — those are deterministic state transitions independent of
  // dispatch approval (parity with browser engine, where the modal also
  // doesn't gate them).
  if (mode === "evaluate") {
    if (runId) await finishRun(db, tenantId, runId, "completed");
    return {
      run_id: runId,
      fired: rules.length,
      sent: 0, failed: 0, rejected: 0,
      queued: totalQueued,
      skipped,
      plan_items: allItems,
    };
  }

  // mode='dispatch' (cron path or browser fallback). queue_send rules already
  // wrote to crm_message_queue; for any send_message planItems, fall through
  // to direct dispatch (parity with browser dispatchPlanDirect when
  // CrmConfirmSend is not loaded).
  if (!allItems.length) {
    if (runId) await finishRun(db, tenantId, runId, "completed");
    return {
      run_id: runId, fired: rules.length, sent: 0, failed: 0, rejected: 0,
      queued: totalQueued, skipped,
    };
  }

  const r = await dispatchPlanDirect(db, allItems, tenantId, anonKey, sendMessageUrl);
  if (runId) await finishRun(db, tenantId, runId, "completed");
  return {
    run_id: runId,
    fired: rules.length,
    sent: r.sent,
    failed: r.failed,
    rejected: r.rejected,
    queued: totalQueued,
    skipped,
  };
}
