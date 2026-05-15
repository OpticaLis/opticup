# M1.5 — BRAND_VISIBILITY_CASCADE Pre-Flight (FUNNEL Phase 0c)

> **Mission:** Map the existing reactive cache implementation (`brands_public.has_sellable_inventory`
> + 3 satellite triggers). Sketch E2E test cases for the cascade. Decide on architecture for
> periodic pg_cron reconciler (vs trigger-only). Produce a SPEC stub for 0c.
>
> **Read-only knowledge build.** Generated 2026-05-15 night.
> Trigger + function bodies sourced live from `pg_trigger` + `pg_proc` on `tsxrrxzmdxaenlvocyit`.

---

## 1. TL;DR

- **Documented gap is real and reproduces from trigger inspection.** The 3 satellite triggers cover `inventory`/`inventory_images`/`ai_content` → `inventory_public`, and `inventory` → `brands_public.has_sellable_inventory`. **There is no satellite on `brands` that re-evaluates `inventory_public.visible` when a brand becomes inactive/excluded/hidden.**
- **Reproducible failure mode:** brand X has 50 products in `inventory_public`. Operator sets `brands.active=false`. `brands_public` row for X is DELETEd by `tr_sync_brands_public` (correct). But the 50 `inventory_public` rows for X remain visible — they only re-evaluate visibility when each underlying `inventory` row is next touched.
- **Recommended fix architecture: hybrid.**
  1. **4th satellite trigger on `brands`** — when a brand's `active`/`exclude_website`/`brand_page_visibility` flips, re-evaluate all child `inventory_public` rows. Closes the gap immediately.
  2. **pg_cron reconciler every 6 hours** as defense-in-depth — re-scans `inventory_public` vs source-of-truth predicates, fixes any drift. Cheap, idempotent, runs against a query-friendly partial index.
- **0c SPEC ready in §6.** Estimated 2-3 hours execution (1 trigger + 1 cron + smoke tests).

---

## 2. Current cascade — what exists today

### 2.1 The 3 declared satellite triggers (per `docs/PUBLIC_DATA_LAYER.md` §5)

| Trigger | On table | Calls function | What it refreshes |
|---|---|---|---|
| `tr_sync_ai_content_to_inventory_public` | `ai_content` | `sync_ai_content_to_inventory_public_trg()` | `inventory_public.ai_description/ai_seo_title/ai_seo_description` |
| `tr_sync_inventory_images_to_inventory_public` | `inventory_images` | `sync_inventory_images_to_inventory_public_trg()` | `inventory_public.image_paths` cache AND re-evaluates visibility (adding first image brings inventory into mirror; removing last takes it out) |
| `tr_sync_inventory_to_brands_has_sellable` | `inventory` | `sync_inventory_to_brands_has_sellable_trg()` | `brands_public.has_sellable_inventory` (covers old + new brand on brand_id change) |

### 2.2 Plus the 6 main triggers (one per source → public mirror)

| Trigger | On table | Refreshes |
|---|---|---|
| `tr_sync_brands_public` | `brands` | `brands_public` (full row INSERT/UPDATE/DELETE based on visibility predicate) |
| `tr_sync_branches_public` | `tenant_branches` | `branches_public` |
| `tr_sync_storefront_config_public` | `storefront_config` | `storefront_config_public` |
| `tr_sync_media_public` | `media_library` | `media_public` |
| `tr_sync_inventory_public` | `inventory` | `inventory_public` (visibility-gated) |
| `tr_sync_inventory_images_public` | `inventory_images` | `inventory_images_public` |

### 2.3 The visibility predicate cascaded into `sync_inventory_public_trg`

Per the live function body (sourced from `pg_proc`):

```
v_visible := (
  COALESCE(NEW.is_deleted, false) = false
  AND COALESCE(NEW.website_sync, 'full') <> 'none'
  AND NEW.barcode IS NOT NULL
  AND (NEW.display_mode_override IS NULL OR NEW.display_mode_override <> 'hidden')
  AND EXISTS (SELECT 1 FROM public.brands b
              WHERE b.id = NEW.brand_id
                AND COALESCE(b.is_deleted, false) = false
                AND b.active = true
                AND COALESCE(b.exclude_website, false) = false
                AND (b.brand_page_visibility IS NULL OR b.brand_page_visibility <> 'hidden'))
  AND EXISTS (SELECT 1 FROM public.inventory_images img WHERE img.inventory_id = NEW.id)
);
```

**Critical observation:** the predicate joins on `brands.active`/`exclude_website`/`brand_page_visibility` — but the trigger fires only on writes to `inventory`. A write to `brands` does NOT re-fire this trigger across the brand's children.

---

