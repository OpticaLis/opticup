# DNS Switch Readiness Report — Prizma Optics

**Generated:** 2026-04-16
**Tenant:** Prizma Optics (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
**Audit scope:** 66 page/lang combos · 32 block renderers · 10 Supabase views · 3 API routes · 31 ERP Studio JS files · 18 EN + 18 RU content-quality reviews
**Method:** Multi-agent read-only audit (6 parallel agents + 1 main executor) against Vercel preview `https://opticup-storefront.vercel.app` and the live Supabase production DB (`tsxrrxzmdxaenlvocyit`).

---

## Executive Summary

The storefront is **NOT ready for DNS switch to `prizma-optic.co.il`** as of 2026-04-16. Three CRITICAL blockers must be resolved before the cutover. Hebrew content is launch-ready and well-crafted; the 8-block luxury homepage, multifocal guide, lab page, and optometry copy all read as native-quality material. The problems are concentrated in (a) multilingual routing (EN/RU serve 3 of 18 published slugs each — 84% dark), (b) lead capture (`/api/leads/submit` returns 404 on Vercel), and (c) one Russian content bug that silently leaks Hebrew letters into two words on a premium product page.

Every CRITICAL blocker has a concrete, bounded fix path. No architectural rewrite is needed.

---

## Verdict: 🔴 **NOT READY FOR DNS SWITCH**

**Gating criteria (from SPEC §B):** any CRITICAL issue, OR >5 HIGH issues, OR either language grades D or below.

We trip all three criteria:
- **CRITICAL count = 4** (EN/RU 404-routing, EN/RU lang-root redirects, `/api/leads/submit` 404, `/prizmaexpress/` RU word corruption, `/optometry/` draft status)
- **HIGH count = 10**
- **Russian language grade = B+ overall, but one page grades D** (`/prizmaexpress/`)

After the 4 CRITICAL items are fixed plus at least 5 of the 10 HIGH items, the verdict moves to 🟡 READY WITH CAVEATS. After all HIGH items are fixed, it moves to 🟢 READY FOR DNS SWITCH.

---

## Scoring

| Area | Score | Critical | High | Medium | Low |
|------|-------|---------:|-----:|-------:|----:|
| Page Rendering (HE) | 30/30 serve | 0 | 3 | 3 | 2 |
| Page Rendering (EN) | **4/18 serve** | 1 (14 404s) | 1 | 3 | 0 |
| Page Rendering (RU) | **4/18 serve** | 1 (14 404s — overlaps with EN) | 1 | 3 | 0 |
| Block Renderers | 22/32 clean, 10 with findings | 0 | 0 | 3 | 10 |
| Supabase Views | 9/10 rows; 10/10 granted | 0 | 2 | 3 | 3 |
| API Routes | 2/3 live | 1 (`/api/leads/submit`) | 0 | 0 | 3 |
| ERP Studio | 14/31 clean | 0 | 3 | 8 | 14 |
| EN Language Quality | **B** (overall) | 0 | 3 | 4 | 0 |
| RU Language Quality | **B+** (overall, 1 D page) | 1 (`/prizmaexpress/`) | 0 | 2 | 0 |

"Serve" = HTTP 200 on Vercel preview. "Granted" = `SELECT TO anon` present on the view.

---

## Critical Issues — Must Fix Before DNS Switch

### CRITICAL-1 — EN/RU routing is systemically broken
**Source:** Mission 1 (PAGES_HE_QA_REPORT #1).
**Evidence:** 14 of 18 EN slugs return HTTP 404 despite `status='published'` + `translation_status='approved'` + non-empty `blocks` JSONB in `storefront_pages`. Same 14 slugs 404 in RU. Slugs affected: `/deal/`, `/lab/`, `/multi/`, `/multifocal-guide/`, `/optometry/`, `/prizma-express-terms/`, `/prizmaexpress/`, `/supersale-takanon/`, `/terms-branches/`, `/terms/`, `/משלוחים-והחזרות/`, `/משקפי-מולטיפוקל/`, `/צרו-קשר/`, `/שאלות-ותשובות/`. The `/משקפי-מולטיפוקל/` EN/RU versions alone contain 16 blocks of already-translated content going unserved.
**Root cause hypothesis:** Astro's i18n routing or `storefront_pages` → Astro-route generation is missing the lang variants. EN/RU versions may need `[...slug].astro` or locale-prefixed dynamic routes; possible that the i18n filter rejects non-ASCII slugs.
**Impact:** After DNS cutover, every shared EN/RU link, every EN/RU ad, every EN/RU organic search result lands on a 404. WhatsApp and Google will recirculate these 404s until they deindex.
**Fix scope:** Investigate Astro i18n + `[slug].astro` generator; likely a 1–2 day storefront SPEC.

### CRITICAL-2 — `/en/` and `/ru/` lang-root redirect to HE homepage
**Source:** Mission 1.
**Evidence:** `GET /en/` → 302 to `/`. `GET /ru/` → 302 to `/`.
**Impact:** EN/RU users who type the lang root land on a Hebrew-only page. Combined with CRITICAL-1, effectively no usable EN or RU entry path.
**Fix scope:** Configure Astro i18n to serve the correct localized homepage at `/en/` and `/ru/` (data already in DB — all 3 lang rows exist for `/`).

### CRITICAL-3 — `/api/leads/submit` returns 404 on Vercel preview
**Source:** Mission 4 (FINDING-M4-01).
**Evidence:** POST / HEAD / GET all return 404. File exists in repo at `src/pages/api/leads/submit.ts` (267 lines, well-structured). Local `npm run build` passes. Deployed Vercel `_render.func` does not route to it. The sibling route `/api/image/...` works — so API routes as a class DO deploy — but this specific path does not. Matches the previously known CONTACT_FORM_FIX blocker listed in SESSION_CONTEXT.
**Impact:** Contact forms submit but data is silently lost. DNS cutover without resolving = zero inbound leads from the new site.
**Fix scope:** Re-deploy latest storefront `develop` to Vercel; if still broken, debug Astro i18n middleware intercepting `/api/*` routes. CONTACT_FORM_FIX SPEC was already queued in SESSION_CONTEXT.

### CRITICAL-4 — `/prizmaexpress/` Russian page contains words with embedded Hebrew letters
**Source:** Mission 6b.
**Evidence:** Two Russian words on the RU variant of `/prizmaexpress/` have Hebrew characters mid-word: `лиןз` should be `линз` (Hebrew `ן` nun sofit in place of `н`); `каталоגים` should be `каталоге` (Hebrew `ג` gimel and `ם` mem sofit in place of the ending). DB-side regex scan `[\u0400-\u04FF][\u0590-\u05FF]` confirms this is the only page affected.
**Impact:** Russian premium-product page renders broken text. Until fixed, Russian visitors see garbled product copy on the Prizma Express premium offering.
**Fix scope:** ~5-minute SQL UPDATE to fix the JSONB `blocks` column for this one page/lang row. Tied to CRITICAL-1 (the page 404s today, so the bug is hidden — but when CRITICAL-1 is fixed, this surfaces immediately).

### CRITICAL-5 — `/optometry/` is `status='draft'` on all 3 langs and returns 404
**Source:** Mission 1 (CRITICAL #3).
**Evidence:** `storefront_pages` row for `/optometry/` has `status='draft'` on he/en/ru; all return 404.
**Impact:** This is a high-traffic slug called out in the SPEC as a key DNS-switch target (optometry clinic landing). If it was meant to be live for the cutover, it must be flipped to `published`.
**Fix scope:** 1-line SQL UPDATE per lang if content is ready. Or remove from sitemap/nav if intentionally held back.

---

## High Issues — Should Fix Before DNS Switch

### HIGH-1 — All canonical + OG URLs point to `opticup-storefront.vercel.app`
**Source:** Mission 1 (HIGH #4).
**Impact:** If uncorrected at DNS flip, Google will index the Vercel preview host permanently.
**Fix:** Update `astro.config.mjs site` or env-driven base URL for the production build; re-deploy.

### HIGH-2 — Zero `hreflang` links on any page
**Source:** Mission 1 (HIGH #8).
**Impact:** Google cannot cluster multilingual versions of the same page; SEO ranking for EN/RU queries will suffer.
**Fix:** Template-level addition of `<link rel="alternate" hreflang="he|en|ru|x-default" />` driven by the page's `translation_group_id`.

### HIGH-3 — `og:image` missing on every non-homepage page
**Source:** Mission 1 (MEDIUM #9, reclassified HIGH after cross-reference with Mission 3 FINDING-M3-04 which shows `v_storefront_config.og_image_url` is NULL).
**Impact:** WhatsApp / Facebook / Twitter link previews render without an image, hurting CTR on every shared link.
**Fix:** (a) Populate `storefront_config.og_image_url` for Prizma, (b) Verify `BaseLayout.astro` falls back to tenant logo when `ogImage` prop is missing (this was already implemented per PRE_MERGE_SEO_FIXES — may be a regression).

### HIGH-4 — Hebrew tenant name `אופטיקה פריזמה` leaks into EN + RU titles and metas
**Source:** Mission 1 (MEDIUM #12, reclassified HIGH), corroborated by Mission 6a (4 pages have Hebrew `title` DB values).
**Evidence:** Every EN/RU page title ends `| אופטיקה פריזמה | אופטיקה פריזמה` (doubled brand + Hebrew for international audience). Four EN pages have Hebrew `title` DB values directly: `/lab/`, `/multi/`, `/prizmaexpress/`, `/משקפי-מולטיפוקל/`.
**Fix:** (a) Template: localize the brand suffix ("Prizma Optics" / "Призма Оптика"), (b) DB: fix the 4 Hebrew-title EN rows + 4 Hebrew-title RU rows (same slugs), (c) Stop the template from appending the brand when `meta_title` already includes it.

### HIGH-5 — Brand `hero_image` NULL on all 39 Prizma brands
**Source:** Mission 3 (FINDING-M3-01).
**Impact:** Brand pages render without a hero banner at DNS cutover.
**Fix:** (a) Populate `brands.hero_image` for top-N brands, OR (b) Verify brand-page template hides the hero block gracefully when NULL. The latter was probably meant to happen — needs visual verification on Vercel preview.

### HIGH-6 — All 10 storefront-facing Views grant non-SELECT privileges (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) to `anon` and `authenticated`
**Source:** Mission 3 (FINDING-M3-02).
**Impact:** Defense-in-depth violation. Underlying RLS + view un-updatability makes this inert today (no actual exploit), but Iron Rule 13 requires least-privilege.
**Fix:** Post-cutover `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON <10 views> FROM anon, authenticated`. Not a DNS blocker; schedule for the week after.

### HIGH-7 — `studio-templates.js` inserts and updates omit `tenant_id`
**Source:** Mission 5.
**Evidence:** L175 and L234 `storefront_templates.insert(...)` pass no `tenant_id`. L331/L353 updates use `.eq('id', templateId)` only.
**Impact:** If `storefront_templates` is tenant-scoped per Rule 14 (likely), inserts will fail at DB or create orphan rows. Data-integrity risk for the Studio template feature.
**Fix:** Verify schema in `docs/GLOBAL_SCHEMA.sql`; add `tenant_id: getTenantId()` to row payloads and `.eq('tenant_id', ...)` to updates.

### HIGH-8 — `studio-reviews.js` + `studio-media.js` — ~8 write sites lack `tenant_id` filter
**Source:** Mission 5.
**Evidence:** `studio-reviews.js` L152/175/176/236/253/302 and `studio-media.js` L525/547 use `.eq('id', ...)` alone. Belt-and-suspenders Rule 22 missing.
**Impact:** Relies entirely on RLS. If RLS is ever weakened, cross-tenant writes become possible.
**Fix:** Add `.eq('tenant_id', getTenantId())` to all 8 sites. One afternoon of work.

### HIGH-9 — `/multi/` HE page has broken CTA `href="#"`
**Source:** Mission 1 (HIGH #6).
**Evidence:** Primary CTA "מידע נוסף + אצלנו מאחורי הקלעים >>" has `href="#"`.
**Fix:** Populate the real target URL in the CMS block.

### HIGH-10 — `/en/about/` reads as literal translation, damages brand credibility
**Source:** Mission 6a.
**Evidence:** "if you purchased a model and regret it," "we must do everything possible to make the customer feel at home, even on the site!" plus contradictory same-day turnaround times (15 min in About, 30 min on homepage, 15-60 min on /lab/).
**Fix:** 30-minute native-editor pass on this page. Highest ROI single English rewrite. Same page in RU also grades C — bundle both.

---

## Medium Issues — Fix Soon After DNS Switch

| # | Source | Issue |
|---|--------|-------|
| MED-1 | Mission 1 | Two unrendered WP-style shortcodes leak as literal text on `/multi/` EN and `/prizmaexpress/` EN (`[reviews style="carousel" limit="8"]`, `[products category="eyeglasses" limit="8" columns="4"]`). Renderer bug. |
| MED-2 | Mission 1 | `meta[name=description]` missing on 4+ pages (template isn't rendering DB field). |
| MED-3 | Mission 1 | `og:description` missing on 4+ pages. |
| MED-4 | Mission 1 | `/מיופיה/` canonical mismatch: stores one slug, 308-redirects to another, canonical meta points to the target, target isn't in DB. Documentation/redirect drift. |
| MED-5 | Mission 2 | `BlockWrapper.astro:15` + `TextBlock.astro:14` use physical `text-left`/`text-right` instead of logical `text-start`/`text-end`. Rule 27 violation. Trivial 2-line fix. |
| MED-6 | Mission 3 | `v_public_tenant.phone` and `.email` NULL for Prizma (storefront_config has these; `v_public_tenant` may not). |
| MED-7 | Mission 3 | `v_storefront_config.favicon_url` NULL — tab shows default Vercel favicon. |
| MED-8 | Mission 3 | `v_storefront_components` has 0 rows for Prizma globally — if any code still reads this view, the feature is dead. |
| MED-9 | Mission 5 | Rule 2 (writeLog) absent from the entire Storefront/Studio module — 26 files perform writes, 0 call writeLog. Systemic gap, decision needed. |
| MED-10 | Mission 5 | Rule 7 — 100% of ERP Studio DB access uses `sb.from()` directly rather than `shared.js` helpers. Pattern consistent but violates abstraction standard. |
| MED-11 | Mission 5 | Additional ~5 files with Rule 22 defense-in-depth gaps (campaigns, campaign-builder, tags, glossary, translation-editor, brand-translations corrections). |
| MED-12 | Mission 6a | 3 duplicate/competing English multifocal landing pages dilute SEO. |
| MED-13 | Mission 6a | Hebrew jargon leaks in EN: "Horat Keva" in FAQ, "Pedestrian Mall" in contact, Hebrew CSS comments inside `/משקפי-מולטיפוקל/` source. |
| MED-14 | Mission 6b | `/about/` RU reads as literal translation ("решение для Вашего видения", "являемся лидерами в области... дизайна"). |

---

## Low Issues — Nice to Have

| # | Source | Issue |
|---|--------|-------|
| LOW-1 | Mission 2 | StepsBlock + VideoBlock use `youtube-nocookie.com`; the other 4 video-embedding blocks use `youtube.com`. Inconsistency. |
| LOW-2 | Mission 2 | `CustomBlock` creates YouTube iframes without `title` attribute (dynamic script). |
| LOW-3 | Mission 2 | Carousel arrows in EventsShowcaseBlock use physical `left-0`/`right-0` rather than logical `start-0`/`end-0`. |
| LOW-4 | Mission 3 | 48 of 608 products missing `ai_description` / `ai_seo_title`. |
| LOW-5 | Mission 3 | Blog posts use two different `featured_image` URL schemes (`/blog/images/...` vs `/api/image/...`). |
| LOW-6 | Mission 3 | Baseline drift: SPEC said 66 pages; live DB has 80 (6 page_types × 3 langs, plus extras). |
| LOW-7 | Mission 4 | `/api/leads/submit` — email HTML unescaped user input (5-minute fix, trivial XSS hardening for operator inbox). |
| LOW-8 | Mission 4 | `/api/leads/submit` — `Language: 'he'` hardcoded in webhook payload; misfires Make.com routing for EN/RU. |
| LOW-9 | Mission 4 | SPEC drift: `normalize-logo` is POST, not GET as SPEC §A states. |
| LOW-10 | Mission 5 | 14 files >350 lines (target 300). Largest: `storefront-translations.js` 1264, `brand-translations.js` 1010, `studio-shortcodes.js` 898. None are safety violations; splits are refactor work. |
| LOW-11 | Mission 1 | HE homepage title has brand-name duplication in the suffix. |
| LOW-12 | Mission 1 | No `twitter:card`/`twitter:image` meta on any page. |
| LOW-13 | Mission 1 | `/general/` HE page title is in English ("General Campaign - אופטיקה פריזמה"). |

---

## Detailed Reports

Each mission produced its own full report in this SPEC folder:

- [Pages + Hebrew QA (Mission 1)](PAGES_HE_QA_REPORT.md) — 66 pages, 30 HE deep-fetched, per-page meta tag + block-count table
- [Block Renderer Audit (Mission 2)](BLOCK_RENDERER_AUDIT.md) — 32 `.astro` files, 13 findings
- [View Contracts Audit (Mission 3)](VIEW_CONTRACTS_AUDIT.md) — 10 views, grant matrix, Prizma data baseline
- [API Routes Audit (Mission 4)](API_ROUTES_AUDIT.md) — 3 routes, code review + live endpoint tests
- [ERP Studio Audit (Mission 5)](ERP_STUDIO_AUDIT.md) — 31 JS files, 13,457 LOC, Rule 2/7/8/9/12/22 audit
- [English Language Quality (Mission 6a)](LANG_QUALITY_EN.md) — 18 EN pages, per-page grade A/B/C/D/F
- [Russian Language Quality (Mission 6b)](LANG_QUALITY_RU.md) — 18 RU pages, Cyrillic purity check, вы/ты consistency, cultural appropriateness

---

## Appendix — Pages Not Checked and Why

All 66 active page/lang combos in `storefront_pages` for Prizma were accounted for. No pages were skipped. The "not fetched" markers in Mission 1's per-page table refer to pages where the HTTP status was confirmed but deep HTML inspection was deferred (for HE-only campaign pages where the HTTP 200 and DB content were sufficient signal for the audit).

The following content was explicitly out of scope per SPEC §7:
- Mobile-device testing (audit confirmed responsive CSS classes exist in 27/32 blocks; real-device smoke left to Daniel)
- Payment/checkout flows (not a storefront feature — lead-gen only)
- WordPress-parity comparison
- Performance/Lighthouse scoring
- Supabase infrastructure health (owned by Sentinel)
- CRM / Module 4 readiness

---

## Summary of What Works — What to Keep

The audit surfaced a lot of problems, but the Hebrew side of the site is genuinely good:

- **30/30 HE pages render** on Vercel preview (plus 3 EN and 3 RU — the ones that do serve).
- **Hebrew content quality is native-grade.** Zero placeholders, zero Lorem, zero stale-block markers in 30 HE rows. Anchor phrase ("הסבירות שלא תמצאו את המסגרת ההכי מתאימה לכם היא אפסית") reads as intended.
- **Multifocal guide + Lab page (HE, EN, RU)** are written as publishable, editorial-quality content.
- **Block renderers are well-structured** — 32 components, all under 281 lines, all typed, no direct Supabase Storage URLs, no hardcoded tenant values.
- **Image proxy (`/api/image/...`) works flawlessly** — tested with a real product image, 302→200 `image/webp` in 18.8KB.
- **Russian brand-name convention, вы/ты consistency, and cultural appropriateness all pass** uniformly site-wide.
- **Site theme + logo + booking URL + WhatsApp + categories** all populated in `storefront_config`.
- **608 products, 172 blog posts, 39 brands, 5 Google reviews** — all present in the Views, all queryable by anon.

The site has a strong content foundation. The gaps are concentrated in routing (multi-lang), template metadata rendering, and a few isolated defects. None require architectural rework.

---

## Path to 🟢 READY FOR DNS SWITCH

### Week 1 (before DNS cutover)
1. Fix CRITICAL-1 (EN/RU routing — 1–2 day storefront SPEC)
2. Fix CRITICAL-2 (EN/RU lang-root redirects)
3. Fix CRITICAL-3 (`/api/leads/submit` — dispatch CONTACT_FORM_FIX SPEC)
4. Fix CRITICAL-4 (`/prizmaexpress/` RU word corruption — 5-minute SQL)
5. Publish or remove CRITICAL-5 (`/optometry/` draft status)
6. Fix HIGH-1 (canonical/OG host swap to `prizma-optic.co.il`)
7. Fix HIGH-3 (og:image fallback regression)
8. Fix HIGH-9 (`/multi/` broken CTA)
9. Commission targeted EN + RU editor pass on `/about/` (HIGH-10 + MED-14)
10. Fix HIGH-4 (Hebrew tenant name leak — 4 DB rows per lang, template fix)

### Week 2 (after DNS cutover, before external promotion)
- Fix HIGH-2 (hreflang) — SEO compounding benefit
- Fix HIGH-5 (brand hero images)
- Fix HIGH-7 + HIGH-8 (Studio tenant_id gaps — `studio-templates.js`, `studio-reviews.js`, `studio-media.js`)
- Fix HIGH-6 (REVOKE extra grants on 10 views)
- Fix MED-1 (unrendered shortcodes on 2 EN pages)
- Fix MED-2 to MED-4 (meta-tag rendering from DB)

### Anytime after
- The 13 LOW findings — cosmetic, documented for later.

**Estimated DNS-ready ETA:** 5–8 working days if the EN/RU routing fix (CRITICAL-1) lands on schedule. That is the single gating item — everything else is parallel workstreams or small SQL/template fixes.

---

## End of Report

**Verdict: 🔴 NOT READY FOR DNS SWITCH** as of 2026-04-16.
