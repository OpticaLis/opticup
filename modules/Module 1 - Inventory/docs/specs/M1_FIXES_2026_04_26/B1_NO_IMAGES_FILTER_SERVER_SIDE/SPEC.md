# SPEC — B1: "ללא תמונות" Filter Must Be Server-Side

> **Author:** opticup-strategic (Cowork session)
> **Created:** 2026-04-26
> **Severity:** CRITICAL — filter is broken in a way users don't realize
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` → row B1
> **Owning module:** Module 1 — Inventory

---

## 1. Goal

The "ללא תמונות" filter button in the Inventory tab currently filters
**only the 50 items already on the visible page**, then mislabels the result
as the total count. Move the filter to the Supabase query so it returns
genuinely image-less inventory across the entire tenant catalog, with
correct pagination and total count.

## 2. Root Cause (verified 2026-04-26 by Foreman)

`modules/inventory/inventory-table.js`:

- Lines 32–68: `loadInventoryPage()` builds a paginated server-side query
  with `count: 'exact'`, `range(offset, offset + INV_PAGE_SIZE - 1)`, and
  joined `inventory_images(*)`.
- Lines 87–92: AFTER the query returns, a client-side post-filter runs:
  ```js
  if (_noImagesFilter) {
    invData = invData.filter(function(r) {
      return !r._images || r._images.length === 0;
    });
    invTotalCount = invData.length;
    invTotalPages = Math.max(1, Math.ceil(invTotalCount / INV_PAGE_SIZE));
  }
  ```

This is wrong on three axes:
1. The DB returned 50 items already paginated; only the no-image subset of
   *those 50* survives the filter — items 51+ are never even fetched.
2. `invTotalCount` is overwritten with the local-only count, so pagination
   becomes a lie ("30 פריטים סה״כ" when in fact there might be 200+ in the
   tenant).
3. Toggling the filter to OFF re-runs `loadInventoryPage()` cleanly, so users
   never see the inconsistency directly — but they ALSO never see image-less
   items from pages 2+, which is the real bug.

## 3. Implementation Direction (executor decides exact mechanics)

The fix must move the "no images" predicate into the Supabase query itself.
The executor decides between these approaches; the SPEC fixes the contract,
not the implementation:

**Preferred — PostgREST left-join with NULL filter:**
```js
let query = sb.from('inventory')
  .select('*, inventory_images(*), brands(name), suppliers(name)', { count: 'exact' })
  .eq('is_deleted', false);
