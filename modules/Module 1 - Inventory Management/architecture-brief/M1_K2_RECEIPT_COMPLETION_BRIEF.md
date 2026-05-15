# Module Brief — M1_K2_RECEIPT_COMPLETION (Phase 2 #2)

> **STATUS: SUPERSEDED by `M1_LENS_PHASE_1B_GAP_CLOSURE` (2026-05-15).** See `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md` for the closing SPEC. F-1 closure shipped 2026-05-15 within that Pipeline.

> **🟡 DRAFT — NOT DISPATCHED.** Authored 2026-05-15 in haste before M1 Module Close
> Ceremony. Withheld pending strategic conversation with Daniel.

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Foreman review
**Pipeline:** Full Auto Pipeline
**Branch:** `develop`. Daniel-only merge after 🟢.
**Pre-condition:** `M1_HOTFIX_PERMISSIONS_HOT_RELOAD` closed 🟢 + merged.

---

## 1. Purpose

`m1_create_receipt_from_box` (K2 RPC, shipped in Phase 1A + extended in M1B0) creates `purchase_receipt`, `purchase_receipt_line`, `stock_lot`, `stock_movement`, and `supplier_debt` rows. But it doesn't close the PO loop — `purchase_order_line.qty_received` stays 0 forever, and `purchase_order.status` never advances from `sent` to `partial` or `fully_received`.

Symptom: even after a PO is fully received in GR, the Active POs List shows it as `sent` (still open), and aggregate reports won't know when procurement actually completes.

This SPEC extends K2 to close the PO state machine. The fix is internal to K2; no new RPC needed, no UI change needed beyond automatic state reflection.

---

## 2. Scope — In

### Fix #1 — UPDATE `purchase_order_line.qty_received`

When K2 processes a `purchase_order_line_id` (received via the `p_lines JSONB` parameter — Module Strategist confirms the exact param name from `pg_get_functiondef`), it must add the received qty to that line's running total:

```sql
UPDATE purchase_order_line
SET qty_received = qty_received + p_qty_received_this_call
WHERE id = p_purchase_order_line_id
  AND tenant_id = v_jwt_tenant_id;
```

CHECK constraint `(qty_received <= qty_ordered)` will RAISE if the receipt over-receives — that's correct behavior; surfaces as a CHECK violation. Optional: pre-check + RAISE a clearer message ("over-receipt: ordered N, already received M, attempting +X").

### Fix #2 — UPDATE `purchase_order.status`

After updating all PO lines for the receipt, recompute the PO's aggregate status:

```sql
-- aggregate after the receipt
SELECT
  COUNT(*) FILTER (WHERE qty_received = 0) AS untouched,
  COUNT(*) FILTER (WHERE qty_received > 0 AND qty_received < qty_ordered) AS partial,
  COUNT(*) FILTER (WHERE qty_received >= qty_ordered) AS complete
INTO v_untouched, v_partial, v_complete
FROM purchase_order_line
WHERE purchase_order_id = p_po_id AND tenant_id = v_jwt_tenant_id;

-- new status
v_new_status := CASE
  WHEN v_untouched > 0 AND v_partial = 0 AND v_complete = 0 THEN 'sent'  -- still untouched
  WHEN v_untouched = 0 AND v_partial = 0 AND v_complete > 0 THEN 'fully_received'
  ELSE 'partial'
END;

UPDATE purchase_order
SET status = v_new_status,
    fully_received_at = CASE WHEN v_new_status='fully_received' THEN now() ELSE NULL END
WHERE id = p_po_id AND tenant_id = v_jwt_tenant_id
  AND status IN ('sent', 'partial');  -- don't move from cancelled / draft / already-fully-received
```

Add `fully_received_at TIMESTAMPTZ NULL` column to `purchase_order` if not present (probe).

### Fix #3 — `discrepancy_qty` on `purchase_receipt_line`

When received < ordered for that line in that receipt, populate `discrepancy_qty = ordered_in_this_call - received_in_this_call` on the line. **Per-receipt, not cumulative.** Caller (GR screen) passes both `p_qty_expected_this_call` and `p_qty_received_this_call`; K2 computes the diff and stores it. If caller doesn't pass expected (legacy callers / receipts without a PO link), leave NULL.

CHECK already exists on the column (Phase 1A schema); just populate.

