You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the read-only Pre-Main-Merge Validation Brief at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_15_MIDDAY_BRIEF.md`.

This is NOT a SPEC. It is a quick (15-20 min) read-only pre-merge gate for the SECURITY_HOTFIX_2 delta (5 commits: 566e810..deae71d) since the morning merge to main. Output: Hebrew status block + (if GREEN) proposed PR title + a written `PRE_MERGE_VALIDATION_2026_05_15_MIDDAY_REPORT.md`.

Context: SECURITY_HOTFIX_2 closed F-CRIT-1 (search_path on sync_lead_status_from_attendee) + F-CRIT-3 (24 RPCs JWT-hardened) + partially F-CRIT-2 (2/17 views security_invoker; 15 deferred to SECURITY_HOTFIX_3 due to storefront outage risk). All Pipeline stages closed (Executor + Reviewer + Localhost-Tester + Foreman). Need merge to main before SECURITY_HOTFIX_3 starts.

Load skill `opticup-localhost-tester` for runtime + storefront probe. Load `opticup-executor` for advisor + pg queries. Load `opticup-reviewer` for git sanity. NO foreman / strategic — this is not a SPEC chain.

Workflow:
1. `git status` — pre-existing dirty from earlier sessions WARNING; HOTFIX_2 outputs dirty = FAIL.
2. `npm run verify:integrity` — exit 0.
3. Confirm both servers responsive (ERP :3000 + Storefront :4321). Already up.
4. `npm run smoke` — 7/7 PASS demo.
5. **Critical regression check — HOTFIX_2 effects still active:**
   - F-CRIT-1: `SELECT proconfig FROM pg_proc WHERE proname='sync_lead_status_from_attendee'` — confirm `search_path=public` PRESENT.
   - F-CRIT-2 partial: `v_storefront_reviews` + `v_storefront_components` both have `security_invoker=on` in `pg_class.reloptions`.
   - F-CRIT-3 sample: pick 3 of the 24 hardened RPCs. Confirm body contains JWT-claim header (`request.jwt.claims` reference) + Block A 3-role-aware pattern.
6. **Storefront probe:**
   - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/` → 200.
   - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/supersale/` → 200.
   - Both with non-empty body (use `-w "%{size_download}\n"` and confirm >1KB).
7. **15 deferred views still unfixed (correct deferred state):**
   - Pick 3 from the 15 deferred (e.g. `v_storefront_blog_posts`, `v_storefront_pages`, `v_storefront_products`). Confirm `security_invoker=on` is ABSENT in `pg_class.reloptions`. This proves we didn't accidentally apply it to deferred views.
8. `git diff main..develop --stat` — file count + commit identification. 5 HOTFIX_2 commits expected.
9. `git merge-tree $(git merge-base main develop) main develop` — 0 conflict markers.
10. Supabase advisor `get_advisors --type security` — confirm F-CRIT-1 GONE, F-CRIT-2 count went from 17 → 15, F-CRIT-3 in-scope subset GONE (the 25 we closed). No NEW findings beyond baseline.
11. Write `PRE_MERGE_VALIDATION_2026_05_15_MIDDAY_REPORT.md` next to the Brief.
12. Emit ONE Hebrew status block.

STOP triggers:
- HOTFIX_2 outputs dirty in working tree → STOP.
- Smoke <7/7 PASS → STOP.
- F-CRIT-1/2/3 regression check fails (e.g. search_path missing, view security_invoker missing, RPC JWT header missing) → STOP, the HOTFIX_2 effects didn't stick.
- Storefront page returns non-200 → STOP, silent storefront break.
- 3 sample deferred views unexpectedly have `security_invoker=on` → STOP, we accidentally applied to deferred views.
- Merge-tree predicts conflicts → STOP, list paths.
- Advisor returns NEW findings beyond baseline → STOP, list them.
- More than 5 + N (where N = parallel-session commits documented in morning) commits surface → STOP, identify the surprise commits.

Do NOT:
- Commit anything.
- Push anything.
- Modify any file except the report file.
- Run `git checkout main` or any main-touching command.
- Perform the merge.
- Fix any of the 15 deferred views (that's HOTFIX_3).

Demo tenant only. Whitelist for any test (none expected):
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block: working tree status, integrity, smoke result, F-CRIT-1/2/3 regression check, storefront probe result, 3 deferred views still unfixed (confirm), git diff stats, merge-tree conflicts (0?), advisor delta (F-CRIT-1 gone? F-CRIT-2 17→15? F-CRIT-3 closed subset gone?), recommended merge (YES/NO) + proposed PR title.

End of activation prompt.
