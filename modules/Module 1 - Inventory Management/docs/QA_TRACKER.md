# QA Tracker — Module 1 Final Certification

> **Based on:** PHASE_QA_SPEC_v2.md
> **Started:** 2026-03-15
> **Status:** In Progress

Legend: `[ ]` = not tested, `[x]` = pass, `[!]` = fail (add bug ID), `[-]` = skipped (with reason)

### QA-a: Setup & Pre-scan ✅
- [x] QA_TRACKER.md created with all 448 tests
- [x] Automated code scan completed (dev_bypass, innerHTML, tenant_id, console.log, file sizes)
- [x] JS syntax check — all files pass
- [x] CRITICAL: dev_bypass removed from auth-service.js (`28cc3ba`)
- [x] LOW: 2 debug console.logs removed from receipt-debt.js (`28cc3ba`)
- [x] XSS: 10 innerHTML risks fixed across 4 files (`daaff18`)
- [x] Tenant_id audit: all 27 insert/upsert calls verified — 0 missing

---

## QA-1: Functional Testing (~182 tests)

### 1.1 Home Screen — index.html (12 tests)
- [ ] F1.01 — PIN login with valid PIN → navigates to correct landing page
- [ ] F1.02 — PIN login with invalid PIN → shows error message in Hebrew
- [ ] F1.03 — Lockout after 5 failed attempts → shows lockout timer, blocks input
- [ ] F1.04 — Session restore on page reload → stays logged in within 8-hour window
- [ ] F1.05 — Logout button → clears session, returns to PIN screen
- [ ] F1.06 — Inventory module card → navigates to inventory.html with session intact
- [ ] F1.07 — Supplier debt module card → navigates to suppliers-debt.html with session intact
- [ ] F1.08 — Shipments module card → navigates to shipments.html with session intact
- [ ] F1.09 — Inactive/locked module cards → grayed out, click shows "coming soon" or no action
- [ ] F1.10 — Header displays store name and logo from tenants table
- [ ] F1.11 — Back navigation from module page → returns to home screen
- [ ] F1.12 — Admin mode toggle with password 1234 → enables admin features

### 1.2 Inventory — inventory.html (27 tests)

#### Main Table (13 tests)
- [ ] F2.01 — Table loads all non-deleted inventory items on page load
- [ ] F2.02 — Free-text search filters table by barcode, brand, model, color
- [ ] F2.03 — Column sorting (click header) — ascending/descending toggle
- [ ] F2.04 — Filter by brand dropdown — shows only items of selected brand
- [ ] F2.05 — Filter by supplier dropdown — shows only items of selected supplier
- [ ] F2.06 — Filter by status dropdown — shows only items with selected status
- [ ] F2.07 — Inline edit of price fields — saves on blur/enter, calls writeLog
- [ ] F2.08 — Inline edit of text fields (model, color, notes) — saves correctly
- [ ] F2.09 — Row selection via checkbox — enables bulk action buttons
- [ ] F2.10 — Bulk export selected rows to Excel (XLS format)
- [ ] F2.11 — Image preview — clicking image icon shows full image modal
- [ ] F2.12 — Item history — clicking history icon shows audit log for that item
- [ ] F2.13 — Pagination or scroll — handles 1000+ items without freezing

#### Add Inventory (7 tests)
- [ ] F2.14 — Manual entry form — all fields present, cascading dropdowns work
- [ ] F2.15 — Cascading dropdown: brand → model → size/color filters correctly
- [ ] F2.16 — Barcode auto-generation — format BBDDDDD (2-digit branch + 5-digit seq)
- [ ] F2.17 — Duplicate barcode prevention — shows error if barcode exists
- [ ] F2.18 — Validation — required fields enforced (brand, model, quantity)
- [ ] F2.19 — Excel/CSV import — file upload parses and creates items
- [ ] F2.20 — Entry history — shows recent entries grouped by date with accordion

#### Remove / Reduce Inventory (5 tests)
- [ ] F2.21 — Decrease quantity via ➖ button — requires PIN, updates DB atomically
- [ ] F2.22 — Increase quantity via ➕ button — requires PIN, updates DB atomically
- [ ] F2.23 — Reduce to zero — item status changes, writeLog records reason
- [ ] F2.24 — Attempt negative quantity — blocked, shows error
- [ ] F2.25 — Excel-based bulk reduction — upload file, process all reductions with PIN

#### Soft Delete (4 tests)
- [ ] F2.26 — Soft delete item — sets is_deleted=true, requires PIN
- [ ] F2.27 — Recycle bin tab — shows all soft-deleted items
- [ ] F2.28 — Restore from recycle bin — sets is_deleted=false, item reappears in table
- [ ] F2.29 — Permanent delete — requires double PIN confirmation, removes from DB

#### Returns Tab (7 tests)
- [ ] F2.30 — Initiate return from reduction — "נשלח לזיכוי" reason creates supplier_return
- [ ] F2.31 — Return types displayed correctly — shows return_type in Hebrew
- [ ] F2.32 — Quantity removed from inventory on return creation
- [ ] F2.33 — Return number auto-generated and unique
- [ ] F2.34 — Staged status items visible in returns tab with correct filters
- [ ] F2.35 — Bulk sendToBox — select multiple returns, navigate to shipments wizard with pre-fill
- [ ] F2.36 — Help banner — collapsible, shows relevant instructions

