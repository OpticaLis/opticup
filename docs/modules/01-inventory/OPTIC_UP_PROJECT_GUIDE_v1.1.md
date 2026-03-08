# Optic Up (אופטיקה פריזמה) — Project Guide v1.1

> **Source:** Miro board "Optic Up Project New" — https://miro.com/app/board/uXjVIMS5jkU=
> **Extracted:** 2026-03-08
> **Updated:** 2026-03-08 — v1.1 (Inventory module v1.0 complete)
> **Board stats:** 8,262 items total (923 text, 6,183 shapes, 444 stencils/wireframes, 350 images, 290 connectors, 71 groups)

---

## 1. Overview

**Optic Up** is a comprehensive optical store management system designed for multi-branch optical businesses in Israel. The system manages the full lifecycle of an optical business: from customer intake (leads/CRM), through eye examinations, prescription management, frame and lens selection, order processing, inventory management, lab workflow, payments, and post-sale follow-up.

**Who uses it:**
- **Owner (בעלים)** — Full system access, manages branches, labs, finances, users, permissions, statistics
- **Director (מנהל)** — Manages users within assigned branches, cannot manage branches themselves
- **Manager** — Branch-level management, user assignment, scheduling
- **Cashier/Employee** — Day-to-day operations: orders, clients, inventory
- **Optometrist/Doctor** — Eye exams, prescriptions
- **Supplier (external)** — Catalog upload, price management via supplier portal
- **Client (external)** — Appointment booking, receives WhatsApp messages

**Problem it solves:**
Replaces fragmented manual processes (Excel spreadsheets, paper forms, disconnected systems) with a unified digital platform for optical businesses. Handles everything from walk-in lead tracking to multi-branch inventory synchronization, automated customer messaging, and financial reporting.

---

## 2. Modules List

| # | Module | Status |
|---|--------|--------|
| 1 | User Roles & Permissions | MVP |
| 2 | Branch Management | MVP |
| 3 | Client Management (CRM) | MVP |
| 4 | Eye Examination (בדיקת עיניים) | MVP |
| 5 | Order Management (הזמנות) | MVP |
| 6 | Frames Inventory (מלאי מסגרות) | MVP |
| 7 | Lens Inventory & Catalog (מלאי עדשות) | MVP |
| 8 | Contact Lenses | MVP |
| 9 | Lab Management (מעבדה) | MVP |
| 10 | Queue / Appointment System (תור) | MVP |
| 11 | Payments & POS (תשלומים) | MVP |
| 12 | Supplier Management (ספקים) | MVP |
| 13 | Purchase Orders (הזמנות רכש) | MVP |
| 14 | WhatsApp Messaging (הודעות) | MVP |
| 15 | Reports & Statistics (דוחות) | MVP |
| 16 | Lead Management System (CRM/Leads) | MVP |
| 17 | Loyalty Club (מועדון לקוחות) | MVP |
| 18 | Discounts & Coupons (הנחות וקופונים) | MVP |
| 19 | Repair Management (תיקונים) | MVP |
| 20 | Frame Reservation (שמירת מסגרות) | MVP |
| 21 | Settings & Configuration | MVP |
| 22 | "McDonalds System" (Order Tracking Board) | MVP |
| 23 | Calendar | MVP |
| 24 | Finance Management (כספים) | MVP |
| 25 | AI Integration | Post-MVP |
| 26 | Cash Register Integration | Post-MVP |
| 27 | Website Integration (WooCommerce) | Post-MVP |
| 28 | Myopia Management Module | MVP |

---

## 3. Module Details

### 3.1 User Roles & Permissions

**Purpose:** Control access to the system based on user roles.

**Roles:**
- **Owner:** Sees all. Can add/delete branches, labs, finances. Assign them to each other. See all statistics. Manage users and set permissions. Choose EDIT or VIEW permission per user.
  - EDIT — can add/delete branches and users
  - VIEW — can only see them, gets reports, cannot change anything
- **Director:** Manages users. Cannot manage branches. Can add a manager, assign him to branches he can see and set his permissions.
- **Manager:** Manages day-to-day operations within assigned branches
- **Cashier/Employee:** Operational access — orders, clients, inventory within assigned branch

**Business Rules:**
- Every user has an ID — full audit trail of all actions
- General activity log: Who did what and when
- Role-based permissions: Admin, Sales Rep, Marketing Manager
- Lead reassignment capability
- Status creation & editing
- Tag customization
- Audit logs: full activity history for each lead

