# GLOBAL_MAP.md — Optic Up Global Project Reference

> **Authority:** Cross-module reference document. For Module 1 internals (modules/inventory/\*, modules/debt/\*, etc.) see Module 1's local MODULE_MAP.md.

---

## 1. HTML Pages

| Page | File | Owner Module | Description |
|------|------|-------------|-------------|
| Home Screen | `index.html` | Core | PIN login modal, module cards, session restore, live clock |
| Inventory | `inventory.html` | Module 1 — Inventory | Full inventory app: 10 tabs (entry, reduction, table, PO, receipts, brands, suppliers, sync, stock count, returns) |
| Supplier Debt | `suppliers-debt.html` | Module 1 — Debt | 5 tabs: suppliers dashboard, documents, payments, prepaid deals, weekly report |
| Employees | `employees.html` | Module 1 — Permissions | Standalone employee management (CRUD, role assignment) |
| Shipments | `shipments.html` | Module 1 — Shipments | Box management: list, 3-step wizard, detail panel, courier settings |
| Settings | `settings.html` | Module 1 — Settings | Tenant config: business info, financial settings, logo upload |

---

## 2. Global JS Files (js/)

### js/shared.js (346 lines)

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

### js/supabase-ops.js (348 lines)

DB operations: CRUD helpers, barcode generation, logging, OCR learning, alerts, validation.

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
| `createAlert` | `alertType: string, severity: string, title: string, entityType?: string, entityId?: string, data?: object, expiresAt?: string` | `Promise<object\|null>` | Create system alert (checks ai_agent_config flags, skips historical docs) |
| `alertPriceAnomaly` | `item: string, poPrice: number, receiptPrice: number, supplierId: string, docId: string` | `Promise<object\|null>` | Create price_anomaly alert |
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

### js/file-upload.js (114 lines)

File upload helper for supplier documents (Supabase Storage).

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `uploadSupplierFile` | `file: File, supplierId: string` | `Promise<{url, fileName, signedUrl}\|null>` | Upload PDF/JPG/PNG to supplier-docs bucket (max 10MB) |
| `getSupplierFileUrl` | `filePath: string` | `Promise<string\|null>` | Get 1-hour signed URL for stored file |
| `renderFilePreview` | `fileUrl: string, fileName: string, containerId: string` | `void` | Render PDF iframe or image preview in container |
| `pickAndUploadFile` | `supplierId: string, callback: function` | `void` | Open file picker, upload, call callback with result |

**Global Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `UPLOAD_ALLOWED_TYPES` | `string[]` | Allowed MIME types: PDF, JPEG, PNG |
| `UPLOAD_MAX_SIZE` | `number` | Max file size: 10MB |

---

### js/pin-modal.js (87 lines)

Reusable PIN prompt modal with 5-digit split input.

**Functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `promptPin` | `title: string, callback: function(pin, emp)` | `void` | Show PIN modal; on valid PIN calls callback with pin string and employee object |
| `_promptPinSubmit` | `pin: string, callback: function, overlay: HTMLElement, digits: NodeList` | `Promise<void>` | Internal: verify PIN, call callback or show error |

---

## 3. Global CSS Files (css/)

| File | Lines | Description |
|------|-------|-------------|
| `css/styles.css` | 392 | Main stylesheet: CSS variables, buttons, forms, tables, modals, toasts, cards, badges, alerts, stock count, admin, loading overlay, responsive breakpoints (768/640/600/480px) |
| `css/header.css` | 349 | Sticky header: 60px height, z-index 1000, RTL 3-zone flex layout (tenant logo+name / "Optic Up" / employee+logout), alerts bell+badge+panel, mobile responsive |

---

## 4. Shared Components (shared/)

### shared/css/variables.css (151 lines) — Phase 1 Step 2 done

66 CSS custom properties (design tokens) extracted from styles.css. Categories:
- Colors — primary (4), semantic (12), gray scale (6), badges (6), alerts (8)
- Typography — font-family (1), font-sizes (8 named tokens)
- Spacing — padding/gap/margin tokens (6)
- Borders — radius (4), border-color (2)
- Shadows — card, header, modal, toast, dropdown (5)
- Z-index — header, nav, loading, modal, toast, dropdown (6)
- Transitions — default timing values (2)

### shared/css/ — pending files

- `components.css` — Phase 1 Step 3 (pending)
- `layout.css` — Phase 1 Step 4 (pending)
- `forms.css` — Phase 1 Step 5 (pending)

### shared/js/ — empty

Future Phase 2+ will populate with shared JS components (theme-loader.js, etc.)

### shared/tests/ — empty

Phase 1 Step 7 will add `ui-test.html` for visual regression testing.

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
| `promptPin` | pin-modal.js | `title: string, callback: function` | `void` | Stock count, reduction, delete, debt payments, returns, shipments |
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
| Module 1.5 — Shared Components | 🔨 In Progress (Phase 1 Step 2 done) | `shared/css/`, `shared/js/`, `shared/tests/` | — | 0 (ui_config JSONB column on tenants only) |

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
