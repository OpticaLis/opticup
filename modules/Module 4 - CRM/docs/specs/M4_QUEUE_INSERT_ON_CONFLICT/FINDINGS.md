# FINDINGS — M4_QUEUE_INSERT_ON_CONFLICT

> **Author:** opticup-executor
> **Date:** 2026-05-21

## F-01 (RESOLVED in this SPEC) — `queue_insert_failed: duplicate key` log rows GONE
- **Severity:** HIGH originally (SPEC A's FINDINGS F-02). Resolved here.
- **What:** in SPEC A's 1,200-lead load test, the SCE race produced ~800 `queue_insert_failed: duplicate key value violates unique constraint "uq_crm_message_queue_idem"` log rows because `dispatch.ts:69` used bare `.insert(chunk)` without ON CONFLICT.
- **Verification:** SPEC C's 5K load test produced ZERO such rows. All rejections were clean `email_not_allowed` from the allowlist. The partial-unique-index conflicts are now silently absorbed by the RPC's `ON CONFLICT DO NOTHING`.

## F-02 (INFO) — `queue-send.ts` SELECT-then-INSERT pattern deleted
- **Severity:** INFO — fixed in same SPEC.
- **What:** the pre-fix `queue-send.ts:90-128` did `SELECT existing → INSERT new` client-side. Comment at lines 91-101 explicitly noted the supabase-js limitation that drove the design.
- **Resolution:** removed entirely. Single `.rpc('enqueue_crm_messages_idempotent', {p_rows})` call replaces it.

## F-03 (LOW) — RPC validates run_id + template_slug presence (defense-in-depth)
- **Severity:** LOW — documented for future maintainers.
- **What:** the RPC rejects p_rows entries lacking `run_id` or `template_slug`, returning `{inserted:0, conflicted:0, errors:N, error_message:'rows_missing_run_id_or_template_slug'}`. This is intentional: the partial unique index requires both fields, so rows without them can't be deduped — the RPC fails closed rather than silently insert un-dedupable rows.
- **Suggested next action:** none — RPC behavior is correct. Documented so a future caller adding new code understands why the rejection happens.

## F-04 (INFO) — dispatch-queue cron processes rows mid-test
- **Severity:** INFO.
- **What:** ~15 of the 10,000 enqueued rows had already flipped to `failed`/`rejected` (by the dispatch-queue cron) by the time the re-enqueue test ran. The remaining 9,955 still-queued rows is what the SPEC C test asserted against. The 15-row delta is operationally normal.
- **Suggested next action:** none — the assertion (`conflicted=9955`) matches the still-queued count exactly.

## F-05 (INFO — cross-SPEC) — Defense-in-depth fully stacked
- **Severity:** INFO.
- **What:** with SPECs A + B + C all closed, the dispatch pipeline has three independent safety layers:
  1. **SPEC A:** operator-confirm modal brake. Status changes never commit silently when recipients > 0.
  2. **SPEC B:** atomic SCE claim via `FOR UPDATE SKIP LOCKED`. Parallel cron ticks no longer over-enqueue.
  3. **SPEC C:** atomic queue ON CONFLICT DO NOTHING. Any duplicate-payload enqueue silently no-ops.
- **Result:** the failure mode from yesterday's INCIDENT_REPORT (silent commit → SCE race → queue floods → mass dispatch) is now blocked at three independent layers.

---

*End of findings.*
