# SPEC — DNS_SWITCH_READINESS_QA

> **Location:** `modules/Module 3 - Storefront/docs/specs/DNS_SWITCH_READINESS_QA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-16
> **Module:** 3 — Storefront
> **Phase:** Pre-DNS-Switch Final QA
> **Author signature:** Cowork session cool-jolly-franklin

---

## 1. Goal

Execute a comprehensive, multi-agent overnight QA audit of the entire Optic Up
storefront (all pages, all languages, all blocks, all API routes, all Views) AND
the ERP-side Studio management interface, producing a single definitive
DNS_SWITCH_READINESS_REPORT.md that tells Daniel exactly whether the site is
ready for the `prizma-optic.co.il` DNS switch — and if not, exactly what remains.

---

## 2. Background & Motivation

The storefront has been in active development through Module 3 Phases A–B. The
homepage luxury redesign, blog system, brand pages, CMS block engine, shortcode
system, multi-language support, and SEO infrastructure are all built and deployed
on Vercel at `opticup-storefront.vercel.app`. Daniel wants to switch DNS for
`prizma-optic.co.il` from the legacy WordPress site to this Vercel deployment.

Before doing so, we need a zero-gaps QA pass that:
- Visits every page in every language and verifies rendering
- Validates all block types render correctly
- Confirms all API routes respond correctly
- Verifies all Supabase Views return expected data
- Audits the ERP Studio admin interface for completeness
- Has dedicated EN and RU language specialists verify content reads as native-quality

Previous SPECs focused on specific areas (SEO, homepage, blog). This is the
first holistic DNS-switch readiness audit.

Depends on: STOREFRONT_S2S3_QA (CLOSED), HOMEPAGE_LUXURY_REVISIONS_R2 (CLOSED),
recent youtube-nocookie→youtube.com fixes (committed 2026-04-16).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected Value | Verify Command |
|---|-----------|---------------|----------------|
| SC-1 | Report file exists | 1 file | `ls modules/Module\ 3\ -\ Storefront/docs/specs/DNS_SWITCH_READINESS_QA/DNS_SWITCH_READINESS_REPORT.md` → exit 0 |
| SC-2 | Report covers all active page/lang combos | Every active (non-deleted) page/lang row in `storefront_pages` for tenant Prizma has an entry | Count in report ≥ 57 page/lang entries |
| SC-3 | EN Language Quality Report exists | 1 file | `ls .../DNS_SWITCH_READINESS_QA/LANG_QUALITY_EN.md` → exit 0 |
| SC-4 | RU Language Quality Report exists | 1 file | `ls .../DNS_SWITCH_READINESS_QA/LANG_QUALITY_RU.md` → exit 0 |
| SC-5 | ERP Studio Audit Report exists | 1 file | `ls .../DNS_SWITCH_READINESS_QA/ERP_STUDIO_AUDIT.md` → exit 0 |
| SC-6 | View Contracts Audit exists | 1 file | `ls .../DNS_SWITCH_READINESS_QA/VIEW_CONTRACTS_AUDIT.md` → exit 0 |
| SC-7 | API Routes Audit exists | 1 file | `ls .../DNS_SWITCH_READINESS_QA/API_ROUTES_AUDIT.md` → exit 0 |
| SC-8 | Block Renderer Audit exists | 1 file | `ls .../DNS_SWITCH_READINESS_QA/BLOCK_RENDERER_AUDIT.md` → exit 0 |
| SC-9 | Final verdict in report | Report ends with one of: 🟢 READY FOR DNS SWITCH / 🟡 READY WITH CAVEATS / 🔴 NOT READY | Grep for verdict line |
| SC-10 | Every finding has severity | Each issue tagged CRITICAL/HIGH/MEDIUM/LOW | Grep for untagged findings → 0 |
| SC-11 | EXECUTION_REPORT.md written | Standard retrospective | `ls .../DNS_SWITCH_READINESS_QA/EXECUTION_REPORT.md` → exit 0 |
| SC-12 | FINDINGS.md written | Accumulated findings | `ls .../DNS_SWITCH_READINESS_QA/FINDINGS.md` → exit 0 |
| SC-13 | Zero code changes | This is a READ-ONLY audit | `git status` → "nothing to commit" (no modified files) |
| SC-14 | Zero DB changes | Read-only queries only | No INSERT/UPDATE/DELETE executed |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read ANY file in both repos (`opticup` and `opticup-storefront`)
- Run read-only SQL against Supabase (Level 1 autonomy) — SELECT only
- Run `npm run build` in the storefront repo to verify build health
- Run `node scripts/full-test.mjs`, `node scripts/smoke-test.mjs`, and any other read-only test scripts
- Spawn up to 6 parallel sub-agents for the audit missions described in §A
- Fetch pages from `localhost:4321` if the dev server is running, OR from `https://opticup-storefront.vercel.app` (Vercel preview)
- Create all report files listed in §8 Expected Final State
- Write EXECUTION_REPORT.md and FINDINGS.md at the end

