# ROLLBACK_SQL — STATUS_CHANGE_TRIGGERS_FRAMEWORK

> **Authored by:** opticup-executor — 2026-05-12
> **Use:** If this SPEC is REOPENED, run these statements in order to restore
> the pre-SPEC DB + code state. Code state is reverted via the git tag
> `pre-status-change-framework-2026-05-12` (annotated tag pointing at
> `b2fb0c0`).

---

## 1. Pre-state literal JSON snapshots (criterion 16 — DEMO_PARITY_REPLICATION Author Proposal #2)

### Demo target rule pre-state
```json
{
  "id": "b2a21d96-b7bd-43c4-a02b-496dab6ec74e",
  "name": "צ'ק אין לאירוע",
  "is_active": true,
  "tenant_id": "8d8cfa7e-ef58-49af-9702-a862d459cccb",
  "created_at": "2026-05-12T15:44:39.293469+00:00",
  "sort_order": 0,
  "action_type": "send_message",
  "action_config": {
    "channels": ["sms"],
    "template_slug": "check_in_event",
    "recipient_type": "trigger_lead"
  },
  "trigger_event": "created",
  "trigger_entity": "attendee",
  "trigger_condition": {"type": "status_equals", "status": "attended"}
}
```

### Prizma target rule pre-state
```json
{
  "id": "a9483a90-48b1-40ff-a6b2-cee157d72485",
  "name": "צ'ק אין לאירוע",
  "is_active": true,
  "tenant_id": "6ad0781b-37f0-47a9-92e3-be9ed1477e1c",
  "created_at": "2026-05-12T15:40:09.081582+00:00",
  "sort_order": 0,
  "action_type": "send_message",
  "action_config": {
    "channels": ["sms"],
    "template_slug": "check_in_attendee",
    "recipient_type": "trigger_lead"
  },
  "trigger_event": "created",
  "trigger_entity": "attendee",
  "trigger_condition": {"type": "status_equals", "status": "attended"}
}
```

---

## 2. SQL rollback — rule UPDATE reversal (run first if rolling back partially)

```sql
-- Demo
UPDATE crm_automation_rules
   SET trigger_event = 'created'
 WHERE id = 'b2a21d96-b7bd-43c4-a02b-496dab6ec74e'
   AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND trigger_entity = 'attendee'
   AND trigger_event = 'status_change';

-- Prizma
UPDATE crm_automation_rules
   SET trigger_event = 'created'
 WHERE id = 'a9483a90-48b1-40ff-a6b2-cee157d72485'
   AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND trigger_entity = 'attendee'
   AND trigger_event = 'status_change';
```

---

## 3. SQL rollback — full DDL drop (only if reverting tables + trigger entirely)

```sql
-- Drop trigger first (depends on function)
DROP TRIGGER IF EXISTS trg_attendee_status_change_event ON crm_event_attendees;
DROP FUNCTION IF EXISTS attendee_status_change_event_fn();

-- Drop tables (cascade removes policies + indexes + constraints)
DROP TABLE IF EXISTS crm_trigger_type_registry CASCADE;
DROP TABLE IF EXISTS crm_status_change_events CASCADE;

-- pg_cron job (added in commit 3 if present)
SELECT cron.unschedule('consume_status_change_events')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'consume_status_change_events');
```

---

## 4. Git rollback

```bash
git fetch origin
git checkout pre-status-change-framework-2026-05-12
git checkout -B develop
git push --force-with-lease origin develop
```

⚠ `--force-with-lease` ONLY on `develop`. Never on `main`. Coordinate with any
other active Claude Code / Cowork sessions before pushing — concurrent commits
will be lost.

---

## 5. Hash invariants (verify rollback completeness)

After rollback:
- `crm_automation_rules` aggregate hash of (id=b2a21d96…, id=a9483a90…) must equal
  the `md5(rule_literal)` of the pre-state JSON snapshots above.
- Prizma non-target hash (16 rules, scoped to attendee/lead/event) MUST equal
  `f6c4fd0f07407e74537e37e1ed6f0527` (this was unchanged through the SPEC; it
  is the canary that no collateral damage occurred).
