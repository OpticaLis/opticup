# FINDINGS — SUPERVISOR_SKILL_PHASE_1

**Executor:** opticup-executor
**Date:** 2026-05-17
**SPEC:** `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/SPEC.md`

Findings discovered during execution but outside SPEC scope. Each has a
disposition: NEW-SPEC / TECH_DEBT / DISMISS.

---

## F-1 — LOW — Placeholders-first discipline missing from Executor SKILL.md

**Severity:** LOW
**Location:** `.claude/skills/opticup-executor/SKILL.md` Code Patterns section
**Description:** When drafting `core/triage-protocol.md` + `core/escalation-format.md` for the new portable skill, the first draft leaked 3 project-specific tokens (`Daniel`, `opticup-executor`, `opticup-supervisor`) across ~10 hits. The post-write grep caught it, but the leak should have been prevented at write time by drafting with placeholders from the start.

**Suggested action:** **NEW-SPEC** — or — accept Executor Proposal #1 in EXECUTION_REPORT.md §10. The proposal adds a "placeholders-first" bullet to Executor SKILL.md Code Patterns. Not urgent (the post-write grep + pre-commit Reviewer audit are sufficient safeguards), but the proposal codifies it for future portable-skill builds.

**Reference:** EXECUTION_REPORT.md D-1 + Proposal #1.

---

## F-2 — LOW — Hard-Stop semantics deserved more thought at SPEC author time

**Severity:** LOW
**Location:** `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/SPEC.md` §A.5 + `.claude/skills/opticup-supervisor/adapters/opticup/skill-destinations.md`
**Description:** The SPEC §A.5 pre-baked the E2E test question + expected response (Confidence 5 + Status SHADOW_PROPOSAL + cited CLAUDE.md §9 #7). But the question's keywords match the `main-branch-touch` Hard-Stop category. With strict "any-keyword-match → short-circuit" Hard-Stop semantics, the response would be `NO_TRIAGE_HARD_STOP` + Confidence 0 — contradicting §A.5's expected shape. The Foreman didn't think through this when authoring §A.5 + skill-destinations.md.

**Suggested action:** **DISMISS** (resolved in-flight). EXECUTION_REPORT.md D-3 documents the resolution: updated `skill-destinations.md` to distinguish authorization-shaped vs rule-application-shaped questions, and re-phrased the E2E test escalation to be unambiguously rule-application-shaped. The fix is committed in C5. Pattern is worth keeping in mind for future Hard-Stop additions in the Adapter (Phase 2/3 may add more categories).

**Reference:** EXECUTION_REPORT.md D-3.

---

## F-3 — MEDIUM — Architect pending entry awaits ingestion into CROSS.md

**Severity:** MEDIUM
**Location:** `_archive/architect-pending-entries/2026-05-17_decisions_log_for_autonomous_skill.md` (152 lines)
**Description:** During First Action, the `architect-pending-applied` pre-commit hook surfaced this file. Read in full: it contains 18 decision patterns (corrections C-001..C-006, agreements A-001..A-007, communication style S-001..S-007, strategic patterns P-001..P-005) authored by the Architect in a Cowork session 2026-05-17 evening for ingestion into `CROSS.md`. The file's footer explicitly instructs the "skill-builder session" (i.e., this Pipeline) to READ it; the SECOND step ("eventually consumed into CROSS.md") belongs to the Architect in a Cowork session, per project convention (CROSS.md is owned by `opticup-architect`).

The patterns are HIGHLY relevant to the Supervisor's future decision-making in Shadow + Active Mode. They cover Daniel's exact decision rules (autonomous-skill rules per pattern) that the Supervisor will eventually consult. Once ingested into `CROSS.md`, the Supervisor will pick them up automatically via source-2 (`CROSS.md` is priority 2 per Brief §13.1).

**Suggested action:** **NEW-SPEC** (or pre-existing OPEN_TASKS entry) — Architect to perform the ingestion in a Cowork session at next Cowork touch. SPEC slug suggestion: `M1_5_ARCHITECT_DECISIONS_LOG_INGESTION_2026_05_17`. The work is purely a CROSS.md append + the pending file's relocation/removal per `PENDING_ENTRIES_AUTO_RESOLUTION` protocol. Approximately 15-30 minutes.

**Why this SPEC didn't consume it:** SUPERVISOR_SKILL_PHASE_1 SPEC §8 lists "DECISIONS_LOG.md writes" as out-of-scope, and Brief §4 mandates the Supervisor never writes to DECISIONS_LOG. The ingestion is the Architect's role, not the Supervisor builder's.

**Reference:** EXECUTION_REPORT.md DR-1.

---

## F-4 — INFO — Stale baseline at SPEC author time

**Severity:** INFO
**Location:** SPEC §0 Baselines table — `BASE_CLAUDE_MD_LINES=421`
**Description:** Actual HEAD of CLAUDE.md at execution start was 499 lines (not 421). The §5 stop-trigger (exceeds 481) was based on a stale baseline. Pattern: SPEC authored hours before execution; HEAD advances between author + execution time.

**Suggested action:** **DISMISS** (process improvement codified). EXECUTION_REPORT.md Proposal #2 adds a "Baselines Sanity Check" sub-step at the start of Executor Step 1.5. Once applied to the skill, future SPECs will catch this within 30 seconds of execution start instead of 3 iterations into a phantom cap.

**Reference:** EXECUTION_REPORT.md D-2 + Proposal #2.

---

## Summary

| Finding | Severity | Disposition |
|---|---|---|
| F-1 | LOW | NEW-SPEC OR Executor Proposal #1 (Foreman decides) |
| F-2 | LOW | DISMISS (resolved in-flight) |
| F-3 | MEDIUM | NEW-SPEC `M1_5_ARCHITECT_DECISIONS_LOG_INGESTION_2026_05_17` (Architect cowork action) |
| F-4 | INFO | DISMISS (Executor Proposal #2 covers it) |

**0 CRITICAL, 0 HIGH, 1 MEDIUM, 2 LOW, 1 INFO.**

The MEDIUM (F-3) is an Architect cowork action, not a code change. None of the findings block SPEC closure.
