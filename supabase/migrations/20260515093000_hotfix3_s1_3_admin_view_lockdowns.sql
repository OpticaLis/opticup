-- SECURITY_HOTFIX_3 §1.3 — Admin view lockdowns (5 views)
-- Per modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/SPEC.md
--
-- Action per view: REVOKE SELECT FROM anon + ALTER VIEW SET (security_invoker=on)
-- Closes F-CRIT-2 for 5 admin-cohort views (v_ai_content, v_content_translations,
-- v_tenant_i18n_overrides, v_translation_dashboard, v_crm_event_stats).
--
-- These views were anon-readable AND security_definer (the F-CRIT-2 vulnerability).
-- All 5 are admin/translator/CRM workflow tools — anon should never read them.
-- authenticated + service_role retain SELECT (admin UI still works).
-- Rollback: GRANT SELECT TO anon + ALTER VIEW SET (security_invoker=off) per view.

BEGIN;

-- v_ai_content (admin translation review — 0 storefront callers)
REVOKE SELECT ON public.v_ai_content FROM anon;
ALTER VIEW public.v_ai_content SET (security_invoker=on);

-- v_content_translations (exposes draft status — admin/translator workflow)
REVOKE SELECT ON public.v_content_translations FROM anon;
ALTER VIEW public.v_content_translations SET (security_invoker=on);

-- v_tenant_i18n_overrides (admin i18n tooling)
REVOKE SELECT ON public.v_tenant_i18n_overrides FROM anon;
ALTER VIEW public.v_tenant_i18n_overrides SET (security_invoker=on);

-- v_translation_dashboard (admin translation status dashboard)
REVOKE SELECT ON public.v_translation_dashboard FROM anon;
ALTER VIEW public.v_translation_dashboard SET (security_invoker=on);

-- v_crm_event_stats (admin/CRM event analytics)
REVOKE SELECT ON public.v_crm_event_stats FROM anon;
ALTER VIEW public.v_crm_event_stats SET (security_invoker=on);

COMMIT;
