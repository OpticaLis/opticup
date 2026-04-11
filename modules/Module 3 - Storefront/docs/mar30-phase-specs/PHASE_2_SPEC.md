# Phase 2 — Product Catalog + ERP Integration

> **Module:** 3 — Storefront
> **Status:** ⬜ Not started
> **Execution mode:** AUTONOMOUS
> **Estimated time:** 2-3 sessions
> **Risk level:** LOW — storefront repo only, SQL saved to files
> **Machine:** 🖥️ Windows
> **Repo:** `opticup-storefront` at `C:\Users\User\opticup-storefront`

---

## Goal

Products from the ERP inventory appear on the storefront website automatically. Product pages, category pages, brand pages, and search — all reading from Supabase Views.

**End result:**
- `/products/` — grid of all visible products with filters
- `/products/[slug]/` — product detail page (images, specs, WhatsApp CTA)
- `/brands/` — all brands with logos and product counts
- `/brands/[slug]/` — all products from a specific brand
- `/category/[slug]/` — products filtered by category (משקפי שמש, מסגרות ראייה, עדשות מגע)
- Search — real-time search by brand + model
- Out-of-stock products shown as "ghosted" (blurred + "עדכנו אותי כשיחזור")

---

## Safety Rules — NON-NEGOTIABLE

1. Work ONLY in `C:\Users\User\opticup-storefront\`. NEVER touch `C:\Users\User\opticup\`.
2. NEVER commit `.env` files to git.
3. NEVER run SQL against Supabase — save SQL to files only. Daniel runs them manually.
4. NEVER connect custom domain. WordPress stays live.
5. All Supabase queries go through **Views only** — never `FROM inventory` directly.
6. Before EVERY commit: verify `.env` NOT in `git status`.

---

## Prerequisites

- [x] Phase 1 complete — Astro site deployed on Vercel
- [ ] Daniel runs `sql/001-seed-storefront-config.sql` in Supabase (from Phase 1)
- [ ] Daniel runs Phase 2 SQL migrations (created in Step 1 of this phase)

**Note:** The storefront works without Supabase data (shows placeholder content). SQL can be run during or after Phase 2 — the pages will populate once data is available.

---

## Architecture

```
ERP (opticup repo)                    Storefront (opticup-storefront repo)
┌──────────────┐                      ┌──────────────────────┐
│ inventory    │                      │ /products/           │
│ brands       │──► Supabase ──►      │ /products/[slug]/    │
│ images       │    Views             │ /brands/             │
│ tenants      │                      │ /brands/[slug]/      │
└──────────────┘                      │ /category/[slug]/    │
                                      └──────────────────────┘
```

**Data flow:** ERP writes to tables → Views expose filtered data → Storefront reads Views

**Storefront NEVER writes to the database.** Read-only, anon key.

---

## SQL Migrations (saved to files — Daniel runs manually)

### Migration 001: Add storefront columns to inventory

```sql
-- File: sql/003-inventory-storefront-columns.sql
-- Run in: Supabase Dashboard > SQL Editor
-- SAFETY: ALTER TABLE ADD COLUMN only — no drops, no deletes

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storefront_status TEXT DEFAULT 'hidden'
  CHECK (storefront_status IN ('hidden', 'catalog', 'shop'));
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storefront_price DECIMAL(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storefront_description TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storefront_slug TEXT;

-- Generate slugs from brand+model for existing products
UPDATE inventory
SET storefront_slug = LOWER(REPLACE(REPLACE(
  COALESCE(brand_name, '') || '-' || COALESCE(model, '') || '-' || COALESCE(barcode, ''),
  ' ', '-'), '/', '-'))
WHERE storefront_slug IS NULL AND is_deleted = false;

-- Unique slug per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_storefront_slug
  ON inventory (tenant_id, storefront_slug) WHERE is_deleted = false;
```

### Migration 002: Create storefront Views

```sql
-- File: sql/004-storefront-views.sql
-- Run in: Supabase Dashboard > SQL Editor

-- View: Products visible on storefront
CREATE OR REPLACE VIEW v_storefront_products AS
SELECT
  i.id,
  i.tenant_id,
  i.barcode,
  i.storefront_slug AS slug,
  i.model,
  i.color,
  i.size,
  i.quantity,
  i.storefront_status,
  i.storefront_price,
  i.storefront_description,
  i.product_type,
  b.name AS brand_name,
  b.id AS brand_id,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', img.id,
      'url', img.image_url,
      'is_primary', img.is_primary,
      'sort_order', img.sort_order
    ) ORDER BY img.is_primary DESC, img.sort_order)
    FROM inventory_images img
    WHERE img.inventory_id = i.id AND img.is_deleted = false),
    '[]'::json
  ) AS images
