-- ============================================================
-- Phase 5.5c: pg_cron daily alert generation with fault isolation
-- Runs daily at 08:00 Israel time (05:00 UTC)
-- Each tenant processes in its own exception block:
--   one corrupt tenant NEVER blocks others.
-- ============================================================

-- Enable pg_cron extension (requires Pro plan or above on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily alert generation
SELECT cron.schedule(
  'daily-alert-generation',
  '0 5 * * *',
  $CRON$
  DO $DO$
  DECLARE
    t RECORD;
    v_total INTEGER := 0;
    v_failed INTEGER := 0;
  BEGIN
    FOR t IN SELECT id FROM tenants WHERE is_active = true LOOP
      BEGIN
        PERFORM generate_daily_alerts(t.id);
        v_total := v_total + 1;
      EXCEPTION WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE NOTICE 'Alert generation failed for tenant %: %', t.id, SQLERRM;
        -- Continue to next tenant — NEVER let one tenant block others
      END;
    END LOOP;
    RAISE NOTICE 'Daily alerts complete: % processed, % failed', v_total, v_failed;
  END;
  $DO$
  $CRON$
);
