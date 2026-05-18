# Parallel Pipeline Coordination Protocol — Architecture Brief

**Brief version:** v1
**Date:** 2026-05-17
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Module Strategist (`opticup-strategic`) → single SPEC
**Owning module:** Module 1.5 — Shared Components (cross-module infrastructure)

---

## 1. Purpose

Establish a mechanical protocol that prevents Pipeline collisions when two or more Claude Code sessions run concurrently on the same repo.

Today's gap: each Pipeline assumes it is the only one. When two run in parallel (e.g., M1 expansion + Supervisor build, 2026-05-17), git branch switches and merges by one Pipeline can drag the other Pipeline's HEAD onto the wrong branch — silently. Recovery requires manual cherry-pick + user-mediated coordination.

The protocol is **session-claim-based, file-system mediated, no daemon required.** Every Pipeline claims a session lock file before starting; every Pipeline checks for existing locks before acting; collisions trigger explicit wait or escalation instead of silent corruption.

## 2. Today's Incident (2026-05-17)

Sequence reconstructed:

1. M1 Pipeline session opened, working on `release/m1-inventory-2026-05-18` branch.
2. Supervisor Pipeline session opened on `develop`. Foreman + Executor wrote 6 commits (C0..C5, 8f0546f..469346c) cleanly on `develop`.
3. M1 Pipeline opened PR #95 (develop → release) and merged it (`96169d2`), bringing Supervisor's C0..C5 into release branch's history. Unresolved conflicts on 2 M1 files (`lens-inventory-modal-shows.js`, `lens-inventory-partial.html`).
4. Supervisor Pipeline's next commit (C6 — EXECUTION_REPORT + FINDINGS, `615a1dd`) landed on `release` branch instead of `develop` because HEAD followed the branch switch.
5. Supervisor Pipeline detected the branch mismatch (per Bounded Autonomy stop-on-deviation), halted, surfaced to Daniel.
6. Recovery required Daniel to coordinate manually between sessions, then cherry-pick C6 from release to develop.

Cost: ~20 minutes of recovery + 1 escalation + risk of losing work if Daniel had picked the wrong recovery option.

## 3. Scope — In

### 3.1 Session lock files
- Every Pipeline (Executor, Reviewer, Localhost-Tester, Foreman) creates a session lock file at session start:
  ```
  _archive/pipeline-sessions/{ISO_TIMESTAMP}_{SPEC_SLUG}_{PID-OR-RANDOM}.lock
  ```
- Lock file contents (YAML or simple key-value):
  - `spec_slug`: SPEC being worked on
  - `branch_started_on`: branch name at session start
  - `branch_owned`: branch this Pipeline must stay on
  - `files_owned_globs`: list of file globs this Pipeline claims (e.g., `.claude/skills/opticup-supervisor/**`, `modules/Module 1.5/docs/specs/SUPERVISOR_SKILL_PHASE_1/**`)
  - `last_heartbeat`: timestamp updated every 30s by the active Pipeline
  - `pid_or_session_id`: identifier for the session

### 3.2 Pre-action collision check
Before any of: `git checkout`, `git merge`, `git rebase`, `git reset --hard`, `git push`, or any file edit on a path NOT in `files_owned_globs`:
1. Read all `.lock` files in `_archive/pipeline-sessions/`.
2. For each active lock (heartbeat within last 5 minutes):
   - If the target branch matches another lock's `branch_owned` → STOP, escalate.
   - If the target file path matches another lock's `files_owned_globs` → STOP, escalate.
3. If no collision → proceed and update heartbeat.

### 3.3 Branch ownership rule
- Only ONE Pipeline may hold a given branch at a time.
- `develop` is the default working branch; first session claims it.
- Subsequent sessions must declare a different branch in their activation prompt (e.g., `feature/X`, `release/Y`).
- Merging between branches owned by different sessions requires explicit coordination via escalation — never silent.

