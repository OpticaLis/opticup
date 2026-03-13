# Optic Up — Phase 4: Supplier Debt & Enhanced Goods Receipt

> **Phase 4 — Feature Phase**
> **Dependencies:** Phase 3.75 complete (multi-tenancy in place)
> **Location:** modules/Module 1 - Inventory Management/docs/PHASE_4_SPEC.md

---

## 1. Overview

Phase 4 builds three interconnected capabilities:

1. **Supplier Debt Tracking** — invoices, payments, prepaid deals, dashboard
2. **Enhanced Goods Receipt** — mandatory barcodes, document linking, streamlined flow
3. **Supplier Returns & Credits** — return initiation, status tracking, future-ready schema

Everything is manual in this phase. OCR (scan invoice → auto-fill) comes in Phase 5
as an acceleration layer on top of what we build here.

**New page:** `suppliers-debt.html` — standalone module, card on home screen.

---

## 2. The Four Supplier Patterns

The system must support all four real-world patterns:

### Pattern A — Invoice Per Shipment
```
Goods arrive → Invoice attached → Scan invoice → Enter to inventory → Debt created
→ Payment → Debt cleared
```

### Pattern B — Delivery Notes + Monthly Invoice
```
Goods arrive → Delivery note attached (has prices) → Scan note → Enter to inventory
→ Debt accumulates per delivery note
→ End of month: Invoice arrives listing all delivery notes → Link notes to invoice
→ Payment against invoice → Debt cleared
```

### Pattern C — Prepaid Check Deal
```
Start of year: Give supplier X checks for total ₪Y
→ Order goods throughout the year → Each delivery reduces prepaid balance
→ System monitors: total prepaid vs total goods received
→ Balance runs low → Alert → Add more checks or settle
```

### Pattern D — Credits & Returns
```
Decision to return goods → Remove from inventory (PIN + reason "supplier credit")
→ Track return status (pending → ready → shipped/picked up)
→ Eventually: supplier sends credit note → Reduce debt
(Credit note matching = future finance module)
```

---

## 3. Database Schema

### 3.1 Document Types & Invoices

```sql
-- Configurable document types (not hardcoded enum)
CREATE TABLE document_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,          -- 'invoice', 'delivery_note', 'credit_note', 'receipt'
  name_he         TEXT NOT NULL,          -- 'חשבונית מס', 'תעודת משלוח', 'חשבונית זיכוי', 'קבלה'
  name_en         TEXT NOT NULL,
  affects_debt    TEXT NOT NULL,          -- 'increase', 'decrease', 'none'
  is_system       BOOLEAN DEFAULT true,   -- system types can't be deleted
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Seed default types per tenant (via migration or onboarding)
-- invoice          → affects_debt: 'increase'
-- delivery_note    → affects_debt: 'increase'
-- credit_note      → affects_debt: 'decrease'
-- receipt          → affects_debt: 'none'

-- Main invoices/documents table
CREATE TABLE supplier_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  document_type_id  UUID NOT NULL REFERENCES document_types(id),

  -- Document info
  document_number   TEXT NOT NULL,            -- supplier's document number
  document_date     DATE NOT NULL,            -- date on the document
  due_date          DATE,                     -- payment due date (null for delivery notes)
  received_date     DATE DEFAULT CURRENT_DATE,-- when we received/scanned it

  -- Amounts
  currency          TEXT NOT NULL DEFAULT 'ILS',  -- ISO 4217
  exchange_rate     DECIMAL(10,4) DEFAULT 1.0,    -- rate to ILS at document_date
  subtotal          DECIMAL(12,2) NOT NULL,       -- before VAT
  vat_rate          DECIMAL(5,2) DEFAULT 17.0,    -- VAT percentage
  vat_amount        DECIMAL(12,2) NOT NULL,
  total_amount      DECIMAL(12,2) NOT NULL,       -- final amount

  -- For monthly invoices that reference delivery notes
  parent_invoice_id UUID REFERENCES supplier_documents(id),  -- null for standalone

  -- File attachment
  file_url          TEXT,                     -- scanned PDF/image URL
  file_name         TEXT,

  -- Linkage
  goods_receipt_id  UUID REFERENCES goods_receipts(id),  -- linked receipt (optional)
  po_id             UUID REFERENCES purchase_orders(id),  -- linked PO (optional)

  -- Status
  status            TEXT NOT NULL DEFAULT 'open',
  -- open → partially_paid → paid → cancelled
  -- For delivery notes: open → linked (to monthly invoice) → paid (via parent)

  paid_amount       DECIMAL(12,2) DEFAULT 0,  -- running total of payments
  notes             TEXT,

  -- Metadata
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

-- Link table: which delivery notes are covered by a monthly invoice
CREATE TABLE document_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  parent_document_id UUID NOT NULL REFERENCES supplier_documents(id),  -- the monthly invoice
  child_document_id  UUID NOT NULL REFERENCES supplier_documents(id),  -- the delivery note
  amount_on_invoice  DECIMAL(12,2),  -- amount listed on invoice for this note
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_document_id, child_document_id)
);
```

