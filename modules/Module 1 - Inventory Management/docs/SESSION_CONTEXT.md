# Session Context — Optic Up Module 1

## Current Status

Phase 3 ✅ complete. Next: home screen architecture + rename repo to opticup.

## Last Completed: Phase 3 — Auth & Permissions

**Commits:** e0d7a28, 31b2bac, 450d5b5, 0c34bd5, 6b74bc4, b21067c, 2706d4d, c850392, cd8dd04, 908111a, 98ff6c7, 8c4d4d7, 3b167ee, 253f0f2

**What was built:**
- Migration 016: tables roles (5 system roles), permissions (34+1 permissions), role_permissions (94 default mappings), employee_roles, auth_sessions
- ALTER employees: email, phone, branch_id, created_by, last_login, failed_attempts, locked_until
- js/auth-service.js (287 lines, 14 functions): verifyEmployeePIN, initSecureSession, loadSession, clearSession, hasPermission, requirePermission, applyUIPermissions, assignRoleToEmployee, forceLogout, getCurrentEmployee, and helpers
- Login screen: 5-box PIN modal, fullscreen overlay, session restore on reload, auto-logout after 8h
- PIN lockout: 5 failed attempts → sessionStorage lock + server-side locked_until (15min)
- 8 legacy PIN call sites replaced with verifyEmployeePIN()
- UI guards: 10 data-tab-permission + 21 data-permission attributes on all sensitive elements
- modules/employees/employee-list.js (283 lines, 8 functions): employee CRUD, role assignment, permission matrix
- Admin button replaced with user display (name + logout)
- isAdmin/toggleAdmin/checkAdmin removed — replaced with hasPermission('settings.edit')
- writeLog() updated: auto-populates employee_id from getCurrentEmployee()
- loadData() session guard added
- stock-count-session.js: skips PIN modal if active session exists
- E2E testing: 32 tests, 29 pass initially, 3 bugs found and fixed
- RLS policies added for employees INSERT/UPDATE/DELETE

## Next: Home Screen Architecture

**Strategic decisions made:**
- index.html → becomes home screen (PIN login + module cards)
- inventory.html → current index.html (full app) renamed
- Repo renamed: prizma-inventory → opticup
- New URL: opticalis.github.io/opticup
- Session passes between pages via sessionStorage (same domain)
- Future: session timeout configurable by manager/CEO (e.g. 60 min) — deferred

## Open Items / Warnings

- ⚠️ ?dev_bypass=opticup2024 MUST be removed before production (auth-service.js line 143)
- ⚠️ pin_length CHECK constraint commented out in migration 016 — uncomment before production
- ⚠️ All existing PINs are 4 digits — reset to 5 digits before go-live
- ⚠️ RLS policies are wide open (USING true) — needs hardening before production
- ⚠️ Internet exposure of app — status not yet confirmed

## Future Features (deferred from Phase 3)

- impersonateUser()
- previewUIAsRole()
- generatePermissionSnapshot()
- writePermissionLog()
- validateActionIntegrity()
- Rate limiting beyond 5-attempt lockout
- Multi-branch roles
- Custom permission groups
- Supabase Auth (email/phone login)
- Session timeout configurable by manager/CEO
