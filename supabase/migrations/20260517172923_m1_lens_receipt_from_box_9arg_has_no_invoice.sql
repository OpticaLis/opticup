-- M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17 Commit 1
-- 9-arg overload of m1_create_receipt_from_box adding p_has_no_invoice.
-- Resolves F-2 from SPEC 4a (eliminates 2-step UPDATE workaround in
-- lens-inventory drawer onSubmit). Body is identical to the 8-arg variant
-- (verified via pg_get_functiondef pre-flight 2026-05-17) except the INSERT
-- INTO purchase_receipt now writes has_no_invoice from the new param.
--
-- The 8-arg signature remains in this commit; both consumers still call it.
-- Commit 3 of this SPEC drops the 8-arg signature after both consumers
-- (lens-inventory-main.js + lens-goods-receipt-close.js) migrate to 9-arg.
--
-- Postgres treats arity-different overloads as distinct functions — named-arg
-- resolution from PostgREST matches by parameter-name set; the 8-arg call
-- shape (omitting p_has_no_invoice) resolves to the 8-arg function, the
-- 9-arg call shape resolves to the new 9-arg.
--
-- Server-side JWT-tenant guard preserved (Iron Rule 22) — line "v_jwt_tenant
-- IS NULL OR v_jwt_tenant <> p_tenant_id" raises 42501.

