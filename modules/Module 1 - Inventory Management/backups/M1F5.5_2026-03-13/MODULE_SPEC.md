# מלאי מסגרות — Module Spec
## גרסה 5 | מרץ 2026 | Post-Phase 5

> **Authority:** Business logic flows and screen descriptions. For code details → MODULE_MAP.md. For DB schema → db-schema.sql. For rules → CLAUDE.md.

---

## 1. סקירה כללית

**מודול מלאי מסגרות** הוא הליבה של מערכת Optic Up — מנהל את כל מחזור החיים של מסגרות משקפיים במלאי: כניסה, מעקב, עריכה, מכירה, מחיקה, שחזור, ספירת מלאי, סנכרון עם Access, ומעקב חובות ספקים.

**סטאק טכנולוגי:**
- Frontend: Vanilla JS (no framework), 56 JS modules + CSS
- Backend: Supabase (PostgreSQL + REST API + RPC + Edge Functions), client = `sb`
- Auth: PIN → Edge Function (pin-auth) → signed JWT with tenant_id claim
- Excel: SheetJS (xlsx) לייבוא/ייצוא
- Barcode: ZXing (camera-based scanning for stock count)
- Deploy: GitHub Pages → https://opticalis.github.io/opticup/
- Watcher: Node.js + chokidar (Dropbox folder watcher for Access sync)
- Multi-tenant: tenant_id UUID NOT NULL on all tables, JWT-based RLS

For complete file index → see MODULE_MAP.md section 1.

---

## 2. DB Schema Summary

לסכימה המלאה (columns, types, constraints, RLS) → ראה **db-schema.sql**.

כל הטבלאות מכילות `tenant_id UUID NOT NULL` מאז פאזה 3.75. JWT-based RLS tenant isolation פעיל על כל 36 הטבלאות.

**טבלאות עיקריות (pre-Phase 4):** tenants, inventory, brands, suppliers, employees, inventory_logs, inventory_images, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, sync_log, pending_sales, watcher_heartbeat, stock_counts, stock_count_items, roles, permissions, role_permissions, employee_roles, auth_sessions.

**טבלאות Phase 4:** document_types, payment_methods, currencies, supplier_documents, document_links, supplier_payments, payment_allocations, prepaid_deals, prepaid_checks, supplier_returns, supplier_return_items.

**טבלאות Phase 5 (AI Agent):** ai_agent_config, supplier_ocr_templates, ocr_extractions, alerts, weekly_reports.

**RPC Functions:** `increment_inventory`, `decrement_inventory`, `set_inventory_qty`, `generate_daily_alerts`.

**Supabase Storage:** bucket `failed-sync-files` for failed Access sync files, bucket `supplier-docs` for scanned invoices.

**Edge Functions:**
- `pin-auth` — validates PIN server-side, returns signed JWT with tenant_id claim
- `ocr-extract` — Claude Vision API integration, extracts invoice fields from scanned documents

---

## 3. Screens & Modules

### 3.1 הכנסת מלאי (Inventory Entry)
- **Manual entry**: card-based form with cascading brand → model → size/color dropdowns
- **Excel import**: upload xlsx, column mapping, two-phase process (match existing + queue pending)
- **Barcode generation**: BBDDDDD format, reuses for identical brand+model+size+color

### 3.2 הורדת מלאי (Inventory Reduction)
- **Excel reduction**: upload xlsx → reduce qty by barcode for sync=מלא items
- **Manual search**: cascading brand → model → size+color → search → reduction modal with PIN+reason
- **Access sales**: process sales_template Excel from Access POS, update qty or create pending_sales

### 3.3 מלאי ראשי (Main Inventory Table)
- Server-side paginated table with inline editing
- Filters: search, supplier, product type, quantity range
- Sorting, row selection, bulk operations (update sync/status, bulk delete, supplier return)
- Image preview modal

### 3.4 הזמנות רכש (Purchase Orders)
- Two-step wizard: select supplier → generate PO# + edit items
- PO number format: PO-{supplier_number}-{4-digit-seq}
- Statuses: draft → sent → partial → received / cancelled
- Cascading dropdowns for items (brand → model → color+size)
- Export to Excel + PDF, import to inventory

