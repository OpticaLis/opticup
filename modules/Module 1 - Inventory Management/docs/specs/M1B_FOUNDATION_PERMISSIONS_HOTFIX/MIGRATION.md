# Migration Log — M1B_FOUNDATION_PERMISSIONS_HOTFIX

This file records every `apply_migration` call this SPEC issues to the live Supabase database, in chronological order. Pattern inherited from M1A E1.

## Applied Log

| # | ISO Timestamp (UTC) | Migration Name | Object Type | Outcome | Notes |
|---|---|---|---|---|---|
| _(rows appended below as migrations are applied)_ | | | | | |

## Pending block (paste-ready for MCP apply_migration)

### Block 1 — Seed lens.* role_permissions (18 rows × 2 tenants × 5 roles × 3 keys per matrix)

```sql
-- M1B_FOUNDATION_PERMISSIONS_HOTFIX
-- Phase B + Phase D combined: 18 INSERTs to public.role_permissions
-- Matrix: ceo + manager get all 3 lens.* keys; team_lead + viewer + worker get lens.inventory.view only
-- Both tenants in single block. ON CONFLICT idempotency (Iron Rule 21).

INSERT INTO public.role_permissions (role_id, permission_id, granted, tenant_id) VALUES
  -- demo (8d8cfa7e-ef58-49af-9702-a862d459cccb) — 9 rows
  ('ceo',       'lens.inventory.view', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       'lens.designs.manage', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       'lens.pricing.manage', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.inventory.view', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.designs.manage', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.pricing.manage', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('team_lead', 'lens.inventory.view', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('viewer',    'lens.inventory.view', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('worker',    'lens.inventory.view', true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  -- prizma (6ad0781b-37f0-47a9-92e3-be9ed1477e1c) — 9 rows
  ('ceo',       'lens.inventory.view', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('ceo',       'lens.designs.manage', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('ceo',       'lens.pricing.manage', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.inventory.view', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.designs.manage', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.pricing.manage', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('team_lead', 'lens.inventory.view', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('viewer',    'lens.inventory.view', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('worker',    'lens.inventory.view', true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c')
ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING;
```

Expected outcome: 18 rows inserted (the table was confirmed empty for these tuples by pre-flight A2 probe). ON CONFLICT clause protects against re-run / partial-recovery scenarios.

---

*Per TD-2 precedent (M1A pattern), no `supabase/migrations/*.sql` file is created — MCP `apply_migration` is the single source of truth, logged here.*
