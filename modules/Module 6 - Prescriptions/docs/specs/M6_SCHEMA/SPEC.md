# SPEC — M6_SCHEMA — Exams + Prescriptions (Glasses + Contacts) + Recall Axes — Phase A + B

> **Location:** `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-22 (overnight Full-Auto Pipeline chain, Half 2 of 2 — depends on M5_SCHEMA closed 🟢)
> **Module:** 6 — Prescriptions
> **Phase:** A + B combined per overnight Brief recommendation.
> **Predecessor SPEC:** `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/SPEC.md` — closed 🟢, M5 9/9 smoke PASS.

---

## 0. Pre-Authoring Reality Check

### Probe results (re-confirmed 2026-05-22 after M5 close)

All M6 target tables: **DO NOT EXIST** in live DB (re-verified via `to_regclass(...)` after M5 build).

| Table | to_regclass result | Action |
|---|---|---|
| `eye_exams` | NULL | CREATE |
| `prescriptions_glasses` | NULL | CREATE |
| `prescription_glasses_eyes` | NULL | CREATE |
| `prescriptions_contacts` | NULL | CREATE |
| `prescription_contacts_eyes` | NULL | CREATE |
| `prescription_types` | NULL | CREATE |
| `lens_manufacturers` | NULL | CREATE |
| `prescription_recall_axes` | NULL | CREATE |

Existing collisions noted (out of M6 scope):
- `public.prescriptions` (legacy 18-col flat stub, 0 rows) — NOT used by M6's split-table design. Stays untouched per Brief anti-creep. Documented in M5_SCHEMA FINDINGS F4 as future cleanup.
- `contact_lens_wearing_schedule` enum exists in DB with values {daily, weekly, monthly, yearly}. This is `replacement_period` semantics, NOT `wear_schedule`. To avoid relitigation and remove ambiguity, M6 creates two NEW enums with explicit names: `cl_replacement_period` + `cl_wear_schedule`. The legacy enum stays orphan (no consumers); FINDINGS F-M6-1 logs the deferred cleanup.

### Dependencies from M5 (all confirmed present)

| Resource | Status | M6 use |
|---|---|---|
| `customers.id` PK + `customer_number` | ✅ deployed | FK from `eye_exams.customer_id`, `prescriptions_glasses.customer_id`, `prescriptions_contacts.customer_id` |
| `tenants.tenant_code` | ✅ backfilled | Used by `v_customer_prescriptions_summary` for customer_number_display |
| `tenant_location` (M5 "branches" target) | ✅ deactivated_at added | FK target for exam_branch_id (not yet used at day-1; optional FK in eye_exams) |
| `tenant_number_counters` table | ✅ deployed | Re-used for `entity_kind='prescription'` allocation |
| `allocate_tenant_number(uuid, text)` RPC | ✅ deployed | Called from `commit_prescription` for atomic prescription_number allocation |
| `health_funds(id)` PK | ✅ deployed with 10 seed rows | FK from `prescriptions_glasses.health_fund_id` + `prescriptions_contacts.health_fund_id` |
| `employees(id)` (pre-existing) | ✅ in DB | FK target for `optometrist_id` |
| `activity_log` (pre-existing) | ✅ in DB | Audit trail destination (read-only from M6) |

### Cross-Reference Check (Step 1.5)

All new names introduced by this SPEC, grep-verified:

| New name | Status | Resolution |
|---|---|---|
| **Tables (8)** | 0 hits each | All new — proceed |
| **Enums (19)** — exam_status, exam_outcome, exam_type, prescription_status, prescription_source, prescription_exam_reason, prescription_treatment, prescription_refraction_method, glasses_lens_type, glasses_lens_material, prism_base, eye_side, cl_lens_type, cl_replacement_period, cl_wear_schedule, cl_material, cl_tint, recall_axis_kind, refraction_method | 0 hits each | All new |
| **Views (9)** — v_exam_for_customer, v_prescription_glasses_for_order, v_prescription_contacts_for_order, v_recall_due, v_exam_for_doctor, v_prescription_history_for_customer, **v_customer_prescriptions_summary**, v_prescription_full_for_editor, v_prescriptions_list_for_customer | 0 hits each | All new. v_customer_prescriptions_summary is the cross-contract surface M5 customer card tab-3 reads. |
| **RPCs (7)** — create_exam, create_prescription_draft, commit_prescription, cancel_draft_prescription, supersede_prescription, compute_recall_due_dates, clone_prescription | 0 hits each | All new |

**Cross-Reference Check completed 2026-05-22 against live Supabase + GLOBAL_SCHEMA: 0 hard collisions / 0 extensions to existing tables. M6 is purely additive.**

### Runtime semantics rehearsed (P-AUTHOR-2 enforcement)

All 7 M6 RPCs use the canonical Block A header from `JWT_VALIDATION_HEADER.sql` (same as M5's 5 RPCs + allocate_tenant_number helper).

| RPC | Anon caller | Authenticated wrong tenant | service_role |
|---|---|---|---|
| create_exam | Block A → 42501 | Block A → 42501 | bypass; INSERT row |
| create_prescription_draft | Block A → 42501 | Block A → 42501 | bypass; INSERT draft row |
| commit_prescription | Block A → 42501 | Block A → 42501 | bypass; allocate_tenant_number (which itself rechecks JWT) + UPDATE + compute_recall_due_dates |
| cancel_draft_prescription | Block A → 42501 | Block A → 42501 | bypass; DELETE draft (no counter touch because draft never got a number) |
| supersede_prescription | Block A → 42501 | Block A → 42501 | bypass; UPDATE old.status='superseded' |
| compute_recall_due_dates | Block A → 42501 | Block A → 42501 | bypass; INSERT into prescription_recall_axes |
| clone_prescription | Block A → 42501 | Block A → 42501 | bypass; SELECT source + INSERT new draft with copied values |

**Iron Rule 32 trace for `cancel_draft_prescription`:** the draft's `prescription_number` is NULL until commit; cancelling a draft = DELETE the row (and its child eyes rows via ON DELETE CASCADE), counter NOT touched. This is correct per the Brief — drafts don't consume numbers.

**Iron Rule 32 trace for `commit_prescription`:** allocates prescription_number atomically. If the SPEC ever exposes a `delete_last_unused_prescription`, it would follow the M5 `delete_last_unused_customer` pattern (FOR UPDATE + max-check + zero-FK + DELETE + counter decrement). NOT in this SPEC — out of scope. The current "rollback" for a committed-but-unused prescription is `supersede_prescription` (no number release; soft-history).

### Lessons applied from prior FOREMAN_REVIEWs + this overnight chain's M5

| Source | Lesson | Application |
|---|---|---|
| M5_SCHEMA (just closed in this chain) | "Re-use `tenant_number_counters` + `allocate_tenant_number` for any per-tenant sequential allocation." | M6 commit_prescription calls allocate_tenant_number with entity_kind='prescription'. |
| M5_SCHEMA FINDINGS F1 | "Per-column manifest in §0, not a column count." | M6's §3 success criteria list each table's expected column count + does NOT bind to a total. |
| M5_SCHEMA FINDINGS F7 | "Block A header inlined per function — intentional duplication." | All 7 M6 RPCs inline Block A; reference `JWT_VALIDATION_HEADER.sql` in the SPEC body. |
| `SECURITY_HOTFIX_2_2026_05_15` P-AUTHOR-1 | "Don't inline hand-rolled JWT checks." | Block A verbatim per function. |
| `M1B0_PURCHASE_ORDER_SCHEMA` | "Atomic sequential allocation pattern." | Reused via M5's allocate_tenant_number. |
| `MIGRATION_1_SUPPLIERS_DEBT` Author Proposal #1 | "## N. headings, no §." | This SPEC uses ## N. throughout. |
| Brief §13 | "Multi-axis recall — table-stored, one row per axis." | `prescription_recall_axes` table created. |
| Brief §5.7 | "v_recall_due aggregates 1 row per prescription, not 1 per axis." | View body uses `MIN(due_at)` + ORDER BY due_at to surface the soonest axis per prescription. |
| `feedback_dont_add_unrequested_features.md` | "Don't add beyond Brief." | No multi-prescription bulk-action, no AI-suggested values, no flow-from-vision-function. |
| Pattern 11 (Brief §4.3) | "Two-rows-for-symmetric-pair." | `prescription_glasses_eyes` + `prescription_contacts_eyes` use `(prescription_id, eye)` PK with `eye_side` enum. |
| Pattern 9 (Brief §4.1) | "State-machine = enum, transitions via RPC, audit fields." | All state-machines (exam_status, prescription_status) implemented as enums + `status_changed_at` + `status_changed_by` columns. |

---

## 1. Goal

Ship Phase A + B of Module 6 (Prescriptions / Eye Exams) — build 8 new tables (eye_exams, prescriptions_glasses + child eyes, prescriptions_contacts + child eyes, prescription_types, lens_manufacturers, prescription_recall_axes), 9 views (including the M5↔M6 cross-contract `v_customer_prescriptions_summary`), 7 RPCs with canonical JWT validation header + atomic `prescription_number` allocation via the existing M5 helper, pass ≥8/8 functional smoke + 5/5 cross-contract smoke on demo — so that M7 (Orders), M8 (Payments), M11 (Reports), M12 (Communications recall rules) can begin building against stable prescription contracts.

---

## 2. Background & Motivation

M6 is the medical module — holds eye_exams (the act) + prescriptions (the result, glasses + contacts). Source-of-truth for the recall engine; cross-module FK from M7 orders (orders.prescription_id → prescriptions_glasses/_contacts). M6 is independent from M5 to allow multi-vertical scaling (future M6-dental, M6-vet) — confirmed Decision #12 in Brief §8 v2.

This SPEC = Half 2 of the overnight chain. Half 1 (M5_SCHEMA) closed 🟢 with 9/9 smoke; M5 customer FK contract is stable. The cross-contract surfaces `v_customer_prescriptions_summary` + `create_prescription_draft` belong to M6 per Brief §3.4 — built here.

Out of scope: prescription editor UI (sidebar+center, Pattern 12 — Phase E), OpticPlus migration (Phase D), recall engine activation with full 3 variants (Phase C), and any cron-scheduled functions.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | On `develop`, clean | `git status --short` empty |
| 2 | SPEC folder files | 5 (SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION) | `ls` |
| 3 | 8 new tables created | eye_exams (≥18 cols), prescriptions_glasses (≥25 cols), prescription_glasses_eyes (≥20 cols), prescriptions_contacts (≥25 cols), prescription_contacts_eyes (≥20 cols), prescription_types (≥12 cols), lens_manufacturers (≥8 cols), prescription_recall_axes (≥7 cols). | `SELECT to_regclass(...)` × 8 → not NULL |
| 4 | 19 new enums | All in pg_type | `SELECT typname FROM pg_type ...` returns 19 |
| 5 | RLS + 2 policies per table | service_bypass + tenant_isolation | `pg_class.relrowsecurity=true` + `pg_policy` count = 2 per relation |
| 6 | FK indexes | customer_id, exam_id, type_id, eye_side (composite), prescription_id (on child eyes), home_fund | all FK columns indexed |
| 7 | UNIQUE constraints tenant-scoped | (prescription_number, tenant_id) WHERE not NULL; (code, tenant_id) on prescription_types and lens_manufacturers; (prescription_id, eye) on both eyes tables | 5 unique constraints |
| 8 | 9 views deployed | v_exam_for_customer, _for_doctor, v_prescription_glasses_for_order, _contacts_for_order, v_recall_due, v_prescription_history_for_customer, **v_customer_prescriptions_summary**, v_prescription_full_for_editor, v_prescriptions_list_for_customer | `SELECT viewname FROM pg_views WHERE viewname LIKE 'v_exam_%' OR viewname LIKE 'v_prescription_%' OR viewname = 'v_customer_prescriptions_summary' OR viewname = 'v_recall_due'` → 9 rows |
| 9 | 7 RPCs deployed | create_exam, create_prescription_draft, commit_prescription, cancel_draft_prescription, supersede_prescription, compute_recall_due_dates, clone_prescription | all SECURITY DEFINER + search_path + REVOKE anon + GRANT authenticated+service_role |
| 10 | Seed prescription_types | 16 rows (8 per tenant) | `SELECT count(*) FROM prescription_types` → 16 |
| 11 | Seed lens_manufacturers | 10 rows (5 per tenant) | `SELECT count(*) FROM lens_manufacturers` → 10 |
| 12 | M6 smoke 9/9 PASS | M6 functional smoke results in TEST_REPORT.md | all PASS |
| 13 | Cross-contract smoke 5/5 PASS | end-to-end create_customer → create_prescription_draft → commit_prescription → both views surface | TEST_REPORT.md §"cross-contract" all PASS |
| 14 | prescription_number allocation atomic | via allocate_tenant_number(p_tenant_id, 'prescription') | smoke S3 + S7 verify contiguous |
| 15 | Iron Rule 32 — cancel_draft_prescription does NOT consume a number | draft.prescription_number IS NULL before commit; after cancel, counter is unchanged | smoke S4 verifies |
| 16 | Advisors clean | 0 NEW HIGH/ERROR | get_advisors security probe diff vs pre-M6 baseline |
| 17 | No Prizma data writes | smoke on demo only | `SELECT count(*) FROM eye_exams WHERE tenant_id=prizma` = 0; same for all M6 tables |
| 18 | Iron Rule 31 — Integrity Gate | exit 0 or 2 | at commit time |
| 19 | Destructive Operations declared "None." | no DROP/TRUNCATE | gate passes |
| 20 | T-constants extended | 8 new keys in `js/shared.js` (EYE_EXAMS, PRESCRIPTIONS_GLASSES, PRESCRIPTION_GLASSES_EYES, PRESCRIPTIONS_CONTACTS, PRESCRIPTION_CONTACTS_EYES, PRESCRIPTION_TYPES, LENS_MANUFACTURERS, PRESCRIPTION_RECALL_AXES) | grep |
| 21 | MIGRATION.md Applied Log | ≥10 entries | cat |

### 3a. Functional smoke cases (M6 itself — 9 cases) — on demo, results in TEST_REPORT.md

| # | Case | Setup | Assertion |
|---|---|---|---|
| M-S1 | `create_exam` happy path | JWT=auth demo. Use customer #1 from M5 smoke (id=8fcc5610-...). Call create_exam(tenant_id, customer_id, exam_date=today, optometrist_id=NULL). | Returns exam_id; exam_status='scheduled'. |
| M-S2 | `create_prescription_draft` (M5↔M6 cross-contract) | JWT=auth demo. Call create_prescription_draft(tenant_id, customer_id, 'glasses'). | Returns prescription_id; row in prescriptions_glasses with status='draft', prescription_number IS NULL. |
| M-S3 | `commit_prescription` atomic | After M-S2, call commit_prescription(tenant_id, prescription_id, type_id=for_distance, eyes_data=jsonb([R-eye, L-eye])). | Returns (prescription_id, prescription_number=1). State='committed'. Child rows exist in prescription_glasses_eyes (2 rows, R+L). Counter last_value=1 for entity_kind='prescription'. |
| M-S4 | `cancel_draft_prescription` Iron Rule 32 | Create new draft via M-S2-like call. Call cancel_draft_prescription. | Draft row + child rows hard-deleted via CASCADE. Counter UNCHANGED (still 1 from M-S3). |
| M-S5 | `supersede_prescription` | Create + commit a second prescription (number=2). Call supersede_prescription(tenant_id, old=#1, new=#2). | Old #1.status='superseded'. New #2 still 'committed'. Counter unchanged. |
| M-S6 | `compute_recall_due_dates` | After M-S3 commit, query prescription_recall_axes for that prescription_id. | ≥4 rows (4 axes for glasses; 5 for contacts). All have due_at > now(); is_enabled=true. |
| M-S7 | `clone_prescription` | Call clone_prescription(tenant_id, source=#1). | Returns new prescription_id; status='draft'; child eyes rows copied (R+L values match source). prescription_number IS NULL (draft). |
| M-S8 | Cross-tenant guard | JWT=auth demo. Call create_exam with prizma tenant_id. | Raises 42501. |
| M-S9 | Anon reject on all 7 RPCs | JWT=anon. Call each RPC with valid-shape args. | All 7 raise 42501. |

### 3b. Cross-contract smoke (M5↔M6 bridge — 5 cases)

| # | Case | Setup | Assertion |
|---|---|---|---|
| X-S1 | M5 `create_customer` returns id + number | JWT=auth demo. Fresh customer. | (customer_id, customer_number) returned. |
| X-S2 | M6 `create_prescription_draft(customer_id, 'glasses')` | Using X-S1 customer. | Draft prescription_id returned. |
| X-S3 | M6 `commit_prescription` allocates number + fires recall | Using X-S2 prescription. | prescription_number returned ≥1. prescription_recall_axes has ≥4 rows for this prescription_id. |
| X-S4 | `v_customer_prescriptions_summary` filtered to customer shows the committed prescription | `SELECT * FROM v_customer_prescriptions_summary WHERE customer_id=X-S1` | ≥1 row, status='committed', type code matches, optometrist NULL. |
| X-S5 | `v_prescription_glasses_for_order` shows the committed prescription | `SELECT * FROM v_prescription_glasses_for_order WHERE id=X-S2_prescription_id` | 1 row with R-eye + L-eye joined values + type code 'for_distance' + status='committed'. |

---

## 4. Autonomy Envelope

Same as M5_SCHEMA §4 — extends to M6 paths. Specific allowances:
- Apply DDL via Supabase MCP `apply_migration`.
- Seed prescription_types (16) + lens_manufacturers (10) on demo + prizma.
- Functional smoke INSERTs on demo only (M6 RPCs only — no direct INSERT into prescriptions_*).
- Selective `git add` by filename — touches ONLY M6 paths + GLOBAL docs + js/shared.js. Pre-existing dirty files from chain start remain untouched.

Escalations same triggers as M5: any DROP, any Prizma row write, any smoke failure, any new HIGH/ERROR advisor.

---

## 5. Stop-on-Deviation Triggers (M6-specific)

- If `tenant_number_counters` table is missing (M5 didn't deploy) → STOP.
- If `allocate_tenant_number(uuid, text)` RPC is missing → STOP.
- If `customers.id` PK is gone → STOP.
- If smoke M-S3 (commit_prescription) does not insert exactly 2 child eyes rows (R + L) → STOP.
- If smoke M-S6 (recall axes) returns <4 rows for a glasses prescription → STOP.
- If `v_customer_prescriptions_summary` body references an M5 column that doesn't exist → STOP.

---

## 6. Rollback Plan

Idempotent migrations (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION/VIEW, DO blocks). Partial failures = re-run the failed step.

Hard rollback (if needed mid-run): `git reset --hard <chain-start-commit>` + identify which MCP migrations applied via MIGRATION.md log + write ROLLBACK SPEC if any are out of scope. Smoke INSERTs are explicit IDs — can be DELETEd by tenant scope.

Chain halts cleanly: M5 already at 🟢, so chain partial-close = M5 only. M6 reopen on next session.

---

## Destructive Operations

**None.**

All M6 DDL is CREATE-only (no DROP, no ALTER-DROP). All M6 DML is INSERT (seeds) + smoke INSERT/UPDATE/DELETE-by-id on demo only. The cascade DELETEs in `cancel_draft_prescription` and `clone_prescription`'s preparatory cleanup are tenant-scoped via FK + RLS, not table-wide.

---

## 7. Out of Scope (explicit)

- No UI — no prescription editor, no toggle bar, no sidebar.
- No OpticPlus migration of 6,248 exams / 251 CL prescriptions. Phase D.
- No `recall_rules` table — M12 owns it. M6 emits `v_recall_due` (fact).
- No pg_cron jobs.
- No FK constraint on `prescription_contacts_eyes.lens_catalog_id` — column added as nullable uuid; FK deferred to M1 lens-catalog integration SPEC.
- No legacy `prescriptions` table touch. 0 rows; out of scope.
- No `auto-commit on order-creation` trigger — M7 wires.
- No `delete_last_unused_prescription` RPC — not in Brief §3.2; the Iron Rule 32 path for prescriptions is cancel_draft (which doesn't consume a number, so no decrement needed).
- No "create from vision function" flow.
- No Prizma row writes — smoke on demo only.
- No merge to main.

---

## 8. Expected Final State

### New files

- `modules/Module 6 - Prescriptions/MODULE_6_ROADMAP.md` (already created at chain start)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/SPEC.md` (this file)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/EXECUTION_REPORT.md` (chain close)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/FINDINGS.md` (chain close)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/TEST_REPORT.md` (chain close)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/MIGRATION.md` (chain close)
- Module-level docs (SESSION_CONTEXT/MODULE_SPEC/MODULE_MAP/CHANGELOG/db-schema.sql) at chain close

