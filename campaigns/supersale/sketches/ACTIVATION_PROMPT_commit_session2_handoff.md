You are Claude Code on the Optic Up Windows Desktop. Task: commit session-2 SuperSale launch-campaign handoff files that were authored in a Cowork session but never committed (Cowork's VM mount has CRLF/FUSE line-ending churn and cannot safely git). Full context: campaigns/supersale/sketches/BRIEF_commit_session2_handoff.md — read it first.

STEP 1 — Pre-flight (stop on any deviation):
1. `git branch` — confirm `develop`. If not, `git checkout develop`.
2. `git pull origin develop`.
3. `git status --porcelain | wc -l` — report the count to me.
4. CRITICAL CHECK: confirm you do NOT see ~2,580 modified files. The Desktop should see only a small number of genuinely-modified files (your autocrlf handles line endings). If you DO see thousands of modified files, STOP and tell me — do not proceed.
5. `npm run verify:integrity` — expect exit 0. If exit 1 (null bytes), STOP.

STEP 2 — Add ONLY these files by explicit name (NEVER `git add -A` or `git add .`):
git add "roles/events-operations/EVENTS_OPS_DECISIONS_LOG.md"
git add "campaigns/supersale/messages/sunday_launch_email.html"
git add "campaigns/supersale/sketches/ACTIVATION_PROMPT_create_promote_launch_templates.md"
git add "campaigns/supersale/sketches/ACTIVATION_PROMPT_launch_landing_v11_890only_discount.md"
git add "campaigns/supersale/sketches/ACTIVATION_PROMPT_sunday_email_v2.md"
git add "campaigns/supersale/sketches/ACTIVATION_PROMPT_sunday_email_v3.md"
git add "campaigns/supersale/sketches/ACTIVATION_PROMPT_sunday_launch_email.md"
git add "campaigns/supersale/sketches/ACTIVATION_PROMPT_v12_center_badges.md"
git add "campaigns/supersale/sketches/BRIEF_create_promote_launch_templates.md"
git add "campaigns/supersale/sketches/BRIEF_sunday_launch_email.md"
git add "campaigns/supersale/sketches/BRIEF_commit_session2_handoff.md"
git add "campaigns/supersale/sketches/ACTIVATION_PROMPT_commit_session2_handoff.md"

If any of those paths report "did not match any files" because they are already tracked-and-unmodified on the Desktop, skip that one and continue. Do NOT add any .claude/skills/** path, any _archive/** path, CLAUDE.md, MASTER_ROADMAP.md, the M1.5 NIGHT_RUN_*/NEXT_SESSION_KICKOFF_* briefs, the M4 go-live/qa-* files, or tests/*.xls — none of those belong to this commit.

STEP 3 — Verify staged set is correct:
`git status --porcelain | grep '^[AM]'` — confirm ONLY the files above are staged. If anything else is staged, `git restore --staged <that-file>` before committing.

STEP 4 — Commit + push:
git commit -m "chore(supersale): commit session-2 launch-campaign handoff (decisions log, sunday email, sketches)"
git push origin develop

STEP 5 — Report back: the commit hash, `git show --stat HEAD` output, and final `git status` for the campaign paths (should be clean). Do not merge to main.
