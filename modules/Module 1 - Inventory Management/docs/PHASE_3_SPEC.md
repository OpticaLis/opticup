# Optic Up — Phase 3: Roles, Permissions & Authentication

> **Phase 3 of Module 1 - Inventory Management v2.0**
> **Dependencies:** Phase 1 + Phase 2 complete
> **Location:** modules/Module 1 - Inventory Management/docs/PHASE_3_SPEC.md

---

## 1. Overview

Build a complete authentication and authorization system:
- 5-digit PIN login for all employees
- Role-based access control (5 roles)
- Permission engine that controls what each user sees and can do
- UI guards that hide/show elements based on permissions
- Employee management screen for managers

This system must be **module-agnostic** — every future module uses the same
auth-service.js without modification.

---

## 2. DB Schema

### 2.1 Update existing `employees` table

```sql
-- Add missing columns to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT '00';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- pin column already exists — ensure length constraint
ALTER TABLE employees ADD CONSTRAINT pin_length CHECK (LENGTH(pin) = 5);
```

### 2.2 New table: `roles`

```sql
CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY,        -- 'ceo' | 'manager' | 'team_lead' | 'worker' | 'viewer'
  name_he     TEXT NOT NULL,           -- שם בעברית
  description TEXT,
  is_system   BOOLEAN DEFAULT true,    -- system roles cannot be deleted
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (id, name_he, description) VALUES
  ('ceo',       'מנכ"ל',        'גישה מלאה לכל המערכת'),
  ('manager',   'מנהל',         'ניהול מלא חוץ מהגדרות מערכת'),
  ('team_lead', 'ראש צוות',     'אישור פעולות וניהול ספירות'),
  ('worker',    'עובד',         'ספירת מלאי וסריקה בלבד'),
  ('viewer',    'צופה',         'צפייה בלבד ללא עריכה');

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_roles" ON roles FOR ALL USING (true) WITH CHECK (true);
```

### 2.3 New table: `permissions`

```sql
CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT PRIMARY KEY,        -- e.g. 'inventory.edit'
  module      TEXT NOT NULL,           -- 'inventory' | 'stock_count' | 'purchasing' etc.
  action      TEXT NOT NULL,           -- 'view' | 'edit' | 'delete' etc.
  name_he     TEXT NOT NULL,           -- שם בעברית לתצוגה
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO permissions (id, module, action, name_he) VALUES
  -- Inventory
  ('inventory.view',          'inventory',      'view',    'צפייה במלאי'),
  ('inventory.edit',          'inventory',      'edit',    'עריכת מלאי'),
  ('inventory.delete',        'inventory',      'delete',  'מחיקת פריט'),
  ('inventory.reduce',        'inventory',      'reduce',  'הורדת כמות'),
  ('inventory.export',        'inventory',      'export',  'ייצוא מלאי'),
  -- Stock Count
  ('stock_count.create',      'stock_count',    'create',  'יצירת ספירה'),
  ('stock_count.scan',        'stock_count',    'scan',    'סריקת פריטים'),
  ('stock_count.approve',     'stock_count',    'approve', 'אישור ספירה'),
  ('stock_count.cancel',      'stock_count',    'cancel',  'ביטול ספירה'),
  -- Purchase Orders
  ('purchase_order.create',   'purchasing',     'create',  'יצירת הזמנה'),
  ('purchase_order.edit',     'purchasing',     'edit',    'עריכת הזמנה'),
  ('purchase_order.approve',  'purchasing',     'approve', 'אישור הזמנה'),
  ('purchase_order.delete',   'purchasing',     'delete',  'מחיקת הזמנה'),
  -- Goods Receipts
  ('goods_receipt.create',    'goods_receipts', 'create',  'יצירת קבלת סחורה'),
  ('goods_receipt.confirm',   'goods_receipts', 'confirm', 'אישור קבלת סחורה'),
  ('goods_receipt.export',    'goods_receipts', 'export',  'ייצוא קבלת סחורה'),
  -- Sync
  ('sync.view',               'sync',           'view',    'צפייה בסנכרון'),
  ('sync.import',             'sync',           'import',  'ייבוא מכירות'),
  ('sync.export',             'sync',           'export',  'ייצוא מלאי'),
  ('sync.watcher_config',     'sync',           'config',  'הגדרות וואצ׳ר'),
  -- Brands & Suppliers
  ('brands.view',             'brands',         'view',    'צפייה במותגים'),
  ('brands.edit',             'brands',         'edit',    'עריכת מותגים'),
  ('suppliers.view',          'suppliers',      'view',    'צפייה בספקים'),
  ('suppliers.edit',          'suppliers',      'edit',    'עריכת ספקים'),
  -- Employees
  ('employees.view',          'employees',      'view',    'צפייה בעובדים'),
  ('employees.create',        'employees',      'create',  'הוספת עובד'),
  ('employees.edit',          'employees',      'edit',    'עריכת עובד'),
  ('employees.delete',        'employees',      'delete',  'מחיקת עובד'),
  ('employees.assign_role',   'employees',      'assign',  'שיוך תפקיד'),
  -- Reports & Audit
  ('reports.view',            'reports',        'view',    'צפייה בדוחות'),
  ('reports.export',          'reports',        'export',  'ייצוא דוחות'),
  ('audit.view',              'audit',          'view',    'צפייה בלוג פעולות'),
  -- Settings
  ('settings.view',           'settings',       'view',    'צפייה בהגדרות'),
  ('settings.edit',           'settings',       'edit',    'עריכת הגדרות');

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);
```

