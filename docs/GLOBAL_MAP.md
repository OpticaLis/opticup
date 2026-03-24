# GLOBAL_MAP.md — Optic Up Global Project Reference

> **Authority:** Cross-module reference document. For Module 1 internals (modules/inventory/\*, modules/debt/\*, etc.) see Module 1's local MODULE_MAP.md.

---

## 1. HTML Pages

| Page | File | Owner Module | Description |
|------|------|-------------|-------------|
| Home Screen | `index.html` | Core | PIN login modal, module cards, session restore, live clock |
| Inventory | `inventory.html` | Module 1 — Inventory | Full inventory app: 11 tabs (entry, reduction, table, PO, receipts, brands, suppliers, sync, stock count, returns, incoming invoices) |
| Supplier Debt | `suppliers-debt.html` | Module 1 — Debt | 5 tabs: suppliers dashboard, documents, payments, prepaid deals, weekly report |
| Employees | `employees.html` | Module 1 — Permissions | Standalone employee management (CRUD, role assignment) |
| Shipments | `shipments.html` | Module 1 — Shipments | Box management: list, 3-step wizard, detail panel, courier settings |
| Settings | `settings.html` | Module 1 — Settings | Tenant config: business info, financial settings, logo upload |

---

## 2. Global JS Files (js/)

### js/shared.js (411 lines)

