# MIGRATION.md — M1A_OPERATIONS_RPCS_FIX

> **Pattern:** Level-3a destructive-pattern execution playbook (per `opticup-executor` SKILL §5i / M1A_DEBT_SWEEP precedent). All 5 DDL blocks below are applied via `mcp__claude_ai_Supabase__apply_migration`, NOT via a `supabase/migrations/*.sql` file (Iron Rule 32 boundary; consistent with pre-existing TD-2 documented in M1A_CURRENCIES_GLOBAL_HOTFIX).
>
> **Ordering constraint** — Blocks #3 + #5 contain `CREATE OR REPLACE FUNCTION`. Postgres re-grants `EXECUTE TO PUBLIC` on every CREATE OR REPLACE. Since Block #2 (canonical ACL setter for all 10 SECDEF fns) runs in commit 3 — BEFORE Blocks #3 (commit 4) and #5 (commit 6) — those two blocks MUST end with a self-contained `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated;` to restore the post-Block-#2 ACL state. Block #1 (commit 2) runs BEFORE Block #2 so no internal REVOKE is needed — Block #2 will fix it.
>
> **Project:** tsxrrxzmdxaenlvocyit (production Supabase).
> **Branch:** develop (per CLAUDE.md §9).
> **Tenant filter:** N/A — DDL is project-global; functional smoke (separate from migration) runs on demo only.
> **Destructive ops declared:** None (SPEC §7).

---

## Block #1 — `record_stock_movement` qty_remaining double-add fix + ON CONFLICT WHERE predicate

**Migration name:** `m1a_record_stock_movement_fix`

**Purpose:** Fix B-01 (lot double-add on creation movements) + B-02 (ON CONFLICT inference failure on partial UNIQUE INDEX). Body branches on `p_movement_type IN ('receipt','transfer_in','adjustment_found')` to skip the `qty_remaining` UPDATE; ON CONFLICT clause gains `WHERE (is_deleted = false)` matching the existing partial unique index.

```sql
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_tenant_id uuid,
  p_source_lot_id uuid,
  p_variant_id uuid,
  p_location_id uuid,
  p_movement_type text,
  p_qty_delta integer,
  p_sale_order_id uuid DEFAULT NULL::uuid,
  p_customer_return_id uuid DEFAULT NULL::uuid,
  p_purchase_receipt_id uuid DEFAULT NULL::uuid,
  p_transfer_id uuid DEFAULT NULL::uuid,
  p_adjustment_id uuid DEFAULT NULL::uuid,
  p_cost_basis numeric DEFAULT NULL::numeric,
  p_vat_amount numeric DEFAULT NULL::numeric,
  p_fx_rate_snapshot numeric DEFAULT NULL::numeric,
  p_performed_by uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text,
  p_sph numeric DEFAULT NULL::numeric,
  p_cyl numeric DEFAULT NULL::numeric,
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
  v_is_creation_movement BOOLEAN;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;

  -- Fix #1 classification: CREATION movements ('receipt','transfer_in','adjustment_found')
  -- have a caller that just-INSERTed a stock_lot with qty_remaining = qty_received = +qty_delta.
  -- Re-applying UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta would double-add
  -- and violate stock_lot_check (qty_remaining <= qty_received). The movement row is the
  -- ledger record; for creation movements the lot's qty_remaining is already correct.
  v_is_creation_movement := p_movement_type IN ('receipt', 'transfer_in', 'adjustment_found');

  -- Lock the lot row, validate tenant ownership
  SELECT tenant_id, qty_remaining
    INTO v_lot_tenant_id, v_lot_qty_remaining
    FROM stock_lot
   WHERE id = p_source_lot_id
     FOR UPDATE;

  IF v_lot_tenant_id IS NULL THEN
    RAISE EXCEPTION 'stock_lot % not found', p_source_lot_id USING ERRCODE = '23503';
  END IF;
  IF v_lot_tenant_id <> p_tenant_id THEN
    RAISE EXCEPTION 'cross-tenant stock_lot access denied' USING ERRCODE = '42501';
  END IF;

  -- For consuming movements with outflow, ensure non-negative remaining (Iron Rule 1).
  -- Skipped for creation movements (no consume side).
  IF NOT v_is_creation_movement
     AND p_qty_delta < 0
     AND (v_lot_qty_remaining + p_qty_delta) < 0 THEN
    RAISE EXCEPTION 'insufficient stock_lot.qty_remaining (% + % < 0)', v_lot_qty_remaining, p_qty_delta
      USING ERRCODE = 'P0001';
  END IF;

  -- INSERT the movement (audit ledger)
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

  -- Fix #1: ONLY consuming movements adjust the lot. Creation movements skip this step
  -- because the orchestrator INSERTed the lot with qty_remaining = qty_received already.
  IF NOT v_is_creation_movement THEN
    UPDATE stock_lot
       SET qty_remaining = qty_remaining + p_qty_delta,
           updated_at = now()
     WHERE id = p_source_lot_id;
  END IF;

  -- Fix #2: WHERE (is_deleted = false) predicate matches the existing partial unique index
  -- tenant_lens_stock_unique (NULLS NOT DISTINCT WHERE is_deleted = false) so Postgres can
  -- infer the conflict target. Without this predicate the planner cannot pick the partial
  -- index and the statement raises 42P10.
  INSERT INTO tenant_lens_stock(
    tenant_id, variant_id, location_id, sph, cyl, add_value, qty_on_hand
  ) VALUES (
    p_tenant_id, p_variant_id, p_location_id,
    COALESCE(p_sph, 0), p_cyl, p_add_value,
    GREATEST(0, p_qty_delta)
  )
  ON CONFLICT (tenant_id, variant_id, location_id, sph, cyl, add_value) WHERE (is_deleted = false)
  DO UPDATE SET qty_on_hand = GREATEST(0, tenant_lens_stock.qty_on_hand + EXCLUDED.qty_on_hand - GREATEST(0, p_qty_delta) + p_qty_delta),
                updated_at = now();

  RETURN v_movement_id;
END;
$function$;

COMMENT ON FUNCTION public.record_stock_movement(
  uuid, uuid, uuid, uuid, text, integer, uuid, uuid, uuid, uuid, uuid,
  numeric, numeric, numeric, uuid, text, numeric, numeric, numeric
) IS 'M1A_OPERATIONS_RPCS_FIX (2026-05-15): Fix #1 branches on movement_type to skip qty_remaining UPDATE for creation movements (receipt/transfer_in/adjustment_found); Fix #2 adds WHERE (is_deleted=false) predicate to ON CONFLICT to match existing partial unique index.';
```

