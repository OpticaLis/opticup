# Session Context

## Last Updated
Phase 5.5 final — 2026-03-13

## What Was Done This Session
Phase 5.5 — Stability, Scale & Batch Operations

### Sub-phases:

1. **5.5a-1: SQL migrations** — commit `dbaa77d`
   - 2 new RPC functions: next_internal_doc_number, update_ocr_template_stats
   - 3 new columns on supplier_documents: file_hash, batch_id, is_historical
   - 3 new indexes: idx_sup_docs_file_hash, idx_sup_docs_batch, idx_sup_docs_historical
   - Migration: phase5_5a_atomic_rpcs.sql, phase5_5b_schema_additions.sql

2. **5.5a-2: batchWriteLog + FIELD_MAP** — commits `d4acf1f`, `8242e1a`
   - batchWriteLog() in supabase-ops.js for bulk log inserts
   - FIELD_MAP updated with file_hash, batch_id, is_historical Hebrew translations

3. **5.5b: RPCs applied in JS** — commit `235e42b`
   - generateDocInternalNumber now uses next_internal_doc_number RPC
   - updateOCRTemplate rewritten to use update_ocr_template_stats RPC
   - receipt-debt.js uses next_internal_doc_number RPC

4. **5.5c: pg_cron daily alerts** — commit `0168846`
   - pg_cron job: daily-alert-generation (05:00 UTC)
   - Fault isolation: each alert type wrapped in BEGIN/EXCEPTION
   - Migration: phase5_5c_pgcron_alerts.sql

5. **5.5d: Stability fixes** — commit `5aecfad`
   - Weekly report snapshot cache with tenant_id fix
   - alerts-badge.js try/catch wrappers
   - validateOCRData() — 7 business rules for OCR validation
   - createAlert skips historical documents (is_historical check)
   - CLAUDE.md alerts table description fix

6. **5.5e: UX fixes** — commit `9284538`
   - Remove file button in receipt form
   - AI info modal for OCR in goods receipt

7. **5.5f: Advanced document filtering** — commit `c119c6b`
   - debt-doc-filters.js (242 lines) — replaces simple filter bar
   - 8 filter criteria: status, type, supplier, date range, amount range, source
   - Saved filter favorites (localStorage, max 5)
   - Filter count display, collapsible panel

8. **5.5g: Batch document upload** — commit `e8535b6`
   - ai-batch-upload.js (332 lines) — drag-drop upload modal
   - SHA-256 file hash dedup (within batch + against DB)
   - Upload-only or upload+OCR modes
   - Progress bar, file preview, cleanup on close

9. **5.5h-1: Batch OCR with pipelining** — commit `9969ff4`
   - ai-batch-ocr.js (297 lines) — sequential OCR processing
   - Pause/resume queue, retry failed, review individual docs
   - Auto-approve valid docs (above confidence threshold)
   - Summary modal with stats

10. **5.5h-2: Historical document import** — commit `bbef876`
    - ai-historical-import.js (330 lines) — import old documents for AI learning
    - Documents marked is_historical=true, no inventory impact, no alerts
    - Default status selection (paid/open/per_doc)
    - Learning summary with per-supplier accuracy stats

11. **5.5i-1: Backup** — commit `d1f0511`
    - Backup to M1F5.5_2026-03-13/

## Current State
- **4 HTML pages**: index.html (home), inventory.html (inventory module), suppliers-debt.html (supplier debt module), employees.html (employee management)
- **2 Edge Functions**: pin-auth (JWT auth), ocr-extract (Claude Vision OCR)
- **~62 JS files** across 10 module folders + 8 global files
- **~14,500 lines of JS code**
- **36 DB tables** + 6 RPC functions (increment_inventory, decrement_inventory, set_inventory_qty, generate_daily_alerts, next_internal_doc_number, update_ocr_template_stats)
- **1 pg_cron job**: daily-alert-generation (05:00 UTC)
- **JWT-based RLS** tenant isolation on all 36 tables
- **Phase 5.5 features**: atomic RPCs for doc numbers and OCR templates, batchWriteLog, validateOCRData (7 rules), pg_cron daily alerts, advanced document filtering (8 criteria + saved favorites), batch document upload (drag-drop, dedup), batch OCR with pipelining/resume, historical document import with AI learning

## Open Issues
- JWT secret exposed in dev chat — must rotate before production
- employees.html session sometimes lost when navigating from inventory.html after reload — inconsistent, monitor
- sync-watcher.js (Node.js) inserts not updated with tenant_id — deferred (separate runtime)
- Staging environment needed before second tenant onboards
- Supabase Storage bucket "supplier-docs" needs to be created + RLS policy configured (manual step)
- Views for external access (supplier portal, storefront) are planned but not created yet — Phase 6
- Edge Function deployment requires Supabase CLI (not automated)
- weekly-reports Storage folder not created yet (uses supplier-docs bucket)
- jsPDF/html2canvas loaded from CDN — consider self-hosting for reliability

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
