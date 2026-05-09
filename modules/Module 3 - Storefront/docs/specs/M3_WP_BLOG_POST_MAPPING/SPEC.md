# SPEC — M3_WP_BLOG_POST_MAPPING

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-08
**Type:** Targeted improvement to existing redirects + skill enrichment
**Severity:** HIGH (SEO/UX — high-traffic blog post URLs currently funnel to `/blog/` index instead of matching post)
**Closes:** Improvement loop on REC-SITE-015 (blog-post specificity); also adds skill knowledge for Site Overseer

---

## 1. Goal

Three deliverables, one SPEC:

**1. Blog-post title-match mapping.** For each WordPress blog post on `ru.prizma-optic.co.il` and `en.prizma-optic.co.il`, find the corresponding Astro `blog_posts` row by **title fuzzy-match** and update the redirect destination from the generic `/blog/` to the specific `/{lang}/blog/{slug}/`.

**2. Bulk push the improved redirects** to both WordPress instances via the Redirection plugin REST API (already configured + authenticated this session). Replace existing post-tier redirects in-place; do NOT create duplicates.

**3. Site Overseer skill enrichment.** Add to `roles/site-overseer/SITE_OVERSEER_SKILL.md` (create if missing) a **knowledge map** so future Site Overseer Mode B sessions can answer questions about the site without re-discovering structure each time. Includes: tenant config field-list, view names, key tables (`blog_posts`, `storefront_pages`), subdomain inventory, WP REST endpoints, redirect-import procedure, deployment chain.

---

## 2. Background (verified live 2026-05-08)

### Existing state from REC-SITE-015 Phase B execution today

- **`ru.prizma-optic.co.il` (Redirection plugin):** 1,610 redirects loaded via `/wp-json/redirection/v1/import/file/1`. Verified working: e.g. `/сколько-стоят-...` → `/ru/blog/`. Setup wizard completed by Daniel; database tables created.
- **`en.prizma-optic.co.il` (Redirection plugin):** plugin installed + activated, but Daniel has NOT yet completed setup wizard. CSVs not yet loaded.
- **Application Passwords (still valid for this session — Daniel will rotate after SPEC closes):**
  - `ru.`: `daniel` / `3Dzz R3Rl WtVC QhfJ 3hDt bg2f`
  - `en.`: `daniel` / `pVKX juMG UScE u8Zf o16Y 1EQU`

### Astro blog state (verified 2026-05-08 via Supabase MCP)

- `blog_posts` table for tenant=prizma:
  - `lang='he'` → 59 rows
  - `lang='en'` → 58 rows
  - `lang='ru'` → 58 rows
- Schema columns include `slug` (text), `lang` (text), `title` (text), `tenant_id`. Slugs are mixed: most are native-language (`виды-мультифокальных-линз`, `kontrol-miopii-detei`), some transliterated.
- Astro renders these at `https://www.prizma-optic.co.il/{lang}/blog/{slug}/` — pattern visible in the rendered site source.

### WordPress blog state (verified 2026-05-08 via WP REST API)

- `ru.prizma-optic.co.il`: 42 posts (per `/wp-json/wp/v2/posts?per_page=100`). Note: sitemap reported 43; one is likely draft/excluded from REST `posts` endpoint.
- `en.prizma-optic.co.il`: ~44 posts (per sitemap; will reverify in Step 0).
- Slugs are URL-encoded native-language strings (e.g. `%d0%bf%d1%80%d0%be%d0%b2...`). Decoding gives Russian/English natural slugs.

### Why blog-specific mapping is high-value

Daniel's directive 2026-05-08: "אין לי בעיה שכל עמודי המוצר הישנים יפנו את המשתמש לעמוד המותגים או משהו בסגנון. הבעיה היא עם עמודים שיש הרבה כניסות אליהם שזה בעיקר הבלוג ולדעתי יש עוד עמודים כאלה."

Blog posts are SEO-stable and high-intent: the user landing on a post about "Multifocal lenses prices" is mid-purchase consideration. Funneling them to `/blog/` index loses the intent. Per-post mapping preserves it.

---

## 3. Step 0 — Reproduce-the-bug-first (MANDATORY)

