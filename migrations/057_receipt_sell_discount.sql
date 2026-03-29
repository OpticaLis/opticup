-- 057: Add sell_discount to goods_receipt_items (consistent with PO items and inventory)
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS sell_discount NUMERIC(5,4) DEFAULT 0;
