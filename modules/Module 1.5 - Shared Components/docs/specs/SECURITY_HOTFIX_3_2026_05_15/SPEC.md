# SPEC — SECURITY_HOTFIX_3_2026_05_15

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-15
> **Module:** 1.5 — Shared Components
> **Phase (if applicable):** Sequel to SECURITY_HOTFIX_2 (closed 2026-05-15 🟡)
> **Author signature:** Claude Code session, Windows desktop, 2026-05-15T0917Z

---

## 0. Pre-Authoring Reality Check

- Brief `SECURITY_HOTFIX_3_2026_05_15_BRIEF.md` read in full on 2026-05-15.
- Activation prompt read in full; "do not re-litigate" applied to the 3-table §1.1 scope literal.
- Five pre-flight queries executed against live DB (project `tsxrrxzmdxaenlvocyit`, 2026-05-15T0917Z):
  - **§1.1 published-column convention** — column `status` exists on all 3 tables (consistent column name). BUT: `ai_content.status` semantics are `auto`/`edited`/`approved` (translation review workflow, not a publish state) → 0 rows with `status='published'`. `blog_posts.status` values: 174 `published` + 1 `archived`. `storefront_pages.status` values: 81 `published` + 4 `draft`. Column-convention check **passes**; ai_content rows-visible-to-anon = 0 is acceptable because `v_ai_content` is admin-cohort (§1.3 REVOKE anon).
  - **§1.2 base-table fan-out** — the 15 deferred views read from 11 distinct base tables, not 3. Of those 11, only 3 are in §1.1 (`blog_posts`/`storefront_pages`/`ai_content`); 5 (`tenants`, `inventory_images`) are already anon-friendly via existing `USING true` policies; 5 (`brands`/`inventory`/`media_library`/`tenant_branches`/`storefront_config`) have JWT-only RLS and would yield 0 rows for anon under `security_invoker=on`. This is the basis for **Daniel's Option B decision** (see §0.1 below).
  - **§1.3 admin cohort scope** — per HOTFIX_2 FOREMAN_REVIEW §10 the admin-cohort views are 4: `v_ai_content`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats`. Pre-flight added a 5th: `v_content_translations` exposes `status='draft'` in its WHERE clause → admin/translator workflow, not storefront-safe. All 5 currently have `anon_has_select=true` and `security_invoker=NOT_SET` (the F-CRIT-2 signature). The Brief §1.3 text mentioned "v_admin_* cohort" naming, but pre-flight confirms ALL 9 `v_admin_*` views are already `anon_has_select=false` (HOTFIX_2026_05_13 hardened them); the 4 admin-purpose views needing this hotfix's lockdown are the non-`v_admin_*` ones cited above.
  - **§1.4 save_translation_memory_batch** — `pg_proc` confirms 2 overloads: `(p_tenant_id uuid, p_entries jsonb)` already has 3-role-aware Block A (HOTFIX_2 closure) + `anon_execute=false`; `(p_entries jsonb)` has NO JWT header + `anon_execute=true` + `proconfig=NULL` (no search_path either). This 2nd overload is the §1.4 target.
  - **§1.5 15 carry RPCs** — `pg_proc` confirms all 15 are `security_definer=true` + `anon_execute=true`. 6 are no-arg trigger functions (`attendee_status_change_event_fn`, `event_status_change_event_fn`, `event_status_close_recycle_leads_fn`, `lead_status_change_event_fn`, `promote_lead_on_message_sent`, `is_platform_super_admin`) — these don't legitimately need anon EXECUTE because trigger context is the protection. Body inspection of `register_lead_to_event` shows it already carries a WEAKER Block A variant (no service_role bypass); `resolve_touchpoints_to_lead` has the same weaker variant; `validate_slug` is pure validation with no tenant context and no JWT.
- **Lessons applied from prior `FOREMAN_REVIEW.md` files in this module:**
  - From `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` Proposal P-AUTHOR-1: this SPEC's §1.4 + §1.5 reference `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql` for the canonical 3-role-aware Block A. NO hand-rolled JWT-claim check inlined in this SPEC.
  - From P-AUTHOR-2 (Step 1.5.3 Runtime semantics rehearsal): pre-flight probed base-table anon SELECT + anon-friendly RLS for EVERY base table of EVERY §1.2 view. The probe **caught the Brief's scope error** before any DDL was authored. Findings escalated to Daniel via `escalations/2026-05-15T0917Z_hotfix3_brief_scope_insufficient_for_15_view_closure.md`; Daniel picked **Option B (scope-out unsafe views)** — this SPEC reflects that decision.
  - From `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1: §Destructive Operations heading uses plain `## N. Destructive Operations` (no `§` prefix) for Iron-Rule-32 hook compatibility.
