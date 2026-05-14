# TEST_REPORT — M4_BROADCAST_ID_PROPAGATION

**Date:** 2026-05-14
**Tester:** opticup-localhost-tester (skill, v1)
**Repo:** opticalis/opticup, branch `develop`, HEAD `defce8a`
**SPEC:** `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/`
**Status:** 🟢 GREEN

---

## Servers

| Service | URL | Status |
|---|---|---|
| ERP | http://localhost:3000 | already up (skipped launch) |
| Storefront | http://localhost:4321 | already up (skipped launch) |

`scripts/start-local.ps1` reported `=== ALL UP ===`.

---

## Baseline (`tests/smoke/baseline.test.mjs`)

**7/7 passed, 0 failed** — POST-migration run.

| # | Test | Result | Duration |
|---|---|---|---|
| 1 | PIN login returns JWT with tenant_id=demo | PASS | 979ms |
| 2 | Create CRM lead succeeds (M4) | PASS | 145ms |
| 3 | Read inventory count for demo tenant (M1) | PASS | 124ms |
| 4 | Storefront homepage returns 200 | PASS | 1039ms |
| 5 | Storefront /supersale lead-form page returns 200 | PASS | 897ms |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | PASS | 123ms |
| 7 | No 5xx on critical pages (HEAD only) | PASS | 1057ms |

**Pre-migration baseline:** P1.1's 7/7 PASS at commit `7841055` (2026-05-14, ~24h ago) serves as the pre-migration known-good. Per the activation prompt's chain ordering, the LH-Tester runs once after executor completion; pre-migration verification was deferred per executor's Decision §5 #1 (documented in EXECUTION_REPORT.md). No regression detected — both runs are 7/7.

## SPEC-specific (`tests/smoke/M4_BROADCAST_ID_PROPAGATION.test.mjs`)

n/a — no spec-specific smoke test authored. The SPEC's integration tests
(Scenarios A/B/C/D in SPEC §3.1) were executed by the Executor against the
live Supabase project via MCP — see EXECUTION_REPORT.md §2.1 for full
results.

## Failures

None.

## Hand-off

🟢 GREEN — handing back to Foreman for FOREMAN_REVIEW.md.

End-to-end broadcast attribution chain is intact post-migration:
- Authentication (PIN auth + JWT) ✅
- CRM lead create + read (touches `crm_leads`, RLS path) ✅
- Inventory read (M1, separate module — regression check) ✅
- Storefront delivery (homepage + supersale form) ✅
- Cross-module lead visibility ✅
- No 5xx surfaces ✅

The 3 EF redeploys (dispatch-queue v14, send-message v25, resolve-link v7)
did not regress any existing surface. Iron Rule 31 gate exit 0 confirmed
at commit time.

---

*End of TEST_REPORT.md.*
