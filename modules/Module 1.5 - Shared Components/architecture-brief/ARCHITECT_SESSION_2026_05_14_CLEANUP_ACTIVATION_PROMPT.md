You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the housekeeping Brief at `modules/Module 1.5 - Shared Components/architecture-brief/ARCHITECT_SESSION_2026_05_14_CLEANUP_BRIEF.md`.

This is a **5-10 minute housekeeping SPEC** that commits the 13 architect-session 2026-05-14 untracked Briefs + governance edits in one batch. Each prior SPEC ran selective git add on its own SPEC folder + migration only — leaving Brief files and OPEN_TASKS/FUNNEL_ROADMAP edits uncommitted by design. This SPEC closes that gap.

Run the Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → author SPEC at `modules/Module 1.5 - Shared Components/docs/specs/ARCHITECT_SESSION_2026_05_14_CLEANUP/SPEC.md`. Declare `## Destructive Operations` as `None.` Confirm the 13 §1 paths via `git status --porcelain` before sealing.
2. Load skill `opticup-executor` → execute. Build the 2-column in-scope-table per Brief §2 step 1. Add ONLY the §1 paths by explicit filename. Commit + push to develop. Skip Localhost-Tester runtime step (but DO run smoke + integrity once as control).
3. Load skill `opticup-reviewer` → verify all 8 success criteria.
4. Back to `opticup-strategic` → write FOREMAN_REVIEW.md.

Hard constraints (STOP triggers):
- ANY file outside the §1 list ends up staged → STOP, unstage, redo. This is the most important rule.
- `git add -A`, `git add .`, or any wildcard add → STOP, redo with explicit filenames.
- §1 path content differs from what was authored (mtime way off, line count way off) → STOP, escalate (someone may have edited mid-session).
- Push fails → STOP, report. Do NOT retry with force.
- Smoke <7/7 PASS → STOP. Nothing should have regressed.

Do NOT:
- Commit any non-§1 file (site-overseer drafts, modules/Module 3 SPECs from prior sessions, GUARDIAN_ALERTS edits, .claude/skills modifications NOT authored this session, etc.).
- Touch the executor SKILL.md changes from EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK — those committed in their own SPEC already.
- Push to main. Run `git checkout main`, `git merge`, `git rebase`.
- Author any other SPEC in this chat.

When done, return ONE Hebrew status block: paths staged (count + names), commit SHA, push status, smoke + integrity result, out-of-scope dirty file count (unchanged pre/post).

End of activation prompt.
