# Phase 3A — SEO Data Prep, Product Mapping & Redirects

> **Module:** 3 — Storefront
> **Repo:** opticup-storefront (primary), opticup (read-only reference)
> **Execution mode:** AUTONOMOUS
> **Depends on:** Phase 0 (SEO Audit data), Phase 2 (product catalog live)
> **Created:** March 2026

---

## Objective

Prepare all data needed for SEO migration from WordPress to Astro:
1. Backup current state before starting
2. Create `SEO_MIGRATION_PLAN.md` — single source of truth for all SEO decisions
3. Match 735 WordPress product URLs → inventory barcodes (automated + manual fallback)
4. Classify all 84 WordPress pages (keep / redirect / ignore)
5. Generate complete `vercel.json` redirect rules (~2,000+ rules)
6. Validate 100% URL coverage

**Success = every WordPress URL has a destination (page or redirect). Zero orphans.**

---

## Context & Business Decisions (for documentation)

These decisions were made by Daniel in the strategic chat. They MUST be documented in `SEO_MIGRATION_PLAN.md` so future developers don't need to ask.

### URL Structure Decisions

| WordPress URL pattern | New Astro URL | Method |
|----------------------|---------------|--------|
| `/shop/[category]/[slug]/` | `/products/[barcode]/` | 301 redirect |
| `/product-tag/[tag]/` (1,175 pages) | `/products/` | 301 redirect (thin content) |
| `/product-category/[cat]/` (12 pages) | `/category/[slug]/` | 301 redirect |
| `/[hebrew-slug]/` (blog posts) | `/[hebrew-slug]/` | **Keep same URL** (root-level) |
| `/[hebrew-slug]/` (landing pages) | `/[hebrew-slug]/` | **Keep same URL** (root-level) |
| `/בלוג/` | `/בלוג/` | **Keep same URL** (blog index) |
| `/blog/` | 301 → `/בלוג/` | Redirect EN alias to HE |
| `en.prizma-optic.co.il/[slug]/` | `/en/[slug]/` | 301 redirect (after DNS switch) |
| `ru.prizma-optic.co.il/[slug]/` | `/ru/[slug]/` | 301 redirect (after DNS switch) |
| WooCommerce pages (cart, checkout, account) | `/` | 301 redirect to homepage |
| About, Contact, Privacy, Accessibility | New pages (same or similar URLs) | Build new |
| Drafts, duplicates | — | Ignore (no public URL) |

### Blog Decisions
- Blog index: `/בלוג/` (preserves WordPress URL)
- EN blog index: `/en/blog/`
- RU blog index: `/ru/blog/`
- HE posts: root-level (`/עדשות-מגע/`) — preserve exact URLs
- EN posts: `/en/[slug]/`
- RU posts: `/ru/[slug]/`
- Blog images: `public/blog/images/` in Astro (NOT Supabase Storage)
- i18n: full 3-language support, much higher quality than WordPress had

### Product Matching Strategy
- Match by: WordPress title (brand + model) → inventory `brand_name` + `model`
- Normalize both sides: lowercase, remove special chars, trim whitespace
- Unmatched products: 301 redirect to brand page (`/brands/[slug]/`) if brand identified, else `/products/`

### DNS & Deployment
- DNS switch happens ONLY after final QA phase
- Phase 3 builds everything but WordPress stays live
- Subdomain redirects (en./ru.) prepared in vercel.json but inactive until DNS switch
- Vercel deploys to `opticup-storefront.vercel.app` only

---

## Pre-Requisites Check

Before starting, verify:
- [ ] On `develop` branch in `opticup-storefront`
- [ ] Phase 0 data exists: `opticup/modules/Module 3 - Storefront/seo-audit/url-inventory.json`
- [ ] Phase 0 blog data exists: `opticup/modules/Module 3 - Storefront/seo-audit/data/wp-posts-he.json`
- [ ] Phase 2 complete: `/products/[barcode]/` pages working on Vercel
- [ ] Access to ERP repo for reading SEO audit data (read-only)

---

## Autonomous Execution Plan

### Step 0 — Backup Before Starting

**Repo:** opticup-storefront (source), opticup (backup destination)
**What to do:**
Create a timestamped backup of the storefront repo before making any changes.

```powershell
# Generate timestamp
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase3a"

# Create backup
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env

# Verify
if (Test-Path "$backupDir\opticup-storefront\CLAUDE.md") { Write-Host "✅ Backup verified" } else { Write-Host "❌ Backup failed" }
```

**Verify:**
- [ ] Backup directory exists with timestamp in name
- [ ] Backup contains src/, CLAUDE.md, SESSION_CONTEXT.md, package.json, vercel.json
- [ ] Backup does NOT contain node_modules, .git, or .env
- [ ] Log backup path in SESSION_CONTEXT.md

---

### Step 1 — Create SEO_MIGRATION_PLAN.md

**Repo:** opticup-storefront
**Files to create:** `docs/SEO_MIGRATION_PLAN.md`

**What to do:**
Create a comprehensive migration plan document that captures ALL decisions. This is the single source of truth — any developer reading it should understand every SEO decision without asking questions.

