# MIGRATION — M1_LENS_PHASE_2_COMPLETION

> **Scope:** Part B (RPC harmonization — `record_adjustment_found` redefinition) + Part C (FK index sweep — ~31 partial indexes on M1 Lens tables). Part A is code-only (no DB DDL). Part D may add 1-2 permission rows (DML, not DDL) — recorded in §D below if applied.
>
> **Applied via:** Supabase MCP. Primary path = `apply_migration`. Fallback per P-AUTHOR-2 (GAP_CLOSURE) = `execute_sql` on `23505 schema_migrations_pkey` concurrent collision; document the fallback below in §Applied Log.
>
> **Tenant safety:** Prizma row counts captured before + after each block; delta = 0 required for B + C (DDL only).

---

## Block B — `record_adjustment_found` harmonization

**Pre-state probe (run by executor at Stage 3 start):**

```sql
SELECT proname,
       pg_get_function_identity_arguments(oid) AS args,
       pg_get_function_result(oid) AS return_type,
       proacl::text AS acl
  FROM pg_proc
 WHERE proname = 'record_adjustment_found' AND pronamespace = 'public'::regnamespace;
```

**Expected pre-state (captured by Foreman at SPEC seal time, 2026-05-15 night):**
- args: `p_tenant_id uuid, p_variant_id uuid, p_location_id uuid, p_qty_found integer, p_reason text DEFAULT NULL::text, p_performed_by uuid DEFAULT NULL::uuid, p_sph numeric DEFAULT NULL::numeric, p_cyl numeric DEFAULT NULL::numeric, p_add_value numeric DEFAULT NULL::numeric`
- return_type: `uuid` (returns movement_id under old body)
- acl: `{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}`

**Seed pre-flight (executor — verify Day-1 +1 direction reason exists per tenant):**

```sql
SELECT tenant_id, count(*) AS plus_one_active_reasons
  FROM stock_adjustment_reason
 WHERE is_active = true AND direction = 1
 GROUP BY tenant_id;
```

Expected: ≥1 row per tenant (demo + prizma). If 0 for either → INSERT 1 row per missing tenant before Block B-2, using the canonical seed pattern from GAP_CLOSURE (`code='count_found', label='נמצא בספירה', direction=1, is_active=true`).

**Block B-2 (new RPC body):**

```sql
CREATE OR REPLACE FUNCTION public.record_adjustment_found(
  p_tenant_id      uuid,
  p_variant_id     uuid,
  p_location_id    uuid,
  p_qty_found      integer,
  p_reason_id      uuid,
  p_performed_by   uuid     DEFAULT NULL,
  p_notes          text     DEFAULT NULL,
  p_sph            numeric  DEFAULT NULL,
  p_cyl            numeric  DEFAULT NULL,
  p_add_value      numeric  DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_tenant     uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'),'')::uuid;
  v_adjustment_id  uuid;
  v_movement_id    uuid;
  v_unit_cost      numeric(12,4) := 0;
  v_reason_dir     smallint;
  v_lot_id         uuid;
BEGIN
  -- Block A: JWT-claim tenant guard (canonical pattern, byte-identical to record_adjustment_lost)
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

  -- Block B: input validation
  IF p_qty_found <= 0 THEN
    RAISE EXCEPTION 'p_qty_found must be positive' USING ERRCODE = 'P0001';
  END IF;

  SELECT direction INTO v_reason_dir
    FROM stock_adjustment_reason
   WHERE id = p_reason_id AND tenant_id = p_tenant_id AND is_active = true;
  IF v_reason_dir IS NULL THEN
    RAISE EXCEPTION 'reason_id not active or wrong tenant' USING ERRCODE = '23503';
  END IF;
  IF v_reason_dir <> 1 THEN
    RAISE EXCEPTION 'reason direction must be +1 for record_adjustment_found' USING ERRCODE = 'P0001';
  END IF;

  -- Block C: lookup unit_cost from active supplier_catalog_offering (best-effort; default 0)
  SELECT price_amount INTO v_unit_cost
    FROM supplier_catalog_offering
   WHERE tenant_id = p_tenant_id AND variant_id = p_variant_id
     AND status = 'active' AND is_deleted = false
   ORDER BY effective_from DESC
   LIMIT 1;
  IF v_unit_cost IS NULL THEN v_unit_cost := 0; END IF;

  -- Block D: create the NEW stock_lot (this is the semantic difference vs _lost — _found creates, _lost consumes)
  INSERT INTO stock_lot(
    tenant_id, variant_id, location_id, origin_type,
    qty_received, qty_remaining, unit_cost, lot_number,
    received_at, notes
  ) VALUES (
    p_tenant_id, p_variant_id, p_location_id, 'adjustment_found',
    p_qty_found, p_qty_found, v_unit_cost, next_lot_number(p_tenant_id),
    now(), 'adjustment_found: ' || COALESCE(p_notes, '')
  ) RETURNING id INTO v_lot_id;

  -- Block E: insert audit row in stock_adjustment (mirrors _lost Block D semantics)
  INSERT INTO stock_adjustment(
    tenant_id, reason_id, variant_id, location_id, stock_lot_id, qty_delta, notes, performed_by
  ) VALUES (
    p_tenant_id, p_reason_id, p_variant_id, p_location_id, v_lot_id, +p_qty_found, p_notes, p_performed_by
  ) RETURNING id INTO v_adjustment_id;

  -- Block F: delegate stock_movement insertion + TLS UPSERT to record_stock_movement
  --   note: _found is a "creation movement" (movement_type IN receipt/transfer_in/adjustment_found)
  --   so record_stock_movement will NOT decrement the lot (correct — we just created it with full qty).
  v_movement_id := record_stock_movement(
    p_tenant_id, v_lot_id, p_variant_id, p_location_id,
    'adjustment_found', +p_qty_found,
    NULL, NULL, NULL, NULL, v_adjustment_id,
    v_unit_cost, NULL, NULL,
    p_performed_by, p_notes,
    p_sph, p_cyl, p_add_value
  );

  RETURN v_adjustment_id;
END;
$function$;

-- ACL: canonical pattern (matches record_adjustment_lost)
REVOKE EXECUTE ON FUNCTION public.record_adjustment_found(uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_adjustment_found(uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) FROM anon;
GRANT  EXECUTE ON FUNCTION public.record_adjustment_found(uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) TO authenticated;
```