### 3.5 קבלת סחורה (Goods Receipt)
- Receipt list with status cards
- Receipt form: document type + number + supplier + date
- Optional PO linkage (auto-populates items from PO)
- Item entry: barcode search / manual / Excel import
- Barcode mandatory on new items (pre-assigned via generateNextBarcode)
- Employee quick-reference guide (ℹ️ button → modal)
- Validation: sell price required, images for sync items
- Confirm flow: qty update for existing items, create new items with barcode
- **Auto-create supplier_documents** on receipt confirmation (receipt-debt.js)
- **Auto-deduct from active prepaid deal** if supplier has one (Phase 4f)
- Export confirmed receipts as Access-compatible Excel

### 3.6 ספירת מלאי (Stock Count) — Phase 2a
- **List screen**: summary cards (open/completed/diffs this month), stock count table
- **New count flow**: worker PIN → create count header + snapshot all active inventory items
- **Session screen**: camera barcode scanning (ZXing), manual barcode/search input, real-time stats
- **Scan handling**: unknown barcode → warning, already counted → confirm +1, pending → qty prompt
- **Diff report**: shortages/surpluses/uncounted summary, items table
- **Approval**: manager PIN (role=admin/manager) → update inventory via `set_inventory_qty` RPC → writeLog per diff item
- **Cancel**: cancels count without changing quantities
- **Export**: all counted items to xlsx (10 columns including scanned_by)

### 3.7 סנכרון Access (Access Sync) — Phase 2b
- **Sync tab**: summary cards (syncs/items/errors today), last activity timestamp, sync log table with pagination
- **Sync log**: per-file rows with status badges, action buttons (details, retry, download failed file)
- **Sync details modal**: file info grid, processed items table (from inventory_logs), errors table
- **Failed file download**: signed URL from Supabase Storage bucket `failed-sync-files`
- **Pending sales panel**: overlay modal with per-item cards
  - Suggestions: partial barcode matching (suffix)
  - Free search: debounced text search by barcode/model
  - Resolve: confirmDialog → PIN → optimistic lock (WHERE status='pending') → atomic qty RPC → writeLog
  - Ignore: mark as not-in-inventory → writeLog('pending_ignored')
- **Folder Watcher (Node.js)**: watches Dropbox/InventorySync/sales/ for xlsx files

### 3.8 ניהול מותגים (Brands Management)
- Table with 4 filters (active/sync/type/low-stock)
- Inline editing, immediate save for active toggle + min_stock_qty
- Batch save for other fields
- Stock qty column with low-stock alert (red + ⚠️)

### 3.9 ניהול ספקים (Suppliers Management)
- Supplier list with supplier_number (UNIQUE ≥ 10, gap-filling)
- Edit mode for supplier number reassignment (temp negative swap)
- PO lock: cannot change number if supplier has existing POs

### 3.10 יומן מערכת (System Log)
- Paginated log viewer with 6 filters (date range, branch, action, employee, search)
- 19 action types with icons/colors
- Export to xlsx (up to 10k rows)

### 3.11 ניהול (Admin)
- Admin mode toggle (password: 1234)
- Help modal

### 3.12 מעקב חובות ספקים (Supplier Debt Tracking) — Phase 4
Standalone page: `suppliers-debt.html` with 4 tabs.

#### 3.12.1 טאב ספקים (Suppliers Tab)
- **Dashboard summary cards**: total debt, due this week, overdue (red highlight), paid this month
- **Suppliers table**: aggregated per supplier — open doc count, total debt, overdue amount, next due date, prepaid deal remaining
- Row click → supplier detail panel (slide-in)
- Quick action: create payment for supplier

#### 3.12.2 טאב מסמכים (Documents Tab)
- **Filter bar**: supplier, type, status, date range, overdue checkbox
- **Documents table**: date, type, number, internal number (DOC-NNNN), supplier, amount, paid, balance, status badge
- **New document modal**: supplier, type, number, dates, amounts (auto-calc VAT), notes, PIN verification
- **Auto-generated internal number** (DOC-NNNN sequential)
- **Delivery note → invoice linking**: openLinkToInvoiceModal, creates document_links record
- **Document types** (configurable): חשבונית מס, תעודת משלוח, חשבונית זיכוי, קבלה

