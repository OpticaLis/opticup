# Optic Up — Phase 5.9: Shipments & Box Management

> **Phase 5.9 — Feature Phase**
> **Dependencies:** Phase 5.75 complete
> **Location:** modules/Module 1 - Inventory Management/docs/PHASE_5.9_SPEC.md

---

## 1. Overview

Everything that leaves the store — framing, return, repair, customer delivery —
goes through a numbered box. This replaces the manual Access table.

**The feature is simple: Pack → Ship → Document. That's it.**

No complex statuses. No tracking return of items. No lab management.
Box is created → 30-minute edit window → locked forever. Like an invoice.

**New page:** `shipments.html` — card on home screen.

---

## 2. Core Rules

1. **BOX-{seq}** — sequential per tenant, immutable, never reused
2. **30-minute edit window** — after creation, items can be added/removed for 30 minutes OR until "נעל ושלח" is clicked (whichever comes first)
3. **After lock = immutable** — like an invoice. No edits, no deletes. Mistakes = new "correction box" linked to original
4. **Return items auto-update** — when a supplier_return item enters a box, its status auto-updates to 'shipped'. When removed (during edit window), it reverts to 'staged'
5. **writeLog on everything** — every pack, unpack, lock action logged
6. **PIN required** — for box creation and lock

---

## 3. Database Schema

### 3.1 Courier Companies

```sql
CREATE TABLE courier_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  phone           TEXT,
  contact_person  TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_couriers_tenant ON courier_companies(tenant_id);
```

### 3.2 Shipments (Boxes)

```sql
CREATE TABLE shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),

  -- Box identity
  box_number      TEXT NOT NULL,                  -- BOX-{seq}, immutable
  shipment_type   TEXT NOT NULL,
  -- 'framing'    — מסגור: הזמנה למעבדה
  -- 'return'     — זיכוי: החזרה לספק
  -- 'repair'     — תיקון: משלוח לתיקון
  -- 'delivery'   — משלוח: שליחה ללקוח

  -- Destination
  supplier_id     UUID REFERENCES suppliers(id),  -- for framing/return/repair
  customer_name   TEXT,                           -- for delivery (free text until CRM exists)
  customer_phone  TEXT,
  customer_address TEXT,

  -- Courier
  courier_id      UUID REFERENCES courier_companies(id),
  tracking_number TEXT,

  -- People & times
  packed_by       UUID NOT NULL REFERENCES employees(id),
  packed_at       TIMESTAMPTZ DEFAULT now(),
  locked_at       TIMESTAMPTZ,                    -- when edit window closed
  locked_by       UUID REFERENCES employees(id),

  -- Auto-lock: 30 minutes after packed_at if not manually locked
  -- Implemented in JS: check (now > packed_at + 30min) on every edit attempt

  -- Correction link
  corrects_box_id UUID REFERENCES shipments(id),  -- if this is a correction box

  -- Summary (denormalized, updated on item add/remove)
  items_count     INTEGER DEFAULT 0,
  total_value     DECIMAL(12,2) DEFAULT 0,

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  is_deleted      BOOLEAN DEFAULT false,

  UNIQUE(tenant_id, box_number)
);

CREATE INDEX idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX idx_shipments_tenant_type ON shipments(tenant_id, shipment_type);
CREATE INDEX idx_shipments_tenant_supplier ON shipments(tenant_id, supplier_id);
CREATE INDEX idx_shipments_tenant_date ON shipments(tenant_id, packed_at DESC);
CREATE INDEX idx_shipments_corrects ON shipments(corrects_box_id)
  WHERE corrects_box_id IS NOT NULL;
```

### 3.3 Shipment Items

