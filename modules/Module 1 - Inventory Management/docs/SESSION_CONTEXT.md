# Session Context — Module 1: Inventory Management

## Last Updated
Phase 8-QA Complete — 2026-03-22

## What Was Done This Session

### Phase 8-QA — Comprehensive Flow Review + Bug Fixes + Infrastructure (2026-03-22)

**8-QA-a — OCR Bug + Improvements:**
- OCR duplicate key bug confirmed fixed (mapped full wrapper chain)
- Added % הנחה (discount) column to OCR items table with auto-calculation
- Removed validation blocking total_amount = 0
- Added goods receipt line items display in document view modal

**8-QA-b/c/d — Full Flow Review (9 flows):**
- Reviewed all 9 business flows in browser
- Found 16 bugs, 19 improvement suggestions

**8-QA-e — Bug Fixes (13 bugs):**
- BUG-13/14: Payment system filtered to payable doc types only
- BUG-16: due_date auto-calc from invoice date + supplier payment_terms_days
- BUG-15: Payment terms editable in supplier detail panel
- BUG-12: Total field editable with reverse VAT calculation
- BUG-7: Shipment settings tab click fixed
- BUG-8: Weekly report includes opening balances
- BUG-1: PO supplier dropdown (reverted to native select after createSearchSelect broke)
- BUG-9/10: OCR buttons larger and more visible

**Tenant Session Isolation:**
- Hard tenant isolation: slug change → sessionStorage.clear() + force re-login
- Fixed duplicate headers on tenant switch
- auth-service.js verifies stored tenant matches current slug

**Access Sync Restriction:**
- Disabled for non-Prizma tenants (UI locked message + watcher exit guard)

**Multi-File Support:**
- New table supplier_document_files (migration 040)
- Multi-file upload, gallery preview, "צרף עוד" button
- OCR scan option on additional file attach ("שמור בלבד" vs "שמור וסרוק עם AI")
- Backward compatible fallback to legacy file_url

**Full Document Management in Supplier Detail:**
- Supplier card → מסמכים sub-tab now has ALL action buttons (צפה, שלם, ביטול, קשר, 📎, 🤖)
- renderDocumentsTable accepts opts param (targetEl, hideSupplierCol)
- "+ מסמך חדש" pre-filled with supplier

**Editable Document Items:**
- Items in document edit modal are now editable (qty, price, discount, total)
- Add/remove item rows, auto-calc totals
- New file: debt-doc-items.js (157 lines)
- Items saved to ocr_extractions.extracted_data.items
- Receipt items stay read-only with note "לא ניתנים לעריכה"

**OCR Duplicate Key Fix (second occurrence):**
- _ocrSave UPDATE path now only updates financial fields, not identity fields
- Root cause: OCR-extracted document_number collided with existing document

**Hotfix — PO Supplier Dropdown:**
- Reverted to native select after createSearchSelect API mismatch broke the form
- Added cache buster to po-form.js script tag

**File splits:**
- debt-documents.js → debt-doc-new.js (new document modal functions)
- debt-doc-items.js (editable items logic — new file)

### Commits (Phase 8-QA)
- fa58ba8 Fix OCR duplicate key on file attach + editable document items
- 4f1779d Add cache buster to po-form.js script tag
- 3aa8ab8 Hotfix: restore PO supplier dropdown
- f9c924f Full document management in supplier detail + OCR scan on file attach
- db53b12 Fix: restore closeAndRemoveModal removed during split
- f326a68 Split debt-documents.js into debt-doc-new.js (244+196 lines)
- 4b91c95 Multi-file support for supplier documents
- 502ce0d Critical: hard tenant session isolation on slug change
- bf5d629 Phase 8-QA-e: fix 10 bugs from flow review
- 443e0c2 feat: restrict Access sync to Prizma tenant only
- 6be1a16 chore: bump cache-bust params for ai-ocr, debt-documents, debt-doc-edit
- a57246e feat: add discount column to OCR items + allow zero total amount
- ef1df68 feat: show goods receipt line items in document view modal
- 584e99b Remove OCR debug console.logs — bug confirmed fixed
- 0787972 Phase 8-QA-a: add OCR save diagnostic console.logs

## Current State
- **6 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings
- **~119 JS files**: added debt-doc-new.js, debt-doc-items.js, plus changes across 15+ files
- **49 DB tables**: added supplier_document_files (migration 040, pending manual execution)
- **45 migration files**: added 040_supplier_document_files.sql
- **debt module**: 19 files (was 16, added debt-doc-new.js, debt-doc-items.js, plus existing ai/ 7 files)
- Hard tenant session isolation (shared.js slug change detection)
- JWT-based RLS on all 49 tables

## Open Issues — Flow Fixes Needed (Next Session)

### 🔴 CRITICAL — Flow Issues
- **Cannot delete individual files from multi-file gallery** — when a document has 2+ files, there's no delete/remove button per file in the edit modal gallery
- **🤖 OCR scan button visibility** — once a document has been scanned, the per-row 🤖 button should hide on the main documents table and only remain accessible inside "צפה" modal

### 🟡 MEDIUM
- JWT secret rotation before second tenant
- ai-ocr.js at 366 lines (over 350 limit)
- debt-supplier-detail.js at 387 lines (over 350 limit)
- PO supplier dropdown is native select (createSearchSelect integration failed — API mismatch)
- Migration 040 (supplier_document_files) needs manual execution in Supabase Dashboard

### 🟢 LOW / DEFERRED
- OCR multi-page scan (currently scans primary file only)
- Drag-to-reorder files in gallery
- File dedup via file_hash
- Multiple prepaid deals per supplier edge case

## Next Steps
1. Execute migration 040 in Supabase Dashboard (supplier_document_files table)
2. Fix flow issues listed above (new chat session)
3. Module 2 planning (Platform Admin — SaaS infrastructure)
4. JWT secret rotation
