You are working in `C:\Users\User\opticup`. The user is Daniel.

**🔴 PRODUCTION DISCIPLINE — non-negotiable post-cutover rule:**
- Test ALL changes on **demo tenant** (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug `demo`, PIN 12345). NOT prizma.
- Any write to prizma's `crm_event_attendees`, `crm_message_log`, `crm_message_queue`, or `crm_leads` requires EXPLICIT Daniel approval per write. Default = read-only.
- If demo lacks the data shape needed for testing, seed it on demo. Never test on prizma.
- This is a HARD STOP TRIGGER. Any prizma write without approval = halt + escalate immediately.

This SPEC bundles 2 bugs surfaced during Daniel's QA pass on demo (2026-05-04):

**Bug 1 (CRITICAL — state leak):** When operator changes event status (e.g., to "registration_open") AND clicks "Cancel" on the message-confirmation modal, the messages don't send (correct), BUT the attendees' statuses still flip to `invited` in the DB. Operator's mental model says "I cancelled, nothing happened" — reality is the attendee is now `invited` without ever being notified.

**Bug 2 (CRITICAL — silent message loss):** `automation-engine` EF identifies recipients (`total_recipients=2`) but never dispatches them. `sent=0, failed=0, rejected=0`, zero rows in `crm_message_log` and `crm_message_queue`. Run row exists in `crm_automation_runs` (e.g., id `30ba8e98-f0a7-4f70-b308-124520956f01`). Engine ran, planned, but dispatch silently dropped.

Per Supervisor decision (`SUPERVISOR_DECISION.md` in this folder, binding):
- Bug 1 fix: **Option (c) — atomic modal commit + 3-button modal contract.**
- Bug 2 fix: **Diagnostic instrumentation FIRST, then targeted fix.**

## Two-stage. opticup-strategic authors. opticup-executor implements.

## Clean-repo discipline (non-negotiable)

- **Session start:** First Action Protocol per CLAUDE.md §1. Working tree must be clean. Stash any pre-existing WIP if present (`git stash push -u -m "pre-ATOMIC_CONFIRMATION wip"`).
- **Session end:** `git status` must show "working tree clean". Pop stash AFTER push.

## What needs to happen

### PART A — Bug 1: Atomic Modal Commit

**The new modal contract (3 buttons instead of 2):**

| Button | Action |
|---|---|
| **ביטול** (Cancel) | Reverts everything — no status change, no dispatch, no DB writes. |
| **אישור ללא הודעות** (Confirm without notify) | Status changes commit. No messages sent. |
| **אישור ושלח הודעות** (Confirm and notify) | Status changes commit + automation rule fires + messages dispatch. |

**Implementation:**
1. The status update for affected attendees MUST happen INSIDE the modal's confirm handler, not before the modal opens. Today the status flip happens upstream — that's the bug. Move the flip into the modal commit point.
2. `crm-confirm-send.js` modal needs a 3-button bottom-bar. Use Prizma Design System Canon for styling (gold primary for "Confirm and notify", neutral for "Confirm without notify", outline for "Cancel").
3. The dispatch handler (existing onApprove) must accept a 2-state result: `{ confirmStatus: true, dispatch: true }` or `{ confirmStatus: true, dispatch: false }` — caller decides what to do with status. Cancel = no callback fires.
4. Apply to BOTH event-status-change flow (in `crm-event-actions.js`) AND attendee-move flow (in `crm-attendee-move.js`).

**Modal copy (Hebrew, gender-neutral, no exclamation marks per Prizma canon):**
- Modal title: "אישור פעולה"
- Cancel: "ביטול" — soft reset.
- Confirm-only: "אישור ללא הודעות" — secondary action, gray-outline.
- Confirm + dispatch: "אישור ושלח הודעות" — primary action, gold.

### PART B — Bug 2: Diagnostic-First, Then Fix

**Step B.1 — Add structured logging in `automation-engine` EF:**

Add `console.log()` (Edge Functions log to Supabase logs) at:
- Entry to `prepareRulePlan` (log `runId`, `ruleName`, `triggerData`).
- Exit of `prepareRulePlan` (log `items.length`, `skipped`, `queued`).
- Entry to dispatch loop (log `allItems.length`, `mode`).
- Each early-return inside dispatch (log `runId`, `reason`).
- Exit of dispatch (log `sent`, `failed`, `rejected`).

Tag every log with `[AE-DIAG runId=<runId>]` prefix for grep-ability.

Deploy as `automation-engine` v5.

**Step B.2 — Reproduce on demo + capture logs:**

1. On demo, ensure 2 attendees exist with phones from the test allowlist (`0537889878` or `0503348349`).
2. Move one attendee between events with `notify=true`.
3. Capture EF logs via Supabase MCP `get_logs` filtering for `[AE-DIAG]`.
4. Identify the exact early-return or silent-drop point.
5. Document in `FINDINGS.md` BEFORE writing a fix.

