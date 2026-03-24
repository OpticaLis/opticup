-- Migration 047: Add receipt_status + from_po columns to goods_receipt_items
-- Expand po_match_status CHECK to include 'not_received'
-- Purpose: Allow employees to mark PO items as not_received/return during goods receipt

-- 1. Add receipt_status column (employee's input at receipt time)
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS receipt_status TEXT
    CHECK (receipt_status IS NULL OR receipt_status IN ('ok', 'not_received', 'return'));

-- 2. Add from_po column (tracks whether row originated from a PO)
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS from_po BOOLEAN DEFAULT false;

-- 3. Expand po_match_status to include 'not_received'
ALTER TABLE goods_receipt_items
  DROP CONSTRAINT IF EXISTS goods_receipt_items_po_match_status_check;
ALTER TABLE goods_receipt_items
  ADD CONSTRAINT goods_receipt_items_po_match_status_check
    CHECK (po_match_status IS NULL OR po_match_status IN ('matched', 'not_in_po', 'returned', 'not_received'));
