# SPEC — DNS_SWITCH_PREFLIGHT_AUDIT

> **Location:** `modules/Module 3 - Storefront/docs/specs/DNS_SWITCH_PREFLIGHT_AUDIT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman), Cowork session kind-focused-noether
> **Authored on:** 2026-04-18
> **Module:** 3 — Storefront
> **Phase:** Pre-DNS-Switch
> **Author signature:** Cowork Foreman (Daniel-directed)

---

## 1. Goal

Produce a single, evidence-backed **DNS Switch Preflight Report** that tells
Daniel exactly what is ready, what is not, and what must happen before
`prizma-optic.co.il` DNS can be pointed from DreamVPS to Vercel. Every finding
must include concrete evidence (URL fetch, SQL query, file read, git diff) —
no assumptions, no extrapolations. This is a **read-only audit** — zero code
changes, zero DB writes.

**Critical: The 10 missions in §8 are a MINIMUM, not a ceiling.** The executor
is expected — and encouraged — to add missions, deepen checks, and investigate
anything that looks off. The goal is a 100% accurate picture of the site's
readiness, including performance, mobile experience, loading speed, asset
optimization, and anything else that affects user experience or SEO. If
something seems relevant to DNS switch readiness and it's not listed below —
check it anyway and add it as Mission 11, 12, etc. Use your judgment. The
only constraint is read-only (no code changes, no DB writes).

---

## 2. Background & Motivation

Multiple SPECs have shipped fixes over the past week (PRE_MERGE_SEO_FIXES,
STOREFRONT_LANG_AND_VIDEO_FIX, HOMEPAGE_LUXURY_REVISIONS, performance
optimizations). These fixes live on `develop` but many have NOT been merged
to `main` (which is what Vercel deploys). A Cowork-session spot-check on
2026-04-18 confirmed EN/RU pages work on Vercel (suggesting a recent merge
may have happened), but the canonical domain in `astro.config.mjs` still
points to `opticup-storefront.vercel.app`. Daniel needs a definitive,
verified picture before authorizing the DNS switch.

**Prior SPECs this builds on:**
- `DNS_SWITCH_READINESS_QA` (2026-04-16) — original 41-finding audit
- `PRE_MERGE_SEO_FIXES` (2026-04-16) — og:image, sitemap, 404 fixes
- `STOREFRONT_LANG_AND_VIDEO_FIX` (2026-04-17) — YouTube + RU text + merge gap diagnosis
- Session 2026-04-17 — performance optimizations, Vercel rebuild, dark mode fix

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify method |
|---|-----------|---------------|---------------|
| 1 | Report file exists | 1 file at `DNS_SWITCH_PREFLIGHT_AUDIT/PREFLIGHT_REPORT.md` | `ls` |
| 2 | Report covers all 10 audit missions | 10 sections with evidence | Manual read |
| 3 | Every CRITICAL/HIGH finding has evidence line | 100% | Self-check per opticup-guardian |
| 4 | Zero code changes | `git diff` empty | `git diff` |
| 5 | Zero DB writes | No INSERT/UPDATE/DELETE executed | Execution log |
| 6 | Branch = develop | On develop | `git branch` |
| 7 | EXECUTION_REPORT.md written | Exists in SPEC folder | `ls` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo (`opticup` and `opticup-storefront`)
- Run read-only SQL (Level 1 autonomy) — SELECT only
- Fetch any public URL via curl/WebFetch to check live site state
- Run `git log`, `git diff`, `git status` in both repos
- Run `npm run build` (storefront, dry-run diagnostic only)
- Create the report file in the SPEC folder

### What REQUIRES stopping and reporting
- Any code change (this is read-only)
- Any DB write (INSERT/UPDATE/DELETE)
- Any merge operation
- Any finding where evidence is contradictory or ambiguous — mark UNVERIFIED per opticup-guardian protocol

---

## 5. Stop-on-Deviation Triggers

### 5a. STOP-ESCALATE
- If any SQL query returns an error
- If the storefront repo is not accessible
- If `git branch` shows anything other than `develop`

### 5b. STOP-SUMMARIZE
- If more than 20 pages return unexpected status codes — log the pattern, skip per-page detail, continue other missions

---

## 6. Rollback Plan

Read-only audit — nothing to roll back. The only artifact is the report file.

---

## 7. Out of Scope (explicit)

- **DO NOT** fix anything — this is audit only
- **DO NOT** modify any file in either repo
- **DO NOT** run any DB migration or write operation
- **DO NOT** modify vercel.json, astro.config, or any source file
- **DO NOT** merge develop to main
- Homepage revision work (HOMEPAGE_LUXURY_REVISIONS queue)
- BrandShowcase scroll behavior fixes
- Contact form / Resend setup (deferred by Daniel)
- /optometry/ draft status (deferred by Daniel)

---

## 8. The 10 Audit Missions

### Mission 1 — Canonical Domain & SEO Meta

**Check:** What does `astro.config.mjs` `site:` currently say?

Evidence required:
1. `cat opticup-storefront/astro.config.mjs | grep site:` — exact current value
2. Fetch `https://opticup-storefront.vercel.app/` via curl — extract `<link rel="canonical">` from HTML source
3. Fetch same page — extract all `<meta property="og:...">` tags
4. Fetch same page — extract all `<link rel="alternate" hreflang=...>` tags

