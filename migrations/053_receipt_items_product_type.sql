-- 053: Add product_type to goods_receipt_items
-- Allows product type (eyeglasses/sunglasses) to flow from PO → receipt → inventory
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS product_type TEXT
    CHECK (product_type IS NULL OR product_type IN ('eyeglasses', 'sunglasses'));
