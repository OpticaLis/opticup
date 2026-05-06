-- 068_receipt_items_sort_order.sql
-- RECEIPT_FORM_FIXES_FROM_MANAGER §8 / Amendment 1 — item 15
-- Adds nullable sort_order to goods_receipt_items so the entry order
-- typed by the receiver (= physical tray order) is preserved across
-- save/reload/barcode-export. Idempotent: safe to re-run.
--
-- NOTE on numbering: SPEC §8 originally referenced this as "063_*",
-- but 063 is already taken by 063_storefront_rls_tenant_isolation.sql.
-- Next available numeric slot in `./migrations/` is 068. Documented in
-- EXECUTION_REPORT §"Decisions made in real time".

ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS sort_order INT;

CREATE INDEX IF NOT EXISTS idx_rcpt_items_sort
  ON goods_receipt_items (receipt_id, sort_order);

COMMENT ON COLUMN goods_receipt_items.sort_order IS
  'Manager-typed entry order, 1-based ascending. NULL for rows confirmed before SPEC RECEIPT_FORM_FIXES_FROM_MANAGER (2026-05-06); fall back to id ASC. RLS unchanged (service_bypass + tenant_isolation).';
