# MIGRATION.md — M1_LENS_PHASE_1B_GAP_CLOSURE

> **Applied Log style** (per E1 from `M1_SKILL_IMPROVEMENT_HARVEST`).
> Every MCP-only DDL commit gets a row here. Empty at SPEC-open; Executor fills as blocks apply.
> No `supabase/migrations/*.sql` files in this Pipeline — TD-2 precedent (Cowork-VM-rotation drift): all DDL applied via `mcp__claude_ai_Supabase__apply_migration`. Rollback uses `execute_sql` per ROLLBACK.md.

---

## Applied Log

| # | Timestamp (UTC) | Migration name | Object delta | Result |
|---|---|---|---|---|
| 1a | 2026-05-15T~19:00Z | `m1_gap_closure_block1_stock_adjustment_tables` | failed — FK target `locations` does not exist (table is `tenant_location` singular) | ❌ rejected by Postgres |
| 1b | 2026-05-15T~19:01Z | `m1_gap_closure_block1_stock_adjustment_tables_v2` | 2 tables (`stock_adjustment_reason`, `stock_adjustment`) + 4 RLS policies + 3 indexes + 8 seed rows (4 demo + 4 prizma reasons) + 3 COMMENT entries | ✅ applied |
| 2 | 2026-05-15T~19:05Z | `m1_gap_closure_block2_record_adjustment_lost` | 1 SECDEF function `record_adjustment_lost(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric)` + 1 COMMENT + REVOKE FROM PUBLIC,anon + GRANT TO authenticated. Body uses canonical project JWT-claim guard (matches `record_stock_movement` + `record_adjustment_found`); delegates lot decrement + TLS UPSERT to `record_stock_movement` (simpler than the SPEC §2.3 first draft, which manually duplicated the FOR UPDATE + TLS UPSERT). Decision logged in EXECUTION_REPORT §5. | ✅ applied |
| 3a | 2026-05-15T~19:08Z | `m1_gap_closure_block3_receipt_line_variant_nullable` | failed — `schema_migrations_pkey` collision (concurrent session committed a migration at the same timestamp slot) | ❌ MCP registry collision |
| 3b | 2026-05-15T~19:09Z | (execute_sql fallback) | `ALTER TABLE purchase_receipt_line ALTER COLUMN variant_id DROP NOT NULL` + COMMENT. Verified `is_nullable='YES'`. No `supabase/migrations/*.sql` per TD-2; concurrent-session collision documented as D-2 in EXECUTION_REPORT. | ✅ applied |
| 4a | 2026-05-15T~19:12Z | (execute_sql, CREATE OR REPLACE v1) | `m1_create_receipt_from_box` body extended for F-1 + F-2: (a) per-line PO line `qty_received` increment + touched-PO array tracking; (b) post-loop `purchase_order.status` recompute (`partial` / `fully_received` / no-op for `cancelled`/`draft`); (c) per-line `ordered_qty` + `discrepancy_qty` populated from JSON; (d) post-loop `purchase_receipt.discrepancy_status` aggregation (`none`/`short`/`over`/`mixed`); (e) F-2 variant-less manual-line branch (`is_manual_addition=true AND variant_id IS NULL` → insert receipt_line only, skip stock_lot/movement/TLS, cost still flows to subtotal → supplier_debt); (f) `unit_cost_currency` omitted from INSERTs (DEFAULT 'ILS' fires). Bug surfaced at smoke pre-flight: used column `po_id` (Brief pseudocode) but actual column is `purchase_order_id`. | ⚠ functional but column-name bug |
| 4b | 2026-05-15T~19:30Z | (execute_sql, CREATE OR REPLACE v2) | Same body with `po_id` → `purchase_order_id` corrected in 3 places (UPDATE…RETURNING, CTE SELECT, ALIAS in CTE). Smoke F-1 PASS post-v2. | ✅ applied |
| 4c | 2026-05-15T~19:35Z | (execute_sql, ALTER TABLE) | `ALTER TABLE purchase_receipt ADD COLUMN IF NOT EXISTS discrepancy_status text` + COMMENT. Brief §3.1 step 5 assumed this column existed on `purchase_receipt`; live DB had it only on `purchase_receipt_line`. Added column is additive (not in Iron Rule 32 prohibited list). D-M1-10 aggregate field now writable. | ✅ applied |

---

## Block plan (matches SPEC §8 commit plan)

