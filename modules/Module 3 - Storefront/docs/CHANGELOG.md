# Module 3 — Storefront — Changelog

---

## Pre-Merge SEO Overnight QA SPEC
**Status:** ✅ Audit-only; no code changes
**Date:** 2026-04-15

### Changes

| Scope | Description |
|-------|-------------|
| `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/` | Full overnight SEO audit vs GSC ground truth — 10 Node scripts + 12 JSON/CSV artifacts + `SEO_QA_REPORT.md` (38.5 KB) + `EXECUTION_REPORT.md` + `FINDINGS.md` (14 findings) |

### Key Metrics

- GSC URLs audited: **1000** (OK_200=96, OK_301_REDIRECT=863, MISSING=41)
- MISSING URLs with ≥10 clicks: **0** (all 41 MISSING combined carry 4 clicks)
- GSC queries analyzed: **1000** (954 landing-matched, 195 HIGH/MEDIUM term appearance)
- Sitemap `<loc>` entries: **245** / broken: **58** (all `/בלוג/*` Hebrew-slug leftovers from pre-transliteration WP)
- Top-100 on-page: canonical_ok **97**, hreflang≥3 **100**, jsonld **92**, og_complete **27**, noindex **0**
- Internal links checked: **758** / broken: **0**
- Lighthouse (top-20, mobile, dev): Perf 59.5 / A11y 94.5 / BP 81.1 / SEO 91.7
- **DNS verdict: GREEN** — audit is not a launch blocker

---

## Blog Pre-Merge Fixes SPEC
**Status:** ✅ All commits on develop
**Date:** 2026-04-15
**Commits:** `678a82e`, `4738191`, `dd0fe6f`

### Changes

| Commit | Scope | Description |
|--------|-------|-------------|
| `678a82e` | scripts | Add WP image migration scripts 01-06 + README under `scripts/blog-migration/` |
| `4738191` | media-library | Migrate 19 WP images to Supabase Storage `media-library/blog`; insert 19 `media_library` rows; catalog 4 confirmed-404 images |
| `dd0fe6f` | blog_posts DB | Rewrite 132 posts' WP img URLs to `/api/image/media/` proxy; strip 4 broken img tags + WP `<a href>` links (two-pass regex); soft-delete grammar article en+ru; transliterate 58 Hebrew slugs (19 en→ASCII, 39 ru→Cyrillic) |

### Key Metrics
- WP image URLs in published content: **0** (was 23 URLs across posts)
- media_library blog rows: **19** (19 uploaded, 4 confirmed 404 stripped)
- Hebrew slugs on active en/ru posts: **0** (was 58)
- Grammar article: en=soft-deleted, ru=soft-deleted, he=preserved ✓
- Duplicate slugs: **0**
- WP `<a href>` links remaining: **0**

### Deviations
- Hebrew slug count: SPEC expected 41 (from audit sample); actual was 60 non-deleted → 58 updated (2 grammar excluded post-soft-delete). Criteria verified ✓
- Commits 3+4+5 combined into one (all DB-only operations)
- Hardcoded tenant scope: SPEC expected 7 posts; actual 82 (Instagram href) — flagged in FINDINGS_TENANT.md, not fixed (deferred to BLOG_INSTAGRAM_TEMPLATIZE SPEC)

### UNVERIFIED Criteria (require localhost:4321)
- C14: Browser spot-check of blog post pages
- C15: Storefront build passes
- C16: Blog pages return 200

### Reference
- Full retrospective: `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/`

---

## Tenant Feature Gating & Cleanup SPEC (Track 2)
**Status:** ✅ All commits on develop
**Date:** 2026-04-15
**Commits:** `ea08602`, `44a7625`, `f28db3c`, `8b960fe`

### Changes

| Commit | Scope | Description |
|--------|-------|-------------|
| `ea08602` | plans/migrations | migration 067: add cms_studio/cms_custom_blocks/cms_landing_pages/cms_ai_tools keys to basic/premium/enterprise plans |
| `44a7625` | shared/plan-helpers | Added `renderFeatureLockedState(featureName)` helper; updated GLOBAL_MAP.md |
| `f28db3c` | storefront-*.html | Gate 8 storefront HTML pages via isFeatureEnabled; plan-helpers.js script tag added to each |
| `8b960fe` | cleanup | Archive + git-remove old prompts/ and mar30-phase-specs/ from Module 3 docs |

