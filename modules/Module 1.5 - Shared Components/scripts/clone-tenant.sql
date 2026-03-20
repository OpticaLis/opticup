-- ═══════════════════════════════════════════════════════════════
-- Optic Up — Clone Tenant Script
-- מודול 1.5 — QA Phase — Step 1: Clone Tenant for Testing
-- ═══════════════════════════════════════════════════════════════
-- מטרה: שכפול הדייר "אופטיקה פריזמה" לדייר בדיקה "אופטיקה דמו"
-- הסקריפט יוצר דייר חדש עם ערכת צבעים ירוקה (כדי לזהות מיד)
-- ומעתיק את כל הנתונים עם UUIDs חדשים ומיפוי FK תקין.
--
-- ⚠️ חשוב: הריצו עם service_role (לא anon) — צריך bypass ל-RLS
-- ⚠️ חשוב: הריצו ב-Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ============================================================
-- 0. משתנים — מזהי מקור ויעד
-- ============================================================
DO $clone$
DECLARE
  -- מזהה הדייר המקורי (פריזמה)
  v_source_tenant UUID;
  -- מזהה הדייר החדש (דמו)
  v_new_tenant    UUID := gen_random_uuid();
  -- מזהה העובד החדש לבדיקות
  v_new_employee  UUID := gen_random_uuid();
  -- ספירות שורות
  v_count         INTEGER;
  v_src           INTEGER;
  v_dst           INTEGER;

BEGIN

-- ============================================================
-- 1. אתר את דייר המקור
-- ============================================================
SELECT id INTO v_source_tenant
  FROM tenants
  WHERE slug = 'prizma';

IF v_source_tenant IS NULL THEN
  RAISE EXCEPTION 'דייר מקור (prizma) לא נמצא!';
END IF;

RAISE NOTICE '=== מתחיל שכפול דייר ===';
RAISE NOTICE 'מקור: % (prizma)', v_source_tenant;
RAISE NOTICE 'יעד:  % (demo)', v_new_tenant;

-- ============================================================
-- 2. צור דייר חדש — העתקה מפריזמה עם שינויים
-- ============================================================
INSERT INTO tenants (
  id, name, slug, logo_url, default_currency, timezone, locale, is_active,
  business_name, business_address, business_phone, business_email, business_id,
  vat_rate, withholding_tax_default, payment_terms_days,
  rows_per_page, date_format, theme,
  shipment_lock_minutes, box_number_prefix, require_tracking_before_lock,
  auto_print_on_lock, shipment_config,
  ui_config
)
SELECT
  v_new_tenant,                    -- מזהה חדש
  'אופטיקה דמו',                   -- שם חדש
  'demo',                          -- slug חדש
  logo_url, default_currency, timezone, locale, true,
  'אופטיקה דמו (בדיקה)',           -- שם עסק שונה
  business_address, business_phone, business_email, business_id,
  vat_rate, withholding_tax_default, payment_terms_days,
  rows_per_page, date_format, theme,
  shipment_lock_minutes, box_number_prefix, require_tracking_before_lock,
  auto_print_on_lock, shipment_config,
  -- ערכת צבעים ירוקה — כדי לזהות מיד שאנחנו בדייר הבדיקה
  '{"--color-primary": "#059669", "--color-primary-hover": "#047857", "--color-primary-light": "#d1fae5", "--color-primary-dark": "#065f46"}'::jsonb
FROM tenants
WHERE id = v_source_tenant;

RAISE NOTICE 'דייר חדש נוצר: demo (%)' , v_new_tenant;

-- ============================================================
-- 3. צור עובד בדיקה עם הרשאות מלאות
-- ============================================================
-- PIN מאוחסן כטקסט רגיל (לא hash) — כפי שהמערכת עובדת
INSERT INTO employees (id, name, pin, role, branch_id, is_active, tenant_id)
VALUES (v_new_employee, 'עובד בדיקה', '12345', 'admin', '00', true, v_new_tenant);

RAISE NOTICE 'עובד בדיקה נוצר: PIN=12345';

-- ============================================================
-- 4. העתקת טבלאות הגדרה (config) — roles, permissions, role_permissions
-- ============================================================
-- roles — PK הוא TEXT (לא UUID), אז פשוט מעתיקים עם tenant_id חדש
INSERT INTO roles (id, name_he, description, is_system, tenant_id)
SELECT id, name_he, description, is_system, v_new_tenant
FROM roles
WHERE tenant_id = v_source_tenant
ON CONFLICT (id, tenant_id) DO NOTHING;
-- הערה: roles PK הוא (id, tenant_id) — composite, כל דייר מקבל עותק משלו

-- permissions — PK הוא (id, tenant_id)
INSERT INTO permissions (id, module, action, name_he, description, tenant_id)
SELECT id, module, action, name_he, description, v_new_tenant
FROM permissions
WHERE tenant_id = v_source_tenant
ON CONFLICT (id, tenant_id) DO NOTHING;

-- role_permissions — composite PK (role_id, permission_id, tenant_id)
INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id)
SELECT role_id, permission_id, granted, v_new_tenant
FROM role_permissions
WHERE tenant_id = v_source_tenant
ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING;

-- employee_roles — שיוך תפקיד CEO לעובד הבדיקה
INSERT INTO employee_roles (employee_id, role_id, granted_by, tenant_id)
VALUES (v_new_employee, 'ceo', v_new_employee, v_new_tenant)
ON CONFLICT (employee_id, role_id, tenant_id) DO NOTHING;

RAISE NOTICE 'roles + permissions + employee_roles — הועתקו';

-- ============================================================
-- 5. העתקת טבלאות config עם UUID חדש — document_types, payment_methods, currencies
-- ============================================================

-- 5a. document_types
CREATE TEMP TABLE _doctype_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _doctype_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM document_types WHERE tenant_id = v_source_tenant;

INSERT INTO document_types (id, tenant_id, code, name_he, name_en, affects_debt, is_system, is_active)
SELECT m.new_id, v_new_tenant, d.code, d.name_he, d.name_en, d.affects_debt, d.is_system, d.is_active
FROM document_types d
JOIN _doctype_map m ON m.old_id = d.id
WHERE d.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'document_types: % שורות', v_count;