### Block 1 — `stock_adjustment_reason` + `stock_adjustment` tables + RLS + seed

Migration name: `m1_gap_closure_block1_stock_adjustment_tables`

Operations:
1. `CREATE TABLE stock_adjustment_reason` (Iron Rules 14 + 15 + 18)
2. `ALTER TABLE stock_adjustment_reason ENABLE ROW LEVEL SECURITY` + 2 canonical policies
3. `CREATE INDEX idx_stock_adj_reason_tenant`
4. `INSERT INTO stock_adjustment_reason` seed × 8 rows (4 demo + 4 prizma) with `ON CONFLICT (tenant_id, code) DO NOTHING`
5. `CREATE TABLE stock_adjustment` (Iron Rules 14 + 15)
6. `ALTER TABLE stock_adjustment ENABLE ROW LEVEL SECURITY` + 2 canonical policies
7. `CREATE INDEX idx_stock_adj_tenant_variant`, `idx_stock_adj_tenant_lot`

Expected post-state:
- `to_regclass('public.stock_adjustment_reason')` returns `'stock_adjustment_reason'`
- `to_regclass('public.stock_adjustment')` returns `'stock_adjustment'`
- `SELECT count(*) FROM stock_adjustment_reason` = 8
- Per tenant: 4 reason codes [`lost`, `damaged`, `count_correction_negative`, `count_correction_positive`]
- 4 RLS policies (2 per new table) in `pg_policies`

### Block 2 — `record_adjustment_lost` RPC

Migration name: `m1_gap_closure_block2_record_adjustment_lost`

Operations:
1. `CREATE OR REPLACE FUNCTION public.record_adjustment_lost(...) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ ... $$` per SPEC §2.3 body
2. `REVOKE EXECUTE ON FUNCTION public.record_adjustment_lost(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) FROM PUBLIC, anon`
3. `GRANT EXECUTE ON FUNCTION public.record_adjustment_lost(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) TO authenticated`

Expected post-state:
- `SELECT proname, prosecdef FROM pg_proc WHERE proname='record_adjustment_lost'` returns 1 row, prosecdef=true
- `proacl` of `record_adjustment_lost` does NOT include `anon=X`

### Block 3 — `purchase_receipt_line.variant_id` drop NOT NULL

Migration name: `m1_gap_closure_block3_receipt_line_variant_nullable`

Operations:
1. `ALTER TABLE purchase_receipt_line ALTER COLUMN variant_id DROP NOT NULL`

Expected post-state:
- `SELECT is_nullable FROM information_schema.columns WHERE table_name='purchase_receipt_line' AND column_name='variant_id'` returns `'YES'`

### Block 4 — `m1_create_receipt_from_box` body extension (F-1 + F-2 logic)

Migration name: `m1_gap_closure_block4_k2_completion`

Operations:
1. `CREATE OR REPLACE FUNCTION public.m1_create_receipt_from_box(...)` with extended body per SPEC §2.1 + §2.2

Pre-replace body snapshot: captured in `ROLLBACK.md §3` before this block applies. The current body (Probe 9 at SPEC author time) is the rollback target.

Expected post-state:
- `SELECT prosrc FROM pg_proc WHERE proname='m1_create_receipt_from_box'` body contains: `qty_received = qty_received +`, `discrepancy_status`, `is_manual_addition`, `CONTINUE` (variant-less branch).
- Existing Procurement smoke happy-path (₪234.82 supplier-debt) re-runs cleanly.

---

## Smoke artifact retention policy

Per M1A-DEBT-04 precedent, smoke fixtures created on demo tenant during this Pipeline persist after close. Estimated artifacts:
- 1-2 new `purchase_order` rows for F-1 smoke
- 3-6 new `purchase_order_line` rows
- 2 new `purchase_receipt` rows (F-1 partial + F-1 completion + F-2 variant-less)
- ~10 new `purchase_receipt_line` rows
- 1 new `stock_adjustment` row (F-3 smoke)
- 1 new `stock_movement` row with movement_type='adjustment_lost'
- Decrement of 1 `stock_lot.qty_remaining` and 1 `tenant_lens_stock.qty_on_hand` (~ -2 each)
- 8 `stock_adjustment_reason` seed rows (4 demo + 4 prizma) — these are the Day-1 config, not smoke artifacts

Next M1 SPEC reuses or sweeps as needed.

---

*End of MIGRATION.md. Executor populates Applied Log per block.*
