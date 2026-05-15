# TEST_REPORT.md — M1A_OPERATIONS_RPCS_FIX

**Run by:** opticup-executor inside Full-Auto Pipeline
**Date:** 2026-05-15
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) — Prizma not touched.
**Method:** SQL via MCP `execute_sql` with `set_config('request.jwt.claims', …)` per case.

## Fixtures seeded (persistent on demo)

| Object | ID | Notes |
|---|---|---|
| tenant_location A | `e6f26ba3-4893-4001-9c55-bb88662d5370` | `name='Smoke Loc A (M1A)' short_code='STA'` |
| tenant_location B | `d0a3eea1-4dc3-4a92-a009-55ac48c3b49a` | `name='Smoke Loc B (M1A)' short_code='STB'` |
| lens_brand (global) | created during seed | `name='SmokeBrand_M1A'` |
| lens_design (global) | created during seed | `name='SmokeDesign_M1A', lens_type='single_vision'` |
| lens_variant (global) | `7073aa06-c324-49bb-ba1a-683521149a34` | `display_id='LV-TST001', refractive_index=1.50, diameter_mm=70` |
| supplier_catalog_offering | `afbc1b20-4b9c-4d4e-90f0-d2802ad0e3da` | demo supplier `767db339-91cb-4428-8123-76852c8f0e3f`, `price_amount=100.00 ILS` |

These fixtures persist on demo for re-use by Phase 1B's smoke. The SPEC §14 marks cleanup as optional; we keep them to seed Phase 1B's runtime without re-creation.

## Case-by-case results

### Case 1 — `record_stock_movement` no-double-add (receipt path) — PASS

Verifies Fix #1 (`v_is_creation_movement` branch skips the lot UPDATE for `'receipt'`).

| Key | Value |
|---|---|
| receipt_id | d526be83-6063-4374-9167-ef5d3760d8d4 |
| lot_id | f31edf68-44e4-4b99-a4b6-4c282462efb3 |
| movement_id | ec100fb0-b3ad-4f27-b960-2c10f437b3ce |
| qty_received | 5 |
| **qty_remaining_after_receipt_movement** | **5** (expected 5; would be 10 if pre-fix double-add was active) |
| **PASS** | **true** |

### Case 2 — `m1_create_receipt_from_box` end-to-end (1 stock line) — PASS

Verifies Fix #1 (no double-add) + Fix #2 (ON CONFLICT WHERE predicate matches partial UNIQUE INDEX `tenant_lens_stock_unique`).

| Key | Value |
|---|---|
| receipt_id_returned | ca661867-a457-4a4c-a2f7-37c19bdd0c29 |
| stock_lot_qty_received | 3 |
| **stock_lot_qty_remaining** | **3** (no double-add) |
| stock_movement_count_receipt | 1 |
| tls_qty_before | 8 (carry from Case 1 — same variant/loc/spec) |
| tls_qty_after | 11 |
| **tls_delta** | **3** (DO UPDATE branch fired — Fix #2 inference works) |
| **PASS** | **true** |

### Case 3 — `record_transfer` between 2 demo locations — PASS (post-Amendment-#1 / Fix #9)

Pre-Amendment-#1 attempt failed with 42883 (record_transfer's 17-arg call to record_stock_movement's 19-param signature). After Fix #9 (Block #6, Commit 8.5), re-ran:

| Key | Value |
|---|---|
| transfer_id | 0fd4191e-997e-4de7-8fd8-6f387daf843d |
| source_lot_id | f31edf68-44e4-4b99-a4b6-4c282462efb3 |
| source_qr_before | 5 |
| **source_qr_after** | **3** (decreased by 2) |
| **dest_lot_qr** | **2** (no double-add on transfer_in creation movement — Fix #1) |
| transfer_out_count | 1 |
| transfer_in_count | 1 |
| **PASS** | **true** |

### Case 4 — `next_lens_variant_display_id` anon-reject — PASS

Two sub-cases. Both raise 42501 'Unauthorized' as designed.

| Sub-case | Trigger | errcode | errmsg | PASS |
|---|---|---|---|---|
| A | `request.jwt.claims = '{"role":"anon"}'` | **42501** | Unauthorized | true |
| B | `request.jwt.claims` IS NULL (fresh session) | **42501** | Unauthorized | true |

**Edge note (not a failure):** explicitly setting `request.jwt.claims = ''` (empty string, not NULL) raises 22P02 'invalid input syntax for type json' (JSON cast fails before the IS NULL check). This is not a realistic PostgREST scenario — the GUC is either NULL (unset) or a valid JSON. Documented for completeness; criterion 10 PASS via both realistic scenarios.

### Case 5 — `record_adjustment_found` positive delta — PASS (post-Amendment-#2 / Fix #10)

Pre-Amendment-#2 attempt failed with 42883 (record_adjustment_found's 20 positional args to record_stock_movement's 19-param signature, with misaligned NULL at position 11 pushing v_lot_id into the numeric `p_cost_basis` slot). After Fix #10 (Block #7, Commit 8.6), re-ran:

| Key | Value |
|---|---|
| movement_id | 672d7688-15a3-419d-85cd-53ae03bc25b2 |
| lot_id | b3e2eb51-463f-4e83-a668-37c675906bdd |
| lot_qty_received | 4 |
| **lot_qty_remaining** | **4** (no double-add — Fix #1) |
| lot_origin_type | adjustment_found |
| movement_type | adjustment_found |
| movement_qty_delta | +4 |
| **movement_adjustment_id** | **= lot_id** (self-ref correctly aligned per design intent) |
| **PASS** | **true** |

### Case 6 — `effective_price` returns NUMERIC — PASS

| Key | Value |
|---|---|
| offering_id | afbc1b20-4b9c-4d4e-90f0-d2802ad0e3da |
| tenant_id | 8d8cfa7e-ef58-49af-9702-a862d459cccb |
| price_returned | **100.00** |
| is_not_null | true |
| is_numeric_type | numeric |
| **PASS** | **true** |

## Summary

| Case | Verifies | Result |
|---|---|---|
| 1 | Fix #1 isolated (record_stock_movement creation path) | PASS |
| 2 | Fix #1 + Fix #2 end-to-end (m1_create_receipt_from_box) | PASS |
| 3 | Fix #1 + Fix #2 + Fix #9 end-to-end (record_transfer) | PASS |
| 4 | Fix #5 + (Fix #4 inheritance) | PASS (2/2 sub-cases) |
| 5 | Fix #1 + Fix #10 end-to-end (record_adjustment_found) | PASS |
| 6 | Fix #4 selective re-GRANT (effective_price still callable by authenticated) | PASS |

**All 6 smoke cases PASS on demo tenant.** No Prizma data touched. K3 trigger fn was not exercised by Case 2 (no sale_order_id present in the test JSON); its idempotency is verified at code level (Block #5 post-apply check `has_onconflict_donothing=true`).

Prizma touch check: `git diff` over all SPEC commits + verbal review of test scripts shows zero references to `aff6dc1b…` Prizma UUID. Criterion 18 PASS.
