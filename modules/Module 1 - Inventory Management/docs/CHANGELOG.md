# Changelog — מלאי מסגרות

> כל השינויים במודול מלאי מסגרות מהתחלה ועד היום

---

## v3.0 — Phase 3: Auth & Permissions

Date: March 2026

Commits: e0d7a28, 31b2bac, 450d5b5, 0c34bd5, 6b74bc4, b21067c, 2706d4d, c850392, cd8dd04, 908111a, 98ff6c7, 8c4d4d7, 3b167ee, 253f0f2, a21145f

### DB (migration 016)
- New tables: roles (5 system roles: ceo, manager, team_lead, worker, viewer)
- New tables: permissions (35 granular permissions across 9 modules)
- New tables: role_permissions (94 default role→permission mappings)
- New tables: employee_roles, auth_sessions (token-based, 8h expiry)
- ALTER employees: added email, phone, branch_id, created_by, last_login, failed_attempts, locked_until
- RLS: added INSERT/UPDATE/DELETE policies on employees table
- pin_length CHECK constraint added but commented out (pre-production TODO)
- Added purchase_order.view permission (was missing, caused PO tab to be hidden)

### New Files
- js/auth-service.js — 287 lines, 14 functions: full auth engine
- modules/employees/employee-list.js — 283 lines, 8 functions: employee CRUD + permission matrix

### Features
- Login screen: 5-box PIN modal, fullscreen overlay, session restore on reload
- Session management: token-based, 8h expiry, permission snapshot in sessionStorage
- PIN lockout: 5 failed attempts → sessionStorage lock + server-side locked_until (15min)
- Role-based access: 5 roles with 35 granular permissions across 9 modules
- UI guards: 10 nav tabs + 21 action buttons gated by data-permission attributes
- Employee management screen: add/edit/deactivate, role assignment, permission matrix
- User display button: shows logged-in employee name + logout on click
- Dev bypass: ?dev_bypass=opticup2024 (TODO: remove before production)

### Refactoring
- 8 legacy PIN call sites replaced with verifyEmployeePIN()
- admin.js: removed toggleAdmin(), checkAdmin() — replaced with hasPermission('settings.edit')
- writeLog(): auto-populates employee_id from getCurrentEmployee()
- loadData(): session guard added (returns early if no active session)
- stock-count-session.js: skips PIN modal if active session exists
- empSummaryCard: renamed from summaryCard to avoid global name collision with access-sync.js

### QA
- 32 E2E tests run across all 5 roles
- 29/32 passed on first run
- 3 bugs found and fixed: purchase_order.view missing, summary cards "undefined", PIN lockout client-side only

### Deferred to Future Features
- impersonateUser, previewUIAsRole, generatePermissionSnapshot
- writePermissionLog, validateActionIntegrity
- Rate limiting, multi-branch roles, custom permission groups
- Supabase Auth, configurable session timeout

---

## [Phase 2b] — 2026-03-11

### Added
- scripts/sync-watcher.js — InventorySync Folder Watcher (chokidar, idempotency guards, 30s debounce)
- modules/access-sync/sync-details.js — sync details modal, failed file download via Supabase Storage
- Supabase Storage bucket: failed-sync-files
- migrations/015 — storage_path + errors columns on sync_log

### Changed
- modules/access-sync/access-sync.js — full sync screen with summary cards, log table, action buttons
- scripts/sync-watcher.js — uploads failed files to Supabase Storage

## [Phase 2 fixes] — 2026-03-11

### Fixed
- Stock count: PIN verified before count created in DB
- Stock count: unscanned items now appear in diff report as "לא נספר"
- Stock count: unified smart search field (brand/model/color/barcode)
- Sync watcher: idempotency guards prevent duplicate DB rows
- Sync watcher: 30-second cooldown prevents duplicate file processing

---

## [Phase 2a] — 2026-03-11

