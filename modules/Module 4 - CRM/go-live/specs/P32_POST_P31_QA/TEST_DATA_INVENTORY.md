# TEST_DATA_INVENTORY — P32_POST_P31_QA

> Every Prizma row created or modified during the live-fire run.

---

## Rows created (NEW)

### `crm_message_log` — 27 rows

26 successful (13 templates × 2 channels) + 1 forced failure (S14). All rows: `tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'`, `lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'`. Full ID list in MESSAGE_VERIFICATION.md.

**Restore policy:** preserve as audit. Do NOT delete.

### `crm_automation_runs` — 9 rows

| run_id | rule_name | sent_count | log_rows |
|---|---|---|---|
| da66b22c | ליד חדש: ברוך הבא | 2 | 2 |
| aeb2fe02 | הרשמה: אישור הרשמה | 2 | 2 |
| 67da8ec9 | (registration_open + invite_waiting_list — no recipients) | 0 | 0 |
| 4362e37a | העברת משתתף ידנית - לא שילם | 2 | 2 |
| d3ae326e | העברת משתתף ידנית - שילם | 2 | 2 |
| 6ed3ed5e | שינוי סטטוס: ייפתח מחר | 2 | 2 |
| 5b1ea4c4 | שינוי סטטוס: הזמנה חדשה | 2 | 2 |
| 7d108cbb | הרשמה: אישור רשימת המתנה | 2 | 2 |
| 17dbcaef | (registration_open re-fire) | 2 | 2 |

All `status='completed'`. Preserve.

### `activity_log` — 0 P32-introduced rows

(P32's automation_engine paths didn't produce activity_log rows — same observation as P30.)

## Rows modified (UPDATE)

### `crm_leads` — 1 row, status field

`id='a262bc0e-26aa-4a2d-a401-16e4998f382e'`:

| time (UTC) | by | status | reason |
|---|---|---|---|
| pre-P32 | — | `confirmed` | original |
| 05:28:33 | P32 manual UPDATE | `waiting` | flip required to match rule 8b2edc76's `recipient_status_filter=["waiting"]` |
| (during S4 batch) | engine `promoteWaitingLeadsToInvited` post-action | `invited` | side-effect of registration_open dispatch |
| 05:31:01 | P32 manual UPDATE | `waiting` | re-flip to fire S4 with valid audience |
| 05:31:09 | engine post-action | `invited` | side-effect of S4 retry |
| 05:32:42 (end of P32) | P32 manual UPDATE | `confirmed` | restored to original state |

**Restore SQL (executed at end of P32):**

```sql
UPDATE crm_leads SET status='confirmed'
 WHERE id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
```

Verified at end-of-P32: `status='confirmed'`. ✓

## Cross-tenant impact

None. Demo tenant untouched.

## Restore SQL

```sql
-- Already done at end-of-P32 — repeat is idempotent
UPDATE crm_leads SET status='confirmed'
 WHERE id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Audit rows (37 total: 27 message_log + 9 automation_runs + 1 historical activity_log
-- pattern unchanged) are intentionally preserved as evidence. DO NOT delete.
```

## What was NOT touched

- No `crm_events` rows created or modified
- No `crm_event_attendees` rows created or modified
- No `crm_message_templates` rows touched (no temporary edits)
- No `crm_automation_rules` rows touched
- No DB schema changes
- No code changes (no commits during P32)
- No deletions of any kind

---

*Inventory complete. Test lead is back to `confirmed`. All 36 P32 audit rows (27 message_log + 9 automation_runs) preserved.*
