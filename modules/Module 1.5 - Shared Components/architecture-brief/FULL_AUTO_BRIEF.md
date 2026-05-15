# Full Auto Pipeline — Architecture Brief

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Module Strategist (`opticup-strategic`) → multi-phase SPEC chain
**Owning module:** Module 1.5 — Shared Components (cross-module infrastructure)

---

## 1. Purpose

Replace the current 5-agent SPEC chain — where each agent transition requires Daniel to manually open a new Claude Code chat and paste a fresh activation prompt — with a single self-orchestrating pipeline that runs end-to-end in **one Claude Code session**.

Daniel pastes ONE activation prompt for a SPEC. The pipeline runs Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review without human intervention, stopping only on (a) escalations that require strategic decision, or (b) destructive operations not pre-authorized. Daniel sees one Hebrew-language summary at the end, or one Hebrew escalation message in the middle. Never raw technical output, never multi-step prompt babysitting.

This brief implements the "Full Auto" model Daniel approved 2026-05-11.

## 2. Current Pain

Today, running one SPEC from authoring to closure requires Daniel to:

1. Open Claude Code chat #1 → paste Foreman activation prompt → wait → Foreman writes SPEC → Daniel copies path
2. Open Claude Code chat #2 → paste Executor activation prompt with path → wait → Executor runs → outputs EXECUTION_REPORT
3. Open Claude Code chat #3 → paste Reviewer activation prompt → wait → Reviewer audits
4. Open Claude Code chat #4 → paste Localhost-Tester activation prompt → wait → smoke runs
5. Open Claude Code chat #5 → return to Foreman → wait → FOREMAN_REVIEW written

Five separate chats per SPEC. Each context fresh, each requiring Daniel to remember the right path, the right skill, the right prompt structure. The user has explicitly said: "אני רוצה שהסקילים יוכלו לעבוד אחד עם השני, ולא נצטרך לפתוח כל פעם סשן חדש."

## 3. The Pipeline

The pipeline lives in ONE Claude Code session. The session uses skill chaining: when a skill completes its phase, it explicitly loads the next skill in the chain via the same chat's Skill tool, without ending the session.

```
Daniel pastes ONE activation prompt
  ↓
[Skill: opticup-strategic] — Foreman authoring phase
  • reads brief
  • writes SPEC at modules/Module N/docs/specs/{SLUG}/SPEC.md
  • commits SPEC
  • triggers next: "Skill: opticup-executor"
  ↓
[Skill: opticup-executor] — Build phase
  • reads SPEC from path
  • runs pre-flight
  • implements + commits
  • writes EXECUTION_REPORT.md + FINDINGS.md
  • triggers next: "Skill: opticup-reviewer"
  ↓
[Skill: opticup-reviewer] — Audit phase
  • reads commits + diff
  • audits Iron Rules + security + RLS
  • writes review notes into EXECUTION_REPORT
  • triggers next: "Skill: opticup-localhost-tester"
  ↓
[Skill: opticup-localhost-tester] — Smoke phase
  • starts local servers via start-local.ps1
  • runs baseline.test.mjs
  • screenshots if visual changes
  • writes TEST_REPORT.md
  • triggers next: "Skill: opticup-strategic"
  ↓
[Skill: opticup-strategic] — Foreman review phase
  • reads all 4 reports (SPEC + EXECUTION + TEST + review notes)
  • writes FOREMAN_REVIEW.md with verdict
  • applies 2 lessons to opticup-strategic SKILL.md
  • applies 2 lessons to opticup-executor SKILL.md
  • commits
  ↓
Done. ONE Hebrew summary to Daniel: "SPEC closed. [verdict]. Next: [next SPEC or done]."
```

**The critical insight:** skill chaining (`Skill: <name>`) is already supported by Claude Code. It does not require opening a new chat. It just requires every skill in the chain to know what comes next AND for each skill's exit condition to include "load the next skill."

## 4. Scope — In

