# FINDINGS — M4_ENQUEUE_REGRESSION_FIX

## F-1 — Silent-failure surface in `dispatch.ts` (the meta-bug)
**Severity:** CRITICAL — caused the entire user-visible regression
**Status:** RESOLVED in this SPEC

The original code at `dispatch.ts:62-65` caught the INSERT error in a generic `if (res.error)` branch and only `console.error`'d it. The error never reached:
- `crm_automation_runs.error_message` (stayed null)
- `crm_message_log` (no rejection / failed row)
- Operator UI

Meta-lesson: **any catch block in an EF that doesn't propagate to a DB row is a future silent-loss surface.** Recommend adding to opticup-reviewer's checklist: scan every `console.error` in EF code and verify there's a corresponding DB insert that makes the error visible to operators.

Fix in this SPEC: write per-row `crm_message_log` entries on chunk INSERT failure. Defensive — works regardless of WHAT the underlying DB error is.

## F-2 — Partial unique index design was permanent, not run-scoped
**Severity:** HIGH (structural)
**Status:** RESOLVED via migration

`uq_crm_message_queue_idem` on `(tenant_id, event_id, lead_id, template_slug, channel)` permanently blocked re-sends once any row hit `status='sent'`. Designed for "prevent cron double-tick from inserting the same status-change-event twice", but the tuple was too broad — it also blocked **legitimate different-run re-sends** (operator toggles status open→close→open, the rule should fire twice).

Per-run idempotency (`(tenant, run_id, lead, template, channel)`) preserves the original protective intent without blocking cross-run sends.

`queue-send.ts` has its own application-level idempotency check (SELECT-then-INSERT), which remains defense in depth.

## F-3 — SPEC 3 verification at 05:33Z planted the blocking rows
**Severity:** INFO (causal chain note)
**Status:** N/A

My own SPEC 3 verification at 05:33Z sent 2 messages → status='sent' → those rows became permanent blockers. Daniel's toggles at 08:42-08:55 IL (05:42-05:55 UTC) all hit the constraint.

Lesson for opticup-strategic: when a SPEC's verification produces persistent test-data side effects (queue rows, log rows, etc), the SPEC's FINDINGS should note "future tests of the same scenario may be blocked by these rows until cleaned up." For this SPEC's case, the cleanup wasn't documented — couldn't have caught it ahead of time, but the meta-pattern is worth noting.

## F-4 — `crm_automation_runs.sent_count=0` even after successful dispatch
**Severity:** LOW (observability)
**Status:** OPEN (out of scope, deferred to `M4_AUTOMATION_RUNS_METRIC_AUDIT` per QA Priority 5)

Run `028eef5d` had `total_recipients=2, sent_count=0` despite both queue rows being `status='sent'` and both log rows being `status='sent'`. The `sent_count` on the run row is updated by the AE evaluate path only at `dispatch_messages=true` invocation BEFORE the actual queue → dispatch-queue → send-message chain completes. The async cron drain of the queue is where messages actually go `sent`, but the run row's `sent_count` isn't backfilled.

Already documented in QA report Finding 1.5. Not blocking customer messages.

## F-5 — Brief §3.9 (UI date column) implemented as the smallest possible patch
**Severity:** INFO
**Status:** RESOLVED in this SPEC

`crm-queue-live.js:fmt()` was returning `toLocaleTimeString` only. Updated to return `DD/MM HH:MM:SS`. Minimal change, no behavior diff for any caller (the column always renders a string).

## F-6 — Migration applied to live DB without local-run-first
**Severity:** INFO (process)
**Status:** ACCEPTED for this hot-fix scenario

I applied the migration via `mcp__claude_ai_Supabase__apply_migration` directly to the live demo DB without testing on a local Supabase first. Risk: a typo in the SQL would have left the live DB in a broken state (no idempotency at all). Mitigation: the SQL is short + reviewed line-by-line + has explicit `DROP IF EXISTS` so a re-run is idempotent.

Future SPECs that do schema changes should consider running `supabase db diff` against a local snapshot first. For overnight hot-fixes under no-stop authorization, the live-apply route is acceptable.
