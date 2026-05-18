-- M1 Lens — SPEC M1_LENS_DB_SCHEMA_RECEIPTS_NOTES Commit 4
-- Per ARCHITECT_DECISION 001 (Daniel-via-Cowork 2026-05-17):
--   inventory.view_cost_price + lens_pricing.edit — seed for BOTH tenants
--   (prizma + demo), granted to ceo + manager roles in each tenant.
-- Replaces the original SPEC §9 template which assumed wrong column names
-- (key/description) and a non-existent admin role. See
-- modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/
-- ARCHITECT_DECISION_001_SPEC3_AMENDMENT.md.

-- Step 1: Insert permission rows for BOTH tenants.
-- tenants.slug resolved at migration time (Iron Rule 9 — no hardcoded UUIDs).

INSERT INTO permissions (id, module, action, name_he, description, tenant_id)
SELECT
  perm.id, perm.module, perm.action, perm.name_he, perm.description, t.id
FROM (
  VALUES
    ('inventory.view_cost_price', 'inventory',   'view_cost_price', 'צפייה במחיר עלות',  'Permission to view cost price columns in inventory + pricing screens'),
    ('lens_pricing.edit',         'lens_pricing','edit',            'עריכת תמחור עדשות', 'Permission to edit lens pricing (bulk pricing tools, approvals, hierarchy) and add/edit/delete variant notes')
) AS perm(id, module, action, name_he, description)
CROSS JOIN tenants t
WHERE t.slug IN ('prizma', 'demo')
ON CONFLICT (id, tenant_id) DO NOTHING;

-- Step 2: Grant each permission to ceo + manager roles in each tenant.

INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
SELECT
  r.role_id, p.permission_id, true, p.tenant_id
FROM (
  VALUES ('ceo'), ('manager')
) AS r(role_id)
CROSS JOIN (
  SELECT 'inventory.view_cost_price'::text AS permission_id, id AS tenant_id FROM tenants WHERE slug IN ('prizma', 'demo')
  UNION ALL
  SELECT 'lens_pricing.edit'::text AS permission_id, id AS tenant_id FROM tenants WHERE slug IN ('prizma', 'demo')
) AS p
ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING;
