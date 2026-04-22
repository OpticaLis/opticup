-- =============================================================================
-- hotfix-register-lead-to-event.sql
-- Context: P2B_EVENT_MANAGEMENT — discovered during Test 3 that the existing
-- `register_lead_to_event` RPC had a Postgres error:
--   "FOR UPDATE is not allowed with aggregate functions"
-- The COUNT(*) query had a FOR UPDATE clause that is invalid on aggregates.
-- The event row FOR UPDATE at the top of the function already serializes
-- concurrent registrations per-event, so the attendee-count query does not
-- need a row lock.
-- Applied via apply_migration as
--   fix_register_lead_to_event_remove_for_update_on_count
-- Authorized by Daniel in SPEC P2b execution (hotfix Option 1).
-- =============================================================================

CREATE OR REPLACE FUNCTION register_lead_to_event(
  p_tenant_id uuid,
  p_lead_id uuid,
  p_event_id uuid,
  p_method text DEFAULT 'form'
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
  SELECT * INTO v_event FROM crm_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  SELECT id INTO v_existing_id FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id
     AND is_deleted = false;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing_id);
  END IF;

  SELECT COUNT(*) INTO v_current_count
    FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate') AND is_deleted = false;

  IF v_current_count >= v_event.max_capacity THEN
    INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
    VALUES (p_tenant_id, p_lead_id, p_event_id,
            CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END,
            p_method)
    RETURNING id INTO v_attendee_id;
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'waiting_list');
  END IF;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;

  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$$;
