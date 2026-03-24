-- Migration 050: Receipt architecture — multi-barcode support + partial_received status
-- Part of: Architecture fix for single receipt row per PO item

-- 1. Add barcodes_csv column for storing multiple barcodes per receipt item
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS barcodes_csv TEXT;

COMMENT ON COLUMN goods_receipt_items.barcodes_csv IS 'Comma-separated list of all barcodes for this receipt row (one per physical unit)';

-- 2. Add ordered_qty column to track original ordered quantity
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS ordered_qty INTEGER;

COMMENT ON COLUMN goods_receipt_items.ordered_qty IS 'Original ordered quantity from PO (quantity field holds effective/received qty)';

-- 3. Update receipt_status CHECK constraint to include partial_received
ALTER TABLE goods_receipt_items
  DROP CONSTRAINT IF EXISTS goods_receipt_items_receipt_status_check;

ALTER TABLE goods_receipt_items
  ADD CONSTRAINT goods_receipt_items_receipt_status_check
    CHECK (receipt_status IS NULL OR receipt_status IN ('ok', 'not_received', 'return', 'partial_received'));
