# Module 2 — Platform Admin — Module Map

> Single reference document for all files, functions, and globals in Module 2.
> Updated every commit that adds/changes code.
> Last updated: 2026-03-26 (Phase 3g)

---

## 1. File Index

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | admin.html | `/admin.html` | 258 | Platform Admin HTML page. Login screen + full dashboard layout. Header (logo + admin name/role + logout), nav tabs (חנויות/Audit Log/הגדרות), toolbar (new tenant + search + filters), content areas (tenants/audit/settings), slide-in panel (tenant detail with 4 tabs). Loads shared/css/ (8 files), shared/js/ (toast, modal-builder, modal-wizard, table-builder), 5 admin JS files. |
| 2 | admin-auth.js | `/modules/admin-platform/admin-auth.js` | 94 | Supabase client for admin context (adminSb). Login, logout, session check, getCurrentAdmin, requireAdmin. ROLE_LEVELS constant. _fetchAdmin internal. |
| 3 | admin-db.js | `/modules/admin-platform/admin-db.js` | 63 | AdminDB global object. Lightweight DB wrapper with no tenant_id injection. Methods: query, getById, insert, update, rpc. All use adminSb. |
| 4 | admin-audit.js | `/modules/admin-platform/admin-audit.js` | 20 | logAdminAction() — fire-and-forget audit logger. Swallows errors. |
| 5 | admin-provisioning.js | `/modules/admin-platform/admin-provisioning.js` | 320 | 3-step wizard (store details → plan+PIN → summary). Slug auto-suggest + debounced real-time validation via validate_slug RPC. provisionTenant() calls create_tenant RPC, logs to provisioning_log + audit. Credentials modal on success. |
| 6 | admin-app.js | `/modules/admin-platform/admin-app.js` | 229 | App init + tab routing + panel open/close. DOMContentLoaded → session check → showAdminPanel or showLoginScreen. switchTab (tenants/audit/settings), openTenantPanel/closeTenantPanel, switchPanelTab, search+filter event wiring. Exposes globals: switchTab, openTenantPanel, closeTenantPanel, switchPanelTab, selectedTenantId. |
| 7 | admin-dashboard.js | `/modules/admin-platform/admin-dashboard.js` | 194 | Tenant list table + filters + search. loadTenants() calls get_all_tenants_overview RPC, filterTenants() applies client-side search/status/plan filters, renderTenantsTable() uses TableBuilder. Sort, relative time, plan filter population. Exposes: loadTenants, filterTenants, initDashboard. |
| 8 | admin-tenant-detail.js | `/modules/admin-platform/admin-tenant-detail.js` | 353 | Slide-in panel content. loadTenantDetail loads stats + renders header. Tab 1 (info/edit/actions): details view, edit mode, suspend/activate/delete/reset PIN. Tab 3 (provisioning log). Tab 4 (audit log, super_admin only). Exposes: loadTenantDetail, renderPanelTab. |
| 9 | auth-service.js (ERP) | `/js/auth-service.js` | 341 | MODIFIED in Phase 2: added checkMustChangePin() called at end of initSecureSession. Undismissible PIN change overlay for must_change_pin=true employees. |

---

## 2. Function Registry

### Admin Auth (admin-auth.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `adminLogin` | 18 | email, password | `{ id, email, display_name, role }` | Supabase Auth login + platform_admins check |
| `adminLogout` | 36 | — | void | Sign out, clear cache, show login screen |
| `getAdminSession` | 44 | — | admin object or null | Check existing Supabase Auth session |
| `getCurrentAdmin` | 57 | — | admin object or null | Sync getter — return cached _currentAdmin |
| `requireAdmin` | 61 | minRole = 'viewer' | admin object or throws | Role hierarchy check |
| `_fetchAdmin` | 72 | authUserId | admin object or null | Internal — query platform_admins |

### Admin DB (admin-db.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `AdminDB.query` | 8 | table, select, filters | data[] | Select with eq/_order/_limit/_range |
| `AdminDB.getById` | 26 | table, id | row | Single row by UUID |
| `AdminDB.insert` | 34 | table, data | row | Insert + return |
| `AdminDB.update` | 42 | table, id, data | row | Update by ID + return |
| `AdminDB.rpc` | 51 | name, params | data | RPC call wrapper |

### Admin Audit (admin-audit.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `logAdminAction` | 5 | action, targetTenantId?, details? | void | Fire-and-forget audit log |

