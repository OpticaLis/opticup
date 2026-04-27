# SPEC — B2+B3+B4: New inventory filters (חברה / סוג מותג / סוג סנכרון)

> **Author:** opticup-executor (OVERNIGHT_M1_M3_BURNDOWN T3)
> **Created:** 2026-04-26
> **Severity:** MEDIUM
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` rows B2 + B3 + B4

---

## Goal

Add 3 server-side filter dropdowns to the Inventory tab so admins can narrow by brand (חברה), brand type (luxury/brand/regular), and website sync mode (full/display/none).

## Implementation

**`inventory.html`** — insert 3 `<div class="form-group"><label>…</label><select>…</select></div>` blocks into the filter row at lines 192-194:
- `inv-filter-brand` next to `inv-filter-supplier` (option values = brand UUIDs, populated dynamically)
- `inv-filter-btype` next to `inv-filter-ptype` (option values = English: luxury/brand/regular)
- `inv-filter-sync` next to `inv-filter-qty` (option values = English: full/display/none)

**`modules/inventory/inventory-table.js`**:
- DOM read block: add brandId, btype, wsync to filter set + invCurrentFilters.
- Query chain: `query.eq('brand_id', brandId)` after supplier; `query.eq('brand_type', btype)` after ptype; `query.eq('website_sync', wsync)` after qty.
- Populate brand dropdown from `brandCacheRev` sorted by Hebrew name (matches existing supplier-rebuild pattern at line 107).

## Success Criteria

1. 3 dropdowns visible in filter row with default option "הכל".
2. Each filter applies server-side (verified: appears in query chain in `loadInventoryPage`).
3. All 3 + existing filters compose AND-style.
4. Brand dropdown options sorted alphabetically (Hebrew locale-aware).
5. Pre-commit hooks pass; integrity gate passes.
6. Two commits.

## Stop-on-Deviation

- Files outside `inventory.html` + `inventory-table.js` + ROADMAP + SPEC folder modified → STOP.
- Pre-commit fails → STOP.

## Out-of-Scope

- Sticky filter persistence across page reloads (future UX enhancement).
- Quick-clear "reset all filters" button.
- Filter-state badges or active-filter chips.

## Commit Plan

1. `feat(inventory): add חברה + סוג מותג + סוג סנכרון filters (B2+B3+B4)`
2. `chore(spec): close B2+B3+B4 with retrospective`

---

*End of SPEC.*
