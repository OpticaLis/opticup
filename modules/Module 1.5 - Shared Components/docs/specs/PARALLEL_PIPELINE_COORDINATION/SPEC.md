# SPEC — PARALLEL_PIPELINE_COORDINATION

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/PARALLEL_PIPELINE_COORDINATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-17
> **Module:** 1.5 — Shared Components (cross-module infrastructure)
> **Phase:** N/A — single SPEC, no phasing per Brief §10 Daniel-locked Decision #1
> **Author signature:** Pipeline session bootstrap, develop HEAD `3c1485e` at seal

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-17 (`modules/Module 1.5 - Shared Components/architecture-brief/PARALLEL_PIPELINE_COORDINATION_BRIEF.md`, 127 lines, sealed v1).
- Activation prompt read (`PARALLEL_PIPELINE_COORDINATION_ACTIVATION_PROMPT.md`) — confirms single-SPEC scope + chicken-and-egg pre-flight + 5 deliverables.
- Just-closed `SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md` read in full (227 lines) — F-EXTRA-1 explicitly names this SPEC as the remediation for the 2026-05-17 cross-Pipeline branch-state incident.
- Target file paths exist at the claimed locations:
  - 5 skill files (line counts captured as baselines below).
  - `scripts/` exists, `scripts/checks/` exists.
  - `_archive/` exists (verified by `git status` showing `_archive/pr-drafts/`).
  - `_archive/pipeline-sessions/` does NOT exist (to be created).
