# SPEC — M1 Final Night Phase 1: Private Catalog on Unified Schema

**Slug:** `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED`
**Phase of:** M1 Final Completion Night Pipeline (Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_FINAL_COMPLETION_NIGHT_BRIEF.md`)
**Author (Foreman, Cowork):** opticup-architect (2026-05-17 night — amended scope after live DB probe)
**Executor:** opticup-executor (this session)
**Date:** 2026-05-17 night
**Estimated:** 2-3h
**Predecessor:** `M1_CONTACT_LENSES_ACCESSORIES` 🟢 CLOSED 2026-05-17 morning (added `lens_design.product_type` discriminator + activated 4 inventory categories)

---

## 0. Pre-Flight Findings (already executed before SPEC seal)

### 0.A — Brief vs DB Reality Audit

The original Brief §3.2 assumed a 3×3 catalog table grid (brand × design × variant per product type, 9 tables). Live DB probe revealed:

- ✅ Lens hierarchy exists in full: `lens_brand` (16 global) → `lens_design` (46 global) → `lens_variant` (31 global), all with `owner_tenant_id UUID NULLABLE`.
- ❌ `contact_lens_brand`, `contact_lens_design`, `accessory_brand`, `accessory_design` **do not exist** as tables.
- ✅ `lens_design` has CHECK-constrained `product_type` column with values `'glasses' | 'contact_lens' | 'accessory'`. 46 designs partition cleanly (11+10+25). Each variant table FK-points only to designs of its matching product_type.
- ✅ Brands are de-facto specialized per product type (Acuvue / Alcon / Bausch+Lomb / Ciba / CooperVision → contact_lens only; Crizal / Persol / Rayban / Warby / Zeiss-Accessories → accessory only; Essilor / Hoya / Nikon / Rodenstock / Zeiss → glasses only).

**Architect amendment (2026-05-17 night):** the current schema is **intentionally** a unified-design tree with discriminator (added by predecessor SPEC `M1_CONTACT_LENSES_ACCESSORIES` commit `a90eb98`). Splitting into 3 trees would duplicate the discriminator pattern → Iron Rule 21 violation. Stay unified + filter by `product_type` in the UI.

### 0.B — Other Pre-Flight Probes

- **P-Q2 RLS:** All 3 lens catalog tables have the canonical 3-policy pattern: `owner_view` (cmd:ALL, USING owner_tenant_id=jwt.tenant_id, no WITH_CHECK), `public_view` (cmd:SELECT, USING is_published+active+!deleted), `service_bypass` (service_role ALL true). `contact_lens_variant` + `accessory_variant` have the same pattern except `public_view` is cmd:ALL (existing minor inconsistency, NOT in Phase 1 scope — `M1_CL_ACCESSORY_POLISH` may address).
- **P-Q4 concurrency:** 11 stale `claude.exe` processes detected, all >12h old, no active concurrent executor. Pipeline-safe.
- **P-Q5 localhost:** ERP :3000 = 200, Storefront :4321 = 200. ✅
- **P-Q6 Prizma baseline:** All 12 sampled inventory tables = 0 rows for Prizma tenant (M1 not deployed to Prizma yet). Delta-tracking baseline trivially preserved.
- **Permission infrastructure:** Tables are plural (`permissions`, `roles`, `role_permissions`, `employee_roles`). Permission `id` is `<module>.<action>` text (e.g., `lens.po.create`). Permission row is per-tenant (each key seeded × 2 tenants today: Prizma + demo).
- **Existing catalog admin:** `modules/lens-catalog-admin/` is a **platform-admin only** UI gated on `is_platform_super_admin`. Used by Optic Up staff to manage the GLOBAL catalog. Distinct from what Phase 1 is building (store-CEO UI for private catalog).

---

## 1. Goal

Enable a store CEO / Branch Manager to manage their tenant's **private** lens / contact-lens / accessory catalog inside the inventory module, alongside read-only view of the **global** catalog. Implement uniformly across 3 categories via `product_type` filter on the existing unified hierarchy. Honor `owner_tenant_id` IS NULL = global, otherwise = tenant-private.

After Phase 1:
1. A store CEO on demo sees 2 sub-tabs ("מותגים גלובליים" + "הקטלוג שלי") inside each of the 3 inventory category sections that need it (lens / contact-lens / accessory).
2. The CEO can browse the global catalog (read-only) and create/edit/delete private catalog rows (full CRUD).
3. The "Clone to Private" feature on global rows produces a tenant-owned copy with `cloned_from_id` traceability.
4. RLS isolates private rows per tenant — Prizma can never see demo's private catalog and vice versa.
5. Active Designs sub-tab shows both global+private items, with a `פרטי` badge on private ones.

---

## 2. Scope

### 2.A — IN SCOPE

- 3 ALTER TABLE × ADD COLUMN `cloned_from_id UUID NULLABLE` self-FK (lens_brand / lens_design / lens_variant)
- 3 partial FK indexes for the new `cloned_from_id` columns
- 6 new permission keys (3 `.catalog.private.manage` + 3 `.catalog.global.view`) × 2 tenants = 12 permission rows
- Role-permission grants: ceo + manager get `.private.manage` + `.global.view`; team_lead + viewer + worker get `.global.view` only (matches predecessor SPEC pattern, role `branch_manager` does not exist — `manager` is the canonical role name in the live schema)
- 1 new shared component: `shared/js/catalog-private-admin.js` — renders the 2-sub-tab Brand→Design→Variant UI driven by `product_type` filter (Iron Rule 21 — single component reused across 3 categories)
- 3 new shell wirings: a "Catalog Admin" sub-tab inside each of the 3 inventory category sections (lens / contact-lens / accessory)
- "Clone to Private" button + RPC `clone_catalog_entry_to_private(product_type, entry_type, source_id)` (returns the new private row's id; transactional)
- "פרטי" badge on Active Designs rows where `owner_tenant_id IS NOT NULL`

### 2.B — OUT OF SCOPE (deferred to other Phases or follow-up SPECs)

- RLS structural changes (current pattern already enforces tenant isolation; Brief §3.6 "preserve read pattern, only tighten writes" applies; defense-in-depth is already adequate via UI permission gates)
- Platform-admin (Optic Up staff) catalog tooling — `modules/lens-catalog-admin/` stays untouched
- Contact-lens + accessory `public_view` policy `cmd:ALL` inconsistency (pre-existing, slated for `M1_CL_ACCESSORY_POLISH`)
- New tables for contact_lens_brand / contact_lens_design / accessory_brand / accessory_design (decision: NOT needed; unified schema)
- Modifying `record_stock_movement` or any core RPC

---

## 3. Schema Changes (Additive Only)

### 3.A — Migration `m1_phase1_cloned_from_id_columns`

```sql
ALTER TABLE lens_brand
  ADD COLUMN cloned_from_id UUID NULL REFERENCES lens_brand(id) ON DELETE SET NULL;
ALTER TABLE lens_design
  ADD COLUMN cloned_from_id UUID NULL REFERENCES lens_design(id) ON DELETE SET NULL;
ALTER TABLE lens_variant
  ADD COLUMN cloned_from_id UUID NULL REFERENCES lens_variant(id) ON DELETE SET NULL;

CREATE INDEX idx_lens_brand_cloned_from ON lens_brand(cloned_from_id) WHERE cloned_from_id IS NOT NULL;
CREATE INDEX idx_lens_design_cloned_from ON lens_design(cloned_from_id) WHERE cloned_from_id IS NOT NULL;
CREATE INDEX idx_lens_variant_cloned_from ON lens_variant(cloned_from_id) WHERE cloned_from_id IS NOT NULL;
```

Rationale: Brief §3.5. Self-FK with ON DELETE SET NULL preserves the clone if the source is removed but loses the lineage gracefully. Partial index avoids bloat (most rows are NULL).

### 3.B — Migration `m1_phase1_clone_to_private_rpc`

```sql
CREATE OR REPLACE FUNCTION clone_catalog_entry_to_private(
  p_entry_type text,    -- 'brand' | 'design' | 'variant'
  p_source_id uuid,
  p_target_tenant_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_id uuid;
  v_jwt_tenant uuid;
BEGIN
  -- Defense-in-depth: caller's JWT tenant must match p_target_tenant_id.
  v_jwt_tenant := nullif(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')::uuid;
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_target_tenant_id THEN
    RAISE EXCEPTION 'tenant_id mismatch — clone only into your own tenant';
  END IF;

  IF p_entry_type = 'brand' THEN
    INSERT INTO lens_brand (id, owner_tenant_id, name, is_published, lifecycle_status, cloned_from_id)
    SELECT gen_random_uuid(), p_target_tenant_id, name, false, 'draft', id
    FROM lens_brand WHERE id = p_source_id AND owner_tenant_id IS NULL
    RETURNING id INTO v_new_id;
  ELSIF p_entry_type = 'design' THEN
    INSERT INTO lens_design (id, owner_tenant_id, brand_id, name, lens_type, material, is_published, lifecycle_status, product_type, cloned_from_id)
    SELECT gen_random_uuid(), p_target_tenant_id, brand_id, name, lens_type, material, false, 'draft', product_type, id
    FROM lens_design WHERE id = p_source_id AND owner_tenant_id IS NULL
    RETURNING id INTO v_new_id;
  ELSIF p_entry_type = 'variant' THEN
    INSERT INTO lens_variant (id, owner_tenant_id, design_id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, sph_step, cyl_min, cyl_max, cyl_step, add_min, add_max, add_step, is_published, lifecycle_status, version, cloned_from_id)
    SELECT gen_random_uuid(), p_target_tenant_id, design_id, 'PRV-' || substring(gen_random_uuid()::text, 1, 8), refractive_index, diameter_mm, coating, tint, sph_min, sph_max, sph_step, cyl_min, cyl_max, cyl_step, add_min, add_max, add_step, false, 'draft', 1, id
    FROM lens_variant WHERE id = p_source_id AND owner_tenant_id IS NULL
    RETURNING id INTO v_new_id;
  ELSE
    RAISE EXCEPTION 'unknown entry_type: %', p_entry_type;
  END IF;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'source not found or not global';
  END IF;

  RETURN v_new_id;
END $$;

GRANT EXECUTE ON FUNCTION clone_catalog_entry_to_private(text, uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION clone_catalog_entry_to_private(text, uuid, uuid) FROM anon;
```

Rationale: atomic, SECURITY DEFINER (uses elevated privileges to bypass RLS for the read of source row), but defense-in-depth via JWT tenant check. Only authenticated role can call; anon revoked. Cloned row is created as `is_published=false, lifecycle_status='draft'` so the tenant must explicitly publish — preserves the "view-only-published" pattern for global side.

### 3.C — Migration `m1_phase1_permission_keys_seed`

```sql
-- Seed 6 new keys × 2 tenants = 12 permission rows
INSERT INTO permissions (id, module, action, name_he, description, tenant_id) VALUES
  ('lens.catalog.private.manage','lens','catalog.private.manage','ניהול קטלוג עדשות פרטי','CEO/Branch Manager — full CRUD on tenant private lens catalog (brands/designs/variants).','6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('lens.catalog.private.manage','lens','catalog.private.manage','ניהול קטלוג עדשות פרטי','CEO/Branch Manager — full CRUD on tenant private lens catalog (brands/designs/variants).','8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.catalog.global.view','lens','catalog.global.view','צפייה בקטלוג עדשות גלובלי','Read the published global lens catalog (default-on for all roles).','6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('lens.catalog.global.view','lens','catalog.global.view','צפייה בקטלוג עדשות גלובלי','Read the published global lens catalog (default-on for all roles).','8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('contact_lens.catalog.private.manage','contact_lens','catalog.private.manage','ניהול קטלוג עדשות מגע פרטי','CEO/Branch Manager — full CRUD on tenant private contact-lens catalog.','6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('contact_lens.catalog.private.manage','contact_lens','catalog.private.manage','ניהול קטלוג עדשות מגע פרטי','CEO/Branch Manager — full CRUD on tenant private contact-lens catalog.','8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('contact_lens.catalog.global.view','contact_lens','catalog.global.view','צפייה בקטלוג עדשות מגע גלובלי','Read the published global contact-lens catalog.','6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('contact_lens.catalog.global.view','contact_lens','catalog.global.view','צפייה בקטלוג עדשות מגע גלובלי','Read the published global contact-lens catalog.','8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('accessory.catalog.private.manage','accessory','catalog.private.manage','ניהול קטלוג אביזרים פרטי','CEO/Branch Manager — full CRUD on tenant private accessory catalog.','6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('accessory.catalog.private.manage','accessory','catalog.private.manage','ניהול קטלוג אביזרים פרטי','CEO/Branch Manager — full CRUD on tenant private accessory catalog.','8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('accessory.catalog.global.view','accessory','catalog.global.view','צפייה בקטלוג אביזרים גלובלי','Read the published global accessory catalog.','6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('accessory.catalog.global.view','accessory','catalog.global.view','צפייה בקטלוג אביזרים גלובלי','Read the published global accessory catalog.','8d8cfa7e-ef58-49af-9702-a862d459cccb')
ON CONFLICT (id, tenant_id) DO NOTHING;

-- Grant role_permissions:
--   ceo + manager: all 6 keys (manage + view)
--   team_lead + viewer + worker: only the 3 .global.view keys
-- (per-tenant grants, mirrors predecessor SPEC pattern)
INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
SELECT r.id, p.id, true, t.id
FROM (VALUES ('ceo'),('manager')) roles(role_id)
CROSS JOIN (VALUES
  ('lens.catalog.private.manage'),('lens.catalog.global.view'),
  ('contact_lens.catalog.private.manage'),('contact_lens.catalog.global.view'),
  ('accessory.catalog.private.manage'),('accessory.catalog.global.view')
) perms(perm_id)
CROSS JOIN tenants t
JOIN roles r ON r.id = roles.role_id AND r.tenant_id = t.id
JOIN permissions p ON p.id = perms.perm_id AND p.tenant_id = t.id
WHERE t.id IN ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','8d8cfa7e-ef58-49af-9702-a862d459cccb')
ON CONFLICT (role_id, permission_id, tenant_id) DO UPDATE SET granted = true;

INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
SELECT r.id, p.id, true, t.id
FROM (VALUES ('team_lead'),('viewer'),('worker')) roles(role_id)
CROSS JOIN (VALUES
  ('lens.catalog.global.view'),
  ('contact_lens.catalog.global.view'),
  ('accessory.catalog.global.view')
) perms(perm_id)
CROSS JOIN tenants t
JOIN roles r ON r.id = roles.role_id AND r.tenant_id = t.id
JOIN permissions p ON p.id = perms.perm_id AND p.tenant_id = t.id
WHERE t.id IN ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','8d8cfa7e-ef58-49af-9702-a862d459cccb')
ON CONFLICT (role_id, permission_id, tenant_id) DO UPDATE SET granted = true;
```

---

## 4. Destructive Operations

Iron Rule 32 — REQUIRED DECLARATION. This SPEC declares the following destructive operations. Any operation **not** in this list is forbidden:

1. **ALTER TABLE × 3** — `ADD COLUMN cloned_from_id UUID NULL REFERENCES ...` on `lens_brand`, `lens_design`, `lens_variant`. Self-FK ON DELETE SET NULL. **Additive only.** No data loss possible.
2. **CREATE INDEX × 3** — partial indexes `idx_*_cloned_from`. Additive.
3. **CREATE FUNCTION × 1** — `clone_catalog_entry_to_private`. Additive.
4. **INSERT × 12 permissions rows + ~36 role_permissions rows** — Seed only. ON CONFLICT DO NOTHING/UPDATE guarantees idempotence.

**Explicitly NOT authorized (matches Brief §10 NOT-authorized list):**
- DROP of any table, column, policy, RPC, view, index
- TRUNCATE of any table
- ALTER POLICY / DROP POLICY (defer to follow-up if needed)
- Any write to Prizma inventory data beyond the permission seed (which is per-tenant infrastructure, not inventory data)
- `record_stock_movement` or any core RPC modification
- main branch touches
- force-push, rebase, reset --hard

If the Executor needs an operation not on the authorized list mid-run → STOP, emit escalation file, halt Phase 1.

---

## 5. UI Changes

### 5.A — Reused single component (Iron Rule 21)

New file: `shared/js/catalog-private-admin.js` (target ≤300 lines, hard cap 350 per Rule 12). Exports:

```js
export function initCatalogPrivateAdmin(opts) {
  // opts: { mountEl, productType: 'glasses'|'contact_lens'|'accessory', sb, getTenantId, hasPermission, onError }
  // Renders the 2-sub-tab UI inside mountEl.
  // Sub-tab 1: "מותגים גלובליים" — read-only Brand→Design→Variant browser (4-col layout, mirrors existing platform admin)
  // Sub-tab 2: "הקטלוג שלי" — same 4-col layout but full CRUD, gated by hasPermission(`${moduleKey(productType)}.catalog.private.manage`)
  // Clone-to-Private button appears on global-side rows when hasPermission('private.manage') is true.
}
```

Internal helpers (private functions in the same file) for the queries — all reading `lens_brand` / `lens_design` / `lens_variant` filtered by `product_type` + `owner_tenant_id` predicate as Brief §3.3 specifies.

### 5.B — Per-category wiring (3 files modified, ~20 lines each)

Each of the 3 inventory category section shells gets a "Catalog Admin" sub-tab that mounts the shared component:

- `modules/inventory/inventory-shell-lens.js` — add `catalogAdmin` tab loader; on activation: `import('shared/js/catalog-private-admin.js').then(m => m.initCatalogPrivateAdmin({ mountEl, productType: 'glasses', ... }))`
- `modules/inventory/inventory-shell-contact.js` — same, `productType: 'contact_lens'`
- `modules/inventory/inventory-shell-accessory.js` — same, `productType: 'accessory'`

### 5.C — Sidebar / sub-tab affordance in `inventory.html`

Each of the 3 category sections gets one new sub-tab button in its existing nav strip:

- `#lensNav` → add a "קטלוג מערכת" button with `data-tab="catalog-admin"` + `data-permission="lens.catalog.global.view"`
- `#contactNav` → add same with `data-permission="contact_lens.catalog.global.view"`
- `#accessoryNav` → add same with `data-permission="accessory.catalog.global.view"`

Plus 3 new section shells `#lens-catalog-admin-section`, `#contact-lens-catalog-admin-section`, `#accessory-catalog-admin-section` as mount points (each ~6 lines).

### 5.D — "פרטי" badge on Active Designs

3 module files modified (one per category):
- `modules/lens-active-designs/lens-active-designs.js` — in row render, append `<span class="badge badge-private" title="קטלוג פרטי">פרטי</span>` when `row.owner_tenant_id IS NOT NULL`
- `modules/contact-lens-active-designs/contact-lens-active-designs.js` — same (file may be a placeholder per predecessor SPEC; in that case write the minimal renderer)
- `modules/accessory-active-designs/accessory-active-designs.js` — same

CSS: 1 new rule in `css/lens-tabs.css`:
```css
.badge.badge-private {
  background: #fef3c7; color: #92400e; font-size: 10px; padding: 1px 6px;
  border-radius: 8px; margin-inline-start: 6px; vertical-align: middle;
}
```

### 5.E — Active Designs query update

3 module-JS files, one query update each: include `owner_tenant_id` in the SELECT and broaden the `WHERE` to `owner_tenant_id IS NULL OR owner_tenant_id = getTenantId()`. RLS lets only the global rows + tenant's own through anyway, so the query change is for UI display + badge logic.

---

## 6. Commit Plan (estimated 8 commits)

| # | Commit | Scope | Files |
|---|--------|-------|-------|
| C-1 | `feat(m1): add cloned_from_id self-FK to lens catalog tables` | Migration 3.A | 1 Supabase migration |
| C-2 | `feat(m1): clone_catalog_entry_to_private RPC` | Migration 3.B | 1 Supabase migration |
| C-3 | `feat(m1): seed private catalog permission keys` | Migration 3.C | 1 Supabase migration |
| C-4 | `feat(m1): shared catalog-private-admin component` | 5.A | 1 new file `shared/js/catalog-private-admin.js` |
| C-5 | `feat(m1): wire catalog admin sub-tabs in inventory.html` | 5.B + 5.C | inventory.html + 3 inventory-shell-*.js |
| C-6 | `feat(m1): private badge on active designs (lens + contact + accessory)` | 5.D + 5.E | 3 module-JS + 1 CSS rule |
| C-7 | `docs(m1): SPEC.md + EXECUTION_REPORT + FINDINGS for Phase 1` | retro | this folder |
| C-8 | (reserved for autonomous in-flight fix if VFV catches a regression) | — | TBD |

Each commit runs `npm run verify:integrity` + checks Iron Rule 32 declared ops match the diff. Pre-commit hook is the gate.

---

## 7. Acceptance Criteria (VFV Tier C — Localhost-Tester executes after Executor close)

Per Brief §3.8, 8 VFV surfaces. Re-stated in this SPEC with concrete pass criteria:

| # | Surface | Pass criterion |
|---|---------|----------------|
| S-1 | Login to demo as a CEO role → Inventory → Lens → קטלוג מערכת → מותגים גלובליים | Page renders 4-col tree filtered to `product_type='glasses'` global rows (11 designs, ~31 variants visible). NO "Add" buttons visible. NO "Edit/Delete" buttons visible. |
| S-2 | Same path → switch to "הקטלוג שלי" sub-tab | Empty state visible ("אין מותגים פרטיים — לחץ '+ הוסף מותג' להתחיל"). "Add Brand" button visible. |
| S-3 | Inventory → Contact-lens → קטלוג מערכת → both sub-tabs | Same as S-1+S-2 but filtered to `product_type='contact_lens'` (10 designs, 40 variants). |
| S-4 | Inventory → Accessory → קטלוג מערכת → both sub-tabs | Same but `product_type='accessory'` (25 designs, 25 variants). |
| S-5 | In demo's "הקטלוג שלי" → click "+ הוסף מותג" → enter "מותג בדיקה" → save | Row inserted into `lens_brand` with `owner_tenant_id=demo`, `product_type` matches active tab, visible in tab. NOT visible in "מותגים גלובליים" tab. |
| S-6 | On a global brand row, click "📋 העתק לקטלוג שלי" | New brand+design+variant chain cloned to demo with `cloned_from_id` set. RPC returns new id. Visible in "הקטלוג שלי" tab. |
| S-7 | SQL probe `SELECT name FROM lens_brand WHERE owner_tenant_id IS NULL` as anon → returns 16 globals; as authenticated demo → returns 16+demo's privates; as authenticated Prizma → returns 16+Prizma's privates ONLY (zero demo private rows leak) | Cross-tenant isolation enforced. |
| S-8 | Active Designs tab → row from "מותג בדיקה" (private) shows `פרטי` badge inline | Badge visible, distinct from global rows. |

Phase 1 closes 🟢 only if all 8 surfaces PASS. If 1 fails, Executor fix-loop within Phase (max 2 attempts). If still failing, Tier 3 defer per Brief §14.

---

## 8. Iron Rule Compliance

- **Rule 1** (atomic quantity changes) — N/A (no stock changes)
- **Rule 7** (API abstraction) — All component DB reads go through existing helpers or direct `sb.from()` with tenant_id filter for tenant-private reads
- **Rule 8** (security) — `escapeHtml()` used for all user-input rendering in catalog-private-admin.js
- **Rule 12** (file size) — shared component target ≤300 lines, hard cap 350
- **Rule 14** (tenant_id) — No new tables
- **Rule 15** (RLS) — All existing 3 tables have canonical 3-policy pattern; not modified
- **Rule 16** (module contracts) — `clone_catalog_entry_to_private` is a new RPC contract; documented in EXECUTION_REPORT and to-be-merged to GLOBAL_MAP at Integration Ceremony
- **Rule 18** (UNIQUE with tenant_id) — Existing `lens_brand_name_owner_unique`, `lens_design_name_brand_owner_unique`, `lens_variant_design_index_diameter_coating_tint_owner_unique` already scope by `owner_tenant_id` — no changes needed
- **Rule 21** (No Orphans / No Duplicates) — Single shared component reused across 3 categories; no duplicated brand/design tables created (preserves unified-design pattern)
- **Rule 22** (defense-in-depth) — Every `.insert()` in private CRUD includes `owner_tenant_id: getTenantId()` AND `.eq('owner_tenant_id', getTenantId())` on selects
- **Rule 23** (no secrets) — N/A
- **Rule 31** (integrity gate) — `npm run verify:integrity` exit 0 before every commit
- **Rule 32** (destructive ops) — Declared in §4 above

---

## 9. Rollback

If Phase 1 needs to roll back:

1. `git revert <C-6>..<C-1>` (reverts in reverse order — UI first, then permission seed, then RPC, then schema)
2. The schema revert needs Supabase migrations to drop columns:
   ```sql
   ALTER TABLE lens_variant DROP COLUMN cloned_from_id;
   ALTER TABLE lens_design DROP COLUMN cloned_from_id;
   ALTER TABLE lens_brand DROP COLUMN cloned_from_id;
   DROP FUNCTION IF EXISTS clone_catalog_entry_to_private(text, uuid, uuid);
   ```
3. Pre-Pipeline tag `pre-m1-final-completion-2026-05-17` will be placed at the parent commit before C-1. `snapshot.mjs rollback` is the canonical path.

---

## 10. Mid-Pipeline Brief Amendments (chronological log)

1. **2026-05-17 night, Pre-flight P-Q1 (Executor → Architect):** Brief §3.2 assumed 9 catalog tables; only 5 exist. 4 missing (contact_lens_brand/_design, accessory_brand/_design). Halted per Brief §12. Escalation file written.
2. **2026-05-17 night, Architect (Cowork) → Executor — "Option 1: extend hierarchy":** authorized CREATE TABLE × 4 + data migration. Estimated +1-2h on Phase 1, total Pipeline 12-15h.
3. **2026-05-17 night, Pre-flight P-Q2 deep-probe (Executor → Architect):** lens_design has CHECK-constrained `product_type` discriminator with clean data partitioning (11+10+25). Splitting into 3 trees would duplicate this pattern → Iron Rule 21 violation. Architect's Option 1 driver was "בלי פלסטרים" (P-002) which actually argues FOR keeping the discriminator + filter, not against it. Re-escalation.
4. **2026-05-17 night, Architect (Cowork) → Executor — "Option A: stay unified + filter by product_type":** revised Phase 1 scope to additive-only (3 ALTER TABLE + cloned_from_id + RPC + 12 permission keys + shared component + 3 wirings + badge). Pipeline back to original 10-14h estimate. **This is the active scope for this SPEC.**

This Phase 1 SPEC implements amendment #4. Amendments #2 and #3 are documented for traceability — neither was executed.

---

## 11. Hand-off

Per opticup-executor SKILL.md §"Folder-per-SPEC retrospective protocol":
- Executor closes by writing `EXECUTION_REPORT.md` + `FINDINGS.md` in this folder.
- Localhost-Tester runs VFV per §7, writes `TEST_REPORT.md` in this folder.
- Foreman (opticup-strategic, returns in the morning when Daniel re-engages) reads all retrospectives, writes `FOREMAN_REVIEW.md` in this folder, applies master-doc updates, harvests 2 skill-improvement proposals.

---

*End of SPEC. Iron Rule 32 §Destructive Operations declared. Authorized to proceed with C-1 through C-7. C-8 reserved for in-flight fix.*

---

## 12. Execution Markers (audit trail)

- **C-1 ✅** — 2026-05-17 night — Migration `m1_phase1_cloned_from_id_columns` applied via Supabase MCP. Verified: 3 `cloned_from_id UUID NULL` columns + 3 partial indexes (`idx_lens_brand_cloned_from`, `idx_lens_design_cloned_from`, `idx_lens_variant_cloned_from`). Prizma row-count delta = 0 across 3 tables (baseline preserved).

- **C-2 ✅** — 2026-05-17 night — Migration `m1_phase1_clone_to_private_rpc` + corrective `m1_phase1_clone_to_private_rpc_revoke_public` applied via Supabase MCP. Created `clone_catalog_entry_to_private(text, uuid, uuid) RETURNS uuid` (SECURITY DEFINER, JWT-tenant defense-in-depth check, draft+unpublished destination). Tier-1 in-flight fix: initial REVOKE-only-from-anon was insufficient because Postgres auto-grants EXECUTE to PUBLIC on CREATE FUNCTION; corrective REVOKE FROM PUBLIC applied. Final ACL: authenticated + postgres + service_role only. Prizma row-count delta still = 0 (no data written by the RPC; only function definition + grants).

- **C-3 ✅** — 2026-05-17 night — Migration `m1_phase1_permission_keys_seed` applied via Supabase MCP. 6 permission keys × 2 tenants = 12 permissions rows; role_permissions: ceo+manager × 6 perms × 2 tenants = 24 grants; team_lead+viewer+worker × 3 view-only perms × 2 tenants = 18 grants. Pre-flight catch: SPEC originally said `branch_manager` but live schema only has roles {ceo, manager, team_lead, viewer, worker} — SPEC updated to `manager`. Verified: 0 private.manage leakage to lower roles. Prizma inventory data delta = 0 across lens_brand/_design/_variant/tenant_active_offerings/pricing_overlay (perms are tenant infrastructure, not inventory data).

- **C-4 ✅** — 2026-05-17 night — Shared component `shared/js/catalog-private-admin.js` written (341 lines, within Iron Rule 12 hard cap 350). Single IIFE that exposes `window.CatalogPrivateAdmin.init({mountEl, productType, sb, getTenantId, hasPermission})`. Self-contained DOM rendering (no partial fetch needed). Per Iron Rule 21: ONE component reused across 3 product types — UI driven by `productType` discriminator passed at init time. Per Iron Rule 8: every dynamic insertion goes through `escapeHtml()`. Per Iron Rule 22: every INSERT/UPDATE writes `owner_tenant_id: getTenantId()` AND .eq('owner_tenant_id', getTenantId()) on selects. Clone calls the C-2 SECURITY DEFINER RPC. Sub-tab switcher swaps Global (read-only) vs Private (CRUD gated by data-permission attr → permission-ui.js auto-hides).

- **C-5 ✅** — 2026-05-17 night — Wired the new `private-catalog` tab into 3 inventory shells + `inventory.html`. Per SPEC §5.B + §5.C. Changes:
  - `inventory.html` (+6 lines, 1200→1206): 3 new nav-strip buttons (`data-{lens|contact|accessory}-tab="private-catalog"`) labeled "📚 הקטלוג שלי" with `data-tab-permission="<mod>.catalog.private.manage|<mod>.catalog.global.view"` (OR perm logic per permission-ui.js); 3 new section shells `<section ... data-tab="private-catalog" ...>` per category.
  - `modules/inventory/inventory-shell-lens.js` (311→342, within Rule 12 hard cap 350): added `private-catalog` tab entry to LENS_TABS registry + added to LENS_TAB_ORDER + defined `window.LensPrivateCatalog.bootstrap`. Added `explicitBootstrap: true` flag + extended ensureLoaded auto-dispatch path to honor it (shared IIFE components don't auto-init). Added `partialUrl: null` handling in ensureLoaded (skip fetchPartial when null).
  - `modules/inventory/inventory-shell-contact.js` (~218→237): same tab entry + `ContactLensPrivateCatalog.bootstrap` wrapper + null-partialUrl handling. No `explicitBootstrap` change needed (contact shell already dispatches bootstrap unconditionally on first load).
  - `modules/inventory/inventory-shell-accessory.js` (~198→216): same as contact.
  - **Executor in-flight decision D-1:** Brief §3.3 framed this as ONE catalog-admin tab with 2 sub-tabs. Reality is each of 3 inventory categories ALREADY has a `catalog-admin` tab with different per-category semantics (lens=platform-admin only, contact/accessory=tenant-CEO placeholder). Adding to those tabs would create entanglement. Decision: add a SECOND tab `private-catalog` labeled "הקטלוג שלי" alongside existing `catalog-admin`. The component itself has 2 sub-tabs (Global view + Private CRUD), so Brief's "2 sub-tabs" requirement is met at the component level, not the inventory-shell tab level. Permission-gating: visible only when user has `<mod>.catalog.private.manage` OR `<mod>.catalog.global.view`.
