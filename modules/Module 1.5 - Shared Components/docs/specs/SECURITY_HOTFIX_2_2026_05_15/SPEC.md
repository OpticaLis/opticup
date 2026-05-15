# SPEC — SECURITY_HOTFIX_2_2026_05_15

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-15
> **Module:** 1.5 — Shared Components (cross-module security infrastructure)
> **Phase:** N/A (production hotfix)
> **Author signature:** Claude Code session, 2026-05-15, Windows desktop
> **Source Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SECURITY_HOTFIX_2_2026_05_15_BRIEF.md`

> **Heading convention:** plain numbered `## N. Title`, no `§` prefix. `## Destructive Operations` unnumbered (matches Iron-Rule-32 regex in `scripts/checks/destructive-ops-declared.mjs`).

---

## 0. Pre-Authoring Reality Check

- **Brief read in full:** 2026-05-15.
- **Pre-flight queries run against live Supabase:** 2026-05-15T08:25Z. Counts captured directly from `pg_class` / `pg_proc` / `has_function_privilege` — not Brief-stated.
- **Pre-flight outcome (actual repo + DB state):**
  - **§1.1 — 1 function** confirmed: `sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid)`, `prosecdef=true`, `proconfig IS NULL`. ✅ matches Brief.
  - **§1.2 — exactly 17 views** in `public` with empty `reloptions` and `anon_can_select=true`. ✅ matches Brief. Names captured in §8.2 below.
  - **§1.3 — exactly 24 SECURITY DEFINER RPCs** with a `p_tenant_id` parameter that lack the `request.jwt.claims` validation header. ✅ matches Brief. BUT: **17 are anon-callable**, not 7 as Brief stated. Verified via `has_function_privilege('anon', oid, 'EXECUTE')` on every candidate. The Brief inverted the count — the 7 it labeled "anon-callable" are actually the NON-anon-callable subset.
- **Deviation handling:** escalation file `escalations/RESOLVED_2026-05-15T0830Z_anon_callable_rpc_count_inverted_in_brief.md`. Daniel chose **Option B (expand to all 17 anon-callable in this hotfix)** via AskUserQuestion at 2026-05-15T08:35Z. This SPEC's §1.3 enumerates 17 Option A/B decisions, not 7.
- **Pre-existing untracked files surveyed:** 8 modified docs + ~28 architecture-brief drafts + 1 unrelated SPEC folder. Daniel chose option (a): leave alone, selective `git add` by filename throughout. The Executor will touch only files this SPEC creates/modifies (SPEC folder contents, migrations, backups, T5/T6 audit reports, SESSION_CONTEXT/CHANGELOG, OPEN_TASKS.md).
- **Lessons applied from prior FOREMAN_REVIEWs in this module:**
  - **MIGRATION_1_SUPPLIERS_DEBT → "no `§` in headings"** → APPLIED throughout this SPEC.
  - **MIGRATION_2_SETTINGS_PERMISSIONS Author Proposal #1 → Shared Edit Block** → APPLIED in §3a (24 RPCs receive the identical JWT validation header; 17 views receive the identical `ALTER VIEW ... SET (security_invoker=on)` statement).
  - **MIGRATION_2_SETTINGS_PERMISSIONS Author Proposal #2 → Baselines as symbols** → NOT APPLICABLE (no measure-then-bound criteria; counts are absolutes from pre-flight).
  - **MIGRATION_4_STOREFRONT_STUDIO Author Proposal #1 → multi-form swap coverage** → NOT APPLICABLE (not a visual re-skin).
  - **MIGRATION_4_STOREFRONT_STUDIO Author Proposal #2 → multi-form count criteria** → NOT APPLICABLE.
