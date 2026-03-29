-- RC-1: Per-item notes on goods receipt items
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS note TEXT;

-- RC-2: Multiple document numbers per receipt
ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS document_numbers TEXT[] DEFAULT '{}';
