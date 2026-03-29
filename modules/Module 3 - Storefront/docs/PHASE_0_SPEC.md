# Phase 0 — SEO Site Audit & URL Mapping

> **Module:** 3 — Storefront
> **Status:** ⬜ Not started
> **Execution mode:** AUTONOMOUS
> **Estimated time:** 1-2 sessions (~60-90 min)
> **Risk level:** ZERO — read-only scan, no DB changes, no modifications to existing files
> **Machine:** 🖥️ Windows (`C:\Users\User\opticup`)

---

## Goal

Scan all 3 WordPress domains of Prizma Optic using the **WordPress REST API + WooCommerce REST API** and produce a **complete URL inventory** — every page, every product, every blog post, every category — so that the SEO migration in Phase 3 has zero blind spots.

**This phase creates files only. It does NOT:**
- Modify any existing code in the repo
- Change any database
- Touch the Storefront repo
- Affect production in any way
- Write anything to WordPress (READ-ONLY API access)

---

## Safety Rules — NON-NEGOTIABLE

1. **NEVER** merge to main. **NEVER** push to main. **NEVER** checkout main.
2. **NEVER** delete or modify any existing files in the repo.
3. **NEVER** modify CLAUDE.md, GLOBAL_MAP.md, GLOBAL_SCHEMA.sql, or any Module 1/1.5/2 files.
4. **NEVER** run DROP TABLE, DELETE FROM, or TRUNCATE on any database.
5. All work on branch `develop` ONLY.
6. Before ANY git operation: verify branch with `git branch`.
7. This phase is **READ-ONLY** — only NEW files inside `modules/Module 3 - Storefront/`.
8. All API calls are **GET requests only**. No POST, PUT, DELETE, or PATCH.
9. **NEVER** commit `.env` files to git. Verify `.gitignore` BEFORE every commit.
10. Rate limiting: max 2 requests per second. `await sleep(500)` between requests.

---

## Domains to Scan

| Domain | Language | API Base | Priority |
|--------|----------|----------|----------|
| `https://prizma-optic.co.il` | Hebrew (he) | `/wp-json/wp/v2/` + `/wp-json/wc/v3/` | CRITICAL |
| `https://en.prizma-optic.co.il` | English (en) | `/wp-json/wp/v2/` | HIGH |
| `https://ru.prizma-optic.co.il` | Russian (ru) | `/wp-json/wp/v2/` | HIGH |

**Note:** WooCommerce API keys may only work on the main domain. English and Russian sites may share the same WooCommerce product database (WPML/Polylang pattern) or have separate products. The script must handle both cases.

---

## API Access

### WordPress REST API (posts, pages, categories, tags)
- **Auth:** Basic Auth — `Authorization: Basic base64(daniel_725:APP_PASSWORD)`
- **Key endpoints:**
  - `GET /wp-json/wp/v2/posts?per_page=100&page=N` — blog posts
  - `GET /wp-json/wp/v2/pages?per_page=100&page=N` — pages
  - `GET /wp-json/wp/v2/categories?per_page=100` — post categories
  - `GET /wp-json/wp/v2/tags?per_page=100` — post tags

### WooCommerce REST API (products, product categories, product tags)
- **Auth:** Query params `?consumer_key=CK&consumer_secret=CS`
- **Key endpoints:**
  - `GET /wp-json/wc/v3/products?per_page=100&page=N` — products
  - `GET /wp-json/wc/v3/products/categories?per_page=100` — product categories
  - `GET /wp-json/wc/v3/products/tags?per_page=100` — product tags
  - `GET /wp-json/wc/v3/products/attributes` — product attributes

### Pagination
Both APIs use `per_page` (max 100) + `page`. Check `X-WP-TotalPages` header.

---

## Credentials

**File:** `modules/Module 3 - Storefront/seo-audit/scripts/.env` — **NEVER committed to git**

```env
WP_USER=daniel_725
WP_APP_PASSWORD=<Daniel enters manually>
WC_CONSUMER_KEY=<Daniel enters manually>
WC_CONSUMER_SECRET=<Daniel enters manually>
WP_DOMAIN_HE=https://prizma-optic.co.il
WP_DOMAIN_EN=https://en.prizma-optic.co.il
WP_DOMAIN_RU=https://ru.prizma-optic.co.il
```

