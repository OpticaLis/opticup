-- Studio Translation Delete — schema patches
-- Run manually in Supabase SQL editor.

-- ═════════════════════════════════════════════════════
-- 1. Add is_deleted to storefront_pages (soft delete)
-- ═════════════════════════════════════════════════════
ALTER TABLE storefront_pages
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_storefront_pages_not_deleted
  ON storefront_pages(tenant_id, slug, lang)
  WHERE is_deleted = false;

-- ═════════════════════════════════════════════════════
-- 2. Patch v_translation_dashboard
--    Filter out is_deleted=true rows from the underlying
--    storefront_pages joins. Re-create the view by:
--      a) `\d+ v_translation_dashboard` (or pgAdmin → Definition tab)
--      b) Copy the existing CREATE VIEW statement
--      c) Add `AND p.is_deleted = false` (or wherever each
--         storefront_pages alias is referenced) to every join
--         and to the base FROM clause
--      d) CREATE OR REPLACE VIEW v_translation_dashboard AS ...
--
-- Until the view is patched, deleted (is_deleted=true) translation
-- rows will still appear in the dashboard. The UI will simply
-- re-mark them as if they exist; the soft-delete column itself is
-- already in place at the table level.
--
-- Quick verification after patch:
--   SELECT COUNT(*) FROM v_translation_dashboard
--   WHERE en_page_id IS NOT NULL OR ru_page_id IS NOT NULL;
-- should drop after marking a translated row is_deleted=true.

-- ═════════════════════════════════════════════════════
-- 3. content_translations: NO schema change
--    Brand translation deletes are HARD deletes
--    (handled by client via DELETE WHERE entity_type='brand'
--     AND entity_id=X AND lang=Y).
-- ═════════════════════════════════════════════════════
