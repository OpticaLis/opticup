# SPEC — STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-15
> **Module:** 1.5 — Shared Components
> **Replaces:** SECURITY_HOTFIX_4 (stub retired by the Architect 2026-05-15 — see `architecture-brief/SECURITY_HOTFIX_4_BRIEF.md` header note).
> **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md`
> **Pipeline mode:** Full-Auto (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review) — single Claude Code chat.
> **Estimated effort:** 2–3 working days.

**Heading convention:** plain `## N. Title` (no `§` prefix — would block the Iron-Rule-32 hook on this SPEC's own commit).

---

## 0. Pre-Authoring Reality Check

- Brief `STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md` read in full 2026-05-15.
- Predecessor `SECURITY_HOTFIX_4_BRIEF.md` read (RETIRED — its "extend RLS + GRANT anon on private base tables" plan is replaced by this SPEC's mechanical separation).
- All 8 target view definitions fetched live via `pg_get_viewdef` and inventoried. See §1.5.
- Live state of all 8 candidate base tables (`pg_policies`, `pg_class.relacl`, `has_table_privilege('anon',...)`) probed. See §1.5.
- Storefront repo (`opticup-storefront/src/**`) grep-mapped for every consumer of the 8 target views. See §1.5 item 5.
- Latency baselines captured live on Prizma 2026-05-15. See §1.5 item 6.
- Supabase advisor baseline confirmed: F-CRIT-2 = 8 (exactly the 8 target views). Total advisors = 93. Source: `mcp__supabase__get_advisors security` 2026-05-15.
- **Lessons applied from prior FOREMAN_REVIEWs in this module** (per opticup-strategic SKILL.md "SPEC Authoring Protocol"):
  - HOTFIX_2 P-AUTHOR-1 (canonical JWT validation header) → APPLIED. All trigger functions and any new SECDEF helpers reference `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql`. No hand-rolled JWT-claim checks.
  - HOTFIX_2 P-AUTHOR-2 (runtime semantics rehearsal §1.5.3) → APPLIED in §1.5 — view fan-out probe caught 3 base-table dependencies the Brief did not list (`tenants`, `inventory_images`, `ai_content`) BEFORE SPEC seal.
  - HOTFIX_3 P-AUTHOR-1 (status-column semantics probe) → APPLIED in §1.5 — `ai_content.status` value distribution probed, found `auto`/`edited`/`approved` (NOT `published`); HOTFIX_3 anon RLS would return zero rows, so this SPEC keeps `ai_content` direct subqueries cascading via the existing tenant-isolation policy and DOES NOT rely on the `ai_content_public_read_published` policy.
  - HOTFIX_3 P-AUTHOR-2 (gitignore-aware backup criterion) → APPLIED in §3.
  - HOTFIX_2 P-EXEC-1 (base-table RLS probe before view security_invoker flip) → DOWNSTREAMED to Executor: §5 STT-9 enforces this for each of the 8 view rewrites.
- Pre-existing untracked files surveyed via `git status --porcelain | grep '^??'` — Executor MUST run again at session start and use selective `git add` by filename only.
- **Cross-Reference Check (Rule 21 enforcement at author time, per SKILL §1.5):** every new name in this SPEC grep-checked against `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md`, `docs/FILE_STRUCTURE.md`, all module `db-schema.sql`. Result: 0 collisions. New names: `inventory_public`, `brands_public`, `media_public`, `branches_public`, `storefront_config_public`, `inventory_images_public`, `sync_inventory_public_trg`, `sync_brands_public_trg`, `sync_media_public_trg`, `sync_branches_public_trg`, `sync_storefront_config_public_trg`, `sync_inventory_images_public_trg`, `docs/PUBLIC_DATA_LAYER.md`. None exist in the project today.
- **Runtime Semantics Rehearsal (per SKILL §1.5.3):** completed for every new policy + every view rewrite. Critical findings folded into §1.5 below.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Source | Metric | Value (captured 2026-05-15) |
|---|---|---|---|
| `BASE_FCRIT2` | `mcp__supabase__get_advisors security` | count of `security_definer_view` lints | 8 |
| `BASE_ADVISORS_TOTAL` | same | total lints (security) | 93 |
| `BASE_PRIZMA_PRODUCTS` | `SELECT count(*) FROM v_storefront_products WHERE tenant_id=prizma` | row count | 1,133 |
| `BASE_DEMO_PRODUCTS` | same, demo | row count | 0 |
| `BASE_PRIZMA_BRANDS` | `v_storefront_brands` Prizma | row count | 155 |
| `BASE_DEMO_BRANDS` | same, demo | row count | 156 |
| `BASE_PRIZMA_BRAND_PAGE` | `v_storefront_brand_page` Prizma | row count | 45 |
| `BASE_PRIZMA_CATEGORIES` | `v_storefront_categories` Prizma | row count | 2 |
| `BASE_PRIZMA_BRANCHES` | `v_storefront_branches` Prizma | row count | 1 |
| `BASE_PRIZMA_MEDIA` | `v_storefront_media` Prizma | row count | 276 |
| `BASE_PRIZMA_CONFIG` | `v_storefront_config` Prizma | row count | 1 |
| `BASE_PRIZMA_PUBTENANT` | `v_public_tenant` Prizma | row count | 1 |
| `BASE_LATENCY_PRODUCTS_MS` | `EXPLAIN ANALYZE` Prizma single-shot | total exec time | 480.91 ms |
| `BASE_LATENCY_BRANDS_MS` | clock_timestamp delta Prizma | exec time | 104.41 ms |
| `BASE_LATENCY_BRAND_PAGE_MS` | same | exec time | 22.63 ms |
| `BASE_LATENCY_CATEGORIES_MS` | same | exec time | 212.27 ms |
| `BASE_LATENCY_BRANCHES_MS` | same | exec time | 2.17 ms |
| `BASE_LATENCY_CONFIG_MS` | same | exec time | 0.06 ms |
| `BASE_LATENCY_MEDIA_MS` | same | exec time | 12.24 ms |
| `BASE_LATENCY_PUBTENANT_MS` | same | exec time | 0.06 ms |
| `BASE_INVENTORY_BACKFILL` | `count(*) FROM inventory WHERE <Brief §3.1 filter>` | row count | 8,612 (project-wide) |
| `BASE_BRANDS_BACKFILL` | `count(*) FROM brands WHERE active=true AND COALESCE(exclude_website,false)=false AND is_deleted=false` | row count | 315 |
| `BASE_MEDIA_BACKFILL` | `count(*) FROM media_library WHERE is_deleted=false` | row count | 276 |
| `BASE_BRANCHES_BACKFILL` | `count(*) FROM tenant_branches WHERE status='published' AND is_deleted=false` | row count | 1 |
| `BASE_CONFIG_BACKFILL` | `count(*) FROM storefront_config WHERE enabled=true` | row count | 1 |
| `BASE_INVENTORY_IMAGES_BACKFILL` | `count(*) FROM inventory_images` (no public filter — physical FK to inventory enforces visibility) | row count | 2,434 |

`BASE_LATENCY_*_MAX` columns below cap each post-migration latency at +20% per Brief §13:

| View | Pre (ms) | Post-migration max (ms, +20%) |
|---|---|---|
| products | 480.91 | 577.09 |
| brands | 104.41 | 125.29 |
| brand_page | 22.63 | 27.16 |
| categories | 212.27 | 254.72 |
| branches | 2.17 | 2.60 |
| config | 0.06 | 0.07 |
| media | 12.24 | 14.69 |
| pubtenant | 0.06 | 0.07 |

Pattern A's caching of AI content as columns is EXPECTED (not required) to drop `products` latency from ~481ms to <100ms (eliminates 3 × 1133 ai_content subquery loops). The +20% cap is a safety floor — actual delta should be strongly negative.

---

## 1. Goal

Build a structurally-separate public-data layer of **6 mirror tables** (Pattern A) sitting between Optic Up's private source-of-truth tables and every public consumer (storefront today, future Standard-tier shared site, Supplier Portal, Customer Portal, mobile/API). After this SPEC closes: anon SELECT is mechanically impossible against `inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`, `inventory_images`; the 8 `v_storefront_*` views read exclusively from the public-data layer; Supabase advisor F-CRIT-2 drops 8 → 0; the same layer powers any future tenant tier with zero code changes.

---

## 2. Background & Motivation

SECURITY_HOTFIX_3 (closed 2026-05-15 🟡) deferred 8 storefront views + 5 base-table RLS expansions to a follow-up — originally `SECURITY_HOTFIX_4`. The Architect retired the HOTFIX_4 stub same-day per Daniel's directive (*"בלי פלסטרים — תמיד אפשר לשפר בלי לחזור ולתקן"*) because HOTFIX_4's plan ("extend RLS + GRANT anon on private bases") depended on procedural discipline forever — every future column on `inventory` would need a manual GRANT review.

This SPEC implements the architectural alternative: **mechanical separation via a dedicated public-data layer**. The layer is consumer-agnostic. The same layer that powers Prizma's premium-tier custom-domain storefront today powers every future Standard-tier shared-site tenant, the M11 Supplier Portal's public surface, and any future API/customer/mobile app — without re-architecting and without repeating discipline reviews.

The same SPEC closes 8 advisor F-CRIT-2 findings cleanly (no allowlist) plus the side-finding F-1 from HOTFIX_3 FOREMAN_REVIEW (`v_crm_lead_first_touch` is admin-purpose with `anon_has_select=true` — REVOKE).

Predecessors:
- `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` — closed F-CRIT-1 + 2 of 17 storefront views.
- `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md` — closed 7 of 15 deferred views + 15 of 17 carry RPCs; Daniel Option B for HOTFIX_4 follow-up; explicitly named `STOREFRONT_PUBLIC_DATA_LAYER` as the architectural successor.
- Brief: `architecture-brief/STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md` — sealed by Architect 2026-05-15 with Pattern A lean (non-binding).

---

## 1.5 Pre-flight Findings (Brief §11 deliverable, mandatory)

All 7 Brief §11 pre-flight items executed live against the production Supabase project on 2026-05-15. Findings drove the §6 Pattern decision and the §3.1 expanded scope.

### 1.5.1 — `v_storefront_products` projected columns + base-table fan-out

Source-of-truth reading from the live `pg_get_viewdef` (NOT from `docs/GLOBAL_SCHEMA.sql` which is sometimes lagging):

**Projected columns (24 total):** `i.id, i.tenant_id, i.barcode, b.name AS brand_name, b.id AS brand_id, b.brand_type, i.model, i.color, i.size, i.quantity, i.product_type, NULL::numeric(10,2) AS sell_price, NULL::numeric(5,4) AS sell_discount, i.website_sync, computed display_mode, i.display_mode_override, COALESCE(json_agg of inventory_images.storage_path) AS images, computed search_text, computed resolved_mode, ai_content.content (description, seo_title, seo_description) — 3 subqueries`.

**Notable:** `sell_price` and `sell_discount` are projected as **literal NULLs**, not from `inventory.*`. The view contract says these columns exist (storefront types may consume them) but no value flows. Pattern A treats both as `NULL::numeric` columns on `inventory_public` — preserves contract, no data movement.

**Base-table fan-out for `v_storefront_products`:** `inventory`, `brands`, `inventory_images` (EXISTS check + JSON array subquery), `ai_content` (3 subqueries for description / seo_title / seo_description, language='he', is_deleted=false, ORDER BY version DESC LIMIT 1).

**WHERE filter (anon-visible rows):** `i.is_deleted=false AND b.active=true AND b.exclude_website IS NOT TRUE AND COALESCE(i.website_sync,'full') <> 'none' AND (b.brand_page_visibility IS NULL OR b.brand_page_visibility <> 'hidden') AND (i.display_mode_override IS NULL OR i.display_mode_override <> 'hidden') AND EXISTS (SELECT 1 FROM inventory_images img WHERE img.inventory_id = i.id) AND i.barcode IS NOT NULL`.

### 1.5.2 — Other 7 view projected columns + base-table fan-out

| View | Base-table fan-out | Projected col count |
|---|---|---|
| `v_storefront_branches` | `tenant_branches` only | 32 (all `name_*`/`street_*`/`city_*`/`region_*`/`intro_*` 3-language variants + `phone, whatsapp_e164, email, latitude, longitude, hours, gallery, social URLs, updated_at`) |
| `v_storefront_brand_page` | `brands`, `media_library` (subquery via `brand_gallery` JSONB), **chained EXISTS on `v_storefront_products`** | 14 |
| `v_storefront_brands` | `brands`, `inventory` (EXISTS + count subquery), `inventory_images` (EXISTS subquery), `media_library` (subquery via `brand_gallery`) | 14 (incl. computed `display_mode` + `product_count`) |
| `v_storefront_categories` | **chained on `v_storefront_products`** (GROUP BY `tenant_id, product_type`) | 3 (`tenant_id, name, count`) |
| `v_storefront_config` | `storefront_config` only | 20 |
| `v_storefront_media` | `media_library` only | 10 |
| `v_public_tenant` | `tenants`, `storefront_config` | 13 (incl. extracted `ui_config->>'phone_general'/'phone_catalog'` + full `ui_config` JSONB) |

**Critical Brief omission caught here:** the Brief listed 5 base tables (`inventory, brands, media_library, tenant_branches, storefront_config`). Reality is **8 base tables** — also `tenants`, `inventory_images`, `ai_content`. Treatment per §3.1 below.

### 1.5.3 — Current RLS policies on the 8 base tables

| Table | RLS enabled | Policy count | Key policies |
|---|---|---|---|
| `inventory` | yes | 2 | `tenant_isolation` (JWT-claim, public/ALL), `service_bypass` (service_role/ALL) |
| `brands` | yes | 2 | same canonical pair |
| `media_library` | yes | 2 | same canonical pair |
| `tenant_branches` | yes | 2 | same canonical pair |
| `storefront_config` | yes | 3 | `storefront_config_admin_access` (auth.uid → platform_admins), `storefront_config_tenant_read` (JWT-claim SELECT), `storefront_config_tenant_write` (JWT-claim UPDATE) |
| `tenants` | yes | 3 | `anon_read_tenants` (public/SELECT, `USING(true)`), `service_bypass_tenants`, `tenant_update_own` (JWT-claim UPDATE) |
| `inventory_images` | yes | 3 | `anon_read_inventory_images` (anon/SELECT, `USING(true)`), `service_bypass`, `tenant_isolation` |
| `ai_content` | yes | 2 | `ai_content_public_read_published` (anon/SELECT, `USING(status='published')`), `ai_content_tenant_isolation` (JWT-claim ALL) |

### 1.5.4 — Current `pg_class.relacl` on the 8 base tables (anon SELECT)

| Table | `has_table_privilege('anon', SELECT)` |
|---|---|
| `inventory` | TRUE |
| `brands` | TRUE |
| `media_library` | TRUE |
| `tenant_branches` | TRUE |
| `storefront_config` | TRUE |
| `tenants` | TRUE |
| `inventory_images` | **FALSE** — policy exists but table-level GRANT missing |
| `ai_content` | TRUE |

### 1.5.5 — Storefront page → view dependency map

Live grep of `opticup-storefront/src/**/*.{ts,astro}` for `.from('<view>')`:

| Target view | Storefront call sites |
|---|---|
| `v_storefront_products` | `src/lib/products.ts` (4), `src/lib/shortcodes/products.ts` (1), `src/pages/api/supersale-stock.ts` (2), `src/pages/sitemap-dynamic.xml.ts` (1), `src/components/SearchBar.astro` (1), `src/components/blocks/ProductsBlock.astro` (1) — **10 sites** |
| `v_storefront_brands` | `src/lib/brands.ts` (1), `src/pages/sitemap-dynamic.xml.ts` (1), `src/pages/api/supersale-stock.ts` (1), 3 Block components (`BrandsBlock`, `Tier2GridBlock`, `Tier1SpotlightBlock`) — **6 sites** |
| `v_storefront_brand_page` | `src/lib/brands.ts` (1) — **1 site** |
| `v_storefront_branches` | `src/lib/branches.ts` (2), `src/pages/sitemap-dynamic.xml.ts` (1) — **3 sites** |
| `v_storefront_categories` | `src/lib/products.ts` (1) — **1 site** |
| `v_storefront_config` | `src/lib/tenant.ts` (3), `src/lib/shortcodes/reviews.ts` (1), 3 Block components — **7 sites** |
| `v_storefront_media` | **0 call sites** — view is currently dormant in storefront (kept for contract continuity / image library helper). Still in scope per Brief — must be rewritten to read from `media_public` but the consumer-side smoke can be skipped. |
| `v_public_tenant` | `src/lib/tenant.ts` (3), `src/components/SearchBar.astro` (1) — **4 sites** |

### 1.5.6 — Latency baseline (Prizma, single-shot)

Captured via direct SQL on the live DB (`v_storefront_products` via `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`; remaining via `clock_timestamp()` deltas wrapping `count(*)` calls). Numbers carried into the §0 Baselines table.

`v_storefront_products` plan revealed: ai_content 3 subqueries × 1133 loops = ~272ms of total 480ms. **Primary latency hotspot.** Pattern A's caching opportunity is concrete — see §6.

### 1.5.7 — Pattern A vs B decision

See §6.

### 1.5.8 — Status-column semantics probe (per HOTFIX_3 P-AUTHOR-1, applied here)

`SELECT status, count(*) FROM ai_content GROUP BY status` →

| status | count |
|---|---|
| `approved` | 1 |
| `auto` | 5,620 |
| `edited` | 7,226 |

**Zero rows have `status='published'`.** HOTFIX_3's `ai_content_public_read_published` policy (`USING(status='published')`) returns ZERO rows for anon today. The reason the storefront's product cards still show AI descriptions is that all 8 target views run in default `security_definer` mode (reloptions=null verified) and bypass RLS. **After this SPEC flips them to `security_invoker=on`, the cascade would silently lose all AI content unless mitigated.** Mitigation: Pattern A caches `ai_description`, `ai_seo_title`, `ai_seo_description` as columns on `inventory_public` — populated by trigger sync from `ai_content`. The HOTFIX_3 anon policy is left as-is (it's harmless but unused for storefront). NO behavioral change to `ai_content`.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | 9–13 commits in chain (per §10 plan; Executor may compress within reason) | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | Backup folder | populated for the 6 manually-named files (CLAUDE.md, M1.5 SESSION_CONTEXT/MODULE_SPEC/db-schema, GLOBAL_SCHEMA.sql, GLOBAL_MAP.md), folder present on disk | `ls "modules/Module 1.5 - Shared Components/backups/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER/" \| wc -l` → ≥6. **Note (gitignore-aware, per HOTFIX_3 P-AUTHOR-2):** `**/backups/` is gitignored per CLAUDE.md §9 #9 — Reviewer verifies via `ls` exit 0, NOT via `git log`. Do NOT include backups in any commit. |
| 4 | 6 public-projection tables created | `inventory_public`, `brands_public`, `media_public`, `branches_public`, `storefront_config_public`, `inventory_images_public` exist in `public` schema | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN (6 names)` → 6 |
| 5 | Tenant-scoped + RLS on each public-projection | Each table has `tenant_id UUID NOT NULL` + 3 RLS policies (`service_bypass`, `tenant_isolation`, `<table>_anon_public_read`) | `SELECT tablename, count(*) FROM pg_policies WHERE schemaname='public' AND tablename ~ '_public$' GROUP BY tablename` → each = 3 |
| 6 | Anon SELECT GRANT on each public-projection | `has_table_privilege('anon', '<table>', 'SELECT')` = TRUE for all 6 | one-shot SQL |
| 7 | 6 trigger functions created | `sync_inventory_public_trg`, `sync_brands_public_trg`, `sync_media_public_trg`, `sync_branches_public_trg`, `sync_storefront_config_public_trg`, `sync_inventory_images_public_trg` exist + are SECURITY DEFINER + `SET search_path=public,pg_temp` | `SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname LIKE 'sync_%_public_trg'` → 6 rows, all with `prosecdef=true` and `proconfig` containing `search_path=public,pg_temp` |
| 8 | 6 triggers attached to private base tables | INSERT/UPDATE/DELETE triggers on `inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`, `inventory_images` | `SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'tr_sync_%_public'` → 6 rows |
| 9 | Backfill row counts match private filter exactly | per Brief §5.3: `SELECT count(*) FROM <table>_public` = `SELECT count(*) FROM <private_base> WHERE <public_filter>` for all 6 (project-wide). | per-table SQL pair. Targets: `inventory_public` ≈ `BASE_INVENTORY_BACKFILL` (8612), `brands_public` ≈ `BASE_BRANDS_BACKFILL` (315), `media_public` ≈ `BASE_MEDIA_BACKFILL` (276), `branches_public` ≈ `BASE_BRANCHES_BACKFILL` (1), `storefront_config_public` ≈ `BASE_CONFIG_BACKFILL` (1), `inventory_images_public` ≈ `BASE_INVENTORY_IMAGES_BACKFILL` (2434). **EXACT match required — drift = abort, see §5 STT-2.** |
| 10 | 8 `v_storefront_*` views rewritten to source from public-projection layer | `pg_views.definition` for each of the 8 views does NOT contain any of `FROM inventory `, `FROM brands `, `FROM media_library `, `FROM tenant_branches `, `FROM storefront_config `, `JOIN inventory `, `JOIN brands ` etc. (private base names) — only public-projection table names | regex scan of `pg_views.definition` per view |
| 11 | All 8 views set `security_invoker=on` | `pg_class.reloptions @> ARRAY['security_invoker=on']` for all 8 | one-shot SQL |
| 12 | Anon SELECT preserved on the 8 views | `has_table_privilege('anon', '<view>', 'SELECT')` = TRUE for all 8 | one-shot SQL |
| 13 | Per-view anon row counts match pre-migration baselines (Prizma) | `v_storefront_products = BASE_PRIZMA_PRODUCTS (1133)`, `_brands = 155`, `_brand_page = 45`, `_categories = 2`, `_branches = 1`, `_config = 1`, `_media = 276`, `_pubtenant = 1`. **Per Brief §13 STOP: any nonzero row-count delta = abort.** | per-view SQL with anon role |
| 14 | REVOKE anon SELECT on 6 private base tables | `has_table_privilege('anon', '<table>', 'SELECT')` = FALSE for `inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`, `inventory_images` | one-shot SQL. **`tenants` is NOT in this list** — it remains anon-readable because `v_public_tenant` directly projects 6 tenant fields and the existing `anon_read_tenants` policy with `USING(true)` is intentional (tenants stores no sensitive PII the public can't already see; the storefront URL itself reveals tenant existence). Locking tenants behind a `tenants_public` projection = future SPEC if needed. **`ai_content` is NOT in this list** — it stays anon-readable via the existing `ai_content_public_read_published` policy (currently 0 rows match — see §1.5.8); rewritten `v_storefront_products` does NOT depend on direct ai_content access (it reads cached AI columns from `inventory_public`). |
| 15 | REVOKE anon SELECT on `v_crm_lead_first_touch` | `has_table_privilege('anon', 'v_crm_lead_first_touch', 'SELECT')` = FALSE | one-shot SQL |
| 16 | F-CRIT-2 advisor: 0 | `mcp__supabase__get_advisors security` → count of `security_definer_view` lints = 0 (down from `BASE_FCRIT2`=8) | MCP call |
| 17 | No NEW advisor finding types | `get_advisors security` → no `name` value present that wasn't in baseline (no new lint-type categories) | MCP call diff |
| 18 | Latency on each of 8 views ≤ +20% of baseline (per Brief §13 STT) | each view's post-migration single-shot timing ≤ `BASE_LATENCY_<view>_MAX` (see §0 table) | timing block per view, both tenants |
| 19 | All 7 storefront pages return HTTP 200 + non-empty body on Prizma + demo (per Brief §8 #4) | curl -sS -o /dev/null -w "%{http_code}\n" → `200` + content-length > 0 for: `/`, `/brands/`, `/brands/<slug>/`, `/products/`, `/sitemap-dynamic.xml`, `/branches/`, `/about/`. Demo equivalents on `https://opticup-storefront-demo.vercel.app/`. | curl loop |
| 20 | Smoke 7/7 PASS pre + post on demo (CLAUDE.md baseline test gate) | `npm run test:smoke` on demo tenant → 7/7 PASS both before any DB change AND after final commit | `npm run test:smoke` |
| 21 | Trigger sync E2E verified per private base table | INSERT a marker row on demo (or UPDATE an existing row's `model`/`is_deleted`/`status`) → mirror table reflects within 1s; UPDATE → mirror updated; DELETE/UNDELETE → mirror row appears/disappears. Cleanup: revert the marker. **Pattern A only.** | `tests/smoke/STOREFRONT_PUBLIC_DATA_LAYER_trigger_e2e.sql` (Executor authors) — 6 tables × 3 ops each = 18 cases minimum |
| 22 | Zero tenant data row write on either tenant (Brief §13 STT-7) | `git diff` on the 6 private base tables = no row mutations EXCEPT the §21 marker rows that were inserted-and-reverted. Initial backfill INSERTs into the 6 NEW public-projection tables = within scope (declared in §3 / §4 #9). | per-table count comparison pre/post for the 6 PRIVATE bases (not the new public tables) |
| 23 | `v_crm_lead_first_touch` REVOKE complete (HOTFIX_3 F-1 follow-up) | `has_table_privilege('anon', 'v_crm_lead_first_touch', 'SELECT')` = FALSE — see #15. Bonus: confirm no storefront/any-anon-context call site exists via cross-repo grep | grep both repos for `v_crm_lead_first_touch` |
| 24 | `docs/PUBLIC_DATA_LAYER.md` exists with required sections | sections: "What this layer is", "What's in it (6 entities)", "How to add a new public-projection (template)", "Consumer contract (Storefront / Supplier Portal / API)", "Sync mechanism (Pattern A trigger details)". Must be ≤ 200 lines (governance docs limit per project pattern). | `wc -l` + `grep -c '^## '` |
| 25 | `docs/GLOBAL_MAP.md` Views section updated | 8 view entries reflect new `FROM` source + 6 new public-projection tables registered in the schema-ownership table | `git diff docs/GLOBAL_MAP.md` |
| 26 | `docs/GLOBAL_SCHEMA.sql` updated with the 6 new public-projection tables + 6 trigger functions + 6 triggers + the 8 rewritten view definitions | append-only per Integration Ceremony rules | `git diff docs/GLOBAL_SCHEMA.sql` |
| 27 | `MASTER_ROADMAP.md` §3 Current State entry added | one-line entry recording the public-data-layer foundation is in place | `git diff MASTER_ROADMAP.md` |
| 28 | Module 1.5 SESSION_CONTEXT.md + CHANGELOG.md updated | new section dated 2026-05-15 with SPEC name + commit range | `git diff` per file |
| 29 | EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md present in this SPEC folder | 5 files written across the 4 agents | `ls modules/Module\ 1.5\ -\ Shared\ Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/` → ≥6 (incl. SPEC.md + ACTIVATION_PROMPT.md) |
| 30 | Iron Rules 14, 15, 18, 31, 32 gates exit 0 | `npm run verify:integrity` exit 0 or 2 (no null-byte ERROR); `scripts/checks/destructive-ops-declared.mjs` exit 0 | `npm run verify:integrity; echo $?` + pre-commit hook on each commit |
| 31 | Repo clean at close | `git status --porcelain` returns empty | `git status --porcelain` |
| 32 | `develop` pushed to `origin/develop` after final commit | HEAD == origin/develop | `git rev-parse HEAD; git rev-parse origin/develop` — equal |

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking

- Read any file in either repo (`opticup`, `opticup-storefront`).
- Run read-only SQL freely (Level 1 autonomy).
- Apply DDL migrations via `mcp__claude_ai_Supabase__apply_migration` for the 6 CREATE TABLE + 6 CREATE FUNCTION + 6 CREATE TRIGGER + 18 CREATE POLICY + 6 GRANT + 8 CREATE OR REPLACE VIEW + 6 REVOKE + 1 REVOKE-on-`v_crm_lead_first_touch` operations declared in §3 Destructive Operations. **All declared. No improvisation.**
- Backfill INSERTs into the 6 new public-projection tables (declared in §3 Destructive Operations #9).
- Create files, commit, push to `develop` per CLAUDE.md §9.
- Run `npm run verify:integrity`, `npm run test:smoke`, schema-diff scripts.
- **Apply executor-improvement proposals from recent FOREMAN_REVIEWs** if directly relevant (e.g., HOTFIX_2 P-EXEC-1 base-table RLS probe is mandated in §5 STT-9).
- Run the migration DEMO-FIRST then PRIZMA. Do not invert this order.
- Within DEMO and within PRIZMA: 6 tables in the order listed in §4 below (`tenant_branches` → `inventory` LAST). Single-tenant migrations may interleave per-table phases (CREATE → backfill → triggers → REVOKE), but EACH table must complete + verify before the next starts.

### What REQUIRES stopping and reporting

- ANY `git status --porcelain` row that is not a SPEC-authored change (untracked files from prior sessions: STOP, ask user, do NOT discard).
- ANY single per-view row-count delta (Prizma OR demo) NON-ZERO post-migration vs `BASE_*` baselines (see §3 #13).
- ANY per-view latency >+20% vs `BASE_LATENCY_*_MAX` (§3 #18).
- ANY storefront page non-200 on Prizma OR demo (§3 #19).
- ANY trigger sync miss / double-apply across the 18 §3 #21 E2E cases.
- ANY tenant data row write outside the declared backfill INSERTs into the 6 new public-projection tables (§3 #22).
- ANY new advisor finding-name (§3 #17) — including new `security_definer_view` lints if a temporary helper view leaks.
- ANY Iron Rule gate non-zero (§3 #30).
- Encountering a destructive op not enumerated in §3 Destructive Operations.
- Brief column-projection list disagreement with what `v_storefront_products` actually needs (§5 STT below).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals + Brief §13)

- **STT-1 — Storefront page returns non-200** on Prizma OR demo after any view rewrite. Per Brief §13.
- **STT-2 — Backfill row count mismatch.** `count(*) FROM <table>_public` ≠ `count(*) FROM <private_base> WHERE <public_filter>` for any of the 6 tables. Per Brief §5.3 + §13. Drift = abort that table's migration, rollback via pre-tag.
- **STT-3 — Trigger sync miss/double** in any §3 #21 E2E case. Per Brief §13.
- **STT-4 — Latency exceeds +20%** on any of the 8 views. Per Brief §13.
- **STT-5 — Tenant data row write detected** on a PRIVATE base table during execution (writes to NEW public-projection tables are within scope per §3 Destructive Operations #9). Per Brief §13.
- **STT-6 — New advisor finding-name** beyond the 8 F-CRIT-2 closures. Per Brief §13.
- **STT-7 — Inventory column-projection disagreement.** If `v_storefront_products`'s actual SELECT list (live `pg_get_viewdef`) on the day of execution differs from the §1.5.1 inventory above (i.e. someone changed the view between SPEC seal and execution), STOP — re-evaluate `inventory_public` column shape. Per Brief §13.
- **STT-8 — Iron Rule gate non-zero.** Rules 14, 15, 18, 31, 32 — any non-zero exit during pre-commit blocks the commit. Investigate at root, do NOT bypass.
- **STT-9 — Base-table RLS probe failure (HOTFIX_2 P-EXEC-1 mandated).** Before flipping `security_invoker=on` on any of the 8 views, the Executor MUST probe — for every base table the rewritten view reads from — `has_table_privilege('anon', '<base_or_public_table>', 'SELECT')` AND verify an anon-friendly RLS USING clause exists. If anon would lose access via the cascade, STOP. Document the probe results in EXECUTION_REPORT §3.
- **STT-10 — `ai_content` cascade verification.** After v_storefront_products is rewritten + flipped, anon SELECT on it MUST return at least one product row WITH non-NULL `ai_description` for the cached path. If `ai_description` becomes NULL across all 1133 Prizma products, the cache from `ai_content` is broken — STOP, rollback, re-evaluate.
- **STT-11 — Cross-tenant leak probe.** After ALL 6 tables done + all 8 views flipped, on demo: `SET LOCAL ROLE anon; SET LOCAL request.jwt.claims TO '{"tenant_id":"<demo-uuid>"}'`; `SELECT count(*) FROM v_storefront_products WHERE tenant_id <> '<demo-uuid>'` MUST return 0. (Today's demo has 0 storefront products so this checks the negation: Prizma's 1133 must NOT leak into demo's anon view.) Same probe per public-projection table.

On STOP: write escalation file `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_STOREFRONT_PUBLIC_DATA_LAYER_<short_slug>.md` (per Brief §13 + CLAUDE.md §9), emit ONE Hebrew line to Daniel via the chat, halt the pipeline. Roll back the most-recent destructive op via the pre-tag. Do NOT continue without explicit Daniel ack.

---

## 6. Pattern A vs B — Decision

**Decision: Pattern A (mirror tables with trigger sync).**

### Reasoning (specific to Optic Up's scale + constraints)

| Dimension | Pattern A | Pattern B | Winner |
|---|---|---|---|
| **Performance** | Sub-millisecond anon SELECT on simple mirror tables. AI-content columns CACHED on `inventory_public` eliminate the 272ms / 480ms hotspot in `v_storefront_products`. Expected new latency: <100ms (vs `BASE_LATENCY_PRODUCTS_MS`=480.91ms). | Anon SELECT hits the SECDEF view → executes the original SELECT against private bases → same ~480ms cost. No latency improvement. | **A** — measurable +5× win. |
| **Mechanical separation strength** | Anon never reads the private tables (REVOKE'd at the `pg_class.relacl` level). Hardest possible separation. | `storefront_reader_role` retains SELECT on the private tables. Procedural separation, not mechanical. | **A** — Daniel's "no plasters" directive applies directly. |
| **Supabase advisor cleanliness** | Closes 8 F-CRIT-2 lints. Zero new advisor noise. | Closes the 8 source lints but creates 6 NEW `security_definer_view` lints — must be allowlisted. | **A** — F-CRIT-2 = 0 vs F-CRIT-2 = 6 (allowlisted). |
| **Storage cost** | ~3MB for the 6 mirror tables + cached AI columns (project-wide). Trivial on Supabase Pro. | 0MB. | **B** by ~3MB — not material. |
| **Consistency model** | Eventual (sub-second under triggers). Risk: trigger miss/double, source-of-truth-in-transit. | Always-consistent (live read-through). | **B** — but mitigated in A by §3 #21 E2E (18 cases) + STT-3. |
| **Architectural consistency with Optic Up** | Matches the project's pattern (physical tables + canonical 2-policy RLS — Iron Rule 15). | Introduces a new role (`storefront_reader_role`) — a pattern not used elsewhere in the project. | **A** — reduces conceptual surface. |
| **SaaS-litmus (Iron Rule 20)** | Second tenant onboarding triggers backfill via the same INSERT/UPDATE triggers — zero code changes, fits the rule perfectly. | Same — works either way. | **Tie**. |
| **Future evolution (Pattern P17 foundation-first)** | A 7th, 8th, etc. public-projection table follows the same template — adding `customer_inquiries_public` later is a 4-step recipe. | Same — but with the SECDEF caveat each time. | **A** — recipe is cleaner. |

**Aggregate:** A wins 7 dimensions, B wins 1 (storage), tie on 1. The Architect's "lean toward A" is confirmed by every load-bearing dimension this Foreman could measure.

### Pattern A — implementation contract

For each of the 6 entities:

1. **Mirror table** — `<entity>_public` with:
   - `tenant_id UUID NOT NULL REFERENCES tenants(id)` (Iron Rule 14).
   - Allow-listed columns from §1.5.1 / §1.5.2 (no `cost_price`, `last_purchase_at`, `supplier_id`, `internal_notes`, `created_by`, `updated_by`, no other sensitive field).
   - `inventory_public` ADDITIONALLY caches `ai_description`, `ai_seo_title`, `ai_seo_description` (3 TEXT columns) populated at backfill + kept fresh by trigger sync from `ai_content`.
   - `inventory_public` ADDITIONALLY caches an `image_paths TEXT[]` column populated from `inventory_images` (sort_order, created_at) — eliminates the per-row JSON aggregation subquery in v_storefront_products.
   - PK = source PK (same UUID as private), so triggers can use `ON CONFLICT (id) DO UPDATE`.
   - One column-set UNIQUE constraint when needed (none required for the 6 entities — PK suffices).

2. **3 RLS policies (per Iron Rule 15 canonical pattern):**
   - `service_bypass` for `service_role` (`USING(true)`).
   - `tenant_isolation` for `public` with the JWT-claim USING clause:
     ```
     tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid
     ```
   - `<table>_anon_public_read` for `anon` with the JWT-claim USING clause (same shape as tenant_isolation but FOR SELECT TO anon — anon JWTs in production carry `tenant_id` for storefront calls).

3. **GRANT SELECT TO anon ON `<entity>_public`** — table-level GRANT (the policy alone is not enough; both layers required).

4. **Trigger function `sync_<entity>_public_trg`** — `SECURITY DEFINER`, `SET search_path = public, pg_temp`, fires AFTER INSERT/UPDATE/DELETE on the private base. The function:
   - Computes the public-filter visibility for NEW.
   - On INSERT or UPDATE-to-visible: `INSERT ... ON CONFLICT (id) DO UPDATE SET ...`.
   - On UPDATE-to-invisible (e.g., `is_deleted=true` flips, `website_sync='none'`, `status='draft'`): `DELETE FROM <entity>_public WHERE id = NEW.id`.
   - On DELETE: `DELETE FROM <entity>_public WHERE id = OLD.id`.
   - Failure path: `EXCEPTION WHEN OTHERS` → write to `platform_audit_log` with the error, then `RETURN NEW/OLD` (do NOT raise — would block the source ERP write per Brief §5.4).
   - For `inventory_public` specifically: also reads from `ai_content` + `inventory_images` for the cached columns (single SELECTs, not aggregates).
   - Trigger functions cite `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql` PATTERN B (no JWT validation needed because triggers run as table owner / SECDEF — not user-context).

5. **2 satellite triggers on `ai_content` and `inventory_images`** that propagate updates into `inventory_public`'s cached columns. Without these, an AI-content edit in Studio would not refresh the storefront cache.
   - `tr_sync_ai_content_to_inventory_public` — AFTER INSERT/UPDATE/DELETE ON `ai_content` WHEN `entity_type='product'` → re-reads the latest version-DESC LIMIT 1 for that entity_id and overwrites `inventory_public`'s 3 cached AI columns.
   - `tr_sync_inventory_images_to_inventory_public` — AFTER INSERT/UPDATE/DELETE ON `inventory_images` → recomputes `image_paths` for the affected `inventory_id`.

### Migration order (Brief §7, mandatory)

1. **`tenant_branches`** first (smallest blast radius, 1 row, simplest shape).
2. **`storefront_config`** (config-only, low traffic, 1 row).
3. **`media_library`** (mostly-static asset metadata, 276 rows).
4. **`brands`** (medium complexity, referenced by inventory, 315 rows).
5. **`inventory_images`** (additive — must precede inventory because inventory_public's `image_paths` cache reads it).
6. **`inventory`** LAST (highest risk, largest table — 8612 rows project-wide, most sensitive columns to NOT expose; AI cache + image cache must be wired before backfill or all 1133 Prizma products go up with NULL caches).

**Per-table flow** (must complete before next table starts):

- a. Pre-tag the repo: `git tag pre-public-data-layer-<table>-{demo|prizma}`.
- b. Pre-tag the DB: `pg_dump --schema-only --table=<table> --table=<table>_public_target` snapshot stored in `modules/Module 1.5 - Shared Components/backups/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER/db-snapshots/<table>.sql`.
- c. Apply migration (CREATE TABLE + RLS + GRANT + trigger fn + trigger).
- d. Backfill: `INSERT INTO <table>_public SELECT <projected_cols> FROM <private_base> WHERE <public_filter>`.
- e. Verify §3 #9 row count match — drift = abort, rollback via pre-tag.
- f. E2E trigger test (3 cases per table: INSERT marker, UPDATE marker, DELETE marker — per §3 #21).
- g. Move to next table.

**View rewrites + REVOKEs (only after all 6 tables done + verified):**

- h. Rewrite each of the 8 views (`CREATE OR REPLACE VIEW ... security_invoker=on AS SELECT ... FROM <public_table>`).
- i. Per-view anon row-count probe matches §3 #13 baseline.
- j. Storefront page smoke per §3 #19.
- k. Once all 8 views green: REVOKE anon SELECT from the 6 private base tables (§3 #14).
- l. REVOKE anon SELECT on `v_crm_lead_first_touch` (§3 #15) — single line.

**Demo-first, then Prizma:** the entire flow above runs on demo first to completion + verification, then on Prizma. Per the user's directive: NO destructive op on Prizma before demo verifies clean.

### Per-table rollback strategy

Same pattern per table:
- Drop the trigger.
- Drop the trigger function.
- Drop the public-projection table (CASCADE removes its policies + grant).
- Re-tag — git is the source-of-truth for the repo state.
- For view rewrites: `git checkout pre-public-data-layer-views-{tenant} -- <none, views are DB-only>` is N/A — instead, replay the previous view definition (captured in `db-snapshots/views_pre.sql`).

---

## Destructive Operations

(Iron Rule 32 declaration — copied from Brief §9, expanded for the 6th entity.)

> **Note:** This heading is intentionally unnumbered to match Iron Rule 32 hook canonical form (`## Destructive Operations` or `## 4. Destructive Operations` exactly, regex `/^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m`). The SPEC was originally authored with `## 3. Destructive Operations (Iron Rule 32 declaration — ...)` but that (a) collided with `## 3. Success Criteria` AND (b) failed the hook regex because the trailing parenthetical violated `\s*$`. Logged as a FINDING for the next Foreman pass to renumber the entire SPEC monotonically and to amend the hook to ignore decorative parentheticals after the canonical phrase.

Per Iron Rule 32 — every destructive operation declared upfront:

1. **CREATE TABLE × 6** — `inventory_public`, `brands_public`, `media_public`, `branches_public`, `storefront_config_public`, `inventory_images_public`. Additive.
2. **CREATE TRIGGER × 6** on the 6 private base tables (`inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`, `inventory_images`). Additive.
3. **CREATE TRIGGER × 2 satellite** — on `ai_content` and `inventory_images` to refresh `inventory_public`'s cached columns. Additive.
4. **CREATE FUNCTION × 6** trigger functions + 2 satellite trigger functions. SECURITY DEFINER + `SET search_path = public, pg_temp`. Additive.
5. **CREATE POLICY × 18** — 3 per public-projection (service_bypass + tenant_isolation + anon_public_read). Additive.
6. **GRANT SELECT TO anon × 6** on the public-projection layer. Additive.
7. **CREATE OR REPLACE VIEW × 8** for the rewritten `v_storefront_*` views — additive (replaces the definition, keeps the name; no DROP).
8. **REVOKE SELECT FROM anon × 6** on private base tables (`inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`, `inventory_images`) — DECLARED destructive. Reverses via re-GRANT, but is a behavior change.
9. **REVOKE SELECT FROM anon × 1** on `v_crm_lead_first_touch` — DECLARED destructive. Reverses via re-GRANT.
10. **Initial backfill INSERT × 6** into the new public-projection tables. Tens of thousands of rows project-wide; not a mutation on existing tables. The 6 INSERTs occur within a single per-table transaction each.
11. **Trigger marker rows** — §3 #21 E2E test creates 1 marker row per table per op (18 INSERTs total) on demo, then DELETEs the same row. Each marker is fully reverted within the same E2E test before moving to the next table. Net data delta = 0.
12. **`git tag pre-public-data-layer-*` × ~14** (6 per-table for demo + 6 for Prizma + 2 for view-rewrite phases). Additive — git tags are not destructive.

**No DROP TABLE, no DROP COLUMN, no DROP VIEW (CREATE OR REPLACE only), no DELETE on tenant data (markers are scoped to test rows the SPEC itself created), no main-branch operations.**

---

## 7. Out of Scope (explicit)

- **No changes to storefront frontend code** (per Brief §4). The 8 view contracts (column names + return semantics + row counts) are inviolable.
- **No commerce/checkout work** — pure data-exposure layer.
- **No new tenant onboarding** — Prizma + demo only.
- **No CRM/M4/M5 work** — `v_crm_lead_first_touch` REVOKE is a one-liner cleanup.
- **No `cost_price` or financial column changes** — those stay private forever.
- **No `tenants_public` projection** — `tenants` stays anon-readable via the existing `anon_read_tenants` policy. If a future tier needs a tighter contract on `tenants`, a follow-up SPEC owns it.
- **No `ai_content_public` projection** — `inventory_public` caches the 3 AI columns directly. AI content for `entity_type='brand'` (if any) is similarly out of scope; current views don't read it.
- **No materialized-view caching** (per Brief §10 deferred list).
- **No multi-region / read-replica work** (per Brief §10).
- **No public-data-layer audit logging** (per Brief §10).

---

## 8. Expected Final State

### New files (in `opticup` repo)

- `docs/PUBLIC_DATA_LAYER.md` — canonical reference (≤200 lines).
- `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/SPEC.md` (this file).
- `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/ACTIVATION_PROMPT.md` (Foreman).
- `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/EXECUTION_REPORT.md` (Executor).
- `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/FINDINGS.md` (Executor).
- `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/REVIEW.md` (Reviewer).
- `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/TEST_REPORT.md` (Localhost-Tester).
- `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/FOREMAN_REVIEW.md` (Foreman, post-execution).
- `tests/smoke/STOREFRONT_PUBLIC_DATA_LAYER_trigger_e2e.sql` (Executor authors per §3 #21).
- `modules/Module 1.5 - Shared Components/backups/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER/` containing the 6 backup files listed in Brief §12 + per-table `db-snapshots/<table>.sql` snapshots — gitignored, on disk only.

### Modified files (in `opticup` repo)

- `docs/GLOBAL_SCHEMA.sql` — append the 6 new tables + 6 trigger fns + 6 + 2 triggers + 18 policies + 6 grants + 8 view rewrites (replace definitions in place).
- `docs/GLOBAL_MAP.md` — Views section: 8 view entries reflect new `FROM` source; new section "Public Data Layer" registers the 6 entities.
- `MASTER_ROADMAP.md` — §3 Current State entry for 2026-05-15.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — replace top "Current Status" with the SPEC's outcome line.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — append 2026-05-15 section with commit range.
- `OPEN_TASKS.md` — close STOREFRONT_PUBLIC_DATA_LAYER, retire HOTFIX_4 stub officially.
- `modules/Module 1.5 - Shared Components/architecture-brief/SECURITY_HOTFIX_4_BRIEF.md` — append a closing line: "✅ SUPERSEDED 2026-05-15 by STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15." (it's already RETIRED in header — this just confirms closure).

### Deleted files

- None.

### DB state

- 6 new public-projection tables present + tenant-scoped + RLS-protected + anon-grantable.
- 6 + 2 triggers active.
- 8 v_storefront_* views rewritten + `security_invoker=on`.
- 6 private base tables: `anon` SELECT REVOKED.
- `v_crm_lead_first_touch`: `anon` SELECT REVOKED.
- F-CRIT-2 advisor count = 0.

### Docs updated (mandatory at close)

- `MASTER_ROADMAP.md` §3 — yes (foundation milestone).
- `docs/GLOBAL_MAP.md` — yes (8 view definitions + 6 new tables registered).
- `docs/GLOBAL_SCHEMA.sql` — yes (6 new tables + 8 modified views + 6+2 triggers + 18 policies).
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — yes.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — yes.
- `docs/PUBLIC_DATA_LAYER.md` — NEW (canonical reference per Brief §3.5).

---

## 9. Commit Plan

Pipeline-mode (Full-Auto), single chat. The Executor may compress consecutive demo-side per-table commits if all gates pass; Prizma-side commits are individual.

- Commit 1: `chore(spec): seal STOREFRONT_PUBLIC_DATA_LAYER SPEC + ACTIVATION_PROMPT` — this SPEC.md + ACTIVATION_PROMPT.md + retire HOTFIX_4 stub line.
- Commit 2: `feat(public-data-layer): demo — branches_public + storefront_config_public + media_public` — 3 smallest entities demo migration + backfill + triggers + E2E pass.
- Commit 3: `feat(public-data-layer): demo — brands_public + inventory_images_public + inventory_public` — 3 larger entities demo migration. Triggers wired; backfill verified; E2E pass.
- Commit 4: `feat(public-data-layer): demo — rewrite 8 v_storefront_* views to source from layer + flip security_invoker=on` — view rewrites + per-view probe; storefront-demo pages smoke 200/200.
- Commit 5: `feat(public-data-layer): demo — REVOKE anon from 6 private base tables + v_crm_lead_first_touch` — final demo destructive ops.
- Commit 6: `feat(public-data-layer): prizma — branches_public + storefront_config_public + media_public` — Prizma 3 smallest.
- Commit 7: `feat(public-data-layer): prizma — brands_public + inventory_images_public + inventory_public` — Prizma 3 larger.
- Commit 8: `feat(public-data-layer): prizma — rewrite 8 v_storefront_* views + flip security_invoker=on` — Prizma view rewrites + smoke.
- Commit 9: `feat(public-data-layer): prizma — REVOKE anon from 6 private base tables + v_crm_lead_first_touch` — final Prizma destructive ops.
- Commit 10: `docs(public-data-layer): add docs/PUBLIC_DATA_LAYER.md + update GLOBAL_MAP + GLOBAL_SCHEMA + MASTER_ROADMAP + CHANGELOG + SESSION_CONTEXT`.
- Commit 11: `chore(spec): close STOREFRONT_PUBLIC_DATA_LAYER — EXECUTION_REPORT + FINDINGS + REVIEW + TEST_REPORT + FOREMAN_REVIEW`.

**Compaction permission:** Commits 2+3 (demo per-table) MAY be merged if all gates pass on first try. Commits 4+5 (demo views+REVOKE) MAY be merged. Commits 6+7+8+9 (Prizma) MUST stay distinct — Prizma changes need per-step git history for forensics. Net: 8–11 commits in chain. Reviewer + Localhost-Tester commits add 2 more.

Each commit body cites:
- The Iron Rule 32 declared destructive ops it executes (line numbers in §3 above).
- The §3 success criteria it advances.
- Backup folder path + git pre-tag name.

---

## 10. Dependencies / Preconditions

- Previous SPECs `SECURITY_HOTFIX_2_2026_05_15` 🟡 + `SECURITY_HOTFIX_3_2026_05_15` 🟡 — both CLOSED (verified via FOREMAN_REVIEW.md presence in their folders).
- Supabase MCP server connected with `apply_migration` + `execute_sql` + `get_advisors` access.
- Storefront repo `opticup-storefront/` accessible at `C:/Users/User/opticup-storefront/` (verified via Bash 2026-05-15).
- Demo storefront live at `https://opticup-storefront-demo.vercel.app/` (per `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT` 2026-05-11 closure).
- Prizma storefront live at `https://prizma-optic.co.il/` (DNS switched 2026-04-18).
- `npm run test:smoke` passes 7/7 on demo at session start (baseline check, per CLAUDE.md §11).
- `npm run verify:integrity` exit 0 or 2 at session start (Iron Rule 31 gate).
- 4-agent skill chain available: opticup-strategic + opticup-executor + opticup-reviewer + opticup-localhost-tester (per CLAUDE.md §11 + `docs/AGENT_CHAIN_PROTOCOL.md`).

---

## 11. Lessons Already Incorporated

| FROM | Lesson | Applied here? |
|---|---|---|
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-1 | Canonical JWT validation header — never inline a hand-rolled version | YES — §6 trigger functions cite `JWT_VALIDATION_HEADER.sql`; no hand-rolled JWT logic |
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-2 | Runtime semantics rehearsal at SPEC-author time | YES — §0 + §1.5 are the rehearsal output; caught the 3-extra-base-tables Brief omission + the ai_content.status semantics trap before SPEC seal |
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-EXEC-1 | Base-table RLS probe before view security_invoker flip | YES — downstreamed to Executor as §5 STT-9 |
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` P-EXEC-2 | Tooling Pre-Flight + tmp-script template | NOT APPLICABLE — this SPEC uses MCP `apply_migration` directly, not Node scripts |
| `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-1 | Status-column semantics probe | YES — §1.5.8 ran the probe on `ai_content.status`; caught the `published`-vs-translation-state trap; redesigned around it (cache columns, not RLS-cascade) |
| `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md` P-AUTHOR-2 | gitignore-aware backup criterion | YES — §3 #3 explicitly notes the `**/backups/` gitignore + `ls`-based verification |
| `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md` P-EXEC-1 | Block A demo-tests reference snippet | NOT APPLICABLE — this SPEC's SECDEF functions are TRIGGERS (no `p_tenant_id` user-input arg), so the JWT validation pattern doesn't apply. Trigger functions are SECDEF-by-table-owner with NEW.tenant_id passthrough |
| `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md` P-EXEC-2 | SQL-comment word-avoidance | YES — §3 Destructive Operations + this SPEC's commit messages use destructive keywords inside the heading + bulleted list (declared); SQL migration files written by Executor MUST avoid `DROP`/`DELETE`/`REVOKE`/`TRUNCATE` inside `--` comments per the executor SKILL |
| `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author #2 | Baselines-as-symbols | YES — §0 Baselines table; §3 success criteria cite `BASE_*` symbols |
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author #1 | Heading convention `## N. Title`, not `§N.` | YES — every heading uses plain `## N.` form |
| `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author #1 | Color-form completeness check | NOT APPLICABLE — no visual re-skin |
| `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` (general) | Iron Rule 21 No-Duplicates divergence pattern (`next_purchase_order_number` vs legacy `next_po_number`) | NOT APPLICABLE — no name collision in this SPEC; the 6 new names are project-novel per §0 Cross-Reference Check |

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md written in this SPEC folder.
- [ ] Module 1.5 SESSION_CONTEXT + CHANGELOG updated.
- [ ] `MASTER_ROADMAP.md` + `docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql` updated.
- [ ] `docs/PUBLIC_DATA_LAYER.md` exists + ≤200 lines + sections present per §3 #24.
- [ ] Smoke 7/7 PASS on demo (final post-migration run).
- [ ] All 7 storefront pages return HTTP 200 on Prizma + demo.
- [ ] Supabase advisor F-CRIT-2 = 0; total advisors no NEW finding-name.
- [ ] **Demo-first discipline confirmed:** every Prizma destructive op was preceded by the equivalent demo destructive op + verification, in commit history order.

---

## 13. Notes for the next-session Foreman (post-execution review)

When writing FOREMAN_REVIEW.md for this SPEC, harvest improvement proposals (2 author + 2 executor minimum) per opticup-strategic SKILL §"Self-Improvement Mandate". Topics likely to surface:
- Trigger sync verification methodology (was the 3-cases-per-table approach sufficient? should the Executor template grow a TRIGGER_SYNC_E2E.sql reference file?).
- Cached AI-column refresh latency under heavy ai_content edits — measure if Studio editors notice any lag.
- Did Pattern A's "AI columns cached" choice cause unexpected scope creep? (e.g., did the 2 satellite triggers grow more complex than expected?).
- Storefront contract-stability check: did the 8 views' column shape stay byte-identical, or did any consumer break?

---

*End of SPEC. Foreman handoff to ACTIVATION_PROMPT.md follows. Pipeline runs end-to-end in ONE chat from there.*
