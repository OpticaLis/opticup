# Optic Up — Phase 5.5: Stability, Scale & Batch Operations

> **Phase 5.5 — Hardening + Feature Phase**
> **Dependencies:** Phase 5 complete (AI Agent fully working)
> **Location:** modules/Module 1 - Inventory Management/docs/PHASE_5.5_SPEC.md

---

## 1. Overview

Phase 5.5 has two goals:

1. **Harden** — fix every performance, race condition, and UX issue found in QA and architectural review before scaling to multiple tenants
2. **Enhance** — add batch document operations, advanced filtering, and historical import that real-world usage demands

This is NOT a feature-first phase. Stability fixes come FIRST (5.5a–5.5d),
then features (5.5e–5.5h), then documentation (5.5i).

**Rule: no new feature ships until all stability fixes pass verification.**

---

## 2. What's In & What's Out

### In This Phase:

| # | Type | Item |
|---|------|------|
| 1 | 🔴 Critical Fix | Internal document number generation — atomic RPC with FOR UPDATE lock |
| 2 | 🔴 Critical Fix | OCR learning race condition — atomic RPC for template stats |
| 3 | 🔴 Critical Fix | pg_cron setup for daily alert generation with fault isolation |
| 4 | 🔴 Critical Fix | batchWriteLog for bulk operations |
| 5 | 🟡 Stability Fix | Weekly report snapshot on first render (not just PDF export) |
| 6 | 🟡 Stability Fix | tenant_id defense-in-depth on weekly report update |
| 7 | 🟡 Stability Fix | try/catch on alert action functions |
| 8 | 🟡 Stability Fix | OCR logical validation (math checks before save) |
| 9 | 🟡 UX Fix | Remove attached file button in goods receipt + document creation |
| 10 | 🟡 UX Fix | Update receipt info modal with AI flow description |
| 11 | 🟢 Feature | Batch document upload with file list, drag-drop, dedup, resume |
| 12 | 🟢 Feature | Advanced document filtering (status, type, supplier, date, amount) |
| 13 | 🟢 Feature | Historical document import mode with AI training |
| 14 | 🟢 Feature | Pipelining UX — review documents while batch OCR continues |
| 15 | 📄 Docs | Documentation, backup, verification |

### Schema additions in this phase:

| Column/Table | Purpose |
|---|---|
| `supplier_documents.file_hash` TEXT | SHA-256 hash for deduplication |
| `supplier_documents.batch_id` UUID | Correlation ID for batch operations |
| `supplier_documents.is_historical` BOOLEAN | Flag for imported historical documents |
| RPC `next_internal_doc_number` | Atomic sequential numbering with FOR UPDATE |
| RPC `update_ocr_template_stats` | Atomic OCR learning stats |
| RPC `cleanup_orphaned_batch_files` | Weekly cleanup of abandoned batch uploads |

### NOT in This Phase:

| Feature | Why Not | When |
|---------|---------|------|
| Supabase Realtime for alerts | Polling at 60s is fine for 100+ tenants. Adds complexity without clear ROI now | Phase 7+ |
| Server-side PDF generation | html2canvas works. Puppeteer in Edge Function = cold starts + cost | Only if client complaints |
| Parallel batch OCR | API rate limits + cost. Sequential with pipelining is better UX | Future |
| Auto-scan on file upload | Users need control. Auto-scan wastes API credits on wrong files | Future UX |
| sequence_number column for indexing | FOR UPDATE lock + tenant-scoped query is fast enough for 2,000 docs/tenant. Over-engineering for current scale | If tenant exceeds 50,000 docs |
| Plan enforcement (checkPlanLimit) | No plans/pricing infrastructure yet. TODO comments placed at hook points | Module 2 |
| batch_pending status | Adds query complexity everywhere. Cleanup rule with batch_id + created_at achieves same goal | N/A — replaced by cleanup |
| Email/WhatsApp alerts | Requires notification infrastructure | Future module |

---

## 3. Stability Fixes

### 3.1 🔴 Atomic Document Number Generation with FOR UPDATE Lock

**Problem:** `receipt-debt.js` and `debt-documents.js` fetch ALL supplier documents
into browser memory to find the highest `internal_number`. Two sub-problems:
1. With 10,000 documents per tenant, fetchAll blocks the UI for seconds
2. Two concurrent users can get the same number (race condition)

**Fix: RPC with row-level lock on tenant.**

