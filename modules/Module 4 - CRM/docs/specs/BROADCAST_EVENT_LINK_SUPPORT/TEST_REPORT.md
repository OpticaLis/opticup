# TEST_REPORT — BROADCAST_EVENT_LINK_SUPPORT

**Date:** 2026-05-13 evening (07:13 UTC / 10:13 IL approx)
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch develop, HEAD `3104792`
**Status:** GREEN

## Servers

- ERP        http://localhost:3000  → 200 in 215ms
- Storefront http://localhost:4321  → 200 in 1658ms

## Baseline (tests/smoke/baseline.test.mjs)

7/7 passed, 0 failed.

| # | Test | Module | Result | Time |
|---|------|--------|--------|------|
| 1 | PIN login returns JWT with tenant_id=demo | M1.5 (auth) | PASS | 742ms |
| 2 | Create CRM lead succeeds (M4) | M4 | PASS | 143ms |
| 3 | Read inventory count for demo tenant (M1) | M1 | PASS | 136ms |
| 4 | Storefront homepage returns 200 | M3 | PASS | 1088ms |
| 5 | Storefront /supersale lead-form page returns 200 | M3 | PASS | 965ms |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | M4 | PASS | 133ms |
| 7 | No 5xx on critical pages (HEAD only) | ERP+M3 | PASS | 991ms |

## SPEC-specific (tests/smoke/{SLUG}.test.mjs)

n/a — no spec-specific tests authored for this SPEC. The SPEC's own E2E
smoke (criteria 9-11 in `EXECUTION_REPORT.md`) covered the
event-link-specific behavior end-to-end (queue → dispatch-queue cron →
send-message EF → crm_message_log → SMS substitution + safety-scan
specificity) on demo tenant. All 3 E2E paths passed at 07:05 UTC; see
EXECUTION_REPORT §2 (criteria 9-11) for actual log contents.

## Failures

None.

## Hand-off

GREEN → handing back to Foreman for FOREMAN_REVIEW.md.
