# Module Brief — M1A_OPERATIONS_RPCS_FIX

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Foreman review
**Pipeline:** Full Auto Pipeline (single chat, end-to-end)
**Branch:** `develop`. Daniel-only merge to main after Pipeline closes 🟢.

---

## 1. Purpose

Two independent post-Phase-1A reviews (Strategic + Code) surfaced a consolidated set of bugs in the M1 Lens Inventory operations layer that block Phase 1B from starting. This SPEC fixes them all in one shot.

**The audit chain:** Phase 1A smoke (criterion 22) was a single `INSERT INTO lens_brand` + cross-tenant read + DELETE. **No operations-layer RPC was ever invoked.** Live inspection by both reviewers found that:

- `record_stock_movement` aborts on the first call (CHECK violation on `stock_lot`) — and all three orchestrator RPCs chain through it.
- `tenant_lens_stock` has no UNIQUE constraint matching its `ON CONFLICT` clause — first insert raises `42P10`.
- 10 SECURITY DEFINER functions did not inherit the post-`SECURITY_HOTFIX_2026_05_13` `REVOKE EXECUTE FROM anon` discipline.
- `next_lens_variant_display_id()` is anon-callable with no tenant guard or rate limit.
- `lens-catalog-import` has no `config.toml` block, so a CLI redeploy could silently flip `verify_jwt`.
- K5 view `v_suppliers_for_m9` retained default anon GRANTs (Iron Rule 13 contract violation).
- K3 trigger queue lacks an idempotency key — transaction retries would double-enqueue.

This SPEC closes all of the above as a single Pipeline run. **Scope is bug-fix-only.** No new features. No architectural decisions. No `purchase_order` / `supplier_debt` schema work (separate decision, tracked under the `Phase 1B split` discussion).

---

## 2. Scope — In

A single migration + a single config-toml edit + a mandatory functional smoke test on demo. The SPEC authors split the work into logically separate commits but the deliverable is one Pipeline run.

### Fix #1 — `record_stock_movement` qty_remaining double-add (Strategic B-01, CRITICAL)

**Bug:** `migration 5/5:146–147` unconditionally does `UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta`. Correct for consuming movements (sale, transfer_out, adjustment_lost) where the lot pre-exists. **Wrong** for creation movements (receipt, transfer_in, adjustment_found), where the caller has just INSERTed the lot with `qty_remaining = qty_received = X` and then calls `record_stock_movement(qty_delta=+X)` — the UPDATE makes `qty_remaining = 2X`, violating the `stock_lot_check` CHECK.

**Fix:** Branch on `p_movement_type`:
- For **consuming** movements (`sale`, `transfer_out`, `adjustment_lost`, `customer_return` if removing) — keep the existing `UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta` (delta is negative or positive depending on context).
- For **creation** movements (`receipt`, `transfer_in`, `adjustment_found`) — SKIP the lot UPDATE. The caller (orchestrator) just created the lot with the correct qty_remaining; the movement row is the audit ledger only.

The Module Strategist confirms the exact `movement_type` enum values by reading `pg_type` + the RPC signatures live before authoring the SQL.

### Fix #2 — `tenant_lens_stock` UNIQUE for ON CONFLICT (Strategic B-02, CRITICAL)

**Bug:** `record_stock_movement` lines 148–153 do `INSERT INTO tenant_lens_stock(...) ON CONFLICT (tenant_id, variant_id, location_id, sph, cyl, add_value) DO UPDATE …`. Live `pg_constraint` shows zero `contype='u'` rows on `tenant_lens_stock`. Postgres raises `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`.

**Fix:** Add a UNIQUE index handling the nullable columns. The columns `cyl` and `add_value` are nullable; the canonical approach is:

```sql
CREATE UNIQUE INDEX tenant_lens_stock_unique_idx
ON tenant_lens_stock (
  tenant_id,
  variant_id,
  location_id,
  sph,
  COALESCE(cyl, -999),
  COALESCE(add_value, -999)
);
```

Module Strategist may instead use Postgres 15+'s `NULLS NOT DISTINCT` if it produces a cleaner semantic (functional equivalent). Confirm via live probe of which Postgres version Supabase is running before choosing (EXECUTION_REPORT confirmed PG17, so `NULLS NOT DISTINCT` is available).

