# Session Context — Module 1: Inventory Management

## Last Updated
Debt Module Upgrades Complete — 2026-03-28

## What Was Done This Session

### Debt Module Upgrades Phase (24 commits: 8fb0c12..e26af09)

**Phase A-prep — Migration + doc type fix (8fb0c12):**
- Fix doc type pass-through: createDocumentFromReceipt now uses receipt's document type instead of supplier default
- Remove plain "חשבונית" from receipt document type dropdown (keep only תעודת משלוח, חשבונית מס)
- Migration 058: document_numbers TEXT[] and document_amounts JSONB on supplier_documents
- FIELD_MAP additions: document_numbers, document_amounts

**Phase A1 — Supplier filter chips (258d029):**
- New file: debt-supplier-filters.js (102 lines)
- 3 filter groups: type (defined/general), history (with/without), debt (has_debt/overdue)
- Client-side filtering on _supTabData with result count display
- loadSuppliersTab now fetches payments + enriches with hasReceiptDocs/hasHistory flags

**Phase A2 — Month picker + amount filters (ce8d33b):**
- New file: debt-filter-utils.js — reusable month picker toggle + amount range filter
- Month picker: toggle between date range and month/year dropdown
- Amount range: min/max inputs on both main documents tab and supplier detail
- Supplier detail → documents sub-tab now has full filter bar (status, doc type, date, amount)

**Phase A3 — Payment flow fixes (b74ab4b):**
- Fix "שלם" button: now opens payment wizard pre-filled for specific document
- New function: openPaymentForDocument(docId) with preSelectedDocIds in wizard state
- Step 3 allocation: pre-selected docs sorted to top, highlighted blue with ★
- Supplier detail docs: checkboxes on payable docs + "שלם נבחרים" action bar

**Phase A4+A5 — Prepaid display + doc count expand (845f21f):**
- Prepaid column: shows totalPrepaid (green) / totalUsed (red) format
- dealTotal + dealUsed enriched in _supTabData
- Multi-doc expand: count badge "N 📄" + ⋯ toggle → sub-row with breakdown table
- _toggleDocSubRow function for expand/collapse

**Phase A6 — Full document editing (fb86a80):**
- changeDocSupplier function with PIN + ActivityLog
- "📌 שייך לספק" button on documents without supplier
- Subtotal always editable (not disabled on receipt-linked docs)
- Status dropdown with valid transition options

**Phase A7 — Receipt header redesign (eb7681f):**
- Field order: ספק → הזמנת רכש → סוג מסמך → כמות מסמכים → מספר מסמך → תאריך
- New file: receipt-doc-numbers.js — _onDocCountChange, getRcptDocAmounts
- Dynamic multi-doc inputs: set count → N number+amount rows appear
- PO availability indicator: green border if POs exist for supplier

**Quick fix — Prepaid display (4792eeb):**
- Rename "מקדמה" → "עסקה" in table header
- Fix display order: used FIRST (green), total SECOND (red)

**Phase A-AI-1 — Supplier auto-detect (d40c23e):**
- New file: receipt-ocr-supplier.js — OcrSupplierMatch module
- matchSupplier: alias → exact → fuzzy → none matching pipeline
- learnSupplierAlias: saves OCR name as alias for future matching
- Migration 059: supplier_name_aliases on ocr_templates, ai_has_po_pattern on suppliers

**Phase A-AI-2 — PO auto-match (3edbe00):**
- New file: receipt-ocr-po.js — OcrPOMatch module
- findBestPO: scores open POs by item count, amount, item matches (0-100)
- compareItems: per-item status (match/qty_mismatch/price_mismatch/not_in_po/missing)
- CSS classes: ocr-qty-warn, ocr-price-warn, ocr-not-in-po, ocr-missing

**Phase A-AI-3 — Integration verification (2b0b499):**
- Doc type auto-detection from OCR with confidence indicator
- receipt-confirmed event listener: snapshots OCR result, learns aliases, saves corrections
- ai_has_po_pattern updated on receipt confirm

**QA + Fixes (b9c0ef5, f4b2d0e, 10e5c01, 93a6cbc, 8cef6e3, 4374e3b, b4d260e):**
- try/catch on AI calls, clear wizard state on close
- UX fixes: doc inputs, OCR review readability, OCR flow conditional on PO
- OCR flow: PO choice modal when open POs exist, cached re-scan
- Compare button: visible placement above items table, reliable show/hide
- Doc number learning, receipt table readability improvements
- Debug and fix OCR comparison + highlights

