# FINDINGS — DNS_SWITCH_PREFLIGHT_AUDIT

> Findings logged during execution that are NOT in the SPEC scope.
> Do NOT fix inside this SPEC (Rule: one concern per task).

---

## Finding 1 — Mixed-locale titles in `storefront_pages`

- **Severity:** LOW
- **Location:** Supabase `public.storefront_pages`, 13 rows where `lang ∈ {en, ru}` but `title` contains Hebrew characters
- **Examples:**
  - `slug='/lab/'` lang=en → title: `מעבדת מסגורים`
  - `slug='/multi/'` lang=en → title: `משקפי מולטיפוקל`
  - `slug='/prizmaexpress/'` lang=en → title: `פריזמה אקספרס - שירות אופטיקה ניידת עד הבית`
  - `slug='/prizmaexpress/'` lang=ru → title: `פריזמה אקספרס - שירות אופטיקה ניידת עד הבית`
  - `slug='/terms/'` lang=ru → title: `תקנון האתר`
  - `slug='/lab/'` lang=ru → title: `מעבדת מסגורים`
  - `slug='/משקפי-מולטיפוקל/'` lang=en → title: `משקפי מולטיפוקל`
  - `slug='/משקפי-מולטיפוקל/'` lang=ru → title: `משקפי מולטיפוקל`
- **Description:** These are DB rows where the admin UI or an import left the
  Hebrew title in place even though the row's `lang` is EN or RU. The live
  renderer overrides them from page-specific content, so **users do not see
  any Hebrew leak**. But the DB itself looks inconsistent — and if someone
  ever renders from the raw `title` column, they'd get wrong-language content.
- **Suggested next action:** New SPEC: `STOREFRONT_PAGES_TITLE_CLEANUP` — run
  a read-only query to enumerate all such rows, then update `title` to the
  correct localized value for each. Single UPDATE query per row. Low risk,
  medium churn (~13 rows). Not a DNS-switch blocker.

---

## Finding 2 — Bare-slug row in `storefront_pages`

- **Severity:** INFO
- **Location:** Supabase `public.storefront_pages`, rows with `slug='supersale'` (no leading `/`)
- **Description:** Every other row uses `slug='/something/'` format (leading
  and trailing slash). Two rows exist with `slug='supersale'` (one per HE/EN/RU).
  Unclear if this is intentional (a redirect target? an alias row?) or a
  data-entry inconsistency.
- **Suggested next action:** Investigate during the same cleanup SPEC as
  Finding 1. Either normalize to `/supersale/` or document why it's different.

---

## Finding 3 — `/sitemap.xml` returns 404

- **Severity:** LOW
- **Location:** `opticup-storefront` live site; `vercel.json` redirect list
- **Description:** Search engines commonly probe `/sitemap.xml` before reading
  `robots.txt`. The storefront only exposes `/sitemap-dynamic.xml`. A 404 at
  the standard path is not a blocker (robots.txt correctly points to the
  dynamic one) but it's a free SEO polish.
- **Suggested next action:** Tiny SPEC to add a single redirect in
  `vercel.json`:
  ```json
  {"source":"/sitemap.xml","destination":"/sitemap-dynamic.xml","permanent":true}
  ```
  Can be batched with any future `vercel.json` edit.

---

## Finding 4 — HTML pages never cached at Vercel edge

- **Severity:** MEDIUM (performance, not correctness)
- **Location:** `opticup-storefront` Vercel output; response header on HTML
- **Description:** `Cache-Control: public, max-age=0, must-revalidate` on every
  HTML response. `X-Vercel-Cache: MISS` on 3 consecutive requests. Every page
  load triggers SSR, producing ~2s TTFB warm.
- **Impact:** Real users experience ~2s to first byte on every page load.
  Lighthouse mobile score will be penalized. Impacts Core Web Vitals FCP/LCP.
- **Suggested next action:** New SPEC to enable Astro ISR (`prerender` + on-demand
  ISR) OR add `s-maxage=300, stale-while-revalidate=3600` header for stable
  pages (homepage, brand pages, blog posts). Estimated TTFB reduction:
  2000ms → <200ms for cached hits. Skip for dynamic pages that need per-request
  data.

---

## Finding 5 — Brand page has `/404` hrefs in markup

- **Severity:** LOW
- **Location:** `https://opticup-storefront.vercel.app/brands/ray-ban-2/` (tested), possibly other brand pages
- **Evidence:** Link crawl found 3 internal hrefs: `/404`, `/en/404`, `/ru/404`
  — each returns 404. No other page tested (HE/EN/RU homepages) had these.
- **Description:** Some component used on the brand detail pages emits explicit
  `href="/404"` etc. Could be a default for a missing language link, a "no
  results" link, or an accidentally-rendered fallback.
- **Suggested next action:** Grep source for `"/404"` or `{lang}/404` template
  strings in brand-related components. Likely a single-line fix. Schedule as a
  small hygiene SPEC or bundle into the next brand-page SPEC.

---

## Finding 6 — `Content-Security-Policy` header absent

- **Severity:** LOW (security hardening, not a live vulnerability)
- **Location:** All responses from `opticup-storefront.vercel.app`
- **Description:** 5 of 6 modern security headers are present (HSTS,
  X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
  CSP is the only gap. Most sites ship without CSP because it's hard to
  maintain alongside inline scripts and third-party embeds.
- **Suggested next action:** Defer until post-launch. When adopted, use a
  nonce-based CSP generated per-request in the Astro middleware.

---

## Finding 7 — HTTP 500 on raw-Hebrew URLs via curl (NOT a bug — tooling artifact)

- **Severity:** INFO (logging for future reference)
- **Location:** Audit procedure; not a site issue
- **Description:** During Mission 3 execution, the first spot-check using `curl`
  on raw-Hebrew sitemap URLs (e.g. `/צרו-קשר/`) returned HTTP 500. Retesting
  the exact same URLs using Node's `https.get` (which URL-encodes like a
  browser) returned HTTP 200. The 500s were a Windows/curl URL-encoding
  artifact — bytes sent as raw UTF-8 were mishandled somewhere in the
  tooling chain, NOT a server issue.
- **Suggested next action:** None — the site serves raw-Hebrew URLs correctly
  to real browsers. But **file this for future DNS/SEO audits**: always verify
  non-ASCII URL checks with Node or a browser before reporting a server
  failure. Curl on Windows can produce false positives with UTF-8 paths.

---

*End of FINDINGS.md. 7 findings, 0 CRITICAL, 0 HIGH, 1 MEDIUM (M7 perf), 5 LOW, 1 INFO.*