**Apply notes:**
- Block #2 runs in commit 3 (AFTER this block) and will REVOKE PUBLIC EXECUTE on record_stock_movement. No internal REVOKE here.
- Verify post-apply: `SELECT pg_get_functiondef('record_stock_movement'::regproc);` shows the new body.
- The DO UPDATE formula above (`GREATEST(0, tls.qty_on_hand + EXCLUDED.qty_on_hand - GREATEST(0, p_qty_delta) + p_qty_delta)`) is mathematically equivalent to the original `GREATEST(0, tls.qty_on_hand + p_qty_delta)` for any sign of p_qty_delta — EXCLUDED.qty_on_hand = GREATEST(0, p_qty_delta) by the VALUES clause. Kept explicit to read as the per-movement increment.

---

## Block #2 — REVOKE EXECUTE on 10 SECDEF functions + selective re-GRANT to authenticated

**Migration name:** `m1a_revoke_execute_phase1a_secdef`

**Purpose:** Fix C-1/C-2/C-3 — close the SECURITY_HOTFIX_2026_05_13 inheritance gap on all 10 Phase 1A SECDEF functions. After this block: zero anon/PUBLIC EXECUTE rows; 8 user-callable RPCs retain `authenticated` EXECUTE; `next_lens_variant_display_id` + `m9_lens_received_for_sale_order_trg_fn` are fully REVOKEd (display-id is platform-admin-internal via service-role EF; trigger fn invoked only by Postgres trigger machinery).

