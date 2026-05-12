-- =============================================================================
-- Migration: STATUS_CHANGE_TRIGGERS_FRAMEWORK
-- SPEC: modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/SPEC.md
-- Date: 2026-05-12
-- =============================================================================
-- Adds:
--   1. crm_status_change_events — append-only event ledger (audit log forever
--      per Daniel decision 2026-05-12; consumed_at flag distinguishes pending
--      vs processed).
--   2. crm_trigger_type_registry — config-driven entity → trigger_type slug map.
--   3. attendee_status_change_event_fn() — trigger function (SECURITY DEFINER).
--   4. trg_attendee_status_change_event — DB trigger on crm_event_attendees.
--   5. 2 registry seed rows (demo + Prizma) for entity_type='attendee'.
--   6. 2 rule UPDATEs migrating the silently-broken check-in rules from
--      trigger_event='created' → 'status_change'.
--
-- Iron Rule compliance:
--   14: tenant_id NOT NULL REFERENCES tenants(id) on both new tables.
--   15: RLS enabled with canonical two-policy pattern (service_bypass + JWT-claim
--       tenant_isolation).
--   18: UNIQUE constraint on (tenant_id, entity_type) for the registry.
--   22: defense-in-depth — every SELECT/INSERT/UPDATE filters tenant_id explicitly.
--   32: 2 declared UPDATEs (rule migration); no DROP/TRUNCATE/wildcard DELETE.
--
-- Pre-state snapshots (criterion 16 + 17):
--   demo target rule id    = b2a21d96-b7bd-43c4-a02b-496dab6ec74e
--   prizma target rule id  = a9483a90-48b1-40ff-a6b2-cee157d72485
--   prizma nontarget hash  = f6c4fd0f07407e74537e37e1ed6f0527 (16 rules, captured 2026-05-12)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. crm_status_change_events — append-only ledger
-- -----------------------------------------------------------------------------

CREATE TABLE crm_status_change_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  old_status   text,
  new_status   text NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  consumed_at  timestamptz
);

COMMENT ON TABLE crm_status_change_events IS
  'Append-only event ledger. Every status transition on a framework-opted-in entity inserts here via DB trigger. automation-engine consumes via pg_cron every minute. Kept as audit log forever per Daniel decision 2026-05-12 (consumed_at IS NULL = pending; NOT NULL = processed).';

CREATE INDEX idx_crm_status_change_events_unprocessed
  ON crm_status_change_events(tenant_id, occurred_at)
  WHERE consumed_at IS NULL;

CREATE INDEX idx_crm_status_change_events_audit
  ON crm_status_change_events(tenant_id, entity_type, entity_id, occurred_at DESC);

ALTER TABLE crm_status_change_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON crm_status_change_events
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON crm_status_change_events
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- -----------------------------------------------------------------------------
-- 2. crm_trigger_type_registry — entity-to-trigger-type mapping
-- -----------------------------------------------------------------------------

CREATE TABLE crm_trigger_type_registry (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES tenants(id),
  entity_type             text NOT NULL,
  trigger_type_slug       text NOT NULL,
  display_name_he         text NOT NULL,
  display_icon            text NOT NULL DEFAULT '✅',
  allowed_condition_types text[] NOT NULL DEFAULT ARRAY['status_equals','status_changed_from','status_changed_to']::text[],
  is_active               boolean NOT NULL DEFAULT true,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_trigger_type_registry_tenant_entity_unique UNIQUE (tenant_id, entity_type)
);

COMMENT ON TABLE crm_trigger_type_registry IS
  'Config-driven entity → trigger_type slug map. Adding a new entity (sale, payment, inventory, etc.) to the framework = INSERT one row per tenant. automation-engine reads to derive trigger_type for each crm_status_change_events row.';

ALTER TABLE crm_trigger_type_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON crm_trigger_type_registry
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON crm_trigger_type_registry
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- -----------------------------------------------------------------------------
-- 3. Trigger function — fires on crm_event_attendees.status transitions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION attendee_status_change_event_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- NULL-safe comparison: OLD.status IS DISTINCT FROM NEW.status fires correctly
  -- for first-time NULL→value AND for value→value transitions, but NOT for
  -- no-op UPDATEs (value→same-value).
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload
    ) VALUES (
      NEW.tenant_id,
      'attendee',
      NEW.id,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'event_id', NEW.event_id,
        'lead_id', NEW.lead_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION attendee_status_change_event_fn() IS
  'Inserts an event row into crm_status_change_events for every distinct status transition on crm_event_attendees. NULL-safe (IS DISTINCT FROM). Fires AFTER UPDATE OF status only.';

CREATE TRIGGER trg_attendee_status_change_event
  AFTER UPDATE OF status ON crm_event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION attendee_status_change_event_fn();

COMMENT ON TRIGGER trg_attendee_status_change_event ON crm_event_attendees IS
  'STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12): inserts into crm_status_change_events on every attendee status transition. Consumer = automation-engine EF, polled by pg_cron every minute.';

-- -----------------------------------------------------------------------------
-- 4. Registry seed — 2 rows (1 per tenant) for entity_type='attendee'
-- -----------------------------------------------------------------------------

INSERT INTO crm_trigger_type_registry (
  tenant_id, entity_type, trigger_type_slug, display_name_he, display_icon, is_active
) VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'attendee', 'attendee_status_change', 'הרשמה לאירוע (שינוי סטטוס)', '✅', true),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'attendee', 'attendee_status_change', 'הרשמה לאירוע (שינוי סטטוס)', '✅', true);

-- -----------------------------------------------------------------------------
-- 5. Backward-compat migration — flip the 2 silently-broken check-in rules
--    Pre-state JSON captured in EXECUTION_REPORT.md §2 and ROLLBACK_SQL.md.
--    Both rules retain identical id, name, tenant_id, action_config, etc;
--    only trigger_event changes 'created' → 'status_change'.
-- -----------------------------------------------------------------------------

UPDATE crm_automation_rules
   SET trigger_event = 'status_change'
 WHERE id = 'b2a21d96-b7bd-43c4-a02b-496dab6ec74e'
   AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND trigger_entity = 'attendee'
   AND trigger_event = 'created'
   AND trigger_condition->>'status' = 'attended';

UPDATE crm_automation_rules
   SET trigger_event = 'status_change'
 WHERE id = 'a9483a90-48b1-40ff-a6b2-cee157d72485'
   AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND trigger_entity = 'attendee'
   AND trigger_event = 'created'
   AND trigger_condition->>'status' = 'attended';

COMMIT;
