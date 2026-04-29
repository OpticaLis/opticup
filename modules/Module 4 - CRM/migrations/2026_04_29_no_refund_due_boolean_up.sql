-- P23.1 — Move "no_refund_due" from payment_status enum to a boolean column
-- Origin: P23 FOREMAN_REVIEW Finding 1 (CRITICAL). Daniel chose Route B (boolean).
-- Forward-only schema migration. 0 rows currently use payment_status='no_refund_due'
-- (CHECK constraint blocks all writes), so no data backfill is needed.

BEGIN;

-- 1. New columns on crm_event_attendees
ALTER TABLE public.crm_event_attendees
  ADD COLUMN no_refund_due_marked    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN no_refund_due_marked_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.crm_event_attendees.no_refund_due_marked    IS
  'Managerial decision flag: admin marked this attendee as cancellation-without-refund. Coupon stays unfreed. Set by P23 cancel UI "לא מגיע החזר" path.';
COMMENT ON COLUMN public.crm_event_attendees.no_refund_due_marked_at IS
  'Timestamp when no_refund_due_marked was first set to true.';

-- 2. Recreate v_crm_event_attendees_full to expose the new columns
-- Verified pre-flight: 0 downstream views/RPCs depend on this view (pg_depend check).
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

-- Note: payment_status CHECK constraint is INTENTIONALLY UNCHANGED.
-- The boolean column avoids touching the enum, per Route B design.

COMMIT;

-- Verification queries (run post-migration to confirm success):
--
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public'
--    AND table_name='crm_event_attendees'
--    AND column_name IN ('no_refund_due_marked','no_refund_due_marked_at')
--  ORDER BY column_name;
--   Expected: 2 rows.
--   no_refund_due_marked    | boolean                     | NO  | false
--   no_refund_due_marked_at | timestamp with time zone    | YES | (null)
--
-- SELECT count(*) FROM crm_event_attendees WHERE no_refund_due_marked=true;
--   Expected: 0 (default applies to all existing rows).
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid='public.crm_event_attendees'::regclass AND contype='c';
--   Expected: unchanged — exactly the 7 original payment_status slugs.
--
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public'
--    AND table_name='v_crm_event_attendees_full'
--    AND column_name IN ('no_refund_due_marked','no_refund_due_marked_at');
--   Expected: 2 rows.
