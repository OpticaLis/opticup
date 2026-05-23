# M5_SCHEMA — Functional Smoke Test Report

> **Run:** 2026-05-22 overnight chain. **Tenant:** demo (8d8cfa7e-ef58-49af-9702-a862d459cccb).
> **Status:** **9/9 PASS** ✅

## Verification matrix

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| S1 | `create_customer` happy path | Returns (customer_id, customer_number=1, created=true, lifecycle='prospect'). Customer row visible. | customer_id=8fcc5610-9cb8-42bc-8773-6122d6e0f962, customer_number=1, full_name='דניאל לוי' composed from first_name+last_name, lifecycle_stage='prospect', home_branch_id matches STA. | ✅ |
| S2 | `customer_number` atomic allocation (3 calls) | Returns contiguous numbers; counter increments to last. | S2A→2, S2B→3, S2C→4, counter.last_value=4. Contiguous. | ✅ |
| S3 | Dedup on duplicate phone | Returns same customer_id, created=false, reason='phone_exists'. | Called with +972501111111 (S1's phone) → returned S1's id with created=false, reason=phone_exists. | ✅ |
| S4 | Dedup on duplicate id_number | Second call with same id_number returns same id, reason='id_number_exists'. | id_number=123456789 used twice → v_id1=v_id2, reason=id_number_exists. | ✅ |
| S5 | `merge_customers` reassigns children | Notes move from secondary to primary; secondary is_deleted=true. | 2 customer_notes moved to primary; secondary.is_deleted=true. | ✅ |
| S6 | `assign_to_household` happy path | customer.household_id matches new household. | After call, customers.household_id = new household.id. | ✅ |
| S7 | `delete_last_unused_customer` part 1: succeeds for max + zero FK | Returns TRUE, customer hard-deleted, counter decremented by 1. | First call returned TRUE; counter decremented from N → N-1. | ✅ |
| S7 | `delete_last_unused_customer` part 2: fails when FK exists | Returns FALSE, customer remains. | Second call (with customer_note FK present) returned FALSE; customer still exists. | ✅ |
| S8 | Cross-tenant guard (RPC + RLS) | `create_customer(prizma_tenant_id, ...)` from demo session raises 42501. | RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' with ERRCODE 42501 caught. RLS structurally verified via pg_policy: tenant_isolation USING JWT-claim present on all 8 new + extended tables. | ✅ |
| S9 | Anon reject on all 5 RPCs | All 5 raise 42501 when role='anon' in JWT claims. | 5/5 raised 42501: create_customer, merge_customers, assign_to_household, delete_last_unused_customer, update_customer_display_preferences. | ✅ |

## Final demo state after smoke

| Metric | Value |
|---|---|
| demo `customers` is_deleted=false | 8 |
| demo `customers` is_deleted=true (S5 secondary) | 1 |
| `tenant_number_counters` last_value for entity_kind='customer' on demo | 9 |
| prizma `customers` rows (must be 0) | 0 ✅ |
| `customer_notes` rows for primary in S5 | 2 ✅ |
| `households` rows on demo (S6's only) | 1 |

## Side-checks performed

- `tenants.tenant_code` backfilled: demo='02', prizma='01' ✅
- `tenant_location.deactivated_at` column added (nullable) ✅
- 8 tables with RLS=true + 2 canonical policies (service_bypass + tenant_isolation) ✅
- 7 customer views all `security_invoker=on` ✅
- 8 functions all SECURITY DEFINER + `SET search_path TO 'public'` + REVOKE anon/PUBLIC + GRANT authenticated/service_role ✅
- Seed: 8 tenant_languages (4 per tenant) + 10 health_funds (5 per tenant) ✅
- Supabase advisors security: **0 NEW HIGH/ERROR** lints. 8 WARN lints (`authenticated_security_definer_function_executable`) — same pattern as existing project RPCs (e.g., next_box_number, get_low_stock_brands). Not a regression.
- No Prizma `customers` / `customer_notes` / `customer_documents` writes (smoke runs on demo only). ✅

## Iron Rule conformance

| Rule | Conformance |
|---|---|
| 1 — atomic RPCs | `create_customer` is atomic (single transaction; INSERT after dedup + allocate); `merge_customers` is atomic (single UPDATE wave + soft-delete); `delete_last_unused_customer` is atomic (FOR UPDATE + checks + DELETE + counter decrement). |
| 11 — sequential allocation via atomic FOR UPDATE | `allocate_tenant_number` uses INSERT ... ON CONFLICT DO UPDATE ... RETURNING (row-level lock equivalent). `delete_last_unused_customer` uses explicit FOR UPDATE on the counter row to serialize against allocate. S2 proved contiguous allocation. |
| 14 — tenant_id NOT NULL on every new table | 7/7 new tables have `tenant_id uuid NOT NULL REFERENCES public.tenants(id)`. customers (existing) already had it. |
| 15 — canonical 2-policy RLS | service_bypass (service_role USING true) + tenant_isolation (public USING JWT-claim) — verified on all 8 tables. |
| 18 — UNIQUE constraints tenant-scoped | customers (customer_number, tenant_id), customers (phone, tenant_id) WHERE phone IS NOT NULL AND is_deleted=false, customers (id_number, tenant_id) WHERE id_number IS NOT NULL AND is_deleted=false, health_funds (code, tenant_id), tenant_languages (language_code, tenant_id), tenant_settings (tenant_id). All tenant-scoped. |
| 19 — configurable values = tables, not enums | health_funds, tenant_languages = tables. customer_lifecycle_stage, household_status, customer_note_type, customer_document_category = enums (bounded state-machines, internal). |
| 22 — defense-in-depth on writes | Every RPC INSERT/UPDATE filters by `tenant_id = p_tenant_id` in addition to RLS. JWT-claim check in Block A is the second layer; explicit tenant_id pass is the first. |
| 23 — no secrets | No secrets introduced. |
| 31 — Integrity Gate | `npm run verify:integrity` not run from MCP context. Will be run as part of the commit phase by the local runner. |
| 32 — Destructive Operations declared "None." | No DROP, no TRUNCATE, no DELETE-without-tenant-scope was issued. The single RENAME COLUMN (branch_id→home_branch_id) is structural not destructive per Iron Rule 32's enumerated list. |
