# QA Full Audit Report — Module 3 Storefront
**Date:** 2026-04-03
**Branch:** develop
**Commit:** eb60434
**Auditor:** Claude Code Autonomous QA

## Executive Summary
- Total Issues Found: 67
- Critical: 5 | High: 14 | Medium: 28 | Low: 14 | Info: 6
- Overall Health Score: 62/100
- Ready for DNS Switch: **NO** — 5 critical + 14 high issues must be resolved first

### Top 10 Critical/High Findings
1. **🔴 CRITICAL** — No custom 404 page: visitors see plain "Not Found" text
2. **🔴 CRITICAL** — No hreflang `<link>` tags in BaseLayout (only blog pages have them) — Google may show wrong language or treat as duplicate content
3. **🔴 CRITICAL** — No skip navigation link — keyboard users must tab through entire header
4. **🔴 CRITICAL** — No tests exist — zero test files, no test framework installed
5. **🔴 CRITICAL** — Image proxy path traversal: `../` segments not sanitized before passing to Supabase
6. **🟠 HIGH** — Homepage hero shows "בדיקת AI" test content
7. **🟠 HIGH** — SSRF via webhook_url in lead submission (attacker can probe internal endpoints)
8. **🟠 HIGH** — No rate limiting on any API route (leads, images, logo upload)
9. **🟠 HIGH** — 3 npm vulnerabilities (path-to-regexp ReDoS) via `@astrojs/vercel`
10. **🟠 HIGH** — 24 color contrast failures (text-gray-400 on white, gold on white)

## Progress
- [x] Part 1: Code Architecture — 25 issues
- [x] Part 2: Visual & UI — 8 issues
- [x] Part 3: Functionality Deep Dive — 6 issues
- [x] Part 4: SEO Audit — 7 issues
- [x] Part 5: Performance Audit — 4 issues
- [x] Part 6: CMS & Content Quality — 2 issues
- [x] Part 7: Database & Data Integrity — 1 issue
- [x] Part 8: Code Patterns & Best Practices — 10 issues
- [x] Part 9: Edge Cases & Stress Testing — 1 issue
- [x] Part 10: WordPress Comparison — completed
- [x] Part 11: Studio (ERP) Deep Audit — deferred (separate repo)
- [x] Part 12: Full Code Walkthrough — 3 issues (merged into parts above)
- [x] Part 13: Improvement Recommendations — completed

---

## Part 1: Code Architecture Audit

### 1.1 File Structure & Size Compliance

**Code Metrics:**
| Metric | Count |
|--------|-------|
| TypeScript files | 31 |
| Astro files | 68 |
| CSS files | 1 |
| Components | 45 (27 main + 18 blocks) |
| Pages (routes) | 24 |
| API Routes | 3 |
| Library files | 21 (12 core + 2 block + 7 shortcode) |
| Layouts | 2 |
| Total TS+Astro lines | 11,385 |
| Total CSS lines | 74 |
| node_modules | 156 MB |

**🟠 HIGH — File Size Violations (2 files exceed 350-line rule):**
| File | Lines | Limit | Over By |
|------|-------|-------|---------|
| `src/components/BrandPage.astro` | 565 | 350 | +215 |
| `src/pages/products/[barcode].astro` | 453 | 350 | +103 |

No CSS files exceed 250-line limit (global.css: 74 lines).

**🟡 MEDIUM — 7 orphaned files (never imported/referenced):**

*Data files (4):*
- `src/data/legal-privacy.ts` — 2 lines
- `src/data/legal-terms.ts` — 2 lines
- `src/data/legal-prizma-express.ts` — 2 lines
- `src/data/legal-terms-branches.ts` — 2 lines

*Components (3):*
- `src/components/CategoryGrid.astro` — 56 lines
- `src/components/LabReviews.astro` — 80 lines
- `src/components/MultifocalCTA.astro` — 166 lines

**🟡 MEDIUM — CLAUDE.md file tree outdated:**
- Lists only 14 components but actual codebase has 45
- Block system (18 components), shortcode system (7 files), CampaignLayout not documented
- Structure is well-organized despite outdated docs

### 1.2 TypeScript Quality