FROM inventory i
LEFT JOIN brands b ON b.id = i.brand_id
WHERE i.is_deleted = false
  AND i.storefront_status != 'hidden';

-- Grant read access to anon users
GRANT SELECT ON v_storefront_products TO anon;

-- View: Product categories with counts
CREATE OR REPLACE VIEW v_storefront_categories AS
SELECT
  i.tenant_id,
  i.product_type AS name,
  COUNT(*) AS product_count
FROM inventory i
WHERE i.is_deleted = false
  AND i.storefront_status != 'hidden'
  AND i.product_type IS NOT NULL
GROUP BY i.tenant_id, i.product_type;

GRANT SELECT ON v_storefront_categories TO anon;

-- View: Brands with product counts
CREATE OR REPLACE VIEW v_storefront_brands AS
SELECT
  b.id,
  b.tenant_id,
  b.name,
  b.name_he,
  LOWER(REPLACE(b.name, ' ', '-')) AS slug,
  COUNT(i.id) AS product_count
FROM brands b
LEFT JOIN inventory i ON i.brand_id = b.id
  AND i.is_deleted = false
  AND i.storefront_status != 'hidden'
WHERE b.is_deleted = false
GROUP BY b.id, b.tenant_id, b.name, b.name_he;

GRANT SELECT ON v_storefront_brands TO anon;
```

---

## Output Files

New/modified files in `opticup-storefront`:

```
src/
├── pages/
│   ├── products/
│   │   ├── index.astro              ← Product listing with filters
│   │   └── [slug].astro             ← Product detail page
│   ├── brands/
│   │   ├── index.astro              ← All brands grid
│   │   └── [slug].astro             ← Brand catalog page
│   ├── category/
│   │   └── [slug].astro             ← Category product listing
│   └── search.astro                 ← Search results page
├── components/
│   ├── ProductCard.astro            ← UPDATE existing
│   ├── ProductGrid.astro            ← NEW: grid layout with filters
│   ├── ProductDetail.astro          ← NEW: full product view
│   ├── ProductGallery.astro         ← NEW: image gallery/carousel
│   ├── BrandCard.astro              ← NEW: brand card for brands page
│   ├── SearchBar.astro              ← NEW: search input component
│   ├── FilterSidebar.astro          ← NEW: filters (brand, category, price, stock)
│   ├── Breadcrumbs.astro            ← NEW: breadcrumb navigation
│   ├── WhatsAppCTA.astro            ← NEW: WhatsApp button with product message
│   └── GhostProduct.astro           ← NEW: out-of-stock overlay
├── lib/
│   ├── products.ts                  ← UPDATE: real queries to Views
│   └── brands.ts                    ← NEW: brand queries
sql/
├── 003-inventory-storefront-columns.sql  ← NEW
└── 004-storefront-views.sql              ← NEW
```

---

## Autonomous Execution Plan

### Step 1 — Setup: branch, SQL files, pull latest

**What to do:**
1. Navigate to storefront repo:
   ```bash
   cd C:/Users/User/opticup-storefront
   ```
2. Pull latest:
   ```bash
   git pull origin main
   ```
3. Create/checkout develop branch:
   ```bash
   git checkout -b develop 2>/dev/null || git checkout develop
   git pull origin develop 2>/dev/null || true
   ```
4. Create SQL migration files:
   - `sql/003-inventory-storefront-columns.sql` (content from SQL section above)
   - `sql/004-storefront-views.sql` (content from SQL section above)
5. Commit:
   ```bash
   git add -A && git commit -m "Phase 2 Step 1: SQL migrations for storefront columns + Views"
   git push -u origin develop
   ```

**Verify:**
- [ ] On branch `develop`
- [ ] SQL files created in `sql/`
- [ ] `.env` not in git

---

### Step 2 — Update lib/products.ts with real View queries

**What to do:**

Rewrite `src/lib/products.ts` to query the actual Views:

```typescript
import { supabase } from './supabase';

