# QA Results — POST_QA_LOCALHOST_2026_04_27

> **Tested by:** opticup-executor via Chrome DevTools MCP
> **Date:** 2026-04-27
> **Environment:** localhost:3000 (ERP, Prizma tenant, CEO role) + localhost:4321 (storefront)
> **Methodology:** drive UI, capture state snapshot or page-evaluate evidence, document per-item.

---

## Pre-fixes (BUG 1 + BUG 2)

### BUG 1 — stale storefront_mode_override

| Step | Evidence |
|------|----------|
| Pre-fix: `inventory.storefront_mode_override` non-null | 1 row (Prizma 0004223 / Vintage Frames) |
| Pre-fix: `brands.storefront_mode` non-null | 1 row (Prizma LOOL) |
| Post-fix: both columns null | ✅ verified |
| Post-fix: 0004223 in `v_storefront_products` | ✅ resolved_mode='catalog' |
| LOOL hide intent preserved | ✅ `exclude_website=true` |
| **Verdict** | **PASS — fixed** |

### BUG 2 — inventory filter composition

| Step | Evidence |
|------|----------|
| User-reported scenario (Prizma + no-images + brand_type=brand) | 0 rows |
| `brand_type=brand` alone (Prizma) | 43 rows |
| `no-images` alone (Prizma) | 7682 rows |
| Combined `no-images + brand_type=brand` | 0 rows (all 43 have images) |
| 8 other combos cross-checked | All mathematically consistent |
| **Verdict** | **NOT A BUG — filter correct, data has no matches** |

---

## 12-item QA pass

(populated below as each item is verified)
