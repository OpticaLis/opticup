# Changelog — מלאי מסגרות

> כל השינויים במודול מלאי מסגרות מהתחלה ועד היום

---

## Access Sync Fix (2026-03-14)

> Not a numbered phase. Comprehensive fixes and enhancements to the Access sync system (originally Phase 2), done after Phase 5.75.

### CSV Support
- **Commit:** `bc88058` — sync-watcher.js: CSV support (was XLSX only). New parseCSVFile() function, BOM stripping, trailing comma handling
- **Commit:** `0df2699` — access-sales.js + inventory-reduction.js: CSV support for manual browser import

### Security
- **Commit:** `bbc01a9` — sync-watcher.js: tenant_id added to all 4 insert operations (pending_sales, inventory_logs, sync_log x2)
- **Commit:** `1c209c3` — sync-watcher.js: switched to service_role key via OPTICUP_SERVICE_ROLE_KEY env var

### Heartbeat + Status Indicator
- **Commit:** `be376f3` — sync-watcher.js: heartbeat every 60s to watcher_heartbeat table. access-sync.js: watcher status indicator (green/yellow/red dot)

### Pending Panel Redesign
- **Commit:** `082f07b` — pending-panel.js + pending-resolve.js: complete rewrite — table view + detail panel
- **Commit:** `dff070e` — DB: 4 new columns on pending_sales (brand, model, size, color). Watcher + manual import save them. Pending panel shows them
- **Commit:** `9c7a72b` — Fix CHECK constraint error on resolve. Add refresh button. Show product fields in sync detail modal
- **Commit:** `98448e3` — Major restructure: detail modal becomes work center, pending button becomes filter toggle, inline resolve with PIN at entry
- **Commit:** `f869cc3` — Fix pending_sales query: 'filename' column not 'sync_filename'
- **Commit:** `afab388` — New sync_log status 'handled' (orange). Badge counts files not items
- **Commit:** `a53b41b` — Brand/model clickable in detail modal → search in inventory
- **Commit:** `18939ff` — Help button "הסבר לתיקון ידני" in detail modal. start-watcher.bat launcher

### Configurable Watch Directory
- **Commit:** `eed515a` — OPTICUP_WATCH_DIR env var — configurable watch directory

### Reverse Sync (Export New Inventory to Access)
- **Commit:** `f302b0b` — Migrations run: access_exported column on inventory, sync_log source_ref allows 'export'. Batch update in groups of 100. Export logs with 📤 icon
- **Commit:** `e0ffbec` — New file: scripts/sync-export.js. Reverse sync exports new inventory to CSV every 30s. OPTICUP_EXPORT_DIR env var

### Standalone Deployment Package
- **Commit:** `6affea9` — watcher-deploy/ standalone package (8 files): sync-watcher.js, sync-export.js, install-service.js, uninstall-service.js, setup.bat (Hebrew interactive installer), uninstall.bat, package.json, README.txt (Hebrew UTF-8 BOM). Designed to be copied via USB/Dropbox to any Windows machine with Node.js

### DB Changes
- 4 new columns on pending_sales: brand, model, size, color
- 1 new column on inventory: access_exported BOOLEAN DEFAULT false
- Partial index: idx_inventory_access_unexported (tenant_id, access_exported) WHERE access_exported = false AND is_deleted = false
- sync_log status CHECK now includes 'handled'
- sync_log source_ref CHECK now includes 'export'

---

## Phase 5.75 — Communications & Knowledge Infrastructure (2026-03-14)

### 5.75a: Spec + Migration SQL
**Commit:** `dbbe96a`
- PHASE_5.75_SPEC.md added to docs/
- Migration file: phase5_75_communications_knowledge.sql
- 6 new tables: conversations, conversation_participants, messages, knowledge_base, message_reactions, notification_preferences
- 20 custom indexes + 3 UNIQUE constraints
- GIN index on knowledge_base.tags
- RLS tenant isolation + service_bypass on all 6 tables

### 5.75b: Run Migration + Verify
- Migration executed in Supabase SQL Editor — "Success. No rows returned"
- Verification: 6 tables exist, all tenant_id NOT NULL, all RLS enabled, 29 indexes (20 custom + 6 PK + 3 UNIQUE), 12 policies (2 per table)

### 5.75c: Backup + Documentation Update
- Backup to M1F5.75_2026-03-14/
- Updated: ROADMAP.md, db-schema.sql, MODULE_SPEC.md, CHANGELOG.md, SESSION_CONTEXT.md, MODULE_MAP.md, CLAUDE.md
- Zero-UI phase — no JS files added

---

## Phase 5.5 — Stability, Scale & Batch Operations (2026-03-13)

### 5.5a-1: SQL Migrations — Atomic RPCs + Schema Additions
**Commit:** `dbaa77d`
- 2 new RPC functions: `next_internal_doc_number(p_tenant_id UUID)` and `update_ocr_template_stats(p_template_id UUID, p_corrections JSONB, p_extracted_data JSONB)`
- 3 new columns on supplier_documents: `file_hash TEXT`, `batch_id TEXT`, `is_historical BOOLEAN DEFAULT false`
- 3 new indexes: idx_sup_docs_file_hash, idx_sup_docs_batch, idx_sup_docs_historical
- Migrations: phase5_5a_atomic_rpcs.sql, phase5_5b_schema_additions.sql

### 5.5a-2: batchWriteLog + FIELD_MAP
**Commits:** `d4acf1f`, `8242e1a`
- `batchWriteLog(logs)` in supabase-ops.js — batch insert multiple log entries
- FIELD_MAP updated with Hebrew translations for file_hash (גיבוב קובץ), batch_id (מזהה קבוצה), is_historical (מסמך היסטורי)

### 5.5b: RPCs Applied in JS
**Commit:** `235e42b`
- `generateDocInternalNumber()` in debt-documents.js rewritten to use `next_internal_doc_number` RPC (atomic, race-condition-safe)
- `updateOCRTemplate()` in supabase-ops.js rewritten to use `update_ocr_template_stats` RPC (atomic accuracy calculation)
- receipt-debt.js `createDocumentFromReceipt()` uses `next_internal_doc_number` RPC

### 5.5c: pg_cron Daily Alert Generation
**Commit:** `0168846`
- pg_cron job `daily-alert-generation` scheduled at 05:00 UTC
- Calls `generate_daily_alerts()` with fault isolation: each alert type (payment_due, payment_overdue, prepaid_low) wrapped in BEGIN/EXCEPTION blocks
- Migration: phase5_5c_pgcron_alerts.sql

