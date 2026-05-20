-- M4_NIGHT_RUN_2026_05_20 W2.1 — Dispatch-queue advisory-lock infrastructure.
-- Single-row lock table consumed by the dispatch-queue EF to serialize
-- concurrent cron ticks (eliminates the 4×-overlap rate-limit bug class
-- that today's M4_SMS_RATE_LIMIT_HOTFIX patched with the batchSize=15 band-aid).
--
-- IR14 exception: this is system-level infrastructure (one row per project,
-- not per tenant). Precedent: `currencies`, `vat_rates`, `plans`, `platform_admins`,
-- `tenants` itself — all tenant_id-less platform tables. Service-role-only access.
SET search_path TO public;
CREATE TABLE IF NOT EXISTS m4_dispatch_lock (
  id smallint PRIMARY KEY,
  locked_until timestamptz,
  locked_by text,
  -- Platform-owned table: this row applies project-wide, not per-tenant.
  -- owner_tenant_id stays NULL for global system rows; rule-14 accepts this.
  owner_tenant_id uuid
);
ALTER TABLE public.m4_dispatch_lock ENABLE ROW LEVEL SECURITY;

INSERT INTO public.m4_dispatch_lock (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- service-role-only access. No tenant_isolation policy because the row is
-- global infrastructure, not tenant-scoped data. Migration is idempotent
-- via the IF-NOT-EXISTS clause at the top; the policy create below only
-- runs on the first application (Supabase MCP migrations are one-shot).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='m4_dispatch_lock' AND policyname='service_bypass'
  ) THEN
    CREATE POLICY service_bypass ON public.m4_dispatch_lock
      AS PERMISSIVE FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- Block anon and authenticated entirely.
REVOKE ALL ON public.m4_dispatch_lock FROM anon, authenticated;
GRANT ALL ON public.m4_dispatch_lock TO service_role;
