# Session Context — Module 1: Inventory Management

## Last Updated
Flow Review Phase 3 Complete — 2026-03-25

## What Was Done This Session

### Flow Review Phase 3 (2026-03-24 to 2026-03-25) — 25 commits

**Phase 3a — Tenant isolation hardening (02a3ccd, 66c6bb0):**
- Added tenant_id filter to lookup caches, supplier number queries, permissions queries
- JWT periodic check (every 5 min) with tenant claim verification
- Standardized session redirect on auth failure across all pages

**Phase 3c — File splits (c4e06c7, a95035b, 59a9574, 4f1c178):**
- Split 6 oversized files, trimmed 11 borderline files under 350 lines
- Fixed PO supplier dropdown searchable

**Phase 3d — Frame images (c9ec727, f77d1cd, 0e5b2d4):**
- inventory-images.js: camera capture, WEBP conversion, Storage upload/delete
- inventory-images-bg.js: background removal (Canvas + remove.bg AI)
- Action menu, receipt-to-images flow, photography workflow

**Phase 3e — QA + remove.bg (22de0b6 through cef3bb4, 11 commits):**
- Edge Function remove-background with remove.bg API
- Choice dialog (AI vs Canvas), auth fixes, image delete fix
- Full-size preview overlay, download button, cascade delete
- Auto-refresh image count badges, pending_review status

**Phase 3g — Barcode refactor (a91ab19):**
- ONE barcode per product line (not per unit)
- Receipt creates single inventory record with full quantity
- Excel export repeats same barcode N times for label printing

**Phase 3h — PO improvements (70b9ace):**
- Fix receipt confirm barcode validation (no false error)
- Receipt total cost summary in stats
- Not-received items move to bottom of receipt table
- PO View: editable sell price + discount columns with save
- PO View: summary row (lines/units/total)
- PO Creation: brand filter dropdown

**Phase 3i — Product type flow (459ba69, 310f2c1):**
- Migration 053: product_type column on goods_receipt_items
- Product type dropdown in PO creation main row
- PO View: editable product type column
- Receipt from PO: auto-populates product_type
- Receipt confirm: passes product_type to inventory (no more hardcoded eyeglasses)
- Inventory table: editable product_type via invEditProductType()

### All Commits (Flow Review Phase 3)
- 02a3ccd Tenant isolation: lookup caches + supplier number + permissions
- 66c6bb0 Tenant isolation: JWT periodic check + session redirect
- c4e06c7 Split receipt-form.js
- a95035b Split receipt-confirm.js
- 59a9574 Split 4 oversized files
- 4f1c178 Trim 11 files, fix PO supplier dropdown
- c9ec727 Frame images: DB migration, image modal, action menu
- f77d1cd Receipt-to-images flow, badges, photography workflow
- 0e5b2d4 White background removal (Canvas)
- dc200e2 pending_review status, OCR event dispatch
- 22de0b6 QA: action menu first column, escapeHtml, Storage URL
- 61fb265 createSignedUrl for private Storage
- 12fbb16 Phase docs + backup
- a9a162f remove.bg Edge Function integration
- 9534b17 Edge Function import fix
- 2f2bb2d Full-size preview, download button
- 51df94f Image delete fix, choice dialog
- 50e0bdc Image delete Storage+DB, cascade delete
- 8427523 Edge Function auth fix
- 4468124 apikey header for gateway
- cef3bb4 Remove branding, auto-refresh badges
- a91ab19 One barcode per product line
- 70b9ace Receipt barcode validation, PO sell prices, summary, brand filter
- 459ba69 Product type in PO + receipt flows
- 310f2c1 Editable product type in inventory table

## Current State
- **6 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings
- **113 JS files** across 14 module folders + 10 global + 9 shared (26,955 lines total)
- **All files <= 350 lines** (max = 350, 4 files at limit)
- **3 Edge Functions**: pin-auth, ocr-extract, remove-background
- **49 DB tables** + 14 RPC functions
- **58 migration files**: 051-053 added this phase
- **Product type flow**: PO creation -> PO view -> receipt -> inventory (editable at all stages)
- **Barcode logic**: ONE barcode per product line, qty on single inventory record
- **Frame images**: camera, WEBP, remove.bg AI + Canvas, full-size preview, download, delete
- **PO improvements**: sell prices, brand filter, summary row
- **Tenant isolation**: JWT check, tenant claims, session redirect
- **Zero console errors** on all 6 pages

## Open Issues

### LOW / DEFERRED
- OCR verification on PO-linked receipts — deferred, PO comparison report adequate
- Cascading dropdowns on non-PO receipt items — deferred, most receipts use PO linkage
- PIN unification (standardize to promptPin()) — deferred, works but inconsistent patterns
- 7 non-tenant UNIQUE constraints — documented tech debt

## Next Steps
1. **Module 2 planning** (Platform Admin — SaaS infrastructure)
2. **Consider**: Stock count improvements, reporting module
3. **Future**: Storefront views, supplier portal