### 5.5d: Stability Fixes
**Commit:** `5aecfad`
- Weekly report: snapshot cache with tenant_id fix
- alerts-badge.js: try/catch wrappers around all async operations
- `validateOCRData(extractedData)` — 7 business rules: required fields, date validation, amount consistency, supplier match, document type, currency format, duplicate document number
- `createAlert()` skips historical documents (checks `is_historical` flag)
- CLAUDE.md: corrected alerts table description

### 5.5e: UX Fixes
**Commit:** `9284538`
- Remove file button added to receipt form (clear attached file without reload)
- AI info modal for OCR scanning in goods receipt (explains what the AI does)

### 5.5f: Advanced Document Filtering
**Commit:** `c119c6b`
- Created modules/suppliers-debt/debt-doc-filters.js (242 lines)
- Replaces simple filter bar from debt-documents.js
- 8 filter criteria: status, document type, supplier (searchable), date range (from/to), amount range (from/to), source (historical/current)
- Saved filter favorites via localStorage (max 5 per tenant)
- Collapsible filter panel with count display
- Right-click to delete saved favorites

### 5.5g: Batch Document Upload
**Commit:** `e8535b6`
- Created modules/suppliers-debt/ai-batch-upload.js (332 lines)
- Drag-and-drop upload modal with file preview
- SHA-256 file hash dedup: checks within batch + against DB (file_hash column)
- Two modes: upload-only (creates draft documents) or upload+OCR (chains to batch OCR)
- Progress bar, per-file status icons, cleanup on close/beforeunload
- Max 50 files per batch, validates type (PDF/JPG/PNG) and size (10MB)
- Monkey-patches renderDocFilterBar to inject toolbar button

### 5.5h-1: Batch OCR with Pipelining
**Commit:** `9969ff4`
- Created modules/suppliers-debt/ai-batch-ocr.js (297 lines)
- Sequential OCR processing via `window._startBatchOCR(batchId, docIds)`
- Pause/resume queue, retry failed documents, retry single document
- Review individual docs via existing showOCRReview modal
- Auto-approve valid documents (above confidence threshold from ai_agent_config)
- Summary modal showing total/success/failed and average confidence
- validateOCRData integration for error flagging

### 5.5h-2: Historical Document Import
**Commit:** `bbef876`
- Created modules/suppliers-debt/ai-historical-import.js (330 lines)
- Import old/historical documents for AI learning without inventory impact
- Documents marked `is_historical=true` — no alerts generated, no inventory changes
- Default status selection: paid (default), open, or per-document
- Chains to batch OCR after upload for AI template learning
- Learning summary modal: per-supplier scan count, confidence, template accuracy
- Monkey-patches renderDocFilterBar to inject toolbar button

### 5.5i: Documentation & Backup
**Commits:** `d1f0511` (backup), current (docs)
- Backup to M1F5.5_2026-03-13/
- All documentation files updated

---

## Phase 5 — AI Agent for Supplier Management (2026-03-13)

### 5a: DB Tables — 5 New Tables
**Commit:** `d82fb25`
- Created 5 new tables: ai_agent_config, supplier_ocr_templates, ocr_extractions, alerts, weekly_reports
- RLS + tenant isolation on all 5 tables (tenant_isolation + service_bypass policies)
- 9 indexes (tenant_id composites on all tables)
- Seed data: ai_agent_config row for Prizma tenant with default settings
- T constants added to shared.js: AI_CONFIG, OCR_TEMPLATES, OCR_EXTRACTIONS, ALERTS, WEEKLY_REPORTS
- Migration: phase5a_ai_agent_tables.sql

### 5b: Edge Function — OCR Extract
**Commit:** `70124b4`
- Created supabase/functions/ocr-extract/index.ts (349 lines)
- Claude Vision API integration using claude-sonnet-4-20250514
- JWT validation via Supabase auth
- File fetch from Supabase Storage (supplier-docs bucket)
- Supplier fuzzy matching (name similarity)
- PO matching by supplier + status
- Template hints integration (from supplier_ocr_templates)
- Full error handling: 404 (file not found), 429 (rate limit), 504 (timeout), 422 (validation)
- Deployed to Supabase Edge Functions

### 5c: OCR Review Screen
**Commit:** `bcf627a`
- Created modules/suppliers-debt/ai-ocr.js (317 lines, later 342 after 5e)
- Side-by-side review modal: extracted fields on left, document preview on right
- Confidence indicators per field (green ≥0.9, yellow ≥0.7, red <0.7)
- Correction tracking: records diff between AI extraction and user corrections
- Creates supplier_document on confirm with all extracted fields
- Integrated into suppliers-debt.html as "סריקת חשבונית" button

### 5d: OCR in Goods Receipt
**Commit:** `f66a37b`
- Created modules/goods-receipts/receipt-ocr.js (297 lines)
- "סרוק עם AI" button in receipt form (visible only when file attached)
- Auto-fills: supplier selection, document type/number/date, receipt items
- Inventory matching by model ILIKE query
- Confidence banner showing match count and overall confidence
- Non-blocking: user can modify all auto-filled fields

### 5e: Learning System
**Commit:** `1024ef2`
- updateOCRTemplate() in supabase-ops.js: creates/updates supplier_ocr_templates
- buildHintsFromCorrections(): generates field hints from correction history
- Templates created on first scan per supplier+document_type, updated on subsequent scans
- Accuracy rate tracking: (total_scans - corrections) / total_scans per template
- Stats display in OCR review modal (scan count, accuracy %, last scan date)
- Patches receipt-confirm.js for learning trigger on goods receipt OCR confirm

### 5f-1: Alerts Badge + Daily Alert SQL
**Commit:** `ab2be62`
- Created js/alerts-badge.js (323 lines)
- Bell icon (🔔) with unread count badge on all 4 HTML pages
- Dropdown panel showing last 10 alerts with type icons
- Action buttons: view document, dismiss, mark as read
- Hebrew time-ago display (לפני X דקות/שעות/ימים)
- Created generate_daily_alerts SQL RPC function (phase5f_alert_generation.sql)
- 3 daily alert types: payment_due (7 days), payment_overdue, prepaid_low (<20% remaining)
- Idempotent: skips if alert already exists for same source

### 5f-2: Event-Driven Alerts
**Commit:** `3ba3d9d`
- Created modules/suppliers-debt/ai-alerts.js (219 lines)
- 4 event alert types: price_anomaly (>10% change), duplicate_document, amount_mismatch (receipt vs PO), ocr_low_confidence (<70%)
- Auto-dismiss: payment alerts dismissed when payment saved, OCR alerts dismissed when extraction accepted
- Duplicate document check before save in debt-documents.js
- Non-breaking monkey-patches: wraps existing functions without modifying originals
- All alerts include metadata JSON for drill-down

