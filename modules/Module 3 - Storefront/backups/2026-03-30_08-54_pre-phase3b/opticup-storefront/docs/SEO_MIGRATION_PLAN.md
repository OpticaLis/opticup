# SEO Migration Plan — WordPress to Astro

> **Single source of truth for all SEO decisions.**
> Any developer reading this should understand every migration decision without asking questions.

---

## 1. Overview

**From:** WordPress + WooCommerce at `prizma-optic.co.il` (+ subdomains `en.`, `ru.`)
**To:** Astro 6 + Vercel at `opticup-storefront.vercel.app` (later: `prizma-optic.co.il`)

**Scope:**
- 735 product pages → 301 redirect to `/products/[barcode]/`
- 143 blog posts (58 HE + 43 EN + 42 RU) → same URLs in Astro
- 7 landing pages → same URLs in Astro
- 124 WordPress pages → classify (keep / redirect / ignore)
- 12 product categories → 301 redirect to `/category/[slug]/`
- 1,175 product tags → 301 redirect to `/products/` (thin content)
- 3 homepages (HE/EN/RU) → Astro homepage

**Zero SEO loss goal:** every indexed WordPress URL gets a 301 redirect or a live page.

---

## 2. URL Structure Mapping

| WordPress URL pattern | New Astro URL | Method | Count |
|----------------------|---------------|--------|-------|
| `/product/[brand-model]/` | `/products/[barcode]/` | 301 redirect | 733 published |
| `/product-category/[slug]/` | `/category/[slug]/` | 301 redirect | 12 |
| `/product-tag/[tag]/` | `/products/` | 301 wildcard redirect | 1,175 |
| `/shop/` and `/shop/*` | `/products/` | 301 redirect | ~1 |
| `/[hebrew-slug]/` (blog posts) | `/[hebrew-slug]/` | **Keep same URL** (root-level) | 58 |
| `/en/[slug]/` (EN blog posts) | `/en/[slug]/` | **Keep same URL** | 43 |
| `/ru/[slug]/` (RU blog posts) | `/ru/[slug]/` | **Keep same URL** | 42 |
| `/בלוג/` | `/בלוג/` | **Keep same URL** (blog index) | 1 |
| `/blog/` | 301 -> `/בלוג/` | Redirect EN alias to HE | 1 |
| `/[hebrew-slug]/` (landing pages) | `/[hebrew-slug]/` | **Keep same URL** | ~5 HE |
| `/multi/`, `/lab/`, `/multifocal-guide/` | Same URLs | **Keep same URL** | ~3 |
| WooCommerce (cart, checkout, account, wishlist) | `/` | 301 redirect to homepage | ~8 |
| About, Contact, Privacy, Accessibility | New pages (similar URLs) | Build new | 4 x 3 langs |
| `en.prizma-optic.co.il/[slug]/` | `/en/[slug]/` | 301 (after DNS) | 68 |
| `ru.prizma-optic.co.il/[slug]/` | `/ru/[slug]/` | 301 (after DNS) | 67 |
| Drafts, duplicates, internal pages | -- | Ignore (no public URL) | varies |

### Examples

| WordPress URL | Astro destination |
|---|---|
| `/product/baleciaga-bb0166s/` | `/products/0100123/` (matched barcode) |
| `/product/gucci-gg0968o/` | `/products/0100456/` (matched barcode) |
| `/product-category/%d7%9e%d7%a9%d7%a7%d7%a4%d7%99-%d7%a9%d7%9e%d7%a9/` | `/category/sunglasses/` |
| `/product-tag/gg0968o/` | `/products/` |
| `/משקפי-פריזמה/` | `/משקפי-פריזמה/` (blog post, same URL) |
| `/multi/` | `/multi/` (landing page, same URL) |
| `/cart/` | `/` (homepage) |

---

## 3. Product Matching Logic

**Goal:** Match 735 WordPress product URLs to inventory barcodes for 301 redirects.

**Algorithm:**
1. Extract brand + model from WordPress product title (e.g., "BB0166S" from slug `baleciaga-bb0166s`)
2. Normalize: lowercase, remove special chars, trim whitespace
3. Match against Supabase `v_storefront_products`:
   - **Exact match:** `model` matches WordPress title → `/products/[barcode]/`
   - **Fuzzy match:** model contains search term → `/products/[barcode]/`
   - **Brand-only match:** brand identified from slug → `/brands/[brand-slug]/`
   - **No match:** → `/products/` (general catalog)

