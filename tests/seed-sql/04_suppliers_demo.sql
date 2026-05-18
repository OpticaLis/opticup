-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 04_suppliers_demo.sql
-- Idempotent UPSERT of demo-tenant supplier rows.
-- tenant_id = 8d8cfa7e-ef58-49af-9702-a862d459cccb

INSERT INTO suppliers (id, tenant_id, name, active, default_document_type, default_currency, payment_terms_days, has_prepaid_deal, withholding_tax_rate, created_at, updated_at) VALUES
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'LEO', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'SHALDAG', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'Steuer', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'בדולח', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לאומית', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לאומית ילדים', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'לפידות', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'קופר ויז''ן', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now()),
  (uuid_generate_v4(), '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid, 'שמיר', true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now())
ON CONFLICT (name, tenant_id) DO UPDATE SET updated_at=now();
