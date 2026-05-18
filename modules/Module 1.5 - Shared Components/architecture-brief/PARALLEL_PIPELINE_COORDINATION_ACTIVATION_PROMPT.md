You are operating on the `opticalis/opticup` ERP repo, branch `develop`. Full Auto Pipeline mode.

**Task:** Author + execute the Parallel Pipeline Coordination Protocol SPEC. Single SPEC, ~1 hour.

**Read first:**
- `modules/Module 1.5 - Shared Components/architecture-brief/PARALLEL_PIPELINE_COORDINATION_BRIEF.md` (sealed 2026-05-17, 127 lines)
- `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md` (just-closed Supervisor build — reuse its escalation pattern)
- `CLAUDE.md` §9 Working Rules (existing First Action protocol — your additions slot in here)
- `.claude/skills/opticup-executor/SKILL.md` + `opticup-reviewer/SKILL.md` + `opticup-localhost-tester/SKILL.md` + `opticup-strategic/SKILL.md` + `opticup-supervisor/SKILL.md` (all get pre-action collision check)

**SPEC scope (this Pipeline run):**

Build the parallel-Pipeline coordination protocol per Brief §3 + §7. Single SPEC, no phasing.

Deliverables:
1. New script `scripts/pipeline-coordination.mjs` with 5 commands (`claim`, `release`, `check-collision`, `heartbeat`, `cleanup-stale`) + unit tests.
2. New folder `_archive/pipeline-sessions/` with `.gitkeep` + path-level `.gitignore` (excludes `*.lock`, includes `stale-cleanup-*.log`).
3. Updates to 5 skill files: each gets a "Pre-Action Collision Check" section in bootstrap that claims a session lock before any git/file write outside `files_owned_globs`.
4. End-to-end test: simulate 2 concurrent sessions claiming different branches → both proceed. Simulate 2 same branch → second halts + writes escalation.
5. CLAUDE.md §9 Working Rules: new section "9.X Parallel Pipeline Coordination" (one paragraph, points at the script + folder).

**Hard constraints (per Brief §4 + §5):**
- Lock files gitignored — never committed.
- No daemon, no background process — file-system mediated.
- No automatic collision resolution — every collision halts + escalates.
- All operations reversible (file create/delete + git history).
- Stale-cleanup deletions get audit log entries.

**Iron Rule 32 — Destructive Operations Declaration (mandatory in SPEC §4):**
```
## 4. Destructive Operations
None.
```
(Stale `.lock` file deletion is gitignored state, not source-of-truth — does not qualify as destructive per Iron Rule 32.)

**Pre-Flight (chicken-and-egg note from Brief §8):**
- Confirm NO other Pipeline is running before starting this SPEC. This SPEC modifies the very skills that perform collision checks.
- If another Pipeline is running → STOP, escalate, do not proceed.

**Pipeline expectations:**
- Foreman authors SPEC.md in `modules/Module 1.5 - Shared Components/docs/specs/PARALLEL_PIPELINE_COORDINATION/`
- Executor implements + writes EXECUTION_REPORT.md + FINDINGS.md
- Reviewer audits — verify lock files are gitignored, verify all 5 skill files updated, verify no destructive ops
- Localhost-Tester runs smoke 7/7 + the E2E collision test from deliverable #4
- Foreman writes FOREMAN_REVIEW.md + 4 skill-harvest proposals (2 for opticup-strategic, 2 for opticup-executor)
- Supervisor (Shadow Mode) processes any escalations side-by-side with Daniel — log to `_archive/supervisor-log/shadow-{ISO_DATE}.md`

**Return on closure:** ONE Hebrew summary — verdict (🟢/🟡/🔴), commits range, total wall-clock, escalations count, Shadow-mode Supervisor accuracy on this run (if applicable).

Begin.
