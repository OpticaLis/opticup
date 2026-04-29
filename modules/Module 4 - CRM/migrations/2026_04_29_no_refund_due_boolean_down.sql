-- P23.1 ROLLBACK — restore pre-P23.1 schema
-- Run only if P23.1 needs to be reverted in DB. Code revert (commits 5→4→3
-- from P23.1) must be paired with this; otherwise the cancel "לא מגיע החזר"
-- path will silently 400 again (writes payment_status='no_refund_due' which
-- the CHECK constraint still rejects).

BEGIN;

-- 1. Recreate the view WITHOUT the boolean columns (matches pre-P23.1 definition).
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

-- 2. Drop the boolean columns. Any rows that had no_refund_due_marked=true
-- LOSE that flag — but in pre-P23.1 design those rows would have been broken
-- anyway (payment_status='no_refund_due' was rejected). Net data loss: 0
-- meaningful state.
ALTER TABLE public.crm_event_attendees
  DROP COLUMN IF EXISTS no_refund_due_marked_at,
  DROP COLUMN IF EXISTS no_refund_due_marked;

COMMIT;

-- Verification queries (run post-rollback to confirm):
--
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public'
--    AND table_name='crm_event_attendees'
--    AND column_name IN ('no_refund_due_marked','no_refund_due_marked_at');
--   Expected: 0 rows.
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid='public.crm_event_attendees'::regclass AND contype='c';
--   Expected: unchanged from pre-P23.1 baseline (7 payment_status slugs).