### Feature Key Mapping
- `storefront-settings.html` → `storefront`
- `storefront-products.html` → `storefront`
- `storefront-brands.html` → `cms_studio`
- `storefront-studio.html` → `cms_studio`
- `storefront-blog.html` → `cms_studio`
- `storefront-content.html` → `cms_ai_tools`
- `storefront-glossary.html` → `cms_ai_tools`
- `storefront-landing-content.html` → `cms_landing_pages`

### Blocked Criteria (environment)
- Criterion #15 (stale M3 backup purge): FUSE mount prevents `git rm --cached` from persisting; Daniel to run from local machine
- Criterion #16, #21 (storefront repo unused components + build): storefront repo not mounted in this session

### Reference
- Plans feature reference: `modules/Module 1.5 - Shared Components/docs/plans-features-reference.md`

---

## Close-Out SPEC — Module 3 Code-Complete
**Status:** ✅ All commits on develop
**Date:** 2026-04-15
**Commits:** `a115b5a`, `5de07d6`, `5a0a561`, `67468ed`, `6ce4b67`, `b55de5a`, `ba81a3b`

### Changes

| Commit | Scope | Description |
|--------|-------|-------------|
| `a115b5a` | studio-shortcodes | M3-SAAS-05b: Instagram preset href reads from tenant config at runtime |
| `5de07d6` | studio-editor | M3-SAAS-10: remove `prizma` TENANT_SLUG fallback in openPreview(), early-exit with console.warn |
| `5a0a561` | translations | M3-SAAS-11: replace hardcoded Hebrew store name with `getTenantConfig('name') \|\| ''` in 3 files |
| `67468ed` | storefront-blog | M3-SAAS-12: blog SEO preview domain reads `getTenantConfig('custom_domain') \|\| 'domain.co.il'` |
| `6ce4b67` | inventory-html | M1-SAAS-01: inventory.html title + logo dynamic from `tenant_name_cache` sessionStorage |
| `b55de5a` | migration | WP parity: migrations 065 (קופח-כללית) + 066 (vintage-frames) inserted via Supabase MCP |
| `ba81a3b` | guardian | Moved M3-SAAS-05b/10/11/12 + M1-SAAS-01 to Resolved in GUARDIAN_ALERTS.md |

### Edge Function (not a git commit — deployed via Supabase MCP)
- `translate-content` v2: added `stripWrappers()`, extended FORBIDDEN_PATTERNS, deployed 2026-04-15

### QA Note
- All 18 ROADMAP QA steps deferred to Daniel on localhost (BLOCKED: ENVIRONMENT — Cowork cloud session cannot reach localhost:4321 or localhost:3000)
- Criterion #11 (Contact 500 curl) — deferred to Daniel's morning QA by SPEC design
- QA runbook: `docs/QA_HANDOFF_2026-04-14.md`

---

## SuperSale campaign_cards fixes [Fix 1+2]
**Status:** Fix 1+2 complete on develop | Fix 3 pending
**Date:** 2026-04-14
**Commit:** f89babd (opticup-storefront, branch: develop)

### Changes
- **Fix 1:** CTA button hidden when cta_text is empty string - replaced falsy || fallback with explicit null/empty check in CampaignCardsBlock.astro
- **Fix 2:** Removed disclaimerText prop from CampaignCard per-card iteration - disclaimer no longer appears inside every card
- **Fix 3 (pending):** Disclaimer once at bottom of block - deferred to next session

### QA
- CTA buttons: 0 visible (verified via DOM)
- Disclaimer inside cards: removed (verified via DOM)
- Images: loading correctly after SUPABASE_SERVICE_ROLE_KEY added to .env
- No regressions on other blocks

### Pending before merge to main
- Fix 3: disclaimer once at bottom of campaign_cards block
- og:image missing on supersale page (MEDIUM)

---
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
