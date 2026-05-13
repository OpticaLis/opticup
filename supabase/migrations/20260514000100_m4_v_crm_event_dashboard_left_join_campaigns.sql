-- M4 Quick Hygiene Fix — Rec 6 from M4_DEEP_AUDIT_2026_05_13.md §3.5.2
--
-- Bug: v_crm_event_dashboard used INNER JOIN crm_campaigns, hiding any
-- crm_events row whose campaign_id IS NULL (events not bound to a campaign).
--
-- Fix: change to LEFT JOIN crm_campaigns. Same 28-column list, same column
-- order, same WHERE clause, same security_invoker=on. Downstream consumers
-- (CRM event dashboard UI, optic_readonly analytics) see identical schema.
--
-- Safety: CREATE OR REPLACE preserves grants. ALTER VIEW SET security_invoker
-- is reasserted defensively in case the option ever resets.

CREATE OR REPLACE VIEW public.v_crm_event_dashboard
WITH (security_invoker = on)
AS
SELECT
    e.id,
    e.tenant_id,
    e.campaign_id,
    e.event_number,
    e.name,
    e.event_date,
    e.start_time,
    e.end_time,
    e.location_address,
    e.location_waze_url,
    e.status,
    e.max_capacity,
    e.booking_fee,
    e.coupon_code,
    e.registration_form_url,
    e.notes,
    e.monday_item_id,
    e.created_at,
    e.is_deleted,
    c.name AS campaign_name,
    c.slug AS campaign_slug,
    s.total_registered,
    s.total_confirmed,
    s.total_attended,
    s.total_purchased,
    s.total_revenue,
    s.spots_remaining,
    s.purchase_rate_pct
FROM crm_events e
    LEFT JOIN crm_campaigns c ON e.campaign_id = c.id
    LEFT JOIN v_crm_event_stats s ON e.id = s.event_id
WHERE e.is_deleted = false;