### Modified files

- `js/shared.js` — 8 new T-constants (EYE_EXAMS, PRESCRIPTIONS_GLASSES, PRESCRIPTION_GLASSES_EYES, PRESCRIPTIONS_CONTACTS, PRESCRIPTION_CONTACTS_EYES, PRESCRIPTION_TYPES, LENS_MANUFACTURERS, PRESCRIPTION_RECALL_AXES).
- `docs/GLOBAL_MAP.md` — additive (at chain close).
- `docs/GLOBAL_SCHEMA.sql` — additive (at chain close).
- `docs/DB_TABLES_REFERENCE.md` — additive (at chain close).

### DB state

- 8 M6 tables exist with RLS + 2 policies each.
- 9 M6 views deployed.
- 7 M6 RPCs deployed.
- 19 M6 enums in pg_type.
- Seed: 16 prescription_types (8 per tenant) + 10 lens_manufacturers (5 per tenant).
- demo + prizma rows for M6 entities = 0 except seed configs.

---

## 9. DDL — Detailed Build Order

The executor follows this order. Each step = one MCP `apply_migration` call.

### Step 1 — Enums (19)

```sql
DO $$ BEGIN CREATE TYPE public.exam_status AS ENUM ('scheduled','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.exam_outcome AS ENUM ('prescribed_glasses','prescribed_contacts','prescribed_both','no_change','referred_to_doctor','customer_declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.exam_type AS ENUM ('final','old','subjective','objective'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prescription_status AS ENUM ('draft','committed','superseded','expired','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prescription_source AS ENUM ('internal_exam','vision_function','health_fund','external_optometrist','external_doctor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prescription_exam_reason AS ENUM ('routine','vision_complaint','new','post_op','myopia_control'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prescription_treatment AS ENUM ('none','myocare','atropine','ortho_k','blue_light','dry_eye_drops'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prescription_refraction_method AS ENUM ('phoropter','auto_refractor','wavefront'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.glasses_lens_type AS ENUM ('single_vision','progressive','bifocal','reading','computer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.glasses_lens_material AS ENUM ('plastic_1_50','plastic_1_60','plastic_1_67','plastic_1_74','polycarbonate'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prism_base AS ENUM ('UP','DN','IN','OUT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.eye_side AS ENUM ('R','L'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cl_lens_type AS ENUM ('daily_soft','weekly_soft','monthly_soft','quarterly_soft','yearly_soft','toric','multifocal','rgp','ortho_k'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cl_replacement_period AS ENUM ('daily','weekly','monthly','quarterly','yearly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cl_wear_schedule AS ENUM ('daily_remove_at_night','extended_wear'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cl_material AS ENUM ('silicone_hydrogel','hydrogel','rgp'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cl_tint AS ENUM ('clear','colored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recall_axis_kind AS ENUM ('next_exam','health_fund_validity','prescription_validity','fit_check','glasses_delivery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prescription_kind AS ENUM ('glasses','contacts'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

Migration name: `M6_01_enums`.

### Step 2 — `prescription_types` config + seed

```sql
CREATE TABLE IF NOT EXISTS public.prescription_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL,
  name_he text NOT NULL,
  name_en text,
  applies_to text NOT NULL CHECK (applies_to IN ('glasses','contacts','both')),
  triggers_recall boolean NOT NULL DEFAULT true,
  allows_order boolean NOT NULL DEFAULT true,
  is_health_fund_related boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (code, tenant_id)
);

