-- ============================================================
-- Module 2: Platform Admin — Pre-QA Setup SQL
-- ============================================================
-- Reference file — run blocks manually in Supabase Dashboard → SQL Editor
-- Created: 2026-03-26
-- Purpose: Create test prerequisites for 92-test QA phase
-- ============================================================

-- ============================================================
-- BLOCK 1: Create test admin users in platform_admins
-- ============================================================
--
-- MANUAL STEP FIRST:
--   1. Go to Supabase Dashboard → Authentication → Users → Add User
--   2. Create user: support@test.opticup.co.il (set a password)
--   3. Create user: viewer@test.opticup.co.il (set a password)
--   4. Copy each user's UUID (shown in the Users table)
--   5. Replace REPLACE_WITH_SUPPORT_AUTH_UID and REPLACE_WITH_VIEWER_AUTH_UID below
--   6. Run this block in SQL Editor
--
-- Table structure reference (platform_admins):
--   id              UUID PRIMARY KEY (auto-generated)
--   auth_user_id    UUID NOT NULL UNIQUE  ← from Supabase Auth
--   email           TEXT NOT NULL UNIQUE
--   display_name    TEXT NOT NULL
--   role            TEXT NOT NULL CHECK (role IN ('super_admin', 'support', 'viewer'))
--   status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'))
--   last_login      TIMESTAMPTZ
--   created_at      TIMESTAMPTZ DEFAULT now()

-- Support agent — can view tenants, reset PINs, view activity logs
-- Cannot: create/delete tenants, edit tenants, change plans, view platform audit log
INSERT INTO platform_admins (auth_user_id, email, display_name, role, status)
VALUES (
  'REPLACE_WITH_SUPPORT_AUTH_UID',   -- ← paste UUID from Supabase Auth
  'support@test.opticup.co.il',
  'Support Agent',
  'support',
  'active'
);

-- Viewer — read-only access to tenant list
-- Cannot: any actions (no create, edit, suspend, delete, reset PIN)
INSERT INTO platform_admins (auth_user_id, email, display_name, role, status)
VALUES (
  'REPLACE_WITH_VIEWER_AUTH_UID',    -- ← paste UUID from Supabase Auth
  'viewer@test.opticup.co.il',
  'QA Viewer',
  'viewer',
  'active'
);

-- Verify:
-- SELECT id, email, display_name, role, status FROM platform_admins;
-- Expected: 3 rows (Daniel super_admin + support + viewer)


-- ============================================================
-- BLOCK 2: Plan assignment for limit testing
-- ============================================================
--
-- Strategy: Use Option B from QA spec
--   - Prizma + Demo stay on enterprise (unlimited, production-safe)
--   - During test 3.7, create a NEW tenant "test-store-qa" via wizard
--   - Assign basic plan to test-store-qa for limit testing
--
-- This block is run AFTER test 3.7 creates the tenant via wizard.
-- If the wizard already assigned basic plan, skip this.

-- Check current plan assignments:
-- SELECT t.slug, t.name, p.name AS plan_name, p.display_name
-- FROM tenants t LEFT JOIN plans p ON t.plan_id = p.id
-- WHERE t.status != 'deleted';

-- If test-store-qa needs basic plan:
-- UPDATE tenants
-- SET plan_id = (SELECT id FROM plans WHERE name = 'basic')
-- WHERE slug = 'test-store-qa';

-- Verify Prizma + Demo are on enterprise:
-- SELECT slug, plan_id FROM tenants WHERE slug IN ('prizma', 'demo');
-- Both should point to enterprise plan id.
-- If not:
-- UPDATE tenants
-- SET plan_id = (SELECT id FROM plans WHERE name = 'enterprise')
-- WHERE slug IN ('prizma', 'demo');


-- ============================================================
-- BLOCK 3: Verify storefront_config table exists
-- ============================================================
--
-- Phase 5a prepared the SQL but it may not have been executed yet.
-- Check if storefront_config exists:
--
-- SELECT COUNT(*) FROM information_schema.tables
-- WHERE table_name = 'storefront_config';
--
-- If 0 → run the SQL from: docs/phase5a-storefront-config.sql
-- If 1 → already exists, skip.


-- ============================================================
-- BLOCK 4: Verification queries (run after all setup)
-- ============================================================

-- 4a. Confirm 3 admin users exist with correct roles
-- SELECT id, email, display_name, role, status FROM platform_admins ORDER BY role;

-- 4b. Confirm 3 plans exist
-- SELECT id, name, display_name, is_active FROM plans ORDER BY sort_order;

-- 4c. Confirm tenant plan assignments
-- SELECT t.slug, t.name, t.status, p.name AS plan
-- FROM tenants t LEFT JOIN plans p ON t.plan_id = p.id
-- WHERE t.status != 'deleted'
-- ORDER BY t.created_at;

-- 4d. Confirm storefront_config exists
-- SELECT COUNT(*) FROM storefront_config;

-- 4e. Confirm test tenant has all required data (run after test 3.7)
-- Replace TENANT_ID with the actual UUID from provisioning
--
-- SELECT 'roles' AS entity, COUNT(*) FROM roles WHERE tenant_id = 'TENANT_ID'
-- UNION ALL SELECT 'permissions', COUNT(*) FROM permissions WHERE tenant_id = 'TENANT_ID'
-- UNION ALL SELECT 'employees', COUNT(*) FROM employees WHERE tenant_id = 'TENANT_ID'
-- UNION ALL SELECT 'document_types', COUNT(*) FROM document_types WHERE tenant_id = 'TENANT_ID'
-- UNION ALL SELECT 'payment_methods', COUNT(*) FROM payment_methods WHERE tenant_id = 'TENANT_ID'
-- UNION ALL SELECT 'tenant_config', COUNT(*) FROM tenant_config WHERE tenant_id = 'TENANT_ID'
-- UNION ALL SELECT 'storefront_config', COUNT(*) FROM storefront_config WHERE tenant_id = 'TENANT_ID';
-- Expected: 5 roles, 57 permissions, 1 employee, 5 doc_types, 5 payment_methods, 6 config, 1 storefront_config
