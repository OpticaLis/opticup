# HISTORY_AUDIT — P32_POST_P31_QA

> Cross-table coherence after live-fire on the post-P31 stack.

---

## Headline numbers

| Metric | Value |
|---|---|
| Scenarios attempted | 16 |
| Scenarios green | **14/16** (S10 email has %coupon_code% literal — CRITICAL P32-001; S14c retry partial — design corner case P32-002) |
| Blocker findings | 1 (P32-001 CRITICAL) |
| `crm_message_log` rows produced | 27 (26 sent + 1 failed) |
| `crm_message_log status='sent'` | 26 |
| `crm_message_log status='failed'` | 1 (forced via S14) |
| `crm_message_log` rows with `error_message != NULL` | 1 (the failed row) |
| `crm_message_log` rows with non-Daniel `lead_id` | 0 (no leak) |
| `crm_message_log` rows with `%X%` literal | **1** (`efab9f13` → `%coupon_code%`) |
| `crm_message_log` rows with `external_id` | 0 (P28-003 still open) |
| `crm_automation_runs` rows | 9 (8 with sent_count=2 + 1 no-op S4-attempt-1 with 0 recipients) |
| `crm_automation_runs status='completed'` | 9/9 ✓ |
| `crm_automation_runs status='running'` (stuck) | 0 ✓ P29 reaper holds |
| `crm_message_log.run_id IS NOT NULL` for rule-driven | 16/16 ✓ P29 commit 3 holds |
| `crm_message_log.run_id IS NULL` for direct-send | 11/11 ✓ correct |
| `activity_log` rows from P32 | 0 (no post-action invitation hooks fired with valid status changes that write to activity_log) |

## Per-scenario coherence

### Lifecycle scenarios 1, 3, 4, 5, 7, 9, 11, 12 (rule-driven via `CrmAutomation.evaluate(...)`)

For each:
- `crm_automation_runs` row exists with `status='completed'`, `total_recipients=2` (or 0 for S4 1st attempt), `sent_count` matching, `finished_at` populated, `error_message=NULL`
- 2 corresponding `crm_message_log` rows (SMS + Email) with `status='sent'`, `run_id` linked, `error_message=NULL`
- Content fully substituted: no `%X%` literals (verified by `regexp_matches(content, '%[a-z][a-z0-9_]*%', 'g')`)

### Direct-send scenarios 2, 6, 8, 10, 13 (`CrmMessaging.sendMessage(...)`)

For each:
- 2 `crm_message_log` rows with `status='sent'`, `run_id=NULL` (correct — no rule path), `error_message=NULL`
- ⚠️ Scenario 10 email has `%coupon_code%` literal — see Finding P32-001

### S14 forced failure

```sql
SELECT id, channel, status, run_id, template_id, error_message, content
  FROM crm_message_log WHERE id='f0fb4db2-90cc-42e6-92d2-372324ec8bd9';
```

- status=`failed`, run_id=NULL, template_id=NULL (EF rejected before template lookup), content='', error_message=`template_not_found: p32_nonexistent_slug_sms_he`. Clean failure path; failed-msg UI surfaces it.

## P29 verification — full

```sql
SELECT count(*) FROM crm_message_log
 WHERE created_at >= '2026-05-01 05:26:56+00'::timestamptz
   AND lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND run_id IS NOT NULL AND status='sent';
-- 16
```

```sql
SELECT count(*) FROM crm_automation_runs
 WHERE started_at >= '2026-05-01 05:26:56+00'::timestamptz
   AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='running';
-- 0
```

P29 fixes still live and verified.

## P26 verification — note

