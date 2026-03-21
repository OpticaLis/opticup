# Session Context

## Last Updated
Phase 7 Complete (including hotfix cycle) — 2026-03-21

## What Was Done This Session

### Phase 7 — Stock Count Improvements (2026-03-19)

5 steps completed to upgrade stock count for weekly production use:

**Step 0 — File Split:**
- stock-count-session.js (871 lines) split into 3 files:
  - stock-count-session.js (306 lines) — state, PIN, render, filters
  - stock-count-camera.js (376 lines) — camera overlay, ZXing, zoom, unknown form
  - stock-count-scan.js (201 lines) — barcode normalization, scan handling, qty modal, undo, pause/finish
- Zero logic changes, pure structural split

**Step 1 — Atomic Delta RPC:**
- New RPC: apply_stock_count_delta with FOR UPDATE row lock
- Replaces set_inventory_qty in confirmCount()
- Returns previous_qty, counted_qty, delta, new_qty for logging
- Diff report shows "expected at start" + "current at approval" columns
- Warning banner when quantities changed during count
- Migration: 033_apply_stock_count_delta.sql

**Step 2 — Unknown Items → Inventory:**
- New file: stock-count-unknown.js (222 lines)
- Modal to edit unknown items: brand dropdown, model, barcode (readonly or auto-gen), prices, supplier, size, color
- Two barcode paths: scanned (readonly) or auto-generate (BBDDDDD)
- Saves to inventory, updates stock_count_items to matched
- writeLog with reason "נמצא בספירת מלאי"

**Step 3 — Reason + Partial Approval:**
- New column: reason TEXT on stock_count_items
- CHECK constraint updated: added 'skipped' status
- Per-row checkbox (default checked) + reason input for discrepancies
- Bulk toolbar: סמן הכל / בטל סימון / סמן רק פערים
- New file: stock-count-approve.js (42 lines) — bulk selection helpers
- Skipped items get status='skipped', no inventory change
- Migration: 034_stock_count_reason_and_skipped.sql

**Step 4 — View Completed Counts:**
- New file: stock-count-view.js (221 lines)
- Read-only panel with count header, employee name, date
- Status filter buttons: הכל / התאמות / חוסרים / עודפים / נדלגו
- 9-column table with reason + status
- Summary footer with totals
- Excel export (12 columns)
- Replaced toast("בקרוב") with real view

**Commits:**
- `86336c7` — Step 0: split session.js into session + camera
- `7bea7de` — Step 0c: split scan.js from session
- `588b349` — Step 1: atomic delta RPC
- `a441555` — Step 2: unknown items modal (cherry-picked)
- `aef7671` — Step 3: reason + partial approval
- `5423c48` — Step 4: view completed counts
- `fc685b7` — Phase 7 documentation, backup, ROADMAP

### Phase 7 — Hotfix Cycle (2026-03-19 to 2026-03-21)

Extensive hotfix cycle covering camera scanning, CSS layout, DB constraints, stock count flow, unknown item handling, and documentation.

**Camera & Scanning:**
- `666e1fd` — Camera fullscreen gap fix, barcode scan improvements, error toast debounce (3s cooldown)

**CSS & Layout:**
- `4a74fec` — Stock count mobile layout: right gap fix on Safari
- `5a226eb` — Right margin gap on all pages: overflow-x:hidden on all CSS files
- `107a711` — Persistent right margin gap: html overflow-x:hidden + remove all 100vw

**Database Constraints:**
- `03f2209` — Barcode UNIQUE per tenant (inventory_barcode_tenant_key), remove D prefix from clone-tenant.sql
- `70f4d7a` — stock_counts count_number UNIQUE per tenant + collision retry in generateCountNumber
- `d337763` — clone-tenant.sql ON CONFLICT composite PK fixes
- `af5e87e` — clone-tenant.sql employee_roles PK fix (employee_id, role_id without tenant_id)

**Stock Count Flow:**
- `8e35120` — confirmCount all-items-skipped fix, countNumber scoping, undo button CSS
- `1c0e1cd` — PIN modal centered overlay (not scroll-to-top), undo button fix, unknown items warning before approval
- `a16d2c1` — Unknown item duplicate barcode handling, scroll-to-top before PIN, completed view shows unknowns
- `b818379` — Uncounted items dialog: mark pending items as shortages (כמות 0) or leave uncounted
- `3f17b77` — total_items includes matched unknowns in count list

**Unknown Items:**
- `770fbca` — Unknown item insert uses status `in_stock` instead of `active`
- `c6e5fec` — Barcode conflict dialog: ask user to link existing or create new item
- `da7cce6` — loadMaxBarcode silent failure fix + collision retry for generateNextBarcode
- `6a7c143` — loadMaxBarcode uses server-side max (Supabase `.order().limit(1)`) instead of fetching all rows

**Documentation & Rules:**
- `1c0b517` — TROUBLESHOOTING.md knowledge base created + SaaS rule 19 (UNIQUE + tenant_id) in CLAUDE.md
- `5030905` — TROUBLESHOOTING.md: stale session after tenant re-clone
- `1894028` — TROUBLESHOOTING.md: barcode collision bug
- `66c1ddd` — CLAUDE.md: no-worktree rule (rule 8 in Working Rules)
- `fc685b7` — CLAUDE.md: multi-machine development rule

## Current State
- **6 HTML pages**: index.html, inventory.html, suppliers-debt.html, employees.html, shipments.html, settings.html
- **2 Edge Functions**: pin-auth, ocr-extract
- **102 JS files** (~23,135 lines) across 14 module folders + 9 global files (js/) + 9 shared/js files (Module 1.5)
- **Stock-count module**: 9 files (list 149, session 314, camera 350, scan 265, filters 245, unknown 374, approve 46, view 228, report 297) — 2,268 lines total
- **46 DB tables** + 8 RPC functions (including apply_stock_count_delta)
- **55 permissions** across 15 modules, 5 roles
- **41 migration files**
- JWT-based RLS tenant isolation on all 46 tables
- Supabase Storage: 3 buckets (failed-sync-files, supplier-docs, tenant-logos)

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
- **Stock Count: barcode 0002793** physically unreadable by ZXing (damaged/incompatible barcode print)
- **Stock Count: camera.js at 350 lines** — at the limit, acceptable as tightly coupled unit
- **Stock Count: unknown.js at 374 lines** — slightly over 350 limit, acceptable as tightly coupled conflict resolution flow
- **Document linking auto-sum** (QAc-002 WARN): when linking delivery notes to invoice, auto-sum linked amounts and compare to invoice total
- **Cascading payment settlement** (QAc-004 WARN): when payment fully covers a document, auto-close related linked documents

## Next Phase
Phase 7 fully complete including all hotfixes. Next directions:
1. Module 2 planning (Customer management, Sales/POS, Supplier portal, etc.)
2. Consider rotating JWT secret before production use