### Added
- modules/stock-count/stock-count-list.js — list screen, summary cards, generateCountNumber (SC-YYYY-NNNN), startNewCount
- modules/stock-count/stock-count-session.js — worker PIN entry, camera scanning (ZXing), handleScan, updateCountItem
- modules/stock-count/stock-count-report.js — diff report, confirmCount (manager PIN + RPC + writeLog), cancelCount, exportCountExcel
- migrations/013_stock_count.sql — stock_counts + stock_count_items tables
- migrations/014_stock_count_scanned_by.sql — added scanned_by column to stock_count_items
- Supabase RPC: set_inventory_qty(inv_id, new_qty)

### Changed
- index.html — added 📊 ספירת מלאי tab + ZXing library
- js/shared.js — added T.STOCK_COUNTS, T.STOCK_COUNT_ITEMS

---

## [Goal 0] — 2026-03-10

### Changed
- `receipt-actions.js` — `confirmReceiptCore()`: atomic increment via RPC
- `qty-modal.js` — `confirmQtyChange()`: atomic increment/decrement via RPC
- `pending-resolve.js` — `confirmResolvePending()`: atomic increment/decrement via RPC
- `inventory-reduction.js` — `processRedExcel()`: atomic decrement via RPC
- `inventory-reduction.js` — `confirmReduction()`: atomic decrement via RPC

### Added
- `migrations/012_atomic_qty_rpc.sql` — `increment_inventory` + `decrement_inventory` RPC functions

---

## Phase 1: Airtable Era (V1.1A → V1.6A)

### V1.3A — Initial Release
**Commit:** `e6a68b8` | 2026-03-08 08:36
- **Initial commit** — Prizma Optics inventory system V1.3A
- Single-file HTML app connected to Airtable
- 6 tabs: הכנסת מלאי, הורדת מלאי, הזמנת רכש, מלאי ראשי, ניהול מותגים, ניהול ספקים
- Hebrew RTL, dark blue + white + gray theme
- Admin mode with password 1234
- API token stored in code

### V1.4A — Bulk Operations
**Commit:** `37102fc` | 2026-03-08 10:00
- Inventory table: bulk operations (select multiple → bulk update/delete)
- Cleaner columns layout
- Test data integration (1,189 items from Excel)

### V1.5A — Token Security
**Commit:** `4fe4f0c` | 2026-03-08 10:43
- API token moved from code to localStorage
- Token entry modal on first use
- Logout button added

### V1.6A — Sync & Sorting
**Commit:** `f40bb03` | 2026-03-08 11:05
- Sync field editing (website_sync dropdown)
- Image preview modal
- Column sorting (click header → asc/desc/none)
- Sync validation logic

---

## Phase 2: Supabase Migration (V1.7A)

### V1.7A — Backend Migration
**Commit:** `ca6e023` | 2026-03-08 15:20
- **Complete migration from Airtable to Supabase**
- PostgreSQL schema with proper types, FKs, constraints
- Compatibility layer: rowToRecord/fieldsToRow/fetchAll/batchCreate
- Hebrew↔English field mapping (FIELD_MAP)
- Enum mapping (ENUM_MAP) for product_type, status, website_sync, brand_type
- Supplier/brand lookup caches (name↔UUID)
- 1,189 records migrated via upload script

---

## Phase 3: Barcode System

### Unique Barcode Validation
**Commit:** `a7cf013` | 2026-03-08 19:09
- UNIQUE constraint on barcode (WHERE NOT NULL)
- Duplicate detection: within batch + against DB

### Barcode Format BBDDDDD
**Commit:** `e5d9037` | 2026-03-08 19:19
- New format: 2-digit branch code + 5-digit sequence
- `loadMaxBarcode()` — scans all barcodes in branch prefix
- Reuse barcode for duplicate items (same brand+model+size+color)
- Max 99,999 items per branch

---

## Phase 4: Excel & Export

### Export to Excel
**Commit:** `c1e0621` | 2026-03-08 19:22
- `exportInventoryExcel()` — filtered inventory to .xlsx
- Hebrew column headers
- SheetJS (xlsx) library

### Excel Bulk Import
**Commit:** `ceab6ac` | 2026-03-08 19:30
- `handleExcelImport()` — parse Excel with column name normalization
- Hebrew/English column aliases
- Required field validation
- Preview table with stats and error display
- `confirmExcelImport()` — batch create with writeLog

