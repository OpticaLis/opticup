# Module 1.5 — Shared Components Refactor — MODULE_SPEC

## Current State (Phase 5 complete)

### DB Changes
- `tenants.ui_config` (JSONB, default '{}') — per-tenant CSS variable overrides. Keys must start with `--` to be injected.
- `activity_log` table — system-level event log: level (info/warning/error/critical), action, entity_type, entity_id, details JSONB. RLS via request.jwt.claims + 5 indexes.
- `inventory.custom_fields` (JSONB, default '{}') — per-tenant dynamic fields. No UI yet.

### shared/css/ (8 files, 1,510 lines)

| File | Lines | Description |
|------|-------|-------------|
| variables.css | 157 | 70 CSS custom properties: colors (primary 4, semantic 16, neutral 12, background 3), typography (family 1, sizes 6, weights 4, line-heights 3), spacing (6-step scale), border-radius (4), shadows (3), z-index (5), transitions (3) |
| components.css | 254 | Buttons (primary/secondary/danger/ghost × sm/md/lg), inputs, selects, textareas, badges (success/error/warning/info/neutral), cards (header/body/footer) |
| components-extra.css | 214 | Table base (header/row/cell/sortable), slide-in panel (RTL, overlay), skeleton loaders (text/circle/rect/row + pulse), accordion (CSS-only open/close) |
| layout.css | 201 | Page structure (container/header/content), sticky header, flex helpers, grid helpers (2/3/4 col), RTL utilities (logical properties), visibility, print styles |
| forms.css | 146 | Form layout: form-group, form-label, form-required, form-error/form-help, form-row, form-col-2, form-actions, form-inline, mobile responsive |
| modal.css | 233 | Modal system: overlay (fixed, z-modal), container (flex column, 90vh max), header/body/footer, close button. 5 sizes (sm/md/lg/xl/fullscreen). 5 types (default/confirm/alert/danger/wizard). Wizard step indicators. Animations (entering/leaving). Stack support. Responsive. |
| toast.css | 155 | Toast notifications: container (fixed, z-toast, top-start), toast item (border-inline-start colored by type), icon/content/close/progress bar. 4 types (success/error/warning/info). 3 animations (enter/leave/progress). CSS custom property --toast-duration. Responsive. |
| table.css | 150 | Table builder: .tb-wrapper (overflow-x), .tb-table, .tb-header, .tb-th (sortable with ▲▼ via data-sort-dir), .tb-row (zebra, hover), .tb-td (actions flex), empty state (icon/text/CTA), loading skeleton (pulse), sticky header (.tb-wrapper-sticky), responsive. All via CSS variables. |

### shared/js/ (9 files, 1,359 lines)

| File | Lines | Description |
|------|-------|-------------|
| theme-loader.js | 42 | `loadTenantTheme(tenantRow)` — reads ui_config JSONB, injects `--` prefixed keys as `:root` CSS overrides via setProperty(). Zero DB calls, standalone, no innerHTML. |
| modal-builder.js | 261 | Modal system core. Global `Modal` object: show/confirm/alert/danger/form/close/closeAll. Stack management, focus trap, body scroll lock, Escape key, open/close animations. Private `_escapeHtml()`. Zero JS dependencies. |
| modal-wizard.js | 144 | Wizard extension for Modal. `Modal.wizard(config)`. Multi-step progress bar, back/next/finish buttons, step validate/onEnter/onLeave callbacks. Depends on modal-builder.js. |
| toast.js | 131 | Toast notification system. Global `Toast` object: success/error/warning/info/dismiss/clear. Max 5 visible, duplicate prevention via id, auto-dismiss with CSS progress bar, XSS-safe. Zero dependencies. |
| pin-modal.js | 127 | PIN prompt modal. Global `PinModal.prompt(title, callback)` + legacy `promptPin(title, callback)` alias. Uses Modal.show() internally. 5-digit split input with auto-advance, backspace, paste, auto-submit. Depends on modal-builder.js + auth-service.js. |
| supabase-client.js | 263 | Supabase wrapper. Global `DB` object: select/insert/update/batchUpdate/softDelete/hardDelete/rpc. CSS-only spinner (200ms debounce), error classification (RLS/network/unique/not-found), tenant_id auto-inject, Toast optional. Depends on sb + getTenantId(). |
| activity-logger.js | 90 | Activity log helper. Global `ActivityLog` object: write/warning/error/critical. Fire-and-forget, auto-inject tenant_id/user_id/branch_id. Uses DB.insert or sb.from() fallback. Zero CSS dependencies. |
| table-builder.js | 296 | Table builder. Global `TableBuilder` object: create(config) → TableInstance with setData/setLoading/updateRow/removeRow/getData/destroy. 7 column types (text/number/currency/date/badge/actions/custom). External sort via onSort callback. XSS-safe text via textContent. Soft dep on escapeHtml(). |
| permission-ui.js | 70 | Permission-aware UI. Global `PermissionUI` object: apply()/applyTo(container)/check(perm). Scans [data-permission] and [data-tab-permission] attributes, hide or disable elements. OR logic via pipe separator. Wraps hasPermission() from auth-service.js. Safe fallback when unavailable. |

