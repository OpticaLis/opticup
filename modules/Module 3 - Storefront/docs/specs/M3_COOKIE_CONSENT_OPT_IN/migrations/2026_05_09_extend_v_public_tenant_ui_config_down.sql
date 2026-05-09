-- Down migration: 2026_05_09_extend_v_public_tenant_ui_config_down
-- SPEC: M3_COOKIE_CONSENT_OPT_IN
-- Reverts the view extension to the pre-2026_05_09 state.
-- WARNING: storefront tenant.ts must drop `ui_config` from its SELECT
--   list BEFORE this runs, or queries will error.

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
         t.ui_config ->> 'phone_catalog'::text AS phone_catalog
    FROM tenants t
    JOIN storefront_config sc ON sc.tenant_id = t.id
   WHERE t.is_active = true
     AND sc.enabled = true;