**Note on overload elimination:** the old 9-param signature must be dropped explicitly because `CREATE OR REPLACE` only replaces an exact-signature match. Add:

```sql
DROP FUNCTION IF EXISTS public.record_adjustment_found(uuid, uuid, uuid, integer, text, uuid, numeric, numeric, numeric);
```

before the `CREATE OR REPLACE`. Verified breaking-FREE for runtime because Probe P7 captured 0 JS/HTML callers at SPEC seal time. Document any caller surface that emerges post-Block-B-2 as a Stop-on-Deviation in EXECUTION_REPORT.

**Block B-3 (functional smoke on demo — DO block, executor runs as authenticated demo CEO):**

```sql
DO $$
DECLARE
  v_tenant_id     uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';  -- demo
  v_variant_id    uuid;
  v_location_id   uuid;
  v_reason_id     uuid;
  v_lot_id        uuid;
  v_adj_id        uuid;
  v_adj_row       record;
  v_lot_row       record;
  v_mov_row       record;
BEGIN
  -- pick test fixtures from demo
  SELECT id INTO v_variant_id FROM lens_variant WHERE tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_location_id FROM tenant_location WHERE tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_reason_id FROM stock_adjustment_reason
   WHERE tenant_id = v_tenant_id AND is_active = true AND direction = 1 LIMIT 1;

  -- call new record_adjustment_found
  v_adj_id := record_adjustment_found(
    v_tenant_id, v_variant_id, v_location_id, 3, v_reason_id, NULL, 'smoke test', NULL, NULL, NULL
  );

  -- assert: stock_adjustment row created with qty_delta=+3
  SELECT * INTO v_adj_row FROM stock_adjustment WHERE id = v_adj_id;
  IF v_adj_row.qty_delta <> 3 THEN RAISE EXCEPTION 'B6 FAIL: qty_delta=%, expected 3', v_adj_row.qty_delta; END IF;

  -- assert: new stock_lot row with origin_type='adjustment_found' qty_received=3
  SELECT * INTO v_lot_row FROM stock_lot WHERE id = v_adj_row.stock_lot_id;
  IF v_lot_row.origin_type <> 'adjustment_found' OR v_lot_row.qty_received <> 3 THEN
    RAISE EXCEPTION 'B6 FAIL: lot origin=% qty_received=%', v_lot_row.origin_type, v_lot_row.qty_received;
  END IF;

  -- assert: stock_movement row linked to adjustment_id
  SELECT * INTO v_mov_row FROM stock_movement WHERE adjustment_id = v_adj_id;
  IF v_mov_row.movement_type <> 'adjustment_found' OR v_mov_row.qty_delta <> 3 THEN
    RAISE EXCEPTION 'B6 FAIL: movement type=% qty_delta=%', v_mov_row.movement_type, v_mov_row.qty_delta;
  END IF;

  RAISE NOTICE 'B6 PASS: adjustment_id=% lot_id=% movement_id=%', v_adj_id, v_lot_row.id, v_mov_row.id;
END $$;
```

**Block B-7 (anon-reject — executor runs from anon role):**