### What REQUIRES stopping and reporting

- Any write to any file outside the SPEC folder (this is a read-only audit)
- Any SQL that is not a SELECT (no INSERT, UPDATE, DELETE, DDL)
- Any modification to code, config, or DB content
- If a page returns HTTP 500 or the build fails — log the finding but do NOT attempt to fix it
- If the storefront dev server and Vercel preview are both unreachable — STOP (cannot audit without a running site)
- Any merge to `main`

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `storefront_pages` row count for Prizma drops below 50 during any query → STOP (data integrity issue)
- If any SQL query returns an error about missing tables or views → STOP and log the finding
- If the build (`npm run build`) fails with TypeScript errors → log finding as CRITICAL, continue with other audit missions that don't require build
- If more than 10 pages return HTTP errors → STOP (systemic issue, not per-page bugs)

---

## 6. Rollback Plan

**Label: N/A — Read-Only SPEC**

This SPEC produces only report files inside the SPEC folder. No code changes,
no DB changes. If the SPEC fails partway through:
- Partial reports in the SPEC folder can be deleted: `rm modules/Module\ 3\ -\ Storefront/docs/specs/DNS_SWITCH_READINESS_QA/*.md` (except SPEC.md)
- Re-run the SPEC from scratch
- No git reset needed (no commits expected beyond the report commit)

---

## 7. Out of Scope (explicit)

- **Fixing any bugs found.** This SPEC ONLY documents issues. Fixes are separate SPECs.
- **DNS switch execution.** This SPEC determines readiness; the actual switch is a separate task.
- **Performance testing / load testing.** Out of scope — we're checking correctness, not speed.
- **WordPress parity comparison.** We are NOT comparing page-for-page with the WordPress site.
- **Module 4 (CRM) readiness.** CRM is a future module, not part of storefront DNS switch.
- **Mobile device testing.** We check responsive CSS classes exist but cannot run on real devices.
- **Payment / checkout flows.** Storefront is a catalog + lead-gen site, not e-commerce.
- **Supabase infrastructure health.** RLS policies, Edge Functions, etc. are audited by Sentinel, not this SPEC.

---

## 8. Expected Final State

After the executor finishes, the SPEC folder should contain:

### New files (all inside `modules/Module 3 - Storefront/docs/specs/DNS_SWITCH_READINESS_QA/`)

| File | Author | Description |
|------|--------|-------------|
| `SPEC.md` | strategic (this file) | Already exists |
| `DNS_SWITCH_READINESS_REPORT.md` | executor (main agent) | Master report — aggregates all sub-reports, includes final verdict |
| `LANG_QUALITY_EN.md` | executor (EN language agent) | Page-by-page English content quality audit |
| `LANG_QUALITY_RU.md` | executor (RU language agent) | Page-by-page Russian content quality audit |
| `ERP_STUDIO_AUDIT.md` | executor (Studio agent) | ERP Studio admin interface completeness audit |
| `VIEW_CONTRACTS_AUDIT.md` | executor (DB agent) | Supabase Views data integrity audit |
| `API_ROUTES_AUDIT.md` | executor (API agent) | API route response audit |
| `BLOCK_RENDERER_AUDIT.md` | executor (block agent) | Block-by-block renderer code audit |
| `EXECUTION_REPORT.md` | executor | Standard retrospective |
| `FINDINGS.md` | executor | Accumulated findings for Foreman processing |

