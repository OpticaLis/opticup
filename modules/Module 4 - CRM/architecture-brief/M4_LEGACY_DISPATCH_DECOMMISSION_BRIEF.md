# M4 Legacy In-Process Dispatch Decommission — Brief

**Brief version:** v1
**Date:** 2026-05-14 (overnight)
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, overnight, ~6-10 hours, possibly more)
**Model preference:** Opus (high-stakes — production automation rewire with full regression coverage)
**Owning module:** Module 4 — CRM
**Mode:** Multi-phase autonomous run with mandatory localhost-tester gate on EVERY automation. Daniel reviews ALL outcomes in the morning before any main merge.

---

## 1. Purpose

Today the CRM runs TWO automation engines side by side:
- **Legacy in-process engine** — browser-side `CrmAutomation.evaluate` chain, called from event-edit, attendee-move, attendee-cancel, lead-status-change, broadcast-send, etc. Fires synchronously at the time of the operator action.
- **New queue-based engine** — `crm_status_change_events` queue + `automation-engine` EF consumer + pg_cron schedule. Recently (2026-05-14 overnight Round 2) extended to cover lead + event entities; previously attendee-only.

Both paths fire on overlapping triggers. The result is asymmetric, hard to reason about, and brittle. Maintaining two engines is technical debt with operational cost — every new automation must be wired in both worlds.

This Brief decommissions the legacy in-process path. Every automation rule it fires today gets migrated to the queue-based engine, verified end-to-end on demo via localhost, and ONLY then the legacy code path is removed. Daniel will personally review the morning summary before merging develop → main.

---

## 2. Safety Envelope — Non-Negotiable

### 2.1 Pre-run safety tag
First action:
```
git tag -a pre-legacy-dispatch-decommission-2026-05-14 -m "Pre-legacy-dispatch-decommission baseline; revert here if anything goes wrong"
git push origin pre-legacy-dispatch-decommission-2026-05-14
```
Single rollback point for the ENTIRE run.

### 2.2 Branch + merge rules
- All work on `develop`. NEVER touch `main`. Daniel handles the PR after morning review.

### 2.3 Test-recipient whitelist (HARD GATE)
This is the strictest constraint of the run. ANY test message sent during this run MUST go to one of these recipients ONLY:

- **Phones (SMS):** `0537889878`, `0503348349`, `0507168471`
- **Emails:** `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`

Any test that would dispatch to ANY other recipient → STOP IMMEDIATELY, write escalation file, halt all work. The whitelist is enforced in DB via `tenants.test_mode_sms_allowlist` + `ui_config.test_mode_email_allowlist` — verify both on demo BEFORE the first test message fires. If allowlists don't match this set, STOP and escalate (do NOT update them autonomously).

### 2.4 Tenant write rules
- **Demo tenant ONLY for all testing.** Tenant UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
- **Zero writes to Prizma rows of any kind** (data OR config OR DDL) until the final phase. Even then, only the legacy-code-removal phase touches Prizma (no DML).
- All automation migrations + tests happen on demo. Prizma is read-only throughout migration + testing.

### 2.5 Localhost requirement
The run requires `http://localhost:3000` (ERP) running for browser-side smoke tests of automation flows. Daniel has confirmed he will start localhost manually before the run via `scripts/start-local.ps1`. If localhost is not reachable on first health check:

1. Attempt to start it via `scripts/start-local.ps1` (the script is idempotent).
2. If still not reachable after the script's 30-second health check, STOP, write escalation, halt run. Do NOT attempt to migrate any automation without localhost-tester capability.

### 2.6 DDL rules
- Schema changes are minimal — possibly NONE. The queue framework already exists. Migration is about wiring automation rule rows + removing JS code, not schema.
- If any DDL beyond `INSERT INTO crm_automation_rules` (data writes only on demo) surfaces as needed → STOP, escalate.

### 2.7 Iron Rules in force
- Rule 31 (Integrity Gate): exit 0 or 2 mandatory before each commit.
- Rule 32 (Destructive Operations Gate): every SPEC declares destructive ops.
- Rule 12 (350-line file cap).
- Rule 15 (Canonical RLS).
- Rule 21 (No Orphans / No Duplicates).
- Rule 22 (Defense in depth on REVOKE + grant operations).

### 2.8 Time budget
- No hard cap. Daniel approves runs up to ~10+ hours. Quality > speed.
- However, if a SPEC phase loops (e.g., a single automation fails localhost-test 5 times in a row), STOP after the 5th attempt, escalate, continue with OTHER automations.

