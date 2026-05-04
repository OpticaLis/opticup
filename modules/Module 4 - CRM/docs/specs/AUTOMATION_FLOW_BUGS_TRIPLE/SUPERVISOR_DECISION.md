# Supervisor Decision — AUTOMATION_FLOW_BUGS_TRIPLE

**Date:** 2026-05-04
**Decided by:** Supervisor (opticup-strategic, Cowork session)
**Routed to:** Campaign Overseer → REC-016 follow-up → opticup-strategic SPEC author
**Origin:** 3 bugs surfaced during Daniel's QA pass on demo after REC-016 (Rung 2). Pre-existing, but the QA spotlight made them visible. The CO's split proposal (one SPEC for bugs 1+2, separate SPEC for bug 3) is the right shape — confirmed.

---

## Verdict summary

**Two SPECs, not one:**

1. **SPEC #1 — `ATOMIC_CONFIRMATION_FLOW`** (covers bugs 1 + 2). Same operator flow, same engine code path, same review surface.
2. **SPEC #2 — `ATTENDEE_COUNTER_DISPLAY_FIX`** (covers bug 3). Pure display-layer logic, unrelated to the engine.

Both follow standard SPEC + Foreman + Executor + Daniel-only-merge flow per the post-cutover production-discipline rules.

Decisions on each bug + answers to the CO's three questions below.

---

## Bug 1 — Status changes despite cancelled message dispatch

**The CO's three options:**
- (a) Status changes always, message is independent step.
- (b) Status changes only if message sends successfully.
- (c) Atomic — cancel reverts both status and notification.

### My call: **Option (c) — atomic, with an explicit "invite without notify" alternative in the modal.**

**Why (c) over (a):**

This is a product-definition bug, not an implementation bug. The current behavior implements (a). The CO's instinct that this is a "state leak" is correct from the operator's mental model: hitting "cancel" in a confirmation modal is universally read as "nothing happened." When the actual behavior diverges from that mental model, the operator's trust in the system erodes.

(a) optimizes for the engine's view of state-machine cleanliness ("status is a function of operator action, not of message-send result"). That's an engineer's framing, not an operator's. After 1158 leads + a live event, an operator clicking cancel and seeing "2 invited" in the table is going to assume the system did something wrong — they won't think "ah, the status is independent of the message."

**Why (c) over (b):**

(b) — status only changes if message sends — is too restrictive. There's a real use case: invite an internal-test attendee or a known person without sending them a notification. Under (b), the operator can't do that without also dispatching a real customer SMS.

**The (c) shape that works:**

- The confirmation modal becomes a true commit-point: "Cancel" reverts ALL changes (no status update, no notification, nothing). "Confirm" applies both status and notification.
- For the "invite without notify" use case, the modal grows a third option (radio button or secondary action): "Confirm without sending notification." That commits the status change but skips the dispatch.
- The flow is then explicit and predictable: three buttons (Cancel / Confirm without notify / Confirm and notify), no implicit divergence.

This is a product-definition fix more than a bug fix. The SPEC must capture the new modal contract clearly + change the implementation to match.

---

## Bug 2 — automation-engine identifies recipients but never sends

**The CO's two hypotheses:**
- (i) automation-engine EF — `prepareRulePlan` returns 2 items but `dispatch.ts` doesn't send.
- (ii) client-side `crm-attendee-move.js` — confirmation flow not driven correctly.

### My call: **most likely (i) — server-side. But the SPEC's first step is diagnostic instrumentation, not a fix.**

**Why (i) over (ii):**

The evidence pattern (`total_recipients=2, sent=0, failed=0, rejected=0`, zero rows in `crm_message_log` and `crm_message_queue`) means the engine identified recipients during planning but never even attempted dispatch. If the client-side were dropping the confirmation, the engine wouldn't have run at all (the run row `30ba8e98` exists in `crm_automation_runs`, so the engine DID execute).

