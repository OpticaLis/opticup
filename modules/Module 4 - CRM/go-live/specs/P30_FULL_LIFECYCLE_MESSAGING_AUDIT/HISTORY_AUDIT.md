# HISTORY_AUDIT — P30_FULL_LIFECYCLE_MESSAGING_AUDIT

> Cross-table coherence after live-fire. Every assertion measured against actual production rows.

---

## Headline numbers

| Metric | Value |
|---|---|
| Scenarios attempted | 13 |
| Scenarios green | **13/13** |
| Scenarios with blocker | 0 |
| `crm_message_log` rows produced | **26** (13 SMS + 13 Email) |
| `crm_message_log` status='sent' | 26 |
| `crm_message_log` status='failed' | **0** |
| `crm_message_log` status='rejected' | **0** |
| `crm_message_log` rows with `error_message != NULL` | **0** |
| `crm_message_log` rows with non-Daniel `lead_id` (sanity) | **0** |
| `crm_automation_runs` rows produced | **9** (8 with sent_count=2 + 1 with sent_count=0 — no-op run) |
| `crm_automation_runs` status='completed' | **9/9** |
| `crm_automation_runs` status='running' (stuck) | **0** ✓ P29 verified |
| `crm_automation_runs` status='aborted' | 0 |
| `crm_automation_runs` rows with `finished_at IS NULL` | 0 |
| `crm_automation_runs` rows where `total_recipients = sent + failed + rejected` | 9/9 ✓ |
| `crm_message_log.run_id IS NOT NULL` for rule-driven scenarios | **16/16** ✓ P29 fix verified |
| `crm_message_log.run_id IS NULL` for direct-send scenarios | 10/10 ✓ correct (no run) |
| `activity_log` rows from P30 | 1 (auto-promote side-effect from S4) |
| `activity_log` rows with `details={}` | **0** ✓ P26 fix verified |
| `activity_log` rows with `level=NULL` | 0 |
| `activity_log` `entity_type` plural form | ✓ (`crm_leads` — plural) |

## Per-scenario coherence audit

### Scenario 1 — `lead_intake_new` (rule b82a91d8)

```sql
SELECT id, channel, status, run_id, error_message FROM crm_message_log
 WHERE id IN ('ee5ca55c-ef3f-42a1-b34c-a034b9259224','541d923f-b72b-4f59-bdc0-f3e07a8f4725');
```

Both rows: `status='sent'`, `run_id='f7abb085-0f17-435e-95de-b07be94f3bfc'`, `error_message=NULL`.

```sql
SELECT id, status, total_recipients, sent_count, finished_at FROM crm_automation_runs
 WHERE id='f7abb085-0f17-435e-95de-b07be94f3bfc';
```

`status='completed'`, `total_recipients=2`, `sent_count=2`, `finished_at='2026-04-30 09:42:47.37+00'`. ✓

### Scenario 7 — `event_registration_confirmation` (rule b1f607fa)

`run_id='aebdd4c6-e13d-422a-bb8e-f74955b1e68c'` — completed, sent_count=2, both message_log rows linked. ✓

### Scenario 4 — `event_registration_open` (rule 8b2edc76 + d2585fc4)

`run_id='e41d2eec-7a96-4557-aef2-c486af4da995'` — completed, sent_count=2, both message_log rows linked. The merged-rule-name "שינוי סטטוס: נפתחה הרשמה + אירוע פתח להרשמה - הזמנת רשימת המתנה" reflects engine grouping; only rule 8b2edc76's recipient (test lead) actually matched, the other rule had 0 cross_event_active_waitlist matches. ✓

Note: an earlier run `3c1a6687` was created when test lead was `confirmed` (before the lead-status flip to `waiting`), with 0 recipients and `total_recipients=sent_count=0`. Engine still completed cleanly — no stuck-running.

### Scenarios 11 + 12 — `attendee_moved_unpaid` + `attendee_moved_paid`

Runs `8c90cb71` + `bd07b63d`. Both completed. Both 2 sent. Both have message_log rows linked. ✓

