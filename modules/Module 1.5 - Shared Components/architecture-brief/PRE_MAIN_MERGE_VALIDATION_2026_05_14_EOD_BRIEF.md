# PRE-MAIN-MERGE VALIDATION — develop → main (2026-05-14 EOD)

**Type:** Pre-merge gate. Read-only smoke + integrity + advisor + chain verification across the full develop-vs-main delta before Daniel approves the PR.

**Why this exists:** Today (2026-05-14) closed 8 SPECs end-to-end via Full-Auto Pipeline:
1. PRE_MERGE_VALIDATION (post-merge in practice — main was already current at session start)
2. P1.4 M4_REGISTER_LEAD_TO_EVENT_RPC_MAP (read-only diagnostic)
3. M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX (return-shape bug fix)
4. P1.1 M3_UTM_TRIPLE_LAYER_PERSISTENCE (new `crm_lead_touchpoints` table + 2 EFs)
5. EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK (skill update)
6. ARCHITECT_SESSION_2026_05_14_CLEANUP (housekeeping commit)
7. P1.2 M4_BROADCAST_ID_PROPAGATION (broadcast_id end-to-end + pg_cron counter)
8. P1.3 M3_SHORTGY_TO_INTERNAL_REDIRECT (4 short-links migrated, Gama gateway included)

