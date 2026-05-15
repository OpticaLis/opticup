-- ═══════════════════════════════════════════════════════════════
-- M1 Lens Inventory Phase 1A — Migration 3/5: Retailer Layer
-- Tables: tenant_location, tenant_active_offerings, tenant_lens_stock
-- Applied to live: 2026-05-14T18:03:00Z (Supabase MCP apply_migration)
-- ═══════════════════════════════════════════════════════════════
-- All three are tenant-scoped. tenant_location is the multi-branch primitive.
-- tenant_active_offerings = curated subset of supplier_catalog_offering rows
-- the retailer chose to carry. tenant_lens_stock = physical stock with POINT
-- SPH/CYL/ADD (not ranges — those are on lens_variant). qty_on_hand is a
-- denormalized projection from stock_movement (maintained by trigger in 5/5).
-- ═══════════════════════════════════════════════════════════════

-- ─── tenant_location ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_location (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  short_code          TEXT NULL,
  address             TEXT NULL,
  is_default          BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT tenant_location_name_unique UNIQUE (tenant_id, name)
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_location_one_default_per_tenant
  ON tenant_location(tenant_id) WHERE is_default = true AND is_deleted = false;
CREATE INDEX IF NOT EXISTS tenant_location_tenant_idx
  ON tenant_location(tenant_id) WHERE is_deleted=false;

ALTER TABLE tenant_location ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON tenant_location
  FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON tenant_location
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── tenant_active_offerings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_active_offerings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offering_id         UUID NOT NULL REFERENCES supplier_catalog_offering(id) ON DELETE CASCADE,
  location_id         UUID NULL REFERENCES tenant_location(id) ON DELETE CASCADE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  activated_by        UUID NULL,
  activated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_active_offerings_unique
  ON tenant_active_offerings(tenant_id, offering_id, location_id) NULLS NOT DISTINCT
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS tenant_active_offerings_tenant_idx
  ON tenant_active_offerings(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS tenant_active_offerings_offering_idx
  ON tenant_active_offerings(offering_id) WHERE is_deleted=false;

ALTER TABLE tenant_active_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON tenant_active_offerings
  FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON tenant_active_offerings
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── tenant_lens_stock ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_lens_stock (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id          UUID NOT NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  location_id         UUID NOT NULL REFERENCES tenant_location(id) ON DELETE RESTRICT,
  sph                 NUMERIC(4,2) NOT NULL,
  cyl                 NUMERIC(4,2) NULL,
  add_value           NUMERIC(3,2) NULL,
  qty_on_hand         INT NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  reorder_threshold   INT NULL CHECK (reorder_threshold IS NULL OR reorder_threshold >= 0),
  reorder_qty         INT NULL CHECK (reorder_qty IS NULL OR reorder_qty > 0),
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_lens_stock_unique
  ON tenant_lens_stock(tenant_id, variant_id, location_id, sph, cyl, add_value)
  NULLS NOT DISTINCT
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS tenant_lens_stock_tenant_idx
  ON tenant_lens_stock(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS tenant_lens_stock_variant_idx
  ON tenant_lens_stock(variant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS tenant_lens_stock_location_idx
  ON tenant_lens_stock(location_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS tenant_lens_stock_low_stock_idx
  ON tenant_lens_stock(tenant_id, variant_id) WHERE qty_on_hand <= 0 AND is_deleted=false;

ALTER TABLE tenant_lens_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON tenant_lens_stock
  FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON tenant_lens_stock
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── COMMENTS ──────────────────────────────────────────────────
COMMENT ON TABLE tenant_location IS 'M1 Lens Phase 1A: Per-tenant physical locations (branches). Single-store tenants get one auto-default. At most one default per tenant (partial UNIQUE).';
COMMENT ON TABLE tenant_active_offerings IS 'M1 Lens Phase 1A: Retailer-curated subset of supplier_catalog_offering. location_id NULL = all locations.';
COMMENT ON TABLE tenant_lens_stock IS 'M1 Lens Phase 1A: Physical stock with POINT prescription values (SPH/CYL/ADD). qty_on_hand maintained by trigger trg_stock_movement_qty_projection (migration 5/5). NEVER hand-update qty_on_hand — Iron Rule 1 atomic via stock_movement insert.';

-- Rollback DDL: see SPEC/ROLLBACK.md