-- 5b. payment_methods
INSERT INTO payment_methods (id, tenant_id, code, name_he, name_en, is_system, is_active)
SELECT gen_random_uuid(), v_new_tenant, code, name_he, name_en, is_system, is_active
FROM payment_methods WHERE tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'payment_methods: % שורות', v_count;

-- 5c. currencies
INSERT INTO currencies (id, tenant_id, code, name_he, symbol, is_default, is_active)
SELECT gen_random_uuid(), v_new_tenant, code, name_he, symbol, is_default, is_active
FROM currencies WHERE tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'currencies: % שורות', v_count;

-- ============================================================
-- 6. העתקת brands — שכבה 1 (אין FK חוץ מ-tenants)
-- ============================================================
CREATE TEMP TABLE _brand_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _brand_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM brands WHERE tenant_id = v_source_tenant;

INSERT INTO brands (id, name, brand_type, default_sync, active, exclude_website, min_stock_qty, tenant_id, branch_id, created_by)
SELECT m.new_id,
       b.name || ' (דמו)',  -- שם שונה כדי לא להתנגש עם UNIQUE
       b.brand_type, b.default_sync, b.active, b.exclude_website, b.min_stock_qty,
       v_new_tenant, b.branch_id, b.created_by
FROM brands b
JOIN _brand_map m ON m.old_id = b.id
WHERE b.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'brands: % שורות', v_count;

-- ============================================================
-- 7. העתקת suppliers — שכבה 1 (אין FK חוץ מ-tenants)
-- ============================================================
CREATE TEMP TABLE _supplier_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _supplier_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM suppliers WHERE tenant_id = v_source_tenant;

INSERT INTO suppliers (
  id, name, supplier_number, contact, phone, mobile, email, address, tax_id,
  payment_terms, rating, notes, active, tenant_id, branch_id, created_by,
  default_document_type, default_currency, payment_terms_days,
  has_prepaid_deal, withholding_tax_rate, tax_exempt_certificate, tax_exempt_until
)
SELECT
  m.new_id,
  s.name || ' (דמו)',      -- שם שונה כדי לא להתנגש עם UNIQUE
  s.supplier_number + 9000, -- מספר ספק שונה כדי לא להתנגש עם UNIQUE
  s.contact, s.phone, s.mobile, s.email, s.address, s.tax_id,
  s.payment_terms, s.rating, s.notes, s.active,
  v_new_tenant, s.branch_id, s.created_by,
  s.default_document_type, s.default_currency, s.payment_terms_days,
  s.has_prepaid_deal, s.withholding_tax_rate, s.tax_exempt_certificate, s.tax_exempt_until
FROM suppliers s
JOIN _supplier_map m ON m.old_id = s.id
WHERE s.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'suppliers: % שורות', v_count;

-- ============================================================
-- 8. העתקת employees (חוץ מהעובד שכבר יצרנו)
-- ============================================================
CREATE TEMP TABLE _employee_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _employee_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM employees WHERE tenant_id = v_source_tenant;

-- Cloned employees get auto-generated 6-digit PINs (090001, 090002, ...)
-- Only test employee (PIN 12345) is used for QA login
-- UNIQUE constraint on (tenant_id, pin) requires unique PINs per tenant
INSERT INTO employees (id, name, pin, role, branch_id, is_active, tenant_id, email, phone, created_by, last_login, failed_attempts, locked_until)
SELECT m.new_id, e.name || ' (דמו)',
       LPAD((ROW_NUMBER() OVER (ORDER BY e.id) + 90000)::TEXT, 6, '0'),
       e.role, e.branch_id, e.is_active, v_new_tenant,
       e.email, e.phone, NULL, NULL, 0, NULL  -- created_by=NULL (self-ref, יעודכן בשלב הבא)
FROM employees e
JOIN _employee_map m ON m.old_id = e.id
WHERE e.tenant_id = v_source_tenant;

-- עדכון created_by (self-reference) — שלב שני
UPDATE employees emp
SET created_by = em.new_id
FROM employees emp_orig
JOIN _employee_map em_self ON em_self.old_id = emp_orig.id
JOIN _employee_map em ON em.old_id = emp_orig.created_by
WHERE emp.id = em_self.new_id
  AND emp_orig.tenant_id = v_source_tenant
  AND emp_orig.created_by IS NOT NULL;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'employees (cloned): % שורות (% created_by links)', v_count, v_count;

-- שיוך תפקידים לעובדים המשוכפלים
INSERT INTO employee_roles (employee_id, role_id, granted_by, tenant_id)
SELECT em.new_id, er.role_id, v_new_employee, v_new_tenant
FROM employee_roles er
JOIN _employee_map em ON em.old_id = er.employee_id
WHERE er.tenant_id = v_source_tenant
ON CONFLICT (employee_id, role_id, tenant_id) DO NOTHING;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'employee_roles (cloned): % שורות', v_count;

-- ============================================================
-- 9. העתקת inventory — שכבה 2 (תלוי ב-brands, suppliers)
-- ============================================================
CREATE TEMP TABLE _inventory_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _inventory_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM inventory WHERE tenant_id = v_source_tenant;

INSERT INTO inventory (
  id, barcode, supplier_id, brand_id, model, size, bridge, color, temple_length,
  product_type, sell_price, sell_discount, cost_price, cost_discount,
  quantity, website_sync, status, brand_type, origin, woocommerce_id, notes,
  is_deleted, deleted_at, deleted_by, deleted_reason, access_exported,
  custom_fields, tenant_id, branch_id, created_by
)
SELECT
  im.new_id,
  i.barcode,  -- ברקוד זהה — UNIQUE constraint כולל tenant_id אז אין התנגשות
  sm.new_id,  -- FK ספק ממופה
  bm.new_id,  -- FK מותג ממופה
  i.model, i.size, i.bridge, i.color, i.temple_length,
  i.product_type, i.sell_price, i.sell_discount, i.cost_price, i.cost_discount,
  i.quantity, i.website_sync, i.status, i.brand_type, i.origin, i.woocommerce_id, i.notes,
  i.is_deleted, i.deleted_at, i.deleted_by, i.deleted_reason, false,
  i.custom_fields, v_new_tenant, i.branch_id, i.created_by
