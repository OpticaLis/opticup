# TEST_REPORT — M3_UTM_TRIPLE_LAYER_PERSISTENCE

**Date:** 2026-05-14 14:30 UTC (approx; smoke runs spanned ~14:05 → 14:30)
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch develop, HEAD `7841055`
**Status:** **GREEN**
**Pipeline mode:** Full-Auto

---

## Servers

- ERP        http://localhost:3000  → 200 in 230ms (pre-migration); 200 (post-migration)
- Storefront http://localhost:4321  → 200 in 1911ms (pre-migration); 200 (post-migration)

Both servers already up at session start; no `scripts/start-local.ps1` invocation needed.

---

## Baseline (tests/smoke/baseline.test.mjs) — pre-migration

Tenant: `8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo)

| # | Test | ms | Result |
|---|------|----|--------|
| 1 | PIN login returns JWT with tenant_id=demo | 862 | PASS |
| 2 | Create CRM lead succeeds (M4) | 219 | PASS |
| 3 | Read inventory count for demo tenant (M1) | 206 | PASS |
| 4 | Storefront homepage returns 200 | 1246 | PASS |
| 5 | Storefront /supersale lead-form page returns 200 | 1107 | PASS |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | 204 | PASS |
| 7 | No 5xx on critical pages (HEAD only) | 1115 | PASS |

**7/7 passed, 0 failed.**

Per SPEC §5 stop-trigger #5: pre-migration baseline confirmed clean. Continuing to migration phase.

---

## Baseline (tests/smoke/baseline.test.mjs) — post-migration

Tenant: `8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo)

| # | Test | ms | Result |
|---|------|----|--------|
| 1 | PIN login returns JWT with tenant_id=demo | 856 | PASS |
| 2 | Create CRM lead succeeds (M4) | 135 | PASS |
| 3 | Read inventory count for demo tenant (M1) | 121 | PASS |
| 4 | Storefront homepage returns 200 | 1076 | PASS |
| 5 | Storefront /supersale lead-form page returns 200 | 888 | PASS |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | 145 | PASS |
| 7 | No 5xx on critical pages (HEAD only) | 996 | PASS |

**7/7 passed, 0 failed.**

Post-migration runtime is slightly FASTER than pre-migration on every test (the touchpoint INSERT in test 2 is fire-and-forget — adds no measurable latency to the lead-create operation). No regression.

---

## SPEC-specific (tests/smoke/M3_UTM_TRIPLE_LAYER_PERSISTENCE.test.mjs)

n/a — no SPEC-specific test file exists. The SPEC's integration tests (5 demo scenarios A-E in SPEC §3.1) were executed by the Executor against the live demo tenant + the deployed EFs, NOT as a standalone test file. All 5 scenarios PASS — see EXECUTION_REPORT.md §3 + §2 criterion 15.

---

## Cross-cut verification (additional sanity checks beyond baseline)

These checks are not part of `baseline.test.mjs` v1 but are relevant to P1.1 specifically:

| Check | Expected | Actual | Result |
|---|---|---|---|
| baseline test-2's `crm_leads` INSERT does NOT trigger an unexpected `crm_lead_touchpoints` row | 0 new rows (baseline test-2 doesn't go through lead-intake EF; bypasses touchpoint capture) | 6 demo touchpoints from P1.1 integration scenarios A-E; baseline test-2's lead create is direct table write (RLS-safe), no touchpoint side-effect | PASS |
| `register_lead_to_event` RPC body md5 post-migration | matches Executor's reported `07e1904a315275e88a223eb088e1d30c` | live md5 = `07e1904a315275e88a223eb088e1d30c` | PASS |
| Prizma bit-identical pre/post | 1236 leads / 231 attendees / 0 touchpoints | 1236 / 231 / 0 | PASS |
| Test 5 storefront `/supersale` (the page that routes to `lead-intake` EF) still 200 | 200 | 200 | PASS |

---

## Console errors observed

None observed in either smoke run. The baseline suite uses HEAD-only sweeps and HTTP probes; full DOM console-error counting belongs to v2 (Playwright integration). For v1 the implicit signal is "no 5xx" which baseline test 7 verifies — PASS.

---

## Failures

None.

---

## Hand-off

GREEN → handing back to Foreman (opticup-strategic) for FOREMAN_REVIEW.md.

**SPEC folder state:**
- `SPEC.md` ✅ (Foreman, commit `8f1cae7`)
- `EXECUTION_REPORT.md` ✅ (Executor, commit `7841055`)
- `FINDINGS.md` ✅ (Executor, commit `7841055`)
- `ROLLBACK.md` ✅ (Executor, commit `7841055`)
- `TEST_REPORT.md` ✅ (this commit)
- `FOREMAN_REVIEW.md` ⏳ pending Foreman closure

**Smoke discipline:**
- Pre-migration smoke 7/7 PASS (SPEC §5 stop-trigger #5 cleared before migration applied)
- Post-migration smoke 7/7 PASS (SPEC §3 criterion 16 satisfied for both gates)

---

*End of TEST_REPORT.md.*
