-- ═══════════════════════════════════════════════════════════════
-- Optic Up — Global Database Schema
-- Source of truth for all tables across all modules
-- Updated at end of each phase via Integration Ceremony
-- Last updated: 2026-03-17
--
-- Modules included:
--   Module 1: Inventory Management (Phase 0-5.9 + QA) ✅
--   Module 1.5: Shared Components (Phase 1 in progress)
--
-- Table count: 50 (46 active + 4 future stubs)
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Module 1: Inventory Management
-- ═══════════════════════════════════════════════════════════════

-- ============================================================
-- Prizma Optics — מלאי מסגרות — Full DB Schema
-- גרסה QA | מרץ 2026 | Module 1 Final Certification
-- ============================================================
-- סדר יצירה לפי תלויות (FK)
-- 1. brands  2. suppliers  3. employees
-- 4. inventory  5. inventory_images  6. inventory_logs
-- 7. purchase_orders  8. purchase_order_items
-- 9. goods_receipts  10. goods_receipt_items
-- 11. sync_log  12. pending_sales  13. watcher_heartbeat
-- 14. stock_counts  15. stock_count_items
-- ============================================================
-- Migrations applied:
--   supabase_schema.sql  — initial tables
--   002_logs_and_soft_delete.sql  — employees, inventory_logs, soft delete
--   003_goods_receipts.sql  — goods_receipts + items
--   004_v2_prep.sql  — min_stock_qty, remove contact_lenses
--   005_purchase_orders.sql  — purchase_orders + items + po_id on receipts
--   006_brand_min_stock.sql  — (duplicate of 004, idempotent)
--   007_po_items_extended.sql  — extra columns on po items
--   008_supplier_number.sql  — supplier_number UNIQUE
--   009_brands_active.sql  — brands.active
--   010_access_bridge.sql  — sync_log + pending_sales + watcher_heartbeat
--   011_inventory_logs_sale_fields.sql  — 12 Access sale columns on inventory_logs
--   012_atomic_qty_rpc.sql  — increment_inventory + decrement_inventory RPC functions
--   013_stock_count.sql  — stock_counts + stock_count_items tables + set_inventory_qty RPC
--   014_stock_count_scanned_by.sql  — scanned_by column on stock_count_items
--   015_failed_sync_storage.sql  — storage_path + errors columns on sync_log, storage policy
--   016_auth_permissions.sql  — roles, permissions, role_permissions, employee_roles, auth_sessions
--   017_tenants.sql  — tenants table + Prizma seed
--   018_add_tenant_id.sql  — tenant_id UUID column on all 20 tables + backfill
--   019_tenant_id_constraints.sql  — NOT NULL + FK constraints + 25 indexes
--   020_rls_tenant_isolation.sql  — JWT-based tenant isolation on all 20 tables
--   021_phase4a_supplier_debt_tables.sql  — 11 new tables for supplier debt tracking + seed data
--   022_phase4a_plus_patch.sql  — withholding tax, internal numbering, duplicate prevention, payment approval
--   add_pending_sales_product_columns.sql  — brand, model, size, color on pending_sales
--   add_inventory_access_exported.sql  — access_exported BOOLEAN + partial index on inventory
--   add_sync_log_export_source.sql  — 'export' added to sync_log source_ref CHECK
--   add_sync_log_handled_status.sql — 'handled' added to sync_log status CHECK
--   fix_supplier_returns_columns.sql — agent_picked_at, received_at, credited_at on supplier_returns
--   phase5a_ai_agent_tables.sql — ai_agent_config, supplier_ocr_templates, ocr_extractions, alerts, weekly_reports
--   phase5f_alert_generation.sql — generate_daily_alerts RPC + pg_cron job
--   phase5_5a_atomic_rpcs.sql — next_internal_doc_number, update_ocr_template_stats RPCs
--   phase5_5b_schema_additions.sql — file_hash, batch_id, is_historical columns + indexes
--   phase5_5c_pgcron_alerts.sql — pg_cron scheduling
--   phase5_75_communications_knowledge.sql — 6 communications tables
--   phase5_9_shipments.sql — courier_companies, shipments, shipment_items + next_box_number RPC
--   030_settings_columns.sql — business/financial/display columns on tenants
--   031_stock_count_filter_criteria.sql — filter_criteria JSONB on stock_counts
--   031_tenants_update_policy.sql — tenant_update_own RLS policy on tenants
--   032_stock_count_unknown_items.sql — status CHECK includes 'unknown', inventory_id nullable
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 0. tenants — דיירים (017)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  logo_url         TEXT,
  default_currency TEXT DEFAULT 'ILS',
  timezone         TEXT DEFAULT 'Asia/Jerusalem',
  locale           TEXT DEFAULT 'he-IL',
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  -- Business settings (030)
  business_name    TEXT,
  business_address TEXT,
  business_phone   TEXT,
  business_email   TEXT,
  business_id      TEXT,                          -- מספר עוסק מורשה / ח.פ.
  -- Financial settings (030)
  vat_rate                  NUMERIC DEFAULT 17,
  withholding_tax_default   NUMERIC DEFAULT 0,
  payment_terms_days        INTEGER DEFAULT 30,
  -- Display settings (030)
  rows_per_page    INTEGER DEFAULT 50,
  date_format      TEXT DEFAULT 'DD/MM/YYYY',
  theme            TEXT DEFAULT 'light'
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_bypass_tenants" ON tenants FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_tenants" ON tenants FOR SELECT USING (true);
-- QA phase: allow tenant to update its own row (settings page)
CREATE POLICY "tenant_update_own" ON tenants FOR UPDATE
  USING (id = current_setting('app.tenant_id')::uuid);

-- Seed Prizma as tenant #1
INSERT INTO tenants (name, slug, default_currency)
VALUES ('אופטיקה פריזמה', 'prizma', 'ILS')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 1. brands — מותגים
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,                          -- שם חברה
  brand_type      TEXT CHECK (brand_type IN ('luxury', 'brand', 'regular')),  -- סוג מותג
  default_sync    TEXT CHECK (default_sync IN ('full', 'display', 'none')),   -- סנכרון ברירת מחדל
  active          BOOLEAN NOT NULL DEFAULT TRUE,                 -- פעיל (009)
  exclude_website BOOLEAN NOT NULL DEFAULT FALSE,                -- מוחרג מאתר WooCommerce
  min_stock_qty   INTEGER DEFAULT NULL,                          -- סף מלאי מינימלי (004/006)
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN brands.exclude_website IS 'excluded from WooCommerce sync';
COMMENT ON COLUMN brands.min_stock_qty   IS 'Minimum stock threshold. When total qty across inventory falls below this, a low-stock alert is triggered.';
CREATE INDEX IF NOT EXISTS idx_brands_name   ON brands (name);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands (active);

