# SPEC — M1A_OPERATIONS_RPCS_FIX

> **Template version:** v3 (2026-05-14)
> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-15
> **Module:** 1 — Lens Inventory Management
> **Phase (if applicable):** Phase 1A operations-layer bug-fix (single Pipeline run; precedes Phase 1B)
> **Author signature:** Full-Auto Pipeline — single chat — 2026-05-15

---

## 0. Pre-Authoring Reality Check

- Brief `M1A_OPERATIONS_RPCS_FIX_BRIEF.md` (v1, 2026-05-15) read in full 2026-05-15.
- Activation prompt `M1A_OPERATIONS_RPCS_FIX_ACTIVATION_PROMPT.md` read in full 2026-05-15.
- All 10 §6 pre-flight probes executed live against Supabase project `tsxrrxzmdxaenlvocyit` (production) on 2026-05-15 BEFORE drafting this SPEC. 4 extra confirmatory probes added (orchestrator bodies, stock_movement CHECK constraints, K3 trigger wiring, lens-catalog-import EF source + config.toml grep).
- Two material Brief divergences surfaced and reconciled here:
  - **`stock_movement_type` is NOT a Postgres ENUM.** `pg_enum` for `typname='stock_movement_type'` returns empty. `stock_movement.movement_type` is `text` with a 7-value CHECK constraint (see Baselines/B-2). The SPEC therefore writes literal `text` comparisons, not enum-name comparisons, in Fix #1.
  - **Partial UNIQUE INDEX `tenant_lens_stock_unique` ALREADY EXISTS** with `NULLS NOT DISTINCT WHERE (is_deleted = false)` matching the full ON CONFLICT column list. `pg_constraint` for `contype='u'` returns zero rows (Brief was correct there — partial unique INDEXES are not constraints). The runtime bug is that `record_stock_movement.ON CONFLICT` lacks the WHERE predicate so Postgres cannot infer the partial index. Cleanest Fix #2 = add `WHERE (is_deleted = false)` to the ON CONFLICT clause inside `record_stock_movement`. Adding a redundant non-partial UNIQUE INDEX is rejected to avoid index duplication + behavior change for soft-deleted rows.
- Cross-Reference Check (Rule 21) completed 2026-05-15: 0 new tables/views/RPCs/functions introduced. The SPEC modifies existing objects only. 1 new index name (`pending_lens_advancement_queue_stock_movement_unique`) — grep against `docs/GLOBAL_SCHEMA.sql` + `pg_indexes`: 0 collisions. The SPEC adds 1 new `[functions.lens-catalog-import]` block to `supabase/config.toml` — grep: not pre-existing.
- Untracked-paths survey: `git status --porcelain | grep '^??'` count at SPEC-authoring time = many pre-existing architecture-brief, role artifact, and draft files in roles/, modules/Module 1.5 - Shared Components/architecture-brief/, __LAUNCH_PLAN_DRAFT__/. **The Executor MUST selectively `git add` by filename throughout this SPEC**; never `git add -A` or `git add .`.
- `.gitignore`-awareness for §9 New Files: all new files this SPEC creates are inside the SPEC folder (`modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/`) which is NOT in any `.gitignore` — `git add` will succeed.
- `.gitignore` check additionally performed for the `supabase/config.toml` modification and `supabase/functions/lens-catalog-import/index.ts` modification — both files are tracked, edits will commit cleanly.
- Color-form completeness: N/A (no visual re-skin).

### Probe Baselines (LIVE measurements, 2026-05-15)

| Symbol | Metric | Value | How measured |
|---|---|---|---|
| `BASE_FN_SIGS` | 10 SECDEF function signatures (oid + identity-args) | All 10 functions exist with `SECURITY DEFINER`, `proconfig=[search_path=public]`, signatures pinned in Appendix B-1 below | Probe 1 — `SELECT proname, pg_get_function_identity_arguments(oid), prosecdef, proconfig FROM pg_proc WHERE proname IN (...)` |
| `BASE_MVMT_TYPE_KIND` | Kind of `stock_movement.movement_type` | `text`, with CHECK constraint `stock_movement_movement_type_check` allowing exactly `['sale','receipt','transfer_out','transfer_in','adjustment_found','adjustment_lost','customer_return']` | Probe 2 + 2b — `pg_enum` returns empty; `information_schema.columns` returns `data_type=text`; `pg_constraint` returns the 7-value CHECK |
| `BASE_TLS_SCHEMA` | `tenant_lens_stock` schema | 14 cols; `sph NUMERIC NOT NULL`; `cyl`, `add_value` NULLABLE; `qty_on_hand NOT NULL DEFAULT 0`; `is_deleted NOT NULL DEFAULT false` | Probe 3 — `information_schema.columns` |
| `BASE_SL_CHECK` | `stock_lot` constraints | `stock_lot_check: CHECK ((qty_remaining >= 0) AND (qty_remaining <= qty_received))` + `stock_lot_qty_received_check: CHECK (qty_received > 0)` | Probe 4 |
| `BASE_TLS_UNIQUE_INDEX` | Existing partial UNIQUE INDEX on `tenant_lens_stock` | `tenant_lens_stock_unique` ON `(tenant_id, variant_id, location_id, sph, cyl, add_value) NULLS NOT DISTINCT WHERE (is_deleted = false)` — already present | Probe 8b — `pg_indexes` |
| `BASE_TLS_CONSTRAINT` | Existing UNIQUE CONSTRAINT (contype='u') on `tenant_lens_stock` | None (zero rows) | Probe 4 — `pg_constraint contype='u'` |
| `BASE_PG_VERSION` | Postgres version | `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit` — `NULLS NOT DISTINCT` syntax available (PG15+) | Probe 5 — `SELECT version()` |
| `BASE_V9_GRANTS` | `v_suppliers_for_m9.relacl` ACL | anon + authenticated + PUBLIC each hold SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (default Postgres view grants — Iron Rule 13 violation latent today, surfaced if RLS regresses) | Probe 6 — `aclexplode(pg_class.relacl)` |
| `BASE_FN_ACLS` | EXECUTE ACL on the 10 functions | Each function: EXECUTE granted to anon, authenticated, postgres, service_role, AND PUBLIC (grantee `-`) | Probe 7 — `aclexplode(pg_proc.proacl)` |
| `BASE_PLAQ_SCHEMA` | `pending_lens_advancement_queue` columns | 9 cols: id, tenant_id, sale_order_id, sub_order_id, purchase_receipt_id, stock_movement_id, enqueued_at, processed_at, process_error | Probe 8 — `information_schema.columns` |
| `BASE_PLAQ_INDEXES` | Indexes on `pending_lens_advancement_queue` | `pkey(id)` + `tenant_idx(tenant_id)` + `unprocessed_idx(enqueued_at) WHERE processed_at IS NULL` — **no UNIQUE on stock_movement_id** | Probe 8b — `pg_indexes` |
| `BASE_K3_TRIGGER` | K3 trigger wiring | `m9_lens_received_for_sale_order_trg AFTER INSERT ON public.stock_movement FOR EACH ROW EXECUTE FUNCTION m9_lens_received_for_sale_order_trg_fn()`, `tgenabled='O'` (enabled) | Probe Extra C — `pg_trigger` |
| `BASE_K3_FN_BODY` | Body of `m9_lens_received_for_sale_order_trg_fn()` | Plain INSERT INTO `pending_lens_advancement_queue(...) VALUES (...)`, no `ON CONFLICT` | Probe 9 — `pg_get_functiondef` |
| `BASE_RSM_BODY_BUG_LINE` | Bug location inside `record_stock_movement` | Line "Update lot remaining" → `UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta, updated_at = now() WHERE id = p_source_lot_id;` — unconditional; double-adds when caller just INSERTed lot with qty_remaining = qty_received | Probe 9 — `pg_get_functiondef` |
| `BASE_RSM_ONCONFLICT_BUG` | ON CONFLICT inside `record_stock_movement` | `ON CONFLICT (tenant_id, variant_id, location_id, sph, cyl, add_value) DO UPDATE …` — **no WHERE predicate**, so the partial index `tenant_lens_stock_unique` cannot be inferred ⇒ 42P10 at runtime | Probe 9 — `pg_get_functiondef` |
| `BASE_NLVDID_BODY` | Body of `next_lens_variant_display_id()` | Atomic increment of `lens_variant_display_seq scope='global'`, raises P0001 if uninitialised. **No JWT-not-null guard.** `SECURITY DEFINER`, `SET search_path TO 'public'` | Probe 9 — `pg_get_functiondef` |
| `BASE_ORCH_RECEIPT` | `m1_create_receipt_from_box` body — movement_type literal | INSERTs `stock_lot` with `qty_remaining=(v_line->>'qty_received')` then calls `record_stock_movement(... 'receipt', (v_line->>'qty_received')::INT, ...)` | Probe Extra A — `pg_get_functiondef` |
| `BASE_ORCH_TRANSFER` | `record_transfer` body — movement_type literals | INSERTs dest `stock_lot` with `qty_remaining=p_qty_sent`; calls `record_stock_movement(..., 'transfer_out', -p_qty_sent, ...)` on source lot (CONSUMING) + `record_stock_movement(..., 'transfer_in', +p_qty_sent, ...)` on dest lot (CREATION) | Probe Extra A |
| `BASE_ORCH_ADJ` | `record_adjustment_found` body — movement_type literal | INSERTs `stock_lot` with `qty_remaining=p_qty_found`; calls `record_stock_movement(..., 'adjustment_found', p_qty_found, ...)` (CREATION) | Probe Extra A |
| `BASE_SM_EXACTLY_ONE_SOURCE` | `stock_movement` constraint | `stock_movement_exactly_one_source: CHECK (count of [sale_order_id, customer_return_id, purchase_receipt_id, transfer_id, adjustment_id] = 1)` — every movement must have exactly ONE source pointer | Probe Extra B |
| `BASE_LCI_GATE_LINE` | Fail-open gate in `lens-catalog-import/index.ts` | Lines 73–85: `const callerAuth = req.headers.get('authorization') ?? ''; if (callerAuth) { ... is_platform_super_admin check ... }` — empty `Authorization` header skips the gate entirely | Direct file read |
| `BASE_CONFIG_TOML_MISSING` | `[functions.lens-catalog-import]` block | NOT present in `supabase/config.toml`. `submit-lead`'s block (lines 527–531) is the closest mirror pattern: `verify_jwt = false`, `import_map`, `entrypoint` | `grep -n "lens-catalog\|submit-lead\|verify_jwt" supabase/config.toml` |
| `BASE_M1_SPEC_DIR_COUNT` | Existing SPEC folders in M1 | 14 folders (incl. closed Phase 1A, Currencies-Hotfix, Debt-Sweep) | `ls modules/Module 1 - Inventory Management/docs/specs/` |