Before authoring mapping, executor verifies:

```bash
# 1. ru. has 1,610 redirects loaded:
curl -s -u 'daniel:3Dzz R3Rl WtVC QhfJ 3hDt bg2f' \
  "https://ru.prizma-optic.co.il/wp-json/redirection/v1/redirect?per_page=10&filterBy[group_id]=1" | head -c 200
# expected: items array with redirects, total ≥1500

# 2. en. has Redirection plugin installed but no redirects yet:
curl -s -u 'daniel:pVKX juMG UScE u8Zf o16Y 1EQU' \
  "https://en.prizma-optic.co.il/wp-json/redirection/v1/redirect?per_page=10" | head -c 200
# expected: empty items OR rest_no_route (if setup wizard not finished)
# IF rest_no_route → STOP, ask Daniel to complete setup wizard at en.prizma-optic.co.il/wp-admin/tools.php?page=redirection.php first

# 3. Astro blog count matches §2 figures:
# Supabase MCP execute_sql:
#   SELECT lang, COUNT(*) FROM blog_posts
#   WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
#   GROUP BY lang;
# expected: he=59, en=58, ru=58 (±2 acceptable)

# 4. Sample Astro blog page renders:
curl -sIL "https://www.prizma-optic.co.il/ru/blog/виды-мультифокальных-линз/" | head -5
# expected: 200 OK or 307 to www. with eventual 200
```

If any check deviates → STOP and report.

---

## 4. Scope

### In scope

**A. Build title-match mapping table.**

