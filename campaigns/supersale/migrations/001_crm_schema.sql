-- =============================================================================
-- CRM Phase A — Full Schema Migration
-- SPEC: modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/SPEC.md
-- Source: campaigns/supersale/CRM_SCHEMA_DESIGN.md (v3 Final, 2026-04-20)
-- Applied to: Supabase project tsxrrxzmdxaenlvocyit
-- Date: 2026-04-20
-- Prizma tenant_id: 6ad0781b-37f0-47a9-92e3-be9ed1477e1c
-- =============================================================================
-- Order: Tables → Enable RLS → RLS Policies → Views → RPCs → Seed Data
-- =============================================================================


-- =============================================================================
-- PART 1: TABLES (dependency order)
-- =============================================================================

-- 1. crm_campaigns (no FK except tenants)
CREATE TABLE crm_campaigns (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             uuid        NOT NULL REFERENCES tenants(id),
  slug                  text        NOT NULL,
  name                  text        NOT NULL,
  description           text,
  is_active             boolean     NOT NULL DEFAULT true,
  default_location      text,
  default_hours         text,
  default_max_capacity  int,
  default_booking_fee   numeric(10,2),
  cancellation_hours    int,
  created_at            timestamptz NOT NULL DEFAULT now(),
  is_deleted            boolean     NOT NULL DEFAULT false,
  UNIQUE (tenant_id, slug)
);

-- 2. crm_statuses (no FK except tenants)
CREATE TABLE crm_statuses (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid        NOT NULL REFERENCES tenants(id),
  entity_type        text        NOT NULL,
  slug               text        NOT NULL,
  name_he            text        NOT NULL,
  name_en            text,
  color              text                 DEFAULT '#22c55e',
  icon               text,
  sort_order         int         NOT NULL DEFAULT 0,
  is_default         boolean     NOT NULL DEFAULT false,
  is_terminal        boolean     NOT NULL DEFAULT false,
  triggers_messages  boolean     NOT NULL DEFAULT false,
  is_active          boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, slug)
);

-- 3. crm_tags (no FK except tenants)
CREATE TABLE crm_tags (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      uuid        NOT NULL REFERENCES tenants(id),
  name           text        NOT NULL,
  color          text                 DEFAULT '#3b82f6',
  category       text,
  is_auto        boolean     NOT NULL DEFAULT false,
  auto_condition jsonb,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  is_deleted     boolean     NOT NULL DEFAULT false,
  UNIQUE (tenant_id, name)
);

-- 4. crm_events (FK → crm_campaigns)
CREATE TABLE crm_events (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             uuid        NOT NULL REFERENCES tenants(id),
  campaign_id           uuid        NOT NULL REFERENCES crm_campaigns(id),
  event_number          int         NOT NULL,
  name                  text        NOT NULL,
  event_date            date        NOT NULL,
  start_time            time        NOT NULL DEFAULT '09:00',
  end_time              time        NOT NULL DEFAULT '14:00',
  location_address      text        NOT NULL,
  location_waze_url     text,
  status                text        NOT NULL DEFAULT 'planning',
  max_capacity          int         NOT NULL DEFAULT 50,
  booking_fee           numeric(10,2) NOT NULL DEFAULT 50.00,
  coupon_code           text        NOT NULL,
  registration_form_url text,
  notes                 text,
  monday_item_id        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  is_deleted            boolean     NOT NULL DEFAULT false,
  UNIQUE (tenant_id, event_number)
);

-- 5. crm_leads (no FK except tenants)
CREATE TABLE crm_leads (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            uuid        NOT NULL REFERENCES tenants(id),
  full_name            text        NOT NULL,
  phone                text        NOT NULL,
  email                text,
  city                 text,
  language             text        NOT NULL DEFAULT 'he',
  status               text        NOT NULL DEFAULT 'new',
  source               text,
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_content          text,
  utm_term             text,
  utm_campaign_id      text,
  client_notes         text,
  terms_approved       boolean     NOT NULL DEFAULT false,
  terms_approved_at    timestamptz,
  marketing_consent    boolean     NOT NULL DEFAULT false,
  unsubscribed_at      timestamptz,
  verified_phone       boolean     NOT NULL DEFAULT false,
  monday_item_id       text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  is_deleted           boolean     NOT NULL DEFAULT false,
  UNIQUE (tenant_id, phone)
);

