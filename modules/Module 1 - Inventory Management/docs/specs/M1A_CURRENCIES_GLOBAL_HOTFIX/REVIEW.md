# REVIEW — M1A_CURRENCIES_GLOBAL_HOTFIX

> **Written by:** opticup-reviewer (Full Auto Pipeline, 2026-05-14)
> **SPEC:** `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/SPEC.md`
> **Commit range reviewed:** `eb1a283..251cca1` (3 work commits, excluding SPEC + Brief auth + interleaved concurrent-session commits)
> **Reviewer scope:** Iron Rules 14 / 15 / 18 / 21 / 31 / 32 + RLS correctness + spot-verification of executor claims against live DB + automated checks.

---

## 1. Iron Rule Compliance

### Rule 14 — tenant_id on every table
✅ **PASS.** `currencies` is now in `scripts/checks/rule-14-tenant-id.mjs` `GLOBAL_SINGLETON_EXEMPT` Set (commit `eb1a283`) as a documented Iron Rule 14 exception, same category as the Phase 1A `vat_rates` global reference table. Independently verified the exemption works selectively: a synthetic migration with `CREATE TABLE currencies (code TEXT PRIMARY KEY); CREATE TABLE rule_14_test_should_fail (id UUID PRIMARY KEY);` produced exactly 1 violation (the test table) and 0 violations on `currencies` — the exempt list is targeted, not a blanket bypass.

### Rule 15 — RLS canonical pattern (or documented exception)
✅ **PASS with documented exception.** The canonical 2-policy pattern (`tenant_isolation` + `service_bypass`) does not apply to `currencies` because it is a GLOBAL reference table with no `tenant_id` column. The new RLS pattern (5 policies: `read_anywhere` + 3 platform-admin-gated writes + `service_bypass`) is the correct shape for this category. Spot-checked all 5 policies in live DB via `pg_policy` query against `public.currencies`:
- `read_anywhere`: SELECT, polroles default (public — anon + authenticated), USING `true`, WITH CHECK null. ✓
- `write_platform_only`: INSERT, polroles default (public), USING null, WITH CHECK `is_platform_super_admin()`. ✓
- `update_platform_only`: UPDATE, polroles default, USING + WITH CHECK both `is_platform_super_admin()`. ✓
- `delete_platform_only`: DELETE, polroles default, USING `is_platform_super_admin()`. ✓
- `service_bypass`: ALL, polroles `{service_role}`, USING `true`. ✓

All 5 policies are PERMISSIVE (correct — RESTRICTIVE would AND with other policies and break the read-anywhere intent). Security analysis: anon role can SELECT (correct for storefront consumption); writes are effectively blocked for tenant users because `is_platform_super_admin()` returns false unless the JWT subject is a registered platform admin (Module 2 function, verified SECURITY DEFINER); service_role bypasses everything as expected. **No data-leak surface introduced.**

The fact that this is a NEW RLS pattern category not yet documented in `CLAUDE.md §4 Iron Rule 15` is logged in `FINDINGS.md` (M1A-FINDINGS-02, MEDIUM) — not a rule violation, but a constitutional doc gap worth closing.

### Rule 18 — UNIQUE includes tenant_id
✅ **PASS.** `currencies` no longer has any UNIQUE constraint that excludes tenant_id (the old `currencies_tenant_id_code_key` UNIQUE was dropped along with the column). The new PRIMARY KEY is on `code` alone, which is **not** caught by rule-18's regex (rule-18 only matches the literal `UNIQUE(...)` keyword, not `PRIMARY KEY`). For a global table this is correct — there's no tenant_id to include in any uniqueness predicate. The 3 seed rows have distinct codes (ILS / USD / EUR) so no collision.

### Rule 21 — No orphans, no duplicates
✅ **PASS.** Cross-Reference Check at SPEC-author time documented 0 collisions: 31 file references to "currencies" all are docs/historical artifacts or the Phase 1A `currency_code TEXT NOT NULL DEFAULT 'ILS'` column (not an FK). 0 incoming FKs in live DB (independently verified). The new RLS policy names (`read_anywhere`, `write_platform_only`, `update_platform_only`, `delete_platform_only`) are first-use project-wide — no name collision with existing policies. The `is_platform_super_admin()` function reference is the unique platform-admin gate from Module 2 (single source of truth).

The `T.CURRENCIES` constant + `decimal_digits` FIELD_MAP entry not being added is **explicitly out of scope** for this SPEC and logged as M1A-FINDINGS-05 (LOW) — defensible.

