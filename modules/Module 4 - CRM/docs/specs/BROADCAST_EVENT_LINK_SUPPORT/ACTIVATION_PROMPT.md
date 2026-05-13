# Activation Prompt — BROADCAST_EVENT_LINK_SUPPORT

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`).

---

```
You are opticup-executor. Run the Full-Auto Pipeline end-to-end on this SPEC:

modules/Module 4 - CRM/docs/specs/BROADCAST_EVENT_LINK_SUPPORT/SPEC.md

Pipeline: Foreman SPEC (already written by architect) → Executor → Reviewer → Localhost-Tester → Foreman closure-review.

Context for the executor:

1. ROOT CAUSE the SPEC fixes: a manual broadcast Daniel sent on 2026-05-13 morning produced 552 message_log rows all `status=failed` with `error_message='unsubstituted_placeholder: registration_url'`. ZERO SMS reached customers (the send-message EF guard catches the literal `%registration_url%` BEFORE calling Make). The reason is that the Broadcast Wizard never collects nor forwards `event_id`, so the queue rows arrive at send-message with `event_id=null`, which skips the `injectAutoUrls()` registration-token branch entirely.

2. CORE INSIGHT: the send-message EF v23 ALREADY supports event-linked broadcasts. `injectAutoUrls(db, leadId, tenantId, eventId, variables)` at functions/send-message/event-variables.ts:252-260 will build `%registration_url%` via `buildRegistrationUrl()` as soon as `eventId` is truthy. The fix is purely client-side: make the Broadcast Wizard collect `event_id` and forward it through `crm_message_queue`.

3. DB STATE: `crm_message_queue.event_id` column ALREADY EXISTS and is nullable. NO DDL CHANGE NEEDED. Verified via information_schema.columns on 2026-05-13 22:30 IL.

4. URGENCY: Event #24 (אירוע המותגים מאי 2026, Fri 2026-05-15) is 36-40 hours away. The 1,187-lead rescue dispatch is BLOCKED until this fix lands. Pacing: clean+focused+fast.

5. PROHIBITIONS (criterion 12 in SPEC): NO writes to Prizma rows of crm_message_queue/crm_message_log/crm_broadcasts during the entire run. Pre/post counts must match exactly. Demo only for all smoke tests.

6. AUTONOMY: SPEC is approved end-to-end. Maximize autonomy. Stop only on real deviation per §5 stop-triggers. The dropdown placement (step 1 vs step 3 vs step 4) is executor's judgment — pick one, document in EXECUTION_REPORT §3.

7. WHERE TO STORE event_id in crm_broadcasts: preferred path is inside the existing `filter_criteria` jsonb (no DDL). If you judge a dedicated column is truly needed, STOP and ask Foreman — do not add a column autonomously (Iron Rule 15 / Level 3 autonomy).

8. SMOKE: 3 demo E2E paths required (criteria 9-11):
   (a) event-linked send → SMS with real per-lead registration URL substituted
   (b) non-event send → still works (regression check, no event)
   (c) event-linked send with body containing `%nonsense%` → fails on `unsubstituted_placeholder: nonsense` (NOT registration_url — regression check that the safety scan still functions)

9. SAFETY TAG: before commit 1, create `git tag pre-broadcast-event-link-support`.

10. COMMIT BUDGET: 3 commits (feat + docs + retro). State at start: "Budget: 3 commits, plus optionally 1 hotfix commit if smoke finds a bug. Will stop and report if commits exceed 4."

Execute per CLAUDE.md §9 Bounded Autonomy. Smoke 7/7 required for Pre-Merge Checklist. Push to develop, do NOT touch main. Hebrew one-liner status updates between phases per Full-Auto Pipeline protocol. ONE Hebrew summary at end.
```

---

*End of activation prompt. Daniel pastes the block above into Claude Code on Windows.*