- Pre-existing untracked files surveyed: 132 (architecture briefs + drafts). Executor will use selective `git add` by filename throughout — `git add -A` is FORBIDDEN.

### 0.1 — Daniel's scope decision (2026-05-15)

Pre-flight surfaced that the Brief's 3-table §1.1 scope is insufficient to enable §1.2's 15-view closure. Three options were presented; Daniel picked **Option B — Scope-out unsafe views**. The 9 storefront views (`v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_products`, `v_storefront_categories`, `v_storefront_config`, `v_storefront_media`, `v_public_tenant`, plus `v_content_translations` which is reclassified as admin) are deferred to `SECURITY_HOTFIX_4` with a brief stub authored in this SPEC's §10 commit set.

This SPEC therefore closes:
- 2 of 15 deferred views via §1.2 storefront-cohort flip (`v_storefront_blog_posts`, `v_storefront_pages`)
- 5 of 15 deferred views via §1.3 admin-cohort REVOKE anon + flip (`v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats`)
- F-CRIT-2 advisor delta: 15 → 8 (post-HOTFIX_3) — 7 closed (5 admin + 2 storefront) in this SPEC.
- The 8 remaining storefront views (with their 5 additional base tables `brands`/`inventory`/`media_library`/`tenant_branches`/`storefront_config`) → `SECURITY_HOTFIX_4` Brief stub created in this SPEC's §10 commit set.

### 0.2 — Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Source | Metric | Value (captured 2026-05-15T0917Z) |
|---|---|---|---|
| `BASE_BLOG_POSTS_PUBLISHED` | live DB (Prizma) | `COUNT(*) FROM blog_posts WHERE status='published'` | 174 |
| `BASE_STOREFRONT_PAGES_PUBLISHED` | live DB (Prizma) | `COUNT(*) FROM storefront_pages WHERE status='published'` | 81 |
| `BASE_AI_CONTENT_PUBLISHED` | live DB (Prizma) | `COUNT(*) FROM ai_content WHERE status='published'` | 0 (admin-cohort; OK) |
| `BASE_ADVISOR_F_CRIT_2` | get_advisors security | `security_definer_view` count | 15 |
| `BASE_ADVISOR_F_CRIT_3` | get_advisors security | `anon_security_definer_function_executable` count | 17 |
| `BASE_DEFERRED_VIEWS_NOT_SET` | `pg_class.reloptions` | views with `security_invoker NOT_SET` | 15 |

---

## 1. Goal

Close SECURITY_HOTFIX_2's deferred follow-ups under Daniel-approved **Option B** scope: harden the 5 admin-cohort views (REVOKE anon + `security_invoker=on`), expand RLS on the 3 Brief-scoped base tables, flip the 2 storefront views whose base-table fan-out is satisfied by §1.1, harden `save_translation_memory_batch` 2nd overload, and apply Foreman A/B/C decisions to the 15 F-CRIT-3 carry RPCs — all without any data row writes on any tenant.

---

## 2. Background & Motivation

SECURITY_HOTFIX_2 (closed 🟡 2026-05-15) deferred 15 of 17 F-CRIT-2 views because their base tables denied anon SELECT — flipping `security_invoker=on` without base-table prep would have broken the storefront. HOTFIX_2 FOREMAN_REVIEW §10 declared SECURITY_HOTFIX_3 as the mandatory follow-up with a 5-part scope. The Brief was authored expecting 3 base tables to suffice; pre-flight surfaced that the 15 deferred views actually fan out to 11 base tables. Daniel approved Option B (scope-out unsafe views, ship a smaller hotfix, queue HOTFIX_4 for the rest).

