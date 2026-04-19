# Session Context — Module 1: Inventory Management

## Last Updated
Inventory Fixes + Subrow Feature — 2026-04-19

## What Was Done This Session

### Inventory Module Fixes + UX Improvements (8 commits)

**Stock Count Fixes (3 commits: 9b44831, 7781de7):**
- Case-insensitive barcode matching in stock count scan (stock-count-scan.js)
- Brand selection required before creating a stock count (stock-count-filters.js)
- Excel export refactored: diffs-only option + sort picker (stock-count-export.js — new file, extracted from stock-count-report.js for file-size compliance)

**Inventory Entry Improvements (1 commit: 9b44831):**
- Field reorder: color before size, temple_length to first card-row
- Auto-calculated final price field (readonly, from sell_price × discount)
- Auto-fill from previous row for faster entry

**Inventory Export Fix (1 commit: 9b44831):**
- Final price column added to barcode Excel export

**History Column Removal (2 commits: 9b43976, 6c11d3c):**
- Removed duplicate history column from main table (already in ⋯ menu)
- Extracted action menu + event delegation to inventory-actions.js (file-size compliance)

**Shared Table Resize Fix (2 commits: 3ee7a56, dfd36c9):**
- TableResize: explicit width calculation overrides CSS width:100% for all tables
- Hidden tab guard: skip recalc when offsetWidth=0, ResizeObserver triggers recalc on tab switch

**Subrow Feature (1 commit: 8399d46):**
- Bridge + temple_length moved from main table columns to hidden subrow
- "עוד" button in ⋯ menu toggles subrow (toggle open/close)
- Inline editing for bridge + temple_length in subrow (admin only)
- New file: inventory-actions.js (action menu, event delegation, subrow toggle + edit)

### All Commits (Inventory Fixes + Subrow)
- 9b44831 fix(inventory): items 5-9 from handoff list
- 7781de7 refactor(stock-count): extract Excel export to stock-count-export.js
- 9b43976 fix(inventory): remove duplicate history column
- 6c11d3c refactor(inventory): extract action menu to inventory-actions.js
- 6d5afe3 fix(shared): table scroll — allow tables to grow beyond viewport
- 3ee7a56 fix(shared): table resize — explicit width override for all tables
- dfd36c9 fix(shared): table resize — skip hidden tabs, ResizeObserver recalc
- 8399d46 feat(inventory): add subrow for bridge + temple_length

---

## Previous Session

### AI OCR Fix + Learning System + QA (27 commits)

**OCR Bug Fixes (3 commits: d23b822, a57438f, 4a587e6):**
- BUG-1: _norm() moved from IIFE to global scope (receipt-ocr-supplier.js)
- BUG-3: OCR button stays visible when PO linked (receipt-ocr.js)
- BUG-4: Highlight matching rewritten — UUID-based via data-po-item-id
- BUG-5: Brand parsing fixed — model before size, prefix aliases, multi-word brands

**AI Learning System (4 commits: 862aaba, 8efe8eb, fb12dc3, 4985643):**
- Migration 060: learning_stage, fields_suggested, fields_accepted on supplier_ocr_templates
- Migration 060: suggest_after_invoices, auto_after_invoices, auto_min_accuracy on ai_agent_config
- 3-stage flow: learning (header only) → suggesting (review modal) → auto (direct fill)
- AI learning dashboard tab in suppliers-debt with summary cards + per-supplier table
- Settings page: AI learning thresholds (3 configurable fields)
- File splits: receipt-ocr.js → receipt-ocr-learn.js, goods-receipt.js → receipt-list.js

**PO Comparison Fixes (3 commits: d37ce34, 28041a3, 50da6ce):**
- PO comparison runs in all learning stages (not just suggesting/auto)
- Compare button: unwrap {value} items, guard empty, fallback PO ID
- compareItems rewritten: parse descriptions, match by content (model+brand+price), not position

**Confirm & Learn (1 commit: 4ee4bf0):**
- "🤖 אשר ולמד את ה-AI" button — learns item mappings from confirmed receipt
- Smart matching: model → price+qty → price-only → substring fallback
- Aliases saved to extraction_hints.item_aliases per supplier

**Shared Tables (2 commits: 5b9deb5, 5f8da3a):**
- table-resize.js rewritten: auto-discovery, per-user localStorage persistence, MutationObserver for dynamic tables
- Loaded on all 4 data pages, 15 tables auto-initialized

