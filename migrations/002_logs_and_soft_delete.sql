-- ===================================
-- 1. SOFT DELETE — הוסף לטבלת inventory
-- ===================================
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS is_deleted     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by     TEXT,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_inventory_not_deleted
  ON inventory (is_deleted) WHERE is_deleted = false;

-- ===================================
-- 2. EMPLOYEES — עובדים עם PIN לאימות
-- ===================================
CREATE TABLE IF NOT EXISTS employees (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  pin          TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'employee',
  -- ערכים: 'employee' | 'manager' | 'admin'
  branch_id    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- עובד ברירת מחדל לבדיקות (PIN: 1234)
INSERT INTO employees (name, pin, role, branch_id)
VALUES ('מנהל ראשי', '1234', 'admin', '00')
ON CONFLICT DO NOTHING;

-- ===================================
-- 3. INVENTORY_LOGS — טבלת לוגים מרכזית
-- ===================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- סוג הפעולה
  action        TEXT NOT NULL,
  -- כניסות:  entry_manual | entry_po | entry_excel | transfer_in
  -- יציאות:  sale | credit_return | manual_remove | transfer_out
  -- עריכות:  edit_qty | edit_price | edit_details | edit_barcode
  -- מחיקה:   soft_delete | restore | permanent_delete

  -- על מה הפעולה
  inventory_id  UUID REFERENCES inventory(id) ON DELETE SET NULL,
  barcode       TEXT,
  brand         TEXT,
  model         TEXT,

  -- שינוי כמות
  qty_before    INTEGER,
  qty_after     INTEGER,

  -- שינוי מחיר
  price_before  NUMERIC,
  price_after   NUMERIC,

  -- פרטי הפעולה
  reason        TEXT,
  source_ref    TEXT,
  -- הזמנת רכש / מספר מכירה / שם קובץ Excel / סניף מקור

  -- מי ומתי
  performed_by  TEXT NOT NULL DEFAULT 'system',
  branch_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_logs_inventory_id
  ON inventory_logs (inventory_id);
CREATE INDEX IF NOT EXISTS idx_logs_action
  ON inventory_logs (action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at
  ON inventory_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_branch
  ON inventory_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_logs_performed_by
  ON inventory_logs (performed_by);

-- RLS
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select" ON inventory_logs
  FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON inventory_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (true);

-- ===================================
-- 4. אמת שהכל נוצר
-- ===================================
SELECT 'inventory columns' as check_name,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'inventory'
  AND column_name IN ('is_deleted','deleted_at','deleted_by','deleted_reason')
UNION ALL
SELECT 'employees rows', COUNT(*) FROM employees
UNION ALL
SELECT 'logs indexes', COUNT(*)
FROM pg_indexes WHERE tablename = 'inventory_logs';
