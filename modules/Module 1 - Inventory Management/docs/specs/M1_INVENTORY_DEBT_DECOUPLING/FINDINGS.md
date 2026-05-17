# FINDINGS — M1_INVENTORY_DEBT_DECOUPLING

**Generated:** 2026-05-18 evening
**Executor:** opticup-executor (Claude Code)

---

## F-1 (HIGH, CARRY-FORWARD from Phase C) — Pre-existing trigger integer-cast bug on real variant_id

**Location:** Unknown trigger on `stock_lot`, `stock_movement`, or `purchase_order_line` INSERT path (inside `m1_create_receipt_from_box`'s real-variant branch).

**Description:** Originally surfaced at Phase C Tier C. Hypothesis at correction-SPEC author time was that stripping the supplier_debt PERFORM would make this moot. **Tier C VFV of this correction REFUTED that hypothesis** — the error `invalid input syntax for type integer: "PO300005-1"` (code 22P02) STILL fires when a real `variant_id` is passed through `m1_create_receipt_from_box`. The error origin is NOT in the supplier_debt branch (which is now gone) — it's in the variant-bearing stock_lot / stock_movement / PO-cascade path.

**Suggested next action:** Diagnostic SPEC `M1_DIAGNOSE_RECEIPT_INTEGER_CAST` (~30-45 min):
1. List all triggers ON INSERT / UPDATE for `stock_lot`, `stock_movement`, `purchase_receipt_line`, `purchase_order_line`.
2. Identify any field cast to integer that could receive a `PO`-prefixed string.
3. Fix either the trigger's cast logic OR the seed data.
4. Re-run Quick Scan Flow 1 Tier C end-to-end with real LV-* barcodes.

**Severity HIGH** because: blocks the variant-bearing add-stock path end-to-end on demo. Manual Add (variant-less, `is_manual_addition=true`) works fine; Quick Scan + Manual Add WITH a real variant filter context selected do NOT. User-facing impact only when the user expects barcode-resolution to write a real stock movement.

---

## F-2 (LOW) — `lens-inventory-modal-shows.js` still over 300-line soft target (330, was 342)

**Location:** `modules/lens-inventory/lens-inventory-modal-shows.js`

**Description:** This correction SPEC shrunk the file by 12 lines (342→330) by stripping the undocumented permission gate + RPC param handling. Still 30 lines over the soft target. Same status as Phase C FINDINGS F-2 — cohesion-justified, deferred until natural splitting boundary emerges.

**Suggested next action:** No new action. Existing Phase C F-2 disposition stands (`T-MODAL-SHOWS-SPLIT` TECH_DEBT entry).

---

*FINDINGS closed. 1 HIGH (F-1 carry-forward — F-5 of Phase C now properly attributed as pre-existing pre-architectural-correction), 1 LOW (file-size carry).*
