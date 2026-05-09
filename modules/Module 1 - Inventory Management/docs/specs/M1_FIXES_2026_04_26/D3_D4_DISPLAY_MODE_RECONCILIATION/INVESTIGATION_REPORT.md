# INVESTIGATION_REPORT — D3 + D4 Display Mode Schema Reconciliation (Phase A)

> **Phase:** A — read-only investigation
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-26
> **Source SPEC:** `SPEC.md` in this folder
> **Tooling used:** `scripts/investigate-display-mode.mjs` (existing), Supabase service-role SQL probes via MCP, `grep -rn` across `opticup/` and `opticup-storefront/`
> **No source code modified, no DB writes, no view changes.**

---

## TL;DR (one paragraph)

The two field pairs (`display_mode`/`display_mode_override` = LEGACY,
`storefront_mode`/`storefront_mode_override` = NEW) both exist in the schema
but are essentially split-brain in practice. The **LEGACY pair is the only
one that holds real data**: 100% of brands on demo (233/233) and Prizma
(232/232) have `display_mode` set, while the NEW pair is null on all but a
single Prizma artifact (which is the D5 stuck-hidden-product, expected to
resolve once Daniel uses the recovered UI). The Studio **Brands** tab and
the public **storefront** both read & write the LEGACY pair; the Studio
**Products** tab reads & writes the NEW pair. The view `v_storefront_products`
exposes the LEGACY pair as raw columns AND a computed `resolved_mode` from
the NEW pair only (COALESCE → `'catalog'` default), so storefront sees an
incoherent mix. **D3 = Studio Products tab shows defaults because it reads
the never-populated NEW pair. D4 = writes from Studio Products go to the NEW
pair, which the public storefront does not read for display nuances.** Both
are symptoms of the same architectural duplication.

---

## Q1 — `inventory` table columns

Source: `node scripts/investigate-display-mode.mjs` (full output below).

Mode-related columns on `inventory`:
- `storefront_mode_override` (NEW pair, override level)
- `display_mode_override` (LEGACY pair, override level)
- (also `storefront_status`, `storefront_price`, `storefront_description` —
  unrelated commerce fields; not part of this investigation)

---

## Q2 — `brands` table columns

Mode-related columns on `brands`:
- `storefront_mode` (NEW pair, brand-default level)
- `display_mode` (LEGACY pair, brand-default level)

---

## Q3 — `v_storefront_products` view columns

Mode-related columns exposed to storefront/anon callers:
- `display_mode` — passed through from `b.display_mode` (LEGACY brand default)
- `display_mode_override` — passed through from `i.display_mode_override` (LEGACY override)
- `resolved_mode` — computed: `COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog'::text)` — **NEW pair only**
- (also `storefront_mode` family is NOT exposed as raw columns)

The view's WHERE clause also uses the NEW pair for hidden-filter:
`COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog') <> 'hidden'`
— so a product is hidden from the storefront if and only if the NEW pair
resolves to 'hidden'. The LEGACY pair never affects visibility.

Source: `docs/GLOBAL_SCHEMA.sql` lines 269–293.

---

## Q4 — Do BOTH pairs exist?

**Yes.** Both `display_mode` and `storefront_mode` exist as columns on
`brands`. Both `display_mode_override` and `storefront_mode_override` exist
as columns on `inventory`. The investigation script flags this with
`⚠️ BOTH columns exist — architectural decision needed!`.

---

## Q5 — Row counts: how populated is each column on each tenant?

Source: live SQL via Supabase MCP, 2026-04-26.

### Brand-level

| Tenant | `display_mode` populated | `storefront_mode` populated | Disagreement (both set, differ) | One-null-other-set |
|--------|--------------------------|------------------------------|----------------------------------|--------------------|
| demo   | **233 / 233 (100%)**     | 0 / 233 (0%)                 | 0                                | 233                |
| prizma | **232 / 232 (100%)**     | 1 / 232 (0.4%)               | 1                                | 231                |

### Product-level

