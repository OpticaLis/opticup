-- M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1 (2026-05-03)
-- Replace event_day_status_flip with augmented version: UPDATE + per-row
-- net.http_post to automation-engine EF (event_status_change /
-- newStatus='event_day'). Add sibling cron event_2_3d_before_status_flip
-- with the same pattern but filters event_date = today+3 and flips to
-- status='2_3d_before'. Both use the daily-alert-generation cron's
-- per-iteration EXCEPTION pattern so a failed EF call for one event never
-- blocks others (also matches CLAUDE.md §1 step 3a precedent for cron
-- isolation).
--
-- Pre-state of event_day_status_flip (captured 2026-05-03 pre-migration):
--   schedule: 30 5 * * *
--   command:
--     UPDATE crm_events
--     SET status = 'event_day'
--     WHERE event_date = (now() AT TIME ZONE 'Asia/Jerusalem')::date
--       AND status NOT IN ('event_day', 'planning', 'closed', 'completed')
--       AND is_deleted = false;
--
-- Anon JWT inlined in headers — same legacy JWT-format key already inlined
-- in supabase/functions/lead-intake/{index,dispatch}.ts and js/shared.js.
-- Required because automation-engine has verify_jwt=true.

SELECT cron.unschedule('event_day_status_flip');

SELECT cron.schedule(
  'event_day_status_flip',
  '30 5 * * *',
  $cron$
  DO $DO$
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN
      UPDATE crm_events
      SET status = 'event_day'
      WHERE event_date = (now() AT TIME ZONE 'Asia/Jerusalem')::date
        AND status NOT IN ('event_day','planning','closed','completed')
        AND is_deleted = false
      RETURNING id, tenant_id
    LOOP
      BEGIN
        PERFORM net.http_post(
          url := 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/automation-engine',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU'
          ),
          body := jsonb_build_object(
            'tenant_id', r.tenant_id::text,
            'trigger_type','event_status_change',
            'trigger_data', jsonb_build_object('eventId', r.id::text, 'newStatus','event_day'),
            'mode','dispatch'
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'automation-engine event_day call failed for event % (tenant %): %',
          r.id, r.tenant_id, SQLERRM;
      END;
    END LOOP;
  END;
  $DO$;
  $cron$
);

SELECT cron.schedule(
  'event_2_3d_before_status_flip',
  '30 5 * * *',
  $cron$
  DO $DO$
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN
      UPDATE crm_events
      SET status = '2_3d_before'
      WHERE event_date = ((now() AT TIME ZONE 'Asia/Jerusalem')::date + INTERVAL '3 days')::date
        AND status NOT IN ('2_3d_before','event_day','planning','closed','completed')
        AND is_deleted = false
      RETURNING id, tenant_id
    LOOP
      BEGIN
        PERFORM net.http_post(
          url := 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/automation-engine',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU'
          ),
          body := jsonb_build_object(
            'tenant_id', r.tenant_id::text,
            'trigger_type','event_status_change',
            'trigger_data', jsonb_build_object('eventId', r.id::text, 'newStatus','2_3d_before'),
            'mode','dispatch'
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'automation-engine 2_3d_before call failed for event % (tenant %): %',
          r.id, r.tenant_id, SQLERRM;
      END;
    END LOOP;
  END;
  $DO$;
  $cron$
);
