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
  const { tenantId, triggerType, triggerData, mode, planItems, dispatchMessages, anonKey, sendMessageUrl } = input;

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
  const ruleResolvedIds: string[][] = [];
  perRule.forEach((v, i) => {
    allItems = allItems.concat(v.items || []);
    skipped += v.skipped || 0;
    totalQueued += v.queued || 0;
    ruleResolvedIds[i] = v.resolvedLeadIds || [];
  });

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
    };
  }

  // mode='dispatch'. Decide which items to dispatch:
  //   - if client provided plan_items (browser confirm path), use those
  //     (honors the operator's approval — no preview/dispatch recipient race);
  //   - else (cron path) use re-evaluated allItems.
  // Then: dispatchMessages flag gates the actual message send. False =
  // post-actions ran (committed) but no SMS/email dispatch ("confirm without
  // notify"). True = full dispatch (cron default OR "confirm and notify").
  const itemsToDispatch = (Array.isArray(planItems) && planItems.length > 0) ? planItems : allItems;
  if (!dispatchMessages || itemsToDispatch.length === 0) {
    if (runId) await finishRun(db, tenantId, runId, "completed");
    return {
      run_id: runId, fired: rules.length, sent: 0, failed: 0, rejected: 0,
      queued: totalQueued, skipped,
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
  };
}

// STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12).
// Consumer for the crm_status_change_events queue. Called once per minute per
// tenant by the pg_cron job consume_status_change_events. Reads N unconsumed
// rows for the tenant, derives the trigger_type via crm_trigger_type_registry,
// invokes evaluate() in dispatch mode, marks consumed_at on success. Single-row
// errors leave consumed_at NULL (retried next tick).
export async function consumeStatusChangeEvents(
  db: Db,
  tenantId: string,
  limit: number,
  anonKey: string,
  sendMessageUrl: string,
): Promise<{ processed: number; evaluated: number; errors: number }> {
  const cap = Math.min(Math.max(limit || 100, 1), 500);

  const claimRes = await db.from("crm_status_change_events")
    .select("id, entity_type, entity_id, old_status, new_status, payload")
    .eq("tenant_id", tenantId)
    .is("consumed_at", null)
    .order("occurred_at", { ascending: true })
    .limit(cap);
  if (claimRes.error) {
    console.error("consumeStatusChangeEvents claim:", claimRes.error);
    return { processed: 0, evaluated: 0, errors: 1 };
  }
  const events = claimRes.data || [];
  if (!events.length) return { processed: 0, evaluated: 0, errors: 0 };

  const regRes = await db.from("crm_trigger_type_registry")
    .select("entity_type, trigger_type_slug, is_active")
    .eq("tenant_id", tenantId);
  if (regRes.error) {
    console.error("consumeStatusChangeEvents registry:", regRes.error);
    return { processed: 0, evaluated: 0, errors: 1 };
  }
  const registryMap = new Map<string, string>();
  (regRes.data || []).forEach((r: { entity_type: string; trigger_type_slug: string; is_active: boolean }) => {
    if (r.is_active) registryMap.set(r.entity_type, r.trigger_type_slug);
  });

  let processed = 0, evaluated = 0, errors = 0;
  for (const ev of events) {
    const e = ev as { id: string; entity_type: string; entity_id: string; old_status: string | null; new_status: string; payload: Record<string, unknown> | null };
    try {
      const triggerType = registryMap.get(e.entity_type);
      if (!triggerType) {
        // entity_type not registered for this tenant — mark consumed to avoid
        // poison-pill replay. Audit row remains for "why didn't it fire?".
        await db.from("crm_status_change_events")
          .update({ consumed_at: new Date().toISOString() })
          .eq("id", e.id).eq("tenant_id", tenantId);
        processed++;
        continue;
      }
      const payload = (e.payload && typeof e.payload === "object") ? e.payload : {};
      const triggerData: Record<string, unknown> = {
        oldStatus: e.old_status,
        newStatus: e.new_status,
        status: e.new_status,
        attendeeId: e.entity_id,
        leadId: typeof payload.lead_id === "string" ? payload.lead_id : null,
        eventId: typeof payload.event_id === "string" ? payload.event_id : null,
      };
      const r = await evaluate(db, {
        tenantId, triggerType, triggerData,
        mode: "dispatch", planItems: null, dispatchMessages: true,
        anonKey, sendMessageUrl,
      });
      if (r.fired > 0) evaluated++;
      await db.from("crm_status_change_events")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", e.id).eq("tenant_id", tenantId);
      processed++;
    } catch (err) {
      console.error("consumeStatusChangeEvents event " + e.id + ":", (err as Error).message);
      errors++;
      // consumed_at left NULL — next tick retries this row.
    }
  }

  return { processed, evaluated, errors };
}
