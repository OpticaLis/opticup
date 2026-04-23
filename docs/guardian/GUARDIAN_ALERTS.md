# Sentinel Alerts
**Last updated:** 2026-04-22 early (Missions 3/4/5/8 full rescan — post-B6 CRM rewrite, 50+ files changed)
**Status:** ⚠️ 1 CRITICAL + 9 HIGH ACTIVE ALERTS

> This file is checked by the working chat before every commit.
> If alerts appear here — stop and notify Daniel before proceeding.

## CRITICAL
- **[M4-DOC-09] All 19 CRM B6 files have null byte padding** — Cowork VM artifact. `crm.html`, `css/crm*.css`, all `modules/crm/*.js` detected as binary. Fix with PowerShell cleanup from working machine, then commit.

## HIGH

- **[M4-DOC-06] Module 4 CRM missing from GLOBAL_MAP.md** — 20+ global functions (showCrmTab, loadCrmDashboard, etc.) not registered → run Integration Ceremony
- **[M4-DOC-07] Module 4 CRM missing from GLOBAL_SCHEMA.sql** — 23 tables, 7 views, 8 RPCs not in global schema docs → run Integration Ceremony
- **[M4-DOC-08] Module 4 CRM missing from FILE_STRUCTURE.md** — crm.html, 3 CSS files, 16 JS files not listed → update FILE_STRUCTURE.md
- **[M2-DB-01] Orphan backup table `_backup_brand_gallery_20260417` — NO RLS, no tenant_id** — DROP immediately via migration
- **[M4-DOC-04] MODULE_MAP.md documents stale sessionStorage key** — M1 MODULE_MAP.md:241 says `prizma_tenant_id`, actual key is now `tenant_id` → surgical edit
- **[M1-R12-01] Oversized non-storefront files** — 6 files exceed 350 lines (debt-dashboard 424, receipt-ocr-review 401, brands 371, stock-count-camera 368, admin-tenant-detail 361, receipt-ocr 358) → split on next touch
- **[M1-R12-02] Oversized storefront studio files** — 14 files in `modules/storefront/` exceed 350 lines (studio-block-schemas.js grew to 630) → split on next touch
- **[M8-XMOD-01] Cross-module: 4 direct table boundary violations** — access-sync, admin, brands, audit modules query tables they don't own → create contract functions → see M8 report
- **[M8-XMOD-05] No contract wrapper for inventory_logs** — 12+ files across 5 modules query audit table directly → create audit-queries.js with contract functions

## Informational (MEDIUM, not blockers)

- M3-SAAS-07: Hardcoded `prizma-optic.co.il` domain in SEO previews — `studio-brands.js:313`, `storefront-blog.html:299` → replace with `getTenantConfig('custom_domain')`.
- M3-SAAS-09: `watcher-deploy/sync-watcher.js:50-52` — Prizma-only tenant guard still in deployed copy → parameterize or document.
- M3-SAAS-14: `js/shared.js:327` `formatILS()` hardcodes ₪ symbol and 'he-IL' locale → rename to `formatCurrency()`, read from tenant config.
- M3-SAAS-15: `shared/js/table-builder.js:26-27` currency renderer hardcodes ILS/he-IL → read from tenant config.
- M3-SAAS-17: `storefront-brands.html:142` — SEO title placeholder hardcodes "אופטיקה פריזמה אשקלון" → replace with generic.
- M3-SAAS-18 (NEW): `modules/crm/crm-helpers.js:27` `formatCurrency()` hardcodes ₪ and he-IL → consolidate with shared.js.
- M3-SAAS-19 (NEW): `modules/access-sync/access-sync.js:84-85` — UI message hardcodes "אופטיקה פריזמה" → read from config or document as Prizma-only.
- M4-DOC-01: 7 root-level HTML files missing from FILE_STRUCTURE.md → update.
- M4-DOC-05: Module 3 ERP-side SESSION_CONTEXT.md missing formal Scope Declaration block.
- M5-DEBT-05: `scripts/sync-watcher.js` 516 lines, `watcher-deploy/sync-watcher.js` 494 lines → split on next touch.
- M5-DEBT-06: CRM `console.log` in production — 3 files use console.log for non-error logging.
- M5-DEBT-08 (NEW): CRM `formatCurrency` duplicates shared.js `formatILS` pattern → consolidate.
- M1-R12-03: `storefront-blog.html` (366 lines) and `storefront-content.html` (356 lines) exceed 350-line limit.
- M1-R18-03: 4 UNIQUE constraints missing tenant_id (document_links, conversation_participants, message_reactions, payment_allocations).
- M6-PERF-01: `translation_glossary` needs index on (tenant_id, lang, term_he) — 5,383 seq scans.
- M6-PERF-02: `goods_receipt_items` high seq scan count (23,330) — verify index on goods_receipt_id.
- M6-PERF-03: `storefront_reviews` zero index usage — add index on (tenant_id, product_id).
- M6-PERF-04: `media_library` high seq scan ratio — add composite index.
- M6-PERF-05: `employees`, `purchase_order_items`, `roles` high seq scan ratios — batch index creation recommended.
- M7-DOC-01: Module 4 CRM missing `ROADMAP.md` — 6 phases executed, no roadmap file.
- M7-DOC-02: Module 4 CRM missing `db-schema.sql` — 23 tables undocumented in module docs.

## Resolved — from prior runs

- **[M3-SAAS-03] RESOLVED (2026-04-22)** — inventory export filename now uses `getTenantConfig('slug')`. `inventory-export.js:207-208`.
- **[M7-DOC-03] RESOLVED (2026-04-22)** — shared.js now 344 lines, under 350 limit.
- **[M1-BACKUP-01] RESOLVED (2026-04-21)** — nested backup folder removed from disk.
- **[M4-DOC-02] RESOLVED** — Module 1 SESSION_CONTEXT.md updated 2026-04-19.
- **[M1-R18-01] RESOLVED** — `suppliers_name_tenant_key` UNIQUE(name, tenant_id) confirmed in DB.
- **[M1-R18-02] RESOLVED** — `purchase_orders_po_number_tenant_key` UNIQUE(po_number, tenant_id) confirmed in DB.
- **[M6-RLS-01/02/03] RESOLVED** — storefront RLS rewritten to canonical JWT-claim pattern.
- **[M3-SAAS-01/02/04/05/05b/06/10/11/12/13] RESOLVED** — Multiple SaaS hardcoding issues fixed.
- **[M6-DB-01] RESOLVED** — `plans_backup_20260415` dropped.
