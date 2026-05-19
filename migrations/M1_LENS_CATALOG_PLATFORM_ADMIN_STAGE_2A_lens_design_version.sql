-- M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A — adds series-level version column to lens_design.
-- Authored by: opticup-strategic (Foreman) 2026-05-18
-- Applied via Supabase MCP `apply_migration` by opticup-executor on 2026-05-18.
-- Rollback recipe lives in modules/Module 1 - Inventory Management/backups/2026-05-18_M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/
-- (Iron Rule 32 hook is comment-aware-blind; rollback SQL kept out of inline comments.)

ALTER TABLE public.lens_design
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.lens_design.version IS
  'Series-level version counter. Increments on each material save (name / lens_type / variants set). Distinct from lens_variant.version which tracks individual variant supersession. Backfilled to 1 for all existing 145 designs.';
