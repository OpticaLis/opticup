# Site Overseer — SKILL knowledge map (v0.5)

> **Purpose:** Drop-in knowledge so future Site Overseer Mode B sessions can answer
> common questions about the Optic Up storefront without re-discovering structure
> each time. This file is loaded BEFORE running any Mode B audit.
>
> **Created:** 2026-05-08 during M3_WP_BLOG_POST_MAPPING execution.
> **Version:** 0.5 — added Lighthouse + axe-core nightly/weekly monitoring infra (M3_LIGHTHOUSE_NIGHTLY_CRON, 2026-05-10) closing REC-SITE-013. Section 5d details the tooling, paths, and trigger model.
> **Authority for canonical truth:** the live system (Supabase + Vercel + WP). When
> this file disagrees with the live system, the live system wins — and this file
> needs an update.

---

## 1. Tenants & business identity

- **Project canonical apex:** `prizma-optic.co.il` (legacy Hebrew "Prizma Optics").
- **Production tenant:** `prizma` (slug). Tenant ID: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`.
- **Test/QA tenant:** `demo` (slug). Tenant ID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`. PIN: `12345`.
- All multi-tenant tables filter on `tenant_id UUID NOT NULL REFERENCES tenants(id)` per Iron Rule 14.

## 2. Subdomain inventory (DNS + purpose)

| Subdomain | Status | Purpose | Hosting |
|---|---|---|---|
| `prizma-optic.co.il` (apex) | Live, active | 307 → `www.prizma-optic.co.il` | Vercel |
| `www.prizma-optic.co.il` | Live, **canonical** | New Astro storefront — public site | Vercel project `prj_HGz6OkwugkH6Nlw3FiomNPDp96QH` (team `daniels-projects-186cc357`) |
| `ru.prizma-optic.co.il` | Legacy WP, **redirect cleanup** | Russian-language WP install; per REC-SITE-015 + M3_WP_BLOG_POST_MAPPING, all 1,610 URLs 301 to www. counterparts | DreamVPS, cPanel `cp2.dreamvps.com:2083`, WP-Toolkit |
| `en.prizma-optic.co.il` | Legacy WP, **redirect cleanup** | English-language WP install; same status as ru. | Same DreamVPS infra |
| `app.opticalis.co.il` | Live | Internal ERP (separate repo `opticup`) — not in storefront scope | GitHub Pages |

**Mode A enumeration rule (L-SITE-001, 2026-05-08):** every Site Overseer scan MUST start with a DNS subdomain enumeration of the canonical apex BEFORE defining audit scope. Probe a deterministic list of common subdomains (`www`, `app`, `cp`, `cp2`, every two-letter ISO 639-1 lang code) and any sibling domains (`opticalis.co.il`, `prizma-optice.co.il` typo etc.). Anything that resolves and serves HTTP 200 is in scope.

## 3. Astro storefront — hosting & deploy chain

- **Repo:** `opticalis/opticup-storefront` (separate from ERP `opticalis/opticup`).
- **Hosting:** Vercel.
- **Deploy chain:** `develop` branch (active dev) → PR → `main` → Vercel auto-deploy. Local `npm run build` mirrors prod.
- **Environment variables:** Vercel project settings; never committed to git.
- **DNS authority:** Vercel manages `prizma-optic.co.il` and `www.prizma-optic.co.il`; DreamVPS still authoritative for `ru.` and `en.` subdomains until the Phase C decommission SPEC.

### Astro routing (verified empirically 2026-05-08, M3_WP_BLOG_POST_MAPPING)

| URL pattern | Status | Notes |
|---|---|---|
| `/` | 200, redirects to `/he/` (Hebrew default) | Astro homepage |
| `/{lang}/` | 200 | Lang root for `he`, `en`, `ru` |
| `/{lang}/{slug}/` | 200 (when slug exists in `blog_posts` or `storefront_pages`) | **Blog posts AND pages mounted directly under lang root, NOT under `/blog/`** |
| `/{lang}/blog/` | 200 | Blog INDEX (listing of posts) |
| `/{lang}/blog/{slug}/` | **404** for percent-encoded UTF-8; 200 for raw Cyrillic in some cases | Do NOT use this pattern as a redirect destination |
| `/{lang}/products/` | 200 | Product catalog index |
| `/{lang}/categories/` | 200 | Category index |
| `/{lang}/brands/` | 200 | Brand index |
| Hebrew slugs as paths (e.g. `/he/בלוג/`) | 200 if pre-encoded by browser, 500 if raw UTF-8 sent to apex (FIND-001 from M3_SITE_COMPREHENSIVE_REVIEW) | Vercel apex→www redirect mis-encodes UTF-8 path bytes |