### Lessons applied from prior FOREMAN_REVIEWs in M1

Harvested from the 3 most recent M1 FOREMAN_REVIEWs:

- **From `M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` (2026-05-15) — Author Proposal #1 (skill-improvement): "Pre-flight live probes ALWAYS, never SPEC from Brief pseudocode."** → APPLIED in §0 above; all 14 baselines derived from live SQL/file reads on 2026-05-15.
- **From `M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` (2026-05-15) — Executor Proposal #2: "Proactive `node scripts/verify.mjs --staged` before EVERY git commit."** → APPLIED by Iron Rule 31 (§13 Pre-Merge Checklist) + commit-level instruction in §10.
- **From `M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` (2026-05-15) — Executor Proposal #1: "Reorder commits when proactive verify surfaces a dependency."** → APPLIED — the executor is pre-authorized in §4 to reorder commits within §10 if proactive verify surfaces a sequencing issue, provided each commit remains single-concern.
- **From `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` (2026-05-14) — Author Proposal #2: "DB-only migrations applied via MCP `apply_migration`; no `supabase/migrations/*.sql` file needed; record migration body inside SPEC folder (`MIGRATION.md` per L3a pattern)."** → APPLIED — see §9 New Files (`MIGRATION.md`).
- **From `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` (2026-05-14) — Executor Proposal #1: "Verify probes still match before executing — do not trust Foreman-time baselines stale."** → APPLIED — see §4 Autonomy Envelope: executor MUST re-run abbreviated pre-flight at Step 1 and compare to §0 baselines before touching DDL.
- **From `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` (2026-05-14) — Author Proposal #1: "Mandatory functional smoke. No 🟢 close without an end-to-end orchestrator call."** → APPLIED — see §14 Smoke Test Cases; this is the ENTIRE REASON this SPEC exists; non-overridable §5 stop-trigger.
- **From `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` (2026-05-14) — Executor Proposal #2: "REVOKE/GRANT migrations MUST use exact `pg_get_function_identity_arguments` signatures to avoid silent overload misses."** → APPLIED — Fix #4 migration uses the exact identity-args strings from Probe 1, NOT shortened or guessed.

---

## 1. Goal

Close, in a single Full-Auto Pipeline run, all 8 operations-layer bugs surfaced by the post-Phase-1A Strategic + Code reviews (B-01 lot-double-add, B-02 ON CONFLICT inference, A-01 view anon grants, C-1/C-2/C-3 SECDEF EXECUTE creep, D-3 K3 queue idempotency, F-1 missing config.toml block, F-2 fail-open EF gate) so that Phase 1B (customer-facing screens) can start on a verified-runnable operations layer. **Bug-fix only.** No new features. No schema additions beyond a single UNIQUE INDEX on a dormant queue table. No architectural movement.

---

## 2. Background & Motivation

**Why now:** Phase 1A's §6 smoke (criterion 22) was a single `INSERT INTO lens_brand` + cross-tenant SELECT + DELETE. **No operations RPC was ever invoked.** Two independent post-Phase-1A reviews (Strategic — `architecture-brief/STRATEGIC_REVIEW_REPORT.md`; Code — `architecture-brief/CODE_REVIEW_REPORT.md`) jointly confirmed that the orchestrator RPCs (`m1_create_receipt_from_box`, `record_transfer`, `record_adjustment_found`) all chain through `record_stock_movement` and would **abort on the first live call** because of two coupled bugs:

1. Unconditional `UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta` violates `stock_lot_check` whenever the orchestrator just-INSERTed a lot with `qty_remaining = qty_received` then called the movement with positive delta (the `receipt`, `transfer_in`, `adjustment_found` paths).
2. `INSERT INTO tenant_lens_stock ... ON CONFLICT (col_list) DO UPDATE` has no WHERE predicate, so Postgres can't infer the existing partial UNIQUE INDEX (`WHERE is_deleted = false`) and raises 42P10 on first insert.

