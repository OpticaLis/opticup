# MODULE_MAP — Optic Up Complete Codebase Reference

> Generated 2026-03-10. Single reference document for any developer or AI assistant.

---

## 1. File Index

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | shared.js | js/shared.js | 185 | Supabase client init, table constants (T), FIELD_MAP/ENUM_MAP, Hebrew↔English translation, UI helpers ($, toast, setAlert, confirmDialog, showLoading), tab navigation (showTab, showEntryMode), escapeHtml, global variable declarations |
| 2 | supabase-ops.js | js/supabase-ops.js | 160 | Database abstraction layer: loadLookupCaches, enrichRow, fetchAll (paginated), batchCreate (with duplicate barcode detection), batchUpdate (grouped upsert), writeLog |
| 3 | data-loading.js | js/data-loading.js | 167 | App initialization: loadData, loadMaxBarcode, populateDropdowns, low stock alerts (loadLowStockAlerts, refreshLowStockBanner, openLowStockModal), helper functions (activeBrands, supplierOpts, getBrandType, getBrandSync) |
| 4 | search-select.js | js/search-select.js | 136 | Reusable searchable dropdown component: createSearchSelect, closeAllDropdowns, repositionDropdown, MutationObserver cleanup |
| 5 | inventory-table.js | modules/inventory/inventory-table.js | 275 | Main inventory table: server-side paginated loading, filtering (search/supplier/type/qty), sorting, rendering with inline edit cells, event delegation for row actions |
| 6 | inventory-edit.js | modules/inventory/inventory-edit.js | 344 | Inline editing (invEdit, invEditSync), row selection (toggle/selectAll/clear), bulk update, bulk delete with PIN, image preview, saveInventoryChanges with writeLog |
| 7 | inventory-reduction.js | modules/inventory/inventory-reduction.js | 296 | Stock reduction: Excel-based reduction (handleRedExcel, processRedExcel), manual search with cascading dropdowns, reduction modal with PIN+reason, Access sales file detection |
| 8 | inventory-entry.js | modules/inventory/inventory-entry.js | 289 | Manual entry forms: addEntryRow (card-based), copyEntryRow, removeEntryRow, getEntryRows, validateEntryRows, submitEntry with barcode retry |
| 9 | inventory-export.js | modules/inventory/inventory-export.js | 209 | Barcode generation (BBDDDDD format with reuse), barcode export to xlsx, full inventory export with styled Excel |
| 10 | excel-import.js | modules/inventory/excel-import.js | 335 | Excel import: handleExcelImport (column mapping), confirmExcelImport (two-phase: match existing + queue pending), generatePendingBarcodes, exportPendingBarcodes |
| 11 | access-sales.js | modules/inventory/access-sales.js | 243 | Access POS sales file processing: parses sales_template sheet, duplicate file check via sync_log, qty adjustments for sales/returns, unmatched items to pending_sales |
| 12 | purchase-orders.js | modules/purchasing/purchase-orders.js | 178 | PO list: loadPurchaseOrdersTab, renderPoList with summary cards, applyPoFilters, generatePoNumber (PO-{supplierNum}-{seq}) |
| 13 | po-form.js | modules/purchasing/po-form.js | 231 | PO creation wizard: openNewPurchaseOrder (step 1), proceedToPOItems (step 2 bridge), openEditPO, renderPOForm, resolveSupplierName |
| 14 | po-items.js | modules/purchasing/po-items.js | 236 | PO item management: renderPOItemsTable, cascading brand→model→color/size datalists, addPOItemManual, addPOItemByBarcode, removePOItem, duplicatePOItem, updatePOTotals |
| 15 | po-actions.js | modules/purchasing/po-actions.js | 235 | PO lifecycle actions: savePODraft (with duplicate row detection), sendPurchaseOrder, cancelPO, exportPOExcel, exportPOPdf |
| 16 | po-view-import.js | modules/purchasing/po-view-import.js | 319 | Read-only PO view with received qty tracking, importPOToInventory (creates/updates inventory from PO items), createPOForBrand (from low stock modal), PO event delegation |
| 17 | goods-receipt.js | modules/goods-receipts/goods-receipt.js | 275 | Receipt list: loadReceiptTab, loadPOsForSupplier, onReceiptPoSelected (populates items from PO), updatePOStatusAfterReceipt, openNewReceipt |
| 18 | receipt-form.js | modules/goods-receipts/receipt-form.js | 217 | Receipt form: openExistingReceipt, toggleReceiptFormInputs, searchReceiptBarcode, addReceiptItemRow, getReceiptItems, updateReceiptItemsStats |
| 19 | receipt-actions.js | modules/goods-receipts/receipt-actions.js | 325 | Receipt lifecycle: saveReceiptDraft, confirmReceipt, confirmReceiptCore, confirmReceiptById (from list), cancelReceipt, createNewInventoryFromReceiptItem, backToReceiptList |
| 20 | receipt-excel.js | modules/goods-receipts/receipt-excel.js | 195 | Receipt Excel: handleReceiptExcel (import items), exportReceiptExcel, exportReceiptToAccess, receipt list event delegation |
| 21 | audit-log.js | modules/audit/audit-log.js | 215 | Soft delete flow (deleteInvRow, confirmSoftDelete), recycle bin (openRecycleBin, restoreItem, permanentDelete with double PIN) |
| 22 | item-history.js | modules/audit/item-history.js | 323 | Item timeline (openItemHistory), ACTION_MAP constant (21 action types), entry history accordion (openEntryHistory, loadEntryHistory, renderEntryHistory), exports |
| 23 | qty-modal.js | modules/audit/qty-modal.js | 98 | Quantity change modal: openQtyModal (add/remove with reason+PIN), confirmQtyChange |
| 24 | brands.js | modules/brands/brands.js | 197 | Brand management: loadBrandsTab, renderBrandsTable (4 filters), setBrandActive (immediate save), addBrandRow, saveBrands, saveBrandField |
| 25 | suppliers.js | modules/brands/suppliers.js | 167 | Supplier management: loadSuppliersTab, supplier number editing with temp-negative-swap, addSupplier with auto-number, getNextSupplierNumber (gap-filling) |
| 26 | access-sync.js | modules/access-sync/access-sync.js | 177 | Access sync tab: renderAccessSyncTab, heartbeat monitoring (60s interval), loadSyncLog (paginated), loadPendingBadge |
| 27 | pending-panel.js | modules/access-sync/pending-panel.js | 233 | Pending sales panel: renderPendingPanel, pendingCardHtml, loadSuggestions (barcode matching), free-text search with debounce, event delegation |
| 28 | pending-resolve.js | modules/access-sync/pending-resolve.js | 164 | Pending resolution: ignorePending, resolvePending (PIN-verified), confirmResolvePending (optimistic locking on status), updatePendingPanelCount |
| 29 | admin.js | modules/admin/admin.js | 63 | Admin mode toggle (password 1234), DOMContentLoaded handler (app init: loadData → addEntryRow → refreshLowStockBanner), help modal |
| 30 | system-log.js | modules/admin/system-log.js | 217 | System log viewer: loadSystemLog (6 filters, pagination, 4 summary stats), exportSystemLog (up to 10k rows), action dropdown from ACTION_MAP |

