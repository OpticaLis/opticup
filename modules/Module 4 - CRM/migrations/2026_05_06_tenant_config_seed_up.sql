-- M4_HARDCODED_PRIZMA_REMOVAL — seed tenant config (forward)
-- Populates business_phone, business_address, and 5 new ui_config keys for
-- prizma + demo so the SaaS-readiness commits below can read tenant-scoped
-- values instead of hardcoded constants.
--
-- Closes Phase 1 audit G-CRIT-4 (WhatsApp), G-HIGH-3 (STOREFRONT_URL),
-- G-HIGH-6 (brand colors), G-HIGH-7 (template defaults).
--
-- Note: prizma's existing ui_config has `default_waze_url` only — preserved
-- via the `||` operator. demo's ui_config has 4 `--color-primary*` keys (a
-- separate, pre-existing namespace) — preserved.

BEGIN;

-- 2026-05-06 correction: original SPEC M4_HARDCODED_PRIZMA_REMOVAL pulled
-- a non-existent phone literal from a decorative comment in crm-helpers.js.
-- That value was never a real Prizma number. Verified-real value is
-- 053-3645404 (the support line, also stored in ui_config.support_phone_display).
-- See SPEC M4_HARDCODED_DEMO_PHONE_CLEANUP for full forensics including the
-- exact prior literal.
UPDATE public.tenants
   SET business_phone   = '053-3645404',
       business_address = 'הרצל 32, אשקלון',
       ui_config = ui_config || jsonb_build_object(
         'whatsapp_phone_e164',   '972533645404',
         'support_phone_display', '053-3645404',
         'storefront_url',        'https://prizma-optic.co.il',
         'brand', jsonb_build_object(
           'gold',       '#c9a555',
           'gold_light', '#e8da94',
           'gold_hover', '#b8943f'
         )
       )
 WHERE slug = 'prizma';

UPDATE public.tenants
   SET business_phone   = '050-000-0000',
       business_address = 'דוגמה 1, דמו',
       ui_config = ui_config || jsonb_build_object(
         'whatsapp_phone_e164',   '972500000000',
         'support_phone_display', '050-000-0000',
         'storefront_url',        'https://demo.opticalis.co.il',
         'brand', jsonb_build_object(
           'gold',       '#059669',
           'gold_light', '#d1fae5',
           'gold_hover', '#047857'
         )
       )
 WHERE slug = 'demo';

COMMIT;
