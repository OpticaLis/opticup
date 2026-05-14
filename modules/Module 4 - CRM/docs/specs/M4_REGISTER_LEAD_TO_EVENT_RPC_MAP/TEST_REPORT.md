# TEST_REPORT — M4_REGISTER_LEAD_TO_EVENT_RPC_MAP

**Date:** 2026-05-14 12:35 UTC
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch `develop`, HEAD `1fa5453`
**Status:** 🟢 **GREEN**

## Servers

| Surface | URL | Result | Latency |
|---|---|---|---|
| ERP | http://localhost:3000/index.html | 200 | 207ms |
| Storefront | http://localhost:4321/ | 200 | 1.24s |

Both servers were already up (no start-local.ps1 invocation needed).

## Baseline (`tests/smoke/baseline.test.mjs`)

**7/7 PASS** on demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb`.

| # | Test | Result | Time |
|---|---|---|---|
| 1 | PIN login returns JWT with `tenant_id=demo` | PASS | 695ms |
| 2 | Create CRM lead succeeds (M4) | PASS | 201ms |
| 3 | Read inventory count for demo tenant (M1) | PASS | 108ms |
| 4 | Storefront homepage returns 200 | PASS | 1253ms |
| 5 | Storefront `/supersale` lead-form page returns 200 | PASS | 847ms |
| 6 | Cross-module: lead from test-2 visible via `crm_leads` SELECT | PASS | 146ms |
| 7 | No 5xx on critical pages (HEAD only) | PASS | 1043ms |

## SPEC-specific (`tests/smoke/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP.test.mjs`)

**n/a — no SPEC-specific tests.** This SPEC is a read-only diagnostic — by design, no code or schema changed and no runtime surface was modified. The baseline 7/7 PASS is the appropriate control for "nothing accidentally regressed."

## Integrity gate

`npm run verify:integrity` → exit 0 (`All clear — 108 files scanned in 4ms (Iron Rule 31 gate)`).

## Failures

None.

## Notes

- Test #2 ("Create CRM lead succeeds") inserts a demo-tenant row and self-cleans at the end of its run; this is the test suite's own controlled write, not a SPEC write. The Executor's zero-write audit (EXECUTION_REPORT §2 criterion 10) closed BEFORE smoke began at 12:25:00+00, capturing the diagnostic-window state correctly.
- No console errors observed in the HEAD-only sweep (v1 baseline does not run full DOM-driven browser checks; v2 with Playwright will). The Reviewer also re-ran smoke independently earlier in the chain — same 7/7 PASS.
- This SPEC modified zero existing files (only created new SPEC-folder artifacts), so a regression in baseline would have been particularly notable. None occurred.

## Hand-off

🟢 GREEN — handing back to Foreman (`opticup-strategic`) for FOREMAN_REVIEW.md closure.

All four pipeline reports written:
- `SPEC.md` (Foreman, commit `93b946f`)
- `EXECUTION_REPORT.md` + `FINDINGS.md` + `RPC_BODY.sql` + `STATE_TRANSITIONS.md` (Executor, commit `1fa5453`)
- `TEST_REPORT.md` (this file)

Next: Foreman writes `FOREMAN_REVIEW.md` with 2+2 skill-improvement proposals.

---

*End of TEST_REPORT.md.*