**Contents must include:**
1. **Overview** — what's being migrated, from where, to where
2. **URL Structure Mapping** — table above, expanded with examples
3. **Product Matching Logic** — algorithm description with examples
4. **Blog Migration Plan** — URL structure, content handling, images, i18n
5. **Landing Pages Plan** — which pages, same URLs, content source
6. **Static Pages Plan** — about, contact, privacy, accessibility
7. **Redirect Strategy** — what gets 301, what stays, what's ignored
8. **DNS Switch Plan** — steps, order, rollback plan
9. **Subdomain Migration** — en./ru. → /en/, /ru/ with 301s
10. **Known Issues & Edge Cases** — documented problems and solutions
11. **File Locations** — where all source data lives
12. **Timeline** — Phase 3A → 3B → 3C → QA

**DB changes:** None
**Verify:**
- [ ] File exists at `docs/SEO_MIGRATION_PLAN.md`
- [ ] All 12 sections populated with concrete details (no placeholders)
- [ ] All URL patterns documented with their Astro destination

---

### Step 2 — Build Product Mapping Script

**Repo:** opticup-storefront
**Files to create:** `scripts/seo/map-products.ts`

**What to do:**
Script that reads WordPress product URLs and matches them to inventory barcodes.

**Input:**
- `../opticup/modules/Module 3 - Storefront/seo-audit/url-inventory.json`
- Supabase `v_storefront_products` view

**Algorithm:**
```
For each WordPress product URL:
  1. Extract brand + model from title (strip " — Prizma Optics" suffix)
  2. Normalize: lowercase, remove special chars, trim
  3. Match against inventory:
     - Exact: brand_name + model → /products/[barcode]/
     - Fuzzy: model contains → /products/[barcode]/
     - Brand only: → /brands/[brand-slug]/
     - None: → /products/
```

**Output:** `scripts/seo/output/product-mapping.json` + `product-mapping-report.md`
**Run:** `npx tsx scripts/seo/map-products.ts`

**DB changes:** None
**Verify:**
- [ ] Script runs without errors
- [ ] Output JSON with all products
- [ ] Match rate > 80% (if lower: DECISION_NEEDED, document, continue)
- [ ] Report created with stats + unmatched list

---

### Step 3 — Classify WordPress Pages

**Repo:** opticup-storefront
**Files to create:** `scripts/seo/classify-pages.ts`

**What to do:** Classify all 84 WordPress pages. See classification rules in Context section above.

**Output:** `scripts/seo/output/page-classification.json` + `page-classification-report.md`

**Verify:**
- [ ] All 84 pages classified
- [ ] Landing pages → KEEP_ROOT, WooCommerce → REDIRECT_HOME
- [ ] REVIEW items listed separately in report

---

### Step 4 — Classify Blog Posts & Map i18n

**Repo:** opticup-storefront
**Files to create:** `scripts/seo/classify-blog.ts`

**What to do:** Map all blog posts across 3 languages with cross-language links.

**Input:** wp-posts-he.json, wp-posts-en.json, wp-posts-ru.json

**Output:**
- `scripts/seo/output/blog-mapping.json`
- `scripts/seo/output/blog-mapping-report.md`
- `scripts/seo/output/blog-images-to-download.json`

**Verify:**
- [ ] All 58 HE posts mapped
- [ ] EN/RU translations linked where available
- [ ] Image URLs extracted for download in Phase 3B

---

### Step 5 — Generate Tag Redirects

**Files to create:** `scripts/seo/generate-tag-redirects.ts`
**Rule:** All ~1,175 product tags → `/products/` (except tags matching category names → `/category/[slug]/`)
**Output:** `scripts/seo/output/tag-redirects.json`

---

### Step 6 — Generate Category Redirects

**Files to create:** `scripts/seo/generate-category-redirects.ts`
**Rule:** `/product-category/[slug]/` → `/category/[slug]/`
**Output:** `scripts/seo/output/category-redirects.json`

---

### Step 7 — Merge All Redirects into vercel.json

**Files to create/modify:** `scripts/seo/merge-redirects.ts`, `vercel.json`

**What to do:** Merge all redirects into vercel.json. Use wildcards to stay under 1,024 limit.
**Order:** Specific product redirects (with barcode) → category redirects → wildcard tag redirect → wildcard shop catch-all → WooCommerce pages

**QUALITY GATE:** If over 1,024 after optimization → ⛔ STOP, document, wait for Daniel.

---

### Step 8 — Migration Validator Script

**Files to create:** `scripts/seo/validate-migration.ts`

**What to do:** Check every WordPress URL has a destination (page, redirect, or PLANNED status from blog-mapping/page-classification).

**Output:** `scripts/seo/output/migration-validation-report.md`
**Target:** 100% coverage. At this stage blog/landing pages count as PLANNED.

---

### Step 9 — Update Documentation

**Files to update:** SESSION_CONTEXT.md, CLAUDE.md, CHANGELOG.md, docs/SEO_MIGRATION_PLAN.md
**ERP repo:** ROADMAP.md → Phase 3: "3A ✅"

---

## Quality Gate (checked before proceeding to 3B)

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Product match rate | > 70% | ⛔ STOP |
| Redirect count | ≤ 1,024 | ⛔ STOP |
| Migration coverage | > 90% (incl. PLANNED) | ⚠️ Continue but flag |
| All scripts run | Zero errors | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup at `backups/[timestamp]_pre-phase3a`
- [ ] `docs/SEO_MIGRATION_PLAN.md` complete
- [ ] All 7 scripts work with output generated
- [ ] vercel.json updated with redirects (≤ 1,024)
- [ ] Migration validator shows > 90% coverage
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v3.0-phase3a-seo-data-prep`