### Modified files
- None. This is a read-only audit.

### Deleted files
- None.

### DB state
- No changes. Read-only queries only.

### Docs updated
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — update status line to reflect QA audit completion (this is the ONE allowed write outside the SPEC folder)

---

## 9. Commit Plan

- **Commit 1:** `docs(m3): add DNS_SWITCH_READINESS_QA reports` — all report files in the SPEC folder
- **Commit 2:** `chore(spec): close DNS_SWITCH_READINESS_QA with retrospective` — EXECUTION_REPORT.md + FINDINGS.md + SESSION_CONTEXT.md update

---

## 10. Dependencies / Preconditions

| # | Precondition | How to verify |
|---|-------------|---------------|
| P-1 | Machine is Windows desktop | Confirm with Daniel or check path `C:\Users\User\opticup` |
| P-2 | Both repos cloned and on `develop` | `git branch` in both repos |
| P-3 | Both repos pulled to latest | `git pull origin develop` in both repos |
| P-4 | Storefront build passes | `cd opticup-storefront && npm run build` → exit 0 |
| P-5 | Supabase MCP connected | `execute_sql SELECT 1` → returns 1 |
| P-6 | Storefront accessible | Either `localhost:4321` (dev server) or `https://opticup-storefront.vercel.app` responds |
| P-7 | Both repos mounted/accessible | Executor can read files from both `opticup/` and `opticup-storefront/` directories |

**If P-7 fails (repo not mounted):** Log as CRITICAL precondition failure in
EXECUTION_REPORT.md, execute whatever missions are possible with available repos,
and clearly mark which missions were skipped due to missing access. Do NOT
fabricate results for inaccessible repos.

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| `STOREFRONT_S2S3_QA/FOREMAN_REVIEW` → A1 | Rollback Plan labeling for Level 2+ SQL | APPLIED — §6 explicitly labeled "N/A — Read-Only SPEC" |
| `STOREFRONT_S2S3_QA/FOREMAN_REVIEW` → A2 | Mount/access preconditions | APPLIED — §10 P-7 explicitly handles missing repo access |
| `STOREFRONT_S2S3_QA/FOREMAN_REVIEW` → E1 | Mount directory enumeration | APPLIED — §10 P-7 requires executor to enumerate mounted dirs |
| `STOREFRONT_S2S3_QA/FOREMAN_REVIEW` → E2 | Rollback plan validation | APPLIED — §6 is explicit and verifiable |
| `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW` → A-1 | Pre-SPEC Reality-Check sweep | APPLIED — Goal (§1) verified against actual DB state; page inventory from live SQL |
| `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW` → A-2 | Script-name sanity check | NOT APPLICABLE — no verify scripts created in this SPEC |
| `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW` → E-1 | Goal Reality Check | APPLIED — executor instructed to verify page counts match §A inventory |
| `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW` → E-2 | JSONB partial-update pattern | NOT APPLICABLE — no DB writes in this SPEC |
| `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW` → A1 | Migration path convention pre-flight | NOT APPLICABLE — no migrations in this SPEC |
| `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW` → A2 | Skill-reference path disambiguation | APPLIED — all file paths in this SPEC use explicit repo-relative notation |
| `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW` → E1 | Path resolution rule | NOT APPLICABLE — read-only SPEC, no file creation outside SPEC folder |
| `HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW` → E2 | Migration folder auto-detect | NOT APPLICABLE — no migrations |

**Cross-Reference Check completed 2026-04-16:** This SPEC introduces 0 new DB objects,
0 new functions, 0 new files outside the SPEC folder. No collisions possible. Pure audit.

---

## A. Multi-Agent Execution Architecture

This SPEC is designed for overnight execution using multiple parallel agents.
The executor should spawn sub-agents for each mission, then aggregate results
into the master report.

### Agent Topology