**Multi-Document OCR (2 commits: de4c975, e540d17):**
- Edge Function accepts file_urls array, sends all to Claude Vision in single call
- receipt-ocr.js uploads all _pendingReceiptFiles
- max_tokens 8192 for multi-file, better error diagnostics

**UI/UX Improvements (3 commits: b1eb79c, f674d2e, a9f478f):**
- Brand autocomplete (createSearchSelect) on manual receipt rows
- Multi-doc number layout fixed (no overlap)
- Brand management: scroll to new row, cancel button for unsaved

**Brand Management (2 commits: 40fdc3e, b791db7):**
- Save only dirty rows (not all 232)
- Delete brand with inventory check (qty=0 only)
- Reactivate inactive brands
- Permanent delete with double PIN
- Duplicate detection (including inactive)
- Migration 061: UNIQUE(name, tenant_id) replaces UNIQUE(name)

**Receipt-to-Debt Flow (3 commits: 41b61ca, bec5bfc, 3b4fb87):**
- Doc type mapping: tax_invoice → invoice (was silently failing)
- Receipt list shows "+N" badge for multi-doc numbers
- Receipt view shows files from linked supplier document
- Receipt view shows all document numbers

**Debt Module — Balance & Simplification (5 commits: 9f1cbf7, c8f40ad, 71fe059, 2eb537f, d1e0936):**
- "חוב כולל" → "יתרה סופית" everywhere
- Formula: paid + deals - invoiced + adjustments (fixed double-counting)
- Positive = green (credit), Negative = red (debt)
- Manual balance adjustments with PIN + timeline
- Migration 062: supplier_balance_adjustments table
- Prepaid deals tab simplified: removed checks, clean progress view

### All Commits (AI OCR Fix + QA)
- d23b822 Fix BUG-1: _norm scope + BUG-3: OCR button visibility
- a57438f Fix BUG-5: brand parsing
- 4a587e6 Fix BUG-4: highlight matching UUID-based
- 862aaba Phase 5b: migration 060 + AI learning thresholds in settings
- 8efe8eb Phase 5c: stage-aware OCR flow
- fb12dc3 Phase 5d: AI learning dashboard tab
- 4985643 Phase 5e: split oversized files + regression
- d37ce34 Fix: PO comparison in all learning stages
- 28041a3 Fix: comparison button guards
- 50da6ce Fix: compareItems parse + match by content
- 4ee4bf0 Add: confirm-and-learn button
- 5b9deb5 Upgrade shared tables
- 5f8da3a Dynamic tables MutationObserver
- de4c975 Multi-document OCR
- b1eb79c Brand autocomplete in receipts
- e540d17 Multi-file diagnostics
- f674d2e Layout multi-doc numbers
- a9f478f Brands scroll + cancel
- 40fdc3e Brands dirty save + delete
- b791db7 Brands duplicate + reactivate + permanent delete
- 41b61ca Fix doc type mapping
- bec5bfc Receipt list multi-doc badge
- 3b4fb87 Receipt view files + doc numbers
- 9f1cbf7 יתרה סופית + deals in balance
- c8f40ad Balance adjustments
- 71fe059 Simplify prepaid deals
- 2eb537f + d1e0936 Fix balance double-counting

## Current State
- **9 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings, admin, error, landing
- **~155 JS files** across 15 module folders + 11 global + 11 shared
- **3 Edge Functions**: pin-auth, ocr-extract (v4, multi-file), remove-background
- **50+ DB tables** + 14 RPC functions
- **62 migration files**: 060-062 added this phase
- **4 new files this phase**: receipt-ocr-learn.js, receipt-list.js, receipt-ocr-confirm-learn.js, ai-learning-dashboard.js
- **Zero console errors** on all 6 pages
- **39/39 QA tests passed**

## Open Issues

### LOW / DEFERRED
- debt-dashboard.js at 424 lines — candidate for split
- receipt-ocr-review.js at 401 lines — borderline
- 219 console statements across codebase — cleanup pass needed
- 6 non-tenant UNIQUE constraints remain (1 fixed: brands)
- Edge Function deployment requires --no-verify-jwt flag

## Next Steps
1. **Module 3 — Storefront** planning
2. **Or** additional Module 1 improvements based on production feedback
