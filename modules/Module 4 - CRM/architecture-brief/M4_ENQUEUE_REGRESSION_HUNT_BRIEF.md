# M4 Enqueue Regression Hunt — Find it, Fix it, Verify it. No stops.

**Status:** Brief — execute immediately. Full-Auto Pipeline with explicit no-stop authorization.
**Authored by:** Architect (Cowork, 2026-05-19 morning, post-3-SPEC sequence)
**Priority:** P0 — REGRESSION. Customer-impact: every event-status-change message is silently lost again.

---

## 1. The Bug (verified live, 2026-05-19 08:42-08:55 IL)

Daniel toggled event #28 (TEST2) status `planning ↔ registration_open` 6 times in 15 minutes. Each toggle:

- ✅ Inserted a row into `crm_status_change_events` (consumed by cron within ~15s)
- ✅ Created a row in `crm_automation_runs` with `status='completed'`
- ✅ Rule `b53f6ea5` ("שינוי סטטוס: נפתחה הרשמה") matched and fired
- ✅ 3 of 6 runs reported `total_recipients=2`
- ❌ **ZERO rows in `crm_message_queue`**
- ❌ **ZERO rows in `crm_message_log`**

No error_message anywhere. No `rejected` log row. No `failed`. Just silent zero.

**Contrast:** at 08:33:02 (~25 minutes earlier, before SPECs 3+4 fully landed) the same rule fired and produced 2 `status='sent'` rows in `crm_message_log`. Same rule, same recipients, same event. Something changed between 08:33 and 08:42 that broke the enqueue path.

**The UI symptom Daniel sees:** "0 הודעות נשלחו לתור הודעות" modal/toast, no rows appear in the messages-queue page.

**The data state:**
- Rule `b53f6ea5` `updated_at` is `2026-05-19 08:55:16` (was updated *during* the run sequence — Pipeline activity, not Daniel)
- `recipient_type: tier2`, `recipient_status_filter: [waiting]`
- Demo has 1 lead with `status='waiting'`, 0 attendees on event #28

---

## 2. The Investigator Mandate — No Stops Until Fixed

**This is not investigation-only.** This is investigation + repair + verification, end-to-end, in one Pipeline run. **Do not stop on the first symptom. Do not stop until messages actually flow.**

The Brief authorizes:
- Reading any file (code, EF source, DB).
- Writing fixes to any M4 file in `modules/crm/**`, `supabase/functions/automation-engine/**`, `supabase/functions/send-message/**`, `supabase/functions/_shared/**`, `supabase/functions/dispatch-queue/**`.
- Redeploying EFs as needed (use deploy_edge_function MCP; fall back to CLI per OPEN-021).
- Running SELECT queries to validate state.
- Running write queries ONLY when explicitly part of a fix (e.g., correcting a malformed config row, NOT mass updates). All writes are demo tenant only; Prizma stays read-only.
- Triggering test status changes on event #28 (TEST2) on demo as part of verification.
- Multiple commits as the fix evolves.

The Brief FORBIDS:
- Any write to Prizma tenant data (read-only).
- Any change to scripts/ or CLAUDE.md or Iron Rules (this is a code-level regression hunt, not infrastructure).
- Stopping at "I found something interesting" — keep going until VERIFICATION criterion §4 is green.

---

## 3. Investigation Sequence

Run these in order. Each step's output feeds the next. Do not skip steps.

### Step 3.1 — Diff the EF source