### 3.2 Payments

```sql
CREATE TABLE supplier_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),

  -- Payment info
  amount            DECIMAL(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ILS',
  exchange_rate     DECIMAL(10,4) DEFAULT 1.0,
  payment_date      DATE NOT NULL,
  payment_method    TEXT NOT NULL,             -- from payment_methods table
  reference_number  TEXT,                      -- check number, transfer confirmation, etc.

  -- For prepaid deals
  prepaid_deal_id   UUID REFERENCES prepaid_deals(id),  -- null if regular payment

  notes             TEXT,
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

-- Which documents does this payment cover (many-to-many)
CREATE TABLE payment_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  payment_id        UUID NOT NULL REFERENCES supplier_payments(id),
  document_id       UUID NOT NULL REFERENCES supplier_documents(id),
  allocated_amount  DECIMAL(12,2) NOT NULL,    -- how much of this payment goes to this doc
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payment_id, document_id)
);

-- Configurable payment methods (not hardcoded)
CREATE TABLE payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,          -- 'bank_transfer', 'check', 'cash', 'credit_card'
  name_he         TEXT NOT NULL,          -- 'העברה בנקאית', 'צ׳ק', 'מזומן', 'כרטיס אשראי'
  name_en         TEXT NOT NULL,
  is_system       BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, code)
);
```

### 3.3 Prepaid Deals

```sql
CREATE TABLE prepaid_deals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),

  -- Deal info
  deal_name         TEXT,                        -- "עסקת 2026" or auto-generated
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  total_prepaid     DECIMAL(12,2) NOT NULL,      -- total checks given
  currency          TEXT NOT NULL DEFAULT 'ILS',

  -- Running totals (updated by triggers or app logic)
  total_used        DECIMAL(12,2) DEFAULT 0,     -- total goods received against this deal
  total_remaining   DECIMAL(12,2),               -- computed: total_prepaid - total_used

  -- Alert threshold
  alert_threshold_pct  DECIMAL(5,2) DEFAULT 20.0,  -- alert when remaining < 20%
  alert_threshold_amt  DECIMAL(12,2),               -- or when remaining < fixed amount

  status            TEXT DEFAULT 'active',       -- active / completed / cancelled
  notes             TEXT,

  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

-- Individual checks given as part of a prepaid deal
CREATE TABLE prepaid_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  prepaid_deal_id   UUID NOT NULL REFERENCES prepaid_deals(id),
  check_number      TEXT NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  check_date        DATE NOT NULL,              -- when the check is dated for
  status            TEXT DEFAULT 'pending',     -- pending / cashed / bounced / cancelled
  cashed_date       DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Supplier Returns

```sql
CREATE TABLE supplier_returns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),

  -- Return info
  return_number     TEXT NOT NULL,               -- auto-generated: RET-{supplier_number}-{seq}
  return_type       TEXT NOT NULL,               -- 'agent_pickup', 'ship_to_supplier', 'pending_in_store'
  reason            TEXT,                        -- free text reason

  -- Status
  status            TEXT DEFAULT 'pending',
  -- pending → ready_to_ship → shipped → received_by_supplier → credited
  -- For agent_pickup: pending → ready → picked_up → credited
  -- For pending_in_store: pending (stays until decision)

  -- Dates
  created_at        TIMESTAMPTZ DEFAULT now(),
  ready_at          TIMESTAMPTZ,                 -- when items were packed/ready
  shipped_at        TIMESTAMPTZ,                 -- filled by future logistics module
  received_at       TIMESTAMPTZ,                 -- confirmed by supplier

  -- Credit (filled by future finance module)
  credit_note_number TEXT,
  credit_amount      DECIMAL(12,2),
  credit_document_id UUID REFERENCES supplier_documents(id),

  -- Metadata
  notes             TEXT,
  created_by        UUID REFERENCES employees(id),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE TABLE supplier_return_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  return_id         UUID NOT NULL REFERENCES supplier_returns(id),
  inventory_id      UUID NOT NULL REFERENCES inventory(id),
  barcode           TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,

  -- Item details snapshot (at time of return decision)
  brand_name        TEXT,
  model             TEXT,
  color             TEXT,
  size              TEXT,
  cost_price        DECIMAL(10,2),              -- price at time of return

  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### 3.5 Currencies