### 3.4 Heartbeat + stale-lock cleanup
- Active Pipelines update `last_heartbeat` every 30 seconds.
- Locks older than 10 minutes without heartbeat are considered stale and may be deleted by any subsequent session.
- Stale lock deletion is logged to `_archive/pipeline-sessions/stale-cleanup-{ISO_DATE}.log` for audit.

### 3.5 Escalation on collision
When a Pipeline detects a collision:
- It writes `modules/Module N/escalations/{ISO_TS}_pipeline-collision.md` describing what it tried, what lock blocked it, and what options it sees.
- Per the Supervisor protocol (SPEC 1): Supervisor first tries to resolve from DECISIONS_LOG. If the collision is a known pattern (e.g., "wait for other Pipeline to finish merge"), Supervisor returns the resolution.
- Otherwise, escalates to Daniel as today.

## 4. Scope — Out

- No daemon, no background process, no central server. Purely file-system based.
- No automatic resolution of conflicts — every collision halts and escalates.
- No locking of the git index itself (would require git hook complexity beyond scope).
- No retroactive enforcement on currently-running sessions — protocol kicks in for sessions started after SPEC closure.

## 5. Destructive Operations

**None.** All operations are:
- File create (`.lock` files in `_archive/pipeline-sessions/`)
- File read (other sessions' locks)
- File delete (own lock at session end + stale locks per §3.4 with audit log)
- Heartbeat update (single field in own lock file)

Stale-lock deletion is reversible via git history if it was committed; lock files are gitignored per §6.

## 6. Implementation Notes

- `_archive/pipeline-sessions/*.lock` MUST be gitignored. Locks are session-local state, not source-of-truth artifacts.
- Stale-cleanup log files (`stale-cleanup-*.log`) ARE tracked in git for audit history.
- The check is added as a function in each Pipeline skill's "Pre-Action" sequence (executor, reviewer, localhost-tester, foreman, supervisor).
- Implementation can be a single shared script `scripts/pipeline-coordination.mjs` with commands: `claim`, `release`, `check-collision`, `heartbeat`, `cleanup-stale`.

## 7. Success Criteria

1. New script `scripts/pipeline-coordination.mjs` with the 5 commands above + unit tests.
2. New folder `_archive/pipeline-sessions/` with `.gitkeep` + `.gitignore` excluding `*.lock`.
3. Updates to skill files: `opticup-executor`, `opticup-reviewer`, `opticup-localhost-tester`, `opticup-strategic` (Foreman role), `opticup-supervisor` — each adds a "Pre-Action Collision Check" section + bootstrap step that claims a session lock.
4. End-to-end test: simulate 2 concurrent sessions claiming different branches → both proceed; simulate 2 claiming same branch → second halts with escalation.
5. CLAUDE.md §9 Working Rules updated with new section "9.X Parallel Pipeline Coordination" pointing at the protocol.

## 8. Pre-Flight

- Confirm no concurrent Pipeline is running during this SPEC build (this SPEC modifies the very skills that check for collisions — chicken-and-egg risk).
- Read the Supervisor SPEC 1 closure (`modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md`) to understand the escalation flow this protocol plugs into.

## 9. Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Stale lock blocks a legitimate session forever | 10-minute heartbeat timeout + any session can clean up |
| Two sessions racing to claim same branch in the same second | First-write-wins via filesystem atomicity; loser detects winner's lock on its own check + escalates |
| Lock file format drift between Pipelines | Format defined in `core/lock-format.md` (Core layer of Supervisor adapter) — single source of truth |
| Bypass: a session simply doesn't claim a lock | Pre-commit hook checks for an active lock on first commit of session → blocks if no claim found |

## 10. Daniel-locked Decisions

1. **Scope is single SPEC (~1 hour Pipeline run).** No phasing.
2. **Lock files gitignored.** Audit logs (stale cleanup) tracked.
3. **No daemon, no central server.** File-system mediated.
4. **All collisions escalate.** No silent resolution.

---

**End of Brief.**
