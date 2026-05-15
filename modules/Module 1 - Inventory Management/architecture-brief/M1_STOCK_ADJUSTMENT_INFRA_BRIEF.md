# Module Brief — M1_STOCK_ADJUSTMENT_INFRA (Phase 2 #4)

> **STATUS: SUPERSEDED by `M1_LENS_PHASE_1B_GAP_CLOSURE` (2026-05-15).** See `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md` for the closing SPEC. F-3 closure (stock_adjustment + stock_adjustment_reason tables + record_adjustment_lost RPC, Pattern P19/P40 compliant) shipped 2026-05-15.

> **🟡 DRAFT — NOT DISPATCHED.** Authored 2026-05-15 in haste before M1 Module Close
> Ceremony. Also note: `adjustment_type` was authored as CHECK-constraint enum — this
> violates P19/P40 (configurable-per-tenant by default). Rewrite required if this Brief
> is ever dispatched: use tenant-scoped `stock_adjustment_type` config table instead.

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist → Executor → Reviewer → Foreman
**Pipeline:** Full Auto Pipeline
**Branch:** `develop`. Daniel-only merge after 🟢.
**Pre-condition:** `M1_RECEIPT_VARIANT_LESS_LINES` closed 🟢 + merged.

---

## 1. Purpose

The Inventory screen's ➖ button is wired but dead-ends — `record_adjustment_lost` RPC doesn't exist, and there's no `stock_adjustment` audit table. The Procurement SPEC closed with that finding marked 🔴.

This SPEC adds the missing infrastructure: an atomic, PIN-gated RPC + an audit table for stock decrements that aren't sales (lost, damaged, expired, count-correction, theft).

---

## 2. Scope — In

### Table — `stock_adjustment`

Tenant-scoped audit table. One row per adjustment event.

