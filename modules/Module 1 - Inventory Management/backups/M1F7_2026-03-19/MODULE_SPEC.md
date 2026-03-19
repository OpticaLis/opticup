# מלאי מסגרות — Module Spec
## גרסה QA | מרץ 2026 | Module 1 Final Certification

> **Authority:** Business logic flows and screen descriptions. For code details → MODULE_MAP.md. For DB schema → db-schema.sql. For rules → CLAUDE.md.

---

## 1. סקירה כללית

**מודול מלאי מסגרות** הוא הליבה של מערכת Optic Up — מנהל את כל מחזור החיים של מסגרות משקפיים במלאי: כניסה, מעקב, עריכה, מכירה, מחיקה, שחזור, ספירת מלאי, סנכרון עם Access, ומעקב חובות ספקים.

**סטאק טכנולוגי:**
- Frontend: Vanilla JS (no framework), 78 JS modules + CSS
- Backend: Supabase (PostgreSQL + REST API + RPC + Edge Functions), client = `sb`
- Auth: PIN → Edge Function (pin-auth) → signed JWT with tenant_id claim
- Excel: SheetJS (xlsx) לייבוא/ייצוא
- Barcode: ZXing (camera-based scanning for stock count)
- Deploy: GitHub Pages → https://app.opticalis.co.il/
- Watcher: Node.js + chokidar (Dropbox folder watcher for Access sync)
- Multi-tenant: tenant_id UUID NOT NULL on all tables, JWT-based RLS

For complete file index → see MODULE_MAP.md section 1.

---

## 2. DB Schema Summary

לסכימה המלאה (columns, types, constraints, RLS) → ראה **db-schema.sql**.

כל הטבלאות מכילות `tenant_id UUID NOT NULL` מאז פאזה 3.75. JWT-based RLS tenant isolation פעיל על כל 45 הטבלאות.

**טבלאות עיקריות (pre-Phase 4):** tenants, inventory, brands, suppliers, employees, inventory_logs, inventory_images, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, sync_log, pending_sales, watcher_heartbeat, stock_counts, stock_count_items, roles, permissions, role_permissions, employee_roles, auth_sessions.

**טבלאות Phase 4:** document_types, payment_methods, currencies, supplier_documents, document_links, supplier_payments, payment_allocations, prepaid_deals, prepaid_checks, supplier_returns, supplier_return_items.

**טבלאות Phase 5 (AI Agent):** ai_agent_config, supplier_ocr_templates, ocr_extractions, alerts, weekly_reports.

**טבלאות Phase 5.75 (Communications stubs):** conversations, conversation_participants, messages, knowledge_base, message_reactions, notification_preferences.

**טבלאות Phase 5.9 (Shipments):** courier_companies, shipments, shipment_items.

**RPC Functions:** `increment_inventory`, `decrement_inventory`, `set_inventory_qty`, `generate_daily_alerts`, `next_internal_doc_number`, `update_ocr_template_stats`, `next_box_number`.

**pg_cron Jobs:** `daily-alert-generation` — runs at 05:00 UTC, calls generate_daily_alerts with fault isolation per alert type.

**Supabase Storage:** bucket `failed-sync-files` for failed Access sync files, bucket `supplier-docs` for scanned invoices, bucket `tenant-logos` for tenant logo images.

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
- **Brand/category filters** (QA): pre-count filter screen to select brands and product types for targeted counts (stock-count-filters.js). Builds filter_criteria JSONB stored on stock_counts
- **Realtime search** (QA): debounced search in count session filters items by brand/model/barcode