**Total: 30 files, ~6,158 lines**

---

## 2. Function Registry

### js/shared.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `heToEn` | `(cat, val)` | Translates Hebrew enum value to English via ENUM_MAP |
| `enToHe` | `(cat, val)` | Translates English enum value to Hebrew via ENUM_REV |
| `enumCatForCol` | `(tableName, enCol)` | Determines enum category for a column (context-dependent for status) |
| `escapeHtml` | `(str)` | Escapes &, <, >, ", ' for safe HTML. Returns '' for null/undefined |
| `showLoading` | `(t?)` | Shows loading overlay with optional message (default: 'טוען...') |
| `hideLoading` | `()` | Hides loading overlay |
| `$` | `(id)` | Shorthand for document.getElementById |
| `toast` | `(msg, type?)` | Toast notification. Types: 's' success, 'e' error, 'w' warning. Auto-removes 4500ms |
| `setAlert` | `(id, html, type)` | Sets inline alert in container element |
| `clearAlert` | `(id)` | Clears inline alert |
| `closeModal` | `(id)` | Hides modal by setting display:none |
| `confirmDialog` | `(title, text)` | Async confirm modal. Returns Promise\<boolean\> |
| `showTab` | `(name)` | Main navigation: deactivates all tabs, activates target, calls appropriate loader |
| `showEntryMode` | `(mode)` | Switches between manual/excel/receipt entry sub-modes |

### js/supabase-ops.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadLookupCaches` | `()` | Async. Fetches suppliers+brands, rebuilds all 6 lookup caches (supplierCache, supplierCacheRev, supplierNumCache, brandCache, brandCacheRev) |
| `enrichRow` | `(row)` | Adds brand_name and supplier_name from caches. Returns new object |
| `fetchAll` | `(tableName, filters?)` | Async. Paginated query (1000/page). Auto-joins inventory_images for inventory table. Supports eq/in/ilike/neq/gt/gte/lt filters. Returns enriched rows |
| `batchCreate` | `(tableName, records)` | Async. Inserts in batches of 100. Detects duplicate barcodes (within batch + existing DB). Returns enriched rows |
| `batchUpdate` | `(tableName, records)` | Async. Groups by column set, upserts each group. Handles duplicate barcode constraint errors. Returns enriched rows |
| `writeLog` | `(action, inventoryId?, details?)` | Async. Inserts into inventory_logs. Reads prizma_user and prizma_branch from sessionStorage. Supports 20+ detail fields |

### js/data-loading.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadLowStockAlerts` | `()` | Async. Tries RPC get_low_stock_brands, falls back to manual query. Returns array of {id, name, brand_type, min_stock_qty, current_qty, shortage} |
| `refreshLowStockBanner` | `()` | Async. Updates window.lowStockData and shows/hides the low-stock banner |
| `openLowStockModal` | `()` | Creates modal with low-stock brands table and "Create PO" buttons |
| `closeLowStockModal` | `()` | Removes the low-stock modal from DOM |
| `loadData` | `()` | Async. Main init: loadLookupCaches → build suppliers array → fetch brands → build brandSyncCache → loadMaxBarcode → populateDropdowns |
| `loadMaxBarcode` | `()` | Async. Finds highest barcode sequence for current branch. Updates maxBarcode global |
| `populateDropdowns` | `()` | Rebuilds reduction brand dropdown and receipt supplier dropdown |
| `activeBrands` | `()` | Returns brands filtered to active only |
| `supplierOpts` | `()` | Returns HTML options string for supplier dropdowns |
| `productTypeOpts` | `()` | Returns static HTML options for product type (ראייה/שמש) |
| `syncOpts` | `()` | Returns static HTML options for sync (מלא/תדמית/לא) |
| `getBrandType` | `(name)` | Finds brand by name, returns its type |
| `getBrandSync` | `(name)` | Finds brand by name, returns its defaultSync |

### js/search-select.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `closeAllDropdowns` | `()` | Removes 'open' class from all .ss-dropdown elements, sets activeDropdown=null |
| `repositionDropdown` | `()` | Recalculates activeDropdown position from input getBoundingClientRect |
| `createSearchSelect` | `(items, value?, onChange?)` | Creates searchable dropdown component. Returns wrapper div with _dropdown, _hidden, _input properties. Dropdown appended to document.body for fixed positioning. MutationObserver auto-cleanup |

### modules/inventory/inventory-table.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadInventoryPage` | `()` | Async. Server-side paginated Supabase query with filters, sorting, joins. Fetches with count:'exact' |
| `updatePaginationUI` | `()` | Updates page info text, prev/next buttons, shown range |
| `invPageNav` | `(delta)` | Navigates pages by delta, clamped to bounds |
| `loadInventoryTab` | `()` | Async. Resets to page 0, clears selection, loads first page |
| `filterInventoryTable` | `()` | Debounced (300ms) filter change handler, resets to page 0 |
| `renderInventoryRows` | `(recs)` | Renders table body HTML with inline edit cells, qty buttons, image thumbs, delete buttons |
| `sortInventory` | `(th)` | Toggles column sort (none→asc→desc→none), resets to page 0 |

### modules/inventory/inventory-edit.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `toggleRowSelect` | `(id, checked)` | Adds/removes ID from invSelected, toggles row CSS class |
| `toggleSelectAll` | `(checked)` | Selects/deselects all rows in invData |
| `clearSelection` | `()` | Clears invSelected, unchecks all, removes CSS classes |
| `updateSelectionUI` | `()` | Updates selection count badge, shows/hides bulk operations bar |
| `applyBulkUpdate` | `()` | Async. Reads bulk fields, validates sync requirements, batch-updates selected rows |
| `bulkDelete` | `()` | Async. Initiates bulk soft-delete with confirm dialog and PIN modal |
| `confirmBulkDelete` | `()` | Async. Verifies PIN, soft-deletes all bulkDelIds, writes logs |
| `invEdit` | `(td, field, type)` | Creates inline input editor for table cell. Saves to invChanges on blur/Enter |
| `invEditSync` | `(td)` | Creates inline select for website_sync cell with validation |
| `showImagePreview` | `(recId)` | Shows image modal for inventory record |
| `saveInventoryChanges` | `()` | Async. Saves pending invChanges via batchUpdate. Logs price and detail changes separately |

