# SPEC — ATOMIC_CONFIRMATION_FLOW

> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-04 (post-cutover)
> **Module:** 4 — CRM
> **Phase:** Post-cutover bug bundle (bugs 1 + 2 from `AUTOMATION_FLOW_BUGS_TRIPLE/SUPERVISOR_DECISION.md`; bug 3 ships as separate SPEC `ATTENDEE_COUNTER_DISPLAY_FIX`).
> **Production discipline (non-negotiable):** test ONLY on demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). NO writes to prizma without explicit Daniel approval per write.

---

## 1. Goal

Fix two bugs surfaced during demo QA after REC-016:
- **Bug 1 (state leak):** event-status-change rule's post-action flips attendees' status to `invited` even when operator clicks Cancel on the message-confirmation modal. Fix: 3-button atomic modal contract — Cancel reverts everything, Confirm-without-notify applies status only, Confirm-and-notify applies status + dispatches.
- **Bug 2 (silent message loss):** `automation-engine` EF identifies `total_recipients=2` but never dispatches (`sent=0, failed=0, rejected=0`, no rows in `crm_message_log`/`crm_message_queue`, run row exists). Fix: diagnostic instrumentation FIRST (Pattern-14 — never ship a fix on an unverified assumption), targeted fix SECOND.

---

## 2. Background & Motivation

