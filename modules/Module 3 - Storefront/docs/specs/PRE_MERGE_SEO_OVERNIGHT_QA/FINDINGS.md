# FINDINGS — PRE_MERGE_SEO_OVERNIGHT_QA

> **Executor:** opticup-executor (Claude Code, Windows desktop)
> **Session:** 2026-04-15 (overnight run)
> **Previous session:** A first attempt from Cowork (Linux sandbox) correctly aborted at Criterion 2 because the Cowork container cannot reach Windows-host `localhost`. That run's findings (execution-environment + git lock) are superseded by this run, which ran the full audit end-to-end.
>
> Severity scale: **CRITICAL** (DNS blocker) · **HIGH** (SEO material impact) · **MEDIUM** (visible quality gap) · **LOW** (cosmetic / long-tail) · **INFO**

---

## FINDING-001 · MEDIUM · Sitemap at `/dist/client/sitemap-index.xml` points to wrong domain

- **Location:** `opticup-storefront/dist/client/sitemap-index.xml`, `sitemap-0.xml`, `robots.txt`
- **What:** The static Astro build emits a sitemap that hard-codes `https://opticup-storefront.vercel.app/...` as the origin of every `<loc>` — the Vercel preview URL, not the production origin `https://prizma-optic.co.il`. The companion `sitemap-index.xml` points at the same wrong origin. Static dist root also contains an old `robots.txt` with the same wrong domain in its `Sitemap:` directive.
- **Why it matters:** If Vercel ever serves the static file (e.g. fallback when `/sitemap-dynamic.xml` is temporarily unavailable) Google will be handed a sitemap pointing at a domain it cannot index. Link equity splits across two domains.
- **Mitigation that already exists:** `/sitemap-dynamic.xml` (245 `<loc>` entries, all on `https://prizma-optic.co.il`) is the sitemap actually served at runtime — and the live `/robots.txt` served from dev correctly points there. So the production path is working; the stale build artifact is the risk.
- **Suggested action:** in the next FIXES SPEC, either (a) delete `dist/client/sitemap-*.xml` + `robots.txt` if they are unused, or (b) rebuild with the correct `astro.config.mjs` `site:` and verify the emitted files match.
- **Evidence:** `artifacts/sitemap-check.json`; direct inspection of `opticup-storefront/dist/client/`.

---

## FINDING-002 · HIGH · 58 `<loc>` entries in `/sitemap-dynamic.xml` return 404

- **Location:** `opticup-storefront` sitemap endpoint; affected paths in `artifacts/sitemap-check.json.broken_locs`.
- **What:** The dynamic sitemap advertises 245 URLs; 58 of them 404 on the storefront. Every broken entry is under `/%D7%91%D7%9C%D7%95%D7%92/...` — the URL-encoded Hebrew `/בלוג/...` prefix — and each points at a Hebrew blog slug that no longer exists on the storefront.
- **Why it matters:** Google will flag these as "Discovered - currently not indexed" or "Soft 404," which degrades overall site quality signal.
- **Suggested action:** audit the sitemap generator that emits `/sitemap-dynamic.xml`. The 58 slugs likely correspond to pre-transliteration WP Hebrew blog paths superseded during the 2026-04-15 blog-migration SPEC (commit `dd0fe6f`, which transliterated 58 Hebrew blog slugs — the sitemap is almost certainly still pointing at the OLD slugs). Fix: re-run the sitemap generator against the current `storefront_pages`/`blog_posts` table.
- **Evidence:** `artifacts/sitemap-check.json` — every broken entry has `status: 404` and pathname starts with `/%D7%91%D7%9C%D7%95%D7%92/`. 58 == exactly the transliteration count in `BLOG_PRE_MERGE_FIXES`.

---

## FINDING-003 · HIGH · `og:image` missing on 73/100 top-traffic pages

