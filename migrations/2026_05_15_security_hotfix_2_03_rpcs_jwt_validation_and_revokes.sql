-- SECURITY_HOTFIX_2_2026_05_15 §1.3
-- 24 SECURITY DEFINER RPCs: add 3-role-aware JWT validation header (Block A) + revoke anon EXECUTE on Option B subset (16).
-- Block A-alt (slug-based) applied to verify_campaign_page_password (Option A, anon-callable kept).
-- The 7 already-non-anon-callable RPCs receive Block A only (no REVOKE needed).
-- Generated 2026-05-15 by scripts/tmp_security_hotfix_2_migration.mjs

-- §1.3 RPC: _record_touchpoint(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text, p_touchpoint_type text, p_event_id uuid, p_attendee_id uuid, p_short_link_id uuid, p_short_link_code text, p_broadcast_id uuid, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_utm_term text, p_utm_campaign_id text, p_referrer_url text, p_landing_url text, p_dedupe_key text)
CREATE OR REPLACE FUNCTION public._record_touchpoint(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text, p_touchpoint_type text, p_event_id uuid, p_attendee_id uuid, p_short_link_id uuid, p_short_link_code text, p_broadcast_id uuid, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_utm_term text, p_utm_campaign_id text, p_referrer_url text, p_landing_url text, p_dedupe_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_id uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF p_tenant_id IS NULL OR p_touchpoint_type IS NULL OR p_dedupe_key IS NULL THEN
    RAISE EXCEPTION 'tenant_id, touchpoint_type, dedupe_key required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.crm_lead_touchpoints (
    tenant_id, lead_id, phone_normalized, touchpoint_type, occurred_at,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id,
    referrer_url, landing_url, short_link_code, short_link_id, broadcast_id,
    event_id, attendee_id, dedupe_key
  )
  VALUES (
    p_tenant_id, p_lead_id, p_phone_normalized, p_touchpoint_type, now(),
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
    p_referrer_url, p_landing_url, p_short_link_code, p_short_link_id, p_broadcast_id,
    p_event_id, p_attendee_id, p_dedupe_key
  )
  ON CONFLICT (tenant_id, dedupe_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- §1.3 RPC: activate_tenant(p_tenant_id uuid, p_admin_id uuid)
CREATE OR REPLACE FUNCTION public.activate_tenant(p_tenant_id uuid, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: check_in_attendee(p_tenant_id uuid, p_attendee_id uuid)
CREATE OR REPLACE FUNCTION public.check_in_attendee(p_tenant_id uuid, p_attendee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_attendee crm_event_attendees%ROWTYPE;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT * INTO v_attendee FROM crm_event_attendees
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id AND is_deleted = false FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'attendee_not_found');
  END IF;

  IF v_attendee.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_checked_in', 'checked_in_at', v_attendee.checked_in_at);
  END IF;

  UPDATE crm_event_attendees
     SET status = 'attended', checked_in_at = now()
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('success', true, 'attendee_id', p_attendee_id, 'checked_in_at', now());
END;
$function$;

-- §1.3 RPC: check_plan_limit(p_tenant_id uuid, p_resource text)
CREATE OR REPLACE FUNCTION public.check_plan_limit(p_tenant_id uuid, p_resource text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_plan_limits JSONB;
  v_limit INTEGER;
  v_current INTEGER;
  v_limit_key TEXT;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: create_translated_page(p_tenant_id uuid, p_source_page_id uuid, p_target_lang text, p_translated_blocks jsonb, p_title text, p_slug text, p_meta_title text, p_meta_description text)
CREATE OR REPLACE FUNCTION public.create_translated_page(p_tenant_id uuid, p_source_page_id uuid, p_target_lang text, p_translated_blocks jsonb, p_title text, p_slug text, p_meta_title text DEFAULT NULL::text, p_meta_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_group_id UUID;
  v_page_type TEXT;
  v_sort_order INTEGER;
  v_tags TEXT[];
  v_campaign_id UUID;
  v_result_id UUID;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- Validate tenant
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  -- Load source page and get/create translation_group_id
  SELECT
    COALESCE(sp.translation_group_id, gen_random_uuid()),
    sp.page_type,
    sp.sort_order,
    sp.tags,
    sp.campaign_id
  INTO v_group_id, v_page_type, v_sort_order, v_tags, v_campaign_id
  FROM storefront_pages sp
  WHERE sp.id = p_source_page_id AND sp.tenant_id = p_tenant_id;

  IF v_page_type IS NULL THEN
    RAISE EXCEPTION 'Source page not found or wrong tenant';
  END IF;

  -- Ensure source page has translation_group_id
  UPDATE storefront_pages
  SET translation_group_id = v_group_id
  WHERE id = p_source_page_id AND translation_group_id IS NULL;

  -- Upsert translated page
  INSERT INTO storefront_pages (
    tenant_id, slug, lang, title, blocks, meta_title, meta_description,
    translation_group_id, translation_status, translated_from_page_id,
    page_type, sort_order, tags, campaign_id, status, updated_via
  ) VALUES (
    p_tenant_id, p_slug, p_target_lang, p_title, p_translated_blocks,
    p_meta_title, p_meta_description,
    v_group_id, 'draft', p_source_page_id,
    v_page_type, v_sort_order, v_tags, v_campaign_id, 'draft', 'api'
  )
  ON CONFLICT (tenant_id, slug, lang)
  DO UPDATE SET
    title = EXCLUDED.title,
    blocks = EXCLUDED.blocks,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description,
    translation_group_id = EXCLUDED.translation_group_id,
    translation_status = 'draft',
    translated_from_page_id = EXCLUDED.translated_from_page_id,
    updated_at = now(),
    updated_via = 'api'
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$function$;

-- §1.3 RPC: delete_tenant(p_tenant_id uuid, p_deleted_by uuid)
CREATE OR REPLACE FUNCTION public.delete_tenant(p_tenant_id uuid, p_deleted_by uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- Verify tenant exists and is not already deleted
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status != 'deleted') THEN
    RAISE EXCEPTION 'Tenant not found or already deleted';
  END IF;

  -- Soft delete
  UPDATE tenants SET
    status = 'deleted',
    deleted_at = now(),
    suspended_reason = 'Deleted by admin'
  WHERE id = p_tenant_id;
END;
$function$;

-- §1.3 RPC: generate_daily_alerts(p_tenant_id uuid)
CREATE OR REPLACE FUNCTION public.generate_daily_alerts(p_tenant_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_config RECORD;
  v_count INTEGER := 0;
  v_rows INTEGER := 0;
  v_reminder_days INTEGER;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- Load AI agent config for this tenant
  SELECT * INTO v_config
  FROM ai_agent_config
  WHERE tenant_id = p_tenant_id;

  -- If no config or alerts disabled, skip
  IF NOT FOUND OR v_config.alerts_enabled = false THEN
    RETURN json_build_object('alerts_created', 0);
  END IF;

  v_reminder_days := COALESCE(v_config.payment_reminder_days, 7);

  -- ============================================================
  -- 1. payment_overdue — past due, still open (check first so it takes priority)
  -- ============================================================
  IF v_config.overdue_alert = true THEN
    INSERT INTO alerts (tenant_id, alert_type, severity, title, message, data, entity_type, entity_id)
    SELECT
      sd.tenant_id,
      'payment_overdue',
      'critical',
      'תשלום באיחור — ' || s.name || ' ₪' || TRIM(TO_CHAR(sd.total_amount - sd.paid_amount, 'FM999,999'))
        || ' (' || (CURRENT_DATE - sd.due_date) || ' ימים)',
      'מסמך ' || sd.document_number || ' עבר את תאריך התשלום',
      json_build_object(
        'supplier_id', sd.supplier_id,
        'document_id', sd.id,
        'amount', sd.total_amount - sd.paid_amount,
        'due_date', sd.due_date,
        'days_overdue', CURRENT_DATE - sd.due_date
      )::jsonb,
      'supplier_document',
      sd.id
    FROM supplier_documents sd
    JOIN suppliers s ON s.id = sd.supplier_id
    WHERE sd.tenant_id = p_tenant_id
      AND sd.status IN ('open', 'partially_paid')
      AND sd.due_date < CURRENT_DATE
      AND sd.is_deleted = false
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.tenant_id = p_tenant_id
          AND a.alert_type = 'payment_overdue'
          AND a.entity_id = sd.id
          AND a.status IN ('unread', 'read')
      );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END IF;

  -- ============================================================
  -- 2. payment_due — due within reminder window
  -- ============================================================
  IF v_config.overdue_alert = true THEN
    INSERT INTO alerts (tenant_id, alert_type, severity, title, message, data, entity_type, entity_id)
    SELECT
      sd.tenant_id,
      'payment_due',
      'warning',
      'תשלום בעוד ' || (sd.due_date - CURRENT_DATE) || ' ימים — ' || s.name
        || ' ₪' || TRIM(TO_CHAR(sd.total_amount - sd.paid_amount, 'FM999,999')),
      'מסמך ' || sd.document_number || ' — תאריך תשלום ' || TO_CHAR(sd.due_date, 'DD/MM/YYYY'),
      json_build_object(
        'supplier_id', sd.supplier_id,
        'document_id', sd.id,
        'amount', sd.total_amount - sd.paid_amount,
        'due_date', sd.due_date,
        'days_until', sd.due_date - CURRENT_DATE
      )::jsonb,
      'supplier_document',
      sd.id
    FROM supplier_documents sd
    JOIN suppliers s ON s.id = sd.supplier_id
    WHERE sd.tenant_id = p_tenant_id
      AND sd.status IN ('open', 'partially_paid')
      AND sd.due_date >= CURRENT_DATE
      AND sd.due_date <= CURRENT_DATE + v_reminder_days
      AND sd.is_deleted = false
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.tenant_id = p_tenant_id
          AND a.alert_type = 'payment_due'
          AND a.entity_id = sd.id
          AND a.status IN ('unread', 'read')
      );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END IF;

  -- ============================================================
  -- 3. prepaid_low — remaining below 20%
  -- ============================================================
  IF v_config.prepaid_threshold_alert = true THEN
    INSERT INTO alerts (tenant_id, alert_type, severity, title, message, data, entity_type, entity_id)
    SELECT
      pd.tenant_id,
      'prepaid_low',
      'warning',
      'עסקת מקדמה ' || s.name || ' — נותרו ₪'
        || TRIM(TO_CHAR(pd.total_remaining, 'FM999,999'))
        || ' (' || ROUND((pd.total_remaining / NULLIF(pd.total_prepaid, 0)) * 100) || '%)',
      'עסקת מקדמה עם ' || s.name || ' קרובה למיצוי',
      json_build_object(
        'supplier_id', pd.supplier_id,
        'deal_id', pd.id,
        'total_prepaid', pd.total_prepaid,
        'total_remaining', pd.total_remaining,
        'pct_remaining', ROUND((pd.total_remaining / NULLIF(pd.total_prepaid, 0)) * 100)
      )::jsonb,
      'prepaid_deal',
      pd.id
    FROM prepaid_deals pd
    JOIN suppliers s ON s.id = pd.supplier_id
    WHERE pd.tenant_id = p_tenant_id
      AND pd.status = 'active'
      AND pd.total_prepaid > 0
      AND (pd.total_remaining / NULLIF(pd.total_prepaid, 0)) < 0.20
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.tenant_id = p_tenant_id
          AND a.alert_type = 'prepaid_low'
          AND a.entity_id = pd.id
          AND a.status IN ('unread', 'read')
      );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END IF;

  RETURN json_build_object('alerts_created', v_count);
END;
$function$;

-- §1.3 RPC: get_po_aggregates(p_tenant_id uuid)
CREATE OR REPLACE FUNCTION public.get_po_aggregates(p_tenant_id uuid)
 RETURNS TABLE(po_id uuid, item_count bigint, total_value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN QUERY
SELECT 
    poi.po_id,
    COUNT(*) as item_count,
    COALESCE(SUM(poi.qty_ordered * poi.unit_cost * (1 - COALESCE(poi.discount_pct, 0) / 100.0)), 0) as total_value
  FROM purchase_order_items poi
  WHERE poi.tenant_id = p_tenant_id
  GROUP BY poi.po_id;
END;
$function$;

-- §1.3 RPC: get_tenant_activity_log(p_tenant_id uuid, p_limit integer, p_offset integer, p_level text, p_entity_type text, p_date_from timestamp with time zone, p_date_to timestamp with time zone)
CREATE OR REPLACE FUNCTION public.get_tenant_activity_log(p_tenant_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_level text DEFAULT NULL::text, p_entity_type text DEFAULT NULL::text, p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: get_tenant_employees(p_tenant_id uuid)
CREATE OR REPLACE FUNCTION public.get_tenant_employees(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: get_tenant_stats(p_tenant_id uuid)
CREATE OR REPLACE FUNCTION public.get_tenant_stats(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: get_translation_context(p_tenant_id uuid, p_target_lang text, p_limit integer)
CREATE OR REPLACE FUNCTION public.get_translation_context(p_tenant_id uuid, p_target_lang text, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_glossary JSONB;
  v_examples JSONB;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  -- Load glossary entries for this language
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'term_he', tg.term_he,
    'term_translated', tg.term_translated,
    'context', tg.context
  )), '[]'::jsonb)
  INTO v_glossary
  FROM translation_glossary tg
  WHERE tg.tenant_id = p_tenant_id
    AND tg.lang = p_target_lang
;

  -- Load approved translation examples
  -- Tenant-specific first (approved, high confidence), then platform
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'source_text', tm.source_text,
    'translated_text', tm.translated_text,
    'context', tm.context,
    'scope', tm.scope
  ) ORDER BY
    CASE WHEN tm.scope = 'tenant' THEN 0 ELSE 1 END,
    CASE WHEN tm.approved_by IS NOT NULL THEN 0 ELSE 1 END,
    tm.confidence DESC
  ), '[]'::jsonb)
  INTO v_examples
  FROM (
    SELECT source_text, translated_text, context, scope, approved_by, confidence
    FROM translation_memory
    WHERE tenant_id = p_tenant_id
      AND target_lang = p_target_lang
      AND confidence >= 0.7
    UNION ALL
    SELECT source_text, translated_text, context, scope, approved_by, confidence
    FROM translation_memory
    WHERE scope = 'platform'
      AND target_lang = p_target_lang
      AND confidence >= 0.8
    LIMIT p_limit
  ) tm;

  RETURN jsonb_build_object(
    'glossary', v_glossary,
    'approved_examples', v_examples,
    'target_lang', p_target_lang
  );
END;
$function$;

-- §1.3 RPC: import_leads_from_monday(p_tenant_id uuid, p_board_id text, p_items jsonb)
CREATE OR REPLACE FUNCTION public.import_leads_from_monday(p_tenant_id uuid, p_board_id text, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_item         jsonb;
  v_inserted     int := 0;
  v_updated      int := 0;
  v_errors       int := 0;
  v_lead_id      uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      INSERT INTO crm_leads (
        tenant_id, full_name, phone, email, city, language, status,
        source, monday_item_id, client_notes
      ) VALUES (
        p_tenant_id,
        v_item->>'full_name',
        v_item->>'phone',
        v_item->>'email',
        v_item->>'city',
        COALESCE(v_item->>'language', 'he'),
        COALESCE(v_item->>'status', 'new'),
        'monday_import',
        v_item->>'monday_item_id',
        v_item->>'client_notes'
      )
      ON CONFLICT (tenant_id, phone) DO UPDATE
        SET monday_item_id = EXCLUDED.monday_item_id,
            updated_at = now()
      RETURNING id INTO v_lead_id;

      IF v_item->>'notes' IS NOT NULL THEN
        INSERT INTO crm_lead_notes (tenant_id, lead_id, content)
        VALUES (
          p_tenant_id,
          v_lead_id,
          '--- היסטוריה ממאנדיי (ייבוא ' || to_char(now(), 'DD/MM/YYYY') || ') ---' || E'\n' || (v_item->>'notes')
        );
      END IF;

      IF v_lead_id IS NOT NULL THEN v_inserted := v_inserted + 1;
      ELSE v_updated := v_updated + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'updated', v_updated,
    'errors', v_errors
  );
END;
$function$;

-- §1.3 RPC: is_feature_enabled(p_tenant_id uuid, p_feature text)
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_tenant_id uuid, p_feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_plan_features JSONB;
  v_override_value BOOLEAN;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: next_crm_event_number(p_tenant_id uuid, p_campaign_id uuid)
CREATE OR REPLACE FUNCTION public.next_crm_event_number(p_tenant_id uuid, p_campaign_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_next int;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- Lock the campaign row to prevent concurrent event creation for same campaign
  PERFORM id FROM crm_campaigns
   WHERE id = p_campaign_id AND tenant_id = p_tenant_id
     FOR UPDATE;

  SELECT COALESCE(MAX(event_number), 0) + 1
    INTO v_next
    FROM crm_events
   WHERE tenant_id = p_tenant_id
     AND campaign_id = p_campaign_id;

  RETURN v_next;
END;
$function$;

-- §1.3 RPC: reset_employee_pin(p_tenant_id uuid, p_employee_id uuid, p_new_pin text, p_must_change boolean, p_admin_id uuid)
CREATE OR REPLACE FUNCTION public.reset_employee_pin(p_tenant_id uuid, p_employee_id uuid, p_new_pin text, p_must_change boolean DEFAULT true, p_admin_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: restore_event_from_log(p_tenant_id uuid, p_log_id uuid)
CREATE OR REPLACE FUNCTION public.restore_event_from_log(p_tenant_id uuid, p_log_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_log_tenant   uuid;
  v_log_action   text;
  v_log_entity   text;
  v_log_entity_id text;
  v_log_details  jsonb;
  v_event_id     uuid;
  v_event_tenant uuid;
  v_event_is_deleted boolean;
  v_event_name   text;
  v_attendee_ids jsonb;
  v_restored     integer := 0;
  v_note         text;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT tenant_id, action, entity_type, entity_id, details
    INTO v_log_tenant, v_log_action, v_log_entity, v_log_entity_id, v_log_details
    FROM public.activity_log
   WHERE id = p_log_id;

  IF v_log_tenant IS NULL
     OR v_log_tenant <> p_tenant_id
     OR v_log_action <> 'crm.event.delete'
     OR v_log_entity <> 'crm_events'
     OR v_log_entity_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_log_id');
  END IF;

  BEGIN
    v_event_id := v_log_entity_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_log_id');
  END;

  SELECT tenant_id, is_deleted, name
    INTO v_event_tenant, v_event_is_deleted, v_event_name
    FROM public.crm_events
   WHERE id = v_event_id
     AND tenant_id = p_tenant_id
   FOR UPDATE;

  IF v_event_tenant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  IF v_event_is_deleted = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_deleted');
  END IF;

  UPDATE public.crm_events
     SET is_deleted = false
   WHERE id        = v_event_id
     AND tenant_id = p_tenant_id;

  v_attendee_ids := v_log_details -> 'attendee_ids';

  IF v_attendee_ids IS NULL OR jsonb_array_length(v_attendee_ids) = 0 THEN
    v_restored := 0;
    v_note := CASE
      WHEN v_attendee_ids IS NULL THEN 'pre_v2_log_event_only'
      ELSE NULL
    END;
  ELSE
    WITH restored AS (
      UPDATE public.crm_event_attendees
         SET is_deleted = false
       WHERE id IN (
               SELECT (jsonb_array_elements_text(v_attendee_ids))::uuid
             )
         AND tenant_id  = p_tenant_id
         AND is_deleted = true
       RETURNING 1
    )
    SELECT count(*) INTO v_restored FROM restored;
  END IF;

  INSERT INTO public.activity_log (tenant_id, user_id, level, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    auth.uid(),
    'info',
    'crm.event.restore',
    'crm_events',
    v_event_id::text,
    jsonb_build_object(
      'event_name',         v_event_name,
      'restored_attendees', v_restored,
      'source_log_id',      p_log_id::text
    ) || CASE WHEN v_note IS NOT NULL
              THEN jsonb_build_object('note', v_note)
              ELSE '{}'::jsonb
         END
  );

  RETURN jsonb_build_object(
    'success',            true,
    'event_id',           v_event_id,
    'restored_attendees', v_restored,
    'source_log_id',      p_log_id::text
  ) || CASE WHEN v_note IS NOT NULL
            THEN jsonb_build_object('note', v_note)
            ELSE '{}'::jsonb
       END;
END;
$function$;

-- §1.3 RPC: save_translation_memory_batch(p_tenant_id uuid, p_entries jsonb)
CREATE OR REPLACE FUNCTION public.save_translation_memory_batch(p_tenant_id uuid, p_entries jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_entry JSONB;
  v_count INTEGER := 0;
  v_confidence REAL;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    -- If approved_by is set, confidence = 1.0; otherwise 0.7
    v_confidence := CASE
      WHEN v_entry->>'approved_by' IS NOT NULL THEN 1.0
      ELSE 0.7
    END;

    INSERT INTO translation_memory (
      tenant_id, source_lang, target_lang, source_text, translated_text,
      context, approved_by, confidence, scope
    ) VALUES (
      p_tenant_id,
      COALESCE(v_entry->>'source_lang', 'he'),
      v_entry->>'target_lang',
      v_entry->>'source_text',
      v_entry->>'translated_text',
      COALESCE(v_entry->>'context', 'general'),
      v_entry->>'approved_by',
      v_confidence,
      'tenant'
    )
    ON CONFLICT (tenant_id, source_lang, target_lang, source_text)
      DO NOTHING;  -- don't overwrite existing TM entries

    -- Note: ON CONFLICT needs a unique index on these columns
    -- If no unique constraint exists, this just inserts

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- §1.3 RPC: soft_delete_event_if_empty(p_tenant_id uuid, p_event_id uuid)
CREATE OR REPLACE FUNCTION public.soft_delete_event_if_empty(p_tenant_id uuid, p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_event_tenant       uuid;
  v_event_number       integer;
  v_event_name         text;
  v_total_purchases    numeric;
  v_attendee_ids       text[];
  v_deleted_attendees  integer;
  v_cancelled_messages integer;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT tenant_id, event_number, name
    INTO v_event_tenant, v_event_number, v_event_name
    FROM public.crm_events
   WHERE id = p_event_id
   FOR UPDATE;

  IF v_event_tenant IS NULL OR v_event_tenant <> p_tenant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  SELECT COALESCE(SUM(COALESCE(purchase_amount, 0)), 0)
    INTO v_total_purchases
    FROM public.crm_event_attendees
   WHERE event_id  = p_event_id
     AND tenant_id = p_tenant_id
     AND is_deleted = false;

  IF v_total_purchases > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'has_purchases',
      'total_purchases', v_total_purchases
    );
  END IF;

  SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
    INTO v_attendee_ids
    FROM public.crm_event_attendees
   WHERE event_id   = p_event_id
     AND tenant_id  = p_tenant_id
     AND is_deleted = false;

  UPDATE public.crm_events
     SET is_deleted = true
   WHERE id        = p_event_id
     AND tenant_id = p_tenant_id;

  WITH cascade_atts AS (
    UPDATE public.crm_event_attendees
       SET is_deleted = true
     WHERE event_id   = p_event_id
       AND tenant_id  = p_tenant_id
       AND is_deleted = false
     RETURNING 1
  )
  SELECT count(*) INTO v_deleted_attendees FROM cascade_atts;

  WITH cancelled_msgs AS (
    UPDATE public.crm_message_queue
       SET status = 'cancelled'
     WHERE event_id  = p_event_id
       AND tenant_id = p_tenant_id
       AND status IN ('queued', 'pending')
     RETURNING 1
  )
  SELECT count(*) INTO v_cancelled_messages FROM cancelled_msgs;

  INSERT INTO public.activity_log (tenant_id, level, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    'info',
    'crm.event.delete',
    'crm_events',
    p_event_id::text,
    jsonb_build_object(
      'event_id',           p_event_id,
      'event_number',       v_event_number,
      'event_name',         v_event_name,
      'deleted_attendees',  v_deleted_attendees,
      'cancelled_messages', v_cancelled_messages,
      'attendee_ids',       to_jsonb(v_attendee_ids)
    )
  );

  RETURN jsonb_build_object(
    'success',            true,
    'deleted_attendees',  v_deleted_attendees,
    'cancelled_messages', v_cancelled_messages
  );
END;
$function$;

-- §1.3 RPC: submit_storefront_lead(p_tenant_id uuid, p_inventory_id uuid, p_contact_type text, p_contact_value text)
CREATE OR REPLACE FUNCTION public.submit_storefront_lead(p_tenant_id uuid, p_inventory_id uuid, p_contact_type text, p_contact_value text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_lead_id UUID;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- Validate contact type
  IF p_contact_type NOT IN ('phone', 'email') THEN
    RAISE EXCEPTION 'Invalid contact_type: %', p_contact_type;
  END IF;

  -- Check for existing pending lead (prevent duplicates)
  SELECT id INTO v_lead_id
  FROM storefront_leads
  WHERE tenant_id = p_tenant_id
    AND inventory_id = p_inventory_id
    AND contact_value = p_contact_value
    AND status = 'pending'
    AND is_deleted = false;

  IF v_lead_id IS NOT NULL THEN
    -- Already exists, return existing ID
    RETURN v_lead_id;
  END IF;

  -- Insert new lead
  INSERT INTO storefront_leads (tenant_id, inventory_id, contact_type, contact_value)
  VALUES (p_tenant_id, p_inventory_id, p_contact_type, p_contact_value)
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$function$;

-- §1.3 RPC: suspend_tenant(p_tenant_id uuid, p_reason text, p_admin_id uuid)
CREATE OR REPLACE FUNCTION public.suspend_tenant(p_tenant_id uuid, p_reason text, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid)
CREATE OR REPLACE FUNCTION public.sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_lead          crm_leads%ROWTYPE;
  v_active_status text;
  v_target_status text;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT * INTO v_lead FROM crm_leads
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND is_deleted = false;
  -- M4_STATUS_MODEL_FINETUNES (2026-05-14, F-CSF-3): canonical SELECT-INTO miss
  -- idiom. Composite `IS NULL` only returns true when every column is NULL --
  -- fragile under future refactors; `NOT FOUND` is the correct check.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  IF v_lead.status IN ('not_interested','unsubscribed') THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'reason', 'terminal_status');
  END IF;

  SELECT a.status INTO v_active_status
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id AND e.tenant_id = a.tenant_id
   WHERE a.lead_id = p_lead_id AND a.tenant_id = p_tenant_id
     AND a.is_deleted = false
     AND a.status NOT IN ('cancelled')
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY (CASE WHEN a.status = 'waiting_list' THEN 0 ELSE 1 END),
            COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;

  v_target_status := CASE v_active_status
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'registered' THEN 'confirmed'
    WHEN 'manual_registration' THEN 'confirmed'
    WHEN 'quick_registration' THEN 'confirmed'
    WHEN 'attended' THEN 'confirmed_verified'
    WHEN 'purchased' THEN 'confirmed_verified'
    WHEN 'no_show' THEN 'confirmed'
    WHEN 'invited' THEN 'invited'
    WHEN 'waiting_list' THEN 'waitlist'
    WHEN 'event_closed' THEN 'waiting'
    WHEN 'duplicate' THEN 'waiting'
    ELSE 'waiting'
  END;

  IF v_lead.status = v_target_status THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'old_status', v_lead.status, 'new_status', v_target_status);
  END IF;

  UPDATE crm_leads SET status = v_target_status, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'updated', true, 'old_status', v_lead.status, 'new_status', v_target_status);
END
$function$;

-- §1.3 RPC: update_tenant(p_tenant_id uuid, p_updates jsonb, p_admin_id uuid)
CREATE OR REPLACE FUNCTION public.update_tenant(p_tenant_id uuid, p_updates jsonb, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_allowed_fields TEXT[] := ARRAY['name', 'owner_name', 'owner_email', 'owner_phone', 'plan_id', 'trial_ends_at'];
  v_field TEXT;
  v_old_values JSONB;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: 3-role-aware tenant validation (service_role bypass)
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
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
$function$;

-- §1.3 RPC: verify_campaign_page_password(p_tenant_id uuid, p_page_slug text, p_password text)
CREATE OR REPLACE FUNCTION public.verify_campaign_page_password(p_tenant_id uuid, p_page_slug text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_page crm_campaign_pages%ROWTYPE;
BEGIN
  -- SECURITY_HOTFIX_2 §1.3: Option A anon-safe slug validation
  IF p_tenant_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.v_public_tenant WHERE id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'tenant_id does not resolve to a known public tenant' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_page FROM crm_campaign_pages
   WHERE tenant_id = p_tenant_id AND slug = p_page_slug AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found');
  END IF;

  IF v_page.password_hash != p_password THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_password');
  END IF;

  UPDATE crm_campaign_pages
     SET last_accessed_at = now()
   WHERE id = v_page.id;

  RETURN jsonb_build_object(
    'success', true,
    'view_name', v_page.view_name,
    'visible_columns', v_page.visible_columns
  );
END;
$function$;


-- ============================================================================
-- REVOKE/GRANT statements for Option B subset (16 RPCs)
-- Pattern: REVOKE FROM PUBLIC, anon, authenticated  +  GRANT TO authenticated
-- service_role retains EXECUTE by Postgres default.
-- ============================================================================
-- Option B revoke for _record_touchpoint
REVOKE EXECUTE ON FUNCTION public._record_touchpoint(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text, p_touchpoint_type text, p_event_id uuid, p_attendee_id uuid, p_short_link_id uuid, p_short_link_code text, p_broadcast_id uuid, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_utm_term text, p_utm_campaign_id text, p_referrer_url text, p_landing_url text, p_dedupe_key text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._record_touchpoint(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text, p_touchpoint_type text, p_event_id uuid, p_attendee_id uuid, p_short_link_id uuid, p_short_link_code text, p_broadcast_id uuid, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_utm_term text, p_utm_campaign_id text, p_referrer_url text, p_landing_url text, p_dedupe_key text) TO authenticated;

-- Option B revoke for activate_tenant
REVOKE EXECUTE ON FUNCTION public.activate_tenant(p_tenant_id uuid, p_admin_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_tenant(p_tenant_id uuid, p_admin_id uuid) TO authenticated;

-- Option B revoke for check_plan_limit
REVOKE EXECUTE ON FUNCTION public.check_plan_limit(p_tenant_id uuid, p_resource text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_plan_limit(p_tenant_id uuid, p_resource text) TO authenticated;

-- Option B revoke for create_translated_page
REVOKE EXECUTE ON FUNCTION public.create_translated_page(p_tenant_id uuid, p_source_page_id uuid, p_target_lang text, p_translated_blocks jsonb, p_title text, p_slug text, p_meta_title text, p_meta_description text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_translated_page(p_tenant_id uuid, p_source_page_id uuid, p_target_lang text, p_translated_blocks jsonb, p_title text, p_slug text, p_meta_title text, p_meta_description text) TO authenticated;

-- Option B revoke for delete_tenant
REVOKE EXECUTE ON FUNCTION public.delete_tenant(p_tenant_id uuid, p_deleted_by uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant(p_tenant_id uuid, p_deleted_by uuid) TO authenticated;

-- Option B revoke for generate_daily_alerts
REVOKE EXECUTE ON FUNCTION public.generate_daily_alerts(p_tenant_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_alerts(p_tenant_id uuid) TO authenticated;

-- Option B revoke for get_po_aggregates
REVOKE EXECUTE ON FUNCTION public.get_po_aggregates(p_tenant_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_po_aggregates(p_tenant_id uuid) TO authenticated;

-- Option B revoke for get_tenant_activity_log
REVOKE EXECUTE ON FUNCTION public.get_tenant_activity_log(p_tenant_id uuid, p_limit integer, p_offset integer, p_level text, p_entity_type text, p_date_from timestamp with time zone, p_date_to timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_activity_log(p_tenant_id uuid, p_limit integer, p_offset integer, p_level text, p_entity_type text, p_date_from timestamp with time zone, p_date_to timestamp with time zone) TO authenticated;

-- Option B revoke for get_tenant_employees
REVOKE EXECUTE ON FUNCTION public.get_tenant_employees(p_tenant_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_employees(p_tenant_id uuid) TO authenticated;

-- Option B revoke for get_tenant_stats
REVOKE EXECUTE ON FUNCTION public.get_tenant_stats(p_tenant_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_stats(p_tenant_id uuid) TO authenticated;

-- Option B revoke for get_translation_context
REVOKE EXECUTE ON FUNCTION public.get_translation_context(p_tenant_id uuid, p_target_lang text, p_limit integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_translation_context(p_tenant_id uuid, p_target_lang text, p_limit integer) TO authenticated;

-- Option B revoke for is_feature_enabled
REVOKE EXECUTE ON FUNCTION public.is_feature_enabled(p_tenant_id uuid, p_feature text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(p_tenant_id uuid, p_feature text) TO authenticated;

-- Option B revoke for reset_employee_pin
REVOKE EXECUTE ON FUNCTION public.reset_employee_pin(p_tenant_id uuid, p_employee_id uuid, p_new_pin text, p_must_change boolean, p_admin_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_employee_pin(p_tenant_id uuid, p_employee_id uuid, p_new_pin text, p_must_change boolean, p_admin_id uuid) TO authenticated;

-- Option B revoke for save_translation_memory_batch
REVOKE EXECUTE ON FUNCTION public.save_translation_memory_batch(p_tenant_id uuid, p_entries jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_translation_memory_batch(p_tenant_id uuid, p_entries jsonb) TO authenticated;

-- Option B revoke for suspend_tenant
REVOKE EXECUTE ON FUNCTION public.suspend_tenant(p_tenant_id uuid, p_reason text, p_admin_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_tenant(p_tenant_id uuid, p_reason text, p_admin_id uuid) TO authenticated;

-- Option B revoke for update_tenant
REVOKE EXECUTE ON FUNCTION public.update_tenant(p_tenant_id uuid, p_updates jsonb, p_admin_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_tenant(p_tenant_id uuid, p_updates jsonb, p_admin_id uuid) TO authenticated;

