# FINDINGS — SKILL_IMPROVEMENT_HARVEST_2026_05_19

> **Written by:** opticup-executor (Sonnet 4.6)
> **Date:** 2026-05-19
> **Source SPEC:** `modules/Module 1.5 - Shared Components/docs/specs/SKILL_IMPROVEMENT_HARVEST_2026_05_19/`

---

## Inherited Findings (from SPEC §0.7 — resolved at author time, no action needed)

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F-A1 | Brief's "Step 0.7/0.8/0.9" naming doesn't match existing architect SKILL.md numbering (uses Bootstrap 1/2/3/4/4.1/4.5/5). | INFO | Resolved in SPEC §0.4 — adopted Brief's naming inside new `## Brief Authoring Pre-flight` section. No follow-up. |
| F-A2 | Brief's "Step 1.5.6/1.5.7" naming differs from existing executor SKILL.md sub-letter pattern (a..j). | INFO | Resolved in SPEC §0.4 — adopted dot-numeric naming as new sub-heading style. The two patterns coexist. No follow-up. |
| F-A3 | Pattern D (English-only) was the most-frequent offender — every Brief in today's cohort (~10) carried this defect. Step 0.9 is the structural fix. Not retroactive. | INFO | Resolved by Step 0.9 codification in C2. No follow-up. |

---

## New Findings (discovered during execution)

| # | Finding | Severity | Location | Description | Suggested Action |
|---|---|---|---|---|---|
| F-E1 | DECISIONS_LOG ordering ambiguity in SPEC | INFO | `SPEC.md §3.5.C Part 1` | SPEC said "insert after row #34, at the end of the cross-module table" — these are contradictory because the table is ordered newest-first. Row #34 is at the TOP of the table (line 50), not the bottom. The Executor resolved this correctly (see EXECUTION_REPORT §3) but the ambiguity cost ~2 minutes. | Add a one-liner to SPEC_TEMPLATE or opticup-executor SKILL.md doc-insert conventions: "probe table ordering before inserting; newest-first tables get new rows at the top." (See P-EXEC-1 in EXECUTION_REPORT §8.) |

---

**Total new findings: 1 (INFO — no follow-up action required beyond the P-EXEC-1 skill improvement proposal in EXECUTION_REPORT §8).**

*End of FINDINGS.*
