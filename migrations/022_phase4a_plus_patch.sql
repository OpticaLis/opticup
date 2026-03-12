-- ============================================================
-- Migration 022 — Phase 4a+ Patch: Withholding Tax, Internal
--   Numbering, Duplicate Prevention, Payment Approval
-- Date: 2026-03-12
-- ============================================================
-- Adds fields not in the original Phase 4a spec:
--   A. supplier_documents: internal_number + unique index
--   B. supplier_documents: duplicate prevention constraint
--   C. supplier_payments: withholding tax + approval workflow
--   D. suppliers: tax withholding fields
-- ============================================================

-- ============================================================
-- A. supplier_documents — internal numbering
-- ============================================================
-- Our own internal reference number (separate from supplier's document_number)
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS internal_number TEXT;

-- Unique per tenant, but allow NULLs (not every doc gets an internal number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_supdocs_internal_unique
  ON supplier_documents(tenant_id, internal_number)
  WHERE internal_number IS NOT NULL;

-- ============================================================
-- B. supplier_documents — duplicate prevention
-- ============================================================
-- Same supplier can't have two documents with the same number per tenant
ALTER TABLE supplier_documents
  DROP CONSTRAINT IF EXISTS supplier_documents_tenant_id_supplier_id_document_number_key;

ALTER TABLE supplier_documents
  ADD CONSTRAINT supplier_documents_tenant_supplier_docnum_unique
  UNIQUE(tenant_id, supplier_id, document_number);

-- ============================================================
-- C. supplier_payments — withholding tax + approval workflow
-- ============================================================
ALTER TABLE supplier_payments
  ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withholding_tax_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_suppay_status
  ON supplier_payments(tenant_id, status);

-- ============================================================
-- D. suppliers — tax withholding configuration
-- ============================================================
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_exempt_certificate TEXT,
  ADD COLUMN IF NOT EXISTS tax_exempt_until DATE;

-- ============================================================
-- END Migration 022
-- ============================================================
