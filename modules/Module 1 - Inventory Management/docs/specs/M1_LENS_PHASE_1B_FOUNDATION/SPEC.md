# SPEC — M1_LENS_PHASE_1B_FOUNDATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman hat, Full-Auto Pipeline single chat)
> **Authored on:** 2026-05-15
> **Module:** 1 — Inventory Management
> **Phase:** 1B-foundation (3 read-heavy screens half; sibling SPEC `M1_LENS_PHASE_1B_PROCUREMENT` will ship the write-heavy half)
> **Author signature:** Foreman, frozen-skill-state inherited from `M1_SKILL_IMPROVEMENT_HARVEST` (ca823e3)
> **Heading convention:** `## N. Title` plain numbered (Iron Rule 32 pre-commit regex compatible).

---

## 0. Pre-Authoring Reality Check

> **MANDATORY audits applied** per `M1_SKILL_IMPROVEMENT_HARVEST` (Proposals A1+A2 baked into SPEC_TEMPLATE.md §0 — ca823e3).
> A SPEC missing the applicable audit is NOT ready for dispatch.

### Source documents consumed

- Brief read end-to-end: `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_FOUNDATION_BRIEF.md` (313 lines).
- Inherited FOREMAN_REVIEWs:
  - `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` (Author Proposals #1+#2, Executor Proposals #1+#2).
  - `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` (Author Proposals #1+#2, Executor Proposals #1+#2).
  - `M1_SKILL_IMPROVEMENT_HARVEST/RETROSPECTIVE.md` (frozen-skill state).
- M1 architect decisions: `.claude/skills/opticup-architect/references/decisions/M1.md` (D-M1-01..D-M1-16).
- Mockup files: `LENS_INVENTORY_MOCKUP.html` + `LENS_DESIGNS_SELECTION_MOCKUP.html` + `LENS_PRICING_MOCKUP.html`.
- Phase 1A UI patterns: `lens-catalog-admin.html` + `modules/lens-catalog-admin/` (esm + Supabase Auth gate — Platform Admin variant); contrast with employee-facing patterns in `inventory.html` (vanilla JS + PIN auth + `data-permission`).
- Live Supabase project: `tsxrrxzmdxaenlvocyit`.

### Concurrent-Pipeline awareness (orthogonality envelope)

If another Pipeline may run in parallel on `develop`, this SPEC declares its orthogonality envelope:

**This SPEC touches:**

- New files: `lens-inventory.html`, `lens-active-designs.html`, `lens-pricing.html` at repo root + `modules/lens-inventory/`, `modules/lens-active-designs/`, `modules/lens-pricing/` JS folders.
- Modified files (additive only): `scripts/checks/root-allowlist.json` (3 entries), `docs/GLOBAL_MAP.md` (RPC additions), `docs/FILE_STRUCTURE.md` (3 new HTML + 3 new dirs), `docs/DB_TABLES_REFERENCE.md` (no new tables — existing references), `js/shared.js` (no new T-constants needed — existing entries cover all touched tables). Module-scoped: `modules/Module 1 - Inventory Management/docs/{SESSION_CONTEXT,CHANGELOG,MODULE_MAP}.md`.
- New DB objects: 3 SECURITY DEFINER RPCs (`toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay`) + 3 (or 6 — see D8) per-tenant permission rows.
- SPEC folder contents: SPEC.md (this), EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, MIGRATION.md (Applied Log), ROLLBACK.md.

**It WILL NOT conflict with:**

- M4 (CRM) — no shared files or tables. The `permissions` table is the only shared surface; M4 doesn't seed `lens.*` keys.
- M9 (Lab) — different table set; M1↔M9 contracts (K1..K5) untouched.
- Storefront repo (`opticalis/opticup-storefront`) — different repo; no shared HTML/JS files; views read by storefront not modified.
- `lens-catalog-admin.html` + Phase 1A artifacts (the 17 tables + 9 RPCs) — read-only references for this SPEC.
- M1B0 schema (purchase_order, purchase_order_line, supplier_debt, the 5 PO RPCs) — read-only references.
- M1.5 maintenance Pipelines — no shared files.
- 21 FK indexes SPEC (`M1A_FK_INDEXES_PREP_FOR_1B` if dispatched in parallel) — index creation is additive to existing tables; lens-* JS reads through `fetchAll`, indifferent to underlying index plan.

**If a concurrent Pipeline's commits interleave between this SPEC's commits**, that is acceptable as long as both stay within their declared scope. The Executor will not abort on interleaved commits from declared-orthogonal scopes; it will abort if an interleaved commit touches a path inside this SPEC's declared scope (e.g., another agent rewrites `lens-inventory.html` mid-pipeline). Historical context: M1B0 ran with 3 SECURITY_HOTFIX_2 interleaved commits without incident — the discipline is proven.

### §6 Probes — Live Supabase + repo checks (pinned 2026-05-15)

**Probe 1 — Demo lens-stock fixture counts:**

| Table | Demo rows | Note |
|---|---|---|
| `tenant_lens_stock` | 3 | M1A smoke fixtures (1 lot × 1 variant × 1 location with sph/cyl/add combos) |
| `stock_lot` | 7 | M1A + M1B0 smoke fixtures persist |
| `lens_variant` | 1 | LV-TST001 (M1A seed) |
| `lens_design` | 1 | Stellify (M1A seed) |
| `lens_brand` | 1 | Hoya (M1A seed) |
| `supplier_catalog_offering` | 1 | M1A seed |
| `tenant_active_offerings` | 0 | empty — smoke must INSERT to activate |
| `pricing_overlay` | 0 | empty — smoke must INSERT to apply overlay |
| `vat_rates` (IL active) | 1 | 18% IL row (`effective_until IS NULL`) |
| `purchase_order` (demo) | 2 | M1B0 smoke fixtures (PO-000001 cancelled, PO-000002 sent) |

**Probe 2 — Schema shape audit (Smoke-touched schema audit per A1):** the 10 tables above all return expected `information_schema.columns` shapes. Detailed shapes pinned in §0 Smoke-touched schema audit sub-section below.

**Probe 3 — `effective_price` actual signature:**

```
public.effective_price(p_offering_id uuid, p_tenant_id uuid, p_as_of_ts timestamp with time zone DEFAULT now())
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
```

Body resolves variant→design via `lens_variant.design_id`; iterates `pricing_overlay` rows matching `scope_variant_id = v_variant_id OR scope_design_id = v_design_id OR scope_supplier_id = v_supplier_id` ordered by `application_order`; applies `additive` / `multiplicative` / `exclusive_max` stacking rules; appends VAT from `vat_rates.id` if `is_vat_inclusive=false`. Two-line JWT guard (not full Block A — pre-existing M1A pattern, out of scope for this SPEC).

**Probe 4 — Permission infrastructure:**

| Object | Status |
|---|---|
| `is_user_authorized_for(...)` Postgres function | **DOES NOT EXIST** (Brief assumption diverged — see D3) |
| `permissions` table | exists, PK = `(id TEXT, tenant_id UUID)` per-tenant rows |
| `permissions` columns | `id, module, action, name_he, description, tenant_id, created_at` |
| `role_permissions` rows | 382 |
| `employee_roles` rows | 12 |
| `roles` rows | 10 |
| `hasPermission(key)` JS global | `js/auth-service.js:286` — applies UI gating via `data-permission` attribute (project-canonical pattern) |
| `requirePermission(key)` JS global | `js/auth-service.js:292` — throws if missing |
| Existing modules in `permissions.module`: `ai, audit, brands, crm, debt, employees, goods_receipts, inventory, purchasing, reports, returns, settings, shipments, stock_count, suppliers, sync` (no `lens` yet) |

**Probe 5 — JS/repo conventions:**

- `js/shared.js`: 322 lines (soft-300 WARN per M1B0-DEBT-01; under hard 350). Contains `T` constants for all touched tables: `T.PRICING_OVERLAY`, `T.TENANT_ACTIVE_OFFERINGS`, `T.TENANT_LENS_STOCK`, `T.STOCK_LOTS` (plural — see D6), `T.VAT_RATES`, `T.CURRENCIES`, `T.LENS_BRANDS`, `T.LENS_DESIGNS`, `T.LENS_VARIANTS`, `T.SUPPLIER_BRAND_DIST`. **No new T-constant additions needed** — every smoke-touched table already has a constant.
- `js/supabase-ops.js:78`: `fetchAll(tableName, filters)` — auto-injects `getTenantId()` + `eq('tenant_id', tid)` + paginates. **This is the canonical wrapper.** The Brief said `DB.fetchAll`; reality is free function `fetchAll`. Semantic match; SPEC adapts naming (see D5).
- `js/shared.js:255`: `function escapeHtml(str)` — canonical HTML-escape (Phase 1A G-6 lesson: reuse, do not reimplement).
- `shared/js/modal-builder.js`: provides `window.Modal` (IIFE-attached). API: `Modal.show({title, body, buttons})`, `Modal.close()`, `Modal.alert(...)`, etc. Phase 1A G-4 lesson: no `window.prompt/confirm` — use `Modal.*`.
- `lens-catalog-admin.html` (Phase 1A baseline pattern, **Platform Admin variant** — does NOT apply to the 3 employee-facing screens in this SPEC): ESM + Supabase Auth + `is_platform_super_admin()` RPC gate. **Out of scope as a pattern** for the 3 new employee-facing screens.
- `inventory.html` (employee-facing canonical pattern, **DOES apply**): vanilla JS, no ESM, `<script src=...>` includes, `data-tab-permission` + `data-permission` attributes, `applyUIPermissions` toggles visibility via CSS body classes. The 3 new screens follow this pattern.
- `lens-catalog-admin.html` is in `root-allowlist.json` at line 42 (category 3 HTML entrypoints). The 3 new HTML files MUST be added to the same array.

**Probe 6 — M1B0 PO smoke fixtures:** 2 purchase_order rows on demo (`PO-000001` cancelled, `PO-000002` sent). The pricing-display scenario uses `supplier_catalog_offering` row referenced by M1B0 PO line — `ab9cdc83-006a-4ced-8a51-e15ec2c08260` supplier_debt fixture from M1B0 confirms the offering+price chain works end-to-end.

**Probe 7 — `tenant_active_offerings` UPSERT anchor:** UNIQUE index `tenant_active_offerings_unique` on `(tenant_id, offering_id, location_id) NULLS NOT DISTINCT WHERE is_deleted=false`. Toggle RPC uses this for `ON CONFLICT (...) DO UPDATE` semantics.

**Probe 8 — `pricing_overlay` exactly-one-scope CHECK (Phase 1A invariant):**

```sql
CHECK ((CASE WHEN (scope_variant_id IS NOT NULL) THEN 1 ELSE 0 END
      + CASE WHEN (scope_design_id IS NOT NULL) THEN 1 ELSE 0 END
      + CASE WHEN (scope_supplier_id IS NOT NULL) THEN 1 ELSE 0 END) = 1)
```

UPSERT RPCs MUST preserve this. SPEC §3 success criterion exercises a deliberate violation INSERT to confirm RAISE.

**Probe 9 — `pricing_overlay` RLS pattern:** canonical 2-policy (`service_bypass` + `tenant_isolation` with JWT-claim USING clause). Same on `tenant_active_offerings`. Iron Rule 15 canonical pattern intact.

### Inner-call arity audit (per A1 — MANDATORY for SECDEF orchestrator-touching SPECs)

The 3 new RPCs (`toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay`) are LEAF functions — they do not call other SECDEF functions. They only do:

- DML on tenant-scoped tables (RLS handles the rest).
- Optional JOIN for tenant ownership validation on `pricing_overlay.scope_variant_id`.

**Result:** **N/A — no inner SECDEF calls. Records: 0 mismatches.** This audit is satisfied trivially. The 3 RPCs are pure UPSERT/INSERT leafs.

For completeness — the JS callers invoke `effective_price` via `sb.rpc('effective_price', { p_offering_id, p_tenant_id, p_as_of_ts })`. Signature confirmed in Probe 3. JSON-RPC call shape is not a SECDEF-to-SECDEF call (no positional-arg mismatch class possible).

### Smoke-touched schema audit (per A2 — MANDATORY for SPECs that author a §14 smoke section)

| Symbol | Table | Columns confirmed | Demo rows | Smoke role |
|---|---|---|---|---|
| `BASE_TLS_COLS` | `tenant_lens_stock` | id, tenant_id, variant_id, location_id, sph, cyl, add_value, qty_on_hand, reorder_threshold, reorder_qty, notes, created_at, updated_at, is_deleted | 3 | Smoke #1 (inventory display) |
| `BASE_STOCK_LOT_COLS` | `stock_lot` | id, tenant_id, variant_id, location_id, origin_type, supplier_offering_id, purchase_order_id, purchase_receipt_id, original_lot_id, qty_received, qty_remaining, unit_cost, unit_cost_currency, fx_rate_snapshot, fx_rate_date, lot_number, received_at, expiry_at, notes, created_at, updated_at, is_deleted | 7 | Smoke #1 (lot drill-down) |
| `BASE_LV_COLS` | `lens_variant` | id, owner_tenant_id, design_id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, sph_step, cyl_min, cyl_max, cyl_step, add_min, add_max, add_step, is_published, lifecycle_status, version, superseded_by_id, canonical_root_id, created_at, updated_at, is_deleted | 1 | Smoke #1,#2,#3,#4,#5 (catalog) |
| `BASE_LD_COLS` | `lens_design` | id, owner_tenant_id, brand_id, name, lens_type, material, is_published, lifecycle_status, created_at, updated_at, is_deleted | 1 | Smoke #1,#2,#3 (catalog) |
| `BASE_LB_COLS` | `lens_brand` | id, owner_tenant_id, name, is_published, lifecycle_status, created_at, updated_at, is_deleted | 1 | Smoke #1,#2 (catalog) |
| `BASE_SCO_COLS` | `supplier_catalog_offering` | id, tenant_id, supplier_id, variant_id, supplier_brand_distribution_id, production_type, price_amount, currency_code, is_vat_inclusive, vat_rate_id, price_components, supplier_sku_code, status, effective_from, effective_until, notes, created_at, updated_at, is_deleted | 1 | Smoke #3,#4 (pricing) |
| `BASE_TAO_COLS` | `tenant_active_offerings` | id, tenant_id, offering_id, location_id, is_active, activated_by, activated_at, notes, created_at, updated_at, is_deleted | **0** | Smoke #2 — INSERT-then-UPDATE round-trip |
| `BASE_PO_COLS` | `pricing_overlay` | id, tenant_id, offering_id, scope_variant_id, scope_design_id, scope_supplier_id, overlay_type, discount_pct, fixed_amount, fixed_amount_currency, stacking_rule, application_order, status, effective_from, effective_until, proposed_by, approved_by, approved_at, notes, created_at, updated_at, is_deleted | **0** | Smoke #4,#5 — INSERT 1+3 overlay rows |
| `BASE_VAT_COLS` | `vat_rates` | id, owner_tenant_id, country_code, rate_pct, effective_from, effective_until, supersedes_id, notes, created_at | 1 (IL active) | Smoke #3 (VAT applied) |
| `BASE_PERMISSIONS_COLS` | `permissions` | id, module, action, name_he, description, tenant_id, created_at | 112 (across demo+prizma) | Smoke #8 (permission gate) |

**Result:** **all 10 smoke-touched tables: shape confirmed. Fixture status: 8/10 have rows; 2/10 (tenant_active_offerings, pricing_overlay) are empty and will be populated by the smoke itself (Smoke #2 + #4 + #5 use INSERT, not pre-existing rows).**

### Brief-vs-reality divergences (logged here so executor doesn't re-discover)

| # | Brief claim | Reality | SPEC adaptation |
|---|---|---|---|
| D1 | `tenant_active_offerings.status='active'/'inactive'` (TEXT) | column is `is_active BOOLEAN` (no `status` column) | `toggle_active_offering(p_tenant_id, p_offering_id, p_is_active BOOLEAN, p_location_id UUID NULL)` — UPSERT on `is_active`. |
| D2 | `effective_price(p_tenant_id, p_supplier_catalog_offering_id, p_variant_id NULL)` | actual: `effective_price(p_offering_id, p_tenant_id, p_as_of_ts)` (variant resolved internally via offering→variant_id) | JS callers use `sb.rpc('effective_price', { p_offering_id, p_tenant_id, p_as_of_ts: new Date().toISOString() })`. No `p_variant_id` passed. |
| D3 | "Each screen calls `is_user_authorized_for(p_screen_key TEXT)` (existing M2 infra)" | **function does not exist in DB.** Permission gating in this project is client-side `hasPermission(key)` + `data-permission` attribute + `applyUIPermissions` in `auth-service.js`. RLS enforces server-side. | Each screen calls `requirePermission('lens.<area>.<verb>')` on page-load in its main JS file; if `false`, sets `window.location.href = 'error.html?reason=permission'`. Server-side enforcement remains pure RLS + JWT-guard in the 3 RPCs (sufficient — `is_user_authorized_for` would have been redundant with RLS). |
| D4 | Smoke #1 "confirm 7+ brands display, drill into Hoya → Stellify, ..." | demo has 1 brand / 1 design / 1 variant (M1A seed). | Smoke #1 adapted: "confirm 1+ brand displays, drill into Hoya → Stellify (the seed), confirm SPH×CYL grid renders with the 3 seeded `tenant_lens_stock` rows on demo." Sibling SPEC `M1_LENS_PHASE_1B_PROCUREMENT` (or a dedicated fixture-seed SPEC) is the right home for richer demo seeds. M1A-DEBT-04 already covers this. |
| D5 | "Use existing DB wrapper. Every read through `DB.fetchAll` / `DB.fetchOne`" | wrapper is FREE FUNCTION `fetchAll(tableName, filters)` in `js/supabase-ops.js`. There is no `DB.` namespace. | SPEC criterion: every read through global `fetchAll()` or `sb.rpc()`. Zero direct `sb.from(...)` calls in the 3 new JS folders. Semantic match — Brief used colloquial name. |
| D6 | `T.STOCK_LOT` | constant is `T.STOCK_LOTS` (plural) | JS code uses `T.STOCK_LOTS`. |
| D7 | (no Brief mention) | `pricing_overlay.offering_id` column exists (nullable) — for variant-level overlays anchored to a specific commercial offering | SPEC notes this column may be populated when overlay scope is variant + we know the offering. Optional; not part of CHECK. |
| D8 | "Screen permission keys — do `lens.inventory.view`, `lens.designs.manage`, `lens.pricing.manage` already exist?" Brief Open Q2 | **do NOT exist** (no `lens.*` key in `permissions`). Per-tenant rows required. | This SPEC seeds 3 permission keys × 2 tenants (demo + prizma) = 6 rows via micro-migration in Commit 1. Iron Rule 19 (configurable values are tables) honored. |
| D9 | Brief §10 references `shared/components/tenant-header.js` | actual: `shared/js/modal-builder.js` + `modal-wizard.js` + `pin-modal.js`. No `tenant-header.js` file. `inventory.html` uses inline `<nav>` + `header.css`. | Each new HTML uses inline nav header + the same `shared/css/*.css` stack as `inventory.html`. No new component needed. |
| D10 | Brief §6 Probe 4 says `is_user_authorized_for` "existing M2 Platform Admin infra" | actually NO M2 Platform Admin server-side permission RPC — only `is_platform_super_admin()` and client-side `hasPermission()` | See D3 — pure client-side gate is canonical. |

### Runtime semantics rehearsal (per Step 5.3 — MANDATORY for DB-touching SPECs)

For each new SECURITY DEFINER RPC, rehearsed 3 caller scenarios (anon / wrong-tenant authenticated / service_role):

**RPC 1 — `toggle_active_offering(p_tenant_id UUID, p_offering_id UUID, p_is_active BOOLEAN, p_location_id UUID DEFAULT NULL)`**

| Caller | JWT shape | Expected | Why |
|---|---|---|---|
| anon | no `tenant_id` claim | RAISE 42501 | `v_jwt_tenant := nullif(...) IS NULL` → `IF v_jwt_tenant IS NULL OR ... <> p_tenant_id` fires |
| authenticated, tenant-B JWT, p_tenant_id=tenant-A | `tenant_id=tenant-B` | RAISE 42501 | `IS DISTINCT FROM` fires |
| service_role (EF) | role=`service_role` (no tenant_id) | bypass guard, UPSERT succeeds | `v_jwt_role IS DISTINCT FROM 'service_role'` → `IF` false → skip guard |
| authenticated, tenant-A JWT, p_tenant_id=tenant-A | `tenant_id=tenant-A` | UPSERT succeeds; returns row id | matching guard |

Block A header (3-role-aware, from `JWT_VALIDATION_HEADER.sql`) used verbatim. **No hand-rolled JWT check.**

**RPC 2 — `upsert_pricing_overlay(p_tenant_id UUID, p_overlay_data JSONB)`**

Same 3-role matrix as RPC 1, plus content-validation cases:

| Edge case | JSONB shape | Expected |
|---|---|---|
| missing scope | `{overlay_type:'negotiated', discount_pct:5}` (no scope_*) | RAISE: exactly-one-scope CHECK fails |
| two scopes | `{scope_variant_id:..., scope_design_id:..., discount_pct:5}` | RAISE: exactly-one-scope CHECK fails |
| invalid overlay_type | `{scope_variant_id:..., overlay_type:'foo', discount_pct:5}` | RAISE: `overlay_type_check` |
| no discount AND no fixed | `{scope_variant_id:..., overlay_type:'negotiated'}` (both NULL) | RAISE: `discount_or_fixed` check |

The RPC body relies on the table-level CHECK constraints firing (no need to re-validate in PL/pgSQL). The function constructs an `INSERT ... ON CONFLICT` row from JSONB fields and lets Postgres validate. **Exactly-one CHECK preserved by design.**

**RPC 3 — `bulk_apply_pricing_overlay(p_tenant_id UUID, p_overlay_template JSONB, p_target_variant_ids UUID[])`**

Same 3-role matrix, plus:

| Edge case | Input | Expected |
|---|---|---|
| empty target array | `p_target_variant_ids = ARRAY[]::UUID[]` | returns 0 (no rows inserted) |
| 100 variant IDs | array length 100 | returns 100, 100 pricing_overlay rows inserted |
| template missing scope hint | template embeds `scope_variant_id` literal which gets overridden per loop | Implementation: function ignores any `scope_*` in template; injects `scope_variant_id = unnest(p_target_variant_ids)` per row |
| template invalid type | template has `overlay_type:'foo'` | RAISE on first INSERT (CHECK fires); partial inserts atomic via single statement |

The function uses `INSERT ... SELECT FROM unnest(p_target_variant_ids)` for atomicity (single statement, single transaction). No loop, no partial-failure window. Tenant ownership of variants NOT validated (lens_variant is global catalog — D-M1-01).

### Lessons applied from prior FOREMAN_REVIEWs

**From `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md`:**
- Author Proposal #1 (Inner-call arity audit) — **APPLIED** above (N/A result, but audit performed and recorded).
- Author Proposal #2 (Smoke-touched schema audit) — **APPLIED** above (10/10 tables audited).
- Executor Proposal #1 (MIGRATION.md Applied Log) — **APPLIED** in §10 commit plan; MIGRATION.md will carry an Applied Log table.
- Executor Proposal #2 (Pre-flight fixture-existence check) — **APPLIED** in §0 Smoke-touched schema audit; surfaced D4 fixture gap proactively. Smoke scenarios adapted to actual fixture state, not Brief's hypothetical state.

**From `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md`:**
- Author Proposal #1 (promote §0 audits to MANDATORY in SPEC_TEMPLATE) — **APPLIED at skill level** by `M1_SKILL_IMPROVEMENT_HARVEST` (commit `ca823e3`). This SPEC inherits the frozen template.
- Author Proposal #2 (Concurrent-Pipeline orthogonality envelope) — **APPLIED at skill level** by `M1_SKILL_IMPROVEMENT_HARVEST`. Envelope declared above.
- Executor Proposal #1 (MIGRATION.md Applied Log canonical) — **APPLIED at skill level** by `M1_SKILL_IMPROVEMENT_HARVEST` (commit `ebec48c`). Executor SKILL.md Step 2 now mandates this when MCP-only.
- Executor Proposal #2 (`advisors-for-objects.mjs`) — **APPLIED at skill level** by `M1_SKILL_IMPROVEMENT_HARVEST` (commit `350c39d` + `0923c88`). Reviewer will use it post-DDL.

**From `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` Finding F-3:**
- Phase 1A "to-be-FK'd-later" columns precedent — N/A here (no new schema deltas; this SPEC only adds 3 RPCs).

**From `M1A_DEBT_SWEEP` Locked Decision #2:**
- Apply skill self-improvement proposals BEFORE SPEC authoring — **APPLIED**: M1_SKILL_IMPROVEMENT_HARVEST closed 🟢 with all 4 proposals baked. This SPEC inherits frozen state.

### Untracked-file survey (pre-execution Phase 1 baseline)

Survey at SPEC-author time: 80+ untracked files exist on disk — primarily Brief drafts (`*_BRIEF.md`, `*_ACTIVATION_PROMPT.md`) under `modules/Module 1 - Inventory Management/architecture-brief/` and `modules/Module 1.5 - Shared Components/architecture-brief/`, plus `__LAUNCH_PLAN_DRAFT__/`. **Decision D11:** the Executor will leave them alone and use selective `git add` by filename throughout. Codified after 4 consecutive Full-Auto Pipelines made the same D1 decision; baked into SPEC_TEMPLATE.md §0.

### Cross-Reference Check (Step 1.5 — Rule 21 enforcement at author time)

New names this SPEC introduces:

| Name | Type | Grep against | Result |
|---|---|---|---|
| `lens-inventory.html` | file at root | `docs/FILE_STRUCTURE.md`, `scripts/checks/root-allowlist.json`, `ls *.html` | 0 hits — genuinely new |
| `lens-active-designs.html` | file at root | same | 0 hits — genuinely new |
| `lens-pricing.html` | file at root | same | 0 hits — genuinely new |
| `modules/lens-inventory/` | folder | `ls modules/lens-*` | 0 hits — genuinely new (only `lens-catalog-admin/` exists) |
| `modules/lens-active-designs/` | folder | same | 0 hits — genuinely new |
| `modules/lens-pricing/` | folder | same | 0 hits — genuinely new |
| `toggle_active_offering` | RPC | `pg_proc.proname`, `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql` | 0 hits — genuinely new |
| `upsert_pricing_overlay` | RPC | same | 0 hits — genuinely new |
| `bulk_apply_pricing_overlay` | RPC | same | 0 hits — genuinely new |
| `lens.inventory.view` | permission key | `permissions.id` | 0 hits — genuinely new |
| `lens.designs.manage` | permission key | same | 0 hits — genuinely new |
| `lens.pricing.manage` | permission key | same | 0 hits — genuinely new |
| New T-constants | T-constant | `js/shared.js` | **0 needed** — every touched table already has a T-constant (`T.PRICING_OVERLAY`, `T.TENANT_ACTIVE_OFFERINGS`, `T.TENANT_LENS_STOCK`, etc.) |

**Cross-Reference Check completed 2026-05-15 against GLOBAL_SCHEMA + GLOBAL_MAP + repo state: 0 collisions / 12 hits resolved (every name is genuinely new). Iron Rule 21 honored at author time.**

---

## 1. Goal

Ship the foundation half of M1 Phase 1B — three read-heavy lens screens (Inventory display, Active Designs toggle, Catalog & Pricing) + three metadata RPCs — so optical staff can read lens inventory, optic managers can toggle which series the optic carries, and pricing managers can view + inline-edit + bulk-apply discount overlays. All under M1A_OPERATIONS_RPCS_FIX RPC discipline + Phase 1A G-1+G-6 JS conventions + mandatory functional smoke on demo before close.

---

## 2. Background & Motivation

Phase 1A delivered the schema (17 tables + 9 RPCs + Platform Catalog Admin screen). Phase 1B is being split into two halves to keep blast radius narrow: **foundation** (this SPEC — 3 read screens, light metadata writes) lands first; sibling **procurement** (`M1_LENS_PHASE_1B_PROCUREMENT`) lands after Daniel QA's foundation on demo. The split separates display from transaction so a faulty PO/GR workflow cannot regress already-shipping read screens.

This SPEC inherits the frozen skill state from `M1_SKILL_IMPROVEMENT_HARVEST` (closed 🟢 2026-05-15) — Inner-call arity audit + Smoke-touched schema audit are now MANDATORY in §0; MIGRATION.md Applied Log is canonical for MCP-only SPECs; `advisors-for-objects.mjs` is the post-DDL verifier; Concurrent-Pipeline orthogonality envelope is mandatory.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status --porcelain` → empty (only pre-existing untracked) |
| 2 | Commits produced | 9–11 single-concern commits | `git log origin/develop..HEAD --oneline \| wc -l` → 9..11 |
| 3 | 3 HTML files at root | `lens-inventory.html`, `lens-active-designs.html`, `lens-pricing.html` exist | `ls lens-inventory.html lens-active-designs.html lens-pricing.html` → exit 0 |
| 4 | 3 HTML files in root-allowlist | added to `scripts/checks/root-allowlist.json` `category_3_html_entrypoints` | `node -e "const a=require('./scripts/checks/root-allowlist.json'); console.log(['lens-inventory.html','lens-active-designs.html','lens-pricing.html'].every(f=>a.files.category_3_html_entrypoints.includes(f)))"` → `true` |
| 5 | 3 JS folders under `modules/lens-*` | `modules/lens-inventory/`, `modules/lens-active-designs/`, `modules/lens-pricing/` exist | `ls -d modules/lens-inventory modules/lens-active-designs modules/lens-pricing` → exit 0 |
| 6 | JS folders have 3–7 files each | per Brief §2 (4-7 for inventory, 3-5 for active-designs, 4-6 for pricing) | `for d in modules/lens-inventory modules/lens-active-designs modules/lens-pricing; do echo "$d:$(ls $d/*.js 2>/dev/null \| wc -l)"; done` → each in range |
| 7 | No file > 350 lines (Iron Rule 12) | every `.js` file in the 3 new folders ≤ 350 lines | `find modules/lens-inventory modules/lens-active-designs modules/lens-pricing -name "*.js" -exec wc -l {} +` → max ≤ 350 |
| 8 | 3 new RPCs deployed | `toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay` exist | `SELECT count(*) FROM pg_proc WHERE proname IN ('toggle_active_offering','upsert_pricing_overlay','bulk_apply_pricing_overlay')` → 3 |
| 9 | All 3 RPCs are SECURITY DEFINER + `search_path=public` | `prosecdef=true`, `proconfig` contains `search_path=public` | `SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN (...)` → all `t` + `{search_path=public}` |
| 10 | All 3 RPCs have REVOKE/GRANT discipline | `anon`+`PUBLIC` have NO EXECUTE; `authenticated`+`service_role` HAVE EXECUTE | `SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_name IN (...)` → no `anon`/`PUBLIC` row with EXECUTE |
| 11 | All 3 RPCs use Block A JWT validation header | function body contains `v_jwt_role` + `v_jwt_tenant` + `IS DISTINCT FROM` | `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname IN (...)` → 3 matches per RPC body for the Block A signature |
| 12 | `pricing_overlay` exactly-one-scope CHECK preserved | INSERT violating (2 scopes set) RAISEs `23514` | smoke Case `upsert_pricing_overlay` with 2 scopes → expect 23514 |
| 13 | Each new screen calls `requirePermission` at page-load | grep in each `lens-*-main.js` or equivalent entry file | `grep -l "requirePermission" modules/lens-inventory/*.js modules/lens-active-designs/*.js modules/lens-pricing/*.js` → 3 files matched (one per screen) |
| 14 | 3 new permission keys exist for demo tenant | rows in `permissions` with `tenant_id=demo` AND `id IN ('lens.inventory.view','lens.designs.manage','lens.pricing.manage')` | `SELECT id FROM permissions WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND id LIKE 'lens.%'` → 3 rows |
| 15 | 3 new permission keys exist for prizma tenant | same query with prizma tenant_id | 3 rows |
| 16 | All DB reads through `fetchAll`/`sb.rpc` (Iron Rule 7 — D5 adaptation) | zero `sb.from(` matches in the 3 new JS folders | `grep -rn "sb\\.from(" modules/lens-inventory modules/lens-active-designs modules/lens-pricing` → 0 hits |
| 17 | `escapeHtml` reused from `js/shared.js` (Phase 1A G-6) | zero local `function escapeHtml` reimplementations | `grep -rn "function escapeHtml\\\|const escapeHtml" modules/lens-inventory modules/lens-active-designs modules/lens-pricing` → 0 hits |
| 18 | No `window.prompt`/`window.confirm` (Phase 1A G-4) | use `Modal.*` | `grep -rn "window\\.prompt\\\|window\\.confirm\\\|\\bprompt(\\\|\\bconfirm(" modules/lens-inventory modules/lens-active-designs modules/lens-pricing` → 0 hits (allowing benign `// confirm` comments — check matched lines) |
| 19 | Functional smoke 9/9 PASS on demo | see §14 | TEST_REPORT.md table shows 9/9 PASS |
| 20 | Zero new console errors at page load on demo | each of 3 screens loads → 0 console errors | captured in TEST_REPORT.md (Smoke Case 9) |
| 21 | Iron Rules 1, 7, 8, 11, 12, 14, 15, 18, 22, 23, 31, 32 — no new violations | `npm run verify --full` exit 0 | `node scripts/verify.mjs --full; echo $?` → 0 |
| 22 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR in HEAD) | `npm run verify:integrity; echo $?` → 0 or 2 |
| 23 | No new HIGH/ERROR advisor lints on the 3 new RPCs | `scripts/audit/advisors-for-objects.mjs` exit 0 | `node scripts/audit/advisors-for-objects.mjs --advisors-json <tmp> toggle_active_offering upsert_pricing_overlay bulk_apply_pricing_overlay` → 0 |
| 24 | Iron Rule 32 §7 = `None.` honored | zero destructive ops across all commits | pre-commit gate passes all commits |
| 25 | No Prizma data written | all smoke INSERTs on demo only | `SELECT count(*) FROM tenant_active_offerings WHERE tenant_id='<prizma>'` unchanged before/after; same for pricing_overlay |
| 26 | `docs/GLOBAL_MAP.md` updated (additive) | new §5.1 row listing the 3 RPCs | `grep "M1_LENS_PHASE_1B_FOUNDATION" docs/GLOBAL_MAP.md` → 1 hit |
| 27 | `docs/FILE_STRUCTURE.md` updated (additive) | 3 new HTML + 3 new JS folders | `grep -c "lens-inventory\\\|lens-active-designs\\\|lens-pricing" docs/FILE_STRUCTURE.md` → ≥6 |
| 28 | `js/shared.js` — no new T-constants needed | T-constant count unchanged from baseline | `grep -c "^\\s*[A-Z_]*:\\s'" js/shared.js` unchanged ± 0 |
| 29 | Module `SESSION_CONTEXT.md` + `CHANGELOG.md` updated | both have a 2026-05-15 M1_LENS_PHASE_1B_FOUNDATION entry | grep |
| 30 | EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW + MIGRATION + ROLLBACK present in SPEC folder | 7 files in `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/` | `ls .../specs/M1_LENS_PHASE_1B_FOUNDATION/` → 7 .md files (SPEC + 6 lifecycle files) |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Level 1 (read-only SQL): unlimited probing of `pg_proc`, `information_schema`, `pg_policy`, `pg_indexes` to verify any §3 criterion or to extend Probes 1–9.
- Level 2 (writes to existing tables with SPEC authorization): UPSERT/INSERT to `tenant_active_offerings`, `pricing_overlay`, `permissions` (the 6 new rows). All writes are tenant-scoped via JWT-claim RLS.
- Level 3 (DDL — pre-authorized for the 3 new RPCs + their REVOKE/GRANT discipline): `CREATE OR REPLACE FUNCTION` for the 3 new RPCs. Applied via Supabase MCP `apply_migration`. Names declared verbatim in §3 — no name divergence.
- Create + edit + delete the 6 new files declared in §9 Expected Final State (3 HTML + 3 JS folders with 3–7 files each).
- Selective `git add` by filename per file. **NEVER `git add -A`.** Untracked Brief drafts left alone (D11).
- Run `npm run verify --staged` before EVERY commit (proactive — M1A_DEBT_SWEEP harvest).
- Apply the 4 inherited improvement proposals to new code (they're already baked into the skills; this just means following the canonical patterns).
- Adapt smoke fixtures to actual demo state (e.g., assert "1+ brand" instead of "7+" per D4) — already pre-authorized via D4.
- If an `INSERT ... ON CONFLICT` shape needs `(cols)` vs `(cols) WHERE partial-index-pred` to anchor to the partial UNIQUE index, choose whichever Postgres accepts at smoke time (M1B0 precedent — pre-authorized).
- Run any of the standard verify scripts: `verify.mjs`, `verify:integrity`, `audit/advisors-for-objects.mjs`.

### What REQUIRES stopping and reporting

- Any `lens.*` permission key collision with an existing row (probe says 0 collisions — but if a parallel SPEC seeds first, stop).
- Any `pg_proc.proname='toggle_active_offering'` (etc.) found pre-existing — Rule 21 collision.
- Any §3 criterion that returns a value outside its expected range.
- Any DDL applied that produces a HIGH/ERROR advisor lint surfaced by `advisors-for-objects.mjs`.
- Any commit hook (verify, integrity, destructive-ops) blocking and not resolvable by a single targeted fix.
- Any smoke step failing without an obvious 1-line fix — write escalation file `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md` + 1 Hebrew line to Daniel + halt Pipeline.
- Schema discovery during the run that contradicts §0 probes (e.g., a new column appears that changes the UPSERT shape).
- Any file approaching 350 lines (hard max — Iron Rule 12). Refactor to multiple files BEFORE crossing the threshold.
- Any need to write to Prizma tenant data — never autonomous.

### What is forbidden outright

- Touching `lens-catalog-admin.html` or `modules/lens-catalog-admin/` (Phase 1A artifacts, frozen).
- Touching the 17 Phase 1A tables' schema or the 9 Phase 1A RPCs' bodies.
- Touching the M1B0 schema (purchase_order, purchase_order_line, supplier_debt) or the 5 M1B0 RPCs.
- Touching the storefront repo (`opticalis/opticup-storefront`).
- Touching `CLAUDE.md`, `MASTER_ROADMAP.md`, `OPEN_TASKS.md`, `TECH_DEBT.md` (Foreman writes these post-close).
- Modifying the 7 sealed mockups.
- Wiring the inventory ➕➖ buttons to actual stock_movements (sibling SPEC scope).
- Creating a `goods-receipts` flow (sibling SPEC scope).
- Modifying `decisions/M1.md`, the Phase 1 Brief, or any architecture doc.
- Any destructive op outside Iron Rule 32 §7 (which is `None.`).
- Any merge to `main`.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. If `pg_proc` already has any of the 3 RPC names → STOP (Rule 21 collision).
2. If `permissions` table query returns a row with `id IN ('lens.inventory.view','lens.designs.manage','lens.pricing.manage')` for any tenant → STOP (Rule 21 collision; permission already seeded by another SPEC).
3. If `lens-inventory.html`, `lens-active-designs.html`, or `lens-pricing.html` already exists at root → STOP (Rule 21).
4. If any new file crosses 350 lines (Iron Rule 12 hard max) → STOP, refactor, retry.
5. If `npm run verify --staged` fails on any commit → diagnose root cause; do NOT use `--no-verify`.
6. If `verify:integrity` reports null-byte ERROR (exit 1) → STOP immediately, escalate.
7. If `advisors-for-objects.mjs` reports HIGH/ERROR on any of the 3 new RPCs → STOP, fix, retry.
8. If any smoke step (§14) fails → STOP, escalate (do NOT autoclose with a yellow verdict — M1A lesson: functional smoke catches what existential checks miss).
9. If `tenant_active_offerings_unique` index changes (partial-index predicate divergence) at runtime → STOP, re-probe.
10. If any commit accidentally stages a Brief draft / activation prompt / launch-plan-draft (untracked files per D11) → STOP, unstage, retry. **Selective `git add` by filename only.**
11. If Prizma tenant data changes in any smoke step → STOP immediately, escalate (data-isolation breach).

---

## 6. Rollback Plan

Per-screen + per-RPC DOWN steps. SPEC §7 = `None.` so no destructive op is authorized; this rollback fires ONLY if SPEC fails partway through and Daniel explicitly authorizes revert.

### Per-screen DOWN (vanilla file deletes — no DB state)

```bash
# git tag rollback-base-M1_LENS_PHASE_1B_FOUNDATION <HEAD before any change>
git reset --hard rollback-base-M1_LENS_PHASE_1B_FOUNDATION
# Daniel-only; never autonomous.
```

### Per-RPC DOWN (if DDL applied but rollback needed)

```sql
DROP FUNCTION IF EXISTS public.toggle_active_offering(uuid, uuid, boolean, uuid);
DROP FUNCTION IF EXISTS public.upsert_pricing_overlay(uuid, jsonb);
DROP FUNCTION IF EXISTS public.bulk_apply_pricing_overlay(uuid, jsonb, uuid[]);
```

Each DROP is reversible (CREATE OR REPLACE is idempotent on re-apply). The 6 permission rows (Block 1) can be removed via:

```sql
DELETE FROM permissions WHERE id IN ('lens.inventory.view','lens.designs.manage','lens.pricing.manage');
```

Tenant-scoped writes (UPSERTs to `tenant_active_offerings` + `pricing_overlay`) made during smoke are **kept** as M1A-DEBT-04 lineage fixtures (extending the M1A pattern — leave them for Phase 1B-procurement to reuse or re-seed).

---

## 7. Destructive Operations

**None.**

Per Iron Rule 32, declaring `None.` here forbids ALL destructive operations for this SPEC's run:
- No file deletes.
- No mass renames (≥5 files).
- No `git rebase`, `git reset --hard`, `git push --force`.
- No `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, `DELETE FROM` without tenant_id-scoped `WHERE`.
- No edits removing sections from CLAUDE.md, SKILL.md, or any governance file.
- No modification of `main` branch.

`CREATE OR REPLACE FUNCTION` is explicitly non-destructive (replaces body in-place; old body lost but function identity preserved). `CREATE OR REPLACE FUNCTION` for the 3 NEW RPCs is even more clearly non-destructive because there's no prior body to overwrite — `pg_proc` has 0 rows for these names per Probe 4. `INSERT ... ON CONFLICT (...) DO UPDATE` is non-destructive (semantic upsert; previous values move to UPDATE clause, not lost).

If the Executor encounters a need for a destructive op mid-run → **STOP, write escalation file, halt Pipeline.** Never silently amend this section.

---

## 8. Out of Scope (explicit)

The following are deliberately NOT in this SPEC's run:

- The 3 procurement screens (PO form + POs List + Goods Receipt) — sibling SPEC `M1_LENS_PHASE_1B_PROCUREMENT`.
- Stock movement creation via ➕➖ buttons (Brief D-M1-03 — display-only in foundation; wired in procurement).
- PO creation workflow + Goods Receipt workflow — sibling SPEC.
- FX conversion in `effective_price` (tenant-2 onboarding concern; Israel-only Day-1).
- Promotional discount engine (time-windowed overlays beyond `effective_from`/`effective_until` already on `pricing_overlay`).
- Modifying `lens_brand` / `lens_design` / `lens_variant` (Platform Catalog Admin owns those — Phase 1A `lens-catalog-admin.html`).
- Bulk catalog import (Phase 1A scope).
- Custom-per-customer line linkage (M7 Orders not yet built).
- 21 FK indexes (`M1A_FK_INDEXES_PREP_FOR_1B` — separate parallel SPEC).
- 3 MAX-based sequence generator refactors (accept Phase 1A consistency).
- Modifying the 7 sealed mockups.
- Modifying `decisions/M1.md`, the Phase 1 Brief, or any architecture doc.
- `CLAUDE.md`, `MASTER_ROADMAP.md`, `OPEN_TASKS.md`, `TECH_DEBT.md` updates (Foreman writes these post-close).
- Modifications to `js/shared.js` beyond the **no-change zero-row baseline** (no new T-constants needed per §0 Cross-Reference Check).
- `is_user_authorized_for` server function creation (D3 — not needed; client-side `hasPermission` + RLS sufficient).
- Demo lens-catalog fixture richer seed (M1A-DEBT-04 — left for sibling procurement SPEC or dedicated seed SPEC).
- Storefront repo changes.
- Merge to `main` (Daniel-only after Pipeline closes 🟢).

---

## 9. Expected Final State

After the executor finishes, the repo + DB should contain:

### New files

- `lens-inventory.html` at repo root (the main inventory display).
- `lens-active-designs.html` at repo root (the toggle-on/off design selection).
- `lens-pricing.html` at repo root (the 3-column pricing display + inline edit + bulk).
- `modules/lens-inventory/` with 4–7 JS files (entry + filters + grid renderer + lot drill-down + display-only modals).
- `modules/lens-active-designs/` with 3–5 JS files (entry + brand-design-variant cascade + toggle handler).
- `modules/lens-pricing/` with 4–6 JS files (entry + filters + 3-col grid + inline edit modal + bulk operation modal).
- SPEC folder lifecycle files: `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md`, `MIGRATION.md`, `ROLLBACK.md`, `REVIEW.md`, `FOREMAN_REVIEW.md`.

### Modified files (additive only)

- `scripts/checks/root-allowlist.json` — 3 new entries appended to `files.category_3_html_entrypoints`.
- `docs/GLOBAL_MAP.md` — additive row under §5.1 for the 3 new RPCs + 3 new screens.
- `docs/FILE_STRUCTURE.md` — additive rows for the 3 new HTML + 3 new JS dirs.
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — new 2026-05-15 section prepended.
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — new 2026-05-15 phase entry.
- `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` — additive entries for the 3 new screen JS folders + 3 new RPCs.

### Deleted files

**None.**

### DB state

- 3 new SECURITY DEFINER RPCs in `public` schema (`toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay`).
- Each RPC has Block A JWT validation header + `SET search_path TO 'public'` + REVOKE from anon+PUBLIC + GRANT to authenticated+service_role.
- 6 new rows in `permissions` (3 keys × 2 tenants demo+prizma).
- Smoke-time fixtures persist on demo: at least 1 `tenant_active_offerings` row (activated by Smoke #2) + at least 4 `pricing_overlay` rows (1 by Smoke #4 + 3 by Smoke #5). These extend M1A-DEBT-04 lineage; sibling SPECs reuse.
- 0 rows added/modified on prizma.

### Docs updated (MUST include)

- `docs/GLOBAL_MAP.md` additive row.
- `docs/FILE_STRUCTURE.md` additive rows.
- Module `SESSION_CONTEXT.md` + `CHANGELOG.md` + `MODULE_MAP.md` updates.
- SPEC folder fully populated (7 .md files).
- `MASTER_ROADMAP.md`, `TECH_DEBT.md` — Foreman updates these in the FOREMAN_REVIEW commit, NOT during executor scope.

---

## 10. Commit Plan

| # | Commit message | Concern | Files |
|---|---|---|---|
| 1 | `chore(spec): open M1_LENS_PHASE_1B_FOUNDATION — SPEC + MIGRATION skeleton + ROLLBACK` | Open SPEC folder | SPEC.md (this), MIGRATION.md skeleton (with empty Applied Log table), ROLLBACK.md |
| 2 | `feat(m1): seed lens permission keys (3 keys × 2 tenants) — Block 1` | Permission seeding | DDL applied via MCP `apply_migration`; MIGRATION.md Applied Log row appended |
| 3 | `feat(m1): create toggle_active_offering RPC — Block 2` | RPC #1 | MCP migration; MIGRATION.md row |
| 4 | `feat(m1): create upsert_pricing_overlay RPC — Block 3` | RPC #2 | MCP migration; MIGRATION.md row |
| 5 | `feat(m1): create bulk_apply_pricing_overlay RPC — Block 4` | RPC #3 | MCP migration; MIGRATION.md row |
| 6 | `feat(lens-inventory): screen + JS folder + root-allowlist entry` | Screen #1 | `lens-inventory.html` + `modules/lens-inventory/*.js` + `root-allowlist.json` |
| 7 | `feat(lens-active-designs): screen + JS folder + root-allowlist entry` | Screen #2 | `lens-active-designs.html` + `modules/lens-active-designs/*.js` + `root-allowlist.json` |
| 8 | `feat(lens-pricing): screen + JS folder + root-allowlist entry` | Screen #3 | `lens-pricing.html` + `modules/lens-pricing/*.js` + `root-allowlist.json` |
| 9 | `test(m1): functional smoke 9/9 on demo — TEST_REPORT` | Smoke artifacts + TEST_REPORT.md | TEST_REPORT.md |
| 10 | `chore(spec): close M1_LENS_PHASE_1B_FOUNDATION — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + FILE_STRUCTURE + SESSION_CONTEXT + CHANGELOG + MODULE_MAP` | Closure | EXECUTION_REPORT.md, FINDINGS.md, docs/GLOBAL_MAP.md, docs/FILE_STRUCTURE.md, SESSION_CONTEXT.md, CHANGELOG.md, MODULE_MAP.md |
| 11 (Reviewer) | `chore(review): REVIEW.md for M1_LENS_PHASE_1B_FOUNDATION` | REVIEW.md | REVIEW.md |
| 12 (Foreman) | `chore(spec): FOREMAN_REVIEW + master-doc updates for M1_LENS_PHASE_1B_FOUNDATION` | FOREMAN_REVIEW.md + MASTER_ROADMAP + TECH_DEBT | FOREMAN_REVIEW.md, MASTER_ROADMAP.md, TECH_DEBT.md |

**Total executor scope: 9–11 commits (10 nominal). Reviewer + Foreman add 1 + 1.**

Each commit MUST pass `npm run verify --staged` (proactive — M1A_DEBT_SWEEP harvest). Integrity gate must pass each commit (no null-byte ERROR).

---

## 11. Dependencies / Preconditions

- M1A_OPERATIONS_RPCS_FIX closed 🟢 (2026-05-15) — orchestrator RPCs runnable.
- M1B0_PURCHASE_ORDER_SCHEMA closed 🟢 (2026-05-15) — supplier_catalog_offering price chain validated end-to-end.
- M1A_CURRENCIES_GLOBAL_HOTFIX closed (2026-05-14) — `currencies` table global; tenant-2 onboarding unblocked.
- M1_SKILL_IMPROVEMENT_HARVEST closed 🟢 (2026-05-15) — frozen skill state with A1+A2+E1+E2 applied.
- Demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb` has the 8 fixture types from §0 Probe 1.
- Repo `opticalis/opticup`, branch `develop`, clean working tree at SPEC dispatch time.
- Supabase MCP server connected (project `tsxrrxzmdxaenlvocyit`).

---

## 12. Lessons Already Incorporated

| FROM | Lesson | APPLIED HERE |
|---|---|---|
| `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Author #1 | Inner-call arity audit MANDATORY in §0 | ✅ §0 — N/A result (no SECDEF inner calls), audit performed |
| `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Author #2 | Smoke-touched schema audit MANDATORY in §0 | ✅ §0 — 10 tables audited |
| `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Executor #1 | MIGRATION.md Applied Log canonical | ✅ §10 Commit 1 creates MIGRATION.md skeleton with Applied Log; Commits 2–5 append rows |
| `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Executor #2 | Pre-flight fixture-existence check | ✅ §0 Smoke-touched schema audit surfaced D4 (2 empty tables OK because smoke INSERTs them) |
| `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` Author #1 | Promote §0 audits to MANDATORY-with-template | ✅ inherited from frozen skill state (`SPEC_TEMPLATE.md` §0 now lists both audits) |
| `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` Author #2 | Concurrent-Pipeline orthogonality envelope | ✅ §0 — explicit envelope declared |
| `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` Executor #1 | MIGRATION.md Applied Log baked into SKILL.md | ✅ inherited (`opticup-executor/SKILL.md` Step 2 updated) |
| `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` Executor #2 | `advisors-for-objects.mjs` script | ✅ §3 criterion 23 uses it; Reviewer will run against the 3 new RPCs |
| `M1A_OPERATIONS_RPCS_FIX/MIGRATION.md` | REVOKE/GRANT discipline on every SECDEF | ✅ §3 criterion 10 requires REVOKE+GRANT pattern on all 3 RPCs |
| `M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` | Iron Rule 21 divergence on name collisions (e.g., `next_purchase_order_number` vs legacy `next_po_number`) | ✅ §0 Cross-Reference Check — 0 collisions found |
| Phase 1A code-review G-1 | DB reads through wrapper (no `sb.from(`) | ✅ §3 criterion 16 enforces |
| Phase 1A code-review G-4 | `Modal.*` not `window.prompt/confirm` | ✅ §3 criterion 18 enforces |
| Phase 1A code-review G-6 | Reuse `escapeHtml` from shared.js | ✅ §3 criterion 17 enforces |
| `JWT_VALIDATION_HEADER.sql` reference | Use Block A 3-role-aware header, no hand-rolled | ✅ §3 criterion 11 enforces; §0 Runtime semantics rehearsal documents Block A for all 3 RPCs |
| `M1A_DEBT_SWEEP` Decision #2 | Skill self-improvements applied BEFORE SPEC authoring | ✅ M1_SKILL_IMPROVEMENT_HARVEST closed first (ca823e3) |
| `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author #1 | Color-form completeness | N/A (no visual re-skin) |
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-1 | Use canonical `JWT_VALIDATION_HEADER.sql`, no hand-rolled | ✅ §0 Runtime semantics rehearsal cites Block A verbatim |
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-2 | Runtime semantics rehearsal MANDATORY | ✅ §0 includes the rehearsal for all 3 RPCs |

---

## 13. Pre-Merge Checklist

Every item passes before Executor signals close.

- [ ] All §3 success criteria measured + captured in EXECUTION_REPORT.md §2.
- [ ] Integrity Gate (Iron Rule 31): `npm run verify:integrity` exit 0 or 2 across HEAD. No null-byte ERROR.
- [ ] `git status --short` returns empty (clean tree; untracked Brief drafts allowed per D11).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + MIGRATION.md (with Applied Log) + ROLLBACK.md written in SPEC folder.
- [ ] Smoke 9/9 PASS captured in TEST_REPORT.md. NO 🟢 verdict without 9/9.
- [ ] `node scripts/audit/advisors-for-objects.mjs --advisors-json <dump> toggle_active_offering upsert_pricing_overlay bulk_apply_pricing_overlay` exits 0.
- [ ] Module ROADMAP / SESSION_CONTEXT / CHANGELOG / MODULE_MAP updated.
- [ ] `docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md` updated additively.
- [ ] Zero Prizma data touched (verified by before/after counts on Prizma tenant).
- [ ] Iron Rule 32 §7 = `None.` honored across all 10 commits.

---

## 14. Functional Smoke Plan

Mandatory before close. 9 scenarios on demo (`tenant_id=8d8cfa7e-ef58-49af-9702-a862d459cccb`). All must PASS to assign 🟢 verdict (M1A discipline — no green without smoke; one failed step → STOP + escalate).

### Smoke fixture pre-conditions

- Demo has: 1 lens_brand (Hoya), 1 lens_design (Stellify), 1 lens_variant (LV-TST001), 1 supplier_catalog_offering, 3 tenant_lens_stock rows, 7 stock_lot rows, 2 purchase_order rows, 1 IL active vat_rate.
- demo + prizma each have 3 new lens.* permission rows (seeded Block 1).

### Cases

| # | Scenario | Inputs | Expected | Verify |
|---|---|---|---|---|
| 1 | **Inventory display (D4-adapted)** | Open `lens-inventory.html` after PIN auth on demo | Page renders; the 1 Hoya brand appears in filters; clicking Stellify shows the SPH×CYL grid populated with the 3 seeded tenant_lens_stock combos; Stock filter shows 3 rows, Custom filter shows 0. | DOM inspection + `SELECT count(*) FROM tenant_lens_stock WHERE tenant_id='8d8cfa7e-...' AND is_deleted=false` → 3 |
| 2 | **Active Designs toggle** | Open `lens-active-designs.html`; click Activate on the 1 supplier_catalog_offering (currently 0 tenant_active_offerings rows) | After click: `tenant_active_offerings` row inserted via `toggle_active_offering(...)` with `is_active=true`. Refresh page; toggle back to inactive. | `SELECT count(*), max(is_active::int) FROM tenant_active_offerings WHERE tenant_id='8d8cfa7e-...' AND offering_id='<seed>' AND is_deleted=false` → first call: 1,1; second call: 1,0 (UPDATE not double-INSERT) |
| 3 | **Pricing 3-column display** | Open `lens-pricing.html`; observe the 1 offering | 3 columns render: catalog price, discount % (initially 0%, no overlay row), final price (= catalog × 1 + VAT 18% if `is_vat_inclusive=false`). `effective_price` returns expected ILS value. | DOM inspection + `SELECT effective_price('<offering_id>', '8d8cfa7e-...', now())` matches displayed final |
| 4 | **Pricing inline edit** | Click discount cell, set 10%, save | `pricing_overlay` row inserted via `upsert_pricing_overlay({scope_variant_id, overlay_type:'negotiated', discount_pct:10, status:'active'})`. Page refresh shows final price = catalog × 0.9 × 1.18 (VAT applied). | `SELECT count(*) FROM pricing_overlay WHERE tenant_id='8d8cfa7e-...' AND scope_variant_id='<variant>' AND discount_pct=10 AND status='active'` → 1 |
| 5 | **Pricing bulk operation** | Select 1 supplier (only 1 variant exists on demo — but bulk RPC accepts N variants), apply 5% supplier-wide overlay via `bulk_apply_pricing_overlay({overlay_type:'negotiated', discount_pct:5, status:'active', stacking_rule:'additive'}, ARRAY['<variant_id>'])` | Function returns 1 (count of inserted rows). 1 new pricing_overlay row inserted with `scope_variant_id`. (Note: demo has 1 variant; in production this would be many.) | RPC return value = 1; `SELECT count(*) FROM pricing_overlay WHERE tenant_id='8d8cfa7e-...' AND discount_pct=5 AND created_at > '<smoke start>'` → 1 |
| 6 | **Anon reject — all 3 RPCs** | Anon-JWT call to each of 3 RPCs | RAISE 42501 | for each RPC: `SELECT * FROM <rpc>(...)` with no JWT → ERRCODE 42501 |
| 7 | **Cross-tenant reject** | Tenant-A (demo) JWT calling RPC with `p_tenant_id = prizma-uuid` | RAISE 42501 (IS DISTINCT FROM fires) | for each of 3 RPCs: 42501 |
| 8 | **Permission gate** | Demo PIN'd user without `lens.pricing.manage` permission opens `lens-pricing.html` | `requirePermission('lens.pricing.manage')` throws → redirect to `error.html?reason=permission` (or equivalent); user does NOT see the pricing grid. | Open with restricted role → DOM does not show grid + URL ends `error.html` (or modal blocks). |
| 9 | **Zero console errors at load** | Open each of 3 screens fresh; observe Chrome devtools console | 0 console errors on each page. (Warnings tolerated.) | DevTools console capture |

### Functional-smoke pass-bar

**9/9 PASS required for 🟢 verdict.** Any single FAIL → STOP, escalate, no autoclose. M1A_OPERATIONS_RPCS_FIX precedent: smoke caught 2 critical orchestrator defects in mid-pipeline that no existential check found. M1B0 precedent: clean SPEC + careful §0 prevented mid-pipeline pivots and produced 6/6 PASS first time. This SPEC aims for the M1B0 standard.

---

*End of SPEC.md. opticup-strategic Foreman, frozen-skill state from `M1_SKILL_IMPROVEMENT_HARVEST` (ca823e3), 2026-05-15.*
