# מלאי מסגרות — Module Spec
## גרסה 2.0 | מרץ 2026

---

## 1. סקירה כללית

**מודול מלאי מסגרות** הוא הליבה של מערכת Optic Up — מנהל את כל מחזור החיים של מסגרות משקפיים במלאי: כניסה, מעקב, עריכה, מכירה, מחיקה ושחזור.

**סטאק טכנולוגי:**
- Frontend: Vanilla JS (no framework), index.html (shell) + 7 JS modules + CSS
- Backend: Supabase (PostgreSQL + REST API), client = `sb`
- Excel: SheetJS (xlsx) לייבוא/ייצוא
- Deploy: GitHub Pages → https://opticalis.github.io/prizma-inventory/

**קבצים:**
```
index.html              — HTML shell + nav + modals + script tags
css/styles.css          — all styles
js/shared.js            — Supabase init, constants, caches, utilities (load FIRST)
js/inventory-core.js    — inventory reduction (Excel + manual) + main inventory table
js/inventory-entry.js   — inventory entry forms (manual + Excel import)
js/goods-receipt.js     — goods receipt module + system log viewer
js/audit-log.js         — soft delete, recycle bin, item history, qty modal
js/brands-suppliers.js  — brands management + suppliers management
js/purchase-orders.js   — purchase orders (CRUD, export, import to inventory)
js/admin.js             — admin mode toggle + app init (DOMContentLoaded)
```

---

## 2. DB Schema Summary

### 2.1 `inventory` — מלאי ראשי (`T.INV`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה ייחודי |
| barcode | TEXT UNIQUE (WHERE NOT NULL) | ברקוד BBDDDDD |
| brand_id | UUID FK → brands | מותג |
| supplier_id | UUID FK → suppliers | ספק |
| model, size, bridge, color, temple_length | TEXT | מאפייני מסגרת |
| product_type | TEXT CHECK (eyeglasses / sunglasses) | סוג מוצר |
| sell_price, sell_discount | NUMERIC | מחיר מכירה + הנחה |
| cost_price, cost_discount | NUMERIC | מחיר עלות + הנחה |
| quantity | INTEGER NOT NULL DEFAULT 0 | כמות במלאי |
| website_sync | TEXT CHECK (full / display / none) | סנכרון אתר |
| status | TEXT CHECK (in_stock / sold / ordered / pending_barcode / pending_images) | סטטוס |
| brand_type | TEXT CHECK (luxury / brand / regular) | סוג מותג |
| origin, woocommerce_id, notes | TEXT / INTEGER / TEXT | שדות נוספים |
| is_deleted, deleted_at, deleted_by, deleted_reason | BOOLEAN / TIMESTAMPTZ / TEXT / TEXT | Soft delete |
| branch_id, created_by | UUID | מערכת |
| created_at, updated_at | TIMESTAMPTZ | חותמות זמן |

### 2.2 `brands` — מותגים (`T.BRANDS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| name | TEXT NOT NULL UNIQUE | שם חברה |
| brand_type | TEXT CHECK (luxury / brand / regular) | סוג מותג |
| default_sync | TEXT CHECK (full / display / none) | סנכרון ברירת מחדל |
| active | BOOLEAN DEFAULT TRUE | פעיל |
| exclude_website | BOOLEAN DEFAULT FALSE | מוחרג מאתר |
| min_stock_qty | INTEGER DEFAULT NULL | סף מלאי מינימלי |

### 2.3 `suppliers` — ספקים (`T.SUPPLIERS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| name | TEXT NOT NULL UNIQUE | שם ספק |
| supplier_number | INTEGER UNIQUE | מספר ספק (≥ 10) |
| active | BOOLEAN DEFAULT TRUE | פעיל |
| contact, phone, mobile, email, address, tax_id, payment_terms, notes | TEXT | פרטי קשר |
| rating | SMALLINT CHECK (1-5) | דירוג |

### 2.4 `employees` — עובדים (`T.EMPLOYEES`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| name | TEXT NOT NULL | שם עובד |
| pin | TEXT NOT NULL | קוד PIN |
| role | TEXT DEFAULT 'employee' | תפקיד (employee / manager / admin) |
| is_active | BOOLEAN DEFAULT true | פעיל |

