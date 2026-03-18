# Module 1.5 — Shared Components Refactor — SESSION_CONTEXT

## Current Status
- **Phase:** 3 complete ✅. Phase 4 (Table Builder + Permissions) next.
- **Branch:** develop
- **Last session:** 2026-03-18

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
- Phase 4 Step 1: Table builder (shared/js/table-builder.js)
- Phase 4 Step 2: Permission-aware UI helpers (shared/js/permission-ui.js)

## Open Issues
- **promptPin name collision (pre-existing):** modules/access-sync/sync-details.js:85 declares global promptPin() (0 params, Promise-based) that overwrites shared/js/pin-modal.js promptPin(title, callback). Not caused by Phase 2. Fix: rename sync version to promptSyncPin() in a future hotfix.
- **Namespace decision for Phase 5:** When doing full migration in Phase 5, all shared/ functions must use namespace pattern (Modal.show, Toast.success, PinModal.prompt). No more bare global functions. This eliminates collision risk permanently.
- **RLS permissive (carried forward):** USING true on 9 tables — deferred to Module 2.
