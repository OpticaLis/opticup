# FINDINGS — M1_LENS_PHASE_1B_PROCUREMENT

**Date:** 2026-05-15
**Author:** opticup-executor
**Trigger:** Phase A functional smoke + Phase B UI smoke uncovered M1B0/M1A foundational gaps that block 3/14 functional smoke steps (per TEST_REPORT.md §1).

These findings are out of scope for this SPEC per §7 ("modifying foundation files OTHER than `modules/lens-inventory/lens-inventory-modals.js`" + "Iron Rule 32 = None"). All 3 require Phase 2 follow-up SPECs to fix.

---

## F-1 — HIGH — `m1_create_receipt_from_box` does not update PO state

**Severity:** HIGH
**Component:** `m1_create_receipt_from_box` RPC (M1B0, K2 contract)
**Discovered by:** Phase A smoke #3, #4 (TEST_REPORT.md §1)

**Description:** The K2 RPC successfully creates `purchase_receipt` + N `purchase_receipt_line` + N `stock_lot` + N `stock_movement(receipt)` + 1 `supplier_debt`. However it does NOT:
1. Update `purchase_order_line.qty_received += received` per PO line.
2. Transition `purchase_order.status` from 'sent' → 'partial' or 'fully_received' based on aggregate per-line received vs ordered.
3. Populate `discrepancy_qty` / `discrepancy_status` on `purchase_receipt_line` despite `ordered_qty` being passed in the JSON input.
4. Populate `purchase_receipt_line.ordered_qty` (NULL after receipt despite being passed in JSON).

**Impact:** Brief §2 step 4 + SPEC §3 SC #16 ("PO status lifecycle exercised") cannot be naturally fulfilled. PO stays in 'sent' status forever, no matter how many receipts are recorded against it. Manager's "POs List" dashboard will never show the partial-or-fully-received state correctly. Discrepancy resolution workflow (Phase 2) has no data to consume.

**Suggested next action:** **NEW SPEC `M1_K2_RECEIPT_COMPLETION`** to extend the K2 RPC body to:
- After inserting receipt_line, UPDATE purchase_order_line SET qty_received = qty_received + p_qty_received WHERE id = p_po_line_id (when not NULL).
- Compute aggregate per PO: SUM(qty_received) vs SUM(qty_ordered). If equal → PO status = 'fully_received'; if 0 < received < ordered → 'partial'; if 0 → unchanged.
- Populate purchase_receipt_line.ordered_qty from the JSON input.
- Populate purchase_receipt_line.discrepancy_qty = ordered_qty - qty_received (or NULL when ordered_qty NULL); populate discrepancy_status = 'open' when discrepancy_qty > 0.

---

## F-2 — HIGH — K2 cannot accept variant-less manual receipt lines

**Severity:** HIGH
**Component:** `m1_create_receipt_from_box` + `stock_lot.variant_id` NOT NULL constraint
**Discovered by:** Phase A smoke #5

**Description:** The K2 RPC unconditionally INSERTs into `stock_lot` for every line in p_lines. `stock_lot.variant_id` is NOT NULL. So a line with `is_manual_addition=true` and `variant_id=NULL` (true free-form receipt: "ספק שלח דוגמית בונוס שלא בקטלוג") triggers `23502: null value in column "variant_id" of relation "stock_lot" violates not-null constraint`.

**Impact:** Brief §2 step 5 + Mockup #7 manual-add banner promise that GR can accept lines NOT on any PO. Day-1, this works ONLY if the line references an existing variant_id. Free-form description-only manual lines are blocked. JS in `lens-goods-receipt-close.js` (Commit 8) now filters them out client-side with a console.warn referencing this finding.

**Suggested next action:** **NEW SPEC `M1_RECEIPT_VARIANT_LESS_LINES`** with one of:
- (a) Add a per-tenant "miscellaneous lens variant" sentinel that variant-less manual lines are routed to.
- (b) Make `stock_lot.variant_id` nullable + adjust downstream queries to handle NULL variant.
- (c) Skip stock_lot creation for variant-less lines (receipt_line still records the receipt, debt still accrues, but no inventory tracking).

Architect decision required on which path. Option (c) seems most semantically clean ("we paid for it but it's not in our catalog so we don't track its qty_on_hand") but requires K2 RPC body changes.

---

## F-3 — HIGH — ➖ adjust flow has no functioning RPC path Day-1