ברירת מחדל: מנהל ראשי, PIN 1234, role admin

### 2.5 `inventory_logs` — לוג פעולות (`T.LOGS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| action | TEXT NOT NULL | סוג פעולה (19 סוגים) |
| inventory_id | UUID FK → inventory ON DELETE SET NULL | פריט |
| barcode, brand, model | TEXT | snapshot |
| qty_before, qty_after | INTEGER | שינוי כמות |
| price_before, price_after | NUMERIC | שינוי מחיר |
| reason, source_ref | TEXT | סיבה + מקור |
| performed_by | TEXT DEFAULT 'system' | מבצע |
| branch_id | TEXT | סניף |
| created_at | TIMESTAMPTZ | חותמת זמן |

### 2.6 `inventory_images` — תמונות (`T.IMAGES`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| inventory_id | UUID FK → inventory ON DELETE CASCADE | פריט |
| url | TEXT NOT NULL | כתובת תמונה |

### 2.7 `purchase_orders` — הזמנות רכש (`T.PO`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| po_number | TEXT NOT NULL UNIQUE | מספר הזמנה: PO-{supplier_number}-{seq} |
| supplier_id | UUID NOT NULL FK → suppliers | ספק |
| order_date | DATE DEFAULT CURRENT_DATE | תאריך הזמנה |
| expected_date | DATE | תאריך משלוח צפוי |
| status | TEXT CHECK (draft / sent / partial / received / cancelled) | סטטוס |
| notes | TEXT | הערות |

### 2.8 `purchase_order_items` — פריטי הזמנה (`T.PO_ITEMS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| po_id | UUID FK → purchase_orders ON DELETE CASCADE | הזמנה |
| brand, model, color, size, bridge, temple_length | TEXT | מאפייני פריט |
| product_type | TEXT CHECK (eyeglasses / sunglasses) | סוג מוצר |
| qty_ordered, qty_received | INTEGER | כמויות |
| unit_cost, discount_pct | DECIMAL | עלות |
| sell_price, sell_discount | DECIMAL | מכירה |
| website_sync | TEXT CHECK (full / display / none) | סנכרון |

### 2.9 `goods_receipts` — קבלות סחורה (`T.RECEIPTS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| receipt_number | TEXT NOT NULL | מספר קבלה |
| receipt_type | TEXT DEFAULT 'delivery_note' | סוג (delivery_note / invoice / tax_invoice) |
| supplier_id | UUID FK → suppliers | ספק |
| po_id | UUID FK → purchase_orders ON DELETE SET NULL | קישור להזמנת רכש |
| status | TEXT DEFAULT 'draft' | סטטוס (draft / confirmed / cancelled) |

### 2.10 `goods_receipt_items` — פריטי קבלה (`T.RECEIPT_ITEMS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| receipt_id | UUID FK → goods_receipts ON DELETE CASCADE | קבלה |
| inventory_id | UUID FK → inventory ON DELETE SET NULL | פריט מלאי |
| barcode, brand, model, color, size | TEXT | מאפייני פריט |
| quantity | INTEGER DEFAULT 1 | כמות |
| unit_cost, sell_price | DECIMAL | מחירים |
| is_new_item | BOOLEAN DEFAULT false | פריט חדש |

---

## 3. Function List (per file)

### 3.1 js/shared.js — Infrastructure

**Globals:** `sb`, `T`, `suppliers`, `brands`, `isAdmin`, `maxBarcode`, `branchCode`, `FIELD_MAP`, `FIELD_MAP_REV`, `ENUM_MAP`, `ENUM_REV`, `supplierCache`, `supplierCacheRev`, `supplierNumCache`, `brandCache`, `brandCacheRev`, `activeDropdown`, `slogPage`, `slogTotalPages`, `slogCurrentFilters`, `rcptRowNum`, `currentReceiptId`, `rcptEditMode`, `rcptViewOnly`, `window.lowStockData`, `window.brandSyncCache`

