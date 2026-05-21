# FINDINGS — M4_SCE_CONSUMER_RACE_FIX

> **Author:** opticup-executor
> **Date:** 2026-05-21

## F-01 (MEDIUM, fixed in this SPEC) — `buildVariables` per-lead event SELECT blew the EF budget at 5K scale
- **Severity:** MEDIUM (fixed in same SPEC as a scope extension).
- **Where:** `supabase/functions/automation-engine/prepare-plan.ts:80-87`.
- **What:** `buildVariables` did a `SELECT crm_events WHERE id=eventId AND tenant_id=...` for every lead in the per-lead dispatch loop. For 5,000 leads, that's 5,000 round-trips inside the EF. The EF couldn't complete inside its execution budget → consumer runs stuck at `status='running'`, `total_recipients=0`, queue empty.
- **Fix:** added optional `cachedEvent` parameter; `prepareRulePlan` pre-loads the event once outside the loop. 5,000 SELECTs → 1 SELECT. EF now completes a 5K-lead enqueue in ~6 seconds.
- **Why in-scope for SPEC B:** the SCE-race-fix verification requires a single complete enqueue cycle, which the EF could not do at 5K scale without this fix. Treating it as a separate SPEC would have blocked SPEC B verification indefinitely.

## F-02 (INFO) — pg_cron tick frequency (15 s) outpaces manual race-test calls
- **Severity:** INFO.
- **What:** during the 3-parallel-curl race test, pg_cron's 15-second tick beat all 3 of my manual calls to the SCE claim. The race-fix verification is still valid (all 3 manual callers correctly got `processed:0` via SKIP LOCKED past the cron's claim), but if a future test wants my-manual-call to win, it has to (a) disable the cron temporarily or (b) make sure the manual call fires within the cron's idle window between ticks.
- **Suggested next action:** none — INFO only. Documented for future reference.

## F-03 (INFO) — RPC return shape adds `claimed_at` to consumer.ts's QueueRow type
- **Severity:** INFO.
- **What:** the old SELECT picked specific columns; the new RPC returns `SETOF crm_status_change_events` (all columns). The consumer.ts `QueueRow` type only declares the fields it uses; extra returned fields are ignored. No bug, but worth noting if future maintainers add new columns to the table — the consumer will silently ignore them too.
- **Suggested next action:** none.

## F-04 (LOW) — Stuck "running" automation_runs from the failed pre-fix attempts
- **Severity:** LOW (cleaned up).
- **What:** during the pre-cache-fix attempts, 2 `crm_automation_runs` rows got stuck at `status='running'`, `finished_at=NULL`, `total_recipients=0` because the EF crashed before reaching `finishRun`. These were manually force-closed to `status='failed'`.
- **Suggested next action:** consider adding a pg_cron "stale-run reaper" that marks runs with `status='running' AND started_at < now() - INTERVAL '30 minutes'` as failed. Optional follow-up SPEC `M4_AUTOMATION_RUN_STALE_REAPER` — not blocking.

---

*End of findings.*
