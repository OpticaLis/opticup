# Session Context

## Last Updated
Access Sync Fix — 2026-03-14

## What Was Done This Session
Access Sync Fix — not a numbered phase. A comprehensive set of fixes and enhancements to the Access sync system (originally built in Phase 2), done after Phase 5.75.

### CSV Support (Watcher + Manual Import)
- `bc88058` — sync-watcher.js: CSV support (was XLSX only). parseCSVFile(), BOM stripping, trailing comma handling
- `0df2699` — access-sales.js + inventory-reduction.js: CSV support for manual browser import

### Security (tenant_id, service_role key)
- `bbc01a9` — sync-watcher.js: tenant_id added to all 4 insert operations (pending_sales, inventory_logs, sync_log x2)
- `1c209c3` — sync-watcher.js: switched to service_role key via OPTICUP_SERVICE_ROLE_KEY env var

### Heartbeat + Status Indicator
- `be376f3` — sync-watcher.js: heartbeat every 60s. access-sync.js: watcher status indicator (green/yellow/red)

### Pending Panel Redesign → Restructure to Work Center
- `082f07b` — pending-panel.js + pending-resolve.js: complete rewrite — table view + detail panel
- `dff070e` — DB: 4 new columns on pending_sales (brand, model, size, color). Watcher + manual import save them. Pending panel shows them
- `9c7a72b` — Fix CHECK constraint error on resolve. Add refresh button. Show product fields in sync detail modal
- `98448e3` — Major restructure: detail modal becomes work center, pending button becomes filter toggle, inline resolve with PIN at entry
- `f869cc3` — Fix pending_sales query: 'filename' column not 'sync_filename'
- `afab388` — New sync_log status 'handled' (orange). Badge counts files not items
- `a53b41b` — Brand/model clickable in detail modal → search in inventory
- `18939ff` — Help button "הסבר לתיקון ידני" in detail modal. start-watcher.bat launcher

### Configurable Watch Directory
- `eed515a` — OPTICUP_WATCH_DIR env var — configurable watch directory

### Reverse Sync (Export New Inventory to Access)
- `f302b0b` — Migrations run: access_exported column, sync_log source_ref allows 'export'. Batch update in groups of 100. Export logs with 📤 icon
- `e0ffbec` — Reverse sync: sync-export.js exports new inventory to CSV every 30s. OPTICUP_EXPORT_DIR env var

### Standalone Deployment Package
- `6affea9` — watcher-deploy/ standalone package: 8 files, setup.bat interactive installer, Windows Service

## Current State
- **4 HTML pages**: index.html (home), inventory.html (inventory module), suppliers-debt.html (supplier debt module), employees.html (employee management)
- **2 Edge Functions**: pin-auth (JWT auth), ocr-extract (Claude Vision OCR)
- **~65 JS files** across 10 module folders + 8 global files
- **~14,500 lines of JS code**
- **42 DB tables** + 6 RPC functions (increment_inventory, decrement_inventory, set_inventory_qty, generate_daily_alerts, next_internal_doc_number, update_ocr_template_stats)
- **1 pg_cron job**: daily-alert-generation (05:00 UTC)
- **JWT-based RLS** tenant isolation on all 42 tables
- **Phase 5.75 tables** (empty stubs): conversations, conversation_participants, messages, knowledge_base, message_reactions, notification_preferences
- **4 new columns on pending_sales**: brand, model, size, color (product fields from Access CSV)
- **1 new column on inventory**: access_exported (BOOLEAN, default false) + partial index
- **New file**: scripts/sync-export.js (~117 lines) — reverse sync exports
- **New folder**: watcher-deploy/ (8 files) — standalone deployment package for optica installation
- **2 new migrations run**: add_pending_sales_product_columns.sql, add_inventory_access_exported.sql, add_sync_log_export_source.sql
- **sync_log** has new status 'handled' and source_ref 'export'

