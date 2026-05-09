# FINDINGS — MODULES_HOME_UNIFICATION_SPEC

> **SPEC location:** `_archive/spec-history/MODULES_HOME_UNIFICATION/MODULES_HOME_UNIFICATION_SPEC.md`
> **Logged by:** opticup-executor
> **Logged on:** 2026-05-09
> **Convention:** one section per finding, with severity, location, description, recommendation, and suggested follow-up SPEC name.

---

## F1 — `git mv <directory>` doesn't atomically stage deletions on Windows + Git Bash

- **Severity:** MEDIUM
- **Location:** Tooling behavior, observed during SPEC Commit 4 (`f49b10f` + `693622a`).
- **Description:** When `git mv "__LAUNCH_PLAN_DRAFT__/campaign-overseer" "roles/campaign-overseer"` was run, git correctly created the new dir on disk and moved the files, AND staged the destination files as `new file:` entries. However, it did NOT stage the corresponding source-file deletions. Git status after the operation showed: 10 staged adds (A) + 9 unstaged deletions ( D). The first commit (`f49b10f`) landed only the additions. A second commit (`693622a`) was required with `git add -u` to stage the deletions.
- **Why this matters:** Splits a single logical move into two commits, makes revert harder (need to revert both), inflates the commit ledger, and can confuse a reviewer who reads only the first commit ("why is the same file in both old and new locations?"). Per-file `git mv` (in a loop) does NOT exhibit this behavior — it stages adds AND deletions atomically.
- **Recommendation:** Default to per-file `git mv` for directory contents in all future structural SPECs. Document the policy in `opticup-executor` SKILL.md §"Git discipline" (see EXECUTION_REPORT §8 P1). Investigate root cause (Git version? Git Bash quirk? cygwin path translation?) at leisure — not blocking.
- **Suggested follow-up SPEC:** None required for the SPEC pattern (just SKILL update). Optionally `INFRA_GIT_MV_INVESTIGATION` if Daniel wants the root cause documented.

## F2 — SPEC author-anticipation gap: missing regex patterns for "no folder" file references in Briefs

- **Severity:** LOW
- **Location:** SPEC §7 Commit 6 — listed only 6 "likely files to update" with no mention of how Brief files internally reference their own siblings.
- **Description:** The 8 module Briefs (M5–M15) reference their associated mockup HTML files using the path style `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5_CUSTOMER_CARD_MOCKUP.html` — i.e., the file directly under `architecture-briefs/`, NOT under `architecture-briefs/M5 - Customers/`. This is technically a path bug in the original Briefs (the mockup files were always in `M5 - Customers/`) but it's the actual reference style. The SPEC's 27 path-substitution patterns all assumed the longer "with folder" form, so the original sweep missed these. Required adding 9 regex patterns (one per module, capturing `(M${num}_[A-Za-z0-9_./-]+)`) to a one-shot helper script.
- **Why this matters:** Pre-flight in this SPEC caught it (Pattern P28: "executor pre-flight beats author intent" — referenced in the SPEC's §6 itself, which is good). The next structural-rename SPEC should harvest this lesson: pre-flight should grep for the actual `OLD_PATH` reference patterns in the codebase, not assume the SPEC author enumerated them all.
- **Recommendation:** Add a sub-check in the executor's Step 1 (Load and validate the SPEC): "If the SPEC includes a 'sweep references' commit, count the actual reference patterns in pre-flight (`grep -rn '<OLD_PATH>' . | sort -u | head -200`) and verify the SPEC's substitution list covers the patterns observed."
- **Suggested follow-up SPEC:** None — apply the lesson via SKILL update (EXECUTION_REPORT §8 P2 is related but covers a different angle).

## F3 — Closed-SPEC narrative references to retired paths need a defined policy

- **Severity:** LOW
- **Location:** 9 closed M4 CRM SPECs containing narrative references like "scattered across `__LAUNCH_PLAN_DRAFT__/`", "the entire `__LAUNCH_PLAN_DRAFT__/` tree was untracked WIP", etc.
- **Description:** When a SPEC structurally renames or retires a directory, references to that directory inside CLOSED historical SPECs are awkward to handle: blind path-replacement breaks grammar (the new location is multiple destinations); leaving them as-is fails the "clean grep" success criterion. This SPEC resolved the tension via Daniel's mid-flight rule (rewrite the literal name to `[retired-YYYY-MM-DD:NAME]` marker; preserves narrative readability while breaking the grep target). The pattern worked but required real-time judgment.
- **Recommendation:** Codify the pattern as a project-wide policy. Two options:
  - **(a) Document the marker-rewrite policy in CLAUDE.md** — "When a structural SPEC retires a directory, narrative references in closed historical SPECs are rewritten as `[retired-YYYY-MM-DD:NAME]`. Direct path references are rewritten to the new path."
  - **(b) Add to `opticup-executor` SKILL** — same policy, scoped to executor decision-making.
- **Why this matters:** The next structural SPEC (likely some future schema/dir reorganization) will hit the same tension. Pre-defined policy = no mid-flight judgment call = faster execution.
- **Suggested follow-up SPEC:** `STRUCTURAL_SPEC_REFERENCE_POLICY` — small documentation SPEC that picks (a) or (b) and writes 5–10 lines into the chosen file.

## F4 — `watcher-deploy/daemon/opticupsyncwatcher.wrapper.log` no longer modified mid-session

- **Severity:** INFO (positive change)
- **Location:** `watcher-deploy/daemon/opticupsyncwatcher.wrapper.log`
- **Description:** This file was modified between sessions in the previous SPEC (PROJECT_STRUCTURE_CLEANUP) and was a known agreed-leave-alone item. In this SPEC, after Commits 1–7, the watcher service appears to have either rotated the log or the modifications matched HEAD. Final `git status --short` at end of Commit 8 showed only `tests/optic*.accdb` ?? entries — no `M watcher-deploy/...` line. This is a cleaner exit state than the previous SPEC.
- **Why this matters:** The watcher's log churn was a low-grade nuisance (forced "leave alone" decisions in every prior session). If the rotation persists, the nuisance is gone. If it returns next session, F3 from PROJECT_STRUCTURE_CLEANUP_SPEC's FINDINGS.md (the `.gitignore` add for `*.wrapper.log`) is still the canonical fix.
- **Recommendation:** No action needed in this SPEC. Carry the F3-from-prev-SPEC follow-up (`GITIGNORE_CLEANUP`) as planned.
- **Suggested follow-up SPEC:** Same as previous SPEC's F3 — `GITIGNORE_CLEANUP_2026-05-XX`. Bundle with `.gitignore` line 34 duplicate `.claude/` cleanup also from previous SPEC.

---

## Summary table

| ID | Severity | Topic | Suggested follow-up |
|---|---|---|---|
| F1 | MEDIUM | `git mv <dir>` quirk on Windows + Git Bash | SKILL update (EXECUTION_REPORT §8 P1) — no SPEC needed |
| F2 | LOW | Author-anticipation gap on "no folder" Brief refs | SKILL update (EXECUTION_REPORT §8 P2) |
| F3 | LOW | Closed-SPEC narrative refs need defined policy | `STRUCTURAL_SPEC_REFERENCE_POLICY` (5-line doc SPEC) |
| F4 | INFO | Watcher log churn appears resolved (positive) | Carry from prev SPEC: `GITIGNORE_CLEANUP` |

*FINDINGS complete.*
