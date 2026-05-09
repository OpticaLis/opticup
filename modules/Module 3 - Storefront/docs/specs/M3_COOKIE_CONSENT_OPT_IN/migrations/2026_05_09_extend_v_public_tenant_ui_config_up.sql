-- Migration: 2026_05_09_extend_v_public_tenant_ui_config_up
-- SPEC: M3_COOKIE_CONSENT_OPT_IN
-- Daniel-authorized 2026-05-09 (Level 3 DDL — view extension; SPEC §7
--   only authorized Level 2 originally; required to flow tenants.ui_config
--   to storefront per Iron Rule 13/24 Views-only read path).
-- Purpose: Add `ui_config` jsonb column to v_public_tenant so storefront
--   can read tenants.ui_config.cookie_consent (and any future ui_config
--   keys) without bypassing the view layer.
-- Preserves all existing exposed columns verbatim.

CREATE OR REPLACE VIEW public.v_public_tenant AS
  SELECT t.id,
         t.slug,
         t.name,
         t.name_en,
         t.name_ru,
         sc.enabled,
         sc.theme,
         t.logo_url,
         sc.categories,
         sc.seo,
         t.business_phone AS phone,
         t.business_email AS email,
         t.ui_config ->> 'phone_general'::text AS phone_general,
         t.ui_config ->> 'phone_catalog'::text AS phone_catalog,
         t.ui_config AS ui_config
    FROM tenants t
    JOIN storefront_config sc ON sc.tenant_id = t.id
   WHERE t.is_active = true
     AND sc.enabled = true;
