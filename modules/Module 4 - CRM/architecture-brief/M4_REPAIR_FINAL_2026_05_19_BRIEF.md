# M4 Repair Final 2026-05-19 — Restore Working CRM Messaging, End-to-End, Verified

**Status:** EMERGENCY REPAIR. Daniel needs to open a Prizma event tomorrow (2026-05-20). Today's main merge broke event-status messaging entirely. Architect is no longer accepting Pipeline self-reports — every closure MUST include live verification by the Executor in Chrome on localhost.

**Authored by:** Architect (Cowork, 2026-05-19 ~10:50 IL).
**Pipeline mode:** Full-Auto with mandatory live verification.
**Priority:** P0 — production blocker.

---

## 1. Current State (the mess)

### 1.1 What's broken right now
- Event status change in CRM → ZERO messages sent (verified on localhost by Daniel just now).
- This applies on BOTH demo AND Prizma (main has the broken code).
- Modal "אישור פעולה" does not appear at all when status changes.
- `cron.consume_status_change_events` was unscheduled (~10:40 IL) to stop a feedback loop that was sending duplicate messages.

### 1.2 What changed today (the regressions)
- 6 SPECs merged today: `M4_CONFIG_SYNC_INFRASTRUCTURE`, `M4_CONFIG_PARITY_RUN_1`, `M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX`, `M4_STATUS_CHANGE_MODAL_GATE_FIX`, `M4_ENQUEUE_REGRESSION_FIX`, `M4_DUAL_PATH_DEPRECATION_PHASE_1`.
- `M4_DUAL_PATH_DEPRECATION_PHASE_1` (commit `8d9a365` + `38e0fe2`) removed the browser fire-and-forget `evaluate` from `crm-event-actions.js`. The intent was to leave a `rule_match_probe` call for the modal-UX path, but the implementation appears to have removed too much — the modal no longer opens at all on event status change.
- `M4_STATUS_CHANGE_MODAL_GATE_FIX` (commits `2be033f` + `745d357`) modified `crm-confirm-send-v2.js` and `crm-event-actions.js` to gate modal-open on recipient existence — this may have interacted badly with the dual-path removal.
- The `cron.consume_status_change_events` removal means even if a status change DID enqueue, nothing would dispatch.

### 1.3 What is verified working (do not touch)
- `crm_message_templates` resolver — `event_day_of_week`, `event_deposit_amount`, `event_max_attendees` populate correctly (SPEC 3 success).
- `crm_message_queue` idempotency — partial index on `(tenant_id, run_id, lead_id, template_slug, channel)` works (SPEC regression fix).
- `dispatch_queue` cron — drains the queue every minute correctly. Both EFs (`automation-engine` v17, `send-message` v27) deployed.
- Demo `config_parity` with Prizma — sync ran successfully.
- The rollback tag `pre-m4-dual-path-deprecation-2026-05-19` exists on commit `f749ff2`.

---

## 2. Pipeline Mandate

### 2.1 First decision: rollback or repair forward?

**The Executor (with Foreman input) decides between two paths:**