- **Location:** storefront Astro layout / head-meta component that emits Open Graph tags.
- **What:** Every top-100 page has 6 of 7 OG meta tags (`og:title`, `og:description`, `og:type`, `og:url`, `og:locale`, `og:site_name`) — but **73 of 100 pages lack `og:image`**. Same set also lacks `twitter:image` → `twitter_complete` fails on those pages.
- **Breakdown by page type:** home 4/4 complete, brand pages **0/32 complete**, other (blog posts + locale index) **23/64 complete**.
- **Why it matters:** Social-preview cards on Facebook/LinkedIn/WhatsApp fall back to an auto-extracted image or nothing — noticeably lower CTR from social referrals; also one of Google's E-E-A-T quality signals.
- **Suggested action:** in FIXES SPEC: in `BaseLayout.astro` (or whichever head-meta component handles OG), emit `og:image` from the canonical page hero image or a sensible fallback (e.g., storefront logo for brand pages, blog featured image for posts). Same for `twitter:image`.
- **Evidence:** `artifacts/onpage-top100.json` — `og_complete: false` rows have `og:image` absent from the `og` object.

---

## FINDING-004 · MEDIUM · 77/100 top-traffic titles exceed 60 chars due to duplicated site suffix

- **Location:** storefront title generator (likely `BaseLayout.astro` + per-page `<title>`).
- **What:** Page titles render as `{page title} | אופטיקה פריזמה` — but the base title often already ends with `אופטיקה פריזמה`. Example (home): `אופטיקה פריזמה — משקפי ראייה ושמש מהמותגים המובילים | אופטיקה פריזמה`, 68 chars. 77 of the top 100 titles exceed the 60-char SERP truncation threshold; avg title length is 72 chars.
- **Why it matters:** Google truncates at ~60 chars — the trailing brand name gets cut, often mid-word. Also dilutes per-page topical relevance.
- **Suggested action:** in FIXES SPEC: detect the existing trailing brand name in page-level title and suppress the layout-level suffix; or shorten the suffix (e.g., `| פריזמה`).
- **Evidence:** `artifacts/onpage-top100.json` — `title_ok: false` on 77 rows; title min/max/avg = 40 / 107 / 72 chars.

---

## FINDING-005 · MEDIUM · 3 top-traffic brand pages have canonical pointing to index, not self

- **Location:** storefront brand-page route (`/brands/{slug}/`).
- **What:** After post-fix canonical comparator (see EXECUTION_REPORT §4), 3 of the top 100 pages have incorrect canonicals. All are brand pages:
  - `/brands/etnia/` → `<link rel="canonical" href="https://prizma-optic.co.il/brands">` (21 clicks)
  - `/brands/milo-me/` → same canonical (14 clicks)
  - `/brands/henryjullien/` → same canonical (9 clicks)
- **Why it matters:** Google consolidates ranking signal to `/brands` instead of the specific brand page. Every click these brand pages earn from organic is wasted on the wrong URL.
- **Suggested action:** FIXES SPEC — in the brand-page template (probably `src/pages/brands/[slug].astro`), set `<link rel="canonical">` to the self-URL, not the parent index.
- **Evidence:** `artifacts/onpage-top100.json` — rows where `canonical_ok: false`.

---

## FINDING-006 · HIGH · `/en/<bogus>/` and `/ru/<bogus>/` return 302 soft-redirect to locale home instead of 404

- **Location:** Astro i18n routing (probably `src/pages/[locale]/[...slug].astro` or middleware).
- **What:** Requesting a non-existent path under a locale prefix (e.g. `/en/unknown-article-xyz/`) returns HTTP 302 with `Location: /en/`. Only apex-locale probes (`/this-page-xyz/`) return a proper 404. Criterion 18 (sample probes all 404) fails because of the locale soft-redirect.
- **Why it matters:** Google classifies 302-to-home-after-404 as **soft 404** — the destination IS indexable but has zero intent-matching content for the original URL. This bleeds long-tail URLs into "duplicate without canonical" bucket and pollutes indexing signals.
- **Suggested action:** FIXES SPEC — the unknown-path handler under locales must return HTTP 404 (the same `<meta name="robots" content="noindex, follow">` page the apex currently serves). It is fine to keep the visual content friendly; what matters is the status code + the canonical tag.
- **Evidence:** `artifacts/404-check.json` — `probes[1].status=302`, `probes[2].status=302`; `probes[0].status=404` (apex).

---

## FINDING-007 · MEDIUM · 46 GSC URLs still redirect through 2 hops