```sql
CREATE OR REPLACE FUNCTION next_internal_doc_number(
  p_tenant_id UUID,
  p_prefix TEXT DEFAULT 'DOC'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_max INTEGER;
  v_next TEXT;
BEGIN
  -- Lock tenant row to serialize numbering across concurrent requests.
  -- Different tenants are NEVER blocked by each other.
  -- Lock auto-releases when the transaction commits (~5ms overhead).
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  -- Find the highest existing number for this prefix
  SELECT COALESCE(
    MAX(
      CAST(SUBSTRING(internal_number FROM (LENGTH(p_prefix) + 2)) AS INTEGER)
    ), 0)
  INTO v_max
  FROM supplier_documents
  WHERE tenant_id = p_tenant_id
    AND internal_number LIKE p_prefix || '-%'
    AND is_deleted = false;

  v_next := p_prefix || '-' || LPAD((v_max + 1)::TEXT, 4, '0');
  RETURN v_next;
END;
$$;
```

**Why FOR UPDATE on tenants (not supplier_documents):**
- Locks a single row (the tenant), not the whole documents table
- Any concurrent call for the same tenant waits ~5ms until the lock releases
- Different tenants are never blocked by each other
- The lock auto-releases when the transaction commits

**JS call (replaces fetchAll in both files):**
```javascript
const { data } = await sb.rpc('next_internal_doc_number', {
  p_tenant_id: getTenantId(),
  p_prefix: 'DOC'
});
// data = "DOC-0047"
```

**Files to change:**
- `migrations/phase5_5a_atomic_rpcs.sql` — new RPC
- `modules/suppliers-debt/debt-documents.js` — replace internal_number generation
- `modules/goods-receipts/receipt-debt.js` — replace internal_number generation

**Verification:**
- Open two browser tabs, create document in both simultaneously
- Both get sequential numbers (no duplicate, no gap)
- No fetchAll of all documents visible in Network tab
- Works correctly under batch upload (50 rapid creates)

---

### 3.2 🔴 Atomic OCR Template Stats Update

**Problem:** `updateOCRTemplate()` in `supabase-ops.js` reads template stats,
calculates new accuracy_rate in JavaScript, and writes back. If two employees
approve OCR for the same supplier simultaneously — lost update.

**Fix: RPC that does read + calculate + write atomically in PostgreSQL.**

```sql
CREATE OR REPLACE FUNCTION update_ocr_template_stats(
  p_tenant_id UUID,
  p_supplier_id UUID,
  p_doc_type_code TEXT,
  p_was_corrected BOOLEAN,
  p_new_hints JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_template supplier_ocr_templates%ROWTYPE;
  v_result JSON;
BEGIN
  -- Try to find existing template
  SELECT * INTO v_template
  FROM supplier_ocr_templates
  WHERE tenant_id = p_tenant_id
    AND supplier_id = p_supplier_id
    AND document_type_code = p_doc_type_code
    AND is_active = true;

  IF v_template.id IS NOT NULL THEN
    -- Atomic increment + recalculate in single UPDATE
    UPDATE supplier_ocr_templates
    SET
      times_used = times_used + 1,
      times_corrected = times_corrected + CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
      accuracy_rate = ROUND(
        (1.0 - ((times_corrected + CASE WHEN p_was_corrected THEN 1 ELSE 0 END)::NUMERIC
                 / (times_used + 1)::NUMERIC)) * 100, 2),
      extraction_hints = CASE
        WHEN p_new_hints IS NOT NULL THEN extraction_hints || p_new_hints
        ELSE extraction_hints
      END,
      last_used_at = now(),
      updated_at = now()
    WHERE id = v_template.id
    RETURNING json_build_object('id', id, 'times_used', times_used, 'accuracy_rate', accuracy_rate)
    INTO v_result;
  ELSE
    -- Create new template
    INSERT INTO supplier_ocr_templates (
      tenant_id, supplier_id, document_type_code,
      template_name, extraction_hints,
      times_used, times_corrected, accuracy_rate,
      last_used_at, is_active
    ) VALUES (
      p_tenant_id, p_supplier_id, p_doc_type_code,
      p_doc_type_code, COALESCE(p_new_hints, '{}'),
      1, CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
      CASE WHEN p_was_corrected THEN 0 ELSE 100 END,
      now(), true
    )
    RETURNING json_build_object('id', id, 'times_used', times_used, 'accuracy_rate', accuracy_rate)
    INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
```

**JS change — rewrite `updateOCRTemplate()` in supabase-ops.js:**
```javascript
async function updateOCRTemplate(supplierId, docTypeCode, corrections, extractedData, tenantId) {
  const tid = tenantId || getTenantId();
  const wasCorrected = corrections && Object.keys(corrections).length > 0;
  const hints = buildHintsFromCorrections(corrections, extractedData, {});

  const { data, error } = await sb.rpc('update_ocr_template_stats', {
    p_tenant_id: tid,
    p_supplier_id: supplierId,
    p_doc_type_code: docTypeCode || 'invoice',
    p_was_corrected: wasCorrected,
    p_new_hints: Object.keys(hints).length > 0 ? hints : null
  });

  if (error) console.error('Template update failed:', error);
  return data;
}
```

**Files to change:**
- `migrations/phase5_5a_atomic_rpcs.sql` — add this RPC (same migration file)
- `js/supabase-ops.js` — rewrite updateOCRTemplate to use RPC

