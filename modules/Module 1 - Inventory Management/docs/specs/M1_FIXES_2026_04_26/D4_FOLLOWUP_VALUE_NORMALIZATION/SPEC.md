# SPEC — D4-followup: Studio Products dropdown value normalization

> **Author:** opticup-executor (operating from OVERNIGHT_M1_M3_BURNDOWN T1)
> **Created:** 2026-04-26
> **Severity:** MEDIUM (silent value-space mismatch flagged in `D3_D4_DISPLAY_MODE_RECONCILIATION/EXECUTION_REPORT_PHASE_B.md` §5)
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` (D4 follow-up)
> **Owning module:** Module 3 — Storefront / Studio

---

## 1. Goal

After D3+D4 Phase B-2 renamed Studio Products writes from the NEW pair to the
LEGACY pair, the dropdown values were left unchanged: the Studio Products tab
still emits `'shop'` from its dropdowns, but the LEGACY value space (used by
`brands.display_mode`, `inventory.display_mode_override`, and the
`opticup-storefront` repo's `effectiveDisplayMode()` helper) is
`'catalog' | 'store' | 'store_all' | 'hidden'`. After B-2, an admin who picks
"🛒 חנות" writes `display_mode_override = 'shop'` to a column the storefront
reads — but `'shop'` is not in the storefront's TypeScript union, so the
storefront's rendering branches don't handle it predictably.

This SPEC normalizes the Studio Products dropdown value space to align with
LEGACY: the existing 4-option set (default / catalog / SHOP / hidden)
becomes (default / catalog / **STORE_ALL** / hidden). The user-facing label
"חנות" is unchanged.

## 2. Why now (relationship to T7 / value-space cleanup)

This is the smallest possible follow-up that closes the value-space loophole
B-2 left open. It does not introduce any new functionality, does not touch
the database, and reuses the existing 4-option UX. It's executed FIRST in
the overnight queue so subsequent items (B-2 finding harvest, B-3 view
rewrite) can rely on a clean value space.

## 3. Implementation

### Files to change

1. **`storefront-products.html`**
   - Line 51 area: CSS class `.resolved-shop` renamed to `.resolved-store_all` (visual style preserved — green badge).
   - Line 84 (filter dropdown): `<option value="shop">` → `<option value="store_all">`.
   - Line 95 (bulk-mode dropdown): `<option value="shop">` → `<option value="store_all">`.
2. **`modules/storefront/storefront-products.js`**
   - Line 112 `modeLabels`: key `shop` → `store_all` (label "חנות" unchanged).
   - Line 113 `modeTags`: key `shop` → `store_all` and value `'resolved-shop'` → `'resolved-store_all'`.
   - Line 144 (per-row dropdown): `value="shop"` and `overrideVal === 'shop'` → `value="store_all"` and `=== 'store_all'`.
   - Line 223 (`applyBulkMode` toast label map): key `shop` → `store_all`.

### Data-migration risk: zero

Per Phase A INVESTIGATION_REPORT Q5, NO row in `inventory.display_mode_override`
or `brands.display_mode` currently holds the value `'shop'` on either tenant.
This rename is purely UI-side; no historical data is stranded by removing
`'shop'` from the value space.

## 4. Success Criteria

1. All 6 sites listed above renamed.
2. Project-wide grep for `value="shop"` in HTML returns 0 hits.
3. Project-wide grep for `'shop'` (single-quoted, in storefront-products.js)
   returns 0 hits in storefront-products.js (other files may still use
   storefront's own conventions).
4. CSS class `.resolved-store_all` exists in `storefront-products.html` and
   matches the prior visual style of `.resolved-shop`.
5. Pre-commit hooks pass; integrity gate passes.
6. Two-commit pattern: fix + chore-spec.

## 5. Stop-on-Deviation Triggers

- Any file outside the 2 in scope is modified → STOP.
- Project-wide grep for `'shop'` post-change reveals storefront-products.js
  still has hits → STOP and fix.
- Pre-commit hook fails → STOP, fix root cause.

## 6. Out-of-Scope

- The dedicated brand-mode UI in `storefront-brands.js` (its `'shop'` value
  is a different question — D1+D2 housekeeping SPEC).
- Any DB constraint addition (CHECK constraint on `display_mode_override`).
  That's a hardening SPEC for after Phase B-3.
- Storefront repo updates — none needed; storefront already accepts
  `'store_all'`.

## 7. Commit Plan

Two commits:

1. `fix(storefront): align Studio dropdown values with display_mode space (D4-followup)`
   - Files: `storefront-products.html`, `modules/storefront/storefront-products.js`,
     `M1_FIXES_2026_04_26/ROADMAP.md`.
2. `chore(spec): close D4-followup with retrospective`
   - Files: `D4_FOLLOWUP_VALUE_NORMALIZATION/SPEC.md`,
     `D4_FOLLOWUP_VALUE_NORMALIZATION/EXECUTION_REPORT.md`.

---

*End of SPEC.*