## 4. Database — key tables

All under tenant_id-scoped RLS per Iron Rule 15. Live DB: `https://tsxrrxzmdxaenlvocyit.supabase.co`. Read-only access via Supabase MCP `execute_sql`.

| Table | Purpose | Key columns | Read by |
|---|---|---|---|
| `tenants` | Tenant master | `id`, `slug`, `name`, `business_phone`, `business_email`, `display_name`, etc. | All site reads via `v_public_tenant` |
| `storefront_config` | Per-tenant UI / SaaS config | `tenant_id`, `key`, `value` (JSON) | Storefront via `v_storefront_config`. Common keys: `phone_general`, `phone_catalog`, `support_phone_display`, `whatsapp_phone_e164`, `business_phone`, `business_email`, `business_address`, `business_hours_*`, `social_*` |
| `storefront_pages` | CMS-driven static pages | `tenant_id`, `lang`, `slug`, `title`, `blocks` (JSON), `status` | Astro page render via `v_storefront_pages`. Slugs include native-language paths like `/about/`, `/multifocal-guide/`, `/צרו-קשר/` |
| `blog_posts` | Blog post content | `tenant_id`, `lang`, `slug`, `title`, `body` (rich) | Astro `/{lang}/blog/` index + `/{lang}/{slug}/` per-post pages. **Counts as of 2026-05-08:** he=59, en=58, ru=58. |
| `tenant_branches` | Per-branch storefront data (M3_BRANCHES_INFRA_AND_ASHKELON, 2026-05-09) | `tenant_id`, `slug`, localized `name/street/city/region/intro` (he/en/ru), `phone`, `whatsapp_e164`, `latitude`, `longitude`, `hours` (jsonb array of `{day,opens,closes}`), `gallery` (jsonb array of proxy URLs), `google_business_url`, `waze_url`, `status`. CHECK: `hours`/`gallery` must be jsonb arrays. UNIQUE `(tenant_id, slug)`. Canonical 2-policy RLS. | Storefront `/branches/` index + `/branches/{slug}/` detail pages × 3 langs. Schema.org OpticalStore JSON-LD per branch. **Counts as of 2026-05-09:** prizma has 1 branch (`ashkelon`). |
| `pending_sales` | Lead/conversion intake | (not storefront read; ERP write) | Used as canonical RLS reference (canonical RLS-with-JWT-claims pattern, see CLAUDE.md §5 Rule 15) |

## 5. Database — key views (storefront-readable)

Views are the public-read surface for the storefront. **Iron Rule 13: Storefront and Supplier Portal read ONLY from Views + RPC; never direct table access.** Views' WHERE clauses must not be modified without explicit approval (Rule 29 storefront-side).

| View | Exposes | Filtering |
|---|---|---|
| `v_public_tenant` | Tenant info safe for public read | `WHERE tenants.is_public=true` |
| `v_storefront_config` | UI config keys | `WHERE storefront_config.tenant_id=current_tenant` (via JWT claim) |
| `v_storefront_pages` | Published CMS pages | `WHERE status='published'` |
| `v_storefront_blog_posts` | Published blog posts | `WHERE status='published'` |
| `v_storefront_branches` | Published, non-deleted branches per tenant (M3_BRANCHES_INFRA_AND_ASHKELON) | `WHERE status='published' AND is_deleted=false`, ORDER BY display_order. anon GRANT. |
| `v_storefront_categories` | Active product categories | `WHERE is_active=true` |
| `v_storefront_brands` | Active brands | similar |

## 5b. Pre-write checklist for jsonb columns (added v0.3)

**Before any SPEC touches a `jsonb` column whose schema requires array/object** (e.g. `storefront_pages.blocks`, `storefront_pages.previous_blocks`, future block-typed columns):

1. **Run `jsonb_typeof()` on a representative row** to confirm runtime type matches expectation:
   ```sql
   SELECT jsonb_typeof(target_col), COUNT(*) FROM target_table GROUP BY 1;
   ```