### 1.3 Purchase Orders (10 tests)
- [ ] F3.01 — PO list loads with summary cards (total, draft, sent, received)
- [ ] F3.02 — Create PO wizard step 1 — select supplier from searchable dropdown
- [ ] F3.03 — PO number auto-generated — format PO-{supplier_number}-{4-digit seq}
- [ ] F3.04 — Add items to PO — brand/model/size/color/qty/price fields
- [ ] F3.05 — Edit draft PO — change items, quantities, prices
- [ ] F3.06 — Send PO — status changes to "sent", no further edits
- [ ] F3.07 — Cancel PO — status changes to "cancelled" with confirmation
- [ ] F3.08 — Export PO to PDF — includes header, items, totals, formatted correctly
- [ ] F3.09 — Export PO to Excel — all columns present
- [ ] F3.10 — Low stock alert — brands below min_stock_qty highlighted

### 1.4 Goods Receipts (13 tests)
- [ ] F4.01 — Create new receipt — select supplier, set type (with/without PO)
- [ ] F4.02 — Link receipt to PO — auto-loads expected items from PO
- [ ] F4.03 — Add existing item by barcode scan — quantity increments
- [ ] F4.04 — Add new item (not in system) — full entry form within receipt
- [ ] F4.05 — Mandatory barcode — cannot confirm without barcode on every item
- [ ] F4.06 — Confirm receipt — updates inventory quantities atomically, writeLog
- [ ] F4.07 — cost_price saved on receipt items — used for debt calculation
- [ ] F4.08 — PO price comparison — warns if receipt price differs from PO price
- [ ] F4.09 — File attachment — upload delivery note PDF/image
- [ ] F4.10 — No-file warning — alert if confirming without attached document
- [ ] F4.11 — Prepaid deduction — auto-deducts from prepaid deal if exists
- [ ] F4.12 — Info button — shows receipt guide/instructions for employee
- [ ] F4.13 — Discrepancy detection — ordered X, received Y → warning shown

### 1.5 Stock Counting (5 tests)
- [ ] F5.01 — Create new stock count — generates count number, status=in_progress
- [ ] F5.02 — Scan barcode → enter actual quantity → shows expected vs actual
- [ ] F5.03 — Discrepancy report — lists all items where actual ≠ expected
- [ ] F5.04 — Confirm count with PIN — updates all quantities atomically
- [ ] F5.05 — Export count report to Excel — includes discrepancies

### 1.6 Brands & Suppliers (8 tests)
- [ ] F6.01 — Brands table loads with all brands and current quantities
- [ ] F6.02 — Brand filters — active/inactive, sync type, brand type, low stock
- [ ] F6.03 — Toggle brand active/inactive — saves immediately to DB
- [ ] F6.04 — Supplier list loads with all suppliers
- [ ] F6.05 — Add new supplier — name, number (≥10, unique), payment terms
- [ ] F6.06 — Supplier number uniqueness enforced — duplicate blocked
- [ ] F6.07 — Edit supplier settings — payment_terms_days, withholding_tax_rate
- [ ] F6.08 — Supplier number swap — temp negative trick avoids UNIQUE conflict

### 1.7 Access Sync (10 tests)
- [ ] F7.01 — Heartbeat indicator — shows watcher status (online/offline/stale)
- [ ] F7.02 — CSV import — watcher picks up CSV file, processes sales
- [ ] F7.03 — XLSX import — watcher picks up XLSX file, processes sales
- [ ] F7.04 — Pending panel — unmatched barcodes appear in pending_sales
- [ ] F7.05 — Detail modal — click pending item shows full details
- [ ] F7.06 — Inline resolve — match pending barcode to inventory item manually
- [ ] F7.07 — Mark as handled — pending item disappears from panel
- [ ] F7.08 — Reverse sync export — new inventory items exported as XLS for Access
- [ ] F7.09 — Export log — sync_log table shows all imports with status/counts
- [ ] F7.10 — Manual import button — upload file directly from browser

### 1.8 Supplier Debt — suppliers-debt.html (24 tests)

#### Dashboard (3 tests)
- [ ] F8.01 — Dashboard cards show total debt, due this week, overdue, paid this month
- [ ] F8.02 — Aging breakdown — 30/60/90+ day buckets displayed correctly
- [ ] F8.03 — Currency conversion — amounts shown in correct currency per supplier

#### Documents (8 tests)
- [ ] F8.04 — Document list loads with filters (supplier, type, status, date range)
- [ ] F8.05 — Create new document — select type, supplier, amount, date
- [ ] F8.06 — View document details — all fields, linked documents, payment history
- [ ] F8.07 — Attach file to document — upload PDF/image
- [ ] F8.08 — Link delivery note to invoice — document_links created correctly
- [ ] F8.09 — Validation — required fields enforced, amount > 0
- [ ] F8.10 — Cancel document — status changes, debt recalculated
- [ ] F8.11 — Advanced filters — 8 criteria with saved favorites