### Mobile Responsive
**Commit:** `ec9fd53` | 2026-03-08 19:37
- Nav bar horizontal scroll on mobile
- Tables responsive with horizontal scroll
- Forms stack vertically on small screens

### Inventory Module v1.0
**Commit:** `9c9f45e` | 2026-03-08 19:40
- Module milestone marker

---

## Phase 5: Audit & Logs Module

### pg_trgm + Brand Exclusion
**Commit:** `1b1381f` | 2026-03-08 20:14
- `CREATE EXTENSION pg_trgm` for fuzzy text search
- GIN indexes on model and color columns
- `exclude_website` field added to brands table

### Schema: Logs + Employees + Soft Delete
**Commit:** `188aea1` | 2026-03-08 20:26
- `employees` table with PIN authentication
- `inventory_logs` table — 15 action types, qty/price before/after tracking
- Soft delete columns on inventory (is_deleted, deleted_at/by/reason)
- Migration file: `002_logs_and_soft_delete.sql`
- Default admin employee: מנהל ראשי, PIN 1234

### writeLog Engine + Action Hooks
**Commit:** `65489f9` | 2026-03-08 20:31
- `writeLog(action, inventoryId, details)` function
- ACTION_MAP constant — 16 action types with icon/label/color
- Integrated into: submitEntry (entry_manual), submitFromPO (entry_po), confirmExcelImport (entry_excel), saveInventoryChanges (edit_*), markSold (sale)
- Non-blocking async — never blocks main operations

### Soft Delete with PIN + Recycle Bin
**Commit:** `d8ce2f8` | 2026-03-08 20:41
- `confirmSoftDelete()` — PIN verification, is_deleted=true, log
- `openRecycleBin()` — view deleted items
- `restoreItem()` — restore with log
- `permanentDelete()` — double PIN, DELETE + log
- Deleted items filtered out of main inventory view

### Item History Modal
**Commit:** `bf46750` | 2026-03-08 20:48
- 📋 button per inventory row
- `openItemHistory()` — colored timeline of all actions
- `exportHistoryExcel()` — export to Excel
- Color-coded by action category (green/red/blue/gray/amber)

### System Log Screen
**Commit:** `46e4107` | 2026-03-08 21:04
- Admin-only tab "📋 לוג מערכת"
- 4 summary cards (active count, entries/deletions/edits this week)
- 6 filters: date range, branch, action, employee, free text
- Paginated table (50 rows/page)
- Color-coded rows by category
- `exportSystemLog()` — Excel export with filters

### Audit & Logs v1.0
**Commit:** `39595f3` | 2026-03-08 21:18
- Full smoke test passed (7 tests)
- writeLog, soft delete, recycle bin, item history, system log all verified
- RLS policies added: DELETE + UPDATE on inventory_logs
- Migration file updated with new policies

---

## Phase 6: Quantity Control

### Add/Remove Quantity with PIN
**Commit:** `0649848` | 2026-03-08 21:35
- Quantity cell made readonly — no direct edit allowed
- ➕➖ buttons (admin-only) with modal
- `openQtyModal(inventoryId, mode)` — add/remove with reason dropdown
- `confirmQtyChange()` — PIN verification, over-remove protection
- writeLog('edit_qty') for every quantity change
- Stripped כמות from saveInventoryChanges() — enforces ➕➖ only
- writeLog added to Red Excel sales path (processRedExcel)

---

## Phase 7: Goods Receipt

### Goods Receipt Module
**Commit:** `eab834d` | 2026-03-08 22:25
- DB: `goods_receipts` + `goods_receipt_items` tables with RLS
- Migration: `003_goods_receipts.sql`
- New tab "📦 קבלת סחורה" (visible to all)
- 2-step flow: receipt list → receipt form
- Receipt types: תעודת משלוח, חשבונית, חשבונית מס
- Barcode search → existing item auto-fill
- Manual add → new item with generated barcode
- Excel import for receipt items
- `confirmReceipt()` — full flow: save → process items → update inventory → writeLog('entry_receipt')
- Draft/Confirmed/Cancelled status management
- View-only mode for confirmed/cancelled
- Summary cards: drafts, confirmed this week, items received
- ACTION_MAP: added `entry_receipt` (17th action type)
- SLOG_ROW_CATEGORIES: added entry_receipt → 'entry' category

