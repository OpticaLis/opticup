-- SECURITY_HOTFIX_2026_05_13 §6.3 — v_admin_* views: security_invoker + REVOKE anon SELECT
--
-- Audit Findings 2-9 (LIVE-CUSTOMER-HARM) + Finding 13 (STAFF):
-- 9 SECURITY DEFINER views granted SELECT to anon, no tenant_id filter.
-- v_admin_leads alone exposes 291 PII rows cross-tenant to any anon caller.
--
-- Fix: ALTER VIEW SET (security_invoker=true) — view runs as caller, source
-- table RLS applies. + REVOKE SELECT FROM anon. authenticated retains SELECT
-- (admin UI uses PIN-minted JWT with tenant claim).
--
-- Requires PG15+. Pre-step confirmed PG 17.6.1 on prizma-optic. GREEN.

BEGIN;

ALTER VIEW public.v_admin_leads               SET (security_invoker = true);
ALTER VIEW public.v_admin_campaigns           SET (security_invoker = true);
ALTER VIEW public.v_admin_pages               SET (security_invoker = true);
ALTER VIEW public.v_admin_media               SET (security_invoker = true);
ALTER VIEW public.v_admin_reviews             SET (security_invoker = true);
ALTER VIEW public.v_admin_components          SET (security_invoker = true);
ALTER VIEW public.v_admin_product_picker      SET (security_invoker = true);
ALTER VIEW public.v_admin_campaign_templates  SET (security_invoker = true);
ALTER VIEW public.v_admin_component_presets   SET (security_invoker = true);

REVOKE SELECT ON public.v_admin_leads              FROM anon;
REVOKE SELECT ON public.v_admin_campaigns          FROM anon;
REVOKE SELECT ON public.v_admin_pages              FROM anon;
REVOKE SELECT ON public.v_admin_media              FROM anon;
REVOKE SELECT ON public.v_admin_reviews            FROM anon;
REVOKE SELECT ON public.v_admin_components         FROM anon;
REVOKE SELECT ON public.v_admin_product_picker     FROM anon;
REVOKE SELECT ON public.v_admin_campaign_templates FROM anon;
REVOKE SELECT ON public.v_admin_component_presets  FROM anon;

COMMIT;