### Required deliverables

1. **Skill file updates** (5 skills, all in `.claude/skills/`):
   - `opticup-strategic/SKILL.md` — add §"Pipeline Hand-off" with explicit "when finished authoring, load opticup-executor with this dispatch line"
   - `opticup-executor/SKILL.md` — add §"Pipeline Hand-off" with explicit "when finished implementing, load opticup-reviewer"
   - `opticup-reviewer/SKILL.md` — add §"Pipeline Hand-off" — load opticup-localhost-tester
   - `opticup-localhost-tester/SKILL.md` — add §"Pipeline Hand-off" — load opticup-strategic for review phase
   - `opticup-strategic/SKILL.md` — add §"Pipeline Closure" — final summary to Daniel, no further hand-off

2. **Iron Rule 32 — Destructive Ops Gate:**
   - Add to `CLAUDE.md` §6 Hygiene Rules
   - Every SPEC MUST declare a `§ Destructive Operations` section listing: `None` OR explicit list of file deletes, table drops, column drops, rename of 5+ files, force-pushes, rebases.
   - If Executor encounters a destructive operation NOT in the declared list — STOP automatically + escalate.
   - Enforced by `scripts/checks/destructive-ops-declared.mjs` (new). Runs in pre-commit hook.
   - Bypass requires explicit Daniel approval in the chat (not a flag).

3. **Mandatory Backups Discipline:**
   - Iron Rule 9 (Section 9 Working Rules — Backups) is upgraded from "before major restructuring" to "before any operation that touches > 5 files OR refactors > 100 lines in a single file OR renames any file."
   - Backup goes to `modules/Module N/backups/{ISO_DATE}_{SPEC_SLUG}/`.
   - Backup happens AUTOMATICALLY before the destructive step, not as a manual decision.
   - The Executor skill must contain the exact backup logic; no shortcut allowed.

4. **Escalation Protocol:**
   - New folder per module: `modules/Module N/escalations/`.
   - When any skill in the pipeline determines it cannot proceed safely without strategic input (NOT just operational uncertainty), it writes:
     ```
     modules/Module N/escalations/{ISO_TIMESTAMP}_{TOPIC_SLUG}.md
     ```
   - Format (mandatory):
     ```
     # Escalation: {topic}
     **Stuck at:** {phase / SPEC SLUG / commit hash}
     **What I tried:** {1-3 bullets}
     **Options I see:** {2-4 bullets — each with pros/cons}
     **My recommendation:** {one option + why}
     **Question for Architect:** {one sentence ending in ?}
     ```
   - After writing the file, the skill emits ONE Hebrew line to Daniel: `🛑 נתקעתי על {topic} — פנה לארכיטקט ב-Cowork. קובץ: {path}`.
   - Daniel opens Cowork, says "יש escalation". Architect reads the file, returns a structured response template that the skill can ingest:
     ```
     ## Architect Decision: {topic}
     **Resolution:** {one line — chosen option from the escalation}
     **Reasoning for Foreman/Executor:** {1-2 lines — context they need to proceed}
     **Resume instruction:** {explicit next step — "continue from commit X, apply option Y, no SPEC amendment needed" OR "amend SPEC §N to add Z, then resume"}
     ```
   - Daniel pastes the decision into the SAME Claude Code chat (still alive). The skill ingests, resumes the pipeline.

5. **Single-activation Entry Point:**
   - One activation prompt for the whole pipeline (not 5).
   - The prompt format: "Run the SPEC pipeline. Source brief: {path}. Pipeline mode: full-auto."
   - The `opticup-strategic` skill detects this and switches into full-auto mode — every hand-off uses skill chaining, every dwell point asks itself "is this an escalation or just a checkpoint?", only escalations stop the pipeline.

