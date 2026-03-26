-- ============================================================
-- Module 2 Phase 3a: Dashboard RPCs
-- Run in Supabase Dashboard SQL Editor (requires service role)
-- ============================================================

-- ============================================================
-- RPC 1: get_all_tenants_overview()
-- Returns JSONB array of all non-deleted tenants with stats.
-- Used by admin-dashboard.js tenant table.
-- ============================================================

CREATE OR REPLACE FUNCTION get_all_tenants_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_super_admin() AND NOT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'status', t.status,
        'plan_name', p.display_name,
        'plan_id', t.plan_id,
        'owner_name', t.owner_name,
        'owner_email', t.owner_email,
        'owner_phone', t.owner_phone,
        'created_at', t.created_at,
        'last_active', t.last_active,
        'trial_ends_at', t.trial_ends_at,
        'suspended_reason', t.suspended_reason,
        'employees_count', (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id),
        'inventory_count', (SELECT COUNT(*) FROM inventory WHERE tenant_id = t.id AND is_deleted = false),
        'suppliers_count', (SELECT COUNT(*) FROM suppliers WHERE tenant_id = t.id AND active = true)
      ) AS row_data
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE t.status != 'deleted'
      ORDER BY t.created_at DESC
    ) sub
  );
END;
$$;

-- ============================================================
-- RPC 2: get_tenant_stats(p_tenant_id UUID)
-- Returns JSONB object with resource counts for a single tenant.
-- Used by admin-tenant-detail.js usage stats section.
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_stats(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_super_admin() AND NOT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN jsonb_build_object(
    'employees_count', (SELECT COUNT(*) FROM employees WHERE tenant_id = p_tenant_id),
    'inventory_count', (SELECT COUNT(*) FROM inventory WHERE tenant_id = p_tenant_id AND is_deleted = false),
    'suppliers_count', (SELECT COUNT(*) FROM suppliers WHERE tenant_id = p_tenant_id AND active = true),
    'documents_count', (SELECT COUNT(*) FROM supplier_documents WHERE tenant_id = p_tenant_id),
    'brands_count', (SELECT COUNT(*) FROM brands WHERE tenant_id = p_tenant_id AND active = true)
  );
END;
$$;
