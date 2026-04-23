# Claude Code — Execute P8 Automation Engine SPEC

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P8 builds a Level 1 automation engine for the CRM: configurable "when [trigger]
+ [condition] → send message" rules that replace all hardcoded dispatch logic
from P5.5. Also upgrades the message log (lead name, phone, template, click-to-
expand) and populates the per-lead message history tab.

This is a BUILD SPEC — 1 new file, 5 modified files, 2 doc updates, 1 seed
SQL artifact. 34 measurable criteria across 7 parts (A–G). 9 commits planned.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P8_AUTOMATION_ENGINE/SPEC.md`

Read the full SPEC before executing. Key sections:
- §3: 34 success criteria across 7 parts (A–G)
- §4: autonomy envelope — pre-authorized write SQL for demo seed (Level 2)
- §5: 6 stop-on-deviation triggers (especially: 350-line Rule 12, no DDL, approved phones only)
- §8: expected final state (new files, modified files, DB state)
- §9: 9-commit plan (±2 fix = max 11)
- §12: full technical design with code patterns, architecture, UI specs, QA protocol
- §14: `action_config` schema reference

---

## Pre-Flight (mandatory — per P6 Foreman Review proposals)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC: `modules/Module 4 - CRM/go-live/specs/P8_AUTOMATION_ENGINE/SPEC.md`
3. Read current state files:
   - `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
   - `modules/crm/crm-event-actions.js` (verify actual line count — SPEC says ~236)
   - `modules/crm/crm-event-register.js` (verify actual line count — SPEC says ~107)
   - `modules/crm/crm-messaging-rules.js` (verify actual — SPEC says 234)
   - `modules/crm/crm-messaging-broadcast.js` (verify actual — SPEC says 318)
   - `modules/crm/crm-leads-detail.js` (verify actual — SPEC says 216)
   - `modules/crm/crm-helpers.js` (TIER2_STATUSES, recipient query patterns)
4. **Step 1.6 — baseline measurement check (P6 FR Proposal #1):**
   For every §3 criterion with a line count, run `wc -l` NOW. If any baseline
   differs from SPEC assumptions, STOP and report before proceeding.
5. **Column verification (P6 FR Proposal #2):**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'crm_automation_rules' ORDER BY ordinal_position;
   ```
   Compare against the seed SQL in §12.4. If any column is absent, STOP.
6. **Pre-existing rules check:**
   ```sql
   SELECT count(*) FROM crm_automation_rules
   WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   ```
   If >0, document them and decide: skip duplicates or clean before seeding.
7. **Template count verification (§10):**
   ```sql
   SELECT count(*) FROM crm_message_templates
   WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true;
   ```
   Expect ≥24 (templates from P5).
8. **Approved-phone check** — ALL seed/test data MUST use ONLY `+972537889878`
   and `+972503348349`. No other phones. Violation = STOP IMMEDIATELY.

---

## Execution Sequence

**Part A** — Rule evaluation engine → Commit 1
  New file `crm-automation-engine.js`: evaluate(), resolveRecipients(), CONDITIONS.
  Add `<script>` tag to `crm.html`.
  QA: `typeof CrmAutomation.evaluate === 'function'` in console.

**Part B** — Refactor hardcoded dispatch → Commits 2–3
  `crm-event-actions.js`: replace EVENT_STATUS_DISPATCH with CrmAutomation.evaluate.
  `crm-event-register.js`: replace dispatchRegistrationConfirmation with CrmAutomation.evaluate.
  QA: event status change still dispatches messages (verify via crm_message_log SQL).

**Part C** — Seed default rules on demo → Commit 4
  Create `go-live/seed-automation-rules-demo.sql`.
  INSERT ≥10 rules covering all 8 event-status + 2 registration mappings.
  QA: rules visible in UI.

**Part D** — Rules UI improvements → Commit 5
  Remove amber banner. Add trigger-type dropdown, condition selector, recipient type.
  QA: "+ כלל חדש" wizard shows structured dropdowns.

**Part E** — Message log improvements → Commit 6
  Expand loadLog() SELECT with JOINs. Add lead name, phone, template columns.
  Add click-to-expand. Watch 350-line limit (currently ~318).
  QA: היסטוריה tab shows enriched table.

**Part F** — Per-lead message history → Commit 7
  Replace "בקרוב" placeholder in crm-leads-detail.js with actual query.
  QA: lead detail modal → "הודעות" tab shows messages.

**Part G** — Documentation + retrospective → Commits 8–9
  SESSION_CONTEXT.md, go-live/ROADMAP.md, EXECUTION_REPORT.md, FINDINGS.md.

---

## Key Rules

- **ONLY approved phones:** `+972537889878`, `+972503348349`. Violation = STOP IMMEDIATELY.
- **Demo tenant only:** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug `demo`.
- **No DDL.** The `crm_automation_rules` table already exists. If the schema is insufficient, STOP — do not ALTER TABLE.
- **No Edge Function changes.** `lead-intake` and `send-message` EFs are out of scope.
- **Rule 12 vigilance.** `crm-messaging-broadcast.js` is near the limit (~318 lines). If any file exceeds 350 lines after modification, STOP and split.
- **Browser QA required** after each commit group (§12.7). If Chrome DevTools MCP is unavailable, STOP.
- **Verify line counts before writing.** Every ⚠️ UNVERIFIED measurement in §3 must be checked at pre-flight, not mid-execution.
- **Clean test messages** at the end. Same cleanup pattern as P6.