**Step B.3 — Targeted fix:**

Based on Step B.2's evidence, fix the drop point. Most likely candidates per Supervisor:
- Early `return` in rule action when a flag is in a particular state.
- Truthy-handling of `send_message` toggle (string "false" vs boolean false).
- Dispatch gated on a silently-false condition.

After fix:
- Re-deploy as `automation-engine` v6.
- Re-run the same scenario on demo.
- Verify: `sent=2` matches `total_recipients=2`, rows appear in `crm_message_log`.
- Smoke test: also test "without notify" path AND cancel path from Part A's new modal.

**Step B.4 — Remove the diagnostic logs:**

After the fix is verified, remove ALL `[AE-DIAG]` logs. Keep production logs minimal. Deploy as `automation-engine` v7.

### Iron Rules

- Rule 7 (helpers).
- Rule 12 (file-size — verify after Part A modal changes).
- Rule 14 + 15 + 22 (RLS preserved on `crm_event_attendees` writes).
- Rule 9 #7 (no merge to main; Daniel-only).
- Rule 31 (integrity gate before commit).

### Acceptance criteria (manual QA on **demo only**)

**Part A:**
1. Open event in demo → change status to "registration_open". Modal appears with 3 buttons.
2. Click "ביטול" → no DB change. Verify `crm_event_attendees.status` unchanged for affected rows.
3. Repeat → click "אישור ללא הודעות" → status changes BUT no messages send. Verify `crm_message_log` has no new rows for this run.
4. Repeat → click "אישור ושלח הודעות" → status changes AND messages dispatch. Verify `crm_message_log` has the expected new rows.
5. Same 4 cases for the attendee-move flow.

**Part B:**
6. After Step B.2 — `FINDINGS.md` documents the exact drop point with log evidence.
7. After Step B.3 — re-running attendee-move with notify=true produces `sent=N matching total_recipients=N`.
8. Smoke test: integrity intact for the 4-rule set we already QA'd in REC-016 (event_status_change, event_registration, lead_status_change, lead_intake) — none regressed.

### Stop triggers

- ANY write to prizma's tables without explicit Daniel approval → HARD HALT.
- Step B.2 logs reveal bug is client-side (hypothesis ii from Supervisor) → pivot SPEC scope mid-execution, document in FINDINGS, continue.
- Modal redesign breaks a flow we haven't surfaced → halt + escalate.
- Engine fix introduces regression on V10 event-day flow or other rules → halt + revert.
- Demo data isn't sufficient for testing → seed it on demo (NOT prizma).

### Out of scope

- Refactoring the entire `automation-engine` EF.
- Migrating any data.
- New automation rule types.
- Realtime/polling work (separate SPEC).
- Bug 3 (counter display) — separate SPEC `ATTENDEE_COUNTER_DISPLAY_FIX`.

## Stage 1 — opticup-strategic authors the SPEC

1. Switch to `opticup-strategic` skill.
2. Verify SPEC folder. Author SPEC.md transposing Parts A + B above into the standard schema.
3. Survey 3 most recent FOREMAN_REVIEW.md files for proposals to apply.
4. Hand off to executor.

## Stage 2 — opticup-executor

1. Switch to `opticup-executor` skill.
2. First Action Protocol — clean repo + integrity gate.
3. Implement Part A first (modal contract + atomic commit). Test on demo. Single commit `feat(crm): atomic modal commit — 3-button contract for status+dispatch`.
4. Implement Part B Step 1 (instrumentation). Deploy `automation-engine` v5. Single commit `chore(automation-engine): temporary diagnostic logging for dispatch silent-drop investigation`.
5. STOP. Surface to Daniel: "Step B.1 deployed. Please reproduce the bug on demo (move attendee with notify=ON), then I capture logs and proceed."
6. After Daniel reproduces — capture logs, write FINDINGS.md with diagnosis, then implement Step B.3 fix. Deploy v6. Single commit `fix(automation-engine): dispatch silent-drop after recipients identified`.
7. After verification — Step B.4 removes diagnostic logs. Deploy v7. Single commit `chore(automation-engine): remove temporary diagnostic logging`.
8. End-of-session: `git status` clean.

## After completion

Daniel runs all 8 acceptance criteria on demo. If all pass → PR-merge to main (Daniel-only). Foreman writes FOREMAN_REVIEW.md.

## References

- Supervisor decision (binding): `SUPERVISOR_DECISION.md` (this folder)
- Overseer recommendations: REC-017 + REC-018 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
- Production discipline: auto-memory `feedback_production_discipline_post_cutover.md`
- Pattern-14 (assumption-verification): Realtime saga rounds 1–4 in `REALTIME_INSERT_NOT_RENDERING_DEBUG/`
