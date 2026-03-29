# Module 3 — Storefront — Changelog

## Phase 0 — SEO Site Audit & URL Mapping

**Status:** 🔄 In Progress
**Started:** 2026-03-29

### Commits
- `70c73f2` — M3 Phase 0 Step 1: Setup folders, .gitignore, dependencies, SESSION_CONTEXT
- `4a2a0bc` — M3 Phase 0 Steps 2-3: helpers.mjs + crawl-wp-api.mjs (checkpoint)

### Changes
- Created `seo-audit/scripts/helpers.mjs` — API helpers, pagination, SEO extraction
- Created `seo-audit/scripts/crawl-wp-api.mjs` — WP + WC REST API crawler
- Created `seo-audit/scripts/generate-report.mjs` — Report generator (JSON, MD, CSV)
- Created `seo-audit/scripts/package.json` — Node.js project with dotenv + node-fetch
- Updated `.gitignore` — added .env patterns
- Created `docs/SESSION_CONTEXT.md`, `docs/MODULE_MAP.md`, `docs/CHANGELOG.md`

### Blocked
- Steps 4-6 (API crawl) — waiting for Daniel to fill `.env` credentials
- Steps 8-9 — depend on crawl data
