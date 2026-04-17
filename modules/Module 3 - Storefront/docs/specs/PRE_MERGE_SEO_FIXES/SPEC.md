# SPEC — PRE_MERGE_SEO_FIXES

> **Location:** `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_FIXES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-16
> **Module:** 3 — Storefront
> **Author signature:** Cowork session beautiful-adoring-galileo
> **Parent SPEC:** `PRE_MERGE_SEO_OVERNIGHT_QA` (audit) → this SPEC (fixes)
> **Parent FOREMAN_REVIEW findings:** §4 items 1–8, 11

---

## RUN-TO-COMPLETION DIRECTIVE

This is a **fixes SPEC** — every task produces a measurable code change.
The executor MUST run all tasks end-to-end in a single session. Do NOT
stop on a finding — log it and continue to the next task. Only stop on
the hard deviation triggers in §5.

---

## 1. Goal

Fix all actionable SEO issues found in the `PRE_MERGE_SEO_OVERNIGHT_QA` audit
so that Prizma's storefront launches with zero known SEO deficiencies. The site
should score: 0 broken sitemap entries, og:image on every page, proper 404
status codes on all locales, no multi-hop redirect chains, correct canonical
tags on all brand pages, and a clean robots.txt.

---

## 2. Background & Motivation

The overnight SEO QA audit (`PRE_MERGE_SEO_OVERNIGHT_QA`, commit `a620720`)
scanned 1000 GSC URLs, 100 top-traffic pages, and the full sitemap. DNS verdict
was GREEN (no high-traffic URLs missing), but 14 findings were logged. 9 of
those are actionable fixes that will improve SEO quality before the DNS switch
from WordPress to Vercel. Daniel's directive: "אני רוצה אתר מושלם."

All evidence referenced below comes from the audit's `artifacts/` folder at:
`modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/artifacts/`

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify method |
|---|-----------|---------------|---------------|
| 1 | Environment check | `process.platform` = `win32`, git root = Windows path | `node -e` + `git rev-parse --show-toplevel` |
| 2 | Dev servers reachable | `localhost:4321` → 200, `localhost:3000` → 200 | `curl -s -o /dev/null -w '%{http_code}'` |
| 3 | Broken sitemap entries fixed | 0 broken `<loc>` in `/sitemap-dynamic.xml` | Re-run `03_check_sitemap.mjs` or equivalent; broken_count = 0 |
| 4 | og:image present on top-100 pages | ≥ 95 of 100 have `og:image` tag | Re-run `05_onpage_top100.mjs` subset; count og:image present |
| 5 | 404 handler returns 404 for all locales | `/en/nonexistent` → 404, `/ru/nonexistent` → 404 | `curl -s -o /dev/null -w '%{http_code}' http://localhost:4321/en/nonexistent-test/` |
| 6 | Redirect chains ≤ 1 hop | 0 URLs with redirect_hops > 1 | Re-run redirect chain check on the 46 previously-flagged URLs |
| 7 | Brand canonical tags correct | 3 brand pages have self-referential canonical | `curl` each + grep `<link rel="canonical"` |
| 8 | robots.txt has single sitemap directive | 1 Sitemap directive pointing to `sitemap-dynamic.xml` only | `curl http://localhost:4321/robots.txt` |
| 9 | Stale dist/ build artifacts removed or gitignored | `dist/client/sitemap-*.xml` and `dist/client/robots.txt` not served | `ls` check + `.gitignore` entry |
| 10 | Storefront builds cleanly | `npm run build` → exit 0, 0 errors | Run in storefront repo |
| 11 | Title length improved on top pages | ≥ 50 of 100 top pages with title ≤ 60 chars (was 23) | Re-run title length check |
| 12 | Image alt coverage improved | ≥ 85 of 100 top pages with alt coverage ≥ 95% (was 73) | Re-run alt check |
| 13 | Final report + retrospective | `EXECUTION_REPORT.md` + `FINDINGS.md` present | `ls` in SPEC folder |
| 14 | Single commit on develop | 1 commit in storefront repo, 1 in ERP repo (docs only) | `git log --oneline` |

**Pass threshold:** Criteria 1, 2, 3, 5, 8, 9, 10, 13, 14 MUST pass.
Criteria 4, 6, 7, 11, 12 are best-effort — log shortfalls as findings.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in both repos (`opticup` and `opticup-storefront`)
- Modify Astro page templates, layouts, and components in `opticup-storefront`
- Modify `vercel.json` redirect rules in `opticup-storefront`
- Modify `robots.txt` source in `opticup-storefront`
- Modify the sitemap endpoint in `opticup-storefront`
- Add `.gitignore` entries in `opticup-storefront`
- Delete stale build artifacts in `opticup-storefront/dist/`
- Run `npm run build` and `npm run dev` in `opticup-storefront`
- Re-run any script from `PRE_MERGE_SEO_OVERNIGHT_QA/scripts/seo-overnight/`
- Commit and push to `develop` on both repos
- Add default og:image fallback in Astro head layout
- Fix locale-prefixed 404 routing

