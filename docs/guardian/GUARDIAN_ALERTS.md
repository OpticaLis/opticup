# Sentinel Alerts
**Last updated:** 2026-04-13 19:30
**Status:** ⚠️ 11 ACTIVE ALERTS

> This file is checked by the working chat before every commit.
> If alerts appear here — stop and notify Daniel before proceeding.

## CRITICAL
*(none)*

## HIGH

- **[M1-R12-01] Oversized non-storefront files** — 7 files exceed 350-line limit (debt-dashboard.js 424, receipt-ocr-review.js 401, shared.js 379, brands.js 371, admin-tenant-detail.js 361, receipt-ocr.js 358, receipt-form-items.js 357) → split on next touch
- **[M1-R12-02] Oversized storefront studio files** — 14 files in `modules/storefront/` exceed 350 lines (worst: storefront-translations.js 1264) → do not add to these files; split on next touch
- **[M1-R18-01] Rule 18: suppliers UNIQUE not tenant-scoped** — `suppliers_name_key` and `supplier_number_key` are global → migration to `UNIQUE (name, tenant_id)` required → `suppliers` table
- **[M1-R18-02] Rule 18: purchase_orders UNIQUE not tenant-scoped** — `po_number_key` is global, will collide across tenants → migration to `UNIQUE (po_number, tenant_id)` required → `purchase_orders` table
- **[M1-BACKUP-01] Nested backup folder blocks Sentinel** — `modules/Module 3 - Storefront/backups/2026-03-30_12-05_pre-phase4b/opticup-erp/` has paths >255 chars → delete folder
- **[M3-SAAS-01] Hardcoded tenant name in inventory HTML** — title tag and header logo show "אופטיקה פריזמה" → replace with `getTenantConfig('name')` → `inventory.html:12,277`
- **[M3-SAAS-04] Hardcoded Prizma UUID in sync-watcher** — tenant UUID as default/guard locks sync to one tenant → require env var → `scripts/sync-watcher.js:45,50`
- **[M3-SAAS-05] Hardcoded social links in shortcode presets** — Prizma's WhatsApp + Instagram in template HTML → use tenant config → `modules/storefront/studio-shortcodes.js:107,112`
- **[M8-XMOD-01] Cross-module: 4 direct table boundary violations** — access-sync, admin, brands, audit modules query tables they don't own (inventory_logs, purchase_orders, supplier_documents) → create contract functions → see M8 report
- **[M8-XMOD-05] No contract wrapper for inventory_logs** — 12+ files across 5 modules query audit table directly → create audit-queries.js with contract functions
- **[M1-R09-01] Hardcoded tenant slug in brand preview URL** — `?t=prizma` hardcoded in studio-brands.js:425 brand page link → replace with `?t=${TENANT_SLUG}` → `modules/storefront/studio-brands.js:425`
