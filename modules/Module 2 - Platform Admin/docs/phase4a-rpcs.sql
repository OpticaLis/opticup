-- ============================================================
-- Phase 4a: Plan Limit & Feature Check RPCs
-- Module 2 — Platform Admin
-- Date: 2026-03-26
-- Status: Reference SQL — copy-paste to Supabase Dashboard SQL Editor
-- ============================================================

-- ============================================================
-- RPC 1: check_plan_limit(p_tenant_id, p_resource) → JSONB
-- ============================================================
-- Checks whether a tenant can create more of a given resource
-- based on their plan's limits JSONB.
--
-- Resource keys: employees, inventory, suppliers,
--   documents_per_month, storage_mb, ocr_scans_monthly, branches
--
-- Return value:
--   { allowed: bool, current: int, limit: int, remaining: int, message: string|null }
--
-- Fail-safe behavior:
--   - No plan assigned → allowed (limit = -1)
--   - Limit key missing or -1 → unlimited (allowed)
--   - Unknown resource → current = 0, allowed
--
-- SECURITY DEFINER: bypasses RLS to count across tenant tables.
-- ============================================================

CREATE OR REPLACE FUNCTION check_plan_limit(
  p_tenant_id UUID,
  p_resource TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_limits JSONB;
  v_limit INTEGER;
  v_current INTEGER;
  v_limit_key TEXT;
BEGIN
  -- -------------------------------------------------------
  -- Step 1: Get plan limits for this tenant
  -- JOIN tenants → plans to read the limits JSONB
  -- -------------------------------------------------------
  SELECT p.limits INTO v_plan_limits
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = p_tenant_id;

  -- No plan assigned (NULL plan_id or tenant not found) → fail-safe allow
  IF v_plan_limits IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current', 0,
      'limit', -1,
      'remaining', -1,
      'message', NULL
    );
  END IF;

  -- -------------------------------------------------------
  -- Step 2: Map resource name to limit key
  -- Convention: resource 'employees' → limit key 'max_employees'
  -- -------------------------------------------------------
  v_limit_key := 'max_' || p_resource;
  v_limit := (v_plan_limits->>v_limit_key)::integer;

  -- Limit not defined or -1 = unlimited → allow
  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current', 0,
      'limit', -1,
      'remaining', -1,
      'message', NULL
    );
  END IF;

  -- -------------------------------------------------------
  -- Step 3: Count current usage per resource type
  -- Each resource maps to a specific table + filter
  -- -------------------------------------------------------
  v_current := CASE p_resource
    WHEN 'employees' THEN
      (SELECT COUNT(*) FROM employees WHERE tenant_id = p_tenant_id)

    WHEN 'inventory' THEN
      (SELECT COUNT(*) FROM inventory WHERE tenant_id = p_tenant_id AND is_deleted = false)

    WHEN 'suppliers' THEN
      (SELECT COUNT(*) FROM suppliers WHERE tenant_id = p_tenant_id AND active = true)

    WHEN 'documents_per_month' THEN
      (SELECT COUNT(*) FROM supplier_documents
       WHERE tenant_id = p_tenant_id
       AND created_at >= date_trunc('month', now()))

    WHEN 'storage_mb' THEN
      0  -- placeholder — actual storage calculation in future module

    WHEN 'ocr_scans_monthly' THEN
      (SELECT COUNT(*) FROM ocr_extractions
       WHERE tenant_id = p_tenant_id
       AND created_at >= date_trunc('month', now()))

    WHEN 'branches' THEN
      1  -- single branch for now — multi-branch in future module

    ELSE
      0  -- unknown resource → 0 current usage
  END;

  -- -------------------------------------------------------
  -- Step 4: Build and return result
  -- allowed = current < limit (strict less-than)
  -- message = Hebrew limit reached string when blocked
  -- -------------------------------------------------------
  RETURN jsonb_build_object(
    'allowed', v_current < v_limit,
    'current', v_current,
    'limit', v_limit,
    'remaining', GREATEST(v_limit - v_current, 0),
    'message', CASE
      WHEN v_current >= v_limit THEN
        'הגעת למגבלה (' || v_current || '/' || v_limit || ')'
      ELSE NULL
    END
  );
END;
$$;

-- Grant execute to both anon and authenticated roles
-- (ERP calls via authenticated JWT, admin calls via anon+Supabase Auth)
GRANT EXECUTE ON FUNCTION check_plan_limit(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_plan_limit(UUID, TEXT) TO authenticated;


-- ============================================================
-- RPC 2: is_feature_enabled(p_tenant_id, p_feature) → BOOLEAN
-- ============================================================
-- Checks whether a specific feature is enabled for a tenant.
--
-- Priority chain (first non-null wins):
--   1. tenant_config WHERE key='feature_overrides' → value->>feature
--   2. plan.features->>feature (via tenants→plans JOIN)
--   3. Default: true (fail-safe — never block by accident)
--
-- 17 features defined in plan seed data:
--   inventory, purchasing, goods_receipts, stock_count, supplier_debt,
--   ocr, ai_alerts, shipments, access_sync, image_studio,
--   storefront, b2b_marketplace, api_access, white_label,
--   custom_domain, advanced_reports, whatsapp
--
-- Admin can override per-tenant via tenant_config:
--   key = 'feature_overrides', value = {"ocr": true, "ai_alerts": true}
--
-- SECURITY DEFINER: bypasses RLS to read tenant_config + plans.
-- ============================================================

CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_tenant_id UUID,
  p_feature TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_features JSONB;
  v_override_value BOOLEAN;
BEGIN
  -- -------------------------------------------------------
  -- Step 1: Check tenant-level override first
  -- tenant_config WHERE key='feature_overrides' is a JSONB
  -- with feature names as keys and booleans as values.
  -- If an override exists for this feature → use it.
  -- -------------------------------------------------------
  SELECT (value->>p_feature)::boolean INTO v_override_value
  FROM tenant_config
  WHERE tenant_id = p_tenant_id AND key = 'feature_overrides';

  IF v_override_value IS NOT NULL THEN
    RETURN v_override_value;
  END IF;

  -- -------------------------------------------------------
  -- Step 2: Fall back to plan features
  -- JOIN tenants → plans to read the features JSONB
  -- -------------------------------------------------------
  SELECT p.features INTO v_plan_features
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = p_tenant_id;

  -- No plan assigned → fail-safe allow
  IF v_plan_features IS NULL THEN
    RETURN true;
  END IF;

  -- -------------------------------------------------------
  -- Step 3: Check if feature exists in plan's features JSONB
  -- The ? operator checks key existence
  -- -------------------------------------------------------
  IF v_plan_features ? p_feature THEN
    RETURN (v_plan_features->>p_feature)::boolean;
  END IF;

  -- -------------------------------------------------------
  -- Step 4: Feature not defined in plan → fail-safe allow
  -- Better to let a tenant use a feature than block by mistake
  -- -------------------------------------------------------
  RETURN true;
END;
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION is_feature_enabled(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION is_feature_enabled(UUID, TEXT) TO authenticated;
