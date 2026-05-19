# SPEC — M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/SPEC.md`
> **Authored by:** opticup-strategic (Module Strategist + Foreman, Claude Code Opus 4.7 1M)
> **Authored on:** 2026-05-18 evening (IDT)
> **Module:** 1 — Inventory Management
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_BRIEF.md` (SEALED)
> **Plan position:** Stage 2A of 5 (Stage 1 closed 🟢 → THIS → Stage 2B Excel import → Stage 3 Prizma load → Stage 4 tenant my-catalog → Stage 5 demo close)

---

## 0. Pre-Authoring Reality Check

Required before drafting any later section. Confirms the SPEC is grounded in actual repo state, not Brief assumptions that may have drifted.

### 0.1 Brief read in full

Brief read in full on 2026-05-18 evening. Mockup `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` read in full (671 lines). Stage 1 FOREMAN_REVIEW.md read in full (closed 🟢, 18/2/0 Tier C VFV).

### 0.2 Brief drift — corrections vs. repo reality (CRITICAL)

The Brief contains three drift points where stated assumptions diverge from on-disk reality. The SPEC's success criteria are written against repo reality, not against the Brief's literal claims. Each correction is bound here so the Executor doesn't have to relitigate at run time.

| # | Brief claim | Repo reality | Resolution in this SPEC |
|---|-------------|--------------|--------------------------|
| **D-FIX-1** | "Stage 1's chrome lives in `shared/js/catalog-private-admin.js` + `shared/css/catalog-private-admin.css`. Stage 2A EXTENDS this." | Stage 1 ART-FACT is shared between the TENANT-side `private-catalog` tab (light) and the tenant-side `global` sub-tab inside the same component (dark). **The Platform Catalog Admin screen lives in a SEPARATE surface: `modules/lens-catalog-admin/` (8 files, 926 LOC) + `css/lens-catalog-admin-page.css` (479 LOC) + mounted via `[data-tab="catalog-admin"]` sections in `inventory.html`.** The Stage 1 retrospective §7 already flagged this overlap. The Brief's mockup banner ("Optic Up Team Only") + permission gate + 4-column dark theme all match the `modules/lens-catalog-admin/` surface, not the tenant-side shared component. | **Stage 2A extends `modules/lens-catalog-admin/`**, NOT `shared/js/catalog-private-admin.js`. The shared component stays untouched (Brief §9 hard rule: "DO NOT touch the existing tenant-side inventory screen"). |
| **D-FIX-2** | "Two top-level tabs filter the brand/series tree by `lens_design.lens_type IN ('single_vision','multifocal','bifocal','photochromic','blue_cut',...)` for glasses and `('soft_contact','hard_contact',...)` for contacts." | `lens_design` has TWO discriminator columns: `product_type` ('glasses' / 'contact_lens' / 'accessory') AND `lens_type` (secondary category: 'single_vision', 'progressive', 'bifocal', 'office', 'occupational', 'soft_contact', 'hard_contact', 'accessory_general'). The actual product-type discriminator is `product_type`, NOT `lens_type`. The Brief's listed lens_type values include 'multifocal', 'photochromic', 'blue_cut' which DO NOT EXIST in the database. | **The two top-level tabs filter by `lens_design.product_type IN ('glasses')` and `('contact_lens')` respectively.** The `lens_type` column drives the SECONDARY "category" select inside the series-detail pane, NOT the top-level tabs. |
| **D-FIX-3** | "Variants pane shows the contact-variant schema (Base Curve/Diameter/SPH/CYL/wearing_schedule/qty_per_box)." | `contact_lens_variant` has NO `diameter` column. Actual columns: `base_curve`, `sph`, `cyl`, `axis`, `wearing_schedule`, `qty_per_box`, `water_content_pct`, `unit_of_sale`, `expiry_warning_months`, `display_id`. | **Contacts variants table columns:** display_id / base_curve / sph / cyl / axis / wearing_schedule / qty_per_box / water_content_pct / status / edit. "Diameter" omitted; `water_content_pct` shown instead (more useful for contacts). |

Three smaller-scale notes that affect implementation but are not Brief contradictions:

- The mockup's "תיאור (אופציונלי)" series description field has NO corresponding column in `lens_design`. In 2A the textarea renders DISABLED with tooltip "זמין בעתיד — דורש הוספת עמודה במסד נתונים". No DB migration for this field in 2A.
- The mockup's "סוג ייצור" toggle (📦 מדף / 🏭 ייצור) has NO direct column. `supplier_catalog_offering.production_type` exists but at offering-grain not design-grain. In 2A the toggle renders VISUAL ONLY with tooltip "פעולה זו תחובר בשלב 4 — ניהול גרסאות". For contacts tab the toggle swaps to wearing_schedule (יומית/חודשית/שנתית) — same visual-only treatment.
- The mockup's three save-bar buttons (📋 שכפל / 🗑 השבת / 💾 שמור גרסה) render in 2A. "שמור גרסה" is FULLY wired (updates series name + lens_type + increments `lens_design.version`). The other two are placeholder-toast in 2A (action wired in Stage 4 alongside tenant adoption-alert mechanism).

### 0.3 Architectural target — final decision

**Target surface:** `modules/lens-catalog-admin/` (extend, no rewrite). This is the existing Platform Catalog Admin screen, gated by `is_platform_super_admin` RPC server-side via `catalog-auth.js gateAuthOrRedirect()`. The 3 tab buttons in `inventory.html` (lines 94 / 108 / 120, one per top-level category) all mount the same partial into 3 `<section>`s (lines 703 / 713 / 723). After Stage 2A, all 3 mounts show the SAME platform admin screen with the in-page tabs (glasses + contact_lens) controlling product-type filter — the top-level inventory category context is informational only.

**NOT touched by this SPEC:** `shared/js/catalog-private-admin.js`, `shared/css/catalog-private-admin.css`, any other tenant-side inventory file. Iron Rule 21 (No Orphans, No Duplicates) compliance: this SPEC extends the existing platform admin module; it does NOT create a parallel surface. The Stage 1 light/dark chrome in `shared/css/catalog-private-admin.css` is for the tenant-side `private-catalog` tab — a DIFFERENT consumer surface, not relevant to Stage 2A.

### 0.4 DB Schema Rehearsal (Rule 5.3 — runtime semantics)

Verified on live Supabase 2026-05-18 evening via MCP `execute_sql`:

| Table | Key columns relevant to 2A | Notes |
|---|---|---|
| `lens_brand` | `id`, `name`, `is_published`, `is_deleted`, `owner_tenant_id` (nullable — global rows are NULL) | NO `product_type` column on brand. Brand-by-tab filter is via JOIN through `lens_design.product_type`. |
| `lens_design` | `id`, `brand_id`, `name`, `lens_type`, `product_type`, `material`, `is_published`, `is_deleted`, `owner_tenant_id` | Discriminator is `product_type`. NO `version`, NO `description` columns yet. Stage 2A migration adds `version`. |
| `lens_variant` | `id`, `design_id`, `display_id`, `refractive_index`, `diameter_mm`, `coating`, `tint`, `sph_min`, `sph_max`, `cyl_min`, `cyl_max`, `add_min`, `add_max`, `version`, `is_published`, `is_deleted`, `owner_tenant_id` | Has `version` integer NOT NULL (per-variant). Per-series version comes from new `lens_design.version` (not from this column). |
| `contact_lens_variant` | `id`, `design_id`, `display_id`, `base_curve`, `sph`, `cyl`, `axis`, `wearing_schedule`, `qty_per_box`, `water_content_pct`, `unit_of_sale`, `is_published`, `is_deleted`, `owner_tenant_id` | NO `diameter` column. NO `version` column (unlike `lens_variant`). |
| `suppliers` | tenant-scoped (per Stage 1) | UNTOUCHED by 2A — Brief §9 hard rule. |
| `supplier_brand_distribution` | `tenant_id`, `brand_id`, `supplier_id`, `status`, `effective_from`, `effective_until`, `is_deleted` | Tenant-scoped M:N. Existing brand drill uses this. |
| `supplier_catalog_offering` | `tenant_id`, `supplier_id`, `variant_id`, `price_amount`, `status`, `product_type`, `production_type`, ... | Tenant-binding. Source for adoption query. |
| `tenant_active_offerings` | `tenant_id`, `offering_id`, `is_active`, `is_deleted` | The actual adoption-count source. Query: `COUNT(DISTINCT tao.tenant_id) FROM tenant_active_offerings tao JOIN supplier_catalog_offering sco ON sco.id = tao.offering_id JOIN lens_variant lv ON lv.id = sco.variant_id WHERE lv.design_id = $1 AND tao.is_active AND NOT tao.is_deleted`. Denominator: `COUNT(*) FROM tenants` (live = 2). |
| `permissions` | `id`, `module`, `action`, `name_he`, `description`, `tenant_id` | 16 catalog-* rows already exist. NO new permission key needed — see §0.5. |

### 0.5 Permission gating — final decision

The Brief §3.1 anticipates needing a `platform.catalog.admin` permission key. **Verification result: NOT NEEDED.** The existing `catalog-auth.js` calls `sb.rpc('is_platform_super_admin')` which uses Postgres-level platform-admin role check (NOT permissions-table key). This RPC already exists (verified via information_schema.routines query; security_type DEFINER). All 3 existing `[data-tab="catalog-admin"]` mounts in inventory.html are already gated by this RPC, AND the contact-lenses + accessories mounts additionally have `data-tab-permission` attributes that gate client-side menu visibility.

**Iron Rule 22 defense-in-depth status in 2A:**
- Server: `is_platform_super_admin` RPC (already in place via `catalog-auth.js`). UNCHANGED.
- Client navigation hiding: the 3 menu buttons gate via either `data-tab-permission` OR `is_platform_super_admin` (the unguarded lenses button still hides because the section's content has `display:none` until auth gate passes). UNCHANGED.
- Write-time RLS: every `.insert()` and `.update()` in 2A goes through the existing Supabase client with anon JWT; tables (lens_brand, lens_design, lens_variant, contact_lens_variant, supplier_brand_distribution, suppliers) have RLS policies that gate by tenant_id OR platform-admin role.

**Pre-execution verification step (Executor adds to §1.5):** before any write, the Executor runs ONE smoke query as anon to confirm `is_platform_super_admin()` returns true for the dev-mode bypass session. If false → STOP, escalate (the Brief §12 trigger "new permission key creation fails on either demo or Prizma" applies even though no NEW key is created — the existing gate must work).

### 0.6 Lessons applied from prior FOREMAN_REVIEWs in this module

| Source SPEC | Lesson | Honored here? |
|---|---|---|
| `M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/FOREMAN_REVIEW.md` P-AUTHOR-1 | "Make the SPEC template's Expected Final State structure plan an EDITABLE SKELETON, not descriptive prose" | YES — §8 includes skeleton scaffolds for the 3 new files. |
| Same FR P-AUTHOR-2 | "Always list `docs/FILE_STRUCTURE.md` in §8 'Docs updated' when a SPEC introduces a new file under shared/, modules/, css/, scripts/" | YES — §8 lists `docs/FILE_STRUCTURE.md` with `DEFERRED — TECH_DEBT entry` annotation (3 new files added under registered tops). |
| Same FR P-EXEC-2 | "Pre-author LOC budget check recipe — translate prose plan to skeleton-of-blocks first" | YES — §8 file budgets each include explicit "skeleton-first" reminder. |
| `M1_LENS_CATALOG_TRUE_REBUILD/FINDINGS.md` F-1 (cosmetic class mismatch fixed proactively) | "selector-to-emitted-class match must be verified before write" | YES — §3 S-MODAL-CLASS-MATCH success criterion forces grep audit. |
| Stage 1 FR §7 "minor cosmetic deviation" trigger (action buttons not visually verified on detail row) | "Tier C VFV must seed real data so all surfaces render" | YES — §3 S-VFV-POPULATED requires Localhost-Tester to seed at least 1 brand + 1 series + 1 variant on demo tenant before snapshotting. |
| Memory `feedback_no_polish_by_validation.md` (binding rule from Daniel) | "If Executor finds zero changes needed, STOP and escalate" | YES — §5 stop-trigger "Executor reports 'no code changes needed'" rewritten as ACTIVE halt + escalation, not soft preference. |
| Memory `feedback_vfv_must_use_not_just_inspect.md` | "VFV must USE the surface, not just inspect" | YES — §3 S-VFV-CREATION-FLOWS requires Tester to OPEN each of the 4 creation modals + submit + verify a real row in DB. |
| Memory `feedback_probe_constraints_not_just_tables.md` | "Pre-flight must check CHECK constraints + data partitioning + FK graph" | PARTIALLY — §0.4 schema rehearsal covers column-level reality. Executor's Step 1.5 DB Pre-Flight will additionally enumerate CHECK + FK constraints before any write. |
| Memory `project_inventory_debt_decoupling_rule.md` | "Inventory module never creates supplier debt" | NOT APPLICABLE — 2A creates lens-catalog rows (brand/design/variant), not debt or shipments. |

### 0.7 Pre-existing untracked files survey

Captured 2026-05-18 evening from `git status --porcelain | grep '^??'`:

```
?? "modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1_ACTIVATION_PROMPT.md"
?? "modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1_BRIEF.md"
?? "modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_ACTIVATION_PROMPT.md"
?? "modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_BRIEF.md"
?? "modules/Module 1 - Inventory Management/docs/specs/M1_5_SHARED_COMPONENTS_PHASE_0/"
?? "modules/Module 1.5 - Shared Components/architecture-brief/SEQUENTIAL_NUMBERING_INVESTIGATION_BRIEF.md"
?? "modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SEED_FROM_PRIZMA/FOREMAN_REVIEW.md"
?? "modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SLUG_FIX/FOREMAN_REVIEW.md"
?? "modules/Module 3 - Storefront/docs/specs/M3_DEMO_WEBHOOK_SCRUB/FOREMAN_REVIEW.md"
?? "tests/קטלוג-עדשות-18.5.26.xls"
```

Plus 4 tracked files with M (modified) status: `.claude/skills/opticup-architect/SKILL.md`, `.claude/skills/opticup-architect/references/decisions/CROSS.md`, `OPEN_TASKS.md`, `TECH_DEBT.md`.

**Executor discipline:** the 10 untracked + 4 modified-tracked files are PRE-EXISTING work from prior sessions. The Executor MUST use selective `git add` by explicit filename for every commit. NO `git add -A`. NO `git add .`. NO `git commit -am`. If a destructive operation (like `git clean -fd`) would touch any of these — STOP per CLAUDE.md §1 step 3a Phase 2 absolute rule.

### 0.8 Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File / Source | Metric | Value (captured 2026-05-18 evening) |
|---|---|---|---|
| `BASE_LINES_orchestrator` | `modules/lens-catalog-admin/lens-catalog-admin.js` | `wc -l` | 169 |
| `BASE_LINES_partial` | `modules/lens-catalog-admin/lens-catalog-admin-partial.html` | `wc -l` | 126 |
| `BASE_LINES_suppliers_col` | `modules/lens-catalog-admin/catalog-suppliers-col.js` | `wc -l` | 113 |
| `BASE_LINES_brands_col` | `modules/lens-catalog-admin/catalog-brands-col.js` | `wc -l` | 111 |
| `BASE_LINES_designs_col` | `modules/lens-catalog-admin/catalog-designs-col.js` | `wc -l` | 77 |
| `BASE_LINES_detail_pane` | `modules/lens-catalog-admin/catalog-detail-pane.js` | `wc -l` | 152 |
| `BASE_LINES_admin_css` | `css/lens-catalog-admin-page.css` | `wc -l` | 479 |
| `BASE_LINKS_inventory` | `inventory.html` | `grep -c '<link rel="stylesheet"'` | _Executor verifies; expects 1 added_ |
| `BASE_DESIGNS_GLASSES` | DB | `SELECT COUNT(*) FROM lens_design WHERE product_type='glasses' AND is_deleted=false AND owner_tenant_id IS NULL` | 86 |
| `BASE_DESIGNS_CONTACT` | DB | same but `'contact_lens'` | 34 |
| `BASE_BRANDS_GLASSES` | DB | `COUNT(DISTINCT b.id) FROM lens_brand b JOIN lens_design d ON d.brand_id=b.id WHERE d.product_type='glasses' AND ...` | 14 |
| `BASE_BRANDS_CONTACT` | DB | same but `'contact_lens'` | 9 |
| `BASE_LENS_VARIANTS` | DB | `COUNT(*) FROM lens_variant WHERE is_deleted=false AND owner_tenant_id IS NULL` | 683 |
| `BASE_CONTACT_VARIANTS` | DB | `COUNT(*) FROM contact_lens_variant WHERE is_deleted=false AND owner_tenant_id IS NULL` | 40 |
| `BASE_TENANTS_TOTAL` | DB | `COUNT(*) FROM tenants` | 2 |

---

## 1. Goal

Ship the full mockup-faithful Platform Catalog Admin screen (Optic Up team only) inside `modules/lens-catalog-admin/`: two top-level product-type tabs (עדשות משקפיים / עדשות מגע) that filter shared brand/series tree by `lens_design.product_type` AND swap the variants pane schema; four proper creation modals (supplier / brand / series / variant) replacing the current `window.prompt()` flow; mockup-faithful detail pane (version badge + adoption count + save bar); Excel import buttons disabled with "זמין בשלב 2ב" tooltip; defense-in-depth permission gating preserved via existing `is_platform_super_admin` RPC.

## 1.5 Schema impact

ONE new DB column. ZERO new tables. ZERO new RPCs.

```sql
ALTER TABLE public.lens_design
  ADD COLUMN version integer NOT NULL DEFAULT 1;