### modules/inventory/inventory-reduction.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `showSampleReport` | `()` | Shows sample report modal |
| `handleRedExcel` | `(ev)` | Reads uploaded Excel. Detects Access sales template → delegates to processAccessSalesFile |
| `processRedExcel` | `()` | Async. Processes reduction Excel rows: barcode lookup, brand/model validation, qty reduction for sync=full items |
| `loadModelsForBrand` | `(brandName)` | Async. Cascading dropdown: populates model datalist for brand |
| `clearSizeColorLists` | `()` | Clears size/color datalists and inputs |
| `loadSizesAndColors` | `()` | Async. Cascading dropdown: populates size+color datalists for brand+model |
| `searchManual` | `()` | Async. Searches by barcode or brand+model+size+color, renders result cards |
| `openReductionModal` | `(recId)` | Opens reduction modal with item info, amount, reason, PIN fields |
| `confirmReduction` | `()` | Async. Validates amount/reason/PIN, updates qty, maps reason→action type, writes log |

### modules/inventory/inventory-entry.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `addEntryRow` | `(copyFrom?)` | Creates entry card with all fields. Auto-fills from previous card or copyFrom element |
| `copyEntryRow` | `(btn)` | Copies source card via addEntryRow, clears size/bridge/barcode |
| `removeEntryRow` | `(btn)` | Removes card, cleans up dropdown, renumbers. Adds fresh row if none remain |
| `renumberRows` | `(container)` | Updates visual row numbers to match DOM order |
| `getEntryRows` | `()` | Collects all card data into array of objects |
| `validateEntryRows` | `()` | Validates required fields, image requirements for luxury/brand types. Returns error array |
| `submitEntry` | `()` | Async. Validates, confirms, batch-creates records. Retry loop (3x) for barcode collisions |

### modules/inventory/inventory-export.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `generateBarcodes` | `(source)` | Async. Generates BBDDDDD barcodes for entry rows. Reuses barcode if same brand+model+size+color exists with qty>0 |
| `exportBarcodesExcel` | `(source)` | Exports entry row barcodes to xlsx |
| `exportInventoryExcel` | `()` | Async. Exports full filtered inventory to styled xlsx (bold header, number formatting, RTL) |
| `openExcelFormatPopup` | `()` | Shows Excel format sample modal |
| `closeExcelFormatPopup` | `()` | Hides Excel format sample modal |

### modules/inventory/excel-import.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `resetExcelImport` | `()` | Resets import state, clears file input and preview |
| `handleExcelImport` | `(ev)` | Reads xlsx, maps columns via Hebrew/English aliases, validates, shows preview |
| `buildExcelRecordFields` | `(r, barcode)` | Builds Supabase-ready record from import row with enum translation |
| `confirmExcelImport` | `()` | Async. Two-phase: matches existing barcodes (increments qty) + queues pending items |
| `showExcelResultsModal` | `(inserted, pending, insertedCount)` | Shows modal with success/pending sections |
| `generatePendingBarcodes` | `()` | Async. Generates sequential barcodes for pending rows, batch-creates inventory |
| `exportPendingBarcodes` | `()` | Exports generated barcodes to xlsx |

### modules/inventory/access-sales.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `processAccessSalesFile` | `(workbook, filename)` | Async. Processes Access POS sales file: validates rows, checks duplicate file via sync_log, adjusts qty for sales/returns, unmatched→pending_sales |

### modules/purchasing/purchase-orders.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadPurchaseOrdersTab` | `()` | Async. Fetches POs with supplier join, renders list |
| `renderPoList` | `(container)` | Renders PO list with summary cards (draft/sent/partial/month counts), filters, table |
| `poSummaryCard` | `(label, value, color)` | Returns HTML for summary stat card |
| `applyPoFilters` | `(data)` | Filters PO array by status and supplier |
| `populatePoSupplierFilter` | `()` | Async. Populates supplier filter dropdown |
| `generatePoNumber` | `(supplierId)` | Async. Generates PO-{supplierNum}-{4-digit-seq} format |

### modules/purchasing/po-form.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openNewPurchaseOrder` | `()` | Async. Step 1 wizard: supplier select, dates, notes |
| `proceedToPOItems` | `()` | Async. Step 2 bridge: generates PO number, builds currentPO, calls renderPOForm |
| `openEditPO` | `(id)` | Async. Loads existing draft PO + items from DB, calls renderPOForm(true) |
| `renderPOForm` | `(isEdit)` | Renders PO editing form with header, items table, action buttons |
| `resolveSupplierName` | `()` | Async. Resolves supplier UUID to name for display |

### modules/purchasing/po-items.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `ensurePOBrandDatalist` | `()` | Creates #po-brand-list datalist from brandCache if not exists |
| `loadPOModelsForBrand` | `(i, brandName)` | Async. Cascading: queries distinct models for brand, updates datalist |
| `loadPOColorsAndSizes` | `(i, brandName, model)` | Async. Cascading: queries distinct colors+sizes, warns if stock exists |
| `renderPOItemsTable` | `()` | Renders PO items table body+footer with inline inputs and expandable detail rows |
| `updatePOTotals` | `()` | Recalculates per-row and grand totals (qty * cost * (1 - discount/100)) |
| `addPOItemManual` | `()` | Pushes empty item to currentPOItems, re-renders |
| `addPOItemByBarcode` | `()` | Async. Looks up barcode in inventory, pushes pre-populated item |
| `removePOItem` | `(index)` | Removes item by index, re-renders |
| `duplicatePOItem` | `(i)` | Duplicates item (clears size), checks for duplicate key conflicts |
| `togglePOItemDetails` | `(i)` | Toggles expanded detail row visibility |