```sql
CREATE TABLE currencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,          -- ISO 4217: 'ILS', 'USD', 'EUR'
  name_he         TEXT NOT NULL,
  symbol          TEXT NOT NULL,          -- '₪', '$', '€'
  is_default      BOOLEAN DEFAULT false,  -- one per tenant
  is_active       BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, code)
);

-- Seed per tenant: ILS (default), USD, EUR
```

### 3.6 Indexes

```sql
-- supplier_documents
CREATE INDEX idx_supdocs_tenant ON supplier_documents(tenant_id);
CREATE INDEX idx_supdocs_tenant_supplier ON supplier_documents(tenant_id, supplier_id);
CREATE INDEX idx_supdocs_tenant_status ON supplier_documents(tenant_id, status);
CREATE INDEX idx_supdocs_tenant_due ON supplier_documents(tenant_id, due_date);
CREATE INDEX idx_supdocs_parent ON supplier_documents(parent_invoice_id);

-- supplier_payments
CREATE INDEX idx_suppay_tenant ON supplier_payments(tenant_id);
CREATE INDEX idx_suppay_tenant_supplier ON supplier_payments(tenant_id, supplier_id);

-- payment_allocations
CREATE INDEX idx_payalloc_tenant ON payment_allocations(tenant_id);
CREATE INDEX idx_payalloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payalloc_document ON payment_allocations(document_id);

-- prepaid_deals
CREATE INDEX idx_prepaid_tenant_supplier ON prepaid_deals(tenant_id, supplier_id);

-- supplier_returns
CREATE INDEX idx_supret_tenant ON supplier_returns(tenant_id);
CREATE INDEX idx_supret_tenant_supplier ON supplier_returns(tenant_id, supplier_id);
CREATE INDEX idx_supret_tenant_status ON supplier_returns(tenant_id, status);

-- document_links
CREATE INDEX idx_doclinks_parent ON document_links(parent_document_id);
CREATE INDEX idx_doclinks_child ON document_links(child_document_id);
```

### 3.7 RLS Policies

All tables above get:
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table}
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY service_bypass ON {table}
  FOR ALL TO service_role USING (true);
```

---

## 4. Supplier Configuration

Add columns to existing `suppliers` table:

```sql
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS
  default_document_type TEXT DEFAULT 'invoice',    -- what this supplier usually sends
  -- 'invoice' = invoice per shipment (Pattern A)
  -- 'delivery_note' = delivery notes + monthly invoice (Pattern B)

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS
  default_currency TEXT DEFAULT 'ILS',

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS
  payment_terms_days INTEGER DEFAULT 30,           -- default due date offset

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS
  has_prepaid_deal BOOLEAN DEFAULT false;           -- quick filter
```

---

## 5. Enhanced Goods Receipt Flow

### 5.1 Current Flow (what exists)
```
New Receipt → Choose doc type + number + supplier → Link to PO (optional)
→ Add items → Confirm → Inventory updated
```

### 5.2 New Flow (Phase 4)
```
New Receipt → Choose doc type + number + supplier
→ System auto-detects: Does this supplier usually send invoices or delivery notes?
→ Pre-fills document type accordingly

→ Link to PO (optional — auto-suggests open POs for this supplier)