### 5g: Weekly Report
**Commit:** `6176385`
- Created modules/suppliers-debt/ai-weekly-report.js (274 lines)
- New "דוח שבועי" tab added to suppliers-debt.html
- 4 report sections: debt summary, upcoming payments, prepaid deals status, OCR statistics
- Week navigation (prev/next week buttons)
- PDF export via html2canvas + jsPDF (loaded from CDN)
- Data snapshot saved to weekly_reports table (JSONB)
- Auto-generates report on tab load if not exists for current week

### 5h: AI Config Screen
**Commits:** `dfce880`, `b9c1ab0`
- Created modules/suppliers-debt/ai-config.js (223 lines)
- Settings modal accessible to CEO/Manager only (permission check)
- 3 config sections: OCR settings, Alerts settings, Weekly Report settings
- Confidence threshold slider (50%-100%)
- Toggle switches for alert types and auto-generation
- Usage statistics display (total scans, templates, alerts, reports)
- Emoji rendering fix: replaced surrogate pair emojis with simple text in modal headings

---

## Phase 4 — Supplier Debt Tracking & Enhanced Goods Receipt (2026-03-13)

### 4a: DB Schema — 11 New Tables
**Commit:** `1c4b2b9`
- Created 11 new tables: document_types, payment_methods, currencies, supplier_documents, document_links, supplier_payments, payment_allocations, prepaid_deals, prepaid_checks, supplier_returns, supplier_return_items
- Added 5 columns to suppliers: default_document_type, default_currency, payment_terms_days, has_prepaid_deal
- All tables with tenant_id UUID NOT NULL, RLS tenant isolation, service_bypass
- Indexes on tenant_id + composite indexes (tenant+supplier, tenant+status, tenant+due_date)
- Seed data: 4 document_types, 4 payment_methods, 3 currencies (ILS, USD, EUR)
- T constants added to shared.js: DOC_TYPES, SUP_DOCS, SUP_PAYMENTS, DOC_LINKS, PAY_ALLOC, PAY_METHODS, PREPAID_DEALS, PREPAID_CHECKS, SUP_RETURNS, SUP_RETURN_ITEMS

### 4a+: Patch — Withholding Tax, Internal Numbering, Duplicate Prevention
**Commit:** `384a3bf`
- Added withholding_tax_rate, withholding_tax_amount, net_amount to supplier_payments
- Added status (approved/pending/rejected), approved_by, approved_at to supplier_payments
- Added internal_number to supplier_documents with partial unique index
- Added UNIQUE constraint on (tenant_id, supplier_id, document_number)
- Added withholding_tax_rate, tax_exempt_certificate, tax_exempt_until to suppliers

### 4b-1: Split receipt-actions.js
**Commit:** `013a79c`
- Extracted receipt-confirm.js from receipt-actions.js (confirmReceipt, confirmReceiptCore, confirmReceiptById, createNewInventoryFromReceiptItem)
- Zero logic changes — pure structural split

### 4b-2: Auto-Create Supplier Documents on Receipt Confirm
**Commit:** `56b1097`
- Created receipt-debt.js with createDocumentFromReceipt()
- Auto-creates supplier_documents record when goods receipt is confirmed
- Calculates subtotal/VAT/total from item costs
- Generates DOC-NNNN internal number
- Uses supplier's default_document_type and payment_terms_days

### 4b-3: Mandatory Barcodes + Employee Guide
**Commit:** `1ff908f`
- Barcode now mandatory on new receipt items (pre-assigned via generateNextBarcode)
- showReceiptGuide() — modal overlay with quick-reference employee guide (RECEIPT_GUIDE_TEXT constant)
- ℹ️ info button in receipt form header

### 4c: Debt Dashboard Skeleton
**Commit:** `daff9ce`
- Created suppliers-debt.html — standalone page with 4 tabs (suppliers, documents, payments, prepaid)
- Created modules/suppliers-debt/ folder
- Created debt-dashboard.js — loadDebtSummary() with 4 summary cards (total debt, due this week, overdue, paid this month)
- Added debt module card to index.html MODULES array
- formatILS() utility added to shared.js

### 4d: Documents Tab
**Commit:** `54a6ab4`
- Created debt-documents.js (300 lines) — loadDocumentsTab, CRUD with PIN verification
- Created debt-doc-link.js (72 lines) — delivery note → invoice linking
- Filter bar: supplier, type, status, date range, overdue checkbox
- openNewDocumentModal with auto-calc VAT
- generateDocInternalNumber (DOC-NNNN sequential)
- Status badge rendering (DOC_STATUS_MAP)

### 4e: Payments Tab
**Commit:** `6ea1124`
- Created debt-payments.js (168 lines) — loadPaymentsTab, filters, payment detail modal
- Created debt-payment-wizard.js (146 lines) — steps 1-2: supplier selection with debt summary, payment details with auto-calc withholding tax
- Created debt-payment-alloc.js (254 lines) — steps 3-4: FIFO document allocation, PIN confirmation, save payment + allocations + update document paid_amount/status
- T.PAY_ALLOC + T.PAY_METHODS added to shared.js

### 4f: Prepaid Deals Tab
**Commit:** `edad755`
- Created debt-prepaid.js (285 lines) — deal CRUD, check management, progress bars, status badges
- Auto-deduction from active prepaid deal on receipt confirmation (added to receipt-debt.js)
- Deal status transitions: active → completed/cancelled
- Check status transitions: pending → cashed/bounced

### 4g: Suppliers Table + Detail View
**Commit:** `7516714`
- Created debt-supplier-detail.js (~328 lines) — slide-in panel with supplier summary + 4 sub-tabs
- Extended debt-dashboard.js with loadSuppliersTab + renderSuppliersTable + openPaymentForSupplier
- Suppliers table: aggregated open docs, total debt, overdue, next due date, prepaid deal info
- Timeline tab: merged docs + payments sorted by date with icons
- Sub-tabs: timeline (default), documents, payments, returns

### 4h: Supplier Returns
**Commit:** `d9e2f4e`
- Created debt-returns.js (~230 lines) — loadReturnsForSupplier, renderReturnsTable, viewReturnDetail, status management
- Created inventory-return.js (~185 lines) — openSupplierReturnModal (validates selection, same-supplier check), _doConfirmSupplierReturn (PIN, creates return + items, decrements inventory)
- generateReturnNumber: RET-{supplier_number}-{seq 4-digit}
- "זיכוי לספק" button in inventory bulk operations bar
- Return statuses: pending → ready_to_ship → shipped → received_by_supplier → credited

