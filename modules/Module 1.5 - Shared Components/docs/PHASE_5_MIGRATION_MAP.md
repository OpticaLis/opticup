# Phase 5 — Migration Map (Step 0)

> **Generated:** 2026-03-18
> **Scope:** 5 pages — inventory.html, employees.html, settings.html, index.html, shipments.html
> **Excluded:** suppliers-debt.html (deferred)
> **Purpose:** Map every modal, toast/alert, and permission check that needs migration to shared/ components

---

## inventory.html

**JS files loaded (46):** shared.js, auth-service.js, modal-builder.js, pin-modal.js, supabase-ops.js, data-loading.js, search-select.js, file-upload.js, + 10 inventory/ + 5 purchasing/ + 7 goods-receipts/ + 3 audit/ + 2 brands/ + 4 access-sync/ + 2 admin/ + 4 stock-count/ + header.js, alerts-badge.js

### Modals

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | inventory.html | 574 | `id="image-preview-modal"` class="modal-overlay" | Image preview modal (inline HTML) | Modal.show({ size: 'lg' }) |
| 2 | inventory.html | 583 | `id="admin-modal"` class="modal-overlay" | Admin password modal (inline HTML) | Modal.form({ size: 'sm' }) |
| 3 | inventory.html | 594 | `id="confirm-modal"` class="modal-overlay" | Reusable confirm dialog (used by confirmDialog()) | **Remove** — replaced by Modal.confirm() |
| 4 | inventory.html | 604 | `id="sample-modal"` class="modal-overlay" | Sample/template modal (inline HTML) | Modal.show() |
| 5 | inventory.html | 621 | `id="mismatch-modal"` class="modal-overlay" | Barcode mismatch modal for reduction | Modal.show({ size: 'md' }) |
| 6 | inventory.html | 631 | `id="softdel-modal"` class="modal-overlay" | Soft delete confirmation modal | Modal.confirm() or Modal.show() |
| 7 | inventory.html | 663 | `id="recycle-modal"` class="modal-overlay" | Recycle bin modal (inline HTML) | Modal.show({ size: 'xl' }) |
| 8 | inventory.html | 672 | `id="history-modal"` class="modal-overlay" | Item history modal (inline HTML) | Modal.show({ size: 'xl' }) |
| 9 | inventory.html | 684 | `id="qty-modal"` class="modal-overlay" | Quantity change modal (+/-) | Modal.show({ size: 'md' }) |
| 10 | shared.js | 227 | `confirmDialog()` function | Reusable yes/no dialog — used by 14+ callers | Modal.confirm() wrapper |
| 11 | shared.js | 281 | `showInfoModal()` function | Info modal with HTML body (used by debt only, but function is global) | Modal.show() wrapper |
| 12 | inventory-entry.js | 221 | `confirmDialog('אישור שליחה', ...)` | Confirm entry submission | Modal.confirm() (via wrapper) |
| 13 | excel-import.js | 159 | `confirmDialog('אישור ייבוא', ...)` | Confirm Excel import | Modal.confirm() (via wrapper) |
| 14 | inventory-edit.js | 79 | `confirmDialog('עדכון גורף', ...)` | Confirm bulk update | Modal.confirm() (via wrapper) |
| 15 | inventory-edit.js | 107 | `confirmDialog('מחיקה גורפת', ...)` | Confirm bulk delete | Modal.confirm() (via wrapper) |
| 16 | inventory-edit.js | 114 | `div.className = 'modal-overlay'` | Bulk delete PIN modal (JS-created) | PinModal.prompt() |
| 17 | inventory-edit.js | 308 | `confirmDialog('שמירת שינויים', ...)` | Confirm save changes | Modal.confirm() (via wrapper) |
| 18 | inventory-reduction.js | 117 | `closeModal('mismatch-modal')` | Close mismatch modal | Modal.close() |
| 19 | inventory-reduction.js | 323 | `closeModal('reduce-modal')` | Close reduction modal | Modal.close() |
| 20 | access-sales.js | 30 | `confirmDialog('הקובץ הזה כבר עובד...')` | Confirm duplicate file import | Modal.confirm() (via wrapper) |
| 21 | inventory-return.js | 69 | `'<div class="modal-overlay"...'` | Supplier return modal (JS-created HTML) | Modal.form({ size: 'lg' }) |
| 22 | receipt-ocr.js | 251 | `overlay.className = 'modal-overlay'` | OCR review modal (JS-created) | Modal.show({ size: 'lg' }) |
| 23 | receipt-form.js | 331 | `overlay.className = 'modal-overlay'` | Receipt form image preview (JS-created) | Modal.show({ size: 'md' }) |
| 24 | receipt-confirm.js | 121 | `confirmDialog('לא צורף מסמך', ...)` | Warn no document attached | Modal.confirm() (via wrapper) |
| 25 | receipt-confirm.js | 127 | `confirmDialog('אישור קבלת סחורה', ...)` | Confirm receipt approval | Modal.confirm() (via wrapper) |
| 26 | receipt-confirm.js | 223 | `confirmDialog('חריגות מחיר...', ...)` | Price deviation warning | Modal.confirm() (via wrapper) |
| 27 | receipt-confirm.js | 249 | `confirmDialog('אישור קבלה', ...)` | Confirm receipt | Modal.confirm() (via wrapper) |
| 28 | receipt-actions.js | 162 | `confirmDialog('ביטול קבלה', ...)` | Cancel receipt confirmation | Modal.confirm() (via wrapper) |
| 29 | audit-log.js | 62 | `closeModal('softdel-modal')` | Close soft delete modal | Modal.close() |
| 30 | audit-log.js | 156 | `confirmDialog('מחיקה לצמיתות', ...)` | Permanent delete confirmation | Modal.danger() |
| 31 | audit-log.js | 165 | `div.className = 'modal-overlay'` | Permanent delete PIN modal (JS-created) | PinModal.prompt() |
| 32 | item-history.js | 131 | `div.className = 'modal-overlay'` | History detail overlay (JS-created) | Modal.show({ size: 'lg' }) |
| 33 | qty-modal.js | 106 | `closeModal('qty-modal')` | Close quantity modal | Modal.close() |
| 34 | brands.js | 122 | `confirmDialog(isActive ? ...)` | Brand activate/deactivate confirmation | Modal.confirm() (via wrapper) |
| 35 | po-view-import.js | 114 | `confirmDialog('קליטה למלאי', ...)` | Import PO to inventory confirmation | Modal.confirm() (via wrapper) |
| 36 | po-actions.js | 200 | `confirmDialog('שליחת הזמנה', ...)` | Send PO confirmation | Modal.confirm() (via wrapper) |
| 37 | po-actions.js | 221 | `confirmDialog('ביטול הזמנה', ...)` | Cancel PO confirmation | Modal.confirm() (via wrapper) |
| 38 | sync-details.js | 91 | `overlay.className = 'modal-overlay'` | Sync detail overlay (JS-created) | Modal.show({ size: 'lg' }) |
| 39 | stock-count-session.js | 334 | `Modal.confirm({...})` | **Already migrated** — uses Modal.confirm() | No change needed |
| 40 | stock-count-session.js | 845 | `confirmDialog('להחזיר פריט...')` | Uncount item confirmation | Modal.confirm() (via wrapper) |
| 41 | stock-count-session.js | 861 | `confirmDialog('הספירה תישמר...')` | Pause count confirmation | Modal.confirm() (via wrapper) |
| 42 | stock-count-report.js | 213 | `confirmDialog('האם לבטל...')` | Cancel count confirmation | Modal.confirm() (via wrapper) |

