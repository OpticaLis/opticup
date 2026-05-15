-- ═══════════════════════════════════════════════════════════════
-- M1 Lens Inventory Phase 1A — Migration 1/5: Global Catalog
-- Tables: lens_brand, lens_design, lens_variant, supplier_brand_distribution
-- Applied to live: 2026-05-14T18:01:40Z (Supabase MCP apply_migration)
-- ═══════════════════════════════════════════════════════════════
-- Architecture: lens_brand → lens_design → lens_variant are PLATFORM-OWNED
-- (owner_tenant_id NULL today, will be SET when supplier-tenants adopt).
-- supplier_brand_distribution is TENANT-SCOPED (each tenant tracks which
-- of their suppliers imports which brand).
-- RLS pattern for platform tables: two PERMISSIVE policies (owner_view +
-- public_view) per handoff §"RLS pattern".
-- ═══════════════════════════════════════════════════════════════

-- ─── lens_brand ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lens_brand (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id     UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  is_published        BOOLEAN NOT NULL DEFAULT false,
  lifecycle_status    TEXT NOT NULL DEFAULT 'active'
                      CHECK (lifecycle_status IN ('active','discontinued','draft')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT lens_brand_name_owner_unique
    UNIQUE NULLS NOT DISTINCT (name, owner_tenant_id)
);
CREATE INDEX IF NOT EXISTS lens_brand_owner_tenant_idx
  ON public.lens_brand(owner_tenant_id) WHERE owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lens_brand_published_idx
  ON public.lens_brand(is_published, lifecycle_status) WHERE is_deleted = false;

ALTER TABLE public.lens_brand ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.lens_brand
  FOR ALL TO service_role USING (true);
CREATE POLICY owner_view ON public.lens_brand
  AS PERMISSIVE FOR ALL TO public
  USING (owner_tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE POLICY public_view ON public.lens_brand
  AS PERMISSIVE FOR SELECT TO public
  USING (is_published = true AND lifecycle_status = 'active' AND is_deleted = false);

-- ─── lens_design ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lens_design (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id     UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  brand_id            UUID NOT NULL REFERENCES public.lens_brand(id) ON DELETE RESTRICT,
  name                TEXT NOT NULL,
  lens_type           TEXT NOT NULL
                      CHECK (lens_type IN ('single_vision','progressive','bifocal','office','occupational')),
  material            TEXT NULL,
  is_published        BOOLEAN NOT NULL DEFAULT false,
  lifecycle_status    TEXT NOT NULL DEFAULT 'active'
                      CHECK (lifecycle_status IN ('active','discontinued','draft')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT lens_design_name_brand_owner_unique
    UNIQUE NULLS NOT DISTINCT (name, brand_id, owner_tenant_id)
);
CREATE INDEX IF NOT EXISTS lens_design_brand_idx ON public.lens_design(brand_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS lens_design_owner_tenant_idx
  ON public.lens_design(owner_tenant_id) WHERE owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lens_design_published_idx
  ON public.lens_design(is_published, lifecycle_status) WHERE is_deleted = false;

ALTER TABLE public.lens_design ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.lens_design
  FOR ALL TO service_role USING (true);
CREATE POLICY owner_view ON public.lens_design
  AS PERMISSIVE FOR ALL TO public
  USING (owner_tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE POLICY public_view ON public.lens_design
  AS PERMISSIVE FOR SELECT TO public
  USING (is_published = true AND lifecycle_status = 'active' AND is_deleted = false);

-- ─── lens_variant ───────────────────────────────────────────────
-- Per (Design × Index × Diameter × Coating × Tint) with SPH/CYL/ADD RANGES.
-- Immutable once stock_lot references it (enforced by application + version field).
CREATE TABLE IF NOT EXISTS lens_variant (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id     UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  design_id           UUID NOT NULL REFERENCES public.lens_design(id) ON DELETE RESTRICT,
  display_id          TEXT NOT NULL UNIQUE,  -- LV-NNNNNN format from next_lens_variant_display_id RPC
  refractive_index    NUMERIC(3,2) NOT NULL  CHECK (refractive_index BETWEEN 1.40 AND 2.00),
  diameter_mm         INT NOT NULL  CHECK (diameter_mm BETWEEN 50 AND 90),
  coating             TEXT NULL,
  tint                TEXT NULL,
  sph_min             NUMERIC(4,2) NOT NULL,
  sph_max             NUMERIC(4,2) NOT NULL  CHECK (sph_max >= sph_min),
  sph_step            NUMERIC(3,2) NOT NULL DEFAULT 0.25,
  cyl_min             NUMERIC(4,2) NULL,
  cyl_max             NUMERIC(4,2) NULL  CHECK (cyl_max IS NULL OR cyl_min IS NULL OR cyl_max >= cyl_min),
  cyl_step            NUMERIC(3,2) NULL,
  add_min             NUMERIC(3,2) NULL,
  add_max             NUMERIC(3,2) NULL  CHECK (add_max IS NULL OR add_min IS NULL OR add_max >= add_min),
  add_step            NUMERIC(3,2) NULL,
  is_published        BOOLEAN NOT NULL DEFAULT false,
  lifecycle_status    TEXT NOT NULL DEFAULT 'active'
                      CHECK (lifecycle_status IN ('active','discontinued','draft')),
  version             INT NOT NULL DEFAULT 1,
  superseded_by_id    UUID NULL REFERENCES public.lens_variant(id) ON DELETE SET NULL,
  canonical_root_id   UUID NULL REFERENCES public.lens_variant(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT lens_variant_design_index_diameter_coating_tint_owner_unique
    UNIQUE NULLS NOT DISTINCT (design_id, refractive_index, diameter_mm, coating, tint, owner_tenant_id)
);
CREATE INDEX IF NOT EXISTS lens_variant_design_idx ON public.lens_variant(design_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS lens_variant_owner_tenant_idx
  ON public.lens_variant(owner_tenant_id) WHERE owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lens_variant_published_idx
  ON public.lens_variant(is_published, lifecycle_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS lens_variant_canonical_root_idx
  ON public.lens_variant(canonical_root_id) WHERE canonical_root_id IS NOT NULL;

ALTER TABLE public.lens_variant ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.lens_variant
  FOR ALL TO service_role USING (true);
CREATE POLICY owner_view ON public.lens_variant
  AS PERMISSIVE FOR ALL TO public
  USING (owner_tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE POLICY public_view ON public.lens_variant
  AS PERMISSIVE FOR SELECT TO public
  USING (is_published = true AND lifecycle_status = 'active' AND is_deleted = false);

-- ─── supplier_brand_distribution ────────────────────────────────
-- Tenant-scoped: each tenant tracks which of their suppliers carries which brand.
-- 1:1 today (active per tenant per brand) enforced via partial UNIQUE INDEX.
-- Future 1:N: drop the partial unique without other schema change.
CREATE TABLE IF NOT EXISTS supplier_brand_distribution (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  brand_id            UUID NOT NULL REFERENCES public.lens_brand(id) ON DELETE RESTRICT,
  supplier_id         UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','transitioning')),
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until     TIMESTAMPTZ NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false
);
-- Iron Rule 18: tenant-scoped UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS supplier_brand_distribution_active_unique
  ON public.supplier_brand_distribution(tenant_id, brand_id)
  WHERE status = 'active' AND is_deleted = false;
CREATE INDEX IF NOT EXISTS supplier_brand_distribution_tenant_idx
  ON public.supplier_brand_distribution(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS supplier_brand_distribution_supplier_idx
  ON public.supplier_brand_distribution(supplier_id) WHERE is_deleted=false;

ALTER TABLE public.supplier_brand_distribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.supplier_brand_distribution
  FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.supplier_brand_distribution
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── COMMENTS for documentation ─────────────────────────────────
COMMENT ON TABLE public.lens_brand IS 'M1 Lens Phase 1A: Manufacturers (Hoya, Essilor, etc.). Platform-owned (owner_tenant_id NULL today; SET when supplier-tenants adopt). Two-PERMISSIVE-policy RLS pattern.';
COMMENT ON TABLE public.lens_design IS 'M1 Lens Phase 1A: Lens series within a brand (e.g. Hilux EYAS BLC). Platform-owned, two-PERMISSIVE-policy RLS.';
COMMENT ON TABLE public.lens_variant IS 'M1 Lens Phase 1A: Per (design x refractive_index x diameter x coating x tint) with SPH/CYL/ADD ranges. Immutable once stock_lot references it (use version + superseded_by_id). display_id LV-NNNNNN format from next_lens_variant_display_id() RPC.';
COMMENT ON TABLE public.supplier_brand_distribution IS 'M1 Lens Phase 1A: Tenant-scoped mapping of supplier -> brand. 1:1 today (partial UNIQUE on active rows); drop the partial unique for 1:N future. CASCADE on tenant delete; RESTRICT on brand/supplier delete.';

-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK
-- See modules/Module 1 - Inventory Management/docs/specs/
--     M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/ROLLBACK.md
-- (Inline DDL omitted; the destructive-ops gate scans .sql files
-- regardless of comment markers, so the rollback DDL is documented
-- separately in the SPEC folder.)
