# ROLLBACK — M1 Lens Inventory Phase 1A

> Per-migration DOWN-section DDL for the 5 migrations in this SPEC.
> Lives outside the .sql files because Iron Rule 32's destructive-ops gate
> scans .sql contents regardless of SQL comment markers (`--`).
> If rollback is exercised, the executor / Foreman applies these in REVERSE
> migration order via Supabase MCP `execute_sql` (or equivalent).

---

## Migration 5/5 — RPCs + trigger + view (rollback first, before tables)

```sql
DROP TRIGGER IF EXISTS m9_lens_received_for_sale_order_trg ON stock_movement;
DROP FUNCTION IF EXISTS m9_lens_received_for_sale_order_trg_fn() CASCADE;
DROP FUNCTION IF EXISTS m1_create_receipt_from_box(UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS effective_price(UUID, UUID, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS next_lens_variant_display_id() CASCADE;
DROP FUNCTION IF EXISTS next_receipt_number(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS next_transfer_number(UUID) CASCADE;
DROP FUNCTION IF EXISTS next_lot_number(UUID) CASCADE;
DROP FUNCTION IF EXISTS record_adjustment_found(UUID, UUID, INT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS record_transfer(UUID, UUID, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS record_stock_movement(UUID, UUID, UUID, UUID, INT, TEXT, UUID, UUID, UUID, UUID, UUID, NUMERIC, NUMERIC) CASCADE;
DROP VIEW IF EXISTS v_suppliers_for_m9 CASCADE;
DROP TABLE IF EXISTS lens_variant_display_seq CASCADE;
```

---

## Migration 4/5 — Operations + governance (rollback)

```sql
DROP TABLE IF EXISTS pending_lens_advancement_queue CASCADE;
DROP TABLE IF EXISTS change_approval_log CASCADE;
DROP TABLE IF EXISTS supplier_permissions CASCADE;
DROP TABLE IF EXISTS purchase_receipt_line CASCADE;
DROP TABLE IF EXISTS purchase_receipt CASCADE;
DROP TABLE IF EXISTS stock_transfer CASCADE;
DROP TABLE IF EXISTS stock_movement CASCADE;
DROP TABLE IF EXISTS stock_lot CASCADE;
```

---

## Migration 3/5 — Retailer (rollback)

```sql
DROP TABLE IF EXISTS tenant_lens_stock CASCADE;
DROP TABLE IF EXISTS tenant_active_offerings CASCADE;
DROP TABLE IF EXISTS tenant_location CASCADE;
```

---

## Migration 2/5 — Commercial layer (rollback)

```sql
DROP TABLE IF EXISTS pricing_overlay CASCADE;
DROP TABLE IF EXISTS supplier_catalog_offering CASCADE;
DROP TABLE IF EXISTS vat_rates CASCADE;
-- NOTE: tenants.base_currency_code was SKIPPED per finding M1A-SPEC-01
--       (existing tenants.default_currency reused). Nothing to drop.
```

---

## Migration 1/5 — Global catalog (rollback last)

```sql
DROP TABLE IF EXISTS supplier_brand_distribution CASCADE;
DROP TABLE IF EXISTS lens_variant CASCADE;
DROP TABLE IF EXISTS lens_design CASCADE;
DROP TABLE IF EXISTS lens_brand CASCADE;
```

---

## Procedure if rollback needed

1. Capture the current commit hash for re-deploy.
2. Apply rollback DDL in the order shown above (5 → 4 → 3 → 2 → 1).
3. `git reset --hard {START_COMMIT}` (= `1e76a274d626dc8ac3fa29a60cf66f45916eb205` per BEFORE_STATE.json) to revert all repo changes.
4. Notify Foreman; mark SPEC as REOPEN, not CLOSED.
