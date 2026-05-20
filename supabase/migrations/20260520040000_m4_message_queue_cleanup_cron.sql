-- M4_NIGHT_RUN_2026_05_20 W2.3 — pg_cron cleanup for crm_message_queue.
-- F-M06-1 (audit Mission 1): crm_message_queue accumulates sent rows
-- indefinitely (4.2 MB table data; oldest sent row is 8 days old today
-- but grows ~600 rows/day). Add a daily cron job that deletes sent
-- rows older than 90 days so the queue is a rolling window, not a
-- permanent archive. Recent rows (< 90d) stay so the resend button
-- (W1.1) can still see them.
--
-- Iron Rule 32 destructive op: DELETE on crm_message_queue, scoped to
-- status='sent' AND created_at < now() - interval '90 days'. Declared
-- in modules/Module 4 - CRM/docs/specs/M4_NIGHT_RUN_2026_05_20/SPEC.md §3.
SELECT cron.schedule(
  'crm_message_queue_cleanup',
  '0 4 * * *',
  $cleanup$
  DELETE FROM public.crm_message_queue
  WHERE status = 'sent'
    AND created_at < now() - interval '90 days';
  $cleanup$
);
