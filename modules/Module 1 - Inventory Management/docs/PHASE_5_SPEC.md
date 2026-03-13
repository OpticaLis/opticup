# Optic Up — Phase 5: AI Agent for Supplier Management

> **Phase 5 — Feature Phase**
> **Dependencies:** Phase 4 complete (supplier documents, file upload, debt tracking all working)
> **Location:** modules/Module 1 - Inventory Management/docs/PHASE_5_SPEC.md

---

## 1. Overview

Phase 5 adds an AI layer on top of Phase 4's manual flows. The three pillars:

1. **OCR** — scan invoice/delivery note → Claude Vision extracts all data → auto-fills form
2. **Alerts** — in-app notifications for due payments, anomalies, prepaid thresholds
3. **Weekly Report** — summary screen + exportable PDF

The AI agent does NOT replace the human. It **proposes**, the human **confirms**.
Every OCR result is shown for review before anything is saved.

**Architecture principle:** Claude Vision API is called from a Supabase Edge Function —
never from the browser. The API key is a platform secret, not per-tenant.

---

## 2. Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Browser     │     │  Edge Function       │     │  Claude Vision   │
│              │     │  ocr-extract         │     │  API             │
│  Upload file │────>│                      │────>│                  │
│  or use      │     │  1. Fetch from       │     │  Analyze image   │
│  existing    │     │     Storage          │     │  Return JSON     │
│  file_url    │     │  2. Send to Claude   │<────│                  │
│              │<────│  3. Return parsed    │     └──────────────────┘
│  Show review │     │     data             │
│  form        │     └─────────────────────┘
│              │
│  User edits  │     ┌─────────────────────┐
│  & confirms  │────>│  Save to            │
│              │     │  supplier_documents  │
│              │     │  + learning record   │
└──────────────┘     └─────────────────────┘
```

---

## 3. Database Schema

### 3.1 AI Agent Configuration

```sql
CREATE TABLE ai_agent_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID UNIQUE NOT NULL REFERENCES tenants(id),

  -- OCR settings
  ocr_enabled         BOOLEAN DEFAULT true,
  auto_match_supplier BOOLEAN DEFAULT true,     -- try to match supplier from doc
  auto_match_po       BOOLEAN DEFAULT true,     -- try to match PO from doc
  confidence_threshold DECIMAL(3,2) DEFAULT 0.80, -- below this = flag for review

  -- Alert settings
  alerts_enabled      BOOLEAN DEFAULT true,
  payment_reminder_days INTEGER DEFAULT 7,       -- remind X days before due_date
  overdue_alert        BOOLEAN DEFAULT true,
  prepaid_threshold_alert BOOLEAN DEFAULT true,
  anomaly_alert        BOOLEAN DEFAULT true,

  -- Weekly report
  weekly_report_enabled BOOLEAN DEFAULT true,
  weekly_report_day     INTEGER DEFAULT 1,       -- 1=Sunday (Israeli week start)

  -- API source (platform pays for now — field ready for future)
  api_key_source      TEXT DEFAULT 'platform',   -- 'platform' / 'tenant_provided'
  tenant_api_key      TEXT,                      -- encrypted, only if tenant_provided

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Supplier OCR Templates (Learning)

```sql
CREATE TABLE supplier_ocr_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),

  -- What the AI learned about this supplier's documents
  template_name       TEXT,                      -- "חשבונית רגילה" / "תעודת משלוח"
  document_type_code  TEXT,                      -- which document type this template is for

  -- Field locations / patterns the AI identified
  extraction_hints    JSONB NOT NULL DEFAULT '{}',
  -- Example:
  -- {
  --   "supplier_name_pattern": "אופטיקה סיטי בע\"מ",
  --   "document_number_label": "חשבונית מספר",
  --   "date_format": "DD/MM/YYYY",
  --   "items_table_headers": ["פריט", "כמות", "מחיר", "סה\"כ"],
  --   "vat_label": "מע\"מ",
  --   "total_label": "סה\"כ לתשלום",
  --   "currency": "ILS"
  -- }

  -- Learning stats
  times_used          INTEGER DEFAULT 0,
  times_corrected     INTEGER DEFAULT 0,
  accuracy_rate       DECIMAL(5,2),              -- computed: 1 - (corrected/used)
  last_used_at        TIMESTAMPTZ,

  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, supplier_id, document_type_code)
);
```

