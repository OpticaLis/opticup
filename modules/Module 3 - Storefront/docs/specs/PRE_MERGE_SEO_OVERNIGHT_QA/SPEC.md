# SPEC — PRE_MERGE_SEO_OVERNIGHT_QA

> **Location:** `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session 2026-04-15)
> **Authored on:** 2026-04-15
> **Module:** 3 — Storefront
> **Phase:** Pre-DNS-Switch QA (final gate before merge-to-main)
> **Execution mode:** OVERNIGHT (read-only, automated where possible, takes 3–8 hours)
> **Scope:** AUDIT ONLY — no writes to DB, no code changes, no git commits touching code. Only new files under this SPEC's folder.
>
> ## ⚙ RUN-TO-COMPLETION DIRECTIVE (Daniel-approved, 2026-04-15)
>
> This is a **fully read-only overnight audit**. Daniel explicitly authorized
> maximum autonomy: **run end-to-end without stopping on findings**. Findings
> are DATA, not reasons to halt — log them to `FINDINGS.md` and keep going.
>
> - Do NOT stop because the MISSING-URL count is high. The whole purpose is
>   to enumerate MISSING URLs; the bigger the list, the more valuable the audit.
> - Do NOT stop because a single URL fails, times out, returns 5xx. Retry
>   once with a 2s backoff, mark the final status, move on.
> - Do NOT stop because on-page signals are missing on individual pages —
>   record the gap per-page, aggregate at the end.
> - Do NOT stop because Lighthouse fails on one URL. Retry once, then move on.
> - Do NOT stop for "this looks bad" judgment calls. The report is what
>   quantifies "how bad."
> - **Only stop for hard safety violations** in §4 "What REQUIRES stopping"
>   (file writes outside SPEC folder, DB mutations, git outside develop,
>   merge to main, or `localhost:4321` unreachable after 10 retries over 5 min).
>
> **Thoroughness over speed.** If a choice arises between finishing faster
> and producing more complete data, choose more complete data. The window
> is overnight — use it.

---

## 1. Goal

Produce a single authoritative report — `SEO_QA_REPORT.md` — that tells Daniel exactly which URLs Google currently indexes for Prizma **will or will not** survive the DNS switch from WordPress to Vercel, which ranking queries are at risk, and whether every other SEO-ranking signal (redirects, canonical tags, hreflang, sitemap, robots.txt, schema markup, meta tags, Core Web Vitals, HTTPS canonicalization) is ready. The report's MISSING-URL section, sorted by GSC traffic, is the single list of items that must be fixed before Daniel flips DNS.

---

## 2. Background & Motivation

- Daniel exported two CSVs from Google Search Console on 2026-04-06: `Pages.csv` (1000 indexed URLs with clicks/impressions/CTR/position) and `Queries.csv` (1000 ranking queries with the same metrics). These files live on his desktop at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\Pages.csv` and `Queries.csv`. They are the **authoritative ground truth** of what Google currently knows about `prizma-optic.co.il`.
- Module 3 (Storefront) is code-complete (see `MASTER_ROADMAP.md` §3). Blog pre-merge content cleanup landed today in SPEC `BLOG_PRE_MERGE_FIXES` (`678a82e`→`3e92f7f`). The sole remaining gate before DNS switch is **Daniel's localhost QA pass** (`docs/QA_HANDOFF_2026-04-14.md`).
- `QA_HANDOFF` Test 1 ("SEO Validator: 100% WordPress URLs covered") checks only the internal `seo-audit/url-inventory.md` list — it does **not** use GSC data, so it cannot tell us whether URLs Google discovered through external links or historical crawls are covered. This SPEC closes that gap using the CSVs as ground truth.
- Existing SEO infrastructure that MUST be leveraged (Iron Rule #21 — no duplicates):
  - `opticup-storefront/vercel.json` — redirect rules
  - `opticup-storefront/scripts/validate-redirects.mjs` — existing redirect validator
  - `modules/Module 3 - Storefront/seo-audit/url-inventory.md` + `.json` — WP URL catalog from earlier audit
  - `modules/Module 3 - Storefront/seo-audit/url-mapping-template.csv` — WP→new URL mapping
  - `modules/Module 3 - Storefront/seo-audit/data/wp-pages-{he,en,ru}.json` — parsed WP content

This SPEC adds a **GSC-driven** layer on top of these, and does not modify any of them.

---

## 3. Success Criteria (Measurable)

Every criterion is verifiable with a concrete command or file check. The executor runs all criteria sequentially and records the result of each in `EXECUTION_REPORT.md`.

| # | Criterion | Expected value | Verify command / evidence |
|---|-----------|---------------|---------------------------|
| 1 | Branch state at SPEC start | `develop`, clean tree | `git status` → "nothing to commit, working tree clean" (after handling any pre-existing per CLAUDE.md First Action step 4) |
| 2 | Two storefront dev servers are reachable | `http://localhost:4321/` returns HTTP 200 AND `http://localhost:3000/` returns HTTP 200 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/` → `200`; same for :3000. **Executor MUST NOT start these servers itself.** If either returns non-200, retry 10 times with 30-second backoff (total 5 min). Only if still unreachable after the full retry window → STOP and write a partial `EXECUTION_REPORT.md` noting the blocker. Otherwise continue the audit. :3000 is sanity-only; if it's down but :4321 is up, log a LOW finding and continue — most checks don't need :3000. |
| 3 | GSC CSVs are present and parseable | `Pages.csv` has ≥ 900 data rows; `Queries.csv` has ≥ 900 data rows | `node scripts/seo-overnight/01_parse_gsc.mjs` writes `artifacts/pages.json` + `artifacts/queries.json` with `entries.length ≥ 900` each |
| 4 | Every URL in `Pages.csv` has a verdict | 100% of GSC URLs classified as `OK_200` \| `OK_301_REDIRECT` \| `OK_410_INTENTIONAL` \| `MISSING` (no blanks) | `artifacts/redirect-coverage.json` — every row has non-null `verdict` field |
| 5 | MISSING URLs by traffic — the headline list | Sorted list of all `MISSING` URLs with clicks + impressions + position from GSC, and a suggested redirect target if the URL path structure maps cleanly to a new storefront page | `SEO_QA_REPORT.md` §2 "Missing URLs (Traffic-Ranked)" — table with columns `url, clicks, impressions, ctr, position, suggested_target, confidence` |
| 6 | Redirect chain length | 0 multi-hop redirects (every GSC URL redirects at most once) | `redirect-coverage.json` — every row's `redirect_hops ≤ 1` OR `verdict = MISSING` |
| 7 | HTTPS canonicalization | Every `http://prizma-optic.co.il/...` URL in GSC redirects to `https://...` with 301 | `scripts/seo-overnight/02_check_redirects.mjs` flags any `http→http` or `http→200` as a finding |
| 8 | www canonicalization | Decision recorded: either `www.prizma-optic.co.il` or `prizma-optic.co.il` is canonical. All indexed URLs resolve to the canonical form via 301 if needed. | `SEO_QA_REPORT.md` §3.1 records which host is canonical + whether GSC-listed hosts match. Finding if mismatched. |
| 9 | Trailing-slash consistency | The new site consistently either keeps or strips trailing slash. Mixed behavior is a finding. | `SEO_QA_REPORT.md` §3.2 records the canonical trailing-slash policy and lists any URLs that violate it. |
| 10 | Top 100 traffic pages — canonical tag | Each top-100-by-traffic page has a self-referential `<link rel="canonical">` (canonical URL == resolved URL) | `artifacts/onpage-top100.json` — `canonical_ok = true` for every row |
| 11 | Top 100 traffic pages — hreflang | Multilingual pages (he/en/ru) have `<link rel="alternate" hreflang="he">`, `hreflang="en"`, `hreflang="ru"`, and `hreflang="x-default"` — all pointing at live URLs | `artifacts/onpage-top100.json` — `hreflang_count ≥ 3` AND `hreflang_all_resolve = true` for each multilingual page |
| 12 | Top 100 traffic pages — meta title + description | Every top-100 page has non-empty `<title>` (≤ 60 chars) and `<meta name="description">` (≤ 160 chars, preferably 120–160) | `artifacts/onpage-top100.json` — `title_ok = true`, `desc_ok = true` |
| 13 | Top 100 traffic pages — Open Graph + Twitter card | Every top-100 page has `og:title`, `og:description`, `og:image`, `og:url`, `og:type`; `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` | `artifacts/onpage-top100.json` — `og_complete = true`, `twitter_complete = true` |
| 14 | Top 100 traffic pages — schema.org JSON-LD | Every top-100 page has at least one valid JSON-LD block (parsed without error). Blog posts have `Article` or `BlogPosting`. Product pages have `Product`. Homepage has `Organization` or `LocalBusiness`. | `artifacts/onpage-top100.json` — `jsonld_count ≥ 1`, `jsonld_parse_ok = true`, `jsonld_types` includes the expected type for that page class |
| 15 | sitemap.xml exists and is valid | `https://localhost:4321/sitemap.xml` (or `sitemap-index.xml`) returns 200 and contains ≥ 50 `<loc>` entries. Every `<loc>` entry returns 200 when HEAD-checked. | `scripts/seo-overnight/03_check_sitemap.mjs` writes `artifacts/sitemap-check.json`; `valid = true`, `broken_locs.length = 0` |
| 16 | robots.txt exists and is sane | `https://localhost:4321/robots.txt` returns 200. It does NOT contain `Disallow: /`. It contains at least one `Sitemap:` directive pointing to the sitemap found in #15. | `artifacts/robots-check.json` — `disallow_all = false`, `sitemap_directive_present = true`, `sitemap_url_resolves = true` |
| 17 | No accidental `noindex` on indexed pages | None of the top-100 traffic pages (and ideally none of ALL 1000 GSC URLs that resolve 200) contain `<meta name="robots" content="noindex">` or `X-Robots-Tag: noindex` in response headers | `artifacts/onpage-top100.json` — `noindex = false` for all rows. Additionally `artifacts/noindex-sweep.json` scans every URL in Pages.csv that resolves 200 (lightweight — just the meta-robots + header check) |
| 18 | 404 page returns actual 404 status | Requesting a known-bad URL (e.g. `/this-page-does-not-exist-{timestamp}/`) returns HTTP 404, not 200 with a 404-looking body | `scripts/seo-overnight/04_check_404.mjs` → exit 0 |
| 19 | Query coverage — ALL queries in Queries.csv | For **all 1000 queries** in `Queries.csv`: (a) cross-reference with Pages.csv to identify the likely landing page, (b) if found and that URL is OK_200 in redirect-coverage.json, visit the page and check whether the query term appears in `<title>`, `<h1>/<h2>`, or body text. Record confidence HIGH/MEDIUM/LOW. For queries with no landing-page match in Pages.csv, mark `landing_page_url = null` and `confidence = LOW`. | `artifacts/query-coverage.json` — 1000 rows, every row has `landing_page_url`, `query_term_appears_on_page`, `confidence`. Top-100 queries (by clicks) get a deeper check including synonym/stem matches |
| 20 | Internal link audit — top 100 pages + full site crawl cross-check | For each of the top-100 pages, extract every `<a href>` and HEAD-check non-external links. Flag any returning 404/5xx. Additionally, extract every `<a href>` from the homepage recursively one level deep to produce a broader link-integrity sample. | `artifacts/internal-links.json` — `broken_count`, `broken_list` (array), per-page summary. Finding per broken link cluster. |
| 21 | Lighthouse — top 20 traffic URLs | Lighthouse CLI run on top 20 URLs in mobile emulation (simulates Googlebot more closely than desktop). Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90, SEO = 100. If CLI fails on a URL, retry once with 5s backoff, then record error and continue. | `artifacts/lighthouse/*.json` — 20 reports; averages + per-URL table computed in `SEO_QA_REPORT.md` §6 |
| 22 | Image alt coverage — top 100 pages | ≥ 95% of `<img>` tags on top-100 pages have non-empty `alt=""` | `artifacts/onpage-top100.json` — `img_alt_coverage ≥ 0.95` for each page |
| 23 | Redirect validator parity | The existing `opticup-storefront/scripts/validate-redirects.mjs` (if it runs against GSC URLs) confirms the same MISSING set as this SPEC's output | `node scripts/validate-redirects.mjs` exit code = 0 OR its output is captured and diff'd against `redirect-coverage.json`; any delta becomes a finding |
| 24 | Final report assembled | `SEO_QA_REPORT.md` present in this SPEC folder, contains all 10 required sections (see §8) | `ls SEO_QA_REPORT.md` exit 0; `grep -c "^##" SEO_QA_REPORT.md` ≥ 10 |
| 25 | EXECUTION_REPORT + FINDINGS present | Both files exist in SPEC folder at close | `ls EXECUTION_REPORT.md FINDINGS.md` exit 0 |

**Pass threshold for green-light DNS switch:**
- Criteria 1, 2, 4, 6, 7, 15, 16, 17, 18, 23, 24, 25 → **MUST pass**
- Criterion 5 → MUST pass with `HIGH`-confidence redirect target for every MISSING URL carrying ≥ 10 clicks in GSC. Lower-traffic MISSING URLs can be batched into a catch-all wildcard redirect, but each one must appear in the report.
- Remaining criteria are findings-graded (LOW / MEDIUM / HIGH) but do not by themselves block DNS switch; they may block if HIGH severity.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo (this repo + sibling `opticup-storefront`)
- Run read-only SQL (Level 1 autonomy) — may need to look up tenant UUID, `storefront_pages`, blog post slugs
- Create files **only inside** `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/` (SPEC folder) or `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/scripts/` / `artifacts/`
- Install ad-hoc Node packages into `scripts/seo-overnight/node_modules/` (e.g. `node-fetch`, `jsdom`, `p-limit`, `csv-parse`) — `package.json` scoped to this SPEC only, not repo-wide
- Make HTTP requests to `localhost:4321` and `localhost:3000` at polite concurrency (≤ 10 parallel, ≤ 2 req/sec per host)
- Commit the final audit artifacts under this SPEC folder with message `chore(seo): overnight SEO QA report`

### What REQUIRES stopping and reporting
- Any file in `FROZEN_FILES.md` being touched
- Any write to any file **outside** this SPEC's folder (including `vercel.json`, `seo-audit/`, storefront source, any DB mutation). This SPEC is AUDIT-ONLY.
- Any schema change (DDL) — Level 3 autonomy is never autonomous
- Any merge to `main`
- `localhost:4321` unreachable after 10 retries over 5 minutes (see Criterion 2 wording — retry before stopping). `localhost:3000` being down alone is NOT a stop condition, just a LOW finding.
- **~~Total MISSING-URL count > 100~~** — REMOVED per Daniel's 2026-04-15 run-to-completion directive. Report every MISSING URL no matter how many; the whole point is the full enumeration.
- **~~Output diverges from §3 by 2×~~** — REMOVED for same reason. Record the divergence as a finding and keep going. The one exception is Criterion 3: if Pages.csv/Queries.csv are **missing entirely**, STOP (can't audit what you can't read).

### External HTTP requests
- In-scope: `http://localhost:4321`, `http://localhost:3000`
- Out-of-scope: the **live** `https://prizma-optic.co.il` (this is still the WordPress site; hitting it adds no value and risks confusing the audit). If a redirect chain terminates at the live WP site, record that as the verdict but do not follow through to WP.
- Also out-of-scope: `https://www.instagram.com/...`, `https://google.com/...`, or any other third-party URL that appears in `Queries.csv` or page content.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

**Run-to-completion directive overrides any "stop on finding" instinct.** Only the following are genuine stop conditions:

- `Pages.csv` or `Queries.csv` **not found at all** at the expected path → STOP (can't audit what you can't read)
- `localhost:4321` unreachable after 10 retries over 5 minutes → STOP (per Criterion 2 — `localhost:3000` down alone is NOT a stop condition)
- Any script attempting to write **outside** `PRE_MERGE_SEO_OVERNIGHT_QA/` folder → STOP (hard safety)
- `storefront/scripts/validate-redirects.mjs` not found → continue the audit WITHOUT comparing to it; log a finding. Do NOT modify or replace it (Rule 21). If it's **modified** (i.e. someone edited it outside this SPEC), STOP and report.
- Any observed write to Supabase (INSERT / UPDATE / DELETE / DDL) → STOP immediately (hard safety, this SPEC is read-only)
- Any attempt to commit files outside this SPEC's folder in the final commit → STOP
- The executor cannot determine the canonical host (www vs apex) **without writing to config** → record the ambiguity as a finding and continue. Do NOT modify config. Do not stop.

**Explicit non-stop conditions (Daniel's 2026-04-15 directive):**
- A single URL times out or errors → retry once with 2s backoff, then mark final status and move on
- A single Lighthouse run fails → retry once, then mark error and move on
- Any number of MISSING URLs, broken canonicals, missing hreflang, missing meta tags, missing OG tags, missing JSON-LD, missing alt text, broken internal links, noindex hits, or low Lighthouse scores → log to `FINDINGS.md`, aggregate in the report, **keep running**.
- Redirect chain > 1 hop → log as finding, continue. Chains up to 5 hops are recorded in full; > 5 hops aborted at 5 and logged as CHAIN_TOO_DEEP but not a stop.
- A URL response is unexpectedly large (e.g. > 10MB) → truncate to first 2MB for parsing, log as finding, continue.

---

## 6. Rollback Plan

This SPEC produces **audit artifacts only**. There is no rollback needed for the audit itself. If the SPEC is aborted mid-run:

- Any partial artifacts in `artifacts/` can be deleted: `rm -rf modules/Module\ 3\ -\ Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/artifacts/`
- Any partial commit can be reset: `git reset --hard {START_COMMIT}` where START_COMMIT = the hash of `git log -1 --format=%H` captured at §9 commit 0.
- No DB state to restore (read-only SPEC).
- No storefront state to restore (read-only SPEC).

If the audit reveals blockers (MISSING URLs, noindex leaks, broken sitemap), those are tracked in `FINDINGS.md` and each becomes a candidate for a separate FIXES SPEC — **never rolled into this audit SPEC**.

---

## 7. Out of Scope (explicit)

These look related but MUST NOT be touched in this SPEC:

- **Fixing any finding.** If a URL is MISSING, do NOT add a redirect to `vercel.json`. If canonical is wrong, do NOT edit the storefront source. If a meta tag is missing, do NOT edit the page. Fixes happen in a **separate FIXES SPEC** after Daniel reviews this audit.
- `opticup/modules/Module 3 - Storefront/seo-audit/*` — this directory is the prior WP-only inventory; leave it alone, only read from it.
- `opticup/modules/Module 3 - Storefront/docs/QA_HANDOFF_2026-04-14.md` — owned by the QA handoff flow; this SPEC runs in parallel to it and does not modify it.
- Any DB tables — no `UPDATE`, no `INSERT`, no `DELETE`, no DDL.
- Production URLs — do not crawl `https://prizma-optic.co.il` (still WP). Do not crawl `https://www.prizma-optic.co.il`. Do not crawl any third-party site.
- Google's indexing itself — this SPEC does not submit anything to GSC. No `submit URL` requests. No sitemap ping. Purely local verification.

---

## 8. Expected Final State

After the executor finishes, the repo contains:

### New files (all under `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/`)

**Scripts** (`scripts/seo-overnight/`):
- `scripts/seo-overnight/package.json` — local dependencies (`csv-parse`, `jsdom`, `node-fetch` or native fetch, `p-limit`, `@lhci/cli` or `lighthouse`)
- `scripts/seo-overnight/01_parse_gsc.mjs` — read `Pages.csv` + `Queries.csv`, normalize URLs (strip trailing slash rules, decode `%XX`, unify host), emit `artifacts/pages.json` + `artifacts/queries.json`
- `scripts/seo-overnight/02_check_redirects.mjs` — for each GSC URL: follow redirects (max 5 hops), record final URL, status code, redirect hops, HTTPS canonical status, trailing-slash behavior. Output: `artifacts/redirect-coverage.json` + `.csv`
- `scripts/seo-overnight/03_check_sitemap.mjs` — fetch `/sitemap.xml` (and `/sitemap-index.xml` if present), parse `<loc>` entries, HEAD-check each. Output: `artifacts/sitemap-check.json`
- `scripts/seo-overnight/04_check_404.mjs` — request a random non-existent URL, assert 404 status. Output: `artifacts/404-check.json`
- `scripts/seo-overnight/05_onpage_top100.mjs` — for top-100 traffic URLs: fetch HTML via jsdom, extract `<title>`, meta description, canonical, hreflang entries, OG tags, Twitter card, JSON-LD blocks (parse + type-check), `<meta name="robots">`, image alt coverage, internal link list. Output: `artifacts/onpage-top100.json`. Additionally runs a lightweight noindex sweep on all 1000 Pages.csv URLs → `artifacts/noindex-sweep.json`
- `scripts/seo-overnight/06_internal_links.mjs` — for each top-100 page's extracted internal links: HEAD-check. Output: `artifacts/internal-links.json`
- `scripts/seo-overnight/07_query_coverage.mjs` — for ALL 1000 queries in Queries.csv: find the GSC landing page (cross-reference Pages.csv), then visit that page (if OK_200) and check whether the query term appears in `<title>`, `<h1>`, `<h2>`, body text. Record confidence. Output: `artifacts/query-coverage.json`. Top-100 queries get a deeper synonym/stem-based match pass.
- `scripts/seo-overnight/08_lighthouse.mjs` — wrapper around `lighthouse` CLI, runs on top 20 URLs in mobile emulation, outputs JSON per URL into `artifacts/lighthouse/`. On per-URL failure: retry once with 5s backoff, then record error and continue.
- `scripts/seo-overnight/09_assemble_report.mjs` — reads all artifacts, produces `SEO_QA_REPORT.md` with the 10 sections listed below
- `scripts/seo-overnight/README.md` — how to run (order: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09), prerequisites (servers running), expected runtime

**Artifacts** (`artifacts/`):
- `artifacts/pages.json`, `artifacts/queries.json` — normalized GSC data
- `artifacts/redirect-coverage.json` + `.csv` — per-URL verdict
- `artifacts/sitemap-check.json`
- `artifacts/robots-check.json`
- `artifacts/404-check.json`
- `artifacts/onpage-top100.json`
- `artifacts/noindex-sweep.json` — lightweight meta-robots/X-Robots-Tag check across all Pages.csv URLs that resolve 200
- `artifacts/internal-links.json`
- `artifacts/query-coverage.json`
- `artifacts/lighthouse/{url-slug}.json` × 20

**Reports** (root of SPEC folder):
- `SPEC.md` — this file (already present when executor arrives)
- `SEO_QA_REPORT.md` — the authoritative human-readable output. Required sections:
  1. Executive Summary (verdict: GREEN / YELLOW / RED for DNS switch)
  2. Missing URLs (Traffic-Ranked) — **the headline list**
  3. Redirect Chain & HTTPS Canonicalization
  4. Sitemap & robots.txt
  5. Top-100 On-Page Signals (canonical, hreflang, meta, OG, schema, noindex, alt) + site-wide noindex sweep
  6. Lighthouse Scores (top 20 URLs, mobile emulation)
  7. Query Coverage (ALL 1000 queries, with deeper match for top 100)
  8. Internal Link Integrity
  9. Structured Data (schema.org) Summary
  10. Findings & Recommended Next SPEC
- `EXECUTION_REPORT.md` — executor's retrospective (per folder-per-SPEC protocol)
- `FINDINGS.md` — severity-tagged findings (INFO / LOW / MEDIUM / HIGH / CRITICAL)

### Modified files
- None outside this SPEC folder.

### Deleted files
- None.

### DB state
- Unchanged. This SPEC is read-only.

### Docs updated (MUST include)
- `MASTER_ROADMAP.md` §3 — add one line: "Overnight SEO audit complete (SPEC `PRE_MERGE_SEO_OVERNIGHT_QA`) — verdict: {GREEN/YELLOW/RED}, {N} MISSING URLs queued for fixes SPEC."
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — add entry under current-state describing the audit result
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — add the single commit

No updates to `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `MODULE_MAP.md`, `MODULE_SPEC.md` — this SPEC is audit-only and changes no contracts.

---

## 9. Commit Plan

**This SPEC produces ONE commit total.** Audit artifacts are a single logical unit and should land as a single atomic commit so future archaeology can trace the entire audit to one hash.

- Commit 0 (reference, not written): capture `git rev-parse HEAD` at SPEC start into `EXECUTION_REPORT.md` for rollback reference.
- Commit 1: `chore(seo): overnight SEO QA audit — {N} MISSING URLs, {verdict}` — all scripts + all artifacts + `SEO_QA_REPORT.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` + MASTER_ROADMAP / SESSION_CONTEXT / CHANGELOG updates.

Use `git add` with explicit paths. Per Iron Rule #9 and CLAUDE.md §9 rule 6: NEVER `git add -A` or `git add .`.

---

## 10. Dependencies / Preconditions

### Servers
- **Storefront dev server running at `http://localhost:4321/`** — Daniel starts this with `cd opticup-storefront && npm run dev` (or equivalent per his setup). The executor MUST NOT try to start it.
- **ERP dev server running at `http://localhost:3000/`** — Daniel starts this per the project's usual flow. Not strictly needed for the audit, but listed in Criterion 2 as a sanity check because some storefront pages may call back to ERP endpoints during render.

### Credentials
- Supabase MCP configured for read-only SQL (already standard in executor sessions).
- No new credentials required. No Google API access required — the GSC data is pre-exported as CSVs.

### Tools
- Node.js ≥ 20 (for native fetch). If < 20, install `node-fetch` as a dep.
- `lighthouse` CLI or `@lhci/cli` — installed into this SPEC's `scripts/seo-overnight/node_modules/` only.
- Chrome / Chromium binary on the host — required by Lighthouse (`CHROME_PATH` env var). On Daniel's Windows desktop, this typically resolves automatically.

### Input files
- `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\Pages.csv` — 1000 URLs
- `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\Queries.csv` — 1000 queries

If either file is missing or shorter than 900 data rows (Criterion 3) → STOP.

### Previous SPECs that must be closed
- `BLOG_PRE_MERGE_FIXES` — must be CLOSED (🟡 or 🟢). Status confirmed 2026-04-15 in that folder's `FOREMAN_REVIEW.md`. ✅
- `MODULE_3_CLOSEOUT` — must be CLOSED. ✅
- `TENANT_FEATURE_GATING_AND_CLEANUP` — must be CLOSED. ✅

### CRITICAL EXECUTION-ENVIRONMENT PRECONDITION (added 2026-04-15 after first-attempt abort)

**This SPEC MUST be executed from Claude Code running directly on Daniel's Windows desktop — NOT from a Cowork sandbox chat.**

Rationale: the Cowork sandbox is an isolated Linux container; its `localhost` is the container's own loopback, not the Windows host's. When the storefront dev server is running via `npm run dev` on Windows, it binds to `127.0.0.1:4321` on Windows — which is reachable by Chrome on Windows and by Claude Code running on Windows, but **NOT** by the Cowork Linux container. Criterion 2 will never pass in a Cowork session, and a first-attempt execution on 2026-04-15 correctly aborted for that reason.

**The executor MUST verify the environment before starting:**
1. `node -e "console.log(process.platform)"` → should print `win32` (Windows). If it prints `linux` → STOP immediately, this is a Cowork sandbox, wrong environment.
2. `git rev-parse --show-toplevel` → should return a Windows path like `C:/Users/User/opticup`. If it returns a Linux path like `/sessions/.../mnt/opticup` → STOP, wrong environment.
3. Only AFTER those two checks pass → proceed to Criterion 2 (localhost reachability).

If the environment check fails, the executor writes a 3-line `EXECUTION_REPORT.md` stating "Wrong environment — needs Windows Claude Code, not Cowork" and exits. Daniel re-dispatches from the correct environment.

---

## 11. Lessons Already Incorporated

Proposals harvested from the three most recent `FOREMAN_REVIEW.md` files — each one is either APPLIED here, or explicitly marked NOT APPLICABLE with a reason.

- **FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` §6 Proposal 1** ("Re-enumerate any count cited by a prior audit before writing it into §7/§8 of a new SPEC") → **APPLIED.** Criterion 3 requires re-counting `Pages.csv` and `Queries.csv` row counts live before relying on "1000 URLs" in the SPEC narrative. §8 "Expected Final State" references "top 20 by traffic" — a live-sortable quantity — rather than a hardcoded count.
- **FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` §6 Proposal 2** ("Name ONE canonical form when a success criterion involves a URL scheme or render pattern that has two valid forms") → **APPLIED.** Criterion 9 (trailing-slash consistency) explicitly forces the executor to pick ONE canonical policy rather than accept both. Criterion 10 (canonical tag) requires self-referential canonical (one form only).
- **FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` §7 Proposal 1** ("PostgreSQL POSIX regex non-greedy gap — document the `([^<]|<[^/]|</[^a])*` alternative") → **NOT APPLICABLE.** This SPEC does no PostgreSQL regex work. Audit runs in Node.js (standard ECMAScript regex with non-greedy support).
- **FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` §7 Proposal 2** ("NTFS git index.lock workarounds — `os.rename` and `GIT_INDEX_FILE=/tmp/git_index_tmp`") → **APPLIED** as executor-side environmental guidance. This SPEC creates many small files; executor should be prepared for the NTFS quirk during commit. Noted in §9 commit plan.
- **FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` §4 disposition of FINDING-004** ("Criteria 14/15/16 UNVERIFIED when localhost:4321 is not reachable from Cowork") → **APPLIED** as Criterion 2 + Stop-Trigger. This SPEC runs on **Daniel's desktop**, not Cowork. If Criterion 2 fails → STOP; do not attempt to fake the audit with remote or archived data.
- **FROM `MODULE_3_CLOSEOUT/FOREMAN_REVIEW.md`** (if present) → scanned; no directly applicable proposals (that SPEC was about tenant feature gating, not SEO). Leaving learning-loop trace for completeness.
- **FROM `TENANT_FEATURE_GATING_AND_CLEANUP/FOREMAN_REVIEW.md`** (if present) → scanned; no directly applicable proposals. Leaving learning-loop trace for completeness.

---

## 12. Execution Pacing Guidance

An overnight run should budget roughly:

| Phase | Scripts | Rough duration |
|-------|---------|----------------|
| Setup + GSC parsing | 01 | 5 min |
| Redirect coverage (1000 URLs) | 02 | 30–60 min (depends on concurrency and server latency) |
| Sitemap + robots + 404 | 03 + 04 | 5 min |
| Top-100 on-page + noindex sweep (~1000 lightweight HEADs) | 05 | 40–60 min |
| Internal links (top 100 × ~50 links each ≈ 5000 HEAD checks) | 06 | 45–60 min |
| Query coverage (all 1000 queries, deep for top 100) | 07 | 30–45 min |
| Lighthouse × 20 | 08 | 60–90 min |
| Report assembly | 09 | 5 min |
| EXECUTION_REPORT + FINDINGS | final | 15–30 min |

Total: ~4–6 hours end-to-end, comfortable inside an overnight window. **Do NOT stop if a phase takes longer than budgeted.** Budget is guidance; the directive is completeness. Log slow phases in `EXECUTION_REPORT.md §5 "What Would Have Helped Go Faster"` but always continue to the next phase.

---

## 13. Final Note for the Executor

Daniel's single most important question — which this SPEC answers — is:

> **"After DNS switches from WordPress to Vercel, which URLs that Google currently ranks for Prizma will stop working, and how much traffic will I lose?"**

Every hour of execution, every script, every artifact, every section of the final report is in service of answering that question with a traffic-ranked, action-ready list. If during the run you discover a cleaner way to answer that question that doesn't match this SPEC's exact structure — STOP and propose it in a FINDINGS entry rather than diverging silently.

*End of SPEC.*