### 4i: Documentation Update
**Commit:** `96c4886`
- Backup to M1F4_2026-03-13/
- ROADMAP.md: Phase 4 ⬜ → ✅
- SESSION_CONTEXT.md: full update with all commits
- CHANGELOG.md: this section
- MODULE_SPEC.md: overwritten with Phase 4 current state
- MODULE_MAP.md: verified (updated incrementally during 4a-4h)
- db-schema.sql: verified (updated during 4a/4a+)
- CLAUDE.md: updated T constants + file structure

### Phase 4 QA Fixes + File Upload
**Commit:** `043f3ec`
- **batchUpdate RLS violation (CRITICAL)** — replaced .upsert() with individual .update().eq('id') calls + tenant_id
- **inventory-return.js 'in' filter (CRITICAL)** — fixed fetchAll filter from parenthesized string to array; same fix in debt-returns.js
- **Payment wizard rollback (CRITICAL)** — _wizSavePayment rolls back (deletes payment + allocations) if document update fails
- **supplierNumCache fallback (CRITICAL)** — generateReturnNumber fetches supplier_number from DB when cache empty
- **Document filter missing "cancelled" (minor)** — added "מבוטל" option
- **cost_price formatting (minor)** — wrapped with formatILS() in inventory-return.js
- **file-upload.js (NEW)** — uploadSupplierFile, getSupplierFileUrl, renderFilePreview, pickAndUploadFile
- Receipt form: "צרף מסמך" button, _pendingReceiptFile, warning if no file before confirm
- receipt-debt.js: uploads file after creating supplier document
- Documents tab: viewDocument modal with file preview + 📎 attach/replace button

### Phase 4 — Auto-Update cost_price + PO Price Comparison
**Commit:** `6ab6cfe`
- receipt-confirm.js: confirmReceiptCore auto-updates inventory cost_price from receipt item unit_cost via batchUpdate + writeLog('cost_update')
- checkPoPriceDiscrepancies() — new function: fetches PO items, matches by brand+model+size+color, flags >5% price differences, shows Hebrew warning dialog, adds price_discrepancy note to supplier_documents. Non-blocking.

### Phase 4 — Aging Report on Debt Dashboard
**Commit:** `25cb50c`
- debt-dashboard.js: loadAgingReport(docs) — 5 aging buckets (שוטף, 1-30, 31-60, 61-90, 90+ days) by due_date. Colored bars proportional to total. No extra DB queries — reuses loadDebtSummary data.
- suppliers-debt.html: aging section between summary cards and tabs, responsive flex layout with color-coded bars (green → red)

---

## Phase 3.8 — Sticky Header (2026-03-12)

- Created css/header.css (98 lines) — sticky header: 60px, z-index 1000, RTL, 3-zone layout (logo+store | app name | employee+logout), responsive below 600px
- Created js/header.js (58 lines) — initHeader() fetches tenant name/logo from DB, buildHeader() injects header as first child of body, uses escapeHtml() for all dynamic values, logout wired to clearSession()
- Updated index.html — added header.css link + header.js script tag
- Updated inventory.html — added header.css link + header.js script tag
- Updated employees.html — added header.css link + header.js script tag
- Fallback SVG glasses icon when tenant logo_url is null
- No DB changes — reads from existing tenants table (Phase 3.75)
- E2E tested: login → header on all 3 screens → logout → no header pre-login, zero console errors

---

## Phase 3.75 — Multi-Tenancy Foundation (March 2026)

- Created tenants table + seeded Prizma as tenant #1
- Added tenant_id UUID NOT NULL to 20 tables, backfilled 13,457 rows
- Added 25 indexes (single + composite)
- Deployed pin-auth Edge Function (PIN → JWT with tenant_id claim)
- Updated auth flow: sb client uses JWT Bearer token after login
- Added tenant_id to all writes (15 direct + 3 helpers)
- Added tenant_id filter to all reads (~60 direct selects)
- JWT-based RLS tenant isolation active on all 20 tables
- Added getTenantId(), verifyPinOnly() to shared/auth modules

---

## v3.5 — Phase 3.5: מסך בית + דפים עצמאיים (מרץ 2026)

- phase 3.5: rename index.html → inventory.html
- phase 3.5: clearSession redirects to index.html
- phase 3.5: add home screen index.html with module cards
- phase 3.5: add employees.html standalone page
- phase 3.5: employees card links to employees.html
- fix: homeBtn nav link width and text color
- phase 3.5: remove employees tab from inventory.html
- phase 3.5: redesign logout button with יציאה label (inventory.html + employees.html)
- phase 3.5: showUserButton sets employee name in adminBtnName span
- phase 3.5: permission-based lock on module cards in index.html
- docs: add SaaS/multi-tenant rules to CLAUDE.md
- docs: update SESSION_CONTEXT and ROADMAP
- style: add global logout-btn class to styles.css
- style: move logout button to header, home link always visible in nav (inventory.html + employees.html)

---

## v3.0 — Phase 3: Auth & Permissions

Date: March 2026

Commits: e0d7a28, 31b2bac, 450d5b5, 0c34bd5, 6b74bc4, b21067c, 2706d4d, c850392, cd8dd04, 908111a, 98ff6c7, 8c4d4d7, 3b167ee, 253f0f2, a21145f

### DB (migration 016)
- New tables: roles (5 system roles: ceo, manager, team_lead, worker, viewer)
- New tables: permissions (35 granular permissions across 9 modules)
- New tables: role_permissions (94 default role→permission mappings)
- New tables: employee_roles, auth_sessions (token-based, 8h expiry)
- ALTER employees: added email, phone, branch_id, created_by, last_login, failed_attempts, locked_until
- RLS: added INSERT/UPDATE/DELETE policies on employees table
- pin_length CHECK constraint added but commented out (pre-production TODO)
- Added purchase_order.view permission (was missing, caused PO tab to be hidden)

### New Files
- js/auth-service.js — 287 lines, 14 functions: full auth engine
- modules/employees/employee-list.js — 283 lines, 8 functions: employee CRUD + permission matrix

### Features
- Login screen: 5-box PIN modal, fullscreen overlay, session restore on reload
- Session management: token-based, 8h expiry, permission snapshot in sessionStorage
- PIN lockout: 5 failed attempts → sessionStorage lock + server-side locked_until (15min)
- Role-based access: 5 roles with 35 granular permissions across 9 modules
- UI guards: 10 nav tabs + 21 action buttons gated by data-permission attributes
- Employee management screen: add/edit/deactivate, role assignment, permission matrix
- User display button: shows logged-in employee name + logout on click
- Dev bypass: ?dev_bypass=opticup2024 (TODO: remove before production)