### 2.4 New table: `role_permissions`

```sql
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted       BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (role_id, permission_id)
);

-- CEO: all permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 'ceo', id, true FROM permissions;

-- Manager: all except settings.edit
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 'manager', id, true FROM permissions
WHERE id != 'settings.edit';

-- Team Lead
INSERT INTO role_permissions (role_id, permission_id, granted) VALUES
  ('team_lead', 'inventory.view',         true),
  ('team_lead', 'inventory.edit',         true),
  ('team_lead', 'inventory.reduce',       true),
  ('team_lead', 'inventory.export',       true),
  ('team_lead', 'stock_count.create',     true),
  ('team_lead', 'stock_count.scan',       true),
  ('team_lead', 'stock_count.approve',    true),
  ('team_lead', 'stock_count.cancel',     true),
  ('team_lead', 'purchase_order.create',  true),
  ('team_lead', 'purchase_order.edit',    true),
  ('team_lead', 'goods_receipt.create',   true),
  ('team_lead', 'goods_receipt.confirm',  true),
  ('team_lead', 'goods_receipt.export',   true),
  ('team_lead', 'sync.view',              true),
  ('team_lead', 'brands.view',            true),
  ('team_lead', 'suppliers.view',         true),
  ('team_lead', 'employees.view',         true),
  ('team_lead', 'reports.view',           true),
  ('team_lead', 'audit.view',             true);

-- Worker
INSERT INTO role_permissions (role_id, permission_id, granted) VALUES
  ('worker', 'stock_count.create',  true),
  ('worker', 'stock_count.scan',    true),
  ('worker', 'inventory.view',      true);

-- Viewer
INSERT INTO role_permissions (role_id, permission_id, granted) VALUES
  ('viewer', 'inventory.view',     true),
  ('viewer', 'reports.view',       true),
  ('viewer', 'brands.view',        true),
  ('viewer', 'suppliers.view',     true),
  ('viewer', 'employees.view',     true);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_role_permissions" ON role_permissions
  FOR ALL USING (true) WITH CHECK (true);
```

### 2.5 New table: `employee_roles`

```sql
CREATE TABLE IF NOT EXISTS employee_roles (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by  UUID REFERENCES employees(id),
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (employee_id, role_id)
);

ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_employee_roles" ON employee_roles
  FOR ALL USING (true) WITH CHECK (true);
```

### 2.6 New table: `auth_sessions`

```sql
CREATE TABLE IF NOT EXISTS auth_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,          -- random 32-char hex
  permissions   JSONB NOT NULL,                -- snapshot of permissions at login
  role_id       TEXT NOT NULL,
  branch_id     TEXT NOT NULL DEFAULT '00',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,          -- created_at + 8 hours
  last_active   TIMESTAMPTZ DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_employee ON auth_sessions(employee_id);

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_auth_sessions" ON auth_sessions
  FOR ALL USING (true) WITH CHECK (true);
```

---

## 3. New File: js/auth-service.js

Load order in index.html: **second** — after shared.js, before all other JS files.

### 3.1 Globals
```javascript
let currentSession = null;     // active session object
let sessionPermissions = {};   // { 'inventory.edit': true, ... }
let sessionRole = null;        // 'manager' | 'worker' | etc.
let sessionEmployee = null;    // { id, name, role_id, branch_id }
```

### 3.2 Auth Layer