export interface StorefrontProduct {
  id: string;
  barcode: string;
  slug: string;
  brand_name: string;
  brand_id: string;
  model: string;
  color: string | null;
  size: string | null;
  quantity: number;
  product_type: string;
  storefront_status: 'catalog' | 'shop';
  storefront_price: number | null;
  storefront_description: string | null;
  images: Array<{
    id: string;
    url: string;
    is_primary: boolean;
    sort_order: number;
  }>;
}

export interface ProductFilters {
  tenantId: string;
  brand?: string;
  category?: string;
  search?: string;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}

export async function getProducts(filters: ProductFilters): Promise<{
  products: StorefrontProduct[];
  total: number;
}> {
  if (!supabase) return { products: [], total: 0 };

  let query = supabase
    .from('v_storefront_products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', filters.tenantId);

  if (filters.brand) {
    query = query.ilike('brand_name', filters.brand);
  }
  if (filters.category) {
    query = query.eq('product_type', filters.category);
  }
  if (filters.search) {
    query = query.or(
      `brand_name.ilike.%${filters.search}%,model.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`
    );
  }
  if (filters.inStock) {
    query = query.gt('quantity', 0);
  }

  query = query.order('brand_name').order('model');

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error.message);
    return { products: [], total: 0 };
  }

  return {
    products: (data || []) as StorefrontProduct[],
    total: count || 0,
  };
}

export async function getProductBySlug(
  tenantId: string,
  slug: string
): Promise<StorefrontProduct | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('v_storefront_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data as StorefrontProduct;
}

export async function getCategories(tenantId: string): Promise<{
  name: string;
  product_count: number;
}[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_storefront_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('product_count', { ascending: false });

  if (error) return [];
  return data || [];
}
```

**Verify:**
- [ ] File under 350 lines
- [ ] `npm run build` succeeds

---

### Step 3 — Create lib/brands.ts

**What to do:**

Create `src/lib/brands.ts`:

```typescript
import { supabase } from './supabase';

export interface StorefrontBrand {
  id: string;
  tenant_id: string;
  name: string;
  name_he: string | null;
  slug: string;
  product_count: number;
}

export async function getBrands(tenantId: string): Promise<StorefrontBrand[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_storefront_brands')
    .select('*')
    .eq('tenant_id', tenantId)
    .gt('product_count', 0)
    .order('name');

  if (error) {
    console.error('Error fetching brands:', error.message);
    return [];
  }
  return data || [];
}