### What REQUIRES stopping and reporting

- Any DB change (DDL or DML) — zero DB changes in this SPEC
- Any file in `FROZEN_FILES.md` being touched
- Any merge to `main`
- Modifying View definitions or RPC functions
- Deleting any page or route that currently returns 200
- Any change that would cause `npm run build` to fail

---

## 5. Stop-on-Deviation Triggers

- If `npm run build` fails after any change → STOP, revert that change, report
- If any URL that previously returned 200 now returns 404/500 → STOP
- If the sitemap entry count drops below 180 (was 245, minus 58 broken = 187 valid) → STOP
- If the executor cannot determine the root cause of the 58 broken blog sitemap entries within 30 minutes of investigation → log finding, skip to next task

---

## 6. Rollback Plan

- Storefront: `git reset --hard {START_COMMIT}` in `opticup-storefront`
- ERP: `git reset --hard {START_COMMIT}` in `opticup`
- No DB changes → no DB rollback needed

---

## 7. Out of Scope (explicit)

- The 41 MISSING WordPress pagination/cart URLs (`/page/N/`, `?add-to-cart=`) — not worth redirects
- Title text content changes (requires CMS/content work, not template fixes) — only truncation or template-level `<title>` improvements are in scope
- Alt text content writing (requires human review of images) — only adding programmatic alt text from DB fields (product name, brand name) is in scope
- Any DB mutations
- Instagram hardcoded link fix (separate SPEC: `BLOG_INSTAGRAM_TEMPLATIZE`)
- Performance optimization (Lighthouse scores are dev-mode artifacts)

---

## 8. Task Breakdown & Expected Changes

All changes are in `opticup-storefront` unless noted.

### Task 1 — Fix 58 broken blog sitemap entries

**Evidence:** `artifacts/sitemap-check.json` — 58 URLs under `/בלוג/` return 404.
All 58 are Hebrew blog post slugs. The sitemap-dynamic endpoint generates them
but the storefront doesn't route to them.

**Root cause investigation steps:**
1. Read the sitemap-dynamic endpoint source (likely `src/pages/sitemap-dynamic.xml.ts` or similar)
2. Read the blog page routing (likely `src/pages/בלוג/[slug].astro` or `src/pages/[locale]/blog/[slug].astro`)
3. Compare the slug format the sitemap generates vs what the route expects
4. Check if the blog posts exist in the DB with matching slugs

**Expected fix:** Either correct the sitemap to emit the right URLs, or fix the
routing to accept the slugs the sitemap emits. The 187 valid entries must remain
valid after the fix.

### Task 2 — Add og:image fallback to all pages

**Evidence:** `artifacts/onpage-top100.json` — 73 of 100 pages missing og:image.

**Expected fix:** In the Astro base layout or SEO head component, add a default
`og:image` meta tag that falls back to the tenant's logo or a branded default
image when no page-specific image is available. The image URL should go through
the image proxy (`/api/image/...`) per Rule 25.

**Files likely involved:** `src/layouts/BaseLayout.astro` or `src/components/SEOHead.astro`

### Task 3 — Fix soft-404 on /en/ and /ru/ locale routes

**Evidence:** `artifacts/404-check.json`:
- `/this-page-does-not-exist/` → 404 ✅
- `/en/unknown-article/` → 302 ❌ (should be 404)
- `/ru/nonexistent/` → 302 ❌ (should be 404)

**Expected fix:** The locale middleware or catch-all route is redirecting unknown
locale-prefixed paths instead of returning 404. Fix the routing so that
`/en/*` and `/ru/*` unknown paths return HTTP 404 with the 404 page content.

### Task 4 — Flatten 46 redirect chains to single hop

**Evidence:** `artifacts/redirect-coverage.json` — 46 URLs require 2 hops.
Pattern: mostly brand slug URLs (e.g., `/etniabarcelona/` → `/he/brands/etnia-barcelona/` → final)
and subdomain URLs (`en.prizma-optic.co.il/...` → apex → locale path).

**Expected fix:** In `vercel.json`, add direct rules for the 46 URLs that
currently chain through 2 hops. Each rule should point directly to the final
destination. If the chains are caused by a regex overlap in vercel.json rules,
restructure to avoid the overlap.

**Constraint:** Do NOT remove existing rules — only add more specific rules that
take precedence, or reorder. Existing working redirects must not break.

### Task 5 — Fix canonical tags on 3 brand pages

**Evidence:** `artifacts/onpage-top100.json` — 3 pages with `canonical_ok=false`:
- `https://prizma-optic.co.il/etniabarcelona/`
- `https://prizma-optic.co.il/product_brand/milo-me/`
- `https://prizma-optic.co.il/product_brand/henryjullien/`