---

## Phase 8: Architecture — Modularize + DB Prep

### Module v1.0 Docs Archive
**Commit:** `50d49de` | 2026-03-08
- Archived Module 1 — Inventory Management docs (SPEC, CHANGELOG, schema, guide)

### Snapshot v1.0 + Cleanup
**Commit:** `a0aa965` | 2026-03-09
- Snapshot of monolith before split
- Archived legacy scripts/data/schema to subdirs

### Repo Cleanup
**Commit:** `d832a68` | 2026-03-09
- Moved legacy scripts, data files, and schema files to organized subdirs

### Extract CSS
**Commit:** `a8e9bbc` | 2026-03-09
- All styles extracted from index.html to `css/styles.css`

### Split into 7 JS Modules
**Commit:** `bf7a3a8` | 2026-03-09
- Monolith index.html split into 7 JS files:
  - `js/shared.js` — Supabase init, constants, caches, utilities
  - `js/inventory-core.js` — inventory reduction + main table
  - `js/inventory-entry.js` — entry forms (manual + Excel)
  - `js/goods-receipt.js` — goods receipt + system log
  - `js/audit-log.js` — soft delete, recycle bin, history, qty modal
  - `js/brands-suppliers.js` — brands + suppliers management
  - `js/admin.js` — admin mode + app init
- index.html now just HTML shell + script tags

### DB Prep — min_stock_qty + Remove contact_lenses
**Commit:** `62542d4` | 2026-03-09
- Migration: `brands.min_stock_qty` integer column added
- Removed contact_lenses product type references

### Brands — min_stock_qty Inline Editing
**Commit:** `c26be57` | 2026-03-09
- `saveBrandField()` — immediate save on min_stock_qty input change
- Placeholder shows default threshold by brand type (יוקרה=5, מותג=15)

---

## Phase 9: Purchase Orders Module

### DB Schema for Purchase Orders
**Commit:** `6c39f2c` | 2026-03-09
- `purchase_orders` table (po_number, supplier_id, status, notes, etc.)
- `purchase_order_items` table (po_id, brand_id, model, size, color, quantity, cost_price, etc.)
- `po_id` FK added to goods_receipts for PO→receipt linkage
- Migration: `005_purchase_orders.sql`

### PO List View + Summary Cards
**Commit:** `e4763dd` | 2026-03-09
- New tab "הזמנות רכש" with summary cards (draft/sent/received counts)
- Filterable PO list by status + supplier
- Color-coded status badges

### PO Form — Create/Edit Draft with Items
**Commit:** `2750ab3` | 2026-03-09
- PO creation and editing form
- Item rows with brand, model, size, color, quantity, cost price
- Draft save functionality

### Fix: po_number Field Name
**Commits:** `d647715`, `41f5000` | 2026-03-09
- Renamed order_number → po_number in FIELD_MAP and legacy PO entry flow

### PO Status Management
**Commit:** `0087908` | 2026-03-09
- `sendPurchaseOrder()` — marks PO as sent
- `cancelPO()` — cancels PO
- `openViewPO()` — read-only view for sent/received POs
- `openEditPO()` — edit mode for drafts

### CLAUDE.md Project Guide
**Commit:** `6c13809` | 2026-03-09
- Added initial CLAUDE.md with project structure, rules, and conventions

### Remove Legacy PO Tab
**Commit:** `dad9ec6` | 2026-03-09
- Removed old "הזמנת רכש" tab and all legacy PO functions
- Replaced with new purchase-orders.js module

### Refactor: Goods Receipt into Entry Tab
**Commit:** `90a467f` | 2026-03-09
- Moved קבלת סחורה from standalone tab into הכנסת מלאי as third entry mode
- Entry tab now has 3 modes: manual, Excel import, goods receipt

---

## Phase 10: Inventory Reduction Improvements

### Fix: Entry Audit Issues
**Commit:** `3574460` | 2026-03-09
- Fixed status handling in entry flow
- Fixed barcode generation edge cases
- Cleaned dead code

