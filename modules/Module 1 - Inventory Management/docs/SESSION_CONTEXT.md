# Session Context

## Last Updated
Phase 3.75 complete — March 2026

## What Was Done This Session
Phase 3.75 — Multi-Tenancy Foundation — COMPLETE

Steps completed:
1. tenants table created, Prizma seeded (tenant_id: 6ad0781b-37f0-47a9-92e3-be9ed1477e1c)
2. tenant_id UUID NOT NULL added to all 20 tables + backfilled (13,457 rows)
3. 25 indexes created (20 single + 5 composite)
4. JWT-based RLS tenant_isolation policy on all 20 tables + service_bypass
5. Supabase Edge Function pin-auth deployed (PIN → signed JWT with tenant_id + authenticated role)
6. auth-service.js updated: verifyEmployeePIN() calls Edge Function, sb client recreated with JWT after login, loadSession() restores JWT client before querying auth_sessions
7. All JS writes updated: tenant_id injected in every .insert() and .upsert()
8. All JS reads updated: .eq('tenant_id', getTenantId()) on every .select()
9. getTenantId() added to shared.js
10. verifyPinOnly() added for mid-session PIN checks (non-login)
11. Full regression: 5/5 tests pass with real RLS active

Migration files: 017_tenants.sql, 018_add_tenant_id.sql, 019_tenant_id_constraints.sql, 020_rls_tenant_isolation.sql

## Current State
- RLS: JWT-based tenant isolation ACTIVE on all 20 tables
- Edge Function: pin-auth deployed at tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/pin-auth
- App: fully functional at opticalis.github.io/opticup/

## Open Issues
- JWT secret exposed in dev chat — must rotate before production (see CLAUDE.md warning)
- employees.html session sometimes lost when navigating from inventory.html after reload — inconsistent, monitor
- sync-watcher.js (Node.js) inserts not updated with tenant_id — deferred (separate runtime)
- Staging environment needed before second tenant onboards

## Next Phase
Phase 3.8 — Sticky header with tenant name/logo on all screens
Then Phase 4 — Supplier accounts payable

## Last Commits
- 017-020: DB migrations (tenants, tenant_id, constraints, RLS)
- a67c247: tenant_id to auth flow + getTenantId()
- 279e7b8: tenant_id to supabase-ops helpers
- ef5d714: tenant_id to employee-list inserts
- bdc5a6c: tenant_id to all remaining inserts (8 files)
- 0c8c423: tenant_id filter to data-loading selects
- bfb2c6f: tenant_id filter to access-sync selects
- 3b5f543: tenant_id filter to all remaining selects (7 files)
- c25f5e3: Edge Function integration + verifyPinOnly()
- 54139ef: loadSession JWT fix + Edge Function role claim fix