| Function | Description |
|----------|-------------|
| `loadLookupCaches()` | Fetches suppliers (with supplier_number) + brands into caches |
| `loadData()` | Initial data load: caches, brands, brandSyncCache, max barcode |
| `loadMaxBarcode()` | Branch-scoped barcode sequence from inventory |
| `rowToRecord(row)` | DB row → app record conversion |
| `fieldsToRow(fields)` | App fields → DB row conversion |
| `enToHe(field, val)` | English enum → Hebrew |
| `heToEn(field, val)` | Hebrew enum → English |
| `fetchAll(table, filters, select, order)` | Paginated Supabase query |
| `batchCreate(table, rows)` | Bulk insert |
| `batchUpdate(table, rows)` | Bulk update |
| `writeLog(action, inventoryId, details)` | Audit logging engine (async, non-blocking) |
| `showLoading(msg)` / `hideLoading()` | Loading overlay |
| `$(id)` | document.getElementById shorthand |
| `toast(msg, type)` | Toast notifications — 's' success, 'e' error, 'w' warning |
| `setAlert(containerId, msg, type)` | Inline alert |
| `confirmDialog(msg)` | Async confirm modal → Promise\<boolean\> |
| `showTab(tabId)` / `showEntryMode(mode)` | Tab / mode navigation |
| `populateDropdowns()` | Rebuild brand/supplier dropdowns across all tabs |
| `activeBrands()` | Returns active brands filtered list |
| `supplierOpts()` | Returns supplier options for dropdowns |
| `getBrandType(name)` | Returns brand type (Hebrew) for brand name |
| `getBrandSync(name)` | Returns brand default sync (Hebrew) for brand name |
| `createSearchSelect(config)` | Reusable searchable dropdown component (fixed-position) |
| `loadLowStockAlerts()` | Fetches brands below min_stock_qty |
| `refreshLowStockBanner()` | Updates low stock banner in nav |
| `openLowStockModal()` | Opens low stock details modal |

### 3.2 js/inventory-core.js — Inventory Reduction + Main Table

**Globals:** `redExcelData`, `redExcelFileName`, `redSearchResults`, `REDUCE_REASONS`, `reduceModalState`, `invData`, `invFiltered`, `invChanges`, `invSelected`, `invSortField`, `invSortDir`

| Function | Description |
|----------|-------------|
| **Reduction — Excel** | |
| `handleRedExcel(input)` | Reads uploaded xlsx file |
| `processRedExcel()` | Loops rows by barcode, reduces qty for sync=מלא items |
| **Reduction — Manual** | |
| `loadModelsForBrand(brandName)` | Populates model datalist for selected brand |
| `loadSizesAndColors(brandName, model)` | Populates size/color datalists |
| `searchManual()` | Search by barcode or brand+model+size+color (filters is_deleted=false) |
| `openReductionModal(recId)` | Opens PIN-verified reduction modal with reason select |
| `confirmReduction()` | Validates amount/reason/PIN, updates DB, writes log |
| **Inventory Table** | |
| `loadInventoryTab()` | Fetches all inventory with brand/supplier joins |
| `filterInventoryTable()` | Applies search + filter dropdowns |
| `renderInventoryRows()` | Renders table with inline editing, selection, sorting |
| `sortInventory(field)` | Toggle column sort |
| `invEdit(id, field, value)` | Inline cell editing |
| `invEditSync(id, value)` | Inline sync field editing |
| `saveInventoryChanges()` | Saves pending changes with writeLog for price/detail edits |
| `showImagePreview(urls)` | Image preview modal |
| **Bulk Operations** | |
| `toggleRowSelect(id, checked)` | Toggle row selection |
| `applyBulkUpdate()` | Bulk update selected rows (sync, status, etc.) |
| `bulkDelete()` | Soft-delete selected rows with PIN |

### 3.3 js/inventory-entry.js — Entry Forms

**Globals:** `entryRowNum`, `excelImportRows`, `excelImportFileName`, `excelPendingRows`, `lastGeneratedBarcodes`