### 3.2 Branch Management

**Purpose:** Support multi-branch optical businesses.

**Features:**
- Owner can add/remove branches
- Each branch has its own working hours (can have breaks in the middle)
- Branches can share optometrists/doctors
- Each branch has separate inventory
- Transfer stock between branches
- Multi-branch frame inventory view

### 3.3 Client Management (CRM)

**Purpose:** Full customer lifecycle management from lead to loyal customer.

**Client Card Fields:**
- Client ID / Lead ID, Full Name, Phone Number, Email
- City / Full Address, Neighborhood, Street + Number
- Language (for WhatsApp messages — Hebrew, Russian, English, Arabic)
- Club Member status, Accumulated credit, Number of purchases, Total purchased amount
- Last Clients — showing the last created clients
- Notes — each note leaves a time and date stamp

**Client Card Tabs:**
- Details, Orders, Glasses, Vision Function, Contact Lenses, Exams and Prescriptions, Expected Results

### 3.4 Eye Examination (בדיקת עיניים)

**Purpose:** Full optometric examination workflow with prescription management.

**Key features:** Optometrist name, client details, date (auto-set), health questionnaire, vision tests (keratometer, cover test, accommodation), prescription types (distance, reading, multifocal, bi-focal, mid range, office), follow-up intervals (1/3/6/9/12 months), printed results.

### 3.5 Order Management (הזמנות)

**Purpose:** Complete order lifecycle from creation to delivery.

**Order number format:** Branch#-OrderSeq-SubOrder (e.g., 1-1525-A)

**Order Statuses:** In process → Sent for framing → Waiting for lenses → Order ready → Order delivered

**Key Rules:**
- Order date cannot be changed
- Orders in ascending order only
- Auto-WhatsApp when in process and when ready

### 3.6 Frames Inventory (מלאי מסגרות)

**Purpose:** Complete frame inventory management with barcode system.

**Key Features:**
- Frame types: Full Rim, Half-Rim, Rimless
- Barcode scanning system (up to 7 digits, ascending order)
- Same barcode numbers may be reused across different branches
- Photo upload for each frame
- Real-time stock tracking per branch
- Multi-branch visibility
- Quantity changes only through Add/Remove prompts, not manual editing
- Color coding: Red (shortage), Yellow (spare)

### 3.7 Lens Inventory & Catalog (מלאי עדשות)

**Purpose:** Manage lens inventory, ordering, and catalog with supplier pricing.

**Lens Types:** Single Vision, Multifocal, Bi-Focal, Mid Range, Office, Contact lenses, RGB/Scleral

### 3.8 Contact Lenses

**Purpose:** Manage contact lens sales, packages, and auto-reminders.

**Package Types:** 3/6/12 months. Auto-messages at 30 and 14 days before expiry.

### 3.9 Lab Management (מעבדה)

**Purpose:** Internal lab workflow for lens processing and framing.

### 3.10 Queue / Appointment System (תור)

**Purpose:** Manage appointments for optometrists/doctors across branches.

### 3.11 Payments & POS (תשלומים)

**Purpose:** Handle payment processing within orders.

### 3.12 Supplier Management (ספקים)

**Purpose:** Manage supplier relationships, pricing, and invoices.

### 3.13 Purchase Orders (הזמנות רכש)

**Purpose:** Create and track orders to suppliers.

### 3.14–3.28

Remaining modules (WhatsApp, Reports, Lead Management, Loyalty, Discounts, Repairs, Reservation, Settings, McDonalds System, Calendar, Finance, AI, Cash Register, WooCommerce, Myopia) — see full SPEC.md for detailed specifications.

---

## 4. Integrations

| Integration | Priority | Notes |
|-------------|----------|-------|
| WhatsApp | MVP | Automated messages, multi-language |
| Excel/Barcode | MVP | Import/export, barcode printing |
| WooCommerce | Post-MVP | Website inventory sync |
| Cash Register | Post-MVP | Android POS integration |
| AI | Post-MVP | Smart support and analytics |

---

## 5. Module Contracts (חוזי מודולים)

> חוזים בין-מודוליים — כל מודול חדש שצריך לגשת למלאי חייב לעבור דרך הפונקציות האלה.