So the engine ran, identified recipients, then — somehow — dispatch never happened. That's a server-side flow defect: between `prepareRulePlan` and the actual dispatch loop, something terminates early. Likely candidates:
- An early `return` in the rule action when a flag is in a particular state.
- The "send_message" toggle from the client is read but its truthy-handling is wrong (e.g., string "false" treated as truthy or vice versa).
- The dispatch step is gated on a condition that's silently false.

**Why instrument before fixing:**

This is the same Pattern-14 lesson from the Realtime saga (Rounds 1–4). Don't ship a fix dependent on an unverified assumption. The SPEC's first step:
1. Add structured logging in `automation-engine` EF: log entry/exit of `prepareRulePlan`, the recipients array, the dispatch entry, and any early returns. Tag with the run ID so logs can be correlated.
2. Reproduce the bug on demo: trigger the same flow Daniel hit, capture logs, identify the exact drop point.
3. Only then fix.
4. Verify: re-trigger, confirm `sent=N` matches `total_recipients=N`, rows appear in `crm_message_log`.

If step 2's logs reveal the bug is actually client-side (hypothesis ii), pivot the SPEC scope mid-execution — that's an acceptable Bounded Autonomy moment, not an escalation.

---

## Bug 3 — "נרשמו" counter counts all statuses

**The CO's call:** separate SPEC for the display-layer counter. **Confirmed.**

### Scope of SPEC #2 — `ATTENDEE_COUNTER_DISPLAY_FIX`

