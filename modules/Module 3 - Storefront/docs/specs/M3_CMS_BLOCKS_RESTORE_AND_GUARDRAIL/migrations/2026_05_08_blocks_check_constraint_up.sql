-- Migration: 2026_05_08_blocks_check_constraint_up
-- SPEC: M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL §4-B + §4-C
-- Purpose: Permanent guardrail — REJECT any future write of
--   storefront_pages.blocks or .previous_blocks where the value is not
--   a JSON array (or NULL for empty drafts). Surfaces the M3-INFRA-style
--   string-write bug at DB layer rather than in production rendering.
--
-- PRECONDITION: 2026_05_08_blocks_restore_up.sql has been applied first.
--   Otherwise this migration will fail with "check constraint violations
--   exist" because of the 16 broken rows already in the table.

BEGIN;

ALTER TABLE public.storefront_pages
  ADD CONSTRAINT storefront_pages_blocks_must_be_array
  CHECK (blocks IS NULL OR jsonb_typeof(blocks) = 'array');

ALTER TABLE public.storefront_pages
  ADD CONSTRAINT storefront_pages_previous_blocks_must_be_array
  CHECK (previous_blocks IS NULL OR jsonb_typeof(previous_blocks) = 'array');

COMMIT;