Two further reviewer findings hit the surface of the substrate and must close in the same Pipeline so Phase 1B's first migration starts on a clean foundation:

- 10 SECURITY DEFINER functions inherit default Postgres `EXECUTE TO PUBLIC`. The `SECURITY_HOTFIX_2026_05_13` SPEC established the canonical `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` discipline 36 hours BEFORE Phase 1A closed; Phase 1A did not inherit it. Advisor lints 0028 + 0029 fire.
- `next_lens_variant_display_id()` is anon-callable, no tenant guard, increments a global sequence. Resource-exhaustion vector.
- `v_suppliers_for_m9` retained default anon GRANTs (Iron Rule 13 contract violation).
- `pending_lens_advancement_queue` has no idempotency UNIQUE on `stock_movement_id`. Transaction retries would double-enqueue. Queue is dormant today → adding now is safe.
- `lens-catalog-import` has no `[functions.lens-catalog-import]` block in `supabase/config.toml`. A future CLI redeploy could silently flip `verify_jwt`. The in-body gate is also fail-open — empty `Authorization` skips it entirely.

**Already-done discovery contingency:** Probe 4 + Probe 8b confirmed `tenant_lens_stock_unique` already exists. Fix #2's approach changed from "add UNIQUE" to "add WHERE predicate to ON CONFLICT" — single-line surgical change.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch | On `develop`, clean at end | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced (foreground commits + closure commit) | 9–10 commits, single-concern, conventional-commit format | `git log origin/develop..HEAD --oneline \| wc -l` → 9 or 10 |
| 3 | `record_stock_movement` no longer double-adds on creation movements | After demo INSERT of stock_lot(qty_received=5, qty_remaining=5), `SELECT record_stock_movement(..., 'receipt', +5, ...)` succeeds AND post-call `qty_remaining` = 5 (NOT 10) | §14 Smoke Case 1 (db) |
| 4 | `record_stock_movement` ON CONFLICT no longer raises 42P10 | `m1_create_receipt_from_box` with one stock line completes without error; `tenant_lens_stock` qty_on_hand incremented (first insert) AND on second call to same (variant, location, sph, cyl, add_value), the DO UPDATE branch fires | §14 Smoke Case 2 (db) |
| 5 | `v_suppliers_for_m9` ACL has zero anon/PUBLIC entries | `SELECT … FROM aclexplode(pg_class.relacl) WHERE grantee::regrole::text IN ('anon','-')` → 0 rows | `mcp__supabase__execute_sql` |
| 6 | 10 SECDEF functions: zero anon/PUBLIC EXECUTE rows | `SELECT … FROM pg_proc, aclexplode(proacl) WHERE proname IN (10 names) AND grantee::regrole::text IN ('anon','-') AND privilege_type='EXECUTE'` → 0 rows | `mcp__supabase__execute_sql` |
| 7 | 8 user-callable RPCs retain `authenticated` EXECUTE | `SELECT … WHERE proname IN (8 names: effective_price, m1_create_receipt_from_box, next_lot_number, next_receipt_number, next_transfer_number, record_adjustment_found, record_stock_movement, record_transfer) AND grantee::regrole::text='authenticated' AND privilege_type='EXECUTE'` → 8 rows | `mcp__supabase__execute_sql` |
| 8 | `next_lens_variant_display_id` REVOKEd from authenticated + anon + PUBLIC | `SELECT … WHERE proname='next_lens_variant_display_id' AND grantee::regrole::text IN ('anon','authenticated','-') AND privilege_type='EXECUTE'` → 0 rows | `mcp__supabase__execute_sql` |
| 9 | `m9_lens_received_for_sale_order_trg_fn` REVOKEd entirely | `SELECT … WHERE proname='m9_lens_received_for_sale_order_trg_fn' AND grantee::regrole::text IN ('anon','authenticated','-') AND privilege_type='EXECUTE'` → 0 rows | `mcp__supabase__execute_sql` |
| 10 | `next_lens_variant_display_id` raises 42501 on anon JWT | A direct call via Supabase REST with anon key (no JWT or `role=anon` JWT) returns HTTP 4xx with PG ERRCODE `42501` and message `Unauthorized` | §14 Smoke Case 4 (api OR db with `SET LOCAL request.jwt.claims`) |
| 11 | `supabase/config.toml` contains `[functions.lens-catalog-import]` block with `verify_jwt = true` | `grep -A 4 "^\[functions.lens-catalog-import\]" supabase/config.toml` shows `verify_jwt = true` | `grep` |
| 12 | `lens-catalog-import/index.ts` gate is fail-closed | File reads: contains `if (!callerAuth) { return new Response(... 401 ...); }` BEFORE the `is_platform_super_admin` check; the `if (callerAuth)` wrapper is removed | `grep -n "callerAuth" supabase/functions/lens-catalog-import/index.ts` |
| 13 | `lens-catalog-import` redeployed with the new code | `mcp__supabase__get_edge_function` → file content matches the post-edit local file (md5 match) | MCP |
| 14 | `pending_lens_advancement_queue_stock_movement_unique` UNIQUE INDEX exists | `SELECT indexdef FROM pg_indexes WHERE indexname='pending_lens_advancement_queue_stock_movement_unique'` → returns the CREATE UNIQUE INDEX … `(stock_movement_id)` definition | `mcp__supabase__execute_sql` |
| 15 | K3 trigger fn uses `ON CONFLICT (stock_movement_id) DO NOTHING` | `pg_get_functiondef('m9_lens_received_for_sale_order_trg_fn'::regproc)` body contains `ON CONFLICT (stock_movement_id) DO NOTHING` | `mcp__supabase__execute_sql` |
| 16 | Functional smoke on demo (criterion 10 of Brief §5) — end-to-end | 5 smoke cases pass on demo (`tenant_id = 8d8cfa7e-ef58-49af-9702-a862d459cccb`): (a) record_stock_movement no-double-add (Case 1); (b) m1_create_receipt_from_box with 1 stock-line completes (Case 2); (c) record_transfer between 2 demo locations completes both legs (Case 3); (d) record_adjustment_found with positive delta completes (Case 5); (e) effective_price for an offering returns NUMERIC (Case 6). All captured in TEST_REPORT.md | `mcp__supabase__execute_sql` (db) + TEST_REPORT.md |
| 17 | Advisor lints 0028 + 0029 — Phase 1A objects no longer flagged | `mcp__supabase__get_advisors type='security'` does NOT list any of the 10 Phase 1A SECDEF function names under `function_search_path_mutable_anon_executable` or `function_search_path_mutable_authenticated_executable` | MCP |
| 18 | No Prizma data was written during smoke | All §14 cases run with `p_tenant_id = 8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo). Optional grep over EXECUTION_REPORT for any `aff6dc1b…` Prizma UUID returns 0 hits | inspection |
| 19 | `npm run verify:integrity` exit 0 (no null-byte errors) on HEAD post-Pipeline | `npm run verify:integrity; echo $?` → `0` | local shell |
| 20 | `npm run verify -- --staged` passes on each commit (Rule 31 + Rule 32 + Iron Rules 14/15/18/21/23) | each commit's pre-commit hook chain → exit 0 | husky pre-commit |
| 21 | `docs/GLOBAL_MAP.md` carries a one-line discipline note referencing this SPEC | `grep "M1A_OPERATIONS_RPCS_FIX" docs/GLOBAL_MAP.md` returns ≥ 1 line | `grep` |
| 22 | EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + ROLLBACK.md + MIGRATION.md present in SPEC folder | `ls modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/` lists at minimum: SPEC.md, MIGRATION.md, EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, ROLLBACK.md, (later) REVIEW.md, FOREMAN_REVIEW.md | `ls` |
| 23 | Integrity Gate (Iron Rule 31) | `npm run verify:integrity` exit 0 or 2 (no null-byte ERROR) | as in #19 |

(SPEC §3 has 23 criteria, exceeding the Brief's 17-criterion minimum. Every criterion is independently measurable.)

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo + read-only SQL (Level 1).
- Apply DDL migrations via `mcp__supabase__apply_migration` (Level 3, **pre-authorized by this SPEC for the 5 fix domains in §10**): function CREATE OR REPLACE, REVOKE/GRANT on functions + views, CREATE UNIQUE INDEX on `pending_lens_advancement_queue`. **No DROPs. No TRUNCATEs. No mass DELETEs.** All DDL bodies live inside `MIGRATION.md`.
- Redeploy `lens-catalog-import` via `mcp__supabase__deploy_edge_function` (Level 3 EF redeploy — pre-authorized for this single function with `verify_jwt = true`).
- Edit `supabase/config.toml` + `supabase/functions/lens-catalog-import/index.ts` + `docs/GLOBAL_MAP.md` + create SPEC-folder artifacts.
- Commit and push to `develop` (per CLAUDE.md §9). **Selective `git add` by filename only** — never `git add -A` / `.`.
- Reorder commits within §10 if proactive `verify --staged` surfaces a sequencing issue, provided each commit remains single-concern (lesson from M1A_DEBT_SWEEP).
- Run `npm run verify:integrity` + `npm run verify -- --staged` + `npm run verify -- --full` at any time.
- Apply a recent executor-improvement proposal from a M1 FOREMAN_REVIEW if directly relevant.

### What REQUIRES stopping and reporting

- Any of the 10 §5 stop-triggers firing.
- Probe value diverging from the pinned §0 baseline by more than the listed tolerance.
- Any DDL operation OTHER than the 5 fix domains in §10 (e.g. an unanticipated DROP, TRUNCATE, ALTER TABLE) — STOP, write escalation.
- Any merge to `main`.
- Smoke test failure on demo — STOP, do NOT close, escalate.
- Any new advisor of severity ERROR introduced post-migration that did not exist in the §0 baseline.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **Probe-baseline divergence at Step 1 re-check.** If any §0 baseline value (function signature, ACL row count, schema column, CHECK constraint, index definition) does NOT match the live state when the executor re-runs the abbreviated probe set → STOP, write `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_baseline_drift.md`, emit one Hebrew line, halt.
2. **`record_stock_movement` body — overload disambiguation.** If `pg_proc` returns more than ONE function named `record_stock_movement` with different signatures → STOP, write escalation. The §0 baseline shows exactly ONE row; multiple overloads would change the REVOKE/GRANT plan in Fix #4.
3. **`stock_lot_check` violation during smoke Case 1.** If the fixed `record_stock_movement(..., 'receipt', +N, ...)` still raises `stock_lot_check` → STOP, the Fix #1 branch logic is wrong; do NOT proceed to Cases 2-5.
4. **42P10 during smoke Case 2.** If `m1_create_receipt_from_box` raises `42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification` → STOP, Fix #2 (ON CONFLICT WHERE predicate) is wrong; investigate the partial-index inference rules.
5. **EF redeploy 5xx pivot.** If `mcp__supabase__deploy_edge_function` returns 5xx / InternalServerErrorException for `lens-catalog-import` → execute the documented fallback per A5: `supabase functions deploy lens-catalog-import` from CLI (executor SKILL §5i; pre-authorized; NOT an escalation).
6. **K3 trigger fires unexpectedly on a movement WITHOUT sale_order_id.** Trigger body guards on `IF NEW.sale_order_id IS NOT NULL AND NEW.purchase_receipt_id IS NOT NULL`. If a smoke movement without sale_order_id ends up creating a queue row → STOP, the trigger body changed somewhere; investigate.
7. **Advisor regression.** Post-Pipeline `get_advisors security` returns MORE ERROR rows than the §0 baseline of 17 → STOP, investigate which new ERROR was introduced.
8. **`scripts/verify.mjs` pre-commit fails on any of commits 2–9 in §10.** STOP, fix the underlying violation; do NOT bypass with `--no-verify` (Iron Rule 31 + 32 non-overridable).
9. **Prizma touched.** Any SQL in §14 smoke or any committed code references `aff6dc1b-…` (Prizma UUID) or `prizma` tenant slug → STOP. Brief Locked Decision: demo-only.
10. **Daniel-decision STOP.** None planned. If one surfaces mid-execution → write escalation, emit ONE Hebrew line, halt. (Therefore §15 of this SPEC is intentionally omitted per template v3 rules.)

---

## 6. Rollback Plan

Full rollback per-fix lives in `ROLLBACK.md` (sibling file inside this SPEC folder). Each Fix has its own DOWN block. **Top-level rollback at the SPEC level:**

- `git reset --hard <START_COMMIT>` where START_COMMIT is the commit recorded by the Executor at Step 0 (HEAD of `develop` BEFORE any SPEC change).
- DB rollback per `ROLLBACK.md`:
  - Fix #1+#2: `CREATE OR REPLACE FUNCTION record_stock_movement(…)` with the original (buggy) body — body text captured verbatim in `ROLLBACK.md` from Probe 9.
  - Fix #3: `GRANT ALL ON v_suppliers_for_m9 TO PUBLIC, anon, authenticated;` (restores default Postgres view ACL).
  - Fix #4: `GRANT EXECUTE ON FUNCTION … TO PUBLIC, anon, authenticated;` for each of the 10 functions (signatures from §0 baseline).
  - Fix #5: `CREATE OR REPLACE FUNCTION next_lens_variant_display_id() …` with original body (no JWT guard) — body from Probe 9.
  - Fix #6: remove `[functions.lens-catalog-import]` block from `supabase/config.toml`.
  - Fix #7: revert `lens-catalog-import/index.ts` to pre-edit via `git checkout <START_COMMIT> -- supabase/functions/lens-catalog-import/index.ts` and redeploy.
  - Fix #8: `DROP INDEX pending_lens_advancement_queue_stock_movement_unique;` + `CREATE OR REPLACE FUNCTION m9_lens_received_for_sale_order_trg_fn() …` with original body (no `ON CONFLICT`).

Push rollback to `develop` as a single `revert(m1): rollback M1A_OPERATIONS_RPCS_FIX` commit. Notify Foreman; SPEC marked REOPEN, not CLOSED.

**Backup format guidance** — N/A (no row-level data changes; only DDL + EF source + config + 1 docs line + SPEC folder artifacts).

---

## 7. Destructive Operations

**None.**

This SPEC declares zero destructive operations per Iron Rule 32. The Iron-Rule-32 pre-commit gate (`scripts/checks/destructive-ops-declared.mjs`) will forbid all of the following for this SPEC's commit range:

- No `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `DROP FUNCTION`, `DROP VIEW`, `DROP INDEX`, `DROP TRIGGER`.
- No `TRUNCATE`, no unscoped `DELETE FROM`.
- No `git rebase`, `git reset --hard`, `git push --force`.
- No `git rm`. No mass file rename (≥ 5 files).
- No edits to CLAUDE.md, MASTER_ROADMAP.md, OPEN_TASKS.md, TECH_DEBT.md, SKILL.md (`docs/GLOBAL_MAP.md` one-line append is non-removal — allowed by the gate as an append).
- No merge / push / rebase touching `main`.