ALTER TABLE public.prescription_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.prescription_types;
CREATE POLICY service_bypass ON public.prescription_types AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.prescription_types;
CREATE POLICY tenant_isolation ON public.prescription_types AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS prescription_types_tenant_id_idx ON public.prescription_types (tenant_id);

INSERT INTO public.prescription_types (tenant_id, code, name_he, name_en, applies_to, triggers_recall, allows_order, is_health_fund_related, sort_order) VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','for_distance','למרחק','For Distance','glasses',true,true,false,1),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','for_reading','לקריאה','For Reading','glasses',true,true,false,2),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','for_computer','למחשב','For Computer','glasses',true,true,false,3),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','progressive','פרוגרסיבי','Progressive','glasses',true,true,false,4),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','bifocal','ביפוקל','Bifocal','glasses',true,true,false,5),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','multifocal_cl','עדשות מגע מולטיפוקל','Multifocal Contacts','contacts',true,true,false,6),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','for_sunglasses','למשקפי שמש','For Sunglasses','glasses',true,true,false,7),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','health_fund','קופת חולים','Health Fund','both',false,true,true,8),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','for_distance','למרחק','For Distance','glasses',true,true,false,1),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','for_reading','לקריאה','For Reading','glasses',true,true,false,2),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','for_computer','למחשב','For Computer','glasses',true,true,false,3),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','progressive','פרוגרסיבי','Progressive','glasses',true,true,false,4),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','bifocal','ביפוקל','Bifocal','glasses',true,true,false,5),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','multifocal_cl','עדשות מגע מולטיפוקל','Multifocal Contacts','contacts',true,true,false,6),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','for_sunglasses','למשקפי שמש','For Sunglasses','glasses',true,true,false,7),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','health_fund','קופת חולים','Health Fund','both',false,true,true,8)
ON CONFLICT (code, tenant_id) DO NOTHING;
```

Migration name: `M6_02_prescription_types`.

### Step 3 — `lens_manufacturers` config + seed

```sql
CREATE TABLE IF NOT EXISTS public.lens_manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL,
  name text NOT NULL,
  country text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (code, tenant_id)
);

