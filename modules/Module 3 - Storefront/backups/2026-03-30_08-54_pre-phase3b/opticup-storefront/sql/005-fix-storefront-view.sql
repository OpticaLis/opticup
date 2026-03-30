-- ═══════════════════════════════════════════════════════════════
-- Module 3 Storefront — Fix v_storefront_products
--
-- Problem: Previous view used storefront_status column for filtering.
-- Fix: Use brands.default_sync + brands.exclude_website for visibility:
--   - default_sync = 'full'    → show only if quantity > 0
--   - default_sync = 'display' → always show (even quantity = 0)
--   - exclude_website = true   → never show
--   - is_deleted = true        → never show
--
-- Run in: Supabase Dashboard > SQL Editor (as service_role)
-- Replaces: 004-v-storefront-products-v2.sql
-- ═══════════════════════════════════════════════════════════════

-- Drop dependent views first (they reference v_storefront_products)
DROP VIEW IF EXISTS v_storefront_brands;
DROP VIEW IF EXISTS v_storefront_categories;
DROP VIEW IF EXISTS v_storefront_products;

-- ═══════════════════════════════════════════════════════════════
-- v_storefront_products
-- ═══════════════════════════════════════════════════════════════
CREATE VIEW v_storefront_products AS
SELECT
  i.id,
  i.tenant_id,
  i.barcode,
  b.name        AS brand_name,
  b.id          AS brand_id,
  b.brand_type,
  i.model,
  i.color,
  i.size,
  i.quantity,
  i.product_type,
  i.sell_price,
  i.sell_discount,
  b.default_sync,
  COALESCE(
    (
      SELECT json_agg(img.url ORDER BY img.sort_order, img.created_at)
      FROM inventory_images img
      WHERE img.inventory_id = i.id
    ),
    '[]'::json
  ) AS images,
  -- search helper: concatenated lowercase text for ilike queries
  LOWER(
    COALESCE(b.name, '') || ' ' ||
    COALESCE(i.model, '') || ' ' ||
    COALESCE(i.color, '') || ' ' ||
    COALESCE(i.barcode, '')
  ) AS search_text
FROM inventory i
JOIN brands b ON i.brand_id = b.id
WHERE i.is_deleted = false
  AND b.exclude_website = false
  AND b.default_sync IN ('full', 'display')
  AND (
    b.default_sync = 'display'           -- always show display brands
    OR (b.default_sync = 'full' AND i.quantity > 0)  -- full sync only if in stock
  );

GRANT SELECT ON v_storefront_products TO anon;

-- ═══════════════════════════════════════════════════════════════
-- v_storefront_categories: product types with counts
-- ═══════════════════════════════════════════════════════════════
CREATE VIEW v_storefront_categories AS
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
-- ═══════════════════════════════════════════════════════════════
CREATE VIEW v_storefront_brands AS
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
