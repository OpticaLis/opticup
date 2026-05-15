# Escalation: SECURITY_HOTFIX_2 §1.2 — `security_invoker=on` would break 7 of 17 views (storefront outage risk)

> Created by: opticup-executor (pre-§1.2 STT-1 anon-role probe)
> Created at: 2026-05-15T11:10:00Z
> SPEC: modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md
> Status: OPEN

---

**Stuck at:** Pre-§1.2 probe (SPEC §5 STT-1). Cannot apply `security_invoker=on` to all 17 views without a storefront outage.

**What I found:**

The pre-migration anon-role probe (`SET ROLE anon; SELECT FROM ...`) hit `42501 permission denied for table blog_posts`. Postgres' hint message: "Grant the required privileges to the current role with: `GRANT SELECT ON public.blog_posts TO anon`."

This is exactly the STT-1 trigger: today's views work BECAUSE they run with owner privileges (the F-CRIT-2 vulnerability). Flipping `security_invoker=on` would make them run with anon's privileges, and several base tables don't grant anon SELECT at all.

### Affected view breakdown (3 cohorts)

**Cohort A — 10 SAFE views (anon SELECT granted on every base table, no cascading dependency on UNSAFE views):**
1. `v_public_tenant` (1 row, deps: tenants, storefront_config — both anon=true)
2. `v_storefront_branches` (1 row, dep: tenant_branches anon=true)
3. `v_storefront_brands` (311 rows, deps: brands, media_library, inventory, inventory_images — all anon=true)
4. `v_storefront_components` (0 rows, dep: storefront_components anon=true)
5. `v_storefront_config` (2 rows, dep: storefront_config anon=true)
6. `v_storefront_media` (276 rows, dep: media_library anon=true)
7. `v_storefront_reviews` (5 rows, dep: storefront_reviews anon=true)
8. `v_content_translations` (?, dep: content_translations anon=true)
9. `v_crm_event_stats` (?, deps: crm_events, crm_event_attendees — both anon=true)
10. `v_tenant_i18n_overrides` (?, dep: tenant_i18n_overrides anon=true)

These can take `security_invoker=on` safely. F-CRIT-2 closed on 10 views.

**Cohort B — 4 UNSAFE views (anon SELECT DENIED on a base table, would return permission_denied for anon callers):**
1. `v_storefront_blog_posts` — 172 rows currently anon-readable. Base: `blog_posts` (anon=false). Flip → outage on blog pages.
2. `v_storefront_pages` — 81 rows currently anon-readable. Base: `storefront_pages` (anon=false). Flip → outage on all CMS pages (`/contact/`, `/about/`, supersale, etc.).
3. `v_ai_content` — 1 row, base: `ai_content` (anon=false). Less critical (likely admin-tool consumer).
4. `v_translation_dashboard` — admin tool, base: `storefront_pages` (anon=false). Admin-only — break may be acceptable.

