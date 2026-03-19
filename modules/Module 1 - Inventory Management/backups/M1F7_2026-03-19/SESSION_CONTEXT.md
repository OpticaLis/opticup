# Session Context

## Last Updated
Stock Count Hotfixes — 2026-03-18

## What Was Done This Session

### Stock Count Hotfixes — 2026-03-18

Extensive hotfix cycle for the stock-count module — camera scanning, UX improvements, unknown item handling, and mobile optimization. All changes merged to main and deployed.

**Camera Scanning:**
- Fullscreen camera overlay with viewfinder, rear camera (facingMode: environment), 1280x720 resolution
- ZXing BrowserMultiFormatReader integration with garbage read filter (`/^\d{5,}$/` + non-printable stripping)
- Barcode normalization: 5 strategies for ZXing→DB format mismatch (exact, pad7, ean-strip, ean-inner, suffix)
- Scan freeze on success with "המשך סריקה" banner — prevents double-counting
- Safety timeout: 10s auto-resume on banners, disabled for forms (qty/unknown where user types)
- Error debounce: 3-second cooldown on "not found" toasts
- Zoom toggle (1x/2x) when device supports MediaStream zoom API
- Quantity input panel inside camera overlay for re-scanned items (avoids z-index conflicts with Modal)

**Manual Search & Session UX:**
- Clickable filtered rows + single-result Enter auto-count
- Row click confirmation before counting (Modal.confirm)
- Status filter boxes: pending/counted/diffs/unknown — clickable, toggleable
- Undo counted item — return to pending status
- Pause/Resume with explicit button + Cancel now functional

**Unknown Item Flow:**
- Not-found panel inside camera overlay with "הוסף פריט לא ידוע" button
- Unknown item form inside camera overlay: barcode (pre-filled), brand, model, color, size, qty, notes
- Saves to stock_count_items with status='unknown', inventory_id=NULL
- Unknown items section in diff report (orange-bordered table)
- Stats bar shows "לא ידועים" count

**DB Migration:**
- stock_count_items: status CHECK updated to include 'unknown', inventory_id made nullable (migration 032)

**Commits (in order):**
- `dbd6ee8` — manual search: clickable filtered rows + single-result Enter
- `9292568` — pause button + cancel functionality
- `68accf6` — auto-count first scan + quantity modal for re-scan
- `7599173` — status filters + count confirmation + undo
- `929d08f` — fullscreen camera + error debounce + scan logging
- `e7e4bf0` — camera freeze-on-scan + fullscreen fix
- `0573db0` — barcode normalization for ZXing format differences
- `c3d8b65` — camera overlay stays open on error + defensive error handling
- `53decc4` — visible scan debug overlay for mobile diagnosis (temp)
- `a7692eb` — fix garbage barcode filter in ZXing callback
- `63c525e` — fix scan pause stuck + zoom toggle + clean up debug UI
- `bbe13d7` — quantity input inside camera overlay for re-scanned items
- `260dfad` — unknown barcode flow + not-found panel + zoom cleanup
- `984409a` — unknown form timeout fix + size field + unknown items in report

