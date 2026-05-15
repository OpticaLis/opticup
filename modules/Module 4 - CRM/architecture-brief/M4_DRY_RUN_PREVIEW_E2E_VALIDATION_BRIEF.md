# M4 Dry-Run Preview — End-to-End Validation Brief

**Brief version:** v1
**Date:** 2026-05-14 (post-feature-build)
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~6-10 hours)
**Model preference:** Opus (browser smoke + DB chain + recipient verification across every automation)
**Owning module:** Module 4 — CRM
**Mode:** EXHAUSTIVE end-to-end validation only. NO code changes. NO DDL. NO migration work.

---

## 1. Purpose

The preceding SPEC (`M4_DRY_RUN_PREVIEW_AND_DISPATCH`) shipped the feature but deferred browser-DOM validation to Daniel. That's a Brief violation — Daniel's standing requirement is that Pipeline owns 100% of verification correctness BEFORE any merge to main. Daniel does not do QA; Daniel reviews artifacts.

This Brief authorizes the missing exhaustive validation: every operator action that opens the v2 preview modal, on demo tenant, end-to-end through Chrome MCP, with real SMS + real email delivery to whitelisted recipients, with full DB-chain capture for each test. Recreate test leads as needed. Validate every existing automation rule fires correctly. Validate audit/log entries are written correctly. Capture artifacts for every test for Daniel's morning review.

When this is done, Daniel reviews the artifact bundle and ONLY THEN merges develop → main.

---

## 2. Daniel's Locked Decisions (chat 2026-05-14)

| # | Topic | Decision |
|---|---|---|
| 1 | Approach | Pipeline does EVERY browser-DOM test exhaustively. No "Daniel will smoke 5 minutes". |
| 2 | Recreate test data freely | Pipeline may DELETE + INSERT demo test leads and demo test events as needed to cover every scenario. Cleanup at end. |
| 3 | Every existing automation | Pipeline must enumerate every active `crm_automation_rules` row on demo and verify each one fires correctly with the v2 modal. NO automation skipped. |
| 4 | Audit/log verification | For every test, verify the audit/activity log row was written correctly + the message log row was written correctly + the queue row was written correctly. |
| 5 | Whitelist (HARD GATE) | Test SMS to ONLY `0537889878`, `0503348349`, `0507168471`. Test emails to ONLY `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`. Any deviation → STOP. |
| 6 | Code changes | ZERO. This Brief is validation only. If a bug surfaces, write a FINDINGS entry, continue with other tests. Bugs are fixed in a follow-up Brief. |
| 7 | Time | No hard cap. Quality > speed. Up to ~10 hours acceptable. |

---

## 3. Scope — What Must Be Validated

### 3.1 Automation rule inventory (Phase 1)

Build a complete list of every active `crm_automation_rules` row on demo. For each rule capture:
- Rule slug + display name.
- Trigger event (status_change, registration, manual, etc.).
- Action type (send_message, update_status, etc.).
- Target template slug + channel.
- Conditions (whom it targets).
- Expected recipient population.

Save to `modules/Module 4 - CRM/docs/audits/AUTOMATION_INVENTORY_FOR_VALIDATION_2026_05_14.md`.

If the count exceeds ~30 distinct rules → STOP, escalate. Premise wrong.

### 3.2 Per-automation E2E test (Phase 2 — bulk of run)

For EACH automation rule from §3.1:

**Setup (recreate test data if needed):**
- Identify the operator action that fires the rule.
- Create/recreate demo test data needed (test lead with whitelisted phone+email, test event in the right state, test attendee row, etc.).
- Document the setup steps in the test log.

**Execute (Chrome MCP):**
- Open `http://localhost:3000/crm.html` on demo tenant.
- Perform the operator action that triggers the rule.
- Confirm the v2 preview modal opens.
- Capture screenshot of modal + DOM snapshot.

**Modal interaction validation:**
- Search bar narrows the list when typing.
- Clicking a recipient name expands per-recipient body preview with correct SMS + email rendered text.
- Quick-filter chips (All / Last 30 days / No prior reg / Customers) filter the list correctly.
- Checkbox toggle changes selected count.
- "Test send to first 3" button works — modal stays open, 3 SMS/emails fire to whitelisted recipients.
- "Approve and send" dispatches the rest.
- Cancel toast appears with run_id + cancel button.

**DB chain validation (per dispatch):**
- `crm_message_queue` rows created with correct run_id + recipient lead_ids + body + channel.
- `dispatch-queue` cron drains the queue.
- `crm_message_log` rows updated to `status='sent'` with correct content.
- `activity_log` row written for the operator action.