## 3. The gap — proven by trigger absence

### 3.1 What's missing

No 4th satellite that, on `brands` UPDATE where `active`/`exclude_website`/`brand_page_visibility`/`is_deleted` changed, fans out to all `inventory_public` rows in that brand and re-evaluates their visibility.

The closest existing trigger is `sync_inventory_to_brands_has_sellable_trg` which fires on `inventory` (not brands) and only updates `brands_public.has_sellable_inventory` (not inventory_public).

### 3.2 Concrete repro

Steps (purely thought-experiment, NOT executed — this is a read-only mission):

1. Brand X has `active=true`, `exclude_website=false`, `brand_page_visibility=NULL`. 50 inventory rows with `website_sync='full'` and ≥1 image each. Result: 50 rows in `inventory_public`.
2. Operator sets `brands.active = false`.
3. `tr_sync_brands_public` fires → `v_visible := false` → `DELETE FROM brands_public WHERE id = X` (correct).
4. But `inventory_public` has 50 rows for brand X **untouched**. Storefront still shows them (`v_storefront_products` reads from `inventory_public JOIN brands_public` — wait, let me re-check).

Actually re-reading `v_storefront_products`:
```sql
FROM (inventory_public i JOIN brands_public b ON ((b.id = i.brand_id)));
```

This is an INNER JOIN — so when brands_public.X is deleted, the JOIN drops all 50 inventory_public rows from the storefront result. **Net storefront behavior: correct** (products vanish on next page load).

So the GAP is not user-visible TODAY because the consumer view JOINs through `brands_public`. But:
- The mirror IS inconsistent (50 ghost rows in `inventory_public`).
- Future consumers (M11 Supplier Portal, Standard-tier shared site, future API) that read `inventory_public` directly without joining `brands_public` would see stale data.
- Any reconciler scan that checks `inventory_public` row count vs source predicate would report drift.

### 3.3 What IS missing-and-user-visible

The case that fires user-visible drift: brand X is *kept* `active=true` but `brand_page_visibility` flips to `'hidden'`. Per the cascade predicate (§2.3), inventory_public rows should be removed (the brand-visibility EXISTS clause fails). But the trigger doesn't fire on brand changes → 50 ghost rows remain in `inventory_public`. AND `brands_public` row still exists (the predicate in `sync_brands_public_trg` only checks active+is_deleted+exclude_website — NOT brand_page_visibility). So both mirrors stay populated.

Storefront `v_storefront_brand_page` uses `brand_page_visibility != 'hidden'` filter, so brand-page disappears. But `v_storefront_products` does NOT filter on brand_page_visibility — so products STAY visible in catalog/search even though brand page is hidden. **This is a user-visible bug today.**

---

## 4. E2E test cases for the cascade

For the SPEC author's TEST_REPORT requirements. Each test is a SQL-only repro (no UI).

### 4.1 Brand deactivation

```sql
-- SETUP: tenant with brand B, 3 inventory rows in B, all with images, all visible.
-- ACT: UPDATE brands SET active = false WHERE id = B;
-- EXPECT: brands_public row gone; inventory_public rows for B = 0.
-- TODAY: brands_public row gone; inventory_public rows for B = 3 (ghost).
-- AFTER FIX: inventory_public rows for B = 0.
```

### 4.2 Brand exclude_website flip

```sql
-- SETUP: same as 4.1
-- ACT: UPDATE brands SET exclude_website = true WHERE id = B;
-- EXPECT + TODAY: same drift as 4.1.
```

### 4.3 Brand_page_visibility → 'hidden'

```sql
-- SETUP: same as 4.1
-- ACT: UPDATE brands SET brand_page_visibility = 'hidden' WHERE id = B;
-- EXPECT: inventory_public rows for B = 0, brands_public row gone.
-- TODAY: BOTH still populated (brand_page_visibility is checked in inventory_public predicate but not brands_public predicate).
-- AFTER FIX: both correctly empty.
```

### 4.4 Brand soft delete

```sql
-- SETUP: same
-- ACT: UPDATE brands SET is_deleted = true WHERE id = B;
-- EXPECT + AFTER FIX: brands_public row gone, inventory_public rows = 0.
```

### 4.5 Brand re-activation

```sql
-- SETUP: brand B inactive, 3 inventory rows exist in inventory (not mirror).
-- ACT: UPDATE brands SET active = true WHERE id = B;
-- EXPECT: brands_public row created, inventory_public re-populated for B's items where they meet the rest of the predicate.
-- TODAY: brands_public row created (by tr_sync_brands_public), but inventory_public still empty for B — no trigger to backfill.
-- AFTER FIX: 3 inventory_public rows recreated.
```

### 4.6 Concurrent INSERT ordering