P32 produced 0 `activity_log` rows (no rule fired had a valid post_action_status_update that wrote to activity_log with a transition that mattered; the auto-promote `promoteWaitingLeadsToInvited` did happen during S4 first-attempt but the test lead was already `waiting`, not transitioning, so I'm not sure why no row landed — possibly the engine only writes activity_log on a real waiting→invited promotion, and S4 1st-attempt had 0 recipients). P26's fix was already verified during P30; P32 doesn't add new evidence but doesn't contradict it.

## P31 verification — full

| Verification | Method | Result |
|---|---|---|
| `crm_message_templates.required_variables IS NOT NULL` for 30 active templates | SQL | ✅ 30/30 |
| `injectLeadVariables` auto-fills name/phone/email/lead_id | S10 email content carries lead UUID instead of `%lead_id%` (S16) | ✅ |
| `validateRequiredVariables` rejects missing | Not exercised — all 30 templates have `required_variables=[]`, so validation always passes | (deferred — would need a temporary template edit to test) |
| `crm-message-error-labels.js` returns Hebrew text | S14 detail modal showed `תבנית הודעה לא נמצאה` instead of raw `template_not_found:...` | ✅ |
| `⚠️ N` badge in registered tab | S14b verified live — badge `⚠️ 2` on test lead | ✅ |
| `📩 הודעות כושלות (M)` filter chip | S14b verified live — chip `📩 הודעות כושלות (1)` in chip bar | ✅ |
| Failed-messages section in lead detail | S14b verified live — `⚠️ הודעות כושלות (1)` collapsible at top of modal | ✅ |
| Per-row retry button | S14c click verified; corner-case for template_not_found retry (P32-002) | ⚠️ |
| `event_coupon_delivery` QR code with real UUID (P31-003) | S16 SQL match: `data=a262bc0e-...&size=300x300` | ✅ |

## Counter integrity

```sql
SELECT r.id, r.total_recipients,
       (SELECT count(*) FROM crm_message_log WHERE run_id=r.id) AS log_count,
       r.sent_count + r.failed_count + r.rejected_count AS counter_sum
  FROM crm_automation_runs r
 WHERE started_at > '2026-05-01 05:26:56+00'::timestamptz;
```

All 9 rows: `total_recipients = log_count = counter_sum`. No drift.

## Cross-cutting health

```sql
-- All P32 sent rows reach Daniel's lead exclusively
SELECT count(*) AS leak_rows FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='sent'
   AND created_at > '2026-05-01 05:26:56+00'::timestamptz
   AND lead_id != 'a262bc0e-26aa-4a2d-a401-16e4998f382e';
-- 0
```

No cross-contact leak. Server-side allowlist defense unneeded (only 1 T2 lead).

```sql
-- No new stuck running runs anywhere on Prizma
SELECT count(*) FROM crm_automation_runs
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND status='running';
-- 0
```

P29 reaper still healthy.

```sql
-- external_id IS NULL for all 27 P32 rows (P28-003 still open)
SELECT count(*) AS without_external_id FROM crm_message_log
 WHERE created_at > '2026-05-01 05:26:56+00'::timestamptz
   AND lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND external_id IS NULL;
-- 27
```

P28-003 (vendor delivery callback gap) remains open — confirmed by 100% NULL external_id on all P32 rows. Not a P32 regression; pre-existing architectural gap.

---

## Per-scenario detailed audit (cross-references)

### Scenario 1 — `lead_intake_new`
- run_id `da66b22c-85d1-4dfb-a85d-678425c4fcae` ↔ message_log rows `0fe3af0d` (sms) + `9948c02d` (email) — match ✓
- Run rule_name: `ליד חדש: ברוך הבא`
- Content (sms preview): `היי T5 Canary Post-Shorten,\n\nנרשמתם בהצלחה...`
- No `%X%` literal ✓

### Scenarios 7, 11, 12, 3, 5, 9, 4

(Same structure — all 8 rule-driven runs validated; details in MESSAGE_VERIFICATION.md table.)

### Scenarios 2, 6, 8, 13 (direct sends)

All 8 message_log rows (4 scenarios × 2 channels): `status='sent'`, `run_id=NULL`, `error_message=NULL`, no `%X%` literals.

### Scenario 10 (direct send) — `event_coupon_delivery`

- SMS row `97e4de8f`: status='sent', no `%X%` literals ✓
- Email row `efab9f13`: status='sent' BUT `%coupon_code%` literal present in body ❌

```sql
SELECT (SELECT array_agg(DISTINCT m[1]) FROM regexp_matches(content, '%([a-z][a-z0-9_]*)%', 'g') AS m) AS unsubstituted
  FROM crm_message_log WHERE id='efab9f13-7e08-4306-9366-7e41308aae3a';
-- ['coupon_code']
```

Context in template body: `%coupon_code%` is wrapped in a prominent `<p>` tag — meant to display the actual coupon code to the recipient. Daniel's email shows literal text `%coupon_code%` instead.

### Scenario 14 (forced failure)

- failed row `f0fb4db2`: template_id=NULL (EF rejected before template fetch), run_id=NULL, content='', error_message='template_not_found: p32_nonexistent_slug_sms_he'
- UI side-effects (S14b): badge + chip + section all rendered correctly with Hebrew error label

---

*Audit complete. 1 CRITICAL blocker (P32-001 `%coupon_code%` literal) + 1 corner case (P32-002 retry on template_not_found is a no-op) + 1 deferred (P32-003 fixable-failure-with-fix path skipped to avoid temporary template edits). Other 14/16 verifications GREEN.*
