You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the read-only Pre-Main-Merge Validation Brief at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_15_AFTERNOON_BRIEF.md`.

This is NOT a SPEC. It is a quick (15-20 min) read-only pre-merge gate for the SECURITY_HOTFIX_3 delta (11 commits: dc63e54..6fb7fdf) since the midday merge to main. Output: Hebrew status block + (if GREEN) proposed PR title + a written `PRE_MERGE_VALIDATION_2026_05_15_AFTERNOON_REPORT.md`.

Context: SECURITY_HOTFIX_3 closed F-CRIT-2 15→8 + F-CRIT-3 17→2 + base-table RLS on blog_posts + ai_content + 5 admin lockdowns + save_translation_memory_batch 2nd overload + 14 RPCs with Block A. 8 views deferred to SECURITY_HOTFIX_4 (need separate strategic discussion on exposing inventory/brands to anon). 2 F-CRIT-3 RPCs intentionally anon-callable.

Load skill `opticup-localhost-tester` for runtime + storefront probe. Load `opticup-executor` for advisor + pg queries. Load `opticup-reviewer` for git sanity. NO foreman/strategic.

Workflow:
1. `git status` — pre-existing dirty from earlier sessions WARNING; HOTFIX_3 outputs dirty = FAIL.
2. `npm run verify:integrity` — exit 0.
3. Confirm both servers responsive (ERP :3000 + Storefront :4321). Already up.
4. `npm run smoke` — 7/7 PASS demo.
5. **HOTFIX_3 regression check:**
   - 2 fixed storefront views: `v_storefront_blog_posts` + `v_storefront_pages` have `security_invoker=on` in `pg_class.reloptions`.
   - 2 fixed base tables: `blog_posts` + `ai_content` have `_public_read_published` RLS policy in `pg_policies`.
   - 5 admin views locked: `v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats` — all have `security_invoker=on` + zero anon EXECUTE/SELECT.
   - `save_translation_memory_batch` 2nd overload: `pg_get_functiondef` shows Block A header.
   - 5 random RPCs from the 14 newly-hardened: JWT header + Block A pattern present.
6. **Storefront probe:**
   - `curl -s -o /dev/null -w "%{http_code}\n%{size_download}\n" http://localhost:4321/` → 200 + >1KB.
   - `curl ... /about` → 200 + >1KB.
   - `curl ... /supersale/` → 200 + >1KB.
7. **8 deferred views still unfixed:**
   - Sample 3: e.g. `v_storefront_products`, `v_storefront_brand_page`, `v_storefront_categories`. Confirm `security_invoker=on` ABSENT in `pg_class.reloptions`.
8. `git diff main..develop --stat` — 11 HOTFIX_3 commits + identify any parallel-session commits.
9. `git merge-tree $(git merge-base main develop) main develop` — 0 conflict markers.
10. Supabase advisor `get_advisors --type security`:
    - F-CRIT-2 = 8 (was 15 pre-HOTFIX_3).
    - F-CRIT-3 = 2 (was 17 pre-HOTFIX_3).
    - No NEW finding types vs baseline.
11. Write `PRE_MERGE_VALIDATION_2026_05_15_AFTERNOON_REPORT.md` next to the Brief.
12. Emit ONE Hebrew status block.

STOP triggers:
- HOTFIX_3 outputs dirty in working tree → STOP.
- Smoke <7/7 PASS → STOP.
- HOTFIX_3 regression checks fail → STOP, effects didn't stick.
- Storefront page returns non-200 → STOP, silent break.
- 3 sample deferred views have `security_invoker=on` → STOP, accidentally applied to deferred views.
- Merge-tree predicts conflicts → STOP, list paths.
- Advisor returns NEW finding types or wrong counts → STOP.
- Parallel commits include surprise content (commits to main, force-pushes) → STOP.

Do NOT:
- Commit anything.
- Push anything.
- Modify any file except the report file.
- Run `git checkout main` or any main-touching command.
- Perform the merge.
- Fix any of the 8 deferred views (that's HOTFIX_4).

Demo tenant only. Whitelist for any test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block: working tree, integrity, smoke, HOTFIX_3 regression check, storefront probe, 3 deferred views still unfixed (confirm), git diff stats, merge-tree conflicts (0?), advisor delta (F-CRIT-2 15→8? F-CRIT-3 17→2?), recommended merge (YES/NO) + proposed PR title.

End of activation prompt.
