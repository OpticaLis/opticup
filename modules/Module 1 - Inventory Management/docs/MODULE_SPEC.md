# מלאי מסגרות — Module Spec
## גרסה 3.0 | מרץ 2026 | Post-Phase 2

---

## 1. סקירה כללית

**מודול מלאי מסגרות** הוא הליבה של מערכת Optic Up — מנהל את כל מחזור החיים של מסגרות משקפיים במלאי: כניסה, מעקב, עריכה, מכירה, מחיקה, שחזור, ספירת מלאי וסנכרון עם Access.

**סטאק טכנולוגי:**
- Frontend: Vanilla JS (no framework), index.html (shell) + 32 JS modules + CSS
- Backend: Supabase (PostgreSQL + REST API + RPC functions), client = `sb`
- Excel: SheetJS (xlsx) לייבוא/ייצוא
- Barcode: ZXing (camera-based scanning for stock count)
- Deploy: GitHub Pages → https://opticalis.github.io/prizma-inventory/
- Watcher: Node.js + chokidar (Dropbox folder watcher for Access sync)

**קבצים:**
```
index.html              — HTML shell + nav + modals + script tags
css/styles.css          — all styles

js/                     — 4 global files (load first)
├── shared.js           — Supabase init, constants, caches, utilities
├── supabase-ops.js     — DB abstraction: fetchAll, batchCreate, batchUpdate, writeLog
├── data-loading.js     — App init: loadData, loadMaxBarcode, low stock alerts
└── search-select.js    — Reusable searchable dropdown component

modules/
├── inventory/          — 7 files: table, edit, entry, reduction, excel-import, excel-export, access-sales
├── purchasing/         — 5 files: purchase-orders, po-form, po-items, po-actions, po-view-import
├── goods-receipts/     — 4 files: goods-receipt, receipt-form, receipt-actions, receipt-excel
├── audit/              — 3 files: audit-log, item-history, qty-modal
├── brands/             — 2 files: brands, suppliers
├── access-sync/        — 4 files: access-sync, sync-details, pending-panel, pending-resolve
├── stock-count/        — 3 files: stock-count-list, stock-count-session, stock-count-report
└── admin/              — 2 files: admin, system-log

scripts/
├── sync-watcher.js     — Node.js Dropbox folder watcher for Access sales files
├── config.example.json — Config template (config.json is gitignored)
├── install-service.js  — Windows Service wrapper (node-windows)
├── uninstall-service.js
└── README.md           — Hebrew installation guide

migrations/             — SQL migrations (012-015 for Phase 2)
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
| email | TEXT | אימייל (Phase 3) |
| phone | TEXT | טלפון (Phase 3) |
| branch_id | TEXT DEFAULT '00' | קוד סניף (Phase 3) |
| created_by | UUID FK → employees | מי יצר (Phase 3) |
| last_login | TIMESTAMPTZ | התחברות אחרונה (Phase 3) |
| failed_attempts | INTEGER DEFAULT 0 | ניסיונות כושלים (Phase 3) |
| locked_until | TIMESTAMPTZ | נעול עד (Phase 3) |

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
| reason, source_ref | TEXT | סיבה + מקור (watcher / manual / null) |
| sale_amount | NUMERIC(10,2) | Access: מחיר לפני הנחות |
| discount | NUMERIC(10,2) | Access: הנחה קבועה |
| discount_1 | NUMERIC(10,2) | Access: הנחה נוספת 1 |
| discount_2 | NUMERIC(10,2) | Access: הנחה נוספת 2 |
| final_amount | NUMERIC(10,2) | Access: מחיר סופי |
| coupon_code | TEXT | Access: קוד קופון |
| campaign | TEXT | Access: שם מבצע |
| employee_id | TEXT | Access: עובד מוכר |
| lens_included | BOOLEAN | Access: עדשות כלולות |
| lens_category | TEXT | Access: קטגוריית עדשה |
| order_number | TEXT | Access: מספר הזמנה POS |
| sync_filename | TEXT | Access: שם קובץ Excel מקור |
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

### 2.11 `sync_log` — לוג סנכרונים (`T.SYNC_LOG`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| created_at | TIMESTAMPTZ | חותמת זמן |
| filename | TEXT NOT NULL | שם קובץ Excel |
| source_ref | TEXT NOT NULL CHECK (watcher / manual) | מקור |
| status | TEXT NOT NULL CHECK (success / partial / error) | סטטוס |
| rows_total | INTEGER | סה"כ שורות |
| rows_success | INTEGER | שורות שהצליחו |
| rows_pending | INTEGER | שורות ממתינות |
| rows_error | INTEGER | שורות שנכשלו |
| error_message | TEXT | הודעת שגיאה |
| errors | JSONB | מערך שגיאות מפורט (015) |
| storage_path | TEXT | נתיב קובץ ב-Supabase Storage (015) |
| processed_at | TIMESTAMPTZ | זמן סיום עיבוד |

### 2.12 `pending_sales` — מכירות ממתינות (`T.PENDING_SALES`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| created_at | TIMESTAMPTZ | חותמת זמן |
| sync_log_id | UUID FK → sync_log | לוג סנכרון |
| source_ref | TEXT NOT NULL | מקור (watcher / manual) |
| filename | TEXT NOT NULL | שם קובץ |
| barcode_received | TEXT NOT NULL | ברקוד שהתקבל |
| quantity | INTEGER NOT NULL | כמות |
| action_type | TEXT NOT NULL CHECK (sale / return) | סוג פעולה |
| transaction_date | DATE NOT NULL | תאריך עסקה |
| order_number | TEXT NOT NULL | מספר הזמנה |
| employee_id, sale_amount, discount, discount_1, discount_2, final_amount | TEXT / NUMERIC | פרטי מכירה |
| coupon_code, campaign, lens_included, lens_category | TEXT / BOOLEAN / TEXT | פרטים נוספים |
| reason | TEXT NOT NULL | סיבה |
| status | TEXT DEFAULT 'pending' CHECK (pending / resolved / ignored) | סטטוס |
| resolved_at | TIMESTAMPTZ | זמן טיפול |
| resolved_by | TEXT | מי טיפל |
| resolved_inventory_id | UUID FK → inventory | פריט שהותאם |
| resolution_note | TEXT | הערת פתרון |

### 2.13 `watcher_heartbeat` — מוניטור Watcher (`T.HEARTBEAT`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | INTEGER PK DEFAULT 1 | מזהה (תמיד 1) |
| last_beat | TIMESTAMPTZ | דופק אחרון |
| watcher_version | TEXT | גרסת watcher |
| host | TEXT | שם מחשב |

### 2.14 `stock_counts` — ספירות מלאי (`T.STOCK_COUNTS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| count_number | TEXT NOT NULL UNIQUE | מספר ספירה: SC-YYYY-NNNN |
| count_date | DATE NOT NULL DEFAULT CURRENT_DATE | תאריך ספירה |
| status | TEXT NOT NULL DEFAULT 'in_progress' | סטטוס (in_progress / completed / cancelled) |
| counted_by | TEXT | מי ספר (שם עובד) |
| notes | TEXT | הערות |
| total_items | INTEGER DEFAULT 0 | סה"כ פריטים שנספרו |
| total_diffs | INTEGER DEFAULT 0 | סה"כ פערים |
| branch_id | TEXT | קוד סניף |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | נוצר |
| completed_at | TIMESTAMPTZ | הושלם |

