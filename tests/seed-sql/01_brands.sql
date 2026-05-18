-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 01_brands.sql
-- Idempotent UPSERT of global lens_brand rows.
-- Uses (name, owner_tenant_id) UNIQUE NULLS NOT DISTINCT.

INSERT INTO lens_brand (name, owner_tenant_id, is_published, lifecycle_status, is_deleted) VALUES
  ('Color Flex', NULL, true, 'active'::text, false),
  ('Core Line', NULL, true, 'active'::text, false),
  ('Leica', NULL, true, 'active'::text, false),
  ('Rodenstock', NULL, true, 'active'::text, false),
  ('Hoya', NULL, true, 'active'::text, false),
  ('אופטימייז', NULL, true, 'active'::text, false),
  ('יומיות', NULL, true, 'active'::text, false),
  ('שמיר', NULL, true, 'active'::text, false),
  ('חודשיות', NULL, true, 'active'::text, false),
  ('צייס', NULL, true, 'active'::text, false),
  ('שנתיות', NULL, true, 'active'::text, false)
ON CONFLICT (name, owner_tenant_id) DO UPDATE SET updated_at=now();