**Deferred to Future Phase:**
- Unknown items → add to inventory on approval (manager edits details, creates inventory row)
- View completed counts (currently toast "בקרוב")
- set_inventory_qty atomic fix (currently SET, should be increment — Iron Rule #1)
- stock-count-session.js splitting (871 lines, 2.5x over 350-line limit)
- Recount/re-open completed counts
- Weekly quick-count flow

### Previous Session: Post-QA Restructure (2026-03-16)

### Final Restructure (path-only, zero logic changes)
- Renamed `modules/suppliers-debt/` → `modules/debt/` (21 files)
- Created `modules/debt/ai/` sub-folder, moved 7 AI files into it
- Renamed `modules/employees/` → `modules/permissions/` (1 file)
- Updated all `<script src>` paths in suppliers-debt.html, inventory.html, employees.html
- Updated CLAUDE.md, MODULE_MAP.md, SESSION_CONTEXT.md, MODULE_SPEC.md documentation

### Previous: QA Phase
Comprehensive QA phase for Module 1 — final certification. Full code scan, functional testing (~190 tests, 177 PASS), 9 end-to-end flows, edge cases, security audit, performance review, UX/mobile/RTL audit, permissions expansion, and extensive bug fixing.

### QA Sub-Phases
- **QA-a: Code scan** — removed dev_bypass query param, removed debug console.logs, fixed innerHTML XSS risks in excel-import, po-items, receipt-form, qty-modal (2 commits)
- **QA-b: Functional testing** — ~190 tests across all 6 pages, 177 PASS, 9 WARN, 4 FAIL (all fixed)
- **QA-c: End-to-end flows** — 9 flows tested: inventory lifecycle, PO→receipt→debt, stock count, Access sync, supplier returns→shipments, debt→payment, OCR→document, prepaid deal, permissions matrix
- **QA-d/e/j: Edge cases, security, permissions, multi-tenancy, data integrity**
- **QA-f/g/h/i/k: Performance, UX audit, mobile, RTL, documentation**

### Bug Fixes
- Duplicate headers on standalone pages (employees.html, suppliers-debt.html)
- PO draft save failing (null supplier validation)
- Receipt sell_price validation missing
- OCR toolbar scan button not appearing
- PIN Hebrew error message encoding
- Negative prices accepted in entry/edit forms
- Table z-index overlap with modals
- Qty button (➕➖) size too small on mobile
- Document cancel not updating status
- Payment cancel not rolling back allocations
- Debt dashboard resilience when no data
- `loadReturnsData` error when returns tab empty
- Settings save failing (RLS policy missing for tenant self-update)
- Logo persistence across page navigation
- Toast notification position overlap with header

### New Features
- **settings.html** — tenant settings page with 3 sections (business info, financial config, display preferences) + logo upload/delete/preview via Supabase Storage bucket `tenant-logos`
- **Return credit timeline** — visual timeline in debt returns tab showing return status progression
- **Stock count realtime search** — debounced search in stock count session filters by brand/model/barcode
- **Stock count brand/category filters** — pre-count filter screen to select brands and product types for targeted counts (stock-count-filters.js)
- **Auto credit note on return credit** — when marking return as credited, auto-creates credit note document in supplier_documents
- **Consistent PIN modal** — shared `promptPin()` function in js/pin-modal.js replaces inline PIN HTML in multiple modules
- **Loading spinners** — added to all module pages during initial data load

### Enhancements
- **Permissions expansion** — 15 new permissions added (55 total across 15 modules), 36 new role_permissions assignments
- **employees.html renamed** to "ניהול הרשאות" (Permission Management) in UI
- **VAT wired to tenant config** — reads `vat_rate` from tenants table instead of hardcoded 17%
- **Home navigation** — header logo click navigates to index.html
- **File splits** — debt-info-content.js (250 lines) + debt-info-inject.js (182 lines) extracted from inline help content

### QA Commits (v5.9..HEAD)
- `28cc3ba` — QA: remove dev_bypass and debug console.logs
- `daaff18` — QA: fix innerHTML XSS risks in excel-import, po-items, receipt-form, qty-modal
- `54e507e` — QA: fix duplicate headers, remove stale nav links, clean low-stock banner
- `1c56564` — QA: fix PO draft save + receipt sell_price validation
- `d20248a` — QA: home nav in header, OCR toolbar fix, Hebrew PIN error, negative price validation
- `59e8a12` — add settings.html with business/financial/display settings, wire VAT to tenant config
- `12b8b38` — QA: fix table z-index, qty buttons size, doc/payment cancel, debt resilience, logo upload
- `ad760af` — QA: expand permissions - rename to ניהול הרשאות, add 26 permissions for all modules, enforce on page load
- `f45a18a` — QA: return credit timeline, stock count realtime search + brand filters
- `e11b4f9` — QA: brand category filter, auto credit note, fast search, consistent PIN modal
- `472438e` — QA: fix logo persistence, loading states, flash fix, loadReturns error, file splits
- `4c92a65` — QA: fix settings save, logo persistence, toast position

### Pre-QA Commits (also in v5.9..HEAD range)
- `52d2a6b` through `04c6521` — post-5.9i returns management, reverse sync XLS, documentation
- `6f546a8` — Update: next phase is QA, Phase 6 deferred
- `d4c5e08` — Documentation update: returns management, config, fixes
- `61b25fa`, `37857f5`, `af0d195`, `b59589c` — CNAME configuration

## Current State
- **6 HTML pages**: index.html (home), inventory.html (inventory module), suppliers-debt.html (supplier debt module), employees.html (permission management), shipments.html (shipments & box management), settings.html (tenant settings)
- **2 Edge Functions**: pin-auth (JWT auth), ocr-extract (Claude Vision OCR)
- **78 JS files** across 14 module folders + 9 global files
- **Folder structure**: modules/debt/ (14 debt files + ai/ sub-folder with 7 AI files), modules/permissions/ (1 file)
- **~20,500 lines of JS code**
- **45 DB tables** + 7 RPC functions + 1 pg_cron job
- **55 permissions** across 15 modules, 5 roles with hierarchical access
- **JWT-based RLS** tenant isolation on all 45 tables + tenant self-update policy
- **Supabase Storage**: 3 buckets (failed-sync-files, supplier-docs, tenant-logos)
- **37 migration files** in migrations/ folder

## Open Issues
- JWT secret exposed in dev chat — must rotate before production
- Staging environment needed before second tenant onboards
- Views for external access (supplier portal, storefront) are planned but not created yet
- Edge Function deployment requires Supabase CLI (not automated)
- weekly-reports Storage folder not created yet (uses supplier-docs bucket)
- jsPDF/html2canvas loaded from CDN — consider self-hosting for reliability
- Hebrew displays as squares in CMD/bat files (cosmetic, doesn't affect functionality)
- Dedup by filename: if Access sends sale + cancellation with same order number, second file is skipped
- install-service.js in scripts/ folder missing --export-dir support (only watcher-deploy/ version has it)
- Deployed watcher service runs from C:\Users\User\opticup\watcher-deploy\ — must manually copy updated files
- **Stock Count: session.js at 871 lines** — needs splitting before further features (camera→stock-count-camera.js)
- **Stock Count: unknown items not added to inventory on approval** — confirmCount ignores unknowns
- **Stock Count: view completed counts** — button shows toast('בקרוב')
- **Stock Count: set_inventory_qty** uses direct SET, should use atomic increment (Iron Rule #1)
- **Stock Count: barcode 0002793** physically unreadable by ZXing (damaged/incompatible barcode print)
- **Document linking auto-sum** (QAc-002 WARN): when linking delivery notes to invoice, auto-sum linked amounts and compare to invoice total
- **Cascading payment settlement** (QAc-004 WARN): when payment fully covers a document, auto-close related linked documents

## Next Phase
Module 2 planning — potential directions:
1. Customer management & prescriptions module
2. Sales/POS integration module
3. Supplier portal (Phase 6, previously deferred)
4. Communications & knowledge module (UI for Phase 5.75 DB stubs)
5. Advanced reporting & analytics dashboard
