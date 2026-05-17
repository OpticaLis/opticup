# FINDINGS — M1_LENS_INVENTORY_MOCKUP_1TO1

**Generated:** 2026-05-18 evening
**Executor:** opticup-executor (Claude Code)

Findings discovered during this SPEC's execution that are NOT in the SPEC
and warrant follow-up action. Per executor SKILL.md Step 3: do NOT fix
inside this SPEC; do NOT hide; log with severity + location + suggested
next action.

---

## F-1 (MEDIUM) — Hardcoded brand/supplier names in row-6 chips violate Iron Rule 9

**Location:** `modules/lens-inventory/lens-inventory-partial.html` lines
83-95 (the row-6 brand + supplier chips).

**Description:** Brand chip labels are hardcoded as Hoya / Essilor / Zeiss
/ Shamir / Rodenstock (5 brands). Supplier chip labels are hardcoded as
לפידות / בדולח / סגם (3 suppliers). Iron Rule 9 prohibits hardcoded
business values: "tenant name, address, tax rate, logo, phone, VAT,
currency — always read from config/DB. Never a string literal in code."

These chip labels are arguably "presentation defaults" matching the
mockup, but they would render incorrectly for a second tenant with
different supplier relationships (a new tenant in country X with
suppliers A/B/C and brands different from Hoya/Essilor/etc.). Per SaaS
Rule 20 ("build every feature as if tomorrow a second optical chain
joins"), these should be data-driven.

**Suggested next action:** TECH_DEBT entry or follow-up SPEC
`M1_LENS_INVENTORY_DYNAMIC_CHIPS`:
- Query `lens_brand` filtered to `lens_design.is_active=true` for the
  tenant's active designs → render 5 most-frequent brand chips
- Query `supplier` filtered to the supplier_catalog_offering's joined
  suppliers → render 3 most-frequent supplier chips
- Chip labels rendered dynamically; no hardcoded names

Severity MEDIUM because: the screen IS functional today (the brand chip
"Hoya" maps to the brand named "Hoya" in `lens_brand`, and any tenant
without a Hoya brand sees the existing Toast fallback). But the screen
will render misleading chip labels on tenants without Hoya/Essilor/etc.

---

## F-2 (MEDIUM) — Real filter wiring for chip rows 2-5 + supplier deferred

**Location:** `modules/lens-inventory/lens-inventory-filters.js` —
`_toggleChipRow()` and `_attachSupplierChips()`.

**Description:** The cosmetic chip toggles for Row 2 (lens-type), Row 3
(material), Row 4 (index), Row 5 (stock-status), and supplier chips on
Row 6 currently provide active-state visual toggling but DO NOT filter
the underlying data. The SPEC §6 explicitly out-of-scoped this for the
1:1 rebuild (the mockup requires visual presence, not real filtering).

Today these chips give the user a misleading affordance — clicking
"מתכהה (Photochromic)" doesn't filter the grid to photochromic variants.
A user might be confused.

**Suggested next action:** Follow-up SPEC
`M1_LENS_INVENTORY_FILTER_WIRING` that adds:
- Multi-select state per chip row (chips become AND-combined filters)
- Designs filtered by `lens_design.lens_type` matching active Row 2 chips
- Variants filtered by `lens_variant.tint` / `coating` matching Row 3
- Variants filtered by `lens_variant.refractive_index` matching Row 4
- Grid cells filtered/highlighted by stock-status classification matching
  Row 5
- Designs filtered by `supplier_catalog_offering.supplier_id` matching
  active supplier chips

Severity MEDIUM because: a user could reasonably believe the chips
filter and waste time wondering why no results appear. A tooltip
"בקרוב" or a visual disabled-state would mitigate until the wiring lands.

---

## F-3 (LOW) — Sample data in modals is static HTML, not real DB queries

**Location:** `modules/lens-inventory/lens-inventory-partial.html` —
the Reports modal (5 sample missing-stock rows), Scan modal (5 sample
scanned items), Wizard modal (sample variant pill + "65 שורות" preview).

**Description:** Per Brief §4 the modal sample data is allowed to be
static. The Reports modal opens with the mockup's sample 5 missing-stock
rows for any variant regardless of actual stock status. Scan modal shows
the same 5 sample barcodes regardless of what's been scanned. Wizard
shows "65 שורות מלאי + יעדים" regardless of the actual SPH/CYL range
inputs.

**Suggested next action:** 3 follow-up SPECs OR one combined SPEC
`M1_LENS_INVENTORY_MODAL_WIRING`:
- Reports modal: query the 5 sub-tab data sets (חסרים / מתחת ליעד /
  עודף / כל המלאי / לפי סינון נוכחי) from `tenant_lens_stock` +
  `tenant_lens_stock_target` joins; render rows dynamically.
- Scan modal: wire the scan input to barcode resolution + the scanned-
  items table to a session-scoped accumulator; on submit, call the
  appropriate stock-movement RPC.
- Wizard modal: compute preview row-count from SPH/CYL range inputs;
  on submit, batch-create `tenant_lens_stock` + `tenant_lens_stock_target`
  + initial `stock_lot` rows.

Severity LOW because: the modals visibly open with correct mockup
content (the Brief §8 acceptance bar). The user understands these are
sample/preview surfaces until real wiring lands.

---

## F-4 (LOW) — `inventory-shell-lens.js` line-count creep

**Location:** `modules/inventory/inventory-shell-lens.js` (now 344
lines after my +1 to register the new modal-shows.js).

**Description:** The `file-size` pre-commit hook now flags this file
with a warning. The file is the registry of every lens-tab module
(inventory, designs, pricing, PO, GR, pos-list, catalog-admin) plus
common shell logic — natural growth. Adding 1 line for the new
`lens-inventory-modal-shows.js` script bumped it above the 300-line
soft target.

**Suggested next action:** TECH_DEBT entry — split this file's
per-tab registry into a `lens-tab-registry.js` data file +
the shell logic in the current file. Extraction is mechanical (the
script-list arrays are pure data). Not urgent; the file is still
under the 350-line hard max.

Severity LOW because: hook warning only, no hard failure. The file
remains functional.

---

## F-5 (MEDIUM) — `tenant_lens_stock_target` table may not exist on demo tenant

**Location:** `modules/lens-inventory/lens-inventory-filters.js`
`loadStockForVariant()` — the `fetchAll('tenant_lens_stock_target', ...)`
call wrapped in try/catch.

**Description:** The grid's 6-state classification depends on per-cell
target data from `tenant_lens_stock_target`. My grid renderer
gracefully falls back to 2-state when the query returns empty (or the
table doesn't exist), but the user sees a mostly-white grid that
doesn't showcase the 6-state CSS the mockup demonstrates. The fact that
during execution `(window.LensInv.targets || []).length === 0` for every
variant I tried on demo suggests either (a) the table is empty on demo,
(b) the table doesn't exist at all on demo, or (c) my `fetchAll` call
silently catches an error and continues.

**Suggested next action:**
- Confirm via Supabase MCP: `list_tables({schemas: ['public']})` →
  is `tenant_lens_stock_target` present?
- If yes but empty on demo: dedicated SPEC
  `M1_LENS_SEED_TARGET_DATA_DEMO` to seed ~10 sample targets per
  variant so the 6-state grid renders with varied colors for QA + demo
  walkthroughs.
- If no: dedicated SPEC `M1_LENS_TARGETS_SCHEMA` to create the table
  with `tenant_id + variant_id + sph + cyl + target_qty + is_deleted`
  + RLS policies + FK to `lens_variant`. Then seed.

Severity MEDIUM because: the grid is functional today (renders + click
works), but the mockup's promise of 6-color stock-status visualization
is not realized against real demo data.

---

## F-6 (INFO) — Side-panel ➕➖ regression caught by Tier C self-review

**Location:** Was in `lens-inventory-modal-shows.js` between commits
`b0659ae` (A3) and `5a18753` (A3 follow-up).

**Description:** Caught during Tier C visual diff — the mockup moves
the ➕➖ controls from inline grid cells to the side panel, but A3
shipped without `addEventListener` wiring for the side-panel buttons.
The HTML had `data-qty-action="plus|minus"` but no JS reference. Result:
silent breakage of the existing PIN-gated `record_adjustment_lost` flow
(SPEC §2 success criterion 3). Fixed in commit `5a18753` by adding
`_attachSidePanelQtyControls()`.

This is an INFO entry (not a bug to fix — already fixed) because the
fix is in the SPEC's own commit history. Logging it here so the
Foreman + future SPECs see the pattern: when a SPEC moves an interactive
element to a new DOM location, audit handler coverage at BOTH old and
new locations before commit.

**Suggested next action:** Apply EXECUTION_REPORT §9 Proposal P-EXEC-1
(handler-move audit). No additional SPEC needed.

Severity INFO because: already fixed, retroactive documentation.

---

## F-7 (INFO) — Mis-named screenshot file `03_after_A3_scan_out.png`

**Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_MOCKUP_1TO1/screenshots/03_after_A3_scan_out.png`

**Description:** File is named `_scan_out` but its content is the Scan
IN modal (green header). The actual Scan OUT modal (red header) is in
the next file `04_after_A3_scan_out_red.png`. Operator error — the file
was named based on the button I intended to click before I realized
the snapshot uids were ordered IN-then-OUT.

**Suggested next action:** Rename in a follow-up housekeeping commit
(out of scope here per "one concern per task"). Not worth a SPEC; can
be folded into any next M1 SPEC's first commit or done as part of the
Foreman review's tidy-up.

Severity INFO because: cosmetic, doesn't affect verification logic.

---

*FINDINGS closed. 7 entries logged (2 INFO, 2 LOW, 3 MEDIUM, 0 HIGH, 0 CRITICAL).*
