# ARCHITECT_DECISION 001 — SPEC 3 §9 Amendment (live-schema fix)

**Decided by:** Cowork-Architect (Daniel-via-Cowork)
**Date:** 2026-05-17 IDT
**Pipeline:** `M1_LENS_DB_SCHEMA_RECEIPTS_NOTES`
**Escalation source:** `modules/Module 1 - Inventory Management/escalations/2026-05-17T_M1_LENS_DB_SCHEMA_RECEIPTS_NOTES_PREFLIGHT_HALT.md`

---

## Decision: APPROVED — Path A (Resolve collision + amend §9 in-place)

### Resolution of Deviation #1 (coordination collision)

Path A from the escalation. **SPEC 3 runs sequentially after SPEC 2 closes.** SPEC 2 already closed 🟡 in commit `73c50b1` — its lock has been released. Re-attempt the claim now; should succeed.

The parallel-execution assumption in the original ACTIVATION_PROMPT was wrong against `pipeline-coordination.mjs`'s one-Pipeline-per-branch rule (shipped today by `PARALLEL_PIPELINE_COORDINATION` SPEC, line 297). This is a Brief-side defect — Cowork-Architect will harvest it as a Brief-authoring lesson at SPEC closeout. No SPEC change needed for this deviation.

### Resolution of Deviation #2 (§9 schema template wrong)

SPEC §9 is amended in place per the answers below. The executor should apply these to the migration template before writing the SQL.

#### Q1 — Which roles get each key?

| Permission key | Granted to roles |
|---|---|
| `inventory.view_cost_price` | `ceo`, `manager` |
| `lens_pricing.edit` | `ceo`, `manager` |

Rationale: `ceo` is the highest-authority role per Optic Up's role hierarchy (replaces "admin" in the canonical roles list). `manager` covers store-level operations. Both keys are admin-tier sensitivity (cost price = financial; pricing edit = revenue control), so the same role pair fits both.

#### Q2 — Per-tenant seeding scope: BOTH tenants (demo + Prizma)

Seed the 2 permission keys + 4 role-permission grants for BOTH demo and Prizma tenants. This violates the parent Brief's "no Prizma writes" prohibition *only at the technical level* — the spirit of that prohibition is "no Prizma customer-data mutations". This is a SCHEMA-row INSERT (defining permission existence), not a data row. Per Optic Up's existing pattern of duplicating every permission per tenant, doing demo-only would create drift that fails Iron Rule 20 (SaaS litmus test).

**Open follow-up (TECH_DEBT, not blocking this SPEC):** before onboarding tenant 3, build a `permissions_template` global table with auto-replication trigger. The executor should add this to `TECH_DEBT.md` under `M1-DEBT-XX — permissions_template auto-replication`. Out of scope for SPEC 3.

#### Q3 — Permission-key naming: ACCEPT SPEC §9 strings

`inventory.view_cost_price` and `lens_pricing.edit` are correct slugs. They map cleanly to the live schema's `module`/`action` split:

| `id` (slug) | `module` | `action` |
|---|---|---|
| `inventory.view_cost_price` | `inventory` | `view_cost_price` |
| `lens_pricing.edit` | `lens_pricing` | `edit` |

#### Q4 — Hebrew display names

| Permission key | `name_he` |
|---|---|
| `inventory.view_cost_price` | `'צפייה במחיר עלות'` |
| `lens_pricing.edit` | `'עריכת תמחור עדשות'` |

---

## Amended SPEC §9 migration template (executor uses THIS, not the original)

```sql
-- Permission seed migration for M1_LENS_DB_SCHEMA_RECEIPTS_NOTES
-- Per ARCHITECT_DECISION 001 (Daniel-Architect 2026-05-17)

-- Step 1: Insert permission rows for BOTH tenants
-- Resolve tenant IDs at migration time via lookup (safer than hardcoded UUIDs).

WITH tenant_list AS (
  SELECT id AS tenant_id FROM tenants
  WHERE slug IN ('prizma', 'demo')  -- adjust to actual slug values
)
INSERT INTO permissions (id, module, action, name_he, description, tenant_id)
SELECT
  perm.id, perm.module, perm.action, perm.name_he, perm.description, t.tenant_id
FROM (
  VALUES
    ('inventory.view_cost_price', 'inventory', 'view_cost_price', 'צפייה במחיר עלות', 'Permission to view cost price columns in inventory tables'),
    ('lens_pricing.edit', 'lens_pricing', 'edit', 'עריכת תמחור עדשות', 'Permission to edit lens pricing (bulk pricing tools, approvals, hierarchy)')
) AS perm(id, module, action, name_he, description)
CROSS JOIN tenant_list t
ON CONFLICT (id, tenant_id) DO NOTHING;

-- Step 2: Grant each permission to ceo + manager roles in each tenant
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

**Executor must:**
1. Verify actual UNIQUE constraint on `permissions` (probably `(id, tenant_id)`) and on `role_permissions` (probably `(role_id, permission_id, tenant_id)`) before using ON CONFLICT clauses.
2. Verify `tenants.slug` is the right join key (might be different column name — check via `\d tenants` first).
3. Resolve the actual Prizma + demo tenant IDs at run time and confirm both are present.
4. Apply via Supabase MCP `apply_migration`.
5. Verify with read-only query that 4 rows landed in `permissions` (2 keys × 2 tenants) and 8 rows in `role_permissions` (2 keys × 2 tenants × 2 roles).
6. Run `get_advisors` after the migration — must be clean.

If any of steps 1-3 reveal an unexpected reality → STOP, write a new escalation, do not re-confabulate.

---

## Commit plan adjustment

The original Commit Plan #4 stays in place but its body is the amended SQL above. No other commits change. SPEC.md §9 should be updated by the executor to reflect this amendment (either inline edit or a "§9 superseded by ARCHITECT_DECISION_001" note).

## Closeout protocol

After Pipeline closes 🟢:
- This ARCHITECT_DECISION file stays in the SPEC folder permanently
- EXECUTION_REPORT.md should explicitly reference it
- The escalation file should be renamed `RESOLVED_*` per Brief Contract E
- The TECH_DEBT entry for `permissions_template` should be filed before Pipeline closes

---

**END ARCHITECT_DECISION 001**
