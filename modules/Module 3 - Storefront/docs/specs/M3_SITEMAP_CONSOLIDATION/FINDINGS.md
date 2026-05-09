# FINDINGS — M3_SITEMAP_CONSOLIDATION

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_CONSOLIDATION/FINDINGS.md`
> **Written by:** opticup-executor (2026-05-09)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Pre-existing brand-slug 404s in dynamic sitemap (out-of-scope for this SPEC)

- **Code:** `M3-DATA-01`
- **Severity:** MEDIUM (data quality; SEO budget waste; not customer harm)
- **Discovered during:** verify-sitemap.mjs 30-URL random sample probe on production
- **Location:** `src/pages/sitemap-dynamic.xml.ts:60-91` — the brands query block iterates `v_storefront_brands` and emits `/brands/{slug}/` for every row. Some brand rows exist in the DB but have no actual public brand-detail page route (likely brands with 0 products published, or test/placeholder rows).
- **Description:** Sample probe found 7-12/30 (23-40%) URLs returning 404. All are brand-slug pages: West Coast, Gipsy Kids, Caroline DK, GAF, Kristian Olsen, Flash Kids, Weishiman, Taki Kids, Tom Miller, SUMO, Flash, Kimura, Just, Christies, Kokids, Accord, Excite, Flair, BENX Kids, DGSR, Marco Bruno, plus `/multifocal-guide/`. Each is a brand listed in the brands view but without a working `/brands/[slug]/` storefront route. **PRE-EXISTING:** the apex-domain sitemap before this SPEC had identical URLs that 307→www→404'd to the same end state. This SPEC didn't introduce them. Daniel directive 2026-05-09: continue + log as pre-existing finding for follow-up REC.
- **Reproduction:**
  ```bash
  curl -s https://www.prizma-optic.co.il/sitemap-dynamic.xml | grep -oE '<loc>[^<]+brands/[^<]+</loc>' | head -20
  # Then HEAD-probe a sample → ~30-40% are 404.
  ```
- **Suggested next action:** NEW_SPEC — `M3_SITEMAP_BRAND_404_CLEANUP`: extend the brand-slug query to filter out brands without a public detail-page route. Either (a) join `v_storefront_brands` to a published-pages table to verify route existence, OR (b) add a `has_public_page` boolean to the brand row, OR (c) maintain an allowlist of slugs that are known live. Recommended: (a) since it's automatic. Estimated 30-60 min.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Pre-existing malformed-URL bug for CMS pages with no leading-slash slug (fixed in this SPEC)

- **Code:** `M3-DATA-02`
- **Severity:** MEDIUM (caught + fixed in same SPEC; would have been HIGH if persistent)
- **Discovered during:** Step 0 inspection of `<loc>` patterns in production sitemap — saw `https://prizma-optic.co.ilsupersale` (no slash separator)
- **Location:** `src/pages/sitemap-dynamic.xml.ts:113` (pre-fix) — `loc: \`${baseUrl}${langPrefix}${hePage.slug}\`` — concatenated raw `slug` from `v_storefront_pages.slug` which can lack a leading `/`. Pages like `slug='supersale'` (en + ru, verified) produced `https://prizma-optic.co.ilsupersale` instead of `.../supersale/`.
- **Description:** This is THE classic "what happens when DB-stored values have inconsistent leading-slash convention" bug. Two `storefront_pages` rows for prizma have slug `supersale` (no leading slash) — the en + ru SuperSale Sales-Event landing pages. Their sitemap URLs were broken-by-concatenation. Fixed via new `normalizeSlug(s)` helper that prepends `/` if missing. Same fix applied to all 3 sitemap-emission sites in the file (loc, alternates href, x-default). Pre-existing — the apex-domain sitemap had the same broken URLs.
- **Reproduction:**
  ```sql
  SELECT slug, lang FROM storefront_pages WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug NOT LIKE '/%';
  -- Returns 2 rows (supersale en + ru) — both had broken sitemap URLs pre-fix.
  ```
- **Suggested next action:** TECH_DEBT — could ALSO add a CHECK constraint `CHECK (slug LIKE '/%')` on `storefront_pages.slug` to prevent this class of bug at DB layer (analogous to L-PROJECT-002 jsonb CHECK). Out of scope for this SPEC since the renderer-side fix already shipped.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `verify-sitemap.mjs` URL-count threshold initially miscalibrated (368 vs reality 364)