### modules/purchasing/po-actions.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `exportPOExcel` | `()` | Async. Exports PO to xlsx with header metadata, items, totals |
| `exportPOPdf` | `()` | Async. Generates HTML and opens print window for PDF export |
| `savePODraft` | `()` | Async. Validates items, detects duplicate rows, inserts or updates PO + items |
| `sendPurchaseOrder` | `(id)` | Async. Marks draft PO as 'sent' with confirm dialog and writeLog |
| `cancelPO` | `(id)` | Async. Sets PO status to 'cancelled' with confirm dialog |

### modules/purchasing/po-view-import.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openViewPO` | `(id)` | Async. Read-only PO view with ordered vs received qty, color-coded rows |
| `importPOToInventory` | `(poId)` | Async. Creates/updates inventory from PO items, generates barcodes for new items |
| `createPOForBrand` | `(brandId, brandName)` | Async. Creates PO pre-populated with brand items from low-stock modal |

### modules/goods-receipts/goods-receipt.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadPOsForSupplier` | `(supplierName)` | Async. Populates PO dropdown with sent/partial POs for supplier |
| `onReceiptPoSelected` | `()` | Async. Loads PO items, populates receipt item rows for items with remaining qty |
| `updatePOStatusAfterReceipt` | `(poId)` | Async. Recalculates PO qty_received per item, updates PO status (received/partial/sent) |
| `loadReceiptTab` | `()` | Async. Shows receipt list with stats (draft count, confirmed this week, items received) |
| `openNewReceipt` | `()` | Initializes new receipt form, populates supplier dropdown, resets all state |

### modules/goods-receipts/receipt-form.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openExistingReceipt` | `(receiptId, viewOnly)` | Async. Loads receipt+items from DB, populates form, restores PO linkage |
| `toggleReceiptFormInputs` | `(disabled)` | Enables/disables all form inputs and action bars |
| `searchReceiptBarcode` | `()` | Async. Searches by barcode, adds as existing or new item row |
| `addReceiptItemRow` | `(data)` | Adds <tr> to receipt items table. Different rendering for new vs existing items |
| `getReceiptItems` | `()` | Collects all receipt item data from DOM. Throws if qty < 1 |
| `updateReceiptItemsStats` | `()` | Calculates and displays item/unit/new/existing counts |

### modules/goods-receipts/receipt-actions.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `saveReceiptDraft` | `()` | Async. Validates fields, creates or updates receipt + items |
| `confirmReceiptCore` | `(receiptId, rcptNumber, poId)` | Async. Core confirmation: updates inventory quantities, creates new items, updates PO status |
| `confirmReceipt` | `()` | Async. UI-facing: validates, saves draft internally, then calls confirmReceiptCore |
| `createNewInventoryFromReceiptItem` | `(item, receiptId, rcptNumber)` | Async. Creates inventory row with generated barcode from receipt item |
| `saveReceiptDraftInternal` | `()` | Async. Internal save without UI feedback, used before confirmReceipt |
| `confirmReceiptById` | `(receiptId)` | Async. Confirms receipt from list view without opening form |
| `cancelReceipt` | `(receiptId)` | Async. Sets receipt status to 'cancelled' |
| `backToReceiptList` | `()` | Resets form state, calls loadReceiptTab |

### modules/goods-receipts/receipt-excel.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `handleReceiptExcel` | `(ev)` | Reads xlsx, maps columns, looks up barcodes, adds item rows |
| `exportReceiptExcel` | `()` | Async. Exports current receipt items to xlsx |
| `exportReceiptToAccess` | `(receiptId)` | Async. Exports confirmed receipt for Access DB import with English columns |

### modules/audit/audit-log.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `deleteInvRow` | `(recId)` | Opens soft-delete modal with reason+note+PIN fields |
| `confirmSoftDelete` | `()` | Async. Verifies PIN, sets is_deleted=true, writes log, removes row from invData |
| `openRecycleBin` | `()` | Async. Fetches deleted items, renders restore/permanent delete table |
| `restoreItem` | `(id)` | Async. Sets is_deleted=false, clears deletion metadata, writes log |
| `permanentDelete` | `(id)` | Shows confirm dialog + double-PIN modal for permanent delete |
| `confirmPermanentDelete` | `()` | Async. Verifies PIN, hard-deletes from DB, writes permanent_delete log |

### modules/audit/item-history.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openItemHistory` | `(id, barcode, brand, model)` | Async. Fetches up to 100 logs, renders color-coded timeline |
| `exportHistoryExcel` | `()` | Exports historyCache to xlsx with 13 columns |
| `openEntryHistory` | `()` | Creates entry-history modal if needed, sets default dates, shows modal |
| `closeEntryHistory` | `()` | Hides entry-history modal |
| `loadEntryHistory` | `()` | Async. Fetches entry logs within date range with inventory join |
| `renderEntryHistory` | `(logs)` | Groups by date, renders accordion with tables per group |
| `toggleHistGroup` | `(btn)` | Accordion toggle: closes others, toggles clicked group |
| `exportDateGroupBarcodes` | `(items)` | Exports group items to xlsx |

### modules/audit/qty-modal.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openQtyModal` | `(inventoryId, mode)` | Opens qty change modal (add/remove) with reason dropdown and PIN |
| `confirmQtyChange` | `()` | Async. Validates amount/reason/PIN, updates DB qty directly, writes log, updates DOM |

### modules/brands/brands.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadBrandsTab` | `()` | Async. Parallel fetch brands + stock data, builds allBrandsData, renders table |
| `renderBrandsTable` | `()` | Applies 4 filters (active/sync/type/low-stock), renders with inline editing |
| `setBrandActive` | `(brandId, isActive)` | Async. Immediate DB save on active toggle with confirmDialog |
| `addBrandRow` | `()` | Appends new brand to allBrandsData, re-renders, focuses first input |
| `saveBrands` | `()` | Async. Saves all changes (updates + inserts), reloads caches and dropdowns |
| `saveBrandField` | `(input)` | Async. Immediate save for single brand field (min_stock_qty) |

### modules/brands/suppliers.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadSuppliersTab` | `()` | Renders supplier table (view or edit mode) |
| `toggleSupplierNumberEdit` | `()` | Enables edit mode, re-renders |
| `cancelSupplierNumberEdit` | `()` | Disables edit mode, re-renders |
| `saveSupplierNumbers` | `()` | Async. Validates >=10, checks duplicates, PO lock check, temp-negative-swap, reloads caches |
| `getNextSupplierNumber` | `()` | Async. Finds lowest available number >= 10 (gap-filling) |
| `addSupplier` | `()` | Async. Creates supplier with auto-assigned number, reloads caches and dropdowns |

