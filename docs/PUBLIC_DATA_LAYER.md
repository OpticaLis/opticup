# Public Data Layer

**Canonical reference for the storefront's read-only data boundary.**
Authored 2026-05-15 by `STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15`.
Owner module: `Module 1.5 — Shared Components`.

---

## 1. What this layer is

The Public Data Layer is a structurally-separate set of **mirror tables** sitting between Optic Up's private source-of-truth tables (`inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`, `inventory_images`) and every public consumer (storefront today; future Standard-tier shared storefront, M11 Supplier Portal, customer portal, mobile, API).

**Boundary guarantee:** anon JWTs have no SELECT on the private tables. The boundary is **mechanical, not procedural** — every future column added to `inventory` etc. cannot accidentally leak via storefront unless it is explicitly projected into a mirror table by an engineer who also writes the trigger logic.

The layer is **consumer-agnostic.** The same mirror tables that power Prizma's premium-tier custom-domain site today will power the Standard-tier shared storefront, the M11 Supplier Portal, and any future API/mobile/customer-portal consumer without code change. New tenants flow through the same sync triggers automatically.

## 2. What's in it (6 entities)

| Mirror table | Source private base | Public filter (rows the mirror contains) | Notes |
|---|---|---|---|
| `branches_public` | `tenant_branches` | `status='published' AND is_deleted=false` | 33 cols matching `v_storefront_branches`. |
| `storefront_config_public` | `storefront_config` | `enabled=true` | 25 cols — union of `v_storefront_config` (20) + `v_public_tenant` (`enabled, theme, categories, seo` + PK `id`). |
| `media_public` | `media_library` | `is_deleted=false` | 10 cols matching `v_storefront_media`. |
| `brands_public` | `brands` | `is_deleted=false AND active=true AND exclude_website IS NOT TRUE` | 16 cols matching `v_storefront_brands`/`v_storefront_brand_page` projection + 1 cache col `has_sellable_inventory` boolean (refreshed by satellite trigger from `inventory`; preserves the original `v_storefront_brands` row count). |
| `inventory_images_public` | `inventory_images` | none (all rows; physical FK to inventory enforces visibility) | 6 cols (id, tenant_id, inventory_id, storage_path, sort_order, created_at). |
| `inventory_public` | `inventory` | 8-condition filter: `is_deleted=false AND COALESCE(website_sync,'full')<>'none' AND barcode NOT NULL AND display_mode_override IS NULL OR <> 'hidden' AND brand active AND exclude_website false AND brand_page_visibility not 'hidden' AND EXISTS inventory_images` | 15 cols including 3 cached AI text columns (`ai_description, ai_seo_title, ai_seo_description` from `ai_content`) + `image_paths text[]` cached from `inventory_images`. |

**Strictly excluded from any mirror:** `cost_price`, `last_purchase_at`, `supplier_id`, `internal_notes`, `created_by`, `updated_by`, any financial or operational field. Column lists are **explicit allow-lists**, never `SELECT *`.

**`tenants` is NOT in this layer.** It stays anon-readable directly via the legacy `anon_read_tenants USING(true)` policy — storefront URL resolution needs basic tenant existence + slug. Locking `tenants` behind a future `tenants_public` is a separate SPEC if compliance demands it.

## 3. How to add a new public-projection (template)

When adding a new public-facing entity (e.g., `customer_inquiries_public`):

1. **Define the mirror table** with `id` PK + `tenant_id UUID NOT NULL REFERENCES tenants(id)` + the explicit allow-listed columns.
2. **Add 3 RLS policies** per Iron Rule 15 canonical pattern:
   - `service_bypass` for `service_role` `USING(true)`.
   - `tenant_isolation` for `public` with the JWT-claim USING clause.
   - `<entity>_anon_public_read` for `anon` with the JWT-claim USING clause (FOR SELECT).
3. **GRANT SELECT** on the mirror to `anon` and `authenticated`.
4. **Trigger function** `sync_<entity>_public_trg` — `SECURITY DEFINER`, `SET search_path = public, pg_temp`, owner `postgres`. Logic:
   - On DELETE: `DELETE FROM <mirror> WHERE id = OLD.id`.
   - On INSERT/UPDATE: compute `v_visible := (<public filter>)`. If TRUE → `INSERT ... ON CONFLICT (id) DO UPDATE`. If FALSE → `DELETE FROM <mirror> WHERE id = NEW.id`.
   - `EXCEPTION WHEN OTHERS` → log to `platform_audit_log` with `action='sync_<entity>_public_trg_error'`, `RETURN COALESCE(NEW, OLD)` (do NOT raise — source writes never blocked, per Brief §5.4).
