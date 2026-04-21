# Sentinel Alerts
**Last updated:** 2026-04-21 (Missions 1+2 refresh — M1-R18-01/02 resolved, M2-DB-01 new)
**Status:** ⚠️ 9 ACTIVE HIGH ALERTS (3 CRM Integration gap + 1 new DB backup)

> This file is checked by the working chat before every commit.
> If alerts appear here — stop and notify Daniel before proceeding.

## CRITICAL
*(none)*

## HIGH

- **[M4-DOC-06] Module 4 CRM missing from GLOBAL_MAP.md** — 20+ global functions (showCrmTab, loadCrmDashboard, etc.) not registered → run Integration Ceremony (NEW)
- **[M4-DOC-07] Module 4 CRM missing from GLOBAL_SCHEMA.sql** — 23 tables, 7 views, 8 RPCs not in global schema docs → run Integration Ceremony (NEW)
- **[M4-DOC-08] Module 4 CRM missing from FILE_STRUCTURE.md** — crm.html, css/crm.css, 15 JS files not listed → update FILE_STRUCTURE.md (NEW)
- **[M2-DB-01] Orphan backup table `_backup_brand_gallery_20260417` — NO RLS, no tenant_id** — DROP immediately via migration (NEW)
- **[M1-R12-01] Oversized non-storefront files** — 6 files exceed 350 lines (shared.js RESOLVED; stock-count-camera.js 368 NEW) → split on next touch
- **[M1-R12-02] Oversized storefront studio files** — 15 files in `modules/storefront/` exceed 350 lines (studio-block-schemas.js grew +145 to 630) → split on next touch
- **[M8-XMOD-01] Cross-module: 4 direct table boundary violations** — access-sync, admin, brands, audit modules query tables they don't own → create contract functions → see M8 report
- **[M8-XMOD-05] No contract wrapper for inventory_logs** — 12+ files across 5 modules query audit table directly → create audit-queries.js with contract functions
- **[M4-DOC-04] MODULE_MAP.md documents old sessionStorage key post-B6** — M1 MODULE_MAP.md:239 says `getTenantId()` reads `'prizma_tenant_id'`; B6 (commit `7e99030`) renamed it to `'tenant_id'` → surgical edit → `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md:239`

## Informational (MEDIUM, not blockers)

- M3-SAAS-03: Excel export filename still contains `פריזמה` — `inventory.html:2062` → update to use `getTenantConfig('name')`.
- M3-SAAS-07: Hardcoded `prizma-optic.co.il` domain in SEO previews — `studio-brands.js:313`, `storefront-blog.html:299` → replace with `getTenantConfig('custom_domain')` (escalated to HIGH).
- M3-SAAS-09: `watcher-deploy/sync-watcher.js:50-52` — Prizma-only tenant guard still in deployed copy → parameterize or document.
- M3-SAAS-14: `js/shared.js:327` `formatILS()` hardcodes ₪ symbol and 'he-IL' locale — used 20+ places in debt module → rename to `formatCurrency()`, read from tenant config.
- M3-SAAS-15: `shared/js/table-builder.js:26-27` currency renderer hardcodes ILS/he-IL — affects all tables with currency columns.
- M3-SAAS-17: `storefront-brands.html:142` — SEO title placeholder hardcodes "אופטיקה פריזמה אשקלון" → replace with generic (NEW).
- M4-DOC-01: 7 root-level HTML files missing from FILE_STRUCTURE.md (was 3, now includes crm.html, admin.html, error.html, landing.html).
- M4-DOC-05: Module 3 ERP-side SESSION_CONTEXT.md missing formal Scope Declaration block per Mission 4.9.
- M1-R12-03: `storefront-blog.html` (376 lines) and `storefront-content.html` (357 lines) exceed 350-line limit after feature-gate additions.
- M5-DEBT-05: `scripts/sync-watcher.js` 516 lines, `watcher-deploy/sync-watcher.js` 494 lines — both over 350 limit, split on next touch.
- M5-DEBT-06: CRM `console.log` in production — 3 files use console.log for non-error logging (NEW).
- M6-PERF-01: `translation_glossary` needs index on (tenant_id, lang, term_he) — 5,383 seq scans *(confirmed 2026-04-21)*.
- M6-PERF-02: `goods_receipt_items` high seq scan count (23,330) — verify index on goods_receipt_id *(confirmed 2026-04-21)*.
- M6-PERF-03: `storefront_reviews` zero index usage (1 idx scan vs 1,580 seq) — add index on (tenant_id, product_id) *(confirmed 2026-04-21)*.
- M6-PERF-04: `media_library` high seq scan ratio (3,472 seq / 251 idx, 903K tuples read) — add composite index *(confirmed 2026-04-21)*.
- M6-PERF-05: `employees`, `purchase_order_items`, `roles` high seq scan ratios — batch index creation recommended *(NEW — 2026-04-21 evening)*.
- M7-DOC-01: Module 4 CRM missing `ROADMAP.md` — 5 phases executed, no roadmap file *(confirmed 2026-04-21)*.
- M7-DOC-02: Module 4 CRM missing `db-schema.sql` — 23 tables undocumented in module docs *(NEW — 2026-04-21)*.
- M1-R18-03: 4 UNIQUE constraints missing tenant_id (document_links, conversation_participants, message_reactions, payment_allocations) — low risk, fix in maintenance migration (NEW).
- M1-BACKUP-01: **ESCALATED** — Nested backup folder caused git index corruption during Sentinel run. Priority delete: `git rm -r "modules/Module 3 - Storefront/backups/2026-03-30_12-05_pre-phase4b/"` from a working machine.

## Resolved — from prior runs

- **[M4-DOC-02] RESOLVED** — Module 1 SESSION_CONTEXT.md updated 2026-04-19 (was 17+ days stale).

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
- **[M6-AUTH-01] RESOLVED (mitigated via different control)** — HaveIBeenPwned leaked-password check is a Supabase Pro-plan feature; Optic Up is on Free plan. Since Optic Up does NOT use Supabase email/passwo