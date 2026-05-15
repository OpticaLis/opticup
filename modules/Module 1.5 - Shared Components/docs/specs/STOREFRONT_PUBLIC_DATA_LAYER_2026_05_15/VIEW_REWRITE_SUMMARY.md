# View Rewrite Summary — Commit 4

Applied globally (one CREATE OR REPLACE per view + ALTER VIEW SET (security_invoker=on)).

## 8 view rewrites — new sources

| View | New FROM source(s) | Notes |
|---|---|---|
| `v_storefront_branches` | `branches_public` | Direct mirror; ORDER BY tenant_id, display_order, slug preserved. |
| `v_storefront_config` | `storefront_config_public` | 20 cols projected; mirror is pre-filtered to enabled=true so no WHERE needed. |
| `v_storefront_media` | `media_public` | 10 cols projected; mirror pre-filtered to is_deleted=false. |
| `v_public_tenant` | `tenants` (anon-readable, NOT revoked) JOIN `storefront_config_public` | tenants stays anon-readable per SPEC §3 #14. |
| `v_storefront_products` | `inventory_public` JOIN `brands_public` | Cached AI cols + image_paths from inventory_public; brand_name + brand_type from brands_public; images JSON computed at view read time from image_paths text[]. |
| `v_storefront_brands` | `brands_public` (chained `inventory_public` for display_mode + product_count, `media_public` for brand_gallery) | **Filter:** brand_page_visibility != 'hidden' AND `brands_public.has_sellable_inventory = true` (the cached column added to preserve the baseline 155-row count per Prizma). |
| `v_storefront_brand_page` | `brands_public` (chained `v_storefront_products` EXISTS + `media_public` for brand_gallery) | Filter: brand_page_enabled=true AND EXISTS in v_storefront_products. |
| `v_storefront_categories` | `v_storefront_products` (chained GROUP BY product_type) | Aggregate view; pre-filtered downstream. |

## Real-time decision — `brands_public.has_sellable_inventory`

The original `v_storefront_brands` had an EXISTS check against `inventory` (the private base) that used a looser filter — `is_deleted=false AND COALESCE(website_sync,'full')<>'none'` — which yields 155 Prizma brands. The naive rewrite (EXISTS against `inventory_public`, which is the strict anon-visible 8-condition filter) yields only 47 brands — a SPEC §3 #13 row-count drift.

After Commit 5's REVOKE, the rewritten view cannot read `inventory` directly (anon would lose SELECT). To preserve the 155-row baseline while keeping the REVOKE safe:

1. Added one column `brands_public.has_sellable_inventory boolean NOT NULL DEFAULT false`.
2. Initial backfill via single UPDATE: TRUE for brands with any non-'none' non-deleted inventory.
3. Main trigger `sync_brands_public_trg` extended to compute + write this flag on brand changes.
4. NEW satellite trigger `sync_inventory_to_brands_has_sellable_trg` on `inventory` to refresh affected brand's flag when inventory changes (both NEW.brand_id and OLD.brand_id on UPDATE; OLD.brand_id only on DELETE).
5. View filter changed from `EXISTS(... inventory_public ...)` to `b.has_sellable_inventory = true`.

Result: post-rewrite anon row count = 155 Prizma brands (matches BASE_PRIZMA_BRANDS exactly).

This is one additional column on an existing mirror table + one additional satellite trigger — same architectural family as the AI/image-paths cache on inventory_public. The Brief §3.1 column allow-list did not enumerate this; the discrepancy is logged as a FINDING for the Foreman's SPEC-defect register.

## Verification (post-rewrite, pre-REVOKE)

| Probe | Result | Baseline |
|---|---|---|
| Prizma v_storefront_products count | 1133 | 1133 ✓ |
| Prizma v_storefront_brands count   | 155  | 155  ✓ |
| Prizma v_storefront_brand_page     | 45   | 45   ✓ |
| Prizma v_storefront_categories     | 2    | 2    ✓ |
| Prizma v_storefront_branches       | 1    | 1    ✓ |
| Prizma v_storefront_config         | 1    | 1    ✓ |
| Prizma v_storefront_media          | 276  | 276  ✓ |
| Prizma v_public_tenant             | 1    | 1    ✓ |
| All 8 views `security_invoker=on`  | yes  | n/a  ✓ |
| F-CRIT-2 advisor (security_definer_view) | 0 | BASE_FCRIT2=8 (closed) |
| New advisor lint **types**         | 0    | per SPEC §3 #17 ✓ |
| Total advisor instances             | 103  | 93 (+10 from new SECDEF function instances; type unchanged) |
| STT-11 cross-tenant leak probe (demo JWT)    | 0 leaked rows  | ✓ |
| Smoke 7/7 PASS                      | 7/7  | ✓ |

## What's NOT done in Commit 4

- REVOKE anon SELECT from the 6 private bases — deferred to Commit 5.
- REVOKE anon SELECT on v_crm_lead_first_touch — deferred to Commit 5.

After Commit 5 lands, anon will read ONLY from the public-data-layer mirrors via these 8 views. Mechanical separation complete.