### 3.7 סנכרון Access (Access Sync) — Phase 2b + Access Sync Fix
- **Sync tab**: summary cards (syncs/items/errors today), last activity timestamp, watcher status indicator (green/yellow/red based on heartbeat), sync log table with pagination
- **Sync log**: per-file rows with status badges (success/partial/error/handled), action buttons (details, retry, download failed file). Export entries shown with 📤 icon
- **Sync details modal → Work center**: file info grid, processed items table (from inventory_logs), errors table. Brand/model clickable → search in inventory. Help button "הסבר לתיקון ידני". PIN verification at entry for inline resolve
- **Failed file download**: signed URL from Supabase Storage bucket `failed-sync-files`
- **Pending sales**: filter toggle in sync tab (not separate panel). Shows product fields (brand, model, size, color) from Access CSV. Badge counts files not items
  - Inline resolve with PIN at entry (work center pattern)
  - Suggestions: partial barcode matching (suffix)
  - Free search: debounced text search by barcode/model
  - Resolve: PIN → optimistic lock (WHERE status='pending') → atomic qty RPC → writeLog
  - Ignore: mark as not-in-inventory → writeLog('pending_ignored')
  - File completion check: marks sync_log as 'handled' when all items resolved
- **Folder Watcher (Node.js)**: watches Dropbox/InventorySync/sales/ for CSV and XLSX files
  - CSV support: parseCSVFile with BOM stripping and trailing comma handling
  - Heartbeat: sends to watcher_heartbeat every 60s (hostname, version)
  - Security: service_role key via OPTICUP_SERVICE_ROLE_KEY env var, tenant_id on all inserts
  - Configurable: OPTICUP_WATCH_DIR, OPTICUP_EXPORT_DIR env vars
- **Reverse sync**: exports unexported inventory items to XLS every 30s for Access import
  - sync-export.js: queries access_exported=false, writes XLS (biff8 format via SheetJS), batch marks items exported (groups of 100)
  - Logs with source_ref='export' in sync_log
- **Standalone deployment**: watcher-deploy/ folder — self-contained package (8 files) for Windows machines without Git/IDE
  - setup.bat: Hebrew interactive installer (Node.js check, npm install, env var prompts, Windows Service install)
  - Windows Service via node-windows: auto-start, auto-restart, persistent env vars

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

### 3.13 החזרות לספק (Supplier Returns) — Phase 4h + Post-5.9i
- **Initiation from inventory**: select items → "זיכוי לספק" → validates same supplier, shows preview
- **Initiation from qty-modal**: "נשלח לזיכוי" reason in ➖ modal → auto-creates supplier_return via _createReturnFromReduction (fire-and-forget)
- **Return creation**: PIN verification, generates RET-{supplier_number}-{seq} number, creates return + items, decrements inventory
- **Returns tab in supplier detail** (debt-returns.js): per-supplier table with status badges and action buttons
- **Inventory returns tab** (inventory-returns-tab.js): global view across all suppliers, filters (status/supplier/date/search), accordion detail, bulk selection, sendToBox integration
- **Debt returns tab** (debt-returns-tab.js): global credit management view in suppliers-debt.html, filters, bulk markCredited, summary cards
- **Return detail modal**: items table (barcode, brand, model, color, size, qty, price) + summary
- **Status management**: pending → ready_to_ship → shipped/agent_picked → received_by_supplier → credited (PIN-verified transitions)
- **Timestamp tracking**: ready_at, shipped_at, agent_picked_at, received_at, credited_at on supplier_returns
- **Return types**: agent_pickup, ship_to_supplier, pending_in_store
- **sendToBox**: single or bulk — navigates to shipments wizard with supplierId + returnIds pre-filled via URL params
- **Help banners**: renderHelpBanner() on returns tabs + shipments screens — collapsible with sessionStorage state
- **Return credit timeline** (QA): visual timeline modal showing return status progression with dates and icons (openReturnTimeline in debt-returns-tab.js)
- **Auto credit note** (QA): when marking return as credited, auto-creates credit_note document in supplier_documents (_createCreditNoteForReturn in debt-returns-tab-actions.js)

### 3.22 הגדרות (Tenant Settings) — QA Phase
Standalone page: `settings.html` with `modules/settings/settings-page.js`.

- **3 settings sections**:
  - Business info: name, address, phone, email, tax_id
  - Financial config: vat_rate, default_currency
  - Display preferences: logo upload/delete/preview
- **Logo management**: upload to tenant-logos Storage bucket with client-side resize (max 200px), delete, preview
- **VAT wired to tenant config**: reads vat_rate from tenants table instead of hardcoded 17%