export async function getBrandBySlug(
  tenantId: string,
  slug: string
): Promise<StorefrontBrand | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('v_storefront_brands')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data as StorefrontBrand;
}
```

**Verify:**
- [ ] File under 350 lines
- [ ] Valid TypeScript

---

### CHECKPOINT — Steps 1-3

Commit and push.

---

### Step 4 — Create shared components (ProductGrid, SearchBar, Breadcrumbs, WhatsAppCTA, GhostProduct)

**What to do:**

Create these components in `src/components/`:

1. **`ProductGrid.astro`** — responsive grid of ProductCard components
   - Props: `products: StorefrontProduct[]`, `locale: Locale`
   - Grid: 2 cols mobile, 3 cols tablet, 4 cols desktop
   - Shows "no products" message if empty array

2. **`SearchBar.astro`** — search input
   - Props: `locale: Locale`, `initialQuery?: string`
   - Form that submits GET to `/search?q=...`
   - RTL-aware placeholder text
   - Search icon

3. **`Breadcrumbs.astro`** — navigation breadcrumbs
   - Props: `items: Array<{ label: string; href?: string }>`
   - Schema.org BreadcrumbList JSON-LD

4. **`WhatsAppCTA.astro`** — WhatsApp button with product-specific message
   - Props: `productName: string`, `whatsappNumber: string`, `locale: Locale`
   - Generates message: "היי, ראיתי באתר את [product] ואשמח לפרטים"
   - Green button, phone icon

5. **`GhostProduct.astro`** — out-of-stock overlay
   - Props: `locale: Locale`
   - Semi-transparent overlay
   - Text: "המוצר אזל מהמלאי"
   - Button: "עדכנו אותי כשיחזור" (future: leads form)

6. **Update `ProductCard.astro`** — enhance existing:
   - Show first image from images array (or placeholder)
   - Brand + Model as title
   - Price if storefront_status = 'shop'
   - "לפרטים" button if storefront_status = 'catalog'
   - GhostProduct overlay if quantity = 0
   - Link to `/products/[slug]/`

7. **`FilterSidebar.astro`** — product filters
   - Props: `brands: string[]`, `categories: string[]`, `locale: Locale`, `currentFilters: object`
   - Filter by brand (checkboxes or dropdown)
   - Filter by category
   - Filter by stock status (in stock / all)
   - Apply button submits as URL query params

8. **`BrandCard.astro`** — brand display card
   - Props: `brand: StorefrontBrand`, `locale: Locale`
   - Brand name
   - Product count
   - Link to `/brands/[slug]/`

**Verify:**
- [ ] All components under 350 lines
- [ ] `npm run build` succeeds

---

### Step 5 — Create product listing page (`/products/`)

**What to do:**

Create `src/pages/products/index.astro`:

- Reads query params: `?brand=...&category=...&q=...&page=1`
- Calls `getProducts()` with filters
- Calls `getCategories()` for filter sidebar
- Calls `getBrands()` for filter sidebar
- Renders: Breadcrumbs + SearchBar + FilterSidebar + ProductGrid
- Pagination: 20 products per page, prev/next links
- SEO: title "מוצרים | [tenant name]", meta description

**Verify:**
- [ ] Page renders (with or without Supabase)
- [ ] Filters work via URL params
- [ ] Responsive layout

---

### Step 6 — Create product detail page (`/products/[slug]/`)

**What to do:**

Create `src/pages/products/[slug].astro`:

**IMPORTANT:** Since we're using `output: 'static'`, dynamic routes need `getStaticPaths()`. For now, use a simple approach:
- Switch output to `'server'` in astro.config.mjs (SSR mode) so dynamic routes work without pre-building all paths
- OR use `output: 'hybrid'` and mark this page as `export const prerender = false`

**Recommendation:** Use `output: 'hybrid'` — static by default, SSR for dynamic pages. Update `astro.config.mjs`:
```javascript
output: 'hybrid',
```

Page content:
- Calls `getProductBySlug(tenantId, slug)`
- If not found → 404 page
- Renders:
  - Breadcrumbs (ראשי > [category] > [brand] [model])
  - Image gallery (main image + thumbnails)
  - Product info: brand, model, color, size, barcode
  - Price (if shop mode) or "לפרטים" (if catalog mode)
  - WhatsApp CTA button
  - Description (if storefront_description exists)
  - GhostProduct overlay if quantity = 0
- SEO: title "[brand] [model] | [tenant]", OG image from first product image
- Schema.org Product JSON-LD

**Verify:**
- [ ] Page renders with product data
- [ ] 404 if slug not found
- [ ] WhatsApp link correct
- [ ] Schema.org Product markup present

---

### CHECKPOINT — Steps 4-6

Commit and push.

---

### Step 7 — Create brand pages (`/brands/` + `/brands/[slug]/`)

**What to do:**

1. **`src/pages/brands/index.astro`** — All brands page:
   - Calls `getBrands(tenantId)`
   - Grid of BrandCard components
   - Sorted alphabetically
   - SEO: "מותגים | [tenant]"

2. **`src/pages/brands/[slug].astro`** — Brand catalog page:
   - `export const prerender = false;` (SSR)
   - Calls `getBrandBySlug(tenantId, slug)` for brand info
   - Calls `getProducts({ tenantId, brand: brandName })` for products
   - Renders: Breadcrumbs + brand header + ProductGrid
   - SEO: "[brand name] | [tenant]"

**Verify:**
- [ ] Brands page lists all brands
- [ ] Brand detail page shows only that brand's products
- [ ] Links between pages work

---

### Step 8 — Create category pages (`/category/[slug]/`)

**What to do:**

Create `src/pages/category/[slug].astro`:

- `export const prerender = false;` (SSR)
- Slug is the product_type (e.g., "משקפי-שמש", "מסגרות-ראייה", "עדשות-מגע")
- Calls `getProducts({ tenantId, category: categoryName })`
- Renders: Breadcrumbs + category title + FilterSidebar (brands only) + ProductGrid
- SEO: "[category] | [tenant]"

**Verify:**
- [ ] Category page shows filtered products
- [ ] Breadcrumbs correct

---

### Step 9 — Create search page (`/search`)

**What to do:**

Create `src/pages/search.astro`:

- `export const prerender = false;` (SSR)
- Reads `?q=...` from URL
- Calls `getProducts({ tenantId, search: query })`
- Renders: SearchBar (pre-filled) + ProductGrid (results)
- If no query → show SearchBar only with "חפשו מוצרים" heading
- If no results → "לא נמצאו תוצאות עבור '[query]'"
- SEO: noindex (search pages shouldn't be indexed)

**Verify:**
- [ ] Search returns results matching brand/model/barcode
- [ ] Empty state handled
- [ ] noindex meta tag present

---

### CHECKPOINT — Steps 7-9

Commit and push.

---

### Step 10 — Update homepage + navigation + build test

**What to do:**

1. **Update `src/pages/index.astro`:**
   - FeaturedProducts section shows real products (first 8 from getProducts)
   - CategoryGrid shows real categories from getCategories
   - Add "צפו בכל המוצרים" link to `/products/`
   - Add "המותגים שלנו" section with top brands

2. **Update `src/components/Header.astro`:**
   - Nav links point to real pages:
     - משקפי שמש → `/category/משקפי-שמש/`
     - מסגרות ראייה → `/category/מסגרות-ראייה/`
     - מותגים → `/brands/`
     - בלוג → `/blog/` (placeholder, Phase 3)
     - משקפי מולטיפוקל → `/category/מולטיפוקל/` or landing page
   - Add SearchBar to header (compact version)

3. **Final build test:**
   ```bash
   npm run build
   ```
   Must pass with zero errors.

**Verify:**
- [ ] Homepage shows products section
- [ ] Navigation links to real pages
- [ ] Build succeeds
- [ ] All pages have RTL layout

---

### Step 11 — Documentation + final commit + merge + tag

**What to do:**

1. Update `SESSION_CONTEXT.md` — all steps ✅
2. Update `README.md` — add new pages
3. Commit on develop:
   ```bash
   git add -A && git commit -m "Phase 2 complete: Product catalog + brands + categories + search"
   git push origin develop
   ```
4. Merge to main:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   git checkout develop
   ```
