-- M4_ATTENDEE_PAYMENT_SCHEMA — Phase 5: recreate v_crm_event_attendees_full
-- Replaces booking_fee_paid + booking_fee_refunded columns with the 6 new payment-lifecycle
-- columns. No dependent views (verified pre-execution).

DROP VIEW IF EXISTS v_crm_event_attendees_full;

CREATE VIEW v_crm_event_attendees_full AS
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
  LEFT JOIN crm_statuses st ON st.slug = a.status AND st.entity_type = 'attendee'::text AND st.tenant_id = a.tenant_id
 WHERE a.is_deleted = false;
