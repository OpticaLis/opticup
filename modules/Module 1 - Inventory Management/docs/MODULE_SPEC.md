# מלאי מסגרות — Module Spec
## גרסה 3.75 | מרץ 2026 | Post-Phase 3.75

> **Authority:** Business logic flows and screen descriptions. For code details → MODULE_MAP.md. For DB schema → db-schema.sql. For rules → CLAUDE.md.

---

## 1. סקירה כללית

**מודול מלאי מסגרות** הוא הליבה של מערכת Optic Up — מנהל את כל מחזור החיים של מסגרות משקפיים במלאי: כניסה, מעקב, עריכה, מכירה, מחיקה, שחזור, ספירת מלאי וסנכרון עם Access.

**סטאק טכנולוגי:**
- Frontend: Vanilla JS (no framework), 39 JS modules + CSS
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

כל הטבלאות מכילות `tenant_id UUID NOT NULL` מאז פאזה 3.75. JWT-based RLS tenant isolation פעיל על כל 20+ הטבלאות.

**טבלאות עיקריות:** tenants, inventory, brands, suppliers, employees, inventory_logs, inventory_images, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, sync_log, pending_sales, watcher_heartbeat, stock_counts, stock_count_items, roles, permissions, role_permissions, employee_roles, auth_sessions.

**RPC Functions:** `increment_inventory`, `decrement_inventory`, `set_inventory_qty`.

**Supabase Storage:** bucket `failed-sync-files` for failed Access sync files.

**Edge Function:** `pin-auth` — validates PIN server-side, returns signed JWT with tenant_id claim.

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
- Sorting, row selection, bulk operations (update sync/status, bulk delete)
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
- Validation: sell price required, images for sync items
- Confirm flow: qty update for existing items, create new items with barcode
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
  - Processes sales_template sheet, validates rows
  - Found barcode → atomic qty update via RPC + inventory_log
  - Unknown barcode → pending_sales
  - Idempotency guards (5s window dedup for both inventory_logs and sync_log)
  - Failed files uploaded to Supabase Storage
  - 30s cooldown per filename to prevent duplicate chokidar events
  - Moves processed files to processed/ or failed/ folder

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
- Query: `sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle()`
- Required for: qty changes, soft/permanent delete, reduction, pending resolution, stock count session
- Stock count approval: requires role IN ('admin', 'manager')

### 4.7 קבלת סחורה — flow
1. יצירת קבלה (סוג מסמך + מספר + ספק + תאריך)
2. קישור אופציונלי ל-PO
3. הוספת פריטים (ברקוד / ידני / Excel)
4. ולידציה: מחיר מכירה חובה, תמונה לפריטים חדשים עם סנכרון
5. אישור: qty update לקיימים, create + barcode לחדשים
6. Export confirmed receipts as Access-compatible Excel

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
- **Watcher heartbeat**: every 5min → watcher_heartbeat table
- **Idempotency**: 5s window dedup for inventory_logs and sync_log; 30s filename cooldown
- **Failed files**: uploaded to Supabase Storage bucket `failed-sync-files`, downloadable via signed URL

### 4.11 Hebrew↔English Maps
- **FIELD_MAP** / **FIELD_MAP_REV** — column name translation
- **ENUM_MAP** / **ENUM_REV** — enum value translation
- Helpers: `enToHe(field, val)` / `heToEn(field, val)`

---

## 5. Known Issues

Known issues are tracked in SESSION_CONTEXT.md — single home for all open issues.

---

## 6. New Files (Phase 3)

### 6.1 `js/auth-service.js` (287 lines)
Core auth engine. Key functions:
- `verifyEmployeePIN(pin)` — PIN lookup, lockout check, failed_attempts management. Returns employee object or { locked: true } or null
- `initSecureSession(employee)` — token generation, DB insert, sessionStorage write, permission snapshot
- `loadSession()` — token validation, session restore, dev bypass support
- `clearSession()` — DB deactivate + sessionStorage clear + page reload
- `hasPermission(permissionKey)` — checks permission snapshot, supports '*' wildcard
- `requirePermission(permissionKey)` — guard: toast error + throw if unauthorized
- `applyUIPermissions()` — hides elements by data-permission + data-tab-permission
- `getCurrentEmployee()` — returns employee object from sessionStorage
- `assignRoleToEmployee(employeeId, roleId)` — upsert employee_roles
- `forceLogout(employeeId)` — deactivate all sessions for target employee

