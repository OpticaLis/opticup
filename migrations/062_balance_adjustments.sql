-- 062: Manual balance adjustments for suppliers
-- Run date: 2026-03-29

CREATE TABLE IF NOT EXISTS supplier_balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES employees(id),
  adjusted_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE supplier_balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON supplier_balance_adjustments
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY service_bypass ON supplier_balance_adjustments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_sba_tenant_supplier ON supplier_balance_adjustments(tenant_id, supplier_id);
