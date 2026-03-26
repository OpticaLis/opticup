# Module 2 — Platform Admin — Module Spec

> **Authority:** Current state of Module 2. Updated at end of each phase.
> **Last updated:** 2026-03-26 (Phase 4 complete)

---

## 1. Tables

### New Tables (5)

| Table | Scope | Description |
|-------|-------|-------------|
| `plans` | Global (no tenant_id) | Subscription plans: basic, premium, enterprise. JSONB limits + features. |
| `platform_admins` | Global (no tenant_id) | Platform admin users linked to Supabase Auth. Roles: super_admin, support, viewer. |
| `platform_audit_log` | Global (no tenant_id) | Every admin action logged: login, logout, tenant changes. |
| `tenant_config` | Per-tenant (has tenant_id) | Key-value config per tenant. UNIQUE(tenant_id, key). |
| `tenant_provisioning_log` | Per-tenant ref (nullable tenant_id) | Step-by-step log of tenant creation process. |

### Extended Tables

| Table | New Columns |
|-------|-------------|
| `tenants` | plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at, last_active |
| `employees` | must_change_pin (BOOLEAN DEFAULT false) |

### RLS

All 5 tables have RLS enabled.
- `plans` — SELECT for all, write via is_platform_super_admin()
- `platform_admins` — SELECT where auth.uid() = auth_user_id, write via is_platform_super_admin()
- `platform_audit_log` — SELECT for active admins, INSERT WITH CHECK (true)
- `tenant_config` — SELECT by tenant_id (RLS) + admin bypass, write via admin
- `tenant_provisioning_log` — SELECT + INSERT for active admins

### RPC Functions (14)

| Function | Type | Description |
|----------|------|-------------|
| `is_platform_super_admin()` | SECURITY DEFINER | Returns boolean — checks if auth.uid() is super_admin in platform_admins. |
| `create_tenant(...)` | SECURITY DEFINER | 10-step atomic provisioning: tenant → config → roles → permissions → role_permissions → employee → employee_roles → doc_types → payment_methods. Returns UUID. |
| `validate_slug(p_slug)` | SECURITY DEFINER | Validates slug format (3-30 chars, a-z0-9-), reserved words (22 words), uniqueness. Returns JSONB {valid, reason}. |
| `delete_tenant(p_tenant_id, p_deleted_by)` | SECURITY DEFINER | Soft delete: sets status='deleted', deleted_at=now(). |
| `get_all_tenants_overview()` | SECURITY DEFINER | All non-deleted tenants with plan name (LEFT JOIN), employees/inventory/suppliers counts. Returns JSONB array. |
| `get_tenant_stats(p_tenant_id)` | SECURITY DEFINER | Single tenant counts: employees, inventory (is_deleted=false), suppliers (active=true), documents, brands (active=true). Returns JSONB object. |
| `suspend_tenant(p_tenant_id, p_reason, p_admin_id)` | SECURITY DEFINER | Verifies status='active', sets status='suspended' + reason. Writes audit log. |
| `activate_tenant(p_tenant_id, p_admin_id)` | SECURITY DEFINER | Verifies status IN ('suspended','trial'), sets status='active', clears reason. Writes audit log. |
| `update_tenant(p_tenant_id, p_updates, p_admin_id)` | SECURITY DEFINER | Whitelist (name, owner_name, owner_email, owner_phone, plan_id, trial_ends_at). Captures old values, applies per-field, writes audit with old+new diff. |
| `get_tenant_activity_log(...)` | SECURITY DEFINER | Paginated activity_log for a tenant with optional filters (level, entity_type, date_from, date_to). Returns JSONB {total, entries}. |
| `get_tenant_employees(p_tenant_id)` | SECURITY DEFINER | Minimal employee list [{id, name}] for PIN reset dropdown. |
| `reset_employee_pin(...)` | SECURITY DEFINER | Verifies employee belongs to tenant, resets PIN + unlock (failed_attempts=0, locked_until=NULL). Audit log does NOT include new PIN. |
| `check_plan_limit(p_tenant_id, p_resource)` | SECURITY DEFINER | Counts current usage vs plan limits. Returns JSONB {allowed, current, limit, remaining, message}. Maps resource to 'max_' + resource key. Fail-safe: no plan = unlimited. |
| `is_feature_enabled(p_tenant_id, p_feature)` | SECURITY DEFINER | Priority: tenant_config feature_overrides → plan.features → fail-safe true. Returns BOOLEAN. |

---

## 2. Files

