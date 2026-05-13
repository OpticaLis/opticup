-- SECURITY_HOTFIX_2026_05_13 §6.3 ROLLBACK
--
-- Restores prior state: security_invoker off (SECURITY DEFINER behavior),
-- anon SELECT restored. Re-introduces the cross-tenant PII exposure.
-- Use only if admin UI breaks irretrievably due to authenticated-role gap.

BEGIN;

ALTER VIEW public.v_admin_leads               RESET (security_invoker);
ALTER VIEW public.v_admin_campaigns           RESET (security_invoker);
ALTER VIEW public.v_admin_pages               RESET (security_invoker);
ALTER VIEW public.v_admin_media               RESET (security_invoker);
ALTER VIEW public.v_admin_reviews             RESET (security_invoker);
ALTER VIEW public.v_admin_components          RESET (security_invoker);
ALTER VIEW public.v_admin_product_picker      RESET (security_invoker);
ALTER VIEW public.v_admin_campaign_templates  RESET (security_invoker);
ALTER VIEW public.v_admin_component_presets   RESET (security_invoker);

GRANT SELECT ON public.v_admin_leads              TO anon;
GRANT SELECT ON public.v_admin_campaigns          TO anon;
GRANT SELECT ON public.v_admin_pages              TO anon;
GRANT SELECT ON public.v_admin_media              TO anon;
GRANT SELECT ON public.v_admin_reviews            TO anon;
GRANT SELECT ON public.v_admin_components         TO anon;
GRANT SELECT ON public.v_admin_product_picker     TO anon;
GRANT SELECT ON public.v_admin_campaign_templates TO anon;
GRANT SELECT ON public.v_admin_component_presets  TO anon;

COMMIT;
