# TEST_REPORT — STATUS_CHANGE_TRIGGERS_FRAMEWORK

**Date:** 2026-05-13 06:15 UTC+3
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch `develop`, HEAD `4073fa1`
**Status:** 🟢 **GREEN**

## Servers

- ERP        `http://localhost:3000`  → 200 in 248ms
- Storefront `http://localhost:4321`  → 200 in 1,834ms

Both servers were already up at session start; no `start-local.ps1` run needed.

## Baseline (`tests/smoke/baseline.test.mjs`)

**7/7 passed, 0 failed.** Total runtime ≈ 5.1 seconds.

| # | Test | Result | Time |
|---|------|--------|------|
| 1 | PIN login returns JWT with tenant_id=demo | ✅ PASS | 949 ms |
| 2 | Create CRM lead succeeds (M4) | ✅ PASS | 200 ms |
| 3 | Read inventory count for demo tenant (M1) | ✅ PASS | 204 ms |
| 4 | Storefront homepage returns 200 | ✅ PASS | 1,337 ms |
| 5 | Storefront `/supersale` lead-form page returns 200 | ✅ PASS | 1,014 ms |
| 6 | Cross-module: lead from test-2 visible via `crm_leads` SELECT | ✅ PASS | 403 ms |
| 7 | No 5xx on critical pages (HEAD only) | ✅ PASS | 1,015 ms |

Test 6 (RLS leak / cross-module visibility) is the most relevant to this SPEC — the M4 changes (new tables + new EF mode + cron consumer + DB trigger on `crm_event_attendees`) didn't break the existing tenant-scoped read path on `crm_leads`. No regression.

Tenant context throughout: demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). No Prizma writes from this test session.

## SPEC-specific tests

n/a — no `tests/smoke/STATUS_CHANGE_TRIGGERS_FRAMEWORK.test.mjs` sibling exists. The framework's E2E was proven directly on the live demo tenant during Phase 5 of the Executor work (criterion 18 + 19 — see `EXECUTION_REPORT.md §3 criteria 18+19` for full timing measurements: 38ms multi-channel parallel delta, 19.8s consumer cron lag).

## Failures

None.

## Hand-off

🟢 GREEN → handing back to Foreman for `FOREMAN_REVIEW.md`. SPEC criterion 25 satisfied.

**Status line:** `✓ Smoke 7/7 PASS (STATUS_CHANGE_TRIGGERS_FRAMEWORK).`
