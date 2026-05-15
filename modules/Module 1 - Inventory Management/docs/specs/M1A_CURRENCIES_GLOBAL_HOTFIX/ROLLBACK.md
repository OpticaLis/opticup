# ROLLBACK — M1A Currencies Global Hotfix

> **Apply via Supabase MCP `apply_migration` with name `m1a_currencies_global_hotfix_rollback`.**
> **Prerequisites:** repo on `develop`, no FK consumers yet (still 0 — verify before rollback). Reverts both the schema and the seed in one transaction.

This file lives inside the SPEC folder per Iron Rule 32 doc-file exemption. See SPEC §6 for the rationale and step-by-step.

---

## Pre-rollback verification (MANDATORY)

Run this first:

```sql
SELECT
  (SELECT count(*) FROM public.currencies) AS rows_now,
  (SELECT count(*) FROM pg_constraint WHERE contype='f' AND confrelid='public.currencies'::regclass) AS incoming_fks_now;
```

Expected: `rows_now=3, incoming_fks_now=0`. If `incoming_fks_now > 0`, STOP — there are consumers; rollback would orphan their FK targets. Escalate to Foreman.

---

## DOWN SQL

```sql
-- M1A-DEBT-01 ROLLBACK: revert currencies back to per-tenant shape.

-- 1. Clear the global seed (3 rows). Scope-safe — single global table.
DELETE FROM public.currencies;

-- 2. Drop the new RLS policies.
DROP POLICY IF EXISTS "read_anywhere" ON public.currencies;
DROP POLICY IF EXISTS "write_platform_only" ON public.currencies;
DROP POLICY IF EXISTS "update_platform_only" ON public.currencies;
DROP POLICY IF EXISTS "delete_platform_only" ON public.currencies;
DROP POLICY IF EXISTS "service_bypass" ON public.currencies;

-- 3. Drop the new PK on code.
ALTER TABLE public.currencies DROP CONSTRAINT IF EXISTS currencies_pkey;

-- 4. Drop the new column.
ALTER TABLE public.currencies DROP COLUMN IF EXISTS decimal_digits;

-- 5. Restore legacy id PK column (UUID).
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE public.currencies SET id = gen_random_uuid() WHERE id IS NULL;  -- no-op (table empty after step 1)
ALTER TABLE public.currencies ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.currencies ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);

-- 6. Restore tenant_id FK column.
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.currencies ALTER COLUMN tenant_id SET NOT NULL;  -- table empty — safe
ALTER TABLE public.currencies ADD CONSTRAINT currencies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE public.currencies ADD CONSTRAINT currencies_tenant_id_code_key UNIQUE (tenant_id, code);

-- 7. Restore is_default column.
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 8. Restore tenant_isolation + service_bypass policies (canonical Phase 1A pattern).
CREATE POLICY "tenant_isolation" ON public.currencies
  FOR ALL
  USING (tenant_id = ((current_setting('request.jwt.claims', true))::json ->> 'tenant_id')::uuid);

CREATE POLICY "service_bypass" ON public.currencies
  FOR ALL
  TO service_role
  USING (true);

-- 9. Restore the previous table comment (or empty it).
COMMENT ON TABLE public.currencies IS NULL;
```

---

## Git rollback (after DB rollback)

Reverse-revert the 4 work commits in this order (work commits 1-3 + retro commit):

```
git log bb341fb..HEAD --oneline      # confirm the 4 commit hashes
git revert <retro-commit-hash> <commit-3-hash> <commit-2-hash> <commit-1-hash>
git push origin develop
```

Then mark the SPEC as REOPEN (not CLOSED) in the Foreman review and re-evaluate scope.