```

Rationale: mockup §COL 4 detail header shows "v3 · פעיל" badge. The series-level version is independent of `lens_variant.version` (which exists per-variant for tracking individual variant supersession). Adding the column to `lens_design` is the leaner pattern vs. a separate `lens_design_version` history table — see Brief §3.5 ("Module Strategist picks the smaller-impact route"). Future history-table for change-log inference can be added in Stage 4 alongside tenant adoption-alerts. No history table in 2A.

The `description` and `last_change_summary` fields the mockup also hints at are intentionally NOT added — see §0.2 D-FIX notes.

Migration file: `migrations/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql`.

Application method: Supabase MCP `apply_migration` (Iron Rule 14 + 15 not affected — `lens_design` already has tenant scoping via `owner_tenant_id`; existing RLS policies cover the new column).

Backfill: DEFAULT 1 on the column populates all existing 145 designs (86 glasses + 34 contacts + 25 accessories) with version=1. No data backfill query needed.

## 2. Background & Motivation

Stage 1 closed 🟢 with Tier C VFV 18/2/0 for the **tenant-side** dark/light chrome via `[data-catalog-theme]` on `shared/js/catalog-private-admin.js`. Stage 1's retrospective §7 flagged that the Platform Catalog Admin surface lives in a DIFFERENT module (`modules/lens-catalog-admin/`) — the Brief author conflated the two surfaces. Stage 2A corrects this: extends the actual Platform Catalog Admin module to full mockup fidelity, leaving the tenant-side untouched (Stage 4 scope).

The 5-stage plan progresses 1/5 → 2/5 with this SPEC. Stage 2B (Excel import) and Stages 3-5 follow.

## 3. Success Criteria (Measurable)

Every criterion has an EXACT expected value. The Executor must capture actuals in EXECUTION_REPORT.md §2 alongside each criterion.

| # | ID | Criterion | Expected | Verify command |
|---|----|-----------|----------|----------------|
| 1 | S-BRANCH | Branch is `develop`, repo state at close = clean | "nothing to commit, working tree clean" | `git status` |
| 2 | S-COMMITS | Commits produced on top of START_COMMIT | between 4 and 6 commits | `git log <START>..HEAD --oneline \| wc -l` |
| 3 | S-MIGRATION-APPLIED | DB column exists | `lens_design.version` integer NOT NULL DEFAULT 1 | Supabase MCP `execute_sql`: `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='lens_design' AND column_name='version'` → 1 row with `version`, `integer`, `NO`, `1` |
| 4 | S-MIGRATION-BACKFILL | All existing designs have version=1 | 145 rows where version=1 | `SELECT COUNT(*) FROM lens_design WHERE version = 1` → 145 |
| 5 | S-NEW-FILES | New files exist at exact paths | 3 new JS/CSS + 1 migration | `ls modules/lens-catalog-admin/catalog-modal-helpers.js modules/lens-catalog-admin/catalog-variant-modal.js css/lens-catalog-admin-tabs-modals.css migrations/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql` → exit 0 |
| 6 | S-PARTIAL-TABS | Partial has top-level tabs strip with 2 buttons | 2 elements matching `[data-product-tab="glasses"]` + `[data-product-tab="contact_lens"]` | `grep -c 'data-product-tab=' modules/lens-catalog-admin/lens-catalog-admin-partial.html` → 2 |
| 7 | S-PARTIAL-BUTTONS | Partial has 4 header action buttons matching mockup §line 332-336 | btn-import (disabled) + btn-export (disabled) + btn-changelog (disabled) + btn-add-supplier-header | `grep -c 'btn-import\|btn-export\|btn-changelog\|btn-add-supplier-header' modules/lens-catalog-admin/lens-catalog-admin-partial.html` → ≥4 |
| 8 | S-PARTIAL-DISABLED-TOOLTIPS | 3 disabled buttons carry mockup-faithful tooltip "זמין בשלב 2ב" or "פעולה זו תפעל בשלב עתידי" | 3 `disabled` attributes paired with `title="זמין בשלב 2ב"` or similar | `grep -c 'title="זמין בשלב 2ב"' modules/lens-catalog-admin/lens-catalog-admin-partial.html` → ≥3 |
| 9 | S-ORCHESTRATOR-TAB-STATE | `lens-catalog-admin.js` exports tab state + `switchProductTab()` function | 1 module-level `state.activeProductTab` variable + 1 `switchProductTab` definition | `grep -c 'activeProductTab\|switchProductTab' modules/lens-catalog-admin/lens-catalog-admin.js` → ≥3 |
| 10 | S-DESIGNS-PRODUCT-FILTER | `catalog-designs-col.js` filters `lens_design` by `product_type = state.activeProductTab` | 1 chained `.eq('product_type', ...)` reference | `grep -c "\\.eq\\('product_type'" modules/lens-catalog-admin/catalog-designs-col.js` → ≥1 |
| 11 | S-BRANDS-COUNT-BY-PRODUCT-TYPE | Brand count badge per supplier reflects product-type-filtered distinct designs (not raw supplier_brand_distribution count) | 1 query joining lens_design with product_type filter | `grep -c "product_type" modules/lens-catalog-admin/catalog-brands-col.js` → ≥1 |
| 12 | S-DETAIL-VERSION-BADGE | Detail pane renders version badge in format `v{N} · פעיל` (or `v{N} · טיוטה`) | 1 string template with `v${...} · ${...}` | `grep -E 'v\$\{.*\.version' modules/lens-catalog-admin/catalog-detail-pane.js \| wc -l` → ≥1 |
| 13 | S-DETAIL-ADOPTION-COUNT | Detail pane runs adoption-count query against tenant_active_offerings | 1 `.from('tenant_active_offerings')` reference + denominator from `tenants` count | `grep -c 'tenant_active_offerings\|tenants' modules/lens-catalog-admin/catalog-detail-pane.js` → ≥2 |
| 14 | S-DETAIL-VARIANTS-TABLE-SWAP | Variants table schema swaps per active product tab | 2 distinct table-render branches (one per product_type) | `grep -c "product_type.*===.*'glasses'\|product_type.*===.*'contact_lens'\|activeProductTab.*===.*'glasses'\|activeProductTab.*===.*'contact_lens'" modules/lens-catalog-admin/catalog-detail-pane.js` → ≥2 |
| 15 | S-SAVE-WIRED | "💾 שמור גרסה" button increments `lens_design.version` via an atomic-style update | 1 `.update({ version: ... })` chained call | `grep -c "\\.update.*version" modules/lens-catalog-admin/catalog-detail-pane.js` → ≥1 |
| 16 | S-PLACEHOLDER-BUTTONS | "📋 שכפל" + "🗑 השבת" buttons fire informational toast in 2A | 2 `showToast` or `Toast.info` calls in placeholder handlers | `grep -c "פעולה זו תפעל בשלב 4\|שלב 4" modules/lens-catalog-admin/catalog-detail-pane.js` → ≥2 |
| 17 | S-MODAL-HELPERS-API | New `catalog-modal-helpers.js` exports `openModal`, `closeModal`, `wireModal` | 3 named exports | `grep -c "^export function\|^export const" modules/lens-catalog-admin/catalog-modal-helpers.js` → ≥3 |
| 18 | S-VARIANT-MODAL-SWAP | `catalog-variant-modal.js` renders different form fields per product_type | 2 distinct form-shape branches | `grep -c "activeProductTab.*===\|product_type.*===" modules/lens-catalog-admin/catalog-variant-modal.js` → ≥2 |
| 19 | S-4-MODALS-WIRED | 4 creation buttons trigger modal dialogs (not `window.prompt`) | 0 `window.prompt(` calls remain in 6 files | `grep -rn "window.prompt(" modules/lens-catalog-admin/*.js` → "" (empty match) |
| 20 | S-MODAL-CLASS-MATCH | Every CSS class used in a modal's HTML template appears as a selector in the new CSS file | All emitted classes findable in `lens-catalog-admin-tabs-modals.css` | Spot-check: pick 5 random emitted classes, grep each in the new CSS file → all 5 hit |
| 21 | S-NEW-CSS-LOC | New `lens-catalog-admin-tabs-modals.css` size | between 180 and 350 LOC (Iron Rule 12) | `wc -l css/lens-catalog-admin-tabs-modals.css` → 180-350 |
| 22 | S-EXISTING-CSS-UNTOUCHED | Existing `css/lens-catalog-admin-page.css` byte-identical to `BASE_LINES_admin_css` (479 LOC) | 479 lines | `wc -l css/lens-catalog-admin-page.css` → 479 |
| 23 | S-INVENTORY-LINK-ADDED | `inventory.html` has 1 new `<link>` for the new CSS file | `BASE_LINKS_inventory` + 1 | `grep -c "lens-catalog-admin-tabs-modals.css" inventory.html` → 1 |
| 24 | S-PRIVATE-CATALOG-UNTOUCHED | `shared/js/catalog-private-admin.js` + `shared/css/catalog-private-admin.css` byte-identical | both files unchanged | `git diff --name-only START..HEAD \| grep "shared/.*catalog-private-admin"` → "" (empty) |
| 25 | S-IRON-RULE-7 | Every DB write in new code uses existing `sb.from(...).insert/update/delete` pattern (no raw fetch / Supabase URL hardcoded) | 0 `fetch.*supabase` references in new files | `grep -c "fetch.*supabase\\.co\|XMLHttpRequest" modules/lens-catalog-admin/catalog-modal-helpers.js modules/lens-catalog-admin/catalog-variant-modal.js` → 0 |
| 26 | S-IRON-RULE-8 | Every user-input render in new code escapes via `escapeHtml` or `textContent`. No `innerHTML +=` of unsanitized user data. | 0 violations | manual spot-check by Reviewer of 3 random `innerHTML` assignments in new files |
| 27 | S-IRON-RULE-12 | Every modified/new JS file ≤ 350 LOC (target ≤ 300) | 10 files (8 existing + 2 new) all ≤350 | `wc -l modules/lens-catalog-admin/*.js` → every line ≤350 |
| 28 | S-IRON-RULE-22-INSERTS | Every `.insert()` and `.update()` in new code includes explicit tenant_id where applicable (for tenant-scoped tables: `suppliers`, `supplier_brand_distribution`); for global tables (`lens_brand`, `lens_design`, `lens_variant`, `contact_lens_variant`) explicit `owner_tenant_id: null` | 4 modal handlers compliant | Reviewer audits each modal's insert payload |
| 29 | S-VERIFY-STAGED | `npm run verify:integrity` (Iron Rule 31) exits 0 or 2 (no null-byte ERROR) | exit code in {0, 2} | `npm run verify:integrity; echo $?` → 0 or 2 |
| 30 | S-VERIFY-FULL | `npm run verify -- --staged` exits 0 | exit 0 | `npm run verify -- --staged; echo $?` → 0 |
| 31 | S-NO-POLISH | Real code changes shipped — never "existing meets criteria" closure | ≥800 LOC added across files modified, ≥3 new files, +1 DB column | `git diff --stat START..HEAD` lists at minimum: 1 migration file added + 3 JS/CSS files added + 6+ existing files modified |
| 32 | S-VFV-GLASSES-TAB | Tier C VFV: glasses tab side-by-side w/ mockup | Match per element (header / col 1 / col 2 / col 3 / col 4 / save bar) | Localhost-Tester writes TEST_REPORT.md with mockup-faithfulness classification per element (match/minor/fail). |
| 33 | S-VFV-CONTACTS-TAB | Tier C VFV: contacts tab side-by-side w/ mockup | Match per element (variants pane uses contacts schema) | Same as S-VFV-GLASSES-TAB but contacts schema verified. |
| 34 | S-VFV-EMPTY-STATE | Tier C VFV: empty state on demo tenant (no series for selected brand) | Empty-state message + "אין סדרות למותג זה" hint | Snapshot under `screenshots/04_empty_state.png`. |
| 35 | S-VFV-POPULATED | Tier C VFV: populated state on demo tenant — seeded with ≥1 brand + ≥1 series + ≥1 variant of each schema type | All 4 columns + detail pane render w/ real data | Snapshot under `screenshots/05_populated_state.png`. Localhost-Tester seeds via existing admin tools BEFORE snapshotting if demo lacks data. |
| 36 | S-VFV-CREATION-FLOWS | Tier C VFV: open each of 4 creation modals + submit + verify a real row in DB (use Daniel's two phone test data per memory `feedback_test_data_phones.md` if any SMS-adjacent path fires; this SPEC has none) | 4 modals open + submit + DB row count incremented by 1 each | 4 snapshots `06a_modal_supplier.png` / `06b_modal_brand.png` / `06c_modal_series.png` / `06d_modal_variant.png` + DB query log. |
| 37 | S-VFV-NO-CONSOLE | 0 console errors / warnings across all VFV pages | 0 NEW errors/warnings introduced by 2A (pre-existing GoTrueClient noise allowed) | Localhost-Tester logs all console messages; flags any new ones |
| 38 | S-SESSION-CONTEXT | `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` has Stage 2A closure block prepended (above Stage 1 block) | new top entry with status + commits + findings | manual file diff |
| 39 | S-CHANGELOG | `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` has Stage 2A section | new section added | manual file diff |
| 40 | S-MODULE-MAP | `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` lists 2 new JS files + 1 new CSS file + 1 new migration | 4 new rows | grep verify |

**4 of the 40 criteria are Localhost-Tester-observable** (S-VFV-GLASSES-TAB, S-VFV-CONTACTS-TAB, S-VFV-EMPTY-STATE, S-VFV-POPULATED, S-VFV-CREATION-FLOWS, S-VFV-NO-CONSOLE = 6 actually, plus the 34 Executor-measurable for the totals 40). Reviewer can spot-check Executor-measurable criteria independently of the Executor's own report.

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo, run read-only SQL (Level 1 autonomy)
- Create, edit, move files listed in §8 "Expected Final State"
- Apply 1 DB migration via `mcp__claude_ai_Supabase__apply_migration` (Level 2 autonomy — DDL approved by Daniel via Brief §1.5 D5 + this SPEC §1.5)
- Commit and push to `develop` using SELECTIVE `git add` (explicit filenames only)
- Run `npm run verify:integrity` + `npm run verify -- --staged` + other read-only verify scripts
- Apply any executor-improvement proposal from a recent FOREMAN_REVIEW that directly applies (e.g., LOC budget skeleton-first per P-EXEC-2 of Stage 1)
- Seed test data on demo tenant for the Tester to use (`is_platform_super_admin` true via dev-mode bypass on localhost ONLY; this SPEC's seed paths use the new modals on the running app, not direct SQL)

### What REQUIRES stopping and reporting

- Any file outside §8 list being modified
- Any DDL beyond the one declared in §1.5 (e.g., adding `description` or `last_change_summary` mid-run is OUT OF SCOPE)
- Any merge to `main`
- Any `is_platform_super_admin` returning false on either localhost dev-bypass or any other expected-true context
- Any verify gate failing
- Any §3 actual diverging from expected
- **Specifically: if Executor finds zero changes needed (no new code) → STOP and escalate via `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_no-changes-needed.md`. Per Brief §5 D7 + memory `feedback_no_polish_by_validation.md` (binding).**

## 5. Stop-on-Deviation Triggers (specific to this SPEC, additive to CLAUDE.md §9 globals)

- **HARD RULE — NO polish-by-validation closure.** If Executor finds zero changes needed, STOP and write `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_no-changes.md` then halt. Memory `feedback_no_polish_by_validation.md` is binding.
- If the migration apply returns any warning or non-zero status → STOP. Roll back via `ALTER TABLE lens_design DROP COLUMN version;` if column was added but downstream failed.
- If `is_platform_super_admin()` returns false on the dev-mode localhost session → STOP (RPC must work; if it doesn't, that's an out-of-scope DB issue per Brief §12).
- If any Brief §9 anti-pattern fires:
  1. Polish-by-validation closure (covered above).
  2. Self-certified visual match without Chrome MCP side-by-side mockup-vs-live. (Tester writes TEST_REPORT.md only after the Chrome side-by-side has run.)
  3. Scope creep into Excel parsing logic. If Executor wants to wire `xlsx` parsing for the brand quick-import button → STOP, log to FINDINGS, leave button disabled.
  4. Modification of `shared/js/catalog-private-admin.js` or `shared/css/catalog-private-admin.css` or `inventory.html` rows for the `private-catalog` tab → STOP, that's Stage 4.
  5. Deletion of any `lens_brand` rows (including the 3 misclassified "brands": יומיות / חודשיות / שנתיות) → STOP, separate curation SPEC.
- If `MAX(lens_design.version)` query returns NULL on a row after migration → STOP, backfill check failed.
- If new CSS file overshoots 350 LOC → STOP, plan a split BEFORE writing more.
- If any new JS file overshoots 350 LOC → STOP, split BEFORE staging.

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:

1. `git reset --hard <START_COMMIT>` — the START_COMMIT hash captured at SPEC start. (Executor records this in EXECUTION_REPORT §1.)
2. DB rollback:
   ```sql
   ALTER TABLE public.lens_design DROP COLUMN IF EXISTS version;
   ```
   (Apply via Supabase MCP `apply_migration` with the rollback SQL.)
3. Pipeline lock release: `node scripts/pipeline-coordination.mjs release --spec-slug M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A --session-id <ID>`
4. Notify Foreman; SPEC is marked REOPEN, not CLOSED.

## Destructive Operations

None.

(Per Iron Rule 32, this declaration implicitly forbids ALL destructive operations for this SPEC's run. The DDL `ALTER TABLE ADD COLUMN` is ADDITIVE — NOT destructive — and is explicitly authorized via §1.5. If the Executor encounters a need for any destructive op mid-run, STOP per Iron Rule 32 protocol.)

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- `shared/js/catalog-private-admin.js` (tenant-side; Stage 4)
- `shared/css/catalog-private-admin.css` (Stage 4)
- Existing tenant-side `inventory.html` tabs other than the 3 `[data-tab="catalog-admin"]` mounts (Stage 4)
- The 3 misclassified "brands" (יומיות / חודשיות / שנתיות) — separate curation SPEC
- Excel parsing / file upload UI / preview-with-corrections dialog (Stage 2B)
- Brand quick-import button wiring — exists in DOM but `disabled`
- Adding `description`, `last_change_summary`, or any other column besides `version` to `lens_design`
- Tenant-side adoption alerts (Stage 4)
- Multi-tenant version diff inference / "smart" change-summary detection (Stage 4 or later)
- The `accessory` product type (Stage 5)
- Pricing / VAT logic (separate health-funds Brief, not this Stage)
- Module 1.5 (Shared Components) — no changes
- Module 3 (Storefront) — no changes

## 8. Expected Final State

### Skeleton scaffolds for new files (Executor fills each block to its budget)

#### File A — `modules/lens-catalog-admin/catalog-modal-helpers.js` (NEW, target 80-130 LOC)

```javascript
// catalog-modal-helpers.js — shared modal DOM helpers for the 4 creation modals.
// Provides: openModal, closeModal, wireModal, validateRequired, focusFirstInput.
//
// Per Iron Rule 8: all user input rendered via escapeHtml from lens-catalog-admin.js
// or via textContent assignment (never innerHTML with raw input).
//
// Per Iron Rule 21: this is the SINGLE modal-helpers module — no duplicate in shared/.

import { escapeHtml } from './lens-catalog-admin.js';

// ===== Public API ============================================================

// openModal({title, bodyHtml, submitLabel, onSubmit, cancelLabel?}) → element
export function openModal(opts) { /* ... */ }

