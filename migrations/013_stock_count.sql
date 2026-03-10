-- Migration 013: Stock Count tables (Phase 2a)
-- Barcode-based physical inventory counting with discrepancy reports

-- ============================================================
-- stock_counts — ראשי ספירות מלאי
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_counts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_number    TEXT NOT NULL UNIQUE,                        -- SC-YYYY-NNNN (auto-generated)
  count_date      DATE NOT NULL DEFAULT CURRENT_DATE,          -- תאריך ספירה
  status          TEXT NOT NULL DEFAULT 'in_progress',         -- in_progress | completed | cancelled
  counted_by      TEXT,                                        -- מי ספר (שם עובד)
  notes           TEXT,                                        -- הערות
  total_items     INTEGER DEFAULT 0,                           -- סה"כ פריטים שנספרו
  total_diffs     INTEGER DEFAULT 0,                           -- סה"כ פערים שנמצאו
  branch_id       TEXT,                                        -- קוד סניף
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ                                  -- מתי הושלם
);
CREATE INDEX IF NOT EXISTS idx_sc_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_sc_date ON stock_counts(count_date DESC);

ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_stock_counts" ON stock_counts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- stock_count_items — שורות ספירה
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_count_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_id        UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  inventory_id    UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  barcode         TEXT,                                        -- ברקוד (snapshot)
  brand           TEXT,                                        -- מותג (snapshot)
  model           TEXT,                                        -- דגם (snapshot)
  color           TEXT,                                        -- צבע (snapshot)
  size            TEXT,                                        -- גודל (snapshot)
  expected_qty    INTEGER NOT NULL,                            -- כמות צפויה (מהמערכת)
  actual_qty      INTEGER,                                     -- כמות בפועל (מהספירה)
  difference      INTEGER GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,  -- פער
  status          TEXT NOT NULL DEFAULT 'pending',             -- pending | counted | skipped
  notes           TEXT,                                        -- הערה לשורה
  counted_at      TIMESTAMPTZ                                  -- מתי נספר
);
CREATE INDEX IF NOT EXISTS idx_sci_count ON stock_count_items(count_id);
CREATE INDEX IF NOT EXISTS idx_sci_inventory ON stock_count_items(inventory_id);

ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_sc_items" ON stock_count_items FOR ALL USING (true) WITH CHECK (true);
