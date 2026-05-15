-- ═══════════════════════════════════════════════════════════════
-- M1 Lens Inventory Phase 1A — Migration 4/5: Operations + Governance
-- Tables: stock_lot, stock_movement, stock_transfer,
--         purchase_receipt, purchase_receipt_line,
--         supplier_permissions, change_approval_log,
--         pending_lens_advancement_queue (K3 contract queue)
-- Applied to live: 2026-05-14T18:04:00Z (Supabase MCP apply_migration)
-- ═══════════════════════════════════════════════════════════════
-- All tenant-scoped. FIFO operations: stock_lot, stock_movement, stock_transfer.
-- purchase_receipt + purchase_receipt_line = NEW lens-specific flow per Q1
-- option (c) divergence; legacy goods_receipts untouched. M9 contract queue
-- is the K3 durability mechanism.
-- ═══════════════════════════════════════════════════════════════

-- ─── stock_lot (FIFO purchase batches) ──────────────────────────
CREATE TABLE IF NOT EXISTS stock_lot (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id          UUID NOT NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  location_id         UUID NOT NULL REFERENCES tenant_location(id) ON DELETE RESTRICT,
  origin_type         TEXT NOT NULL
                      CHECK (origin_type IN ('purchase','customer_return','adjustment_found','transfer_in')),
  supplier_offering_id UUID NULL REFERENCES supplier_catalog_offering(id) ON DELETE SET NULL,
  purchase_order_id   UUID NULL,
  purchase_receipt_id UUID NULL,
  original_lot_id     UUID NULL REFERENCES stock_lot(id) ON DELETE SET NULL,
  qty_received        INT NOT NULL CHECK (qty_received > 0),
  qty_remaining       INT NOT NULL CHECK (qty_remaining >= 0 AND qty_remaining <= qty_received),
  unit_cost           NUMERIC(12,4) NOT NULL CHECK (unit_cost >= 0),
  unit_cost_currency  TEXT NOT NULL DEFAULT 'ILS',
  fx_rate_snapshot    NUMERIC(12,6) NULL,
  fx_rate_date        DATE NULL,
  lot_number          TEXT NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_at           TIMESTAMPTZ NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_lot_number_unique
  ON stock_lot(tenant_id, lot_number) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS stock_lot_tenant_idx ON stock_lot(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS stock_lot_variant_idx ON stock_lot(variant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS stock_lot_location_idx ON stock_lot(location_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS stock_lot_fifo_idx
  ON stock_lot(tenant_id, variant_id, location_id, received_at)
  WHERE qty_remaining > 0 AND is_deleted = false;
CREATE INDEX IF NOT EXISTS stock_lot_origin_idx ON stock_lot(origin_type) WHERE is_deleted=false;

ALTER TABLE stock_lot ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON stock_lot FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON stock_lot FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── stock_movement (event ledger) ──────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movement (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_lot_id       UUID NOT NULL REFERENCES stock_lot(id) ON DELETE RESTRICT,
  variant_id          UUID NOT NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  location_id         UUID NOT NULL REFERENCES tenant_location(id) ON DELETE RESTRICT,
  movement_type       TEXT NOT NULL
                      CHECK (movement_type IN ('sale','receipt','transfer_out','transfer_in','adjustment_found','adjustment_lost','customer_return')),
  qty_delta           INT NOT NULL CHECK (qty_delta <> 0),
  cost_basis_at_movement NUMERIC(12,4) NULL,
  vat_amount_at_movement NUMERIC(12,4) NULL,
  fx_rate_snapshot    NUMERIC(12,6) NULL,
  sale_order_id       UUID NULL,
  customer_return_id  UUID NULL,
  purchase_receipt_id UUID NULL,
  transfer_id         UUID NULL,
  adjustment_id       UUID NULL,
  performed_by        UUID NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_movement_exactly_one_source CHECK (
    (CASE WHEN sale_order_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN customer_return_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN purchase_receipt_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN transfer_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN adjustment_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);
CREATE INDEX IF NOT EXISTS stock_movement_tenant_idx ON stock_movement(tenant_id);
CREATE INDEX IF NOT EXISTS stock_movement_lot_idx ON stock_movement(source_lot_id);
CREATE INDEX IF NOT EXISTS stock_movement_variant_idx ON stock_movement(variant_id);
CREATE INDEX IF NOT EXISTS stock_movement_sale_order_idx ON stock_movement(sale_order_id) WHERE sale_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movement_purchase_receipt_idx ON stock_movement(purchase_receipt_id) WHERE purchase_receipt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movement_movement_type_idx ON stock_movement(tenant_id, movement_type);
CREATE INDEX IF NOT EXISTS stock_movement_created_at_idx ON stock_movement(created_at DESC);

ALTER TABLE stock_movement ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON stock_movement FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON stock_movement FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── stock_transfer ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_transfer (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_location_id    UUID NOT NULL REFERENCES tenant_location(id) ON DELETE RESTRICT,
  to_location_id      UUID NOT NULL REFERENCES tenant_location(id) ON DELETE RESTRICT,
  transfer_number     TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'in_transit'
                      CHECK (status IN ('in_transit','received','cancelled')),
  variant_id          UUID NOT NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  qty_sent            INT NOT NULL CHECK (qty_sent > 0),
  actual_received_qty INT NULL CHECK (actual_received_qty IS NULL OR actual_received_qty >= 0),
  initiated_by        UUID NULL,
  received_by         UUID NULL,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at         TIMESTAMPTZ NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT stock_transfer_distinct_locations CHECK (from_location_id <> to_location_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_transfer_number_unique
  ON stock_transfer(tenant_id, transfer_number) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS stock_transfer_tenant_idx ON stock_transfer(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS stock_transfer_status_idx ON stock_transfer(tenant_id, status) WHERE is_deleted=false;

ALTER TABLE stock_transfer ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON stock_transfer FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON stock_transfer FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

ALTER TABLE stock_movement
  ADD CONSTRAINT stock_movement_transfer_fk
  FOREIGN KEY (transfer_id) REFERENCES stock_transfer(id) ON DELETE SET NULL;

-- ─── purchase_receipt (NEW for lens flow per Q1 option c) ───────
CREATE TABLE IF NOT EXISTS purchase_receipt (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  receipt_number      TEXT NOT NULL,
  purchase_order_id   UUID NULL,
  delivery_note_number TEXT NOT NULL,
  delivery_note_received_at TIMESTAMPTZ NULL,
  goods_received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  scanned_doc_url     TEXT NULL,
  shipping_box_id     UUID NULL,
  shipping_box_supplier_barcode TEXT NULL,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','confirmed','partial','complete','cancelled')),
  notes               TEXT NULL,
  confirmed_by        UUID NULL,
  confirmed_at        TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted          BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_receipt_number_unique
  ON purchase_receipt(tenant_id, receipt_number) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS purchase_receipt_tenant_idx ON purchase_receipt(tenant_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS purchase_receipt_supplier_idx ON purchase_receipt(supplier_id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS purchase_receipt_status_idx ON purchase_receipt(tenant_id, status) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS purchase_receipt_shipping_box_idx ON purchase_receipt(shipping_box_id) WHERE shipping_box_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS purchase_receipt_delivery_note_idx ON purchase_receipt(tenant_id, delivery_note_number);

ALTER TABLE purchase_receipt ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON purchase_receipt FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON purchase_receipt FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

ALTER TABLE stock_lot
  ADD CONSTRAINT stock_lot_purchase_receipt_fk
  FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipt(id) ON DELETE SET NULL;
ALTER TABLE stock_movement
  ADD CONSTRAINT stock_movement_purchase_receipt_fk
  FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipt(id) ON DELETE SET NULL;

-- ─── purchase_receipt_line ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_receipt_line (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_id          UUID NOT NULL REFERENCES purchase_receipt(id) ON DELETE CASCADE,
  variant_id          UUID NOT NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  location_id         UUID NOT NULL REFERENCES tenant_location(id) ON DELETE RESTRICT,
  sph                 NUMERIC(4,2) NULL,
  cyl                 NUMERIC(4,2) NULL,
  add_value           NUMERIC(3,2) NULL,
  qty_received        INT NOT NULL CHECK (qty_received >= 0),
  unit_cost           NUMERIC(12,4) NOT NULL CHECK (unit_cost >= 0),
  unit_cost_currency  TEXT NOT NULL DEFAULT 'ILS',
  ordered_qty         INT NULL,
  discrepancy_qty     INT NULL,
  discrepancy_reason  TEXT NULL,
  discrepancy_status  TEXT NULL CHECK (discrepancy_status IS NULL OR discrepancy_status IN ('open','resolved','accepted')),
  sale_order_id       UUID NULL,
  stock_lot_id        UUID NULL REFERENCES stock_lot(id) ON DELETE SET NULL,
  is_manual_addition  BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_receipt_line_tenant_idx ON purchase_receipt_line(tenant_id);
CREATE INDEX IF NOT EXISTS purchase_receipt_line_receipt_idx ON purchase_receipt_line(receipt_id);
CREATE INDEX IF NOT EXISTS purchase_receipt_line_variant_idx ON purchase_receipt_line(variant_id);
CREATE INDEX IF NOT EXISTS purchase_receipt_line_lot_idx ON purchase_receipt_line(stock_lot_id) WHERE stock_lot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS purchase_receipt_line_sale_order_idx ON purchase_receipt_line(sale_order_id) WHERE sale_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS purchase_receipt_line_discrepancy_idx
  ON purchase_receipt_line(tenant_id, discrepancy_status) WHERE discrepancy_status IS NOT NULL;

ALTER TABLE purchase_receipt_line ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON purchase_receipt_line FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON purchase_receipt_line FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── supplier_permissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_permissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  action              TEXT NOT NULL
                      CHECK (action IN ('catalog_add','catalog_edit_price','catalog_discontinue','order_view','order_status_update','overlay_propose')),
  permission_level    TEXT NOT NULL DEFAULT 'requires_platform_approval'
                      CHECK (permission_level IN ('auto','requires_platform_approval','requires_retailer_approval','denied')),
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until     TIMESTAMPTZ NULL,
  granted_by          UUID NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_permissions_active_unique
  ON supplier_permissions(tenant_id, supplier_id, action)
  WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS supplier_permissions_tenant_idx ON supplier_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS supplier_permissions_supplier_idx ON supplier_permissions(supplier_id);

ALTER TABLE supplier_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON supplier_permissions FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON supplier_permissions FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── change_approval_log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_approval_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type         TEXT NOT NULL
                      CHECK (entity_type IN ('lens_brand','lens_design','lens_variant','supplier_catalog_offering','pricing_overlay','supplier_permissions')),
  entity_id           UUID NOT NULL,
  change_type         TEXT NOT NULL
                      CHECK (change_type IN ('create','update','soft_delete','status_change','approve','reject')),
  before_state        JSONB NULL,
  after_state         JSONB NULL,
  proposed_by         UUID NULL,
  approved_by         UUID NULL,
  approved_at         TIMESTAMPTZ NULL,
  rejection_reason    TEXT NULL,
  notes               TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS change_approval_log_tenant_idx ON change_approval_log(tenant_id);
CREATE INDEX IF NOT EXISTS change_approval_log_entity_idx ON change_approval_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS change_approval_log_created_idx ON change_approval_log(created_at DESC);

ALTER TABLE change_approval_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON change_approval_log FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON change_approval_log FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── pending_lens_advancement_queue (K3 contract) ───────────────
CREATE TABLE IF NOT EXISTS pending_lens_advancement_queue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_order_id       UUID NOT NULL,
  sub_order_id        UUID NULL,
  purchase_receipt_id UUID NOT NULL REFERENCES purchase_receipt(id) ON DELETE CASCADE,
  stock_movement_id   UUID NOT NULL REFERENCES stock_movement(id) ON DELETE CASCADE,
  enqueued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ NULL,
  process_error       TEXT NULL
);
CREATE INDEX IF NOT EXISTS pending_lens_advancement_queue_tenant_idx
  ON pending_lens_advancement_queue(tenant_id);
CREATE INDEX IF NOT EXISTS pending_lens_advancement_queue_unprocessed_idx
  ON pending_lens_advancement_queue(enqueued_at) WHERE processed_at IS NULL;

ALTER TABLE pending_lens_advancement_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON pending_lens_advancement_queue FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON pending_lens_advancement_queue FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── COMMENTS ──────────────────────────────────────────────────
COMMENT ON TABLE stock_lot IS 'M1 Lens Phase 1A: FIFO purchase batches. unit_cost VAT-EXCLUSIVE in tenant base currency. fx_rate_snapshot for foreign-currency receipts. lot_number from next_lot_number RPC.';
COMMENT ON TABLE stock_movement IS 'M1 Lens Phase 1A: Event ledger. One row per lot consumed. CHECK exactly one of (sale_order_id, customer_return_id, purchase_receipt_id, transfer_id, adjustment_id) NOT NULL.';
COMMENT ON TABLE stock_transfer IS 'M1 Lens Phase 1A: Parent for inter-location atomic transfers. Wrapped in record_transfer() RPC with FOR UPDATE lock.';
COMMENT ON TABLE purchase_receipt IS 'M1 Lens Phase 1A: NEW lens-specific receipt flow per Q1 resolution option (c) divergence. Mandatory delivery_note_number per D-M1-09. shipping_box_id FK added when M9 builds shipping_boxes.';
COMMENT ON TABLE purchase_receipt_line IS 'M1 Lens Phase 1A: Per-line receipt detail with POINT prescription. discrepancy_qty for reconciliation-agent readiness (D-M1-10). sale_order_id NULL=stock; NOT NULL=custom-per-customer.';
COMMENT ON TABLE supplier_permissions IS 'M1 Lens Phase 1A: Per-action policy per supplier. Future supplier portal (Phase 2+) reads this.';
COMMENT ON TABLE change_approval_log IS 'M1 Lens Phase 1A: Governance audit for catalog/price changes ONLY. Stock movements log to stock_movement.';
COMMENT ON TABLE pending_lens_advancement_queue IS 'M1 Lens Phase 1A: Durable K3 contract queue. Trigger enqueues; M9 (when built) consumes via cron.';

-- Rollback DDL: see SPEC/ROLLBACK.md
