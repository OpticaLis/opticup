-- M4_TENANT_ISOLATION_HARDENING_PART1 (forward)
-- Closes Phase 1 audit G-CRIT-1 (cms_leads policy bypass) + G-CRIT-3 (7 SECURITY DEFINER views).
-- Apply atomically; rollback in companion *_down.sql if QA fails.

BEGIN;

-- Part A: cms_leads — replace 3 broken policies with 2 canonical ones (CLAUDE.md §5 Rule 15)

DROP POLICY IF EXISTS cms_leads_anon_insert        ON public.cms_leads;
DROP POLICY IF EXISTS cms_leads_authenticated_read ON public.cms_leads;
DROP POLICY IF EXISTS cms_leads_service_all        ON public.cms_leads;

-- Service role bypass (canonical pattern — service_role is trusted infra)
CREATE POLICY service_bypass ON public.cms_leads
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenant isolation for public (anon + authenticated) — JWT-claim USING per Iron Rule 15
CREATE POLICY tenant_isolation ON public.cms_leads
  FOR ALL TO public
  USING (
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
  )
  WITH CHECK (
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
  );

-- Part B: 7 v_crm_* views — add security_invoker=on so RLS applies on underlying tables when queried

ALTER VIEW public.v_crm_campaign_performance SET (security_invoker = on);
ALTER VIEW public.v_crm_event_attendees_full SET (security_invoker = on);
ALTER VIEW public.v_crm_event_dashboard      SET (security_invoker = on);
ALTER VIEW public.v_crm_event_stats          SET (security_invoker = on);
ALTER VIEW public.v_crm_lead_event_history   SET (security_invoker = on);
ALTER VIEW public.v_crm_lead_timeline        SET (security_invoker = on);
ALTER VIEW public.v_crm_leads_with_tags      SET (security_invoker = on);

COMMIT;
