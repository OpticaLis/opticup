# FOREMAN_REVIEW — BLOG_PRE_MERGE_AUDIT

> **SPEC:** `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/SPEC.md`
> **Reviewed by:** opticup-strategic (retro-backfill via overnight hygiene sweep, 2026-05-09)
> **Verdict:** 🟢 **CLOSED**

## Summary

Read-only audit of all 174 blog posts (58 he/en/ru) prior to a planned merge. Executor produced `FINDINGS.md` with 22 evidence-rated findings — 1 CRITICAL (nonsensical EN/RU article) and 21 HIGH (slug language mismatches + translation integrity). Zero code/DB changes. All 13 SPEC §3 success criteria met. Decision-criteria-before-data discipline applied (FINDINGS.md §"Decision Framework" preceded findings list).

## Strengths

- **Decision criteria pre-committed** (Pattern P3 from `opticup-strategic` SKILL): the FINDINGS.md framework explicitly stated severity rules BEFORE the findings, preventing post-hoc rationalization. This is exactly the pattern the SKILL prescribes — landed cleanly here.
- **Severity distribution matches the SPEC's expected shape** (1 CRIT + 21 HIGH + 0 MEDIUM/LOW) — the SPEC anticipated where issues would be, not just "go look".
- **Zero scope drift**: read-only mode held throughout. No "while-I'm-here" code edits.

## Weaknesses / Open

- 22 findings is a lot to triage. SPEC didn't pre-budget how many of the HIGH findings would be addressed pre-merge vs post-merge. Daniel had to do that math after the audit. Author-side gap.

## Author improvement proposals (for `opticup-strategic` skill)

1. **Add to `opticup-strategic` SKILL.md "SPEC author checklist": when authoring a read-only AUDIT spec, pre-commit a triage budget** — "of N findings, target M to fix pre-merge; the rest go to FINDINGS for follow-up SPECs". This matches Pattern P3 (decision criteria before data) but applied to the COUNT of findings, not just severity.
2. **Section template in opticup-strategic for read-only audit SPECs**: separate "audit deliverable" SPECs (this) from "audit + remediation" SPECs (different shape). Readers conflate them; current SKILL doesn't distinguish.

## Executor improvement proposals (for `opticup-executor` skill)

1. **Add a check that read-only SPECs end with zero `git diff` outside FINDINGS/EXECUTION_REPORT/audit-output files**: simple `git diff --stat | wc -l` boundary at end of read-only SPECs catches accidental scope creep before commit.
2. **Document the "pre-commit decision criteria" pattern (P3 in author SKILL) on the executor side too** — when receiving a read-only audit SPEC, the executor's first action should be to verify the SPEC contains an explicit decision framework. Missing → escalate to Foreman before starting.