**Recipient inbox validation:**
- Verify the whitelisted phone received the SMS (poll the recipient's actual phone via Daniel's manual confirmation OR via Twilio-equivalent dispatch confirmation if accessible).
- Verify the whitelisted email received the email.
- Body matches the per-recipient body the modal showed.

**Cancel validation (for at least 3 rules):**
- Mid-dispatch, click cancel toast.
- Confirm queue rows flip to `status='cancelled'`.
- Confirm the next cron tick does NOT drain cancelled rows.
- Confirm partial delivery (some sent, some cancelled).

**Per-rule artifact:**
- One markdown file per rule with: setup steps, modal screenshots, DB chain, recipient confirmation, cancel test result.
- File path: `modules/Module 4 - CRM/docs/audits/v2-modal-validation/{rule_slug}.md`.

### 3.3 Cross-cutting tests (Phase 3)

- Session-saved selections: open modal, deselect 2 recipients, close modal, reopen for SAME rule. Confirm the 2 stay deselected.
- 6-hour TTL: simulate a sessionStorage entry > 6h old; confirm it's cleared on next open.
- Stale-id reconciliation: simulate a sessionStorage entry referring to a now-deleted lead; confirm graceful handling.
- Empty-recipient case: trigger a rule whose recipient list resolves to 0 leads. Confirm modal shows "0 recipients" gracefully without erroring.
- Legacy v1 path still works: trigger a flow where v1 is the canonical (per Brief §3.3 of the predecessor — the 5 legacy callsites still use v1 today). Confirm v1 modal still appears and still works for backward compat.

### 3.4 Cleanup (Phase 4)

- Delete every test lead created during the validation run.
- Delete every test attendee row.
- Delete every test event created (if applicable).
- Confirm `crm_leads`, `crm_event_attendees`, `crm_events` on demo are back to pre-validation counts.
- Pre-existing demo data NOT touched.

### 3.5 Morning summary (Phase 5)

Write `modules/Module 4 - CRM/docs/audits/v2-modal-validation/SUMMARY_2026_05_14.md`:
- List of every automation tested + green/red/escalated.
- Cross-cutting tests results.
- Cleanup confirmation.
- Pipeline's GO/NO-GO verdict for merge to main.
- Top 3 bugs/findings (if any) — bugs fixed in next Brief, NOT this one.

---

## 4. Safety Envelope — Non-Negotiable

### 4.1 Pre-run safety tag
```
git tag -a pre-dry-run-preview-validation-2026-05-14 -m "Pre-validation baseline"
git push origin pre-dry-run-preview-validation-2026-05-14
```

### 4.2 Whitelist (HARD GATE)
- **Phones:** `0537889878`, `0503348349`, `0507168471` ONLY.
- **Emails:** `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com` ONLY.
- Pre-flight: verify demo allowlists match. Any drift → STOP, escalate.
- Any dispatch attempt to a non-whitelisted recipient → STOP IMMEDIATELY.

### 4.3 Tenant write rules
- Demo tenant ONLY for ALL testing.
- Zero writes to Prizma rows of any kind throughout.

### 4.4 Localhost requirement
- `http://localhost:3000` must be reachable on first health check. If not → escalation immediately.

### 4.5 NO code changes
- NO source file edits.
- NO DDL.
- NO automation rule edits (use rules as they exist).
- If a bug surfaces, write FINDINGS entry, continue with other tests, do NOT fix.
- Fix Brief comes after Daniel reviews this validation.

### 4.6 Iron Rules
31, 32, 12, 15, 21, 22 enforced on the few commits this run produces (audit MD files only).

### 4.7 Time budget
No hard cap. 5 retries per scenario before escalating that scenario. Continue with other automations on escalation.

### 4.8 NO main merge
Pipeline's verdict is GO/NO-GO. Daniel merges manually after reviewing the artifact bundle.

### 4.9 Escalation
Write `modules/Module 4 - CRM/escalations/{ISO_TS}_VALIDATION_BLOCKER.md` if blocked, continue with other automations.

---

## 5. Pipeline Selection

Standard Full Auto Pipeline focused on `opticup-localhost-tester` for the heavy lifting:
- `opticup-strategic` Foreman authors each validation SPEC.
- `opticup-localhost-tester` runs Chrome MCP, performs operator actions, captures DOM + DB + inbox.
- `opticup-reviewer` audits the test artifacts for completeness.
- `opticup-strategic` Foreman-Review closes per-automation.

Opus model. Long, browser-heavy, high-stakes.

---

## 6. Communication

English status updates between phases. ONE concise English summary at end:
- Total automations tested.
- Green/red/escalated breakdown.
- Cleanup confirmation.
- Pipeline's GO/NO-GO verdict.
- Top 3 bugs found (if any).
- Path to the artifact bundle for Daniel's review.

---

*End of Brief.*