| Function | Description |
|----------|-------------|
| **Manual Entry** | |
| `addEntryRow()` | Adds entry card with brand/supplier/model/size/color fields |
| `copyEntryRow(rowId)` | Duplicates a card with data |
| `removeEntryRow(rowId)` | Removes entry card |
| `getEntryRows()` | Collects all card data into array |
| `validateEntryRows(rows)` | Validates required fields + image required for brand type + image required for sync=מלא/תדמית |
| `submitEntry()` | Inserts inventory rows, generates barcodes, writes logs |
| **Barcode** | |
| `generateBarcodes(rows)` | BBDDDDD format, reuses barcodes for same brand+model+size+color. Validates sell price > 0 before generating |
| **Excel Import** | |
| `handleExcelImport(input)` | Parses xlsx, maps columns, shows preview |
| `confirmExcelImport()` | Inserts parsed rows |
| `showExcelResultsModal(results)` | Shows import results |
| `generatePendingBarcodes()` | Generates barcodes for imported rows |
| `exportPendingBarcodes()` | Exports generated barcodes to xlsx |
| **Excel Export** | |
| `exportBarcodesExcel(barcodes)` | Exports barcode list to xlsx |
| `exportInventoryExcel()` | Exports current inventory to xlsx |
| `openExcelFormatPopup()` / `closeExcelFormatPopup()` | Sample format download popup |

### 3.4 js/goods-receipt.js — Goods Receipt + System Log

**Globals:** `SLOG_PAGE_SIZE`, `SLOG_ROW_CATEGORIES`, `slogActionDropdownPopulated`, `RCPT_TYPE_LABELS`, `RCPT_STATUS_LABELS`, `rcptLinkedPoId`

| Function | Description |
|----------|-------------|
| **System Log** | |
| `loadSystemLog()` | Paginated log viewer with filters |
| `slogPageNav(delta)` | Page navigation |
| `exportSystemLog()` | Export logs to xlsx |
| `populateActionDropdown()` | One-time action filter population |
| `getSystemLogFilters()` | Returns current filter state |
| `clearSystemLogFilters()` | Resets all filters |
| `applySlogFilters()` | Applies filters and reloads |
| **Goods Receipt** | |
| `loadReceiptTab()` | Loads receipt list |
| `openNewReceipt()` | Starts new receipt form |
| `openExistingReceipt(id)` | Opens receipt for editing |
| `searchReceiptBarcode()` | Find inventory item by barcode for receipt |
| `addReceiptItemRow(item)` | Adds item row to receipt with sync select (auto-set from brand) + image input (new items only). Rejects duplicate barcodes |
| `getReceiptItems()` | Collects receipt item data (incl. sync, images). Throws on qty < 1 |
| `saveReceiptDraft()` | Saves receipt as draft. Validates sell price > 0 |
| `saveReceiptDraftInternal()` | Internal draft save (called by confirmReceipt flow) |
| `confirmReceipt()` | Validates sell price + images for sync items, then calls confirmReceiptCore |
| `confirmReceiptCore(receiptId, rcptNumber, poId)` | Shared confirm logic: processes items (qty update for existing, create for new), writeLog, update PO status |
| `cancelReceipt()` | Cancels receipt |
| `handleReceiptExcel()` | Import items from xlsx |
| `exportReceiptExcel()` | Export receipt to xlsx |
| `backToReceiptList()` | Returns to receipt list view |
| `createNewInventoryFromReceiptItem()` | Creates new inventory item with barcode from receipt. Uses brand default sync via getBrandSync() |
| `updateReceiptItemsStats()` | Updates item count/total display below receipt table |
| **PO Linkage** | |
| `loadPOsForSupplier(supplierId)` | Loads POs for receipt-PO linking |
| `onReceiptPoSelected()` | Handles PO selection, populates items |
| `updatePOStatusAfterReceipt(poId)` | Updates PO status after receipt confirmation |

### 3.5 js/audit-log.js — Soft Delete, Recycle Bin, History, Qty Modal

**Globals:** `ACTION_MAP`, `softDelTarget`, `historyCache`, `ENTRY_ACTIONS`, `QTY_REASONS_ADD`, `QTY_REASONS_REMOVE`, `qtyModalState`

