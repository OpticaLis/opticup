# Phase 3B — Blog & Content Migration

> **Module:** 3 — Storefront
> **Repo:** opticup-storefront
> **Execution mode:** AUTONOMOUS (continues from 3A if quality gate passed)
> **Depends on:** Phase 3A (blog-mapping.json, blog-images-to-download.json)
> **Created:** March 2026

---

## Objective

Migrate all blog content from WordPress to Astro:
1. Download blog images from WordPress
2. Build blog post pages in all 3 languages (HE root-level, EN/RU path-based)
3. Build blog index pages (`/בלוג/`, `/en/blog/`, `/ru/blog/`)
4. Implement catch-all route for root-level Hebrew content
5. Add hreflang tags for cross-language linking
6. Ensure all blog URLs match WordPress originals (zero SEO loss)

**Success = all 143 blog posts live in Astro, same URLs, 3 languages, hreflang tags correct.**

---

## Autonomous Execution Plan

### Step 0 — Backup Before Starting

**What to do:**
```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase3b"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
```
**Verify:**
- [ ] Backup exists with timestamp
- [ ] Contains src/, CLAUDE.md, scripts/seo/output/

---

### Step 1 — Verify 3A Outputs Exist

**What to do:**
Before starting, verify all Phase 3A outputs are available:

```
scripts/seo/output/blog-mapping.json         ← blog post mapping with i18n
scripts/seo/output/blog-images-to-download.json  ← image URLs list
scripts/seo/output/page-classification.json  ← page classifications
docs/SEO_MIGRATION_PLAN.md                   ← migration plan
vercel.json                                  ← redirect rules
```

If any file is missing → ⛔ STOP, document, this means 3A didn't complete.

**Verify:**
- [ ] All 5 files exist
- [ ] blog-mapping.json has entries for all 58 HE posts
- [ ] blog-images-to-download.json has image URLs

---

### Step 2 — Download Blog Images

**Files to create:** `scripts/seo/download-blog-images.ts`
**Output directory:** `public/blog/images/`

**What to do:**
Read `blog-images-to-download.json` and download all images from WordPress.

**Algorithm:**
```
For each image URL:
  1. Extract filename from URL
  2. Download image from WordPress (https://prizma-optic.co.il/wp-content/uploads/...)
  3. Save to public/blog/images/[filename]
  4. Handle duplicates: if filename exists, add hash suffix
  5. Track mapping: original URL → local path
```

**Output:** 
- Images in `public/blog/images/`
- `scripts/seo/output/image-download-report.json` — mapping of original URLs to local paths, failed downloads