-- ============================================================
-- 2. suppliers — ספקים
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,                          -- שם ספק
  supplier_number INTEGER UNIQUE,                                -- מספר ספק (≥ 10, gap-filled) (008)
  contact         TEXT,                                          -- איש קשר
  phone           TEXT,                                          -- טלפון
  mobile          TEXT,                                          -- נייד
  email           TEXT,                                          -- אימייל
  address         TEXT,                                          -- כתובת
  tax_id          TEXT,                                          -- ח.פ. / עוסק מורשה
  payment_terms   TEXT,                                          -- תנאי תשלום
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),       -- דירוג 1-5
  notes           TEXT,                                          -- הערות
  active          BOOLEAN NOT NULL DEFAULT TRUE,                 -- פעיל
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name   ON suppliers (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers (active);

-- ============================================================
-- 3. employees — עובדים עם PIN לאימות פעולות רגישות
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,                                 -- שם עובד
  pin             TEXT NOT NULL,                                 -- קוד PIN לאימות
  role            TEXT NOT NULL DEFAULT 'employee',              -- תפקיד: employee | manager | admin
  branch_id       TEXT,                                          -- קוד סניף
  is_active       BOOLEAN NOT NULL DEFAULT true,                 -- פעיל
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- עובד ברירת מחדל לבדיקות (PIN: 1234)
INSERT INTO employees (name, pin, role, branch_id)
VALUES ('מנהל ראשי', '1234', 'admin', '00')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. inventory — מלאי ראשי
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode         TEXT,                                          -- ברקוד BBDDDDD (2 ספרות סניף + 5 ספרות רצות)
  supplier_id     UUID REFERENCES suppliers(id),                 -- FK ספק
  brand_id        UUID REFERENCES brands(id),                    -- FK מותג
  model           TEXT,                                          -- דגם
  size            TEXT,                                          -- גודל
  bridge          TEXT,                                          -- גשר
  color           TEXT,                                          -- צבע
  temple_length   TEXT,                                          -- אורך מוט
  product_type    TEXT CHECK (product_type IN ('eyeglasses', 'sunglasses')),  -- סוג מוצר (004: removed contact_lenses)
  sell_price      NUMERIC(10,2) DEFAULT 0,                       -- מחיר מכירה
  sell_discount   NUMERIC(5,4) DEFAULT 0,                        -- הנחה מכירה (0.0000-1.0000)
  cost_price      NUMERIC(10,2) DEFAULT 0,                       -- מחיר עלות
  cost_discount   NUMERIC(5,4) DEFAULT 0,                        -- הנחה עלות
  quantity        INTEGER NOT NULL DEFAULT 0,                    -- כמות במלאי
  website_sync    TEXT CHECK (website_sync IN ('full', 'display', 'none')),  -- סנכרון אתר
  status          TEXT CHECK (status IN ('in_stock', 'sold', 'ordered', 'pending_barcode', 'pending_images')),  -- סטטוס
  brand_type      TEXT CHECK (brand_type IN ('luxury', 'brand', 'regular')),  -- סוג מותג
  origin          TEXT,                                          -- מקור (כניסת מלאי / goods_receipt / ...)
  woocommerce_id  INTEGER,                                       -- מזהה WooCommerce
  notes           TEXT,                                          -- הערות
  -- Soft Delete fields (002)
  is_deleted      BOOLEAN NOT NULL DEFAULT false,                -- האם נמחק (soft delete)
  deleted_at      TIMESTAMPTZ,                                   -- מתי נמחק
  deleted_by      TEXT,                                          -- מי מחק (שם עובד)
  deleted_reason  TEXT,                                          -- סיבת מחיקה
  -- Reverse sync (Access export)
  access_exported BOOLEAN DEFAULT false,                         -- האם יוצא ל-Access
  -- Custom fields (Module 1.5 Phase 5)
  custom_fields   JSONB DEFAULT '{}',                            -- שדות מותאמים per-tenant (no UI yet)
  -- System fields
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  branch_id       UUID,                                          -- סניף
  created_by      UUID,                                          -- יוצר
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- אינדקסים
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_barcode_unique ON inventory (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_supplier        ON inventory (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inv_brand           ON inventory (brand_id);
CREATE INDEX IF NOT EXISTS idx_inv_status          ON inventory (status);
CREATE INDEX IF NOT EXISTS idx_inv_product_type    ON inventory (product_type);
CREATE INDEX IF NOT EXISTS idx_inv_quantity        ON inventory (quantity);
CREATE INDEX IF NOT EXISTS idx_inv_model_trgm      ON inventory USING GIN (model gin_trgm_ops);   -- חיפוש טקסט מטושטש
CREATE INDEX IF NOT EXISTS idx_inv_color_trgm      ON inventory USING GIN (color gin_trgm_ops);   -- חיפוש טקסט מטושטש
CREATE INDEX IF NOT EXISTS idx_inventory_not_deleted ON inventory (is_deleted) WHERE is_deleted = false;  -- פריטים פעילים בלבד
CREATE INDEX IF NOT EXISTS idx_inventory_access_unexported ON inventory (tenant_id, access_exported) WHERE access_exported = false AND is_deleted = false;

-- ============================================================
-- 5. inventory_images — תמונות פריטי מלאי
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,  -- FK פריט מלאי
  storage_path    TEXT NOT NULL,                                 -- נתיב אחסון
  url             TEXT NOT NULL,                                 -- כתובת תמונה
  thumbnail_url   TEXT,                                          -- כתובת תמונה ממוזערת
  file_name       TEXT,                                          -- שם קובץ
  file_size       INTEGER,                                       -- גודל בבתים
  sort_order      SMALLINT DEFAULT 0,                            -- סדר מיון
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_images_inv ON inventory_images (inventory_id);

-- ============================================================
-- 6. inventory_logs — לוג פעולות (Audit Trail)
-- ============================================================
-- כל פעולה שמשנה מלאי נכתבת כאן — audit trail מלא (002)
CREATE TABLE IF NOT EXISTS inventory_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- סוג הפעולה (19 סוגים)
  action          TEXT NOT NULL,
  -- כניסות:  entry_manual | entry_po | entry_excel | entry_receipt | transfer_in
  -- יציאות:  sale | credit_return | manual_remove | transfer_out
  -- עריכות:  edit_qty | edit_price | edit_details | edit_barcode | edit_sync
  -- מחיקה:   soft_delete | restore | permanent_delete
  -- בדיקה:   test

  -- על מה הפעולה
  inventory_id    UUID REFERENCES inventory(id) ON DELETE SET NULL,  -- FK פריט (NULL אם נמחק לצמיתות)
  barcode         TEXT,                                          -- ברקוד (snapshot)
  brand           TEXT,                                          -- מותג (snapshot)
  model           TEXT,                                          -- דגם (snapshot)

  -- שינוי כמות
  qty_before      INTEGER,                                       -- כמות לפני
  qty_after       INTEGER,                                       -- כמות אחרי

  -- שינוי מחיר
  price_before    NUMERIC,                                       -- מחיר לפני
  price_after     NUMERIC,                                       -- מחיר אחרי

  -- פרטי הפעולה
  reason          TEXT,                                          -- סיבה
  source_ref      TEXT,                                          -- מקור: watcher | manual | null לפעולות רגילות

  -- Access sale fields (011)
  sale_amount     NUMERIC(10,2),                                 -- מחיר לפני הנחות
  discount        NUMERIC(10,2),                                 -- הנחה קבועה (חיילים וכו')
  discount_1      NUMERIC(10,2),                                 -- הנחה נוספת 1
  discount_2      NUMERIC(10,2),                                 -- הנחה נוספת 2
  final_amount    NUMERIC(10,2),                                 -- מחיר סופי ששולם
  coupon_code     TEXT,                                          -- קוד קופון
  campaign        TEXT,                                          -- שם מבצע
  employee_id     TEXT,                                          -- עובד שביצע מכירה (Access)
  lens_included   BOOLEAN,                                       -- עדשות כלולות
  lens_category   TEXT,                                          -- קטגוריית עדשה
  order_number    TEXT,                                          -- מספר הזמנה POS
  sync_filename   TEXT,                                          -- שם קובץ Excel מ-Access

  -- מי ומתי
  performed_by    TEXT NOT NULL DEFAULT 'system',                 -- מבצע הפעולה (שם עובד)
  branch_id       TEXT,                                          -- קוד סניף
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_inventory_id  ON inventory_logs (inventory_id);
CREATE INDEX IF NOT EXISTS idx_logs_action        ON inventory_logs (action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at    ON inventory_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_branch        ON inventory_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_logs_performed_by  ON inventory_logs (performed_by);

-- ============================================================
-- 7. purchase_orders — הזמנות רכש (005)
-- ============================================================
-- PO number format: PO-{supplier_number}-{4-digit-seq}
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number       TEXT NOT NULL UNIQUE,                          -- מספר הזמנה: PO-{sup_num}-{seq}
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),        -- FK ספק
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,            -- תאריך הזמנה
  expected_date   DATE,                                          -- תאריך משלוח צפוי
  status          TEXT NOT NULL DEFAULT 'draft'                  -- סטטוס
                  CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
  notes           TEXT,                                          -- הערות
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  branch_id       TEXT,                                          -- קוד סניף
  created_by      TEXT,                                          -- מי יצר
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status   ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_number   ON purchase_orders(po_number);

-- ============================================================
-- 8. purchase_order_items — פריטי הזמנת רכש (005 + 007)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,  -- FK הזמנה
  inventory_id    UUID REFERENCES inventory(id) ON DELETE SET NULL,                -- FK פריט מלאי (אם נוצר מברקוד)
  barcode         TEXT,                                          -- ברקוד
  brand           TEXT,                                          -- מותג (denormalized)
  model           TEXT,                                          -- דגם
  color           TEXT,                                          -- צבע
  size            TEXT,                                          -- גודל
  bridge          TEXT,                                          -- גשר (007)
  temple_length   TEXT,                                          -- אורך מוט (007)
  product_type    TEXT CHECK (product_type IN ('eyeglasses', 'sunglasses')),  -- סוג מוצר (007)
  qty_ordered     INTEGER NOT NULL DEFAULT 1,                    -- כמות מוזמנת
  qty_received    INTEGER NOT NULL DEFAULT 0,                    -- כמות שהתקבלה
  unit_cost       DECIMAL(10,2),                                 -- מחיר עלות ליחידה
  discount_pct    DECIMAL(5,2) DEFAULT 0,                        -- אחוז הנחה עלות
  sell_price      DECIMAL(10,2),                                 -- מחיר מכירה (007)
  sell_discount   DECIMAL(5,4) DEFAULT 0,                        -- הנחה מכירה (007)
  website_sync    TEXT CHECK (website_sync IN ('full', 'display', 'none')),  -- סנכרון אתר (007)
  notes           TEXT,                                          -- הערות
  tenant_id       UUID NOT NULL REFERENCES tenants(id)           -- דייר (018)
);

CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(po_id);

-- ============================================================
-- 9. goods_receipts — קבלות סחורה (003 + 005)
-- ============================================================
-- תעודת משלוח / חשבונית שהגיעו מספק — draft → confirmed / cancelled
CREATE TABLE IF NOT EXISTS goods_receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number  TEXT NOT NULL,                                  -- מספר קבלה / תעודת משלוח
  receipt_type    TEXT NOT NULL DEFAULT 'delivery_note',          -- סוג: delivery_note | invoice | tax_invoice
  supplier_id     UUID REFERENCES suppliers(id),                 -- FK ספק
  po_id           UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,  -- FK הזמנת רכש (005)
  branch_id       TEXT,                                          -- קוד סניף
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,             -- תאריך קבלה
  received_date   DATE DEFAULT CURRENT_DATE,                     -- תאריך קליטה בפועל
  total_amount    DECIMAL(10,2),                                 -- סכום כולל
  notes           TEXT,                                          -- הערות
  status          TEXT NOT NULL DEFAULT 'draft',                 -- סטטוס: draft | confirmed | cancelled
  tenant_id       UUID NOT NULL REFERENCES tenants(id),          -- דייר (018)
  created_by      TEXT,                                          -- מי יצר
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receipts_supplier ON goods_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status   ON goods_receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_po       ON goods_receipts(po_id);

-- ============================================================
-- 10. goods_receipt_items — פריטי קבלת סחורה (003)
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id      UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,  -- FK קבלה
  inventory_id    UUID REFERENCES inventory(id) ON DELETE SET NULL,               -- FK פריט מלאי (אחרי אישור)
  barcode         TEXT,                                          -- ברקוד
  brand           TEXT,                                          -- מותג (denormalized)
  model           TEXT,                                          -- דגם
  color           TEXT,                                          -- צבע
  size            TEXT,                                          -- גודל
  quantity        INTEGER NOT NULL DEFAULT 1,                    -- כמות
  unit_cost       DECIMAL(10,2),                                 -- מחיר עלות ליחידה
  sell_price      DECIMAL(10,2),                                 -- מחיר מכירה
  is_new_item     BOOLEAN NOT NULL DEFAULT false,                -- true = פריט חדש (לא היה במלאי)
  tenant_id       UUID NOT NULL REFERENCES tenants(id)           -- דייר (018)
);
CREATE INDEX IF NOT EXISTS idx_receipt_items ON goods_receipt_items(receipt_id);

-- ============================================================
-- 11. sync_log — לוג סנכרונים Access (010)
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  filename         TEXT NOT NULL,                                  -- שם קובץ Excel
  source_ref       TEXT NOT NULL CHECK (source_ref IN ('watcher', 'manual', 'export')),  -- מקור: watcher אוטומטי | manual ידני | export ייצוא
  status           TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error', 'handled')),  -- סטטוס עיבוד
  rows_total       INTEGER DEFAULT 0,                              -- סה"כ שורות
  rows_success     INTEGER DEFAULT 0,                              -- שורות שהצליחו
  rows_pending     INTEGER DEFAULT 0,                              -- שורות ממתינות (ברקוד לא נמצא)
  rows_error       INTEGER DEFAULT 0,                              -- שורות שנכשלו
  error_message    TEXT,                                           -- הודעת שגיאה כללית
  errors           JSONB,                                          -- מערך שגיאות מפורט (015)
  storage_path     TEXT,                                           -- נתיב קובץ ב-Supabase Storage (015)
  tenant_id        UUID NOT NULL REFERENCES tenants(id),           -- דייר (018)
  processed_at     TIMESTAMPTZ                                     -- זמן סיום עיבוד
);

CREATE INDEX IF NOT EXISTS idx_sync_log_created  ON sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_filename ON sync_log(filename);

-- ============================================================
-- 12. pending_sales — מכירות ממתינות לטיפול (010)
-- ============================================================
-- שורות מ-Access שהברקוד שלהן לא נמצא במלאי — ממתינות להתאמה ידנית
CREATE TABLE IF NOT EXISTS pending_sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  sync_log_id      UUID REFERENCES sync_log(id),                   -- FK לוג סנכרון
  source_ref       TEXT NOT NULL CHECK (source_ref IN ('watcher', 'manual')),
  filename         TEXT NOT NULL,                                  -- שם קובץ מקור
  barcode_received TEXT NOT NULL,                                  -- ברקוד שהתקבל מ-Access
  quantity         INTEGER NOT NULL,                               -- כמות
  action_type      TEXT NOT NULL CHECK (action_type IN ('sale', 'return')),  -- מכירה או החזרה
  transaction_date DATE NOT NULL,                                  -- תאריך עסקה
  order_number     TEXT NOT NULL,                                  -- מספר הזמנה POS
  employee_id      TEXT,                                           -- עובד מוכר
  sale_amount      NUMERIC(10,2),                                  -- מחיר לפני הנחות
  discount         NUMERIC(10,2) DEFAULT 0,                        -- הנחה קבועה
  discount_1       NUMERIC(10,2) DEFAULT 0,                        -- הנחה נוספת 1
  discount_2       NUMERIC(10,2) DEFAULT 0,                        -- הנחה נוספת 2
  final_amount     NUMERIC(10,2),                                  -- מחיר סופי
  coupon_code      TEXT,                                           -- קוד קופון
  campaign         TEXT,                                           -- שם מבצע
  lens_included    BOOLEAN DEFAULT false,                          -- עדשות כלולות
  lens_category    TEXT,                                           -- קטגוריית עדשה
  brand            TEXT,                                           -- מותג (מ-Access CSV)
  model            TEXT,                                           -- דגם (מ-Access CSV)
  size             TEXT,                                           -- גודל (מ-Access CSV)
  color            TEXT,                                           -- צבע (מ-Access CSV)
  reason           TEXT NOT NULL,                                  -- סיבת המתנה
  status           TEXT NOT NULL DEFAULT 'pending'                 -- סטטוס: pending | resolved | ignored
                   CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_at      TIMESTAMPTZ,                                    -- מתי טופל
  resolved_by      TEXT,                                           -- מי טיפל
  resolved_inventory_id UUID REFERENCES inventory(id),             -- FK פריט שהותאם
  resolution_note  TEXT,                                           -- הערת פתרון
  tenant_id        UUID NOT NULL REFERENCES tenants(id)            -- דייר (018)
);

