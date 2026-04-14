# Prizma Safety Check — Pre-Launch Hardening
**Date:** 2026-04-14  
**Executed by:** Secondary (Cowork session)  
**SPEC:** MODULE_3_PRE_LAUNCH_HARDENING_SPEC_2026-04-14.md §5  
**Verdict:** ✅ PASS — no new CRITICAL or HIGH findings. See informational notes below.

---

## §5.1 — Cross-Tenant Smoke Test

**Method:** Simulate authenticated JWT call with a nonexistent tenant UUID (`'00000000-0000-0000-0000-000000000000'`). Each tenant-scoped table must return COUNT=0. Global (tenant-less) tables are exempt.

**SQL used:**
```sql
BEGIN;
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"tenant_id":"00000000-0000-0000-0000-000000000000"}';
SELECT
  (SELECT COUNT(*) FROM storefront_block_templates)    AS block_templates,
  (SELECT COUNT(*) FROM storefront_component_presets)  AS component_presets,
  (SELECT COUNT(*) FROM storefront_components)         AS components,
  (SELECT COUNT(*) FROM storefront_config)             AS config,
  (SELECT COUNT(*) FROM storefront_leads)              AS leads,
  (SELECT COUNT(*) FROM storefront_page_tags)          AS page_tags,
  (SELECT COUNT(*) FROM storefront_pages)              AS pages,
  (SELECT COUNT(*) FROM storefront_reviews)            AS reviews,
  (SELECT COUNT(*) FROM storefront_templates)          AS templates;
COMMIT;
```

**Results:**

| Table | COUNT (fake tenant) | Has tenant_id? | Expected | Result |
|---|---|---|---|---|
| storefront_block_templates | 46 | NO (global) | Any | ✅ EXPECTED |
| storefront_component_presets | 0 | YES | 0 | ✅ PASS |
| storefront_components | 0 | YES | 0 | ✅ PASS |
| storefront_config | 0 | YES | 0 | ✅ PASS |
| storefront_leads | 0 | YES | 0 | ✅ PASS |
| storefront_page_tags | 0 | YES | 0 | ✅ PASS |
| storefront_pages | 0 | YES | 0 | ✅ PASS |
| storefront_reviews | 0 | YES | 0 | ✅ PASS |
| storefront_templates | 12 | NO (global) | Any | ✅ EXPECTED |

**Note on global tables:** `storefront_block_templates` and `storefront_templates` have NO `tenant_id` column by design. They are platform-level read-only template libraries shared across all tenants. Schema verified:
- `storefront_block_templates`: columns = id, name, description, category, block_type, block_data, block_settings, icon, sort_order, is_active, created_at — no tenant_id
- `storefront_templates`: columns = id, name, description, page_type, blocks, thumbnail, is_active, created_at — no tenant_id
- RLS policies: `*_read` (authenticated, SELECT where is_active=true) + `*_service_all` (service_role, ALL) — correct for global tables
- These are NOT Rule 14 violations because they intentionally hold no per-tenant data

**§5.1 Verdict: PASS** — all tenant-scoped tables return 0 with fake tenant UUID. Global tables behave correctly.

---

## §5.2 — Hardcoded Prizma Sweep

**Method:** `grep -rn "אופטיקה פריזמה|Prizma|prizma|prizma-optic" --include="*.js" --include="*.html" --include="*.sql" .`

**Findings classified per SPEC §5.2 categories (a)–(d):**

### Category (a) — Backup / snapshot files (expected, no action)
All backup hits are inside `/backups/` subdirectories:
- `modules/Module 1 - Inventory Management/backups/v1.0-archive/index_v1.0_single_file.html` — v1.0 single-file archive, many `prizma_*` sessionStorage keys (pre-SaaS era)
- `modules/Module 1 - Inventory Management/backups/post-all-chapters/index.html` — phase backup
- `modules/Module 1 - Inventory Management/backups/M1F5.5_FULL_2026-03-13/employees.html` — dated backup
- Any other `/backups/` HTML/JS files

**Status:** ✅ EXPECTED — no action required.

### Category (b) — Authorized Prizma-only feature gate
- **`modules/access-sync/access-sync.js:68–84`** — `isPrizmaSync()` function checks `TENANT_SLUG === 'prizma'` to gate the UI panel. Line 84: `"סנכרון Access זמין רק לאופטיקה פריזמה"` (Access sync available only for Prizma Optics).
  - **Context:** Access/Excel sync is an explicitly Prizma-only feature at this time. The server-side gate was upgraded to DB-driven (`access_sync_enabled` column, migration 064) in this SPEC's M3-SAAS-04 Part B. The UI-side `isPrizmaSync()` function remains as a display gate — acceptable while Access sync is Prizma-only.
  - **Status:** ✅ AUTHORIZED — not a violation. Document for future removal when Access sync is multi-tenant.

