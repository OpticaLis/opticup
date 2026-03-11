-- ============================================================
-- Migration 010: Access Bridge — sync_log + pending_sales + watcher_heartbeat
-- Phase 2 — גשר Excel דו-כיווני עם Access
-- ============================================================

-- Table 1: sync_log
CREATE TABLE sync_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  filename         TEXT NOT NULL,
  source_ref       TEXT NOT NULL CHECK (source_ref IN ('watcher', 'manual')),
  status           TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  rows_total       INTEGER DEFAULT 0,
  rows_success     INTEGER DEFAULT 0,
  rows_pending     INTEGER DEFAULT 0,
  rows_error       INTEGER DEFAULT 0,
  error_message    TEXT,
  processed_at     TIMESTAMPTZ
);

-- Table 2: pending_sales
-- Rows that arrived from Access but barcode was not found in inventory
CREATE TABLE pending_sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  sync_log_id      UUID REFERENCES sync_log(id),
  source_ref       TEXT NOT NULL CHECK (source_ref IN ('watcher', 'manual')),
  filename         TEXT NOT NULL,
  barcode_received TEXT NOT NULL,
  quantity         INTEGER NOT NULL,
  action_type      TEXT NOT NULL CHECK (action_type IN ('sale', 'return')),
  transaction_date DATE NOT NULL,
  order_number     TEXT NOT NULL,
  employee_id      TEXT,
  sale_amount      NUMERIC(10,2),
  discount         NUMERIC(10,2) DEFAULT 0,
  discount_1       NUMERIC(10,2) DEFAULT 0,
  discount_2       NUMERIC(10,2) DEFAULT 0,
  final_amount     NUMERIC(10,2),
  coupon_code      TEXT,
  campaign         TEXT,
  lens_included    BOOLEAN DEFAULT false,
  lens_category    TEXT,
  reason           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT,
  resolved_inventory_id UUID REFERENCES inventory(id),
  resolution_note  TEXT
);

-- Table 3: heartbeat (for Watcher monitoring)
CREATE TABLE watcher_heartbeat (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  last_beat   TIMESTAMPTZ DEFAULT now(),
  watcher_version TEXT,
  host        TEXT
);

-- Only one row ever — upsert on id=1
INSERT INTO watcher_heartbeat (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Indexes
CREATE INDEX idx_sync_log_created     ON sync_log(created_at DESC);
CREATE INDEX idx_sync_log_filename    ON sync_log(filename);
CREATE INDEX idx_pending_sales_status ON pending_sales(status);
CREATE INDEX idx_pending_sales_order  ON pending_sales(order_number);

-- RLS
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_sync_log" ON sync_log FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pending_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_pending_sales" ON pending_sales FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE watcher_heartbeat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_watcher_heartbeat" ON watcher_heartbeat FOR ALL USING (true) WITH CHECK (true);
