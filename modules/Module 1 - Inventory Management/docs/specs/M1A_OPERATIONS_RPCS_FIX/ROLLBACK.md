# ROLLBACK.md — M1A_OPERATIONS_RPCS_FIX

> If the SPEC fails partway through and must be reverted, apply the DOWN blocks below in REVERSE order (Block #5 first, then #4, #3, #2, #1). Each block restores the pre-SPEC state captured by §0 Pre-Authoring Reality Check on 2026-05-15.
>
> Top-level git rollback: `git reset --hard <START_COMMIT>` where START_COMMIT is the commit hash the Executor records at Step 0 (HEAD of `develop` BEFORE Commit #1). Then push as a single `revert(m1): rollback M1A_OPERATIONS_RPCS_FIX` commit.
>
> Iron Rule 32 note: this ROLLBACK file contains DROP / GRANT-restoring DDL inside ```sql fences. The doc-context allowlist accepts ROLLBACK.md automatically; do NOT extract the SQL into a standalone `_down.sql` (would trigger the destructive-ops gate).

---

## Block #6 DOWN — `record_transfer` restore pre-amendment body (17-arg call form)

```sql
-- Restore pre-Amendment-#1 record_transfer body (the original 17-positional-arg form).
-- WARNING: the pre-amendment body raises 42883 at runtime per discovery 2026-05-15.
-- This DOWN block is for symmetry only; rolling back Fix #9 re-introduces the runtime bug.
CREATE OR REPLACE FUNCTION public.record_transfer(
  p_tenant_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_variant_id uuid,
  p_qty_sent integer,
  p_source_lot_id uuid,
  p_initiated_by uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer_id UUID;
  v_transfer_number TEXT;
  v_dest_lot_id UUID;
  v_source_unit_cost NUMERIC(12,4);
  v_source_received_at TIMESTAMPTZ;
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
    qty_received, qty_remaining, unit_cost, lot_number,
    received_at, original_lot_id
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
$function$;
```

---

## Block #5 DOWN — K3 queue idempotency

```sql
-- Restore trigger fn to plain INSERT (no ON CONFLICT).
CREATE OR REPLACE FUNCTION public.m9_lens_received_for_sale_order_trg_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sale_order_id IS NOT NULL AND NEW.purchase_receipt_id IS NOT NULL THEN
    INSERT INTO pending_lens_advancement_queue(
      tenant_id, sale_order_id, purchase_receipt_id, stock_movement_id
    ) VALUES (
      NEW.tenant_id, NEW.sale_order_id, NEW.purchase_receipt_id, NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.m9_lens_received_for_sale_order_trg_fn() FROM PUBLIC, anon, authenticated;

-- Drop the idempotency index.
DROP INDEX IF EXISTS public.pending_lens_advancement_queue_stock_movement_unique;
```

---

## Block #4 DOWN — `v_suppliers_for_m9` restore default grants

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.v_suppliers_for_m9 TO PUBLIC, anon, authenticated;
```

(This restores the pre-SPEC anon+PUBLIC ACL captured in §0 BASE_V9_GRANTS. service_role + postgres ACL was not modified by Block #4 — no restore needed.)

---

## Block #3 DOWN — `next_lens_variant_display_id` remove JWT guard

```sql
CREATE OR REPLACE FUNCTION public.next_lens_variant_display_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next BIGINT;
  v_display_id TEXT;
BEGIN
  -- Atomic increment with FOR UPDATE lock (Iron Rule 11)
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
$function$;
-- DOWN does NOT restore PUBLIC EXECUTE — Block #2 DOWN will handle that.
```

---

## Block #2 DOWN — re-GRANT EXECUTE to PUBLIC + anon + authenticated on all 10 functions

```sql
GRANT EXECUTE ON FUNCTION public.effective_price(p_offering_id uuid, p_tenant_id uuid, p_as_of_ts timestamp with time zone) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m1_create_receipt_from_box(p_tenant_id uuid, p_supplier_id uuid, p_delivery_note_number text, p_lines jsonb, p_box_id uuid, p_box_supplier_barcode text, p_supplier_number text, p_confirmed_by uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m9_lens_received_for_sale_order_trg_fn() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_lens_variant_display_id() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_lot_number(p_tenant_id uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(p_tenant_id uuid, p_supplier_number text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_transfer_number(p_tenant_id uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_adjustment_found(p_tenant_id uuid, p_variant_id uuid, p_location_id uuid, p_qty_found integer, p_reason text, p_performed_by uuid, p_sph numeric, p_cyl numeric, p_add_value numeric) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(p_tenant_id uuid, p_source_lot_id uuid, p_variant_id uuid, p_location_id uuid, p_movement_type text, p_qty_delta integer, p_sale_order_id uuid, p_customer_return_id uuid, p_purchase_receipt_id uuid, p_transfer_id uuid, p_adjustment_id uuid, p_cost_basis numeric, p_vat_amount numeric, p_fx_rate_snapshot numeric, p_performed_by uuid, p_notes text, p_sph numeric, p_cyl numeric, p_add_value numeric) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_transfer(p_tenant_id uuid, p_from_location_id uuid, p_to_location_id uuid, p_variant_id uuid, p_qty_sent integer, p_source_lot_id uuid, p_initiated_by uuid, p_notes text) TO PUBLIC, anon, authenticated;
```

---

## Block #1 DOWN — restore original (buggy) `record_stock_movement` body

```sql
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_tenant_id uuid, p_source_lot_id uuid, p_variant_id uuid, p_location_id uuid,
  p_movement_type text, p_qty_delta integer,
  p_sale_order_id uuid DEFAULT NULL::uuid, p_customer_return_id uuid DEFAULT NULL::uuid,
  p_purchase_receipt_id uuid DEFAULT NULL::uuid, p_transfer_id uuid DEFAULT NULL::uuid,
  p_adjustment_id uuid DEFAULT NULL::uuid,
  p_cost_basis numeric DEFAULT NULL::numeric, p_vat_amount numeric DEFAULT NULL::numeric,
  p_fx_rate_snapshot numeric DEFAULT NULL::numeric,
  p_performed_by uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text,
  p_sph numeric DEFAULT NULL::numeric, p_cyl numeric DEFAULT NULL::numeric,
  p_add_value numeric DEFAULT NULL::numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_movement_id UUID;
  v_lot_qty_remaining INT;
  v_lot_tenant_id UUID;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  -- Lock the lot row, validate tenant ownership
  SELECT tenant_id, qty_remaining INTO v_lot_tenant_id, v_lot_qty_remaining
    FROM stock_lot WHERE id = p_source_lot_id FOR UPDATE;
  IF v_lot_tenant_id IS NULL THEN
    RAISE EXCEPTION 'stock_lot % not found', p_source_lot_id USING ERRCODE = '23503';
  END IF;
  IF v_lot_tenant_id <> p_tenant_id THEN
    RAISE EXCEPTION 'cross-tenant stock_lot access denied' USING ERRCODE = '42501';
  END IF;
  -- For outflows, ensure non-negative remaining (Iron Rule 1)
  IF p_qty_delta < 0 AND (v_lot_qty_remaining + p_qty_delta) < 0 THEN
    RAISE EXCEPTION 'insufficient stock_lot.qty_remaining (% + % < 0)', v_lot_qty_remaining, p_qty_delta
      USING ERRCODE = 'P0001';
  END IF;
  -- INSERT the movement
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
  -- Update lot remaining (BUGGY: unconditional)
  UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta, updated_at = now()
    WHERE id = p_source_lot_id;
  -- Upsert tenant_lens_stock.qty_on_hand projection (BUGGY: no WHERE predicate)
  INSERT INTO tenant_lens_stock(tenant_id, variant_id, location_id, sph, cyl, add_value, qty_on_hand)
    VALUES (p_tenant_id, p_variant_id, p_location_id,
            COALESCE(p_sph, 0), p_cyl, p_add_value, GREATEST(0, p_qty_delta))
    ON CONFLICT (tenant_id, variant_id, location_id, sph, cyl, add_value)
      DO UPDATE SET qty_on_hand = GREATEST(0, tenant_lens_stock.qty_on_hand + p_qty_delta),
                    updated_at = now();
  RETURN v_movement_id;
END;
$function$;
```

---

## File-level rollback (Fix #6 + Fix #7)

- Fix #6 — `supabase/config.toml`: remove the `[functions.lens-catalog-import]` block added by Commit #8.
- Fix #7 — `supabase/functions/lens-catalog-import/index.ts`: `git checkout <START_COMMIT> -- supabase/functions/lens-catalog-import/index.ts` then redeploy via `mcp__claude_ai_Supabase__deploy_edge_function` (or CLI fallback) with `verify_jwt: true` (NOTE: the pre-SPEC EF was deployed with default verify_jwt; after rollback the config.toml block is gone too, so the default for redeploy is what Supabase's MCP defaults give).

---

*End of ROLLBACK.md.*
