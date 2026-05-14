# SPEC — M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md`
> **Authored by:** opticup-strategic (Module Strategist / Foreman)
> **Authored on:** 2026-05-14
> **Module:** 1 — Inventory Management (Lens Expansion)
> **Phase:** 1A (Schema + Platform Catalog Admin) — first half of Phase 1; sibling SPEC `M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/` ships the 6 customer-facing screens after this lands.
> **Author signature:** Claude Code session 2026-05-14 (post-Brief seal commit `b4a3745`)
> **Brief reference:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1_BRIEF.md` (commit `b4a3745`)

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14 (commit `b4a3745`).
- Handoff (`M1_EXPANSION_SESSION_HANDOFF.md`), 11 D-M1 decisions (`.claude/skills/opticup-architect/references/decisions/M1.md`), M1↔M9 overlap report (`M1_M9_OVERLAP_REPORT.md`, 581 lines), all 7 mockups, and existing `modules/goods-receipts/` (20 files, 4,473 LOC) all reviewed.
- 3 most recent `FOREMAN_REVIEW.md` files in this module read end-to-end: `STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27`, `STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27`, `PERMISSIONS_PHASE3_CSS_GATING_2026_04_27`.
- Cross-Reference Check (Rule 21) completed 2026-05-14 — see §1.5 below. **0 hard collisions.**
- Identifier verification (lesson from STUDIO_BRANDS_VISIBILITY_REWORK FOREMAN_REVIEW Proposal B): `js/shared.js:5-45` enumerated; `T.RECEIPTS = 'goods_receipts'` confirmed canonical for legacy frames flow; **no `T.GOODS_RECEIPTS` constant exists** — new constants below use the established prefix-pattern.
- Live-state baseline probe (lesson from STOREFRONT_SYNC_HIERARCHY_FIX Proposal A): existing tables `goods_receipts`, `goods_receipt_items`, `purchase_orders`, `purchase_order_items`, `suppliers`, `currencies`, `tenants` confirmed in live DB via `docs/GLOBAL_SCHEMA.sql` lines 73-98. `lab_jobs` and `shipping_boxes` confirmed NOT YET BUILT (M9 future scope) — this SPEC declares the FK columns directionally so M9 can wire them when built.
- Brief §10 path error: `modules/Module 1 - Inventory Management/docs/goods-receipts/` does NOT exist; actual path is `modules/goods-receipts/` at repo root. Executor uses the actual path.
- Pre-existing untracked files survey (`git status --porcelain | grep '^??'`): 80+ untracked architect-brief files in M1.5/M2/M3/M4/M7/M9/M13 + the `__LAUNCH_PLAN_DRAFT__/` folder. **Executor leaves all of these alone** and uses selective `git add` by filename throughout (codified per `MIGRATION_*` SPECs).
- Cross-section consistency scan (lesson from STUDIO_BRANDS_VISIBILITY_REWORK Proposal A): §3 ↔ §4 ↔ §5 ↔ §7 ↔ §8 ↔ §9 verified internally consistent on first pass; one specific risk noted in §5 stop-trigger.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File | Metric | Value (captured 2026-05-14) |
|---|---|---|---|
| `BASE_SHARED_TCONST` | `js/shared.js` | T-constant count (lines matching `^\s+[A-Z_]+:\s+'`) | 40 entries (lines 5–45) |
| `BASE_GLOBAL_SCHEMA_LINES` | `docs/GLOBAL_SCHEMA.sql` | `wc -l` | 678 lines |
| `BASE_GR_FOLDER_FILES` | `modules/goods-receipts/` | `*.js` file count | 20 files |
| `BASE_GR_FOLDER_LOC` | `modules/goods-receipts/` | total LOC across `*.js` | 4,473 LOC |
| `BASE_M1_SPECS_COUNT` | `modules/Module 1 - Inventory Management/docs/specs/` | folder count | 10 sealed SPECs |

---

## 1. Goal

