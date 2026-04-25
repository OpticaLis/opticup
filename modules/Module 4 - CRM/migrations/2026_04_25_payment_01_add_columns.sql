-- M4_ATTENDEE_PAYMENT_SCHEMA — Phase 1: add payment_status + 4 timestamps + 1 self-FK
-- Cross-tenant DDL (table-level). Applied via Supabase MCP apply_migration.
-- Predecessor SPEC commit: f16a1f4 (SPEC approval). Pre-flight verified 2026-04-25:
-- 13 demo attendees, 1 paid, 0 refunded, 23 columns pre-migration.

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
