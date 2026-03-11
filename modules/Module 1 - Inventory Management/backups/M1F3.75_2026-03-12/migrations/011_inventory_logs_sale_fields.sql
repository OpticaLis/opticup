-- ============================================================
-- Migration 011: Add Access sale fields to inventory_logs
-- ============================================================
-- These columns store per-transaction data from Access POS
-- sales files imported via the sync watcher or manual upload.
-- For non-Access log entries these columns remain NULL.
-- ============================================================

ALTER TABLE inventory_logs
  ADD COLUMN IF NOT EXISTS sale_amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_1     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_2     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS final_amount   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS coupon_code    TEXT,
  ADD COLUMN IF NOT EXISTS campaign       TEXT,
  ADD COLUMN IF NOT EXISTS employee_id    TEXT,
  ADD COLUMN IF NOT EXISTS lens_included  BOOLEAN,
  ADD COLUMN IF NOT EXISTS lens_category  TEXT,
  ADD COLUMN IF NOT EXISTS order_number   TEXT,
  ADD COLUMN IF NOT EXISTS sync_filename  TEXT;

-- source_ref already exists — just update its comment

COMMENT ON COLUMN inventory_logs.sale_amount   IS 'Access sale: full price before discounts';
COMMENT ON COLUMN inventory_logs.discount      IS 'Access sale: fixed discount (soldiers etc)';
COMMENT ON COLUMN inventory_logs.discount_1    IS 'Access sale: first additional discount';
COMMENT ON COLUMN inventory_logs.discount_2    IS 'Access sale: second additional discount';
COMMENT ON COLUMN inventory_logs.final_amount  IS 'Access sale: final price paid';
COMMENT ON COLUMN inventory_logs.coupon_code   IS 'Access sale: coupon code used';
COMMENT ON COLUMN inventory_logs.campaign      IS 'Access sale: campaign name';
COMMENT ON COLUMN inventory_logs.employee_id   IS 'Access sale: employee who made the sale';
COMMENT ON COLUMN inventory_logs.lens_included IS 'Access sale: lenses included with frame';
COMMENT ON COLUMN inventory_logs.lens_category IS 'Access sale: lens category';
COMMENT ON COLUMN inventory_logs.order_number  IS 'Access sale: POS order number';
COMMENT ON COLUMN inventory_logs.source_ref    IS 'Origin: watcher | manual | null for regular ops';
COMMENT ON COLUMN inventory_logs.sync_filename IS 'Source Excel filename from Access';
