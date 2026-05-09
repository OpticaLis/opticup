# SPEC — D5: Hidden Products Disappear From Studio UI (Recovery + Fix)

> **Author:** opticup-strategic (acting via Cowork)
> **Created:** 2026-04-26
> **Severity:** CRITICAL — admins cannot un-hide a product once hidden
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` → row D5
> **Owning module (logical):** Module 3 — Storefront / Studio
> **Concrete victim:** product barcode 0004223 (still in main inventory; vanished from Studio + storefront)

---

## 1. Goal

When an admin sets a product to "מוסתר" (hidden) in the Studio Products tab,
the row disappears from the Studio UI itself — there is no way to revert the
choice from the same screen. Today the product is "stuck" hidden and the only
recovery path is direct DB manipulation. Fix the Studio UI so hidden products
remain visible and editable in the management table, restoring the recovery
path through normal admin UX.

The fix simultaneously rescues product 0004223 because once the filter is
removed, the product reappears in the Studio table with the dropdown reading
"🚫 מוסתר" and the admin can change it back to "— עקוב אחרי מותג" (default)
or any other mode.

## 2. Root Cause (verified)

`modules/storefront/storefront-products.js:37-48` — `loadStorefrontProducts()`
applies a filter intended to mirror the public storefront view
(`v_storefront_products`):

```js
// Apply same filters as v_storefront_products view:
// - exclude brands with exclude_website
// - full sync: only if quantity > 0
// - exclude resolved_mode = 'hidden'
const visible = (products || []).filter(p => {
  if (excludedBrandIds.has(p.brand_id)) return false;
  if (p.website_sync === 'full' && p.quantity <= 0) return false;
  const brand = allBrands.find(b => b.id === p.brand_id);
  const resolved = p.storefront_mode_override || brand?.storefront_mode || 'catalog';
  if (resolved === 'hidden') return false;   // ← THIS LINE IS THE BUG
  return true;
});
```

The mistake is applying the **public-storefront filter** to the **management
UI**. The public storefront SHOULD hide hidden products from end customers —
the Studio MUST NOT, because admins need to edit them.

### Why the existing UI already supports the fix without further changes

- `storefront-products.html:81-86` already has a filter dropdown including a
  `<option value="hidden">מוסתר</option>`, so admins can filter to view only
  hidden products.
- `storefront-products.html:96` has a bulk action `🚫 מוסתר`, so admins can
  bulk-hide — but currently can't bulk-unhide because hidden products aren't
  in the table to be selected.
- `storefront-products.js:116-117` already declares CSS classes for
  `resolved-hidden` (red badge) and a label `'מוסתר'`. The renderer at
  `:131-153` already handles the hidden case correctly. Only the data filter
  is buggy.

So the entire fix is: stop dropping hidden products from `visible` in the
loader. The UI is already wired for it.

## 3. Success Criteria (measurable)

1. Line 46 of `modules/storefront/storefront-products.js` removed (the
   `if (resolved === 'hidden') return false;` line).
2. The comment block at lines 37-40 updated to reflect that the Studio UI
   intentionally does NOT mirror the public-view filter for `hidden`.
3. After fix, on demo tenant: open `storefront-products.html` →
   `filter-mode = "מוסתר"` → at least 1 product appears in the table → admin
   can change its dropdown to `""` (— עקוב אחרי מותג) → toast "מצב תצוגה עודכן"
   → product disappears from the "מוסתר" filter and reappears under
   `filter-mode = "קטלוג"` (or wherever the brand default places it).
4. Product 0004223 is recovered through the Studio UI (NOT direct DB) — the
   admin sets its mode override back to `""` after the fix is deployed.
5. The other two filter conditions (excluded-brand + full-sync-with-zero-stock)
   are NOT changed in this SPEC. They are real concerns but distinct and
   should be addressed in a follow-up SPEC if Daniel decides they should also
   relax for the Studio UI.
6. Pre-commit hooks pass.
7. `git status` clean after commit (only the four files of this SPEC modified).

## 4. Autonomy Envelope

- **Permitted:** edit `modules/storefront/storefront-products.js` (one filter
  line + one comment block). Update `ROADMAP.md` D5 row + Progress Tracking
  table. Create the SPEC folder + EXECUTION_REPORT.
- **Forbidden:** any change to `storefront-products.html`, the public view
  `v_storefront_products`, the brand mode logic, the bulk apply path, or any
  data write. NO direct DB manipulation of product 0004223.

## 5. Stop-on-Deviation Triggers

- Edit produces a diff that touches anything other than the filter and its
  comment → STOP, investigate.
- After the edit, the rendered table fails to display hidden products (e.g.,
  CSS class missing) → STOP, do NOT add new CSS in this SPEC.
- Pre-commit hook fails → STOP, fix root cause, never `--no-verify`.

## 6. Rollback Plan

Single-commit fix on a single file. Revert with `git revert <hash>` if any
regression appears. No data writes. No schema change.

## 7. Out-of-Scope

- D3 (resolved_mode field name confusion, lines 65-73) — separate SPEC.
- D4 (changeProductMode storefront propagation) — separate SPEC.
- The other two `visible` filters (excluded brand, zero-stock full-sync).
- Adding a "show hidden" toggle, opacity styling, sticky filter, or any new UI
  element. The existing `filter-mode` dropdown is sufficient.
- Recovering product 0004223 via SQL — must use the Studio UI per SPEC §3.4
  and SESSION_HANDOFF "What NOT to Do".
- Refactoring `loadStorefrontProducts()` to use `DB.*` wrapper (Rule 7).

## 8. Expected Final State

```
git status (after commit, after Daniel discards Cowork phantoms):
  working tree clean