- **Location:** `vercel.json` redirect configuration.
- **What:** 46 of the 1000 GSC URLs chain through **2 redirect hops** to reach the final 200 page (first hop: vercel.json rule; second hop: a separate vercel rule OR an Astro-side trailing-slash normalization). No chain exceeded 2 hops. Criterion 6 (≤ 1 hop) fails on 46 rows.
- **Why it matters:** Each extra 301 slightly reduces link-equity transfer (~10% per hop). Not catastrophic, but fixable.
- **Suggested action:** FIXES SPEC — identify the chained rules in `vercel.json` and collapse each chain into a single direct rule. `artifacts/redirect-coverage.csv` filtered by `redirect_hops=2` lists them exhaustively.
- **Evidence:** `artifacts/redirect-coverage.json.summary.multi_hop_count = 46`.

---

## FINDING-008 · MEDIUM · 27/100 top-traffic pages have < 95% `<img alt>` coverage

- **Location:** storefront image-rendering templates (blog, brand hero, product gallery).
- **What:** 27 of the top 100 pages contain `<img>` tags without a non-empty `alt` attribute at rates below the SPEC's 95% threshold. Median offending page sits around 85–90%. No page is at 0%.
- **Why it matters:** Accessibility score (Lighthouse flagged this too) + lost image-search impressions.
- **Suggested action:** FIXES SPEC — audit the WP-ported blog image renderer (in `BLOG_PRE_MERGE_FIXES`, the rewrite in commit `dd0fe6f` swapped WP URLs for `/api/image/media/` proxy paths; alt preservation was not a focus). Also the brand hero components.
- **Evidence:** `artifacts/onpage-top100.json` — `img_alt_coverage < 0.95` rows.

---

## FINDING-009 · MEDIUM · Lighthouse SEO category below 100 on top-20 (avg 91.7, dev mode)

- **Location:** Top-20 GSC URLs, dev server (Astro).
- **What:** Average Lighthouse scores on mobile emulation against the dev server:
  - Performance **59.5** (target 85)
  - Accessibility **94.5** (target 90 ✓)
  - Best Practices **81.1** (target 90)
  - SEO **91.7** (target 100)
- **Why it matters:** Dev-mode scores are known to under-represent production (no image optimization, no minification, no edge caching). The SEO category is the most reliable indicator here — 91.7 instead of 100 suggests fixable on-page issues (likely tied to FINDING-003, FINDING-004, FINDING-008).
- **Suggested action:** re-run Lighthouse against production post-deploy; if SEO still < 100, use the category detail in `artifacts/lighthouse/<slug>.json` to target specific audits.
- **Evidence:** `artifacts/lighthouse-summary.json` + per-URL `artifacts/lighthouse/*.json`.

---

## FINDING-010 · LOW · `opticup-storefront/scripts/validate-redirects.mjs` does not exist

- **Location:** referenced by SPEC Criterion 23 and §2 Background.
- **What:** The SPEC assumes a `validate-redirects.mjs` script in the storefront repo to cross-check redirect coverage. It is absent. Only `build-wp-redirect-map.mjs` and `apply-wp-redirects.mjs` are present.
- **Why it matters:** Criterion 23 (redirect-validator parity) cannot be directly evaluated. This audit's `artifacts/redirect-coverage.csv` now IS the authoritative verification; the parity check is skipped.
- **Suggested action:** either (a) treat `artifacts/redirect-coverage.csv` as the canonical verifier going forward; or (b) create `validate-redirects.mjs` in the storefront repo wrapping the logic already implemented in `02_check_redirects.mjs`. Noted as `artifacts/redirect-parity.json` for traceability.
- **Evidence:** `ls opticup-storefront/scripts/ | grep redirect` shows only the two build scripts.

---

## FINDING-011 · LOW · `sitemap-dynamic.xml` emits only 245 `<loc>` (storefront has ~1000 discoverable URLs)

