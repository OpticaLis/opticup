-- =============================================================================
-- Migration: M4_MESSAGE_PERFORMANCE_TRACKING
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_MESSAGE_PERFORMANCE_TRACKING/SPEC.md
-- Date: 2026-05-14
-- =============================================================================
-- Adds:
--   1. short_link_clicks       — one row per /r/<code> click event
--   2. short_links.message_log_id  — nullable FK to crm_message_log
--   3. v_crm_message_performance   — analytics view (security_invoker=on)
--
-- Iron Rule compliance:
--   14: tenant_id NOT NULL REFERENCES tenants(id) on the new table.
--   15: RLS enabled with canonical two-policy pattern (service_bypass + JWT-claim
--       tenant_isolation) — copied verbatim from short_links policies.
--   22: defense-in-depth on writes — EFs that insert into short_link_clicks
--       always include tenant_id (verified in resolve-link/index.ts).
--   32: this SPEC declares zero destructive operations; the migration is
--       additive only (CREATE TABLE, ALTER ADD COLUMN, CREATE INDEX, CREATE
--       POLICY, CREATE VIEW). Rollback plan lives in SPEC §10.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. short_link_clicks — one row per click event
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS short_link_clicks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  clicked_at    timestamptz NOT NULL DEFAULT now(),
  ip_hash       text NULL,
  user_agent    text NULL,
  referer       text NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE short_link_clicks IS
  'One row per /r/<code> click event. ip_hash is sha256 hex (never raw). user_agent and referer are truncated to 200 chars in the EF. 30s idempotency per (short_link_id, ip_hash) is enforced by resolve-link EF debounce query, not as a DB constraint. Forward-only capture (no historical backfill). See SPEC: M4_MESSAGE_PERFORMANCE_TRACKING.';

CREATE INDEX IF NOT EXISTS idx_short_link_clicks_short_link_id_clicked_at
  ON short_link_clicks(short_link_id, clicked_at);

CREATE INDEX IF NOT EXISTS idx_short_link_clicks_tenant_id_clicked_at
  ON short_link_clicks(tenant_id, clicked_at);

ALTER TABLE short_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON short_link_clicks
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON short_link_clicks
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- -----------------------------------------------------------------------------
-- 2. short_links.message_log_id — nullable FK to crm_message_log
-- -----------------------------------------------------------------------------

ALTER TABLE short_links
  ADD COLUMN IF NOT EXISTS message_log_id uuid NULL
    REFERENCES crm_message_log(id) ON DELETE SET NULL;

COMMENT ON COLUMN short_links.message_log_id IS
  'When send-message EF generates a per-lead short link via injectAutoUrls, this column is backfilled with the crm_message_log row id once that row exists (dispatch.ts UPDATE after the pending log insert). NULL = either historical (pre-2026-05-14) or a failure path that created the short_link but never sent the message.';

CREATE INDEX IF NOT EXISTS idx_short_links_message_log_id
  ON short_links(message_log_id)
  WHERE message_log_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. v_crm_message_performance — analytics view
-- -----------------------------------------------------------------------------
-- Aggregates per (tenant_id, event_id, template_id, channel):
--   messages_sent              — count of crm_message_log rows with status='sent'
--   messages_clicked           — distinct sent messages that had at least one click
--   registrations_after_click  — distinct attendee rows whose registered_at > clicked_at
--                                AND attendee is not soft-deleted
--
-- click_rate_pct and conversion_rate_pct are computed in the UI from these counts.
-- security_invoker=on so RLS on underlying tables determines visibility per JWT.

CREATE OR REPLACE VIEW v_crm_message_performance
WITH (security_invoker = on) AS
SELECT
  m.tenant_id,
  m.event_id,
  m.template_id,
  m.channel,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'sent') AS messages_sent,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL) AS messages_clicked,
  COUNT(DISTINCT a.id) FILTER (
    WHERE m.status = 'sent'
      AND c.id IS NOT NULL
      AND a.registered_at > c.clicked_at
      AND a.is_deleted = false
  ) AS registrations_after_click
FROM crm_message_log m
LEFT JOIN short_links       sl ON sl.message_log_id = m.id
LEFT JOIN short_link_clicks c  ON c.short_link_id   = sl.id
LEFT JOIN crm_event_attendees a
       ON a.tenant_id = m.tenant_id
      AND a.lead_id   = m.lead_id
      AND a.event_id  = m.event_id
WHERE m.template_id IS NOT NULL
GROUP BY m.tenant_id, m.event_id, m.template_id, m.channel;

COMMIT;
