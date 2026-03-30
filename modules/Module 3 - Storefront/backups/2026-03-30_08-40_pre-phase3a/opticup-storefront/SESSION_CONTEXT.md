# Module 3 — Storefront — Session Context

## Current Phase: Phase 2B — Bug Fixes & Infrastructure
## Status: ✅ Complete
## Date: 2026-03-30

---

## Phase Summary

### Phase 1 — Astro Setup + Infrastructure ✅
**Tag:** `v3.1-phase1-astro-setup`

| Step | Status | Description | Commit |
|------|--------|-------------|--------|
| 1 | ✅ | Astro + TypeScript + Tailwind + Supabase + Vercel init | `50c3ad4` |
| 2 | ✅ | Project structure, i18n (HE/EN/RU), Vercel config | `08fc710` |
| 3 | ✅ | Supabase read-only client (null-safe for builds) | `d60b518` |
| 4 | ✅ | Tenant resolution (slug → tenants + storefront_config) | `d60b518` |
| 5 | ✅ | Base layout: Header (sticky, responsive, lang switch), Footer | `6404eb2` |
| 6 | ✅ | Homepage skeleton: Hero + FeaturedProducts + CategoryGrid | `6404eb2` |
| 7 | ✅ | SQL seed files (storefront_config + Views) | `d6b4710` |
| 8 | ✅ | Documentation + final commit + tag | `d6b4710` |

### Phase 2 — Product Catalog ✅
**Tag:** `v3.2-phase2-product-catalog`

| Step | Status | Description | Commit |
|------|--------|-------------|--------|
| 1 | ✅ | SQL migrations (inventory columns + updated views) | `afb1c77` |
| 2 | ✅ | Astro config: static mode with per-page SSR | `afb1c77` |
| 3 | ✅ | Enhanced products.ts + brands.ts (9 query functions) | `afb1c77` |
| 4 | ✅ | Product listing page (/products/) — filters, sort, pagination | `4da7b0e` |
| 5 | ✅ | Product detail page (/products/[barcode]) — gallery, specs, CTA | `4da7b0e` |
| 6 | ✅ | Category listing + per-category pages | `4da7b0e` |
| 7 | ✅ | Brands listing + per-brand pages | `01e970e` |
| 8 | ✅ | Search page + SearchBar component | `85ec92c` |
| 9 | ✅ | Ghost overlay for out-of-stock products | `01e970e` |
| 10 | ✅ | Schema.org JSON-LD (Product + BreadcrumbList) | `01e970e` |
| 11 | ✅ | Documentation + tag | `efc2e89` |

### Phase 2B — Bug Fixes & Infrastructure ✅ (2026-03-30)

| Step | Status | Description | Commit |
|------|--------|-------------|--------|
| 1 | ✅ | Fix: change output from 'static' to 'server' (Vercel 404 fix) | `a34a9f3` |
| 2 | ✅ | Fix: use v_public_tenant view for secure tenant resolution | `c7ba273` |
| 3 | ✅ | Fix: corrected v_storefront_products SQL view (brands.default_sync logic) | `4ae10e0` |
| 4 | ✅ | Fix: update products.ts to match new View columns (sell_price, sell_discount, default_sync) | `bd47a74` |
| 5 | ✅ | Fix: discount price display (original + final) + defensive image extraction | `fa8f236` |
| 6 | ✅ | Fix: image carousel with lightbox popup on product detail | `fb2c5ed` |
| 7 | ✅ | Feat: secure image proxy API route (/api/image/) | `1463e68` |
| 8 | ✅ | Fix: image proxy bucket name (frame-images, not inventory-images) | `8b2f1d2` |
| 9 | ✅ | Fix: white background for product images (transparent bg support) | `17f1cc7` |
| 10 | ✅ | Docs: CLAUDE.md with full project rules + known issues | `62b0aa1` |

---

## Current File Structure

### src/lib/ — Data layer (4 files, 330 lines)
| File | Lines | Description |
|------|-------|-------------|
| `supabase.ts` | 19 | Supabase client (anon key, null-safe) |
| `tenant.ts` | 81 | Tenant resolution via v_public_tenant + theme CSS |
| `products.ts` | 195 | Product/category/brand queries via Views (6 functions) |
| `brands.ts` | 65 | Brand queries: getBrands, getBrandBySlug, brandSlug |

### src/components/ — UI components (7 files, 588 lines)
| File | Lines | Description |
|------|-------|-------------|
| `Header.astro` | 157 | Sticky header, nav, search, language switcher, phone CTA |
| `SearchBar.astro` | 145 | Real-time search with debounced Supabase queries |
| `ProductCard.astro` | 88 | Product card: image, price/discount, ghost overlay |
| `CategoryGrid.astro` | 57 | Category cards grid (homepage) |
| `FeaturedProducts.astro` | 58 | Featured products grid (homepage) |
| `Footer.astro` | 53 | Footer with tenant branding |
| `HeroSection.astro` | 40 | Homepage hero banner |