**Report format:** List each tag with its exact current value. Flag if domain
is `vercel.app` instead of `prizma-optic.co.il`.

### Mission 2 — develop→main Merge Gap

**Check:** How far behind is `main` from `develop` in the storefront repo?

Evidence required:
1. `git log origin/main..origin/develop --oneline | wc -l` — commit count
2. `git log origin/main..origin/develop --oneline` — list all commits (abbreviated)
3. `git diff origin/main origin/develop -- src/pages/` — are routing files different?
4. `git diff origin/main origin/develop -- astro.config.mjs` — is site: config different?
5. `git diff origin/main origin/develop -- vercel.json` — are redirects different?

**Report format:** Commit count, key files that differ, and a YES/NO on
whether merge is still required.

### Mission 3 — Live Page Accessibility (All 3 Languages)

**Check:** Do all published pages serve HTTP 200 on the Vercel deployment?

Evidence required:
1. Query `storefront_pages` for all rows where `status='published'` — get slugs and langs
2. For each slug+lang combination, construct the Vercel URL and fetch it
3. Record HTTP status code for each

**Report format:** Table with columns: slug, lang, URL, HTTP status.
Summary: X of Y pages serve 200. List any non-200 pages.

### Mission 4 — og:image Coverage

**Check:** Do pages have og:image set, or is there a fallback?

Evidence required:
1. Read `BaseLayout.astro` — check if there's an og:image fallback when no explicit ogImage prop is passed
2. Fetch 5 sample pages (homepage HE, a brand page, a blog post, /about/, /en/ homepage) — extract `<meta property="og:image">` from each
3. If og:image is present, verify the image URL actually loads (not 404/timeout)

**Report format:** Per-page og:image value and whether the image loads. Assessment of fallback mechanism.

### Mission 5 — Sitemap Health

**Check:** Is the dynamic sitemap clean?

Evidence required:
1. Fetch `https://opticup-storefront.vercel.app/sitemap-dynamic.xml` — count total URLs
2. Spot-check 10 random URLs from the sitemap — do they return 200?
3. Check `robots.txt` — does it reference the correct sitemap URL?
4. Check: does robots.txt have exactly ONE Sitemap directive (not two)?

**Report format:** Total URL count, spot-check results, robots.txt Sitemap directive(s).

### Mission 6 — Old Site → New Site Redirect Coverage

**Check:** Will traffic from the old WordPress site land correctly after DNS switch?

Evidence required:
1. Read `vercel.json` redirect rules — count total rules
2. Fetch the OLD site's sitemap or known URLs list from the SEO QA reports
3. Cross-reference: for each high-traffic old URL (from `PRE_MERGE_SEO_OVERNIGHT_QA` if available), does a matching redirect exist in vercel.json?
4. Check the 5 main old-site URLs that definitely exist:
   - `/` (homepage)
   - `/about/`
   - `/brands/`
   - `/בלוג/`
   - `/צרו-קשר/`

**Report format:** Redirect coverage percentage, any high-traffic old URLs without redirects.

### Mission 7 — Performance Baseline

**Check:** What are the current Lighthouse/PageSpeed scores?

Evidence required:
1. Check if `scripts/visual-regression.mjs` or any perf script exists
2. Read the session 2026-04-17 results (already documented): Performance, FCP, LCP, TBT, Best Practices scores
3. Check current state: is Partytown fully removed? (`grep -rn partytown` in storefront)
4. Check brand logo timeout issue: are there any known image proxy failures?

