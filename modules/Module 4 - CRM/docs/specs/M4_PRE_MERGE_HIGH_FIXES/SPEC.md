# SPEC — M4_PRE_MERGE_HIGH_FIXES

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/SPEC.md`
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Type:** Fix SPEC — pre-merge HIGH findings only
> **Drives:** Surgical fixes for HIGH-1 and HIGH-2 from `M4_PRE_MERGE_QA/QA_REPORT.md`. After this lands, develop is ready for merge to main.

---

## 1. Goal

The pre-merge QA (commit `cef5618`) found 4 HIGH severity issues. Two of them (`HIGH-3` SECURITY DEFINER views, `HIGH-4` STOREFRONT_ORIGIN hardcoded) are project-wide debt deferred to dedicated SPECs. The other two are surgical, blocking, and easy:

- **HIGH-1:** Activity Log column drift — `crm-activity-log.js` reads `employees.full_name` but the actual column is `employees.name`. Result: every activity-log row shows employee UUID prefix instead of name. ~1-line fix.
- **HIGH-2:** Phone allowlist missing `0507168471` — both `send-message` and `dispatch-queue` EFs hardcode `["0537889878", "0503348349"]`. Daniel asked to add the third number for testing. ~2-character append per EF + 2 redeploys.

This SPEC fixes both, runs a re-QA spot-check, commits, pushes. After completion, develop is merge-ready.

## 2. Background

### What was just verified
- Commit `cef5618` is the QA commit. `QA_REPORT.md` lists the findings.
- Pipeline operational on demo (7 campaigns syncing every 4 hours, last sync 13:39:45 UTC).
- M4 sequence (campaigns SCREEN + V1/V2/V3 + CLEANUP) fully closed.

### What this fix is NOT touching
- HIGH-3 (SECURITY DEFINER views) — accept-as-debt, separate SPEC.
- HIGH-4 (STOREFRONT_ORIGIN hardcoded) — accept-as-debt, separate SPEC (P7 prerequisite).
- All MEDIUM, LOW, INFO findings — fix-post-merge per QA_REPORT recommendations.

## 3. Authority Envelope

DO:
- Edit `modules/crm/crm-activity-log.js` lines ~81 + ~85 (HIGH-1).
- Edit `supabase/functions/send-message/index.ts` line ~32 (HIGH-2).
- Edit `supabase/functions/dispatch-queue/index.ts` line ~19 (HIGH-2).
- Redeploy both EFs after their source change.
- Run a Chrome MCP spot-check on the Activity Log tab post-fix.
- Commit and push, in 2 commits (one per HIGH).

DO NOT:
- Touch any file beyond the 3 listed above.
- Touch the campaigns work in any way.
- Change EF logic beyond appending one phone number to one array.
- Change `crm-activity-log.js` beyond fixing the 2 column references (no Rule 7 cleanup, no Rule 12 split — those are noted in QA_REPORT for follow-up).
- Run any DDL or other DB writes.
- Modify any Make scenario.
- Use `git add -A`.

## 4. Hypothesis Ladder

Single rung per fix. Both fixes are evidence-backed surgical changes:

- **HIGH-1:** the column name is `name` per `information_schema.columns` query in QA_REPORT. The fix is mechanical.
- **HIGH-2:** the array literal is in known files at known lines. The append is mechanical.

If either fix has unexpected complications (e.g. line numbers drifted, file structure changed) — STOP and report.

## 5. Success Criteria

### HIGH-1 — Activity Log
1. ✅ `modules/crm/crm-activity-log.js` line ~81: `select('id, full_name')` becomes `select('id, name')`.
2. ✅ `modules/crm/crm-activity-log.js` line ~85: `_employees[e.id] = e.full_name` becomes `_employees[e.id] = e.name`.
3. ✅ No other changes to the file.
4. ✅ File line count within Rule 12 cap.
5. ✅ Chrome MCP spot-check: open Activity Log tab on `localhost:3000/crm.html?t=demo`, verify the "משתמש" column now shows readable names (not UUID prefixes).
6. ✅ No new console errors. No 400 on the `employees` request anymore.

### HIGH-2 — Phone allowlist
7. ✅ `supabase/functions/send-message/index.ts`: `ALLOWED_PHONES` array contains all 3 entries: `"0537889878"`, `"0503348349"`, `"0507168471"`.
8. ✅ `supabase/functions/dispatch-queue/index.ts`: same 3 entries.
9. ✅ Both EFs redeployed via `mcp__supabase__deploy_edge_function`. Version numbers advance.
10. ✅ Curl smoke test: an attempt to dispatch to `0507168471` no longer rejects with `phone_not_allowed`. (Don't actually send a real SMS — just confirm the EF doesn't return the rejection. Use a payload that intentionally aborts before the dispatch step, e.g. invalid template, OR just confirm by inspecting the deployed source on Supabase via `get_edge_function`.)

### Repo hygiene
11. ✅ Two commits, explicit `git add` paths only:
    - Commit 1: `fix(crm): use employees.name (not full_name) in activity log lookup`
    - Commit 2: `fix(crm): add 0507168471 to phone allowlist in send-message + dispatch-queue`
12. ✅ Pre-commit hooks pass on both. No `--no-verify`.
13. ✅ `git diff --staged | grep -iE 'fbsync_'` returns zero matches on both commits.
14. ✅ `npm run verify:integrity` exits 0.
15. ✅ `git status` at end matches session start (3 guardian files modified + untracked outputs/strays) MINUS the 3 fixed files (now committed).

## 6. Stop-on-Deviation Triggers

1. **STOP** if `crm-activity-log.js` doesn't have `full_name` at the lines QA_REPORT cited — file changed since QA. Investigate before editing.
2. **STOP** if either EF source doesn't have `["0537889878", "0503348349"]` at the lines QA_REPORT cited — same reason.
3. **STOP** if the EF redeploy fails 2× via MCP. Fall back to CLI `supabase functions deploy`. Don't retry MCP a 3rd time.
4. **STOP** if Chrome MCP spot-check post-fix shows a NEW error (regression).
5. **STOP** if any commit's diff contains content beyond the 1-2 line surgical change — scope creep.
6. **STOP** if the Activity Log tab still shows UUIDs after the fix — the column rename isn't the root cause; investigate further.

## 7. Rollback Plan

- **HIGH-1 fix breaks Activity Log:** `git revert` the commit. The tab returns to "showing UUIDs" state — non-blocking visual issue. Investigate before re-attempting.
- **HIGH-2 EF deploy fails:** the source on disk is committed; the deployed EF is still the old version. Either re-deploy (the source is correct) or revert the commit. The whitelist gap returns but it's the same gap that existed for the past day.
- **Both fixes succeed but post-fix QA finds something else:** flag in EXECUTION_REPORT, don't auto-fix. The merge can still proceed if the new finding is non-CRITICAL.

## 8. Pre-flight Checks

1. `git status` matches the post-QA state: 3 guardian files modified, untracked outputs/strays + this prompt, no staged files.
2. `git log -1` shows `cef5618 chore(spec): close M4_PRE_MERGE_QA — comprehensive QA report before merge to main`.
3. Branch is `develop`. Repo is `opticalis/opticup`.
4. localhost:3000 is running.
5. Chrome MCP can reach localhost:3000.
6. Read `modules/crm/crm-activity-log.js` lines 75–95 — confirm the QA's findings (`full_name` references at the cited lines).
7. Read `supabase/functions/send-message/index.ts` lines 25–40 — confirm `ALLOWED_PHONES` array.
8. Read `supabase/functions/dispatch-queue/index.ts` lines 13–25 — confirm same.

If any pre-flight check reveals unexpected state — STOP and report.

## 9. QA Protocol

### Path 1 — HIGH-1
1. Open `crm-activity-log.js`.
2. Edit line ~81: `select('id, full_name')` → `select('id, name')`.
3. Edit line ~85: `_employees[e.id] = e.full_name` → `_employees[e.id] = e.name`.
4. Save. Verify file line count within Rule 12.
5. Stage explicitly: `git add modules/crm/crm-activity-log.js`.
6. `git diff --staged` — confirm only 2 lines changed.
7. Run integrity gate.
8. Commit (Commit 1 message per §5.11).
9. Push.

### Path 2 — Spot-check HIGH-1 in browser
1. Hard reload `localhost:3000/crm.html?t=demo` in Chrome MCP.
2. Click "לוג פעילות" sidebar tab.
3. Read DOM — verify the "משתמש" column shows readable employee names (not UUID prefixes).
4. Read console — verify no 400 on the `employees?select=id,name` request.
5. If the tab still shows UUIDs after the fix → STOP per §6 trigger 6.

### Path 3 — HIGH-2
1. Open `supabase/functions/send-message/index.ts`. Find the `ALLOWED_PHONES` array.
2. Append `"0507168471"` so the array becomes `["0537889878", "0503348349", "0507168471"]`.
3. Save.
4. Open `supabase/functions/dispatch-queue/index.ts`. Same edit.
5. Save.
6. Stage both: `git add supabase/functions/send-message/index.ts supabase/functions/dispatch-queue/index.ts`.
7. `git diff --staged` — confirm only the array literals changed (one `, "0507168471"` per file).
8. Run integrity gate.
9. Commit (Commit 2 message per §5.11).

### Path 4 — Redeploy + verify HIGH-2
1. Deploy `send-message` via `mcp__supabase__deploy_edge_function`.
2. Verify deploy success — version advances.
3. Use `mcp__supabase__get_edge_function` to fetch the deployed source. Grep for `0507168471` — must be present.
4. Repeat for `dispatch-queue`.
5. If MCP deploy fails 2× per EF: fall back to CLI `supabase functions deploy <slug> --project-ref tsxrrxzmdxaenlvocyit`.

### Path 5 — Push + final verification
1. `git push origin develop`.
2. `git log --oneline -3` — confirm the 2 new commits on top of `cef5618`.
3. `git status` — clean delta per §5.15.

### Path 6 — Retrospective
1. Write `EXECUTION_REPORT.md` and `FINDINGS.md` in the SPEC folder.
2. Single retrospective commit: `chore(spec): close M4_PRE_MERGE_HIGH_FIXES with retrospective`.
3. Push.

## 10. Output Format

Return one consolidated message:

1. **Pre-flight result:** all 8 checks passed.
2. **HIGH-1:** commit hash + Chrome MCP spot-check result (employees show names, no 400).
3. **HIGH-2:** commit hash + deploy result for both EFs (versions, deployed source contains `0507168471`).
4. **Retrospective commit:** hash.
5. **Final repo state:** `git log -5` + `git status`.
6. **Confirmation:** "Both HIGH findings fixed. Repo merge-ready. Strategic chat will issue merge-prep next."

## 11. Iron Rule Compliance

- **Rule 7 (API abstraction):** HIGH-1 file uses raw `sb.from()` instead of `DB.*` wrapper. Pre-existing debt noted in QA_REPORT — NOT fixing in this SPEC.
- **Rule 9 (no hardcoded business values):** the phone allowlist remains hardcoded. Pre-existing pattern (per `OVERNIGHT_M4_SCALE_AND_UI Phase 1` — temporary safety net for testing). Not refactoring in this SPEC.
- **Rule 12 (file size):** verify after edits. None of the 3 files should grow significantly.
- **Rule 21 (no orphans):** N/A — no new files.
- **Rule 22 (defense-in-depth):** N/A — no DB writes.
- **Rule 23 (no secrets):** the existing `MAKE_SECRET` env-based pattern stays. No secret literals introduced.
- **Rule 31 (integrity gate):** runs at session start + before each commit + pre-commit hook.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26 evening.*
