-- Add min_stock_qty column to brands table for low-stock alerts
ALTER TABLE brands ADD COLUMN IF NOT EXISTS min_stock_qty integer DEFAULT NULL;

COMMENT ON COLUMN brands.min_stock_qty IS 'Minimum stock threshold. When total qty across inventory falls below this, a low-stock alert is triggered.';
