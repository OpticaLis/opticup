# MIGRATION.md — M1_LENS_PHASE_1B_FOUNDATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/MIGRATION.md`
> **Authored by:** opticup-strategic (Foreman), 2026-05-15
> **Convention:** Applied Log (per E1 — `opticup-executor/SKILL.md` Step 2 — MCP-only SPECs).
> All migrations applied via Supabase MCP `apply_migration`. **No** files written to `supabase/migrations/*.sql` per project TD-2 precedent.

---

## Block 1 — Seed 3 lens.* permission keys × 2 tenants (demo + prizma)

```sql
-- 3 keys × 2 tenants = 6 rows; idempotent via ON CONFLICT
INSERT INTO public.permissions (id, module, action, name_he, description, tenant_id)
VALUES
  ('lens.inventory.view',  'lens', 'view',   'צפייה במלאי עדשות',   'צפייה במסך מלאי עדשות',   '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.designs.manage',  'lens', 'manage', 'ניהול דגמים פעילים',  'הפעלה וביטול של דגמי עדשות', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.pricing.manage',  'lens', 'manage', 'ניהול מחירים',         'עריכת הנחות ומחירים סופיים', '8d8cfa7e-ef58-49af-9702-a862d459cccb'),
  ('lens.inventory.view',  'lens', 'view',   'צפייה במלאי עדשות',   'צפייה במסך מלאי עדשות',   '<prizma_tenant_id>'),
  ('lens.designs.manage',  'lens', 'manage', 'ניהול דגמים פעילים',  'הפעלה וביטול של דגמי עדשות', '<prizma_tenant_id>'),
  ('lens.pricing.manage',  'lens', 'manage', 'ניהול מחירים',         'עריכת הנחות ומחירים סופיים', '<prizma_tenant_id>')
ON CONFLICT (id, tenant_id) DO NOTHING;
```

Executor: resolve `<prizma_tenant_id>` via `SELECT id FROM tenants WHERE slug='prizma'`.

---

## Block 2 — `toggle_active_offering` RPC

```sql
CREATE OR REPLACE FUNCTION public.toggle_active_offering(
  p_tenant_id   uuid,
  p_offering_id uuid,
  p_is_active   boolean,
  p_location_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role   text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_id uuid;
BEGIN
  -- Block A: 3-role-aware JWT guard
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Validate offering exists for this tenant
  IF NOT EXISTS (SELECT 1 FROM public.supplier_catalog_offering
                 WHERE id = p_offering_id AND tenant_id = p_tenant_id AND is_deleted = false) THEN
    RAISE EXCEPTION 'offering % not found for tenant %', p_offering_id, p_tenant_id USING ERRCODE = '23503';
  END IF;

  -- UPSERT anchored on tenant_active_offerings_unique (tenant_id, offering_id, location_id) NULLS NOT DISTINCT
  INSERT INTO public.tenant_active_offerings (tenant_id, offering_id, location_id, is_active, activated_by, activated_at)
  VALUES (p_tenant_id, p_offering_id, p_location_id, p_is_active, NULL, now())
  ON CONFLICT (tenant_id, offering_id, location_id) WHERE is_deleted = false
  DO UPDATE SET
    is_active    = EXCLUDED.is_active,
    activated_at = now(),
    updated_at   = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.toggle_active_offering(uuid, uuid, boolean, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.toggle_active_offering(uuid, uuid, boolean, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.toggle_active_offering(uuid, uuid, boolean, uuid) IS
  'M1_LENS_PHASE_1B_FOUNDATION: atomic UPSERT of tenant_active_offerings.is_active. Block A JWT-claim guard.';
```

**Note on ON CONFLICT syntax:** if Postgres rejects `ON CONFLICT (cols) WHERE pred` (because the partial-index predicate is on a column not in the conflict target), executor falls back to `ON CONFLICT ON CONSTRAINT tenant_active_offerings_unique` (the index name) — pre-authorized M1B0 precedent.

---

## Block 3 — `upsert_pricing_overlay` RPC

