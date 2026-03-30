# Module 3 — Storefront — Changelog

---

## Phase 1 — Astro Setup + Infrastructure
**Date:** 2026-03-29
**Tag:** `v3.1-phase1-astro-setup`

### Commits
- `50c3ad4` — Step 1: Astro + TypeScript + Tailwind + Supabase + Vercel init
- `08fc710` — Step 2: Project structure, i18n, Vercel config
- `d60b518` — Steps 3-4: Supabase client + tenant resolution + product queries
- `6404eb2` — Steps 5-6: Base layout (Header/Footer/RTL) + Homepage skeleton
- `d6b4710` — Phase 1 complete: documentation, SQL prep, tag

### What was built
- Astro 6 project with TypeScript strict, Tailwind CSS 4, Vercel adapter
- Supabase read-only client (null-safe for builds without env)
- Tenant resolution: slug → tenants + storefront_config → theme CSS injection
- i18n: Hebrew (RTL), English, Russian with t() helper
- Base layout: sticky header, footer, responsive, OG tags
- Homepage: Hero banner, FeaturedProducts grid, CategoryGrid
- SQL seed files: storefront_config + product Views (saved, not executed)

---

## Phase 2 — Product Catalog
**Date:** 2026-03-29
**Tag:** `v3.2-phase2-product-catalog`

### Commits
- `afb1c77` — Steps 1-3: SQL migrations, hybrid mode, enhanced products.ts
- `4da7b0e` — Steps 4-6: Product listing, product detail, category pages
- `85ec92c` — Steps 7-9: SearchBar, i18n, build fix, documentation
- `01e970e` — Phase 2 completion: brands pages, category pages, search, ghost overlay, Schema.org JSON-LD
- `efc2e89` — Phase 2: update SESSION_CONTEXT

### What was built
- Product listing page (/products/) with brand/category filters, sort, pagination, search
- Product detail page (/products/[barcode]) with image gallery, specs, WhatsApp CTA
- Category listing (/categories/) and per-category pages (/category/[slug]) with brand filter
- Brand listing (/brands/) and per-brand pages (/brands/[slug]) with pagination
- Search page (/search) with noindex
- SearchBar component with real-time debounced Supabase queries
- Ghost overlay for out-of-stock products (ProductCard + detail page)
- Schema.org JSON-LD: Product + BreadcrumbList structured data
- SQL files: ALTER TABLE for storefront columns, updated Views with search_text

---

## Phase 2B — Bug Fixes & Infrastructure
**Date:** 2026-03-30

### Commits
- `a34a9f3` — fix: change output to server for SSR pages
- `c7ba273` — fix: use v_public_tenant view for secure tenant resolution
- `4ae10e0` — fix: corrected v_storefront_products view based on actual schema
- `bd47a74` — fix: update products.ts to match new View columns
- `fa8f236` — fix: discount price display + broken images
- `fb2c5ed` — fix: image carousel with lightbox popup on product detail
- `1463e68` — feat: secure image proxy API route
- `8b2f1d2` — fix: image proxy bucket name (frame-images)
- `17f1cc7` — fix: white background for product images
- `2ccd380` — docs: add known issues and learnings to CLAUDE.md
- `62b0aa1` — docs: complete CLAUDE.md with project rules + structure

### What was fixed

**Vercel 404 on dynamic pages**
- Root cause: `output: 'static'` doesn't support `prerender = false` in Astro 6
- Fix: Changed to `output: 'server'` in astro.config.mjs (`a34a9f3`)

**Tenant resolution security**
- Root cause: Querying `tenants` table directly exposed internal columns
- Fix: Switch to `v_public_tenant` View, remove unused fields (phone kept as null) (`c7ba273`)

**Product View mismatch**
- Root cause: View used `storefront_status`/`storefront_price` columns, but actual ERP schema uses `brands.default_sync` + `sell_price`/`sell_discount`
- Fix: New SQL view 005 with correct logic (`4ae10e0`), TypeScript interface update (`bd47a74`)

**Discount pricing**
- Root cause: `sell_discount` is a fraction (0.10 = 10%), not a dollar amount
- Fix: `finalPrice = sell_price * (1 - sell_discount)`, show original + discounted prices (`fa8f236`)

**Broken images**
- Root cause: Images could be objects `{url, sort_order}` not just strings
- Fix: Defensive extraction in all components (`fa8f236`)

**Image carousel + lightbox**
- Added: Arrow navigation, thumbnail strip, click-to-zoom lightbox with keyboard nav (`fb2c5ed`)

**Image proxy**
- Added: `/api/image/[...path].ts` route with service_role signed URLs (`1463e68`)
- Fix: Bucket name was `inventory-images`, should be `frame-images` (`8b2f1d2`)

**Visual polish**
- Fix: `bg-gray-50` → `bg-white` for transparent product images (`17f1cc7`)

**SearchBar tenant query**
- Fix: Client-side search now queries `v_public_tenant` instead of `tenants` table (`c7ba273`)
