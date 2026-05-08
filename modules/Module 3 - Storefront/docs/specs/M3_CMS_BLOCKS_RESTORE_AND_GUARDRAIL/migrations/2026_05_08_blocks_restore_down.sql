-- Down migration: 2026_05_08_blocks_restore_down
-- SPEC: M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL
-- Purpose: revert the unwrap by re-wrapping the array back to a JSON string.
-- WARNING: This restores the BUG. Use only if a regression is detected
--   in renderer behavior that requires the buggy state to debug.
-- Note: Down migration must run BEFORE the CHECK constraint exists, OR
--   the constraint must be dropped first (see blocks_check_constraint_down).

BEGIN;

-- Re-wrap blocks as string (mirror of the up's pass2 inverse — produces
--   single-encoded). Only applies to rows last touched by this SPEC.
UPDATE public.storefront_pages
SET
  blocks = to_jsonb(blocks::text),
  updated_by = 'M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL_DOWN',
  updated_via = 'migration-rollback'
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND updated_by = 'M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL'
  AND status = 'published'
  AND jsonb_typeof(blocks) = 'array';

-- previous_blocks rollback (same logic, no updated_by tracking on prev).
UPDATE public.storefront_pages
SET previous_blocks = to_jsonb(previous_blocks::text)
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND slug IN ('/privacy/', '/deal/', '/צרו-קשר/', '/שאלות-ותשובות/', '/terms/')
  AND jsonb_typeof(previous_blocks) = 'array';

COMMIT;
