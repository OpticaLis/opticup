# FINDINGS — M3_WP_BLOG_POST_MAPPING

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/FINDINGS.md`
> **Written by:** opticup-executor (2026-05-08)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Astro blog post route is `/{lang}/{slug}/` NOT `/{lang}/blog/{slug}/`

- **Code:** `M3-INFRA-01`
- **Severity:** HIGH (would have caused 100% 404s on the redirect destinations had the SPEC been followed literally)
- **Discovered during:** §3 destination spot-check before pushing redirects
- **Location:** Astro storefront routing on Vercel; SPEC §2 "Astro renders these at `https://www.prizma-optic.co.il/{lang}/blog/{slug}/`" is incorrect.
- **Description:** The SPEC's premise §2 stated the Astro blog post route as `/{lang}/blog/{slug}/`. Empirical verification: `/en/blog/find-your-blind-spot/` returns **404** while `/en/find-your-blind-spot/` returns **200**. Same for `/myopia-in-children/` and other 4 spot-check slugs. The blog INDEX is at `/{lang}/blog/` but individual posts are mounted directly under the lang root, not under `/blog/`. The SPEC §3 Step 0 example URL `https://www.prizma-optic.co.il/ru/blog/виды-мультифокальных-линз/` happens to return 200 — but only because Vercel's path matching for raw Cyrillic UTF-8 has a fallback that catches the slug under `/{lang}/`; with the percent-encoded form the same `/blog/` path 404s. A literal SPEC implementation would have produced 1,610 redirects all pointing to 404s, defeating the entire purpose.
- **Reproduction:**
  ```bash
  curl -sIL https://www.prizma-optic.co.il/en/blog/find-your-blind-spot/   # 404
  curl -sIL https://www.prizma-optic.co.il/en/find-your-blind-spot/        # 200
  curl -sIL https://www.prizma-optic.co.il/en/blog/                        # 200 (index)
  ```
- **Expected vs Actual:**
  - Expected per SPEC §2: `/{lang}/blog/{slug}/` is the canonical post URL.
  - Actual on Vercel: `/{lang}/{slug}/` is canonical; the `/blog/` segment is only the index page.
- **Suggested next action:** TECH_DEBT (resolve in next Foreman session — update opticup-strategic SKILL to verify destination route patterns at SPEC-author time, AND consider whether the Astro routing should move blog posts under `/blog/` for cleaner URL structure).
- **Rationale for action:** The SPEC's destination URL pattern was a fact-check failure on the Foreman side. The fix in this SPEC is a one-line code change (already applied in matcher §10 logic; deviation logged in EXECUTION_REPORT §3). For future SPECs that include explicit URL patterns, the executor should HEAD-probe the pattern with a representative slug BEFORE generating any mappings. This is a Foreman-skill update + an executor-skill update.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — WP REST `/posts` endpoint excludes 1 post per subdomain that the sitemap includes

- **Code:** `M3-DATA-02`
- **Severity:** LOW
- **Discovered during:** §4-A WP post fetch (REST returned 42 ru / 43 en, while REC-SITE-015 sitemap had 43 ru / 44 en)
- **Location:** WP REST `/wp-json/wp/v2/posts` vs sitemap.xml on `ru.prizma-optic.co.il` and `en.prizma-optic.co.il`
- **Description:** The WP REST API's default `posts` endpoint returns only `status=publish` posts authored by users visible to the authenticated context. It excludes drafts, private posts, and `status=any` filtering wasn't applied. The sitemap, by contrast, includes any indexable post regardless of visibility-to-API. Consequence: 1 post on each subdomain is in the sitemap (and therefore in the existing `/blog/` redirect from REC-SITE-015) but NOT in this SPEC's REST-fetched mapping. After surgery on ru, those 1+1 orphan posts retain their old `/blog/` index redirect (correct fallback behavior).
- **Reproduction:**
  ```bash
  curl -s -u 'daniel:...' 'https://ru.prizma-optic.co.il/wp-json/wp/v2/posts?per_page=100' | jq length
  # 42
  curl -s 'https://ru.prizma-optic.co.il/post-sitemap.xml' | grep -c '<loc>'
  # 43
  ```
- **Expected vs Actual:**
  - Expected: REST returns the same set of posts the sitemap exposes.
  - Actual: 1 post per subdomain is sitemap-only (likely scheduled, password-protected, or future-dated).
- **Suggested next action:** DISMISS (orphans correctly fall back to `/{lang}/blog/` index — no user-visible regression).
- **Rationale for action:** The 1 orphan per subdomain is deliberately preserved with its existing index-fallback redirect. If Daniel wants to reach the orphans specifically, the next iteration could pass `?status=any&filter[orderby]=date` or query a richer endpoint. For Phase A purposes this is harmless.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Redirection plugin's CSV importer treats the header row as a literal redirect

