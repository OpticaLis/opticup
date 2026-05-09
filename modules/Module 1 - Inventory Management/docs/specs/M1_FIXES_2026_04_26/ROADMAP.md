# Optic Up — Fixes & Improvements Batch (2026-04-26)

> **Owner:** Daniel  
> **Created:** 2026-04-26  
> **Status:** Planning  
> **Scope:** Cross-module fixes discovered during routine review  
> **Execution model:** One SPEC per fix group, sequential execution

---

## Overview

This batch covers 12 issues discovered during a comprehensive review session on 2026-04-26.
Issues span 4 areas: Supabase optimization, Inventory filters, Platform Admin, and Storefront Studio.
Each issue has been investigated and root-caused. Fixes are grouped into logical SPECs.

---

## Fix Groups

### Group A — Supabase Storage & Egress Optimization

> **Goal:** Stay within Supabase Free tier (5 GB egress/month)

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| A1 | Compress media-library product images (27 files, avg 2.5 MB → target 200-300 KB) | HIGH | ✅ Compressed 27/27 + originals deleted 2026-04-27 (`A1_PRODUCT_IMAGE_COMPRESSION/`) — live serving 0.82 MB; backups (65 MB) at `products-backup-2026-04-26/` retained as safety copies. |
| A2 | Add auto-compression on upload (max 1200px width, quality 80 WebP) | HIGH | ✅ Fixed (`A2_AUTO_COMPRESSION_ON_UPLOAD/`) — single-function patch in studio-media.js convertMediaToWebP, ports proven pattern from inventory-images.js |
| A3 | Delete demo tenant supplier-docs (119 PDFs, 64 MB test data) | LOW | ✅ Cleaned (`A3_DEMO_SUPPLIER_DOCS_CLEANUP/`) — 119/119 demo PDFs deleted (64 MB freed); Prizma's 1 PDF untouched. |
| A4 | Delete failed-sync-files bucket contents (151 files, 47 KB junk) | LOW | ✅ Cleaned (`A4_FAILED_SYNC_CLEANUP/`) — actual count 189 files / 54 KB; bucket now 0/0. Underlying leak not fixed (follow-up). |

**Evidence:**
- Supabase egress limit: 5 GB/month (Free tier)
- media-library: 120 MB across 276 files (products/ folder = 65 MB in 27 files)
- Product images average 2.5 MB each; storefront renders them at max 800px width
- Each visitor ≈ 10-15 MB egress; ~400 visitors/month = 4-6 GB egress
- supplier-docs: 119 files (64 MB) all under demo tenant `8d8cfa7e`, all from March 2026 OCR testing
- failed-sync-files: 151 files (47 KB total), old sync failure leftovers
- frame-images (67 MB, 2024 files) are production data — do NOT touch

**Impact:** Reduces monthly egress from ~5+ GB to under 1 GB. Faster page loads. Better PageSpeed scores.

---

### Group B — Inventory Filters & Export

> **Goal:** Fix broken filter, add missing filters, fix Excel export for selections

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| B1 | "ללא תמונות" filter is client-side only — filters current page (50 items), not all inventory | CRITICAL | ✅ Fixed (`B1_NO_IMAGES_FILTER_SERVER_SIDE/`) |
| B2 | Add filter: חברה (brand name dropdown) — below ספק | MEDIUM | ✅ Added (`B2_B3_B4_INVENTORY_FILTERS/`) |
| B3 | Add filter: סוג מותג (brand_type: luxury/brand/regular) — below סוג מוצר | MEDIUM | ✅ Added (`B2_B3_B4_INVENTORY_FILTERS/`) + ✅ FIXED 2026-04-27 (`B3_BRAND_TYPE_FILTER_VIA_JOIN/`) — was operating on dead `inventory.brand_type` column (32 luxury, 99% NULL); now resolves via brandTypeCache + filters by `brand_id IN (...)`. Live verified: luxury 32→430, brand+no-images 0→3390. |
| B4 | Add filter: סוג סינכרון (website_sync: full/display/none) — below כמות | MEDIUM | ✅ Added (`B2_B3_B4_INVENTORY_FILTERS/`) |
| B5 | "רק מסומנים" view shows only current-page selections — should fetch all selected from server | HIGH | ✅ Fixed (`B5_SELECTED_ONLY_SERVER_SIDE/`) |

