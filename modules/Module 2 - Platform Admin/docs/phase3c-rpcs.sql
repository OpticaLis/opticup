-- ============================================================
-- Module 2 Phase 3c: Support RPCs
-- Run in Supabase Dashboard SQL Editor (requires service role)
-- ============================================================

-- ============================================================
-- RPC 1: get_tenant_activity_log(...)
-- Returns paginated activity_log entries for a tenant with filters.
-- Used by admin-activity-viewer.js.
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_activity_log(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_level TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
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
    SELECT jsonb_build_object(
      'total', (
        SELECT COUNT(*) FROM activity_log
        WHERE tenant_id = p_tenant_id
          AND (p_level IS NULL OR level = p_level)
          AND (p_entity_type IS NULL OR entity_type = p_entity_type)
          AND (p_date_from IS NULL OR created_at >= p_date_from)
          AND (p_date_to IS NULL OR created_at <= p_date_to)
      ),
      'entries', (
        SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', al.id,
            'level', al.level,
            'action', al.action,
            'entity_type', al.entity_type,
            'entity_id', al.entity_id,
            'details', al.details,
            'user_id', al.user_id,
            'created_at', al.created_at
          ) AS row_data
          FROM activity_log al
          WHERE al.tenant_id = p_tenant_id
            AND (p_level IS NULL OR al.level = p_level)
            AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
            AND (p_date_from IS NULL OR al.created_at >= p_date_from)
            AND (p_date_to IS NULL OR al.created_at <= p_date_to)
          ORDER BY al.created_at DESC
          LIMIT p_limit
          OFFSET p_offset
        ) sub
      )
    )
  );
END;
$$;

-- ============================================================
-- RPC 2: get_tenant_employees(p_tenant_id)
-- Returns minimal employee list for PIN reset dropdown.
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_employees(p_tenant_id UUID)
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
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', id, 'name', name)
    ), '[]'::jsonb)
    FROM employees
    WHERE tenant_id = p_tenant_id
  );
END;
$$;

-- ============================================================
-- RPC 3: reset_employee_pin(...)
-- Resets PIN, unlocks employee, optionally forces PIN change.
-- Does NOT log new PIN in audit (security).
-- ============================================================

CREATE OR REPLACE FUNCTION reset_employee_pin(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_new_pin TEXT,
  p_must_change BOOLEAN DEFAULT true,
  p_admin_id UUID DEFAULT NULL
)
RETURNS VOID
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

  -- Verify employee belongs to tenant
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Employee not found in tenant';
  END IF;

  UPDATE employees SET
    pin = p_new_pin,
    must_change_pin = p_must_change,
    failed_attempts = 0,
    locked_until = NULL
  WHERE id = p_employee_id AND tenant_id = p_tenant_id;

  -- Audit — deliberately omit new PIN value for security
  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.reset_pin', p_tenant_id,
    jsonb_build_object('employee_id', p_employee_id, 'must_change_pin', p_must_change));
END;
$$;
