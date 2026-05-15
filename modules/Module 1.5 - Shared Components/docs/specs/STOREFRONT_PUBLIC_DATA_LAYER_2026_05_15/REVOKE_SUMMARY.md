# REVOKE Summary — Commit 5

Final destructive ops of the pipeline. Anon's path to product/brand/branch/media
data is now MECHANICALLY restricted to the 8 rewritten v_storefront_* views over
the public-data-layer mirrors. Private base tables can no longer be reached
directly by anon JWT regardless of future column additions or policy drift.

## 7 REVOKEs applied (declared in SPEC Destructive Operations items 8 + 9)

| # | Object | Pre-state | Post-state | Type |
|---|---|---|---|---|
| 1 | `public.inventory`              | anon SELECT=TRUE | FALSE | private base |
| 2 | `public.brands`                 | anon SELECT=TRUE | FALSE | private base |
| 3 | `public.media_library`          | anon SELECT=TRUE | FALSE | private base |
| 4 | `public.tenant_branches`        | anon SELECT=TRUE | FALSE | private base |
| 5 | `public.storefront_config`      | anon SELECT=TRUE | FALSE | private base |
| 6 | `public.inventory_images`       | anon SELECT=FALSE (already revoked at GRANT level pre-flight) | FALSE | private base (no-op declared) |
| 7 | `public.v_crm_lead_first_touch` | anon SELECT=TRUE | FALSE | admin-purpose view per HOTFIX_3 FOREMAN_REVIEW F-1 follow-up |

## What anon still has SELECT on (intentional)

- 8 rewritten v_storefront_* views (all `security_invoker=on`).
- 6 public-data-layer mirrors (the views' new sources).
- `public.tenants` (NOT in REVOKE list — `anon_read_tenants USING(true)` policy preserved per SPEC §3 #14; storefront needs basic tenant existence + slug resolution).
- `public.ai_content` with `status='published'` (existing policy preserved; 0 rows currently match — rewritten v_storefront_products reads AI content from `inventory_public.ai_description/ai_seo_*` cache columns, NOT directly from ai_content).

## Post-REVOKE verification

| Probe | Result |
|---|---|
| 6 private bases anon SELECT | all FALSE ✓ |
| v_crm_lead_first_touch anon SELECT | FALSE ✓ |
| 8 v_storefront_* views anon SELECT | all TRUE ✓ |
| 6 mirror tables anon SELECT | all TRUE ✓ |
| `tenants` anon SELECT (NOT revoked) | TRUE ✓ |
| Smoke 7/7 PASS post-REVOKE (demo) | yes ✓ |
| F-CRIT-2 advisor count | 0 ✓ |
| Total advisor count | 103 (same as post-Commit 4 — REVOKE introduced no new findings) ✓ |

## Architectural state at this commit

Mechanical separation COMPLETE. Pattern A delivers:
- Anon can read PRODUCT data only via `v_storefront_products` → `inventory_public` + `brands_public`.
- Anon can read BRAND data only via `v_storefront_brands` / `v_storefront_brand_page` → `brands_public` (with `has_sellable_inventory` cache to preserve baseline row counts).
- Anon can read BRANCH data only via `v_storefront_branches` → `branches_public`.
- Anon can read MEDIA only via `v_storefront_media` → `media_public`.
- Anon can read STOREFRONT CONFIG only via `v_storefront_config` and `v_public_tenant` → `storefront_config_public`.
- Tenant existence (slug, name, ui_config) flows via `v_public_tenant` → `tenants` (anon-readable, intentional).

The 8 triggers + 2 satellites + 1 brand-sellable satellite keep all mirrors in sync as ERP writes flow into private bases.

## What's NOT yet done (Commits 6-11)

- Commit 6: Prizma storefront page smoke (curl https://prizma-optic.co.il/...).
- Commit 10: Master doc updates (PUBLIC_DATA_LAYER.md, GLOBAL_MAP, GLOBAL_SCHEMA, MASTER_ROADMAP, M1.5 SESSION_CONTEXT + CHANGELOG, OPEN_TASKS).
- Commit 11: Skill chain (EXECUTION_REPORT → REVIEW → TEST_REPORT → FOREMAN_REVIEW).
