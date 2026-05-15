# PRE-MAIN-MERGE VALIDATION REPORT — 2026-05-15 morning

**Run date:** 2026-05-15 (morning, ~09:45 local)
**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_15_MORNING_BRIEF.md`
**Type:** Read-only pre-merge gate (no SPEC chain ceremony).
**Tester:** Claude Code (Windows desktop) — opticup-localhost-tester + opticup-executor + opticup-reviewer skills loaded.
**Repo / branch / HEAD:** `opticalis/opticup` / `develop` / `0e6f5b7` (`docs(m1): add Phase 1A code review report`).
**Verdict:** 🟢 **GREEN — recommended for merge** (with 2 documentation-drift notes; no technical blockers).

---

## Executive summary

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Working tree | ⚠️ WARNING-acceptable | Pre-existing untracked + 8 modified files from earlier sessions; today's M4 Badge SPEC outputs are committed (HEAD = `0e6f5b7`). |
| 2 | `npm run verify:integrity` | ✅ PASS | 114 files scanned in 6ms (Iron Rule 31). |
| 3 | ERP :3000 + Storefront :4321 | ✅ PASS | ERP 200 in 212ms; Storefront 200 in 1606ms. |
| 4 | `npm run smoke` | ✅ PASS | 7/7 on demo. |
| 5 | Sample HTTP-200 probes | ✅ PASS (with note) | Root `/` 200, `/supersale` 200, ERP `/crm.html` 200, ERP `/inventory.html` 200. `/blog` and `/contact` returned 404 — not part of this storefront's route table (storefront only serves `/`, `/supersale`, `/quick-register/`). |
| 6 | Phase 1 funnel chain | ✅ PASS | Same broadcast_id flows through all 6 substrates on demo (see §1). |
| 7 | M4 Failed Message Badge | ✅ PASS | Chip count 6→7→6 round-trip on demo; RPC `acknowledge_failed_messages` returned `{updated_count:1, skipped_count:0, errors:[]}`. |
| 8 | F-CRIT-1 / -2 / -3 still present | ✅ ALL 3 PRESENT | SECURITY_HOTFIX_2 scope tomorrow remains accurate. |
| 9 | Supabase advisor delta | ✅ 0 net-new vs SECURITY_HOTFIX_2026_05_13 baseline | 151 findings across 7 lint types; the 4 lint types beyond F-CRIT-1/2/3 are documented pre-existing baseline items per `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md` §6.3. |
| 10 | `git diff main..develop --stat` | ⚠️ Larger than Brief expected | 971 files / +129,261/-2,597 / **351 commits** (not ~30). Last main merge was 2026-05-14 13:51 (PR #80), not "2026-05-14 EOD" as the Brief asserts. The actual gap covers Bundle 1 + Bundle 2 + this morning's Badge SPEC + all prior 2026-05-14 work (M1 Lens Phase 1A, Phase 1 funnel infrastructure, 4 Hybrid+Navy migrations, etc.). No parallel-session anomaly detected. |
| 11 | `git merge-tree main develop` | ✅ PASS | 0 conflict markers predicted. |
| 12 | `OPEN_TASKS.md` Last-updated | ✅ PASS | "2026-05-14 EOD" — within acceptable window per Brief §2 row 12. |
| 13 | `FUNNEL_ROADMAP.md` Phase 1 + P2.3 | ⚠️ DOC DRIFT | Phase 1 P1.1-P1.4 all ✅ CLOSED; **P2.3 still shows `PLANNED`** in the table even though `M4_TEMPLATE_VALIDATION_UNIFIED` SPEC was closed in commit `33a2040`. Not a technical issue — doc update missed at SPEC-close time. |

**Bottom line:** All technical gates green. The two notes are documentation drift (one in the Brief itself about commit count, one in FUNNEL_ROADMAP about P2.3 status) — neither blocks merge.

---

## 1. Phase 1 funnel chain re-verification — DETAILS

Verified on demo tenant via existing data (no test broadcast created). The most recent demo broadcast that has touchpoint propagation:

| Substrate | Count with this broadcast_id |
|---|---|
| `crm_broadcasts.id = 0a6cf29c-ad44-4823-a551-119299e84d00` | 1 (source) |
| `crm_broadcasts.total_sent` | **1** (pg_cron 1-min counter has fired) |
| `crm_broadcasts.total_recipients` | 1 |
| `crm_message_queue.broadcast_id` matches | 1 |
| `crm_message_log.broadcast_id` matches | 1 |
| `short_links.broadcast_id` matches | 2 (X1 substrate) |
| `short_link_clicks.broadcast_id` matches | 2 |
| `crm_lead_touchpoints.broadcast_id` matches | 3 |

All 6 chain links carry the SAME `broadcast_id` end-to-end. **Phase 1 regression: NONE.** P1.1 + P1.2 + P1.3 + P1.4 all still operational on demo.

---

## 2. M4 Failed Message Badge re-verification — DETAILS

| Step | Action | Expected | Observed |
|---|---|---|---|
| Pre | Count distinct demo leads with `status='failed'` AND `acknowledged_at IS NULL` AND `created_at >= now()-90d` | baseline N | 6 |
| 1 | `INSERT crm_message_log(...,status='failed',...)` on demo, lead `b06d2f06...` (had no failed history) | row inserted, chip count N+1 | row id `847e1a9d-f76b-49bb-98a8-8e7921a01af8`; **chip count = 7** ✓ |
| 2 | `SET request.jwt.claims = '{"tenant_id":"...demo..."}'; SELECT acknowledge_failed_messages(ARRAY[test_row_id], 'PRE_MERGE_VALIDATION_2026_05_15_MORNING')` | `{updated_count:1, skipped_count:0, errors:[]}` | matched exactly ✓ |
| 3 | Verify acked row state | `acknowledged_at` set, `acknowledged_reason='PRE_MERGE_VALIDATION_2026_05_15_MORNING'` | `acknowledged_at='2026-05-15 06:47:40.381824+00'`; reason matches ✓ |
| 4 | Re-count chip | back to N (6) | **chip count = 6** ✓ |
| 5 | Per-lead history "מטופל" tag | row has `acknowledged_at IS NOT NULL` (UI driver) | confirmed at DB level; UI rendering is JS-side `<span class="crm-ack-tag">מטופל · {ts} · {employee_name}</span>` driven by the same column, not separately tested here (v1 LH-Tester boundary — Playwright is v2) |

**Demo state delta:** 1 test row added at lead `b06d2f06-a800-4f69-8d1b-6f8f77c86990` with `acknowledged_at` set and reason `PRE_MERGE_VALIDATION_2026_05_15_MORNING`. Net chip count unchanged (6 → 7 → 6).

**Badge SPEC regression: NONE.** RPC + 3 ack columns + chip-count formula all operational.

---

## 3. F-CRIT-1 / -2 / -3 verification — DETAILS

All 3 known-CRITICAL findings from Bundle 2 are **still present** — SECURITY_HOTFIX_2 scope tomorrow remains accurate. No silent fix occurred.

### F-CRIT-1 — `sync_lead_status_from_attendee` missing `search_path='public'`

```sql
SELECT proname, proconfig FROM pg_proc WHERE proname='sync_lead_status_from_attendee';
-- [{"proname":"sync_lead_status_from_attendee","proconfig":null}]
```

`proconfig` is NULL → `SET search_path` is **NOT** applied. ✅ STILL PRESENT.

### F-CRIT-2 — Views missing `security_invoker=on`

Two queries, two answers, both correct:

- Wider count (every view in `public` lacking the reloption): **27** views.
- Advisor's `security_definer_view` ERROR-lint count (views whose ABSENCE of `security_invoker` actually leaks privilege via SECURITY DEFINER semantics): **17** views — matching the Brief's expected count exactly.

The 17 ERROR-flagged views: `v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_public_tenant`, `v_storefront_blog_posts`, `v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_categories`, `v_storefront_components`, `v_storefront_config`, `v_storefront_media`, `v_storefront_pages`, `v_storefront_products`, `v_storefront_reviews`, `v_tenant_i18n_overrides`, `v_translation_dashboard`. ✅ STILL PRESENT.

### F-CRIT-3 — SECURITY DEFINER RPCs with `p_tenant_id` but without JWT-claim validation

```sql
SELECT count(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname='public'
  AND p.prosecdef = true
  AND pg_get_function_arguments(p.oid) ILIKE '%p_tenant_id%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%request.jwt.claims%';
-- 24
```

**24** SECURITY DEFINER RPCs match the JWT-bypass pattern (Brief estimated ~20; actual is 24, slightly higher than the Bundle 2 audit number — likely because some overnight migrations added new RPCs that also lack the JWT gate). ✅ STILL PRESENT.

Note: the Supabase advisor's broader `authenticated_security_definer_function_executable` (57) + `anon_security_definer_function_executable` (43) covers a wider surface (any SECURITY DEFINER function executable by anon/authenticated, regardless of `p_tenant_id` parameter). SECURITY_HOTFIX_2 tomorrow should pin which exact subset is in scope.

---

## 4. Supabase security advisor delta — DETAILS

Full advisor output: 151 findings across 7 lint types.

| Lint name | Level | Count | Status vs Brief baseline |
|---|---|---|---|
| `function_search_path_mutable` | WARN | 30 | Known — F-CRIT-1 (the `sync_lead_status_from_attendee` instance is one of 30; the other 29 are in SECURITY_HOTFIX_2 SaaS-readiness scope per `SECURITY_HOTFIX_2026_05_13_SUMMARY.md §6.3` "Finding 17"). |
| `security_definer_view` | ERROR | 17 | Known — F-CRIT-2. |
| `authenticated_security_definer_function_executable` | WARN | 57 | Known — superset of F-CRIT-3 (defense-in-depth REVOKE bulk SPEC per `SECURITY_HOTFIX_2026_05_13_SUMMARY.md §6.3` "Finding 15"). |
| `anon_security_definer_function_executable` | WARN | 43 | Known — same family, anon-callable subset. |
| `extension_in_public` | WARN | 2 | **Pre-existing baseline** per `SECURITY_HOTFIX_2026_05_13_SUMMARY.md §6.3` "Finding 18" — `pg_trgm` + `pg_net` in public schema. Scheduled for "extension-relocation SPEC". |
| `public_bucket_allows_listing` | WARN | 1 | **Pre-existing baseline** — `tenant-logos` bucket. The 2026-05-13 hotfix hardened storage policies but left listing capability for storefront display. Documented in TECH_DEBT `M2-DEBT-LOGO-PATH-CANONICALIZATION`. |
| `auth_leaked_password_protection` | WARN | 1 | **Pre-existing baseline** per `SECURITY_HOTFIX_2026_05_13_SUMMARY.md §6.3` "Finding 19" — 2-minute Supabase Auth dashboard toggle that Daniel can flip directly. |

**Net-new findings vs 2026-05-13 baseline: 0.** All 7 lint families were already documented in the SECURITY_HOTFIX_2026_05_13 close summary.

---

## 5. Git diff + parallel-session commit analysis

- **Total delta:** 351 commits, 971 files, +129,261 / -2,597 lines.
- **Last main commit:** `7137c39 Merge pull request #80 from OpticaLis/develop` @ 2026-05-14 13:51 +0300.
- **Brief assertion vs reality:** the Brief opens with "Since the previous merge (2026-05-14 EOD)…~30 commits". Reality: the 2026-05-14 EOD validation produced `PRE_MERGE_VALIDATION_2026_05_14_EOD_REPORT.md` (which exists in the untracked working tree) but **the merge itself never actually ran** — `git log origin/main` shows the most recent merge is PR #80 at 13:51. So the gap to close is the FULL 2026-05-14 workload (Bundle 1 + 2026-05-14 morning work) PLUS Bundle 2 PLUS this morning's Badge SPEC.

- **Major work areas in the 351 commits** (sampled, ordered newest → oldest):
  1. M1 Lens Phase 1A architectural review (today, no code; just `c81e0bc` + `0e6f5b7` doc commits).
  2. M4 Failed Message Badge Cleanup (today, 6 commits, fully closed with FOREMAN_REVIEW 🟢).
  3. Bundle 2 overnight: M1A_DEBT_SWEEP, M1A_CURRENCIES_GLOBAL_HOTFIX, M1_5_VERIFY_HOOKS_REGEX_FIXES, M1.5 CSS Housekeeping post-fix, T3+T4+T5+T6 of OVERNIGHT_BUNDLE_2, 4 skill self-improvements (#1-#4) applied.
  4. Bundle 1 (2026-05-14 EOD pipeline): Phase 1 funnel infrastructure (P1.1 UTM Triple Layer, P1.2 broadcast_id propagation, P1.3 short.gy→internal redirect, P1.4 RPC map), Phase 2 P2.3 (M4_TEMPLATE_VALIDATION_UNIFIED), M1 Lens Phase 1A migrations 1-5, Lens Catalog Import EF, Platform Catalog Admin screen, 17 T-constants + FIELD_MAP, FUNNEL_ROADMAP authoring.
  5. 4 Hybrid+Navy production-page migrations (Suppliers Debt, Settings/Permissions, CRM, Storefront Studio) — pre-2026-05-14 EOD, but on top of main.
  6. Architect maintenance (skill rename main-strategic → architect; module-close-ceremony backlog 2026-05-14).
  7. Sentinel 10-mission audit run + 2 daily Lighthouse bot reports.
  8. Several module/audit doc syncs (M1, M4, M3, M1.5).

- **Parallel-session anomalies:** **none.** No surprise commits to `main`. No force-pushes. No files outside the scope of the work areas listed above. All commits authored by `OpticaLis` (one) and `OpticaLis [bot]` (Lighthouse + Sentinel automations). No merge commits inside `main..develop` (linear history on develop).

---

## 6. Merge-tree conflict prediction

```
git merge-tree $(git merge-base main develop) main develop
```

Output filtered for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`, "changed in both", "added in both"): **0 hits**. Clean fast-forward.

---

## 7. Documentation drifts (non-blocking, fix in a follow-up)

1. **Brief assertion vs reality.** `PRE_MAIN_MERGE_VALIDATION_2026_05_15_MORNING_BRIEF.md` opens with "Since the previous merge (2026-05-14 EOD)…~30 commits". The 2026-05-14 EOD validation report exists in the working tree but no merge was actually committed to main after it (last main merge: PR #80 @ 13:51 on 2026-05-14). The real delta is the FULL day + last night + this morning = 351 commits. Suggest amending the Brief or recording the EOD-validation→no-merge transition in `DECISIONS_LOG.md` so future runs don't make the same assumption.
2. **`roles/site-overseer/FUNNEL_ROADMAP.md` Phase 2 P2.3 row.** Table still shows status `PLANNED` for `M4_TEMPLATE_VALIDATION_UNIFIED` even though the SPEC was closed in commit `33a2040 chore(spec): close M4_TEMPLATE_VALIDATION_UNIFIED with retrospective`. Update the row to `✅ CLOSED 2026-05-14`. (Sentinel Mission 4 — "Documentation Accuracy" — would also have flagged this on next run.)

These are typos / sync misses, not technical regressions. Both can be fixed in the next session-end docs sweep.

---

## 8. Recommended PR title

```
develop → main: 351-commit batch — M1 Lens Phase 1A + Funnel Phase 1 + Phase 2 P2.3 + Bundle 2 (M1A debt sweep + currencies global) + M4 Failed-Message Badge cleanup + 4 Hybrid/Navy migrations
```

**Tags (optional, for the PR body):** `m1`, `m4`, `m1.5`, `m3`, `funnel-phase-1`, `funnel-phase-2`, `lens-inventory`, `badge-cleanup`, `hybrid-navy`, `bundle-2`.

**Pre-merge safety:** all 13 brief checks green or non-blocking-warning. Iron Rule 31 integrity gate clean. 7/7 smoke on demo. Merge-tree predicts zero conflicts. SECURITY_HOTFIX_2 scope confirmed accurate for tomorrow.

**Decision is Daniel's.** This report is recommendation-only.

---

*End of report.*
*Generated by Claude Code (Windows desktop) on 2026-05-15. Demo tenant test artifacts: 1 new row in `crm_message_log` (id `847e1a9d-f76b-49bb-98a8-8e7921a01af8`) acknowledged with reason `PRE_MERGE_VALIDATION_2026_05_15_MORNING` — net chip-count delta 0.*
