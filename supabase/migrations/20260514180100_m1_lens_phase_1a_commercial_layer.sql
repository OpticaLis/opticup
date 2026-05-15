-- ═══════════════════════════════════════════════════════════════
-- M1 Lens Inventory Phase 1A — Migration 2/5: Commercial Layer
-- Tables: vat_rates (global), supplier_catalog_offering, pricing_overlay
-- Applied to live: 2026-05-14T18:02:00Z (Supabase MCP apply_migration)
-- ═══════════════════════════════════════════════════════════════
-- vat_rates is GLOBAL (no tenant_id) — Iron Rule 14 documented exception per
-- Brief §9. Israel VAT 18% today; future multi-country = multiple rows.
-- supplier_catalog_offering + pricing_overlay are TENANT-SCOPED (each tenant
-- has their own supplier-offering rows; pricing_overlay tiered with default
-- layer at design/supplier level + variant-level exceptions per D-M1-05).
-- NOTE: tenants.base_currency_code SKIPPED — existing tenants.default_currency
--       reused (finding M1A-SPEC-01).
-- NOTE: currency reference uses currency_code TEXT (not FK to currencies)
--       per finding M1A-SPEC-05 (currencies table empty).
-- ═══════════════════════════════════════════════════════════════

-- ─── vat_rates (GLOBAL — no tenant_id) ──────────────────────────
CREATE TABLE IF NOT EXISTS vat_rates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id     UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
  country_code        CHAR(2) NOT NULL,
  rate_pct            NUMERIC(5,2) NOT NULL CHECK (rate_pct >= 0 AND rate_pct <= 100),
  effective_from      DATE NOT NULL,
  effective_until     DATE NULL,
  supersedes_id       UUID NULL REFERENCES vat_rates(id) ON DELETE SET NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vat_rates_country_active_unique
    UNIQUE NULLS NOT DISTINCT (country_code, owner_tenant_id, effective_from)
);
CREATE INDEX IF NOT EXISTS vat_rates_country_idx
  ON vat_rates(country_code, effective_from DESC);

ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON vat_rates
  FOR ALL TO service_role USING (true);