### Fix #3 — K5 view anon GRANT revoke (Strategic A-01 + Reviewer E-2, HIGH)

**Bug:** Migration 5/5 line 383 grants SELECT to authenticated + service_role but never `REVOKE`s the default Postgres grants that anon/PUBLIC receive when a view is created in the `public` schema. `aclexplode` over `v_suppliers_for_m9.relacl` returns `SELECT,INSERT,UPDATE,DELETE,TRUNCATE,…` to `anon`, `authenticated`, `PUBLIC`. With `security_invoker=on` + suppliers RLS this returns 0 rows to anon in practice — but the GRANT itself is the Iron Rule 13 contract violation and a latent risk if RLS regresses.

**Fix:**

```sql
REVOKE ALL ON v_suppliers_for_m9 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON v_suppliers_for_m9 TO authenticated, service_role;
```

### Fix #4 — REVOKE EXECUTE on 10 SECURITY DEFINER functions (Reviewer C-1/C-2/C-3, HIGH+CRITICAL)

**Bug:** All 10 Phase 1A SECURITY DEFINER functions are `EXECUTE`-able by `anon`, `authenticated`, `PUBLIC`. The `SECURITY_HOTFIX_2026_05_13` SPEC established the project-wide canonical pattern of `REVOKE EXECUTE` on mutators 36 hours before Phase 1A closed; Phase 1A did not inherit it. Advisor lints 0028 + 0029 fire.

**Special case — `next_lens_variant_display_id()` (Reviewer C-2, CRITICAL):** zero-parameter function, no JWT check inside, anon-callable, increments a global sequence. Anyone can waste display IDs (`LV-NNNNNN`) by hammering the RPC.

**Fix — single migration block:**

```sql
-- 10 functions covered: 8 user-callable + 1 zero-arg sequence + 1 trigger fn
REVOKE EXECUTE ON FUNCTION
  effective_price(...),                  -- signature confirmed from pg_proc.oid
  m1_create_receipt_from_box(...),
  next_lens_variant_display_id(),
  next_lot_number(uuid),
  next_receipt_number(uuid),
  next_transfer_number(uuid),
  record_adjustment_found(...),
  record_stock_movement(...),
  record_transfer(...),
  m9_lens_received_for_sale_order_trg_fn()
FROM PUBLIC, anon, authenticated;

-- Selectively re-grant to authenticated for the 8 user-callable RPCs
GRANT EXECUTE ON FUNCTION
  effective_price(...),
  m1_create_receipt_from_box(...),
  next_lot_number(uuid),
  next_receipt_number(uuid),
  next_transfer_number(uuid),
  record_adjustment_found(...),
  record_stock_movement(...),
  record_transfer(...)
TO authenticated;

-- next_lens_variant_display_id stays REVOKEd from anon/authenticated.
-- It is called only from the Platform Catalog Admin screen which runs as a platform-admin
-- session; the screen invokes the EF lens-catalog-import (SERVICE_ROLE caller) or
-- internal admin context. Add belt-and-suspenders: a JWT-not-null guard inside the
-- function body that raises 42501 on anon callers.

-- m9_lens_received_for_sale_order_trg_fn stays REVOKEd entirely.
-- It is a trigger function; Postgres invokes it via trigger context (not via REST),
-- so no role needs EXECUTE permission on it.
```

The Module Strategist must read `pg_proc` live to get the exact parameter signatures for each function (overloads exist for some) and pin them in the SPEC. **Do not author the SPEC blind from the Brief — probe live.**

### Fix #5 — `next_lens_variant_display_id()` JWT-not-null guard (Reviewer C-2, defense-in-depth)

Add at the top of the function body:

```sql
IF current_setting('request.jwt.claims', true) IS NULL
   OR (current_setting('request.jwt.claims', true)::json ->> 'role') = 'anon'
THEN
  RAISE EXCEPTION 'Unauthorized'
    USING ERRCODE = '42501';
END IF;
```