### 6.2 `modules/employees/employee-list.js` (283 lines)
Employee management screen. Key functions:
- `loadEmployeesTab()` — fetch employees + roles, render summary cards + table
- `renderEmployeeTable(employees)` — table with colored role badges + action buttons
- `openAddEmployee()` / `openEditEmployee(id)` — modal: name, PIN, role, branch
- `saveEmployee(data)` — insert/update employees + employee_roles
- `confirmDeactivateEmployee(id, name)` — PIN confirm → soft delete → invalidate sessions
- `renderPermissionMatrix(targetDivId)` — roles×permissions table, editable by CEO only
- `updateRolePermission(roleId, permissionId, granted)` — upsert role_permissions

---

## 7. Auth Flow (Phase 3)

1. App load → `loadSession()` → if no valid session → `showLoginModal()`
2. PIN entry → `verifyEmployeePIN()` → `initSecureSession()` → `applyUIPermissions()` → `hideLoginModal()`
3. Session expires after 8h → `clearSession()` → reload → login modal
4. 5 failed PINs → sessionStorage lock (client) + `locked_until` in DB (server-side, for correct-PIN-but-locked accounts)

---

## 8. Permission System (Phase 3)

- 5 roles with hierarchical access: ceo > manager > team_lead > worker > viewer
- 35 permissions checked via `hasPermission(key)` at runtime
- UI guards: `data-permission` on buttons, `data-tab-permission` on nav tabs
- `applyUIPermissions()` runs after every login and tab switch

---

## 9. Home Screen & Standalone Pages (Phase 3.5)

### New Files
- **index.html** — home screen: MODULES config array, 6 module cards, PIN login modal, session restore, live clock
- **employees.html** — standalone employee management page (extracted from inventory.html)

### Modified Files
- **inventory.html** — removed employees tab (nav button + section), added h1 "ניהול מלאי" + "← מסך בית" link, יציאה logout button
- **js/auth-service.js** — `clearSession()` redirects to index.html instead of page reload
- **modules/admin/admin.js** — `showUserButton()` populates adminBtnName span with employee name

### Module Cards
- `MODULES` config array in index.html — single source of truth for all home screen cards
- Fields per module: `id`, `label`, `icon`, `url`, `status`, `permission`
- `status`: `active` | `coming_soon` | `locked`
- `permission`: maps to a permission key checked via `hasPermission()` (e.g. `inventory.view`, `employees.view`)

### Permission-Based Card Lock
- Before login: all active cards show `locked-overlay` (lock icon + non-clickable)
- After login: active cards where `hasPermission(m.permission)` returns false keep the `locked-overlay`
- Coming-soon cards are always non-clickable regardless of permissions

---

## 10. Multi-Tenancy Foundation (Phase 3.75)

### תשתית
- טבלת `tenants` — id, name, slug, default_currency, timezone, locale, is_active
- `tenant_id UUID NOT NULL` נוסף לכל 20 הטבלאות הקיימות, כולל backfill של 13,457 שורות
- 25 אינדקסים (20 single + 5 composite) על tenant_id ושדות שכיחים

### אימות ובידוד
- **Edge Function `pin-auth`** — מקבל PIN, מוודא מול DB, מחזיר JWT חתום עם tenant_id claim
- **JWT-based RLS** — כל הטבלאות עם `tenant_isolation` policy: `USING (tenant_id = jwt_claim)`
- **service_bypass** — policy נוספת ל-service_role (migrations, admin)
- `sb` client נבנה מחדש עם JWT Bearer token אחרי login
- `loadSession()` משחזר JWT client מ-sessionStorage לפני שאילתות

### קוד JS
- כל `.insert()` ו-`.upsert()` מכילים `tenant_id: getTenantId()`
- כל `.select()` מסנן `.eq('tenant_id', getTenantId())` כ-defense-in-depth
- `getTenantId()` — קורא מ-sessionStorage
- `verifyPinOnly(pin)` — אימות PIN אמצע-סשן (לא login, לא JWT חדש)