FROM inventory i
JOIN _inventory_map im ON im.old_id = i.id
LEFT JOIN _supplier_map sm ON sm.old_id = i.supplier_id
LEFT JOIN _brand_map bm ON bm.old_id = i.brand_id
WHERE i.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'inventory: % שורות', v_count;

-- ============================================================
-- 10. inventory_images — שכבה 3 (תלוי ב-inventory)
-- ============================================================
INSERT INTO inventory_images (id, inventory_id, storage_path, url, thumbnail_url, file_name, file_size, sort_order, tenant_id)
SELECT gen_random_uuid(), im.new_id, ii.storage_path, ii.url, ii.thumbnail_url, ii.file_name, ii.file_size, ii.sort_order, v_new_tenant
FROM inventory_images ii
JOIN _inventory_map im ON im.old_id = ii.inventory_id
WHERE ii.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'inventory_images: % שורות', v_count;

-- ============================================================
-- 11. inventory_logs — שכבה 3 (תלוי ב-inventory)
-- ============================================================
INSERT INTO inventory_logs (
  id, action, inventory_id, barcode, brand, model,
  qty_before, qty_after, price_before, price_after,
  reason, source_ref,
  sale_amount, discount, discount_1, discount_2, final_amount,
  coupon_code, campaign, employee_id, lens_included, lens_category,
  order_number, sync_filename,
  performed_by, branch_id, tenant_id
)
SELECT
  gen_random_uuid(), il.action,
  im.new_id,  -- FK inventory ממופה
  il.barcode, il.brand, il.model,
  il.qty_before, il.qty_after, il.price_before, il.price_after,
  il.reason, il.source_ref,
  il.sale_amount, il.discount, il.discount_1, il.discount_2, il.final_amount,
  il.coupon_code, il.campaign, il.employee_id, il.lens_included, il.lens_category,
  il.order_number, il.sync_filename,
  il.performed_by, il.branch_id, v_new_tenant
FROM inventory_logs il
LEFT JOIN _inventory_map im ON im.old_id = il.inventory_id
WHERE il.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'inventory_logs: % שורות', v_count;

-- ============================================================
-- 12. purchase_orders — שכבה 2 (תלוי ב-suppliers)
-- ============================================================
CREATE TEMP TABLE _po_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _po_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM purchase_orders WHERE tenant_id = v_source_tenant;

INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, expected_date, status, notes, tenant_id, branch_id, created_by)
SELECT
  pm.new_id,
  po.po_number || '-D',   -- סיומת D (demo) כדי לא להתנגש עם UNIQUE
  sm.new_id,               -- FK ספק ממופה
  po.order_date, po.expected_date, po.status, po.notes,
  v_new_tenant, po.branch_id, po.created_by
FROM purchase_orders po
JOIN _po_map pm ON pm.old_id = po.id
LEFT JOIN _supplier_map sm ON sm.old_id = po.supplier_id
WHERE po.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'purchase_orders: % שורות', v_count;

-- ============================================================
-- 13. purchase_order_items — שכבה 3 (תלוי ב-PO, inventory)
-- ============================================================
INSERT INTO purchase_order_items (
  id, po_id, inventory_id, barcode, brand, model, color, size, bridge, temple_length,
  product_type, qty_ordered, qty_received, unit_cost, discount_pct,
  sell_price, sell_discount, website_sync, notes, tenant_id
)
SELECT
  gen_random_uuid(),
  pm.new_id,               -- FK PO ממופה
  im.new_id,               -- FK inventory ממופה (nullable)
  poi.barcode, poi.brand, poi.model, poi.color, poi.size, poi.bridge, poi.temple_length,
  poi.product_type, poi.qty_ordered, poi.qty_received, poi.unit_cost, poi.discount_pct,
  poi.sell_price, poi.sell_discount, poi.website_sync, poi.notes, v_new_tenant
FROM purchase_order_items poi
JOIN _po_map pm ON pm.old_id = poi.po_id
LEFT JOIN _inventory_map im ON im.old_id = poi.inventory_id
WHERE poi.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'purchase_order_items: % שורות', v_count;

-- ============================================================
-- 14. goods_receipts — שכבה 2-3 (תלוי ב-suppliers, PO)
-- ============================================================
CREATE TEMP TABLE _receipt_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _receipt_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM goods_receipts WHERE tenant_id = v_source_tenant;

INSERT INTO goods_receipts (
  id, receipt_number, receipt_type, supplier_id, po_id,
  branch_id, receipt_date, received_date, total_amount, notes, status,
  tenant_id, created_by
)
SELECT
  rm.new_id,
  gr.receipt_number,
  gr.receipt_type,
  sm.new_id,             -- FK ספק ממופה
  pm.new_id,             -- FK PO ממופה (nullable)
  gr.branch_id, gr.receipt_date, gr.received_date, gr.total_amount, gr.notes, gr.status,
  v_new_tenant, gr.created_by
FROM goods_receipts gr
JOIN _receipt_map rm ON rm.old_id = gr.id
LEFT JOIN _supplier_map sm ON sm.old_id = gr.supplier_id
LEFT JOIN _po_map pm ON pm.old_id = gr.po_id
WHERE gr.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'goods_receipts: % שורות', v_count;

-- ============================================================
-- 15. goods_receipt_items — שכבה 4 (תלוי ב-receipts, inventory)
-- ============================================================
INSERT INTO goods_receipt_items (
  id, receipt_id, inventory_id, barcode, brand, model, color, size,
  quantity, unit_cost, sell_price, is_new_item, tenant_id
)
SELECT
  gen_random_uuid(),
  rm.new_id,             -- FK receipt ממופה
  im.new_id,             -- FK inventory ממופה (nullable)
  gri.barcode, gri.brand, gri.model, gri.color, gri.size,
  gri.quantity, gri.unit_cost, gri.sell_price, gri.is_new_item, v_new_tenant