#### Payments (7 tests)
- [ ] F8.12 — Payment wizard step 1 — select supplier
- [ ] F8.13 — Payment wizard step 2 — enter amount, method, withholding tax
- [ ] F8.14 — Payment wizard step 3 — FIFO allocation to open documents
- [ ] F8.15 — Manual allocation — override FIFO, allocate to specific documents
- [ ] F8.16 — Partial payment — allocates partial amount, document stays open
- [ ] F8.17 — Full payment — document status changes to paid
- [ ] F8.18 — Overpayment handling — excess creates credit or warning

#### Prepaid (4 tests)
- [ ] F8.19 — Create prepaid deal — total amount, supplier, checks
- [ ] F8.20 — Manage prepaid checks — add/edit/delete checks with dates
- [ ] F8.21 — Auto-deduction on goods receipt — prepaid balance reduced
- [ ] F8.22 — Threshold alert — warning when prepaid balance runs low

#### Supplier Detail (3 tests)
- [ ] F8.23 — Supplier detail slide-in panel opens correctly
- [ ] F8.24 — Timeline shows all events (documents, payments, returns) chronologically
- [ ] F8.25 — Sub-tabs: documents, payments, returns — each loads correct data

#### Returns in Debt (4 tests)
- [ ] F8.26 — Returns list shows all supplier returns with status
- [ ] F8.27 — Filter returns by supplier, status, date
- [ ] F8.28 — Credit flow — mark return as credited, updates debt balance
- [ ] F8.29 — Partial credit — partial amount credited against return

### 1.9 AI Agent (23 tests)

#### OCR (12 tests)
- [ ] F9.01 — Upload single document for OCR scan (PDF or image)
- [ ] F9.02 — OCR processes document via Claude Vision Edge Function
- [ ] F9.03 — Review OCR results — extracted fields shown for verification
- [ ] F9.04 — Confidence score displayed per field
- [ ] F9.05 — Edit extracted fields before saving — corrections applied
- [ ] F9.06 — Learning from corrections — template accuracy improves over time
- [ ] F9.07 — Template matching — recognized supplier format reused
- [ ] F9.08 — Template creation — new supplier format saved for future
- [ ] F9.09 — OCR error handling — unreadable document shows clear error
- [ ] F9.10 — Low confidence warning — fields below threshold highlighted
- [ ] F9.11 — Save OCR result as supplier document — creates record in supplier_documents
- [ ] F9.12 — OCR extraction hints — per-supplier document type hints used

#### Batch Operations (5 tests)
- [ ] F9.13 — Batch upload — drag-drop multiple files at once
- [ ] F9.14 — Dedup detection — duplicate files flagged by file_hash
- [ ] F9.15 — Batch OCR pipeline — processes multiple documents sequentially
- [ ] F9.16 — Pipeline resume — interrupted batch continues from last processed
- [ ] F9.17 — Historical import — import old documents for AI learning

#### Alerts (9 tests)
- [ ] F9.18 — Bell icon shows unread count badge on all pages
- [ ] F9.19 — Dropdown panel lists recent alerts sorted by date
- [ ] F9.20 — Due payment alert — generated for upcoming payments
- [ ] F9.21 — Overdue payment alert — generated for past-due documents
- [ ] F9.22 — Prepaid low balance alert — triggered at threshold
- [ ] F9.23 — Anomaly detection alert — price/quantity discrepancy flagged
- [ ] F9.24 — Duplicate document alert — same number/supplier flagged
- [ ] F9.25 — Alert actions — dismiss, navigate to related entity
- [ ] F9.26 — Auto-dismiss — resolved alerts auto-clear

#### Weekly Report (4 tests)
- [ ] F9.27 — Weekly report screen loads with current week data
- [ ] F9.28 — Navigation between weeks — forward/back arrows work
- [ ] F9.29 — Export report to PDF — formatted, readable
- [ ] F9.30 — Report stats — totals, trends, supplier breakdown accurate

### 1.10 Shipments — shipments.html (44 tests)

#### Box List (7 tests)
- [ ] F10.01 — Box list loads with all non-deleted shipments
- [ ] F10.02 — Filter by box type (framing, return, repair, shipment)
- [ ] F10.03 — Filter by supplier — shows only boxes for that supplier
- [ ] F10.04 — Filter by courier — shows only boxes assigned to that courier
- [ ] F10.05 — Filter by date range — shows boxes created within range
- [ ] F10.06 — Sort by date/number/type/status — ascending/descending
- [ ] F10.07 — Status indicators — visual badges for open/locked/shipped

#### Wizard (12 tests)
- [ ] F10.08 — Create framing box — wizard step 1 selects type + supplier
- [ ] F10.09 — Create return box — wizard step 1 selects type + supplier
- [ ] F10.10 — Create repair box — wizard step 1 selects type + supplier
- [ ] F10.11 — Create shipment box — wizard step 1 selects type + supplier
- [ ] F10.12 — Step 2 framing — add items by barcode scan or search
- [ ] F10.13 — Step 2 return — staged picker auto-loads pending return items
- [ ] F10.14 — Step 2 repair — add items manually with notes
- [ ] F10.15 — Step 2 shipment — add items by barcode scan
- [ ] F10.16 — Step 2 accordion — items grouped by category, expandable
- [ ] F10.17 — Step 3 — select courier, add tracking number, notes
- [ ] F10.18 — Confirm box creation — saves to DB, generates box number
- [ ] F10.19 — Box number format — uses prefix from tenant config + sequential

