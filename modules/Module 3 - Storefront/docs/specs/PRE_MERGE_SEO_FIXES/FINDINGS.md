# FINDINGS — PRE_MERGE_SEO_FIXES

> **SPEC:** `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_FIXES/SPEC.md`
> **Recorded during execution:** 2026-04-16
> **Executor:** opticup-executor

These are out-of-scope issues discovered during SPEC execution. Per the
Iron Rule "one concern per task", I did NOT fix any of them inside this
SPEC; each is recorded here for Foreman triage.

---

## FINDING-seo-fixes-01 — Legacy WordPress URLs now return 404 instead of chaining to index

**Severity:** MEDIUM
**Location:** ~35 legacy URLs, e.g. `/etniabarcelona/` (21 GSC clicks),
`/product_brand/milo-me/` (14 clicks), `/product_brand/henryjullien/` (9 clicks).
**Discovered:** During Task 4 fix.

### Description
Task 4 (flatten redirect chains) was executed by changing the 4
"not-found" handlers (`brands/[slug].astro`, `en/brands/[slug].astro`,
`ru/brands/[slug].astro`, `products/[barcode].astro`) from
`Astro.redirect('/{index}/')` to `Astro.rewrite('/404')`. This flattens
all 46 previously-multi-hop chains to 1 hop + 404 — correct SEO behavior
for stale URLs.

**Trade-off:** users who click legacy links in Google's search results
or old bookmarks now see a 404 page instead of being redirected to
`/brands/` (where they could at least browse alternatives). For URLs
with nontrivial traffic this is a UX downgrade.

### Affected URLs with clicks (sample)
| URL | GSC clicks |
|---|---|
| /etniabarcelona/ | 21 |
| /product_brand/milo-me/ | 14 |
| /product_brand/henryjullien/ | 9 |
| /product_brand/treboss/ | 4 |
| /product_brand/kristian-olsen/ | 4 |
| /product_brand/a-ga-ta/ | 4 |
| /bolle/ | 3 |
| /product_brand/genny/ | 3 |
| /product_brand/etnia/ | 2 |
| /product_brand/byblos/ | 2 |

### Suggested next action
New SPEC (or addendum): `MODULE_3_SEO_LEGACY_URL_REMAPS`.
For each URL with ≥5 GSC clicks, add a direct vercel.json rule mapping
to the closest-matching existing brand page (e.g.
`/etniabarcelona/` → `/brands/etnia-barcelona/` if that slug exists,
else `/brands/`). Would require a read-only DB query against
`v_storefront_brands` to build the mapping table.

---

## FINDING-seo-fixes-02 — Sitemap brand slug generator duplicated hyphens for "&" and similar chars

**Severity:** MEDIUM → FIXED in this SPEC (commit `fe756a7`)
**Location:** `src/pages/sitemap-dynamic.xml.ts`, brand slug block.

### Description
Pre-existing bug in the client-side slug generator: names like
"Tiffany & Co." were being converted via
`lowercase → spaces-to-hyphens → strip non-alphanum` which produced
"tiffany--co" (double hyphen). The storefront's brand lookup resolves
the slug as "tiffany-co" (single hyphen, via a different normalization),
so the sitemap's URL 404'd.

Previously masked by the `/brands/{unknown}/ → /brands` redirect
(returned 302 → 200, which passed the audit's "broken" check). When
Task 4 changed that to 404, the sitemap incorrectness became visible as
1 broken entry.

### Resolution
Fixed in commit `fe756a7` — added `.replace(/-+/g, '-').replace(/^-|-$/g, '')`
to collapse runs of hyphens and trim edges.

### Suggested next action
None — resolved. Kept as a finding because it's a useful example of a
masked-latent-bug pattern that's now enshrined in FOREMAN_REVIEW's
self-improvement proposal 2 (from EXECUTION_REPORT §8).

---

## FINDING-seo-fixes-03 — `dist/client/sitemap-index.xml` and `sitemap-0.xml` served at production alongside sitemap-dynamic

**Severity:** LOW
**Location:** `dist/client/` after build.

### Description
`@astrojs/sitemap` integration still generates `sitemap-index.xml` and
`sitemap-0.xml` at build time (visible in every `npm run build` log
output). Production serves both these AND `sitemap-dynamic.xml`. Robots.txt
now only references `sitemap-dynamic.xml`, but the other two remain
accessible at their URLs — a potential source of confusion for
crawlers that discover them via direct probing.

After today's rebuild, the generated files do contain the correct
`prizma-optic.co.il` domain (not the stale `opticup-storefront.vercel.app`
from FINDING-001 of the parent audit), so this is no longer a correctness
bug — just a cleanliness issue.

### Suggested next action
Consider removing `@astrojs/sitemap` from `astro.config.mjs` integrations
list since `sitemap-dynamic.xml` is the project's canonical sitemap.
Would remove the generation of `sitemap-0.xml` and `sitemap-index.xml`
entirely. Low priority — no active breakage today.

---

## FINDING-seo-fixes-04 — Title-length policy: 3/20 sampled pages still >60 chars

**Severity:** LOW
**Location:** Post-fix sampling in EXECUTION_REPORT.md §2.

### Description
After Task 8 template-level fix, 17/20 sampled top pages have
titles ≤60 chars. Remaining 3 that exceed: long blog-post titles where
the base title alone is >60 chars. The template fix correctly skips
appending the suffix in those cases, but the base title itself is too
long.

### Suggested next action
Out of scope per SPEC §7 — title text content changes require CMS /
content work. Flag for the Storefront Studio (Module 3) backlog:
add a "meta_title" override field to blog posts so content editors can
provide a ≤60-char SEO title distinct from the display title.

---

## FINDING-seo-fixes-05 — Image alt coverage: programmatic alt="" may mask accessibility regressions

**Severity:** INFO
**Location:** `src/lib/content-cleaner.ts::ensureImgAlt`.

### Description
Task 9 fix adds `alt=""` to `<img>` tags without any alt attribute.
This is the WCAG-sanctioned fallback for decorative images and satisfies
the audit's alt-coverage metric. But:
- It treats content images as decorative, which is semantically wrong
  for photos inside a blog post about optical products.
- Screen-reader users won't get meaningful descriptions.
- The metric is now technically "passed" but the underlying
  accessibility quality hasn't improved.

### Suggested next action
Longer-term: add a blog-content editor in the Studio that flags
`<img>` tags without alt text and prompts the author to fill them in.
Until then, `alt=""` is the correct fallback (better than missing alt,
which is WCAG AA violation).

---

## FINDING-seo-fixes-06 — No verify/test scripts in storefront repo for SEO regressions

**Severity:** INFO
**Location:** `opticup-storefront/` repo root.

### Description
The SEO audit scripts live in the **ERP repo** at
`modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/scripts/seo-overnight/`.
This is awkward for ongoing CI/CD: you need both repos checked out to
run SEO verification, and the scripts hit the storefront dev server but
depend on GSC data that's scoped to the ERP repo's artifact folder.

### Suggested next action
Move the SEO verification scripts (or at least a subset) into
`opticup-storefront/scripts/seo-check/` as part of the Safety Net (Rule
30). Run on every `develop` push as a lightweight check:
- sitemap broken_count = 0
- robots.txt has exactly 1 Sitemap directive
- og:image present on sampled top-20 pages
- locale 404 probes return 404

This would prevent the PRE_MERGE_SEO_FIXES fixes from regressing
unnoticed.