```
┌─────────────────────────────────────┐
│     MAIN EXECUTOR (orchestrator)    │
│  Reads SPEC, spawns agents,         │
│  aggregates reports, writes verdict │
└──────┬──────┬──────┬──────┬────┬────┘
       │      │      │      │    │    │
  ┌────▼──┐ ┌─▼───┐ ┌▼────┐ ┌▼──┐ ┌▼──┐ ┌▼──────┐
  │Mission│ │Miss.│ │Miss.│ │M4 │ │M5 │ │Mission│
  │  1    │ │ 2   │ │  3  │ │   │ │   │ │  6    │
  │Pages  │ │Blocks│ │Views│ │API│ │ERP│ │Lang   │
  │+HE QA │ │Audit│ │Audit│ │   │ │   │ │EN+RU  │
  └───────┘ └─────┘ └─────┘ └───┘ └───┘ └───────┘
```

### Mission 1 — Page-by-Page Rendering + Hebrew Content QA

**Agent count:** 1 (this is the largest mission — runs sequentially through all pages)

**Scope:** Every active (non-deleted) page/lang combination in `storefront_pages`
for tenant Prizma (`4a9f2c1e-f099-49a0-b292-c0b93e155c41`).

**Input data — Full Page Inventory:**

The following pages MUST each be audited. This inventory was pulled from the
live DB on 2026-04-16.

| # | Slug | Languages (active) | Block Count (HE) | Block Types |
|---|------|--------------------|-------------------|-------------|
| 1 | `/` | he, en, ru | 8 | hero_luxury, brand_strip, events_showcase, story_teaser, optometry_teaser, visit_us, text, custom |
| 2 | `/about/` | he, en, ru | 2 | hero, text |
| 3 | `/accessibility/` | he, en, ru | 1 | custom |
| 4 | `/deal/` | he, en, ru | 1 | custom |
| 5 | `/lab/` | he, en, ru | 2-3 | hero, custom (HE has 3 blocks) |
| 6 | `/multi/` | he, en, ru | 2 | hero, custom |
| 7 | `/multi-takanon/` | he only | 1 | custom |
| 8 | `/multifocal-guide/` | he, en, ru | 1 | custom |
| 9 | `/optometry/` | he, en, ru | 5 | hero, steps, columns, text, custom |
| 10 | `/privacy/` | he, en, ru | 1 | custom |
| 11 | `/prizma-express-terms/` | he, en, ru | 1 | custom |
| 12 | `/prizmaexpress/` | he, en, ru | 3 | hero, text, custom |
| 13 | `/supersale-takanon/` | he, en, ru | 1 | custom |
| 14 | `/terms/` | he, en, ru | 1 | custom |
| 15 | `/terms-branches/` | he, en, ru | 1 | custom |
| 16 | `/צרו-קשר/` | he, en, ru | 3 | hero, contact, custom |
| 17 | `/שאלות-ותשובות/` | he, en, ru | 2 | hero, faq |
| 18 | `/משקפי-מולטיפוקל/` | he, en, ru | 16 | hero_luxury, campaign_cards, text, reviews, steps, custom (x11) |
| 19 | `/משלוחים-והחזרות/` | he, en, ru | 1 | custom |
| 20 | `/eventsunsubscribe/` | he only | 1 | custom |
| 21 | `/general/` | he only | 1 | custom |
| 22 | `/successfulmulti/` | he only | 1 | custom |
| 23 | `/supersale/` | he only | 12 | hero, campaign_cards, text, custom (x9) |
| 24 | `/supersalepricescatalog/` | he only | 1 | custom |
| 25 | `/supersale-models-prices/` | he only | 3 | hero, text, custom |
| 26 | `/successfulsupersale/` | he only | 10 | hero, text, custom (x8) |
| 27 | `/premiummultisale/` | he only | 1 | custom |
| 28 | `/multisale-brands-cat/` | he only | 4 | hero, campaign_cards, text, custom |
| 29 | `/multisale-brands-cat2/` | he only | 4 | hero, campaign_cards, text, custom |
| 30 | `/מיופיה/` | he only | 3 | hero, text, custom |