### Rule 31 — Integrity gate
✅ **PASS.** Every commit in this SPEC's chain passed the integrity gate cleanly (exit 0, 0 violations, 0 warnings across all staged files). Commit `eb1a283`: 3 files clean. Commit `ed3196e`: 2 files clean. Commit `251cca1`: 4 files clean. Cumulative across the SPEC: 9 staged files, 0 integrity issues.

### Rule 32 — Destructive Operations Gate
✅ **PASS.** SPEC §7 (`## 7. Destructive Operations`) lists 8 explicit destructive operations with rationale. The hook's regex `/^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m` matches the heading. The migration SQL containing DROP COLUMN / DROP POLICY / ALTER ... DROP patterns lives in `MIGRATION.md` inside the SPEC folder — a doc-context path matched by `scripts/checks/destructive-ops-declared.mjs` `isDocFile()` regex `/^modules\/[^/]+\/docs\/specs\/[^/]+\/[A-Z][A-Z0-9_-]+\.md$/`. Verified by running `verify.mjs --staged` against Commit 1's staged set: 0 violations despite MIGRATION.md containing 8 DROP patterns. No destructive pattern leaked into a non-doc file at commit time.

### Other Iron Rules (1-13, 16-30)
N/A for this SPEC — no JS code touched, no quantity changes, no PIN flow, no innerHTML usage, no new sequential numbers, no merge to main, no new business-value hardcodes, no contracts crossed.

---

## 2. RLS Spot-Verification (live DB independent of executor's claims)

