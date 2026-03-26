# Module 2 — Platform Admin — Module Map

> Single reference document for all files, functions, and globals in Module 2.
> Updated every commit that adds/changes code.
> Last updated: 2026-03-26 (Phase 1 complete)

---

## 1. File Index

| # | File | Path | Lines | Responsibility |
|---|------|------|-------|----------------|
| 1 | admin.html | `/admin.html` | 192 | Platform Admin HTML page. Supabase Auth login/logout. Loads shared/css/ (6 files), shared/js/toast.js, shared/js/modal-builder.js, 4 admin JS files. Does NOT load shared.js, auth-service.js, header.js. Two sections: #login-screen (centered card) and #admin-panel (header + welcome). Inline admin-specific CSS. |
| 2 | admin-auth.js | `/modules/admin-platform/admin-auth.js` | 94 | Supabase client for admin context (adminSb). Login (signInWithPassword + platform_admins verify), logout (signOut + UI reset), session check (getSession + verify), getCurrentAdmin (sync cache), requireAdmin (role hierarchy). ROLE_LEVELS constant. _fetchAdmin internal helper. |
| 3 | admin-db.js | `/modules/admin-platform/admin-db.js` | 63 | AdminDB global object. Lightweight DB wrapper with no tenant_id injection. Methods: query (select + eq/order/limit/range filters), getById (single), insert (+ select), update (+ select), rpc. All use adminSb. Errors thrown to caller. |
| 4 | admin-audit.js | `/modules/admin-platform/admin-audit.js` | 20 | logAdminAction() global function. Fire-and-forget audit logger. Inserts to platform_audit_log via AdminDB.insert. Swallows errors (console.error only). Depends on getCurrentAdmin + AdminDB. |
| 5 | admin-app.js | `/modules/admin-platform/admin-app.js` | 88 | App initialization. DOMContentLoaded checks session → showAdminPanel or showLoginScreen. handleLogin (with button disable, audit log, Toast). handleLogout (audit log, signOut, Toast). getRoleDisplayName (Hebrew role names). Duplicate listener prevention via flags. |

---

## 2. Function Registry

| Function | File | Line | Parameters | Returns | Description |
|----------|------|------|-----------|---------|-------------|
| `adminLogin` | admin-auth.js | 18 | email, password | `{ id, email, display_name, role }` | Supabase Auth login + platform_admins check |
| `adminLogout` | admin-auth.js | 36 | — | void | Sign out, clear cache, show login screen |
| `getAdminSession` | admin-auth.js | 44 | — | admin object or null | Check existing Supabase Auth session |
| `getCurrentAdmin` | admin-auth.js | 57 | — | admin object or null | Sync getter — return cached _currentAdmin |
| `requireAdmin` | admin-auth.js | 61 | minRole = 'viewer' | admin object or throws | Role hierarchy: super_admin(3) > support(2) > viewer(1) |
| `_fetchAdmin` | admin-auth.js | 72 | authUserId | admin object or null | Internal — query platform_admins by auth_user_id |
| `AdminDB.query` | admin-db.js | 8 | table, select, filters | data[] | Select with eq/_order/_limit/_range filters |
| `AdminDB.getById` | admin-db.js | 26 | table, id | row | Single row by UUID |
| `AdminDB.insert` | admin-db.js | 34 | table, data | row | Insert + return inserted row |
| `AdminDB.update` | admin-db.js | 42 | table, id, data | row | Update by ID + return |
| `AdminDB.rpc` | admin-db.js | 51 | name, params | data | RPC call wrapper |
| `logAdminAction` | admin-audit.js | 5 | action, targetTenantId?, details? | void | Insert to platform_audit_log, fire-and-forget |
| `showLoginScreen` | admin-app.js | 17 | — | void | Show login form, hide admin panel, bind listeners |
| `handleLogin` | admin-app.js | 31 | — | void | Read inputs, validate, adminLogin, audit, show panel |
| `showAdminPanel` | admin-app.js | 57 | admin | void | Show admin panel, set name/role/welcome |
| `handleLogout` | admin-app.js | 71 | — | void | Audit log, adminLogout, show login, Toast |
| `getRoleDisplayName` | admin-app.js | 80 | role | string | Map role to Hebrew display name |

---

## 3. Global Variables

| Variable | Type | File | Description |
|----------|------|------|-------------|
| `ADMIN_SUPABASE_URL` | const string | admin-auth.js | Supabase project URL (same as ERP) |
| `ADMIN_SUPABASE_ANON` | const string | admin-auth.js | Supabase anon key (same as ERP) |
| `adminSb` | SupabaseClient | admin-auth.js | Supabase client for admin context (no tenant) |
| `_currentAdmin` | let object/null | admin-auth.js | Cached admin session data |
| `ROLE_LEVELS` | const object | admin-auth.js | Role hierarchy map: viewer(1), support(2), super_admin(3) |
| `AdminDB` | const object | admin-db.js | DB wrapper with query/getById/insert/update/rpc |
| `_loginListenersBound` | let boolean | admin-app.js | Flag to prevent duplicate event listeners |
| `_logoutListenerBound` | let boolean | admin-app.js | Flag to prevent duplicate logout listener |

---

## 4. Database Tables (Module 2 owned)

| Table | Scope | Key Columns |
|-------|-------|-------------|
| `plans` | Global | id, name, display_name, limits (JSONB), features (JSONB), price_monthly, price_yearly, sort_order, is_active |
| `platform_admins` | Global | id, auth_user_id, email, display_name, role, status, last_login |
| `platform_audit_log` | Global | id, admin_id, action, target_tenant_id, details (JSONB), ip_address |
| `tenant_config` | Per-tenant | id, tenant_id, key, value (JSONB), UNIQUE(tenant_id, key) |
| `tenant_provisioning_log` | Per-tenant ref | id, tenant_id, step, status, details (JSONB), error_message |

### tenants table extensions (9 columns added)
plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at