All fixes use `CREATE OR REPLACE FUNCTION` (in-place) and `CREATE UNIQUE INDEX` (additive). The trigger declaration is unchanged — only the trigger fn body is replaced. The `ON CONFLICT` predicate addition is a behavior fix inside an existing function body, not a constraint change.

If the executor encounters a need to perform any of the above mid-run → STOP per §5 trigger #1 + write escalation per Iron Rule 32 + emit Hebrew line. Do NOT silently amend §7 mid-run.

---

## 8. Out of Scope (explicit)

Anti-creep list — these MUST NOT be touched in this SPEC's commit range:

- **`purchase_order` / `purchase_order_line` / `supplier_debt` schema** (separate decision pending — Phase 1B-broadened or M1B0).
- **21 FK indexes** (separate SPEC `M1A_FK_INDEXES_PREP_FOR_1B`).
- **FX conversion in `effective_price`** (tenant-2 onboarding readiness; ILS-only Day-1 stands).
- **3 MAX-based sequence generators refactor** (functional today; defer until Phase 1B adds non-RPC callers).
- **Project-wide `RLS FOR ALL TO public` split** (separate cross-module SPEC).
- **`tenant_isolation` `auth_rls_initplan` advisor 0003** (project-wide perf, separate SPEC).
- **`is_platform_super_admin()` missing `SET search_path`** (pre-existing, Reviewer I-7, project-wide hardening).
- **`v_suppliers_for_m9.default_courier_company_id` column** (M9 SPEC scope, not M1).
- **Legacy frames-era `goods_receipts` / `purchase_orders` naming divergence** (architectural decision, separate SPEC).
- **Replace `window.prompt()` in catalog admin screen** (Phase 1B UX scope).
- **Iron Rule 7 API abstraction in catalog admin** (document the platform-admin exception in CONVENTIONS.md or fold into Phase 1B).
- **The 7 mockups, the 16 D-M1 decisions, the Phase 1B stub, the Phase 1 Brief** — no architectural movement.
- **CLAUDE.md, MASTER_ROADMAP.md, OPEN_TASKS.md, TECH_DEBT.md** — no edits (docs-only effect on `docs/GLOBAL_MAP.md` one-line addition + the SPEC folder).
- **Prizma tenant** — functional smoke runs on demo tenant only.
- **Merge to `main`** — Daniel-only, after this SPEC closes 🟢.