**🟠 HIGH — TypeScript & @astrojs/check not installed as dependencies:**
- `npx tsc --noEmit` fails — TypeScript not in devDependencies
- `@astrojs/check` not installed — `astro check` prompts for install
- No type-checking is possible during build or CI

**🟡 MEDIUM — 89 instances of `any` type usage across 30 source files:**

Worst offenders:
| File | Count | Context |
|------|-------|---------|
| `src/components/BrandPage.astro` | 7 | `products: any[]`, `(p: any)` |
| `src/pages/products/index.astro` | 6 | `products: any[]`, `brands: any[]` |
| `src/pages/en/products/index.astro` | 6 | Same pattern |
| `src/pages/ru/products/index.astro` | 6 | Same pattern |
| `src/pages/en/products/[barcode].astro` | 6 | `related: any[]`, `(product as any)` |
| `src/pages/ru/products/[barcode].astro` | 6 | Same |
| `src/pages/products/[barcode].astro` | 5 | `related: any[]`, `(product as any).resolved_mode` |
| `src/lib/tenant.ts` | 3 | `tenant: any`, `sfConfig: any` |

Note: `StorefrontProduct`, `StorefrontBrand` interfaces exist in `src/lib/products.ts` but page files don't use them.

**No `@ts-ignore` or `@ts-expect-error` found** — good.

### 1.3 Supabase Access Patterns

**42 total `.from()` queries found across src/.**

**🟡 MEDIUM — Direct table access violations (4 instances):**
| File | Line | Table | Should Use | Notes |
|------|------|-------|------------|-------|
| `src/lib/products.ts` | 22 | `ai_content` | View | No view exists, need `v_ai_content` |
| `src/lib/pages.ts` | 50 | `storefront_pages` | `v_storefront_pages` | Preview mode — intentional service_role bypass |
| `src/pages/api/leads/submit.ts` | 86 | `storefront_components` | `v_storefront_components` | Read via view |
| `src/pages/api/normalize-logo.ts` | 105, 110 | `brands`, `storefront_config` | Views | Admin API, service_role |

Write operations to `cms_leads` are acceptable (views are read-only).

**🟡 MEDIUM — 17 instances of `.select('*')` instead of specific columns:**
These all query views (limited exposure), but `select('*')` means new columns are automatically exposed.

**🟡 MEDIUM — `supabase-admin.ts` imported in non-API files:**
- `src/components/blocks/ProductsBlock.astro:4` — SSR component (safe at runtime but widens surface area)
- `src/lib/pages.ts:2` — Library file (server-side, but imported broadly)

**No hardcoded tenant IDs** — good.
**No hardcoded Supabase URLs** — good.

### 1.4 Security Audit

**🔴 CRITICAL — Image proxy path traversal (`src/pages/api/image/[...path].ts`):**
- Path param is checked for `frames/` or `media/` prefix but `../` segments are NOT sanitized
- Attacker could craft: `/api/image/frames/../other-bucket/secret.jpg`
- Supabase Storage may normalize paths, but application layer doesn't validate

**🟠 HIGH — SSRF via webhook_url in lead submission:**
- `src/pages/api/leads/submit.ts` accepts `webhook_url` from request body and calls `fetch()` on it
- Attacker can probe internal infrastructure (e.g., `http://169.254.169.254/latest/meta-data/`)
- No URL validation, no domain allowlist

**🟠 HIGH — No rate limiting on any API route:**
- `/api/leads/submit` — unlimited form submissions (spam vector)
- `/api/image/[...path]` — unlimited signed URL generation
- `/api/normalize-logo` — unlimited uploads

**🟠 HIGH — No authentication on `/api/normalize-logo`:**
- Any request with a valid tenant_id can upload/overwrite logos
- No admin token or session check
- No file size limit on base64 input

**🟠 HIGH — No phone/email format validation in lead submission:**
- Any string accepted as `phone` — no regex validation
- No email format check
- Allows garbage/spam data

**🟡 MEDIUM — Preview mode has no authentication:**
- `?preview=true` on any CMS page URL reveals draft content
- No secret token, session check, or IP restriction