- **Cross-Reference Check (Rule 21 enforcement at author time):**
  - Names this SPEC will introduce: zero new tables, zero new columns, zero new RPCs (24 are CREATE OR REPLACE of existing), zero new views (17 are ALTER), zero new T-constants, zero new files in `js/`. Only new files: SPEC folder contents (SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, FOREMAN_REVIEW.md), 3 migration `.sql` files, 1 backup folder.
  - No collisions to resolve. Cross-Reference Check completed 2026-05-15 against GLOBAL_SCHEMA + GLOBAL_MAP + module db-schema files. 0 collisions / 25 hits resolved (all existing entries we're modifying, expected).
- **No Color-form completeness check applicable** (security SPEC, no visual swaps).

### Baselines

No measure-then-bound criteria — count criteria are absolutes (17, 24, 17, 7, 1). Baselines table omitted intentionally.

---

## 1. Goal

Close 3 production-CRITICAL security findings re-confirmed by the 2026-05-15 morning pre-merge validation: restore `search_path=public` hardening on 1 function, add `security_invoker=on` to 17 views, and add JWT-claim tenant validation to 24 SECURITY DEFINER RPCs (with per-RPC Option A/B treatment for 17 anon-callable). Done in one merge to main, structural changes only, zero Prizma data writes.

---

## 2. Background & Motivation

Direct sequel to `SECURITY_HOTFIX_2026_05_13` (Module 2 — now on `main`). That hotfix introduced the canonical hardening patterns (`SET search_path='public'`, `security_invoker=on`, JWT-claim header) but left 3 gaps surfaced by overnight Bundle 2 (T5 + T6) and re-confirmed today:

- **F-CRIT-1:** `sync_lead_status_from_attendee` regressed — `SET search_path='public'` removed by a later `CREATE OR REPLACE` (Module 4 CRM, likely during `M3_UTM_TRIPLE_LAYER_PERSISTENCE` or earlier funnel work). Live state confirmed today: `pg_proc.proconfig IS NULL`.
- **F-CRIT-2:** 17 views (11 `v_storefront_*` + 6 admin/storefront-adjacent) never received `security_invoker=on`. Same bug class HOTFIX_2026_05_13 §6.3 closed for 10 admin views, but coverage was incomplete and drift since then.
- **F-CRIT-3:** 24 SECURITY DEFINER RPCs accept `p_tenant_id` parameters without validating against JWT claims. Pre-flight: 17 are anon-callable today (Brief said 7 — count was inverted; see escalation). Several are admin RPCs (`delete_tenant`, `suspend_tenant`, `activate_tenant`, `update_tenant`, `reset_employee_pin`) — anon callable means anon can operate on ANY tenant.

This SPEC is structural-only: no row data UPDATEs on Prizma, no RLS policy changes, no storefront code changes.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at close | On `develop`, clean | `git status` → "nothing to commit" (only HOTFIX-related additions tracked; pre-existing untracked files untouched) |
| 2 | Commits produced | 5–7 commits | `git log origin/develop..HEAD --oneline` |
| 3 | New backup folder exists with 25 function defs + 17 view defs (42 files) | 42 files | `ls "modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_2_2026_05_15/" \| wc -l` ≥ 42 |
| 4 | §1.1: `sync_lead_status_from_attendee.proconfig` contains `search_path=public` | `{search_path=public}` | `SELECT proconfig FROM pg_proc WHERE proname='sync_lead_status_from_attendee'` |
| 5 | §1.2: ALL 17 target views have `security_invoker=on` (or `=true`) in reloptions | 0 missing | `SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind='v' AND c.relname IN (<17 names>) AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(c.reloptions,'{}'::text[])) opt WHERE opt IN ('security_invoker=on','security_invoker=true'))` = 0 |
| 6 | §1.3: ALL 24 target RPCs contain the JWT validation header | 24 matches | `SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname IN (<24 names>) AND pg_get_functiondef(p.oid) ILIKE '%request.jwt.claims%' AND pg_get_functiondef(p.oid) ILIKE '%tenant_id%'` = 24 |
| 7 | §1.3 Option B subset: anon EXECUTE revoked | each Option-B RPC: `has_function_privilege('anon', oid, 'EXECUTE') = false` | per-RPC check |
| 8 | §1.3 Option A subset: each retains anon EXECUTE + has slug-based or known-tenant validation header documented in SPEC | each Option-A RPC: `has_function_privilege('anon', oid, 'EXECUTE') = true` AND body matches a slug-validating pattern | per-RPC check |
| 9 | §1.2 storefront probe: 11 `v_storefront_*` views + `v_public_tenant` return HTTP-200-equivalent SELECT results as anon role with the demo tenant slug | row counts within ±0 of pre-migration | live SQL probe as anon role pre + post |
| 10 | §1.1 demo integration: `sync_lead_status_from_attendee` callable on demo tenant + behaves identically to pre-migration | succeeds with no error | demo SQL call |
| 11 | §1.3 demo integration: pick 3 random RPCs from the 24; call with WRONG tenant_id → ERROR; call with RIGHT tenant_id (demo) → succeeds | 3 of 3 reject, 3 of 3 accept | demo SQL calls |
| 12 | Prizma row-data writes during this SPEC | 0 INSERT/UPDATE/DELETE on any Prizma data table | manual review of all migrations |
| 13 | Smoke pre-migration | 7/7 PASS | `npm run smoke` |
| 14 | Smoke post-migration | 7/7 PASS | `npm run smoke` |
| 15 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| 16 | Supabase advisor security — 3 known CRITICAL findings GONE | 0 occurrences of `function_search_path_mutable` on `sync_lead_status_from_attendee`; 0 occurrences of `security_definer_view` on the 17 view names; 0 occurrences of `anon_security_definer_function_executable` on the Option-B RPCs | `get_advisors type=security`, filtered |
| 17 | Supabase advisor security — NO NEW findings introduced beyond the 3 known classes | total finding count ≤ pre-migration count | `get_advisors` delta |

**Notes on criterion #5:** the post-migration check accepts `security_invoker=on` OR `security_invoker=true` because Postgres stores the literal token. Both are boolean-truthy and equivalent.

**Notes on criterion #16:** the M-5 carry alert in GUARDIAN_ALERTS reports 149 total advisor findings as the baseline (17 ERROR + 132 WARN) — that baseline INCLUDES the 3 CRITICAL classes we're closing. Post-migration baseline expected: ≤ 149 minus the closed-class count, plus any newly-introduced findings (target: 0 new).

---

## 3a. Shared Edit Block

Three blocks are applied identically across the target objects. Reviewer verifies block content once; per-commit conformance only.

### Block A — JWT validation header (24 RPCs, §1.3)

- **Insertion location:** at the top of the function body, immediately after `BEGIN` (or after `DECLARE` block if any). Must precede any other statement.
- **Content (verbatim, must appear in every one of the 24 RPCs):**
  ```sql
  IF p_tenant_id IS NULL OR p_tenant_id != ((current_setting('request.jwt.claims', true)::json ->> 'tenant_id'::text))::uuid THEN
    RAISE EXCEPTION 'tenant_id mismatch or missing JWT claim (security_hotfix_2)';
  END IF;
  ```
- **Files this block applies to (24 RPCs):**
  1. `_record_touchpoint`
  2. `activate_tenant`
  3. `check_in_attendee`
  4. `check_plan_limit`
  5. `create_translated_page`
  6. `delete_tenant`
  7. `generate_daily_alerts`
  8. `get_po_aggregates`
  9. `get_tenant_activity_log`
  10. `get_tenant_employees`
  11. `get_tenant_stats`
  12. `get_translation_context`
  13. `import_leads_from_monday`
  14. `is_feature_enabled`
  15. `next_crm_event_number`
  16. `reset_employee_pin`
  17. `restore_event_from_log`
  18. `save_translation_memory_batch`
  19. `soft_delete_event_if_empty`
  20. `submit_storefront_lead`
  21. `suspend_tenant`
  22. `sync_lead_status_from_attendee`
  23. `update_tenant`
  24. `verify_campaign_page_password`

### Block A-alt — Anon-safe slug-based validation header (Option A subset only)

For Option A RPCs (anon-callable AND legitimately need anon access), Block A is replaced with a slug-anchored variant. The caller must supply the tenant slug; the RPC resolves it through `v_public_tenant` and asserts that the resolved `id` matches `p_tenant_id`.

- **Content (verbatim, for Option A RPCs only):**
  ```sql
  -- Anon-safe: validate p_tenant_id matches the public-tenant slug lookup
  IF p_tenant_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.v_public_tenant WHERE id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'tenant_id does not resolve to a known public tenant (security_hotfix_2)';
  END IF;
  ```
- This block applies ONLY to the Option A subset (see §3b decision table below). Default: Block A.

### Block B — `ALTER VIEW ... SET (security_invoker=on)` (17 views, §1.2)

- **Content (verbatim, one ALTER per view):**
  ```sql
  ALTER VIEW public.<view_name> SET (security_invoker=on);
  ```
- **Files this block applies to:** the 17 views enumerated in §8.2 below.

### Block C — `REVOKE EXECUTE ... FROM anon` (Option B RPCs only, §1.3)

- **Content (verbatim, one REVOKE per Option B RPC):**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.<rpc_name>(<arg_signature>) FROM anon;
  REVOKE EXECUTE ON FUNCTION public.<rpc_name>(<arg_signature>) FROM PUBLIC;
  ```
- **Why both:** the proacl shows several RPCs have BOTH `=X/postgres` (PUBLIC) AND `anon=X/postgres` (explicit anon). Revoking only anon would leave PUBLIC; PUBLIC includes anon by membership. Belt + suspenders.
- **Files this block applies to:** the Option B subset enumerated in §3b.

---

## 3b. Per-RPC Option A vs Option B Decision Table

Foreman's preliminary categorization. The Executor verifies each by grepping ERP + storefront source for the RPC name. If grep finds an anon-context caller → Option A (Block A-alt). If only authenticated/service_role callers → Option B (Block C). If executor disagrees with the preliminary call → STOP and escalate.

| # | RPC | Preliminary | Rationale |
|---|-----|------------|-----------|
| 1 | `_record_touchpoint` | **B** | Pre-flight grep: only called from `supabase/functions/resolve-link/index.ts` + `supabase/functions/lead-intake/index.ts` (service_role). Anon grant is incidental. |
| 2 | `activate_tenant` | **B** | Admin op. Anon must never call. |
| 3 | `check_in_attendee` | already non-anon | NOT in anon-callable subset. Block A only. |
| 4 | `check_plan_limit` | **B** | Feature gating from authenticated/service_role context. |
| 5 | `create_translated_page` | **B** | Admin translation flow. |
| 6 | `delete_tenant` | **B** | Admin op. |
| 7 | `generate_daily_alerts` | **B** | Sentinel cron, service_role. |
| 8 | `get_po_aggregates` | **B** | Inventory admin rollup. |
| 9 | `get_tenant_activity_log` | **B** | Admin audit log. |
| 10 | `get_tenant_employees` | **B** | Admin directory. |
| 11 | `get_tenant_stats` | **B** | Admin rollup. |
| 12 | `get_translation_context` | **B** | Admin translation flow. |
| 13 | `import_leads_from_monday` | already non-anon | NOT in anon-callable subset. Block A only. |
| 14 | `is_feature_enabled` | **B** | Pre-flight grep: `shared/js/plan-helpers.js` + ERP admin/storefront-config flow — authenticated context only. |
| 15 | `next_crm_event_number` | already non-anon | NOT in anon-callable subset. Block A only. |
| 16 | `reset_employee_pin` | **B** | Admin op. |
| 17 | `restore_event_from_log` | already non-anon | NOT in anon-callable subset. Block A only. |
| 18 | `save_translation_memory_batch` | **B** | Admin translation. |
| 19 | `soft_delete_event_if_empty` | already non-anon | NOT in anon-callable subset. Block A only. |
| 20 | `submit_storefront_lead` | already non-anon | NOT in anon-callable subset (service_role only — invoked via Edge Function). Block A only. |
| 21 | `suspend_tenant` | **B** | Admin op. |
| 22 | `sync_lead_status_from_attendee` | already non-anon | NOT in anon-callable subset. Block A only. |
| 23 | `update_tenant` | **B** | Admin op. |
| 24 | `verify_campaign_page_password` | **A** | Public campaign-page password gate. Called from storefront anon context. Block A-alt with slug validation. |

**Summary:** 16 Option B + 1 Option A + 7 already non-anon-callable = 24.

**If executor grep contradicts a preliminary B/A — STOP and escalate.** Do not silently apply Option A "to be safe" — the SPEC's intent is to lock down Option B aggressively, and a slip from B → A is an unannounced scope reduction.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo + run read-only SQL.
- Create the SPEC folder + backup folder + migration files listed in §8.
- Apply the 3 migrations in order (§1.1 → §1.2 → §1.3) via Supabase MCP `apply_migration`.
- Run smoke tests pre + post.
- Commit + push to `develop`.
- For Option B decisions: if grep over ERP + `opticup-storefront` (sibling repo, if cloned/accessible) finds 0 anon-context callers → apply Block C without asking.
- For Option A (`verify_campaign_page_password`): apply Block A-alt without asking.

### What REQUIRES stopping and reporting
- Any §1.2 storefront-facing view that returns DIFFERENT row counts as anon role pre vs post-migration (pre-test it BEFORE the ALTER) → STOP, escalate, do NOT silently break the storefront.
- Any §1.3 RPC where the preliminary B-or-A in §3b is contradicted by grep evidence (e.g., an Option B candidate has an anon caller in the storefront repo, or Option A `verify_campaign_page_password` actually has no anon caller).
- Any test failure that cannot be diagnosed in a single retry.
- Any Prizma row-data INSERT/UPDATE/DELETE → STOP immediately, this SPEC is structural only.
- Any §1.x demo integration test that fails after the migration → STOP, rollback that §, do NOT proceed to next §.
- Smoke <7/7 pre-migration → STOP, do not begin work.
- Advisor returns any NEW finding type beyond the 3 known CRITICAL classes → STOP, list them.
- The integrity gate fails (exit 1) at any point → STOP.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **STT-1 (storefront break):** any pre-migration anon-role probe on the 11 `v_storefront_*` views + `v_public_tenant` returns 0 rows where prior probes returned >0 → STOP. This indicates `security_invoker=on` would break the storefront.
- **STT-2 (option mismatch):** grep evidence contradicts §3b preliminary B/A for any RPC → STOP.
- **STT-3 (prizma data write):** any migration text contains `UPDATE prizma_*`, `INSERT INTO prizma_*`, `DELETE FROM prizma_*`, or any data DML on a Prizma row → STOP. This SPEC is structural only.
- **STT-4 (advisor delta):** post-migration `get_advisors security` returns any finding type not in the 3 known classes → STOP.
- **STT-5 (rollback budget):** if §1.1 OR §1.2 OR §1.3 fails its demo integration test, rollback ONLY that work-area's migration; do not proceed to next §. Open a NEW escalation describing the failure.

---

## 6. Rollback Plan

Pre-edit snapshot of every modified DB object lives in the backup folder. Per-area rollback:

- **§1.1 rollback:** re-apply the function body from `backups/{date}_SECURITY_HOTFIX_2_2026_05_15/sync_lead_status_from_attendee_pre.sql`. (This re-introduces the regression, but is the literal pre-state.) Then escalate to refine the fix.
- **§1.2 rollback:** `ALTER VIEW <name> RESET (security_invoker);` for each fixed view. View body unchanged.
- **§1.3 rollback:** re-apply each RPC body from `backups/{date}_SECURITY_HOTFIX_2_2026_05_15/<rpc_name>_pre.sql`. For Option B revokes: `GRANT EXECUTE ON FUNCTION public.<rpc_name>(<args>) TO anon;`.

Per-area rollback because the 3 work areas are independent. A §1.2 failure should not roll back a successful §1.1 fix.

Notify Foreman; SPEC marked REOPEN with the failing area noted; subsequent work continues in a separate hotfix.

---

## Destructive Operations

Per Iron Rule 32:

1. **`CREATE OR REPLACE FUNCTION`** × 25 (1 in §1.1 + 24 in §1.3). Pre-image backed up. Not destructive per Rule 32 (additive replace) but still requires the snapshot.
2. **`ALTER VIEW <name> SET (security_invoker=on)`** × 17. Metadata-only; not destructive.
3. **`REVOKE EXECUTE ... FROM anon` AND `REVOKE EXECUTE ... FROM PUBLIC`** × N (N=16 based on §3b preliminary; final count per executor grep verification). Reversible via `GRANT EXECUTE TO anon`. **Declared destructive** — intentionally breaks any anon caller that was depending on these grants. THAT IS THE POINT for admin RPCs (`delete_tenant`, `suspend_tenant`, etc.).
4. **Folder creation** under `modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_2_2026_05_15/`. Additive; not destructive.
5. **File creation** of 3 migration SQL files under `migrations/`. Additive; not destructive.
6. **Modifications to** `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` + `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` (the T5 + T6 audit reports — mark F-CRIT-1/2/3 RESOLVED with commit SHAs). Append-only edits; not destructive per Rule 32 (governance-doc deletions ARE destructive but APPENDS to audit reports are not).

**No DROP, no DELETE, no schema removal, no row deletion, no main deploys, no force pushes, no rebases.**

Iron Rule 32 declaration: "25 CREATE OR REPLACE FUNCTION + 17 ALTER VIEW + ~32 REVOKE FROM anon/PUBLIC (2 per Option B RPC × 16 Option B candidates from §3b) + 1 backup folder + 3 migration files + appends to 2 audit reports + appends to 1 SESSION_CONTEXT + 1 CHANGELOG + 1 OPEN_TASKS.md. No DROP, no DELETE, no DML on data tables, no main deploys."

---

## 7. Out of Scope (explicit)

- **Refactoring RPC bodies** beyond inserting Block A / A-alt at the top.
- **Changing RLS policies** on any base table. Several `_admin` views in §1.2 may surface column-mismatch issues at probe time — those are separate findings, escalate.
- **Storefront source code changes** in `opticup-storefront`. If §1.2 probe shows a storefront-facing view breaks → STOP and escalate, do NOT silently fix.
- **Other Bundle 2 (T5 + T6) findings** at HIGH/MEDIUM/LOW severity. Wait for future hotfix.
- **Backfill of historical audit-trail data.** Out of scope.
- **Commits to `main`** or any merge from `develop` to `main`. NEVER.
- **Touching pre-existing untracked files** (the 28 architecture-brief drafts + `__LAUNCH_PLAN_DRAFT__/` + the M1 SPEC folder). Selective `git add` by filename only.
- **Touching the 8 pre-existing modified files** (OPEN_TASKS.md modifications by other roles; GUARDIAN_ALERTS.md modifications by Sentinel; M4 audit doc; role handoffs). Selective `git add` only for files this SPEC modifies; if OPEN_TASKS.md needs an entry for SECURITY_HOTFIX_2 closure, that entry merges with the existing in-flight changes (executor decides at commit time).

---

## 8. Expected Final State

### 8.1 New files

- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md` (this file)
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/EXECUTION_REPORT.md` (Executor)
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/FINDINGS.md` (Executor — even if none, write a "no findings" stub)
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/TEST_REPORT.md` (Localhost-Tester)
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` (Foreman post-execution)
- `modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_2_2026_05_15/sync_lead_status_from_attendee_pre.sql` + 23 more `<rpc_name>_pre.sql` files (24 total RPC pre-defs)
- `modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_2_2026_05_15/<view_name>_pre.sql` × 17 (view pre-defs)
- `modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_2_2026_05_15/MANIFEST.md` (one-line summary per backed-up object)
- `migrations/2026_05_15_security_hotfix_2_01_sync_lead_status_search_path.sql` (§1.1)
- `migrations/2026_05_15_security_hotfix_2_02_views_security_invoker.sql` (§1.2)
- `migrations/2026_05_15_security_hotfix_2_03_rpcs_jwt_validation_and_revokes.sql` (§1.3)

### 8.2 The 17 target views (§1.2)

Captured 2026-05-15T08:25Z from `pg_class`:

`v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_public_tenant`, `v_storefront_blog_posts`, `v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_categories`, `v_storefront_components`, `v_storefront_config`, `v_storefront_media`, `v_storefront_pages`, `v_storefront_products`, `v_storefront_reviews`, `v_tenant_i18n_overrides`, `v_translation_dashboard`.

**Storefront-facing subset (12 — likely consumed by the public storefront):** the 11 `v_storefront_*` + `v_public_tenant`. These get an explicit anon-role pre-migration probe.
**Admin/translator-facing subset (5):** `v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_tenant_i18n_overrides`, `v_translation_dashboard`. These get a generic pre-migration row-count snapshot; no storefront probe required.

### 8.3 The 24 target RPCs (§1.3)

See §3b decision table. 17 anon-callable + 7 non-anon-callable = 24.

### 8.4 Modified files

- `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` — append section "F-CRIT-1/2/3 RESOLVED via SECURITY_HOTFIX_2_2026_05_15 (commits <SHAs>)".
- `modules/Module 1.5 - Shared Components/architecture-brief/SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` — same append.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — new "2026-05-15 — SECURITY_HOTFIX_2 closed" section at the top.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — new SECURITY_HOTFIX_2 entry with commit hashes.
- `OPEN_TASKS.md` — mark SECURITY_HOTFIX_2 closed; remove the 3 CRITICAL items it tracked.

### 8.5 DB state (post-migration)

- `pg_proc.proconfig` for `sync_lead_status_from_attendee` contains `search_path=public`.
- 17 views have `security_invoker=on` (or `=true`) in `pg_class.reloptions`.
- 24 RPCs contain `request.jwt.claims` + `tenant_id` validation header.
- 16 RPCs (Option B subset, pending executor verification of §3b) have anon EXECUTE revoked. `has_function_privilege('anon', oid, 'EXECUTE') = false`.
- 1 RPC (`verify_campaign_page_password`, Option A) retains anon EXECUTE but uses Block A-alt (slug-based validation).
- 7 RPCs (already non-anon-callable) get Block A only; no grant changes.

### 8.6 Docs updated

- Module 1.5 `SESSION_CONTEXT.md` + `CHANGELOG.md`. Module 1.5 has no `MODULE_MAP.md` updates because no new files.
- `MASTER_ROADMAP.md` — no update (this is a hotfix, not a phase boundary).
- `docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql` — no updates (no new functions, tables, views; only modified existing).
- `docs/guardian/GUARDIAN_ALERTS.md` — Sentinel writes its own next refresh; this SPEC does NOT modify it directly.
- `OPEN_TASKS.md` — closure entry.

---

## 9. Commit Plan

7 commits total (numbered so the executor can match exactly):

1. `chore(spec): seal SECURITY_HOTFIX_2_2026_05_15 SPEC` — adds `SPEC.md` + the `RESOLVED_…` escalation file.
2. `chore(backup): pre-edit snapshots for SECURITY_HOTFIX_2 (25 fns + 17 views)` — adds backup folder.
3. `feat(security): §1.1 restore search_path=public on sync_lead_status_from_attendee` — adds `migrations/2026_05_15_security_hotfix_2_01_*.sql`.
4. `feat(security): §1.2 add security_invoker=on to 17 views` — adds `migrations/2026_05_15_security_hotfix_2_02_*.sql`.
5. `feat(security): §1.3 add JWT validation to 24 RPCs + revoke anon EXECUTE on Option B subset` — adds `migrations/2026_05_15_security_hotfix_2_03_*.sql`.
6. `docs(security): mark F-CRIT-1/2/3 RESOLVED in T5+T6 audit reports + update Module 1.5 SC/CHANGELOG + close OPEN_TASKS items` — touches the audit reports + SC + CHANGELOG + OPEN_TASKS.md.
7. `chore(spec): close SECURITY_HOTFIX_2_2026_05_15 with retrospective` — adds `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` + `FOREMAN_REVIEW.md`.

Each commit uses explicit `git add <file>` by name. Never `git add -A` or `git add .` (Iron Rule §9 #6).

---

## 10. Dependencies / Preconditions

- `SECURITY_HOTFIX_2026_05_13` baseline is on `main` (confirmed via Brief §0).
- Local repo on `develop`, integrity gate exit 0 (confirmed at session start: 119 files, all clear).
- Smoke 7/7 PASS pre-migration (Executor verifies before §1.1).
- Supabase project access: `tsxrrxzmdxaenlvocyit`. MCP `apply_migration` + `execute_sql` + `get_advisors` available.
- Pre-flight queries already run + counts captured (this SPEC §0). Executor MAY re-run them as a sanity check; if any count drifts → STOP.
- `opticup-storefront` sibling repo NOT required to be cloned locally. Grep for storefront-side callers happens against this repo's references (e.g., `modules/Module 3 - Storefront/`); if a storefront-side caller exists in the sibling repo only, the executor cannot detect it from here — that's a known gap, and the Option A/B preliminary categorization in §3b is the safer default.

---

## 11. Lessons Already Incorporated

- **MIGRATION_1_SUPPLIERS_DEBT → no `§` in headings** → APPLIED (plain `## N.` throughout).
- **MIGRATION_1_SUPPLIERS_DEBT → Destructive Operations as top-level `## Destructive Operations`** → APPLIED.
- **MIGRATION_2_SETTINGS_PERMISSIONS → Shared Edit Block for identical multi-file edits** → APPLIED in §3a (3 blocks).
- **MIGRATION_2_SETTINGS_PERMISSIONS → Baselines table** → NOT APPLICABLE (no measure-then-bound criteria).
- **MIGRATION_4_STOREFRONT_STUDIO → multi-form swap coverage** → NOT APPLICABLE.
- **MIGRATION_4_STOREFRONT_STUDIO → multi-form count criteria** → NOT APPLICABLE.
- **M1_5_FULL_AUTO_PIPELINE → 4-agent chain Foreman→Executor→Reviewer→Localhost-Tester** → APPLIED throughout this SPEC's commit plan (commits 1, 6, 7 — Foreman; commits 2–5 — Executor; review files in commit 7).
- **`Iron Rule 32 destructive declaration`** → APPLIED in `## Destructive Operations`.
- **`Iron Rule 31 integrity gate`** → criterion #15 in §3.
- **`Selective git add only` (CLAUDE.md §9 #6)** → §9 explicitly forbids `git add -A`.

---

## 12. Pre-Merge Checklist

The Executor's responsibility before closing the SPEC. Any item failing → SPEC is REOPEN.

- [ ] All 17 §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] Integrity Gate (Iron Rule 31): `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] `git status --short` returns empty for files this SPEC touched (pre-existing untracked files remain — that's expected per §7).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md written in the SPEC folder.
- [ ] Pre + post smoke 7/7 PASS captured.
- [ ] Supabase advisor delta captured (pre vs post) with the 3 CRITICAL classes confirmed GONE and 0 new finding types.
- [ ] Module 1.5 SESSION_CONTEXT + CHANGELOG updated.
- [ ] OPEN_TASKS.md SECURITY_HOTFIX_2 closure entry added.
- [ ] T5 + T6 audit reports marked F-CRIT-1/2/3 RESOLVED with commit SHAs.

---

*End of SPEC. Foreman dispatches to Executor.*