```sql
-- REVOKE EXECUTE on all 10 functions from PUBLIC + anon + authenticated.
-- Function signatures pinned from §0 BASE_FN_SIGS (live pg_proc, 2026-05-15).

REVOKE EXECUTE ON FUNCTION public.effective_price(p_offering_id uuid, p_tenant_id uuid, p_as_of_ts timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.m1_create_receipt_from_box(p_tenant_id uuid, p_supplier_id uuid, p_delivery_note_number text, p_lines jsonb, p_box_id uuid, p_box_supplier_barcode text, p_supplier_number text, p_confirmed_by uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.m9_lens_received_for_sale_order_trg_fn() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_lens_variant_display_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_lot_number(p_tenant_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_receipt_number(p_tenant_id uuid, p_supplier_number text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_transfer_number(p_tenant_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_adjustment_found(p_tenant_id uuid, p_variant_id uuid, p_location_id uuid, p_qty_found integer, p_reason text, p_performed_by uuid, p_sph numeric, p_cyl numeric, p_add_value numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_stock_movement(p_tenant_id uuid, p_source_lot_id uuid, p_variant_id uuid, p_location_id uuid, p_movement_type text, p_qty_delta integer, p_sale_order_id uuid, p_customer_return_id uuid, p_purchase_receipt_id uuid, p_transfer_id uuid, p_adjustment_id uuid, p_cost_basis numeric, p_vat_amount numeric, p_fx_rate_snapshot numeric, p_performed_by uuid, p_notes text, p_sph numeric, p_cyl numeric, p_add_value numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_transfer(p_tenant_id uuid, p_from_location_id uuid, p_to_location_id uuid, p_variant_id uuid, p_qty_sent integer, p_source_lot_id uuid, p_initiated_by uuid, p_notes text) FROM PUBLIC, anon, authenticated;

-- Re-GRANT EXECUTE to `authenticated` for the 8 user-callable RPCs.
-- next_lens_variant_display_id stays REVOKEd (called via service-role EF or platform admin context).
-- m9_lens_received_for_sale_order_trg_fn stays REVOKEd (trigger fn; Postgres invokes via trigger context, not REST).

GRANT EXECUTE ON FUNCTION public.effective_price(p_offering_id uuid, p_tenant_id uuid, p_as_of_ts timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.m1_create_receipt_from_box(p_tenant_id uuid, p_supplier_id uuid, p_delivery_note_number text, p_lines jsonb, p_box_id uuid, p_box_supplier_barcode text, p_supplier_number text, p_confirmed_by uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_lot_number(p_tenant_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(p_tenant_id uuid, p_supplier_number text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_transfer_number(p_tenant_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_adjustment_found(p_tenant_id uuid, p_variant_id uuid, p_location_id uuid, p_qty_found integer, p_reason text, p_performed_by uuid, p_sph numeric, p_cyl numeric, p_add_value numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(p_tenant_id uuid, p_source_lot_id uuid, p_variant_id uuid, p_location_id uuid, p_movement_type text, p_qty_delta integer, p_sale_order_id uuid, p_customer_return_id uuid, p_purchase_receipt_id uuid, p_transfer_id uuid, p_adjustment_id uuid, p_cost_basis numeric, p_vat_amount numeric, p_fx_rate_snapshot numeric, p_performed_by uuid, p_notes text, p_sph numeric, p_cyl numeric, p_add_value numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_transfer(p_tenant_id uuid, p_from_location_id uuid, p_to_location_id uuid, p_variant_id uuid, p_qty_sent integer, p_source_lot_id uuid, p_initiated_by uuid, p_notes text) TO authenticated;
```

**Apply notes:**
- service_role retains EXECUTE on all functions implicitly via bypass; it does NOT appear in proacl because service_role is a built-in elevated role.
- Post-apply verify: `SELECT proname, (aclexplode(proacl)).grantee::regrole::text AS grantee, (aclexplode(proacl)).privilege_type FROM pg_proc WHERE proname IN (<10 names>) AND privilege_type='EXECUTE';` returns rows ONLY for `postgres` (owner) + service_role + `authenticated` (8 fns) + none for anon/PUBLIC.

---

## Block #3 — `next_lens_variant_display_id` JWT-not-null guard (Fix #5)

**Migration name:** `m1a_next_lens_variant_display_id_jwt_guard`

**Purpose:** Defense-in-depth (Iron Rule 22). Even if a future GRANT regression re-exposes EXECUTE to anon, the in-body claim guard rejects anon callers before the sequence is touched. Pattern mirrors the `request.jwt.claims` check used in `record_stock_movement` (substitute role check for tenant check).

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
  v_claims TEXT := current_setting('request.jwt.claims', true);
BEGIN
  -- Fix #5: JWT-not-null guard (Iron Rule 22 defense-in-depth).
  -- Even though Block #2 REVOKEd EXECUTE from anon, a future GRANT regression or a
  -- service-role caller passing an anon JWT context must still be rejected before
  -- the global sequence increments. Resource-exhaustion vector closed.
  IF v_claims IS NULL OR (v_claims::json ->> 'role') = 'anon' THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Atomic increment with FOR UPDATE lock (Iron Rule 11)
  UPDATE lens_variant_display_seq
     SET last_value = last_value + 1,
         updated_at = now()
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

