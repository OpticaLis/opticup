# Module 2 — Platform Admin — Module Spec

> **Authority:** Current state of Module 2. Updated at end of each phase.
> **Last updated:** 2026-03-26 (Phase 1 complete)

---

## 1. Tables

### New Tables (5)

| Table | Scope | Description |
|-------|-------|-------------|
| `plans` | Global (no tenant_id) | Subscription plans: basic, premium, enterprise. JSONB limits + features. |
| `platform_admins` | Global (no tenant_id) | Platform admin users linked to Supabase Auth. Roles: super_admin, support, viewer. |
| `platform_audit_log` | Global (no tenant_id) | Every admin action logged: login, logout, tenant changes. |
| `tenant_config` | Per-tenant (has tenant_id) | Key-value config per tenant. UNIQUE(tenant_id, key). |
| `tenant_provisioning_log` | Per-tenant ref | Step-by-step log of tenant creation process. |

### Extended Table

| Table | New Columns |
|-------|-------------|
| `tenants` | plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at |

### RLS

All 5 tables have RLS enabled.
- `plans` — SELECT for all, write via is_platform_super_admin()
- `platform_admins` — SELECT where auth.uid() = auth_user_id, write via is_platform_super_admin()
- `platform_audit_log` — SELECT for active admins, INSERT WITH CHECK (true)
- `tenant_config` — SELECT by tenant_id (RLS) + admin bypass, write via admin
- `tenant_provisioning_log` — SELECT for active admins, INSERT by service role

### RPC Functions

| Function | Type | Description |
|----------|------|-------------|
| `is_platform_super_admin()` | SECURITY DEFINER | Returns boolean — checks if auth.uid() is super_admin in platform_admins. Used by RLS policies to avoid infinite recursion. |

---

## 2. Files

| File | Path | Lines | Description |
|------|------|-------|-------------|
| admin.html | `/admin.html` | 192 | Platform Admin HTML — Supabase Auth login, shared CSS, no ERP dependencies |
| admin-auth.js | `/modules/admin-platform/admin-auth.js` | 94 | Supabase client (adminSb), login/logout/session, admin verification |
| admin-db.js | `/modules/admin-platform/admin-db.js` | 63 | AdminDB wrapper — query, getById, insert, update, rpc (no tenant_id) |
| admin-audit.js | `/modules/admin-platform/admin-audit.js` | 20 | logAdminAction() — fire-and-forget audit logger |
| admin-app.js | `/modules/admin-platform/admin-app.js` | 88 | App init, login/panel toggle, event handlers |

---

## 3. Contracts (Public API)

### Auth (admin-auth.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `adminLogin` | email, password | `{ id, email, display_name, role }` | Supabase Auth login + platform_admins verification |
| `adminLogout` | — | void | Sign out + UI reset |
| `getAdminSession` | — | admin object or null | Check existing session + verify active admin |
| `getCurrentAdmin` | — | admin object or null | Sync getter — cached admin |
| `requireAdmin` | minRole = 'viewer' | admin object or throws | Role hierarchy check |

### DB (admin-db.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `AdminDB.query` | table, select, filters | data[] | Query with filters, _order, _limit, _range |
| `AdminDB.getById` | table, id | row | Single row by ID |
| `AdminDB.insert` | table, data | row | Insert + return |
| `AdminDB.update` | table, id, data | row | Update + return |
| `AdminDB.rpc` | name, params | data | RPC call |

### Audit (admin-audit.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `logAdminAction` | action, targetTenantId?, details? | void | Fire-and-forget audit log entry |

---

## 4. Architecture Notes

- admin.html is a **separate world** from ERP — different auth (Supabase Auth vs PIN JWT), different client (adminSb vs sb), no tenant context
- Shared CSS loaded (variables, layout, components, forms, modal, toast) but NO shared.js, auth-service.js, or header.js
- Toast.js and modal-builder.js loaded from shared/js/ for UI notifications
- Session managed by Supabase Auth (auto-persisted in localStorage)
