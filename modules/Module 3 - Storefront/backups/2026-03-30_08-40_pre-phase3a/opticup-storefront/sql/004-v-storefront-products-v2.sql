-- ═══════════════════════════════════════════════════════════════
-- Module 3 Storefront — Phase 2 Step 1
-- Updated views with search support + brand listing
--
-- Run in: Supabase Dashboard > SQL Editor (as service_role)
-- Run AFTER: 003-alter-inventory-storefront-columns.sql
-- Replaces: 002-v-storefront-products.sql views
-- ═══════════════════════════════════════════════════════════════

-- Drop and recreate to ensure clean state
DROP VIEW IF EXISTS v_storefront_categories;
DROP VIEW IF EXISTS v_storefront_products;

-- ═══════════════════════════════════════════════════════════════
-- v_storefront_products: full product view for storefront
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_storefront_products AS
SELECT
  i.id,
  i.tenant_id,
  i.barcode,
  b.name AS brand_name,
  b.id AS brand_id,
  i.model,
  i.color,
  i.size,
  i.quantity,
  i.storefront_status,
  i.storefront_price,
  i.storefront_description,
  b.brand_type AS product_type,
  COALESCE(
    (SELECT json_agg(img.url ORDER BY img.id) FROM inventory_images img WHERE img.inventory_id = i.id),
    '[]'::json
  ) AS images,
  -- search helper: concatenated text for full-text search
  LOWER(COALESCE(b.name, '') || ' ' || COALESCE(i.model, '') || ' ' || COALESCE(i.color, '') || ' ' || COALESCE(i.barcode, '')) AS search_text
FROM inventory i
LEFT JOIN brands b ON i.brand_id = b.id
WHERE i.is_deleted = false
  AND i.storefront_status IS DISTINCT FROM 'hidden';

GRANT SELECT ON v_storefront_products TO anon;

-- ═══════════════════════════════════════════════════════════════
-- v_storefront_categories: product types with counts
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_storefront_categories AS
SELECT
  tenant_id,
  product_type AS name,
  COUNT(*) AS count
FROM v_storefront_products
WHERE product_type IS NOT NULL
GROUP BY tenant_id, product_type
ORDER BY count DESC;

GRANT SELECT ON v_storefront_categories TO anon;

-- ═══════════════════════════════════════════════════════════════
-- v_storefront_brands: distinct brands with product counts
-- Used for brand filter sidebar
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_storefront_brands AS
SELECT
  tenant_id,
  brand_id,
  brand_name,
  product_type,
  COUNT(*) AS count
FROM v_storefront_products
WHERE brand_name IS NOT NULL
GROUP BY tenant_id, brand_id, brand_name, product_type
ORDER BY brand_name;

GRANT SELECT ON v_storefront_brands TO anon;