**`verifyEmployeePIN(pin)`**
- Query T.EMPLOYEES by pin + is_active=true
- Check failed_attempts < 5 (lockout protection)
- If not found: increment failed_attempts → return null
- If found: reset failed_attempts → return employee row

**`initSecureSession(employeeData)`**
- Generate random 32-char hex token
- Fetch permissions for employee's role from role_permissions
- Build permissions snapshot: `{ 'inventory.edit': true, ... }`
- Insert into auth_sessions: token, permissions snapshot, expires_at = NOW()+8h
- Store in sessionStorage: token only (not permissions)
- Set globals: currentSession, sessionPermissions, sessionRole, sessionEmployee
- Return session object

**`loadSession()`**
- On app start: check sessionStorage for token
- If token exists: query auth_sessions — verify is_active + not expired
- If valid: restore globals from session row
- If invalid/expired: clear sessionStorage → show login screen
- Update last_active timestamp

**`refreshPermissions()`**
- Re-fetch permissions from DB for current employee
- Update sessionPermissions global + auth_sessions row
- Called after role change by admin

**`forceLogout(reason)`**
- Set auth_sessions.is_active = false for current token
- Clear sessionStorage
- Clear all globals
- Redirect to login screen
- Log reason to console

**`isLoggedIn()`**
- Returns true if currentSession exists + not expired

---

### 3.3 Access Control Layer

**`hasPermission(permissionKey)`**
- Returns boolean: `sessionPermissions[permissionKey] === true`
- Example: `hasPermission('inventory.edit')`
- If not logged in: return false

**`getEffectivePermissions(roleId)`**
- Fetch all role_permissions for roleId where granted=true
- Returns array of permission keys
- Used by initSecureSession to build snapshot

**`requirePermission(permissionKey)`**
- If `!hasPermission(permissionKey)`: toast error "אין הרשאה לביצוע פעולה זו" → throw error
- Used as guard at top of sensitive functions

**`checkBranchAccess(branchId)`**
- Returns true if sessionEmployee.branch_id === branchId OR role is ceo/manager

---

### 3.4 UI Guard Layer

**`applyUIPermissions()`**
- Called after login and on tab switch
- Hides nav tabs the user has no permission to view
- Hides action buttons based on permissions:
  - `[data-permission="inventory.edit"]` → hide if no permission
  - `[data-permission="inventory.delete"]` → hide if no permission
- All sensitive buttons/tabs must have `data-permission="x.y"` attribute

**`toggleReadOnlyMode(containerId, isReadOnly)`**
- Makes all inputs/buttons inside container read-only
- Used for viewer role

**`renderPermissionMatrix(targetDivId)`**
- Renders a table: rows = permissions, columns = roles
- Shows checkboxes — editable only for ceo/manager
- Used in employee management screen

---

### 3.5 Admin API Layer

**`updateRolePermission(roleId, permissionId, granted)`**
- Requires `hasPermission('settings.edit')`
- Upsert into role_permissions
- Call refreshPermissions() for affected sessions

**`assignRoleToEmployee(employeeId, roleId)`**
- Requires `hasPermission('employees.assign_role')`
- Upsert into employee_roles
- Log: who assigned what to whom + timestamp

**`createEmployee(name, pin, roleId, branchId)`**
- Requires `hasPermission('employees.create')`
- Validate: pin is exactly 5 digits, unique
- Insert into employees + employee_roles

**`updateEmployee(employeeId, fields)`**
- Requires `hasPermission('employees.edit')`
- Cannot edit employee with higher role

**`deactivateEmployee(employeeId)`**
- Requires `hasPermission('employees.delete')`
- Soft delete: is_active = false
- Invalidate all active sessions for that employee

---

## 4. New File: modules/employees/employee-list.js

**Tab:** "👥 עובדים" — visible only to roles with `employees.view`

**Functions:**
- `loadEmployeesTab()` — summary cards + table
- `renderEmployeeTable(employees)` — table with role badges
- `openAddEmployee()` — modal: name, PIN (5 digits), role, branch
- `openEditEmployee(id)` — same modal pre-filled
- `saveEmployee(data)` — calls createEmployee/updateEmployee
- `confirmDeactivateEmployee(id)` — PIN confirmation → deactivateEmployee()

---

## 5. New Screen: Login

**File:** Add login modal to index.html (not a separate page)

**Flow:**
1. App loads → loadSession() → if no valid session → show login modal
2. Login modal: PIN input (5 digits, inputmode="numeric")
3. On submit → verifyEmployeePIN(pin) → initSecureSession() → applyUIPermissions()
4. Session expires after 8 hours → auto-logout → show login modal again