FROM goods_receipt_items gri
JOIN _receipt_map rm ON rm.old_id = gri.receipt_id
LEFT JOIN _inventory_map im ON im.old_id = gri.inventory_id
WHERE gri.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'goods_receipt_items: % שורות', v_count;

-- ============================================================
-- 16. stock_counts — שכבה 1 (רק tenant_id)
-- ============================================================
CREATE TEMP TABLE _sc_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _sc_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM stock_counts WHERE tenant_id = v_source_tenant;

INSERT INTO stock_counts (
  id, count_number, count_date, status, counted_by, notes,
  total_items, total_diffs, tenant_id, branch_id, completed_at, filter_criteria
)
SELECT
  scm.new_id,
  sc.count_number || '-D',  -- סיומת כדי לא להתנגש עם UNIQUE
  sc.count_date, sc.status, sc.counted_by, sc.notes,
  sc.total_items, sc.total_diffs, v_new_tenant, sc.branch_id, sc.completed_at, sc.filter_criteria
FROM stock_counts sc
JOIN _sc_map scm ON scm.old_id = sc.id
WHERE sc.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'stock_counts: % שורות', v_count;

-- ============================================================
-- 17. stock_count_items — שכבה 2 (תלוי ב-stock_counts, inventory)
-- ============================================================
INSERT INTO stock_count_items (
  id, count_id, inventory_id, barcode, brand, model, color, size,
  expected_qty, actual_qty, status, notes, counted_at, scanned_by, tenant_id
)
SELECT
  gen_random_uuid(),
  scm.new_id,            -- FK stock_count ממופה
  im.new_id,             -- FK inventory ממופה (nullable)
  sci.barcode, sci.brand, sci.model, sci.color, sci.size,
  sci.expected_qty, sci.actual_qty, sci.status, sci.notes, sci.counted_at, sci.scanned_by,
  v_new_tenant
FROM stock_count_items sci
JOIN _sc_map scm ON scm.old_id = sci.count_id
LEFT JOIN _inventory_map im ON im.old_id = sci.inventory_id
WHERE sci.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'stock_count_items: % שורות', v_count;

-- ============================================================
-- 18. sync_log — שכבה 1
-- ============================================================
CREATE TEMP TABLE _synclog_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _synclog_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM sync_log WHERE tenant_id = v_source_tenant;

INSERT INTO sync_log (
  id, filename, source_ref, status, rows_total, rows_success, rows_pending,
  rows_error, error_message, errors, storage_path, tenant_id, processed_at
)
SELECT
  slm.new_id, sl.filename, sl.source_ref, sl.status, sl.rows_total, sl.rows_success, sl.rows_pending,
  sl.rows_error, sl.error_message, sl.errors, sl.storage_path, v_new_tenant, sl.processed_at
FROM sync_log sl
JOIN _synclog_map slm ON slm.old_id = sl.id
WHERE sl.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'sync_log: % שורות', v_count;

-- ============================================================
-- 19. pending_sales — שכבה 2 (תלוי ב-sync_log, inventory)
-- ============================================================
INSERT INTO pending_sales (
  id, sync_log_id, source_ref, filename, barcode_received, quantity,
  action_type, transaction_date, order_number, employee_id,
  sale_amount, discount, discount_1, discount_2, final_amount,
  coupon_code, campaign, lens_included, lens_category,
  brand, model, size, color,
  reason, status, resolved_at, resolved_by, resolved_inventory_id, resolution_note,
  tenant_id
)
SELECT
  gen_random_uuid(),
  slm.new_id,            -- FK sync_log ממופה
  ps.source_ref, ps.filename, ps.barcode_received, ps.quantity,
  ps.action_type, ps.transaction_date, ps.order_number, ps.employee_id,
  ps.sale_amount, ps.discount, ps.discount_1, ps.discount_2, ps.final_amount,
  ps.coupon_code, ps.campaign, ps.lens_included, ps.lens_category,
  ps.brand, ps.model, ps.size, ps.color,
  ps.reason, ps.status, ps.resolved_at, ps.resolved_by,
  im.new_id,             -- FK inventory ממופה (nullable)
  ps.resolution_note,
  v_new_tenant
FROM pending_sales ps
LEFT JOIN _synclog_map slm ON slm.old_id = ps.sync_log_id
LEFT JOIN _inventory_map im ON im.old_id = ps.resolved_inventory_id
WHERE ps.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'pending_sales: % שורות', v_count;

-- ============================================================
-- 20. prepaid_deals — שכבה 2 (תלוי ב-suppliers, employees)
-- ============================================================
CREATE TEMP TABLE _prepaid_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _prepaid_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM prepaid_deals WHERE tenant_id = v_source_tenant;

INSERT INTO prepaid_deals (
  id, tenant_id, supplier_id, deal_name, start_date, end_date,
  total_prepaid, currency, total_used, total_remaining,
  alert_threshold_pct, alert_threshold_amt, status, notes,
  created_by, is_deleted
)
SELECT
  pdm.new_id, v_new_tenant,
  sm.new_id,             -- FK ספק ממופה
  pd.deal_name, pd.start_date, pd.end_date,
  pd.total_prepaid, pd.currency, pd.total_used, pd.total_remaining,
  pd.alert_threshold_pct, pd.alert_threshold_amt, pd.status, pd.notes,
  em.new_id,             -- FK employee ממופה (nullable)
  pd.is_deleted
FROM prepaid_deals pd
JOIN _prepaid_map pdm ON pdm.old_id = pd.id
LEFT JOIN _supplier_map sm ON sm.old_id = pd.supplier_id
LEFT JOIN _employee_map em ON em.old_id = pd.created_by
WHERE pd.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'prepaid_deals: % שורות', v_count;

-- ============================================================
-- 21. prepaid_checks — שכבה 3 (תלוי ב-prepaid_deals)
-- ============================================================
INSERT INTO prepaid_checks (
  id, tenant_id, prepaid_deal_id, check_number, amount, check_date,
  status, cashed_date, notes
)
SELECT
  gen_random_uuid(), v_new_tenant,
  pdm.new_id,            -- FK prepaid_deal ממופה
  pc.check_number, pc.amount, pc.check_date,
  pc.status, pc.cashed_date, pc.notes