ALTER TABLE public.lens_manufacturers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lens_manufacturers;
CREATE POLICY service_bypass ON public.lens_manufacturers AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lens_manufacturers;
CREATE POLICY tenant_isolation ON public.lens_manufacturers AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lens_manufacturers_tenant_id_idx ON public.lens_manufacturers (tenant_id);

INSERT INTO public.lens_manufacturers (tenant_id, code, name, country, sort_order) VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','acuvue','Acuvue (J&J)','US',1),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','air_optix','Air Optix (Alcon)','CH',2),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','proclear','Proclear (CooperVision)','UK',3),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','biofinity','Biofinity (CooperVision)','UK',4),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','dailies','Dailies (Alcon)','CH',5),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','acuvue','Acuvue (J&J)','US',1),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','air_optix','Air Optix (Alcon)','CH',2),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','proclear','Proclear (CooperVision)','UK',3),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','biofinity','Biofinity (CooperVision)','UK',4),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','dailies','Dailies (Alcon)','CH',5)
ON CONFLICT (code, tenant_id) DO NOTHING;
```

Migration name: `M6_03_lens_manufacturers`.

### Step 4 — `eye_exams`

```sql
CREATE TABLE IF NOT EXISTS public.eye_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  exam_date date NOT NULL,
  optometrist_id uuid,
  exam_type public.exam_type,
  status public.exam_status NOT NULL DEFAULT 'scheduled',
  outcome public.exam_outcome,
  reason public.prescription_exam_reason,
  branch_id uuid REFERENCES public.tenant_location(id),
  notes_internal text,
  notes_for_customer text,
  status_changed_at timestamptz,
  status_changed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.eye_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.eye_exams;
