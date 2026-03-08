-- ============================================================
-- Prizma Optics — Supabase Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- TABLE: suppliers
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL UNIQUE,
  contact       TEXT,
  phone         TEXT,
  mobile        TEXT,
  email         TEXT,
  address       TEXT,
  tax_id        TEXT,
  payment_terms TEXT,
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes         TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  branch_id     UUID,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers (active);

-- ============================================================
-- TABLE: brands
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL UNIQUE,
  brand_type    TEXT CHECK (brand_type IN ('luxury', 'brand', 'regular')),
  default_sync  TEXT CHECK (default_sync IN ('full', 'display', 'none')),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  exclude_website BOOLEAN NOT NULL DEFAULT FALSE,
  branch_id     UUID,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN brands.exclude_website IS 'excluded from WooCommerce sync';
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands (name);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands (active);

-- ============================================================
-- TABLE: inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode         TEXT,
  supplier_id     UUID REFERENCES suppliers(id),
  brand_id        UUID REFERENCES brands(id),
  model           TEXT,
  size            TEXT,
  bridge          TEXT,
  color           TEXT,
  temple_length   TEXT,
  product_type    TEXT CHECK (product_type IN ('eyeglasses', 'sunglasses', 'contact_lenses')),
  sell_price      NUMERIC(10,2) DEFAULT 0,
  sell_discount   NUMERIC(5,4) DEFAULT 0,
  cost_price      NUMERIC(10,2) DEFAULT 0,
  cost_discount   NUMERIC(5,4) DEFAULT 0,
  quantity        INTEGER NOT NULL DEFAULT 0,
  website_sync    TEXT CHECK (website_sync IN ('full', 'display', 'none')),
  status          TEXT CHECK (status IN ('in_stock', 'sold', 'ordered', 'pending_barcode', 'pending_images')),
  brand_type      TEXT CHECK (brand_type IN ('luxury', 'brand', 'regular')),
  origin          TEXT,
  woocommerce_id  INTEGER,
  notes           TEXT,
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_barcode_unique ON inventory (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_supplier ON inventory (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inv_brand ON inventory (brand_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON inventory (status);
CREATE INDEX IF NOT EXISTS idx_inv_product_type ON inventory (product_type);
CREATE INDEX IF NOT EXISTS idx_inv_quantity ON inventory (quantity);
CREATE INDEX IF NOT EXISTS idx_inv_model_trgm ON inventory USING GIN (model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inv_color_trgm ON inventory USING GIN (color gin_trgm_ops);

-- ============================================================
-- TABLE: inventory_images
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id  UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name     TEXT,
  file_size     INTEGER,
  sort_order    SMALLINT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_images_inv ON inventory_images (inventory_id);

-- ============================================================
-- TABLE: purchase_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    TEXT NOT NULL UNIQUE,
  supplier_id     UUID REFERENCES suppliers(id),
  order_date      DATE,
  expected_date   DATE,
  status          TEXT CHECK (status IN ('draft', 'ordered', 'partial', 'complete')),
  notes           TEXT,
  branch_id       UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders (supplier_id);

-- ============================================================
-- TABLE: purchase_order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  order_number      TEXT,
  supplier_name     TEXT,
  brand_name        TEXT,
  model             TEXT,
  size              TEXT,
  bridge            TEXT,
  color             TEXT,
  temple_length     TEXT,
  product_type      TEXT,
  cost_price        NUMERIC(10,2) DEFAULT 0,
  cost_discount     NUMERIC(5,4) DEFAULT 0,
  sell_price        NUMERIC(10,2) DEFAULT 0,
  sell_discount     NUMERIC(5,4) DEFAULT 0,
  website_sync      TEXT,
  item_status       TEXT CHECK (item_status IN ('pending', 'transferred', 'not_supplied')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items (purchase_order_id);

-- ============================================================
-- TABLE: sales
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id  UUID REFERENCES inventory(id),
  barcode       TEXT,
  quantity_sold INTEGER NOT NULL DEFAULT 1,
  sale_price    NUMERIC(10,2),
  sale_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  branch_id     UUID,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUTURE TABLES (stubs)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     TEXT NOT NULL,
  id_number     TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  city          TEXT,
  birth_date    DATE,
  health_fund   TEXT,
  member_number TEXT,
  notes         TEXT,
  branch_id     UUID,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_poi_updated') THEN
    CREATE TRIGGER trg_poi_updated BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================
-- DISABLE RLS for now (single-user app with anon key)
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Allow anon access to all tables (will tighten later with auth)
CREATE POLICY "anon_all_suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_brands" ON brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_inv_images" ON inventory_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_po" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_poi" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_prescriptions" ON prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_work_orders" ON work_orders FOR ALL USING (true) WITH CHECK (true);