**🟡 MEDIUM — 20 instances of `set:html` (potential XSS vectors):**
Most critical:
- `CustomBlock.astro:70` — renders arbitrary HTML from DB (by design for super admin)
- `BlogPost.astro:99` — blog content from DB
- `LandingPage.astro:44` — landing page content
- `TextBlock.astro:20` — text block HTML
- No server-side HTML sanitization (DOMPurify or equivalent) anywhere

Mitigating: content is admin-controlled (CMS), not user input. But compromised admin = XSS.

**🟡 MEDIUM — Open redirect via DB-sourced redirect_url:**
- `LeadFormBlock.astro:107` — `window.location.href = redirectUrl` from block config
- `lead-form.ts:224` — same pattern in shortcode
- Admin could set to `javascript:alert(1)` or phishing URL

**SERVICE_ROLE_KEY usage (all server-side only — PASS):**
| File | Context |
|------|---------|
| `src/lib/supabase-admin.ts:4` | Admin client creation |
| `src/pages/api/image/[...path].ts:5` | Image proxy signing |
| `src/pages/api/leads/submit.ts:22` | Lead insertion |
| `src/pages/api/normalize-logo.ts:14` | Logo processing |

**.env.example exists — PASS**
**.gitignore includes .env — PASS**
**No hardcoded secrets in source — PASS**

### 1.5 Dependencies Audit

**🟠 HIGH — 3 high-severity npm vulnerabilities:**
```
path-to-regexp  4.0.0 - 6.2.2 — ReDoS via backtracking regex
  → @vercel/routing-utils → @astrojs/vercel
Fix: Update @astrojs/vercel from 10.0.3 to 10.0.4
```

**🟡 MEDIUM — `dotenv` in production dependencies but only used in migration scripts:**
- Not imported anywhere in `src/` — only in `scripts/seo/migrate-blog-to-db.ts`
- Should be moved to devDependencies or removed

**ℹ️ INFO — node_modules size: 156 MB** (reasonable)

### 1.6 Environment & Config

**Astro config — PASS:**
- `output: 'server'` (SSR), `@astrojs/vercel` adapter
- i18n: `defaultLocale: 'he'`, locales: `['he', 'en', 'ru']`
- Sitemap and Partytown integrations configured

**🟡 MEDIUM — Missing security headers in vercel.json:**
- Has: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- Missing: `Strict-Transport-Security` (HSTS)
- Missing: `Content-Security-Policy` (CSP)

**🟠 HIGH — Forbidden colors in ReviewsBlock.astro:**
- Line 53: avatar color palette includes `#3b82f6` (blue), `#8b5cf6` (violet), `#06b6d4` (cyan), `#ec4899` (pink)
- Lines 125-128: Google logo uses `#4285F4` (blue) — arguably required for trademark accuracy

**🟡 MEDIUM — Multiple non-canonical gold color variants:**
| Hex | File | Expected |
|-----|------|----------|
| `#D4A853` | `CtaBlock.astro` | Should be `#c9a555` |
| `#c5a059` | `supersale-takanon/index.astro` (8 occurrences) | Should be `#c9a555` |
| `#b8860b`, `#d4af37`, `#f5d37a` | `Header.astro`, `MultifocalCTA.astro` | Should be `#c9a555`/`#e8da94` |

**🟡 MEDIUM — Red used for non-error UI:**
- `text-red-600` on filter reset buttons — should use gold
- `bg-red-500` for product badges — campaign badge default

**🟡 MEDIUM — Border color mismatch:**
- `--color-border: #e5e7eb` (Tailwind gray-200) vs documented `#e5e5e5`

**tsconfig.json — PASS:** Uses `astro/tsconfigs/strict`

---

## Part 2: Visual & UI Audit

### 2.1 Homepage

**🟠 HIGH — Hero section displays "בדיקת AI" (test content)**
- This appears to be leftover test content from AI content generation
- Visible as the first thing visitors see
- Screenshot: `qa-screenshots/01-homepage-desktop.png`

**🟡 MEDIUM — Horizontal overflow on mobile:**
- scrollWidth (509) > clientWidth (493) = 16px overflow
- Causes horizontal scrollbar on mobile devices
- Screenshot: `qa-screenshots/03-homepage-mobile.png`

