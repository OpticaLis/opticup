# Module 2 — Platform Admin — Changelog

---

## Phase 2 — Tenant Provisioning (2026-03-26)

### Commits
- `85b4695` — Module 2 Phase 2c: create_tenant() RPC SQL (reference)
- `22c4320` — Module 2 Phase 2e: admin-provisioning.js — tenant creation wizard
- `3624239` — Module 2 Phase 2f: must_change_pin flow after first login
- `92eb89d` — Fix credentials modal HTML rendering (Modal.alert → Modal.show)

### DB Changes
- **3 RPCs:** create_tenant (SECURITY DEFINER, 10-step atomic), validate_slug (format+reserved+unique), delete_tenant (soft delete)
- **employees.must_change_pin** BOOLEAN column added (default false)
- **tenant_provisioning_log.tenant_id** made nullable (for failure logging)
- **provisioning_log_admin_insert** RLS policy added

### Code Changes
- `modules/admin-platform/admin-provisioning.js` (320 lines) — NEW: 3-step wizard, slug auto-suggest + debounced validation, provisionTenant() with audit + provisioning logs
- `admin.html` (195 lines) — MODIFIED: added "חנות חדשה" button, modal-wizard.js + admin-provisioning.js script tags
- `modules/admin-platform/admin-app.js` (89 lines) — MODIFIED: wired btn-new-tenant click → initProvisioningWizard
- `js/auth-service.js` (341 lines) — MODIFIED: added checkMustChangePin() after initSecureSession

### What create_tenant() provisions
Per new tenant: 1 tenant row, 6 tenant_config entries, 5 roles, 57 permissions, role_permissions mapping (CEO=all 57, manager=54, senior=29, employee=8, viewer=6), 1 admin employee (must_change_pin=true), employee_roles (admin→ceo), 5 document_types, 5 payment_methods.

### Verification
All 12 tests passed: admin panel load, wizard open, slug auto-suggest, slug validation (duplicate/reserved/format/valid), step 2 plans, step 3 summary, tenant creation, DB verification, audit logs, new tenant login + PIN change, second login (no force-change), backward compatibility (Prizma/Demo).

---

## Phase 1 — DB + Admin Auth (2026-03-26)

### Commits
- `a68af24` — Module 2: fix directory structure to match project conventions
- `9fb5bdd` — Module 2 Phase 1i: admin.html + admin-auth.js
- `e6fca80` — Module 2 Phase 1j: admin-db.js + admin-audit.js
- `5374b52` — Module 2 Phase 1k: admin-app.js — login/logout flow complete

### DB Changes
- **5 new tables:** plans, platform_admins, platform_audit_log, tenant_config, tenant_provisioning_log
- **tenants extended:** 9 new columns (plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at)
- **10 indexes** across new tables and tenants
- **RLS** on all 5 tables, with is_platform_super_admin() SECURITY DEFINER function to avoid recursive policy evaluation
- **Seed data:** 3 plans (basic, premium, enterprise), existing tenants assigned enterprise
- **Bootstrap:** admin user dannylis669@gmail.com as super_admin

### Code Changes
- `admin.html` (192 lines) — Platform Admin page with Supabase Auth login/logout
- `modules/admin-platform/admin-auth.js` (94 lines) — adminSb client, login/logout/session management
- `modules/admin-platform/admin-db.js` (63 lines) — AdminDB wrapper (query, getById, insert, update, rpc)
- `modules/admin-platform/admin-audit.js` (20 lines) — logAdminAction fire-and-forget audit helper
- `modules/admin-platform/admin-app.js` (88 lines) — App init, login/panel toggle, event handlers

### Verification
All 8 tests passed: page load, wrong credentials, correct login, audit log, session persistence, logout, post-logout, ERP isolation.
