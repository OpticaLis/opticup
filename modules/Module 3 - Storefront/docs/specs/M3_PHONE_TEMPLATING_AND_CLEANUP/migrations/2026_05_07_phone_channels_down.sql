-- M3_PHONE_TEMPLATING_AND_CLEANUP — DOWN migration (rollback)
-- Date: 2026-05-07
--
-- WARNING: this rollback restores the *defunct* phone literal 053-434-7265
-- in 21 CMS rows. Use only if the new architecture must be reversed for an
-- emergency reason. The customer-visible damage that triggered REC-SITE-002
-- will RETURN if this rollback runs in production. Confirm with Daniel
-- before applying.

BEGIN;

-- Step A: drop the new ui_config keys from prizma + demo.
UPDATE public.tenants
   SET ui_config = ui_config - 'phone_general' - 'phone_catalog'
 WHERE slug IN ('prizma', 'demo');

-- Step B: revert v_public_tenant to the pre-migration definition.
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
       t.business_email AS email
  FROM public.tenants t
  JOIN public.storefront_config sc ON sc.tenant_id = t.id
 WHERE t.is_active = true AND sc.enabled = true;

-- Step C: revert {{phone_general}} tokens back to '053-434-7265' literal in
-- the 21 CMS rows. NOTE: this picks the canonical-format variant for all
-- restored rows; the rollback does NOT preserve the original variant mix
-- (some rows previously had 0534347265 or 053-4347265). Visually identical
-- to a customer (all three formats render the same digits).
WITH targets AS (
  SELECT id FROM public.storefront_pages
   WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
     AND status = 'published'
     AND blocks::text LIKE '%{{phone_general}}%'
)
UPDATE public.storefront_pages p
   SET blocks = REPLACE(blocks::text, '{{phone_general}}', '053-434-7265')::jsonb,
       updated_at = now(),
       updated_by = 'M3_PHONE_TEMPLATING_AND_CLEANUP_ROLLBACK',
       updated_via = 'api'
  FROM targets
 WHERE p.id = targets.id;

COMMIT;