**Verification:**
- Open two browser tabs, approve OCR for same supplier at same time
- Both succeed, times_used = 2, no lost updates
- accuracy_rate is mathematically correct

---

### 3.3 🔴 pg_cron for Daily Alert Generation with Fault Isolation

**Problem:** `generate_daily_alerts` RPC exists but nothing calls it. Also,
if one tenant has corrupt data, the entire loop crashes and no other tenant
gets alerts that day.

**Fix: pg_cron schedule with per-tenant exception handling.**

```sql
-- Enable extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: run every day at 08:00 Israel time (05:00 UTC)
SELECT cron.schedule(
  'daily-alert-generation',
  '0 5 * * *',
  $CRON$
  DO $DO$
  DECLARE
    t RECORD;
    v_total INTEGER := 0;
    v_failed INTEGER := 0;
  BEGIN
    FOR t IN SELECT id FROM tenants WHERE is_active = true LOOP
      BEGIN
        PERFORM generate_daily_alerts(t.id);
        v_total := v_total + 1;
      EXCEPTION WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE NOTICE 'Alert generation failed for tenant %: %', t.id, SQLERRM;
        -- Continue to next tenant — NEVER let one tenant block others
      END;
    END LOOP;
    RAISE NOTICE 'Daily alerts complete: % processed, % failed', v_total, v_failed;
  END;
  $DO$
  $CRON$
);
```

**Fault isolation guarantee:** tenant A's corrupt data NEVER prevents tenant B
from getting alerts. Each tenant processes in its own exception block.

**Note on Supabase plans:**
- Pro plan and above: pg_cron available natively
- Free plan: create a Supabase Edge Function (`supabase/functions/daily-alerts/index.ts`)
  triggered by external cron (cron-job.org, GitHub Actions schedule, etc.)

**Manual step:** Check Supabase plan. If Pro → use pg_cron. If Free → create Edge Function.

**Files to create:**
- `migrations/phase5_5c_pgcron_alerts.sql` — pg_cron schedule
- OR `supabase/functions/daily-alerts/index.ts` — Edge Function alternative

**Verification:**
- Trigger manually: `SELECT generate_daily_alerts('{tenant_id}')`
- Verify alerts created for open/overdue documents
- Intentionally corrupt one tenant's data → verify other tenants still get alerts

---

### 3.4 🔴 batchWriteLog for Bulk Operations

**Problem:** Current `writeLog()` sends one INSERT per log entry. In a batch
import of 100 documents, that's 100 separate HTTP requests just for logging.

**Fix: Add `batchWriteLog()` to supabase-ops.js.**

```javascript
async function batchWriteLog(entries) {
  // entries = [{ action, inventory_id, details }, ...]
  if (!entries || entries.length === 0) return;
  const tid = getTenantId();
  const records = entries.map(e => ({
    action: e.action,
    inventory_id: e.inventory_id || null,
    details: e.details || {},
    tenant_id: tid
  }));
  // Use existing batchCreate which handles chunking at 100
  await batchCreate(T.LOGS, records);
}
```

**Usage in batch operations:**
```javascript
// Instead of: for each doc → await writeLog(...)
// Do: collect all logs → await batchWriteLog(allLogs)
const logs = uploadedDocs.map(doc => ({
  action: 'batch_upload',
  details: { document_id: doc.id, batch_id, file_name: doc.file_name }
}));
await batchWriteLog(logs);
```

**Files to change:**
- `js/supabase-ops.js` — add batchWriteLog function

**Verification:**
- Upload batch of 10 files
- Network tab shows 1 log insert request (not 10)

---

### 3.5 🟡 Minor Stability Fixes (batch in one commit)

#### A. Weekly report snapshot on first render

**Problem:** Snapshot saved only on PDF export. Returning to the same week
re-queries all 8 tables.

**Fix in `ai-weekly-report.js`:** After `_gatherReportData()` succeeds, save
a snapshot to `weekly_reports` table (without PDF). On subsequent visits to the
same week, load from snapshot if it exists and is less than 24 hours old.

#### B. tenant_id defense-in-depth on weekly report update

**Problem (W1 from QA):** `.update()` filters by `id` only.

**Fix:** Add `.eq('tenant_id', getTenantId())` to the update query.

#### C. try/catch on alert actions

**Problem (W2 from QA):** `alertAction()` and `markAllAlertsRead()` don't
wrap Supabase calls in try/catch.

**Fix:** Wrap each Supabase call in try/catch with Hebrew toast error message.

#### D. CLAUDE.md alerts table description fix

**Problem (W4 from QA):** `is_read` → `status`, `source_type/source_id` →
`entity_type/entity_id`.

**Fix:** Update CLAUDE.md DB Tables section.

#### E. OCR Logical Validation (Business Rules)