### Toasts / Alerts

| # | File | Line(s) | Count | Description | Migration Target |
|---|------|---------|-------|-------------|-----------------|
| 1 | shared.js | 216 | — | `toast()` function definition | Rewrite to delegate to Toast.* |
| 2 | inventory-export.js | 9-191 | 11 | toast() calls — barcode/export success, errors, warnings | Toast.* (via wrapper) |
| 3 | access-sales.js | 22-256 | 4 | toast() calls — import errors, sync results | Toast.* (via wrapper) |
| 4 | excel-import.js | 269-335 | 4 | toast() calls — import pending, barcode, export | Toast.* (via wrapper) |
| 5 | inventory-returns-actions.js | 11-163 | 13 | toast() calls — return status, export | Toast.* (via wrapper) |
| 6 | inventory-reduction.js | 21-330 | 15 | toast() calls — CSV errors, search, reduction | Toast.* (via wrapper) |
| 7 | inventory-edit.js | 39-348 | 18 | toast() calls — admin check, bulk ops, edit, save | Toast.* (via wrapper) |
| 8 | inventory-entry.js | 210-294 | 5 | toast() calls — submit entry, errors | Toast.* (via wrapper) |
| 9 | inventory-return.js | 13-213 | 11 | toast() calls — supplier return flow | Toast.* (via wrapper) |
| 10 | receipt-ocr.js | 40-244 | 7 | toast() calls — OCR scan, match results | Toast.* (via wrapper) |
| 11 | receipt-confirm.js | 65-258 | 12 | toast() calls — receipt confirm, validation | Toast.* (via wrapper) |
| 12 | receipt-excel.js | 15-173 | 8 | toast() calls — Excel import/export for receipts | Toast.* (via wrapper) |
| 13 | receipt-form.js | 12-286 | 11 | toast() calls — barcode search, validation | Toast.* (via wrapper) |
| 14 | receipt-actions.js | 8-172 | 9 | toast() calls — save draft, cancel receipt | Toast.* (via wrapper) |
| 15 | goods-receipt.js | 94-97 | 2 | toast() calls — load PO items | Toast.* (via wrapper) |
| 16 | audit-log.js | 63-212 | 5 | toast() calls — soft/hard delete, restore | Toast.* (via wrapper) |
| 17 | qty-modal.js | 8-112 | 8 | toast() calls — qty change validation, success | Toast.* (via wrapper) |
| 18 | item-history.js | 90-332 | 7 | toast() calls — export, date range errors | Toast.* (via wrapper) |
| 19 | brands.js | 127-224 | 5 | toast() calls — brand save, activate | Toast.* (via wrapper) |
| 20 | suppliers.js | 28-163 | 12 | toast() calls — supplier CRUD, validation | Toast.* (via wrapper) |
| 21 | purchase-orders.js | 170 | 1 | toast() — supplier number missing | Toast.* (via wrapper) |
| 22 | po-form.js | 67-141 | 3 | toast() calls — PO form errors | Toast.* (via wrapper) |
| 23 | po-actions.js | 3-234 | 14 | toast() calls — PO save, send, cancel | Toast.* (via wrapper) |
| 24 | po-items.js | 63-226 | 4 | toast() calls — PO item add, duplicate | Toast.* (via wrapper) |
| 25 | po-view-import.js | 108-287 | 6 | toast() calls — import to inventory | Toast.* (via wrapper) |
| 26 | sync-details.js | 16-78 | 3 | toast() calls — sync detail errors | Toast.* (via wrapper) |
| 27 | access-sync.js | 222-290 | 2 | toast() calls — retry, refresh | Toast.* (via wrapper) |
| 28 | pending-resolve.js | 16-128 | 7 | toast() calls — pending item resolve | Toast.* (via wrapper) |
| 29 | system-log.js | 180-213 | 3 | toast() calls — log export | Toast.* (via wrapper) |
| 30 | admin.js | 8 | 1 | toast() — admin mode activated | Toast.* (via wrapper) |
| 31 | stock-count-session.js | 116-863 | 14 | toast() calls — count create, scan, errors | Toast.* (via wrapper) |
| 32 | stock-count-report.js | 21-261 | 10 | toast() calls — report, approve, cancel | Toast.* (via wrapper) |
| 33 | stock-count-list.js | 114 | 1 | toast() — coming soon | Toast.* (via wrapper) |
| 34 | inventory-edit.js | 73-96 | 2 | setAlert('inv-alerts',...) — bulk sync warnings | Toast.warning() or keep inline |
| 35 | stock-count-list.js | 87 | 1 | setAlert('sc-list-alerts',...) — load error | Toast.error() or keep inline |
| 36 | goods-receipt.js | 248 | 1 | setAlert('rcpt-list-alerts',...) — load error | Toast.error() or keep inline |
| 37 | goods-receipt.js | 274 | 1 | clearAlert('rcpt-form-alerts') — clear on new form | N/A (remove if setAlert migrated) |
| 38 | receipt-form.js | 92 | 1 | clearAlert('rcpt-form-alerts') — clear on new form | N/A (remove if setAlert migrated) |
| 39 | system-log.js | 76-157 | 2 | clearAlert/setAlert('slog-alerts') — log errors | Toast.error() or keep inline |
| 40 | brands.js | 46-203 | 2 | setAlert('brands-alerts',...) — brand errors | Toast.error() or keep inline |
| 41 | supabase-ops.js | 237 | 1 | toast() — writeLog error | Toast.* (via wrapper) |
| 42 | data-loading.js | 127-130 | 2 | toast() — data loaded / error | Toast.* (via wrapper) |
| 43 | auth-service.js | 253-308 | 3 | toast() — permission denied, role update, force logout | Toast.* (via wrapper) |
| 44 | file-upload.js | 16-46 | 3 | toast() — upload validation, errors | Toast.* (via wrapper) |
| 45 | alerts-badge.js | 237-301 | 3 | toast() — alert update errors | Toast.* (via wrapper) |