FROM prepaid_checks pc
JOIN _prepaid_map pdm ON pdm.old_id = pc.prepaid_deal_id
WHERE pc.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'prepaid_checks: % שורות', v_count;

-- ============================================================
-- 22. supplier_documents — שכבה 3 (תלוי ב-suppliers, document_types, employees, receipts, PO)
-- ============================================================
-- שלב 1: מיפוי — כולל self-reference (parent_invoice_id)
CREATE TEMP TABLE _supdoc_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _supdoc_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM supplier_documents WHERE tenant_id = v_source_tenant;

-- שלב 2: הכנסה ראשונית — בלי parent_invoice_id (כי ייתכן reference עצמי)
INSERT INTO supplier_documents (
  id, tenant_id, supplier_id, document_type_id, document_number, document_date,
  due_date, received_date, currency, exchange_rate, subtotal, vat_rate, vat_amount,
  total_amount, parent_invoice_id, file_url, file_name, goods_receipt_id, po_id,
  status, paid_amount, notes, created_by,
  internal_number, is_deleted, file_hash, batch_id, is_historical
)
SELECT
  sdm.new_id, v_new_tenant,
  sm.new_id,              -- FK ספק ממופה
  dtm.new_id,             -- FK document_type ממופה
  sd.document_number, sd.document_date,
  sd.due_date, sd.received_date, sd.currency, sd.exchange_rate,
  sd.subtotal, sd.vat_rate, sd.vat_amount, sd.total_amount,
  NULL,                    -- parent_invoice_id — יעודכן בשלב הבא
  sd.file_url, sd.file_name,
  rm.new_id,               -- FK goods_receipt ממופה (nullable)
  pm.new_id,               -- FK PO ממופה (nullable)
  sd.status, sd.paid_amount, sd.notes,
  em.new_id,               -- FK employee ממופה (nullable)
  sd.internal_number, sd.is_deleted, sd.file_hash, sd.batch_id, sd.is_historical
FROM supplier_documents sd
JOIN _supdoc_map sdm ON sdm.old_id = sd.id
LEFT JOIN _supplier_map sm ON sm.old_id = sd.supplier_id
LEFT JOIN _doctype_map dtm ON dtm.old_id = sd.document_type_id
LEFT JOIN _receipt_map rm ON rm.old_id = sd.goods_receipt_id
LEFT JOIN _po_map pm ON pm.old_id = sd.po_id
LEFT JOIN _employee_map em ON em.old_id = sd.created_by
WHERE sd.tenant_id = v_source_tenant;

-- שלב 3: עדכון parent_invoice_id (self-reference)
UPDATE supplier_documents sd
SET parent_invoice_id = sdm_parent.new_id
FROM supplier_documents sd_orig
JOIN _supdoc_map sdm ON sdm.old_id = sd_orig.id
JOIN _supdoc_map sdm_parent ON sdm_parent.old_id = sd_orig.parent_invoice_id
WHERE sd.id = sdm.new_id
  AND sd_orig.tenant_id = v_source_tenant
  AND sd_orig.parent_invoice_id IS NOT NULL;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_documents: הועתקו (% parent links עודכנו)', v_count;

-- ============================================================
-- 23. document_links — שכבה 4 (תלוי ב-supplier_documents)
-- ============================================================
INSERT INTO document_links (
  id, tenant_id, parent_document_id, child_document_id, amount_on_invoice
)
SELECT
  gen_random_uuid(), v_new_tenant,
  sdm_p.new_id,           -- FK parent document ממופה
  sdm_c.new_id,           -- FK child document ממופה
  dl.amount_on_invoice
FROM document_links dl
JOIN _supdoc_map sdm_p ON sdm_p.old_id = dl.parent_document_id
JOIN _supdoc_map sdm_c ON sdm_c.old_id = dl.child_document_id
WHERE dl.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'document_links: % שורות', v_count;

-- ============================================================
-- 24. supplier_payments — שכבה 3 (תלוי ב-suppliers, employees, prepaid_deals)
-- ============================================================
CREATE TEMP TABLE _payment_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _payment_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM supplier_payments WHERE tenant_id = v_source_tenant;

INSERT INTO supplier_payments (
  id, tenant_id, supplier_id, amount, currency, exchange_rate,
  payment_date, payment_method, reference_number, prepaid_deal_id,
  withholding_tax_rate, withholding_tax_amount, net_amount,
  status, approved_by, approved_at, notes, created_by, is_deleted
)
SELECT
  spm.new_id, v_new_tenant,
  sm.new_id,              -- FK ספק ממופה
  sp.amount, sp.currency, sp.exchange_rate,
  sp.payment_date, sp.payment_method, sp.reference_number,
  pdm.new_id,             -- FK prepaid_deal ממופה (nullable)
  sp.withholding_tax_rate, sp.withholding_tax_amount, sp.net_amount,
  sp.status,
  em_a.new_id,            -- FK approved_by ממופה (nullable)
  sp.approved_at, sp.notes,
  em_c.new_id,            -- FK created_by ממופה (nullable)
  sp.is_deleted
FROM supplier_payments sp
JOIN _payment_map spm ON spm.old_id = sp.id
LEFT JOIN _supplier_map sm ON sm.old_id = sp.supplier_id
LEFT JOIN _prepaid_map pdm ON pdm.old_id = sp.prepaid_deal_id
LEFT JOIN _employee_map em_a ON em_a.old_id = sp.approved_by
LEFT JOIN _employee_map em_c ON em_c.old_id = sp.created_by
WHERE sp.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_payments: % שורות', v_count;

-- ============================================================
-- 25. payment_allocations — שכבה 4 (תלוי ב-supplier_payments, supplier_documents)
-- ============================================================
INSERT INTO payment_allocations (
  id, tenant_id, payment_id, document_id, allocated_amount
)
SELECT
  gen_random_uuid(), v_new_tenant,
  spm.new_id,             -- FK payment ממופה
  sdm.new_id,             -- FK document ממופה
  pa.allocated_amount