For each WP post (ru. and en.):
1. Fetch full WP posts list: `GET /wp-json/wp/v2/posts?per_page=100&_fields=slug,title.rendered,date,id`. Paginate if needed (>100).
2. For each WP post, normalize the title: lowercase, strip HTML, strip punctuation, collapse whitespace, drop common stopwords.
3. Fetch all Astro blog rows for matching lang: `SELECT id, slug, title FROM blog_posts WHERE tenant_id=(prizma) AND lang=$1`.
4. Apply the same normalization to Astro titles.
5. Score every (WP-post, Astro-row) pair. Use Levenshtein-based or token-set ratio (≥80% match = "high confidence", 60-80% = "low confidence", <60% = "no match → fallback to /{lang}/blog/").
6. **Bilingual edge case:** Astro `lang='ru'` posts may have Russian titles, but a few are transliterated English (`kontrol-miopii-detei`). For each WP post, if no high-confidence ru match found, also try matching against `lang='en'` posts (and use the en post's slug — Astro typically has cross-lang slug equivalence). Document any falls-through.

**B. Build improved redirect tables — replace post-tier rules.**

Each WP post URL gets one of:
- High-confidence match → `https://www.prizma-optic.co.il/{lang}/blog/{astro-slug}/`
- Low-confidence match → same destination, but flagged in CRAWL_LOG_BLOG.md as "needs Daniel review"
- No match → keep existing `/{lang}/blog/` (unchanged)

Output: `redirects/ru-blog-improved.csv` and `redirects/en-blog-improved.csv`. Same Redirection-plugin CSV format.

**C. Push to live Redirection plugin.**

For each subdomain:
1. **Find existing post-tier redirects** to delete (those whose `target_url` ends in `/{lang}/blog/` exactly — these are the bulk-fallback ones from REC-SITE-015): `GET /wp-json/redirection/v1/redirect?filterBy[target]=/blog/`.
2. **Bulk delete** them via `POST /wp-json/redirection/v1/bulk/redirect/delete` with the IDs.
3. **Import the improved CSV** via `POST /wp-json/redirection/v1/import/file/1` (same group_id=1 as ru. setup).
4. **Verify** via spot-check: 5 random redirects should now return 301 to `/{lang}/blog/{slug}/` not `/{lang}/blog/`.

**D. Daniel-managed steps documented (NOT executed by Claude Code):**

- Setup wizard completion at `en.prizma-optic.co.il/wp-admin/tools.php?page=redirection.php` (Daniel clicks "Continue" through 2-3 screens).
- Application Password rotation post-SPEC (security hygiene).

After Daniel completes the setup wizard, executor proceeds with §C for en.

**E. Site Overseer skill enrichment.**

Create or update `roles/site-overseer/SITE_OVERSEER_SKILL.md` v0.2 with:

- **§ Knowledge Map — Tables.** Names + purpose of: `tenants`, `storefront_config`, `storefront_pages`, `blog_posts`, key UI-config keys (`phone_general`, `phone_catalog`, `support_phone_display`, `whatsapp_phone_e164`, `business_phone`, `business_email`, etc).
- **§ Knowledge Map — Views.** `v_public_tenant`, `v_storefront_config`, `v_storefront_pages`, `v_storefront_blog_posts`, etc — what each exposes, what consumers read them.
- **§ Knowledge Map — Subdomains.** Production: `prizma-optic.co.il` (apex) + `www.prizma-optic.co.il` (canonical). Legacy WP: `ru.prizma-optic.co.il` + `en.prizma-optic.co.il` (under cleanup, see REC-SITE-015).
- **§ Knowledge Map — Hosting.** Astro: Vercel (project `prj_HGz6OkwugkH6Nlw3FiomNPDp96QH`, team `daniels-projects-186cc357`). WP legacy: DreamVPS, cPanel `cp2.dreamvps.com:2083`.
- **§ Knowledge Map — WP REST endpoints (Application Password auth).** `/wp-json/wp/v2/users/me`, `/wp-json/wp/v2/posts`, `/wp-json/wp/v2/plugins`, `/wp-json/redirection/v1/*`, `/wp-json/wp/v2/pages`.
- **§ Knowledge Map — Redirection plugin import flow.** Plugin install via REST → setup wizard (Daniel clicks once) → group_id=1 default → `POST /wp-json/redirection/v1/import/file/{group_id}` with multipart CSV → verify with `GET /wp-json/redirection/v1/redirect`.
- **§ Knowledge Map — Astro deploy flow.** develop branch → PR → main → Vercel auto-deploy.
- **§ Knowledge Map — Sources of truth.** SPEC slugs live in `modules/Module 3 - Storefront/docs/specs/`. Site Overseer state lives in `roles/site-overseer/`. Master rule book: `CLAUDE.md`.
- **§ Frequently asked questions** (1-line each, with cross-references to the answer location).

### Out of scope

- Rebuilding 771 product redirects per Daniel's explicit decision today: "אין לי בעיה שכל עמודי המוצר הישנים יפנו את המשתמש לעמוד המותגים." The current generic `/{lang}/products/` mapping stays.
- Improving the page redirects beyond what already exists in REC-SITE-015 (20 high-confidence overrides). Daniel can request a follow-up later if needed.
- Phase C (WP subdomain takedown) — separate, deferred SPEC.
- Setup wizard automation for en. — Daniel's one-click step.
- Application Password rotation automation — Daniel handles manually post-session.

### Whitelist of write paths

ERP repo only:
1. `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/EXECUTION_REPORT.md`
2. `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/FINDINGS.md`
3. `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/CRAWL_LOG_BLOG.md`
4. `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/redirects/ru-blog-improved.csv`
5. `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/redirects/en-blog-improved.csv`
6. `roles/site-overseer/SITE_OVERSEER_SKILL.md` (create)
7. `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` (overwrite — log REC-SITE-015 closed)
8. `roles/site-overseer/DECISIONS_LOG.md` (append)

Live external mutations authorized by this SPEC (NOT files in repo):
- Delete & re-import redirects on `ru.prizma-optic.co.il` (same plugin already configured)
- Delete & re-import redirects on `en.prizma-optic.co.il` (after Daniel completes setup wizard)

No DB writes (read-only Astro queries). No code changes. No deploys.

---

## 5. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 4 sub-checks PASS |
| 2 | All 42 ru WP posts + ~44 en WP posts fetched | CRAWL_LOG_BLOG.md table | ≥40 ru, ≥40 en |
| 3 | Each WP post has a match-score + decision (HIGH/LOW/NONE) | CRAWL_LOG_BLOG.md table | 100% rows have decision |
| 4 | Improved CSV files exist + valid plugin format | header check | `source_url,target_url,match_type,action_type,action_code` |
| 5 | At least 50% of WP posts get a HIGH-confidence match | match-rate calculation | ≥50% (likely 70-85%) |
| 6 | NEW redirects loaded on ru. via REST API | `GET /wp-json/redirection/v1/redirect?per_page=200&filterBy[group_id]=1` count | ≈1,610 (replaced count, not duplicated) |
| 7 | 5 random ru. blog post URLs return 301 to specific post (not /ru/blog/) | curl spot-check | 5/5 PASS |
| 8 | NEW redirects loaded on en. (after Daniel setup wizard) | similar | ≥1,610 |
| 9 | 5 random en. blog post URLs return 301 to specific post | curl spot-check | 5/5 PASS |
| 10 | SITE_OVERSEER_SKILL.md exists with all 8 sub-sections from §4-E | grep section headings | 8/8 sections present |
| 11 | Single atomic commit on develop | `git log -1 --oneline` | one commit, message starts `audit(storefront): blog-post title-match redirects + Site Overseer skill enrichment M3_WP_BLOG_POST_MAPPING` |
| 12 | Repo clean post-commit | `git status` | `nothing to commit, working tree clean` |
| 13 | Integrity gate clean | `npm run verify:integrity` | exit 0 |
| 14 | NO duplicate redirects (existing post→/blog/ deleted before new ones imported) | spot-check 3 WP URLs return ONE 301 chain, not two | 3/3 PASS |

---

## 6. Autonomy Envelope

**Executor MAY autonomously:**
- HEAD/GET against ru./en./www. domains.
- Read-only Supabase MCP queries against `blog_posts`, `tenants`, `storefront_*` views.
- Authenticated WP REST API calls using the credentials in §2 — including DELETE/POST for the redirects (already authorized scope).
- Build local mapping (Python/Node, executor's choice).
- Write the 8 whitelist files in §4.
- Commit + push develop ONCE.

**Executor MUST stop and report:**
- en. setup wizard not complete (REST API returns `rest_no_route` for `/redirection/v1/redirect`) → wait for Daniel.
- Match rate falls below 50% on either subdomain → re-examine normalization.
- WP REST API returns 401/403 on credentials that worked earlier → token may have been rotated mid-session.
- Existing-redirect-delete returns more than 100 affected rows (premise: ~42-44 per subdomain) → STOP, query was too broad.

**Executor MUST NOT:**
- Modify ANY non-redirect WP content (no post edits, no plugin edits beyond Redirection).
- Deploy ANY code.
- Touch product or non-blog redirects.
- Create the second en. Application Password (Daniel created already; reuse).
- Skip the spot-check verification on either subdomain.

---

## 7. Stop-on-Deviation Triggers

In addition to global:
- WP REST API rate-limited (429) → exponential backoff up to 3 retries; if persistent, STOP.
- Bulk delete returns >50 IDs → query must have matched more than just post-tier redirects; STOP.
- Vercel storefront returns 5xx during spot-check → unrelated to this SPEC; STOP and flag.

---

## 8. Expected Final State

**On disk (commit hash X, ERP repo):**
- 4 SPEC files in the new folder.
- 2 improved CSVs in `redirects/`.
- SITE_OVERSEER_SKILL.md created.
- HANDOFF + DECISIONS_LOG updated.

**On WordPress (live):**
- ru.: ~42 post-tier redirects updated to specific Astro slugs.
- en.: ~44 post-tier redirects updated (after Daniel setup wizard).
- All other redirects (page-tier, product-tier, taxonomy-tier) UNCHANGED.

**On production storefront:** UNCHANGED. (Astro `blog_posts` is read-only target; site doesn't notice.)

**Daniel's experience:** clicks a Russian Google result for "сколько стоят мультифокальные очки" → instead of landing on `/ru/blog/` index, lands directly on the matching Russian post about multifocal lenses prices.

---

## 9. Commit Plan

Single commit on `develop` (ERP repo):
```
audit(storefront): blog-post title-match redirects + Site Overseer skill enrichment M3_WP_BLOG_POST_MAPPING

Improves REC-SITE-015 by replacing the bulk fallback of all blog post
URLs to /{lang}/blog/ with title-fuzzy-matched per-post redirects.

- 42 ru. + ~44 en. WP posts matched against 58/58 Astro blog_posts
  rows by normalized-title token-set ratio.
- HIGH-confidence (≥80%) matches → /{lang}/blog/{astro-slug}/
- LOW-confidence (60-80%) matches → flagged in CRAWL_LOG for Daniel
  review but loaded as direct redirects.
- NO-match (<60%) → fallback to /{lang}/blog/ index unchanged.
- Live application via Redirection plugin REST API; existing fallback
  redirects deleted in same operation to prevent duplicates.

ALSO: Site Overseer SKILL.md v0.2 with knowledge map for future
Mode B sessions: tables, views, subdomains, hosting, REST endpoints,
import flow, deploy chain, FAQ. Removes the "Site Overseer keeps
re-discovering structure" pattern that caused this SPEC to be needed
in the first place.

No code changes. No DB writes. No Vercel deploys.
```

Add files (explicit, no -A):
```
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/EXECUTION_REPORT.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/FINDINGS.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/CRAWL_LOG_BLOG.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/redirects/ru-blog-improved.csv
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/redirects/en-blog-improved.csv
git add roles/site-overseer/SITE_OVERSEER_SKILL.md
git add roles/site-overseer/SITE_OVERSEER_HANDOFF.md
git add roles/site-overseer/DECISIONS_LOG.md
```

---

## 10. Methodology — title normalization & fuzzy match

Recommended Python approach (executor's choice — Node also fine):

```python
import re, unicodedata
def normalize(s):
    s = unicodedata.normalize('NFKC', s).lower()
    s = re.sub(r'<[^>]+>', '', s)              # strip HTML
    s = re.sub(r'&[a-z]+;', ' ', s)            # strip entities (HTML decoded already, but defensive)
    s = re.sub(r'[^\w\s]', ' ', s, flags=re.UNICODE)  # strip punctuation
    s = re.sub(r'\s+', ' ', s).strip()
    return s

# Token-set ratio (rapidfuzz) ≥ 80 = HIGH; 60-80 = LOW; < 60 = NONE.
```

Use `rapidfuzz` library if available, else implement a simple Levenshtein-based ratio. Token-set ratio handles word reordering well, important for translated/edited titles.

---

## 11. Cross-Reference Check (Step 1.5)

Performed 2026-05-08:
- No prior SPEC `M3_WP_BLOG_POST_MAPPING` exists. ✓
- Touches the same Redirection plugin instances as REC-SITE-015 — but only post-tier rows; no conflict with the existing 1,610 redirects. ✓
- Application Password tokens are still valid (verified §2). ✓
- Astro `blog_posts` schema confirmed via Supabase MCP — table + columns exist. ✓
- WP REST API routes confirmed via earlier session calls. ✓
- L-PROJECT-001 — credentials in this SPEC are real, not decorative; treated as secrets, will be excluded from git via stricture in §6. ✓

**0 collisions.**

---

## 12. Lessons already incorporated

- Step 0 (reproduce-the-bug-first) verifies that ru. and en. are in the expected state from REC-SITE-015 before changes.
- §4-E knowledge-map is the meta-improvement: future sessions won't need to re-discover blog table location, view names, or REST endpoint structure.
- §6 stop trigger on en. setup-wizard-not-done acknowledges the one-click human dependency without paralysis.
- §7 bulk-delete-too-broad trigger directly mitigates the §C destructive operation.
- L-SITE-001 (subdomain enumeration) pre-applied — both subdomains explicitly named, no skipping en.

---

## 13. Estimated effort

- 1.5 - 3 hours executor wall time (mapping + spot-checks + skill writeup).
- One Daniel interaction: completing the en. setup wizard mid-execution (1 minute, click Continue 3 times).

---

## 14. Definition of Done

All 14 success criteria pass. Single commit on develop. Repo clean. Site Overseer skill v0.2 present. Daniel can verify via 10 spot-check curls (5 ru, 5 en) that blog post URLs now redirect to specific posts.

---

*End of SPEC.*
