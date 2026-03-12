-- ============================================================
-- Migration 019 — Phase 3.75 Step 4: NOT NULL + Indexes
-- ============================================================

-- NOT NULL constraints (backfill verified — safe to apply)
ALTER TABLE inventory            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE inventory_logs       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE inventory_images     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE brands               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE suppliers            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employees            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_orders      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_order_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE goods_receipts       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE goods_receipt_items  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE stock_counts         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE stock_count_items    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sync_log             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pending_sales        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE watcher_heartbeat    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE roles                ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE permissions          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE role_permissions     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_roles       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE auth_sessions        ALTER COLUMN tenant_id SET NOT NULL;

-- Single indexes
CREATE INDEX IF NOT EXISTS idx_inventory_tenant            ON inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_tenant       ON inventory_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_images_tenant     ON inventory_images(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_tenant               ON brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant            ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant            ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant      ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_tenant ON purchase_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant       ON goods_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_tenant  ON goods_receipt_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_tenant         ON stock_counts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_tenant    ON stock_count_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant             ON sync_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_sales_tenant        ON pending_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_watcher_heartbeat_tenant    ON watcher_heartbeat(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant                ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_permissions_tenant          ON permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant     ON role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_roles_tenant       ON employee_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_tenant        ON auth_sessions(tenant_id);

-- Composite indexes (frequent query patterns)
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_barcode     ON inventory(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_brand       ON inventory(tenant_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_tenant_date   ON inventory_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_sup   ON purchase_orders(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_pin         ON employees(tenant_id, pin);

-- Verify NOT NULL applied correctly
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE column_name = 'tenant_id'
  AND table_schema = 'public'
ORDER BY table_name;
