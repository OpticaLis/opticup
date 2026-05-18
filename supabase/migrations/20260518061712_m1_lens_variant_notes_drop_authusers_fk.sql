-- M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX 2026-05-18 IDT
-- Drop FK target on auth.users. Project uses pin-auth Edge Function;
-- no rows exist in auth.users, so this FK was unreachable in production.
-- Table is empty (0 rows verified pre-flight) — zero data risk.
--
-- Rollback recipe in modules/Module 1 - Inventory Management/docs/specs/
--   M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX/SPEC.md §12

ALTER TABLE public.lens_variant_notes
  DROP CONSTRAINT lens_variant_notes_author_id_fkey;
