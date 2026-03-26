# Module 2 — Platform Admin — Module Map

> Single reference document for all files, functions, and globals in Module 2.
> Updated every commit that adds/changes code.
> Last updated: 2026-03-26 (Phase 5 complete)

---

## 1. File Index

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | admin.html | `/admin.html` | 271 | Platform Admin HTML page. Login screen + full dashboard layout. Header (logo + admin name/role + logout), nav tabs (חנויות/Audit Log/הגדרות), toolbar (new tenant + search + filters), content areas (tenants/audit/settings), slide-in panel (tenant detail with 4 tabs). Loads shared/css/ (8 files), shared/js/ (toast, modal-builder, modal-wizard, table-builder), 11 admin JS files. |
| 2 | admin-auth.js | `/modules/admin-platform/admin-auth.js` | 105 | Supabase client for admin context (adminSb). Login, logout, session check, getCurrentAdmin, requireAdmin, hasAdminPermission. ROLE_LEVELS constant. Exposes: getCurrentAdmin, hasAdminPermission. |
| 3 | admin-db.js | `/modules/admin-platform/admin-db.js` | 63 | AdminDB global object. Lightweight DB wrapper with no tenant_id injection. Methods: query, getById, insert, update, rpc. All use adminSb. |
| 4 | admin-audit.js | `/modules/admin-platform/admin-audit.js` | 143 | logAdminAction() audit logger + platform audit log viewer (top-level Audit Log tab). Action filter, Hebrew labels, admin+tenant JOINs. super_admin only. Exposes: loadPlatformAuditLog. |
| 5 | admin-provisioning.js | `/modules/admin-platform/admin-provisioning.js` | 320 | 3-step wizard (store details → plan+PIN → summary). Slug auto-suggest + debounced real-time validation via validate_slug RPC. provisionTenant() calls create_tenant RPC, logs to provisioning_log + audit. Credentials modal on success. |
| 6 | admin-app.js | `/modules/admin-platform/admin-app.js` | 237 | App init + tab routing + panel open/close. DOMContentLoaded → session check → showAdminPanel or showLoginScreen. switchTab (tenants/audit/settings→loadPlansTab), openTenantPanel/closeTenantPanel, switchPanelTab, search+filter event wiring. Exposes globals: switchTab, openTenantPanel, closeTenantPanel, switchPanelTab, selectedTenantId. |
| 7 | admin-dashboard.js | `/modules/admin-platform/admin-dashboard.js` | 196 | Tenant list table + filters + search. loadTenants() calls get_all_tenants_overview RPC, filterTenants() applies client-side search/status/plan filters, renderTenantsTable() uses TableBuilder. Sort, relative time, plan filter population. Exposes: loadTenants, filterTenants, initDashboard. |
| 8 | admin-tenant-detail.js | `/modules/admin-platform/admin-tenant-detail.js` | 361 | Slide-in panel content. loadTenantDetail loads stats + renders header. Tab 1 (info/edit/actions + feature overrides container): details view, edit mode, suspend/activate/delete/reset PIN. Tab 3 (provisioning log). Tab 4 (audit log, super_admin only). Exposes: loadTenantDetail, renderPanelTab. |
| 9 | admin-plans.js | `/modules/admin-platform/admin-plans.js` | 261 | Plans CRUD UI in הגדרות tab. Table renders all plans with limits (∞ for -1). Click row → edit modal with 7 limit fields + 17 feature checkboxes + price/sort/active. FEATURE_LABELS global constant. Exposes: loadPlansTab, openPlanEditor, FEATURE_LABELS. |
| 10 | admin-feature-overrides.js | `/modules/admin-platform/admin-feature-overrides.js` | 97 | Per-tenant feature override UI rendered in tenant detail Tab 1. Loads plan features + tenant_config overrides. 17 rows × 3-state select (plan/force-on/force-off). Save upserts/deletes tenant_config key='feature_overrides'. super_admin only. Exposes: renderFeatureOverrides. |
| 11 | admin-activity-viewer.js | `/modules/admin-platform/admin-activity-viewer.js` | 189 | Activity log viewer per tenant (Tab 2). Filters: date range, entity type, level. Paginated 50/page via get_tenant_activity_log RPC. Exposes: loadTenantActivityLog. |
| 12 | plan-helpers.js | `/shared/js/plan-helpers.js` | 107 | Client-side plan limit/feature checking for ERP pages. 30s cache (_getPlanData). Calls check_plan_limit + is_feature_enabled RPCs. Fail-safe on errors. Loaded by index.html, inventory.html, employees.html, suppliers-debt.html. Exposes: checkPlanLimit, isFeatureEnabled, getPlanLimits, getPlanFeatures, invalidatePlanCache. |
| 13 | error.html | `/error.html` | 48 | Standalone error page. 3 states via ?type= param: not-found (slug), suspended (name+support), deleted. Loads shared/css/variables.css only. No shared.js. Indigo palette, centered card. |
| 14 | landing.html | `/landing.html` | 62 | Standalone store code entry page. Slug input (dir=ltr), goToStore() validates format + redirects to /?t=slug. Loads shared/css/variables.css only. No shared.js. |
| 15 | shared.js (ERP) | `/js/shared.js` | 343 | MODIFIED in Phase 5: sync TENANT_SLUG IIFE (URL/sessionStorage), resolveTenant() async (DB query + status check + redirect), auto-resolve for non-index pages. Removed: showTenantBlocked, suspended IIFE guard, 'prizma' default. |
| 16 | index.html (ERP) | `/index.html` | ~375 | MODIFIED in Phase 5: removed local resolveTenant/showTenantPicker/tenant-picker HTML, module card hrefs with ?t=slug. Phase 4d: data-feature attrs, applyFeatureFlags, plan-helpers.js. |
| 17 | auth-service.js (ERP) | `/js/auth-service.js` | 341 | MODIFIED in Phase 2: added checkMustChangePin() called at end of initSecureSession. Undismissible PIN change overlay for must_change_pin=true employees. |

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
| `hasAdminPermission` | 80 | requiredRole | boolean | Check if current admin role >= required role level |
| `_fetchAdmin` | 86 | authUserId | admin object or null | Internal — query platform_admins |

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
| `logAdminAction` | 7 | action, targetTenantId?, details? | void | Fire-and-forget audit log |
| `loadPlatformAuditLog` | 49 | — | void | Load all audit entries (100 limit), render table with action filter. super_admin only. |
| `_renderAuditLog` | 72 | container | void | Render filter dropdown + entries table, wire filter change |

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
| `_enterEditMode` | 148 | — | void | Gets fresh DOM refs, replaces info with input fields + save/cancel |
| `_saveChanges` | 168 | — | void | Collect diffs, call update_tenant RPC, _refreshAfterAction re-renders |
| `_suspendTenant` | 162 | — | void | Modal with reason textarea, call suspend_tenant RPC |
| `_activateTenant` | 181 | — | void | Modal.confirm, call activate_tenant RPC |
| `_deleteTenant` | 195 | — | void | Modal.danger (type slug), call delete_tenant RPC, close panel |
| `_resetEmployeePin` | 210 | — | void | Load employees, Modal.form with dropdown + PIN, call reset_employee_pin RPC |
| `_renderProvisioningTab` | 234 | container | void | Query tenant_provisioning_log, render simple table |
| `_renderTenantAuditTab` | 257 | container | void | Query platform_audit_log for tenant, super_admin only |

