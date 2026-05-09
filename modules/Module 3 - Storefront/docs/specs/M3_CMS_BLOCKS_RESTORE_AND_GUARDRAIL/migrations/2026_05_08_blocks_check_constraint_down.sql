-- Down migration: 2026_05_08_blocks_check_constraint_down
-- SPEC: M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL
-- Purpose: Drop the guardrail. Use only if a future SPEC has a documented
--   need to write a non-array value to blocks/previous_blocks (extremely
--   unlikely; if you find yourself writing this, reconsider).

BEGIN;

ALTER TABLE public.storefront_pages
  DROP CONSTRAINT IF EXISTS storefront_pages_blocks_must_be_array;

ALTER TABLE public.storefront_pages
  DROP CONSTRAINT IF EXISTS storefront_pages_previous_blocks_must_be_array;

COMMIT;
