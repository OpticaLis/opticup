-- ============================================================
-- Migration 021 — Phase 4a: Supplier Debt Tables
-- Date: 2026-03-12
-- ============================================================
-- Creates 11 new tables for supplier debt tracking:
--   A. Configurable: document_types, payment_methods, currencies
--   B. Core: supplier_documents, document_links, supplier_payments, payment_allocations
--   C. Prepaid: prepaid_deals, prepaid_checks
--   D. Returns: supplier_returns, supplier_return_items
--   E. ALTER suppliers: 4 new columns
--   F. Indexes on all new tables
--   G. RLS tenant isolation on all new tables
-- ============================================================

-- ============================================================
-- A. CONFIGURABLE TABLES (created first — others reference them)
-- ============================================================

-- A1. document_types — configurable document type registry
CREATE TABLE IF NOT EXISTS document_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,
  name_he         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  affects_debt    TEXT NOT NULL CHECK (affects_debt IN ('increase', 'decrease', 'none')),
  is_system       BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- A2. payment_methods — configurable payment method registry
CREATE TABLE IF NOT EXISTS payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,
  name_he         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  is_system       BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- A3. currencies — configurable currency registry
CREATE TABLE IF NOT EXISTS currencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,
  name_he         TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  is_default      BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- ============================================================
-- C. PREPAID DEALS (created before supplier_payments which references it)
-- ============================================================

-- C1. prepaid_deals — prepaid check deals with suppliers
CREATE TABLE IF NOT EXISTS prepaid_deals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  supplier_id           UUID NOT NULL REFERENCES suppliers(id),
  deal_name             TEXT,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  total_prepaid         DECIMAL(12,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'ILS',
  total_used            DECIMAL(12,2) DEFAULT 0,
  total_remaining       DECIMAL(12,2),
  alert_threshold_pct   DECIMAL(5,2) DEFAULT 20.0,
  alert_threshold_amt   DECIMAL(12,2),
  status                TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes                 TEXT,
  created_by            UUID REFERENCES employees(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  is_deleted            BOOLEAN DEFAULT false
);

-- C2. prepaid_checks — individual checks within a prepaid deal
CREATE TABLE IF NOT EXISTS prepaid_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  prepaid_deal_id   UUID NOT NULL REFERENCES prepaid_deals(id),
  check_number      TEXT NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  check_date        DATE NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cashed', 'bounced', 'cancelled')),
  cashed_date       DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- B. CORE TABLES
-- ============================================================

-- B1. supplier_documents — invoices, delivery notes, credit notes, receipts
CREATE TABLE IF NOT EXISTS supplier_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  document_type_id  UUID NOT NULL REFERENCES document_types(id),
  document_number   TEXT NOT NULL,
  document_date     DATE NOT NULL,
  due_date          DATE,
  received_date     DATE DEFAULT CURRENT_DATE,
  currency          TEXT NOT NULL DEFAULT 'ILS',
  exchange_rate     DECIMAL(10,4) DEFAULT 1.0,
  subtotal          DECIMAL(12,2) NOT NULL,
  vat_rate          DECIMAL(5,2) DEFAULT 17.0,
  vat_amount        DECIMAL(12,2) NOT NULL,
  total_amount      DECIMAL(12,2) NOT NULL,
  parent_invoice_id UUID REFERENCES supplier_documents(id),
  file_url          TEXT,
  file_name         TEXT,
  goods_receipt_id  UUID REFERENCES goods_receipts(id),
  po_id             UUID REFERENCES purchase_orders(id),
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'partially_paid', 'paid', 'linked', 'cancelled')),
  paid_amount       DECIMAL(12,2) DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

-- B2. document_links — maps delivery notes to monthly invoices
CREATE TABLE IF NOT EXISTS document_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  parent_document_id  UUID NOT NULL REFERENCES supplier_documents(id),
  child_document_id   UUID NOT NULL REFERENCES supplier_documents(id),
  amount_on_invoice   DECIMAL(12,2),
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_document_id, child_document_id)
);

-- B3. supplier_payments — payments made to suppliers
CREATE TABLE IF NOT EXISTS supplier_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  amount            DECIMAL(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ILS',
  exchange_rate     DECIMAL(10,4) DEFAULT 1.0,
  payment_date      DATE NOT NULL,
  payment_method    TEXT NOT NULL,
  reference_number  TEXT,
  prepaid_deal_id   UUID REFERENCES prepaid_deals(id),
  notes             TEXT,
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

-- B4. payment_allocations — maps payments to documents (many-to-many)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  payment_id        UUID NOT NULL REFERENCES supplier_payments(id),
  document_id       UUID NOT NULL REFERENCES supplier_documents(id),
  allocated_amount  DECIMAL(12,2) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payment_id, document_id)
);

-- ============================================================
-- D. SUPPLIER RETURNS
-- ============================================================

-- D1. supplier_returns — return headers
CREATE TABLE IF NOT EXISTS supplier_returns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),
  return_number       TEXT NOT NULL,
  return_type         TEXT NOT NULL CHECK (return_type IN ('agent_pickup', 'ship_to_supplier', 'pending_in_store')),
  reason              TEXT,
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'ready_to_ship', 'shipped', 'received_by_supplier', 'credited')),
  created_at          TIMESTAMPTZ DEFAULT now(),
  ready_at            TIMESTAMPTZ,
  shipped_at          TIMESTAMPTZ,
  received_at         TIMESTAMPTZ,
  credit_note_number  TEXT,
  credit_amount       DECIMAL(12,2),
  credit_document_id  UUID REFERENCES supplier_documents(id),
  notes               TEXT,
  created_by          UUID REFERENCES employees(id),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  is_deleted          BOOLEAN DEFAULT false
);