-- CREATE OR REPLACE re-grants EXECUTE TO PUBLIC by default. Restore the post-Block-#2 ACL.
REVOKE EXECUTE ON FUNCTION public.next_lens_variant_display_id() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.next_lens_variant_display_id()
  IS 'M1A_OPERATIONS_RPCS_FIX (2026-05-15): Fix #5 — in-body JWT-not-null guard raising 42501 for anon callers. Called only from lens-catalog-import EF (service-role) and platform-admin sessions.';
```

---

## Block #4 — `v_suppliers_for_m9` REVOKE default anon/PUBLIC grants (Fix #3)

**Migration name:** `m1a_v_suppliers_for_m9_revoke_anon`

**Purpose:** Fix A-01 / E-2 — close the Iron Rule 13 contract violation. Default Postgres view grants give anon + PUBLIC full DML privileges on `v_suppliers_for_m9`. Today RLS + security_invoker=on returns 0 rows to anon in practice, but the GRANT is the latent risk.

```sql
REVOKE ALL ON public.v_suppliers_for_m9 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_suppliers_for_m9 TO authenticated, service_role;

COMMENT ON VIEW public.v_suppliers_for_m9
  IS 'M9 contract view. M1A_OPERATIONS_RPCS_FIX (2026-05-15): anon/PUBLIC GRANTs REVOKEd per Iron Rule 13. authenticated retains SELECT; service_role retains full access.';
```

**Apply notes:**
- service_role bypasses RLS by design and retains full access (built-in elevated role); the explicit GRANT SELECT TO service_role is belt-only.
- Post-apply verify: `SELECT (aclexplode(c.relacl)).grantee::regrole::text, (aclexplode(c.relacl)).privilege_type FROM pg_class c WHERE c.relname='v_suppliers_for_m9' AND c.relnamespace='public'::regnamespace;` shows zero rows for anon/PUBLIC.

---

## Block #5 — K3 queue idempotency: UNIQUE INDEX + trigger fn ON CONFLICT DO NOTHING (Fix #8)

**Migration name:** `m1a_k3_queue_idempotency`

**Purpose:** Fix D-3 — prevent transaction-retry double-enqueue on `pending_lens_advancement_queue`. Queue is dormant today (no consumer yet) so the constraint can be added without dataloss risk.

```sql
-- Part A: UNIQUE INDEX on stock_movement_id (idempotency key).
-- Queue currently dormant — no existing rows can violate.
CREATE UNIQUE INDEX pending_lens_advancement_queue_stock_movement_unique
  ON public.pending_lens_advancement_queue (stock_movement_id);