### modules/access-sync/access-sync.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `renderAccessSyncTab` | `()` | Renders tab HTML with heartbeat indicator, pending button, sync log table |
| `startHeartbeatRefresh` | `()` | Starts 60s heartbeat polling interval |
| `stopHeartbeatRefresh` | `()` | Clears heartbeat interval |
| `loadHeartbeat` | `()` | Async. Fetches heartbeat, updates indicator (green <10min, red >10min, gray unknown) |
| `loadSyncLog` | `(page?)` | Async. Paginated sync_log fetch with status badges |
| `loadPendingBadge` | `()` | Async. Counts pending sales, updates button style |
| `onPendingClick` | `()` | Calls renderPendingPanel |

### modules/access-sync/pending-panel.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `renderPendingPanel` | `()` | Async. Fetches pending sales, renders overlay modal with item cards |
| `closePendingPanel` | `()` | Hides pending panel overlay |
| `pendingCardHtml` | `(r)` | Returns HTML for a pending item card with action buttons |
| `loadSuggestions` | `(pendingId, barcode)` | Async. Searches inventory for exact + partial barcode matches |
| `toggleFreeSearch` | `(pendingId)` | Toggles free-text search input visibility |
| `debouncePendingSearch` | `(pendingId, query)` | Debounces 300ms, calls runPendingSearch |
| `runPendingSearch` | `(pendingId, query)` | Async. Searches inventory by barcode and model (ilike) |

### modules/access-sync/pending-resolve.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `ignorePending` | `(pendingId, barcode, sourceRef)` | Async. Marks pending as 'ignored', writes log, updates badge |
| `resolvePending` | `(pendingId, inventoryId)` | Async. Shows confirm + PIN modal for resolution |
| `confirmResolvePending` | `()` | Async. Verifies PIN, optimistic lock on status='pending', adjusts qty (sale: subtract, return: add), writes log |
| `updatePendingPanelCount` | `()` | Updates card count in panel header |

### modules/admin/admin.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `toggleAdmin` | `()` | Toggles admin mode on/off. Checks sessionStorage, shows password modal |
| `checkAdmin` | `()` | Validates password (1234), calls activateAdmin on success |
| `activateAdmin` | `()` | Sets isAdmin=true, adds admin-mode CSS class |
| `openHelpModal` | `()` | Shows help modal |
| `closeHelpModal` | `()` | Hides help modal |

### modules/admin/system-log.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `populateActionDropdown` | `()` | One-time population of action select from ACTION_MAP |
| `getSystemLogFilters` | `()` | Reads 6 filter inputs, returns filter object |
| `clearSystemLogFilters` | `()` | Clears all filters, resets page, reloads |
| `applySlogFilters` | `(query, filters)` | Applies date/branch/action/employee/search filters to Supabase query |
| `loadSystemLog` | `(filters?, page?)` | Async. Fetches summary stats + filtered paginated logs, renders table |
| `slogPageNav` | `(dir)` | Navigates system log pages |
| `exportSystemLog` | `()` | Async. Exports up to 10k filtered rows to xlsx |

---

## 3. Global Variables

### js/shared.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `sb` | SupabaseClient | `supabase.createClient(...)` | Supabase client instance |
| `T` | Object | `{ INV, PO, BRANDS, SUPPLIERS, ... }` | Table name constants (see DB Schema section) |
| `FIELD_MAP` | Object | Nested {table: {he: en}} | Hebrew→English field name mapping per table |
| `FIELD_MAP_REV` | Object | Auto-built reverse | English→Hebrew field name mapping per table |
| `ENUM_MAP` | Object | {category: {he: en}} | Hebrew→English enum value mapping |
| `ENUM_REV` | Object | Auto-built reverse | English→Hebrew enum value mapping |
| `suppliers` | Array | `[]` | Cached supplier name list (sorted), rebuilt by loadData |
| `brands` | Array | `[]` | Cached brand objects [{id, name, type, defaultSync, active}], rebuilt by loadData |
| `isAdmin` | Boolean | `false` | Admin mode flag, set by activateAdmin/toggleAdmin |
| `maxBarcode` | Number | `0` | Highest barcode sequence in current branch, updated by loadMaxBarcode |
| `branchCode` | String | `sessionStorage 'prizma_branch' \|\| '00'` | 2-digit branch code prefix for barcodes |
| `slogPage` | Number | `0` | System log current page |
| `slogTotalPages` | Number | `0` | System log total page count |
| `slogCurrentFilters` | Object | `{}` | System log active filter state |
| `rcptRowNum` | Number | `0` | Receipt item row counter |
| `currentReceiptId` | String/null | `null` | Currently open receipt UUID |
| `rcptEditMode` | Boolean | `false` | Whether receipt is in edit mode |
| `rcptViewOnly` | Boolean | `false` | Whether receipt is in view-only mode |
| `supplierCache` | Object | `{}` | name → UUID |
| `supplierCacheRev` | Object | `{}` | UUID → name |
| `supplierNumCache` | Object | `{}` | UUID → supplier_number |
| `brandCache` | Object | `{}` | name → UUID |
| `brandCacheRev` | Object | `{}` | UUID → name |

### js/data-loading.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `window.lowStockData` | Array | `[]` | Low stock brand alerts array |
| `window.brandSyncCache` | Object | `{}` | brand_name → defaultSync mapping, built in loadData |

### js/search-select.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `activeDropdown` | Object/null | `null` | Currently open searchable dropdown instance |
| `_searchSelectCleanups` | Set | `new Set()` | Cleanup functions for orphaned dropdowns |
| `window._sharedSearchObserver` | MutationObserver | observes body | Auto-cleans disconnected dropdown elements |

### modules/inventory/inventory-table.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `invData` | Array | `[]` | Current page of enriched inventory rows |
| `invFiltered` | Array | `[]` | Compatibility alias, always equals invData |
| `invChanges` | Object | `{}` | Pending inline edits keyed by row id: {id: {field: value}} |
| `invSelected` | Set | `new Set()` | Selected row IDs for bulk operations |
| `invSortField` | String | `''` | Currently sorted column (Hebrew field name) |
| `invSortDir` | Number | `0` | Sort direction: 0=none, 1=asc, -1=desc |
| `invPage` | Number | `0` | Current page index (0-based) |
| `invTotalCount` | Number | `0` | Total matching row count from Supabase |
| `invTotalPages` | Number | `0` | Total page count |
| `invCurrentFilters` | Object | `{}` | Current filter state {search, supplier, ptype, qtyFilter} |
| `invDebounceTimer` | Number/null | `null` | Filter input debounce timer ID |
| `INV_PAGE_SIZE` | Number (const) | `50` | Rows per page |

