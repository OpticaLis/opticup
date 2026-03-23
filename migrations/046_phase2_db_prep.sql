-- Migration 046: Phase 2a — Database preparations for receipt/debt flow improvements
-- A) Add 'pending_invoice' to supplier_documents status CHECK constraint
-- B) Add missing_price boolean column to supplier_documents
-- C) Add partial UNIQUE index on goods_receipt_id (prevent duplicate docs per receipt)

-- ═══════════════════════════════════════════════════════════════
-- A) Expand status CHECK to include 'pending_invoice'
--    Current: ('draft','open','partially_paid','paid','linked','cancelled')
--    New:     ('draft','open','partially_paid','paid','linked','cancelled','pending_invoice')
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE supplier_documents
  DROP CONSTRAINT IF EXISTS supplier_documents_status_check;

ALTER TABLE supplier_documents
  ADD CONSTRAINT supplier_documents_status_check
  CHECK (status IN ('draft', 'open', 'partially_paid', 'paid', 'linked', 'cancelled', 'pending_invoice'));

-- ═══════════════════════════════════════════════════════════════
-- B) Add missing_price column
--    Tracks whether a receipt-created document has items with unknown cost prices.
--    Used by the debt module to flag documents needing price review.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS missing_price BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- C) Partial UNIQUE index on goods_receipt_id
--    Ensures only one supplier_document per goods receipt (prevents double-creation).
--    NULLs are allowed (standalone documents have no goods_receipt_id).
-- ═══════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_documents_goods_receipt_unique
  ON supplier_documents (goods_receipt_id)
  WHERE goods_receipt_id IS NOT NULL;
