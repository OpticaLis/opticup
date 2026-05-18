-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 05_distribution_demo.sql
-- Idempotent UPSERT of demo-tenant supplier_brand_distribution rows.

WITH ins(tenant_id, supplier_name, brand_name) AS (
  VALUES
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'LEO', 'Color Flex'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'LEO', 'Core Line'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'SHALDAG', 'Leica'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'Steuer', 'Rodenstock'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'בדולח', 'Hoya'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'בדולח', 'אופטימייז'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'בדולח', 'יומיות'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לאומית', 'יומיות'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לאומית', 'שמיר'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לאומית ילדים', 'שמיר'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לפידות', 'חודשיות'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לפידות', 'יומיות'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לפידות', 'צייס'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'קופר ויז''ן', 'חודשיות'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'קופר ויז''ן', 'יומיות'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'קופר ויז''ן', 'שנתיות'),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'שמיר', 'שמיר')
)
INSERT INTO supplier_brand_distribution (tenant_id, supplier_id, brand_id, status, is_deleted)
SELECT ins.tenant_id, s.id, b.id, 'active'::text, false
FROM ins
JOIN suppliers s ON s.tenant_id = ins.tenant_id AND s.name = ins.supplier_name
JOIN lens_brand b ON b.name = ins.brand_name AND b.owner_tenant_id IS NULL
ON CONFLICT (supplier_id, brand_id, tenant_id) DO UPDATE SET updated_at=now();
