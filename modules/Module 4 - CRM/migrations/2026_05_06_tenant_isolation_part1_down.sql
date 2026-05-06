-- M4_TENANT_ISOLATION_HARDENING_PART1 (rollback)
-- Restores the pre-migration state. Apply ONLY if QA on the forward migration fails.

BEGIN;

-- Part A: restore the 3 original cms_leads policies (broken by design — they bypass tenant)

DROP POLICY IF EXISTS tenant_isolation ON public.cms_leads;
DROP POLICY IF EXISTS service_bypass   ON public.cms_leads;

CREATE POLICY cms_leads_anon_insert ON public.cms_leads
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY cms_leads_authenticated_read ON public.cms_leads
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY cms_leads_service_all ON public.cms_leads
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Part B: strip security_invoker from the 7 v_crm_* views (back to default off = SECURITY DEFINER)

ALTER VIEW public.v_crm_campaign_performance RESET (security_invoker);
ALTER VIEW public.v_crm_event_attendees_full RESET (security_invoker);
ALTER VIEW public.v_crm_event_dashboard      RESET (security_invoker);
ALTER VIEW public.v_crm_event_stats          RESET (security_invoker);
ALTER VIEW public.v_crm_lead_event_history   RESET (security_invoker);
ALTER VIEW public.v_crm_lead_timeline        RESET (security_invoker);
ALTER VIEW public.v_crm_leads_with_tags      RESET (security_invoker);

COMMIT;
