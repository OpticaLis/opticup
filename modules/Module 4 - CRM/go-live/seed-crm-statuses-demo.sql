-- =============================================================================
-- seed-crm-statuses-demo.sql — CRM status rows for the demo tenant
-- Ran by Claude Code on 2026-04-21 as Commit 0 of P2A_LEAD_MANAGEMENT.
-- Clones 31 rows (11 lead + 10 attendee + 10 event) from Prizma to demo so the
-- CRM UI has status metadata on the test tenant (blocks P2a testing otherwise).
-- Idempotent: safe to re-run — uses ON CONFLICT on the natural-key triple.
-- =============================================================================

INSERT INTO crm_statuses (
  tenant_id, entity_type, slug, name_he, name_en, color, icon,
  sort_order, is_default, is_terminal, triggers_messages, is_active
)
SELECT
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid AS tenant_id,
  entity_type, slug, name_he, name_en, color, icon,
  sort_order, is_default, is_terminal, triggers_messages, is_active
FROM crm_statuses
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
ON CONFLICT (tenant_id, entity_type, slug) DO NOTHING;