#### 3.12.3 טאב תשלומים (Payments Tab)
- **Filter bar**: supplier, status, date range
- **Payments table**: date, supplier, amount, withholding tax, net, method, reference, linked doc numbers, status
- **Payment detail modal**: info grid + allocations table
- **4-step payment wizard**:
  1. Select supplier (shows debt summary + withholding tax rate)
  2. Payment details (amount, date, method, reference, auto-calc withholding tax)
  3. Document allocation (FIFO auto-allocate or manual override, mismatch warning)
  4. Confirmation (summary + PIN)
- **Payment methods** (configurable): העברה בנקאית, צ׳ק, מזומן, כרטיס אשראי

#### 3.12.4 טאב עסקאות מקדמה (Prepaid Deals Tab)
- **Filter bar**: supplier, status
- **Deals table**: supplier, name, dates, total, used, remaining (progress bar), status badge
- **New deal modal**: supplier, name, dates, amount, alert threshold, PIN
- **Deal detail modal**: summary, progress bar, checks table with status actions
- **Check management**: add check (number, amount, date), status transitions (pending → cashed/bounced)
- **Auto-deduction**: receipt confirmation auto-deducts from active prepaid deal

#### 3.12.5 פרטי ספק (Supplier Detail — slide-in panel)
- **Header**: supplier name, total debt, overdue, prepaid remaining
- **4 sub-tabs**:
  - Timeline: merged docs + payments sorted by date with icons (max 50 + "show more")
  - Documents: filtered table for this supplier
  - Payments: filtered table for this supplier
  - Returns: delegated to debt-returns.js

### 3.13 החזרות לספק (Supplier Returns) — Phase 4h
- **Initiation from inventory**: select items → "זיכוי לספק" → validates same supplier, shows preview
- **Return creation**: PIN verification, generates RET-{supplier_number}-{seq} number, creates return + items, decrements inventory
- **Returns tab in supplier detail**: table with status badges and action buttons
- **Return detail modal**: items table (barcode, brand, model, color, size, qty, price) + summary
- **Status management**: pending → ready_to_ship → shipped → received_by_supplier → credited (PIN-verified transitions)
- **Return types**: agent_pickup, ship_to_supplier, pending_in_store

---

## 4. Business Logic Rules

### 4.1 ברקוד BBDDDDD
- **BB** = 2 ספרות קוד סניף (00-99), **DDDDD** = 5 ספרות רצות
- שימוש חוזר: אם קיים פריט זהה (מותג+דגם+גודל+צבע) עם כמות > 0
- ולידציה: כפילויות בתוך ה-batch + מול ה-DB

### 4.2 כמות — Atomic RPC Updates
- **כלל ברזל**: כמות לא ניתנת לעריכה ישירה. רק דרך ➕➖ עם PIN
- **Atomic RPCs**: `increment_inventory`, `decrement_inventory`, `set_inventory_qty` — prevent race conditions
- **Flow**: ➕/➖ → modal (כמות + סיבה + הערה + PIN) → אימות PIN → RPC → writeLog
- **Over-remove protection**: `GREATEST(0, quantity - delta)` in DB

### 4.3 הורדת מלאי — Reduction
- **Excel**: upload xlsx → reduce qty by barcode for sync=מלא items
- **Manual**: cascading search → reduction modal with PIN + reason
- **Access sales**: sales_template Excel → qty update or pending_sales

### 4.4 Soft Delete + סל מחזור
- **Flow**: 🗑️ → modal (סיבה + הערה + PIN) → is_deleted=true → writeLog
- **שחזור**: is_deleted=false → writeLog
- **מחיקה לצמיתות**: double PIN → DELETE → writeLog
- All queries filter `is_deleted = false`

### 4.5 Audit Trail — writeLog
- Every data mutation calls writeLog(action, inventoryId, details)
- Async and non-blocking
- 19 action types + pending_ignored for sync
- Access sale fields: 13 additional fields in details object