2. **Mutate via parse-then-modify**, never via text replace:
   ```js
   // GOOD — driver re-serializes the array correctly
   const arr = row.blocks;                    // already an Array (jsonb auto-parsed)
   arr.forEach(b => b.data.body = b.data.body.replace(...));
   await sb.from('t').update({ blocks: arr });

   // BAD — produces a top-level JSON string, fails Array.isArray() at the renderer
   const newText = JSON.stringify(row.blocks).replace(...);
   await sb.from('t').update({ blocks: newText });
   ```
3. **Verify the post-state runtime type after the UPDATE**:
   ```sql
   SELECT jsonb_typeof(target_col) FROM target_table WHERE id = $1;
   -- expected: 'array' (or whatever the schema requires)
   ```

The CHECK constraint on `storefront_pages.blocks` (and `.previous_blocks`) added 2026-05-08 enforces this at the DB layer — but other jsonb columns in the schema do NOT yet have analogous constraints. If you find one whose application code assumes a runtime shape, propose a constraint as a follow-up SPEC.

## 5c. Production Incident Pattern Library (added v0.3)

### Case Study #1 — 2026-05-08, M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL

**Symptoms:** 16 customer-facing pages (`/terms/` he, `/privacy/` ×3 langs, `/deal/` ×3, `/צרו-קשר/` ×3, `/שאלות-ותשובות/` ×3, `/accessibility/` ×3) returned HTTP 200 with empty body for ~24 hours. Affected: legal pages, contact, FAQ, accessibility statement — all critical compliance pages.

**Root cause:** Earlier SPEC `M3_PHONE_TEMPLATING_AND_CLEANUP` (2026-05-07) modified `storefront_pages.blocks` jsonb content via string `.replace()` and saved the result. Postgres accepted the write because jsonb accepts any JSON value, including top-level strings. The Astro renderer's `Array.isArray()` returned false → empty render. (Plus 3 older `/accessibility/` rows broken on 2026-05-01 via a manual site-overseer session that hit the same anti-pattern.)

**Detection signal:** Daniel noticed `/terms/` returned no body. Queries on `jsonb_typeof(blocks)` revealed 16 rows where the type was 'string' instead of 'array'.

**Recovery:** Two-pass unwrap (`(blocks #>> '{}')::jsonb`) for 15 single-encoded rows; three-pass unwrap (`((blocks #>> '{}')::jsonb #>> '{}')::jsonb`) for `/terms/ he` which was double-encoded. All 16 recovered to non-empty arrays — zero data loss.

**Permanent fix:** Two CHECK constraints `storefront_pages_blocks_must_be_array` and `storefront_pages_previous_blocks_must_be_array` enforce `jsonb_typeof IN ('array', null)`. Future bad writes fail with SQLSTATE 23514 at the DB layer.

**Sentinel signature for future detection:** if any `storefront_pages` row has `jsonb_typeof(blocks) <> 'array' AND blocks IS NOT NULL`, that's the same incident. The constraint should now make this impossible — but if it ever returns, the constraint has been dropped or bypassed.

**LEARNINGS:** L-PROJECT-002 codifies the rule project-wide; this skill file's §5b is the operational checklist.

## 5d. Lighthouse + axe-core monitoring (added v0.5, REC-SITE-013 closed)

**SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/`

**What runs:**
- `lighthouse-daily.yml` — GitHub Actions cron at 03:00 IDT (00:00 UTC) every day. Tier 1 sweep: 10 base routes × 3 langs = 30 URLs. ~6-15 min.
- `lighthouse-weekly.yml` — cron at 03:00 IDT every Sunday. Full sitemap sweep: ~255 URLs. Up to ~2 hr.
- Both also support `workflow_dispatch` for manual UI triggering.

**What gets written (auto-committed by `OpticaLis [bot]` to develop):**
- `docs/guardian/lighthouse-reports/{daily,weekly}/{date}/` — per-URL JSON + SUMMARY.md table.
- `docs/guardian/GUARDIAN_ALERTS.md` — appended ALL CLEAR / REGRESSION sections below the `LIGHTHOUSE-CRON-APPEND-MARKER`.

**Tooling location:**
- `roles/site-overseer/tools/lighthouse/` — local-install; not root npm. ~222 MB node_modules (gitignored).
- `package.json` declares `lighthouse@^12`, `chrome-launcher@^1`, `@axe-core/cli@^4`. Node ≥ 18 required.
- 6 scripts: `_lib.mjs` (shared helpers), `run-tier1.mjs`, `run-full.mjs`, `detect-regressions.mjs`, `write-summary.mjs`, `append-alert.mjs`.

**Regression rules (`config/thresholds.json`):**
- perf: -5 pts day-over-day OR < 80 absolute → REGRESSION.
- a11y: -3 pts day-over-day → REGRESSION.
- seo / best-practices: -5 pts → REGRESSION.
- axe-violation count: any increase → REGRESSION.

**Manual run (local):** `cd roles/site-overseer/tools/lighthouse && npm ci && npm run tier1` (or `npm run full`).

**Manual run (CI):** GitHub UI → Actions → "lighthouse-daily" → Run workflow → Branch: develop. (Or `gh workflow run lighthouse-daily.yml --ref develop` if gh authenticated.)

**Coexistence with Sentinel (M3-INFRA-04 caveat):** GUARDIAN_ALERTS.md has two writers — Sentinel rewrites locally, cron appends in CI. The `LIGHTHOUSE-CRON-APPEND-MARKER` line keeps cron entries below it stable across Sentinel local regenerations. Don't delete the marker.

**Baseline as of 2026-05-10 (first run):** avg perf 87, avg a11y 95, avg seo 100, avg best-practices ~97. 6 of 30 Tier 1 URLs SKIP_404 (categories/sunglasses + categories/eyeglasses × 3 langs — see M3-DATA-03 finding).

## 6. WordPress legacy — cPanel + REST API

### Access points
- **cPanel:** `https://cp2.dreamvps.com:2083/cpsess<token>/frontend/jupiter/wp-toolkit/`
- **WP-Admin per subdomain:** `https://{ru|en}.prizma-optic.co.il/wp-admin/`
- **Application Password auth:** `daniel` user, password rotated per session. **NEVER commit credentials to git** (Iron Rule 23). Active credentials live transient in the dispatcher's prompt; rotate after each Site Overseer session that touches WP.

### REST API endpoints (Application Password auth)

| Endpoint | Verb | Purpose |
|---|---|---|
| `/wp-json/wp/v2/users/me` | GET | Sanity / auth verification |
| `/wp-json/wp/v2/posts?per_page=100&_fields=...` | GET | List posts. Default returns only `status=publish`; pass `status=any` for drafts (admin only) |
| `/wp-json/wp/v2/pages` | GET | List pages |
| `/wp-json/wp/v2/plugins` | GET | List installed plugins |
| `/wp-json/redirection/v1/redirect?per_page=5&filterBy[target]=/blog/` | GET | List redirects (filter by target/url) |
| `/wp-json/redirection/v1/redirect?per_page=5&filterBy[url]=<path>` | GET | Find a specific redirect by source URL |
| `/wp-json/redirection/v1/bulk/redirect/delete` | POST | Bulk delete; body `{"items":[id,...],"bulk":"delete"}` |
| `/wp-json/redirection/v1/import/file/{group_id}` | POST | Multipart CSV upload; group_id=1 default. Returns `{"imported":N}` |

### Redirection-plugin import flow (verified 2026-05-08)
1. Plugin install via Plugin REST API or WP-Admin → setup wizard (one-click human step) → group_id=1 default.
2. `POST /wp-json/redirection/v1/import/file/1` with multipart CSV (`file=@path/to.csv`).
3. **WARNING:** importer treats the CSV header row as a literal redirect (creates `/source_url → target_url`). Always run a cleanup pass: `DELETE WHERE url='/source_url'` after each import. (M3-INFRA-03.)
4. Verify with `GET /wp-json/redirection/v1/redirect?per_page=5` → `total` field.
5. Spot-check 5 random sources with `curl -sI` for 301 chain.

### Per-page param constraints
- `per_page` must be in `[5, 200]` (rejects 1, rejects 1000).
- `filterBy[target]=/blog/` matches all redirects whose target URL CONTAINS `/blog/` (suffix match in the plugin).

## 7. WordPress legacy — content state

Source-of-truth: per-subdomain sitemap_index.xml + REST API.

### `ru.prizma-optic.co.il`
- 9 child sitemaps: post (43 sitemap / 42 REST), page (23), product (771), category (4), post_tag (32), product_brand (56), product_cat (5), product_tag (675), author (1).
- Total redirects loaded: **1,610** (REC-SITE-015 + M3_WP_BLOG_POST_MAPPING).
- Post-tier: now 42 specific blog post redirects (8 LOW-confidence flagged in M3_WP_BLOG_POST_MAPPING CRAWL_LOG_BLOG.md §7).
- 1 orphan blog landing page (`/блог/`) maps to `/ru/blog/` index.