// closeModal(modalEl) — fade out + remove from DOM
export function closeModal(modalEl) { /* ... */ }

// wireModal(modalEl, fields, {onSubmit}) — wire submit button + ESC key + click-outside
export function wireModal(modalEl, fieldsConfig, callbacks) { /* ... */ }

// validateRequired(formEl) → {ok: bool, missing: [fieldName]}
export function validateRequired(formEl) { /* ... */ }

// focusFirstInput(modalEl) — accessibility helper
export function focusFirstInput(modalEl) { /* ... */ }
```

#### File B — `modules/lens-catalog-admin/catalog-variant-modal.js` (NEW, target 150-220 LOC)

```javascript
// catalog-variant-modal.js — single-variant create/edit modal (handles BOTH schemas).
//
// Open: openVariantModal({state, mode: 'create'|'edit', existingVariant?})
// Schema swap: per state.activeProductTab ('glasses' → lens_variant; 'contact_lens' → contact_lens_variant)
//
// Per Iron Rule 22: insert payload includes owner_tenant_id: null (global rows)
// Per Iron Rule 7: writes via existing `sb` client from catalog-auth.js
//
// State assumptions: state.selectedDesign must be set before opening modal.

import { sb } from './catalog-auth.js';
import { openModal, wireModal, validateRequired } from './catalog-modal-helpers.js';
import { showToast, escapeHtml } from './lens-catalog-admin.js';

