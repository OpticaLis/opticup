-- Migration: 2026_05_09_cookie_consent_seed_up
-- SPEC: M3_COOKIE_CONSENT_OPT_IN §5-A
-- Purpose: Seed tenants.ui_config.cookie_consent for prizma + demo with
--   the v1 schema from SPEC §3 (3 categories, 5 trackers mapped, all
--   non-essential off by default per Israeli 2024 Opt-In requirement).
-- L-PROJECT-002 compliance: uses jsonb_set + jsonb_build_object — never
--   stringifies and re-parses.

-- prizma
UPDATE public.tenants
   SET ui_config = jsonb_set(
         COALESCE(ui_config, '{}'::jsonb),
         '{cookie_consent}',
         jsonb_build_object(
           'enabled', true,
           'version', 'v1',
           'categories', jsonb_build_object(
             'necessary',  jsonb_build_object('always_on', true,  'label_he', 'הכרחי',     'label_en', 'Necessary', 'label_ru', 'Необходимые'),
             'analytics',  jsonb_build_object('default',   false, 'label_he', 'אנליטיקה',  'label_en', 'Analytics', 'label_ru', 'Аналитика'),
             'marketing',  jsonb_build_object('default',   false, 'label_he', 'שיווק',     'label_en', 'Marketing', 'label_ru', 'Маркетинг')
           ),
           'tracker_categories', jsonb_build_object(
             'google_analytics',   'analytics',
             'google_tag_manager', 'analytics',
             'facebook_pixel',     'marketing',
             'hotjar',             'analytics',
             'tiktok_pixel',       'marketing'
           ),
           'policy_url', '/privacy/'
         ),
         true
       )
 WHERE slug = 'prizma';

-- demo (same shape; placeholder copy)
UPDATE public.tenants
   SET ui_config = jsonb_set(
         COALESCE(ui_config, '{}'::jsonb),
         '{cookie_consent}',
         jsonb_build_object(
           'enabled', true,
           'version', 'v1',
           'categories', jsonb_build_object(
             'necessary',  jsonb_build_object('always_on', true,  'label_he', 'הכרחי',     'label_en', 'Necessary', 'label_ru', 'Необходимые'),
             'analytics',  jsonb_build_object('default',   false, 'label_he', 'אנליטיקה',  'label_en', 'Analytics', 'label_ru', 'Аналитика'),
             'marketing',  jsonb_build_object('default',   false, 'label_he', 'שיווק',     'label_en', 'Marketing', 'label_ru', 'Маркетинг')
           ),
           'tracker_categories', jsonb_build_object(
             'google_analytics',   'analytics',
             'google_tag_manager', 'analytics',
             'facebook_pixel',     'marketing',
             'hotjar',             'analytics',
             'tiktok_pixel',       'marketing'
           ),
           'policy_url', '/privacy/'
         ),
         true
       )
 WHERE slug = 'demo';
