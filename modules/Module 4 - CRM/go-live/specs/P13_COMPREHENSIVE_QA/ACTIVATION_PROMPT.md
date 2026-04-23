# Claude Code — Execute P13 Comprehensive QA SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P13 is a comprehensive QA + hotfix SPEC. It is the FINAL gate before P7 (Prizma
cutover). Daniel tested the CRM after P12 and found that messages he sent don't
show up in the Activity Log tab. Beyond that, no full lifecycle QA has ever run
all CRM flows together while verifying activity logs, automation rules, and
message dispatch in one continuous session.

**This SPEC is unique:** it is a QA SPEC, not a build SPEC. You are testing,
not building. But you ARE authorized to fix bugs you find — up to 3 files per
fix. Anything bigger → log as a Finding.

**This requires browser access.** You must be able to:
- Load `localhost:3000/crm.html?t=demo` in a browser
- Take screenshots (chrome-devtools MCP or equivalent)
- Run SQL queries against Supabase (demo tenant)
- Send Edge Function requests (lead-intake, send-message)

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P13_COMPREHENSIVE_QA/SPEC.md`

---

## Pre-Flight (ONLY place you may stop)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully — especially §6 (QA Flow) and §7 (Scope Guardrails)
3. Start `localhost:3000`, verify CRM loads
4. **Run baseline query** from SPEC §5 step 4 — record all counts
5. **Record session start timestamp** — needed for cleanup queries
6. **Verify automation rules exist:**
   ```sql
   SELECT count(*) FROM crm_automation_rules
   WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true;
   ```
   Expect: 10. If 0, re-seed from `go-live/seed-automation-rules-demo.sql`.
7. **Verify templates exist:**
   ```sql
   SELECT count(*) FROM crm_message_templates
   WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true;
   ```
   Expect: ≥24.
8. **Approved phones ONLY:** `+972537889878` and `+972503348349`

**If pre-flight passes → GO. Do not stop again.**

---

## Execution Sequence

**Phase 1 — Lead Intake & Management** (Steps 1-8)
  Test: EF lead intake, manual lead creation, edit, note, status change,
  tier transfer, quick-send dialog. Each step: visual + DB + activity log.
  Fix any bugs found.

**Phase 2 — Advanced Filtering & Broadcast** (Steps 9-11)
  Test: advanced filters, broadcast wizard with radio board selection,
  recipient preview, variable panel. Fix any bugs found.

**Phase 3 — Events Lifecycle** (Steps 12-17)
  Test: event creation, status changes that fire automation rules, lead
  registration, Event Day check-in + purchase, event close. This is the
  heaviest section — verify every status transition fires the correct
  automation rule and creates message log + activity log entries.

**Phase 4 — Activity Log Tab** (Steps 18-19)
  Test: all entries visible, filters work, expanded details show, counts
  match DB. This is the section Daniel specifically flagged — if entries
  are missing, diagnose and fix.

**Phase 5 — Automation Rules Self-Service** (Steps 20-22)
  Delete all rules, recreate all 10 from the UI, test that a recreated
  rule fires correctly. Daniel needs to know he can manage rules himself.

**Phase 6 — Messaging Hub** (Steps 23-25)
  Test: message log completeness, lead detail messages tab, template
  variable copy-to-clipboard.

**Phase 7 — Cleanup & Report** (Steps 26-27)
  Clean all test data, verify baseline, final checks.

---

## Key Rules

- **ONLY approved phones for any test data:** `+972537889878`, `+972503348349`.
- **Demo tenant only:** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
- **No EF changes.** No schema changes. No DDL.
- **Do NOT modify `shared/js/activity-logger.js`** (M1.5 owned).
- **Fix-in-place authorized** for ≤3 files per fix. Each fix = separate commit.
- **Rule 12:** All files must stay ≤350 lines after any fix.
- **DO NOT STOP once past pre-flight** (except for the 3 stop triggers in §4).
- **Clean ALL test data** at end. Verify baseline.
- **Take screenshots** at key points — they are evidence for the QA report.
- **Record EVERYTHING** — every SQL result, every screenshot, every fix.
  The EXECUTION_REPORT is the QA report Daniel will read.

---

## Reporting

At the end, produce:
1. **EXECUTION_REPORT.md** — step-by-step QA results (pass/fail/fixed)
2. **FINDINGS.md** — issues that couldn't be fixed in-place
3. Both files include a **Recommendations** section for Daniel

The EXECUTION_REPORT should be structured as a table:

| Step | Action | Visual | DB | ActivityLog | Result | Notes |
|------|--------|--------|-----|------------|--------|-------|

Where Result is: ✅ PASS / ⚠️ FIXED / ❌ FAIL / ℹ️ N/A

---

*End of ACTIVATION_PROMPT — P13_COMPREHENSIVE_QA*
