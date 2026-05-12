# TEST_REPORT — M1_5_FULL_AUTO_TEST_2_CODE_CHANGE

> **Tested by:** opticup-localhost-tester (role fulfilled by opticup-executor in-line per bootstrap exception — see parent SPEC's FOREMAN_REVIEW)
> **Tested on:** 2026-05-11
> **Pipeline mode:** full-auto, single-session run
> **Test tenant:** demo (8d8cfa7e-ef58-49af-9702-a862d459cccb)

## Verdict

**7/7 PASS — GREEN.**

## Smoke run

Command: `npm run smoke` (which runs `node tests/smoke/baseline.test.mjs`).

Servers verified up via `powershell -File scripts/start-local.ps1`:
- ERP: http://localhost:3000  ✅
- Storefront: http://localhost:4321  ✅

### Test-by-test result (after the JSDoc code change)

| # | Test | Result | Time |
|---|------|--------|------|
| 1 | PIN login returns JWT with tenant_id=demo | PASS | 1360ms |
| 2 | Create CRM lead succeeds (M4) | PASS | 115ms |
| 3 | Read inventory count for demo tenant (M1) | PASS | 125ms |
| 4 | Storefront homepage returns 200 | PASS | 1134ms |
| 5 | Storefront /supersale lead-form page returns 200 | PASS | 1011ms |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | PASS | 127ms |
| 7 | No 5xx on critical pages (HEAD only) | PASS | 1303ms |

**7/7 passed, 0 failed.**

## Baseline comparison

Baseline (before the JSDoc edit) was also `7/7 passed, 0 failed`. Test names, counts, and timings are within ±20% of baseline — no regression.

## Cleanup

The smoke test seeds and deletes its own CRM lead in test 2 + verifies it via SELECT in test 6. Cleanup is internal to the test suite. No manual cleanup performed by Tester.

## Verdict ratification

🟢 The JSDoc change is safe to land. No behavior change. No baseline regression.
