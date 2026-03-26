# Module 2 — Platform Admin — Module Map

> Single reference document for all files, functions, and globals in Module 2.
> Updated every commit that adds/changes code.
> Last updated: 2026-03-26 (Phase 2 complete)

---

## 1. File Index

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | admin.html | `/admin.html` | 195 | Platform Admin HTML page. Supabase Auth login/logout. Loads shared/css/ (6 files), shared/js/toast.js, modal-builder.js, modal-wizard.js, 5 admin JS files. "חנות חדשה" button in welcome section. Two sections: #login-screen and #admin-panel. |
| 2 | admin-auth.js | `/modules/admin-platform/admin-auth.js` | 94 | Supabase client for admin context (adminSb). Login, logout, session check, getCurrentAdmin, requireAdmin. ROLE_LEVELS constant. _fetchAdmin internal. |
| 3 | admin-db.js | `/modules/admin-platform/admin-db.js` | 63 | AdminDB global object. Lightweight DB wrapper with no tenant_id injection. Methods: query, getById, insert, update, rpc. All use adminSb. |
| 4 | admin-audit.js | `/modules/admin-platform/admin-audit.js` | 20 | logAdminAction() — fire-and-forget audit logger. Swallows errors. |
| 5 | admin-provisioning.js | `/modules/admin-platform/admin-provisioning.js` | 320 | 3-step wizard (store details → plan+PIN → summary). Slug auto-suggest + debounced real-time validation via validate_slug RPC. provisionTenant() calls create_tenant RPC, logs to provisioning_log + audit. Credentials modal on success. |
| 6 | admin-app.js | `/modules/admin-platform/admin-app.js` | 89 | App init. DOMContentLoaded → getAdminSession → showAdminPanel or showLoginScreen. handleLogin/handleLogout. Wires btn-new-tenant → initProvisioningWizard. |
| 7 | auth-service.js (ERP) | `/js/auth-service.js` | 341 | MODIFIED in Phase 2: added checkMustChangePin() called at end of initSecureSession. Undismissible PIN change overlay for must_change_pin=true employees. |

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

### Admin App (admin-app.js)
| Function | Line | Parameters | Returns | Description |
|----------|------|-----------|---------|-------------|
| `showLoginScreen` | 17 | — | void | Show login form, hide admin panel |
| `handleLogin` | 31 | — | void | Read inputs, validate, adminLogin, audit, show panel |
| `showAdminPanel` | 62 | admin | void | Show admin panel, wire logout + provisioning buttons |
| `handleLogout` | 76 | — | void | Audit log, adminLogout, show login |
| `getRoleDisplayName` | 85 | role | string | Map role to Hebrew display name |

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
| `_logoutListenerBound` | let boolean | admin-app.js | Duplicate listener prevention |
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
