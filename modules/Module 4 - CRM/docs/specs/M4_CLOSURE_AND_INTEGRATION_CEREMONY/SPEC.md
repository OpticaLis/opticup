# SPEC — M4_CLOSURE_AND_INTEGRATION_CEREMONY

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_CLOSURE_AND_INTEGRATION_CEREMONY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — at the request of Daniel + Campaign Overseer
> **Authored on:** 2026-05-06
> **Module:** 4 — CRM
> **Phase:** Integration Ceremony (administrative closure)
> **Severity:** N/A (no code change; documentation-only)
> **Time budget:** ~90 minutes total

## 1. Goal

Close Module 4 administratively by completing the Integration Ceremony per CLAUDE.md §10:
1. Backfill the 4 missing FOREMAN_REVIEW.md files for SPECs that closed 2026-05-04
2. Refresh `modules/Module 4 - CRM/docs/MODULE_MAP.md` with all functions/files added since 2026-05-01
3. Refresh `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` to reflect 2026-05-06 state
4. Refresh `modules/Module 4 - CRM/docs/CHANGELOG.md` with the 5 SPECs that shipped today
5. Merge M4's MODULE_MAP into `docs/GLOBAL_MAP.md` (currently M4 is NOT registered there)
6. Merge M4's db-schema.sql into `docs/GLOBAL_SCHEMA.sql` (currently M4 tables NOT in global schema)

After this SPEC closes, Module 4 is a fully-documented module ready for Daniel-only main merge + a long maintenance phase. Tech-debt items remain open (logged) but don't block closure.

## 2. Background & Motivation

Module 4 audit cycle (2026-05-01 to 2026-05-06):
- Phase 1 overnight audit: 41 findings (4 CRITICAL / 13 HIGH / 14 MED / 9 LOW / 1 INFO)
- Phase 2 functional tests: surfaced 1 NEW CRITICAL (T14-CRIT-1 unsubscribe suppression) + 1 NEW HIGH (T5-HIGH-1 public form date format)
- 5 SPECs closed today on develop: M4_PUBLIC_FORM_VARIABLES_HIGH, M4_UNSUB_SUPPRESSION_CRIT, M4_TENANT_ISOLATION_HARDENING_PART1, M4_HARDCODED_PRIZMA_REMOVAL, M4_TENANT_ISOLATION_HARDENING_PART2

All 4 audit CRITICALs are CLOSED. All security boundaries hardened. SaaS-readiness threshold crossed.

But administratively, Module 4 has 3 gaps:
- **4 FOREMAN_REVIEWs missing** (from 2026-05-04 marathon — pre-2026-05-06 SPECs that shipped without strategic review)
- **MODULE_MAP drift** — recent functions (loadTenantConfig, soft_delete_event_if_empty, restore_event_from_log) not registered
- **GLOBAL_MAP / GLOBAL_SCHEMA missing M4 entirely** — the Integration Ceremony per CLAUDE.md §10 was deferred and never executed

Daniel directive 2026-05-06: close the module fully. This SPEC executes the deferred ceremony in one bounded run.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state at end | `develop`, clean | `git status` |
| 2 | Commits produced | 8 (4 FOREMAN_REVIEWs + MODULE_MAP refresh + GLOBAL_MAP merge + GLOBAL_SCHEMA merge + retrospective) | `git log origin/develop..HEAD --oneline \| wc -l` → 8 |
| 3 | 4 FOREMAN_REVIEW.md files created | exist + each has the standard 7 sections | `ls` |
| 4 | MODULE_MAP.md last-updated stamp | date 2026-05-06 | grep |
| 5 | MODULE_MAP.md contains all 5 new functions/helpers | grep returns 1 hit each | grep on `loadTenantConfig\|soft_delete_event_if_empty\|restore_event_from_log\|crm-event-delete\.js\|crm-event-restore\.js` |
| 6 | SESSION_CONTEXT.md current focus | reads "M4 closure ceremony complete 2026-05-06" or similar | inspect |
| 7 | CHANGELOG.md has 5 entries for 2026-05-06 | each SPEC has a single-line entry with commit hash | grep |
| 8 | GLOBAL_MAP.md last-reconciled stamp | date 2026-05-06 | grep |
| 9 | GLOBAL_MAP.md has Module 4 section | section exists with the M4 function/contract registry | grep |
| 10 | GLOBAL_SCHEMA.sql contains all M4 tables | each table from M4 db-schema appears in global file | comparison |
| 11 | Integrity gate | exit 0 or 2 | `npm run verify:integrity` |
| 12 | Iron Rule 12 (file size) | none of the touched docs exceed limits | spot-check |

