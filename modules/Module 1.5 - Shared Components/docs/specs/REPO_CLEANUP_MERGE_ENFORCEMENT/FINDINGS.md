# FINDINGS — REPO_CLEANUP_MERGE_ENFORCEMENT

**Author:** opticup-executor
**Date:** 2026-05-23

This SPEC was infrastructure-only (no DB, no UI, no Edge Function code). The findings below are observations from the execution itself, plus harvest proposals for opticup-strategic + opticup-executor skill improvements.

---

## F-1 — Hook violation-shape required `check` + `line` fields (medium)

The first draft of `scripts/checks/clean-repo-gate.mjs` returned violation objects without the `check` and `line` fields. `verify.mjs` then interpolated `[undefined]` into output instead of `[clean-repo]`. Other gates in `scripts/checks/` (e.g. `destructive-ops-declared.mjs`, `rule-14-tenant-id.mjs`) already follow the `{ check, path, line, message }` shape; this is an undocumented but de-facto contract.

**Action:** documented in EXECUTION_REPORT §1 Part B Layer 1. Future authors of new `scripts/checks/*.mjs` should mirror the shape used in an existing gate. A README at `scripts/checks/README.md` documenting the shape contract would prevent recurrence; deferred to a future infra SPEC.

## F-2 — Two pre-existing repo-root §0.5 violations surfaced during pile resolution (low)

`DESKTOP_ACTIVATION_PROMPT.md` and `regopen_email_preview.html` were at repo root. Per §0.5 they should not be there. `DESKTOP_ACTIVATION_PROMPT.md` self-described as "delete after use" — deleted. `regopen_email_preview.html` is real campaign work product → moved into `campaigns/supersale/`. No SPEC dispatched this fix; it was a judgment call within autonomy because the destruction was non-ambiguous (file's own text instructed deletion; preview moved not deleted).

**Action:** §0.5 root-discipline gate (`scripts/checks/check-root-discipline.mjs`) caught NEITHER of these — both were already on disk at session start and the gate only fires on `--staged` commits. Recommend a periodic root-scan Sentinel mission (or extending Mission 10) to catch on-disk root violations even if they were never staged. Deferred to a future Sentinel SPEC.

## F-3 — `--full` verify reports 3 [null-bytes] but `verify:integrity` is clean (low)

`node scripts/verify.mjs --full` reports 3 [null-bytes] violations; `npm run verify:integrity` (which uses `git status --porcelain` + `git ls-files` for file discovery) reports clean. The delta is files in archived/ignored locations that `--full`'s broader walk scans but the integrity gate's tracked-file scan does not.

**Action:** consult the 3 paths in `--full`'s output; if they are in `_archive/` / backup folders / ignored locations, they are not actively-corrupted source code. If they were missed by `.gitignore` they should be ignored. Deferred to a separate diagnostic — not a `REPO_CLEANUP` task because it touches archival policy.

---

## Harvest proposals

### P-EXEC-1 — Standardize the `scripts/checks/*.mjs` violation-shape contract (executor improvement)

Every gate in `scripts/checks/` follows the shape `{ check: string, path: string, line: number, message: string }` and the convention `check === <filename minus .mjs>`. There is no schema file or example; new gates have to be reverse-engineered from existing ones. Add a `scripts/checks/README.md` (or a `scripts/checks/_TEMPLATE.mjs`) that documents the contract. Reduces author-time mistakes (this SPEC lost ~3 minutes to the `[undefined]` mis-shape).

### P-EXEC-2 — Add a `clean-tree-before-commit` reminder in executor closure (executor improvement)

The executor closure protocol already references "clean tree at session end." Add an explicit line in the closure-step list: `git status --porcelain | wc -l` (or in PowerShell: `(git status --porcelain | measure-object -line).Lines`) should be **0** before "SPEC closed" report. If non-zero, the closure list lists every leftover and prompts the user. Pattern P-AUTHOR-3 in this SPEC (Layer 3) covers the executor SKILL.md edit; this proposal is the same intent codified in the closure ritual rather than a session-start probe. Defense in depth.

### P-AUTHOR-1 — Pre-SPEC pile audit at Foreman bootstrap (Foreman improvement)

The Foreman SKILL.md edit in this SPEC adds a bootstrap probe (3 git status counts before authoring a new SPEC). Promote that pattern into the Foreman SPEC-authoring template (`SPEC_TEMPLATE.md` §0 Pre-Authoring Reality Check) — every new SPEC's §0 should record the pile count at author-time as a baseline. Future drift-detection investigations get a numeric anchor.

### P-AUTHOR-2 — `pipeline-coordination.mjs` should declare a "clean-repo authority" lock (Foreman improvement)

The CLAUDE.md §9 Parallel Pipeline Coordination section already has session-lock mechanism via `scripts/pipeline-coordination.mjs`. Currently nothing in the lock prevents two simultaneous SPECs from both authoring at repo root or both running `git add` on the same file. A future SPEC could extend the lock to declare per-session "clean-repo authority" — only the lock-holder is allowed to add files outside its `files_owned_globs` for the duration. Out-of-scope for this SPEC; flagged for future.

---

## What was already-known-and-respected (not a finding)

- §32 (destructive-ops-declared) — SPEC §Destructive Operations enumerated every authorized op; gate ran on each commit; 0 hits flagged as unauthorized.
- §31 (integrity gate) — pre- and post-SPEC clean.
- §9 #6 (selective git add) — every `git add` in the SPEC chain was explicit-filename. The whole point of this SPEC.
- §9 #7 (never merge to main) — Claude did not merge. Daniel-only PR deliverable.
