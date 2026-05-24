# BRIEF — Commit session-2 SuperSale handoff files (Claude Code / Desktop)

**Author:** Events-Operations (Cowork)
**Date:** 2026-05-23
**For:** Claude Code on the Windows Desktop (the FUSE-source machine)
**Why this goes to Desktop, not Cowork:** the Cowork VM mount currently shows **2,588 phantom modifications** that are pure CRLF↔LF line-ending churn (no `.gitattributes`, `core.autocrlf` unset in the VM). `git diff --ignore-space-at-eol` collapses each "modified" file to ~nothing. Committing from Cowork would either pollute the repo with 2,588 line-ending flips or trip the clean-repo gate. The Desktop checkout has consistent line endings and will see ONLY the real content deltas. This is the standard §7 VM-health escalation.

---

## Objective

Commit the real work produced during the SuperSale launch-campaign session 2 (2026-05-22 → 2026-05-23). These files were authored/edited in Cowork but never committed (Cowork can't safely git here). Commit them **by explicit filename** — never `git add -A` / `git add .` — on `develop`, then push.

## What is REAL work to commit (verified by `git diff --ignore-space-at-eol`)

Three groups Daniel named, all confirmed to carry genuine content changes (not just line-ending churn):

1. **The handoff log** (modified, real delta = the 2026-05-23 PROGRESS UPDATE section):
   - `roles/events-operations/EVENTS_OPS_DECISIONS_LOG.md`

2. **The new BRIEF + ACTIVATION_PROMPT sketches** (untracked — genuinely new files):
   - `campaigns/supersale/sketches/ACTIVATION_PROMPT_create_promote_launch_templates.md`
   - `campaigns/supersale/sketches/ACTIVATION_PROMPT_launch_landing_v11_890only_discount.md`
   - `campaigns/supersale/sketches/ACTIVATION_PROMPT_sunday_email_v2.md`
   - `campaigns/supersale/sketches/ACTIVATION_PROMPT_sunday_email_v3.md`
   - `campaigns/supersale/sketches/ACTIVATION_PROMPT_sunday_launch_email.md`
   - `campaigns/supersale/sketches/ACTIVATION_PROMPT_v12_center_badges.md`
   - `campaigns/supersale/sketches/BRIEF_create_promote_launch_templates.md`
   - `campaigns/supersale/sketches/BRIEF_sunday_launch_email.md`
   - `campaigns/supersale/sketches/BRIEF_commit_session2_handoff.md` (this brief)
   - `campaigns/supersale/sketches/ACTIVATION_PROMPT_commit_session2_handoff.md` (the activation prompt for THIS task)

3. **The Sunday wave-1 email** (modified, real content delta):
   - `campaigns/supersale/messages/sunday_launch_email.html`

> NOTE: there may also be other earlier sketches already tracked (v2–v10 BRIEF/ACTIVATION files). Those were committed in prior sessions; only the 8 untracked ones above + this brief/prompt pair are new. If `git status` shows any of them as still-untracked, add them too — they are all legitimate session work in the same folder.

## What is NOT to be committed (the trap)

- The ~2,580 `M` files that are CRLF/FUSE phantoms — `.claude/skills/**`, `_archive/**`, `CLAUDE.md`, `MASTER_ROADMAP.md`, etc. **Do NOT `git add` any of these.** They are line-ending noise. (On the Desktop they will most likely NOT even show as modified — the Desktop's autocrlf handles them. If they DO show as modified on the Desktop, STOP and report to Daniel; that would be a different problem than the Cowork CRLF churn.)
- Other untracked artifacts NOT part of this campaign: the M1.5 `NIGHT_RUN_*` / `NEXT_SESSION_KICKOFF_*` briefs, the M4 `go-live/qa-*.mjs` + `_qa_*results.json`, and the `tests/*.xls`. **Leave these alone** — they belong to other workstreams. Do not commit them as part of this campaign commit.

## Pre-flight (MANDATORY before any add)

1. `git branch` → must be `develop`. If not: `git checkout develop`.
2. `git status --porcelain | wc -l` → report the count to Daniel.
3. Confirm the Desktop does NOT see the 2,588 CRLF phantoms (it should see only a handful of real files). If it sees thousands of modified files → STOP, this brief's assumption is wrong, escalate.
4. `npm run verify:integrity` → exit 0 expected. If exit 1 (null-byte) → STOP.

## Destructive Operations

**None.** This task only `git add`s named files + commits + pushes to `develop`. No deletes, no renames, no reset, no force, no main.

## Expected deliverable / verification evidence

- One commit on `develop` with exactly the named files (report the file list `git show --stat HEAD`).
- `git push origin develop` succeeds.
- Final `git status` for the campaign paths is clean (the named files no longer appear as modified/untracked).
- Report the commit hash back to Daniel.