**Path A — Rollback SPEC 5 only.** Revert commits `8d9a365` + `38e0fe2` on develop. Re-enable `cron.consume_status_change_events`. This restores the pre-SPEC-5 state where:
- Modal opens correctly (SPEC 4's modal gate fix is preserved).
- Dual-path still produces 2 messages per status change (the known issue from QA Finding 1.4).
- All other SPECs (2, 3, modal fix, enqueue fix) remain in place.

Daniel CAN open the Prizma event tomorrow on this state. Customers get 2 identical messages. Not ideal but functional.

**Path B — Repair SPEC 5 forward.** Keep the dual-path deprecation in place, but fix the bug that the modal no longer opens. This means:
- Identify exactly what changed in `crm-event-actions.js` / `crm-confirm-send-v2.js` that killed the modal.
- Re-wire `rule_match_probe` as the modal trigger (per SPEC 4's design).
- Re-enable `cron.consume_status_change_events`.
- Add loop guard so the lead status change (`waiting → invited`) does not cascade-trigger another message (the feedback loop Daniel observed).

Foreman chooses based on time-to-fix estimate. If Path B is < 4 hours and Executor is confident — go Path B. If estimate is ≥ 4 hours or uncertainty — go Path A (safer, preserves Prizma event tomorrow).

### 2.2 Live verification is non-negotiable (the rule that was missing this morning)

Before declaring this SPEC closed, the Executor MUST:

1. **Run a fresh demo localhost session.** Chrome MCP open, navigate to `http://localhost:3000/crm.html?t=demo`. Authenticate.
2. **Capture an instrumentation trace** as in QA Appendix A (window.__modalTrace).
3. **Toggle event #28 (TEST2) status `planning → registration_open`.**
4. **Verify, by Chrome MCP screenshot + console output + DB query**, ALL of these are true:
   - The modal "אישור פעולה" OPENS in the browser (not flash-and-disappear, not absent — opens and stays open until user interaction).
   - The modal shows the recipient list (≥1 recipient — there is 1 lead with status=waiting on demo).
   - User clicks "אישור" in the modal.
   - Within 90 seconds: exactly 1 row in `crm_automation_runs` for this status change.
   - Within 90 seconds: exactly 2 rows in `crm_message_log` (1 SMS + 1 EMAIL, both `status='sent'`).
   - ZERO rows in `crm_message_log` with `status='rejected'` for this run.
   - ZERO additional unsolicited runs in the next 5 minutes (feedback loop test).
5. **Save evidence:** Chrome MCP screenshots, console log dump, DB query results — all to `_archive/m4-repair-final-2026-05-19/verification/`.
6. **Repeat the test once more** (second toggle, fresh state) — must produce same result.

If ANY of the 6 checks fails — the SPEC is NOT done. Loop back. Do not declare green based on smoke 7/7 alone (smoke does not exercise the modal lifecycle).

### 2.3 Sentinel post-fix

After the SPEC is verified green, the Executor schedules `cron.consume_status_change_events` back on (1 min). Verify with `SELECT * FROM cron.job WHERE jobname='consume_status_change_events'`.

---

## 3. Verification Criteria (the bar — all 6 must be green)

1. Event status change in localhost produces the modal (opens AND stays).
2. Confirming the modal triggers exactly 1 automation run + 2 message_log rows.
3. ZERO duplicate messages within 5 minutes of confirming.
4. ZERO feedback loop (no derivative status_change_events that produce additional sends to the same lead).
5. `cron.consume_status_change_events` re-enabled if removed.
6. Smoke 7/7 PASS.

Plus the always-on: Iron Rules 12/21/23/31/32 enforced.

---

## 4. Destructive Operations

- `git revert` on develop (Path A) or further code edits (Path B) — both pre-authorized.
- `SELECT cron.schedule(...)` to re-enable the consumer cron — pre-authorized.
- Demo toggles for verification — pre-authorized.

ZERO writes to Prizma row data.

---

## 5. Heartbeat + Stop Triggers (minimal)

- Heartbeat every 15 min to `_archive/m4-repair-final-2026-05-19/heartbeat.md`.
- Stop triggers:
  1. Path B chosen + 3 fix iterations failed → switch to Path A.
  2. Path A chosen + revert produces conflicts → STOP + escalate.
  3. Any Prizma row write attempt.
  4. Daniel sends a manual stop.

---

## 6. Closure Requirement — Live Demo Verification Evidence Mandatory

The Executor MUST attach to the FOREMAN_REVIEW.md:
- Chrome MCP screenshot showing modal OPEN.
- Chrome MCP screenshot showing modal CONFIRM clicked.
- Chrome MCP console output showing `window.__modalTrace.events` array with Modal.show + modal.close timing.
- DB query result confirming 1 run + 2 sent rows.
- DB query result showing zero loop (no derivative SCE within 5 min).

Without all 5 artifacts — the SPEC is not closed. The Architect (next session) will reopen if missing.

---

## 7. Estimated Wall-Clock

- Path A: 30-45 min (revert + cron re-enable + verification).
- Path B: 2-4 hours (diagnose + fix + verify + loop guard if needed).

Start by reading the recent commits + running the localhost verification once to confirm current broken state. Then choose path.

