-- ═══════════════════════════════════════════════════════════════
-- Module 2: Platform Admin — Phase 5a
-- storefront_config table + migration + create_tenant update
-- Generated: 2026-03-26
-- Run in: Supabase Dashboard > SQL Editor (service_role)
-- ═══════════════════════════════════════════════════════════════
-- Contents:
--   BLOCK 1: CREATE TABLE storefront_config + RLS + index + GRANT
--   BLOCK 2: Migration — seed existing tenants
--   BLOCK 3: Updated create_tenant() RPC with Step 11
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- BLOCK 1: CREATE TABLE storefront_config
-- ═══════════════════════════════════════════════════════════════
-- Storefront config per tenant. DB prep for Module 3 (Storefront).
-- No UI yet — just the table structure and default rows.
-- tenant_id is UNIQUE: one storefront config per tenant.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE storefront_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  enabled BOOLEAN DEFAULT false,
  domain TEXT,                           -- custom domain (future)
  subdomain TEXT,                        -- xxx.opticup.co.il (future)
  theme JSONB DEFAULT '{}',             -- storefront-specific theme
  logo_url TEXT,
  categories JSONB DEFAULT '[]',        -- displayed product categories
  seo JSONB DEFAULT '{}',              -- title, description, keywords
  pages JSONB DEFAULT '{}',            -- enabled pages (about, contact, blog)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE storefront_config ENABLE ROW LEVEL SECURITY;

-- Policy 1: Tenant reads own row via JWT claims
-- Uses the same pattern as all Module 1 tables (inventory, brands, etc.)
-- The pin-auth Edge Function sets tenant_id inside the JWT.
CREATE POLICY storefront_config_tenant_read ON storefront_config
  FOR SELECT USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

-- Policy 2: Platform admins — full access (read + write)
-- Same pattern as tenant_config admin policy.
CREATE POLICY storefront_config_admin_access ON storefront_config
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );

-- Index
CREATE INDEX idx_storefront_config_tenant ON storefront_config(tenant_id);

-- Grants: allow ERP pages (anon role with JWT) and admin (authenticated) to read
GRANT SELECT ON storefront_config TO anon;
GRANT SELECT ON storefront_config TO authenticated;


-- ═══════════════════════════════════════════════════════════════
-- BLOCK 2: Migration — seed existing tenants
-- ═══════════════════════════════════════════════════════════════
-- Prizma + Demo (and any other existing tenants) get a default
-- storefront_config row with enabled=false.
-- Idempotent: skips tenants that already have a row.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storefront_config (tenant_id, enabled)
SELECT id, false FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM storefront_config);