### src/pages/ — Routes (10 files, 1,490 lines)
| File | Lines | Description |
|------|-------|-------------|
| `products/[barcode].astro` | 410 | Product detail: carousel, lightbox, specs, CTA, Schema.org (SSR) |
| `products/index.astro` | 294 | Product listing: filters, sort, pagination (SSR) |
| `category/[slug].astro` | 196 | Per-category products with brand filter (SSR) |
| `brands/[slug].astro` | 147 | Brand products page with pagination (SSR) |
| `search.astro` | 106 | Dedicated search page with noindex (SSR) |
| `categories/index.astro` | 91 | Category listing (SSR) |
| `index.astro` | 90 | Homepage (prerendered) |
| `brands/index.astro` | 76 | All brands grid (SSR) |
| `api/image/[...path].ts` | 37 | Image proxy: signed URLs via service_role |

### src/layouts/, src/i18n/, src/styles/ (6 files, 397 lines)
| File | Lines | Description |
|------|-------|-------------|
| `layouts/BaseLayout.astro` | 75 | Base layout: OG, fonts, theme vars, noindex support |
| `i18n/index.ts` | 36 | i18n utility: t(), getDir(), getLangName() |
| `i18n/he.json` | 81 | Hebrew translations |
| `i18n/en.json` | 81 | English translations |
| `i18n/ru.json` | 81 | Russian translations |
| `styles/global.css` | 43 | Global styles + Tailwind imports |

**Total: 27 source files, 2,805 lines**

---

## SQL Files

| File | Status | Description |
|------|--------|-------------|
| `001-seed-storefront-config.sql` | ✅ Run | Prizma storefront_config seed data |
| `002-v-storefront-products.sql` | ⚠️ Superseded | Original views (Phase 1) — replaced by 005 |
| `003-alter-inventory-storefront-columns.sql` | ✅ Run | ADD COLUMN: storefront_status, price, description |
| `004-v-storefront-products-v2.sql` | ⚠️ Superseded | Updated views v2 — replaced by 005 |
| `005-fix-storefront-view.sql` | ✅ Run | Current views: brands.default_sync logic, proper image URLs |

**Note:** The live Supabase view was further updated (manually by Daniel) to output image URLs as `{url: '/api/image/' || storage_path, sort_order}` objects, not just `json_agg(img.url)`. The `005` file in repo does NOT match the live view exactly.

---

## Vercel Environment Variables

| Variable | Status | Notes |
|----------|--------|-------|
| `PUBLIC_SUPABASE_URL` | ✅ Set | `https://tsxrrxzmdxaenlvocyit.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | Anon key for read-only View access |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | Server-side only, for image proxy |
| `PUBLIC_DEFAULT_TENANT` | ✅ Set | `prizma` |

---

## Decisions Made

1. **output: 'server'** — Astro 6 removed 'hybrid'. Using 'server' with Vercel adapter; all pages SSR by default.
2. **v_public_tenant** — secure View for tenant resolution (never query tenants table directly).
3. **brands.default_sync** — controls visibility instead of per-item storefront_status column.
4. **Image proxy** — `/api/image/` route with service_role key creates signed URLs from private bucket.
5. **Bucket name** — `frame-images` (not `inventory-images`).
6. **Discount display** — `sell_discount` is a fraction (0-1). Final price = `sell_price * (1 - sell_discount)`.
7. **Image carousel** — pure CSS + vanilla JS, no libraries. Lightbox popup with keyboard nav.

---

## What's Next

### Phase 3 — SEO Migration
- WordPress URL mapping (301 redirects for all existing URLs)
- Blog/posts migration from WordPress
- sitemap.xml generation
- robots.txt
- og:image per product
- Canonical URLs
- Google Search Console verification

### Phase 4 — WhatsApp Integration & Landing Pages
- WhatsApp Business API integration
- Custom landing pages per campaign
- Contact form

### Phase 5 — Multi-tenant & Performance
- Multiple tenant support (theme switching)
- Image optimization (srcset, lazy loading, blur placeholders)
- Edge caching strategy
- Analytics integration

---

## Known Issues

1. **`products/[barcode].astro` is 410 lines** — exceeds 350-line target. Should split carousel/lightbox into a separate component.
2. **SQL file 005 doesn't match live view** — live Supabase view was manually updated to include `/api/image/` prefix in URLs. The repo SQL file should be updated to match.
3. **No .env file in repo** — only `.env.example`. Local dev requires manual setup.
4. **SearchBar queries v_public_tenant** — client-side code creates its own Supabase client (not ideal, but functional).
