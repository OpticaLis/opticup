# Per-Rule Validation — `attendee.status_change` (status='attended') — "צ'ק אין לאירוע" (CHECK-IN)

**Rule ID:** `b2a21d96-b7bd-43c4-a02b-496dab6ec74e` | **Tier:** D (server-side path, NO v2 modal) | **Status:** ✅ GREEN

**Trigger:** attendee.status_change with status='attended' | **Template:** `check_in_event` | **Channels:** SMS only | **Recipient:** trigger_lead

## Why this rule never opens the v2 modal

The 5 client-side trigger types (`lead_intake`, `lead_status_change`, `event_status_change`, `event_registration`, `attendee_moved`) call `CrmAutomationClient.evaluate()` which opens the v2 modal. `attendee.status_change` is **not** one of them — it is fired by the DB trigger `trg_attendee_status_change_event` which inserts into `crm_status_change_events`. The pg_cron job `consume_status_change_events` (every minute) calls `automation-engine` with `mode='consume_status_events'`, which processes those rows in `dispatch` mode (no preview, no operator confirmation, no v2 modal).

This is by design — see `crm-automation-engine.js:32-37`:
> "Browser code never invokes this trigger type directly; the entry exists so the rule editor can save rules with trigger_event='status_change' and the dispatch lifecycle is exclusively server-side."

## Test setup

1. Inserted attendee row for VALIDATION lead in event #28 with status='confirmed' (no rule fires on this status).
2. UPDATEd attendee.status='attended' + set checked_in_at — DB trigger fired, inserted row in `crm_status_change_events`:
   ```
   id=29661815-..., entity_type=attendee, entity_id=<test_attendee>,
   old_status=confirmed, new_status=attended, consumed_at=NULL, occurred_at=03:15:31Z
   ```
3. Waited for `consume_status_change_events` cron tick (every minute).

## Observed dispatch (server-side path)

After cron consumed the status_change_event:

```sql
SELECT q.*, r.rule_name, r.trigger_type FROM crm_message_queue q
LEFT JOIN crm_automation_runs r ON r.id = q.run_id
WHERE q.template_slug='check_in_event' ORDER BY q.created_at DESC LIMIT 1;
```

| field | value |
|---|---|
| run_id | `28e25719-0ad8-411b-a0c3-5542d245656d` |
| channel | sms (only — rule channels=['sms']) |
| status | sent (drained by dispatch-queue cron at 03:17:01Z, ~1 min after queue insert at 03:16:02Z) |
| template_slug | check_in_event |
| rule_name | "צ'ק אין לאירוע" |
| trigger_type | attendee_status_change |
| processed_at | 03:17:01.899Z |
| error_message | NULL |

## DB chain confirmed end-to-end

```
UPDATE crm_event_attendees SET status='attended'        (03:15:31Z)
  → trg_attendee_status_change_event fires
  → INSERT crm_status_change_events (consumed_at=NULL)  (03:15:31Z)
  → consume_status_change_events cron tick              (03:16:00Z)
  → automation-engine consume_status_events             (03:16:02Z)
  → rule 1 fires, INSERT crm_message_queue (status=queued, log_id=NULL)  (03:16:02Z)
  → dispatch-queue cron tick                            (03:17:00Z)
  → SMS provider 2xx, UPDATE crm_message_queue SET status='sent', processed_at  (03:17:01Z)
```

Total latency from check-in → SMS sent: ~90 seconds. As expected for server-side path.

## Allowlist enforcement

SMS dispatched to VALIDATION lead phone `+972537889878` (whitelisted ✅). `send-message` EF's `phoneAllowed()` gate confirmed the recipient was on `tenants.test_mode_sms_allowlist`.

## Findings

None. Server-side path works correctly end-to-end. No v2 modal involvement (correct by design).
