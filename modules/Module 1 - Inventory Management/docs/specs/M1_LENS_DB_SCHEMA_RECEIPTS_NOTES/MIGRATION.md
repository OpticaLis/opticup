# MIGRATION — M1 Lens DB Schema Receipts & Notes

> **Applied via Supabase MCP `apply_migration` AND mirrored to `supabase/migrations/*.sql`** (both sides of the source-of-truth in sync — no TD-2 drift introduced by this SPEC).
> **Migration count:** 3 forward migrations.
> **Project:** `tsxrrxzmdxaenlvocyit` (Live Supabase)
> **Applied on:** 2026-05-17
> **Architect amendment governing Migration #3:** `ARCHITECT_DECISION_001_SPEC3_AMENDMENT.md` (this SPEC folder)

This file is the canonical record of the SQL applied. It lives inside the SPEC folder so the destructive-pattern scanner (Iron Rule 32, `scripts/checks/destructive-ops-declared.mjs`) treats it as a doc-file (`/^modules\/[^/]+\/docs\/specs\/[^/]+\/[A-Z][A-Z0-9_-]+\.md$/` → `isDocFile()` true) and does NOT block staging.

---

## Pre-flight baselines (matched SPEC §0 + amendment requirements)

| Probe | Live result | Expected per SPEC | Match |
|---|---|---|---|
| `EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='lens_variant_notes')` | FALSE | FALSE | ✅ |
| `EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_receipt' AND column_name='has_no_invoice')` | FALSE | FALSE | ✅ |
| `EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_receipt')` | TRUE | TRUE | ✅ |
| `EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='lens_variant')` | TRUE | TRUE | ✅ |
| `count(*) FROM permissions WHERE id='inventory.view_cost_price'` | 0 | 0 | ✅ |
| `count(*) FROM permissions WHERE id='lens_pricing.edit'` | 0 | 0 | ✅ |
| `permissions` PK | `(id, tenant_id)` | per amendment ON CONFLICT clause | ✅ |
| `role_permissions` PK | `(role_id, permission_id, tenant_id)` | per amendment ON CONFLICT clause | ✅ |
| `tenants.slug` column exists | YES | YES | ✅ |
| `prizma` tenant slug | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | row present | ✅ |
| `demo` tenant slug | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | row present | ✅ |
| `ceo` role in both tenants | YES | YES | ✅ |
| `manager` role in both tenants | YES | YES | ✅ |
| `admin` role anywhere | **NO** (does not exist) | — | (SPEC §9 original assumption disproven; ARCHITECT_DECISION 001 Q1 → use `ceo` + `manager` instead) |

---

## Forward SQL — Migration #1

**Applied as MCP `apply_migration(name='m1_lens_purchase_receipt_has_no_invoice')` — server assigned version `20260517161202`.**
**Repo file:** `supabase/migrations/20260517161202_m1_lens_purchase_receipt_has_no_invoice.sql`

```sql
-- M1 Lens — SPEC M1_LENS_DB_SCHEMA_RECEIPTS_NOTES Commit 2
-- Adds the has_no_invoice flag to purchase_receipt for Brief decision #14
-- (delivery note mandatory + "אין תעודה" UI checkbox flows to bookkeeper's
-- Invoices Inbox via this column).

ALTER TABLE purchase_receipt
  ADD COLUMN has_no_invoice BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN purchase_receipt.has_no_invoice IS
  'TRUE when the user checked "אין תעודה" during receipt entry. Triggers manager-audit exception flow on the bookkeeper Invoices Inbox screen. Per Brief decision 14.';
```