### Admin Activity Viewer (admin-activity-viewer.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `loadTenantActivityLog` | 20 | tenantId | void | Init viewer: reset filters/page, render filters + fetch entries |
| `_fetchAndRender` | 89 | — | void | Call get_tenant_activity_log RPC with current filters/page, render results |
| `_renderEntries` | 107 | container, entries, total | void | Render entry cards + pagination controls |
| `_formatTimestamp` | 146 | dateStr | string | DD/MM HH:mm or DD/MM/YYYY HH:mm if >7 days |
| `_formatDetails` | 156 | details | string | First 3 keys from JSONB, truncated values |

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

### Admin Plans (admin-plans.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `loadPlansTab` | 12 | — | void | Fetch all plans, render table with TableBuilder. ∞ for -1 values. super_admin: click row → edit. |
| `openPlanEditor` | 98 | planId? | void | Modal with limits/features/prices form. Loads existing plan or blank. super_admin only. |
| `_savePlanFromModal` | 167 | planId? | void | Collect form data, build limits/features JSONB, insert/update plan, confirm if affecting tenants. |
| `togglePlanActive` | 225 | planId, currentState | void | Deactivate/activate plan. Checks no active tenants on deactivate. |

### Admin Feature Overrides (admin-feature-overrides.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `renderFeatureOverrides` | 8 | tenantId, planId, container | void | Load plan features + tenant overrides, render 17 rows with 3-state selects + save button. |

