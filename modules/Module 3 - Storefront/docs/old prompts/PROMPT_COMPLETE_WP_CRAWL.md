# URGENT: Complete WordPress Page Crawl & Mapping

Context: Optic Up Storefront — migrating from WordPress to Astro.
Repo: OpticaLis/opticup-storefront
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

## ⛔ THIS IS CRITICAL — SEO DEPENDS ON IT ⛔

We discovered that our Phase 0 SEO audit MISSED many WordPress pages, including active campaign landing pages. We need a COMPLETE crawl of EVERY page on WordPress — not just what's in the sitemap.

## Step 1 — Setup

```bash
cd C:/Users/User/opticup-storefront
git checkout develop
git pull origin develop
```

Read CLAUDE.md and SESSION_CONTEXT.md.

## Step 2 — Crawl ALL WordPress Pages via REST API

WordPress REST API exposes all published pages and posts. Crawl EVERYTHING:

```bash
# Get ALL pages (100 per request, paginate until empty)
# Pages
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/pages?per_page=100&page=1&status=publish" > /tmp/wp-all-pages-1.json
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/pages?per_page=100&page=2&status=publish" > /tmp/wp-all-pages-2.json
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/pages?per_page=100&page=3&status=publish" > /tmp/wp-all-pages-3.json
# Keep paginating until you get an empty array []

# Posts
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/posts?per_page=100&page=1&status=publish" > /tmp/wp-all-posts-1.json
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/posts?per_page=100&page=2&status=publish" > /tmp/wp-all-posts-2.json
# Keep paginating

# Products (WooCommerce)
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/product?per_page=100&page=1&status=publish" > /tmp/wp-all-products-1.json
# Keep paginating

# Product categories
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/product_cat?per_page=100&page=1" > /tmp/wp-all-prodcats-1.json

# Product tags
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/product_tag?per_page=100&page=1" > /tmp/wp-all-prodtags-1.json
# Keep paginating — there are ~1,175 tags
```

For each page/post, extract: id, slug, link (full URL), title, status, type.

## Step 3 — Also Crawl the Sitemap

The REST API might miss some pages. Also parse the sitemap:

```bash
curl -s "https://prizma-optic.co.il/sitemap.xml" > /tmp/wp-sitemap.xml
# Parse all sitemap index entries
# Fetch each sub-sitemap
# Extract every URL
```

## Step 4 — Also Spider the Homepage

Some pages might not be in the API or sitemap. Spider from homepage:

```bash
# Get homepage, extract ALL internal links
curl -s "https://prizma-optic.co.il" | grep -oP 'href="(https?://prizma-optic\.co\.il[^"]*)"' | sort -u > /tmp/wp-homepage-links.txt

# For each link found, fetch that page and extract its links too (1 level deep)
# This catches campaign pages linked from homepage banners, popups, etc.
```

## Step 5 — Merge All Discovered URLs

Combine all sources into one deduplicated list:

```bash
# Merge: REST API pages + REST API posts + REST API products + sitemap URLs + spidered links
# Deduplicate by URL
# Output: scripts/seo/output/wp-complete-url-inventory.json
```

Output format:
```json
{
  "generated": "2026-03-30T...",
  "total_urls": 1500,
  "sources": {
    "rest_api_pages": 120,
    "rest_api_posts": 143,
    "rest_api_products": 735,
    "sitemap": 1400,
    "spidered": 50
  },
  "urls": [
    {
      "url": "https://prizma-optic.co.il/supersale/",
      "path": "/supersale/",
      "source": "rest_api_pages",
      "title": "Super Sale",
      "type": "page",
      "lang": "he"
    }
  ]
}
```

## Step 6 — Compare Against Current Coverage

Check every discovered URL against what we already have:
1. Does it have a redirect in vercel.json?
2. Does it have an Astro page?
3. Is it in our blog-mapping.json?
4. Is it in our page-classification.json?

