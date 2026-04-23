# Claude Code — Execute P9 CRM Hardening SPEC

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P9 is a comprehensive CRM hardening pass before Prizma cutover (P7). Three
tracks: fix all known bugs (email validation, SMS button, edit lead), improve
UX (timestamps everywhere, advanced filtering), and run a full end-to-end flow
test proving the entire pipeline works.

**This SPEC is designed for an overnight unattended run.** Maximum autonomy
granted. Do NOT stop to ask questions once past pre-flight. Fix issues, log
findings, keep going.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P9_CRM_HARDENING/SPEC.md`

Read the full SPEC before executing. Key sections:
- §3: 40 success criteria across 5 tracks (A–E)
- §4: MAXIMUM AUTONOMY — only 6 hard stops listed, everything else is go
- §5: Only 4 stop-on-deviation triggers
- §12: Full technical design with code patterns and test protocol
- §14: Executor initiative guidelines — what to fix, log, or propose

---

## Pre-Flight (the ONLY place you may stop to ask)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC
3. Read all CRM files you'll modify — verify actual line counts against SPEC
4. Start `localhost:3000` and verify CRM loads
5. Verify Chrome DevTools MCP is available
6. Run baseline DB snapshot (§12.6 step 1)
7. Verify automation rules exist: `SELECT count(*) FROM crm_automation_rules WHERE tenant_id = '8d8cfa7e-...' AND is_active = true` → should be 10
8. Verify lead-intake EF is reachable: quick curl with approved phone
9. **Approved-phone check:** ONLY `+972537889878` and `+972503348349`

**If pre-flight passes → GO. Do not stop again until all 40 criteria are done.**

**If a critical blocker at pre-flight (localhost won't start, Chrome MCP unavailable):**
Report the blocker and wait. This is the ONLY acceptable stop point.

---

## Execution Sequence (suggested — adjust as needed)

**Phase 1 — Bug Fixes** (Commits 1-3)
  Email required on lead creation. Edit lead modal. SMS button fix.
  Timestamps to HH:MM everywhere. QA each fix.

**Phase 2 — Advanced Filtering** (Commits 4-5)
  Multi-status checkboxes, date range, 48h no-response, source filter.
  Both tabs (registered + incoming). Filter chips. Clear all.
  Split `crm-leads-tab.js` if it exceeds 350 lines.

**Phase 3 — QA Sweep** (Commit 6)
  Open every CRM screen. Click every button. Try every flow.
  Fix anything broken. Log anything you can't fix.

**Phase 4 — Full Flow Test** (Commit 7)
  Follow §12.6 protocol: lead intake → edit → status change → transfer →
  event registration → dispatch → log check → per-lead history check.
  Verify all timestamps show HH:MM. Clean up test data.

**Phase 5 — Documentation** (Commits 8-9)
  SESSION_CONTEXT.md + ROADMAP.md. EXECUTION_REPORT.md + FINDINGS.md.
  Include ≥3 improvement proposals in the report.

---

## Key Rules

- **ONLY approved phones:** `+972537889878`, `+972503348349`. STOP on violation.
- **Demo tenant only:** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
- **No DDL.** No Edge Function changes. No files outside CRM module.
- **Rule 12:** If any file exceeds 350 lines, split it. Pre-authorized.
- **DO NOT STOP once past pre-flight.** Fix, log, continue. Only the 4 hard
  stops in §5 are valid reasons to pause.
- **Be thorough.** Daniel wants every detail working perfectly. Check timestamps,
  check RTL, check error states, check empty states.
- **Clean ALL test data** at the end. Verify baseline matches.
- **Write ≥3 improvement proposals** in your EXECUTION_REPORT — think like a
  product manager preparing for a real client demo.
