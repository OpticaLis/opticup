-- Migration: M3_UTM_TRIPLE_LAYER_PERSISTENCE — #04 register_lead_to_event swap
-- Adds 9 optional UTM/context params (NULL defaults) + 5 touchpoint INSERT calls
-- in the 5 state-changing terminals (T3 auto-move, T4 invited promote, T6 undelete,
-- T7 fresh over-cap, T8 fresh under-cap). The 3 no-state-change terminals
-- (T1 RAISE 42501, T2 event_not_found, T5 already_registered) do NOT record
-- touchpoints (no registration happened).
--
-- Old 4-arg signature is removed; new 13-arg signature uses defaults so the
-- existing 4-arg callers (event-register EF, quick-register EF, ERP JS,
-- legacy SQL) continue to work positionally. Function name is reversible
-- via the _down.sql sibling.

BEGIN;

DROP FUNCTION IF EXISTS public.register_lead_to_event(uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.register_lead_to_event(
  p_tenant_id        uuid,
  p_lead_id          uuid,
  p_event_id         uuid,
  p_method           text DEFAULT 'manual',
  p_utm_source       text DEFAULT NULL,
  p_utm_medium       text DEFAULT NULL,
  p_utm_campaign     text DEFAULT NULL,
  p_utm_content      text DEFAULT NULL,
  p_utm_term         text DEFAULT NULL,
  p_utm_campaign_id  text DEFAULT NULL,
  p_referrer_url     text DEFAULT NULL,
  p_landing_url      text DEFAULT NULL,
  p_short_link_code  text DEFAULT NULL
)
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
  v_phone              text;
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

  -- M3_UTM_TRIPLE_LAYER_PERSISTENCE: fetch phone once for touchpoint capture.
  SELECT phone INTO v_phone FROM crm_leads WHERE id = p_lead_id AND tenant_id = p_tenant_id LIMIT 1;

  SELECT a.id INTO v_existing_other_id
    FROM crm_event_attendees a JOIN crm_events e ON e.id = a.event_id
   WHERE a.lead_id = p_lead_id AND a.tenant_id = p_tenant_id AND a.event_id <> p_event_id
     AND a.status IN ('waiting_list','invited') AND a.is_deleted = false
     AND e.status NOT IN ('completed','cancelled') AND e.is_deleted = false
   ORDER BY a.created_at DESC LIMIT 1;

  IF v_existing_other_id IS NOT NULL THEN
    v_move_result := move_attendee_between_events(v_existing_other_id, p_event_id);
    -- T3 auto-move: record event_register touchpoint for the moved attendee.
    PERFORM public._record_touchpoint(
      p_tenant_id, p_lead_id, v_phone, 'event_register',
      p_event_id, (v_move_result->>'new_attendee_id')::uuid,
      NULL, p_short_link_code, NULL,
      p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
      p_referrer_url, p_landing_url,
      'event_register:' || (v_move_result->>'new_attendee_id')
    );
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
        -- T4 invited promote: record event_register touchpoint for the promoted attendee.
        PERFORM public._record_touchpoint(
          p_tenant_id, p_lead_id, v_phone, 'event_register',
          p_event_id, v_existing.id,
          NULL, p_short_link_code, NULL,
          p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
          p_referrer_url, p_landing_url,
          'event_register:' || v_existing.id::text
        );
        RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', v_promote_status);
      ELSE
        -- T5 already_registered: no touchpoint (no state change).
        RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
      END IF;
    ELSE
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method, checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;
      PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
      -- T6 undelete: record event_register touchpoint. Dedupe_key = attendee_id ensures
      -- a re-revival of the SAME attendee does not create a duplicate touchpoint row.
      PERFORM public._record_touchpoint(
        p_tenant_id, p_lead_id, v_phone, 'event_register',
        p_event_id, v_existing.id,
        NULL, p_short_link_code, NULL,
        p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
        p_referrer_url, p_landing_url,
        'event_register:' || v_existing.id::text
      );
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
    -- T7 fresh over-cap: record event_register touchpoint.
    PERFORM public._record_touchpoint(
      p_tenant_id, p_lead_id, v_phone, 'event_register',
      p_event_id, v_attendee_id,
      NULL, p_short_link_code, NULL,
      p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
      p_referrer_url, p_landing_url,
      'event_register:' || v_attendee_id::text
    );
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id,
      'status', CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END);
  END IF;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;
  PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
  -- T8 fresh under-cap: record event_register touchpoint.
  PERFORM public._record_touchpoint(
    p_tenant_id, p_lead_id, v_phone, 'event_register',
    p_event_id, v_attendee_id,
    NULL, p_short_link_code, NULL,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, p_utm_campaign_id,
    p_referrer_url, p_landing_url,
    'event_register:' || v_attendee_id::text
  );
  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.register_lead_to_event(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text) TO authenticated, anon, service_role;

COMMIT;