**Shared components + generalization (7463b2b, 3bb0188):**
- New shared file: shared/js/table-resize.js (103 lines)
- Generalize resizable columns to all data tables (extracted from debt module)
- Shared table-resize component with sticky scrollbar
- New shared file: shared/js/sort-utils.js (built during Flow-Review-4, used across modules)

**Post-QA fixes (ae9ec76, 80fecd0, 44db0cd, e26af09):**
- Fix: PO choice modal on manual supplier select, prevent double review modal
- Fix comparison matching, fix sticky scrollbar, remove double scrollbar
- Fix payment flow: refresh suppliers table + documents after payment
- Fix prepaid display colors (green=prepaid, red=charged) + auto-deduct from deal on invoice creation

### All Commits (Debt Module Upgrades)
- 8fb0c12 Phase A-prep: fix doc type pass-through, remove invoice option, multi-doc data model
- 258d029 Phase A1: Supplier filter chips — type, history, debt
- ce8d33b Phase A2: Month picker, reusable filter utils, supplier detail doc filters
- b74ab4b Phase A3: Fix pay button, multi-select payment from supplier detail
- 845f21f Phase A4+A5: Prepaid progress display, document count with expand sub-row
- fb86a80 Phase A6: Full document editing — supplier change, amounts, status
- eb7681f Phase A7: Receipt header redesign — field order, doc count, PO indicator
- 4792eeb Fix prepaid display: rename to עסקה, fix order
- d40c23e Phase A-AI-1: Supplier auto-detect from OCR + alias learning
- 3edbe00 Phase A-AI-2: PO auto-match from OCR + discrepancy highlighting
- 2b0b499 Phase A-AI-3: Doc type learning, listener bug fix, integration verification
- b9c0ef5 Debt Module Upgrades: QA passed, docs updated, backup created
- f4b2d0e QA fixes: try/catch on AI calls, clear wizard state on close
- 10e5c01 UX fixes: doc inputs, OCR review readability, OCR flow conditional on PO
- 93a6cbc OCR flow: PO choice modal when open POs exist, cached re-scan
- 8cef6e3 Fix: compare button visibility, doc number learning, receipt table readability
- 4374e3b Fix compare button: visible placement above items table, reliable show/hide
- b4d260e Debug and fix OCR comparison + highlights
- 7463b2b Generalize resizable columns to all data tables
- 3bb0188 Shared table-resize component with sticky scrollbar
- ae9ec76 Fix: PO choice modal on manual supplier select, prevent double review modal
- 80fecd0 Fix comparison matching, fix sticky scrollbar, remove double scrollbar
- 44db0cd Fix payment flow: refresh suppliers table + documents after payment
- e26af09 Fix prepaid display colors + auto-deduct from deal on invoice creation

## Current State
- **9 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings, admin, error, landing
- **~140 JS files** across 15 module folders + 11 global + 11 shared
- **3 Edge Functions**: pin-auth, ocr-extract, remove-background
- **50+ DB tables** + 14 RPC functions
- **59 migration files**: 058-059 added this phase
- **10 new files this phase**: debt-supplier-filters.js, debt-filter-utils.js, receipt-doc-numbers.js, receipt-ocr-supplier.js, receipt-ocr-po.js, receipt-ocr-flow.js, debt-expense-folders.js, debt-general-invoices.js, shared/js/table-resize.js, shared/js/sort-utils.js
- **35 files changed**, +3,521 / -324 lines
- **Zero syntax errors** on all JS files

## Open Issues

### LOW / DEFERRED
- DebtFilterUtils not wrapped as module object (functional, cosmetic inconsistency)
- receipt-ocr.js missing try/catch around AI match calls (internal error handling exists)
- goods-receipt.js at 360 lines — candidate for split
- OCR comparison highlighting not fully reliable (deferred to debug phase)
- PIN unification (standardize to promptPin()) — deferred
- 7 non-tenant UNIQUE constraints — documented tech debt
- admin-tenant-detail.js at 361 lines (Module 2)

## Next Steps
1. **AI receipt flow debug phase** — fix OCR comparison highlighting reliability
2. **Merge to main** after full QA
3. **Module 3 planning** (CRM / Orders / next major module)