→ Add items:
   - Existing items: barcode scan or search
   - New items: MUST assign barcode (auto-generated per BBDDDDD rules) before entry
   - Each item: quantity, cost_price (from PO or manual)

→ Review screen: all items with barcodes, quantities, prices

→ Confirm (PIN required):
   1. Inventory quantities updated (atomic RPC)
   2. writeLog() for each item
   3. supplier_documents record created automatically
      - type = based on what supplier sent
      - amount = sum of (quantity × cost_price) per item + VAT
      - status = 'open'
      - linked to this goods_receipt
   4. If supplier has prepaid deal → deduct from deal balance

→ Toast: "קבלה אושרה · מסמך ספק #{number} נוצר · חוב עודכן"
```

### 5.3 Mandatory Barcodes

**Iron rule: No item enters inventory without a barcode.**

For new items (not yet in system):
1. Employee enters brand/model/color/size
2. System auto-generates next available barcode per BBDDDDD rules
3. Barcode is shown to employee for label printing
4. Item is created in inventory with quantity 0
5. Then quantity is added via the receipt (standard Add flow)

For existing items:
- Scan barcode or search — works as today

### 5.4 Info Button — Employee Guide

A prominent `ℹ️ מידע` button on the goods receipt screen opens a modal/panel
with step-by-step instructions:

```
📦 קבלת סחורה — מדריך מהיר

1. סחורה הגיעה? בדוק מה מצורף:
   • חשבונית מס → בחר "חשבונית מס"
   • תעודת משלוח → בחר "תעודת משלוח"

2. סרוק או צלם את המסמך (שמירה לתיקייה משותפת)

3. פתח "קבלה חדשה":
   • בחר ספק (המערכת תזהה את סוג המסמך הרגיל שלו)
   • הכנס מספר מסמך
   • אם יש הזמנת רכש פתוחה — היא תופיע אוטומטית

4. הוסף פריטים:
   • פריט קיים → סרוק ברקוד או חפש
   • פריט חדש → הכנס פרטים → ברקוד ייווצר אוטומטית
   • ודא כמויות ומחירים

5. בדוק את הסיכום ואשר עם PIN

✅ המלאי יתעדכן, החוב לספק ייווצר אוטומטית
```

This text is stored in a configurable location (not hardcoded in JS) so it can
be updated or translated per tenant in the future.

---

## 6. suppliers-debt.html — Debt Dashboard

### 6.1 Page Structure

```
┌──────────────────────────────────────────────────────────────┐
│  [← מסך בית]    מעקב חובות ספקים    [שם עובד | התנתק]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ חוב כולל │ │ לתשלום   │ │ באיחור   │ │ שולם     │       │
│  │ ₪125,400 │ │ השבוע    │ │ ₪12,300  │ │ החודש    │       │
│  │          │ │ ₪28,000  │ │ 🔴       │ │ ₪45,000  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  [טאב: ספקים] [טאב: מסמכים] [טאב: תשלומים] [טאב: עסקאות]  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Supplier table / Document list / Payment list /       │  │
│  │ Prepaid deals — based on active tab                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Summary Cards

| Card | Calculation |
|------|-------------|
| חוב כולל | Sum of all open documents (total_amount - paid_amount) where affects_debt = 'increase', minus credit notes |
| לתשלום השבוע | Open documents with due_date within next 7 days |
| באיחור | Open documents where due_date < today. Red if > 0 |
| שולם החודש | Sum of payments this calendar month |

All amounts in ILS (converted via exchange_rate for foreign currency docs).

### 6.3 Tab: Suppliers (ספקים)

Table showing all suppliers with open debt:

| Column | Content |
|--------|---------|
| ספק | Supplier name |
| מסמכים פתוחים | Count of open documents |
| חוב כולל | Total open debt |
| באיחור | Amount overdue (red if > 0) |
| תשלום הבא | Nearest due_date |
| עסקה מראש | ✅/— and remaining balance if exists |
| פעולות | [צפה] [תשלום חדש] |

Click supplier row → opens supplier detail view (6.7).

### 6.4 Tab: Documents (מסמכים)

All supplier documents, filterable:

**Filters:** supplier, document type, status, date range, overdue only