CREATE OR REPLACE FUNCTION public.m1_create_receipt_from_box(
  p_tenant_id uuid,
  p_supplier_id uuid,
  p_delivery_note_number text,
  p_lines jsonb,
  p_box_id uuid DEFAULT NULL::uuid,
  p_box_supplier_barcode text DEFAULT NULL::text,
  p_supplier_number text DEFAULT NULL::text,
  p_confirmed_by uuid DEFAULT NULL::uuid,
  p_has_no_invoice boolean DEFAULT FALSE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_receipt_id      UUID;
  v_receipt_number  TEXT;
  v_line            JSONB;
  v_lot_id          UUID;
  v_jwt_tenant      uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_is_manual       BOOLEAN;
  v_variant_id      UUID;
  v_po_line_id      UUID;
  v_po_id_scratch   UUID;
  v_received_qty    INT;
  v_ordered_qty     INT;
  v_discrepancy_qty INT;
  v_touched_po_ids  UUID[] := ARRAY[]::UUID[];
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_receipt_number := next_receipt_number(p_tenant_id, p_supplier_number);

  INSERT INTO purchase_receipt(
    tenant_id, supplier_id, receipt_number, delivery_note_number,
    shipping_box_id, shipping_box_supplier_barcode,
    has_no_invoice,
    status, confirmed_by, confirmed_at
  ) VALUES (
    p_tenant_id, p_supplier_id, v_receipt_number, p_delivery_note_number,
    p_box_id, p_box_supplier_barcode,
    COALESCE(p_has_no_invoice, FALSE),
    'confirmed', p_confirmed_by, now()
  ) RETURNING id INTO v_receipt_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_is_manual       := COALESCE((v_line->>'is_manual_addition')::boolean, false);
    v_variant_id      := NULLIF(v_line->>'variant_id','')::uuid;
    v_po_line_id      := NULLIF(v_line->>'po_line_id','')::uuid;
    v_received_qty    := (v_line->>'qty_received')::int;
    v_ordered_qty     := NULLIF(v_line->>'ordered_qty','')::int;
    v_discrepancy_qty := CASE WHEN v_ordered_qty IS NOT NULL
                              THEN v_ordered_qty - v_received_qty
                              ELSE NULL END;

    IF v_is_manual AND v_variant_id IS NULL THEN
      INSERT INTO purchase_receipt_line(
        tenant_id, receipt_id, variant_id, location_id,
        qty_received, unit_cost,
        ordered_qty, discrepancy_qty,
        is_manual_addition, notes
      ) VALUES (
        p_tenant_id, v_receipt_id, NULL, (v_line->>'location_id')::UUID,
        v_received_qty, (v_line->>'unit_cost')::NUMERIC,
        v_ordered_qty, v_discrepancy_qty,
        true, NULLIF(v_line->>'notes','')
      );
      CONTINUE;
    END IF;

    INSERT INTO stock_lot(
      tenant_id, variant_id, location_id, origin_type,
      purchase_receipt_id, qty_received, qty_remaining, unit_cost, lot_number, received_at
    ) VALUES (
      p_tenant_id, v_variant_id, (v_line->>'location_id')::UUID, 'purchase',
      v_receipt_id, v_received_qty, v_received_qty,
      (v_line->>'unit_cost')::NUMERIC, next_lot_number(p_tenant_id), now()
    ) RETURNING id INTO v_lot_id;

    INSERT INTO purchase_receipt_line(
      tenant_id, receipt_id, variant_id, location_id,
      sph, cyl, add_value,
      qty_received, unit_cost,
      ordered_qty, discrepancy_qty,
      is_manual_addition,
      sale_order_id, stock_lot_id
    ) VALUES (
      p_tenant_id, v_receipt_id, v_variant_id, (v_line->>'location_id')::UUID,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC,
      v_received_qty, (v_line->>'unit_cost')::NUMERIC,
      v_ordered_qty, v_discrepancy_qty,
      v_is_manual,
      NULLIF(v_line->>'sale_order_id','')::UUID, v_lot_id
    );

    PERFORM record_stock_movement(
      p_tenant_id, v_lot_id, v_variant_id, (v_line->>'location_id')::UUID,
      'receipt', v_received_qty,
      NULLIF(v_line->>'sale_order_id','')::UUID, NULL, v_receipt_id, NULL, NULL,
      (v_line->>'unit_cost')::NUMERIC, NULL, NULL, p_confirmed_by, NULL,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC
    );

    IF v_po_line_id IS NOT NULL THEN
      UPDATE purchase_order_line
         SET qty_received = qty_received + v_received_qty,
             updated_at = now()
       WHERE tenant_id = p_tenant_id AND id = v_po_line_id
       RETURNING purchase_order_id INTO v_po_id_scratch;
      IF v_po_id_scratch IS NOT NULL
         AND NOT (v_po_id_scratch = ANY(v_touched_po_ids)) THEN
        v_touched_po_ids := array_append(v_touched_po_ids, v_po_id_scratch);
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_touched_po_ids, 1) > 0 THEN
    WITH agg AS (
      SELECT purchase_order_id AS po_id,
             bool_and(qty_received >= qty_ordered) AS all_full,
             bool_or(qty_received > 0)             AS any_received
        FROM purchase_order_line
       WHERE tenant_id = p_tenant_id
         AND purchase_order_id = ANY(v_touched_po_ids)
       GROUP BY purchase_order_id
    )
    UPDATE purchase_order po
       SET status = CASE
                     WHEN agg.all_full     THEN 'fully_received'
                     WHEN agg.any_received THEN 'partial'
                     ELSE po.status
                   END,
           updated_at = now()
      FROM agg
     WHERE po.id = agg.po_id
       AND po.tenant_id = p_tenant_id
       AND po.status IN ('sent','partial');
  END IF;

  UPDATE purchase_receipt pr
     SET discrepancy_status = (
           SELECT CASE
                    WHEN bool_or(discrepancy_qty > 0) AND bool_or(discrepancy_qty < 0) THEN 'mixed'
                    WHEN bool_or(discrepancy_qty > 0)                                  THEN 'short'
                    WHEN bool_or(discrepancy_qty < 0)                                  THEN 'over'
                    ELSE                                                                    'none'
                  END
             FROM purchase_receipt_line
            WHERE tenant_id = p_tenant_id AND receipt_id = v_receipt_id
         ),
         updated_at = now()
   WHERE pr.id = v_receipt_id AND pr.tenant_id = p_tenant_id;

  -- M1_INVENTORY_DEBT_DECOUPLING: supplier_debt PERFORM REMOVED.
  -- Inventory module does NOT create debt rows. The supplier-debt module
  -- pulls from purchase_receipt on its own side and matches documents
  -- independently.

  RETURN v_receipt_id;
END;
$function$;

COMMENT ON FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid, boolean) IS
  '9-arg variant adding p_has_no_invoice (M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17 commit 1, 2026-05-17). Resolves F-2 from SPEC 4a — eliminates the 2-step UPDATE workaround in lens-inventory drawer onSubmit. The 8-arg variant is being dropped in commit 3 of this SPEC.';