---

## Output Files

```
modules/Module 3 - Storefront/
├── seo-audit/
│   ├── scripts/
│   │   ├── crawl-wp-api.mjs, generate-report.mjs, helpers.mjs
│   │   ├── package.json
│   │   └── .env                       ← NEVER committed
│   ├── data/
│   │   ├── wp-posts-{he|en|ru}.json, wp-pages-{he|en|ru}.json
│   │   ├── wp-categories-he.json, wp-tags-he.json
│   │   ├── wc-products.json, wc-categories.json, wc-tags.json, wc-attributes.json
│   │   └── crawl-progress.json
│   ├── url-inventory.json
│   ├── url-inventory.md
│   └── url-mapping-template.csv
├── docs/
│   ├── PHASE_0_SPEC.md, SESSION_CONTEXT.md, MODULE_MAP.md, CHANGELOG.md
```

---

## Autonomous Execution Plan

### Step 1 — Setup: folders, .gitignore, dependencies

**Repo:** opticup
**What to do:**
1. `git branch` → MUST be `develop`. If not: `git checkout develop && git pull origin develop`
2. `git pull origin develop`
3. Create directories: `seo-audit/scripts/`, `seo-audit/data/`, `docs/`
4. **Update .gitignore** — append `.env` patterns if not present
5. Create `.env` template with REPLACE_ME placeholders
6. **VERIFY:** `git status` must NOT show `.env`
7. Verify `node --version` (18+)
8. Create `package.json` with `"type": "module"`, deps: `dotenv`, `node-fetch@3`
9. `npm install`
10. Create SESSION_CONTEXT.md (9-step tracking table)
11. Commit (verify .env excluded)

**Verify:**
- [ ] Branch = `develop`
- [ ] `.env` in `.gitignore` and NOT in `git status`
- [ ] `npm install` succeeded
- [ ] SESSION_CONTEXT.md created

---

### Step 2 — Create helpers.mjs

**File:** `seo-audit/scripts/helpers.mjs` — under 350 lines

**Exports:** `config`, `sleep(ms)`, `wpFetch(domain, endpoint, params)`, `wcFetch(domain, endpoint, params)`, `fetchAllPages(fetchFn, domain, endpoint, params)`, `saveJSON(path, data)`, `loadJSON(path)`, `saveProgress(path, data)`, `loadProgress(path)`, `extractPath(urlOrObj)`, `classifyPageType(path, wpType)`, `stripHtml(html)`, `countWords(html)`

**wpFetch:** Basic Auth, per_page=100, returns `{data, totalPages, totalItems}`, retry 3x, sleep(500)
**wcFetch:** Query string auth, same pattern
**classifyPageType:** Uses wpType ('product'→product, 'post'→blog-post, 'page'→page/homepage/landing-page)
**Known landing slugs:** `משקפי-מולטיפוקל`, `multi`, `lab`, `brands`, `multifocal-guide`, `מה-זה-מולטיפוקל`, `בלוג`

**Verify:**
- [ ] Valid JS, under 350 lines
- [ ] Import works

---

### Step 3 — Create crawl-wp-api.mjs

**File:** `seo-audit/scripts/crawl-wp-api.mjs` — under 350 lines
**Usage:** `node crawl-wp-api.mjs <he|en|ru|all>`

**Hebrew site fetches:** posts, pages, categories, tags + WC products, categories, tags, attributes
**English/Russian:** posts, pages + try WC (skip if 401/404)

**Per item extract:** id, url, path, slug, title, pageType, status, seo (meta title/desc/canonical/ogImage/schemaType from Yoast or RankMath), content (wordCount, imageCount), categories, images, date, modified, lang

**Error handling:** 401 → clear message + exit. 404 → skip. Network → retry 3x. Never crash.

**Verify:**
- [ ] Valid JS, under 350 lines
- [ ] `--help` doesn't crash

---

### CHECKPOINT — Steps 1-3

---

### Step 4 — Test API connectivity

