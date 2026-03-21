-- Phase 8: PO comparison fields on goods_receipt_items
-- Tracks price decisions and PO match status per receipt item

ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS price_decision TEXT,
  ADD COLUMN IF NOT EXISTS po_match_status TEXT;

-- Add CHECK constraints for valid values
ALTER TABLE goods_receipt_items
  ADD CONSTRAINT chk_price_decision
    CHECK (price_decision IS NULL OR price_decision IN ('po_price', 'invoice_price'));

ALTER TABLE goods_receipt_items
  ADD CONSTRAINT chk_po_match_status
    CHECK (po_match_status IS NULL OR po_match_status IN ('matched', 'not_in_po', 'returned'));

COMMENT ON COLUMN goods_receipt_items.price_decision IS 'How price discrepancy was resolved: po_price, invoice_price, or NULL';
COMMENT ON COLUMN goods_receipt_items.po_match_status IS 'How item matched to PO: matched, not_in_po, returned, or NULL';
