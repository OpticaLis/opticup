---
spec_id: M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE
authored: 2026-05-18 IDT
total_findings: 1
status: 🟢 closed — 1 INFO observation (Tier C side-effect cleanup pattern), 0 defects
---

# FINDINGS — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE

## F-1 — INFO (PROCESS) — Tier C residue: K2 RPC's atomic side-effects on `purchase_order_line.qty_received` are not auto-reversed by soft-deleting the receipt

**Surface area:** Tier C cleanup pattern for any test that runs `m1_create_receipt_from_box` against a real `purchase_order_line.po_line_id`.

**What happened:** When the resilience SPEC's smoke ran `m1_create_receipt_from_box` with `po_line_id` set for each line (so the RPC's `UPDATE purchase_order_line SET qty_received = qty_received + v_received_qty` step fired), the linked PO-300003's 3 lines were bumped from 0/0/0 to 5/3/4, AND the PO header status flipped from 'sent' to 'fully_received'. Soft-deleting the receipt + linked `stock_lot` rows is the canonical Iron Rule 3 cleanup — but it does NOT auto-reverse the `purchase_order_line.qty_received` counter updates or the PO header status flip, because those are separate atomic side-effects of the RPC, not foreign-keyed to the receipt.

**Status:** RESOLVED IN-RUN. Explicit cleanup ran:
```sql
UPDATE purchase_order_line SET qty_received = 0
WHERE id IN ({3 line ids on PO-300003});
UPDATE purchase_order SET status = 'sent' WHERE id = {PO-300003 id};
```

**Why this matters as an INFO (not a defect):** The K2 RPC is correctly atomic and the `UPDATE purchase_order_line` step is essential for the GR contract — you can't make it "reversible by soft-delete" without changing the K2 contract. The right answer is: Tier C smokes of K2 RPCs require a 2-step cleanup (soft-delete receipt + stock_lots + manually roll back po_line counters). This is a documentation gap, not a code defect.

## Lessons re-confirmed (not new findings)

1. **Regex-guard pattern works.** The `~ '^[0-9]+$'` filter on the SUBSTRING expression cleanly excludes non-conforming rows from `MAX()` aggregation without any DDL/data-cleanup intervention. The 3 corrupt `LOT-PO300005-*` rows remained present in the table — they just stopped being parsed.
2. **CREATE OR REPLACE is the safest reversible DDL.** All 4 migrations were idempotent and reversible by re-applying the pre-fix bodies captured verbatim in §0 of the SPEC.
3. **Module 1.5 placement was correct.** These 4 RPCs are cross-cutting shared infrastructure. Module 1.5 keeps the closure artifact discoverable from any consumer module.
4. **Iron Rule 11 (atomic sequential numbers via FOR UPDATE) preserved.** The `PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE` lock-line in each RPC is unchanged. The regex guard adds a SARGable predicate to the SELECT scan, which Postgres still evaluates while holding the row lock.

## Proposals for opticup-strategic (Foreman) skill

**P-AUTHOR-1 (NEW)** — When authoring a SPEC whose Tier C smoke involves a K-RPC that does multi-table atomic updates (e.g., `m1_create_receipt_from_box` updates `purchase_receipt + purchase_receipt_line + stock_lot + stock_movement + purchase_order_line + purchase_order header`), the §8 QA / Tier C section MUST enumerate the cleanup pattern for ALL side-effect tables, not just the primary insert. Default cleanup template:

```sql
-- Soft-delete primary records
UPDATE stock_lot       SET is_deleted = true WHERE purchase_receipt_id = '{id}';
UPDATE purchase_receipt SET is_deleted = true WHERE id = '{id}';
-- Roll back K2 RPC's atomic side-effects on linked PO lines + PO header
UPDATE purchase_order_line SET qty_received = qty_received - {amount per line}
WHERE id IN ({list of po_line_ids touched by the smoke});
UPDATE purchase_order SET status = '{previous_status}'
WHERE id = '{po_id_touched}';
```

This SPEC's §8 template already captured the soft-delete step (S15) but didn't explicitly call out the PO-line rollback — discovered mid-cleanup. Codify in the strategic SKILL's "Tier C cleanup pattern for K-RPC smokes" sub-section.

## Proposals for opticup-executor skill

**P-EXEC-1 (NEW)** — `purchase_receipt` + `stock_lot` use a single `is_deleted` column for soft delete; they do NOT have a `deleted_at` column. Add to the executor SKILL's data-cleanup notes:

```
Soft-delete column inventory (verify per table — schemas vary):
  - purchase_receipt:    is_deleted BOOLEAN (no deleted_at)
  - stock_lot:           is_deleted BOOLEAN (no deleted_at)
  - purchase_order:      is_deleted BOOLEAN + deleted_at TIMESTAMPTZ
  - lens_variant_notes:  HARD-DELETE ONLY (no is_deleted column per SPEC 3 design)
```

This SPEC lost ~1 minute to a 42703 column-does-not-exist error in cleanup. Documenting prevents future churn.

---

**END FINDINGS**

_1 INFO (PROCESS), 0 defects. 2 SKILL proposals (1 strategic, 1 executor)._