Per `AUTOMATION_FLOW_BUGS_TRIPLE/SUPERVISOR_DECISION.md` (binding):
- Bug 1 verdict: **Option (c) — atomic modal commit** with explicit "Confirm without notify" alternative.
- Bug 2 verdict: most likely server-side (engine ran, run row exists, but dispatch didn't fire); diagnostic-instrument-first approach mandated.

Engine.ts inspection (lines 150-156): post-actions + queue_send execute INSIDE evaluate mode, BEFORE the mode='evaluate' early-return. That's the architectural cause of Bug 1: the operator's "cancel" arrives AFTER the side effects already committed. Fix: gate side effects on `mode === 'dispatch'`.

---

## 3. Success Criteria — Part A (modal commit)

| # | Criterion | Expected | Verify |
|---|-----------|---------|--------|
| A1 | Branch state at start | clean post-stash | `git status --porcelain` → empty |
| A2 | EF `automation-engine` v5 deployed | success | `mcp__claude_ai_Supabase__list_edge_functions` shows version ≥ 5 |
| A3 | engine.ts: post-actions + attendeeUpsert gated on dispatch mode | `if (mode === "dispatch")` wraps the post-action loop | grep `mode === "dispatch"` near `executePostActions` call → 1 hit |
| A4 | engine.ts: dispatch_messages flag honored | `dispatch_messages !== false` controls dispatchPlanDirect call | grep `dispatchMessages` in engine.ts → ≥ 1 hit |
| A5 | prepare-plan.ts: queue_send branch skipped in evaluate mode | `if (mode === "evaluate")` short-circuit returns 0 queued | grep `mode === "evaluate"` in prepare-plan.ts → 1 hit |
| A6 | crm-confirm-send.js: 3-button modal | 3 buttons rendered (Cancel + Confirm-no-notify + Confirm-notify) | grep 'ccs-confirm-no-notify\|ccs-confirm-notify' → ≥ 2 hits each |
| A7 | crm-automation-client.js: handles 3-state modal result | passes `dispatch_messages` to dispatch call | grep `dispatch_messages` in client → 1 hit |
| A8 | Iron Rule 12 | all modified files ≤ 350 | `wc -l` per modified file |
| A9 | Integrity gate | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| A10 | Single commit for Part A | 1 ahead of origin | `git rev-list --count origin/develop..HEAD` → 1 |
| A11 | Pushed | local == origin/develop | post-push verify |

## 3bis. Success Criteria — Part B Step 1 (instrumentation)

| # | Criterion | Expected | Verify |
|---|-----------|---------|--------|
| B1.1 | `[AE-DIAG]` log lines added | ≥ 8 | `grep -c "AE-DIAG"` across engine.ts + prepare-plan.ts + dispatch.ts |
| B1.2 | EF deployed as v6 | success | `list_edge_functions` shows version ≥ 6 |
| B1.3 | Iron Rule 12 | EF files ≤ 350 | `wc -l` |
| B1.4 | Integrity gate | exit 0 or 2 | gate output |
| B1.5 | Single commit for Part B Step 1 | 1 ahead of (post-Part-A HEAD) | rev-list count |
| B1.6 | Pushed | local == origin/develop | post-push verify |

## 4. Part A — Atomic modal commit (server + client)

### A.1 — Server-side gating

Modify `supabase/functions/automation-engine/engine.ts`:

1. **Drop the Rung-2 short-circuit** at lines 95-101 (`if (mode === "dispatch" && Array.isArray(planItems) ...)`). Reason: dispatch mode now MUST run post-actions/queue_send (which were skipped in evaluate). Re-evaluation of rules is the new path, with client's `planItems` honored at dispatch step only.
2. **Gate post-actions + attendeeUpsert** (current lines 150-156) on `mode === "dispatch"`. Skip in evaluate mode entirely.
3. **Add `dispatchMessages` field** to `EvaluateInput` interface; parse from `body.dispatch_messages` in `index.ts` (default true if undefined).
4. **Decide which items to dispatch:** if `planItems` provided (browser confirm path), use those; else use re-evaluated `allItems` (cron path). Then if `!dispatchMessages || itemsToDispatch.length === 0`, skip dispatchPlanDirect — return `sent: 0` with post-actions already committed.

Modify `supabase/functions/automation-engine/prepare-plan.ts`:

5. **Add `mode` parameter** to `prepareRulePlan(...)` signature.
6. **Skip `prepareQueueSend`** call (current line 109) when `mode === "evaluate"`. Return `{items: [], skipped: 0, resolvedLeadIds: [], queued: 0}` instead. queue_send writes happen ONLY in dispatch mode (atomic commit).

Modify `supabase/functions/automation-engine/index.ts`:

7. Parse `dispatch_messages` from request body. Pass through to `evaluate(...)` input.

### A.2 — Client-side 3-button modal

Modify `modules/crm/crm-confirm-send.js`:

1. **`show(sendPlan, onChoice)`** signature — change second arg from `onApprove` to `onChoice`. The callback now receives `(choice, sendPlan)` where `choice = { dispatch: true } | { dispatch: false }`. Cancel button does NOT call `onChoice` (no commit, no side effects).
2. **3-button footer** with Prizma Design System Canon styling (per brief):
   - **Cancel** (`#ccs-cancel`): outline gray, copy `ביטול`. No callback.
   - **Confirm without notify** (`#ccs-confirm-no-notify`): secondary gray, copy `אישור ללא הודעות`. Calls `onChoice({ dispatch: false }, sendPlan)`.
   - **Confirm and notify** (`#ccs-confirm-notify`): primary indigo (gold-equivalent for Prizma canon), copy `אישור ושלח הודעות (N)` where N is total. Calls `onChoice({ dispatch: true }, sendPlan)`.
3. **Title:** `אישור פעולה`.
4. **Backward-compat note:** `crm-automation-engine.js:306` (legacy, unreachable in practice — Rung 3 will delete) is the only other caller of `show`. Its `show(planItems)` 1-arg call now hits a 3-button modal where confirm-without-notify and confirm-notify both call `approveAndSend(sendPlan)` (legacy fallback). Cancel does nothing. Acceptable since the path is unreachable.

Modify `modules/crm/crm-automation-client.js`:

5. **`evaluate(triggerType, triggerData)`** internal flow change:
   - Step 1 (unchanged): POST `mode='evaluate'` → receive `plan_items`, `run_id`. (NEW: post-actions + queue_send NO longer execute in evaluate mode — the EF is updated.)
   - Step 2 (unchanged): if no plan_items, return early.
   - Step 3 (CHANGED): pass `onChoice` callback to `CrmConfirmSend.show(planItems, onChoice)`. Inside callback:
     ```js
     async function (choice, approved) {
       const dispatchRes = await callEf({
         tenant_id: tid,
         trigger_type: triggerType,
         trigger_data: triggerData || {},
         mode: 'dispatch',
         plan_items: approved,
         run_id: runId,
         dispatch_messages: choice.dispatch === true
       });
       return dispatchRes || (choice.dispatch ? { sent: 0, failed: approved.length, rejected: 0 } : { sent: 0, failed: 0, rejected: 0 });
     }
     ```

### A.3 — Files in scope (Part A)

- `supabase/functions/automation-engine/engine.ts`
- `supabase/functions/automation-engine/prepare-plan.ts`
- `supabase/functions/automation-engine/index.ts`
- `modules/crm/crm-confirm-send.js`
- `modules/crm/crm-automation-client.js`

`crm-event-actions.js` and `crm-attendee-move.js` do NOT need changes — they call through `CrmAutomationClient.evaluate` which carries the new contract internally.

### A.4 — Cron path backward compatibility

The `event_day_status_flip` and `event_2_3d_before_status_flip` cron jobs POST `mode='dispatch'` without `plan_items` and without `dispatch_messages`. After Part A:
- `dispatch_messages` defaults to `true` → full dispatch behavior preserved.
- No `plan_items` → re-evaluated `allItems` used → same as today.
- Post-actions + queue_send fire in dispatch mode → same as today.

**Cron path: zero behavior change. Verified by test scenario in §A.5.**

### A.5 — Manual QA — Daniel runs (Part A) on **demo only**

After Part A v5 deployed, on demo (`crm-events-detail.js` flow):
1. Open event → change status to `registration_open`. Modal appears with 3 buttons.
2. Click **ביטול** → modal closes, no DB change. Verify `crm_event_attendees.status` unchanged for affected rows + no rows in `crm_message_log` for this run.
3. Repeat → click **אישור ללא הודעות** → status changes (verify post-action commits attendees → `invited`) BUT no messages send (verify no new `crm_message_log` rows for this run_id).
4. Repeat → click **אישור ושלח הודעות** → status changes AND messages dispatch. Verify `crm_message_log` rows exist with allowlisted phones only.
5. Repeat (4-step set) for attendee-move flow.

**Stop trigger:** any prizma write without explicit Daniel approval → halt + escalate.

---

## 5. Part B Step 1 — Diagnostic instrumentation

Add `console.log()` calls to the EF, tagged with `[AE-DIAG runId=<runId>]` for grep-ability. After v6 deploys, Daniel reproduces the bug 2 scenario on demo (move attendee with notify=ON), then logs are captured via `mcp__claude_ai_Supabase__get_logs`.

### Log placements

`supabase/functions/automation-engine/prepare-plan.ts`:
- **Entry to `prepareRulePlan`:** log `runId`, `rule.name`, `rule.action_type`, `triggerData`.
- **Exit of `prepareRulePlan`:** log `runId`, `rule.name`, `items.length`, `skipped`, `queued`.

`supabase/functions/automation-engine/engine.ts`:
- **Entry to dispatch loop** (line 201 area): log `runId`, `allItems.length`, `mode`, `dispatchMessages`.
- **Each early-return inside dispatch path** (e.g., `mode === 'evaluate'` return, `!allItems.length` return, `!dispatchMessages` return): log `runId`, `reason`.
- **Post-action loop entry:** log `runId`, `rules.length`, `mode`.

`supabase/functions/automation-engine/dispatch.ts`:
- **Entry to `dispatchPlanDirect`:** log `runId` (passed via plan items' run_id), `items.length`.
- **Each item iteration result** (sent/failed/rejected): log `runId`, `lead_id`, `outcome`.
- **Exit of `dispatchPlanDirect`:** log `runId`, final `sent/failed/rejected` counts.

### Step B.1 commit + STOP

After v6 deploys + commit pushes:
- Print to Daniel: "Step B.1 deployed (v6 with `[AE-DIAG]` logging). Please reproduce the bug on demo: move an attendee between events with the 'send update' toggle ON. Then I capture logs and proceed to Step B.2."

**Daniel reproduces, pastes confirmation.** Then session continues: Step B.2 captures logs, writes FINDINGS.md, then Step B.3 fix → v7, Step B.4 logs removed → v8.

---

## 6. Out of scope

- Refactoring the entire `automation-engine` EF.
- Migrating any data on prizma.
- Adding new automation rule types.
- Realtime / polling work (separate post-cutover SPEC).
- Bug 3 (counter display) — separate SPEC `ATTENDEE_COUNTER_DISPLAY_FIX`.
- ANY write to prizma's `crm_event_attendees`, `crm_message_log`, `crm_message_queue`, or `crm_leads` without explicit Daniel approval.

## 7. Stop triggers (in addition to brief globals)

- ANY prizma write without explicit Daniel approval → HARD HALT.
- Step B.2 logs reveal bug is client-side (hypothesis ii from Supervisor) → pivot SPEC scope, document in FINDINGS, continue.
- Modal redesign breaks an existing flow not previously surfaced → halt + escalate.
- Engine fix introduces regression on V10 event-day flow or other rules → halt + revert.
- Demo data insufficient for testing → seed it on demo (NOT prizma).

## 8. Commit plan

Today (this session):
- **Commit 1 — Part A:** `feat(crm): atomic modal commit — 3-button contract for status+dispatch` (5 files: 3 EF + 2 client). EF deployed as v5.
- **Commit 2 — Part B Step 1:** `chore(automation-engine): temporary diagnostic logging for dispatch silent-drop investigation` (3 EF files modified). EF deployed as v6.
- **STOP** for Daniel reproduction.

Future session(s):
- **Commit 3 — Part B Step 3 (fix):** `fix(automation-engine): dispatch silent-drop after recipients identified` (1-3 line EF fix). EF deployed as v7.
- **Commit 4 — Part B Step 4 (cleanup):** `chore(automation-engine): remove temporary diagnostic logging`. EF deployed as v8.

All commits push to `origin/develop`. **Do NOT merge to main.** Daniel handles PR-merge himself per `feedback_main_merge_via_pr.md`.