**Report format:** Latest known scores, status of Partytown removal, image proxy status.

### Mission 8 — Hebrew Tenant Name Leak in EN/RU

**Check:** Do English and Russian page titles contain "אופטיקה פריזמה" instead of the localized tenant name?

Evidence required:
1. Query `storefront_config` or `tenants` table — what name values exist per locale?
2. Fetch `/en/` and `/ru/` pages on Vercel — extract `<title>` tag
3. Check if Hebrew text appears in EN/RU titles

**Report format:** Exact title tags from EN and RU pages, with Hebrew leak highlighted if present.

### Mission 9 — SSL & DNS Readiness

**Check:** Is the Vercel project configured for the custom domain?

Evidence required:
1. Check Vercel project settings (if accessible via CLI or API) for custom domain config
2. Check current DNS records for `prizma-optic.co.il` — where does it point now?
3. List what DNS changes would be needed (A record / CNAME to Vercel)

**Report format:** Current DNS state, Vercel domain config status, required changes.

### Mission 10 — Consolidated Blocker List

**Check:** Compile all findings into a single prioritized list.

**Report format:**
- **BLOCKERS** (must fix before DNS switch) — with evidence
- **SHOULD FIX** (important but not blocking) — with evidence
- **NICE TO HAVE** (can wait until after DNS switch)
- **ALREADY RESOLVED** (issues from prior audits that are now fixed — with verification evidence)

---

### Mission 11+ — Executor's Own Findings

The executor SHOULD add additional missions based on what they discover during
the audit. Suggested areas (but not limited to):

- **Mobile rendering** — load key pages in mobile viewport, check layout breaks
- **Page load speed** — run Lighthouse or PageSpeed Insights on homepage (mobile + desktop), brand page, blog post
- **Asset optimization** — check image sizes, lazy loading, font loading strategy
- **Core Web Vitals** — LCP, FID/INP, CLS on key pages
- **Console errors** — check browser console for JS errors on homepage, brand page, blog
- **Broken internal links** — crawl for dead hrefs within the site
- **Security headers** — HSTS, X-Frame-Options, Content-Security-Policy
- **Accessibility basics** — WCAG AA violations on homepage
- **Anything else** the executor considers relevant to site quality

The executor should use their professional judgment. If they see something
concerning — investigate it, even if it's not in this list. The report should
give Daniel complete confidence about the site's state.

---

## 9. Commit Plan

- Commit 1: `docs(m3): DNS_SWITCH_PREFLIGHT_AUDIT — SPEC + report + retrospective`
  Files: SPEC.md, PREFLIGHT_REPORT.md, EXECUTION_REPORT.md

---

## 10. Dependencies / Preconditions

- Both repos must be accessible: `opticalis/opticup` (this repo) and `opticalis/opticup-storefront`
- Supabase MCP must be available for read-only SQL queries
- Internet access for fetching live Vercel URLs

---

## 11. Lessons Already Incorporated

- FROM `DNS_SWITCH_READINESS_QA/FOREMAN_REVIEW.md` → A-1 (runtime UUID verification): this SPEC does not hardcode Prizma UUID — executor must verify live via `SELECT id FROM tenants WHERE slug='prizma'` before any query.
- FROM `DNS_SWITCH_READINESS_QA/FOREMAN_REVIEW.md` → A-2 (two-tier stop triggers): APPLIED in §5 with STOP-ESCALATE and STOP-SUMMARIZE tiers.
- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → A-1 (deploy-branch outcome modeling): APPLIED — Mission 2 explicitly checks develop vs main divergence rather than assuming code bugs.
- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → E-1 (deploy-target verification): APPLIED — Mission 2 runs `git log origin/main..origin/develop` as first diagnostic.
- FROM Cowork session 2026-04-18 → Sitemap "58 broken URLs" was a stale finding (all 6 spot-checked URLs returned 200). Executor must verify current state, not trust prior reports.
- Cross-Reference Check completed 2026-04-18: 0 new DB objects introduced (read-only SPEC). No collisions possible.

---

## 12. Daniel-Facing Summary (Hebrew)

> SPEC שמגדיר ביקורת מקיפה של 10 נקודות — כל מה שצריך לבדוק לפני החלפת ה-DNS.
> הביקורת לא משנה שום דבר — רק קוראת ומדווחת. בסוף תקבל דוח אחד ברור עם
> מה מוכן, מה לא, ומה בדיוק צריך לעשות.
