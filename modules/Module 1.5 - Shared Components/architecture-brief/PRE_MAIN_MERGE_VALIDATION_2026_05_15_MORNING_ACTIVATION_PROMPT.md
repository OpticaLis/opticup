You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the read-only Pre-Main-Merge Validation Brief at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_15_MORNING_BRIEF.md`.

This is NOT a SPEC. It is a read-only pre-merge gate. Zero code changes. Zero commits. Output is a Hebrew status block + (if GREEN) a proposed PR title, plus a written `PRE_MERGE_VALIDATION_2026_05_15_MORNING_REPORT.md` next to the Brief.

Context: Since the previous merge (2026-05-14 EOD), develop accumulated ~30 commits from: overnight Bundle 1 (7 items) + overnight Bundle 2 (7 SPECs + 4 LEARNING) + morning M4_FAILED_MESSAGE_BADGE_CLEANUP. Daniel wants the standard pre-merge gate run before approving.

**Critical new element vs prior validation runs:** Step 8 confirms the 3 CRITICAL findings from Bundle 2 (F-CRIT-1 search_path regression, F-CRIT-2 17 views security_invoker, F-CRIT-3 20 RPCs JWT-bypass) are STILL present, so SECURITY_HOTFIX_2 scope tomorrow is accurate. If any was silently resolved → document, do NOT treat as failure.

Load skill `opticup-localhost-tester` for runtime + Phase 1 chain + Badge SPEC re-verification. Load `opticup-executor` for advisor + F-CRIT pg_proc queries + integrity. Load `opticup-reviewer` for git/merge sanity. NO foreman / strategic.

Workflow:
1. `git status` — pre-existing dirty from earlier sessions allowed as WARNING; today's SPEC outputs dirty = FAIL.
2. Run `npm run verify:integrity` — exit 0.
3. Confirm both servers responsive (ERP :3000 + Storefront :4321) — should already be up.
4. Run `npm run smoke` — 7/7 PASS demo.
5. HTTP-200 sample probe: storefront root + 1 ERP page + 1 storefront page.
6. **Phase 1 funnel chain re-verification on demo** (regression check for yesterday's Phase 1 closure):
   - broadcast → queue → log → click → short_link_clicks → touchpoints → pg_cron total_sent. All 6 links must connect with matching broadcast_id.
7. **M4_FAILED_MESSAGE_BADGE_CLEANUP re-verification on demo** (regression check for THIS morning's SPEC):
   - Create 1 demo failed `crm_message_log` row → verify ⚠️ shows + chip count increments → call RPC `acknowledge_failed_messages` with that row's id → verify ⚠️ gone + chip decrements → verify per-lead history view shows the row with "מטופל" tag.
8. **Verify 3 CRITICAL findings still present:**
   - F-CRIT-1: `SELECT proconfig FROM pg_proc WHERE proname='sync_lead_status_from_attendee'` — confirm `search_path=public` is ABSENT.
   - F-CRIT-2: `SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind='v' AND NOT EXISTS (SELECT 1 FROM unnest(c.reloptions) AS opt WHERE opt = 'security_invoker=on')` — confirm count is around 17 (give exact number).
   - F-CRIT-3: grep `SECURITY DEFINER` functions in `pg_proc` for parameters named `p_tenant_id` WITHOUT JWT-claim validation in the body. Confirm ~20 (give exact number).
9. Supabase advisor `get_advisors --type security` — confirm baseline (no new beyond the 3 known CRITICAL + the pre-existing SECURITY_HOTFIX_2026_05_13 known findings).
10. `git diff main..develop --stat` — file count + parallel-session commit identification.
11. `git merge-tree $(git merge-base main develop) main develop` — 0 conflict markers.
12. Verify `OPEN_TASKS.md` Last-updated date is recent.
13. Verify `roles/site-overseer/FUNNEL_ROADMAP.md` Phase 1 + P2.3 still ✅ CLOSED.
14. Write `PRE_MERGE_VALIDATION_2026_05_15_MORNING_REPORT.md` next to the Brief.
15. Emit ONE Hebrew status block.

STOP triggers:
- Working tree shows today's 14 SPEC outputs as dirty → STOP, do NOT recommend merge.
- Smoke <7/7 PASS → STOP.
- Phase 1 funnel chain breaks anywhere → STOP, this is a Phase 1 regression.
- M4 Badge mechanism (chain + RPC) breaks → STOP, this morning's SPEC regressed.
- Advisor returns NEW security findings beyond the 3 CRITICAL known → STOP, list them.
- Merge-tree predicts conflicts → STOP, list conflicting paths.
- Parallel-session commits include surprise content (commits to main, force-pushes, files outside scope) → STOP, list.

Do NOT:
- Commit anything.
- Push anything.
- Modify any file except the report file.
- Run `git checkout main` or any main-touching command.
- Perform the merge.
- Fix any of the 3 CRITICAL findings in this run (that's SECURITY_HOTFIX_2).

Demo tenant only for the chain + Badge tests (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Use existing demo data + the 1 new test row from step 7.

Whitelist phones/emails for test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: working tree status (WARNING/FAIL/CLEAN), integrity, smoke, Phase 1 chain result, Badge SPEC chain result, F-CRIT-1/2/3 statuses (still present? exact counts), advisor delta (0 new vs baseline?), git diff stats, merge-tree conflicts (0?), parallel-session commit identification, recommended merge (YES/NO) + proposed PR title if YES. Daniel decides whether to merge.

End of activation prompt.
