# Sentinel Alerts
**Last updated:** 2026-04-15 (full Missions 3, 4, 5, 8 + incremental 1, 2 + daily 6, 7, 9)
**Status:** ⚠️ 6 ACTIVE HIGH ALERTS (2 resolved in same-day fix)

> This file is checked by the working chat before every commit.
> If alerts appear here — stop and notify Daniel before proceeding.

## CRITICAL
*(none)*

## HIGH

- **[M6-AUTH-01] Leaked-password protection disabled** — Supabase Auth HaveIBeenPwned check is OFF; users can set known-breached passwords → enable toggle in Auth settings (no code change) → Supabase Auth dashboard
- **[M1-R12-01] Oversized non-storefront files** — 7 files exceed 350-line limit (debt-dashboard.js 424, receipt-ocr-review.js 401, shared.js 379, brands.js 371, admin-tenant-detail.js 361, receipt-ocr.js 358, receipt-form-items.js 357) → split on next touch
- **[M1-R12-02] Oversized storefront studio files** — 14 files in `modules/storefront/` exceed 350 lines (worst: storefront-translations.js 1264) → do not add to these files; split on next touch
- **[M8-XMOD-01] Cross-module: 4 direct table boundary violations** — access-sync, admin, brands, audit modules query tables they don't own (inventory_logs, purchase_orders, supplier_documents) → create contract functions → see M8 report
- **[M8-XMOD-05] No contract wrapper for inventory_logs** — 12+ files across 5 modules query audit table directly → create audit-queries.js with contract functions
- **[M4-DOC-04] MODULE_MAP.md documents old sessionStorage key post-B6** — M1 MODULE_MAP.md:239 says `getTenantId()` reads `'prizma_tenant_id'`; B6 (commit `7e99030`) renamed it to `'tenant_id'` → surgical edit → `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md:239`

## Informational (MEDIUM, not blockers)

- M3-SAAS-03: Excel export filename still contains `פריזמה` — `inventory.html:2062` → update to use `getTenantConfig('name')`.
- M3-SAAS-14: `js/shared.js:327` `formatILS()` hardcodes ₪ symbol and 'he-IL' locale — used 20+ places in debt module → rename to `formatCurrency()`, read from tenant config *(NEW — 2026-04-15)*
- M3-SAAS-15: `shared/js/table-builder.js:26-27` currency renderer hardcodes ILS/he-IL — affects all tables with currency columns *(NEW — 2026-04-15)*
- M4-DOC-05: Module 3 ERP-side SESSION_CONTEXT.md missing formal Scope Declaration block per Mission 4.9 *(NEW — 2026-04-15)*
- M1-R09-03: `storefront-brands.html:142` — SEO title placeholder hardcodes "אופטיקה פריזמה אשקלון" → replace with generic example.
- M1-R12-03: `storefront-blog.html` (376 lines) and `storefront-content.html` (357 lines) exceed 350-line limit after feature-gate additions.
- M3-SAAS-09: 3 migration scripts hardcode Prizma tenant UUID → parameterize in future migrations.
- M5-DEBT-05: `scripts/sync-watcher.js` 516 lines, `watcher-deploy/sync-watcher.js` 494 lines — both over 350 limit, split on next touch.
- M6-PERF-01: `translation_glossary` needs index on (tenant_id, lang, term_he) — 5,375 seq scans.
- M6-PERF-02: `goods_receipt_items` high seq scan count — verify index on goods_receipt_id.
- M6-PERF-03: `storefront_reviews` zero index usage — add index on (tenant_id, product_id).
- M4-DOC-01: 3 root-level HTML files missing from FILE_STRUCTURE.md (storefront-blog.html, storefront-content.html, storefront-landing-content.html).
- M4-DOC-02: Module 1 SESSION_CONTEXT.md 17+ days stale — update on next M1 session.
- M1-BACKUP-01: Stale nested backup folder at `modules/Module 3 - Storefront/backups/2026-03-30_12-05_pre-phase4b/` — pending Daniel's local `git rm -r`.

## Resolved — from prior runs

- **[M1-R18-01] RESOLVED (stale)** — `suppliers_name_tenant_key` UNIQUE(name, tenant_id) confirmed in DB.
- **[M1-R18-02] RESOLVED (stale)** — `purchase_orders_po_number_tenant_key` UNIQUE(po_number, tenant_id) confirmed in DB.
- **[M6-RLS-01/02/03] RESOLVED** — storefront_components/pages/reviews RLS rewritten to canonical JWT-claim pattern. Commit `66acfc7`.
- **[M3-SAAS-01] RESOLVED** — inventory.html dynamic title/logo. Commit `6ce4b67`.
- **[M3-SAAS-02] RESOLVED** — inventory.html:277 verified: `<span id="inv-store-name">` populated dynamically by M1-SAAS-01 fix. No hardcoded tenant name. Verified 2026-04-15.
- **[M3-SAAS-04] RESOLVED** — sync-watcher.js Prizma UUID fallback removed. Commits `461a3c0`, `97146ce`.
- **[M3-SAAS-05] RESOLVED** — WhatsApp number reads from tenant config. Commit `43479ca`.
- **[M3-SAAS-05b] RESOLVED** — Instagram CTA preset reads from tenant config. Commit `a115b5a`.
- **[M3-SAAS-06/Instagram] RESOLVED** — `optic_prizma` handle removed from shortcodes. Commit `a115b5a`.
- **[M1-R09-01] RESOLVED** — `?t=prizma` replaced with dynamic TENANT_SLUG. Commit `d33a8a1`.
- **[M3-SAAS-10] RESOLVED** — studio-editor.js TENANT_SLUG fallback removed. Commit `5de07d6`.
- **[M3-SAAS-11] RESOLVED** — Hebrew store name literals replaced with getTenantConfig. Commit `5a0a561`.
- **[M3-SAAS-12] RESOLVED** — Blog SEO preview domain reads from tenant config. Commit `67468ed`.
- **[M3-SAAS-13] RESOLVED** — `studio-permissions.js` legacy `SUPER_ADMIN_TENANTS_LEGACY = ['prizma']` array and slug fallback removed. `getStudioRole()` now reads exclusively from `tenants.is_super_admin` DB column. Resolved 2026-04-15.
- **[M6-DB-01] RESOLVED** — `plans_backup_20260415` dropped via migration `drop_plans_backup_20260415`. Backup table no longer exposed via anon key. Resolved 2026-04-15.
