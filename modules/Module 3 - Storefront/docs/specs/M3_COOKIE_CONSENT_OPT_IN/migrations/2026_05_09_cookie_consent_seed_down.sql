-- Down migration: 2026_05_09_cookie_consent_seed_down
-- SPEC: M3_COOKIE_CONSENT_OPT_IN
-- Removes the cookie_consent key from prizma + demo ui_config.
-- WARNING: With banner code deployed, removing this seed will trip the
--   `enabled=false` default and the banner won't render. Cookies are
--   not deleted from clients — they remain until users clear them.

UPDATE public.tenants
   SET ui_config = ui_config - 'cookie_consent'
 WHERE slug IN ('prizma', 'demo');