#### JSONB Config (10 tests)
- [ ] F10.20 — Default config loads for each box type
- [ ] F10.21 — Required fields enforced — cannot proceed without them
- [ ] F10.22 — Optional fields shown but not required
- [ ] F10.23 — Hidden fields not rendered in form
- [ ] F10.24 — Custom fields — tenant-defined extra fields appear and save
- [ ] F10.25 — Categories — items can be grouped by category
- [ ] F10.26 — Per-type config — different types have different field visibility
- [ ] F10.27 — Config UI — settings page shows field visibility toggles
- [ ] F10.28 — Config version — changes tracked
- [ ] F10.29 — Config validation — at least 1 field must remain visible

#### Return Integration (5 tests)
- [ ] F10.30 — Staged picker shows only pending/ready_to_ship returns for supplier
- [ ] F10.31 — Adding return to box auto-updates return status to shipped
- [ ] F10.32 — Removing return from box reverts status to previous state
- [ ] F10.33 — Non-staged returns blocked from being added
- [ ] F10.34 — Bulk returns from inventory tab — pre-fills wizard via URL params

#### Edit Window & Lock (9 tests)
- [ ] F10.35 — Edit window timer — shows countdown from tenant config minutes
- [ ] F10.36 — Add item during edit window — updates items_count
- [ ] F10.37 — Remove item during edit window — updates items_count
- [ ] F10.38 — Edit item during edit window — changes saved
- [ ] F10.39 — Manual lock — button locks box before timer expires
- [ ] F10.40 — Auto-lock on timer expiry — box becomes immutable
- [ ] F10.41 — Immutable after lock — no add/remove/edit allowed
- [ ] F10.42 — Visual change on lock — UI clearly shows locked state
- [ ] F10.43 — Configurable lock time — reads shipment_lock_minutes from tenant

#### Correction Box (3 tests)
- [ ] F10.44 — Create correction box linked to locked box
- [ ] F10.45 — Correction box references original via corrects_box_id
- [ ] F10.46 — Edit window applies to correction box same as original

#### Manifest & Export (5 tests)
- [ ] F10.47 — Print manifest — generates formatted printable document
- [ ] F10.48 — Manifest RTL — Hebrew text renders correctly in print
- [ ] F10.49 — Manifest header — includes box number, supplier, date, courier
- [ ] F10.50 — Manifest signature line — space for receiver signature
- [ ] F10.51 — Export box items to Excel — all columns present

#### Couriers (4 tests)
- [ ] F10.52 — Courier list loads with all active couriers
- [ ] F10.53 — Add new courier — name, phone, contact person
- [ ] F10.54 — Edit courier details — saves correctly
- [ ] F10.55 — Deactivate courier — is_active=false, hidden from dropdowns

### 1.11 Employees — employees.html (6 tests)
- [ ] F11.01 — Employee list loads with all employees
- [ ] F11.02 — Add new employee — name, PIN, email, phone, branch
- [ ] F11.03 — Edit employee details — saves correctly
- [ ] F11.04 — Assign role to employee — employee_roles updated
- [ ] F11.05 — Permission matrix — editable grid of roles × permissions
- [ ] F11.06 — PIN uniqueness enforced — duplicate PIN blocked

---

## QA-2: End-to-End Flows (9 flows)

- [ ] Flow A — Complete purchase cycle: create PO → send → receive goods → confirm receipt → supplier document auto-created → payment via wizard → debt cleared
- [ ] Flow B — Delivery notes to invoice: receive goods with delivery note → link multiple delivery notes → create monthly invoice → pay invoice
- [ ] Flow C — Prepaid deal lifecycle: create deal with checks → receive goods → auto-deduction → balance alert → top-up deal
- [ ] Flow D — Full return lifecycle: reduce item with "נשלח לזיכוי" → return created → add to box → ship → supplier receives → credit applied → debt reduced
- [ ] Flow E — OCR invoice processing: upload PDF → OCR extracts fields → review confidence → correct errors → save as document → template learned
- [ ] Flow F — Access sync round-trip: Access exports CSV → watcher imports → pending items resolved → new items entered → reverse export XLS for Access
- [ ] Flow G — New employee onboarding: create employee → assign role → employee logs in with PIN → permissions verified on each module
- [ ] Flow H — Framing shipment box: create framing box → add items by barcode → select courier → lock box → print manifest → create correction if needed
- [ ] Flow I — Return box with auto-status: select staged returns → create return box → status auto-updates to shipped → remove item reverts status

---

## QA-3: Edge Cases & Boundaries (35 tests)

