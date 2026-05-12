# SPEC — M1_5_FULL_AUTO_TEST_2_CODE_CHANGE

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, full-auto pipeline)
> **Authored on:** 2026-05-11
> **Module:** 1.5 — Shared Components
> **Parent SPEC:** `M1_5_FULL_AUTO_PIPELINE` (Phase 3 commit 9 verification)
> **Pipeline mode:** full-auto, single-session run, no new chat opened

---

## 1. Goal

Validate that the Full-Auto Pipeline survives a **small code change** end-to-end with the Localhost-Tester smoke phase actually running. SC: `npm run smoke` must report `7/7 PASS` on demo tenant.

## 2. Background

`M1_5_FULL_AUTO_TEST_1_DOCS_ONLY` proved the pipeline works for a zero-runtime-risk SPEC. This second test ratchets up risk one notch: an actual JS source file edit, but still comment-only (JSDoc), to make sure smoke tests pass.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | JSDoc block added to sortArray | 1 occurrence of "@returns" in sort-utils.js | `grep -c "@returns" shared/js/sort-utils.js` → 1 |
| 2 | Only 1 file changed by code commit | git diff stat | `git diff --stat HEAD~1..HEAD shared/` shows 1 file |
| 3 | Smoke 7/7 PASS | "7/7 passed, 0 failed" | `npm run smoke` |
| 4 | No behavior change | comment-only edit | grep diff for no logic lines added/removed |
| 5 | Pipeline ran in ONE chat | EXECUTION_REPORT.md states it | grep "single-session run" |

## 4. Destructive Operations

**None.** Comment-only JSDoc addition. No deletes, no renames, no SQL.

## 5. Autonomy Envelope

Bounded Autonomy + Pipeline mode: full-auto. Executor proceeds without asking.

## 6. Stop-on-Deviation Triggers

- More than 1 file changed in the code commit.
- Any line of executable code added or removed (only comment / JSDoc lines allowed).
- Smoke < 7/7.

## 7. Out of Scope

- Any other function in sort-utils.js.
- Any other file in shared/js/.
- Any behavior change.

## 8. Expected Final State

- `shared/js/sort-utils.js` has a JSDoc block above `sortArray`.
- SPEC folder contains SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md (7/7 PASS), FOREMAN_REVIEW.md.

## 9. Commit Plan

1. `docs(shared): add JSDoc to SortUtils.sortArray for clarity`
2. `chore(spec): close M1_5_FULL_AUTO_TEST_2_CODE_CHANGE with retrospective`

(Bundled into one git commit for the parent-SPEC commit-9 boundary, per parent SPEC §9.)

## 10. Anti-Patterns

- DO NOT modify any executable line of sortArray (or any other function).
- DO NOT add new functions to sort-utils.js.
- DO NOT skip the smoke test — this is the test SPEC whose entire point is exercising smoke.
