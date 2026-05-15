# PRE-MAIN-MERGE VALIDATION — develop → main (2026-05-15 midday)

**Type:** Pre-merge gate. Read-only verification of the SECURITY_HOTFIX_2 delta (5 commits since the morning merge) before Daniel approves the PR.

**Why this exists:** SECURITY_HOTFIX_2 closed F-CRIT-1 (100%) + F-CRIT-3 (100% in-scope) and partially closed F-CRIT-2 (2/17). Production needs the closed CRITICAL fixes shipped to main NOW — waiting to bundle with SECURITY_HOTFIX_3 risks contaminating safe fixes with any HOTFIX_3 issue. Standard quick validation before merge.

**Scope is intentionally narrow** — this is a 5-commit delta validation, not the full sprawling validation of the morning. ~15-20 minutes.

---

## 1. Scope

**In scope:**
1. Working tree clean for SECURITY_HOTFIX_2 scope (pre-existing dirty from earlier sessions allowed as WARNING).
2. `npm run verify:integrity` — exit 0.
3. Both servers responsive (ERP :3000 + Storefront :4321) — already up.
4. `npm run smoke` — 7/7 PASS on demo tenant.
5. **Critical regression check — re-verify HOTFIX_2 effects still active:**
   - `sync_lead_status_from_attendee` `proconfig` STILL shows `search_path=public` (F-CRIT-1).
   - 2 fixed views (`v_storefront_reviews` + `v_storefront_components`) STILL have `security_invoker=on` (F-CRIT-2 partial).
   - Random sample of 3 from the 24 hardened RPCs: signature + JWT header still present (F-CRIT-3).
6. **Storefront probe (no outage):**
   - Storefront homepage HTTP 200 with non-empty body.
   - `/supersale` HTTP 200 with non-empty body.
7. **The 15 deferred views are still unfixed** (sanity check that we didn't accidentally fix them with bad side effects):
   - Sample 3 from the 15 deferred — confirm `security_invoker=on` is ABSENT (correct deferred state).
8. `git diff main..develop --stat` — should be only the 5 HOTFIX_2 commits + any non-conflicting unrelated commits since morning merge.
9. `git merge-tree $(git merge-base main develop) main develop` — zero conflict markers.
10. Supabase advisor `get_advisors --type security` — F-CRIT-1 GONE, F-CRIT-3 in-scope subset GONE, F-CRIT-2 reduced from 17 → 15 (the 2 we fixed are gone).

**Out of scope:**
- Any code changes. Read-only.
- Commits. Validation produces a report only.
- The merge itself (Daniel does that via GitHub PR UI).
- Verifying the 15 deferred views work for storefront — they were already working pre-HOTFIX (the deferral was BECAUSE they were working).

---

## 2. Expected Outcomes

| # | Check | Expected |
|---|-------|----------|
| 1 | Working tree status | WARNING acceptable if only pre-existing untracked; FAIL if HOTFIX_2 outputs dirty |
| 2 | `npm run verify:integrity` | exit 0 |
| 3 | ERP :3000 + Storefront :4321 | both HTTP 200 |
| 4 | `npm run smoke` | 7/7 PASS |
| 5 | F-CRIT-1/2-partial/3 still active per HOTFIX_2 closure | all checks PASS |
| 6 | Storefront homepage + /supersale | both HTTP 200 with non-empty |
| 7 | 3 sample deferred views: `security_invoker=on` ABSENT | as expected (still deferred) |
| 8 | `git diff main..develop --stat` | 5 HOTFIX_2 commits + (if any) unrelated commits documented |
| 9 | `git merge-tree` conflict prediction | 0 conflict markers |
| 10 | Advisor: F-CRIT-1 gone, F-CRIT-2 17→15, F-CRIT-3 in-scope subset gone | as designed |

If ANY check fails → STOP, do NOT recommend merge, write Hebrew escalation.

---

## 3. Output

Hebrew status block + (if GREEN) proposed PR title. Report at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MERGE_VALIDATION_2026_05_15_MIDDAY_REPORT.md`.

---

## 4. Destructive Operations

**None.** Pure read-only validation. No commits, no DB writes, no deploys. The smoke + advisor queries use existing demo data via production code paths.

---

## 5. Notes

- Skill load: `opticup-localhost-tester` for runtime + storefront probe. `opticup-executor` for advisor + pg_proc + pg_class queries. `opticup-reviewer` for git sanity.
- No Foreman/strategic — this is not a SPEC chain.
- Time-box: 20 minutes. If a check takes >5 min unexpectedly — STOP, surface the surprise.

End of Brief.
