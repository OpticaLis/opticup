-- Module 2: Platform Admin — DB Schema
-- Last updated: 2026-03-26 (Phase 4 complete)
-- This reflects the ACTUAL deployed schema including all RPCs and RLS policies.

-- ============================================================
-- SECURITY DEFINER function (must exist before RLS policies)
-- ============================================================

CREATE OR REPLACE FUNCTION is_platform_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid()
    AND role = 'super_admin'
    AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Table 1: plans (global — no tenant_id)
-- ============================================================

CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  limits JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_read ON plans
  FOR SELECT USING (true);

CREATE POLICY plans_admin_write ON plans
  FOR ALL USING (is_platform_super_admin());

-- Seed data
INSERT INTO plans (name, display_name, limits, features, sort_order) VALUES
('basic', 'בסיסי',
  '{"max_employees": 5, "max_inventory": 1000, "max_suppliers": 20, "max_documents_per_month": 50, "max_storage_mb": 500, "max_ocr_scans_monthly": 20, "max_branches": 1}',
  '{"inventory": true, "purchasing": true, "goods_receipts": true, "stock_count": true, "supplier_debt": true, "ocr": true, "ai_alerts": false, "shipments": true, "access_sync": false, "image_studio": false, "storefront": false, "b2b_marketplace": false, "api_access": false, "white_label": false, "custom_domain": false, "advanced_reports": false, "whatsapp": false}',
  1),
('premium', 'פרימיום',
  '{"max_employees": 20, "max_inventory": 10000, "max_suppliers": 100, "max_documents_per_month": 500, "max_storage_mb": 5000, "max_ocr_scans_monthly": 200, "max_branches": 3}',
  '{"inventory": true, "purchasing": true, "goods_receipts": true, "stock_count": true, "supplier_debt": true, "ocr": true, "ai_alerts": true, "shipments": true, "access_sync": true, "image_studio": true, "storefront": true, "b2b_marketplace": false, "api_access": false, "white_label": false, "custom_domain": false, "advanced_reports": true, "whatsapp": true}',
  2),
('enterprise', 'ארגוני',
  '{"max_employees": -1, "max_inventory": -1, "max_suppliers": -1, "max_documents_per_month": -1, "max_storage_mb": -1, "max_ocr_scans_monthly": -1, "max_branches": -1}',
  '{"inventory": true, "purchasing": true, "goods_receipts": true, "stock_count": true, "supplier_debt": true, "ocr": true, "ai_alerts": true, "shipments": true, "access_sync": true, "image_studio": true, "storefront": true, "b2b_marketplace": true, "api_access": true, "white_label": true, "custom_domain": true, "advanced_reports": true, "whatsapp": true}',
  3);

-- ============================================================
-- Table 2: platform_admins (global — no tenant_id)
-- ============================================================

CREATE TABLE platform_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'support', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Non-recursive read: each admin reads only their own row
CREATE POLICY platform_admins_read ON platform_admins
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Write: super_admin only, via SECURITY DEFINER to avoid recursion
CREATE POLICY platform_admins_super_write ON platform_admins
  FOR ALL USING (is_platform_super_admin());

-- ============================================================
-- Table 3: platform_audit_log (global — no tenant_id)
-- ============================================================

CREATE TABLE platform_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES platform_admins(id),
  action TEXT NOT NULL,
  target_tenant_id UUID REFERENCES tenants(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_admin_read ON platform_audit_log
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );

CREATE POLICY audit_log_admin_insert ON platform_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Table 4: tenant_config (tenant-scoped — has tenant_id)
-- ============================================================

CREATE TABLE tenant_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, key)
);

ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_config_tenant_read ON tenant_config
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_config_admin_access ON tenant_config
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );

-- ============================================================
-- Table 5: tenant_provisioning_log (admin-only)
-- ============================================================

CREATE TABLE tenant_provisioning_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  step TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenant_provisioning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY provisioning_log_admin_read ON tenant_provisioning_log
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );

-- ============================================================
-- tenants table extensions (10 new columns)
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'trial', 'suspended', 'deleted'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES platform_admins(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;

-- Migration: assign enterprise plan to existing tenants
UPDATE tenants SET plan_id = (SELECT id FROM plans WHERE name = 'enterprise')
  WHERE plan_id IS NULL;
UPDATE tenants SET status = 'active'
  WHERE status IS NULL;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_platform_admins_auth_user ON platform_admins(auth_user_id);
CREATE INDEX idx_platform_admins_email ON platform_admins(email);
CREATE INDEX idx_platform_audit_log_admin ON platform_audit_log(admin_id);
CREATE INDEX idx_platform_audit_log_tenant ON platform_audit_log(target_tenant_id);
CREATE INDEX idx_platform_audit_log_created ON platform_audit_log(created_at DESC);
CREATE INDEX idx_tenant_config_tenant ON tenant_config(tenant_id);
CREATE INDEX idx_tenant_config_key ON tenant_config(tenant_id, key);
CREATE INDEX idx_provisioning_log_tenant ON tenant_provisioning_log(tenant_id);
CREATE INDEX idx_tenants_plan ON tenants(plan_id);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================
-- Phase 2: Tenant Provisioning — Schema changes
-- ============================================================

-- employees.must_change_pin
ALTER TABLE employees ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN DEFAULT false;

-- tenant_provisioning_log.tenant_id nullable (for failure logging)
ALTER TABLE tenant_provisioning_log ALTER COLUMN tenant_id DROP NOT NULL;

-- provisioning_log INSERT policy for admins
CREATE POLICY provisioning_log_admin_insert ON tenant_provisioning_log
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );

