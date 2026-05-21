# SPEC — M4_SHORT_LINKS_CODE_TENANT_SCOPED_UNIQUE

> **Authored:** 2026-05-21 — Sprint 3 Item 6 of 6.
> **Status:** 🟡 **AUTHORED ONLY — EXECUTION DEFERRED.** Supabase intermittent connectivity outage during this Sprint prevented the mandatory cross-tenant collision pre-check, which is the first gate per Daniel's instruction: "if any [collisions] exist, surface them and STOP before changing the constraint".

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
1. DDL: `ALTER TABLE short_links DROP CONSTRAINT short_links_code_unique` — destructive (drops a constraint).
2. DDL: `CREATE UNIQUE INDEX short_links_tenant_code_unique ON short_links (tenant_id, code)` — additive but interacts with #1.
3. Both wrapped in a single transaction so a failure rolls back to the global constraint.

**Pre-check is non-negotiable.** The migration file's header documents the exact pre-check query that must return 0 rows before apply.

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