### 2.15 `stock_count_items` — שורות ספירה (`T.STOCK_COUNT_ITEMS`)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| count_id | UUID FK → stock_counts ON DELETE CASCADE | ספירה |
| inventory_id | UUID FK → inventory ON DELETE CASCADE | פריט מלאי |
| barcode | TEXT | ברקוד (snapshot) |
| brand | TEXT | מותג (snapshot) |
| model | TEXT | דגם (snapshot) |
| color | TEXT | צבע (snapshot) |
| size | TEXT | גודל (snapshot) |
| expected_qty | INTEGER NOT NULL | כמות צפויה |
| actual_qty | INTEGER | כמות בפועל |
| difference | INTEGER GENERATED ALWAYS AS (actual_qty - expected_qty) STORED | פער (computed) |
| status | TEXT NOT NULL DEFAULT 'pending' | סטטוס (pending / counted / skipped) |
| notes | TEXT | הערה |
| counted_at | TIMESTAMPTZ | מתי נספר |
| scanned_by | TEXT | מי סרק (014) |

### 2.16 RPC Functions (Supabase)
| Function | Parameters | Description |
|----------|------------|-------------|
| `increment_inventory` | `(inv_id UUID, delta INTEGER)` | Atomic: `quantity = quantity + delta` (012) |
| `decrement_inventory` | `(inv_id UUID, delta INTEGER)` | Atomic: `quantity = GREATEST(0, quantity - delta)` (012) |
| `set_inventory_qty` | `(inv_id UUID, new_qty INTEGER)` | Direct set: `quantity = new_qty` — stock count approval (013) |

