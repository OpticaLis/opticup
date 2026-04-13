# Module 3 — Storefront — Changelog

## Phase B — SaaS Hardening ✅

**Status:** ✅ Complete on develop
**Date:** 2026-04-13

### Summary
Canonical RLS pattern (JWT-claim based) rolled out across all multi-tenant tables, audit tooling built, and `prizma_*` sessionStorage keys renamed to generic `tenant_*` to remove tenant-specific strings from ERP code.

### B Core — RLS Canonical Pattern
- §1.0: created `optic_readonly` DB role for audit scripts (4 infra tests passed)
- §1.1: fixed 11 tables to canonical `tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid` pattern with two-policy model (service_bypass + tenant_isolation)
  - Tables: customers, prescriptions, sales, work_orders, brand_content_log, storefront_component_presets, storefront_page_tags, media_library, supplier_balance_adjustments, campaigns, campaign_templates
- §1.3–§1.6: RLS audit script, TIER-C cleanup, run-audit harness
- B1–B8 items closed, Manual Action #2 executed

### B6 — sessionStorage Key Rename
- **Commit:** `7e99030` — `refactor(auth): rename prizma_* sessionStorage keys to tenant_* across entire ERP (B6)`
- 22 files changed, 44 insertions(+), 44 deletions(-)
- Key mapping: `prizma_auth_token → tenant_auth_token`, `prizma_employee → tenant_employee`, `prizma_permissions → tenant_permissions`, `prizma_role → tenant_role`, `prizma_user → tenant_user`, `prizma_branch → tenant_branch`, `prizma_login_locked → tenant_login_locked`, `prizma_admin → tenant_admin`
- Source of truth: `js/auth-service.js` SK constants
- Sanity Check §5.1–§5.8 PASS on demo tenant (slug=demo, PIN 12345)
- Chrome MCP verification: login, module navigation, logout, re-login — zero console errors, all prizma_* keys return null
- Daniel visual verification: PASS

### Spec Files
- `docs/MODULE_3_B_SPEC_saas_core_2026-04-12.md` (1713 lines)
- `docs/MODULE_3_B_SPEC_saas_session_keys_2026-04-12.md`

### Pending
- §4.3 Prizma tenant safety check — deferred until Module 3 fully complete and ready for main merge

---

## Phase 0 — SEO Site Audit & URL Mapping

**Status:** ✅ Complete
**Date:** 2026-03-29

### Summary
Scanned all 3 WordPress domains (HE/EN/RU) via WP REST API + WooCommerce REST API. Produced a complete URL inventory of 1024 URLs across all languages.

### Crawl Results
- **Hebrew:** 58 posts, 84 pages, 735 WC products, 12 WC categories, 1175 WC tags, 8 WC attributes
- **English:** 43 posts, 25 pages
- **Russian:** 42 posts, 25 pages
- **SEO Plugin:** Yoast SEO (detected on Hebrew site)

### Output Files
- `seo-audit/url-inventory.json` — structured inventory (1024 URLs)
- `seo-audit/url-inventory.md` — human-readable report (316 lines)
- `seo-audit/url-mapping-template.csv` — mapping template for migration (1024 rows, UTF-8 BOM)

### Commits
- `70c73f2` — Step 1: Setup folders, .gitignore, dependencies, SESSION_CONTEXT
- `4a2a0bc` — Steps 2-3: helpers.mjs + crawl-wp-api.mjs
- `fb6ad27` — Steps 7+9: generate-report.mjs + MODULE_MAP + CHANGELOG
- `a3b2b08` — Steps 4-6: API connectivity verified + full crawl HE/EN/RU

### Technical Notes
- WP Basic Auth returns 401 on Hebrew site — public endpoint fallback works fine
- WC API uses query-string auth (consumer_key/secret) — works correctly
- Rate limiting: 500ms between requests
- All API calls are GET only (read-only audit)

### Files Created
| File | Lines | Description |
|------|-------|-------------|
| `seo-audit/scripts/helpers.mjs` | 213 | Config, HTTP helpers, pagination, SEO extraction |
| `seo-audit/scripts/crawl-wp-api.mjs` | 233 | CLI crawler for WP + WC REST APIs |
| `seo-audit/scripts/generate-report.mjs` | 230 | Report generator (JSON, MD, CSV) |
| `seo-audit/scripts/package.json` | 16 | Node.js project (dotenv, node-fetch) |