**UI:**
- Fullscreen overlay (z-index highest)
- Logo + "Optic Up" title
- PIN input: 5 boxes (like iPhone passcode)
- Error: "PIN שגוי" with attempt counter
- After 5 failed attempts: "החשבון נעול. פנה למנהל."

---

## 6. Changes Required in Existing Modules

### 6.1 index.html
- Add `data-permission="x.y"` attributes to all sensitive buttons
- Add login modal HTML
- Add `<script src="js/auth-service.js">` as second script (after shared.js)
- Add `<script src="modules/employees/employee-list.js">`
- Add "👥 עובדים" nav tab

### 6.2 js/shared.js
- `loadData()`: call `loadSession()` first — if not logged in, stop and show login
- `writeLog()`: add `employee_id: sessionEmployee?.id` to log details

### 6.3 All 6 PIN verification call sites
Replace pattern:
```javascript
// OLD
const { data: emp } = await sb.from(T.EMPLOYEES)
  .select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
```
With:
```javascript
// NEW
const emp = await verifyEmployeePIN(pin);
```

### 6.4 modules/admin/admin.js
- Replace `isAdmin` sessionStorage check with `hasPermission('settings.edit')`
- `toggleAdmin()` → replaced by login flow

### 6.5 modules/stock-count/stock-count-session.js
- `openWorkerPin()` → if session exists, skip PIN modal, use sessionEmployee directly
- Only ask for PIN if no active session

### 6.6 All nav tabs
- Add `data-permission` attributes
- `applyUIPermissions()` hides tabs user cannot access

---

## 7. Execution Order

```
Step 1 — DB migration (016_auth_system.sql)
  • roles, permissions, role_permissions (with default data)
  • employee_roles, auth_sessions
  • ALTER employees table

Step 2 — js/auth-service.js (core engine)
  • verifyEmployeePIN, initSecureSession, loadSession
  • hasPermission, requirePermission, getEffectivePermissions
  • applyUIPermissions, toggleReadOnlyMode

Step 3 — Login screen
  • Login modal in index.html
  • 5-box PIN UI
  • Integration with initSecureSession + applyUIPermissions
  • Session restore on page reload

Step 4 — Update existing PIN call sites (6 files)
  • Replace direct sb.from(T.EMPLOYEES) with verifyEmployeePIN()

Step 5 — UI Guards
  • Add data-permission attributes to all sensitive buttons/tabs
  • applyUIPermissions() hides/shows correctly per role
  • Test all 5 roles

Step 6 — Employee management screen
  • modules/employees/employee-list.js
  • Add/edit/deactivate employees
  • Assign roles
  • renderPermissionMatrix()

Step 7 — Admin functions
  • updateRolePermission (editable permission matrix)
  • assignRoleToEmployee
  • forceLogout

Step 8 — Integration & E2E tests
  • Test all 5 roles end-to-end
  • Verify applyUIPermissions hides correct elements per role
  • Verify session expiry + auto-logout
  • Verify PIN lockout after 5 attempts

Step 9 — Documentation update
  • ROADMAP.md ✅
  • SESSION_CONTEXT.md
  • CHANGELOG.md
  • MODULE_SPEC.md
  • MODULE_MAP.md
  • db-schema.sql
```

---

## 8. What's NOT in Phase 3 — Deferred to Future Features

The following were considered and intentionally deferred.
Add to ROADMAP.md under `## Future Features`:

| Feature | Reason Deferred |
|---------|----------------|
| `impersonateUser()` | Nice-to-have, additive — no existing code changes needed |
| `previewUIAsRole()` | Additive UI feature |
| `generatePermissionSnapshot()` | Report only — no logic dependency |
| `validateActionIntegrity()` | Requires server-side HMAC — not possible in pure client |
| `writePermissionLog()` | New table + calls — fully additive |
| Rate limiting (beyond 5-attempt lockout) | Requires server middleware |
| Multi-branch roles | Needs branch module first |
| Custom permission groups | Extension of role system |
| Supabase Auth (email/phone login) | PIN system sufficient for v1 |

---

## 9. File Size Budget

| File | Estimated Lines | Split plan if needed |
|------|----------------|----------------------|
| js/auth-service.js | ~280 | auth-session.js + auth-permissions.js |
| modules/employees/employee-list.js | ~200 | — |
| migrations/016_auth_system.sql | ~150 | — |