```sql
CREATE OR REPLACE FUNCTION public.upsert_pricing_overlay(
  p_tenant_id    uuid,
  p_overlay_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role   text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_id uuid;
  v_existing_id uuid;
  v_scope_variant_id  uuid := (p_overlay_data ->> 'scope_variant_id')::uuid;
  v_scope_design_id   uuid := (p_overlay_data ->> 'scope_design_id')::uuid;
  v_scope_supplier_id uuid := (p_overlay_data ->> 'scope_supplier_id')::uuid;
  v_offering_id       uuid := (p_overlay_data ->> 'offering_id')::uuid;
  v_overlay_type      text := COALESCE(p_overlay_data ->> 'overlay_type', 'negotiated');
  v_discount_pct      numeric := (p_overlay_data ->> 'discount_pct')::numeric;
  v_fixed_amount      numeric := (p_overlay_data ->> 'fixed_amount')::numeric;
  v_fixed_currency    text := COALESCE(p_overlay_data ->> 'fixed_amount_currency', 'ILS');
  v_stacking_rule     text := COALESCE(p_overlay_data ->> 'stacking_rule', 'additive');
  v_application_order int  := COALESCE((p_overlay_data ->> 'application_order')::int, 100);
  v_status            text := COALESCE(p_overlay_data ->> 'status', 'proposed');
  v_notes             text := p_overlay_data ->> 'notes';
BEGIN
  -- Block A: 3-role-aware JWT guard
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Look up existing overlay for this scope (returns NULL for INSERT path)
  SELECT id INTO v_existing_id
  FROM public.pricing_overlay
  WHERE tenant_id = p_tenant_id
    AND COALESCE(scope_variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(v_scope_variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE(scope_design_id,  '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(v_scope_design_id,  '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE(scope_supplier_id,'00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(v_scope_supplier_id,'00000000-0000-0000-0000-000000000000'::uuid)
    AND overlay_type = v_overlay_type
    AND is_deleted = false
    AND status IN ('active','proposed')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.pricing_overlay
    SET discount_pct          = v_discount_pct,
        fixed_amount          = v_fixed_amount,
        fixed_amount_currency = CASE WHEN v_fixed_amount IS NOT NULL THEN v_fixed_currency ELSE fixed_amount_currency END,
        stacking_rule         = v_stacking_rule,
        application_order     = v_application_order,
        status                = v_status,
        notes                 = COALESCE(v_notes, notes),
        updated_at            = now()
    WHERE id = v_existing_id
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.pricing_overlay (
      tenant_id, offering_id,
      scope_variant_id, scope_design_id, scope_supplier_id,
      overlay_type, discount_pct, fixed_amount, fixed_amount_currency,
      stacking_rule, application_order, status, notes
    ) VALUES (
      p_tenant_id, v_offering_id,
      v_scope_variant_id, v_scope_design_id, v_scope_supplier_id,
      v_overlay_type, v_discount_pct, v_fixed_amount,
      CASE WHEN v_fixed_amount IS NOT NULL THEN v_fixed_currency ELSE NULL END,
      v_stacking_rule, v_application_order, v_status, v_notes
    )
    RETURNING id INTO v_id;
  END IF;
  -- exactly-one-scope + discount-or-fixed + overlay_type + stacking_rule + status CHECKs all fire here
  -- (no need to re-validate in PL/pgSQL)

  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.upsert_pricing_overlay(uuid, jsonb) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.upsert_pricing_overlay(uuid, jsonb) TO authenticated, service_role;
COMMENT ON FUNCTION public.upsert_pricing_overlay(uuid, jsonb) IS
  'M1_LENS_PHASE_1B_FOUNDATION: atomic UPSERT of pricing_overlay row. Block A JWT-claim guard. Relies on table-level CHECKs to validate exactly-one scope + discount-or-fixed + enum values.';
```

---

## Block 4 — `bulk_apply_pricing_overlay` RPC

```sql
CREATE OR REPLACE FUNCTION public.bulk_apply_pricing_overlay(
  p_tenant_id           uuid,
  p_overlay_template    jsonb,
  p_target_variant_ids  uuid[]
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role       text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant     uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_overlay_type   text := COALESCE(p_overlay_template ->> 'overlay_type', 'negotiated');
  v_discount_pct   numeric := (p_overlay_template ->> 'discount_pct')::numeric;
  v_fixed_amount   numeric := (p_overlay_template ->> 'fixed_amount')::numeric;
  v_fixed_currency text := COALESCE(p_overlay_template ->> 'fixed_amount_currency', 'ILS');
  v_stacking_rule  text := COALESCE(p_overlay_template ->> 'stacking_rule', 'additive');
  v_application_order int := COALESCE((p_overlay_template ->> 'application_order')::int, 100);
  v_status         text := COALESCE(p_overlay_template ->> 'status', 'proposed');
  v_notes          text := p_overlay_template ->> 'notes';
  v_row_count      int;
BEGIN
  -- Block A: 3-role-aware JWT guard
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_target_variant_ids IS NULL OR array_length(p_target_variant_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.pricing_overlay (
    tenant_id, scope_variant_id,
    overlay_type, discount_pct, fixed_amount, fixed_amount_currency,
    stacking_rule, application_order, status, notes
  )
  SELECT
    p_tenant_id, vid,
    v_overlay_type, v_discount_pct, v_fixed_amount,
    CASE WHEN v_fixed_amount IS NOT NULL THEN v_fixed_currency ELSE NULL END,
    v_stacking_rule, v_application_order, v_status, v_notes
  FROM unnest(p_target_variant_ids) AS vid;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bulk_apply_pricing_overlay(uuid, jsonb, uuid[]) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bulk_apply_pricing_overlay(uuid, jsonb, uuid[]) TO authenticated, service_role;
COMMENT ON FUNCTION public.bulk_apply_pricing_overlay(uuid, jsonb, uuid[]) IS
  'M1_LENS_PHASE_1B_FOUNDATION: atomic bulk INSERT of pricing_overlay rows (1 per variant id). Block A JWT-claim guard. Returns row count.';
```

---

## Applied Log (per E1)

Executor appends one row per `apply_migration` call, in the same commit semantically representing that block.

| # | Migration name | Block (SPEC §10) | Applied (UTC) | Verify result |
|---|----------------|------------------|---------------|---------------|
| 1 | `m1_lens_1b_foundation_block1_seed_permissions` | Commit 2 | 2026-05-15 | 6 rows (3 keys × 2 tenants demo+prizma) ✓ |
| 2 | `m1_lens_1b_foundation_block2_toggle_active_offering` | Commit 3 | 2026-05-15 | RPC created; SECDEF + search_path=public; grants: authenticated+service_role only (no anon/PUBLIC) ✓ |
| 3 | `m1_lens_1b_foundation_block3_upsert_pricing_overlay` | Commit 4 | TBD | TBD |
| 4 | `m1_lens_1b_foundation_block4_bulk_apply_pricing_overlay` | Commit 5 | TBD | TBD |

---

*End of MIGRATION.md skeleton. Executor fills the Applied Log rows as each Block lands.*
