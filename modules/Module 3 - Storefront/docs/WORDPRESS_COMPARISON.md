# WordPress vs Storefront — Page Comparison
**Date:** 2026-04-04
**WordPress:** https://prizma-optic.co.il
**Storefront:** https://opticup-storefront.vercel.app (localhost:4321)

## Summary
- WordPress pages total: ~70 (including brands, campaigns, success pages, Russian pages)
- Pages matching (exist and work): 20
- Pages with differences needing content update: 2 (about, contact)
- Pages returning 500: 0 (false alarm — shell double-encoding Hebrew chars, all return 200 with proper encoding)
- Pages missing entirely: 1 (vintage-frames — 404)
- Pages intentionally not migrated: ~40 (brand pages on WP root, Russian campaign dupes, test pages)

## Core Pages — Status

| WordPress Slug | Our Slug | Status | Notes |
|---------------|----------|--------|-------|
| / | / | 200 | Hero has "בדיקת AI" test content (SQL fix created) |
| /about/ | /about/ | 200 | Content shorter than WP — needs enrichment |
| /צרו-קשר/ | /צרו-קשר/ | 500* | Renders correctly, HTTP 500 status bug |
| /accessibility/ | /accessibility/ | 200 | Matching |
| /privacy/ | /privacy/ | 200 | Matching |
| /terms/ | /terms/ | 200 | Matching |
| /deal/ | /deal/ | 200 | Matching |
| /lab/ | /lab/ | 200 | Matching |
| /multifocal-guide/ | /multifocal-guide/ | 200 | Matching |
| /supersale/ | /supersale/ | 200 | Matching — full campaign page |
| /premiummultisale/ | /premiummultisale/ | 200 | Matching |
| /supersale-takanon/ | /supersale-takanon/ | 200 | Matching |
| /multi-takanon/ | /multi-takanon/ | 200 | Matching |
| /terms-branches/ | /terms-branches/ | 200 | Matching |
| /prizma-express-terms/ | /prizma-express-terms/ | 200 | Matching |
| /prizmaexpress/ | /prizmaexpress/ | 200 | Matching |
| /onsitelab/ | /onsitelab/ | 200 | Matching |
| /multi/ | /multi/ | 200 | Matching |
| /optical-excellence/ | /optical-excellence/ | 200 | Matching |
| /general/ | /general/ | 200 | Matching |
| /brands/ | /brands/ | 200 | Matching |

## Hebrew CMS Pages — All Working

Initial testing showed HTTP 500 for Hebrew-slug pages, but this was a false alarm: the shell was double-encoding Hebrew characters. All pages return HTTP 200 when tested with proper percent-encoding:

| Slug | Status |
|------|--------|
| /צרו-קשר/ | 200 |
| /שאלות-ותשובות/ | 200 |
| /משלוחים-והחזרות/ | 200 |
| /עדשות/ | 200 |
| /מיופיה/ | 200 |
| /משקפי-מולטיפוקל/ | 200 |
| /קופח-כללית/ | 200 |

## Page-by-Page Comparison

### Homepage
**WordPress:** Video hero background (YouTube), no visible hero text. Sections: "למה אנחנו?" → "נעים מאוד, אופטיקה פריזמה" → process → bestsellers → brands.
**Ours:** Video hero background (same YouTube video), hero text "בדיקת AI" (test content). Same section order: Why Us → About → Process → Featured Products → Brands → Shorts → Blog.
**Differences:** Hero title is test content ("בדיקת AI"). SQL fix created.
**Action:** Daniel runs `sql/UPDATE-fix-hero-test-content.sql`

### About / אודות
**WordPress:** Rich content with: store history "מאז 1985", vision section "החזון שלנו", "למה אנחנו?" with 4 bullet points (40 שנות ניסיון, מגוון מותגים, מבצעים משתלמים, שליח עד הבית חינם), contact details.
**Ours:** Minimal content — just 3 short paragraphs about the store. Missing: history, vision, bullet points, contact info.
**Action:** SQL update needed to enrich content (see Step 6)

### Contact / צרו קשר
**WordPress:** Hero "איך נוכל לעזור לך?", support options (FAQ, Shipping, Cancellation links), direct contact methods (phone, email, Instagram, WhatsApp), contact form.
**Ours:** Same hero "איך נוכל לעזור לך?", same support options section, contact form. Structure matches WordPress well.
**Differences:** Minor — content matches. HTTP 500 status needs fixing.
**Action:** Fix 500 status bug (separate task)

### Legal Pages (accessibility, privacy, terms, deal)
**WordPress & Ours:** Content matches. All legal text present.
**Action:** None needed

### Campaign Pages (supersale, premiummultisale, multi)
**WordPress & Ours:** Full campaign pages with hero, pricing, CTAs, registration forms. Content matches.
**Action:** None needed

## WordPress Pages NOT in Our System

### Brand Pages on Root (e.g., /cazal/, /gucci/, /prada/)
WordPress has ~25 brand pages as root-level pages. In our system, brands are at `/brands/[slug]/`.
**Action:** Not needed — our URL structure is better for SEO. Could add redirects later.

### Russian Campaign Duplicates
- /מעבדת-מסגורים-רוסית/ — Russian lab page
- /קמפיין-כללי-רוסית/ — Russian general campaign
- /מולטיפוקל-רוסית/ — Russian multifocal
- /premiummultisaleru/ — Russian multisale
- /эксклюзивное-событие-мультифокальны/ — Russian event page
**Action:** Not needed — our i18n system handles /ru/ prefix

### Success/Thank You Pages
- /successfulmulti/, /gsuccessfulmulti/, /successfulsupersale/
**Action:** These exist in our system already

### Test/Legacy Pages
- /multitestttt/ — test page
- /brands2/ — duplicate brands
- /סיכום-רכישה/ — checkout summary (WooCommerce)
**Action:** Not needed — WooCommerce-specific or test pages

### Missing Page
- /vintage-frames/ — Returns 404 on our site. Exists on WordPress.
**Action:** Low priority — niche content page, can be added later via CMS

## Recommendations

1. **Enrich about page content** — SQL update to match WordPress richness (SQL created)
2. **Fix hero test content** — SQL already created
3. **404 page not rendering** — catch-all route returns plain "Not Found" instead of branded 404.astro
4. **Minor mobile overflow** — ContactBlock -mx-4 causes horizontal scroll on 375px