### 3.23 PIN משותף (Consistent PIN Modal) — QA Phase
- **js/pin-modal.js**: shared `promptPin()` function returns Promise with employee object or null
- Replaces inline PIN HTML across multiple modules for consistency
- Uses `verifyPinOnly()` under the hood

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
- dev_bypass query param removed in QA phase (security hardening)

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
- **Two ingest paths**: manual CSV/Excel upload (web) + automated Dropbox watcher (Node.js)
- **File formats**: CSV (Access exports UTF-8 with BOM) or XLSX (`sales_template` sheet, row 1 = headers, rows 2-3 = metadata, row 4+ = data)
- **Per-row fields**: barcode, quantity, action_type (sale/return), transaction_date, order_number, brand, model, size, color, + sale detail fields
- **Processing**: found → atomic RPC qty update + writeLog; not found → pending_sales (with product fields)
- **Duplicate file check**: case-insensitive ilike, user can override
- **Pending resolution**: work center modal with PIN at entry → inline resolve → optimistic lock → atomic RPC → writeLog → file completion check (marks sync_log 'handled')
- **Reverse sync**: new inventory items (access_exported=false) → XLS export (biff8 via SheetJS) every 30s → Access import folder
- **Watcher deployment**: standalone watcher-deploy/ package with setup.bat installer for Windows machines

### 4.11 Hebrew↔English Maps
- **FIELD_MAP** / **FIELD_MAP_REV** — column name translation
- **ENUM_MAP** / **ENUM_REV** — enum value translation
- Helpers: `enToHe(field, val)` / `heToEn(field, val)`

### 4.12 מעקב חובות ספקים — flow
- **Document creation**: manual (via CRUD modal) or automatic (receipt confirmation)
- **Internal numbering**: DOC-NNNN sequential per tenant (uses `next_internal_doc_number` RPC)
- **Payment flow**: 4-step wizard → FIFO document allocation → updates paid_amount/status on documents
- **Withholding tax**: per-supplier rate, auto-calculated on payment
- **Prepaid deals**: check-based, auto-deduction on receipt, progress tracking
- **Supplier returns**: initiated from inventory selection, generates RET-{supplier_number}-{seq}
- **Document linking**: delivery notes can be linked to monthly invoices (document_links)
- **Document cancel** (QA): PIN-verified cancellation updates status and related links
- **Payment cancel** (QA): PIN-verified cancellation rolls back allocation amounts on linked documents

### 4.13 validateOCRData — 7 Business Rules (Phase 5.5d)
Validates OCR-extracted data before document creation:
1. **Required fields**: supplier_name, document_number, total_amount must exist
2. **Positive amount**: total_amount must be > 0
3. **Valid date**: document_date must be parseable and not in the future
4. **VAT consistency**: if vat_amount provided, must be ≤ subtotal
5. **Supplier match**: supplier_name must fuzzy-match an existing supplier
6. **Duplicate check**: document_number must not already exist for same supplier
7. **Item validation**: if line items exist, each must have description and quantity > 0

### 4.14 batchWriteLog (Phase 5.5a-2)
- Bulk insert into inventory_logs for batch operations
- Accepts array of log entries, inserts in single DB call
- Same fields as writeLog but optimized for batch upload/OCR/import flows

### 4.15 supplier_documents — Extended Columns (Phase 5.5a-1)
- **file_hash** (TEXT): SHA-256 hash of uploaded file for dedup
- **batch_id** (TEXT): groups documents uploaded together in batch operations
- **is_historical** (BOOLEAN, default false): marks imported historical documents — excluded from alerts and inventory impact

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

### 3.18 סינון מסמכים מתקדם (Advanced Document Filtering) — Phase 5.5f
- **Collapsible filter panel**: replaces simple filter bar in documents tab
- **8 filter criteria**: status, document type, supplier, date range (from/to), amount range (min/max), source (manual/OCR/receipt)
- **Saved filter favorites**: up to 5 saved presets per user (localStorage)
- **Filter count display**: shows active filter count on toggle button
- **Client-side filtering**: reads filter values, applies to cached document data