**Toast migration strategy:** The existing `toast()` function in shared.js (line 216) is used by ~200 call sites. Recommended approach: **rewrite `toast()` to delegate to `Toast.*`** rather than replacing each call individually. Map: type 's' → Toast.success(), 'e' → Toast.error(), 'w' → Toast.warning(), 'i' → Toast.info(), default → Toast.success().

### Permissions

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | inventory.html | 29-37 | 9× `data-tab-permission="..."` | Tab visibility (9 tabs) | PermissionUI.apply() + keep attributes |
| 2 | inventory.html | 49 | `data-tab-permission="goods_receipt.create"` | Receipt entry button | PermissionUI.apply() |
| 3 | inventory.html | 60-677 | 20× `data-permission="..."` | Button visibility (add row, export, delete, etc.) | PermissionUI.apply() + keep attributes |
| 4 | inventory-edit.js | 39 | `if (!isAdmin)` | Bulk update admin check | hasPermission() or data-permission |
| 5 | inventory-edit.js | 104 | `if (!isAdmin)` | Bulk delete admin check | hasPermission() or data-permission |
| 6 | inventory-edit.js | 237 | `if (!isAdmin) return` | Cost price visibility check | hasPermission() or data-permission |
| 7 | admin.js | 5 | `isAdmin = hasPermission('settings.edit')` | Admin mode activation | No change (already uses hasPermission) |
| 8 | admin.js | 29 | `hasPermission('settings.edit')` | Auto-activate admin | No change |
| 9 | admin.js | 50 | `applyUIPermissions()` | Apply UI permissions after admin mode | → PermissionUI.apply() |
| 10 | stock-count-report.js | 168 | `hasPermission('stock_count.approve')` | Check approve permission | No change (already uses hasPermission) |
| 11 | auth-service.js | 271 | `applyUIPermissions()` function def | Global UI permission scanner | → Delegate to PermissionUI.apply() |