6. **Visible-progress Discipline:**
   - The pipeline emits one short Hebrew status line to Daniel between phases — NOT verbose output, NOT the EXECUTION_REPORT, NOT the SPEC contents. Examples:
     - `✓ SPEC written (M7_ORDERS_REDESIGN).`
     - `✓ Build complete (12 files, 3 commits).`
     - `✓ Review clean.`
     - `✓ Smoke 7/7 PASS.`
     - `✓ FOREMAN_REVIEW written. Verdict: 🟢 CLOSED.`
   - Daniel can see the pipeline is alive without reading reports.

### Implementation order

Phase 1 (foundation — required before Phase 2/3):
- Iron Rule 32 + `destructive-ops-declared.mjs` script + pre-commit wiring
- Backups discipline update in CLAUDE.md + `opticup-executor` SKILL.md
- Escalation Protocol — folder creation + template + ingestion logic in each skill

Phase 2 (chaining):
- Update each of the 5 skill SKILL.md files with the §Pipeline Hand-off section
- Pipeline mode detection in `opticup-strategic`
- Status-line emission discipline across all skills

Phase 3 (verification):
- Run the FIRST live test on a low-risk SPEC (e.g., a doc-only update) to validate the chain doesn't break
- Then a small code SPEC to validate the full chain including Reviewer + Tester
- Adjust based on Findings before declaring Full Auto stable

## 5. Scope — Out

