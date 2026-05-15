# ROLLBACK.md — M1B0_PURCHASE_ORDER_SCHEMA

> **Purpose:** Per-block DOWN steps for catastrophic-failure recovery.
> **Authored on:** 2026-05-15 (alongside SPEC.md).
> **Status:** Reference-only after Pipeline closes 🟢. If 🔴, used for live rollback.

## Execution-order for full rollback

If the Pipeline must be reverted entirely:

1. **Block 10 (K2 restore)** — re-apply pre-M1B0 K2 body BEFORE any other rollback step.
2. **Blocks 5–9 (5 new RPCs)** — `DROP FUNCTION` each.
3. **Block 4 (FK back-pointers)** — `ALTER TABLE … DROP CONSTRAINT` × 2 + `DROP INDEX` × 2.
4. **Blocks 1–3 (3 new tables)** — `DROP TABLE … CASCADE` each.

Reverse-dependency order. Tables depend on FKs depend on RPCs depend on K2 wiring.

---

## Block 10 — K2 (`m1_create_receipt_from_box`) restore to pre-M1B0 body

**Pre-M1B0 body captured at SPEC §0 Probe 6 (2026-05-15).** Re-apply via `CREATE OR REPLACE FUNCTION` with the EXACT original signature — preserves grants, no name collision.

```sql
CREATE OR REPLACE FUNCTION public.m1_create_receipt_from_box(
  p_tenant_id uuid,
  p_supplier_id uuid,
  p_delivery_note_number text,
  p_lines jsonb,
  p_box_id uuid DEFAULT NULL::uuid,
  p_box_supplier_barcode text DEFAULT NULL::text,
  p_supplier_number text DEFAULT NULL::text,
  p_confirmed_by uuid DEFAULT NULL::uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_receipt_id UUID;
  v_receipt_number TEXT;
  v_line JSONB;
  v_lot_id UUID;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_receipt_number := next_receipt_number(p_tenant_id, p_supplier_number);
  INSERT INTO purchase_receipt(
    tenant_id, supplier_id, receipt_number, delivery_note_number,
    shipping_box_id, shipping_box_supplier_barcode,
    status, confirmed_by, confirmed_at
  ) VALUES (
    p_tenant_id, p_supplier_id, v_receipt_number, p_delivery_note_number,
    p_box_id, p_box_supplier_barcode,
    'confirmed', p_confirmed_by, now()
  ) RETURNING id INTO v_receipt_id;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO stock_lot(
      tenant_id, variant_id, location_id, origin_type,
      purchase_receipt_id, qty_received, qty_remaining, unit_cost, lot_number, received_at
    ) VALUES (
      p_tenant_id,
      (v_line->>'variant_id')::UUID,
      (v_line->>'location_id')::UUID,
      'purchase',
      v_receipt_id,
      (v_line->>'qty_received')::INT,
      (v_line->>'qty_received')::INT,
      (v_line->>'unit_cost')::NUMERIC,
      next_lot_number(p_tenant_id),
      now()
    ) RETURNING id INTO v_lot_id;
    INSERT INTO purchase_receipt_line(
      tenant_id, receipt_id, variant_id, location_id,
      sph, cyl, add_value,
      qty_received, unit_cost,
      sale_order_id, stock_lot_id
    ) VALUES (
      p_tenant_id, v_receipt_id,
      (v_line->>'variant_id')::UUID,
      (v_line->>'location_id')::UUID,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC,
      (v_line->>'qty_received')::INT,
      (v_line->>'unit_cost')::NUMERIC,
      NULLIF(v_line->>'sale_order_id','')::UUID,
      v_lot_id
    );
    PERFORM record_stock_movement(
      p_tenant_id, v_lot_id,
      (v_line->>'variant_id')::UUID,
      (v_line->>'location_id')::UUID,
      'receipt',
      (v_line->>'qty_received')::INT,
      NULLIF(v_line->>'sale_order_id','')::UUID,
      NULL, v_receipt_id, NULL, NULL,
      (v_line->>'unit_cost')::NUMERIC,
      NULL, NULL, p_confirmed_by, NULL,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC
    );
  END LOOP;
  RETURN v_receipt_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid) TO authenticated;
```

---

## Blocks 5–9 — DROP the 5 new RPCs

```sql
DROP FUNCTION IF EXISTS public.m1_create_supplier_debt_from_receipt(UUID, UUID, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.cancel_purchase_order(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.mark_po_sent(UUID, UUID);
DROP FUNCTION IF EXISTS public.place_purchase_order(UUID, UUID, JSONB, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS public.next_purchase_order_number(UUID);
```

---

## Block 4 — Detach FK back-pointers

```sql
ALTER TABLE public.purchase_receipt DROP CONSTRAINT IF EXISTS purchase_receipt_purchase_order_fk;
DROP INDEX IF EXISTS public.purchase_receipt_purchase_order_idx;

ALTER TABLE public.stock_lot DROP CONSTRAINT IF EXISTS stock_lot_purchase_order_fk;
DROP INDEX IF EXISTS public.stock_lot_purchase_order_idx;
```

Columns `stock_lot.purchase_order_id` + `purchase_receipt.purchase_order_id` are NOT dropped — they pre-existed M1B0 (Phase 1A phantoms).

---

## Blocks 1–3 — DROP the 3 new tables

```sql
DROP TABLE IF EXISTS public.supplier_debt CASCADE;
DROP TABLE IF EXISTS public.purchase_order_line CASCADE;
DROP TABLE IF EXISTS public.purchase_order CASCADE;
```

CASCADE drops dependent objects (triggers, indexes, policies, UNIQUEs) automatically.

---

## File-layer rollback

If file commits also need reverting:

```bash
# Revert FIELD_MAP + T-constant additions
git revert <commit-6-hash>

# Revert global doc updates (GLOBAL_MAP, SESSION_CONTEXT, CHANGELOG, db-schema.sql)
git revert <commit-8-hash>
```

Or, for a full pipeline revert: `git reset --hard a29b93d` (the chain-head BEFORE M1B0). **NOTE:** `git reset --hard` is destructive; requires Daniel authorization per Iron Rule 32. This is an emergency-only path.

---

*End of ROLLBACK.md. Audit-only if Pipeline closes 🟢.*