| Contract | Signature | Returns | Used By |
|----------|-----------|---------|---------|
| `getItemByBarcode(barcode)` | `async (barcode: string)` | `{id, fields}` record or `null` | Goods Receipt, PO, Orders (future) |
| `searchFrames(filters)` | `async ({brand, model, color, status, ...})` | Array of `{id, fields}` records | Orders (future), Reports (future) |
| `writeLog(action, inventoryId, details)` | `async (action: string, inventoryId: UUID, details: object)` | void (non-blocking) | All inventory operations |
| `employees` PIN verification | `sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle()` | `{id, name}` or `null` | Soft delete, Qty change, Permanent delete |
| `loadMaxBarcode()` | `async ()` → sets global `maxBarcode` | void (side effect: `maxBarcode` updated) | Entry, Excel import, Goods Receipt |
| `supplierOpts()` | `()` → returns HTML `<option>` string | `<option>` elements HTML string | Entry, PO, Goods Receipt |
| `createSearchSelect(id, options, placeholder)` | `(id, optionsArray, placeholder)` → returns HTML | Searchable select component HTML | Brand selection in Entry, PO, Goods Receipt |
| `confirmDialog(title, message)` | `async (title, message)` | `true` if confirmed, `false` if cancelled | Goods Receipt confirm, Cancel, Delete |
| `batchCreate(table, rows)` | `async (table: string, rows: object[])` | Array of created records | Entry, Excel import |
| `fieldsToRow(fields)` | `(fields: object)` → maps Hebrew→English | Row object with English column names | All inventory writes |
| `rowToRecord(row)` | `(row: object)` → maps English→Hebrew | `{id, fields}` compatible record | All inventory reads |

---

## 6. DB Status (סטטוס טבלאות)

> סטטוס כל הטבלאות ב-Supabase — מה נבנה ומה עוד לא.

| Table | Status | Migration | Notes |
|-------|--------|-----------|-------|
| `brands` | ✅ Built | `001_initial_schema.sql` | name, brand_type, default_sync, active, exclude_website |
| `suppliers` | ✅ Built | `001_initial_schema.sql` | name, contact, phone, email, rating, payment_terms |
| `employees` | ✅ Built | `002_logs_and_soft_delete.sql` | name, PIN, role, branch_id, is_active |
| `inventory` | ✅ Built | `001_initial_schema.sql` | Main table — barcode, brand_id, supplier_id, model, size, color, qty, prices, status, soft delete fields |
| `inventory_images` | ✅ Built | `001_initial_schema.sql` | storage_path, url, thumbnail_url, sort_order |
| `inventory_logs` | ✅ Built | `002_logs_and_soft_delete.sql` | 17 action types, qty/price before/after, performed_by, branch_id |
| `goods_receipts` | ✅ Built | `003_goods_receipts.sql` | receipt_number, receipt_type, supplier_id, status (draft/confirmed/cancelled) |
| `goods_receipt_items` | ✅ Built | `003_goods_receipts.sql` | receipt_id, inventory_id, barcode, brand, model, quantity, costs |
| `clients` | ❌ Not built | — | Future: CRM module |
| `orders` | ❌ Not built | — | Future: Order Management module |
| `order_items` | ❌ Not built | — | Future: Order Management module |
| `prescriptions` | ❌ Not built | — | Future: Eye Examination module |
| `appointments` | ❌ Not built | — | Future: Queue/Calendar module |
| `lenses` | ❌ Not built | — | Future: Lens Inventory module |
| `contact_lenses` | ❌ Not built | — | Future: Contact Lenses module |
| `repairs` | ❌ Not built | — | Future: Repair Management module |
| `payments` | ❌ Not built | — | Future: Payments module |
| `leads` | ❌ Not built | — | Future: Lead Management module |

**Extensions enabled:**
- `uuid-ossp` — UUID generation
- `pg_trgm` — Fuzzy text search (GIN indexes on model, color)

**RLS:** Enabled on all 8 built tables. Currently open access (`USING (true)`) — will tighten with Supabase Auth in future.

---

## 7. Module Development Status (סטטוס פיתוח מודולים)

| Module | Status | Version | Date | Notes |
|--------|--------|---------|------|-------|
| Frames Inventory (מלאי מסגרות) | ✅ הושלם | v1.0 | מרץ 2026 | Full CRUD, barcode BBDDDDD, Excel import/export, audit logs, soft delete, PIN verification, goods receipt, quantity control |
| User Roles & Permissions | ❌ טרם התחיל | — | — | Currently: admin mode with password 1234 |
| Branch Management | ❌ טרם התחיל | — | — | Currently: branch_id field exists but unused |
| Client Management (CRM) | ❌ טרם התחיל | — | — | — |
| Order Management | ❌ טרם התחיל | — | — | — |
| Lens Inventory | ❌ טרם התחיל | — | — | — |
| Contact Lenses | ❌ טרם התחיל | — | — | — |
| Lab Management | ❌ טרם התחיל | — | — | — |
| Payments | ❌ טרם התחיל | — | — | — |
| Reports | ❌ טרם התחיל | — | — | — |