### 3.3 OCR Extraction Log

```sql
CREATE TABLE ocr_extractions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),

  -- Source
  file_url            TEXT NOT NULL,              -- what was scanned
  file_name           TEXT,

  -- Raw AI response
  raw_response        JSONB NOT NULL,             -- full Claude Vision response
  model_used          TEXT DEFAULT 'claude-sonnet-4-20250514',

  -- Parsed result
  extracted_data      JSONB NOT NULL,             -- structured extracted fields
  -- {
  --   "supplier_name": "...",
  --   "supplier_match_id": "uuid or null",
  --   "supplier_match_confidence": 0.95,
  --   "document_type": "invoice",
  --   "document_number": "1234",
  --   "document_date": "2026-03-15",
  --   "due_date": "2026-04-15",
  --   "currency": "ILS",
  --   "subtotal": 10000,
  --   "vat_rate": 17,
  --   "vat_amount": 1700,
  --   "total_amount": 11700,
  --   "items": [
  --     { "description": "Ray-Ban RB5154", "quantity": 3, "unit_price": 350, "total": 1050 },
  --     ...
  --   ],
  --   "po_match": { "po_number": "PO-15-0042", "confidence": 0.88 }
  -- }

  -- What happened after
  confidence_score    DECIMAL(3,2),               -- overall extraction confidence
  status              TEXT DEFAULT 'pending',     -- pending / accepted / corrected / rejected
  corrections         JSONB,                      -- what the user changed
  -- { "document_number": { "ai": "1234", "user": "12345" }, ... }

  -- Linkage
  supplier_document_id UUID REFERENCES supplier_documents(id),  -- created doc
  template_id          UUID REFERENCES supplier_ocr_templates(id),
  processed_by         UUID REFERENCES employees(id),

  processing_time_ms  INTEGER,                    -- how long Claude took
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Alerts

```sql
CREATE TABLE alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),

  -- Alert info
  alert_type          TEXT NOT NULL,
  -- 'payment_due'         — payment coming up in X days
  -- 'payment_overdue'     — payment past due date
  -- 'prepaid_low'         — prepaid deal below threshold
  -- 'price_anomaly'       — price doesn't match PO/historical
  -- 'amount_mismatch'     — invoice total doesn't match delivery notes
  -- 'ocr_low_confidence'  — OCR result needs manual review
  -- 'duplicate_document'  — possible duplicate document detected

  severity            TEXT DEFAULT 'info',        -- 'info', 'warning', 'critical'
  title               TEXT NOT NULL,              -- "תשלום בעוד 3 ימים — רייבאן ₪12,300"
  message             TEXT,                       -- detailed description
  data                JSONB,                      -- structured data for the alert
  -- { "supplier_id": "...", "document_id": "...", "amount": 12300, "due_date": "..." }

  -- Status
  status              TEXT DEFAULT 'unread',      -- 'unread', 'read', 'dismissed', 'actioned'
  read_at             TIMESTAMPTZ,
  dismissed_at        TIMESTAMPTZ,
  dismissed_by        UUID REFERENCES employees(id),
  action_taken        TEXT,                       -- what the user did about it

  -- Link to relevant entity
  entity_type         TEXT,                       -- 'supplier_document', 'prepaid_deal', 'ocr_extraction'
  entity_id           UUID,                       -- ID of that entity

  expires_at          TIMESTAMPTZ,                -- auto-dismiss after this date
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

### 3.5 Weekly Report Snapshots

```sql
CREATE TABLE weekly_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),

  -- Period
  week_start          DATE NOT NULL,
  week_end            DATE NOT NULL,

  -- Snapshot data (denormalized for historical record)
  report_data         JSONB NOT NULL,
  -- {
  --   "total_debt": 125400,
  --   "overdue": 12300,
  --   "paid_this_week": 45000,
  --   "new_documents": 8,
  --   "upcoming_payments": [
  --     { "supplier": "רייבאן", "amount": 12300, "due_date": "2026-03-20" },
  --     ...
  --   ],
  --   "overdue_documents": [...],
  --   "prepaid_deals_status": [...],
  --   "anomalies_detected": 2,
  --   "ocr_stats": { "scanned": 12, "auto_filled": 10, "corrected": 2, "accuracy": 0.83 }
  -- }

  -- PDF
  pdf_url             TEXT,                       -- generated PDF stored in Storage
  pdf_generated_at    TIMESTAMPTZ,

  created_at          TIMESTAMPTZ DEFAULT now()
);
```