-- ============================================================
-- Phase 2: RPCs
-- Full SQL in: docs/create_tenant_rpc.sql
-- ============================================================

-- validate_slug(p_slug TEXT) → JSONB {valid, reason}
-- SECURITY DEFINER. Checks format (3-30 chars, a-z0-9-), 22 reserved words, uniqueness.

-- create_tenant(...) → UUID
-- SECURITY DEFINER. 10-step atomic provisioning:
--   1. validate_slug  2. INSERT tenants  3. INSERT tenant_config (6)
--   4. INSERT roles (5)  5. INSERT permissions (57)  6. INSERT role_permissions
--   7. INSERT employees (1, must_change_pin=true)  8. INSERT employee_roles
--   9. INSERT document_types (5)  10. INSERT payment_methods (5)

-- delete_tenant(p_tenant_id UUID, p_deleted_by UUID) → void
-- SECURITY DEFINER. Soft delete: status='deleted', deleted_at=now().

-- ============================================================
-- Phase 3a: Dashboard RPCs
-- Full SQL in: docs/phase3a-rpcs.sql
-- ============================================================

-- get_all_tenants_overview() → JSONB array
-- SECURITY DEFINER. Returns all non-deleted tenants with plan name (LEFT JOIN),
-- employees/inventory/suppliers counts. Ordered by created_at DESC.

-- get_tenant_stats(p_tenant_id UUID) → JSONB object
-- SECURITY DEFINER. Returns employees_count, inventory_count (is_deleted=false),
-- suppliers_count (active=true), documents_count, brands_count (active=true).

-- ============================================================
-- Phase 3b: Action RPCs
-- Full SQL in: docs/phase3b-rpcs.sql
-- ============================================================

-- suspend_tenant(p_tenant_id UUID, p_reason TEXT, p_admin_id UUID) → void
-- SECURITY DEFINER. Verifies status='active', sets status='suspended' + reason.
-- Writes platform_audit_log with reason.

-- activate_tenant(p_tenant_id UUID, p_admin_id UUID) → void
-- SECURITY DEFINER. Verifies status IN ('suspended','trial'), sets status='active',
-- clears suspended_reason. Writes platform_audit_log.

-- update_tenant(p_tenant_id UUID, p_updates JSONB, p_admin_id UUID) → void
-- SECURITY DEFINER. Whitelist: name, owner_name, owner_email, owner_phone, plan_id,
-- trial_ends_at. Captures old values, applies per-field, writes audit with old+new diff.

-- ============================================================
-- Phase 3c: Support RPCs
-- Full SQL in: docs/phase3c-rpcs.sql
-- ============================================================

-- get_tenant_activity_log(p_tenant_id, p_limit, p_offset, p_level, p_entity_type, p_date_from, p_date_to) → JSONB {total, entries}
-- SECURITY DEFINER. Paginated activity_log for a tenant with optional filters.
-- Returns total count + entries array for pagination UI.

-- get_tenant_employees(p_tenant_id UUID) → JSONB array [{id, name}]
-- SECURITY DEFINER. Minimal employee list for PIN reset dropdown.

-- reset_employee_pin(p_tenant_id, p_employee_id, p_new_pin, p_must_change, p_admin_id) → void
-- SECURITY DEFINER. Verifies employee belongs to tenant, resets PIN + unlock.
-- Audit log does NOT include new PIN (security).

-- ============================================================
-- Phase 4: Plans & Limits RPCs
-- Full SQL in: docs/phase4a-rpcs.sql
-- ============================================================

-- check_plan_limit(p_tenant_id UUID, p_resource TEXT) → JSONB
-- SECURITY DEFINER, search_path = public.
-- Gets plan limits via tenants→plans JOIN.
-- Maps resource to 'max_' || p_resource limit key.
-- Counts current usage per resource:
--   employees → COUNT(*) FROM employees WHERE tenant_id
--   inventory → COUNT(*) FROM inventory WHERE tenant_id AND is_deleted = false
--   suppliers → COUNT(*) FROM suppliers WHERE tenant_id AND active = true
--   documents_per_month → COUNT(*) FROM supplier_documents WHERE tenant_id AND current month
--   storage_mb → 0 (placeholder)
--   ocr_scans_monthly → COUNT(*) FROM ocr_extractions WHERE tenant_id AND current month
--   branches → 1 (hardcoded, future multi-branch)
-- No plan / null limit / -1 = unlimited → allowed: true
-- Returns: { allowed, current, limit, remaining, message }
-- message = 'הגעת למגבלה (X/Y)' when blocked, null when allowed

-- is_feature_enabled(p_tenant_id UUID, p_feature TEXT) → BOOLEAN
-- SECURITY DEFINER, search_path = public.
-- Priority: tenant_config feature_overrides → plan.features → fail-safe true.
-- Step 1: Check tenant_config WHERE key='feature_overrides', extract p_feature
-- Step 2: If no override → check plan.features via tenants→plans JOIN
-- Step 3: If plan has no features / feature not defined → return true (fail-safe)

-- GRANT EXECUTE on both functions to anon and authenticated roles.
