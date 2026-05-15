# FOREMAN_REVIEW — SECURITY_HOTFIX_2_2026_05_15

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-05-15
> **Reviews:** `SPEC.md` (author: Foreman, 2026-05-15) + `EXECUTION_REPORT.md` (Executor, 2026-05-15) + `FINDINGS.md` (Executor, 7 findings) + `REVIEW.md` (Reviewer, Stage 1) + `TEST_REPORT.md` (Localhost-Tester, Stage 2)
> **Commit range reviewed:** `566e810..47f9967` (3 commits in this SPEC's chain; closeout commits queued below)

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

Three production-CRITICAL findings (F-CRIT-1, F-CRIT-2, F-CRIT-3) addressed end-to-end via Full-Auto Pipeline in a single Architect-supervised chat. F-CRIT-1 and F-CRIT-3 closed completely within scope. F-CRIT-2 closed for the 2 storefront-safe views; 15 require base-table RLS expansion and are scoped to the mandatory `SECURITY_HOTFIX_3` follow-up below. Three live escalations resolved by Daniel; all three decisions honored faithfully in execution. Zero Iron Rule violations, zero Prizma data writes, smoke 7/7 PASS, advisor delta clean (no new finding types; 119 total vs 149 baseline = –30).

The 🟡 (not 🟢) is mandatory because §5 Hard-Fail Rules apply: F-CRIT-2 follow-up work exists and is non-trivial (`SECURITY_HOTFIX_3` scoped here in §10). The SPEC's own §3 criterion #5 is partial — that's the documentation drift the rules guard against.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | §1 Goal is one paragraph naming all three findings + the closure mechanism |
| Measurability of success criteria | 4 | 17 criteria, all with specific Verify commands. Loses 1 for criterion #5 wording (`ALL 17`) which forced a deviation amendment rather than declaring per-view fall-through paths upfront |
| Completeness of autonomy envelope | 4 | §4 explicitly enumerates STOP triggers + can-do permissions. Loses 1 for not pre-baking the "Block A NULL-loophole" semantics rehearsal that escalation #2 exposed |
| Stop-trigger specificity | 5 | STT-1 through STT-5 each cite an exact condition + downstream action |
| Rollback plan realism | 5 | §6 per-area rollback recipes; backup folder co-located + tested in-flight (the §1.2 v1 rollback executed cleanly when STT-1 fired) |
| Expected final state accuracy | 3 | §8 was authored under the assumption that all 17 §1.2 views were safe to flip + that Block A as literally written would block anon. Reality diverged on both. EXECUTION_REPORT D-1 + D-2 are real defects against §8 accuracy |
| Commit plan usefulness | 4 | §9's 7-commit sequence compressed to 3 by Executor batching seal/§1.1/§1.2/§1.3/docs — a defensible compaction but the §9 plan should have allowed for batching explicitly |

**Average score:** 4.3/5.

**Weakest dimension + why:** Expected Final State accuracy (3/5). The SPEC's §1.2 pre-flight enumerated 17 view names but did not probe BASE-TABLE anon-SELECT privilege or anon-friendly RLS policies. The resulting Cohort A/B/C classification only emerged at execution time through STT-1. Author-side runtime-semantics rehearsal would have caught both Block A's NULL loophole and the security_invoker storefront break **before** dispatching. Both deficiencies are addressed in §6 below.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 4 | Stayed in scope on §1.1 + §1.3. §1.2 expanded then contracted under escalation — Daniel-approved each time. D-4 (collateral search_path hardening) is a documented +scope addition the Foreman blesses retroactively (within the SPEC's own search_path-hardening spirit) |
| Adherence to Iron Rules | 5 | Zero violations. Tmp scripts (D-7) deleted before commit per Rule 31; `translate-direct.cjs` regression logged in F-2 per Rule 21 (no silent absorption) |
| Commit hygiene (one-concern, proper messages) | 4 | 3 commits in this SPEC's chain, well-scoped messages (chore(spec) / feat(security) / docs(security)). Loses 1 for compressing 7 planned commits into 3 — defensible but the §9 plan and reality should match better next time |
| Handling of deviations (stopped when required) | 5 | All 3 escalations correctly fired at STOP-triggers (STT-1 for storefront outage; SPEC §3a-defect for Block A; pre-flight count inversion for the Brief). Each escalation file is well-structured, evidence-rich, and pinned to Daniel's decision verbatim |
| Documentation currency (MODULE_MAP, MASTER_ROADMAP, etc.) | 4 | M1.5 SESSION_CONTEXT + CHANGELOG updated in commit 47f9967. OPEN_TASKS updated. GLOBAL_MAP + GLOBAL_SCHEMA not touched (no new objects). MASTER_ROADMAP not updated (this is a hotfix, not a phase boundary) — correct per §10 Integration Ceremony rules. Loses 1 for needing this REVIEW to declare SECURITY_HOTFIX_3 in OPEN_TASKS, not the Executor's closeout commit (slight latency) |
| FINDINGS.md discipline (logged vs absorbed) | 5 | 7 distinct findings logged (1 HIGH F-1 → mandatory next SPEC, 2 LOW, 3 INFO, 1 PROCESS). Zero absorbed. F-3 (`save_translation_memory_batch` second overload) is the kind of issue easily glossed over — it was logged. |
| EXECUTION_REPORT.md honesty + specificity | 5 | D-1 through D-7 all named, with line-level evidence and the Daniel decision pinned to a timestamp. §7 "What Would Have Helped Me Go Faster" is the most actionable feedback section across recent FOREMAN_REVIEWs — proposals #1 + #2 in §9 are concrete and verifiable |

**Average score:** 4.6/5.

**Did executor follow the autonomy envelope correctly?** YES.
**Did executor ask unnecessary questions?** Zero. The 3 escalations were SPEC-mandated STOPs, not autonomy hesitation.
**Did executor silently absorb any scope changes?** NO. D-4 (collateral search_path hardening on 7 RPCs) is documented as an "in-spirit" scope expansion + explicitly named in EXECUTION_REPORT D-4 — Foreman blesses it retroactively as appropriate for a hardening SPEC + harvests it as Proposal P-AUTHOR-1 below.

---

## 4. Findings Processing

| # | Finding summary | Disposition | Action taken |
|---|---|---|---|
| F-1 | 15 deferred views + 3 base-table RLS expansions (HIGH) | **NEW SPEC** | Filed `SECURITY_HOTFIX_3` declaration in §10 below + OPEN_TASKS entry. Brief to be authored next session by Architect |
| F-2 | `translate-direct.cjs` CLI dev tool will fail post-§1.3 (LOW) | **NEW SPEC (storefront repo)** | Cross-repo follow-up `TRANSLATE_DIRECT_CLI_SERVICE_ROLE_SWITCH` stub queued for the `opticup-storefront` repo. Production translation flow via `translate-content` EF unaffected (uses service_role bypass). ~5-min fix. Daniel does not need to act today |
| F-3 | `save_translation_memory_batch` 2 overloads (INFO) | **MERGE INTO SECURITY_HOTFIX_3** | The non-`p_tenant_id` overload is one of the 17 advisor-reported `anon_security_definer_function_executable` findings. Audit + lockdown in HOTFIX_3 §1.4 (new sub-section) |
| F-4 | `v_tenant_i18n_overrides` is admin-only — Option A2 lockdown (LOW refinement) | **MERGE INTO SECURITY_HOTFIX_3** | HOTFIX_3 categorizes admin-cohort vs storefront-cohort. Admin views get REVOKE anon SELECT + security_invoker=on (no RLS expansion needed); storefront views get RLS expansion + security_invoker=on |
| F-5 | Block A pattern → project-wide template (INFO) | **APPLY NOW** | New reference file created: `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql`. SPEC_TEMPLATE.md updated to cite it. See §6 Author Proposal P-AUTHOR-1 |
| F-6 | npm-package-deps check in Step 1.5 (INFO process) | **APPLY NOW** | Folded into §7 Executor Proposal P-EXEC-2 (extends DB Pre-Flight to a Tooling Pre-Flight micro-step) |
| F-7 | 3 escalations indicates SPEC author-time pre-flight gap (PROCESS) | **APPLY NOW** | Folded into §6 Author Proposal P-AUTHOR-2 (Runtime semantics rehearsal as a §1.5.3 sub-step) |

**Zero findings left orphaned.** F-1 + F-2 + F-3 + F-4 → tracked as follow-ups; F-5 + F-6 + F-7 → applied in this review.

---

## 5. Spot-Check Verification

Picked 3 of EXECUTION_REPORT's largest claims and verified against the live DB + repo.

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "§1.1: `pg_proc.proconfig = {search_path=public}` on `sync_lead_status_from_attendee`" | ✅ | `SELECT proconfig FROM pg_proc WHERE proname='sync_lead_status_from_attendee'` → `["search_path=public"]` (Stage 1 evidence) |
| "§1.2: 2 of 17 views have security_invoker=on (`v_storefront_reviews`, `v_storefront_components`)" | ✅ | `SELECT relname, reloptions FROM pg_class WHERE relname IN (17 names)` → exactly 2 with `security_invoker=on`, 15 without (Stage 1 evidence) |
| "§1.3: 23 of 24 RPCs anon EXECUTE revoked; 1 retained (`verify_campaign_page_password`); all 24 contain JWT validation header (Block A on 23, Block A-alt on 1)" | ✅ | `has_function_privilege` per RPC + `pg_get_functiondef` body inspection on 3 sample RPCs (`delete_tenant`, `submit_storefront_lead`, `get_po_aggregates`) confirms 3-role-aware Block A verbatim; `verify_campaign_page_password` body confirms Block A-alt via `v_public_tenant` slug check (Stage 1 evidence) |

All 3 spot-checks PASS. Verdict floor stays at 🟡 (not lifted to 🔴).

Bonus runtime verification from Stage 2:
- 2 RPCs called with WRONG tenant_id JWT → both raised `42501 Unauthorized: tenant_id mismatch` ✅
- 2 RPCs called with RIGHT tenant_id JWT → both returned normal payloads ✅
- §1.1 callable end-to-end → returned structured `{ok:false, error:'lead_not_found'}` (function's normal lookup logic; Block A passed) ✅

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal P-AUTHOR-1 — Canonical JWT validation header template

- **Where:** Create `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql`. Reference it from `SKILL.md` §"SPEC Authoring Protocol" Step 3 (after the "Multi-file identical edits" paragraph).
- **Change:** Author file containing the canonical 3-role-aware Block A pattern (service_role bypass + nullif + IS DISTINCT FROM check) and the canonical Block A-alt slug pattern, both with comments explaining when to use which. SKILL.md gains a sentence: "For SECURITY DEFINER RPCs that accept `p_tenant_id`, reference `references/JWT_VALIDATION_HEADER.sql` for the canonical 3-role-aware header. Do NOT inline a hand-rolled version — escalation 2026-05-15T1010Z showed how a SPEC-authored variant can ship a NULL-comparison loophole."
- **Rationale:** SPEC §3a Block A as literally authored contained the NULL-comparison loophole (`p_tenant_id != NULL` yields NULL, not TRUE — IF NULL never fires). The defect was caught at execution time, not author time. A vetted reference file eliminates the recurrence risk on every future hardening SPEC.
- **Source:** FINDINGS §F-5 + RESOLVED escalation 2026-05-15T1010Z + EXECUTION_REPORT §9 Proposal #1.

### Proposal P-AUTHOR-2 — Runtime semantics rehearsal as a §1.5.3 sub-step

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check", add a new sub-step §1.5.3 after the existing §1.5.2.
- **Change:** New sub-step §1.5.3 "Runtime semantics rehearsal (DB-touching SPECs only)": before sealing the SPEC, for each new function header/validation block, write 2-line test cases for (a) anon caller no JWT, (b) authenticated wrong-tenant, (c) service_role (no tenant claim), and reason about behavior. For each view security flag change, write the BASE-TABLE anon-privilege probe + RLS-policy probe SQL and reason about behavior under both pre- and post-migration roles. Pin findings in the SPEC's §0 Pre-Authoring Reality Check.
- **Rationale:** This SPEC fired 3 escalations, two of which (Block A NULL-loophole + security_invoker storefront outage) would have been caught by 5 minutes of runtime-semantics reasoning at author time. The Cross-Reference Check catches name collisions; this new sub-step catches behavior collisions.
- **Source:** FINDINGS §F-7 + RESOLVED escalations 2026-05-15T1010Z and 2026-05-15T1110Z.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal P-EXEC-1 — Base-table RLS probe when SPEC modifies view security_invoker

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check", add a new sub-item #8 after the existing #7.
- **Change:** New #8 "View security_invoker probes (when SPEC modifies any view's `security_invoker` flag)": for each target view, BEFORE applying the ALTER, probe (a) `has_table_privilege('anon', '<base_table>', 'SELECT')` for EVERY base table the view reads from, (b) `pg_policies` for each base table to confirm an anon-friendly USING clause exists (i.e., not solely a JWT-claim policy), (c) scalar subqueries in the view body that read additional base tables (must be probed too). If any probe shows anon would lose access → STOP and escalate; do not silently flip the flag. Document the probe results in EXECUTION_REPORT §3 What Was Done.
- **Rationale:** This SPEC's STT-1 fired AFTER the 10-view migration was applied — costing a full rollback (the 8 unsafe views were detected by post-migration anon probes returning 0 rows). Pre-migration base-table probes would have caught the same 8 views at SPEC-pre-flight time + scoped them out cleanly with no rollback churn. Closes the gap that EXECUTION_REPORT §7 row #1 identified.
- **Source:** FINDINGS §F-1 + RESOLVED escalation 2026-05-15T1110Z + EXECUTION_REPORT §9 Proposal #1.

### Proposal P-EXEC-2 — Tooling Pre-Flight (npm-package + tmp-script template)

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check", add a new sub-item #9; create `.claude/skills/opticup-executor/references/tmp-migration-builder.mjs` skeleton.
- **Change:** New #9 "Tooling Pre-Flight": if the SPEC will run any Node script during execution, BEFORE writing the first script, check `package.json` for required dependencies. If any are missing, STOP and escalate (do not silently `npm install`). Additionally, drop a 50-line `tmp-migration-builder.mjs` template into `references/` that connects via `DATABASE_URL_READONLY`, fetches `pg_get_functiondef`/`pg_get_viewdef`, applies a per-object transformation closure, and writes a migration `.sql` — so future hardening SPECs build their migrations in 5 minutes rather than 10. Tmp script must self-delete post-use per Rule 31.
- **Rationale:** EXECUTION_REPORT D-7 documents 3 ad-hoc Node scripts written from scratch + cleaned up. FINDINGS §F-6 raises the dep-availability concern (the run was lucky that `pg` was already in package.json). A vetted template + a Tooling Pre-Flight check turn this from "lucky guess" into "verified before execution."
- **Source:** FINDINGS §F-6 + EXECUTION_REPORT §9 Proposal #2 + EXECUTION_REPORT D-7.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO (this is a hotfix, not a phase boundary) | N/A | none |
| `docs/GLOBAL_MAP.md` | NO (no new functions/views/contracts; only modified existing) | N/A | none |
| `docs/GLOBAL_SCHEMA.sql` | NO (no new tables/views/RPCs; only modified existing) | N/A | none |
| Module 1.5 `SESSION_CONTEXT.md` | YES | YES (commit 47f9967) | none |
| Module 1.5 `CHANGELOG.md` | YES | YES (commit 47f9967) | none |
| Module 1.5 `MODULE_MAP.md` | NO (no new files; only modified existing — module map unchanged) | N/A | none |
| Module 1.5 `MODULE_SPEC.md` | NO (no behavioral change at module-level) | N/A | none |
| `OPEN_TASKS.md` | YES (mark HOTFIX_2 closed; queue HOTFIX_3) | YES (commit 47f9967 + closeout commit appends HOTFIX_3 queue) | none |
| `OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` (T5 audit) | YES (F-CRIT-1 + F-CRIT-3 RESOLVED; F-CRIT-2 PARTIAL) | YES (closeout commit) | none |
| `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` (T6 audit) | YES (RPC #9 partial-close documented; #10 closed for the 7 collateral; #12 merged into HOTFIX_3) | YES (closeout commit) | none |

All required updates either DONE or queued for the closeout commit immediately following this review. No silent drift.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> SECURITY_HOTFIX_2 נסגר 🟡 — שתי הליבות (F-CRIT-1 + F-CRIT-3) סגורות במלואן, ההגנה החדשה רצה על כל 24 ה-RPCs ועל 2 ה-Views הבטוחים. 15 Views נדחו ל-SECURITY_HOTFIX_3 כי הטבלאות מתחתיהן דורשות הרחבת מדיניות RLS נפרדת — שמירה על זמינות הסטורפרונט. כל 3 ההסלמות נסגרו במהלך הריצה, אפס כתיבות ל-Prizma, smoke 7/7 PASS, ארבעה שיפורים נוספו למיומנויות לבייסליין הבא.

---

## 10. Follow-Ups Opened

### SECURITY_HOTFIX_3 — 🟢 RESOLVED 2026-05-15 (closeout SHA range `dc63e54..2dab09f` + Foreman closeout commit pending)

**Status:** Brief authored 2026-05-15 by Architect. Executed end-to-end via Full-Auto Pipeline same day. Verdict 🟡 CLOSED WITH FOLLOW-UPS per Daniel Option B (scope-out unsafe views). 7 of 15 deferred views closed (5 admin lockdowns + 2 storefront flips); 15 of 17 F-CRIT-3 carry RPCs closed. F-CRIT-2 advisor 15→8; F-CRIT-3 17→2; total 119→93. Smoke 7/7 PASS post-migration. Zero data writes. 8 remaining storefront views + 5 base tables deferred to `SECURITY_HOTFIX_4` (stub authored in HOTFIX_3 Commit 1). Full retrospective at `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md`.

**Scope outline:**

1. **15 deferred views** (Cohort B + C from RESOLVED escalation 2026-05-15T1110Z): `v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_public_tenant`, `v_storefront_blog_posts`, `v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_categories`, `v_storefront_config`, `v_storefront_media`, `v_storefront_pages`, `v_storefront_products`, `v_tenant_i18n_overrides`, `v_translation_dashboard`. Each gets `security_invoker=on` AFTER its base-table prerequisite is met.

2. **3 base-table RLS expansions** (storefront-cohort prerequisite — anon-friendly fallback policies): `blog_posts`, `storefront_pages`, `ai_content`. Add `anon_read_published` policies with `USING (is_active=true OR status='published')` + soft-delete filter. Each base-table change runs first; then the view flip.

3. **Admin-cohort lockdown** (per FINDINGS §F-4): `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_ai_content`, `v_crm_event_stats` → REVOKE anon SELECT + ALTER VIEW security_invoker=on. No RLS expansion; admin views should not be anon-readable in any case.

4. **`save_translation_memory_batch` second overload** (per FINDINGS §F-3): audit, REVOKE anon EXECUTE if confirmed not legitimately anon-callable + add Block A header; OR drop the legacy overload entirely (Rule 21 cleanup if the `p_tenant_id`-bearing variant supersedes it).

5. **15 pre-existing carry RPCs** (from REVIEW §5 + advisor): `acknowledge_failed_messages`, `attendee_status_change_event_fn`, `event_status_change_event_fn`, `event_status_close_recycle_leads_fn`, `get_all_tenants_overview`, `increment_paid_amount`, `increment_prepaid_used`, `is_platform_super_admin`, `lead_status_change_event_fn`, `mark_translations_stale`, `promote_lead_on_message_sent`, `promote_to_platform`, `register_lead_to_event`, `resolve_touchpoints_to_lead`, `validate_slug` — these 15 SECURITY DEFINER RPCs are anon-callable; audit each, REVOKE anon if not legitimately anon-callable, document Option A if it is.

**Pre-flight requirement:** Architect's Brief MUST query `pg_policies` per base table BEFORE proposing scope. Apply Proposal P-AUTHOR-2 (Runtime semantics rehearsal) — for each view: probe anon SELECT + RLS USING-clause + scalar-subquery cascade; for each RPC: probe anon EXECUTE + grep call sites in BOTH `opticup` + `opticup-storefront` repos.

**Estimated effort:** 4–6 hours total (2-3 hours base-table RLS work + 1-2 hours view flips + 1 hour admin cohort + 1 hour RPC audit).

### Cross-repo follow-up — `opticup-storefront`

`TRANSLATE_DIRECT_CLI_SERVICE_ROLE_SWITCH` stub for `opticup-storefront/scripts/translate-direct.cjs` line 108 (`sb.rpc('create_translated_page', ...)` → `sbAdmin.rpc(...)`). ~5-minute fix. Severity LOW (dev tooling, not production). Queued for the storefront repo's next maintenance window.

### Skill updates applied in this closeout commit

- `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql` — NEW file (per P-AUTHOR-1).
- `.claude/skills/opticup-strategic/SKILL.md` §Step 1.5 — appended sub-step 1.5.3 (per P-AUTHOR-2).
- `.claude/skills/opticup-executor/SKILL.md` §Step 1.5 — appended sub-items #8 + #9 (per P-EXEC-1 + P-EXEC-2).
- `.claude/skills/opticup-executor/references/tmp-migration-builder.mjs` — NEW skeleton (per P-EXEC-2).

### Audit reports updated

- `OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` — F-CRIT-1 marked RESOLVED (SHA 40cde93); F-CRIT-3 marked RESOLVED for in-scope subset (SHA 40cde93); F-CRIT-2 marked PARTIAL (2 of 17, SHA 40cde93; 15 → HOTFIX_3).
- `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` — Part 1 RPC #9 marked PARTIAL (in-scope 24 closed; 15 pre-existing carry → HOTFIX_3); RPC #10 marked CLOSED for the 7 collateral fns; RPC #12 (save_translation_memory_batch overloads) → HOTFIX_3.

---

*End of FOREMAN_REVIEW.md. SPEC SECURITY_HOTFIX_2_2026_05_15 closed 🟡; SECURITY_HOTFIX_3 declared as mandatory follow-up.*
