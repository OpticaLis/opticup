-- M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS 2026-05-18 IDT — hotfix.
-- The previous migration (20260518122656_m1_toggle_active_offerings_array.sql)
-- REVOKEd EXECUTE FROM PUBLIC, but Supabase's `anon` role gets EXECUTE
-- separately via the schema-level grant. Explicit REVOKE FROM anon is
-- required to match the canonical M1A pattern (already in place on all
-- Phase 1 + Phase 2 next_*_number RPCs).
--
-- get_advisors(security) flagged this as
-- `anon_security_definer_function_executable` WARN; this migration removes
-- the warn. Post-fix grants: authenticated + postgres + service_role only.

REVOKE EXECUTE ON FUNCTION public.toggle_active_offerings_array(uuid, uuid[], uuid[], boolean) FROM anon;
