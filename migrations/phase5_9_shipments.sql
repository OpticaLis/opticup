-- Phase 5.9: Shipments & Box Management
-- Tables: courier_companies, shipments, shipment_items
-- RPC: next_box_number
-- RLS: tenant_isolation + service_bypass on all 3 tables

-- ============================================================
-- 3.1 Courier Companies
-- ============================================================

CREATE TABLE courier_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  phone           TEXT,
  contact_person  TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_couriers_tenant ON courier_companies(tenant_id);

-- ============================================================
-- 3.2 Shipments (Boxes)
-- ============================================================

CREATE TABLE shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),

  -- Box identity
  box_number      TEXT NOT NULL,                  -- BOX-{seq}, immutable
  shipment_type   TEXT NOT NULL,
  -- 'framing'    — מסגור: הזמנה למעבדה
  -- 'return'     — זיכוי: החזרה לספק
  -- 'repair'     — תיקון: משלוח לתיקון
  -- 'delivery'   — משלוח: שליחה ללקוח

  -- Destination
  supplier_id     UUID REFERENCES suppliers(id),  -- for framing/return/repair
  customer_name   TEXT,                           -- for delivery (free text until CRM exists)
  customer_phone  TEXT,
  customer_address TEXT,

  -- Courier
  courier_id      UUID REFERENCES courier_companies(id),
  tracking_number TEXT,

  -- People & times
  packed_by       UUID NOT NULL REFERENCES employees(id),
  packed_at       TIMESTAMPTZ DEFAULT now(),
  locked_at       TIMESTAMPTZ,                    -- when edit window closed
  locked_by       UUID REFERENCES employees(id),

  -- Auto-lock: 30 minutes after packed_at if not manually locked
  -- Implemented in JS: check (now > packed_at + 30min) on every edit attempt

  -- Correction link
  corrects_box_id UUID REFERENCES shipments(id),  -- if this is a correction box

  -- Summary (denormalized, updated on item add/remove)
  items_count     INTEGER DEFAULT 0,
  total_value     DECIMAL(12,2) DEFAULT 0,

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  is_deleted      BOOLEAN DEFAULT false,

  UNIQUE(tenant_id, box_number)
);

CREATE INDEX idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX idx_shipments_tenant_type ON shipments(tenant_id, shipment_type);
CREATE INDEX idx_shipments_tenant_supplier ON shipments(tenant_id, supplier_id);
CREATE INDEX idx_shipments_tenant_date ON shipments(tenant_id, packed_at DESC);
CREATE INDEX idx_shipments_corrects ON shipments(corrects_box_id)
  WHERE corrects_box_id IS NOT NULL;

-- ============================================================
-- 3.3 Shipment Items
-- ============================================================

CREATE TABLE shipment_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  shipment_id     UUID NOT NULL REFERENCES shipments(id),

  -- What kind of item
  item_type       TEXT NOT NULL,
  -- 'inventory'  — frame from stock
  -- 'order'      — customer order (framing)
  -- 'repair'     — repair item

  -- Links (polymorphic — use whichever applies)
  inventory_id    UUID REFERENCES inventory(id),
  return_id       UUID REFERENCES supplier_returns(id),

  -- Manual fields (until Orders/CRM modules exist)
  order_number    TEXT,
  customer_name   TEXT,
  customer_number TEXT,

  -- Item details (always filled — either from inventory or manual)
  barcode         TEXT,
  brand           TEXT,
  model           TEXT,
  size            TEXT,
  color           TEXT,
  category        TEXT,
  -- 'stock'       — מסגרת מהמלאי
  -- 'order'       — הזמנה
  -- 'production'  — ייצור
  -- 'multifocal'  — מולטיפוקל
  -- 'office'      — אופיס
  -- 'bifocal'     — ביפוקל
  -- 'sun'         — שמש
  -- 'contact'     — עדשות מגע
  -- 'repair'      — תיקון

  unit_cost       DECIMAL(10,2),

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ship_items_shipment ON shipment_items(shipment_id);
CREATE INDEX idx_ship_items_inventory ON shipment_items(inventory_id)
  WHERE inventory_id IS NOT NULL;
CREATE INDEX idx_ship_items_return ON shipment_items(return_id)
  WHERE return_id IS NOT NULL;

-- ============================================================
-- 3.4 Box Number Generation (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION next_box_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  -- Lock tenant row to serialize (same pattern as next_internal_doc_number)
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(box_number FROM 5) AS INTEGER)), 0)
  INTO v_max
  FROM shipments
  WHERE tenant_id = p_tenant_id
    AND box_number LIKE 'BOX-%'
    AND is_deleted = false;

  RETURN 'BOX-' || LPAD((v_max + 1)::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- 3.5 RLS Policies
-- ============================================================

ALTER TABLE courier_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON courier_companies FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON courier_companies FOR ALL TO service_role USING (true);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shipments FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON shipments FOR ALL TO service_role USING (true);

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shipment_items FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON shipment_items FOR ALL TO service_role USING (true);