(Module Strategist confirms the exact pattern by looking at how `is_platform_super_admin()` or another existing SECURITY DEFINER gate handles this; reuse the project's existing pattern rather than inventing a new one.)

### Fix #6 — `lens-catalog-import` config.toml block (Reviewer F-1, HIGH)

**Bug:** `supabase/config.toml` has explicit `verify_jwt` blocks for 24 EFs but NOT for `lens-catalog-import`. A future `supabase functions deploy lens-catalog-import` could silently flip it to `false`. Combined with the fail-open gate at `index.ts:73` (`if (callerAuth) { … check … }` — empty Authorization skips the gate), this becomes a public catalog mutator under service-role.

**Fix:** Add to `supabase/config.toml` (mirror `submit-lead`'s pattern at line ~480):

```toml
[functions.lens-catalog-import]
# Platform-admin-only mutator. Bulk-INSERTs into lens_brand / lens_design / lens_variant
# under SERVICE_ROLE_KEY. Gate is is_platform_super_admin() RPC inside the function body.
# verify_jwt = true is BELT — ensures the Supabase gateway rejects unauthenticated requests
# before reaching the function. SUSPENDERS is the in-body check at index.ts:73 (inverted to
# fail-closed in this same SPEC).
verify_jwt = true
```

### Fix #7 — `lens-catalog-import` invert gate to fail-closed (Reviewer F-2, MEDIUM)

**Bug:** `index.ts:73` reads `if (callerAuth) { … is_platform_super_admin check … }`. Empty/missing `Authorization` header skips the gate entirely.

**Fix:** Invert to fail-closed pattern (mirror `submit-lead`):

```typescript
// BEFORE (fail-open):
if (callerAuth) {
  const { data: isAdmin } = await sb.rpc('is_platform_super_admin');
  if (!isAdmin) return new Response('Forbidden', { status: 403 });
}

// AFTER (fail-closed):
if (!callerAuth) {
  return new Response('Unauthorized', { status: 401 });
}
const { data: isAdmin } = await sb.rpc('is_platform_super_admin');
if (!isAdmin) {
  return new Response('Forbidden', { status: 403 });
}
```

Module Strategist confirms the actual `index.ts:73` shape live before editing — line numbers may have shifted.

### Fix #8 — K3 queue idempotency UNIQUE (Reviewer D-3, MEDIUM)

**Bug:** `pending_lens_advancement_queue` has no UNIQUE on `stock_movement_id`. A transaction retry on a `stock_movement` insert would re-fire the AFTER INSERT trigger and double-enqueue.

**Fix — two parts:**

```sql
-- Part A: add the UNIQUE index
CREATE UNIQUE INDEX pending_lens_advancement_queue_stock_movement_unique
ON pending_lens_advancement_queue (stock_movement_id);

-- Part B: update the trigger to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION m9_lens_received_for_sale_order_trg_fn() …
  INSERT INTO pending_lens_advancement_queue(...)
  VALUES (...)
  ON CONFLICT (stock_movement_id) DO NOTHING;
…
```

The queue is dormant (no consumer yet), so adding the constraint now is safe — no existing rows can violate.

---

## 3. Scope — Out (anti-creep)

Explicitly NOT in this SPEC:

- **`purchase_order` / `purchase_order_line` / `supplier_debt` schema** (Strategic A-02, C-01). Separate decision pending — will land either in Phase 1B (broadened) or as `M1B0_PURCHASE_ORDER_SCHEMA` after this SPEC closes.
- **21 FK indexes** (Reviewer H-1). Pure additive, low-risk; lands in `M1A_FK_INDEXES_PREP_FOR_1B` (separate SPEC, can run parallel to Phase 1B opening).
- **FX conversion in `effective_price`** (Strategic E-01). Israel-only Day-1 means ILS-only; defer to tenant-2 onboarding readiness checklist.
- **The 3 MAX-based sequence generators refactor** (Reviewer A-4). Brittle but functional for internal callers; refactor when Phase 1B adds non-RPC callers.
- **Project-wide RLS `FOR ALL TO public` split** (Reviewer B-4). Cross-module hardening, separate SPEC.
- **`tenant_isolation` `auth_rls_initplan` advisor 0003** (Reviewer H-2). Project-wide pattern; separate perf SPEC.
- **`is_platform_super_admin()` missing `SET search_path`** (Reviewer I-7). Pre-existing, not Phase 1A scope.
- **`v_suppliers_for_m9` `default_courier_company_id` column** (Foreman M1A-SPEC-04). M9 SPEC scope.
- **The legacy frames-era `goods_receipts` / `purchase_orders` naming divergence** (Phase 1A Open Question #1). Architectural decision, separate SPEC.
- **Replace `window.prompt()` in catalog admin screen** (Reviewer G-4, executor D12). Phase 1B UX scope.
- **Iron Rule 7 API abstraction in catalog admin** (Reviewer G-1). Document the platform-admin exception in `CONVENTIONS.md` or fold into Phase 1B; not blocking.

---

## 4. Locked Decisions

Decisions Daniel + Architect already made; SPEC author must not relitigate:

| # | Decision | Source |
|---|---|---|
| 1 | Fix-first, before any Phase 1B work | Daniel 2026-05-15 (this Brief's authorization) |
| 2 | Single Pipeline run for all 8 fixes (not 8 separate SPECs) | Architect — keeps blast radius narrow, single rollback path |
| 3 | Mandatory functional smoke test on demo end-to-end before SPEC close | Architect — root cause of bugs being undetected; non-negotiable |
| 4 | No `purchase_order` / `supplier_debt` schema in this SPEC | Architect — separate decision pending |
| 5 | All work on `develop`; Daniel merges to main after SPEC closes 🟢 | Project policy |
| 6 | SPEC declares `Destructive Operations: None` (no DROPs, no TRUNCATEs, no rebases) | Iron Rule 32 — gate will fail if violated |

---

## 5. Success Criteria

The SPEC must define success criteria covering at minimum:

1. **`record_stock_movement` no longer raises `stock_lot_check` violation on creation movements.** Verified by demo functional smoke: INSERT a stock_lot with qty_remaining=5, call record_stock_movement with qty_delta=+5 movement_type='receipt', post-check `qty_remaining = 5` (not 10).
2. **`tenant_lens_stock` ON CONFLICT no longer raises `42P10`.** Verified by demo functional smoke: call `m1_create_receipt_from_box` end-to-end with one stock line and one custom-per-customer line.
3. **`v_suppliers_for_m9` no longer has anon GRANTs.** Verified by `aclexplode` query post-migration — zero rows containing `anon` or `PUBLIC`.
4. **All 10 SECURITY DEFINER functions are not anon-EXECUTE-able.** Verified by `aclexplode` query — zero rows where `grantee IN ('anon','PUBLIC')` and `privilege_type='EXECUTE'`.
5. **`next_lens_variant_display_id()` raises 42501 when called with anon JWT.** Verified by demo test calling under an anon JWT context.
6. **`supabase/config.toml` contains a `[functions.lens-catalog-import]` block with `verify_jwt = true`.** Verified by `grep` post-edit.
7. **`lens-catalog-import/index.ts` gate is fail-closed.** Verified by reading the file post-edit + sending an anon request returning 401.
8. **`pending_lens_advancement_queue` has a UNIQUE on `stock_movement_id`.** Verified by `pg_indexes` query.
9. **K3 trigger uses `ON CONFLICT (stock_movement_id) DO NOTHING`.** Verified by `pg_get_functiondef`.
10. **Functional smoke test on demo:** 1 goods receipt with 2 lines (1 stock + 1 custom-per-customer), 1 transfer between locations, 1 adjustment_found, 1 `effective_price` call. All complete without error. Smoke output captured in TEST_REPORT.md inside the SPEC folder.
11. **Advisor lints 0028 + 0029 — Phase 1A objects no longer flagged.** Verified by `mcp__supabase__get_advisors` SECURITY post-run.
12. **No Prizma data was written.** Verified by `git diff` showing only schema/code; all functional smoke ran on demo tenant UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
13. **`npm run verify:integrity` exit 0 on HEAD post-Pipeline.**
14. **Iron Rules 1, 11, 13, 14, 15, 18, 22, 23, 31, 32 — no new violations introduced.** Verified by `npm run verify --full`.
15. **Commits 6–10 (estimated), all on `develop`, all conventional-commit format, all single-concern.**
16. **`docs/GLOBAL_MAP.md` updated with the new RPC grants discipline note.** Single line addition referencing this SPEC.
17. **EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW all written inside the SPEC folder per the folder-per-SPEC protocol.**

The Module Strategist may add additional measurable criteria. **No criterion should be ambiguous** — "looks good" is not measurable.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

Strategic Proposal #1 from the FOREMAN_REVIEW + Strategic Review Author Proposal #5 both apply here. Run targeted live-state probes BEFORE writing the SPEC:

```sql
-- Probe 1: exact signatures of the 10 functions to be REVOKEd
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname IN (
  'effective_price','m1_create_receipt_from_box','next_lens_variant_display_id',
  'next_lot_number','next_receipt_number','next_transfer_number',
  'record_adjustment_found','record_stock_movement','record_transfer',
  'm9_lens_received_for_sale_order_trg_fn'
);

-- Probe 2: exact movement_type enum values
SELECT enumlabel FROM pg_enum
JOIN pg_type t ON t.oid = pg_enum.enumtypid
WHERE t.typname = 'stock_movement_type'
ORDER BY enumsortorder;
-- (replace 'stock_movement_type' with the actual enum name — Module Strategist confirms
-- by reading the column definition first)

-- Probe 3: current shape of tenant_lens_stock
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenant_lens_stock' AND table_schema='public'
ORDER BY ordinal_position;

-- Probe 4: confirm no existing UNIQUE on tenant_lens_stock
SELECT conname FROM pg_constraint WHERE conrelid = 'tenant_lens_stock'::regclass AND contype='u';

-- Probe 5: Postgres version for NULLS NOT DISTINCT availability
SELECT version();

-- Probe 6: current grants on v_suppliers_for_m9
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name = 'v_suppliers_for_m9';

-- Probe 7: current acl on the 10 functions
SELECT proname, (aclexplode(proacl)).grantee::regrole, (aclexplode(proacl)).privilege_type
FROM pg_proc WHERE proname IN ( /* 10 names */ );

-- Probe 8: current shape of pending_lens_advancement_queue
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'pending_lens_advancement_queue';

-- Probe 9: current m9_lens_received_for_sale_order_trg_fn body
SELECT pg_get_functiondef('m9_lens_received_for_sale_order_trg_fn'::regproc);

-- Probe 10: current lens-catalog-import config in config.toml
-- via `grep -n "lens-catalog\|submit-lead" supabase/config.toml`
```

Each probe result becomes a baseline in the SPEC's §0 "Pre-Authoring Reality Check" section. The SPEC body references those baselines symbolically. Skipping this step is the single largest source of mid-execution adaptations (Strategic Proposal #1 from FOREMAN_REVIEW).

---

## 7. Iron Rules in Sharp Focus

Most likely to be tested in this SPEC:

- **Rule 11 (Sequential numbers via RPC)** — when re-applying GRANTs, ensure the 3 MAX-based sequence generators retain `authenticated` EXECUTE (they are called by internal RPCs but also potentially by the future PO/POs List screen).
- **Rule 13 (Views-only for external reads)** — A-01 fix is a direct enforcement of this rule.
- **Rule 14 / 15 / 18** — no schema changes that violate these.
- **Rule 22 (Defense-in-depth)** — Fix #5 adds the JWT-not-null guard.
- **Rule 23 (No secrets)** — confirm no service-role key is referenced anywhere in the new migration body.
- **Rule 31 (Integrity Gate)** — every commit must pass.
- **Rule 32 (Destructive Ops Gate)** — SPEC declares `None`. No DROPs, no TRUNCATEs, no rebases. The K3 trigger update uses `CREATE OR REPLACE FUNCTION` (not DROP + CREATE) per project convention.

---

## 8. Anti-Patterns (Things to Avoid)

- **Authoring the SPEC blind from this Brief without live-state probes.** Strategic Proposal #1 — every signature, every column type, every enum value must come from `pg_proc` / `information_schema` / `pg_enum`, NOT from this Brief's pseudocode.
- **Combining the K3 trigger function update with a DROP TRIGGER + CREATE TRIGGER cycle.** Use `CREATE OR REPLACE FUNCTION` only; trigger declaration stays as-is.
- **Bulk REVOKE without explicit signatures.** Postgres requires the function signature for REVOKE/GRANT — overloads can cause silent misses.
- **Skipping the functional smoke test.** This entire SPEC exists because Phase 1A skipped it. No close without it.
- **Touching Prizma in the smoke test.** Demo tenant only.
- **Forgetting `js/shared.js` / `js/shared-field-map.js` updates** — none required for this SPEC (no new tables, no new FIELD_MAP entries), but if the Module Strategist surfaces one, log it as a finding.
- **Modifying any of the 7 mockups, the 16 D-M1 decisions, the Phase 1B stub, the Phase 1 Brief.** Bug fix only; no architectural movement.
- **Modifying CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT.** The SPEC's docs-only effect is on `docs/GLOBAL_MAP.md` (one-line addition) + the SPEC folder itself.

---

## 9. Open Questions for the Module Strategist

These are the decisions the Module Strategist resolves with Daniel during SPEC authoring (if at all). Architect's recommendation in italics — Module Strategist may override only with evidence.

1. **`NULLS NOT DISTINCT` (PG15+) vs `COALESCE(cyl, -999), COALESCE(add_value, -999)` for the `tenant_lens_stock` UNIQUE index?** *Recommendation: `NULLS NOT DISTINCT` — cleaner semantic, no sentinel value risk, PG17 confirmed.* If the rest of the schema uses COALESCE patterns elsewhere, prefer consistency.

2. **Branch on `p_movement_type` inside `record_stock_movement` (Fix #1) — single CASE/IF or two-function split?** *Recommendation: single IF block at line ~145, inline, no new function. Keep the orchestrators unchanged.* Reduces blast radius of the fix.

3. **JWT-not-null guard at `next_lens_variant_display_id()` (Fix #5) — raise or silent-skip?** *Recommendation: RAISE 42501 'Unauthorized'.* Silent-skip masks misuse; raise gives clear telemetry.

4. **The functional smoke — script vs SQL run via MCP execute_sql?** *Recommendation: SQL run via MCP, captured in TEST_REPORT.md.* Avoids script-execution-env mismatch with the executor.

5. **Should the SPEC also add the missing `SET search_path = 'public'` to `is_platform_super_admin()` (Reviewer I-7)?** *Recommendation: NO — out of scope (pre-existing, project-wide hardening territory).* Mention in FINDINGS as a future-work pointer.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/architecture-brief/STRATEGIC_REVIEW_REPORT.md` | Source of Strategic findings A-01, B-01, B-02 |
| `modules/Module 1 - Inventory Management/architecture-brief/CODE_REVIEW_REPORT.md` | Source of Reviewer findings C-1, C-2, C-3, D-3, E-2, F-1, F-2 |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md` | The original SPEC being amended |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/EXECUTION_REPORT.md` | What was shipped |
| `supabase/migrations/20260514180*.sql` | The 5 Phase 1A migrations to inspect |
| `supabase/functions/lens-catalog-import/index.ts` | Source of Fix #6 + #7 |
| `supabase/config.toml` | Mirror `submit-lead`'s block pattern for Fix #6 |
| `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md` | Canonical pattern for REVOKE/GRANT inheritance |
| `CLAUDE.md` §5 Rule 15 | Canonical RLS pattern (used to confirm JWT-claim guard syntax for Fix #5) |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | D-M1-01..16 — confirm no architectural decision is touched |

---

## 11. Hand-off Note

This Brief feeds the **Full Auto Pipeline** in a single Claude Code chat. The sibling Activation Prompt (`M1A_OPERATIONS_RPCS_FIX_ACTIVATION_PROMPT.md`) is what Daniel pastes.

Pipeline order:
1. `opticup-strategic` reads this Brief + runs the §6 pre-flight probes + authors `SPEC.md` inside `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/`.
2. `opticup-strategic` hands off to `opticup-executor` (same chat).
3. `opticup-executor` runs the SPEC end-to-end. Each fix is its own commit on `develop`. Functional smoke runs on demo before SPEC close.
4. `opticup-executor` writes `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` inside the SPEC folder.
5. `opticup-reviewer` reads the execution output and writes `REVIEW.md` (read-only verification — re-runs the §5 success criteria checks against live state).
6. `opticup-strategic` reads everything and writes `FOREMAN_REVIEW.md` + verdict.
7. Pipeline closes with ONE Hebrew status line to Daniel: `M1A_OPERATIONS_RPCS_FIX [🟢/🟡/🔴] — ...`

Architect stays out unless: cross-module decision surfaces (unlikely — bug-fix only), scope change requested (anti-pattern), strategic blocker. Otherwise the Pipeline runs end-to-end and returns.

---

*End of Brief. Bug-fix-only SPEC. No architectural movement. Mandatory functional smoke before close.*
