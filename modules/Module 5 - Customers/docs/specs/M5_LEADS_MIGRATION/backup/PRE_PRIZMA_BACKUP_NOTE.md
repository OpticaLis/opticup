# Pre-Prizma Migration Backup — 2026-05-23

Demo smoke 5/5 PASS. Authorizing Prizma write.

## Pre-write state (live DB capture)
- Demo customers (post-T2-S2): 19 active, 4 lifecycle='lead', 4 linked via source_crm_lead_id
- Prizma customers: 0 (0 lifecycle='lead', 0 with source_crm_lead_id)
- Demo crm_leads: 28 total, 4 active (unchanged)
- Prizma crm_leads: 1354 total, 1296 active (unchanged)
- All 9 crm_leads FK tables intact

## Rollback statement (for emergency only — NOT auto-issued)
DELETE FROM customers WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND source_crm_lead_id IS NOT NULL;

## Pre-write counters
- tenant_number_counters demo customer: 19 (was 11; +4 from T2 migration + 4 from T1 smoke)
- tenant_number_counters prizma customer: 0 (will become 1296 after Prizma migration if no phone dedup matches)

Migration RPC is idempotent — re-runs are safe.
Authorized for Prizma execution.