**Evidence:**
- B1: `inventory-table.js:87-92` — `_noImagesFilter` runs `invData.filter()` AFTER pagination, not in Supabase query
- B2: `inventory.brand_id` → `brands.name` — FK exists, need dropdown populated from brands table
- B3: `inventory.brand_type` column exists with values: luxury, brand, regular
- B4: `inventory.website_sync` column exists with values: full, display, none
- B5: `inventory-table.js:245-262` — `toggleSelectedFilter()` filters local `invData` array, not server query
- Excel export itself (`inventory-export.js:127-144`) already fetches all items and filters by `invSelected` — export works correctly, only the VIEW is broken

**Files to modify:**
- `inventory.html` (lines 190-196) — add 3 filter dropdowns
- `modules/inventory/inventory-table.js` (lines 25-92, 245-262) — fix no-images + selected-only filters, add 3 new server-side filters

---

### Group C — Platform Admin: Permissions Bug

> **Goal:** Fix broken permission updates

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| C1 | role_permissions upsert fails with 400 — on_conflict missing tenant_id | CRITICAL | ✅ Fixed (`C1_PERMISSIONS_UPSERT/`) |

**Evidence:**
- Browser console: `POST .../role_permissions?on_conflict=... 400 (Bad Request)` from `supabase.js:20`
- DB schema: `role_permissions` PK = `(role_id, permission_id, tenant_id)` — 3-column composite
- Code likely sends `onConflict: 'role_id,permission_id'` — missing `tenant_id`
- Fix: add `tenant_id` to `onConflict` parameter in all `role_permissions` upsert calls

**Files to modify:**
- Search for `role_permissions` upsert calls in `modules/permissions/` or `modules/admin/`

---

### Group D — Storefront Studio Fixes

> **Goal:** Fix display logic, AI content, disappearing products, media performance

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| D1 | Brands tab: "סנכרון" column is redundant — simplify to show/hide | MEDIUM | ✅ Fixed (`D1_D2_BRANDS_TAB_UX/`) |
| D2 | Brands tab: confusing overlap between "מצב תצוגה" and "תצוגה באתר" — simplify | MEDIUM | ✅ Fixed (`D1_D2_BRANDS_TAB_UX/`) |
| D3 | Products tab: "מצב תצוגה" shows wrong value (reads wrong field) | HIGH | ✅ Fixed by B-2 (`D3_D4_DISPLAY_MODE_RECONCILIATION/`); B-3 view + B-4 DDL deferred to follow-up SPEC |
| D4 | Products tab: display override ("דריסה") changes don't take effect on storefront | HIGH | ✅ Fixed by B-2 + dropdown values normalized in `D4_FOLLOWUP_VALUE_NORMALIZATION/`; B-3 view + B-4 DDL deferred to follow-up SPEC |
| D5 | Products tab: setting product to "מוסתר" makes it disappear from Studio UI — can't undo | CRITICAL | ✅ Fixed (`D5_HIDDEN_PRODUCT_RECOVERY/`) |
| D6 | AI Content tab: generation fails with error (missing auth header / no user feedback) | MEDIUM | ✅ Fixed (`D6_AI_CONTENT_AUTH_FIX/`) — 11 fetch sites across 6 files migrated to sb.functions.invoke() (root cause was missing Authorization header on bare fetch). |
| D7 | Media library: loads very slowly (expensive count queries, ilike on 4 columns, unbatched URLs) | HIGH | ✅ Fixed (`D7_MEDIA_LIBRARY_PERF_INVESTIGATION/` + parallelize patch in studio-media.js) — count + data fetch now parallel, ~600ms cold-load reduction. ilike→GIN/textSearch deferred (needs DDL); signed-URL batching rejected (T10 measured regression). |