### Category (c) — Migration scripts (informational, M3-SAAS-09)
- `scripts/import-*.js` and similar migration/import scripts that reference the Prizma tenant UUID directly.
  - **Status:** ℹ️ INFORMATIONAL — pre-existing alert M3-SAAS-09 in GUARDIAN_ALERTS.md. Parameterize via env var on next touch.

### Category (d) — Known tech debt, deferred
- **`modules/storefront/studio-shortcodes.js:68-69`** — `BUILTIN_CTA_PRESETS` retains `optic_prizma` hardcoding. Alert M3-SAAS-05b in GUARDIAN_ALERTS.md. Fix in next work package.
- **`modules/storefront/storefront-translations.js:571`** — fallback literal "אופטיקה פריזמה" when `getTenantConfig('name')` missing. Alert M3-SAAS-11. Fix in next work package.
- **`modules/storefront/brand-translations.js:400`** — same pattern. Alert M3-SAAS-11.
- **`modules/storefront/studio-brands.js:269`** — same pattern. Alert M3-SAAS-11.
- **`modules/storefront/storefront-blog.js:682`** — `prizma-optic.co.il` hardcoded as preview domain in blog SEO preview widget. Has inline comment `// TODO(B4): replace hardcoded domain with getTenantConfig('custom_domain') when added to schema`. **NEW finding** — adding as M3-SAAS-12 in GUARDIAN_ALERTS.md informational section.

### Out-of-scope findings (Module 1)
- **`modules/Module 1 - Inventory Management/inventory.html:12,277`** — main Module 1 inventory HTML (208 KB live file, NOT a backup). Contains `<title>אופטיקה פריזמה — מערכת מלאי</title>` and `<div class="logo"> אופטיקה פריזמה</div>`. Rule 9 violation (hardcoded business values in title and logo). **NEW finding** outside M3 scope — adding as M1-SAAS-01 informational. Fix in Module 1 next work package.

**§5.2 Verdict: PASS** — all hits classified. No unaccounted-for HIGH/CRITICAL violations. Two new informational items noted (M3-SAAS-12, M1-SAAS-01).

---

## §5.3 — RLS Completeness

**Method:** Query `pg_tables` + `pg_policies` to find storefront tables with RLS disabled.

**Result:** `[]` — all storefront tables have RLS enabled.

**§5.3 Verdict: PASS** ✅

---

## §5.4 — UNIQUE Constraints (Tenant-Scope Check)

**Alert status corrections:**

| Alert | Constraint | Live DB state | Verdict |
|---|---|---|---|
| M1-R18-01 (was HIGH) | `suppliers_name_key` | **DOES NOT EXIST** — replaced by `suppliers_name_tenant_key` UNIQUE(name, tenant_id) | ✅ STALE — removing from HIGH |
| M1-R18-01 (was HIGH) | `suppliers_supplier_number_key` | **DOES NOT EXIST** — replaced by `suppliers_supplier_number_tenant_key` UNIQUE(supplier_number, tenant_id) | ✅ STALE — removing from HIGH |
| M1-R18-02 (was HIGH) | `po_number_key` | **DOES NOT EXIST** — replaced by `purchase_orders_po_number_tenant_key` UNIQUE(po_number, tenant_id) | ✅ STALE — removing from HIGH |

**Global table UNIQUEs (correct):**
- `storefront_block_templates_name_key` UNIQUE(name) — correct because no tenant_id column; names are globally unique in a global library
- `storefront_templates_name_key` UNIQUE(name) — same, correct

**§5.4 Verdict: PASS** — no non-tenant-scoped UNIQUE constraints on tenant-scoped tables. Alerts M1-R18-01 and M1-R18-02 confirmed STALE and removed from GUARDIAN_ALERTS HIGH section.

---

## §5.5 — Storefront Views Audit

**Method:** `SELECT view_name FROM information_schema.views WHERE table_schema='public' AND view_name LIKE 'v_storefront_%'` + column inspection.

**Result:** 10 storefront views retrieved. All 10 include `tenant_id` in their SELECT list and/or WHERE clause (via JOIN on a tenant-scoped table). No view exposes cross-tenant data.

**§5.5 Verdict: PASS** ✅

---

## Overall Safety Check Verdict

| Check | Verdict |
|---|---|
| §5.1 Cross-tenant smoke | ✅ PASS |
| §5.2 Hardcoded Prizma sweep | ✅ PASS (informational notes) |
| §5.3 RLS completeness | ✅ PASS |
| §5.4 UNIQUE constraints | ✅ PASS (stale alerts corrected) |
| §5.5 Views audit | ✅ PASS |

**No new CRITICAL or HIGH findings. Pre-launch hardening §5 COMPLETE.**

---

## Actions Taken from This Report

1. GUARDIAN_ALERTS.md updated:
   - M1-R18-01 and M1-R18-02 moved from HIGH → Resolved (STALE — already fixed in DB)
   - M3-SAAS-12 added to Informational (blog preview domain hardcoded)
   - M1-SAAS-01 added to Informational (Module 1 inventory.html branding)
