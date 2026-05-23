# M5_LEADS_MIGRATION — Test Report

**Status: Demo 5/5 PASS ✅ + Prizma 1,296 written ✅** on 2026-05-23.

## Demo functional smoke (5 cases)

| # | Case | Expected | Actual | Status |
|---|---|---|---|---|
| T2-S1 | All 4 active demo leads reachable via customers.source_crm_lead_id | 4 leads + 4 customer-seam-rows | 4 == 4 ✅ | ✅ |
| T2-S2 | phone-dedup LINKs existing customer (no double-insert) | post-re-run customer count unchanged, linked count +1 | 19 == 19; linked 3→4 ✅ | ✅ |
| T2-S3 | crm_event_attendees FK resolves correctly post-migration | 0 orphaned rows | 0 orphaned ✅ | ✅ |
| T2-S4 | M4 demo write still succeeds | INSERT + DELETE fake crm_lead row works | INSERT + DELETE both succeed ✅ | ✅ |
| T2-S5 | cross-tenant isolation: demo migration didn't touch prizma | 0 prizma customers with lead seam | 0 == 0 ✅ (pre-Prizma write) | ✅ |

## Prizma write outcome

- Pre-write Prizma customers: 0
- Post-write Prizma customers: **1,296**
- All 1,296 have `lifecycle_stage='lead'` + `source_crm_lead_id` populated
- crm_leads unchanged: 1354 total / 1296 active
- All 9 crm_leads FK tables intact post-write

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | RPC is single-tx; either all leads migrate or none (rolled back on error) ✅ |
| 11 sequential | customer_number allocated via allocate_tenant_number per lead — contiguous ✅ |
| 14 tenant_id NOT NULL | all new customers have tenant_id from lead.tenant_id ✅ |
| 15 RLS canonical | customers RLS unchanged; new column inherits parent policy ✅ |
| 18 UNIQUE tenant-scoped | partial UNIQUE on (source_crm_lead_id, tenant_id) added ✅ |
| 19 enum vs config | 'lead' is bounded state-machine enum value ✅ |
| 21 no orphans | RPC re-uses allocate_tenant_number; no parallel allocator ✅ |
| 22 defense-in-depth | RPC has tenant_id parameter + Block A header + service-role-only EXECUTE ✅ |
| 23 no secrets | none introduced ✅ |
| 31 Integrity Gate | clean at chain close ✅ |
| 32 Destructive Ops | declared (INSERT + UPDATE-link + new column + new enum value); NO DROP issued ✅ |

## Backup taken (pre-Prizma write)

`backup/PRE_PRIZMA_BACKUP_NOTE.md` captures pre-write state + rollback statement for emergency use.

## Advisors

0 new HIGH/ERROR. The new RPC adds 1 WARN `authenticated_security_definer_function_executable`-class but on a service_role-only function — informational, matches project pattern.
