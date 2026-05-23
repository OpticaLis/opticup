# M5_SCHEMA — MCP Applied Migrations Log

> All migrations applied via Supabase MCP `apply_migration` on project `tsxrrxzmdxaenlvocyit` (Prizma project, single DB; serves both demo + prizma tenants).
> Apply time: 2026-05-22 overnight chain (single session).

| # | Migration name | DDL summary | apply_migration status |
|---|---|---|---|
| 1 | `M5_01_tenants_tenant_code` | ALTER tenants ADD tenant_code text NOT NULL + UNIQUE index. Backfilled prizma='01', demo='02'. | success |
| 2 | `M5_02_tenant_location_deactivated_at` | ALTER tenant_location ADD deactivated_at timestamptz NULL. | success |
| 3 | `M5_03_tenant_number_counters_and_helper` | CREATE TABLE tenant_number_counters (tenant_id+entity_kind PK + last_value bigint) + RLS canonical 2-policy + index. CREATE OR REPLACE FUNCTION allocate_tenant_number SECURITY DEFINER + Block A header + INSERT ... ON CONFLICT DO UPDATE atomic. | success |
| 4 | `M5_04_enums` | CREATE TYPE customer_lifecycle_stage, household_status, customer_note_type, customer_document_category. | success |
| 5 | `M5_05_customers_extend` | RENAME COLUMN customers.branch_id → home_branch_id (idempotent DO block); ADD 26 new columns (first_name, last_name, customer_number, lifecycle_stage NOT NULL DEFAULT 'prospect', household_id, health_fund_id, language_code NOT NULL DEFAULT 'he', gender, profession, dominant_eye, 4 consent booleans, source, utm_*×6, first_interaction_at, consent_form_signed_at, is_deleted NOT NULL DEFAULT false, deleted_at, updated_by). | success |
| 6 | `M5_06_households` | CREATE TABLE households + RLS canonical 2-policy + 2 indexes. | success |
| 7 | `M5_07_health_funds` | CREATE TABLE health_funds + RLS + 1 index + seed 10 rows (5 demo + 5 prizma). | success |
| 8 | `M5_08_tenant_languages` | CREATE TABLE tenant_languages + RLS + tenant_id idx + one-default-per-tenant partial UNIQUE + seed 8 rows. | success |
| 9 | `M5_09_customers_fks_uniques` | ADD FK customers.home_branch_id→tenant_location, household_id→households, health_fund_id→health_funds; back-FK households.primary_customer_id→customers. Tenant-scoped partial UNIQUE on customer_number, phone, id_number. 5 lookup indexes. | success |
| 10 | `M5_10_customer_notes` | CREATE TABLE customer_notes + RLS + 2 indexes. | success |
| 11 | `M5_11_customer_documents` | CREATE TABLE customer_documents + RLS + 2 indexes. | success |
| 12 | `M5_12_tenant_settings` | CREATE TABLE tenant_settings + RLS + UNIQUE(tenant_id). | success |
| 13a | `M5_13_create_customer_rpc` | CREATE OR REPLACE FUNCTION create_customer(uuid, jsonb) — Block A header + dedup (id_number, phone) + allocate_tenant_number + INSERT. REVOKE anon/PUBLIC, GRANT authenticated/service_role. | success |
| 13b | `M5_13_merge_customers_rpc` | CREATE OR REPLACE FUNCTION merge_customers(uuid, uuid, uuid) — Block A + reassign incoming FKs (customer_notes, customer_documents, prescriptions, work_orders, households.primary_customer_id) + soft-delete secondary. | success |
| 13c | `M5_13_assign_to_household_rpc` | CREATE OR REPLACE FUNCTION assign_to_household(uuid, uuid, uuid) — Block A + cross-tenant guard on both ends + UPDATE. | success |
| 13d | `M5_13_delete_last_unused_customer_rpc` | CREATE OR REPLACE FUNCTION delete_last_unused_customer(uuid, uuid) RETURNS boolean — Block A + FOR UPDATE on counter + max-check + zero-FK check + DELETE + counter decrement. Iron Rule 32. | success |
| 13e | `M5_13_update_display_prefs_rpc` | CREATE OR REPLACE FUNCTION update_customer_display_preferences(uuid, jsonb) — Block A + INSERT ... ON CONFLICT (tenant_id) DO UPDATE on tenant_settings. | success |
| 14 | `M5_14_lifecycle_functions` | CREATE OR REPLACE FUNCTION compute_lifecycle_stage_on_order() trigger function (NOT attached to any table yet — M7 wires it) + compute_lifecycle_dormant_sweep() stub (NOT scheduled). | success |
| 15 | `M5_15_views` | CREATE OR REPLACE VIEW × 7 — v_customer_for_exam, _for_order, _for_payment, _full, _for_messaging, _for_loyalty, _for_appointment. All WITH (security_invoker = on). | success |

**Total:** 19 MCP `apply_migration` calls, all successful. No rollbacks required.

**Idempotency:** every migration uses `IF NOT EXISTS` / `OR REPLACE` / `DO $$ ... EXCEPTION duplicate_object ...` / `ON CONFLICT DO NOTHING`. Re-running any migration is safe.

**Deferred (NOT applied this run):**
- Cron schedule for `compute_lifecycle_dormant_sweep` — deferred until orders exist (M7).
- TRIGGER ATTACHMENT of `compute_lifecycle_stage_on_order` to a future orders table — M7 SPEC attaches.
- `v_customer_prescriptions_summary` view — M6 SPEC owns it.
- `v_customer_queue_position` view — M14 deferred indefinitely (M14 not built).
