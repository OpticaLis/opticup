# TEST_DATA_INVENTORY — P30_FULL_LIFECYCLE_MESSAGING_AUDIT

> Every Prizma row created or modified during the live-fire run, with restore SQL.

---

## Rows created (NEW)

### `crm_message_log` — 26 rows (13 SMS + 13 Email)

All rows: `tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'`, `lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'`, `status='sent'`, `error_message=NULL`. Full ID list in MESSAGE_VERIFICATION.md.

```sql
-- Restore (IF NEEDED — these are audit rows; soft-delete only)
SELECT count(*) FROM crm_message_log
 WHERE id IN (...26 ids...);  -- expected: 26
```

**Restore policy:** these are real audit rows that document the actual dispatch events. **Do not delete.** They are the verification evidence for Daniel.

### `crm_automation_runs` — 9 rows

| run_id | rule_name | sent_count | log_rows |
|---|---|---|---|
| f7abb085 | ליד חדש: ברוך הבא | 2 | 2 |
| aebdd4c6 | הרשמה: אישור הרשמה | 2 | 2 |
| 3c1a6687 | (no-op — 0 recipients before lead-status flip) | 0 | 0 |
| e41d2eec | (registration_open + invite_waiting_list) | 2 | 2 |
| 8c90cb71 | העברת משתתף ידנית - לא שילם | 2 | 2 |
| bd07b63d | העברת משתתף ידנית - שילם | 2 | 2 |
| 01e2c00b | שינוי סטטוס: ייפתח מחר | 2 | 2 |
| a9083361 | שינוי סטטוס: הזמנה חדשה | 2 | 2 |
| 2c862d6d | הרשמה: אישור רשימת המתנה | 2 | 2 |

All `status='completed'`. **Do not delete.**

### `activity_log` — 1 row

`id=d2d1eda1-6f6a-4c29-b49f-cff8d281ec5b`, action=`crm.lead.status_change`, source=`automation_invite`. Auto-emitted by `promoteWaitingLeadsToInvited` hook during S4 dispatch.

**Do not delete.**

## Rows modified (UPDATE)

### `crm_leads` — 1 row, status field

`id='a262bc0e-26aa-4a2d-a401-16e4998f382e'`:

| time (UTC) | by | status | reason |
|---|---|---|---|
| pre-P30 | — | `confirmed` | original |
| 09:51:54 | P30 manual UPDATE | `waiting` | flip required to match rule 8b2edc76's `recipient_status_filter=["waiting"]` so S4 audience would match |
| 09:52:16 | engine post-action `promoteWaitingLeadsToInvited` | `invited` | side-effect of S4 dispatch (engine auto-promotes waiting→invited after invitation rules) |
| 09:57 (end of P30) | P30 manual UPDATE | `confirmed` | restored to original state |

**Restore SQL (already executed at end of P30):**

```sql
UPDATE crm_leads SET status='confirmed'
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND status IN ('waiting','invited');
```

Verification (current state):

```sql
SELECT id, status FROM crm_leads
 WHERE id='a262bc0e-26aa-4a2d-a401-16e4998f382e';
-- expected: status='confirmed'
```

Confirmed at end-of-P30: `status='confirmed'`. ✓

## Cross-tenant impact

None. P30 only touched Prizma tenant rows. Demo tenant untouched.

## Reaper interactions

The dispatch-queue EF reaper (P29 commit 5, deployed by Daniel via CLI) ran every minute during P30. Each tick scanned for `crm_automation_runs` with `status='running' AND finished_at IS NULL AND updated_at <= now() - 1h`. Zero matches throughout P30 (every modal was approved within seconds — no abandonment). The reaper's no-op behavior is itself a verification: it ran without false positives.

## What was NOT touched

- No `crm_events` rows created or modified
- No `crm_event_attendees` rows created or modified
- No `crm_message_templates` rows touched
- No `crm_automation_rules` rows touched
- No DB schema changes
- No code changes (no commits during P30)
- No deletions of any kind

## Restore SQL (single-shot)

If for any reason P30 needs to be wound back:

```sql
-- Already done at end-of-P30 — repeat is idempotent
UPDATE crm_leads SET status='confirmed'
 WHERE id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Audit rows (message_log, automation_runs, activity_log) are intentionally
-- preserved as evidence. Do NOT delete. Soft-delete is also unnecessary —
-- they're real audit records that survived a real production smoke run.
```

---

*Inventory complete. Test lead is back to `confirmed`. All 27 audit rows (26 message_log + 1 activity_log) preserved.*