- **Code:** `M3-EXEC-03`
- **Severity:** LOW
- **Discovered during:** First production run of `verify-sitemap.mjs` post-deploy
- **Location:** `scripts/verify-sitemap.mjs` original threshold expected 368 `<loc>` entries (362 baseline + 6 branch entries)
- **Description:** Production reality: 364 `<loc>` entries (362 baseline + 2 added). I miscounted because the dynamic generator emits ONE `<loc>` per page-group with per-language alternates as `<xhtml:link rel="alternate" hreflang>` tags (the canonical Sitemap-protocol hreflang pattern). So 6 branch URLs → 2 page-groups × 3 hreflang alternates = 2 `<loc>` + 6 alternate-hrefs = 8 URL strings, but only 2 contribute to `<loc>` count. Updated `verify-sitemap.mjs` to count `<xhtml:link href>` separately + lower threshold to 363; check branch URLs against the union of locs+alternates.
- **Reproduction:**
  ```bash
  curl -s sitemap-dynamic.xml | grep -c '<loc>'         # 364
  curl -s sitemap-dynamic.xml | grep -c '<xhtml:link'   # 986
  ```
- **Suggested next action:** DISMISS — script has been corrected in commit `9a68dd6` to match the actual hreflang grouping pattern.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `getBaseUrl()` returns apex (not www) for tenants whose `storefront_config.custom_domain` is set without `www`

- **Code:** `M3-DATA-04`
- **Severity:** LOW (mitigated by sitemap generator no longer using getBaseUrl)
- **Discovered during:** Investigating why pre-fix sitemap emitted apex URLs
- **Location:** `src/lib/tenant.ts:268-276` — `getBaseUrl(tenant, request)` returns `https://${tenant.storefront.custom_domain}`. Prizma's `custom_domain` is `prizma-optic.co.il` (no www). Per-request canonical-URL emission anywhere downstream of `getBaseUrl` was apex.
- **Description:** Anywhere in the codebase that calls `getBaseUrl(tenant, request)` for a canonical URL gets the apex form. The sitemap generator was the most visible consumer; switched to `Astro.site.origin` (canonical from `astro.config.mjs`) instead. Other consumers may or may not need switching too — quick grep:
  ```
  src/lib/tenant.ts:267:export function getBaseUrl(tenant: TenantConfig, request?: Request): string {
  src/pages/products/[barcode].astro
  src/pages/brands/[slug].astro
  src/pages/branches/[slug].astro
  src/pages/sitemap-dynamic.xml.ts (FIXED in this SPEC)
  ```
  Most other consumers use `getBaseUrl` to build OG meta tags, schema.org URLs, etc. Same apex-vs-www issue applies but with less SEO impact (browsers follow the 307; Google does too just slower).
- **Suggested next action:** TECH_DEBT — either (a) UPDATE `storefront_config.custom_domain` for prizma to `www.prizma-optic.co.il` (1 SQL UPDATE, fixes ALL consumers in one shot), OR (b) refactor `getBaseUrl` to force-prepend `www.` if the host is the apex of a www-served domain. Recommended: (a) cleaner, one-line, no code change. Reference: M3_BRANCHES_INFRA_AND_ASHKELON Finding M3-INFRA-05 surfaced the same issue for Schema.org JSON-LD `@id` URLs.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — `Astro.site` was set to apex pre-change (also contributed to the apex-URL emission)

- **Code:** `M3-DATA-05`
- **Severity:** INFO (fixed in this SPEC; documented for audit trail)
- **Discovered during:** Reading `astro.config.mjs` before edit
- **Location:** `astro.config.mjs:9` (pre-fix) — `site: 'https://prizma-optic.co.il'`
- **Description:** The Astro framework reads `site:` for `Astro.site` (used by sitemap, canonical-URL helpers, etc.). Pre-fix it was the apex. The `@astrojs/sitemap` integration that I removed produced `sitemap-0.xml` with apex URLs because `Astro.site` was apex. Switched to `https://www.prizma-optic.co.il`. This single config change is the right place to source canonical URL — fixes BOTH the dynamic generator (now reads `site` directly) AND any other Astro internal that uses `Astro.site`.
- **Suggested next action:** DISMISS — fixed in this SPEC's commit `68a6581`.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
