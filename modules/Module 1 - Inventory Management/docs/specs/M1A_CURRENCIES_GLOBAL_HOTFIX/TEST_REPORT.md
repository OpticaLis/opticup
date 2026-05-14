# TEST_REPORT — M1A_CURRENCIES_GLOBAL_HOTFIX

**Date:** 2026-05-14
**Tester:** opticup-localhost-tester (skill, Full Auto Pipeline)
**Repo:** opticalis/opticup, branch develop, HEAD `e8ad461`
**Status:** 🟢 **GREEN**

---

## Servers

- ERP        http://localhost:3000  → 200 in 209 ms
- Storefront http://localhost:4321  → 200 in 1636 ms

Both servers healthy. No restart needed.

---

## Baseline (tests/smoke/baseline.test.mjs)

**7 / 7 PASSED.** No regressions in M1 + M4 production paths.

| # | Test | Module | Result | Time |
|---|---|---|---|---|
| 1 | PIN login returns JWT with tenant_id=demo | M1.5 (auth) | ✅ PASS | 985 ms |
| 2 | Create CRM lead succeeds | M4 | ✅ PASS | 139 ms |
| 3 | Read inventory count for demo tenant | M1 | ✅ PASS | 165 ms |
| 4 | Storefront homepage returns 200 | M3 | ✅ PASS | 1284 ms |
| 5 | Storefront /supersale lead-form page returns 200 | M3 | ✅ PASS | 1004 ms |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | M4 (RLS leak check) | ✅ PASS | 162 ms |
| 7 | No 5xx on critical pages (HEAD sweep) | ERP + M3 | ✅ PASS | 970 ms |

Test #2 cleanup verified: created lead deleted before suite exited (RLS-safe).

---

## SPEC-specific tests (SPEC §3 criteria #24 + #25)

**2 / 2 PASSED.** Direct REST API tests using `PUBLIC_SUPABASE_ANON_KEY` against `${SUPABASE_URL}/rest/v1/currencies` — exercises the new global-reference RLS pattern end-to-end.

### Criterion #24 — Anon SELECT returns 3 rows

```bash
curl -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "https://tsxrrxzmdxaenlvocyit.supabase.co/rest/v1/currencies?select=code,name_he,symbol,decimal_digits&order=code"
```

Response (HTTP 200):
```json
[{"code":"EUR","name_he":"אירו","symbol":"€","decimal_digits":2},
 {"code":"ILS","name_he":"שקל חדש","symbol":"₪","decimal_digits":2},
 {"code":"USD","name_he":"דולר אמריקאי","symbol":"$","decimal_digits":2}]
```

**Expected:** 3 rows. **Actual:** 3 rows. ✅ PASS.

Validates: `read_anywhere` RLS policy correctly grants SELECT to the default PG role (encompassing anon). Storefront / public consumers can read currency reference data without authentication. Hebrew names + ISO-4217 symbols render correctly.

### Criterion #25 — Anon INSERT denied by RLS

```bash
curl -X POST -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  "https://tsxrrxzmdxaenlvocyit.supabase.co/rest/v1/currencies" \
  -d '{"code":"XXX","name_he":"test","symbol":"X","decimal_digits":2}'
```

Response (HTTP **401**):
```json
{"code":"42501","details":null,"hint":null,
 "message":"new row violates row-level security policy for table \"currencies\""}
```

**Expected:** RLS denial. **Actual:** Postgres error code `42501` (insufficient_privilege) + explicit RLS-violation message. ✅ PASS.

Validates: `write_platform_only` WITH CHECK `is_platform_super_admin()` correctly blocks anon INSERT. The platform-admin gate is functional and isolates the write surface to Module 2 super-admin contexts only.

---

## Failures

None.

---

## Hand-off

🟢 **GREEN** — handing back to Foreman (opticup-strategic) for FOREMAN_REVIEW.md and the closing `chore(spec): close M1A_CURRENCIES_GLOBAL_HOTFIX with retrospective` commit. All Pipeline retrospective files are now written to the SPEC folder (EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md — 4 of 5; FOREMAN_REVIEW.md pending). Per SPEC §10 commit plan, all 5 files bundle into a single Foreman closing commit.

**SPEC §3 final tally:** 25 of 25 criteria addressed. 22 PASS (criteria 1-16, 18-23 by Executor + Reviewer + 24-25 here), 1 deferred via §8 escape (criterion 17 — module db-schema.sql, M1A-DEBT-02), 2 in-flight (criterion 1 clean tree + criterion 2 commit count both pending Foreman's closing commit).

---

*End of TEST_REPORT.md.*