---

## 8. Decision Log (יומן החלטות)

> החלטות ארכיטקטוניות ועסקיות שהתקבלו במהלך הפיתוח.

| # | Decision | Reasoning | Date |
|---|----------|-----------|------|
| 1 | **Add/Remove כמות בלבד** — שינוי כמות במלאי אפשרי רק דרך כפתורי ➕/➖ עם PIN, לא עריכה ישירה | מניעת טעויות, audit trail מלא לכל שינוי כמות. הלקוח (SPEC) דורש: "Amount should only change through Add/Remove prompts, not manually" | מרץ 2026 |
| 2 | **employees + PIN** — טבלת עובדים עם אימות PIN (4 ספרות) לפעולות רגישות | פתרון קל ללא Supabase Auth. PIN מאמת זהות לפני: מחיקה, שינוי כמות, מחיקה לצמיתות. ברירת מחדל: מנהל ראשי PIN 1234 | מרץ 2026 |
| 3 | **inventory_logs משותף** — טבלת לוגים אחת לכל סוגי הפעולות (17 action types) במקום טבלה לכל סוג | פשטות — טבלה אחת עם action field מכסה: entries, exits, edits, deletes, restores, tests. מאפשר סינון גמיש ב-system log. כל פעולה שומרת snapshot (barcode, brand, model) + qty/price before/after | מרץ 2026 |
| 4 | **goods_receipts במודול מלאי** — קבלת סחורה נבנתה כחלק ממודול המלאי ולא כמודול נפרד | קבלת סחורה קשורה ישירות למלאי — אישור קבלה מעדכן כמויות ויוצר פריטים חדשים. שומרת על flow אחיד: draft → confirmed → inventory updated + writeLog('entry_receipt') | מרץ 2026 |
| 5 | **Barcode format BBDDDDD** — 2 ספרות סניף + 5 ספרות רצות (00001–99999) | תומך ב-99 סניפים × 99,999 פריטים לסניף. loadMaxBarcode() סורק את כל הברקודים בסניף ומוצא את הבא בתור. ברקוד ייחודי (UNIQUE constraint WHERE NOT NULL) | מרץ 2026 |
| 6 | **Soft delete + recycle bin** — מחיקה רכה עם is_deleted flag במקום DELETE | מונע אובדן מידע. פריטים מחוקים עוברים לסל מיחזור, אפשר לשחזר. מחיקה לצמיתות דורשת PIN כפול. כל פעולה נרשמת בלוג | מרץ 2026 |
| 7 | **Single-file architecture** — כל האפליקציה בקובץ index.html אחד (~4,600 שורות) | פשטות deployment — GitHub Pages, אין build step. מתאים לשלב MVP. יפורק למודולים בשלב מאוחר יותר | מרץ 2026 |
| 8 | **Supabase over Airtable** — מיגרציה מ-Airtable ל-Supabase (PostgreSQL) | Airtable rate limits, no FK constraints, limited querying. Supabase: proper SQL, RLS, real-time, scalable. Compatibility layer (rowToRecord/fieldsToRow) preserves existing code patterns | מרץ 2026 |

---

## 9. Flows

### 9.1 New Client → Order Flow
1. Client walks in or books appointment
2. Create new client (or find existing)
3. Eye examination by optometrist
4. Prescription generated
5. Create new order (from eye exam or directly)
6. Select frame (from inventory, scan barcode)
7. Select lenses (filtered by prescription)
8. Select coatings, apply discounts/coupons
9. Payment processing
10. Order enters "In Process" → WhatsApp confirmation
11. Track through McDonalds System → Lab processing
12. Order Ready → WhatsApp notification → Client picks up

### 9.2 Lead → Client Conversion Flow
1. Lead enters (Facebook, Google, WhatsApp, walk-in, website)
2. Assigned to sales agent
3. Status pipeline: New → Contacted → Interested → Appointment Set
4. One-click conversion to client on purchase

### 9.3 Contact Lens Package Flow
1. Client purchases package (3/6/12 months)
2. System tracks expiry → Auto-messages at 30 and 14 days

### 9.4 Lens Inventory Flow
1. Lens deducted → ordered → arrived → framing → completed

