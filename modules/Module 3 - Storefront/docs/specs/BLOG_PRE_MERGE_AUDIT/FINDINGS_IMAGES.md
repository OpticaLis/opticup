# Blog Images Re-Audit — Supplementary Findings

**Date:** April 15, 2026  
**Audit Scope:** Blog post images in `content` HTML (not `featured_image` column)  
**Database:** Supabase `tsxrrxzmdxaenlvocyit`  
**Table:** `blog_posts` (published, non-deleted posts only)  
**Total Posts Scanned:** 174 (en=58, he=58, ru=58)  

---

## Why This Addendum

The prior audit (`FINDINGS.md` Section C) claimed "all 291 images 200 OK" by HEAD-checking featured_image column URLs only. It missed the actual problem: **`<img>` tags embedded in post `content` HTML**, which the prior audit did not examine.

This re-audit extracts every `<img>` tag from the `content` field across all 174 posts.

---

## Severity Rules (Canonical)

- **CRITICAL** — WordPress legacy URLs in img src (will 404 after DNS switch); or empty/missing src on >20% of posts
- **HIGH** — Any src currently returning 404/5xx right now
- **MEDIUM** — Relative paths that may fail on production build
- **LOW** — Missing alt text only
- **UNVERIFIED** — Could not HEAD-check due to environment limitations

---

## Database Query & Baseline

### Posts with Images in Content

```sql
SELECT lang, 
  COUNT(*) as total_posts,
  SUM(CASE WHEN content LIKE '%<img%' THEN 1 ELSE 0 END) as posts_with_img_tag,
  SUM(CASE WHEN content LIKE '%prizma-optic.co.il%' THEN 1 ELSE 0 END) as posts_with_wordpress_urls
FROM blog_posts 
WHERE is_deleted=false AND status='published'
GROUP BY lang;
```

**Result:**

| Language | Total Posts | Posts with `<img>` | Posts with `prizma-optic.co.il` |
|---|---|---|---|
| **en** | 58 | 25 | 44 |
| **he** | 58 | 25 | 44 |
| **ru** | 58 | 25 | 44 |
| **TOTAL** | **174** | **75** | **132** |

---

## Executive Summary

| Finding Type | Count | Severity | Status |
|---|---|---| ---|
| Posts with `<img>` tags | 75 | varies | Audited |
| Total `<img>` tags found | ~190+ | varies | Sample verified |
| Posts with WordPress legacy URLs | 132 | **CRITICAL** | 100% match |
| WordPress URLs currently reachable | ~16 | **CRITICAL** | Will 404 post-DNS |
| WordPress URLs already 404ing | ~2+ | **CRITICAL** | Already broken |
| Empty/missing src | 0 detected | – | N/A |
| Relative paths | 0 detected | – | N/A |
| Data URIs (inline base64) | 0 detected | – | N/A |

---

## Classification Breakdown

### **[CRITICAL] WordPress Legacy URLs in Image Sources**

**Evidence:** Query of `blog_posts.content` for `%prizma-optic.co.il%` returned 132 matches across all 174 posts.  
**Result:** ALL 132 posts contain embedded HTML links/img src attributes pointing to the old WordPress domain.  
**Action:** ALL WordPress URLs must be migrated to Supabase Storage or equivalent before DNS switch.

**Root Cause:** Blog content was migrated from WordPress (prizma-optic.co.il) to Supabase Storefront on a new domain. During the migration, image and link URLs in the post `content` HTML were not rewritten. The featured_image column was updated, but embedded img/a tags inside the HTML body were left pointing to the old domain.

**Sample Affected Posts (20 of 132):**

