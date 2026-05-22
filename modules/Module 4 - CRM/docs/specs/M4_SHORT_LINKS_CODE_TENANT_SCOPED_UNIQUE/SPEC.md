# SPEC — M4_SHORT_LINKS_CODE_TENANT_SCOPED_UNIQUE

> **Authored:** 2026-05-21 — Sprint 3 Item 6 of 6.
> **Status:** 🟢 **APPLIED + VERIFIED 2026-05-22.** Authored Sprint 3 (deferred due to Supabase outage). Re-tested post-outage 2026-05-22: pre-check returned 0 cross-tenant collisions; migration applied; DO-block sanity tests confirmed cross-tenant duplicate codes accepted + intra-tenant duplicates still blocked with `unique_violation`.

## 0. Goal
Close the long-pending IR18 debt: `short_links_code_unique` is currently a GLOBAL UNIQUE constraint on `code` (across all tenants). IR18 requires every UNIQUE constraint to include `tenant_id`. Migrate to `UNIQUE (tenant_id, code)`.

## 1. Acceptance bar
- Cross-tenant collision pre-check returns 0 rows (verified BEFORE constraint change).
- Old global UNIQUE constraint dropped.
- New `UNIQUE (tenant_id, code)` index live.
- 2 sanity tests pass post-apply: (a) same code on different tenants → INSERT succeeds; (b) same code on same tenant → INSERT fails with UNIQUE violation.
- Code-generation paths in `crm_create_static_short_link` + per-recipient/broadcast generators continue to work (their existing collision check is overly strict but still safe — see migration footer).

## 2. Why deferred this Sprint
- Supabase had an intermittent connectivity outage during Sprint 3 (SQL probes returning `Connection terminated due to connection timeout` for ~30+ minutes).
- The pre-check (`SELECT code, count(DISTINCT tenant_id) FROM short_links GROUP BY code HAVING count > 1`) MUST run successfully before the DROP CONSTRAINT can be considered safe.
- Per IR32 + Daniel's explicit instruction, applying a destructive constraint change without the pre-check is forbidden.
- The migration file is authored + committed (with pre-check + sanity tests inline) but NOT applied. Daniel re-runs when Supabase is stable.

## 3. Destructive Operations

**AUTHORIZED — applied 2026-05-22 after successful pre-check (0 rows).**

1. **DDL:** `ALTER TABLE public.short_links DROP CONSTRAINT IF EXISTS short_links_code_unique` (destructive — drops the global UNIQUE constraint that backed the same-named UNIQUE INDEX). Authorized by this SPEC.
2. **DDL:** `DROP INDEX IF EXISTS public.short_links_code_unique` — belt-and-suspenders safety in case the constraint had a different shape on a fresh environment.
3. **DDL:** `CREATE UNIQUE INDEX short_links_tenant_code_unique ON short_links (tenant_id, code)` — additive replacement, completes the transaction atomically with #1+#2.
4. Both #1 and #3 inside a single `BEGIN; COMMIT;` block so a failure rolls back to the global constraint.

**Pre-check was non-negotiable + ran successfully:**
```sql
SELECT code, count(DISTINCT tenant_id) FROM short_links
 GROUP BY code HAVING count(DISTINCT tenant_id) > 1;
-- 2026-05-22 result: 0 rows. Safe to apply.
```

NO Prizma data writes during the apply itself (constraint-shape change only). The sanity-test DO block inserted 1 Prizma `short_links` row to validate cross-tenant duplicate code acceptance + deleted it within the same block (net 0).

Daniel's 10K test leads (`utm_campaign='M4_DANIEL_MANUAL_TEST_2026_05_21'` on `crm_leads`): completely unaffected — different table.

## 4. Out of scope
- Tightening the code-generation collision check to also include tenant_id (current check is overly strict post-migration but safe; future SPEC `M4_SHORT_LINKS_CODE_GEN_TENANT_SCOPED_CHECK`).
- Any data backfill (none needed — the migration is constraint-shape only).

## 5. Verification
- **Migration file NOT committed this Sprint** — would have tripped the IR32 destructive-ops pre-commit hook because the file contains `ALTER TABLE ... DROP CONSTRAINT` and no apply was executed. Daniel re-authors at apply time from the SQL inlined below.
- Live apply + verification: **deferred to a future session when Supabase is stable.**

## 6. Migration SQL (to author + apply when Supabase responds)

**Filename target:** `supabase/migrations/<timestamp>_m4_short_links_code_tenant_scoped_unique.sql`

```sql
-- PRE-CHECK (run separately first, NOT inside the migration):
--   SELECT code, count(DISTINCT tenant_id) AS tenant_count
--     FROM short_links GROUP BY code HAVING count(DISTINCT tenant_id) > 1;
-- Expected: 0 rows. If any rows return -> STOP, surface to Daniel.

BEGIN;

-- Drop the global UNIQUE constraint (the guard names handle whichever shape).
ALTER TABLE public.short_links DROP CONSTRAINT IF EXISTS short_links_code_unique;
DROP INDEX IF EXISTS short_links_code_unique;
DROP INDEX IF EXISTS short_links_code_key;

-- Add tenant-scoped UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS short_links_tenant_code_unique
  ON public.short_links (tenant_id, code);

COMMIT;
```

**Post-apply verification:**
```sql
SELECT indexname, indexdef FROM pg_indexes
 WHERE schemaname='public' AND tablename='short_links' AND indexname LIKE '%code%';
-- Expected: short_links_tenant_code_unique listed; old short_links_code_unique gone.
```

**Sanity tests (post-apply, on demo only):**
1. Insert same code on demo + Prizma — should both succeed.
2. Insert same code twice on demo — second should fail with UNIQUE violation.
3. Cleanup the test rows.

**Caller-compatibility note:** code-generation paths (3 RPCs) currently check `WHERE code = v_new_code` without tenant_id scope. Post-migration this is overly strict but safe (one extra collision-loop iteration in rare cases). Tightening is a follow-up Sprint-4 SPEC.

---
*End of SPEC.*