- **Code:** `M3-INFRA-03`
- **Severity:** LOW
- **Discovered during:** §4-C verification — pre/post redirect counts diverged by 1 after every CSV import
- **Location:** `Redirection` plugin (John Godley) `POST /wp-json/redirection/v1/import/file/{group}` endpoint
- **Description:** The plugin's CSV importer does not skip the first row when it contains the literal header text `source_url,target_url,match_type,action_type,action_code`. Instead it imports a junk redirect with `url=/source_url`, `target=target_url`, `code=301`. This is invisible to end users (no real request matches `/source_url`), but it leaves the redirect table 1 row larger than the data set. REC-SITE-015 left 1 such junk redirect (ID 2) on `ru.`; this SPEC's two CSV imports created 2 more junk redirects (deleted as cleanup; ID 2 left in place to avoid scope creep on a pre-existing artifact).
- **Reproduction:**
  ```bash
  # After any csv import:
  curl -s -u 'daniel:...' 'https://X.prizma-optic.co.il/wp-json/redirection/v1/redirect?per_page=5&filterBy[url]=source_url'
  # returns the junk row (id varies)
  ```
- **Expected vs Actual:**
  - Expected: importer skips the header row.
  - Actual: importer treats it as data.
- **Suggested next action:** TECH_DEBT (add a 1-line cleanup pass after every CSV import: `DELETE FROM ... WHERE url = '/source_url' AND action_data->>'url' = 'target_url'`. Or — since the CSV header is a Redirection-plugin import format requirement — strip the header before submission, but the plugin docs say header is required to identify columns; testing whether headerless import works is itself a 5-minute task for a future cleanup SPEC).
- **Rationale for action:** Cosmetic. Plugin admin UI shows the junk row and might confuse Daniel later. Cheap to clean post-import. Not worth a hot-fix SPEC; bundle into next redirect-plugin work.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Existing pre-SPEC junk redirect ID 2 left in place on ru. (REC-SITE-015 artifact)

- **Code:** `M3-INFRA-04`
- **Severity:** INFO
- **Discovered during:** Cleanup pass after this SPEC's import
- **Location:** `ru.prizma-optic.co.il/wp-json/redirection/v1/redirect/2`
- **Description:** When investigating Finding M3-INFRA-03, found that REC-SITE-015's CSV import on 2026-05-08 (earlier this day) had also created a junk header redirect (ID 2). This SPEC's autonomy envelope (§6: "MUST NOT modify ANY non-redirect WP content") is silent on whether pre-existing junk from prior SPECs should be cleaned during this work. To stay within scope I deleted only the junk created BY this SPEC's import (the 2 imports' header rows on ru. ID 1612 and en. ID 1) and left ID 2 in place.
- **Reproduction:**
  ```bash
  curl -s -u 'daniel:...' 'https://ru.prizma-optic.co.il/wp-json/redirection/v1/redirect?per_page=5&filterBy[url]=source_url'
  # ID 2 still present (out-of-scope cleanup)
  ```
- **Suggested next action:** DISMISS or fold into M3-INFRA-03 cleanup
- **Rationale for action:** A 1-line `DELETE` whenever next someone touches this plugin will resolve both M3-INFRA-03 (this SPEC's prevention) and M3-INFRA-04 (REC-SITE-015's residue) in one go.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — WP ru. has Hebrew-slug posts that redirect (correctly) to Russian Astro destinations

- **Code:** `M3-CONTENT-05`
- **Severity:** INFO
- **Discovered during:** §3 spot-check — sample WP ru. URL `/תזונה-ובריאות-העין-מה-כדאי-לאכול-בשביל/` (Hebrew slug, on the Russian subdomain) redirected to `/ru/питание-и-здоровье-глаз-...` (Russian Astro slug)
- **Location:** WP `ru.prizma-optic.co.il` posts table
- **Description:** Some WP ru. posts have Hebrew (not Russian) URL slugs but Russian post titles. This is consistent with a content-team workflow where the post was originally drafted in Hebrew, the slug auto-generated from the Hebrew title, then the post was machine-translated or manually rewritten in Russian without slug regeneration. The matcher correctly handles this — the title fuzzy-match still finds the right Russian Astro post, and the redirect points to the canonical Russian Astro slug.
- **Suggested next action:** DISMISS (matcher handles correctly)
- **Rationale for action:** Doesn't break the redirect logic. May be worth flagging on the WP side to the content team next time they edit, but not a Phase A concern.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
