# Session Context — Module 1: Inventory Management

## Last Updated
Flow Review Phase 2 + QA Fixes — 2026-03-24

## What Was Done This Session

### Flow Review Phase 2 (2026-03-24) — 7 commits

**Phase 2a — DB preparations (6230700):**
- Migration 046: pending_invoice status, missing_price column, goods_receipt_id UNIQUE index
- Audit: 4 SELECT MAX patterns found (barcode client-side, PO/Return RPC+fallback, stock count client-only)
- Audit: 7 non-tenant UNIQUE constraints documented as tech debt

**Phase 2b — Critical bugs (c116a4c):**
- C1: ai-ocr.js monkey-patch dropped opts parameter → supplier docs invisible in detail panel
- C2: renderFileGallery() — added ✕ delete button with confirmDialog + DB delete + re-render
- C3: _ocrSave() — added supplier-detail-aware refresh (openSupplierDetail vs loadDocumentsTab)

**Phase 2c — Confirm hardening (3dd3bf8):**
- Hard block on confirm without file (toast error + return, no bypass)
- subtotal=0 → document always created with missing_price: true + warning toast
- Atomic confirm with compensating rollback (successfulOps[] + reverse on failure)

**Phase 2d — Debt improvements (009e284):**
- Visual badges: 📦 קבלה / ✏️ ידני / ⚠️ חסר מחיר on documents list
- OCR button hidden on receipt-linked documents
- Amount fields disabled on receipt-linked documents (except when missing_price)
- Cascade settlement toast: "X תעודות משלוח נסגרו אוטומטית"

**Phase 2e — Close the loop (43d878c, 16b947e):**
- New file: modules/inventory/incoming-invoices.js (255 lines) — drag&drop invoice upload
- New tab "📨 חשבוניות נכנסות" in inventory.html
- supplier_document created with status 'pending_invoice', missing_price: true
- Pending invoice banner on debt dashboard with count + "צפה" button
- DOC_STATUS_MAP + filter updated for pending_invoice
- Receipt items displayed on document view (existing _buildReceiptItemsHtml)
- pending_invoice info banner: "חשבונית זו טרם שויכה לתעודות משלוח"
- Entry doc link on inventory item history — async blue banner "📄 נכנס עם..."

**Phase 2f — Medium bugs + cleanup (39d0fda):**
- PO supplier dropdown now searchable (createSearchSelect with hidden input id sync)
- PO comparison "✏️ חזור לעריכה" button with info toast
- Prepaid deduction server-side validation (query actual remaining before deduct)
- Removed _injectOCRScanIcons no-op stub + renderDocumentsTable monkey-patch

### QA Fixes (2026-03-24, continued)

**QA Round 1 (caed735):**
- Drag & drop file attachment on receipt form (_initReceiptDropzone, _stageReceiptFile)
- Match confirmation dialog before PIN (_showMatchConfirmDialog — "הכל תואם" / "יש אי-התאמה")
- Fixed מע"מ typo (מע"ם → מע"מ) in debt-doc-new.js and debt-doc-edit.js
- Added VAT and total-with-VAT columns to PO comparison table

