# Claude Code — Execute P6 Full Cycle Test SPEC

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P6 is the full end-to-end cycle test of the CRM pipeline on demo tenant.
Everything from lead intake through messaging through cleanup — proving the
entire P1–P5.5 pipeline works as an integrated system. Also includes a small
JSDoc fix (M4-BUG-P55-03 follow-up: document `variables.phone/email` contract).

This is a TEST SPEC, not a BUILD SPEC. The only code change is a JSDoc comment
addition to `crm-messaging-send.js`. Everything else is test execution + cleanup.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P6_FULL_CYCLE_TEST/SPEC.md`

Read the full SPEC before executing. Key sections:
- §3: 28 measurable success criteria across 7 phases (A–G)
- §4: autonomy envelope — broad autonomy for testing, hard stops on phone violations
- §5: 6 stop-on-deviation triggers
- §10: preconditions with fallback SQL for unverified items
- §12: step-by-step test execution plan (23 steps)
- §13: results template to fill during execution

---

## Pre-Flight (SPEC §12.1, Steps 1–4)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC: `modules/Module 4 - CRM/go-live/specs/P6_FULL_CYCLE_TEST/SPEC.md`
3. Read current state files:
   - `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
   - `modules/crm/crm-messaging-send.js` (39 lines — the JSDoc target)
4. Run baseline snapshot query (§12.1 Step 2) — save counts for cleanup comparison
5. **CRITICAL: Approved-phone pre-flight check** — verify ALL seed/test SQL uses
   ONLY `+972537889878` and `+972503348349`. No other phones allowed. See CLAUDE.md §9.
6. If any §10 precondition fails, follow the fallback procedures in §10 table

---

## Execution Sequence

**Phase A** (Steps 1–4): Pre-flight + JSDoc fix → Commit 1
**Phase B** (Steps 5–7): Lead intake EF test via curl
**Phase C** (Steps 8–11): CRM browser QA on localhost:3000
**Phase D** (Steps 12–15): Event lifecycle + message dispatch
**Phase E** (Steps 16–17): Broadcast wizard (template + raw)
**Phase F** (Steps 18–19): Error handling verification
**Phase G** (Steps 20–23): Cleanup + docs + retrospective → Commits 2–3

Total budget: 3 commits (±1 fix = max 4)

---

## Key Rules

- **ONLY approved phones:** `+972537889878`, `+972503348349`. Violation = STOP IMMEDIATELY.
- **Demo tenant only:** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug `demo`.
- **No code changes except JSDoc** on `crm-messaging-send.js`.
- **Fill the §13 test results table** in EXECUTION_REPORT.md — every criterion must have Pass/Fail + actual value.
- **Clean ALL test data** at the end (§12.7 Step 20–21). Compare to baseline snapshot.
- **Browser QA required** for Phases C/D/E/F — if chrome-devtools MCP is unavailable, STOP.
