-- Migration 005: purchase_orders + purchase_order_items
-- Date: 2026-03

-- purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number     TEXT NOT NULL UNIQUE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','partial','received','cancelled')),
  notes         TEXT,
  branch_id     TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status   ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_number   ON purchase_orders(po_number);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_purchase_orders" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_po_updated BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id        UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  barcode      TEXT,
  brand        TEXT,
  model        TEXT,
  color        TEXT,
  size         TEXT,
  qty_ordered  INTEGER NOT NULL DEFAULT 1,
  qty_received INTEGER NOT NULL DEFAULT 0,
  unit_cost    DECIMAL(10,2),
  discount_pct DECIMAL(5,2) DEFAULT 0,
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(po_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_po_items" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);

-- Add po_id to goods_receipts
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_po ON goods_receipts(po_id);
