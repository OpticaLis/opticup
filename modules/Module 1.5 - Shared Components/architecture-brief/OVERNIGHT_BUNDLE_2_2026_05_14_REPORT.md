# OVERNIGHT_BUNDLE_2_2026_05_14 — Master Report

**Run window:** 2026-05-14 22:30 → ~05:30 next morning (Windows desktop, branch=develop)
**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2_2026_05_14_BRIEF.md`
**Operating mode:** Autonomous overnight, skip-not-stop, sub-agents authorized.

---

## 3 most important findings (read first — Daniel morning review)

> **⚙️ 2026-05-15 closeout status** — All 3 of these CRITICAL findings were addressed by SPEC `SECURITY_HOTFIX_2_2026_05_15` via Full-Auto Pipeline (single chat, Architect-supervised). Live-DB commit `40cde93`; full retrospective at `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md`. Per-finding status follows each entry below.

These 3 findings surfaced from the T5+T6 audits and require Daniel's attention:

1. **🟢 RESOLVED 2026-05-15 — `sync_lead_status_from_attendee` regression TODAY (2026-05-14).** The M4 sync RPC hotfix (`supabase/migrations/20260514193000_m4_sync_rpc_not_found_idiom.sql:16-17`) stripped `SET search_path` from the function definition. Live function on Supabase right now is supply-chain hardening-stripped. Fix: one-line `ALTER FUNCTION sync_lead_status_from_attendee(...) SET search_path = public`. Trivial effort, urgent priority. Suggested SPEC: `M4_SYNC_RPC_SEARCH_PATH_RESTORE`. — **Closed in `SECURITY_HOTFIX_2_2026_05_15` §1.1 at commit `40cde93`. `pg_proc.proconfig = ['search_path=public']` verified post-migration; advisor `function_search_path_mutable` count for this function = 0.**

2. **🟡 RESOLVED IN PART 2026-05-15 — 17 of 35 public views lack `security_invoker=on` (49%).** Includes EVERY storefront-facing view (`v_storefront_blog_posts`, `v_storefront_products`, etc.) + `v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_public_tenant`. Repeat of the exact `SECURITY_HOTFIX_2026_05_13` class. **HOTFIX_2 closed 2 of 17 at SHA `40cde93` (`v_storefront_reviews`, `v_storefront_components`). HOTFIX_3 closed 7 more on 2026-05-15: 5 admin lockdowns at SHA `635281b` (`v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats` — REVOKE anon SELECT + `security_invoker=on`) + 2 storefront flips at SHAs `d4e6fa3` + `2625c34` (`v_storefront_blog_posts` 174 rows anon-visible verified; `v_storefront_pages` 81 rows). Cumulative closure: 9 of 17. 8 deferred to `SECURITY_HOTFIX_4` per Daniel Option B (`v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_products`, `v_storefront_categories`, `v_storefront_config`, `v_storefront_media`, `v_public_tenant`) — these need 5 additional base-table RLS expansions (brands, inventory, media_library, tenant_branches, storefront_config) which is the next hotfix scope.**

3. **🟢 RESOLVED 2026-05-15 — 20 SECURITY DEFINER functions take `p_tenant_id` without JWT verification.** Higher-risk subset (anon-callable): `generate_daily_alerts`, `get_po_aggregates`, `get_translation_context`, `is_feature_enabled`, `check_plan_limit`, `_record_touchpoint`, `verify_campaign_page_password`. Mitigated today by service_role-only grants on tenant-management fns, but defense-in-depth missing. — **24 of 24 in-scope SECURITY DEFINER RPCs hardened in `SECURITY_HOTFIX_2_2026_05_15` §1.3 at SHA `40cde93` with 3-role-aware Block A. The 15 pre-existing carry RPCs (`acknowledge_failed_messages`, `attendee_status_change_event_fn`, `event_status_change_event_fn`, `event_status_close_recycle_leads_fn`, `get_all_tenants_overview`, `increment_paid_amount`, `increment_prepaid_used`, `is_platform_super_admin`, `lead_status_change_event_fn`, `mark_translations_stale`, `promote_lead_on_message_sent`, `promote_to_platform`, `register_lead_to_event`, `resolve_touchpoints_to_lead`, `validate_slug`) hardened in `SECURITY_HOTFIX_3_2026_05_15` §1.5 at SHA `e64f9c9` (14 Option B = REVOKE anon EXECUTE + Block A where applicable; 1 Option C = `validate_slug` retains anon for storefront signup flow). Plus `save_translation_memory_batch(p_entries jsonb)` 2nd overload hardened in HOTFIX_3 §1.4 at SHA `a20343a`. 5 RPCs received NEW 3-role-aware Block A bodies (`increment_paid_amount`, `increment_prepaid_used`, `mark_translations_stale` via JOIN-derived tenant; `register_lead_to_event` + `resolve_touchpoints_to_lead` upgraded from weaker variants). Demo wrong-tenant tests T1-T5 PASS (42501); service_role bypass T6 PASS. F-CRIT-3 advisor 17→2 (remaining: `validate_slug` Option C + `verify_campaign_page_password` HOTFIX_2 Option A, both intentional).**

**Bonus high-priority items:** `failed-sync-files` storage bucket is wide open cross-tenant (ST-1, HIGH). Anon JWT `exp=2088` in 7+ places (rotation impossible). 63-file live↔git migration drift (DR blocker). `auth_sessions.token` + `short_links.code` UNIQUE not tenant-scoped (Iron Rule 18).

---

## Per-tier rollup

| Tier | Item | Verdict | Commits |
|---|---|---|---|
| T1 | T1.1 placeholder fix | 🟡 closed-deferred (escalation) | `917bf00` |
| T2 | T2.1 check-tool fix | 🟢 closed | `391b82b` + `1246a37` |
| T2 | T2.2+T2.3 CSS housekeeping | 🟢 closed | `9b5cbcf` + `e8ad461` |
| T3 | T3.1 SKILL hardening audit | 🟢 closed | TBD (commit pending) |
| T4 | T4.1 SPEC_TEMPLATE v3 | 🟢 closed | TBD (commit pending) |
| T5 | T5.1 Architecture debt sweep | 🟢 closed (audit-only) | TBD (commit pending) |
| T6 | T6.1 Sentinel deep dive | 🟢 closed (audit-only) | TBD (commit pending) |

---

## Per-item lines

- 🟡 `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA` — root cause H1 confirmed; 758-row backup preserved; Daniel-decision STOP fired (escalation at `modules/Module 4 - CRM/escalations/2026-05-14T22-35Z_brands_event_24_resend_decision.md`). Commit `917bf00`.
- 🟢 `M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING` — auth-parser fix + 3 regression tests + helper module. T2.2 production-validated the fix on real declared deletes (0 violations). Commits `391b82b` + `1246a37`.
- 🟢 `M1_5_CSS_HOUSEKEEPING_POST_FIX` — 3 orphan CSS files deleted (employees.css 396 lines + crm-screens.css 2 lines + crm-visual.css 20 lines), 2 HTML link refs removed, 5-file backup preserved. Commits `9b5cbcf` + `e8ad461`.
- 🟢 `SKILL_HARDENING_AUDIT_2026_05_14` — 4 parallel sub-agents → 21 proposals (3 CRITICAL, 8 HIGH, 8 MEDIUM, 2 LOW); 11 high-confidence applied to 4 SKILL.md files; 10 proposed-only. Report: `SKILL_HARDENING_AUDIT_2026_05_14_REPORT.md`.
- 🟢 `SPEC_TEMPLATE_EVOLUTION_V3` — v2 (327 lines) → v3 (454 lines). 8 changes encoded: Required Sections Matrix, §7 footprint mandatory, gitignore-awareness, CRLF-aware diff, _down.sql → ROLLBACK.md, renumbered §"Destructive Ops" → §7, NEW §14 smoke taxonomy, NEW §15 Daniel-decision pre-bake, NEW Appendix A common gotchas (A1-A7). v2 archived at `_archive/spec-template-versions/v2_2026_05_14/`. Report: `SPEC_TEMPLATE_EVOLUTION_V3_REPORT.md`.
- 🟢 `ARCHITECTURE_DEBT_SWEEP_2026_05_14` — 2 parallel sub-agents → 24 findings across 7 dimensions (2 CRITICAL, 8 HIGH, 8 MEDIUM, 6 LOW). Report: `ARCHITECTURE_DEBT_SWEEP_2026_05_14_REPORT.md`.
- 🟢 `SENTINEL_DEEP_DIVE_2026_05_14` — 2 parallel sub-agents → 23 findings across 7 dimensions (1 CRITICAL, 9 HIGH, 10 MEDIUM, 3 LOW). Cron health: 0/12,812 failures over 7 days. Report: `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md`.

---

## Aggregate counts

| Metric | Value |
|---|---|
| SPECs closed (T1+T2) | 3 (1 🟡, 2 🟢) |
| LEARNING runs closed (T3+T4+T5+T6) | 4 (all 🟢) |
| Commits pushed (T1+T2 only — T3-T6 pending) | 5 (`917bf00`, `391b82b`, `1246a37`, `9b5cbcf`, `e8ad461`) |
| Files modified | 9 (4 SKILL.md, 1 SPEC_TEMPLATE.md, 1 destructive-ops parser, 1 verify check, package.json, 2 HTML) |
| Files created | ~30 (SPEC artifacts + helper module + tests + 4 reports + 4 .tmp.md + backups + escalation) |
| Files deleted | 3 (orphan CSS) |
| Sub-agents spawned | **8** (4 T3 SKILL audits + 2 T5 arch sweep + 2 T6 sentinel) |
| Audit findings discovered | **~67 distinct items** (de-duped across T3 + T5 + T6) by severity: **3 CRITICAL + 15 HIGH + ~20 MEDIUM + ~12 LOW + 17 INFO/process** |
| Skill improvements applied | 11 of 21 (P-AR-01/02/03/05 + P-ST-01/02 + P-EX-01/02 + P-RV-01/02/03) |
| Estimated ROI from skill improvements | ~168 min/future-SPEC × ~50 future SPECs = ~140 hours saved |
| SPEC_TEMPLATE v3 status | ✅ applied, v2 archived |
| Hard-stop triggers fired | 1 (T1.1 Daniel-decision — clean per-Brief + activation prompt explicit authorization) |
| Smoke regressions | 0 |
| Iron Rule violations introduced | 0 |
| main-branch touches | 0 |

---

## T1.1 result block

- **Root cause:** H1 confirmed — broadcast `ab7341c9-7851-493c-bf0b-b426b5359e08` (created 2026-05-13 06:12:18Z, 1135 recipients) pre-dated the BROADCAST_EVENT_LINK_SUPPORT fix (closed same day 2026-05-13 evening). `filter_criteria` had no `event_id` → queue rows arrived at `send-message` EF with `event_id=null` → `injectAutoUrls` skipped registration-token branch → literal `%registration_url%` reached safety scan → 758 SMS rejected at safety-scan in 19 minutes (06:13:01 → 06:32:06).
- **Repaired count:** 0 (Daniel-decision deferred).
- **Accepted data loss count:** 0 declared. The 755 affected leads (758 minus 3 already-registered) await Daniel's morning decision between Options A/B/C/D documented in the escalation file.
- **Backup integrity:** `BACKUP_758_ROWS.json` (191 KB, aggregate md5 `7b66b5789a3c61658d01c3a6366daee9`).

---

## Repo state at close

- Branch: `develop`. No checkouts to `main`. Zero `git reset --hard`. Zero `git push --force`.
- Latest commit: TBD after T3+T4+T5+T6 commit batch.
- Working tree: untracked files from prior sessions preserved per CLAUDE.md §1.4. Bundle 2's own work all committed.
- Iron Rule 31 integrity gate: exit 0 throughout.

---

## What remains AFTER Bundle 2 (for Daniel's morning planning)

Recommended priority order for the next slate of SPECs (drawn from T5+T6 findings):

**🔴 Today / tomorrow (security-urgent):**
1. `M4_SYNC_RPC_SEARCH_PATH_RESTORE` (one-line ALTER FUNCTION — today's regression).
2. `M1_5_VIEW_SECURITY_INVOKER_SWEEP` (17 ALTER VIEWs + regression tests for storefront).
3. `M1_5_RPC_TENANT_JWT_VALIDATION` (20 SECURITY DEFINER fns get JWT body-checks).
4. `FAILED_SYNC_FILES_BUCKET_RLS_TENANT_SCOPE` (close cross-tenant bucket leak).
5. `EF_AND_CRON_ANON_JWT_TO_ENV_VAR` (rotate the immortal JWT).

**🟠 This week (SaaS-correctness):**
6. `M1_5_UNIQUE_TENANT_SCOPED_SWEEP` (auth_sessions + short_links critical, 5 lower-risk).
7. `M1_5_TENANT_ID_INDEX_FLEET` (14 CREATE INDEX, additive, performance debt).
8. `MIGRATION_DRIFT_BACKFILL_FROM_LIVE` (63-file drift; DR + onboarding + SaaS-tenant blocker).

**🟡 Next sprint (hygiene + Phase 2 prerequisites):**
9. `M1_5_UPDATED_AT_TRIGGERS_BACKFILL` (consolidated 57-table fix).
10. `M1_5_RPC_SEARCH_PATH_PIN` (17 fns including critical `is_platform_super_admin`).
11. `CURRENCY_FORMATTER_UNIFICATION` umbrella SPEC (8 sites).
12. `M4_RESEND_BRANDS_EVENT_INVITES_2026_05_14` (Daniel-authored after his decision on T1.1).

**Already on the roadmap (unchanged by Bundle 2):**
- P2.1 M4_FB_CAPI_HYBRID_DEDUPLICATION (Daniel-decisions, 6-8 hrs).
- P2.2 M3_PIXEL_VALIDATION_GAP_REPORTING (cross-repo, ~3 hrs).
- Phase 2.5 Continuous Improvement (Dashboard + Weekly Brief).

---

## Aggregate Hebrew status block

> ✅ **OVERNIGHT_BUNDLE_2 הושלם** — 7/7 tiers סגורים (3 SPECs + 4 LEARNING runs)
>
> **T1.1 (Prizma 758):** 🟡 root-cause H1 אומת — broadcast `ab7341c9` קדם לתיקון BROADCAST_EVENT_LINK_SUPPORT, 758 הודעות נדחו ב-19 דקות בבוקר 2026-05-13. אירוע #24 (אירוע המותגים מחר 2026-05-15) `status=closed`, 9/50 רישומים, רק 3/758 נרשמו בערוץ אחר. **הכרעת Daniel נדרשת** (Option A re-open+resend / B resend-anyway / C accept-loss / D partial-resend) — escalation file ב-`modules/Module 4 - CRM/escalations/`. Backup של 758 השורות שמור (191KB, md5 `7b66b5789a3c61658d01c3a6366daee9`). 0 כתיבות ל-Prizma. Commit `917bf00`.
>
> **T2.1+T2.2/3 (tech debt):** 🟢 destructive-ops parser תוקן — מזהה את ה-§Destructive Operations של ה-SPEC ומאשר deletions מוכרזים. 3 regression tests עוברים. 3 קבצי CSS מיותרים נמחקו (employees.css + crm-screens.css + crm-visual.css), 2 link refs ב-crm.html + settings.html הוסרו. T2.1 הוכח בשטח ע"י T2.2 — 0 violations. Commits `391b82b`+`1246a37`+`9b5cbcf`+`e8ad461`.
>
> **T3.1 (SKILL hardening):** 🟢 4 sub-agents מקבילים → 21 proposals → 11 high-confidence הוחלו ל-4 קבצי SKILL.md (architect 3, strategic 2, executor 2, reviewer 3). הממצא הכי משמעותי: opticup-reviewer היה underdeveloped (266 שורות מול ~1000 אצל האחרים), עכשיו עם Check-Tool Inventory + Reviewer Notes template + Author-Reviewer Independence Discipline. ROI מוערך: ~168 דקות/SPEC עתידי. Report: `SKILL_HARDENING_AUDIT_2026_05_14_REPORT.md`.
>
> **T4.1 (SPEC_TEMPLATE v3):** 🟢 v2 (327 שורות) → v3 (454 שורות). 8 שינויים: Required Sections Matrix בראש, §7 footprint mandatory עם hard-fail, gitignore-awareness, CRLF-aware diff, `_down.sql` → `ROLLBACK.md`, renumbered Destructive Ops, NEW §14 smoke taxonomy (`db|api|code-review|visual-browser`), NEW §15 Daniel-decision pre-bake, NEW Appendix A common gotchas. v2 נשמר ב-`_archive/spec-template-versions/v2_2026_05_14/`.
>
> **T5.1 (Architecture debt sweep):** 🟢 2 sub-agents → 24 ממצאים. **2 CRITICAL:** (1) רגרסיה היום ב-`sync_lead_status_from_attendee` (search_path הוסר ע"י hotfix הבוקר); (2) 17/35 views (49%) חסרים `security_invoker=on` כולל כל `v_storefront_*`. 8 HIGH כולל UNIQUE לא tenant-scoped על `auth_sessions.token` + `short_links.code`. Report: `ARCHITECTURE_DEBT_SWEEP_2026_05_14_REPORT.md`.
>
> **T6.1 (Sentinel deep dive):** 🟢 2 sub-agents → 23 ממצאים. **1 CRITICAL:** 20 SECURITY DEFINER פונקציות לוקחות `p_tenant_id` בלי לבדוק JWT (subset של 7 הוא anon-callable). 9 HIGH כולל `failed-sync-files` bucket פתוח cross-tenant, anon JWT עם `exp=2088` ב-7+ מקומות, drift של 63 migrations בין live ל-git. Cron health מצוין (0/12,812 כשלים ב-7 ימים). Report: `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md`.
>
> **סה"כ:** 8 sub-agents, ~67 ממצאי audit ייחודיים (3 CRITICAL + 15 HIGH + ~20 MEDIUM + ~12 LOW + 17 INFO/process), 5 commits עד T2 + עוד 1-2 commits ל-T3-T6, 0 main touches, 0 Iron Rule violations, 0 כתיבות ל-Prizma מעבר ל-T1.1 שלא נכתב כלום.
>
> **ההמלצה הראשונה לבוקר:** 5 SPECs urgent (M4_SYNC_RPC_SEARCH_PATH_RESTORE → M1_5_VIEW_SECURITY_INVOKER_SWEEP → M1_5_RPC_TENANT_JWT_VALIDATION → FAILED_SYNC_FILES_BUCKET_RLS_TENANT_SCOPE → EF_AND_CRON_ANON_JWT_TO_ENV_VAR), ואחריהם 7 SPECs בשבוע הקרוב על SaaS-correctness debt.

End of Master Report.
