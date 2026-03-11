ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS supplier_number INTEGER UNIQUE;

-- Auto-assign numbers 10, 11, 12... to existing suppliers by created_at order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 + 10 AS num
  FROM suppliers
  WHERE supplier_number IS NULL
)
UPDATE suppliers s
SET supplier_number = r.num
FROM ranked r
WHERE s.id = r.id;