-- D2. supplier_return_items — items within a return
CREATE TABLE IF NOT EXISTS supplier_return_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  return_id       UUID NOT NULL REFERENCES supplier_returns(id),
  inventory_id    UUID NOT NULL REFERENCES inventory(id),
  barcode         TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  brand_name      TEXT,
  model           TEXT,
  color           TEXT,
  size            TEXT,
  cost_price      DECIMAL(10,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- E. ALTER EXISTING SUPPLIERS TABLE — add 4 columns
-- ============================================================

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS default_document_type TEXT DEFAULT 'invoice';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'ILS';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS has_prepaid_deal BOOLEAN DEFAULT false;

-- ============================================================
-- F. INDEXES
-- ============================================================

-- supplier_documents
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant ON supplier_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant_supplier ON supplier_documents(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant_status ON supplier_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant_due ON supplier_documents(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_supdocs_parent ON supplier_documents(parent_invoice_id);

-- supplier_payments
CREATE INDEX IF NOT EXISTS idx_suppay_tenant ON supplier_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppay_tenant_supplier ON supplier_payments(tenant_id, supplier_id);

-- payment_allocations
CREATE INDEX IF NOT EXISTS idx_payalloc_tenant ON payment_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payalloc_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payalloc_document ON payment_allocations(document_id);

-- prepaid_deals
CREATE INDEX IF NOT EXISTS idx_prepaid_tenant_supplier ON prepaid_deals(tenant_id, supplier_id);

-- prepaid_checks
CREATE INDEX IF NOT EXISTS idx_prepaid_checks_deal ON prepaid_checks(prepaid_deal_id);

-- supplier_returns
CREATE INDEX IF NOT EXISTS idx_supret_tenant ON supplier_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supret_tenant_supplier ON supplier_returns(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supret_tenant_status ON supplier_returns(tenant_id, status);

-- supplier_return_items
CREATE INDEX IF NOT EXISTS idx_supret_items_return ON supplier_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_supret_items_inventory ON supplier_return_items(inventory_id);

-- document_links
CREATE INDEX IF NOT EXISTS idx_doclinks_parent ON document_links(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_doclinks_child ON document_links(child_document_id);

-- document_types
CREATE INDEX IF NOT EXISTS idx_doctype_tenant ON document_types(tenant_id);

-- payment_methods
CREATE INDEX IF NOT EXISTS idx_paymeth_tenant ON payment_methods(tenant_id);

-- currencies
CREATE INDEX IF NOT EXISTS idx_currency_tenant ON currencies(tenant_id);

-- ============================================================
-- G. RLS — Row Level Security (JWT-based tenant isolation)
-- ============================================================
-- Pattern matches existing tables (020_rls_tenant_isolation.sql):
--   tenant_isolation: USING (tenant_id = JWT claim)
--   service_bypass: TO service_role USING (true)

-- document_types
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON document_types FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON document_types FOR ALL TO service_role USING (true);

-- payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON payment_methods FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON payment_methods FOR ALL TO service_role USING (true);

-- currencies
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON currencies FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON currencies FOR ALL TO service_role USING (true);

-- supplier_documents
ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_documents FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_documents FOR ALL TO service_role USING (true);

-- document_links
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON document_links FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON document_links FOR ALL TO service_role USING (true);

-- supplier_payments
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_payments FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_payments FOR ALL TO service_role USING (true);

-- payment_allocations
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON payment_allocations FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON payment_allocations FOR ALL TO service_role USING (true);

-- prepaid_deals
ALTER TABLE prepaid_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON prepaid_deals FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON prepaid_deals FOR ALL TO service_role USING (true);

-- prepaid_checks
ALTER TABLE prepaid_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON prepaid_checks FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON prepaid_checks FOR ALL TO service_role USING (true);

-- supplier_returns
ALTER TABLE supplier_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_returns FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_returns FOR ALL TO service_role USING (true);

-- supplier_return_items
ALTER TABLE supplier_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_return_items FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_return_items FOR ALL TO service_role USING (true);

-- ============================================================
-- H. SEED DATA — Prizma tenant
-- ============================================================

-- Seed document_types (4 types)
INSERT INTO document_types (tenant_id, code, name_he, name_en, affects_debt, is_system) VALUES
  ((SELECT id FROM tenants WHERE slug='prizma'), 'invoice',       'חשבונית מס',     'Tax Invoice',    'increase', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'delivery_note',  'תעודת משלוח',    'Delivery Note',  'increase', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'credit_note',    'חשבונית זיכוי',  'Credit Note',    'decrease', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'receipt',        'קבלה',           'Receipt',        'none',     true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Seed payment_methods (4 methods)
INSERT INTO payment_methods (tenant_id, code, name_he, name_en, is_system) VALUES
  ((SELECT id FROM tenants WHERE slug='prizma'), 'bank_transfer', 'העברה בנקאית',  'Bank Transfer', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'check',         'צ׳ק',           'Check',         true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'cash',          'מזומן',          'Cash',          true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'credit_card',   'כרטיס אשראי',   'Credit Card',   true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Seed currencies (3 currencies, ILS as default)
INSERT INTO currencies (tenant_id, code, name_he, symbol, is_default) VALUES
  ((SELECT id FROM tenants WHERE slug='prizma'), 'ILS', 'שקל חדש',       '₪', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'USD', 'דולר אמריקאי',  '$', false),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'EUR', 'אירו',          '€', false)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================
-- END Migration 021
-- ============================================================
