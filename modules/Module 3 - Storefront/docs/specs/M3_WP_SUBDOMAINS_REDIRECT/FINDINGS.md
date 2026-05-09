# FINDINGS — M3_WP_SUBDOMAINS_REDIRECT

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/FINDINGS.md`
> **Written by:** opticup-executor (Phase A, 2026-05-08)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — WP server throttles HEAD requests under crawl pressure

- **Code:** `M3-INFRA-01`
- **Severity:** INFO
- **Discovered during:** §4-A WP source-URL probe (stratified sample, n=144)
- **Location:** `https://ru.prizma-optic.co.il`, `https://en.prizma-optic.co.il` (Engintron + nginx infrastructure)
- **Description:** A first attempt to HEAD-probe all 3,223 WP source URLs at concurrency 5 (~5 req/sec) achieved only ~0.73 req/sec actual — meaning each batch of 5 was dominated by the slowest fetch (8s+). After switching to a stratified sample of 144 URLs at concurrency 20, **>90% timed out** at 8s. The same URLs return 200 OK for browser-style GET requests, and the SPEC §3 Step-0 sanity checks (single curl `-sI` per subdomain root) returned 200 instantly. Hypothesis: nginx/Engintron treats sustained HEAD bursts differently from one-off curls, possibly via Redis-backed rate-limit / connection-limit / cache-priority logic. Mapping logic is unaffected because rules are deterministic from sitemap classification, not from probe result.
- **Reproduction:**
  ```bash
  # one curl works (200 immediately):
  curl -sI https://ru.prizma-optic.co.il/about/

  # 144 concurrent HEAD probes timeout at 8s in 90%+ cases
  ```
- **Expected vs Actual:**
  - Expected: HEAD probes return the same status as browser GET for a public URL.
  - Actual: HEAD probes timeout at high failure rate under any sustained crawl, while the same URLs are rendered live in browsers and return 200 to one-off curls.
- **Suggested next action:** DISMISS (informational only, no project impact)
- **Rationale for action:** The redirect plan does not depend on per-URL liveness — sitemap inclusion is the authoritative signal of "should be redirected." Once Daniel imports the CSVs to the Redirection plugin, the plugin attaches to the WP request lifecycle and serves 301s without depending on HEAD probability. If any source URL is in fact already 404 on the WP side, the Redirection plugin's CSV row simply never matches a live request — harmless.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `/shop/` source URL duplicated in page-sitemap and as effective WooCommerce root

- **Code:** `M3-DATA-02`
- **Severity:** LOW
- **Discovered during:** §4-D CSV generation, dedup pass
- **Location:** `https://ru.prizma-optic.co.il/page-sitemap.xml`, same for `en.`; conflicts with effective root (`/` listed both explicitly and via page-sitemap on this WP install)
- **Description:** Two URLs appear twice in the raw inventory — the WP site root (`/`) is in the page-sitemap **and** is the implicit homepage; and `/shop/` is the WC shop archive page **and** appears as a regular WP page. The dedup pass (CSV generation, keep-first) handled both — final CSV has 1,609 (ru) + 1,610 (en) = 3,219 unique source URLs vs 3,223 raw sitemap entries. No impact on the redirect plan, but worth noting for any future tooling that ingests these sitemaps.
- **Reproduction:**
  ```bash
  awk -F, '{print $1}' redirects/ru.csv | sort | uniq -d
  # (returns nothing after dedup — confirms cleanup worked)
  ```
- **Expected vs Actual:**
  - Expected: each WP URL listed once across all sitemaps.
  - Actual: 2 URLs (`/` and `/shop/`) listed in two sitemaps each.
- **Suggested next action:** DISMISS
- **Rationale for action:** WordPress / WooCommerce sitemap behavior is not under our control. Dedup at CSV generation handles it. If we one day decommission these sitemaps (Phase C / SPEC `M3_WP_SUBDOMAINS_DECOMM`), the issue disappears entirely.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Astro storefront page slugs use `/multi/` while WP uses `/multifocal/` (ru) and `/multifocal-glasses/` (en)