### 2.17 Supabase Storage
| Bucket | Purpose |
|--------|---------|
| `failed-sync-files` | Stores Excel files that failed/partially processed during Access sync (015) |

### 2.18 `roles` — תפקידים (Phase 3)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | TEXT PK | 'ceo' \| 'manager' \| 'team_lead' \| 'worker' \| 'viewer' |
| name_he | TEXT | שם תצוגה בעברית |
| description | TEXT | תיאור |
| is_system | BOOLEAN DEFAULT true | תפקיד מערכת (לא ניתן למחיקה) |
| created_at | TIMESTAMPTZ | חותמת זמן |

5 system rows inserted by default — cannot be deleted

### 2.19 `permissions` — הרשאות (Phase 3)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | TEXT PK | e.g. 'inventory.view', 'purchase_order.create' |
| module | TEXT | מודול (inventory, stock_count, purchasing, etc.) |
| action | TEXT | פעולה (view, create, edit, delete, etc.) |
| name_he | TEXT | שם בעברית |
| description | TEXT | תיאור |
| created_at | TIMESTAMPTZ | חותמת זמן |

35 permissions across 9 modules: inventory, stock_count, purchasing, goods_receipts, sync, brands, suppliers, employees, reports, audit, settings

### 2.20 `role_permissions` — מיפוי תפקיד←הרשאה (Phase 3)
| שדה | סוג | תיאור |
|-----|------|--------|
| role_id | TEXT FK → roles | תפקיד (PK) |
| permission_id | TEXT FK → permissions | הרשאה (PK) |
| granted | BOOLEAN DEFAULT true | האם מוענקת |

PK: (role_id, permission_id). 94 default mappings inserted by migration

### 2.21 `employee_roles` — שיוך עובד←תפקיד (Phase 3)
| שדה | סוג | תיאור |
|-----|------|--------|
| employee_id | UUID FK → employees | עובד (PK) |
| role_id | TEXT FK → roles | תפקיד (PK) |
| granted_by | UUID FK → employees | מי שייך |
| granted_at | TIMESTAMPTZ | מתי שויך |

PK: (employee_id, role_id)

### 2.22 `auth_sessions` — סשנים (Phase 3)
| שדה | סוג | תיאור |
|-----|------|--------|
| id | UUID PK | מזהה |
| employee_id | UUID FK → employees | עובד |
| token | TEXT UNIQUE | טוקן אקראי 32-char hex |
| permissions | JSONB | snapshot הרשאות בזמן התחברות |
| role_id | TEXT | תפקיד |
| branch_id | TEXT DEFAULT '00' | סניף |
| created_at | TIMESTAMPTZ | נוצר |
| expires_at | TIMESTAMPTZ | פג תוקף (NOW()+8h) |
| last_active | TIMESTAMPTZ | פעילות אחרונה |
| is_active | BOOLEAN | פעיל |

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

1. **loadPOsForSupplier console warning** — fires when receipt tab loads without supplier. Non-blocking.
2. **RLS פתוח** — all tables use `USING (true)` — needs hardening with auth
3. **branch_id inconsistency** — some tables UUID, some TEXT
4. **Images** — basic upload only, no edit/delete/reorder from UI

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
