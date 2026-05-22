# SPEC — M5_SCHEMA — Customers + Households + Configs (Phase A + B combined)

> **Location:** `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-22 (overnight Full-Auto Pipeline chain, Half 1 of 2)
> **Module:** 5 — Customers
> **Phase:** A + B (Schema + RLS + Views + RPCs + dedup + Iron Rule 32) — combined in one SPEC per the overnight Brief §9 Q1 recommendation.
> **Author signature:** opticup-strategic session 2026-05-22T<chain-start>
> **Companion SPEC (Half 2):** `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/SPEC.md` (authored after M5 smoke passes; M6 owns `v_customer_prescriptions_summary` + `create_prescription_draft` cross-contract).

---

## 0. Pre-Authoring Reality Check

### Probe results (pinned 2026-05-22 against live Supabase project `tsxrrxzmdxaenlvocyit`)

**MAJOR deviation from Brief §6 premise** — Brief assumed all M5 tables don't yet exist. Probe showed: `customers` EXISTS as a legacy stub. SPEC is written against repo reality (extend the stub), not against the Brief's literal phrasing. The Brief's intent (full M5 schema available with canonical RLS + composite customer_number + lifecycle_stage + dedup) is honored.

#### Existing tables to EXTEND (not create)

| Table | Row count (demo / prizma) | Existing columns | RLS state | Action |
|---|---|---|---|---|
| `customers` | 0 / 0 | id, full_name, id_number, phone, email, address, city, birth_date, health_fund (text), member_number, notes, branch_id, created_by, created_at, updated_at, tenant_id (16 cols total) | ✅ canonical 2-policy already present (service_bypass + tenant_isolation JWT-claim) | **ALTER TABLE** — rename `branch_id`→`home_branch_id`, add ~24 new columns, keep legacy `health_fund` text alongside new `health_fund_id` FK (M5_MIGRATION will dual-write then drop legacy). |
| `tenant_location` | 2 / 1 | id, tenant_id, name, address, short_code, is_active, is_default, is_deleted, notes, created_at, updated_at | ✅ canonical 2-policy (verified) | **ALTER TABLE** — add `deactivated_at timestamptz NULL`. `short_code` already serves as the M5 "branch_code". |
| `tenants` | 1 prizma + 1 demo | (44 cols including slug, name, status, etc.) | (existing policy) | **ALTER TABLE** — add `tenant_code text` (Brief §9 Q3). Backfill: prizma='01', demo='02'. UNIQUE NOT NULL. |

#### Existing stubs to LEAVE UNTOUCHED (anti-creep)

| Table | Row count | Reason untouched |
|---|---|---|
| `prescriptions` (legacy stub, 18 flat cols including od_sph/cyl/axis/add/pd + os_*) | 0 | Pre-M6 legacy. M6 builds NEW `prescriptions_glasses` (different name) + `prescription_glasses_eyes` (Pattern 11). Brief §3 Out-of-Scope: "no crm_leads decommission" extends in spirit to other 0-row legacy stubs. M6_SCHEMA SPEC documents the legacy stub as a future cleanup. |
| `work_orders` (legacy stub, 21 cols) | 0 | Pre-M7. Out of scope. Has FK `customer_id → customers.id` — `customers` extension preserves this FK identity. |
| `crm_leads` | 1376 total (1348 prizma + 28 demo) | LIVE — M4 is running on it. Brief §3 explicit: "crm_leads stays live, untouched." No `customer_id` FK on crm_leads today; the migration that links them comes later in M5_MIGRATION SPEC. |
| `tenant_branches` (storefront-public) | (storefront-side) | Different concern — storefront-facing public branch profiles. Not the ERP branches model. |

#### New tables to CREATE

`households`, `health_funds`, `tenant_languages`, `customer_notes`, `customer_documents`, `tenant_settings`, `tenant_number_counters`.

#### Foreign-key graph (current incoming FKs to `customers`)

- `prescriptions.customer_id → customers.id` (legacy stub FK, preserved).
- `work_orders.customer_id → customers.id` (legacy stub FK, preserved).
- Renaming `branch_id`→`home_branch_id` does NOT break any incoming FKs (it changes a *column* on `customers`, not the PK).

#### Existing canonical RPC pattern (mirror for new RPCs)

`next_box_number(p_tenant_id uuid)` — `LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`, JWT-claim check via `nullif(...)::uuid` + `v_jwt_tenant <> p_tenant_id` raise 42501, then `nextval('seq_box_number')` + `LPAD(...)`. Two notes about this pattern:
  1. It is the **pre-canonical** variant — does NOT include the service_role bypass clause from `JWT_VALIDATION_HEADER.sql` Block A. Our new RPCs use the canonical Block A header (3-role-aware with `IS DISTINCT FROM 'service_role'` bypass) — see §10 Lessons Already Incorporated.
  2. Sequential allocation uses a single Postgres SEQUENCE which is shared across all tenants. For Optic Up's tenant-scoped composite customer_number (Brief §12), we use a different mechanism: a `tenant_number_counters` table with `FOR UPDATE` row lock per (tenant_id, entity_kind). Documented in §3 DDL §3 below.

#### Other existing state

- Only one custom enum in DB: `contact_lens_wearing_schedule {daily, weekly, monthly, yearly}`. All M5 enums proposed below have unique names — no collision.
- `activity_log` exists (Brief §4.3 audit pattern target).
- `employees` + `employee_roles` exist — used for `created_by` / `updated_by` FK references.
- No `tenant_settings` table yet — created here.

### Decisions taken from probe-driven divergence

| # | Decision | Rationale |
|---|---|---|
| D1 | Extend `customers` via ALTER TABLE ADD COLUMN (24 new) + rename `branch_id`→`home_branch_id`. Do NOT DROP. | 0 rows everywhere = no rewrite cost; canonical RLS already present; preserves incoming FK identity from prescriptions/work_orders legacy stubs. Iron Rule 32 §Destructive Operations forbids DROP without declaration; this SPEC declares None. |
| D2 | M5 "branches" target = `tenant_location` (Brief said "branches", actual table is tenant_location). Add `deactivated_at`. | tenant_location already has `short_code`, `is_active`, `is_default`, `is_deleted`. Only `deactivated_at` is missing. Treating tenant_location as branches avoids creating a duplicate table (Rule 21). |
| D3 | `tenant_code` source for composite customer_number = new ADD COLUMN on tenants. Backfill prizma='01', demo='02'. | tenants has no tenant_code column. Brief §9 Q3 explicitly recommended this path. 2-char text, NOT NULL after backfill, UNIQUE per project (a project-wide UNIQUE on tenant_code is safe — single-project SaaS). |
| D4 | Sequential customer_number per-tenant via `tenant_number_counters` table + `SELECT ... FOR UPDATE`. NOT a Postgres SEQUENCE. | Postgres sequences are not tenant-scoped. A single sequence would allocate non-contiguous numbers per tenant (gaps when other tenant calls). The counters table gives true per-tenant contiguous sequence with Iron Rule 11 atomicity. |
| D5 | Keep legacy `customers.health_fund text` column intact (deprecated-pending-migration). Add new `health_fund_id uuid FK`. M5_MIGRATION dual-writes then drops the legacy column. | Dropping the column now would be destructive (Iron Rule 32 declared None). Adding a new FK column is additive. Today's 0 rows = nothing to migrate; tomorrow's migration SPEC handles the column drop with explicit declaration. |
| D6 | Add `first_name` + `last_name` nullable columns (Brief §2.1: OpticPlus has `fname`/`pname` split). Keep existing `full_name NOT NULL`. Add a populated-by-trigger so updates to first_name/last_name re-derive full_name. | Brief intent honored without destructive-rename of `full_name`. Migration SPEC will populate the split fields from OpticPlus. Today's create_customer accepts EITHER full_name OR (first_name, last_name) — see §3 DDL RPC notes. |
| D7 | `v_customer_for_order` is built but does NOT join orders (M7 doesn't exist). It exposes only customer-side fields the future M7 will need: id, customer_number_display (computed), full_name, address, phone, email, id_number, household_id, language_code, lifecycle_stage. Joins will be added in the M7 SPEC. | SPECs build their own surface; consumers build the joins they need. M7 will replace this view's body when it ships. |
| D8 | `v_customer_prescriptions_summary` deferred to Half 2 (M6_SCHEMA owns it per Brief §3.4). `v_customer_queue_position` deferred indefinitely (M14 not built). | Cross-contract ownership respected. The M5 customer-card UI SPEC (Phase D) will surface these views from their authoritative owners. |

### Lessons applied from prior FOREMAN_REVIEWs

This is M5's first SPEC — no prior M5 FOREMAN_REVIEWs to harvest. Applied from cross-module recent SPECs:

| Source | Lesson | How applied |
|---|---|---|
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-1 | "Reference `JWT_VALIDATION_HEADER.sql` for SECURITY DEFINER RPCs — do not inline." | All 5 M5 RPCs use Block A verbatim. §3 DDL §3 cites the file. |
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-2 | "Runtime semantics rehearsal — anon caller, service_role caller, wrong tenant_id caller." | §0 sub-section "Runtime semantics rehearsed" below. |
| `M1B0_PURCHASE_ORDER_SCHEMA` (Iron Rule 11 atomic allocation pattern) | "FOR UPDATE row lock inside an atomic RPC; sequence advance + RETURNING in one statement." | `tenant_number_counters` design (§3 DDL #3). |
| `M1A_OPERATIONS_RPCS_FIX` | "SECURITY DEFINER + search_path + REVOKE/GRANT pattern." | §3 DDL RPC blocks. |
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 | "Heading convention: `## N. Title`, never `§N.` (Iron Rule 32 regex enforcement)." | This SPEC uses `## N.` throughout. |
| Brief §6 Pre-Flight + activation-prompt §0 | "Probe biggest production tenant, not just demo." | Probes ran against tenant-agnostic schema queries (returned project-wide data); functional smoke writes ONLY on demo (Brief §3 Out-of-scope). |
| `feedback_dont_add_unrequested_features.md` (auto-memory) | "Don't add features beyond what the SPEC asks." | Out-of-scope list (§7) is the longest section of this SPEC; nothing beyond Brief §2 in scope. |