### Reduction — Model Dropdown + PIN + Reasons + writeLog
**Commit:** `dd1b585` | 2026-03-09
- `loadModelsForBrand()` — brand-based model datalist
- `openReductionModal()` / `confirmReduction()` — replaces old markSold()
- REDUCE_REASONS: נמכר, נשבר, לא נמצא, נשלח לזיכוי, הועבר לסניף אחר
- PIN verification via employees table
- writeLog('sale') with reason tracking

### Reduction — Cascading Size + Color Dropdowns
**Commit:** `e046dd0` | 2026-03-09
- `loadSizesAndColors(brandName, model)` — populates size/color datalists
- Full cascading chain: brand → model → size + color

---

## Phase 11: Excel Import + Entry History

### Excel Import — Barcode-First Flow
**Commit:** `6488c8f` | 2026-03-09
- Barcode matching: existing items get qty increment, new items go to pending list
- `generatePendingBarcodes()` / `exportPendingBarcodes()` — barcode generation for new items
- `showExcelResultsModal()` — results summary with stats

### Help Modal
**Commit:** `98efebe` | 2026-03-09
- `openHelpModal()` / `closeHelpModal()` — operating instructions modal
- Help button in nav bar

### Entry History Modal
**Commit:** `1655338` | 2026-03-09
- `openEntryHistory()` — browse entries grouped by date (accordion)
- `renderEntryHistory()` — timeline view per date group
- `toggleHistGroup(date)` — expand/collapse date groups
- `exportDateGroupBarcodes(date)` — export barcodes for a specific date

---

## Phase 12: PO Enhancements

### Bug Fixes — PO + Entry History
**Commit:** `847f1bc` | 2026-03-09
- `loadPOsForSupplier()` guard for missing supplier_id
- Entry history accordion UI fixes

### PO Form — Two-Step Wizard + Brand Datalist
**Commit:** `51a7486` | 2026-03-09
- Two-step wizard: step 1 = select supplier, step 2 = generate PO# + edit items
- `proceedToPOItems()` bridges the two steps
- `ensurePOBrandDatalist()` — brand datalist for PO items
- Fixed duplicate row issues

### PO Items — Cascading Dropdowns + Stock Alert + Validation
**Commit:** `e6eb96c` | 2026-03-09
- `loadPOModelsForBrand()` / `loadPOColorsAndSizes()` — cascading dropdowns
- Low stock alert integration in PO item rows
- Required field validation before save
- Deduplication of PO items

### PO Export — Excel + PDF
**Commit:** `fdd6da5` | 2026-03-09
- `exportPOExcel()` — PO to xlsx with supplier info + item details
- `exportPOPdf()` — PO to PDF for supplier delivery

### Excel Import — Format Popup
**Commit:** `b45e010` | 2026-03-09
- `openExcelFormatPopup()` / `closeExcelFormatPopup()` — sample format guide
- Replaces old direct sample file download

---

## Phase 13: Supplier + Brand Management

### Supplier Numbers + PO Format + View Export
**Commit:** `281141e` | 2026-03-09
- `supplier_number` column (UNIQUE, ≥ 10) on suppliers table
- PO number format: `PO-{supplier_number}-{4-digit-seq}`
- Export buttons available in PO view mode

### Supplier Numbers — Edit Mode + PO Lock + Swap
**Commit:** `561d144` | 2026-03-09
- `toggleSupplierNumberEdit()` / `cancelSupplierNumberEdit()` — edit mode toggle
- `saveSupplierNumbers()` — validation (≥ 10, no duplicates), PO lock check, temp negative swap for UNIQUE constraint
- `getNextSupplierNumber()` — gap-filling (lowest available ≥ 10)
- Rollback on save failure

### Brands — Stock Qty Column with Low Stock Highlight
**Commit:** `2ceb635` | 2026-03-09
- `brandStockByBrand` — aggregated inventory qty per brand
- Stock qty column in brands table
- Color logic: red + ⚠️ if below min_stock_qty, green if above, default if no min set

