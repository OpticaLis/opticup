# Changelog — מלאי מסגרות

> כל השינויים במודול מלאי מסגרות מהתחלה ועד v1.0

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
