-- Migration 063: Rewrite wide-open RLS policies on storefront tables
-- Fixes: M6-RLS-01 (storefront_components), M6-RLS-02 (storefront_pages), M6-RLS-03 (storefront_reviews)
-- Pattern: canonical JWT-claim tenant_isolation from pending_sales (CLAUDE.md §5 Rule 15)
-- Date: 2026-04-14

-- ── storefront_components ─────────────────────────────────────────────────────

BEGIN;

DROP POLICY IF EXISTS storefront_components_authenticated_all ON public.storefront_components;
DROP POLICY IF EXISTS storefront_components_authenticated_modify ON public.storefront_components;
DROP POLICY IF EXISTS storefront_components_authenticated_select ON public.storefront_components;

CREATE POLICY storefront_components_tenant_isolation
  ON public.storefront_components
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- DO NOT TOUCH storefront_components_service_all or storefront_components_anon_read

COMMIT;

-- ── storefront_pages ──────────────────────────────────────────────────────────

BEGIN;

DROP POLICY IF EXISTS storefront_pages_authenticated_all ON public.storefront_pages;
DROP POLICY IF EXISTS storefront_pages_authenticated_modify ON public.storefront_pages;
DROP POLICY IF EXISTS storefront_pages_authenticated_select ON public.storefront_pages;

CREATE POLICY storefront_pages_tenant_isolation
  ON public.storefront_pages
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- DO NOT TOUCH storefront_pages_service_all or storefront_pages_anon_read

COMMIT;

-- ── storefront_reviews ────────────────────────────────────────────────────────

BEGIN;

DROP POLICY IF EXISTS storefront_reviews_authenticated_all ON public.storefront_reviews;
DROP POLICY IF EXISTS storefront_reviews_authenticated_modify ON public.storefront_reviews;
DROP POLICY IF EXISTS storefront_reviews_authenticated_select ON public.storefront_reviews;

CREATE POLICY storefront_reviews_tenant_isolation
  ON public.storefront_reviews
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- DO NOT TOUCH storefront_reviews_service_all or storefront_reviews_anon_read

COMMIT;
