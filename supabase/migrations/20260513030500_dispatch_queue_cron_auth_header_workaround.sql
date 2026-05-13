-- =============================================================================
-- Migration: dispatch_queue cron Authorization header (workaround)
-- SPEC: modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/SPEC.md
-- Finding: F1 (HIGH) -- see FINDINGS.md in the SPEC folder.
-- Date: 2026-05-13
-- =============================================================================
-- ⚠ This is a WORKAROUND, not the proper fix.
--
-- Root cause: During the STATUS_CHANGE_TRIGGERS_FRAMEWORK SPEC, the original
-- automation-engine + dispatch-queue MCP deploy returned InternalServerError
-- (OPEN-021 pattern). Daniel deployed both EFs via the Supabase CLI from his
-- Windows machine. The CLI defaults to `--verify-jwt=true`, which silently
-- toggled dispatch-queue from its previous `verify_jwt=false` state. From that
-- moment, every dispatch_queue cron tick was rejected at the gateway with
-- HTTP 401 "UNAUTHORIZED_NO_AUTH_HEADER" because the cron posts with no
-- Authorization header. Queue rows accumulated unprocessed.
--
-- Proper fix: redeploy dispatch-queue with `--no-verify-jwt` (or equivalent
-- supabase config.toml block setting `verify_jwt = false`). Daniel performs
-- this from CLI when convenient. This migration is a short-term workaround
-- so the queue continues draining until that redeploy happens.
--
-- Workaround mechanics: re-schedule the dispatch_queue cron to include the
-- anon-JWT Authorization header in net.http_post. Same JWT all other
-- automation-engine cron paths use (event_day_status_flip,
-- event_2_3d_before_status_flip, consume_status_change_events).
-- The Authorization header is harmless even after dispatch-queue's
-- verify_jwt is reverted to false -- the gateway simply ignores it.
-- =============================================================================

SELECT cron.unschedule('dispatch_queue');

SELECT cron.schedule(
  'dispatch_queue',
  '* * * * *',
$cron$
SELECT net.http_post(
  url := 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/dispatch-queue',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU'
  ),
  body := '{}'::jsonb
);
$cron$
);
