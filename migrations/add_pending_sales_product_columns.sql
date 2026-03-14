-- Add product detail columns to pending_sales for unresolved items
ALTER TABLE pending_sales ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE pending_sales ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE pending_sales ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE pending_sales ADD COLUMN IF NOT EXISTS color TEXT;
