-- Module 4 — CRM: module-local DB schema
-- Scope: payment-lifecycle additions from M4_ATTENDEE_PAYMENT_SCHEMA (2026-04-25).
-- Full Module 4 schema (23+ tables) is deferred to the next Integration Ceremony
-- per Sentinel alert M7-DOC-02. This file currently documents ONLY the payment
-- lifecycle additions; future SPECs that touch Module 4 schema should append.

-- =============================================================================
-- crm_event_attendees — payment lifecycle columns (added 2026-04-25)
-- =============================================================================
-- 6 new columns + 1 CHECK constraint + 2 partial indexes + 1 RPC.
-- Legacy columns booking_fee_paid, booking_fee_refunded DROPPED in same SPEC.

-- ALTER reference (canonical migration applied via apply_migration; see
-- modules/Module 4 - CRM/migrations/2026_04_25_payment_*.sql)
ALTER TABLE crm_event_attendees
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN refund_requested_at timestamptz,
  ADD COLUMN refunded_at timestamptz,
  ADD COLUMN credit_expires_at timestamptz,
  ADD COLUMN credit_used_for_attendee_id uuid REFERENCES crm_event_attendees(id);

ALTER TABLE crm_event_attendees
  ADD CONSTRAINT crm_event_attendees_payment_status_check
    CHECK (payment_status IN (
      'pending_payment', 'paid', 'unpaid',
      'refund_requested', 'refunded',
      'credit_pending', 'credit_used'
    ));

CREATE INDEX idx_crm_attendees_payment_status
  ON crm_event_attendees(tenant_id, payment_status)
  WHERE is_deleted = false;

CREATE INDEX idx_crm_attendees_credit_pending
  ON crm_event_attendees(tenant_id, credit_expires_at)
  WHERE payment_status = 'credit_pending' AND is_deleted = false;

-- =============================================================================
-- transfer_credit_to_new_attendee(uuid, uuid) — atomic credit transfer RPC
-- =============================================================================
-- Validates: old in 'credit_pending', new in 'pending_payment', same tenant.
-- Atomic flip: old → 'credit_used' + back-pointer FK; new → 'paid' + paid_at.
-- SECURITY DEFINER. GRANT EXECUTE TO authenticated, service_role.

-- (See migrations/2026_04_25_payment_04_credit_transfer_rpc.sql for full body.)

-- =============================================================================
-- DROPPED at SPEC close (2026-04-25)
-- =============================================================================
-- The legacy boolean fields are gone:
--   - crm_event_attendees.booking_fee_paid (replaced by payment_status='paid')
--   - crm_event_attendees.booking_fee_refunded (replaced by payment_status='refunded')
-- The temporary sync trigger (sync_booking_fee_paid_from_status) was also dropped.

-- =============================================================================
-- v_crm_event_attendees_full — view recreated 2026-04-25
-- =============================================================================
-- Recreated to expose payment_status + 5 new columns; removed booking_fee_paid +
-- booking_fee_refunded. No dependent views (verified pre-recreation).
-- Full definition in migrations/2026_04_25_payment_05_recreate_view.sql.

-- =============================================================================
-- crm_message_templates — payment_received seeded on demo + prizma
-- =============================================================================
-- 4 rows: payment_received_sms_he + payment_received_email_he × demo + prizma.
-- Tenant-neutral content (no hardcoded business names per Iron Rule 9).
-- Variables used: %name%, %event_name%, %event_date%, %unsubscribe_url%.

-- End of payment-lifecycle additions. Full Module 4 schema reconstruction
-- pending Integration Ceremony.