---

## employees.html

**JS files loaded (7):** shared.js, auth-service.js, supabase-ops.js, data-loading.js, employee-list.js, header.js, alerts-badge.js

### Modals

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | employees.html | 34 | `id="confirm-modal"` class="modal-overlay" | Reusable confirm dialog (inline HTML) | **Remove** — replaced by Modal.confirm() |
| 2 | employee-list.js | 156 | `class="modal-overlay" id="emp-modal"` | Employee create/edit modal (JS-created HTML) | Modal.form({ size: 'md' }) |
| 3 | employee-list.js | 169 | `closeModal('emp-modal')` | Close employee modal | Modal.close() |
| 4 | employee-list.js | 213 | `closeModal('emp-modal')` | Close after save | Modal.close() |
| 5 | employee-list.js | 223 | `confirmDialog('השבתת עובד', ...)` | Deactivate employee confirmation | Modal.confirm() (via wrapper) |

### Toasts / Alerts

| # | File | Line(s) | Count | Description | Migration Target |
|---|------|---------|-------|-------------|-----------------|
| 1 | employee-list.js | 31-321 | 11 | toast() calls — CRUD, validation, role update | Toast.* (via wrapper) |
| 2 | auth-service.js | 253-308 | 3 | toast() — permission, role, logout | Toast.* (via wrapper) |
| 3 | data-loading.js | 127-130 | 2 | toast() — data loaded/error | Toast.* (via wrapper) |
| 4 | alerts-badge.js | 237-301 | 3 | toast() — alert errors | Toast.* (via wrapper) |

### Permissions

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | employee-list.js | 55 | `hasPermission('employees.create')` | Show/hide create button | No change (already uses hasPermission) |
| 2 | employee-list.js | 62 | `hasPermission('settings.view')` | Show/hide role assignment | No change |
| 3 | employee-list.js | 68 | `hasPermission('settings.view')` | Show/hide permission matrix | No change |
| 4 | employee-list.js | 94 | `hasPermission('employees.edit')` | Row edit button visibility | No change |
| 5 | employee-list.js | 95 | `hasPermission('employees.delete')` | Row deactivate button visibility | No change |
| 6 | employee-list.js | 269 | `hasPermission('settings.edit')` | Permission matrix edit access | No change |

