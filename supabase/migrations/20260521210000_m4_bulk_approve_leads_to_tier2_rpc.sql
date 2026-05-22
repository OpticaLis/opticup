-- M4_LEADS_BULK_RPC (Sprint 3 Item 4, 2026-05-21).
-- Atomic server-side replacement for the Sprint-2 sequential client-side
-- bulk-approve loop. Each lead's status update + note insert happen in
-- a single SQL statement. Skip-on-terms-not-approved behavior preserved.

CREATE OR REPLACE FUNCTION public.crm_bulk_approve_leads_to_tier2(
  p_tenant_id uuid,
  p_lead_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_promoted_ids uuid[];
  v_blocked_ids uuid[];
  v_total int;
  v_now timestamptz := now();
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'crm_bulk_approve_leads_to_tier2: tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_lead_ids IS NULL OR array_length(p_lead_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'promoted', 0, 'blocked_no_terms', 0, 'total', 0);
  END IF;

  v_total := array_length(p_lead_ids, 1);

  WITH input AS (SELECT unnest(p_lead_ids) AS id),
       blocked AS (
         SELECT i.id FROM input i
           JOIN crm_leads l ON l.id = i.id
          WHERE l.tenant_id = p_tenant_id
            AND COALESCE(l.terms_approved, false) = false
       ),
       ok AS (
         SELECT i.id FROM input i
           JOIN crm_leads l ON l.id = i.id
          WHERE l.tenant_id = p_tenant_id
            AND COALESCE(l.terms_approved, false) = true
       )
  SELECT
    COALESCE((SELECT array_agg(id) FROM ok), ARRAY[]::uuid[]),
    COALESCE((SELECT array_agg(id) FROM blocked), ARRAY[]::uuid[])
  INTO v_promoted_ids, v_blocked_ids;

  IF array_length(v_promoted_ids, 1) IS NOT NULL THEN
    UPDATE crm_leads
       SET status = 'waiting', updated_at = v_now
     WHERE tenant_id = p_tenant_id
       AND id = ANY(v_promoted_ids);

    INSERT INTO crm_lead_notes (tenant_id, lead_id, content)
    SELECT p_tenant_id, id, 'הועבר ל-Tier 2 (אושר ב-bulk)'
      FROM unnest(v_promoted_ids) AS id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'promoted', COALESCE(array_length(v_promoted_ids, 1), 0),
    'blocked_no_terms', COALESCE(array_length(v_blocked_ids, 1), 0),
    'total', v_total,
    'promoted_ids', to_jsonb(v_promoted_ids),
    'blocked_ids', to_jsonb(v_blocked_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_bulk_approve_leads_to_tier2(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_bulk_approve_leads_to_tier2(uuid, uuid[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_bulk_approve_leads_to_tier2(uuid, uuid[]) IS
  'M4_LEADS_BULK_RPC (Sprint 3 Item 4, 2026-05-21). Atomic bulk transfer of '
  'multiple leads to status=waiting. Skips leads without terms_approved. Single '
  'UPDATE + bulk INSERT in one transaction. Returns {ok, promoted, blocked_no_terms, total, ids}.';
