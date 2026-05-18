-- M1 Lens — SPEC M1_LENS_DB_SCHEMA_RECEIPTS_NOTES Commit 2
-- Adds the has_no_invoice flag to purchase_receipt for Brief decision #14
-- (delivery note mandatory + "אין תעודה" UI checkbox flows to bookkeeper's
-- Invoices Inbox via this column).

ALTER TABLE purchase_receipt
  ADD COLUMN has_no_invoice BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN purchase_receipt.has_no_invoice IS
  'TRUE when the user checked "אין תעודה" during receipt entry. Triggers manager-audit exception flow on the bookkeeper Invoices Inbox screen. Per Brief decision 14.';