### 3.19 העלאת מסמכים באצווה (Batch Document Upload) — Phase 5.5g
- **Drag-and-drop modal**: opens from documents tab toolbar
- **File dedup**: SHA-256 hash per file, checks within batch + against DB (file_hash column)
- **Two modes**: upload-only (stores files) or upload+OCR (stores + triggers batch OCR)
- **Progress tracking**: per-file progress bar, file preview, status indicators
- **Batch ID**: unique identifier groups files uploaded together (batch_id column)

### 3.20 OCR באצווה (Batch OCR Processing) — Phase 5.5h-1
- **Sequential pipeline**: processes queued documents one at a time
- **Pause/resume**: queue can be paused and resumed mid-processing
- **Retry failed**: individual or bulk retry for failed OCR extractions
- **Auto-approve**: documents above confidence threshold auto-approved
- **Review integration**: click to open individual OCR review for any document
- **Summary modal**: shows stats (processed, approved, failed, avg confidence)

### 3.21 ייבוא מסמכים היסטוריים (Historical Document Import) — Phase 5.5h-2
- **Import modal**: drag-drop upload for old/historical documents
- **Historical marking**: documents flagged `is_historical=true` — no inventory impact, no alerts
- **Default status selection**: choose paid/open/per_doc for all imported documents
- **OCR + learning**: runs OCR on historical docs to train supplier templates
- **Learning summary**: shows per-supplier accuracy stats after import completes

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
- 55 permissions across 15 modules, checked via `hasPermission(key)` at runtime
- UI guards: `data-permission` on buttons, `data-tab-permission` on nav tabs
- `applyUIPermissions()` runs after every login and tab switch

---

## 8. Home Screen & Standalone Pages (Phase 3.5)

- **index.html** — home screen: MODULES config array, module cards, PIN login modal, session restore, live clock
- **employees.html** — standalone employee management page
- **suppliers-debt.html** — standalone supplier debt tracking page (Phase 4)
- **shipments.html** — standalone shipments & box management page (Phase 5.9)
- **settings.html** — tenant settings page with 3 sections: business info, financial config, display preferences. Logo upload/delete/preview via tenant-logos Storage bucket (QA)
- Module cards show permission-based lock overlays

---

## 9. Multi-Tenancy Foundation (Phase 3.75)

- טבלת `tenants` — id, name, slug, default_currency, timezone, locale, is_active, shipment_lock_minutes, box_number_prefix, require_tracking_before_lock, auto_print_on_lock, shipment_config, address, phone, email, tax_id, logo_url, vat_rate
- `tenant_id UUID NOT NULL` on all 45 tables, JWT-based RLS tenant isolation
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

## 11. Communications & Knowledge Infrastructure (Phase 5.75)

Zero-UI — tables are empty stubs for future communications module. No JS files added.

**6 new tables:**
- `conversations` — unified conversation container for internal, supplier, customer, and AI channels; context-linked to business entities
- `conversation_participants` — polymorphic participants (employee/supplier/customer/AI) with read tracking and per-conversation notification prefs
- `messages` — all message types (text, file, image, entity_ref, AI suggestion, system); threading via reply_to_id
- `knowledge_base` — procedures/answers extracted from chat; categorized with tags (GIN index), AI usage tracking, versioning
- `message_reactions` — lightweight engagement tracking (emoji reactions per employee per message)
- `notification_preferences` — global per-employee notification settings (in-app, future email/WhatsApp/push, quiet hours)

No contracts defined — RPC functions will be created when UI module is built. Planned RPCs documented in PHASE_5.75_SPEC.md section 6.

---

## 12. Shipments & Box Management (Phase 5.9)

Standalone page: `shipments.html` with 9 JS files in `modules/shipments/`.

### 12.1 Box Types
- **מסגור (framing)**: frames sent for glazing at external lab
- **זיכוי (return)**: items returned to supplier (integrates with supplier_returns)
- **תיקון (repair)**: items sent for repair
- **משלוח (delivery)**: general deliveries to customers or branches

### 12.2 Wizard — 3-step box creation
1. **Step 1**: Select box type + destination (supplier for return, customer for delivery)
2. **Step 2**: Add items — barcode scan or manual entry. For return boxes, staged picker shows ready_to_ship return items. Dynamic fields per box type (JSONB config). Accordion items table
3. **Step 3**: Courier selection + tracking number + notes. Field requirements from config