5. Tag:
   ```bash
   git tag v3.2-phase2-product-catalog -m "Phase 2: Product Catalog + ERP Integration"
   git push origin v3.2-phase2-product-catalog
   ```

**Verify:**
- [ ] All 11 steps ✅
- [ ] Build passes
- [ ] Merge to main succeeded
- [ ] Vercel deploy triggered
- [ ] Tag created
- [ ] `.env` not in git

---

## Autonomous Rules

- Checkpoint every 3 steps
- BLOCKED after 3 attempts → document, skip
- DECISION_NEEDED → document, choose simpler
- Work ONLY in opticup-storefront repo
- SQL files saved only — never run against DB
- Before EVERY commit: `.env` not in git
- If Supabase Views don't exist yet → pages render with empty/placeholder content (graceful fallback)

## Completion Checklist

- [ ] All 11 steps ✅
- [ ] `/products/` page works
- [ ] `/products/[slug]/` page works
- [ ] `/brands/` page works
- [ ] `/brands/[slug]/` page works
- [ ] `/category/[slug]/` page works
- [ ] `/search` page works
- [ ] WhatsApp CTA with product name
- [ ] Ghost overlay for out-of-stock
- [ ] Schema.org Product markup
- [ ] Breadcrumbs on all pages
- [ ] Mobile responsive
- [ ] Build passes
- [ ] SQL migrations in sql/ folder
- [ ] Tag created

## What Happens Next

1. Daniel runs SQL migrations in Supabase Dashboard:
   - `sql/003-inventory-storefront-columns.sql`
   - `sql/004-storefront-views.sql`
2. Daniel sets some products to `storefront_status = 'catalog'` in ERP (or directly in DB for testing)
3. Products appear on the live storefront
4. Phase 3 — SEO Migration (blog, redirects, schema)