| Function | Description |
|----------|-------------|
| **Soft Delete** | |
| `deleteInvRow(id)` | Initiates soft delete with PIN |
| `confirmSoftDelete()` | PIN-verified soft delete with reason and writeLog |
| **Recycle Bin** | |
| `openRecycleBin()` | Shows deleted items |
| `restoreItem(id)` | Restores soft-deleted item |
| `permanentDelete(id)` | Double-PIN permanent delete |
| **Item History** | |
| `openItemHistory(id)` | Timeline view of item changes |
| `exportHistoryExcel()` | Export history to xlsx |
| **Entry History** | |
| `openEntryHistory()` | Entry log grouped by date (accordion) |
| `loadEntryHistory()` | Fetches entry log data |
| `renderEntryHistory()` | Renders accordion groups |
| `toggleHistGroup(date)` | Expand/collapse date group |
| `exportDateGroupBarcodes(date)` | Export barcodes for a date group |
| **Qty Modal** | |
| `openQtyModal(id, direction)` | Opens add/remove qty modal with PIN + reason |
| `confirmQtyChange()` | Validates, updates qty, writes log |

### 3.6 js/brands-suppliers.js — Brands + Suppliers Management

**Globals:** `allBrandsData`, `brandsEdited`, `brandStockByBrand`, `supplierEditMode`

| Function | Description |
|----------|-------------|
| **Brands** | |
| `loadBrandsTab()` | Parallel fetch brands + stock data, builds allBrandsData |
| `renderBrandsTable()` | Applies 4 filters (active/sync/type/low-stock), renders with inline editing |
| `setBrandActive(brandId, isActive)` | Immediate DB save on active toggle |
| `addBrandRow()` | Adds new brand row to allBrandsData |
| `saveBrands()` | Saves all changes (existing updates + new inserts), reloads caches, rebuilds brandSyncCache |
| `saveBrandField(input)` | Immediate save for min_stock_qty |
| **Suppliers** | |
| `loadSuppliersTab()` | Renders supplier list (read or edit mode) |
| `toggleSupplierNumberEdit()` | Enters supplier number edit mode |
| `cancelSupplierNumberEdit()` | Cancels edit mode |
| `saveSupplierNumbers()` | Validates, checks PO lock, saves via temp negative swap |
| `getNextSupplierNumber()` | Lowest available number ≥ 10 (gap-filling) |
| `addSupplier()` | Creates supplier with auto-assigned number |

### 3.7 js/purchase-orders.js — Purchase Orders

**Globals:** `poData`, `poFilters`, `currentPO`, `currentPOItems`

| Function | Description |
|----------|-------------|
| **PO List** | |
| `loadPurchaseOrdersTab()` | Fetches POs with supplier join |
| `renderPoList(container)` | Renders PO list with summary cards + table |
| `poSummaryCard(label, value, color)` | Summary card HTML |
| `applyPoFilters(data)` | Filters by status/supplier |
| `populatePoSupplierFilter()` | Populates supplier filter dropdown |
| **PO CRUD** | |
| `generatePoNumber(supplierId)` | Format: PO-{supplierNum}-{4-digit-seq} |
| `openNewPurchaseOrder()` | Two-step wizard: supplier → items |
| `proceedToPOItems()` | Step 2: generates PO number, opens item editor |
| `openEditPO(id)` | Loads PO for editing |
| `renderPOForm(isEdit)` | Renders PO header form |
| `resolveSupplierName()` | Resolves supplier UUID to name |
| `initPoSupplierSelect()` | Searchable supplier dropdown for PO |
| `savePODraft()` | Saves/updates PO as draft |
| `sendPurchaseOrder(id)` | Marks PO as sent |
| `cancelPO(id)` | Cancels PO |
| `openViewPO(id)` | Read-only PO view |
| **PO Items** | |
| `ensurePOBrandDatalist()` | Populates brand datalist |
| `loadPOModelsForBrand(i, brandName)` | Cascading model dropdown |
| `loadPOColorsAndSizes(i, brandName, model)` | Cascading color/size |
| `renderPOItemsTable()` | Renders PO item rows with inline editing |
| `updatePOTotals()` | Recalculates PO totals |
| `addPOItemManual()` | Adds empty PO item row |
| `addPOItemByBarcode()` | Adds PO item from existing inventory barcode |
| `removePOItem(index)` | Removes PO item |
| `duplicatePOItem(i)` | Duplicates PO item row |
| `togglePOItemDetails(i)` | Expand/collapse item details |
| **Export / Import** | |
| `exportPOExcel()` | Exports PO to xlsx |
| `exportPOPdf()` | Exports PO to PDF |
| `importPOToInventory(poId)` | Creates inventory items from PO |
| `createPOForBrand(brandId, brandName)` | Creates PO from low stock modal |