**Note:** WordPress product titles are typically just the model number (e.g., "BB0166S"), while slugs contain brand name (e.g., `baleciaga-bb0166s`). The model number is the primary matching key.

**Unmatched products:** Products not in inventory (discontinued, out of stock permanently) redirect to brand page if brand is identifiable, else to `/products/`.

---

## 4. Blog Migration Plan

### URL Structure
- **HE posts:** Root-level — `/[hebrew-slug]/` (preserves WordPress URL exactly)
- **EN posts:** `/en/[slug]/` (path-based, subdomain → path migration)
- **RU posts:** `/ru/[slug]/` (path-based, subdomain → path migration)
- **HE blog index:** `/בלוג/` (preserves WordPress URL)
- **EN blog index:** `/en/blog/`
- **RU blog index:** `/ru/blog/`

### Content Handling
- WordPress post content stored as cleaned HTML in `src/data/blog-posts.ts`
- WordPress shortcodes stripped ([caption], [gallery], etc.)
- Internal links rewritten from WordPress URLs to Astro URLs
- WordPress-specific CSS classes removed
- Semantic HTML preserved (h2, h3, p, ul, ol, blockquote, img, a)

### Images
- Blog images downloaded from WordPress to `public/blog/images/`
- Image URLs in content rewritten to local paths
- Featured images stored locally
- Images served from `/blog/images/[filename]` (static, no proxy needed)

### i18n
- Full 3-language support: HE (default), EN, RU
- hreflang tags link translations across languages
- Cross-language links from blog-mapping.json
- Date formatting per locale

---

## 5. Landing Pages Plan

| URL | Title | Language | Content Source |
|-----|-------|----------|---------------|
| `/multifocal-guide/` | משקפי מולטיפוקל: המדריך המלא | HE | WordPress page |
| `/multi/` | מולטיפוקל | HE | WordPress page |
| `/lab/` | מעבדת מסגורים | HE | WordPress page |
| `/brands/` | מותגים | HE | Already exists in Astro |

**Note:** `/brands/` already exists as an Astro route. `/lab/` has EN and RU versions at same URL.
Landing pages use the catch-all route `[...slug].astro` with a dedicated LandingPage template.

---

## 6. Static Pages Plan

| Page | HE URL | EN URL | RU URL |
|------|--------|--------|--------|
| About | `/אודות/` | `/en/about/` | `/ru/about/` |
| Contact | `/צור-קשר/` | `/en/contact/` | `/ru/contact/` |
| Privacy | `/מדיניות-פרטיות/` | `/en/privacy/` | `/ru/privacy/` |
| Accessibility | `/נגישות/` | `/en/accessibility/` | `/ru/accessibility/` |

Content: New pages with tenant data from `v_public_tenant`. Template content for Daniel to customize.

---

## 7. Redirect Strategy

### Priority Order in vercel.json
1. Specific product redirects: `/product/[slug]/` → `/products/[barcode]/` (only for matched products)
2. Category redirects: `/product-category/[slug]/` → `/category/[slug]/`
3. WooCommerce pages: `/cart/`, `/checkout/`, `/my-account/`, `/wishlist/` → `/`
4. Shop redirects: `/shop/` → `/products/`
5. Blog EN alias: `/blog/` → `/בלוג/`
6. **Wildcard catch-alls (at end):**
   - `/product-tag/:path*` → `/products/` (all 1,175 tags)
   - `/product/:path*` → `/products/` (unmatched products fallback)
   - `/shop/:path*` → `/products/`

### Optimization to Stay Under 1,024
- Use wildcards for tags: 1 rule instead of 1,175
- Use wildcard for unmatched product fallback: 1 rule
- Matched products get specific rules (for SEO value preservation)
- Estimated total: ~750 specific + ~10 wildcards = ~760 rules

### What Gets 301
- All product pages (to matched barcode or brand page)
- All product categories
- All product tags (wildcard)
- WooCommerce utility pages
- Shop pages

### What Stays (Same URL)
- Blog posts (all 3 languages)
- Landing pages
- Homepage

### What's Ignored
- Draft pages (never had public URLs)
- Internal/test pages (multisale-backup, supersale-test, etc.)
- Duplicate pages

