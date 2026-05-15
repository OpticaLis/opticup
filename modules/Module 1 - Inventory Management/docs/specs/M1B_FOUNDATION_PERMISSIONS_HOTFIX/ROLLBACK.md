# Rollback — M1B_FOUNDATION_PERMISSIONS_HOTFIX

**Trigger:** SPEC §5 stop-trigger fires mid-Pipeline, OR Reviewer flags 🔴, OR Foreman_review verdicts 🔴 REOPEN.

## Single rollback statement (covers both tenants, all 18 rows added by Phase B)

```sql
DELETE FROM public.role_permissions
WHERE permission_id IN ('lens.inventory.view', 'lens.designs.manage', 'lens.pricing.manage')
  AND tenant_id IN (
    '8d8cfa7e-ef58-49af-9702-a862d459cccb',  -- demo
    '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'   -- prizma
  );
```

Expected `DELETE 18` post-execution (or less if partial migration ran).

## Post-rollback verification

```sql
SELECT count(*) FROM public.role_permissions
WHERE permission_id LIKE 'lens.%';
-- expect 0
```

## Restoration of system state

After rollback, the 3 screens (`lens-inventory.html`, `lens-active-designs.html`, `lens-pricing.html`) revert to the pre-SPEC bug state — real-user PIN auth shows the "אין הרשאה למסך זה" message. This is expected because the SPEC's purpose is to add the missing assignments; rolling back returns to the broken pre-fix state.

Pre-existing data (the 6 `permissions` rows seeded by Foundation, and the 56-per-tenant baseline `role_permissions` rows) are NOT touched by this rollback — DELETE filters by `permission_id LIKE 'lens.%'` so only this SPEC's rows are removed.

## Smoke artifacts (sessions table)

Smoke Cases 2 + 3 mint JWTs via `pin-auth` EF, which inserts rows in `sessions` table (one per call). These artifacts naturally expire after 8h (per `js/auth-service.js:112` `expires_at`). NOT included in this rollback — M1A-DEBT-04 lineage handles cleanup.

## How to invoke

Via MCP `execute_sql` (Level 2 write, requires the same dispatched authorization that the apply_migration step used) OR via Supabase SQL editor by Daniel. No code changes are reversed because no code was changed in this SPEC.

---

*This SPEC is data-only; rollback is single-statement and recovers the entire pre-SPEC state for the touched tables.*
