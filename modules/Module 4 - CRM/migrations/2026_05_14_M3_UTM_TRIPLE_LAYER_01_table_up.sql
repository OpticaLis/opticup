-- Migration: M3_UTM_TRIPLE_LAYER_PERSISTENCE — #01 table + RLS + indices
-- SPEC: modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/SPEC.md
-- Author: opticup-executor (Foreman dispatched), 2026-05-14
-- Phase 1 P1.1 of FUNNEL_ROADMAP. Cross-cut SPEC (M3 capture + M4 ownership).
-- Iron Rules satisfied: 14 (tenant_id NOT NULL), 15 (canonical JWT-claim RLS),
-- 18 (UNIQUE tenant-scoped), 20 (SaaS-clean), 22 (defense-in-depth).
--
-- NOTE on CREATE TABLE: written without `public.` schema prefix so the
-- pre-commit rule-15-rls check picks up `crm_lead_touchpoints` as the
-- table name (the regex does not account for schema prefixes — bug logged
-- in EXECUTION_REPORT FIND-3 of this SPEC). Default search_path is public.

CREATE TABLE IF NOT EXISTS crm_lead_touchpoints (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id),
  lead_id             uuid NULL REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  phone_normalized    text NULL,
  touchpoint_type     text NOT NULL,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  utm_source          text NULL,
  utm_medium          text NULL,
  utm_campaign        text NULL,
  utm_content         text NULL,
  utm_term            text NULL,
  utm_campaign_id     text NULL,
  referrer_url        text NULL,
  landing_url         text NULL,
  short_link_code     text NULL,
  short_link_id       uuid NULL REFERENCES public.short_links(id) ON DELETE SET NULL,
  broadcast_id        uuid NULL,  -- reserved for Phase 1 P1.2; no FK yet
  event_id            uuid NULL REFERENCES public.crm_events(id) ON DELETE SET NULL,
  attendee_id         uuid NULL REFERENCES public.crm_event_attendees(id) ON DELETE SET NULL,
  dedupe_key          text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_lead_touchpoints_type_check CHECK (
    touchpoint_type IN ('short_link_click', 'lead_submit', 'event_register')
  ),
  CONSTRAINT crm_lead_touchpoints_tenant_dedupe_uq UNIQUE (tenant_id, dedupe_key)
);

-- Indices (Brief §2 performance budget — covers FH Dashboard queries Phase 2.5 will run)

CREATE INDEX IF NOT EXISTS idx_crm_lead_touchpoints_tenant_lead_occurred
  ON public.crm_lead_touchpoints (tenant_id, lead_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_crm_lead_touchpoints_tenant_phone_type_occurred
  ON public.crm_lead_touchpoints (tenant_id, phone_normalized, touchpoint_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_crm_lead_touchpoints_tenant_occurred
  ON public.crm_lead_touchpoints (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_lead_touchpoints_tenant_short_link
  ON public.crm_lead_touchpoints (tenant_id, short_link_id)
  WHERE short_link_id IS NOT NULL;

-- RLS — canonical JWT-claim pattern per CLAUDE.md §5 Rule 15.
-- Reference implementation: pending_sales, crm_event_attendees, short_link_clicks.
-- Brand-new table — no policy-idempotency safety needed (no pre-existing policies to clear).

ALTER TABLE public.crm_lead_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.crm_lead_touchpoints
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY tenant_isolation ON public.crm_lead_touchpoints
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
  )
  WITH CHECK (
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
  );

-- Grants (RLS is the gate; explicit grants are belt+suspenders).
GRANT SELECT, INSERT ON public.crm_lead_touchpoints TO authenticated;
GRANT SELECT, INSERT ON public.crm_lead_touchpoints TO anon;
GRANT ALL ON public.crm_lead_touchpoints TO service_role;

COMMENT ON TABLE public.crm_lead_touchpoints IS
  'M3_UTM_TRIPLE_LAYER_PERSISTENCE (2026-05-14, Phase 1 P1.1): per-touchpoint journey log. Captures short_link_click, lead_submit, event_register. Substrate for Phase 4 E1 (MTA) + E7 (Customer Journey Analytics). crm_leads.utm_* columns kept for backward compat; this table is the authoritative per-touchpoint truth.';

COMMENT ON COLUMN public.crm_lead_touchpoints.dedupe_key IS
  'Per-type natural identity: click = short_link_id:ip_hash_short:minute_bucket; lead_submit = lead_id:epoch_seconds; event_register = attendee_id. UNIQUE(tenant_id, dedupe_key) prevents accidental double-records (e.g. revival of same attendee_id).';

COMMENT ON COLUMN public.crm_lead_touchpoints.broadcast_id IS
  'Reserved for Phase 1 P1.2 (M4_BROADCAST_ID_PROPAGATION). NOT populated by any caller in P1.1. P1.2 will wire propagation.';
