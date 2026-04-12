-- ==========================================================================
-- Manual Action #1: Complete RLS Canonical Fixes — 11 Tables
-- ==========================================================================
-- Run ONCE in Supabase Dashboard SQL Editor as superuser
-- Date prepared: 2026-04-12
-- Prepared by: Main Strategic (Cowork) with live DB verification
--
-- Coverage:
--   §1.1 — 4 pre-multitenancy tables (no tenant_id): retrofit + RLS
--   §1.2 — 3 auth.uid() tables: replace broken policies
--   §1.3 — 4 legacy session-var tables: replace with JWT canonical pattern
--
-- All policy names verified against live DB on 2026-04-12.
-- All row counts verified. Atomic transaction — any failure = full rollback.
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- PART 1: Pre-multitenancy retrofit (4 empty tables, no tenant_id)
-- Verified empty: customers=0, prescriptions=0, sales=0, work_orders=0
-- ==========================================================================

-- ---- customers ----
ALTER TABLE public.customers
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON public.customers (tenant_id);

DROP POLICY IF EXISTS "anon_all_customers" ON public.customers;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.customers
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.customers
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- prescriptions ----
ALTER TABLE public.prescriptions
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS prescriptions_tenant_id_idx ON public.prescriptions (tenant_id);

DROP POLICY IF EXISTS "anon_all_prescriptions" ON public.prescriptions;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.prescriptions
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.prescriptions
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- sales ----
ALTER TABLE public.sales
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS sales_tenant_id_idx ON public.sales (tenant_id);

DROP POLICY IF EXISTS "anon_all_sales" ON public.sales;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.sales
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.sales
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- work_orders ----
ALTER TABLE public.work_orders
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS work_orders_tenant_id_idx ON public.work_orders (tenant_id);

-- Iron Rule 18 fix: UNIQUE must be tenant-scoped
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_order_number_key;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_order_number_tenant_id_key
  UNIQUE (order_number, tenant_id);

DROP POLICY IF EXISTS "anon_all_work_orders" ON public.work_orders;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.work_orders
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.work_orders
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ==========================================================================
-- PART 2: auth.uid() policy fixes (3 tables, already have tenant_id)
-- ==========================================================================

-- ---- brand_content_log ----
DROP POLICY IF EXISTS "Tenant brand content log" ON public.brand_content_log;
ALTER TABLE public.brand_content_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_content_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.brand_content_log
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.brand_content_log
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- storefront_component_presets ----
-- Two broken policies: RLS-08 leak (IS NOT NULL) + auth.uid()
DROP POLICY IF EXISTS "Tenant can manage own presets" ON public.storefront_component_presets;
DROP POLICY IF EXISTS "Tenant or global presets visible" ON public.storefront_component_presets;
ALTER TABLE public.storefront_component_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_component_presets FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.storefront_component_presets
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.storefront_component_presets
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- storefront_page_tags ----
DROP POLICY IF EXISTS "Tenant page tags" ON public.storefront_page_tags;
ALTER TABLE public.storefront_page_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_page_tags FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.storefront_page_tags
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.storefront_page_tags
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ==========================================================================
-- PART 3: Legacy session-var pattern fixes (4 tables, already have tenant_id)
-- ==========================================================================

-- ---- media_library (32 rows, all Prizma) ----
DROP POLICY IF EXISTS "media_library_authenticated_all" ON public.media_library;
DROP POLICY IF EXISTS "media_library_tenant_isolation" ON public.media_library;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.media_library
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.media_library
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- campaigns (4 rows, all Prizma — policy had OR true leak) ----
DROP POLICY IF EXISTS "campaigns_tenant_access" ON public.campaigns;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.campaigns
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.campaigns
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- campaign_templates (2 global rows — backfill to Prizma first) ----
-- Backfill: assign global templates to Prizma (Daniel-approved decision)
UPDATE public.campaign_templates
  SET tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  WHERE tenant_id IS NULL AND is_global = true;

DROP POLICY IF EXISTS "campaign_templates_access" ON public.campaign_templates;
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_templates FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.campaign_templates
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.campaign_templates
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ---- supplier_balance_adjustments (0 rows — service_bypass was on wrong role) ----
DROP POLICY IF EXISTS "service_bypass" ON public.supplier_balance_adjustments;
DROP POLICY IF EXISTS "tenant_isolation" ON public.supplier_balance_adjustments;
ALTER TABLE public.supplier_balance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_balance_adjustments FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_bypass" ON public.supplier_balance_adjustments
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON public.supplier_balance_adjustments
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- ==========================================================================
-- VERIFICATION QUERIES (review results before COMMIT)
-- ==========================================================================

-- V1: All 11 tables should have exactly 2 policies each (service_bypass + tenant_isolation)
SELECT tablename, policyname, roles, qual
FROM pg_policies
WHERE tablename IN (
  'customers','prescriptions','sales','work_orders',
  'brand_content_log','storefront_component_presets','storefront_page_tags',
  'media_library','campaigns','campaign_templates','supplier_balance_adjustments'
)
ORDER BY tablename, policyname;
-- Expected: 22 rows (2 per table)
-- All service_bypass rows: roles={service_role}, qual=true
-- All tenant_isolation rows: roles={public}, qual contains request.jwt.claims
-- If ANY row has qual=true outside service_bypass → DO NOT COMMIT

-- V2: tenant_id retrofit verification (4 tables from Part 1)
SELECT table_name,
       EXISTS (SELECT 1 FROM information_schema.columns c
               WHERE c.table_schema='public' AND c.table_name=t.table_name
                 AND c.column_name='tenant_id') AS has_tenant_id
FROM (VALUES ('customers'),('prescriptions'),('sales'),('work_orders')) AS t(table_name)
ORDER BY table_name;
-- Expected: 4 rows, all has_tenant_id = true

-- V3: Iron Rule 18 fix on work_orders
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.work_orders'::regclass AND contype = 'u'
ORDER BY conname;
-- Expected: work_orders_order_number_tenant_id_key with UNIQUE (order_number, tenant_id)
-- Should NOT see work_orders_order_number_key

-- V4: campaign_templates backfill verification
SELECT id, tenant_id, is_global, name FROM campaign_templates;
-- Expected: 2 rows, both with tenant_id = 6ad0781b-..., is_global = true

COMMIT;