**Total active page/lang combinations: ~57** (30 slugs, but only ~20 have all 3 langs; others are HE-only)

**Per-page checklist:**

For EACH page/lang combo, verify and document:

1. **HTTP status** — fetch the URL, confirm 200 (not 404, 500, redirect loop)
2. **HTML structure** — `<html lang="...">` matches expected locale, `<html dir="rtl">` for Hebrew
3. **Title tag** — `<title>` exists and is non-empty, contains relevant keywords
4. **Meta description** — `<meta name="description">` exists and is non-empty
5. **OG tags** — `og:title`, `og:description`, `og:image` present
6. **Canonical URL** — `<link rel="canonical">` present and correctly formed
7. **hreflang tags** — all active language variants linked correctly
8. **Block count** — number of rendered blocks matches DB `jsonb_array_length(blocks)`
9. **Images** — all `<img>` tags have `src` attributes that resolve (no broken images). Check that product images use `/api/image/` proxy (Rule 25)
10. **YouTube embeds** — if present, use `youtube.com` (NOT `youtube-nocookie.com`), have `title` attribute
11. **Links** — internal links use correct locale prefix, no broken `href="#"` or empty hrefs
12. **Hebrew content (HE pages)** — text is actual Hebrew (not placeholder/Lorem), reads naturally
13. **WhatsApp links** — if present, number matches `v_storefront_config.whatsapp_number`
14. **Contact info** — phone, email, address come from config (not hardcoded)
15. **Brand colors** — no forbidden colors (blue, green except success, red except error, purple)
16. **Console errors** — if using browser tools, check for JS errors
17. **Mobile viewport** — `<meta name="viewport">` present

**For pages with ONLY Hebrew (no EN/RU):**
Also note whether this is intentional (campaign/promo pages) or a gap that
should have translations.

**Hebrew content quality standard:**
Hebrew is the source language, so content should be checked for: completeness
(no missing sections), no placeholder text, no English text mixed in where
Hebrew is expected, proper Hebrew typography (geresh, gershayim where needed).

### Mission 2 — Block Renderer Code Audit

**Agent count:** 1

**Scope:** All 32 `.astro` block component files in `opticup-storefront/src/components/blocks/`

**Full component inventory:**

```
AboutBlock.astro          EventsShowcaseBlock.astro   ReviewsBlock.astro
BrandStripBlock.astro     FaqBlock.astro              StepsBlock.astro
CampaignCardsBlock.astro  HeroBlock.astro             StoryTeaserBlock.astro
ColumnsBlock.astro        HeroBlogBlock.astro         TextBlock.astro
ContactBlock.astro        HeroLuxuryBlock.astro       VisitUsBlock.astro
CustomBlock.astro         OptometryTeaserBlock.astro
```

Plus related non-block components: `HeroSection.astro`, `ProductCard.astro`,
`BrandCard.astro`, `SearchBar.astro`, `Header.astro`, `Footer.astro`,
`LanguageSwitcher.astro`, etc.

**Per-component checklist:**

1. **TypeScript types** — Props interface defined, matches block data types in `lib/blocks/types.ts`
2. **RTL support** — uses logical CSS properties (not physical left/right). Check for `text-left`, `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-` (physical properties are violations of Rule 27)
3. **Responsive classes** — uses mobile-first Tailwind (`sm:`, `lg:` breakpoints) per Rule 28
4. **Image handling** — images use `/api/image/` proxy or are external CDN URLs (YouTube thumbnails OK)
5. **Hardcoded strings** — no tenant-specific text (Rule 9). All user-visible strings should come from data props, i18n, or config
6. **Accessibility** — `alt` attributes on images, `aria-label` on buttons, semantic HTML
7. **YouTube embeds** — if component embeds YouTube, uses `youtube.com` (not `-nocookie`), has `title` attribute, `iv_load_policy=3`
8. **File size** — under 350 lines (absolute max per rules)
9. **Script tags** — if component has `<script>`, verify it handles missing elements gracefully (null checks)

**Output:** `BLOCK_RENDERER_AUDIT.md` with a table: component name, pass/fail per check, findings

