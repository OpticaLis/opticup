You are running an **Investigation-Only audit** on Module 4 (CRM) for the Optic Up project. This is NOT a Full-Auto Pipeline. Read the Brief at:

`modules/Module 4 - CRM/architecture-brief/M4_FULL_QA_INVESTIGATION_2026_05_18_BRIEF.md`

Then execute the investigation per its §5 plan. Your deliverable is ONE Markdown file plus a screenshot folder, both in your session's `outputs/` directory:

- `outputs/M4_FULL_QA_REPORT_2026_05_18.md`
- `outputs/M4_QA_SCREENSHOTS_2026_05_18/*.png`

**Absolute constraints (non-negotiable):**

1. **NO writes inside the repo.** Do not `Write`, `Edit`, `git add`, `git commit`, `git push`, `git stash`, or `git checkout`. The Brief itself is your only repo input — read it, then leave the repo alone. A concurrent Pipeline (`M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A`) is running on develop; touching files would collide.
2. **NO DB writes.** Only `SELECT` queries via Supabase MCP. Demo tenant only (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) for substantive testing; Prizma schema-introspection only (`information_schema`, `pg_policies`).
3. **NO EF deploys or migrations.** If you need to test EF behavior, invoke the existing deployed EFs with read/dry-run inputs — do not modify them.
4. **NO Pipeline lock claim.** Skip `pipeline-coordination.mjs` entirely. You are not a Pipeline.
5. **NO subagents.** Single linear investigator session.
6. **Test phone numbers:** ONLY `0537889878` and `0503348349` — never anything else.
7. **STOP triggers** per Brief §7. If you must violate any constraint to proceed, STOP and write `outputs/M4_QA_ESCALATION.md` describing what you need.

**The investigation covers 8 surfaces per Brief §5:**

1. The status-change confirmation modal bug (the user-reported head bug — start here)
2. Leads pipeline end-to-end
3. Events module (lifecycle, capacity, waitlist, soft-delete)
4. Broadcast wizard
5. Automation rules editor
6. Dispatch-queue EF behavior
7. Permissions / RLS
8. Recent regression candidates (9 named SPECs from last 2 weeks)

**Evidence depth required:** Daniel asked for the most comprehensive audit possible, with full Chrome MCP visual verification. For every finding:
- Reproduce via Chrome MCP (screenshots saved to the screenshot folder)
- Read the relevant code (`Read` / `Grep` / `Glob` are fine — they don't modify)
- Query the DB (read-only `SELECT`)
- Classify severity per opticup-guardian rules (live-customer-harm vs theoretical)
- Propose remediation at Architect tier (one paragraph — names the area + approach, NOT exact code)

**Background context the report should reflect:**

The user-reported symptom: on every status change in CRM, an "אישור פעולה" modal flashes briefly and auto-dismisses after ~1 second. The user has no chance to click confirm or cancel. The status DOES update; sometimes an amber "אין נמענים" toast appears; messages that SHOULD send are never sent. Daniel believes a recent SPEC broke it. The Brief §2 lists candidate SPECs. Validate by reading code + DB state, not by guessing.

**Recent M4 SPECs to investigate as regression candidates** (full list in Brief §5 Surface 8):
- STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-13) — rewrote automation-engine + browser engine mirror + added fires_on UI
- M4_V2_MODAL_SESSION_RESTORE_FIX — modal lifecycle
- M4_DRY_RUN_PREVIEW_AND_DISPATCH + M4_DRY_RUN_PREVIEW_E2E_VALIDATION — the modal under test
- MIGRATION_3_CRM — Tailwind class swaps on crm.html
- BROADCAST_EVENT_LINK_SUPPORT — event_id propagation
- M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1, M4_AUTOMATION_RULES_UPDATED_AT, M4_INVITED_GHOST_ATTENDEE_FIX, M4_FAILED_MESSAGE_BADGE_CLEANUP

For each: trace what their commits touched + verify whether their claimed deliverables still hold on demo today.

**The report's Executive Summary must be in Hebrew** (for Daniel). Body sections can be English. Findings titles bilingual is fine. Severity labels English (CRITICAL/HIGH/MEDIUM/LOW/INFO).

**Verification before declaring done:**
- `outputs/M4_FULL_QA_REPORT_2026_05_18.md` exists, ≥1500 lines, all 8 surfaces covered
- `outputs/M4_QA_SCREENSHOTS_2026_05_18/` has ≥6 screenshots
- Executive Summary in Hebrew, ≤200 words
- §6 Proposed SPEC slate has ≥3 SPECs ranked by priority
- The status-modal bug (Surface 1) has a confirmed root-cause hypothesis + named code location
- No file in the repo has been modified (`git status` clean except for the Brief + this prompt the Architect already wrote)

When done, emit one Hebrew line to Daniel:
> "QA הושלם. דוח מקיף ב-`outputs/M4_FULL_QA_REPORT_2026_05_18.md`. [N] ממצאים, [M] CRITICAL/HIGH. הפעלת המודאל אומתה ב-[file:line]. ממתין להחלטה על SPEC slate."

If you encounter any STOP trigger, write `outputs/M4_QA_ESCALATION.md` and emit a Hebrew line naming the file path.

Read the Brief now and start with Surface 1.
