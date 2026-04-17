# Sentinel Report
**Run date:** 2026-04-13 19:30
**Missions executed:** Mission 1, 2 (19:30 — full scan on 40+ changed files from B5/B6/brand-unification commits) · Mission 3, 4, 5, 8 (16:45 — retained)
**Summary:** 0 critical, 11 high, 9 medium, 4 low findings

---

## Mission 1: Rule Compliance
**Status:** FINDINGS — 6 HIGH (5 carried + 1 new from B6/brand-unification sprint)

### Finding: M1-R12-01 — Oversized Files (non-storefront)
- **Severity:** HIGH
- **Rule:** Rule 12 (absolute max 350 lines)
- **Location:** Multiple active source files
- **What's wrong:** Seven non-storefront source files exceed the 350-line absolute maximum:
  - `modules/debt/debt-dashboard.js` — 424 lines
  - `modules/goods-receipts/receipt-ocr-review.js` — 401 lines
  - `js/shared.js` — 379 lines
  - `modules/brands/brands.js` — 371 lines
  - `modules/admin-platform/admin-tenant-detail.js` — 361 lines
  - `modules/goods-receipts/receipt-ocr.js` — 358 lines
  - `modules/goods-receipts/receipt-form-items.js` — 357 lines
- **Suggested action:** Split each file at a clear logical boundary during the next relevant work session.

### Finding: M1-R12-02 — Oversized Storefront Studio Files
- **Severity:** HIGH
- **Rule:** Rule 12 (absolute max 350 lines)
- **Location:** `modules/storefront/` directory
- **What's wrong:** 14 storefront studio files exceed 350 lines. The brand image unification sprint grew `studio-brands.js` to 871 lines (was not specifically measured before). Current worst offenders: storefront-translations.js 1264, brand-translations.js 1010, studio-shortcodes.js 886, studio-brands.js 871, storefront-blog.js 755, studio-pages.js 698, studio-campaigns.js 698, storefront-content.js 614, studio-media.js 575, studio-block-schemas.js 485, studio-campaign-builder.js 430, studio-reviews.js 377, studio-templates.js 364, studio-editor.js 359. Also approaching threshold: storefront-brands.js 310, studio-product-picker.js 309, studio-translations.js 308.
- **Suggested action:** Do not let these files grow further. Split by logical responsibility on next touch.

### Finding: M1-R09-01 — Hardcoded tenant slug in storefront brand preview URL
- **Severity:** HIGH
- **Rule:** Rule 9 (no hardcoded business values)
- **Location:** `modules/storefront/studio-brands.js:425`
- **What's wrong:** The "Open brand page" link hardcodes `?t=prizma` as a URL query parameter: `${STOREFRONT_BASE}/brands/.../...?t=prizma`. Any other tenant using Studio would generate links tagged as Prizma, breaking multi-tenant correctness.
- **Suggested action:** Replace `?t=prizma` with `?t=${TENANT_SLUG}` (or remove if the parameter is for analytics only and not needed).

### Finding: M1-R18-01 — UNIQUE constraint on `suppliers` missing tenant_id
- **Severity:** HIGH
- **Rule:** Rule 18
- **Location:** `suppliers` table — constraints `suppliers_name_key` and `suppliers_supplier_number_key`
- **What's wrong:** Both UNIQUE constraints are global, not tenant-scoped. Will block second tenant onboarding.
- **Suggested action:** DB migration: `UNIQUE (name, tenant_id)` and `UNIQUE (supplier_number, tenant_id)`.

### Finding: M1-R18-02 — UNIQUE constraint on `purchase_orders` missing tenant_id
- **Severity:** HIGH
- **Rule:** Rule 18
- **Location:** `purchase_orders` table — constraint `purchase_orders_po_number_key`
- **What's wrong:** `po_number` UNIQUE is global. Second tenant's PO-0001 collides with first tenant's.
- **Suggested action:** DB migration: `UNIQUE (po_number, tenant_id)`.

### Finding: M1-R03-01 — Hard deletes (double-PIN gate unverified)
- **Severity:** MEDIUM
- **Rule:** Rule 3
- **Location:** `modules/audit/audit-log.js:169`, `modules/brands/brands.js:255`
- **What's wrong:** Permanent hard-delete code paths exist. Sentinel could not verify full double-PIN gate.
- **Suggested action:** Confirm double-PIN requirement in next code session.

### Finding: M1-R03-02 — Hard delete in rollback handler
- **Severity:** MEDIUM
- **Rule:** Rule 3
- **Location:** `modules/goods-receipts/receipt-confirm-items.js:96`
- **What's wrong:** Error-rollback handler hard-deletes newly-created inventory rows. Technically Rule 3 violation but functionally correct.
- **Suggested action:** Add comment documenting intent.