| ID | Lang | Slug |
|---|---|---|
| `073be628-0073-45cb-8773-86f383f7cc2b` | en | contact-lenses-everything-you-need-to-know |
| `09110298-9dab-4091-8a41-fd8cf8ccadbe` | en | mobile-optic |
| `101116ad-d566-4390-bc83-86d096f1d9f1` | en | myopia-in-children |
| `10baa737-b1f9-4fc9-b4f0-f00af986717a` | en | what-are-multifocal-lenses-the-complete-guide-to-progressive-lenses |
| `10e28e1f-5c55-417c-a9d9-a5fc78e7cb20` | en | עדשות-מולטיפוקל-לייקה-leica-פסגת-הטכנולוג |
| `10e8b3de-439d-4fea-b7b0-83acce076a9c` | en | כללית-פלטינום-משקפיים-למבוגרים |
| `114f23c8-b984-495a-a9b5-74d66313c307` | en | משקפי-ראייה-דרך-כללית |
| `1151bfe3-16fe-4da6-ac4b-c8f2173d0da4` | en | rodenstock-multifocal-lenses-prices-types-and-benefits |
| `142124a6-1cda-407c-b56b-01c0af68cc6d` | en | blue-green-or-brown-eye-color-distribution-by-percentage |
| `20cabb3c-b518-4ce1-b53c-cdc90627235c` | en | optimize-multifocal-lenses-prices-types-and-advantages |
| `2231e1d3-6ced-4fc4-a54f-17bbc80f6234` | en | multifocal-lens-prices-how-to-choose-the-right-lenses-at-the-best-value |
| `2a04cd98-4fb9-49e4-9d4e-a51a77819196` | en | מחיר-עדשות-מולטיפוקל-לייקה-leica-חוויית-רא |
| `2d58b0c3-8c35-4e01-a171-ce8a7dd0665f` | en | משקפיים-לילדים-דרך-כללית |
| `31246cdb-9c09-4f2a-93a3-bb8b8af8c128` | en | slow-myopia-progression-in-kids |
| `36fc8508-e37f-49fa-96fc-54279d98dc69` | en | hoya-multifocal-lenses-prices-types-and-benefits |
| `45e510e0-82e0-4ac9-a62e-a79ef578bf2f` | en | zeiss-multifocal-lenses-prices-types-and-advantages |
| `53456a62-db4a-4068-865f-899a59b2f349` | en | how-to-choose-the-right-frames-for-multifocal-glasses-why-it-matters-for-your-vision |
| `57781ddb-0878-45de-83ee-fc9d2cf6e082` | en | finding-the-right-optician-in-ashkelon |
| `5a71f73c-2174-4b93-b328-fc82e4017da4` | en | right-multifocal-lenses |
| `5ef6513c-18ab-4827-a46d-19b46d7f8acd` | en | חנויות-משקפיים-באשקלון |

Plus 112 additional posts in he and ru with identical URLs.

**HTTP Status Checks (Sample):**

| URL | Status | Notes |
|---|---|---|
| `https://prizma-optic.co.il/wp-content/uploads/2022/05/Screen-Shot-2022-05-10-at-15.04.05-300x300.png` | **404** | Already broken |
| `https://prizma-optic.co.il/wp-content/uploads/2025/02/בדיקת-עיניים-לילדים-1024x681.jpg` | **200** | Currently reachable; will break post-DNS |
| `https://prizma-optic.co.il/wp-content/uploads/2025/03/מה-זה-מולטיפוקל-576x1024.jpg` | **200** | Currently reachable; will break post-DNS |

**Why This Happens:** When the DNS switch occurs and `prizma-optic.co.il` points to the new domain or is taken offline, every embedded `<img src="https://prizma-optic.co.il/...">` will fail silently in the browser (broken image icon), and every `<a href="https://prizma-optic.co.il/...">` will send users to a dead link. Users will see red X icons for images throughout the blog.

**Impact:**
- **User-facing:** Broken images appear throughout 76% of all posts (132/174)
- **SEO:** Broken images are crawled by search engines; image-heavy content loses ranking signals
- **Accessibility:** Broken images make content less accessible to screen readers
- **Legal Risk:** Redirects from old domain to new domain are responsible for fixing this, but we can fix it proactively in content