### Refactoring
- 8 legacy PIN call sites replaced with verifyEmployeePIN()
- admin.js: removed toggleAdmin(), checkAdmin() — replaced with hasPermission('settings.edit')
- writeLog(): auto-populates employee_id from getCurrentEmployee()
- loadData(): session guard added (returns early if no active session)
- stock-count-session.js: skips PIN modal if active session exists
- empSummaryCard: renamed from summaryCard to avoid global name collision with access-sync.js

### QA
- 32 E2E tests run across all 5 roles
- 29/32 passed on first run
- 3 bugs found and fixed: purchase_order.view missing, summary cards "undefined", PIN lockout client-side only

### Deferred to Future Features
- impersonateUser, previewUIAsRole, generatePermissionSnapshot
- writePermissionLog, validateActionIntegrity
- Rate limiting, multi-branch roles, custom permission groups
- Supabase Auth, configurable session timeout

---

## [Phase 2b] — 2026-03-11

### Added
- scripts/sync-watcher.js — InventorySync Folder Watcher (chokidar, idempotency guards, 30s debounce)
- modules/access-sync/sync-details.js — sync details modal, failed file download via Supabase Storage
- Supabase Storage bucket: failed-sync-files
- migrations/015 — storage_path + errors columns on sync_log

### Changed
- modules/access-sync/access-sync.js — full sync screen with summary cards, log table, action buttons
- scripts/sync-watcher.js — uploads failed files to Supabase Storage

## [Phase 2 fixes] — 2026-03-11

### Fixed
- Stock count: PIN verified before count created in DB
- Stock count: unscanned items now appear in diff report as "לא נספר"
- Stock count: unified smart search field (brand/model/color/barcode)
- Sync watcher: idempotency guards prevent duplicate DB rows
- Sync watcher: 30-second cooldown prevents duplicate file processing

---

## [Phase 2a] — 2026-03-11

### Added
- modules/stock-count/stock-count-list.js — list screen, summary cards, generateCountNumber (SC-YYYY-NNNN), startNewCount
- modules/stock-count/stock-count-session.js — worker PIN entry, camera scanning (ZXing), handleScan, updateCountItem
- modules/stock-count/stock-count-report.js — diff report, confirmCount (manager PIN + RPC + writeLog), cancelCount, exportCountExcel
- migrations/013_stock_count.sql — stock_counts + stock_count_items tables
- migrations/014_stock_count_scanned_by.sql — added scanned_by column to stock_count_items
- Supabase RPC: set_inventory_qty(inv_id, new_qty)

### Changed
- index.html — added 📊 ספירת מלאי tab + ZXing library
- js/shared.js — added T.STOCK_COUNTS, T.STOCK_COUNT_ITEMS

---

## [Goal 0] — 2026-03-10

### Changed
- `receipt-actions.js` — `confirmReceiptCore()`: atomic increment via RPC
- `qty-modal.js` — `confirmQtyChange()`: atomic increment/decrement via RPC
- `pending-resolve.js` — `confirmResolvePending()`: atomic increment/decrement via RPC
- `inventory-reduction.js` — `processRedExcel()`: atomic decrement via RPC
- `inventory-reduction.js` — `confirmReduction()`: atomic decrement via RPC

### Added
- `migrations/012_atomic_qty_rpc.sql` — `increment_inventory` + `decrement_inventory` RPC functions

---

## Phase 1: Airtable Era (V1.1A → V1.6A)

### V1.3A — Initial Release
**Commit:** `e6a68b8` | 2026-03-08 08:36
- **Initial commit** — Prizma Optics inventory system V1.3A
- Single-file HTML app connected to Airtable
- 6 tabs: הכנסת מלאי, הורדת מלאי, הזמנת רכש, מלאי ראשי, ניהול מותגים, ניהול ספקים
- Hebrew RTL, dark blue + white + gray theme
- Admin mode with password 1234
- API token stored in code

### V1.4A — Bulk Operations
**Commit:** `37102fc` | 2026-03-08 10:00
- Inventory table: bulk operations (select multiple → bulk update/delete)
- Cleaner columns layout
- Test data integration (1,189 items from Excel)

### V1.5A — Token Security
**Commit:** `4fe4f0c` | 2026-03-08 10:43
- API token moved from code to localStorage
- Token entry modal on first use
- Logout button added

### V1.6A — Sync & Sorting
**Commit:** `f40bb03` | 2026-03-08 11:05
- Sync field editing (website_sync dropdown)
- Image preview modal
- Column sorting (click header → asc/desc/none)
- Sync validation logic

---

## Phase 2: Supabase Migration (V1.7A)

### V1.7A — Backend Migration
**Commit:** `ca6e023` | 2026-03-08 15:20
- **Complete migration from Airtable to Supabase**
- PostgreSQL schema with proper types, FKs, constraints
- Compatibility layer: rowToRecord/fieldsToRow/fetchAll/batchCreate
- Hebrew↔English field mapping (FIELD_MAP)
- Enum mapping (ENUM_MAP) for product_type, status, website_sync, brand_type
- Supplier/brand lookup caches (name↔UUID)
- 1,189 records migrated via upload script

---

## Phase 3: Barcode System

### Unique Barcode Validation
**Commit:** `a7cf013` | 2026-03-08 19:09
- UNIQUE constraint on barcode (WHERE NOT NULL)
- Duplicate detection: within batch + against DB

### Barcode Format BBDDDDD
**Commit:** `e5d9037` | 2026-03-08 19:19
- New format: 2-digit branch code + 5-digit sequence
- `loadMaxBarcode()` — scans all barcodes in branch prefix
- Reuse barcode for duplicate items (same brand+model+size+color)
- Max 99,999 items per branch

---

## Phase 4: Excel & Export

### Export to Excel
**Commit:** `c1e0621` | 2026-03-08 19:22
- `exportInventoryExcel()` — filtered inventory to .xlsx
- Hebrew column headers
- SheetJS (xlsx) library

### Excel Bulk Import
**Commit:** `ceab6ac` | 2026-03-08 19:30
- `handleExcelImport()` — parse Excel with column name normalization
- Hebrew/English column aliases
- Required field validation
- Preview table with stats and error display
- `confirmExcelImport()` — batch create with writeLog

### Mobile Responsive
**Commit:** `ec9fd53` | 2026-03-08 19:37
- Nav bar horizontal scroll on mobile
- Tables responsive with horizontal scroll
- Forms stack vertically on small screens

### Inventory Module v1.0
**Commit:** `9c9f45e` | 2026-03-08 19:40
- Module milestone marker

---

## Phase 5: Audit & Logs Module

### pg_trgm + Brand Exclusion
**Commit:** `1b1381f` | 2026-03-08 20:14
- `CREATE EXTENSION pg_trgm` for fuzzy text search
- GIN indexes on model and color columns
- `exclude_website` field added to brands table

