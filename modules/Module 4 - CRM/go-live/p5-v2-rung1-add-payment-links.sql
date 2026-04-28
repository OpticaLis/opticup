-- P5_V2_REBUILD_RUNG1_PLUMBING — add tenants.payment_links JSONB column
-- 2026-04-28 / opticup-executor under SPEC authorization.
--
-- Cross-tenant DDL (additive, NOT NULL with default '{}'::jsonb).
-- Demo seed deferred to a separate UPDATE after Daniel provides the URL value.
--
-- Rollback:
--   ALTER TABLE tenants DROP COLUMN payment_links;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS payment_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Verify (read-only, run separately):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='tenants' AND column_name='payment_links';