| File | Path | Lines | Description |
|------|------|-------|-------------|
| admin.html | `/admin.html` | 271 | Login screen + full dashboard: header, nav tabs (חנויות/Audit Log/הגדרות), toolbar, tenant table, slide-in panel with 4 tabs. Loads shared/css (8), shared/js (4), admin JS (11). |
| admin-auth.js | `/modules/admin-platform/admin-auth.js` | 105 | Supabase client (adminSb), login/logout/session, getCurrentAdmin, requireAdmin, hasAdminPermission. ROLE_LEVELS. Exposes: getCurrentAdmin, hasAdminPermission. |
| admin-db.js | `/modules/admin-platform/admin-db.js` | 63 | AdminDB wrapper — query, getById, insert, update, rpc (no tenant_id). |
| admin-audit.js | `/modules/admin-platform/admin-audit.js` | 143 | logAdminAction() fire-and-forget + platform audit log viewer with action filter. super_admin only. Exposes: loadPlatformAuditLog. |
| admin-provisioning.js | `/modules/admin-platform/admin-provisioning.js` | 320 | 3-step wizard, slug validation, provisionTenant() RPC call + logging. |
| admin-app.js | `/modules/admin-platform/admin-app.js` | 237 | App init, tab routing (incl. settings→loadPlansTab), panel open/close, search/filter event wiring, role-based UI gating. Exposes: switchTab, openTenantPanel, closeTenantPanel, switchPanelTab, selectedTenantId. |
| admin-dashboard.js | `/modules/admin-platform/admin-dashboard.js` | 196 | Tenant table (TableBuilder), search, status/plan filters, sort, relative time. Exposes: loadTenants, filterTenants, initDashboard, allTenants. |
| admin-tenant-detail.js | `/modules/admin-platform/admin-tenant-detail.js` | 361 | Slide-in panel: Tab 1 (details/edit/actions + feature overrides container), Tab 2 delegates to activity viewer, Tab 3 (provisioning log), Tab 4 (audit log, super_admin). Actions: suspend, activate, delete, reset PIN. Exposes: loadTenantDetail, renderPanelTab. |
| admin-plans.js | `/modules/admin-platform/admin-plans.js` | 261 | Plans CRUD UI in הגדרות tab. Table with limits (∞ for -1), edit modal (7 limits + 17 features + prices). super_admin create/edit. Exposes: loadPlansTab, openPlanEditor, FEATURE_LABELS. |
| admin-feature-overrides.js | `/modules/admin-platform/admin-feature-overrides.js` | 97 | Per-tenant feature override UI in tenant detail. 17 features × 3-state (plan/force-on/force-off). Upserts tenant_config key='feature_overrides'. super_admin save only. Exposes: renderFeatureOverrides. |
| admin-activity-viewer.js | `/modules/admin-platform/admin-activity-viewer.js` | 189 | Activity log per tenant: 4 filters (date range, entity type, level), pagination 50/page. Exposes: loadTenantActivityLog. |
| plan-helpers.js | `/shared/js/plan-helpers.js` | 107 | Client-side plan limit/feature checking. 30s cache. Calls check_plan_limit + is_feature_enabled RPCs. Loaded by all ERP pages. Exposes: checkPlanLimit, isFeatureEnabled, getPlanLimits, getPlanFeatures, invalidatePlanCache. |

### Modified ERP Files

| File | Path | Change |
|------|------|--------|
| shared.js | `/js/shared.js` | Phase 3k: showTenantBlocked() + DOMContentLoaded guard for suspended/deleted tenants |
| index.html | `/index.html` | Phase 3k: tenant status check. Phase 4d: data-feature attrs on 3 cards, applyFeatureFlags(), plan-helpers.js loaded |
| inventory.html | `/inventory.html` | Phase 4c: plan-helpers.js loaded. Phase 4d: data-feature attrs on access-sync + stock-count tabs, applyFeatureFlags() |
| employees.html | `/employees.html` | Phase 4c: plan-helpers.js loaded |
| suppliers-debt.html | `/suppliers-debt.html` | Phase 4c: plan-helpers.js loaded |
| auth-service.js | `/js/auth-service.js` | Phase 2: checkMustChangePin() for new tenant employees |
| employee-list.js | `/modules/permissions/employee-list.js` | Phase 4c: checkPlanLimit('employees') before new employee insert |
| inventory-entry.js | `/modules/inventory/inventory-entry.js` | Phase 4c: checkPlanLimit('inventory') before batch create |
| suppliers.js | `/modules/brands/suppliers.js` | Phase 4c: checkPlanLimit('suppliers') before add supplier |
| debt-doc-new.js | `/modules/debt/debt-doc-new.js` | Phase 4c: checkPlanLimit('documents_per_month') before doc create |
| ai-ocr.js | `/modules/debt/ai/ai-ocr.js` | Phase 4c: checkPlanLimit('ocr_scans_monthly'). Phase 4d: isFeatureEnabled('ocr') in inject |
| inventory-images-bg.js | `/modules/inventory/inventory-images-bg.js` | Phase 4d: isFeatureEnabled('image_studio') in _bgRemoveStart |
| pin-auth/index.ts | `/supabase/functions/pin-auth/index.ts` | Phase 4g: last_active update on successful PIN verification |

