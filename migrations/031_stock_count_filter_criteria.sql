-- Add filter_criteria JSONB column to stock_counts
-- Stores brand/type/supplier/price filters used when creating the count
ALTER TABLE stock_counts ADD COLUMN IF NOT EXISTS filter_criteria JSONB DEFAULT '{}';
