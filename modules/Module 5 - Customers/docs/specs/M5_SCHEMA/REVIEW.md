# M5_SCHEMA — Reviewer Pass

> **Role:** opticup-reviewer (code review + security audit + Iron Rule compliance)
> **Run:** 2026-05-22 overnight chain close
> **Subject:** all DDL + RPCs + Views in `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/` + delta in `js/shared.js`

## Iron Rule conformance audit

| Rule | Status | Notes |
|---|---|---|
| 1 (atomicity) | ✅ | All 5 RPCs are single-transaction. `delete_last_unused_customer` uses FOR UPDATE on the counter row; serialization correct. |
| 2 (writeLog) | N/A | No quantity/price changes in this SPEC. |
| 3 (soft-delete) | ✅ | All new tables have is_deleted+deleted_at. `delete_last_unused_customer` is the explicit hard-delete exception per Iron Rule 32. |
| 4 (barcodes) | N/A | |
| 5 (FIELD_MAP) | ⚠️ partial | The project's shared.js has `T` constants (table-name registry) but no separate FIELD_MAP yet. M5 added 8 T-constants. The historical "FIELD_MAP" concept is not implemented in this repo today; the T-constant approach is the de facto pattern. **Recommend:** Foreman convene to either (a) introduce FIELD_MAP if it's still required by Iron Rule 5, or (b) update Iron Rule 5 to reflect the T-constant pattern as canonical. |
| 6 (index.html stays in root) | N/A | |
| 7 (API abstraction via shared.js) | N/A | No client code added in this SPEC (schema-only). |
| 8 (XSS/sanitization) | N/A | No UI added. |
| 9 (no hardcoded business values) | ✅ | All values configurable: tenant_code via tenants table, branch_code via tenant_location.short_code, languages via tenant_languages, health funds via health_funds table. |
| 10 (global name collision check) | ✅ | Cross-Reference Check §0 in SPEC. 0 hard collisions; 3 expected extensions documented. |
| 11 (sequential number allocation) | ✅ | `allocate_tenant_number` + `tenant_number_counters` + FOR UPDATE pattern. M-S2 verified contiguous. M-S7 verified counter decrement on hard-delete. |
| 12 (file size ≤300/350) | N/A | DDL files don't exist; migrations are MCP-applied. SPEC.md and module docs all under 350 lines of meaningful content (SPEC is longer because it's a SPEC, not a code file). |
| 13 (Views-only for external reads) | ✅ | 7 customer Views defined; consumers (M6/M7/M8/M11/M12/M13) will read through Views, not direct table access. |
| 14 (tenant_id on every table) | ✅ | 7/7 new tables have tenant_id NOT NULL FK. customers already had it. |
| 15 (canonical RLS pattern) | ✅ | service_bypass + tenant_isolation (JWT-claim) on all 8 tables. Verified via pg_policy probe (16 policies). No auth.uid() anywhere. |
| 16 (contracts between modules) | ✅ | The cross-module surface for customers is the 7 Views + 5 RPCs. Other modules will not access `public.customers` directly per the contract. |
| 17 (Views for external access) | ✅ | Customer-data Views built per consumer-module needs (M6/M7/M8/M11/M12/M13/M14). 2 deferred (M6+M14) documented. |
| 18 (UNIQUE includes tenant_id) | ✅ | 6 partial UNIQUE indexes all include tenant_id. customer_number, phone, id_number partial; health_funds.code, tenant_languages.language_code, tenant_languages one-default-per-tenant. |
| 19 (configurable=tables) | ✅ | health_funds, tenant_languages = tables. Enums used only for bounded internal state-machines (lifecycle_stage, household_status, note_type, document_category). |
| 20 (SaaS litmus) | ✅ | Second tenant = adding a `tenants` row + tenant_code + 4 tenant_languages + 5 health_funds seed. Zero code changes. Verified by the fact that both demo + prizma got the same seeds in one migration. |
| 21 (no orphans, no duplicates) | ✅ | Customers existing stub EXTENDED (not duplicated). tenant_location used as branches (not duplicated). tenant_code added to tenants (not a parallel tenant_codes table). |
| 22 (defense-in-depth) | ✅ | All RPC INSERT/UPDATE include `tenant_id = p_tenant_id` explicit filter. JWT-claim check is the second layer. |
| 23 (no secrets) | ✅ | Visual scan of all DDL + RPC bodies confirms no credentials, keys, or PINs. |
| 31 (Integrity Gate) | ⏳ | Run at commit-time; not invocable from MCP. |
| 32 (Destructive Ops) | ✅ | SPEC declared "None." Confirmed in run: no DROP, no TRUNCATE, no DELETE-without-tenant-scope. The single RENAME COLUMN (branch_id→home_branch_id) is structural, not destructive per Iron Rule 32's enumerated list. |

## Security audit

- **JWT validation:** All 8 functions (5 RPCs + helper + 2 deferred-triggers) use the canonical Block A header from `JWT_VALIDATION_HEADER.sql`. No hand-rolled variants. NULL-comparison loophole (`p_tenant_id != NULL`) absent.
- **Grant pattern:** REVOKE EXECUTE FROM anon, PUBLIC + GRANT EXECUTE TO authenticated, service_role applied to every customer-facing RPC. Trigger functions GRANT only to service_role (not exposed via PostgREST in a meaningful way).
- **RLS pattern:** Canonical 2-policy (service_bypass + tenant_isolation JWT-claim) on every new table. Re-applied on `customers` (already had it).
- **Cross-tenant guards:** Smoke S8 verified — create_customer with mismatched tenant_id raises 42501. Verified across all 5 RPCs.
- **Anon-reject:** Smoke S9 verified — all 5 RPCs raise 42501 when JWT role=anon.
- **Defense-in-depth:** Every RPC body verifies `tenant_id = p_tenant_id` in addition to the JWT check.

## Supabase advisors

- **HIGH/ERROR new lints:** 0 (per the get_advisors probe + grep).
- **WARN new lints:** 8 `authenticated_security_definer_function_executable` on the new RPCs. This is a project-wide pattern (matches next_box_number, get_low_stock_brands, all M4 RPCs, etc.) — not a regression. The lint is informational about authenticated SECURITY DEFINER functions being callable via PostgREST — which is the intended PIN-auth + JWT-claim model.

## Code quality

- **Naming:** All names project-conformant (snake_case, descriptive, no abbreviations beyond standard ones).
- **Idempotency:** All migrations use IF NOT EXISTS / OR REPLACE / DO blocks with duplicate_object handler / ON CONFLICT DO NOTHING. Safe to re-run.
- **Documentation:** SPEC §0 documents every probe finding + decision. MIGRATION.md logs each MCP migration with summary. TEST_REPORT.md captures all 9 smoke cases.

## Smoke results

- M5 functional smoke: 9/9 PASS (TEST_REPORT.md)
- Advisors clean: 0 new HIGH/ERROR (8 WARN matching project pattern)
- No Prizma data writes ✅

## Verdict

**🟢 PASS.** No reopener-class issues. The shared.js FIELD_MAP discrepancy noted is project-wide policy, not an M5 SPEC failure. Recommend closing M5_SCHEMA as 🟢 in FOREMAN_REVIEW.