### 3.6 Indexes

```sql
CREATE INDEX idx_ocr_extractions_tenant ON ocr_extractions(tenant_id);
CREATE INDEX idx_ocr_extractions_status ON ocr_extractions(tenant_id, status);
CREATE INDEX idx_ocr_templates_tenant_supplier ON supplier_ocr_templates(tenant_id, supplier_id);
CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_tenant_status ON alerts(tenant_id, status);
CREATE INDEX idx_alerts_tenant_type ON alerts(tenant_id, alert_type);
CREATE INDEX idx_alerts_expires ON alerts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_weekly_reports_tenant ON weekly_reports(tenant_id);
CREATE INDEX idx_weekly_reports_period ON weekly_reports(tenant_id, week_start);
```

### 3.7 RLS

All tables: standard tenant isolation + service bypass (same pattern as Phase 4).

---

## 4. Edge Function: ocr-extract

### 4.1 Purpose

Receives a file reference, sends to Claude Vision API, returns structured data.
Runs on Supabase Edge Functions (Deno). API key stored in Supabase Secrets.

### 4.2 Endpoint

```
POST /functions/v1/ocr-extract
Authorization: Bearer {user_jwt}
Content-Type: application/json

{
  "file_url": "supplier-docs/tenant-abc/1234.pdf",  // Storage path
  "supplier_id": "uuid-or-null",                     // if known
  "document_type_hint": "invoice",                    // optional hint
  "tenant_id": "uuid"
}
```

### 4.3 Flow

```
1. Validate JWT → extract tenant_id
2. Fetch file from Supabase Storage (signed URL)
3. If supplier_id provided → load supplier_ocr_templates for hints
4. Build Claude Vision prompt (see 4.4)
5. Call Claude Vision API
6. Parse response into structured JSON
7. Try to match supplier (if not provided):
   - Compare extracted supplier name against suppliers table
   - Use fuzzy matching / LIKE / trigram
8. Try to match PO (if auto_match_po enabled):
   - Look for open POs for matched supplier
   - Compare amounts/items
9. Calculate confidence score
10. Save to ocr_extractions table
11. Return extracted_data + confidence + matches to browser
```

### 4.4 Claude Vision Prompt

```
You are an expert at reading Israeli supplier invoices and delivery notes
for optical stores. Extract the following fields from this document:

Required fields:
- supplier_name: The supplier/company name
- document_type: "invoice" / "delivery_note" / "credit_note"
- document_number: The document number
- document_date: Date on the document (format: YYYY-MM-DD)
- due_date: Payment due date if shown (format: YYYY-MM-DD)
- currency: ISO 4217 code (usually ILS)
- subtotal: Amount before VAT
- vat_rate: VAT percentage (usually 17%)
- vat_amount: VAT amount
- total_amount: Final total including VAT

Optional fields:
- items: Array of line items, each with:
  - description: Item description
  - model: Model name/number if identifiable
  - quantity: Number of items
  - unit_price: Price per item
  - total: Line total
- po_reference: If a PO number is mentioned
- delivery_note_references: If invoice references delivery note numbers

{supplier_hints}

Respond ONLY with valid JSON. No markdown, no explanation.
If a field cannot be determined, use null.
Include a "confidence" field (0-1) for each extracted value.
```

`{supplier_hints}` is populated from `supplier_ocr_templates.extraction_hints`
if a template exists for this supplier. Example:
```
Known supplier patterns:
- Date format: DD/MM/YYYY
- Document number usually appears after "חשבונית מס מספר"
- Items table headers: ["תיאור", "כמות", "מחיר ליח'", "סה״כ"]
```

### 4.5 Error Handling

| Error | Action |
|-------|--------|
| File not found in Storage | Return 404, log error |
| Claude API timeout (>30s) | Retry once, then return error with suggestion to try again |
| Claude API rate limit | Return 429, show "נסה שוב בעוד דקה" |
| Response not valid JSON | Log raw response, return error with "לא הצלחנו לקרוא את המסמך" |
| Low confidence (<0.5) | Return data but flag all fields as needing review |

---

