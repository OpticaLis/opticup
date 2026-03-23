-- Add 'draft' to supplier_documents status check constraint
-- Draft status is used for imported documents before user review/scan

ALTER TABLE supplier_documents
  DROP CONSTRAINT IF EXISTS supplier_documents_status_check;

ALTER TABLE supplier_documents
  ADD CONSTRAINT supplier_documents_status_check
  CHECK (status IN ('draft', 'open', 'partially_paid', 'paid', 'linked', 'cancelled'));