Core columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- `stock_lot_id UUID NOT NULL REFERENCES stock_lot(id)` (the affected lot)
- `qty_change INT NOT NULL CHECK (qty_change <> 0)` (negative = lost; positive = found — both kinds use this table)
- `adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('lost','damaged','expired','count_correction','theft','found'))`
- `reason TEXT NULL` (free text, optional context)
- `adjusted_by UUID NOT NULL REFERENCES employees(id)` (who; SET NULL on employee delete)
- `adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `pin_verified BOOLEAN NOT NULL DEFAULT false` (was PIN entered? — should always be true via the RPC)
- `created_at`, `updated_at`

RLS: canonical 2-policy.
Indexes: tenant_id, (tenant_id, stock_lot_id), (tenant_id, adjusted_at DESC).
UNIQUE: none (multiple adjustments per lot legit).
Iron Rule 32: None (no destructive ops).

### RPC — `record_adjustment_lost(p_tenant_id, p_stock_lot_id, p_qty_change INT, p_adjustment_type TEXT, p_reason TEXT, p_employee_id UUID, p_pin TEXT) RETURNS UUID`

Atomic:

1. JWT-claim guard at function entry.
2. PIN verification — call existing `pin-auth` infrastructure or its RPC equivalent. RAISE if PIN invalid.
3. `SELECT FOR UPDATE` on `stock_lot` (locks the lot row).
4. Check current `qty_remaining + p_qty_change >= 0`. RAISE if would go negative (for `p_qty_change < 0`).
5. UPDATE `stock_lot.qty_remaining = qty_remaining + p_qty_change` (negative qty_change reduces; positive adds back).
6. INSERT a `stock_movement(movement_type='adjustment_lost' OR 'adjustment_found', qty_delta=p_qty_change, source='manual', source_id=stock_adjustment.id, employee_id=p_employee_id)` — propagates to `tenant_lens_stock` via the existing K-trigger or direct UPDATE chain (Module Strategist confirms via probe).
7. INSERT `stock_adjustment` row with all the metadata.
8. Update `tenant_lens_stock.qty_on_hand` via the same propagation as receipts/transfers (existing pattern).
9. Return `stock_adjustment.id`.

SECURITY DEFINER + `SET search_path = 'public'` + JWT guard + REVOKE/GRANT discipline.

`movement_type` enum may need a new value `adjustment_found` if it doesn't already include it (M1A `record_adjustment_found` may have shipped without the enum extension — Module Strategist probes).

### UI integration (lens-inventory.html ➖ flow)

Currently the ➖ button surfaces a "Phase 2" message. This SPEC replaces that with:

1. PIN modal (existing `pin-auth` UX).
2. After PIN entered, show qty input + adjustment_type dropdown + optional reason field.
3. Submit → call `record_adjustment_lost` RPC.
4. On success, refresh inventory grid + toast "התאמת מלאי בוצעה".
5. On failure (insufficient stock, PIN wrong, etc.), toast with the RPC's RAISE message.

The ➕ flow stays as a deep-link to GR (no change from current behavior — `record_adjustment_found` already exists from M1A; this SPEC adds the `lost` path to symmetry).

### Functional smoke (mandatory)

On demo:

1. Create a stock_lot via K2 receipt (qty 10).
2. Call `record_adjustment_lost` with `qty_change=-3`, `adjustment_type='damaged'`, valid PIN.
   - Confirm: stock_lot.qty_remaining = 7, stock_adjustment row inserted, stock_movement row inserted.
3. Call `record_adjustment_lost` with `qty_change=-100` (over-deplete).
   - Confirm: RAISE — "insufficient qty".
4. Call with invalid PIN.
   - Confirm: RAISE — "PIN invalid".
5. Call with anon JWT.
   - Confirm: RAISE 42501.
6. Cross-tenant: tenant-A JWT calling on tenant-B's stock_lot — RAISE.
7. Call `record_adjustment_lost` with `qty_change=+2, adjustment_type='found'` (positive case).
   - Confirm: stock_lot.qty_remaining = 9, stock_adjustment row with adjustment_type='found'.
8. Chrome MCP UI: open Inventory screen, click ➖ on a lot with qty>0, enter PIN, enter qty + reason, confirm.
   - Confirm: grid refreshes with reduced qty, no console errors.
9. Try ➖ on a lot with qty=0.
   - Confirm: button disabled OR clear error toast.
10. No console errors. No Iron Rule violations.

Capture in TEST_REPORT.md. **No 🟢 without 10/10.**

---

## 3. Scope — Out

- **Bulk adjustments** (adjusting multiple lots at once). Phase 3+.
- **Approval workflow** (manager approves cashier's adjustment). Phase 3+; D-M1 already has `change_approval_log`.
- **Adjustment reversal** (undo an adjustment). Single-direction Day-1.
- **Reporting on adjustments** (analytics dashboard). Future.
- **Auto-detect "shrinkage" via stock count vs sale aggregation.** Out-of-scope.
- **Modifying the ➕ button flow** beyond what already deep-links.
- **`writeLog` semantics** — already used by `record_stock_movement`; inherit pattern.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | New `stock_adjustment` audit table + new `record_adjustment_lost` RPC | Architect |
| 2 | PIN required for every adjustment (Iron Rule 1) | Iron Rule 1 |
| 3 | Single RPC handles both lost (negative) and found-without-PO (positive) | Architect — symmetry |
| 4 | `record_adjustment_found` from M1A stays as-is for found-during-receipt-discrepancy path | M1A scope |
| 5 | All discipline from M1A_OPERATIONS_RPCS_FIX | Project policy |
| 6 | Iron Rule 32 §7 = None | Project policy |

---

## 5. Success Criteria

1. **`stock_adjustment` table created** with RLS canonical 2-policy + indexes.
2. **`record_adjustment_lost` RPC deployed** with full M1A discipline.
3. **`movement_type` enum extended** with new values if needed (probe).
4. **Inventory screen ➖ button wired** to the new flow.
5. **Smoke 10/10 PASS on demo.** Captured.
6. **Chrome MCP UI verification** — ➖ flow works end-to-end.
7. **No regression on M1B0 / K2-completion / variant-less smokes.**
8. **No console errors.**
9. **Iron Rules** — no violations.
10. **No new HIGH advisor lints.**
11. **No Prizma writes.**
12. **Iron Rule 32 §7 = None.**
13. **Commit count: 4-7.**
14. **MIGRATION.md Applied Log.**
15. **`docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql`** updated.
16. **Reports.**

---

## 6. Pre-Flight

```sql
-- Probe 1: movement_type enum values
SELECT enumlabel FROM pg_enum
JOIN pg_type t ON t.oid = pg_enum.enumtypid
WHERE t.typname='stock_movement_type'
ORDER BY enumsortorder;

