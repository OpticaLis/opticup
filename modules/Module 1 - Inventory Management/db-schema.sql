-- ============================================================
-- Prizma Optics — מלאי מסגרות — Full DB Schema
-- גרסה 1.0 | מרץ 2026
-- ============================================================
-- סדר יצירה לפי תלויות (FK)
-- 1. brands  2. suppliers  3. employees
-- 4. inventory  5. inventory_images  6. inventory_logs
-- 7. goods_receipts  8. goods_receipt_items
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
  active          BOOLEAN NOT NULL DEFAULT TRUE,                 -- פעיל
  exclude_website BOOLEAN NOT NULL DEFAULT FALSE,                -- מוחרג מאתר WooCommerce
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN brands.exclude_website IS 'excluded from WooCommerce sync';
CREATE INDEX IF NOT EXISTS idx_brands_name   ON brands (name);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands (active);

-- ============================================================
-- 2. suppliers — ספקים
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,                          -- שם ספק
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
  product_type    TEXT CHECK (product_type IN ('eyeglasses', 'sunglasses', 'contact_lenses')),  -- סוג מוצר
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
  -- Soft Delete fields
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
CREATE INDEX IF NOT EXISTS idx_inv_supplier     ON inventory (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inv_brand        ON inventory (brand_id);
CREATE INDEX IF NOT EXISTS idx_inv_status       ON inventory (status);
CREATE INDEX IF NOT EXISTS idx_inv_product_type ON inventory (product_type);
CREATE INDEX IF NOT EXISTS idx_inv_quantity     ON inventory (quantity);
CREATE INDEX IF NOT EXISTS idx_inv_model_trgm   ON inventory USING GIN (model gin_trgm_ops);   -- חיפוש טקסט מטושטש
CREATE INDEX IF NOT EXISTS idx_inv_color_trgm   ON inventory USING GIN (color gin_trgm_ops);   -- חיפוש טקסט מטושטש
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
-- כל פעולה שמשנה מלאי נכתבת כאן — audit trail מלא
CREATE TABLE IF NOT EXISTS inventory_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- סוג הפעולה (17 סוגים)
  action          TEXT NOT NULL,
  -- כניסות:  entry_manual | entry_po | entry_excel | entry_receipt | transfer_in
  -- יציאות:  sale | credit_return | manual_remove | transfer_out
  -- עריכות:  edit_qty | edit_price | edit_details | edit_barcode
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
  source_ref      TEXT,                                          -- מקור: הזמנת רכש / מספר מכירה / שם קובץ / סניף

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
-- 7. goods_receipts — קבלות סחורה
-- ============================================================
-- תעודת משלוח / חשבונית שהגיעו מספק — draft → confirmed / cancelled
CREATE TABLE IF NOT EXISTS goods_receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number  TEXT NOT NULL,                                  -- מספר קבלה / תעודת משלוח
  receipt_type    TEXT NOT NULL DEFAULT 'delivery_note',          -- סוג: delivery_note | invoice | tax_invoice
  supplier_id     UUID REFERENCES suppliers(id),                 -- FK ספק
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

-- ============================================================
-- 8. goods_receipt_items — פריטי קבלת סחורה
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
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

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

-- Goods Receipts
CREATE POLICY "all_goods_receipts" ON goods_receipts FOR ALL USING (true) WITH CHECK (true);

-- Goods Receipt Items
CREATE POLICY "all_goods_receipt_items" ON goods_receipt_items FOR ALL USING (true) WITH CHECK (true);
