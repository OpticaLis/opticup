-- ============================================================
-- Migration 018 — Phase 3.75 Steps 2+3: Add tenant_id + Backfill
-- ============================================================

-- Step 2: Add tenant_id column (nullable for now — backfill comes next)
ALTER TABLE inventory            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE inventory_logs       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE inventory_images     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE brands               ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE suppliers            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE employees            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE purchase_orders      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE goods_receipts       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE goods_receipt_items  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE stock_counts         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE stock_count_items    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sync_log             ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE pending_sales        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE watcher_heartbeat    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE roles                ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE permissions          ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE role_permissions     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE employee_roles       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE auth_sessions        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 3: Backfill all rows with Prizma's tenant_id
DO $$
DECLARE
  prizma_id UUID := '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
BEGIN
  UPDATE inventory            SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE inventory_logs       SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE inventory_images     SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE brands               SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE suppliers            SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE employees            SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE purchase_orders      SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE purchase_order_items SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE goods_receipts       SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE goods_receipt_items  SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE stock_counts         SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE stock_count_items    SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE sync_log             SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE pending_sales        SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE watcher_heartbeat    SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE roles                SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE permissions          SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE role_permissions     SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE employee_roles       SET tenant_id = prizma_id WHERE tenant_id IS NULL;
  UPDATE auth_sessions        SET tenant_id = prizma_id WHERE tenant_id IS NULL;
END $$;

-- Verify: show row counts per table to confirm backfill
SELECT 'inventory'            AS tbl, COUNT(*) total, COUNT(tenant_id) filled FROM inventory
UNION ALL SELECT 'inventory_logs',       COUNT(*), COUNT(tenant_id) FROM inventory_logs
UNION ALL SELECT 'inventory_images',     COUNT(*), COUNT(tenant_id) FROM inventory_images
UNION ALL SELECT 'brands',               COUNT(*), COUNT(tenant_id) FROM brands
UNION ALL SELECT 'suppliers',            COUNT(*), COUNT(tenant_id) FROM suppliers
UNION ALL SELECT 'employees',            COUNT(*), COUNT(tenant_id) FROM employees
UNION ALL SELECT 'purchase_orders',      COUNT(*), COUNT(tenant_id) FROM purchase_orders
UNION ALL SELECT 'purchase_order_items', COUNT(*), COUNT(tenant_id) FROM purchase_order_items
UNION ALL SELECT 'goods_receipts',       COUNT(*), COUNT(tenant_id) FROM goods_receipts
UNION ALL SELECT 'goods_receipt_items',  COUNT(*), COUNT(tenant_id) FROM goods_receipt_items
UNION ALL SELECT 'stock_counts',         COUNT(*), COUNT(tenant_id) FROM stock_counts
UNION ALL SELECT 'stock_count_items',    COUNT(*), COUNT(tenant_id) FROM stock_count_items
UNION ALL SELECT 'sync_log',             COUNT(*), COUNT(tenant_id) FROM sync_log
UNION ALL SELECT 'pending_sales',        COUNT(*), COUNT(tenant_id) FROM pending_sales
UNION ALL SELECT 'watcher_heartbeat',    COUNT(*), COUNT(tenant_id) FROM watcher_heartbeat
UNION ALL SELECT 'roles',                COUNT(*), COUNT(tenant_id) FROM roles
UNION ALL SELECT 'permissions',          COUNT(*), COUNT(tenant_id) FROM permissions
UNION ALL SELECT 'role_permissions',     COUNT(*), COUNT(tenant_id) FROM role_permissions
UNION ALL SELECT 'employee_roles',       COUNT(*), COUNT(tenant_id) FROM employee_roles
UNION ALL SELECT 'auth_sessions',        COUNT(*), COUNT(tenant_id) FROM auth_sessions;