FROM payment_allocations pa
JOIN _payment_map spm ON spm.old_id = pa.payment_id
JOIN _supdoc_map sdm ON sdm.old_id = pa.document_id
WHERE pa.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'payment_allocations: % שורות', v_count;

-- ============================================================
-- 26. supplier_returns — שכבה 3 (תלוי ב-suppliers, employees, supplier_documents)
-- ============================================================
CREATE TEMP TABLE _return_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _return_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM supplier_returns WHERE tenant_id = v_source_tenant;

INSERT INTO supplier_returns (
  id, tenant_id, supplier_id, return_number, return_type, reason, status,
  ready_at, shipped_at, agent_picked_at, received_at, credited_at,
  credit_note_number, credit_amount, credit_document_id, notes, created_by, is_deleted
)
SELECT
  srm.new_id, v_new_tenant,
  sm.new_id,              -- FK ספק ממופה
  sr.return_number, sr.return_type, sr.reason, sr.status,
  sr.ready_at, sr.shipped_at, sr.agent_picked_at, sr.received_at, sr.credited_at,
  sr.credit_note_number, sr.credit_amount,
  sdm.new_id,             -- FK credit_document ממופה (nullable)
  sr.notes,
  em.new_id,              -- FK employee ממופה (nullable)
  sr.is_deleted
FROM supplier_returns sr
JOIN _return_map srm ON srm.old_id = sr.id
LEFT JOIN _supplier_map sm ON sm.old_id = sr.supplier_id
LEFT JOIN _supdoc_map sdm ON sdm.old_id = sr.credit_document_id
LEFT JOIN _employee_map em ON em.old_id = sr.created_by
WHERE sr.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_returns: % שורות', v_count;

-- ============================================================
-- 27. supplier_return_items — שכבה 4 (תלוי ב-supplier_returns, inventory)
-- ============================================================
INSERT INTO supplier_return_items (
  id, tenant_id, return_id, inventory_id, barcode, quantity,
  brand_name, model, color, size, cost_price, notes
)
SELECT
  gen_random_uuid(), v_new_tenant,
  srm.new_id,             -- FK return ממופה
  im.new_id,              -- FK inventory ממופה
  sri.barcode, sri.quantity,
  sri.brand_name, sri.model, sri.color, sri.size, sri.cost_price, sri.notes
FROM supplier_return_items sri
JOIN _return_map srm ON srm.old_id = sri.return_id
LEFT JOIN _inventory_map im ON im.old_id = sri.inventory_id
WHERE sri.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_return_items: % שורות', v_count;

-- ============================================================
-- 28. ai_agent_config — שכבה 1 (one row per tenant)
-- ============================================================
INSERT INTO ai_agent_config (
  id, tenant_id, ocr_enabled, auto_match_supplier, auto_match_po,
  confidence_threshold, alerts_enabled, payment_reminder_days,
  overdue_alert, prepaid_threshold_alert, anomaly_alert,
  weekly_report_enabled, weekly_report_day, api_key_source
)
SELECT
  gen_random_uuid(), v_new_tenant,
  ocr_enabled, auto_match_supplier, auto_match_po,
  confidence_threshold, alerts_enabled, payment_reminder_days,
  overdue_alert, prepaid_threshold_alert, anomaly_alert,
  weekly_report_enabled, weekly_report_day, api_key_source
FROM ai_agent_config
WHERE tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'ai_agent_config: % שורות', v_count;

-- ============================================================
-- 29. supplier_ocr_templates — שכבה 2 (תלוי ב-suppliers)
-- ============================================================
CREATE TEMP TABLE _ocrtempl_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _ocrtempl_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM supplier_ocr_templates WHERE tenant_id = v_source_tenant;

INSERT INTO supplier_ocr_templates (
  id, tenant_id, supplier_id, template_name, document_type_code,
  extraction_hints, times_used, times_corrected, accuracy_rate,
  last_used_at, is_active
)
SELECT
  otm.new_id, v_new_tenant,
  sm.new_id,              -- FK ספק ממופה
  sot.template_name, sot.document_type_code,
  sot.extraction_hints, sot.times_used, sot.times_corrected, sot.accuracy_rate,
  sot.last_used_at, sot.is_active
FROM supplier_ocr_templates sot
JOIN _ocrtempl_map otm ON otm.old_id = sot.id
LEFT JOIN _supplier_map sm ON sm.old_id = sot.supplier_id
WHERE sot.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_ocr_templates: % שורות', v_count;

-- ============================================================
-- 30. ocr_extractions — שכבה 3 (תלוי ב-supplier_documents, ocr_templates, employees)
-- ============================================================
INSERT INTO ocr_extractions (
  id, tenant_id, file_url, file_name, raw_response, model_used,
  extracted_data, confidence_score, status, corrections,
  supplier_document_id, template_id, processed_by, processing_time_ms
)
SELECT
  gen_random_uuid(), v_new_tenant,
  oe.file_url, oe.file_name, oe.raw_response, oe.model_used,
  oe.extracted_data, oe.confidence_score, oe.status, oe.corrections,
  sdm.new_id,             -- FK supplier_document ממופה (nullable)
  otm.new_id,             -- FK template ממופה (nullable)
  em.new_id,              -- FK employee ממופה (nullable)
  oe.processing_time_ms
FROM ocr_extractions oe
LEFT JOIN _supdoc_map sdm ON sdm.old_id = oe.supplier_document_id
LEFT JOIN _ocrtempl_map otm ON otm.old_id = oe.template_id
LEFT JOIN _employee_map em ON em.old_id = oe.processed_by
WHERE oe.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'ocr_extractions: % שורות', v_count;

-- ============================================================
-- 31. courier_companies — שכבה 1
-- ============================================================
CREATE TEMP TABLE _courier_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _courier_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM courier_companies WHERE tenant_id = v_source_tenant;

INSERT INTO courier_companies (id, tenant_id, name, phone, contact_person, is_active)
SELECT cm.new_id, v_new_tenant, cc.name, cc.phone, cc.contact_person, cc.is_active
FROM courier_companies cc
JOIN _courier_map cm ON cm.old_id = cc.id
WHERE cc.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'courier_companies: % שורות', v_count;