-- 6. crm_event_status_history (FK → crm_events)
CREATE TABLE crm_event_status_history (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid        NOT NULL REFERENCES tenants(id),
  event_id      uuid        NOT NULL REFERENCES crm_events(id),
  status        text        NOT NULL,
  employee_id   uuid                 REFERENCES employees(id),
  messages_sent int,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 7. crm_event_attendees (FK → crm_leads, crm_events)
CREATE TABLE crm_event_attendees (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             uuid        NOT NULL REFERENCES tenants(id),
  lead_id               uuid        NOT NULL REFERENCES crm_leads(id),
  event_id              uuid        NOT NULL REFERENCES crm_events(id),
  status                text        NOT NULL DEFAULT 'registered',
  registration_method   text        NOT NULL DEFAULT 'form',
  registered_at         timestamptz NOT NULL DEFAULT now(),
  confirmed_at          timestamptz,
  checked_in_at         timestamptz,
  purchased_at          timestamptz,
  cancelled_at          timestamptz,
  purchase_amount       numeric(10,2),
  booking_fee_paid      boolean     NOT NULL DEFAULT false,
  booking_fee_refunded  boolean     NOT NULL DEFAULT false,
  coupon_sent           boolean     NOT NULL DEFAULT false,
  coupon_sent_at        timestamptz,
  scheduled_time        text,
  eye_exam_needed       text,
  client_notes          text,
  waiting_list_position int,
  monday_item_id        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  is_deleted            boolean     NOT NULL DEFAULT false,
  UNIQUE (tenant_id, lead_id, event_id)
);

-- 8. crm_lead_notes (FK → crm_leads, crm_events)
CREATE TABLE crm_lead_notes (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  lead_id     uuid        NOT NULL REFERENCES crm_leads(id),
  event_id    uuid                 REFERENCES crm_events(id),
  content     text        NOT NULL,
  employee_id uuid                 REFERENCES employees(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 9. crm_lead_tags (FK → crm_leads, crm_tags) — composite PK
CREATE TABLE crm_lead_tags (
  tenant_id  uuid        NOT NULL REFERENCES tenants(id),
  lead_id    uuid        NOT NULL REFERENCES crm_leads(id),
  tag_id     uuid        NOT NULL REFERENCES crm_tags(id),
  tagged_by  uuid                 REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, lead_id, tag_id)
);

-- 10. crm_custom_field_defs (no FK except tenants)
CREATE TABLE crm_custom_field_defs (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           uuid        NOT NULL REFERENCES tenants(id),
  entity_type         text        NOT NULL,
  field_key           text        NOT NULL,
  field_name_he       text        NOT NULL,
  field_name_en       text,
  field_type          text        NOT NULL DEFAULT 'text',
  select_options      jsonb,
  is_required         boolean     NOT NULL DEFAULT false,
  default_value       text,
  sort_order          int         NOT NULL DEFAULT 0,
  is_visible_in_table boolean     NOT NULL DEFAULT true,
  is_visible_in_form  boolean     NOT NULL DEFAULT false,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, field_key)
);

-- 11. crm_custom_field_vals (FK → crm_custom_field_defs)
CREATE TABLE crm_custom_field_vals (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      uuid        NOT NULL REFERENCES tenants(id),
  field_def_id   uuid        NOT NULL REFERENCES crm_custom_field_defs(id),
  entity_type    text        NOT NULL,
  entity_id      uuid        NOT NULL,
  value_text     text,
  value_number   numeric,
  value_date     timestamptz,
  value_boolean  boolean,
  value_json     jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, field_def_id, entity_id)
);

-- 12. crm_field_visibility (role_id is text — matches roles.id type)
CREATE TABLE crm_field_visibility (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  role_id     text        NOT NULL,
  entity_type text        NOT NULL,
  field_key   text        NOT NULL,
  visible     boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role_id, entity_type, field_key)
);

-- 13. crm_message_templates (no FK except tenants)
CREATE TABLE crm_message_templates (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  uuid        NOT NULL REFERENCES tenants(id),
  slug       text        NOT NULL,
  name       text        NOT NULL,
  channel    text        NOT NULL,
  language   text        NOT NULL DEFAULT 'he',
  subject    text,
  body       text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug, channel, language)
);