### Brands — Active Field + Filter Bar + Toggle
**Commit:** `2271728` | 2026-03-09
- Migration: `009_brands_active.sql` — `brands.active` boolean column
- `allBrandsData[]` + `brandsEdited[]` — full dataset vs filtered view
- 3 filter dropdowns: active (פעיל/לא פעיל/הכל), sync, type
- `setBrandActive()` — immediate DB save on checkbox toggle
- Filter count label

---

## Phase 14: Documentation

### CLAUDE.md — Full Module Map
**Commit:** `3793842` | 2026-03-09
- Comprehensive project guide: file structure, DB tables, all modules with functions + globals
- 12 documented conventions
- Known issues section

---

## Phase 1.5: Improvements & Bug Fixes

### CLAUDE.md — Brands Filter Conventions
**Commit:** `a6b01de` | 2026-03-09
- Updated CLAUDE.md conventions section with brands filter documentation
- Documented `allBrandsData[]`, `renderBrandsTable()` filter logic, `setBrandActive()` pattern

### Brands — Low Stock Filter
**Commit:** `e7b86b3` | 2026-03-09
- Added 4th filter dropdown `brand-filter-low-stock` to brands table
- Options: הכל / מתחת לסף / מעל הסף / ללא סף
- `renderBrandsTable()` now applies 4 filters (active, sync, type, low stock)
- Uses `currentQty` vs `min_stock_qty` comparison from `allBrandsData`

### Goods Receipt — Bug Fixes (4 fixes)
**Commit:** `d9a251a` | 2026-03-09
- **writeLog fix**: `confirmReceiptCore()` now passes `null` as inventoryId for receipt-level logs instead of PO id
- **Confirm refactor**: extracted `confirmReceiptCore(receiptId, rcptNumber, poId)` as shared logic for both `confirmReceipt()` (DOM-based) and `confirmReceiptById()` (DB-based)
- **Duplicate barcode check**: `addReceiptItemRow()` and `searchReceiptBarcode()` now reject items with barcodes already in the receipt table
- **Qty=0 validation**: `getReceiptItems()` now throws on qty < 1 instead of silently defaulting to 1; all callers wrapped in try/catch

### Sell Price + Sync + Image Validations
**Commit:** `5bfb824` | 2026-03-09
- **Sell price required in goods receipt**: `confirmReceipt()` and `saveReceiptDraft()` block on missing sell price
- **Sell price required before barcode**: `generateBarcodes()` validates sell price > 0 before generating
- **brandSyncCache**: `loadData()` and `saveBrands()` build `window.brandSyncCache` (brand name → default sync)
- **Receipt sync field**: `addReceiptItemRow()` adds sync select (auto-set from brand default) + image file input (new items only)
- **Image validation**: `confirmReceipt()` blocks new items with sync=מלא/תדמית missing images; `validateEntryRows()` adds sync-based image check
- **Brand default sync**: `createNewInventoryFromReceiptItem()` uses `getBrandSync()` instead of hardcoded `'none'`
- Receipt table headers updated: +סנכרון, +תמונות columns

---

## פאזה 2 — גשר Access

### Migration 010: Access Bridge Tables
**Commit:** `dbc44fa` | 2026-03-09
- 3 new tables: `sync_log`, `pending_sales`, `watcher_heartbeat`
- `sync_log` — tracks each imported file with row counts and status
- `pending_sales` — holds rows whose barcode was not found in inventory
- `watcher_heartbeat` — single-row table for watcher uptime monitoring
- Indexes on created_at, filename, status, order_number
- RLS policies (all open for now)
- Migration: `010_access_bridge.sql`

### Access Sync Tab — Skeleton
**Commit:** `ae41e1a` | 2026-03-09
- New tab "🔄 סנכרון Access" with heartbeat status, sync log table, pending badge
- `js/access-sync.js` — new module file
- `loadHeartbeat()` — green/red/gray indicator based on watcher_heartbeat.last_beat
- `loadSyncLog()` — displays sync history with status badges
- `loadPendingBadge()` — COUNT pending WHERE status='pending', updates button style

