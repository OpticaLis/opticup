# FOREMAN_REVIEW — M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING

**Verdict:** 🟢 CLOSED — clean fix, 3/3 regression tests pass, Rule 12 honored after mid-run extraction. Shipped across 2 commits (391b82b for the check + test, plus a follow-up for helper + npm script + docs) due to a `git reset HEAD --` cleanup foot-gun in the test harness that silently unstaged other staged work mid-test-run. Test now path-scopes the cleanup; bug captured as P-T2.1-3 skill improvement.
**Foreman:** opticup-strategic (overnight Bundle 2 T2.1)
**Review date:** 2026-05-14

---

## 1. Execution quality

Surgical fix to the right surface (section B of `destructive-ops-declared.mjs`). 3 match strategies (full path / basename / dir+ext glob) cover the common SPEC-authoring patterns seen in this project. Tests follow the established `scripts/test-X.mjs` convention with real git staging and try/finally cleanup — no `git stash` (correct per `test-root-discipline.mjs` precedent's explicit comment about stash fragility).

The mid-run Rule 12 catch + helper extraction is a quality signal: Executor noticed the line count breach and re-organized rather than papering over with a "deviation logged" note. Final file count delta: +1 helper, +1 test = clean increments.

The `verify.mjs` auto-discovery gotcha (any `.mjs` in `scripts/checks/` is loaded as a check module) was correctly identified before the bug shipped. Helper placed in `scripts/` not `scripts/checks/`.

## 2. Findings reviewed

4 findings logged. F-1 closes the original gap. F-2 documents the Rule 12 tradeoff. F-3 confirms the test-placement convention. F-4 flags a small future-improvement (deduplicate `SPEC_HEADING_RE`) — LOW severity, not blocking.

## 3. Iron-rule compliance

✅ Rule 12 (file size, after refactor), Rule 21 (no orphans), Rule 23 (no secrets), Rule 31 (integrity gate exit 0), Rule 32 (SPEC §4 declared `None.` — pure additive). All clean.

## 4. Skill improvements (2 minimum required)

### P-T2.1-1 (HIGH) — opticup-executor: Rule-12 pre-flight check on enforcement scripts

**Source evidence:** This SPEC nearly shipped at 410 lines (60 over cap). Caught manually via `wc -l` post-implementation, not by the verify gate (which DOES check file-size via `scripts/checks/file-size.mjs` — but the executor would have run that AFTER staging, only to find a violation requiring re-work).

**Proposal:** Encode in `opticup-executor` SKILL.md: when editing a file in `scripts/checks/` (or any enforcement file), check line count BEFORE writing the edit. If the post-edit count will exceed 350, plan a helper-extraction up front rather than reactively. Cost: ~30 sec for `wc -l <file>` + projection. Saves: rework risk + a Rule-12 violation finding.

**ROI:** 1× violation avoided per enforcement-script edit ≈ ~10 min saved.

### P-T2.1-2 (MEDIUM) — opticup-strategic: SPEC_TEMPLATE should require an "Implementation surface" line that names the file(s) and current line counts

**Source evidence:** The SPEC said "edits scripts/checks/destructive-ops-declared.mjs (~70 lines added, no deletions)" but didn't specify that 70 + 325 = 395 would breach Rule 12. The Foreman could have pre-empted the issue by including current line counts in the §5 plan.

**Proposal:** Add to SPEC_TEMPLATE v3 (T4.1) a §"Implementation surface" subsection listing each file to touch with: current line count, expected delta, projected line count, Rule 12 status. Forces the Foreman to do the math up front.

**ROI:** Same as P-T2.1-1, but at SPEC-author time instead of executor time.

### P-T2.1-3 (HIGH) — opticup-executor: never use `git reset HEAD --` (broad form) in test cleanup

**Source evidence:** The initial test scaffold had `git reset HEAD --` in test 2 and test 3 finally blocks. The broad form unstages EVERYTHING in the index, not just the test fixture. During T2.1 execution this silently un-staged the OTHER 6 user-staged files (helper, package.json, 4 SPEC docs) between test invocations, resulting in a commit with only the 2 explicitly-re-added files. This split T2.1 across two commits and TEMPORARILY left develop with a broken import (the main script imported `../destructive-ops-auth-parser.mjs` which wasn't committed yet).

**Proposal:** Encode in `opticup-executor` SKILL.md: in test harnesses that touch git index, NEVER use `git reset HEAD --` (broad form). Always path-scope: `git reset HEAD -- <specific paths>`. The broad form is a foot-gun that silently corrupts the surrounding session's working state.

**ROI:** Prevents broken-import-on-develop incidents like this one. Estimated value: 5-15 min per occurrence (debug + recovery).

### P-T2.1-4 (LOW) — opticup-reviewer: detect duplicated SPEC_HEADING_RE across files

**Source evidence:** F-4 flagged that `SPEC_HEADING_RE` is duplicated in two files. If they ever diverge, silent failure mode for section-extraction.

**Proposal:** Reviewer pass for any check-tool edit should grep for duplicated `const X = /.../` patterns across `scripts/` and flag them as "drift-risk constants". Not blocking, just visibility.

**ROI:** Low (drift is rare); included for completeness.

## 5. Bundle-2 status after T2.1

T2.1 closed 🟢. Unblocks T2.2+T2.3 (CSS housekeeping deletions). The new auth-resolution path means those deletes can now be declared in their SPEC's §"Destructive Operations" and pass the gate. Tests guarantee the path works.

End of FOREMAN_REVIEW.