```sql
SET LOCAL role = 'anon';
SELECT record_adjustment_found('00000000-0000-0000-0000-000000000000'::uuid, ...);
-- expected: ERROR 42501 Unauthorized: tenant_id mismatch (Block A fires because anon has no jwt.claims)
RESET role;
```

---

## Block C — FK index sweep (M1 Lens scope)

**Pre-state probe (executor re-runs at Stage 4 start):**

```sql
WITH fk_cols AS (
  SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name, con.conname AS fk_name
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
   WHERE con.contype = 'f' AND n.nspname = 'public'
),
indexed AS (
  SELECT DISTINCT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name
    FROM pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN unnest(x.indkey) WITH ORDINALITY AS k(attnum, ord) ON ord = 1
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
   WHERE n.nspname = 'public'
)
SELECT f.table_name, f.column_name, f.fk_name
  FROM fk_cols f LEFT JOIN indexed i USING (schema_name, table_name, column_name)
 WHERE i.column_name IS NULL
   AND f.table_name IN (
     'stock_adjustment','stock_lot','stock_movement','stock_transfer',
     'purchase_order','purchase_order_line','purchase_receipt','purchase_receipt_line',
     'supplier_debt','supplier_catalog_offering','lens_variant',
     'pricing_overlay','tenant_active_offerings','pending_lens_advancement_queue'
   )
 ORDER BY f.table_name, f.column_name;
```

Expected: 25-35 rows (Foreman captured 31 at 2026-05-15 night per §0.D).

**Block C-2 (single migration — partial indexes):**

For every row returned by the probe, emit:

```sql
CREATE INDEX IF NOT EXISTS idx_<table>_<col>
    ON public.<table> (<col>) WHERE <col> IS NOT NULL;
```

Executor MUST emit all indexes in ONE migration call (single MCP `apply_migration` invocation). If apply_migration returns 23505 PK collision, retry as `execute_sql` per P-AUTHOR-2.

**Block C-5 (post-state probe — verify Part C closed):**

Re-run the Block C pre-state probe. Expected: 0 rows in M1 Lens scope.

---

## Block D — Permission keys (only if Part D adds them)

If Part D requires a new permission key (e.g. `lens.menu.view` or per-screen `lens.<screen>.view`):

```sql
-- pattern A: per-screen permission key (preferred — matches existing Phase 1A/1B granularity)
INSERT INTO permissions(key, label, description, scope_type, is_active)
VALUES ('lens.<screen>.view', 'צפייה ב<screen>', 'View access to lens <screen> page', 'tenant', true)
ON CONFLICT (key) DO NOTHING;

-- per-tenant role_permissions seed (CEO + manager get all; lower roles get inventory.view only)
INSERT INTO role_permissions(tenant_id, role_id, permission_id) ...
ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
```

**Constraint:** Brief §4 item 6 caps new permission keys at "1-2" total for Part D. If more than 2 needed → Tier 4 escalate.

---

## Applied Log

Executor fills this in as Block B / C / D apply:

| Block | Method | Timestamp (UTC) | Status | Notes (fallback path? PK collision? row deltas?) |
|---|---|---|---|---|
| B pre-state probe | execute_sql | _yyyy-mm-ddThh:mm:ssZ_ | _PASS/FAIL_ | _free text_ |
| B seed pre-flight | execute_sql | | | |
| B-2 RPC redef | apply_migration | | | _record collision-and-fallback if encountered_ |
| B-3 smoke | execute_sql DO | | | _capture adjustment_id, lot_id, movement_id_ |
| B-7 anon-reject | execute_sql SET LOCAL role | | | _capture 42501_ |
| C pre-state probe | execute_sql | | | _capture exact row count_ |
| C-2 index sweep | apply_migration | | | _N indexes created_ |
| C-5 post-state probe | execute_sql | | | _expect 0 in M1 Lens scope_ |
| D INSERT permissions (if any) | execute_sql | | | _key list_ |
| D INSERT role_permissions (if any) | execute_sql | | | _row count_ |

---

## Prizma Invariant Log

Executor captures Prizma row counts (sum across touched tables) before Block B and again after Block D for invariance:

| Phase | Timestamp | `stock_adjustment` (prizma) | `stock_adjustment_reason` (prizma) | `stock_lot` (prizma) | `stock_movement` (prizma) |
|---|---|---|---|---|---|
| Pre-B | | | | | |
| Post-B | | | | | |
| Post-C | | | | | |
| Post-D | | | | | |

Delta = 0 across all rows = ✅. Any non-zero delta = Tier 4 halt.

---

*End of MIGRATION.md scaffold. Executor fills in §Applied Log + §Prizma Invariant Log per progress. ROLLBACK.md will be added by executor IF Tier 3 deferral or Tier 5 rollback fires.*
