# SPEC — M3_WP_SUBDOMAINS_REDIRECT

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-07
**Type:** Migration cleanup — 301 redirect old WordPress subdomains
**Severity:** HIGH (live customer harm — old phone, old prices, duplicate-content SEO penalty)

---

## 1. Goal

Two phases, sequential:

**Phase A — Mapping (Claude Code, autonomous):** Crawl `https://ru.prizma-optic.co.il` and `https://en.prizma-optic.co.il` (the legacy WordPress subdomains, ~837 + ~838 URLs each). For every public URL produce a planned 301 destination on the new Astro site (`https://www.prizma-optic.co.il`). Output a CSV ready for Daniel to paste into the cPanel/WordPress Redirection plugin.

**Phase B — Manual execution (Daniel):** Daniel logs into cPanel WP-Toolkit (`https://cp2.dreamvps.com:2083/cpsess5761918619/frontend/jupiter/wp-toolkit/`), opens each WordPress instance (`ru.` and `en.`), installs/uses the Redirection plugin, and bulk-imports the CSV from Phase A. Then verifies a sample of redirects.

**Phase C — Future cleanup (next SPEC, after ~30 days):** Once Google has re-indexed the new URLs and the redirects show in Google Search Console, take down the WordPress instances entirely (DNS removal + cPanel cleanup).

---

## 2. Background

### Live state (verified 2026-05-07)

- `ru.prizma-optic.co.il` — WordPress, served by nginx + Engintron, hosted at DreamVPS. Sitemaps:
  - 43 posts (`/post-sitemap.xml`)
  - 23 pages (`/page-sitemap.xml`)
  - 771 products (`/product-sitemap.xml`)
  - + tags + categories
- `en.prizma-optic.co.il` — same structure: 44 posts, 23 pages, 771 products.
- Both still served from a WordPress install. Customer impact: rendering old phone `053-434-7265`, old pricing, content that contradicts the new Astro site, plus SEO duplicate-content penalty.
- New Astro site lives at `https://www.prizma-optic.co.il` (apex `prizma-optic.co.il` 307→ `www`). Languages segmented as `/he/` (or root, since HE is default), `/en/`, `/ru/`.

### Why this SPEC exists

Daniel directive 2026-05-07 after spotting that the old WordPress subdomains were still live months after the Astro migration. Site Overseer should have caught this in the original audit (M3_SITE_COMPREHENSIVE_REVIEW) — **finding logged in §11.3 below as a methodology gap; LEARNINGS update follows.**

### Cargo

- **Cargo:** all WordPress URLs are public, crawlable, indexed in Google. Map every one. Don't drop any in case the long tail (771 products) is what brings real traffic.
- **Authority:** on the WordPress side, Daniel has cPanel + WP-Toolkit access. On the Astro side, the executor already has `develop` push permission (storefront repo).

---

## 3. Step 0 — Reproduce-the-bug-first (MANDATORY)

Before authoring any mapping, executor verifies:

1. `curl -sI https://ru.prizma-optic.co.il/` returns 200 + WP signatures (server: nginx, x-server-powered-by: Engintron).
2. `curl -sI https://en.prizma-optic.co.il/` same.
3. `curl -s https://ru.prizma-optic.co.il/sitemap_index.xml | head -5` returns valid sitemap-index XML.
4. `curl -s https://ru.prizma-optic.co.il/post-sitemap.xml | grep -c "<loc>"` returns ≥40.
5. `curl -sIL https://www.prizma-optic.co.il/ru/` returns 200 (the new site IS live in Russian — destination exists).
6. `curl -sIL https://www.prizma-optic.co.il/en/` returns 200.

If any check deviates, STOP — the premise has shifted (e.g. someone took down the WP subdomains already, OR the new site lacks the destination locale).

---

## 4. Scope

### In scope

**A. Crawl + classify all WordPress URLs**

For each subdomain (`ru.`, `en.`):

1. Read `sitemap_index.xml` → expand to all child sitemaps.
2. Aggregate all `<loc>` URLs from: `post-sitemap.xml`, `page-sitemap.xml`, `product-sitemap.xml`, `category-sitemap.xml`, `post_tag-sitemap.xml`, plus any others discovered.
3. For each URL, classify by type (post / page / product / category / tag / other) and extract slug.
4. Probe each URL with HEAD (`curl -sI`) to confirm 200; flag non-200s separately (likely already-redirected or already-deleted on the WP side).

**B. Map each WordPress URL to a destination on the new site**

The mapping logic is rules-based and applied in order. First rule that matches wins:

| Priority | Source pattern | Destination on new site | Notes |
|---|---|---|---|
| 1 | `/` (root) | `/{lang}/` | Direct language root mapping |
| 2 | Known page slug with direct equivalent (e.g. `/about-us/` → `/about/`) | Manual override table (see §4 D) | Daniel-confirmed pairs |
| 3 | `/product/{slug}/` (WooCommerce product) | `/{lang}/products/` | All products redirect to the products listing on the new site (no per-product mapping — the new site uses different barcodes, no SKU-stable mapping exists) |
| 4 | `/product-category/{slug}/` | `/{lang}/categories/` | Catalog index |
| 5 | `/category/{slug}/` (WP post category) | `/{lang}/blog/` | Blog index |
| 6 | `/tag/{slug}/` | `/{lang}/blog/` | Tag pages → blog index |
| 7 | `/{post-slug}/` (single post) | `/{lang}/blog/` (or attempt slug-match against the new site's `/blog/`) | Default blog index. Better-effort: if a slug-match exists, use it. |
| 8 | `/wp-content/...`, `/wp-admin/...`, `/wp-json/...`, `/feed/`, `/?p=N` query forms | DROP from redirect list; let WP's own redirects (or absence of) handle them | Don't expose WP infrastructure to indexing |
| 9 | Anything else not matched | `/{lang}/` (site root, fallback) | Catch-all |

The `{lang}` token is `ru` for `ru.prizma-optic.co.il` and `en` for `en.prizma-optic.co.il`.

**C. Manual override table** — populated during the crawl when the executor finds:
- A WP page whose title or H1 corresponds to an existing Astro page (e.g. WP `/о-нас/` → Astro `/ru/about/`).
- A WP guide whose URL matches an existing Astro guide (e.g. WP `/multifocal-lenses-guide/` → Astro `/en/multifocal-guide/`).

The executor should pattern-match WP slugs against the Astro `storefront_pages` table for that lang via Supabase MCP (`SELECT slug FROM storefront_pages WHERE tenant_id=(prizma) AND lang='en' AND status='published'`) and propose direct-mapping pairs where the slug or normalized title corresponds. Each proposed pair is added to the override table for Daniel to confirm/reject.

**D. Output: 2 CSV files (one per subdomain)**

Format compatible with the WordPress **Redirection** plugin's CSV import:

```
source_url,target_url,match_type,action_type,action_code
/о-нас/,https://www.prizma-optic.co.il/ru/about/,url,url,301
/product/example-frame/,https://www.prizma-optic.co.il/ru/products/,url,url,301
...
```

One CSV for `ru.`, one for `en.`. Plus a README explaining the import flow.

### Out of scope (Phase A — this SPEC)

- ANY change to the WordPress instances themselves (Daniel does Phase B manually).
- ANY change to the new Astro site's content.
- DNS modifications.
- Removing the WP subdomains (Phase C, future SPEC).
- Setting up an HTTP-level redirect (e.g. nginx-side rule) — possible but requires SSH access; cPanel/Redirection-plugin path is simpler.
- 1:1 product-level mapping — the WP product slugs and the Astro barcodes are different namespaces; no clean automated mapping. All products fall back to the catalog index per rule #3.
- Crawling internal `/wp-admin`, `/wp-json`, etc. — explicitly excluded.

### Whitelist of write paths (Phase A executor)

ERP repo only:
1. `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/EXECUTION_REPORT.md`
2. `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/FINDINGS.md`
3. `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/ru.csv`
4. `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/en.csv`
5. `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/IMPORT_INSTRUCTIONS.md`
6. `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/CRAWL_LOG.md` (raw URL list with per-URL classification + mapping decision)
7. `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` (update existing — log REC-SITE-002 / new REC-SITE-015)
8. `roles/site-overseer/DECISIONS_LOG.md` (append decision)
9. `roles/site-overseer/LEARNINGS.md` (create if missing — append L-SITE-001)

No DB writes. No deploys. No edits to either repo's source code. No edits to WP.

---

## 5. Success Criteria (Phase A — Claude Code execution)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 6 sub-checks PASS |
| 2 | Both subdomain sitemaps fully crawled | CRAWL_LOG.md page count | ≥40 ru-posts + ≥20 ru-pages + ≥770 ru-products + same for en |
| 3 | Each URL has a classified type | CRAWL_LOG.md table | 100% rows have `type` column non-empty |
| 4 | Each URL has a destination per §4-B rules | CSV rows | 100% rows have `target_url` non-empty + 301 |
| 5 | No URL maps to a destination that 4xx/5xx | spot-check 20 random destinations with `curl -sI` | All return 2xx or 3xx |
| 6 | Manual override pairs proposed | OVERRIDES section in CRAWL_LOG.md | ≥10 high-confidence pairs flagged for Daniel review |
| 7 | CSV files valid for Redirection-plugin import | Header row matches plugin spec | `source_url,target_url,match_type,action_type,action_code` |
| 8 | IMPORT_INSTRUCTIONS.md complete + tested-readable | manual review | Instructions cover: cPanel login → WP-Toolkit → open ru. → install Redirection plugin → import CSV → verify with sample URLs |
| 9 | Single atomic commit on develop (ERP repo only) | `git log -1 --oneline` | One commit, message starts `audit(storefront): WP-subdomain redirect mapping M3_WP_SUBDOMAINS_REDIRECT` |
| 10 | Repo clean post-commit | `git status` | `nothing to commit, working tree clean` |
| 11 | Integrity gate clean | `npm run verify:integrity` | exit 0 |
| 12 | LEARNINGS L-SITE-001 added | grep | "subdomain enumeration" rule present |

---

## 6. Autonomy Envelope

**Executor MAY autonomously:**
- HEAD/GET any URL on `ru.prizma-optic.co.il`, `en.prizma-optic.co.il`, `www.prizma-optic.co.il`.
- Read all sitemaps; expand sitemap-indexes.
- Read-only Supabase MCP queries against `storefront_pages` for slug-matching.
- Crawl rate: 2-5 req/sec — be polite to the WP server; don't trigger DDoS-detection.
- Write the 9 whitelist files in §4.
- Commit + push ERP develop ONCE.

**Executor MUST stop and report:**
- ru. or en. starts returning 5xx/captcha/blocked → pause, retry slower, escalate if persists.
- Crawl produces >2,000 URLs (premise was ~1,675) — premise drift, reconcile.
- Sitemap is malformed and untrustworthy → escalate; alternative is HTML-link crawl (slower, may need scope reduction).
- Override matches reach >50 — over-flagging; ask Daniel which to use.

**Executor MUST NOT:**
- POST/PUT/DELETE to anything.
- Modify WP, Vercel, or any DNS.
- Touch storefront repo source.
- Execute the redirects (Phase B is Daniel's manual step).
- Skip Step 0 or LEARNINGS update.

---

## 7. Stop-on-Deviation Triggers

In addition to global:
- WP server response time exceeds 10s/request consistently → reduce concurrency, log degradation; if no improvement, abort and escalate.
- A non-trivial fraction (>5%) of WP URLs return non-200 → flag in FINDINGS; the WP install may be partially broken; mapping still proceeds for the 200s.
- A new previously-unknown sitemap path appears (e.g. `/news-sitemap.xml`) → include if found, log discovery.

---

## 8. Expected Final State (after Phase A executes)

**On disk (commit hash X, ERP repo):**
- `redirects/ru.csv` — ~837 redirects, plugin-import-ready.
- `redirects/en.csv` — ~838 redirects, plugin-import-ready.
- `redirects/IMPORT_INSTRUCTIONS.md` — step-by-step Daniel guide.
- `CRAWL_LOG.md` — full URL inventory with classification and override table.
- `EXECUTION_REPORT.md` + `FINDINGS.md`.
- `SITE_OVERSEER_HANDOFF.md` updated.
- `DECISIONS_LOG.md` appended.
- `LEARNINGS.md` with L-SITE-001 (subdomain enumeration rule).

**Production:** UNCHANGED. WP still live, new site unchanged, DNS unchanged.

**Daniel's next step (Phase B):** open the import instructions, log into cPanel WP-Toolkit for `ru.` and `en.`, install Redirection plugin (free, official), import each CSV, verify a sample of 5-10 redirects, monitor.

**~30 days later (Phase C):** new SPEC to remove the WP subdomains entirely (DNS unbind + cPanel domain remove). Defers until Google has migrated indexed URLs to the new destinations.

---

## 9. Commit Plan

Single atomic commit on `develop` (ERP repo):
```
audit(storefront): WP-subdomain redirect mapping M3_WP_SUBDOMAINS_REDIRECT

Closes Site Overseer REC-SITE-015 (catch-up on WP subdomains gap from
M3_SITE_COMPREHENSIVE_REVIEW). Phase A only — produces redirect plan
for Daniel's manual cPanel execution.

Crawled ru.prizma-optic.co.il and en.prizma-optic.co.il (~1,675 URLs total).
Classified, mapped to www.prizma-optic.co.il/{lang}/* destinations per
rules-based logic, generated 2 plugin-ready CSV files plus manual override
table for Daniel review.

LEARNINGS L-SITE-001 added: every site audit MUST enumerate ALL subdomains
of the canonical apex domain (DNS query + manual list verification) before
defining audit scope. Original M3_SITE_COMPREHENSIVE_REVIEW skipped this
and missed 1,675 indexed URLs on legacy WP subdomains.

No deploys. No DB writes. No code changes. CSVs require Daniel's manual
import via cPanel Redirection plugin (Phase B).
```

Add files (explicit, no -A):
```
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/EXECUTION_REPORT.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/FINDINGS.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/CRAWL_LOG.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/ru.csv
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/en.csv
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/IMPORT_INSTRUCTIONS.md
git add roles/site-overseer/SITE_OVERSEER_HANDOFF.md
git add roles/site-overseer/DECISIONS_LOG.md
git add roles/site-overseer/LEARNINGS.md
```

---

## 10. IMPORT_INSTRUCTIONS.md template (Daniel's Phase B guide)

The file the executor produces should follow this skeleton. Hebrew first since Daniel reads Hebrew, English second for technical names:

```markdown
# הוראות ייבוא — הפניות 301 מהוורדפרס הישן

## למה זה כאן
האתר הישן ב-ru.prizma-optic.co.il ו-en.prizma-optic.co.il עדיין חי ומציג
תוכן ישן. הקבצים בתיקייה הזאת מפנים כל URL ישן ל-URL החדש באתר Astro.
לאחר הייבוא, גוגל יחליף את התוצאות בעמודים הנכונים תוך 4-8 שבועות.

## שלבים

### ru.prizma-optic.co.il
1. https://cp2.dreamvps.com:2083/cpsess5761918619/frontend/jupiter/wp-toolkit/
2. בחר את ה-instance של ru.prizma-optic.co.il
3. WordPress Admin → Plugins → Add New
4. חפש "Redirection" (by John Godley) → Install → Activate
5. Tools → Redirection → Import/Export → Import → CSV
6. העלה את הקובץ `ru.csv` מהפרויקט
7. אישור: רשימת ההפניות צריכה להכיל ~837 שורות, כולן 301

### בדיקת מדגם (5-10 URLs)
פתח 5 URLs ישנים מהקובץ; כל אחד צריך להפנות אוטומטית ל-www.prizma-optic.co.il/ru/...

### en.prizma-optic.co.il
חזור על אותם השלבים עם הקובץ `en.csv`.

## אם משהו לא עובד
- אם Redirection plugin לא נטען — בדוק שה-WP version >= 5.0
- אם CSV import נכשל — נסה Tools → Redirection → Settings → Disable WordPress 404 logging זמנית
- אם redirect לא מתבצע — נקה cache (Engintron / Cloudflare / WP cache plugin)
```

---

## 11. Methodology notes & lessons

### 11.1 Crawl strategy
- Start from `sitemap_index.xml` per subdomain (already verified to exist + be valid).
- Expand each child sitemap. Don't HTML-crawl — sitemaps are authoritative for "what's indexed".
- Polite rate: 2-5 req/sec.
- Per URL: HEAD-only is enough for status; no need to GET HTML body unless slug-matching for overrides requires the page title.

### 11.2 Override matching heuristic
For each WP page (NOT product, NOT post — those auto-route), compute:
- normalized slug (lowercase, dashes/underscores stripped)
- compare against Astro slugs in `storefront_pages` for the same lang
- exact normalized match → high-confidence override
- substring match → propose for Daniel review

### 11.3 What I missed in M3_SITE_COMPREHENSIVE_REVIEW (Foreman accountability)

The original audit's §10 methodology and §3 sanity check named `https://prizma-optic.co.il` as the site. It did not enumerate `*.prizma-optic.co.il` subdomains. The audit harness never tried `ru.` or `en.` — so 1,675 URLs of customer-rendered content went uninvestigated. **This is a Foreman-skill failure, not an executor failure.** The executor faithfully audited what the SPEC defined.

LEARNINGS L-SITE-001 codifies the rule so it cannot recur. Future Site Overseer Mode A scans MUST start with a DNS subdomain enumeration (manual list + `dig +short` for known patterns) BEFORE defining audit scope.

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-07:
- No prior SPEC under `modules/Module 3 - Storefront/docs/specs/` named `M3_WP_SUBDOMAINS_REDIRECT` or similar — slug unique. ✓
- No conflict with M3_SITE_COMPREHENSIVE_REVIEW or M3_PHONE_TEMPLATING_AND_CLEANUP — they touch different surfaces (Astro source / CMS rows; this SPEC produces CSVs only). ✓
- LEARNINGS file does NOT yet exist for Site Overseer namespace — this SPEC creates it (`roles/site-overseer/LEARNINGS.md`). Doesn't conflict with the project-wide `docs/LEARNINGS.md` (different scope). ✓

**0 collisions.** SPEC ready for dispatch.

---

## 13. Definition of Done (Phase A)

All 12 success criteria pass. Single commit on develop. Repo clean. Daniel has 2 CSVs + import instructions in hand. **Phase B (manual cPanel work) does NOT happen in this SPEC** — Daniel executes when ready.

---

*End of SPEC.*
