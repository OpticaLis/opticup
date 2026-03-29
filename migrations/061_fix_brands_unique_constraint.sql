-- 061: Fix brands UNIQUE constraint to include tenant_id
-- Run date: 2026-03-29
-- Without tenant_id, two tenants can't have brands with the same name

ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_name_key;
ALTER TABLE brands ADD CONSTRAINT brands_name_tenant_key UNIQUE (name, tenant_id);