### 4.6 אימות PIN
- Login PIN calls pin-auth Edge Function (server-side JWT)
- Mid-session PIN checks use `verifyPinOnly()` (client-side query)
- Required for: qty changes, soft/permanent delete, reduction, pending resolution, stock count, new documents, payments, returns

### 4.7 קבלת סחורה — flow
1. יצירת קבלה (סוג מסמך + מספר + ספק + תאריך)
2. קישור אופציונלי ל-PO
3. הוספת פריטים (ברקוד / ידני / Excel) — barcode mandatory on new items
4. ולידציה: מחיר מכירה חובה, תמונה לפריטים חדשים עם סנכרון
5. אישור: qty update לקיימים, create + barcode לחדשים
6. Auto-create supplier_documents (receipt-debt.js)
7. Auto-deduct from active prepaid deal if exists
8. Export confirmed receipts as Access-compatible Excel

### 4.8 הזמנות רכש — flow
1. Two-step wizard: select supplier → generate PO# + edit items
2. PO number: PO-{supplier_number}-{4-digit-seq}
3. Cascading dropdowns: brand → model → color+size
4. Statuses: draft → sent → partial/received/cancelled
5. Export Excel + PDF, import to inventory, create from low stock

### 4.9 ספירת מלאי — flow
1. Worker PIN entry (any active employee)
2. Create count header + snapshot all active inventory items (qty > 0, is_deleted = false)
3. Count number: SC-YYYY-NNNN (auto-generated)
4. Camera scanning (ZXing) or manual barcode entry
5. Smart search: text filters by brand/model/color, digits treated as barcode
6. Diff report: shortages, surpluses, uncounted items
7. Manager PIN approval (role = admin/manager)
8. Inventory update via `set_inventory_qty` RPC per diff item
9. writeLog('edit_qty') per diff item with reason='ספירת מלאי'

### 4.10 סנכרון Access — flow
- **Two ingest paths**: manual Excel upload (web) + automated Dropbox watcher (Node.js)
- **Excel format**: `sales_template` sheet, row 1 = headers, rows 2-3 = metadata, row 4+ = data
- **Per-row fields**: barcode, quantity, action_type (sale/return), transaction_date, order_number, + sale detail fields
- **Processing**: found → atomic RPC qty update + writeLog; not found → pending_sales
- **Duplicate file check**: case-insensitive ilike, user can override
- **Pending resolution**: confirm → PIN → optimistic lock → atomic RPC → writeLog

### 4.11 Hebrew↔English Maps
- **FIELD_MAP** / **FIELD_MAP_REV** — column name translation
- **ENUM_MAP** / **ENUM_REV** — enum value translation
- Helpers: `enToHe(field, val)` / `heToEn(field, val)`

### 4.12 מעקב חובות ספקים — flow
- **Document creation**: manual (via CRUD modal) or automatic (receipt confirmation)
- **Internal numbering**: DOC-NNNN sequential per tenant
- **Payment flow**: 4-step wizard → FIFO document allocation → updates paid_amount/status on documents
- **Withholding tax**: per-supplier rate, auto-calculated on payment
- **Prepaid deals**: check-based, auto-deduction on receipt, progress tracking
- **Supplier returns**: initiated from inventory selection, generates RET-{supplier_number}-{seq}
- **Document linking**: delivery notes can be linked to monthly invoices (document_links)

### 3.14 סריקת חשבוניות OCR (AI OCR) — Phase 5b-5e
- **OCR scan flow**: upload PDF/image → Edge Function (ocr-extract) → Claude Vision API → extracted JSON
- **Review modal**: side-by-side view (fields left, document right), confidence indicators per field
- **Correction tracking**: records diff between AI extraction and user corrections
- **Goods receipt integration**: "סרוק עם AI" button auto-fills receipt form from scanned invoice
- **Learning system**: supplier_ocr_templates updated on every correction, accuracy tracking per supplier