### `en.prizma-optic.co.il`
- Same 9-sitemap structure.
- Posts: 44 sitemap / 43 REST.
- Total redirects loaded: **1,610** (this SPEC's import).
- Post-tier: 43 specific blog post redirects (1 LOW-confidence flagged).

## 8. Frequently asked questions

| Q | A | Where to look |
|---|---|---|
| What's the prizma tenant_id? | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | §1 of this doc |
| Where do I see all blog posts? | Supabase `blog_posts` (read via `v_storefront_blog_posts`) | §4 |
| What's the canonical URL pattern for a blog post? | `/{lang}/{slug}/` (NOT `/{lang}/blog/{slug}/`) | §3 routing table |
| How do I find a redirect on ru.? | `GET /wp-json/redirection/v1/redirect?filterBy[url]=<source-path>` | §6 |
| Where are setup credentials? | Transient in dispatcher prompt; rotate every session per Rule 23 | §6 access points |
| What WP posts are NOT in REST? | Drafts, scheduled, password-protected — REST excludes by default. Sitemap includes. | §7 ru. line "43 sitemap / 42 REST" |
| Why does header row become a junk redirect? | Plugin importer doesn't skip CSV header — known plugin bug, M3-INFRA-03 | §6 import flow step 3 |
| What's the correct destination for a WP product URL? | `/{lang}/products/` (catalog index — Daniel's explicit decision 2026-05-08, no per-product mapping) | §7 + REC-SITE-015 SPEC §4-B rule 3 |
| Why does Vercel 500 on raw-UTF-8 Hebrew URLs? | Apex→www redirect mis-encodes UTF-8 as Latin-1 (FIND-001 in M3_SITE_COMPREHENSIVE_REVIEW) | §3 routing table |
| What gets read at build vs runtime? | Most tenant fields are runtime DB reads (verified 2026-05-06 with `business_phone` UPDATE → live without redeploy). Exhaustive map TBD. | SITE_OVERSEER_HANDOFF.md "Live-vs-build-time field map" |

## 9. Source-of-truth files for this knowledge

| File | What lives there |
|---|---|
| `CLAUDE.md` | Iron Rules 1-23 (ERP) + cross-ref to 24-30 (storefront). The constitution. |
| `docs/GLOBAL_MAP.md` | Project-wide function registry, contracts, module ownership |
| `docs/GLOBAL_SCHEMA.sql` | Authoritative DB schema |
| `docs/DB_TABLES_REFERENCE.md` | Quick lookup: T-constant → table → key columns |
| `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` | Current Module 3 phase status (ERP-side authoritative for Module 3) |
| `roles/site-overseer/` | Site Overseer's own state: SITE_MAP.md (live structure), HANDOFF.md (current task), DECISIONS_LOG.md (Daniel approvals), LEARNINGS.md (methodology rules), this file (knowledge map) |
| `modules/Module 3 - Storefront/docs/specs/{SPEC_SLUG}/` | Per-SPEC plan + execution + retrospective (folder-per-SPEC since 2026-04-14) |

## 10. Where this knowledge map should grow next

- ~~**Lighthouse / a11y baselines** (pending REC-SITE-013 tooling install)~~ — DONE (v0.5, see §5d).
- **Live-vs-build field map** — exhaustive list of which `tenants.*` and `storefront_config.*` fields require redeploy vs are DB-live.
- **CMS block schema** — `storefront_pages.blocks` JSON taxonomy (rich-text, hero, gallery, etc.).
- **Edge Function inventory** — list and purpose of `supabase/functions/*` that the storefront calls.
- **Tracker config** — GA4, GTM, Meta Pixel — which tenants enable which.
- **Sentinel vs Cron coexistence formalization** — M3-INFRA-04 follow-up: either teach Sentinel to respect the LIGHTHOUSE-CRON-APPEND-MARKER, or split the alerts file into two (Sentinel local-only, Cron committed).

When any future Mode B SPEC surfaces a piece of structural knowledge that "should have been here," add it. The cost of re-discovery has dropped from ~20 min/session to <2 min lookup, and the marginal cost of adding a new section is ~5 min — keep that ratio favorable.

---

*End of SITE_OVERSEER_SKILL.md v0.5.*
