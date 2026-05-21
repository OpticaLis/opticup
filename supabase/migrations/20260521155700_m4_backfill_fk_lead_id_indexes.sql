-- M4_BACKFILL_FK_LEAD_ID_INDEXES (2026-05-21, Sprint 1 SPEC 1)
-- Mirrors what was applied to the live DB via Supabase MCP apply_migration.
-- Audit Finding #1: 4 FK-referencing tables on crm_leads.id had no index on
-- lead_id, causing FK-validation SEQ SCAN on every lead delete. Empirically:
-- 100K-lead DELETE timed out >60s during the M4 full audit teardown.
-- Tables are small (<14K rows) so a non-concurrent CREATE INDEX is sub-second.

CREATE INDEX IF NOT EXISTS idx_crm_lead_notes_lead_id
  ON public.crm_lead_notes (lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_message_log_lead_id
  ON public.crm_message_log (lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_unsubscribes_lead_id
  ON public.crm_unsubscribes (lead_id);

CREATE INDEX IF NOT EXISTS idx_short_links_lead_id
  ON public.short_links (lead_id) WHERE lead_id IS NOT NULL;
