---
spec_id: M1_LENS_CATALOG_SEED_FROM_EXCEL
title: Seed lens catalog from authoritative Prizma Excel (9 suppliers / ~11 brands / 2904 variants) — demo first, Prizma gated on Daniel auth
author: opticup-executor (post-ARCHITECT_DECISION pair with M1_LENS_CATALOG_TRUE_REBUILD)
authored: 2026-05-18 late evening
module: Module 1 - Inventory Management
status: SEALED — ready for execution
paired_with: M1_LENS_CATALOG_TRUE_REBUILD (executes between Commits 4 and 5; closes BEFORE that SPEC's drill-flow Tier C Pass 2)
source_file: tests/קטלוג-עדשות-18.5.26.xls (715 KB, 2904 data rows, 11 columns)
---

# SPEC — M1 Lens Catalog Seed From Excel

## 1. Goal

Populate the lens catalog tables from Daniel's authoritative Prizma catalog Excel so that paired SPEC `M1_LENS_CATALOG_TRUE_REBUILD` can run its Tier C VFV Pass 2 with real drill data. Demo tenant is seeded first; Prizma is gated behind explicit Daniel authorization (separate commit, STOP triggered between).

This SPEC fills the gap discovered in `M1_LENS_CATALOG_TRUE_REBUILD` pre-flight §0: `supplier_brand_distribution` is empty project-wide, so the mockup's supplier→brand drill has no data source. Seeding from Excel resolves the blocker for SPEC A's S6 (drill flow end-to-end).

## 2. Background

### 2.1 Source data (empirical, verified 2026-05-18 late evening)

`tests/קטלוג-עדשות-18.5.26.xls`, 2904 data rows, 11 columns:

| Col # | Header (he) | Meaning | Example |
|---|---|---|---|
| 0 | בר קוד | Barcode (Excel typo "בר קןד") | `P5G-PZ1`, `000P7G` |
| 1 | ספק | Supplier | `LEO`, `בדולח`, `שמיר` |
| 2 | חברה | Brand | `Color Flex`, `HOYA`, `אופטימייז` |
| 3 | סוג עדשה | Type / Series name | `מדף` (stock) or series name like `Variovid 2`, `LifeStandard` |
| 4 | אינדקס | Refractive index | `1.6TR`, `1.5`, `1.67` |
| 5 | קוטר | Diameter (mm) | `65`, blank |
| 6 | צבע וחומר | Color/material | `GR-Blue / TR-Blue`, blank |
| 7 | מחיר מכירה | Sale price | `200.0` |
| 8 | מחיר עלות | Cost price | `0.0` (often) |
| 9 | עדשות משקפיים | Glasses flag | `1` (2827 rows) |
| 10 | עדשות מגע | Contact-lens flag | `1` (53 rows) |

### 2.2 Empirical entity counts (verified 2026-05-18; AMENDED 2026-05-18 late evening after dimensional dedup discovery)

| Entity | Raw | After dedup | Notes |
|---|---|---|---|
| Suppliers | 9 | 9 | `LEO`, `SHALDAG`, `Steuer`, `בדולח` (2512 rows / 86.5%), `לאומית`, `לאומית ילדים`, `לפידות`, `קופר ויז'ן`, `שמיר` |
| Brands | 13 | **11** | HOYA + Hoya → `Hoya` (canonical matches existing global); RodenStock + רודנשטוק → `Rodenstock` (canonical matches existing global) |
| Designs | derived | **91** | Distinct (brand, series_name) tuples — `series_name` = `מדף` OR the type-column value verbatim |
| **Variants** | 2904 Excel rows | **612** | **AMENDED:** Multiple Excel rows share dimensional attributes `(design_id, refractive_index, diameter_mm, coating, tint, owner_tenant_id)`. The lens_variant table enforces UNIQUE NULLS NOT DISTINCT on that tuple — so duplicate Excel rows collapse to 1 variant (which can then have N offerings). Verified empirically: 2904 → 612 after dimensional dedup |
| **Offerings** | 2904 Excel rows | **617** | **AMENDED:** `supplier_catalog_offering_unique` is (supplier_id, variant_id, tenant_id). Multiple Excel rows for same supplier offering same variant collapse to 1 offering. Verified empirically: 2904 → 617 after (supplier, variant) dedup |
| Brand distribution rows | derived | **17** | Distinct (supplier, brand) pairs from Excel |

**Why the dedup is correct:** Excel rows represent ORDER-able SKUs (each with its own barcode), but the underlying catalog model is *one variant = one physical product, many barcodes/offerings possible*. The dimensional UNIQUE enforces this. Multiple Excel rows for `(Hoya, אור כחול, 1.6, 65, NULL, Blue Control)` = 1 variant with multiple barcodes/offerings, not 4 different variants.

**Trade-off:** The barcode-level identity (Excel col 0) is captured per OFFERING via `supplier_sku_code`, not on the variant. Offering rows for the same variant share the canonical variant.display_id but carry distinct supplier_sku_code values. This matches the real-world catalog model: HOYA's barcode for variant X may differ from בדולח's barcode for the same variant X.

### 2.3 Architecture — what's global vs tenant-scoped

Per the mockup ("PLATFORM ADMIN — אזור ניהול גלובלי"), the catalog is split:

| Layer | Scope | Tables | owner_tenant_id |
|---|---|---|---|
| Global catalog (brand → design → variant) | platform-global | `lens_brand`, `lens_design`, `lens_variant` | `NULL` |
| Tenant catalog (suppliers + offerings + distribution) | per-tenant | `suppliers`, `supplier_brand_distribution`, `supplier_catalog_offering` | tenant_id |

**Implication:** the global brands/designs/variants are seeded ONCE (visible to all tenants). The per-tenant data (suppliers + the M:N link tables) is seeded PER TENANT — demo first, Prizma on explicit auth.

### 2.4 Dedup rules

1. **HOYA + Hoya** → `HOYA` (uppercase canonical, 108 rows total)
2. **RodenStock + רודנשטוק** → `RodenStock` (English canonical, 67 rows total)
3. Trim whitespace on all text columns
4. Color column: 25 rows have a leading space (` GR-L.Blue/Gold/TR-Blue`) — strip on insert
5. `index` column has mixed forms: `1.6TR`, `1.5`, `1.67` — parse numeric prefix as `refractive_index` numeric; preserve original `1.6TR` style in `coating` or `notes` if there's a TR/SR/HC suffix
6. `diameter` blank → default 65 (lens_variant requires NOT NULL integer)

### 2.5 sph_min/sph_max defaults

Excel has no SPH range data. The schema requires `sph_min` + `sph_max` NOT NULL. Seed default: `sph_min=-6.00`, `sph_max=+6.00`, `sph_step=0.25` (matches existing seed convention in `catalog-private-admin.js` line 254).

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch clean post-push | `git status` | clean |
| S2 | Commits in [3, 5] | `git log` | 3-5 |
| S3 | 2 new UNIQUE constraints added (DDL) | `\d+ supplier_brand_distribution` + `\d+ supplier_catalog_offering` | both have UNIQUE (supplier_id, brand_id, tenant_id) and (supplier_id, variant_id, tenant_id) respectively |
| S4 | Global catalog: 9 NEW brands added (2 of 11 Excel canonicals already existed pre-seed — `Hoya`, `Rodenstock`) | pre-seed count 16; post-seed `SELECT count(*) FROM lens_brand WHERE owner_tenant_id IS NULL AND is_deleted=false` | 25 (16 + 9 new) ✅ verified 2026-05-18 |
| S5 | Global catalog: 91 NEW designs added | pre-seed count 54; post-seed `SELECT count(*) FROM lens_design WHERE owner_tenant_id IS NULL` | 145 (54 + 91 new) ✅ verified 2026-05-18 |
| S6 | Global catalog: 612 NEW variants added (post-dimensional-dedup) | pre-seed count 71; post-seed `SELECT count(*) FROM lens_variant WHERE owner_tenant_id IS NULL AND is_deleted=false` | 683 (71 + 612 new). **AMENDED** from "2904" after dimensional dedup discovery — see §2.2 |
| S7 | Demo tenant: 9 NEW suppliers added (none of Daniel's Excel suppliers exist on demo today; all 9 are net-new) | pre-seed count 38; post-seed `SELECT count(*) FROM suppliers WHERE tenant_id='<demo>'` | 47 (38 + 9 new) |
| S8 | Demo tenant: 617 offerings seeded (post-dedup) | `SELECT count(*) FROM supplier_catalog_offering WHERE tenant_id='<demo>' AND is_deleted=false` | 617 (existing 41 unrelated to Excel suppliers may remain; new 617 add for Excel suppliers). **AMENDED** from "2904" after (supplier, variant) dedup. supplier_sku_code preserves Excel barcode per offering. |
| S9 | Demo tenant: 17 distribution rows seeded (distinct (supplier_id, brand_id) from Excel) | `SELECT count(*) FROM supplier_brand_distribution WHERE tenant_id='<demo>' AND is_deleted=false` | 17 |
| S10 | Re-runnable: re-execute the entire pipeline → 0 new rows added (proves idempotency) | `count(*) before re-run = count(*) after re-run` for all 6 tables | identical counts |
| S11 | No NULL violations: all variants have refractive_index + diameter + sph_min + sph_max | `SELECT count(*) FROM lens_variant WHERE owner_tenant_id IS NULL AND (refractive_index IS NULL OR diameter_mm IS NULL OR sph_min IS NULL OR sph_max IS NULL)` | 0 |
| S12 | display_id collision check: all 2904 variants have unique display_id (global UNIQUE constraint) | seed runs without ON CONFLICT errors on `lens_variant_display_id_key` | 0 errors |
| S13 | RLS preserved: re-query as anon — global catalog visible; tenant catalog filtered | `set role anon` + `SELECT count(*) FROM lens_brand` returns global rows | RLS unchanged |
| S14 | get_advisors(security) clean of new ERROR/HIGH | run | 0 new |
| S15 | Iron Rule 31 + 32 gates green at every commit | husky pre-commit | exit 0 |
| S16 | **Prizma seed UN-EXECUTED until Daniel explicit auth** — STOP before executing Prizma INSERTs | git log: Prizma commit ABSENT from commit range | gated |
| S17 | EXECUTION_REPORT + FINDINGS in SPEC folder | `ls` | files exist |
| S18 | Module 1 SESSION_CONTEXT + CHANGELOG updated | grep | entries appended |

## 4. Destructive Operations

(Iron Rule 32 enforcement — every destructive op declared.)

### Authorized:

1. **DDL — 2 ALTER TABLE ADD CONSTRAINT (UNIQUE):**
   - `ALTER TABLE supplier_brand_distribution ADD CONSTRAINT supplier_brand_distribution_unique UNIQUE NULLS NOT DISTINCT (supplier_id, brand_id, tenant_id)`
   - `ALTER TABLE supplier_catalog_offering ADD CONSTRAINT supplier_catalog_offering_unique UNIQUE NULLS NOT DISTINCT (supplier_id, variant_id, tenant_id)`
   Reversible via `ALTER TABLE ... constraint`. Required for ON CONFLICT DO UPDATE idempotency.

2. **DML — Bulk INSERT ... ON CONFLICT DO UPDATE on 6 tables (demo tenant):**
   - `lens_brand` × 11 (global, owner_tenant_id=NULL)
   - `lens_design` × N (global, owner_tenant_id=NULL)
   - `lens_variant` × 2904 (global, owner_tenant_id=NULL)
   - `suppliers` × 9 (demo tenant_id) — upsert by (name, tenant_id)
   - `supplier_brand_distribution` × ~30 (demo tenant_id)
   - `supplier_catalog_offering` × 2904 (demo tenant_id)
   All UPSERTs are idempotent. Reversible by setting `is_deleted=true` on tenant-scoped rows; global rows can be left in place (re-runnable).

3. **DML — Bulk INSERT ... ON CONFLICT DO UPDATE on 3 tables (PRIZMA tenant, GATED on Daniel auth):**
   - `suppliers` × 9 (Prizma tenant_id)
   - `supplier_brand_distribution` × ~30 (Prizma tenant_id)
   - `supplier_catalog_offering` × 2904 (Prizma tenant_id)
   **Pre-execution STOP:** the executor MUST emit a single message to Daniel saying "Demo seeded clean. Authorize Prizma seed?" and wait for explicit "go" before running these INSERTs. No silent Prizma writes.

### Forbidden:

- DROP CONSTRAINT, DROP COLUMN, DROP TABLE, TRUNCATE on any catalog table
- DELETE on any catalog table (no hard deletes — soft delete via is_deleted=true if needed; not used in this SPEC)
- Modifying RLS policies on any catalog table (re-use existing JWT-claim pattern)
- Modifying RPC functions
- Re-naming tables/columns
- Touching non-catalog tables (events, payments, inventory stock — not in scope)

## 5. Autonomy Envelope

**Can do without asking:**

1. Apply 2 ADD CONSTRAINT DDLs via Supabase MCP
2. Parse Excel via Python in `scripts/seed-lens-catalog-from-excel.mjs` or equivalent
3. Generate batched UPSERT SQL files
4. Execute demo-tenant UPSERTs via Supabase MCP `apply_migration`
5. Run Tier C verification queries (S4-S12)
6. Commit 1 (DDL + parsing script) + Commit 2 (demo data files + execution report) + Commit 3 (closure)
7. Push to develop

**Must stop and escalate:**

1. **Before any Prizma write** — single message to Daniel, wait for explicit "go"
2. If any UPSERT fails (constraint violation, NULL violation, type mismatch)
3. If post-seed counts don't match expected (S4-S9)
4. If get_advisors returns new ERROR-level finding
5. If Excel parsing produces row count != 2904 (file may have been modified)
6. If `display_id` collisions occur (some Excel barcodes may match existing variants)

## 6. Stop-on-Deviation Triggers

Additional to CLAUDE.md §9 globals:

- Excel row count mismatch (S6 expects 2904)
- Brand count post-dedup != 11
- Supplier count != 9
- Any RLS policy unexpectedly drops (S13)
- Prizma INSERT attempted before Daniel auth (CRITICAL violation)

## 7. Out of Scope

- Lens type taxonomy normalization (will use Excel values verbatim for `lens_design.lens_type` — e.g., `מדף`, `Variovid 2`)
- Image/asset seeding (lens variants have no image columns in current schema)
- Cleaning up pre-existing 35 demo suppliers that aren't in the Excel (the 9 Excel suppliers will be added/upserted; the other 35 stay untouched)
- Cleaning up 41 existing demo `supplier_catalog_offering` rows — these will coexist with the new 2904 (the existing 41 will UPSERT match if their (supplier_id, variant_id, tenant_id) collides; otherwise add new)
- Editing JS/UI files — paired SPEC `M1_LENS_CATALOG_TRUE_REBUILD` owns those
- Future Prizma maintenance updates (re-seeding when Daniel's Excel updates) — separate operations SPEC if needed

## 8. QA / Tier C Verification Plan

After demo seed:

1. Run counts query (S4-S9) — assert each
2. Run NULL violation check (S11)
3. Run display_id uniqueness check (S12)
4. Spot-check 5 random rows: pick 5 random Excel rows, verify each appears as `supplier_catalog_offering` linked to correct `supplier` + `lens_variant` (under correct `lens_design` + `lens_brand`)
5. Run get_advisors(security)
6. Re-run the entire UPSERT pipeline → expect S10 (0 row delta)
7. Smoke load: `localhost:3000/inventory.html?cat=lenses&dev=1` → "🔧 קטלוג מערכת" → verify Suppliers column populates with 9+ suppliers, brand col populates after click
8. (After paired SPEC A completes Pass 2 VFV with this seed) hand off control back

## 9. Expected Final State

### After demo seed (Commits 1-2):

- 11 `lens_brand` rows (global)
- N `lens_design` rows (global, count TBD by Excel analysis)
- 2904 `lens_variant` rows (global)
- 9 `suppliers` (demo tenant — may exist already by name; upsert is idempotent)
- ~30 `supplier_brand_distribution` rows (demo tenant)
- 2904 `supplier_catalog_offering` rows (demo tenant)
- 2 new UNIQUE constraints on link tables
- Re-runnable: all UPSERTs idempotent

### After Prizma seed (Commit 3+ — IF Daniel authorizes):

- Same global catalog (no change)
- 9 `suppliers` (Prizma tenant)
- ~30 `supplier_brand_distribution` rows (Prizma tenant)
- 2904 `supplier_catalog_offering` rows (Prizma tenant)

### If Prizma NOT authorized:

- Demo only. SPEC closes with Prizma deferred to future op.

## 10. Commit Plan

| # | Subject | Files | Gate |
|---|---|---|---|
| 1 | `feat(db): add UNIQUE constraints to supplier_brand_distribution + supplier_catalog_offering for seed idempotency` | 2 new migration files | After §0 pre-flight |
| 2 | `feat(seed): lens catalog from Excel — 11 brands + N designs + 2904 variants + demo tenant 9 suppliers + offerings + distribution` | seed script + generated SQL artifacts + execution log | After Commit 1 |
| **GATE** | **STOP — emit "Demo seeded clean. Authorize Prizma seed?" to Daniel + wait** | — | After Commit 2 |
| 3a | `feat(seed): lens catalog — Prizma tenant (suppliers + offerings + distribution)` | Prizma SQL artifacts + execution log | ONLY if Daniel authorizes |
| 3b (alt) | `chore(spec): close M1_LENS_CATALOG_SEED_FROM_EXCEL — Prizma deferred` | EXECUTION_REPORT noting Prizma deferral | If Daniel does NOT authorize Prizma now |
| Final | `chore(spec): close M1_LENS_CATALOG_SEED_FROM_EXCEL` | EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT + CHANGELOG | After 3a or 3b |

Total: 3-4 commits depending on Prizma gate.

## 11. Pipeline Coordination

Branch: `develop`. Path X sequential. Lock claim:

- `supabase/migrations/**` (new migrations)
- `scripts/seed-lens-catalog-from-excel.*` (NEW seed script)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_SEED_FROM_EXCEL/**`
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md`

Files SHARED with paired SPEC A (do NOT touch in this SPEC):
- `modules/lens-catalog-admin/**` — SPEC A's territory
- `shared/js/catalog-private-admin.js` — SPEC A's territory
- `inventory.html` — SPEC A's territory

## 12. Rollback Plan

If demo seed fails partway:
- Set `is_deleted=true` on rows by their `created_at >= <start_ts>` (rollback marker)
- DROP CONSTRAINT the 2 new UNIQUEs if needed

If Prizma seed fails (after demo OK):
- Same approach scoped to Prizma tenant_id
- Demo state preserved

If Excel parsing produces wrong row count:
- STOP before any DDL or DML
- Inspect Excel header parsing assumptions
- Escalate to Daniel

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass for executed scope (S1-S15 minimum; S16 only "Prizma absent" if Daniel didn't authorize)
- [ ] Integrity gate exit 0 at every commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] get_advisors clean
- [ ] Paired SPEC A's Pass 2 Tier C can now run (demo data populated)
- [ ] If Daniel did NOT authorize Prizma: clear note in EXECUTION_REPORT + future op SPEC stubbed in TECH_DEBT

## 14. Resumption State (added 2026-05-18 mid-session pause)

Path X session paused cleanly mid-SPEC-B execution per Daniel's "Choice 2" decision (commit-and-pause). Next session resumes here.

### Demo DB state at pause (verified via Supabase MCP execute_sql)

| Table | Pre-seed | Seeded this session | Total now | Remaining |
|---|---|---|---|---|
| `lens_brand` (global, `owner_tenant_id IS NULL`) | 16 | 9 | **25** | 0 — all 11 Excel canonical brands present (2 pre-existed as `Hoya`, `Rodenstock`) ✅ |
| `lens_design` (global) | 54 | 91 | **145** | 0 — all 91 Excel-derived designs present ✅ |
| `lens_variant` (global) | 71 | 250 | **321** | **362** (variants_batch_002 + batch_003 — 250 + 112) |
| `suppliers` (tenant=demo) | 38 | 0 | 38 | **9** (04_suppliers_demo.sql) |
| `supplier_brand_distribution` (tenant=demo) | 0 | 0 | 0 | **17** (05_distribution_demo.sql) |
| `supplier_catalog_offering` (tenant=demo, Excel-source) | 41 (pre-existing, unrelated to Excel) | 0 | 41 | **617** (06_offerings_demo_batch_001-003.sql) |
| 2 UNIQUE constraints on link tables | n/a | 2 | applied ✅ | 0 |

### Idempotency contract

Every SQL file in `tests/seed-sql/` uses `INSERT ... ON CONFLICT DO UPDATE`. Re-running the entire pipeline (including the already-applied 01_brands, 02_designs, 03_variants_batch_001) produces **zero new rows** — only `updated_at` timestamps refresh on existing rows. Next session may safely re-run the full pipeline if uncertain about state.

### Resumption command sequence (next session)

Run in this order via Supabase MCP `execute_sql` (or `apply_migration`):

1. Verify pause state matches above table (counts identical).
2. Apply `tests/seed-sql/03_variants_batch_002.sql` (250 rows).
3. Apply `tests/seed-sql/03_variants_batch_003.sql` (112 rows).
4. Verify variants count = 71 + 612 = 683.
5. Apply `tests/seed-sql/04_suppliers_demo.sql` (9 rows).
6. Verify demo suppliers count = 38 + 9 = 47.
7. Apply `tests/seed-sql/05_distribution_demo.sql` (17 rows).
8. Verify demo distribution count = 17.
9. Apply `tests/seed-sql/06_offerings_demo_batch_001.sql` (250 rows).
10. Apply `tests/seed-sql/06_offerings_demo_batch_002.sql` (250 rows).
11. Apply `tests/seed-sql/06_offerings_demo_batch_003.sql` (117 rows).
12. Verify demo offerings count = 41 (pre-existing) + 617 = 658.
13. Run `get_advisors(security)` — confirm clean.
14. Run idempotency check: re-apply 01_brands.sql + 02_designs.sql + variants_batch_001.sql → assert 0 row-count delta.
15. Commit SPEC B EXECUTION_REPORT + FINDINGS.
16. **STOP — emit "Demo seeded clean. Authorize Prizma seed?" to Daniel + wait.**
17. If Daniel says go → write Prizma-tenant variant of 04 + 05 + 06 SQL files (search/replace `8d8cfa7e-...-demo` with Prizma tenant UUID) + apply + verify.
18. If Daniel says wait → SPEC B closes with Prizma deferred.

### Paired SPEC A — also mid-state

After SPEC B closes 🟢 on demo, return to SPEC A:

| Commit | Status | Description |
|---|---|---|
| 1 | ✅ shipped (`434f254`) | TRUE mockup rebuild — Suppliers col + dev-mode bypass |
| 2 | ✅ shipped (`454491b`) | catalog-variants-col.js orphan deleted |
| **GATE A** | (current pause) | SPEC B demo seed in progress (this resumption) |
| 3 | pending | Private catalog rewrite (`shared/js/catalog-private-admin.js` + new `shared/css/catalog-private-admin.css` + inventory.html CSS link) |
| 4 | pending | Tier C VFV — Chrome MCP captures 6 screenshots against real seeded data + mockup side-by-side classification |
| 5 | pending | Closure — EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW placeholder + Module 1 SESSION_CONTEXT/CHANGELOG/MODULE_MAP updates |

### Open questions for next session

None. The full plan is captured here + in SPEC.md §3 §6 §7. No new architect decisions required to resume.

---

**END SPEC**

_Authored 2026-05-18 late evening by opticup-executor on architect-decision pair with M1_LENS_CATALOG_TRUE_REBUILD. Empirical Excel analysis confirmed 9 suppliers / 11 brands post-dedup / 2904 variants. Brand-distribution + offering UNIQUE constraints required for idempotent upsert. Prizma seed gated behind explicit Daniel authorization._