- [ ] E.01 — Barcode with leading zeros — preserved correctly in all displays and exports
- [ ] E.02 — Item with quantity=0 — displays correctly, status reflects empty
- [ ] E.03 — Item with max quantity (9999) — no overflow in UI or DB
- [ ] E.04 — Supplier with 500+ items — table renders without timeout
- [ ] E.05 — Brand name with special characters (quotes, ampersands) — no XSS
- [ ] E.06 — Empty database — all pages load without errors, show empty states
- [ ] E.07 — Concurrent quantity changes — atomic RPC prevents race conditions
- [ ] E.08 — Session expiry mid-action — graceful redirect to login
- [ ] E.09 — Network disconnect during save — error message, data not corrupted
- [ ] E.10 — Double-click submit button — no duplicate records created
- [ ] E.11 — PO with 100 items — form handles without lag
- [ ] E.12 — Receipt for cancelled PO — blocked or warned
- [ ] E.13 — Payment exceeding total debt — handled (credit or warning)
- [ ] E.14 — Prepaid deal with 20 checks — UI scrolls correctly
- [ ] E.15 — OCR on blank/corrupted PDF — error handled gracefully
- [ ] E.16 — Simultaneous logins with same PIN — both sessions valid
- [ ] E.17 — Browser back button — no broken state
- [ ] E.18 — Very long model/color names (100+ chars) — truncated in table, full in detail
- [ ] E.19 — Hebrew + English mixed text in fields — renders correctly RTL
- [ ] E.20 — Export 5000 items to Excel — completes without timeout
- [ ] E.21 — Filter returning 0 results — shows empty state message
- [ ] E.22 — Upload 10MB file as attachment — size limit enforced or handled
- [ ] E.23 — Invoice amount with 3+ decimals — rounded to 2
- [ ] E.24 — Sync file with 1000 rows — watcher processes without crash
- [ ] E.25 — Permission denied mid-flow — graceful error, no partial state
- [ ] E.26 — Box at exactly lock time (e.g. 30 min) — locks correctly at boundary
- [ ] E.27 — Create box with 0 items — blocked, cannot save empty box
- [ ] E.28 — Box with 50 items — UI renders all items, scrolls correctly
- [ ] E.29 — Remove last item from box — behavior defined (delete box or keep empty)
- [ ] E.30 — Correction box of correction box — chain handled (blocked or allowed with reference)
- [ ] E.31 — Same staged return item added to two boxes — blocked (one box only)
- [ ] E.32 — Config with all fields set to hidden — validation ensures at least 1 visible
- [ ] E.33 — OCR on 10-page PDF — no timeout, processes completely
- [ ] E.34 — Alert count exceeding 99 — badge shows "99+"
- [ ] E.35 — Manifest print with 50 items — paginated correctly

---

## QA-4: Security Testing

- [ ] S.01 — JWT token validation — expired token rejected, returns 401
- [ ] S.02 — JWT token tampering — modified token rejected
- [x] S.03 — XSS via input fields — HTML/script injection sanitized (escapeHtml) ✅ Fixed in `daaff18`: excel-import, po-items, receipt-form, qty-modal
- [ ] S.04 — XSS via URL parameters — query params sanitized
- [ ] S.05 — SQL injection via search — parameterized queries prevent injection
- [ ] S.06 — RLS enforcement — direct Supabase API call without tenant_id returns empty
- [ ] S.07 — Brute force PIN — lockout after 5 attempts, timer enforced
- [ ] S.08 — Session hijacking — stolen token from different IP/device rejected or flagged
- [ ] S.09 — CSRF — cross-site requests blocked
- [ ] S.10 — Sensitive data in URL — no PINs/tokens in query strings
- [x] S.11 — Console exposure — no secrets/tokens logged to console ✅ dev_bypass removed in `28cc3ba`, debug console.logs removed
- [ ] S.12 — Admin password not hardcoded in client JS — verify 1234 is only in sessionStorage check

---

## QA-5: Performance Testing (20 benchmarks)

- [ ] P.01 — Page load time: index.html < 3 seconds on 3G
- [ ] P.02 — Page load time: inventory.html < 5 seconds with 1000 items
- [ ] P.03 — Page load time: suppliers-debt.html < 5 seconds
- [ ] P.04 — Page load time: shipments.html < 3 seconds
- [ ] P.05 — Page load time: employees.html < 2 seconds
- [ ] P.06 — Search response time < 300ms for 1000 items
- [ ] P.07 — Filter application < 500ms
- [ ] P.08 — Inline edit save < 1 second round-trip
- [ ] P.09 — PO creation (10 items) < 2 seconds
- [ ] P.10 — Receipt confirmation (20 items) < 3 seconds
- [ ] P.11 — Excel export 1000 rows < 5 seconds
- [ ] P.12 — OCR single page < 15 seconds
- [ ] P.13 — Batch OCR 5 pages < 60 seconds
- [ ] P.14 — Alert generation (pg_cron) < 10 seconds
- [ ] P.15 — Payment wizard render < 1 second
- [ ] P.16 — Box creation with 20 items < 3 seconds
- [ ] P.17 — Manifest print render < 2 seconds
- [ ] P.18 — Staged picker load < 2 seconds for 50 returns
- [ ] P.19 — Memory usage — no leaks after 30 minutes of use
- [ ] P.20 — Supabase connection pool — no exhaustion under normal use

---

## QA-6: Visual & UX Professional Audit

