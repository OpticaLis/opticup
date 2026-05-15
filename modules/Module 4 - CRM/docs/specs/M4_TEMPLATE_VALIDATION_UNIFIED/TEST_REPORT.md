# TEST_REPORT — M4_TEMPLATE_VALIDATION_UNIFIED

> **Run by:** opticup-executor (Tier A SPEC requires Tier A smoke gate; the
> brief pre-authorizes the executor to run the project's `tests/smoke/baseline.test.mjs`
> in lieu of an independent opticup-localhost-tester pass when running in
> Overnight Bundle Tier A.1 Full-Auto Pipeline mode).
> **Tenant:** demo (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`).
> **Date:** 2026-05-14.

---

## Pre-deploy smoke (criterion 15 of SPEC §3)

Command: `node tests/smoke/baseline.test.mjs`
Run timestamp: pre-Commit 1 deploy.

```
opticup baseline smoke — 7 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (1020ms)
  PASS  2. Create CRM lead succeeds (M4)  (206ms)
  PASS  3. Read inventory count for demo tenant (M1)  (199ms)
  PASS  4. Storefront homepage returns 200  (1719ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (975ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (187ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1609ms)

7/7 passed, 0 failed
```

**Result: 7/7 PASS pre-deploy** — gating proceed to commits 1-3.

## Post-deploy smoke (criterion 16 of SPEC §3)

Command: `node tests/smoke/baseline.test.mjs`
Run timestamp: after Commit 3 (`60216d6`) — both EF deploys live (`send-message v26`, `automation-engine v16`).

```
opticup baseline smoke — 7 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (809ms)
  PASS  2. Create CRM lead succeeds (M4)  (166ms)
  PASS  3. Read inventory count for demo tenant (M1)  (150ms)
  PASS  4. Storefront homepage returns 200  (1665ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (896ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (128ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1095ms)

7/7 passed, 0 failed
```

**Result: 7/7 PASS post-deploy** — SPEC closes 🟢 on the smoke gate.

## Integration-test SQL evidence (criteria 10 + 11)

Captured verbatim during execution. See `EXECUTION_REPORT.md §2` rows 16-19
for full chronology + cleanup confirmation.

### §3.2 — broken-template integration test

EF response from POST to `/functions/v1/automation-engine` with the doomed
template's rule active:

```json
{"run_id":"08680f75-9903-4c87-aaec-658795542a52","fired":2,"sent":0,"failed":0,"rejected":0,"queued":2,"skipped":0,"validation_failures":1}
```

The `queued:2` count comes from a DIFFERENT pre-existing demo rule
(`lead_intake_new` template) — the broken-template rule contributed 0 queue
rows. `validation_failures:1` confirms the pre-enqueue gate fired once.

DB state immediately after the EF call:

```
crm_message_queue WHERE run_id=<this>:
  2 rows, template_slug='lead_intake_new'  (pre-existing rule — not ours)
  0 rows, template_slug='m4_template_validation_test'  (OUR rule — gated)

crm_message_log WHERE run_id=<this>:
  1 row:
    lead_id=152e6188...
    channel='sms'
    status='rejected'
    error_message='unsubstituted_placeholder: another_missing,nonexistent_var'
    content='שלום דניאל טסט! משהו על %nonexistent_var% ו-%another_missing%.'

crm_automation_rules WHERE id=<test rule>:
  name='M4_VALIDATION_TEST'
  last_error='unsubstituted_placeholder: another_missing,nonexistent_var (slug=m4_template_validation_test)'
  is_active=true   ← rule NOT auto-disabled (Daniel's directive)
```

### §3.3 — clean-template regression

After UPDATE of the test template body to `'שלום %name%! בדיקה תקינה.'` (only
auto-injected `%name%`):

```json
{"run_id":"b7f610d2-4792-4249-b60e-b1ba4a1996af","fired":2,"sent":0,"failed":0,"rejected":0,"queued":3,"skipped":0,"validation_failures":0}
```

`queued:3` = 2 from the pre-existing rule + 1 from OUR (now-clean) test rule.
`validation_failures:0` confirms the gate let our send-message item through.

DB state:

```
crm_message_queue WHERE run_id=<this>:
  Our rule's row IS present, template_slug='m4_template_validation_test'.

crm_automation_rules WHERE id=<test rule>:
  last_error=NULL   ← recovery flow worked; operator-fix clears the surface.
  is_active=true
```

### Cleanup confirmation (criterion 12 — Prizma read-only invariant)

```
crm_message_queue tenant=demo:   15 (post-cleanup) == 15 (BASE_DEMO_QUEUE_ROWS, baseline)
crm_message_queue tenant=prizma: 3463 (post-cleanup) == 3463 (BASE_PRIZMA_QUEUE_ROWS)
md5(string_agg(... ORDER BY id)) WHERE tenant=prizma:
  41948281c4b8122f4511e98e70d8673a (post-cleanup)
  == 41948281c4b8122f4511e98e70d8673a (BASE_PRIZMA_RULES_HASH, baseline)
```

All baseline invariants intact. Prizma READ-ONLY honored.

---

## Smoke gate verdict

🟢 **7/7 PASS pre-deploy AND 7/7 PASS post-deploy.**

SPEC is closed at the smoke layer. No findings escalated to Foreman by
Localhost-Tester scope.

*End of TEST_REPORT.md — M4_TEMPLATE_VALIDATION_UNIFIED.*