-- 14. crm_automation_rules (no FK except tenants)
CREATE TABLE crm_automation_rules (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         uuid        NOT NULL REFERENCES tenants(id),
  name              text        NOT NULL,
  trigger_entity    text        NOT NULL,
  trigger_event     text        NOT NULL,
  trigger_condition jsonb       NOT NULL,
  action_type       text        NOT NULL,
  action_config     jsonb       NOT NULL,
  sort_order        int         NOT NULL DEFAULT 0,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- 15. crm_broadcasts (FK → tenants + employees + crm_message_templates)
--     Must be created BEFORE crm_message_log (which references broadcasts)
CREATE TABLE crm_broadcasts (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         uuid        NOT NULL REFERENCES tenants(id),
  employee_id       uuid        NOT NULL REFERENCES employees(id),
  name              text        NOT NULL,
  channel           text        NOT NULL,
  template_id       uuid                 REFERENCES crm_message_templates(id),
  filter_criteria   jsonb       NOT NULL,
  total_recipients  int         NOT NULL DEFAULT 0,
  total_sent        int         NOT NULL DEFAULT 0,
  total_failed      int         NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'draft',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 16. crm_message_log (FK → crm_leads, crm_events, crm_message_templates, crm_broadcasts)
CREATE TABLE crm_message_log (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid        NOT NULL REFERENCES tenants(id),
  lead_id       uuid        NOT NULL REFERENCES crm_leads(id),
  event_id      uuid                 REFERENCES crm_events(id),
  template_id   uuid                 REFERENCES crm_message_templates(id),
  broadcast_id  uuid                 REFERENCES crm_broadcasts(id),
  channel       text        NOT NULL,
  content       text        NOT NULL,
  status        text        NOT NULL DEFAULT 'sent',
  external_id   text,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 17. crm_audit_log (FK → tenants + employees)
CREATE TABLE crm_audit_log (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid        NOT NULL REFERENCES tenants(id),
  employee_id   uuid                 REFERENCES employees(id),
  entity_type   text        NOT NULL,
  entity_id     uuid        NOT NULL,
  action        text        NOT NULL,
  field_changed text,
  old_value     text,
  new_value     text,
  metadata      jsonb,
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 18. crm_monday_column_map (no FK except tenants)
CREATE TABLE crm_monday_column_map (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            uuid        NOT NULL REFERENCES tenants(id),
  monday_board_id      text        NOT NULL,
  monday_board_name    text        NOT NULL,
  monday_column_id     text        NOT NULL,
  monday_column_title  text        NOT NULL,
  crm_entity_type      text        NOT NULL,
  crm_field_key        text        NOT NULL,
  is_core_field        boolean     NOT NULL DEFAULT true,
  transform_rule       jsonb,
  sync_direction       text        NOT NULL DEFAULT 'both',
  is_active            boolean     NOT NULL DEFAULT true,
  UNIQUE (tenant_id, monday_board_id, monday_column_id)
);

-- 19. crm_cx_surveys (FK → crm_event_attendees)
CREATE TABLE crm_cx_surveys (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           uuid        NOT NULL REFERENCES tenants(id),
  attendee_id         uuid        NOT NULL REFERENCES crm_event_attendees(id),
  rating              int,
  comment             text,
  google_review_sent  boolean     NOT NULL DEFAULT false,
  callback_requested  boolean     NOT NULL DEFAULT false,
  callback_done       boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 20. crm_unsubscribes (FK → crm_leads)
CREATE TABLE crm_unsubscribes (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  uuid        NOT NULL REFERENCES tenants(id),
  lead_id    uuid        NOT NULL REFERENCES crm_leads(id),
  channel    text        NOT NULL,
  reason     text,
  method     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 21. crm_ad_spend (FK → crm_campaigns)
CREATE TABLE crm_ad_spend (
  id               uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid           NOT NULL REFERENCES tenants(id),
  campaign_id      uuid           NOT NULL REFERENCES crm_campaigns(id),
  ad_campaign_name text           NOT NULL,
  ad_campaign_id   text,
  status           text           NOT NULL DEFAULT 'active',
  event_type       text,
  total_spend      numeric(10,2)  NOT NULL DEFAULT 0,
  daily_budget     numeric(10,2),
  utm_campaign     text,
  utm_content      text,
  utm_term         text,
  last_synced_at   timestamptz,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  is_deleted       boolean        NOT NULL DEFAULT false,
  UNIQUE (tenant_id, ad_campaign_id)
);

-- 22. crm_unit_economics (FK → crm_campaigns)
CREATE TABLE crm_unit_economics (
  id                 uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid          NOT NULL REFERENCES tenants(id),
  campaign_id        uuid          NOT NULL REFERENCES crm_campaigns(id),
  gross_margin_pct   numeric(5,2)  NOT NULL,
  kill_multiplier    numeric(5,2)  NOT NULL,
  scaling_multiplier numeric(5,2)  NOT NULL,
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, campaign_id)
);

-- 23. crm_campaign_pages (no FK except tenants)
CREATE TABLE crm_campaign_pages (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid        NOT NULL REFERENCES tenants(id),
  slug             text        NOT NULL,
  name             text        NOT NULL,
  password_hash    text        NOT NULL,
  view_name        text        NOT NULL,
  visible_columns  jsonb       NOT NULL DEFAULT '[]',
  is_active        boolean     NOT NULL DEFAULT true,
  last_accessed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);


-- =============================================================================
-- PART 2: ENABLE ROW LEVEL SECURITY on all 23 tables
-- =============================================================================

ALTER TABLE crm_campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_statuses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_event_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_event_attendees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_field_defs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_field_vals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_field_visibility    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_message_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_automation_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_broadcasts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_message_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_monday_column_map   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_cx_surveys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_unsubscribes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ad_spend            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_unit_economics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_pages      ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- PART 3: RLS POLICIES — 2 per table (service_bypass + tenant_isolation)
-- Canonical JWT pattern per CLAUDE.md §4 Rule 15
-- =============================================================================

-- crm_campaigns
CREATE POLICY service_bypass ON crm_campaigns FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_campaigns FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_statuses
CREATE POLICY service_bypass ON crm_statuses FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_statuses FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_tags
CREATE POLICY service_bypass ON crm_tags FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_tags FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_events
CREATE POLICY service_bypass ON crm_events FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_events FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_leads
CREATE POLICY service_bypass ON crm_leads FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_leads FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_event_status_history
CREATE POLICY service_bypass ON crm_event_status_history FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_event_status_history FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_event_attendees
CREATE POLICY service_bypass ON crm_event_attendees FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_event_attendees FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_lead_notes
CREATE POLICY service_bypass ON crm_lead_notes FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_lead_notes FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_lead_tags
CREATE POLICY service_bypass ON crm_lead_tags FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_lead_tags FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_custom_field_defs
CREATE POLICY service_bypass ON crm_custom_field_defs FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_custom_field_defs FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_custom_field_vals
CREATE POLICY service_bypass ON crm_custom_field_vals FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_custom_field_vals FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_field_visibility
CREATE POLICY service_bypass ON crm_field_visibility FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_field_visibility FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_message_templates
CREATE POLICY service_bypass ON crm_message_templates FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_message_templates FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_automation_rules
CREATE POLICY service_bypass ON crm_automation_rules FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_automation_rules FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_broadcasts
CREATE POLICY service_bypass ON crm_broadcasts FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_broadcasts FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_message_log
CREATE POLICY service_bypass ON crm_message_log FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_message_log FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_audit_log
CREATE POLICY service_bypass ON crm_audit_log FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_audit_log FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_monday_column_map
CREATE POLICY service_bypass ON crm_monday_column_map FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_monday_column_map FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_cx_surveys
CREATE POLICY service_bypass ON crm_cx_surveys FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_cx_surveys FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_unsubscribes
CREATE POLICY service_bypass ON crm_unsubscribes FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_unsubscribes FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_ad_spend
CREATE POLICY service_bypass ON crm_ad_spend FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_ad_spend FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_unit_economics
CREATE POLICY service_bypass ON crm_unit_economics FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_unit_economics FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);

-- crm_campaign_pages
CREATE POLICY service_bypass ON crm_campaign_pages FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON crm_campaign_pages FOR ALL TO public USING (
  tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
);


-- =============================================================================
-- PART 4: VIEWS (dependency order)
-- =============================================================================

-- V1: v_crm_event_stats — replaces denormalized counters on crm_events
CREATE VIEW v_crm_event_stats AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.event_number,
  e.name,
  e.event_date,
  e.status,
  e.max_capacity,

  COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelled', 'duplicate') AND a.is_deleted = false)
    AS total_registered,
  COUNT(a.id) FILTER (WHERE a.status = 'confirmed' AND a.is_deleted = false)
    AS total_confirmed,
  COUNT(a.id) FILTER (WHERE a.status = 'attended' AND a.is_deleted = false)
    AS total_attended,
  COUNT(a.id) FILTER (WHERE a.purchase_amount IS NOT NULL AND a.purchase_amount > 0 AND a.is_deleted = false)
    AS total_purchased,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.is_deleted = false), 0)
    AS total_revenue,
  COUNT(a.id) FILTER (WHERE a.status = 'event_closed' AND a.is_deleted = false)
    AS attempts_after_close,

  e.max_capacity - COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelled', 'duplicate') AND a.is_deleted = false)
    AS spots_remaining,
  CASE WHEN COUNT(a.id) FILTER (WHERE a.status = 'attended' AND a.is_deleted = false) > 0
    THEN ROUND(
      COUNT(a.id) FILTER (WHERE a.purchase_amount IS NOT NULL AND a.purchase_amount > 0 AND a.is_deleted = false)::numeric /
      COUNT(a.id) FILTER (WHERE a.status = 'attended' AND a.is_deleted = false) * 100, 1
    )
    ELSE 0
  END AS purchase_rate_pct

FROM crm_events e
LEFT JOIN crm_event_attendees a ON e.id = a.event_id AND e.tenant_id = a.tenant_id
WHERE e.is_deleted = false
GROUP BY e.id;

-- V2: v_crm_lead_event_history — per-lead event + purchase history
CREATE VIEW v_crm_lead_event_history AS
SELECT
  l.id AS lead_id,
  l.tenant_id,
  l.full_name,
  l.phone,

  COUNT(a.id) FILTER (WHERE a.status = 'attended') AS total_events_attended,
  COALESCE(SUM(a.purchase_amount), 0) AS total_purchases,
  COUNT(a.id) FILTER (WHERE a.purchase_amount > 0) > 0 AS is_returning_customer,
  MAX(e.event_date) FILTER (WHERE a.status = 'attended') AS last_attended_date,

  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'event_id', e.id,
        'event_number', e.event_number,
        'event_name', e.name,
        'event_date', e.event_date,
        'status', a.status,
        'purchase_amount', a.purchase_amount,
        'checked_in_at', a.checked_in_at
      ) ORDER BY e.event_date DESC
    ) FILTER (WHERE a.id IS NOT NULL),
    '[]'::jsonb
  ) AS event_history