---

## settings.html

**JS files loaded (6):** shared.js, auth-service.js, supabase-ops.js, header.js, alerts-badge.js, settings-page.js

### Modals

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | settings.html | 138 | `id="confirm-modal"` class="modal-overlay" | Reusable confirm dialog (inline HTML) | **Remove** — replaced by Modal.confirm() |
| 2 | settings-page.js | 137 | `confirmDialog('מחיקת לוגו', ...)` | Delete logo confirmation | Modal.confirm() (via wrapper) |

### Toasts / Alerts

| # | File | Line(s) | Count | Description | Migration Target |
|---|------|---------|-------|-------------|-----------------|
| 1 | settings-page.js | 31-214 | 16 | toast() calls — load, upload, save, validation | Toast.* (via wrapper) |
| 2 | auth-service.js | 253-308 | 3 | toast() — permission, role, logout | Toast.* (via wrapper) |
| 3 | alerts-badge.js | 237-301 | 3 | toast() — alert errors | Toast.* (via wrapper) |

### Permissions

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | settings-page.js | 166 | `hasPermission('settings.edit')` | Check edit permission before save | No change (already uses hasPermission) |

---

## index.html

**JS files loaded (5):** shared.js, auth-service.js, header.js, alerts-badge.js + Supabase CDN

### Modals

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| — | — | — | — | **No modals found.** Login is inline HTML, not a modal-overlay. | — |

### Toasts / Alerts

| # | File | Line(s) | Count | Description | Migration Target |
|---|------|---------|-------|-------------|-----------------|
| 1 | auth-service.js | 253-308 | 3 | toast() — permission, role, logout | Toast.* (via wrapper) |
| 2 | alerts-badge.js | 237-301 | 3 | toast() — alert errors | Toast.* (via wrapper) |

### Permissions

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| — | — | — | — | **No permission checks found.** Login page — no guarded elements. | — |

---

## shipments.html

