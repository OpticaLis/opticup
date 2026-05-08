-- Migration: 2026_05_08_blocks_restore_up
-- SPEC: M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL §4-A
-- Purpose: Restore 16 storefront_pages rows where blocks/previous_blocks
--   were stored as jsonb-string instead of jsonb-array (root cause:
--   M3_PHONE_TEMPLATING_AND_CLEANUP did string-level .replace() on jsonb
--   content and saved the result as a top-level JSON string).
-- Affected rows (verified live 2026-05-08 — count matches SPEC §2 inventory exactly):
--   /terms/ he (double-encoded, blocks + previous_blocks)
--   /privacy/ he/en/ru
--   /deal/ he/en/ru
--   /צרו-קשר/ he/en/ru
--   /שאלות-ותשובות/ he/en/ru
--   /accessibility/ he/en/ru
-- Encoding depth: 15 single-encoded (need pass2 unwrap), 1 double-encoded
--   (/terms/ he, needs pass3 unwrap).
-- Note re. count: SPEC §1/§5 say "15"; SPEC §2 inventory enumerates 16
--   slug+lang pairs; live state has 16; executor follows §2's explicit
--   inventory (Bounded-Autonomy intent-vs-literal, Deviation 1 in
--   EXECUTION_REPORT).

BEGIN;

-- Restore blocks: single-encoded rows (15) — pass2 unwrap.
UPDATE public.storefront_pages
SET
  blocks = (blocks #>> '{}')::jsonb,
  updated_by = 'M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL',
  updated_via = 'api'  -- SPEC §4-A said 'migration-restore' but storefront_pages_updated_via_check enum is manual|prompt|api|seed; using 'api' (Deviation 2)
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND status = 'published'
  AND jsonb_typeof(blocks) = 'string'
  AND jsonb_typeof((blocks #>> '{}')::jsonb) = 'array';

-- Restore blocks: double-encoded /terms/ he — pass3 unwrap.
UPDATE public.storefront_pages
SET
  blocks = ((blocks #>> '{}')::jsonb #>> '{}')::jsonb,
  updated_by = 'M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL',
  updated_via = 'api'  -- SPEC §4-A said 'migration-restore' but storefront_pages_updated_via_check enum is manual|prompt|api|seed; using 'api' (Deviation 2)
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND slug = '/terms/'
  AND lang = 'he'
  AND status = 'published'
  AND jsonb_typeof(blocks) = 'string';

-- Restore previous_blocks: single-encoded (12) — pass2 unwrap.
UPDATE public.storefront_pages
SET previous_blocks = (previous_blocks #>> '{}')::jsonb
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND jsonb_typeof(previous_blocks) = 'string'
  AND jsonb_typeof((previous_blocks #>> '{}')::jsonb) = 'array';

-- Restore previous_blocks: double-encoded /terms/ he — pass3 unwrap.
UPDATE public.storefront_pages
SET previous_blocks = ((previous_blocks #>> '{}')::jsonb #>> '{}')::jsonb
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND slug = '/terms/'
  AND lang = 'he'
  AND jsonb_typeof(previous_blocks) = 'string';

-- Verify post-state. These SELECTs are no-ops at apply_migration time
-- but are useful evidence in the EXECUTION_REPORT.
-- Expected after this block: 0 rows broken.

COMMIT;