### 2.9 Escalation protocol
If any of these arise:
- An automation cannot be migrated cleanly (legacy path has logic the queue-engine doesn't yet support).
- A test message would be dispatched to a non-whitelisted recipient.
- A localhost-tester confirmation step fails 5 times in a row on the same automation.
- An Iron Rule conflict that can't be resolved.
- An assumption in this Brief is contradicted by live state.

→ STOP. Write escalation file `modules/Module 4 - CRM/escalations/{ISO_TS}_LEGACY_DISPATCH_DECOMMISSION_BLOCKER.md` with full context + options. Continue with OTHER independent automations. Daniel reviews in the morning.

### 2.10 No main merge by Pipeline
The morning summary explicitly tells Daniel: "Do NOT auto-merge. Review every automation's test artifact before merging." The Pipeline is 100% accountable for verifying correctness, but the merge decision is Daniel's after his own spot-check.

---

## 3. Phases of Work

### Phase 1 — Discovery (~30-60 min)

Build a complete inventory of every legacy in-process automation call:

1. Grep all of `modules/crm/` for invocations of `CrmAutomation.evaluate`, `CrmAutomation.run`, `CrmAutomation.fire`, or any equivalent. Document each call site:
   - File + line.
   - The operator action that triggers it.
   - Which `crm_automation_rules` rows it matches against.
   - What the rule's `trigger_event` is.
   - What the rule's `action_type` is (send_message, update_status, etc.).
2. Cross-reference against the live `crm_automation_rules` table for both Demo + Prizma:
   - List every rule that fires through the legacy path.
   - Identify rules that ALREADY ALSO fire through the queue (double-firing risk).
   - Identify rules that the queue doesn't yet cover.
3. Build a migration plan: one row per automation rule, with columns "Rule slug | Legacy callsite | Queue equivalent | Migration action | Smoke needed".
4. Save the plan to `modules/Module 4 - CRM/docs/audits/LEGACY_DISPATCH_INVENTORY_2026_05_14.md`.

If discovery surfaces more than ~30 distinct automations → STOP, ask Architect (write escalation file). The scope premise (~10-15 automations) may be wrong.

### Phase 2 — Per-automation migration with localhost gate (the bulk of the run)

For EACH automation rule identified in Phase 1:

1. **Identify the equivalent trigger in the queue framework.** If the rule's trigger doesn't have a queue mapping yet, log as a BLOCKER for that automation. Continue with the others.
2. **Modify the legacy callsite** to NOT fire (comment out or remove the `CrmAutomation.evaluate(...)` call) while keeping the surrounding code intact.
3. **Verify the queue framework will fire** for the same triggering event (via DB trigger on status changes, or other queue producer).
4. **Localhost-test the automation end-to-end** on demo:
   - Open `http://localhost:3000` (use Chrome MCP).
   - Perform the operator action (e.g., change a lead's status, cancel an attendee).
   - Watch for the queue row to land in `crm_status_change_events`.
   - Watch for the consumer to enqueue a message in `crm_message_queue`.
   - Watch for the message to actually dispatch to a whitelisted phone/email.
   - Verify the recipient received the correct message body via DB inspection (`crm_message_log`).
5. **If the smoke passes:** mark this automation MIGRATED, commit (1 commit per automation), move on.
6. **If the smoke fails 5 times in a row:** STOP this automation, log escalation, move to the next.

### Phase 3 — Full regression sweep (~1-2 hours)

After every automation in Phase 1's inventory has been migrated (or escalated):

1. Walk through EVERY operator action one more time, end-to-end, in localhost. This time NOT to migrate, but to confirm nothing broke during the migration churn. Use the inventory from Phase 1 as the checklist.
2. For every successful run, capture a SQL snapshot of the dispatch chain (queue row → consumer → message_queue → message_log) in `modules/Module 4 - CRM/docs/audits/LEGACY_DISPATCH_DECOMMISSION_REGRESSION_2026_05_14.md`.
3. If any automation fails in the regression that previously passed in Phase 2, STOP, mark it as REGRESSION, escalate.

### Phase 4 — Legacy code removal (~30 min)

ONLY if all of Phase 2 + Phase 3 are green (no automation is in "ESCALATED" or "REGRESSION" state):

1. Remove the legacy `CrmAutomation.evaluate` and equivalent dispatch entry points from `modules/crm/`.
2. Remove the now-dead helper files (`crm-automation-engine.js`, `crm-automation-post-actions.js`, `crm-automation-recipient-resolvers.js` if all consumers gone, etc.) per Rule 21.
3. Update `modules/Module 4 - CRM/docs/MODULE_MAP.md` to reflect the removed files.
4. Update `CLAUDE.md` if it references the legacy path.

If ANY automation is still ESCALATED or REGRESSION at this point, SKIP Phase 4. The legacy code stays in place. Phase 4 is a hard gate — all green or nothing.

### Phase 5 — Morning summary

Write `modules/Module 4 - CRM/docs/audits/LEGACY_DISPATCH_DECOMMISSION_SUMMARY_2026_05_14.md` with:

- Master tag hash + rollback command.
- Phase 1 inventory: list of every automation found.
- Phase 2 results: per-automation MIGRATED / ESCALATED / SKIPPED.
- Phase 3 regression results: per-automation passed / failed.
- Phase 4: legacy code removed (yes / no).
- Open questions for Daniel (anything that surfaced).
- Recommended action: merge or rollback.

The summary explicitly tells Daniel: "Review each automation's localhost test artifact in the migration log before merging. The Pipeline is fully accountable for correctness, but a 2-minute spot-check of any 2-3 automations is good production hygiene."

---

## 4. Out of Scope

- Adding new automations (only existing ones get migrated).
- Changing message templates (text content stays identical).
- Refactoring the queue-engine itself.
- The DB wrapper migration (deferred separately).
- Anything outside `crm_automation_rules` table + their callsites.

---

## 5. Pipeline Selection

Standard Full Auto Pipeline:
- `opticup-strategic` (Foreman) authors each per-automation SPEC.
- `opticup-executor` migrates code + verifies queue produces.
- `opticup-localhost-tester` opens Chrome MCP, performs operator action, watches DB chain.
- `opticup-reviewer` audits the migration diff.
- `opticup-strategic` (Foreman-Review) closes per-automation.

Opus model — the run is long, the stakes are high (production automation), and complexity per automation may vary widely.

---

## 6. Communication

English status updates between phases. ONE concise English summary at the very end pointing Daniel to:
- The morning summary file path.
- The top 3 takeaways.
- Whether the Pipeline's own internal verification considers the run safe to merge (the Pipeline says yes/no based on its own QA, but the final merge decision is Daniel's).

---

*End of Brief. Activation prompt at `M4_LEGACY_DISPATCH_DECOMMISSION_ACTIVATION_PROMPT.md`.*
