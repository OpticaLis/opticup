-- Migration 003: Goods Receipts tables
-- Date: 2026-03-08

CREATE TABLE IF NOT EXISTS goods_receipts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT NOT NULL,
  receipt_type   TEXT NOT NULL DEFAULT 'delivery_note',
  -- 'delivery_note' = תעודת משלוח | 'invoice' = חשבונית
  supplier_id    UUID REFERENCES suppliers(id),
  branch_id      TEXT,
  receipt_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date  DATE DEFAULT CURRENT_DATE,
  total_amount   DECIMAL(10,2),
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'confirmed' | 'cancelled'
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id     UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  inventory_id   UUID REFERENCES inventory(id) ON DELETE SET NULL,
  barcode        TEXT,
  brand          TEXT,
  model          TEXT,
  color          TEXT,
  size           TEXT,
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_cost      DECIMAL(10,2),
  sell_price     DECIMAL(10,2),
  is_new_item    BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_receipts_supplier ON goods_receipts(supplier_id);
CREATE INDEX idx_receipts_status   ON goods_receipts(status);
CREATE INDEX idx_receipt_items     ON goods_receipt_items(receipt_id);

ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_goods_receipts" ON goods_receipts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "all_goods_receipt_items" ON goods_receipt_items
  FOR ALL USING (true) WITH CHECK (true);
