# MIGRATION.md — M1B0_PURCHASE_ORDER_SCHEMA

> **Applied Log** of every Supabase MCP migration this Pipeline applies.
> Pattern adopted from `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Executor Proposal #1.
> All migrations applied to project `tsxrrxzmdxaenlvocyit` via MCP `apply_migration` — NO `supabase/migrations/*.sql` files (TD-2 precedent).

## Applied Log

| # | Migration name (MCP) | Block (SPEC §6) | Applied (UTC) | Verify result |
|---|---|---|---|---|
| 1 | `m1b0_create_purchase_order` | Block 1 | 2026-05-15T~11Z | `relrowsecurity=t`, 2 policies, UNIQUE partial idx present. ✓ |
| 2 | `m1b0_create_purchase_order_line` | Block 2 | 2026-05-15T~11Z | `relrowsecurity=t`, 2 policies, UNIQUE partial idx present. ✓ |
| 3 | `m1b0_create_supplier_debt` | Block 3 | 2026-05-15T~11Z | `relrowsecurity=t`, 2 policies, UNIQUE partial idx present. ✓ |
| 4 | `m1b0_add_purchase_order_fk_backpointers` | Block 4 | 2026-05-15T~11Z | `stock_lot_purchase_order_fk` + `purchase_receipt_purchase_order_fk` present with `ON DELETE SET NULL`. ✓ |
| 5 | `m1b0_create_next_purchase_order_number` | Block 5 | 2026-05-15T~11Z | SECDEF, `search_path=public`, JWT-claim guard + `42501` raise, REVOKE/GRANT applied (no PUBLIC/anon). ✓ |
| 6 | `m1b0_create_place_purchase_order` | Block 6 | 2026-05-15T~11Z | Same discipline. Inner call to `next_purchase_order_number(1 arg)` matches callee `pronargs=1`. ✓ |
| 7 | `m1b0_create_mark_po_sent` | Block 7 | 2026-05-15T~11Z | Same discipline. `GET DIAGNOSTICS ROW_COUNT` + `22023` raise on not-found. ✓ |
| 8 | `m1b0_create_cancel_purchase_order` | Block 8 | 2026-05-15T~11Z | Same discipline. `FOR UPDATE` + status-check gate. ✓ |

(Updated incrementally — rows added at each commit's MCP-apply step.)

## Rollback

See `ROLLBACK.md` (sibling file) for per-block DOWN steps. Reverse-dependency order: K2 restore → DROP RPCs → DROP FKs → DROP tables.