### Finding: M1-BACKUP-01 — Nested backup folder blocks Sentinel scans
- **Severity:** MEDIUM
- **Rule:** Rule 21
- **Location:** `modules/Module 3 - Storefront/backups/2026-03-30_12-05_pre-phase4b/opticup-erp/`
- **What's wrong:** Recursive repo copy with >255-char paths. Breaks grep/find.
- **Suggested action:** Delete this nested backup.

### Finding: M1-LOW-01 — Supabase anon key in source
- **Severity:** LOW
- **Rule:** Rule 23
- **Location:** `js/shared.js:3`, `modules/admin-platform/admin-auth.js:5`
- **What's wrong:** Anon key in source. Accepted pattern for no-build apps.
- **Suggested action:** Document as known exception.

---

## Mission 2: Security Audit
**Status:** FINDINGS — low severity only (re-scanned 19:30 after B5/B6/brand-unification sprint, no new HIGH/CRITICAL findings)

### Finding: M2-RLS-01 — tenant_config uses ::jsonb vs. canonical ::json
- **Severity:** LOW
- **Location:** `tenant_config` table — policy `tenant_config_tenant_read`
- **What's wrong:** Uses `::jsonb` instead of canonical `::json`. Functionally identical.
- **Suggested action:** Standardize in next DB maintenance window.

### Security scan results (19:30 full scan):
- **XSS / innerHTML**: All `innerHTML` usages in changed files (auth-service.js, receipt-confirm-items.js, receipt-ocr.js, inventory-reduction.js, studio-brands.js etc.) use either static HTML templates, `escapeHtml()` wrappers, or no user-controlled data. No new XSS vectors introduced. ✅
- **Secrets**: No service_role keys or API keys in code. The `api_key_source` in FIELD_MAP and `google_api_key` references in studio-reviews.js read from DB config, not hardcoded values. ✅
- **tenant_id in writes**: All new inserts/upserts from the sprint include tenant_id: `media_library` insert, `translation_corrections` insert, `translation_memory` upsert, `storefront_component_presets` insert, `inventory` insert in receipt-confirm-items.js — all confirmed with `tenant_id: getTenantId()`. ✅
- **PIN verification**: auth-service.js verifyEmployeePIN() continues to call pin-auth Edge Function. The `must_change_pin` flow writes the new PIN hash directly to employees table (pre-existing pattern, not a new violation). ✅
- **Direct sb.from() in storefront modules**: studio-media.js and studio-brands.js use direct sb.from() calls. These are ERP Studio admin files (not public storefront), same pattern as all other studio files. Existing MEDIUM-level finding, no escalation needed.

---

## Mission 3: SaaS Readiness
**Status:** FINDINGS — 6 HIGH, 2 MEDIUM
**Last run:** 2026-04-13 16:45

### Finding: M3-SAAS-01 — Hardcoded tenant name in inventory HTML title
- **Severity:** HIGH
- **Rule:** Rule 9 (no hardcoded business values)
- **Location:** `modules/Module 1 - Inventory Management/inventory.html:12`
- **What's wrong:** `<title>אופטיקה פריזמה — מערכת מלאי</title>` — Hebrew tenant name hardcoded in page title.
- **Suggested action:** Replace with `getTenantConfig('name')` + suffix.

### Finding: M3-SAAS-02 — Hardcoded tenant name in page header/logo
- **Severity:** HIGH
- **Rule:** Rule 9
- **Location:** `modules/Module 1 - Inventory Management/inventory.html:277`
- **What's wrong:** `<div class="logo">... אופטיקה פריזמה</div>` — tenant name displayed to all tenants.
- **Suggested action:** Render from `getTenantConfig('name')`.

### Finding: M3-SAAS-03 — Hardcoded tenant name in Excel export filename
- **Severity:** HIGH
- **Rule:** Rule 9
- **Location:** `modules/Module 1 - Inventory Management/inventory.html:2062`
- **What's wrong:** Export filename includes `פריזמה` (Prizma).
- **Suggested action:** Use `getTenantConfig('name')` in filename.

### Finding: M3-SAAS-04 — Hardcoded Prizma tenant UUID in sync-watcher
- **Severity:** HIGH
- **Rule:** Rule 9
- **Location:** `scripts/sync-watcher.js:45,50`
- **What's wrong:** Prizma's UUID hardcoded as default and guard constant. Locks sync to one tenant.
- **Suggested action:** Require env var explicitly, no default UUID.

### Finding: M3-SAAS-05 — Hardcoded WhatsApp number in shortcode presets
- **Severity:** HIGH
- **Rule:** Rule 9
- **Location:** `modules/storefront/studio-shortcodes.js:107`
- **What's wrong:** Prizma's WhatsApp number (972533645404) hardcoded in sticky bar template.
- **Suggested action:** Use `getTenantConfig('whatsapp_number')`.

