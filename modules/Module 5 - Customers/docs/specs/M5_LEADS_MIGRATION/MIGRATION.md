# M5_LEADS_MIGRATION — Applied Migrations Log

> Project `tsxrrxzmdxaenlvocyit`. Applied 2026-05-23 NIGHT_RUN chain Track 2.

| # | Name | Summary | Status |
|---|---|---|---|
| 1 | `M5_T2_01_lifecycle_lead_enum` | ALTER TYPE customer_lifecycle_stage ADD VALUE 'lead' (idempotent IF NOT EXISTS) | success |
| 2 | `M5_T2_02_source_crm_lead_id_col` | ALTER customers ADD COLUMN source_crm_lead_id uuid REFERENCES crm_leads(id) + COMMENT + partial UNIQUE index `(source_crm_lead_id, tenant_id) WHERE source_crm_lead_id IS NOT NULL` | success |
| 3 | `M5_T2_03_migrate_crm_leads_rpc` | CREATE OR REPLACE `migrate_crm_leads_to_customers(p_tenant_id uuid)` — service_role-only, Block A guard, idempotent (skip-if-already-migrated), phone-dedup (LINK existing customer or INSERT new with lifecycle='lead' + allocate_tenant_number) | success |

## Demo migration (executed 2026-05-23)

Result: `{total_leads_scanned: 4, inserted_as_new_customer: 4, linked_to_existing_customer: 0, skipped_already_migrated: 0}`

Note: demo crm_leads has 28 total rows but only 4 with `is_deleted=false`. The migration RPC scopes to non-deleted only — the 24 soft-deleted leads are correctly excluded. Brief §3 number "28" came from total count; "4 active" is correct migration scope.

## Prizma migration (executed 2026-05-23, gated by demo smoke 5/5 + backup notes)

Result: `{total_leads_scanned: 1296, inserted_as_new_customer: 1296, linked_to_existing_customer: 0, skipped_already_migrated: 0}`

Note: Prizma crm_leads has 1354 total but 1296 active. Migration produced 1296 new lead-lifecycle customers. Brief §3 number "1354" was the total; "1296 active" is correct migration scope.

## Post-migration state

| Metric | Demo | Prizma |
|---|---|---|
| crm_leads total | 28 (unchanged) | 1354 (unchanged) |
| crm_leads active | 4 (unchanged) | 1296 (unchanged) |
| customers (active) | 19 | 1296 |
| customers WHERE lifecycle_stage='lead' | 4 | 1296 |
| customers WHERE source_crm_lead_id IS NOT NULL | 4 (via T2-S2 re-link) | 1296 |
| 9 crm_leads FK tables | intact | intact |
| M4 demo write test | PASS | (not tested on prizma — no smoke writes on prizma per Brief scope) |

**Total:** 3 MCP migrations + 1 demo RPC call + 1 Prizma RPC call. All additive. No DROP. No DELETE.