---

## 3. Contracts (Public API)

### Auth
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `adminLogin` | email, password | `{ id, email, display_name, role }` | Supabase Auth login + admin verification |
| `adminLogout` | — | void | Sign out + UI reset |
| `getAdminSession` | — | admin object or null | Check existing session |
| `getCurrentAdmin` | — | admin object or null | Sync getter — cached admin |
| `requireAdmin` | minRole = 'viewer' | admin object or throws | Role hierarchy check (throws) |
| `hasAdminPermission` | requiredRole | boolean | Role hierarchy check (returns boolean) |

### DB
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `AdminDB.query` | table, select, filters | data[] | Query with filters |
| `AdminDB.rpc` | name, params | data | RPC call |

### Dashboard
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `loadTenants` | — | void | Load all tenants from RPC, apply filters, render |
| `filterTenants` | — | void | Client-side filter + render |
| `initDashboard` | — | void | One-time init + load |

### Panel
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `loadTenantDetail` | tenantId | void | Load stats + render panel |
| `renderPanelTab` | tabName | void | Route to tab renderer |
| `loadTenantActivityLog` | tenantId | void | Init activity log viewer |

### Plans & Limits (shared/js/plan-helpers.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `checkPlanLimit` | resource | `{ allowed, current, limit, remaining, message }` | Calls check_plan_limit RPC. Fail-safe: allowed=true on error. |
| `isFeatureEnabled` | feature | boolean | Calls is_feature_enabled RPC. Fail-safe: true on error. |
| `getPlanLimits` | — | object | Returns limits JSONB from cached plan data. |
| `getPlanFeatures` | — | object | Returns features JSONB from cached plan data. |
| `invalidatePlanCache` | — | void | Resets plan cache (30s TTL). |

### Plans Admin (admin-plans.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `loadPlansTab` | — | void | Fetch + render plans table in settings tab. super_admin can click to edit. |
| `openPlanEditor` | planId? | void | Edit/create plan modal: limits + features + prices. super_admin only. |

### Feature Overrides (admin-feature-overrides.js)
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `renderFeatureOverrides` | tenantId, planId, container | void | Renders 17-feature override UI with plan values + 3-state selects. |

### ERP Integration
| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `showTenantBlocked` | tenant | void | Full-page blocking overlay for suspended/deleted tenants |
| `checkMustChangePin` | employee | Promise<void> | Undismissible PIN change overlay |
| `applyFeatureFlags` | — | void | Hides [data-feature] elements where plan feature === false. Defined inline in index.html + inventory.html. |

---

## 4. Role Hierarchy

```
super_admin (3) > support (2) > viewer (1)
```

| Feature | super_admin | support | viewer |
|---------|-------------|---------|--------|
| View tenant list | ✅ | ✅ | ✅ |
| View tenant detail | ✅ | ✅ | ✅ |
| View activity log | ✅ | ✅ | ✅ |
| Create tenant | ✅ | ❌ | ❌ |
| Edit tenant | ✅ | ❌ | ❌ |
| Suspend / Activate | ✅ | ❌ | ❌ |
| Delete tenant | ✅ | ❌ | ❌ |
| Reset employee PIN | ✅ | ✅ | ❌ |
| View provisioning log | ✅ | ✅ | ❌ |
| View platform audit log | ✅ | ❌ | ❌ |
| Audit Log tab | ✅ | ❌ | ❌ |

---

## 5. Architecture Notes

- admin.html is a **separate world** from ERP — different auth (Supabase Auth vs PIN JWT), different client (adminSb vs sb), no tenant context
- Shared CSS loaded (8 files) + shared JS (toast, modal-builder, modal-wizard, table-builder)
- Session managed by Supabase Auth (auto-persisted in localStorage)
- All action RPCs are SECURITY DEFINER — bypass RLS for cross-tenant operations
- Suspended tenant blocking: shared.js checks tenant status on every ERP page load
- Panel tab routing: admin-app.js manages tab switching, delegates content rendering to detail/activity/audit files