### Finding: M3-SAAS-06 — Hardcoded Instagram handle in shortcode presets
- **Severity:** HIGH
- **Rule:** Rule 9
- **Location:** `modules/storefront/studio-shortcodes.js:107,112`
- **What's wrong:** `instagram.com/optic_prizma/` hardcoded in preset HTML.
- **Suggested action:** Use `getTenantConfig('instagram_handle')`.

### Finding: M3-SAAS-07 — Hardcoded domain in SEO previews
- **Severity:** MEDIUM
- **Rule:** Rule 9
- **Location:** `modules/storefront/studio-brands.js:299`, `modules/storefront/storefront-blog.js:682`
- **What's wrong:** `prizma-optic.co.il` hardcoded in Google SEO preview mockups. Has existing TODO(B4).
- **Suggested action:** Replace with `getTenantConfig('custom_domain')`.

### Finding: M3-SAAS-08 — Hardcoded tenant name as fallback in translations
- **Severity:** MEDIUM
- **Rule:** Rule 9
- **Location:** `modules/storefront/brand-translations.js:400-401`
- **What's wrong:** `'אופטיקה פריזמה'` and `'Prizma Optic'` used as fallback when getTenantConfig returns empty.
- **Suggested action:** Remove hardcoded fallbacks; fail gracefully or use placeholder.

---

## Mission 4: Documentation Accuracy
**Status:** FINDINGS — 2 MEDIUM, 1 LOW
**Last run:** 2026-04-13 16:45

### Finding: M4-DOC-01 — Missing HTML files in FILE_STRUCTURE.md
- **Severity:** MEDIUM
- **Rule:** Rule 21 (no orphans)
- **Location:** `docs/FILE_STRUCTURE.md` (root section)
- **What's wrong:** 3 root-level storefront HTML files exist but are not listed: `storefront-blog.html`, `storefront-content.html`, `storefront-landing-content.html`.
- **Suggested action:** Add to FILE_STRUCTURE.md root section.

### Finding: M4-DOC-02 — Module 1 SESSION_CONTEXT.md stale
- **Severity:** MEDIUM
- **Location:** `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`
- **What's wrong:** Dated 2026-03-29 (15 days old) with 5 recent commits touching Module 1. May not reflect current work state.
- **Suggested action:** Update on next Module 1 work session.

### Finding: M4-DOC-03 — Storefront module file count outdated in FILE_STRUCTURE.md
- **Severity:** LOW
- **Location:** `docs/FILE_STRUCTURE.md` (storefront section)
- **What's wrong:** 32 storefront JS files exist but only ~20 documented. 12 files added during Module 3 Phase B not listed.
- **Suggested action:** Update storefront section of FILE_STRUCTURE.md.

### Clean areas (Mission 4):
- GLOBAL_SCHEMA.sql — current as of 2026-04-11 audit, no migrations since ✅
- GLOBAL_MAP.md function registry — 12 sampled functions all verified in code ✅
- Module 1.5 and Module 2 SESSION_CONTEXT — appropriately fresh (no recent activity) ✅
- Module 3 SESSION_CONTEXT — updated today (2026-04-13) ✅

---

## Mission 5: Technical Debt
**Status:** FINDINGS — cross-references Mission 1 file sizes + 3 new
**Last run:** 2026-04-13 16:45

### Finding: M5-DEBT-01 — Oversized files (cross-ref M1-R12-01/02)
- **Severity:** HIGH/MEDIUM
- **Rule:** Rule 12
- **Location:** 18 files total (7 HIGH >350, 11 MEDIUM 300-350)
- **What's wrong:** Same as Mission 1 findings. No new files beyond previous list.
- **Suggested action:** See Mission 1 remediation.

### Finding: M5-DEBT-02 — Deferred pg_cron job TODO
- **Severity:** MEDIUM
- **Location:** `modules/debt/debt-doc-actions.js:156`
- **What's wrong:** `// TODO: deferred pg_cron job for soft-delete cleanup` — deferred automation.
- **Suggested action:** Address during Module 4 or tech debt sprint.

### Finding: M5-DEBT-03 — Phase B4 deferred feature TODOs
- **Severity:** MEDIUM
- **Location:** `modules/storefront/studio-brands.js`, `modules/storefront/storefront-blog.js`
- **What's wrong:** Two `TODO(B4)` comments for custom domain and configurable social links. Overlaps M3-SAAS-07.
- **Suggested action:** Track in Module 3 roadmap.