### 3.15 התראות (Alerts) — Phase 5f
- **Alerts badge**: bell icon (🔔) on all 4 pages with unread count
- **Dropdown panel**: last 10 alerts with type icons, action buttons (view, dismiss, mark read)
- **Daily alerts** (via generate_daily_alerts RPC): payment_due (7 days), payment_overdue, prepaid_low (<20%)
- **Event alerts**: price_anomaly (>10% change), duplicate_document, amount_mismatch, ocr_low_confidence
- **Auto-dismiss**: payment alerts dismissed on payment save, OCR alerts on extraction accept

### 3.16 דוח שבועי (Weekly Report) — Phase 5g
- **Report tab** in suppliers-debt.html: "דוח שבועי"
- **4 sections**: debt summary, upcoming payments, prepaid deals status, OCR statistics
- **Week navigation**: prev/next week buttons
- **PDF export**: html2canvas + jsPDF (CDN)
- **Snapshot**: saved to weekly_reports table as JSONB

### 3.17 הגדרות AI (AI Config) — Phase 5h
- **Settings modal**: accessible to CEO/Manager only
- **3 config sections**: OCR settings (confidence threshold), Alerts settings (toggle types), Weekly Report settings
- **Usage statistics**: total scans, templates, alerts, reports

---

## 5. Known Issues

Known issues are tracked in SESSION_CONTEXT.md — single home for all open issues.

---

## 6. Auth Flow (Phase 3)

1. App load → `loadSession()` → if no valid session → `showLoginModal()`
2. PIN entry → `verifyEmployeePIN()` → `initSecureSession()` → `applyUIPermissions()` → `hideLoginModal()`
3. Session expires after 8h → `clearSession()` → reload → login modal
4. 5 failed PINs → sessionStorage lock (client) + `locked_until` in DB (server-side)

---

## 7. Permission System (Phase 3)

- 5 roles with hierarchical access: ceo > manager > team_lead > worker > viewer
- 35 permissions checked via `hasPermission(key)` at runtime
- UI guards: `data-permission` on buttons, `data-tab-permission` on nav tabs
- `applyUIPermissions()` runs after every login and tab switch

---

## 8. Home Screen & Standalone Pages (Phase 3.5)

- **index.html** — home screen: MODULES config array, module cards, PIN login modal, session restore, live clock
- **employees.html** — standalone employee management page
- **suppliers-debt.html** — standalone supplier debt tracking page (Phase 4)
- Module cards show permission-based lock overlays

---

## 9. Multi-Tenancy Foundation (Phase 3.75)

- טבלת `tenants` — id, name, slug, default_currency, timezone, locale, is_active
- `tenant_id UUID NOT NULL` on all 36 tables, JWT-based RLS tenant isolation
- Edge Function `pin-auth` returns JWT with tenant_id claim
- `getTenantId()` reads from sessionStorage
- All inserts include `tenant_id: getTenantId()`
- All selects filter by `.eq('tenant_id', getTenantId())` as defense-in-depth

---

## 10. Sticky Header (Phase 3.8)

- js/header.js + css/header.css
- Renders on all pages when session is active
- Shows: tenant name + logo | "Optic Up" | employee name + role + logout

---

## 11. Contracts — RPC Functions & Edge Functions

**RPC Functions:**
- `increment_inventory(inv_id, delta)` — atomic qty increment
- `decrement_inventory(inv_id, delta)` — atomic qty decrement (floor 0)
- `set_inventory_qty(inv_id, new_qty)` — set qty directly
- `generate_daily_alerts(p_tenant_id)` — generates payment_due, payment_overdue, prepaid_low alerts (idempotent)

**Edge Functions:**
- `pin-auth` — PIN validation → signed JWT with tenant_id claim
- `ocr-extract` (POST /functions/v1/ocr-extract) — Claude Vision OCR: accepts file_path + tenant JWT, returns extracted invoice fields with confidence scores

**Planned Views (Phase 6 — Supplier Portal):**
- `v_supplier_inventory` — supplier sees their items in our inventory
- `v_supplier_documents` — supplier sees their documents
- `v_supplier_payments` — supplier sees their payment history
- `v_supplier_returns` — supplier sees their return history
