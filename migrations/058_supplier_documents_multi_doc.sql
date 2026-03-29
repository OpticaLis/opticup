-- 058: Add multi-document support for PO-linked receipts
-- document_numbers: array of document numbers (for grouped docs from same receipt)
-- document_amounts: per-document breakdown [{number, amount}]

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS document_numbers TEXT[] DEFAULT '{}';

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS document_amounts JSONB DEFAULT '[]';

-- Index for searching by document numbers (GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_supdocs_doc_numbers
  ON supplier_documents USING GIN(document_numbers)
  WHERE document_numbers != '{}';
