# Module 1.5 — Shared Components Refactor — CHANGELOG

## Phase 3 — Data Layer ✅ (2026-03-18)

### Commits
- 130dec9: Phase 3 Step 1: create activity_log table with RLS and indexes
- cc52a4b: Phase 3 Step 2: create supabase-client.js with DB wrapper
- 13c98e3: Phase 3 Step 3: create db-test.html for DB wrapper testing
- a485cef: Phase 3 Step 3 fix: correct RLS policy pattern + test auth init
- b0acde3: Phase 3 Step 5: create activity-logger.js
- d221951: Phase 3 Step 6: create activity-log-test.html
- 61f810d: Phase 3 Step 7: fix activity-logger branch_id UUID validation
- e3456c0: Phase 3 Step 9a: atomic fix — po-view-import uses increment_inventory RPC
- 5f07211: Phase 3 Step 9b: atomic fix — debt-payment-alloc uses increment_paid_amount RPC
- 9ec6cdc: Phase 3 Step 9c: atomic fix — receipt-debt uses increment_prepaid_used RPC
- 44776bd: Phase 3 Step 9d: atomic fix — shipments-lock uses increment_shipment_counters RPC

### New Files
- shared/js/supabase-client.js (263 lines) — DB.select/insert/update/batchUpdate/softDelete/hardDelete/rpc, CSS-only spinner (200ms debounce), error classification, tenant_id auto-inject
- shared/js/activity-logger.js (90 lines) — ActivityLog.write/warning/error/critical, fire-and-forget, auto-inject tenant_id/user_id/branch_id
- shared/tests/db-test.html (325 lines) — 9 sections, 20 tests for DB wrapper
- shared/tests/activity-log-test.html (251 lines) — 8 sections, 15 tests for Activity Log

### DB Changes
- CREATE TABLE activity_log (id, tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details JSONB, ip_address, user_agent, created_at) + RLS + 5 indexes
- T.ACTIVITY_LOG constant added to shared.js
- 3 new RPC functions: increment_paid_amount, increment_prepaid_used, increment_shipment_counters

### Modified Files (Atomic RPC fixes)
- modules/purchasing/po-view-import.js — read→compute→write replaced with increment_inventory RPC
- modules/debt/debt-payment-alloc.js — read→compute→write replaced with increment_paid_amount RPC
- modules/goods-receipts/receipt-debt.js — read→compute→write replaced with increment_prepaid_used RPC
- modules/shipments/shipments-lock.js — read→compute→write replaced with increment_shipment_counters RPC

### Bug Fixes
- RLS policy on activity_log corrected from current_setting('app.tenant_id') to request.jwt.claims pattern
- activity-logger.js branch_id UUID validation: skip non-UUID legacy "00" string

### Phase Summary
- 4 new files, ~930 lines of new code
- 4 modified module files (atomic RPC fixes)
- 1 new DB table, 3 new RPC functions, 0 breaking changes
- Atomic RPC scan: 20 patterns checked, 0 remaining read→compute→write patterns

---

## Phase 2 — Core UI Components (2026-03-17)

### New Files
- shared/css/modal.css (233 lines) — Modal CSS: overlay, 5 sizes, 5 types, animations, stack, wizard progress
- shared/js/modal-builder.js (261 lines) — Modal.show/confirm/alert/danger/form/close/closeAll, stack, focus trap, scroll lock
- shared/js/modal-wizard.js (144 lines) — Modal.wizard() extension, multi-step progress, validate/onEnter/onLeave
- shared/css/toast.css (155 lines) — Toast CSS: 4 types, animations, progress bar, RTL
- shared/js/toast.js (131 lines) — Toast.success/error/warning/info/dismiss/clear, max 5, dedup, XSS-safe
- shared/js/pin-modal.js (123 lines) — PIN prompt migration, Modal.show() internally, identical promptPin(title, callback) API
- shared/tests/modal-test.html (251 lines) — sizes, types, stack, keyboard, XSS tests
- shared/tests/toast-test.html (155 lines) — types, duration, stack, dedup, XSS, no-close tests

### Modified Files
- js/pin-modal.js — replaced with 5-line redirect to shared/js/pin-modal.js
- inventory.html — added shared/css/modal.css and shared/js/modal-builder.js
- suppliers-debt.html — added shared/css/modal.css and shared/js/modal-builder.js
- CLAUDE.md — added Iron Rule #12 (global name collision check)

### Bug Fix
- Wizard onFinish/onCancel mutual exclusivity: _finished flag prevents onCancel on successful finish

### Testing
- Modal: 17/17 PASS, Toast: 17/17 PASS, PIN: 8/8 PASS, Regression: 8/8 PASS

### Phase Summary
- 8 new files, ~1,450 lines of new code
- 3 modified HTML files, 1 redirect file
- 0 DB changes, 0 breaking changes

---

## Phase 1 — CSS Foundation ✅ (2026-03-17)

### Commits
- bf36be1: Phase 1 Steps 1-2: Create variables.css with design tokens, init MODULE_MAP and db-schema
- 1d9ff8a: Phase 1 Step 3: Create components.css — buttons, inputs, badges, cards, tables, panels, skeleton, accordion
- c34d1ba: Phase 1 Steps 4-5: Create layout.css and forms.css
- 5ac1d66: Phase 1 Steps 6-7: Create theme-loader.js and ui-test.html test page with 3-palette theme switcher
- (this commit): Phase 1 Step 8: Integration Ceremony — backup, docs update, GLOBAL integration, tag v1.5-phase1

### Summary
- **DB:** ALTER TABLE tenants ADD COLUMN ui_config JSONB DEFAULT '{}'
- **CSS:** 5 files (variables.css 157L, components.css 254L, components-extra.css 214L, layout.css 201L, forms.css 146L) — 70 CSS variables, zero hardcoded colors/sizes/spacing
- **JS:** theme-loader.js (42L) — loadTenantTheme() injects per-tenant CSS overrides from ui_config JSONB
- **Tests:** ui-test.html (252L) — 13 component sections, 3-palette theme switcher proving theming mechanism
- **Verification:** 6 existing pages regression-tested (0 errors), all CSS integrity checks pass, theme-loader edge cases pass

---

## Phase 0 — Infrastructure Setup ✅ (2026-03-17)

### Commits
- ba841d8: Create GLOBAL_MAP.md — global project reference
- b67956e: Create GLOBAL_SCHEMA.sql — full database reference
- 751c146: Update CLAUDE.md — multi-module architecture, global docs, authority matrix
- a81c1c1: Phase 0 fixes: rename ROADMAP, remove non-existent contracts, document RLS known debt
- 7a6fe58: Add RLS permissive warnings to GLOBAL_MAP for 9 tables

### Summary
- Created docs/GLOBAL_MAP.md (full function registry, contracts, module registry, DB ownership)
- Created docs/GLOBAL_SCHEMA.sql (50 tables, full schema)
- Updated CLAUDE.md with multi-module architecture, branching, authority matrix
- Created Module 1.5 directory structure + docs
- Created shared/ directories (css, js, tests)