CREATE POLICY service_bypass ON public.eye_exams AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.eye_exams;
CREATE POLICY tenant_isolation ON public.eye_exams AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS eye_exams_customer_id_idx ON public.eye_exams (customer_id);
CREATE INDEX IF NOT EXISTS eye_exams_tenant_id_idx ON public.eye_exams (tenant_id);
CREATE INDEX IF NOT EXISTS eye_exams_exam_date_idx ON public.eye_exams (exam_date);
CREATE INDEX IF NOT EXISTS eye_exams_status_idx ON public.eye_exams (status);
```

Migration name: `M6_04_eye_exams`.

### Step 5 — `prescriptions_glasses` + child eyes

```sql
CREATE TABLE IF NOT EXISTS public.prescriptions_glasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  exam_id uuid REFERENCES public.eye_exams(id),
  prescription_type_id uuid REFERENCES public.prescription_types(id),
  prescription_number integer,
  status public.prescription_status NOT NULL DEFAULT 'draft',
  source public.prescription_source,
  exam_reason public.prescription_exam_reason,
  treatment_selected public.prescription_treatment,
  optometrist_id uuid,
  refraction_method public.prescription_refraction_method,
  recommended_lens_type public.glasses_lens_type,
  recommended_lens_material public.glasses_lens_material,
  health_fund_id uuid REFERENCES public.health_funds(id),
  valid_from date,
  expires_at date,
  next_followup_at date,
  bcva_binocular text,
  instructions_for_customer text,
  notes_internal text,
  status_changed_at timestamptz,
  status_changed_by uuid,
  committed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.prescriptions_glasses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.prescriptions_glasses;
CREATE POLICY service_bypass ON public.prescriptions_glasses AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.prescriptions_glasses;
CREATE POLICY tenant_isolation ON public.prescriptions_glasses AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS prescriptions_glasses_customer_id_idx ON public.prescriptions_glasses (customer_id);
CREATE INDEX IF NOT EXISTS prescriptions_glasses_exam_id_idx ON public.prescriptions_glasses (exam_id);
CREATE INDEX IF NOT EXISTS prescriptions_glasses_status_idx ON public.prescriptions_glasses (status);
CREATE INDEX IF NOT EXISTS prescriptions_glasses_type_id_idx ON public.prescriptions_glasses (prescription_type_id);
CREATE INDEX IF NOT EXISTS prescriptions_glasses_tenant_id_idx ON public.prescriptions_glasses (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_glasses_number_uidx
  ON public.prescriptions_glasses (prescription_number, tenant_id) WHERE prescription_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.prescription_glasses_eyes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions_glasses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  eye public.eye_side NOT NULL,
  sphere numeric,
  cyl numeric,
  axis integer,
  add_power numeric,
  prism numeric,
  prism_base public.prism_base,
  va_with_correction text,
  va_without_correction text,
  va_pinhole text,
  pd_distance numeric,
  pd_near numeric,
  pupil_diameter_mm numeric,
  pupil_height_mm numeric,
  k1 numeric,
  k2 numeric,
  k_avg numeric,
  k_axis integer,
  axial_length_mm numeric,
  read_add numeric,
  bif_add numeric,
  mul_add numeric,
  int_add numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id, eye)
);
ALTER TABLE public.prescription_glasses_eyes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.prescription_glasses_eyes;
CREATE POLICY service_bypass ON public.prescription_glasses_eyes AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.prescription_glasses_eyes;
CREATE POLICY tenant_isolation ON public.prescription_glasses_eyes AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS prescription_glasses_eyes_prescription_id_idx ON public.prescription_glasses_eyes (prescription_id);
CREATE INDEX IF NOT EXISTS prescription_glasses_eyes_tenant_id_idx ON public.prescription_glasses_eyes (tenant_id);
```

Migration name: `M6_05_prescriptions_glasses`.

### Step 6 — `prescriptions_contacts` + child eyes

```sql
CREATE TABLE IF NOT EXISTS public.prescriptions_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  exam_id uuid REFERENCES public.eye_exams(id),
  prescription_type_id uuid REFERENCES public.prescription_types(id),
  prescription_number integer,
  status public.prescription_status NOT NULL DEFAULT 'draft',
  source public.prescription_source,
  exam_reason public.prescription_exam_reason,
  treatment_selected public.prescription_treatment,
  optometrist_id uuid,
  refraction_method public.prescription_refraction_method,
  cl_lens_type public.cl_lens_type,
  cl_replacement_period public.cl_replacement_period,
  cl_wear_schedule public.cl_wear_schedule,
  manufacturer_id uuid REFERENCES public.lens_manufacturers(id),
  model_name text,
  cl_material public.cl_material,
  water_content_pct numeric,
  dk_l_value numeric,
  cl_tint public.cl_tint,
  health_fund_id uuid REFERENCES public.health_funds(id),
  valid_from date,
  expires_at date,
  next_followup_at date,
  bcva_binocular text,
  instructions_for_customer text,
  notes_internal text,
  status_changed_at timestamptz,
  status_changed_by uuid,
  committed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.prescriptions_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.prescriptions_contacts;