// ===== Public API ============================================================

// openVariantModal(state, onCreated?) — opens schema-correct modal
export function openVariantModal(state, onCreated) { /* ... */ }

// ===== Internal ==============================================================

// renderGlassesForm() → html (lens_variant fields: refractive_index, diameter_mm, coating, tint, sph_min/max, cyl_min/max, add_min/max)
function renderGlassesForm() { /* ... */ }

// renderContactForm() → html (contact_lens_variant fields: base_curve, sph, cyl, axis, wearing_schedule, qty_per_box, water_content_pct)
function renderContactForm() { /* ... */ }

// createGlassesVariant(payload) → {data, error}
async function createGlassesVariant(payload) { /* ... */ }

// createContactVariant(payload) → {data, error}
async function createContactVariant(payload) { /* ... */ }
```

#### File C — `css/lens-catalog-admin-tabs-modals.css` (NEW, target 180-350 LOC)

```css
/* lens-catalog-admin-tabs-modals.css — page-scope CSS for the M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A
   additions: top-level product-type tabs strip + 4 creation modals + counts badge
   + zero-series brand-card hint + save-bar action buttons (color variants).

   ALL selectors are scoped to .lens-tab-section[data-tab="catalog-admin"] OR
   the standalone modal overlay class (modals render at body-level, gated by
   .lens-catalog-admin-modal-overlay class). NO mutation of :root.

   Skeleton plan (Executor fills each block to its budget):
     L1–~15:  file header + page-scope tab-strip wrap
     L~16–~70: top-level tabs strip (.lens-cat-admin-product-tabs)
     L~71–~150: counts badge + zero-series hint + save-bar action buttons
     L~151–~290: 4 creation modals (base overlay + form fields + buttons)
     L~291–~340: animations + focus rings + disabled tooltip styling
*/