Compare `supabase/functions/automation-engine/` against the snapshot in `_archive/m4-overnight-2026-05-18/ef-snapshots/`. Identify EVERY changed file + line range. Particular attention to:
- `prepare-plan.ts` (touched by SPEC 3)
- `index.ts` (entry point — may have been touched by SPEC 4's `rule_match_probe` mode addition)
- Any enqueue/insert path (`queue_messages` or similar function names)

### Step 3.2 — Read the run records for the 08:42-08:55 window

Query `crm_automation_runs` for the 8 recent runs. Inspect:
- `trigger_data` shape (consumer vs browser path — both shapes present per QA report Finding 1.4)
- `total_recipients` vs `sent+failed+rejected_count` (already known: 2 vs 0+0+0)
- `error_message` (already known: NULL)
- The exact code path that updates `crm_automation_runs.finished_at` without inserting into queue/log

### Step 3.3 — Read the consumer + prepare-plan + enqueue code path

Trace from `consumeStatusChangeEvents` → rule evaluation → recipient resolution → template prep → `crm_message_queue.insert`. Identify where it short-circuits to "completed with 0 sent" without writing a queue row.

### Step 3.4 — Specifically check what SPECs 3 and 4 changed

- SPEC 3 added 2 SELECT columns + 3 variable keys to `prepare-plan.ts`. Did this break the path that previously was working at 08:33?
- SPEC 4 added `rule_match_probe` mode and `suppressEmptyModal` semantics. Did this divert event-status-change runs from "actual dispatch" to "probe-only" silently?
- Read both SPECs' EXECUTION_REPORT.md and FINDINGS.md for hints.

### Step 3.5 — Form the root-cause hypothesis

Document in `outputs/M4_ENQUEUE_REGRESSION_FINDINGS.md` (Hebrew exec summary + English body). State:
- Exact file:line where the enqueue is skipped
- Which SPEC introduced it (3 or 4 or interaction)
- Why it wasn't caught by either SPEC's verification

### Step 3.6 — Fix it

Apply the minimum fix that restores enqueue behavior WITHOUT breaking the rule_match_probe mode (which the modal needs). The fix may be:
- A flag to differentiate "real dispatch" from "probe" in the engine
- Removing an accidental short-circuit
- Re-wiring a call path that was reordered

### Step 3.7 — Redeploy

`automation-engine` and `send-message` as needed. Capture new version numbers.

### Step 3.8 — Verify end-to-end

Trigger 2 test status changes on event #28 yourself (planning → registration_open):
1. First test: should produce ≥1 `status='sent'` row in `crm_message_log` within 60s.
2. Second test: same.

If both produce sent rows → fix verified. Document in EXECUTION_REPORT.md. Move on to Step 3.9.

If verification fails → loop back to Step 3.1 with the new evidence. Keep iterating. **Do not stop, do not declare done, do not write FOREMAN_REVIEW until both tests produce sent rows.**

### Step 3.9 — UI: Add date to messages-queue table

Separate concern from the regression. The `queue-live` page (messages queue UI) shows only the time, not the date. Add the date prefix to the "נוצר" column. File likely `modules/crm/crm-messaging-queue.js` or similar — grep for "queue-live" or "תור הודעות".

This is a minor UI fix; ship in the same Pipeline since the Pipeline is already open.

### Step 3.10 — Close

Write standard EXECUTION_REPORT + FINDINGS + REVIEW + (Tester if applicable) + FOREMAN_REVIEW. Update _archive/m4-overnight-2026-05-18/MORNING_SUMMARY_FOR_DANIEL.md with the regression closure.

---

## 4. Verification (the bar that must be green to call this done)

1. ✅ Toggle event #28 status `planning → registration_open` on demo.
2. ✅ Within 90 seconds: ≥1 `crm_message_log` row with `status='sent'` (or `status='skipped_no_token'` / `status='rejected: phone_not_allowed'` — the resolver finished and the dispatch was attempted).
3. ✅ ZERO `crm_message_log` rows with `status='rejected'` and `error_message LIKE 'unsubstituted_placeholder%'`.
4. ✅ Repeat (1) with a second toggle. Same result.
5. ✅ `crm_automation_runs.total_recipients = sent + failed + rejected` (no silent gap).
6. ✅ Messages queue UI shows the date alongside the time.
7. ✅ smoke 7/7 PASS.
8. ✅ Iron Rules 12/31/32 enforced.

ANY of these failing → keep working. Do not close the Pipeline.

---

## 5. Destructive Operations

- Status-change toggle traffic on event #28 (TEST2) on demo only — generates rows in `crm_event_status_history`, `crm_status_change_events`, `crm_automation_runs`, potentially `crm_message_queue` + `crm_message_log`. ALL on demo.
- Possible config-row UPDATE on demo `crm_automation_rules` if the regression was caused by SPEC 2's sync writing a malformed action_config (low probability, but authorized if needed).
- Code edits + commits on develop.
- EF redeploys (overwrite EF version in Supabase).

ZERO writes to Prizma.

---

## 6. Heartbeat + Stop Triggers (REVISED — minimal)

- Heartbeat to `_archive/m4-overnight-2026-05-18/heartbeat.md` every 20 minutes.
- The ONLY stop triggers:
  1. A write attempt to Prizma row data.
  2. An attempt to commit destructive ops not declared in §5.
  3. Daniel sends a manual stop in chat.
  4. After 3 iterations of "fix → verify → fail," document state and write `outputs/M4_ENQUEUE_REGRESSION_ESCALATION.md` (Architect intervention needed, root cause unclear).

Otherwise: keep going.

---

## 7. Estimated Wall-Clock

60-120 minutes depending on whether the root cause is obvious from the EF diff or requires multiple iterations.

