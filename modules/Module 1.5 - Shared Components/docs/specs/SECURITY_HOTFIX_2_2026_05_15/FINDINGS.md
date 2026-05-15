# FINDINGS — SECURITY_HOTFIX_2_2026_05_15

**Logged by:** opticup-executor (Full-Auto Pipeline)
**Date:** 2026-05-15

---

## F-1 — SECURITY_HOTFIX_3 SPEC stub: close remaining 15 views + base-table RLS expansions

- **Severity:** HIGH
- **Location:** `modules/Module 1.5 - Shared Components/` (new SPEC needed)
- **Description:** 15 of 17 views remain without `security_invoker=on`. The blocker is that their base tables (`blog_posts`, `storefront_pages`, `ai_content`, plus cascade through `v_storefront_products`'s scalar subqueries) have JWT-claim RLS policies that filter every row to NULL for anon callers. Flipping security_invoker=on without first adding anon-friendly RLS policies causes a storefront outage.
- **Affected views (15):** `v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_public_tenant`, `v_storefront_blog_posts`, `v_storefront_branches`, `v_storefront_brand_page`, `v_storefront_brands`, `v_storefront_categories`, `v_storefront_config`, `v_storefront_media`, `v_storefront_pages`, `v_storefront_products`, `v_tenant_i18n_overrides`, `v_translation_dashboard`.
- **Required base-table RLS expansions:** `blog_posts`, `storefront_pages`, `ai_content` need `anon_read_public` policies (e.g., `USING (status='published' AND is_deleted=false)`). The other base tables (`tenants`, `tenant_branches`, `brands`, `media_library`, `storefront_config`, `content_translations`, `crm_events`, `crm_event_attendees`, `tenant_i18n_overrides`) need anon read policies with appropriate filters (likely `is_active=true` or `published_status='published'`).
- **Suggested next action:** Open `SECURITY_HOTFIX_3` SPEC. Brief should pre-flight by querying `pg_policies` per base table + checking for anon-readable USING clauses. Scope: 3 base-table RLS expansions + 15 ALTER VIEW. Estimated effort: 2-3 hours.

## F-2 — `translate-direct.cjs` storefront CLI dev script will fail post-§1.3

- **Severity:** LOW (dev tooling, not production)
- **Location:** `opticup-storefront/scripts/translate-direct.cjs` lines 22-23 (uses `PUBLIC_SUPABASE_ANON_KEY`) and line 108 (calls `sb.rpc('create_translated_page', ...)`).
- **Description:** The script creates a Supabase client with the anon key and calls `create_translated_page` to bulk-translate pages via Anthropic API. Post-§1.3, anon EXECUTE has been REVOKEd from `create_translated_page` (Option B). The script will error 42501 on the first RPC call.
- **Why not fixed here:** Per CLAUDE.md §9 #2 "one concern per task" + SPEC §7 explicit out-of-scope ("Changing storefront source code"). The script is dev tooling, not production. Production translation flows use the `translate-content` Edge Function which uses `SERVICE_ROLE_KEY` — those continue to work (service_role bypass in Block A).
- **Suggested next action:** Open a tiny SPEC in `opticup-storefront/scripts/docs/specs/TRANSLATE_DIRECT_CLI_SERVICE_ROLE_SWITCH/` (or equivalent). Change line 108's `sb.rpc(...)` to `sbAdmin.rpc(...)` — the script already has `sbAdmin` defined at line 42. ~5-minute fix; should also be applied to any other `sb.rpc()` calls in the script that use service-role-only RPCs.

## F-3 — `save_translation_memory_batch` has 2 overloads; only `p_tenant_id`-bearing variant in scope

- **Severity:** INFO
- **Location:** `pg_proc` — `public.save_translation_memory_batch(p_tenant_id uuid, p_entries jsonb)` AND `public.save_translation_memory_batch(p_entries jsonb)`.
- **Description:** The second overload (no `p_tenant_id`) is also SECURITY DEFINER but was not in the §1.3 24-RPC scope (pre-flight filtered on `p_tenant_id IN args`). It remains untouched: still has anon EXECUTE (likely), still lacks JWT-validation header, still anon-callable. The Sentinel may flag it at next scan.
- **Suggested next action:** Audit the second overload during SECURITY_HOTFIX_3 pre-flight. If it's truly admin-only, REVOKE anon and add a JWT check. If it's a legacy overload that should be dropped entirely, that's a Rule 21 cleanup item.

## F-4 — `tenant_i18n_overrides` view in F-CRIT-2 scope is admin-only; could be Option A candidate

- **Severity:** LOW (refinement)
- **Location:** `v_tenant_i18n_overrides`.
- **Description:** This view (deferred to HOTFIX_3 per F-1) is admin-facing (translator panel). Anon should never read it. The proper fix is not to add anon-friendly RLS to `tenant_i18n_overrides` table; it's to REVOKE anon SELECT from the view + apply security_invoker=on. Two-policy lockdown rather than RLS expansion.
- **Suggested next action:** Categorize HOTFIX_3 views into two cohorts: (a) storefront-facing → needs anon-friendly RLS on base tables + security_invoker; (b) admin-facing → just REVOKE anon SELECT + security_invoker. `v_tenant_i18n_overrides` + `v_translation_dashboard` + `v_ai_content` + `v_crm_event_stats` are admin candidates. The 11 `v_storefront_*` + `v_public_tenant` are storefront candidates.

## F-5 — Block A pattern needs to become a project-wide template

- **Severity:** INFO
- **Location:** `.claude/skills/opticup-strategic/references/` (new file proposed)
- **Description:** The 3-role-aware Block A pattern (service_role bypass + strict non-service-role check) is correct for every SECURITY DEFINER RPC that accepts `p_tenant_id`. Inlining the pattern in each SPEC risks the SPEC author writing a different (potentially buggy) version. Escalation #2 already proved this risk: SPEC §3a's literal Block A had a NULL-comparison loophole that wasn't caught at author time.
- **Suggested next action:** Add `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql` containing the canonical 3-role-aware Block A pattern with comments explaining when to use Block A vs Block A-alt. SPEC_TEMPLATE.md §3a Shared Edit Block instructions: "for JWT-claim SECURITY DEFINER hardening, reference `references/JWT_VALIDATION_HEADER.sql` rather than inlining."

## F-6 — Add `chokidar` / pg / dotenv dependency declarations check to Step 1.5

- **Severity:** INFO (process)
- **Location:** Executor SKILL.md
- **Description:** Mid-execution I needed `pg` (Node Postgres client) and assumed it was a dep; lucky guess. If it had been absent, I would have hit a runtime error mid-migration. A pre-execution "what npm packages does this SPEC's tooling need?" check in Step 1.5 would catch undeclared deps before the heavy work begins.
- **Suggested next action:** Add a sub-step to Step 1.5 DB Pre-Flight: "If the SPEC will run any Node script, check `package.json` for the dependencies the script will use BEFORE creating the script."

## F-7 — Three escalations in one SPEC indicates SPEC author-time pre-flight gap

- **Severity:** PROCESS
- **Location:** opticup-strategic SKILL.md Step 1 Pre-SPEC Preparation
- **Description:** This run hit 3 escalations:
  1. Anon-callable count inverted (Brief error)
  2. Block A NULL-loophole + service_role break (SPEC defect)
  3. Storefront-outage risk from security_invoker=on (SPEC defect — pre-flight didn't probe RLS)
  
  Each was a real and material defect. None were caught at SPEC author time. The Foreman's Step 1.5 Cross-Reference Check didn't extend to runtime-semantics checks (e.g., "does Block A actually reject anon?", "do base-table RLS policies allow anon reads?").
- **Suggested next action:** Expand opticup-strategic Step 1.5 to include a "Runtime semantics rehearsal" checklist:
  - For each new function header / validation block: write a 2-line test case (anon caller, wrong tenant_id, service_role caller) and reason about behavior BEFORE sealing the SPEC.
  - For each view security flag change: probe `SET ROLE <target_role>; SELECT FROM <view>;` against the live DB BEFORE sealing.
  - Update FOREMAN_REVIEW_TEMPLATE.md to require a "Runtime semantics rehearsed: yes/no — evidence" line under §SPEC quality audit.

---

*End of FINDINGS. 7 findings logged. Severities: 1 HIGH (F-1), 2 LOW, 3 INFO, 1 PROCESS.*