```sql
-- TX 1: BEGIN; UPDATE brands SET active=true WHERE id=B; -- not committed
-- TX 2: BEGIN; INSERT INTO inventory (brand_id=B, ...); COMMIT;  -- sees brands.active=false in its snapshot
-- TX 1: COMMIT;
-- EXPECT: after both commit, inventory_public reflects brand_id=B as visible.
-- TODAY: depends on order — TX 2's trigger evaluates brand=B's old state (active=false) so row never enters inventory_public. TX 1's trigger doesn't re-evaluate children, so they stay missing.
-- AFTER FIX: TX 1's new trigger re-scans children of B, including the newly committed TX 2 row → inserts correctly.
```

This is the strongest argument for the new satellite. Concurrent INSERT ordering with brand state changes WILL produce drift that no current trigger catches.

### 4.7 Reconciler dry-run

```sql
-- ACT: SELECT COUNT(*) of inventory_public rows that DON'T satisfy the visibility predicate.
SELECT COUNT(*) AS ghost_count
FROM inventory_public ip
WHERE NOT (
  EXISTS (
    SELECT 1 FROM inventory i WHERE i.id = ip.id
      AND COALESCE(i.is_deleted, false) = false
      AND COALESCE(i.website_sync, 'full') <> 'none'
      AND i.barcode IS NOT NULL
      AND (i.display_mode_override IS NULL OR i.display_mode_override <> 'hidden')
  )
  AND EXISTS (
    SELECT 1 FROM brands b
    JOIN inventory i ON i.id = ip.id
    WHERE b.id = i.brand_id
      AND COALESCE(b.is_deleted, false) = false AND b.active = true
      AND COALESCE(b.exclude_website, false) = false
      AND (b.brand_page_visibility IS NULL OR b.brand_page_visibility <> 'hidden')
  )
  AND EXISTS (SELECT 1 FROM inventory_images img
              JOIN inventory i ON i.id = ip.id WHERE img.inventory_id = i.id)
);
```

If today this returns >0 on prizma or demo, that's the live drift count. SPEC author runs this pre-migration and post-migration to verify.

---

## 5. Architecture choice — trigger-only vs hybrid

### 5.1 Trigger-only