Additional parallel sessions ran in this repo while the Architect session was active (per Daniel's note: "היו עוד סשנים שרצו בריפו"). Their commits also sit on develop.

Daniel wants a final green-light verification before approving the merge: confirm nothing on develop is broken, regressed, or in a half-state — including any parallel-session work.

**This is NOT a SPEC.** Zero code changes. Zero DB writes. Zero new commits expected. Only verification reads + a Hebrew status report at the end + (if GREEN) a proposed PR title.

---

## 1. Scope

**In scope:**
1. Confirm working tree clean on `develop` (per CLAUDE.md §1 step 4). Pre-existing untracked files from earlier sessions that are NOT on the merge list MUST stay untouched — flag as WARNING not FAIL (per the morning validation precedent).
2. Run `npm run verify:integrity` — must exit 0.
3. Verify both servers responsive (ERP :3000 + Storefront :4321) via existing health-check probes. Servers already up — confirm only.
4. Run `npm run smoke` — must be 7/7 PASS on demo tenant.
5. HTTP-200 sanity check on the migration target pages from Phase 1 work (the 4 ERP pages + 4 storefront pages from the morning's merge are already in main; today's SPECs touched DB + EFs + new touchpoints table + short-link migration — no new HTML pages).
6. **Phase 1 chain verification on demo** (this is the critical addition vs morning validation):
   - Create a test broadcast with 1 short-link → verify queue row has broadcast_id → verify log row has broadcast_id post-drain → simulate click on `/r/<code>` → verify `short_link_clicks` row has broadcast_id + `crm_lead_touchpoints` row created with UTMs + broadcast_id → wait 1-2 min for pg_cron → verify `crm_broadcasts.total_sent` incremented.
   - This is the end-to-end Phase 1 chain proof — covers P1.1 + P1.2 + P1.3 simultaneously.
7. Verify all 4 migrated short.gy → internal short-link codes resolve correctly (curl probe each `/r/<code>` and confirm 301/302 to documented destination, including Gama gateway URL).
8. Run Supabase advisor (`get_advisors --type security`) — confirm post-hotfix state holds (zero new LIVE-customer-harm or STAFF-data-harm findings vs SECURITY_HOTFIX_2026_05_13 baseline).
9. Compare `git diff main..develop --stat` — sanity-check file count. Identify any rogue files (anything not from today's 8 SPECs + parallel-session commits).
10. Confirm no merge conflicts predicted: `git merge-tree $(git merge-base main develop) main develop` should produce no conflict markers.
11. Verify `OPEN_TASKS.md` "Last updated" is 2026-05-14 and reflects Phase 1 COMPLETE.
12. Verify `roles/site-overseer/FUNNEL_ROADMAP.md` shows P1.1 / P1.2 / P1.3 / P1.4 all flipped to ✅ CLOSED (or equivalent).
13. **Parallel-session commit review:** identify any commits on develop NOT authored by today's 8 SPECs. List them in the report with 1-line description so Daniel can verify they're expected.

**Out of scope:**
- Any code change. This is read-only.
- Any commit. The validation produces a Hebrew status report only.
- Any visual/UI screenshot check (v1 boundary; iframe-render is v2).
- Any DB writes to Prizma — every test runs on demo only.
- Actually performing the merge — that is Daniel's decision after reading the report.

---

## 2. Expected Outcomes

Pass criteria — ALL must be GREEN to recommend merge:

| # | Check | Expected |
|---|-------|----------|
| 1 | Working tree dirty state (untracked from older sessions only, nothing from today's 8 SPECs) | WARNING acceptable; FAIL if today's SPEC outputs are dirty |
| 2 | `npm run verify:integrity` exit code | 0 |
| 3 | ERP :3000 responsive | HTTP 200 |
| 4 | Storefront :4321 responsive | HTTP 200 |
| 5 | `npm run smoke` on demo tenant | 7/7 PASS |
| 6 | Phase 1 end-to-end chain on demo (broadcast → queue → log → click → touchpoint → counter) | ALL 6 chain links present + matching broadcast_id |
| 7 | All 4 migrated short-link codes resolve to documented destinations | 4/4 |
| 8 | Supabase advisor security | 0 new LIVE-customer-harm + 0 new STAFF-data-harm findings vs SECURITY_HOTFIX_2026_05_13 baseline |
| 9 | `git diff main..develop --stat` file list | matches today's 8 SPECs + identified parallel-session commits, no rogue files |
| 10 | `git merge-tree` conflict prediction | zero conflict markers |
| 11 | `OPEN_TASKS.md` Last updated | 2026-05-14 with Phase 1 closure note |
| 12 | `FUNNEL_ROADMAP.md` Phase 1 SPECs | All 4 ✅ CLOSED |
| 13 | Parallel-session commits identified | listed in report, no surprises |

If ANY check fails → STOP. Do NOT recommend merge. Write a Hebrew escalation line to Daniel describing exactly which check failed and the observed value.

---

## 3. Output

A single Hebrew status block at the end, in this format:

```
🟢 / 🟡 / 🔴 Pre-Merge Validation — develop → main (2026-05-14 EOD)

סטטוס: [GREEN / WARNINGS / BLOCKED]

[bullet per check, ≤14 bullets, one line each, Hebrew]

[Parallel-session commits identified:]
[bullet per commit not from today's 8 SPECs]

[If GREEN:] מומלץ לאשר merge. PR title proposed: <one-line>
[If WARNINGS:] רוב הבדיקות עברו. נמצא: <one-line>. ההחלטה שלך אם למזג.
[If BLOCKED:] לא ממליץ למזג עד תיקון: <one-line>.
```

Detailed report at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MERGE_VALIDATION_2026_05_14_EOD_REPORT.md` with all observed values per check. The chat output is the Hebrew block + (if GREEN) the proposed PR title only.

---

## 4. Destructive Operations

**None.** Pure read-only validation Brief. No file writes (except the report file `PRE_MERGE_VALIDATION_2026_05_14_EOD_REPORT.md`). No DB writes (the Phase 1 chain test writes to `demo` tenant only — and even there only via the production code paths that are already running in normal demo testing). No commits. No tags. No deploys.

If any step would require a destructive operation → STOP, escalate.

---

## 5. Notes for the Pipeline

- **Localhost-Tester is the right skill** for steps 3–6. It already knows how to launch servers + run smoke.
- **Reviewer skill** handles steps 9–10 (git diff sanity, merge-tree conflict prediction, parallel-session commit identification).
- **Executor skill** can do steps 2 + 7 + 8 (integrity, short-link probes, advisor query).
- **Foreman writes the report** — but no SPEC, no chain. This is a Brief executed by the Pipeline's individual skills as needed, not a full SPEC ceremony.
- **The Phase 1 chain test (Check #6) is the critical new verification** — it proves today's 3 execution SPECs (P1.1+P1.2+P1.3) work together end-to-end, not just individually. If the chain breaks, do NOT merge — write escalation.

End of Brief.