FROM crm_leads l
LEFT JOIN crm_event_attendees a ON l.id = a.lead_id AND l.tenant_id = a.tenant_id AND a.is_deleted = false
LEFT JOIN crm_events e ON a.event_id = e.id
WHERE l.is_deleted = false
GROUP BY l.id;

-- V3: v_crm_event_dashboard — event management screen (depends on v_crm_event_stats)
CREATE VIEW v_crm_event_dashboard AS
SELECT
  e.*,
  c.name AS campaign_name,
  c.slug AS campaign_slug,
  s.total_registered,
  s.total_confirmed,
  s.total_attended,
  s.total_purchased,
  s.total_revenue,
  s.spots_remaining,
  s.purchase_rate_pct
FROM crm_events e
JOIN crm_campaigns c ON e.campaign_id = c.id
LEFT JOIN v_crm_event_stats s ON e.id = s.event_id
WHERE e.is_deleted = false;

-- V4: v_crm_event_attendees_full — attendee list with lead data
CREATE VIEW v_crm_event_attendees_full AS
SELECT
  a.*,
  l.full_name,
  l.phone,
  l.email,
  l.city,
  l.language,
  l.terms_approved,
  e.event_number,
  e.event_date,
  e.coupon_code,
  st.name_he AS status_name,
  st.color AS status_color