### modules/inventory/inventory-edit.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `bulkDelIds` | Array/null | `null` | IDs targeted for bulk deletion |

### modules/inventory/inventory-reduction.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `redExcelData` | Array | `[]` | Parsed rows from reduction Excel |
| `redExcelFileName` | String | `''` | Reduction Excel filename |
| `redSearchResults` | Array | `[]` | Manual reduction search results |
| `reduceModalState` | Object | `{}` | Current reduction modal context: {id, currentQty, barcode, brand, model} |
| `REDUCE_REASONS` | Array (const) | `['נמכר','נשבר','לא נמצא','נשלח לזיכוי','הועבר לסניף אחר']` | Predefined reduction reasons |

### modules/inventory/inventory-entry.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `entryRowNum` | Number | `0` | Auto-incrementing card ID counter |

### modules/inventory/excel-import.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `excelImportRows` | Array | `[]` | Validated rows ready for insertion |
| `excelImportFileName` | String | `''` | Import Excel filename (for logging) |
| `excelPendingRows` | Array | `[]` | Rows needing new barcodes |
| `lastGeneratedBarcodes` | Array | `[]` | Generated barcode data for export |

### modules/purchasing/purchase-orders.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `poData` | Array | `[]` | Cached PO list |
| `poFilters` | Object | `{status:'', supplier:''}` | PO list filter state |
| `currentPO` | Object/null | `null` | Currently open PO object |
| `currentPOItems` | Array | `[]` | Items for currently open PO |

### modules/goods-receipts/goods-receipt.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `rcptLinkedPoId` | String/null | `null` | Currently linked PO ID for receipt |
| `RCPT_TYPE_LABELS` | Object (const) | `{delivery_note, invoice, tax_invoice}→Hebrew` | Receipt type display labels |
| `RCPT_STATUS_LABELS` | Object (const) | `{draft, confirmed, cancelled}→Hebrew` | Receipt status display labels |

### modules/audit/audit-log.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `softDelTarget` | Object/null | `null` | Item targeted for soft deletion |
| `permDelTarget` | Object/null | `null` | Item targeted for permanent deletion {id, row, barcode, brand, model} |

### modules/audit/item-history.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `historyCache` | Array | `[]` | Cached log entries for current item history |
| `ACTION_MAP` | Object (const) | 21 entries | Maps action type string → {icon, label, color} |
| `ENTRY_ACTIONS` | Array (const) | `['entry_manual','entry_excel','entry_po','entry_receipt']` | Entry action types for filtering |

### modules/audit/qty-modal.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `qtyModalState` | Object | `{}` | Current qty modal context: {id, mode, currentQty, barcode, brand, model} |
| `QTY_REASONS_ADD` | Array (const) | `['קבלת סחורה','החזרה מלקוח','ספירת מלאי','תיקון טעות','אחר']` | Add qty reason options |
| `QTY_REASONS_REMOVE` | Array (const) | `['מכירה','העברה לסניף','פגום/אבדן','ספירת מלאי','תיקון טעות','אחר']` | Remove qty reason options |

### modules/brands/brands.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `allBrandsData` | Array | `[]` | Full brand dataset with computed fields |
| `brandsEdited` | Array | `[]` | Filtered/displayed brand subset |
| `brandStockByBrand` | Object | `{}` | brand_id → total inventory qty |

### modules/brands/suppliers.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `supplierEditMode` | Boolean | `false` | Whether supplier number editing is active |

### modules/access-sync/access-sync.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `syncLogPage` | Number | `0` | Sync log current page |
| `heartbeatInterval` | Number/null | `null` | Heartbeat auto-refresh interval ID |
| `SYNC_LOG_PAGE_SIZE` | Number (const) | `20` | Sync log rows per page |
| `SOURCE_LABELS` | Object (const) | `{watcher:'🤖 Watcher', manual:'👤 ידני'}` | Sync source display labels |

### modules/access-sync/pending-panel.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `pendingSearchTimers` | Object | `{}` | pendingId → setTimeout ID for debounced search |

### modules/access-sync/pending-resolve.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `resolvePendingTarget` | Object/null | `null` | {pendingId, inventoryId, row} for current resolution |

### modules/admin/system-log.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `slogActionDropdownPopulated` | Boolean | `false` | Flag for one-time action dropdown population |
| `SLOG_PAGE_SIZE` | Number (const) | `50` | System log rows per page |
| `SLOG_ROW_CATEGORIES` | Object (const) | action → CSS category | Maps action types to entry/exit/edit/delete/restore categories |

---

## 4. Dependency Graph

### Core Layer (load first)

```
shared.js
  → calls: closeAllDropdowns() [search-select.js]
  → calls: loadInventoryTab() [inventory-table.js]
  → calls: loadBrandsTab(), loadSuppliersTab() [brands.js, suppliers.js]
  → calls: loadSystemLog() [system-log.js]
  → calls: loadReceiptTab() [goods-receipt.js]
  → calls: loadPurchaseOrdersTab() [purchase-orders.js]
  → calls: renderAccessSyncTab(), loadHeartbeat(), loadSyncLog(), loadPendingBadge(), stopHeartbeatRefresh() [access-sync.js]
  → calls: resetExcelImport() [excel-import.js]

supabase-ops.js
  → reads/writes: sb, T, supplierCache, supplierCacheRev, supplierNumCache, brandCache, brandCacheRev [shared.js]
  → calls: toast() [shared.js]

data-loading.js
  → calls: loadLookupCaches() [supabase-ops.js]
  → calls: showLoading(), hideLoading(), toast(), enToHe(), escapeHtml(), $() [shared.js]
  → references: createPOForBrand() [po-view-import.js] (via onclick in low stock modal)

search-select.js
  → calls: escapeHtml() [shared.js]
```

### Inventory Module