## 4. Autonomy Envelope

### CAN do without asking
- Read all 6 SPEC folders for the 4 missing-FOREMAN-REVIEW SPECs (read SPEC.md + EXECUTION_REPORT.md + FINDINGS.md per each)
- Write 4 new FOREMAN_REVIEW.md files following the structure already used in M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW.md
- Edit MODULE_MAP.md, SESSION_CONTEXT.md, CHANGELOG.md
- Edit `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` to ADD M4 sections (never overwrite other modules' content)
- Run `npm run verify:integrity` between commits
- Commit + push to `develop` after each logical group
- Total runtime up to 120 minutes

### REQUIRES stopping
- Any edit to a closed SPEC's existing files (only ADD new FOREMAN_REVIEW.md to those folders)
- Any edit to `docs/GLOBAL_MAP.md` or `docs/GLOBAL_SCHEMA.sql` that REMOVES other modules' content
- Any change to source code files — this SPEC is doc-only
- Any DDL on either tenant
- Any EF deploy
- Merge to main
- Any FOREMAN_REVIEW that recommends REOPENing a closed SPEC

## 5. Stop-on-Deviation Triggers

- Any of the 4 SPECs being reviewed has UNCLEAR closure state in EXECUTION_REPORT (commits not visible on develop) → STOP, log, escalate
- A FOREMAN_REVIEW finds CRITICAL deviations missed by the executor at the time → STOP, escalate (the SPECs are merged to main; if a CRITICAL deviation is found, it needs a hotfix SPEC, NOT a backfilled review)
- GLOBAL_MAP / GLOBAL_SCHEMA merge would CONFLICT with existing entries → STOP, escalate
- File-size violation post-edit on any touched doc → fix or escalate

## 6. Rollback Plan

8 commits, each its own revert point. Doc-only — no code, no DB. Roll back any individual commit independently if needed.

## 7. Out of Scope (DO NOT touch)

- Source code, SQL migrations, Edge Function source/deploys, DB DDL
- Already-shipped FOREMAN_REVIEWs from today's 5 SPECs (they exist, they're correct, they don't need re-writing)
- Tech-debt items (M4-DEBT-01, REC-005, multi-tenant URL hardcoding, incoming-tab phone search bug, demo seed data)
- ROADMAP.md (phase status doesn't change)
- M4 tech-debt items go to `TECH_DEBT.md` (root); confirm or create that file as part of CHANGELOG-refresh commit

## 8. Expected Final State

### New files (5)
- 4 backfill `FOREMAN_REVIEW.md` files (one per SPEC: ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT, RESTORE_DELETED_EVENT_UI, POST_4_LEADS_PAGINATION_BUMP, PHONE_SEARCH_PARTIAL_FIX)
- This SPEC.md

### Modified files (5)
- `MODULE_MAP.md` — add new functions/files; bump last-updated to 2026-05-06
- `SESSION_CONTEXT.md` — current focus = "M4 audit cycle closed 2026-05-06; module in maintenance phase"
- `CHANGELOG.md` — append 2026-05-06 section listing 5 SPECs + commit hashes
- `docs/GLOBAL_MAP.md` — ADD a Module 4 section; bump last-reconciled
- `docs/GLOBAL_SCHEMA.sql` — ADD all M4 tables under a `-- ===== Module 4 — CRM =====` banner

### NOT modified
- Any source file, any migration, the existing closed SPECs' content, ROADMAP.md, MASTER_ROADMAP.md, other modules' MODULE_MAPs or db-schemas

## 9. Commit Plan

8 commits total:
1. `docs(spec): backfill ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT FOREMAN_REVIEW`
2. `docs(spec): backfill RESTORE_DELETED_EVENT_UI FOREMAN_REVIEW`
3. `docs(spec): backfill POST_4_LEADS_PAGINATION_BUMP FOREMAN_REVIEW`
4. `docs(spec): backfill PHONE_SEARCH_PARTIAL_FIX FOREMAN_REVIEW`
5. `docs(m4): refresh MODULE_MAP + SESSION_CONTEXT + CHANGELOG for 2026-05-06 cycle`
6. `docs(global): merge M4 into GLOBAL_MAP — Integration Ceremony`
7. `docs(global): merge M4 schema into GLOBAL_SCHEMA — Integration Ceremony`
8. `chore(spec): close M4_CLOSURE_AND_INTEGRATION_CEREMONY with retrospective`

Push after each commit (not batched).

## 10. Dependencies / Preconditions

- Branch `develop`, clean
- All 5 today's SPECs already on develop with their commits visible
- The 4 missing-FOREMAN-REVIEW SPECs from 2026-05-04 already merged to main
- No EF changes, no migrations, no Supabase MCP calls needed for this SPEC

## 11. Lessons Already Incorporated

- **From CLAUDE.md §10 Backup Protocol + Integration Ceremony:** the canonical 7-step Integration Ceremony is the structure §8 follows.
- **From every today's FOREMAN_REVIEW:** the standard 7 sections — SPEC quality audit, Execution quality audit, Findings disposition, Master-doc update checklist, Author-skill improvement proposals, Executor-skill improvement proposals, Verdict.
- **From feedback_overseer_decision_patterns.md:** SPEC scope = "bounded + safe"; this is a bounded admin SPEC, no production touch.
- **From the just-codified Step 1.5 §6/§7/§9 (pg_proc source-search / filesystem path verification / PUBLIC-inheritance check):** this SPEC requires no DB lookups, but the executor still verifies filesystem paths before each `Read`.
- **The 4 backfill FOREMAN_REVIEWs are retrospective:** they audit work already merged to main. They CANNOT recommend rework without a hotfix SPEC. Findings dispositions limited to: dismiss / log to TECH_DEBT / propose follow-up SPEC.

**Cross-Reference Check (Step 1.5):** This SPEC introduces ZERO new code names — only documentation. 5 new files (4 FOREMAN_REVIEWs + 1 SPEC.md). 5 modified docs. Cross-reference sweep: 0 collisions, 0 hits.

## 12. QA Plan

After each commit: `git status` clean for the in-scope files, `npm run verify:integrity` exit 0/2. After commit 5: spot-check MODULE_MAP grep. After commit 6: spot-check GLOBAL_MAP grep. After commit 7: spot-check GLOBAL_SCHEMA grep on M4 tables. After commit 8: verify §3 #1-#12.

## 13. FOREMAN_REVIEW templates (executor reference)

The 4 backfill FOREMAN_REVIEWs follow the standard 7-section structure:
1. SPEC Quality Audit
2. Execution Quality Audit
3. Findings Disposition
4. Master Doc Update Checklist
5. Author-Skill Improvement Proposals (≥2)
6. Executor-Skill Improvement Proposals (≥2)
7. Verdict — 🟢 CLOSED / 🟡 CLOSED WITH FOLLOW-UPS / 🔴 REOPEN. For retroactive reviews of merged-to-main SPECs, REOPEN is NOT a valid verdict.

Expected dispositions:
- ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT: 14-line patch. Likely 🟢 CLOSED.
- RESTORE_DELETED_EVENT_UI: Approach B chosen post-Foreman scope-correction. Likely 🟢 CLOSED.
- POST_4_LEADS_PAGINATION_BUMP: 1-line change. Likely 🟢 CLOSED.
- PHONE_SEARCH_PARTIAL_FIX: 5-line patch. Likely 🟢 CLOSED. Note: same bug exists in `crm-incoming-tab.js:109`, log as INFO finding.

*End of SPEC.*
