# SPEC — CRM_PHASE_A_SCHEMA_MIGRATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-20
> **Module:** 4 — CRM
> **Phase:** A (Schema Foundation)
> **Author signature:** Cowork strategic session, Daniel present

---

## 1. Goal

Create the complete CRM database schema in Supabase — 23 tables, 7 Views,
8 RPCs, 44 RLS policies, and all seed data — so that subsequent SPECs can
build import scripts and UI on top of a verified, production-ready schema.

---

## 2. Background & Motivation

SuperSale is Prizma's recurring branded sales event, currently managed via
Monday.com (8 boards) + Make.com (14+ scenarios) + WhatsApp/Email. Daniel
wants to replace Monday.com entirely with an internal CRM built on Supabase.

Over 4 sessions (April 19–20, 2026), all Monday boards and Make scenarios
were documented (`campaigns/supersale/`), and a final schema design was
produced and approved (`campaigns/supersale/CRM_SCHEMA_DESIGN.md` v3).
All 12 design decisions are closed. The schema passes the SaaS litmus test.

This SPEC executes Phase A: creating the DB objects only. No UI, no import,
no Make integration — those come in subsequent SPECs.

**Source of truth for schema:** `campaigns/supersale/CRM_SCHEMA_DESIGN.md`
(v3 final, 2026-04-20). Every table, column, View, RPC, and RLS policy in
this SPEC derives from that document. The executor should have it open as
a constant reference.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean after final commit | `git status` → "nothing to commit" |
| 2 | Total tables in public schema | 108 (was 85, +23 new `crm_*`) | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'` → 108 |
| 3 | Total views in public schema | 31 (was 24, +7 new `v_crm_*`) | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='VIEW'` → 31 |
| 4 | Total functions in public schema | 81 (was 73, +8 new CRM RPCs) | `SELECT count(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION'` → 81 |
| 5 | Total RLS policies | 237 (was 191, +46 new on 23 `crm_*` tables × 2) | `SELECT count(*) FROM pg_policies` → 237 |
| 6 | All 23 tables have RLS enabled | 23/23 | `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'crm_%' AND rowsecurity=true` → 23 |
| 7 | All RLS policies use canonical JWT pattern | 0 non-canonical | `SELECT count(*) FROM pg_policies WHERE tablename LIKE 'crm_%' AND qual::text NOT LIKE '%request.jwt.claims%' AND policyname != 'service_bypass'` → 0 |
| 8 | Seed data: crm_statuses rows | 31 rows (11 lead + 10 attendee + 10 event) | `SELECT count(*) FROM crm_statuses WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` → 31 |
| 9 | Seed data: crm_campaigns | 2 rows (supersale + multisale) | `SELECT count(*) FROM crm_campaigns WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` → 2 |
| 10 | Seed data: crm_field_visibility | 8 rows (UTM + revenue fields hidden from employees) | `SELECT count(*) FROM crm_field_visibility WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` → 8 |
| 11 | Seed data: crm_unit_economics | 1 row (SuperSale thresholds) | `SELECT count(*) FROM crm_unit_economics WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` → 1 |
| 12 | v_crm_event_stats is queryable | Returns 0 rows (no events yet) | `SELECT count(*) FROM v_crm_event_stats` → 0 |
| 13 | next_crm_event_number RPC works | Returns 1 for new campaign | Tested via RPC call (see §Step details) |
| 14 | Migration SQL file committed | 1 file in `campaigns/supersale/migrations/` | `ls campaigns/supersale/migrations/*.sql` → 1 file |
| 15 | Commits produced | 2 commits (migration + seed + docs) | `git log --oneline` shows 2 new commits |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Read `campaigns/supersale/CRM_SCHEMA_DESIGN.md` as the authoritative schema source
- Run read-only SQL (Level 1) to verify current DB state before migration
- Run DDL via Supabase MCP `apply_migration` — **this SPEC explicitly authorizes
  Level 3 (schema changes)** because the entire purpose is creating new tables.
  Authorization scope: CREATE TABLE, CREATE VIEW, CREATE FUNCTION, CREATE POLICY,
  ALTER TABLE (enable RLS), INSERT (seed data) — all limited to `crm_*` objects only
- Run DML via `execute_sql` for seed data inserts and verification queries
- Commit and push to `develop`
- Create the `campaigns/supersale/migrations/` folder
- Update `campaigns/supersale/TODO.md` to mark Step 1 complete

### What REQUIRES stopping and reporting

- ANY modification to existing (non-crm_*) tables, views, functions, or policies
- Any error from `apply_migration` that isn't a simple syntax fix
- Any RLS policy count mismatch after migration
- Any table missing `tenant_id` column (Iron Rule 14)
- Any RLS policy not using the canonical JWT-claim pattern (Iron Rule 15)
- Any UNIQUE constraint missing `tenant_id` (Iron Rule 18)
- Counts in §3 that don't match expected values after all steps complete
- Any merge to `main`

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `apply_migration` returns an error on any migration step → STOP, report
  the exact error. Do NOT attempt to fix schema errors autonomously — report
  the SQL and error message so the Foreman can decide.
- If after migration, `SELECT count(*) FROM pg_tables WHERE tablename LIKE 'crm_%'`
  returns anything other than 23 → STOP.
- If any View creation fails (usually due to missing table/column) → STOP.
  Views depend on tables; if a table is wrong the View error is a symptom.
- If any RPC creation fails → STOP and report. RPCs reference tables and may
  have subtle type mismatches.
- If seed INSERT fails due to FK violation → STOP. This means a table or
  reference is missing.

---

## 6. Rollback Plan

All objects are new (`crm_*` prefix). No existing objects are modified.
Rollback = drop everything in reverse order:

```sql
-- Views first (depend on tables)
DROP VIEW IF EXISTS v_crm_leads_with_tags CASCADE;
DROP VIEW IF EXISTS v_crm_lead_timeline CASCADE;
DROP VIEW IF EXISTS v_crm_event_attendees_full CASCADE;
DROP VIEW IF EXISTS v_crm_event_dashboard CASCADE;
DROP VIEW IF EXISTS v_crm_campaign_performance CASCADE;
DROP VIEW IF EXISTS v_crm_lead_event_history CASCADE;
DROP VIEW IF EXISTS v_crm_event_stats CASCADE;

-- Functions
DROP FUNCTION IF EXISTS next_crm_event_number CASCADE;
DROP FUNCTION IF EXISTS register_lead_to_event CASCADE;
DROP FUNCTION IF EXISTS check_in_attendee CASCADE;
DROP FUNCTION IF EXISTS record_purchase CASCADE;
DROP FUNCTION IF EXISTS import_leads_from_monday CASCADE;
DROP FUNCTION IF EXISTS export_leads_to_monday CASCADE;
DROP FUNCTION IF EXISTS get_visible_fields CASCADE;
DROP FUNCTION IF EXISTS verify_campaign_page_password CASCADE;

-- Tables (reverse dependency order)
DROP TABLE IF EXISTS crm_campaign_pages CASCADE;
DROP TABLE IF EXISTS crm_unit_economics CASCADE;
DROP TABLE IF EXISTS crm_ad_spend CASCADE;
DROP TABLE IF EXISTS crm_unsubscribes CASCADE;
DROP TABLE IF EXISTS crm_cx_surveys CASCADE;
DROP TABLE IF EXISTS crm_monday_column_map CASCADE;
DROP TABLE IF EXISTS crm_audit_log CASCADE;
DROP TABLE IF EXISTS crm_broadcasts CASCADE;
DROP TABLE IF EXISTS crm_message_log CASCADE;
DROP TABLE IF EXISTS crm_automation_rules CASCADE;
DROP TABLE IF EXISTS crm_message_templates CASCADE;
DROP TABLE IF EXISTS crm_field_visibility CASCADE;
DROP TABLE IF EXISTS crm_custom_field_vals CASCADE;
DROP TABLE IF EXISTS crm_custom_field_defs CASCADE;
DROP TABLE IF EXISTS crm_lead_tags CASCADE;
DROP TABLE IF EXISTS crm_tags CASCADE;
DROP TABLE IF EXISTS crm_statuses CASCADE;
DROP TABLE IF EXISTS crm_lead_notes CASCADE;
DROP TABLE IF EXISTS crm_event_attendees CASCADE;
DROP TABLE IF EXISTS crm_event_status_history CASCADE;
DROP TABLE IF EXISTS crm_leads CASCADE;
DROP TABLE IF EXISTS crm_events CASCADE;
DROP TABLE IF EXISTS crm_campaigns CASCADE;
```

No existing DB state is affected. Rollback is clean.

---

## 7. Out of Scope (explicit)

- **UI** — no HTML, JS, or CSS files. Schema only.
- **Import scripts** — no Monday data import. That's SPEC Phase B.
- **Make integration** — no webhooks, no scenario changes.
- **Message template extraction** — content from Make scenarios is Phase B.
- **Monday column mapping seed** — requires manual extraction, Phase B.
- **Module 4 docs structure** — no MODULE_SPEC.md, MODULE_MAP.md, ROADMAP.md
  yet. Those come when actual code (not just DB) is built.
- **`docs/GLOBAL_SCHEMA.sql` update** — per CLAUDE.md §10, GLOBAL_SCHEMA is
  updated at Integration Ceremony (module close), not mid-build. The CRM
  schema lives in `campaigns/supersale/CRM_SCHEMA_DESIGN.md` until then.
- **`docs/GLOBAL_MAP.md` update** — same rule, Integration Ceremony only.
- **Existing tables** — do NOT touch any non-`crm_*` objects.
- **Demo tenant seed** — Prizma only for now. Demo tenant seed comes with QA.

---

## 8. Expected Final State

### New DB objects (Supabase)

**23 tables** (all with `tenant_id NOT NULL`, RLS enabled, 2 policies each):

| # | Table | Key columns |
|---|-------|-------------|
| 1 | `crm_campaigns` | id, tenant_id, slug, name |
| 2 | `crm_events` | id, tenant_id, campaign_id, event_number, event_date, status |
| 3 | `crm_event_status_history` | id, tenant_id, event_id, status |
| 4 | `crm_leads` | id, tenant_id, full_name, phone, status |
| 5 | `crm_event_attendees` | id, tenant_id, lead_id, event_id, status |
| 6 | `crm_lead_notes` | id, tenant_id, lead_id |
| 7 | `crm_statuses` | id, tenant_id, entity_type, slug |
| 8 | `crm_tags` | id, tenant_id, name |
| 9 | `crm_lead_tags` | tenant_id, lead_id, tag_id (composite PK) |
| 10 | `crm_custom_field_defs` | id, tenant_id, entity_type, field_key |
| 11 | `crm_custom_field_vals` | id, tenant_id, field_def_id, entity_id |
| 12 | `crm_field_visibility` | id, tenant_id, role_id, field_key |
| 13 | `crm_message_templates` | id, tenant_id, slug, channel, language |
| 14 | `crm_automation_rules` | id, tenant_id, trigger_entity, action_type |
| 15 | `crm_message_log` | id, tenant_id, lead_id, channel |
| 16 | `crm_broadcasts` | id, tenant_id, employee_id, channel |
| 17 | `crm_audit_log` | id, tenant_id, entity_type, action |
| 18 | `crm_monday_column_map` | id, tenant_id, monday_board_id, monday_column_id |
| 19 | `crm_cx_surveys` | id, tenant_id, attendee_id |
| 20 | `crm_unsubscribes` | id, tenant_id, lead_id, channel |
| 21 | `crm_ad_spend` | id, tenant_id, campaign_id, ad_campaign_name |
| 22 | `crm_unit_economics` | id, tenant_id, campaign_id |
| 23 | `crm_campaign_pages` | id, tenant_id, slug, password_hash |

**7 Views:**
v_crm_event_stats, v_crm_lead_event_history, v_crm_campaign_performance,
v_crm_event_dashboard, v_crm_event_attendees_full, v_crm_lead_timeline,
v_crm_leads_with_tags

**8 RPCs:**
next_crm_event_number, register_lead_to_event, check_in_attendee,
record_purchase, import_leads_from_monday, export_leads_to_monday,
get_visible_fields, verify_campaign_page_password

**44 RLS policies** (2 per table × 22 tables, + 2 for crm_lead_tags = 46...
correction: crm_lead_tags is one of the 23 tables, so 23 × 2 = 46 policies).

> **Count correction:** 23 tables × 2 policies = **46** RLS policies, not 44.
> The CRM_SCHEMA_DESIGN.md said "22 טבלאות × 2 = 44" but it listed 23 tables
> in §10. The correct count is 46. Update §3 criterion #5 accordingly:
> Total RLS policies expected = 191 + 46 = **237**.

### New files (repo)

- `campaigns/supersale/migrations/001_crm_schema.sql` — the full migration
  (tables + RLS + Views + RPCs + seed data, in that order)

### Modified files

- `campaigns/supersale/TODO.md` — mark Step 1 items as complete

### Docs updated

- `campaigns/supersale/TODO.md` only. No MASTER_ROADMAP, GLOBAL_MAP, or
  GLOBAL_SCHEMA updates (see §7 Out of Scope).

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add CRM schema migration SQL (23 tables, 7 views, 8 RPCs)`
  Files: `campaigns/supersale/migrations/001_crm_schema.sql`

- **Commit 2:** `docs(crm): update TODO after Phase A schema migration`
  Files: `campaigns/supersale/TODO.md`,
  `modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/EXECUTION_REPORT.md`,
  `modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/FINDINGS.md`

---

## 10. Dependencies / Preconditions

- Supabase MCP must be connected (project ID: `tsxrrxzmdxaenlvocyit`)
- Branch must be `develop`
- `campaigns/supersale/CRM_SCHEMA_DESIGN.md` must exist (the schema source)
- Prizma tenant UUID: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
- The `employees` table must exist (FK target for `employee_id` columns) —
  **verify before running migration:** `SELECT count(*) FROM employees` should
  return > 0
- The `tenants` table must exist (FK target for `tenant_id` columns) —
  **verify:** `SELECT count(*) FROM tenants WHERE id = '7a061cb5-...'` → 1
- The `roles` table must exist (FK target for `crm_field_visibility.role_id`) —
  **verify:** `SELECT id FROM roles LIMIT 5` to confirm table and get role IDs
  for seed data

---

## 11. Lessons Already Incorporated

- **No prior CRM SPECs exist** — this is the first SPEC for Module 4.
- FROM `MASTER_ROADMAP.md` §5 Known Debt → RLS-1 lesson: all RLS policies in
  this SPEC use the canonical JWT-claim pattern from day one. No legacy
  patterns.
- FROM `CRM_SCHEMA_DESIGN.md` §9 → RLS pattern is explicitly specified with
  the exact USING clause. Executor copies verbatim.
- FROM `feedback_migration_lessons.md` (auto-memory) → "Update consumers
  BEFORE data, no Hebrew in Storage paths" — no consumers to update (new
  schema), no Storage paths involved. Not applicable but noted.
- **Cross-Reference Check completed 2026-04-20 against GLOBAL_SCHEMA and
  full codebase:** `grep -rn "crm_"` returned 0 hits outside
  `campaigns/supersale/CRM_SCHEMA_DESIGN.md`. Zero collisions with existing
  objects. All `crm_*` names are genuinely new.

---

## 12. Execution Notes for the Executor

### Migration structure

Build the SQL file in this order (dependency-safe):

1. **Tables** — in dependency order:
   - `crm_campaigns` (no FK except tenants)
   - `crm_statuses` (no FK except tenants)
   - `crm_tags` (no FK except tenants)
   - `crm_events` (FK → crm_campaigns)
   - `crm_leads` (no FK except tenants)
   - `crm_event_status_history` (FK → crm_events)
   - `crm_event_attendees` (FK → crm_leads, crm_events)
   - `crm_lead_notes` (FK → crm_leads, crm_events)
   - `crm_lead_tags` (FK → crm_leads, crm_tags)
   - `crm_custom_field_defs` (no FK except tenants)
   - `crm_custom_field_vals` (FK → crm_custom_field_defs)
   - `crm_field_visibility` (no FK except tenants — role_id is text, not FK)
   - `crm_message_templates` (no FK except tenants)
   - `crm_automation_rules` (no FK except tenants)
   - `crm_message_log` (FK → crm_leads, crm_events, crm_message_templates, crm_broadcasts)
   - `crm_broadcasts` (no FK except tenants + employees)
   - `crm_audit_log` (no FK except tenants + employees)
   - `crm_monday_column_map` (no FK except tenants)
   - `crm_cx_surveys` (FK → crm_event_attendees)
   - `crm_unsubscribes` (FK → crm_leads)
   - `crm_ad_spend` (FK → crm_campaigns)
   - `crm_unit_economics` (FK → crm_campaigns)
   - `crm_campaign_pages` (no FK except tenants)

   > **Note on FK for crm_message_log:** it references crm_broadcasts, so
   > crm_broadcasts must be created BEFORE crm_message_log.

2. **Enable RLS** — `ALTER TABLE crm_* ENABLE ROW LEVEL SECURITY` for all 23

3. **RLS policies** — 2 per table (service_bypass + tenant_isolation),
   using the canonical JWT-claim USING clause from CLAUDE.md §4 Rule 15

4. **Views** — in dependency order:
   - v_crm_event_stats (depends on crm_events + crm_event_attendees)
   - v_crm_lead_event_history (depends on crm_leads + crm_event_attendees + crm_events)
   - v_crm_event_dashboard (depends on crm_events + crm_campaigns + v_crm_event_stats)
   - v_crm_event_attendees_full (depends on crm_event_attendees + crm_leads + crm_events + crm_statuses)
   - v_crm_lead_timeline (depends on crm_lead_notes + crm_audit_log + crm_message_log)
   - v_crm_leads_with_tags (depends on crm_leads + crm_lead_tags + crm_tags)
   - v_crm_campaign_performance (depends on crm_ad_spend + crm_leads + crm_event_attendees + crm_campaigns + crm_unit_economics)

5. **RPCs** — all 8 functions. Use `SECURITY DEFINER` + `SET search_path = public`
   for RPCs that need to bypass RLS (like next_crm_event_number). Use
   `SECURITY INVOKER` for read-only RPCs that should respect tenant isolation.

6. **Seed data** — Prizma tenant only (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`):
   - crm_campaigns: 2 rows (supersale, multisale)
   - crm_statuses: 31 rows (11 lead + 10 attendee + 10 event)
   - crm_field_visibility: 8 rows (UTM fields hidden from employees)
   - crm_unit_economics: 1 row (SuperSale thresholds: 0.20 margin, 4 kill, 6 scaling)
   - crm_tags: 2 rows (SuperSale, MultiSale — category='campaign')