### Global Checks (20 items)
- [ ] V.01 — Color palette consistency — dark blue + white + gray across all pages
- [ ] V.02 — Font consistency — same font family and sizes throughout
- [ ] V.03 — Button styles — consistent colors, sizes, hover states
- [ ] V.04 — Spacing/padding — consistent between sections and cards
- [ ] V.05 — Card design — uniform borders, shadows, radius
- [ ] V.06 — Table design — consistent headers, alternating rows, hover
- [ ] V.07 — Modal design — consistent overlay, close button, padding
- [ ] V.08 — Toast notifications — consistent position, timing, colors
- [ ] V.09 — Loading states — spinner or skeleton shown during data fetch
- [ ] V.10 — Empty states — meaningful messages when no data (not blank)
- [ ] V.11 — Error states — clear Hebrew error messages, not raw English
- [ ] V.12 — Hover effects — all interactive elements have visible hover
- [ ] V.13 — Focus indicators — keyboard navigation shows focus ring
- [ ] V.14 — Scrollbar styling — consistent across browsers
- [ ] V.15 — Badge consistency — counts, colors, positions uniform
- [ ] V.16 — Icon consistency — same icon set used everywhere
- [ ] V.17 — Transitions/animations — smooth, not jarring
- [ ] V.18 — Dropdown styling — consistent across all pages
- [ ] V.19 — PIN modal — same look on every page that requires PIN
- [ ] V.20 — Dark mode readiness — no white flashes, good contrast ratios

### Per-Page Audit
- [ ] V.21 — Home page: score (1-10), 3 positives, 3 improvements
- [ ] V.22 — Home page: login flow visual quality
- [ ] V.23 — Home page: module card grid layout
- [ ] V.24 — Home page: responsive breakdown points
- [ ] V.25 — Home page: header + branding
- [ ] V.26 — Inventory page: score (1-10), 3 positives, 3 improvements
- [ ] V.27 — Inventory page: table readability at full width
- [ ] V.28 — Inventory page: entry form layout
- [ ] V.29 — Inventory page: tab navigation clarity
- [ ] V.30 — Inventory page: filter bar layout
- [ ] V.31 — Debt page: score (1-10), 3 positives, 3 improvements
- [ ] V.32 — Debt page: dashboard card layout
- [ ] V.33 — Debt page: document list readability
- [ ] V.34 — Debt page: payment wizard steps visual flow
- [ ] V.35 — Debt page: supplier detail panel design
- [ ] V.36 — Debt page: returns tab visual consistency
- [ ] V.37 — Shipments page: score (1-10), 3 positives, 3 improvements
- [ ] V.38 — Shipments page: box list card design
- [ ] V.39 — Shipments page: wizard step indicators
- [ ] V.40 — Shipments page: lock timer visual prominence
- [ ] V.41 — Shipments page: manifest print layout
- [ ] V.42 — Employees page: score (1-10), 3 positives, 3 improvements
- [ ] V.43 — Employees page: permission matrix readability

---

## QA-7: Cross-Browser Testing

- [ ] B.01 — Chrome (latest) — all 5 pages load and function correctly
- [ ] B.02 — Firefox (latest) — all 5 pages load and function correctly
- [ ] B.03 — Safari (latest) — all 5 pages load and function correctly
- [ ] B.04 — Edge (latest) — all 5 pages load and function correctly
- [ ] B.05 — Chrome — RTL layout renders correctly
- [ ] B.06 — Firefox — RTL layout renders correctly
- [ ] B.07 — Safari — RTL layout renders correctly
- [ ] B.08 — Edge — RTL layout renders correctly

---

## QA-8: Mobile & Responsive Testing

### General Mobile (13 tests)
- [ ] M.01 — Viewport meta tag present — no desktop scaling on mobile
- [ ] M.02 — No horizontal scroll on any page at 375px width
- [ ] M.03 — Header responsive — logo + name stack or shrink on mobile
- [ ] M.04 — Navigation stacking — module cards stack vertically on narrow screens
- [ ] M.05 — Touch targets ≥ 44px — all buttons and links tappable
- [ ] M.06 — Font size ≥ 14px — readable without zoom
- [ ] M.07 — Correct keyboard types — numeric for PIN/qty, email for email fields
- [ ] M.08 — Dropdowns usable on touch — open, scroll, select work
- [ ] M.09 — Modals fit screen — no overflow, scrollable if tall
- [ ] M.10 — Tables scroll horizontally — with sticky first column if possible
- [ ] M.11 — PIN modal touch-friendly — large digit boxes, clear button
- [ ] M.12 — Toast notifications visible — not hidden behind keyboard
- [ ] M.13 — Landscape orientation — layout adjusts, no broken elements

### Home Page Mobile (3 tests)
- [ ] M.14 — Module cards stack to single column on phone
- [ ] M.15 — Login button full-width on mobile
- [ ] M.16 — Background blur effect works on mobile browsers

### Inventory Mobile (8 tests)
- [ ] M.17 — Main table horizontal scroll with touch
- [ ] M.18 — Search bar full-width, keyboard opens correctly
- [ ] M.19 — Filter dropdowns fit screen width
- [ ] M.20 — Entry form fields stack vertically
- [ ] M.21 — Cascading dropdowns work with touch
- [ ] M.22 — Barcode scanner integration (if available)
- [ ] M.23 — Action buttons (➕➖) touch-friendly
- [ ] M.24 — Returns tab usable on mobile — filters, accordion, actions