### What stays unchanged in K2

- The existing INSERT into `purchase_receipt`.
- The existing INSERT into `purchase_receipt_line` (Phase 1A schema includes the column; just populate it).
- The existing INSERT into `stock_lot` + `stock_movement` (Phase 1A FIFO).
- The existing `m1_create_supplier_debt_from_receipt` call (M1B0 wiring).
- The K3 trigger on `stock_movement` (no change).
- The function signature — if at all possible, keep external-facing params identical. The new logic uses fields that the JSONB lines payload already carries (`purchase_order_line_id`, `qty_received`, optionally `qty_expected`).

### Functional smoke (mandatory)

On demo, via execute_sql + Chrome MCP:

1. Create a PO with 3 lines (qty 5/5/5 — stock + custom + manual). Status='sent'.
2. Call K2 with 1 line received in full (qty=5). Confirm: `purchase_order_line.qty_received=5` for that line; `purchase_order.status='partial'`.
3. Call K2 again with another line received partially (qty=3). Confirm: that line's qty_received=3, discrepancy_qty=2; `purchase_order.status='partial'`.
4. Call K2 with the remaining qty (qty=2 on the partial line + qty=5 on the third line). Confirm: line qty_received now matches ordered for both; `purchase_order.status='fully_received'`; `fully_received_at` populated.
5. Cross-check: `purchase_receipt` rows = 3 (one per K2 call), `supplier_debt` rows = 3 (one per K2 call, all open).
6. Try to call K2 over-receipt on a fully-received line. Confirm RAISE (CHECK violation OR explicit error).
7. Try to call K2 on a `cancelled` PO. Confirm RAISE OR no-op (Module Strategist decides — preferred: RAISE).
8. POs List screen shows the 3-line PO now with status "fully_received". Chrome MCP verification.
9. No console errors. No Iron Rule violations.

Capture in TEST_REPORT.md. **No 🟢 without 9/9.**

---

## 3. Scope — Out

- **Other RPCs.** Only K2 is touched.
- **UI changes** beyond automatic status display reflecting new DB state.
- **Discrepancy resolution workflow** (separate UI to investigate/accept/reject). Phase 3+.
- **Auto-close receipts when PO becomes fully_received.** Receipts stay independent; the PO closes via the new logic.
- **Modifying `supplier_debt` totals retroactively.** Each receipt creates its own debt row; no aggregation.
- **Reconciliation Agent** (M9 territory).
- **`force_mark_po_received` RPC** (was optional in Procurement Brief). Defer.
- **Touching M1B0 / Phase 1A / Phase 1B foundation screens** beyond what the K2 extension implicitly does.
- **CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT** beyond standard.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | K2 is extended (CREATE OR REPLACE FUNCTION); not a new RPC | Architect |
| 2 | `purchase_order.fully_received_at` column added if missing | Architect — audit trail |
| 3 | Discrepancy_qty is per-receipt-line, not cumulative | Architect — matches Phase 1A schema |
| 4 | Cancelled PO + K2 attempt = RAISE | Architect — cancelled means cancelled |
| 5 | Over-receipt = RAISE | CHECK constraint |
| 6 | All discipline inherited from M1A_OPERATIONS_RPCS_FIX | Project policy |
| 7 | Iron Rule 32 §7 = None | Project policy |

---

## 5. Success Criteria

1. **K2 body extended** — verified by `pg_get_functiondef` showing the new UPDATE blocks.
2. **`purchase_order.fully_received_at` column exists** (added if missing).
3. **`purchase_order_line.qty_received` increments correctly** per receipt — Smoke step 2-4 pass.
4. **`purchase_order.status` lifecycle works** — sent → partial → fully_received in correct order.
5. **`fully_received_at` populated** at the moment status transitions to fully_received.
6. **`purchase_receipt_line.discrepancy_qty` populated** when ordered > received this call.
7. **Cancelled PO + K2 raises.**
8. **Over-receipt raises.**
9. **Smoke 9/9 PASS on demo.** Captured in TEST_REPORT.md.
10. **Chrome MCP UI verification** — POs List reflects fully_received status. Captured.
11. **No regression on M1B0 smoke** (revisit the M1B0 6/6 cases).
12. **No new console errors.**
13. **Iron Rules** — no new violations.
14. **No new HIGH advisor lints** — script-run included.
15. **No Prizma data writes.**
16. **Iron Rule 32 §7 = None.**
17. **Commit count: 3-5, single-concern.**
18. **MIGRATION.md Applied Log.**
19. **`docs/GLOBAL_MAP.md`** updated (K2 description gets the extended-behavior note).
20. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW.**