### Verification sequence

After migration completes, run these queries in order and compare to §3:

```sql
-- Criterion 2: tables
SELECT count(*) FROM information_schema.tables 
WHERE table_schema='public' AND table_type='BASE TABLE';

-- Criterion 3: views
SELECT count(*) FROM information_schema.tables 
WHERE table_schema='public' AND table_type='VIEW';

-- Criterion 4: functions
SELECT count(*) FROM information_schema.routines 
WHERE routine_schema='public' AND routine_type='FUNCTION';

-- Criterion 5: RLS policies
SELECT count(*) FROM pg_policies;

-- Criterion 6: all CRM tables have RLS
SELECT count(*) FROM pg_tables 
WHERE schemaname='public' AND tablename LIKE 'crm_%' AND rowsecurity=true;

-- Criterion 7: canonical RLS pattern
SELECT policyname, tablename, qual::text FROM pg_policies 
WHERE tablename LIKE 'crm_%' AND policyname != 'service_bypass'
AND qual::text NOT LIKE '%request.jwt.claims%';

-- Criterion 8-11: seed data counts
SELECT count(*) FROM crm_statuses WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
SELECT count(*) FROM crm_campaigns WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
SELECT count(*) FROM crm_field_visibility WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
SELECT count(*) FROM crm_unit_economics WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Criterion 12: views are queryable
SELECT count(*) FROM v_crm_event_stats;

-- Criterion 13: RPC works
SELECT next_crm_event_number(
  '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid,
  (SELECT id FROM crm_campaigns WHERE slug='supersale' AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c')
);
```

### FK considerations

- `crm_field_visibility.role_id` is `text NOT NULL` — matches existing
  `roles.id` type. Verify with `SELECT data_type FROM information_schema.columns
  WHERE table_name='roles' AND column_name='id'` before creating the FK.
  If `roles.id` is UUID, change `role_id` type to UUID. If it's text, keep as text.
  **If roles table doesn't use simple IDs** (e.g., uses composite keys), drop
  the FK and keep role_id as a soft reference. STOP and report if unclear.

- `employee_id` FK columns (in crm_audit_log, crm_broadcasts, crm_lead_notes,
  crm_event_status_history, crm_lead_tags) — verify `employees.id` type and
  that the table exists before adding FKs.

- **All FK columns that reference employees or roles should be nullable**
  (NULL = system action, not employee action). The schema design already
  specifies this — just confirming.