- **Code:** `M3-SEO-03`
- **Severity:** LOW
- **Discovered during:** §4-C override-matching pass against `storefront_pages` table
- **Location:** `storefront_pages` slugs `/multi/` (en + ru) vs WP page slugs `/multifocal/` (ru) and `/multifocal-glasses/` (en)
- **Description:** The Astro site uses an aggressively-shortened URL slug (`/multi/`) for a high-intent page (multifocal lenses). Substring-matching caught the redirect (both languages pointing the WP slug to `/multi/`), but the asymmetry is notable: (a) two languages use different WP slugs for the same page; (b) the Astro slug is so short that any substring like "multi" or "ulti" would hit it, raising the risk of false-positive override matches in future audits; (c) for SEO purposes, the new Astro page would benefit from a longer, keyword-rich slug like `/multifocal-glasses/` or `/multifocal-lenses-guide/`.
- **Reproduction:**
  ```sql
  SELECT slug, lang FROM storefront_pages
  WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
    AND status='published'
    AND slug LIKE '%multi%';
  -- returns: /multi/ (en), /multi/ (ru), /multifocal-guide/ (both langs), /משקפי-מולטיפוקל/ (both)
  ```
- **Expected vs Actual:**
  - Expected: Astro slug names as descriptive as the WP equivalents (better for SEO and for substring-match precision).
  - Actual: Astro `/multi/` is too short. Substring matched `/multifocal/` (ru) and `/multifocal-glasses/` (en) correctly here, but a future page `/multitouch/` or `/multimedia/` would also collide.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Renaming a published Astro slug requires a redirect of its own (`/multi/ → /multifocal-glasses/`) plus CMS row updates, so it's not free. Worth raising as a tech-debt item the next time someone audits storefront SEO. Adding to SITE_OVERSEER_HANDOFF as REC-SITE-016 candidate, separate from this SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — SPEC §4-A premise of "5 sitemap types" undercounted live sitemap_index by 4 (`product_brand`, `product_cat`, `product_tag`, `author`)

- **Code:** `M3-SPEC-04`
- **Severity:** MEDIUM
- **Discovered during:** §4-A initial sitemap discovery
- **Location:** `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/SPEC.md` §4-A bullet 2
- **Description:** The SPEC enumerated `post-sitemap.xml`, `page-sitemap.xml`, `product-sitemap.xml`, `category-sitemap.xml`, `post_tag-sitemap.xml`, "plus any others discovered." The live sitemap_index actually exposes **9 child sitemaps** per subdomain, including 4 unanticipated (`product_brand`, `product_cat`, `product_tag`, `author`) representing **+1,548 URLs** of taxonomy/archive pages. This drove the URL count past the SPEC §6 stop-trigger of 2,000 (final: 3,223). Daniel was prompted via tool-call and approved bulk inclusion. Logged as DECISIONS_LOG entry 2026-05-08, LEARNINGS L-SITE-001.
- **Reproduction:**
  ```bash
  curl -s https://ru.prizma-optic.co.il/sitemap_index.xml | grep -c '<loc>'
  # returns 9 (not 5)
  ```
- **Expected vs Actual:**
  - Expected per SPEC: ~1,675 URLs (5 sitemap types).
  - Actual on the wire: 3,223 URLs (9 sitemap types).
- **Suggested next action:** NEW_SPEC (Foreman-skill update)
- **Rationale for action:** This is a SPEC-author-side gap, not a code or data fix. The right remediation is to update the opticup-strategic skill so future SPECs that crawl WordPress always start by GETting the live `sitemap_index.xml` and enumerating ALL `<loc>` entries, rather than enumerating the "common 5". The Foreman skill update can be embedded in `FOREMAN_REVIEW.md` for this SPEC as an executor-skill improvement proposal (Proposal 1 below in EXECUTION_REPORT §8) and / or a Foreman-skill improvement.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
