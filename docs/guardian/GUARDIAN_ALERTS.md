# Sentinel Alerts
**Last updated:** 2026-04-14 10:15 (Pre-Launch Hardening SPEC execution)
**Status:** ⚠️ 8 ACTIVE ALERTS (7 resolved by Pre-Launch Hardening SPEC 2026-04-14)

> This file is checked by the working chat before every commit.
> If alerts appear here — stop and notify Daniel before proceeding.

## CRITICAL
*(none)*

## HIGH

- **[M6-AUTH-01] Leaked-password protection disabled** — Supabase Auth HaveIBeenPwned check is OFF; users can set known-breached passwords → enable toggle in Auth settings (no code change) → Supabase Auth dashboard
- **[M1-R12-01] Oversized non-storefront files** — 7 files exceed 350-line limit (debt-dashboard.js 424, receipt-ocr-review.js 401, shared.js 379, brands.js 371, admin-tenant-detail.js 361, receipt-ocr.js 358, receipt-form-items.js 357) → split on next touch
- **[M1-R12-02] Oversized storefront studio files** — 14 files in `modules/storefront/` exceed 350 lines (worst: storefront-translations.js 1264) → do not add to these files; split on next touch
- **[M1-R18-01] Rule 18: suppliers UNIQUE not tenant-scoped** — `suppliers_name_key` and `supplier_number_key` are global → migration to `UNIQUE (name, tenant_id)` required → `suppliers` table
- **[M1-R18-02] Rule 18: purchase_orders UNIQUE not tenant-scoped** — `po_number_key` is global, will collide across tenants → migration to `UNIQUE (po_number, tenant_id)` required → `purchase_orders` table
- **[M8-XMOD-01] Cross-module: 4 direct table boundary violations** — access-sync, admin, brands, audit modules query tables they don't own (inventory_logs, purchase_orders, supplier_documents) → create contract functions → see M8 report
- **[M8-XMOD-05] No contract wrapper for inventory_logs** — 12+ files across 5 modules query audit table directly → create audit-queries.js with contract functions
- **[M4-DOC-04] Rule / Authority Matrix: MODULE_MAP.md documents old sessionStorage key post-B6** — M1 MODULE_MAP.md:239 says `getTenantId()` reads `'prizma_tenant_id'`; B6 (commit `7e99030`) renamed it to `'tenant_id'` → surgical edit + sweep `docs/` & `modules/**/docs/` for any other `prizma_` storage-key references → `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md:239`

## Resolved in this run

- **[M6-RLS-01] RESOLVED** — storefront_components RLS rewritten to JWT-claim tenant_isolation pattern. Commit `66acfc7`. Verified: `pg_policies` shows 3 policies (service_all, anon_read, tenant_isolation), ZERO authenticated policies. Cross-tenant smoke: `COUNT(*)=0` with nonexistent tenant UUID.
- **[M6-RLS-02] RESOLVED** — storefront_pages RLS rewritten to JWT-claim tenant_isolation pattern. Commit `66acfc7`. Same verification as M6-RLS-01.
- **[M6-RLS-03] RESOLVED** — storefront_reviews RLS rewritten to JWT-claim tenant_isolation pattern. Commit `66acfc7`. Same verification as M6-RLS-01.
- **[M3-SAAS-01] RESOLVED — alert partially stale** — `grep -nE "אופטיקה פריזמה|Prizma|prizma" inventory.html` returned 1 hit at line 2 (HTML file-header comment, not in rendered code). `<title>` at line 11 was already generic. Comment updated in commit `e04cbfe`. Alert cited lines 12/277 which were clean.
- **[M3-SAAS-04] RESOLVED** — Part A: removed silent Prizma UUID fallback, OPTICUP_TENANT_ID now required (commit `461a3c0`). Part B: added `tenants.access_sync_enabled` boolean column (migration `064`, Prizma=true, all others=false), replaced UUID gate with async DB lookup (commit `97146ce`). Verified: column shape correct, prizma=true, all others=false, node --check pass, 0 UUID hits.
- **[M3-SAAS-05] RESOLVED for BUILTIN_STICKY_PRESETS** — `buildBuiltinStickyPresets(waNumber, igUrl)` now reads `storefront_config.whatsapp_number` + `footer_config.social[instagram].url` via `loadShortcodePresets()`. Commit `43479ca`. NOTE: `BUILTIN_CTA_PRESETS` lines 68-69 retain `optic_prizma` hardcoding (out of this SPEC's scope — noted for next work package as M3-SAAS-05b).
- **[M1-R09-01] RESOLVED** — `?t=prizma` replaced with `?t=${encodeURIComponent(TENANT_SLUG || '')}` in studio-brands.js:425. Commit `d33a8a1`. Verified: `grep -nE "[?&]t=prizma"` → 0 hits, node --check pass.

## Informational (MEDIUM, not blockers)
- M3-SAAS-09: 3 migration scripts hardcode Prizma tenant UUID → parameterize via env var.
- M3-SAAS-10: `studio-editor.js:326` fallback `TENANT_SLUG || 'prizma'` — silent cross-tenant leak risk → drop fallback.
- M3-SAAS-11: Three files fall back to literal "אופטיקה פריזמה" when `getTenantConfig('name')` is missing (studio-brands.js:269, storefront-translations.js:571, brand-translations.js:400).
- M3-SAAS-05b: `BUILTIN_CTA_PRESETS` lines 68-69 in studio-shortcodes.js retain `optic_prizma` hardcoding — fix in next work package.
- M5-DEBT-05: `scripts/sync-watcher.js` now 516 lines (over 350 limit; pre-existing debt, delta +27 from this SPEC's main() wrapper — split on next touch).
