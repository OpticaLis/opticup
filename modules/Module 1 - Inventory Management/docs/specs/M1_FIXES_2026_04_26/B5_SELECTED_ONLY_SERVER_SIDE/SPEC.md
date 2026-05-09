# SPEC — B5: "רק מסומנים" filter must be server-side

> **Author:** opticup-executor (operating from OVERNIGHT_M1_M3_BURNDOWN T2)
> **Created:** 2026-04-26
> **Severity:** HIGH — admins lose visibility into selections that span multiple pages
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` → row B5
> **Owning module:** Module 1 — Inventory

---

## 1. Goal

The "רק מסומנים" toggle button currently filters the local 50-row paginated
result via `invData.filter(r => invSelected.has(r.id))`. If a user has
selected items across multiple pages (for an Excel export or bulk action),
the filter shows ONLY the selections that happen to be on the current
visible page — silently hiding the rest. Move the filter into the Supabase
query so it spans the entire tenant catalog.

## 2. Root Cause

`modules/inventory/inventory-table.js:248-262` — `toggleSelectedFilter()`
does:
```js
if (_selectedOnlyFilter) {
  var filtered = invData.filter(function(r) { return invSelected.has(r.id); });
  renderInventoryRows(filtered);
}
```
`invData` is the post-pagination result (max 50 rows). Selections from
pages 2+ are never present in `invData` and are silently dropped.

## 3. Implementation

### Files to change

1. **`modules/inventory/inventory-table.js`**
   - In `loadInventoryPage()`: thread the selected-filter into the query
     chain after the no-images filter, before `range()`. Code:
     ```js
     if (_selectedOnlyFilter && invSelected.size > 0) {
       query = query.in('id', Array.from(invSelected));
     }
     ```
     supabase-js auto-switches to POST when the URL would exceed limits, so
     this single `.in()` call handles 1000+ UUIDs transparently. The
     activation prompt's "batch in 500-id chunks for >1000" path is
     deferred until a real 10k+ selection workflow proves it necessary
     (logged as future-work in EXECUTION_REPORT).
   - Rewrite `toggleSelectedFilter()`: instead of local-filter +
     `renderInventoryRows(filtered)`, just reset `invPage = 0` and call
     `loadInventoryPage()` so the new server-side filter applies.
   - Update `_updateSelectedFilterBtn()`: when selection drains to zero
     while filter is active, deactivate the filter AND reload unfiltered
     (was rendering local invData — now reload page 0 from server).

### Why this composes with existing filters

The new `.in('id', ...)` is added to the same query chain as supplier,
ptype, qtyFilter, search, no-images. supabase-js builds AND across
`.eq()` / `.in()` / `.is()` calls, so combining "selected only" with any
other filter (e.g. "selected only" + "supplier = X") returns the
intersection — selected items that also belong to supplier X.

## 4. Success Criteria

1. After toggle ON: page navigation through the filtered set returns ONLY
   selected items, regardless of which original page they came from.
2. `invTotalCount` reflects the true count of selected items matching the
   other active filters.
3. Combining "selected only" with supplier filter returns intersection
   (verified by visual inspection on demo, gated to Daniel post-deploy).
4. Toggle OFF reloads page 0 unfiltered.
5. Selection draining to 0 while filter is ON deactivates filter and
   reloads (preserving the existing UX).
6. Pre-commit hooks pass; integrity gate passes.
7. Two-commit pattern.

## 5. Stop-on-Deviation Triggers

- Any file outside `inventory-table.js` + ROADMAP + the SPEC folder is
  modified → STOP.
- Pre-commit hook fails → STOP.
- A subsequent grep reveals `invSelected` being mutated within
  `toggleSelectedFilter` itself → STOP (it should remain immutable in
  this function).

## 6. Out-of-Scope

- The >1000-ID chunked-batching path (deferred — see §3).
- Refactoring `loadInventoryPage` to use the `DB.*` wrapper (Rule 7
  pre-existing).
- Other inventory filters (B2/B3/B4 — separate SPEC, T3 in burndown).
- Excel export logic (already correct via `inventory-export.js`).

## 7. Commit Plan

Two commits:
1. `fix(inventory): selected-only filter fetches all selected from server (B5)`
   - Files: `modules/inventory/inventory-table.js`, ROADMAP.md.
2. `chore(spec): close B5 with retrospective`
   - Files: SPEC.md (this), EXECUTION_REPORT.md.

---

*End of SPEC.*