### 9.5 Purchase Order Flow
1. Create PO → items marked "Pending Arrival"
2. Rep notified via WhatsApp → Track arrivals

### 9.6 Repair Flow
1. Client brings glasses → new/existing check → repair form → track status

### 9.7 Goods Receipt Flow (NEW — v1.0)
1. Shipment arrives from supplier
2. Create new receipt: type (delivery note/invoice), number, supplier, date
3. Add items: search by barcode (existing) or add manually (new)
4. Optional: import items from Excel
5. Save as draft (can edit/cancel later)
6. Confirm receipt:
   - Existing items → inventory quantity increased
   - New items → created in inventory with generated barcode
   - All changes logged as `entry_receipt` in `inventory_logs`
7. Receipt status: draft → confirmed (irreversible)

---

## 10. UI/UX Notes

### General Design Principles:
- Fast and mobile-friendly UI
- Minimal typing with dropdowns and smart autofill
- RTL support (Hebrew primary language)
- Multi-language: Hebrew, Russian, English, Arabic
- Dark blue + white + gray theme
- Card-based layout for entry/PO items

### Key Screens:
1. Home/Dashboard — "Hi, Manager" greeting, quick access
2. Client Card — Tabbed interface
3. Order Form — Multi-section with lenses, frames, measurements
4. Frames Catalogue — Grid/list with filters, barcode scanning
5. Inventory Management — Main table with inline editing, bulk operations
6. System Log — Admin-only, filterable audit trail
7. Goods Receipt — 2-step flow (list → form)
8. McDonalds System — Visual order tracking board
9. Reports Dashboard — Charts, filters, export

---

## 11. Open Questions & Unclear Items

1. Access Database Migration — legacy data from Microsoft Access?
2. Multifocal Non-Adaptation Path — what happens if client doesn't adapt?
3. Delivery Notes vs Invoices — full comparison logic not detailed
4. Product Category Performance Report — exact metrics not specified
5. Website Integration — scope of WooCommerce adjustments undefined
6. Cash Register — specific hardware/software not identified
7. Supplier Portal External Access — decision pending
8. Arabic Language Support — implied but not confirmed
9. Family Membership — how are family members linked?
10. Myopia Management Data — displayed within system or external?
11. Health Questionnaire — how is response captured back?
12. Coating Pricing — "LETS TALK FOR CLARIFICATION" noted on board
13. Barcode Format — ✅ RESOLVED: BBDDDDD format (2-digit branch + 5-digit sequence)

---

## 12. Priority Order

### Phase 1 — Core MVP
1. User Roles & Permissions
2. Branch Management
3. Client Management
4. **Frames Inventory** ✅ COMPLETE (v1.0)
5. Order Management
6. Lens Inventory & Catalog
7. Eye Examination
8. Payments

### Phase 2 — Operations
9. Lab Management
10. Purchase Orders
11. Supplier Management
12. McDonalds System
13. Queue/Appointments
14. Calendar

### Phase 3 — Engagement & Growth
15. WhatsApp Messaging
16. Contact Lenses
17. Repairs
18. Frame Reservation
19. Lead Management
20. Discounts & Coupons
21. Loyalty Club

### Phase 4 — Analytics
22. Reports & Statistics
23. Finance Management
24. Settings & Configuration
25. Myopia Management

### Phase 5 — Post-MVP
26. AI Integration
27. Cash Register
28. WooCommerce

---

## 13. Business Rules Summary

1. Order date cannot be changed
2. Orders in ascending order only
3. Each order/branch/sub-order has a unique number
4. Every user has ID — full audit trail
5. Every prescription has a date — cannot be changed
6. Inventory quantity changes only through Add/Remove prompts (PIN required)
7. Barcodes: BBDDDDD format, ascending, unique per system
8. WhatsApp messages sent in client's profile language
9. All reports exportable to CSV/Excel
10. Soft delete: items go to recycle bin, restorable, permanent delete requires double PIN

---

## 14. Confidence Assessment

Approximately **90-95%** of the Miro board content was extracted through programmatic API and visual verification. 8,262 items across a massive canvas were processed. Some visual wireframe details (~5-10%) in stencil items and images are best reviewed directly on the Miro board.

---

> **v1.1 Changes:** Added sections 5-8 (Module Contracts, DB Status, Module Development Status, Decision Log). Updated Barcode open question as resolved. Added Goods Receipt flow. Marked Frames Inventory as complete in priority order.