**PO Item Status (66540aa):**
- Receipt items from PO get status dropdown: ✅ תקין / ❌ לא הגיע / 🔄 להחזרה
- PO rows can't be deleted (status dropdown replaces delete button)
- from_po flag on goods_receipt_items (migration 047)
- PO comparison handles receipt_status (missing/return sections)
- confirmReceiptCore skips not_received items
- Fixed "all items match" shortcut bug (wasn't checking missing array)
- Extracted receipt-guide.js (59 lines) from receipt-form.js

**Return Fix (91fc03a):**
- Skip sell_price/brand/model/image validation for return/not_received items
- Fixed return creation: inventory_id nullable (migration 048), pass actual inventory_id
- Returns now appear in זיכויים tab correctly

**Critical Fixes (0df4232):**
- File gallery delete: re-query from DB after delete (was only splicing in-memory array)
- Document number: passes actual form value (was hardcoded "GR-xxxx")
- Credit marking requires document upload before PIN
- PO partial: cancel specific undelivered items (cancelPOItem sets qty=qty_received)
- Block full PO cancel when items already received

**Security & Bugs (5cc236c):**
- Added tenant_id to ~24 queries across 10 files (defense-in-depth, Rule 14)
- Fixed 3 XSS risks: escapeHtml on notes/brand/model, data-attr instead of onclick JSON
- Fixed cancelDocument to accept draft/pending_invoice status
- Fixed Hebrew enum 'במלאי' → 'in_stock' in po-view-import.js
- Fixed count query extraction (response.count not data.length) in debt-doc-filters.js
- Fixed Iron Rule 13: generateNextBarcode() replaces maxBarcode++ in po-view-import.js
- Blocked bulk credit without per-item file upload

### QA Round 2 — Receipt Architecture (2026-03-24)

**PO & Receipt improvements (c4b5854):**
- PO qty expansion: one receipt row per PO item with correct quantity
- Manual barcode generation: "יצירת ברקודים" button, no auto-generation
- Barcode export to Excel (SheetJS) instead of HTML print
- Exclude not_received items from debt document views
- Live PO stock counter (📦 X במלאי, updates on model/color/size change)

**Barcode & RPC fixes (72ca280):**
- Batch barcode generation (loadMaxBarcode once, increment locally) prevents duplicates
- Fixed next_po_number and next_return_number RPCs: FOR UPDATE separated from aggregate query (migration 049)

**Receipt architecture overhaul (e903e88):**
- Single receipt row per PO item with quantity field (not row-per-unit)
- Multi-barcode: qty=3 generates 3 unique barcodes stored in barcodes_csv
- "הגיע חלקית" (partial_received) status with qty input
- confirmReceiptCore creates individual inventory records per barcode
- Migration 050: barcodes_csv, ordered_qty columns, partial_received CHECK

**Display fixes (64ca8d5):**
- PO view: status badges for undelivered items (🔄 נשלח לזיכוי / ❌ לא הגיע)
- Debt comparison: returned items show "לזיכוי" instead of "חסר"
- Changed "פריטי קבלה" title to "פריטים שהוזמנו"

**Infrastructure (fe425a5):**
- Removed watcher log file from git tracking permanently (.gitignore)

### All Commits (Flow Review Phase 2 + QA)
- 6230700 Add migration 046: pending_invoice status, missing_price column, goods_receipt_id unique index
- c116a4c Fix: C1 supplier docs filter, C2 file gallery delete, C3 OCR icon state refresh
- 3dd3bf8 Harden: mandatory file on confirm, document on zero subtotal, atomic confirm with rollback
- 009e284 Improve debt: visual badges, OCR scope, readonly amounts, cascade notification
- 43d878c Feature: incoming invoices tab in inventory + pending_invoice badge in debt dashboard
- 16b947e Feature: receipt items on document view, entry doc link on inventory item
- 39d0fda Fix: PO searchable dropdown, comparison back button, prepaid validation, OCR stub cleanup
- caed735 QA fixes: drag-drop receipt file, match confirmation, VAT typo, comparison VAT columns
- 66540aa Improve: PO receipt item status marking, comparison handles missing/return items
- 91fc03a Fix: skip sell_price validation for return items, fix return creation for marked items
- 0df4232 Fix: file delete persist, doc number from form, credit requires document, PO partial item cancel, block full PO cancel
- 5cc236c Security: add tenant_id to 26 queries, fix XSS risks, fix 3 bugs, block bulk credit without file
- c4b5854 Fix: PO qty expansion, manual barcode generation, Excel barcode export, exclude not_received from debt, live PO stock counter
- 72ca280 Fix: batch barcode generation prevents duplicates, fix PO/return number RPC aggregate lock
- e903e88 Architecture: single receipt row per PO item with qty, multi-barcode generation, partial received status
- 64ca8d5 Fix: PO item status reasons, debt comparison returned label, receipt items title
- fe425a5 Fix: remove watcher log from git tracking

## Current State
- **6 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings
- **~132 JS files**: added incoming-invoices.js, receipt-guide.js
- **49 DB tables** + 14 RPC functions
- **50 migration files**: 046–050 added this session
- **Full traceability loop**: item ↔ receipt ↔ document ↔ invoice ↔ payment
- **Receipt architecture**: single row per PO item with qty, multi-barcode generation, partial_received status
- **Security hardened**: tenant_id on all queries, escapeHtml on all interpolated DB data

## Open Issues

### 🔴 CRITICAL
- Tenant data loading errors — confusion between tenants, needs dedicated debug session
- receipt-form.js at 559 lines — must split (limit 350)

### 🟡 MEDIUM
- po-view-import.js at 419 lines (over 350)
- 10+ files over 350-line limit
- Stacking event listeners in _initReceiptDropzone (needs init guard)

### 🟢 LOW / DEFERRED
- OCR verification on PO-linked receipts (AI flags mismatches)
- Cascading dropdowns on non-PO receipt items
- OCR parsing to individual fields
- "אחר" supplier category for non-optical invoices
- "לבירור" status on debt documents
- Generic next_sequence_number() RPC
- 7 non-tenant UNIQUE constraints
- PIN unification
- Monkey-patching refactor

## Next Steps
1. **Critical: fix tenant data loading errors** — dedicated debug session
2. **Critical: split receipt-form.js** (559 → 2 files)
3. **Module 2 planning** (Platform Admin — SaaS infrastructure)