CREATE POLICY service_bypass ON public.prescriptions_contacts AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.prescriptions_contacts;
CREATE POLICY tenant_isolation ON public.prescriptions_contacts AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS prescriptions_contacts_customer_id_idx ON public.prescriptions_contacts (customer_id);
CREATE INDEX IF NOT EXISTS prescriptions_contacts_exam_id_idx ON public.prescriptions_contacts (exam_id);
CREATE INDEX IF NOT EXISTS prescriptions_contacts_status_idx ON public.prescriptions_contacts (status);
CREATE INDEX IF NOT EXISTS prescriptions_contacts_type_id_idx ON public.prescriptions_contacts (prescription_type_id);
CREATE INDEX IF NOT EXISTS prescriptions_contacts_manufacturer_id_idx ON public.prescriptions_contacts (manufacturer_id);
CREATE INDEX IF NOT EXISTS prescriptions_contacts_tenant_id_idx ON public.prescriptions_contacts (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_contacts_number_uidx
  ON public.prescriptions_contacts (prescription_number, tenant_id) WHERE prescription_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.prescription_contacts_eyes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions_contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  eye public.eye_side NOT NULL,
  power numeric,
  cyl numeric,
  axis integer,
  add_power numeric,
  bc_mm numeric,
  dia_mm numeric,
  va_with_correction text,
  va_without_correction text,
  k1 numeric,
  k2 numeric,
  k_avg numeric,
  k_axis integer,
  over_refraction_power numeric,
  va_over_refraction text,
  lens_catalog_id uuid,  -- FK to M1 lens_catalog deferred to M1 integration SPEC
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id, eye)
);
ALTER TABLE public.prescription_contacts_eyes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.prescription_contacts_eyes;
CREATE POLICY service_bypass ON public.prescription_contacts_eyes AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.prescription_contacts_eyes;
CREATE POLICY tenant_isolation ON public.prescription_contacts_eyes AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS prescription_contacts_eyes_prescription_id_idx ON public.prescription_contacts_eyes (prescription_id);
CREATE INDEX IF NOT EXISTS prescription_contacts_eyes_tenant_id_idx ON public.prescription_contacts_eyes (tenant_id);
```

Migration name: `M6_06_prescriptions_contacts`.

### Step 7 — `prescription_recall_axes`

```sql
CREATE TABLE IF NOT EXISTS public.prescription_recall_axes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  prescription_id uuid NOT NULL,  -- can be either prescriptions_glasses or prescriptions_contacts
  prescription_kind public.prescription_kind NOT NULL,
  axis_kind public.recall_axis_kind NOT NULL,
  due_at date NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescription_recall_axes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.prescription_recall_axes;
CREATE POLICY service_bypass ON public.prescription_recall_axes AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.prescription_recall_axes;
CREATE POLICY tenant_isolation ON public.prescription_recall_axes AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS prescription_recall_axes_prescription_id_idx ON public.prescription_recall_axes (prescription_id);
CREATE INDEX IF NOT EXISTS prescription_recall_axes_due_at_idx ON public.prescription_recall_axes (due_at) WHERE is_enabled = true AND triggered_at IS NULL;
CREATE INDEX IF NOT EXISTS prescription_recall_axes_tenant_id_idx ON public.prescription_recall_axes (tenant_id);
```

Migration name: `M6_07_prescription_recall_axes`.

### Step 8 — 7 RPCs

Full bodies follow the M5 pattern: SECURITY DEFINER + Block A header + body. Each is in its own migration.

(Bodies in executor's apply_migration calls; the SPEC text covers the contract here, the executor expands inline.)

| RPC | Signature | Body summary |
|---|---|---|
| `create_exam` | `(p_tenant_id uuid, p_customer_id uuid, p_exam_date date, p_optometrist_id uuid DEFAULT NULL) → uuid` | Block A + tenant guard on customer + INSERT exam (status='scheduled') |
| `create_prescription_draft` | `(p_tenant_id uuid, p_customer_id uuid, p_kind text) → uuid` | Block A + tenant guard on customer + INSERT into prescriptions_glasses OR prescriptions_contacts based on p_kind, status='draft', prescription_number=NULL |
| `commit_prescription` | `(p_tenant_id uuid, p_prescription_id uuid, p_kind text, p_type_id uuid, p_eyes_data jsonb) → jsonb` | Block A + tenant guard + verify draft state + allocate_tenant_number('prescription') + UPDATE status='committed' + INSERT eyes rows + call compute_recall_due_dates |
| `cancel_draft_prescription` | `(p_tenant_id uuid, p_prescription_id uuid, p_kind text) → boolean` | Block A + verify draft state + DELETE row (cascade to eyes) + NO counter touch |
| `supersede_prescription` | `(p_tenant_id uuid, p_old_id uuid, p_new_id uuid, p_kind text) → void` | Block A + UPDATE old.status='superseded' |
| `compute_recall_due_dates` | `(p_tenant_id uuid, p_prescription_id uuid, p_kind text) → integer` | Block A + INSERT into prescription_recall_axes — 4 axes for glasses, 5 for contacts. Returns count inserted. |
| `clone_prescription` | `(p_tenant_id uuid, p_source_id uuid, p_kind text) → uuid` | Block A + SELECT source values + INSERT new draft with copied parent + child eyes rows |

Migration names: `M6_08_create_exam_rpc` ... `M6_08_clone_prescription_rpc` (7 separate migrations).

### Step 9 — 9 Views

```sql
-- v_exam_for_customer (M5 customer card tab-1 — read-only summary)
CREATE OR REPLACE VIEW public.v_exam_for_customer
  WITH (security_invoker = on)
