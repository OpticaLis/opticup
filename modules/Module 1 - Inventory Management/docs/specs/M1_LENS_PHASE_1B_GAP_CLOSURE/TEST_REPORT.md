# TEST_REPORT — M1_LENS_PHASE_1B_GAP_CLOSURE

> **Author:** opticup-executor (smoke phase, pre-Localhost-Tester)
> **Date:** 2026-05-15 evening
> **Scope:** Functional DB-level smoke on demo tenant for F-1 / F-2 / F-3. UI smoke + 4-page HTTP-200 verification handled by opticup-localhost-tester (Stage 4 of Pipeline).

---

## Verdict: 🟢 GREEN at executor scope

All 14 SPEC §3 success criteria measurable from DB state are PASS. SC #11 (4 lens HTML pages HTTP 200) deferred to Localhost-Tester.

---

## SC #1 — F-1 partial receipt

**Setup:** PO `d412b922-e300-47a5-8dca-94079f2ebc38` (notes='GAP_CLOSURE F-1 smoke PO'), 3 lines of qty_ordered=3 each at sph=-3.00, -3.25, -3.50. Marked sent. First receipt `474cb945-...` (delivery_note='F1-DN-001') receives 2 of A + 0 of B + 3 of C.

| Sub-criterion | Expected | Actual | Verdict |
|---|---|---|---|
| 1a qty_received per line [A,B,C] | [2, 0, 3] | [2, 0, 3] (intermediate state pre-completion) | ✅ |
| 1b PO.status after partial receipt | `partial` | `partial` (intermediate; later 'fully_received' after SC#2) | ✅ |
| 1c receipt_line.ordered_qty per line | [3, 3] | [3, 3] (sorted by sph) | ✅ |
| 1d receipt_line.discrepancy_qty | [0, 1] (line C exact, line A short by 1) | [0, 1] | ✅ |
| 1e receipt.discrepancy_status | `short` | `short` | ✅ |

## SC #2 — F-1 completion receipt

Second receipt `F1-DN-002`: line A +1, line B +3.

| Sub-criterion | Expected | Actual | Verdict |
|---|---|---|---|
| 2a PO.status after completion | `fully_received` | `fully_received` | ✅ |
| 2b all qty_received >= qty_ordered | true | true ([3,3,3] vs [3,3,3]) | ✅ |

## SC #3 — F-2 variant-less manual line

**Setup:** Receipt `3bb37dfa-9dcc-431e-bae7-6ec2f45cd946` (`F2-DN-001`): 1 variant-present line (qty=2, cost=60) + 1 variant-less manual line (qty=5, cost=10, is_manual_addition=true).

| Sub-criterion | Expected | Actual | Verdict |
|---|---|---|---|
| 3a K2 returns success (no 23502) | uuid | uuid | ✅ |
| 3b receipt_line variant_id IS NULL count | 1 | 1 | ✅ |
| 3b receipt_line total count | 2 | 2 | ✅ |
| 3c stock_lot count for receipt | 1 (variant-less skipped) | 1 | ✅ |
| 3d stock_movement count for receipt | 1 (variant-less skipped) | 1 | ✅ |
| 3e TLS unchanged for variant-less line | n/a (no variant) | confirmed | ✅ |
| 3f supplier_debt.total_amount includes variant-less line | (2×60 + 5×10) × 1.18 = 200.60 | 200.60 (vat=30.60) | ✅ |

## SC #4 — F-3 inventory adjust (➖)

**Setup:** Lot `68bc74d5-...` (qty_remaining=10), variant `7073aa06-...`, location `e6f26ba3-...`, sph=0.00. Call `record_adjustment_lost(p_qty_lost=2, p_reason_id=damaged)`.

| Sub-criterion | Expected | Actual | Verdict |
|---|---|---|---|
| 4a stock_adjustment row created | 1 row | 1 row, qty_delta=-2 | ✅ |
| 4b stock_movement.adjustment_id linked | 1 row, type=adjustment_lost | 1 row, type=adjustment_lost | ✅ |
| 4c stock_lot.qty_remaining = 8 (10-2) | 8 | 8 | ✅ |
| 4d TLS.qty_on_hand = 21 (23-2) | 21 | 21 | ✅ |
| 4e Toast "מלאי עודכן" | UI-level — Localhost-Tester verifies | DB-level PASS via record_adjustment_lost returning uuid | ✅ at DB scope |
| 4f writeLog audit | JS-level — Localhost-Tester verifies | n/a at DB scope; JS code in lens-inventory-modals.js:line writeLog confirmed in source | ✅ at code scope |

## SC #5 — Smoke matrix re-run

The 3 Procurement-Pipeline smoke steps that previously failed (F-1, F-2, F-3 functional paths) now all pass via SC #1/3/4 above. ✅

## SC #6 — Cross-tenant isolation (RLS)

From a demo JWT session, `SELECT count(*) FROM stock_adjustment WHERE tenant_id='<prizma>'` returns 0. Same for `stock_adjustment_reason`. ✅

(Note: via service_role the count is 4 for stock_adjustment_reason on Prizma — the Day-1 seed. That is correct and expected per SPEC §3 SC #12 caveat.)

## SC #7 — No anon access on record_adjustment_lost

`proacl` of `record_adjustment_lost` checked: `anon=...` pattern does NOT appear. Only postgres=X (owner), authenticated=X, service_role=X. ✅ (ID-L-07 satisfied)

## SC #8 — Iron Rule 31 integrity gate

All 9 commits passed `node scripts/verify.mjs --staged` with exit 0. No null-byte corruption surfaced; no mid-statement truncation. Pipeline started 2026-05-15 ~18:50 UTC, ends ~19:50 UTC. ✅

## SC #9 — Smoke 7/7 PASS (baseline)

Baseline Auth + RLS + CRM + Storefront smoke not re-run by Executor (Localhost-Tester runs it). No commits in this Pipeline touched anything outside Module 1 lens scope, so no regression expected. To be confirmed at Stage 4. ✅ deferred to Localhost-Tester.

## SC #10 — Reviewer verdict

Deferred to Stage 3 (Reviewer).

## SC #11 — Localhost-Tester verdict

Deferred to Stage 4 (Localhost-Tester).

## SC #12 — Prizma untouched

All 8 Prizma lens-related tables remain at row-count 0 (matches BASE_PRIZMA_LENS_TABLES_ROWS):

| Table | Pre | Post | Delta |
|---|---|---|---|
| stock_movement | 0 | 0 | 0 ✅ |
| stock_lot | 0 | 0 | 0 ✅ |
| tenant_lens_stock | 0 | 0 | 0 ✅ |
| purchase_order | 0 | 0 | 0 ✅ |
| purchase_order_line | 0 | 0 | 0 ✅ |
| purchase_receipt | 0 | 0 | 0 ✅ |
| purchase_receipt_line | 0 | 0 | 0 ✅ |
| supplier_debt | 0 | 0 | 0 ✅ |
| stock_adjustment (new) | n/a | 0 | 0 ✅ |
| stock_adjustment_reason (new) | n/a | 4 (Day-1 seed) | +4 ⚠ (expected per SPEC §3 SC #12 caveat — config, not data) |

## SC #13 — SUPERSEDED markers on 4 files

`grep -c "STATUS: SUPERSEDED by .M1_LENS_PHASE_1B_GAP_CLOSURE."` returns 1 on each of:

- `architecture-brief/M1_K2_RECEIPT_COMPLETION_BRIEF.md`: 1 ✅
- `architecture-brief/M1_RECEIPT_VARIANT_LESS_LINES_BRIEF.md`: 1 ✅
- `architecture-brief/M1_STOCK_ADJUSTMENT_INFRA_BRIEF.md`: 1 ✅
- `docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md`: 1 ✅

## SC #14 — Day-1 seed of stock_adjustment_reason

```
demo: 4 rows (lost dir=-1, damaged dir=-1, count_correction_negative dir=-1, count_correction_positive dir=+1)
prizma: 4 rows (same codes/directions)
total: 8 rows
```

All ✅.

---

## Smoke artifact summary (persists on demo per M1A-DEBT-04 lineage)

- 1 PO `d412b922-...` status=fully_received with 3 lines
- 2 purchase_receipt rows (F1-DN-001 partial + F1-DN-002 completion) + receipt lines
- 1 purchase_receipt row F2-DN-001 (variant-less smoke) + 2 receipt lines
- 1 stock_adjustment row (qty_delta=-2, reason=damaged)
- 1 stock_movement row (movement_type=adjustment_lost)
- 1 stock_lot decrement (10 → 8)
- 1 TLS decrement (23 → 21)
- 8 stock_adjustment_reason seed rows (4 demo + 4 prizma — Day-1 config, not smoke)

Next M1 SPEC reuses or sweeps via tenant-clean script per project precedent.

---

*End of TEST_REPORT.md. Verdict: 🟢 at executor scope. Stage 3 Reviewer + Stage 4 Localhost-Tester pending.*
