-- Migration: 2026_05_09_branches_schema_up
-- SPEC: M3_BRANCHES_INFRA_AND_ASHKELON §3
-- Purpose: per-branch infrastructure (table + canonical RLS pattern).
-- Iron Rules: 14 (tenant_id NOT NULL), 15 (canonical RLS via JWT claim),
--   18 (UNIQUE includes tenant_id), L-PROJECT-002 (jsonb arrays only).

CREATE TABLE tenant_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  display_order int NOT NULL DEFAULT 0,

  name_he text NOT NULL,
  name_en text,
  name_ru text,

  street_he text NOT NULL,
  street_en text,
  street_ru text,
  city_he text NOT NULL,
  city_en text,
  city_ru text,
  postal_code text,
  country_code text NOT NULL DEFAULT 'IL',
  region_he text,
  region_en text,
  region_ru text,

  phone text,
  whatsapp_e164 text,
  email text,

  latitude numeric(9,6),
  longitude numeric(9,6),

  hours jsonb NOT NULL DEFAULT '[]'::jsonb,

  google_business_url text,
  facebook_url text,
  instagram_url text,
  waze_url text,

  intro_he text,
  intro_en text,
  intro_ru text,

  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,

  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  is_deleted boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,

  CONSTRAINT tenant_branches_tenant_slug_unique UNIQUE (tenant_id, slug),
  CONSTRAINT tenant_branches_hours_array_check CHECK (jsonb_typeof(hours) = 'array'),
  CONSTRAINT tenant_branches_gallery_array_check CHECK (jsonb_typeof(gallery) = 'array')
);

CREATE INDEX tenant_branches_tenant_id_idx ON public.tenant_branches (tenant_id);
CREATE INDEX tenant_branches_published_idx ON public.tenant_branches (tenant_id, status, is_deleted, display_order);

ALTER TABLE public.tenant_branches ENABLE ROW LEVEL SECURITY;

-- Canonical two-policy RLS (CLAUDE.md §5 Iron Rule 15 reference).
CREATE POLICY service_bypass ON public.tenant_branches
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON public.tenant_branches
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);