```
inventory-table.js
  → calls: updateSelectionUI(), toggleRowSelect(), showImagePreview() [inventory-edit.js]
  → calls: openReductionModal() [inventory-reduction.js]
  → calls: openItemHistory(), openQtyModal(), deleteInvRow() [audit-log.js, item-history.js, qty-modal.js]

inventory-edit.js
  → reads/writes: invSelected, invData, invChanges [inventory-table.js]
  → calls: loadInventoryPage(), loadInventoryTab() [inventory-table.js]

inventory-reduction.js
  → calls: processAccessSalesFile() [access-sales.js]

inventory-entry.js
  → calls: generateBarcodes() [inventory-export.js]

inventory-export.js
  → calls: getEntryRows() [inventory-entry.js]
  → reads: invCurrentFilters [inventory-table.js]

excel-import.js
  → self-contained (no cross-module calls within inventory)

access-sales.js
  → calls: loadPendingBadge(), loadSyncLog() [access-sync.js] (conditional, typeof guard)
```

### Purchasing Module

```
purchase-orders.js
  → self-contained list rendering

po-form.js
  → calls: generatePoNumber(), loadPurchaseOrdersTab() [purchase-orders.js]
  → calls: renderPOItemsTable(), addPOItemByBarcode(), addPOItemManual() [po-items.js]
  → calls: exportPOExcel(), exportPOPdf(), savePODraft() [po-actions.js]

po-items.js
  → reads/writes: currentPOItems [purchase-orders.js]

po-actions.js
  → reads: currentPO, currentPOItems [purchase-orders.js]
  → calls: loadPurchaseOrdersTab() [purchase-orders.js]
  → calls: refreshLowStockBanner() [data-loading.js]

po-view-import.js
  → calls: generatePoNumber(), loadPurchaseOrdersTab() [purchase-orders.js]
  → calls: openEditPO(), renderPOForm() [po-form.js]
  → calls: togglePOItemDetails(), duplicatePOItem(), removePOItem() [po-items.js]
  → calls: sendPurchaseOrder(), cancelPO(), exportPOExcel(), exportPOPdf() [po-actions.js]
  → calls: showTab() [shared.js]
```

### Goods Receipts Module

```
goods-receipt.js
  → calls: addReceiptItemRow(), updateReceiptItemsStats(), toggleReceiptFormInputs() [receipt-form.js]

receipt-form.js
  → calls: loadPOsForSupplier() [goods-receipt.js]

receipt-actions.js
  → calls: getReceiptItems() [receipt-form.js]
  → calls: loadReceiptTab(), updatePOStatusAfterReceipt() [goods-receipt.js]
  → calls: refreshLowStockBanner() [data-loading.js]

receipt-excel.js
  → calls: addReceiptItemRow(), updateReceiptItemsStats(), getReceiptItems() [receipt-form.js]
  → calls: openExistingReceipt() [receipt-form.js]
  → calls: confirmReceiptById(), cancelReceipt() [receipt-actions.js]
```

### Audit Module

```
audit-log.js
  → reads: invData [inventory-table.js]
  → calls: filterInventoryTable() [inventory-table.js]

item-history.js
  → reads: brandCache [shared.js]
  (defines ACTION_MAP consumed by system-log.js)

qty-modal.js
  → reads/writes: invData [inventory-table.js]

system-log.js
  → reads: ACTION_MAP [item-history.js]
```

### Access Sync Module

```
access-sync.js
  → calls: renderPendingPanel() [pending-panel.js]

pending-panel.js
  → calls: ignorePending(), resolvePending() [pending-resolve.js] (via event delegation)

pending-resolve.js
  → calls: renderPendingPanel() [pending-panel.js]
  → calls: loadPendingBadge() [access-sync.js]
```

### Admin Module

```
admin.js (DOMContentLoaded)
  → calls: loadData() [data-loading.js]
  → calls: addEntryRow() [inventory-entry.js]
  → calls: refreshLowStockBanner() [data-loading.js]
```

---

## 5. Database Schema

| Table | Constant | Key Columns | Relationships |
|-------|----------|-------------|---------------|
| `inventory` | `T.INV` | id (uuid PK), barcode (unique), brand_id (FK→brands), supplier_id (FK→suppliers), model, size, bridge, color, temple_length, product_type, sell_price, sell_discount, cost_price, cost_discount, quantity, status, website_sync, origin, notes, is_deleted, deleted_at, deleted_by, deleted_reason, created_at | → brands.id, → suppliers.id, ← inventory_images.inventory_id, ← inventory_logs.inventory_id, ← goods_receipt_items.inventory_id |
| `brands` | `T.BRANDS` | id (uuid PK), name, brand_type (luxury/brand), default_sync (full/display/no), active (bool), exclude_website (bool), min_stock_qty (int) | ← inventory.brand_id, ← purchase_order_items.brand_id |
| `suppliers` | `T.SUPPLIERS` | id (uuid PK), name, active (bool), supplier_number (unique int, >= 10) | ← inventory.supplier_id, ← purchase_orders.supplier_id, ← goods_receipts.supplier_id |
| `employees` | (direct table ref) | id (uuid PK), name, pin | Used for PIN verification (client-side query) |
| `inventory_logs` | (direct table ref) | id (uuid PK), action, inventory_id (FK→inventory, nullable), details (jsonb), employee, branch, created_at | → inventory.id |
| `inventory_images` | (direct table ref) | id (uuid PK), inventory_id (FK→inventory), url | → inventory.id |
| `purchase_orders` | `T.PO` | id (uuid PK), po_number (unique, format PO-{supNum}-{seq}), supplier_id (FK→suppliers), status (draft/sent/partial/received/cancelled), notes, expected_date, created_at | → suppliers.id, ← purchase_order_items.po_id, ← goods_receipts.po_id |
| `purchase_order_items` | `T.PO_ITEMS` | id (uuid PK), po_id (FK→purchase_orders), brand_id (FK→brands), model, size, color, quantity, unit_cost, discount, sell_price, sell_discount, website_sync, product_type, bridge, temple_length, qty_received | → purchase_orders.id, → brands.id |
| `goods_receipts` | `T.RECEIPTS` | id (uuid PK), receipt_number, type (delivery_note/invoice/tax_invoice), status (draft/confirmed/cancelled), supplier_id (FK→suppliers), po_id (FK→purchase_orders, nullable), notes, total_amount, branch, created_at | → suppliers.id, → purchase_orders.id, ← goods_receipt_items.receipt_id |
| `goods_receipt_items` | `T.RCPT_ITEMS` | id (uuid PK), receipt_id (FK→goods_receipts), inventory_id (FK→inventory, nullable), barcode, brand, model, color, size, quantity, unit_cost, sell_price, website_sync, is_new_item (bool) | → goods_receipts.id, → inventory.id |
| `sync_log` | `T.SYNC_LOG` | id (uuid PK), filename, source (watcher/manual), status (success/partial/error), total_rows, processed, errors, pending, created_at | ← access-sales.js checks for duplicate filenames |
| `pending_sales` | `T.PENDING_SALES` | id (uuid PK), barcode, quantity, action_type (sale/return), order_number, sale_date, source_ref, sync_log_id, status (pending/resolved/ignored), resolved_inventory_id, resolution_note, created_at | → sync_log.id (implicit), → inventory.id (resolved) |
| `watcher_heartbeat` | `T.HEARTBEAT` | id, last_beat, status | Single-row table for watcher status monitoring |