| Column | Content |
|--------|---------|
| תאריך | document_date |
| סוג | document type name_he |
| מספר | document_number |
| ספק | supplier name |
| סכום | total_amount (with currency symbol) |
| שולם | paid_amount |
| יתרה | total_amount - paid_amount |
| סטטוס | badge: open/partially_paid/paid/linked |
| פעולות | [צפה] [שלם] [קשר לחשבונית] |

**"קשר לחשבונית"** — visible only for delivery notes. Opens modal to link
this delivery note to a monthly invoice (creates document_links record).

### 6.5 Tab: Payments (תשלומים)

**[+ תשלום חדש]** button at top.

| Column | Content |
|--------|---------|
| תאריך | payment_date |
| ספק | supplier name |
| סכום | amount |
| אמצעי | payment method name_he |
| אסמכתא | reference_number |
| כנגד | linked document numbers |

### 6.6 Tab: Prepaid Deals (עסקאות מראש)

| Column | Content |
|--------|---------|
| ספק | supplier name |
| שם עסקה | deal_name |
| תקופה | start_date → end_date |
| סה"כ מראש | total_prepaid |
| נוצל | total_used |
| יתרה | total_remaining |
| סטטוס | active/completed (progress bar visual) |
| פעולות | [צפה] [הוסף צ'ק] |

**Progress bar:** visual indicator of total_used / total_prepaid.
Turns red when below alert threshold.

### 6.7 Supplier Detail View

When clicking a supplier from the table, slide-in panel or full view:

```
┌──────────────────────────────────────────┐
│ [← חזרה]  כרטיס ספק: רייבאן              │
├──────────────────────────────────────────┤
│ חוב כולל: ₪45,200  |  באיחור: ₪8,000    │
│ עסקה מראש: ₪120,000 (נותר: ₪23,400)     │
│                                          │
│ [מסמכים] [תשלומים] [החזרות] [היסטוריה]   │
│                                          │
│ Timeline of all activity:                │
│  📄 15/03 תעודת משלוח #4521 — ₪12,300   │
│  📄 12/03 תעודת משלוח #4518 — ₪8,200    │
│  💰 01/03 תשלום העברה — ₪25,000          │
│  📄 28/02 חשבונית מס #1205 — ₪25,000    │
│  🔄 25/02 החזרה RET-15-0003 — 3 פריטים  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 7. Supplier Returns Flow

### 7.1 Initiating a Return

From inventory module (inventory.html):
1. Select items to return (checkbox on inventory table)
2. Click "זיכוי לספק" button
3. Modal: choose return type (agent_pickup / ship_to_supplier / pending_in_store)
4. Enter reason (free text)
5. PIN verification
6. System:
   - Creates `supplier_returns` record
   - Creates `supplier_return_items` for each item (snapshots item details)
   - Removes quantity via standard Remove flow (writeLog with action 'supplier_return')
   - Status = 'pending'
   - Toast: "זיכוי #{return_number} נוצר · {n} פריטים הוצאו מהמלאי"

### 7.2 Returns Dashboard

In suppliers-debt.html, within supplier detail view, "החזרות" tab:

| Column | Content |
|--------|---------|
| מספר | return_number |
| תאריך | created_at |
| סוג | return_type (Hebrew label) |
| פריטים | count of items |
| סטטוס | pending / ready / shipped / credited |
| סכום | sum of cost_price × quantity |
| פעולות | [צפה] [עדכן סטטוס] |

**Status updates available in Phase 4:**
- pending → ready_to_ship (user marks items as packed)
- pending_in_store stays as-is until decision

**Status updates deferred to future modules:**
- shipped, received_by_supplier → logistics module
- credited → finance module

---

## 8. Payment Flow

### 8.1 New Payment

**[+ תשלום חדש]** opens a modal/wizard:

**Step 1:** Select supplier (searchable dropdown)
→ Shows: total open debt, overdue amount, open documents

**Step 2:** Enter payment details:
- Amount
- Payment date
- Payment method (from payment_methods table)
- Reference number
- Notes

**Step 3:** Allocate to documents:
→ List of open documents for this supplier
→ Auto-allocate from oldest first (default)
→ Or manual: enter amount per document
→ Partial payment: remaining amount stays on document
→ Overpayment: warn + require confirmation

**Step 4:** Confirm with PIN
→ Creates supplier_payments record
→ Creates payment_allocations for each document
→ Updates paid_amount on each supplier_documents record
→ Updates status: if paid_amount >= total_amount → 'paid', else 'partially_paid'
→ If prepaid deal → creates/links to prepaid_deal
→ writeLog()

### 8.2 Monthly Invoice Linking (Pattern B)

When a monthly invoice arrives:

1. Create new document: type = 'invoice', enter details
2. Click "קשר תעודות משלוח"
3. System shows all unlinked delivery notes for this supplier
4. User selects which notes this invoice covers
5. System:
   - Creates document_links records
   - Updates delivery note status to 'linked'
   - Invoice total should match sum of linked notes (warn if mismatch)
   - Debt is NOT doubled — delivery notes already created debt
   - Payment goes against the invoice (not the individual notes)

---

## 9. Prepaid Deal Management

### 9.1 Creating a Deal

**[+ עסקה חדשה]** in the Prepaid Deals tab:

1. Select supplier
2. Deal name (or auto-generate: "עסקת {supplier_name} {year}")
3. Start/end dates
4. Total amount
5. Add checks: number, amount, date for each check
6. Alert threshold (% or fixed amount)
7. PIN to confirm

### 9.2 Linking Goods to Deal

When a goods receipt is confirmed for a supplier with an active prepaid deal:
- System asks: "לקזז מעסקה מראש?" (yes/no)
- If yes: the receipt's document amount is deducted from the deal's total_used
- total_remaining is recalculated
- If total_remaining drops below threshold → alert badge on dashboard

### 9.3 Alerts

- **Dashboard alert:** red badge on prepaid deals tab when any deal below threshold
- **Summary card:** "עסקה מראש מתקרבת לסיום" when < 20% remaining
- **In supplier detail:** warning banner

---

## 10. File Structure

```
suppliers-debt.html                    — main page
js/
  suppliers-debt/
    debt-dashboard.js                  — summary cards, tab switching
    debt-documents.js                  — documents tab: list, filter, CRUD
    debt-payments.js                   — payments tab: list, payment wizard
    debt-prepaid.js                    — prepaid deals tab: list, manage
    debt-supplier-detail.js            — supplier detail view, timeline
    debt-returns.js                    — returns view within supplier detail
    debt-monthly-link.js               — monthly invoice linking flow
```

Each file ≤ 350 lines. The page loads shared.js, auth-service.js, supabase-ops.js,
data-loading.js, search-select.js + the above module files.

**In inventory.html — additions:**
- "זיכוי לספק" button + modal (in existing inventory table module)
- Enhanced goods receipt form (mandatory barcode for new items)
- Auto-creation of supplier_documents on receipt confirmation
- Info button with employee guide

---

## 11. Contracts (RPC Functions)

These functions are exposed for other modules to call:

```sql
-- Get total debt for a supplier
getSupplierDebt(p_supplier_id UUID, p_tenant_id UUID)
  → { total_debt, overdue, next_due_date, open_documents_count }

-- Get debt dashboard summary
getDebtDashboard(p_tenant_id UUID)
  → { total_debt, due_this_week, overdue, paid_this_month }

-- Get all documents for a supplier
getDocumentsBySupplier(p_supplier_id UUID, p_tenant_id UUID, p_status TEXT DEFAULT NULL)
  → supplier_documents[]

-- Get payments for a document
getPaymentsByDocument(p_document_id UUID, p_tenant_id UUID)
  → supplier_payments[]

-- Get prepaid deal status
getPrepaidDealStatus(p_deal_id UUID, p_tenant_id UUID)
  → { total_prepaid, total_used, total_remaining, alert_active }

-- Get supplier returns
getReturnsBySupplier(p_supplier_id UUID, p_tenant_id UUID)
  → supplier_returns[] with items

-- Create payment with allocations (atomic)
createPayment(p_payment JSON, p_allocations JSON[], p_tenant_id UUID)
  → payment_id

-- Create supplier document from goods receipt (atomic)
createDocumentFromReceipt(p_receipt_id UUID, p_document JSON, p_tenant_id UUID)
  → document_id
```

---

## 12. Views for External Access

Prepared for future Supplier Portal (Phase 6) and Storefront:

```sql
-- Supplier sees their own documents (no internal notes, no cost breakdowns)
-- DO NOT CREATE NOW — just ensure schema supports it:
-- VIEW supplier_portal_documents AS
--   SELECT document_number, document_date, total_amount, status, paid_amount
--   FROM supplier_documents
--   WHERE supplier_id = current_setting('app.supplier_id')::uuid
--     AND tenant_id = current_setting('app.tenant_id')::uuid
--     AND is_deleted = false;

-- VIEW supplier_portal_returns AS
--   SELECT return_number, status, created_at, item_count
--   FROM supplier_returns ...
```

---

## 13. Home Screen Update

Add card to index.html:

| Module | Icon | Status | Link |
|--------|------|--------|------|
| ניהול מלאי | 📦 | ✅ Active | inventory.html |
| מעקב חובות ספקים | 💰 | ✅ Active | suppliers-debt.html |
| ניהול לקוחות | 👥 | 🔒 בקרוב | — |

---

## 14. Verification Checklist

### Database:
- [ ] All new tables have tenant_id NOT NULL + RLS
- [ ] document_types seeded with 4 types for Prizma tenant
- [ ] payment_methods seeded with 4 methods for Prizma tenant
- [ ] currencies seeded with ILS, USD, EUR for Prizma tenant
- [ ] Indexes created on all tables
- [ ] supplier_returns future fields exist but nullable

### Goods Receipt Enhancement:
- [ ] New items require barcode before entry
- [ ] Auto-barcode generation works (BBDDDDD)
- [ ] Supplier default document type pre-fills
- [ ] supplier_documents record created on receipt confirmation
- [ ] Prepaid deal deduction prompt works
- [ ] Info button shows employee guide
- [ ] PIN required for confirmation

### Debt Dashboard:
- [ ] Summary cards calculate correctly
- [ ] All four tabs render and filter
- [ ] Supplier detail view shows timeline
- [ ] Monthly invoice linking works
- [ ] Payment wizard with allocation works
- [ ] Prepaid deals progress bar + alerts work
- [ ] Returns tab shows statuses correctly

### Supplier Returns:
- [ ] "זיכוי לספק" button in inventory
- [ ] Items removed from inventory via standard Remove flow
- [ ] supplier_returns + items created
- [ ] Status updates work (pending → ready_to_ship)
- [ ] Return number auto-generated

### Cross-page:
- [ ] Session passes from index.html → suppliers-debt.html
- [ ] Permissions enforced (who can see debt data)
- [ ] suppliers-debt.html works with zero data (empty state)
- [ ] Back button to home screen works

### Regression:
- [ ] Existing goods receipt flow still works
- [ ] Existing inventory CRUD unaffected
- [ ] All previous E2E tests pass

---

## 15. What's NOT in Phase 4

| Feature | Deferred To |
|---------|-------------|
| OCR — scan document → auto-fill | Phase 5 |
| Supplier learning (remember formats per supplier) | Phase 5 |
| Automatic payment reminders/alerts (push/email) | Phase 5 |
| Credit note matching to return | Future finance module |
| Logistics — shipping, manifests, tracking | Future logistics module |
| Exchange rate API (auto-fetch rates) | Future enhancement |
| Receipt PDF generation (for supplier) | Future enhancement |
| Multi-branch debt tracking | When multi-branch is built |

---

## 16. Execution Suggestion for Secondary Chat

This is a big phase. Recommended split into sub-phases:

```
4a — DB tables + migrations + seeds (all tables, indexes, RLS)
4b — Enhanced goods receipt (mandatory barcodes, document auto-creation, info button)
4c — suppliers-debt.html skeleton (page, auth, tabs, summary cards)
4d — Documents tab (list, filter, CRUD, monthly linking)
4e — Payments tab (list, wizard, allocations)
4f — Prepaid deals tab (list, manage, alerts)
4g — Supplier detail view (timeline, returns tab)
4h — Supplier returns flow (from inventory.html)
4i — Integration testing + documentation
```

Each sub-phase = 1-3 days of work with the secondary chat.