FROM crm_event_attendees a
JOIN crm_leads l ON a.lead_id = l.id AND a.tenant_id = l.tenant_id
JOIN crm_events e ON a.event_id = e.id AND a.tenant_id = e.tenant_id
LEFT JOIN crm_statuses st ON st.slug = a.status AND st.entity_type = 'attendee' AND st.tenant_id = a.tenant_id
WHERE a.is_deleted = false;

-- V5: v_crm_lead_timeline — unified timeline (notes + audit + messages)
CREATE VIEW v_crm_lead_timeline AS
SELECT lead_id, tenant_id, created_at, 'note' AS type, content AS detail, employee_id
  FROM crm_lead_notes
UNION ALL
SELECT entity_id, tenant_id, created_at, 'audit',
  action || ': ' || COALESCE(field_changed, '') || ' → ' || COALESCE(new_value, ''), employee_id
  FROM crm_audit_log WHERE entity_type = 'lead'
UNION ALL
SELECT lead_id, tenant_id, created_at, 'message',
  channel || ' — ' || status, NULL
  FROM crm_message_log
ORDER BY created_at DESC;

-- V6: v_crm_leads_with_tags — leads with tag arrays
CREATE VIEW v_crm_leads_with_tags AS
SELECT l.*,
  COALESCE(array_agg(t.name ORDER BY t.sort_order) FILTER (WHERE t.id IS NOT NULL), '{}') AS tag_names,
  COALESCE(array_agg(t.color ORDER BY t.sort_order) FILTER (WHERE t.id IS NOT NULL), '{}') AS tag_colors
FROM crm_leads l
LEFT JOIN crm_lead_tags lt ON l.id = lt.lead_id AND l.tenant_id = lt.tenant_id
LEFT JOIN crm_tags t ON lt.tag_id = t.id
WHERE l.is_deleted = false
GROUP BY l.id;

