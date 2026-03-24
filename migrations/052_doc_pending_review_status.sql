-- 052: Add 'pending_review' status to supplier_documents
-- Run via Supabase Dashboard (SQL Editor)
-- Allows finance manager to flag documents as "needs clarification"

ALTER TABLE supplier_documents
  DROP CONSTRAINT IF EXISTS supplier_documents_status_check;

ALTER TABLE supplier_documents
  ADD CONSTRAINT supplier_documents_status_check
  CHECK (status IN ('draft', 'open', 'partially_paid', 'paid', 'linked', 'cancelled', 'pending_invoice', 'pending_review'));
