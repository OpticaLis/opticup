# HISTORY_AUDIT — P30_FULL_LIFECYCLE_MESSAGING_AUDIT

> Per-scenario cross-table coherence audit. **Empty until live-fire** — see EXECUTION_REPORT.md for the deploy-gap reason.

---

## Audit query template (run after each scenario)

For a scenario whose trigger produced rows after `<dispatched_at>`:

```sql
-- 1. crm_message_log: 2 rows expected (sms + email), both status='sent'
SELECT id, channel, status, run_id, lead_id, error_message, created_at
  FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND created_at > '<dispatched_at>'::timestamptz - interval '1 minute'
 ORDER BY created_at;

-- 2. activity_log: details non-empty, level='info', plural entity_type
SELECT id, action, entity_type, level, details, user_id, created_at
  FROM activity_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND created_at > '<dispatched_at>'::timestamptz - interval '1 minute'
   AND created_at < '<dispatched_at>'::timestamptz + interval '5 minutes'
 ORDER BY created_at;

-- 3. crm_automation_runs: status='completed', total_recipients>0, finished_at populated
SELECT id, rule_name, status, total_recipients, sent_count, failed_count, rejected_count,
       error_message, started_at, finished_at, updated_at
  FROM crm_automation_runs
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND started_at > '<dispatched_at>'::timestamptz - interval '1 minute'
 ORDER BY started_at DESC LIMIT 5;
```

## Pass criteria per scenario

For each rule-driven scenario (1, 3, 4a, 4b, 5, 6, 7, 9, 11, 12):

| Check | Pass condition |
|---|---|
| crm_message_log status | both rows = 'sent' |
| crm_message_log run_id | both rows have run_id matching the run row (REQUIRES P29 commit 3 LIVE) |
| crm_message_log error_message | both NULL |
| activity_log details | non-empty JSON object (REQUIRES P26 fix LIVE — verified live) |
| activity_log level | 'info' |
| activity_log entity_type | plural form (e.g., `crm_event_attendees`, `crm_leads`) |
| crm_automation_runs status | 'completed' (NOT 'running' — REQUIRES CrmConfirmSend approved within reaper window OR P29 reaper to catch — reaper IS LIVE, so even a stuck run gets aborted in 1h) |
| crm_automation_runs counters | total_recipients = sent_count + failed_count + rejected_count |
| crm_automation_runs.finished_at | NOT NULL |

For non-rule scenarios (2, 8, 10, 13):

| Check | Pass condition |
|---|---|
| crm_message_log status | both rows = 'sent' |
| crm_message_log run_id | NULL (expected — no rule) |
| activity_log row | exists for manual UI actions; may not exist for EF-direct paths |

## Per-scenario audit log (filled after live-fire)

### Scenario 1 — `lead_intake_new`
- dispatched_at: —
- crm_message_log rows: —
- activity_log rows: —
- crm_automation_runs row: —
- pass/fail: —

### Scenario 2 — `lead_intake_duplicate`
(skeleton — fill on live-fire)

### Scenarios 3-13
(skeletons — fill on live-fire)

## Cross-cutting health check (run once after all 13 scenarios)

```sql
-- No new stuck running runs
SELECT count(*) FROM crm_automation_runs
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='running'
   AND started_at > '<p30 start>'::timestamptz;
-- expected: 0

-- All P30 message_log rows have correct recipient
SELECT count(*) FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND status='sent'
   AND created_at > '<p30 start>'::timestamptz;
-- expected: ~26-30 (13-15 scenarios × 2 channels)

-- No accidental sends to non-allowlisted phones (sanity)
SELECT count(*) FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='sent'
   AND lead_id != 'a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND created_at > '<p30 start>'::timestamptz;
-- expected: 0 (allowlist server-side filter ensures non-Daniel rows land 'rejected', not 'sent')
```

---

*Empty until live-fire. The query templates above are ready to paste for the next executor or for Daniel.*
