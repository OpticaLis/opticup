// consumer.ts — pg_cron consumer for crm_status_change_events.
// Extracted from engine.ts on 2026-05-14 (M4_DRY_RUN_PREVIEW Phase 2) to keep
// engine.ts under Iron Rule 12's 350-line cap once the dispatch_preview filter
// plumbing landed. Pure refactor — zero behavior change.
//
// STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12). Called once per minute per
// tenant by the pg_cron job consume_status_change_events. Reads N unconsumed
// rows for the tenant, derives the trigger_type via crm_trigger_type_registry,
// invokes engine.evaluate() in dispatch mode, marks consumed_at on success.
// Single-row errors leave consumed_at NULL (retried next tick).

import { evaluate } from "./engine.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

// M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14): entity-aware payload
// shaping for the queue consumer. Producer triggers per entity:
//   attendee → payload={event_id, lead_id};      entity_id = attendee id
//   lead     → payload={phone, source};          entity_id = lead id
//   event    → payload={event_date, event_name}; entity_id = event id
// Returns null for an unknown entity_type so the consumer treats it as poison-
// pill skip (same as unregistered entity_type).
type QueueRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  old_status: string | null;
  new_status: string;
  payload: Record<string, unknown> | null;
  // M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 3: when populated, this SCE was
  // caused by a rule's post_action. Passed to evaluate() as triggerData._origin_rule_id
  // so engine can filter out the originating rule (architectural self-loop guard).
  originated_by_rule_id: string | null;
};

function buildTriggerDataForEntity(e: QueueRow): Record<string, unknown> | null {
  const payload = (e.payload && typeof e.payload === "object") ? e.payload : {};
  const base = {
    oldStatus: e.old_status,
    newStatus: e.new_status,
    status: e.new_status,
    // Layer 3 self-loop guard signal — engine.ts filters rules by this.
    _origin_rule_id: e.originated_by_rule_id,
  };
  if (e.entity_type === "attendee") {
    return {
      ...base,
      attendeeId: e.entity_id,
      leadId: typeof payload.lead_id === "string" ? payload.lead_id : null,
      eventId: typeof payload.event_id === "string" ? payload.event_id : null,
    };
  }
  if (e.entity_type === "lead") {
    return {
      ...base,
      leadId: e.entity_id,
      eventId: null,
      attendeeId: null,
      phone: typeof payload.phone === "string" ? payload.phone : null,
      source: typeof payload.source === "string" ? payload.source : null,
    };
  }
  if (e.entity_type === "event") {
    return {
      ...base,
      eventId: e.entity_id,
      leadId: null,
      attendeeId: null,
      eventDate: typeof payload.event_date === "string" ? payload.event_date : null,
      eventName: typeof payload.event_name === "string" ? payload.event_name : null,
    };
  }
  return null;
}

export async function consumeStatusChangeEvents(
  db: Db,
  tenantId: string,
  limit: number,
  anonKey: string,
  sendMessageUrl: string,
): Promise<{ processed: number; evaluated: number; errors: number }> {
  const cap = Math.min(Math.max(limit || 100, 1), 500);

  const claimRes = await db.from("crm_status_change_events")
    .select("id, entity_type, entity_id, old_status, new_status, payload, originated_by_rule_id")
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
    const e = ev as QueueRow;
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
      const triggerData = buildTriggerDataForEntity(e);
      if (!triggerData) {
        await db.from("crm_status_change_events")
          .update({ consumed_at: new Date().toISOString() })
          .eq("id", e.id).eq("tenant_id", tenantId);
        processed++;
        continue;
      }
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
