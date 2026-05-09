-- Down migration: 2026_05_09_branches_schema_down
-- WARNING: drops the entire tenant_branches table including all
-- branch data. The view (2026_05_09_branches_view) must be dropped
-- BEFORE this runs (down migrations are applied in reverse order
-- of up migrations).

DROP TABLE IF EXISTS public.tenant_branches CASCADE;
