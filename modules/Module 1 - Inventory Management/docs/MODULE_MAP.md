# MODULE_MAP — Optic Up Complete Codebase Reference

> Updated 2026-03-13. Single reference document for any developer or AI assistant.

---

## 1. File Index

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | shared.js | js/shared.js | 185 | Supabase client init, table constants (T), FIELD_MAP/ENUM_MAP, Hebrew↔English translation, UI helpers ($, toast, setAlert, confirmDialog, showLoading), tab navigation (showTab, showEntryMode), escapeHtml, global variable declarations |
| 2 | supabase-ops.js | js/supabase-ops.js | 176 | Database abstraction layer: loadLookupCaches, enrichRow, fetchAll (paginated), batchCreate (with duplicate barcode detection), batchUpdate (individual updates, RLS-safe), writeLog, generateNextBarcode |
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
| 18 | receipt-form.js | modules/goods-receipts/receipt-form.js | 292 | Receipt form: openExistingReceipt, toggleReceiptFormInputs, searchReceiptBarcode, addReceiptItemRow, getReceiptItems, updateReceiptItemsStats, addNewReceiptRow, showReceiptGuide, _pickReceiptFile (file attach) |
| 19 | receipt-actions.js | modules/goods-receipts/receipt-actions.js | 174 | Receipt save/cancel: saveReceiptDraft, saveReceiptDraftInternal, cancelReceipt, backToReceiptList |
| 19b | receipt-confirm.js | modules/goods-receipts/receipt-confirm.js | 167 | Receipt confirmation: confirmReceipt, confirmReceiptCore, confirmReceiptById (from list), createNewInventoryFromReceiptItem |
| 19c | receipt-debt.js | modules/goods-receipts/receipt-debt.js | 130 | Auto-create supplier_documents on receipt confirmation: createDocumentFromReceipt. Uploads attached file if _pendingReceiptFile exists. Phase 4f: auto-deducts from active prepaid deal if exists |
| 20 | receipt-excel.js | modules/goods-receipts/receipt-excel.js | 195 | Receipt Excel: handleReceiptExcel (import items), exportReceiptExcel, exportReceiptToAccess, receipt list event delegation |
| 21 | audit-log.js | modules/audit/audit-log.js | 215 | Soft delete flow (deleteInvRow, confirmSoftDelete), recycle bin (openRecycleBin, restoreItem, permanentDelete with double PIN) |
| 22 | item-history.js | modules/audit/item-history.js | 323 | Item timeline (openItemHistory), ACTION_MAP constant (21 action types), entry history accordion (openEntryHistory, loadEntryHistory, renderEntryHistory), exports |
| 23 | qty-modal.js | modules/audit/qty-modal.js | 98 | Quantity change modal: openQtyModal (add/remove with reason+PIN), confirmQtyChange |
| 24 | brands.js | modules/brands/brands.js | 197 | Brand management: loadBrandsTab, renderBrandsTable (4 filters), setBrandActive (immediate save), addBrandRow, saveBrands, saveBrandField |
| 25 | suppliers.js | modules/brands/suppliers.js | 167 | Supplier management: loadSuppliersTab, supplier number editing with temp-negative-swap, addSupplier with auto-number, getNextSupplierNumber (gap-filling) |
| 26 | access-sync.js | modules/access-sync/access-sync.js | 210 | Access sync tab: renderAccessSyncTab (summary cards + log table), loadSyncLog (paginated with action buttons), loadSyncSummary, loadLastActivity, calcTimeSince, loadPendingBadge |
| 27 | sync-details.js | modules/access-sync/sync-details.js | 157 | Sync details modal: openSyncDetails (items table + error table), closeSyncDetails, downloadFailedFile (signed URL from Supabase Storage) |
| 28 | pending-panel.js | modules/access-sync/pending-panel.js | 233 | Pending sales panel: renderPendingPanel, pendingCardHtml, loadSuggestions (barcode matching), free-text search with debounce, event delegation |
| 29 | pending-resolve.js | modules/access-sync/pending-resolve.js | 188 | Pending resolution: ignorePending, resolvePending (PIN-verified), confirmResolvePending (optimistic locking on status), updatePendingPanelCount |
| 30 | stock-count-list.js | modules/stock-count/stock-count-list.js | 152 | Stock count list screen: ensureStockCountListHTML, loadStockCountTab (summary cards + table), generateCountNumber (SC-YYYY-NNNN), startNewCount (PIN first, DB creation after), renderStockCountList |
| 31 | stock-count-session.js | modules/stock-count/stock-count-session.js | 281 | Stock count session: worker PIN entry (openWorkerPin/confirmWorkerPin), camera barcode scanning (ZXing), manual barcode/smart search input, scan handler, item update, session UI |
| 32 | stock-count-report.js | modules/stock-count/stock-count-report.js | 234 | Diff report screen (showDiffReport/renderReportScreen), empty count guard, manager PIN approval (confirmCount with role check), cancelCount, exportCountExcel (SheetJS) |
| 33 | sync-watcher.js | scripts/sync-watcher.js | 385 | Node.js Dropbox folder watcher: processes sales_template Excel files, atomic qty updates via RPC, pending_sales for unknown barcodes (full field set), idempotency guards, failed file upload to Supabase Storage |
| 34 | admin.js | modules/admin/admin.js | 63 | Admin mode toggle (password 1234), DOMContentLoaded handler (app init: loadData → addEntryRow → refreshLowStockBanner), help modal |
| 35 | system-log.js | modules/admin/system-log.js | 217 | System log viewer: loadSystemLog (6 filters, pagination, 4 summary stats), exportSystemLog (up to 10k rows), action dropdown from ACTION_MAP |
| 36 | auth-service.js | js/auth-service.js | 287 | Core auth engine: verifyEmployeePIN, initSecureSession, loadSession, clearSession, hasPermission, requirePermission, applyUIPermissions, getCurrentEmployee, assignRoleToEmployee, forceLogout |
| 37 | employee-list.js | modules/employees/employee-list.js | 283 | Employee management: loadEmployeesTab, renderEmployeeTable, openAddEmployee, openEditEmployee, saveEmployee, confirmDeactivateEmployee, renderPermissionMatrix, updateRolePermission |
| 38 | index.html | index.html | 310 | Home screen shell: MODULES config array, renderModules (permission-based card lock), PIN login modal, session restore, live clock, onLoginSuccess |
| 39 | employees.html | employees.html | ~120 | Standalone employee management page (extracted from inventory.html employees tab). adminBtn in header, homeBtn always visible in nav |
| 40 | header.css | css/header.css | 98 | Sticky header styles: 60px height, z-index 1000, RTL, 3-zone flex layout (right: logo+store, center: app name, left: employee+logout), responsive below 600px hides role |
| 41 | header.js | js/header.js | 58 | Sticky header logic: initHeader (DOMContentLoaded, session check, tenant fetch), buildHeader (DOM injection, escapeHtml, clearSession logout) |
| 42 | suppliers-debt.html | suppliers-debt.html | ~195 | Supplier debt tracking page: summary cards, 4 tabs, session check, tab switching. debt-main-content wrapper + supplier-detail-panel for detail view |
| 43 | debt-dashboard.js | modules/suppliers-debt/debt-dashboard.js | ~230 | Debt dashboard summary: loadDebtSummary, loadSuppliersTab (aggregated supplier table with debt/overdue/prepaid), renderSuppliersTable, openPaymentForSupplier |
| 44 | debt-documents.js | modules/suppliers-debt/debt-documents.js | ~360 | Documents tab: loadDocumentsTab (fetch docs+types+suppliers), renderDocFilterBar (supplier/type/status/date/overdue filters), applyDocFilters (client-side), renderDocumentsTable, viewDocument (file preview modal), _attachFileToDoc (file upload), openNewDocumentModal (PIN-verified CRUD), saveNewDocument, generateDocInternalNumber |
| 45 | debt-doc-link.js | modules/suppliers-debt/debt-doc-link.js | 72 | Delivery note → invoice linking: openLinkToInvoiceModal (shows supplier's invoices), linkDeliveryToInvoice (creates document_links record, updates status to linked) |
| 46 | debt-payments.js | modules/suppliers-debt/debt-payments.js | 168 | Payments tab: loadPaymentsTab (fetch payments+methods+suppliers+allocations+documents), renderPaymentsToolbar (filters + add button), applyPayFilters (client-side), renderPaymentsTable (with כנגד doc numbers), viewPayment (detail modal with allocation table) |
| 47 | debt-payment-wizard.js | modules/suppliers-debt/debt-payment-wizard.js | 146 | Payment wizard steps 1-2: openNewPaymentWizard (state reset + modal), supplier selection with debt summary + withholding tax rate lookup, payment details form with auto-calc withholding tax |
| 48 | debt-payment-alloc.js | modules/suppliers-debt/debt-payment-alloc.js | ~275 | Payment wizard steps 3-4: document allocation with FIFO, manual override, allocation summary with mismatch warning, PIN confirmation, _wizSavePayment (creates payment + allocations, updates document paid_amount/status, rollback on failure) |
| 49 | debt-prepaid.js | modules/suppliers-debt/debt-prepaid.js | 285 | Prepaid deals tab: loadPrepaidTab (fetch deals+checks+suppliers), renderPrepaidToolbar (filters + add button), applyPrepaidFilters (client-side), renderPrepaidTable (progress bar, status badges), openNewDealModal (PIN-verified), openAddCheckModal, viewDealDetail (progress bar + checks table), updateCheckStatus |
| 50 | debt-supplier-detail.js | modules/suppliers-debt/debt-supplier-detail.js | ~328 | Supplier detail view: openSupplierDetail (slide-in panel with summary + 4 sub-tabs), closeSupplierDetail, loadSupplierTimeline (merged docs+payments sorted by date), loadSupplierDocuments (filtered table), loadSupplierPayments (filtered table), loadSupplierReturns (delegates to debt-returns.js) |
| 51 | debt-returns.js | modules/suppliers-debt/debt-returns.js | ~230 | Supplier returns tab: loadReturnsForSupplier (fetch+render), renderReturnsTable, viewReturnDetail (modal with items), promptReturnStatusUpdate (PIN-verified), updateReturnStatus, generateReturnNumber (RET-{supplier_number}-{seq}) |
| 52 | inventory-return.js | modules/inventory/inventory-return.js | ~218 | Supplier return initiation from inventory: openSupplierReturnModal (validates selection, same-supplier check, items preview), _doConfirmSupplierReturn (PIN-verified, creates return+items, decrements inventory, writeLog) |
| 53 | file-upload.js | js/file-upload.js | 97 | File upload helper for supplier documents: uploadSupplierFile (validates type/size, uploads to Supabase Storage), getSupplierFileUrl (signed URLs), renderFilePreview (PDF iframe / image), pickAndUploadFile (hidden file input + upload) |

**Total: 53 files, ~10,890 lines** (includes scripts/sync-watcher.js)

**Note (Phase 4 QA fixes + file upload):** file-upload.js added (js/). batchUpdate changed from upsert to individual updates (RLS fix). Payment wizard rollback on failure. generateReturnNumber fallback for supplierNumCache. "cancelled" filter added to documents tab. viewDocument upgraded from placeholder to full modal with file preview. File attach button added to receipt form + documents tab. _pickReceiptFile + _pendingReceiptFile added to receipt-form.js. File-missing warning in confirmReceipt. receipt-debt.js uploads attached file after document creation.

**Note (Phase 4h):** debt-returns.js + inventory-return.js added. T.SUP_RETURNS + T.SUP_RETURN_ITEMS added to shared.js. loadSupplierReturns in debt-supplier-detail.js now delegates to loadReturnsForSupplier. "זיכוי לספק" button added to inventory bulk bar.

**Note (Phase 4g):** debt-supplier-detail.js added. debt-dashboard.js extended with loadSuppliersTab + renderSuppliersTable + openPaymentForSupplier. suppliers-debt.html restructured with debt-main-content wrapper + supplier-detail-panel div.

**Note (Phase 4f):** debt-prepaid.js added. T.PREPAID_DEALS + T.PREPAID_CHECKS added to shared.js. Auto-deduction logic added to receipt-debt.js. Tab switching wired in suppliers-debt.html.

**Note (Phase 4e):** debt-payments.js + debt-payment-wizard.js + debt-payment-alloc.js added. T.PAY_ALLOC + T.PAY_METHODS added to shared.js. Tab switching wired in suppliers-debt.html.

**Note (Phase 4d):** debt-documents.js + debt-doc-link.js added. formatILS moved from debt-dashboard.js to shared.js. T.DOC_LINKS added to shared.js.

**Note (Phase 4c):** suppliers-debt.html + debt-dashboard.js added. New folder modules/suppliers-debt/. T.SUP_PAYMENTS added to shared.js. Debt module card added to index.html MODULES array.

**Note (Phase 3.8):** header.css + header.js added. Script/link tags added to index.html, inventory.html, employees.html.

**Note (Phase 3.75):** All JS files updated with tenant_id in inserts/selects. auth-service.js updated with Edge Function call and JWT client recreation.

**Note:** inventory.html — employees tab removed in Phase 3.5. Employee management now lives in standalone employees.html. Both inventory.html and employees.html have adminBtn in header and homeBtn always visible in nav.

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
| `confirmDialog` | `(title, text='')` | Async confirm modal. Returns Promise\<boolean\>. text defaults to empty string |
| `showTab` | `(name)` | Main navigation: stops camera if active, deactivates all tabs, activates target, calls appropriate loader |
| `showEntryMode` | `(mode)` | Switches between manual/excel/receipt entry sub-modes |
| `getTenantId` | `()` | Returns tenant_id UUID from sessionStorage ('prizma_tenant_id'). Used in every insert/select as defense-in-depth alongside RLS (Phase 3.75) |
| `formatILS` | `(amount)` | Formats number as ILS currency string (₪1,234) with thousands separator. Moved from debt-dashboard.js in Phase 4d |

### js/supabase-ops.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadLookupCaches` | `()` | Async. Fetches suppliers+brands, rebuilds all 6 lookup caches (supplierCache, supplierCacheRev, supplierNumCache, brandCache, brandCacheRev) |
| `enrichRow` | `(row)` | Adds brand_name and supplier_name from caches. Returns new object |
| `fetchAll` | `(tableName, filters?)` | Async. Paginated query (1000/page). Auto-joins inventory_images for inventory table. Supports eq/in/ilike/neq/gt/gte/lt filters. Returns enriched rows |
| `batchCreate` | `(tableName, records)` | Async. Inserts in batches of 100. Detects duplicate barcodes (within batch + existing DB). Returns enriched rows |
| `batchUpdate` | `(tableName, records)` | Async. Individual .update().eq('id') per record (RLS-safe). Adds tenant_id. Handles duplicate barcode constraint errors. Returns enriched rows |
| `writeLog` | `(action, inventoryId?, details?)` | Async. Inserts into inventory_logs. Reads prizma_user and prizma_branch from sessionStorage. Supports 20+ detail fields |
| `generateNextBarcode` | `()` | Async. Shared helper — calls loadMaxBarcode(), increments maxBarcode, returns BBDDDDD barcode string. Used by receipt-form and receipt-confirm |

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
| `processRedExcel` | `()` | Async. Processes reduction Excel rows: barcode lookup, brand/model validation, qty reduction via `sb.rpc('decrement_inventory')` for sync=full items |
| `loadModelsForBrand` | `(brandName)` | Async. Cascading dropdown: populates model datalist for brand |
| `clearSizeColorLists` | `()` | Clears size/color datalists and inputs |
| `loadSizesAndColors` | `()` | Async. Cascading dropdown: populates size+color datalists for brand+model |
| `searchManual` | `()` | Async. Searches by barcode or brand+model+size+color, renders result cards |
| `openReductionModal` | `(recId)` | Opens reduction modal with item info, amount, reason, PIN fields |
| `confirmReduction` | `()` | Async. Validates amount/reason/PIN, decrements qty via `sb.rpc('decrement_inventory')`, maps reason→action type, writes log |

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
| `processAccessSalesFile` | `(workbook, filename)` | Async. Processes Access POS sales file: validates rows, checks duplicate file via sync_log, adjusts qty via atomic RPC for sales/returns, unmatched→pending_sales |

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
| `addNewReceiptRow` | `()` | Async. Generates barcode via generateNextBarcode(), then calls addReceiptItemRow(). Used by manual "שורה חדשה" button |
| `showReceiptGuide` | `()` | Opens modal overlay with employee quick-reference guide (RECEIPT_GUIDE_TEXT constant) |
| `_pickReceiptFile` | `()` | Opens hidden file input, stores selected file in _pendingReceiptFile, updates attach button label |

### modules/goods-receipts/receipt-actions.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `saveReceiptDraft` | `()` | Async. Validates fields, creates or updates receipt + items |
| `saveReceiptDraftInternal` | `()` | Async. Internal save without UI feedback, used before confirmReceipt |
| `cancelReceipt` | `(receiptId)` | Async. Sets receipt status to 'cancelled' |
| `backToReceiptList` | `()` | Resets form state, calls loadReceiptTab |

### modules/goods-receipts/receipt-confirm.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `confirmReceiptCore` | `(receiptId, rcptNumber, poId)` | Async. Core confirmation: increments inventory quantities via `sb.rpc('increment_inventory')`, creates new items, updates PO status, calls createDocumentFromReceipt |
| `confirmReceipt` | `()` | Async. UI-facing: validates, saves draft internally, then calls confirmReceiptCore |
| `createNewInventoryFromReceiptItem` | `(item, receiptId, rcptNumber)` | Async. Creates inventory row using pre-assigned barcode from receipt item (falls back to generateNextBarcode) |
| `confirmReceiptById` | `(receiptId)` | Async. Confirms receipt from list view without opening form |

### modules/goods-receipts/receipt-debt.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `createDocumentFromReceipt` | `(receiptId, supplierId, receiptItems)` | Async. Auto-creates supplier_documents record from confirmed receipt. Calculates subtotal/VAT/total from item costs, generates DOC-NNNN internal_number, uses supplier's default_document_type and payment_terms_days. Skips if no cost data. Uploads _pendingReceiptFile if attached. Phase 4f: auto-deducts totalAmount from active prepaid deal (updates total_used/total_remaining). Uses fetchAll/batchCreate/batchUpdate helpers. |

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
| `confirmQtyChange` | `()` | Async. Validates amount/reason/PIN, updates qty via `sb.rpc('increment_inventory'/'decrement_inventory')`, writes log, updates DOM |

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
| `renderAccessSyncTab` | `()` | Renders full sync tab: header with last activity, 3 summary cards, pending button, sync log table with action buttons |
| `summaryCard` | `(id, icon, label, value, color)` | Returns summary card HTML |
| `calcTimeSince` | `(timestamp)` | Returns Hebrew relative time string (דקות/שעות/ימים) |
| `loadSyncSummary` | `()` | Async. Fetches today's sync_log rows, calculates summary card values (syncs, items, errors) |
| `loadLastActivity` | `()` | Async. Fetches most recent sync_log row, displays relative time in header |
| `loadSyncLog` | `(page?)` | Async. Paginated sync_log fetch (20 rows) with status badges and action buttons |
| `renderSyncLogRow` | `(r)` | Returns table row HTML for a sync_log entry with actions (details, retry, download) |
| `loadPendingBadge` | `()` | Async. Counts pending sales, updates button style |
| `onPendingClick` | `()` | Calls renderPendingPanel |

### modules/access-sync/sync-details.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openSyncDetails` | `(logId)` | Async. Opens modal with file info, processed items table (from inventory_logs), error table (from sync_log.errors JSONB) |
| `closeSyncDetails` | `()` | Removes sync detail overlay from DOM |
| `downloadFailedFile` | `(logId)` | Async. Fetches storage_path from sync_log, creates signed URL (1hr) from Supabase Storage, opens in new tab |

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
| `confirmResolvePending` | `()` | Async. Verifies PIN, optimistic lock on status='pending', adjusts qty via `sb.rpc('decrement_inventory'/'increment_inventory')`, writes log |
| `updatePendingPanelCount` | `()` | Updates card count in panel header |

### modules/stock-count/stock-count-list.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `ensureStockCountListHTML` | `()` | Restores list HTML if tab was replaced by session/PIN screen |
| `loadStockCountTab` | `()` | Async. Tab entry point — fetches all stock counts, computes summary cards, renders table |
| `renderStockCountList` | `(counts)` | Renders stock count table rows with status badges and action buttons |
| `generateCountNumber` | `()` | Async. Generates SC-YYYY-NNNN count number |
| `startNewCount` | `()` | Calls openWorkerPin(null) — PIN first, DB creation happens in confirmWorkerPin after valid PIN |

### modules/stock-count/stock-count-session.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openWorkerPin` | `(countId)` | Shows fullscreen PIN modal ("מי סורק?"), stores countId for session |
| `confirmWorkerPin` | `()` | Async. Verifies PIN against T.EMPLOYEES, stores activeWorker in sessionStorage, calls openCountSession |
| `openCountSession` | `(countId)` | Async. Fetches count header + items from T.STOCK_COUNT_ITEMS, calls renderSessionScreen |
| `scRenderItemRow` | `(it)` | Returns HTML `<tr>` for one count item with row color class (ok/warn/diff/pending) |
| `scCalcStats` | `(items)` | Returns {counted, total, diffs, pct} stats object from items array |
| `renderSessionScreen` | `(countId, items)` | Replaces tab content with session UI: topbar, camera section, summary bar, items table |
| `renderSessionTable` | `(items)` | Re-renders session table body from items array |
| `filterSessionItems` | `(query)` | Filters session items by brand/model/color/barcode; digits-only waits for Enter |
| `manualBarcodeSearch` | `()` | Reads smart search input, calls handleScan for digits |
| `startCamera` | `()` | Async. Initializes ZXing BrowserMultiFormatReader, starts video decoding |
| `stopCamera` | `()` | Stops ZXing reader, hides video element |
| `handleScan` | `(countId, barcode)` | Async. Debounced scan handler: unknown → warning toast, counted → confirm +1, pending → qty prompt |
| `updateCountItem` | `(itemId, actualQty)` | Async. Updates T.STOCK_COUNT_ITEMS row, refreshes local array + UI |
| `refreshSessionUI` | `()` | Updates summary stats + re-renders table body from scSessionItems |
| `finishSession` | `(countId)` | Stops camera, calls showDiffReport(countId) |

### modules/stock-count/stock-count-report.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `showDiffReport` | `(countId)` | Async. Fetches count header + items, splits into diff/all, guards empty count (toast + hide approve), calls renderReportScreen |
| `renderReportScreen` | `(countId, diffItems, allItems, displayItems, nothingScanned)` | Renders diff report: summary cards (shortages/surpluses/uncounted), diff+pending items table, action buttons (approve hidden if nothingScanned) |
| `showConfirmPinForCount` | `(countId)` | Shows inline manager PIN input for count approval |
| `confirmCount` | `(countId)` | Async. Verifies manager PIN (role IN admin/manager), updates inventory via set_inventory_qty RPC, writeLogs via Promise.all, marks count completed |
| `cancelCount` | `(countId)` | Async. Confirms cancellation, updates count status to cancelled |
| `exportCountExcel` | `(countId)` | Async. Exports all counted items to xlsx via SheetJS (10 columns) |

### scripts/sync-watcher.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `log` | `(msg)` | Timestamped console.log |
| `makeTimestamp` | `()` | Returns YYYYMMDD_HHMMSS string for file naming |
| `moveFile` | `(filepath, destDir, filename)` | Moves file with timestamp prefix (rename, fallback to copy+delete) |
| `parseDateField` | `(raw)` | Parses date from string or Excel serial number |
| `uploadFailedFile` | `(filepath, filename)` | Async. Uploads file to Supabase Storage bucket `failed-sync-files` |
| `isDuplicateLog` | `(inventoryId, sourceRef)` | Async. Checks for duplicate inventory_log within 5s window |
| `isDuplicateSyncLog` | `(filename)` | Async. Checks for duplicate sync_log within 5s window |
| `processFile` | `(filepath, filename)` | Async. Main processing: reads Excel, validates sales_template rows, updates inventory via atomic RPC or inserts pending_sales, writes sync_log |
| `handleNewFile` | `(filepath)` | Async. Guards against duplicate processing, calls processFile, moves to processed/failed |
| `shutdown` | `()` | Graceful SIGTERM/SIGINT handler: closes watcher, exits |

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

### js/auth-service.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `verifyEmployeePIN` | `(pin)` | Calls pin-auth Edge Function → returns {token, employee} with signed JWT. Handles lockout check + failed_attempts. Returns employee object, { locked: true }, or null (Phase 3.75: Edge Function) |
| `incrementFailedAttempts` | `(employeeId)` | Helper: increment failures, set locked_until after 5 attempts |
| `getEffectivePermissions` | `(employeeId)` | Join employee_roles→role_permissions→permissions. Returns array of permission id strings |
| `initSecureSession` | `(employee, jwtToken?)` | Token generation, DB insert into auth_sessions, sessionStorage write. If jwtToken provided (Phase 3.75), recreates sb client with JWT Bearer token |
| `loadSession` | `()` | Restores JWT client from sessionStorage before querying auth_sessions. Token validation, session restore, dev bypass (?dev_bypass=opticup2024) (Phase 3.75: JWT restore) |
| `clearSessionLocal` | `()` | Helper: clear all prizma_* sessionStorage keys |
| `clearSession` | `()` | DB deactivate + local clear + page reload |
| `hasPermission` | `(permissionKey)` | Check permission snapshot, supports '*' wildcard for dev bypass |
| `requirePermission` | `(permissionKey)` | Guard: toast('אין הרשאה...') + throw if unauthorized |
| `checkBranchAccess` | `(branchId)` | Returns true if CEO/manager OR branch matches |
| `applyUIPermissions` | `()` | Hide elements by [data-permission] and [data-tab-permission] |
| `getCurrentEmployee` | `()` | Return employee object from sessionStorage |
| `assignRoleToEmployee` | `(employeeId, roleId)` | Requires employees.assign_role — upsert employee_roles |
| `forceLogout` | `(employeeId)` | Requires employees.delete — deactivate all sessions for target employee |
| `verifyPinOnly` | `(pin)` | Mid-session PIN check (non-login). Calls verifyEmployeePIN logic client-side, returns employee or null. Does NOT create new JWT or session (Phase 3.75) |

### js/header.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `initHeader` | `()` | DOMContentLoaded handler. Checks sessionStorage for employee (SK.EMPLOYEE). If absent, returns (no header pre-login). Fetches tenant name + logo_url from tenants table. Calls buildHeader() |
| `buildHeader` | `(emp, tenantName, logoUrl, role)` | Creates `<header id="app-header">` with 3 zones: right (logo/fallback SVG + store name), center ("Optic Up"), left (employee name + role + logout button). All dynamic values escaped via escapeHtml(). Logout wired to clearSession() via addEventListener |

### js/file-upload.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `uploadSupplierFile` | `(file, supplierId)` | Async. Validates type (PDF/JPG/PNG) and size (10MB max). Uploads to Supabase Storage bucket "supplier-docs" at path {tenant_id}/{supplier_id}/{timestamp}_{filename}. Returns { url, fileName, signedUrl } or null |
| `getSupplierFileUrl` | `(filePath)` | Async. Creates 1-hour signed URL for viewing a stored file. Returns URL string or null |
| `renderFilePreview` | `(fileUrl, fileName, containerId)` | Renders PDF iframe or img tag into container. Shows "אין קובץ מצורף" if no URL |
| `pickAndUploadFile` | `(supplierId, callback)` | Opens hidden file input, uploads selected file, calls callback with result |

### index.html (inline script)

| Function | Parameters | Description |
|----------|------------|-------------|
| `renderModules` | `()` | Renders MODULES config as cards with coming_soon/locked/locked-overlay states. Applies permission-based lock after login |
| `onLoginSuccess` | `(emp)` | Sets loggedIn=true, shows user info, hides login button, re-renders modules |
| `openPinModal` | `()` | Shows PIN login modal, clears inputs, focuses first box |
| `closePinModal` | `()` | Hides PIN modal |
| `handlePinSubmit` | `()` | Verifies PIN via verifyEmployeePIN, handles lockout, calls initSecureSession + onLoginSuccess |
| `doLogout` | `()` | Calls clearSession() to end session and redirect |
| `updateClock` | `()` | Updates clock-bar with Hebrew date + time (1s interval) |

### suppliers-debt.html (inline script)

| Function | Parameters | Description |
|----------|------------|-------------|
| `switchDebtTab` | `(tabName)` | Switches active tab button and content div for the 4 debt tabs (suppliers, documents, payments, prepaid) |

### modules/suppliers-debt/debt-dashboard.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadDebtSummary` | `()` | Queries supplier_documents (open, not deleted) and supplier_payments (this month). Calculates total debt, due this week, overdue, paid this month. Updates DOM cards. Adds 'overdue' class if overdue > 0. Calls loadSuppliersTab |
| `loadSuppliersTab` | `()` | Fetches suppliers + open documents + active prepaid deals. Aggregates per-supplier: open doc count, total debt, overdue amount, next due date, prepaid deal remaining. Sorts overdue-first then by debt desc |
| `renderSuppliersTable` | `(data)` | Renders supplier table with columns: name, open docs, total debt, overdue (red), next due, prepaid deal, action buttons. Row click opens supplier detail |
| `openPaymentForSupplier` | `(supplierId)` | Opens payment wizard pre-filled with supplier (skips step 1). Ensures _payMethods loaded |

### modules/suppliers-debt/debt-documents.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadDocumentsTab` | `()` | Fetches supplier_documents + document_types + suppliers in parallel. Stores in module-level caches. Renders filter bar + table |
| `renderDocFilterBar` | `()` | Builds filter toolbar inside dtab-documents: supplier, type, status dropdowns, date range, overdue checkbox, "+ מסמך חדש" button |
| `applyDocFilters` | `()` | Reads filter inputs, filters _docData client-side, sorts by date desc, calls renderDocumentsTable |
| `renderDocumentsTable` | `(docs)` | Renders HTML table with columns: date, type, number, internal number, supplier, amount, paid, balance, status badge, action buttons |
| `viewDocument` | `(docId)` | Async. Full modal: document metadata grid + file preview (PDF iframe / image). Shows "צרף מסמך" button if no file attached |
| `_attachFileToDoc` | `(docId, supplierId)` | Opens file picker, uploads via uploadSupplierFile, updates document file_url/file_name, refreshes view |
| `openNewDocumentModal` | `()` | Creates dynamic modal with supplier/type/number/dates/amounts/VAT/notes/PIN fields. Auto-calculates VAT on input |
| `closeAndRemoveModal` | `(id)` | Removes modal element from DOM by id |
| `calcNewDocTotal` | `()` | Auto-calc: reads subtotal + VAT rate, updates VAT and total fields |
| `saveNewDocument` | `()` | Validates fields, checks duplicates, verifies PIN, generates internal_number, batchCreate to supplier_documents, writeLog, refresh tab |
| `generateDocInternalNumber` | `()` | Queries max existing DOC-NNNN from supplier_documents, returns next sequential number |

### modules/suppliers-debt/debt-doc-link.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openLinkToInvoiceModal` | `(docId)` | Shows modal for linking a delivery note to an invoice. Lists same-supplier invoices (not cancelled) as dropdown options |
| `linkDeliveryToInvoice` | `(deliveryNoteId)` | Creates document_links record (parent=invoice, child=delivery note), updates delivery note status to 'linked', writeLog, refresh tab |

### modules/suppliers-debt/debt-payments.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadPaymentsTab` | `()` | Fetches payments + payment_methods + suppliers + allocations + documents in parallel. Builds allocation map and doc lookup. Renders toolbar + table |
| `renderPaymentsToolbar` | `()` | Builds filter toolbar: supplier dropdown, status dropdown, date range, "+ תשלום חדש" button |
| `applyPayFilters` | `()` | Reads filter inputs, filters _payData client-side, sorts by date desc, calls renderPaymentsTable |
| `renderPaymentsTable` | `(payments)` | Renders HTML table: date, supplier, amount, withholding tax, net, method, reference, linked doc numbers, status badge, view button |
| `viewPayment` | `(payId)` | Creates detail modal showing payment info grid + allocations table with document numbers |

### modules/suppliers-debt/debt-payment-wizard.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openNewPaymentWizard` | `()` | Resets wizard state, creates modal overlay, renders step 1 |
| `_wizRenderStep1` | `()` | Supplier selection step with searchable dropdown. Restores previous selection on back navigation |
| `_wizSelectSupplier` | `(supplierId)` | Fetches open docs for supplier, calculates total debt/overdue, reads withholding_tax_rate. Shows info card |
| `_wizRenderStep2` | `()` | Payment details form: amount, withholding tax rate (pre-filled), auto-calc tax/net, date, method, reference, notes. Restores values on back |
| `_wizCalcTax` | `()` | Auto-calculates withholding_tax_amount and net_amount from gross amount and rate |

### modules/suppliers-debt/debt-payment-alloc.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `_wizGoStep3` | `()` | Validates step 2 fields, stores in _wizState, fetches open docs, runs autoAllocateFIFO, renders step 3 |
| `autoAllocateFIFO` | `(paymentAmount, openDocs)` | Distributes payment across documents oldest-first. Returns array of { document_id, allocated_amount } |
| `_wizRenderStep3` | `()` | Document allocation table with editable amounts per document. Running total with match/mismatch indicator |
| `_wizUpdateAllocTotal` | `()` | Reads all allocation inputs, rebuilds _wizState.allocations, updates summary with diff warning |
| `_wizAutoAllocate` | `()` | Re-runs FIFO allocation, updates all input values |
| `_wizClearAlloc` | `()` | Clears all allocation inputs and state |
| `_wizGoStep4` | `()` | Validates allocation total vs net amount (warns on mismatch), renders step 4 |
| `_wizRenderStep4` | `()` | Confirmation screen: payment summary grid + PIN input |
| `_wizSavePayment` | `()` | Verifies PIN, creates supplier_payments record, creates payment_allocations, updates paid_amount/status on documents, writeLog, refreshes tab + summary cards. Rollback: deletes payment+allocations on failure |

### modules/suppliers-debt/debt-prepaid.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadPrepaidTab` | `()` | Fetches prepaid_deals + prepaid_checks + suppliers, renders toolbar + table |
| `renderPrepaidToolbar` | `()` | Supplier/status filter dropdowns + "עסקה חדשה" button |
| `applyPrepaidFilters` | `()` | Client-side filter by supplier and status |
| `renderPrepaidTable` | `(deals)` | Table with progress bar, status badges, action buttons |
| `openNewDealModal` | `()` | Modal: supplier, name, dates, amount, threshold, PIN |
| `_dealAutoName` | `()` | Auto-generates deal name from supplier + year |
| `saveNewDeal` | `()` | PIN verify → batchCreate prepaid_deals → writeLog → refresh |
| `openAddCheckModal` | `(dealId)` | Modal: check number, amount, date, notes |
| `saveNewCheck` | `(dealId)` | batchCreate prepaid_checks → writeLog → refresh |
| `viewDealDetail` | `(dealId)` | Detail modal: deal summary, progress bar, checks table with status actions |
| `updateCheckStatus` | `(checkId, newStatus)` | Updates check status (pending→cashed/bounced), sets cashed_date |

### modules/suppliers-debt/debt-supplier-detail.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openSupplierDetail` | `(supplierId)` | Hides main content, shows detail panel. Fetches supplier info + docs + prepaid deals. Renders header with debt summary + 4 sub-tabs (timeline default) |
| `closeSupplierDetail` | `()` | Hides detail panel, restores main content |
| `_switchDetailTab` | `(tabName)` | Switches active sub-tab, loads content (timeline/docs/payments/returns) |
| `loadSupplierTimeline` | `(supplierId)` | Fetches all docs + payments for supplier, merges into date-sorted timeline with icons. Max 50 entries with "show more" |
| `_showAllTimeline` | `()` | Shows all timeline entries beyond the initial 50 limit |
| `loadSupplierDocuments` | `(supplierId)` | Fetches supplier_documents filtered to this supplier, renders table (date, type, number, amount, paid, balance, status) |
| `loadSupplierPayments` | `(supplierId)` | Fetches supplier_payments filtered to this supplier, renders table (date, amount, net, method, reference, status) |
| `loadSupplierReturns` | `(supplierId)` | Delegates to loadReturnsForSupplier (debt-returns.js) with fallback empty state |

### modules/suppliers-debt/debt-returns.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadReturnsForSupplier` | `(supplierId)` | Fetches supplier_returns + supplier_return_items for supplier, builds itemsMap for counts/totals, renders table |
| `renderReturnsTable` | `(returns, container)` | Renders returns table (number, date, type, items, amount, status, actions) with status badges and action buttons |
| `viewReturnDetail` | `(returnId)` | Modal showing return items table (barcode, brand, model, color, size, qty, price) with summary |
| `promptReturnStatusUpdate` | `(returnId, newStatus)` | PIN prompt modal for status transition |
| `_confirmReturnStatus` | `(returnId, newStatus)` | Verifies PIN, calls updateReturnStatus, reloads returns tab |
| `updateReturnStatus` | `(returnId, newStatus)` | Updates status + timestamps via batchUpdate, writeLog |
| `generateReturnNumber` | `(supplierId)` | Generates RET-{supplier_number}-{seq 4-digit} (mirrors PO number pattern) |

### modules/inventory/inventory-return.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `openSupplierReturnModal` | `()` | Validates invSelected items, checks same supplier, shows return form modal with items preview |
| `_doConfirmSupplierReturn` | `(supplierId)` | PIN-verified: generates return number, creates supplier_returns + supplier_return_items, decrements inventory (sb.rpc), writeLog per item, refreshes table |

### modules/employees/employee-list.js

| Function | Parameters | Description |
|----------|------------|-------------|
| `loadEmployeesTab` | `()` | requirePermission check, fetch employees+roles, render summary cards + table |
| `renderEmployeeTable` | `(employees)` | Table with colored role badges, edit/deactivate buttons per permissions |
| `openAddEmployee` | `()` | requirePermission('employees.create'), open modal |
| `openEditEmployee` | `(id)` | requirePermission('employees.edit'), pre-fill modal, block editing higher roles |
| `saveEmployee` | `()` | Insert/update employees + employee_roles, writeLog |
| `confirmDeactivateEmployee` | `(id, name)` | PIN confirm → is_active=false → invalidate sessions → writeLog |
| `renderPermissionMatrix` | `(targetDivId)` | Roles×permissions table, checkboxes editable by CEO only |
| `updateRolePermission` | `(roleId, permissionId, granted)` | requirePermission('settings.edit') → upsert role_permissions |
| `empSummaryCard` | `(label, value, color)` | Local helper — renders a summary stat card (renamed from summaryCard to avoid collision) |

---

## 3. Global Variables

### js/shared.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `sb` | SupabaseClient | `supabase.createClient(...)` | Supabase client instance |
| `T` | Object | `{ INV, PO, BRANDS, SUPPLIERS, EMPLOYEES, DOC_LINKS, PAY_ALLOC, PAY_METHODS, PREPAID_DEALS, PREPAID_CHECKS, ... }` | Table name constants (see DB Schema section) |
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
| `RECEIPT_GUIDE_TEXT` | String (const) | — | Employee quick-reference guide for goods receipt (Hebrew, multi-line) |
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
| `SYNC_LOG_PAGE_SIZE` | Number (const) | `20` | Sync log rows per page |
| `SOURCE_LABELS` | Object (const) | `{watcher:'🤖 Watcher', manual:'👤 ידני'}` | Sync source display labels |
| `STATUS_BADGES` | Object (const) | `{success:{...}, partial:{...}, error:{...}}` | Status badge config (icon, text, CSS class) |

### modules/access-sync/pending-panel.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `pendingSearchTimers` | Object | `{}` | pendingId → setTimeout ID for debounced search |

### modules/access-sync/pending-resolve.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `resolvePendingTarget` | Object/null | `null` | {pendingId, inventoryId, row} for current resolution |

### modules/stock-count/stock-count-list.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `SC_STATUS` | Object (const) | 3 entries | Maps status → {text, color} for badge rendering |

### modules/stock-count/stock-count-session.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `scSessionItems` | Array | `[]` | Loaded count items for current session |
| `scCountId` | String/null | `null` | Current count UUID |
| `scCountNumber` | String | `''` | Current count display number (SC-YYYY-NNNN) |
| `unknownBarcodes` | Array | `[]` | Barcodes scanned but not found in inventory |
| `activeWorker` | Object/null | `null` | {id, name} of PIN-verified worker |
| `scCodeReader` | Object/null | `null` | ZXing BrowserMultiFormatReader instance |
| `_lastScanCode` | String | `''` | Last scanned barcode for debounce |
| `_lastScanTime` | Number | `0` | Timestamp of last scan for debounce (2s window) |

### modules/admin/system-log.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `slogActionDropdownPopulated` | Boolean | `false` | Flag for one-time action dropdown population |
| `SLOG_PAGE_SIZE` | Number (const) | `50` | System log rows per page |
| `SLOG_ROW_CATEGORIES` | Object (const) | action → CSS category | Maps action types to entry/exit/edit/delete/restore categories |

### modules/suppliers-debt/debt-documents.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `_docData` | Array | `[]` | Cached supplier documents |
| `_docTypes` | Array | `[]` | Cached document types |
| `_docSuppliers` | Array | `[]` | Cached active suppliers for documents tab |
| `DOC_STATUS_MAP` | Object (const) | 5 entries | Maps status → {he, cls} for badge rendering |

### modules/suppliers-debt/debt-payments.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `_payData` | Array | `[]` | Cached supplier payments |
| `_paySuppliers` | Array | `[]` | Cached active suppliers for payments tab |
| `_payMethods` | Array | `[]` | Cached active payment methods |
| `_payAllocMap` | Object | `{}` | payment_id → [allocation] mapping |
| `_payDocMap` | Object | `{}` | document_id → document object lookup |
| `PAY_STATUS_MAP` | Object (const) | 5 entries | Maps payment status → {he, cls} for badge rendering |

### modules/suppliers-debt/debt-payment-wizard.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `_wizState` | Object | `{}` | Wizard state: supplierId, amount, taxRate, allocations, openDocs, etc. |

### modules/suppliers-debt/debt-prepaid.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `_prepaidDeals` | Array | `[]` | Cached prepaid deals |
| `_prepaidChecks` | Array | `[]` | Cached prepaid checks for all deals |
| `_prepaidSuppliers` | Array | `[]` | Cached active suppliers for prepaid tab |
| `DEAL_STATUS_MAP` | Object (const) | 3 entries | Maps deal status → {he, cls} for badge rendering |
| `CHECK_STATUS_MAP` | Object (const) | 4 entries | Maps check status → {he, cls} for badge rendering |

### modules/suppliers-debt/debt-dashboard.js (Phase 4g additions)

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `_supTabData` | Array | `[]` | Aggregated supplier rows: id, name, openCount, totalDebt, overdueAmt, nextDue, hasDeal, dealRemaining |

### modules/suppliers-debt/debt-supplier-detail.js

| Variable | Type | Initial Value | Description |
|----------|------|---------------|-------------|
| `_detailSupplierId` | String/null | `null` | Currently open supplier ID in detail view |
| `_detailSupplierName` | String | `''` | Name of currently open supplier |
| `_detailActiveTab` | String | `'timeline'` | Active sub-tab in detail view |

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
  → calls: renderAccessSyncTab(), loadSyncLog(), loadSyncSummary(), loadLastActivity(), loadPendingBadge() [access-sync.js]
  → calls: loadStockCountTab() [stock-count-list.js]
  → calls: resetExcelImport() [excel-import.js]

stock-count-list.js
  → reads: T.STOCK_COUNTS, T.INV, brandCacheRev, branchCode [shared.js]
  → calls: fetchAll(), batchCreate() [supabase-ops.js], showLoading(), hideLoading(), toast(), escapeHtml(), $() [shared.js]
  → calls: generateCountNumber() [self], openWorkerPin() [stock-count-session.js]

stock-count-session.js
  → reads: T.EMPLOYEES, T.STOCK_COUNTS, T.STOCK_COUNT_ITEMS [shared.js]
  → calls: fetchAll() [supabase-ops.js], showLoading(), hideLoading(), toast(), escapeHtml(), $(), confirmDialog() [shared.js]
  → calls: loadStockCountTab() [stock-count-list.js], showDiffReport() [stock-count-report.js]
  → uses: ZXing.BrowserMultiFormatReader (external CDN library)

stock-count-report.js
  → reads: T.EMPLOYEES, T.STOCK_COUNTS, T.STOCK_COUNT_ITEMS, scCountNumber [stock-count-session.js]
  → calls: fetchAll(), writeLog() [supabase-ops.js], showLoading(), hideLoading(), toast(), escapeHtml(), $(), confirmDialog() [shared.js]
  → calls: loadStockCountTab() [stock-count-list.js], openCountSession() [stock-count-session.js]
  → calls: sb.rpc('set_inventory_qty') [Supabase RPC]
  → uses: XLSX (SheetJS, external CDN library)

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
  → calls: loadReceiptTab() [goods-receipt.js]

receipt-confirm.js
  → calls: getReceiptItems() [receipt-form.js]
  → calls: saveReceiptDraftInternal() [receipt-actions.js]
  → calls: createDocumentFromReceipt() [receipt-debt.js]
  → calls: loadReceiptTab(), updatePOStatusAfterReceipt() [goods-receipt.js]
  → calls: refreshLowStockBanner() [data-loading.js]

receipt-debt.js
  → calls: fetchAll(), batchCreate() [supabase-ops.js]
  → reads: T.SUPPLIERS, T.DOC_TYPES, T.SUP_DOCS [shared.js]

receipt-excel.js
  → calls: addReceiptItemRow(), updateReceiptItemsStats(), getReceiptItems() [receipt-form.js]
  → calls: openExistingReceipt() [receipt-form.js]
  → calls: confirmReceiptById() [receipt-confirm.js], cancelReceipt() [receipt-actions.js]
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
  → reads: T.SYNC_LOG, T.PENDING_SALES, SOURCE_LABELS, STATUS_BADGES [self]

sync-details.js
  → calls: openSyncDetails(), downloadFailedFile() [self]
  → reads: T.SYNC_LOG, 'inventory_logs' (direct), T.INV, brandCacheRev [shared.js], SOURCE_LABELS, STATUS_BADGES [access-sync.js]
  → uses: sb.storage.from('failed-sync-files') [Supabase Storage]

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

### Supplier Debt Module

```
debt-dashboard.js
  → reads: T.SUP_DOCS, T.SUP_PAYMENTS [shared.js]
  → calls: sb.from() queries [Supabase direct], formatILS() [shared.js]
  → provides: loadDebtSummary()

debt-documents.js
  → reads: T.SUP_DOCS, T.DOC_TYPES, T.SUPPLIERS [shared.js]
  → calls: fetchAll() [supabase-ops.js], batchCreate() [supabase-ops.js]
  → calls: writeLog() [supabase-ops.js], verifyPinOnly() [auth-service.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), setAlert(), formatILS() [shared.js]
  → calls: sb.from() [Supabase direct — generateDocInternalNumber]
  → provides: loadDocumentsTab(), openNewDocumentModal(), closeAndRemoveModal(), viewDocument(), calcNewDocTotal()

debt-doc-link.js
  → reads: _docData, _docTypes [debt-documents.js]
  → calls: batchCreate() [supabase-ops.js], batchUpdate() [supabase-ops.js], writeLog() [supabase-ops.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), setAlert(), formatILS() [shared.js]
  → calls: closeAndRemoveModal(), loadDocumentsTab() [debt-documents.js]
  → provides: openLinkToInvoiceModal(), linkDeliveryToInvoice()

debt-payments.js
  → reads: T.SUP_PAYMENTS, T.PAY_METHODS, T.SUPPLIERS, T.PAY_ALLOC, T.SUP_DOCS [shared.js]
  → calls: fetchAll() [supabase-ops.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), formatILS() [shared.js]
  → calls: closeAndRemoveModal() [debt-documents.js]
  → provides: loadPaymentsTab(), applyPayFilters(), viewPayment()
  → provides: _paySuppliers, _payMethods, _payAllocMap, _payDocMap (used by wizard)

debt-payment-wizard.js
  → reads: _paySuppliers, _payMethods [debt-payments.js]
  → reads: T.SUP_DOCS [shared.js]
  → calls: fetchAll() [supabase-ops.js]
  → calls: escapeHtml(), $(), setAlert(), formatILS() [shared.js]
  → calls: closeAndRemoveModal() [debt-documents.js]
  → provides: openNewPaymentWizard(), _wizState, _wizRenderStep1(), _wizRenderStep2(), _wizCalcTax()

debt-payment-alloc.js
  → reads: _wizState [debt-payment-wizard.js]
  → reads: _payMethods [debt-payments.js]
  → reads: T.SUP_DOCS, T.SUP_PAYMENTS, T.PAY_ALLOC [shared.js]
  → calls: fetchAll() [supabase-ops.js], batchCreate() [supabase-ops.js], batchUpdate() [supabase-ops.js]
  → calls: writeLog() [supabase-ops.js], verifyPinOnly() [auth-service.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), setAlert(), formatILS() [shared.js]
  → calls: closeAndRemoveModal() [debt-documents.js]
  → calls: _wizRenderStep2() [debt-payment-wizard.js]
  → calls: loadPaymentsTab() [debt-payments.js], loadDebtSummary() [debt-dashboard.js]
  → provides: _wizGoStep3(), autoAllocateFIFO(), _wizSavePayment()

debt-prepaid.js
  → reads: T.PREPAID_DEALS, T.PREPAID_CHECKS, T.SUPPLIERS [shared.js]
  → calls: fetchAll() [supabase-ops.js], batchCreate() [supabase-ops.js], batchUpdate() [supabase-ops.js]
  → calls: writeLog() [supabase-ops.js], verifyPinOnly() [auth-service.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), setAlert(), formatILS() [shared.js]
  → calls: closeAndRemoveModal() [debt-documents.js]
  → provides: loadPrepaidTab(), openNewDealModal(), openAddCheckModal(), viewDealDetail(), updateCheckStatus()

debt-supplier-detail.js
  → reads: T.SUPPLIERS, T.SUP_DOCS, T.SUP_PAYMENTS, T.PREPAID_DEALS, T.DOC_TYPES, T.PAY_METHODS [shared.js]
  → reads: DOC_STATUS_MAP [debt-documents.js], PAY_STATUS_MAP [debt-payments.js]
  → calls: fetchAll() [supabase-ops.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), formatILS() [shared.js]
  → provides: openSupplierDetail(), closeSupplierDetail(), loadSupplierTimeline(),
    loadSupplierDocuments(), loadSupplierPayments(), loadSupplierReturns()
  → calls: loadReturnsForSupplier() [debt-returns.js]

debt-returns.js
  → reads: T.SUP_RETURNS, T.SUP_RETURN_ITEMS [shared.js]
  → reads: supplierNumCache [shared.js], _detailSupplierId [debt-supplier-detail.js]
  → calls: fetchAll() [supabase-ops.js], batchUpdate() [supabase-ops.js]
  → calls: writeLog() [supabase-ops.js], verifyPinOnly() [auth-service.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), formatILS(), closeModal() [shared.js]
  → calls: sb.from() [shared.js] (for return number query)
  → provides: loadReturnsForSupplier(), renderReturnsTable(), viewReturnDetail(),
    promptReturnStatusUpdate(), updateReturnStatus(), generateReturnNumber(),
    RETURN_TYPE_MAP, RETURN_STATUS_MAP

inventory-return.js
  → reads: invSelected [inventory-table.js], brandCacheRev, supplierCacheRev [shared.js]
  → reads: T.INV, T.SUP_RETURNS, T.SUP_RETURN_ITEMS [shared.js]
  → calls: fetchAll() [supabase-ops.js], batchCreate() [supabase-ops.js]
  → calls: writeLog() [supabase-ops.js], verifyPinOnly() [auth-service.js]
  → calls: sb.rpc('decrement_inventory') [shared.js]
  → calls: showLoading(), hideLoading(), toast(), escapeHtml(), $(), closeModal() [shared.js]
  → calls: updateSelectionUI() [inventory-edit.js], loadInventoryPage() [inventory-table.js]
  → calls: generateReturnNumber() [debt-returns.js]
  → provides: openSupplierReturnModal(), _doConfirmSupplierReturn()

suppliers-debt.html (inline script)
  → calls: loadSession(), hasPermission() [auth-service.js]
  → calls: loadDebtSummary() [debt-dashboard.js]
  → calls: loadSuppliersTab() [debt-dashboard.js]
  → calls: loadDocumentsTab() [debt-documents.js]
  → calls: loadPaymentsTab() [debt-payments.js]
  → calls: loadPrepaidTab() [debt-prepaid.js]
  → provides: switchDebtTab()
```

---

## 5. Database Schema

> **Note (Phase 4a):** All tables below have `tenant_id UUID NOT NULL REFERENCES tenants(id)`. JWT-based RLS tenant isolation is active on all tables. 11 new tables added in Phase 4a for supplier debt tracking. For full SQL DDL → see db-schema.sql.

| Table | Constant | Key Columns | Relationships |
|-------|----------|-------------|---------------|
| `tenants` | `T.TENANTS` | id (uuid PK), name, slug, default_currency, timezone, locale, is_active, created_at | ← all tables via tenant_id FK |
| `inventory` | `T.INV` | id (uuid PK), barcode (unique), brand_id (FK→brands), supplier_id (FK→suppliers), model, size, bridge, color, temple_length, product_type, sell_price, sell_discount, cost_price, cost_discount, quantity, status, website_sync, origin, notes, is_deleted, deleted_at, deleted_by, deleted_reason, tenant_id, created_at | → brands.id, → suppliers.id, ← inventory_images.inventory_id, ← inventory_logs.inventory_id, ← goods_receipt_items.inventory_id |
| `brands` | `T.BRANDS` | id (uuid PK), name, brand_type (luxury/brand), default_sync (full/display/no), active (bool), exclude_website (bool), min_stock_qty (int) | ← inventory.brand_id, ← purchase_order_items.brand_id |
| `suppliers` | `T.SUPPLIERS` | id (uuid PK), name, active (bool), supplier_number (unique int, >= 10), default_document_type, default_currency, payment_terms_days, has_prepaid_deal, withholding_tax_rate (022), tax_exempt_certificate (022), tax_exempt_until (022) | ← inventory.supplier_id, ← purchase_orders.supplier_id, ← goods_receipts.supplier_id, ← supplier_documents.supplier_id, ← supplier_payments.supplier_id, ← supplier_returns.supplier_id, ← prepaid_deals.supplier_id |
| `employees` | `T.EMPLOYEES` | id (uuid PK), name, pin, role, branch_id, is_active, email, phone, created_by (FK→employees), last_login, failed_attempts, locked_until, created_at | ← employee_roles.employee_id, ← auth_sessions.employee_id |
| `inventory_logs` | (direct table ref) | id (uuid PK), action, inventory_id (FK→inventory, nullable), details (jsonb), employee, branch, created_at | → inventory.id |
| `inventory_images` | (direct table ref) | id (uuid PK), inventory_id (FK→inventory), url | → inventory.id |
| `purchase_orders` | `T.PO` | id (uuid PK), po_number (unique, format PO-{supNum}-{seq}), supplier_id (FK→suppliers), status (draft/sent/partial/received/cancelled), notes, expected_date, created_at | → suppliers.id, ← purchase_order_items.po_id, ← goods_receipts.po_id |
| `purchase_order_items` | `T.PO_ITEMS` | id (uuid PK), po_id (FK→purchase_orders), brand_id (FK→brands), model, size, color, quantity, unit_cost, discount, sell_price, sell_discount, website_sync, product_type, bridge, temple_length, qty_received | → purchase_orders.id, → brands.id |
| `goods_receipts` | `T.RECEIPTS` | id (uuid PK), receipt_number, type (delivery_note/invoice/tax_invoice), status (draft/confirmed/cancelled), supplier_id (FK→suppliers), po_id (FK→purchase_orders, nullable), notes, total_amount, branch, created_at | → suppliers.id, → purchase_orders.id, ← goods_receipt_items.receipt_id |
| `goods_receipt_items` | `T.RCPT_ITEMS` | id (uuid PK), receipt_id (FK→goods_receipts), inventory_id (FK→inventory, nullable), barcode, brand, model, color, size, quantity, unit_cost, sell_price, website_sync, is_new_item (bool) | → goods_receipts.id, → inventory.id |
| `sync_log` | `T.SYNC_LOG` | id (uuid PK), filename, source_ref (watcher/manual), status (success/partial/error), rows_total, rows_success, rows_pending, rows_error, errors (JSONB), storage_path (TEXT), error_message, processed_at, created_at | ← access-sales.js checks for duplicate filenames, ← sync-details.js reads for detail modal |
| `pending_sales` | `T.PENDING_SALES` | id (uuid PK), barcode, quantity, action_type (sale/return), order_number, sale_date, source_ref, sync_log_id, status (pending/resolved/ignored), resolved_inventory_id, resolution_note, created_at | → sync_log.id (implicit), → inventory.id (resolved) |
| `watcher_heartbeat` | `T.HEARTBEAT` | id (int PK, always 1), last_beat, watcher_version, host | Single-row table for watcher status monitoring |
| `stock_counts` | `T.STOCK_COUNTS` | id (uuid PK), count_number (unique, SC-YYYY-NNNN), count_date, status (in_progress/completed/cancelled), counted_by, total_items, total_diffs, branch_id, completed_at, created_at | ← stock_count_items.count_id |
| `stock_count_items` | `T.STOCK_COUNT_ITEMS` | id (uuid PK), count_id (FK→stock_counts), inventory_id (FK→inventory), barcode, brand, model, color, size, expected_qty, actual_qty, difference (generated), status (pending/counted/skipped), scanned_by, counted_at | → stock_counts.id, → inventory.id |
| `roles` | — | id (text PK: ceo/manager/team_lead/worker/viewer), name_he, description, is_system (bool), created_at | ← role_permissions.role_id, ← employee_roles.role_id, ← auth_sessions.role_id |
| `permissions` | — | id (text PK: e.g. 'inventory.view'), module, action, name_he, description, created_at | ← role_permissions.permission_id |
| `role_permissions` | — | role_id (FK→roles, PK), permission_id (FK→permissions, PK), granted (bool) | → roles.id, → permissions.id |
| `employee_roles` | — | employee_id (FK→employees, PK), role_id (FK→roles, PK), granted_by (FK→employees), granted_at | → employees.id, → roles.id |
| `auth_sessions` | — | id (uuid PK), employee_id (FK→employees), token (unique), permissions (jsonb), role_id, branch_id, created_at, expires_at, last_active, is_active | → employees.id |
| `document_types` | `T.DOC_TYPES` | id (uuid PK), code (unique per tenant), name_he, name_en, affects_debt (increase/decrease/none), is_system, is_active | Configurable document type registry. Seeded: invoice, delivery_note, credit_note, receipt |
| `payment_methods` | — | id (uuid PK), code (unique per tenant), name_he, name_en, is_system, is_active | Configurable payment method registry. Seeded: bank_transfer, check, cash, credit_card |
| `currencies` | — | id (uuid PK), code (unique per tenant), name_he, symbol, is_default, is_active | Configurable currency registry. Seeded: ILS (default), USD, EUR |
| `supplier_documents` | `T.SUP_DOCS` | id (uuid PK), supplier_id (FK→suppliers), document_type_id (FK→document_types), document_number, document_date, due_date, received_date, currency, exchange_rate, subtotal, vat_rate, vat_amount, total_amount, parent_invoice_id (FK→self), file_url, goods_receipt_id (FK→goods_receipts), po_id (FK→purchase_orders), status (open/partially_paid/paid/linked/cancelled), paid_amount, internal_number (022), is_deleted. UNIQUE(tenant_id, supplier_id, document_number) (022) | → suppliers, → document_types, → goods_receipts, → purchase_orders, ← document_links, ← payment_allocations |
| `document_links` | `T.DOC_LINKS` | id (uuid PK), parent_document_id (FK→supplier_documents), child_document_id (FK→supplier_documents), amount_on_invoice | Maps delivery notes to monthly invoices |
| `supplier_payments` | `T.SUP_PAYMENTS` | id (uuid PK), supplier_id (FK→suppliers), amount, currency, exchange_rate, payment_date, payment_method, reference_number, prepaid_deal_id (FK→prepaid_deals), withholding_tax_rate (022), withholding_tax_amount (022), net_amount (022), status (approved/pending/rejected) (022), approved_by (FK→employees) (022), approved_at (022), is_deleted | → suppliers, → prepaid_deals, → employees, ← payment_allocations |
| `payment_allocations` | — | id (uuid PK), payment_id (FK→supplier_payments), document_id (FK→supplier_documents), allocated_amount | Many-to-many: payments ↔ documents |
| `prepaid_deals` | — | id (uuid PK), supplier_id (FK→suppliers), deal_name, start_date, end_date, total_prepaid, currency, total_used, total_remaining, alert_threshold_pct, alert_threshold_amt, status (active/completed/cancelled), is_deleted | → suppliers, ← prepaid_checks, ← supplier_payments |
| `prepaid_checks` | — | id (uuid PK), prepaid_deal_id (FK→prepaid_deals), check_number, amount, check_date, status (pending/cashed/bounced/cancelled), cashed_date | → prepaid_deals |
| `supplier_returns` | — | id (uuid PK), supplier_id (FK→suppliers), return_number, return_type (agent_pickup/ship_to_supplier/pending_in_store), reason, status (pending/ready_to_ship/shipped/received_by_supplier/credited), credit_document_id (FK→supplier_documents), credit_amount, is_deleted | → suppliers, → supplier_documents, ← supplier_return_items |
| `supplier_return_items` | — | id (uuid PK), return_id (FK→supplier_returns), inventory_id (FK→inventory), barcode, quantity, brand_name, model, color, size, cost_price | → supplier_returns, → inventory |

---

## 6. Key Patterns

### PIN Verification Flow

All quantity changes, deletions, and pending resolutions require employee PIN verification.

**Pattern:**
1. Modal opens with PIN input field
2. User enters PIN
3. Code queries `sb.from(T.EMPLOYEES).select('id, name').eq('pin', pin).eq('is_active', true)`
4. If no match → error toast, return
5. If match → proceed with action, store employee name in `sessionStorage('prizma_user')`
6. Employee name is passed to `writeLog()` via sessionStorage

**Files using this pattern:** qty-modal.js (`confirmQtyChange`), audit-log.js (`confirmSoftDelete`, `confirmPermanentDelete`), inventory-edit.js (`confirmBulkDelete`), inventory-reduction.js (`confirmReduction`), pending-resolve.js (`confirmResolvePending`), stock-count-session.js (`confirmWorkerPin`), stock-count-report.js (`confirmCount` — requires role IN admin/manager)

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
// Current pattern (qty-modal.js, receipt-confirm.js, etc.)
const { data } = await sb.from('inventory').select('quantity').eq('id', id).single();
const newQty = data.quantity + amount;
await sb.from('inventory').update({ quantity: newQty }).eq('id', id);
```

**Risk:** Race condition if two users modify the same item simultaneously. The second write overwrites the first.

**✅ Fixed (Goal 0):** Migrated to Supabase RPC with atomic SQL increment/decrement:
- `increment_inventory(inv_id, delta)` — `quantity = quantity + delta` (012)
- `decrement_inventory(inv_id, delta)` — `quantity = GREATEST(0, quantity - delta)` (012)
- `set_inventory_qty(inv_id, new_qty)` — `quantity = new_qty` (013, stock count approval)
- Migrations: `012_atomic_qty_rpc.sql`, `013_stock_count.sql`

**Files updated:** qty-modal.js (`confirmQtyChange`), receipt-confirm.js (`confirmReceiptCore`), inventory-reduction.js (`processRedExcel`, `confirmReduction`), pending-resolve.js (`confirmResolvePending`), access-sales.js (`processAccessSalesFile`), stock-count-report.js (`confirmCount` via `set_inventory_qty`), sync-watcher.js (watcher uses `increment_inventory`/`decrement_inventory`)
**Files remaining (future):** po-view-import.js (`importPOToInventory`)