### Admin Provisioning (admin-provisioning.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `slugify` | 14 | text | string | Lowercase, remove Hebrew, spaces→hyphens, limit 30 chars |
| `validateSlugRealtime` | 27 | slug | void | Debounced 500ms, calls validate_slug RPC, updates #slug-status |
| `_formatPlanLabel` | 62 | plan | string | Format plan display: "name — עד X עובדים, Y פריטים" |
| `_buildStep1` | 73 | — | string | HTML for step 1: store name, slug, owner details |
| `_buildStep2` | 101 | — | string | HTML for step 2: plan dropdown, employee name, PIN |
| `_buildSummary` | 121 | — | string | HTML for step 3: read-only summary of all values |
| `_esc` | 145 | s | string | HTML escape via textContent (XSS prevention) |
| `initProvisioningWizard` | 152 | — | void | Opens 3-step Modal.wizard, loads plans, validates, submits |
| `provisionTenant` | 261 | params | void | Calls create_tenant RPC, provisioning log, audit log, credentials modal |

### Admin Dashboard (admin-dashboard.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `initDashboard` | 14 | — | void | One-time init: populate plan filter + loadTenants. Subsequent calls just reload. |
| `loadTenants` | 22 | — | void | Call get_all_tenants_overview RPC, store in allTenants, call filterTenants |
| `filterTenants` | 36 | — | void | Read DOM filters, filter allTenants client-side, render table |
| `renderTenantsTable` | 101 | tenants | void | Pass filtered data to TableBuilder instance |
| `handleSort` | 106 | key, dir | void | Re-filter + sort allTenants, update table |
| `formatRelativeTime` | 139 | dateString | string | Relative time in Hebrew (דקות/שעות/ימים) or DD/MM/YYYY |
| `populatePlanFilter` | 159 | — | void | Load plans from DB, populate #filter-plan dropdown |

### Admin Tenant Detail (admin-tenant-detail.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `loadTenantDetail` | 29 | tenantId | void | Load stats, find tenant in allTenants, render header + info tab |
| `renderPanelTab` | 63 | tabName | void | Route to info/activity/provisioning/audit tab renderer |
| `_renderDetailsTab` | 73 | container, actionsEl | void | Info display + edit button + action buttons |
| `_enterEditMode` | 127 | container, actionsEl | void | Replace info with input fields + save/cancel |
| `_saveChanges` | 143 | container, actionsEl | void | Collect diffs, call update_tenant RPC, refresh |
| `_suspendTenant` | 162 | — | void | Modal with reason textarea, call suspend_tenant RPC |
| `_activateTenant` | 181 | — | void | Modal.confirm, call activate_tenant RPC |
| `_deleteTenant` | 195 | — | void | Modal.danger (type slug), call delete_tenant RPC, close panel |
| `_resetEmployeePin` | 210 | — | void | Load employees, Modal.form with dropdown + PIN, call reset_employee_pin RPC |
| `_renderProvisioningTab` | 234 | container | void | Query tenant_provisioning_log, render simple table |
| `_renderTenantAuditTab` | 257 | container | void | Query platform_audit_log for tenant, super_admin only |

### Admin App (admin-app.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `showLoginScreen` | 24 | — | void | Show login form, hide admin panel |
| `handleLogin` | 40 | — | void | Read inputs, validate, adminLogin, audit, show panel |
| `handleLogout` | 67 | — | void | Close panel, audit log, adminLogout, show login |
| `getRoleDisplayName` | 76 | role | string | Map role to Hebrew display name |
| `showAdminPanel` | 82 | admin | void | Show admin panel, wire all listeners (tabs, panel, search, filters), call switchTab('tenants') |
| `switchTab` | 142 | tabName | void | Tab routing: hide/show content areas, update active class, trigger data load |
| `openTenantPanel` | 162 | tenantId | void | Show overlay + slide-in panel, set selectedTenantId, call loadTenantDetail if exists |
| `closeTenantPanel` | 176 | — | void | Hide panel + overlay with transition, clear selectedTenantId |
| `switchPanelTab` | 193 | tabName | void | Update panel tab active class, call renderPanelTab if exists |

### ERP Auth (auth-service.js — Phase 2 addition)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `checkMustChangePin` | 143 | employee | Promise<void> | Query must_change_pin, show undismissible overlay if true, update PIN + clear flag |

---

## 3. Global Variables

