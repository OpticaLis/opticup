-- =========================================================
-- 040: Multi-file support for supplier documents
-- Creates supplier_document_files table to store multiple
-- files per supplier_document (e.g., multi-page invoices).
-- supplier_documents.file_url stays as primary file (backward compat).
-- =========================================================

-- 1. Create table
CREATE TABLE supplier_document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  document_id UUID NOT NULL REFERENCES supplier_documents(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_hash TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES employees(id)
);

-- 2. Indexes
CREATE INDEX idx_sdf_document ON supplier_document_files(document_id);
CREATE INDEX idx_sdf_tenant ON supplier_document_files(tenant_id);

-- 3. RLS — JWT-based tenant isolation (matching existing pattern)
ALTER TABLE supplier_document_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON supplier_document_files
  FOR ALL
  USING (tenant_id = ((current_setting('request.jwt.claims'::text, true))::json->>'tenant_id')::uuid);

CREATE POLICY service_bypass ON supplier_document_files
  FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- 4. Data migration — copy existing file_url records into new table
INSERT INTO supplier_document_files (tenant_id, document_id, file_url, file_name, sort_order)
SELECT
  tenant_id,
  id,
  file_url,
  REVERSE(SPLIT_PART(REVERSE(file_url), '/', 1)) as file_name,
  0
FROM supplier_documents
WHERE file_url IS NOT NULL AND file_url != ''
  AND is_deleted = false;
