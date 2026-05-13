-- =============================================================================
-- Migration: consume_status_change_events pg_cron schedule
-- SPEC: modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/SPEC.md
-- Date: 2026-05-13
-- =============================================================================
-- Schedules the per-tenant consumer that drains crm_status_change_events
-- every minute. Mirrors daily-alert-generation's per-tenant DO block with
-- EXCEPTION isolation pattern (each tenant's failure is logged but does NOT
-- block other tenants).
--
-- Calls automation-engine EF with body = { tenant_id, mode: 'consume_status_events', limit: 100 }
-- and the anon JWT in Authorization header (same path event_day_status_flip
-- and event_2_3d_before_status_flip use).
-- =============================================================================

SELECT cron.schedule(
  'consume_status_change_events',
  '* * * * *',
$cron$
DO $DO$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM tenants WHERE is_active = true LOOP
    BEGIN
      PERFORM net.http_post(
        url := 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/automation-engine',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU'
        ),
        body := jsonb_build_object(
          'tenant_id', t.id::text,
          'mode','consume_status_events',
          'limit', 100
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'consume_status_change_events failed for tenant %: %', t.id, SQLERRM;
      -- Continue to next tenant -- NEVER let one tenant block others.
    END;
  END LOOP;
END;
$DO$;
$cron$
);
