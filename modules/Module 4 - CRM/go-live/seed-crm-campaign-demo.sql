-- =============================================================================
-- seed-crm-campaign-demo.sql — Seed 1 CRM campaign for demo tenant
-- Context: P2B_EVENT_MANAGEMENT — event creation requires at least one
-- campaign row. Demo tenant had 0 campaigns; clone Prizma's "supersale"
-- campaign template so demo users can create events.
-- Level 2 data insert (approved in SPEC §4).
-- =============================================================================

INSERT INTO crm_campaigns (tenant_id, slug, name, description, is_active,
  default_location, default_hours, default_max_capacity, default_booking_fee)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', slug, name, description, is_active,
  default_location, default_hours, default_max_capacity, default_booking_fee
FROM crm_campaigns
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug = 'supersale'
ON CONFLICT DO NOTHING;
