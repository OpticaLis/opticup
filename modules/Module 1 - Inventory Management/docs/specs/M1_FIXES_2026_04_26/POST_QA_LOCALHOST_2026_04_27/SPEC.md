# SPEC — POST_QA_LOCALHOST_2026_04_27

> **Author:** opticup-executor (post-burndown QA dispatch)
> **Created:** 2026-04-27
> **Severity:** N/A (verification + 2 primary bug fixes)
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` (closes the QA portion of the batch)

## Goal

Two parts:
1. **Primary bugs:** fix BUG 1 (stale `storefront_mode_override` after D3+D4 B-2 column rename) and BUG 2 (inventory filter composition reportedly broken).
2. **12-item QA pass:** verify every closed item from the M1_FIXES batch behaves correctly on localhost via Chrome MCP.

## Bug findings

### BUG 1 — stale NEW-pair values blocking 0004223 from storefront ✅ FIXED

**Root cause confirmed:** post-D3+D4 B-2 the canonical writer is `display_mode_override` but `v_storefront_products`'s WHERE clause still uses `COALESCE(i.storefront_mode_override, b.storefront_mode, ...)` until B-3 lands. A leftover `storefront_mode_override='hidden'` on inventory row 6fc1bc9b (Prizma 0004223 / Vintage Frames) made the view exclude it.

**Fix (Strategic-authorized Level 2 SQL via Supabase MCP):**
1. Inventory: `UPDATE inventory SET storefront_mode_override = NULL WHERE storefront_mode_override IS NOT NULL` — 1 row updated (Prizma 0004223).
2. Brand-level migration (Option c): `UPDATE brands SET exclude_website=true WHERE name='LOOL' AND storefront_mode='hidden'` then `UPDATE brands SET storefront_mode=NULL WHERE storefront_mode IS NOT NULL` — 1 row migrated. LOOL's prior hide-intent preserved on the canonical `exclude_website` mechanism (which the storefront already respects).

**Post-fix verification:**
- `inventory.storefront_mode_override` non-null count: 0 ✅
- `brands.storefront_mode` non-null count: 0 ✅
- `LOOL.exclude_website = true` ✅ (intent preserved)
- `v_storefront_products` includes 0004223 with `resolved_mode='catalog'` ✅

### BUG 2 — inventory filter composition NOT a bug (data, not code)

User reported "ללא תמונות + סוג מותג=מותג + כמות=הכל returns 0 items" on Prizma. Investigation:

- Direct SQL: 0 rows match the combined predicate on Prizma.
- Direct REST: `Content-Range: */0` (correct — no rows match).
- Page's own supabase-js: `combined=0`, `brand_type=brand alone=43`, `no-images alone=7682`.

**Conclusion:** all 43 Prizma `brand_type='brand'` items have images. The intersection `no-images AND brand_type=brand` correctly returns 0 — there are no items in that intersection. The filter is working correctly; user expectations don't match the data.

**8 cross-checked filter combinations** all return mathematically consistent counts (e.g., `no-images + brand_type=luxury = 1` because 31 of 32 luxury items have images). No code fix needed.

## QA pass plan (12 items)

For each, drive UI via Chrome MCP, log to `QA_RESULTS.md` with snapshot/screenshot evidence:

ERP-side (10 items, localhost:3000):
- C1, D5 (Studio side), B1, B5, B2, B3, B4, D1+D2, D3+D4 (Studio side), D4-followup, D6.

Storefront-side (2 items, localhost:4321):
- T7 (image rendering), D5/D3+D4 (customer-side render of recovered/edited products).

For any item that fails QA: stop, investigate, fix, re-test, document.

## Commit Plan

- `chore(data): clear stale storefront_mode_override values (D5+D3+D4 recovery)` — BUG 1 documentation + this SPEC.
- 1 commit per QA-discovered fix (if any).
- `chore(spec): close POST_QA_LOCALHOST with retrospective` — final summary.

## Out-of-Scope

- D3+D4 Phase B-3 (view rewrite) and B-4 (DDL drop) — still gated on Daniel sign-off.
- T7 originals deletion — still gated on Daniel "go delete originals".

---

*End of SPEC.*
