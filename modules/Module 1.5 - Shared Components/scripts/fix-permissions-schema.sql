-- ═══════════════════════════════════════════════════════════════
-- Fix: Multi-tenant permissions schema
-- Problem: roles, permissions, role_permissions PKs don't include tenant_id
--          so each (role_id, permission_id) pair can only exist once globally.
-- Fix: Add tenant_id to PKs, enabling per-tenant permission rows.
-- ═══════════════════════════════════════════════════════════════
-- ⚠️ Run with service_role in Supabase SQL Editor
-- ⚠️ Order matters: drop FKs → alter PKs → recreate FKs → insert data
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ============================================================
-- Step 1: Delete demo-prefixed garbage data from previous hack
-- ============================================================
DELETE FROM role_permissions WHERE role_id LIKE 'demo_%' OR permission_id LIKE 'demo_%';
DELETE FROM employee_roles WHERE role_id LIKE 'demo_%';
DELETE FROM permissions WHERE id LIKE 'demo_%';
DELETE FROM roles WHERE id LIKE 'demo_%';

-- Fix employee_roles that were changed to demo_ prefixed role_ids
UPDATE employee_roles
SET role_id = REPLACE(role_id, 'demo_', '')
WHERE role_id LIKE 'demo_%'
  AND tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa';

-- ============================================================
-- Step 2: Drop FK constraints that reference roles(id) and permissions(id)
-- ============================================================
-- role_permissions.role_id → roles(id)
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
-- role_permissions.permission_id → permissions(id)
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
-- employee_roles.role_id → roles(id)
ALTER TABLE employee_roles DROP CONSTRAINT IF EXISTS employee_roles_role_id_fkey;

-- ============================================================
-- Step 3: Alter PKs to include tenant_id
-- ============================================================
-- roles: (id) → (id, tenant_id)
ALTER TABLE roles DROP CONSTRAINT roles_pkey;
ALTER TABLE roles ADD PRIMARY KEY (id, tenant_id);

-- permissions: (id) → (id, tenant_id)
ALTER TABLE permissions DROP CONSTRAINT permissions_pkey;
ALTER TABLE permissions ADD PRIMARY KEY (id, tenant_id);

-- role_permissions: (role_id, permission_id) → (role_id, permission_id, tenant_id)
ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_pkey;
ALTER TABLE role_permissions ADD PRIMARY KEY (role_id, permission_id, tenant_id);

-- ============================================================
-- Step 4: Recreate FK constraints as composite (including tenant_id)
-- ============================================================
-- role_permissions → roles (role_id, tenant_id)
ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_role_fk
  FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE;

-- role_permissions → permissions (permission_id, tenant_id)
ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_permission_fk
  FOREIGN KEY (permission_id, tenant_id) REFERENCES permissions(id, tenant_id) ON DELETE CASCADE;

-- employee_roles → roles (role_id, tenant_id)
ALTER TABLE employee_roles
  ADD CONSTRAINT employee_roles_role_fk
  FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE;

-- ============================================================
-- Step 5: Insert proper demo tenant rows (same IDs, different tenant_id)
-- ============================================================
-- Copy roles
INSERT INTO roles (id, name_he, description, is_system, tenant_id)
SELECT r.id, r.name_he, r.description, r.is_system, '0bf57a99-242e-461b-9e89-fe102db5f3aa'
FROM roles r
WHERE r.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
ON CONFLICT (id, tenant_id) DO NOTHING;

-- Copy permissions
INSERT INTO permissions (id, module, action, name_he, description, tenant_id)
SELECT p.id, p.module, p.action, p.name_he, p.description, '0bf57a99-242e-461b-9e89-fe102db5f3aa'
FROM permissions p
WHERE p.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
ON CONFLICT (id, tenant_id) DO NOTHING;

-- Copy role_permissions
INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
SELECT rp.role_id, rp.permission_id, rp.granted, '0bf57a99-242e-461b-9e89-fe102db5f3aa'
FROM role_permissions rp
WHERE rp.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING;

-- ============================================================
-- Step 5b: Restore employee_roles for demo tenant
-- ============================================================
-- Test employee → CEO
INSERT INTO employee_roles (employee_id, role_id, granted_by, tenant_id)
SELECT e.id, 'ceo', e.id, '0bf57a99-242e-461b-9e89-fe102db5f3aa'
FROM employees e
WHERE e.tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa'
  AND e.name = 'עובד בדיקה'
ON CONFLICT (employee_id, role_id) DO NOTHING;

-- Copy employee_roles from prizma employees to their cloned demo counterparts
-- Match by employee name pattern: demo employee name = prizma name + ' (דמו)'
INSERT INTO employee_roles (employee_id, role_id, granted_by, tenant_id)
SELECT demo_emp.id, er.role_id,
  (SELECT id FROM employees WHERE tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa' AND name = 'עובד בדיקה' LIMIT 1),
  '0bf57a99-242e-461b-9e89-fe102db5f3aa'
FROM employee_roles er
JOIN employees src_emp ON src_emp.id = er.employee_id AND src_emp.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
JOIN employees demo_emp ON demo_emp.tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa'
  AND demo_emp.name = src_emp.name || ' (דמו)'
WHERE er.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
ON CONFLICT (employee_id, role_id) DO NOTHING;

-- ============================================================
-- Step 6: Verify
-- ============================================================
DO $$
DECLARE v_r1 INT; v_r2 INT; v_p1 INT; v_p2 INT; v_rp1 INT; v_rp2 INT;
BEGIN
  SELECT COUNT(*) INTO v_r1 FROM roles WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  SELECT COUNT(*) INTO v_r2 FROM roles WHERE tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa';
  RAISE NOTICE 'roles:            prizma=%, demo=%', v_r1, v_r2;

  SELECT COUNT(*) INTO v_p1 FROM permissions WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  SELECT COUNT(*) INTO v_p2 FROM permissions WHERE tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa';
  RAISE NOTICE 'permissions:      prizma=%, demo=%', v_p1, v_p2;

  SELECT COUNT(*) INTO v_rp1 FROM role_permissions WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  SELECT COUNT(*) INTO v_rp2 FROM role_permissions WHERE tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa';
  RAISE NOTICE 'role_permissions: prizma=%, demo=%', v_rp1, v_rp2;

  -- Check employee_roles for demo tenant
  SELECT COUNT(*) INTO v_r1 FROM employee_roles WHERE tenant_id = '0bf57a99-242e-461b-9e89-fe102db5f3aa';
  RAISE NOTICE 'employee_roles (demo): %', v_r1;

  -- Check no demo_ prefixed data remains
  SELECT COUNT(*) INTO v_r1 FROM roles WHERE id LIKE 'demo_%';
  SELECT COUNT(*) INTO v_r2 FROM permissions WHERE id LIKE 'demo_%';
  RAISE NOTICE 'demo_ prefixed garbage: roles=%, permissions=%', v_r1, v_r2;
END $$;

COMMIT;