**Evidence:**
- D1-D2: `storefront-brands.js:57-123` — three columns (`סנכרון`, `מצב תצוגה`, `תצוגה באתר`) where two would suffice
- D3: `storefront-products.js:65-73` — `resolved_mode` may reference wrong field (`display_mode` vs `storefront_mode`)
- D4: `storefront-products.js:195-220` — update code looks correct; likely view cache or RLS propagation issue
- D5: `storefront-products.js:41-46` — filter `if (resolved === 'hidden') return false` removes hidden products from the management UI itself, making them unrecoverable
- D6: `storefront-content.js:459-511` — Edge Function call at line 480 may lack Authorization header; error handling (lines 499-508) logs to console only, no toast/UI feedback
- D7: `studio-media.js:52-123` — `count: 'exact'` on every reset (line 92), `ilike` across 4 columns without index (lines 74-76), parallel signed URL requests causing rate limiting

**Files to modify:**
- `modules/storefront/storefront-brands.js`
- `modules/storefront/storefront-products.js`
- `modules/storefront/storefront-content.js`
- `modules/storefront/studio-media.js`

---

## Execution Priority (Recommended)

| Priority | Group | Reason |
|----------|-------|--------|
| 1 | **C1** — Permissions fix | Single fix, critical, blocks admin work |
| 2 | **D5** — Hidden product recovery | Product 0004223 is stuck; data recovery |
| 3 | **B1** — No-images filter fix | Broken functionality, quick fix |
| 4 | **D3, D4** — Display mode fixes | Related bugs, fix together |
| 5 | **A1, A2** — Image compression | Egress deadline May 21 |
| 6 | **B2-B4** — New inventory filters | Feature additions |
| 7 | **D1, D2** — Studio UX simplification | UX improvement, not blocking |
| 8 | **B5** — Selected-only view fix | Enhancement |
| 9 | **D6** — AI Content fix | Needs Edge Function debugging |
| 10 | **D7** — Media performance | Optimization |
| 11 | **A3, A4** — Cleanup test data | Low priority housekeeping |

---

## Progress Tracking

| SPEC | Issues | Status | Commit(s) |
|------|--------|--------|-----------|
| C1_PERMISSIONS_UPSERT | C1 | ✅ Closed by Claude Code (2026-04-26) — see `git log --grep=\"(C1)\"` | (in fix commit) |
| D5_HIDDEN_PRODUCT_RECOVERY | D5 | ✅ Closed by Claude Code (2026-04-26) — see `git log --grep=\"(D5)\"` | (in fix commit) |
| D3_D4_DISPLAY_MODE_RECONCILIATION | D3 + D4 | ✅ FULLY CLOSED — Phase A + B-1 + B-2 (2026-04-26) + B-3 view rewrite (2026-04-27) + B-4 DDL drop columns (2026-04-27). Both views (v_storefront_products + v_storefront_brands) migrated to LEGACY pair; storefront_mode columns dropped from brands + inventory; 7-point doc-update checklist confirmed clean. | (see `git log --grep=\"D3+D4\\\|B-3\\\|B-4\"`) |
| T12_BRAND_UI_CONSOLIDATION (Option 2 lightweight) | T12 | ✅ Closed by Claude Code (2026-04-27) — visibility toggle ported to studio-brands.js Brand Editor; storefront-brands.html + storefront-brands.js deleted; 7 sibling pages' nav links rewritten to storefront-studio.html | (refactor + chore-spec) |
| B1_NO_IMAGES_FILTER_SERVER_SIDE | B1 | ✅ Closed by Claude Code (2026-04-26) — see `git log --grep=\"(B1)\"` | (two-commit pattern: fix + chore-spec) |
| TBD | B2-B4 | ⬜ Pending | — |
| OVERNIGHT_M1_M3_BURNDOWN | A1, A3, A4, B2-B5, D1, D2, D4-followup, D6 (invest), D7 (invest), T12, T13 audit | 📝 SPEC + activation prompt authored 2026-04-26 evening — 12+ hr unattended run queued | — |
| (deferred) | A2 auto-compression on upload | ⬜ Pending (in burndown queue, may finish overnight) | — |
| (Daniel-gated) | D3+D4 Phase B-3 (view rewrite) + B-4 (DDL drop) | 🔒 awaiting Daniel sign-off (Iron Rule 29 + Level 3 SQL) | — |

---

*Last updated: 2026-04-26*
