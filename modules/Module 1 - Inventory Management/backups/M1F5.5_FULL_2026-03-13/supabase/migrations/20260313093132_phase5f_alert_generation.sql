-- ============================================================
-- Phase 5f: Daily Alert Generation RPC Function
-- generate_daily_alerts(p_tenant_id UUID) → JSON
-- Generates: payment_due, payment_overdue, prepaid_low
-- ============================================================

CREATE OR REPLACE FUNCTION generate_daily_alerts(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_count INTEGER := 0;
  v_rows INTEGER := 0;
  v_reminder_days INTEGER;
BEGIN
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
$$;