**Error handling:**
- If image download fails: log error, use placeholder, continue
- If WordPress is down: ⛔ STOP (can't download images)
- Rate limit: 100ms delay between downloads to be polite

**Verify:**
- [ ] Script runs: `npx tsx scripts/seo/download-blog-images.ts`
- [ ] Images saved to `public/blog/images/`
- [ ] Report shows download success rate
- [ ] Failed downloads documented (if any)

---

### Step 3 — Create Blog Content Data Structure

**Files to create:** `src/data/blog-posts.ts`

**What to do:**
Create a TypeScript module that loads and exports all blog posts as structured data. This is what the Astro pages will query.

**Structure:**
```typescript
export interface BlogPost {
  slug: string;           // URL slug (without leading /)
  lang: 'he' | 'en' | 'ru';
  title: string;
  content: string;        // Cleaned HTML content
  excerpt: string;
  date: string;           // ISO date
  modified: string;       // ISO date
  categories: string[];
  tags: string[];
  featuredImage: string | null;  // Local path in /blog/images/
  seo: {
    title: string;
    description: string;
    ogImage: string | null;
  };
  translations: {
    he: string | null;    // slug of HE version
    en: string | null;    // slug of EN version
    ru: string | null;    // slug of RU version
  };
  wordCount: number;
}

export function getAllPosts(lang?: string): BlogPost[];
export function getPostBySlug(slug: string, lang: string): BlogPost | null;
export function getPostSlugs(lang: string): string[];
```

**Content cleaning:**
- Strip WordPress shortcodes ([caption], [gallery], etc.)
- Convert WordPress image URLs to local paths (using image-download-report.json mapping)
- Fix internal links: WordPress URLs → new Astro URLs
- Remove WordPress-specific HTML classes
- Keep semantic HTML (h2, h3, p, ul, ol, blockquote, img, a)

**Data source:** Read from wp-posts-he.json, wp-posts-en.json, wp-posts-ru.json
Use blog-mapping.json for cross-language linking.

**DB changes:** None
**Verify:**
- [ ] `getAllPosts('he')` returns 58 posts
- [ ] `getAllPosts('en')` returns 43 posts
- [ ] `getAllPosts('ru')` returns 42 posts
- [ ] Each post has cleaned HTML (no WordPress shortcodes)
- [ ] Image URLs point to `/blog/images/[filename]`
- [ ] Translations linked correctly

---

### Step 4 — Build Catch-All Route for Root-Level Content

**Files to create:** `src/pages/[...slug].astro`

**What to do:**
Create a catch-all route that handles root-level Hebrew blog posts and landing pages.

**Logic:**
```
1. Extract slug from URL params
2. Check if slug matches a Hebrew blog post (from blog-posts.ts)
   → Yes: render BlogPost template
3. Check if slug matches a landing page (from page-classification.json, KEEP_ROOT items)
   → Yes: render LandingPage template (placeholder for Phase 3C)
4. Neither → return 404
```

**Important Astro considerations:**
- This route must NOT catch URLs that already have specific pages (like /products/, /brands/, /categories/, /search)
- Astro route priority: specific routes win over catch-all
- The catch-all only triggers for paths that don't match any other route

**Template for blog posts:**
```astro
---
// BlogPost layout: article with sidebar
// - Title (h1)
// - Date + category badges
// - Featured image (if exists)
// - Content (cleaned HTML, rendered as raw HTML)
// - hreflang tags in <head>
// - Schema.org Article JSON-LD
// - Related posts (same category, max 3)
---
```

**DB changes:** None
**Verify:**
- [ ] `/עדשות-מגע/` loads blog post (test with known slug from blog-mapping.json)
- [ ] `/products/` still works (not caught by catch-all)
- [ ] `/brands/` still works
- [ ] `/nonexistent-page/` returns 404
- [ ] Zero console errors
- [ ] Blog post renders with title, date, content, images

---

### Step 5 — Build Blog Post Template Component

**Files to create:**
- `src/components/BlogPost.astro` — full blog post layout
- `src/components/BlogCard.astro` — card for blog listing

**BlogPost.astro must include:**
- `<article>` with proper semantic HTML
- Title as `<h1>`
- Date formatted per locale (Hebrew: "15 במרץ 2026", EN: "March 15, 2026", RU: "15 марта 2026")
- Category badges
- Featured image with `loading="eager"`
- Content rendered as raw HTML: `<Fragment set:html={post.content} />`
- Author (hardcoded "פריזמה אופטיק" for now — will be dynamic in white-label phase)
- hreflang `<link>` tags for all available translations
- Schema.org Article JSON-LD
- Share buttons (WhatsApp, Facebook — simple links, no JS SDKs)
- "Back to blog" link → `/בלוג/`
- Related posts section (same category, max 3)

**BlogCard.astro:**
- Thumbnail (featured image or placeholder)
- Title
- Excerpt (max 150 chars)
- Date
- Category badge
- Link to full post

**RTL:** Both components must support RTL (Hebrew) and LTR (English, Russian).

**DB changes:** None
**Verify:**
- [ ] Blog post renders correctly in Hebrew (RTL)
- [ ] hreflang tags present in page source
- [ ] Schema.org Article JSON-LD valid
- [ ] Images load from `/blog/images/`
- [ ] Related posts show up (if same category exists)

---

### Step 6 — Build EN/RU Blog Routes

**Files to create:**
- `src/pages/en/[...slug].astro` — English blog posts
- `src/pages/ru/[...slug].astro` — Russian blog posts

**What to do:**
Same logic as the HE catch-all, but:
- Reads EN/RU posts from blog-posts.ts
- Uses LTR direction
- hreflang links back to HE version and other languages
- Date format per locale

**Important:** These are separate from the HE catch-all. Astro will route `/en/something/` to `src/pages/en/[...slug].astro` automatically.

**DB changes:** None
**Verify:**
- [ ] `/en/[known-en-slug]/` loads English blog post
- [ ] `/ru/[known-ru-slug]/` loads Russian blog post
- [ ] LTR direction correct
- [ ] hreflang tags point to HE and other language versions
- [ ] 404 for nonexistent EN/RU slugs

---

### Step 7 — Build Blog Index Pages

**Files to create:**
- `src/pages/בלוג.astro` — Hebrew blog index (YES, Hebrew filename — Astro supports this)
- `src/pages/en/blog.astro` — English blog index
- `src/pages/ru/blog.astro` — Russian blog index

**Note on Hebrew filename:** Astro supports Unicode filenames. `src/pages/בלוג.astro` will serve at `/בלוג/`. If this causes issues, fallback: use `[...slug].astro` catch-all to handle `/בלוג/` as a special case.

**Blog index layout:**
- Hero: "הבלוג של פריזמה אופטיק" (or tenant name from v_public_tenant)
- Filter by category (pills/badges)
- Post grid: BlogCard components, sorted by date (newest first)
- Pagination: 12 posts per page (if > 12 posts)
- hreflang tags linking HE/EN/RU blog indexes

**Pagination approach:**
- For 58 posts, 5 pages of 12.
- URL pattern: `/בלוג/`, `/בלוג/2/`, `/בלוג/3/`... 
- Or: client-side "Load more" button (simpler, better UX)
- **Recommendation:** "Load more" button — loads next 12 via client-side JS, no extra routes needed

**DB changes:** None
**Verify:**
- [ ] `/בלוג/` shows all Hebrew blog posts
- [ ] `/en/blog/` shows English posts
- [ ] `/ru/blog/` shows Russian posts
- [ ] Category filter works
- [ ] Posts sorted by date (newest first)
- [ ] hreflang tags link all 3 blog indexes
- [ ] Blog cards link to correct post URLs

---

### Step 8 — Add hreflang to Existing Pages

**Files to modify:** `src/layouts/BaseLayout.astro`

**What to do:**
Add hreflang tags to the BaseLayout so ALL pages (not just blog) have proper i18n signals.

**Rules:**
```html
<!-- For Hebrew pages (default) -->
<link rel="alternate" hreflang="he" href="https://www.prizma-optic.co.il/[current-path]/" />
<link rel="alternate" hreflang="en" href="https://www.prizma-optic.co.il/en/[current-path]/" />
<link rel="alternate" hreflang="ru" href="https://www.prizma-optic.co.il/ru/[current-path]/" />
<link rel="alternate" hreflang="x-default" href="https://www.prizma-optic.co.il/[current-path]/" />
```

**For blog posts:** Use actual translation URLs from blog-posts.ts (not pattern-based, since slugs differ between languages).

**Note:** Until DNS switch, use `opticup-storefront.vercel.app` as base URL, or make it configurable via env var `PUBLIC_SITE_URL`.

**DB changes:** None
**Verify:**
- [ ] hreflang tags present on homepage
- [ ] hreflang tags present on blog posts with correct translation URLs
- [ ] x-default points to Hebrew version
- [ ] No self-referencing errors

---

### Step 9 — Update Documentation

**Files to update:**
- `SESSION_CONTEXT.md` — Phase 3B status, blog post count, image download stats
- `CHANGELOG.md` — Phase 3B entry
- `CLAUDE.md` — new known issues (Hebrew filenames, catch-all route behavior, image handling)
- `docs/SEO_MIGRATION_PLAN.md` — update with actual blog migration results

**ERP repo:** ROADMAP.md → Phase 3: "3A ✅, 3B ✅"

**Verify:**
- [ ] SESSION_CONTEXT.md complete with stats
- [ ] All files committed to `develop`
- [ ] Tag: `v3.0-phase3b-blog-migration`

---

## Quality Gate (checked before proceeding to 3C)

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| HE blog posts render | All 58 accessible | ⛔ STOP |
| Blog images load | > 90% download success | ⚠️ Continue, flag missing |
| hreflang tags valid | Present on all blog pages | ⚠️ Continue, flag |
| Catch-all doesn't break existing routes | /products/, /brands/ still work | ⛔ STOP |
| Zero console errors | Clean browser console | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup at `backups/[timestamp]_pre-phase3b`
- [ ] Blog images downloaded to `public/blog/images/`
- [ ] `src/data/blog-posts.ts` with all posts in 3 languages
- [ ] Catch-all route works for HE blog posts at root level
- [ ] EN/RU blog routes work
- [ ] Blog index pages work (`/בלוג/`, `/en/blog/`, `/ru/blog/`)
- [ ] hreflang tags on all pages
- [ ] Schema.org Article JSON-LD on blog posts
- [ ] Existing pages unaffected (products, brands, categories)
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v3.0-phase3b-blog-migration`