### 12.3 Lock System
- Configurable edit window (default 30 min, tenants.shipment_lock_minutes)
- Auto-lock: expired boxes locked automatically with timestamp
- Manual lock: PIN-verified, optional tracking number requirement
- Correction box: creates new box linked to locked original (corrects_box_id)
- Edit window: add/remove items while box is editable

### 12.4 Box Numbering
- Format: `{prefix}-{4-digit-seq}` (e.g., BOX-0001)
- Prefix configurable (tenants.box_number_prefix, default "BOX")
- Atomic generation via `next_box_number` RPC (SECURITY DEFINER)

### 12.5 Detail Panel + Manifest
- Slide-in panel showing box metadata, items table, lock timer
- Print manifest: formatted page with box info, items table, signature lines

### 12.6 Courier Management
- CRUD for courier companies (name, phone, contact person, active toggle)
- Settings: lock minutes, prefix, require tracking before lock, auto print on lock

### 12.7 JSONB Config (shipment_config on tenants)
- **Field visibility per box type**: required/optional/hidden for 6 standard fields + 3 custom fields per type
- **Categories**: toggle visibility of 9 built-in categories + add custom categories
- **Step 3 config**: required/optional for courier, tracking number, notes
- **Settings UI**: 3 collapsible sub-sections in courier modal settings tab
- **Config helpers**: getFieldConfig, getCustomField, getVisibleCategories, getCategoryLabel, getStep3Config

### 12.8 Permissions
5 permissions: `shipments.view`, `shipments.create`, `shipments.edit`, `shipments.lock`, `shipments.settings`

### 12.9 DB Tables
- `courier_companies` — id, tenant_id, name, phone, contact_person, is_active
- `shipments` — id, tenant_id, box_number, shipment_type, supplier_id, customer_name, customer_phone, customer_address, courier_id, tracking_number, packed_by, packed_at, locked_at, locked_by, items_count, total_value, corrects_box_id, notes, is_deleted
- `shipment_items` — id, tenant_id, shipment_id, item_type, inventory_id, return_id, order_number, customer_name, customer_number, barcode, brand, model, size, color, category, unit_cost, notes

### 12.10 Contracts
- `next_box_number(p_tenant_id)` — atomic sequential box number generation
- `getFieldConfig(type, field)` — returns field visibility for box type
- `getCustomField(type, index)` — returns custom field config
- `getVisibleCategories()` — returns visible category keys
- `getCategoryLabel(key)` — returns Hebrew label for category
- `getStep3Config(field)` — returns step 3 field requirement

---

## 13. Contracts — RPC Functions & Edge Functions

**RPC Functions:**
- `increment_inventory(inv_id, delta)` — atomic qty increment
- `decrement_inventory(inv_id, delta)` — atomic qty decrement (floor 0)
- `set_inventory_qty(inv_id, new_qty)` — set qty directly
- `generate_daily_alerts(p_tenant_id)` — generates payment_due, payment_overdue, prepaid_low alerts (idempotent)
- `next_internal_doc_number(p_tenant_id)` — atomic sequential DOC-NNNN generation (race-condition safe)
- `update_ocr_template_stats(p_template_id, p_corrections, p_extracted_data)` — atomic template stats update (times_used, accuracy_rate, extraction_hints)
- `next_box_number(p_tenant_id)` — atomic sequential box number generation ({prefix}-{4-digit-seq}), SECURITY DEFINER

**Edge Functions:**
- `pin-auth` — PIN validation → signed JWT with tenant_id claim
- `ocr-extract` (POST /functions/v1/ocr-extract) — Claude Vision OCR: accepts file_path + tenant JWT, returns extracted invoice fields with confidence scores

**Planned Views (Phase 6 — Supplier Portal):**
- `v_supplier_inventory` — supplier sees their items in our inventory
- `v_supplier_documents` — supplier sees their documents
- `v_supplier_payments` — supplier sees their payment history
- `v_supplier_returns` — supplier sees their return history