### Mission 3 — Supabase Views Data Integrity Audit

**Agent count:** 1

**Scope:** All 10 storefront-facing Views + their data for Prizma tenant

**Views to audit:**

| View | Purpose | Key checks |
|------|---------|------------|
| `v_public_tenant` | Tenant config | Prizma row exists, has name/logo/theme/phone/email |
| `v_storefront_config` | Site config | Prizma row exists, has whatsapp_number, booking_url, social links, analytics IDs |
| `v_storefront_pages` | Page content | All 57+ active page/lang combos present, blocks JSONB valid |
| `v_storefront_products` | Product catalog | Row count > 0, images resolve, prices > 0, brands non-null |
| `v_storefront_brands` | Brand list | Row count > 0, each has name + slug + image |
| `v_storefront_brand_page` | Brand detail | Each brand with `show_page=true` has content |
| `v_storefront_categories` | Categories | At least 1 category exists |
| `v_storefront_blog_posts` | Blog | Posts exist (if blog is live), have title + content |
| `v_storefront_reviews` | Customer reviews | Reviews exist, have rating + text |
| `v_storefront_components` | Reusable components | Header/footer/nav components exist |

**Per-view checklist:**

1. **View exists** — `SELECT * FROM {view} LIMIT 1` succeeds
2. **Prizma data present** — `.eq('tenant_id', '4a9f2c1e-...')` returns rows
3. **Required columns present** — cross-reference with `VIEW_CONTRACTS.md` in storefront repo
4. **No NULL in required fields** — check for unexpected NULLs in critical columns
5. **Image URLs valid** — spot-check 5 image URLs per view (do they resolve?)
6. **Data freshness** — check `updated_at` or equivalent timestamps
7. **Anon access** — verify the view has `GRANT SELECT TO anon` (check via `information_schema`)
8. **Row counts** — document actual counts for baseline

**Output:** `VIEW_CONTRACTS_AUDIT.md` with per-view results

### Mission 4 — API Routes Audit

**Agent count:** 1 (smallest mission — can be folded into main executor if agent limit is a concern)

**Scope:** All 3 API routes in `opticup-storefront/src/pages/api/`

| Route | Method | Purpose | Test |
|-------|--------|---------|------|
| `/api/image/[...path].ts` | GET | Image proxy (Rule 25) | Fetch a known product image path → 200 + image content-type |
| `/api/leads/submit.ts` | POST | Lead/contact form submission | POST with valid payload → 200 (or 201); POST with missing fields → 400 |
| `/api/normalize-logo.ts` | GET | Logo normalization | Fetch with a known brand → 200 + image content-type |

**Per-route checklist:**

1. **Code review** — read the file, verify it follows `SECURITY_RULES.md` patterns (S1–S10)
2. **Input validation** — does it validate/sanitize input? SQL injection safe?
3. **Auth model** — uses correct key (anon for reads, service_role only for Storage proxy)
4. **Error handling** — returns proper HTTP status codes, does not leak stack traces
5. **tenant_id isolation** — if route queries DB, does it filter by tenant_id?
6. **Response headers** — appropriate Content-Type, CORS if needed
7. **Rate limiting** — any protection against abuse? (document if missing)

**Output:** `API_ROUTES_AUDIT.md`

### Mission 5 — ERP Studio Admin Interface Audit

**Agent count:** 1

**Scope:** All 31 JS files under `opticup/modules/storefront/` (the ERP-side admin UI for managing storefront content)

**NOTE:** This mission requires access to the ERP repo (`opticup/`). If the ERP
repo is not mounted/accessible, this mission should be logged as SKIPPED with
reason "ERP repo not accessible" and flagged as a follow-up.

**Studio file inventory (expected ~31 files):**

The Studio admin interface lets Prizma staff manage:
- Pages (create, edit, reorder blocks, set SEO)
- Blocks (all 15 types, each with its own editor)
- Brand pages (content, images, videos)
- Blog posts (create, edit, images)
- Products (display settings, images, categories)
- Site config (theme, contact info, social links)
- Translations
- Media library

