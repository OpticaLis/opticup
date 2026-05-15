# ROLLBACK.md — M1_LENS_PHASE_1B_GAP_CLOSURE

> Audit-only ROLLBACK plan. Not executed unless a 🔴 verdict surfaces.

---

## 1. Code rollback

Each commit is single-concern. Revert per commit hash:

```bash
git revert <commit_hash>          # one-step revert per failing commit
git push origin develop
```

Order (newest → oldest):

| Commit | Revert effect |
|---|---|
| C9 close | Reverts EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + SESSION_CONTEXT + CHANGELOG diffs |
| C8 smoke TEST_REPORT | Reverts TEST_REPORT.md only |
| C7 SUPERSEDED markers | Removes SUPERSEDED header lines from 4 files |
| C6 lens-inventory-modals.js UI wiring | Restores Phase 2 toast block, removes RPC call |
| C5 K2 body | Reverts to pre-replace body of `m1_create_receipt_from_box` — see §3 below for DB-side rollback |
| C4 ALTER drop NOT NULL | DB-side rollback needed — see §3 |
| C3 record_adjustment_lost RPC | DB-side `DROP FUNCTION` — see §3 |
| C2 stock_adjustment tables | DB-side `DROP TABLE` — see §3 |
| C1 open SPEC | Removes SPEC folder |

---

## 2. Smoke artifact cleanup (only if rolling back)

Smoke fixtures on demo persist per M1A-DEBT-04 precedent. If rollback is required, clean smoke artifacts first:

```sql
-- 1. Delete smoke-created stock_adjustment rows (demo only)
DELETE FROM stock_movement WHERE movement_type='adjustment_lost' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
DELETE FROM stock_adjustment WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- 2. Revert stock_lot.qty_remaining + tenant_lens_stock.qty_on_hand decrements
--    (look up the smoke-test lot ID + qty from TEST_REPORT.md before running)
-- UPDATE stock_lot SET qty_remaining = qty_remaining + <smoke_qty_lost> WHERE id = '<smoke_lot_id>' AND tenant_id='8d8cfa7e-…';
-- UPDATE tenant_lens_stock SET qty_on_hand = qty_on_hand + <smoke_qty_lost> WHERE id = '<smoke_tls_id>' AND tenant_id='8d8cfa7e-…';

-- 3. Delete F-2 variant-less receipt_line rows (so the ALTER DROP NOT NULL revert can succeed)
DELETE FROM purchase_receipt_line WHERE tenant_id='8d8cfa7e-…' AND variant_id IS NULL;

-- 4. Delete F-1 smoke-created PO + receipts (look up IDs from TEST_REPORT.md)
-- DELETE FROM purchase_receipt_line WHERE receipt_id IN (<f1_smoke_receipt_ids>);
-- DELETE FROM purchase_receipt WHERE id IN (<f1_smoke_receipt_ids>);
-- DELETE FROM purchase_order_line WHERE po_id IN (<f1_smoke_po_ids>);
-- DELETE FROM purchase_order WHERE id IN (<f1_smoke_po_ids>);
```

---

## 3. DB-side rollback DDL

Run in REVERSE block order:

### Block 4 rollback — Restore previous `m1_create_receipt_from_box` body

Snapshot taken at Pre-Flight (SPEC §0.A Probe 10):

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
)
 RETURNS uuid
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
  v_subtotal NUMERIC(14,4) := 0;
  v_vat_rate NUMERIC(6,3);
  v_vat_amount NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
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
      NULL,
      v_receipt_id,
      NULL, NULL,
      (v_line->>'unit_cost')::NUMERIC,
      NULL, NULL, p_confirmed_by, NULL,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC
    );
    v_subtotal := v_subtotal + ((v_line->>'qty_received')::NUMERIC * (v_line->>'unit_cost')::NUMERIC);
  END LOOP;
  SELECT rate_pct INTO v_vat_rate
    FROM vat_rates
   WHERE country_code = 'IL'
     AND (effective_until IS NULL OR effective_until > CURRENT_DATE)
   ORDER BY effective_from DESC
   LIMIT 1;
  v_vat_amount := ROUND(v_subtotal * COALESCE(v_vat_rate, 0) / 100, 2);
  v_total_amount := ROUND(v_subtotal + v_vat_amount, 2);
  PERFORM m1_create_supplier_debt_from_receipt(
    p_tenant_id, v_receipt_id, v_total_amount, v_vat_amount, 'ILS'
  );
  RETURN v_receipt_id;
END;
$function$;
```

### Block 3 rollback — Restore `variant_id NOT NULL`

```sql
-- Prerequisite: clean smoke artifacts (§2 step 3) first, otherwise this fails.
ALTER TABLE purchase_receipt_line ALTER COLUMN variant_id SET NOT NULL;
```

### Block 2 rollback — Drop the new RPC

```sql
DROP FUNCTION IF EXISTS public.record_adjustment_lost(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric);
```

### Block 1 rollback — Drop tables (smoke must be cleaned first per §2)

```sql
-- Prerequisite: §2 step 1 must have deleted all stock_adjustment + stock_movement(adjustment_lost) rows on demo
DROP INDEX IF EXISTS idx_stock_adj_tenant_lot;
DROP INDEX IF EXISTS idx_stock_adj_tenant_variant;
DROP TABLE IF EXISTS public.stock_adjustment;

DROP INDEX IF EXISTS idx_stock_adj_reason_tenant;
DROP TABLE IF EXISTS public.stock_adjustment_reason;
```

---

## 4. Verification post-rollback

```sql
-- Confirm tables removed
SELECT to_regclass('public.stock_adjustment'), to_regclass('public.stock_adjustment_reason');
-- Expected: both NULL

-- Confirm RPC removed
SELECT count(*) FROM pg_proc WHERE proname='record_adjustment_lost';
-- Expected: 0

-- Confirm variant_id back to NOT NULL
SELECT is_nullable FROM information_schema.columns
 WHERE table_name='purchase_receipt_line' AND column_name='variant_id';
-- Expected: 'NO'

-- Confirm K2 body reverted (substring check)
SELECT (SELECT 1 FROM pg_proc WHERE proname='m1_create_receipt_from_box' AND prosrc NOT LIKE '%discrepancy_status%')
-- Expected: 1 (substring absent in rolled-back body)
```

---

*End of ROLLBACK.md. Audit-only — pipeline expected to close 🟢 without invocation.*
