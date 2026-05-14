-- 2026_05_14_register_lead_to_event_return_shape_fix_up.sql
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/
-- Closes FIND-1 from M4_REGISTER_LEAD_TO_EVENT_RPC_MAP (2026-05-14).
--
-- One-clause change: the fresh-INSERT over-capacity branch's RETURN now uses
-- the same CASE WHEN already present in the INSERT statement two lines above,
-- instead of the hardcoded literal 'waiting_list'. When the event is closed
-- AND capacity is full AND no existing row exists for the (lead, event) pair,
-- the inserted row carries status='event_closed' and the RPC return value
-- now correctly matches.
--
-- Pre-migration body baseline: md5=dbd2ccd1eb068b494edfec5cf7788563, length=4603
-- Verified at execution start via pg_proc pre-flight probe (SPEC §0).

CREATE OR REPLACE FUNCTION public.register_lead_to_event(p_tenant_id uuid, p_lead_id uuid, p_event_id uuid, p_method text DEFAULT 'manual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event              crm_events%ROWTYPE;
  v_current_count      int;
  v_attendee_id        uuid;
  v_existing           record;
  v_existing_other_id  uuid;
  v_move_result        jsonb;
  v_promote_status     text;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_event FROM crm_events WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;
  UPDATE crm_leads SET unsubscribed_at = NULL, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND unsubscribed_at IS NOT NULL;
  SELECT a.id INTO v_existing_other_id
    FROM crm_event_attendees a JOIN crm_events e ON e.id = a.event_id
   WHERE a.lead_id = p_lead_id AND a.tenant_id = p_tenant_id AND a.event_id <> p_event_id
     AND a.status IN ('waiting_list','invited') AND a.is_deleted = false
     AND e.status NOT IN ('completed','cancelled') AND e.is_deleted = false
   ORDER BY a.created_at DESC LIMIT 1;
  IF v_existing_other_id IS NOT NULL THEN
    v_move_result := move_attendee_between_events(v_existing_other_id, p_event_id);
    RETURN jsonb_build_object('success', true, 'auto_moved', true,
      'attendee_id', v_move_result->>'new_attendee_id', 'status', v_move_result->>'new_status',
      'fee_mismatch', (v_move_result->>'fee_mismatch')::boolean);
  END IF;
  SELECT id, is_deleted, status INTO v_existing FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id;
  IF FOUND THEN
    IF v_existing.is_deleted = false THEN
      IF v_existing.status = 'invited' THEN
        SELECT COUNT(*) INTO v_current_count FROM crm_event_attendees
         WHERE event_id = p_event_id AND tenant_id = p_tenant_id
           AND status NOT IN ('cancelled', 'duplicate', 'invited')
           AND is_deleted = false AND id <> v_existing.id;
        IF v_current_count >= v_event.max_capacity THEN
          v_promote_status := CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END;
        ELSE
          v_promote_status := 'registered';
        END IF;
        UPDATE crm_event_attendees SET status = v_promote_status, registration_method = p_method
         WHERE id = v_existing.id AND tenant_id = p_tenant_id;
        PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
        RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', v_promote_status);
      ELSE
        RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
      END IF;
    ELSE
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method, checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;
      PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
      RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', 'registered');
    END IF;
  END IF;
  SELECT COUNT(*) INTO v_current_count FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate', 'invited') AND is_deleted = false;
  IF v_current_count >= v_event.max_capacity THEN
    INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
    VALUES (p_tenant_id, p_lead_id, p_event_id,
            CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END, p_method)
    RETURNING id INTO v_attendee_id;
    PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id,
      'status', CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END);
  END IF;
  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;
  PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$function$;
