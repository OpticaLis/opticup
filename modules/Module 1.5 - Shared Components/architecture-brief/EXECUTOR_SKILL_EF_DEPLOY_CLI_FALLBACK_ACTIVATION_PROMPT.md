You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the small skill-update Brief at `modules/Module 1.5 - Shared Components/architecture-brief/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK_BRIEF.md`.

This is a **15-20 minute skill update** closing the OPEN-021 3-strikes pattern. Two prior SPECs (STATUS_CHANGE_TRIGGERS_FRAMEWORK on 2026-05-13, M3_UTM_TRIPLE_LAYER_PERSISTENCE on 2026-05-14) both required CLI fallback when Supabase MCP `deploy_edge_function` returned 5xx. The fix: encode the fallback as default behavior in `opticup-executor/SKILL.md`.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → author the SPEC at `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/SPEC.md`. Declare `## Destructive Operations` as `None.`
2. Load skill `opticup-executor` → execute the SPEC. Single edit to `.claude/skills/opticup-executor/SKILL.md`. Backup the pre-edit SKILL.md per Brief §6.
3. Load skill `opticup-reviewer` → verify all 9 success criteria.
4. Skip Localhost-Tester runtime (no code change to deploy) — but DO run `npm run smoke` once as control (criterion 7) + `npm run verify:integrity` (criterion 8).
5. Back to `opticup-strategic` → write FOREMAN_REVIEW.md. Confirm OPEN-021 is now CLOSED.

Hard constraints:
- Edit is additive only — no deletion of existing SKILL.md content.
- The existing "Tool fails unexpectedly" rule gets a carve-out, not a removal. Other tools still STOP-on-second-failure.
- Repo must be clean at close per CLAUDE.md §9.

Do NOT:
- Generalize the CLI fallback to other Supabase MCP tools (apply_migration, execute_sql, etc.).
- Auto-install or auto-upgrade Supabase CLI.
- Touch any other skill file (only opticup-executor/SKILL.md).
- Commit anything to main.
- Run git checkout main, git merge, git rebase.

When done, return ONE Hebrew status block summarizing: SKILL.md lines added, OPEN-021 status, smoke result, integrity result, repo clean status.

End of activation prompt.
