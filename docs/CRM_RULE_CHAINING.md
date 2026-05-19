# CRM Rule Chaining — Post-Action Status Updates and the Self-Loop Guard

**Authored by:** `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` SPEC, Layer 3.
**Audience:** Architects and Pipeline executors authoring or modifying M4 automation rules.

---

## What this document covers

How rules in `crm_automation_rules` can chain via the `post_action_status_update` field, what the architectural self-loop guard prevents, and how to test post-action chains without accidentally re-firing the same rule.

This file is the canonical reference for the Layer 3 behavior. Campaign Overseer + Architect skills both read this before touching anything that involves a rule's post-action.

---

## 1. The chain mechanism

A rule's `action_config.post_action_status_update` field, when populated, causes the automation engine to UPDATE all resolved recipient leads' `status` column to the target value AFTER the rule's primary action (`send_message` or `queue_send`) executes.

Example rule:
```json
{
  "name": "Welcome new lead",
  "trigger_entity": "lead",
  "trigger_event": "created",
  "action_type": "send_message",
  "action_config": {
    "template_slug": "lead_welcome",
    "channels": ["sms"],
    "post_action_status_update": "warmed"
  }
}
```

After the welcome SMS is queued, `crm_leads.status` flips from whatever it was to `'warmed'` for the same lead. The UPDATE fires `trg_lead_status_change_event`, which inserts a row into `crm_status_change_events` (SCE) with `entity_type='lead'`, `old_status=<before>`, `new_status='warmed'`. The cron consumer (`automation-engine` EF, mode=`consume_status_events`) picks up that SCE on its next tick.

---

## 2. The self-loop risk

Without an architectural guard, the following scenario would self-perpetuate:

1. Rule X fires on `lead_status_change` with `status_equals='warmed'`.
2. Rule X's `post_action_status_update` sets `lead.status='warmed'`.
3. The UPDATE inserts a new SCE with `new_status='warmed'`.
4. Consumer picks up the SCE → matches rule X → fires again → step 2.

This is a true infinite loop. Even with a sane `status_changed_from` condition, a chain across two rules (A → status1 → B → status2 → A → ...) could still loop if their post-actions cross-reference each other's target status.

---

## 3. The architectural guard (Layer 3)

`crm_status_change_events.originated_by_rule_id uuid` — when populated, this SCE was caused by a rule's post-action. Set by the 3 SCE-producer trigger functions reading `current_setting('m4.originated_by_rule_id', true)`. The setting is populated by the EF's `update_lead_status_with_origin(p_tenant_id, p_lead_ids[], p_new_status, p_origin_rule_id)` RPC, which the EF calls instead of a direct UPDATE inside `executePostActions()`.

The consumer (`consumer.ts`) reads `originated_by_rule_id` from each claimed SCE row and passes it to `evaluate()` as `triggerData._origin_rule_id`. The engine (`engine.ts`) filters out the matching rule from the candidate set:

```typescript
const originRuleId = (typeof triggerData._origin_rule_id === "string" && triggerData._origin_rule_id) ? triggerData._origin_rule_id : null;
const rules = (res.data || [])
  .filter((r) => {
    if (originRuleId && r.id === originRuleId) return false;
    return evaluateCondition(r.trigger_condition, triggerData);
  });
```

Effect: a rule cannot re-fire on a SCE caused by its own post-action.

---

## 4. The 1-hour window

The guard is scoped to **the same rule** firing on **the same SCE that its post-action produced**. Practically, the SCE is consumed on the next cron tick (~30-60s after the post-action), so the guard's window is implicit (the SCE only exists once, and is then `consumed_at != NULL`).

The "1-hour window" framing in the SPEC §2.3 brief is forward-looking: if a future feature allowed an SCE to be retried, the guard should still hold for at least an hour to give the operator time to manually re-test if needed. Today's implementation is binary (skip-this-rule on this SCE), which is stricter than a 1-hour window.

---

## 5. What's still allowed (cross-rule chains)

Rule A's post-action triggers rule B is **OK**. The SCE produced by A's post-action carries `originated_by_rule_id=A`. The engine's filter only excludes rule A on that SCE. Rule B sees the SCE normally.

Example legitimate chain:
- Rule A (`event.status_change → registration_open`): sends invite + `post_action_status_update: invited` on the lead.
- Rule B (`lead.status_change → invited`): sends a follow-up "we'll see you there" message.

After Rule A fires:
- Lead status: `waiting → invited` (A's post-action).
- SCE: `entity_type=lead, new_status=invited, originated_by_rule_id=<A's id>`.
- Consumer picks up SCE → evaluate filters out rule A but rule B remains → rule B fires.

No loop. Just a 2-step pipeline.

---

## 6. Test pattern

To test a post-action chain end-to-end:

1. Pick (or temporarily author) a rule X with `post_action_status_update`.
2. Toggle the trigger that fires X.
3. Within 90 seconds, query:
   ```sql
   SELECT id, originated_by_rule_id, new_status, occurred_at, consumed_at
   FROM crm_status_change_events
   WHERE tenant_id = '<demo>' AND occurred_at > NOW() - INTERVAL '5 minutes'
   ORDER BY occurred_at;
   ```
4. Confirm: the SCE row from X's post-action carries `originated_by_rule_id = <X's id>`.
5. Confirm: NO `crm_automation_runs` row references X for the period after X's post-action SCE was consumed. (Use the `trigger_data->>'_origin_rule_id'` field on the run's trigger_data to detect any rule that mistakenly re-fired on a post-action-derived SCE.)

To test cross-rule chains: same protocol but verify rule B's run DID appear with `trigger_data->>'_origin_rule_id'=<A>` AND rule B's id appeared as the matching rule.

---

## 7. Failure modes the guard does NOT prevent

- **Two rules with `post_action_status_update` targeting each other's trigger.** Rule A flips lead to "X"; rule B (trigger `→ X`) flips lead to "Y"; rule C (trigger `→ Y`) flips lead to "X" again. The guard prevents A from re-firing on its own SCE but does NOT prevent the A→B→C→A→B→C... ping-pong. **This is intentional** — cross-rule chains are a legitimate pattern; cycle detection at the rule-author level (Sentinel Mission 14 or future Mission) is the right enforcement layer, not the engine.
- **Manual operator overrides.** If an operator manually edits `lead.status` outside the EF's `update_lead_status_with_origin` RPC, `m4.originated_by_rule_id` is NULL and the SCE has no origin tag. The next consumer tick may re-fire whatever rule matches. This is correct behavior — operator UPDATEs should re-trigger automation as if it were a fresh state change.

---

## 8. Migration history

| Date | What |
|---|---|
| 2026-05-12 | SCE framework introduced (`STATUS_CHANGE_TRIGGERS_FRAMEWORK`). Attendee-only. No origin tracking. |
| 2026-05-14 | Lead + event extension (`M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION`). Same. |
| 2026-05-19 | Layer 3 `originated_by_rule_id` + `update_lead_status_with_origin` RPC + engine filter (`M4_DUAL_PATH_CLEAN_FIX_2026_05_19`). |

---

*End of CRM_RULE_CHAINING.md.*
