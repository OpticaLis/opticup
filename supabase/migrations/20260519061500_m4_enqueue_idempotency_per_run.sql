-- M4_ENQUEUE_REGRESSION_FIX (2026-05-19) — fix the partial unique index that
-- silently blocks legitimate re-enqueues of the same (event, lead, template,
-- channel) tuple across runs.
--
-- Pre-fix constraint:
--   UNIQUE (tenant_id, event_id, lead_id, template_slug, channel)
--   WHERE event_id IS NOT NULL AND template_slug IS NOT NULL
--     AND status IN ('queued','processing','sent')
--
-- The pre-fix constraint was designed to prevent cron double-tick from
-- enqueuing the same status-change-event twice — but its tuple was too broad:
-- once a row reached status='sent', no future run (different status change,
-- different event_status_change cron tick, different operator toggle) could
-- ever insert the same tuple. The application path (dispatch.ts) caught the
-- constraint violation in a generic try/catch and only console.error'd it,
-- so the failure was completely invisible to crm_automation_runs metrics +
-- crm_message_log.
--
-- Post-fix constraint includes run_id, which is set on every send_message
-- enqueue (dispatch.ts L45) and queue_send enqueue (queue-send.ts L72). Now:
--   - Per-run idempotency preserved (same run cannot insert the same tuple
--     twice — which is already true by construction in prepare-plan.ts, since
--     items[] is built once per (lead, channel) pair).
--   - Cross-run sends ALLOWED (different runs → different run_ids → different
--     unique tuples → insert succeeds).
--
-- The WHERE clause keeps `run_id IS NOT NULL` so untagged rows (legacy / ad-hoc)
-- don't enter the constraint. Status filter unchanged.
--
-- queue-send.ts has its own SELECT-then-INSERT manual idempotency check at
-- L102-120, which is unaffected by this change (it operates on the application
-- level, not the constraint level, and uses the same (event, lead, template,
-- channel, status) filter — defense in depth).

DROP INDEX IF EXISTS public.uq_crm_message_queue_idem;

CREATE UNIQUE INDEX uq_crm_message_queue_idem
ON public.crm_message_queue
USING btree (tenant_id, run_id, lead_id, template_slug, channel)
WHERE run_id IS NOT NULL
  AND template_slug IS NOT NULL
  AND status IN ('queued', 'processing', 'sent');

-- Update the index's comment for future auditors.
COMMENT ON INDEX public.uq_crm_message_queue_idem IS
  'Per-run idempotency on (run_id, lead, template, channel). Prevents cron double-tick from inserting the same plan item twice within a single run; allows legitimate re-sends across runs. M4_ENQUEUE_REGRESSION_FIX (2026-05-19).';