-- V7: v_crm_campaign_performance — replaces Affiliates + Facebook ADS boards
CREATE VIEW v_crm_campaign_performance AS
SELECT
  ad.id AS ad_spend_id,
  ad.tenant_id,
  ad.ad_campaign_name,
  ad.ad_campaign_id,
  ad.status AS ad_status,
  ad.event_type,
  ad.total_spend,
  ad.daily_budget,

  COUNT(DISTINCT l.id) AS total_leads,

  COUNT(DISTINCT l.id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM crm_event_attendees a
      WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id
        AND a.purchase_amount > 0 AND a.is_deleted = false
    )
  ) AS total_buyers,

  COALESCE((
    SELECT SUM(a2.purchase_amount)
    FROM crm_event_attendees a2
    JOIN crm_leads l2 ON a2.lead_id = l2.id AND a2.tenant_id = l2.tenant_id
    WHERE l2.utm_campaign = ad.utm_campaign
      AND (ad.utm_content IS NULL OR l2.utm_content = ad.utm_content)
      AND (ad.utm_term IS NULL OR l2.utm_term = ad.utm_term)
      AND l2.tenant_id = ad.tenant_id
      AND a2.purchase_amount > 0 AND a2.is_deleted = false
  ), 0) AS total_revenue,

  CASE WHEN COUNT(DISTINCT l.id) > 0
    THEN ROUND(ad.total_spend / COUNT(DISTINCT l.id), 2)
    ELSE NULL
  END AS cpl,

  COALESCE((
    SELECT SUM(a2.purchase_amount)
    FROM crm_event_attendees a2
    JOIN crm_leads l2 ON a2.lead_id = l2.id AND a2.tenant_id = l2.tenant_id
    WHERE l2.utm_campaign = ad.utm_campaign
      AND (ad.utm_content IS NULL OR l2.utm_content = ad.utm_content)
      AND (ad.utm_term IS NULL OR l2.utm_term = ad.utm_term)
      AND l2.tenant_id = ad.tenant_id
      AND a2.purchase_amount > 0 AND a2.is_deleted = false
  ), 0) * COALESCE(ue.gross_margin_pct, 0) AS gross_profit,

  ue.gross_margin_pct,
  ue.kill_multiplier,
  ue.scaling_multiplier,

  CASE
    WHEN COUNT(DISTINCT l.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM crm_event_attendees a
        WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id
          AND a.purchase_amount > 0 AND a.is_deleted = false
      )
    ) = 0 THEN 'TEST'
    WHEN ad.total_spend / NULLIF(COUNT(DISTINCT l.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM crm_event_attendees a
        WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id
          AND a.purchase_amount > 0 AND a.is_deleted = false
      )
    ), 0) > COALESCE(ue.kill_multiplier, 4) * COALESCE(ue.gross_margin_pct, 0.2) * 1000
    THEN 'STOP'
    WHEN ad.total_spend / NULLIF(COUNT(DISTINCT l.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM crm_event_attendees a
        WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id
          AND a.purchase_amount > 0 AND a.is_deleted = false
      )
    ), 0) < COALESCE(ue.scaling_multiplier, 6) * COALESCE(ue.gross_margin_pct, 0.2) * 1000
    THEN 'SCALE'
    ELSE 'TEST'
  END AS decision

FROM crm_ad_spend ad
LEFT JOIN crm_leads l ON l.utm_campaign = ad.utm_campaign
  AND (ad.utm_content IS NULL OR l.utm_content = ad.utm_content)
  AND (ad.utm_term IS NULL OR l.utm_term = ad.utm_term)
  AND l.tenant_id = ad.tenant_id
  AND l.is_deleted = false
LEFT JOIN crm_campaigns c ON ad.campaign_id = c.id
LEFT JOIN crm_unit_economics ue ON ue.campaign_id = c.id AND ue.tenant_id = ad.tenant_id
WHERE ad.is_deleted = false
GROUP BY ad.id, ue.gross_margin_pct, ue.kill_multiplier, ue.scaling_multiplier;


-- =============================================================================
-- PART 5: RPCs (Iron Rule 11 — atomic sequential numbers)
-- =============================================================================

-- RPC 1: next_crm_event_number — atomic event numbering
-- Lock the campaign row (not aggregate) to prevent concurrent event creation.
CREATE OR REPLACE FUNCTION next_crm_event_number(
  p_tenant_id   uuid,
  p_campaign_id uuid
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
BEGIN
  -- Lock campaign row to prevent concurrent inserts for same campaign
  PERFORM id FROM crm_campaigns
   WHERE id = p_campaign_id AND tenant_id = p_tenant_id
     FOR UPDATE;

  SELECT COALESCE(MAX(event_number), 0) + 1
    INTO v_next
    FROM crm_events
   WHERE tenant_id = p_tenant_id
     AND campaign_id = p_campaign_id;

  RETURN v_next;
END;
$$;

-- RPC 2: register_lead_to_event — registration + capacity check + duplicate check
CREATE OR REPLACE FUNCTION register_lead_to_event(
  p_tenant_id   uuid,
  p_lead_id     uuid,
  p_event_id    uuid,
  p_method      text DEFAULT 'form'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event         crm_events%ROWTYPE;
  v_current_count int;
  v_attendee_id   uuid;
  v_existing_id   uuid;
BEGIN
  -- Lock the event row
  SELECT * INTO v_event FROM crm_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Check for duplicate registration
  SELECT id INTO v_existing_id FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id
     AND is_deleted = false;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing_id);
  END IF;

  -- Count current active registrations (capacity check)
  SELECT COUNT(*) INTO v_current_count
    FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate') AND is_deleted = false
     FOR UPDATE;

  IF v_current_count >= v_event.max_capacity THEN
    -- Insert as waiting list / event_closed
    INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
    VALUES (p_tenant_id, p_lead_id, p_event_id,
            CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END,
            p_method)
    RETURNING id INTO v_attendee_id;
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'waiting_list');
  END IF;

  -- Normal registration
  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;

  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$$;