**Problem:** AI can hallucinate numbers. A confidence score of 0.95 doesn't
mean the math is correct.

**Fix: Add `validateOCRData(data)` function** — runs after OCR and before save,
on both single scan and batch:

| Rule | Check | Action |
|------|-------|--------|
| Amount math | `subtotal + vat_amount ≠ total_amount` (tolerance ₪1) | 🔴 Red flag, block auto-save, require manual check |
| Future date | `document_date > today` | 🔴 Red flag |
| Due before issue | `due_date < document_date` | ⚠️ Yellow flag |
| Negative amount | `total_amount < 0` and type is NOT credit note | 🔴 Red flag |
| Unusual VAT | `vat_rate ≠ 17` and `vat_rate ≠ 0` | ⚠️ Yellow flag (may be legitimate) |
| Missing supplier | `supplier_match` is null | ⚠️ Yellow flag |
| Suspicious total | `total_amount > 500,000` (configurable) | ⚠️ Yellow flag |

Fields that fail validation are marked red **regardless of AI confidence score**.
In batch mode, documents with red flags are marked "דורש בדיקה" and cannot be
auto-approved.

**Files to change:**
- `modules/suppliers-debt/ai-ocr.js` — add validateOCRData, call before save
- `modules/goods-receipts/receipt-ocr.js` — call validateOCRData on receipt OCR
- `modules/suppliers-debt/ai-weekly-report.js` — A + B
- `js/alerts-badge.js` — C
- `CLAUDE.md` — D

---

## 4. UX Fixes

### 4.1 Remove Attached File Button

**Problem:** Once a file is attached in goods receipt or document creation,
there is no way to remove it before saving.

**Fix:** Add ✖ (remove) button next to attached file name.

**In goods receipt form:**
```
┌──────────────────────────────────────────────┐
│  📎 invoice_4521.pdf          [✖ הסר]        │
│  [🤖 סרוק עם AI]                             │
└──────────────────────────────────────────────┘
```

**Clicking ✖:**
1. Clear `_pendingReceiptFile`
2. Remove file preview
3. Hide OCR scan button
4. Show original "צרף מסמך" button
5. If file already uploaded to Storage → delete it (cleanup)

**Same pattern in document creation (suppliers-debt.html).**

**Files to change:**
- `modules/goods-receipts/receipt-form.js` — add remove button logic
- `modules/suppliers-debt/debt-documents.js` — add remove button in document form

---

### 4.2 Update Receipt Info Modal with AI Flow

**Problem:** The info modal doesn't mention OCR capability.

**Fix:** Add AI section to the guide:

```
🤖 סריקה חכמה עם AI
───────────────────
1. צרף מסמך (PDF או תמונה) בלחיצה על "צרף מסמך"
2. לחץ על "סרוק עם AI" — המערכת תזהה אוטומטית:
   • שם הספק
   • מספר מסמך ותאריך
   • פריטים, כמויות ומחירים
3. בדוק את הנתונים שזוהו ותקן במידת הצורך
4. אשר עם PIN — המלאי מתעדכן אוטומטית

💡 ככל שתשתמש יותר, המערכת לומדת את הפורמט של כל ספק ומשתפרת!
```

**Files to change:**
- `modules/goods-receipts/receipt-form.js` — update info modal HTML

---

## 5. Batch Document Upload & Management

### 5.1 Overview

Upload multiple documents at once, review them as a list, remove incorrect ones,
check for duplicates, and process them via OCR with resume capability.

### 5.2 UI Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  📤 העלאת מסמכים מרובים                                [✖ סגור] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           גרור קבצים לכאן                                │   │
│  │           או לחץ לבחירת קבצים                             │   │
│  │           PDF, JPG, PNG (עד 10MB כל קובץ)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── 5 קבצים נבחרו ──                                            │
│                                                                  │
│  ☑ invoice_4521.pdf      2.1MB  📄  ✅ תקין    [👁] [✖ הסר]    │
│  ☑ invoice_4522.pdf      1.8MB  📄  ✅ תקין    [👁] [✖ הסר]    │
│  ☑ delivery_note_91.jpg  3.2MB  🖼️  ✅ תקין    [👁] [✖ הסר]    │
│  ☐ invoice_4521.pdf      2.1MB  📄  ⚠️ כפול!   [👁] [✖ הסר]    │
│  ☑ invoice_4523.pdf      2.4MB  📄  ✅ תקין    [👁] [✖ הסר]    │
│                                                                  │
│  ── סה"כ: 4 נבחרו מתוך 5 | 1 כפול ──                           │
│                                                                  │
│  ספק (אופציונלי): [────── בחר ספק ──────▼]                     │
│                                                                  │
│  [📤 העלה וסרוק עם AI]    [📤 העלה בלבד]    [ביטול]           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Deduplication (before upload, before OCR)