CREATE INDEX IF NOT EXISTS idx_pending_sales_status ON pending_sales(status);
CREATE INDEX IF NOT EXISTS idx_pending_sales_order  ON pending_sales(order_number);

-- ============================================================
-- 13. watcher_heartbeat — מוניטור Watcher (010)
-- ============================================================
-- שורה אחת בלבד (id=1) — מתעדכנת כל 5 דקות ע"י ה-watcher
CREATE TABLE IF NOT EXISTS watcher_heartbeat (
  id              INTEGER PRIMARY KEY DEFAULT 1,                   -- תמיד 1
  last_beat       TIMESTAMPTZ DEFAULT now(),                       -- דופק אחרון
  watcher_version TEXT,                                            -- גרסת watcher
  host            TEXT,                                            -- שם מחשב
  tenant_id       UUID NOT NULL REFERENCES tenants(id)             -- דייר (018)
);

INSERT INTO watcher_heartbeat (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. stock_counts — ספירות מלאי (013)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_counts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_number    TEXT NOT NULL UNIQUE,                        -- SC-YYYY-NNNN (auto-generated)
  count_date      DATE NOT NULL DEFAULT CURRENT_DATE,          -- תאריך ספירה
  status          TEXT NOT NULL DEFAULT 'in_progress'          -- in_progress | completed | cancelled
                  CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  counted_by      TEXT,                                        -- מי ספר (שם עובד)
  notes           TEXT,                                        -- הערות
  total_items     INTEGER DEFAULT 0,                           -- סה"כ פריטים שנספרו
  total_diffs     INTEGER DEFAULT 0,                           -- סה"כ פערים שנמצאו
  tenant_id       UUID NOT NULL REFERENCES tenants(id),        -- דייר (018)
  branch_id       TEXT,                                        -- קוד סניף
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,                                 -- מתי הושלם
  filter_criteria JSONB DEFAULT '{}'                            -- סינון: brands, product_types, supplier_id, price range (031)
);
CREATE INDEX IF NOT EXISTS idx_sc_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_sc_date ON stock_counts(count_date DESC);

ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON stock_counts FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON stock_counts FOR ALL TO service_role USING (true);