---

## 6. Key Patterns

### PIN Verification Flow

All quantity changes, deletions, and pending resolutions require employee PIN verification.

**Pattern:**
1. Modal opens with PIN input field
2. User enters 4-digit PIN
3. Code queries `sb.from('employees').select('id, name').eq('pin', pin)`
4. If no match → error toast, return
5. If match → proceed with action, store employee name in `sessionStorage('prizma_user')`
6. Employee name is passed to `writeLog()` via sessionStorage

**Files using this pattern:** qty-modal.js (`confirmQtyChange`), audit-log.js (`confirmSoftDelete`, `confirmPermanentDelete`), inventory-edit.js (`confirmBulkDelete`), inventory-reduction.js (`confirmReduction`), pending-resolve.js (`confirmResolvePending`)

**Note:** PIN verification is currently client-side. Server-side RPC migration is planned.

### writeLog Pattern

Every data mutation calls `writeLog(action, inventoryId, details)`.

**Pattern:**
1. Call `writeLog(action, inventoryId, detailsObject)` after successful DB mutation
2. `action` is one of 21 types defined in ACTION_MAP (e.g., 'entry_manual', 'sale', 'edit_price')
3. `inventoryId` is the affected inventory UUID (null for permanent_delete)
4. `details` is a plain object with context-dependent fields:
   - Quantity changes: `{ qty_before, qty_after, reason, barcode, brand, model }`
   - Price edits: `{ price_before, price_after, barcode, brand, model }`
   - Entry: `{ barcode, brand, model, source_ref }`
   - Sales: `{ sale_amount, discount, final_amount, employee_id, order_number, sync_filename }`
5. writeLog reads `prizma_user` and `prizma_branch` from sessionStorage
6. writeLog is async and non-blocking (fire-and-forget, logs console warning on failure)

### Cascading Dropdowns

Brand → Model → Size/Color pattern used in 4 locations.

**Pattern:**
1. User selects a brand name
2. Code looks up `brandCache[brandName]` to get UUID
3. Queries inventory for distinct models: `sb.from(T.INV).select('model').eq('brand_id', uuid).eq('is_deleted', false).gt('quantity', 0)`
4. Populates model datalist/dropdown
5. On model selection, queries for distinct sizes + colors with same brand+model filter
6. Populates size and color datalists

**Locations:**
- `inventory-reduction.js`: `loadModelsForBrand()`, `loadSizesAndColors()`
- `inventory-entry.js`: within `addEntryRow()` brand onchange handler
- `po-items.js`: `loadPOModelsForBrand()`, `loadPOColorsAndSizes()`
- `receipt-form.js`: within `addReceiptItemRow()` (for new items)

### batchCreate / batchUpdate Usage

**batchCreate(tableName, records):**
- Inserts in batches of 100
- For `T.INV`: detects duplicate barcodes within batch AND against existing DB records
- Throws Hebrew error messages for duplicates
- Returns enriched rows (with brand_name, supplier_name)
- Used by: `submitEntry()`, `generatePendingBarcodes()`, `importPOToInventory()`

**batchUpdate(tableName, records):**
- Groups records by their column set for valid upserts
- Uses `onConflict: 'id'` for upsert behavior
- Handles duplicate barcode constraint violations
- Returns enriched rows
- Used by: `saveInventoryChanges()`, `applyBulkUpdate()`, `processRedExcel()`, `confirmExcelImport()`, `confirmSoftDelete()` (via direct sb call)

### enrichRow Usage

**`enrichRow(row)`** adds `brand_name` and `supplier_name` to a raw Supabase row.

**Pattern:**
1. Looks up `row.brand_id` in `brandCacheRev` → sets `brand_name`
2. Looks up `row.supplier_id` in `supplierCacheRev` → sets `supplier_name`
3. Returns new object (spread)

**Called automatically by:** `fetchAll()`, `batchCreate()`, `batchUpdate()` — all for the inventory table.

**Prerequisite:** `loadLookupCaches()` must have been called first to populate the caches.

### Soft Delete Pattern

All deletions use soft delete by default. Permanent delete requires escalated verification.

**Soft delete:**
1. `deleteInvRow(id)` opens modal with reason + note + PIN
2. `confirmSoftDelete()` sets: `is_deleted=true`, `deleted_at=now`, `deleted_by=employeeName`, `deleted_reason=reason`
3. Writes `'soft_delete'` log
4. Row is removed from in-memory `invData` and table re-renders
5. All queries filter `is_deleted=false` (in fetchAll and direct queries)

**Restore:**
1. `restoreItem(id)` sets: `is_deleted=false`, clears `deleted_at`, `deleted_by`, `deleted_reason`
2. Writes `'restore'` log

**Permanent delete:**
1. `permanentDelete(id)` shows confirmDialog THEN PIN modal (double verification)
2. `confirmPermanentDelete()` calls `sb.from('inventory').delete().eq('id', id)`
3. Writes `'permanent_delete'` log with `inventory_id=null` (since row is gone)

### Atomic Quantity Updates (Current Risk)

**Current implementation:** Quantity changes read the current value, calculate the new value in JavaScript, then write the result back.

```js
// Current pattern (qty-modal.js, receipt-actions.js, etc.)
const { data } = await sb.from('inventory').select('quantity').eq('id', id).single();
const newQty = data.quantity + amount;
await sb.from('inventory').update({ quantity: newQty }).eq('id', id);
```

**Risk:** Race condition if two users modify the same item simultaneously. The second write overwrites the first.

**Planned fix (Phase 2):** Migrate to Supabase RPC with atomic SQL increment:
```sql
UPDATE inventory SET quantity = quantity + $1 WHERE id = $2;
```

**Files affected:** qty-modal.js (`confirmQtyChange`), receipt-actions.js (`confirmReceiptCore`), inventory-reduction.js (`confirmReduction`), access-sales.js (`processAccessSalesFile`), pending-resolve.js (`confirmResolvePending`), po-view-import.js (`importPOToInventory`)
