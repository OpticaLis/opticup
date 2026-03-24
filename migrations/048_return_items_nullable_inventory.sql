-- Migration 048: Make inventory_id nullable on supplier_return_items
-- Reason: Returns created from PO comparison (item marked "להחזרה") may not
-- have an inventory_id if the item was new and never entered inventory.
-- Previously this caused a NOT NULL violation, silently preventing return creation.

ALTER TABLE supplier_return_items
  ALTER COLUMN inventory_id DROP NOT NULL;