**Step 1: Client-side SHA-256 hash (before upload)**
```javascript
async function computeFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Step 2: Check within the batch** — compare hashes, mark duplicates with ⚠️.

**Step 3: Check against DB (before upload)**
Query `supplier_documents` WHERE `file_hash` IN (list of hashes) AND `tenant_id`.
Match found → "כבר קיים במערכת" with link to existing document.

**Dedup UI states:**
| State | Icon | Action |
|-------|------|--------|
| Unique | ✅ תקין | Ready to upload |
| Duplicate in batch | ⚠️ כפול בקבוצה | Auto-unchecked, user can override |
| Exists in DB | ⚠️ כבר קיים | Auto-unchecked, shows link to existing |

### 5.4 File List Management

- **Select/deselect** — checkbox per file, "select all" / "deselect all"
- **Preview** — 👁 button opens file in small modal
- **Remove** — ✖ removes from list. If already uploaded → delete from Storage
- **Max limits** — 50 files per batch, 10MB per file

### 5.5 Upload Flow

**"העלה בלבד" (Upload only):**
1. Generate `batch_id` = `crypto.randomUUID()`
2. Upload selected files to Storage (`supplier-docs/{tenant_id}/batch_{timestamp}/`)
3. Compute and store `file_hash` for each
4. Create `supplier_documents` record per file:
   - `status: 'draft'`, `file_url`, `file_hash`, `batch_id`
   - `supplier_id` if selected
5. `batchWriteLog` for all uploads in one call
6. Show progress bar → toast on complete → refresh documents tab

**"העלה וסרוק עם AI" (Upload + OCR):**
1. Same upload as above
2. Process each via OCR **sequentially** (see 5.7 Pipelining)
3. Run `validateOCRData()` on each result (see 3.5E)
4. Show progress with per-file status

**TODO Module 2:** `// checkPlanLimit('documents', selectedFiles.length)` — hook point
before upload begins. Will enforce plan document limits when Module 2 is built.

### 5.6 Resume & Recovery

**Problem solved:** If file 14/20 fails (network, API timeout), user should
not re-upload or re-scan the first 13.

**Implementation:** Each file in batch has tracked state:

```javascript
const batchState = [
  { file, hash, status: 'uploaded', docId: 'uuid', ocrStatus: 'done' },
  { file, hash, status: 'uploaded', docId: 'uuid', ocrStatus: 'failed', error: 'timeout' },
  { file, hash, status: 'pending', docId: null, ocrStatus: null },
];
```

**File statuses:** `pending` → `uploading` → `uploaded` → `ocr_processing` → `ocr_done` / `ocr_failed`

**UI for failed files:**
```
  ☑ invoice_4523.pdf  ❌ סריקה נכשלה (timeout)  [🔄 נסה שוב]  [✖ דלג]
```

**"נסה שוב כושלים"** — retries ONLY failed files. No re-upload, no re-OCR,
no re-payment for already-processed files.

### 5.7 Pipelining UX — Review While Scanning

**Problem solved:** 50 files × 3 seconds = 2.5 minutes idle wait.

As each file completes OCR, it immediately appears reviewable:

```
┌── סריקה מרובה — 3/5 הושלמו ──────────────────────────────┐
│                                                            │
│  ✅ invoice_4521.pdf   ביטחון: 92%   [👁 בדוק]            │
│  ✅ invoice_4522.pdf   ביטחון: 87%   [👁 בדוק]  ⚠️ סכום  │
│  ⚠️ delivery_note.jpg  ביטחון: 64%   [👁 בדוק]  🔴 חובה  │
│  ⏳ invoice_4523.pdf   סורק...                             │
│  ⏸ invoice_4524.pdf   ממתין                                │
│                                                            │
│  [⏸ השהה תור]  [🔄 נסה כושלים]                            │
│                                                            │
│  בסיום: [✅ אשר הכל תקינים]  [📋 סיכום]                   │
└────────────────────────────────────────────────────────────┘
```

- "בדוק" opens existing OCR review modal
- OCR queue continues in background (async)
- Documents with validation errors (3.5E) marked 🔴 חובה — must review
- "אשר הכל תקינים" auto-saves docs with confidence > threshold AND no validation errors

### 5.8 Storage Cleanup

**Problem solved:** Files uploaded but batch cancelled = orphaned Storage files.

**Immediate cleanup:**
- ✖ on uploaded file → delete from Storage immediately
- "ביטול" on batch modal → delete ALL batch files from Storage
- beforeunload → best-effort cleanup (may not complete)

**Scheduled cleanup (weekly):**
```sql
CREATE OR REPLACE FUNCTION cleanup_orphaned_batch_files(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE supplier_documents
  SET is_deleted = true, updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND status = 'draft'
    AND batch_id IS NOT NULL
    AND created_at < now() - interval '48 hours'
    AND is_deleted = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  -- Note: actual Storage file deletion requires Edge Function
  -- (DB functions can't call Storage API directly)
  RETURN v_count;
END;
$$;
```

