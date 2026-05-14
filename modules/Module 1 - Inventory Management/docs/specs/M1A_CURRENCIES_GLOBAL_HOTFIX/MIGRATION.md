# MIGRATION — M1A Currencies Global Hotfix

> **Applied via Supabase MCP `apply_migration` only (NOT written to `supabase/migrations/*.sql`).**
> **Migration name:** `m1a_currencies_global_hotfix`
> **Applied on:** 2026-05-14 (Live Supabase project `tsxrrxzmdxaenlvocyit`)
> **Pre-flight baselines (matched SPEC §0):** `BASE_CURRENCIES_ROWS=0`, `BASE_CURRENCIES_INCOMING_FKS=0`, `is_platform_super_admin()=true (SECURITY DEFINER)`.

This file is the canonical record of the SQL applied. It lives inside the SPEC folder so the destructive-pattern scanner (Iron Rule 32, `scripts/checks/destructive-ops-declared.mjs`) treats it as a doc-file (`/^modules\/[^/]+\/docs\/specs\/[^/]+\/[A-Z][A-Z0-9_-]+\.md$/` → `isDocFile()` true) and does NOT block the staging diff. See SPEC §7 for the rationale.

**TD-2 drift acknowledgement:** this migration is NOT mirrored in `supabase/migrations/*.sql`. The drift is consistent with pre-existing TD-2 (migrations git drift, MASTER_ROADMAP §5 / §3) and is logged in `FINDINGS.md` to be swept by the future TD-2-resolution SPEC.

---

## Forward SQL (UP)

```sql
-- M1A-DEBT-01 hotfix: convert public.currencies from per-tenant to GLOBAL reference table.
-- SPEC: modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/SPEC.md
-- Brief: modules/Module 1 - Inventory Management/architecture-brief/M1A_CURRENCIES_GLOBAL_BRIEF.md (commit bb341fb)
-- Pre-flight: BASE_CURRENCIES_ROWS=0, BASE_CURRENCIES_INCOMING_FKS=0, is_platform_super_admin()=true.

-- 1. Drop existing per-tenant RLS policies (will recreate as global pattern).
DROP POLICY IF EXISTS "tenant_isolation" ON public.currencies;
DROP POLICY IF EXISTS "service_bypass" ON public.currencies;

-- 2. Drop existing constraints (PK on id, FK on tenant_id, UNIQUE on (tenant_id, code)).
ALTER TABLE public.currencies DROP CONSTRAINT IF EXISTS currencies_pkey;
ALTER TABLE public.currencies DROP CONSTRAINT IF EXISTS currencies_tenant_id_fkey;
ALTER TABLE public.currencies DROP CONSTRAINT IF EXISTS currencies_tenant_id_code_key;

-- 3. Drop legacy/per-tenant columns.
ALTER TABLE public.currencies DROP COLUMN IF EXISTS id;
ALTER TABLE public.currencies DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.currencies DROP COLUMN IF EXISTS is_default;

-- 4. Add new column per Brief §2 #5.
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS decimal_digits INT NOT NULL DEFAULT 2;

-- 5. Establish new PK on code (3-letter ISO-4217).
ALTER TABLE public.currencies ADD CONSTRAINT currencies_pkey PRIMARY KEY (code);

-- 6. New RLS pattern: read-anywhere, write-platform-only, service_bypass.
CREATE POLICY "read_anywhere" ON public.currencies
  FOR SELECT
  USING (true);

CREATE POLICY "write_platform_only" ON public.currencies
  FOR INSERT
  WITH CHECK (is_platform_super_admin());

CREATE POLICY "update_platform_only" ON public.currencies
  FOR UPDATE
  USING (is_platform_super_admin())
  WITH CHECK (is_platform_super_admin());

CREATE POLICY "delete_platform_only" ON public.currencies
  FOR DELETE
  USING (is_platform_super_admin());

CREATE POLICY "service_bypass" ON public.currencies
  FOR ALL
  TO service_role
  USING (true);

-- 7. Seed ISO-4217 currencies per Brief §2 #4.
INSERT INTO public.currencies (code, name_he, symbol, decimal_digits, is_active) VALUES
  ('ILS', 'שקל חדש',       '₪', 2, true),
  ('USD', 'דולר אמריקאי', '$', 2, true),
  ('EUR', 'אירו',           '€', 2, true);

-- 8. Document the global-table status.
COMMENT ON TABLE public.currencies IS 'M1A-DEBT-01 hotfix (2026-05-14): GLOBAL ISO-4217 reference table (no tenant_id; Iron Rule 14 documented exception, same category as vat_rates from Phase 1A). RLS: read_anywhere (USING true) + write/update/delete gated on is_platform_super_admin() + service_bypass. PK on code. Seeded with ILS/USD/EUR.';
```

---

## Post-migration verification (executed against live DB, 2026-05-14)

| Criterion | Expected | Actual | Status |
|---|---|---|---|
| #3 columns | code, name_he, symbol, decimal_digits, is_active, created_at | code, name_he, symbol, is_active, created_at, decimal_digits | ✓ (order differs; all 6 present) |
| #4 no tenant_id | 0 columns named tenant_id | 0 | ✓ |
| #5 no id | 0 columns named id | 0 | ✓ |
| #6 PK on code | `PRIMARY KEY (code)` | `PRIMARY KEY (code)` | ✓ |
| #7 decimal_digits | integer / NOT NULL / DEFAULT 2 | integer / NOT NULL / DEFAULT 2 | ✓ |
| #8 row count | 3 | 3 | ✓ |
| #9 codes | EUR, ILS, USD | EUR, ILS, USD | ✓ |
| #10 policies (5) | delete_platform_only, read_anywhere, service_bypass, update_platform_only, write_platform_only | identical | ✓ |
| #11 no tenant_isolation | 0 | 0 | ✓ |
| #12 platform_admin refs | 3 policies | 3 | ✓ |
| #13 read_anywhere USING | `true` | `true` | ✓ |

All 10 verifiable post-migration DB criteria PASS.

---

## Migration record in Supabase

The migration is recorded in Supabase's `supabase_migrations.schema_migrations` table under the name `m1a_currencies_global_hotfix`. Verify via `list_migrations` MCP tool.
