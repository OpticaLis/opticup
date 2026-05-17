# SPEC — M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-17
> **Module:** 1 — Inventory Management
> **Phase:** Lens rebuild Phase 0 — Foundation (SPEC 4a of 4 sequential)
> **Author signature:** Claude Code Foreman session, Windows desktop, 2026-05-17
> **Source Brief:** `architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md` §SPEC 4a (also referenced as 3.5)
> **Hard dependencies:** SPEC 2 (shared components) + SPEC 3 (DB schema) MUST be closed before this SPEC executes

---

## 0. Pre-Authoring Reality Check

### What lives where (verified 2026-05-17)

**Live `lens-inventory` screen** (already at 1:1 mockup fidelity per `M1_LENS_INVENTORY_MOCKUP_1TO1`, merged 2026-05-18):
- `modules/lens-inventory/lens-inventory-partial.html` (652 lines)
- `modules/lens-inventory/lens-inventory-main.js` + filters/grid/lot-pane/modals/quick-scan helpers
- `css/lens-inventory-page.css` (per-screen CSS, untouched by SPEC 1)
- `css/lens-inventory-modals.css` (per-screen modal CSS)

**Mockup updates from Round 1 + Round 2** (already in `architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html`, 1503 lines):
- Quick Receipt drawer (right-pinned, Daniel decision Round 2 #9 = SOLE entry path)
- Price columns in lots-table + movements-table (`.col-permission-gated` + `data-permission="inventory.view_cost_price"`)
- Entry-helper-strip below scanner area
- Bulk wizard funnels through drawer
- Scanner + manual-add + scan-modal all route to drawer

**Pending live integration** (= this SPEC's job):
- Quick Receipt drawer is in the MOCKUP HTML but NOT in the live partial — needs to be wired via SPEC 2's `quick-receipt-drawer.js` shared component
- Price columns are in the MOCKUP HTML — need to be added to the live partial's lots-table + movements-table renderers
- Permission gating wiring (`inventory.view_cost_price`) needs hookup to permission-ui helpers
- Lens Details drawer (right-side, lens-pricing screen primarily — but inventory side-panel may also benefit) — SPEC 2 ships it; SPEC 4a doesn't need to wire it into inventory if the side panel's lot-pane suffices

### Hard dependencies (blocking)

This SPEC's execution requires the following preconditions:

1. **SPEC 2 closed.** Shared components `quick-receipt-drawer.js` + `quick-receipt.css` available at `shared/js/` + `shared/css/`. (Plus `data-table.js` column-permission support, OR an equivalent mechanism if the executor's Rule 21 investigation chose to extend `table-builder.js`.)
2. **SPEC 3 closed.** `purchase_receipt.has_no_invoice` column + permission keys `inventory.view_cost_price` + `lens_pricing.edit` seeded in live DB.
3. **SPEC 1 closed** (already done — `0949e97`). The lens-tabs.css palette is mockup-aligned.

### Lessons applied from prior SPECs

- **From `M1_LENS_INVENTORY_MOCKUP_1TO1/FOREMAN_REVIEW.md`:** the 1:1 rebuild pattern — partial HTML mirrors mockup structure 1:1, JS substitutes data only — APPLIED in §9 expected final state.
- **From SPEC 1 of this Pipeline (M1_LENS_PALETTE_RETIRE_UNIFIED):** the `.col-permission-gated` CSS class is already in the lens-tabs.css palette (token `chip-overdue` added; `.col-permission-gated` is in `lens-inventory-page.css` per the 1:1 rebuild). Confirm executor's pre-flight that the class is available before wiring.
- **From this Brief's decision #9 (Quick Receipt = sole entry path):** the bulk wizard must funnel through the drawer — already represented in the mockup. Live partial must reflect this.

### Baselines (captured at SPEC authoring time — re-verify at execute time)

| Symbol | File | Metric | Value (captured 2026-05-17) |
|---|---|---|---|
| `BASE_LIVE_PARTIAL_LINES` | `modules/lens-inventory/lens-inventory-partial.html` | `wc -l` | 652 |
| `BASE_LIVE_JS_FILES` | `modules/lens-inventory/*.js` | count | 8 |
| `BASE_MOCKUP_LINES` | `architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` | `wc -l` | 1503 |

Expected post-execution: `BASE_LIVE_PARTIAL_LINES` grows by 150-250 (drawer markup + helper strip + price column additions) → ~800-900 line partial.

---

## 1. Goal

Apply the Round 1 + Round 2 mockup updates (Quick Receipt drawer as SOLE inventory-entry path + price columns with permission gating + entry-helper-strip + scanner/manual-add/bulk-wizard funneling) to the live `lens-inventory` screen by wiring it to the shared components built in SPEC 2 and consuming the DB schema delivered in SPEC 3.

---

## 2. Background & Motivation

The lens-inventory screen was rebuilt to 1:1 mockup fidelity by `M1_LENS_INVENTORY_MOCKUP_1TO1` (merged 2026-05-18). Round 1 (commit `ae1a5de`) + Round 2 (commit `b2d1a4b`) added 3 features to the mockup that haven't yet propagated to the live screen:

1. **Quick Receipt drawer (Daniel decision #9 — SOLE entry path)** — replaces direct-to-stock paths. Captures `delivery_note_number` + `supplier_id` + `receipt_date` + `has_no_invoice` ONCE per session for N items.
2. **Price columns with permission gating** — `מחיר מכירה` always visible; `מחיר עלות` gated by `inventory.view_cost_price`. Pattern uses `.col-permission-gated` + `data-permission` attribute.
3. **Entry-helper-strip** — persistent reminder below scanner area.

These features depend on SPEC 2's shared `quick-receipt-drawer` component + SPEC 3's `purchase_receipt.has_no_invoice` column + permission keys.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | `develop`, clean post-push | `git status` |
| 2 | Commits produced | 4-5 (author + 2-3 execution + close) | `git log {SPEC_START}..HEAD --oneline \| wc -l` |
| 3 | `lens-inventory-partial.html` line count | 800-950 (grows by ~150-300 from current 652) | `wc -l` |
| 4 | Quick Receipt drawer wired | `<div id="quickReceiptDrawer">` present, populated by `QuickReceiptDrawer.init()` from shared module | grep + JS load test |
| 5 | Top scanner button "סריקה — הוספה" opens drawer | onclick or event handler triggers `quickReceiptDrawer.classList.add('active')` | grep + Chrome MCP click |
| 6 | Manual-add button opens drawer | same | grep |
| 7 | Bulk wizard funnels to drawer | bulk wizard's success button onclick closes bulkModal + opens drawer (per mockup) | grep |
| 8 | "קבל סחורה" button added to top header | present + opens drawer | grep |
| 9 | Entry-helper-strip rendered below page-header | `<div class="entry-helper-strip">` present with ℹ️ + Hebrew text | grep |
| 10 | Price columns added to lots-table | `מחיר מכירה` th + td present; `מחיר עלות` th + td present with `.col-permission-gated` + `data-permission="inventory.view_cost_price"` | grep on partial + rendered DOM |
| 11 | Price columns added to movements-table | same pattern, between `כמות` and `מסמך` columns | grep |
| 12 | Permission gating works | when authenticated as a user WITHOUT `inventory.view_cost_price`, cost columns are hidden via JS | Chrome MCP test |
| 13 | Quick Receipt drawer "סיים קבלה" persists items | clicking finishes → all staged items inherit shared `delivery_note_number` + `supplier_id` + `receipt_date` (+ `has_no_invoice` if checked) into `purchase_receipt` row + `purchase_receipt_line` children | Chrome MCP test on demo + Supabase MCP verify |
| 14 | "אין תעודה" checkbox sets `has_no_invoice=TRUE` | the boolean lands in the receipt row | Supabase MCP verify |
| 15 | NO direct-to-stock paths remain | grep on partial + JS for any code that bypasses the drawer (e.g., direct `purchase_receipt` insert outside the drawer flow) | grep |
| 16 | Tier C VFV — side-by-side Chrome MCP comparison of mockup vs live shows 100% match on the 3 new features | screenshots in SPEC folder | screenshots/ subdir |
| 17 | Iron Rule 12 — no file > 350 lines (or split if exceeded) | `wc -l` on all modified JS files | grep |
| 18 | Iron Rule 31 (integrity gate) | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| 19 | Iron Rule 22 (defense-in-depth) — every new insert + select includes tenant_id | code review | grep |
| 20 | Pre-commit hooks clean per commit | 0 violations, 0 warnings | committed commits' output |
| 21 | EXECUTION_REPORT + FOREMAN_REVIEW written | files exist | `ls` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Modify `modules/lens-inventory/lens-inventory-partial.html` + per-screen JS files
- Modify `css/lens-inventory-page.css` IF needed for new selectors (avoid if possible — prefer shared CSS from SPEC 2)
- Consume shared components from SPEC 2 — `QuickReceiptDrawer.init()`, `DataTable.init()` (or equivalent), etc.
- Insert + select on `purchase_receipt` + `purchase_receipt_line` via existing RPCs (do NOT add new RPCs in this SPEC)
- Run smoke tests on demo tenant
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- ANY change to shared components from SPEC 2 — those have a sealed API; if SPEC 4a needs a different API, escalate to amend SPEC 2 (not work around it locally)
- ANY DB DDL — out of scope (SPEC 3's territory)
- ANY Prizma data writes — Brief forbids
- ANY change to other lens screens — that's SPECs 5-9
- ANY direct-to-stock code path remaining after the SPEC closes (Brief decision #9 is non-overridable)
- Pre-commit hook fails — fix root cause, do NOT `--no-verify`

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- If SPEC 2 shared components are missing or have a different API than this SPEC assumes → STOP, escalate (either author SPEC 2 amendment or this SPEC needs adjustment)
- If SPEC 3 `has_no_invoice` column doesn't exist in live DB → STOP (means SPEC 3 wasn't actually executed)
- If `inventory.view_cost_price` permission key doesn't exist in live permissions table → STOP, same reason
- If Tier C side-by-side comparison shows ANY direct-to-stock path remaining → STOP, this is a Brief-decision #9 violation
- If the existing 1:1 lens-inventory grid (SPH×CYL) regresses → STOP, this SPEC must not regress prior work

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:
- Pre-author git tag: `pre-m1-lens-inv-quick-receipt-2026-05-17` placed at SPEC_START commit
- `git reset --hard <tag>` rolls back partial/JS changes
- DB state — no rollback needed (SPEC 3's schema changes are independent and stable)
- Notify Foreman; SPEC marked REOPEN

---

## 7. Destructive Operations

`None.`

This SPEC performs:
- Partial HTML edits (additive markup — drawer, helper strip, price columns)
- JS edits (additive event handlers + drawer wiring)
- No file deletes, no mass renames, no DDL, no governance-file removals

No `DROP`, `DELETE`, `TRUNCATE`, `REVOKE`, `git rebase`, `git reset --hard`, `git push --force`, or main-branch touches authorized.

---

## 8. Out of Scope (explicit)

- Other 5 lens screens (designs / pricing / PO / pos-list / GR / catalog) — SPECs 5-9
- Frames inventory screen — outside Module 1 lens scope
- Storefront — different repo
- DB schema — SPEC 3
- Shared components themselves — SPEC 2
- New RPCs — use existing ones
- Performance tuning — defer

---

## 9. Expected Final State

### Modified files

1. `modules/lens-inventory/lens-inventory-partial.html` (652 → ~800-900 lines):
   - Entry-helper-strip inserted below `</page-header>` (~5 new lines)
   - "קבל סחורה" top header button added (~3 new lines)
   - Quick Receipt drawer mount point added at end of partial (`<div id="quickReceiptDrawer"></div>` — the shared component populates) (~5 new lines)
   - Manual-add button onclick updated to open drawer (1 line attribute change)
   - Bulk wizard `<button>` onclick updated to close wizard + open drawer (1 line change)
   - Scanner modal "in" mode submit updated (~3 line JS change) — already in mockup
   - Lots-table thead + tbody updated to include `מחיר מכירה` + `מחיר עלות (gated)` columns (~50 new lines across thead + sample rows + JS render)
   - Movements-table thead + tbody updated same pattern (~30 new lines)

2. `modules/lens-inventory/lens-inventory-main.js` (or split-off file):
   - Init call: `QuickReceiptDrawer.init(document.getElementById('quickReceiptDrawer'), { onSubmit: handleReceiptSubmit, onCancel: handleDrawerCancel });`
   - `handleReceiptSubmit(items, metadata)` — calls existing PO/inventory RPCs to persist N items with shared metadata (`delivery_note_number`, `supplier_id`, `receipt_date`, `has_no_invoice`)
   - Permission-gate hookup for cost-price columns: `applyColumnPermissions(table, 'inventory.view_cost_price')` — uses SPEC 2's data-table API OR equivalent existing helper

3. `modules/lens-inventory/lens-inventory-lot-pane.js`:
   - Lots-table render function updated to emit cost column with `.col-permission-gated` + `data-permission` attribute

4. `modules/lens-inventory/lens-inventory-quick-scan.js`:
   - Scanner "in" mode submit handler updated to route items into drawer staging (per mockup JS) instead of direct stock write

### Possibly modified

- `css/lens-inventory-page.css` — IF needed for `.col-permission-gated` styling that isn't already in shared/css per SPEC 2. Prefer reusing shared.

### Files NOT modified (out of scope)

- Other lens screens (no spillover)
- Shared components (use their API; don't modify)
- DB schema (SPEC 3's territory)

### Docs updated

- Module 1 SESSION_CONTEXT — entry for SPEC 4a closure
- Module 1 CHANGELOG — entry under "Lens UI Rebuild Phase 0"
- MASTER_ROADMAP §3 — if SPEC 4a marks the foundation phase complete, update

---

## 10. Commit Plan

| # | Subject | Notes |
|---|---------|-------|
| 1 | `chore(spec): author M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION SPEC` | Author commit |
| 2 | `feat(lens-inventory): wire Quick Receipt drawer + entry-helper-strip + funnel scanner/manual-add/wizard (M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION)` | Drawer wiring + entry-helper + scanner/manual-add/wizard onclick changes |
| 3 | `feat(lens-inventory): price columns in lots-table + movements-table with cost-price permission gating` | Price column additions + permission wiring |
| 4 | `chore(spec): close M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION with retrospective` | EXECUTION_REPORT + FOREMAN_REVIEW + SC + CHANGELOG |

Total: 4 commits expected (possibly +1 if HTML/JS splits cleanly into 2 execution commits).

---

## 11. Dependencies / Preconditions

- **SPEC 1 closed** ✅ (commit `0949e97`)
- **SPEC 2 closed** — required (shared components must exist + be registered)
- **SPEC 3 closed** — required (DB schema + permission keys must exist)
- **Demo tenant DB has at least 1 active lens variant** for testing the drawer's persist flow
- **Tools:** Bash + Edit + Chrome MCP + Supabase MCP for Tier C verification

---

## 12. Lessons Already Incorporated

- **FROM** `M1_LENS_INVENTORY_MOCKUP_1TO1/FOREMAN_REVIEW.md` → "1:1 rebuild pattern — partial HTML mirrors mockup, JS substitutes data" → APPLIED in §9
- **FROM** Round 1 + Round 2 mockup updates (commits `ae1a5de` + `b2d1a4b`) → the mockup is the precise visual spec → APPLIED in §3 Tier C comparison criterion
- **FROM** Brief decision #9 (Quick Receipt = sole entry path) → APPLIED in §5 stop-trigger ("any direct-to-stock path remaining → STOP")
- **FROM** opticup-strategic SKILL.md Pattern P-AR-16 → mockup is the design source-of-truth → APPLIED in §3 Tier C VFV criterion

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2
- [ ] `git status --short` returns empty after closure commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT.md + FOREMAN_REVIEW.md written in the SPEC folder
- [ ] Tier C screenshots/ subdir populated (mockup vs live side-by-side for the 3 new features)
- [ ] Demo tenant smoke complete (drawer persists N items with shared metadata; permission gating verified)

---

## 14. Authoring Note — Execution Blocked Pending SPEC 2 + SPEC 3

(Foreman transparency note.)

This SPEC was authored by opticup-strategic on 2026-05-17 during the M1 lens mockup-fidelity rebuild Pipeline marathon. SPEC 4a's execution is **strictly blocked** by:

- SPEC 2 (shared components) — Quick Receipt drawer, data-table column-permission gating
- SPEC 3 (DB schema) — `has_no_invoice` column, `inventory.view_cost_price` permission key

Without those, SPEC 4a cannot wire to anything. Therefore SPEC 4a is authored as a "ready-to-execute-after-SPEC-2-and-3" SPEC. The discovery work (mockup → live diff scope, dependency mapping, success criteria) is captured here, making the executor's run much faster once dependencies land.

**Recommended execution path:**

1. Wait for SPEC 2 and SPEC 3 to close 🟢 (or 🟡)
2. Open a fresh opticup-executor session
3. Read this SPEC + verify §0 + §11 dependencies are satisfied (shared components exist with expected API; permission keys exist in live DB)
4. Execute per §10 commit plan
5. Tier C VFV side-by-side (mockup vs live)
6. Closure

---

*End of SPEC. Authored 2026-05-17 by opticup-strategic (Foreman) — execution blocked pending SPEC 2 + SPEC 3.*
