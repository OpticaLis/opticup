# Optic Up — Claude Code Project Guide

## First Action — Read This Before Anything Else

When starting a new session, read these two files immediately:
1. `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — current status, what's done, what's next
2. This file (CLAUDE.md) — rules, conventions, file structure

**Do NOT read MODULE_MAP.md at session start.** It is a reference document — open it only when you need details about a specific file, function, or dependency. Reading it upfront wastes context window.

After reading SESSION_CONTEXT.md, confirm:
> "I've read SESSION_CONTEXT.md. Current status: [one line summary]. Ready to proceed."

---

## Project
- **Name:** Optic Up — optical store management for Israeli optician chain
- **Repo:** opticalis/prizma-inventory
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co
- **Deploy:** GitHub Pages → https://opticalis.github.io/prizma-inventory/

## Stack
- Vanilla JS (no framework), Supabase JS v2, SheetJS (xlsx)
- index.html must stay in repo root (GitHub Pages requirement)
- JS files in /js/, CSS in /css/

## UI
- Hebrew RTL interface
- Dark blue + white + gray theme
- Mobile responsive

## Critical Rules
1. **Quantity changes** — ONLY through ➕➖ buttons with PIN verification. Never direct edit. Quantity updates should prefer atomic increments via Supabase RPC (`quantity = quantity + x`) over calculated values to prevent race conditions. New quantity-changing features must use this pattern.
2. **writeLog()** — must be called for every quantity/price change. It is async and non-blocking.
3. **Deletion** — always soft delete (is_deleted flag). Permanent delete requires double PIN.
4. **Barcodes** — format BBDDDDD (2-digit branch + 5-digit sequence). Do NOT change barcode logic.
5. **FIELD_MAP** — every new DB field must be added to FIELD_MAP in shared.js.
6. **index.html** — must stay in repo root. Never move it.
7. **Admin password** — 1234 (sessionStorage key: adminMode)
8. **Default employee PIN** — 1234
9. **API Abstraction** — All database interactions must pass through `shared.js` helper functions (`fetchAll`, `batchCreate`, `batchUpdate`, etc.). Modules should never call `sb.from()` directly unless for specialized joins that cannot be expressed through the helpers.
10. **Security & Sanitization** — Never use `innerHTML` with user-controlled input. Always use `escapeHtml()` or `textContent`. Note: PIN is currently verified client-side against the `employees` table — server-side RPC migration is planned. Do not attempt to refactor PIN verification unless explicitly instructed.

---

## File Structure

**Current structure (transitional — being migrated to module folders):**
```
prizma/
├── index.html                  — shell: HTML structure + nav + modals + script tags
├── css/
│   └── styles.css              — all styles
├── js/
│   ├── shared.js               — Supabase init, constants, caches, utility functions (load FIRST)
│   ├── inventory-*.js          — inventory module files
│   ├── goods-receipt.js        — goods receipt module
│   ├── audit-log.js / item-history.js / qty-modal.js
│   ├── brands.js / suppliers.js
│   ├── purchase-orders.js / po-*.js
│   ├── access-sync.js / pending-*.js
│   └── admin.js / system-log.js
├── migrations/
│   └── 009_brands_active.sql
└── serve.js                    — local dev server (Node.js, port 8080)
```

**Target structure (after folder reorganization — planned after all splits complete):**
```
prizma/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── shared.js               — global only: Supabase client, caches, utils (load FIRST)
├── modules/
│   ├── inventory/              — inventory-table, inventory-edit, inventory-reduction,
│   │                             inventory-entry, inventory-export, excel-import, access-sales
│   ├── purchasing/             — purchase-orders, po-form, po-items, po-actions, po-view-import
│   ├── receipts/               — goods-receipt, receipt-form, receipt-actions, receipt-excel
│   ├── audit/                  — audit-log, item-history, qty-modal
│   ├── brands/                 — brands, suppliers
│   ├── access-sync/            — access-sync, pending-panel, pending-resolve
│   └── admin/                  — admin, system-log
├── migrations/
└── serve.js
```

**Important:** When the folder reorganization is executed, all `<script src="...">` paths in `index.html` must be updated to match the new paths. Do not reorganize folders without updating `index.html` in the same commit.

## DB Tables (via T constant)

| Constant          | Table                    | Key columns                                                              |
|-------------------|--------------------------|--------------------------------------------------------------------------|
| `T.INV`           | inventory                | id, barcode, brand_id, supplier_id, model, size, color, quantity, status, is_deleted, website_sync, ... |
| `T.BRANDS`        | brands                   | id, name, brand_type, default_sync, active, exclude_website, min_stock_qty |
| `T.SUPPLIERS`     | suppliers                | id, name, active, supplier_number (UNIQUE, ≥ 10)                         |
| `T.EMPLOYEES`     | employees                | id, name, pin                                                            |
| `T.LOGS`          | inventory_logs           | id, action, inventory_id, details (jsonb), created_at                    |
| `T.IMAGES`        | inventory_images         | id, inventory_id, url                                                    |
| `T.RECEIPTS`      | goods_receipts           | id, type, status, supplier_id, po_id, notes, created_at                  |
| `T.RECEIPT_ITEMS` | goods_receipt_items      | id, receipt_id, inventory_id, quantity, ...                              |
| `T.PO`            | purchase_orders          | id, po_number, supplier_id, status, notes, created_at                    |
| `T.PO_ITEMS`      | purchase_order_items     | id, po_id, brand_id, model, size, color, quantity, cost_price, ...       |

---

## Modules

### js/shared.js — Infrastructure (load FIRST)

**Key globals:**
- `sb` — Supabase client (NOT `supabase`)
- `T` — table name constants (T.INV, T.BRANDS, T.SUPPLIERS, T.EMPLOYEES, T.LOGS, T.IMAGES, T.RECEIPTS, T.RECEIPT_ITEMS, T.PO, T.PO_ITEMS)
- `FIELD_MAP` / `FIELD_MAP_REV` — Hebrew↔English field name mapping
- `ENUM_MAP` / `ENUM_REV` — Hebrew↔English enum value mapping
- `suppliers`, `brands` — cached arrays for dropdowns
- `isAdmin` — admin mode flag
- `maxBarcode` — highest barcode sequence in current branch
- `branchCode` — 2-digit branch code from sessionStorage (default '00')
- `supplierCache` (name→uuid), `supplierCacheRev` (uuid→name), `supplierNumCache` (uuid→supplier_number)
- `brandCache` (name→uuid), `brandCacheRev` (uuid→name)
- `activeDropdown` — currently open searchable dropdown instance
- `slogPage`, `slogTotalPages`, `slogCurrentFilters` — system log pagination state
- `rcptRowNum`, `currentReceiptId`, `rcptEditMode`, `rcptViewOnly` — receipt state
- `window.lowStockData` — low stock alerts data

**Functions:**
- `loadLookupCaches()` — fetches suppliers (with supplier_number) + brands into caches
- `loadData()` — initial data load: caches, brands, max barcode
- `loadMaxBarcode()` — branch-scoped barcode sequence from inventory
- `enrichRow(row)` — adds brand_name + supplier_name resolved from cache onto raw DB row
- `enToHe(field, val)` / `heToEn(field, val)` — enum translation helpers
- `fetchAll(table, filters, select, order)` — paginated Supabase query
- `batchCreate(table, rows)` / `batchUpdate(table, rows)` — bulk CRUD
- `writeLog(action, inventoryId, details)` — audit logging engine
- `showLoading(msg)` / `hideLoading()` — loading overlay
- `$(id)` — document.getElementById shorthand
- `toast(msg, type)` — toast notifications ('s' success, 'e' error, 'w' warning)
- `setAlert(containerId, msg, type)` — inline alert
- `confirmDialog(msg)` — async confirm modal (returns Promise<boolean>)
- `showTab(tabId)` / `showEntryMode(mode)` — tab/mode navigation
- `populateDropdowns()` — rebuild brand/supplier dropdowns across all tabs
- `activeBrands()` — returns active brands filtered list
- `supplierOpts()` — returns supplier options for dropdowns
- `createSearchSelect(config)` — reusable searchable dropdown component (fixed-position)
- `loadLowStockAlerts()` / `refreshLowStockBanner()` / `openLowStockModal()` — low stock alerts

### js/inventory-core.js — Inventory Reduction + Main Table

**Key globals:**
- `redExcelData`, `redExcelFileName` — Excel reduction upload state
- `redSearchResults` — manual search results
- `REDUCE_REASONS` — ['נמכר', 'נשבר', 'לא נמצא', 'נשלח לזיכוי', 'הועבר לסניף אחר']
- `reduceModalState` — current reduction modal context
- `invData`, `invFiltered` — full + filtered inventory rows
- `invChanges` — pending inline edits (keyed by row id)
- `invSelected` — Set of selected row IDs for bulk ops
- `invSortField`, `invSortDir` — current sort state (0=none, 1=asc, -1=desc)

**Functions — Reduction (Excel):**
- `handleRedExcel(input)` — reads uploaded xlsx file
- `processRedExcel()` — loops rows by barcode, reduces qty for sync=מלא items

**Functions — Reduction (Manual):**
- `loadModelsForBrand(brandName)` — populates model datalist for selected brand
- `loadSizesAndColors(brandName, model)` — populates size/color datalists
- `searchManual()` — search by barcode or brand+model+size+color (filters is_deleted=false)
- `openReductionModal(recId)` — opens PIN-verified reduction modal with reason select
- `confirmReduction()` — validates amount/reason/PIN, updates DB, writes log

**Functions — Inventory Table:**
- `loadInventoryTab()` — fetches all inventory with brand/supplier joins
- `filterInventoryTable()` — applies search + filter dropdowns
- `renderInventoryRows()` — renders table with inline editing, selection, sorting
- `sortInventory(field)` — toggle column sort
- `invEdit(id, field, value)` / `invEditSync(id, value)` — inline cell editing
- `saveInventoryChanges()` — saves pending changes with writeLog for price/detail edits
- `showImagePreview(urls)` — image preview modal

**Functions — Bulk Operations:**
- `toggleRowSelect(id, checked)` — toggle row selection
- `applyBulkUpdate()` — bulk update selected rows (sync, status, etc.)
- `bulkDelete()` — soft-delete selected rows with PIN

### js/inventory-entry.js — Entry Forms

**Key globals:**
- `entryRowNum` — incrementing row counter for card IDs
- `excelImportRows`, `excelImportFileName` — parsed Excel import state
- `excelPendingRows` — rows waiting for barcode generation
- `lastGeneratedBarcodes` — last batch of generated barcodes for export

**Functions — Manual Entry:**
- `addEntryRow()` — adds entry card with brand/supplier/model/size/color fields
- `copyEntryRow(rowId)` — duplicates a card with data
- `removeEntryRow(rowId)` — removes entry card
- `getEntryRows()` — collects all card data into array
- `validateEntryRows(rows)` — validates required fields
- `submitEntry()` — inserts inventory rows, generates barcodes, writes logs

**Functions — Barcode:**
- `generateBarcodes(rows)` — BBDDDDD format, reuses barcodes for same brand+model+size+color

**Functions — Excel Import:**
- `handleExcelImport(input)` — parses xlsx, maps columns, shows preview
- `confirmExcelImport()` — inserts parsed rows
- `showExcelResultsModal(results)` — shows import results
- `generatePendingBarcodes()` — generates barcodes for imported rows
- `exportPendingBarcodes()` — exports generated barcodes to xlsx

**Functions — Excel Export:**
- `exportBarcodesExcel(barcodes)` — exports barcode list to xlsx
- `exportInventoryExcel()` — exports current inventory to xlsx
- `openExcelFormatPopup()` / `closeExcelFormatPopup()` — sample format download popup

### js/goods-receipt.js — Goods Receipt + System Log

**Key globals:**
- `SLOG_PAGE_SIZE` — 50 rows per page
- `SLOG_ROW_CATEGORIES` — action→category mapping (entry, quantity, deletion, etc.)
- `slogActionDropdownPopulated` — flag for one-time action filter population
- `RCPT_TYPE_LABELS` — { delivery_note, invoice, tax_invoice } → Hebrew
- `RCPT_STATUS_LABELS` — { draft, confirmed, cancelled } → Hebrew
- `rcptLinkedPoId` — currently linked PO id for receipt

**Functions — System Log:**
- `loadSystemLog()` — paginated log viewer with filters
- `slogPageNav(delta)` — page navigation
- `exportSystemLog()` — export logs to xlsx
- `populateActionDropdown()` — one-time action filter population
- `getSystemLogFilters()` / `clearSystemLogFilters()` / `applySlogFilters()` — filter management

**Functions — Goods Receipt:**
- `loadReceiptTab()` — loads receipt list
- `openNewReceipt()` — starts new receipt form
- `openExistingReceipt(id)` — opens receipt for editing
- `searchReceiptBarcode()` — find inventory item by barcode for receipt
- `addReceiptItemRow(item)` — adds item row to receipt
- `getReceiptItems()` — collects receipt item data
- `saveReceiptDraft()` — saves receipt as draft
- `confirmReceipt()` — confirms receipt, updates inventory quantities
- `cancelReceipt()` — cancels receipt
- `handleReceiptExcel()` — import items from xlsx
- `exportReceiptExcel()` — export receipt to xlsx
- `backToReceiptList()` — returns to receipt list view
- `createNewInventoryFromReceiptItem()` — creates new inventory item with barcode from receipt

**Functions — PO Linkage:**
- `loadPOsForSupplier(supplierId)` — loads POs for receipt-PO linking
- `onReceiptPoSelected()` — handles PO selection, populates items
- `updatePOStatusAfterReceipt(poId)` — updates PO status after receipt confirmation

### js/audit-log.js — Soft Delete, Recycle Bin, History, Qty Modal

**Key globals:**
- `ACTION_MAP` — 19 action types with icon/label/color for log display
- `softDelTarget` — item targeted for soft deletion
- `historyCache` — cached history for current item
- `ENTRY_ACTIONS` — ['entry_manual', 'entry_excel', 'entry_po', 'entry_receipt']
- `QTY_REASONS_ADD` — ['קבלת סחורה', 'החזרה מלקוח', 'ספירת מלאי', 'תיקון טעות', 'אחר']
- `QTY_REASONS_REMOVE` — ['מכירה', 'העברה לסניף', 'פגום/אבדן', 'ספירת מלאי', 'תיקון טעות', 'אחר']
- `qtyModalState` — current qty change modal context

**Functions — Soft Delete:**
- `deleteInvRow(id)` — initiates soft delete with PIN
- `confirmSoftDelete()` — PIN-verified soft delete with reason and writeLog

**Functions — Recycle Bin:**
- `openRecycleBin()` — shows deleted items
- `restoreItem(id)` — restores soft-deleted item
- `permanentDelete(id)` — double-PIN permanent delete

**Functions — Item History:**
- `openItemHistory(id)` — timeline view of item changes
- `exportHistoryExcel()` — export history to xlsx

**Functions — Entry History:**
- `openEntryHistory()` — entry log grouped by date (accordion)
- `loadEntryHistory()` / `renderEntryHistory()` — fetch and render
- `toggleHistGroup(date)` — expand/collapse date group
- `exportDateGroupBarcodes(date)` — export barcodes for a date group

**Functions — Qty Modal:**
- `openQtyModal(id, direction)` — opens add/remove qty modal with PIN + reason
- `confirmQtyChange()` — validates, updates qty, writes log

### js/brands-suppliers.js — Brands + Suppliers Management

**Key globals:**
- `allBrandsData` — full unfiltered brand dataset
- `brandsEdited` — filtered view for current rendering
- `brandStockByBrand` — { brand_id → total_qty } for stock display
- `supplierEditMode` — flag for supplier number edit mode

**Functions — Brands:**
- `loadBrandsTab()` — parallel fetch brands + stock data, builds allBrandsData
- `renderBrandsTable()` — applies 3 filters (active/sync/type), renders with inline editing
- `setBrandActive(brandId, isActive)` — immediate DB save on active toggle
- `addBrandRow()` — adds new brand row to allBrandsData
- `saveBrands()` — saves all changes (existing updates + new inserts), reloads caches
- `saveBrandField(input)` — immediate save for min_stock_qty

**Functions — Suppliers:**
- `loadSuppliersTab()` — renders supplier list (read or edit mode)
- `toggleSupplierNumberEdit()` / `cancelSupplierNumberEdit()` — edit mode toggle
- `saveSupplierNumbers()` — validates, checks PO lock, saves via temp negative swap
- `getNextSupplierNumber()` — lowest available number ≥ 10 (gap-filling)
- `addSupplier()` — creates supplier with auto-assigned number

### js/purchase-orders.js — Purchase Orders

**Key globals:**
- `poData` — cached PO list
- `poFilters` — { status, supplier } filter state
- `currentPO` — currently open PO object
- `currentPOItems` — items array for current PO

**Functions — PO List:**
- `loadPurchaseOrdersTab()` — fetches POs with supplier join
- `renderPoList(container)` — renders PO list with summary cards + table
- `poSummaryCard(label, value, color)` — summary card HTML
- `applyPoFilters(data)` — filters by status/supplier
- `populatePoSupplierFilter()` — populates supplier filter dropdown

**Functions — PO CRUD:**
- `generatePoNumber(supplierId)` — format: PO-{supplierNum}-{4-digit-seq}
- `openNewPurchaseOrder()` — two-step wizard: supplier → items
- `proceedToPOItems()` — step 2: generates PO number, opens item editor
- `openEditPO(id)` — loads PO for editing
- `renderPOForm(isEdit)` — renders PO header form
- `resolveSupplierName()` — resolves supplier UUID to name
- `initPoSupplierSelect()` — searchable supplier dropdown for PO
- `savePODraft()` — saves/updates PO as draft
- `sendPurchaseOrder(id)` — marks PO as sent
- `cancelPO(id)` — cancels PO
- `openViewPO(id)` — read-only PO view

**Functions — PO Items:**
- `ensurePOBrandDatalist()` — populates brand datalist
- `loadPOModelsForBrand(i, brandName)` — cascading model dropdown
- `loadPOColorsAndSizes(i, brandName, model)` — cascading color/size
- `renderPOItemsTable()` — renders PO item rows with inline editing
- `updatePOTotals()` — recalculates PO totals
- `addPOItemManual()` — adds empty PO item row
- `addPOItemByBarcode()` — adds PO item from existing inventory barcode
- `removePOItem(index)` — removes PO item
- `duplicatePOItem(i)` — duplicates PO item row
- `togglePOItemDetails(i)` — expand/collapse item details

**Functions — Export/Import:**
- `exportPOExcel()` — exports PO to xlsx
- `exportPOPdf()` — exports PO to PDF
- `importPOToInventory(poId)` — creates inventory items from PO
- `createPOForBrand(brandId, brandName)` — creates PO from low stock modal

### js/admin.js — Admin Mode + App Init

**Functions:**
- `toggleAdmin()` — prompts for password (1234)
- `checkAdmin()` / `activateAdmin()` — admin state management via sessionStorage
- `openHelpModal()` / `closeHelpModal()` — help modal
- DOMContentLoaded — restores admin, sets dates, calls `loadData()` then `addEntryRow()` + `refreshLowStockBanner()`

---

## All Globals (by file)

### shared.js
`sb`, `T`, `suppliers`, `brands`, `isAdmin`, `maxBarcode`, `branchCode`, `slogPage`, `slogTotalPages`, `slogCurrentFilters`, `rcptRowNum`, `currentReceiptId`, `rcptEditMode`, `rcptViewOnly`, `FIELD_MAP`, `FIELD_MAP_REV`, `ENUM_MAP`, `ENUM_REV`, `supplierCache`, `supplierCacheRev`, `supplierNumCache`, `brandCache`, `brandCacheRev`, `activeDropdown`, `window.lowStockData`

### inventory-core.js
`redExcelData`, `redExcelFileName`, `redSearchResults`, `REDUCE_REASONS`, `reduceModalState`, `invData`, `invFiltered`, `invChanges`, `invSelected`, `invSortField`, `invSortDir`

### inventory-entry.js
`entryRowNum`, `excelImportRows`, `excelImportFileName`, `excelPendingRows`, `lastGeneratedBarcodes`

### goods-receipt.js
`SLOG_PAGE_SIZE`, `SLOG_ROW_CATEGORIES`, `slogActionDropdownPopulated`, `RCPT_TYPE_LABELS`, `RCPT_STATUS_LABELS`, `rcptLinkedPoId`

### audit-log.js
`ACTION_MAP`, `softDelTarget`, `historyCache`, `ENTRY_ACTIONS`, `QTY_REASONS_ADD`, `QTY_REASONS_REMOVE`, `qtyModalState`

### brands-suppliers.js
`allBrandsData`, `brandsEdited`, `brandStockByBrand`, `supplierEditMode`

### purchase-orders.js
`poData`, `poFilters`, `currentPO`, `currentPOItems`

---

## Conventions

1. **Cascading dropdowns** — brand → model → size/color. Used in reduction search, entry forms, PO items, and receipt items. Each level queries Supabase for distinct values filtered by parent.

2. **Two-step wizard** — PO creation: step 1 selects supplier, step 2 generates PO number and opens item editor. `proceedToPOItems()` bridges the steps.

3. **Accordion pattern** — entry history groups logs by date, each group expands/collapses via `toggleHistGroup()`.

4. **Barcode-first flow** — receipts and reduction search by barcode first; manual search is fallback.

5. **Searchable dropdowns** — `createSearchSelect(config)` creates fixed-position filtered dropdown. Used for brands (entry, PO) and suppliers (PO, receipt).

6. **Immediate save vs. batch save** — checkboxes like `setBrandActive()` and `saveBrandField()` save immediately to DB. Row edits (brands table, inventory table) require explicit "Save" button.

7. **PIN verification** — all qty changes, soft delete, permanent delete, and inventory reduction require PIN entry verified against `employees` table. Currently client-side — server-side RPC migration is planned.

8. **Temp negative swap** — supplier number reassignment uses temp negative values to avoid UNIQUE constraint violations during concurrent swaps.

9. **PO number format** — `PO-{supplier_number}-{sequential 4-digit}` per supplier. Generated at step 2 of PO creation.

10. **Soft delete** — `is_deleted = true` flag. All queries must filter `is_deleted = false`. Permanent delete requires double PIN confirmation.

11. **writeLog pattern** — every data mutation calls `writeLog(action, inventoryId, details)`. Details object contains field-level changes for audit trail.

12. **Hebrew↔English maps** — `FIELD_MAP` for column names, `ENUM_MAP` for enum values. Both have reverse maps (`FIELD_MAP_REV`, `ENUM_REV`). Use `enToHe()`/`heToEn()` helpers.

13. **Brand filters** — `allBrandsData[]` global stores all brands including `currentQty`. `renderBrandsTable()` reads 4 filter dropdowns: `brand-filter-active`, `brand-filter-sync`, `brand-filter-type`, `brand-filter-low-stock`. `setBrandActive(brandId, isActive)` updates DB immediately and re-renders the table.

---

## Known Issues

1. **loadPOsForSupplier console warning** — when receipt tab loads without a supplier selected, `loadPOsForSupplier()` may log a warning about missing supplier_id. Non-blocking.

---

## File Size Rules

- **Target: max 300 lines per file.** This is the threshold at which an AI assistant can read and fully understand a file in a single context window.
- **Absolute maximum: 350 lines** — only acceptable when splitting further would break a tightly coupled logical unit (e.g. a single pipeline or wizard flow).
- **Split rule:** Only split where there is a clear logical separation. Never cut arbitrarily by line count alone.
- **One responsibility per file** — if you need "and" to describe what a file does, it should be two files.

---

## MODULE_MAP.md — Living Architecture Document

`modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` is the single source of truth for the entire codebase.

**Rules — enforced on every commit:**
- Every new **module** added → add a new top-level section in MODULE_MAP.md
- Every new **file** added → add it under its module section with a one-line description and line count
- Every new **function** added → add it to the Function Registry table
- Every new **global variable** added → add it to the Globals table
- Every new **DB table or column** added → update the Database Schema section

**MODULE_MAP.md must be updated in the same commit as the code change — never separately.**

If you add code without updating MODULE_MAP.md, the task is not complete.

For full function/file/dependency reference → see MODULE_MAP.md

---

## Documentation Files — Paths & Rules

### File locations

All documentation lives in `modules/Module 1 - Inventory Management/`:

| File | Path | Contains |
|------|------|----------|
| `ROADMAP.md` | `modules/Module 1 - Inventory Management/ROADMAP.md` | Phase map — ⬜/✅ status per phase |
| `SESSION_CONTEXT.md` | `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | Current status, last commits, what's next, open issues |
| `CHANGELOG.md` | `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` | Full history — one section per phase/goal |
| `MODULE_SPEC.md` | `modules/Module 1 - Inventory Management/docs/MODULE_SPEC.md` | Current state only — what tables/functions/logic exist NOW (no history) |
| `MODULE_MAP.md` | `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` | Full code map — every file, function, global, DB table |
| `db-schema.sql` | `modules/Module 1 - Inventory Management/docs/db-schema.sql` | Current DB schema — all tables with columns |