### Cross-Reference Check (Step 1.5 — Rule 21 enforcement)

All new names introduced by this SPEC, grep-verified against `docs/GLOBAL_SCHEMA.sql` + `docs/GLOBAL_MAP.md` + `docs/DB_TABLES_REFERENCE.md` + module db-schemas + live Supabase `pg_class` / `pg_proc` / `pg_type`. Findings:

| New name | Grep result | Resolution |
|---|---|---|
| **Tables** | | |
| `households` | 0 hits | New — proceed. |
| `health_funds` | 0 hits | New — proceed. |
| `tenant_languages` | 0 hits | New — proceed. |
| `customer_notes` | 0 hits | New — proceed. |
| `customer_documents` | 0 hits | New — proceed. |
| `tenant_settings` | 0 hits | New — proceed. |
| `tenant_number_counters` | 0 hits | New — proceed. |
| **Enums** | | |
| `customer_lifecycle_stage` | 0 hits | New — proceed. |
| `household_status` | 0 hits | New — proceed. |
| `customer_note_type` | 0 hits | New — proceed. |
| `customer_document_category` | 0 hits | New — proceed. |
| **Views** | | |
| `v_customer_for_exam`, `v_customer_for_order`, `v_customer_for_payment`, `v_customer_full`, `v_customer_for_messaging`, `v_customer_for_loyalty`, `v_customer_for_appointment` | 0 hits each | New — proceed. |
| **RPCs** | | |
| `create_customer`, `merge_customers`, `assign_to_household`, `delete_last_unused_customer`, `update_customer_display_preferences` | 0 hits each | New — proceed. |
| `compute_lifecycle_stage_on_order`, `compute_lifecycle_dormant_sweep` (trigger functions) | 0 hits | New — proceed. |
| `allocate_tenant_number(p_tenant_id, p_entity_kind)` helper | 0 hits | New — proceed. |
| **Existing names extended** | | |
| `customers` table | EXISTS in live DB (probe). NOT in `docs/GLOBAL_SCHEMA.sql` (legacy pre-Authority-Matrix table). | EXTEND, document mapping. Add to GLOBAL_SCHEMA at Integration Ceremony. |
| `tenant_location` table | EXISTS in live DB + GLOBAL_MAP. | EXTEND (add deactivated_at). Document branch_code = short_code mapping. |
| `tenants.tenant_code` column | EXISTS in live DB tenants (44 cols), but `tenant_code` NOT among them. | ADD COLUMN — new. Backfill explicitly. |

**Cross-Reference Check completed 2026-05-22 against live Supabase + GLOBAL_SCHEMA rev pre-M5: 0 hard collisions / 3 expected extensions to existing tables (customers, tenant_location, tenants).**

### Runtime semantics rehearsed (P-AUTHOR-2 enforcement)

Before sealing this SPEC, ran the mental trace for each SECURITY DEFINER RPC under three caller scenarios:

| RPC | Anon caller (no JWT) | Authenticated, wrong tenant_id | service_role caller |
|---|---|---|---|
| `create_customer(p_tenant_id, ...)` | Block A: `v_jwt_role IS DISTINCT FROM 'service_role'` is TRUE (role NULL or 'anon'); inner check: `v_jwt_tenant` is NULL → raise 42501. ✅ | Block A: same outer; inner check: `v_jwt_tenant <> p_tenant_id` → raise 42501. ✅ | Block A: outer FALSE (role='service_role') → bypass to body. ✅ |
| `merge_customers(p_tenant_id, ...)` | Same Block A → 42501. | Same Block A → 42501. | Body executes; tenant_id pinned by p_tenant_id parameter; defense-in-depth on the UPDATE statements filters by tenant_id explicitly. |
| `delete_last_unused_customer(p_tenant_id, ...)` | Same Block A → 42501. | Same Block A → 42501. | Body executes; the `FOR UPDATE` lock + max-check + zero-FK check + DELETE all happen in one transaction. |
| `assign_to_household(p_tenant_id, ...)` | Same. | Same. | Body executes; defense-in-depth checks household.tenant_id = p_tenant_id before UPDATE. |
| `update_customer_display_preferences(p_tenant_id, p_prefs)` | Same. | Same. | Body executes; INSERT ... ON CONFLICT (tenant_id) DO UPDATE on tenant_settings. |

NULL-comparison trap (P-AUTHOR-2) verified absent — the canonical Block A uses `IS DISTINCT FROM 'service_role'` + explicit `IS NULL OR <> p_tenant_id`, never `p_tenant_id != v_jwt_tenant` (which would yield NULL for anon).