### Schema: Logs + Employees + Soft Delete
**Commit:** `188aea1` | 2026-03-08 20:26
- `employees` table with PIN authentication
- `inventory_logs` table — 15 action types, qty/price before/after tracking
- Soft delete columns on inventory (is_deleted, deleted_at/by/reason)
- Migration file: `002_logs_and_soft_delete.sql`
- Default admin employee: מנהל ראשי, PIN 1234

### writeLog Engine + Action Hooks
**Commit:** `65489f9` | 2026-03-08 20:31
- `writeLog(action, inventoryId, details)` function
- ACTION_MAP constant — 16 action types with icon/label/color
- Integrated into: submitEntry (entry_manual), submitFromPO (entry_po), confirmExcelImport (entry_excel), saveInventoryChanges (edit_*), markSold (sale)
- Non-blocking async — never blocks main operations

### Soft Delete with PIN + Recycle Bin
**Commit:** `d8ce2f8` | 2026-03-08 20:41
- `confirmSoftDelete()` — PIN verification, is_deleted=true, log
- `openRecycleBin()` — view deleted items
- `restoreItem()` — restore with log
- `permanentDelete()` — double PIN, DELETE + log
- Deleted items filtered out of main inventory view

### Item History Modal
**Commit:** `bf46750` | 2026-03-08 20:48
- 📋 button per inventory row
- `openItemHistory()` — colored timeline of all actions
- `exportHistoryExcel()` — export to Excel
- Color-coded by action category (green/red/blue/gray/amber)

### System Log Screen
**Commit:** `46e4107` | 2026-03-08 21:04
- Admin-only tab "📋 לוג מערכת"
- 4 summary cards (active count, entries/deletions/edits this week)
- 6 filters: date range, branch, action, employee, free text
- Paginated table (50 rows/page)
- Color-coded rows by category
- `exportSystemLog()` — Excel export with filters

### Audit & Logs v1.0
**Commit:** `39595f3` | 2026-03-08 21:18
- Full smoke test passed (7 tests)
- writeLog, soft delete, recycle bin, item history, system log all verified
- RLS policies added: DELETE + UPDATE on inventory_logs
- Migration file updated with new policies

---

## Phase 6: Quantity Control

### Add/Remove Quantity with PIN
**Commit:** `0649848` | 2026-03-08 21:35
- Quantity cell made readonly — no direct edit allowed
- ➕➖ buttons (admin-only) with modal
- `openQtyModal(inventoryId, mode)` — add/remove with reason dropdown
- `confirmQtyChange()` — PIN verification, over-remove protection
- writeLog('edit_qty') for every quantity change
- Stripped כמות from saveInventoryChanges() — enforces ➕➖ only
- writeLog added to Red Excel sales path (processRedExcel)

---

## Phase 7: Goods Receipt

### Goods Receipt Module
**Commit:** `eab834d` | 2026-03-08 22:25
- DB: `goods_receipts` + `goods_receipt_items` tables with RLS
- Migration: `003_goods_receipts.sql`
- New tab "📦 קבלת סחורה" (visible to all)
- 2-step flow: receipt list → receipt form
- Receipt types: תעודת משלוח, חשבונית, חשבונית מס
- Barcode search → existing item auto-fill
- Manual add → new item with generated barcode
- Excel import for receipt items
- `confirmReceipt()` — full flow: save → process items → update inventory → writeLog('entry_receipt')
- Draft/Confirmed/Cancelled status management
- View-only mode for confirmed/cancelled
- Summary cards: drafts, confirmed this week, items received
- ACTION_MAP: added `entry_receipt` (17th action type)
- SLOG_ROW_CATEGORIES: added entry_receipt → 'entry' category

---

## Phase 8: Architecture — Modularize + DB Prep

### Module v1.0 Docs Archive
**Commit:** `50d49de` | 2026-03-08
- Archived Module 1 — Inventory Management docs (SPEC, CHANGELOG, schema, guide)

### Snapshot v1.0 + Cleanup
**Commit:** `a0aa965` | 2026-03-09
- Snapshot of monolith before split
- Archived legacy scripts/data/schema to subdirs

### Repo Cleanup
**Commit:** `d832a68` | 2026-03-09
- Moved legacy scripts, data files, and schema files to organized subdirs

### Extract CSS
**Commit:** `a8e9bbc` | 2026-03-09
- All styles extracted from index.html to `css/styles.css`

### Split into 7 JS Modules
**Commit:** `bf7a3a8` | 2026-03-09
- Monolith index.html split into 7 JS files:
  - `js/shared.js` — Supabase init, constants, caches, utilities
  - `js/inventory-core.js` — inventory reduction + main table
  - `js/inventory-entry.js` — entry forms (manual + Excel)
  - `js/goods-receipt.js` — goods receipt + system log
  - `js/audit-log.js` — soft delete, recycle bin, history, qty modal
  - `js/brands-suppliers.js` — brands + suppliers management
  - `js/admin.js` — admin mode + app init
- index.html now just HTML shell + script tags

### DB Prep — min_stock_qty + Remove contact_lenses
**Commit:** `62542d4` | 2026-03-09
- Migration: `brands.min_stock_qty` integer column added
- Removed contact_lenses product type references

### Brands — min_stock_qty Inline Editing
**Commit:** `c26be57` | 2026-03-09
- `saveBrandField()` — immediate save on min_stock_qty input change
- Placeholder shows default threshold by brand type (יוקרה=5, מותג=15)

---

## Phase 9: Purchase Orders Module

### DB Schema for Purchase Orders
**Commit:** `6c39f2c` | 2026-03-09
- `purchase_orders` table (po_number, supplier_id, status, notes, etc.)
- `purchase_order_items` table (po_id, brand_id, model, size, color, quantity, cost_price, etc.)
- `po_id` FK added to goods_receipts for PO→receipt linkage
- Migration: `005_purchase_orders.sql`

### PO List View + Summary Cards
**Commit:** `e4763dd` | 2026-03-09
- New tab "הזמנות רכש" with summary cards (draft/sent/received counts)
- Filterable PO list by status + supplier
- Color-coded status badges

### PO Form — Create/Edit Draft with Items
**Commit:** `2750ab3` | 2026-03-09
- PO creation and editing form
- Item rows with brand, model, size, color, quantity, cost price
- Draft save functionality

### Fix: po_number Field Name
**Commits:** `d647715`, `41f5000` | 2026-03-09
- Renamed order_number → po_number in FIELD_MAP and legacy PO entry flow

