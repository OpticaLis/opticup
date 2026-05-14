# FINDINGS — ARCHITECT_SESSION_2026_05_14_CLEANUP

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/ARCHITECT_SESSION_2026_05_14_CLEANUP/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §0 baseline `BASE_OOS_DIRTY` was estimated, not measured

- **Code:** `M1.5-SPEC-AUTHOR-01`
- **Severity:** LOW
- **Discovered during:** Executor pre-stage baseline capture (`git status --porcelain | wc -l`)
- **Location:** `modules/Module 1.5 - Shared Components/docs/specs/ARCHITECT_SESSION_2026_05_14_CLEANUP/SPEC.md` §0 Baselines table
- **Description:** The SPEC §0 pinned `BASE_OOS_DIRTY = 73`, derived from estimating against the truncated `git status` excerpt embedded in the activation prompt (the prompt's git-status display cut off at ~85 lines). The live tree at SPEC-author time actually had 110 OOS lines (122 total porcelain − 12 in-scope §1 paths). The §3 #5 success criterion reused the wrong value. The Brief's underlying §5 #4 criterion ("OOS set unchanged") is independently verifiable via byte-comparison of the OOS list, so the SPEC's intent was preserved — but the in-SPEC arithmetic was wrong.
- **Reproduction:**
  ```
  $ git status --porcelain | wc -l        # 122 at SPEC-author time
  $ wc -l /tmp/oos-baseline.txt           # 110 OOS (after subtracting 12 in-scope)
  ```
- **Expected vs Actual:**
  - Expected (per SPEC): `BASE_OOS_DIRTY = 73`
  - Actual: `BASE_OOS_DIRTY = 110`
- **Suggested next action:** TECH_DEBT (against SPEC_TEMPLATE) — add a mandatory "live measurement" instruction to the §0 Baselines pattern.
- **Rationale for action:** The `BASE_*` symbolic baseline pattern (from `MIGRATION_2/FOREMAN_REVIEW.md` Author Proposal #2) is good. The discipline gap is that the template doesn't explicitly mandate "run the command + paste actual output here, do not estimate." A 1-line addition to `SPEC_TEMPLATE.md` §0 Baselines preamble closes the gap. Author-Skill Improvement Proposal in FOREMAN_REVIEW will carry this.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Transient `.tmp-inscope.txt` at repo root caused 1-line OOS deviation

- **Code:** `M1.5-EXECUTOR-HYGIENE-01`
- **Severity:** LOW
- **Discovered during:** Post-commit OOS byte-diff verification (`diff /tmp/oos-baseline.txt /tmp/porcelain-after.txt`)
- **Location:** Working tree root: `.tmp-inscope.txt` (now removed)
- **Description:** Executor created a 12-line pathspec helper file (`.tmp-inscope.txt`) at the repo working-directory root, used it via `git add --pathspec-from-file=.tmp-inscope.txt`, but did not remove it before the post-commit OOS diff. Result: 1 extra `?? .tmp-inscope.txt` line in `git status --porcelain` that diverged from the OOS baseline. Caught immediately by the diff check; removed; re-verified clean. No commit included the helper file.
- **Reproduction:**
  ```
  $ git status --porcelain | grep .tmp-inscope
  ?? .tmp-inscope.txt
  ```
- **Expected vs Actual:**
  - Expected: OOS set byte-identical to baseline post-commit
  - Actual (transiently): OOS set + 1 line for `.tmp-inscope.txt`; corrected after `rm`
- **Suggested next action:** TECH_DEBT (against opticup-executor SKILL.md) — codify "create transients OUTSIDE the working tree" as a Git discipline rule.
- **Rationale for action:** Small ergonomic gap; the right path is `/tmp/inscope.txt` (Linux/macOS) or `$env:TEMP\inscope.txt` (Windows) instead of `.tmp-inscope.txt` at repo root. Already proposed as Executor Skill Improvement Proposal #1 in EXECUTION_REPORT §9. A `.gitignore` entry for `.tmp-*` is a complementary defense.
- **Foreman override (filled by Foreman in review):** { }
