# M1 Lens Phase 1B — Gap Closure Brief

**Author:** opticup-architect (Cowork, 2026-05-15 evening)
**Owning module:** Module 1 — Inventory Management (Lens phase)
**Type:** Production-correctness hotfix bundle. Single SPEC, single Pipeline.
**Mode:** Full Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review)
**Predecessor SPECs:** `M1_LENS_PHASE_1B_FOUNDATION` 🟢 + `M1_LENS_PHASE_1B_PROCUREMENT` 🟡 (both closed 2026-05-15)
**Source audit:** `M1_EXPANSION_STRATEGIC_AUDIT_REPORT.md` §3 F-03 + §4.2 sequence row #1
**Supersedes drafts:** This Brief consumes and replaces the three draft Briefs `M1_K2_RECEIPT_COMPLETION_BRIEF.md`, `M1_RECEIPT_VARIANT_LESS_LINES_BRIEF.md`, `M1_STOCK_ADJUSTMENT_INFRA_BRIEF.md`. They must be retired in this Pipeline per P-AR-08 (mark with `STATUS: SUPERSEDED by M1_LENS_PHASE_1B_GAP_CLOSURE (2026-05-15)`).

---

## 1. Purpose

Phase 1B Procurement shipped today with three HIGH foundational gaps surfaced by its own smoke matrix. All three trace to the same root cause — the RPC layer that runs after goods are received does not finish the work the screens promise. The audit recommends fixing all three in a single bundled SPEC because (a) they share the same RPC neighborhood (`m1_create_receipt_from_box` + `record_stock_movement` + a missing `stock_adjustment` infrastructure), (b) one Pipeline run with one smoke matrix is cheaper than three sequential Pipelines, and (c) production-correctness for the Lens phase is reached only when all three close.

This Brief closes the gaps. After this SPEC ships, M1 Lens is production-correct and M7 build is unblocked.

---

## 2. Background — what's broken right now

### F-1: PO state and discrepancy tracking never advance

After a goods-receipt is created (via `m1_create_receipt_from_box`), the originating purchase order stays in `status='sent'` forever. The Active POs List screen promises a Draft → Sent → Partial → Fully Received → Cancelled pipeline (D-M1-08), but the transition `sent → partial → fully_received` never fires because:

- `purchase_order_line.qty_received` is never incremented.
- `purchase_order.status` is never recomputed.
- `purchase_receipt_line.ordered_qty` stays NULL even though the K2 JSON input carries it.
- `purchase_receipt_line.discrepancy_qty` stays NULL — the Reconciliation Agent (D-M1-10) will see zero discrepancies forever.

**Business impact:** the day after the first real receipt, a manager opens Active POs List and sees the PO still in `sent`. Daniel will hear about this within hours of real use. The Reconciliation Agent foundation, which Phase 1A delivered as schema-ready, has no writer feeding it discrepancy data.

### F-2: Variant-less manual receipt lines crash with 23502

Mockup #7 (LENS_GOODS_RECEIPT_MOCKUP.html) has a manual-add banner promising a tenant can receive bonus / sample / out-of-catalog items that have no `variant_id` in our catalog. The Procurement screen shows the banner. The K2 RPC rejects the row because `stock_lot.variant_id` has a NOT NULL constraint and the K2 body unconditionally inserts a `stock_lot` for every receipt line. The JS now filters such lines out client-side as a stopgap.

**Business impact:** the affordance Daniel explicitly insisted on does not work for the case that justified its existence. Bonus items from a supplier — common in optics procurement — cannot enter the system. Staff will work around by creating fake catalog entries, polluting the catalog.

### F-3: ➖ inventory-adjust button is visually present but inert

The Inventory screen has a ➖ button per Iron Rule 1 (atomic quantity changes via ➕➖ buttons with PIN). The JS today shows a "Phase 2" toast and writes a writeLog audit entry; no RPC fires. The RPC layer is missing infrastructure: no `stock_adjustment` table, no `record_adjustment_lost` RPC. The `stock_movement_exactly_one_source` CHECK constraint requires exactly one of (`sale_order_id`, `customer_return_id`, `purchase_receipt_id`, `transfer_id`, `adjustment_id`) to be NOT NULL, and the adjustment path has no `adjustment_id` source to satisfy this.