**⚠️ Daniel must fill .env BEFORE this step**

1. Check .env has real values (not REPLACE_ME) → BLOCK if not
2. Test WP API: fetch 1 post from Hebrew
3. Test WC API: fetch 1 product
4. Test English + Russian WP API
5. Detect SEO plugin (yoast_head_json or rank_math_title)
6. Log all results in SESSION_CONTEXT

**Verify:**
- [ ] WP API 200 (or BLOCKED documented)
- [ ] WC API 200 (or BLOCKED documented)
- [ ] EN/RU status documented

---

### Step 5 — Run full crawl: Hebrew + WooCommerce

1. `node crawl-wp-api.mjs he`
2. Verify 8 data files exist
3. Log counts per file
4. Spot-check first product + first post

**Expected:** Products 500-800, Posts 15-30, Pages 10-20

**Verify:**
- [ ] All 8 data files exist, non-empty
- [ ] Product count > 100
- [ ] Post count > 5

---

### Step 6 — Run crawl: English + Russian

1. `node crawl-wp-api.mjs en` (API or sitemap fallback)
2. `node crawl-wp-api.mjs ru` (same)
3. Log counts + method used

**Verify:**
- [ ] EN data exists
- [ ] RU data exists

---

### CHECKPOINT — Steps 4-6

---

### Step 7 — Create generate-report.mjs

**File:** `seo-audit/scripts/generate-report.mjs` — under 350 lines

Reads `data/*.json` → generates:
- **url-inventory.json:** summary, urlPatterns, pages (all langs), warnings
- **url-inventory.md:** summary → patterns → per-language detail → critical pages → SEO health → recommendations
- **url-mapping-template.csv:** `old_url, old_path, lang, type, title, status, has_meta, new_path, action, priority, notes` — pre-fill action (keep/pending), priority (critical/high/medium/low), UTF-8 BOM

**Verify:**
- [ ] Valid JS, under 350 lines

---

### Step 8 — Generate reports

1. `node generate-report.mjs`
2. Verify all 3 output files
3. CSV row count = total URLs

**Verify:**
- [ ] url-inventory.json valid
- [ ] url-inventory.md readable
- [ ] url-mapping-template.csv opens in Excel with Hebrew

---

### Step 9 — Final review & documentation

1. Verify all files exist
2. Spot-check 5 products + 3 posts
3. **Credential check:** `grep -rn` for passwords in committed files → MUST be empty
4. SESSION_CONTEXT → all ✅
5. Create MODULE_MAP.md + CHANGELOG.md
6. Final commit (verify .env excluded)
7. Git tag: `v3.0-phase0-seo-audit`

**Verify:**
- [ ] All 9 steps ✅
- [ ] Zero credentials in committed files
- [ ] .env NOT in git
- [ ] Tag created
- [ ] Never touched main

---

## Autonomous Rules

- Checkpoint every 3 steps
- BLOCKED after 3 attempts → document, skip
- DECISION_NEEDED → document, choose safer option
- Do NOT modify files outside `modules/Module 3 - Storefront/` (except .gitignore)
- Do NOT merge to main
- Before EVERY commit: verify `.env` NOT in `git status`

## IMPORTANT: .env Setup

Claude Code creates `.env` with REPLACE_ME. **Daniel must edit BEFORE Step 4:**
```
modules/Module 3 - Storefront/seo-audit/scripts/.env
→ Fill: WP_APP_PASSWORD, WC_CONSUMER_KEY, WC_CONSUMER_SECRET
```
Step 4 BLOCKs if not set.

## Completion Checklist

- [ ] All 9 steps ✅
- [ ] Data files for 3 domains
- [ ] url-inventory.json, .md, .csv complete
- [ ] .env NOT in git
- [ ] Zero credentials in commits
- [ ] Zero changes to existing files (except .gitignore)
- [ ] Zero DB changes
- [ ] Never touched main

## What Happens Next

1. Daniel reviews url-inventory.md
2. Daniel fills url-mapping-template.csv
3. Strategic chat → URL structure decisions
4. Phase 1 → Astro setup
5. Phase 3 → SEO Migration using mapping