| Variable | Type | File | Description |
|----------|------|------|-------------|
| `ADMIN_SUPABASE_URL` | const string | admin-auth.js | Supabase project URL |
| `ADMIN_SUPABASE_ANON` | const string | admin-auth.js | Supabase anon key |
| `adminSb` | SupabaseClient | admin-auth.js | Supabase client for admin context |
| `_currentAdmin` | let object/null | admin-auth.js | Cached admin session data |
| `ROLE_LEVELS` | const object | admin-auth.js | Role hierarchy map |
| `AdminDB` | const object | admin-db.js | DB wrapper object |
| `_loginListenersBound` | let boolean | admin-app.js | Duplicate listener prevention |
| `_panelListenersBound` | let boolean | admin-app.js | Duplicate listener prevention (tabs, panel, filters) |
| `currentTab` | let string | admin-app.js | Active top-level tab ('tenants'\|'audit'\|'settings') |
| `selectedTenantId` | let string/null | admin-app.js | Currently open tenant in slide-in panel |
| `_searchDebounceTimer` | let number/null | admin-app.js | Debounce timer for search input |
| `allTenants` | let array | admin-dashboard.js | Cached tenant overview data from RPC |
| `_tenantsTable` | let TableInstance/null | admin-dashboard.js | TableBuilder instance for tenant list |
| `_dashboardInited` | let boolean | admin-dashboard.js | One-time init guard |
| `_currentTenant` | let object/null | admin-tenant-detail.js | Currently loaded tenant data |
| `_currentStats` | let object/null | admin-tenant-detail.js | get_tenant_stats result for current tenant |
| `_plansMap` | let object/null | admin-tenant-detail.js | Plans cache: id → {display_name, limits, features} |
| `_slugDebounceTimer` | let number/null | admin-provisioning.js | Slug validation debounce timer |
| `_slugValid` | let boolean | admin-provisioning.js | Current slug validation state |
| `_plansCache` | let array/null | admin-provisioning.js | Cached plans from DB (loaded once) |

---

## 4. Database Tables (Module 2 owned)

| Table | Scope | Key Columns |
|-------|-------|-------------|
| `plans` | Global | id, name, display_name, limits (JSONB), features (JSONB), price_monthly, price_yearly, sort_order, is_active |
| `platform_admins` | Global | id, auth_user_id, email, display_name, role, status, last_login |
| `platform_audit_log` | Global | id, admin_id, action, target_tenant_id, details (JSONB), ip_address |
| `tenant_config` | Per-tenant | id, tenant_id, key, value (JSONB), UNIQUE(tenant_id, key) |
| `tenant_provisioning_log` | Per-tenant ref (nullable) | id, tenant_id, step, status, details (JSONB), error_message |

### tenants table extensions (9 columns added in Phase 1)
plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at

### employees table extension (Phase 2)
must_change_pin (BOOLEAN DEFAULT false)

### RPC Functions
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `is_platform_super_admin()` | — | boolean | SECURITY DEFINER. Checks auth.uid() in platform_admins. |
| `create_tenant(...)` | p_name, p_slug, p_owner_name, p_owner_email, p_owner_phone?, p_plan_id, p_admin_pin?, p_admin_name?, p_created_by? | UUID | SECURITY DEFINER. 10-step atomic provisioning. |
| `validate_slug(p_slug)` | p_slug TEXT | JSONB {valid, reason} | SECURITY DEFINER. Format+reserved+uniqueness check. |
| `delete_tenant(p_tenant_id, p_deleted_by)` | p_tenant_id UUID, p_deleted_by UUID | void | SECURITY DEFINER. Soft delete (status='deleted'). |
| `get_all_tenants_overview()` | — | JSONB array | SECURITY DEFINER. All non-deleted tenants with plan name (LEFT JOIN), employees/inventory/suppliers counts. |
| `get_tenant_stats(p_tenant_id)` | p_tenant_id UUID | JSONB object | SECURITY DEFINER. Single tenant counts: employees, inventory (is_deleted=false), suppliers (active=true), documents, brands (active=true). |
| `suspend_tenant(...)` | p_tenant_id UUID, p_reason TEXT, p_admin_id UUID | void | SECURITY DEFINER. Verifies status='active', sets suspended + reason. Audit log. |
| `activate_tenant(...)` | p_tenant_id UUID, p_admin_id UUID | void | SECURITY DEFINER. Verifies status IN ('suspended','trial'), sets active. Audit log. |
| `update_tenant(...)` | p_tenant_id UUID, p_updates JSONB, p_admin_id UUID | void | SECURITY DEFINER. Whitelist fields, captures old values, applies updates, audit with old+new diff. |
| `get_tenant_activity_log(...)` | p_tenant_id UUID, p_limit INT, p_offset INT, p_level TEXT, p_entity_type TEXT, p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ | JSONB {total, entries} | SECURITY DEFINER. Paginated activity_log with optional filters. |
| `get_tenant_employees(p_tenant_id)` | p_tenant_id UUID | JSONB array [{id, name}] | SECURITY DEFINER. Minimal employee list for PIN reset dropdown. |
| `reset_employee_pin(...)` | p_tenant_id UUID, p_employee_id UUID, p_new_pin TEXT, p_must_change BOOLEAN, p_admin_id UUID | void | SECURITY DEFINER. Verifies employee∈tenant, resets PIN + unlock. PIN not in audit. |
