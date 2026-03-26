-- ============================================================
-- Module 2 Phase 3b: Action RPCs
-- Run in Supabase Dashboard SQL Editor (requires service role)
-- ============================================================

-- ============================================================
-- RPC 1: suspend_tenant(p_tenant_id, p_reason, p_admin_id)
-- Suspends an active tenant. Logs reason to platform_audit_log.
-- ============================================================

CREATE OR REPLACE FUNCTION suspend_tenant(
  p_tenant_id UUID,
  p_reason TEXT,
  p_admin_id UUID
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

  -- Verify tenant exists and is active
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status = 'active') THEN
    RAISE EXCEPTION 'Tenant not found or not active';
  END IF;

  UPDATE tenants SET
    status = 'suspended',
    suspended_reason = p_reason
  WHERE id = p_tenant_id;

  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.suspend', p_tenant_id,
    jsonb_build_object('reason', p_reason));
END;
$$;

-- ============================================================
-- RPC 2: activate_tenant(p_tenant_id, p_admin_id)
-- Activates a suspended or trial tenant.
-- ============================================================

CREATE OR REPLACE FUNCTION activate_tenant(
  p_tenant_id UUID,
  p_admin_id UUID
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

  -- Verify tenant exists and is suspended or trial
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status IN ('suspended', 'trial')) THEN
    RAISE EXCEPTION 'Tenant not found or not suspended/trial';
  END IF;

  UPDATE tenants SET
    status = 'active',
    suspended_reason = NULL
  WHERE id = p_tenant_id;

  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.activate', p_tenant_id, '{}');
END;
$$;

-- ============================================================
-- RPC 3: update_tenant(p_tenant_id, p_updates, p_admin_id)
-- Updates allowed tenant fields. Captures old values for audit.
-- Allowed: name, owner_name, owner_email, owner_phone, plan_id, trial_ends_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_tenant(
  p_tenant_id UUID,
  p_updates JSONB,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_fields TEXT[] := ARRAY['name', 'owner_name', 'owner_email', 'owner_phone', 'plan_id', 'trial_ends_at'];
  v_field TEXT;
  v_old_values JSONB;
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_super_admin() AND NOT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Verify tenant exists and is not deleted
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status != 'deleted') THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Validate all fields are in whitelist
  FOR v_field IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT v_field = ANY(v_allowed_fields) THEN
      RAISE EXCEPTION 'Field % is not editable', v_field;
    END IF;
  END LOOP;

  -- Capture old values for audit diff
  SELECT jsonb_build_object(
    'name', name,
    'owner_name', owner_name,
    'owner_email', owner_email,
    'owner_phone', owner_phone,
    'plan_id', plan_id,
    'trial_ends_at', trial_ends_at
  ) INTO v_old_values
  FROM tenants WHERE id = p_tenant_id;

  -- Apply updates field by field
  IF p_updates ? 'name' THEN
    UPDATE tenants SET name = p_updates->>'name' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'owner_name' THEN
    UPDATE tenants SET owner_name = p_updates->>'owner_name' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'owner_email' THEN
    UPDATE tenants SET owner_email = p_updates->>'owner_email' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'owner_phone' THEN
    UPDATE tenants SET owner_phone = p_updates->>'owner_phone' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'plan_id' THEN
    UPDATE tenants SET plan_id = (p_updates->>'plan_id')::uuid WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'trial_ends_at' THEN
    UPDATE tenants SET trial_ends_at = (p_updates->>'trial_ends_at')::timestamptz WHERE id = p_tenant_id;
  END IF;

  -- Audit log with old + new values
  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.update', p_tenant_id,
    jsonb_build_object('old', v_old_values, 'new', p_updates));
END;
$$;
