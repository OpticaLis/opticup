-- M3_PHONE_TEMPLATING_AND_CLEANUP — UP migration
-- Date: 2026-05-07
-- Author: opticup-executor (Site Overseer Mode B)
-- Closes: REC-SITE-002 (HANDOFF 2026-05-07)
--
-- This migration is idempotent and was applied to production
-- (Supabase project tsxrrxzmdxaenlvocyit) at SPEC-execution time on 2026-05-07.
-- Verification queries are at the bottom; re-running them must yield the
-- expected output to confirm post-migration state.

BEGIN;

-- Step A: seed two new ui_config keys for prizma + demo.
-- phone_general = site-wide contact channel (footer, top-bar, contact, terms, FAQ, etc.)
-- phone_catalog = product-channel (PDPs). Today both = same number;
-- Daniel can later UPDATE phone_catalog to a branch number with no code change.
UPDATE public.tenants
   SET ui_config = ui_config || jsonb_build_object(
     'phone_general', '053-364-5404',
     'phone_catalog', '053-364-5404'
   )
 WHERE slug = 'prizma';

UPDATE public.tenants
   SET ui_config = ui_config || jsonb_build_object(
     'phone_general', '050-000-0000',
     'phone_catalog', '050-000-0000'
   )
 WHERE slug = 'demo';

-- Step B: extend v_public_tenant view with two new columns.
-- Additive change: existing consumers of v_public_tenant continue to work
-- (the SELECT lists are explicit per consumer; new columns are ignored unless
-- explicitly selected). The new columns surface ui_config.phone_general and
-- ui_config.phone_catalog as nullable text.
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
       (t.ui_config ->> 'phone_general') AS phone_general,
       (t.ui_config ->> 'phone_catalog') AS phone_catalog
  FROM public.tenants t
  JOIN public.storefront_config sc ON sc.tenant_id = t.id
 WHERE t.is_active = true AND sc.enabled = true;

-- Step C: bulk-substitute literal phone numbers in published storefront_pages
-- for prizma. Replace three known formats with the {{phone_general}} token.
-- Tenant-scoped, published-only — must affect exactly 21 rows for prizma.
WITH targets AS (
  SELECT id FROM public.storefront_pages
   WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
     AND status = 'published'
     AND (blocks::text LIKE '%053-434-7265%'
          OR blocks::text LIKE '%0534347265%'
          OR blocks::text LIKE '%053-4347265%')
)
UPDATE public.storefront_pages p
   SET blocks = REPLACE(REPLACE(REPLACE(blocks::text,
                  '053-434-7265', '{{phone_general}}'),
                  '0534347265',   '{{phone_general}}'),
                  '053-4347265',  '{{phone_general}}')::jsonb,
       updated_at = now(),
       updated_by = 'M3_PHONE_TEMPLATING_AND_CLEANUP',
       updated_via = 'api'
  FROM targets
 WHERE p.id = targets.id;

COMMIT;

-- Verification (read-only):
-- Expected:
--   has_phone_general=true, has_phone_catalog=true for prizma
--   phone_general='053-364-5404', phone_catalog='053-364-5404' for prizma
--   phone_general='050-000-0000', phone_catalog='050-000-0000' for demo
--   v_public_tenant exposes the new columns
--   0 storefront_pages rows still contain 053-434-7265 / 0534347265 / 053-4347265
--   21 storefront_pages rows now contain {{phone_general}}
--
-- SELECT slug, ui_config->>'phone_general' AS pg, ui_config->>'phone_catalog' AS pc
--   FROM public.tenants WHERE slug IN ('prizma','demo') ORDER BY slug;
--
-- SELECT slug, phone, phone_general, phone_catalog
--   FROM public.v_public_tenant WHERE slug IN ('prizma','demo') ORDER BY slug;
--
-- SELECT count(*) FROM public.storefront_pages
--   WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
--     AND status='published'
--     AND (blocks::text LIKE '%053-434-7265%'
--          OR blocks::text LIKE '%0534347265%'
--          OR blocks::text LIKE '%053-4347265%');
-- -> 0
--
-- SELECT count(*) FROM public.storefront_pages
--   WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
--     AND status='published'
--     AND blocks::text LIKE '%{{phone_general}}%';
-- -> 21