### 3.8 js/admin.js — Admin Mode + App Init

| Function | Description |
|----------|-------------|
| `toggleAdmin()` | Prompts for password (1234) |
| `checkAdmin()` | Checks sessionStorage for admin state |
| `activateAdmin()` | Activates admin mode UI |
| `openHelpModal()` / `closeHelpModal()` | Help modal |
| DOMContentLoaded | Restores admin, sets dates, calls `loadData()` then `addEntryRow()` + `refreshLowStockBanner()` |

---

## 4. Business Logic Rules

### 4.1 ברקוד BBDDDDD
- **BB** = 2 ספרות קוד סניף (00-99), **DDDDD** = 5 ספרות רצות (00001-99999)
- מקסימום: 99,999 פריטים לסניף
- **שימוש חוזר**: אם קיים פריט זהה (מותג+דגם+גודל+צבע) עם כמות > 0, הברקוד נעשה שימוש חוזר
- **ולידציה**: בדיקת כפילויות בתוך ה-batch + מול ה-DB לפני INSERT

### 4.2 כמות — Add/Remove עם PIN
- **כלל ברזל**: כמות לא ניתנת לעריכה ישירה. רק דרך ➕➖ עם PIN
- **Flow**: ➕/➖ → modal (כמות + סיבה חובה + הערה + PIN) → אימות PIN מול employees → עדכון DB → writeLog
- **Over-remove protection**: לא ניתן להוריד יותר מהכמות הנוכחית
- **סיבות הוספה** (QTY_REASONS_ADD): קבלת סחורה, החזרה מלקוח, ספירת מלאי, תיקון טעות, אחר
- **סיבות הוצאה** (QTY_REASONS_REMOVE): מכירה, העברה לסניף, פגום/אבדן, ספירת מלאי, תיקון טעות, אחר

### 4.3 הורדת מלאי — Reduction
- **Excel**: upload xlsx → parse by barcode → reduce qty for sync=מלא items → summary
- **Manual**: cascading brand → model → size+color → search → reduction modal
- **Reduction modal**: amount ≤ current qty, reason (REDUCE_REASONS), PIN verification → update DB → writeLog
- **REDUCE_REASONS**: נמכר, נשבר, לא נמצא, נשלח לזיכוי, הועבר לסניף אחר

### 4.4 Soft Delete + סל מחזור
- **Flow**: 🗑️ → modal (סיבה + הערה + PIN) → is_deleted=true + deleted_at/by/reason → writeLog
- **שחזור**: is_deleted=false + ניקוי deleted_* fields + writeLog
- **מחיקה לצמיתות**: double PIN → DELETE מה-DB → writeLog (inventory_id → NULL בגלל ON DELETE SET NULL)
- כל שאילתות מלאי מסננות `is_deleted = false`

### 4.5 Audit Trail — writeLog
- כל פעולה שמשנה מלאי חייבת writeLog(action, inventoryId, details)
- async ו-non-blocking — לעולם לא חוסם את הפעולה הראשית
- 19 סוגי actions:

| קטגוריה | actions |
|---------|---------|
| כניסה | entry_manual, entry_po, entry_excel, entry_receipt, transfer_in |
| יציאה | sale, credit_return, manual_remove, transfer_out |
| עריכה | edit_qty, edit_price, edit_details, edit_barcode, edit_sync |
| מחיקה | soft_delete, permanent_delete |
| שחזור | restore |
| בדיקה | test |

### 4.6 אימות PIN
- Query: `sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle()`
- נדרש עבור: soft delete, permanent delete, add/remove quantity, inventory reduction
- כשל: הודעת שגיאה "סיסמת עובד שגויה"
- הצלחה: שם העובד נשמר ב-log (performed_by)

