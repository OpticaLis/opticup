# FINDINGS — M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING

**Run date:** 2026-05-14 (overnight Bundle 2 T2.1)
**Outcome:** Closed cleanly. 3/3 regression tests PASS. No deviations.

---

## F-1 — Original gap reproduced before fix

**Severity:** HIGH (process gap — blocked legitimate SPEC closures)
**Status:** CLOSED by this SPEC

**Evidence:** Bundle 1 escalation file `2026-05-14T22-15Z_destructive_ops_check_blocks_declared_deletes.md` documented the original blocker. The pre-fix tool at `scripts/checks/destructive-ops-declared.mjs:234-243` walked `git diff --cached --name-only --diff-filter=D` and unconditionally pushed a violation per staged delete. There was no read-back of the staged SPEC's `## Destructive Operations` section.

**Fix:** new `collectAuthorizedDeletes(stagedFiles, stagedDeletes, REPO)` helper reads each staged SPEC's section text, derives an authorization set via 3 match strategies (full relative path / basename / dir + ext glob), and section (B) skips violations for paths in the set.

## F-2 — Iron Rule 32 / Iron Rule 12 tradeoff resolved with extraction

**Severity:** INFO
**Status:** RESOLVED

Initial inline implementation pushed the main check file from 325 → 410 lines (over Rule 12's 350 absolute cap). Mid-run refactor extracted the helpers to `scripts/destructive-ops-auth-parser.mjs` (99 lines). Final state:

| File | Lines | Cap | OK? |
|---|---|---|---|
| `scripts/checks/destructive-ops-declared.mjs` | 336 | 350 | ✅ |
| `scripts/destructive-ops-auth-parser.mjs` | 99 | 350 | ✅ |
| `scripts/test-destructive-ops-gate.mjs` | 209 | 350 | ✅ |

Lesson: enforcement scripts grow naturally because each new pattern lives in the same file. Extract early — the cost of a second file is small; the cost of breaching Rule 12 is a rule violation.

## F-3 — Test placement convention confirmed

**Severity:** INFO

Existing tests live at `scripts/test-X.mjs` (not under `tests/`). Followed the convention. `npm run test:destructive-ops-gate` works as expected.

The pattern matters because `scripts/test-*.mjs` is the project's home for "regression tests for the check infrastructure itself" while `tests/smoke/` is for "smoke tests of the running application." Separating concerns by intent is a quiet but useful convention.

## F-4 — One detail to watch: SPEC_HEADING_RE duplicated across two files

**Severity:** LOW (drift risk)
**Mitigation:** Both files have a comment pointing at each other. Regression tests catch a future divergence.

The `SPEC_HEADING_RE = /^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m` constant is defined in both `destructive-ops-declared.mjs` (for section-A validation) and `destructive-ops-auth-parser.mjs` (for section extraction). If they ever diverge, section-A could pass while section-extraction returns empty (or vice versa) — silent failure mode.

**Future improvement:** export the regex from one place. Not blocking; defer to next infra-touch SPEC.

End of FINDINGS.