Independently queried `pg_policy` against `public.currencies` (separate execute_sql round-trip from executor's verification). Results match SPEC §3 success criteria #10-13:

| Policy | Permission | Role | USING | WITH CHECK | Verdict |
|---|---|---|---|---|---|
| read_anywhere | SELECT | public | `true` | — | ✓ Read open to anon + authenticated |
| write_platform_only | INSERT | public | — | `is_platform_super_admin()` | ✓ Writes gated |
| update_platform_only | UPDATE | public | `is_platform_super_admin()` | `is_platform_super_admin()` | ✓ Both directions gated |
| delete_platform_only | DELETE | public | `is_platform_super_admin()` | — | ✓ Deletes gated |
| service_bypass | ALL | service_role | `true` | — | ✓ Service operations unblocked |

Seed data verified:
```
EUR | אירו         | € | 2 | true
ILS | שקל חדש      | ₪ | 2 | true
USD | דולר אמריקאי | $ | 2 | true
```

3 rows, distinct codes, Hebrew names with correct ISO-4217 symbols, all active, all decimal_digits=2.

---

## 3. SPEC Quality Audit

| Dimension | Score 1-5 | Evidence |
|---|---|---|
| Goal clarity | 5 | §1 single sentence, explicit scope, Brief cited (`bb341fb`). |
| Measurability | 5 | 25 criteria; 21 in-executor-scope all verifiable with exact expected values + verify commands. Criterion 17 (deferred path) explicitly authorized by §8 escape clause — not vague. |
| Autonomy envelope | 5 | §4 narrowly scopes Level-3 DDL to `public.currencies` only. Stop-triggers specific. Out-of-scope explicit (§8). |
| Stop-trigger specificity | 5 | §5 lists 6 specific triggers including BASE_CURRENCIES_ROWS≠0, BASE_INCOMING_FKS≠0, is_platform_super_admin absence, Rule 32 firing on any non-doc staged file. None vague. |
| Rollback plan | 5 | §6 has 21-step DOWN SQL (verified syntactically — restores prior shape exactly). ROLLBACK.md written by Executor. |
| Expected final state | 5 | §9 enumerates new/modified files precisely. Phase 1A Author Proposal #1 (live-state probes) applied — §0 baselines table has 7 measured values with runnable commands. |
| Commit plan | 5 | §10 4-commit table matches actual chain bit-for-bit (3 work commits done + 1 retro pending). |
| Lessons incorporated | 5 | §12 lists all 4 Phase 1A FOREMAN proposals with APPLIED markers. Cross-Reference Check (§12 last bullet) documents 0 collisions. |

**Average: 5.0/5.** SPEC is exemplary — every Phase 1A Author Proposal was harvested and applied, baselines are live-measured with runnable commands, Rule 32 boundary handling is novel and well-reasoned, scope is tight.

---

## 4. Execution Quality Audit

| Dimension | Score 1-5 | Evidence |
|---|---|---|
| SPEC adherence | 5 | All 21 in-scope criteria met exactly. Zero questions to dispatcher. The 1 deferred criterion (#17, module db-schema.sql) used SPEC §8 explicit escape path — not a silent absorption. |
| Iron Rule adherence | 5 | Every applicable rule honored end-to-end; spot-checks confirm. |
| Commit hygiene | 4 | 3 conventional-commit messages, single-concern, atomic. -1 for the Commit 1 transient retry caused by concurrent-session interference (logged honestly in EXECUTION_REPORT §4 + FINDINGS M1A-FINDINGS-01). |
| Deviation handling | 5 | The 1 deviation (transient pre-commit failure) was recovered cleanly with re-stage + re-commit, then transparently documented. Zero silent absorptions. |
| Documentation currency | 5 | All 5 SPEC §9 mandatory docs updated. The 1 deferred doc (module db-schema.sql) is explicitly authorized by SPEC §8 and traced to M1A-DEBT-02. |
| FINDINGS discipline | 5 | 5 findings logged with severity, location, reproduce command, suggested next action. No finding orphaned. |
| EXECUTION_REPORT honesty | 5 | Self-rated 9.5/10 with concrete justification per dimension. Improvement proposals are specific (file + section + change) and derive from real pain points in this SPEC (D7 Commit 4 bundling deviation from default protocol, D4 concurrent-session interference). |

**Average: 4.86/5.** Execution quality is excellent. Only deduction is the cosmetic Commit 1 retry; that's a noise-floor issue caused by concurrent-session interleaving, not an executor defect.

---

## 5. Automated Checks

- `npm run verify:integrity` (Iron Rule 31): exit 0, 0 violations, 0 warnings. ✓
- `node scripts/verify.mjs --staged` per commit: 3/3 commits passed cleanly. ✓
- `node scripts/verify.mjs --full` (whole-repo): exit 0 from the hook's perspective; 6131 violations / 165 warnings total across 5615 files are **pre-existing** (consistent with MASTER_ROADMAP §5 documented baseline); none are net-new from this SPEC's 3 work commits (verified by per-commit `--staged` results above). ✓
- Independent rule-14 fixture test: `currencies` exempted correctly; `rule_14_test_should_fail` synthetic table correctly triggers 1 violation. Exemption is selective, not a blanket bypass. ✓
- Independent live-DB queries: all 5 RLS policies present + correct; 3 seed rows present + correct shape. ✓

---

## 6. Findings — Reviewer Independent Assessment

I endorse all 5 findings in the executor's `FINDINGS.md` verbatim — severities and dispositions are sound. One additional reviewer note:

### R1 — (NOTE, not a finding) — RLS `read_anywhere` is intentionally open to anon

Worth highlighting in the FOREMAN_REVIEW as a security-design choice that future reviewers should not flag: the `read_anywhere` policy uses `polroles {-}` (default = public PG role, encompassing both anon and authenticated). This means anon (unauthenticated, e.g. public Storefront pages) CAN read the 3 currency rows. This is INTENTIONAL — ISO-4217 reference data is universal, non-sensitive, and consumed by storefront features that need to display currency symbols. The precedent is `vat_rates.public_view` (same pattern). If a future Sentinel audit flags `currencies` for "anon SELECT permitted", that audit should reference D-M1-16 and dismiss as approved-by-design.

No additional findings beyond the 5 already logged.

---

## 7. Recommendations

### Priority fixes (must do before merge)
**None.** SPEC is ready for Localhost-Tester smoke pass.

### Nice-to-have (defer to follow-up SPECs)
1. **M1A-FINDINGS-02 (MEDIUM):** amend CLAUDE.md §4 Iron Rule 15 to document the global-reference-table RLS pattern alongside the tenant_isolation pattern. Constitution edit → dedicated chat.
2. **M1A-FINDINGS-03 (MEDIUM):** TD-2 resolution SPEC should sweep this hotfix's `MIGRATION.md` retroactively into `supabase/migrations/*.sql` once Rule 32 has a SPEC-declaration-aware bypass (the concurrent SPEC `M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING` that landed in `391b82b` / `1246a37` is the first step toward this).
3. **M1A-FINDINGS-04 (LOW) → M1A-DEBT-02:** module `db-schema.sql` cleanup SPEC should also append this hotfix's delta.
4. **M1A-FINDINGS-05 (LOW):** add `T.CURRENCIES` + `decimal_digits` FIELD_MAP entry when first JS consumer arrives.

---

## 8. Verdict

🟢 **PASS — ready for Localhost-Tester smoke pass.**

All Iron Rules honored. RLS pattern is sound and independently verified. SPEC quality is exemplary (5.0/5). Execution quality is excellent (4.86/5). 5 findings are correctly classified and have clean follow-up paths. The Rule 32 boundary handling (MCP-apply + SPEC-folder MIGRATION.md doc-context) is novel for the project and well-documented; if it generalizes, this SPEC is the canonical reference.

**Awaiting Localhost-Tester smoke (criteria #24, #25 — anon SELECT = 3 rows; anon INSERT denied).**

---

*End of REVIEW.md.*
