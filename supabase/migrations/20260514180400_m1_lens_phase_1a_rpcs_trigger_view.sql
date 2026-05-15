-- ═══════════════════════════════════════════════════════════════
-- M1 Lens Inventory Phase 1A — Migration 5/5: RPCs + Trigger + View + Seq
-- 9 RPCs (Iron Rule 1+11 atomic); 1 trigger (K3 contract); 1 View (K5 contract);
-- 1 sequence-state table (lens_variant_display_seq).
-- Applied to live: 2026-05-14T18:05:00Z (Supabase MCP apply_migration)
-- ═══════════════════════════════════════════════════════════════

-- ─── lens_variant_display_seq ───────────────────────────────────
CREATE TABLE IF NOT EXISTS lens_variant_display_seq (
  scope       TEXT PRIMARY KEY,
  last_value  BIGINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO lens_variant_display_seq (scope, last_value)
  VALUES ('global', 0)
  ON CONFLICT (scope) DO NOTHING;

ALTER TABLE lens_variant_display_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON lens_variant_display_seq
  FOR ALL TO service_role USING (true);

-- ─── RPC: next_lens_variant_display_id ──────────────────────────
CREATE OR REPLACE FUNCTION next_lens_variant_display_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_next BIGINT; v_display_id TEXT;
BEGIN
  UPDATE lens_variant_display_seq
    SET last_value = last_value + 1, updated_at = now()
    WHERE scope = 'global'
    RETURNING last_value INTO v_next;
  IF v_next IS NULL THEN
    RAISE EXCEPTION 'lens_variant_display_seq scope=global not initialised'
      USING ERRCODE = 'P0001';
  END IF;
  v_display_id := 'LV-' || LPAD(v_next::TEXT, 6, '0');
  RETURN v_display_id;
END;
$$;

-- ─── RPC: next_lot_number ───────────────────────────────────────
CREATE OR REPLACE FUNCTION next_lot_number(p_tenant_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_max_seq INT; v_prefix TEXT; v_new_number TEXT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_prefix := 'LOT-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(lot_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
    INTO v_max_seq FROM stock_lot
    WHERE tenant_id = p_tenant_id AND lot_number LIKE v_prefix || '%';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
  RETURN v_new_number;
END;
$$;

-- ─── RPC: next_transfer_number ──────────────────────────────────
CREATE OR REPLACE FUNCTION next_transfer_number(p_tenant_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_max_seq INT; v_prefix TEXT; v_new_number TEXT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_prefix := 'TRN-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
    INTO v_max_seq FROM stock_transfer
    WHERE tenant_id = p_tenant_id AND transfer_number LIKE v_prefix || '%';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
  RETURN v_new_number;
END;
$$;

-- ─── RPC: next_receipt_number ───────────────────────────────────
CREATE OR REPLACE FUNCTION next_receipt_number(p_tenant_id UUID, p_supplier_number TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_max_seq INT; v_prefix TEXT; v_new_number TEXT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_prefix := 'RCP-' || COALESCE(p_supplier_number, '0') || '-';
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
    INTO v_max_seq FROM purchase_receipt
    WHERE tenant_id = p_tenant_id AND receipt_number LIKE v_prefix || '%';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  RETURN v_new_number;
END;
$$;

-- ─── RPC: record_stock_movement ─────────────────────────────────
CREATE OR REPLACE FUNCTION record_stock_movement(
  p_tenant_id UUID, p_source_lot_id UUID, p_variant_id UUID, p_location_id UUID,
  p_movement_type TEXT, p_qty_delta INT,
  p_sale_order_id UUID DEFAULT NULL, p_customer_return_id UUID DEFAULT NULL,
  p_purchase_receipt_id UUID DEFAULT NULL, p_transfer_id UUID DEFAULT NULL,
  p_adjustment_id UUID DEFAULT NULL,
  p_cost_basis NUMERIC DEFAULT NULL, p_vat_amount NUMERIC DEFAULT NULL,
  p_fx_rate_snapshot NUMERIC DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_sph NUMERIC DEFAULT NULL, p_cyl NUMERIC DEFAULT NULL, p_add_value NUMERIC DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_movement_id UUID; v_lot_qty_remaining INT; v_lot_tenant_id UUID;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT tenant_id, qty_remaining INTO v_lot_tenant_id, v_lot_qty_remaining
    FROM stock_lot WHERE id = p_source_lot_id FOR UPDATE;
  IF v_lot_tenant_id IS NULL THEN
    RAISE EXCEPTION 'stock_lot % not found', p_source_lot_id USING ERRCODE = '23503';
  END IF;
  IF v_lot_tenant_id <> p_tenant_id THEN
    RAISE EXCEPTION 'cross-tenant stock_lot access denied' USING ERRCODE = '42501';
  END IF;
  IF p_qty_delta < 0 AND (v_lot_qty_remaining + p_qty_delta) < 0 THEN
    RAISE EXCEPTION 'insufficient stock_lot.qty_remaining (% + % < 0)', v_lot_qty_remaining, p_qty_delta
      USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO stock_movement(
    tenant_id, source_lot_id, variant_id, location_id, movement_type, qty_delta,
    cost_basis_at_movement, vat_amount_at_movement, fx_rate_snapshot,
    sale_order_id, customer_return_id, purchase_receipt_id, transfer_id, adjustment_id,
    performed_by, notes
  ) VALUES (
    p_tenant_id, p_source_lot_id, p_variant_id, p_location_id, p_movement_type, p_qty_delta,
    p_cost_basis, p_vat_amount, p_fx_rate_snapshot,
    p_sale_order_id, p_customer_return_id, p_purchase_receipt_id, p_transfer_id, p_adjustment_id,
    p_performed_by, p_notes
  ) RETURNING id INTO v_movement_id;
  UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta, updated_at = now()
    WHERE id = p_source_lot_id;
  INSERT INTO tenant_lens_stock(tenant_id, variant_id, location_id, sph, cyl, add_value, qty_on_hand)
    VALUES (p_tenant_id, p_variant_id, p_location_id,
            COALESCE(p_sph, 0), p_cyl, p_add_value, GREATEST(0, p_qty_delta))
    ON CONFLICT (tenant_id, variant_id, location_id, sph, cyl, add_value)
      DO UPDATE SET qty_on_hand = GREATEST(0, tenant_lens_stock.qty_on_hand + p_qty_delta),
                    updated_at = now();
  RETURN v_movement_id;
END;
$$;

-- ─── RPC: record_transfer ───────────────────────────────────────
CREATE OR REPLACE FUNCTION record_transfer(
  p_tenant_id UUID, p_from_location_id UUID, p_to_location_id UUID,
  p_variant_id UUID, p_qty_sent INT, p_source_lot_id UUID,
  p_initiated_by UUID DEFAULT NULL, p_notes TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_transfer_id UUID; v_transfer_number TEXT; v_dest_lot_id UUID;
  v_source_unit_cost NUMERIC(12,4); v_source_received_at TIMESTAMPTZ;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION 'transfer source and destination must differ' USING ERRCODE = 'P0001';
  END IF;
  v_transfer_number := next_transfer_number(p_tenant_id);
  INSERT INTO stock_transfer(
    tenant_id, from_location_id, to_location_id, transfer_number, status, variant_id,
    qty_sent, initiated_by, notes
  ) VALUES (
    p_tenant_id, p_from_location_id, p_to_location_id, v_transfer_number, 'in_transit',
    p_variant_id, p_qty_sent, p_initiated_by, p_notes
  ) RETURNING id INTO v_transfer_id;
  SELECT unit_cost, received_at INTO v_source_unit_cost, v_source_received_at
    FROM stock_lot WHERE id = p_source_lot_id;
  INSERT INTO stock_lot(
    tenant_id, variant_id, location_id, origin_type,
    qty_received, qty_remaining, unit_cost, lot_number, received_at, original_lot_id
  ) VALUES (
    p_tenant_id, p_variant_id, p_to_location_id, 'transfer_in',
    p_qty_sent, p_qty_sent, v_source_unit_cost, next_lot_number(p_tenant_id),
    v_source_received_at, p_source_lot_id
  ) RETURNING id INTO v_dest_lot_id;
  PERFORM record_stock_movement(
    p_tenant_id, p_source_lot_id, p_variant_id, p_from_location_id,
    'transfer_out', -p_qty_sent,
    NULL, NULL, NULL, NULL, v_transfer_id, NULL, v_source_unit_cost, NULL, NULL,
    p_initiated_by, p_notes
  );
  PERFORM record_stock_movement(
    p_tenant_id, v_dest_lot_id, p_variant_id, p_to_location_id,
    'transfer_in', p_qty_sent,
    NULL, NULL, NULL, NULL, v_transfer_id, NULL, v_source_unit_cost, NULL, NULL,
    p_initiated_by, p_notes
  );
  RETURN v_transfer_id;
END;
$$;

-- ─── RPC: record_adjustment_found ───────────────────────────────
CREATE OR REPLACE FUNCTION record_adjustment_found(
  p_tenant_id UUID, p_variant_id UUID, p_location_id UUID, p_qty_found INT,
  p_reason TEXT DEFAULT NULL, p_performed_by UUID DEFAULT NULL,
  p_sph NUMERIC DEFAULT NULL, p_cyl NUMERIC DEFAULT NULL, p_add_value NUMERIC DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lot_id UUID; v_movement_id UUID; v_unit_cost NUMERIC(12,4) := 0;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_qty_found <= 0 THEN
    RAISE EXCEPTION 'qty_found must be positive' USING ERRCODE = 'P0001';
  END IF;
  SELECT price_amount INTO v_unit_cost
    FROM supplier_catalog_offering
    WHERE tenant_id = p_tenant_id AND variant_id = p_variant_id
      AND status = 'active' AND is_deleted = false
    ORDER BY effective_from DESC LIMIT 1;
  IF v_unit_cost IS NULL THEN v_unit_cost := 0; END IF;
  INSERT INTO stock_lot(
    tenant_id, variant_id, location_id, origin_type,
    qty_received, qty_remaining, unit_cost, lot_number, received_at, notes
  ) VALUES (
    p_tenant_id, p_variant_id, p_location_id, 'adjustment_found',
    p_qty_found, p_qty_found, v_unit_cost, next_lot_number(p_tenant_id),
    now(), 'adjustment_found: ' || COALESCE(p_reason, '')
  ) RETURNING id INTO v_lot_id;
  v_movement_id := record_stock_movement(
    p_tenant_id, v_lot_id, p_variant_id, p_location_id,
    'adjustment_found', p_qty_found,
    NULL, NULL, NULL, NULL, NULL, v_lot_id,
    v_unit_cost, NULL, NULL, p_performed_by, p_reason,
    p_sph, p_cyl, p_add_value
  );
  RETURN v_movement_id;
END;
$$;

-- ─── RPC: effective_price ───────────────────────────────────────
CREATE OR REPLACE FUNCTION effective_price(
  p_offering_id UUID, p_tenant_id UUID, p_as_of_ts TIMESTAMPTZ DEFAULT now()
) RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_offering RECORD; v_variant_id UUID; v_design_id UUID; v_supplier_id UUID;
  v_base_price NUMERIC(12,4); v_running_price NUMERIC(12,4);
  v_overlay RECORD; v_vat_pct NUMERIC(5,2) := 0;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_offering FROM supplier_catalog_offering
    WHERE id = p_offering_id AND tenant_id = p_tenant_id AND is_deleted = false;
  IF v_offering IS NULL THEN
    RAISE EXCEPTION 'offering % not found for tenant', p_offering_id USING ERRCODE = '23503';
  END IF;
  v_base_price := v_offering.price_amount;
  v_variant_id := v_offering.variant_id;
  v_supplier_id := v_offering.supplier_id;
  SELECT design_id INTO v_design_id FROM lens_variant WHERE id = v_variant_id;
  v_running_price := v_base_price;
  FOR v_overlay IN
    SELECT * FROM pricing_overlay
    WHERE tenant_id = p_tenant_id AND status = 'active' AND is_deleted = false
      AND effective_from <= p_as_of_ts
      AND (effective_until IS NULL OR effective_until > p_as_of_ts)
      AND (scope_variant_id = v_variant_id OR scope_design_id = v_design_id OR scope_supplier_id = v_supplier_id)
    ORDER BY application_order ASC
  LOOP
    IF v_overlay.discount_pct IS NOT NULL THEN
      IF v_overlay.stacking_rule = 'multiplicative' THEN
        v_running_price := v_running_price * (1 - v_overlay.discount_pct / 100);
      ELSIF v_overlay.stacking_rule = 'exclusive_max' THEN
        v_running_price := LEAST(v_running_price, v_base_price * (1 - v_overlay.discount_pct / 100));
      ELSE
        v_running_price := v_running_price - (v_base_price * v_overlay.discount_pct / 100);
      END IF;
    ELSIF v_overlay.fixed_amount IS NOT NULL THEN
      v_running_price := v_running_price - v_overlay.fixed_amount;
    END IF;
  END LOOP;
  v_running_price := GREATEST(0, v_running_price);
  IF NOT v_offering.is_vat_inclusive AND v_offering.vat_rate_id IS NOT NULL THEN
    SELECT rate_pct INTO v_vat_pct FROM vat_rates WHERE id = v_offering.vat_rate_id;
    IF v_vat_pct IS NOT NULL THEN
      v_running_price := v_running_price * (1 + v_vat_pct / 100);
    END IF;
  END IF;
  RETURN ROUND(v_running_price, 2);
END;
$$;

-- ─── RPC: m1_create_receipt_from_box (K2) ───────────────────────
CREATE OR REPLACE FUNCTION m1_create_receipt_from_box(
  p_tenant_id UUID, p_supplier_id UUID, p_delivery_note_number TEXT,
  p_lines JSONB, p_box_id UUID DEFAULT NULL,
  p_box_supplier_barcode TEXT DEFAULT NULL,
  p_supplier_number TEXT DEFAULT NULL, p_confirmed_by UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_receipt_id UUID; v_receipt_number TEXT; v_line JSONB; v_lot_id UUID;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_receipt_number := next_receipt_number(p_tenant_id, p_supplier_number);
  INSERT INTO purchase_receipt(
    tenant_id, supplier_id, receipt_number, delivery_note_number,
    shipping_box_id, shipping_box_supplier_barcode, status, confirmed_by, confirmed_at
  ) VALUES (
    p_tenant_id, p_supplier_id, v_receipt_number, p_delivery_note_number,
    p_box_id, p_box_supplier_barcode, 'confirmed', p_confirmed_by, now()
  ) RETURNING id INTO v_receipt_id;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO stock_lot(
      tenant_id, variant_id, location_id, origin_type,
      purchase_receipt_id, qty_received, qty_remaining, unit_cost, lot_number, received_at
    ) VALUES (
      p_tenant_id, (v_line->>'variant_id')::UUID, (v_line->>'location_id')::UUID, 'purchase',
      v_receipt_id, (v_line->>'qty_received')::INT, (v_line->>'qty_received')::INT,
      (v_line->>'unit_cost')::NUMERIC, next_lot_number(p_tenant_id), now()
    ) RETURNING id INTO v_lot_id;
    INSERT INTO purchase_receipt_line(
      tenant_id, receipt_id, variant_id, location_id, sph, cyl, add_value,
      qty_received, unit_cost, sale_order_id, stock_lot_id
    ) VALUES (
      p_tenant_id, v_receipt_id, (v_line->>'variant_id')::UUID, (v_line->>'location_id')::UUID,
      NULLIF(v_line->>'sph','')::NUMERIC, NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC,
      (v_line->>'qty_received')::INT, (v_line->>'unit_cost')::NUMERIC,
      NULLIF(v_line->>'sale_order_id','')::UUID, v_lot_id
    );
    PERFORM record_stock_movement(
      p_tenant_id, v_lot_id, (v_line->>'variant_id')::UUID, (v_line->>'location_id')::UUID,
      'receipt', (v_line->>'qty_received')::INT,
      NULLIF(v_line->>'sale_order_id','')::UUID, NULL, v_receipt_id, NULL, NULL,
      (v_line->>'unit_cost')::NUMERIC, NULL, NULL, p_confirmed_by, NULL,
      NULLIF(v_line->>'sph','')::NUMERIC, NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC
    );
  END LOOP;
  RETURN v_receipt_id;
END;
$$;

-- ─── K3 TRIGGER ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION m9_lens_received_for_sale_order_trg_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.sale_order_id IS NOT NULL AND NEW.purchase_receipt_id IS NOT NULL THEN
    INSERT INTO pending_lens_advancement_queue(
      tenant_id, sale_order_id, purchase_receipt_id, stock_movement_id
    ) VALUES (NEW.tenant_id, NEW.sale_order_id, NEW.purchase_receipt_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER m9_lens_received_for_sale_order_trg
  AFTER INSERT ON stock_movement
  FOR EACH ROW EXECUTE FUNCTION m9_lens_received_for_sale_order_trg_fn();

-- ─── K5 VIEW ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_suppliers_for_m9
WITH (security_invoker = on) AS
  SELECT s.id, s.tenant_id, s.name, s.supplier_number, s.phone, s.email, s.active
  FROM suppliers s
  WHERE s.active = true;

GRANT SELECT ON v_suppliers_for_m9 TO authenticated, service_role;

-- COMMENTS
COMMENT ON FUNCTION next_lens_variant_display_id IS 'M1 Lens Phase 1A: Atomic LV-NNNNNN generator. Global scope (variants are platform-owned).';
COMMENT ON FUNCTION next_lot_number IS 'M1 Lens Phase 1A: Atomic LOT-NNNNNN per tenant.';
COMMENT ON FUNCTION next_transfer_number IS 'M1 Lens Phase 1A: Atomic TRN-NNNNNN per tenant.';
COMMENT ON FUNCTION next_receipt_number IS 'M1 Lens Phase 1A: Atomic RCP-{supplier}-NNNN per tenant.';
COMMENT ON FUNCTION record_stock_movement IS 'M1 Lens Phase 1A: Atomic stock_movement INSERT + lot qty_remaining UPDATE + tenant_lens_stock projection. SELECT FOR UPDATE on the lot. Iron Rule 1.';
COMMENT ON FUNCTION record_transfer IS 'M1 Lens Phase 1A: Atomic inter-location transfer. Parent + 2 movements + dest lot creation.';
COMMENT ON FUNCTION record_adjustment_found IS 'M1 Lens Phase 1A: Found-stock adjustment. unit_cost from latest active offering.';
COMMENT ON FUNCTION effective_price IS 'M1 Lens Phase 1A: Resolver. Active overlays in application_order, then VAT. Returns VAT-INCLUSIVE.';
COMMENT ON FUNCTION m1_create_receipt_from_box IS 'M1 Lens Phase 1A K2 contract: orchestrator for goods receipt. Auto-fires K3 trigger when sale_order_id present.';
COMMENT ON FUNCTION m9_lens_received_for_sale_order_trg_fn IS 'M1 Lens Phase 1A K3 contract trigger fn: enqueue lens-advancement when both sale_order_id and purchase_receipt_id are set.';
COMMENT ON VIEW v_suppliers_for_m9 IS 'M1 Lens Phase 1A K5 contract: M9 read-only suppliers view. security_invoker=on.';

-- Rollback DDL: see SPEC/ROLLBACK.md