Ship the complete sealed 18-table M1 Lens Expansion schema (DB tables, RLS policies, indexes), the 8 mandatory atomic RPCs (`record_stock_movement`, `record_transfer`, `record_adjustment_found`, `next_lot_number`, `next_transfer_number`, `next_receipt_number`, `effective_price`, `m1_create_receipt_from_box`), 1 Postgres trigger (`m9_lens_received_for_sale_order` AFTER INSERT on `stock_movement`), 1 View (`v_suppliers_for_m9` — K5 contract), the Platform Catalog Admin screen (mockup #5) for Optic Up team only, and the structured-Excel bulk import endpoint. After this SPEC closes, the Optic Up team can seed the global lens catalog (brands → designs → variants → supplier offerings) so that Phase 1B can build the 6 customer-facing screens against real data.

---

## 1.5 Cross-Reference Check (Iron Rule 21)

Comprehensive cross-reference sweep completed 2026-05-14 against `docs/GLOBAL_SCHEMA.sql` (rev 2026-04-11), `docs/GLOBAL_MAP.md`, `docs/FILE_STRUCTURE.md`, `js/shared.js`, every `modules/*/docs/db-schema.sql`. Investigation delegated to read-only sub-agent.

**Results:**

| Category | Count | Status |
|---|---|---|
| New table names (lens_brand, lens_design, lens_variant, supplier_brand_distribution, supplier_catalog_offering, pricing_overlay, tenant_active_offerings, tenant_lens_stock, tenant_location, stock_lot, stock_movement, stock_transfer, vat_rates, supplier_permissions, change_approval_log, purchase_receipt, purchase_receipt_line) | 17 | ✅ all greenfield, 0 collisions |
| New RPC / trigger / view names (record_stock_movement, record_transfer, record_adjustment_found, next_lot_number, next_transfer_number, next_receipt_number, next_lens_variant_display_id, effective_price, m1_create_receipt_from_box, m9_lens_received_for_sale_order, v_suppliers_for_m9) | 11 | ✅ all greenfield, 0 collisions |
| Existing tables to extend (additive ALTER TABLE only) | 1 | `tenants` — add `base_currency_code TEXT DEFAULT 'ILS'` |
| Existing tables referenced read-only | 4 | `suppliers`, `currencies`, `goods_receipts` (legacy, untouched), `tenants` |
| Existing RPCs reused (signatures verified) | 2 | `next_po_number(p_tenant_id, p_supplier_number)`, `next_return_number(p_tenant_id, p_supplier_number)` — pattern reference for new sequential generators |
| New JS T-constants to add to `js/shared.js` | 17 | LENS_BRANDS, LENS_DESIGNS, LENS_VARIANTS, SUPPLIER_BRAND_DIST, SUPPLIER_CATALOG, PRICING_OVERLAY, TENANT_ACTIVE_OFFERINGS, TENANT_LENS_STOCK, TENANT_LOCATIONS, STOCK_LOTS, STOCK_MOVEMENTS, STOCK_TRANSFERS, VAT_RATES, SUPPLIER_PERMS, CHANGE_APPROVAL, PURCHASE_RECEIPT, PURCHASE_RECEIPT_LINE |
| FIELD_MAP entries to add (Iron Rule 5) | per-column for new tables — see §8 |
| Forward-reference stubs (declared, M9-built) | 2 | `lab_jobs.purchase_receipt_id` FK column (M9 SPEC will create the column when M9 builds the table); `shipping_boxes` — `purchase_receipt.shipping_box_id` declared NULL with no FK clause Phase 1A (FK added in M9 SPEC when shipping_boxes exists) |
| Deprecation backlog | 1 | Legacy `shipments` / `shipment_items` / `modules/shipments/*` / `shipments.html` — M9 SPEC scope, **not touched by this SPEC** |

**Open Question #1 resolution (`goods_receipts` vs `purchase_receipt` naming):** **OPTION (c) — divergence.** New `purchase_receipt` + `purchase_receipt_line` tables introduced for lens receipts; legacy `goods_receipts` + `goods_receipt_items` remain untouched for the frames flow. Code in `modules/goods-receipts/` extended with a `product_category` parameter that dispatches to the right schema. Iron Rule 21 honored at the **code/UI layer** (one goods-receipts component); divergence at the **schema layer** reflects the genuine difference in data shape (frames flat vs lenses FIFO+lot+box). Reasoning: `goods_receipt_items` columns (`barcode, brand, model, color, size, sell_price, is_new_item, po_match_status`) are tightly coupled to flat frames inventory and have minimal overlap with what lens receipts need (`lens_variant_id, qty_received, qty_remaining, unit_cost, fx_rate_snapshot, delivery_note_number, shipping_box_id`). Forcing both into one table would require 10+ NULL-when-frames columns plus dispatch logic — net negative on clarity. (NOTE: `modules/goods-receipts/` code-layer extension is **Phase 1B scope**, not 1A. Phase 1A only ships the new tables + the `m1_create_receipt_from_box` RPC; Phase 1B wires the UI.)

**Open Question #2 resolution (variant ID coding):** UUID `id` PK + `display_id TEXT NOT NULL UNIQUE` generated by new atomic RPC `next_lens_variant_display_id() RETURNS TEXT` with `FOR UPDATE` on a small `lens_variant_display_seq` sequence-state table. Format: `LV-NNNNNN` (zero-padded 6-digit sequential). Not tenant-scoped — `lens_variant` is platform-global (`owner_tenant_id NULL` today per handoff §3 row 5).

**Open Question #4 resolution (bulk import):** Structured Excel (`.xlsx`) upload Phase 1A, parsed server-side by an Edge Function `lens-catalog-import` that reads pre-defined columns (`brand_name, design_name, variant_index, variant_diameter, variant_coating, sph_min, sph_max, cyl_min, cyl_max, add_min, add_max, supplier_name, supplier_sku_code, price_amount, currency_code, is_vat_inclusive`). LLM-based PDF parsing deferred to Phase 2+. Mockup #5's "📥 ייבוא קטלוג מותג שלם" button posts to this EF.

**Verdict:** 🟢 PROCEED — no blocking duplicates. All new names net-new. Existing-table extensions additive only. No renames.

---

## 2. Background & Motivation

M1 today handles only frames inventory. Both M7 (Orders) and M9 (Lab/KDS) are launch-blocked until the lens schema exists — sealed Briefs for M7 and M9 explicitly cite this dependency. This SPEC ships the schema half so the catalog can be seeded by the Optic Up admin team; Phase 1B then builds the 6 customer-facing screens against real data.

The schema went through 3 adversarial review rounds and was sealed 2026-05-12 (handoff §"Three adversarial review rounds"). 11 additional decisions (D-M1-01 → D-M1-15) were locked across two mockup-review sessions on 2026-05-14, including the Architect-recommended 2-sub-phase split. The M1↔M9 overlap report (commit `2199191`) confirmed zero genuine overlaps with M9 and codified 2 additive FK columns + 5 contract functions (K1-K5).

This SPEC is the first concrete code in M1 Lens Expansion. Nothing else in M1 has touched lens domain — historic SPECs in this module covered frames-era hotfixes (`M1_DEBT_VAT_FALLBACK_GUARD`, `M1_FIXES_2026_04_26`, `RECEIPT_FORM_FIXES_FROM_MANAGER`) and storefront/admin permission hardening (`PERMISSIONS_PHASE*`, `STOREFRONT_SYNC_HIERARCHY_FIX`, `STUDIO_BRANDS_VISIBILITY_REWORK`).

---

## 3. Success Criteria (Measurable)

Every criterion has an EXACT expected value. The Executor must capture actuals in `EXECUTION_REPORT.md` §2 and confirm match before close.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, working tree clean (no uncommitted changes, untracked files leave alone) | `git status --short` → only the 80+ pre-existing untracked architecture-brief / launch-plan-draft files; nothing new staged |
| 2 | Branch state at end | On `develop`, working tree clean, pushed to `origin/develop` | `git status` → "nothing to commit, working tree clean"; `git log origin/develop..HEAD` → empty |
| 3 | Commits produced | 8–12 commits, each conventional-commit style with `(m1)` or `(m1,db)` or `(m1,ef)` scope | `git log {START}..HEAD --oneline \| wc -l` → 8–12 |
| 4 | New DB tables created in live (demo + prizma) | 17 new tables: lens_brand, lens_design, lens_variant, supplier_brand_distribution, supplier_catalog_offering, pricing_overlay, tenant_active_offerings, tenant_lens_stock, tenant_location, stock_lot, stock_movement, stock_transfer, vat_rates, supplier_permissions, change_approval_log, purchase_receipt, purchase_receipt_line | Supabase MCP `list_tables` schemas=['public'] → count contains all 17 names |
| 5 | New DB columns on existing tables | 1 new column: `tenants.base_currency_code TEXT DEFAULT 'ILS'` | Supabase MCP `execute_sql` → `SELECT column_name FROM information_schema.columns WHERE table_name='tenants' AND column_name='base_currency_code'` returns 1 row |
| 6 | RLS enabled on all 17 new tables | rls_enabled=true on all 17 | Supabase MCP `execute_sql` → `SELECT count(*) FROM pg_class WHERE relname IN (17 names) AND relrowsecurity=true` → 17 |
| 7 | Tenant-isolation policy on tenant-scoped tables (15 of 17) | Each of 15 tenant-scoped tables has 2 policies: `service_bypass` (service_role) + `tenant_isolation` (public, JWT-claim USING per Iron Rule 15). Platform-owned tables (lens_brand, lens_design, lens_variant — 3 of 17) use the two-permissive-policy pattern (`owner_view` + `public_view`) per handoff §"RLS pattern". `vat_rates` and `currencies` are global reference (no tenant_id) — Iron Rule 14 documented exception. | `execute_sql` against `pg_policies` per table |
| 8 | UNIQUE constraints tenant-scoped (Iron Rule 18) | All UNIQUE on tenant tables include `tenant_id`. Platform tables use `owner_tenant_id`-scoped UNIQUE. Confirmed via `\d <table>` per table | manual `\d` review documented in EXECUTION_REPORT |
| 9 | Atomic RPCs deployed (Iron Rule 1 + 11) | 8 RPCs deployed to live: `record_stock_movement`, `record_transfer`, `record_adjustment_found`, `next_lot_number`, `next_transfer_number`, `next_receipt_number`, `next_lens_variant_display_id`, `effective_price`, `m1_create_receipt_from_box`. (9 total — `next_lens_variant_display_id` added per Q2 resolution.) Each is `SECURITY DEFINER`. Each sequential generator has `FOR UPDATE` lock — verify via `pg_get_functiondef` body inspection. | `execute_sql` → `SELECT proname FROM pg_proc WHERE proname IN (...)` returns 9 |
| 10 | Trigger deployed (K3 contract) | `m9_lens_received_for_sale_order_trg` AFTER INSERT ON `stock_movement` exists; trigger function body checks `NEW.sale_order_id IS NOT NULL AND NEW.purchase_receipt_id IS NOT NULL`; emits NOTIFY or writes to a `pending_lens_advancement` queue table (M9 will consume when built — see §4 autonomy notes) | `execute_sql` → `SELECT tgname FROM pg_trigger WHERE tgrelid='public.stock_movement'::regclass` |
| 11 | View deployed (K5 contract) | `v_suppliers_for_m9` View returns columns `(id, name, supplier_number, contact, phone, email, default_courier_company_id, expected_return_days, tenant_id)`. Read-only via GRANT SELECT TO authenticated, service_role. NOT GRANT TO anon (this is internal staff M9 read). | `execute_sql` → `SELECT viewname FROM pg_views WHERE viewname='v_suppliers_for_m9'` returns 1 row |
| 12 | T-constants in `js/shared.js` | 17 new constants added between `T.SUPPLIERS` and `T.SYNC_LOG` (preserving alpha-grouping where possible). After commit: `BASE_SHARED_TCONST + 17 = 57 entries`. | `awk '/^const T = \{/,/^\};/' js/shared.js \| grep -cE "^\s+[A-Z_]+:\s+'"` → 57 |
| 13 | FIELD_MAP entries (Iron Rule 5) | New columns on the 17 new tables added to `FIELD_MAP` block in `js/shared.js`. Hebrew labels per Brief decisions (e.g., `display_id → 'מק"ט'`, `production_type → 'סוג ייצור'`). Count: every column on every new table appears in FIELD_MAP. | manual diff in EXECUTION_REPORT |
| 14 | Migration files | 5 sequential SQL migration files added to `migrations/` directory: `NNN_m1_lens_phase_1a_global_catalog.sql` (lens_brand/design/variant + supplier_brand_distribution + RLS), `NNN_m1_lens_phase_1a_commercial.sql` (supplier_catalog_offering + pricing_overlay + currencies-FK + vat_rates), `NNN_m1_lens_phase_1a_retailer.sql` (tenant_active_offerings + tenant_lens_stock + tenant_location), `NNN_m1_lens_phase_1a_operations.sql` (stock_lot + stock_movement + stock_transfer + purchase_receipt + purchase_receipt_line + supplier_permissions + change_approval_log), `NNN_m1_lens_phase_1a_rpcs_trigger_view.sql` (8 RPCs + trigger + view). Numbering continues current sequence — **executor probes current max migration number first** (Identifier verification). | `ls migrations/*lens_phase_1a*.sql \| wc -l` → 5 |
| 15 | Platform Catalog Admin screen | New file `lens-catalog-admin.html` at repo root + `modules/lens-catalog-admin/*.js` (estimated 4–7 files, each ≤350 LOC per Iron Rule 12). Mockup `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` is the visual contract. Loads only when `is_platform_super_admin()` returns true; displays "אין הרשאה" otherwise. | `ls lens-catalog-admin.html`; `find modules/lens-catalog-admin -name "*.js" \| wc -l` |
| 16 | Bulk-import Edge Function | New EF `lens-catalog-import` deployed to Supabase. Accepts POST with multipart `.xlsx` file; parses fixed columns; validates; INSERTs lens_brand + lens_design + lens_variant + supplier_catalog_offering rows; returns `{ inserted: { brands, designs, variants, offerings }, errors: [...] }`. Idempotent via composite-key dedup. `verify_jwt: true`. Service role for DB writes. | `npx supabase functions list \| grep lens-catalog-import` returns the function with its version |
| 17 | M9 stub-FK columns (declared, no FK clause yet) | `purchase_receipt.shipping_box_id UUID NULL` (NO FK clause yet — `shipping_boxes` table doesn't exist). Comment in migration explains: "FK to shipping_boxes(id) added in M9 SPEC when shipping_boxes is built." Same for `purchase_receipt.shipping_box_supplier_barcode TEXT NULL`. | column existence via information_schema |
| 18 | RLS audit clean | `npm run verify` passes (or `verify.mjs --staged` if scripts have evolved). No new RLS findings beyond the 3 documented in GLOBAL_SCHEMA SECURITY-FINDING blocks. | `npm run verify; echo $?` → 0 |
| 19 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 20 | Documentation: GLOBAL_SCHEMA + GLOBAL_MAP merged | `docs/GLOBAL_SCHEMA.sql` updated to include the 17 new tables (table-list comment) and the 9 new functions (functions section). `docs/GLOBAL_MAP.md` updated: §3 Modules at a Glance row for Module 1 mentions "Lens schema (Phase 1A) ✅"; §5.1 RPC count incremented; §5.4 T-constants list extended with new entries (or its own subsection). | manual diff in EXECUTION_REPORT |
| 21 | Documentation: module-level | `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` updated with Phase 1A status; `CHANGELOG.md` gets a Phase 1A section; `db-schema.sql` updated with the 17 new tables + 9 new functions; `MODULE_MAP.md` updated with new files | per-file diff in EXECUTION_REPORT |
| 22 | Demo tenant smoke | After all migrations apply: on demo tenant (slug `demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`), executor inserts ONE smoke row into `lens_brand` (e.g., name=`SmokeTestBrand_Phase1A`), confirms RLS allows demo to read its own row + does NOT allow it to read the row inserted from prizma context. Then deletes the smoke row. Recorded in EXECUTION_REPORT. | Supabase MCP `execute_sql` |

**Total: 22 measurable criteria.** Every one must pass for SPEC closure.

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking

- Read any file in the repo
- Read live DB via Supabase MCP `list_tables`, `execute_sql` (read-only queries)
- Apply DDL migrations to live DB via Supabase MCP `apply_migration` (this is Level-3 autonomy normally — explicitly authorized for THIS SPEC because the schema is sealed and the migrations are the deliverable)
- Deploy Edge Functions via Supabase MCP `deploy_edge_function`
- Create files at the paths listed in §8 "Expected Final State"
- Commit and push to `develop` per the §9 Commit Plan
- Run `npm run verify` and `npm run verify:integrity` (gate before every commit per Iron Rule 31)
- Run `git status --porcelain` to confirm working-tree state before staging
- Selective `git add` by filename only (NEVER `git add -A` / `.` / `*`)
- For the smoke test (criterion 22): one targeted INSERT + one targeted DELETE of the test row on demo tenant only

### What REQUIRES stopping and reporting (write to escalations folder + emit one Hebrew line)

- Any DDL on `goods_receipts`, `goods_receipt_items`, `purchase_orders`, `purchase_order_items`, `inventory`, `brands`, `suppliers`, `customers`, `prescriptions`, `sales`, `work_orders`, `shipments`, `shipment_items` (this SPEC is purely additive to those — only `tenants` gets the one new column)
- Any merge to `main` (Daniel-only)
- Any rename, drop, or destructive operation on existing tables/columns/policies/functions
- Any failure in Supabase MCP `apply_migration` that doesn't roll back cleanly via the migration's own DOWN section
- Any test against prizma tenant (smoke test is demo-only)
- Any T-constant in `js/shared.js` whose value would COLLIDE with an existing one (re-run §1.5 grep before adding each)
- Any FIELD_MAP key collision with existing entries
- Any per-step actual that diverges from §3 expected by more than the noted variance
- Migration number sequence collision — the executor must `ls migrations/` first and use the next available number
- The PIN flow / `pin-auth` Edge Function being touched by accident (Iron Rule 8 — never refactor PIN auth without explicit instruction)
- Discovery that the M9 trigger's NOTIFY-or-queue mechanism is unclear — the executor PICKS a queue table (`pending_lens_advancement_queue`) over LISTEN/NOTIFY for durability, documents the choice in EXECUTION_REPORT §6, but if the choice surfaces an unforeseen complication, STOP and report

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `apply_migration` for ANY of the 5 migration files fails with a syntax or constraint error → STOP, do NOT manually retry; report the exact error and the migration filename. (Lesson from PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27 — null-byte EOF corruption is the worst class.)
- If the smoke test (criterion 22) reads back a row from the OTHER tenant (cross-tenant RLS leak) → **CRITICAL STOP** — this is a Rule 15 / Rule 22 violation; rollback every migration via the DOWN sections, do not push.
- If `js/shared.js` post-edit T-constant count is anything other than 57 (= `BASE_SHARED_TCONST` 40 + 17 new) → STOP — collision with existing constant or duplicate added.
- If `npm run verify:integrity` returns exit 1 (null-byte ERROR) at ANY checkpoint → STOP, investigate corruption, do not proceed.
- If `git status` shows any unexpected file modified, untracked, or deleted that isn't in the §8 expected list → STOP and reconcile (lesson from MIGRATION_4_STOREFRONT_STUDIO).
- If the M1↔M9 trigger discovers an existing table called `pending_lens_advancement_queue` (or any name colliding with the queue mechanism the executor chose) → STOP and rename in the migration before applying.
- If migration sequence number collides (e.g., another untracked SPEC has staged migration `068_*.sql` and ours would be `068_*.sql` too) → STOP, check `ls migrations/` again, pick next free number.

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:

1. **Capture START_COMMIT before any change:** `git rev-parse HEAD` → record in `BEFORE_STATE.json` inside this SPEC folder.
2. **Per-migration rollback:** Each of the 5 migration files MUST include a complete `-- DOWN` section at the bottom with `DROP TABLE IF EXISTS` (in reverse FK order), `DROP FUNCTION IF EXISTS`, `DROP POLICY`, `DROP TRIGGER`. The executor exercises each DOWN section once on demo tenant during a pre-flight dry-run (record in `BEFORE_STATE.json`) before the real apply.
3. **Code rollback:** `git reset --hard {START_COMMIT}` reverts all JS/HTML/migration source files. **WARNING:** this does NOT revert applied DB migrations — those need the per-migration DOWN sections.
4. **Edge Function rollback:** previous version of `lens-catalog-import` does not exist; rollback = delete the EF via Supabase MCP `delete_edge_function` (NOT a tool currently available — manual via supabase CLI; document in EXECUTION_REPORT if exercised).
5. **No rollback of `tenants.base_currency_code`** — this is a benign additive column with safe default; left in place even on rollback.
6. **Notify Foreman:** SPEC marked REOPEN, not CLOSED.

---

## 7. Destructive Operations

Per Iron Rule 32, this SPEC declares the following destructive operations:

1. **None on existing tables/data.** The SPEC is purely additive: 17 new tables, 1 new column (`tenants.base_currency_code` with safe default), 9 new RPCs, 1 new trigger, 1 new view, 17 new T-constants, new files in `modules/lens-catalog-admin/`, new EF.
2. **Smoke-test row delete (criterion 22):** ONE INSERT + ONE DELETE on `lens_brand` against demo tenant only. Tenant-scoped, single-row, audited. Authorized.
3. **Per-migration DOWN-section dry-run:** Each migration's DOWN runs once on demo before the corresponding UP runs in production-mode. Demo-tenant only. Authorized as part of the rollback-readiness pre-flight.

**ALL OTHER DESTRUCTIVE OPERATIONS ARE FORBIDDEN by this SPEC.** Specifically: no `git rebase`, no `git reset --hard` (except as explicit rollback under §6 with Foreman notification), no `git push --force`, no `DROP TABLE` on existing tables, no `DROP COLUMN`, no `TRUNCATE`, no mass file deletes, no governance-doc edits beyond the additive lines specified in §8 (CLAUDE.md is NOT touched).

The Iron-Rule-32 pre-commit hook (`scripts/checks/destructive-ops-declared.mjs`) will scan each commit; any destructive pattern not authorized above will block the commit.

---

## 8. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- **The 6 customer-facing screens** (1 Lens Inventory Management, 2 Active Designs Selection, 3 Catalog & Pricing, 4 Purchase Order, 6 Active POs List, 7 Goods Receipt) — Phase 1B SPEC scope.
- **`modules/goods-receipts/` code extension with `product_category` parameter** — Phase 1B scope. Phase 1A only ships the `m1_create_receipt_from_box` RPC; no UI consumes it yet.
- **Legacy `goods_receipts` / `goods_receipt_items` tables** — untouched. Frames flow continues to work as-is.
- **Legacy `shipments` / `shipment_items` tables + `modules/shipments/`** — M9 SPEC scope (deprecation per M9 D3); not touched here.
- **`courier_companies` vs `lab_couriers` reconciliation** — M9 SPEC scope (overlap report §5.3).
- **K1 (`m9_close_incoming_stock_box`), K3-consuming-side, K4 (`m1_record_lens_loss`)** — M9 SPEC scope.
- **`lab_jobs.purchase_receipt_id` column ON LAB_JOBS** — M9 SPEC scope (lab_jobs table doesn't exist yet).
- **Contact lenses, accessories** — separate future M1 phases (Brief §3).
- **Auto-send PO to supplier (email/WhatsApp/API)** — Phase 2+ (Brief §3 anti-creep).
- **Reconciliation Agent** — only its schema readiness ships here (timestamps, FKs, doc fields). The agent code itself is Phase 2+.
- **LLM-powered catalog import** — Phase 2+ (Q4 resolution).
- **CLAUDE.md edits** — not needed for this SPEC.
- **`docs/CONVENTIONS.md`, `docs/TROUBLESHOOTING.md`, `docs/FILE_STRUCTURE.md`** — light additive-only updates allowed in §8 if directly produced (e.g., FILE_STRUCTURE.md gains the new `lens-catalog-admin/` folder line); structural edits forbidden.
- **`docs/DB_TABLES_REFERENCE.md`** — additive-only update with the 17 new T→table mappings allowed; structural edits forbidden.
- **`MASTER_ROADMAP.md`** — one-line additive entry on Module 1 status (e.g., "Lens Phase 1A ✅") allowed; structural edits forbidden.
- **The 4 pre-multitenancy tables (`customers`, `prescriptions`, `sales`, `work_orders`)** — SECURITY-FINDING #1 territory; not touched here.
- **The 3 `auth.uid()` RLS bug tables (`brand_content_log`, `storefront_component_presets`, `storefront_page_tags`)** — SECURITY-FINDING #3 territory; not touched here.
- **Production tenant (Prizma)** — smoke test runs on demo only.
- **Supplier portal** (supplier-direct write access to catalog) — Phase 2+ (Brief §3).
- **Bundle pricing, supplier rebates, consignment stock, drop-ship** — v2 forward-compat (handoff §"v2 features").

---

## 9. Expected Final State

After the Executor finishes, the repo + live DB should contain:

### New files

**SQL migrations (5 files in `migrations/`, exact names depend on next-free number — executor probes first):**
- `NNN_m1_lens_phase_1a_global_catalog.sql`
- `NNN_m1_lens_phase_1a_commercial.sql`
- `NNN_m1_lens_phase_1a_retailer.sql`
- `NNN_m1_lens_phase_1a_operations.sql`
- `NNN_m1_lens_phase_1a_rpcs_trigger_view.sql`

Each file contains the table CREATE + RLS policies + indexes + UNIQUE constraints + DOWN section. Total estimated: 600–900 SQL lines per file.

**Edge Function:**
- `supabase/functions/lens-catalog-import/index.ts`
- `supabase/functions/lens-catalog-import/parse-xlsx.ts` (helper)
- `supabase/functions/lens-catalog-import/validate.ts` (helper)
- `supabase/functions/lens-catalog-import/insert.ts` (helper)
- (optional) `supabase/functions/lens-catalog-import/_test/parse-xlsx.test.ts`

**Platform Catalog Admin screen (Optic Up team only):**
- `lens-catalog-admin.html` (root, ≤350 lines per Iron Rule 12)
- `modules/lens-catalog-admin/lens-catalog-admin.js` (entry, ≤350)
- `modules/lens-catalog-admin/catalog-brands-col.js` (≤350)
- `modules/lens-catalog-admin/catalog-designs-col.js` (≤350)
- `modules/lens-catalog-admin/catalog-variants-col.js` (≤350)
- `modules/lens-catalog-admin/catalog-detail-pane.js` (≤350)
- `modules/lens-catalog-admin/catalog-import.js` (≤350) — wires the bulk-import button to the EF
- `modules/lens-catalog-admin/catalog-permissions.js` (≤350) — gates on `is_platform_super_admin()`

**Snapshot artifacts (this SPEC folder):**
- `BEFORE_STATE.json` — captures START_COMMIT, tenant_id of demo for smoke, current max migration number, current T-constant count
- `EXECUTION_REPORT.md` — written by Executor at close (mandatory)
- `FINDINGS.md` — written by Executor at close (mandatory if any deviations or observations)

### Modified files

- `js/shared.js` — 17 new T-constants added (line range ~40–60 inclusive); FIELD_MAP block extended with new column→Hebrew label mappings. Total file delta ~80 lines added.
- `docs/GLOBAL_SCHEMA.sql` — Module 1 tables list extended (lines 79–98 area) with the 17 new tables, names listed under appropriate sub-sections; FUNCTIONS section extended with the 9 new RPCs. Total ~30 lines added. Line count goes from `BASE_GLOBAL_SCHEMA_LINES` (678) to ~705–720.
- `docs/GLOBAL_MAP.md` — §3 Module 1 row mentions Lens Phase 1A; §5.1 RPC table count incremented; §5.4 T-constants section gets a "M1 Lens (Phase 1A)" sub-block. ~25 lines added.
- `docs/DB_TABLES_REFERENCE.md` — 17 new T→table mappings added (additive only).
- `docs/FILE_STRUCTURE.md` — `modules/lens-catalog-admin/` folder line added; `lens-catalog-admin.html` root line added; `supabase/functions/lens-catalog-import/` folder line added.
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — Phase 1A status line added.
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — Phase 1A section added with commit hashes.
- `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` — new Lens-Phase-1A files listed.
- `modules/Module 1 - Inventory Management/docs/db-schema.sql` — 17 new tables + 9 functions + 1 view + 1 trigger added.
- `modules/Module 1 - Inventory Management/ROADMAP.md` — Phase 1A marked ⬜→✅ at SPEC close (this file is created by THIS SPEC's commit-1; Phase 1B remains ⬜ for the sibling SPEC).
- `MASTER_ROADMAP.md` — one-line additive entry on Module 1 status (e.g., "M1 Lens Phase 1A ✅ 2026-MM-DD").

### Deleted files

None.

### DB state (in live, applied to BOTH demo + prizma)

- 17 new tables created with `tenant_id` + RLS where applicable.
- 1 new column on `tenants` (`base_currency_code TEXT DEFAULT 'ILS'`).
- 9 new functions deployed (RPCs).
- 1 new trigger (`m9_lens_received_for_sale_order_trg`) on `stock_movement`.
- 1 new view (`v_suppliers_for_m9`) with appropriate GRANTs.
- 1 new Edge Function (`lens-catalog-import`).
- (Optional, for the trigger queue mechanism) 1 small support table `pending_lens_advancement_queue` with tenant_id + sale_order_id + sub_order_id + purchase_receipt_id + processed_at — M9 will consume when built.

### Docs updated (MUST include)

- `docs/GLOBAL_SCHEMA.sql` — verified above
- `docs/GLOBAL_MAP.md` — verified above
- `docs/DB_TABLES_REFERENCE.md` — verified above
- `docs/FILE_STRUCTURE.md` — verified above
- `MASTER_ROADMAP.md` — verified above
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md`
- `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md`
- `modules/Module 1 - Inventory Management/docs/db-schema.sql`
- `modules/Module 1 - Inventory Management/ROADMAP.md`

---

## 10. Commit Plan

8–12 commits, grouped by logical concern. Conventional Commits format. Each commit followed by integrity-gate check + push.

| # | Type | Files | Message |
|---|---|---|---|
| 1 | docs | `modules/Module 1 - Inventory Management/ROADMAP.md` (new), this SPEC folder | `docs(m1): seal M1 Lens Phase 1A SPEC + introduce module ROADMAP` |
| 2 | feat (db) | `migrations/NNN_m1_lens_phase_1a_global_catalog.sql` | `feat(m1,db): create lens_brand + lens_design + lens_variant + supplier_brand_distribution (Phase 1A migration 1/5)` |
| 3 | feat (db) | `migrations/NNN_m1_lens_phase_1a_commercial.sql` | `feat(m1,db): create supplier_catalog_offering + pricing_overlay + vat_rates + tenants.base_currency_code (Phase 1A migration 2/5)` |
| 4 | feat (db) | `migrations/NNN_m1_lens_phase_1a_retailer.sql` | `feat(m1,db): create tenant_active_offerings + tenant_lens_stock + tenant_location (Phase 1A migration 3/5)` |
| 5 | feat (db) | `migrations/NNN_m1_lens_phase_1a_operations.sql` | `feat(m1,db): create stock_lot + stock_movement + stock_transfer + purchase_receipt + purchase_receipt_line + supplier_permissions + change_approval_log (Phase 1A migration 4/5)` |
| 6 | feat (db) | `migrations/NNN_m1_lens_phase_1a_rpcs_trigger_view.sql` | `feat(m1,db): deploy 9 atomic RPCs + K3 trigger + K5 v_suppliers_for_m9 View (Phase 1A migration 5/5)` |
| 7 | feat (ef) | `supabase/functions/lens-catalog-import/*` | `feat(m1,ef): lens-catalog-import EF — structured xlsx → catalog rows` |
| 8 | feat (m1) | `lens-catalog-admin.html`, `modules/lens-catalog-admin/*` | `feat(m1): Platform Catalog Admin screen (Optic Up team only)` |
| 9 | chore (shared) | `js/shared.js` | `chore(m1,shared): add 17 T-constants + FIELD_MAP entries for M1 Lens Phase 1A schema` |
| 10 | docs | `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md`, `docs/FILE_STRUCTURE.md`, `MASTER_ROADMAP.md` | `docs(global): merge M1 Lens Phase 1A schema + functions into GLOBAL_*` |
| 11 | docs | `modules/Module 1 - Inventory Management/docs/{SESSION_CONTEXT,CHANGELOG,MODULE_MAP,db-schema}.md/sql`, `ROADMAP.md` | `docs(m1): module-level docs reflect Phase 1A close` |
| 12 | chore (spec) | this SPEC folder | `chore(spec): close M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN with EXECUTION_REPORT + FINDINGS` |

Commits 2–6 may be batched into 2 commits (e.g., commits 2+3 together as "global catalog + commercial layer", commits 4+5 together as "retailer + operations layer") if executor judges that the migrations are logically coherent and the diff is reviewable. Maximum 12, minimum 8.

---

## 11. Dependencies / Preconditions

- Module 1.5 (Shared Components) ✅ complete (per Brief §5).
- Module 2 (Platform Admin) ✅ complete — `is_platform_super_admin()` RPC exists (per GLOBAL_MAP §5.1).
- `auth-service.js`, PIN flow, Modal, Toast, TableBuilder ✅ in 1.5.
- `activity_log` table ✅ in 1.5; `change_approval_log` is NEW in this SPEC.
- Supabase MCP tool access for `apply_migration`, `execute_sql`, `deploy_edge_function`, `list_tables`.
- `npm run verify:integrity` script available (per Iron Rule 31).
- Brief sealed in commit `b4a3745` on develop.
- No active SPEC in M1 in flight (last sealed M1 SPEC: `STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27`).
- `xlsx` parsing dependency for the EF — pick a Deno-compatible library (`xlsx@0.18.x` via npm specifier or equivalent); document choice in EXECUTION_REPORT.

---

## 12. Lessons Already Incorporated

Drawn from the 3 most recent M1 FOREMAN_REVIEWs (2026-04-27).

- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/FOREMAN_REVIEW.md` Proposal A → "Live-State Baseline Probe before authoring numeric thresholds"** → **APPLIED** in §0 Pre-Authoring Reality Check + §3 §5 use `BASE_*` symbolic baselines wherever measure-then-bound criteria appear. Migration sequence number probed at executor time (not pinned in SPEC).
- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/FOREMAN_REVIEW.md` Proposal B → "Verify-command tooling — Chrome MCP rendered DOM for UI checks, not curl+grep"** → **NOT APPLICABLE** — this SPEC has no rendered-UI verification (Phase 1B will). All §3 verification is DB-state via Supabase MCP `execute_sql` or filesystem via `ls`/`grep`.
- **FROM `STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27/FOREMAN_REVIEW.md` Proposal A → "Cross-Section Consistency Check before saving SPEC"** → **APPLIED** — §3 Success Criteria, §4 Autonomy Envelope, §5 Stop Triggers, §8 Out of Scope, §9 Expected Final State, §10 Commit Plan all cross-checked manually before save: §4 forbidden actions don't conflict with §3 required actions; §3 commit-count (8–12) matches §10 commit count (12 listed, 8 minimum); §8 Out-of-Scope explicitly covers everything §9 implies will not change (legacy goods_receipts, shipments, etc.).
- **FROM `STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27/FOREMAN_REVIEW.md` Proposal B → "Probe codebase for named identifiers BEFORE writing the activation prompt"** → **APPLIED** — `T.RECEIPTS` confirmed as the canonical legacy frames-receipt T-constant (NOT `T.GOODS_RECEIPTS`); `is_platform_super_admin()` confirmed via GLOBAL_MAP §5.1; `next_po_number(p_tenant_id, p_supplier_number)` signature confirmed; `apply_stock_count_delta(p_inventory_id, p_counted_qty, p_tenant_id, p_user_id, p_count_id) -> json` pattern referenced for new RPC signatures.
- **FROM `PERMISSIONS_PHASE3_CSS_GATING_2026_04_27/FOREMAN_REVIEW.md` Proposal A → "Per-consumer enumeration when preserving back-compat couplings"** → **APPLIED** — §1.5 Cross-Reference Check enumerates every existing T-constant + every reference to `goods_receipts` so the executor knows the blast radius if any rename is contemplated mid-execution (it isn't, but the data is there).
- **FROM `PERMISSIONS_PHASE3_CSS_GATING_2026_04_27/FOREMAN_REVIEW.md` Proposal B → "Apply accumulated SKILL improvements before next SPEC"** → **PARTIALLY APPLIED** — the SKILL applications were done in the period since 2026-04-27 (visible in the SPEC_TEMPLATE.md and `opticup-strategic` SKILL.md updates); this SPEC follows the updated template structure. Full audit of all 24 accumulated proposals is a separate housekeeping SPEC.
- **FROM the 4 consecutive `MIGRATION_*` SPECs (2026-05-11+12) → "Pre-existing untracked-file survey"** → **APPLIED** in §0 — 80+ untracked files in M1.5/M2/M3/M4/M7/M9/M13 noted; executor leaves all alone and uses selective `git add` by filename throughout.
- **FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Proposals 1+2 → "Shared Edit Block + Baselines as symbols"** → **NOT APPLICABLE** to this SPEC — no multi-file identical edits; no measure-then-bound criteria that change between Brief and SPEC time.
- **FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Proposals → "Color-form completeness + Multi-form count criteria"** → **NOT APPLICABLE** — this SPEC is schema/code, not visual re-skin.

---

## 13. Pre-Merge Checklist

Every item must pass before the Executor closes this SPEC. Any failure → SPEC is REOPEN, not CLOSED.

- [ ] All 22 §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] `git status --short` returns empty (clean tree) at close — only the pre-existing untracked architect-brief files remain (per §0 baseline).
- [ ] HEAD pushed to `origin/develop`.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in this SPEC folder.
- [ ] `BEFORE_STATE.json` captured before any change.
- [ ] Smoke test recorded in EXECUTION_REPORT (criterion 22) with INSERT + cross-tenant-read-attempt + DELETE.
- [ ] Module ROADMAP / SESSION_CONTEXT / CHANGELOG / MODULE_MAP / db-schema updated.
- [ ] GLOBAL_SCHEMA + GLOBAL_MAP + DB_TABLES_REFERENCE + FILE_STRUCTURE + MASTER_ROADMAP updated.
- [ ] `npm run verify` (full) passes (or scripts have evolved — executor uses what's available and documents).
- [ ] No DDL on legacy tables (`goods_receipts`, `goods_receipt_items`, `purchase_orders`, etc.).
- [ ] No merge to `main`.
- [ ] No commit messages containing `--no-verify` bypass.

---

*End of SPEC. Sibling SPEC for Phase 1B (the 6 customer-facing screens) lives at `../M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md` (currently a stub; will be authored after Phase 1A closes so the FOREMAN_REVIEW lessons from 1A can inform 1B).*
