-- M4_NIGHT_RUN_2026_05_20 W1.1 — F-M01-1 close.
-- New composite index on crm_message_log to back the Resend Failed Messages
-- button (filters tenant_id + status='failed' + recent created_at). At today's
-- ~6K Prizma rows + 760 failed the existing idx_crm_message_log_tenant_created
-- scan is fine, but the resend list paged query (tenant_id=X AND status='failed')
-- benefits from a tenant+status leading edge as volume grows.
-- Iron Rule 21 satisfied: no existing index covers this filter shape (see
-- audit Mission 01 §5 — 5 existing indexes, none on status).
CREATE INDEX IF NOT EXISTS idx_crm_message_log_tenant_status_created
  ON public.crm_message_log (tenant_id, status, created_at DESC);
