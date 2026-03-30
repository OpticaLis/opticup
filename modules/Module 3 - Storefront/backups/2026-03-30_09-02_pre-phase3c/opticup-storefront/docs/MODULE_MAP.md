# Module 3 — Storefront — Module Map

> Single source of truth for all files, functions, and globals in this module.

---

## 1. File Registry

### src/lib/ — Data Layer

| File | Lines | Owner | Description |
|------|-------|-------|-------------|
| `supabase.ts` | 19 | Core | Supabase client init (anon key, null-safe for builds) |
| `tenant.ts` | 81 | Core | resolveTenant via v_public_tenant, getThemeCSS |
| `products.ts` | 195 | Products | Product/category/brand queries via Views |
| `brands.ts` | 65 | Brands | Brand listing and per-brand queries |

### src/components/ — UI Components

| File | Lines | Owner | Description |
|------|-------|-------|-------------|
| `Header.astro` | 157 | Layout | Sticky header, nav links (products, brands, categories), search, language switcher, phone CTA |
| `SearchBar.astro` | 145 | Search | Client-side real-time search with debounced Supabase queries, result dropdown |
| `ProductCard.astro` | 88 | Products | Product card: image, brand, model, color, price/discount, ghost overlay |
| `CategoryGrid.astro` | 57 | Categories | Category cards grid for homepage |
| `FeaturedProducts.astro` | 58 | Products | Featured products grid for homepage |
| `Footer.astro` | 53 | Layout | Footer with tenant name |
| `HeroSection.astro` | 40 | Layout | Homepage hero banner with CTA |

### src/pages/ — Routes

| File | Lines | Render | Description |
|------|-------|--------|-------------|
| `index.astro` | 90 | Static | Homepage: hero, featured products, categories, top brands |
| `products/index.astro` | 294 | SSR | Product listing: brand/category filters, sort, pagination, search |
| `products/[barcode].astro` | 410 | SSR | Product detail: image carousel, lightbox, specs, pricing, WhatsApp CTA, Schema.org |
| `brands/index.astro` | 76 | SSR | All brands grid page |
| `brands/[slug].astro` | 147 | SSR | Per-brand products with pagination |
| `categories/index.astro` | 91 | SSR | Category listing page |
| `category/[slug].astro` | 196 | SSR | Per-category products with brand filter sidebar |
| `search.astro` | 106 | SSR | Dedicated search page (noindex) |
| `api/image/[...path].ts` | 37 | SSR | Image proxy: validates path starts with 'frames/', creates signed URL via service_role |

### src/layouts/

| File | Lines | Description |
|------|-------|-------------|
| `BaseLayout.astro` | 75 | HTML shell: meta/OG tags, fonts, theme CSS vars, noindex support |

### src/i18n/

| File | Lines | Description |
|------|-------|-------------|
| `index.ts` | 36 | i18n utility: t(locale, key), getDir(locale), getLangName(locale) |
| `he.json` | 81 | Hebrew translations (default) |
| `en.json` | 81 | English translations |
| `ru.json` | 81 | Russian translations |

### src/styles/

| File | Lines | Description |
|------|-------|-------------|
| `global.css` | 43 | Tailwind imports + global styles |

### sql/ — Database Migrations

| File | Lines | Status | Description |
|------|-------|--------|-------------|
| `001-seed-storefront-config.sql` | 35 | ✅ Run | Prizma storefront_config seed data |
| `002-v-storefront-products.sql` | 63 | Superseded | Original Views (Phase 1) |
| `003-alter-inventory-storefront-columns.sql` | 34 | ✅ Run | ADD COLUMN: storefront_status, price, description |
| `004-v-storefront-products-v2.sql` | 76 | Superseded | Updated Views with search_text |
| `005-fix-storefront-view.sql` | 96 | ✅ Run | Current Views: brands.default_sync logic |

---

## 2. Function Registry

### src/lib/tenant.ts

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `resolveTenant` | `slug?: string` | `Promise<TenantConfig \| null>` | Query v_public_tenant by slug, cache result |
| `getThemeCSS` | `theme: Record<string, string>` | `string` | Convert theme object to CSS variable string |

### src/lib/products.ts

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getStorefrontProducts` | `tenantId, options?` | `Promise<ProductListResult>` | Paginated product query with brand/category/search filters |
| `getProductByBarcode` | `tenantId, barcode` | `Promise<StorefrontProduct \| null>` | Single product lookup |
| `getRelatedProducts` | `tenantId, product, limit?` | `Promise<StorefrontProduct[]>` | Related products (same brand) |
| `getStorefrontCategories` | `tenantId` | `Promise<{name, count}[]>` | Category list with counts |
| `getStorefrontBrands` | `tenantId, category?` | `Promise<StorefrontBrand[]>` | Brand list with counts, optional category filter |

### src/lib/brands.ts

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getBrands` | `tenantId` | `Promise<Brand[]>` | All brands with product counts |
| `getBrandBySlug` | `tenantId, slug` | `Promise<Brand \| null>` | Single brand by URL slug |
| `brandSlug` | `name: string` | `string` | Convert brand name to URL-safe slug |

### src/i18n/index.ts

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `t` | `locale: Locale, key: string` | `string` | Get translation by key |
| `getDir` | `locale: Locale` | `'rtl' \| 'ltr'` | Get text direction |
| `getLangName` | `locale: Locale` | `string` | Get language display name |

---

## 3. Interfaces

### TenantConfig (src/lib/tenant.ts)

```typescript
interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  storefront: {
    enabled: boolean;
    theme: Record<string, string>;
    logo_url: string | null;
    categories: string[];
    seo: { title?, description?, keywords?, og_image? };
  };
}
```

### StorefrontProduct (src/lib/products.ts)

```typescript
interface StorefrontProduct {
  id: string;
  barcode: string;
  brand_name: string;
  brand_id: string | null;
  brand_type: string | null;
  model: string;
  color: string | null;
  size: string | null;
  quantity: number;
  product_type: string | null;
  sell_price: number | null;
  sell_discount: number | null;
  default_sync: 'full' | 'display';
  images: string[];
  search_text?: string;
}
```

---

## 4. Supabase Views Used

| View | Queried by | Key columns |
|------|-----------|-------------|
| `v_public_tenant` | tenant.ts, SearchBar.astro | id, slug, name, enabled, theme, logo_url, categories, seo |
| `v_storefront_products` | products.ts | id, tenant_id, barcode, brand_name, brand_id, model, color, size, quantity, product_type, sell_price, sell_discount, default_sync, images, search_text |
| `v_storefront_categories` | products.ts | tenant_id, name, count |
| `v_storefront_brands` | products.ts, brands.ts | tenant_id, brand_id, brand_name, product_type, count |

---

## 5. External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `astro` | ^6.1.1 | Framework |
| `@astrojs/vercel` | ^9.x | Vercel adapter |
| `@supabase/supabase-js` | ^2.x | Supabase client |
| `@tailwindcss/vite` | ^4.x | Tailwind CSS 4 |
