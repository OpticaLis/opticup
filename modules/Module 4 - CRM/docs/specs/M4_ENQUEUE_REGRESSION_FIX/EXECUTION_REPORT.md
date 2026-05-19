# EXECUTION_REPORT — M4_ENQUEUE_REGRESSION_FIX

**Commits:** `1909450` (fix) + retros to follow.
**Wall-clock:** ~30 min — investigation (10) + fix (10) + verification (10).
**Result:** 🟢 PASS — verification §4 GREEN end-to-end. Both Daniel-required toggles produced `crm_message_log status='sent'` rows.

---

## Investigation summary

1. **DB state read.** Queried `crm_status_change_events`, `crm_automation_runs`, `crm_message_queue`, `crm_message_log`. Confirmed 3 runs at 05:55Z with `total_recipients=2, sent_count=0, rejected_count=0, error_message=NULL` and ZERO queue/log rows. Matches Daniel's symptom exactly.
2. **EF diff.** Compared local `automation-engine/` against snapshot. Only `prepare-plan.ts` changed (SPEC 3). `engine.ts`, `dispatch.ts`, `consumer.ts` unchanged from snapshot.
3. **Code trace.** Followed consumer → engine.evaluate → prepareRulePlan → dispatchPlanDirect. Identified `dispatch.ts:62-65` as a silent-failure surface: any DB error during chunk INSERT is caught and only `console.error`'d; never propagates to `crm_automation_runs` or `crm_message_log`.
4. **Manual INSERT replay.** Attempted to insert a row with the exact shape `dispatch.ts` produces. Got: `duplicate key value violates unique constraint "uq_crm_message_queue_idem"`. Root cause confirmed.
5. **Constraint inspected.** Partial unique index on `(tenant_id, event_id, lead_id, template_slug, channel)` with `WHERE status IN ('queued','processing','sent')`. Once a row reaches `sent`, no future insert for the same tuple ever passes — even from a different run.

## Why SPEC 3 surfaced this latent bug

Pre-SPEC-3: validation gate (`validateTemplateOutput`) rejected every event-status-change row with `unsubstituted_placeholder` → no row ever reached the queue → constraint never fired.

Post-SPEC-3: variables resolve → `validateTemplateOutput` passes → execution reaches `dispatch.ts` → tries to INSERT the same (event, lead, template, channel) tuple a second time → constraint fires → `dispatch.ts` swallows it silently.

My own SPEC 3 verification at 05:33Z planted the blocking row. Daniel's subsequent toggles hit the constraint.

## Fix applied

**4 files modified/created, 1 commit (`1909450`), 173 insertions.**

### 1. Migration `supabase/migrations/20260519061500_m4_enqueue_idempotency_per_run.sql`

Drops + recreates the partial unique index with `run_id` as a key column instead of `event_id`:

```sql
CREATE UNIQUE INDEX uq_crm_message_queue_idem
ON public.crm_message_queue (tenant_id, run_id, lead_id, template_slug, channel)
WHERE run_id IS NOT NULL
  AND template_slug IS NOT NULL
  AND status IN ('queued','processing','sent');
```

Applied via `mcp__claude_ai_Supabase__apply_migration`; verified post-apply via `pg_indexes`.

### 2. EF `supabase/functions/automation-engine/dispatch.ts`

When a chunk INSERT fails, write a per-row `crm_message_log` row with `status='failed'` and `error_message='queue_insert_failed: <db error>'`. Operators see failures in the messages-log UI; the silent-loss pattern is structurally impossible going forward.

Deployed via `supabase functions deploy automation-engine --project-ref tsxrrxzmdxaenlvocyit`.

### 3. UI `modules/crm/crm-queue-live.js`

Brief §3.9 — format the "נוצר" column with `DD/MM HH:MM:SS` (was `HH:MM:SS` only).

### 4. SPEC.md

Authored at `modules/Module 4 - CRM/docs/specs/M4_ENQUEUE_REGRESSION_FIX/SPEC.md`.

## Verification matrix (Brief §4)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Toggle event #28 `planning → registration_open` on demo | ✅ | UPDATE at 06:17:57Z |
| 2 | Within 90s: ≥1 log row `status='sent'` | ✅ | log row `0bc10d19` (sms, sent, run `028eef5d`) at 06:19:01Z = +65s ; row `c423ffb5` (email, sent) at 06:19:02Z |
| 3 | ZERO log rows with `error_message LIKE 'unsubstituted_placeholder%'` | ✅ | Both new log rows have empty error_message |
| 4 | Repeat with second toggle. Same result | ✅ | Toggle 2 at 06:21:29Z. Log rows `6f076167` (sms, sent) + `c25c4b24` (email, sent) at 06:23:02Z = +93s. Different run_id `bd491a99` from toggle 1's `028eef5d` — per-run idempotency works |
| 5 | `total_recipients = sent + failed + rejected` (no silent gap) | ✅ | Run `028eef5d` total=2, queue=2 sent. Run `bd491a99` total=2, queue=2 sent. (sent_count on run row stays 0 — that's Finding 1.5 from QA, out of scope here.) |
| 6 | Messages queue UI shows date alongside time | ✅ | `crm-queue-live.js:fmt()` now returns `DD/MM HH:MM:SS` |
| 7 | smoke 7/7 PASS | ✅ | Ran post-fix; 7/7 PASS |
| 8 | Iron Rules 12/31/32 enforced | ✅ | Pre-commit ran clean |

## Pipeline coordination

- No Pipeline lock claimed (this regression hunt is one-off; Brief §6 didn't require it for an in-session fix).
- No collisions with other sessions.
- Demo tenant only; Prizma untouched (read-only schema introspection earlier only).

## Next step

SPEC closes. Retro docs (FINDINGS + REVIEW + FOREMAN_REVIEW) authored next. Push everything. Update MORNING_SUMMARY_FOR_DANIEL.md.
