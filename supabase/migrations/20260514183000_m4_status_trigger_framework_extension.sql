-- =============================================================================
-- Migration: M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION/SPEC.md
-- Date: 2026-05-14
-- Brief: M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md §3.1 (Finding F5)
-- =============================================================================
-- Extends the crm_status_change_events framework (live since 2026-05-12, attendee-
-- only) to ALSO fire on crm_leads.status and crm_events.status transitions.
--
-- Adds:
--   1. lead_status_change_event_fn() + trg_lead_status_change_event
--   2. event_status_change_event_fn() + trg_event_status_change_event
--   3. 4 registry rows: lead x 2 tenants + event x 2 tenants
--
-- Iron Rule compliance:
--   14: no new tables; existing tables already have tenant_id NOT NULL.
--   15: no new RLS policies; framework tables already have canonical pair.
--   18: no new UNIQUE constraints; registry already has UNIQUE(tenant_id,entity_type).
--   21: 0 collisions on new names verified at SPEC author time + executor pre-flight.
--   22: NEW.tenant_id propagated explicitly to every INSERT.
--   32: Destructive ops = None. All operations additive.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Lead-status producer
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION lead_status_change_event_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload
    ) VALUES (
      NEW.tenant_id,
      'lead',
      NEW.id,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'phone', NEW.phone,
        'source', NEW.source
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION lead_status_change_event_fn() IS
  'M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14): inserts crm_status_change_events on every distinct crm_leads.status transition. NULL-safe (IS DISTINCT FROM).';

CREATE TRIGGER trg_lead_status_change_event
  AFTER UPDATE OF status ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION lead_status_change_event_fn();

COMMENT ON TRIGGER trg_lead_status_change_event ON crm_leads IS
  'M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14): producer trigger for lead status transitions. Consumer = automation-engine EF (pg_cron every minute) reading via crm_trigger_type_registry -> trigger_type_slug=lead_status_change.';

-- -----------------------------------------------------------------------------
-- 2. Event-status producer
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION event_status_change_event_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload
    ) VALUES (
      NEW.tenant_id,
      'event',
      NEW.id,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'event_date', NEW.event_date,
        'event_name', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION event_status_change_event_fn() IS
  'M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14): inserts crm_status_change_events on every distinct crm_events.status transition. NULL-safe (IS DISTINCT FROM).';

CREATE TRIGGER trg_event_status_change_event
  AFTER UPDATE OF status ON crm_events
  FOR EACH ROW
  EXECUTE FUNCTION event_status_change_event_fn();

COMMENT ON TRIGGER trg_event_status_change_event ON crm_events IS
  'M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14): producer trigger for event status transitions. Consumer = automation-engine EF (pg_cron every minute) reading via crm_trigger_type_registry -> trigger_type_slug=event_status_change.';

-- -----------------------------------------------------------------------------
-- 3. Registry seed -- 4 rows (2 entities x 2 tenants)
-- -----------------------------------------------------------------------------

INSERT INTO crm_trigger_type_registry (
  tenant_id, entity_type, trigger_type_slug, display_name_he, display_icon, is_active
) VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'lead',  'lead_status_change',  'שינוי סטטוס ליד',    '🧑', true),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'lead',  'lead_status_change',  'שינוי סטטוס ליד',    '🧑', true),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'event', 'event_status_change', 'שינוי סטטוס אירוע',  '📅', true),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'event', 'event_status_change', 'שינוי סטטוס אירוע',  '📅', true);

COMMIT;