---

## 9. Expected Final State

### New files (inside this SPEC folder)

- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md` (this file)
- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/MIGRATION.md` — 5 SQL blocks (L3a pattern; one block per fix domain). DDL only. The executor applies each block via `mcp__supabase__apply_migration` with a distinct migration name.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/ROLLBACK.md` — 5 DOWN blocks (one per fix), fenced as ```sql.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/EXECUTION_REPORT.md` — written by executor at close.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/FINDINGS.md` — written by executor at close.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/TEST_REPORT.md` — written by executor at smoke-test step.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/REVIEW.md` — written by Reviewer after Executor closes.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` — written by Foreman after Reviewer closes.

### Modified files (in-place)

- `supabase/config.toml` — one new block `[functions.lens-catalog-import]` appended in the post-line-525 region (mirror submit-lead pattern). `verify_jwt = true`, `import_map` and `entrypoint` if the deno.json exists at `supabase/functions/lens-catalog-import/deno.json` (executor checks; if absent, omit those keys).
- `supabase/functions/lens-catalog-import/index.ts` — replace fail-open `if (callerAuth) { ... }` block (lines 73–85 per §0 baseline) with fail-closed `if (!callerAuth) return 401;` followed by unconditional `is_platform_super_admin` check.
- `docs/GLOBAL_MAP.md` — single appended line under an existing "Discipline notes" or "Module 1" subsection, format: `- M1A operations RPCs: as of M1A_OPERATIONS_RPCS_FIX (2026-05-15), the 10 Phase 1A SECDEF functions REVOKE EXECUTE from PUBLIC/anon; only authenticated retains EXECUTE for the 8 user-callable RPCs. `next_lens_variant_display_id` + `m9_lens_received_for_sale_order_trg_fn` are platform-admin/internal only.` (Exact phrasing left to executor; the line must mention the SPEC slug.)

### Deleted files

- **None.**

### DB state (post-migration)

- `record_stock_movement` body: branches on `p_movement_type` — for `'receipt'`, `'transfer_in'`, `'adjustment_found'` the `UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta` step is SKIPPED. For all other movement types it remains. ON CONFLICT clause has `WHERE (is_deleted = false)` predicate appended.
- 10 SECDEF functions: EXECUTE REVOKEd from PUBLIC + anon + authenticated; selectively GRANTed back to authenticated for the 8 user-callable RPCs (NOT `next_lens_variant_display_id`, NOT `m9_lens_received_for_sale_order_trg_fn`).
- `next_lens_variant_display_id` body: first executable statement is the JWT-not-null + role!='anon' guard raising 42501.
- `v_suppliers_for_m9`: ACL retains only authenticated SELECT + service_role full + postgres owner. No anon/PUBLIC rows.
- `pending_lens_advancement_queue`: new UNIQUE INDEX on `(stock_movement_id)`.
- `m9_lens_received_for_sale_order_trg_fn` body: same INSERT + appended `ON CONFLICT (stock_movement_id) DO NOTHING`.

### Build-side-effect file expectations

- This SPEC includes no `npm run build` step. No build artifacts are expected to regenerate.
- `lens-catalog-import` EF redeploy is via MCP (or CLI fallback) — generates no local build artifacts to commit.

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` — **NO update.** This is a bug-fix SPEC. Module phase status unchanged (Phase 1A stays ✅, Phase 1B stays ⬜). The SPEC's existence is recorded in M1's `SESSION_CONTEXT.md` (executor adds one section at close).
- `docs/GLOBAL_MAP.md` — one-line discipline note as above (criterion 21).
- `docs/GLOBAL_SCHEMA.sql` — **NO update.** No new tables/views; the new INDEX on `pending_lens_advancement_queue` is captured in the module's `db-schema.sql` (M1 module-owned).
- Module M1 `docs/db-schema.sql` — append a short comment noting the new UNIQUE INDEX. **NO** new table or RPC entries (the function bodies change but their signatures don't; existing SECDEF entries already describe the public surface).
- Module M1 `docs/SESSION_CONTEXT.md` — one new section (2026-05-15 — M1A_OPERATIONS_RPCS_FIX).
- Module M1 `docs/CHANGELOG.md` — one section listing the 9–10 commits with hashes.

---

## 10. Commit Plan

10 single-concern commits, conventional-commit format, all on `develop`. Each commit individually passes `verify -- --staged` (Iron Rules 31 + 32 + 14/15/18/21/23). Executor runs `node scripts/verify.mjs --staged` BEFORE every `git commit` (M1A_DEBT_SWEEP lesson, applied here).

1. `chore(spec): open M1A_OPERATIONS_RPCS_FIX — SPEC + MIGRATION + ROLLBACK skeleton`
   - Files: SPEC.md, MIGRATION.md (skeleton with 5 SQL blocks), ROLLBACK.md (skeleton with 5 DOWN blocks).
2. `fix(m1,rpc): record_stock_movement — skip lot update on creation movements + add is_deleted predicate to ON CONFLICT`
   - DDL: MIGRATION.md Block #1 applied via `apply_migration` (name: `m1a_record_stock_movement_fix`). Body branches on `p_movement_type IN ('receipt','transfer_in','adjustment_found')` to skip the `qty_remaining` UPDATE. ON CONFLICT clause gains `WHERE (is_deleted = false)`.
   - Files: MIGRATION.md (Block #1 body filled in).
3. `fix(m1,sec): REVOKE EXECUTE on 10 Phase 1A SECDEF functions + selective re-GRANT to authenticated`
   - DDL: MIGRATION.md Block #2 applied via `apply_migration` (name: `m1a_revoke_execute_phase1a_secdef`). REVOKE EXECUTE … FROM PUBLIC, anon, authenticated for all 10 functions; then GRANT EXECUTE … TO authenticated for the 8 user-callable RPCs. `next_lens_variant_display_id` and `m9_lens_received_for_sale_order_trg_fn` stay fully REVOKEd.
   - Files: MIGRATION.md (Block #2 body filled in).
4. `fix(m1,sec): next_lens_variant_display_id — JWT-not-null guard inside function body`
   - DDL: MIGRATION.md Block #3 applied via `apply_migration` (name: `m1a_next_lens_variant_display_id_jwt_guard`). `CREATE OR REPLACE FUNCTION` with first executable statement = JWT-claim guard raising 42501 'Unauthorized' when claims-NULL or role='anon'.
   - Files: MIGRATION.md (Block #3 body filled in).
5. `fix(m1,sec): v_suppliers_for_m9 — REVOKE default anon/PUBLIC grants (Iron Rule 13)`
   - DDL: MIGRATION.md Block #4 applied via `apply_migration` (name: `m1a_v_suppliers_for_m9_revoke_anon`). REVOKE ALL ON v_suppliers_for_m9 FROM PUBLIC, anon, authenticated; GRANT SELECT TO authenticated, service_role.
   - Files: MIGRATION.md (Block #4 body filled in).
6. `fix(m1,m9): pending_lens_advancement_queue idempotency UNIQUE + K3 trigger ON CONFLICT DO NOTHING`
   - DDL: MIGRATION.md Block #5 applied via `apply_migration` (name: `m1a_k3_queue_idempotency`). CREATE UNIQUE INDEX pending_lens_advancement_queue_stock_movement_unique ON pending_lens_advancement_queue(stock_movement_id); CREATE OR REPLACE FUNCTION m9_lens_received_for_sale_order_trg_fn() with appended `ON CONFLICT (stock_movement_id) DO NOTHING`.
   - Files: MIGRATION.md (Block #5 body filled in).
7. `fix(ef,sec): lens-catalog-import — invert gate to fail-closed`
   - File edit: `supabase/functions/lens-catalog-import/index.ts` — replace lines 73–85 (per §0 BASE_LCI_GATE_LINE) with the fail-closed pattern.
   - EF redeploy via `mcp__supabase__deploy_edge_function` (verify_jwt=true). If 5xx → CLI fallback per §5 trigger #5.
   - Files: `supabase/functions/lens-catalog-import/index.ts`.
8. `chore(supabase): config.toml — add [functions.lens-catalog-import] block with verify_jwt = true`
   - File edit: append a new `[functions.lens-catalog-import]` block to `supabase/config.toml` (mirroring submit-lead's pattern at lines 527–531, adapted: `verify_jwt = true` here vs `false` for submit-lead).
   - Files: `supabase/config.toml`.
9. `test(m1): demo functional smoke — receipt + transfer + adjustment_found + effective_price + next_lens_variant_display_id anon-reject`
   - Files: TEST_REPORT.md (5 cases captured with timestamps + tenant_id + return values).
   - **No DDL.** No additional commits to functions or schema.
10. `chore(spec): close M1A_OPERATIONS_RPCS_FIX — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP one-line note + SESSION_CONTEXT + CHANGELOG`
    - Files: EXECUTION_REPORT.md, FINDINGS.md, `docs/GLOBAL_MAP.md` (one line), `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` (one new dated section), `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` (one section listing the commits with hashes), `modules/Module 1 - Inventory Management/docs/db-schema.sql` (one comment line about the new INDEX). **Not yet:** FOREMAN_REVIEW.md and REVIEW.md (those land in subsequent commits by Reviewer + Foreman).

Reviewer and Foreman commits land AFTER commit 10 — they are pipeline-controlled, not part of the executor's 10-commit plan.

**Commit reordering** is pre-authorized (§4) if proactive `verify -- --staged` surfaces a sequencing issue, provided each commit stays single-concern.

---

## 11. Dependencies / Preconditions

- M1A_DEBT_SWEEP CLOSED ✅ (2026-05-15) — confirmed by `SESSION_CONTEXT.md` reading. No outstanding M1A debt blockers.
- M1A_CURRENCIES_GLOBAL_HOTFIX CLOSED ✅ (2026-05-14).
- Supabase project `tsxrrxzmdxaenlvocyit` reachable + MCP tools loaded (✓ verified at SPEC-authoring time by 14 successful probes).
- Demo tenant present: `tenant_id = 8d8cfa7e-ef58-49af-9702-a862d459cccb` + demo locations + demo suppliers. (Executor verifies at Step 1.)
- Active branch `develop`, clean OR with the user's pre-confirmed untracked-files set (per CLAUDE.md §1 step 3a Phase 1 + step 4).
- Husky pre-commit hooks active (`scripts/verify.mjs`, `scripts/checks/destructive-ops-declared.mjs`, `scripts/checks/null-bytes.mjs`).

### Browser readiness pre-flight

**Not required.** Smoke testing for this SPEC is HTTP-level (MCP `execute_sql` + `mcp__supabase__deploy_edge_function`) and code-review level (grep / pg_get_functiondef). Skip Chrome readiness check.

---

## 12. Lessons Already Incorporated

- **From `M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` (Author Proposal #1, 2026-05-15) — pre-flight live probes ALWAYS.** APPLIED in §0 — 14 baselines pinned from live state, with the queries that produced each.
- **From `M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` (Executor Proposal #2, 2026-05-15) — proactive `verify -- --staged` before every commit.** APPLIED in §10 commit plan + §13 pre-merge checklist.
- **From `M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` (Executor Proposal #1, 2026-05-15) — pre-authorize commit reorder when proactive verify surfaces dependency.** APPLIED in §4 Autonomy Envelope.
- **From `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` (Author Proposal #2, 2026-05-14) — DB-only migrations via MCP, body inside SPEC folder via L3a `MIGRATION.md`.** APPLIED — see §9 New Files (MIGRATION.md) + §10 commit plan (each DDL commit references a block + migration name).
- **From `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` (Executor Proposal #1, 2026-05-14) — re-run abbreviated pre-flight at Step 1 before touching DDL.** APPLIED in §5 stop-trigger #1.
- **From `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` (Author Proposal #1, 2026-05-14) — mandatory functional smoke before SPEC close.** APPLIED — §14 Smoke Test Cases is the entire reason this SPEC exists; §5 stop-trigger + §13 checklist make it non-overridable.
- **From `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` (Executor Proposal #2, 2026-05-14) — exact pg_get_function_identity_arguments signatures, no shortened or guessed signatures.** APPLIED — Fix #4 migration body MUST use the signatures pinned in §0 BASE_FN_SIGS verbatim.
- **From `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` (Author Proposal #1) — heading convention `## N. Title`, no `§N` prefix.** APPLIED — all headings in this SPEC use `## N. Title`.
- **From `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` (Author Proposal #1) — baselines from LIVE measurement, never from memory.** APPLIED in §0 baseline table where every row cites a runnable command.
- **From `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` (Author Proposal #1) — Shared Edit Block for N>1 identical edits.** NOT APPLICABLE — this SPEC's 5 DDL blocks are each unique. No §3a section needed.
- **From `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` (Author Proposal #1) — color-form completeness check.** NOT APPLICABLE — no visual re-skin.

---

## 13. Pre-Merge Checklist

The Executor MUST verify every item before writing FINDINGS.md "closure section" and signaling closure to the Reviewer. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All 23 §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] §14 smoke cases all PASS on demo tenant only (criterion 16 + 18).
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2 (no null-byte ERROR). A null-byte ERROR anywhere in HEAD blocks closure.
- [ ] **Destructive Ops Gate (Iron Rule 32):** every commit passed the pre-commit `destructive-ops-declared.mjs` check on its own (since §7 declares None, the gate enforces zero destructive ops for the commit range).
- [ ] `npm run verify -- --full` exit 0 on HEAD post-Pipeline.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + ROLLBACK.md + MIGRATION.md written in the SPEC folder.
- [ ] **EXECUTION_REPORT.md §7 SPEC_TEMPLATE Version Footprint present** (template v3 requirement P-EX-03 — list patterns exercised or literal "No new template improvements to footprint this run").
- [ ] M1 SESSION_CONTEXT, CHANGELOG, db-schema.sql one-line entries committed.
- [ ] `docs/GLOBAL_MAP.md` one-line note committed.
- [ ] No Prizma data touched (criterion 18).
- [ ] No `main` merge attempted.

---

## 14. Smoke Test Cases

All cases run on **demo tenant** `8d8cfa7e-ef58-49af-9702-a862d459cccb` only. Each case captured in `TEST_REPORT.md` with: timestamp, query body, return value/exception, tenant_id, PASS/FAIL verdict.

| # | Case | Type | Inputs | Expected | Pass/Fail rule |
|---|---|---|---|---|---|
| 1 | **`record_stock_movement` no-double-add — receipt path.** Within a single SQL session: `SET LOCAL request.jwt.claims = '{"tenant_id":"8d8cfa7e-…","role":"authenticated"}'::text;` then INSERT a stock_lot manually with `qty_received=5, qty_remaining=5`, then `SELECT record_stock_movement(<demo_tenant>, <new_lot_id>, <demo_variant>, <demo_location>, 'receipt', 5, NULL,NULL,NULL,NULL,NULL,<unit_cost>,NULL,NULL,<demo_user>,NULL,NULL,NULL,NULL);` then `SELECT qty_remaining FROM stock_lot WHERE id = <new_lot_id>;` | db | demo tenant + new lot at qty_received=5/qty_remaining=5 | `record_stock_movement` returns a UUID (no error); post-call `qty_remaining = 5` | strict `qty_remaining = 5` |
| 2 | **`m1_create_receipt_from_box` end-to-end with 1 stock line.** Pick a published demo supplier, a published demo location, and one demo lens_variant. Call `SELECT m1_create_receipt_from_box(<demo_tenant>, <demo_supplier_id>, 'SMOKE-DN-001', '[{"variant_id":"…","location_id":"…","qty_received":3,"unit_cost":100.0,"sph":"0","cyl":null,"add_value":null}]'::jsonb, NULL, NULL, '0001', <demo_user>);` Then `SELECT qty_on_hand FROM tenant_lens_stock WHERE tenant_id=<demo_tenant> AND variant_id=<v> AND location_id=<l> AND sph=0 AND cyl IS NULL AND add_value IS NULL AND is_deleted=false;` | db | demo supplier + variant + location | RPC returns receipt_id UUID; tenant_lens_stock row exists with qty_on_hand=3; stock_lot row exists with qty_remaining=3; stock_movement row exists with movement_type='receipt' qty_delta=+3; **no 42P10 raised** | RPC returns UUID + all 3 downstream rows exist + qty_on_hand=3 |
| 3 | **`record_transfer` between 2 demo locations.** Find a demo lot with qty_remaining ≥ 2 at location A; call `SELECT record_transfer(<demo_tenant>, <loc_A>, <loc_B>, <variant>, 2, <lot_id>, <demo_user>, 'smoke transfer');` Then check `qty_remaining` on source lot decreased by 2; new dest lot exists at location B with qty_remaining=2; 2 stock_movement rows exist (transfer_out + transfer_in) | db | demo tenant + 2 demo locations + 1 existing lot with qty_remaining ≥ 2 | RPC returns transfer_id UUID; source qty_remaining decreased by 2; dest lot qty_remaining=2; 2 movement rows with movement_type in (`transfer_out`, `transfer_in`); **no `stock_lot_check` violation on either leg** | All 4 sub-conditions PASS |
| 4 | **`next_lens_variant_display_id` anon-reject.** From a session with `SET LOCAL request.jwt.claims = '{"role":"anon"}'::text;` call `SELECT next_lens_variant_display_id();`. Then in a clean session WITHOUT setting claims, call again. | db | anon-role JWT claim AND null-claims session | Both calls raise `42501` SQLSTATE with message containing `Unauthorized` | exception with ERRCODE='42501' on BOTH cases |
| 5 | **`record_adjustment_found` positive delta.** Call `SELECT record_adjustment_found(<demo_tenant>, <demo_variant>, <demo_location>, 4, 'smoke adj_found', <demo_user>, 0, NULL, NULL);` Then check stock_lot row created with `origin_type='adjustment_found', qty_received=4, qty_remaining=4`; stock_movement row with `movement_type='adjustment_found' qty_delta=+4`; tenant_lens_stock qty_on_hand incremented by 4 (or new row inserted). | db | demo tenant + demo variant + demo location | RPC returns movement_id UUID; all 3 rows exist as described; **no `stock_lot_check` violation** | All 3 sub-conditions PASS |
| 6 | **`effective_price` returns NUMERIC for a demo offering.** Pick a published demo supplier_catalog_offering, call `SELECT effective_price(<offering_id>, <demo_tenant>, now());` | db | demo offering with price_amount | Returns NUMERIC, not NULL, not exception | scalar non-NULL NUMERIC |

After all 6 cases pass, executor optionally cleans up test rows it created (selective DELETE by `notes ILIKE 'smoke%'` on `stock_movement` + ON DELETE CASCADE / RESTRICT will trickle through where allowed). **Demo-only.** No Prizma rows touched. Cleanup is OPTIONAL — leftover demo smoke rows are not a stop condition.

If any of Cases 1–5 FAIL → STOP per §5 trigger #3 or #4 or #6 or general criterion-mismatch. Do NOT proceed to close the SPEC.

---

## Appendix A — Out-of-Scope but observed during pre-flight

Items the executor MAY observe during smoke that are NOT part of this SPEC. Log to FINDINGS.md, do not act:

- **`is_platform_super_admin()` has no `SET search_path` set** (Probe 9 confirmed). Reviewer I-7. Out of scope per Brief §3.
- **CLAUDE.md §0.5 prose stale** (lens-catalog-admin.html / employees.html — Sentinel M-NEW-33-4). Bundle with future architect prose session.
- **FUNNEL_ROADMAP P2.3 row stale** (Sentinel M-NEW-34-1). Bundle with future Site Overseer pass.
- **Cowork-VM truncation artifacts on `scripts/checks/*`** (Sentinel L-NEW-34-2). Zero impact on this SPEC's run from Windows-desktop / Claude Code.

---

## Appendix B — Pinned signatures and bodies (verbatim from §0 probes)

### B-1: 10 SECDEF function signatures (for Fix #4 REVOKE/GRANT lines)

```text
effective_price(p_offering_id uuid, p_tenant_id uuid, p_as_of_ts timestamp with time zone)
m1_create_receipt_from_box(p_tenant_id uuid, p_supplier_id uuid, p_delivery_note_number text, p_lines jsonb, p_box_id uuid, p_box_supplier_barcode text, p_supplier_number text, p_confirmed_by uuid)
m9_lens_received_for_sale_order_trg_fn()
next_lens_variant_display_id()
next_lot_number(p_tenant_id uuid)
next_receipt_number(p_tenant_id uuid, p_supplier_number text)
next_transfer_number(p_tenant_id uuid)
record_adjustment_found(p_tenant_id uuid, p_variant_id uuid, p_location_id uuid, p_qty_found integer, p_reason text, p_performed_by uuid, p_sph numeric, p_cyl numeric, p_add_value numeric)
record_stock_movement(p_tenant_id uuid, p_source_lot_id uuid, p_variant_id uuid, p_location_id uuid, p_movement_type text, p_qty_delta integer, p_sale_order_id uuid, p_customer_return_id uuid, p_purchase_receipt_id uuid, p_transfer_id uuid, p_adjustment_id uuid, p_cost_basis numeric, p_vat_amount numeric, p_fx_rate_snapshot numeric, p_performed_by uuid, p_notes text, p_sph numeric, p_cyl numeric, p_add_value numeric)
record_transfer(p_tenant_id uuid, p_from_location_id uuid, p_to_location_id uuid, p_variant_id uuid, p_qty_sent integer, p_source_lot_id uuid, p_initiated_by uuid, p_notes text)
```

### B-2: stock_movement_type CHECK values

```text
ARRAY['sale','receipt','transfer_out','transfer_in','adjustment_found','adjustment_lost','customer_return']
```

CREATION movements (orchestrator just created the lot; SKIP qty_remaining UPDATE): `'receipt'`, `'transfer_in'`, `'adjustment_found'`.
CONSUMING movements (existing lot; KEEP qty_remaining UPDATE): `'sale'`, `'transfer_out'`, `'adjustment_lost'`, `'customer_return'`.

---

*End of SPEC. Author: opticup-strategic. v3 template. 2026-05-15 — Full-Auto Pipeline.*

---

## Amendment #1 — Fix #9 added (2026-05-15, mid-Pipeline)

**Authored by:** opticup-strategic (Foreman) at ~07:30 UTC, after the executor's escalation file `modules/Module 1 - Inventory Management/escalations/2026-05-15T07-25-00Z_record_transfer_arg_mismatch.md`.

**Context:** During functional smoke Case 3, the executor surfaced a pre-existing 42883 runtime error inside `record_transfer`'s body — both inner `record_stock_movement` calls pass 17 positional args, but the function signature has 19 params (last 3 = `p_sph`, `p_cyl`, `p_add_value` with DEFAULTs). PG types position 17 as `p_sph numeric` and rejects the `p_notes` (text) value passed there. Phase 1A never invoked `record_transfer` (smoke was a single lens_brand INSERT), so this DOA bug went undetected. Defect class is identical to Fix #1 (orchestrator runtime defect, smoke-skip caused undetection).

**Foreman decision:** authorize Fix #9 in-place rather than defer to a follow-up SPEC. Rationale:
- Brief §1 Purpose: "All three orchestrator RPCs chain through it." Leaving 1 of 3 broken contradicts the stated purpose of the Pipeline.
- Brief §5 criterion 10 + Locked Decision #3 mandate functional smoke for ALL three orchestrators.
- Same defect class as Fix #1 (the SPEC was already authorized to fix this defect class).
- Iron Rule 32 still **None** — Fix #9 uses CREATE OR REPLACE FUNCTION (in-place body change), no DROPs, no destructive ops.
- Cost: ~5 min in-place vs ~30 min follow-up Pipeline + Phase 1B drag.

**Scope additions (deltas vs original SPEC):**

### §3 — new success criterion 24

| 24 | `record_transfer` no longer raises 42883 mid-body | Smoke Case 3 completes; demo loc A → loc B transfer of qty=2 returns transfer_id UUID; source lot qty_remaining decreased by 2; dest lot qty_remaining = 2; 2 stock_movement rows (transfer_out + transfer_in) exist with `transfer_id` = the new transfer | §14 Case 3 (db) |

### §4 — Autonomy Envelope add 6th fix domain

The executor is pre-authorized (under Amendment #1) to apply a 6th DDL block via `mcp__supabase__apply_migration`:
6. `record_transfer` body fix (CREATE OR REPLACE inside the existing 8-param signature; no signature change; positional-args inner calls expanded to 19 per the canonical pattern used by `m1_create_receipt_from_box` and `record_adjustment_found`).

### §10 — Commit Plan insert Commit 8.5

Commit 8.5 (new, between original Commits 8 and 9): `fix(m1,rpc): record_transfer — pass 19 positional args to inner record_stock_movement calls (Amendment #1)`. Apply MIGRATION.md Block #6 via `apply_migration name=m1a_record_transfer_arg_mismatch_fix`. Update MIGRATION.md Applied Log row #6.

### §6 / §9 — Rollback + Expected Final State

ROLLBACK.md Block #6 DOWN added (restores pre-amendment 17-arg body — note: rolling back re-introduces the runtime bug; DOWN is for git-symmetry only).

### Smoke continuation

After Commit 8.5 lands, executor resumes from Case 3 (smoke). Cases 1, 2 already PASS pre-amendment. Cases 3, 4, 5, 6 run post-amendment.

**Foreman signature:** opticup-strategic, single-chat Full-Auto Pipeline, 2026-05-15 07:30 UTC. No Daniel input received (Daniel offline; Foreman's judgment-call within Brief-stated purpose).

*End of Amendment #1.*