git log -1 --oneline:
  <hash> fix(storefront): show hidden products in Studio Products tab (D5)
git show --stat HEAD:
  modules/storefront/storefront-products.js                                                            | ~3 lines
  modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md                               | ~2 lines
  modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D5_HIDDEN_PRODUCT_RECOVERY/SPEC.md       | NEW
  modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D5_HIDDEN_PRODUCT_RECOVERY/EXECUTION_REPORT.md | NEW
```

## 9. Commit Plan

Single commit:
```
fix(storefront): show hidden products in Studio Products tab (D5)

The Studio Products tab applied the same hidden-product filter as the
public storefront view, which made it impossible to recover a product
once it was set to "מוסתר". Removed the resolved==='hidden' filter from
loadStorefrontProducts() so hidden products remain visible/editable in
the management UI. The existing filter-mode dropdown and resolved-hidden
badge already render the case correctly; this is a pure data-filter fix.

Recovers stuck product 0004223. Closes M1_FIXES_2026_04_26 row D5.
```

Files added explicitly:
- `modules/storefront/storefront-products.js`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D5_HIDDEN_PRODUCT_RECOVERY/SPEC.md`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D5_HIDDEN_PRODUCT_RECOVERY/EXECUTION_REPORT.md`

## 10. Iron-Rule Self-Audit (filled at execution close)

| Rule | Status | Evidence |
|------|--------|----------|
| 7 — DB via helpers | ⚠️ pre-existing | `loadStorefrontProducts` still uses `sb.from()` directly. Out of scope. |
| 8 — No innerHTML with user input | ✅ | Renderer escapes via `escapeHtml()`; not changed by this fix. |
| 14 — tenant_id on table | ✅ | Already filtered in the SELECT (`.eq('tenant_id', tid)` line 30). |
| 21 — No duplicates | ✅ | `loadStorefrontProducts` is the only consumer of this filter logic. |
| 22 — Defense-in-depth | ✅ | tenant_id is in the SELECT and RLS enforces it. |
| 31 — Integrity gate | ⏸️ deferred to Claude Code |

---

*End of SPEC.*
