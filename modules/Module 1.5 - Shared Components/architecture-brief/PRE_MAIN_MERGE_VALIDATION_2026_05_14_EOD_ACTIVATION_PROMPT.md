You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the read-only Pre-Main-Merge Validation Brief at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_14_EOD_BRIEF.md`.

This is NOT a SPEC. It is a read-only pre-merge gate. Zero code changes. Zero commits. Zero new DB writes (other than the demo-tenant chain test that uses existing production code paths). Output is a Hebrew status block + (if GREEN) a proposed PR title, plus a written `PRE_MERGE_VALIDATION_2026_05_14_EOD_REPORT.md` next to the Brief.

Context: today (2026-05-14) closed 8 SPECs end-to-end, the entire Phase 1 of `roles/site-overseer/FUNNEL_ROADMAP.md`. Plus parallel sessions from Daniel ran in the repo earlier (verify what they did). Daniel wants final green-light before approving the develop→main PR.

Load skill `opticup-localhost-tester` for the runtime checks + Phase 1 chain test. Load `opticup-executor` for Supabase advisor + short-link probes. Load `opticup-reviewer` for git/merge sanity. NO foreman / strategic — this is not a SPEC chain.

Workflow:
1. `git status` — confirm working tree state. Pre-existing dirty files from earlier sessions stay untouched (WARNING acceptable). If today's 8 SPEC outputs are dirty → FAIL.
2. Run `npm run verify:integrity` — must exit 0.
3. Confirm both local servers responsive (ERP :3000 + Storefront :4321) — they're already up.
4. Run `npm run smoke` — must be 7/7 PASS on demo tenant.
5. **Phase 1 chain test on demo** (the critical new verification — see Brief §1 step 6):
   - Create test broadcast on demo with 1 short-link → verify queue row has broadcast_id → simulate drain (or wait for it) → verify log row has broadcast_id → simulate click on the short-link → verify `short_link_clicks` + `crm_lead_touchpoints` rows have matching broadcast_id + UTMs → wait 1-2 min for pg_cron → verify `crm_broadcasts.total_sent` incremented.
   - If ANY link in the chain breaks → STOP, do NOT recommend merge.
6. Curl-probe all 4 migrated short-link codes from P1.3 — confirm each returns 301/302 to documented destination (including the Gama gateway URL for `gmapy` migration target).
7. Run Supabase advisor `get_advisors --type security` — confirm 0 new findings vs SECURITY_HOTFIX_2026_05_13 baseline.
8. `git diff main..develop --stat` — sanity-check file count + names. Identify parallel-session commits (any commit on develop not matching today's 8 SPECs' commit ranges).
9. `git merge-tree $(git merge-base main develop) main develop` — confirm no conflict markers.
10. Verify `OPEN_TASKS.md` Last-updated = 2026-05-14 + Phase 1 closure note. Verify `roles/site-overseer/FUNNEL_ROADMAP.md` shows P1.1/P1.2/P1.3/P1.4 all ✅ CLOSED.
11. Write `PRE_MERGE_VALIDATION_2026_05_14_EOD_REPORT.md` next to the Brief with all observed values per Brief §2.
12. Emit a single Hebrew status block to chat per Brief §3.

STOP triggers:
- Working tree shows today's 8 SPEC outputs as dirty → STOP, this means a SPEC didn't close cleanly.
- Smoke <7/7 PASS → STOP.
- Phase 1 chain test breaks anywhere → STOP, do NOT recommend merge. This is THE critical gate.
- Any short-link returns non-301/302 → STOP.
- Advisor returns new LIVE or STAFF findings → STOP, list them.
- Merge-tree predicts conflicts → STOP, list conflicting paths.
- Parallel-session commits include surprise content (e.g. commits to main, force-pushes, files outside expected scope) → STOP, list and ask Daniel.

Do NOT:
- Commit anything.
- Push anything.
- Modify any file except the report file.
- Run `git checkout main` or any main-touching command.
- Actually perform the merge.

Demo tenant only for the chain test (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Use existing demo data. Never write to Prizma.

Whitelist for any test phone/email:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block per Brief §3. Daniel decides whether to proceed with the merge based on it.

End of activation prompt.
