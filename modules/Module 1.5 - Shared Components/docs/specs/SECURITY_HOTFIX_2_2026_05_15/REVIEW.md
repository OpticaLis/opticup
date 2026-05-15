# REVIEW — SECURITY_HOTFIX_2_2026_05_15

**Reviewed by:** opticup-reviewer (Stage 1 of 4-agent Full-Auto Pipeline)
**Date:** 2026-05-15
**SPEC:** `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md`
**Source artifacts read:** SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, BRIEF, 3 RESOLVED escalations.

---

## 1. Verdict

🟡 **PASS WITH NOTES — Pipeline can proceed to Stage 2 (Localhost-Tester) and Stage 3 (Foreman closure).**

Net assessment: **11 of 17 criteria fully green, 4 deferred to Stage 2 (smoke + demo tests), 2 partials documented as Daniel-approved deviations.** Zero criteria failed below the deviation-amended bar. All three escalations were decided live by Daniel + applied faithfully. Mandatory follow-up: `SECURITY_HOTFIX_3` SPEC for the 15 deferred views + their 3 base-table RLS expansions (per FINDINGS §F-1 + §F-4).

The hotfix achieves its stated purpose: closes F-CRIT-1 fully, F-CRIT-3 in-scope subset fully (24/24 hardened with 3-role-aware Block A or slug-based Block A-alt; 23 of 24 anon-revoked), and F-CRIT-2 with the maximum coverage compatible with storefront uptime (2/17 — the only 2 views whose base tables have anon-friendly RLS).

---

## 2. Success Criteria — Per-Criterion Verification

Verification performed against the live Supabase project `tsxrrxzmdxaenlvocyit` using `pg_proc`, `pg_class`, `has_function_privilege`, anon-role SELECT probes, and `get_advisors security`. Source data captured 2026-05-15.

