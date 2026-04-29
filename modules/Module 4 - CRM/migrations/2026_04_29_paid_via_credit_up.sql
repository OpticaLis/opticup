-- P24 — Payment Lifecycle Cleanup
-- Combined migration: new column + RPC update + view recreation + backfill
-- All in one transaction for atomicity.
--
-- Pre-flight findings (2026-04-29):
--   - 0 rows have credit_used_for_attendee_id IS NOT NULL → backfill UPDATE will affect 0 rows.
--   - 0 dependent views/RPCs depend on v_crm_event_attendees_full → view DROP+CREATE is safe.
--   - Existing CHECK constraint on payment_status is INTENTIONALLY UNCHANGED.

BEGIN;

-- 1. New column on crm_event_attendees
ALTER TABLE public.crm_event_attendees
  ADD COLUMN paid_via_credit BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.crm_event_attendees.paid_via_credit IS
  'True when payment_status=paid was set via transfer_credit_to_new_attendee RPC (i.e., the deposit was carried forward from a previous event as credit). False for direct paid transitions (markPaid, send-coupon flow). Surfaces a "💳 קרדיט" chip alongside the paid pill so admins know the row inherited paid state from a credit transfer.';

-- 2. Update transfer_credit_to_new_attendee RPC body to set paid_via_credit=true atomically
--    on the new attendee, in the same UPDATE that sets payment_status='paid'.
--    All other RPC behavior preserved (parameter list, return type, validations,
--    SECURITY DEFINER, language).
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

  -- P24: also flip paid_via_credit=true so the new row's UI surfaces a credit chip.
  UPDATE crm_event_attendees
     SET payment_status = 'paid',
         paid_at = now(),
         paid_via_credit = true
   WHERE id = p_new_attendee_id;
END;
$function$;

-- 3. Recreate v_crm_event_attendees_full to expose paid_via_credit.
--    Pre-flight verified: 0 downstream views/RPCs depend on this view.
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
       a.paid_via_credit,
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

-- 4a. Backfill via credit pointer chain.
--     Pre-flight: 0 rows currently match (no credit_used_for_attendee_id pointers exist
--     in the DB). The UPDATE is forward-compatible — any future credit transfer
--     via the new RPC body sets the boolean atomically.
UPDATE public.crm_event_attendees AS new_row
   SET paid_via_credit = true
 WHERE new_row.payment_status = 'paid'
   AND new_row.is_deleted = false
   AND new_row.paid_via_credit = false
   AND EXISTS (
     SELECT 1 FROM public.crm_event_attendees AS old_row
      WHERE old_row.credit_used_for_attendee_id = new_row.id
        AND old_row.tenant_id = new_row.tenant_id
   );

-- 4b. Hand-flag the specific row Daniel observed on event #68376
--     (T5 Canary Post-Shorten, V4 Edge concurrent B). Per pre-flight, this
--     row's payment_status='paid' came from transfer_credit_to_new_attendee
--     but its credit_used_for_attendee_id pointer is NULL — likely cleared
--     by a downstream attendee-move side effect. Logged in FINDINGS.md
--     as "credit linkage lost during attendee move" for future investigation.
--     Hand-flagging is justified because this is the very row that triggered
--     P24 — shipping without it means the chip won't appear on the case
--     Daniel asked us to fix. Daniel approved (B-B option).
UPDATE public.crm_event_attendees
   SET paid_via_credit = true
 WHERE id = '3d031fe7-ba88-487e-836d-39d9636631be'
   AND payment_status = 'paid'
   AND paid_via_credit = false;

COMMIT;

-- Verification queries (run post-migration):
--
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public'
--    AND table_name='crm_event_attendees'
--    AND column_name='paid_via_credit';
--   Expected: 1 row. boolean / NO / false
--
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public'
--    AND table_name='v_crm_event_attendees_full'
--    AND column_name='paid_via_credit';
--   Expected: 1 row.
--
-- SELECT pg_get_functiondef('public.transfer_credit_to_new_attendee'::regproc) ILIKE '%paid_via_credit%';
--   Expected: true.
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid='public.crm_event_attendees'::regclass AND contype='c';
--   Expected: unchanged — the 7 payment_status slugs.
--
-- SELECT count(*) FROM crm_event_attendees WHERE paid_via_credit=true;
--   Expected (post-backfill): 0 (no historical rows had the pointer chain intact).
