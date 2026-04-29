-- P24 ROLLBACK — restore pre-P24 schema + RPC body
-- Run only if P24 needs to be reverted. Code revert (commits 5→4→3→2 from
-- P24) must be paired with this; otherwise the coupon-send + credit-chip
-- behavior in code will reference a nonexistent column.

BEGIN;

-- 1. Restore transfer_credit_to_new_attendee RPC to its pre-P24 body
--    (no paid_via_credit write).
CREATE OR REPLACE FUNCTION public.transfer_credit_to_new_attendee(p_old_attendee_id uuid, p_new_attendee_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_tenant uuid;
  v_old_status text;
  v_new_status text;
BEGIN
  SELECT tenant_id, payment_status INTO v_tenant, v_old_status
    FROM crm_event_attendees WHERE id = p_old_attendee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'old attendee not found'; END IF;
  IF v_old_status != 'credit_pending' THEN
    RAISE EXCEPTION 'old attendee % is not in credit_pending (status=%)', p_old_attendee_id, v_old_status;
  END IF;

  SELECT payment_status INTO v_new_status
    FROM crm_event_attendees
   WHERE id = p_new_attendee_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'new attendee not found or wrong tenant'; END IF;
  IF v_new_status != 'pending_payment' THEN
    RAISE EXCEPTION 'new attendee % is not in pending_payment (status=%)', p_new_attendee_id, v_new_status;
  END IF;

  UPDATE crm_event_attendees
     SET payment_status = 'credit_used',
         credit_used_for_attendee_id = p_new_attendee_id
   WHERE id = p_old_attendee_id;

  UPDATE crm_event_attendees
     SET payment_status = 'paid',
         paid_at = now()
   WHERE id = p_new_attendee_id;
END;
$function$;

-- 2. Recreate v_crm_event_attendees_full WITHOUT paid_via_credit.
DROP VIEW IF EXISTS public.v_crm_event_attendees_full;

CREATE VIEW public.v_crm_event_attendees_full AS
SELECT a.id,
       a.tenant_id,
       a.lead_id,
       a.event_id,
       a.status,
       a.registration_method,
       a.registered_at,
       a.confirmed_at,
       a.checked_in_at,
       a.purchased_at,
       a.cancelled_at,
       a.purchase_amount,
       a.payment_status,
       a.paid_at,
       a.refund_requested_at,
       a.refunded_at,
       a.credit_expires_at,
       a.credit_used_for_attendee_id,
       a.coupon_sent,
       a.coupon_sent_at,
       a.scheduled_time,
       a.eye_exam_needed,
       a.client_notes,
       a.waiting_list_position,
       a.monday_item_id,
       a.created_at,
       a.is_deleted,
       a.no_refund_due_marked,
       a.no_refund_due_marked_at,
       l.full_name,
       l.phone,
       l.email,
       l.city,
       l.language,
       l.terms_approved,
       e.event_number,
       e.event_date,
       e.coupon_code,
       st.name_he AS status_name,
       st.color   AS status_color
FROM crm_event_attendees a
  JOIN crm_leads  l ON a.lead_id  = l.id AND a.tenant_id = l.tenant_id
  JOIN crm_events e ON a.event_id = e.id AND a.tenant_id = e.tenant_id
  LEFT JOIN crm_statuses st
       ON st.slug = a.status
      AND st.entity_type = 'attendee'::text
      AND st.tenant_id   = a.tenant_id
WHERE a.is_deleted = false;

-- 3. Drop the column.
ALTER TABLE public.crm_event_attendees
  DROP COLUMN IF EXISTS paid_via_credit;

COMMIT;

-- Verification:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='crm_event_attendees' AND column_name='paid_via_credit';
--   Expected: 0 rows.
-- SELECT pg_get_functiondef('public.transfer_credit_to_new_attendee'::regproc) ILIKE '%paid_via_credit%';
--   Expected: false.
