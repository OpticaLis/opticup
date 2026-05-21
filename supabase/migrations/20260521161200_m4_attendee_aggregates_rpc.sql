-- M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX (Sprint 1 SPEC 2, 2026-05-21).
-- Mirrors what was applied via Supabase MCP apply_migration on 2026-05-21.
-- Replaces preview.ts's 445-roundtrip fetchAttendeeAggregates loop with a
-- single server-side GROUP BY. At 84K leads: was ~89 s of network round-trips,
-- now <2 s server-side.

CREATE OR REPLACE FUNCTION public.crm_attendee_aggregates_for_leads(
  p_tenant_id uuid,
  p_lead_ids uuid[]
)
RETURNS TABLE (lead_id uuid, prior_active_attendee_count int, attended_event_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'crm_attendee_aggregates_for_leads: tenant mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_lead_ids IS NULL OR array_length(p_lead_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT a.lead_id,
         count(*) FILTER (WHERE a.status = ANY (ARRAY['registered','confirmed','attended','purchased','no_show']))::int AS prior_active_attendee_count,
         count(*) FILTER (WHERE a.status = 'attended')::int AS attended_event_count
    FROM public.crm_event_attendees a
   WHERE a.tenant_id = p_tenant_id
     AND a.lead_id = ANY(p_lead_ids)
     AND a.is_deleted = false
   GROUP BY a.lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_attendee_aggregates_for_leads(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_attendee_aggregates_for_leads(uuid, uuid[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_attendee_aggregates_for_leads(uuid, uuid[]) IS
  'M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX (Sprint 1 SPEC 2, 2026-05-21). '
  'Returns per-lead attendee aggregates (prior_active_attendee_count + attended_event_count) '
  'in ONE round-trip. Replaces preview.ts chunked PostgREST loop that took ~89 s at 84K leads.';