### Debt Module Mobile (7 tests)
- [ ] M.25 — Dashboard cards stack to 2×2 or 1-column on phone
- [ ] M.26 — Aging chart readable on mobile
- [ ] M.27 — Tab navigation scrollable or stacked
- [ ] M.28 — Document list scrollable with summary visible
- [ ] M.29 — Payment wizard steps fit screen width
- [ ] M.30 — Supplier detail panel full-screen on mobile (not side panel)
- [ ] M.31 — File upload/preview works on mobile browsers

### Shipments Mobile (7 tests)
- [ ] M.32 — Box list cards responsive
- [ ] M.33 — Wizard steps fit mobile width
- [ ] M.34 — Staged return picker checkboxes touch-friendly
- [ ] M.35 — Lock timer visible and prominent
- [ ] M.36 — Detail panel full-screen on mobile
- [ ] M.37 — Manifest readable on mobile (preview before print)
- [ ] M.38 — Accordion expand/collapse with touch

### Employees Mobile (2 tests)
- [ ] M.39 — Employee list scrollable
- [ ] M.40 — Permission matrix scrollable with sticky headers

### Mobile-Specific Issues
- [ ] M.41 — Keyboard does not cover input fields (auto-scroll)
- [ ] M.42 — iOS bottom safe area — no content hidden behind home bar
- [ ] M.43 — Android address bar resize — layout doesn't break
- [ ] M.44 — No adjacent touch targets closer than 8px
- [ ] M.45 — Pinch-zoom does not break layout
- [ ] M.46 — Overflow:hidden doesn't trap user in a section
- [ ] M.47 — Fixed position elements work with soft keyboard open

---

## QA-9: RTL & Hebrew Testing

- [ ] R.01 — All text aligned right-to-left on all pages
- [ ] R.02 — Tables: header alignment matches content alignment (RTL)
- [ ] R.03 — Numbers display LTR within RTL context (phone, barcode, amounts)
- [ ] R.04 — Date format — DD/MM/YYYY consistent everywhere
- [ ] R.05 — Currency symbol position — ₪ in correct position
- [ ] R.06 — Mixed Hebrew+English text — no broken bidi rendering
- [ ] R.07 — Form labels — aligned correctly to the right of inputs
- [ ] R.08 — Modal close button — top-left (RTL convention)
- [ ] R.09 — Slide-in panels — enter from left side (RTL)
- [ ] R.10 — Excel export — Hebrew columns render correctly in Excel
- [ ] R.11 — PDF export — Hebrew text not garbled or reversed
- [ ] R.12 — Print manifest — Hebrew prints correctly

---

## QA-10: Data Integrity (17 tests)

- [ ] D.01 — Every inventory quantity change has a matching inventory_logs entry
- [ ] D.02 — Sum of payment_allocations = payment amount for each payment
- [ ] D.03 — Supplier debt = sum(unpaid documents) - sum(credits) per supplier
- [ ] D.04 — Goods receipt confirmation creates inventory_logs for each item
- [ ] D.05 — PO status reflects actual receipt state (partial if some items received)
- [ ] D.06 — Soft-deleted items excluded from all counts and sums
- [ ] D.07 — Barcode uniqueness enforced at DB level (no duplicates)
- [ ] D.08 — Supplier number uniqueness enforced at DB level
- [ ] D.09 — tenant_id present on every row in every table
- [ ] D.10 — No orphan records — FK constraints prevent dangling references
- [ ] D.11 — Stock count confirmation — inventory qty matches count result
- [ ] D.12 — Prepaid balance = total_prepaid - total_used (always consistent)
- [ ] D.13 — Box items_count matches actual count of shipment_items
- [ ] D.14 — Return status chain integrity — no skipped states
- [ ] D.15 — Document number uniqueness per tenant per type
- [ ] D.16 — writeLog called for every data mutation (spot check 10 operations)
- [ ] D.17 — Timestamps use UTC consistently (created_at, updated_at)

---

## QA-11: Error Handling (12 tests)

- [ ] H.01 — Supabase connection failure — app shows connection error, doesn't crash
- [ ] H.02 — 401 Unauthorized — redirects to login
- [ ] H.03 — 500 server error — shows Hebrew error message, logs error
- [ ] H.04 — Network timeout — retry option or clear message
- [ ] H.05 — Invalid form submission — field-level validation errors in Hebrew
- [ ] H.06 — File upload failure — clear error, file input reset
- [ ] H.07 — OCR Edge Function timeout — message shown, can retry
- [ ] H.08 — Concurrent edit conflict — last write wins or conflict resolution
- [ ] H.09 — Browser storage full — graceful degradation
- [ ] H.10 — Invalid URL params — page loads with defaults, no crash
- [ ] H.11 — Missing tenant_id in session — redirects to login
- [ ] H.12 — RPC function failure — error caught, user notified

---

## QA-12: Permissions Testing (5 roles × 17 actions)

