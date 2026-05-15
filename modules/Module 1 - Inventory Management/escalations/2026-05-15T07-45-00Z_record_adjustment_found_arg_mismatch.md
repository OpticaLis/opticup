# Escalation #2 — record_adjustment_found pre-existing 20-arg call to 19-param function

**Filed by:** opticup-executor inside Full-Auto Pipeline M1A_OPERATIONS_RPCS_FIX
**Filed at:** 2026-05-15 ~07:45 UTC
**Severity:** CRITICAL — blocks smoke Case 5 (record_adjustment_found)
**Pipeline state:** Commits 1–8 + 8.5 landed; smoke Cases 1, 2, 3, 4 PASS; Case 5 fails with 42883.

## What was discovered

`record_adjustment_found`'s body invokes `record_stock_movement` with **20 positional arguments**. The function signature is 19 params. The 20th positional arg violates the count, and even if truncated to 19 the parameter alignment is wrong by one position.

Source (verbatim from §0 Probe Extra A):

```sql
v_movement_id := record_stock_movement(
    p_tenant_id, v_lot_id, p_variant_id, p_location_id,            -- 1-4
    'adjustment_found', p_qty_found,                               -- 5,6
    NULL, NULL, NULL, NULL, NULL, v_lot_id,                        -- 7-12 (12 args)
    v_unit_cost, NULL, NULL, p_performed_by, p_reason,             -- 13-17
    p_sph, p_cyl, p_add_value                                      -- 18-20
);
```

Position mapping to function signature:
| Position | Function param | Value passed | Type expected | Type passed | OK? |
|---|---|---|---|---|---|
| 7 | p_sale_order_id (uuid) | NULL | uuid | unknown→uuid | ✓ |
| 8 | p_customer_return_id (uuid) | NULL | uuid | unknown→uuid | ✓ |
| 9 | p_purchase_receipt_id (uuid) | NULL | uuid | unknown→uuid | ✓ |
| 10 | p_transfer_id (uuid) | NULL | uuid | unknown→uuid | ✓ |
| 11 | p_adjustment_id (uuid) | NULL | uuid | unknown→uuid | ✓ (but should hold `v_lot_id` per pattern) |
| 12 | p_cost_basis (numeric) | v_lot_id | numeric | **uuid** | ✗ |
| 13 | p_vat_amount (numeric) | v_unit_cost | numeric | numeric | ✓ |
| 14 | p_fx_rate_snapshot (numeric) | NULL | numeric | unknown→numeric | ✓ |
| 15 | p_performed_by (uuid) | NULL | uuid | unknown→uuid | ✓ |
| 16 | p_notes (text) | p_performed_by | text | **uuid** | ✗ |
| 17 | p_sph (numeric) | p_reason | numeric | **text** | ✗ |
| 18 | p_cyl (numeric) | p_sph | numeric | numeric | ✓ (but slot-1-off) |
| 19 | p_add_value (numeric) | p_cyl | numeric | numeric | ✓ (but slot-1-off) |
| 20 | (no param) | p_add_value | (overflow) | numeric | ✗ |

Two compounding bugs:
1. **20 positional args > 19 params** — overflow.
2. **Misaligned NULL at position 11** — should be `v_lot_id`, not NULL (per the design intent: adjustment_found's stock_lot self-references as the adjustment_id since there's no `adjustments` table yet — the function's own comment says so).

Postgres reports 42883 because the type triplet at positions 11, 12, 13 + 15, 16, 17 cannot be reconciled against any matching function — there is no `record_stock_movement(..., uuid, numeric, ..., uuid, text, numeric, ...)` overload.

**Phase 1A smoke skipped this orchestrator entirely**, same root cause as Fix #1 and Fix #9. This is the third runtime defect of the same class in the same Pipeline.

## Defect class is identical to Fix #1 + Fix #9

- Orchestrator runtime defect
- Caused by Phase 1A skipping functional smoke
- Surfaced by M1A_OPERATIONS_RPCS_FIX's mandatory smoke discipline (exactly as designed)
- Blocks Brief §1 stated purpose ("all three orchestrator RPCs chain through it")
- Iron Rule 32 still **None** under the same logic as Amendment #1 (CREATE OR REPLACE in-place)

## What the fix is

CREATE OR REPLACE `record_adjustment_found` with the inner call corrected to 19 positional args, aligning slots and putting `v_lot_id` at position 11 (p_adjustment_id) as the comment in the original body says was intended:

```sql
v_movement_id := record_stock_movement(
    p_tenant_id, v_lot_id, p_variant_id, p_location_id,    -- 1-4
    'adjustment_found', p_qty_found,                        -- 5-6
    NULL, NULL, NULL, NULL, v_lot_id,                       -- 7-11 (5 NULLs + adjustment_id=v_lot_id)
    v_unit_cost, NULL, NULL,                                -- 12-14 (cost_basis, vat, fx)
    p_performed_by, p_reason,                               -- 15-16 (performed_by, notes)
    p_sph, p_cyl, p_add_value                               -- 17-19
);
```

This matches the design comment in the original body: "INSERT the adjustment movement (uses adjustment_id slot — we use the lot_id as a self-ref since no adjustments table yet)".

## Recommendation to Foreman

**Author Amendment #2 + grant broad pre-authorization for the rest of this Pipeline.**

Specifically:
1. Add Fix #10 (record_adjustment_found body fix) to MIGRATION.md as Block #7.
2. **Pre-authorize the executor to apply ANY further orchestrator-runtime-defect fixes of the same class without re-escalation**, provided each is (a) CREATE OR REPLACE FUNCTION in-place, (b) Iron Rule 32 None, (c) surfaced by SPEC §14 smoke, and (d) documented in MIGRATION.md as a sibling Block.

Rationale for broader pre-authorization: this is now the 3rd same-class defect in this Pipeline (Fix #1, #9, #10). Phase 1A skipped functional smoke for ALL orchestrators; it is plausible that Case 5 isn't the last defect. Escalating once per defect creates O(n) Foreman roundtrips for an obviously bounded scope ("fix all 3 orchestrators that Phase 1A's smoke would have caught"). Pre-authorization closes the loop in one decision.

## Pipeline state

- Branch `develop` clean (10 commits landed: 1–8 + 8.5).
- Smoke Cases 1, 2, 3, 4 PASS (all post-Amendment-#1).
- Smoke Case 5 fails inside `record_adjustment_found`. Cases 5 + 6 deferred until Foreman responds.

## Author

opticup-executor, single-chat Full-Auto Pipeline.