-- RPC 3: check_in_attendee — QR scan + status update
CREATE OR REPLACE FUNCTION check_in_attendee(
  p_tenant_id   uuid,
  p_attendee_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendee crm_event_attendees%ROWTYPE;
BEGIN
  SELECT * INTO v_attendee FROM crm_event_attendees
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id AND is_deleted = false FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'attendee_not_found');
  END IF;

  IF v_attendee.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_checked_in', 'checked_in_at', v_attendee.checked_in_at);
  END IF;

  UPDATE crm_event_attendees
     SET status = 'attended', checked_in_at = now()
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('success', true, 'attendee_id', p_attendee_id, 'checked_in_at', now());
END;
$$;

-- RPC 4: record_purchase — record purchase amount for attendee
CREATE OR REPLACE FUNCTION record_purchase(
  p_tenant_id   uuid,
  p_attendee_id uuid,
  p_amount      numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendee crm_event_attendees%ROWTYPE;
BEGIN
  SELECT * INTO v_attendee FROM crm_event_attendees
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id AND is_deleted = false FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'attendee_not_found');
  END IF;

  UPDATE crm_event_attendees
     SET purchase_amount = p_amount, purchased_at = now()
   WHERE id = p_attendee_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('success', true, 'attendee_id', p_attendee_id, 'purchase_amount', p_amount);
END;
$$;

-- RPC 5: import_leads_from_monday — bulk import from Monday.com
CREATE OR REPLACE FUNCTION import_leads_from_monday(
  p_tenant_id uuid,
  p_board_id  text,
  p_items     jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item         jsonb;
  v_inserted     int := 0;
  v_updated      int := 0;
  v_errors       int := 0;
  v_lead_id      uuid;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      INSERT INTO crm_leads (
        tenant_id, full_name, phone, email, city, language, status,
        source, monday_item_id, client_notes
      ) VALUES (
        p_tenant_id,
        v_item->>'full_name',
        v_item->>'phone',
        v_item->>'email',
        v_item->>'city',
        COALESCE(v_item->>'language', 'he'),
        COALESCE(v_item->>'status', 'new'),
        'monday_import',
        v_item->>'monday_item_id',
        v_item->>'client_notes'
      )
      ON CONFLICT (tenant_id, phone) DO UPDATE
        SET monday_item_id = EXCLUDED.monday_item_id,
            updated_at = now()
      RETURNING id INTO v_lead_id;

      -- Import note if present
      IF v_item->>'notes' IS NOT NULL THEN
        INSERT INTO crm_lead_notes (tenant_id, lead_id, content)
        VALUES (
          p_tenant_id,
          v_lead_id,
          '--- היסטוריה ממאנדיי (ייבוא ' || to_char(now(), 'DD/MM/YYYY') || ') ---' || E'\n' || (v_item->>'notes')
        );
      END IF;

      IF v_lead_id IS NOT NULL THEN v_inserted := v_inserted + 1;
      ELSE v_updated := v_updated + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'updated', v_updated,
    'errors', v_errors
  );
END;
$$;

-- RPC 6: export_leads_to_monday — export filtered leads back to Monday
CREATE OR REPLACE FUNCTION export_leads_to_monday(
  p_tenant_id uuid,
  p_filters   jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_results jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', l.id,
    'full_name', l.full_name,
    'phone', l.phone,
    'email', l.email,
    'city', l.city,
    'status', l.status,
    'monday_item_id', l.monday_item_id,
    'created_at', l.created_at
  ))
    INTO v_results
    FROM crm_leads l
   WHERE l.tenant_id = p_tenant_id
     AND l.is_deleted = false
     AND (p_filters->>'status' IS NULL OR l.status = p_filters->>'status');

  RETURN jsonb_build_object('success', true, 'leads', COALESCE(v_results, '[]'::jsonb));
END;
$$;

-- RPC 7: get_visible_fields — return fields visible to a given role
CREATE OR REPLACE FUNCTION get_visible_fields(
  p_tenant_id   uuid,
  p_role_id     text,
  p_entity_type text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_results jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'field_key', field_key,
    'visible', visible
  ))
    INTO v_results
    FROM crm_field_visibility
   WHERE tenant_id = p_tenant_id
     AND role_id = p_role_id
     AND entity_type = p_entity_type;

  RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;

-- RPC 8: verify_campaign_page_password — verify public page access
CREATE OR REPLACE FUNCTION verify_campaign_page_password(
  p_tenant_id uuid,
  p_page_slug text,
  p_password  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page crm_campaign_pages%ROWTYPE;
BEGIN
  SELECT * INTO v_page FROM crm_campaign_pages
   WHERE tenant_id = p_tenant_id AND slug = p_page_slug AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found');
  END IF;

  -- Compare password hash (caller must pass pre-hashed or use crypt() extension)
  IF v_page.password_hash != p_password THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_password');
  END IF;

  -- Update last accessed
  UPDATE crm_campaign_pages
     SET last_accessed_at = now()
   WHERE id = v_page.id;

  RETURN jsonb_build_object(
    'success', true,
    'view_name', v_page.view_name,
    'visible_columns', v_page.visible_columns
  );
END;
$$;


-- =============================================================================
-- PART 6: SEED DATA — Prizma tenant only
-- tenant_id: 6ad0781b-37f0-47a9-92e3-be9ed1477e1c
-- =============================================================================

-- Seed: crm_campaigns (2 rows)
INSERT INTO crm_campaigns (tenant_id, slug, name, description, default_max_capacity, default_booking_fee, cancellation_hours)
VALUES
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'supersale', 'אירוע המותגים (SuperSale)',
   'אירוע מכירות מותגים מוזל לקהל מוזמן', 50, 50.00, 48),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'multisale', 'MultiSale',
   'אירוע מכירות משקפיים מרובי מותגים', 30, 0.00, 24);

