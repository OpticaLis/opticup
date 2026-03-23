# Session Context — Module 1: Inventory Management

## Last Updated
Flow Review Session — Historical Import + OCR + Comparison Table + Fixes — 2026-03-23

## What Was Done This Session

### Flow Review Session (2026-03-23) — 27 commits

**Historical Import Redesign (6c0cbdc, 6cec6ff, 618552d, 812bc0c, 8a0495f, 054f2a9):**
- Removed OCR from historical import — import is now upload-only, creates draft documents
- Draft documents show in yellow "ממתין לטיפול" in the document table
- Added `draft` status to supplier_documents CHECK constraint (migration 045)
- File grouping by base number (1A+1B+1C → one document)
- Split ai-historical-import.js (was 400+) → ai-historical-import.js (249) + ai-historical-process.js (182)

**Multi-File OCR Merge (6cec6ff, 618552d, e60c7f7):**
- View modal has one "סרוק עם AI" button (scans ALL attached files sequentially)
- Per-file scan buttons removed — one button for all files
- Header taken from first file, totals from last file, items merged from all files
- All merged OCR items now save correctly to DB
- Batch OCR updated to use multi-file scan for grouped documents

**OCR Review Improvements (b18016d, 93ecdac):**
- Delete + duplicate buttons added to OCR review items table
- Enlarged preview in both View modal and OCR review screen

**PO-Receipt Integration (69f299e):**
- OCR button hidden in receipt form when PO is linked
- Dynamic: linking PO hides button, unlinking shows it
- File upload still works regardless (worker attaches invoice for finance)

**Comparison Table (82b5e77):**
- New file: debt-doc-compare.js (244 lines)
- "📊 השוואה: הזמנה ↔ קבלה ↔ חשבונית" section in debt document view
- Matches items by barcode (exact) with fallback by brand+model+size+color
- Status icons: ✅ match, ⚠️ price diff, 🔴 not in PO, 📦 missing, ❓ invoice only
- Summary row with totals + highlighting on >1% differences
- Graceful degradation: works with only 2 of 3 data sources

**Bug Fixes:**
- 57fc08b — product_type constraint: brand_type (luxury/brand/regular) was incorrectly used as product_type
- d7be64d — Atomic internal doc number + retry on duplicate key (migration 044)
- eeac51e — Better error details in upload failure toasts
- 85acf14 — Updated demo tenant UUID in CLAUDE.md and scripts

**Infrastructure (from earlier in session, previously documented):**
- 75ee26d — cancelPayment reverses paid_amount + cascade settlement
- d9f36bc — Supplier return uses actual quantity (was hardcoded 1)
- 11ef7a6 — Atomic RPC for PO + Return number generation (migrations 041, 042)
- d40b8a6 — Duplicate guard on createDocumentFromReceipt
- 49f5f06 — PIN verification added to goods receipt confirmation
- c8f8a78 — cancelPO validates status before allowing cancellation
- 6caaa50 — product_type derived from brand + FIFO handles credit notes
- f057a32 — Action buttons moved into View modal, clean document table rows
- e1394fd — Credit note status='open', prepaid validations
- cfb4b99 — Server-side duplicate check + unlink delivery notes from invoice
- 8e4745c — Split oversized files + document recycle bin
- e5d1f7c — Prepaid deal actions, PO table enhancements, shortage reorder
- 3e24e71 — Server-side PO aggregates RPC (migration 043)