**Business impact:** staff today have no way to remove stock that was lost, broken, or mis-counted. Iron Rule 1 leaves them with no path. Workaround: manually edit `tenant_lens_stock.quantity_on_hand` — which violates Iron Rule 1 (no atomic RPC, no audit trail) and breaks FIFO cost basis (no `stock_movement` row).

---

## 3. Scope — what this SPEC delivers

### 3.1 Fix F-1 (K2 completion)

Extend `m1_create_receipt_from_box` body to do the work that completes the receipt:

1. **Update `purchase_order_line.qty_received`** — `qty_received = qty_received + p_qty_received` per receipt line, scoped to (tenant_id, po_line_id).
2. **Recompute `purchase_order.status`** — after the qty_received update, evaluate aggregate state across all lines of the PO:
   - All lines `qty_received >= qty_ordered` → `fully_received`
   - Any line `qty_received > 0` AND any line `qty_received < qty_ordered` → `partial`
   - All lines `qty_received = 0` → stays `sent` (no transition; should not happen on receipt path but defensive)
3. **Populate `purchase_receipt_line.ordered_qty`** — copy from the K2 JSON input (the value is passed but currently ignored).
4. **Compute `purchase_receipt_line.discrepancy_qty`** — `ordered_qty - received_qty`. Positive = short. Negative = over. Zero = exact.
5. **Populate `purchase_receipt.discrepancy_status`** — aggregate across the receipt's lines: `none` (all zero), `short` (any positive discrepancy), `over` (any negative), `mixed` (both). Per D-M1-10's mandatory field set.

**Important:** preserve the existing K2 behavior for the "happy path" smoke that already passed in Procurement (₪234.82 supplier-debt fixture). Add the new fields and updates; do not regress the path that works.

### 3.2 Fix F-2 (variant-less manual lines)

The architect-recommended path from the original draft Brief is **Option (c) — skip `stock_lot` creation for variant-less lines**. Reasoning: (a) creating a sentinel "miscellaneous variant" pollutes the catalog and breaks FIFO semantics; (b) making `variant_id` nullable cascades to every FIFO query and breaks the JOIN graph. Skip-stock_lot is the minimal change.

Concretely:

1. In the K2 body's loop over receipt lines, branch on `is_manual_addition = true` (the column already exists on `purchase_receipt_line`).
2. For variant-less manual lines: insert the `purchase_receipt_line` row (with `variant_id = NULL`, `source = 'manual'`), do NOT insert a `stock_lot` row, do NOT insert a `stock_movement` row, do NOT increment `tenant_lens_stock`.
3. The receipt line still appears on the goods-receipt screen + counts toward `discrepancy_qty` computation (it's a real cost record).
4. For supplier_debt: the line still contributes to the receipt's total cost — debt creation (per D-M1-11 via `m1_create_supplier_debt_from_receipt`) includes the line.
5. Document in the audit comment on the function why this branch is correct + add a clear inline comment.

**Reviewer must verify** the variant-less lines participate in cost / debt but NOT in stock-on-hand math. This is the Day-1 behavior Daniel approved when D-M1-09 was locked.

### 3.3 Fix F-3 (stock-adjustment infrastructure)

Create the missing infrastructure for the ➖ flow (and the ➕ found-on-shelf path, which `record_adjustment_found` already covers — see note below).

**New table `stock_adjustment`** (canonical multi-tenant pattern):

- `id uuid PK DEFAULT gen_random_uuid()`
- `tenant_id uuid NOT NULL REFERENCES tenants(id)` — Iron Rule 14
- `performed_by uuid NOT NULL REFERENCES employees(id)` — who did it (PIN-verified upstream)
- `adjustment_type` — Pattern P19 (config-driven, not enum) — references `stock_adjustment_reason(id)` per tenant. Day-1 seed for both Prizma + demo: `'lost'`, `'damaged'`, `'count_correction_negative'`, `'count_correction_positive'`. Architect note: this is **explicitly P19/P40-compliant** — do NOT introduce a hardcoded enum.
- `notes text` (optional free-text)
- `created_at timestamptz DEFAULT now()`
- RLS: canonical two-policy pattern (service_bypass + tenant_isolation via JWT claim). Iron Rule 15.

**New table `stock_adjustment_reason`** (Pattern P19 config table):

- `id uuid PK`, `tenant_id uuid NOT NULL`
- `code text NOT NULL` (machine code: `lost`, `damaged`, etc.)
- `name_he text NOT NULL`, `name_en text NOT NULL`
- `direction smallint NOT NULL CHECK (direction IN (-1, +1))` — what direction this reason affects stock
- `is_active boolean DEFAULT true`
- `sort_order int DEFAULT 0`
- `UNIQUE (tenant_id, code)` — Iron Rule 18 (tenant-scoped UNIQUE)
- RLS as above. Day-1 seed: 4 rows per tenant as listed above.

**New RPC `record_adjustment_lost`** (SECURITY DEFINER, JWT-claim tenant validation per `SECURITY_HOTFIX_2026_05_13` pattern):

- Signature: `(p_variant_id uuid, p_location_id uuid, p_lot_id uuid, p_qty_lost int, p_reason_id uuid, p_pin text)`
- Pre-conditions: PIN verified via existing pin-auth path; qty_lost > 0; reason_id active and direction=-1; lot has enough qty.
- Atomic body:
  1. INSERT `stock_adjustment` (type via reason_id) → returns new `adjustment_id`
  2. Call `record_stock_movement` with `adjustment_id` set (satisfies `stock_movement_exactly_one_source`)
  3. Decrement `tenant_lens_stock.quantity_on_hand` atomically (`= quantity_on_hand - p_qty_lost`, never read-then-write)
  4. `writeLog()` for audit
- REVOKE EXECUTE FROM PUBLIC, anon (per ID-L-07).

**Note on `record_adjustment_found`:** an `_found` RPC already exists (Phase 1A). Verify it follows the same pattern — if not, fix it inline. If it does, leave it.

### 3.4 UI wiring

The screens already exist; they need their JS wired to the new RPCs:

1. **Inventory screen ➖ button** — replace the Phase 2 toast with a real PIN-verified call to `record_adjustment_lost`. Use the existing PIN modal pattern. Toast on success: "מלאי עודכן".
2. **Active POs List** — verify the status pipeline transitions render correctly after the new K2 behavior. The display already exists; just confirm the data path now drives it.
3. **Goods Receipt manual-add banner** — confirm the variant-less path now completes without client-side filtering. Remove the client-side filter.
4. **Settings panel for `stock_adjustment_reason`** — NOT in scope. Day-1 seed is enough; settings UI deferred to the M1 tenant-settings SPEC (F-07 in the audit).

### 3.5 Permissions

Two new permission keys, seeded to admin role + branch_manager role on both tenants:

- `inventory.adjust.lost` — required to call `record_adjustment_lost`
- `inventory.adjust.reason.manage` — reserved for future settings panel; seed but do NOT wire UI today

`inventory.adjust.found` may already exist (Phase 1A) — verify and reuse.

---

## 4. Out of scope (explicit deferrals)

- **No settings UI for `stock_adjustment_reason`** — seed only Day-1; settings panel is the next M1 SPEC after this (F-07).
- **No FX conversion in `effective_price`** — Strategic Review F-10, tied to tenant-2.
- **No 21 FK index additions** — `M1A_FK_INDEXES_PREP_FOR_1B` is a parallel SMALL SPEC, can run in any order.
- **No D-M1-09 violation cleanup** (goods-receipt to Module 1.5) — that's `M1_5_GOODS_RECEIPT_GENERIC_COMPONENT`, planned next after this.
- **No contact-lenses, no accessories, no M7 build start** — sequence per audit §4.2.
- **No Module 1 Close Ceremony** — that's a Cowork-Architect session, runs AFTER this SPEC ships 🟢.
- **No retirement of the 3 superseded draft Briefs in this Pipeline body itself.** The Pipeline's last step retires them with a one-line `STATUS: SUPERSEDED` header (per P-AR-08). This is a doc-only touch in the same commit batch.

---

## 5. Constraints — Iron Rule + project policy compliance

- **Iron Rule 1** (atomic quantity changes via RPC) — ➖ flow now genuinely uses RPC, not the JS workaround.
- **Iron Rule 14** (tenant_id on every new table) — both new tables.
- **Iron Rule 15** (RLS on every new table, canonical JWT-claim pattern) — both new tables, two-policy pattern.
- **Iron Rule 18** (UNIQUE per-tenant) — `stock_adjustment_reason(tenant_id, code)` unique.
- **Iron Rule 19/P19/P40** (config tables, not enums) — `adjustment_type` is config table, not enum. **This is the only architectural choice that differs from one of the draft Briefs** — the original draft mentioned an enum; this Brief explicitly rejects that.
- **Iron Rule 21** (No Orphans) — three draft Briefs retired in same Pipeline.
- **Iron Rule 22** (defense-in-depth on writes) — every INSERT includes `tenant_id: getTenantId()`.
- **Iron Rule 31** (integrity gate) — runs at every commit.
- **Iron Rule 32 — Destructive Operations** — see §6.
- **ID-L-07** (SECDEF RPCs REVOKE FROM PUBLIC, anon) — new RPC follows the hardened pattern.

---

## 6. Destructive Operations

This SPEC declares the following destructive operations:

1. **Retirement of 3 draft Briefs** — append a `STATUS: SUPERSEDED by M1_LENS_PHASE_1B_GAP_CLOSURE (2026-05-15)` header line to each. NOT deletion; the files stay on disk for historical reference per P30. This is a content-only edit, not a `git rm`.
2. **Modification of `M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md`** — append the same STATUS marker (per audit F-02). Content-only edit.

No file deletes, no mass renames, no `git rebase`, no `git reset --hard`, no `git push --force`, no SQL `DROP TABLE`, no `DROP COLUMN`, no `DROP POLICY`, no `TRUNCATE`, no DML mass-deletes, no CLAUDE.md section deletions, no main-branch modification.

If during execution the executor encounters a need for any destructive operation not listed above → STOP and escalate per Iron Rule 32.

---

## 7. Success Criteria

The SPEC is complete when:

### Functional (must verify on demo tenant)

1. **F-1 verification:** A PO with 3 lines of qty_ordered=3 each. Receive 2 of line A + 0 of line B + 3 of line C in one receipt.
   - `purchase_order_line.qty_received` = 2 / 0 / 3 respectively
   - `purchase_order.status` = `partial`
   - `purchase_receipt_line.ordered_qty` populated correctly (3, 3, 3)
   - `purchase_receipt_line.discrepancy_qty` = 1, 3, 0 respectively
   - `purchase_receipt.discrepancy_status` = `short`
   - Active POs List screen shows the PO with status `partial`
2. **F-1 continuation:** A second receipt completes the remaining qty for that PO.
   - `purchase_order.status` flips to `fully_received`
3. **F-2 verification:** Manual-add a variant-less line on a goods-receipt (bonus item, supplier name "X" supplier, qty=5, no variant selected).
   - K2 returns success (no 23502)
   - `purchase_receipt_line` row created with `variant_id=NULL`, `source='manual'`
   - NO `stock_lot` row created for this line
   - NO `stock_movement` row created for this line
   - `tenant_lens_stock` unchanged for this variant (because there is no variant)
   - Receipt total cost INCLUDES this line; supplier_debt INCLUDES this line
4. **F-3 verification:** From Inventory screen, click ➖ on a variant with 10 on hand, qty_lost=2, reason="damaged", PIN-verified.
   - `stock_adjustment` row created
   - `stock_movement` row created with `adjustment_id` set (constraint satisfied)
   - `tenant_lens_stock.quantity_on_hand` = 8 (atomic)
   - Toast shows "מלאי עודכן"
   - writeLog row exists
5. **Smoke matrix** — re-run the 3 Procurement smoke steps that previously failed; all pass.
6. **Cross-tenant isolation** — RLS verification: from demo session, attempt to read Prizma's `stock_adjustment` rows. Must return 0 rows.
7. **No anon access** — `record_adjustment_lost` REVOKE FROM PUBLIC, anon verified via `pg_proc.proacl` query.

### Non-functional

8. **Iron Rule 31 (integrity gate)** — exit 0 at every commit, no null-byte corruption, no mid-statement truncation.
9. **Smoke 7/7 PASS** — baseline smoke matrix unchanged.
10. **Reviewer 🟢 or 🟡 PASS WITH NOTES** — any notes must be NON-BLOCKING.
11. **Localhost-Tester 🟢 GREEN** — HTTP 200 on all 4 LENS_* HTML pages (lens-inventory, lens-pos-list, lens-goods-receipt, lens-purchase-order).
12. **Prizma untouched** — production tenant has no writes from this SPEC. Verify via row-count delta = 0 on (lens-related tables for Prizma) pre vs post.
13. **3 draft Briefs marked SUPERSEDED** — confirmed by grep for the STATUS marker.
14. **Hebrew summary returned** at end of Pipeline, 4 lines max, plain language, mentions: which 3 gaps closed + smoke pass + next-step recommendation.

---

## 8. Pre-Flight (mandatory before Commit 1)

The executor MUST run these probes against live DB and report results in SPEC §1.5 before any edits:

1. **Confirm `stock_movement_exactly_one_source` CHECK constraint exists** and matches the audit's text (`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='stock_movement_exactly_one_source'`).
2. **Confirm `stock_lot.variant_id` is NOT NULL** (`SELECT is_nullable FROM information_schema.columns WHERE table_name='stock_lot' AND column_name='variant_id'`).
3. **Confirm `purchase_order_line.qty_received` column exists and is type integer** (`information_schema.columns`).
4. **Confirm `purchase_receipt_line.ordered_qty + discrepancy_qty` columns exist** (Phase 1A delivered them per D-M1-10).
5. **Probe whether `record_adjustment_found` RPC already exists** (`SELECT proname FROM pg_proc WHERE proname='record_adjustment_found'`) — if YES, read its body and confirm it follows the canonical pattern; if NO, surface as a finding (do not fix in this SPEC unless trivial).
6. **Probe `stock_adjustment` table existence** to confirm it does NOT exist yet (`SELECT to_regclass('public.stock_adjustment')` should return NULL).
7. **Probe whether `inventory.adjust.found` permission already exists** in `permissions` table (Phase 1A may have seeded it).
8. **Probe `purchase_order.status` allowed values** — current enum / CHECK / text constraint definition.

If any probe reveals a divergence from the Brief's assumptions → STOP and escalate. Do not silently amend.

---

## 9. Execution Flow

Full Auto Pipeline, single chat. Skill chain:

1. **opticup-strategic (Foreman)** — read this Brief, run §8 Pre-Flight probes against live DB, author the SPEC.md at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md`. Include §1.5 Pre-Flight Findings section per the post-2026-05-15 template.
2. **opticup-executor** — execute the SPEC commit-by-commit. Expected commits: probably 5-7 (migration for new tables/RPCs, K2 body extension, F-2 branch, F-3 UI wiring, permissions seed, retirement markers, retro).
3. **opticup-reviewer** — full code review against the 14 success criteria.
4. **opticup-localhost-tester** — runtime smoke on demo tenant. Verify all 4 LENS_* HTML pages load + execute the F-1/F-2/F-3 functional probes.
5. **opticup-strategic (Foreman)** — close the SPEC: write FOREMAN_REVIEW.md, harvest skill improvements, return Hebrew summary to Daniel.

**Estimated total Pipeline time:** 4-6 hours (single chat).

If executor or reviewer surfaces a CRITICAL deviation → escalation file at `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_GAP_CLOSURE_BLOCKER.md` + one Hebrew line to Daniel. Otherwise — execute to close.

---

## 10. Hebrew summary template (Foreman closes with this shape)

```
M1_LENS_PHASE_1B_GAP_CLOSURE נסגר 🟢. 3 חולשות קריטיות נסגרו:
F-1 PO status מתעדכן אחרי קבלת סחורה + שדות הפרשים מאוכלסים.
F-2 שורות ידניות בלי וריאנט (פריטי בונוס) נכנסות למערכת.
F-3 כפתור ➖ עובד דרך RPC אטומי עם PIN.
smoke 7/7 PASS, פריזמה לא נגעה. ההמלצה הבאה: טקס סגירת מודול 1 לפני שמתחילים M7.
```

---

*End of Brief. Single-Pipeline gap-closure for M1 Lens production correctness. Iron Rule 32 §Destructive Operations declared above. Sequence resumes per audit §4.2 after this 🟢.*