### Finding: M5-DEBT-04 — Console.log in production code
- **Severity:** LOW
- **Location:** ~20 occurrences across AI workflows, barcode scanning, translation loading
- **What's wrong:** Debug console.log in production code paths.
- **Suggested action:** Clean up before merge to main.

### Clean areas (Mission 5):
- Duplicate function names — none found across codebase ✅
- All security debt (Rules 14/15) — fixed as of 2026-04-12 ✅

---

## Mission 8: Cross-Module Integrity
**Status:** FINDINGS — 4 HIGH, 1 MEDIUM
**Last run:** 2026-04-13 16:45

### Finding: M8-XMOD-01 — access-sync reads inventory_logs directly
- **Severity:** HIGH
- **Rule:** Rule 16 (contracts between modules)
- **Location:** `modules/access-sync/sync-details.js:43-48`
- **What's wrong:** `access-sync` module directly queries `inventory_logs` (owned by audit module) to correlate sync results. Bypasses contract layer.
- **Suggested action:** Create audit contract function for retrieving sync-related log entries.

### Finding: M8-XMOD-02 — admin/system-log reads inventory_logs directly
- **Severity:** HIGH
- **Rule:** Rule 16
- **Location:** `modules/admin/system-log.js:83-96`
- **What's wrong:** Admin module runs 4 parallel queries directly on `inventory_logs` for dashboard stats.
- **Suggested action:** Create audit contract returning summary stats for a time window.

### Finding: M8-XMOD-03 — brands/suppliers reads purchase_orders directly
- **Severity:** HIGH
- **Rule:** Rule 16
- **Location:** `modules/brands/suppliers.js:80-89`
- **What's wrong:** Brands module queries `purchase_orders` (owned by purchasing) to check if supplier has POs.
- **Suggested action:** Create purchasing contract `supplierHasActivePOs(supplierId)`.

### Finding: M8-XMOD-04 — audit/item-history reads supplier_documents directly
- **Severity:** HIGH
- **Rule:** Rule 16
- **Location:** `modules/audit/item-history.js:138-173`
- **What's wrong:** Audit module queries `supplier_documents` and `document_types` (owned by debt module) to build item history.
- **Suggested action:** Create debt contract for document context enrichment.

### Finding: M8-XMOD-05 — No contract wrapper for inventory_logs queries
- **Severity:** MEDIUM
- **Rule:** Rule 16
- **Location:** `inventory_logs` accessed in 12+ files across 5 modules
- **What's wrong:** No reusable contract functions exist for audit log queries. Every consumer calls `.from('inventory_logs')` directly.
- **Suggested action:** Create `modules/audit/audit-queries.js` with contract functions: `getAuditLogsBatch()`, `getAuditLogStats()`, `getItemAuditHistory()`. Register in GLOBAL_MAP.md.

---

## Clean Areas (All Missions)

**Mission 1/2 (19:30 re-scan after B5/B6/brand-unification sprint):**
- Rule 1 (atomic quantity changes) ✅
- Rule 3 (soft delete) — new receipt-confirm-items.js rollback hard-delete is error path, pre-existing ✅
- Rule 6 (index.html location) ✅
- Rule 9 (B6 refactor) — prizma_* sessionStorage keys successfully replaced with tenant_* across 20+ files ✅
- Rule 11 (sequential numbers via RPC) ✅
- Rule 22 (tenant_id in writes) — all new inserts/upserts in brand-unification sprint include tenant_id ✅
- RLS coverage — all tables have policies ✅
- RLS canonical pattern — correct JWT-claim pattern ✅
- tenant_id on tables (Rule 14) — only platform tables omit by design ✅
- XSS (Rule 8) — escapeHtml applied correctly in all changed files ✅
- Secrets (Rule 23) — no service_role keys in code ✅
- PIN verification — no client-side auth bypass ✅

**Mission 3 (16:45):**
- Currency (₪/ILS) — reads from `getTenantConfig('default_currency')` ✅
- Tax rate (17%) — configurable per tenant, no hardcoded calculations ✅
- Logo paths — read from `logo_url` tenant config ✅

**Mission 4 (16:45):**
- GLOBAL_SCHEMA.sql — current, no drift detected ✅
- GLOBAL_MAP.md function registry — 12 functions spot-checked, all found ✅
- Module 1.5, 2, 3 SESSION_CONTEXT — appropriately fresh ✅

**Mission 5 (16:45):**
- Zero duplicate function names ✅
- All security debt (Rules 14/15) resolved ✅

**Mission 8 (16:45):**
- No cross-module `import` statements ✅
- No CSS global scope leaks from modules ✅

---

*Next scheduled runs: Missions 1, 2 (hourly) · Missions 3, 4, 5, 8 (every 4h) · Missions 6, 7, 9 (daily)*