Supabase init, constants, caches, UI helpers, navigation. **Loads FIRST on every page.**

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getTenantId` | — | `string\|null` | Read tenant_id from sessionStorage |
| `getTenantConfig` | `key?: string` | `any` | Read tenant config object or specific key from sessionStorage |
| `escapeHtml` | `str: string` | `string` | Sanitize string for safe HTML insertion |
| `formatILS` | `amount: number` | `string` | Format number as ILS currency string (e.g. "₪1,234") |
| `showLoading` | `text?: string` | `void` | Show full-screen loading overlay |
| `hideLoading` | — | `void` | Hide loading overlay |
| `$` | `id: string` | `HTMLElement\|null` | Shortcut for `document.getElementById` |
| `toast` | `msg: string, type?: string` | `void` | Show toast notification (type: 's'=success, 'e'=error) |
| `setAlert` | `id: string, html: string, type: string` | `void` | Set alert HTML inside element |
| `clearAlert` | `id: string` | `void` | Clear alert content |
| `closeModal` | `id: string` | `void` | Hide modal by setting display:none |
| `confirmDialog` | `title: string, text?: string` | `Promise<boolean>` | Show yes/no confirmation modal |
| `showTab` | `name: string` | `void` | Switch active tab + trigger tab-specific data load |
| `showEntryMode` | `mode: string` | `void` | Toggle entry sub-mode (manual/excel/receipt) |
| `showInfoModal` | `title: string, bodyHTML: string` | `void` | Show informational modal with HTML body |
| `renderHelpBanner` | `parentEl: HTMLElement, storageKey: string, helpHTML: string` | `void` | Render collapsible help banner (state persisted in sessionStorage) |
| `heToEn` | `cat: string, val: string` | `string` | Translate Hebrew enum value to English |
| `enToHe` | `cat: string, val: string` | `string` | Translate English enum value to Hebrew |
| `enumCatForCol` | `tableName: string, enCol: string` | `string\|null` | Determine which enum category a column belongs to |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `SUPABASE_URL` | `const string` | Supabase project URL |
| `SUPABASE_ANON` | `const string` | Supabase anon key |
| `sb` | `SupabaseClient` | Supabase client instance (reassigned on JWT auth) |
| `T` | `const object` | Table name constants (37 entries) |
| `FIELD_MAP` | `const object` | Hebrew→English column name maps per table |
| `FIELD_MAP_REV` | `const object` | English→Hebrew column name maps (auto-generated) |
| `ENUM_MAP` | `const object` | Hebrew→English enum value maps per category |
| `ENUM_REV` | `const object` | English→Hebrew enum value maps (auto-generated) |
| `suppliers` | `string[]` | Cached supplier names (loaded by loadData) |
| `brands` | `object[]` | Cached brand objects with id, name, type, defaultSync, active |
| `isAdmin` | `boolean` | Admin mode flag |
| `maxBarcode` | `number` | Highest barcode sequence number for current branch |
| `branchCode` | `string` | Current branch code from sessionStorage (default '00') |
| `supplierCache` | `object` | name→UUID lookup |
| `supplierCacheRev` | `object` | UUID→name lookup |
| `supplierNumCache` | `object` | UUID→supplier_number lookup |
| `brandCache` | `object` | name→UUID lookup |
| `brandCacheRev` | `object` | UUID→name lookup |
| `slogPage` | `number` | System log current page |
| `slogTotalPages` | `number` | System log total pages |
| `slogCurrentFilters` | `object` | System log active filters |
| `rcptRowNum` | `number` | Goods receipt row counter |
| `currentReceiptId` | `string\|null` | Active receipt being edited |
| `rcptEditMode` | `boolean` | Receipt edit mode flag |
| `rcptViewOnly` | `boolean` | Receipt view-only flag |

---

### js/supabase-ops.js (380 lines)

DB operations: CRUD helpers, barcode generation, logging. Alert/OCR functions moved to `js/supabase-alerts-ocr.js`.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `loadLookupCaches` | — | `Promise<void>` | Load supplier/brand name↔UUID caches from DB |
| `enrichRow` | `row: object` | `object` | Add brand_name, supplier_name to a Supabase row |
| `fetchAll` | `tableName: string, filters?: Array` | `Promise<object[]>` | Paginated fetch (1000/page) with tenant_id filter + enrichment |
| `batchCreate` | `tableName: string, records: object[]` | `Promise<object[]>` | Insert records in batches of 100, with barcode dedup for inventory |
| `batchUpdate` | `tableName: string, records: object[]` | `Promise<object[]>` | Update records individually (RLS-compatible), each must have `id` |
| `generateNextBarcode` | — | `Promise<string>` | Generate next BBDDDDD barcode for current branch |
| `writeLog` | `action: string, inventoryId?: string, details?: object` | `Promise<void>` | Insert audit log entry (async, non-blocking) |
| `batchWriteLog` | `entries: object[]` | `Promise<void>` | Bulk insert log entries in single DB call |

---

### js/supabase-alerts-ocr.js (181 lines)

Alert creation + OCR template learning (split from supabase-ops.js). Load after shared.js, supabase-ops.js.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `createAlert` | `alertType: string, severity: string, title: string, entityType?: string, entityId?: string, data?: object, expiresAt?: string` | `Promise<object\|null>` | Create system alert (checks ai_agent_config flags, skips historical docs) |
| `alertPriceAnomaly` | `item: string, poPrice: number, receiptPrice: number, supplierId: string, docId: string` | `Promise<object\|null>` | Create price_anomaly alert |
| `alertPrepaidNewDocument` | `supplierId: string, documentId: string, tenantId: string, supplierName: string, docNumber: string` | `Promise<void>` | Create prepaid_new_document info alert when receipt creates doc for supplier with active prepaid deal |
| `validateOCRData` | `data: object` | `object[]` | Validate OCR-extracted data against 7 business rules |
| `_detectDateFormat` | `dateStr: string` | `string\|null` | Detect date format pattern from string |
| `buildHintsFromCorrections` | `corrections: object, extractedData: object, existingHints: object` | `object` | Build OCR extraction hints from user corrections |
| `updateOCRTemplate` | `supplierId: string, docTypeCode: string, corrections: object, extractedData: object, tenantId?: string` | `Promise<any>` | Update OCR template stats via RPC |

---

### js/auth-service.js (309 lines)

PIN authentication, session management, permission checks.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `verifyEmployeePIN` | `pin: string` | `Promise<{token, employee}>` | Call pin-auth Edge Function, return JWT + employee |
| `verifyPinOnly` | `pin: string` | `Promise<object\|null>` | Lightweight PIN check — returns employee or null |
| `incrementFailedAttempts` | `employeeId: string` | `Promise<void>` | Increment failed PIN counter; lock after 5 |
| `getEffectivePermissions` | `employeeId: string` | `Promise<string[]>` | Resolve permissions from role assignments (with legacy fallback) |
| `initSecureSession` | `employee: object, jwtToken?: string` | `Promise<object>` | Create auth session: JWT client, DB row, sessionStorage, tenant config |
| `loadSession` | — | `Promise<object\|null>` | Restore session from sessionStorage + validate against DB |
| `clearSessionLocal` | — | `void` | Clear sessionStorage keys, reset sb to anon client |
| `clearSession` | — | `Promise<void>` | Deactivate DB session + clearSessionLocal + redirect to / |
| `hasPermission` | `permissionKey: string` | `boolean` | Check if current session has a permission |
| `requirePermission` | `permissionKey: string` | `void` | Throw + toast if permission missing |
| `checkBranchAccess` | `branchId: string` | `boolean` | Check branch access (ceo/manager=all, others=own branch) |
| `applyUIPermissions` | — | `void` | Show/hide elements with data-permission / data-tab-permission attributes |
| `getCurrentEmployee` | — | `object\|null` | Read employee object from sessionStorage |
| `assignRoleToEmployee` | `employeeId: string, roleId: string` | `Promise<void>` | Upsert employee_roles + writeLog + toast |
| `forceLogout` | `employeeId: string` | `Promise<void>` | Deactivate all sessions for an employee |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `AT` | `const object` | Auth table name constants (ROLES, PERMISSIONS, ROLE_PERMS, EMP_ROLES, SESSIONS) |
| `SK` | `const object` | SessionStorage key constants (TOKEN, EMPLOYEE, PERMS, ROLE) |
| `LEGACY_ROLE_MAP` | `const object` | Maps legacy role names to new system (admin→ceo, manager→manager, employee→worker) |

---

### js/data-loading.js (171 lines)

Data loading, dropdown population, low-stock alerts.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `loadData` | — | `Promise<void>` | Main data loader: session check, caches, brands, maxBarcode, dropdowns |
| `loadMaxBarcode` | — | `Promise<void>` | Query max barcode sequence for current branch |
| `populateDropdowns` | — | `void` | Fill reduction brand + receipt supplier dropdowns |
| `activeBrands` | — | `object[]` | Filter brands array to active only |
| `supplierOpts` | — | `string` | Generate supplier `<option>` HTML |
| `productTypeOpts` | — | `string` | Generate product type `<option>` HTML |
| `syncOpts` | — | `string` | Generate sync mode `<option>` HTML |
| `getBrandType` | `name: string` | `string` | Lookup brand type by name |
| `getBrandSync` | `name: string` | `string` | Lookup brand default sync by name |
| `loadLowStockAlerts` | — | `Promise<object[]>` | Query brands below min_stock_qty threshold |
| `refreshLowStockBanner` | — | `Promise<void>` | Update low-stock banner visibility + text |
| `openLowStockModal` | — | `void` | Show low-stock details modal with "create PO" buttons |
| `closeLowStockModal` | — | `void` | Remove low-stock modal from DOM |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `window.lowStockData` | `object[]` | Cached low-stock brand data |
| `window.brandSyncCache` | `object` | brand name→default sync lookup (set in loadData) |

---

### js/search-select.js (135 lines)

Searchable dropdown component with fixed positioning.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `createSearchSelect` | `items: string[], value?: string, onChange?: function` | `HTMLElement` | Create searchable dropdown component |
| `closeAllDropdowns` | — | `void` | Close all open search-select dropdowns |
| `repositionDropdown` | — | `void` | Reposition active dropdown on scroll/resize |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `activeDropdown` | `object\|null` | Currently open dropdown reference {input, dropdown} |
| `_searchSelectCleanups` | `Set` | Cleanup functions for removed search-select instances |
| `window._sharedSearchObserver` | `MutationObserver` | Shared observer for orphaned dropdown cleanup |

---

### js/header.js (61 lines)

Sticky header rendered on all pages when session is active.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `initHeader` | — | `Promise<void>` | Load tenant name/logo, build header (runs on DOMContentLoaded) |
| `buildHeader` | `emp: object, tenantName: string, logoUrl: string, role: string` | `void` | Create header DOM: tenant logo + name \| "Optic Up" \| employee + logout |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `FALLBACK_LOGO` | `const string` | SVG glasses icon used when no tenant logo |

---

### js/alerts-badge.js (338 lines)

Bell icon with unread badge and dropdown panel. Used on ALL pages.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `initAlertsBadge` | — | `Promise<void>` | Inject bell icon into header, wire click, start 60s polling |
| `refreshAlertsBadge` | — | `Promise<void>` | Fetch unread alert count, update badge number + shake animation |
| `toggleAlertsPanel` | — | `void` | Toggle alerts dropdown open/close |
| `openAlertsPanel` | — | `Promise<void>` | Position + show alerts panel, load alerts list |
| `closeAlertsPanel` | — | `void` | Hide alerts panel |
| `loadAlertsList` | — | `Promise<void>` | Fetch last 10 unread alerts from DB |
| `renderAlertsPanel` | — | `void` | Render alerts list HTML into panel |
| `buildAlertActions` | `alert: object` | `string` | Generate action buttons HTML for an alert |
| `alertAction` | `alertId: string, action: string` | `Promise<void>` | Handle alert view (mark read + navigate) or dismiss |
| `markAllAlertsRead` | — | `Promise<void>` | Mark all unread alerts as read |
| `timeAgo` | `dateStr: string` | `string` | Convert timestamp to Hebrew relative time string |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `_alertsPanelOpen` | `boolean` | Panel open state |
| `_alertsRefreshTimer` | `number\|null` | setInterval ID for 60s polling |
| `_alertsCache` | `object[]` | Cached alerts for current panel render |

---

### js/file-upload.js (308 lines)

File upload helper for supplier documents (Supabase Storage). Multi-file gallery with delete.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `uploadSupplierFile` | `file: File, supplierId: string` | `Promise<{url, fileName, signedUrl}\|null>` | Upload PDF/JPG/PNG to supplier-docs bucket (max 10MB) |
| `getSupplierFileUrl` | `filePath: string` | `Promise<string\|null>` | Get 1-hour signed URL for stored file |
| `renderFilePreview` | `fileUrl: string, fileName: string, containerId: string` | `void` | Render PDF iframe or image preview in container |
| `pickAndUploadFile` | `supplierId: string, callback: function` | `void` | Open file picker, upload, call callback with result |
| `pickAndUploadFiles` | `supplierId: string, callback: function` | `void` | Multi-file picker + upload, callback with results array |
| `fetchDocFiles` | `docId: string, fallbackUrl?, fallbackName?` | `Promise<object[]>` | Fetch files from supplier_document_files, fallback to legacy file_url |
| `saveDocFile` | `docId, fileUrl, fileName, sortOrder` | `Promise<void>` | Insert record into supplier_document_files |
| `renderFileGallery` | `files: object[], containerId: string` | `Promise<void>` | Multi-file gallery with thumbnails + delete buttons |
| `_deleteGalleryFile` | `fileId: string, containerId: string` | `Promise<void>` | Confirm + delete file from DB + re-render gallery |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `UPLOAD_ALLOWED_TYPES` | `string[]` | Allowed MIME types: PDF, JPEG, PNG |
| `UPLOAD_MAX_SIZE` | `number` | Max file size: 10MB |

---

### js/pin-modal.js (5 lines — redirect)

Backward-compat redirect to `shared/js/pin-modal.js` via `document.write()`. Will be removed in Phase 5 migration. Original PIN modal logic now lives in shared/js/pin-modal.js (123 lines).

---

## 3. Global CSS Files (css/)

| File | Lines | Description |
|------|-------|-------------|
| `css/styles.css` | 392 | Main stylesheet: CSS variables, buttons, forms, tables, modals, toasts, cards, badges, alerts, stock count, admin, loading overlay, responsive breakpoints (768/640/600/480px) |
| `css/header.css` | 349 | Sticky header: 60px height, z-index 1000, RTL 3-zone flex layout (tenant logo+name / "Optic Up" / employee+logout), alerts bell+badge+panel, mobile responsive |

### Global Docs (docs/)

| File | Description |
|------|-------------|
| `docs/GLOBAL_MAP.md` | Cross-module function registry, globals, DB table ownership |
| `docs/GLOBAL_SCHEMA.sql` | Full DB schema across all modules |
| `docs/TROUBLESHOOTING.md` | Troubleshooting knowledge base — resolved bugs with root cause, fix, and prevention |

---

## 4. Shared Components (shared/) — Phase 4 complete ✅

### shared/css/variables.css (157 lines)

70 CSS custom properties (design tokens) extracted from styles.css. Categories:
- Colors — primary (4), semantic (16 incl. dark text), neutral (12), background (3)
- Typography — font-family (1), font-sizes (6), font-weights (4), line-heights (3)
- Spacing — 6-step scale (xs through 2xl)
- Borders — radius (4: sm/md/lg/full)
- Shadows — sm/md/lg (3)
- Z-index — dropdown/sticky/overlay/modal/toast (5)
- Transitions — fast/normal/slow (3)

### shared/css/components.css (254 lines)

UI components part 1: buttons (primary/secondary/danger/ghost × sm/md/lg + disabled/hover states), inputs (.input, .input-error, .input-disabled), selects (.select, .select-error), textareas (.textarea, .textarea-error), badges (success/error/warning/info/neutral), cards (header/body/footer). All values via CSS variables.

### shared/css/components-extra.css (214 lines)

UI components part 2: table base (.table, .table-header, .table-row, .table-cell, .table-sortable, .table-sort-active), slide-in panel (RTL, overlay, header/body), skeleton loaders (text/circle/rect/row + pulse animation), accordion (CSS-only open/close via .accordion-open).

### shared/css/layout.css (201 lines)

Page structure (.page-container, .page-header, .page-content), sticky header, flex helpers (flex/col/wrap, items, justify, gap), grid helpers (2/3/4 col), RTL utilities (logical margin/padding/inset), visibility (hidden/visible/sr-only), print styles (no-print, header hidden).

### shared/css/forms.css (146 lines)

Form layout: .form-group (label+input wrapper), .form-label, .form-required (red asterisk), .form-error/.form-help text, .form-row (multi-column flex), .form-col-2 (2-col grid), .form-actions (button container), .form-inline (label+input same line), mobile responsive.

### shared/css/modal.css (233 lines)

Modal system: overlay (fixed, z-modal), container (flex column, 90vh max), header/body/footer, close button. 5 sizes (sm 340px, md 500px, lg 700px, xl 900px, fullscreen 95vw). 5 types (default, confirm, alert, danger with red header, wizard with progress bar). Wizard step indicators (num/active/done). Animations (entering/leaving with scale+fade). Stack support (dimmed, pointer-events:none). Responsive (640px breakpoint).

### shared/css/toast.css (155 lines)

Toast notifications: container (fixed, z-toast, top-start, flex column), toast item (border-inline-start colored by type, shadow, flex row), icon/content/close/progress bar. 4 types (success/error/warning/info). 3 keyframe animations (toast-enter slide+fade in, toast-leave slide+fade out, toast-progress countdown). CSS custom property --toast-duration for JS control. Responsive (480px breakpoint). Zero hardcoded colors.

### shared/js/theme-loader.js (42 lines)

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `loadTenantTheme` | `tenantRow: object` | `void` | Read ui_config JSONB from tenant row, inject CSS variable overrides to :root via setProperty(). Only keys starting with `--` are injected (security). Zero DB calls, standalone, no innerHTML. |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `window.loadTenantTheme` | `function` | Global reference to loadTenantTheme |

### shared/js/modal-builder.js (261 lines)

Modal system core. Global `Modal` object: `show(config)→{el,close}`, `confirm(config)`, `alert(config)`, `danger(config)` (typed word to enable), `form(config)→{el,close}`, `close()`, `closeAll()`. Stack management (_stack[]), focus trap, body scroll lock, Escape key, open/close animations. Private `_escapeHtml()` for plain text. Zero JS dependencies.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `Modal.show` | `config: object` | `{el, close}` | Open modal with custom content |
| `Modal.confirm` | `config: object` | `void` | Confirm dialog with onConfirm/onCancel |
| `Modal.alert` | `config: object` | `void` | Informational alert with OK button |
| `Modal.danger` | `config: object` | `void` | Danger confirmation requiring typed word |
| `Modal.form` | `config: object` | `{el, close}` | Modal with form content |
| `Modal.close` | — | `void` | Close topmost modal |
| `Modal.closeAll` | — | `void` | Close all open modals |

### shared/js/modal-wizard.js (145 lines)

Wizard extension for Modal. Attaches `Modal.wizard(config)→{el,close}`. Multi-step progress bar (wizard-step-active/done), back/next/finish buttons, step validate/onEnter/onLeave callbacks. Depends on modal-builder.js (must load after).

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `Modal.wizard` | `config: object` | `{el, close}` | Multi-step wizard with progress bar |

### shared/js/toast.js (147 lines)

Toast notification system. Global `Toast` object: `success(msg,opts)`, `error(msg,opts)`, `warning(msg,opts)`, `info(msg,opts)`, `dismiss(id)`, `clear()`. Max 5 visible, duplicate prevention via id, auto-dismiss with CSS progress bar (--toast-duration), XSS-safe via _escapeHtml(). Zero dependencies.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `Toast.success` | `msg: string, opts?: object` | `void` | Green success notification |
| `Toast.error` | `msg: string, opts?: object` | `void` | Red error notification |
| `Toast.warning` | `msg: string, opts?: object` | `void` | Orange warning notification |
| `Toast.info` | `msg: string, opts?: object` | `void` | Blue info notification |
| `Toast.dismiss` | `id: string` | `void` | Dismiss specific toast by id |
| `Toast.clear` | — | `void` | Dismiss all toasts |

### shared/js/pin-modal.js (123 lines)

PIN prompt modal — migration of js/pin-modal.js. Global `promptPin(title, callback)` — identical external API. Internally uses `Modal.show()` for overlay/backdrop/close. 5-digit split input with auto-advance, backspace, paste, auto-submit. Calls `verifyPinOnly()` from auth-service.js. PIN-specific styles injected once via `<style>` block. Depends on modal-builder.js.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `PinModal.prompt` | `title: string, callback: function(pin, emp)` | `void` | Show PIN modal; on valid PIN calls callback with pin string and employee object (new namespace) |
| `promptPin` | `title: string, callback: function(pin, emp)` | `void` | Legacy alias for PinModal.prompt — backward compatible |

### shared/tests/ui-test.html (252 lines)

Visual test page: 13 component sections (colors, typography, buttons, inputs, selects, textareas, badges, cards, tables, slide panel, skeleton, accordion, forms). 3-palette theme switcher (Default/Green/Purple) using loadTenantTheme(). RTL, Hebrew, self-contained. Loads only shared/css/ files — no styles.css dependency.

### shared/tests/modal-test.html (251 lines)

Modal system test page: 5 sections — sizes (sm/md/lg/xl/fullscreen), types (confirm/alert/danger/form/wizard), stack (3-layer), keyboard (escape/no-escape/no-backdrop), XSS test. Log area for event output. RTL, Hebrew, self-contained.

### shared/tests/toast-test.html (174 lines)

Toast system test page: 6 sections — types (success/error/warning/info), duration (1s/5s/persistent/dismiss), stack (5 toasts + 6th overflow), duplicate prevention (loading→done replace), XSS test, no-close-button. Log area for event output. RTL, Hebrew, self-contained.

### shared/css/table.css (150 lines)

Table builder styles. `.tb-wrapper` (overflow-x, border, radius), `.tb-table` (collapse, font), `.tb-header` (gray-50), `.tb-th` (sortable with ▲▼ via `data-sort-dir`), `.tb-th-sort-active`, `.tb-row` (zebra, hover), `.tb-td`/`.tb-td-end`/`.tb-td-actions`, `.tb-empty` (icon/text/CTA), `.tb-loading` (pulse skeleton), `.tb-wrapper-sticky` (sticky header). Responsive @640px. All via CSS variables.

### shared/js/table-builder.js (296 lines)

Table builder. Global `TableBuilder` object with `create(config) → TableInstance`.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `TableBuilder.create` | `config: object` | `TableInstance` | Create managed table in containerId |
| `table.setData` | `rows: array` | `void` | Render data rows (empty → emptyState) |
| `table.setLoading` | `isLoading: boolean` | `void` | Toggle skeleton loading state |
| `table.updateRow` | `rowId: string, newData: object` | `void` | Re-render single row in-place |
| `table.removeRow` | `rowId: string` | `void` | Remove row (last → emptyState) |
| `table.getData` | — | `array` | Get current data copy |
| `table.destroy` | — | `void` | Clean up DOM + state |

### shared/js/permission-ui.js (53 lines)

Permission-aware UI. Global `PermissionUI` object: scans `[data-permission]` attributes, hides/disables unauthorized elements.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `PermissionUI.apply` | — | `void` | Scan entire document for [data-permission] |
| `PermissionUI.applyTo` | `container: HTMLElement` | `void` | Scan container only (dynamic content) |
| `PermissionUI.check` | `permission: string` | `boolean` | Manual permission check |

### shared/tests/table-test.html (235 lines)

Table builder test page: 9 sections — basic (all 7 types), sort, empty state, loading, row ops, sticky header, row click, XSS, destroy. Mock data inline, self-contained.

### shared/tests/permission-test.html (190 lines)

Permission UI test page: 7 sections — hide, disable, OR logic, applyTo, manual check, no-hasPermission fallback, full reset. Mock hasPermission inline, self-contained.

### Integration Points — Redirect Files

| File | Path | Lines | Purpose |
|------|------|-------|---------|
| pin-modal.js (redirect) | js/pin-modal.js | 5 | Backward-compat redirect to shared/js/pin-modal.js via document.write(). Will be removed in Phase 5. |

Pages modified for shared/ dependencies:

| Page | Added CSS | Added JS |
|------|-----------|----------|
| inventory.html | shared/css/modal.css | shared/js/modal-builder.js |
| suppliers-debt.html | shared/css/modal.css | shared/js/modal-builder.js |

---

## 5. Cross-Module Contracts

### RPC Functions (Supabase)

| Contract Function | Owner Module | Parameters | Returns | Used By |
|-------------------|-------------|-----------|---------|---------|
| `increment_inventory` | Inventory | `inv_id UUID, delta INTEGER` | `void` | Goods Receipts, Access Sync, Pending Resolve |
| `decrement_inventory` | Inventory | `inv_id UUID, delta INTEGER` | `void` | Reduction, Access Sync, Supplier Returns |
| `set_inventory_qty` | Inventory | `inv_id UUID, new_qty INTEGER` | `void` | Stock Count (approval) |
| `next_internal_doc_number` | Debt | `p_tenant_id UUID` | `TEXT` (DOC-NNNN) | Debt Documents, Receipt-Debt auto-create |
| `update_ocr_template_stats` | AI Agent | `p_tenant_id UUID, p_supplier_id UUID, p_doc_type_code TEXT, p_was_corrected BOOLEAN, p_new_hints JSONB` | `void` | AI OCR, Historical Import |
| `next_box_number` | Shipments | `p_tenant_id UUID` | `TEXT` ({prefix}-NNNN) | Shipments Create |
| `increment_paid_amount` | Module 1.5 (Phase 3) | `p_doc_id UUID, p_delta NUMERIC` | `void` | Debt Payment Allocation |
| `increment_prepaid_used` | Module 1.5 (Phase 3) | `p_deal_id UUID, p_delta NUMERIC` | `void` | Receipt-Debt (prepaid auto-deduct) |
| `increment_shipment_counters` | Module 1.5 (Phase 3) | `p_shipment_id UUID, p_items_delta INTEGER, p_value_delta NUMERIC` | `void` | Shipments Lock (item add) |

### Edge Functions (Supabase)

| Contract Function | Owner Module | Parameters | Returns | Used By |
|-------------------|-------------|-----------|---------|---------|
| `pin-auth` | Auth | `POST {pin, slug}` | `{token, employee}` | auth-service.js (`verifyEmployeePIN`) |
| `ocr-extract` | AI Agent | `POST {file_path} + JWT` | `{extracted_data, confidence, ...}` | ai-ocr.js, ai-batch-ocr.js |

### JS Contracts — Global Functions

| Contract Function | Owner File | Parameters | Returns | Used By |
|-------------------|-----------|-----------|---------|---------|
| `getTenantId` | shared.js | — | `string\|null` | Every module (all DB writes/reads) |
| `getTenantConfig` | shared.js | `key?: string` | `any` | Debt (VAT), Settings, Shipments |
| `getCurrentEmployee` | auth-service.js | — | `object\|null` | writeLog, PIN flows, header, session checks |
| `verifyEmployeePIN` | auth-service.js | `pin: string` | `Promise<{token, employee}>` | Login flows (index.html, inventory.html) |
| `verifyPinOnly` | auth-service.js | `pin: string` | `Promise<object\|null>` | pin-modal.js, all mid-session PIN checks |
| `hasPermission` | auth-service.js | `permissionKey: string` | `boolean` | All modules (UI guards, action guards) |
| `writeLog` | supabase-ops.js | `action: string, inventoryId?: string, details?: object` | `Promise<void>` | Every module that mutates data |
| `fetchAll` | supabase-ops.js | `tableName: string, filters?: Array` | `Promise<object[]>` | Inventory table, brands, suppliers, PO, receipts, debt, sync |
| `batchCreate` | supabase-ops.js | `tableName: string, records: object[]` | `Promise<object[]>` | Entry, Excel import, receipts, debt docs |
| `batchUpdate` | supabase-ops.js | `tableName: string, records: object[]` | `Promise<object[]>` | Inventory edit, brands, PO items, receipts |
| `generateNextBarcode` | supabase-ops.js | — | `Promise<string>` | Entry, Excel import, Receipt confirm |
| `createAlert` | supabase-ops.js | `alertType, severity, title, ...` | `Promise<object\|null>` | Debt, OCR, Receipt-Debt |
| `promptPin` | shared/js/pin-modal.js | `title: string, callback: function` | `void` | Stock count, reduction, delete, debt payments, returns, shipments |
| `Modal.show` | shared/js/modal-builder.js | `config: object` | `{el, close}` | Any module needing custom modal |
| `Modal.confirm` | shared/js/modal-builder.js | `config: object` | `void` | Confirmation dialogs |
| `Modal.alert` | shared/js/modal-builder.js | `config: object` | `void` | Informational alerts |
| `Modal.danger` | shared/js/modal-builder.js | `config: object` | `void` | Danger confirmation with typed word |
| `Modal.form` | shared/js/modal-builder.js | `config: object` | `{el, close}` | Form modals |
| `Modal.wizard` | shared/js/modal-wizard.js | `config: object` | `{el, close}` | Multi-step wizard modals |
| `Modal.close` | shared/js/modal-builder.js | — | `void` | Close topmost modal |
| `Modal.closeAll` | shared/js/modal-builder.js | — | `void` | Close all open modals |
| `Toast.success` | shared/js/toast.js | `msg: string, opts?: object` | `void` | Success notification |
| `Toast.error` | shared/js/toast.js | `msg: string, opts?: object` | `void` | Error notification |
| `Toast.warning` | shared/js/toast.js | `msg: string, opts?: object` | `void` | Warning notification |
| `Toast.info` | shared/js/toast.js | `msg: string, opts?: object` | `void` | Info notification |
| `Toast.dismiss` | shared/js/toast.js | `id: string` | `void` | Dismiss specific toast |
| `Toast.clear` | shared/js/toast.js | — | `void` | Dismiss all toasts |
| `DB.select` | shared/js/supabase-client.js | `table, filters?, opts?` | `{ data, error, count }` | Any module (DB queries) |
| `DB.insert` | shared/js/supabase-client.js | `table, data, opts?` | `{ data, error }` | Any module (DB inserts) |
| `DB.update` | shared/js/supabase-client.js | `table, id, changes, opts?` | `{ data, error }` | Any module (DB updates) |
| `DB.batchUpdate` | shared/js/supabase-client.js | `table, records, opts?` | `{ data, error }` | Any module (batch DB updates) |
| `DB.softDelete` | shared/js/supabase-client.js | `table, id, opts?` | `{ data, error }` | Any module (soft delete) |
| `DB.hardDelete` | shared/js/supabase-client.js | `table, id, opts?` | `{ data, error }` | Any module (permanent delete) |
| `DB.rpc` | shared/js/supabase-client.js | `fn, params?, opts?` | `{ data, error }` | Any module (RPC calls) |
| `ActivityLog.write` | shared/js/activity-logger.js | `config: object` | `void` | System event logging (fire-and-forget) |
| `ActivityLog.warning` | shared/js/activity-logger.js | `config: object` | `void` | Warning event logging |
| `ActivityLog.error` | shared/js/activity-logger.js | `config: object` | `void` | Error event logging |
| `ActivityLog.critical` | shared/js/activity-logger.js | `config: object` | `void` | Critical event logging |
| `TableBuilder.create` | shared/js/table-builder.js | `config: object` | `TableInstance` | Create managed table (setData/setLoading/updateRow/removeRow/getData/destroy) |
| `PermissionUI.apply` | shared/js/permission-ui.js | — | `void` | Scan document for [data-permission], hide/disable unauthorized |
| `PermissionUI.applyTo` | shared/js/permission-ui.js | `container: HTMLElement` | `void` | Scan container only (dynamic content) |
| `PermissionUI.check` | shared/js/permission-ui.js | `permission: string` | `boolean` | Manual permission check |
| `escapeHtml` | shared.js | `str: string` | `string` | Every module (HTML rendering) |
| `toast` | shared.js | `msg: string, type?: string` | `void` | Every module (user feedback) |
| `formatILS` | shared.js | `amount: number` | `string` | Debt, PO, Receipts, Shipments |
| `loadLookupCaches` | supabase-ops.js | — | `Promise<void>` | data-loading.js (loadData), inventory flows |
| `enrichRow` | supabase-ops.js | `row: object` | `object` | fetchAll (internal), batchCreate, batchUpdate |
| `createSearchSelect` | search-select.js | `items: string[], value?: string, onChange?: function` | `HTMLElement` | Entry, PO items, Receipt items |
| `uploadSupplierFile` | file-upload.js | `file: File, supplierId: string` | `Promise<object\|null>` | Debt documents, batch upload |
| `initAlertsBadge` | alerts-badge.js | — | `Promise<void>` | All pages (auto-init on DOMContentLoaded) |
| `refreshAlertsBadge` | alerts-badge.js | — | `Promise<void>` | After alert dismiss, payment save, OCR accept |
| `initHeader` | header.js | — | `Promise<void>` | All pages (auto-init on DOMContentLoaded) |
| `applyUIPermissions` | auth-service.js | — | `void` | All pages after login, tab switches |
| `editDocument` | debt-doc-edit.js | `docId: string` | `void` | Opens editable document modal with field editing |
| `saveDocumentEdits` | debt-doc-edit.js | `docId: string` | `Promise<void>` | Saves document edits + AI learning from corrections |
| `openLinkDeliveryNotesModal` | debt-doc-link.js | `invoiceId: string` | `void` | Multi-select delivery note linking modal |
| `_extractDeliveryNoteRefs` | debt-doc-link.js | `ocrData: object, notes: string` | `string[]` | AI matching of delivery note references from OCR data |
| `toggleDocStatusFilter` | debt-documents.js | `key: string` | `void` | Multi-select status filter toggle for documents |
| `openQuickOpeningBalance` | debt-dashboard.js | — | `void` | Quick opening balance modal for supplier setup |
| `_cascadeSettlement` | debt-payment-alloc.js | `docId: string` | `Promise<void>` | Auto-close linked children when parent document is settled |

### Shipments Config Contracts

| Contract Function | Owner File | Parameters | Returns | Used By |
|-------------------|-----------|-----------|---------|---------|
| `getFieldConfig` | shipments-settings.js | `type: string, field: string` | `string` | shipments-create.js, shipments-items.js |
| `getCustomField` | shipments-settings.js | `type: string, index: number` | `object` | shipments-items.js |
| `getVisibleCategories` | shipments-settings.js | — | `string[]` | shipments-items.js, shipments-items-table.js |
| `getCategoryLabel` | shipments-settings.js | `key: string` | `string` | shipments-items.js, shipments-items-table.js |
| `getStep3Config` | shipments-settings.js | `field: string` | `string` | shipments-create.js |

---

## 6. Module Registry

| Module | Status | Directory | HTML Pages | DB Tables (count) |
|--------|--------|-----------|------------|-------------------|
| Module 1 — Inventory Management | ✅ Complete | `modules/inventory/`, `modules/purchasing/`, `modules/goods-receipts/`, `modules/audit/`, `modules/brands/`, `modules/access-sync/`, `modules/admin/`, `modules/debt/`, `modules/debt/ai/`, `modules/permissions/`, `modules/shipments/`, `modules/stock-count/`, `modules/settings/` | `index.html`, `inventory.html`, `suppliers-debt.html`, `employees.html`, `shipments.html`, `settings.html` | 46 active + 4 stubs = 50 |

### Recently Added Module Files (Phase 8+)

| File | Lines | Description |
|------|-------|-------------|
| `modules/debt/debt-prepaid-detail.js` | 179 | Deal detail + check management for prepaid supplier deals |
| `modules/debt/debt-doc-edit.js` | 388 | Document edit modal with AI learning, readonly amounts on receipt-linked docs, visual badges |
| `js/supabase-alerts-ocr.js` | 181 | Alert creation + OCR template learning (split from supabase-ops.js) |
| `modules/inventory/incoming-invoices.js` | 255 | Incoming invoices tab: drag-drop upload, creates pending_invoice supplier_documents |
| `modules/goods-receipts/receipt-guide.js` | 59 | Employee quick reference guide (split from receipt-form.js): RECEIPT_GUIDE_TEXT, showReceiptGuide() |

### QA Fix Changes (Flow Review Phase 2 Final)

| File | Lines | Key Changes |
|------|-------|-------------|
| `modules/goods-receipts/receipt-form.js` | 385 | Drag & drop file zone (_initReceiptDropzone, _stageReceiptFile), PO item status dropdown (_onReceiptStatusChange), from_po tracking |
| `modules/goods-receipts/receipt-confirm.js` | 382 | Match confirmation dialog (_showMatchConfirmDialog), skip validation for return/not_received items, tenant_id on all queries |
| `modules/goods-receipts/receipt-po-compare.js` | 362 | receipt_status handling (returnMarked/missing sections), return creation for marked items, tenant_id hardened |
| `modules/purchasing/po-view-import.js` | 376 | cancelPOItem (per-item cancel on partial POs), barcode gen via generateNextBarcode (was maxBarcode++), XSS fixes, tenant_id on all queries |
| `modules/debt/debt-returns-tab-actions.js` | 289 | _promptCreditFileUpload (file required before credit), _createCreditNoteForReturn (attaches file), bulkMarkCredited blocked |
| `js/file-upload.js` | 321 | _deleteGalleryFile re-queries from DB after delete (was in-memory splice only) |

| Module 1.5 — Shared Components | ✅ Complete (QA passed) | `shared/css/`, `shared/js/`, `shared/tests/`, `scripts/` | — | 1 (activity_log) + ui_config column + PK fixes on roles/permissions/role_permissions |

---

## 7. DB Table Ownership

### Core (7 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `tenants` | Multi-tenant Infrastructure | id, name, slug, vat_rate, default_currency, logo_url | Every module (getTenantId, getTenantConfig) |
| `brands` | Inventory — Brands | id, name, brand_type, active, min_stock_qty, tenant_id | Entry, PO, Receipts, Reduction, Stock Count, Low-Stock Alerts |
| `suppliers` | Inventory — Suppliers | id, name, supplier_number, active, tenant_id | PO, Receipts, Debt, Returns, Shipments |
| `employees` | Auth & Permissions | id, name, pin, role, branch_id, tenant_id | Auth (PIN login), writeLog, session management |
| `inventory` | Inventory — Core | id, barcode, brand_id, supplier_id, quantity, status, is_deleted, tenant_id | Every inventory flow, Sync, Stock Count, Returns, Shipments |
| `inventory_images` | Inventory — Images | id, inventory_id, url, tenant_id | Inventory table (image preview), Entry, Receipts |
| `inventory_logs` | Audit Trail | id, action, inventory_id, qty_before, qty_after, performed_by, tenant_id | System Log, Item History, Sync details |

### Purchase Orders (2 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `purchase_orders` | Purchasing | id, po_number, supplier_id, status, tenant_id | Receipts (PO linkage), Inventory import |
| `purchase_order_items` | Purchasing | id, po_id, brand_id, model, quantity, cost_price, tenant_id | Receipt items (auto-populate from PO) |

### Goods Receipts (2 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `goods_receipts` | Goods Receipts | id, receipt_number, supplier_id, po_id, status, tenant_id | Debt (auto-create document), Export |
| `goods_receipt_items` | Goods Receipts | id, receipt_id, inventory_id, quantity, tenant_id | Receipt confirm (qty update) |

### Sync & Watcher (3 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `sync_log` | Access Sync | id, filename, source_ref, status, rows_total, tenant_id | Sync tab (log table), Pending badge |
| `pending_sales` | Access Sync | id, barcode_received, quantity, status, brand, model, tenant_id | Pending resolve panel |
| `watcher_heartbeat` | Access Sync (Watcher) | id, last_beat, watcher_version, host, tenant_id | Sync tab (watcher status indicator) |

### Stock Count (2 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `stock_counts` | Stock Count | id, count_number, status, counted_by, filter_criteria, tenant_id | Stock count list, report |
| `stock_count_items` | Stock Count | id, count_id, inventory_id, expected_qty, actual_qty, difference, tenant_id | Stock count session, diff report (⚠️ RLS permissive — will be fixed in Module 2) |

### Auth & Permissions (5 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `roles` | Permissions | id, name_he, is_system, tenant_id | Employee management, role assignment (⚠️ RLS permissive — will be fixed in Module 2) |
| `permissions` | Permissions | id, module, action, name_he, tenant_id | Role management (⚠️ RLS permissive — will be fixed in Module 2) |
| `role_permissions` | Permissions | role_id, permission_id, granted, tenant_id | getEffectivePermissions (⚠️ RLS permissive — will be fixed in Module 2) |
| `employee_roles` | Permissions | employee_id, role_id, granted_by, tenant_id | initSecureSession, getEffectivePermissions (⚠️ RLS permissive — will be fixed in Module 2) |
| `auth_sessions` | Auth Service | id, employee_id, token, permissions, role_id, tenant_id | loadSession, clearSession |

### Supplier Debt (11 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `document_types` | Debt — Config | id, code, name_he, affects_debt, is_system, tenant_id | Document creation modal, Receipt-Debt |
| `payment_methods` | Debt — Config | id, code, name_he, is_system, tenant_id | Payment wizard |
| `currencies` | Debt — Config | id, code, symbol, is_default, tenant_id | Future multi-currency |
| `supplier_documents` | Debt — Documents | id, supplier_id, document_type_id, document_number, total_amount, paid_amount, status, tenant_id | Debt dashboard, payments, OCR, batch upload |
| `document_links` | Debt — Linking | id, parent_document_id, child_document_id, amount_on_invoice, tenant_id | Invoice linking (delivery note → monthly invoice) |
| `supplier_payments` | Debt — Payments | id, supplier_id, amount, payment_date, payment_method, status, tenant_id | Debt dashboard, supplier detail |
| `payment_allocations` | Debt — Payments | id, payment_id, document_id, allocated_amount, tenant_id | Payment wizard (FIFO allocation) |
| `prepaid_deals` | Debt — Prepaid | id, supplier_id, total_prepaid, total_used, total_remaining, status, tenant_id | Prepaid tab, Receipt-Debt (auto-deduct) |
| `prepaid_checks` | Debt — Prepaid | id, prepaid_deal_id, check_number, amount, status, tenant_id | Prepaid deal detail |
| `supplier_returns` | Debt — Returns | id, supplier_id, return_number, return_type, status, tenant_id | Returns tabs (inventory + debt), Shipments (sendToBox) |
| `supplier_return_items` | Debt — Returns | id, return_id, inventory_id, barcode, quantity, cost_price, tenant_id | Return detail modal, credit note creation |
| `supplier_document_files` | Debt — Documents | id, document_id, file_url, file_name, file_hash, sort_order, tenant_id | Multi-file per document, gallery preview (Phase 8-QA, migration 040) |

### AI Agent (5 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `ai_agent_config` | AI Agent — Config | id, tenant_id, ocr_enabled, confidence_threshold, alerts_enabled | createAlert (flag check), OCR flows, weekly report |
| `supplier_ocr_templates` | AI Agent — OCR Learning | id, tenant_id, supplier_id, document_type_code, accuracy_rate | OCR scan (template matching), historical import |
| `ocr_extractions` | AI Agent — OCR Log | id, tenant_id, file_url, extracted_data, confidence_score, status | Batch OCR, review modal |
| `alerts` | AI Agent — Alerts | id, tenant_id, alert_type, severity, title, status, entity_type, entity_id | alerts-badge.js (all pages), debt dashboard |
| `weekly_reports` | AI Agent — Reports | id, tenant_id, week_start, week_end, report_data | Weekly report tab |

### Communications & Knowledge (6 tables — stubs, no UI)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `conversations` | Communications (future) | id, tenant_id, channel_type, context_type, context_id, status | — |
| `conversation_participants` | Communications (future) | id, tenant_id, conversation_id, participant_type, participant_id, unread_count | — |
| `messages` | Communications (future) | id, tenant_id, conversation_id, sender_type, content, status | — |
| `knowledge_base` | Communications (future) | id, tenant_id, title, answer, category, tags, ai_usable | — |
| `message_reactions` | Communications (future) | id, tenant_id, message_id, employee_id, reaction | — |
| `notification_preferences` | Communications (future) | id, tenant_id, employee_id, in_app, email, whatsapp | — |

### Shipments (3 tables)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `courier_companies` | Shipments — Couriers | id, tenant_id, name, phone, is_active | Shipments wizard (step 3) |
| `shipments` | Shipments — Core | id, tenant_id, box_number, shipment_type, supplier_id, courier_id, locked_at, is_deleted | Shipments list, detail panel, manifest |
| `shipment_items` | Shipments — Items | id, tenant_id, shipment_id, item_type, inventory_id, return_id, barcode, category | Shipments detail, items table |

### Future Stubs (4 tables — DB only, no code)

| Table Name | Owner Module | Key Columns | Used By |
|------------|-------------|-------------|---------|
| `sales` (future) | Future Sales Module | id, inventory_id, barcode, quantity_sold, sale_price, tenant_id | — (⚠️ RLS permissive — future stub, will be fixed in Module 2) |
| `customers` (future) | Future CRM | id, full_name, id_number, phone, email, tenant_id | — (⚠️ RLS permissive — future stub, will be fixed in Module 2) |
| `prescriptions` (future) | Future Prescriptions | id, customer_id, prescription_date, od_sph, os_sph, tenant_id | — (⚠️ RLS permissive — future stub, will be fixed in Module 2) |
| `work_orders` (future) | Future Work Orders | id, order_number, customer_id, prescription_id, status, tenant_id | — (⚠️ RLS permissive — future stub, will be fixed in Module 2) |

---

**Table count verification:** 7 + 2 + 2 + 3 + 2 + 5 + 11 + 5 + 6 + 3 + 4 = **50 tables**