**Cohort C — 3 cascading UNSAFE views (depend on Cohort B or have scalar subqueries on anon-denied tables):**
1. `v_storefront_products` — 1119 rows, the storefront's core inventory query. Main FROM is anon-safe (inventory, brands). BUT has 3 scalar subqueries reading `ai_content` (anon=false) for `ai_description`, `ai_seo_title`, `ai_seo_description`. Postgres evaluates scalar subqueries with the same role; with `security_invoker=on`, the entire SELECT errors as anon. **TOTAL outage on the product catalog.**
2. `v_storefront_brand_page` — 45 rows, contains `EXISTS (SELECT 1 FROM v_storefront_products …)` in its WHERE. With v_storefront_products broken under security_invoker=on (Cohort C #1) AND v_storefront_brand_page also flipped, cascading break.
3. `v_storefront_categories` — 2 rows, builds from `v_storefront_products`. Cascading break.

**Net:** 10 SAFE + 4 directly UNSAFE + 3 cascading UNSAFE = 17 total. If we apply the SPEC literally and flip all 17, **at least the public storefront's product catalog (1119 products), blog (172 posts), and CMS pages (81 pages) go dark**. This is a storefront outage, not a slow regression.

### Why this wasn't caught in SPEC authoring

The Brief (and SPEC §1.2) anticipated the case where `security_invoker=on` would filter rows via RLS — and instructed STOP-and-escalate if the row count dropped. The actual failure mode is harsher: anon doesn't have the base-table SELECT privilege at all, so it's `42501 permission denied` (not a silent filter to 0 rows). The SPEC §0 pre-flight checked `anon_can_select` on VIEWS (showed true for all 17), but NOT on base TABLES. The base-table privilege gap is the real bug class.

### What I tried (read-only diagnostics)

- Probed `has_table_privilege('anon', '<table>', 'SELECT')` on 16 base tables → 4 denied (ai_content, blog_posts, storefront_pages — note `storefront_pages` is used by 2 different views).
- Probed `SET ROLE anon; SELECT FROM blog_posts` → 42501 confirmed.
- Cross-checked view bodies for scalar subqueries → found 3 in v_storefront_products on ai_content.

**Options I see:**

- **Option A — Carve-out: apply §1.2 to the 10 SAFE views only, defer the 7 UNSAFE (Cohort B + C) to a future hotfix.** _Pros:_ closes F-CRIT-2 partially (10/17 = 59%); zero storefront risk. _Cons:_ leaves 7 views with the F-CRIT-2 vulnerability; pre-merge tomorrow re-flags it. SPEC criterion #5 says "ALL 17 target views" — would need to be amended.
- **Option B — Expand scope: GRANT SELECT to anon on blog_posts + storefront_pages + ai_content with appropriate RLS to filter to public-only rows, then apply security_invoker=on to all 17.** _Pros:_ closes F-CRIT-2 fully. _Cons:_ requires base-table RLS policy changes — explicitly OUT OF SCOPE per SPEC §7. Architectural reach: 3 base tables × 2 policies each = ~6 new policies; need careful filter design ("published" status, soft-delete, tenant scope). Probably another 60+ minutes of work + Reviewer would need to audit the new policies. Higher blast radius.
- **Option C — Restructure: convert the 4 directly-UNSAFE views into SECURITY DEFINER functions instead of views. RPCs would replace the view+anon-SELECT pattern.** _Pros:_ explicit security model (function decides what to return). _Cons:_ major API surface change; storefront callers would need to switch from `sb.from('v_storefront_blog_posts').select()` to `sb.rpc('get_storefront_blog_posts')`. Massive storefront code change — out of scope.
- **Option D — Skip §1.2 entirely in this hotfix.** Apply §1.1 + §1.3 only. Defer F-CRIT-2 to a dedicated SECURITY_HOTFIX_3 that has the RLS policy scope. _Pros:_ keeps this hotfix focused + safe. _Cons:_ F-CRIT-2 stays open through tomorrow's pre-merge.

**My recommendation:** **Option A.** Closes F-CRIT-2 on 10 of 17 views (the safe ones) WITHOUT risk to production. The 7 UNSAFE views become a clearly-scoped follow-up: SECURITY_HOTFIX_3 will (a) GRANT SELECT to anon on the 3 base tables with proper RLS filtering, (b) flip security_invoker=on on the 7 remaining views. That follow-up has well-defined boundaries (3 base tables, 7 views) and can be authored cleanly. SPEC §5 criterion #5 needs amending from "ALL 17" → "ALL 10 SAFE; 7 UNSAFE carved out with rationale documented". FOREMAN_REVIEW harvests "Pre-flight must probe anon SELECT on BASE TABLES, not just on the views themselves" as an author-skill improvement.

**Question for Architect:** Apply Option A (carve out 7 UNSAFE views, ship F-CRIT-2 partial close on 10 SAFE views), Option B (expand scope to include base-table RLS work), Option C (RPC conversion), or Option D (skip §1.2 entirely this hotfix)?

---

## Architect Decision

**Resolution:** Option A — apply `security_invoker=on` to the 10 SAFE views only. Defer the 7 UNSAFE to SECURITY_HOTFIX_3.

**Reasoning for Foreman/Executor:** Storefront uptime > partial F-CRIT-2 closure. The 7 UNSAFE views all share the same architectural root cause (base table denies anon SELECT, view bypasses via owner privileges). Fixing them properly requires base-table RLS work which is out of scope per SPEC §7. SECURITY_HOTFIX_3 will be a dedicated SPEC: GRANT SELECT TO anon on blog_posts + storefront_pages + ai_content with RLS filtering to "published & not deleted" rows, then flip security_invoker=on on the 7 deferred views.

**Resume instruction:**
- §1.2 migration applies to ONLY these 10 SAFE views: `v_public_tenant`, `v_storefront_branches`, `v_storefront_brands`, `v_storefront_components`, `v_storefront_config`, `v_storefront_media`, `v_storefront_reviews`, `v_content_translations`, `v_crm_event_stats`, `v_tenant_i18n_overrides`.
- SPEC §3 criterion #5 amended in EXECUTION_REPORT.md §4 Deviations: "10 of 17 — 7 carved out per RESOLVED escalation 2026-05-15T1110Z." Foreman picks up in FOREMAN_REVIEW.
- Add to FINDINGS.md: a stub for SECURITY_HOTFIX_3 outlining the 7 deferred views + the 3 base-table RLS expansions needed.
- §1.1 + §1.3 proceed unchanged.

Decided 2026-05-15T11:15Z by Daniel via AskUserQuestion in the same chat.

---

## Resolution log

Once the Architect's decision is pasted in above AND the pipeline successfully resumes, prepend `RESOLVED_` to this file's name.
