-- Extend purchase_order_items with fields from old PO flow
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS sell_price    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS sell_discount DECIMAL(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_sync  TEXT CHECK (website_sync IN ('full','display','none')),
  ADD COLUMN IF NOT EXISTS product_type  TEXT CHECK (product_type IN ('eyeglasses','sunglasses')),
  ADD COLUMN IF NOT EXISTS bridge        TEXT,
  ADD COLUMN IF NOT EXISTS temple_length TEXT;