AS
SELECT
  e.id, e.tenant_id, e.customer_id, e.exam_date, e.status, e.outcome, e.optometrist_id
FROM public.eye_exams e
WHERE e.is_deleted = false;

-- v_exam_for_doctor (UI optometrist — wider)
CREATE OR REPLACE VIEW public.v_exam_for_doctor
  WITH (security_invoker = on)
AS
SELECT
  e.id, e.tenant_id, e.customer_id, e.exam_date, e.status, e.outcome, e.optometrist_id,
  e.exam_type, e.reason, e.branch_id, e.notes_internal, e.notes_for_customer,
  e.status_changed_at, e.created_at, e.updated_at
FROM public.eye_exams e
WHERE e.is_deleted = false;

-- v_prescription_glasses_for_order (M7 — committed or external prescriptions only)
CREATE OR REPLACE VIEW public.v_prescription_glasses_for_order
  WITH (security_invoker = on)
AS
SELECT
  pg.id, pg.tenant_id, pg.customer_id, pg.prescription_number, pg.status,
  pg.prescription_type_id, pt.code AS type_code, pt.name_he AS type_name_he,
  pg.expires_at, pg.valid_from,
  pg.recommended_lens_type, pg.recommended_lens_material,
  pg.optometrist_id, pg.committed_at,
  -- R eye
  r.sphere AS r_sphere, r.cyl AS r_cyl, r.axis AS r_axis, r.add_power AS r_add,
  r.prism AS r_prism, r.prism_base AS r_prism_base, r.pd_distance AS r_pd, r.va_with_correction AS r_va,
  -- L eye
  l.sphere AS l_sphere, l.cyl AS l_cyl, l.axis AS l_axis, l.add_power AS l_add,
  l.prism AS l_prism, l.prism_base AS l_prism_base, l.pd_distance AS l_pd, l.va_with_correction AS l_va
FROM public.prescriptions_glasses pg
LEFT JOIN public.prescription_types pt ON pt.id = pg.prescription_type_id
LEFT JOIN public.prescription_glasses_eyes r ON r.prescription_id = pg.id AND r.eye = 'R'
LEFT JOIN public.prescription_glasses_eyes l ON l.prescription_id = pg.id AND l.eye = 'L'
WHERE pg.is_deleted = false AND pg.status = 'committed';

-- v_prescription_contacts_for_order
CREATE OR REPLACE VIEW public.v_prescription_contacts_for_order
  WITH (security_invoker = on)
AS
SELECT
  pc.id, pc.tenant_id, pc.customer_id, pc.prescription_number, pc.status,
  pc.prescription_type_id, pt.code AS type_code, pt.name_he AS type_name_he,
  pc.expires_at, pc.valid_from,
  pc.cl_lens_type, pc.cl_replacement_period, pc.cl_wear_schedule,
  pc.manufacturer_id, lm.name AS manufacturer_name, pc.model_name,
  pc.cl_material, pc.committed_at,
  r.power AS r_power, r.cyl AS r_cyl, r.axis AS r_axis, r.bc_mm AS r_bc, r.dia_mm AS r_dia,
  l.power AS l_power, l.cyl AS l_cyl, l.axis AS l_axis, l.bc_mm AS l_bc, l.dia_mm AS l_dia
FROM public.prescriptions_contacts pc
LEFT JOIN public.prescription_types pt ON pt.id = pc.prescription_type_id
LEFT JOIN public.lens_manufacturers lm ON lm.id = pc.manufacturer_id
LEFT JOIN public.prescription_contacts_eyes r ON r.prescription_id = pc.id AND r.eye = 'R'
LEFT JOIN public.prescription_contacts_eyes l ON l.prescription_id = pc.id AND l.eye = 'L'
WHERE pc.is_deleted = false AND pc.status = 'committed';

-- v_recall_due (M12 — 1 row per prescription, the soonest axis)
CREATE OR REPLACE VIEW public.v_recall_due
  WITH (security_invoker = on)
AS
WITH ranked AS (
  SELECT
    pra.tenant_id, pra.prescription_id, pra.prescription_kind, pra.axis_kind, pra.due_at,
    ROW_NUMBER() OVER (PARTITION BY pra.prescription_id ORDER BY pra.due_at ASC) AS rn
  FROM public.prescription_recall_axes pra
  WHERE pra.is_enabled = true AND pra.triggered_at IS NULL
)
SELECT
  r.tenant_id, r.prescription_id, r.prescription_kind, r.axis_kind, r.due_at,
  CASE r.prescription_kind
    WHEN 'glasses'  THEN (SELECT customer_id FROM public.prescriptions_glasses  WHERE id = r.prescription_id)
    WHEN 'contacts' THEN (SELECT customer_id FROM public.prescriptions_contacts WHERE id = r.prescription_id)
  END AS customer_id
FROM ranked r
WHERE r.rn = 1;

-- v_prescription_history_for_customer (M11 LTV by prescription type)
CREATE OR REPLACE VIEW public.v_prescription_history_for_customer
  WITH (security_invoker = on)
AS
SELECT
  pg.id, pg.tenant_id, pg.customer_id, 'glasses'::public.prescription_kind AS kind,
  pg.prescription_number, pg.status,
  pt.code AS type_code, pg.created_at, pg.committed_at
FROM public.prescriptions_glasses pg
LEFT JOIN public.prescription_types pt ON pt.id = pg.prescription_type_id
WHERE pg.is_deleted = false
UNION ALL
SELECT
  pc.id, pc.tenant_id, pc.customer_id, 'contacts'::public.prescription_kind,
  pc.prescription_number, pc.status,
  pt.code, pc.created_at, pc.committed_at
FROM public.prescriptions_contacts pc
LEFT JOIN public.prescription_types pt ON pt.id = pc.prescription_type_id
WHERE pc.is_deleted = false;

-- v_customer_prescriptions_summary (M5 customer card tab-3 — cross-contract, M6 owns)
CREATE OR REPLACE VIEW public.v_customer_prescriptions_summary
  WITH (security_invoker = on)