5. **Attach trigger** `tr_sync_<entity>_public AFTER INSERT OR UPDATE OR DELETE ON <source>`.
6. **Backfill** with `INSERT INTO <mirror> SELECT ... FROM <source> WHERE <public filter> ON CONFLICT DO NOTHING`.
7. **Verify** with row count match + E2E (INSERT/UPDATE/DELETE/visibility-flip markers on demo).
8. **Update consumers** (storefront views, future portal views) to read from `<entity>_public`.

If the entity's mirror needs cached columns from related tables (like inventory_public's AI/image caches): **add satellite triggers** on those related tables to refresh the cache. Keep satellites SECURITY DEFINER + search_path-pinned + with the same audit-log failure path.

## 4. Consumer contract

### 4.1 — Storefront (today)

The 8 `v_storefront_*` views read **exclusively** from the 6 mirror tables + `tenants`:

| View | New FROM source |
|---|---|
| `v_storefront_branches` | `branches_public` |
| `v_storefront_config` | `storefront_config_public` |
| `v_storefront_media` | `media_public` |
| `v_public_tenant` | `tenants` JOIN `storefront_config_public` |
| `v_storefront_products` | `inventory_public` JOIN `brands_public` |
| `v_storefront_brands` | `brands_public` (chained `inventory_public`/`media_public`; filters on `has_sellable_inventory=true`) |
| `v_storefront_brand_page` | `brands_public` (chained `v_storefront_products` EXISTS + `media_public`) |
| `v_storefront_categories` | chained on `v_storefront_products` |

All 8 are `security_invoker=on` so the RLS of the mirrors is what enforces tenant isolation for anon callers.

### 4.2 — Future consumers (M11 Supplier Portal, Standard-tier shared site, API, mobile)

Consume the same mirror tables. If a new consumer needs a different projection of, say, brands (e.g., the Supplier Portal needs `cost_price` for its own role), build a parallel `supplier_*_public` family with its OWN allow-listed columns and OWN RLS. **Never widen `*_public` allow-lists to satisfy a non-anon caller** — build a parallel mirror instead.

## 5. Sync mechanism (Pattern A trigger details)

**Triggers active:**

- 6 main triggers (one per private base → its `_public` mirror).
- 1 satellite `tr_sync_ai_content_to_inventory_public` — refreshes `inventory_public.ai_description/ai_seo_title/ai_seo_description` when `ai_content` changes (filtered to `entity_type='product'`).
- 1 satellite `tr_sync_inventory_images_to_inventory_public` — refreshes `inventory_public.image_paths` cache AND re-evaluates visibility (adding the first image brings the inventory into the mirror; removing the last takes it out).
- 1 satellite `tr_sync_inventory_to_brands_has_sellable` — refreshes `brands_public.has_sellable_inventory` when `inventory` changes (covers both old + new brand on `brand_id` change).

**Failure path:** every trigger function has `EXCEPTION WHEN OTHERS` that writes to `platform_audit_log` and `RETURNS NEW/OLD`. The source ERP write **never blocks** if the sync misfires.

**Idempotency:** all main triggers use `ON CONFLICT (id) DO UPDATE`. Re-running the backfill query is safe.

**Eventual consistency:** sub-second under normal load. Heavy ai_content edit batches may queue briefly but never lose updates.

**Known gap (FINDING):** brand state changes (`active=false`, `exclude_website=true`, `brand_page_visibility='hidden'`) do NOT auto-refresh `inventory_public` visibility for inventory rows in that brand. The next inventory touch in that brand re-evaluates visibility; until then storefront may show stale products. Mitigation: a 4th satellite on `brands` is the proper fix; queued for a follow-up SPEC.

## 6. Rollback recipe (per entity, if needed)

```sql
DROP TRIGGER  IF EXISTS tr_sync_<entity>_public ON public.<source>;
DROP FUNCTION IF EXISTS public.sync_<entity>_public_trg();
DROP TABLE    IF EXISTS public.<entity>_public CASCADE;  -- removes policies + grants
-- If satellite: drop its trigger + function similarly.
-- Re-GRANT SELECT TO anon on the private source if needed.
```

Git pre-tags `pre-public-data-layer-<table>-{demo|prizma}` mark the repo state at SPEC seal (commit 2f2a89c). Repo rollback: `git reset --hard <tag>` is destructive and requires Daniel approval. Prefer forward-only fixes.

## 7. Cross-references

- SPEC: `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/SPEC.md`.
- Brief: `modules/Module 1.5 - Shared Components/architecture-brief/STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md`.
- Retrospective: `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/EXECUTION_REPORT.md` + `FOREMAN_REVIEW.md`.
- Iron Rule 14 (tenant_id on every table) — `CLAUDE.md §5`.
- Iron Rule 15 (RLS canonical pattern) — `CLAUDE.md §5`.
- Iron Rule 32 (Destructive Operations Gate) — `CLAUDE.md §6`.