```
For each URL:
  COVERED = has redirect OR has Astro page
  UNCOVERED = nothing — THIS IS A PROBLEM
```

Output: `scripts/seo/output/complete-coverage-report.md`

```markdown
# Complete WordPress Coverage Report

## Summary
- Total URLs discovered: X
- Already covered (redirect or page): Y
- ❌ UNCOVERED: Z

## Uncovered URLs (CRITICAL)
| URL | Title | Type | Source |
|-----|-------|------|--------|
| /supersale/ | Super Sale | page | rest_api |
| /supersale-models-prices/ | ... | page | rest_api |
...

## Already Covered
| URL | How covered |
|-----|------------|
| /shop/category/product/ | redirect → /products/barcode/ |
...
```

## Step 7 — Classify ALL Uncovered URLs

For each uncovered URL, classify:
- **CAMPAIGN_PAGE** — active landing page (supersale, premium, etc.)
- **STATIC_PAGE** — about, contact, takanon, etc.
- **OLD_CAMPAIGN** — expired campaign page (redirect to homepage or relevant page)
- **SYSTEM_PAGE** — WooCommerce system pages (redirect to homepage)
- **DUPLICATE** — same content different URL (redirect to primary)
- **UNKNOWN** — needs Daniel's decision

Output: `scripts/seo/output/uncovered-pages-classification.json`

## Step 8 — Generate Missing Redirects

For URLs that need redirects (not full pages):
- Add them to vercel.json
- Run merge-redirects.ts if needed
- Verify redirect count still ≤ 1,024

## Step 9 — Download Campaign Page Content

For URLs classified as CAMPAIGN_PAGE, download their full content:

```bash
# For each campaign page URL
curl -s "https://prizma-optic.co.il/supersale/" > /tmp/campaign-supersale.html
# Extract: title, meta, content, images, CTAs, links
```

Save to: `scripts/seo/output/campaign-pages-content.json`

This content will be used to build these pages in Astro (same URL, same content, same structure).

## Step 10 — Create Astro Pages for Active Campaigns

For each CAMPAIGN_PAGE:
1. Create the page in Astro at the SAME URL path
2. Use the downloaded content (cleaned HTML)
3. Wire into the catch-all route OR create dedicated page files
4. The page must look and function EXACTLY like WordPress — same content, same buttons, same links

## Step 11 — Update vercel.json with ALL Remaining Redirects

After creating campaign pages, update vercel.json:
- Campaign pages that are now Astro pages: no redirect needed
- Old campaigns: redirect to relevant page
- System pages: redirect to homepage
- Everything else: appropriate redirect

## Step 12 — Run Final Complete Validator

Re-run migration validator against the NEW complete URL inventory:
- Target: 100% coverage
- Every single WordPress URL must have a destination

Output: `scripts/seo/output/final-complete-validation-report.md`

## Step 13 — Verify with curl

For EVERY new page created, verify it returns 200:
```bash
# Test every campaign page
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/supersale/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/supersale-models-prices/"
# ... test ALL new pages
```

## Step 14 — Update Documentation

Update:
- `docs/SEO_MIGRATION_PLAN.md` — add campaign pages section, update URL inventory count
- `scripts/seo/output/wp-complete-url-inventory.json` — save as permanent reference
- `SESSION_CONTEXT.md` — document what was found and fixed
- `CLAUDE.md` — add known issue if any campaign pages need manual review
- `CHANGELOG.md` — entry for this fix

Commit, merge to main, push, verify.

## ⛔ DO NOT STOP UNTIL:
1. Every WordPress URL is accounted for
2. Every URL returns 200 (page) or 301 (redirect)
3. Zero uncovered URLs
4. Report generated and saved
5. Documentation updated

## WHEN DONE — Move this prompt to old prompts:
```bash
move "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\PROMPT_COMPLETE_WP_CRAWL.md" "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\"
```
