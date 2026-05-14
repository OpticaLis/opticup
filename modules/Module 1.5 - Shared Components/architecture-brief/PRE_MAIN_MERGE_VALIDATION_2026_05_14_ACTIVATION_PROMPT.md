You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the read-only validation Brief at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_14_BRIEF.md`.

This is NOT a SPEC. It is a read-only pre-merge gate. Zero code changes. Zero commits. Zero DB writes. Output is a Hebrew status block + (if GREEN) a proposed PR title, plus a written `PRE_MERGE_VALIDATION_REPORT.md` next to the Brief.

Load skill `opticup-localhost-tester` for the runtime checks. Load `opticup-executor` only if you need it for Supabase advisor queries. Do NOT load `opticup-strategic` or `opticup-foreman` — there is no SPEC to author.

Workflow:
1. Confirm working tree is clean on `develop` (per CLAUDE.md §1 step 4 — if dirty, ask Daniel before touching).
2. Run `npm run verify:integrity` — must exit 0.
3. Launch both local servers via `scripts/start-local.ps1` (ERP :3000 + Storefront :4321). Idempotent — if already running, fine.
4. Run `npm run smoke` (baseline.test.mjs) — must be 7/7 PASS on demo tenant.
5. HTTP-200 check the 7 migration target pages listed in Brief §1.
6. Run Supabase advisor `get_advisors --type security` — confirm 0 LIVE + 0 STAFF findings (post-hotfix baseline).
7. `git diff main..develop --stat` — sanity-check file count + names.
8. `git merge-tree $(git merge-base main develop) main develop` — confirm no conflict markers in output.
9. Verify `OPEN_TASKS.md` Last-updated date is 2026-05-13 or 2026-05-14.
10. Write `PRE_MERGE_VALIDATION_REPORT.md` next to the Brief with all observed values per check.
11. Emit a single Hebrew status block to chat in the format specified in Brief §3.

STOP triggers (per CLAUDE.md §9 Bounded Autonomy):
- Working tree dirty with anything not on the merge list → ask Daniel first.
- Any check in Brief §2 returns a value other than expected → STOP, do NOT recommend merge, write Hebrew escalation describing exactly what failed.
- Server fails to start → STOP, report which one.
- Smoke <7/7 PASS → STOP, report which test(s) failed.
- Advisor returns new LIVE or STAFF findings → STOP, list them.

Do NOT:
- Commit anything.
- Push anything.
- Modify any file except `PRE_MERGE_VALIDATION_REPORT.md` (the report file next to the Brief).
- Run `git checkout main` or any main-touching command.
- Run `git merge` or `git rebase`.

Demo tenant testing only (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Never touch Prizma.

Whitelist for any test that needs a phone/email (none expected, but for reference):
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block to Daniel. He decides whether to proceed with the merge based on it.

End of activation prompt.
