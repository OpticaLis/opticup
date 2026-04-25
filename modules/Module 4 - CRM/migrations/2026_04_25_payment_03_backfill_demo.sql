-- M4_ATTENDEE_PAYMENT_SCHEMA — Phase 3: backfill demo's 13 existing rows
-- Demo-only. Prizma has 0 attendees (verified pre-flight 2026-04-25).
-- Pre-state: 1 row booking_fee_paid=true (id 69eedb90-…), 0 booking_fee_refunded=true.
-- Post-state: 1 row payment_status='paid' + paid_at set, 12 stay default 'pending_payment'.

UPDATE crm_event_attendees
   SET payment_status = 'paid',
       paid_at = COALESCE(confirmed_at, registered_at, now())
 WHERE booking_fee_paid = true
   AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- Refunded backfill (none on demo today, but safe to include)
UPDATE crm_event_attendees
   SET payment_status = 'refunded',
       refunded_at = COALESCE(cancelled_at, now()),
       refund_requested_at = COALESCE(cancelled_at, now())
 WHERE booking_fee_refunded = true
   AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