-- ============================================================
-- 32. shipments — שכבה 2 (תלוי ב-suppliers, couriers, employees)
-- ============================================================
CREATE TEMP TABLE _shipment_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _shipment_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM shipments WHERE tenant_id = v_source_tenant;

INSERT INTO shipments (
  id, tenant_id, box_number, shipment_type, supplier_id, customer_name,
  customer_phone, customer_address, courier_id, tracking_number,
  packed_by, packed_at, locked_at, locked_by, items_count, total_value,
  corrects_box_id, notes, is_deleted
)
SELECT
  shm.new_id, v_new_tenant,
  sh.box_number,
  sh.shipment_type,
  sm.new_id,              -- FK ספק ממופה (nullable)
  sh.customer_name, sh.customer_phone, sh.customer_address,
  cm.new_id,              -- FK courier ממופה (nullable)
  sh.tracking_number,
  em_p.new_id,            -- FK packed_by ממופה (nullable)
  sh.packed_at,           -- שמירת זמן אריזה מקורי
  sh.locked_at,
  em_l.new_id,            -- FK locked_by ממופה (nullable)
  sh.items_count, sh.total_value,
  shm_c.new_id,           -- FK corrects_box ממופה (nullable, self-ref)
  sh.notes, sh.is_deleted
FROM shipments sh
JOIN _shipment_map shm ON shm.old_id = sh.id
LEFT JOIN _supplier_map sm ON sm.old_id = sh.supplier_id
LEFT JOIN _courier_map cm ON cm.old_id = sh.courier_id
LEFT JOIN _employee_map em_p ON em_p.old_id = sh.packed_by
LEFT JOIN _employee_map em_l ON em_l.old_id = sh.locked_by
LEFT JOIN _shipment_map shm_c ON shm_c.old_id = sh.corrects_box_id
WHERE sh.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'shipments: % שורות', v_count;

-- ============================================================
-- 33. shipment_items — שכבה 3 (תלוי ב-shipments, inventory, returns)
-- ============================================================
INSERT INTO shipment_items (
  id, tenant_id, shipment_id, item_type, inventory_id, return_id,
  order_number, customer_name, customer_number,
  barcode, brand, model, size, color, category, unit_cost, notes
)
SELECT
  gen_random_uuid(), v_new_tenant,
  shm.new_id,             -- FK shipment ממופה
  si.item_type,
  im.new_id,              -- FK inventory ממופה (nullable)
  srm.new_id,             -- FK return ממופה (nullable)
  si.order_number, si.customer_name, si.customer_number,
  si.barcode, si.brand, si.model, si.size, si.color, si.category, si.unit_cost, si.notes
FROM shipment_items si
JOIN _shipment_map shm ON shm.old_id = si.shipment_id
LEFT JOIN _inventory_map im ON im.old_id = si.inventory_id
LEFT JOIN _return_map srm ON srm.old_id = si.return_id
WHERE si.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'shipment_items: % שורות', v_count;

-- ============================================================
-- 34. conversations — שכבה 1 (communications stubs)
-- ============================================================
CREATE TEMP TABLE _conv_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _conv_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM conversations WHERE tenant_id = v_source_tenant;

INSERT INTO conversations (
  id, tenant_id, channel_type, context_type, context_id, context_label,
  title, last_message_at, last_message_text, message_count, status,
  is_pinned, created_by, is_deleted
)
SELECT
  cvm.new_id, v_new_tenant,
  c.channel_type, c.context_type, c.context_id, c.context_label,
  c.title, c.last_message_at, c.last_message_text, c.message_count, c.status,
  c.is_pinned,
  em.new_id,              -- FK employee ממופה (nullable)
  c.is_deleted
FROM conversations c
JOIN _conv_map cvm ON cvm.old_id = c.id
LEFT JOIN _employee_map em ON em.old_id = c.created_by
WHERE c.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'conversations: % שורות', v_count;

-- ============================================================
-- 35. conversation_participants — שכבה 2
-- ============================================================
INSERT INTO conversation_participants (
  id, tenant_id, conversation_id, participant_type, participant_id,
  participant_name, role, last_read_at, unread_count, muted,
  notification_pref, joined_at, left_at, is_active
)
SELECT
  gen_random_uuid(), v_new_tenant,
  cvm.new_id,             -- FK conversation ממופה
  cp.participant_type, cp.participant_id, cp.participant_name,
  cp.role, cp.last_read_at, cp.unread_count, cp.muted,
  cp.notification_pref, cp.joined_at, cp.left_at, cp.is_active
FROM conversation_participants cp
JOIN _conv_map cvm ON cvm.old_id = cp.conversation_id
WHERE cp.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'conversation_participants: % שורות', v_count;

-- ============================================================
-- 36. messages — שכבה 2 (תלוי ב-conversations, self-ref reply_to_id)
-- ============================================================
CREATE TEMP TABLE _msg_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _msg_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM messages WHERE tenant_id = v_source_tenant;

INSERT INTO messages (
  id, tenant_id, conversation_id, sender_type, sender_id, sender_name,
  message_type, content, content_html, file_url, file_name, file_size, file_mime_type,
  ref_entity_type, ref_entity_id, ref_entity_label,
  is_ai_generated, ai_confidence, ai_source_ids, ai_approved_by, ai_approved_at,
  reply_to_id, thread_count, status, edited_at, edited_content, is_deleted
)
SELECT
  mm.new_id, v_new_tenant,
  cvm.new_id,             -- FK conversation ממופה
  msg.sender_type, msg.sender_id, msg.sender_name,
  msg.message_type, msg.content, msg.content_html, msg.file_url, msg.file_name,
  msg.file_size, msg.file_mime_type,
  msg.ref_entity_type, msg.ref_entity_id, msg.ref_entity_label,
  msg.is_ai_generated, msg.ai_confidence, msg.ai_source_ids,
  em_a.new_id,            -- FK ai_approved_by ממופה (nullable)
  msg.ai_approved_at,
  mm_r.new_id,            -- FK reply_to ממופה (nullable, self-ref)
  msg.thread_count, msg.status, msg.edited_at, msg.edited_content, msg.is_deleted
