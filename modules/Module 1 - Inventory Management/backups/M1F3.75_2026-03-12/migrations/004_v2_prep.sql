-- Migration 004: v2.0 preparation
-- Date: 2026-03

-- Add min_stock_qty to brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS min_stock_qty INTEGER DEFAULT NULL;
COMMENT ON COLUMN brands.min_stock_qty IS 'סף מלאי מינימלי למותג. NULL = ללא התראה';

-- Remove contact_lenses from product_type enum
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_type_check;
ALTER TABLE inventory ADD CONSTRAINT inventory_product_type_check
  CHECK (product_type IN ('eyeglasses', 'sunglasses'));