- `package.json` scripts confirmed: `verify:integrity`, `verify:staged`, `test:integrity-gate`, `test:root-discipline`, `test:destructive-ops-gate`, `smoke`. Pattern for new test scripts established (`test:*` naming).
- Pre-existing untracked files surveyed (`git status --porcelain | grep '^??' | wc -l` = 5):
  - 4 M1 architecture briefs (NOT in this SPEC's scope — left alone).
  - 1 file from this SPEC's own brief folder (`PARALLEL_PIPELINE_COORDINATION_ACTIVATION_PROMPT.md`) — will be `git add` explicitly in close commit alongside the BRIEF.md.
  - 1 modified: `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel state — NOT in scope; leave alone).
  Executor uses explicit-filename `git add` throughout per `opticup-executor` SKILL.md §"Pre-existing untracked / modified files in Full-Auto Pipeline mode".
- **Chicken-and-egg pre-flight (Brief §8 + Activation Prompt):** confirmed no `_archive/pipeline-sessions/` directory exists, meaning no other Pipeline can currently be holding a lock. The SPEC builds the protocol; nothing predates it. **Confirmed safe to proceed.**
- **Runtime semantics rehearsed (per author-skill §5.3, even though no DB):** the file-system primitives are atomic at the filesystem layer. Race scenario: two sessions call `claim` in the same wall-clock second targeting the same branch. Both write distinct lock files (different ISO_TS-with-millisecond + different PID/random suffix), then each runs `check-collision` over the directory listing AFTER its own write. The session whose `check-collision` runs second sees the first session's lock AND its own lock — it picks the OLDER lock's claimant as winner (filesystem `mtime` tiebreaker) and self-deletes its own lock + escalates. Net: first-write-wins by filesystem mtime; loser detects + escalates. No deadlock possible because no session ever waits on another session's lock; collisions ALWAYS escalate (per Brief §4 "no automatic resolution").
- DOM-state rehearsal: N/A (no CSS layout changes).
- Cross-Reference Check completed 2026-05-17 against `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md`, `docs/FILE_STRUCTURE.md`, `modules/*/docs/db-schema.sql`, `modules/*/docs/MODULE_MAP.md`: 0 collisions. The names `pipeline-coordination`, `pipeline-sessions`, `files_owned_globs` appear only in the SPEC's own Brief + Activation Prompt.

### Baselines (referenced by §3 Success Criteria)

| Symbol | File | Metric | Value | How measured | Measured-at HEAD | Seal-commit HEAD |
|---|---|---|---|---|---|---|
| `BASE_LINES_strategic` | `.claude/skills/opticup-strategic/SKILL.md` | `wc -l` | 1370 | `wc -l` | `3c1485e` | `3c1485e` (TBD on seal — re-verified at executor Step 0 per P-EXEC-2) |
| `BASE_LINES_executor` | `.claude/skills/opticup-executor/SKILL.md` | `wc -l` | 1277 | `wc -l` | `3c1485e` | `3c1485e` (TBD on seal) |
| `BASE_LINES_reviewer` | `.claude/skills/opticup-reviewer/SKILL.md` | `wc -l` | 362 | `wc -l` | `3c1485e` | `3c1485e` (TBD on seal) |
| `BASE_LINES_tester` | `.claude/skills/opticup-localhost-tester/SKILL.md` | `wc -l` | 380 | `wc -l` | `3c1485e` | `3c1485e` (TBD on seal) |
| `BASE_LINES_supervisor` | `.claude/skills/opticup-supervisor/SKILL.md` | `wc -l` | 225 | `wc -l` | `3c1485e` | `3c1485e` (TBD on seal) |
| `BASE_LINES_claude_md` | `CLAUDE.md` | `wc -l` | 311 | `wc -l` | `3c1485e` | `3c1485e` (TBD on seal) |

**Baselines binding rule (per author-skill P-AUTHOR-2):** if HEAD advances between SPEC seal and Executor start, the Executor MUST re-measure every `BASE_*` row at execution Step 0 and update this table. Actual values matter, not nominal.

---

## 1. Goal

Ship a file-system-mediated session-lock protocol that prevents Pipeline collisions when two or more Claude Code sessions run concurrently against the same on-disk repo, so the 2026-05-17 cross-Pipeline branch-state incident (logged as `SUPERVISOR_SKILL_PHASE_1` F-EXTRA-1) cannot recur silently. The protocol is operational at SPEC closure; future Pipelines pick it up via the bootstrap step added to all 5 skill files.

---

## 2. Background & Motivation

On 2026-05-17, two Claude Code sessions ran in parallel:
- M1 Pipeline on `release/m1-inventory-2026-05-18`
- Supervisor Pipeline on `develop`

The M1 Pipeline opened PR #95 (develop → release) and merged it. The merge switched the shared on-disk working tree to the release branch. The Supervisor Pipeline's next commit (C6 — EXECUTION_REPORT + FINDINGS) followed HEAD onto release. The Supervisor Pipeline's Executor correctly detected the branch mismatch per Bounded Autonomy, halted, and escalated to Daniel. Recovery required ~20 min of manual cherry-pick coordination.

Cause: no protocol existed for two Pipelines to declare which branch they "own" and detect that another session is about to switch branches. Both sessions assumed they were alone. This SPEC delivers the protocol that closes the gap — session-claim-based, no daemon, no central server, every collision halts + escalates.

Brief authored same day, sealed v1 (127 lines, 4 Daniel-locked decisions in §10). This SPEC translates the Brief into measurable success criteria.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, scope-clean (untracked files from §0 still untracked; only files this SPEC touched are committed) | `git status --short` → only known untracked-from-§0 lines remain after close |
| 2 | New script exists | `scripts/pipeline-coordination.mjs` present, exports/implements 5 commands | `node scripts/pipeline-coordination.mjs --help` exits 0 and lists `claim`, `release`, `check-collision`, `heartbeat`, `cleanup-stale` |
| 3 | Script line budget | `scripts/pipeline-coordination.mjs` ≤ 350 lines (Iron Rule 12) | `wc -l scripts/pipeline-coordination.mjs` → ≤ 350 |
| 4 | New test exists | `scripts/test-pipeline-coordination.mjs` present, 5+ unit tests + 1 E2E test, exit 0 on clean run | `node scripts/test-pipeline-coordination.mjs` → exit 0, prints "PASS" lines |
| 5 | npm script wired | `npm run test:pipeline-coordination` invokes the test | `npm run test:pipeline-coordination` → exit 0 |
| 6 | New folder + .gitkeep + .gitignore | `_archive/pipeline-sessions/` contains `.gitkeep` AND `.gitignore` (the latter excludes `*.lock`, includes `stale-cleanup-*.log` + `.gitkeep`) | `ls _archive/pipeline-sessions/.gitkeep _archive/pipeline-sessions/.gitignore` → exit 0; `cat _archive/pipeline-sessions/.gitignore` contains `*.lock` and `!stale-cleanup-*.log` and `!.gitkeep` |
| 7 | Lock files are gitignored | Creating a temp `_archive/pipeline-sessions/test.lock` does NOT appear in `git status` | `touch _archive/pipeline-sessions/__test.lock && git status --porcelain _archive/pipeline-sessions/ | grep -c __test.lock` → 0; cleanup after test |
| 8 | E2E concurrent-different-branch test passes | 2 simulated sessions on different branches both proceed | The E2E inside `test-pipeline-coordination.mjs` named `E2E-1: concurrent different-branch sessions both proceed` → PASS |
| 9 | E2E concurrent-same-branch test passes | 2 simulated sessions on same branch: first claims, second halts + writes escalation | The E2E inside `test-pipeline-coordination.mjs` named `E2E-2: concurrent same-branch sessions: second halts + escalates` → PASS |
| 10 | Skill file: opticup-executor updated | New `### Pre-Action Collision Check` sub-section inside `## First Action` AND new bootstrap step claiming session lock; references the new script | `grep -c "Pre-Action Collision Check" .claude/skills/opticup-executor/SKILL.md` → 1; `grep -c "pipeline-coordination" .claude/skills/opticup-executor/SKILL.md` → ≥ 2 |
| 11 | Skill file: opticup-reviewer updated | Same shape as #10 | `grep -c "Pre-Action Collision Check" .claude/skills/opticup-reviewer/SKILL.md` → 1; `grep -c "pipeline-coordination" .claude/skills/opticup-reviewer/SKILL.md` → ≥ 2 |
| 12 | Skill file: opticup-localhost-tester updated | Same shape as #10 | `grep -c "Pre-Action Collision Check" .claude/skills/opticup-localhost-tester/SKILL.md` → 1; `grep -c "pipeline-coordination" .claude/skills/opticup-localhost-tester/SKILL.md` → ≥ 2 |
| 13 | Skill file: opticup-strategic updated (Foreman hat) | Same shape as #10 | `grep -c "Pre-Action Collision Check" .claude/skills/opticup-strategic/SKILL.md` → 1; `grep -c "pipeline-coordination" .claude/skills/opticup-strategic/SKILL.md` → ≥ 2 |
| 14 | Skill file: opticup-supervisor updated | Same shape as #10 | `grep -c "Pre-Action Collision Check" .claude/skills/opticup-supervisor/SKILL.md` → 1; `grep -c "pipeline-coordination" .claude/skills/opticup-supervisor/SKILL.md` → ≥ 2 |
| 15 | CLAUDE.md §9 sub-section added | New `### 9.X Parallel Pipeline Coordination` sub-section (one paragraph) pointing at the script + folder | `grep -c "Parallel Pipeline Coordination" CLAUDE.md` → ≥ 1; `grep -c "scripts/pipeline-coordination.mjs" CLAUDE.md` → ≥ 1 |
| 16 | CLAUDE.md line budget | CLAUDE.md ≤ 400 lines (project-wide cap stated at CLAUDE.md §"This file is a MAP, not a manual") | `wc -l CLAUDE.md` → ≤ 400 |
| 17 | Integrity Gate (Iron Rule 31) | Exit 0 or 2; no exit 1 (null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 18 | Iron Rule 32 declaration honored | All commits land cleanly; pre-commit hook exits 0 (declared `None.` in §4) | `git log --oneline origin/develop..HEAD` shows clean commits with no `--no-verify` |
| 19 | Smoke 7/7 (mandatory baseline) | Localhost-Tester reports 7/7 PASS on demo tenant | `npm run smoke` → exit 0, 7/7 PASS line present |
| 20 | No commits to `main` | HEAD never on `main` during this SPEC | `git reflog --pretty=oneline | head -50 | grep -c " main"` → 0 |
| 21 | All commits pushed to `origin/develop` | After close, `git log origin/develop..HEAD` is empty | `git log origin/develop..HEAD --oneline | wc -l` → 0 |
| 22 | EXECUTION_REPORT.md present | File written in SPEC folder | `ls "modules/Module 1.5 - Shared Components/docs/specs/PARALLEL_PIPELINE_COORDINATION/EXECUTION_REPORT.md"` → exit 0 |
| 23 | FINDINGS.md present | File written (even if "no findings, file omitted" — write the omission line) | Either `ls .../FINDINGS.md` → exit 0 OR EXECUTION_REPORT.md §"Findings" explicitly states "no findings" |

---

## 4. Destructive Operations

**None.**

Per Brief §5, all operations in this SPEC are:
- File create (`.lock` files in `_archive/pipeline-sessions/` at runtime, new script + tests + skill edits at SPEC time)
- File read (other sessions' locks, skill files, CLAUDE.md)
- File edit (skill files, CLAUDE.md — append-only sub-section additions, no removal of existing content)
- Heartbeat update (single-field update inside own lock file — runtime behavior, not SPEC commit content)

**Stale `.lock` file deletion** is a runtime behavior of the `cleanup-stale` command, NOT a SPEC-time destructive op:
- Lock files are gitignored per success criterion #7 — they have NO git history.
- Deletion happens on a session-local artifact that is not source-of-truth.
- Audit log entries (`stale-cleanup-{ISO_DATE}.log`) ARE tracked + append-only.
- This does not qualify as a destructive op under Iron Rule 32 (which targets git-tracked deletions, mass renames, force-pushes, SQL DROP/TRUNCATE, governance-doc removals, and `main`-branch modifications).

If the Executor encounters a need for ANY destructive op mid-run (file delete of a tracked file, mass rename ≥ 5 files, `git rebase`, `git reset --hard`, `git push --force`, SQL DROP/TRUNCATE, edit that removes content from CLAUDE.md/SKILL.md instead of appending) → STOP, write `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_destructive_op_in_undeclared_spec.md`, emit one Hebrew line to Daniel, halt the pipeline. Do NOT silently amend this §4 mid-run.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Chicken-and-egg violation:** if at Executor Step 0 the directory `_archive/pipeline-sessions/` exists AND contains any `*.lock` file with a heartbeat newer than 5 minutes → STOP. Another Pipeline is already running. Per Brief §8 chicken-and-egg rule, this SPEC cannot proceed because it modifies the very skills the other Pipeline would be checking against.
- **Lock file accidentally committed:** if at any point during execution `git status` shows a `.lock` file as tracked or about-to-be-added → STOP. Success criterion #7 is non-negotiable; the .gitignore must hide all `.lock` files.
- **Skill file edit grows line count > 50:** if any single skill-file edit adds more than 50 lines, STOP and reassess. Per Brief §3.2 + Activation Prompt deliverable #3, each skill gets ONE "Pre-Action Collision Check" sub-section + ONE bootstrap-step reference — concise, not a re-implementation of the protocol inside each skill.
- **CLAUDE.md addition > 25 lines:** the new §9.X is ONE paragraph per Activation Prompt deliverable #5. CLAUDE.md is a map, not a manual (per its own §0 header).
- **Test attempts to detect deadlock:** no deadlock test should be needed because the protocol has no waiting primitive — every collision escalates. If the Executor writes a "wait for lock" test, that's a deviation from Brief §4 ("no automatic resolution of conflicts"); STOP and report.
- **Pre-existing `.lock` extension collision in `.gitignore`:** if the global `.gitignore` already ignores `*.lock` project-wide (verify with `grep -E "^\*?\.lock|^\\\*\.lock$" .gitignore`), the path-level `.gitignore` in `_archive/pipeline-sessions/` would be redundant. **NOT a stop trigger** — still create it for path-locality + clarity. But if the global `.gitignore` has an `!*.lock` un-ignore that would cause leaks → STOP.

---

## 6. Rollback Plan

If the SPEC fails partway and must be reverted:

```
# 1. Reset develop to pre-SPEC HEAD (captured at Executor Step 0 in EXECUTION_REPORT.md §1):
git reset --hard <PRE_SPEC_HEAD>
git push --force-with-lease origin develop   # ONLY with Daniel's explicit chat-line OK

# 2. Restore skill files (Edit tool re-runs would suffice, but reset --hard is cleaner)

# 3. Remove the partially-created folder if reset --hard didn't catch it:
rm -rf _archive/pipeline-sessions/
```

Rollback is only invoked on a 🔴 Reviewer or Tester verdict combined with Daniel's explicit "roll back" directive. Otherwise the standard remediation path applies (Executor fixes the deviation, Reviewer re-audits, Tester re-runs). The SPEC is marked REOPEN, not CLOSED, on rollback.

**Note:** the rollback's `git reset --hard` + `git push --force-with-lease` are themselves destructive ops per Iron Rule 32. They are NOT in this SPEC's §4 declaration because they are conditional + Daniel-gated — they only run if Daniel directs rollback during execution, at which point the protocol shifts to an out-of-spec emergency mode requiring fresh authorization.

---

## 7. Out of Scope (explicit)

The following look adjacent but MUST NOT be touched in this SPEC:

- **Pre-commit hook integration** ("a session's first commit MUST have an active lock" per Brief §9 Risks table row 4 mitigation). Brief §3.x does not include this as a success criterion; it's a Risks-table mitigation idea. Leave it as a future SPEC (`PARALLEL_PIPELINE_COORDINATION_PRE_COMMIT_GATE`) — log as a finding if the Executor notices it would have caught a real scenario.
- **Retrofitting locks onto sessions started BEFORE this SPEC closes.** Per Brief §4, the protocol kicks in for sessions started AFTER closure.
- **Daemon, background process, or central coordination server.** Brief §4 explicit out-of-scope.
- **Automatic conflict resolution.** Brief §4 explicit out-of-scope.
- **Git index locking.** Brief §4 explicit out-of-scope (requires git hook complexity).
- **The original 2026-05-17 release branch.** The `release/m1-inventory-2026-05-18` branch is M1's; this SPEC does NOT touch it. Recovery from that incident already happened (per FOREMAN_REVIEW §10 F-EXTRA-1 — cherry-pick to develop completed).
- **`docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql`.** This SPEC adds no functions, contracts, tables, or DB objects — Integration Ceremony updates are N/A.
- **Module-specific files (Module 1, Module 3, etc.).** This is cross-module infrastructure landed under Module 1.5 — no module-internal code changes.
- **`tests/smoke/baseline.test.mjs`.** No new baseline test added; the new test lives at `scripts/test-pipeline-coordination.mjs` per established `test-*` naming pattern (sibling: `test-integrity-gate.mjs`, `test-root-discipline.mjs`, `test-destructive-ops-gate.mjs`).

---

## 8. Expected Final State

After the Executor finishes, the repo should contain:

### New files
- `scripts/pipeline-coordination.mjs` (≤ 350 lines) — the protocol script with 5 sub-commands: `claim`, `release`, `check-collision`, `heartbeat`, `cleanup-stale`. Plus a `--help` flag listing the commands.
- `scripts/test-pipeline-coordination.mjs` (≤ 350 lines) — regression tests including 2 E2E scenarios. Follows the `test-root-discipline.mjs` / `test-destructive-ops-gate.mjs` pattern (try/finally cleanup, no `git stash`).
- `_archive/pipeline-sessions/.gitkeep` — empty file, makes the directory committable.
- `_archive/pipeline-sessions/.gitignore` — path-level ignore. Excludes `*.lock`, un-ignores `.gitkeep` and `stale-cleanup-*.log`.

### Modified files
- `package.json` — adds one new script: `"test:pipeline-coordination": "node scripts/test-pipeline-coordination.mjs"`. No other changes.
- `.claude/skills/opticup-executor/SKILL.md` — adds new `### Pre-Action Collision Check` sub-section inside `## First Action` (insertion after the existing step 4a Integrity Gate, before step 5) AND a one-line cross-reference to the script in `## Code Patterns` or end of file. **Append-only — no removals.** Estimated +30 to +50 lines.
- `.claude/skills/opticup-reviewer/SKILL.md` — same shape. Insertion inside `## First Action — Before Reviewing` after step 5 (which says "Read each changed file") OR as a new step 6. **Append-only.** Estimated +20 to +40 lines.
- `.claude/skills/opticup-localhost-tester/SKILL.md` — same shape. Insertion inside `## First Action — Every Test Session` after step 2. **Append-only.** Estimated +20 to +40 lines.
- `.claude/skills/opticup-strategic/SKILL.md` — same shape. Insertion inside `## First Action — Every Session` after step 4a Integrity Gate check. **Append-only.** Estimated +20 to +40 lines.
- `.claude/skills/opticup-supervisor/SKILL.md` — same shape. Insertion inside `## First Action — Every Session` after step 5 (the "Confirm readiness" line). **Append-only.** Estimated +20 to +40 lines.
- `CLAUDE.md` — adds a new `### 9.X Parallel Pipeline Coordination` sub-section inside `## 9. Working Rules — AI Sessions`. One paragraph + 3-line bulleted reference (script path + folder path + lock format pointer). Estimated +15 to +25 lines. Total CLAUDE.md must stay ≤ 400.

### Deleted files
None.

### DB state
No changes — this SPEC has no SQL.

### Docs updated (closure commit by Foreman)
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — one new entry summarizing PARALLEL_PIPELINE_COORDINATION close.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — phase section with commit hashes.
- `MASTER_ROADMAP.md` — one-line entry under Module 1.5 / cross-module infrastructure.
- `OPEN_TASKS.md` — close `M1_5_CONCURRENT_PIPELINE_GIT_STATE_PROTOCOL` stub (this SPEC is the realization).
- `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql` — N/A (no functions, no DB).
- `docs/FILE_STRUCTURE.md` — adds the 4 new files (2 scripts, .gitkeep, .gitignore).

---

## 9. Commit Plan

Estimated 5–7 commits, one per logical unit. The Executor may bundle commits 1+2 if they're truly atomic (script + tests together is fine).

- **Commit 1** (Executor): `feat(infra): add pipeline-coordination script + tests` — files: `scripts/pipeline-coordination.mjs`, `scripts/test-pipeline-coordination.mjs`, `package.json` (new test script entry).
- **Commit 2** (Executor): `chore(infra): add _archive/pipeline-sessions folder with .gitkeep + .gitignore` — files: `_archive/pipeline-sessions/.gitkeep`, `_archive/pipeline-sessions/.gitignore`.
- **Commit 3** (Executor): `docs(skills): wire Pre-Action Collision Check into 5 Pipeline skills` — files: all 5 SKILL.md. Single commit for the 5 — append-only inserts of the same conceptual sub-section.
- **Commit 4** (Executor): `docs(claude.md): add §9.X Parallel Pipeline Coordination` — file: `CLAUDE.md`.
- **Commit 5** (Executor): `docs(file-structure): register 4 new pipeline-coordination files` — file: `docs/FILE_STRUCTURE.md`.
- **Commit 6** (Executor): `chore(spec): close PARALLEL_PIPELINE_COORDINATION with retrospective` — files: `EXECUTION_REPORT.md`, `FINDINGS.md`, and the BRIEF + ACTIVATION_PROMPT (committed alongside as evidence — they were untracked at SPEC start per §0).
- **Commit 7** (Reviewer): `docs(spec): review PARALLEL_PIPELINE_COORDINATION` — `REVIEW.md`.
- **Commit 8** (Localhost-Tester): `chore(spec): PARALLEL_PIPELINE_COORDINATION smoke + E2E test report` — `TEST_REPORT.md`.
- **Commit 9** (Foreman close): `chore(spec): SUPERVISOR_SKILL_PHASE_1 follow-up — PARALLEL_PIPELINE_COORDINATION closed` — `FOREMAN_REVIEW.md`, SESSION_CONTEXT.md, CHANGELOG.md, MASTER_ROADMAP.md, OPEN_TASKS.md updates.

Commit hygiene: explicit `git add <file>` per commit. Never `git add -A`. Never `--amend`. Never `--no-verify`.

---

## 10. Dependencies / Preconditions

- `SUPERVISOR_SKILL_PHASE_1` must be closed (it is: closed 2026-05-17 evening, HEAD `3c1485e`).
- Node.js + npm available (verify via `node --version` in Executor Step 0).
- The 5 skill files exist at the paths listed in §0 Baselines (verified).
- No other Pipeline is currently running (chicken-and-egg pre-flight per Brief §8 + §0 above).
- `husky` pre-commit hooks active and not bypassed (Iron Rule 31 + 32 enforcement).

---

## 11. Lessons Already Incorporated

From `SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md`:
- **P-AUTHOR-1 (placeholders-first for Core/Adapter SPECs)** → N/A — this SPEC does not introduce a Core/Adapter portable skill. The `pipeline-coordination.mjs` script is single-implementation, project-scoped.
- **P-AUTHOR-2 (baselines must be re-measured at seal commit AND signed by hash)** → APPLIED in §0 Baselines table — added `Measured-at HEAD` and `Seal-commit HEAD` columns; both initially `3c1485e`; Executor re-verifies at Step 0 per the binding rule.
- **P-EXEC-1 (placeholders-first when writing portable Core/Adapter content)** → N/A — no Core/Adapter content.
- **P-EXEC-2 (stale-baseline sanity check at execution start)** → APPLIED indirectly: §0 binding rule explicitly tasks the Executor with re-measurement before applying the first edit. Also enforced by the Executor's own Step 1.5 sub-step 0.

From `STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/FOREMAN_REVIEW.md` (most recent SQL-heavy SPEC):
- All 4 proposals are SQL/Pattern-A specific (RLS, base-table probes, advisor JSON). NOT APPLICABLE — this SPEC has 0 SQL.

From `PENDING_ENTRIES_AUTO_RESOLUTION/FOREMAN_REVIEW.md`:
- Layer 1 sweep at executor Step 4.5 (Pending Entries Sweep) — Executor MUST run it per its own SKILL.md, even though this SPEC introduces no new pending entries.

From `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Executor Proposal #2 (codified in `opticup-executor` SKILL.md "Pre-existing untracked / modified files in Full-Auto Pipeline mode"):
- APPLIED — §0 documented the 5 pre-existing untracked files; Executor uses explicit-filename `git add` throughout.

From `SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md` §10 F-EXTRA-1 (the very incident this SPEC remediates):
- The cross-Pipeline orthogonality envelope concept (declared in that SPEC's §11) is now superseded by this SPEC's actual protocol. The envelope was a documentation safeguard; this SPEC is the mechanical safeguard.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `npm run test:pipeline-coordination` exits 0.
- [ ] `npm run smoke` exits 0 (7/7 PASS — Localhost-Tester confirms).
- [ ] All 5 skill files contain `### Pre-Action Collision Check` exactly once.
- [ ] CLAUDE.md contains `### 9.X Parallel Pipeline Coordination` and stays ≤ 400 lines.
- [ ] Lock files are confirmed gitignored (criterion #7 verified).
- [ ] `git status --short` is scope-clean (only pre-existing untracked files remain).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md (or omission note) written in SPEC folder.
- [ ] No commit went to `main` (criterion #20).
- [ ] No `--no-verify` used.

---

## 13. Pipeline Mode

This SPEC runs end-to-end under **Pipeline mode: full-auto** per the activation prompt. Full chain:

```
opticup-strategic (Foreman, SPEC seal — this file)
        ↓
opticup-executor (implement + EXECUTION_REPORT + FINDINGS)
        ↓
opticup-reviewer (REVIEW.md)
        ↓
opticup-localhost-tester (smoke 7/7 + E2E from criterion #8 + #9 + TEST_REPORT.md)
        ↓
opticup-strategic (Foreman close, FOREMAN_REVIEW.md, master-doc updates)
```

Supervisor (Shadow Mode) processes any escalations side-by-side with Daniel per CLAUDE.md §11. Shadow log row to `_archive/supervisor-log/shadow-2026-05-17.md` if any escalation fires.

Daniel sees one Hebrew status line per phase + one final close summary. No verbose progress — everything else lives in commits and on disk.

---

## 14. Out-of-band Notes for the Executor

- The script's `claim` command should generate a lock file with this exact YAML shape (per Brief §3.1):
  ```yaml
  spec_slug: <string>
  branch_started_on: <git-branch-name-at-claim>
  branch_owned: <branch-this-session-must-stay-on>
  files_owned_globs:
    - <glob1>
    - <glob2>
  last_heartbeat: <ISO_TS>
  pid_or_session_id: <string>
  ```
- The script should NOT depend on any npm package not already in `package.json` (per executor SKILL.md tooling pre-flight). Use Node built-ins: `fs`, `path`, `crypto`, `process`, `child_process` (for `git branch --show-current`).
- The 5-minute heartbeat threshold (active vs stale) and 10-minute stale-cleanup threshold are per Brief §3.2 + §3.4 — hardcode these as constants near the top of the script with comments referencing the Brief sections.
- The `cleanup-stale` audit log entry format should be a single line per deleted lock: `<ISO_TS> deleted-by=<deleter-session-id> stale-lock=<filename> last-heartbeat=<ISO_TS> reason=heartbeat-stale`.
- The 2 E2E tests in `test-pipeline-coordination.mjs` simulate concurrent sessions by creating two lock files synchronously (the second one immediately after the first) and calling `check-collision` from the perspective of each. They do NOT spawn real concurrent processes — that's flakier than necessary and not required by Brief §7.
- All 5 skill files get the SAME sub-section heading `### Pre-Action Collision Check` for easy grepping (criterion #10–14). The body MAY differ slightly per skill (each skill has different `files_owned_globs` expectations), but the heading + the script reference + the bootstrap-step language are identical. Consider using a Shared Edit Block — see §3a hint below if applicable.

---

## 3a. Shared Edit Block — Pre-Action Collision Check (multi-skill identical edit)

**Sameness contract:** the section heading + the script invocation + the bootstrap-step phrasing must be byte-identical across all 5 skill files. The per-skill differing parts (`files_owned_globs` examples, `branch_owned` defaults) live OUTSIDE this shared block as separate per-skill paragraphs.

### Block S1 — Pre-Action Collision Check sub-section (identical across all 5 skill files)

- **Insertion location:** as a new sub-section inside the existing `## First Action — *` section. Place it as the last sub-step of First Action (right before the final "Confirm readiness" / "Ready" line).
- **Content** (verbatim — Reviewer diffs this against each commit):

  ```markdown
  ### Pre-Action Collision Check (added 2026-05-17 by PARALLEL_PIPELINE_COORDINATION)

  Before any `git checkout`, `git merge`, `git rebase`, `git reset --hard`, `git push`, or any file edit on a path outside this session's declared `files_owned_globs`, run:

  ```
  node scripts/pipeline-coordination.mjs check-collision \
      --branch-owned <BRANCH> \
      --files-owned-globs <GLOB1>,<GLOB2>,...
  ```

  Exit 0 = no collision, proceed. Exit 1 = collision detected; the script prints the colliding lock's `spec_slug` + `pid_or_session_id`. STOP, write `modules/Module N/escalations/{ISO_TS}_pipeline-collision.md`, run Supervisor Triage (Shadow Mode per CLAUDE.md §11), then emit the standard Hebrew escalation line.

  **Bootstrap step (claim a lock at session start):** as the first action in this session (after repo + branch verification, before any file edit), run:

  ```
  node scripts/pipeline-coordination.mjs claim \
      --spec-slug <SPEC_SLUG> \
      --branch-owned <BRANCH> \
      --files-owned-globs <GLOB1>,<GLOB2>,...
  ```

  Exit 0 = lock claimed; the script prints the lock filename. Exit 1 = another session already holds the requested branch or a conflicting glob — STOP per the collision protocol above.

  **Heartbeat:** the protocol uses a passive heartbeat — every `claim`, `check-collision`, or `heartbeat` invocation updates the session's `last_heartbeat`. A long-idle session does NOT need a background process; the next pre-action call refreshes the timestamp. Locks older than 10 minutes without heartbeat are stale and may be cleaned via `node scripts/pipeline-coordination.mjs cleanup-stale` (audit log written).

  **Release at session end:** `node scripts/pipeline-coordination.mjs release --spec-slug <SPEC_SLUG>` deletes this session's lock cleanly. Skipping release is non-fatal (the lock will be cleaned as stale after 10 min) but every Pipeline skill's hand-off step SHOULD call release to keep the directory tidy.
  ```

- **Files this block applies to:**
  - `.claude/skills/opticup-executor/SKILL.md`
  - `.claude/skills/opticup-reviewer/SKILL.md`
  - `.claude/skills/opticup-localhost-tester/SKILL.md`
  - `.claude/skills/opticup-strategic/SKILL.md`
  - `.claude/skills/opticup-supervisor/SKILL.md`

After the shared Block S1 is inserted, each skill MAY add a one-paragraph "Per-skill globs" line that names that skill's typical `files_owned_globs` examples (e.g., the Executor's example might be `js/**,modules/Module N/**`; the Foreman's might be `modules/Module N/docs/specs/{SLUG}/**,CLAUDE.md`). This per-skill paragraph is NOT in Block S1 — it's an optional 1–3 line addition immediately following.

---

*End of SPEC.md.*
*Pipeline mode: full-auto. Begin Executor.*