Dependencies:
- SECURITY_HOTFIX_2 closed at SHA `47f9967` (see `docs/specs/SECURITY_HOTFIX_2_2026_05_15/EXECUTION_REPORT.md`).
- HOTFIX_2 FOREMAN_REVIEW §10 declares this SPEC.
- `JWT_VALIDATION_HEADER.sql` reference file (added by HOTFIX_2 closeout).
- `opticup-strategic` skill Step 1.5.3 + `opticup-executor` skill Step 1.5 sub-items #8 + #9 (added by HOTFIX_2 closeout).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at close | On `develop`, clean | `git status --porcelain` → empty |
| 2 | New SPEC folder files | 4 files: `SPEC.md` (this file), `EXECUTION_REPORT.md`, `FINDINGS.md`, `FOREMAN_REVIEW.md` | `ls modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/` |
| 3 | Backup folder populated | Pre-edit copies of: 3 base tables' RLS policies, 2 view defs (§1.2), 5 admin view defs (§1.3), 16 function bodies (1 §1.4 + 15 §1.5) | `ls modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_3_2026_05_15/` ≥ 26 files |
| 4 | §1.1 — new RLS policies | 2 new policies: `blog_posts_public_read_published`, `ai_content_public_read_published`; existing `storefront_pages_anon_read` kept (Rule 21 no-duplicates) | `pg_policies` query returns 2 new rows |
| 5 | §1.1 — GRANT SELECT TO anon | `blog_posts`, `storefront_pages`, `ai_content` ACL contains `anon=...r...` | `pg_class.relacl` per table |
| 6 | §1.1 — anon-visible row counts post-policy | `blog_posts`=`BASE_BLOG_POSTS_PUBLISHED`=174, `storefront_pages`=`BASE_STOREFRONT_PAGES_PUBLISHED`=81, `ai_content`=`BASE_AI_CONTENT_PUBLISHED`=0 | `SET LOCAL ROLE anon; SELECT COUNT(*) FROM <table>;` per table (executed via `request.jwt.claims` empty) |
| 7 | §1.2 — 2 storefront views flipped | `v_storefront_blog_posts` + `v_storefront_pages` have `reloptions @> ARRAY['security_invoker=on']` | `pg_class.reloptions` query |
| 8 | §1.2 — per-view rollback tags | 2 git tags: `pre-hotfix3-view-v_storefront_blog_posts`, `pre-hotfix3-view-v_storefront_pages` | `git tag -l 'pre-hotfix3-view-*'` returns 2 |
| 9 | §1.2 — per-view anon probe | v_storefront_blog_posts row count post-flip = `BASE_BLOG_POSTS_PUBLISHED` × Prizma share (174 — single-tenant in production); v_storefront_pages = `BASE_STOREFRONT_PAGES_PUBLISHED` (81). PASS = post-count > 0 AND matches expected | per-view anon SELECT |
| 10 | §1.3 — 5 admin views locked | `v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats`: `anon_has_select=false` AND `reloptions @> ARRAY['security_invoker=on']` | `pg_class.reloptions` + `has_table_privilege` |
| 11 | §1.4 — save_translation_memory_batch 2nd overload hardened | The `(p_entries jsonb)` overload has 3-role-aware Block A header + `anon_execute=false` + `proconfig` contains `search_path=public` | `pg_proc` query both overloads |
| 12 | §1.5 — 15 carry RPCs per A/B/C | 14 RPCs Option B (REVOKE anon + Block A header where applicable); 1 RPC Option C (validate_slug — keep anon, no JWT header). All have `search_path=public` set | `pg_proc` per RPC |
| 13 | §1.5 — demo wrong-tenant test | For each Option B RPC with `p_tenant_id`: a wrong-tenant JWT call returns `42501 Unauthorized: tenant_id mismatch` | demo-tenant probe |
| 14 | Smoke pre + post | `npm run smoke` returns 7/7 PASS BEFORE migration (baseline) AND AFTER migration (regression check) | `npm run smoke` exit 0 twice |
| 15 | Storefront curl probe — 2 in-scope pages | Storefront pages consuming the 2 flipped views (blog list + a CMS page) return HTTP 200 + non-empty body | `curl -fsS <url>` per page |
| 16 | Supabase advisor delta | F-CRIT-2 (`security_definer_view`) post-migration = 8 (was `BASE_ADVISOR_F_CRIT_2`=15); F-CRIT-3 (`anon_security_definer_function_executable`) post-migration = 2 (validate_slug + verify_campaign_page_password remain — both Option A/C by design) | `get_advisors security` |
| 17 | No new advisor finding TYPES | Post-migration advisor has zero `name` strings absent from baseline (no new vulnerability class introduced) | `get_advisors security` diff |
| 18 | No tenant data row writes on any tenant | Audit log of executed SQL — only DDL (CREATE POLICY, GRANT, ALTER VIEW, CREATE OR REPLACE FUNCTION, REVOKE) — zero `INSERT/UPDATE/DELETE` on tenant data | Manual review of migration SQL |
| 19 | HOTFIX_2 §10 follow-ups marked RESOLVED | `OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` F-CRIT-2 partial→RESOLVED-IN-PART (7/17 closed by HOTFIX_3); `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` updated similarly; HOTFIX_2 `FOREMAN_REVIEW.md` §10 follow-up entries marked RESOLVED with SHA references | grep returns expected markers |
| 20 | HOTFIX_4 Brief stub created | `modules/Module 1.5 - Shared Components/architecture-brief/SECURITY_HOTFIX_4_BRIEF.md` exists with the 8 deferred views + 5 deferred base tables enumerated | `ls` exit 0 + grep view names |
| 21 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 22 | Iron Rule 32 — destructive-ops gate | Pre-commit hook passes for this SPEC's §Destructive Operations declaration | `node scripts/checks/destructive-ops-declared.mjs` exit 0 during commit |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo + run any Level 1 (read-only) SQL.
- Apply migrations in the order specified in §9 Commit Plan via `mcp__claude_ai_Supabase__apply_migration`.
- Edit `MODULE_SPEC.md` + `SESSION_CONTEXT.md` + `CHANGELOG.md` for Module 1.5; edit `OPEN_TASKS.md` + `MASTER_ROADMAP.md` § related entries + the 2 audit reports in §3 #19.
- Create new files only at the paths listed in §8 Expected Final State.
- Commit and push to `develop` with selective `git add` by filename.
- Run the standard verify scripts (`verify.mjs`, `verify-tree-integrity.mjs`, `smoke`).