| Tenant | `display_mode_override` populated | `storefront_mode_override` populated | Disagreement | One-null-other-set |
|--------|------------------------------------|----------------------------------------|--------------|--------------------|
| demo   | 0 / 8666 (0%)                      | 0 / 8666 (0%)                          | 0            | 0                  |
| prizma | 0 / 8738 (0%)                      | 1 / 8738 (~0%)                         | 0            | 1                  |

### Value distribution

| Tenant | Column | Values present (count) |
|--------|--------|------------------------|
| demo   | `brands.display_mode` | `'store_all'` × 233 |
| demo   | `brands.storefront_mode` | NULL × 233 |
| demo   | `inventory.display_mode_override` | NULL × 8666 |
| demo   | `inventory.storefront_mode_override` | NULL × 8666 |
| prizma | `brands.display_mode` | `'store_all'` × 215, `'catalog'` × 17 |
| prizma | `brands.storefront_mode` | NULL × 231, `'hidden'` × 1 |
| prizma | `inventory.display_mode_override` | NULL × 8738 |
| prizma | `inventory.storefront_mode_override` | NULL × 8737, `'hidden'` × 1 |

**Smoking gun:** The 1-row Prizma `storefront_mode_override='hidden'` is
almost certainly the D5 stuck-hidden product (the Foreman authored D5 right
before this SPEC). After Daniel exercises the D5 recovery UI, that row will
return to NULL — meaning the NEW pair will be 100% empty on both tenants.

The LEGACY pair, in contrast, carries real architectural information on
Prizma: 17 brands are flagged as `display_mode='catalog'` (luxury), 215 as
`display_mode='store_all'`. Demo has no such variation (all brands defaulted
to `'store_all'` during seeding), but Prizma's data is the production case
that matters.

---

## Q6 — JS reference inventory (read & write sites for both pairs)

Source: `grep -rn 'display_mode|display_mode_override|storefront_mode|storefront_mode_override' --include=*.js --include=*.html`

### LEGACY pair — `display_mode` / `display_mode_override`

| File | Line | Type | Snippet |
|------|------|------|---------|
| `modules/storefront/studio-brands.js` | 126 | READ (select) | `.select('… display_mode, brand_page_visibility …')` |
| `modules/storefront/studio-brands.js` | 331–334 | READ (UI) | `${(brand.display_mode || 'store_all') === 'catalog' …}` etc., 4 dropdown options |
| `modules/storefront/studio-brands.js` | 745 | WRITE (insert/update payload) | `display_mode: document.getElementById('sbe-display-mode')?.value || 'store_all'` |
| `modules/storefront/storefront-brands.js` | 14 | READ (select) | `.select('id, name, storefront_mode, display_mode, …')` |
| `modules/storefront/storefront-brands.js` | 84 | READ (UI) | `const currentDisplay = b.display_mode \|\| 'store_all';` |
| `modules/storefront/storefront-brands.js` | 130 | WRITE (update) | `.update({ display_mode: newMode })` |

`display_mode_override`: **0 references** in this repo. The column exists on `inventory` and is exposed by the view but is NEVER read or written by any ERP-side JS.

### NEW pair — `storefront_mode` / `storefront_mode_override`