---

## 6. Pre-Flight (mandatory)

Inherits MANDATORY §0 audits.

```sql
-- Probe 1: current K2 body
SELECT pg_get_functiondef('m1_create_receipt_from_box'::regproc);

-- Probe 2: purchase_order columns (does fully_received_at exist?)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='purchase_order' AND table_schema='public'
ORDER BY ordinal_position;

-- Probe 3: purchase_order_line columns (qty_received present? CHECK on it?)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='purchase_order_line' AND table_schema='public'
ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid='purchase_order_line'::regclass AND contype='c';

-- Probe 4: purchase_receipt_line columns (discrepancy_qty present?)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='purchase_receipt_line' AND table_schema='public'
ORDER BY ordinal_position;

-- Probe 5: M1B0 K2 caller signature
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc WHERE proname='m1_create_receipt_from_box';

-- Probe 6: existing PO fixtures on demo
SELECT id, po_number, status FROM purchase_order
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' ORDER BY ordered_at;
```

Pin every result. The K2 body shape determines whether the JSONB lines payload already carries `purchase_order_line_id` or whether we need to extend the param shape.

---

## 7. Iron Rules in Sharp Focus

- **Rule 1** — K2 stays atomic (single transaction).
- **Rule 11** — `next_po_number` already FOR UPDATE; not touched.
- **Rule 14, 15, 18, 22** — defense-in-depth on every UPDATE.
- **Rule 16** — M1↔M9 contract unchanged.
- **Rule 31, 32** — gate + None.

---

## 8. Anti-Patterns

- **Authoring blind.** §6 probes first.
- **Creating a new RPC instead of extending K2.** No.
- **Re-architecting the JSONB lines payload shape.** If the existing shape carries enough info → use it. If not, Module Strategist proposes additive params only.
- **Cascading the PO status from supplier_debt.paid_amount.** That's payment territory; out-of-scope.
- **Auto-resolving discrepancies.** Stay raw; resolution is UI work.
- **Touching Prizma.**

---

## 9. Open Questions for the Module Strategist

1. **Existing K2 signature — does it already carry `purchase_order_line_id` per line?**
*Probe 5 answers. If yes → no signature change. If no → add it as an additive param.*

2. **`fully_received_at` — DB column or computed via JOIN with receipts?**
*Recommendation: column.* Stable audit field; cheaper than JOIN-on-every-read.

3. **Over-receipt detection — pre-check + nicer error, or rely on CHECK?**
*Recommendation: pre-check + nicer error message in Hebrew.* Better UX surface; cheap.

4. **K2 with `cancelled` PO — RAISE or no-op?**
*Recommendation: RAISE 42501.* Cancelled means cancelled; auditor wants to know if anyone tries.

5. **The `discrepancy_qty` semantic — only when ordered > received, or also when received > ordered?**
*Recommendation: only ordered > received (under-receipt).* Over-receipt is RAISE territory.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` | K2 baseline + supplier_debt wiring |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md` | Original K2 + Phase 1A schema |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/FINDINGS.md` | This SPEC's root cause |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` | GR UX context |
| `modules/Module 1 - Inventory Management/architecture-brief/M1_M9_OVERLAP_REPORT.md` | K2/K3 contract |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | D-M1-08 (status enum), D-M1-10 (reconciliation), D-M1-11 (debt at receipt) |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note

Full Auto Pipeline. Activation Prompt delivered after `M1_HOTFIX_PERMISSIONS_HOT_RELOAD` closes 🟢 + merges.

Pipeline order:
1. `opticup-strategic` reads Brief + probes + authors SPEC.
2. Executor implements + functional smoke (9 steps).
3. Reviewer + Foreman seal.
4. ONE Hebrew status line.

After 🟢: Daniel merges. Next SPEC (`M1_RECEIPT_VARIANT_LESS_LINES`) dispatched.

---

*End of Brief. K2 extension; PO state machine closure.*
