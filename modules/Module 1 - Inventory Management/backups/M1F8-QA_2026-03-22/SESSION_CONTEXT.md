# Session Context

## Last Updated
Phase 8 Complete + Tech Debt + Bug Fixes — 2026-03-21

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

### Tech Debt Resolution (2026-03-21)
- `85d2463` — Split debt-prepaid.js (429→255+179, new debt-prepaid-detail.js)
- `14050c5` — Split supabase-ops.js (380→201+181, new supabase-alerts-ocr.js)
- `92bfe91` — Show all suppliers toggle + opening balance button + document linking auto-sum
- `c1a1a4a` — Cascading payment settlement (auto-close linked docs when parent paid)

### Bug Fixes & UI Improvements (2026-03-21)
- `ad1cc20` — Fix supplier dropdown (createSearchSelect API) + empty state div
- `1b7a3cf` — Fix AI buttons class collision (doc-add-btn → sup-ob-btn)
- `ea582ce` — Batch upload: require supplier selection
- `da0e75b` — Batch upload: default document_type_id
- `bfccde0` — Batch upload: all NOT NULL fields (document_number, date, amounts)
- `b56169b` — OCR auth token fix (jwt_token → prizma_auth_token) + button visibility
- `fc07569` — Button visibility in OCR modals + upload timestamp display
- `b53d6ad` — Comprehensive white-on-white button sweep (19 files, all inline styles)
- `b8704b5` — Hebrew filename sanitization for Supabase Storage (3 files)
- `545557b` — Default hide cancelled docs + historical import required fields
- `07827e7` — OCR save RLS error fix + sort documents by upload date
- `1a06449` + `ade1b4e` — OCR save pass document ID through wrapper chain
- `a71dd7e` — OCR save direct UPDATE instead of batchUpdate
- `2e2690d` — Cache-busting query params on AI module scripts

### New Features (2026-03-21)
- `299893b` — Document edit modal (debt-doc-edit.js) with AI learning from corrections
- `5de358f` — OCR save updates existing documents + return_note doc type + OCR items in edit view
- `33b1220` — Multi-select status filter buttons (פתוח/שולם/מבוטלים)
- `8ac85a0` — Reverse document linking (invoice → delivery notes, multi-select with auto-sum)
- `237d001` — AI auto-suggest delivery note linking from invoice OCR data
- `b809dce` — Include return notes in invoice linking modal

### RLS Policy Fix (2026-03-21)
Fixed 5 tables with old `current_setting('app.tenant_id')` pattern → updated to JWT claims:
- ai_agent_config, alerts, ocr_extractions, supplier_ocr_templates, weekly_reports
(Applied directly in Supabase Dashboard, no migration file)

### Demo Tenant Data Fixes
- Inserted 4 payment_methods + 6 document_types (were missing from clone)
- Added Storage policy on supplier-docs bucket (was missing)
- Inserted ai_agent_config row for demo tenant
- Migration 039: return_note document type for all tenants

## Current State
- **6 HTML pages**: index.html, inventory.html, suppliers-debt.html, employees.html, shipments.html, settings.html
- **2 Edge Functions**: pin-auth, ocr-extract
- **~112 JS files** across 14 module folders + 10 global files (js/) + 9 shared/js files (Module 1.5)
- **debt module**: 16 files (was 14, added debt-prepaid-detail.js + debt-doc-edit.js)
- **js/ global**: 10 files (was 9, added supabase-alerts-ocr.js)
- **goods-receipts module**: 10 files
- **48 DB tables** + 8 RPC functions
- **3 new migrations**: 036, 037, 039
- **55 permissions** across 15 modules, 5 roles
- **44 migration files**
- JWT-based RLS tenant isolation on all 48 tables
- Supabase Storage: 3 buckets (failed-sync-files, supplier-docs, tenant-logos)

## Open Issues

### 🔴 CRITICAL
- **OCR "ערוך ושמור" duplicate key error** — _ocrSave fails with unique constraint violation. Multiple fix attempts: file_url matching, docId passthrough via wrappers (debt-info-inject.js, ai-alerts.js), direct UPDATE, cache-busting. Needs deep debug — possibly another wrapper or code path issue.

### 🟡 MEDIUM
- JWT secret rotation — must rotate before second tenant / production
- ai-ocr.js at 346 lines — near limit
- jsPDF/html2canvas loaded from CDN — ORB blocking in some browsers
- Stock Count: camera.js at 350 lines, unknown.js at 374 lines (over limit)
- Multiple active prepaid deals per supplier: last one wins in deduction UI

### 🟢 LOW / DEFERRED
- Views for external access (supplier portal, storefront) — planned for Module 2+
- Edge Function deployment requires Supabase CLI (not automated)
- Hebrew displays as squares in CMD/bat files (cosmetic)
- install-service.js missing --export-dir support
- Stock Count: barcode 0002793 physically unreadable by ZXing

## Next Steps
1. Deep debug OCR save duplicate key (strategic chat)
2. Module 2 planning (Platform Admin — SaaS infrastructure)
3. JWT secret rotation before second tenant
4. Staging environment setup