### shared/tests/ (7 files, 1,659 lines)

| File | Lines | Description |
|------|-------|-------------|
| ui-test.html | 252 | Visual test page: 13 component sections, 3-palette theme switcher using loadTenantTheme(). RTL, Hebrew, self-contained. |
| modal-test.html | 251 | Modal system test page: 5 sections — sizes, types, stack, keyboard, XSS. Log area for event output. RTL, Hebrew, self-contained. |
| toast-test.html | 155 | Toast system test page: 6 sections — types, duration, stack, dedup, XSS, no-close. Log area for event output. RTL, Hebrew, self-contained. |
| db-test.html | 325 | DB wrapper test page: 9 sections — select, insert, update, batchUpdate, softDelete/hardDelete, RPC, spinner, error handling, cleanup. Requires JWT session. |
| activity-log-test.html | 251 | Activity log test page: 8 sections — write, warning, error, critical, changeset format, fire-and-forget, validation, cleanup. Requires JWT session. |
| table-test.html | 235 | Table builder test page: 9 sections — basic (all types), sort, empty state, loading, row ops, sticky header, row click, XSS, destroy. Self-contained with mock data. |
| permission-test.html | 190 | Permission UI test page: 7 sections — hide, disable, OR logic, applyTo dynamic, manual check, no-hasPermission fallback, full reset. Mock hasPermission inline. |

### Integration Points

| File | Path | Lines | Purpose |
|------|------|-------|---------|
| pin-modal.js (redirect) | js/pin-modal.js | 5 | Backward-compat redirect to shared/js/pin-modal.js via document.write(). Kept for suppliers-debt.html. |

Pages migrated to shared/ components:

| Page | Shared CSS | Shared JS | Page CSS |
|------|-----------|----------|----------|
| inventory.html | All 8 shared/css/* | All 9 shared/js/* | css/inventory.css |
| employees.html | All 8 shared/css/* | All 9 shared/js/* | css/employees.css |
| settings.html | All 8 shared/css/* | All 9 shared/js/* | css/settings.css |
| shipments.html | All 8 shared/css/* | All 9 shared/js/* | css/shipments.css |
| index.html | 5 shared/css/* | 4 shared/js/* | inline styles |
| suppliers-debt.html | shared/css/modal.css only | shared/js/modal-builder.js only | css/styles.css (legacy) |

Wrapper functions (js/shared.js + js/auth-service.js):

| Function | Delegates to | Fallback |
|----------|-------------|----------|
| toast(msg, type) | Toast.success/error/warning/info | Original DOM-based toast |
| confirmDialog(title, text) | Modal.confirm() | Original #confirm-modal |
| showInfoModal(title, html) | Modal.show() | Original overlay builder |
| applyUIPermissions() | PermissionUI.apply() | Original querySelectorAll scan |

### Contracts (Public API)

**CSS Variables (70 tokens):**
- `--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-dark`
- `--color-success[-light/-hover/-dark]`, `--color-error[-light/-hover/-dark]`, `--color-warning[-light/-hover/-dark]`, `--color-info[-light/-hover/-dark]`
- `--color-white`, `--color-gray-50` through `--color-gray-900`, `--color-black`
- `--color-bg-page`, `--color-bg-card`, `--color-bg-input`
- `--font-family`, `--font-size-xs` through `--font-size-2xl`, `--font-weight-normal/medium/semibold/bold`
- `--line-height-tight/normal/relaxed`
- `--space-xs/sm/md/lg/xl/2xl`
- `--radius-sm/md/lg/full`
- `--shadow-sm/md/lg`
- `--z-dropdown/sticky/overlay/modal/toast`
- `--transition-fast/normal/slow`

**CSS Classes:**
- Buttons: `.btn`, `.btn-primary/secondary/danger/ghost`, `.btn-sm/md/lg`
- Inputs: `.input`, `.input-error`, `.input-disabled`
- Selects: `.select`, `.select-error`
- Textareas: `.textarea`, `.textarea-error`
- Badges: `.badge`, `.badge-success/error/warning/info/neutral`
- Cards: `.card`, `.card-header`, `.card-body`, `.card-footer`
- Tables: `.table`, `.table-header`, `.table-row`, `.table-cell`, `.table-sortable`, `.table-sort-active`
- Panels: `.slide-panel`, `.slide-panel-open`, `.slide-panel-overlay`, `.slide-panel-header`, `.slide-panel-body`
- Skeleton: `.skeleton-text`, `.skeleton-circle`, `.skeleton-rect`, `.skeleton-row`
- Accordion: `.accordion`, `.accordion-open`, `.accordion-header`, `.accordion-content`
- Layout: `.page-container`, `.page-header`, `.page-content`, `.flex`, `.flex-col`, `.flex-wrap`, `.items-center`, `.justify-between`, `.gap-*`, `.grid-2/3/4`
- Forms: `.form-group`, `.form-label`, `.form-required`, `.form-error`, `.form-help`, `.form-row`, `.form-col-2`, `.form-actions`, `.form-inline`
- Utilities: `.hidden`, `.visible`, `.sr-only`, `.no-print`, `.text-center/right/left`
- Modals: `.modal-overlay`, `.modal-container`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-close`, `.modal-sm/md/lg/xl/fullscreen`, `.modal-type-confirm/alert/danger/wizard`
- Toasts: `.toast-container`, `.toast-item`, `.toast-icon`, `.toast-content`, `.toast-close`, `.toast-progress`, `.toast-success/error/warning/info`
- Table Builder: `.tb-wrapper`, `.tb-wrapper-sticky`, `.tb-table`, `.tb-header`, `.tb-th`, `.tb-th-sortable`, `.tb-th-sort-active`, `.tb-row`, `.tb-row-clickable`, `.tb-td`, `.tb-td-end`, `.tb-td-actions`, `.tb-empty`, `.tb-empty-icon`, `.tb-empty-text`, `.tb-empty-cta`, `.tb-loading`, `.tb-loading-row`

**JS Functions — Modal:**
- `Modal.show(config) → {el, close}` — open modal with custom content
- `Modal.confirm(config)` — confirm dialog with onConfirm/onCancel
- `Modal.alert(config)` — informational alert with OK button
- `Modal.danger(config)` — danger confirmation requiring typed word
- `Modal.form(config) → {el, close}` — modal with form content
- `Modal.wizard(config) → {el, close}` — multi-step wizard with progress bar
- `Modal.close()` — close topmost modal
- `Modal.closeAll()` — close all open modals

**JS Functions — Toast:**
- `Toast.success(msg, opts)` — green success notification
- `Toast.error(msg, opts)` — red error notification
- `Toast.warning(msg, opts)` — orange warning notification
- `Toast.info(msg, opts)` — blue info notification
- `Toast.dismiss(id)` — dismiss specific toast by id
- `Toast.clear()` — dismiss all toasts

**JS Functions — PIN:**
- `PinModal.prompt(title, callback)` — PIN prompt modal (new namespace)
- `promptPin(title, callback)` — legacy alias (backward compatible)

**JS Functions — Theme:**
- `loadTenantTheme(tenantRow)` — per-tenant CSS override injection

**JS Functions — DB Wrapper (Phase 3):**
- `DB.select(table, filters?, opts?) → { data, error, count }` — query with tenant_id auto-filter
- `DB.insert(table, data, opts?) → { data, error }` — single or array (chunked to 100), tenant_id auto-inject
- `DB.update(table, id, changes, opts?) → { data, error }` — single row update by id
- `DB.batchUpdate(table, records, opts?) → { data, error }` — loop of updates, each record needs .id
- `DB.softDelete(table, id, opts?) → { data, error }` — sets is_deleted = true
- `DB.hardDelete(table, id, opts?) → { data, error }` — permanent delete
- `DB.rpc(fn, params?, opts?) → { data, error }` — call Supabase RPC

**JS Functions — Activity Log (Phase 3):**
- `ActivityLog.write(config)` — log event (level: info or override)
- `ActivityLog.warning(config)` — log warning
- `ActivityLog.error(config)` — log error
- `ActivityLog.critical(config)` — log critical event

**JS Functions — Table Builder (Phase 4):**
- `TableBuilder.create(config) → TableInstance` — create managed table
- `table.setData(rows)` — render data (empty array → emptyState)
- `table.setLoading(isLoading)` — toggle skeleton loading
- `table.updateRow(rowId, newData)` — re-render single row in-place
- `table.removeRow(rowId)` — remove row (last → emptyState)
- `table.getData() → array` — get current data copy
- `table.destroy()` — clean up DOM + state

**JS Functions — Permission UI (Phase 4):**
- `PermissionUI.apply()` — scan document for [data-permission], hide/disable unauthorized
- `PermissionUI.applyTo(container)` — scan container only (dynamic content)
- `PermissionUI.check(permission) → boolean` — manual permission check

**HTML Attributes — Permission UI (Phase 4+5):**
- `data-permission="module.action"` — permission check (hide if no perm)
- `data-tab-permission="module.action"` — tab permission check (same logic)
- `data-permission="perm1|perm2"` — OR logic (visible if any match)
- `data-permission-mode="disable"` — disable instead of hide (opacity 0.5 + tooltip)

**RPC Functions (Phase 3 — new):**
- `increment_paid_amount(p_doc_id, p_delta)` — atomic paid_amount update + status on supplier_documents
- `increment_prepaid_used(p_deal_id, p_delta)` — atomic total_used/total_remaining update on prepaid_deals
- `increment_shipment_counters(p_shipment_id, p_items_delta, p_value_delta)` — atomic items_count/total_value update on shipments

### Deferred Items
- suppliers-debt.html migration → deferred to finance module
- styles.css deletion → after suppliers-debt migration
- js/pin-modal.js redirect deletion → after suppliers-debt migration
- DB.* migration (supabase-ops.js → DB.*) → not Module 1.5 scope
