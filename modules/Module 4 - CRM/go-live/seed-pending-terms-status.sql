-- =============================================================================
-- seed-pending-terms-status.sql
-- P3a — Manual Lead Entry
-- Seeds the `pending_terms` lead status on BOTH tenants (demo + Prizma).
-- Applied by opticup-executor on 2026-04-22.
--
-- Rationale: leads created via manual entry in the CRM did NOT approve
-- terms/privacy policy. They receive status `pending_terms` and cannot be
-- transferred to Tier 2 until `terms_approved = true`. The approval
-- mechanism (terms link via WhatsApp/SMS) is P3b.
--
-- Idempotent: ON CONFLICT DO NOTHING (unique on tenant_id, entity_type, slug).
-- =============================================================================

INSERT INTO crm_statuses (tenant_id, slug, name_he, entity_type, color, sort_order, is_default, is_terminal, triggers_messages)
VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'pending_terms', 'לא אישר תקנון', 'lead', '#f59e0b', 6, false, false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'pending_terms', 'לא אישר תקנון', 'lead', '#f59e0b', 6, false, false, false)
ON CONFLICT (tenant_id, entity_type, slug) DO NOTHING;
