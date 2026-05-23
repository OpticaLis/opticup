# Sentinel Mission 15 — Clean-Repo Discipline

> **Added:** 2026-05-23 by `REPO_CLEANUP_MERGE_ENFORCEMENT` SPEC.
> **Owner:** opticup-sentinel skill (read-only audit).
> **Frequency:** every Sentinel run (hourly / 4-hour / daily — depending on Sentinel cadence).
> **Output:** `docs/guardian/GUARDIAN_ALERTS.md` entries with severity per thresholds below.

## Purpose

Detect accumulating dirty trees (untracked piles, orphan `.claude/skills/**` edits, stale workspace state) **periodically** — as a backstop to the pre-commit gate (Layer 1 — `scripts/checks/clean-repo-gate.mjs`) which only fires when someone tries to commit. Mission 15 catches sessions that end dirty AND never run a commit.

This is **Pattern P31 Layer 2** (periodic detection). Pattern P31 layers:

1. Text rule (CLAUDE.md §9 #6).
2. Session-start reminder (CLAUDE.md First Action §4).
3. **Automated hook** (Layer 1 — `scripts/checks/clean-repo-gate.mjs`).
4. **Periodic detection** (Layer 2 — THIS mission).

## Procedure

1. **Sample the tree:** read `git status --porcelain` on the local repo (Sentinel runs from a local checkout, not GitHub API).
2. **Count untracked + modified entries** separately.
3. **Identify orphan skill edits:** any path matching `.claude/skills/**` that is modified or untracked.
4. **Compare against thresholds:**

| Condition | Severity | Alert form |
|---|---|---|
| `.claude/skills/**` modified/untracked count ≥ 1 | **HIGH** | `H-CLEANREPO-SKILLS — N orphan skill edits …` |
| Total untracked ≥ 30 (HARD) | **HIGH** | `H-CLEANREPO-PILE — N untracked files …` |
| Total untracked 10–29 (SOFT) | MEDIUM | `M-CLEANREPO-PILE — N untracked files …` |
| Tree clean | none | (no alert) |

5. **Write to `docs/guardian/GUARDIAN_ALERTS.md`:**
   - Insert under "Active HIGH alerts" or "Active MEDIUM alerts" depending on severity.
   - Each alert includes the top-5 untracked paths + the count by category (briefs / tmp / logs / skill edits).
   - If a previously-reported H-CLEANREPO-* alert is now resolved (tree clean), mark it RESOLVED in the next run's delta.

6. **Cross-link:**
   - Reference `CLAUDE.md` §9 #6 in every alert.
   - Reference `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_MERGE_ENFORCEMENT/CLEAN_REPO_ROOT_CAUSE.md` for root-cause taxonomy.

## Categorization (from CLEAN_REPO_ROOT_CAUSE.md §1)

The Sentinel categorizes untracked paths into the same buckets the root-cause uses, so the alert is actionable:

- `architecture-brief` files (`modules/*/architecture-brief/*.md`) → "Cowork brief drops — owner: Foreman session that runs them next"
- `.claude/skills/**` modifications → "Orphan skill edits — owner: session that just made them"
- `scripts/tmp-*` / `dev-server.log` / `*_preview.html` → "Throwaway artifacts — should be gitignored"
- `roles/**/briefs/**` / `campaigns/**` → "Role work artifacts"
- Other → "Uncategorized — investigate"

## Why a Sentinel mission AND a pre-commit gate?

The pre-commit gate (Layer 1) only fires when someone runs `git commit`. A session that ends WITHOUT committing (closed chat, killed terminal, abandoned work) never triggers the gate. Mission 15 catches that gap.

The gate is the immediate friction. The mission is the safety net.

## Status

⏳ **PROTOCOL DOCUMENTED — execution deferred.** The mission protocol is recorded here so the next Sentinel-implementing session (or scheduled task) picks it up. The Layer 1 hook is already live (`scripts/checks/clean-repo-gate.mjs`) and runs on every `npm run verify:integrity` / `node scripts/verify.mjs --full`. Until the Sentinel runs Mission 15 on schedule, the developer-time enforcement covers 95% of cases.
