# TEST_REPORT — M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX

**Date:** 2026-05-14
**Tester:** opticup-localhost-tester (skill)
**Repo:** `opticalis/opticup`, branch `develop`, HEAD `eae7448d43cff224defb82bc0ba0b1235de7ed54`
**Status:** **GREEN**

---

## Servers

- ERP        `http://localhost:3000`  → **200** in **214 ms**
- Storefront `http://localhost:4321`  → **200** in **2029 ms**

Both servers were already running at session start — no `start-local.ps1` invocation needed.

---

## Baseline (`tests/smoke/baseline.test.mjs`)

**7/7 passed, 0 failed.** Demo tenant only (`8d8cfa7e-ef58-49af-9702-a862d459cccb`).

| # | Test | Module | Result | Time |
|---|------|--------|--------|------|
| 1 | PIN login returns JWT with tenant_id=demo | M1.5 (auth) | PASS | 804 ms |
| 2 | Create CRM lead succeeds | M4 | PASS | 123 ms |
| 3 | Read inventory count for demo tenant | M1 | PASS | 115 ms |
| 4 | Storefront homepage returns 200 | M3 | PASS | 1773 ms |
| 5 | Storefront /supersale lead-form page returns 200 | M3 | PASS | 817 ms |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | M4 | PASS | 127 ms |
| 7 | No 5xx on critical pages (HEAD only) | ERP+M3 | PASS | 1035 ms |

Test 2 created and cleaned up its own row (RLS-safe demo lead, full cycle).

---

## Pre-migration smoke (Executor's run, this session)

Same 7-test suite, ran by the Executor before `apply_migration`:

```
7/7 passed, 0 failed
```

**Pre AND post both 7/7 PASS** — Brief §5 criterion 5 satisfied across the migration boundary.

---

## SPEC-specific tests

n/a — no SPEC-specific tests beyond the integration-test SQL block in
`INTEGRATION_TEST.sql` (which was the Executor's deliverable, already proven
PASS twice: by the Executor on the canonical run + by the Reviewer
on an independent re-run with a fresh attendee UUID). The migration's
correctness is anchored in the SQL integration test; no localhost-routed
smoke is needed for the RPC change itself because no client-side code path
changed.

---

## Failures

None.

---

## Observations

- Storefront homepage HEAD took 2029 ms on the initial check and 1773 ms
  inside the test runner — both within normal cold-cache range. No
  regression.
- Test 5 (`/supersale`) responded in 817 ms — also within normal range.
- No 5xx anywhere on the HEAD sweep (test 7).
- Migration `20260514130219 register_lead_to_event_return_shape_fix` is
  visible in `list_migrations` and the new RPC body md5
  (`31fea2eaf0086cf917d0d65a8595d41c`, length 4674) matches what the
  Executor + Reviewer captured.

---

## Hand-off

GREEN → handing back to Foreman (opticup-strategic) for `FOREMAN_REVIEW.md`
closure of `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX`.

---

*End of TEST_REPORT.md.*
