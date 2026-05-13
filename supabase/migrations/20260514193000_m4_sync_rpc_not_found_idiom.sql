-- =============================================================================
-- Migration: M4_SYNC_RPC_NOT_FOUND_IDIOM
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_STATUS_MODEL_FINETUNES/SPEC.md
-- Date: 2026-05-14
-- Brief: M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md §3.3 (F-CSF-3)
-- =============================================================================
-- Replaces sync_lead_status_from_attendee's composite-NULL miss-check with the
-- canonical PL/pgSQL idiom `IF NOT FOUND`. No behavior change today; correctness
-- under future refactor (OUTER JOIN, additional non-NULL-default columns, etc.).
--
-- Iron Rule 32: CREATE OR REPLACE is in-place; declared destructive ops = None.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  v_lead          crm_leads%ROWTYPE;
  v_active_status text;
  v_target_status text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND is_deleted = false;
  -- M4_STATUS_MODEL_FINETUNES (2026-05-14, F-CSF-3): canonical SELECT-INTO miss
  -- idiom. Composite `IS NULL` only returns true when every column is NULL --
  -- fragile under future refactors; `NOT FOUND` is the correct check.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  IF v_lead.status IN ('not_interested','unsubscribed') THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'reason', 'terminal_status');
  END IF;

  SELECT a.status INTO v_active_status
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id AND e.tenant_id = a.tenant_id
   WHERE a.lead_id = p_lead_id AND a.tenant_id = p_tenant_id
     AND a.is_deleted = false
     AND a.status NOT IN ('cancelled')
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY (CASE WHEN a.status = 'waiting_list' THEN 0 ELSE 1 END),
            COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;

  v_target_status := CASE v_active_status
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'registered' THEN 'confirmed'
    WHEN 'manual_registration' THEN 'confirmed'
    WHEN 'quick_registration' THEN 'confirmed'
    WHEN 'attended' THEN 'confirmed_verified'
    WHEN 'purchased' THEN 'confirmed_verified'
    WHEN 'no_show' THEN 'confirmed'
    WHEN 'invited' THEN 'invited'
    WHEN 'waiting_list' THEN 'waitlist'
    WHEN 'event_closed' THEN 'waiting'
    WHEN 'duplicate' THEN 'waiting'
    ELSE 'waiting'
  END;

  IF v_lead.status = v_target_status THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'old_status', v_lead.status, 'new_status', v_target_status);
  END IF;

  UPDATE crm_leads SET status = v_target_status, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'updated', true, 'old_status', v_lead.status, 'new_status', v_target_status);
END
$function$;

COMMIT;
