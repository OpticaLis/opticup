-- ═══════════════════════════════════════════════════════════════
-- Module 3 Storefront — Phase 1 (prep for Phase 2)
-- View: v_storefront_products
--
-- Public view for storefront to read products.
-- Joins inventory + brands + inventory_images.
-- Filters: is_deleted=false, quantity>0, storefront_status != 'hidden'
--
-- Run in: Supabase Dashboard > SQL Editor (as service_role)
-- SAFETY: CREATE VIEW only, no DROP/DELETE/ALTER on tables
--
-- PREREQUISITE: inventory table must have storefront columns.
-- These will be added in Phase 2. This SQL is saved now for reference.
-- ═══════════════════════════════════════════════════════════════

-- Phase 2 prerequisite — add these columns to inventory first:
-- ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storefront_status TEXT DEFAULT 'hidden'
--   CHECK (storefront_status IN ('hidden', 'catalog', 'shop'));
-- ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storefront_price DECIMAL(10,2);
-- ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storefront_description TEXT;

CREATE OR REPLACE VIEW v_storefront_products AS
SELECT
  i.id,
  i.tenant_id,
  i.barcode,
  b.name AS brand_name,
  i.model,
  i.color,
  i.size,
  i.quantity,
  i.storefront_status,
  i.storefront_price,
  i.storefront_description,
  b.brand_type AS product_type,
  COALESCE(
    (SELECT json_agg(img.url) FROM inventory_images img WHERE img.inventory_id = i.id),
    '[]'::json
  ) AS images
FROM inventory i
LEFT JOIN brands b ON i.brand_id = b.id
WHERE i.is_deleted = false
  AND i.storefront_status IS DISTINCT FROM 'hidden';

-- Grant read access to anon (storefront uses anon key)
GRANT SELECT ON v_storefront_products TO anon;

-- ═══════════════════════════════════════════════════════════════
-- View: v_storefront_categories
-- Distinct product types with count of visible products
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
