# SPEC — Studio → Languages → Brands sub-tab visibility filter

**Module:** 3 — Storefront (Studio)
**Status:** Draft, awaiting Daniel approval
**Owner:** opticup-strategic (Foreman) → opticup-executor

## §1 Goal

The Brands sub-tab inside Studio → Languages currently lists 155 brands for prizma — including brands that the public storefront does not actually expose to customers. Filter the list down to the same set of brands that Studio → Pages → "🏷️ עמודי מותג" already shows (47 for prizma today): only brands that the customer-facing storefront actually renders, i.e. visible AND have at least one product with a product image.

## §2 Background — measured 2026-05-09 against prizma tenant

| Surface | Code path | Returns today | Should return |
|---|---|---|---|
| Studio → Pages → 🏷️ עמודי מותג | `modules/storefront/studio-brands.js` line 154: `.filter(b => b.product_count > 0)` | **47** ✅ correct | 47 |
| Studio → Languages → 🏷️ מותגים | `modules/storefront/studio-translations.js` line 44: `.filter(row => visibleIds.has(row.id))` (allowlist from `v_storefront_brands` only) | **155** ❌ wrong | 47 |
| Public storefront `/brands/` | `opticup-storefront/src/lib/brands.ts` (separate repo) | reads `v_storefront_brands` directly + filters by `product_count > 0` | 47 ✅ correct |

Root cause: the Languages tab uses `v_storefront_brands` only as an allowlist of brand_ids and does not apply the `product_count > 0` filter that both other surfaces apply. The view itself returns 155 rows because its WHERE clause requires only "at least one inventory row with website_sync != 'none'" — it does NOT require that the inventory row has a product image. The image-presence check exists only inside the view's `product_count` SELECT subquery.

## §3 Success Criteria (measurable)

After the fix, on prizma tenant in localhost ERP, opening Studio → Languages → 🏷️ מותגים sub-tab MUST satisfy ALL of:

1. The brands table renders **exactly 47 rows** (matches Studio → Pages → 🏷️ עמודי מותג count).
2. Console: zero errors, zero warnings related to translations.
3. Other Languages sub-tabs (Pages, Campaigns, Glossary) render unchanged — same rows, same counts as before the fix.
4. Brand translation editor (open one brand → translate → save) works end-to-end with no regression.
5. Export buttons (📤 ייצוא מותגים EN / RU) download the same 47 brands and no others.
6. `git status` clean after commit.

## §4 Autonomy Envelope

**Executor MAY without asking:**
- Modify `modules/storefront/studio-translations.js` to fetch `product_count` from `v_storefront_brands` and apply `product_count > 0` to `brandsData`.
- Restructure the existing Promise.all so the brand-allowlist query selects `brand_id, product_count` instead of just `brand_id`.
- Run a full localhost smoke check on the 4 Languages sub-tabs.

**Executor MUST stop and report on:**
- Any other sub-tab's row count changes.
- Any console error appearing as a result of the change.
- Any DB write needed (this fix should be read-only client logic).
- Any file outside `modules/storefront/studio-translations.js` requiring a change.

## §5 Stop Triggers

- Brand count after fix is not 47 (could be 46 or 48 if data shifts mid-execution — that's fine; STOP only if the count is wildly off, e.g. <40 or >60).
- The fix touches more than 1 file.
- Languages → Pages tab row count drops or rises after the fix.
- Any new SELECT or VIEW is required at DB level — this is pure client-side filtering, no DB change.

## §6 Rollback

Single-file commit. `git revert <hash>` if needed. Zero schema or data changes.

## §7 Out of Scope

- The `v_storefront_brands` view itself — DO NOT modify (Iron Rule 13, Iron Rule 29).
- The public storefront repo (`opticup-storefront`) — DO NOT touch.
- Inventory → "🏷️ ניהול מותגים" tab — works as designed (shows all brands; it's an inventory-management tool).
- Studio → Pages → "🏷️ עמודי מותג" — already correct, do not touch.
- Any change to `default_sync` semantics — out of scope; not the cause of this bug.

## §8 Expected Final State

`modules/storefront/studio-translations.js` Promise.all destructured tuple updated so the `vb` query selects `brand_id, product_count`, and the post-Promise filter changes to:

```js
const visibleIds = new Set(
  (vb.data || [])
    .filter(r => (r.product_count || 0) > 0)
    .map(r => r.brand_id)
);
```

Net diff: roughly 3-line change. No other code touched.

## §9 Commit Plan

Single commit:
```
fix(studio-translations): filter brands sub-tab to those with at least one visible product

The Languages → Brands sub-tab was listing 155 brands for prizma —
all brands the storefront view exposes by row, but including brands
with zero product-with-image. Studio Brand Editor and the public
storefront both already filter by product_count > 0; this commit
brings the Languages tab into alignment.

Result: Languages → Brands now shows the same 47 brands as Studio
→ Pages → "עמודי מותג" and the public /brands/ page.
```

## §10 QA Steps (executor performs on localhost)

1. Open localhost ERP → log in as prizma admin → Studio → Languages tab.
2. Click "🏷️ מותגים" sub-tab. Count rows. Expected: 47.
3. Click "📄 עמודים" sub-tab. Confirm row count unchanged from pre-fix.
4. Click "🎯 קמפיינים" sub-tab. Confirm row count unchanged.
5. Click "📖 גלוסרי" sub-tab. Confirm row count unchanged.
6. Open one brand for editing → modify a translation → save → reload → confirm persisted.
7. Click "📤 ייצוא מותגים EN" → confirm exported file contains 47 brands.
8. `git status` clean → commit → `git status` clean again.

## §11 Lessons Already Incorporated

- **Step 0 baseline measured live before authoring** (per opticup-strategic Step 0): queried prizma DB; confirmed Studio Brand Editor returns 47, Languages returns 155, gap = 108 (matches `default_null` count from prior measurement).
- **Cross-Reference Check (Rule 21):** verified two other consumers of `v_storefront_brands` (studio-brands.js — already correct; public storefront `lib/brands.ts` — already correct). No new DB objects introduced. 0 collisions.
- **Iron Rule 29 respected:** no view modification proposed; client-side filter only.