### 4.7 קבלת סחורה — flow מלא
1. יצירת קבלה חדשה (סוג מסמך + מספר + ספק + תאריך)
2. קישור אופציונלי להזמנת רכש (loadPOsForSupplier → onReceiptPoSelected)
3. הוספת פריטים: חיפוש ברקוד / שורה ידנית / ייבוא Excel
4. שמירת טיוטה → goods_receipts (status=draft) + goods_receipt_items
5. ולידציה לפני אישור:
   - מחיר מכירה חובה בכל שורה
   - פריטים חדשים עם סנכרון=מלא/תדמית חייבים תמונה
   - מותג + דגם חובה לפריטים חדשים
6. אישור (confirmReceiptCore):
   - פריט קיים: UPDATE inventory SET quantity += item.quantity; writeLog('entry_receipt')
   - פריט חדש: יצירת ברקוד → INSERT inventory (website_sync מברירת מחדל של מותג) → writeLog('entry_receipt')
7. updatePOStatusAfterReceipt — עדכון סטטוס הזמנת רכש
8. נעילה: status=confirmed → UI readonly
9. ביטול: רק draft → status=cancelled

### 4.8 הזמנות רכש — flow מלא
1. **Two-step wizard**: step 1 = select supplier, step 2 = generate PO# + edit items
2. **PO number format**: PO-{supplier_number}-{4-digit sequential} per supplier
3. **Cascading dropdowns**: brand → model → color + size (queries inventory for distinct values)
4. **Statuses**: draft → sent → partial/received/cancelled
5. **Export**: Excel + PDF for supplier delivery
6. **Import to inventory**: importPOToInventory — creates inventory items from PO
7. **Low stock integration**: createPOForBrand from low stock modal

### 4.9 מותגים
- **allBrandsData** = full dataset (includes `currentQty` per brand), **brandsEdited** = filtered view for rendering
- **4 filters**: active (פעיל/לא פעיל/הכל), sync, type, low stock (מתחת לסף/מעל הסף/ללא סף/הכל)
- **brandSyncCache**: `window.brandSyncCache` = { brand_name → default_sync }, rebuilt in loadData() and saveBrands()
- **setBrandActive** = immediate DB save on checkbox toggle
- **saveBrandField** = immediate save for min_stock_qty
- **saveBrands** = batch save for all other fields (name, type, sync, exclude_website)
- **Stock qty column**: aggregated inventory qty per brand, red+⚠️ if below min_stock_qty

### 4.10 ספקים
- **supplier_number**: UNIQUE integer ≥ 10, auto-assigned via gap-filling (getNextSupplierNumber)
- **Edit mode**: toggle to show number inputs, save validates (≥ 10, no duplicates)
- **PO lock**: cannot change supplier number if supplier has existing purchase orders
- **Temp negative swap**: saves use temporary negative values to avoid UNIQUE constraint violations

### 4.11 Immediate Save vs. Batch Save
- **Immediate**: setBrandActive(), saveBrandField(), setBrandActive() — saved to DB on change
- **Batch**: brands table edits (saveBrands), inventory table edits (saveInventoryChanges) — require explicit "Save" button

### 4.12 Hebrew↔English Maps
- **FIELD_MAP** / **FIELD_MAP_REV** — column name translation (e.g., ברקוד ↔ barcode)
- **ENUM_MAP** / **ENUM_REV** — enum value translation (e.g., במלאי ↔ in_stock)
- Helpers: `enToHe(field, val)` / `heToEn(field, val)`
- Every new DB field must be added to FIELD_MAP

---

## 5. Known Issues

1. **loadPOsForSupplier console warning** — when receipt tab loads without a supplier selected, may log a warning about missing supplier_id. Non-blocking.
2. **RLS פתוח** — all tables use `USING (true)` — needs hardening with auth
3. **branch_id inconsistency** — some tables UUID, some TEXT
4. **No employee CRUD** — only default PIN 1234, no management UI
5. **Images** — basic upload only, no edit/delete/reorder from UI