- **Cross-repo parallel execution.** Full Auto runs in ONE Claude Code session on ONE repo. Cross-repo parallelism is handled by repo split (OPEN_TASKS #2), not this brief.
- **Cowork ↔ Claude Code sync automation.** The escalation handoff via Daniel pasting Architect's response into the chat is intentional — automating that requires a bidirectional bridge that doesn't exist yet. Out of scope.
- **Voice escalations / phone notifications.** Daniel reads the Hebrew line in the Claude Code chat. No SMS/push.
- **Auto-rollback on failed test.** Reviewer/Tester failures pause the pipeline + escalate. Auto-rollback to last green tag is too risky day-1.
- **Migration of past SPECs.** Old SPECs stay manual. Full Auto applies to new SPECs only.

## 6. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | One chat, not five — skill chaining inside one session | Daniel 2026-05-11 |
| 2 | Iron Rule 32 — Destructive Ops Gate | Daniel + Architect 2026-05-11 |
| 3 | Backups automatic, not discretionary | Daniel 2026-05-11 |
| 4 | Escalation = file + one Hebrew line + Daniel resumes via Cowork | Daniel + Architect 2026-05-11 |
| 5 | Status lines in Hebrew, brief, one per phase | Architect |
| 6 | Daniel's veto for merge to main remains (Iron Rule existing) | Inherited |
| 7 | Foreman is BOTH first skill (author) AND last skill (reviewer) in the chain | Architect |
| 8 | Full Auto applies to new SPECs only; old SPECs stay manual | Architect |
| 9 | Phase 1 (foundation) ships before Phase 2 (chaining) | Architect — risk control |
| 10 | First live test on a doc-only SPEC, not a code SPEC | Architect — risk control |

## 7. Cross-Module Contracts

- **Contract A — Skill Hand-off Signature:** every skill in the chain ends with `Skill: <next-skill-name>` as its final action. Exact format defined in §4 deliverable 1.
- **Contract B — File Persistence:** each phase writes its output to disk (EXECUTION_REPORT, FINDINGS, TEST_REPORT, FOREMAN_REVIEW) BEFORE handing off. The next skill reads from disk, not from chat memory. This survives Claude Code session restarts.
- **Contract C — Iron Rule 32 Format:** every SPEC.md MUST have a `## Destructive Operations` section. Empty (`None.`) is acceptable. Missing = pre-commit blocks the SPEC commit.
- **Contract D — Backup Path Convention:** `modules/Module N/backups/{ISO_DATE}_{SPEC_SLUG}/` — never elsewhere. The Sentinel scans for orphan backups outside this convention.
- **Contract E — Escalation File Lifecycle:** escalations are NOT deleted after resolution. They're archived under the same path with a `RESOLVED_` prefix once Architect's decision is logged into the SPEC and the pipeline resumes.

## 8. Open Questions

Resolved by Module Strategist during SPEC authoring:

1. **Skill chaining failure recovery** — what happens if `Skill: opticup-executor` fails to load (skill file corrupted, permission error)? Likely retry once, then escalate. Module Strategist defines the exact retry policy.
2. **Concurrent escalation handling** — what if Foreman writes an escalation, then Executor (in parallel SPEC) also escalates? Daniel sees two Hebrew lines back-to-back. Acceptable, or queue? Architect leans toward "show both, Daniel triages."
3. **Status line spam control** — 5 status lines per SPEC is fine; 50 SPECs in one day = 250 status lines. Cap? Or fine because each is < 60 chars?
4. **`opticup-architect` involvement** — does Architect (this skill) load into the pipeline at all, or only via Daniel + Cowork? Recommendation: NO load. Architect is escalation-only. Pipeline never auto-loads Architect; only Daniel does, from a separate Cowork chat.

## 9. Anti-Patterns (from prior SPECs)

- **Don't put activation prompts in each skill.** That's the old model. Skills hand-off via skill chaining, not via human pasting.
- **Don't make Architect a pipeline step.** Architect is for strategic decisions, not execution.
- **Don't queue escalations silently.** Every escalation = one Hebrew line to Daniel, immediately.
- **Don't skip the FOREMAN_REVIEW at end.** Even in full-auto, the lessons-loop is mandatory. Skip it → skills don't improve → entire SaaS scaling story collapses.
- **Don't allow `--no-verify` in the pipeline.** Iron Rule 31 (integrity gate) is non-overridable in full-auto mode.
- **Don't trust the SPEC-author about destructive ops.** The pre-commit script verifies the §Destructive Operations section exists and is well-formed. Author saying "no destructive ops" but SPEC containing `git rm` = pre-commit blocks.

## 10. Iron Rules in Sharp Focus

- **Rule 9 (no hardcoded business values)** — pipeline doesn't hardcode tenant names, paths, or business config in skill files
- **Rule 21 (no orphans)** — skill hand-off uses existing 5-agent chain, doesn't introduce new agents
- **Rule 31 (integrity gate)** — non-overridable in full-auto; pre-commit blocks any commit that fails it
- **NEW Rule 32 (Destructive Ops Gate)** — see §4 deliverable 2

## 11. Reference Files

| File | Why |
|---|---|
| `docs/AGENT_CHAIN_PROTOCOL.md` | Current 5-agent chain — needs the §Pipeline Hand-off addition |
| `.claude/skills/opticup-strategic/SKILL.md` | Add §Pipeline Hand-off (first phase) + §Pipeline Closure (last phase) |
| `.claude/skills/opticup-executor/SKILL.md` | Add §Pipeline Hand-off |
| `.claude/skills/opticup-reviewer/SKILL.md` | Add §Pipeline Hand-off |
| `.claude/skills/opticup-localhost-tester/SKILL.md` | Add §Pipeline Hand-off |
| `CLAUDE.md` §6 | Add Iron Rule 32 |
| `CLAUDE.md` §9 | Upgrade Backups rule |
| `scripts/checks/destructive-ops-declared.mjs` | NEW |
| `scripts/verify.mjs` | Wire the new check |

## 12. Hand-off Note

Foreman writes ONE SPEC at:
`modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/SPEC.md`

The SPEC implements §4 deliverables in 3 phases (foundation → chaining → verification). Run order is strict: foundation must ship before chaining starts; chaining ships before live verification.

After the SPEC is dispatched and Phase 3 passes, Full Auto is the new default for all future SPECs. The current manual 5-chat dance is retired.

Daniel's one job after this brief: open ONE Claude Code chat, paste the activation prompt for the Full Auto SPEC, and observe the pipeline run on itself. If it works for its own implementation, it works.

---

*End of brief.*