### Scenarios 3 + 5 + 9 — event status changes (will_open_tomorrow + invite_new + waiting_list)

Runs `01e2c00b` + `a9083361` + `2c862d6d`. All completed. All 2 sent. All linked. ✓

### Scenarios 8 + 2 + 6 + 13 + 10 — direct-send scenarios

No `crm_automation_runs` row (correct — direct calls don't go through engine). All `crm_message_log` rows status='sent', `run_id=NULL` (correct), error_message=NULL. ✓

## P29 verification — full

The dispatch's success criterion #2 (`crm_message_log.run_id IS NOT NULL` for rule-driven) is verified by:

```sql
SELECT count(*) FROM crm_message_log
 WHERE created_at > '2026-04-30 09:42:00+00'::timestamptz
   AND lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND run_id IS NOT NULL
   AND status='sent';
-- result: 16 (8 runs × 2 channels)
```

The dispatch's success criterion #5 (run completes, NOT stuck running) is verified by:

```sql
SELECT count(*) FROM crm_automation_runs
 WHERE started_at > '2026-04-30 09:42:00+00'::timestamptz
   AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='running';
-- result: 0
```

**P29 fix proven on real production traffic.**

## P26 verification

The single activity_log row produced during P30:

```sql
SELECT id, action, entity_type, level, jsonb_typeof(details), length(details::text), details
  FROM activity_log
 WHERE id='d2d1eda1-6f6a-4c29-b49f-cff8d281ec5b';
```

| field | value |
|---|---|
| action | `crm.lead.status_change` |
| entity_type | `crm_leads` (plural ✓) |
| level | `info` (populated ✓) |
| details | `{"to":"invited","from":"waiting","source":"automation_invite"}` (non-empty ✓, 3 keys, 67 chars) |

This row was emitted by the `promoteWaitingLeadsToInvited` post-action hook in `crm-automation-engine.js`, fired automatically when rule 8b2edc76 (registration_open) dispatched to a lead in `waiting` status. It is the ONLY P30 activity_log row because most P30 paths (CrmAutomation.evaluate-direct + CrmMessaging.sendMessage-direct) do not write to activity_log — only paths that mutate user-visible state do (manual lead create, attendee state change, etc.).

**P26 fix proven on real production traffic.**

## Counter integrity (cross-table reconciliation)

For each rule-driven run:

```sql
SELECT r.id, r.total_recipients,
       (SELECT count(*) FROM crm_message_log WHERE run_id=r.id) AS log_count,
       r.sent_count + r.failed_count + r.rejected_count AS counter_sum
  FROM crm_automation_runs r
 WHERE started_at > '2026-04-30 09:42:00+00'::timestamptz;
```

All 9 rows have `total_recipients = log_count = counter_sum`. No drift.

## Cross-cutting health

```sql
-- All P30 rows reach Daniel's lead exclusively
SELECT count(*) AS leak_rows
  FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='sent'
   AND created_at > '2026-04-30 09:42:00+00'::timestamptz
   AND lead_id != 'a262bc0e-26aa-4a2d-a401-16e4998f382e';
-- result: 0
```

No cross-contact leak. Server-side allowlist defense was not needed (only 1 T2 lead on Prizma) but would have caught any drift.

```sql
-- No new stuck running runs anywhere on Prizma
SELECT count(*) FROM crm_automation_runs
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='running';
-- result: 0
```

Reaper-protected: even if a P30 modal had been abandoned, the EF reaper would have caught it within 1h. None abandoned.

```sql
-- Vendor delivery gap (P28-003) — informational
SELECT count(*) AS with_external_id, count(*) FILTER (WHERE external_id IS NULL) AS without
  FROM crm_message_log
 WHERE created_at > '2026-04-30 09:42:00+00'::timestamptz
   AND lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e';
```

`external_id IS NULL` for all 26 rows. P28-003 (vendor callback gap) remains open — delivery is presumed but not confirmed by the CRM. Daniel's manual cross-check on his phone+email is the actual delivery confirmation.

---

*All 5 P30 success criteria verified. 0 blockers. Ready for Daniel's AM cross-reference.*