-- ═══════════════════════════════════════════════════════════════
-- BLOCK 3: Updated create_tenant() RPC — adds Step 11
-- ═══════════════════════════════════════════════════════════════
-- This is the FULL function (CREATE OR REPLACE).
-- Only change from previous version: Step 11 added at the end.
-- All 10 existing steps are preserved verbatim.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_tenant(
  p_name TEXT,
  p_slug TEXT,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_phone TEXT DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL,
  p_admin_pin TEXT DEFAULT '12345',
  p_admin_name TEXT DEFAULT 'מנהל',
  p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_employee_id UUID;
  v_slug_result JSONB;
BEGIN

  -- ═══════════════════════════════════════════
  -- Step 1: Validate slug
  -- ═══════════════════════════════════════════
  v_slug_result := validate_slug(p_slug);
  IF (v_slug_result->>'valid')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Slug validation failed: %', v_slug_result->>'reason';
  END IF;

  -- ═══════════════════════════════════════════
  -- Step 2: Create tenant row
  -- ═══════════════════════════════════════════
  INSERT INTO tenants (
    name, slug, status, plan_id,
    owner_name, owner_email, owner_phone, created_by,
    default_currency, timezone, locale, is_active
  ) VALUES (
    p_name, p_slug, 'active', p_plan_id,
    p_owner_name, p_owner_email, p_owner_phone, p_created_by,
    'ILS', 'Asia/Jerusalem', 'he-IL', true
  )
  RETURNING id INTO v_tenant_id;

  -- ═══════════════════════════════════════════
  -- Step 3: Create default config (6 entries)
  -- ═══════════════════════════════════════════
  INSERT INTO tenant_config (tenant_id, key, value) VALUES
    (v_tenant_id, 'business_name',     to_jsonb(p_name)),
    (v_tenant_id, 'currency',          '"ILS"'::jsonb),
    (v_tenant_id, 'timezone',          '"Asia/Jerusalem"'::jsonb),
    (v_tenant_id, 'locale',            '"he-IL"'::jsonb),
    (v_tenant_id, 'vat_rate',          '17'::jsonb),
    (v_tenant_id, 'feature_overrides', '{}'::jsonb);

  -- ═══════════════════════════════════════════
  -- Step 4: Create 5 roles
  -- ═══════════════════════════════════════════
  INSERT INTO roles (id, name_he, description, is_system, tenant_id) VALUES
    ('ceo',      'מנכ"ל',     'גישה מלאה לכל המערכת',      true, v_tenant_id),
    ('manager',  'מנהל',      'ניהול מלא חוץ מהרשאות מערכת', true, v_tenant_id),
    ('senior',   'בכיר',      'מלאי, רכש, קבלות',           true, v_tenant_id),
    ('employee', 'עובד',      'פעולות בסיסיות',              true, v_tenant_id),
    ('viewer',   'צופה',      'צפייה בלבד',                  true, v_tenant_id);

  -- ═══════════════════════════════════════════
  -- Step 5: Create 57 permissions
  -- ═══════════════════════════════════════════
  INSERT INTO permissions (id, module, action, name_he, tenant_id) VALUES
    -- Inventory (8)
    ('inventory.view',       'inventory',  'view',    'צפייה במלאי',          v_tenant_id),
    ('inventory.create',     'inventory',  'create',  'הוספת פריט',           v_tenant_id),
    ('inventory.edit',       'inventory',  'edit',    'עריכת מלאי',           v_tenant_id),
    ('inventory.delete',     'inventory',  'delete',  'מחיקת פריט',           v_tenant_id),
    ('inventory.export',     'inventory',  'export',  'ייצוא מלאי',           v_tenant_id),
    ('inventory.reduce',     'inventory',  'reduce',  'הורדת כמות',           v_tenant_id),
    ('inventory.images',     'inventory',  'images',  'ניהול תמונות',         v_tenant_id),
    ('inventory.barcode',    'inventory',  'barcode', 'ניהול ברקודים',        v_tenant_id),
    -- Purchasing (4)
    ('purchasing.view',      'purchasing', 'view',    'צפייה בהזמנות רכש',    v_tenant_id),
    ('purchasing.create',    'purchasing', 'create',  'יצירת הזמנה',          v_tenant_id),
    ('purchasing.edit',      'purchasing', 'edit',    'עריכת הזמנה',          v_tenant_id),
    ('purchasing.delete',    'purchasing', 'delete',  'מחיקת הזמנה',          v_tenant_id),
    -- Receipts (4)
    ('receipts.view',        'receipts',   'view',    'צפייה בקבלות סחורה',   v_tenant_id),
    ('receipts.create',      'receipts',   'create',  'יצירת קבלת סחורה',     v_tenant_id),
    ('receipts.confirm',     'receipts',   'confirm', 'אישור קבלת סחורה',     v_tenant_id),
    ('receipts.edit_prices', 'receipts',   'edit_prices', 'עריכת מחירי קבלה', v_tenant_id),
    -- Audit (2)
    ('audit.view',           'audit',      'view',    'צפייה בלוג פעולות',    v_tenant_id),
    ('audit.item_history',   'audit',      'item_history', 'היסטוריית פריט',  v_tenant_id),
    -- Brands (2)
    ('brands.view',          'brands',     'view',    'צפייה במותגים',         v_tenant_id),
    ('brands.edit',          'brands',     'edit',    'עריכת מותגים',          v_tenant_id),
    -- Suppliers (2)
    ('suppliers.view',       'suppliers',  'view',    'צפייה בספקים',          v_tenant_id),
    ('suppliers.edit',       'suppliers',  'edit',    'עריכת ספקים',           v_tenant_id),
    -- Sync (2)
    ('sync.view',            'sync',       'view',    'צפייה בסנכרון',         v_tenant_id),
    ('sync.manage',          'sync',       'manage',  'ניהול סנכרון',          v_tenant_id),
    -- Admin (3)
    ('admin.view',           'admin',      'view',    'צפייה בניהול',          v_tenant_id),
    ('admin.manage',         'admin',      'manage',  'ניהול מערכת',           v_tenant_id),
    ('admin.system_log',     'admin',      'system_log', 'לוג מערכת',         v_tenant_id),
    -- Debt (12)
    ('debt.view',            'debt',       'view',    'צפייה בחובות',          v_tenant_id),
    ('debt.create',          'debt',       'create',  'יצירת מסמך חוב',       v_tenant_id),
    ('debt.edit',            'debt',       'edit',    'עריכת מסמך חוב',       v_tenant_id),
    ('debt.delete',          'debt',       'delete',  'מחיקת מסמך חוב',       v_tenant_id),
    ('debt.payments',        'debt',       'payments','ניהול תשלומים',         v_tenant_id),
    ('debt.prepaid',         'debt',       'prepaid', 'עסקאות מראש',          v_tenant_id),
    ('debt.returns',         'debt',       'returns', 'החזרות לספק',          v_tenant_id),
    ('debt.ai_ocr',          'debt',       'ai_ocr',  'סריקת מסמכים AI',     v_tenant_id),
    ('debt.ai_alerts',       'debt',       'ai_alerts','התראות AI',           v_tenant_id),
    ('debt.ai_config',       'debt',       'ai_config','הגדרות AI',           v_tenant_id),
    ('debt.ai_batch',        'debt',       'ai_batch', 'העלאה קבוצתית AI',   v_tenant_id),
    ('debt.ai_historical',   'debt',       'ai_historical','ייבוא היסטורי AI', v_tenant_id),
    -- Shipments (7)
    ('shipments.view',       'shipments',  'view',    'צפייה במשלוחים',       v_tenant_id),
    ('shipments.create',     'shipments',  'create',  'יצירת משלוח',          v_tenant_id),
    ('shipments.edit',       'shipments',  'edit',    'עריכת משלוח',          v_tenant_id),
    ('shipments.delete',     'shipments',  'delete',  'מחיקת משלוח',          v_tenant_id),
    ('shipments.lock',       'shipments',  'lock',    'נעילת משלוח',          v_tenant_id),
    ('shipments.settings',   'shipments',  'settings','הגדרות משלוחים',       v_tenant_id),
    ('shipments.manifest',   'shipments',  'manifest','מניפסט משלוחים',       v_tenant_id),
    -- Settings (2)
    ('settings.view',        'settings',   'view',    'צפייה בהגדרות',        v_tenant_id),
    ('settings.edit',        'settings',   'edit',    'עריכת הגדרות',         v_tenant_id),
    -- Employees (2)
    ('employees.view',       'employees',  'view',    'צפייה בעובדים',        v_tenant_id),
    ('employees.manage',     'employees',  'manage',  'ניהול עובדים',         v_tenant_id),
    -- Stock Count (7)
    ('stock_count.view',     'stock_count','view',    'צפייה בספירות',        v_tenant_id),
    ('stock_count.create',   'stock_count','create',  'יצירת ספירה',          v_tenant_id),
    ('stock_count.scan',     'stock_count','scan',    'סריקת פריטים',         v_tenant_id),
    ('stock_count.approve',  'stock_count','approve', 'אישור ספירה',          v_tenant_id),
    ('stock_count.filters',  'stock_count','filters', 'סינון ספירה',          v_tenant_id),
    ('stock_count.report',   'stock_count','report',  'דוח ספירה',            v_tenant_id),
    ('stock_count.delete',   'stock_count','delete',  'מחיקת ספירה',          v_tenant_id);

  -- Total: 8+4+4+2+2+2+2+3+12+7+2+2+7 = 57 permissions

  -- ═══════════════════════════════════════════
  -- Step 6: Create role_permissions mapping
  -- ═══════════════════════════════════════════

  -- CEO: ALL 57 permissions
  INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
  SELECT 'ceo', id, true, v_tenant_id
  FROM permissions
  WHERE tenant_id = v_tenant_id;

  -- Manager: ALL except admin.* (54 permissions)
  INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
  SELECT 'manager', id, true, v_tenant_id
  FROM permissions
  WHERE tenant_id = v_tenant_id
    AND module != 'admin';

  -- Senior: inventory, purchasing, receipts, audit, brands, shipments (some), stock_count (some)
  INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id) VALUES
    -- Inventory (all 8)
    ('senior', 'inventory.view',       true, v_tenant_id),
    ('senior', 'inventory.create',     true, v_tenant_id),
    ('senior', 'inventory.edit',       true, v_tenant_id),
    ('senior', 'inventory.export',     true, v_tenant_id),
    ('senior', 'inventory.reduce',     true, v_tenant_id),
    ('senior', 'inventory.images',     true, v_tenant_id),
    ('senior', 'inventory.barcode',    true, v_tenant_id),
    -- Purchasing (all 4)
    ('senior', 'purchasing.view',      true, v_tenant_id),
    ('senior', 'purchasing.create',    true, v_tenant_id),
    ('senior', 'purchasing.edit',      true, v_tenant_id),
    ('senior', 'purchasing.delete',    true, v_tenant_id),
    -- Receipts (all 4)
    ('senior', 'receipts.view',        true, v_tenant_id),
    ('senior', 'receipts.create',      true, v_tenant_id),
    ('senior', 'receipts.confirm',     true, v_tenant_id),
    ('senior', 'receipts.edit_prices', true, v_tenant_id),
    -- Audit (all 2)
    ('senior', 'audit.view',           true, v_tenant_id),
    ('senior', 'audit.item_history',   true, v_tenant_id),
    -- Brands (all 2)
    ('senior', 'brands.view',          true, v_tenant_id),
    ('senior', 'brands.edit',          true, v_tenant_id),
    -- Shipments (view, create, edit, lock)
    ('senior', 'shipments.view',       true, v_tenant_id),
    ('senior', 'shipments.create',     true, v_tenant_id),
    ('senior', 'shipments.edit',       true, v_tenant_id),
    ('senior', 'shipments.lock',       true, v_tenant_id),
    -- Stock Count (view, create, scan, approve, filters, report)
    ('senior', 'stock_count.view',     true, v_tenant_id),
    ('senior', 'stock_count.create',   true, v_tenant_id),
    ('senior', 'stock_count.scan',     true, v_tenant_id),
    ('senior', 'stock_count.approve',  true, v_tenant_id),
    ('senior', 'stock_count.filters',  true, v_tenant_id),
    ('senior', 'stock_count.report',   true, v_tenant_id);

  -- Employee: basic operations
  INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id) VALUES
    ('employee', 'inventory.view',       true, v_tenant_id),
    ('employee', 'inventory.create',     true, v_tenant_id),
    ('employee', 'inventory.reduce',     true, v_tenant_id),
    ('employee', 'inventory.images',     true, v_tenant_id),
    ('employee', 'shipments.view',       true, v_tenant_id),
    ('employee', 'shipments.create',     true, v_tenant_id),
    ('employee', 'stock_count.view',     true, v_tenant_id),
    ('employee', 'stock_count.scan',     true, v_tenant_id);

  -- Viewer: view-only permissions
  INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id) VALUES
    ('viewer', 'inventory.view',     true, v_tenant_id),
    ('viewer', 'audit.view',         true, v_tenant_id),
    ('viewer', 'audit.item_history', true, v_tenant_id),
    ('viewer', 'debt.view',          true, v_tenant_id),
    ('viewer', 'shipments.view',     true, v_tenant_id),
    ('viewer', 'stock_count.view',   true, v_tenant_id);

  -- ═══════════════════════════════════════════
  -- Step 7: Create admin employee
  -- ═══════════════════════════════════════════
  INSERT INTO employees (name, pin, tenant_id, must_change_pin, is_active)
  VALUES (p_admin_name, p_admin_pin, v_tenant_id, true, true)
  RETURNING id INTO v_employee_id;

  -- ═══════════════════════════════════════════
  -- Step 8: Assign CEO role to admin employee
  -- ═══════════════════════════════════════════
  INSERT INTO employee_roles (employee_id, role_id, granted_by, tenant_id)
  VALUES (v_employee_id, 'ceo', v_employee_id, v_tenant_id);

  -- ═══════════════════════════════════════════
  -- Step 9: Create default document types (5)
  -- ═══════════════════════════════════════════
  INSERT INTO document_types (tenant_id, code, name_he, name_en, affects_debt, is_system) VALUES
    (v_tenant_id, 'invoice',         'חשבונית מס',      'Tax Invoice',     'increase', true),
    (v_tenant_id, 'delivery_note',   'תעודת משלוח',     'Delivery Note',   'increase', true),
    (v_tenant_id, 'credit_note',     'חשבונית זיכוי',   'Credit Note',     'decrease', true),
    (v_tenant_id, 'receipt',         'קבלה',            'Receipt',         'none',     true),
    (v_tenant_id, 'invoice_receipt', 'חשבונית עסקה',    'Invoice Receipt', 'increase', true);

  -- ═══════════════════════════════════════════
  -- Step 10: Create default payment methods (5)
  -- ═══════════════════════════════════════════
  INSERT INTO payment_methods (tenant_id, code, name_he, name_en, is_system) VALUES
    (v_tenant_id, 'cash',           'מזומן',         'Cash',           true),
    (v_tenant_id, 'credit_card',    'כרטיס אשראי',   'Credit Card',    true),
    (v_tenant_id, 'bank_transfer',  'העברה בנקאית',   'Bank Transfer',  true),
    (v_tenant_id, 'check',          'צ׳ק',           'Check',          true),
    (v_tenant_id, 'credit_account', 'הקפה',          'Credit Account', true);

  -- ═══════════════════════════════════════════
  -- Step 11: Create default storefront_config
  -- ═══════════════════════════════════════════
  -- Added in Phase 5a. Every new tenant gets a storefront_config
  -- row with enabled=false. Module 3 (Storefront) will use this.
  INSERT INTO storefront_config (tenant_id, enabled)
  VALUES (v_tenant_id, false);

  -- ═══════════════════════════════════════════
  -- Done — return tenant ID
  -- ═══════════════════════════════════════════
  RETURN v_tenant_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
