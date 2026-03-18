# Module 1.5 — Shared Components Refactor — SESSION_CONTEXT

## Current Status
- **Phase:** 4 complete ✅. Phase 5 (Cleanup & Hardening) next.
- **Branch:** develop
- **Last session:** 2026-03-18

## What Was Done — Phase 4 (Table Builder + Permissions)
- Step 1: Created shared/css/table.css (150 lines) — wrapper, header, rows, sort indicators (▲▼ via data-sort-dir), empty/loading states, zebra striping, sticky header, RTL logical properties, responsive
- Step 2: Created shared/js/table-builder.js (296 lines) — TableBuilder.create → TableInstance with setData/setLoading/updateRow/removeRow/getData/destroy. 7 column types (text/number/currency/date/badge/actions/custom), external sort via onSort callback, XSS-safe text columns via textContent
- Step 3: Created shared/tests/table-test.html (235 lines) — 9 sections, 21 tests covering all column types, sort, empty state, loading skeleton, row operations, sticky header, row click, XSS, destroy/recreate
- Step 4: Table Builder testing — 21/21 PASS. 3 bugs found and fixed: double-escaping (text renderer + textContent), sticky header (overflow-x creating scroll context), test page shared.js crash (requires Supabase lib)
- Step 5: Created shared/js/permission-ui.js (53 lines) — PermissionUI.apply/applyTo/check. Wraps hasPermission() from auth-service.js. Supports hide mode (default), disable mode, OR logic (pipe separator). Safe fallback when hasPermission unavailable
- Step 6: Created shared/tests/permission-test.html (190 lines) — 7 sections, 22 tests covering hide, disable, OR logic, applyTo dynamic content, manual check, no-hasPermission fallback, full reset
- Step 7: PermissionUI testing — 22/22 PASS, zero fixes needed
- Step 8: Regression on all 6 pages — 6/6 PASS, zero console errors. Documentation + Integration Ceremony

## What Was Done — Phase 3 (Data Layer)
- Step 1: Created activity_log table + RLS (request.jwt.claims) + 5 indexes + T.ACTIVITY_LOG constant
- Step 2: Created shared/js/supabase-client.js (263 lines) — DB.select/insert/update/batchUpdate/softDelete/hardDelete/rpc + CSS-only spinner (200ms debounce) + error classification (RLS/network/unique/not-found) + tenant_id auto-inject
- Step 3: Created shared/tests/db-test.html (325 lines) — 9 sections, 20 tests
- Step 3 fix: RLS policy corrected from current_setting('app.tenant_id') to request.jwt.claims pattern. Test auth init improved (require JWT explicitly)
- Step 5: Created shared/js/activity-logger.js (90 lines) — ActivityLog.write/warning/error/critical, fire-and-forget, auto-inject tenant_id/user_id/branch_id
- Step 7 fix: branch_id UUID validation — skip non-UUID legacy "00" string
- Step 6: Created shared/tests/activity-log-test.html (251 lines) — 8 sections, 15 tests
- Step 8: Atomic RPC scan — 20 patterns scanned: 13 already atomic (RPC), 4 safe (read-only/no race), 4 needed fix
- Step 9a: po-view-import.js → increment_inventory RPC (commit e3456c0)
- Step 9b: debt-payment-alloc.js → increment_paid_amount RPC (commit 5f07211)
- Step 9c: receipt-debt.js → increment_prepaid_used RPC (commit 9ec6cdc)
- Step 9d: shipments-lock.js → increment_shipment_counters RPC (commit 44776bd)

## What Was Done — Phase 2 (Core UI Components)
- Step 1: Created shared/css/modal.css (233 lines) — overlay, 5 sizes, 5 types, animations, stack, wizard progress
- Step 2: Created shared/js/modal-builder.js (261 lines) — Modal.show/confirm/alert/danger/form/close/closeAll
- Step 2: Created shared/js/modal-wizard.js (144 lines) — Modal.wizard() extension, split from builder
- Step 2 fix: Wizard onFinish/onCancel now mutually exclusive (flag-based)
- Step 3: Created shared/tests/modal-test.html (251 lines) — 5 sections: sizes, types, stack, keyboard, XSS
- Step 4: Modal testing — 17/17 PASS
- Step 5: Created shared/css/toast.css (155 lines) — 4 types, animations, progress bar, RTL
- Step 6: Created shared/js/toast.js (131 lines) — success/error/warning/info/dismiss/clear, XSS-safe
- Step 7: Created shared/tests/toast-test.html (155 lines) — 6 sections: types, duration, stack, dedup, XSS, no-close
- Step 8: Toast testing — 17/17 PASS
- Step 9: Created shared/js/pin-modal.js (123 lines) — migration using Modal.show(), identical promptPin() API
- Step 10: js/pin-modal.js → redirect one-liner. Added modal.css + modal-builder.js to inventory.html and suppliers-debt.html
- Step 11: PIN testing — 8/8 PASS
- Step 12: Regression — 8/8 PASS (all 6 pages + old modals + old toast coexistence)
- Added Iron Rule #12 to CLAUDE.md: Global name collision check

## What's Next
- Phase 5 Step 1: Zero hardcoded values scan (business names, addresses, VAT rates)
- Phase 5 Step 2: custom_fields JSONB column on inventory
- Phase 5 Step 3: inventory.html migration (CSS → shared/, modals → Modal.*, toasts → Toast.*)

## Open Issues
- **promptPin name collision (pre-existing):** modules/access-sync/sync-details.js:85 declares global promptPin() (0 params, Promise-based) that overwrites shared/js/pin-modal.js promptPin(title, callback). Not caused by Phase 2. Fix: rename sync version to promptSyncPin() in a future hotfix.
- **Namespace decision for Phase 5:** When doing full migration in Phase 5, all shared/ functions must use namespace pattern (Modal.show, Toast.success, PinModal.prompt). No more bare global functions. This eliminates collision risk permanently.
- **RLS permissive (carried forward):** USING true on 9 tables — deferred to Module 2.