```sql
CREATE TABLE shipment_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  shipment_id     UUID NOT NULL REFERENCES shipments(id),

  -- What kind of item
  item_type       TEXT NOT NULL,
  -- 'inventory'  — frame from stock
  -- 'order'      — customer order (framing)
  -- 'repair'     — repair item

  -- Links (polymorphic — use whichever applies)
  inventory_id    UUID REFERENCES inventory(id),
  return_id       UUID REFERENCES supplier_returns(id),

  -- Manual fields (until Orders/CRM modules exist)
  order_number    TEXT,
  customer_name   TEXT,
  customer_number TEXT,

  -- Item details (always filled — either from inventory or manual)
  barcode         TEXT,
  brand           TEXT,
  model           TEXT,
  size            TEXT,
  color           TEXT,
  category        TEXT,
  -- 'stock'       — מסגרת מהמלאי
  -- 'order'       — הזמנה
  -- 'production'  — ייצור
  -- 'multifocal'  — מולטיפוקל
  -- 'office'      — אופיס
  -- 'bifocal'     — ביפוקל
  -- 'sun'         — שמש
  -- 'contact'     — עדשות מגע
  -- 'repair'      — תיקון

  unit_cost       DECIMAL(10,2),

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ship_items_shipment ON shipment_items(shipment_id);
CREATE INDEX idx_ship_items_inventory ON shipment_items(inventory_id)
  WHERE inventory_id IS NOT NULL;
CREATE INDEX idx_ship_items_return ON shipment_items(return_id)
  WHERE return_id IS NOT NULL;
```

### 3.4 Box Number Generation

```sql
CREATE OR REPLACE FUNCTION next_box_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  -- Lock tenant row to serialize (same pattern as next_internal_doc_number)
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(box_number FROM 5) AS INTEGER)), 0)
  INTO v_max
  FROM shipments
  WHERE tenant_id = p_tenant_id
    AND box_number LIKE 'BOX-%'
    AND is_deleted = false;

  RETURN 'BOX-' || LPAD((v_max + 1)::TEXT, 4, '0');
END;
$$;
```

### 3.5 RLS

All three tables + RPC: standard tenant isolation + service bypass.

```sql
ALTER TABLE courier_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON courier_companies FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON courier_companies FOR ALL TO service_role USING (true);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shipments FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON shipments FOR ALL TO service_role USING (true);

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shipment_items FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON shipment_items FOR ALL TO service_role USING (true);
```

### 3.6 Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| courier_companies | tenant | RLS + queries |
| shipments | tenant | RLS |
| shipments | tenant + type | filter by shipment type |
| shipments | tenant + supplier | filter by supplier |
| shipments | tenant + date DESC | sort by most recent |
| shipments | corrects_box_id | find correction boxes |
| shipment_items | shipment_id | items per box |
| shipment_items | inventory_id | find which box a frame is in |
| shipment_items | return_id | find which box a return item is in |

---

## 4. Box Lifecycle

```
┌──────────┐    30 min or     ┌──────────┐
│  OPEN    │───"נעל ושלח"───→│  LOCKED  │
│          │    (PIN)         │          │
│ editable │                  │ immutable│
└──────────┘                  └──────────┘
                                   │
                              if mistake:
                                   │
                              ┌──────────┐
                              │CORRECTION│
                              │  BOX     │
                              │(new box, │
                              │ links to │
                              │ original)│
                              └──────────┘
```

**Open state:**
- Items can be added and removed
- Box details (courier, tracking, notes) can be edited
- Ends after 30 minutes OR when user clicks "נעל ושלח"

**Lock check (JS):**
```javascript
function isBoxEditable(box) {
  if (box.locked_at) return false;
  const thirtyMin = 30 * 60 * 1000;
  if (Date.now() - new Date(box.packed_at).getTime() > thirtyMin) return false;
  return true;
}
```

**Locked state:**
- No edits possible
- "נעול" badge displayed
- If mistake discovered: "ארגז תיקון" button creates new box with `corrects_box_id` pointing to this one

---

## 5. Flows

### 5.1 Create New Box — Framing (מסגור)