AS
SELECT
  pg.id, pg.tenant_id, pg.customer_id, 'glasses'::public.prescription_kind AS kind,
  pg.prescription_number, pg.status, pg.optometrist_id,
  pt.code AS type_code, pt.name_he AS type_name_he,
  pg.committed_at, pg.expires_at,
  -- R/L summary (compact display "SPH -2.50 / CYL -0.75 × 180")
  CONCAT(
    'R: ', COALESCE(r.sphere::text,'-'), ' / ', COALESCE(r.cyl::text,'-'), ' × ', COALESCE(r.axis::text,'-')
  ) AS r_summary,
  CONCAT(
    'L: ', COALESCE(l.sphere::text,'-'), ' / ', COALESCE(l.cyl::text,'-'), ' × ', COALESCE(l.axis::text,'-')
  ) AS l_summary,
  (SELECT count(*) FROM public.customer_notes cn WHERE cn.customer_id = pg.customer_id AND cn.is_deleted=false) AS notes_count
FROM public.prescriptions_glasses pg
LEFT JOIN public.prescription_types pt ON pt.id = pg.prescription_type_id
LEFT JOIN public.prescription_glasses_eyes r ON r.prescription_id = pg.id AND r.eye = 'R'
LEFT JOIN public.prescription_glasses_eyes l ON l.prescription_id = pg.id AND l.eye = 'L'
WHERE pg.is_deleted = false

UNION ALL

SELECT
  pc.id, pc.tenant_id, pc.customer_id, 'contacts'::public.prescription_kind,
  pc.prescription_number, pc.status, pc.optometrist_id,
  pt.code, pt.name_he,
  pc.committed_at, pc.expires_at,
  CONCAT(
    'R: POW ', COALESCE(r.power::text,'-'), ' / BC ', COALESCE(r.bc_mm::text,'-'), ' / DIA ', COALESCE(r.dia_mm::text,'-')
  ),
  CONCAT(
    'L: POW ', COALESCE(l.power::text,'-'), ' / BC ', COALESCE(l.bc_mm::text,'-'), ' / DIA ', COALESCE(l.dia_mm::text,'-')
  ),
  (SELECT count(*) FROM public.customer_notes cn WHERE cn.customer_id = pc.customer_id AND cn.is_deleted=false)
FROM public.prescriptions_contacts pc
LEFT JOIN public.prescription_types pt ON pt.id = pc.prescription_type_id
LEFT JOIN public.prescription_contacts_eyes r ON r.prescription_id = pc.id AND r.eye = 'R'
LEFT JOIN public.prescription_contacts_eyes l ON l.prescription_id = pc.id AND l.eye = 'L'
WHERE pc.is_deleted = false;

-- v_prescription_full_for_editor (M6 editor center)
CREATE OR REPLACE VIEW public.v_prescription_full_for_editor
  WITH (security_invoker = on)
AS
SELECT
  pg.*, 'glasses'::public.prescription_kind AS kind,
  pt.code AS type_code, pt.name_he AS type_name_he
FROM public.prescriptions_glasses pg
LEFT JOIN public.prescription_types pt ON pt.id = pg.prescription_type_id
WHERE pg.is_deleted = false;
-- Note: editor reads the parent + queries children separately for the per-eye grid.

-- v_prescriptions_list_for_customer (M6 editor sidebar)
CREATE OR REPLACE VIEW public.v_prescriptions_list_for_customer
  WITH (security_invoker = on)
AS
SELECT
  pg.id, pg.tenant_id, pg.customer_id, 'glasses'::public.prescription_kind AS kind,
  pg.prescription_number, pg.status, pg.created_at, pg.committed_at, pg.expires_at,
  pt.code AS type_code, pt.name_he AS type_name_he
FROM public.prescriptions_glasses pg
LEFT JOIN public.prescription_types pt ON pt.id = pg.prescription_type_id
WHERE pg.is_deleted = false
UNION ALL
SELECT
  pc.id, pc.tenant_id, pc.customer_id, 'contacts'::public.prescription_kind,
  pc.prescription_number, pc.status, pc.created_at, pc.committed_at, pc.expires_at,
  pt.code, pt.name_he
FROM public.prescriptions_contacts pc
LEFT JOIN public.prescription_types pt ON pt.id = pc.prescription_type_id
WHERE pc.is_deleted = false;
```

Migration name: `M6_09_views`.

---

## 10. Dependencies / Preconditions

- M5_SCHEMA closed 🟢 (verified before M6 starts).
- `allocate_tenant_number(uuid, text)` RPC available.
- `tenant_number_counters` table available.
- `customers.id`, `customers.customer_number`, `customers.is_deleted` columns available.
- `tenants.tenant_code` backfilled.
- `tenant_location` with `short_code` + at least one branch per tenant.
- `employees` table (for optometrist_id FK target — not enforced as FK in this SPEC; future M7 SPEC adds).
- `health_funds` table with seeds (10 rows).

---

## 11. Lessons Already Incorporated

See §0 "Lessons applied". Same enforcement of Block A, Cross-Reference Check, Runtime semantics rehearsal as M5_SCHEMA.

Additional lessons from M5_SCHEMA's just-completed FINDINGS:
- F1 → use per-table column-count criteria, not a project-wide total.
- F7 → inline Block A duplication intentional; do not abstract.
- F8 → RLS smoke via pg_policy + cross-tenant RPC guard, not direct SELECT (MCP runs as postgres superuser).

---

## 12. Pre-Merge Checklist

- [ ] All 21 §3 success criteria pass with actual values in EXECUTION_REPORT.md.
- [ ] Integrity Gate exit 0 or 2.
- [ ] Clean tree on M6 paths.
- [ ] HEAD pushed to origin/develop.
- [ ] 4 retro files in SPEC folder.
- [ ] Module ROADMAP / SESSION_CONTEXT / CHANGELOG / MODULE_MAP / MODULE_SPEC / db-schema.sql written.
- [ ] GLOBAL_MAP / GLOBAL_SCHEMA / DB_TABLES_REFERENCE merged.
- [ ] js/shared.js extended (8 new keys).
- [ ] Advisors clean (0 new HIGH/ERROR).
- [ ] No Prizma row writes during smoke.
- [ ] Cross-contract smoke 5/5 PASS.

---

*End of M6_SCHEMA SPEC. Half 2 of the overnight chain. After this closes 🟢, the chain proceeds to reviewer + foreman-review + module docs + global merge + Hebrew status line.*