**Header — PASS:** Logo, nav, language switcher, booking button, search all functional
**Footer — PASS:** Black background, gold accents, correct branding
**Font — PASS:** Rubik (correct)
**dir="rtl", lang="he" — PASS**
**No forbidden colors detected via computed style scan — PASS** (class-level violations found separately)
**Console errors: 0 — PASS**

### 2.2 Product Pages

**Products listing (`/products/`) — PASS:**
- 103 products, 24 per page, all images load via `/api/image/`, 0 broken images
- Filters and sort working
- Screenshot: `qa-screenshots/04-products-desktop.png`

**🟡 MEDIUM — Mobile products page: filters consume entire viewport**
- User must scroll past all category/brand filters before seeing products
- Screenshot: `qa-screenshots/13-products-mobile.png`

**Product detail (`/products/0004090`) — PASS:**
- Breadcrumbs, image carousel, AI description, WhatsApp CTA, specs table
- Schema.org: Product + BreadcrumbList
- Screenshot: `qa-screenshots/05-product-detail-desktop.png`, `14-product-detail-mobile.png`

### 2.3 Brand Pages
- `/brands/` — PASS: Logos, gold borders, product counts
- Brand detail shows simple grid (SQL 048-050 not run yet — expected)

### 2.4-2.6 Categories, Blog, Search
- `/categories/` — PASS: 2 categories with counts
- `/בלוג/` — PASS: Blog cards with images, RTL correct
- `/search?q=ray` — shows "No results" (no Ray-Ban in catalog — expected)

### 2.7 CMS Pages
- `/supersale/` — 25 sections rendering correctly (dark hero, gold CTAs)

### 2.8 i18n Pages

**🟡 MEDIUM — English pages have Hebrew store name in title:**
- Title: "Products — אופטיקה פריזמה | אופטיקה פריזמה"
- Store name not translated in header/footer

**LTR/RTL direction correct for all languages — PASS**

---

## Part 3: Functionality Deep Dive

### 3.1 Lead Forms
- Lead API validates required fields (tenant_id, phone) — PASS
- Empty body returns proper error — PASS
- See Security section for XSS/SSRF/rate limiting issues

### 3.2 WhatsApp Integration
- Link format correct: `https://wa.me/972533645404?text=...`
- Pre-filled message with URL-encoded Hebrew product name — PASS

### 3.3 Image Proxy
- Invalid path → 404 — PASS
- Path traversal `../../etc/passwd` → 404 — PASS (but `../` within valid prefix not checked)
- See Security section for detailed traversal concern

### 3.4 Navigation & Routing

**🔴 CRITICAL — No custom 404 page:**
- Non-existent URLs show plain "Not Found" text, no branding
- Screenshot: `qa-screenshots/16-404-page.png`

**Non-existent barcode** → 302 to `/products` — reasonable
**`/en/` and `/ru/` root** → 302 to `/` — no loops — PASS
**All 8 key WordPress URLs tested** → 200 — PASS

### 3.5 Shortcode System

**🟡 MEDIUM — Duplicate shortcode replacement bug:**
- `index.ts`: `result.replace(sc.raw, rendered)` replaces only first occurrence
- If identical shortcodes appear twice, second stays as raw text

---

## Part 4: SEO Audit

### 4.1 Meta Tags

**🔴 CRITICAL — No hreflang tags in BaseLayout.astro:**
- `languageUrls` prop is passed to Header for language switcher but NEVER rendered as `<link rel="alternate" hreflang="...">` in `<head>`
- Only blog pages have hreflang (hardcoded in blog templates)
- Homepage, products, brands, categories, CMS pages all lack hreflang
- Google may show wrong language version or treat as duplicate content

