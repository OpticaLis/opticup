-- Migration: 2026_05_09_branches_view_up
-- SPEC: M3_BRANCHES_INFRA_AND_ASHKELON §3
-- Purpose: anon-readable view exposing only published, non-deleted
--   branches for storefront consumption (Iron Rule 13 — Views-only
--   for external reads).

CREATE OR REPLACE VIEW public.v_storefront_branches AS
  SELECT
    id, tenant_id, slug, display_order,
    name_he, name_en, name_ru,
    street_he, street_en, street_ru,
    city_he, city_en, city_ru,
    postal_code, country_code,
    region_he, region_en, region_ru,
    phone, whatsapp_e164, email,
    latitude, longitude,
    hours,
    google_business_url, facebook_url, instagram_url, waze_url,
    intro_he, intro_en, intro_ru,
    gallery,
    updated_at
  FROM public.tenant_branches
  WHERE status = 'published'
    AND is_deleted = false
  ORDER BY tenant_id, display_order, slug;

GRANT SELECT ON public.v_storefront_branches TO anon;