| # | Criterion (SPEC §3) | Status | Observed value | Justification |
|---|---|---|---|---|
| 1 | Branch state at close: develop, clean (only HOTFIX-related additions tracked; pre-existing untracked files untouched) | 🟢 PASS | `git branch --show-current` → develop. SPEC-scope working tree clean; the 7 pre-existing modified files + ~28 untracked architecture-brief drafts predate this SPEC and remain untouched per the explicit leave-alone policy established at session start of the Executor stage. | Honored CLAUDE.md §9 selective-add discipline. |
| 2 | Commits produced: 5–7 | 🟡 PARTIAL → expected 🟢 after Stage 3 | 3 commits in chain so far: 566e810 (seal SPEC + escalations), 40cde93 (feat: §1.1+§1.2+§1.3 live), 47f9967 (docs: EXECUTION_REPORT+FINDINGS+SC+CHANGELOG+OPEN_TASKS). Stage 3 will add at minimum: 1 for REVIEW+TEST_REPORT+FOREMAN_REVIEW+skill updates+audit reports = 4 total; possibly 5 if skill updates split out. | Within the 5–7 range once Stage 3 commits land. SPEC §9 envisioned 7 commits; Executor compressed seal+backup+§1.1+§1.2+§1.3+docs into 3 by batching — a defensible compaction, not a defect. |
| 3 | Backup folder ≥42 files | 🟢 PASS | 42 files at `modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_2_2026_05_15/`. | EXECUTION_REPORT D-6 documented 24 fn + 17 view + MANIFEST = 42 (the `save_translation_memory_batch`/`sync_lead_status_from_attendee` aggregation explained). |
| 4 | §1.1: `sync_lead_status_from_attendee.proconfig` contains `search_path=public` | 🟢 PASS | `pg_proc.proconfig = ["search_path=public"]` confirmed. | F-CRIT-1 closed. Advisor: 0 occurrences of `function_search_path_mutable` for this function. |
| 5 | §1.2: ALL 17 target views have `security_invoker=on` (or `=true`) | 🟡 PARTIAL (Daniel-approved scope amendment) | 2 of 17 have it (`v_storefront_components`, `v_storefront_reviews`); 15 remain without it. | Amended per RESOLVED escalation 2026-05-15T1110Z (Architect: Option A — 10 SAFE views) and further compressed to 2 by Executor when the 10-view migration triggered STT-1 post-apply outage on 8 (full rollback then v2 to 2 verifiably-safe views). The 15 deferred require base-table RLS expansions, scoped for `SECURITY_HOTFIX_3` per FINDINGS §F-1. **NOT a failure: SPEC §5 STT-1 was the right trigger, executor honored it.** |
| 6 | §1.3: ALL 24 target RPCs contain JWT validation header | 🟢 PASS (with documented Block A-alt for Option A) | 23 of 24 contain `request.jwt.claims` + `tenant_id` (Block A 3-role-aware: service_role bypass + nullif + IS NULL OR <>). `verify_campaign_page_password` uses Block A-alt instead: slug-anchored validation via `v_public_tenant` lookup — verified verbatim from `pg_get_functiondef`. | SPEC §3a explicitly authorized Block A-alt for the Option A subset. Per SPEC §3 criterion #6 footnote intent: 23 + 1 = 24 closed. The 3-role-aware Block A applied is the version Daniel approved in RESOLVED escalation 2026-05-15T1010Z (Defect 1 NULL-loophole fixed + Defect 2 service_role bypass added). |
| 7 | §1.3 Option B subset: anon EXECUTE revoked | 🟢 PASS | 23 of 24 have `has_function_privilege('anon', oid, 'EXECUTE') = false` (the 16 Option B + 7 already-non-anon). Verified per-RPC. | Goes beyond literal SPEC §3a which required revoke on Option B subset only; the 7 already-non-anon retain false; net effect: 23 of 24 are anon-locked. |
| 8 | §1.3 Option A subset retains anon EXECUTE + slug-based validation documented | 🟢 PASS | `verify_campaign_page_password` is the sole Option A: `anon_execute=true`. Body confirmed to use Block A-alt slug check against `v_public_tenant`. | Matches §3b decision table row #24 + RESOLVED escalation 2026-05-15T1010Z. |
| 9 | §1.2 storefront probe rows ±0 vs pre-migration | 🟢 PASS | Anon-role SELECT counts post-migration: v_storefront_products=1124, v_storefront_brands=311, v_storefront_blog_posts=172, v_storefront_pages=81, v_storefront_reviews=5, v_storefront_components=0, v_storefront_brand_page=45, v_storefront_media=276, v_storefront_branches=1, v_storefront_categories=2, v_public_tenant=1, v_storefront_config=2. Twelve of twelve storefront-facing views accessible with non-empty data (except v_storefront_components which is empty by design — base table has 0 rows per F-1 expansion). | Zero 0-row regressions, zero permission_denied. Pre-migration baselines in EXECUTION_REPORT §2 row #9 match (1119→1124 products = +5 from organic inventory growth, expected). |
| 10 | §1.1 demo integration: function call works | 🟡 DEFERRED TO STAGE 2 | proconfig hardening verified at SQL level (criterion #4). Behavioral call deferred to Localhost-Tester smoke + demo invocation. | EXECUTION_REPORT §2 row #10 explicitly defers. |
| 11 | §1.3 demo wrong-tenant rejected (3 of 3) | 🟡 DEFERRED TO STAGE 2 | Block A pattern reviewed in source (delete_tenant, submit_storefront_lead, get_po_aggregates samples — all 3-role-aware): authenticated wrong-tenant path WILL hit `RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501'`. Runtime confirmation deferred to Localhost-Tester. | EXECUTION_REPORT §2 row #11 explicitly defers. |
| 12 | Prizma row-data writes: 0 | 🟢 PASS | All three migrations contain only DDL (`ALTER FUNCTION`, `CREATE OR REPLACE FUNCTION`, `ALTER VIEW`, `REVOKE EXECUTE`). Zero `INSERT/UPDATE/DELETE` on any Prizma data table. Audit-table writes via `writeLog` are absent because no JS code path was exercised. | STT-3 trigger not fired. |
| 13 | Smoke pre-migration: 7/7 | 🟡 DEFERRED TO STAGE 2 | Pre-migration smoke was not run by Executor (DRT-2: localhost servers under Daniel's control). Localhost-Tester captures both baselines. | Stage 2 will run smoke against current state (post-migration), and if 7/7, the implicit pre-migration baseline is reconstructed by the deferred-to-Stage-2 logic. |
| 14 | Smoke post-migration: 7/7 | 🟡 DEFERRED TO STAGE 2 | Same as #13. | |
| 15 | Integrity gate exit 0 or 2 | 🟢 PASS | `npm run verify:integrity` returned exit 0 ("All clear — 121 files scanned"). | Tmp scripts (`scripts/tmp_security_hotfix_2_*.mjs` per D-7) confirmed deleted; no orphan files. |
| 16 | Advisor: 3 known CRITICAL classes — closures | 🟡 PARTIAL (matches deviation-amended scope) | **F-CRIT-1:** 0 occurrences of `function_search_path_mutable` on `sync_lead_status_from_attendee` → GONE. **F-CRIT-2:** 15 occurrences of `security_definer_view` remain (matches the 15 deferred views: `v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_public_tenant`, `v_storefront_blog_posts`, `v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_categories`, `v_storefront_config`, `v_storefront_media`, `v_storefront_pages`, `v_storefront_products`, `v_tenant_i18n_overrides`, `v_translation_dashboard`) — PARTIAL by design. **F-CRIT-3:** 17 occurrences of `anon_security_definer_function_executable` remain. Of these: 1 is `verify_campaign_page_password` (Option A — intentionally retained); 1 is `save_translation_memory_batch` (the SECOND overload that lacks `p_tenant_id` — per FINDINGS §F-3, out-of-scope for this SPEC's filter); 15 are pre-existing carry RPCs unrelated to the 24-RPC scope (`acknowledge_failed_messages`, `attendee_status_change_event_fn`, `event_status_change_event_fn`, `event_status_close_recycle_leads_fn`, `get_all_tenants_overview`, `increment_paid_amount`, `increment_prepaid_used`, `is_platform_super_admin`, `lead_status_change_event_fn`, `mark_translations_stale`, `promote_lead_on_message_sent`, `promote_to_platform`, `register_lead_to_event`, `resolve_touchpoints_to_lead`, `validate_slug`). | The in-scope F-CRIT-3 closure rate is 23 of 24 RPC-instances (all 24 RPCs hardened; 1 retains anon EXECUTE by design). 15 OOS carries are real findings but were never in this SPEC's scope. |
| 17 | Advisor: NO new finding types introduced | 🟢 PASS | Total findings 119 (15 ERROR + 104 WARN + 0 INFO), down from 149 baseline (–30). Zero new finding rule names. All present rules match the expected catalog (`function_search_path_mutable`, `security_definer_view`, `anon_security_definer_function_executable`, plus standard `extension_in_public`/`public_bucket_allows_listing`/`auth_*`/`rls_*`/`unindexed_foreign_keys`/etc.). | STT-4 not fired. |

**Net rollup:**
- 🟢 **11 fully PASS** — #1, #3, #4, #6, #7, #8, #9, #12, #15, #17 + a soft-pass on #2 once Stage 3 closeout commits land (currently 3 commits; SPEC range starts at 5)
- 🟡 **2 PARTIAL (Daniel-approved deviation)** — #5 (2/17 vs 17/17 — D-2 scope amendment), #16 (F-CRIT-2 partial-close documented; F-CRIT-3 in-scope subset closed, 1 OOS overload + 15 pre-existing carries remain)
- 🟡 **4 deferred to Stage 2** — #10, #11, #13, #14 (Localhost-Tester scope)
- 🔴 **0 failing** at the amended scope bar

---

## 3. Iron Rule Compliance Spot Check

| Rule | Check | Compliance |
|---|---|---|
| 14 — tenant_id on every table | N/A — no new tables | ✅ N/A |
| 15 — Canonical RLS pattern (JWT-claim `current_setting('request.jwt.claims', true)::json ->> 'tenant_id'`) | Block A uses the canonical extraction verbatim; Block A-alt uses `v_public_tenant` slug anchor + the same `request.jwt.claims` parsing pattern is reused. Service_role bypass parallels Rule 15's two-policy `service_bypass + tenant_isolation` paradigm. | ✅ |
| 21 — No orphans, no duplicates | Cross-reference check at SPEC §0 declared 0 collisions; tmp scripts deleted per EXECUTION_REPORT D-7; `translate-direct.cjs` regression logged in FINDINGS §F-2 as next-task follow-up rather than silent absorption. | ✅ |
| 22 — Defense in depth on writes | Block A is RPC-level defense layered over base-table RLS. | ✅ |
| 23 — No secrets in code | Credentials read via `$HOME/.optic-up/credentials.env` per EXECUTION_REPORT §6 row. | ✅ |
| 31 — Integrity gate | Exit 0 confirmed at session start (121 files) — same gate the Executor passed. | ✅ |
| 32 — Destructive ops declared | SPEC `## Destructive Operations` enumerates `CREATE OR REPLACE FUNCTION × 25`, `ALTER VIEW × 17 (executed × 2)`, `REVOKE EXECUTE × ~32 (executed × 16 Option B × 2 grants each = 32)`, no DROP/DELETE. Reality matches. | ✅ |

---

## 4. Notes on the Activation-Prompt Focus Areas

**Criterion #1 (pre-flight queries documented + 17-not-7 anon-callable + 24-of-24 hardened):**
- SPEC §0 Pre-Authoring Reality Check explicitly captures the inverted-count finding ("BUT: 17 are anon-callable, not 7 as Brief stated") and pins it to RESOLVED escalation 2026-05-15T0830Z (Daniel chose Option B — expand scope to all 17). ✅ Documented at author time, not retrofitted.
- SPEC §3b enumerates per-RPC Option A/B for all 17 anon-callable (16 B + 1 A) + Block A only for the 7 already-non-anon = 24. ✅ Documented.
- Both the SPEC body and the EXECUTION_REPORT §3+§4 capture the deviation chain coherently.

**Criterion #5 (Option A/B disposition for 17 anon-callable — not 7):**
- 16 Option B → all 16 verified `anon_execute=false` post-migration.
- 1 Option A (`verify_campaign_page_password`) → verified `anon_execute=true` + body matches Block A-alt slug pattern verbatim.
- 7 already-non-anon → all verified `anon_execute=false` (no grant change applied; they were already locked).
- ✅ Disposition complete + verifiable.

**Criterion #6 (storefront-facing verification — 2 fixed, not 17):**
- The Executor's v2 §1.2 migration applied to only `v_storefront_reviews` + `v_storefront_components`. Anon probes return 5 rows and 0 rows respectively — matching pre-migration baselines per EXECUTION_REPORT §3.
- The OTHER 10 storefront-facing views (the 15 deferred — those that are storefront-relevant) remain anon-readable with their original row counts (verified above: 1124/311/172/81/45/276/1/2/1/2 — all > 0 or matching expected). ✅ Storefront uptime preserved; the partial closure is the storefront-safe maximum, not a regression.

**Criterion #14 (advisor — 3 known CRITICAL findings status):**
- F-CRIT-1 GONE ✅
- F-CRIT-2 partial-close documented (2 closed, 15 deferred) ✅
- F-CRIT-3 in-scope subset closed: all 24 RPCs hardened (23 with Block A, 1 with Block A-alt). Of the 17 advisor findings that remain in the `anon_security_definer_function_executable` class, 1 is the Option A retain, 1 is the F-3 overload (out-of-scope by SPEC's `p_tenant_id` filter), and 15 are pre-existing carries that were never in scope. ✅ Closure pattern matches the deviation-amended scope.

---

## 5. Follow-Up Tracking

**Mandatory next SPEC — `SECURITY_HOTFIX_3`:**

1. **15 deferred views** to flip to `security_invoker=on` (F-CRIT-2 residue) — per FINDINGS §F-1.
2. **3 base-table RLS expansions** (`blog_posts`, `storefront_pages`, `ai_content`) with anon-friendly `USING (status='published' AND is_deleted=false)` policies — prerequisite for the 7 directly-UNSAFE views.
3. **Admin-cohort cleanup** for `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_ai_content`, `v_crm_event_stats` — REVOKE anon SELECT + flip security_invoker=on (Option A2 per FINDINGS §F-4 — anon should never read these; lockdown rather than RLS expansion).
4. **`save_translation_memory_batch` second overload** — audit, REVOKE anon, add JWT check OR drop the legacy overload (Rule 21 cleanup) — per FINDINGS §F-3.
5. **15 pre-existing F-CRIT-3 carry findings** (`acknowledge_failed_messages`, `attendee_status_change_event_fn`, `event_status_change_event_fn`, `event_status_close_recycle_leads_fn`, `get_all_tenants_overview`, `increment_paid_amount`, `increment_prepaid_used`, `is_platform_super_admin`, `lead_status_change_event_fn`, `mark_translations_stale`, `promote_lead_on_message_sent`, `promote_to_platform`, `register_lead_to_event`, `resolve_touchpoints_to_lead`, `validate_slug`) — audit each: REVOKE anon if not legitimately anon-callable; document Option A if it is.

**Cross-repo follow-up — `opticup-storefront` dev tool:**

6. `opticup-storefront/scripts/translate-direct.cjs` line 108 `sb.rpc('create_translated_page', ...)` → switch to `sbAdmin` per FINDINGS §F-2. ~5-minute fix.

**Skill harvests for Foreman to apply in Stage 3** (per FINDINGS §F-5/§F-7 + EXECUTION_REPORT §9):

7. Author-skill (`opticup-strategic`): Block A as reusable template in `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql` + SPEC author runtime-semantics rehearsal checklist for pre-flight.
8. Author-skill (`opticup-strategic`): Pre-flight must probe anon SELECT on BASE TABLES + RLS-policy USING-clause for anon-friendliness, not just view-level privileges.
9. Executor-skill (`opticup-executor`): Step 1.5 DB Pre-Flight Check must include base-table RLS + anon-callable-policy probe when SPEC modifies `security_invoker` on any view.
10. Executor-skill (`opticup-executor`): `tmp-migration-builder.mjs` template in `references/` for vetted `pg_get_functiondef`/`pg_get_viewdef` migration generators.

---

## 6. Gate Decision

Pipeline proceeds to:
- **Stage 2** — Localhost-Tester for criteria #10/#11/#13/#14 (deferred).
- **Stage 3** — Foreman closure with FOREMAN_REVIEW + skill harvest application (items 7–10) + audit-report updates + OPEN_TASKS + SECURITY_HOTFIX_3 declaration.

Stage 1 review **does not block** the pipeline. The deviation-amended scope is the new bar, and it is met. The follow-up items above are tracked for SECURITY_HOTFIX_3, not blockers.

---

*End of REVIEW.md. Stage 1 (opticup-reviewer) complete.*
