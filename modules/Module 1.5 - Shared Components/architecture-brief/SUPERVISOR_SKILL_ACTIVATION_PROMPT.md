You are operating on the `opticalis/opticup` ERP repo, branch `develop`. Full Auto Pipeline mode.

**Task:** Author + execute SPEC 1 of the Supervisor Skill build (משגיח). This is the first of 3 SPECs derived from a sealed Architecture Brief.

**Read first:**
- `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_BRIEF.md` (sealed 2026-05-17, 211 lines)
- `.claude/skills/opticup-architect/SKILL.md` (existing escalation flow)
- `.claude/skills/opticup-strategic/SKILL.md` (existing Foreman skill — confirm no overlap)
- `references/DECISIONS_LOG.md` + 2-3 of `references/decisions/M{N}.md` (format Supervisor must parse)
- `CLAUDE.md` §11 Autonomous Mode + Iron Rule 32 (Destructive Ops Gate)

**SPEC 1 scope (this Pipeline run only):**

Build the Supervisor skill skeleton + Triage protocol. Do NOT build Retry (Phase 2) or Auto-Harvest (Phase 3) — those are SPEC 2 and SPEC 3.

Deliverables for SPEC 1:
1. New skill folder `.claude/skills/opticup-supervisor/` with:
   - `SKILL.md` (description, triggers, bootstrap, summary of Triage protocol)
   - `core/triage-protocol.md` (project-agnostic — how to read escalation, search decisions log, write response, log)
   - `core/escalation-format.md` (project-agnostic — required fields in any escalation file)
   - `adapters/opticup/decisions-log-paths.md` (per Brief §13 Daniel-locked decision sources + priority order + auto-memory confidence cap = 3)
   - `adapters/opticup/skill-destinations.md` (which existing skill owns which pattern type)
2. Update `.claude/skills/opticup-executor/SKILL.md` + `.claude/skills/opticup-reviewer/SKILL.md` + `.claude/skills/opticup-localhost-tester/SKILL.md`: when about to write an escalation file, FIRST invoke the Supervisor (Triage) → only if Supervisor escalates further → ping Daniel as today.
3. Create empty folders with `.gitkeep`: `_archive/supervisor-log/` + `_archive/supervisor-pending-promotions/`.
4. Update `CLAUDE.md` §11 Autonomous Mode: describe the Supervisor layer (3-day Shadow Mode → Active Mode transition criteria from Brief §11).
5. End-to-end test: write a small fake escalation file at `modules/Module 1.5 - Shared Components/escalations/` whose answer is clearly in DECISIONS_LOG → invoke Supervisor → verify it writes `ARCHITECT_DECISION_*.md` with the right citation + confidence score 4-5.

**Shadow Mode is the launch state.** SPEC 1 ships the skill in Shadow Mode by default. The Brief §11 + §12 govern the learning loop — read them carefully, they are non-negotiable.

**Hard constraints (per Brief §4 + §5):**
- Supervisor never writes to DECISIONS_LOG.
- Supervisor never edits `main`.
- No destructive operations (no `rm`, no `DROP`, no force-push, no rebase). The only "delete-like" op allowed is `git reset` to an existing tag.
- Skill edits (Phase 3 territory, not this SPEC) → out of scope for SPEC 1.
- Core layer files must be project-agnostic — no mention of "Optic Up", "Supabase", "Hybrid+Navy", "Iron Rule N", "Prizma". Reviewer must verify this in audit phase.

**Pipeline expectations (per CLAUDE.md §11 + opticup-strategic SKILL):**
- Foreman authors SPEC.md in `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/`
- Executor implements + writes EXECUTION_REPORT.md + FINDINGS.md
- Reviewer audits + flags Core/Adapter leak if any
- Localhost-Tester verifies smoke 7/7 + the end-to-end Triage test from deliverable #5
- Foreman writes FOREMAN_REVIEW.md + 2 skill-harvest proposals for opticup-strategic + 2 for opticup-executor

**Active session note:** another Claude Code session is currently working on M1 expansion. Do not touch any file under `modules/Module 1 - Inventory Management/` or `lens-*.html` or `modules/lens-*/`. If a destructive-ops conflict would arise — escalate, do not proceed.

**Iron Rule 32 — Destructive Operations Declaration (mandatory in SPEC §4):**
```
## 4. Destructive Operations
None.
```
The Supervisor build has zero destructive ops — write that explicitly in the SPEC.

**Return on closure:** ONE Hebrew summary to Daniel — verdict (🟢/🟡/🔴), commits range, total wall-clock, escalations count, follow-ups for SPEC 2.

Begin.
