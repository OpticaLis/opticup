# Session Context — Module 1: Inventory Management

## Last Updated
Flow Review Phase 2 — 2026-03-24

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

### All Commits (Flow Review Phase 2)
- 6230700 Add migration 046: pending_invoice status, missing_price column, goods_receipt_id unique index
- c116a4c Fix: C1 supplier docs filter, C2 file gallery delete, C3 OCR icon state refresh
- 3dd3bf8 Harden: mandatory file on confirm, document on zero subtotal, atomic confirm with rollback
- 009e284 Improve debt: visual badges, OCR scope, readonly amounts, cascade notification
- 43d878c Feature: incoming invoices tab in inventory + pending_invoice badge in debt dashboard
- 16b947e Feature: receipt items on document view, entry doc link on inventory item
- 39d0fda Fix: PO searchable dropdown, comparison back button, prepaid validation, OCR stub cleanup

## Current State
- **6 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings
- **~130 JS files**: added incoming-invoices.js
- **49 DB tables** + 14 RPC functions
- **47 migration files**: 046 added this session
- **Full traceability loop**: item ↔ receipt ↔ document ↔ invoice ↔ payment
- **6 goods receipt flows verified**: with PO match, with PO mismatch, without PO with OCR, blocked without file, incoming invoice, zero subtotal

## Open Issues

### 🟡 MEDIUM
- Nav bar overflow — "חשבוניות נכנסות" tab scrolled out of view on smaller viewports
- GoTrueClient warnings — multiple Supabase client instances during auth
- item-history.js at 398 lines (close to 400 limit, logical unit)

### 🟢 LOW / DEFERRED TO MODULE 2
- Generic next_sequence_number() RPC (consolidate 4 existing RPCs)
- SELECT MAX audit: barcode generation + stock count number (client-side, no RPC)
- 7 non-tenant UNIQUE constraints (suppliers.name, suppliers.supplier_number, purchase_orders.po_number, stock_counts.count_number, brands.name, inventory.barcode original, sales.order_number)
- PIN unification (receipt uses _receiptPinVerify, others use PinModal.prompt)
- Monkey-patching refactor (10+ functions patched across debt/ai modules)

## Next Steps
1. **Merge develop → main** for production deploy
2. **Module 2 planning** (Platform Admin — SaaS infrastructure)