-- Part B: trigger fn appends ON CONFLICT DO NOTHING.
-- Transaction retries that re-fire the AFTER INSERT on stock_movement will silently
-- no-op instead of raising 23505 unique_violation.
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
    )
    ON CONFLICT (stock_movement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- CREATE OR REPLACE re-grants EXECUTE TO PUBLIC by default. Restore the post-Block-#2 ACL
-- (trigger fn invoked only by Postgres trigger machinery — no role needs REST EXECUTE).
REVOKE EXECUTE ON FUNCTION public.m9_lens_received_for_sale_order_trg_fn() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.m9_lens_received_for_sale_order_trg_fn()
  IS 'M1A_OPERATIONS_RPCS_FIX (2026-05-15): Fix #8 — appended ON CONFLICT (stock_movement_id) DO NOTHING to make K3 enqueue idempotent under transaction retries.';
```

**Apply notes:**
- The trigger declaration `m9_lens_received_for_sale_order_trg AFTER INSERT ON public.stock_movement` is unchanged. CREATE OR REPLACE FUNCTION re-uses the same function; the trigger binding is automatic.
- Post-apply verify: `SELECT indexdef FROM pg_indexes WHERE indexname='pending_lens_advancement_queue_stock_movement_unique';` returns the index. `pg_get_functiondef('m9_lens_received_for_sale_order_trg_fn'::regproc)` body contains `ON CONFLICT (stock_movement_id) DO NOTHING`.

---

## Out-of-DDL changes (NOT applied via apply_migration)

These are file-level changes; the Executor edits them via Edit/Write and commits them in the §10 commit plan:

### Fix #6 — `supabase/config.toml` — add `[functions.lens-catalog-import]` block

```toml
# lens-catalog-import — Platform-admin-only catalog mutator (M1 Phase 1A).
# Bulk-INSERTs lens_brand / lens_design / lens_variant / supplier_catalog_offering
# under SUPABASE_SERVICE_ROLE_KEY. Gate is is_platform_super_admin() RPC inside
# the function body. verify_jwt = true is BELT (gateway rejects unauthenticated
# requests before reaching the function). SUSPENDERS is the in-body
# is_platform_super_admin check at index.ts, inverted to fail-closed in this
# same SPEC. Explicit block required to prevent CLI redeploy from silently
# flipping verify_jwt (lesson from M4_QUICK_HYGIENE_FIXES Rec 7, 2026-05-14).
[functions.lens-catalog-import]
verify_jwt = true
```

Append after the last existing `[functions.…]` block. Do NOT modify any pre-existing block.

### Fix #9 — `record_transfer` body — pass 19 positional args (Amendment #1, 2026-05-15)

**Migration name:** `m1a_record_transfer_arg_mismatch_fix`

**Authored by:** Foreman, after executor escalation at 2026-05-15 07:25 UTC. Escalation file: `modules/Module 1 - Inventory Management/escalations/2026-05-15T07-25-00Z_record_transfer_arg_mismatch.md`.

**Bug discovered during functional smoke Case 3:** Pre-existing `record_transfer` body has two inner `record_stock_movement` calls, each with only **17 positional arguments**. The function signature is 19 params (last 3 = `p_sph`, `p_cyl`, `p_add_value` numeric with DEFAULTs). PG fills positions 1..17; position 17 = `p_sph numeric` receives `p_notes` (text). Type collision ⇒ `42883: function record_stock_movement(... unknown) does not exist`. Phase 1A's smoke (single lens_brand INSERT) never invoked `record_transfer` so this DOA bug went undetected.

**Defect class:** identical to Fix #1 (record_stock_movement double-add) — runtime orchestrator defect, undetected because Phase 1A skipped functional smoke. This is exactly the failure mode the M1A_OPERATIONS_RPCS_FIX Pipeline exists to surface. Foreman authorizes inclusion in-pipeline rather than deferring (single-chat Full-Auto Pipeline; Daniel offline; defect blocks Brief §1 purpose).

**Fix:** CREATE OR REPLACE the function with each inner call passing 19 positional args (3 trailing NULLs for sph/cyl/add_value). Body is otherwise unchanged.

```sql
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

  -- transfer_out movement (consuming): 19 positional args, NULLs for sph/cyl/add_value.
  -- Fix #9 (M1A_OPERATIONS_RPCS_FIX Amendment #1, 2026-05-15) — was 17 positional → 42883.
  PERFORM record_stock_movement(
    p_tenant_id, p_source_lot_id, p_variant_id, p_from_location_id,
    'transfer_out', -p_qty_sent,
    NULL, NULL, NULL, v_transfer_id, NULL,
    v_source_unit_cost, NULL, NULL,
    p_initiated_by, p_notes,
    NULL, NULL, NULL
  );

  -- transfer_in movement (creation): 19 positional args.
  PERFORM record_stock_movement(
    p_tenant_id, v_dest_lot_id, p_variant_id, p_to_location_id,
    'transfer_in', p_qty_sent,
    NULL, NULL, NULL, v_transfer_id, NULL,
    v_source_unit_cost, NULL, NULL,
    p_initiated_by, p_notes,
    NULL, NULL, NULL
  );

  RETURN v_transfer_id;
END;
$function$;

-- CREATE OR REPLACE re-grants EXECUTE TO PUBLIC by default. Restore the post-Block-#2 ACL.
REVOKE EXECUTE ON FUNCTION public.record_transfer(
  p_tenant_id uuid, p_from_location_id uuid, p_to_location_id uuid,
  p_variant_id uuid, p_qty_sent integer, p_source_lot_id uuid,
  p_initiated_by uuid, p_notes text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_transfer(
  p_tenant_id uuid, p_from_location_id uuid, p_to_location_id uuid,
  p_variant_id uuid, p_qty_sent integer, p_source_lot_id uuid,
  p_initiated_by uuid, p_notes text
) TO authenticated;

COMMENT ON FUNCTION public.record_transfer(
  uuid, uuid, uuid, uuid, integer, uuid, uuid, text
) IS 'M1A_OPERATIONS_RPCS_FIX Amendment #1 (2026-05-15): Fix #9 — inner record_stock_movement calls now pass 19 positional args (3 trailing NULLs for sph/cyl/add_value) so they match the function signature. Pre-existing 17-arg form raised 42883 at runtime.';
```

**Apply notes:**
- Post-apply verify: `pg_get_functiondef('record_transfer'::regproc)` body contains BOTH `'transfer_out', -p_qty_sent,` AND `'transfer_in', p_qty_sent,` followed by 3 trailing `NULL` after `p_notes` in each call. ACL: zero anon/PUBLIC EXECUTE; 1 authenticated EXECUTE row.

---

### Fix #7 — `supabase/functions/lens-catalog-import/index.ts` — invert gate to fail-closed

Replace the block at lines 73–85 (per §0 BASE_LCI_GATE_LINE — re-confirm by reading the file first as line numbers may have shifted):

**BEFORE:**
```typescript
  // Verify caller is platform super admin (gate the seeding capability).
  // Note: is_platform_super_admin reads JWT claims; pass through caller's auth.
  const callerAuth = req.headers.get('authorization') ?? '';
  if (callerAuth) {
    const sbAsCaller = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: callerAuth } },
      auth: { persistSession: false }
    });
    const { data: isAdmin, error: adminCheckErr } = await sbAsCaller.rpc('is_platform_super_admin');
    if (adminCheckErr || isAdmin !== true) {
      return new Response(JSON.stringify({ error: 'forbidden_not_platform_admin', detail: adminCheckErr?.message }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
```

**AFTER:**
```typescript
  // Verify caller is platform super admin (gate the seeding capability).
  // Note: is_platform_super_admin reads JWT claims; pass through caller's auth.
  // Fail-closed: empty/missing Authorization header is treated as anonymous and rejected.
  const callerAuth = req.headers.get('authorization') ?? '';
  if (!callerAuth) {
    return new Response(JSON.stringify({ error: 'unauthorized_missing_auth' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const sbAsCaller = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: callerAuth } },
    auth: { persistSession: false }
  });
  const { data: isAdmin, error: adminCheckErr } = await sbAsCaller.rpc('is_platform_super_admin');
  if (adminCheckErr || isAdmin !== true) {
    return new Response(JSON.stringify({ error: 'forbidden_not_platform_admin', detail: adminCheckErr?.message }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
```

Then redeploy via `mcp__claude_ai_Supabase__deploy_edge_function` with `verify_jwt: true`. If MCP returns 5xx → CLI fallback per §5 trigger #5: `supabase functions deploy lens-catalog-import` (no `--no-verify-jwt`).

---

## Applied Log

Recorded by the Executor as each block is applied live via MCP `apply_migration`. One row per block.

| Block | Migration name | Applied (UTC) | Verify result |
|---|---|---|---|
| #1 | `m1a_record_stock_movement_fix` | 2026-05-15 | `has_branch_var=true`, `has_onconflict_where=true`, `has_conditional_update=true` (live `pg_get_functiondef`) |
| #2 | `m1a_revoke_execute_phase1a_secdef` | 2026-05-15 | `expect_0_anon_public=0`, `expect_8_authn_user_rpcs=8`, `expect_0_authn_internal=0`, `service_role_rows=10` |
| #3 | `m1a_next_lens_variant_display_id_jwt_guard` | 2026-05-15 | `has_jwt_guard=true`, `has_42501=true`, `has_LV_format=true`, `anon/auth/PUBLIC EXECUTE=0` (post-CREATE-OR-REPLACE re-REVOKE applied) |
| #4 | `m1a_v_suppliers_for_m9_revoke_anon` | 2026-05-15 | `anon/PUBLIC rows=0`, `authenticated SELECT=1`, `authenticated other=0`, `service_role SELECT=1` |
| #5 | `m1a_k3_queue_idempotency` | 2026-05-15 | `unique_idx_count=1`, `index_is_unique=1`, `has_onconflict_donothing=true`, `anon/auth/PUBLIC EXECUTE=0` (post-CREATE-OR-REPLACE re-REVOKE applied) |
| #6 (Amendment #1) | `m1a_record_transfer_arg_mismatch_fix` | 2026-05-15 | `has_xfer_out_19args=true`, `has_xfer_in_19args=true`, `anon/PUBLIC EXECUTE=0`, `authenticated EXECUTE=1` |

---

*End of MIGRATION.md.*