**Expected fix:** These pages emit a canonical tag that doesn't match their
actual URL (likely an encoding mismatch or a redirect-chain artifact). Fix the
canonical tag generation in the brand page template to emit the correct
self-referential canonical URL.

### Task 6 — Clean robots.txt (remove stale sitemap directive)

**Evidence:** `artifacts/robots-check.json` — 2 Sitemap directives:
- `https://prizma-optic.co.il/sitemap-dynamic.xml` ← KEEP
- `https://prizma-optic.co.il/sitemap-index.xml` ← REMOVE (stale, points to wrong domain build artifact)

**Expected fix:** Edit the robots.txt source in the storefront to have only
the `sitemap-dynamic.xml` directive.

### Task 7 — Remove or gitignore stale dist/ build artifacts

**Evidence:** `FINDINGS.md` FINDING-001 — `dist/client/sitemap-index.xml`,
`sitemap-0.xml`, `robots.txt` contain hardcoded `opticup-storefront.vercel.app`.

**Expected fix:** Either:
(a) Add `dist/` to `.gitignore` if it's not already (it's a build output), OR
(b) Delete the stale files and ensure `npm run build` regenerates them with
the correct domain configuration.

### Task 8 — Improve title length on top pages (best-effort)

**Evidence:** Only 23 of 100 top pages have titles ≤ 60 chars.

**Expected fix (template-level only):** If the title is generated from a
template that concatenates brand/page name + site name, shorten the site name
suffix or remove it from pages where the page-specific title is already > 45
chars. Do NOT rewrite content — only adjust the template logic.

### Task 9 — Improve image alt coverage (best-effort)

**Evidence:** 73 of 100 pages have ≥ 95% alt coverage; 27 don't.

**Expected fix (programmatic only):** In product card and brand page components,
ensure `<img>` tags have `alt` attributes populated from the product name or
brand name fields. If the DB field is empty, use the page title as fallback.
Do NOT write alt text manually.

---

## 9. Commit Plan

### Storefront repo (`opticup-storefront`):
- **Commit 1:** `fix(seo): fix blog sitemap broken entries + locale 404 handling`
  Files: sitemap endpoint, 404 route/middleware, robots.txt
- **Commit 2:** `fix(seo): add og:image fallback + fix brand canonical tags`
  Files: SEO head component/layout, brand page template
- **Commit 3:** `fix(seo): flatten redirect chains in vercel.json`
  Files: vercel.json
- **Commit 4:** `chore(seo): clean stale dist/ artifacts + improve title/alt templates`
  Files: .gitignore, dist/ cleanup, title template, img alt template

### ERP repo (`opticup`):
- **Commit 5:** `docs(m3-seo): close PRE_MERGE_SEO_FIXES with retrospective`
  Files: EXECUTION_REPORT.md, FINDINGS.md, SESSION_CONTEXT.md, CHANGELOG.md

---

## 10. Dependencies / Preconditions

- `PRE_MERGE_SEO_OVERNIGHT_QA` SPEC must be closed (it is — commit `a620720`)
- Both repos at `develop`, pulled and clean
- `npm run dev` running on storefront (`localhost:4321`)
- `npm run dev` running on ERP (`localhost:3000`) — needed for image proxy testing
- Audit artifacts available at `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/artifacts/`

### CRITICAL EXECUTION-ENVIRONMENT PRECONDITION

**This SPEC MUST be executed from Claude Code running directly on Daniel's
Windows desktop — NOT from a Cowork sandbox chat.**

The executor MUST verify the environment before starting:
1. `node -e "console.log(process.platform)"` → must print `win32`
2. `git rev-parse --show-toplevel` → must return a Windows path
3. Only AFTER those two checks pass → proceed to Criterion 2.

If the environment check fails, write a 3-line `EXECUTION_REPORT.md` stating
"Wrong environment — needs Windows Claude Code, not Cowork" and exit.

---

## 11. Lessons Already Incorporated

- FROM `PRE_MERGE_SEO_OVERNIGHT_QA/FOREMAN_REVIEW.md` Proposal 1 → "audit-SPEC
  stop-trigger default = run-to-completion" → APPLIED: this SPEC uses
  run-to-completion directive for fixes too, with narrow stop-triggers only for
  breaking changes.
- FROM `PRE_MERGE_SEO_OVERNIGHT_QA/FOREMAN_REVIEW.md` Proposal 2 → "always
  declare execution environment" → APPLIED: §10 includes the Windows
  environment precondition with explicit checks.
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 1 → "re-enumerate
  counts from prior audit" → APPLIED: all counts in §8 come directly from the
  audit's JSON artifacts, not from narrative estimates.
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 2 → "name ONE
  canonical form for ambiguous patterns" → APPLIED: §8 Task 2 specifies image
  proxy (`/api/image/...`) per Rule 25 as the canonical form for og:image URLs.
- Cross-Reference Check completed 2026-04-16: 0 new DB objects introduced
  (this SPEC is code-only, no DDL). All changes are in existing files in the
  storefront repo.
