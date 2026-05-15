# REVIEW.md — M1A_OPERATIONS_RPCS_FIX (Reviewer Verification)

**Reviewer:** opticup-reviewer (read-only verification pass)
**Date:** 2026-05-15
**Method:** independent live re-checks against Supabase project `tsxrrxzmdxaenlvocyit` + repo file inspection + EF MCP `get_edge_function` + advisor lint sweep. No file modifications, no DDL, no DML.

## Scope

Re-verify all 25 measurable success criteria from `SPEC.md §3` (23 original + 2 added via Amendment #1/#2) against live state — independent of the Executor's claims in `EXECUTION_REPORT.md §3`.

## Iron Rule Compliance

| Rule | Status | Evidence |
|---|---|---|
| 1 (Quantity via atomic RPC) | ✓ | `record_stock_movement` uses `FOR UPDATE` lock + atomic `qty_remaining = qty_remaining + p_qty_delta` only on consuming movements (Fix #1 branch). |
| 11 (Sequential numbers via atomic RPC) | ✓ | `next_lens_variant_display_id` body still uses `UPDATE … SET last_value = last_value + 1 … RETURNING` — atomic, unchanged. |
| 13 (Views-only for external reads) | ✓ | `v_suppliers_for_m9` ACL REVOKEd from anon/PUBLIC, GRANT SELECT only to authenticated/service_role. Iron Rule 13 contract restored. |
| 14 (tenant_id NOT NULL on every table) | ✓ | No new tables. Existing `pending_lens_advancement_queue` already has `tenant_id UUID NOT NULL` (probe baseline). |
| 15 (Canonical RLS pattern) | ✓ | No RLS policies added or modified by this SPEC. Existing policies on touched tables unchanged. |
| 18 (UNIQUE includes tenant_id — or transitively satisfied) | ✓ with note | New UNIQUE INDEX `pending_lens_advancement_queue_stock_movement_unique` is on `stock_movement_id` only. The FK target `stock_movement.id` is a globally-unique UUID PK and `stock_movement` carries `tenant_id NOT NULL`; tenant-scoping is satisfied transitively via the FK chain. Pre-commit hook fired a FALSE POSITIVE on the documentation comment — executor reworded the comment (a528cf2). No production-side concern. |
| 21 (No orphans / duplicates) | ✓ | Cross-reference sweep documented in SPEC §0; 0 collisions. |
| 22 (Defense-in-depth on writes) | ✓ | `next_lens_variant_display_id` now has in-body JWT-not-null guard (Fix #5) in addition to PostgREST REVOKE. Belt + suspenders pattern. |
| 23 (No secrets in code) | ✓ | `lens-catalog-import` body confirms `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env.get()` — no literals. |
| 31 (Integrity Gate) | ✓ | Pre-commit gate green on every commit (executor showed `npm run verify:integrity → exit 0` 12 times). |
| 32 (Destructive Operations Gate) | ✓ | SPEC §7 declares `None.`. Reviewer spot-checked all 12 commits' diffs — zero DROPs, zero TRUNCATEs, zero `git rm`, zero mass renames, zero `main`-branch ops. CREATE OR REPLACE only. |

## §3 Success Criteria — Reviewer Re-verification

Independent live measurement. Executor claims spot-checked, not trusted.

| # | Criterion | Expected | Reviewer-Measured | Verdict |
|---|---|---|---|---|
| 1 | Branch / clean tree | develop, clean | `git status` clean post-`a528cf2`; pushed to origin | ✓ PASS |
| 2 | Commits | 9–10 | 12 commits (`b0d44c1`..`a528cf2`) — exceeds plan due to 2 Foreman-authorized amendments; deviation documented in SPEC §Amendment-1 + §Amendment-2 | ✓ PASS (within authorized envelope) |
| 3 | Case 1 qty_remaining=5 after `record_stock_movement('receipt', +5)` | 5 (not 10) | TEST_REPORT.md Case 1 + executor commit `cc95157`. Reviewer trust: high (smoke is auditable) | ✓ PASS |
| 4 | `m1_create_receipt_from_box` no 42P10 + DO UPDATE branch fires | success | TEST_REPORT.md Case 2: tls_delta=+3 (DO UPDATE fired); no 42P10 | ✓ PASS |
| 5 | `v_suppliers_for_m9` anon/PUBLIC ACL rows | 0 | Reviewer `aclexplode(v_suppliers_for_m9)` → 0 rows for `anon` or `-` (PUBLIC) | ✓ PASS |
| 6 | 10 SECDEF fns anon/PUBLIC EXECUTE | 0 | Reviewer `aclexplode(proacl)` over 10 functions → 0 hits where grantee IN ('anon','-') AND priv='EXECUTE' | ✓ PASS |
| 7 | 8 user-callable RPCs authn EXECUTE | 8 | Reviewer query confirmed 8 distinct proname with `grantee='authenticated' AND priv='EXECUTE'` excluding `next_lens_variant_display_id` + `m9_lens_received_for_sale_order_trg_fn` | ✓ PASS |
| 8 | `next_lens_variant_display_id` REVOKEd from anon/auth/PUBLIC | 0 | Reviewer query → 0 EXECUTE rows for anon/auth/PUBLIC | ✓ PASS |
| 9 | `m9_lens_received_for_sale_order_trg_fn` fully REVOKEd | 0 | Reviewer query → 0 EXECUTE rows for anon/auth/PUBLIC | ✓ PASS |
| 10 | `next_lens_variant_display_id` raises 42501 on anon JWT | 42501 'Unauthorized' | TEST_REPORT.md Case 4: 42501 'Unauthorized' on BOTH `{role:'anon'}` claims AND NULL claims. Sub-case with empty-string `''` raises 22P02 (JSON cast fails before IS NULL check) — not a realistic scenario; documented in FINDINGS F-4 | ✓ PASS (realistic scenarios) |
| 11 | `supabase/config.toml` `[functions.lens-catalog-import]` block + `verify_jwt = true` | present | Reviewer `grep -A 2 "^\[functions.lens-catalog-import\]"` → `enabled = true\nverify_jwt = true` confirmed | ✓ PASS |
| 12 | `lens-catalog-import/index.ts` fail-closed | `if (!callerAuth)` | Reviewer `grep -n` → line 77 `if (!callerAuth) {` returning 401; preceded by M1A Fix #7 comment marker | ✓ PASS |
| 13 | EF redeployed with new code | md5 match | Reviewer `mcp__supabase__get_edge_function` → `version=2, status=ACTIVE, verify_jwt=true`. Returned `index.ts` content matches the local post-edit file (contains `if (!callerAuth) {` + M1A Fix #7 comment) | ✓ PASS |
| 14 | `pending_lens_advancement_queue` UNIQUE INDEX | exists | Reviewer `pg_indexes` → `pending_lens_advancement_queue_stock_movement_unique` is a UNIQUE INDEX on `stock_movement_id` | ✓ PASS |
| 15 | K3 trigger fn `ON CONFLICT (stock_movement_id) DO NOTHING` | yes | Reviewer `pg_get_functiondef('m9_lens_received_for_sale_order_trg_fn')` body contains `ON CONFLICT (stock_movement_id) DO NOTHING` | ✓ PASS |
| 16 | Functional smoke 6/6 on demo | PASS | TEST_REPORT.md captures all 6 + Reviewer counted demo smoke artifacts: 4 stock_movement rows tagged 'M1A smoke' (1 receipt + 1 transfer_out + 1 transfer_in + 1 adj_found) — matches smoke design | ✓ PASS |
| 17 | Advisor lints 0028 + 0029 — Phase 1A objects no longer flagged | clear | Reviewer parsed 139 advisor lints: `anon_security_definer_function_executable` = **0 Phase 1A hits** (Brief's target — cleared). `authenticated_security_definer_function_executable` = 8 hits on the 8 user-callable RPCs (this is BY DESIGN per criterion 7 + project-wide carry-allowlist per Sentinel M-5; the canonical RPC pattern necessarily exposes RPCs to authenticated). `function_search_path_mutable` = 0 Phase 1A hits. | ✓ PASS WITH NOTE — anon lint cleared; authn lint is by-design (matches criterion 7) |
| 18 | No Prizma data written | 0 hits | Reviewer query: `count(*) FROM stock_lot WHERE tenant_id <> demo_tid AND notes ILIKE '%M1A%smoke%'` → 0 | ✓ PASS |
| 19 | `npm run verify:integrity` exit 0 post-pipeline | 0 | Executor recorded exit 0 at every commit; close commit confirmed `All clear — 126 files scanned in 6ms` | ✓ PASS |
| 20 | `verify --staged` per commit (Iron Rule 31 + 32 + 14/15/18/21/23) | 0 violations | Executor commits show `All clear — 0 violations, 0 warnings` per commit, EXCEPT 1 file-size WARNING on commit 7 (lens-catalog-import 306 lines, soft target 300, hard max 350 — within tolerance) AND 1 false-positive rule-18 on the close commit's documentation comment (resolved by rewording). No real Iron Rule violations. | ✓ PASS |
| 21 | `docs/GLOBAL_MAP.md` one-line discipline note | ≥ 1 line citing SPEC slug | Reviewer `grep "M1A_OPERATIONS_RPCS_FIX" docs/GLOBAL_MAP.md` → confirmed in the new `### Discipline notes` section under §7 | ✓ PASS |
| 22 | SPEC folder artifacts | SPEC + MIGRATION + ROLLBACK + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW (this file) | `ls` confirmed all 6 present pre-REVIEW; this file adds the 7th | ✓ PASS |
| 23 | Integrity Gate exit 0 or 2 final | 0 | `npm run verify:integrity` exit 0 confirmed at close commit | ✓ PASS |
| 24 (Amd #1) | `record_transfer` 19-arg call | yes | Reviewer `pg_get_functiondef('record_transfer')` body contains both `'transfer_out', -p_qty_sent,` and `'transfer_in', p_qty_sent,` with 19-arg footer (3 trailing NULLs each) | ✓ PASS |
| 25 (Amd #2) | `record_adjustment_found` 19-arg call | yes | Reviewer `pg_get_functiondef('record_adjustment_found')` body contains `NULL, NULL, NULL, NULL, v_lot_id,\n    v_unit_cost, NULL, NULL,\n    p_performed_by, p_reason,\n    p_sph, p_cyl, p_add_value` — 19-arg call with v_lot_id at position 11 (self-ref) | ✓ PASS |

**Net: 23/25 PASS strict, 25/25 PASS-or-PASS-WITH-NOTE (criteria 17 + 20 carry minor notes that don't impair the criterion's intent).**

## Spot-checks (Reviewer's discretionary verification)

Per opticup-reviewer SKILL §"Spot-check claimed behavior — don't trust the report blindly". 3 spot-checks performed:

1. **`record_stock_movement` body has the v_is_creation_movement branch.** Reviewer `pg_get_functiondef('record_stock_movement')` confirmed:
   - Variable declaration `v_is_creation_movement BOOLEAN`
   - Assignment `v_is_creation_movement := p_movement_type IN ('receipt', 'transfer_in', 'adjustment_found')`
   - Conditional `IF NOT v_is_creation_movement THEN UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta`
   - ON CONFLICT clause has `WHERE (is_deleted = false)`.
   - **Match the SPEC's MIGRATION.md Block #1 verbatim.**

2. **K3 trigger fn body contains the exact post-fix idempotency clause.** Reviewer confirmed `pg_get_functiondef('m9_lens_received_for_sale_order_trg_fn')` body ends with `… stock_movement_id) DO NOTHING; END IF; RETURN NEW; END;`. **Match.**

3. **EF deployed source matches local file.** Reviewer `get_edge_function` returned 4709-character `index.ts` containing all 3 markers: (a) `if (!callerAuth) {` at the expected position, (b) the M1A Fix #7 comment marker `// M1A_OPERATIONS_RPCS_FIX (2026-05-15) Fix #7`, (c) the post-fail-closed `is_platform_super_admin` check is now unconditional (not nested inside `if (callerAuth) { ... }`). **Match.**

## Security & SaaS Integrity

- **No anon-exposed mutator surface remains for the 10 Phase 1A SECDEF functions.** Verified by aclexplode-based queries.
- **`v_suppliers_for_m9`** no longer leaks Postgres default-DML ACL to anon/PUBLIC. Iron Rule 13 contract restored.
- **`next_lens_variant_display_id`** has belt + suspenders: PostgREST REVOKE (Block #2) + in-body JWT-not-null guard (Block #3). Defense-in-depth aligned with Iron Rule 22.
- **`lens-catalog-import`** has belt + suspenders: gateway `verify_jwt = true` (config.toml block per Fix #6) + in-body fail-closed gate (Fix #7) + `is_platform_super_admin` RPC check. Anonymous request → 401 at gateway OR 401 at body OR 403 at admin-check. Three independent walls.
- **K3 queue idempotency** is now safe under transaction retries. The dormant queue had no rows to violate; constraint is correctly forward-installed.
- **Demo-only writes.** Reviewer confirmed 0 Prizma tenant rows touched by SPEC's smoke (criterion 18).

## Code Quality

- 12 commits, all conventional-commit, all single-concern, all signed `Co-Authored-By`.
- 1 file-size warning (lens-catalog-import 306 lines, soft 300, hard 350) — accepted; no Iron Rule violation.
- MIGRATION.md Applied Log pattern (per-Block apply timestamp + verify result) is a useful runtime-discovery innovation. Documented in EXECUTION_REPORT §5 for opticup-executor SKILL adoption.
- Foreman amendments handled correctly: each escalation produced a sibling escalation file in `modules/Module 1 - Inventory Management/escalations/`, Foreman authored amendment text appended to SPEC.md, MIGRATION.md got a new Block, ROLLBACK.md got a paired DOWN block. Lifecycle properly co-located inside the SPEC folder.
- TECH_DEBT and FINDINGS dispositions clean: 8 findings disposed, 2 RESOLVED in-pipeline, 2 → TECH_DEBT M1A-DEBT-04, 3 dismissed, 1 → executor-skill improvement.

## Recommendations

### Priority fixes (must do before merge to main)

**None.** All 25 criteria PASS or PASS-WITH-NOTE-by-design. SPEC scope is fully delivered. Ready for Foreman post-execution review.

### Nice-to-have / follow-up (post-merge)

1. **`M1A-DEBT-04 — Demo lens-catalog seed fixtures`** — log to TECH_DEBT.md. The 2 demo locations + 1 global brand/design/variant `LV-TST001` + 1 supplier offering planted by this Pipeline can either persist as Phase 1B's smoke seed OR be replaced by a proper `scripts/seed-demo-lens-fixtures.sql`. Defer to Phase 1B opening.
2. **Pre-commit hook false-positive on rule-18 in SQL comments** — the hook regex matches `UNIQUE...(col)` inside SQL `--` comments. Fold into the next `M1_5_VERIFY_HOOKS_REGEX_FIXES`-class SPEC. Low priority.
3. **Optional belt-and-suspenders for `next_lens_variant_display_id`** — explicit empty-string check (`v_claims = ''`) in addition to `IS NULL`. Closes the unrealistic-but-documented 22P02 edge (F-4). Defer to a future security-hardening pass.

## Verdict

🟢 **PASS — ready for Foreman post-execution review.**

All 8 SPEC-original fixes + 2 Foreman amendment fixes are live on Supabase. All 6 functional smoke cases PASS on demo. Iron Rule 32 §7 = `None.` held across 12 commits. No security regressions. Documentation propagated. Executor + Foreman handled mid-pipeline amendments correctly under same-class authorization.

Phase 1B is now unblocked on the orchestrator chain (receipt + transfer + adjustment_found all runnable end-to-end on demo tenant).

---

*End of REVIEW.md. Reviewer is read-only — no commits made. Next: opticup-strategic Foreman writes FOREMAN_REVIEW.md and emits the 1-line Hebrew status to Daniel.*
