# Migration Log — M1_LENS_PHASE_1B_PROCUREMENT

This file records every database write this SPEC issues to the live Supabase database, in chronological order. Pattern inherited from M1A E1 + M1B_FOUNDATION_PERMISSIONS_HOTFIX precedent.

**Note vs SPEC SC #9:** SPEC §3 SC #9 declares "0 new DDL applied" with verify command "DB advisor + `list_migrations` no new entries since SPEC_START". The seed below was applied via `execute_sql` MCP (NOT `apply_migration`) precisely to honor SC #9 — `execute_sql` runs DML in-place without inserting a row into `supabase_migrations.schema_migrations`. This is a refinement vs the foundation hotfix pattern (which used `apply_migration` for its 18-row seed and accepted the resulting migration row). The DML is identical in effect; the path differs.

## Applied Log

| # | ISO Timestamp (UTC) | Operation Name | Object Type | Outcome | Notes |
|---|---|---|---|---|---|
| 1 | 2026-05-15T~execute~ | `m1_lens_phase_1b_procurement_seed_permissions` | DML — 12 INSERTs to `permissions` + 34 INSERTs to `role_permissions` (demo + prizma, 6 new lens.* keys per SPEC §0.D matrix) | ✅ counts verified post-apply: 12 new perms + 34 new role_perms; totals = 18 perms + 52 role_perms | Applied via `execute_sql`. ON CONFLICT DO NOTHING on both tables (idempotent). Foundation 18 rows untouched; Phase 1B procurement extends the matrix without modification. |

## Pending block (paste-ready / re-run safe)

### Block 1 — Seed lens.* permissions (12 rows) + role_permissions (34 rows × 2 tenants per §0.D matrix)

```sql
-- M1_LENS_PHASE_1B_PROCUREMENT
-- Phase 1B procurement seed: 6 new lens.* keys × 2 tenants = 12 perm rows + 34 role_permission rows
-- Tenants: demo (8d8cfa7e-ef58-49af-9702-a862d459cccb) + prizma (6ad0781b-37f0-47a9-92e3-be9ed1477e1c)
-- Role distribution per SPEC §0.D: ceo+manager get all 6; team_lead+viewer+worker get view-only
-- (worker also gets gr.create per receiving-employee role; viewer is read-only by design)
-- Both tenants in single block. ON CONFLICT idempotency (Iron Rule 21).

INSERT INTO public.permissions (id, module, action, name_he, description, tenant_id) VALUES
  -- demo (6 rows)
  ('lens.po.create',           'lens', 'po.create',           'יצירת הזמנת רכש',         'יצירת הזמנת רכש חדשה לספק עדשות', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.po.view',             'lens', 'po.view',             'צפייה בהזמנות רכש',         'צפייה ברשימת הזמנות רכש פעילות', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.po.cancel',           'lens', 'po.cancel',           'ביטול הזמנת רכש',           'ביטול הזמנת רכש שנשלחה', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.gr.create',           'lens', 'gr.create',           'יצירת קבלת סחורה',           'יצירת קבלת סחורה כנגד הזמנת רכש', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.gr.add_manual_line',  'lens', 'gr.add_manual_line',  'הוספת שורה ידנית בקבלה',     'הוספת פריט שלא מופיע בהזמנת הרכש', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.inventory.adjust',    'lens', 'inventory.adjust',    'התאמת מלאי (PIN)',           'התאמת כמויות מלאי דרך מסך מלאי - דורש PIN (Iron Rule 1)', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  -- prizma (6 rows)
  ('lens.po.create',           'lens', 'po.create',           'יצירת הזמנת רכש',         'יצירת הזמנת רכש חדשה לספק עדשות', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('lens.po.view',             'lens', 'po.view',             'צפייה בהזמנות רכש',         'צפייה ברשימת הזמנות רכש פעילות', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('lens.po.cancel',           'lens', 'po.cancel',           'ביטול הזמנת רכש',           'ביטול הזמנת רכש שנשלחה', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('lens.gr.create',           'lens', 'gr.create',           'יצירת קבלת סחורה',           'יצירת קבלת סחורה כנגד הזמנת רכש', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('lens.gr.add_manual_line',  'lens', 'gr.add_manual_line',  'הוספת שורה ידנית בקבלה',     'הוספת פריט שלא מופיע בהזמנת הרכש', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('lens.inventory.adjust',    'lens', 'inventory.adjust',    'התאמת מלאי (PIN)',           'התאמת כמויות מלאי דרך מסך מלאי - דורש PIN (Iron Rule 1)', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c')
ON CONFLICT (id, tenant_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id, granted, tenant_id) VALUES
  -- demo (17 rows: ceo×6 + manager×6 + team_lead×2 + viewer×1 + worker×2)
  ('ceo',       'lens.po.create',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       'lens.po.view',             true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       'lens.po.cancel',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       'lens.gr.create',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       'lens.gr.add_manual_line',  true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('ceo',       'lens.inventory.adjust',    true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.po.create',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.po.view',             true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.po.cancel',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.gr.create',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.gr.add_manual_line',  true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('manager',   'lens.inventory.adjust',    true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('team_lead', 'lens.po.view',             true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('team_lead', 'lens.gr.create',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('viewer',    'lens.po.view',             true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('worker',    'lens.po.view',             true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('worker',    'lens.gr.create',           true, '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  -- prizma (17 rows — same matrix mirrored)
  ('ceo',       'lens.po.create',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('ceo',       'lens.po.view',             true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('ceo',       'lens.po.cancel',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('ceo',       'lens.gr.create',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('ceo',       'lens.gr.add_manual_line',  true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('ceo',       'lens.inventory.adjust',    true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.po.create',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.po.view',             true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.po.cancel',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.gr.create',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.gr.add_manual_line',  true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('manager',   'lens.inventory.adjust',    true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('team_lead', 'lens.po.view',             true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('team_lead', 'lens.gr.create',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('viewer',    'lens.po.view',             true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('worker',    'lens.po.view',             true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'),
  ('worker',    'lens.gr.create',           true, '6ad0781b-37f0-47a9-92e3-be9ed1477e1c')
ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING;
```

