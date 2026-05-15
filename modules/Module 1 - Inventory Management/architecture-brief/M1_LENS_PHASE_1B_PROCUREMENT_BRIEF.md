# Module Brief — M1_LENS_PHASE_1B_PROCUREMENT (3 write-heavy screens)

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Foreman review
**Pipeline:** Full Auto Pipeline (single chat, end-to-end)
**Branch:** `develop`. Daniel-only merge to main after Pipeline closes 🟢.
**Pre-conditions:**
1. `M1_SKILL_IMPROVEMENT_HARVEST` closed 🟢 (skill state inherited).
2. `M1_LENS_PHASE_1B_FOUNDATION` closed 🟢.
3. Daniel manual QA on the 3 foundation screens on demo: PASS.

---

## 1. Purpose

This SPEC ships the **procurement half** of Phase 1B: three write-heavy screens that wire the M1B0 schema and RPCs through user-facing UI. Together with the foundation half (closed earlier), this completes the original Phase 1B scope (6 customer-facing screens) and unblocks M7 + M9 build.

**The three screens:**
1. **Purchase Order** (per supplier — Mockup #4) — creates PO with stock + custom-per-customer + manual lines.
2. **Active POs List** (manager — Mockup #6) — display-only list, status pipeline, cancel-from-row.
3. **Goods Receipt** (receiving employee — Mockup #7) — receives lines against a PO, creates stock_lot rows + stock_movement + supplier_debt.

This is the largest single write-scope in the module: 5 distinct RPC types invoked from UI, 2 transactional flows (PO place + GR close), 1 cancel flow, full inventory + accounting effect. Functional smoke runs end-to-end on demo.

---

## 2. Scope — In

Three screens + their JS folders + the ➕➖ wiring on the foundation Inventory screen (deferred from foundation SPEC).

### Screen #4 — Purchase Order (per supplier)

**File:** `lens-purchase-order.html` at root (allowlist).
**JS folder:** `modules/lens-purchase-order/` (5-8 sub-files).
**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html`.

**Flow:**
1. User opens the screen, selects a supplier (defaults to "all suppliers" with section breaks per source).
2. Screen displays in three sections per D-M1-07:
   - **Stock shortages** — auto-filled from `tenant_lens_stock` rows where `qty_on_hand < reorder_threshold` (threshold UI editable per-row, persisted to `tenant_lens_stock.reorder_threshold` if column exists; otherwise to a new `pricing_overlay`-style table — Module Strategist confirms via probe).
   - **Custom-per-customer** — currently empty in Phase 1B (M7 not built). UI section exists but shows "מודול הזמנות (M7) טרם נבנה" placeholder.
   - **Manual** — free-form add (description + qty + unit cost + currency).
3. User edits qty, removes lines, adds manual lines.
4. User clicks "Create PO" → calls `place_purchase_order` RPC (from M1B0).
5. PO created in `status='draft'`.
6. User can mark sent (calls `mark_po_sent`) or export PDF/Excel (client-side render; Phase 1A `lens-catalog-import` EF pattern NOT reused — this is browser-side PDF generation from the PO row + lines).

**RPCs used (existing from M1B0):**
- `place_purchase_order(p_tenant_id, p_supplier_id, p_lines JSONB, p_expected_delivery_at, p_notes)`
- `mark_po_sent(p_tenant_id, p_po_id)`

**No NEW RPCs needed in this screen** beyond what M1B0 shipped.

**PDF/Excel export:** browser-side. Use existing project pattern from `modules/Module 4 - CRM/` or `modules/Module 1.5/` if one exists; otherwise a small dep-free vanilla approach (window.print or a simple HTML-to-PDF library — Module Strategist decides via probe). The export is decorative output, not transactional.

### Screen #5 — Active POs List (manager)

**File:** `lens-pos-list.html` at root (allowlist).
**JS folder:** `modules/lens-pos-list/` (3-5 sub-files).
**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html`.

**Flow:**
1. Display list of all `purchase_order` rows for tenant, filtered by status (default: not-cancelled, not-fully-received).
2. Columns per mockup: po_number, supplier, ordered_at, expected_delivery_at, status, line count, total amount.
3. Row click → expand inline OR navigate to PO detail (Module Strategist decides; mockup suggests inline expand).
4. Row menu (3-dot): Cancel (calls `cancel_purchase_order`), View PDF (client-side regen), Mark fully received (manual override — calls a small new RPC, see below).

**New RPC needed:**
- `force_mark_po_received(p_tenant_id, p_po_id, p_reason TEXT) RETURNS VOID` — manual override for edge cases where GR was bypassed. UPDATEs `purchase_order.status='fully_received'` if currently `partial`. Audit-logs to `change_approval_log`. SECURITY DEFINER + standard discipline. Requires `lens.pos.force_override` permission (rare — manager-only). **OPTIONAL:** Module Strategist may decide this is out-of-scope and defer; not blocking.

**No transactional writes from this screen except `cancel_purchase_order` + optional `force_mark_po_received`.**

### Screen #6 — Goods Receipt (receiving employee)

**File:** `lens-goods-receipt.html` at root (allowlist).
**JS folder:** `modules/lens-goods-receipt/` (6-9 sub-files — most complex screen).
**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html`.

**Flow:**
1. User opens screen, scans/enters delivery note number (mandatory per D-M1-09).
2. User picks supplier (auto-filled if delivery note matches an active PO via fuzzy match; otherwise manual).
3. Screen shows expected PO lines (from `purchase_order_line` where `purchase_order.supplier_id` matches + `status IN ('sent','partial')`).
4. User confirms qty received per line (default = qty_ordered; user adjusts down for short shipments → `discrepancy_qty` populated on `purchase_receipt_line` per Phase 1A schema).
5. User can add lines NOT on the original PO (e.g., bonus items, samples — qty 0 cost) — adds as `purchase_receipt_line` with `purchase_order_line_id NULL`.
6. Optional: link to M9 `shipping_box_id` (if user provides — M9 not yet built, so UI shows field but most users leave it blank).
7. User clicks "Close receipt" → calls `m1_create_receipt_from_box` (K2 RPC, Phase 1A + M1B0 extended). This:
   - Creates `purchase_receipt` row.
   - Creates N `purchase_receipt_line` rows (1 per actual-received line).
   - Creates N `stock_lot` rows (1 per line, lot_number generated by `next_lot_number`).
   - Creates N `stock_movement(movement_type='receipt', qty_delta=qty_received)` rows.
   - Creates 1 `supplier_debt` row via `m1_create_supplier_debt_from_receipt` (M1B0 wiring).
   - UPDATEs `purchase_order_line.qty_received += qty_received`.
   - UPDATEs `purchase_order.status` to `partial` or `fully_received` based on aggregate.

**Critical detail:** K2 already does all of this since M1B0 wired it. Screen-side, the only complexity is **gathering the input** (a transactional JSONB array) and **calling K2 once**.

**No new RPCs needed in this screen** beyond what M1B0 + Phase 1A shipped.

### Re-visit Screen #1 — Wire the ➕➖ buttons (deferred from foundation)

In `M1_LENS_PHASE_1B_FOUNDATION` the inventory screen's ➕➖ buttons surfaced a "Stock changes happen via Goods Receipt" modal. **In this SPEC, they actually wire** to either:

- ➕ → Quick-receipt modal (mini Goods Receipt flow for a single variant; calls K2 with 1 line) — Module Strategist decides if this is needed Day-1.
- ➖ → Quick-adjustment modal (calls `record_adjustment_found` for found-stock or `record_stock_movement` with `movement_type='adjustment_lost'` for lost-stock; PIN-protected per Iron Rule 1).

**OR** the buttons stay as "navigate to full Goods Receipt screen with this variant pre-selected" deep-link. *Architect recommendation: deep-link Day-1.* Reasoning: a quick-receipt modal duplicates 80% of Goods Receipt logic; reuse is cleaner Day-1; quick-receipt is Phase 2+.

### Shared infrastructure

- Same as foundation Brief: `is_user_authorized_for`, `DB.fetchAll`, `escapeHtml`, `Modal.*`, tenant-branding header.
- New permission keys: `lens.po.create`, `lens.po.view`, `lens.po.cancel`, `lens.gr.create`, `lens.gr.add_manual_line`, `lens.inventory.adjust` (for the ➖ wiring).
- PIN protection on the ➖ adjust flow (Iron Rule 1 — quantity changes require PIN). Reuse `pin-auth` Edge Function.

### Functional smoke (mandatory before close)

Smoke is **end-to-end procurement flow** on demo. Each step verified independently.

1. **PO creation (full flow):** open Purchase Order screen → select supplier (the demo supplier from M1B0 smoke) → add 1 stock line (variant from M1B0 fixtures) + 1 manual line → click Create. Verify: `purchase_order(status='draft')` created, 2 `purchase_order_line` rows present, no `stock_lot` yet (no receipt).
2. **Mark sent:** open new PO from POs List → row menu → mark sent. Verify `status='sent'`, `sent_to_supplier_at` populated.
3. **Goods Receipt (full happy path):** open Goods Receipt → enter delivery note `DN-TEST-001` → screen auto-finds the PO → confirm 2 lines received as ordered → close. Verify: `purchase_receipt` row, 2 `purchase_receipt_line` rows, 2 `stock_lot` rows, 2 `stock_movement(receipt)` rows, 1 `supplier_debt` row (`total_amount` matches expected calc), `purchase_order.status='fully_received'`.
4. **Goods Receipt (short shipment):** create another PO with 5 units → receive only 3 → verify `discrepancy_qty=2` on the receipt line, `purchase_order.status='partial'`, `qty_received=3` on PO line.
5. **Goods Receipt (manual line):** create another PO → receive + add 1 manual line (not on PO) → verify the manual line is in receipt + stock_lot exists + debt total reflects manual line's value.
6. **Cancel PO:** create another PO → cancel via POs List → verify `status='cancelled'`, no stock_lot created, no debt.
7. **PO list display:** open Active POs List → confirm all 4+ POs above visible with correct status + correct totals.
8. **Inventory screen ➖ wiring:** open Inventory → click ➖ on a variant with stock from step 3 → enter PIN → adjust qty by -1 → verify `stock_movement(adjustment_lost)` created, `tenant_lens_stock.qty_on_hand` decreased by 1, `stock_lot.qty_remaining` decreased by 1.
9. **Inventory screen ➕ deep-link:** click ➕ on a variant → land on Goods Receipt with that variant pre-selected.
10. **Anon-reject test:** anon JWT calling any of the 3 NEW RPCs (only `force_mark_po_received` if shipped) → 42501.
11. **Cross-tenant guard test:** tenant-A JWT trying to cancel tenant-B's PO → RAISE.
12. **Permission gates:** demo user without `lens.gr.create` opens Goods Receipt → redirect to error page.
13. **No console errors** at any screen + any interaction.
14. **PDF export smoke:** create PO → click "Export PDF" → confirm browser saves a non-empty PDF file with PO details.

If any smoke step fails → STOP and escalate.

---

## 3. Scope — Out (anti-creep)

Explicitly NOT in this SPEC:

- **The 3 foundation screens.** Closed in sibling SPEC.
- **Quick-receipt modal** from the ➕ button. Deep-link instead.
- **Auto-send PO to supplier** (email/WhatsApp/API). Phase 2+.
- **Custom-per-customer line wiring to M7 sale_order.** M7 not built; UI shows placeholder.
- **Payment-allocation against supplier_debt.** M8 territory.
- **Discrepancy resolution workflow** (separate UI to investigate/accept/reject discrepancies). Phase 2+.
- **Reconciliation Agent** (uses Phase 1A schema readiness, but the agent itself is Phase 2+).
- **FX conversion in PO/GR totals.** ILS-only Day-1.
- **Modifying mockups, decisions/M1.md, Phase 1 Brief.**
- **CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT** beyond standard docs-only effect.
- **`lens-catalog-admin.html` or the 17 Phase 1A tables**.
- **Promotional discount engine** (time-windowed overlays).
- **Bulk PO creation across suppliers**. One PO = one supplier (current scope).
- **Soft-deleting completed POs.** Out-of-scope; deferred to Phase 2 housekeeping.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Procurement ships AFTER foundation closes + Daniel QA-passes | Architect |
| 2 | ➕➖ wiring on Inventory screen = deep-link to GR (not quick-modal) Day-1 | Architect recommendation |
| 3 | PDF/Excel export is browser-side; no server EF | Architect — keeps procurement simple |
| 4 | `force_mark_po_received` optional Day-1; Module Strategist decides | Architect |
| 5 | Manual lines on GR allowed (not all received lines must come from a PO) | D-M1-09 + mockup |
| 6 | Goods Receipt links to M9 shipping_box_id optionally (M9 not built yet) | Phase 1A pattern |
| 7 | All new RPCs (if any) inherit M1A_OPERATIONS_RPCS_FIX discipline | Project policy |
| 8 | PIN protection on stock-decrement flows (Iron Rule 1) | Project policy |
| 9 | Iron Rule 32 §7 = None | Project policy |
| 10 | Single Pipeline run for 3 screens + ➕➖ wiring + smoke | Architect |

---

## 5. Success Criteria

1. **3 new HTML pages at root**, allowlisted. Verified by `ls *.html | grep lens-` + allowlist grep.
2. **3 new JS folders under `modules/lens-*/`** with file counts appropriate.
3. **No file > 350 lines.** Verified by `find`.
4. **0 or 1 new RPC** (`force_mark_po_received` optional). If 1: SECURITY DEFINER + search_path + JWT + REVOKE/GRANT.
5. **Inventory screen ➖ wiring requires PIN + creates `stock_movement(adjustment_lost)`.** Verified by smoke step 8.
6. **Inventory screen ➕ deep-links to GR with pre-selected variant.** Verified by smoke step 9.
7. **PDF export produces non-empty file.** Verified by smoke step 14.
8. **All DB reads through wrapper** (Iron Rule 7).
9. **Every screen calls permission gate at page load.**
10. **Functional smoke 14/14 PASS on demo.** Captured in TEST_REPORT.md.
11. **No new console errors at any screen + any interaction.**
12. **Iron Rules** — no new violations.
13. **No new HIGH/ERROR advisor lints** — run `scripts/audit/advisors-for-objects.mjs` against the 1 new RPC (if any).
14. **K2 + K3 wiring verified end-to-end** through GR happy path (smoke step 3). `pending_lens_advancement_queue` row inserted when `sale_order_id` present (test with a fixture sale_order_id for now — Module Strategist decides if to insert a fake row or skip this branch in smoke).
15. **`supplier_debt.total_amount` calculation verified** via smoke (matches M1B0 known-good 234.82 pattern with new totals).
16. **`purchase_order.status` lifecycle verified** — draft → sent → partial → fully_received → (cancelled) — each transition exercised in smoke.
17. **No Prizma data written.** All smoke on demo.
18. **Iron Rule 32 §7 = None.**
19. **Commit count: 12-18, single-concern, on `develop`.**
20. **`docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md`** updated.
21. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW** inside SPEC folder.
22. **Module-level docs** (SESSION_CONTEXT, CHANGELOG, MODULE_MAP, ROADMAP) updated — Phase 1B fully closed once this SPEC closes.
23. **MIGRATION.md Applied Log** (per harvested E1) if any DDL applied; if pure UI + 0 RPCs, no MIGRATION.md needed.

Module Strategist may add criteria.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

Inherits MANDATORY §0 audits per harvest (Inner-call arity + Smoke-touched schema) + Concurrent-Pipeline awareness envelope.

```sql
-- Probe 1: confirm M1B0 fixtures still present on demo
SELECT po_number, status FROM purchase_order WHERE tenant_id = '...demo-uuid...';
SELECT count(*) FROM purchase_order_line WHERE tenant_id = '...demo-uuid...';
SELECT count(*) FROM supplier_debt WHERE tenant_id = '...demo-uuid...';
SELECT count(*) FROM stock_lot WHERE tenant_id = '...demo-uuid...';

-- Probe 2: confirm foundation screens deployed (3 HTML pages, 3 JS folders)
-- via shell

-- Probe 3: confirm permission keys from foundation seeded
SELECT permission_key FROM permissions WHERE permission_key LIKE 'lens.%';

-- Probe 4: confirm K2 + K3 wiring from M1B0 still intact
SELECT pg_get_functiondef('m1_create_receipt_from_box'::regproc);
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%m9_lens%';

-- Probe 5: tenant_lens_stock.reorder_threshold column existence
SELECT column_name FROM information_schema.columns
WHERE table_name='tenant_lens_stock' AND column_name LIKE '%threshold%';

-- Probe 6: existing PDF generation pattern in the project
-- via shell: grep -rn "jsPDF\|html2canvas\|window.print" js/ modules/ shared/ | head -10

-- Probe 7: PIN-auth Edge Function shape (for ➖ wiring)
-- via shell: ls supabase/functions/pin-auth/

-- Probe 8: existing deep-link pattern (URL params)
-- via shell: grep -rn "urlParams\|URLSearchParams" js/shared.js modules/ | head -5

-- Probe 9: discrepancy column shape on purchase_receipt_line
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='purchase_receipt_line' AND column_name LIKE '%discrepancy%';

-- Probe 10: existing PO/GR pattern in frames era for any reuse opportunity
-- via shell: ls modules/goods-receipts/ modules/purchase-orders/ 2>/dev/null
```

Pin every result. If foundation didn't seed permission keys, this SPEC adds them.

---

## 7. Iron Rules in Sharp Focus

- **Rule 1** — every stock-decrement requires PIN.
- **Rule 2** — `writeLog()` called for every quantity change (the ➖ flow + GR close).
- **Rule 7** — DB wrapper only.
- **Rule 8** — sanitize all dynamic HTML.
- **Rule 11** — sequence numbers via RPC (PO already has `next_po_number`, GR already has `next_receipt_number`).
- **Rule 12** — file size.
- **Rule 14, 15, 18** — RLS canonical, UNIQUE tenant-scoped (no new tables but verify if any DDL).
- **Rule 19** — status enum bounded.
- **Rule 21** — reuse `pin-auth`, `Modal`, etc.; no helper reimplementation.
- **Rule 22** — defense-in-depth.
- **Rule 31, 32** — gate + None.

---

## 8. Anti-Patterns (Things to Avoid)

- **Authoring blind.** §6 probes first.
- **Building a quick-receipt modal.** Deep-link instead Day-1.
- **Implementing PDF generation as an Edge Function.** Browser-side.
- **Reinventing PIN UX.** Use `pin-auth` EF + existing PIN modal from `shared/components/`.
- **Reinventing `Modal.*`.**
- **Modifying foundation screens** beyond the ➕➖ wiring.
- **Modifying Phase 1A or M1B0 RPC bodies.** Read-only consumers.
- **`window.prompt()` / `window.confirm()`.**
- **Skipping any of the 14 smoke steps.**
- **Cross-tenant writes in smoke.**
- **Touching Prizma.**
- **Inventing new RPCs not named in this Brief.** Out-of-scope.

---

## 9. Open Questions for the Module Strategist

1. **`force_mark_po_received` RPC — ship Day-1 or defer?**
*Recommendation: defer.* Manual override is rare; can be added in a small follow-up if Daniel surfaces a real case.

2. **PDF generation library — vanilla `window.print` or a lib like jsPDF?**
*Recommendation: vanilla `window.print` with print stylesheet Day-1.* Zero deps; adequate for PO export. Library is Phase 2+ if Daniel wants nicer PDFs.

3. **➕ deep-link or quick-modal?**
*Recommendation: deep-link Day-1 (locked decision #2).*

4. **Manual lines on GR with `unit_cost=0` — accept or reject?**
*Recommendation: accept (bonus items are real).* Surfaces in `supplier_debt.total_amount` as 0-contribution.

5. **`tenant_lens_stock.reorder_threshold` — does the column exist or need to be added?**
*Recommendation: probe first; if missing, add via small migration in this SPEC* OR move threshold to a new table if Module Strategist sees coupling concerns.

6. **K3 (lab advancement) wiring in GR smoke — fixture sale_order_id or skip branch?**
*Recommendation: skip in smoke Day-1.* M7 not built, no real sale_order_id to use. K3 branch was already verified in M1B0 smoke via direct insert; UI-driven test adds little.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html` | Screen #4 |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html` | Screen #5 |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` | Screen #6 |
| `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_FOUNDATION_BRIEF.md` | Sibling Brief — shared infra |
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` | Schema + 5 RPCs reference |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md` | Discipline reference |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md` | K2 + K3 baseline |
| `modules/goods-receipts/` (legacy frames era) | UX-pattern reference per D-M1-09 |
| `supabase/functions/pin-auth/` | Stock-decrement gate |
| `shared/components/` | Modal, Toast, PIN modal |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | D-M1-07 (PO source-split), D-M1-09 (GR anchored on frames), D-M1-11 (debt at receipt) |
| `CLAUDE.md` | Iron Rules + Authority Matrix |

---

## 11. Hand-off Note

Full Auto Pipeline. Activation Prompt held in repo; delivered to Daniel ONLY after both pre-conditions satisfied (`M1_SKILL_IMPROVEMENT_HARVEST` 🟢 + `M1_LENS_PHASE_1B_FOUNDATION` 🟢 + Daniel QA-pass).

Pipeline order:
1. `opticup-strategic` reads this Brief + runs §6 probes + applies harvested patterns.
2. Authors `SPEC.md` inside `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/`.
3. Hand-off to `opticup-executor`.
4. Executor builds 3 screens + ➕➖ wiring + smoke. **Functional smoke 14/14 on demo before close.**
5. Writes EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION.md (if DDL) + ROLLBACK.
6. `opticup-reviewer` → REVIEW.md.
7. `opticup-strategic` Foreman-reviews → FOREMAN_REVIEW.md.
8. ONE Hebrew status line to Daniel.

After 🟢: Phase 1B fully closed. Module 1 Lens scope DONE pre-LIVE (the 3 extension tables — contact lenses + accessories — are future M1 phases). M7 + M9 build can begin.

---

*End of Brief. 3 write-heavy procurement screens + ➕➖ wiring + 14-step end-to-end smoke. Inherits all prior discipline. Closes Phase 1B in two SPECs total.*