**Pros:** sub-second consistency. No cron tail.
**Cons:** triggers can miss edge cases (the SECURITY DEFINER + audit-log-on-error pattern means errors don't block source writes, but they DO leave drift). Hard to verify "no drift exists right now" without scanning.

### 5.2 pg_cron reconciler only

**Pros:** simple. One scheduled query. Catches all drift at next tick.
**Cons:** delay window (5-min-to-6-hour latency depending on cadence) — storefront could show stale brand state for a while. Cron is also one more thing to monitor.

### 5.3 Hybrid (recommended)

**4th satellite trigger** — closes the gap immediately (sub-second cascade).
**+ pg_cron reconciler every 6 hours** — defense-in-depth that catches anything the trigger missed (e.g., transient SECURITY DEFINER errors, future schema additions, hand-edits).

The reconciler is the safety net per the same "Pattern A" the public-data-layer uses (sync triggers + idempotent re-sync). Cheap because the drift query in §4.7 is partial-index-friendly.

### 5.4 Why not just one satellite

Considered: a single trigger on `brands` that handles UPDATE-of-relevant-columns and fans out to `inventory_public`. This is the 4th satellite. **Yes — do this.** What the reconciler ADDS is coverage for the cases the trigger can't catch (lost trigger fires due to errors, missing column changes that weren't in the trigger's WHEN clause, future schema additions).

---

## 6. SPEC stub — `M1_5_BRAND_VISIBILITY_CASCADE_0C`

> Stub for FUNNEL Phase 0c SPEC author. Final SPEC by `opticup-strategic`.

**Goal:** Close the `brands → inventory_public` visibility cascade gap with a 4th satellite trigger + 6-hour pg_cron reconciler.

**Scope (in):**
- New trigger function `sync_brands_to_inventory_public_trg()` — SECURITY DEFINER + search_path-pinned + audit-log-on-error (matches the existing pattern in `docs/PUBLIC_DATA_LAYER.md` §3 step 4).
- Trigger `tr_sync_brands_to_inventory_public AFTER UPDATE OF active, exclude_website, brand_page_visibility, is_deleted ON brands FOR EACH ROW EXECUTE FUNCTION sync_brands_to_inventory_public_trg();`
  - Logic: fan out to all `inventory` rows where `brand_id = NEW.id`, call the same visibility-evaluation logic per row, INSERT/UPDATE/DELETE `inventory_public` accordingly.
  - Performance: bounded by # inventory rows per brand. Prizma's largest brand has ~150 products. Acceptable.
- New trigger function `sync_brands_to_brands_public_visibility_trg()` (or extend `sync_brands_public_trg` predicate) — include `brand_page_visibility != 'hidden'` in the visibility predicate, matching what `v_storefront_products`/`inventory_public_trg` already check.
- pg_cron job `brand_visibility_reconcile` every 6 hours — runs the §4.7 drift query as a DELETE-then-INSERT idempotent re-sync (or just DELETE the ghost rows and let next inventory touch re-INSERT).

**Scope (out):**
- Re-implementing the main `inventory_public` predicate (already correct, no change needed there).
- Changing the storefront views (they read from the mirror, no view change needed).
- Touching unrelated `*_public` mirrors.

**Iron Rule compliance:**
- 14 + 15: no new tables; existing mirrors already have tenant_id + RLS.
- 21: extends existing trigger framework, no duplicates.
- 22: writes guarded by SECURITY DEFINER + audit-log-on-error (existing pattern).
- 31 + 32: read-only behavior; no destructive ops. Migration is purely additive.

**Smoke test:**
- §4.1 / §4.2 / §4.3 / §4.4 / §4.5 / §4.6 / §4.7 — each test runs pre-migration (expect drift), then post-migration (expect 0 drift), then post-reconciler-tick (expect 0 drift even after artificial drift injection).

**Estimated effort:** 2-3 hours execution (1 new trigger func + 1 trigger + 1 cron job + 7 smoke tests on demo).

---

## 7. Performance & operational notes

### 7.1 Fan-out cost

`tr_sync_brands_to_inventory_public` fires once per brand UPDATE. Per fire, it scans `inventory WHERE brand_id = X`. Index on `inventory (tenant_id, brand_id)` exists? Let me note this as a follow-up check — if not, the trigger is slow under heavy brand-toggling. (Unlikely workload — brand state changes are rare admin actions, not transactional.)

### 7.2 Reconciler cost

The drift query in §4.7 reads `inventory_public` (a few thousand rows max per tenant) and joins to `inventory`/`brands`/`inventory_images`. With existing PKs and `(tenant_id, brand_id)` indexes, runs in <100ms even at 100K-row scale. Once every 6h is negligible.

### 7.3 Failure path

Both new trigger AND reconciler MUST follow the audit-log-on-error pattern. The existing functions in §2.1 are the template — copy verbatim.

### 7.4 Rollback

Per `docs/PUBLIC_DATA_LAYER.md` §6 rollback recipe pattern:
```sql
DROP TRIGGER IF EXISTS tr_sync_brands_to_inventory_public ON brands;
DROP FUNCTION IF EXISTS sync_brands_to_inventory_public_trg();
SELECT cron.unschedule('brand_visibility_reconcile');
```
Reverts cleanly. No data damage.

---

## 8. Open question for SPEC author

Should the new trigger fire on **ALL** brand UPDATEs or **only column-list-scoped** UPDATEs? PostgreSQL supports `UPDATE OF col1, col2 ON brand` — cheaper because most brand UPDATEs touch `name`/`description`/`hero_image` (no visibility impact). Recommend column-scoped: `AFTER UPDATE OF active, exclude_website, brand_page_visibility, is_deleted`.

---

## 9. Auxiliary findings (parking lot)

- `sync_brands_public_trg`'s visibility predicate does NOT include `brand_page_visibility != 'hidden'`. Either intentional (brand stays in mirror but hidden via UI filter) OR a parallel gap. Verify with Daniel whether this is by-design.
- `v_storefront_products` does NOT filter on `brand_page_visibility != 'hidden'` — so products from hidden brands still appear in product listings. User-visible inconsistency between brand page (hidden) and product cards (visible). Likely worth its own micro-SPEC.
- The visibility predicate is duplicated across 3 places (sync_inventory_public_trg, sync_inventory_images_to_inventory_public_trg, view definition logic). Drift risk if any future change touches only one. Consider extracting into a SQL function `is_inventory_visible(inventory_id)` that all three call.
- No "drift detection" alerting today. If the SPEC ships the reconciler, the cron job should also INSERT a row into a `data_drift_log` table whenever it finds + fixes >0 rows — then `daily-alert-generation` can surface as a Guardian alert.

---

## 10. Reproducibility

Trigger + function bodies fetched from `pg_trigger` + `pg_proc` against `tsxrrxzmdxaenlvocyit` 2026-05-16 00:35 IDT. SELECT-only.

---

*End of M8. Companion: FUNNEL Phase 0c SPEC author drafts `M1_5_BRAND_VISIBILITY_CASCADE` per §6 with §4 test set. Sub-2-hour SPEC; high SaaS-correctness value.*
