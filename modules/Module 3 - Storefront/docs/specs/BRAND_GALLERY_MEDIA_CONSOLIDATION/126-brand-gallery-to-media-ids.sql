-- Migration 126: Brand Gallery → Media Library ID Consolidation
-- Executed: 2026-04-17
-- SPEC: BRAND_GALLERY_MEDIA_CONSOLIDATION
--
-- This migration was executed via Supabase MCP in real-time.
-- This file documents the exact SQL that was run, in order.

-- ═══════════════════════════════════════════════════
-- STEP 1: Backup
-- ═══════════════════════════════════════════════════

CREATE TABLE _backup_brand_gallery_20260417 AS
SELECT id, name, brand_gallery
FROM brands
WHERE brand_gallery IS NOT NULL AND is_deleted = false;
-- Result: 465 rows

-- ═══════════════════════════════════════════════════
-- STEP 2: Soft-delete all existing "models" media_library rows
-- ═══════════════════════════════════════════════════

UPDATE media_library
SET is_deleted = true
WHERE folder = 'models' AND is_deleted = false;
-- Result: 168 rows soft-deleted

-- ═══════════════════════════════════════════════════
-- STEP 3: Insert 97 unique gallery images into media_library
-- ═══════════════════════════════════════════════════
-- Extracted unique storage paths from all brands' brand_gallery arrays,
-- inserted each with folder='models', tags=['brand-gallery', brand_id],
-- uploaded_by='migration-20260417'.
-- Each brand's gallery images were inserted with that brand's ID in tags.
-- Result: 97 rows inserted

-- (Full INSERT statements omitted for brevity — each was a per-brand batch
-- using the pattern:)
--
-- INSERT INTO media_library (tenant_id, filename, original_filename,
--   storage_path, mime_type, folder, tags, uploaded_by)
-- SELECT
--   b.tenant_id,
--   split_part(path.val, '/', -1),
--   split_part(path.val, '/', -1),
--   path.val,
--   'image/webp',
--   'models',
--   jsonb_build_array('brand-gallery', b.id::text),
--   'migration-20260417'
-- FROM brands b,
--   jsonb_array_elements_text(b.brand_gallery) AS path(val)
-- WHERE b.brand_gallery IS NOT NULL
--   AND jsonb_array_length(b.brand_gallery) > 0
--   AND b.is_deleted = false;

-- ═══════════════════════════════════════════════════
-- STEP 4: Convert brand_gallery from paths to UUIDs
-- ═══════════════════════════════════════════════════
-- For each brand with a non-empty gallery, replaced the JSONB array
-- of storage paths with an array of media_library UUIDs by matching
-- on storage_path.

-- Per-brand UPDATE pattern:
-- UPDATE brands SET brand_gallery = (
--   SELECT jsonb_agg(ml.id::text ORDER BY idx)
--   FROM jsonb_array_elements_text(brand_gallery) WITH ORDINALITY AS arr(val, idx)
--   JOIN media_library ml ON ml.storage_path = arr.val AND ml.is_deleted = false
-- ) WHERE id = '{brand_id}';
-- Result: 25 brands updated

-- ═══════════════════════════════════════════════════
-- STEP 5: Recreate v_storefront_brand_page with UUID resolution
-- ═══════════════════════════════════════════════════
-- brand_gallery subquery resolves UUIDs to storage_paths via JOIN:
--
-- (SELECT jsonb_agg(ml.storage_path ORDER BY idx)
--  FROM jsonb_array_elements_text(b.brand_gallery) WITH ORDINALITY AS arr(val, idx)
--  LEFT JOIN media_library ml ON ml.id = arr.val::uuid AND ml.is_deleted = false
--  WHERE ml.storage_path IS NOT NULL
-- ) AS brand_gallery

-- ═══════════════════════════════════════════════════
-- STEP 6: Recreate v_storefront_brands with UUID resolution
-- ═══════════════════════════════════════════════════
-- Same subquery pattern as v_storefront_brand_page, preserving
-- the existing complex JOIN + GROUP BY + HAVING for product_count.

-- ═══════════════════════════════════════════════════
-- ROLLBACK (if needed)
-- ═══════════════════════════════════════════════════
-- Restore brand_gallery paths:
-- UPDATE brands SET brand_gallery = b.brand_gallery
-- FROM _backup_brand_gallery_20260417 b WHERE brands.id = b.id;
--
-- Soft-delete migrated media:
-- UPDATE media_library SET is_deleted = true
-- WHERE uploaded_by = 'migration-20260417' AND folder = 'models';
--
-- Recreate views with original definitions (from backup).