- Find the counter logic for "נרשמו" in the event-detail view AND in any conversion-funnel widget that mirrors it (the CO mentioned "מסלול המרה" too — same root counter likely).
- Filter to count ONLY `status IN ('registered', 'confirmed', 'attended')`. Do NOT count `invited`, `new`, `waiting_list`, `cancelled`, `no_show`.
- Verify the canonical status list is sourced from `crm_statuses` table or a constant (don't hardcode the 3 statuses inline; reuse whatever constant the rest of the codebase uses).
- If the conversion-funnel widget exists separately, fix it the same way (single source of truth — define the "counts as registered" predicate once and use it everywhere it's needed).

This SPEC is small (1–2 file edits, 1 regression test). Does NOT touch the engine, does NOT touch automation flows, does NOT affect customer-facing data. Pure display logic.

---

## Why split SPECs (re-confirming the CO's read)

- Bugs 1 + 2 share the same code path (event-open / attendee-move + automation-engine dispatch). One SPEC = one focused review surface.
- Bug 3 is independent display logic. Bundling it would dilute the engine SPEC's focus and risk the display fix being delayed by engine debugging.
- Separate SPECs = independent review, independent merge, independent rollback. Especially important when one of them (bug 1) requires a product-definition decision that may produce its own UX iteration.

---

## SPEC scope (for opticup-strategic to author)

### SPEC #1 — `ATOMIC_CONFIRMATION_FLOW` (bugs 1 + 2)

**Scope:**

Bug 1 fix:
- Modal contract becomes: `[Cancel]` reverts all changes; `[Confirm without notify]` applies status only; `[Confirm and notify]` applies status + dispatches.
- Status changes are now part of the modal commit, not pre-committed before the modal opens. Implementation detail: the status update happens inside the modal's confirm handler, not in the click handler that opens the modal.
- Update `crm-attendee-move.js` AND any sibling that drives the same flow (e.g., the event-status-change flow that triggers attendee status mass-changes).
- Update modal copy in Hebrew per Prizma Design System Canon.
- Add tests: cancel-leaves-state-unchanged, confirm-without-notify-changes-status-only, confirm-and-notify-changes-status-and-dispatches.

Bug 2 fix (Step 1 — diagnostic instrumentation):
- Add structured logging in `automation-engine` EF around `prepareRulePlan`, dispatch entry, early returns, with run-ID tagging.
- Deploy. Reproduce on demo (move an attendee with "send update" toggle ON). Capture logs.
- Identify the drop point. Document in `FINDINGS.md` BEFORE fixing.

Bug 2 fix (Step 2 — actual fix):
- Based on Step 1's evidence, fix the drop point.
- Verify: re-trigger, confirm `sent` matches `total_recipients`, rows in `crm_message_log` and `crm_message_queue`.
- Smoke-test all three confirm-paths from bug 1's modal (without-notify, with-notify, cancel) — all should produce expected counters.

**Iron Rules:**
- Rule 14 + 15 + 22: writes to `crm_event_attendees` are tenant-scoped. Existing RLS preserved.
- Rule 7: dispatch goes through existing helpers; no new shape.
- Rule 9 #7: PR + Daniel-only merge.
- Rule 31: integrity gate.
- **Production discipline (post-cutover):** test on demo, NOT prizma. If demo lacks the data shape needed for testing, seed it. STOP triggers tightened — no writes to prizma's `crm_event_attendees` or `crm_message_log` without explicit Daniel approval per write.

**Stop triggers:**
- Step 1 instrumentation reveals the bug is client-side (hypothesis ii) → pivot SPEC scope, document in FINDINGS, continue.
- Modal redesign breaks an existing operator flow not previously surfaced → STOP, escalate.
- Engine fix introduces a regression in a separate automation rule (e.g., the event-day rule we already fixed in V10) → STOP, escalate.
- Any test on prizma data without explicit Daniel approval → STOP, hard halt.

**Out of scope:**
- Refactoring the entire automation-engine EF.
- Migrating any data on prizma.
- Adding new automation rule types.
- The "Realtime as trigger" polling work (separate post-cutover SPEC).

### SPEC #2 — `ATTENDEE_COUNTER_DISPLAY_FIX` (bug 3)

**Scope:**
- Find the counter for "נרשמו" in the event-detail view AND the conversion-funnel widget.
- Define a single predicate `isCountedAsRegistered(attendeeStatus)` — true for `registered`, `confirmed`, `attended`. Use the canonical `crm_statuses` table or whatever constant the codebase uses.
- Apply the predicate everywhere the counter is computed.
- Add a regression test that mixed-status data produces the right count.

**Iron Rules + Stop triggers:** same rules apply but the surface is much smaller. No engine, no dispatch, no customer data.

**Out of scope:**
- Changing the underlying status taxonomy.
- Adding new status types.
- Touching any non-counter display.

---

## Operational priority

- **SPEC #1 (bugs 1 + 2):** **HIGH.** Bug 1 is a state-leak that erodes operator trust. Bug 2 is silent message loss — the worst kind of bug because operators don't know they're losing data. Both must close before any further automation-engine work lands. Block REC-016 Rung 3 until SPEC #1 ships.

- **SPEC #2 (bug 3):** **MEDIUM.** Misleading counter, but no data loss or state inconsistency. Can ship in parallel or after SPEC #1.

---

## Next step (Campaign Overseer)

1. Update REC-016 (or open new REC numbers) in `DECISIONS_LOG.md` referencing this decision file.
2. Author two `ACTIVATION_PROMPT.md` files — one per SPEC folder. SPEC #1 in `modules/Module 4 - CRM/docs/specs/ATOMIC_CONFIRMATION_FLOW/`, SPEC #2 in `modules/Module 4 - CRM/docs/specs/ATTENDEE_COUNTER_DISPLAY_FIX/`.
3. Daniel pastes activation prompts into Module Strategist sessions (one at a time or parallel — Daniel's call).
4. Module Strategist authors `SPEC.md` + executor `ACTIVATION_PROMPT.md` per SPEC.
5. Daniel pastes executor prompts into Claude Code (opticup-executor).
6. Standard execution → spot-check by Supervisor → Daniel-only PR merge.
7. Foreman review closes each SPEC.

— Supervisor (opticup-strategic).
