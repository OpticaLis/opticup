# SPEC — M1_5_FULL_AUTO_TEST_1_DOCS_ONLY

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_1_DOCS_ONLY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, full-auto pipeline)
> **Authored on:** 2026-05-11
> **Module:** 1.5 — Shared Components
> **Parent SPEC:** `M1_5_FULL_AUTO_PIPELINE` (Phase 3 commit 8 verification)
> **Pipeline mode:** full-auto, single-session run, no new chat opened

---

## 1. Goal

Validate that the Full-Auto Pipeline can run end-to-end (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review) inside ONE chat on a **docs-only** SPEC where the risk surface is essentially zero. This is the first live test of the pipeline that was bootstrapped by `M1_5_FULL_AUTO_PIPELINE`.

## 2. Background

`M1_5_FULL_AUTO_PIPELINE` Phase 1 added `scripts/checks/destructive-ops-declared.mjs` and wired it into `scripts/verify.mjs`. The Current Checks table in `scripts/README-verify.md` was not updated in that commit (intentionally — it's the test target). This SPEC adds the missing row.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Row added to scripts/README-verify.md | "destructive-ops-declared" appears in Current Checks table once | `grep -c "destructive-ops-declared" scripts/README-verify.md` → 1 |
| 2 | Only 1 file changed | git diff stat | `git log --stat HEAD~1..HEAD scripts/README-verify.md` shows 1 file |
| 3 | Integrity gate green | exit 0 | `npm run verify:integrity; echo $?` → 0 |
| 4 | Pipeline ran in ONE chat | EXECUTION_REPORT.md states it | grep "single-session run" |

## 4. Destructive Operations

**None.** This SPEC modifies one documentation table row. No deletes, no renames, no SQL DDL/DML, no force pushes.

## 5. Autonomy Envelope

Bounded Autonomy + Pipeline mode: full-auto. Executor proceeds without asking. Stops on: any unexpected file modification, any verify failure, any branch ≠ develop.

## 6. Stop-on-Deviation Triggers

- More than 1 file changed by the edit.
- Verify or integrity gate fails.
- Smoke test fails (though this SPEC does not require smoke — docs-only).

## 7. Out of Scope

- Any code change.
- Any SQL.
- Any other doc file.

## 8. Expected Final State

- `scripts/README-verify.md` Current Checks table contains a row for `destructive-ops-declared` referencing Rule 32.
- EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md (skip-rationale), FOREMAN_REVIEW.md committed in this SPEC folder.
- No other files touched.

## 9. Commit Plan

1. `docs(verify): document destructive-ops-declared check in README-verify`
2. `chore(spec): close M1_5_FULL_AUTO_TEST_1_DOCS_ONLY with retrospective`

## 10. Anti-Patterns

- DO NOT touch any other doc file.
- DO NOT run smoke for a docs-only SPEC (waste of time and would invalidate the "docs-only" classification).
- DO NOT skip TEST_REPORT.md — write a skip-rationale TEST_REPORT.md instead.