## 5. OCR Flow — User Experience

### 5.1 Entry Points

**From goods receipt (inventory.html):**
```
New receipt → Upload/attach file → [🤖 סרוק עם AI] button
→ Loading spinner "סורק את המסמך..."
→ Review screen (pre-filled from OCR)
→ User edits if needed → Confirm
```

**From documents tab (suppliers-debt.html):**
```
[+ מסמך חדש] → Upload file → [🤖 סרוק עם AI] button
→ Loading spinner
→ Review screen
→ User edits → Save
```

**From existing document without data:**
```
Document row → has file but no amounts → [🤖 סרוק] button
→ Same flow
```

### 5.2 Review Screen

```
┌──────────────────────────────────────────────────────────────┐
│  🤖 תוצאות סריקה                              [📄 מקור]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ שדות שזוהו ───────────────┐  ┌─ תצוגת מסמך ──────────┐ │
│  │                             │  │                         │ │
│  │  ספק: [רייבאן       ] ✅   │  │  ┌───────────────────┐  │ │
│  │  סוג: [חשבונית מס   ] ✅   │  │  │                   │  │ │
│  │  מספר: [4521         ] ⚠️   │  │  │   PDF / Image     │  │ │
│  │  תאריך: [15/03/2026  ] ✅   │  │  │   Preview         │  │ │
│  │  תאריך תשלום: [15/04 ] ✅   │  │  │                   │  │ │
│  │                             │  │  │                   │  │ │
│  │  סכום לפני מע"מ: ₪10,000  │  │  └───────────────────┘  │ │
│  │  מע"מ 17%:        ₪1,700   │  │                         │ │
│  │  סה"כ:            ₪11,700  │  │                         │ │
│  │                             │  │                         │ │
│  │  ── פריטים ──               │  │                         │ │
│  │  RB5154  ×3  ₪350  ₪1,050 │  │                         │ │
│  │  RB3025  ×5  ₪420  ₪2,100 │  │                         │ │
│  │  ...                        │  │                         │ │
│  │                             │  │                         │ │
│  │  📎 PO מתאים: PO-15-0042  │  │                         │ │
│  │  🔗 [קשר להזמנה]           │  │                         │ │
│  └─────────────────────────────┘  └─────────────────────────┘ │
│                                                              │
│  ⚠️ רמת ביטחון: 87% — בדוק את השדות המסומנים              │
│                                                              │
│        [❌ בטל]    [✏️ ערוך ושמור]    [✅ אשר הכל]         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Confidence indicators per field:**
- ✅ Green (>0.9): high confidence
- ⚠️ Yellow (0.7-0.9): check recommended
- 🔴 Red (<0.7): likely wrong, must verify

**Side-by-side layout:** extracted fields on the left, original document preview
on the right (PDF embed or image). Employee can visually compare.

### 5.3 Correction Flow (Learning)

When employee edits a field before confirming:

1. System records the correction: `{ "document_number": { "ai": "1234", "user": "12345" } }`
2. Saves to `ocr_extractions.corrections`
3. Updates `ocr_extractions.status` = 'corrected'
4. Updates `supplier_ocr_templates`:
   - `times_corrected += 1`
   - If pattern correction (e.g., date format), updates `extraction_hints`
   - Recalculates `accuracy_rate`
5. Next time a document from same supplier is scanned:
   - Template hints are sent to Claude in the prompt
   - Accuracy should improve over time

### 5.4 OCR in Goods Receipt Flow

Enhanced flow (builds on Phase 4's receipt + file upload):

```
New receipt → Upload file → [🤖 סרוק עם AI]
→ AI extracts: supplier, document number, items with quantities + prices
→ System auto-fills:
  - Supplier dropdown (if matched)
  - Document type + number
  - Receipt items (if items recognized + matched to inventory)
→ For new items (not in inventory):
  - AI provides description, employee fills brand/model/color/size
  - Barcode auto-generated (existing BBDDDDD logic)
