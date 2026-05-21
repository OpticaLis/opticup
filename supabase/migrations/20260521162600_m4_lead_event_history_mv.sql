-- M4_DASHBOARD_STATUS_RPC_AND_LEAD_EVENT_HISTORY_MV (Sprint 1 SPEC 3, 2026-05-21).
-- Mirrors what was applied via Supabase MCP apply_migration on 2026-05-21.
-- Materialized view cloning v_crm_lead_event_history. Dashboard reads the MV
-- instead of the underlying O(N) view; refresh every 5 minutes via pg_cron.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_crm_lead_event_history AS
SELECT * FROM public.v_crm_lead_event_history;

CREATE UNIQUE INDEX IF NOT EXISTS mv_crm_lead_event_history_pk
  ON public.mv_crm_lead_event_history (lead_id);

CREATE INDEX IF NOT EXISTS idx_mv_crm_lead_event_history_returning
  ON public.mv_crm_lead_event_history (tenant_id, is_returning_customer);

CREATE INDEX IF NOT EXISTS idx_mv_crm_lead_event_history_tenant
  ON public.mv_crm_lead_event_history (tenant_id);

REFRESH MATERIALIZED VIEW public.mv_crm_lead_event_history;

GRANT SELECT ON public.mv_crm_lead_event_history TO authenticated, service_role;

SELECT cron.schedule(
  'm4-refresh-lead-event-history-mv',
  '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crm_lead_event_history'
);

COMMENT ON MATERIALIZED VIEW public.mv_crm_lead_event_history IS
  'M4_DASHBOARD_STATUS_RPC_AND_LEAD_EVENT_HISTORY_MV (Sprint 1 SPEC 3, 2026-05-21). '
  'Snapshot of v_crm_lead_event_history. Dashboard returning-customer COUNT reads this '
  'instead of the underlying O(N) view. Refresh schedule: every 5 minutes via pg_cron '
  'job m4-refresh-lead-event-history-mv.';
