-- =============================================================================
-- Migration: M4_MODAL_DESELECTION_RESTORE
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_MODAL_DESELECTION_RESTORE/SPEC.md
-- Date: 2026-05-19
-- =============================================================================
-- Restores operator deselection control after M4_DUAL_PATH_CLEAN_FIX inadvertently
-- severed the bridge from V2 modal → SCE → consumer → engine.
--
-- Mechanism: payload.exclude_lead_ids + payload.recipient_subset, populated by
-- the 3 SCE-producer triggers via transaction-local session vars set by a new
-- wrapper RPC update_event_status_with_overrides. Mirrors the Layer 3
-- originated_by_rule_id pattern from M4_DUAL_PATH_CLEAN_FIX.
--
-- Iron Rule compliance:
--   22: explicit tenant_id filter on the new RPC's UPDATE.
--   32: 1 new RPC + 3 CREATE OR REPLACE FUNCTION declared in SPEC §4.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Wrapper RPC: atomic SET + UPDATE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_event_status_with_overrides(
  p_tenant_id          uuid,
  p_event_id           uuid,
  p_new_status         text,
  p_exclude_lead_ids   uuid[],
  p_recipient_subset   uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exclude_csv text := coalesce(array_to_string(p_exclude_lead_ids, ','), '');
  v_subset_csv  text := coalesce(array_to_string(p_recipient_subset, ','), '');
BEGIN
  -- Transaction-local session vars; the SCE-producer trigger reads them.
  PERFORM set_config('m4.dispatch_exclude_lead_ids', v_exclude_csv, true);
  PERFORM set_config('m4.dispatch_recipient_subset', v_subset_csv, true);
  -- UPDATE fires trg_event_status_change_event in the same transaction.
  UPDATE crm_events SET status = p_new_status
   WHERE id = p_event_id AND tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.update_event_status_with_overrides(uuid, uuid, text, uuid[], uuid[]) IS
  'M4_MODAL_DESELECTION_RESTORE 2026-05-19: atomic set_config + UPDATE crm_events.status. Used by browser changeEventStatus when V2 modal carries exclude_lead_ids / recipient_subset overrides. The SCE-producer trigger reads the session vars and merges them into payload.';

-- -----------------------------------------------------------------------------
-- 2. SCE-producer trigger helper: parse csv → uuid[]
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._m4_parse_csv_uuids(p_csv text)
RETURNS uuid[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_arr uuid[];
BEGIN
  IF p_csv IS NULL OR p_csv = '' THEN RETURN NULL; END IF;
  BEGIN
    SELECT array_agg(t::uuid) INTO v_arr
      FROM unnest(string_to_array(p_csv, ',')) AS t
     WHERE t IS NOT NULL AND t <> '';
    RETURN v_arr;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;  -- malformed input → ignore, do not poison the SCE row
  END;
END;
$$;

COMMENT ON FUNCTION public._m4_parse_csv_uuids(text) IS
  'M4_MODAL_DESELECTION_RESTORE 2026-05-19: helper for SCE-producer triggers. Parses a csv of UUIDs into uuid[]. NULL/empty/malformed input → NULL. Used to read m4.dispatch_exclude_lead_ids and m4.dispatch_recipient_subset.';

-- -----------------------------------------------------------------------------
-- 3. event_status_change_event_fn — adds payload overrides merge
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.event_status_change_event_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_rule  uuid;
  v_exclude_csv  text;
  v_subset_csv   text;
  v_exclude      uuid[];
  v_subset       uuid[];
  v_payload      jsonb;
  v_now          timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN v_origin_rule := NULL; END;

    -- M4_MODAL_DESELECTION_RESTORE 2026-05-19: read operator overrides from
    -- session vars set by update_event_status_with_overrides RPC. Absent
    -- vars = absent payload keys (no behavior change for callers that don't set).
    BEGIN v_exclude_csv := current_setting('m4.dispatch_exclude_lead_ids', true);
    EXCEPTION WHEN OTHERS THEN v_exclude_csv := NULL; END;
    BEGIN v_subset_csv := current_setting('m4.dispatch_recipient_subset', true);
    EXCEPTION WHEN OTHERS THEN v_subset_csv := NULL; END;
    v_exclude := _m4_parse_csv_uuids(v_exclude_csv);
    v_subset  := _m4_parse_csv_uuids(v_subset_csv);

    v_payload := jsonb_build_object('event_date', NEW.event_date, 'event_name', NEW.name);
    IF v_exclude IS NOT NULL THEN v_payload := v_payload || jsonb_build_object('exclude_lead_ids', to_jsonb(v_exclude)); END IF;
    IF v_subset  IS NOT NULL THEN v_payload := v_payload || jsonb_build_object('recipient_subset', to_jsonb(v_subset)); END IF;

    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload,
      dispatch_lock_key, originated_by_rule_id, occurred_at
    ) VALUES (
      NEW.tenant_id, 'event', NEW.id, OLD.status, NEW.status, v_payload,
      compute_dispatch_lock_key('event', NEW.id, OLD.status, NEW.status, v_now),
      v_origin_rule, v_now
    )
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. lead_status_change_event_fn — same merge
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lead_status_change_event_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_rule  uuid;
  v_exclude_csv  text;
  v_subset_csv   text;
  v_exclude      uuid[];
  v_subset       uuid[];
  v_payload      jsonb;
  v_now          timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN v_origin_rule := NULL; END;
    BEGIN v_exclude_csv := current_setting('m4.dispatch_exclude_lead_ids', true);
    EXCEPTION WHEN OTHERS THEN v_exclude_csv := NULL; END;
    BEGIN v_subset_csv := current_setting('m4.dispatch_recipient_subset', true);
    EXCEPTION WHEN OTHERS THEN v_subset_csv := NULL; END;
    v_exclude := _m4_parse_csv_uuids(v_exclude_csv);
    v_subset  := _m4_parse_csv_uuids(v_subset_csv);

    v_payload := jsonb_build_object('phone', NEW.phone, 'source', NEW.source);
    IF v_exclude IS NOT NULL THEN v_payload := v_payload || jsonb_build_object('exclude_lead_ids', to_jsonb(v_exclude)); END IF;
    IF v_subset  IS NOT NULL THEN v_payload := v_payload || jsonb_build_object('recipient_subset', to_jsonb(v_subset)); END IF;

    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload,
      dispatch_lock_key, originated_by_rule_id, occurred_at
    ) VALUES (
      NEW.tenant_id, 'lead', NEW.id, OLD.status, NEW.status, v_payload,
      compute_dispatch_lock_key('lead', NEW.id, OLD.status, NEW.status, v_now),
      v_origin_rule, v_now
    )
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. attendee_status_change_event_fn — same merge
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.attendee_status_change_event_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_rule  uuid;
  v_exclude_csv  text;
  v_subset_csv   text;
  v_exclude      uuid[];
  v_subset       uuid[];
  v_payload      jsonb;
  v_now          timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN v_origin_rule := NULL; END;
    BEGIN v_exclude_csv := current_setting('m4.dispatch_exclude_lead_ids', true);
    EXCEPTION WHEN OTHERS THEN v_exclude_csv := NULL; END;
    BEGIN v_subset_csv := current_setting('m4.dispatch_recipient_subset', true);
    EXCEPTION WHEN OTHERS THEN v_subset_csv := NULL; END;
    v_exclude := _m4_parse_csv_uuids(v_exclude_csv);
    v_subset  := _m4_parse_csv_uuids(v_subset_csv);

    v_payload := jsonb_build_object('event_id', NEW.event_id, 'lead_id', NEW.lead_id);
    IF v_exclude IS NOT NULL THEN v_payload := v_payload || jsonb_build_object('exclude_lead_ids', to_jsonb(v_exclude)); END IF;
    IF v_subset  IS NOT NULL THEN v_payload := v_payload || jsonb_build_object('recipient_subset', to_jsonb(v_subset)); END IF;

    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload,
      dispatch_lock_key, originated_by_rule_id, occurred_at
    ) VALUES (
      NEW.tenant_id, 'attendee', NEW.id, OLD.status, NEW.status, v_payload,
      compute_dispatch_lock_key('attendee', NEW.id, OLD.status, NEW.status, v_now),
      v_origin_rule, v_now
    )
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