---

## 8. DNS Switch Plan

**Current state:** WordPress is live at `prizma-optic.co.il`
**Target state:** Astro on Vercel at `prizma-optic.co.il`

### Steps (in order)
1. Phase 3A-3C: Build everything on `opticup-storefront.vercel.app`
2. Daniel reviews all migration results
3. QA on Vercel preview URL
4. Add custom domain to Vercel project
5. Update DNS: point `prizma-optic.co.il` to Vercel
6. Verify all redirects work
7. Submit updated sitemap to Google Search Console
8. Monitor Search Console for crawl errors (2-4 weeks)

### Rollback Plan
- If critical issues found: revert DNS to WordPress hosting
- WordPress stays available as backup until 30 days after switch
- All Astro pages are static/SSR — no database migration risk

---

## 9. Subdomain Migration

**Current:** `en.prizma-optic.co.il` and `ru.prizma-optic.co.il`
**Target:** `prizma-optic.co.il/en/` and `prizma-optic.co.il/ru/`

Subdomain redirects configured in Vercel (domain-level) after DNS switch.
Not handled in vercel.json redirects — requires Vercel domain config.

---

## 10. Known Issues & Edge Cases

1. **WordPress product slugs use brand names differently than inventory** — e.g., `baleciaga-bb0166s` (typo in WP) vs `Balenciaga` in inventory. Fuzzy matching handles this.
2. **Some products are draft status in WordPress** — 2 drafts out of 735. These never had public URLs, safe to ignore.
3. **Hebrew URL encoding** — WordPress uses percent-encoded Hebrew. Astro and Vercel handle both encoded and decoded forms. vercel.json must use percent-encoded form.
4. **`/brands/` landing page vs Astro route** — WordPress has a `/brands/` page, but Astro already has `/brands/` route. No redirect needed — Astro route takes over.
5. **Internal/test pages** — Pages like `multisale-backup`, `supersale-test`, `multi-ariha-2` are internal. Classified as IGNORE — no redirect needed.
6. **WooCommerce pages** — Cart, checkout, account, wishlist all redirect to homepage since we're not building e-commerce.
7. **Product tag pages are thin content** — 1,175 tag pages with ~0 unique content. All redirect to `/products/`.

---

## 11. File Locations

### Source Data (READ-ONLY, in opticup repo)
| File | Description |
|------|-------------|
| `opticup/modules/Module 3 - Storefront/seo-audit/url-inventory.json` | All 1,024 WordPress URLs with metadata |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wc-products.json` | 735 WooCommerce products |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wc-categories.json` | 12 product categories |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wc-tags.json` | 1,175 product tags |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wp-posts-he.json` | 58 Hebrew blog posts |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wp-posts-en.json` | 43 English blog posts |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wp-posts-ru.json` | 42 Russian blog posts |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wp-pages-he.json` | Hebrew pages |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wp-pages-en.json` | English pages |
| `opticup/modules/Module 3 - Storefront/seo-audit/data/wp-pages-ru.json` | Russian pages |

### Generated Outputs (in opticup-storefront repo)
| File | Description |
|------|-------------|
| `scripts/seo/output/product-mapping.json` | WordPress product → barcode mapping |
| `scripts/seo/output/page-classification.json` | All pages classified |
| `scripts/seo/output/blog-mapping.json` | Blog posts with i18n links |
| `scripts/seo/output/blog-images-to-download.json` | Image URLs for download |
| `scripts/seo/output/tag-redirects.json` | Tag redirect rules |
| `scripts/seo/output/category-redirects.json` | Category redirect rules |
| `scripts/seo/output/migration-validation-report.md` | Coverage report |

---

## 12. Timeline

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | SEO Site Audit (1,024 URLs inventoried) | Complete |
| Phase 3A | Data Prep — product mapping, redirects, vercel.json | In Progress |
| Phase 3B | Blog Migration — posts, images, catch-all route, hreflang | Pending |
| Phase 3C | Landing Pages + SEO Infrastructure — sitemap, schema, robots.txt | Pending |
| QA | Daniel reviews migration results | Pending |
| DNS Switch | Point prizma-optic.co.il to Vercel | Pending |
| Monitoring | Watch Search Console for 2-4 weeks | Pending |
