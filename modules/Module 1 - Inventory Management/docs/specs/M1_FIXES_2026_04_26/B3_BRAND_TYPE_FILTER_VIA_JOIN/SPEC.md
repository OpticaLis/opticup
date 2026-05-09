# SPEC — B3: brand_type filter via brand_id JOIN

> **Author:** opticup-executor (transcribing Daniel's urgent dispatch)
> **Created:** 2026-04-27
> **Severity:** CRITICAL — silently returned wrong filter results to admins
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` row B3 (re-opened)

## Goal

Fix the B3 inventory `brand_type` filter so it returns the real intersection of inventory items by brand type. Pre-fix, the filter operated on `inventory.brand_type` which is 99% NULL on Prizma — the real data lives on `brands.brand_type`. User-visible symptoms:
- Filter "יוקרה" (luxury) returned 32 instead of 430
- Combined "מותג + ללא תמונות" returned 0 instead of 3390 (this was POST_QA's BUG 2 false-negative — at the time the data did look like 0 because we were querying the dead column)

## Root Cause

Same pattern as the now-dropped `storefront_mode`: `inventory.<col>` shadowing `brands.<col>` with the inventory copy unmaintained and the real data only on the brands side.

Pre-fix `loadInventoryPage` line 46:
```js
if (btype) query = query.eq('brand_type', btype);  // hits the dead inventory column
```

## Fix

Resolve the user's `brand_type` selection to a Set of `brand_ids` via a new `brandTypeCache`, then filter via `inventory.brand_id` (which IS reliable). Same JOIN-via-cache pattern as the existing B2 חברה filter.

### 3-file change

1. **`js/supabase-ops.js`** `loadLookupCaches`:
   - Brands SELECT extended: `id,name,brand_type` (was `id,name`).
   - Populate new `brandTypeCache: { brand_id → brand_type }` alongside the existing brandCache + brandCacheRev.

2. **`js/shared-field-map.js`**: declare `let brandTypeCache = {}`.

3. **`modules/inventory/inventory-table.js`** `loadInventoryPage`:
   - Replace `query.eq('brand_type', btype)` with brand_id resolution:
     ```js
     if (btype) {
       const matchIds = Object.entries(brandTypeCache)
         .filter(pair => pair[1] === btype)
         .map(pair => pair[0]);
       if (matchIds.length === 0) {
         query = query.eq('id', '00000000-0000-0000-0000-000000000000');  // sentinel: 0 rows
       } else {
         query = query.in('brand_id', matchIds);
       }
     }
     ```
   - Edge case: 0 matching brands of selected type → force empty result via impossible-UUID. Keeps semantic of "show me luxury — there are none" → 0 rows (not "no filter applied").

## Success Criteria (verified live 2026-04-27 Prizma)

1. ✅ `brandTypeCache` populated at startup: 232 brands cached, 11 luxury, 65 brand, 0 regular, 156 NULL.
2. ✅ Filter "luxury": pre-fix UI 32 → post-fix UI **430** (matches truth SQL via brands JOIN).
3. ✅ User scenario "brand_type=brand + no-images + qty=all": pre-fix UI 0 → post-fix UI **3390** (matches truth SQL).
4. ✅ Pre-commit hooks pass; integrity gate exit-2 with pre-existing trailing-newline warning (unrelated).

## B2 Verification

B2 חברה (brand_id filter) was checked during this fix — it already uses `query.eq('brand_id', brandId)` which IS on inventory and IS reliable. **B2 is NOT affected by this bug** — only B3.

## Architectural Shadow Scan

Per dispatch stop trigger, scanned for ANY column appearing in BOTH `brands` and `inventory` (excluding standard meta columns). Found 2:

1. **`brand_type`** — the bug we're fixing (dead on inventory, real on brands).
2. **`branch_id`** — entirely NULL on BOTH tables on BOTH tenants (unused-feature stub, NOT the divergent-data shadow pattern). Different category. Logged.

Plus the now-dropped `storefront_mode` / `storefront_mode_override` (B-4 closed those).

**No third instance of the bug pattern found** — dispatch trigger does not fire.

## Bonus Question for Foreman (not acted on)

`inventory.brand_type` is dead like `storefront_mode` was — could be dropped in a future cleanup SPEC. Pre-flight grep would need to verify zero reads first. The B3 fix removed the only consumer that was misusing it; verifying nothing else reads it is a separate exercise.

## Commit Plan

Two commits:
1. `fix(inventory): B3 brand_type filter via brand_id JOIN (was filtering dead column)` — 3-file fix + ROADMAP.
2. `chore(spec): close B3 fix with retrospective` — SPEC + EXECUTION_REPORT.

---

*End of SPEC.*