```
1. Click "📦 ארגז חדש"
2. Select type: "מסגור"
3. Select supplier/lab (dropdown)
4. Add items:
   - Order number (free text)
   - Customer name + number
   - Category (dropdown: order/production/multifocal/office/bifocal/sun/contact)
   - Barcode (optional — scan if sending a frame from stock)
   - Notes per item
5. Select courier company (dropdown from courier_companies)
6. Enter tracking number (optional at creation, can add later within edit window)
7. PIN → box created
8. Box number: BOX-{seq} auto-generated
9. Toast: "ארגז BOX-0488 נוצר — 30 דקות לעריכה"
```

### 5.2 Create New Box — Return (זיכוי)

```
1. Click "📦 ארגז חדש"
2. Select type: "זיכוי"
3. Select supplier (dropdown)
4. Add items — TWO METHODS:
   a. From supplier_returns: system shows all items in status 'staged' for this supplier
      → select items → auto-fills barcode, brand, model, size, color, cost
      → return_id linked
   b. Manual: enter details by hand (for items not in supplier_returns)
5. Select courier company + tracking number
6. PIN → box created
7. AUTO-UPDATE: all linked supplier_returns → status 'shipped', shipped_at = now()
8. writeLog: 'return_shipped' for each return item
9. Toast: "ארגז BOX-0489 נוצר — {n} פריטי זיכוי עודכנו ל-'נשלח'"
```

### 5.3 Create New Box — Repair (תיקון)

```
1. Click "📦 ארגז חדש"
2. Select type: "תיקון"
3. Select supplier/lab
4. Add items:
   - Barcode (scan from inventory)
   - Description of problem
   - Order number (if linked to customer order)
5. Courier + tracking
6. PIN → box created
```

### 5.4 Create New Box — Delivery (משלוח ללקוח)

```
1. Click "📦 ארגז חדש"
2. Select type: "משלוח"
3. Enter: customer name, phone, address
4. Add items:
   - Order number + item details
   - Barcode (if from stock)
5. Courier + tracking
6. PIN → box created
```

### 5.5 Remove Item During Edit Window

```
1. Box is open (< 30 min, not locked)
2. Click ✕ on item row
3. Confirm: "להסיר את הפריט מהארגז?"
4. Item removed from shipment_items
5. IF item has return_id:
   → supplier_returns status reverts to 'staged'
   → shipped_at cleared
   → writeLog: 'return_unshipped'
6. items_count and total_value recalculated
7. Toast: "פריט הוסר מארגז BOX-0488"
```

### 5.6 Lock Box

```
1. Click "🔒 נעל ושלח" (or auto-lock after 30 min)
2. If manual: PIN required
3. locked_at = now(), locked_by = current employee
4. Box becomes immutable
5. All edit buttons hidden
6. writeLog: 'shipment_locked'
7. Toast: "ארגז BOX-0488 ננעל"
```

### 5.7 Correction Box

```
1. View locked box → click "📦 ארגז תיקון"
2. New box created with:
   - corrects_box_id = original box id
   - Same supplier/customer
   - Empty items (user adds what needs correcting)
3. Notes should explain what's being corrected
4. Standard 30-min edit window applies
```

---

## 6. UI — shipments.html

### 6.1 Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [← מסך בית]      📦 משלוחים וארגזים      [שם עובד | התנתק]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  סינון: [סוג ▼] [ספק ▼] [חברת שליחויות ▼] [תאריך ▼]       │
│                                                    [📦 חדש]  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🟡 BOX-0488 │ מסגור │ מעבדה שמיר │ DHL │ TR123 │ 5 פר│  │
│  │    14:32     │       │            │     │       │₩2,100│  │
│  │    דני כהן   │       │            │     │       │ 🔓   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 🟡 BOX-0487 │ זיכוי │ רייבאן     │ FedEx│ TR456│ 3 פר│  │
│  │    11:15     │       │            │      │      │₩4,200│  │
│  │    שרה לוי   │       │            │      │      │ 🔓   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 🟡 BOX-0486 │ תיקון │ אופטיקל    │ —    │ —    │ 1 פר│  │
│  │    09:00     │       │            │      │      │₩350 │  │
│  │    מיכל רז   │       │            │      │      │ ✏️30m│  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [📥 ייצוא Excel]                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Box number column:** yellow/gold background, bold — stands out like in Access.