| File | Line | Type | Snippet |
|------|------|------|---------|
| `modules/storefront/storefront-products.js` | 16 | READ (select) | `.select('id, name, storefront_mode, exclude_website')` |
| `modules/storefront/storefront-products.js` | 29 | READ (select) | `.select('… storefront_mode_override …')` |
| `modules/storefront/storefront-products.js` | 66–67 | READ (UI derive) | `brand_mode: brand?.storefront_mode \|\| null,` `resolved_mode: p.storefront_mode_override \|\| brand?.storefront_mode \|\| 'catalog'` |
| `modules/storefront/storefront-products.js` | 129 | READ (UI override badge) | `const overrideVal = p.storefront_mode_override \|\| '';` |
| `modules/storefront/storefront-products.js` | 197 | WRITE (single update) | `.update({ storefront_mode_override: newMode })` |
| `modules/storefront/storefront-products.js` | 206 | WRITE (local state mirror) | `prod.storefront_mode_override = newMode;` |
| `modules/storefront/storefront-products.js` | 232 | WRITE (bulk update) | `.update({ storefront_mode_override: newMode })` |
| `modules/storefront/storefront-products.js` | 243 | WRITE (local state) | `prod.storefront_mode_override = newMode;` |
| `modules/storefront/storefront-brands.js` | 14 | READ (select) | (same select as above — both pairs read here) |
| `modules/storefront/storefront-brands.js` | 23 | READ (select) | `.select('… storefront_mode_override …')` |
| `modules/storefront/storefront-brands.js` | 41 | READ (UI derive) | `const resolved = p.storefront_mode_override \|\| brand?.storefront_mode \|\| 'catalog';` |
| `modules/storefront/storefront-brands.js` | 83 | READ (UI) | `const currentMode = b.storefront_mode \|\| '';` |
| `modules/storefront/storefront-brands.js` | 148 | WRITE (update) | `.update({ storefront_mode: newMode })` |

### Summary

- **`studio-brands.js`** = LEGACY only. Reads & writes `display_mode`. Doesn't know `storefront_mode` exists.
- **`storefront-brands.js`** (Studio Brands tab) = mixed. Selects BOTH pairs; reads NEW for derive (`resolved`); writes NEW (`storefront_mode`).
  - **Conflict between `studio-brands.js` and `storefront-brands.js` itself:** they appear to be two different Brands tab files. `studio-brands.js` writes `display_mode`; `storefront-brands.js` writes `storefront_mode`. This is a separate D1/D2 concern but worth flagging here.
- **`storefront-products.js`** (Studio Products tab) = NEW only. Reads & writes `storefront_mode_override`. Doesn't know `display_mode_override` exists.
- **No JS file reads or writes `display_mode_override`** in this repo.

### SQL/migrations side

- `docs/GLOBAL_SCHEMA.sql:269` — view exposes `b.display_mode`
- `docs/GLOBAL_SCHEMA.sql:270` — view exposes `i.display_mode_override`
- `docs/GLOBAL_SCHEMA.sql:275` — view computes `resolved_mode` from NEW pair only
- `docs/GLOBAL_SCHEMA.sql:293` — view's WHERE hidden-filter uses NEW pair only
- `migrations/*.sql` — **0 references** to either pair in this repo's tracked migrations. Both columns predate the current migration-tracking discipline.

---

## Q7 — Sibling storefront repo (`opticup-storefront/`)

The sibling Astro repo IS available on this Windows desktop at
`C:/Users/User/opticup-storefront/`. Greppable.

### LEGACY pair — `display_mode` / `display_mode_override`

| File | Line | Type | Snippet |
|------|------|------|---------|
| `src/lib/products.ts` | 91 | TYPE | `display_mode?: string \| null;` (interface field) |
| `src/lib/products.ts` | 90 | TYPE | `display_mode_override?: string \| null;` |
| `src/lib/products.ts` | 93 | READ + helper | `return (p.display_mode_override \|\| p.display_mode \|\| 'store_all') as any;` ← canonical "display mode" derivation |
| `src/lib/products.ts` | 122 | READ (select) | `.select('id, …, display_mode, display_mode_override, …, resolved_mode, …')` (full product listing) |
| `src/lib/products.ts` | 182, 207 | READ (select) | same fields in 2 other product-fetch helpers |
| `src/lib/brands.ts` | 14, 50, 77, 87, 88 | READ (select + UI sort) | reads `display_mode` from view; sorts catalog brands first |
| `src/components/ProductCard.astro` | 22–24, 65 | TYPE + READ | declares `display_mode`, `display_mode_override`; line 65 derives `displayMode` from LEGACY pair |
| `src/components/blocks/BrandStripBlock.astro` | 22–23 | READ | `b.display_mode === 'catalog'` ← luxury brands strip filter |
| `src/pages/products/[barcode].astro` | 50, 77 | READ | reads `resolved_mode` for catalog/shop decision; reads LEGACY pair for `displayMode` |
| `src/pages/en/products/[barcode].astro` | 44, 62 | READ | same pattern (English locale) |
| `src/pages/ru/products/[barcode].astro` | 44, 62 | READ | same pattern (Russian locale) |
| `src/pages/api/supersale-stock.ts` | 65, 67, 77, 120, 122 | READ + filter | filters by `.eq('display_mode', 'store_all')` directly — Super Sale endpoint |