// ... existing filters ...
if (_noImagesFilter) {
  query = query.is('inventory_images.id', null);   // PostgREST left-join NULL test
}
```
This works in PostgREST/Supabase if the embed is treated as a LEFT JOIN by
default. Verify in the demo tenant before committing.

**Fallback — 2-query with NOT IN:**
1. `SELECT DISTINCT inventory_id FROM inventory_images WHERE tenant_id = ?`
2. `query = query.not('id', 'in', `(${ids.join(',')})`)`
Risk: URL length limit (~8KB). Acceptable for the test tenant; check Prizma
size before assuming.

**Last resort — RPC:**
Author a Supabase function `inventory_no_images_search(...)` that does the
NOT EXISTS join in SQL. **Stops here for Daniel approval** because this is
Level 3 SQL autonomy.

If the preferred approach succeeds in QA — that is what ships. The SPEC
does NOT mandate a specific path; only the contract.

## 4. Success Criteria (measurable)

1. Toggling `_noImagesFilter` to ON + clicking through pagination returns
   ONLY image-less items, across the entire tenant catalog.
2. `invTotalCount` (and the `inv-count` element in the DOM) reflects the
   true count of image-less items in the tenant — verified against a
   manual `SELECT COUNT(*) FROM inventory WHERE tenant_id = ? AND id NOT
   IN (SELECT inventory_id FROM inventory_images)` on demo.
3. `invTotalPages` is consistent with `invTotalCount / INV_PAGE_SIZE`.
4. Page navigation (next/prev) inside the filtered view returns
   different image-less items each page — not the same 50.
5. All other filters (search, supplier, ptype, qtyFilter, sort) compose
   correctly with `_noImagesFilter`. Combining "no images" + "supplier =
   X" returns only image-less items belonging to supplier X.
6. Toggling the filter OFF returns to the unfiltered paginated view.
7. `_noImagesFilter` toggle resets `invPage` to 0 (already true at
   line 241; preserve it).
8. Pre-commit hooks pass; `npm run verify:integrity` PASS post-edit.

## 5. Autonomy Envelope

- **Permitted:** edit `modules/inventory/inventory-table.js` (the loader
  function and any local variable cleanup that becomes dead as a result).
  Update the SPEC's parent ROADMAP entry.
- **Permitted with stop-and-report:** if the preferred PostgREST approach
  doesn't return rows correctly in QA, fall back to the 2-query approach.
  Report the fallback in EXECUTION_REPORT but proceed.
- **Forbidden without escalation to Foreman:**
  - DDL changes (new column, new index, new trigger)
  - New views or RPCs (Level 3 SQL — never autonomous)
  - Any change to other filter logic (search, supplier, ptype, qty)
  - Touching `_selectedOnlyFilter` (that's B5, separate SPEC)
  - Touching `_receiptFilterIds` logic
  - Re-running with `git add -A` or any wildcarded git operation

## 6. Stop-on-Deviation Triggers

- The PostgREST `is('inventory_images.id', null)` returns rows that DO
  have images → STOP and report. Do not silently switch to the fallback
  without reporting.
- The 2-query fallback returns a NOT IN list longer than ~500 IDs →
  STOP and report. URL-length risk on Prizma.
- Any change touches files outside `modules/inventory/inventory-table.js`
  (other than the SPEC folder + ROADMAP) → STOP.
- `count: 'exact'` returns a value that does not equal a manual `SELECT
  COUNT(*)` against the same predicate → STOP. The discrepancy is the
  Foreman's call.
- Pre-commit hook fails → STOP, fix root cause, never `--no-verify`.

## 7. Out-of-Scope

- B2–B5 (other inventory filters and selected-only view fix).
- Any other ROADMAP row.
- Refactoring `loadInventoryPage()` to use the `DB.*` wrapper (Rule 7
  pre-existing violation; tracked for a future SPEC).
- The `count: 'exact'` performance cost — acceptable for now; revisit
  only if QA proves slow on Prizma scale.
- Adding an indicator UI ("showing only image-less items") — the
  existing button already changes color (line 238).

## 8. Expected Final State

```
git status (after Daniel's selective add):
  working tree shows the same pre-existing dirty state outside the in-scope list.
  In-scope files modified or added:
    M  modules/inventory/inventory-table.js
    M  modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md
    A  modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/B1_NO_IMAGES_FILTER_SERVER_SIDE/SPEC.md
    A  modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/B1_NO_IMAGES_FILTER_SERVER_SIDE/EXECUTION_REPORT.md
git log -2 --oneline (after both commits):
  <hash2> chore(spec): close B1_NO_IMAGES_FILTER_SERVER_SIDE with retrospective
  <hash1> fix(inventory): make no-images filter server-side (B1)
```

## 9. Commit Plan (TWO commits, per Foreman improvement #1 from D5 review)

**Commit 1 — fix:**
```
fix(inventory): make no-images filter server-side (B1)

The "ללא תמונות" filter button was running on the 50-row paginated
result client-side, returning only image-less items from the current
page and mislabeling them as the total count. Moved the predicate
into the Supabase query via PostgREST left-join + IS NULL on the
embedded resource, so the filter spans the entire tenant catalog
with correct count and pagination.

Closes M1_FIXES_2026_04_26 row B1.
```
Files: `modules/inventory/inventory-table.js`,
`modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md`

**Commit 2 — chore (retrospective):**
```
chore(spec): close B1_NO_IMAGES_FILTER_SERVER_SIDE with retrospective
```
Files: `B1_NO_IMAGES_FILTER_SERVER_SIDE/SPEC.md`,
`B1_NO_IMAGES_FILTER_SERVER_SIDE/EXECUTION_REPORT.md`

This split solves the chicken-and-egg from C1/D5: commit 2 references
commit 1's hash cleanly in EXECUTION_REPORT.

## 10. Iron-Rule Self-Audit (filled at execution close)

| Rule | Status | Evidence |
|------|--------|----------|
| 7 — DB via helpers | ⚠️ pre-existing | `loadInventoryPage` uses `sb.from()` directly. Out of scope. |
| 8 — No innerHTML with user input | ✅ | Renderer escapes; not changed. |
| 14 — tenant_id on table | ✅ | RLS enforces tenant isolation; query inherits. |
| 15 — RLS on table | ✅ | Both `inventory` and `inventory_images` have canonical RLS. |
| 21 — No duplicates | ✅ | `_noImagesFilter` is the only consumer; grep confirms. |
| 22 — Defense-in-depth | ⚠️ partial | The query relies on RLS for tenant isolation; consider explicit `.eq('tenant_id', getTenantId())` if not already inherited via `sb` config. Verify at execution. |
| 31 — Integrity gate | ⏸️ deferred to Claude Code |

---

## 11. Lessons Already Incorporated

- **Cross-Reference Check completed** 2026-04-26 against
  `docs/GLOBAL_SCHEMA.sql` (rev: HEAD `402fb20`): the only related JS
  symbol is `_noImagesFilter` itself in `inventory-table.js`; no other
  module references it. 0 collisions.
- **Two-commit pattern** applied per FOREMAN_REVIEW_C1 Proposal #1.
- **Activation prompt as separate file** per Daniel's preference
  (2026-04-26): `ACTIVATION_PROMPT.md` lives as a sibling of this SPEC
  in the same folder. NOT embedded inside `SPEC.md`.
- **Dead-var trace-forward** per FOREMAN_REVIEW_D5 Proposal #1: the
  current code at lines 87–92 sets `invTotalCount` and `invTotalPages`
  inside the `if (_noImagesFilter)` block. Once the filter moves
  server-side, the entire block disappears and the values come from
  the query's `count` (already wired at line 72). No dead vars after
  the fix.

---

## 12. Activation Prompt

Lives in the sibling file: `ACTIVATION_PROMPT.md` (same folder).

Daniel opens that file, copies the section between
`--- BEGIN PROMPT ---` / `--- END PROMPT ---`, and pastes into Claude Code.
