-- SD-1: Expense folders for general invoices
CREATE TABLE IF NOT EXISTS expense_folders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  icon            TEXT DEFAULT '📁',
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE expense_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON expense_folders FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON expense_folders FOR ALL TO service_role USING (true);

CREATE INDEX idx_expense_folders_tenant ON expense_folders(tenant_id);

-- SD-2: Link documents to folders
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS expense_folder_id UUID REFERENCES expense_folders(id);

CREATE INDEX idx_supdocs_folder ON supplier_documents(tenant_id, expense_folder_id)
  WHERE expense_folder_id IS NOT NULL;
