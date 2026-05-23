# SKILL_IMPROVEMENT_HARVEST_2026_05_19 — Activation Prompt

Paste into the SAME Claude Code session that ran today's FUNNEL work (if it's still alive) OR a fresh session.

---

```
Run a LIGHT PIPELINE for SKILL_IMPROVEMENT_HARVEST_2026_05_19.

Brief: modules/Module 1.5 - Shared Components/architecture-brief/SKILL_IMPROVEMENT_HARVEST_2026_05_19_BRIEF.md

SPEC location:
modules/Module 1.5 - Shared Components/docs/specs/SKILL_IMPROVEMENT_HARVEST_2026_05_19/SPEC.md

LIGHT PIPELINE — 2 hats only (NO Reviewer, NO Localhost-Tester — doc-only edits):
1. opticup-strategic (Foreman) authors SPEC.
2. opticup-executor applies edits to 3 files.
3. opticup-strategic (Foreman) closes with FOREMAN_REVIEW.

MODEL: Sonnet (claude-sonnet-4-20250514). Pure doc edits.

WHAT THIS APPLIES (per Brief §3):

To .claude/skills/opticup-architect/SKILL.md:
- New Step 0.7 "Live-State Probe" — Brief author must probe schema/statuses/extensions BEFORE writing the SPEC.
- New Step 0.8 "Line-Budget Buffer Convention" — line budgets stated as "N lines (±5 buffer)".
- New Step 0.9 "User Memory Compliance Check" — Brief/Activation Prompt MUST NOT contradict any active user-memory feedback rule. SPECIFIC: never instruct executing session to surface a Hebrew status line. Always English.
- New Step 0.10 "Plain-Language Explanation Rule" — when presenting options to Daniel, use 2-column comparison tables in plain Hebrew. NO jargon (throttle, rate-limit, cron, queue, etc.) without immediate plain-Hebrew parenthetical. End with explicit Architect recommendation + 1-sentence plain-Hebrew reason.

To .claude/skills/opticup-executor/SKILL.md:
- New Step 1.5.6 "DB Probe Pre-Flight" — pg_extension + pg_namespace + pg_proc + information_schema probes for EVERY SPEC touching DB.
- New Step 1.5.7 "SECURITY DEFINER Function Rehearsal" — BEGIN/ROLLBACK rehearsal for any SECURITY DEFINER function.

To .claude/skills/opticup-architect/references/DECISIONS_LOG.md:
- 1 new cross-module entry documenting this harvest event with source SPECs.

KEY CONSTRAINTS FROM BRIEF:
- Per Iron Rule 32: Destructive Operations declared = 0. Pure additive doc edits.
- Cross-Module Safety Audit §4 is BINDING. Touch ONLY the 3 files listed.
- D1: 3-strike honored. Pattern A (DB probe) strict; B + C loose.
- D2: NO retroactive amendments to past SPECs.
- D3: 1 commit per file (3 commits + retrospective = 4 total).

STOP TRIGGERS:
- If running in Cowork: .claude/skills/ write lock — pending file fallback to _archive/architect-pending-entries/.
- §4.3 violation.
- Existing skill content contradicts proposed edit → STOP, escalate.

VERIFICATION:
- Iron Rule 31 integrity gate passes.
- Iron Rule 32: 0 destructive ops.
- Working tree clean at end.

POST-SPEC DELIVERABLES:
- 3 modified files.
- FOREMAN_REVIEW.md (no Reviewer step in this light pipeline; Foreman self-reviews per Brief §5).

When done, surface a short English status line to Daniel (per user memory: feedback_daniel_comms — English only).
```

---

*End of Activation Prompt. Brief contains §3 detailed scope, §4 safety audit, §6 D1-D3 locked decisions.*