### Plan Helpers (shared/js/plan-helpers.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `_getPlanData` | 11 | — | `{ limits, features }` | Internal. Cached 30s. Queries tenants→plans JOIN. Fail-safe: empty objects. |
| `checkPlanLimit` | 32 | resource | `{ allowed, current, limit, remaining, message }` | Calls check_plan_limit RPC. Fail-safe: allowed=true. |
| `isFeatureEnabled` | 52 | feature | boolean | Calls is_feature_enabled RPC. Fail-safe: true. |
| `getPlanLimits` | 68 | — | object | Returns cached plan limits JSONB. |
| `getPlanFeatures` | 76 | — | object | Returns cached plan features JSONB. |
| `invalidatePlanCache` | 84 | — | void | Reset _planCache + _planCacheTime. |

### Tenant Resolution (shared.js — Phase 5)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `resolveTenant` | 66 | — | `Promise<object\|null>` | Centralized tenant resolution. If TENANT_SLUG + tenant_id cached → early return. Else query tenants by slug, redirect on not-found/suspended/deleted. Sets TENANT_SLUG + sessionStorage. |

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
| `_actTenantId` | let string/null | admin-activity-viewer.js | Current tenant for activity log |
| `_actPage` | let number | admin-activity-viewer.js | Current pagination page (0-indexed) |
| `_actFilters` | let object | admin-activity-viewer.js | Filter state: level, entityType, dateFrom, dateTo |
| `_slugDebounceTimer` | let number/null | admin-provisioning.js | Slug validation debounce timer |
| `_slugValid` | let boolean | admin-provisioning.js | Current slug validation state |
| `_plansCache` | let array/null | admin-provisioning.js | Cached plans from DB (loaded once) |
| `_plansData` | let array | admin-plans.js | Cached plans data for table rendering |
| `FEATURE_LABELS` | const object | admin-plans.js | 17-entry map: feature key → Hebrew label (global) |
| `LIMIT_FIELDS` | const array | admin-plans.js | 7-entry array of {key, label} for limit form fields |
| `_planCache` | let object/null | plan-helpers.js | Cached plan data ({limits, features}) |
| `_planCacheTime` | let number | plan-helpers.js | Timestamp of last cache fill (30s TTL) |
| `PLAN_CACHE_TTL` | const number | plan-helpers.js | Cache TTL: 30000ms |

---

## 4. Database Tables (Module 2 owned)

| Table | Scope | Key Columns |
|-------|-------|-------------|
| `plans` | Global | id, name, display_name, limits (JSONB), features (JSONB), price_monthly, price_yearly, sort_order, is_active |
| `platform_admins` | Global | id, auth_user_id, email, display_name, role, status, last_login |
| `platform_audit_log` | Global | id, admin_id, action, target_tenant_id, details (JSONB), ip_address |
| `tenant_config` | Per-tenant | id, tenant_id, key, value (JSONB), UNIQUE(tenant_id, key) |
| `tenant_provisioning_log` | Per-tenant ref (nullable) | id, tenant_id, step, status, details (JSONB), error_message |
| `storefront_config` | Per-tenant (UNIQUE) | id, tenant_id, enabled, domain, subdomain, theme (JSONB), logo_url, categories (JSONB), seo (JSONB), pages (JSONB) |

### tenants table extensions (10 columns added in Phase 1 + 3)
plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at, last_active

### employees table extension (Phase 2)
must_change_pin (BOOLEAN DEFAULT false)

### RPC Functions
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `is_platform_super_admin()` | — | boolean | SECURITY DEFINER. Checks auth.uid() in platform_admins. |
| `create_tenant(...)` | p_name, p_slug, p_owner_name, p_owner_email, p_owner_phone?, p_plan_id, p_admin_pin?, p_admin_name?, p_created_by? | UUID | SECURITY DEFINER. 11-step atomic provisioning (step 11: storefront_config). |
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
| `check_plan_limit(...)` | p_tenant_id UUID, p_resource TEXT | JSONB | SECURITY DEFINER. Maps resource→'max_'+resource, counts usage, returns {allowed, current, limit, remaining, message}. No plan/-1 = unlimited. |
| `is_feature_enabled(...)` | p_tenant_id UUID, p_feature TEXT | BOOLEAN | SECURITY DEFINER. Priority: tenant_config feature_overrides → plan.features → fail-safe true. |