Status-column semantics probe (P-AUTHOR-1 from SECURITY_HOTFIX_3): no RLS policy in this SPEC filters by a `status` column (lifecycle_stage is on customers, used only in views' WHERE clauses + UI filters, not in RLS). N/A.

### Baselines

Skipped — this SPEC has no measure-then-bound criteria against existing files (purely additive DDL + new files).

---

## 1. Goal

Ship Phase A + B of Module 5 (Customers) — extend the legacy 16-column `customers` stub into the full M5 person-entity per Architecture Brief v3, build 6 new supporting tables (households, health_funds, tenant_languages, customer_notes, customer_documents, tenant_settings, tenant_number_counters), deploy 7 customer-data views, deploy 5 RPCs with the canonical JWT validation header + atomic allocation + Iron Rule 32 cancellation, and pass ≥8/8 functional smoke on the demo tenant — so that M6, M7, M8, M11, M12, M13 can begin building against the stable `customers` FK contract without a per-module SPEC for the underlying entity.

---

## 2. Background & Motivation

The cross-module dependency chain from M6 (Prescriptions), M7 (Orders), M8 (Payments), M11 (Reports), M12 (Communications), M13 (Loyalty) all FK to `customers.id`. Today, `customers` is a 16-column 0-row stub from a pre-Architecture-Brief era — missing lifecycle_stage, composite customer_number, dedup logic, household/health_fund FKs, marketing consent flags, and the 5 RPCs needed for safe writes. Until M5's schema is complete, every downstream module is blocked on the `customer_id` FK design.

The overnight chain Brief (`modules/Module 5 - Customers/architecture-brief/M5_M6_SCHEMA_OVERNIGHT_BRIEF.md`) authored 2026-05-17 calls for both M5 + M6 schema in one chain. This SPEC is Half 1 — M5 schema only. Half 2 (M6_SCHEMA SPEC) is authored after this one's smoke passes; the M6 SPEC depends on `customers.id` + `customer_number` being stable.

Out of scope: the 5,028-customer OpticPlus migration + 1,158-lead `crm_leads` rollover. Those require Daniel-in-loop data review and live in separate SPECs (`M5_MIGRATION`).

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. The executor MUST capture actual values in `EXECUTION_REPORT.md §2`.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status --short` → empty |
| 2 | New SPEC folder files | 4 files in `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/` (SPEC.md authored by Foreman + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md by Executor) | `ls modules/Module\ 5\ -\ Customers/docs/specs/M5_SCHEMA/` |
| 3 | `customers` columns after ALTER | 40 columns total (16 existing + 24 added, `branch_id` renamed not added) | `SELECT count(*) FROM information_schema.columns WHERE table_name='customers' AND table_schema='public'` → 40 |
| 4 | `tenant_location.deactivated_at` exists | 1 row in information_schema.columns | `SELECT data_type FROM information_schema.columns WHERE table_name='tenant_location' AND column_name='deactivated_at'` → 'timestamp with time zone' |
| 5 | `tenants.tenant_code` exists + backfilled | 2 distinct codes ('01' prizma, '02' demo) | `SELECT tenant_code FROM tenants ORDER BY slug` → ['01','02'] |
| 6 | New tables created | 7 new tables — households, health_funds, tenant_languages, customer_notes, customer_documents, tenant_settings, tenant_number_counters | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN (...)` → 7 |
| 7 | RLS enabled on every new table + customers | `relrowsecurity=true` on all 8 tables | `SELECT relname FROM pg_class WHERE relname IN (...) AND relrowsecurity=true` → all 8 returned |
| 8 | Canonical 2-policy on every new table | 2 policies per table: `service_bypass` (service_role) + `tenant_isolation` (public with JWT-claim USING) | `SELECT polname FROM pg_policy WHERE polrelid IN (...)` → 14 rows |
| 9 | FK columns indexed | All FK columns (home_branch_id, household_id, language_code, health_fund_id, customer_id from notes/documents) have a btree index | `SELECT indexname FROM pg_indexes WHERE tablename IN (...)` includes the FK indexes |
| 10 | UNIQUE constraints tenant-scoped | UNIQUE (customer_number, tenant_id) on customers; UNIQUE (phone, tenant_id) on customers where phone IS NOT NULL; UNIQUE (id_number, tenant_id) on customers where id_number IS NOT NULL; UNIQUE (code, tenant_id) on health_funds; UNIQUE (language_code, tenant_id) on tenant_languages | `SELECT conname FROM pg_constraint WHERE contype='u' AND conrelid IN (...)` returns all 5 |
| 11 | 7 customer views deployed | 7 views: v_customer_for_exam, v_customer_for_order, v_customer_for_payment, v_customer_full, v_customer_for_messaging, v_customer_for_loyalty, v_customer_for_appointment | `SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname LIKE 'v_customer_%'` → 7 rows (v_customer_prescriptions_summary will appear from M6 SPEC, not counted here) |
| 12 | 5 RPCs + 2 helper functions deployed | 5 RPCs + `allocate_tenant_number` + `compute_lifecycle_stage_on_order` + `compute_lifecycle_dormant_sweep` = 8 functions, all SECURITY DEFINER with search_path SET, EXECUTE granted to authenticated + service_role (REVOKED from anon + PUBLIC) | `SELECT proname FROM pg_proc WHERE proname IN (...) AND prosecdef=true` → 8 rows |
| 13 | Seed data — tenant_languages | 8 rows total (4 per tenant): demo + prizma each have he (default+active), ru (active), en (active), es (inactive) | `SELECT count(*) FROM tenant_languages` → 8; `SELECT language_code, is_active, is_default FROM tenant_languages WHERE tenant_id='8d8cfa7e-...'` → 4 rows with expected flags |
| 14 | Seed data — health_funds | 10 rows total (5 per tenant): each tenant has Leumit, Maccabi, Clalit, Clalit Platinum, Meuhedet | `SELECT count(*) FROM health_funds` → 10; `SELECT code FROM health_funds WHERE tenant_id='8d8cfa7e-...' ORDER BY code` → 5 distinct codes |
| 15 | Seed data — tenant_number_counters | 1 row per (tenant, entity_kind) lazy-initialized on first allocation (no eager seed); after smoke #1 ran, demo has at least 1 row for entity_kind='customer' | `SELECT count(*) FROM tenant_number_counters WHERE tenant_id='8d8cfa7e-...' AND entity_kind='customer'` → 1 after smoke |
| 16 | Smoke 8/8 PASS on demo | All 9 smoke cases listed in §3a pass; captured in TEST_REPORT.md | TEST_REPORT.md §2 status table all ✅ |
| 17 | Iron Rule 31 — Integrity Gate | `npm run verify:integrity` exit 0 (or 2 — warnings only) | `npm run verify:integrity; echo $?` → 0 or 2 |
| 18 | Iron Rule 32 — Destructive Operations | §Destructive Operations declares "None." → verify no DROP/ALTER-DROP/DELETE-without-tenant-scope was issued during the run | `git log --oneline | head -10` shows only `feat(m5)` + `docs(m5)` + `chore(spec)` commits; no `chore(cleanup)` or `fix(drop)` |
| 19 | T-constants extended | `js/shared.js` `T` object adds 7 new keys: CUSTOMERS, HOUSEHOLDS, HEALTH_FUNDS, TENANT_LANGUAGES, CUSTOMER_NOTES, CUSTOMER_DOCUMENTS, TENANT_SETTINGS, TENANT_NUMBER_COUNTERS | `grep -E "^\s+(CUSTOMERS|HOUSEHOLDS|HEALTH_FUNDS|TENANT_LANGUAGES|CUSTOMER_NOTES|CUSTOMER_DOCUMENTS|TENANT_SETTINGS|TENANT_NUMBER_COUNTERS):" js/shared.js` → 8 rows (CUSTOMERS, HOUSEHOLDS, HEALTH_FUNDS, TENANT_LANGUAGES, CUSTOMER_NOTES, CUSTOMER_DOCUMENTS, TENANT_SETTINGS, TENANT_NUMBER_COUNTERS) |
| 20 | Advisors-for-objects scan | 0 NEW HIGH/ERROR advisor lints on the 7 new tables + extended customers + 5 RPCs + 7 views. Pre-existing lints unaffected. | `node scripts/audit/advisors-for-objects.mjs --tables customers,households,health_funds,tenant_languages,customer_notes,customer_documents,tenant_settings,tenant_number_counters --views v_customer_% --functions create_customer,merge_customers,assign_to_household,delete_last_unused_customer,update_customer_display_preferences,allocate_tenant_number,compute_lifecycle_stage_on_order,compute_lifecycle_dormant_sweep` returns 0 new HIGH/ERROR |
| 21 | MIGRATION.md Applied Log | The SPEC folder contains a `MIGRATION.md` file listing each migration applied via MCP `apply_migration` with name + apply-time-ISO + version. | `cat modules/Module\ 5\ -\ Customers/docs/specs/M5_SCHEMA/MIGRATION.md` shows ≥6 entries |
| 22 | Module-level docs written | `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` + `CHANGELOG.md` + `MODULE_MAP.md` + `MODULE_SPEC.md` + `db-schema.sql` all exist after this SPEC closes; ROADMAP marks Phase A+B done, C+D+E pending. | `ls modules/Module\ 5\ -\ Customers/docs/` → 5 .md files + specs/ folder |
| 23 | GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE merged additive | New entries added; no existing entries removed. | `git diff origin/develop -- docs/GLOBAL_MAP.md docs/GLOBAL_SCHEMA.sql docs/DB_TABLES_REFERENCE.md` shows only `+` lines (additions). |
| 24 | No Prizma writes | Functional smoke + seed inserts only on demo + prizma seeds (tenant_code + 4 tenant_languages + 5 health_funds — same DDL/config inserts as demo). NO `customers` / `customer_notes` / etc. rows on prizma. | `SELECT count(*) FROM customers WHERE tenant_id='6ad0781b-...'` → 0; same for customer_notes, customer_documents. |

### 3a. Functional smoke cases (≥8, captured in TEST_REPORT.md)

All run on demo tenant (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`). For each case, the executor pins the JWT for the role being tested via `SET LOCAL request.jwt.claims = '{...}'` inside a SQL transaction.

| # | Case name | Setup | Assertion | Cleanup |
|---|---|---|---|---|
| S1 | `create_customer` happy path | JWT = authenticated demo. Call `create_customer(demo_tenant_id, '{"first_name":"דניאל","last_name":"לוי","phone":"+972501111111","language_code":"he","home_branch_id":"<demo branch 1 id>"}')` | Returns `(customer_id uuid, customer_number int)` with `customer_number = 1`. `SELECT lifecycle_stage FROM customers WHERE id=customer_id` → `'prospect'` (default for new). RLS sees the row. | `DELETE FROM customers WHERE id=customer_id` (service_role). |
| S2 | `customer_number` atomic allocation | Call `create_customer` 3 times in sequence (concurrent simulated by service_role). | Returned customer_numbers = [2, 3, 4] — contiguous. `SELECT last_value FROM tenant_number_counters WHERE tenant_id='8d8cfa7e-...' AND entity_kind='customer'` = 4. | Clean up 3 rows. |
| S3 | Dedup on duplicate phone | Insert customer with phone='+972502222222'. Call create_customer again with same phone. | Second call returns the SAME `customer_id` as first; no INSERT. customer_number unchanged. | Clean up. |
| S4 | Dedup on duplicate id_number | Insert customer with id_number='123456789'. Call create_customer again with same id_number. | Second call returns SAME customer_id; no INSERT. | Clean up. |
| S5 | `merge_customers` reassigns children | Create customer A (primary) + B (secondary). Insert 2 customer_notes for B. Call `merge_customers(tenant_id, A.id, B.id)`. | After call: 2 customer_notes have customer_id=A.id; B has `is_deleted=true, deleted_at=now()`; returns A.id. | Clean up. |
| S6 | `assign_to_household` happy path | Create customer + household. Call `assign_to_household(tenant_id, customer_id, household_id)`. | `SELECT household_id FROM customers WHERE id=customer_id` = household_id. | Clean up. |
| S7 | `delete_last_unused_customer` succeeds then fails | Create customer (max #). Call delete_last_unused_customer → returns TRUE, customer is hard-deleted, counter rolls back by 1. Create new customer + add a customer_note FK. Call delete_last_unused_customer → returns FALSE, customer remains. | First call: returns TRUE + DELETE succeeded + last_value decremented. Second: returns FALSE + customer still exists. | Final cleanup. |
| S8 | Cross-tenant guard | JWT = authenticated demo. Call `create_customer(prizma_tenant_id, ...)`. Then JWT = authenticated demo, try `SELECT * FROM customers WHERE tenant_id=prizma_tenant_id`. | First: raises 42501 (Block A inner check). Second: returns 0 rows (RLS). | N/A. |
| S9 | Anon reject on all 5 RPCs | JWT = anon (no tenant_id claim). Call each of the 5 RPCs. | All 5 raise 42501. | N/A. |

TEST_REPORT.md format: one section per smoke case with the exact SQL run, the actual return, and PASS/FAIL.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo, run read-only SQL freely (Level 1).
- Apply DDL via Supabase MCP `apply_migration` (this SPEC declares the schema changes — see §3 DDL below).
- Run seed INSERTs on demo + prizma for: tenants.tenant_code backfill, tenant_languages (4 per tenant), health_funds (5 per tenant). NO customers/notes/documents seeds on prizma.
- Run functional smoke INSERTs on demo only (cleaned up at the end of each case per §3a).
- Run `scripts/audit/advisors-for-objects.mjs` and `npm run verify:integrity` / `verify --full`.
- Create the EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + MIGRATION.md inside the SPEC folder.
- Create the module-level docs (SESSION_CONTEXT.md, CHANGELOG.md, MODULE_MAP.md, MODULE_SPEC.md, db-schema.sql).
- Update `js/shared.js` T-constants object (add 8 new keys per §3 #19) — surgical edit, no other changes to shared.js.
- Update `docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql` + `docs/DB_TABLES_REFERENCE.md` additively (Integration Ceremony — never remove existing entries).
- Commit and push to `develop` per §9 Commit Plan.
- Selective `git add` by filename only — the repo had pre-existing dirty files at chain-start (campaign/M4 audits, untracked drafts). DO NOT `git add -A` or `git add .`. NEVER touch files outside the M5 path tree + the 3 GLOBAL docs + js/shared.js.

### What REQUIRES stopping and reporting (write `modules/Module 5 - Customers/escalations/{ISO_TS}_{topic}.md`)

- Any DDL that would DROP a table, DROP a column, DROP a policy, TRUNCATE, or DELETE FROM <table> without a tenant_id-scoped WHERE.
- Any need to modify an unrelated existing table (e.g., legacy `prescriptions` or `work_orders` stubs) — those are out of scope.
- Any smoke case that fails — STOP, do not retry blindly; write FINDINGS + escalation file + HALT the M5 → M6 chain.
- Any advisor lint that returns NEW HIGH/ERROR — STOP, escalate.
- Any attempt by the chain to write to Prizma `customers` / `customer_notes` / `customer_documents` rows — STOP, escalate.
- `npm run verify:integrity` returns exit 1 (null-byte ERROR) — STOP, escalate.
- Any deviation from §3 success criteria — STOP, escalate.

### Selective git add discipline (mandatory)

At chain start, `git status` showed pre-existing dirty paths from other sessions (campaign/M4 audits, drafts). The executor MUST commit ONLY:

- `modules/Module 5 - Customers/**` (excluding `backups/`, `escalations/` is fine)
- `modules/Module 5 - Customers/architecture-brief/M5_M6_SCHEMA_OVERNIGHT_*.md` (the activation prompt + Brief that arrived with the chain)
- `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `docs/DB_TABLES_REFERENCE.md` (additive merges)
- `js/shared.js` (T-constant additions)
- Any new SQL migration files under `migrations/` if explicitly created (prefer MCP `apply_migration` over file-based migration; if a file is created, name it `migrations/M5_SCHEMA_<step>.sql`)

NEVER `git add -A` / `git add .` / `git commit -am`. EVERY commit uses explicit file arguments.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

Beyond the globals (branch mismatch, unexpected files, etc.):

- If `SELECT count(*) FROM customers WHERE tenant_id IN (demo, prizma)` is non-zero at the START of the SPEC run → STOP. The probe showed 0 rows; if rows appeared between probe and run, another session is writing — escalate.
- If `pg_class.relrowsecurity` for the existing `customers` table is FALSE at start → STOP (probe showed TRUE).
- If `pg_policy` for existing `customers` table is missing the `service_bypass` or `tenant_isolation` policy at start → STOP (probe showed both present).
- If the canonical Block A header from `JWT_VALIDATION_HEADER.sql` is altered in any RPC body (e.g. inlined a hand-rolled variant) → STOP per Iron Rule 35 spirit.
- If functional smoke S2 (atomic allocation) returns non-contiguous numbers → STOP and investigate the lock pattern.
- If `update_customer_display_preferences` writes to `tenant_settings` AND that write affects a column not declared in this SPEC → STOP.
- Any DDL using `auth.uid()` instead of JWT-claim — STOP (Iron Rule 15 canonical pattern).

---

## 6. Rollback Plan

If the SPEC fails partway through and the chain HALTS:

- `git reset --hard <chain-start-commit>` — capture the commit before any SPEC-related edit started.
- DB rollback for DDL applied via MCP `apply_migration`: Supabase MCP migrations cannot be auto-reverted in-place. The executor MUST capture the migration name + apply timestamp in MIGRATION.md. The Foreman (this skill, next session) writes a paired ROLLBACK SPEC if needed. Practically: every M5 DDL step is idempotent (ALTER TABLE ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION, CREATE OR REPLACE VIEW) so partial failures can be re-run without rollback.
- DML rollback: seed INSERTs use ON CONFLICT DO NOTHING so re-run is safe. Smoke INSERTs are cleaned up per-case.
- Notify Foreman; SPEC marked REOPEN, M6_SCHEMA SPEC does NOT begin until M5 closes 🟢.

---

## Destructive Operations

**None.**

This SPEC declares no destructive operations. The customers, tenant_location, and tenants extensions are all ALTER TABLE ADD COLUMN / RENAME COLUMN / additive operations. All new tables use CREATE TABLE IF NOT EXISTS. All Views use CREATE OR REPLACE. All RPCs use CREATE OR REPLACE FUNCTION. The seed INSERTs use ON CONFLICT DO NOTHING.

Per Iron Rule 32, declaring "None." here means the gate (`scripts/checks/destructive-ops-declared.mjs`) FORBIDS any destructive op for this SPEC's run. If the executor encounters a need for one (e.g. discovers a true name collision that requires DROP) → STOP, write escalation file `modules/Module 5 - Customers/escalations/{ISO_TS}_{topic}.md`, halt the chain.

The single ALTER COLUMN rename (`customers.branch_id` → `customers.home_branch_id`) is a structural rename of a column on a 0-row table — per Iron Rule 32 destructive-ops list, this is NOT in the destructive enumeration (the listed ones are `ALTER TABLE ... DROP`, not RENAME). Treated as an additive structural change. If `scripts/checks/destructive-ops-declared.mjs` flags it, the executor escalates.

---

## 7. Out of Scope (explicit)

Do NOT touch in this SPEC:

- **Any UI file.** No customer-card screen, no customer-list screen, no create-mode screen. No HTML/JS/CSS in any `modules/Module 5 - Customers/` subfolder beyond docs.
- **OpticPlus migration.** The 5,028-customer migration is the M5_MIGRATION SPEC (not yet authored). This SPEC builds the schema only.
- **`crm_leads` table.** 1,376 rows (1,348 prizma + 28 demo) — live, untouched. No new FK from crm_leads to customers. No INSERT into customers from crm_leads. M5_MIGRATION handles the rollover.
- **Legacy `prescriptions` table** (0 rows, 18 flat cols). Not the M6 design. M6_SCHEMA SPEC builds NEW tables; the legacy stub is documented as future-cleanup.
- **Legacy `work_orders` table** (0 rows). Pre-M7. Not in scope.
- **`v_customer_queue_position`** — M14 doesn't exist. Documented as deferred contract.
- **`v_customer_prescriptions_summary`** — M6 owns it. Built in M6_SCHEMA SPEC (Half 2), not here.
- **`compute_lifecycle_stage_on_order` trigger wiring** — function is created but NOT attached as a TRIGGER on `work_orders` or any orders table. M7 attaches when M7 ships.
- **`compute_lifecycle_dormant_sweep` cron** — function created, NOT scheduled (pg_cron job NOT created). The dormant transition runs only when M7 + first 24m of activity exist.
- **Prizma `customers` / `customer_notes` / `customer_documents` row writes.** Smoke runs on demo only.
- **`merge_customers` reassigning future-module FKs.** Today the only incoming FKs to customers are the legacy `prescriptions.customer_id` + `work_orders.customer_id` (both 0 rows). The `merge_customers` body must UPDATE these legacy FKs too as a courtesy, but the SPEC's smoke does NOT verify them (they're stubs). When M6/M7 ship, their SPECs extend merge_customers' UPDATE list. Documented in §11.
- **Touching `MODULE_5_ROADMAP.md` phase ordering.** Stays per the file as authored. UI + migration phases are deferred.
- **Touching any other module's SESSION_CONTEXT.md.** Only M5's.
- **Merging to main.** Daniel-only after morning QA.

---

## 8. Expected Final State

### New files

- `modules/Module 5 - Customers/MODULE_5_ROADMAP.md` (authored by Foreman as part of this chain — already exists when executor starts)
- `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/SPEC.md` (this file)
- `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/EXECUTION_REPORT.md` (Executor writes at end)
- `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/FINDINGS.md` (Executor writes at end — even if empty)
- `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/TEST_REPORT.md` (Executor writes at end with all 9 smoke results)
- `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/MIGRATION.md` (Executor writes — Applied Log of MCP migrations)
- `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md`
- `modules/Module 5 - Customers/docs/MODULE_SPEC.md`
- `modules/Module 5 - Customers/docs/MODULE_MAP.md`
- `modules/Module 5 - Customers/docs/CHANGELOG.md`
- `modules/Module 5 - Customers/docs/db-schema.sql`

### Modified files

- `js/shared.js` — surgical addition of 8 new T-constant keys in the `T` object (after existing M1 lens block, before closing `};`). No other changes.
- `docs/GLOBAL_MAP.md` — additive: new section for M5 functions/contracts.
- `docs/GLOBAL_SCHEMA.sql` — additive: append M5 DDL.
- `docs/DB_TABLES_REFERENCE.md` — additive: 7 new table entries + customers update.

### DB state after run

- `tenants.tenant_code` column exists, backfilled `'01'` (prizma) and `'02'` (demo), NOT NULL constraint active.
- `tenant_location.deactivated_at` column exists (nullable).
- `customers` table — 40 columns total, RLS enabled, 2 canonical policies, 4 UNIQUE constraints (customer_number/tenant_id, phone/tenant_id partial, id_number/tenant_id partial — see §3 DDL), FK indexes on home_branch_id + household_id + health_fund_id + language_code (4-char text — non-FK soft-link to tenant_languages.language_code), 0 rows on demo+prizma.
- 7 new tables created with RLS + 2 policies each.
- 7 customer views deployed (security_invoker=on per future M3 anon-storefront integration; though no anon consumes them yet).
- 8 functions deployed (5 RPCs + 1 helper + 2 deferred-trigger functions), all SECURITY DEFINER + search_path SET + REVOKE EXECUTE FROM anon,PUBLIC + GRANT EXECUTE TO authenticated,service_role.
- Seed: tenant_languages (8 rows), health_funds (10 rows). tenant_number_counters lazily initialized.

### Docs updated (MUST include)

- M5 ROADMAP — Phase A+B marked ✅, C/D/E ⬜.
- M5 SESSION_CONTEXT — sealed status, smoke 9/9 result, next M6_SCHEMA SPEC reference.
- M5 CHANGELOG — phase A+B entry with all commit hashes.
- M5 MODULE_MAP — code map of new functions + views.
- M5 MODULE_SPEC — business logic + state-machine of customer lifecycle_stage.
- M5 db-schema.sql — full DDL of all M5-owned tables (snapshot at SPEC close).
- GLOBAL_MAP / GLOBAL_SCHEMA / DB_TABLES_REFERENCE — additive merges (Integration Ceremony §10 in CLAUDE.md).
- `MASTER_ROADMAP.md` §3 — line updated if Module 5 status row exists (additive).

---

## 3. DDL — Detailed Build Order

> **The executor follows this order strictly.** Each step is one MCP `apply_migration` call. Capture the name + apply timestamp + version returned by MCP into `MIGRATION.md`.

### DDL Step 1 — `tenants.tenant_code` (additive)

```sql
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS tenant_code text;

UPDATE public.tenants SET tenant_code = '01' WHERE slug='prizma' AND tenant_code IS NULL;
UPDATE public.tenants SET tenant_code = '02' WHERE slug='demo'   AND tenant_code IS NULL;

ALTER TABLE public.tenants ALTER COLUMN tenant_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_tenant_code_uidx ON public.tenants (tenant_code);
```

Migration name: `M5_01_tenants_tenant_code`.

### DDL Step 2 — `tenant_location.deactivated_at` (additive)

```sql
ALTER TABLE public.tenant_location
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz NULL;
```

Migration name: `M5_02_tenant_location_deactivated_at`.

### DDL Step 3 — `tenant_number_counters` (new — atomic per-tenant sequential allocator)

```sql
CREATE TABLE IF NOT EXISTS public.tenant_number_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  entity_kind text NOT NULL,       -- 'customer' | 'prescription' | future kinds
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, entity_kind)
);

ALTER TABLE public.tenant_number_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.tenant_number_counters
  AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.tenant_number_counters
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS tenant_number_counters_tenant_id_idx
  ON public.tenant_number_counters (tenant_id);
```

Migration name: `M5_03_tenant_number_counters`.

**Helper RPC `allocate_tenant_number`** — atomic per-tenant sequence (Iron Rule 11). Used by `create_customer` and (later) `commit_prescription`.

```sql
CREATE OR REPLACE FUNCTION public.allocate_tenant_number(p_tenant_id uuid, p_entity_kind text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_new_value bigint;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.tenant_number_counters (tenant_id, entity_kind, last_value)
    VALUES (p_tenant_id, p_entity_kind, 1)
    ON CONFLICT (tenant_id, entity_kind) DO UPDATE
      SET last_value = public.tenant_number_counters.last_value + 1,
          updated_at = now()
    RETURNING last_value INTO v_new_value;
  RETURN v_new_value;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.allocate_tenant_number(uuid, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.allocate_tenant_number(uuid, text) TO authenticated, service_role;
```

Notes:
- The `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` is atomic at the row level — Postgres takes a row-level write lock; concurrent calls serialize.
- Lazy initialization: first call creates the counter at value 1; subsequent calls increment.
- This pattern is INTERNAL — exposed via the consuming RPCs (`create_customer`, future `commit_prescription`). Not called directly by clients. The EXECUTE grant exists so SECURITY DEFINER functions can call it; the GRANT is locked to authenticated + service_role, never anon.

### DDL Step 4 — Enums (new)

```sql
DO $$ BEGIN
  CREATE TYPE public.customer_lifecycle_stage AS ENUM ('prospect','active','dormant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.household_status AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_note_type AS ENUM ('business','medical_q','diagnostics');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_document_category AS ENUM ('doctor_prescription','external_exam','health_fund','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

Migration name: `M5_04_enums`.

### DDL Step 5 — `customers` extension (ALTER, additive)

```sql
-- Step 5a — rename branch_id → home_branch_id (column-level rename, additive structurally)
ALTER TABLE public.customers RENAME COLUMN branch_id TO home_branch_id;

-- Step 5b — add new columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_name             text,
  ADD COLUMN IF NOT EXISTS last_name              text,
  ADD COLUMN IF NOT EXISTS customer_number        integer,
  ADD COLUMN IF NOT EXISTS lifecycle_stage        public.customer_lifecycle_stage NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS household_id           uuid,
  ADD COLUMN IF NOT EXISTS health_fund_id         uuid,
  ADD COLUMN IF NOT EXISTS language_code          text NOT NULL DEFAULT 'he',
  ADD COLUMN IF NOT EXISTS gender                 text,         -- 'M' | 'F' | 'O' | NULL
  ADD COLUMN IF NOT EXISTS profession             text,
  ADD COLUMN IF NOT EXISTS dominant_eye           text,         -- 'R' | 'L' | NULL
  ADD COLUMN IF NOT EXISTS customer_marketing_consent  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_operational_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crm_marketing_consent  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crm_operational_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source                 text,
  ADD COLUMN IF NOT EXISTS utm_source             text,
  ADD COLUMN IF NOT EXISTS utm_medium             text,
  ADD COLUMN IF NOT EXISTS utm_campaign           text,
  ADD COLUMN IF NOT EXISTS utm_content            text,
  ADD COLUMN IF NOT EXISTS utm_term               text,
  ADD COLUMN IF NOT EXISTS utm_campaign_id        text,
  ADD COLUMN IF NOT EXISTS first_interaction_at   timestamptz,
  ADD COLUMN IF NOT EXISTS consent_form_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_deleted             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at             timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by             uuid;

-- Step 5c — soft FK references (tables created later in this SPEC)
-- We defer adding the FK constraints to a later step so health_funds/households/tenant_languages
-- exist first.
```

Migration name: `M5_05_customers_extend`.

### DDL Step 6 — `households` (new)

```sql
CREATE TABLE IF NOT EXISTS public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  primary_customer_id uuid,   -- FK to customers added in step 9
  status public.household_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.households
  AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.households
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS households_tenant_id_idx ON public.households (tenant_id);
CREATE INDEX IF NOT EXISTS households_primary_customer_id_idx ON public.households (primary_customer_id);
```

Migration name: `M5_06_households`.

### DDL Step 7 — `health_funds` (new)

```sql
CREATE TABLE IF NOT EXISTS public.health_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (code, tenant_id)
);

ALTER TABLE public.health_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.health_funds
  AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.health_funds
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS health_funds_tenant_id_idx ON public.health_funds (tenant_id);
```

Migration name: `M5_07_health_funds`.

**Seed:**
```sql
INSERT INTO public.health_funds (tenant_id, name, code, sort_order) VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','לאומית','leumit',1),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','מכבי','maccabi',2),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','כללית','clalit',3),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','כללית פלטינום','clalit_platinum',4),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','מאוחדת','meuhedet',5),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','לאומית','leumit',1),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','מכבי','maccabi',2),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','כללית','clalit',3),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','כללית פלטינום','clalit_platinum',4),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','מאוחדת','meuhedet',5)
ON CONFLICT (code, tenant_id) DO NOTHING;
```

### DDL Step 8 — `tenant_languages` (new)

```sql
CREATE TABLE IF NOT EXISTS public.tenant_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  language_code text NOT NULL,        -- ISO he/ru/en/es/...
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (language_code, tenant_id)
);

ALTER TABLE public.tenant_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.tenant_languages
  AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.tenant_languages
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS tenant_languages_tenant_id_idx ON public.tenant_languages (tenant_id);

-- One default per tenant
CREATE UNIQUE INDEX IF NOT EXISTS tenant_languages_one_default_per_tenant_uidx
  ON public.tenant_languages (tenant_id) WHERE is_default = true;
```

Migration name: `M5_08_tenant_languages`.

**Seed (demo + prizma — same set):**
```sql
INSERT INTO public.tenant_languages (tenant_id, language_code, is_active, is_default, sort_order) VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','he',true,true,1),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','ru',true,false,2),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','en',true,false,3),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','es',false,false,4),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','he',true,true,1),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','ru',true,false,2),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','en',true,false,3),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','es',false,false,4)
ON CONFLICT (language_code, tenant_id) DO NOTHING;
```

### DDL Step 9 — Customer FK constraints + tenant-scoped UNIQUE (after dependent tables exist)

```sql
-- FK constraints
ALTER TABLE public.customers
  ADD CONSTRAINT IF NOT EXISTS customers_home_branch_id_fkey
    FOREIGN KEY (home_branch_id) REFERENCES public.tenant_location(id);

ALTER TABLE public.customers
  ADD CONSTRAINT IF NOT EXISTS customers_household_id_fkey
    FOREIGN KEY (household_id) REFERENCES public.households(id);

ALTER TABLE public.customers
  ADD CONSTRAINT IF NOT EXISTS customers_health_fund_id_fkey
    FOREIGN KEY (health_fund_id) REFERENCES public.health_funds(id);

-- households back-reference
ALTER TABLE public.households
  ADD CONSTRAINT IF NOT EXISTS households_primary_customer_id_fkey
    FOREIGN KEY (primary_customer_id) REFERENCES public.customers(id);

-- Tenant-scoped UNIQUE on customer_number
CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_number_tenant_uidx
  ON public.customers (customer_number, tenant_id) WHERE customer_number IS NOT NULL;

-- Tenant-scoped UNIQUE on phone (partial — NULL phone allowed for incomplete records)
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_tenant_uidx
  ON public.customers (phone, tenant_id) WHERE phone IS NOT NULL AND is_deleted = false;

-- Tenant-scoped UNIQUE on id_number (partial)
CREATE UNIQUE INDEX IF NOT EXISTS customers_id_number_tenant_uidx
  ON public.customers (id_number, tenant_id) WHERE id_number IS NOT NULL AND is_deleted = false;

-- FK indexes
CREATE INDEX IF NOT EXISTS customers_home_branch_id_idx ON public.customers (home_branch_id);
CREATE INDEX IF NOT EXISTS customers_household_id_idx ON public.customers (household_id);
CREATE INDEX IF NOT EXISTS customers_health_fund_id_idx ON public.customers (health_fund_id);
CREATE INDEX IF NOT EXISTS customers_language_code_idx ON public.customers (language_code);
CREATE INDEX IF NOT EXISTS customers_lifecycle_stage_idx ON public.customers (lifecycle_stage);
```

Migration name: `M5_09_customers_fks_and_uniques`.

### DDL Step 10 — `customer_notes` (new)

```sql
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  note_type public.customer_note_type NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.customer_notes
  AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.customer_notes
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS customer_notes_customer_id_idx ON public.customer_notes (customer_id);
CREATE INDEX IF NOT EXISTS customer_notes_tenant_id_idx ON public.customer_notes (tenant_id);
```

Migration name: `M5_10_customer_notes`.

### DDL Step 11 — `customer_documents` (new)

```sql
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  category public.customer_document_category NOT NULL,
  file_path text NOT NULL,        -- Storage path: {tenant_id}/{customer_id}/{document_id}.{ext}
  original_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.customer_documents
  AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.customer_documents
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS customer_documents_customer_id_idx ON public.customer_documents (customer_id);
CREATE INDEX IF NOT EXISTS customer_documents_tenant_id_idx ON public.customer_documents (tenant_id);
```

Migration name: `M5_11_customer_documents`.

### DDL Step 12 — `tenant_settings` (new — for customer_list_preferences config Brief §14)

```sql
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_list_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.tenant_settings
  AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.tenant_settings
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS tenant_settings_tenant_id_idx ON public.tenant_settings (tenant_id);
```

Migration name: `M5_12_tenant_settings`.

### DDL Step 13 — 5 RPCs

Each RPC uses the canonical Block A header from `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql`. The complete bodies follow.

#### 13.1 `create_customer`

```sql
CREATE OR REPLACE FUNCTION public.create_customer(p_tenant_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_first_name text := p_payload->>'first_name';
  v_last_name text := p_payload->>'last_name';
  v_full_name text := p_payload->>'full_name';
  v_phone text := nullif(p_payload->>'phone','');
  v_id_number text := nullif(p_payload->>'id_number','');
  v_email text := nullif(p_payload->>'email','');
  v_language_code text := coalesce(nullif(p_payload->>'language_code',''), 'he');
  v_home_branch_id uuid := nullif(p_payload->>'home_branch_id','')::uuid;
  v_lifecycle text := coalesce(nullif(p_payload->>'lifecycle_stage',''), 'prospect');
  v_existing_id uuid;
  v_new_id uuid;
  v_customer_number bigint;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Compose full_name if only split fields given
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := trim(concat_ws(' ', v_first_name, v_last_name));
    IF v_full_name IS NULL OR v_full_name = '' THEN
      RAISE EXCEPTION 'create_customer requires full_name OR (first_name+last_name)' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_home_branch_id IS NULL THEN
    RAISE EXCEPTION 'create_customer requires home_branch_id' USING ERRCODE = '22023';
  END IF;

  -- Dedup §4.7 — id_number first, then phone
  IF v_id_number IS NOT NULL THEN
    SELECT id INTO v_existing_id
      FROM public.customers
      WHERE tenant_id = p_tenant_id
        AND id_number = v_id_number
        AND is_deleted = false
      LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'customer_id', v_existing_id,
        'customer_number', (SELECT customer_number FROM public.customers WHERE id = v_existing_id),
        'created', false,
        'reason', 'id_number_exists'
      );
    END IF;
  END IF;

  IF v_phone IS NOT NULL THEN
    SELECT id INTO v_existing_id
      FROM public.customers
      WHERE tenant_id = p_tenant_id
        AND phone = v_phone
        AND is_deleted = false
      LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'customer_id', v_existing_id,
        'customer_number', (SELECT customer_number FROM public.customers WHERE id = v_existing_id),
        'created', false,
        'reason', 'phone_exists'
      );
    END IF;
  END IF;

  -- Allocate customer_number atomically
  v_customer_number := public.allocate_tenant_number(p_tenant_id, 'customer');

  -- Insert
  INSERT INTO public.customers (
    tenant_id, full_name, first_name, last_name, id_number, phone, email,
    language_code, home_branch_id, customer_number, lifecycle_stage,
    source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id,
    first_interaction_at, consent_form_signed_at,
    customer_marketing_consent, customer_operational_consent,
    crm_marketing_consent, crm_operational_consent,
    gender, profession, dominant_eye, address, city, birth_date, member_number,
    created_by
  ) VALUES (
    p_tenant_id, v_full_name, v_first_name, v_last_name, v_id_number, v_phone, v_email,
    v_language_code, v_home_branch_id, v_customer_number::integer, v_lifecycle::public.customer_lifecycle_stage,
    p_payload->>'source', p_payload->>'utm_source', p_payload->>'utm_medium', p_payload->>'utm_campaign',
    p_payload->>'utm_content', p_payload->>'utm_term', p_payload->>'utm_campaign_id',
    (p_payload->>'first_interaction_at')::timestamptz,
    (p_payload->>'consent_form_signed_at')::timestamptz,
    coalesce((p_payload->>'customer_marketing_consent')::boolean, false),
    coalesce((p_payload->>'customer_operational_consent')::boolean, false),
    coalesce((p_payload->>'crm_marketing_consent')::boolean, false),
    coalesce((p_payload->>'crm_operational_consent')::boolean, false),
    p_payload->>'gender', p_payload->>'profession', p_payload->>'dominant_eye',
    p_payload->>'address', p_payload->>'city',
    (p_payload->>'birth_date')::date,
    p_payload->>'member_number',
    nullif(p_payload->>'created_by','')::uuid
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'customer_id', v_new_id,
    'customer_number', v_customer_number::integer,
    'created', true,
    'reason', 'new'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_customer(uuid, jsonb) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_customer(uuid, jsonb) TO authenticated, service_role;
```

#### 13.2 `merge_customers`

```sql
CREATE OR REPLACE FUNCTION public.merge_customers(p_tenant_id uuid, p_primary_id uuid, p_secondary_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_primary_tenant uuid;
  v_secondary_tenant uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_primary_id = p_secondary_id THEN
    RAISE EXCEPTION 'Cannot merge a customer with itself' USING ERRCODE = '22023';
  END IF;

  SELECT tenant_id INTO v_primary_tenant FROM public.customers WHERE id = p_primary_id;
  SELECT tenant_id INTO v_secondary_tenant FROM public.customers WHERE id = p_secondary_id;

  IF v_primary_tenant IS NULL OR v_secondary_tenant IS NULL THEN
    RAISE EXCEPTION 'Primary or secondary customer not found' USING ERRCODE = '22023';
  END IF;

  IF v_primary_tenant <> p_tenant_id OR v_secondary_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Cross-tenant merge forbidden' USING ERRCODE = '42501';
  END IF;

  -- Reassign all known incoming FKs
  UPDATE public.customer_notes      SET customer_id = p_primary_id WHERE customer_id = p_secondary_id AND tenant_id = p_tenant_id;
  UPDATE public.customer_documents  SET customer_id = p_primary_id WHERE customer_id = p_secondary_id AND tenant_id = p_tenant_id;
  -- Legacy stubs (0 rows today; future-proof — Iron Rule 21 #1 No Orphans):
  UPDATE public.prescriptions       SET customer_id = p_primary_id WHERE customer_id = p_secondary_id AND tenant_id = p_tenant_id;
  UPDATE public.work_orders         SET customer_id = p_primary_id WHERE customer_id = p_secondary_id AND tenant_id = p_tenant_id;
  -- households: if secondary was primary of a household, transfer primary-ship
  UPDATE public.households          SET primary_customer_id = p_primary_id WHERE primary_customer_id = p_secondary_id AND tenant_id = p_tenant_id;

  -- Soft-delete secondary
  UPDATE public.customers
    SET is_deleted = true, deleted_at = now(), updated_at = now()
    WHERE id = p_secondary_id AND tenant_id = p_tenant_id;

  RETURN p_primary_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.merge_customers(uuid, uuid, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.merge_customers(uuid, uuid, uuid) TO authenticated, service_role;
```

#### 13.3 `assign_to_household`

```sql
CREATE OR REPLACE FUNCTION public.assign_to_household(p_tenant_id uuid, p_customer_id uuid, p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_customer_tenant uuid;
  v_household_tenant uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT tenant_id INTO v_customer_tenant FROM public.customers WHERE id = p_customer_id;
  SELECT tenant_id INTO v_household_tenant FROM public.households WHERE id = p_household_id;

  IF v_customer_tenant <> p_tenant_id OR v_household_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Customer or household belongs to different tenant' USING ERRCODE = '42501';
  END IF;

  UPDATE public.customers
    SET household_id = p_household_id, updated_at = now()
    WHERE id = p_customer_id AND tenant_id = p_tenant_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.assign_to_household(uuid, uuid, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assign_to_household(uuid, uuid, uuid) TO authenticated, service_role;
```

#### 13.4 `delete_last_unused_customer` (Iron Rule 32)

```sql
CREATE OR REPLACE FUNCTION public.delete_last_unused_customer(p_tenant_id uuid, p_customer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_target_number integer;
  v_current_max integer;
  v_fk_count integer;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Lock the counter row to serialize against concurrent allocate_tenant_number
  PERFORM 1 FROM public.tenant_number_counters
    WHERE tenant_id = p_tenant_id AND entity_kind = 'customer'
    FOR UPDATE;

  -- Get target's number + the current max
  SELECT customer_number INTO v_target_number
    FROM public.customers
    WHERE id = p_customer_id AND tenant_id = p_tenant_id AND is_deleted = false;

  IF v_target_number IS NULL THEN
    RETURN false;  -- already deleted or doesn't exist
  END IF;

  SELECT max(customer_number) INTO v_current_max
    FROM public.customers
    WHERE tenant_id = p_tenant_id AND is_deleted = false;

  IF v_target_number <> v_current_max THEN
    RETURN false;  -- not the max; cannot release
  END IF;

  -- Check zero incoming FKs
  SELECT
      (SELECT count(*) FROM public.customer_notes      WHERE customer_id = p_customer_id) +
      (SELECT count(*) FROM public.customer_documents  WHERE customer_id = p_customer_id) +
      (SELECT count(*) FROM public.prescriptions       WHERE customer_id = p_customer_id) +
      (SELECT count(*) FROM public.work_orders         WHERE customer_id = p_customer_id)
    INTO v_fk_count;

  IF v_fk_count > 0 THEN
    RETURN false;
  END IF;

  -- Also check household primary-ship
  IF EXISTS (SELECT 1 FROM public.households WHERE primary_customer_id = p_customer_id) THEN
    RETURN false;
  END IF;

  -- Safe to hard-delete + decrement counter
  DELETE FROM public.customers WHERE id = p_customer_id AND tenant_id = p_tenant_id;

  UPDATE public.tenant_number_counters
    SET last_value = last_value - 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND entity_kind = 'customer'
      AND last_value = v_target_number;

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.delete_last_unused_customer(uuid, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_last_unused_customer(uuid, uuid) TO authenticated, service_role;
```

#### 13.5 `update_customer_display_preferences`

```sql
CREATE OR REPLACE FUNCTION public.update_customer_display_preferences(p_tenant_id uuid, p_prefs jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.tenant_settings (tenant_id, customer_list_preferences)
    VALUES (p_tenant_id, p_prefs)
    ON CONFLICT (tenant_id) DO UPDATE
      SET customer_list_preferences = EXCLUDED.customer_list_preferences,
          updated_at = now();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_customer_display_preferences(uuid, jsonb) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_customer_display_preferences(uuid, jsonb) TO authenticated, service_role;
```

Migration name for 13.1–13.5: `M5_13_rpcs`.

### DDL Step 14 — Deferred trigger functions (built, NOT wired)

```sql
-- Function: when an order completes, transition customer.lifecycle_stage from prospect → active.
-- NOT wired yet — M7 will attach as AFTER INSERT trigger on the future orders table.
CREATE OR REPLACE FUNCTION public.compute_lifecycle_stage_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- This function is intended to be attached to AFTER INSERT on the future M7 orders table.
  -- It expects NEW.customer_id and NEW.tenant_id to exist on the triggering row.
  UPDATE public.customers
    SET lifecycle_stage = 'active', updated_at = now()
    WHERE id = NEW.customer_id
      AND tenant_id = NEW.tenant_id
      AND lifecycle_stage = 'prospect';
  RETURN NEW;
END;
$function$;

-- Function: dormant sweep — runs daily via pg_cron when M7 + 24m+ of activity exist.
-- NOT scheduled yet.
CREATE OR REPLACE FUNCTION public.compute_lifecycle_dormant_sweep()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  -- Inactive 24m+ — for now, this is a stub that does nothing (no orders table exists yet).
  -- The full body will be added in the M7 SPEC once orders.created_at is queryable.
  -- This stub returns 0 transitions so the function signature is stable for future cron scheduling.
  v_count := 0;
  RETURN v_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.compute_lifecycle_stage_on_order() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.compute_lifecycle_stage_on_order() TO service_role;
REVOKE EXECUTE ON FUNCTION public.compute_lifecycle_dormant_sweep()   FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.compute_lifecycle_dormant_sweep()   TO service_role;
```

Migration name: `M5_14_lifecycle_functions`.

### DDL Step 15 — 7 customer views (security_invoker=on)

For each view: `CREATE OR REPLACE VIEW ... WITH (security_invoker = on) AS SELECT ...`. RLS on the underlying tables propagates correctly. The 7 views differ only in column projection — Brief §3.1 names what each consumer needs. Below: condensed list; executor expands per Brief §3.1.

```sql
-- v_customer_for_exam (M6 customer header)
CREATE OR REPLACE VIEW public.v_customer_for_exam
  WITH (security_invoker = on)
AS
SELECT
  c.id, c.tenant_id, c.full_name, c.first_name, c.last_name,
  c.gender, c.birth_date,
  hf.code AS health_fund_code, hf.name AS health_fund_name,
  c.language_code, c.dominant_eye,
  c.customer_number, t.tenant_code, tl.short_code AS branch_code,
  (t.tenant_code || coalesce(tl.short_code,'00') || lpad(c.customer_number::text, 5, '0')) AS customer_number_display
FROM public.customers c
LEFT JOIN public.tenants t ON t.id = c.tenant_id
LEFT JOIN public.tenant_location tl ON tl.id = c.home_branch_id
LEFT JOIN public.health_funds hf ON hf.id = c.health_fund_id
WHERE c.is_deleted = false;

-- v_customer_for_order — Brief §3.1
CREATE OR REPLACE VIEW public.v_customer_for_order
  WITH (security_invoker = on)
AS
SELECT
  c.id, c.tenant_id, c.full_name, c.first_name, c.last_name,
  c.gender, c.birth_date,
  c.address, c.city, c.phone, c.email, c.id_number,
  c.household_id, c.health_fund_id, hf.code AS health_fund_code,
  c.home_branch_id, c.language_code, c.lifecycle_stage,
  c.customer_number, t.tenant_code, tl.short_code AS branch_code,
  (t.tenant_code || coalesce(tl.short_code,'00') || lpad(c.customer_number::text, 5, '0')) AS customer_number_display
FROM public.customers c
LEFT JOIN public.tenants t ON t.id = c.tenant_id
LEFT JOIN public.tenant_location tl ON tl.id = c.home_branch_id
LEFT JOIN public.health_funds hf ON hf.id = c.health_fund_id
WHERE c.is_deleted = false;

-- v_customer_for_payment — Brief §3.1
CREATE OR REPLACE VIEW public.v_customer_for_payment
  WITH (security_invoker = on)
AS
SELECT
  c.id, c.tenant_id, c.full_name, c.id_number,
  c.health_fund_id, c.language_code, c.lifecycle_stage,
  c.customer_number
FROM public.customers c
WHERE c.is_deleted = false;

-- v_customer_full — Brief §3.1 (broad, for M11 reports)
CREATE OR REPLACE VIEW public.v_customer_full
  WITH (security_invoker = on)
AS
SELECT
  c.id, c.tenant_id,
  c.full_name, c.first_name, c.last_name, c.id_number, c.phone, c.email,
  c.address, c.city, c.birth_date, c.gender, c.profession, c.dominant_eye,
  c.language_code, c.lifecycle_stage,
  c.customer_marketing_consent, c.customer_operational_consent,
  c.crm_marketing_consent, c.crm_operational_consent,
  c.source, c.utm_source, c.utm_medium, c.utm_campaign,
  c.first_interaction_at, c.consent_form_signed_at,
  c.household_id, c.health_fund_id, c.home_branch_id, c.customer_number,
  c.created_at, c.updated_at,
  c.is_deleted, c.deleted_at
FROM public.customers c;  -- v_customer_full intentionally exposes is_deleted for reports

-- v_customer_for_messaging — Brief §3.1; explicitly NO notes
CREATE OR REPLACE VIEW public.v_customer_for_messaging
  WITH (security_invoker = on)
AS
SELECT
  c.id, c.tenant_id, c.full_name, c.first_name,
  c.phone, c.email, c.language_code, c.lifecycle_stage,
  c.customer_marketing_consent, c.customer_operational_consent,
  c.crm_marketing_consent, c.crm_operational_consent
FROM public.customers c
WHERE c.is_deleted = false;

-- v_customer_for_loyalty — Brief §3.1
CREATE OR REPLACE VIEW public.v_customer_for_loyalty
  WITH (security_invoker = on)
AS
SELECT
  c.id, c.tenant_id, c.full_name, c.household_id, c.birth_date,
  c.language_code, c.lifecycle_stage, c.customer_number
FROM public.customers c
WHERE c.is_deleted = false;

-- v_customer_for_appointment — Brief §3.1
CREATE OR REPLACE VIEW public.v_customer_for_appointment
  WITH (security_invoker = on)
AS
SELECT
  c.id, c.tenant_id, c.full_name, c.phone,
  c.language_code, c.household_id, c.lifecycle_stage, c.customer_number
FROM public.customers c
WHERE c.is_deleted = false;
```

Migration name: `M5_15_views`.

---

## 9. Commit Plan

Each commit groups one logical unit. Executor pushes each commit before the next begins.

1. `feat(m5): tenants.tenant_code + tenant_location.deactivated_at additive extensions` — DDL step 1, 2.
2. `feat(m5): tenant_number_counters + allocate_tenant_number helper RPC` — DDL step 3.
3. `feat(m5): customer enums + customers extension (rename branch_id, add 24 cols)` — DDL step 4, 5.
4. `feat(m5): households + health_funds + tenant_languages + customer_notes + customer_documents + tenant_settings` — DDL steps 6, 7, 8, 10, 11, 12.
5. `feat(m5): customer FK constraints + tenant-scoped UNIQUE indexes` — DDL step 9.
6. `feat(m5): 5 customer RPCs (create_customer, merge_customers, assign_to_household, delete_last_unused_customer, update_customer_display_preferences)` — DDL step 13.
7. `feat(m5): deferred lifecycle trigger functions (compute_lifecycle_stage_on_order, compute_lifecycle_dormant_sweep)` — DDL step 14.
8. `feat(m5): 7 customer views (v_customer_for_exam, _for_order, _for_payment, _full, _for_messaging, _for_loyalty, _for_appointment)` — DDL step 15.
9. `feat(m5): seed tenant_languages (8 rows) + health_funds (10 rows)` — Seeds.
10. `chore(m5): T-constant additions in js/shared.js (CUSTOMERS, HOUSEHOLDS, HEALTH_FUNDS, TENANT_LANGUAGES, CUSTOMER_NOTES, CUSTOMER_DOCUMENTS, TENANT_SETTINGS, TENANT_NUMBER_COUNTERS)` — js/shared.js.
11. `test(m5): functional smoke 9/9 PASS on demo (TEST_REPORT.md)` — captures all 9 smoke cases.
12. `docs(m5): module-level docs (SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, CHANGELOG, db-schema.sql)` — Module docs.
13. `docs(global): merge M5 into GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE` — Integration Ceremony.
14. `chore(spec): close M5_SCHEMA — EXECUTION_REPORT + FINDINGS + MIGRATION.md` — Final close.

Each commit message ends with the Co-Authored-By footer per `CLAUDE.md` template. NO `git add -A`. Explicit file arguments only.

---

## 10. Dependencies / Preconditions

- `develop` branch clean of M5/M6 files (verified at chain start). Pre-existing dirty files from other sessions are out of scope — selective `git add` per §4.
- Supabase project `tsxrrxzmdxaenlvocyit` reachable via MCP.
- `scripts/audit/advisors-for-objects.mjs` present.
- `npm run verify:integrity` available (Iron Rule 31 gate).
- `JWT_VALIDATION_HEADER.sql` reference file present in `.claude/skills/opticup-strategic/references/`.
- No active SPEC running in another session on M5/M6 paths (verified at chain start).

---

## 11. Lessons Already Incorporated

| Source | Lesson | How applied |
|---|---|---|
| `JWT_VALIDATION_HEADER.sql` (canonical reference) | "Block A header for SECURITY DEFINER RPCs — 3-role-aware with service_role bypass." | All 5 M5 RPCs + helper RPC use Block A verbatim. |
| `SECURITY_HOTFIX_2_2026_05_15` P-AUTHOR-2 | "Runtime semantics rehearsal — anon, wrong-tenant, service_role." | §0 "Runtime semantics rehearsed" subsection. |
| `SECURITY_HOTFIX_3_2026_05_15` P-AUTHOR-1 | "Status-column semantics probe before RLS filters by status." | N/A — this SPEC does not filter RLS by a status column (lifecycle_stage is used in views' WHERE, not in RLS). |
| `M1B0_PURCHASE_ORDER_SCHEMA` | "Atomic sequential allocation via FOR UPDATE row lock." | `tenant_number_counters` + `allocate_tenant_number` use INSERT ... ON CONFLICT DO UPDATE ... RETURNING (row-level lock equivalent). `delete_last_unused_customer` uses explicit FOR UPDATE on the counter row to serialize against allocate. |
| `M1A_OPERATIONS_RPCS_FIX` | "SECURITY DEFINER + search_path SET + REVOKE/GRANT pattern." | All 8 functions follow. |
| `MIGRATION_1_SUPPLIERS_DEBT` Author Proposal #1 | "Heading convention `## N.` not `§N.`." | This SPEC uses `## N.` throughout. |
| `MIGRATION_2_SETTINGS_PERMISSIONS` Author Proposal #2 | "Pin baselines as symbols when criteria measure-then-bound." | N/A — this SPEC has no measure-then-bound criteria. |
| `MIGRATION_4_STOREFRONT_STUDIO` Author Proposal #1 | "Color-form completeness check." | N/A — no visual re-skin. |
| `M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2` P-AUTHOR-1 | "DOM-state mental rehearsal for CSS layout SPECs." | N/A — DB SPEC. |
| `feedback_probe_constraints_not_just_tables.md` (auto-memory) | "Probe constraints + FK graph + partitioning, not just table existence." | §0 probes constraints (RLS policies, indexes, incoming FKs, enums) — found canonical RLS already present + 2 incoming FKs from legacy stubs. Adjusted strategy to EXTEND + preserve FKs. |
| `feedback_probe_biggest_production_tenant.md` (auto-memory) | "Probe biggest production tenant, not just demo." | §0 probe results listed prizma + demo counts everywhere. Functional smoke runs on demo per Brief §3 Out-of-Scope (the SPEC builds schema applicable to both; the smoke just exercises behavior). |
| `feedback_vfv_must_use_not_just_inspect.md` (auto-memory) | "VFV must USE the surface, not just inspect it." | Smoke S1–S9 USE all 5 RPCs end-to-end; the SPEC does not stop at "the function exists in pg_proc." |
| `feedback_dont_add_unrequested_features.md` (auto-memory) | "Don't add features beyond what was asked." | §7 Out-of-Scope is the longest section. No multi-coverage, no `customer_relationships`, no per-user display preferences, no saved search views, no anything from Brief §6 Deferred List. |
| `feedback_clicks_are_not_actions.md` (auto-memory) | "For conversion metrics, source from business-state columns not click logs." | N/A — schema SPEC, no metrics here. lifecycle_stage = 'active' set by future order INSERT trigger, which is the canonical business-state source. |
| Cross-Reference Check (Step 1.5) | "Grep new names against GLOBAL_SCHEMA + DB_TABLES_REFERENCE before authoring." | §0 Cross-Reference Check table. 0 hard collisions found. 3 existing tables ALTERed additively. |

---

## 12. Pre-Merge Checklist

Executor must check all before closing this SPEC:

- [ ] All 24 §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree) on the M5 + GLOBAL paths the executor owns. Pre-existing dirty files from other sessions remain untouched and visible.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + MIGRATION.md written in the SPEC folder.
- [ ] Module ROADMAP / SESSION_CONTEXT / CHANGELOG / MODULE_MAP / MODULE_SPEC / db-schema.sql written.
- [ ] GLOBAL_MAP / GLOBAL_SCHEMA / DB_TABLES_REFERENCE additively merged.
- [ ] `js/shared.js` T-constants extended (8 new keys).
- [ ] `scripts/audit/advisors-for-objects.mjs` clean — 0 new HIGH/ERROR.
- [ ] No writes to Prizma `customers` / `customer_notes` / `customer_documents` rows during smoke.
- [ ] No use of `auth.uid()` anywhere in new RLS or RPC bodies.
- [ ] No `git add -A` / `git add .` / `git commit -am` invocation.

---

*End of M5_SCHEMA SPEC. Half 1 of the overnight chain. Half 2 (M6_SCHEMA) is authored after this closes 🟢 and M5 functional smoke 9/9 PASSes on demo.*
