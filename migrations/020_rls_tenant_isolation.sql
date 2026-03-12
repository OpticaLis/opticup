-- ============================================================
-- Migration 020 — Phase 3.75 Step 5: RLS Tenant Isolation
-- ============================================================
-- Replaces all wide-open USING(true) policies with JWT-based
-- tenant isolation. Each table gets exactly 2 policies:
--   1. tenant_isolation — reads tenant_id from JWT claims
--   2. service_bypass — full access for service_role (migrations/admin)
-- ============================================================

-- =====================
-- DROP all existing policies on our 20 tables
-- =====================
DROP POLICY IF EXISTS all_auth_sessions ON auth_sessions;
DROP POLICY IF EXISTS anon_all_brands ON brands;
DROP POLICY IF EXISTS all_employee_roles ON employee_roles;
DROP POLICY IF EXISTS employees_delete ON employees;
DROP POLICY IF EXISTS employees_insert ON employees;
DROP POLICY IF EXISTS employees_select ON employees;
DROP POLICY IF EXISTS employees_update ON employees;
DROP POLICY IF EXISTS all_goods_receipt_items ON goods_receipt_items;
DROP POLICY IF EXISTS all_goods_receipts ON goods_receipts;
DROP POLICY IF EXISTS anon_all_inventory ON inventory;
DROP POLICY IF EXISTS anon_all_inv_images ON inventory_images;
DROP POLICY IF EXISTS logs_delete ON inventory_logs;
DROP POLICY IF EXISTS logs_insert ON inventory_logs;
DROP POLICY IF EXISTS logs_select ON inventory_logs;
DROP POLICY IF EXISTS logs_update ON inventory_logs;
DROP POLICY IF EXISTS all_pending_sales ON pending_sales;
DROP POLICY IF EXISTS all_permissions ON permissions;
DROP POLICY IF EXISTS all_po_items ON purchase_order_items;
DROP POLICY IF EXISTS all_purchase_orders ON purchase_orders;
DROP POLICY IF EXISTS all_role_permissions ON role_permissions;
DROP POLICY IF EXISTS all_roles ON roles;
DROP POLICY IF EXISTS all_sc_items ON stock_count_items;
DROP POLICY IF EXISTS all_stock_counts ON stock_counts;
DROP POLICY IF EXISTS anon_all_suppliers ON suppliers;
DROP POLICY IF EXISTS all_sync_log ON sync_log;
DROP POLICY IF EXISTS all_watcher_heartbeat ON watcher_heartbeat;

-- =====================
-- ENABLE RLS on all tables (idempotent)
-- =====================
ALTER TABLE inventory            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands               ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_sales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE watcher_heartbeat    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions        ENABLE ROW LEVEL SECURITY;

-- =====================
-- CREATE tenant isolation policies (JWT-based)
-- =====================
CREATE POLICY tenant_isolation ON inventory
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON inventory_logs
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON inventory_images
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON brands
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON suppliers
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON employees
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON purchase_orders
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON purchase_order_items
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON goods_receipts
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON goods_receipt_items
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON stock_counts
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON stock_count_items
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON sync_log
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON pending_sales
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON watcher_heartbeat
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON roles
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON permissions
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON role_permissions
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON employee_roles
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON auth_sessions
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- =====================
-- Service role bypass on all tables
-- =====================
CREATE POLICY service_bypass ON inventory            FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON inventory_logs       FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON inventory_images     FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON brands               FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON suppliers            FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON employees            FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON purchase_orders      FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON purchase_order_items FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON goods_receipts       FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON goods_receipt_items  FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON stock_counts         FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON stock_count_items    FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON sync_log             FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON pending_sales        FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON watcher_heartbeat    FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON roles                FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON permissions          FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON role_permissions     FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON employee_roles       FOR ALL TO service_role USING (true);
CREATE POLICY service_bypass ON auth_sessions        FOR ALL TO service_role USING (true);

-- =====================
-- Verify: show final policy count per table
-- =====================
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename NOT IN ('tenants','customers','prescriptions','sales','work_orders')
GROUP BY tablename
ORDER BY tablename;
