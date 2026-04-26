-- M4_ATTENDEE_PAYMENT_SCHEMA — Phase 99: drop legacy booking_fee_paid + booking_fee_refunded
-- Cross-tenant DDL. Run AFTER carve-out (Phase 5) verified 0 hits in active code.
-- The 99_ prefix sorts last lexically.

DROP TRIGGER IF EXISTS sync_booking_fee_paid_from_status ON crm_event_attendees;
DROP FUNCTION IF EXISTS sync_booking_fee_paid_from_status();

ALTER TABLE crm_event_attendees
  DROP COLUMN booking_fee_paid,
  DROP COLUMN booking_fee_refunded;