-- ============================================================
-- 15. stock_count_items — שורות ספירה (013 + 014 + 032)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_count_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_id        UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  inventory_id    UUID REFERENCES inventory(id) ON DELETE CASCADE,  -- nullable for unknown items (032)
  barcode         TEXT,                                        -- ברקוד (snapshot)
  brand           TEXT,                                        -- מותג (snapshot)
  model           TEXT,                                        -- דגם (snapshot)
  color           TEXT,                                        -- צבע (snapshot)
  size            TEXT,                                        -- גודל (snapshot)
  expected_qty    INTEGER NOT NULL,                            -- כמות צפויה (מהמערכת)
  actual_qty      INTEGER,                                     -- כמות בפועל (מהספירה)
  difference      INTEGER GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,  -- פער
  status          TEXT NOT NULL DEFAULT 'pending'              -- pending | counted | skipped | unknown (032)
                  CHECK (status IN ('pending', 'counted', 'skipped', 'unknown')),
  notes           TEXT,                                        -- הערה לשורה
  counted_at      TIMESTAMPTZ,                                 -- מתי נספר
  scanned_by      TEXT,                                        -- מי סרק (014)
  tenant_id       UUID NOT NULL REFERENCES tenants(id)         -- דייר (018)
);
CREATE INDEX IF NOT EXISTS idx_sci_count ON stock_count_items(count_id);
CREATE INDEX IF NOT EXISTS idx_sci_inventory ON stock_count_items(inventory_id);

ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_sc_items" ON stock_count_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- RPC Functions — Atomic quantity updates (012 + 013)
-- ============================================================

