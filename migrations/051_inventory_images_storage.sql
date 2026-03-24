-- 051: Inventory Images — Storage bucket + index enhancement
-- Run via Supabase Dashboard (SQL Editor) with service_role
-- Table + RLS already exist (see db-schema.sql). This migration adds:
--   1. Composite index for tenant-scoped lookups
--   2. Storage bucket "frame-images" (must be created via Dashboard > Storage)

-- Composite index (replaces simple inventory_id index)
DROP INDEX IF EXISTS idx_inv_images_inv;
CREATE INDEX IF NOT EXISTS idx_inventory_images_lookup
  ON inventory_images(inventory_id, tenant_id);

-- NOTE: Create Storage bucket manually in Supabase Dashboard > Storage:
--   Bucket name: frame-images
--   Public: YES (images are served via public URLs)
--   File size limit: 5MB
--   Allowed MIME types: image/webp, image/jpeg, image/png
--
-- Storage RLS policies (run in SQL Editor):
-- CREATE POLICY "Authenticated users can upload" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'frame-images');
-- CREATE POLICY "Public read access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'frame-images');
-- CREATE POLICY "Authenticated users can delete own" ON storage.objects
--   FOR DELETE TO authenticated USING (bucket_id = 'frame-images');
