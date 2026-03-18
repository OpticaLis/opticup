-- 032_stock_count_unknown_items.sql
-- Allow unknown items in stock count (barcode found but not in inventory list)
-- 1. Drop existing CHECK constraint on status
-- 2. Add new CHECK that includes 'unknown'
-- 3. Make inventory_id nullable (unknown items have no inventory record)

-- Step 1: Drop old CHECK constraint
ALTER TABLE stock_count_items DROP CONSTRAINT IF EXISTS stock_count_items_status_check;

-- Step 2: Add new CHECK with 'unknown' status
ALTER TABLE stock_count_items ADD CONSTRAINT stock_count_items_status_check
  CHECK (status IN ('pending', 'counted', 'skipped', 'unknown'));

-- Step 3: Make inventory_id nullable for unknown items
ALTER TABLE stock_count_items ALTER COLUMN inventory_id DROP NOT NULL;