-- Probe 2: record_adjustment_found body (mirror style for record_adjustment_lost)
SELECT pg_get_functiondef('record_adjustment_found'::regproc);

-- Probe 3: stock_lot constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='stock_lot'::regclass;

-- Probe 4: pin-auth integration pattern
-- via shell: grep -rn "pin-auth\|verify_pin\|pin_check" supabase/functions/ js/ | head -10

-- Probe 5: tenant_lens_stock update pattern from existing RPCs
-- (look for stock_movement insert → tenant_lens_stock update chain)
SELECT pg_get_functiondef('record_stock_movement'::regproc);

-- Probe 6: existing demo fixtures for testing
SELECT id, qty_remaining FROM stock_lot WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' LIMIT 5;
```

Pin all results.

---

## 7. Iron Rules in Sharp Focus

- **Rule 1** — PIN gate + FOR UPDATE + atomic.
- **Rule 2** — writeLog called.
- **Rule 11** — sequence (if any number generated for stock_adjustment).
- **Rule 14, 15, 18, 22** — tenant_id discipline.
- **Rule 19** — adjustment_type CHECK constraint (bounded enum, not tenant-configurable).
- **Rule 31, 32** — gate + None.

---

## 8. Anti-Patterns

- **Authoring blind.** §6 probes first.
- **Skipping PIN.** Iron Rule 1.
- **Allowing qty_remaining to go negative.** Pre-check + RAISE.
- **Adding adjustment_type values like "promotion".** Out-of-scope; bounded enum.
- **Bypassing the existing tenant_lens_stock propagation pattern.** Reuse.
- **Creating an adjustment_number sequential generator.** UUID is enough; no human-readable number needed Day-1.

---

## 9. Open Questions

1. **`adjustment_type='count_correction'` — single direction or both?**
*Recommendation: both (positive + negative).* Stock counts find shortages AND overages.

2. **`stock_adjustment.adjustment_number TEXT` for audit traceability?**
*Recommendation: defer.* UUID suffices Day-1; can add later if accounting needs it.

3. **Should adjustments be soft-deletable?**
*Recommendation: no.* Audit data; immutable.

4. **`record_adjustment_lost` handles found cases too — confusing name?**
*Recommendation: rename to `record_stock_adjustment` Day-1.* Generic; handles both directions cleanly.

5. **Approval gate for large adjustments?**
*Recommendation: defer.* No threshold logic Day-1; manager + CEO get the permission, others don't.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md` | record_adjustment_found pattern (mirror for `_lost`) |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md` | RPC discipline reference |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/FINDINGS.md` | Bug origin |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` | ➖ UX intent |
| `supabase/functions/pin-auth/` | PIN integration |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | Iron Rule 1 enforcement context |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note

Full Auto Pipeline. Activation Prompt delivered after `M1_RECEIPT_VARIANT_LESS_LINES` closes 🟢 + merges.

After 🟢: Phase 2 quartet complete. Architect runs Module 1 Close Ceremony + dispatches `MODULE_REPO_SPLIT`.

---

*End of Brief. Stock adjustment infra. ➖ wiring completed.*