**Status indicators:**
- 🔓 = locked (immutable)
- ✏️30m = still editable (shows remaining minutes)
- 🔗 = correction box (links to original)

### 6.2 Box Detail Panel

Click on box row → slide-in panel or modal:

```
┌──────────────────────────────────────────┐
│ 📦 BOX-0488                    [🔓 נעול]│
├──────────────────────────────────────────┤
│ סוג: מסגור                              │
│ ספק/מעבדה: מעבדה שמיר                   │
│ שליחויות: DHL — TR12345678              │
│ נארז: דני כהן — 14/03/2026 14:32       │
│ ננעל: 14/03/2026 14:45                  │
│                                          │
│ ── פריטים (5) ──                         │
│ #1 │ הזמנה 1234 │ דנה כהן │ מולטיפוקל  │
│ #2 │ הזמנה 1235 │ יוסי לב │ ביפוקל     │
│ #3 │ 0012345    │ Ray-Ban │ stock       │
│ #4 │ הזמנה 1236 │ רונית  │ אופיס      │
│ #5 │ הזמנה 1237 │ אבי    │ שמש        │
│                                          │
│ הערות: דחוף — לקוח ממתין                │
│                                          │
│ [📋 הדפס manifest]  [📦 ארגז תיקון]     │
└──────────────────────────────────────────┘
```

**If box is still editable:**
- [➕ הוסף פריט] button visible
- ✕ button on each item row
- [✏️ ערוך פרטים] for courier/tracking/notes
- [🔒 נעל ושלח] button prominent
- Timer: "נותרו X:XX לעריכה"

### 6.3 New Box Wizard

```
Step 1: Type & Destination
  ┌─────────────────────────────────┐
  │ סוג ארגז:                       │
  │ [מסגור] [זיכוי] [תיקון] [משלוח]│
  │                                 │
  │ ספק/מעבדה: [dropdown     ▼]    │  ← visible for framing/return/repair
  │ OR                              │
  │ לקוח: [שם] [טלפון] [כתובת]     │  ← visible for delivery
  └─────────────────────────────────┘

Step 2: Items
  ┌─────────────────────────────────────┐
  │ [➕ הוסף פריט]                       │
  │                                     │
  │ For return type:                    │
  │ ┌─ פריטי זיכוי ממתינים ──────────┐ │
  │ │ ☑ RB5154 │ 0012345 │ staged    │ │
  │ │ ☑ RB3025 │ 0012346 │ staged    │ │
  │ │ ☐ OX8046 │ 0012400 │ staged    │ │
  │ └───────────────────────────────┘ │
  │ [+ הוסף ידנית]                     │
  │                                     │
  │ For framing type:                   │
  │ [מס' הזמנה] [שם לקוח] [מס' לקוח] │
  │ [קטגוריה ▼] [ברקוד] [הערות]       │
  │ [+ הוסף שורה]                       │
  └─────────────────────────────────────┘

Step 3: Courier & Confirm
  ┌─────────────────────────────────┐
  │ חברת שליחויות: [dropdown   ▼]  │
  │ מספר מעקב:    [            ]    │
  │ הערות:        [            ]    │
  │                                 │
  │ סיכום: 5 פריטים, ₪2,100       │
  │                                 │
  │      [ביטול]  [📦 צור ארגז]    │
  │               (PIN required)    │
  └─────────────────────────────────┘
```

### 6.4 Manifest Print

Click "📋 הדפס manifest" → opens print-friendly view:

```
┌─────────────────────────────────────┐
│ 📦 Optic Up — רשימת תכולה          │
│                                     │
│ ארגז: BOX-0488                      │
│ תאריך: 14/03/2026 14:32            │
│ סוג: מסגור                          │
│ יעד: מעבדה שמיר                     │
│ שליחויות: DHL — TR12345678          │
│ אורז: דני כהן                       │
│                                     │
│ # │ הזמנה │ לקוח    │ קטגוריה  │ ברקוד│
│ 1 │ 1234  │ דנה כהן │ מולטיפוקל│      │
│ 2 │ 1235  │ יוסי לב │ ביפוקל   │      │
│ 3 │ —     │ —       │ stock    │012345│
│ 4 │ 1236  │ רונית   │ אופיס   │      │
│ 5 │ 1237  │ אבי     │ שמש     │      │
│                                     │
│ סה"כ פריטים: 5                      │
│                                     │
│ חתימת מקבל: _____________           │
│ תאריך קבלה: _____________           │
└─────────────────────────────────────┘
```

Uses `window.print()` with `@media print` CSS.

---

## 7. Courier Companies Management

Small settings section within shipments.html (or in a modal):

```
┌─ חברות שליחויות ────────────────────┐
│                                      │
│ DHL      │ 03-1234567 │ יוסי │ [✏️] │
│ FedEx    │ 03-7654321 │ דנה  │ [✏️] │
│ UPS      │ —          │ —    │ [✏️] │
│ שליח פרטי│ 050-123456 │ מוטי │ [✏️] │
│                                      │
│ [+ הוסף חברה]                        │
└──────────────────────────────────────┘
```

Accessible from a ⚙️ button on the shipments page. CEO/Manager only.

---

## 8. Logs

| Action | writeLog Type | Details |
|--------|--------------|---------|
| Box created | 'shipment_created' | { box_number, type, supplier, items_count } |
| Item added | 'shipment_item_added' | { box_number, barcode, item_type, return_id } |
| Item removed (edit window) | 'shipment_item_removed' | { box_number, barcode, reason } |
| Box locked (manual) | 'shipment_locked' | { box_number, locked_by } |
| Box auto-locked (30 min) | 'shipment_auto_locked' | { box_number } |
| Correction box created | 'shipment_correction' | { box_number, corrects: original_box } |
| Return status updated | 'return_shipped' | { return_id, box_number } |
| Return status reverted | 'return_unshipped' | { return_id, box_number } |

---

## 9. Home Screen Update

Add card to index.html:

| Module | Icon | Status | Link |
|--------|------|--------|------|
| ניהול מלאי | 📦 | ✅ Active | inventory.html |
| מעקב חובות ספקים | 💰 | ✅ Active | suppliers-debt.html |
| משלוחים וארגזים | 📦 | ✅ Active | shipments.html |
| ניהול לקוחות | 👥 | 🔒 בקרוב | — |

**Note:** Use a different icon for shipments to distinguish from inventory. Suggestion: 🚚 or 📤.

---

## 10. File Structure

```
shipments.html                         — main page

modules/shipments/
  shipments-list.js                    — box list, filters, search
  shipments-create.js                  — new box wizard (3 steps)
  shipments-detail.js                  — box detail panel, item list
  shipments-items.js                   — add/remove items, return integration
  shipments-lock.js                    — lock logic, auto-lock timer, correction box
  shipments-manifest.js                — print manifest
  shipments-couriers.js                — courier companies CRUD

migrations/
  phase5_9_shipments.sql               — all tables, RLS, RPC, indexes
```

Each file ≤ 350 lines.

Page loads: shared.js, auth-service.js, supabase-ops.js, data-loading.js,
search-select.js, header.js, alerts-badge.js + the 7 module files above.

---

## 11. Contracts (RPC Functions)

```sql
-- Atomic box number generation
next_box_number(p_tenant_id UUID)
  → TEXT (e.g., 'BOX-0488')

-- Future modules can call:
getShipmentsBySupplier(p_supplier_id UUID, p_tenant_id UUID)
  → shipments[]

getShipmentItems(p_shipment_id UUID, p_tenant_id UUID)
  → shipment_items[]

getShipmentsForReturn(p_return_id UUID, p_tenant_id UUID)
  → shipments[] (find which box a return is in)
```