### All Commits (Flow Review Session)
- 75ee26d Fix: cancelPayment now reverses paid_amount and cascade settlement
- d9f36bc Fix: supplier return uses actual quantity instead of hardcoded 1
- 11ef7a6 Add atomic RPC for PO and Return number generation
- d40b8a6 Add duplicate guard to createDocumentFromReceipt
- 49f5f06 Add PIN verification to goods receipt confirmation
- c8f8a78 Fix: cancelPO validates status before allowing cancellation
- 6caaa50 Fix: product_type from brand + FIFO handles credit notes
- f057a32 UI: move action buttons into View modal, clean document table rows
- e1394fd Fix: credit note status open, prepaid date+check validations
- cfb4b99 Fix: server-side duplicate check + unlink delivery notes from invoice
- 8e4745c Split oversized files + add document recycle bin
- e5d1f7c UX: prepaid deal actions, PO table enhancements, shortage reorder
- 3e24e71 Fix: server-side PO aggregates + full documentation update
- eeac51e Debug: add error details to upload failure toasts
- d7be64d Fix: atomic internal doc number + retry on duplicate key
- 6c0cbdc Feature: file grouping by base number + split ai-historical-import.js
- 6cec6ff Feature: multi-file OCR scan with merge + progress
- 618552d Fix: batch OCR uses multi-file scan for grouped documents
- 812bc0c Fix: saveDocFile debug + per-file scan + multi-page preview
- 8a0495f Simplify: remove OCR from import, add draft status, one scan button
- 054f2a9 Add draft status to supplier_documents CHECK constraint + update schema docs
- 85acf14 Fix: update demo tenant UUID in CLAUDE.md and scripts
- e60c7f7 Fix: save all merged OCR items + larger preview in View modal
- 93ecdac Fix: larger preview in OCR review screen
- b18016d Add delete and duplicate buttons to OCR review items
- 69f299e Hide OCR button in receipt when PO is linked
- 82b5e77 Feature: PO vs Receipt vs Invoice comparison in debt document view
- 57fc08b Fix: product_type constraint for new inventory items

## Current State
- **6 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings
- **~125 JS files**: added ai-historical-process.js, ai-ocr-review.js, debt-doc-compare.js, debt-supplier-tabs.js
- **49 DB tables** + 4 RPC functions (next_po_number, next_return_number, get_po_aggregates, next_internal_doc_number)
- **46 migration files**: 041-045 added this session
- **debt module**: 24 files (added ai-historical-process.js, ai-ocr-review.js, debt-doc-compare.js, debt-supplier-tabs.js)
- Hard tenant session isolation (shared.js slug change detection)
- JWT-based RLS on all 49 tables
- Document recycle bin with restore capability
- PO table with item aggregates (server-side RPC with client fallback)
- Multi-file OCR with merge (header from first, totals from last, items from all)
- File grouping in historical import (1A+1B+1C → one document)
- PO↔Receipt↔Invoice comparison table in debt document view
- Iron Rule #13 added: atomic RPC for sequential numbers

## Open Issues

### 🔴 CRITICAL
- **Migrations 040-045 pending manual execution** in Supabase Dashboard

### 🟡 MEDIUM
- JWT secret rotation before second tenant
- PO supplier dropdown is native select (createSearchSelect integration failed)
- Cannot delete individual files from multi-file gallery

### 🟢 LOW / DEFERRED
- Drag-to-reorder files in gallery
- File dedup via file_hash
- pg_cron job for permanent delete after 30 days (recycle bin)

## Next Steps — Flow Review Phase 2
1. **Execute migrations 040-045** in Supabase Dashboard
2. **Goods receipt flow redesign:**
   - Barcode generation before entry (assign barcodes during receipt, not after confirm)
   - Mandatory document attachment (block confirm without at least one file)
   - AI comparison PO ↔ invoice (use comparison table data to flag discrepancies automatically)
   - Change documentation (log all changes made during receipt process)
   - Excel export with barcodes (export confirmed receipt items with assigned barcodes)
3. **Goods receipt variations to implement:**
   - With PO (match/mismatch handling)
   - Without PO (with invoice — OCR available)
   - Block entry without document attachment
4. **Simplify debt module OCR:**
   - Remove item-level OCR for receipt-linked documents (receipt already has item data)
   - Keep item-level OCR only for standalone documents (service invoices, subscriptions, etc.)
5. **Consider generic next_sequence_number() RPC** in Module 2 (consolidate all sequence generators)
6. **Browser testing on demo tenant** — full flow regression
7. **Merge develop → main** for production deploy
8. **Module 2 planning** (Platform Admin — SaaS infrastructure)
9. **JWT secret rotation**
