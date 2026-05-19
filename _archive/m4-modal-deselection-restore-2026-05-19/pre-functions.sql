-- Rollback reference — 3 SCE-producer trigger functions BEFORE M4_MODAL_DESELECTION_RESTORE.
-- Captured via pg_get_functiondef on 2026-05-19T11:30Z.

CREATE OR REPLACE FUNCTION public.attendee_status_change_event_fn()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE v_origin_rule uuid; v_now timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN v_origin_rule := NULL;
    END;
    INSERT INTO crm_status_change_events (tenant_id, entity_type, entity_id, old_status, new_status, payload, dispatch_lock_key, originated_by_rule_id, occurred_at)
    VALUES (NEW.tenant_id, 'attendee', NEW.id, OLD.status, NEW.status,
      jsonb_build_object('event_id', NEW.event_id, 'lead_id', NEW.lead_id),
      compute_dispatch_lock_key('attendee', NEW.id, OLD.status, NEW.status, v_now), v_origin_rule, v_now)
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.event_status_change_event_fn()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE v_origin_rule uuid; v_now timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN v_origin_rule := NULL;
    END;
    INSERT INTO crm_status_change_events (tenant_id, entity_type, entity_id, old_status, new_status, payload, dispatch_lock_key, originated_by_rule_id, occurred_at)
    VALUES (NEW.tenant_id, 'event', NEW.id, OLD.status, NEW.status,
      jsonb_build_object('event_date', NEW.event_date, 'event_name', NEW.name),
      compute_dispatch_lock_key('event', NEW.id, OLD.status, NEW.status, v_now), v_origin_rule, v_now)
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_status_change_event_fn()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE v_origin_rule uuid; v_now timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN v_origin_rule := NULL;
    END;
    INSERT INTO crm_status_change_events (tenant_id, entity_type, entity_id, old_status, new_status, payload, dispatch_lock_key, originated_by_rule_id, occurred_at)
    VALUES (NEW.tenant_id, 'lead', NEW.id, OLD.status, NEW.status,
      jsonb_build_object('phone', NEW.phone, 'source', NEW.source),
      compute_dispatch_lock_key('lead', NEW.id, OLD.status, NEW.status, v_now), v_origin_rule, v_now)
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