### Pending Sales Panel — Resolve, Search, Ignore
**Commit:** `7a25bd5` | 2026-03-09
- `renderPendingPanel()` — overlay with cards per pending sale
- `loadSuggestions()` — up to 5 barcode-matched inventory suggestions
- `resolvePending()` — maps pending row to inventory item, updates qty
- `toggleFreeSearch()` / `runPendingSearch()` — free text search fallback
- `ignorePending()` — marks pending row as "not in inventory"

### Inventory Core — Access Sales Excel Import
**Commit:** `2ccdffe` | 2026-03-09
- `processAccessSalesFile(workbook, filename)` in inventory-core.js
- Detects `sales_template` sheet, skips 2 metadata rows
- Validates barcode, qty, date, order_number per row
- Barcode found → updates inventory qty + writeLog
- Barcode not found → inserts into pending_sales
- Creates sync_log entry with final row counts

### Goods Receipt — Export to Access Excel
**Commit:** `4ad76c5` | 2026-03-09
- `exportReceiptToAccess(receiptId)` in goods-receipt.js
- Exports confirmed receipt items as Excel with `new_inventory` sheet
- 📤 button visible only on confirmed receipts in list view

### Scripts — Sync Watcher
**Commit:** `0e1888a` | 2026-03-10
- `scripts/sync-watcher.js` — Node.js file watcher using chokidar
- Watches Dropbox folder for .xlsx/.xls files
- Processes `sales_template` sheet → inventory updates / pending_sales
- Retry logic (3 attempts, 30s delay) for network errors
- Heartbeat every 5min to watcher_heartbeat table
- Graceful SIGTERM/SIGINT shutdown
- `scripts/config.json` (gitignored) + `scripts/config.example.json`
- `scripts/package.json` with chokidar, xlsx, supabase-js dependencies

### Scripts — Windows Service + README
**Commit:** `5e7379b` | 2026-03-10
- `scripts/install-service.js` / `scripts/uninstall-service.js` — node-windows service wrapper
- `scripts/README.md` — Hebrew installation guide
- OpticTop folder path structure for Dropbox sync

### Migration 011 — Inventory Logs Sale Fields
**Commit:** `528183e` | 2026-03-10
- 12 new columns on `inventory_logs`: sale_amount, discount, discount_1, discount_2, final_amount, coupon_code, campaign, employee_id, lens_included, lens_category, order_number, sync_filename
- `writeLog()` in shared.js updated to accept 13 additional Access sale fields
- `sync-watcher.js` direct INSERT updated with same fields
- Migration: `011_inventory_logs_sale_fields.sql`

### Fix HIGH — Config Leak, Crash Risk, Security Gates
**Commit:** `977b87d` | 2026-03-10
- `scripts/config.json` added to .gitignore + untracked from git
- `scripts/config.example.json` created with placeholder key
- `moveToProcessed()` wrapped in try/catch with copy+delete fallback
- `resolvePending()` gated with confirmDialog + PIN verification

### Fix MEDIUM — Pagination, Optimistic Lock, Dedup, Labels, Table Names
**Commit:** `3ffbb0c` | 2026-03-10
- `loadSyncLog()` rewritten with `.range()` pagination (20 rows/page)
- `resolvePending()` uses optimistic lock: UPDATE WHERE status='pending' before inventory changes
- Duplicate filename check changed from `.eq()` to `.ilike()` (case-insensitive) in both web + watcher
- `SOURCE_LABELS` map for source_ref display (🤖 Watcher / 👤 ידני)
- `TABLES` const in sync-watcher.js — replaced all hardcoded table name strings

### Fix LOW — Error Logging, XSS, Dead Code, Heartbeat Refresh
**Commit:** `7dbef27` | 2026-03-10
- `processAccessSalesFile()` row-level catch now logs `console.warn` with barcode
- Duplicate check catch replaced with warning + toast instead of silent proceed
- All inline `onclick`/`oninput` handlers in access-sync.js replaced with `data-*` attributes + delegated event listeners (XSS prevention)
- Removed dead `patterns[1]` computation in `loadSuggestions()`
- Removed unused `orderNumber` parameter from `ignorePending()`
- Added `startHeartbeatRefresh()` / `stopHeartbeatRefresh()` with 60s auto-refresh interval