---

## 12. Views for External Access

```sql
-- Future supplier portal: supplier sees boxes sent to them
-- DO NOT CREATE NOW:
-- VIEW supplier_portal_shipments AS
--   SELECT box_number, shipment_type, packed_at, items_count, tracking_number
--   FROM shipments
--   WHERE supplier_id = current_setting('app.supplier_id')::uuid
--     AND tenant_id = current_setting('app.tenant_id')::uuid
--     AND is_deleted = false;
```

---

## 13. Verification Checklist

### Database:
- [ ] All 3 tables created with tenant_id + RLS
- [ ] next_box_number RPC works, sequential, no duplicates under concurrent load
- [ ] courier_companies seeded (or empty, ready for user input)
- [ ] Indexes created

### Box Creation:
- [ ] All 4 types work: framing, return, repair, delivery
- [ ] BOX-{seq} auto-generated, unique
- [ ] PIN required
- [ ] Items added correctly per type
- [ ] Return items: auto-selects from 'staged' supplier_returns
- [ ] Supplier dropdown filters correctly
- [ ] Courier dropdown works
- [ ] Summary (items count, total value) calculated

### Return Integration:
- [ ] Adding return item → supplier_returns status = 'shipped' + shipped_at
- [ ] Removing return item (edit window) → status reverts to 'staged' + shipped_at cleared
- [ ] writeLog for both directions
- [ ] Cannot add return item that's not in 'staged' status

### Edit Window:
- [ ] Items can be added within 30 minutes
- [ ] Items can be removed within 30 minutes (✕ button)
- [ ] Timer shows remaining minutes
- [ ] After 30 minutes → auto-lock, edit buttons hidden
- [ ] "נעל ושלח" locks immediately with PIN
- [ ] locked_at and locked_by recorded

### Lock & Immutability:
- [ ] Locked box → no add/remove/edit possible
- [ ] Locked box → "ארגז תיקון" button available
- [ ] Correction box → corrects_box_id links to original
- [ ] Correction box has its own 30-min window

### UI:
- [ ] Box list renders with yellow box numbers
- [ ] Filters work: type, supplier, courier, date
- [ ] Detail panel shows all items + metadata
- [ ] Manifest prints correctly (Hebrew, RTL, clean layout)
- [ ] Excel export works
- [ ] Courier management accessible to CEO/Manager

### Cross-page:
- [ ] Session from index.html → shipments.html works
- [ ] Permissions enforced
- [ ] Home screen card active and clickable
- [ ] Back button to home screen

### Regression:
- [ ] supplier_returns statuses not broken
- [ ] Existing debt dashboard unaffected
- [ ] All other pages load without errors

---

## 14. What's NOT in Phase 5.9

| Feature | When |
|---------|------|
| Lab tracking (received_at, lab_status, SLA) | Future lab module |
| Item return tracking (per-item status after sent) | Future lab module |
| Alerts for shipments (not received, SLA breach) | Future lab module |
| Order management integration (FK to orders table) | Future orders module |
| Customer management integration (FK to customers) | Future CRM module |
| Digital signature on manifest | Future enhancement |
| Barcode on box (print label) | Future enhancement |
| Photo of packed box | Future enhancement |
| Batch create boxes | Future enhancement |
| Auto-lock push notification | Future (Realtime) |

---

## 15. Execution Suggestion

```
5.9a — DB tables + migration + RPC (courier_companies, shipments, shipment_items, next_box_number)
5.9b — shipments.html skeleton + list + filters (shipments-list.js)
5.9c — New box wizard: type selection + item entry (shipments-create.js, shipments-items.js)
5.9d — Return integration: staged items picker + auto status update
5.9e — Lock system: 30-min timer + manual lock + auto-lock + correction box (shipments-lock.js)
5.9f — Detail panel + manifest print (shipments-detail.js, shipments-manifest.js)
5.9g — Courier management (shipments-couriers.js)
5.9h — Home screen card + permissions + testing
5.9i — Documentation update
```