### What REQUIRES stopping and reporting

Per CLAUDE.md §9 global STOP-on-deviation, plus this SPEC's §5 specific triggers.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **STT-1:** If §1.2 anon probe post-flip returns 0 rows for either view (where pre-migration returned >0), rollback THAT view immediately via `pre-hotfix3-view-<name>` git tag's recorded view def + `ALTER VIEW ... SET (security_invoker=off)`, write an escalation file under `modules/Module 1.5 - Shared Components/escalations/`, and STOP.
- **STT-2:** If any storefront page consuming a migrated view returns non-200 in curl probe (§3 #15), rollback the offending view + escalate + STOP.
- **STT-3:** If §1.5 body inspection of any of the 15 carry RPCs reveals tenant derivation from an UNTRUSTED source (caller-supplied param without validation, or a subquery on a table without RLS), STOP and escalate (may be a pre-existing security bug needing wider fix).
- **STT-4:** If demo wrong-tenant test (§3 #13) fails to reject for any §1.5 Option B RPC, STOP — Block A header is misapplied.
- **STT-5:** If smoke <7/7 PASS pre-migration (§3 #14), STOP — pre-existing regression must be diagnosed before adding HOTFIX_3 changes.
- **STT-6:** If get_advisors post-migration returns ANY new advisor `name` string beyond the closure of F-CRIT-2 (15→8) and F-CRIT-3 (17→2), STOP — list them in EXECUTION_REPORT and escalate.
- **STT-7:** If ANY tenant data row UPDATE/INSERT/DELETE fires during execution (this SPEC is structural-only), STOP and rollback the migration. Use the Supabase MCP `execute_sql` audit + watch for unexpected `rowcount` in tool responses.
- **STT-8:** If the Iron Rule 32 destructive-ops hook blocks a commit unexpectedly (i.e. operation not declared in §Destructive Operations below), STOP and report — do NOT amend this SPEC's §Destructive Operations mid-run. Add a new escalation file + ask Foreman.

---

## 6. Rollback Plan

### Per-view rollback (§1.2)
Each of the 2 storefront views gets a git tag `pre-hotfix3-view-<name>` BEFORE its flip. The tag points to the commit immediately before the flip migration. Rollback path:
- `git tag -l 'pre-hotfix3-view-<name>'` → confirms tag exists.
- Read the pre-flip view definition from the backup folder: `modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_3_2026_05_15/view_<name>_predef.sql`.
- Apply via `apply_migration`: `ALTER VIEW public.<name> SET (security_invoker=off);` (DDL — additive, reverses the flip).
- Per-view rollback is independent — one view's rollback does not affect the other.

### Per-RPC rollback (§1.4 + §1.5)
Each function body is `CREATE OR REPLACE FUNCTION` — the previous body is preserved in the backup folder as `function_<name>_<oid>_prebody.sql`. Rollback path:
- Read backup file.
- Apply via `apply_migration`: paste the pre-edit body verbatim.

### Per-base-table rollback (§1.1)
- Drop the new policy: `DROP POLICY IF EXISTS <table>_public_read_published ON <table>;`
- Revoke the new grant: `REVOKE SELECT ON <table> FROM anon;`
- `storefront_pages_anon_read` was pre-existing — do NOT drop on rollback.

### Per-admin-view rollback (§1.3)
- Restore anon SELECT: `GRANT SELECT ON <view> TO anon;`
- Revert `security_invoker=on`: `ALTER VIEW <view> SET (security_invoker=off);`

If the SPEC fails partway through, no `git reset --hard` is needed — every DDL change has a per-object rollback above, executed via `apply_migration`. The repo's git state is recoverable via standard branch operations (rollback individual commits if needed).

---

## 7. Destructive Operations

Per Iron Rule 32. This SPEC authorizes:

1. **CREATE POLICY × 2** on `blog_posts`, `ai_content` (additive).
2. **GRANT SELECT TO anon × 3** on `blog_posts`, `storefront_pages`, `ai_content` (additive).
3. **ALTER VIEW SET (security_invoker=on) × 7** — 2 storefront + 5 admin views (metadata change, additive — reverses cleanly via `security_invoker=off`).
4. **REVOKE SELECT FROM anon × 5** — on 5 admin views (`v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats`). DECLARED destructive because reversing requires a re-GRANT.
5. **CREATE OR REPLACE FUNCTION × ~15** — 1 `save_translation_memory_batch(p_entries jsonb)` + 14 of the 15 §1.5 carry RPCs that take Option B. Additive replace; each function's prior body is captured in the backup folder for per-RPC rollback.
6. **REVOKE EXECUTE FROM anon × 14** — on the 14 Option B RPCs from §1.5 + 1 `save_translation_memory_batch(p_entries jsonb)`. DECLARED destructive because reversing requires re-GRANT.
7. **No DROP, no DELETE, no TRUNCATE, no schema removal, no `main` branch ops, no `git reset --hard`, no `git push --force`, no `git rebase`, no `--no-verify`.**

The Iron Rule 32 pre-commit hook (`scripts/checks/destructive-ops-declared.mjs`) will scan staged diffs for these patterns and verify each falls under one of the 7 declarations above. Any operation outside this list → STT-8 STOP trigger.

---

## 8. Out of Scope (explicit)

- The 8 deferred storefront views: `v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_products`, `v_storefront_categories`, `v_storefront_config`, `v_storefront_media`, `v_public_tenant` → `SECURITY_HOTFIX_4`.
- The 5 deferred base-table RLS expansions: `brands`, `inventory`, `media_library`, `tenant_branches`, `storefront_config` → `SECURITY_HOTFIX_4`.
- `v_crm_lead_first_touch` (pre-flight side-finding: `anon_has_select=true` AND `security_invoker=true`; admin-purpose; not in F-CRIT-2 advisor list) → FINDINGS.md item for future hotfix.
- `verify_campaign_page_password` — HOTFIX_2 retained anon EXECUTE under Option A (Block A-alt slug validation); this SPEC does NOT re-litigate.
- Refactoring view bodies beyond the metadata `security_invoker=on` flag.
- Refactoring base-table schema beyond adding the 2 new RLS policies + 3 GRANTs.
- Storefront source code changes (the storefront should be transparent to this hotfix — view changes are metadata).
- Backfill of historical data.
- HIGH/MEDIUM/LOW findings from Bundle 2 audits (separate future hotfix).
- Storefront repo (`opticup-storefront`) commits.
- `main` branch operations (no merge, no push).

---

## 9. Expected Final State

### New files (created by Executor)
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/EXECUTION_REPORT.md`
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/FINDINGS.md`
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md` (Foreman closeout)
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/REVIEW.md` (Reviewer Stage 1)
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/TEST_REPORT.md` (Localhost-Tester Stage 2)
- `modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_3_2026_05_15/` — ≥26 files (3 base-table policy snapshots + 7 view defs + 16 function bodies)
- `modules/Module 1.5 - Shared Components/architecture-brief/SECURITY_HOTFIX_4_BRIEF.md` (HOTFIX_4 stub for the deferred 8 views + 5 base tables)

### Modified files
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — current status block updated to reflect HOTFIX_3 closure.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — new section for HOTFIX_3 commits.
- `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` — F-CRIT-2 partial→`RESOLVED IN PART (7/17 closed by HOTFIX_3 SHA ...)`.
- `modules/Module 1.5 - Shared Components/architecture-brief/SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` — corresponding RPC entries updated.
- `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` §10 — `SECURITY_HOTFIX_3` declaration marked RESOLVED with this SPEC's SHA.
- `OPEN_TASKS.md` — HOTFIX_3 marked CLOSED 🟡 (partial F-CRIT-2 closure), HOTFIX_4 queued.

### DB state (live + demo tenants are read-only for data; structural-only DDL changes)
- 2 new RLS policies on public tables (`blog_posts_public_read_published`, `ai_content_public_read_published`).
- 3 new GRANTs (SELECT TO anon).
- 7 views with `reloptions @> ARRAY['security_invoker=on']` (2 storefront + 5 admin).
- 5 admin views with `anon` removed from `relacl`.
- ~15 functions rewritten via `CREATE OR REPLACE FUNCTION` (14 Option B + 1 §1.4 second overload).
- 14 functions with anon EXECUTE revoked + service_role/authenticated retained.

### Per-view git tags
- `pre-hotfix3-view-v_storefront_blog_posts`
- `pre-hotfix3-view-v_storefront_pages`

(No per-view tags for §1.3 admin views — those flips are non-customer-impacting; rollback via simple `GRANT + ALTER` is sufficient.)

### Docs updated (MUST include)
- `MASTER_ROADMAP.md` — only if any "Module 1.5 status" line needs touching (likely none — hotfix, not phase boundary). If untouched, EXECUTION_REPORT §3 explicitly states "not modified — hotfix, not phase boundary".
- `docs/GLOBAL_MAP.md` — likely not modified (no new functions or contracts).
- `docs/GLOBAL_SCHEMA.sql` — likely not modified (no new tables/views; policies + GRANTs are metadata).

---

## 10. Commit Plan

Apply migrations in this order (smallest blast radius first, per Brief §3 step 3):

- **Commit 1** — `feat(security): seal SECURITY_HOTFIX_3 SPEC folder + backups + HOTFIX_4 Brief stub`
  - Adds `SPEC.md` (this file).
  - Creates backup folder + populates with pre-edit snapshots of 3 base-table policies, 7 view defs, 16 function bodies, plus this SPEC's preconditions.
  - Adds `architecture-brief/SECURITY_HOTFIX_4_BRIEF.md` stub.

- **Commit 2** — `feat(security): HOTFIX_3 §1.3 lock 5 admin views (REVOKE anon + security_invoker=on)`
  - Migration: REVOKE SELECT FROM anon + ALTER VIEW SET security_invoker=on for the 5 admin views.
  - Verifies post-migration `has_table_privilege('anon', ...)` = false + `reloptions` contains `security_invoker=on`.

- **Commit 3** — `feat(security): HOTFIX_3 §1.4 harden save_translation_memory_batch(p_entries jsonb)`
  - Migration: CREATE OR REPLACE the (p_entries jsonb) overload with the 3-role-aware Block A header + `SET search_path TO 'public'` + REVOKE EXECUTE FROM anon, PUBLIC.

- **Commit 4** — `feat(security): HOTFIX_3 §1.5 14 Option B + 1 Option C RPC hardening`
  - Migration: 14 CREATE OR REPLACE + 14 REVOKE EXECUTE FROM anon + 1 keep-anon (validate_slug — Option C).
  - 14 Option B RPCs get Block A or trigger-context lockdown per pre-flight body inspection.
  - validate_slug stays anon-callable with rationale.

- **Commit 5** — `feat(security): HOTFIX_3 §1.1 base-table RLS expansion (2 new policies + 3 grants)`
  - Migration: CREATE POLICY blog_posts_public_read_published + CREATE POLICY ai_content_public_read_published + GRANT SELECT TO anon on all 3.
  - Verifies post-migration anon-visible row counts per §3 #6.

- **Commit 6** — `feat(security): HOTFIX_3 §1.2 flip v_storefront_blog_posts (with rollback tag)`
  - `git tag pre-hotfix3-view-v_storefront_blog_posts`
  - Migration: ALTER VIEW SET security_invoker=on.
  - Per-view anon probe: expect 174 rows. STOP-rollback if 0.

- **Commit 7** — `feat(security): HOTFIX_3 §1.2 flip v_storefront_pages (with rollback tag)`
  - `git tag pre-hotfix3-view-v_storefront_pages`
  - Migration: ALTER VIEW SET security_invoker=on.
  - Per-view anon probe: expect 81 rows.

- **Commit 8** — `docs(security): close SECURITY_HOTFIX_3 with EXECUTION_REPORT + FINDINGS + audit-report updates + REVIEW + TEST_REPORT + FOREMAN_REVIEW`
  - Adds all retrospective deliverables.
  - Updates HOTFIX_2 FOREMAN_REVIEW §10 + OVERNIGHT_BUNDLE_2 + SENTINEL_DEEP_DIVE.
  - Updates SESSION_CONTEXT + CHANGELOG.
  - Marks OPEN_TASKS entry CLOSED 🟡 + queues HOTFIX_4.

---

## 11. §1.5 A/B/C Decisions Per RPC (Foreman pre-bakes — no executor decision needed)

For each of the 15 F-CRIT-3 carry RPCs, the Foreman has pre-decided A/B/C based on pre-flight body inspection + tenant-derivation path analysis. The executor applies the decision verbatim. **Default per activation prompt = Option B (safer over-restrict). Choose C only when pre-flight proves a real public flow exists with no anon JWT.**

### Option B — JWT header (Block A) + REVOKE EXECUTE FROM anon (14 RPCs)

| # | RPC | Signature | Rationale |
|---|-----|-----------|-----------|
| 1 | `acknowledge_failed_messages` | `(p_message_log_ids uuid[], p_reason text)` | Admin tool — failed-messages dashboard. No anon caller. Add Block A header that derives tenant via `crm_message_log.tenant_id` join on the ids; service_role bypasses. REVOKE anon. |
| 2 | `attendee_status_change_event_fn` | `()` (trigger) | Trigger function — anon EXECUTE meaningless. REVOKE anon. No JWT header needed (trigger context is the protection). |
| 3 | `event_status_change_event_fn` | `()` (trigger) | Same as #2. REVOKE anon. |
| 4 | `event_status_close_recycle_leads_fn` | `()` (trigger) | Same as #2. REVOKE anon. |
| 5 | `get_all_tenants_overview` | `()` | Platform-admin tool — should never be anon-callable. Add `is_platform_super_admin()` guard (uses auth.uid()) + REVOKE anon. |
| 6 | `increment_paid_amount` | `(p_doc_id uuid, p_delta numeric)` | Suppliers-debt write. Derive tenant via `document_links.tenant_id` join. Add 3-role-aware Block A using the derived tenant. REVOKE anon. SET search_path. |
| 7 | `increment_prepaid_used` | `(p_deal_id uuid, p_delta numeric)` | Same pattern as #6. REVOKE anon. SET search_path. |
| 8 | `is_platform_super_admin` | `()` | RLS helper. Body uses `auth.uid()`. REVOKE anon (anon's auth.uid() is NULL, so call is futile anyway). No JWT header — function is its own auth. |
| 9 | `lead_status_change_event_fn` | `()` (trigger) | Trigger. REVOKE anon. |
| 10 | `mark_translations_stale` | `(p_page_id uuid, p_changed_blocks text[])` | Admin translation tool. Derive tenant via `storefront_pages.tenant_id` join on p_page_id. Add Block A using derived tenant. REVOKE anon. SET search_path. |
| 11 | `promote_lead_on_message_sent` | `()` (trigger) | Trigger. REVOKE anon. |
| 12 | `promote_to_platform` | `(p_memory_ids uuid[])` | Admin translation-memory promotion. Platform-admin only. Add `is_platform_super_admin()` guard + REVOKE anon. SET search_path. |
| 13 | `register_lead_to_event` | `(p_tenant_id uuid, ...)` | Storefront-submit flow today; pre-flight confirms body already has WEAK Block A variant (no service_role bypass). Storefront actually calls this via Edge Function with service_role, NOT direct anon. Upgrade body to canonical 3-role-aware Block A from JWT_VALIDATION_HEADER.sql. REVOKE anon (Edge Function calls service_role; anon is never the legitimate caller). |
| 14 | `resolve_touchpoints_to_lead` | `(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text)` | Same Edge Function path as #13. Upgrade body to canonical 3-role-aware Block A. REVOKE anon. |

### Option C — Keep anon EXECUTE (1 RPC)

| # | RPC | Signature | Rationale |
|---|-----|-----------|-----------|
| 15 | `validate_slug` | `(p_slug text)` | Pure validation function — regex match + reserved-words check + `tenants` uniqueness check. No tenant context, no side effects, no data exposure. Legitimately anon-callable (signup flow). KEEP anon EXECUTE. NO JWT header (none needed). Already has `SET search_path TO 'public'`. |

### Option A — Trusted-source keep (0 RPCs)

None this hotfix.

**Net advisor closure (§1.5 + §1.4):** 14 RPCs B-closed + 1 RPC `save_translation_memory_batch(p_entries jsonb)` B-closed = 15 closures. Remaining open: `validate_slug` (Option C) + `verify_campaign_page_password` (HOTFIX_2 Option A retained) = 2 open. F-CRIT-3 advisor delta: 17 → 2.

---

## 12. Dependencies / Preconditions

- SECURITY_HOTFIX_2 closed (SHA `47f9967` per HOTFIX_2 EXECUTION_REPORT) — REQUIRED.
- `JWT_VALIDATION_HEADER.sql` reference file present at `.claude/skills/opticup-strategic/references/` — REQUIRED.
- `opticup-executor` skill Step 1.5 sub-items #8 (base-table RLS probe) + #9 (Tooling Pre-Flight) present — REQUIRED.
- Supabase MCP available (project_id `tsxrrxzmdxaenlvocyit`) — REQUIRED for live DB queries + apply_migration.
- ERP + Storefront localhost stack available for Localhost-Tester stage — REQUIRED.

---

## 13. Lessons Already Incorporated

- FROM `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` Proposal P-AUTHOR-1 → "Canonical JWT validation header template" → APPLIED in §11 (Option B RPCs reference `JWT_VALIDATION_HEADER.sql` for Block A verbatim; no hand-rolled JWT-claim checks in this SPEC).
- FROM `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` Proposal P-AUTHOR-2 → "Runtime semantics rehearsal (§1.5.3 sub-step)" → APPLIED. Pre-flight rehearsed runtime semantics for every §1.2 view's base tables AND every §1.5 RPC's tenant-derivation. The rehearsal CAUGHT the Brief's scope error before SPEC-seal (see §0.1 — Daniel's Option B decision). This SPEC scopes-out unsafe views per the skill's exact prescription.
- FROM `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` Proposal P-EXEC-1 → "Base-table RLS probe when SPEC modifies view security_invoker" → APPLIED at AUTHOR time (not at execute time — the Foreman did the probe and pre-scoped). Executor still re-probes per the skill's Step 1.5 #8 — belt-and-suspenders.
- FROM `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` Proposal P-EXEC-2 → "Tooling Pre-Flight (npm-package + tmp-script template)" → APPLIED. This SPEC uses `mcp__claude_ai_Supabase__apply_migration` directly (no Node script needed); the executor's Tooling Pre-Flight will confirm zero ad-hoc scripts are needed for this SPEC.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → "Plain `## N.` heading for Iron-Rule-32 compatibility" → APPLIED throughout this SPEC.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2 → "Baselines as symbols in §0" → APPLIED in §0.2 (`BASE_BLOG_POSTS_PUBLISHED`, etc., referenced symbolically by §3 success criteria).
- **Cross-Reference Check (Rule 21):** new policy names `blog_posts_public_read_published` + `ai_content_public_read_published` grep returns 0 hits across `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md`, `modules/*/docs/db-schema.sql`. `storefront_pages_anon_read` ALREADY EXISTS (Rule 21 hit — resolved by NOT creating a duplicate, just adding the missing GRANT). All other new objects: 0 collisions.

---

## 14. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] **Iron Rule 32 destructive-ops gate:** pre-commit hook passes for every commit in §10.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` + `REVIEW.md` + `TEST_REPORT.md` + `FOREMAN_REVIEW.md` all present in this SPEC folder.
- [ ] Module 1.5 SESSION_CONTEXT + CHANGELOG updated.
- [ ] HOTFIX_2 FOREMAN_REVIEW §10 + OVERNIGHT_BUNDLE_2 + SENTINEL_DEEP_DIVE marked RESOLVED with SHA.
- [ ] HOTFIX_4 Brief stub created.
- [ ] No data row writes on any tenant — audit confirmed.
- [ ] Smoke 7/7 pre AND post.

---

*End of SPEC. Author: opticup-strategic (Foreman). Ready for Executor.*
