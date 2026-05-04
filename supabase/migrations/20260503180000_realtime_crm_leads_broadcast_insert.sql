-- Migration: realtime_crm_leads_broadcast_insert
-- SPEC: REALTIME_INSERT_NOT_RENDERING_DEBUG / Round 3 / Option B
-- Daniel directive 2026-05-03: this migration enters git AT FIRST COMMIT.
--
-- Why this exists: postgres_changes does not reliably broadcast service_role-
-- originated INSERTs to Realtime subscribers. The lead-intake EF inserts via
-- service_role. So we use a Postgres trigger that calls realtime.broadcast_changes
-- with a per-tenant channel topic. Subscribers (CRM admin browser) listen on
-- the same channel topic. UPDATE path is unaffected — postgres_changes UPDATE
-- works (browser admin writes carry JWT tenant context).
--
-- Idempotent: DROP IF EXISTS + CREATE OR REPLACE so re-applying is a no-op.
--
-- Channel name format: 'crm_leads_<tenant_uuid>' (per Daniel directive Point 3 —
-- security via channel topology, not just filtering).
--
-- SECURITY DEFINER rationale: trigger function runs under owner role (postgres)
-- so it can call realtime.broadcast_changes regardless of which role originated
-- the INSERT (service_role / anon / authenticated). Privilege surface is bounded
-- to ONE call into Supabase's own realtime schema; SET search_path locks
-- resolution to public + realtime.

DROP TRIGGER IF EXISTS crm_leads_broadcast_insert_trigger ON public.crm_leads;
DROP FUNCTION IF EXISTS public.crm_leads_broadcast_insert();

CREATE OR REPLACE FUNCTION public.crm_leads_broadcast_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'crm_leads_' || NEW.tenant_id::text,  -- topic (per-tenant channel)
    'INSERT',                              -- event_name (sent on payload)
    'INSERT',                              -- operation
    'crm_leads',                           -- table
    'public',                              -- schema
    NEW,                                   -- new row
    NULL                                   -- old row (NULL for INSERT)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_leads_broadcast_insert_trigger
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_leads_broadcast_insert();

-- Post-application verification (run as read-only Level-1 SQL):
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.crm_leads'::regclass;
--   Expected: list includes 'crm_leads_broadcast_insert_trigger'.
-- SELECT proname FROM pg_proc WHERE proname = 'crm_leads_broadcast_insert';
--   Expected: 1 row.
