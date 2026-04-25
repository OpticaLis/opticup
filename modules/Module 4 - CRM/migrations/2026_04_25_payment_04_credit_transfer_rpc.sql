-- M4_ATTENDEE_PAYMENT_SCHEMA — Phase 4: atomic credit-transfer RPC
-- Cross-tenant DDL. Function applies to both demo + prizma + future tenants.
-- Validates: old attendee in 'credit_pending', new in 'pending_payment', same tenant.
-- Atomic flip: old → 'credit_used' + credit_used_for_attendee_id pointer; new → 'paid' + paid_at.

CREATE OR REPLACE FUNCTION transfer_credit_to_new_attendee(
  p_old_attendee_id uuid,
  p_new_attendee_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  -- Atomic flip: old → credit_used (with FK pointing to new), new → paid
  UPDATE crm_event_attendees
     SET payment_status = 'credit_used',
         credit_used_for_attendee_id = p_new_attendee_id
   WHERE id = p_old_attendee_id;

  UPDATE crm_event_attendees
     SET payment_status = 'paid',
         paid_at = now()
   WHERE id = p_new_attendee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_credit_to_new_attendee(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_credit_to_new_attendee(uuid, uuid) TO service_role;