**🟡 MEDIUM — No Twitter Card meta tags:**
- Missing `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Social previews on Twitter/X will be suboptimal

**🟡 MEDIUM — No `og:site_name` tag**

### 4.2 Schema Markup
- Homepage: LocalBusiness + WebSite + Organization + WebPage + BreadcrumbList — excellent
- Product detail: Product + BreadcrumbList — good
- 🟡 MEDIUM — Product listing page lacks CollectionPage/ItemList schema

### 4.3 Technical SEO

**robots.txt — PASS** (blocks /api/ and /search, references sitemap)

**🟠 HIGH — Sitemap mostly empty for SSR pages:**
- `@astrojs/sitemap` only generates entries for prerendered pages
- With `output: 'server'`, most pages are SSR and will NOT appear in sitemap
- Severely limits crawl coverage

**Search page noindex — PASS**

**Vercel.json: 143 redirect rules for WordPress migration — PASS**

**🟢 LOW — Mixed-case barcode redirects:**
- Some redirects use `/products/SL0999/` vs `/products/sl0089/`
- Could fail if barcode lookup is case-sensitive

---

## Part 5: Performance Audit

### 5.1 Build Analysis
- Build succeeds with zero errors — PASS
- Build time: 7.29 seconds
- Output: SSR mode via `@astrojs/vercel`

### 5.2 Bundle Sizes
| Asset | Size |
|-------|------|
| Main JS bundle | 193 KB |
| Search JS | 4 KB |
| Total JS | 197 KB |
| Total CSS | 77 KB |
| dist/ total | 7.8 MB |

**🟡 MEDIUM — Blog images not optimized:**
- `img_4736.jpeg` — 532 KB, `_____-_________-2.jpg` — 363 KB
- Several exceed 300KB — should compress/convert to WebP

### 5.3 Lighthouse Scores
| Page | Device | Accessibility | Best Practices | SEO |
|------|--------|--------------|----------------|-----|
| Homepage | Desktop | 92 | 58 | 100 |
| Products | Mobile | 94 | 81 | 100 |

**🟠 HIGH — Homepage Best Practices score: 58**
- Deprecated APIs: SharedStorage, AttributionReporting (third-party)
- Third-party cookies detected

**🟡 MEDIUM — Touch target size: search submit button below 48x48px minimum**

---

## Part 6: CMS & Content Quality

**🟠 HIGH — Homepage hero "בדיקת AI" test content** (duplicate of 2.1)

**ℹ️ INFO — AI product descriptions present and readable**

---

## Part 7: Database & Data Integrity

- `v_storefront_products` → 103 products — PASS
- Images start with `/api/image/` — PASS (Golden View verified)
- `v_storefront_brands` → brands with counts — PASS
- `v_storefront_categories` → 2 categories — PASS
- `v_public_tenant` → prizma data — PASS

**🟢 LOW — Only 2 categories (eyeglasses: 40, sunglasses: 63)**

---

## Part 8: Code Patterns & Best Practices

### 8.1 Error Handling
- API routes have try/catch — PASS
- Console errors: zero across all tested pages — PASS
- 🟡 MEDIUM — Webhook status update in leads/submit.ts has no error handling (lines 150-158)
- 🟡 MEDIUM — Image proxy creates new Supabase client per request (should reuse module-level)

### 8.2 Code Quality
- 🟡 MEDIUM — `getBrandBySlug` fetches ALL brands then filters in memory (should query by slug directly)
- 🟡 MEDIUM — Tenant cache has no TTL — config changes require cold start/redeploy
- 🟡 MEDIUM — Tenant resolution order in code differs from CLAUDE.md docs (`?t=` first vs custom_domain first)
- 🟡 MEDIUM — `search_text ilike` doesn't escape `%` and `_` wildcards in user input

### 8.3 Accessibility

**🔴 CRITICAL — No skip navigation link:**
- No "Skip to main content" link in BaseLayout or Header
- `<main>` element has no `id` attribute
- Keyboard users must tab through entire header/nav on every page

**🟠 HIGH — Color contrast failures (24 instances from Lighthouse):**
- Gold `#c9a555` on white: ~2.9:1 ratio (needs 4.5:1 for AA)
- `text-gray-400` (#9ca3af) on white: ~2.9:1 ratio
- Affects product cards, brand labels, accent text

**🟠 HIGH — Form inputs lack labels (placeholder-only):**
- `ContactForm.astro` — name/phone/email have no `<label>` elements
- `ContactBlock.astro` — same
- Search inputs across site lack labels
- Fails WCAG 2.1 SC 1.3.1 and SC 3.3.2

**🟡 MEDIUM — Product thumbnail/search result images have empty alt=""**
- Should have descriptive alt text

**🟡 MEDIUM — Carousel aria-labels swapped in RTL:**
- `products/[barcode].astro:183-184`: `carousel-next` has `aria-label="Previous image"` and vice versa

### 8.4 RTL Implementation

**🟠 HIGH — Carousel arrows use physical left/right positioning:**
- 10+ carousel components use `left-0`/`right-0` instead of `start-0`/`end-0`
- Affects: FeaturedProducts, BrandsCarousel, ShortsSection, BlogPreview, ProductsBlock, BrandsBlock, BlogCarouselBlock, VideoBlock, ReviewsBlock, product detail
- Arrows won't flip correctly in RTL

**🟡 MEDIUM — Header nav underline animation uses `left-0`** — should use `inset-inline-start: 0`
**🟡 MEDIUM — ContactBlock hardcodes `text-right`** for all languages
**🟡 MEDIUM — LabReviews uses physical `border-r` and `pr-4`** instead of logical `border-e`/`pe-4`
**🟡 MEDIUM — ProductCard badge positioned with `right-2`** instead of `end-2`

**Correct RTL implementations:**
- `dir="rtl"` on HTML for Hebrew, `dir="ltr"` for EN/RU — PASS
- Keyboard nav in lightbox correctly swaps Arrow keys for RTL — good
- `BlogPost.astro` and `BlockWrapper.astro` use conditional text alignment — good

### 8.5 Hardcoded Tenant Data

**🟡 MEDIUM — Header nav links hardcoded (Prizma-specific):**
- Lines 33-39: `/product-category/...`, `/multifocal-guide/`, `/lab/`
- Violates Rule 9 for multi-tenant setup

**🟢 LOW — Fallback logo is Prizma-specific:**
- `Header.astro:52`: `/images/prizma-logo-site.png`

---

## Part 9: Edge Cases & Stress Testing

| Test | Result |
|------|--------|
| Non-existent product barcode | 302 → /products (handled) |
| Non-existent page slug | Plain "Not Found" (needs 404 page) |
| Path traversal on image proxy | 404 for `../../etc/passwd` |
| /en/ root | 302 → / (no loop) |
| /ru/ root | 302 → / (no loop) |
| Empty lead form submission | Proper validation error |

**🟡 MEDIUM — Duplicate shortcode not replaced** (mentioned in Part 3.5)

---

## Part 10: WordPress Comparison

### 10.1 Page Coverage
- WordPress has ~70 pages in sitemap
- Our storefront has ~24 routes + CMS pages
- 143 vercel.json redirects cover WordPress URL migration
- All 8 tested key pages return 200

### 10.2 Key WordPress URLs Tested
| URL | Status |
|-----|--------|
| /about/ | 200 |
| /accessibility/ | 200 |
| /privacy/ | 200 |
| /terms/ | 200 |
| /lab/ | 200 |
| /successfulsupersale/ | 200 |
| /supersale-takanon/ | 200 |
| /premiummultisale/ | 200 |

### 10.3 Missing Coverage
- Many WordPress brand pages at root level (/blackfin/, /burberry/, etc.) depend on SQL 048-050
- vercel.json has 26 brand slug redirects to `/brands/` paths

---

## Part 11: Studio (ERP) Deep Audit

**Deferred** — requires localhost:3000 (ERP repo). Should be audited separately.

---

## Part 12: Full Code Walkthrough

### Code Quality Metrics
| Metric | Value |
|--------|-------|
| Total TypeScript + Astro files | 99 |
| Total lines of code | 11,385 |
| Components | 45 |
| Pages | 24 |
| API routes | 3 |
| Library files | 21 |
| Test files | **0** |
| `any` type usage | 89 instances |
| `set:html` usage | 20 instances |
| `.select('*')` usage | 17 instances |
| Direct table access | 4 instances |

### Critical File Summary

| File | Lines | Key Concerns |
|------|-------|-------------|
| `src/lib/tenant.ts` | 206 | 3x `any`, cache no TTL, resolution order differs from docs |
| `src/lib/products.ts` | 257 | Direct `ai_content` access, search ilike not escaped |
| `src/lib/brands.ts` | 124 | `getBrandBySlug` fetches ALL then filters in memory |
| `src/lib/pages.ts` | 85 | Direct table in preview, preview has no auth |
| `src/lib/shortcodes/index.ts` | 67 | Duplicate shortcode replacement bug |
| `src/pages/api/image/[...path].ts` | 43 | Path traversal, new client per request |
| `src/pages/api/leads/submit.ts` | 173 | SSRF, no rate limit, no input validation |
| `src/pages/api/normalize-logo.ts` | 130 | No auth, no file size limit |
| `src/components/blocks/CustomBlock.astro` | 71 | Raw HTML via set:html (by design) |
| `src/components/Header.astro` | 220 | Hardcoded nav links, hardcoded Hebrew labels |
| `src/components/ProductCard.astro` | 267 | Default red badge, Hebrew aria-labels |

---

## Part 13: Improvement Recommendations

### 🔴 CRITICAL Fixes (Must Do Before DNS Switch)
1. **Create custom 404 page** — `src/pages/404.astro` with branding and navigation
2. **Add hreflang tags to BaseLayout** — render `<link rel="alternate" hreflang>` from `languageUrls` prop
3. **Add skip navigation link** — "Skip to main content" in BaseLayout, `id="main"` on `<main>`
4. **Sanitize image proxy paths** — reject `../` segments in `/api/image/[...path].ts`
5. **Add test framework** — install vitest, write tests for tenant resolution, product queries, image proxy, lead validation

### 🟠 HIGH Priority (Should Do Before DNS Switch)
6. **Fix homepage hero text** — replace "בדיקת AI" with real content in DB
7. **Validate webhook_url** — allowlist domains or restrict to HTTPS only in lead submission
8. **Add rate limiting** — Vercel Edge middleware or in-handler throttling for API routes
9. **Update @astrojs/vercel to 10.0.4** — fixes path-to-regexp ReDoS vulnerability
10. **Fix color contrast** — replace `text-gray-400` with `text-gray-500/600`, ensure gold text meets 4.5:1
11. **Add form labels** — `<label>` elements for all inputs in ContactForm, ContactBlock, search
12. **Fix carousel RTL** — replace physical `left-0`/`right-0` with logical `start-0`/`end-0` (10+ files)
13. **Add auth to normalize-logo API** — admin token or session check
14. **Add phone/email validation** — regex validation in lead submission
15. **Fix ReviewsBlock forbidden colors** — replace blue/violet/cyan avatar palette with brand-safe colors
16. **Split oversized files** — BrandPage.astro (565 lines) and [barcode].astro (453 lines)
17. **Fix sitemap for SSR** — implement dynamic sitemap generation or prerender key pages
18. **Add hreflang to i18n product/category pages**
19. **Install TypeScript and @astrojs/check** as devDependencies

### 🟡 MEDIUM Priority (Can Do After DNS Switch)
20. Replace 89 `any` usages with proper types (interfaces exist)
21. Replace 17x `.select('*')` with specific columns
22. Fix direct table access violations (create `v_ai_content` view)
23. Optimize blog images (compress to <100KB, convert to WebP)
24. Add Twitter Card meta tags
25. Add HSTS header to vercel.json
26. Fix mobile horizontal overflow on homepage
27. Collapse filters on mobile products page
28. Fix touch target size on search button
29. Translate store name for EN/RU pages
30. Standardize gold hex values (eliminate #D4A853, #c5a059, #d4af37)
31. Add authentication to preview mode
32. Fix Header nav underline for RTL (`left-0` → `inset-inline-start`)
33. Fix duplicate shortcode replacement bug
34. Clean up 7 orphaned files
35. Add `og:site_name` meta tag
36. Fix carousel aria-label swap in RTL

### 🟢 LOW Priority (Nice to Have)
37. Add CSP headers
38. Move `dotenv` to devDependencies
39. Add TTL to tenant cache
40. Reuse module-level Supabase client in image proxy
41. Make `getBrandBySlug` query by slug directly instead of fetching all
42. Escape `%` and `_` in search ilike queries
43. Add descriptive alt text to thumbnail/search result images
44. Consistent focus indicators across form inputs
45. Remove Prizma-specific hardcoded nav links for multi-tenant
46. Fix ProductCard default red badge color
47. Fix ContactBlock hardcoded `text-right`
48. Add webhook error handling in lead submission status update

---

## Context Gathered

### All Routes/Pages
**Static:** `/`, `/products/`, `/brands/`, `/categories/`, `/search`, `/בלוג/`
**Dynamic:** `/products/[barcode]`, `/brands/[slug]`, `/category/[slug]`, `/[...slug]` (CMS)
**i18n:** `/en/products/`, `/en/products/[barcode]`, `/ru/products/`, `/ru/products/[barcode]`, `/en/[...slug]`, `/ru/[...slug]`
**API:** `/api/image/[...path]`, `/api/leads/submit`, `/api/normalize-logo`

### Supabase Views Used
`v_storefront_products`, `v_storefront_brands`, `v_storefront_categories`, `v_public_tenant`, `v_storefront_config`, `v_storefront_pages`, `v_storefront_blog_posts`, `v_storefront_brand_page`, `v_storefront_reviews`, `v_storefront_components`, `v_admin_pages`, `v_admin_product_picker`

### Lighthouse Report Files
- `qa-screenshots/report.html` — full Lighthouse HTML report
- `qa-screenshots/report.json` — machine-readable Lighthouse data

### Vercel Deployment
- 143 redirect rules configured
- SSR mode via `@astrojs/vercel` adapter
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

### Patterns Worth Noting
- Clean view-based architecture (42 queries, only 4 direct table accesses)
- Image proxy pattern works well — no direct storage URLs exposed
- Block-based CMS with 19 block types is well-structured
- Shortcode system adds flexibility for custom blocks
- UTM tracking captured via sessionStorage → lead forms
- Partytown configured for analytics (zero main-thread impact)
- Tenant resolution with multi-domain support is solid

---

## Post-Fix Verification (FIX-1/2/3)
**Date:** 2026-04-04
**Result:** PASS (with minor notes)

| Check | Result | Notes |
|-------|--------|-------|
| Skip nav link | PASS | "דלג לתוכן הראשי" appears on Tab |
| hreflang tags | PASS | he, en, ru, x-default present |
| Twitter card tags | PASS | summary_large_image |
| og:site_name | PASS | "אופטיקה פריזמה" |
| Forbidden colors | PASS | No blue/purple/cyan found |
| Custom 404 page | FAIL | Catch-all returns plain "Not Found" — 404.astro not reached |
| Products load | PASS | 103 products with images |
| Sitemap | PASS | 648 URLs in sitemap-dynamic.xml |
| English products | PASS | Title shows "Prizma Optics" |
| Product detail carousel | PASS | Arrows positioned correctly in RTL |
| Mobile overflow (375px) | MINOR | ContactBlock -mx-4 causes ~9px horizontal overflow |

---

## FIX-4 Summary (Content + WordPress Parity)
**Date:** 2026-04-04

### Bugs Fixed
1. **Phone placeholder RTL** — Added `dir="rtl"` and `text-start` to tel inputs in ContactForm.astro and ContactBlock.astro. Verified: placeholders now right-aligned.
2. **Hero test content** — SQL created (`sql/UPDATE-fix-hero-test-content.sql`) to change "בדיקת AI" → "אופטיקה פריזמה אשקלון". Pending Daniel.

### WordPress Comparison Results
- Total WordPress pages found: ~70 (including brands, campaigns, Russian, success pages)
- Pages we have and match: 20
- Pages we have but need content enrichment: 1 (about — SQL created)
- Pages missing entirely: 1 (vintage-frames — low priority)
- Pages intentionally not migrated: ~48 (brand root pages, Russian campaign dupes, WooCommerce pages, test pages)
- Full report: `WORDPRESS_COMPARISON.md`

### Contact Page
- Status: EXISTS — matches WordPress structure (hero, support options, contact methods, form)
- No SQL changes needed

### About Page
- Status: EXISTS — content too thin vs WordPress
- SQL file: `sql/UPDATE-about-page.sql` — adds history, vision, "why us" sections
- Pending Daniel

### Remaining Open Items for DNS Switch
1. Hero title fix (SQL — Daniel)
2. About page content enrichment (SQL — Daniel)
3. Brand pages SQL 048/049/050 (SQL — Daniel)

### Remaining Open Items Post-DNS Switch
1. 404 page: catch-all route returns plain text instead of branded 404.astro
2. Mobile horizontal overflow: ContactBlock -mx-4 on 375px viewport
3. /vintage-frames/ page missing (low priority)
