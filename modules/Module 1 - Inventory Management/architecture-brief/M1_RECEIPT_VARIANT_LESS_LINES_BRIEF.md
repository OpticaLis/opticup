# Module Brief — M1_RECEIPT_VARIANT_LESS_LINES (Phase 2 #3)

> **STATUS: SUPERSEDED by `M1_LENS_PHASE_1B_GAP_CLOSURE` (2026-05-15).** See `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md` for the closing SPEC. F-2 closure (Option-c — skip stock_lot for variant-less lines) shipped 2026-05-15.

> **🟡 DRAFT — NOT DISPATCHED.** Authored 2026-05-15 in haste before M1 Module Close
> Ceremony. Withheld pending strategic conversation with Daniel.

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist → Executor → Reviewer → Foreman
**Pipeline:** Full Auto Pipeline
**Branch:** `develop`. Daniel-only merge after 🟢.
**Pre-condition:** `M1_K2_RECEIPT_COMPLETION` closed 🟢 + merged.

---

## 1. Purpose

Goods Receipt UI (mockup #7) allows the receiving employee to add **manual lines** not on any PO — bonus items, samples, freebies, lab returns. These lines have no `variant_id` (they aren't a stock SKU). But `stock_lot.variant_id NOT NULL` blocks K2 from processing them — every received line MUST become a `stock_lot`, every `stock_lot` MUST have a variant.

Currently K2 rejects these lines with a NOT NULL violation. The Procurement Pipeline closed 🟡 partly because of this — manual GR lines cannot be processed.

This SPEC fixes the design conflict. Two paths; Module Strategist picks based on §6 probes.

---

## 2. Scope — In

### Path A — Make `stock_lot.variant_id` nullable

ALTER `stock_lot.variant_id` to NULL. Add CHECK constraint: `(variant_id IS NULL AND lot_source='manual') OR variant_id IS NOT NULL` (the source is encoded in `purchase_receipt_line.source='manual'`, propagated to `stock_lot.origin_type='manual_receipt'` or similar). FIFO logic stays the same — a lot without variant is invisible to inventory queries (which filter by variant_id).

Cost: schema change + cascading impacts on FIFO queries (must JOIN to variant always, or filter NULL).

### Path B — Skip stock_lot for manual lines

K2 detects `purchase_receipt_line.source='manual'` (existing column from M1B0) and:
- Creates the `purchase_receipt_line` row (audit + supplier_debt link).
- DOES NOT create a `stock_lot` row.
- DOES NOT create a `stock_movement` row (no inventory effect).
- Still creates the supplier_debt entry — the cost of the manual line gets billed.

Cost: K2 conditional branching. The manual line affects accounting but not stock.

**Architect recommendation: Path B.** Manual lines genuinely have no inventory effect (a free sample isn't sold; a bonus pair isn't tracked by SKU). Tracking them in stock_lot creates a half-baked entity. Path B's simplicity wins.

**Module Strategist may override** if probes reveal that a downstream consumer (a report, M9 reconciliation, etc.) depends on every `purchase_receipt_line` having a matching `stock_lot`.

### What stays unchanged

- `purchase_receipt_line` schema (already nullable variant_id per Phase 1A; the source enum already exists).
- The GR screen UX (already accepts manual lines — just was rejected at K2 layer).
- `supplier_debt` calculation (manual lines contribute to total via their `unit_cost * qty`).

### Functional smoke

On demo:

1. Create a PO with 2 lines (1 stock + 1 custom). Mark sent. K2 with full receipt + 1 extra manual line. Confirm:
   - 2 lines from PO → 2 `stock_lot` + 2 `stock_movement` (unchanged from M1B0).
   - 1 manual line → 1 `purchase_receipt_line` (source='manual', variant_id NULL) + 0 `stock_lot` (Path B) OR 1 `stock_lot.variant_id IS NULL` (Path A).
   - `supplier_debt.total_amount` includes the manual line's cost.
2. Inventory screen query (Path B): manual lines invisible (correct — no inventory).
3. POs List shows the PO as fully_received (only the PO lines counted; manual doesn't affect PO status).
4. Try to create a "manual" line referencing a `purchase_order_line_id`. Should RAISE (manual lines are NOT tied to a PO line).
5. No console errors, no Iron Rule violations.
6. Chrome MCP UI: open GR screen, add a manual line, close receipt — succeeds, no error toast.

Capture in TEST_REPORT.md. **No 🟢 without 6/6.**

---

## 3. Scope — Out

- **Other source types** (e.g., "promotional", "warranty"). Only `manual` Day-1.
- **UI changes to the manual-line form** beyond what already works.
- **Audit trail of manual lines** beyond the standard `purchase_receipt_line.notes` field.
- **Linking manual lines to a customer** (gift cards, etc.). Out-of-scope.
- **M7 sale_order linkage** on manual lines. Manual = bonus, not sold.
- **K3 trigger changes.** Manual lines don't fire the M9 trigger because no stock_movement is created (Path B) or because the trigger conditions don't apply (Path A).
- **Modifying CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT** beyond standard.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Path B (no stock_lot for manual) is the Architect recommendation | Architect |
| 2 | Manual lines DO contribute to supplier_debt | D-M1-11 + business logic |
| 3 | Manual lines have NULL purchase_order_line_id (no PO tie) | Mockup #7 + schema |
| 4 | All discipline inherited from M1A_OPERATIONS_RPCS_FIX | Project policy |
| 5 | Iron Rule 32 §7 = None | Project policy |

---

## 5. Success Criteria

1. **K2 handles manual lines without error.**
2. **Manual line → `purchase_receipt_line` row exists** (source='manual', variant_id NULL, purchase_order_line_id NULL).
3. **Manual line → NO `stock_lot` row** (Path B). Or `stock_lot.variant_id IS NULL` (Path A).
4. **Manual line → contributes to `supplier_debt.total_amount`.**
5. **`purchase_order.status` lifecycle unaffected** — manual lines don't count toward PO fully_received.
6. **Smoke 6/6 PASS.** Captured.
7. **Chrome MCP UI** — manual line can be added in GR screen + receipt closes successfully.
8. **No regression on M1B0 / K2-completion smokes.**
9. **No console errors.**
10. **Iron Rules** — no violations.
11. **No new HIGH advisor lints.**
12. **No Prizma data writes.**
13. **Iron Rule 32 §7 = None.**
14. **Commit count: 2-4.**
15. **MIGRATION.md Applied Log** if DDL (Path A) or none (Path B).
16. **Reports.**

---

## 6. Pre-Flight

```sql
-- Probe 1: current stock_lot constraint
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name='stock_lot' AND column_name='variant_id';

-- Probe 2: K2 body (look for "manual" handling)
SELECT pg_get_functiondef('m1_create_receipt_from_box'::regproc);

-- Probe 3: purchase_receipt_line source enum + columns
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_name='purchase_receipt_line';

-- Probe 4: any downstream consumer expecting stock_lot per receipt_line?
-- via shell: grep -rn "stock_lot" modules/ js/ supabase/functions/ 2>/dev/null | head -20
```

Pin every result.

---

## 7. Iron Rules in Sharp Focus

- **Rule 1, 22** — K2 stays atomic + tenant-correct.
- **Rule 14** — manual rows still carry tenant_id NOT NULL.
- **Rule 19** — source enum stays bounded (no new values invented here).
- **Rule 31, 32** — gate + None.

---

## 8. Anti-Patterns

- **Authoring blind.** §6 first.
- **Inventing a sentinel variant for manual lines.** Don't — use NULL or skip.
- **Adding `manual_variant_description`** column. The existing `notes` carries free text.
- **Modifying the M9 K3 trigger.** No.
- **Changing PO status logic** to count manual lines. No.

---

## 9. Open Questions

1. **Path A or B?**
*Recommendation: B.* Probes confirm.

2. **Can manual lines have a `purchase_order_line_id`?**
*Recommendation: no (NULL only).* Manual = no PO tie.

3. **Should manual lines fire the K3 trigger?**
*Recommendation: no (Path B doesn't create stock_movement, so trigger doesn't fire — natural).*

4. **Discrepancy_qty on manual lines?**
*Recommendation: NULL.* No "ordered" to compare against.

5. **Manual line in a PO that's draft/sent vs no-PO receipt?**
*Recommendation: manual lines only valid in receipts (with or without PO).* They're never on a PO itself.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/FINDINGS.md` | The bug |
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` | K2 baseline |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` | UX intent |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | D-M1-09 (GR), D-M1-11 (debt) |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note

Full Auto Pipeline. Activation Prompt delivered after `M1_K2_RECEIPT_COMPLETION` closes 🟢 + merges.

---

*End of Brief. Manual GR lines supported. Path B (no stock_lot) recommended.*
