# Session Context

## Last Updated
Phase 8 Complete — 2026-03-21

## What Was Done This Session

### Phase 8 — OCR in Goods Receipt + Purchase Flow Improvements (2026-03-21)

**Step 1 — Per-field Confidence + PO Auto-suggestion:**
- `22d2d41` — _rcptOcrFC, _rcptOcrAddConfDot (green/yellow/red dots on auto-filled fields), _rcptOcrSuggestPO (query open POs, auto-select if OCR finds PO number)

**Step 2a — Item Matching Review UI:**
- `74095e1` — New file: receipt-ocr-review.js (295 lines). _rcptOcrParseDescription (brand alias map + regex extraction), _rcptOcrMatchItem (inventory search by brand+model), _rcptOcrClassifyItems, _rcptOcrShowReview (Modal with matched/new/unknown rows), _rcptOcrApplyToForm

**Step 2b — Connect to Review UI:**
- `b45b3c7` — Items now go through review UI instead of direct insert. Deleted _rcptOcrMatchInventory, _rcptOcrHighlightRow (receipt-ocr.js 341→286 lines)

**Step 3a — Prepaid Alert:**
- `4238395` — Replaced auto-deduction in receipt-debt.js with alertPrepaidNewDocument
- `c57e49a` — Moved alertPrepaidNewDocument to supabase-ops.js (available on all pages)

**Step 3b — Prepaid Deduction UI:**
- `e772efb` — Badge "מקדמה" on supplier documents, "קזז מעסקה" button with PIN-verified deduction modal, auto-dismiss alerts

**Step 4a — Migration 036:**
- `de4a430` — price_decision TEXT + po_match_status TEXT on goods_receipt_items + FIELD_MAP

**Step 4b — PO Comparison Report:**
- `d6da7f8` — New file: receipt-po-compare.js (212 lines). Pre-confirm report: matched/shortage/priceGap/notInPo/missing. Per-item price decisions + auto-return for rejected items. Deleted checkPoPriceDiscrepancies

**Step 5 — Learning Integration:**
- `b92c876` — _rcptOcrBuildItemCorrections, _rcptOcrSaveItemLearning (item aliases in OCR templates), _poCompLearnPricePattern (VAT-inclusive detection)

**Step 6a — Migration 037:**
- `f44b439` — opening_balance, opening_balance_date, opening_balance_notes, opening_balance_set_by on suppliers

**Step 6b — Opening Balance UI:**
- `7d409fd` — openSetOpeningBalance modal with PIN, dashboard calculation respects cutoff date, "יתרת פתיחה" column in suppliers table

**QA-1 — Code Review:**
- `7402765` — 2 critical fixes (inventory query limit, barcode-less item matching), 4 warning fixes (negative qty clamp, returned items total, deduction max validation, summary card opening balance)

**VAT Fix:**
- `4026f4c` — Replace hardcoded 0.17 VAT rate with tenant config in price pattern learning

## Current State
- **6 HTML pages**: index.html, inventory.html, suppliers-debt.html, employees.html, shipments.html, settings.html
- **2 Edge Functions**: pin-auth, ocr-extract
- **~106 JS files** across 14 module folders + 9 global files (js/) + 9 shared/js files (Module 1.5)
- **goods-receipts module**: 10 files (goods-receipt, receipt-form, receipt-actions, receipt-confirm, receipt-debt, receipt-excel, receipt-ocr, receipt-ocr-review, receipt-po-compare)
- **48 DB tables** + 8 RPC functions
- **2 new migrations**: 036 (receipt item PO fields), 037 (supplier opening balance)
- **55 permissions** across 15 modules, 5 roles
- **43 migration files**
- JWT-based RLS tenant isolation on all tables
- Supabase Storage: 3 buckets (failed-sync-files, supplier-docs, tenant-logos)

## Open Issues
- JWT secret exposed in dev chat — must rotate before production
- Staging environment needed before second tenant onboards
- supabase-ops.js at 380 lines (over 350 limit) — tightly coupled unit, acceptable
- debt-prepaid.js at 429 lines (over limit) — needs refactor in future phase
- Views for external access (supplier portal, storefront) planned but not created yet
- Edge Function deployment requires Supabase CLI (not automated)
- jsPDF/html2canvas loaded from CDN — consider self-hosting for reliability
- Hebrew displays as squares in CMD/bat files (cosmetic, doesn't affect functionality)
- Dedup by filename: if Access sends sale + cancellation with same order number, second file is skipped
- install-service.js in scripts/ folder missing --export-dir support
- Deployed watcher service runs from C:\Users\User\opticup\watcher-deploy\ — must manually copy
- Stock Count: barcode 0002793 physically unreadable by ZXing
- Stock Count: camera.js at 350 lines — at the limit
- Stock Count: unknown.js at 374 lines — slightly over 350 limit
- Document linking auto-sum (QAc-002 WARN): auto-sum linked amounts and compare to invoice total
- Cascading payment settlement (QAc-004 WARN): auto-close related linked documents
- Multiple active prepaid deals per supplier: last one wins in deduction UI

## Next Phase
Phase 8 fully complete. Next directions:
1. Module 2 planning (Platform Admin — SaaS infrastructure)
2. JWT secret rotation before production
3. debt-prepaid.js refactor (over 350 lines)
