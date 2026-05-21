-- M4_SCE_CONSUMER_RACE_FIX (2026-05-21) — atomic SCE claim via FOR UPDATE SKIP LOCKED.
-- See modules/Module 4 - CRM/docs/specs/M4_SCE_CONSUMER_RACE_FIX/SPEC.md §9 for rationale.
-- This file mirrors what was applied to the live DB via Supabase MCP apply_migration
-- on 2026-05-21 (migration version 20260521141543).

ALTER TABLE public.crm_status_change_events
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_crm_sce_unconsumed_claimable
  ON public.crm_status_change_events (tenant_id, occurred_at)
  WHERE consumed_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_unconsumed_status_change_events(
  p_tenant_id    uuid,
  p_limit        int,
  p_stale_minutes int DEFAULT 5
)
RETURNS SETOF public.crm_status_change_events
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
    RAISE EXCEPTION 'claim_unconsumed_status_change_events: tenant mismatch'
      USING ERRCODE = '42501';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 100;
  END IF;
  IF p_stale_minutes IS NULL OR p_stale_minutes < 0 THEN
    p_stale_minutes := 5;
  END IF;

  RETURN QUERY
  UPDATE public.crm_status_change_events ev
     SET claimed_at = now()
   WHERE ev.id IN (
       SELECT id FROM public.crm_status_change_events
        WHERE tenant_id = p_tenant_id
          AND consumed_at IS NULL
          AND (claimed_at IS NULL OR claimed_at < (now() - (p_stale_minutes || ' minutes')::interval))
        ORDER BY occurred_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
     )
  RETURNING ev.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_unconsumed_status_change_events(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_unconsumed_status_change_events(uuid, int, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.claim_unconsumed_status_change_events(uuid, int, int) IS
  'M4_SCE_CONSUMER_RACE_FIX (2026-05-21). Atomic FOR UPDATE SKIP LOCKED claim of '
  'unconsumed crm_status_change_events rows. Stale claims (>5 min) re-claimable.';