→ Employee reviews → Confirm with PIN
→ Inventory updated + supplier_document created (existing Phase 4 flow)
```

---

## 6. Alerts System

### 6.1 Alert Generation

Alerts are generated by a **scheduled process** (Supabase pg_cron or Edge Function cron):

**Daily alerts check (runs at 08:00 tenant timezone):**

| Alert Type | Condition | Severity | Title Pattern |
|-----------|-----------|----------|---------------|
| payment_due | due_date within X days (from config) | warning | "תשלום בעוד {n} ימים — {supplier} ₪{amount}" |
| payment_overdue | due_date < today, status = open | critical | "תשלום באיחור — {supplier} ₪{amount} ({n} ימים)" |
| prepaid_low | total_remaining < threshold | warning | "עסקת מקדמה {supplier} — נותרו ₪{remaining} ({pct}%)" |

**On-event alerts (triggered by user actions):**

| Alert Type | Trigger | Severity | Title Pattern |
|-----------|---------|----------|---------------|
| price_anomaly | Receipt confirm where price differs >5% from PO | warning | "פער מחיר — {item}: ₪{po_price} → ₪{receipt_price}" |
| amount_mismatch | Monthly invoice total ≠ sum of linked delivery notes | warning | "אי-התאמת סכום — חשבונית {num} ₪{invoice} ≠ תעודות ₪{notes}" |
| ocr_low_confidence | OCR extraction confidence < threshold | info | "סריקה דורשת בדיקה — {file_name}" |
| duplicate_document | supplier_id + document_number already exists | warning | "מסמך כפול? {type} {number} מ-{supplier}" |

### 6.2 Alert Display

**Bell icon in header (header.js):**
```
🔔 (3)  ← red badge with unread count
```

Click opens alerts dropdown/panel:

```
┌──────────────────────────────────────┐
│  🔔 התראות (3 חדשות)        [סמן הכל]│
├──────────────────────────────────────┤
│ 🔴 תשלום באיחור — רייבאן ₪12,300   │
│    לפני 3 ימים                       │
│    [צפה] [שולם] [דחה]               │
│──────────────────────────────────────│
│ ⚠️ עסקת מקדמה — לוקסוטיקה נותרו 15%│
│    היום                              │
│    [צפה] [דחה]                       │
│──────────────────────────────────────│
│ ℹ️ סריקה דורשת בדיקה — inv_4521.pdf│
│    לפני שעה                          │
│    [בדוק] [דחה]                      │
├──────────────────────────────────────┤
│ [📋 כל ההתראות]                      │
└──────────────────────────────────────┘
```

**"כל ההתראות"** → full alerts screen with filters (type, severity, status, date range).

**Action buttons:**
- [צפה] → navigates to relevant entity (document, deal, extraction)
- [שולם] → opens payment wizard for that document
- [בדוק] → opens OCR review screen
- [דחה] → marks alert as dismissed (with optional reason)

### 6.3 Alert Lifecycle

```
Created (unread) → Read (user saw it) → Actioned (user did something)
                                       → Dismissed (user chose to ignore)
                 → Expired (past expires_at, auto-cleaned)