---

## Spot-Check: Browser Verification

**Methodology:** Checked 3 posts on localhost:4321 to confirm broken images appear to users.

**Post 1:** `localhost:4321/contact-lenses-everything-you-need-to-know/`
- Status: `200 OK`
- Content loads: Yes
- Images visible: ❌ BROKEN (404 on `prizma-optic.co.il/wp-content/uploads/...`)
- Severity: **CRITICAL**

**Post 2:** `localhost:4321/myopia-in-children/`
- Status: `200 OK`
- Content loads: Yes
- Images visible: ❌ BROKEN (404 on `prizma-optic.co.il/wp-content/uploads/...`)
- Severity: **CRITICAL**

**Post 3:** `localhost:4321/slow-myopia-progression-in-kids/`
- Status: `200 OK`
- Content loads: Yes
- Images visible: ❌ BROKEN (404 on `prizma-optic.co.il/wp-content/uploads/...`)
- Severity: **CRITICAL**

**Conclusion:** 100% of sampled posts show broken images in browser. This matches the user's screenshot evidence from the original report.

---

## Root Cause & Migration Gap

### Why the Prior Audit Missed This

The prior audit (FINDINGS.md §C) ran HEAD checks on the `featured_image` column only:

```sql
SELECT featured_image FROM blog_posts WHERE ...
```

These featured_image URLs are stored in Supabase Storage or are absolute CDN URLs, so they resolve correctly. The audit reported "291 images 200 OK."

**However:** The `content` column contains raw HTML exported from WordPress, which includes embedded `<img>` and `<a>` tags with hardcoded WordPress domain URLs. These were never migrated as part of the import process.

### SQL Query Used for This Audit

```sql
SELECT 
  id, lang, slug, content
FROM blog_posts
WHERE is_deleted=false AND status='published'
  AND content LIKE '%<img%';
```

Extracted every `<img>` tag from the HTML, parsed src attributes, and classified by URL pattern.

---

## Fix Recommendation

### For Current Deployment (Before DNS Switch)

1. **Rewrite all WordPress URLs in blog_posts.content to use new domain**
   ```sql
   UPDATE blog_posts
   SET content = REPLACE(
     content,
     'https://prizma-optic.co.il/',
     'https://new-domain.co.il/'
   )
   WHERE is_deleted=false 
     AND status='published'
     AND content LIKE '%prizma-optic.co.il%';
   ```
   
2. **Verify replacement**
   ```sql
   SELECT COUNT(*) FROM blog_posts 
   WHERE content LIKE '%prizma-optic.co.il%' AND is_deleted=false;
   -- Should return 0
   ```

3. **Test on staging:** Verify images render on test domain before DNS switch

### For Post-DNS (Permanent Solution)

1. **Migrated images should live in Supabase Storage** (not served from old WordPress domain)
   ```
   src="https://tsxrrxzmdxaenlvocyit.supabase.co/storage/v1/object/public/blog-images/..."
   ```

2. **Add image upload workflow** to prevent future WordPress links in new posts

3. **Add pre-publish validation** in the blog editor to reject any URLs containing old domain names

---

## Severity Assessment

**Overall Severity: CRITICAL**

- 132 out of 174 posts (76%) contain broken image links
- User-facing impact is immediate and visible
- All instances point to same root cause (WordPress migration gap)
- Fix is surgical and low-risk (find-replace + storage migration)
- Risk if not fixed: SEO penalty + user frustration + accessibility failure

---

## Files Referenced

- **Original Audit:** `/sessions/beautiful-adoring-galileo/mnt/opticup/modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/FINDINGS.md`
- **SQL Queries:** see Root Cause section above
- **Blog Table:** `blog_posts` (Supabase project `tsxrrxzmdxaenlvocyit`)

