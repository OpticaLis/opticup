# M4_DUAL_PATH_DEPRECATION_PHASE_1 — Activation Prompt (overnight 2026-05-19→20)

You are running the final repair SPEC for the M4 CRM stabilization. Read the Brief at:

`modules/Module 4 - CRM/architecture-brief/M4_DUAL_PATH_DEPRECATION_PHASE_1_BRIEF.md`

Author the SPEC (`opticup-strategic` Foreman role), then execute Foreman → Executor → Reviewer → Localhost-Tester → Foreman close.

**Context Daniel just gave (essential to the Pipeline's correctness):**

- Customer impact today: every event status change produces 2 messages per recipient (dual-path). This is a known design state since 2026-05-14 STATUS_TRIGGER_FRAMEWORK_EXTENSION; the deprecation was always planned (this Brief).
- Daniel needs to open a Prizma event TOMORROW (2026-05-20). The Pipeline must produce exactly-1 message per recipient per status change. No more deferrals.
- Pipeline budget: overnight tonight, can run as long as needed.
- Verification budget: full §2.1 latency benchmark must run + soak time. Daniel authorized: "ה-Pipeline יכול לעבוד כל הלילה."

**Pre-conditions:**

1. `git status` clean on develop.
2. Pipeline lock claimed (`scripts/pipeline-coordination.mjs claim --spec-slug=M4_DUAL_PATH_DEPRECATION_PHASE_1`).
3. Smoke 7/7 PASS pre.
4. The 4 prior M4 SPECs (`M4_CONFIG_SYNC_INFRASTRUCTURE`, `M4_CONFIG_PARITY_RUN_1`, `M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX`, `M4_STATUS_CHANGE_MODAL_GATE_FIX`) all 🟢 on develop. Confirm via `git log --oneline -20`.
5. `M4_ENQUEUE_REGRESSION_FIX` 🟢 (commit `1909450`) — the queue idempotency fix from this morning that enabled enqueue at all.

**Special verification requirements that go BEYOND the Brief §3 criteria:**

The Brief's §3 verification requires "Status change → 1 run row." This is NOT sufficient given today's evidence. Daniel observed a FEEDBACK LOOP: rule `b53f6ea5` ("שינוי סטטוס: נפתחה הרשמה") fires on event status change, which sends a message to the matching lead, which (via post_action or rule chain) flips the lead's status from `waiting` to `invited`, which triggers ANOTHER status_change event on the lead, which the consumer processes, which produces ANOTHER run, etc. Independent of dual-path, this loop will continue to cause repeat sends.

Therefore, the Executor MUST verify additionally:

**V-EXTRA-1 — Single-event verification:** Toggle event #28 (TEST2) status `planning → registration_open` on demo ONCE. Wait 90 seconds. Count:
- `crm_automation_runs` rows with this event_id: MUST equal exactly 1.
- `crm_message_log` rows with `status='sent'` matching this run_id: MUST equal exactly 1 per channel (1 SMS + 1 email = 2 rows total, since the rule's action_config includes both channels). NOT 2 SMS + 2 email = 4 rows.
- `crm_status_change_events` rows arising from this toggle: MUST equal exactly 1 (the event toggle itself, not lead-side derivative events from the post_action).

**V-EXTRA-2 — Loop verification:** After V-EXTRA-1's 90s window passes, observe if any FURTHER `crm_status_change_events` rows appear that reference the same lead_id (or any lead_id). If yes — the post_action loop is still firing. Document the chain.

If V-EXTRA-2 fires (loop continues): the Pipeline MUST also implement loop guard. Concrete approach (Architect-tier recommendation, Executor decides exact implementation):
- Option L1: Add a `rule_id NOT IN (...)` filter in the consumer's rule-match logic that prevents the same rule from firing twice on the same lead within a 1-hour window.
- Option L2: Add an "originated_from_rule_chain" flag on the status_change_events that the consumer respects — if a status change was caused by a rule's post_action, mark it so the consumer skips re-evaluation.
- Option L3: Detect the cycle at rule-author time — add a `cycle_check` constraint in `crm_automation_rules` that flags rules whose post_action could re-trigger themselves.

If V-EXTRA-2 doesn't fire, the loop was an artifact of dual-path (both paths firing fed each other through the queue idempotency partial uniqueness). Then no loop guard is needed.

**Latency benchmark (Brief §2.1):**

Run 5 status changes on demo, spaced ≥ 90 seconds apart (so each is fully independent). Measure created_at→consumed_at for `crm_status_change_events`. Compute P50 and P95. Document in `_archive/m4-dual-path-deprecation-2026-05-19/latency-benchmark.json`. ACCEPTANCE: P95 < 65 seconds. If P95 ≥ 65s, STOP per Brief §2.1.

**Pre-deploy state capture (in addition to standard Pipeline flow):**

Save EF snapshots BEFORE any code edit:
- `automation-engine` → `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre.ts`
- `dispatch-queue` → ` ... /dispatch-queue-pre.ts`
- `send-message` → ` ... /send-message-pre.ts`

Create rollback git tag `pre-m4-dual-path-deprecation-2026-05-19` BEFORE the first commit.

**Heartbeat:**

Every 20 minutes append to `_archive/m4-dual-path-deprecation-2026-05-19/heartbeat.md` with timestamp + current phase + current SPEC status. Daniel will read this in the morning.

**STOP triggers (non-negotiable):**

1. P95 latency ≥ 65 seconds → STOP per Brief §2.1.
2. V-EXTRA-1 fails after first attempt → STOP, analyze, iterate. Do not declare done until V-EXTRA-1 is fully green.
3. V-EXTRA-2 detects a loop AND the Pipeline cannot implement a loop guard in this run → STOP, document, escalate.
4. Any write attempt to Prizma row data → STOP.
5. After 3 attempts of "fix → verify → fail" → STOP, write escalation file, halt.

**Final report:**

When all 6 §3 criteria + V-EXTRA-1 + V-EXTRA-2 are green:

Update `_archive/m4-overnight-2026-05-18/MORNING_SUMMARY_FOR_DANIEL.md` to add a "Final closure 2026-05-20" section. Include:
- P50 + P95 latency numbers (from benchmark).
- V-EXTRA-1 + V-EXTRA-2 test results.
- Whether loop guard was needed and what was chosen.
- EF version numbers post-deploy.
- Full status: 5 SPECs 🟢, M4 stabilized for production.

Emit one Hebrew line to Daniel:

> "M4_DUAL_PATH_DEPRECATION_PHASE_1 🟢 נסגר. [N] commits. P95 latency: [X]s. הודעה אחת לכל החלפת סטטוס אומת על דמו. [loop guard נוסף / לולאה לא נצפתה]. M4 יציב לאירוע פריזמה מחר."

If halted, emit:

> "M4_DUAL_PATH_DEPRECATION_PHASE_1 נעצר ב-[trigger]. דוח: [path]. ממתין להחלטת דניאל."

**Constraints summary:**

- Demo tenant only. Prizma 100% read-only.
- Test phone allowlist enforced (already wired in EF, but verify in §3.7 deploy).
- Iron Rules 12/21/23/31/32 enforced every commit.
- Linear Foreman→Executor→Reviewer→Localhost-Tester→Foreman; no parallel SPECs.
- Heartbeats every 20 min.

Read the Brief now and start with the pre-flight checklist.