/* ===== L1-15: header ===== */

/* ===== L16-70: TOP-LEVEL PRODUCT-TYPE TABS STRIP ===== */
.lens-tab-section[data-tab="catalog-admin"] .lens-cat-admin-product-tabs { /* ... */ }

/* ===== L71-150: COUNTS BADGE + ZERO-SERIES HINT + SAVE-BAR ACTION COLORS ===== */
.lens-tab-section[data-tab="catalog-admin"] .counts-badge { /* ... */ }
.lens-tab-section[data-tab="catalog-admin"] .brand-card .no-series-hint { /* ... */ }
.lens-tab-section[data-tab="catalog-admin"] .save-bar .btn-disable { color: #fca5a5; } /* mockup line 661 */

/* ===== L151-290: 4 CREATION MODALS ===== */
.lens-catalog-admin-modal-overlay { /* ... */ }
.lens-catalog-admin-modal-card { /* ... */ }
.lens-catalog-admin-modal-form .field { /* ... */ }
/* (all 4 modals share these base classes; field-shape swaps via JS render) */

/* ===== L291-340: ANIMATIONS + FOCUS RINGS + DISABLED TOOLTIPS ===== */
.lens-catalog-admin-modal-overlay { animation: lens-cat-admin-fade-in 0.15s ease-out; }
@keyframes lens-cat-admin-fade-in { from { opacity: 0 } to { opacity: 1 } }
.lens-tab-section[data-tab="catalog-admin"] button[disabled][title] { /* tooltip styling */ }
```

#### File D — Migration `migrations/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql` (NEW)

```sql
-- M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A — adds series-level version column to lens_design.
-- Authored by: opticup-strategic (Foreman) 2026-05-18
-- Applied via Supabase MCP `apply_migration`.
-- Rollback: ALTER TABLE public.lens_design DROP COLUMN IF EXISTS version;

ALTER TABLE public.lens_design
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.lens_design.version IS
  'Series-level version counter — increments on each material save (name / lens_type / variants set). Distinct from lens_variant.version which tracks individual variant supersession. Backfilled to 1 for all existing 145 designs.';
```

### Modified files

| File | Change | New LOC target |
|---|---|---|
| `modules/lens-catalog-admin/lens-catalog-admin.js` | Add `state.activeProductTab` + `switchProductTab()` + counts loader for header badge + initial tab from URL `?ptab=` query param | from 169 → ~230-260 |
| `modules/lens-catalog-admin/lens-catalog-admin-partial.html` | Add product-tabs strip ABOVE the 4-col grid; restructure header to match mockup §line 325-337 (title + counts badge + 4 buttons); add zero-series hint markup; replace existing add buttons with modal-triggering buttons | from 126 → ~165-195 |
| `modules/lens-catalog-admin/catalog-suppliers-col.js` | Replace `window.prompt()` with modal via `catalog-modal-helpers.js` | from 113 → ~140-160 |
| `modules/lens-catalog-admin/catalog-brands-col.js` | Replace `window.prompt()` with modal; add product-type-aware brand-count badge; add zero-series hint render; render disabled quick-import button per brand-card | from 111 → ~170-200 |
| `modules/lens-catalog-admin/catalog-designs-col.js` | Replace `window.prompt()` with modal; filter `lens_design` by `state.activeProductTab` → `product_type`; category options swap per tab | from 77 → ~150-180 |
| `modules/lens-catalog-admin/catalog-detail-pane.js` | Full mockup-faithful rebuild: version badge, adoption count, series-fields editor (name + lens_type select + sub-toggle visual-only + description disabled), variants table with schema swap, save bar with 3 buttons (שמור גרסה wired, שכפל/השבת placeholder) | from 152 → ~280-330 |
| `inventory.html` | Add 1 `<link rel="stylesheet" href="css/lens-catalog-admin-tabs-modals.css">` after the existing `lens-catalog-admin-page.css` link (line 49) | +1 line |
| `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | Prepend Stage 2A closure block above Stage 1 block | +25-40 lines |
| `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` | Append Stage 2A section | +15-25 lines |
| `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` | Add 4 new rows (catalog-modal-helpers.js / catalog-variant-modal.js / lens-catalog-admin-tabs-modals.css / lens_design.version migration) | +4 rows |

### Unchanged (must verify byte-identical at close)

- `modules/lens-catalog-admin/catalog-auth.js` (53 LOC, gated by S-24-style check)
- `modules/lens-catalog-admin/catalog-import.js` (125 LOC — Excel logic stays; the BUTTON triggering it becomes disabled, but the JS file itself is untouched)
- `css/lens-catalog-admin-page.css` (479 LOC, gated by S-22)
- `shared/js/catalog-private-admin.js` + `shared/css/catalog-private-admin.css` (gated by S-24)

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` — N/A this SPEC (M1 lens-catalog stays "in rebuild" until Stage 5 closes; no row-level promotion).
- `docs/GLOBAL_MAP.md` — N/A (no new shared functions; the new modal-helpers / variant-modal are module-scoped, not project-scoped).
- `docs/GLOBAL_SCHEMA.sql` — DEFERRED to Integration Ceremony (after Stage 5 closes the module). The lens_design.version column is captured in this SPEC's migration file; merging into GLOBAL_SCHEMA happens at module close.
- `docs/FILE_STRUCTURE.md` — DEFERRED — TECH_DEBT entry recommended (per Stage 1 P-AUTHOR-2 + author proposal: 3 new files under registered directories should land in FILE_STRUCTURE; deferred to housekeeping session per same disposition as Stage 1 F-1).
- Module's `SESSION_CONTEXT.md` — UPDATED (Stage 2A closure block prepended).
- Module's `CHANGELOG.md` — UPDATED (Stage 2A section appended).
- Module's `MODULE_MAP.md` — UPDATED (4 new rows).

## 9. Commit Plan

5 commits expected. All on `develop`, all selective `git add` by explicit filename.

| # | Type | Scope | Subject | Files |
|---|------|-------|---------|-------|
| 1 | feat | db | `add lens_design.version column for series-level versioning` | `migrations/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql` |
| 2 | feat | catalog-admin | `product-type tabs (glasses + contact_lens) + product_type-aware drill` | `lens-catalog-admin.js` + `lens-catalog-admin-partial.html` + `catalog-designs-col.js` + `catalog-brands-col.js` + `css/lens-catalog-admin-tabs-modals.css` + `inventory.html` |
| 3 | feat | catalog-admin | `mockup-faithful detail pane (version badge + adoption count + save bar)` | `catalog-detail-pane.js` |
| 4 | feat | catalog-admin | `proper modals for supplier / brand / series / variant creation` | `catalog-modal-helpers.js` (NEW) + `catalog-variant-modal.js` (NEW) + `catalog-suppliers-col.js` + `catalog-brands-col.js` + `catalog-designs-col.js` (incremental updates from commit 2) |
| 5 | chore | spec | `close M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A with retrospective` | `SPEC.md` (this file) + `EXECUTION_REPORT.md` + `FINDINGS.md` + `SESSION_CONTEXT.md` + `CHANGELOG.md` + `MODULE_MAP.md` |

Reviewer + Localhost-Tester + Foreman closure files (`REVIEWER_REPORT.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md`, `screenshots/*.png`) land in COMMIT 6+ (Foreman's closure commit) — NOT in Commit 5. **This avoids the Stage 1 anti-pattern** where the Executor's "close" commit landed before the closure artifacts existed (Stage 1 FR §2 weakness #3 + §3 weakness #1).

## 10. Dependencies / Preconditions

- Stage 1 (`M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1`) closed 🟢 — verified.
- `is_platform_super_admin` RPC exists and returns boolean — verified via information_schema query.
- Supabase MCP available (project_id `tsxrrxzmdxaenlvocyit`) — assumed online.
- Localhost dev servers (ERP :3000 + Storefront :4321) available for Tier C VFV — Tester verifies before snapshotting.
- Localhost `?dev=1` bypass for `catalog-auth.js` works — verified by code read (line 22-27 of catalog-auth.js, strict equality on hostname='localhost' + URL query flag).

## 11. Lessons Already Incorporated

See §0.6 above for the table of FOREMAN_REVIEW proposals + this SPEC's response to each.

Cross-Reference Check (Rule 21 author-time sweep): completed 2026-05-18 evening. New names introduced:
- `lens_design.version` column → 0 collisions (column does not exist).
- `state.activeProductTab` JS variable → 0 collisions in `modules/lens-catalog-admin/*.js`.
- `switchProductTab` function → 0 collisions.
- `openModal`, `closeModal`, `wireModal`, `validateRequired`, `focusFirstInput` exports from new `catalog-modal-helpers.js` → 0 collisions (these names exist in OTHER modules but `import` is scoped — no global window pollution; these are ES module exports, not window-level).
- `openVariantModal` export from new `catalog-variant-modal.js` → 0 collisions.
- CSS classes `.lens-cat-admin-product-tabs`, `.lens-cat-admin-modal-overlay`, `.lens-cat-admin-modal-card`, `.lens-catalog-admin-modal-form` → 0 collisions (verified via `grep -r "lens-cat-admin-product-tabs\|lens-catalog-admin-modal" css/ shared/css/ modules/`).
- Migration file `M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql` → 0 collisions (no prior migration with this slug).
- New files in `modules/lens-catalog-admin/` (`catalog-modal-helpers.js`, `catalog-variant-modal.js`) → 0 collisions.

Cross-Reference Check completed 2026-05-18 against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE + per-module db-schema.sql + per-module MODULE_MAP: **0 collisions / 12 names introduced cleanly.**

## 12. Pre-Merge Checklist

Every SPEC must pass these items before the Executor closes it. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2 (no null-byte ERROR anywhere in HEAD).
- [ ] `git status --short` returns empty (clean tree) at close.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in the SPEC folder.
- [ ] Migration applied successfully via Supabase MCP, verified by `S-MIGRATION-APPLIED` query.
- [ ] All 4 modals functional via UI (verified by Tester per S-VFV-CREATION-FLOWS).
- [ ] Reviewer's REVIEWER_REPORT.md present and verdict ≠ REOPEN.
- [ ] Tester's TEST_REPORT.md present, Tier C VFV PASS verdict.
- [ ] Module SESSION_CONTEXT.md / CHANGELOG.md / MODULE_MAP.md updated per §8.
- [ ] Pipeline lock released via `node scripts/pipeline-coordination.mjs release ...`

---

**End of SPEC. Dispatch to opticup-executor next.**