**Per-file checklist:**

1. **File exists and loads** — no syntax errors
2. **FIELD_MAP compliance** — any DB fields used are registered in FIELD_MAP (Rule 5)
3. **API Abstraction** — uses `shared.js` helpers, not direct `sb.from()` (Rule 7)
4. **tenant_id** — all queries include `tenant_id` filter (Rule 22)
5. **No hardcoded values** — no tenant-specific strings (Rule 9)
6. **writeLog** — called for all data modifications (Rule 2)
7. **PIN verification** — sensitive operations require PIN (Rule 8)
8. **File size** — under 350 lines (Rule 12)
9. **No orphaned functions** — all exported functions are used somewhere
10. **UI completeness** — does the admin UI cover all the fields that the storefront displays? (e.g., if a block type has 8 fields, does the editor expose all 8?)

**Output:** `ERP_STUDIO_AUDIT.md`

### Mission 6 — Language Quality Audit (EN + RU)

**Agent count:** 2 (one per language, run in parallel)

**THIS IS THE MOST IMPORTANT MISSION FOR DANIEL.** The entire purpose of having
dedicated language agents is to verify that English and Russian content reads as
if it were originally written in that language — not machine-translated from Hebrew.

#### Sub-Mission 6a — English Language Quality

**Scope:** Every page that has `lang='en'` in `storefront_pages`

For each English page:

1. **Read the full page content** from DB (`storefront_pages.blocks` where `lang='en'`)
2. **Evaluate as a native English reader** — does this read like professional English content for a premium optical retailer? Or does it read like a translation?
3. **Check for translation artifacts:**
   - Awkward word order (Hebrew SOV → English SVO issues)
   - Overly literal translations that sound unnatural
   - Hebrew words or characters left in English text
   - Missing articles (a/an/the) — common Hebrew→English error
   - Wrong prepositions (in/on/at confusion)
   - Inconsistent terminology (same concept translated differently on different pages)
   - Formal/informal register mismatch
4. **Check for completeness:**
   - Does the EN page have the same sections as the HE page?
   - Are any blocks empty or significantly shorter than their HE equivalent?
   - Are there any `[TODO]`, `[TRANSLATE]`, or placeholder markers?
5. **SEO quality:**
   - Is the English title/description natural and keyword-appropriate?
   - Would a native English speaker searching Google find this content?
6. **Brand voice:**
   - Does it match the tone of a premium optical retailer?
   - Is it consistent across pages?

**Rating scale per page:**
- A = Native quality, indistinguishable from originally-written English
- B = Good, minor awkwardness but fully understandable
- C = Acceptable, clearly translated but functional
- D = Poor, translation artifacts that harm credibility
- F = Broken, missing content, or incomprehensible

**Output:** `LANG_QUALITY_EN.md` — per-page rating + specific findings + overall grade

#### Sub-Mission 6b — Russian Language Quality

**Scope:** Every page that has `lang='ru'` in `storefront_pages`

Same checklist as English, plus Russian-specific checks:

1. **Proper Cyrillic** — no Latin characters mixed into Russian words
2. **Grammatical cases** — Russian has 6 cases; check that nouns/adjectives agree
3. **Formal "вы" vs informal "ты"** — consistent use (retail should use formal вы)
4. **Transliteration of brand names** — Hebrew brand names correctly transliterated
5. **Phone/address formatting** — Israeli format but with Russian labels
6. **Cultural appropriateness** — does the content make sense for a Russian-speaking audience in Israel?

**Output:** `LANG_QUALITY_RU.md` — per-page rating + specific findings + overall grade

---

## B. Master Report Structure

The main executor aggregates all sub-reports into `DNS_SWITCH_READINESS_REPORT.md`
with this structure:

```markdown
# DNS Switch Readiness Report — Prizma Optics
## Generated: YYYY-MM-DD
## Audit scope: [total pages checked] pages, [total blocks] blocks, [total views] views, [total routes] routes

### Executive Summary
[2-3 sentences: ready or not, biggest risks, recommended actions]

### Verdict: [🟢/🟡/🔴] [READY FOR DNS SWITCH / READY WITH CAVEATS / NOT READY]

### Scoring
| Area | Score | Critical | High | Medium | Low |
|------|-------|----------|------|--------|-----|
| Page Rendering (HE) | X/Y pass | ... | ... | ... | ... |
| Page Rendering (EN) | X/Y pass | ... | ... | ... | ... |
| Page Rendering (RU) | X/Y pass | ... | ... | ... | ... |
| Block Renderers | X/Y pass | ... | ... | ... | ... |
| Supabase Views | X/Y pass | ... | ... | ... | ... |
| API Routes | X/Y pass | ... | ... | ... | ... |
| ERP Studio | X/Y pass | ... | ... | ... | ... |
| EN Language Quality | [A-F] | ... | ... | ... | ... |
| RU Language Quality | [A-F] | ... | ... | ... | ... |

### Critical Issues (must fix before DNS switch)
[numbered list with exact page/component/view + description]

### High Issues (should fix before DNS switch)
[numbered list]

### Medium Issues (fix soon after DNS switch)
[numbered list]

### Low Issues (nice to have)
[numbered list]

### Detailed Reports
- [Page-by-Page Results](#) → see inline or separate section
- [Block Renderer Audit](#) → BLOCK_RENDERER_AUDIT.md
- [View Contracts Audit](#) → VIEW_CONTRACTS_AUDIT.md
- [API Routes Audit](#) → API_ROUTES_AUDIT.md
- [ERP Studio Audit](#) → ERP_STUDIO_AUDIT.md
- [English Quality](#) → LANG_QUALITY_EN.md
- [Russian Quality](#) → LANG_QUALITY_RU.md

### Appendix: Pages Not Checked (and why)
[list any pages that could not be audited, with reason]
```

### Verdict Criteria

- **🟢 READY FOR DNS SWITCH** — 0 CRITICAL, ≤2 HIGH, all pages render, both languages grade B+ or above
- **🟡 READY WITH CAVEATS** — 0 CRITICAL, some HIGH issues documented with workarounds, languages grade C+ or above
- **🔴 NOT READY** — any CRITICAL issue, OR >5 HIGH issues, OR either language grades D or below

---

## C. Execution Order

The executor should follow this order:

1. **Precondition checks** (§10) — verify repos, build, Supabase, access
2. **Spawn parallel agents:**
   - Mission 1 (Pages + HE QA) — longest mission, start first
   - Mission 2 (Block renderers) — code review, no network needed
   - Mission 3 (Views audit) — Supabase queries
   - Mission 4 (API routes) — code review + endpoint tests
   - Mission 5 (ERP Studio) — code review (needs ERP repo access)
   - Mission 6a (EN language) — DB content read + quality assessment
   - Mission 6b (RU language) — DB content read + quality assessment
3. **Collect all sub-reports** — wait for all agents to complete
4. **Aggregate into master report** — build `DNS_SWITCH_READINESS_REPORT.md`
5. **Write retrospective** — `EXECUTION_REPORT.md` + `FINDINGS.md`
6. **Commit** per §9 commit plan

**Estimated runtime:** 2-4 hours depending on agent parallelism and page count.
This is designed for overnight execution — no human interaction needed.

---

## D. Severity Classification Guide

To ensure consistent severity ratings across all agents:

| Severity | Definition | Examples |
|----------|-----------|----------|
| **CRITICAL** | Blocks DNS switch. Site unusable or data exposed. | Page returns 500, broken auth, data leak, build fails |
| **HIGH** | Significant user-facing issue. Should fix before switch. | Broken images on key pages, missing translations on main pages, broken navigation, SEO meta missing on important pages |
| **MEDIUM** | Noticeable issue but site is functional. Fix soon after switch. | Minor translation awkwardness, missing alt text, non-critical page 404, formatting glitch |
| **LOW** | Cosmetic or minor. Fix at convenience. | Inconsistent spacing, could-be-better wording, nice-to-have SEO improvement |

**opticup-guardian must be consulted** if any agent is unsure about severity
classification. When in doubt, classify one level higher (err toward caution).