**JS files loaded (15):** shared.js, supabase-ops.js, data-loading.js, search-select.js, auth-service.js, header.js, alerts-badge.js, + 9 shipments/*.js

### Modals

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | shipments.html | 244 | `id="confirm-modal"` class="modal-overlay" | Reusable confirm dialog (inline HTML) | **Remove** — replaced by Modal.confirm() |
| 2 | shipments-create.js | 23 | `'<div class="modal-overlay"...'` | Wizard box (3-step create wizard, JS-created) | Modal.wizard() or Modal.show({ size: 'xl' }) |
| 3 | shipments-couriers.js | 13 | `'<div class="modal-overlay"...'` | Courier settings modal (JS-created) | Modal.show({ size: 'lg' }) |
| 4 | shipments-lock.js | 134 | `confirm('ליצור ארגז תיקון...')` | **Native confirm()** — create correction box | Modal.confirm() |
| 5 | shipments-lock.js | 220 | `confirm('להסיר את הפריט...')` | **Native confirm()** — remove item from box | Modal.confirm() |

### Toasts / Alerts

| # | File | Line(s) | Count | Description | Migration Target |
|---|------|---------|-------|-------------|-----------------|
| 1 | shipments-settings.js | 301-308 | 3 | toast() — settings save, validation | Toast.* (via wrapper) |
| 2 | shipments-lock.js | 70-252 | 13 | toast() — lock/unlock, add/remove items | Toast.* (via wrapper) |
| 3 | shipments-list.js | 151-230 | 3 | toast() — list load, export | Toast.* (via wrapper) |
| 4 | shipments-items.js | 190-319 | 7 | toast() — add item, validation, return status | Toast.* (via wrapper) |
| 5 | shipments-detail.js | 21-342 | 7 | toast() — load, add, save, print | Toast.* (via wrapper) |
| 6 | shipments-create.js | 169-318 | 7 | toast() — wizard validation, create | Toast.* (via wrapper) |
| 7 | shipments-couriers.js | 122-230 | 10 | toast() — courier CRUD, settings | Toast.* (via wrapper) |
| 8 | auth-service.js | 253-308 | 3 | toast() — permission, role, logout | Toast.* (via wrapper) |
| 9 | data-loading.js | 127-130 | 2 | toast() — data loaded/error | Toast.* (via wrapper) |
| 10 | alerts-badge.js | 237-301 | 3 | toast() — alert errors | Toast.* (via wrapper) |

### Permissions

| # | File | Line | Pattern | Description | Migration Target |
|---|------|------|---------|-------------|-----------------|
| 1 | shipments.html | 214 | `data-permission="shipments.create"` | New box button | PermissionUI.apply() + keep attribute |
| 2 | shipments.html | 215 | `data-permission="shipments.settings"` | Courier settings button | PermissionUI.apply() + keep attribute |
| 3 | shipments-list.js | 15 | `hasPermission('shipments.view')` | Page access guard (redirect if no perm) | No change (already uses hasPermission) |
| 4 | shipments-list.js | 18 | `applyUIPermissions()` | Apply UI permissions on load | → PermissionUI.apply() |

---

## Global Infrastructure (shared across all 5 pages)

These items live in js/shared.js and js/auth-service.js — loaded by every page:

| # | File | Function | Description | Migration Approach |
|---|------|----------|-------------|-------------------|
| 1 | shared.js:216 | `toast(msg, type)` | Toast notification function (type: s/e/w/i) | **Rewrite body** to delegate to Toast.success/error/warning/info |
| 2 | shared.js:225 | `closeModal(id)` | Hide modal by display:none | Keep for backward compat during migration, deprecate after |
| 3 | shared.js:227 | `confirmDialog(title, text)` | Yes/no confirm using #confirm-modal | **Rewrite body** to use Modal.confirm() and return Promise |
| 4 | shared.js:281 | `showInfoModal(title, bodyHTML)` | Info modal with HTML body | **Rewrite body** to use Modal.show() |
| 5 | auth-service.js:271 | `applyUIPermissions()` | Scan data-permission + data-tab-permission | **Rewrite body** to delegate to PermissionUI.apply() |
| 6 | shared.js:various | `setAlert(id, html, type)` / `clearAlert(id)` | Inline alert in specific containers | Keep as-is (different pattern from toast — contextual inline alerts) |

**Key insight:** By rewriting `toast()`, `confirmDialog()`, `showInfoModal()`, and `applyUIPermissions()` to delegate to their shared/ equivalents, **~200+ call sites migrate automatically** without touching individual module files.

---

## Summary

| Page | Modals | Toasts/Alerts | Permissions | Total Items |
|------|--------|---------------|-------------|-------------|
| **inventory.html** | 42 | 45 | 11 | **98** |
| **employees.html** | 5 | 4 | 6 | **15** |
| **settings.html** | 2 | 3 | 1 | **6** |
| **index.html** | 0 | 2 | 0 | **2** |
| **shipments.html** | 5 | 10 | 4 | **19** |
| **TOTAL** | **54** | **64** | **22** | **140** |

### Key Observations

1. **inventory.html is by far the most complex** — 98 migration items across 46 JS files.
2. **Toast migration via wrapper is efficient** — rewriting `toast()` in shared.js covers ~195+ call sites automatically.
3. **confirmDialog() rewrite covers ~18 confirm modals** across all pages automatically.
4. **9 inline HTML modals** in inventory.html need individual migration (ids: image-preview, admin, confirm, sample, mismatch, softdel, recycle, history, qty).
5. **6 JS-created modals** (inventory-edit PIN, inventory-return, receipt-ocr, receipt-form, audit-log PIN, item-history) need refactoring.
6. **2 native confirm()** calls in shipments-lock.js need migration to Modal.confirm().
7. **`applyUIPermissions()` already exists in auth-service.js** — just needs to delegate to PermissionUI.apply().
8. **`data-tab-permission` attributes** (9 in inventory.html) need PermissionUI to support this pattern (currently only handles `data-permission`).
9. **setAlert/clearAlert** are contextual inline alerts (inside specific divs) — different from toasts. Keep as-is.
10. **stock-count-session.js already uses Modal.confirm()** — partial migration already done in Phase 4.

### Risk: data-tab-permission

PermissionUI currently only handles `data-permission`. inventory.html uses `data-tab-permission` on 9 tab buttons. Either:
- (A) Extend PermissionUI to also scan `data-tab-permission`, or
- (B) Rename them all to `data-permission` during migration

**Recommendation:** Option A — add `data-tab-permission` support to PermissionUI.apply() (small change, backward compatible).
