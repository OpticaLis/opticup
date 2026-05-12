# FINDINGS — M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN

> Out-of-SPEC observations recorded during execution.
> One concern per task — these are NOT fixed in this SPEC.
> The Foreman decides for each: new SPEC / TECH_DEBT entry / dismiss.

---

## F1 — Concurrent opticup-executor sessions write to the same working tree (HIGH)

**Severity:** HIGH (project hygiene; not blocking 3b but contaminated commit history)

**Location:** `C:\Users\User\opticup\.claude\worktrees\jovial-lewin-b61073` and `C:\Users\User\opticup\.claude\worktrees\pensive-tesla-4a5ab3` (per `git worktree list`) appear to host two other opticup-executor sessions that ran in parallel with this 3b session.

**Description:** during my 3b execution, commits `e0b1e8f`, `a128065`, `70bad83`, and `94c9c57` (all "direction-3" or "3a retrospective") appeared on `develop` interleaved with my commits. Their `git add` step at "Commit 5" (`94c9c57`) absorbed my untracked direction-2/M13-M15 + my modified MODULE_MAP.md + CHANGELOG.md — i.e. my planned Commit 4 content — into a single concurrent commit titled `chore(spec): close M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE with retrospective (PUSH PENDING)`. The commit's message is wrong relative to its contents (says 3a, contains 3b direction-2 files), which damages future `git bisect` and `git log` archaeology.

Worse: between my Read of MODULE_MAP and my Edit of MODULE_MAP, the concurrent session wrote to the file (linter detected the staleness and made me re-read). The same race happened on CHANGELOG. I had to revert their 3c content from those files before committing my 3b content, because keeping their 3c content would have stolen their work into my (would-be) commit.

**Root cause:** worktrees were created (`.claude/worktrees/*`) but the parallel sessions appear to have written to the MAIN repo's working tree at `C:\Users\User\opticup`, not the worktree subtree. Either (a) the worktree setup is broken, OR (b) those sessions are running directly in the main repo despite the worktree's existence, OR (c) `git worktree` and Claude Code's `EnterWorktree` tool don't fully isolate the file-system view.

**Suggested next action:** new SPEC `EXECUTOR_CONCURRENCY_GUARD`. Adds: (i) `git worktree list` check at executor First Action (Proposal 1 in EXECUTION_REPORT §8), (ii) a `.git/index.lock`-style lockfile under `.claude/` so the second executor session refuses to start if another is active on the same branch, (iii) audit of recent multi-direction SPEC runs to identify any other commits with wrong commit messages from this same root cause.

---

## F2 — Phase 3a's "preserved helper script" was not on disk (MEDIUM)

**Severity:** MEDIUM (documentation drift; affected 3b execution speed)

**Location:** `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` 2026-05-11 Phase 3a entry, line referencing `scripts/transform-mockup-d1.mjs`.

**Description:** The 3a CHANGELOG claims `scripts/transform-mockup-d1.mjs` "is preserved in tree for 3b/3c reuse." I ran `ls scripts/` at the start of this 3b session and the file did NOT exist. I had to write my own `_staticize-tmp.mjs` from scratch (pragmatic, deleted pre-commit, but Direction 2's transformation pipeline is now non-reproducible from a single canonical source). The concurrent 3c session apparently did the same and references its own `scripts/transform-mockup-d3.mjs` in its CHANGELOG entry — also not on disk at the time I checked.

**Suggested next action:** TECH_DEBT entry — "M1.5-DEBT-DESIGN-SYS-HELPERS: 3a/3c CHANGELOG references to `scripts/transform-mockup-d{1,3}.mjs` are stale. Either restore the scripts or strike the references." Could be folded into Phase 4 cleanup.

---

## F3 — Parent SPEC §3 stylesheet chain says 4-deep `../../../../` but Direction 1's INDEX uses 5-deep `../../../../../` (LOW)

**Severity:** LOW (already self-corrected by 3a executor; 3b followed 3a's actual on-disk pattern)

**Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md` §4 "Stylesheet chain per HTML".

**Description:** Parent §4 prescribes `<link rel="stylesheet" href="../../../../shared/css/variables.css">` (4 `../`). From the actual folder depth `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-N/`, the correct relative path is 5 `../` levels. Direction 1's INDEX.html (committed at `676608e`) uses 5-deep, matching reality. Phase 3b followed the 5-deep pattern.

**Suggested next action:** dismiss or one-line patch — update parent §4 to read 5-deep. Phase 4 retrospective could fold this in. Not a code defect.

---

## F4 — Untracked binary `tests/optic*.acc*` files have been in the repo since session start (LOW)

**Severity:** LOW (pre-existing dirt; not introduced by this SPEC)

**Location:** repo root `tests/optic.accdr`, `tests/optic_dt.accdb`, `tests/optic_dt_all.accdb`.

**Description:** These three Access database files appeared as `??` in `git status` at this session's start. They are not in `.gitignore`, are not tracked, and have been ignored across multiple sessions. They are probably test fixtures from the Access migration work but are too large + opaque for git. Carrying them as untracked indefinitely keeps adding noise to every `git status`.

**Suggested next action:** dismiss + add `tests/optic*.acc*` to `.gitignore` in a small chore commit, OR move them to a non-`tests/` location explicitly named for binary fixtures. Foreman decides.

---

*End of FINDINGS.*