### PO Status Management
**Commit:** `0087908` | 2026-03-09
- `sendPurchaseOrder()` — marks PO as sent
- `cancelPO()` — cancels PO
- `openViewPO()` — read-only view for sent/received POs
- `openEditPO()` — edit mode for drafts

### CLAUDE.md Project Guide
**Commit:** `6c13809` | 2026-03-09
- Added initial CLAUDE.md with project structure, rules, and conventions

### Remove Legacy PO Tab
**Commit:** `dad9ec6` | 2026-03-09
- Removed old "הזמנת רכש" tab and all legacy PO functions
- Replaced with new purchase-orders.js module

### Refactor: Goods Receipt into Entry Tab
**Commit:** `90a467f` | 2026-03-09
- Moved קבלת סחורה from standalone tab into הכנסת מלאי as third entry mode
- Entry tab now has 3 modes: manual, Excel import, goods receipt

---

## Phase 10: Inventory Reduction Improvements

### Fix: Entry Audit Issues
**Commit:** `3574460` | 2026-03-09
- Fixed status handling in entry flow
- Fixed barcode generation edge cases
- Cleaned dead code

### Reduction — Model Dropdown + PIN + Reasons + writeLog
**Commit:** `dd1b585` | 2026-03-09
- `loadModelsForBrand()` — brand-based model datalist
- `openReductionModal()` / `confirmReduction()` — replaces old markSold()
- REDUCE_REASONS: נמכר, נשבר, לא נמצא, נשלח לזיכוי, הועבר לסניף אחר
- PIN verification via employees table
- writeLog('sale') with reason tracking

### Reduction — Cascading Size + Color Dropdowns
**Commit:** `e046dd0` | 2026-03-09
- `loadSizesAndColors(brandName, model)` — populates size/color datalists
- Full cascading chain: brand → model → size + color

---

## Phase 11: Excel Import + Entry History

### Excel Import — Barcode-First Flow
**Commit:** `6488c8f` | 2026-03-09
- Barcode matching: existing items get qty increment, new items go to pending list
- `generatePendingBarcodes()` / `exportPendingBarcodes()` — barcode generation for new items
- `showExcelResultsModal()` — results summary with stats

### Help Modal
**Commit:** `98efebe` | 2026-03-09
- `openHelpModal()` / `closeHelpModal()` — operating instructions modal
- Help button in nav bar

### Entry History Modal
**Commit:** `1655338` | 2026-03-09
- `openEntryHistory()` — browse entries grouped by date (accordion)
- `renderEntryHistory()` — timeline view per date group
- `toggleHistGroup(date)` — expand/collapse date groups
- `exportDateGroupBarcodes(date)` — export barcodes for a specific date

---

## Phase 12: PO Enhancements

### Bug Fixes — PO + Entry History
**Commit:** `847f1bc` | 2026-03-09
- `loadPOsForSupplier()` guard for missing supplier_id
- Entry history accordion UI fixes

### PO Form — Two-Step Wizard + Brand Datalist
**Commit:** `51a7486` | 2026-03-09
- Two-step wizard: step 1 = select supplier, step 2 = generate PO# + edit items
- `proceedToPOItems()` bridges the two steps
- `ensurePOBrandDatalist()` — brand datalist for PO items
- Fixed duplicate row issues

### PO Items — Cascading Dropdowns + Stock Alert + Validation
**Commit:** `e6eb96c` | 2026-03-09
- `loadPOModelsForBrand()` / `loadPOColorsAndSizes()` — cascading dropdowns
- Low stock alert integration in PO item rows
- Required field validation before save
- Deduplication of PO items

### PO Export — Excel + PDF
**Commit:** `fdd6da5` | 2026-03-09
- `exportPOExcel()` — PO to xlsx with supplier info + item details
- `exportPOPdf()` — PO to PDF for supplier delivery

### Excel Import — Format Popup
**Commit:** `b45e010` | 2026-03-09
- `openExcelFormatPopup()` / `closeExcelFormatPopup()` — sample format guide
- Replaces old direct sample file download

---

## Phase 13: Supplier + Brand Management

### Supplier Numbers + PO Format + View Export
**Commit:** `281141e` | 2026-03-09
- `supplier_number` column (UNIQUE, ≥ 10) on suppliers table
- PO number format: `PO-{supplier_number}-{4-digit-seq}`
- Export buttons available in PO view mode

### Supplier Numbers — Edit Mode + PO Lock + Swap
**Commit:** `561d144` | 2026-03-09
- `toggleSupplierNumberEdit()` / `cancelSupplierNumberEdit()` — edit mode toggle
- `saveSupplierNumbers()` — validation (≥ 10, no duplicates), PO lock check, temp negative swap for UNIQUE constraint
- `getNextSupplierNumber()` — gap-filling (lowest available ≥ 10)
- Rollback on save failure

### Brands — Stock Qty Column with Low Stock Highlight
**Commit:** `2ceb635` | 2026-03-09
- `brandStockByBrand` — aggregated inventory qty per brand
- Stock qty column in brands table
- Color logic: red + ⚠️ if below min_stock_qty, green if above, default if no min set

### Brands — Active Field + Filter Bar + Toggle
**Commit:** `2271728` | 2026-03-09
- Migration: `009_brands_active.sql` — `brands.active` boolean column
- `allBrandsData[]` + `brandsEdited[]` — full dataset vs filtered view
- 3 filter dropdowns: active (פעיל/לא פעיל/הכל), sync, type
- `setBrandActive()` — immediate DB save on checkbox toggle
- Filter count label

---

## Phase 14: Documentation

### CLAUDE.md — Full Module Map
**Commit:** `3793842` | 2026-03-09
- Comprehensive project guide: file structure, DB tables, all modules with functions + globals
- 12 documented conventions
- Known issues section

---

## Phase 1.5: Improvements & Bug Fixes

### CLAUDE.md — Brands Filter Conventions
**Commit:** `a6b01de` | 2026-03-09
- Updated CLAUDE.md conventions section with brands filter documentation
- Documented `allBrandsData[]`, `renderBrandsTable()` filter logic, `setBrandActive()` pattern

### Brands — Low Stock Filter
**Commit:** `e7b86b3` | 2026-03-09
- Added 4th filter dropdown `brand-filter-low-stock` to brands table
- Options: הכל / מתחת לסף / מעל הסף / ללא סף
- `renderBrandsTable()` now applies 4 filters (active, sync, type, low stock)
- Uses `currentQty` vs `min_stock_qty` comparison from `allBrandsData`