### Post-apply verification (was run, pinned to live state)

```sql
SELECT 'perms' AS what, count(*) AS v FROM public.permissions WHERE id LIKE 'lens.%';
-- expected: 18 (6 foundation + 12 new) — actual: 18 PASS

SELECT 'role_perms' AS what, count(*) AS v FROM public.role_permissions WHERE permission_id LIKE 'lens.%' AND granted=true;
-- expected: 52 (18 foundation + 34 new) — actual: 52 PASS

SELECT 'new_perms_only', count(*) FROM public.permissions WHERE id IN ('lens.po.create','lens.po.view','lens.po.cancel','lens.gr.create','lens.gr.add_manual_line','lens.inventory.adjust');
-- expected: 12 — actual: 12 PASS

SELECT 'new_role_perms_only', count(*) FROM public.role_permissions WHERE permission_id IN ('lens.po.create','lens.po.view','lens.po.cancel','lens.gr.create','lens.gr.add_manual_line','lens.inventory.adjust') AND granted=true;
-- expected: 34 — actual: 34 PASS
```

### Triplet (c) — employee_roles wiring verification (deferred to TEST_REPORT.md §Phase C)

The third leg of the permission seed triplet — verifying the 3 demo + prizma CEO employees actually resolve to `ceo` role with all 6 new keys via `getEffectivePermissions()` SQL replay — runs as part of the TEST_REPORT.md Phase C smoke matrix (SC #23). The 3 employees pre-flight-pinned in SPEC §0.D:
- demo: `c009a03e-06e2-4a59-8e0d-bc75f5effa39` (legacy_role=admin → ceo via LEGACY_ROLE_MAP)
- demo: `bb1961f7-98ac-4ee6-adef-401e08bb9a7c` (legacy_role=admin → ceo via LEGACY_ROLE_MAP)
- prizma: `cbaf6ed8-0c18-4cf8-afbd-cd04155f7bac` (legacy_role=admin → ceo via LEGACY_ROLE_MAP)

If any of the 3 fails the SQL replay (resolves with < 6 NEW keys or wrong role_id) → STOP per SPEC §5 stop trigger.

---

*Per TD-2 precedent (M1A pattern) and SC #9 alignment: no `supabase/migrations/*.sql` file is created — `execute_sql` MCP is the single source of truth, logged here. Re-run safety: ON CONFLICT clauses on both tables.*