## Open Issues
- JWT secret exposed in dev chat — must rotate before production
- employees.html session sometimes lost when navigating from inventory.html after reload — inconsistent, monitor
- Staging environment needed before second tenant onboards
- Supabase Storage bucket "supplier-docs" needs to be created + RLS policy configured (manual step)
- Views for external access (supplier portal, storefront) are planned but not created yet — Phase 6
- Edge Function deployment requires Supabase CLI (not automated)
- weekly-reports Storage folder not created yet (uses supplier-docs bucket)
- jsPDF/html2canvas loaded from CDN — consider self-hosting for reliability
- Hebrew displays as squares in CMD/bat files (cosmetic, doesn't affect functionality)
- Dedup by filename: if Access sends sale + cancellation with same order number, second file is skipped. Workaround: Access developer to use unique filenames for cancellations
- install-service.js in scripts/ folder missing --export-dir support (only watcher-deploy/ version has it)

## Next Phase
Phase 6 — Supplier Portal (token-based supplier auth, read-only views, supplier-specific inventory/documents/payments)

## Last Commits
### Phase 5 (AI Agent)
- Phase 5a: `d82fb25` — DB tables (5 new)
- Phase 5b: `70124b4` — Edge Function ocr-extract
- Phase 5c: `bcf627a` — OCR review screen
- Phase 5d: `f66a37b` — OCR in goods receipt
- Phase 5e: `1024ef2` — Learning system
- Phase 5f-1: `ab2be62` — Alerts badge + daily alert SQL
- Phase 5f-2: `3ba3d9d` — Event alerts + auto-dismiss
- Phase 5g: `6176385` — Weekly report + PDF export
- Phase 5h: `dfce880`, `b9c1ab0` — AI config screen + emoji fix

### Phase 5.5 (Stability, Scale & Batch)
- Phase 5.5a-1: `dbaa77d` — SQL migrations (2 RPCs + 3 columns + 3 indexes)
- Phase 5.5a-2: `d4acf1f`, `8242e1a` — batchWriteLog + FIELD_MAP
- Phase 5.5b: `235e42b` — RPCs applied in JS
- Phase 5.5c: `0168846` — pg_cron daily alerts
- Phase 5.5d: `5aecfad` — Stability fixes
- Phase 5.5e: `9284538` — UX fixes
- Phase 5.5f: `c119c6b` — Advanced document filtering
- Phase 5.5g: `e8535b6` — Batch document upload
- Phase 5.5h-1: `9969ff4` — Batch OCR with pipelining
- Phase 5.5h-2: `bbef876` — Historical document import
- Phase 5.5i-1: `d1f0511` — Backup

### Phase 5.75 (Communications & Knowledge Infrastructure)
- Phase 5.75a: `dbbe96a` — Spec + migration SQL (6 new tables)
- Phase 5.75b: Migration executed + verified in Supabase
- Phase 5.75c: Backup + documentation update

### Access Sync Fix (post-Phase 5.75)
- `bc88058` — CSV support for watcher (parseCSVFile, BOM stripping)
- `bbc01a9` — tenant_id on all watcher inserts
- `1c209c3` — service_role key via env var
- `0df2699` — CSV support for manual browser import
- `be376f3` — Heartbeat + watcher status indicator
- `082f07b` — Pending panel + resolve rewrite
- `dff070e` — 4 new columns on pending_sales (brand/model/size/color)
- `9c7a72b` — CHECK constraint fix, refresh button, product fields in detail modal
- `98448e3` — Detail modal → work center restructure
- `f869cc3` — Fix pending_sales query column name
- `afab388` — sync_log status 'handled', badge counts files
- `a53b41b` — Brand/model clickable → inventory search
- `18939ff` — Help button + start-watcher.bat
- `eed515a` — OPTICUP_WATCH_DIR env var
- `f302b0b` — Migrations: access_exported, source_ref 'export'
- `e0ffbec` — Reverse sync: sync-export.js + OPTICUP_EXPORT_DIR
- `6affea9` — watcher-deploy/ standalone package
