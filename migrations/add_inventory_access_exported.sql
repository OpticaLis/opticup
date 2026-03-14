ALTER TABLE inventory ADD COLUMN IF NOT EXISTS access_exported BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inventory_access_unexported
   ON inventory(tenant_id, access_exported)
   WHERE access_exported = false AND is_deleted = false;
