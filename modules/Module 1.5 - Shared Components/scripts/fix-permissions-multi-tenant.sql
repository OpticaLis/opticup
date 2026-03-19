-- ═══════════════════════════════════════════════════════════════
-- Fix: role_permissions PK must include tenant_id for multi-tenant
-- Problem: PK is (role_id, permission_id) — can't have same role+perm for 2 tenants
-- Fix: Drop PK, recreate as (role_id, permission_id, tenant_id)
-- Then insert demo tenant's role_permissions from prizma source
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Drop old PK and recreate with tenant_id
ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_pkey;
ALTER TABLE role_permissions ADD PRIMARY KEY (role_id, permission_id, tenant_id);

-- Step 2: Copy role_permissions from prizma to demo
INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
SELECT rp.role_id, rp.permission_id, rp.granted, '0bf57a99-242e-461b-9e89-fe102db5f3aa'
FROM role_permissions rp
WHERE rp.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING;

-- Step 3: Verify
SELECT tenant_id, COUNT(*) as count
FROM role_permissions
GROUP BY tenant_id
ORDER BY tenant_id;
