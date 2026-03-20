-- Migration 035: Make barcode UNIQUE per tenant, not globally
-- Previously: CREATE UNIQUE INDEX idx_inventory_barcode_unique ON inventory (barcode) WHERE barcode IS NOT NULL
-- Problem: Global uniqueness prevents multi-tenant data from coexisting (demo + prizma can't share barcodes)
-- Fix: Drop global index, add composite UNIQUE (barcode, tenant_id)

DROP INDEX IF EXISTS idx_inventory_barcode_unique;
ALTER TABLE inventory ADD CONSTRAINT inventory_barcode_tenant_key UNIQUE (barcode, tenant_id);
