# ACTIVATION_PROMPT — SKILL_HARVEST_2026_05_18

**For:** opticup-executor, Path X sequential. **Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1.5 - Shared Components/docs/specs/SKILL_HARVEST_2026_05_18/SPEC.md`

## Pre-flight (in SPEC §0)

- 3 SKILL/decisions files identified for pure-append edits
- 10 proposals enumerated (5 strategic + 5 executor); each carries 4-field format (rule / why / how-to-apply / source)
- Zero destructive ops

## Bounded Autonomy

- §3: 10 measurable criteria
- §4 declares None.
- §5 broad: end-to-end execution
- Stop only on deviation per §6

## Execution sequence

1. Append 5 P-STRAT proposals to `.claude/skills/opticup-strategic/SKILL.md` under new section `## Patterns from SKILL_HARVEST_2026_05_18`
2. Append 5 P-EXEC proposals to `.claude/skills/opticup-executor/SKILL.md` under the same section name
3. Append summary entry to `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`
4. Write EXECUTION_REPORT + FINDINGS
5. 2 commits per §10, push to develop

## Stop-on-deviation

- Same proposal name already exists (avoid duplicate)
- File structure changed since pre-flight (potential conflict)
- Integrity gate or Iron Rule 32 fires (this SPEC declares §4 None.)

## Final report

- Commits + git status
- Counts: P-STRAT-2026-05-18-* (expect 5) + P-EXEC-2026-05-18-* (expect 5)
- DECISIONS_LOG entry confirmation
- "Defect class closed + lessons codified — Path X arc complete"

---

**END ACTIVATION_PROMPT**