**Post-migration verification:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='purchase_receipt' AND column_name='has_no_invoice';
-- Result: has_no_invoice / boolean / NO / false ✅
```

---

## Forward SQL — Migration #2

**Applied as MCP `apply_migration(name='m1_lens_variant_notes')` — server assigned version `20260517161421`.**
**Repo file:** `supabase/migrations/20260517161421_m1_lens_variant_notes.sql`

```sql
-- M1 Lens — SPEC M1_LENS_DB_SCHEMA_RECEIPTS_NOTES Commit 3
-- Creates lens_variant_notes table backing the Pricing screen's לוגים+הערות
-- drawer (Brief decision #18). Notes are freeform multi-line text per variant,
-- scoped per tenant, with author attribution + created/updated timestamps.
-- Canonical 2-policy RLS: service_bypass (service_role) + tenant_isolation
-- (public, JWT-claim USING per Iron Rule 15).

CREATE TABLE lens_variant_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID NOT NULL REFERENCES lens_variant(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES auth.users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lens_variant_notes_variant_id ON lens_variant_notes(variant_id);
CREATE INDEX idx_lens_variant_notes_tenant_id  ON lens_variant_notes(tenant_id);

ALTER TABLE lens_variant_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON lens_variant_notes
  TO service_role
  USING (true);

CREATE POLICY tenant_isolation ON lens_variant_notes
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

COMMENT ON TABLE lens_variant_notes IS
  'Freeform notes attached to lens_variant entries. Backs the Pricing screen לוגים+הערות drawer (Brief decision #18 — M1_LENS_DB_SCHEMA_RECEIPTS_NOTES SPEC, 2026-05-17). Tenant-scoped via JWT claim. Multiple notes per variant allowed.';
```

**Post-migration verification:**
```sql
SELECT
  (SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='lens_variant_notes') AS rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='lens_variant_notes') AS policy_count,
  (SELECT string_agg(policyname || ' (' || roles::text || ')', ', ') FROM pg_policies WHERE schemaname='public' AND tablename='lens_variant_notes') AS policies,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='lens_variant_notes') AS column_count,
  (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='lens_variant_notes') AS index_count;
-- Result: rls_enabled=true, policy_count=2, policies="service_bypass ({service_role}), tenant_isolation ({public})", column_count=7, index_count=3 ✅
```

**Advisor check:** `mcp__supabase__get_advisors(type='security')` after this migration — no new HIGH/ERROR; `lens_variant_notes` not flagged. ✅

---

## Forward SQL — Migration #3 (per ARCHITECT_DECISION 001 amended template)

**Applied as MCP `apply_migration(name='m1_lens_permission_seeds_view_cost_price_and_lens_pricing_edit')` — server assigned version `20260517161725`.**
**Repo file:** `supabase/migrations/20260517161725_m1_lens_permission_seeds_view_cost_price_and_lens_pricing_edit.sql`

```sql
-- M1 Lens — SPEC M1_LENS_DB_SCHEMA_RECEIPTS_NOTES Commit 4
-- Per ARCHITECT_DECISION 001 (Daniel-via-Cowork 2026-05-17):
--   inventory.view_cost_price + lens_pricing.edit — seed for BOTH tenants
--   (prizma + demo), granted to ceo + manager roles in each tenant.
-- Replaces the original SPEC §9 template which assumed wrong column names
-- (key/description) and a non-existent admin role.

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
```

**Post-migration verification:**
```sql
SELECT
  (SELECT count(*) FROM permissions WHERE id IN ('inventory.view_cost_price','lens_pricing.edit')) AS perm_rows,
  (SELECT count(*) FROM role_permissions WHERE permission_id IN ('inventory.view_cost_price','lens_pricing.edit')) AS role_perm_rows;
-- Result: perm_rows=4, role_perm_rows=8 ✅

-- Detailed:
SELECT t.slug, p.id, p.name_he, string_agg(rp.role_id, ', ' ORDER BY rp.role_id) AS roles
FROM permissions p
JOIN tenants t ON t.id = p.tenant_id
LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.tenant_id = p.tenant_id AND rp.granted = true
WHERE p.id IN ('inventory.view_cost_price','lens_pricing.edit')
GROUP BY t.slug, p.id, p.name_he
ORDER BY t.slug, p.id;
-- demo   | inventory.view_cost_price | צפייה במחיר עלות | ceo, manager
-- demo   | lens_pricing.edit         | עריכת תמחור עדשות | ceo, manager
-- prizma | inventory.view_cost_price | צפייה במחיר עלות | ceo, manager
-- prizma | lens_pricing.edit         | עריכת תמחור עדשות | ceo, manager
-- All 4 rows present with correct grants ✅
```

**Advisor check:** `mcp__supabase__get_advisors(type='security')` after this migration — no new HIGH/ERROR; affected tables not flagged. ✅

---

## Rollback recipes (SPEC §6 — reference only; not invoked)

Rollback DDL is documented in `SPEC.md §6 Rollback Plan` inside this SPEC folder (kept inside SPEC.md rather than inline here so the destructive-pattern scanner sees it once, not twice).

The forward path is idempotent on re-run via `ON CONFLICT DO NOTHING` clauses on the permission/role-permission seeds. Migration #1 and #2 are not idempotent (would error on re-apply due to existing column/table); if re-running becomes necessary, prefix with conditional `IF NOT EXISTS` guards.

---

*End of MIGRATION.md. All 3 migrations applied successfully; live state matches SPEC §3 Success Criteria #1–#20.*
