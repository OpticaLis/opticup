# PRE-MAIN-MERGE VALIDATION — develop → main (2026-05-15 morning)

**Type:** Pre-merge gate. Read-only smoke + integrity + advisor + chain verification across the develop-vs-main delta before Daniel approves the morning PR.

**Why this exists:** Since the previous merge (2026-05-14 EOD), develop has accumulated commits from:
- Overnight Bundle 1 (7 items closed)
- Overnight Bundle 2 (7 SPECs + 4 LEARNING runs)
- Morning M4_FAILED_MESSAGE_BADGE_CLEANUP (6 commits)

Net delta is ~30 commits. Daniel wants the standard pre-merge gate run before approving the PR. Plus: there are 3 known CRITICAL findings from Bundle 2 (security regressions) that will be fixed in a SEPARATE follow-up SPEC after this merge. The validation needs to confirm those 3 issues are STILL present (not silently re-introduced or accidentally fixed in another item) so the SECURITY_HOTFIX_2 SPEC tomorrow has accurate scope.

**This is NOT a SPEC.** Zero code changes. Zero new DB writes (chain test uses existing demo data via production code paths). Output is a Hebrew status block + (if GREEN) a proposed PR title + a written `PRE_MERGE_VALIDATION_2026_05_15_MORNING_REPORT.md`.

---

## 1. Scope

**In scope:**
1. Confirm working tree clean (pre-existing untracked from earlier sessions allowed as WARNING — must not include any of the dirty file scope from today's SPECs).
2. Run `npm run verify:integrity` — must exit 0.
3. Verify both servers responsive (ERP :3000 + Storefront :4321) — they should already be up.
4. Run `npm run smoke` — 7/7 PASS on demo tenant.
5. HTTP-200 sanity check on a sample of pages (root + 2 storefront + 2 ERP — quick, no exhaustive scan needed).
6. **Phase 1 funnel chain re-verification on demo** (critical regression check — this was Phase 1's exit criterion at yesterday's EOD merge, must still pass):
   - Create test broadcast → queue+broadcast_id → log+broadcast_id → click → short_link_clicks+broadcast_id → touchpoints+broadcast_id → pg_cron total_sent.
7. **M4_FAILED_MESSAGE_BADGE_CLEANUP re-verification on demo** (regression check for THIS morning's SPEC):
   - Create 1 demo failed message → ⚠️ shows → call RPC → ⚠️ gone → history view shows "מטופל" tag.
8. **The 3 CRITICAL findings from Bundle 2 must STILL exist** (verify they were NOT silently fixed by any other commit since their discovery, so SECURITY_HOTFIX_2 scope is accurate):
   - F-CRIT-1: `sync_lead_status_from_attendee` function missing `search_path='public'`. Query `pg_proc.proconfig` to confirm.
   - F-CRIT-2: 17/35 views missing `security_invoker=on`. Query `pg_class.reloptions` to confirm count.
   - F-CRIT-3: 20 RPCs accept `p_tenant_id` without JWT validation. Query `pg_proc` definitions, grep for the pattern.
   - If any of these has been silently resolved → DOCUMENT in report (scope of SECURITY_HOTFIX_2 will adjust accordingly), do NOT treat as failure.
9. Supabase advisor `get_advisors --type security` — confirm no NEW findings vs SECURITY_HOTFIX_2026_05_13 baseline (the 3 CRITICAL above are expected; anything ELSE is a regression).
10. `git diff main..develop --stat` — sanity-check the file count + identify parallel-session commits (any commit not from the 14 SPECs of today/last-night).
11. `git merge-tree $(git merge-base main develop) main develop` — zero conflict markers expected.
12. Verify `OPEN_TASKS.md` Last-updated date matches the EOD update from yesterday or today.
13. Verify `roles/site-overseer/FUNNEL_ROADMAP.md` shows Phase 1 still ✅ CLOSED, Phase 2 P2.3 ✅ CLOSED (from Bundle 2 A.1).

**Out of scope:**
- Code changes. Read-only.
- Commits. Validation produces a report only.
- The merge itself (Daniel does that via GitHub PR UI).
- Fixing the 3 CRITICAL findings (separate SPEC: SECURITY_HOTFIX_2).
- Visual UI screenshots (v1 boundary).
- Writes to Prizma.

---

## 2. Expected Outcomes

| # | Check | Expected |
|---|-------|----------|
| 1 | Working tree dirty status | WARNING acceptable if only pre-existing untracked from earlier sessions; FAIL if today's SPEC outputs are dirty |
| 2 | `npm run verify:integrity` | exit 0 |
| 3 | ERP :3000 + Storefront :4321 responsive | HTTP 200 each |
| 4 | `npm run smoke` | 7/7 PASS |
| 5 | Sample page HTTP probes | all 200 |
| 6 | Phase 1 funnel chain end-to-end on demo | all 6 links connected |
| 7 | M4_FAILED_MESSAGE_BADGE_CLEANUP RPC + UI surfaces on demo | RPC works + chain works |
| 8 | F-CRIT-1/2/3 status | all 3 STILL present (or documented if any resolved) |
| 9 | Supabase advisor security | 0 NEW findings vs SECURITY_HOTFIX baseline; expected 3 (F-CRIT-1/2/3) only |
| 10 | `git diff main..develop --stat` | file count reasonable, parallel-session commits identified |
| 11 | `git merge-tree` conflict prediction | 0 conflict markers |
| 12 | `OPEN_TASKS.md` Last updated | 2026-05-15 or 2026-05-14 EOD |
| 13 | `FUNNEL_ROADMAP.md` Phase 1 + P2.3 | all ✅ CLOSED |

If any check fails → STOP, do NOT recommend merge, write Hebrew escalation describing which check failed.

---

## 3. Output

Single Hebrew status block + (if GREEN) a proposed PR title. Detailed report at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MERGE_VALIDATION_2026_05_15_MORNING_REPORT.md`.

---

## 4. Destructive Operations

**None.** Pure read-only validation. The Phase 1 + Badge chain tests use existing demo data via production code paths (same pattern as yesterday's EOD validation). No file writes except the report file. No commits. No tags. No deploys. No tenant data writes outside demo's normal test flows.

---

## 5. Notes for the Pipeline

- **Localhost-Tester** for steps 3–7 (runtime + chain tests).
- **Executor** for steps 2 + 8 + 9 (integrity, advisor, F-CRIT pg_proc queries).
- **Reviewer** for steps 10–11 (git sanity).
- **No SPEC chain ceremony** — this is a Brief executed by Pipeline skills directly.
- The 3 CRITICAL findings check (step 8) is the most important new addition — it ensures SECURITY_HOTFIX_2's scope tomorrow is accurate.

End of Brief.