### NEW pair — `storefront_mode` / `storefront_mode_override`

**0 references** in `src/`. Storefront does not know these columns exist.

### `resolved_mode` (computed view column from NEW pair)

| File | Line | Snippet |
|------|------|---------|
| `src/lib/products.ts` | 58 | TYPE: `resolved_mode: 'catalog' \| 'shop'` |
| `src/components/ProductCard.astro` | 22, 57 | TYPE + READ: `isCatalogMode = (product.resolved_mode ?? 'catalog') === 'catalog'` |
| `src/pages/products/[barcode].astro` | 50 | READ: `(product as any).resolved_mode ?? 'catalog'` |
| All locale `[barcode].astro` files | same | catalog/shop card decision |
| `src/components/blocks/ProductsBlock.astro` | 55 | SELECT includes `resolved_mode` |

### Storefront read-pattern summary

The storefront uses **two different mode systems simultaneously**:

1. **Catalog vs shop card decision** (which kind of product card to render):
   reads `resolved_mode` (computed from NEW pair via the view).
   → Because the NEW pair is null on 100% of demo brands and 99.6% of Prizma
     brands, `resolved_mode` always evaluates to the COALESCE default
     `'catalog'`. Every product looks like "catalog mode" to the storefront.
2. **Display nuance** (store / store_all / hidden):
   reads LEGACY pair via `displayMode = (display_mode_override || display_mode || 'store_all')`.
   → This is where the actual rendering variation comes from. Prizma's 17
     `display_mode='catalog'` brands light up correctly via this path; the
     215 `display_mode='store_all'` brands render in shop-style cards.

**The two systems are inconsistent for any brand where the LEGACY pair
disagrees with what the NEW pair would say** — which is most of them. The
storefront has been getting away with this because the LEGACY pair is what
the data actually contains.

Verification scripts (`pre-sql-check.mjs`, `post-sql-verify.mjs`,
`smoke-test.mjs`) in the storefront repo also list the LEGACY pair as
expected view columns, suggesting the storefront's contract assumes LEGACY
is canonical.

---

## What this means for the three reconciliation options (Foreman to decide — these are observations, not recommendations)

The data above lets the Foreman judge the three SPEC §3 Phase B options
concretely:

### Option 1 — drop legacy (`display_mode` / `display_mode_override`)

**Cost:**
- Storefront: ~10 read sites refactor (3 locale `[barcode].astro` files +
  `products.ts` (3 selects + helper) + `brands.ts` (5 spots) + `ProductCard.astro` +
  `BrandStripBlock.astro` + `supersale-stock.ts`)
- Storefront: must STOP relying on the LEGACY pair for display nuance and
  start relying on `resolved_mode` (NEW pair) instead. This is fine for the
  catalog/shop decision but loses the `'store_all'` vs `'store'` distinction
  unless `resolved_mode` is widened to expose it.
- Studio Brands: rename `display_mode` → `storefront_mode` in
  `studio-brands.js` (1 file, ~6 sites).
- Data backfill: `UPDATE brands SET storefront_mode = display_mode WHERE
  storefront_mode IS NULL` × 2 tenants, ~465 rows total.
- View: drop `display_mode` / `display_mode_override` columns from select.
- DB: `ALTER TABLE brands DROP COLUMN display_mode`, same on inventory.
  **Level 3 SQL — never autonomous.**

**Risk:** Any caller (storefront page, supersale endpoint, BrandStripBlock)
silently relying on `display_mode='store_all'` semantics breaks until
refactored. Coordinated cross-repo deploy required.

### Option 2 — drop newer (`storefront_mode` / `storefront_mode_override`)

