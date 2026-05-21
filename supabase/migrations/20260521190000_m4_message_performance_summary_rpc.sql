-- M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS (Sprint 2 Item 1, 2026-05-21).
-- Mirrors what was applied via Supabase MCP apply_migration on 2026-05-21.
-- Returns BOTH per-template rollup AND per-event drill-down, each with
-- first_sent_at + last_sent_at. JSONB-scalar return bypasses PostgREST
-- db-max-rows=1000 cap that silently truncated the dashboard query in
-- Sprint 1 SPEC 3 (now fixed) and threatened the perf screen at scale.

CREATE OR REPLACE FUNCTION public.crm_message_performance_summary(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_per_event jsonb;
  v_per_template jsonb;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'crm_message_performance_summary: tenant mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'event_id', sub.event_id, 'template_id', sub.template_id, 'channel', sub.channel,
    'messages_sent', sub.sent, 'messages_clicked', sub.clicked, 'registrations_after_click', sub.regs,
    'first_sent_at', sub.first_sent, 'last_sent_at', sub.last_sent
  )), '[]'::jsonb) INTO v_per_event
  FROM (
    SELECT m.event_id, m.template_id, m.channel,
           count(DISTINCT m.id) FILTER (WHERE m.status = 'sent') AS sent,
           count(DISTINCT m.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL) AS clicked,
           count(DISTINCT a.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL
             AND a.registered_at > c.clicked_at AND a.is_deleted = false) AS regs,
           min(m.created_at) FILTER (WHERE m.status = 'sent') AS first_sent,
           max(m.created_at) FILTER (WHERE m.status = 'sent') AS last_sent
      FROM public.crm_message_log m
      LEFT JOIN public.short_links sl ON sl.message_log_id = m.id
      LEFT JOIN public.short_link_clicks c ON c.short_link_id = sl.id
      LEFT JOIN public.crm_event_attendees a ON a.tenant_id = m.tenant_id
        AND a.lead_id = m.lead_id AND a.event_id = m.event_id
     WHERE m.tenant_id = p_tenant_id AND m.template_id IS NOT NULL
     GROUP BY m.event_id, m.template_id, m.channel
  ) sub;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'template_id', sub.template_id, 'channel', sub.channel,
    'messages_sent_total', sub.total_sent, 'messages_clicked_total', sub.total_clicked,
    'registrations_after_click_total', sub.total_regs, 'events_used_in', sub.events_count,
    'first_sent_at', sub.first_sent, 'last_sent_at', sub.last_sent
  )), '[]'::jsonb) INTO v_per_template
  FROM (
    SELECT m.template_id, m.channel,
           count(DISTINCT m.id) FILTER (WHERE m.status = 'sent') AS total_sent,
           count(DISTINCT m.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL) AS total_clicked,
           count(DISTINCT a.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL
             AND a.registered_at > c.clicked_at AND a.is_deleted = false) AS total_regs,
           count(DISTINCT m.event_id) FILTER (WHERE m.status = 'sent' AND m.event_id IS NOT NULL) AS events_count,
           min(m.created_at) FILTER (WHERE m.status = 'sent') AS first_sent,
           max(m.created_at) FILTER (WHERE m.status = 'sent') AS last_sent
      FROM public.crm_message_log m
      LEFT JOIN public.short_links sl ON sl.message_log_id = m.id
      LEFT JOIN public.short_link_clicks c ON c.short_link_id = sl.id
      LEFT JOIN public.crm_event_attendees a ON a.tenant_id = m.tenant_id
        AND a.lead_id = m.lead_id AND a.event_id = m.event_id
     WHERE m.tenant_id = p_tenant_id AND m.template_id IS NOT NULL
     GROUP BY m.template_id, m.channel
  ) sub;

  RETURN jsonb_build_object('per_template', v_per_template, 'per_event', v_per_event);
END;
$$;

REVOKE ALL ON FUNCTION public.crm_message_performance_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_message_performance_summary(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_message_performance_summary(uuid) IS
  'M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS (Sprint 2 Item 1, 2026-05-21). '
  'Returns dispatch summary with per_template + per_event subarrays, each '
  'carrying first_sent_at + last_sent_at. Bypasses db-max-rows=1000 cap.';
