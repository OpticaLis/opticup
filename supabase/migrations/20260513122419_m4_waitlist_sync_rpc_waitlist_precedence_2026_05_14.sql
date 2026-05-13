-- SPEC: M4_WAITLIST_SYNC_PRIORITY_FIX §3.1
-- Brief: modules/Module 4 - CRM/architecture-brief/WAITLIST_SYNC_PRIORITY_FIX_BRIEF.md
-- Applied live: 2026-05-14 (UTC version 20260513122419)
-- Safety tag: pre-waitlist-sync-priority-fix-2026-05-14 (commit 9c36c26)
--
-- Change: give attendee status='waiting_list' precedence over other active statuses
-- when picking the most-recent active attendee for a lead. The waitlist signal must
-- win against parallel registered/attended rows on other active events, per Daniel's
-- Decision #1 (Brief §2).
--
-- The existing event filter `e.status NOT IN ('completed','cancelled')` is preserved,
-- so a waiting_list attendee on a completed event still does NOT win precedence (it
-- is excluded from the candidate set entirely). This matches Brief §3.1: "AND event
-- is not closed/completed".
--
-- All other mappings, filters, and the terminal-status guard are unchanged.
-- Iron Rule 21 (No Duplicates): in-place body update, no new RPC name.
-- Iron Rule 22 (defense-in-depth): tenant_id filter retained.

CREATE OR REPLACE FUNCTION public.sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
   ORDER BY (CASE WHEN a.status = 'waiting_list' THEN 0 ELSE 1 END),
            COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;

  v_target_status := CASE v_active_status
    WHEN 'confirmed'           THEN 'confirmed'
    WHEN 'registered'          THEN 'confirmed'
    WHEN 'manual_registration' THEN 'confirmed'
    WHEN 'quick_registration'  THEN 'confirmed'
    WHEN 'attended'            THEN 'confirmed_verified'
    WHEN 'purchased'           THEN 'confirmed_verified'
    WHEN 'no_show'             THEN 'confirmed'
    WHEN 'invited'             THEN 'invited'
    WHEN 'waiting_list'        THEN 'waitlist'
    WHEN 'event_closed'        THEN 'waiting'
    WHEN 'duplicate'           THEN 'waiting'
    ELSE 'waiting'
  END;

  IF v_lead.status = v_target_status THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'old_status', v_lead.status, 'new_status', v_target_status);
  END IF;

  UPDATE crm_leads
     SET status = v_target_status, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'updated', true, 'old_status', v_lead.status, 'new_status', v_target_status);
END$function$;
