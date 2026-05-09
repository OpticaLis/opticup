# SPEC — D1+D2: Brands tab UX simplification

> **Author:** opticup-executor (OVERNIGHT_M1_M3_BURNDOWN T4)
> **Created:** 2026-04-26
> **Severity:** MEDIUM
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` rows D1 + D2

---

## Goal

Collapse 3 confusing/overlapping columns in `modules/storefront/storefront-brands.js` (the standalone Brand Mode Manager UI) into 2 actionable columns. After D3+D4 B-2 unified the Studio Products tab on the LEGACY pair, the Brands tab still showed both write paths — making the UX inconsistent with the new canonical model.

## Root Cause

`storefront-brands.js:65-118` (renderBrandsTable) emitted:
- "סנכרון" — read-only display of default_sync + exclude_website (D1: redundant info, no action).
- "מצב תצוגה" — dropdown writing `storefront_mode` (NEW pair).
- "תצוגה באתר" — dropdown writing `display_mode` (LEGACY pair).

The two mode columns split the brand-display-mode write into TWO controls
with mismatched value spaces. Pre-D3+D4 they wrote different columns; after
D3+D4 B-2 the NEW-pair column is deprecated. This SPEC consolidates.

## Implementation

`modules/storefront/storefront-brands.js`:

1. `renderBrandsTable` rewritten with 5 columns (מותג / מוצרים / תצוגה באתר / מצב תצוגה / עמוד מותג) — one less than before.
2. New "תצוגה באתר" column = show/hide toggle button. Green ON when `exclude_website=false`; red OFF when true. `onclick="changeBrandVisibility(this)"`.
3. "מצב תצוגה" column = single LEGACY-pair dropdown (`changeBrandDisplayMode`). Options: empty=ברירת מחדל / catalog / store_all / store / hidden.
4. New handler `changeBrandVisibility(btn)` — writes `brands.exclude_website`, reloads the table.
5. `changeBrandDisplayMode` extended: empty value → null (clear brand-level default).
6. `changeBrandMode` (NEW-pair writer) marked DEAD-CODE CANDIDATE in a header comment but NOT deleted (per activation prompt "keep the existing change-handlers"; the queued housekeeping SPEC will clean up after Phase B-3/B-4 lands).

## Success Criteria

1. Brands table renders with 5 columns instead of 6.
2. "תצוגה באתר" toggle correctly reflects `exclude_website` state and toggles it.
3. "מצב תצוגה" dropdown writes `display_mode` (LEGACY) including null on empty selection.
4. Existing brand-page-editor button behavior preserved.
5. No JS errors on render.
6. Pre-commit + integrity gates pass.
7. Two commits.

## Stop-on-Deviation

- Files outside `storefront-brands.js` + ROADMAP + SPEC folder modified → STOP.
- Pre-commit fails → STOP.

## Out-of-Scope

- Deleting `changeBrandMode` function (housekeeping SPEC).
- Deleting `storefront_mode` column from DB (D3+D4 B-4, gated on Daniel sign-off).
- Migrating `storefront-brands.html` page itself (whether to keep or fold into Studio — separate housekeeping SPEC).
- Adding bulk-actions to the Brands tab (out of D1+D2 scope).

## Commit Plan

1. `refactor(storefront): collapse Brands tab to 2 actionable columns (D1+D2)`
2. `chore(spec): close D1+D2 with retrospective`

---

*End of SPEC.*