FROM messages msg
JOIN _msg_map mm ON mm.old_id = msg.id
LEFT JOIN _conv_map cvm ON cvm.old_id = msg.conversation_id
LEFT JOIN _employee_map em_a ON em_a.old_id = msg.ai_approved_by
LEFT JOIN _msg_map mm_r ON mm_r.old_id = msg.reply_to_id
WHERE msg.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'messages: % שורות', v_count;

-- ============================================================
-- 37. knowledge_base — שכבה 3 (תלוי ב-messages, conversations, employees, self-ref)
-- ============================================================
CREATE TEMP TABLE _kb_map (old_id UUID, new_id UUID) ON COMMIT DROP;
INSERT INTO _kb_map (old_id, new_id)
SELECT id, gen_random_uuid() FROM knowledge_base WHERE tenant_id = v_source_tenant;

INSERT INTO knowledge_base (
  id, tenant_id, title, question, answer, answer_html, category, tags, language,
  source_type, source_message_id, source_conversation_id,
  ai_usable, ai_use_count, ai_last_used_at, ai_effectiveness, embedding_vector,
  approved_by, approved_at, status, version, previous_version_id,
  created_by, is_deleted
)
SELECT
  kbm.new_id, v_new_tenant,
  kb.title, kb.question, kb.answer, kb.answer_html, kb.category, kb.tags, kb.language,
  kb.source_type,
  mm.new_id,              -- FK message ממופה (nullable)
  cvm.new_id,             -- FK conversation ממופה (nullable)
  kb.ai_usable, kb.ai_use_count, kb.ai_last_used_at, kb.ai_effectiveness, kb.embedding_vector,
  em_a.new_id,            -- FK approved_by ממופה (nullable)
  kb.approved_at, kb.status, kb.version,
  kbm_prev.new_id,        -- FK previous_version ממופה (self-ref, nullable)
  em_c.new_id,            -- FK created_by ממופה (nullable)
  kb.is_deleted
FROM knowledge_base kb
JOIN _kb_map kbm ON kbm.old_id = kb.id
LEFT JOIN _msg_map mm ON mm.old_id = kb.source_message_id
LEFT JOIN _conv_map cvm ON cvm.old_id = kb.source_conversation_id
LEFT JOIN _employee_map em_a ON em_a.old_id = kb.approved_by
LEFT JOIN _employee_map em_c ON em_c.old_id = kb.created_by
LEFT JOIN _kb_map kbm_prev ON kbm_prev.old_id = kb.previous_version_id
WHERE kb.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'knowledge_base: % שורות', v_count;

-- ============================================================
-- 38. message_reactions — שכבה 3 (תלוי ב-messages, employees)
-- ============================================================
INSERT INTO message_reactions (
  id, tenant_id, message_id, employee_id, reaction
)
SELECT
  gen_random_uuid(), v_new_tenant,
  mm.new_id,              -- FK message ממופה
  em.new_id,              -- FK employee ממופה
  mr.reaction
FROM message_reactions mr
JOIN _msg_map mm ON mm.old_id = mr.message_id
LEFT JOIN _employee_map em ON em.old_id = mr.employee_id
WHERE mr.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'message_reactions: % שורות', v_count;

-- ============================================================
-- 39. notification_preferences — שכבה 1 (תלוי ב-employees)
-- ============================================================
INSERT INTO notification_preferences (
  id, tenant_id, employee_id, in_app, email, whatsapp, push,
  notify_direct_messages, notify_group_messages, notify_mentions,
  notify_ai_suggestions, notify_context_updates,
  quiet_hours_enabled, quiet_hours_start, quiet_hours_end, daily_digest
)
SELECT
  gen_random_uuid(), v_new_tenant,
  em.new_id,              -- FK employee ממופה
  np.in_app, np.email, np.whatsapp, np.push,
  np.notify_direct_messages, np.notify_group_messages, np.notify_mentions,
  np.notify_ai_suggestions, np.notify_context_updates,
  np.quiet_hours_enabled, np.quiet_hours_start, np.quiet_hours_end, np.daily_digest
FROM notification_preferences np
JOIN _employee_map em ON em.old_id = np.employee_id
WHERE np.tenant_id = v_source_tenant;

GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'notification_preferences: % שורות', v_count;

-- ============================================================
-- ✅ אימות — ספירת שורות לטבלאות קריטיות
-- ============================================================
RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';
RAISE NOTICE '✅ אימות — ספירת שורות (מקור vs יעד)';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';

SELECT COUNT(*) INTO v_src FROM brands WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM brands WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'brands:              source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM suppliers WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM suppliers WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'suppliers:           source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM employees WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM employees WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'employees:           source=%, demo=% (+1 test employee)', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM inventory WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM inventory WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'inventory:           source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM purchase_orders WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM purchase_orders WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'purchase_orders:     source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM goods_receipts WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM goods_receipts WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'goods_receipts:      source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM supplier_documents WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM supplier_documents WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'supplier_documents:  source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM supplier_payments WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM supplier_payments WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'supplier_payments:   source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM shipments WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM shipments WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'shipments:           source=%, demo=%', v_src, v_dst;

SELECT COUNT(*) INTO v_src FROM inventory_logs WHERE tenant_id = v_source_tenant;
SELECT COUNT(*) INTO v_dst FROM inventory_logs WHERE tenant_id = v_new_tenant;
RAISE NOTICE 'inventory_logs:      source=%, demo=%', v_src, v_dst;

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';
RAISE NOTICE '✅ שכפול הושלם בהצלחה!';
RAISE NOTICE 'דייר חדש: אופטיקה דמו (slug: demo)';
RAISE NOTICE 'עובד בדיקה: עובד בדיקה (PIN: 12345, role: ceo)';
RAISE NOTICE 'ערכת צבעים: ירוק (#059669)';
RAISE NOTICE 'ברקודים: זהים למקור (UNIQUE per tenant)';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';

END;
$clone$;

COMMIT;