### Goods Receipt — Bug Fixes (4 fixes)
**Commit:** `d9a251a` | 2026-03-09
- **writeLog fix**: `confirmReceiptCore()` now passes `null` as inventoryId for receipt-level logs instead of PO id
- **Confirm refactor**: extracted `confirmReceiptCore(receiptId, rcptNumber, poId)` as shared logic for both `confirmReceipt()` (DOM-based) and `confirmReceiptById()` (DB-based)
- **Duplicate barcode check**: `addReceiptItemRow()` and `searchReceiptBarcode()` now reject items with barcodes already in the receipt table
- **Qty=0 validation**: `getReceiptItems()` now throws on qty < 1 instead of silently defaulting to 1; all callers wrapped in try/catch

### Sell Price + Sync + Image Validations
**Commit:** `5bfb824` | 2026-03-09
- **Sell price required in goods receipt**: `confirmReceipt()` and `saveReceiptDraft()` block on missing sell price
- **Sell price required before barcode**: `generateBarcodes()` validates sell price > 0 before generating
- **brandSyncCache**: `loadData()` and `saveBrands()` build `window.brandSyncCache` (brand name → default sync)
- **Receipt sync field**: `addReceiptItemRow()` adds sync select (auto-set from brand default) + image file input (new items only)
- **Image validation**: `confirmReceipt()` blocks new items with sync=מלא/תדמית missing images; `validateEntryRows()` adds sync-based image check
- **Brand default sync**: `createNewInventoryFromReceiptItem()` uses `getBrandSync()` instead of hardcoded `'none'`
- Receipt table headers updated: +סנכרון, +תמונות columns

---

## פאזה 2 — גשר Access

### Migration 010: Access Bridge Tables
**Commit:** `dbc44fa` | 2026-03-09
- 3 new tables: `sync_log`, `pending_sales`, `watcher_heartbeat`
- `sync_log` — tracks each imported file with row counts and status
- `pending_sales` — holds rows whose barcode was not found in inventory
- `watcher_heartbeat` — single-row table for watcher uptime monitoring
- Indexes on created_at, filename, status, order_number
- RLS policies (all open for now)
- Migration: `010_access_bridge.sql`

### Access Sync Tab — Skeleton
**Commit:** `ae41e1a` | 2026-03-09
- New tab "🔄 סנכרון Access" with heartbeat status, sync log table, pending badge
- `js/access-sync.js` — new module file
- `loadHeartbeat()` — green/red/gray indicator based on watcher_heartbeat.last_beat
- `loadSyncLog()` — displays sync history with status badges
- `loadPendingBadge()` — COUNT pending WHERE status='pending', updates button style

### Pending Sales Panel — Resolve, Search, Ignore
**Commit:** `7a25bd5` | 2026-03-09
- `renderPendingPanel()` — overlay with cards per pending sale
- `loadSuggestions()` — up to 5 barcode-matched inventory suggestions
- `resolvePending()` — maps pending row to inventory item, updates qty
- `toggleFreeSearch()` / `runPendingSearch()` — free text search fallback
- `ignorePending()` — marks pending row as "not in inventory"

### Inventory Core — Access Sales Excel Import
**Commit:** `2ccdffe` | 2026-03-09
- `processAccessSalesFile(workbook, filename)` in inventory-core.js
- Detects `sales_template` sheet, skips 2 metadata rows
- Validates barcode, qty, date, order_number per row
- Barcode found → updates inventory qty + writeLog
- Barcode not found → inserts into pending_sales
- Creates sync_log entry with final row counts

### Goods Receipt — Export to Access Excel
**Commit:** `4ad76c5` | 2026-03-09
- `exportReceiptToAccess(receiptId)` in goods-receipt.js
- Exports confirmed receipt items as Excel with `new_inventory` sheet
- 📤 button visible only on confirmed receipts in list view

### Scripts — Sync Watcher
**Commit:** `0e1888a` | 2026-03-10
- `scripts/sync-watcher.js` — Node.js file watcher using chokidar
- Watches Dropbox folder for .xlsx/.xls files
- Processes `sales_template` sheet → inventory updates / pending_sales
- Retry logic (3 attempts, 30s delay) for network errors
- Heartbeat every 5min to watcher_heartbeat table
- Graceful SIGTERM/SIGINT shutdown
- `scripts/config.json` (gitignored) + `scripts/config.example.json`
- `scripts/package.json` with chokidar, xlsx, supabase-js dependencies

### Scripts — Windows Service + README
**Commit:** `5e7379b` | 2026-03-10
- `scripts/install-service.js` / `scripts/uninstall-service.js` — node-windows service wrapper
- `scripts/README.md` — Hebrew installation guide
- OpticTop folder path structure for Dropbox sync

### Migration 011 — Inventory Logs Sale Fields
**Commit:** `528183e` | 2026-03-10
- 12 new columns on `inventory_logs`: sale_amount, discount, discount_1, discount_2, final_amount, coupon_code, campaign, employee_id, lens_included, lens_category, order_number, sync_filename
- `writeLog()` in shared.js updated to accept 13 additional Access sale fields
- `sync-watcher.js` direct INSERT updated with same fields
- Migration: `011_inventory_logs_sale_fields.sql`

### Fix HIGH — Config Leak, Crash Risk, Security Gates
**Commit:** `977b87d` | 2026-03-10
- `scripts/config.json` added to .gitignore + untracked from git
- `scripts/config.example.json` created with placeholder key
- `moveToProcessed()` wrapped in try/catch with copy+delete fallback
- `resolvePending()` gated with confirmDialog + PIN verification

### Fix MEDIUM — Pagination, Optimistic Lock, Dedup, Labels, Table Names
**Commit:** `3ffbb0c` | 2026-03-10
- `loadSyncLog()` rewritten with `.range()` pagination (20 rows/page)
- `resolvePending()` uses optimistic lock: UPDATE WHERE status='pending' before inventory changes
- Duplicate filename check changed from `.eq()` to `.ilike()` (case-insensitive) in both web + watcher
- `SOURCE_LABELS` map for source_ref display (🤖 Watcher / 👤 ידני)
- `TABLES` const in sync-watcher.js — replaced all hardcoded table name strings

### Fix LOW — Error Logging, XSS, Dead Code, Heartbeat Refresh
**Commit:** `7dbef27` | 2026-03-10
- `processAccessSalesFile()` row-level catch now logs `console.warn` with barcode
- Duplicate check catch replaced with warning + toast instead of silent proceed
- All inline `onclick`/`oninput` handlers in access-sync.js replaced with `data-*` attributes + delegated event listeners (XSS prevention)
- Removed dead `patterns[1]` computation in `loadSuggestions()`
- Removed unused `orderNumber` parameter from `ignorePending()`
- Added `startHeartbeatRefresh()` / `stopHeartbeatRefresh()` with 60s auto-refresh interval
