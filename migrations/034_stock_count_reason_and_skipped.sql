-- 034: Add reason field to stock_count_items + update CHECK constraint to include 'skipped'
-- Phase 7 Step 3: Reason per discrepancy + partial approval

-- Add reason column (nullable text)
ALTER TABLE stock_count_items ADD COLUMN IF NOT EXISTS reason TEXT;

-- Update CHECK constraint to include 'skipped' and 'matched'
ALTER TABLE stock_count_items
  DROP CONSTRAINT IF EXISTS stock_count_items_status_check;

ALTER TABLE stock_count_items
  ADD CONSTRAINT stock_count_items_status_check
  CHECK (status IN ('pending', 'counted', 'matched', 'unknown', 'skipped'));