Scheduled via pg_cron weekly. An Edge Function handles the actual Storage
file deletion for soft-deleted batch documents.

### 5.9 Storage Organization

```
supplier-docs/{tenant_id}/
  batch_{YYYYMMDD_HHmmss}/
    invoice_4521.pdf
    invoice_4522.pdf
  single/
    receipt_2026_03_15.pdf
```

### 5.10 File Structure

```
modules/suppliers-debt/
  ai-batch-upload.js          — batch upload modal, file list, drag-drop, dedup, hash (max 350 lines)
  ai-batch-ocr.js             — batch OCR queue, pipelining, resume, progress, summary (max 350 lines)
```

---

## 6. Advanced Document Filtering

### 6.1 Overview

Multi-criteria filtering for the documents tab.

### 6.2 Filter Bar UI

Collapsible filter bar above documents table:

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍 סינון    [▼ הצג/הסתר]                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  סטטוס:     [הכל ▼]  שולם | לא שולם | חלקי | טיוטה | מבוטל    │
│  סוג מסמך:  [הכל ▼]  חשבונית | ת.משלוח | זיכוי | קבלה | אחר   │
│  ספק:       [────── בחר ספק ──────▼]                            │
│  תאריך:     [מ: DD/MM/YYYY]  [עד: DD/MM/YYYY]                  │
│  סכום:      [מ: ₪____]  [עד: ₪____]                            │
│  מקור:      [הכל ▼]  📜 היסטורי | 📋 שוטף                      │
│                                                                  │
│  [🔍 סנן]  [↻ נקה הכל]  [⭐ שמור כמועדף]                      │
│                                                                  │
│  מציג 12 מתוך 847 מסמכים                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Filter Logic

All filters AND-combined:

| Filter | DB Column | Query |
|--------|-----------|-------|
| Status | `status` | `.eq('status', value)` |
| Document type | `document_type_id` | `.eq('document_type_id', value)` |
| Supplier | `supplier_id` | `.eq('supplier_id', value)` |
| Date from | `document_date` | `.gte('document_date', value)` |
| Date to | `document_date` | `.lte('document_date', value)` |
| Amount from | `total_amount` | `.gte('total_amount', value)` |
| Amount to | `total_amount` | `.lte('total_amount', value)` |
| Source | `is_historical` | `.eq('is_historical', true/false)` |

### 6.4 Saved Filters (Favorites)

- Click ⭐ → enter name → saves to localStorage
- Quick buttons above filter bar (max 5)
- Click to apply, long-press to delete
- Per-device only (cross-device sync deferred)

### 6.5 Filter Persistence

- Active filters persist in module-level variable during session
- Switching tabs and returning re-applies last filter
- Page reload clears (unless saved as favorite)

### 6.6 File Structure

If `debt-documents.js` exceeds 350 lines, extract:
```
modules/suppliers-debt/
  debt-doc-filters.js         — filter bar UI, logic, saved presets (max 350 lines)
```

---

## 7. Historical Document Import

### 7.1 Overview

Import past invoices/delivery notes for complete history, AI training,
and searchable archive.

### 7.2 Import Mode vs Regular Mode

