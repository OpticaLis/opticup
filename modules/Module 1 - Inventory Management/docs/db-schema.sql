-- ============================================================
-- Prizma Optics — מלאי מסגרות — Full DB Schema
-- גרסה 2.0 | מרץ 2026
-- ============================================================
-- סדר יצירה לפי תלויות (FK)
-- 1. brands  2. suppliers  3. employees
-- 4. inventory  5. inventory_images  6. inventory_logs
-- 7. purchase_orders  8. purchase_order_items
-- 9. goods_receipts  10. goods_receipt_items
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
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
  -- System fields
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
  notes           TEXT                                           -- הערות
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
  is_new_item     BOOLEAN NOT NULL DEFAULT false                 -- true = פריט חדש (לא היה במלאי)
);
CREATE INDEX IF NOT EXISTS idx_receipt_items ON goods_receipt_items(receipt_id);

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
-- RLS — Row Level Security
-- ============================================================
-- כרגע: גישה מלאה (anon key, single-user)
-- עתיד: חיזוק עם Supabase Auth + role-based policies

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
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Brands
CREATE POLICY "anon_all_brands" ON brands FOR ALL USING (true) WITH CHECK (true);

-- Suppliers
CREATE POLICY "anon_all_suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- Employees (SELECT only for PIN verification)
CREATE POLICY "employees_select" ON employees FOR SELECT USING (true);

-- Inventory
CREATE POLICY "anon_all_inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

-- Inventory Images
CREATE POLICY "anon_all_inv_images" ON inventory_images FOR ALL USING (true) WITH CHECK (true);

-- Inventory Logs (SELECT + INSERT + DELETE + UPDATE)
CREATE POLICY "logs_select" ON inventory_logs FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON inventory_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "logs_delete" ON inventory_logs FOR DELETE USING (true);
CREATE POLICY "logs_update" ON inventory_logs FOR UPDATE USING (true) WITH CHECK (true);

-- Purchase Orders
CREATE POLICY "all_purchase_orders" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);

-- Purchase Order Items
CREATE POLICY "all_po_items" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);

-- Goods Receipts
CREATE POLICY "all_goods_receipts" ON goods_receipts FOR ALL USING (true) WITH CHECK (true);

-- Goods Receipt Items
CREATE POLICY "all_goods_receipt_items" ON goods_receipt_items FOR ALL USING (true) WITH CHECK (true);

-- Sales (future)
CREATE POLICY "anon_all_sales" ON sales FOR ALL USING (true) WITH CHECK (true);

-- Customers (future)
CREATE POLICY "anon_all_customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Prescriptions (future)
CREATE POLICY "anon_all_prescriptions" ON prescriptions FOR ALL USING (true) WITH CHECK (true);

-- Work Orders (future)
CREATE POLICY "anon_all_work_orders" ON work_orders FOR ALL USING (true) WITH CHECK (true);
