-- 056: Add product_type to stock_count_items (optional enrichment column)
-- NOTE: Not required for stock count to work — product_type is enriched from inventory on load.
-- This column exists for future reporting/filtering purposes.
ALTER TABLE stock_count_items
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT '';
