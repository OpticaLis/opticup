-- M4_DASHBOARD_STATUS_RPC_AND_LEAD_EVENT_HISTORY_MV (Sprint 1 SPEC 3, 2026-05-21).
-- Mirrors what was applied via Supabase MCP apply_migration on 2026-05-21.
-- Replaces the dashboard's unbounded `SELECT status FROM crm_leads` (capped by
-- PostgREST at 1000 rows, silently breaks at scale) with a server-side GROUP BY.

CREATE OR REPLACE FUNCTION public.crm_dashboard_status_counts(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_result jsonb;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'crm_dashboard_status_counts: tenant mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'status', status,
    'count', cnt
  )), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT COALESCE(status, 'unknown') AS status, count(*)::int AS cnt
      FROM public.crm_leads
     WHERE tenant_id = p_tenant_id
       AND is_deleted = false
     GROUP BY status
  ) t;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_dashboard_status_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_dashboard_status_counts(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_dashboard_status_counts(uuid) IS
  'M4_DASHBOARD_STATUS_RPC_AND_LEAD_EVENT_HISTORY_MV (Sprint 1 SPEC 3, 2026-05-21). '
  'Returns CRM-leads status distribution for the dashboard. Server-side GROUP BY '
  'returning jsonb scalar bypasses PostgREST db-max-rows=1000 cap that silently '
  'truncated the prior client-side aggregation.';