**Severity:** HIGH (blocks SPEC SC #20 fully)
**Component:** `record_stock_movement` + missing `stock_adjustment` table + missing `record_adjustment_lost` RPC
**Discovered by:** Phase A smoke #8

**Description:** The Activation Prompt directs the ➖ Inventory adjust flow to use `record_stock_movement(p_movement_type='adjustment_lost', ...)`. However:
1. `stock_movement` table has check constraint `stock_movement_exactly_one_source` requiring exactly ONE of (sale_order_id, customer_return_id, purchase_receipt_id, transfer_id, adjustment_id) to be NOT NULL.
2. For movement_type='adjustment_lost', the only valid slot is `adjustment_id`.
3. There is NO `stock_adjustment` table to insert into for getting an `adjustment_id`.
4. There is NO parallel `record_adjustment_lost` RPC (only `record_adjustment_found` for positive-qty adjustments).

Calling `record_stock_movement` directly fires `23514`. JS in `lens-inventory-modals.js` (Commit 8) now BLOCKS the call client-side with a clear Hebrew Phase 2 message + writeLog audit (`lens.inventory.adjust_blocked_phase2`).

**Impact:** SPEC §3 SC #20 fully RED. The ➖ button visually exists but is non-functional Day-1. Iron Rule 1 forbids workarounds via direct INSERT (no atomic RPC available). PIN gate + UI flow are correct; only the RPC layer is missing.

**Suggested next action:** **NEW SPEC `M1_STOCK_ADJUSTMENT_INFRA`** to:
- Create `stock_adjustment` table mirroring shape of `stock_lot` audit headers (tenant_id, performed_by, reason, created_at, type='lost'|'found'|'count', etc.) with RLS canonical pattern + tenant_id NOT NULL.
- Create `record_adjustment_lost(p_tenant_id uuid, p_source_lot_id uuid, p_variant_id uuid, p_location_id uuid, p_qty_lost int, p_reason text, p_performed_by uuid, p_sph numeric, p_cyl numeric, p_add_value numeric)` RETURNS uuid SECURITY DEFINER mirroring `record_adjustment_found` shape.
- The RPC body: INSERT stock_adjustment → use returned id as adjustment_id → call record_stock_movement (or inline INSERT) with adjustment_id populated → satisfies the check constraint.
- After SPEC ships: re-enable `lens-inventory-modals.js` ➖ flow by removing the F-3 guard block (commit message must reference this finding).

---

## F-4 — INFO — Session-cache staleness on permission seed (P-AUTHOR-1 carry-forward)

**Severity:** INFO (expected behavior, but documenting per Foreman P-AUTHOR-1 counter)
**Component:** Browser session `sessionStorage.tenant_permissions` cache
**Discovered by:** Phase B UI smoke (initial load)

**Description:** Users who logged in BEFORE the Commit 2 permission seed will not see the new `lens.po.*` / `lens.gr.*` / `lens.inventory.adjust` keys until next login. This is the canonical pin-auth pattern — `getEffectivePermissions()` runs at `initSecureSession()` and the resulting permission snapshot persists in the SESSIONS row + sessionStorage until session refresh.

The Phase B smoke encountered this exactly as P-AUTHOR-1 predicted in M1B_FOUNDATION_PERMISSIONS_HOTFIX. The smoke worked around it by manually injecting the new keys into sessionStorage via `evaluate_script`.

**Impact:** None for new logins. Existing logged-in users will see "אין הרשאה" on the 3 new screens until they logout/login. Daniel should communicate "logout/login required after merge" to existing users on demo + prizma.

**Suggested next action:** Dismiss as known behavior. Optionally add a TECH_DEBT entry suggesting `auth-service.js` re-fetch permissions on a configurable interval (e.g., every 5 min) so seed changes propagate without explicit logout. For now: not actionable in this SPEC.

---

## F-5 — INFO — `record_stock_movement` parameter list is wide (19 params)

**Severity:** INFO
**Component:** `record_stock_movement` RPC signature
**Discovered by:** Schema probe during Phase A smoke setup

**Description:** The RPC takes 19 parameters: tenant_id, source_lot_id, variant_id, location_id, movement_type, qty_delta, sale_order_id, customer_return_id, purchase_receipt_id, transfer_id, adjustment_id, cost_basis, vat_amount, fx_rate_snapshot, performed_by, notes, sph, cyl, add_value. Most are NULL-defaulted. This is wide for a public-API RPC and increases risk of malformed call sites.

**Impact:** None Day-1; JS callers correctly use named params (PostgreSQL := syntax via supabase-js).

**Suggested next action:** Dismiss. Possible Phase 3 refactor (out of scope) would split into `record_sale_movement`, `record_return_movement`, `record_receipt_movement`, `record_adjustment_movement`, `record_transfer_movement` — one RPC per movement_type + source pairing. Captures the check constraint at the RPC signature level.

---

## F-6 — INFO — Pre-existing untracked files in repo at SPEC start

**Severity:** INFO
**Component:** Repo state (~70 ?? files in modules/*/architecture-brief/, roles/, _archive_drafts/, M4 audit edits)
**Discovered by:** First Action step 4 at SPEC start

**Description:** Per Full-Auto Pipeline mode (Autonomy Playbook), pre-existing untracked + modified files were left alone throughout this SPEC's execution. Selective `git add` by filename was used for every commit (per CLAUDE.md §9 #6).

**Impact:** None for this SPEC. The pre-existing files remain untracked/modified at SPEC close (consistent with start state). Pipeline did NOT introduce or remove any of them.

**Suggested next action:** Dismiss. Matches the harvested Pipeline pattern from MIGRATION_1/_2/_3/_4 SPECs.

---

*End of FINDINGS. 3 HIGH (F-1, F-2, F-3 — all foundational, require Phase 2 SPECs) + 3 INFO (F-4, F-5, F-6 — known/dismissable).*