### Rules — enforced always

**Every commit that adds/changes code:**
- `MODULE_MAP.md` — must be updated in the same commit (new files, functions, globals)
- `db-schema.sql` — must be updated if any DB change was made (new tables, columns, RLS)

**End of every session:**
- `SESSION_CONTEXT.md` — update: what was done, commit hashes, what's next, open issues

**End of every phase:**
- `ROADMAP.md` — mark completed phase ⬜ → ✅
- `CHANGELOG.md` — add new section with all commits and changes
- `MODULE_SPEC.md` — update current state (overwrite, not append)
- `MODULE_MAP.md` — verify all new files/functions are documented
- `db-schema.sql` — verify schema is current

---

## Working Rules (AI Sessions)

1. **One file at a time** — never touch multiple files in a single task unless explicitly instructed
2. **Backup before every major change** — copy affected files to `modules/Module 1 - Inventory Management/backups/` before splitting or refactoring
3. **Stop and report after every task** — do not proceed to the next step without explicit approval
4. **No logic changes during structural work** — when splitting or reorganizing, copy code verbatim. Zero behavior changes.
5. **Verify after every change** — app must load with zero console errors after every file modification
6. **Report before executing** — for any task touching more than one function, show the plan first and wait for approval
7. **Never auto-proceed** — even if the next step seems obvious, stop and wait

---

## Commit Format
```
git add -A && git commit -m "descriptive message in English" && git push
```
