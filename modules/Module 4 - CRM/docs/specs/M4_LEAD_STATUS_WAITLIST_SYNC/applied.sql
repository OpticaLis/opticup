-- M4_LEAD_STATUS_WAITLIST_SYNC — applied 2026-04-28
-- Replay artifact for the SQL run via mcp__claude_ai_Supabase__execute_sql.
-- See SPEC.md §3 for criteria and §12 for the canonical version.

BEGIN;

-- 1. waitlist lead status (sort_order=12)
INSERT INTO crm_statuses (tenant_id, entity_type, slug, name_he, name_en, color, sort_order, is_default)
VALUES ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'lead', 'waitlist', 'רשימת המתנה', 'Waitlist', '#FF9800', 12, false)
ON CONFLICT (tenant_id, entity_type, slug) DO NOTHING;

-- 2. Sync RPC. Maps the most-recent active attendee row to crm_leads.status.
-- Active event = crm_events.status NOT IN ('completed','cancelled') AND is_deleted=false.
-- Active attendee = is_deleted=false AND status NOT IN ('cancelled').
-- Terminal lead statuses (not_interested, unsubscribed) are NEVER overridden.
-- Note: crm_event_attendees has no updated_at column; sort by COALESCE of the
-- state-specific timestamps, falling back to created_at.
CREATE OR REPLACE FUNCTION sync_lead_status_from_attendee(
  p_lead_id   uuid,
  p_tenant_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lead          crm_leads%ROWTYPE;
  v_active_status text;
  v_target_status text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND is_deleted = false;
  IF v_lead IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  IF v_lead.status IN ('not_interested','unsubscribed') THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'reason', 'terminal_status');
  END IF;

  SELECT a.status
    INTO v_active_status
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id AND e.tenant_id = a.tenant_id
   WHERE a.lead_id = p_lead_id
     AND a.tenant_id = p_tenant_id
     AND a.is_deleted = false
     AND a.status NOT IN ('cancelled')
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;

  v_target_status := CASE v_active_status
    WHEN 'confirmed'    THEN 'confirmed'
    WHEN 'attended'     THEN 'confirmed_verified'
    WHEN 'purchased'    THEN 'confirmed_verified'
    WHEN 'no_show'      THEN 'confirmed'
    WHEN 'invited'      THEN 'invited'
    WHEN 'waiting_list' THEN 'waitlist'
    WHEN 'event_closed' THEN 'waiting'
    WHEN 'duplicate'    THEN 'waiting'
    ELSE 'waiting'
  END;

  IF v_lead.status = v_target_status THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'old_status', v_lead.status, 'new_status', v_target_status);
  END IF;

  UPDATE crm_leads
     SET status = v_target_status, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'updated', true, 'old_status', v_lead.status, 'new_status', v_target_status);
END$$;

GRANT EXECUTE ON FUNCTION sync_lead_status_from_attendee(uuid, uuid) TO authenticated, service_role;

-- 3. register_lead_to_event extension — sync after every attendee write.
-- Replaces the 4 hardcoded `crm_leads SET status = 'confirmed'` blocks with
-- one PERFORM sync_lead_status_from_attendee call per branch.
CREATE OR REPLACE FUNCTION public.register_lead_to_event(p_tenant_id uuid, p_lead_id uuid, p_event_id uuid, p_method text DEFAULT 'manual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event         crm_events%ROWTYPE;
  v_current_count int;
  v_attendee_id   uuid;
  v_existing      record;
BEGIN
  SELECT * INTO v_event FROM crm_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Resubscribe on every successful registration path
  UPDATE crm_leads
     SET unsubscribed_at = NULL, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND unsubscribed_at IS NOT NULL;

  SELECT id, is_deleted INTO v_existing FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id;

  IF FOUND THEN
    IF v_existing.is_deleted = false THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
    ELSE
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method,
             checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;
      PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
      RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', 'registered');
    END IF;
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

-- 4. Backfill demo
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT a.lead_id
      FROM crm_event_attendees a
      JOIN crm_events e ON e.id = a.event_id
     WHERE a.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
       AND e.status NOT IN ('completed','cancelled')
       AND e.is_deleted = false
       AND a.status NOT IN ('cancelled')
       AND a.is_deleted = false
  LOOP
    PERFORM sync_lead_status_from_attendee(r.lead_id, '8d8cfa7e-ef58-49af-9702-a862d459cccb');
  END LOOP;
END$$;

-- 5. Rung 2 correction (applied during this micro-SPEC because of the
-- attendee status English-vs-Hebrew discovery): align rule action_config
-- attendee statuses to canonical English slugs.
INSERT INTO crm_statuses (tenant_id, entity_type, slug, name_he, name_en, color, sort_order, is_default)
VALUES ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'attendee', 'invited', 'הוזמן', 'Invited', '#3b82f6', 11, false)
ON CONFLICT (tenant_id, entity_type, slug) DO NOTHING;

UPDATE crm_automation_rules
   SET action_config = action_config || jsonb_build_object('post_action_attendee_upsert', jsonb_build_object('status', 'invited'))
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND action_config ? 'post_action_attendee_upsert';

COMMIT;