```

Auto-dismiss rules:
- `payment_due` alert → auto-dismiss when document marked as paid
- `prepaid_low` → auto-dismiss when deal topped up
- `ocr_low_confidence` → auto-dismiss when extraction is accepted/corrected

---

## 7. Weekly Report

### 7.1 Report Screen

New tab or section in suppliers-debt.html: **"דוח שבועי"**

```
┌──────────────────────────────────────────────────────────────┐
│  📊 דוח שבועי — 09/03/2026 – 15/03/2026    [◀ שבוע קודם]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ סיכום ──────────────────────────────────────────────┐   │
│  │ חוב כולל: ₪125,400 (↑₪8,200 מהשבוע שעבר)          │   │
│  │ שולם השבוע: ₪45,000  |  מסמכים חדשים: 8            │   │
│  │ באיחור: ₪12,300 (2 מסמכים)                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ תשלומים קרובים ────────────────────────────────────┐   │
│  │ 17/03 — רייבאן — ₪12,300 (חשבונית #4521)           │   │
│  │ 19/03 — לוקסוטיקה — ₪8,400 (חשבונית #7891)         │   │
│  │ 22/03 — אופטיקה סיטי — ₪3,200 (ת.משלוח #1122)      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ עסקאות מקדמה ──────────────────────────────────────┐   │
│  │ רייבאן: ₪23,400 / ₪120,000 (19% נותר) ⚠️          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ סטטיסטיקות AI ─────────────────────────────────────┐   │
│  │ נסרקו: 12  |  מילוי אוטומטי: 10  |  תוקנו: 2      │   │
│  │ דיוק: 83%                                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [📄 ייצוא PDF]  [📧 שלח במייל (בקרוב)]                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Report Generation

- Report is **generated on-demand** when user opens the tab (not pre-generated)
- Data comes from existing tables — no new queries needed beyond aggregation
- When user clicks "ייצוא PDF":
  - Edge Function generates PDF (using jsPDF or similar)
  - Stores in Storage bucket `weekly-reports`
  - Saves reference in `weekly_reports` table
  - Returns download URL
- "שלח במייל" — deferred to future phase (shows "בקרוב" badge)

### 7.3 Historical Reports

User can browse past reports using ◀▶ navigation.
If a report was previously generated as PDF, it loads from storage.
Otherwise, it's re-calculated from current data (live snapshot, not historical).

---

## 8. Anomaly Detection

Beyond alerts from 6.1, the AI agent actively looks for patterns:

### 8.1 Price Trend Analysis

When OCR extracts item prices, compare against:
1. Last PO price for same item from same supplier
2. Average price across last 3 months
3. Price from other suppliers for same brand

Flag if deviation > configurable threshold (default 10%).

### 8.2 Duplicate Detection

Before saving OCR result, check:
- Same supplier + same document number → definite duplicate
- Same supplier + same total + same date → probable duplicate
- Same supplier + similar total (±5%) + date within 3 days → possible duplicate

### 8.3 Invoice vs Delivery Notes

When monthly invoice is linked to delivery notes (Pattern B):
- Sum of delivery note totals should match invoice total
- If mismatch → alert with breakdown showing which notes and amounts

---

## 9. File Structure

```
supabase/functions/
  ocr-extract/
    index.ts                           — Edge Function: receive file → Claude Vision → return data

modules/suppliers-debt/
  (existing Phase 4 files)
  ai-ocr.js                           — OCR trigger, review screen, correction handling
  ai-alerts.js                        — alerts panel, alert actions, alert badge
  ai-weekly-report.js                 — weekly report screen, PDF export trigger

modules/goods-receipts/
  (existing files)
  receipt-ocr.js                      — OCR integration in goods receipt flow

js/
  alerts-badge.js                     — header bell icon + unread count (used on all pages)
```

Each file ≤ 350 lines.

**New scripts in header on all pages:**
```html
<script src="js/alerts-badge.js"></script>
```

---

## 10. AI Agent Config Screen

New section in admin area (or in suppliers-debt.html under settings):

```
┌─ הגדרות סוכן AI ─────────────────────────┐
│                                            │
│  🤖 סריקת מסמכים (OCR)                    │
│  ☑ סריקה פעילה                             │
│  ☑ התאמת ספק אוטומטית                      │
│  ☑ התאמת הזמנת רכש אוטומטית               │
│  סף ביטחון: [80%]                          │
│                                            │
│  🔔 התראות                                 │
│  ☑ תזכורת תשלום [7] ימים לפני             │
│  ☑ התראת איחור                              │
│  ☑ התראת עסקת מקדמה                         │
│  ☑ התראת אי-התאמה                           │
│                                            │
│  📊 דוח שבועי                               │
│  ☑ פעיל                                     │
│  יום הפקה: [ראשון ▼]                       │
│                                            │
│  [שמור הגדרות]                              │
└────────────────────────────────────────────┘
```

Accessible only to CEO/Manager roles.

---

## 11. Contracts (RPC Functions)

```sql
-- Invoke OCR on a file (calls Edge Function internally)
-- Actually this is the Edge Function itself, not an RPC

-- Get alerts for current user
getAlerts(p_tenant_id UUID, p_status TEXT DEFAULT 'unread', p_limit INT DEFAULT 20)
  → alerts[]

-- Get unread alert count (for badge)
getUnreadAlertCount(p_tenant_id UUID)
  → { count: INTEGER }

-- Dismiss alert
dismissAlert(p_alert_id UUID, p_tenant_id UUID, p_dismissed_by UUID)
  → success boolean

-- Get weekly report data (aggregation)
getWeeklyReportData(p_tenant_id UUID, p_week_start DATE)
  → report_data JSONB

-- Get OCR extraction history
getOcrExtractions(p_tenant_id UUID, p_status TEXT, p_limit INT)
  → ocr_extractions[]

-- Get supplier OCR template
getSupplierOcrTemplate(p_supplier_id UUID, p_tenant_id UUID)
  → supplier_ocr_templates row or null

-- Generate daily alerts (called by cron)
generateDailyAlerts(p_tenant_id UUID)
  → { alerts_created: INTEGER }
```

---

## 12. Views for External Access

```sql
-- Future Supplier Portal (Phase 6) may want to show:
-- "Your documents have been scanned and processed"
-- DO NOT CREATE NOW — just ensure schema supports it:

-- VIEW supplier_portal_document_status AS
--   SELECT document_number, status, total_amount, paid_amount
--   FROM supplier_documents
--   WHERE supplier_id = ... AND tenant_id = ...
```

---

## 13. Verification Checklist

### Database:
- [ ] All new tables have tenant_id NOT NULL + RLS
- [ ] ai_agent_config seeded for Prizma tenant
- [ ] Indexes created on all new tables

### Edge Function:
- [ ] ocr-extract deployed and accessible
- [ ] Claude Vision API key stored in Supabase Secrets
- [ ] File fetch from Storage works
- [ ] Response parsing handles Hebrew text correctly
- [ ] Error handling for all failure modes
- [ ] Timeout set to 30s with retry

### OCR Flow:
- [ ] "סרוק עם AI" button appears on documents with files
- [ ] Loading state while processing
- [ ] Review screen shows all extracted fields with confidence
- [ ] Side-by-side document preview works
- [ ] Correction flow saves to ocr_extractions
- [ ] Learning updates supplier_ocr_templates
- [ ] OCR result can create supplier_document
- [ ] OCR works from goods receipt flow

### Alerts:
- [ ] Daily alert generation works (payment_due, overdue, prepaid_low)
- [ ] Event alerts trigger correctly (price_anomaly, duplicate, etc.)
- [ ] Bell icon shows unread count on all pages
- [ ] Alert dropdown renders correctly
- [ ] Action buttons navigate to correct entities
- [ ] Auto-dismiss works when underlying condition resolves

### Weekly Report:
- [ ] Report screen renders current week data
- [ ] Historical navigation works
- [ ] PDF export generates and downloads
- [ ] OCR statistics section displays correctly

### Config:
- [ ] AI config screen accessible to CEO/Manager
- [ ] Settings save and apply correctly
- [ ] Disabling OCR hides scan buttons

### Regression:
- [ ] Phase 4 goods receipt flow still works without OCR
- [ ] Phase 4 document CRUD still works
- [ ] Phase 4 payment wizard still works
- [ ] All pages load without errors

---

## 14. What's NOT in Phase 5

| Feature | Deferred To |
|---------|-------------|
| Email alerts | Future notification module |
| WhatsApp alerts | Future notification module |
| Email weekly report delivery | Future notification module |
| Auto-scan on file upload (without button click) | Future UX enhancement |
| Batch OCR (scan multiple files at once) | Future enhancement |
| OCR for goods receipt items (auto-match to inventory) | Future enhancement (item-level OCR) |
| Custom prompt editing per tenant | Future admin feature |
| Multi-language OCR (non-Hebrew documents) | Future i18n |
| Dashboard with OCR accuracy trends over time | Future analytics |

---

## 15. Execution Suggestion for Secondary Chat

```
5a — DB tables + migrations + seeds (ai_agent_config, ocr_extractions, supplier_ocr_templates, alerts, weekly_reports)
5b — Edge Function: ocr-extract (deploy, test with sample invoice)
5c — OCR review screen in suppliers-debt.html (ai-ocr.js)
5d — OCR integration in goods receipt flow (receipt-ocr.js)
5e — Learning system (corrections → template updates)
5f — Alerts system: generation + display (ai-alerts.js + alerts-badge.js)
5g — Weekly report screen + PDF export (ai-weekly-report.js)
5h — AI config screen
5i — Integration testing + documentation
```

---

## 16. Cost Estimation

Claude Vision API pricing (as of early 2026):
- ~$0.003-0.01 per image/page depending on model
- Average invoice = 1-2 pages = ~$0.01 per scan
- 100 scans/month per tenant = ~$1/month
- Negligible cost at current scale

Platform API key approach means we absorb this cost.
Monitor usage per tenant via `ocr_extractions` table.
If costs grow, can switch to tenant_provided API keys.