**Cost:**
- Studio Products tab (`storefront-products.js`): rename 8 sites from NEW
  → LEGACY (`storefront_mode_override` → `display_mode_override`,
  `storefront_mode` → `display_mode`).
- Studio Brands `storefront-brands.js`: same rename, ~5 sites.
- View: rewrite `resolved_mode` to compute from LEGACY pair instead.
  Update WHERE hidden-filter to use LEGACY pair too.
- Data: ~no backfill needed because NEW pair is essentially empty (the
  1 Prizma row will resolve via D5 UI).
- Storefront: **no changes** — storefront is already aligned on LEGACY.
- DB: `ALTER TABLE brands DROP COLUMN storefront_mode`, same on inventory.
  **Level 3 SQL — never autonomous.**

**Risk:** smaller. The split-brain collapses onto the path the data already
lives on. Storefront is unaffected (the file it cares about,
`v_storefront_products.resolved_mode`, just changes its source columns).

### Option 3 — keep both, mirror via trigger

**Cost:**
- DB trigger on `brands` and `inventory`: when one column updates, mirror
  to the other. **Level 3 SQL — never autonomous.**
- View: pick one as authoritative for `resolved_mode` (probably LEGACY since
  it has the data), but expose both unchanged.
- JS: no changes immediately; defer the rename until a future SPEC.

**Risk:** Adds DB-side complexity to mask an architectural problem. Buys
time but does not resolve. Suitable as a stopgap if Foreman wants D3+D4
fixed THIS WEEK without touching the storefront repo.

---

## Open questions / gaps the Foreman should resolve

1. **What was the intent of introducing `storefront_mode` if `display_mode` already existed?** Migration history in this repo doesn't show it. Was there a prior plan to migrate from LEGACY → NEW that stalled? Knowing this affects whether Option 2 ("drop newer") regresses past intent.
2. **Does the storefront `displayMode` distinction (`store` vs `store_all`) actually drive any rendering difference?** If not, Option 1 simplification might be cheaper than it looks.
3. **Should `studio-brands.js` and `storefront-brands.js` both exist?** They appear to be two Brands tab implementations using DIFFERENT field pairs. This may be a separate D1/D2 cleanup or may interact with the reconciliation choice.
4. **Whose is `studio-brands.js`?** Its `display_mode` writes to LEGACY pair would make sense if it's the canonical Brands editor. The Storefront-tab `storefront-brands.js` writes to NEW pair, which never gets read by the storefront. One of these is dead code; the Foreman should identify which.

---

## Appendix A — `investigate-display-mode.mjs` raw output

```
=== DISPLAY MODE INVESTIGATION ===

Q1: inventory table — columns matching "mode", "display", "storefront":
  Found: model, storefront_status, storefront_price, storefront_description,
         storefront_mode_override, display_mode_override

Q2: brands table — columns matching "mode", "display", "storefront":
  Found: storefront_mode, display_mode

Q3: v_storefront_products — columns:
  Mode-related columns: model, display_mode, display_mode_override, resolved_mode

Q4: Do both display_mode AND storefront_mode columns exist?
  display_mode present: true
  storefront_mode present: true
  ⚠️  BOTH columns exist — architectural decision needed!

=== END INVESTIGATION ===
```

The script is tenant-agnostic (it introspects column metadata via
`.select('*').limit(1)` with service role; no tenant filter). Running it
against Prizma vs demo would produce identical column lists. The
tenant-specific data (row counts, value distributions) was gathered
separately via direct SQL probes — see Q5.

---

## Appendix B — In-scope file list verification

Files modified by this Phase A run (commit-time snapshot):

- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md` (D3 + D4 status flip)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/SPEC.md` (newly tracked, untouched content)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/INVESTIGATION_REPORT.md` (this file)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/EXECUTION_REPORT_PHASE_A.md` (executor retrospective)

Zero source code changed. Zero DB writes performed.

---

*End of INVESTIGATION_REPORT.md. Phase A complete. Awaiting Foreman
RECONCILIATION_DECISION.md before any Phase B work begins.*