| Aspect | Regular | Historical Import |
|--------|---------|-------------------|
| Status on creation | draft → open | User chooses (paid/open/partial) |
| Alerts generated | Yes | **No** (don't spam old overdue) |
| Inventory impact | Updates quantities | **No** inventory changes |
| OCR learning | Yes | **Yes** (key benefit) |
| Validation | Full | Relaxed (allow partial data) |
| is_historical | false | **true** |
| batch_id | null or set | Always set |

### 7.3 Import Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  📥 ייבוא מסמכים היסטוריים                              [✖ סגור]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ מצב ייבוא היסטורי — המסמכים לא ישפיעו על המלאי            │
│     ולא ייצרו התראות. הם ילמדו את מנוע ה-AI.                   │
│                                                                  │
│  שלב 1: בחר ספק (אופציונלי)                                    │
│  [────── בחר ספק ──────▼]                                       │
│                                                                  │
│  שלב 2: העלה קבצים                                              │
│  [גרור קבצים או לחץ לבחירה]                                     │
│                                                                  │
│  שלב 3: בחר סטטוס ברירת מחדל                                    │
│  ○ שולם  ○ לא שולם  ○ אגדיר לכל מסמך                          │
│                                                                  │
│  [▶ התחל ייבוא + סריקת AI]                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.4 Import Processing

1. Upload files (reuses batch upload infrastructure)
2. Create `supplier_documents` with `is_historical = true` + `batch_id` + `file_hash`
3. Run OCR sequentially with pipelining (section 5.7)
4. Run `validateOCRData()` on each (section 3.5E)
5. For each successful OCR:
   - Auto-fill document fields
   - Set status per user's default choice
   - `update_ocr_template_stats` via RPC → AI learns
6. **No alerts** for historical documents (check `is_historical` in `createAlert`)
7. `batchWriteLog` for all imports in single call
8. Show per-supplier learning progress

### 7.5 AI Learning Display

After import, show learning summary:

```
┌── סיכום ייבוא היסטורי ───────────────────────┐
│                                                │
│  📊 תוצאות:                                   │
│  הועלו: 50  |  נסרקו: 48  |  נכשלו: 2        │
│                                                │
│  🧠 למידת AI לפי ספק:                         │
│  רייבאן:     20 מסמכים → דיוק 93% (+12%)     │
│  לוקסוטיקה: 15 מסמכים → דיוק 89% (+15%)     │
│  אופטיקה סיטי: 13 מסמכים → דיוק 91% (חדש)   │
│                                                │
│  💡 הסריקות הבאות מספקים אלו יהיו מדויקות    │
│     משמעותית יותר!                             │
│                                                │
│  [📋 צפה במסמכים]  [סגור]                     │
└────────────────────────────────────────────────┘
```

### 7.6 File Structure

```
modules/suppliers-debt/
  ai-historical-import.js     — import mode UI, status defaults, learning display (max 350 lines)
```

Reuses `ai-batch-upload.js` for file selection and `ai-batch-ocr.js` for processing.

---

## 8. Database Schema Changes

### 8.1 New RPC Functions

```sql
-- 3.1: Atomic document number with FOR UPDATE lock
CREATE OR REPLACE FUNCTION next_internal_doc_number(p_tenant_id UUID, p_prefix TEXT DEFAULT 'DOC')
RETURNS TEXT ...;

-- 3.2: Atomic OCR template stats
CREATE OR REPLACE FUNCTION update_ocr_template_stats(
  p_tenant_id UUID, p_supplier_id UUID, p_doc_type_code TEXT,
  p_was_corrected BOOLEAN, p_new_hints JSONB DEFAULT NULL
) RETURNS JSON ...;

-- 5.8: Cleanup orphaned batch files
CREATE OR REPLACE FUNCTION cleanup_orphaned_batch_files(p_tenant_id UUID)
RETURNS INTEGER ...;
```

### 8.2 Schema Modifications

```sql
-- File hash for deduplication (5.3)
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE INDEX idx_sup_docs_file_hash
  ON supplier_documents(tenant_id, file_hash)
  WHERE file_hash IS NOT NULL;

-- Batch correlation ID (5.5)
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX idx_sup_docs_batch
  ON supplier_documents(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;

-- Historical document flag (7.2)
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT false;
CREATE INDEX idx_sup_docs_historical
  ON supplier_documents(tenant_id, is_historical)
  WHERE is_deleted = false;
```

### 8.3 pg_cron Setup

See section 3.3 for full SQL with fault isolation.

---

## 9. File Structure Summary

### New Files (8):
```
modules/suppliers-debt/
  ai-batch-upload.js            — batch upload modal, file list, drag-drop, dedup, hash
  ai-batch-ocr.js               — batch OCR queue, pipelining, resume, progress
  ai-historical-import.js       — historical import mode, learning display
  debt-doc-filters.js            — filter bar UI, logic, saved presets

migrations/
  phase5_5a_atomic_rpcs.sql      — next_internal_doc_number + update_ocr_template_stats RPCs
  phase5_5b_schema_additions.sql — file_hash + batch_id + is_historical columns + indexes
  phase5_5c_pgcron_alerts.sql    — pg_cron schedule with fault isolation
  phase5_5d_cleanup_rpc.sql      — cleanup_orphaned_batch_files RPC
```

### Modified Files (11):
```
js/supabase-ops.js               — rewrite updateOCRTemplate (RPC), add batchWriteLog
js/alerts-badge.js               — add try/catch wrappers
js/shared.js                     — FIELD_MAP for file_hash, batch_id, is_historical

modules/suppliers-debt/debt-documents.js — RPC for doc numbers, filter bar hook, remove file
modules/suppliers-debt/ai-ocr.js         — add validateOCRData, batch OCR hook
modules/suppliers-debt/ai-alerts.js      — check is_historical in createAlert
modules/suppliers-debt/ai-weekly-report.js — snapshot on first render, tenant_id fix
modules/goods-receipts/receipt-debt.js    — RPC for doc numbers
modules/goods-receipts/receipt-form.js    — remove file button, info modal update
modules/goods-receipts/receipt-ocr.js     — call validateOCRData

suppliers-debt.html               — batch upload button, historical import button, filter bar
CLAUDE.md                         — fix alerts table description
```

Each new file ≤ 350 lines.

---

## 10. Execution Order

```
5.5a — Atomic RPCs + batchWriteLog + schema additions (file_hash, batch_id, is_historical)
       Execute all SQL against Supabase.
5.5b — Apply RPCs in JS (supabase-ops.js, debt-documents.js, receipt-debt.js)
5.5c — pg_cron setup with fault isolation (or Edge Function alternative)
5.5d — Minor stability fixes (snapshot, try/catch, CLAUDE.md, tenant_id, validateOCRData)
       ── STABILITY GATE: all 5.5a-5.5d must pass verification before continuing ──
5.5e — UX fixes (remove file button, info modal update)
5.5f — Advanced document filtering (filter bar + logic + saved presets)
5.5g — Batch document upload (modal, file list, dedup, upload, storage cleanup)
5.5h — Batch OCR processing + pipelining + resume + historical import mode
5.5i — Documentation, backup, verification
```

**Stability gate after 5.5d:** Run full verification suite. ALL critical fixes
must pass before any feature work begins. No exceptions.

---

## 11. Verification Checklist

### Stability (MUST pass before features):
- [ ] `next_internal_doc_number` returns sequential numbers under concurrent load (FOR UPDATE)
- [ ] Two simultaneous creates → no duplicate numbers
- [ ] `update_ocr_template_stats` handles concurrent updates atomically
- [ ] Daily alerts generated automatically (pg_cron or Edge Function)
- [ ] Fault isolation: corrupt tenant doesn't block others in cron loop
- [ ] `batchWriteLog` sends single request for multiple log entries
- [ ] Weekly report uses snapshot cache on revisit
- [ ] No unhandled promise rejections in alerts-badge.js
- [ ] CLAUDE.md DB description matches actual schema
- [ ] OCR validation catches: bad math, future dates, negative amounts
- [ ] Validation errors override high confidence scores

### UX:
- [ ] File can be removed after attachment in goods receipt
- [ ] File can be removed after attachment in document creation
- [ ] Remove button hidden after document is saved
- [ ] Info modal mentions AI scanning flow
- [ ] Removed file deleted from Storage (cleanup)

### Batch Upload:
- [ ] Drag-and-drop works for multiple files
- [ ] File list with preview/remove per file
- [ ] SHA-256 dedup catches identical files (different names)
- [ ] DB dedup catches files already in system (by hash)
- [ ] Duplicate files auto-unchecked with warning
- [ ] Upload progress visible
- [ ] "Upload only" creates draft documents with batch_id + file_hash
- [ ] "Upload + OCR" processes sequentially with progress
- [ ] Resume: failed files show retry button, already-done files untouched
- [ ] Storage cleanup on cancel/remove
- [ ] batch_id links all documents from same upload
- [ ] Orphaned draft cleanup rule works (48h threshold)

### Pipelining:
- [ ] First completed document is reviewable immediately
- [ ] OCR queue continues while user reviews
- [ ] Validation errors marked in results list
- [ ] "Approve all valid" skips documents needing review
- [ ] Pause/resume queue works

### Filtering:
- [ ] Filter by status (5 options)
- [ ] Filter by document type
- [ ] Filter by supplier (searchSelect)
- [ ] Filter by date range
- [ ] Filter by amount range
- [ ] Filter by source (historical/current)
- [ ] Multiple filters AND-combine
- [ ] "Clear all" resets
- [ ] Save filter as favorite (max 5)
- [ ] Load saved filter
- [ ] Result count ("מציג X מתוך Y")
- [ ] Filters persist when switching tabs

### Historical Import:
- [ ] Import mode clearly marked with warning banner
- [ ] No alerts for historical documents
- [ ] No inventory changes
- [ ] OCR learning works (templates updated)
- [ ] is_historical = true on all imported docs
- [ ] Per-supplier learning progress displayed
- [ ] Can filter historical in/out
- [ ] Status set per user choice
- [ ] Learning summary shows accuracy improvement

### Regression:
- [ ] Regular document creation works
- [ ] Single file upload works
- [ ] Single OCR scan works
- [ ] Phase 5 alerts work
- [ ] Phase 5 weekly report works
- [ ] Phase 4 payment wizard works
- [ ] All 4 pages load with zero console errors

---

## 12. What's NOT in Phase 5.5

| Feature | Why Not | When |
|---------|---------|------|
| Supabase Realtime for alerts | Polling works, over-engineering now | Phase 7+ |
| Server-side PDF generation | html2canvas works | If complaints |
| Parallel batch OCR | Rate limits, sequential + pipeline is better | Future |
| Cross-device saved filters | Needs DB table | Future |
| sequence_number column | FOR UPDATE is sufficient at current scale | If > 50K docs/tenant |
| Plan enforcement code | No infrastructure yet, TODO comments placed | Module 2 |
| batch_pending status | Cleanup rule is simpler and achieves same goal | N/A |
| Auto-categorize document types | Low ROI now | Future |
| Batch delete/archive | Not requested | Future |
| OCR accuracy dashboard | Analytics feature | Future |
