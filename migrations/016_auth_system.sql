-- ============================================================
-- Migration 016: Auth System — Roles, Permissions, Sessions
-- Phase 3 of Module 1 - Inventory Management
-- ============================================================
-- Creates:
--   1. ALTER employees — new columns for auth
--   2. roles — 5 system roles
--   3. permissions — 30 granular permissions
--   4. role_permissions — default role→permission mappings
--   5. employee_roles — employee→role assignments
--   6. auth_sessions — token-based sessions (8h expiry)
-- ============================================================

-- ============================================================
-- 1. ALTER TABLE employees — add auth columns
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
-- branch_id already exists as TEXT — skip
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- TODO: uncomment before production. All PINs must be 5 digits first.
-- ALTER TABLE employees ADD CONSTRAINT pin_length CHECK (LENGTH(pin) = 5);

-- ============================================================
-- 2. roles — 5 system roles
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY,
  name_he     TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (id, name_he, description) VALUES
  ('ceo',       'מנכ"ל',     'גישה מלאה לכל המערכת'),
  ('manager',   'מנהל',      'ניהול מלא חוץ מהגדרות מערכת'),
  ('team_lead', 'ראש צוות',  'אישור פעולות וניהול ספירות'),
  ('worker',    'עובד',      'ספירת מלאי וסריקה בלבד'),
  ('viewer',    'צופה',      'צפייה בלבד ללא עריכה')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_roles" ON roles FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. permissions — 30 granular permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT PRIMARY KEY,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  name_he     TEXT NOT NULL,
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
  ('settings.edit',           'settings',       'edit',    'עריכת הגדרות')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. role_permissions — default role→permission mappings
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted       BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (role_id, permission_id)
);

-- CEO: all permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 'ceo', id, true FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: all except settings.edit
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 'manager', id, true FROM permissions
WHERE id != 'settings.edit'
ON CONFLICT (role_id, permission_id) DO NOTHING;

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
  ('team_lead', 'sync.view',             true),
  ('team_lead', 'brands.view',           true),
  ('team_lead', 'suppliers.view',        true),
  ('team_lead', 'employees.view',        true),
  ('team_lead', 'reports.view',          true),
  ('team_lead', 'audit.view',            true)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Worker
INSERT INTO role_permissions (role_id, permission_id, granted) VALUES
  ('worker', 'stock_count.create',  true),
  ('worker', 'stock_count.scan',    true),
  ('worker', 'inventory.view',      true)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer
INSERT INTO role_permissions (role_id, permission_id, granted) VALUES
  ('viewer', 'inventory.view',     true),
  ('viewer', 'reports.view',       true),
  ('viewer', 'brands.view',        true),
  ('viewer', 'suppliers.view',     true),
  ('viewer', 'employees.view',     true)
ON CONFLICT (role_id, permission_id) DO NOTHING;

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_role_permissions" ON role_permissions
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. employee_roles — employee→role assignments
-- ============================================================

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

-- ============================================================
-- 6. auth_sessions — token-based sessions (8h expiry)
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  permissions   JSONB NOT NULL,
  role_id       TEXT NOT NULL,
  branch_id     TEXT NOT NULL DEFAULT '00',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  last_active   TIMESTAMPTZ DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sessions_token    ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_employee ON auth_sessions(employee_id);

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_auth_sessions" ON auth_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. Fix missing RLS policies on employees table
-- ============================================================
-- Migration 002 only added SELECT policy. INSERT/UPDATE/DELETE
-- are required for employee management (Phase 3).

CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update" ON employees FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "employees_delete" ON employees FOR DELETE USING (true);
