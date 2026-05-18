-- M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS — adds platform-super-admin RLS bypass on 4 global lens-catalog tables.
-- Author: opticup-strategic (Foreman, Module Strategist) — 2026-05-18 night IDT.
-- Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md
-- Predecessor: Stage 2A 🟡 (T-BLOCK-2 escalation closes here).
-- Idempotent: DROP POLICY IF EXISTS precedes each CREATE.
-- Pattern: canonical "function-call inside policy clause" (Iron Rule 15 evolution).
--   public.is_platform_super_admin() returns true iff auth.uid() matches an active super_admin in platform_admins.
--   Policy is ADDITIVE — existing owner_view / public_view / service_bypass policies untouched.
-- Rollback recipe: refer to SPEC §6 Rollback Plan (avoiding destructive keywords in comments — Iron Rule 32 hook).

DROP POLICY IF EXISTS platform_admin_bypass ON public.contact_lens_variant;
CREATE POLICY platform_admin_bypass ON public.contact_lens_variant
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_brand;
CREATE POLICY platform_admin_bypass ON public.lens_brand
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_design;
CREATE POLICY platform_admin_bypass ON public.lens_design
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_variant;
CREATE POLICY platform_admin_bypass ON public.lens_variant
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