-- Seed: crm_tags (2 rows)
INSERT INTO crm_tags (tenant_id, name, color, category, sort_order)
VALUES
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'SuperSale', '#8b5cf6', 'campaign', 1),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'MultiSale', '#3b82f6', 'campaign', 2);

-- Seed: crm_statuses — Lead statuses (11 rows)
INSERT INTO crm_statuses (tenant_id, entity_type, slug, name_he, name_en, color, sort_order, is_default, triggers_messages)
VALUES
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'new',                 'חדש',               'New',                '#22c55e', 1,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'invalid_phone',       'מספר לא תקין',       'Invalid Phone',      '#9ca3af', 2,  false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'too_far',             'רחוק מדי',            'Too Far',            '#9ca3af', 3,  false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'no_answer',           'לא עונה',             'No Answer',          '#f59e0b', 4,  false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'callback',            'להתקשר בחזרה',        'Callback',           '#f59e0b', 5,  false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'waiting',             'ממתין לאירוע',         'Waiting for Event',  '#3b82f6', 6,  false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'invited',             'הוזמן לאירוע',         'Invited',            '#8b5cf6', 7,  false, true),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'confirmed',           'אישר הגעה',            'Confirmed',          '#22c55e', 8,  false, true),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'confirmed_verified',  'אישר ווידוא',          'Confirmed Verified', '#16a34a', 9,  false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'not_interested',      'לא מעוניין',           'Not Interested',     '#ef4444', 10, false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead', 'unsubscribed',        'הסיר מרשימה',          'Unsubscribed',       '#6b7280', 11, false, true);

-- Seed: crm_statuses — Attendee statuses (10 rows)
INSERT INTO crm_statuses (tenant_id, entity_type, slug, name_he, color, sort_order)
VALUES
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'registered',          'חדש',              '#22c55e', 1),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'waiting_list',        'רשימת המתנה',       '#92400e', 2),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'duplicate',           'כבר נרשם',          '#9ca3af', 3),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'quick_registration',  'רישום מהיר',         '#78350f', 4),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'event_closed',        'אירוע נסגר',         '#166534', 5),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'manual_registration', 'נרשם ידנית',         '#78350f', 6),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'cancelled',           'ביטל',              '#ef4444', 7),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'confirmed',           'אישר (שילם)',        '#22c55e', 8),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'attended',            'הגיע',              '#ec4899', 9),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'no_show',             'לא הגיע',            '#831843', 10);

-- Seed: crm_statuses — Event statuses (10 rows)
INSERT INTO crm_statuses (tenant_id, entity_type, slug, name_he, sort_order, triggers_messages, is_terminal)
VALUES
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'planning',             'תכנון',             1,  false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'will_open_tomorrow',   'נפתח מחר',           2,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'registration_open',    'הרשמה פתוחה',         3,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'invite_new',           'הזמנת חדשים',         4,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'closed',               'נסגר',              5,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'waiting_list',         'רשימת המתנה',         6,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', '2_3d_before',          '2-3 ימים לפני',       7,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'event_day',            'יום האירוע',          8,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'invite_waiting_list',  'הזמנת ממתינים',        9,  true,  false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'completed',            'הושלם',             10, false, true);

-- Seed: crm_field_visibility (8 rows — UTM + revenue fields hidden from employees)
-- role_id 'employee' = standard employee role in Prizma
INSERT INTO crm_field_visibility (tenant_id, role_id, entity_type, field_key, visible)
VALUES
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'utm_source',            false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'utm_medium',            false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'utm_campaign',          false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'utm_content',           false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'utm_term',              false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'utm_campaign_id',       false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'total_purchases',       false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'employee', 'lead', 'is_returning_customer', false);

-- Seed: crm_unit_economics (1 row — SuperSale thresholds)
-- Requires crm_campaigns to exist (uses SELECT to get campaign id)
INSERT INTO crm_unit_economics (tenant_id, campaign_id, gross_margin_pct, kill_multiplier, scaling_multiplier)
SELECT
  '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',
  id,
  0.20,
  4.0,
  6.0
FROM crm_campaigns
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug = 'supersale';
