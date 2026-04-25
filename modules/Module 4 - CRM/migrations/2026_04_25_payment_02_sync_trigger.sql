-- M4_ATTENDEE_PAYMENT_SCHEMA — Phase 2: one-way sync trigger (new payment_status → old booking_fee_paid)
-- Cross-tenant DDL. Trigger exists ONLY during the SPEC; dropped in Phase 99 (commit 6).
-- Direction: payment_status='paid' → booking_fee_paid=true. Never bidirectional (no loop).

CREATE OR REPLACE FUNCTION sync_booking_fee_paid_from_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_status = 'paid' THEN
    NEW.booking_fee_paid := true;
  ELSIF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
    NEW.booking_fee_paid := false;
  END IF;
  IF NEW.payment_status = 'refunded' THEN
    NEW.booking_fee_refunded := true;
  ELSIF OLD.payment_status = 'refunded' AND NEW.payment_status != 'refunded' THEN
    NEW.booking_fee_refunded := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_booking_fee_paid_from_status
  BEFORE INSERT OR UPDATE OF payment_status ON crm_event_attendees
  FOR EACH ROW EXECUTE FUNCTION sync_booking_fee_paid_from_status();
