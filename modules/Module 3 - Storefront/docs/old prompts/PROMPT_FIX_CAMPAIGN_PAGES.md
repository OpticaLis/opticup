# Fix: Campaign Pages Return 404 — Download & Add ALL Missing Pages

Context: Optic Up Storefront — migrating from WordPress to Astro.
Repo: OpticaLis/opticup-storefront
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

## ⛔ CRITICAL RULE ⛔
The new Astro site must be an EXACT 1:1 replica of the WordPress site.
Every page that exists on https://prizma-optic.co.il MUST exist on the Astro site.
If WordPress returns 200 for a URL, Astro must also return 200 for the equivalent URL.

## Problem

The Complete WP Crawl reported 100% coverage but it's WRONG. Campaign pages like /supersale/ return 404 on Astro because they were never added to the landing pages data. The catch-all route [...slug].astro only serves content if the slug exists in blog-posts.ts or landing-pages.ts.

## Step 1 — Setup

```bash
cd C:/Users/User/opticup-storefront
git checkout develop
git pull origin develop
```

Read CLAUDE.md, SESSION_CONTEXT.md.

## Step 2 — Find ALL WordPress Pages That Return 404 on Astro

Get every WordPress page from REST API and test each one on Astro:

```bash
# Get ALL published pages from WordPress (paginate until empty)
node -e "
const https = require('https');
const fetch = (url) => new Promise((resolve, reject) => {
  https.get(url, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve({ json: () => JSON.parse(data), headers: res.headers }));
  }).on('error', reject);
});

(async () => {
  let page = 1;
  let allPages = [];
  while (true) {
    const res = await fetch('https://prizma-optic.co.il/wp-json/wp/v2/pages?per_page=100&page=' + page + '&status=publish');
    const pages = await res.json();
    if (!Array.isArray(pages) || pages.length === 0) break;
    allPages = allPages.concat(pages);
    page++;
  }
  // Output: slug, link, title
  allPages.forEach(p => {
    console.log(JSON.stringify({ slug: p.slug, url: p.link, title: p.title.rendered }));
  });
})();
" > /tmp/all-wp-pages.jsonl
```

Then test EACH page on Astro:
```bash
# For each WordPress page, check if Astro returns 200
while read line; do
  slug=$(echo $line | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).slug)")
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/${slug}/")
  if [ "$code" != "200" ]; then
    echo "MISSING: /${slug}/ → ${code}"
  fi
done < /tmp/all-wp-pages.jsonl
```

This gives us the REAL list of missing pages.

## Step 3 — Download Content for ALL Missing Pages

For EACH missing page, download the full content from WordPress:

```bash
# For each missing slug, fetch from WordPress REST API
curl -s "https://prizma-optic.co.il/wp-json/wp/v2/pages?slug=[SLUG]" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if (data[0]) {
  console.log(JSON.stringify({
    slug: data[0].slug,
    title: data[0].title.rendered,
    content: data[0].content.rendered,
    excerpt: data[0].excerpt?.rendered || '',
    seo_title: data[0].yoast_head_json?.title || data[0].title.rendered,
    seo_description: data[0].yoast_head_json?.description || '',
    date: data[0].date,
    modified: data[0].modified
  }, null, 2));
}
"
```

Save ALL missing page content to: `scripts/seo/output/missing-pages-content.json`

## Step 4 — Add Missing Pages to Landing Pages Data

Update `src/data/landing-pages.ts` to include ALL missing pages.

Read the current landing-pages.ts to understand the data structure, then add every missing page to the data source.

**Option A:** If landing-pages.ts reads from a JSON file — add the new pages to that JSON file.
**Option B:** If landing-pages.ts has hardcoded data — add the new pages there.

The content should be cleaned (same cleaning as existing landing pages):
- Strip WordPress shortcodes
- Remove inline styles
- Fix image URLs (WordPress → local if possible, or keep WordPress URLs for now)
- Keep semantic HTML

## Step 5 — Verify Catch-All Route Handles New Pages

The catch-all route `src/pages/[...slug].astro` should already handle landing pages.
Verify by checking the code — if slug matches a landing page, it renders it.

If the catch-all doesn't check landing pages properly, fix it.

## Step 6 — Build and Test Locally

```bash
npx astro build
```

Must succeed with zero errors.

## Step 7 — Deploy and Verify EVERY Page

```bash
git add -A
git commit -m "Fix: Add all missing campaign/landing pages from WordPress"
git push origin develop
git checkout main && git merge develop && git push origin main && git checkout develop
```

Wait 2 minutes for Vercel deploy, then verify EVERY previously-missing page with curl:

```bash
# Test ALL pages that were missing
# For each slug in the missing list:
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/[slug]/"
# ALL must return 200
```

Also verify existing pages still work:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/products/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/brands/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/%D7%91%D7%9C%D7%95%D7%92/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/lab/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/en/blog/"
```

## Step 8 — Generate Final Coverage Report

Run the migration validator one more time with the updated complete URL list:
```bash
npx tsx scripts/seo/validate-migration.ts
```

Output must show 100% REAL coverage — every URL actually returns 200 or has a working redirect.

## Step 9 — Update Documentation

- SESSION_CONTEXT.md — document what was missing and fixed
- CHANGELOG.md — entry
- docs/SEO_MIGRATION_PLAN.md — update page counts

Commit and push.

## ⛔ DO NOT STOP UNTIL:
1. Every WordPress page URL returns 200 on Astro (not just "covered by catch-all" — actually tested with curl)
2. Zero 404s for any WordPress page
3. All existing pages still work
4. Documentation updated

## WHEN DONE — Move this prompt:
```bash
move "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\PROMPT_FIX_CAMPAIGN_PAGES.md" "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\"
```
