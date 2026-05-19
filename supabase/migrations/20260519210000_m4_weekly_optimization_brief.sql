-- Migration: m4_weekly_optimization_brief
-- SPEC: M4_WEEKLY_OPTIMIZATION_BRIEF (Deliverable B of FUNNEL Phase 2.5)
-- Iron Rules: 14 (tenant_id), 15 (RLS canonical 2-policy), 18 (UNIQUE includes tenant_id), 32 (0 destructive ops)

-- ─── TABLE ───────────────────────────────────────────────────────────────────

CREATE TABLE funnel_weekly_briefs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid        NOT NULL REFERENCES tenants(id),
  week_start         date        NOT NULL,
  generated_at       timestamptz NOT NULL DEFAULT now(),
  summary            text        NOT NULL,
  improvements       jsonb       NOT NULL DEFAULT '[]',
  concerns           jsonb       NOT NULL DEFAULT '[]',
  steady             jsonb       NOT NULL DEFAULT '[]',
  metric_snapshot    jsonb       NOT NULL DEFAULT '{}',
  classifier_version text        NOT NULL DEFAULT 'v1-deterministic',
  CONSTRAINT funnel_weekly_briefs_tenant_week_uniq UNIQUE (tenant_id, week_start)
);

-- Index for fast recent-history lookups (EF reads last 4 rows per tenant)
CREATE INDEX idx_funnel_weekly_briefs_tenant_week
  ON public.funnel_weekly_briefs (tenant_id, week_start DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.funnel_weekly_briefs ENABLE ROW LEVEL SECURITY;

-- Policy 1: service_role bypasses RLS (trusted internal access)
CREATE POLICY service_bypass ON public.funnel_weekly_briefs
  TO service_role
  USING (true);

-- Policy 2: tenant isolation via JWT claim (canonical pattern per CLAUDE.md §5)
CREATE POLICY tenant_isolation ON public.funnel_weekly_briefs
  TO public
  USING (
    tenant_id = (
      (current_setting('request.jwt.claims'::text, true)::json ->> 'tenant_id'::text)::uuid
    )
  );

-- ─── CRON JOB ────────────────────────────────────────────────────────────────
-- Schedule: Sunday 03:00 UTC = ~06:00 IST (summer / DST) per D-AUTH-3
-- EF iterates active tenants internally; no per-tenant loop needed here

SELECT cron.schedule(
  'weekly_funnel_brief_generation',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/weekly-funnel-brief',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU'
    ),
    body := '{}'::jsonb
  )
  $$
);