- **Location:** storefront sitemap generator.
- **What:** The dynamic sitemap publishes 245 URLs. The GSC Pages.csv alone has 1000 URLs Google knows about. Even after 58 dead sitemap entries are dropped, the live sitemap (187 effective) omits most of the site's real surface area — products, brand sub-pages, blog posts beyond the first tranche, category archives.
- **Why it matters:** Google's discovery is slower and more partial. Not fatal (Google will still crawl via internal links), but sub-optimal for a freshly-migrated site.
- **Suggested action:** FIXES SPEC — review the sitemap generator's source query and include all published `storefront_pages` + `blog_posts` + `products` + `brands` rows where `is_deleted = false` AND `is_published = true`.
- **Evidence:** `artifacts/sitemap-check.json.total_locs = 245`; `artifacts/pages.json.pages_count = 1000`.

---

## FINDING-012 · LOW · robots.txt contains two `Sitemap:` directives, one pointing to a non-existent index

- **Location:** storefront `public/robots.txt` (served at `http://localhost:4321/robots.txt`).
- **What:** robots.txt declares BOTH:
  - `Sitemap: https://prizma-optic.co.il/sitemap-dynamic.xml` ← works (200)
  - `Sitemap: https://prizma-optic.co.il/sitemap-index.xml` ← does NOT exist at runtime (Astro dev returns 404; production would also 404 unless the static build file is served)
- **Why it matters:** Google will attempt both and log the second as a fetch error. Harmless but noisy in GSC.
- **Suggested action:** FIXES SPEC — drop the second `Sitemap:` directive unless `/sitemap-index.xml` is confirmed to be served. Align with the fix for FINDING-001.
- **Evidence:** `artifacts/robots-check.json.sitemap_directives`.

---

## FINDING-013 · INFO · 805 queries have LOW confidence query-term match on landing page

- **Location:** n/a — this is a measurement artifact.
- **What:** 805 of 1000 GSC queries were classified as LOW confidence by `07_query_coverage.mjs`. Breakdown: 954 had a guessed landing page; only 58 HIGH + 137 MEDIUM contained the literal or near-literal query term on the page.
- **Why it matters:** "LOW confidence" here doesn't mean the page is wrong — Hebrew morphology, synonyms, and pronoun variations aren't matched by the script's exact-substring approach. But 805 LOW rows ARE the pool from which false-LOW (i.e., legitimately-good pages) vs true-LOW (pages that don't actually talk about the query's intent) should be separated.
- **Suggested action:** if SEO becomes a priority after DNS, do a manual spot-check of the top-20 queries by clicks that came back LOW. Any that are genuinely off-topic → content improvement.
- **Evidence:** `artifacts/query-coverage.json`.

---

## FINDING-014 · INFO · Astro dev server does not serve `vercel.json` redirects

- **Location:** Astro dev vs Vercel runtime.
- **What:** During this audit I discovered (and accommodated) the fact that `npm run dev` does not process `vercel.json`. All 1668 redirect rules in `vercel.json` are effectively only active in production. The audit simulates them in `02_check_redirects.mjs`, but the simulation is only as good as the simulator.
- **Why it matters:** Any redirect behavior that depends on Vercel features not reproducible in Node (e.g., `has.cookie`, edge middleware, Image Optimization) cannot be dev-verified. This audit honors `has.host` and pattern substitution but does not cover the full Vercel matcher surface.
- **Suggested action:** post-deploy, re-run `02_check_redirects.mjs` against the production URL to confirm simulation matched reality. Small delta expected.
- **Evidence:** `curl http://localhost:4321/home/` returns 404 (no vercel.json redirect fired) while `vercel.json` declares `/home/` → `/`.

---

## Summary by severity

| Severity | Count | IDs |
|---|---:|---|
| CRITICAL | 0 | — |
| HIGH | 3 | FINDING-002, FINDING-003, FINDING-006 |
| MEDIUM | 6 | FINDING-001, FINDING-004, FINDING-005, FINDING-007, FINDING-008, FINDING-009 |
| LOW | 3 | FINDING-010, FINDING-011, FINDING-012 |
| INFO | 2 | FINDING-013, FINDING-014 |

**No finding is a CRITICAL DNS-switch blocker.** The three HIGH findings are quality issues that accumulate SEO debt but do not break the migration. Daniel can proceed with DNS switch; the findings above fold into a follow-up `PRE_MERGE_SEO_FIXES` SPEC.