-- Increment inventory quantity by delta (for receipts, manual additions)
CREATE OR REPLACE FUNCTION increment_inventory(inv_id UUID, delta INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory SET quantity = quantity + delta WHERE id = inv_id;
END;
$$;

-- Decrement inventory quantity by delta, floor at 0 (for sales, reductions)
CREATE OR REPLACE FUNCTION decrement_inventory(inv_id UUID, delta INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory
  SET quantity = GREATEST(0, quantity - delta)
  WHERE id = inv_id;
END;
$$;

-- Set inventory quantity directly (for stock count approval)
CREATE OR REPLACE FUNCTION set_inventory_qty(inv_id UUID, new_qty INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory SET quantity = new_qty WHERE id = inv_id;
END;
$$;

-- ============================================================
-- Supabase Storage — failed sync files (015)
-- ============================================================
-- Bucket: failed-sync-files (created via Supabase dashboard)
CREATE POLICY "allow_all_failed_files"
ON storage.objects FOR ALL
USING (bucket_id = 'failed-sync-files')
WITH CHECK (bucket_id = 'failed-sync-files');

-- ============================================================
-- 16. document_types — configurable document type registry (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,
  name_he         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  affects_debt    TEXT NOT NULL CHECK (affects_debt IN ('increase', 'decrease', 'none')),
  is_system       BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_doctype_tenant ON document_types(tenant_id);

-- ============================================================
-- 17. payment_methods — configurable payment method registry (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,
  name_he         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  is_system       BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_paymeth_tenant ON payment_methods(tenant_id);

-- ============================================================
-- 18. currencies — configurable currency registry (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS currencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            TEXT NOT NULL,
  name_he         TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  is_default      BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_currency_tenant ON currencies(tenant_id);

-- ============================================================
-- 19. prepaid_deals — prepaid check deals with suppliers (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS prepaid_deals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  supplier_id           UUID NOT NULL REFERENCES suppliers(id),
  deal_name             TEXT,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  total_prepaid         DECIMAL(12,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'ILS',
  total_used            DECIMAL(12,2) DEFAULT 0,
  total_remaining       DECIMAL(12,2),
  alert_threshold_pct   DECIMAL(5,2) DEFAULT 20.0,
  alert_threshold_amt   DECIMAL(12,2),
  status                TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes                 TEXT,
  created_by            UUID REFERENCES employees(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  is_deleted            BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_prepaid_tenant_supplier ON prepaid_deals(tenant_id, supplier_id);

-- ============================================================
-- 20. prepaid_checks — individual checks within a prepaid deal (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS prepaid_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  prepaid_deal_id   UUID NOT NULL REFERENCES prepaid_deals(id),
  check_number      TEXT NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  check_date        DATE NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cashed', 'bounced', 'cancelled')),
  cashed_date       DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prepaid_checks_deal ON prepaid_checks(prepaid_deal_id);

-- ============================================================
-- 21. supplier_documents — invoices, delivery notes, credit notes (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  document_type_id  UUID NOT NULL REFERENCES document_types(id),
  document_number   TEXT NOT NULL,
  document_date     DATE NOT NULL,
  due_date          DATE,
  received_date     DATE DEFAULT CURRENT_DATE,
  currency          TEXT NOT NULL DEFAULT 'ILS',
  exchange_rate     DECIMAL(10,4) DEFAULT 1.0,
  subtotal          DECIMAL(12,2) NOT NULL,
  vat_rate          DECIMAL(5,2) DEFAULT 17.0,
  vat_amount        DECIMAL(12,2) NOT NULL,
  total_amount      DECIMAL(12,2) NOT NULL,
  parent_invoice_id UUID REFERENCES supplier_documents(id),
  file_url          TEXT,
  file_name         TEXT,
  goods_receipt_id  UUID REFERENCES goods_receipts(id),
  po_id             UUID REFERENCES purchase_orders(id),
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('draft', 'open', 'partially_paid', 'paid', 'linked', 'cancelled')),
  paid_amount       DECIMAL(12,2) DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  internal_number   TEXT,                                    -- our internal reference number (022)
  is_deleted        BOOLEAN DEFAULT false,
  CONSTRAINT supplier_documents_tenant_supplier_docnum_unique
    UNIQUE(tenant_id, supplier_id, document_number)          -- duplicate prevention (022)
);
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant ON supplier_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant_supplier ON supplier_documents(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant_status ON supplier_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_supdocs_tenant_due ON supplier_documents(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_supdocs_parent ON supplier_documents(parent_invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_supdocs_internal_unique
  ON supplier_documents(tenant_id, internal_number)
  WHERE internal_number IS NOT NULL;                         -- partial unique (022)

-- ============================================================
-- 22. document_links — maps delivery notes to monthly invoices (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  parent_document_id  UUID NOT NULL REFERENCES supplier_documents(id),
  child_document_id   UUID NOT NULL REFERENCES supplier_documents(id),
  amount_on_invoice   DECIMAL(12,2),
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_document_id, child_document_id)
);
CREATE INDEX IF NOT EXISTS idx_doclinks_parent ON document_links(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_doclinks_child ON document_links(child_document_id);

-- ============================================================
-- 23. supplier_payments — payments made to suppliers (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  amount            DECIMAL(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ILS',
  exchange_rate     DECIMAL(10,4) DEFAULT 1.0,
  payment_date      DATE NOT NULL,
  payment_method    TEXT NOT NULL,
  reference_number  TEXT,
  prepaid_deal_id   UUID REFERENCES prepaid_deals(id),
  withholding_tax_rate   DECIMAL(5,2) DEFAULT 0,             -- ניכוי מס במקור % (022)
  withholding_tax_amount DECIMAL(12,2) DEFAULT 0,            -- סכום ניכוי (022)
  net_amount        DECIMAL(12,2),                           -- סכום נטו לאחר ניכוי (022)
  status            TEXT NOT NULL DEFAULT 'approved',        -- approved / pending / rejected (022)
  approved_by       UUID REFERENCES employees(id),           -- מי אישר (022)
  approved_at       TIMESTAMPTZ,                             -- מתי אושר (022)
  notes             TEXT,
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_suppay_tenant ON supplier_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppay_tenant_supplier ON supplier_payments(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_suppay_status ON supplier_payments(tenant_id, status);  -- (022)

-- ============================================================
-- 24. payment_allocations — maps payments to documents (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  payment_id        UUID NOT NULL REFERENCES supplier_payments(id),
  document_id       UUID NOT NULL REFERENCES supplier_documents(id),
  allocated_amount  DECIMAL(12,2) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payment_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_payalloc_tenant ON payment_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payalloc_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payalloc_document ON payment_allocations(document_id);

-- ============================================================
-- 25. supplier_returns — return headers (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_returns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),
  return_number       TEXT NOT NULL,
  return_type         TEXT NOT NULL CHECK (return_type IN ('agent_pickup', 'ship_to_supplier', 'pending_in_store')),
  reason              TEXT,
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'ready_to_ship', 'shipped', 'agent_picked', 'received_by_supplier', 'credited')),
  created_at          TIMESTAMPTZ DEFAULT now(),
  ready_at            TIMESTAMPTZ,
  shipped_at          TIMESTAMPTZ,
  agent_picked_at     TIMESTAMPTZ,
  received_at         TIMESTAMPTZ,
  credited_at         TIMESTAMPTZ,
  credit_note_number  TEXT,
  credit_amount       DECIMAL(12,2),
  credit_document_id  UUID REFERENCES supplier_documents(id),
  notes               TEXT,
  created_by          UUID REFERENCES employees(id),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  is_deleted          BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_supret_tenant ON supplier_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supret_tenant_supplier ON supplier_returns(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supret_tenant_status ON supplier_returns(tenant_id, status);

-- ============================================================
-- 26. supplier_return_items — items within a return (021)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_return_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  return_id       UUID NOT NULL REFERENCES supplier_returns(id),
  inventory_id    UUID NOT NULL REFERENCES inventory(id),
  barcode         TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  brand_name      TEXT,
  model           TEXT,
  color           TEXT,
  size            TEXT,
  cost_price      DECIMAL(10,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supret_items_return ON supplier_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_supret_items_inventory ON supplier_return_items(inventory_id);

-- ============================================================
-- ALTER suppliers — Phase 4a new columns (021)
-- ============================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS default_document_type TEXT DEFAULT 'invoice';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'ILS';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS has_prepaid_deal BOOLEAN DEFAULT false;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(5,2) DEFAULT 0;  -- ניכוי מס % (022)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_exempt_certificate TEXT;                   -- תעודת פטור (022)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_exempt_until DATE;                         -- פטור עד תאריך (022)

-- ============================================================
-- RLS — Phase 4a tables (021)
-- ============================================================
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON document_types FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON document_types FOR ALL TO service_role USING (true);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON payment_methods FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON payment_methods FOR ALL TO service_role USING (true);

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON currencies FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON currencies FOR ALL TO service_role USING (true);

ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_documents FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_documents FOR ALL TO service_role USING (true);

ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON document_links FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON document_links FOR ALL TO service_role USING (true);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_payments FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_payments FOR ALL TO service_role USING (true);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON payment_allocations FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON payment_allocations FOR ALL TO service_role USING (true);

ALTER TABLE prepaid_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON prepaid_deals FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON prepaid_deals FOR ALL TO service_role USING (true);

ALTER TABLE prepaid_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON prepaid_checks FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON prepaid_checks FOR ALL TO service_role USING (true);

ALTER TABLE supplier_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_returns FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_returns FOR ALL TO service_role USING (true);

ALTER TABLE supplier_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_return_items FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_return_items FOR ALL TO service_role USING (true);

-- Seed document_types
INSERT INTO document_types (tenant_id, code, name_he, name_en, affects_debt, is_system) VALUES
  ((SELECT id FROM tenants WHERE slug='prizma'), 'invoice',       'חשבונית מס',     'Tax Invoice',    'increase', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'delivery_note',  'תעודת משלוח',    'Delivery Note',  'increase', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'credit_note',    'חשבונית זיכוי',  'Credit Note',    'decrease', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'receipt',        'קבלה',           'Receipt',        'none',     true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Seed payment_methods
INSERT INTO payment_methods (tenant_id, code, name_he, name_en, is_system) VALUES
  ((SELECT id FROM tenants WHERE slug='prizma'), 'bank_transfer', 'העברה בנקאית',  'Bank Transfer', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'check',         'צ׳ק',           'Check',         true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'cash',          'מזומן',          'Cash',          true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'credit_card',   'כרטיס אשראי',   'Credit Card',   true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Seed currencies
INSERT INTO currencies (tenant_id, code, name_he, symbol, is_default) VALUES
  ((SELECT id FROM tenants WHERE slug='prizma'), 'ILS', 'שקל חדש',       '₪', true),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'USD', 'דולר אמריקאי',  '$', false),
  ((SELECT id FROM tenants WHERE slug='prizma'), 'EUR', 'אירו',          '€', false)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================
-- FUTURE TABLES (stubs — not yet used by app)
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID REFERENCES inventory(id),
  barcode         TEXT,
  quantity_sold   INTEGER NOT NULL DEFAULT 1,
  sale_price      NUMERIC(10,2),
  sale_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  id_number       TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  birth_date      DATE,
  health_fund     TEXT,
  member_number   TEXT,
  notes           TEXT,
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  prescription_date DATE,
  expiry_date     DATE,
  od_sph TEXT, od_cyl TEXT, od_axis INTEGER, od_add TEXT, od_pd NUMERIC(4,1),
  os_sph TEXT, os_cyl TEXT, os_axis INTEGER, os_add TEXT, os_pd NUMERIC(4,1),
  optometrist     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    TEXT NOT NULL UNIQUE,
  customer_id     UUID REFERENCES customers(id),
  prescription_id UUID REFERENCES prescriptions(id),
  order_type      TEXT,
  status          TEXT,
  order_date      DATE,
  expected_date   DATE,
  delivery_date   DATE,
  total_before_discount NUMERIC(10,2),
  discount_pct    NUMERIC(5,2),
  total_amount    NUMERIC(10,2),
  payment_method  TEXT,
  installments    INTEGER,
  paid            BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_suppliers_updated') THEN
    CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_brands_updated') THEN
    CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_updated') THEN
    CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_po_updated') THEN
    CREATE TRIGGER trg_po_updated BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================
-- RLS — Row Level Security (020: JWT-based tenant isolation)
-- ============================================================
-- כל טבלה מקבלת שתי פוליסות:
--   1. tenant_isolation — מבטיחה שכל שאילתה רואה רק שורות של ה-tenant מה-JWT
--   2. service_bypass — מאפשרת ל-service_role (migrations, admin) גישה מלאה

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE watcher_heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Tenant isolation pattern (applied to all 20 active tables):
--   USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)

-- brands
CREATE POLICY "tenant_isolation" ON brands FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON brands FOR ALL TO service_role USING (true);

-- suppliers
CREATE POLICY "tenant_isolation" ON suppliers FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON suppliers FOR ALL TO service_role USING (true);

-- employees
CREATE POLICY "tenant_isolation" ON employees FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON employees FOR ALL TO service_role USING (true);

-- inventory
CREATE POLICY "tenant_isolation" ON inventory FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON inventory FOR ALL TO service_role USING (true);

-- inventory_images
CREATE POLICY "tenant_isolation" ON inventory_images FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON inventory_images FOR ALL TO service_role USING (true);

-- inventory_logs
CREATE POLICY "tenant_isolation" ON inventory_logs FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON inventory_logs FOR ALL TO service_role USING (true);

-- purchase_orders
CREATE POLICY "tenant_isolation" ON purchase_orders FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON purchase_orders FOR ALL TO service_role USING (true);

-- purchase_order_items
CREATE POLICY "tenant_isolation" ON purchase_order_items FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON purchase_order_items FOR ALL TO service_role USING (true);

-- goods_receipts
CREATE POLICY "tenant_isolation" ON goods_receipts FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON goods_receipts FOR ALL TO service_role USING (true);

-- goods_receipt_items
CREATE POLICY "tenant_isolation" ON goods_receipt_items FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON goods_receipt_items FOR ALL TO service_role USING (true);

-- sync_log
CREATE POLICY "tenant_isolation" ON sync_log FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON sync_log FOR ALL TO service_role USING (true);

-- pending_sales
CREATE POLICY "tenant_isolation" ON pending_sales FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON pending_sales FOR ALL TO service_role USING (true);

-- watcher_heartbeat
CREATE POLICY "tenant_isolation" ON watcher_heartbeat FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY "service_bypass" ON watcher_heartbeat FOR ALL TO service_role USING (true);

-- sales (future)
CREATE POLICY "anon_all_sales" ON sales FOR ALL USING (true) WITH CHECK (true);

-- customers (future)
CREATE POLICY "anon_all_customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- prescriptions (future)
CREATE POLICY "anon_all_prescriptions" ON prescriptions FOR ALL USING (true) WITH CHECK (true);

-- work_orders (future)
CREATE POLICY "anon_all_work_orders" ON work_orders FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Migration 016 — Phase 3: Auth & Permissions
-- ============================================================

-- ALTER employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT '00';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- RLS policies added to employees
CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update" ON employees FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "employees_delete" ON employees FOR DELETE USING (true);

-- TODO: uncomment before production (all PINs must be 5 digits first)
-- ALTER TABLE employees ADD CONSTRAINT pin_length CHECK (LENGTH(pin) = 5);

-- roles
CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY,
  name_he     TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN DEFAULT true,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),            -- דייר (018)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_roles" ON roles FOR ALL USING (true) WITH CHECK (true);

-- permissions
CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT PRIMARY KEY,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  name_he     TEXT NOT NULL,
  description TEXT,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),            -- דייר (018)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);

-- role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted       BOOLEAN NOT NULL DEFAULT true,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),            -- דייר (018)
  PRIMARY KEY (role_id, permission_id)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_role_permissions" ON role_permissions FOR ALL USING (true) WITH CHECK (true);

-- employee_roles
CREATE TABLE IF NOT EXISTS employee_roles (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by  UUID REFERENCES employees(id),
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),            -- דייר (018)
  PRIMARY KEY (employee_id, role_id)
);
ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_employee_roles" ON employee_roles FOR ALL USING (true) WITH CHECK (true);

-- auth_sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  permissions  JSONB NOT NULL,
  role_id      TEXT NOT NULL,
  branch_id    TEXT NOT NULL DEFAULT '00',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  last_active  TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT true,
  tenant_id    UUID NOT NULL REFERENCES tenants(id)             -- דייר (018)
);
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_auth_sessions" ON auth_sessions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Phase 5a — AI Agent Tables
-- ============================================================

-- ai_agent_config (one row per tenant)
CREATE TABLE IF NOT EXISTS ai_agent_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID UNIQUE NOT NULL REFERENCES tenants(id),
  ocr_enabled             BOOLEAN DEFAULT true,
  auto_match_supplier     BOOLEAN DEFAULT true,
  auto_match_po           BOOLEAN DEFAULT true,
  confidence_threshold    DECIMAL(3,2) DEFAULT 0.80,
  alerts_enabled          BOOLEAN DEFAULT true,
  payment_reminder_days   INTEGER DEFAULT 7,
  overdue_alert           BOOLEAN DEFAULT true,
  prepaid_threshold_alert BOOLEAN DEFAULT true,
  anomaly_alert           BOOLEAN DEFAULT true,
  weekly_report_enabled   BOOLEAN DEFAULT true,
  weekly_report_day       INTEGER DEFAULT 1,
  api_key_source          TEXT DEFAULT 'platform',
  tenant_api_key          TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON ai_agent_config
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON ai_agent_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- supplier_ocr_templates (learning from corrections)
CREATE TABLE IF NOT EXISTS supplier_ocr_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  supplier_id             UUID NOT NULL REFERENCES suppliers(id),
  template_name           TEXT,
  document_type_code      TEXT,
  extraction_hints        JSONB NOT NULL DEFAULT '{}',
  times_used              INTEGER DEFAULT 0,
  times_corrected         INTEGER DEFAULT 0,
  accuracy_rate           DECIMAL(5,2),
  last_used_at            TIMESTAMPTZ,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, supplier_id, document_type_code)
);
ALTER TABLE supplier_ocr_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_ocr_templates
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_ocr_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ocr_extractions (log of every OCR scan)
CREATE TABLE IF NOT EXISTS ocr_extractions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  file_url                TEXT NOT NULL,
  file_name               TEXT,
  raw_response            JSONB NOT NULL,
  model_used              TEXT DEFAULT 'claude-sonnet-4-20250514',
  extracted_data          JSONB NOT NULL,
  confidence_score        DECIMAL(3,2),
  status                  TEXT DEFAULT 'pending',
  corrections             JSONB,
  supplier_document_id    UUID REFERENCES supplier_documents(id),
  template_id             UUID REFERENCES supplier_ocr_templates(id),
  processed_by            UUID REFERENCES employees(id),
  processing_time_ms      INTEGER,
  created_at              TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ocr_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON ocr_extractions
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON ocr_extractions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- alerts
CREATE TABLE IF NOT EXISTS alerts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  alert_type              TEXT NOT NULL,
  severity                TEXT DEFAULT 'info',
  title                   TEXT NOT NULL,
  message                 TEXT,
  data                    JSONB,
  status                  TEXT DEFAULT 'unread',
  read_at                 TIMESTAMPTZ,
  dismissed_at            TIMESTAMPTZ,
  dismissed_by            UUID REFERENCES employees(id),
  action_taken            TEXT,
  entity_type             TEXT,
  entity_id               UUID,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON alerts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- weekly_reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  week_start              DATE NOT NULL,
  week_end                DATE NOT NULL,
  report_data             JSONB NOT NULL,
  pdf_url                 TEXT,
  pdf_generated_at        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON weekly_reports
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON weekly_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Phase 5a indexes
CREATE INDEX idx_ocr_extractions_tenant ON ocr_extractions(tenant_id);
CREATE INDEX idx_ocr_extractions_status ON ocr_extractions(tenant_id, status);
CREATE INDEX idx_ocr_templates_tenant_supplier ON supplier_ocr_templates(tenant_id, supplier_id);
CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_tenant_status ON alerts(tenant_id, status);
CREATE INDEX idx_alerts_tenant_type ON alerts(tenant_id, alert_type);
CREATE INDEX idx_alerts_expires ON alerts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_weekly_reports_tenant ON weekly_reports(tenant_id);
CREATE INDEX idx_weekly_reports_period ON weekly_reports(tenant_id, week_start);

-- ============================================================
-- Phase 5.5a — Schema additions for batch operations
-- ============================================================

-- 3 new columns on supplier_documents
ALTER TABLE supplier_documents ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE supplier_documents ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE supplier_documents ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT false;

-- 3 new indexes
CREATE INDEX idx_sup_docs_file_hash ON supplier_documents(tenant_id, file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX idx_sup_docs_batch ON supplier_documents(tenant_id, batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_sup_docs_historical ON supplier_documents(tenant_id, is_historical) WHERE is_historical = true;

-- ============================================================
-- Phase 5.5a — RPC: next_internal_doc_number
-- ============================================================

CREATE OR REPLACE FUNCTION next_internal_doc_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_num INT;
  v_next TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(internal_number FROM 5) AS INT)
  ), 0) INTO v_max_num
  FROM supplier_documents
  WHERE tenant_id = p_tenant_id
    AND internal_number IS NOT NULL
    AND internal_number LIKE 'DOC-%';

  v_next := 'DOC-' || LPAD((v_max_num + 1)::TEXT, 4, '0');
  RETURN v_next;
END;
$$;

-- ============================================================
-- Phase 5.5a — RPC: update_ocr_template_stats
-- ============================================================

CREATE OR REPLACE FUNCTION update_ocr_template_stats(
  p_template_id UUID,
  p_corrections JSONB,
  p_extracted_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_corrections BOOLEAN;
BEGIN
  v_has_corrections := p_corrections IS NOT NULL AND p_corrections != '{}'::JSONB;

  UPDATE supplier_ocr_templates SET
    times_used = times_used + 1,
    times_corrected = CASE WHEN v_has_corrections THEN times_corrected + 1 ELSE times_corrected END,
    accuracy_rate = CASE
      WHEN times_used + 1 > 0
      THEN ROUND(((times_used + 1 - (CASE WHEN v_has_corrections THEN times_corrected + 1 ELSE times_corrected END))::DECIMAL / (times_used + 1)) * 100, 2)
      ELSE 100.00
    END,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_template_id;
END;
$$;

-- ============================================================
-- Phase 5.5c — pg_cron daily alerts
-- ============================================================

-- Requires pg_cron extension to be enabled in Supabase dashboard
-- SELECT cron.schedule(
--   'daily-alert-generation',
--   '0 5 * * *',  -- 05:00 UTC daily
--   $$
--   DO $body$
--   DECLARE
--     t RECORD;
--   BEGIN
--     FOR t IN SELECT id FROM tenants WHERE is_active = true LOOP
--       BEGIN
--         PERFORM set_config('app.tenant_id', t.id::TEXT, true);
--         PERFORM generate_daily_alerts(t.id);
--       EXCEPTION WHEN OTHERS THEN
--         RAISE WARNING 'Alert generation failed for tenant %: %', t.id, SQLERRM;
--       END;
--     END LOOP;
--   END;
--   $body$;
--   $$
-- );

-- ============================================================
-- Phase 5.75: Communications & Knowledge Infrastructure
-- 6 new tables (DB stubs only, zero UI)
-- Migration: phase5_75_communications_knowledge.sql
-- ============================================================

-- 37. conversations
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  channel_type      TEXT NOT NULL,
  context_type      TEXT,
  context_id        UUID,
  context_label     TEXT,
  title             TEXT,
  last_message_at   TIMESTAMPTZ,
  last_message_text TEXT,
  message_count     INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'active',
  is_pinned         BOOLEAN DEFAULT false,
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_tenant_channel ON conversations(tenant_id, channel_type);
CREATE INDEX idx_conversations_tenant_context ON conversations(tenant_id, context_type, context_id);
CREATE INDEX idx_conversations_tenant_last_msg ON conversations(tenant_id, last_message_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversations FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON conversations FOR ALL TO service_role USING (true);

-- 38. conversation_participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  conversation_id   UUID NOT NULL REFERENCES conversations(id),
  participant_type  TEXT NOT NULL,
  participant_id    UUID NOT NULL,
  participant_name  TEXT,
  role              TEXT DEFAULT 'member',
  last_read_at      TIMESTAMPTZ,
  unread_count      INTEGER DEFAULT 0,
  muted             BOOLEAN DEFAULT false,
  notification_pref TEXT DEFAULT 'all',
  joined_at         TIMESTAMPTZ DEFAULT now(),
  left_at           TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT true,
  UNIQUE(conversation_id, participant_type, participant_id)
);

CREATE INDEX idx_conv_participants_tenant ON conversation_participants(tenant_id);
CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(tenant_id, participant_type, participant_id);
CREATE INDEX idx_conv_participants_unread ON conversation_participants(tenant_id, participant_id, unread_count)
  WHERE unread_count > 0 AND is_active = true;

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversation_participants FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON conversation_participants FOR ALL TO service_role USING (true);

-- 39. messages
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  conversation_id   UUID NOT NULL REFERENCES conversations(id),
  sender_type       TEXT NOT NULL,
  sender_id         UUID,
  sender_name       TEXT,
  message_type      TEXT DEFAULT 'text',
  content           TEXT,
  content_html      TEXT,
  file_url          TEXT,
  file_name         TEXT,
  file_size         INTEGER,
  file_mime_type    TEXT,
  ref_entity_type   TEXT,
  ref_entity_id     UUID,
  ref_entity_label  TEXT,
  is_ai_generated   BOOLEAN DEFAULT false,
  ai_confidence     DECIMAL(3,2),
  ai_source_ids     UUID[],
  ai_approved_by    UUID REFERENCES employees(id),
  ai_approved_at    TIMESTAMPTZ,
  reply_to_id       UUID REFERENCES messages(id),
  thread_count      INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'sent',
  edited_at         TIMESTAMPTZ,
  edited_content    TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_tenant_sender ON messages(tenant_id, sender_type, sender_id);
CREATE INDEX idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_messages_ai ON messages(tenant_id, is_ai_generated) WHERE is_ai_generated = true;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON messages FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON messages FOR ALL TO service_role USING (true);

-- 40. knowledge_base
CREATE TABLE IF NOT EXISTS knowledge_base (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  title             TEXT NOT NULL,
  question          TEXT,
  answer            TEXT NOT NULL,
  answer_html       TEXT,
  category          TEXT,
  tags              TEXT[],
  language          TEXT DEFAULT 'he',
  source_type       TEXT DEFAULT 'manual',
  source_message_id UUID REFERENCES messages(id),
  source_conversation_id UUID REFERENCES conversations(id),
  ai_usable         BOOLEAN DEFAULT true,
  ai_use_count      INTEGER DEFAULT 0,
  ai_last_used_at   TIMESTAMPTZ,
  ai_effectiveness  DECIMAL(3,2),
  embedding_vector  TEXT,
  approved_by       UUID REFERENCES employees(id),
  approved_at       TIMESTAMPTZ,
  status            TEXT DEFAULT 'draft',
  version           INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES knowledge_base(id),
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX idx_knowledge_tenant ON knowledge_base(tenant_id);
CREATE INDEX idx_knowledge_tenant_category ON knowledge_base(tenant_id, category);
CREATE INDEX idx_knowledge_tenant_status ON knowledge_base(tenant_id, status);
CREATE INDEX idx_knowledge_tenant_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_knowledge_ai_usable ON knowledge_base(tenant_id, ai_usable)
  WHERE ai_usable = true AND status = 'approved' AND is_deleted = false;

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON knowledge_base FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON knowledge_base FOR ALL TO service_role USING (true);

-- 41. message_reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  message_id        UUID NOT NULL REFERENCES messages(id),
  employee_id       UUID NOT NULL REFERENCES employees(id),
  reaction          TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, employee_id, reaction)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON message_reactions FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON message_reactions FOR ALL TO service_role USING (true);

-- 42. notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  employee_id       UUID NOT NULL REFERENCES employees(id),
  in_app            BOOLEAN DEFAULT true,
  email             BOOLEAN DEFAULT false,
  whatsapp          BOOLEAN DEFAULT false,
  push              BOOLEAN DEFAULT false,
  notify_direct_messages    BOOLEAN DEFAULT true,
  notify_group_messages     BOOLEAN DEFAULT true,
  notify_mentions           BOOLEAN DEFAULT true,
  notify_ai_suggestions     BOOLEAN DEFAULT true,
  notify_context_updates    BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,
  daily_digest        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, employee_id)
);

CREATE INDEX idx_notif_prefs_tenant ON notification_preferences(tenant_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_preferences FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON notification_preferences FOR ALL TO service_role USING (true);

-- ============================================================
-- Phase 5.9 — Shipments & Box Management
-- ============================================================

-- ALTER tenants — shipment config columns (Phase 5.9e/5.9g)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shipment_lock_minutes INTEGER DEFAULT 30;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS box_number_prefix TEXT DEFAULT 'BOX';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS require_tracking_before_lock BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_print_on_lock BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shipment_config JSONB;

-- ============================================================
-- 43. courier_companies — חברות שליחויות (Phase 5.9a)
-- ============================================================
CREATE TABLE IF NOT EXISTS courier_companies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  name              TEXT NOT NULL,
  phone             TEXT,
  contact_person    TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_courier_tenant ON courier_companies(tenant_id);

ALTER TABLE courier_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON courier_companies FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON courier_companies FOR ALL TO service_role USING (true);

-- ============================================================
-- 44. shipments — ארגזים/משלוחים (Phase 5.9a)
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  box_number        TEXT NOT NULL,
  shipment_type     TEXT NOT NULL CHECK (shipment_type IN ('framing', 'return', 'repair', 'delivery')),
  supplier_id       UUID REFERENCES suppliers(id),
  customer_name     TEXT,
  customer_phone    TEXT,
  customer_address  TEXT,
  courier_id        UUID REFERENCES courier_companies(id),
  tracking_number   TEXT,
  packed_by         UUID REFERENCES employees(id),
  packed_at         TIMESTAMPTZ DEFAULT now(),
  locked_at         TIMESTAMPTZ,
  locked_by         UUID REFERENCES employees(id),
  items_count       INTEGER DEFAULT 0,
  total_value       DECIMAL(12,2) DEFAULT 0,
  corrects_box_id   UUID REFERENCES shipments(id),
  notes             TEXT,
  is_deleted        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, box_number)
);
CREATE INDEX IF NOT EXISTS idx_shipment_tenant ON shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tenant_type ON shipments(tenant_id, shipment_type);
CREATE INDEX IF NOT EXISTS idx_shipment_tenant_supplier ON shipments(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tenant_courier ON shipments(tenant_id, courier_id);
CREATE INDEX IF NOT EXISTS idx_shipment_packed_at ON shipments(tenant_id, packed_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipment_locked ON shipments(tenant_id, locked_at) WHERE locked_at IS NULL;

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shipments FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON shipments FOR ALL TO service_role USING (true);

-- ============================================================
-- 45. shipment_items — פריטים בארגז (Phase 5.9a)
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  shipment_id       UUID NOT NULL REFERENCES shipments(id),
  item_type         TEXT DEFAULT 'order' CHECK (item_type IN ('inventory', 'order', 'repair')),
  inventory_id      UUID REFERENCES inventory(id),
  return_id         UUID REFERENCES supplier_returns(id),
  order_number      TEXT,
  customer_name     TEXT,
  customer_number   TEXT,
  barcode           TEXT,
  brand             TEXT,
  model             TEXT,
  size              TEXT,
  color             TEXT,
  category          TEXT,
  unit_cost         DECIMAL(10,2),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipitem_tenant ON shipment_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipitem_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipitem_inventory ON shipment_items(inventory_id) WHERE inventory_id IS NOT NULL;

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shipment_items FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON shipment_items FOR ALL TO service_role USING (true);

-- ============================================================
-- RPC: next_box_number — atomic box number generation (Phase 5.9a)
-- ============================================================
CREATE OR REPLACE FUNCTION next_box_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix TEXT;
  v_max_num INTEGER;
  v_next TEXT;
BEGIN
  SELECT COALESCE(box_number_prefix, 'BOX') INTO v_prefix
    FROM tenants WHERE id = p_tenant_id;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(box_number FROM LENGTH(v_prefix) + 2) AS INTEGER)
  ), 0) INTO v_max_num
  FROM shipments
  WHERE tenant_id = p_tenant_id
    AND box_number LIKE v_prefix || '-%';

  v_next := v_prefix || '-' || LPAD((v_max_num + 1)::TEXT, 4, '0');
  RETURN v_next;
END;
$$;

-- ============================================================
-- Supabase Storage Buckets
-- ============================================================
-- failed-sync-files — failed Access sync files for manual retry
-- supplier-docs — scanned invoices and supplier document attachments
-- tenant-logos — public bucket, 2MB max, jpg/png/webp only (QA phase)

-- ============================================================
-- QA Phase: Permissions Expansion
-- ============================================================
-- 55 total permissions across 15 modules:
-- inventory (6), purchasing (4), receipts (4), stock_count (4),
-- access_sync (3), brands (3), suppliers (3), audit (3),
-- employees (4), settings (2), debt (5), ai (4), returns (3),
-- shipments (5), admin (2)
-- 36 role_permissions assignments added for 5 roles (ceo, manager, team_lead, worker, viewer)

-- ═══════════════════════════════════════════════════════════════
-- Module 1.5: Shared Components
-- ═══════════════════════════════════════════════════════════════
-- Added in Phase 1:
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ui_config JSONB DEFAULT '{}';

-- Added in Phase 3: activity_log table
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID,
  user_id UUID REFERENCES employees(id),
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'warning', 'error', 'critical')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_log
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE INDEX idx_activity_log_tenant ON activity_log(tenant_id);
CREATE INDEX idx_activity_log_entity ON activity_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_activity_log_action ON activity_log(tenant_id, action);
CREATE INDEX idx_activity_log_created ON activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_activity_log_level ON activity_log(tenant_id, level) WHERE level IN ('warning', 'error', 'critical');

-- Added in Phase 3: Atomic RPC functions
CREATE OR REPLACE FUNCTION increment_paid_amount(p_doc_id UUID, p_delta NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE supplier_documents
    SET paid_amount = COALESCE(paid_amount, 0) + p_delta,
        status = CASE WHEN COALESCE(paid_amount, 0) + p_delta >= total_amount THEN 'paid' ELSE 'partially_paid' END
    WHERE id = p_doc_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_prepaid_used(p_deal_id UUID, p_delta NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE prepaid_deals
    SET total_used = COALESCE(total_used, 0) + p_delta,
        total_remaining = total_prepaid - (COALESCE(total_used, 0) + p_delta),
        updated_at = now()
    WHERE id = p_deal_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_shipment_counters(p_shipment_id UUID, p_items_delta INTEGER, p_value_delta NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE shipments
    SET items_count = COALESCE(items_count, 0) + p_items_delta,
        total_value = COALESCE(total_value, 0) + p_value_delta
    WHERE id = p_shipment_id;
END;
$$;

-- Added in QA Phase: Multi-tenant permissions PK fix
-- roles: (id) → (id, tenant_id)
ALTER TABLE roles DROP CONSTRAINT roles_pkey;
ALTER TABLE roles ADD PRIMARY KEY (id, tenant_id);

-- permissions: (id) → (id, tenant_id)
ALTER TABLE permissions DROP CONSTRAINT permissions_pkey;
ALTER TABLE permissions ADD PRIMARY KEY (id, tenant_id);

-- role_permissions: (role_id, permission_id) → (role_id, permission_id, tenant_id)
ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_pkey;
ALTER TABLE role_permissions ADD PRIMARY KEY (role_id, permission_id, tenant_id);

-- FKs updated to composite references
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_fk
  FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_fk
  FOREIGN KEY (permission_id, tenant_id) REFERENCES permissions(id, tenant_id) ON DELETE CASCADE;
ALTER TABLE employee_roles ADD CONSTRAINT employee_roles_role_fk
  FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- Phase 8: Receipt item PO fields + Supplier opening balance
-- ═══════════════════════════════════════════════════════════════

-- 036: PO comparison fields on goods_receipt_items
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS price_decision TEXT
    CHECK (price_decision IS NULL OR price_decision IN ('po_price', 'invoice_price')),
  ADD COLUMN IF NOT EXISTS po_match_status TEXT
    CHECK (po_match_status IS NULL OR po_match_status IN ('matched', 'not_in_po', 'returned'));

-- 037: Supplier opening balance
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance_date DATE,
  ADD COLUMN IF NOT EXISTS opening_balance_notes TEXT,
  ADD COLUMN IF NOT EXISTS opening_balance_set_by UUID REFERENCES employees(id);

-- 039: return_note document type for all tenants
-- INSERT INTO document_types (tenant_id, code, name_he, name_en, affects_debt, is_system)
--   VALUES (<tenant_id>, 'return_note', 'תעודת החזרה', 'Return Note', 'decrease', true)
--   for each active tenant. ON CONFLICT DO NOTHING.

-- RLS fix: corrected RLS policies on 5 tables (roles, permissions, role_permissions,
-- employee_roles, auth_sessions) — changed from permissive anon access to proper
-- tenant_isolation using JWT current_setting('app.tenant_id').

-- ============================================================
-- 49. supplier_document_files — Multi-file support (Phase 8-QA, migration 040)
-- Owner: Module 1 (Debt sub-module)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  document_id UUID NOT NULL REFERENCES supplier_documents(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,          -- Storage path in supplier-docs bucket
  file_name TEXT,                  -- Original filename
  file_hash TEXT,                  -- SHA-256 for future dedup
  sort_order INT NOT NULL DEFAULT 0,  -- Page order
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES employees(id)
);
CREATE INDEX IF NOT EXISTS idx_sdf_document ON supplier_document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_sdf_tenant ON supplier_document_files(tenant_id);
-- RLS: JWT tenant isolation + service_role bypass