CREATE POLICY public_view ON vat_rates
  AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY owner_view ON vat_rates
  AS PERMISSIVE FOR ALL TO public
  USING (owner_tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- Seed: Israel VAT 18% (effective from 2026-01-01)
INSERT INTO vat_rates (country_code, rate_pct, effective_from, notes)
  VALUES ('IL', 18.00, '2026-01-01', 'Israel standard VAT rate')
  ON CONFLICT DO NOTHING;

-- ─── supplier_catalog_offering ──────────────────────────────────
-- Tenant-scoped (each tenant has their own supplier offerings — suppliers
-- table is per-tenant). Decomposed price per Brief §3 + D-M1-04/D-M1-07.
CREATE TABLE IF NOT EXISTS supplier_catalog_offering (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id                 UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  variant_id                  UUID NOT NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  supplier_brand_distribution_id  UUID NULL REFERENCES supplier_brand_distribution(id) ON DELETE SET NULL,
  -- Production type — D-M1-01 (lives on commercial offer, NOT on lens_variant)
  production_type             TEXT NOT NULL DEFAULT 'stock'
                              CHECK (production_type IN ('stock','custom')),
  -- Price decomposition
  price_amount                NUMERIC(12,4) NOT NULL CHECK (price_amount >= 0),
  currency_code               TEXT NOT NULL DEFAULT 'ILS',  -- ISO 4217; FK to currencies deferred (M1A-SPEC-05)
  is_vat_inclusive            BOOLEAN NOT NULL DEFAULT false,
  vat_rate_id                 UUID NULL REFERENCES vat_rates(id) ON DELETE SET NULL,
  price_components            JSONB NULL,
  supplier_sku_code           TEXT NULL,
  -- Lifecycle
  status                      TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','inactive','draft','superseded')),
  effective_from              TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until             TIMESTAMPTZ NULL,
  notes                       TEXT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted                  BOOLEAN NOT NULL DEFAULT false
);
-- Iron Rule 18: tenant-scoped UNIQUE on active offerings.
CREATE UNIQUE INDEX IF NOT EXISTS supplier_catalog_offering_active_unique
  ON supplier_catalog_offering(tenant_id, supplier_id, variant_id)
  WHERE status = 'active' AND is_deleted = false;
CREATE INDEX IF NOT EXISTS supplier_catalog_offering_tenant_idx
  ON supplier_catalog_offering(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS supplier_catalog_offering_variant_idx
  ON supplier_catalog_offering(variant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS supplier_catalog_offering_production_type_idx
  ON supplier_catalog_offering(tenant_id, production_type) WHERE is_deleted=false;

ALTER TABLE supplier_catalog_offering ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON supplier_catalog_offering
  FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON supplier_catalog_offering
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── pricing_overlay ────────────────────────────────────────────
-- Tiered discount per D-M1-05: default-layer (design or supplier scope) +
-- variant-level exceptions. CHECK exactly one of (variant_id, design_id,
-- supplier_id) is NOT NULL. Sparse — only actual discounts have rows.
CREATE TABLE IF NOT EXISTS pricing_overlay (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offering_id         UUID NULL REFERENCES supplier_catalog_offering(id) ON DELETE CASCADE,
  -- Scope (exactly one of these three should be non-NULL — CHECK below)
  scope_variant_id    UUID NULL REFERENCES lens_variant(id) ON DELETE CASCADE,
  scope_design_id     UUID NULL REFERENCES lens_design(id) ON DELETE CASCADE,
  scope_supplier_id   UUID NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  -- Discount
  overlay_type        TEXT NOT NULL CHECK (overlay_type IN ('negotiated','promo','volume')),
  discount_pct        NUMERIC(5,2) NULL CHECK (discount_pct IS NULL OR (discount_pct >= 0 AND discount_pct <= 100)),
  fixed_amount        NUMERIC(12,4) NULL,
  fixed_amount_currency TEXT NULL,
  stacking_rule       TEXT NOT NULL DEFAULT 'additive'
                      CHECK (stacking_rule IN ('additive','multiplicative','exclusive_max')),
  application_order   INT NOT NULL DEFAULT 100,
  -- Status workflow per Brief §3
  status              TEXT NOT NULL DEFAULT 'proposed'
                      CHECK (status IN ('proposed','active','rejected','superseded','expired')),
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until     TIMESTAMPTZ NULL,
  proposed_by         UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
  approved_by         UUID NULL,
  approved_at         TIMESTAMPTZ NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT pricing_overlay_exactly_one_scope CHECK (
    (CASE WHEN scope_variant_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN scope_design_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN scope_supplier_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),
  CONSTRAINT pricing_overlay_discount_or_fixed CHECK (
    (discount_pct IS NOT NULL) OR (fixed_amount IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS pricing_overlay_tenant_idx
  ON pricing_overlay(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS pricing_overlay_active_idx
  ON pricing_overlay(tenant_id, status) WHERE status='active' AND is_deleted=false;
CREATE INDEX IF NOT EXISTS pricing_overlay_variant_idx
  ON pricing_overlay(scope_variant_id) WHERE scope_variant_id IS NOT NULL AND is_deleted=false;
CREATE INDEX IF NOT EXISTS pricing_overlay_design_idx
  ON pricing_overlay(scope_design_id) WHERE scope_design_id IS NOT NULL AND is_deleted=false;
CREATE INDEX IF NOT EXISTS pricing_overlay_supplier_idx
  ON pricing_overlay(scope_supplier_id) WHERE scope_supplier_id IS NOT NULL AND is_deleted=false;

ALTER TABLE pricing_overlay ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON pricing_overlay
  FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON pricing_overlay
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── COMMENTS ──────────────────────────────────────────────────
COMMENT ON TABLE vat_rates IS 'M1 Lens Phase 1A: GLOBAL VAT rates (no tenant_id; Iron Rule 14 documented exception). Seeded with Israel 18%. Public-readable; owner_view for future supplier-tenant overrides.';
COMMENT ON TABLE supplier_catalog_offering IS 'M1 Lens Phase 1A: Tenant-scoped commercial offerings (supplier x variant x decomposed price). production_type lives here per D-M1-01 (NOT on lens_variant). currency_code TEXT (FK to currencies deferred — finding M1A-SPEC-05).';
COMMENT ON TABLE pricing_overlay IS 'M1 Lens Phase 1A: Tenant-scoped sparse discount layer per D-M1-05. Tiered: default scope (design or supplier) + variant-level exceptions. Status workflow: proposed -> active / rejected / superseded / expired.';

-- Rollback DDL: see SPEC/ROLLBACK.md
