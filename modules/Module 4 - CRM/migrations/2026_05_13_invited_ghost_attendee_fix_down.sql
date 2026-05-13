-- =============================================================================
-- 2026_05_13_invited_ghost_attendee_fix_down.sql — ROLLBACK
-- Inverse of 2026_05_13_invited_ghost_attendee_fix_up.sql.
-- Restores the PRIOR (pre-fix) bodies of v_crm_event_stats and
-- register_lead_to_event, captured byte-for-byte via pg_get_viewdef and
-- pg_get_functiondef at SPEC-author time (2026-05-13 evening).
--
-- Apply this file ONLY if the up.sql causes a behavior regression. Pair with
-- a manual `git checkout HEAD~ -- modules/crm/crm-event-register.js`
-- (or `git revert <commit>`) for the JS edit.
-- =============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.v_crm_event_stats AS
 SELECT e.id AS event_id,
    e.tenant_id,
    e.event_number,
    e.name,
    e.event_date,
    e.status,
    e.max_capacity,
    count(a.id) FILTER (WHERE (a.status <> ALL (ARRAY['cancelled'::text, 'duplicate'::text])) AND a.is_deleted = false) AS total_registered,
    count(a.id) FILTER (WHERE a.status = 'confirmed'::text AND a.is_deleted = false) AS total_confirmed,
    count(a.id) FILTER (WHERE a.status = 'attended'::text AND a.is_deleted = false) AS total_attended,
    count(a.id) FILTER (WHERE a.purchase_amount IS NOT NULL AND a.purchase_amount > 0::numeric AND a.is_deleted = false) AS total_purchased,
    COALESCE(sum(a.purchase_amount) FILTER (WHERE a.is_deleted = false), 0::numeric) AS total_revenue,
    count(a.id) FILTER (WHERE a.status = 'event_closed'::text AND a.is_deleted = false) AS attempts_after_close,
    e.max_capacity - count(a.id) FILTER (WHERE (a.status <> ALL (ARRAY['cancelled'::text, 'duplicate'::text])) AND a.is_deleted = false) AS spots_remaining,
        CASE
            WHEN count(a.id) FILTER (WHERE a.status = 'attended'::text AND a.is_deleted = false) > 0 THEN round(count(a.id) FILTER (WHERE a.purchase_amount IS NOT NULL AND a.purchase_amount > 0::numeric AND a.is_deleted = false)::numeric / count(a.id) FILTER (WHERE a.status = 'attended'::text AND a.is_deleted = false)::numeric * 100::numeric, 1)
            ELSE 0::numeric
        END AS purchase_rate_pct
   FROM crm_events e
     LEFT JOIN crm_event_attendees a ON e.id = a.event_id AND e.tenant_id = a.tenant_id
  WHERE e.is_deleted = false
  GROUP BY e.id;

CREATE OR REPLACE FUNCTION public.register_lead_to_event(p_tenant_id uuid, p_lead_id uuid, p_event_id uuid, p_method text DEFAULT 'manual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event              crm_events%ROWTYPE;
  v_current_count      int;
  v_attendee_id        uuid;
  v_existing           record;
  v_existing_other_id  uuid;
  v_move_result        jsonb;
  v_promote_status     text;
BEGIN
  SELECT * INTO v_event FROM crm_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  UPDATE crm_leads
     SET unsubscribed_at = NULL, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND unsubscribed_at IS NOT NULL;

  -- Rung 3 auto-move (unchanged): detect active attendee on a DIFFERENT event
  -- in waiting_list/invited and move them implicitly.
  SELECT a.id INTO v_existing_other_id
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
   WHERE a.lead_id = p_lead_id
     AND a.tenant_id = p_tenant_id
     AND a.event_id <> p_event_id
     AND a.status IN ('waiting_list','invited')
     AND a.is_deleted = false
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY a.created_at DESC
   LIMIT 1;

  IF v_existing_other_id IS NOT NULL THEN
    v_move_result := move_attendee_between_events(v_existing_other_id, p_event_id);
    RETURN jsonb_build_object(
      'success', true,
      'auto_moved', true,
      'attendee_id', v_move_result->>'new_attendee_id',
      'status', v_move_result->>'new_status',
      'fee_mismatch', (v_move_result->>'fee_mismatch')::boolean
    );
  END IF;

  SELECT id, is_deleted, status INTO v_existing FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id;

  IF FOUND THEN
    IF v_existing.is_deleted = false THEN
      -- P5_8 Fix A: invited rows came from T5 dispatch (Rule 2.1, 2026-04-28).
      -- Treat them as not-yet-registered and promote here.
      IF v_existing.status = 'invited' THEN
        -- Capacity check that EXCLUDES the row being promoted to avoid the
        -- double-count documented in the SPEC. Same `>= max_capacity` rule
        -- as the fresh-INSERT branch below preserves at-cap routing semantics.
        SELECT COUNT(*) INTO v_current_count
          FROM crm_event_attendees
         WHERE event_id = p_event_id AND tenant_id = p_tenant_id
           AND status NOT IN ('cancelled', 'duplicate')
           AND is_deleted = false
           AND id <> v_existing.id;

        IF v_current_count >= v_event.max_capacity THEN
          v_promote_status := CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END;
        ELSE
          v_promote_status := 'registered';
        END IF;

        UPDATE crm_event_attendees
           SET status = v_promote_status, registration_method = p_method
         WHERE id = v_existing.id AND tenant_id = p_tenant_id;

        PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
        RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', v_promote_status);
      ELSE
        -- Any other non-deleted status (registered, waiting_list, confirmed,
        -- attended, purchased, etc.) → keep the historical already_registered
        -- rejection. No behavior change for those.
        RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
      END IF;
    ELSE
      -- Soft-deleted revival (unchanged): capacity-bypass, restore as registered.
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method,
             checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;
      PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
      RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', 'registered');
    END IF;
  END IF;

  -- Fresh-INSERT path (unchanged from prior body).
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
    PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'waiting_list');
  END IF;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;
  PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$function$;

COMMIT;
