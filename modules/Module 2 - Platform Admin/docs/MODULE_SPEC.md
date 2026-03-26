# Module 2 — Platform Admin — Module Spec

> **Authority:** Current state of Module 2. Updated at end of each phase.
> **Last updated:** 2026-03-26 (Phase 2 complete)

---

## 1. Tables

### New Tables (5)

| Table | Scope | Description |
|-------|-------|-------------|
| `plans` | Global (no tenant_id) | Subscription plans: basic, premium, enterprise. JSONB limits + features. |
| `platform_admins` | Global (no tenant_id) | Platform admin users linked to Supabase Auth. Roles: super_admin, support, viewer. |
| `platform_audit_log` | Global (no tenant_id) | Every admin action logged: login, logout, tenant changes. |
| `tenant_config` | Per-tenant (has tenant_id) | Key-value config per tenant. UNIQUE(tenant_id, key). |
| `tenant_provisioning_log` | Per-tenant ref (nullable tenant_id) | Step-by-step log of tenant creation process. tenant_id nullable for failure logging. |

### Extended Tables

| Table | New Columns |
|-------|-------------|
| `tenants` | plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at |
| `employees` | must_change_pin (BOOLEAN DEFAULT false) — forces PIN change on first login |

### RLS

All 5 tables have RLS enabled.
- `plans` — SELECT for all, write via is_platform_super_admin()
- `platform_admins` — SELECT where auth.uid() = auth_user_id, write via is_platform_super_admin()
- `platform_audit_log` — SELECT for active admins, INSERT WITH CHECK (true)
- `tenant_config` — SELECT by tenant_id (RLS) + admin bypass, write via admin
- `tenant_provisioning_log` — SELECT for active admins, INSERT for active admins (provisioning_log_admin_insert)

### RPC Functions

| Function | Type | Description |
|----------|------|-------------|
| `is_platform_super_admin()` | SECURITY DEFINER | Returns boolean — checks if auth.uid() is super_admin in platform_admins. Used by RLS policies. |
| `create_tenant(...)` | SECURITY DEFINER | 10-step atomic provisioning: tenant → config → roles → permissions → role_permissions → employee → employee_roles → doc_types → payment_methods. Returns UUID. |
| `validate_slug(p_slug)` | SECURITY DEFINER | Validates slug format (3-30 chars, a-z0-9-), reserved words (22 words), uniqueness. Returns JSONB {valid, reason}. |
| `delete_tenant(p_tenant_id, p_deleted_by)` | SECURITY DEFINER | Soft delete: sets status='deleted', deleted_at=now(). No data removal. |

---

## 2. Files

| File | Path | Lines | Description |
|------|------|-------|-------------|
| admin.html | `/admin.html` | 195 | Platform Admin HTML — login, "חנות חדשה" button, loads modal-wizard.js + provisioning |
| admin-auth.js | `/modules/admin-platform/admin-auth.js` | 94 | Supabase client (adminSb), login/logout/session, admin verification |
| admin-db.js | `/modules/admin-platform/admin-db.js` | 63 | AdminDB wrapper — query, getById, insert, update, rpc (no tenant_id) |
| admin-audit.js | `/modules/admin-platform/admin-audit.js` | 20 | logAdminAction() — fire-and-forget audit logger |
| admin-provisioning.js | `/modules/admin-platform/admin-provisioning.js` | 320 | 3-step wizard, slug validation, provisionTenant() RPC call + logging |
| admin-app.js | `/modules/admin-platform/admin-app.js` | 89 | App init, login/panel toggle, event handlers, wires provisioning button |

### Modified ERP Files

| File | Path | Lines | Change |
|------|------|-------|--------|
| auth-service.js | `/js/auth-service.js` | 341 | Added checkMustChangePin() — undismissible PIN change overlay for must_change_pin=true |

### Reference Files

| File | Path | Description |
|------|------|-------------|
| create_tenant_rpc.sql | `/modules/Module 2 - Platform Admin/docs/create_tenant_rpc.sql` | Full SQL for all Phase 2 RPCs + schema changes |
| PHASE_1_SPEC.md | `/modules/Module 2 - Platform Admin/docs/PHASE_1_SPEC.md` | Phase 1 specification |
| PHASE_2_SPEC.md | `/modules/Module 2 - Platform Admin/docs/PHASE_2_SPEC.md` | Phase 2 specification |

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

### Provisioning (admin-provisioning.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `initProvisioningWizard` | — | void | Opens 3-step Modal.wizard for tenant creation |
| `slugify` | text | string | Converts text to URL-safe slug (lowercase, hyphens) |
| `validateSlugRealtime` | slug | void | Debounced 500ms RPC call, updates #slug-status UI |
| `provisionTenant` | params | void | Calls create_tenant RPC, logs success/failure, shows credentials |

### ERP Integration (auth-service.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `checkMustChangePin` | employee | Promise<void> | Checks must_change_pin, shows undismissible PIN change overlay if true |

---

## 4. Architecture Notes

- admin.html is a **separate world** from ERP — different auth (Supabase Auth vs PIN JWT), different client (adminSb vs sb), no tenant context
- Shared CSS loaded (variables, layout, components, forms, modal, toast) + modal-wizard.js for provisioning wizard
- Toast.js, modal-builder.js, modal-wizard.js loaded from shared/js/
- Session managed by Supabase Auth (auto-persisted in localStorage)
- create_tenant() RPC is SECURITY DEFINER — bypasses RLS for all INSERTs
- Provisioning log written client-side (not inside RPC) to survive transaction rollback
- must_change_pin check runs inside initSecureSession — catches all ERP login paths