- [ ] PM.01 — CEO (מנכ"ל) — full access to all modules and actions
- [ ] PM.02 — Manager (מנהל) — full access except system settings
- [ ] PM.03 — Team Lead (ראש צוות) — inventory + PO + receipts, no debt/admin
- [ ] PM.04 — Employee (עובד) — inventory view + reduce, no create/edit PO
- [ ] PM.05 — Viewer (צופה) — read-only on all modules, no write actions
- [ ] PM.06 — Unauthorized action attempt — shows permission denied in Hebrew
- [ ] PM.07 — UI elements hidden for unauthorized roles (buttons, tabs, menu items)
- [ ] PM.08 — Direct URL access to unauthorized page — redirected or blocked
- [ ] PM.09 — API-level enforcement — even if UI bypassed, server rejects
- [ ] PM.10 — Role change takes effect immediately (no stale permissions)
- [ ] PM.11 — inventory.view — table visible
- [ ] PM.12 — inventory.create — add inventory enabled
- [ ] PM.13 — inventory.edit — inline edit enabled
- [ ] PM.14 — inventory.delete — soft delete enabled
- [ ] PM.15 — inventory.reduce — qty reduction enabled
- [ ] PM.16 — shipments.view — box list visible
- [ ] PM.17 — shipments.create — create box enabled
- [ ] PM.18 — shipments.edit — edit during window enabled
- [ ] PM.19 — shipments.lock — manual lock enabled
- [ ] PM.20 — shipments.settings — courier/settings tab visible

---

## QA-13: Multi-Tenancy Testing (11 tests)

- [ ] MT.01 — Two tenants: data completely isolated in all queries
- [ ] MT.02 — RLS policy — tenant A cannot see tenant B data via direct API
- [ ] MT.03 — Insert without tenant_id — rejected by DB constraint
- [ ] MT.04 — Insert with wrong tenant_id — blocked by RLS
- [ ] MT.05 — RPC functions respect tenant context (increment/decrement/etc.)
- [ ] MT.06 — Alert generation scoped to tenant
- [ ] MT.07 — Box number sequence independent per tenant
- [ ] MT.08 — Document number sequence independent per tenant
- [ ] MT.09 — OCR templates scoped to tenant
- [ ] MT.10 — Employee login scoped to tenant
- [ ] MT.11 — Tenant config (shipment settings, AI config) isolated

---

## QA-14: Accessibility (10 tests)

- [ ] A.01 — Keyboard navigation — all interactive elements reachable via Tab
- [ ] A.02 — Focus order logical — follows visual layout (RTL)
- [ ] A.03 — Screen reader labels — buttons and inputs have aria-labels
- [ ] A.04 — Color contrast ratio ≥ 4.5:1 for all text
- [ ] A.05 — Form labels associated with inputs (for/id or aria-labelledby)
- [ ] A.06 — Error messages announced to screen readers (aria-live)
- [ ] A.07 — Images have alt text
- [ ] A.08 — No information conveyed by color alone (icons/text supplement)
- [ ] A.09 — Modal focus trap — Tab stays within open modal
- [ ] A.10 — Skip navigation link — allows jumping past header

---

## QA-15: Documentation Audit (10 checks)

- [ ] DOC.01 — CLAUDE.md — rules match current implementation
- [ ] DOC.02 — SESSION_CONTEXT.md — reflects current state accurately
- [ ] DOC.03 — MODULE_MAP.md — all 82 files documented with line counts
- [ ] DOC.04 — MODULE_MAP.md — all functions in registry
- [ ] DOC.05 — MODULE_MAP.md — all globals listed
- [ ] DOC.06 — MODULE_SPEC.md — business logic descriptions current
- [ ] DOC.07 — db-schema.sql — matches actual Supabase schema (all 45 tables)
- [ ] DOC.08 — CHANGELOG.md — all phases and commits recorded
- [ ] DOC.09 — ROADMAP.md — phase statuses correct (✅/⬜)
- [ ] DOC.10 — PHASE_QA_SPEC_v2.md — test counts match this tracker

---

## Bug Log

| ID | Severity | Category | Description | Status | Fix Commit |
|----|----------|----------|-------------|--------|------------|
| — | — | — | (no bugs found yet) | — | — |

---

## Summary

| Category | Tests | Pass | Fail | Skip |
|----------|-------|------|------|------|
| QA-1 Functional | 182 | 0 | 0 | 0 |
| QA-2 Flows | 9 | 0 | 0 | 0 |
| QA-3 Edge Cases | 35 | 0 | 0 | 0 |
| QA-4 Security | 12 | 0 | 0 | 0 |
| QA-5 Performance | 20 | 0 | 0 | 0 |
| QA-6 Visual/UX | 43 | 0 | 0 | 0 |
| QA-7 Cross-Browser | 8 | 0 | 0 | 0 |
| QA-8 Mobile | 47 | 0 | 0 | 0 |
| QA-9 RTL/Hebrew | 12 | 0 | 0 | 0 |
| QA-10 Data Integrity | 17 | 0 | 0 | 0 |
| QA-11 Error Handling | 12 | 0 | 0 | 0 |
| QA-12 Permissions | 20 | 0 | 0 | 0 |
| QA-13 Multi-Tenancy | 11 | 0 | 0 | 0 |
| QA-14 Accessibility | 10 | 0 | 0 | 0 |
| QA-15 Documentation | 10 | 0 | 0 | 0 |
| **TOTAL** | **448** | **0** | **0** | **0** |
