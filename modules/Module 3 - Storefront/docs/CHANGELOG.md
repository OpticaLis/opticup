# Module 3 — Storefront — Changelog

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
