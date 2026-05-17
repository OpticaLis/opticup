# SPEC — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Claude Code, 2026-05-18 evening
> **Authored on:** 2026-05-18
> **Module:** 1 — Inventory Management
> **Phase (within Pipeline):** C — 3 add-stock flows on inventory screen + RPC extension
> **Parent Brief:** `architecture-brief/M1_LENS_INVENTORY_UNIFIED_FLOW_BRIEF.md` §5
> **Pipeline:** `M1_LENS_INVENTORY_UNIFIED_FLOW` (Phases A 🟢 + B 🟢; Phase C starts now; Phase D + E follow)

---

## 0. Pre-Authoring Reality Check

- Brief §5 read in full. 3 add-stock flows: (1) Quick Scan drawer, (2) Manual Add panel refactor, (3) Full Receive modal. RPC extension for `m1_create_receipt_from_box`.
- Current state of `modules/lens-inventory/lens-inventory-partial.html` (611 lines) probed:
  - Header `scan-in` button (line 37) currently opens a sample-data modal via `openScanModal('in')` in `lens-inventory-modal-shows.js` (line 127). The Brief's "currently redirects" description is stale (it was true before today's MOCKUP_1TO1 SPEC closed). Phase C **replaces the modal with a right-side drawer.**
  - Manual Add panel (line 201-236) has fields `manual-barcode`, `manual-sph`, `manual-cyl`, `manual-qty`, `manual-cost` + submit button `manual-add-submit` with title "(יבוצע בלשונית הבאה)". **No click handler exists** — pure cosmetic. Phase C wires the first real handler. Brief §5.2's "currently redirects" is wrong-direction; the truth is "currently no-op".
  - No "Full Receive" button exists on the header today — Phase C adds a NEW button `📦 קבלת סחורה מלאה` plus the modal wrapper.
- `m1_create_receipt_from_box` RPC probed (full body fetched via pg_get_functiondef): 100+ line plpgsql, SECURITY DEFINER, has the canonical JWT-claim check. Inserts into purchase_receipt — must add the new audit columns (`is_documented`, `undocumented_reason`, `manager_review_status`) to the INSERT VALUES.
- Existing `lens-goods-receipt-partial.html` = 92 lines, `lens-goods-receipt-main.js` = 124 lines. Full Receive modal will **fetch + inject** this partial (no iframe; same DOM injection pattern as `inventory-shell-lens.js` for the tab system).
- DOM-id collision risk: lens-goods-receipt-partial uses ids like `gr-supplier`, `gr-delivery-note`, etc. When embedded in modal alongside the inventory page, no id collisions expected. Verified via grep — Phase C's new ids (`drawer-*`, `frm-*` prefixes) are net-new.

### 0.B — Lessons applied from prior FOREMAN_REVIEWs

| Lesson | Source | How honored |
|---|---|---|
| P-AUTHOR-1 heading-format pre-check | Phase A | `## 4. Destructive Operations` (no suffix) used |
| P-AUTHOR-2 arithmetic in §3 parentheticals | Phase A | All counts hand-computed below |
| P-AUTHOR-1 cross-phase deferral row | Phase B | §3 row 12.X documents Phase D dependency for unified-log "Undocumented" filter visibility |
| P-EXEC-1 settings field add recipe (analogous: form-field add pattern) | Phase B | Manual Add panel refactor follows the pattern: add fields to HTML + 1 helper to populate the supplier dropdown + 1 click handler |
| Rule 21 extend-don't-duplicate | All prior | Manual Add panel handler does NOT duplicate Quick Scan drawer handler — both call the same `_submitAddStock()` helper |

### 0.C — Cross-Reference Check (Rule 21) + Brief-vs-DB reality

| New name | Hits | Resolution |
|---|---|---|
| `m1_create_receipt_from_box` (extended sig) | 1 (the existing RPC) | CREATE OR REPLACE with backward-compatible DEFAULT-true new params |
| `_submitAddStock` (JS helper) | 0 | Genuinely new — shared between Manual Add + Quick Scan drawer |
| Quick Scan drawer ids (`drawer-quick-scan`, `drawer-qs-*`) | 0 (grep) | Genuinely new |
| Full Receive modal id (`fullReceiveModal`) | 0 (grep) | Genuinely new |
| `openFullReceiveModal` (JS func) | 0 (grep) | Genuinely new |
| Manual Add new field ids (`manual-design`, `manual-variant`, `manual-supplier`, `manual-dn`, `manual-undocumented`) | 0 (grep) | Genuinely new |

**Brief drifts resolved:**
- **C-1:** Brief §5.1 "Replace current `📷 סריקה` button to open a **drawer**... instead of redirecting" — current is modal not redirect (post-MOCKUP_1TO1). Resolution: replace MODAL with DRAWER. Functional intent identical.
- **C-2:** Brief §5.2 says "Manual Add panel currently REDIRECTS to קבלת סחורה screen" — actually no handler exists at all. Resolution: wire the handler for the first time; no redirect to remove.
- **C-3:** Brief §5.3 Full Receive modal is NEW — no precursor; adds button + modal wrapper that fetches `lens-goods-receipt-partial.html` and injects it. The `tab=goods-receipt` deep-link route stays functional (explicit non-removal per user prompt).

Cross-Reference Check completed 2026-05-18 evening: **0 collisions, 6 hits resolved + 3 Brief drifts documented.**

### 0.D — Runtime semantics rehearsal (§5.3 mandate)

1. **RPC extension `m1_create_receipt_from_box`:**
   - New params: `p_is_documented BOOLEAN DEFAULT true`, `p_undocumented_reason TEXT DEFAULT NULL`. Default values preserve existing-caller behavior (existing callers pass no value → DEFAULT true → INSERT writes is_documented=true → behavior identical to pre-extension).
   - `INSERT INTO purchase_receipt` adds 3 columns: `is_documented`, `undocumented_reason`, `manager_review_status`. The last is derived: `CASE WHEN NOT p_is_documented THEN 'pending'::text ELSE NULL END` — when staff adds without doc, manager review starts in 'pending' state.
   - JWT-claim block unchanged (canonical 2026-05-15 pattern); no NULL-comparison loophole introduced.
   - Tested branch: (a) anon caller — `v_jwt_tenant` null → RAISE 42501 ✓; (b) wrong-tenant — RAISE 42501 ✓; (c) authenticated correct-tenant + is_documented=true → existing path ✓; (d) authenticated correct-tenant + is_documented=false → new path writes 'pending' to manager_review_status ✓.

2. **Quick Scan drawer flow:**
   - Barcode lookup: `sb.from('lens_variant').select(...).eq('id', barcode_resolved_id).eq('tenant_id', getTenantId())` — RLS-safe + Rule 22 defense-in-depth.
   - If not found → switch to manual-add fields (variant_id stays NULL, marks the line as is_manual_addition=true per RPC convention).
   - Submit calls `_submitAddStock({lines: [...], supplier_id, delivery_note_number, is_documented, undocumented_reason})` → wraps RPC call with `Toast.success` on completion + grid refresh.

3. **Manual Add panel flow:**
   - Same `_submitAddStock` helper. Difference: form fields are static-on-screen vs in a drawer.
   - Variant selection: cascading Design → Variant dropdowns OR free-text SPH/CYL inputs (the existing partial has the latter). Phase C keeps SPH/CYL inputs + uses the currently-selected grid cell's variant_id implicitly (or first match by SPH/CYL within the current Design+Variant filter context).
   - If undocumented checkbox checked → requires `hasPermission('inventory.add.undocumented')`; gate at submit time with toast error if not granted.

4. **Full Receive modal flow:**
   - On open: fetch `modules/lens-goods-receipt/lens-goods-receipt-partial.html` via existing partial-loader pattern in `inventory-shell-lens.js`, inject into modal body, then bootstrap any of the lens-goods-receipt-*.js handlers that aren't already loaded.
   - Same DB write path as the deep-link version (same RPC, same handlers). On submit success → close modal + dispatch grid refresh event.
   - Risk: lens-goods-receipt-main.js may auto-init on script load assuming an empty body partial. Mitigation: re-call the loader's init function explicitly after injection.

5. **Permission gating mental rehearsal:**
   - All 3 flows require `lens.gr.create` (existing — ceo + manager have it).
   - Flow 1 + 2 with undocumented checkbox additionally require `inventory.add.undocumented` (Phase A; ceo + manager only).
   - Flow 3 follows existing receipt screen's permission model (no change).

Runtime semantics rehearsed: yes — RPC extension preserves backward compat; new write paths gate-checked; no NULL traps.

### 0.E — Baselines (captured 2026-05-18 evening)

| Symbol | File | Metric | Value |
|---|---|---|---|
| `BASE_LINES_partial` | `modules/lens-inventory/lens-inventory-partial.html` | `wc -l` | 611 |
| `BASE_LINES_modal_shows` | `modules/lens-inventory/lens-inventory-modal-shows.js` | `wc -l` | 176 |
| `BASE_LINES_gr_partial` | `modules/lens-goods-receipt/lens-goods-receipt-partial.html` | `wc -l` | 92 |
| `BASE_LINES_inv_modals_css` | `css/lens-inventory-modals.css` | `wc -l` | (capture at C-C3) |
| `BASE_RECEIPTS_DEMO_pre_C` | live DB | `count(*) FROM purchase_receipt WHERE tenant_id = demo` | 10 (post-Phase-B) |
| `BASE_RECEIPTS_PRIZMA_pre_C` | live DB | `count(*) FROM purchase_receipt WHERE tenant_id = Prizma` | 0 |

Expected post-Phase-C values:
- partial.html ≈ 700-770 lines (existing 611 + drawer markup ~50 + Full Receive button + modal wrapper ~30 + manual-add field expansion ~25)
- modal-shows.js ≈ 250-320 lines (added drawer + manual-add submit + Full Receive open handler + `_submitAddStock` helper)
- RPC body: extended with 2 new params + 3 new columns in INSERT
- 3 new purchase_receipt rows on DEMO (one per Tier C flow); 0 new rows on Prizma (Tier C runs only on demo)

---

## 1. Goal

Ship the 3 add-stock flows from Brief §5 — Quick Scan drawer, Manual Add panel refactor, Full Receive modal — all driven by the same backend write path (`m1_create_receipt_from_box`, extended to record `is_documented` / `undocumented_reason` / `manager_review_status` per Phase A's audit columns). Consolidate the receive-goods UX into the inventory screen so staff no longer context-switches for the most common operation. The dedicated קבלת סחורה tab remains as the full-page deep-link fallback.

## 2. Background & Motivation

Phase A added the DB substrate; Phase B added per-tenant default supplier. Phase C is where the user-visible win lands: instead of leaving the inventory screen to receive goods, staff scans / adds / receives directly from where they're already working. The Manual Add panel that was a cosmetic stub becomes the everyday quick-entry surface; the Quick Scan drawer is the keyboard-driven barcode flow; the Full Receive modal is the multi-line shipment flow. All three converge on the same RPC + DB tables so the audit trail (purchase_receipt + stock_lot + stock_movement) is identical regardless of which surface the user used.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Branch state | `develop`, clean post-commits | `git status` → clean |
| 2 | Commits produced | 7 (Seed + RPC + Manual Add + Quick Scan + Full Receive + DocAppend + Close) | `git log <SAFETY_TAG>..HEAD --oneline | wc -l` → 7 |
| 3 | Safety tag exists | `pre-m1-inv-unified-flow-phase-c-2026-05-18` | `git tag -l ...` matches |
| 4 | `m1_create_receipt_from_box` RPC signature extended | 10 args (was 8) with `p_is_documented` + `p_undocumented_reason` as defaults | `pg_get_function_arguments(...::regproc)` contains both new param names |
| 5 | RPC backward compat | calling RPC with original 8 args still works (defaults applied) | live test (Tier C runs an existing-style call as smoke) |
| 6 | `lens-inventory-partial.html` size | 611 ≤ N ≤ 800 | `wc -l` |
| 7 | New ids present | `drawer-quick-scan`, `fullReceiveModal`, `manual-undocumented`, `manual-supplier`, `manual-dn`, `manual-design`, `manual-variant` each appear exactly once | `grep -c "id=\"<id>\"" partial.html` → 1 |
| 8 | `lens-inventory-modal-shows.js` size | 176 ≤ N ≤ 350 | `wc -l` |
| 9 | `_submitAddStock` helper defined and used by both Manual Add + Quick Scan | grep ≥ 3 occurrences (1 def + 2 calls) | `grep -c "_submitAddStock"` |
| 10 | Full Receive modal opens + closes + injects goods-receipt-partial content | DOM probe — after opening, modal body contains a `<section>` with `gr-` prefixed ids matching the partial | Tier C VFV via Chrome MCP |
| 11 | Existing `tab=goods-receipt` route still functional | direct URL `localhost:3000/inventory.html?t=demo&tab=goods-receipt` returns 200 + renders the goods-receipt partial in the body | Tier C |
| 12 | Tier C VFV — Flow 1 Quick Scan | end-to-end on demo: open drawer, scan/type a valid demo variant barcode, enter qty, submit → new purchase_receipt row + new stock_lot + grid cell reflects new qty; screenshot pair (before/after) saved | TEST_REPORT.md |
| 12.X | Brief §5.5 ref step 1 "scan a real variant barcode" | applies via Tier C flow 1 | TEST_REPORT |
| 13 | Tier C VFV — Flow 2 Manual Add | end-to-end on demo: fill panel fields incl. supplier (pre-filled to AZMON) + undocumented checkbox + submit → purchase_receipt row with `is_documented=false` + `manager_review_status='pending'`; screenshot pair | TEST_REPORT.md |
| 14 | Tier C VFV — Flow 3 Full Receive modal | end-to-end on demo: open modal, modal renders goods-receipt partial, add 1+ lines, submit → new purchase_receipt row(s) + modal closes + grid refreshes; screenshot pair | TEST_REPORT.md |
| 15 | Demo DB delta during Tier C | exactly 3 new purchase_receipt rows attributable to Tier C flows (one per flow); +N stock_lot rows; +N stock_movement rows | live DB count delta |
| 16 | Prizma row delta | exactly 0 rows on every table (purchase_receipt, stock_lot, stock_movement, tenants, permissions, role_permissions, suppliers, suppliers) | live DB count delta |
| 17 | Smoke 7/7 PASS | unchanged | `npm run smoke` |
| 18 | Iron Rule 31 integrity gate | exit 0 every commit | `npm run verify:integrity; echo $?` → 0 |
| 19 | Iron Rule 32 declared ops only | every destructive op in this SPEC is in §4 | manual diff vs §4 |
| 20 | M1 db-schema.sql updated | Phase 2C section appended documenting RPC extension | `grep "Phase 2.*C.*" "modules/Module 1/.../db-schema.sql"` |

---

## 4. Destructive Operations

Declared list:

1. `CREATE OR REPLACE FUNCTION public.m1_create_receipt_from_box` with 10 args (8 existing + `p_is_documented BOOLEAN DEFAULT true` + `p_undocumented_reason TEXT DEFAULT NULL`). Body modified: INSERT INTO purchase_receipt adds 3 columns (`is_documented`, `undocumented_reason`, `manager_review_status`); manager_review_status derived as CASE WHEN NOT p_is_documented THEN 'pending' ELSE NULL END.
1.5. `DROP FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid)` — companion to op #1. Postgres' `CREATE OR REPLACE FUNCTION` only replaces an EXISTING function with the EXACT same arg list; adding new arg slots creates an OVERLOAD. SPEC §4 op #1 intent was REPLACE (post-state = single 10-arg function), so the old 8-arg overload must be dropped. The new 10-arg function has DEFAULT-true on the 2 new params, preserving backward compat for any 8-arg caller (the same 8-arg call resolves to the 10-arg function with defaults filling in).
2. File edits (additive — no deletions): `modules/lens-inventory/lens-inventory-partial.html` (+drawer markup ~50 lines, +Full Receive button + modal wrapper ~30 lines, manual-add field expansion ~25 lines).
3. File edits (additive — extends existing JS): `modules/lens-inventory/lens-inventory-modal-shows.js` (+drawer open/close handlers, +`_submitAddStock` helper, +Manual Add submit handler, +Full Receive open handler, +variant lookup helper).
4. File edits (additive — small CSS additions): `css/lens-inventory-modals.css` (+ drawer slide-in animation + Full Receive modal sizing) OR new lines on existing rules.
5. File edits (append-only): `modules/Module 1 - Inventory Management/docs/db-schema.sql` (Phase 2C section).
6. Tier C VFV writes: 3 new purchase_receipt rows on DEMO + corresponding stock_lot + stock_movement + supplier_debt rows. **No writes to Prizma.**
7. `git tag pre-m1-inv-unified-flow-phase-c-2026-05-18` at parent commit.

**Explicitly forbidden in this SPEC:**
- ANY write to Prizma data tables (purchase_receipt, stock_lot, stock_movement, tenants, suppliers, etc.). All Tier C writes happen on DEMO only.
- Removing the `tab=goods-receipt` route or the existing `lens-goods-receipt-*.js` handler files.
- Modifying `record_adjustment_lost` / `record_adjustment_found` / other adjustment RPCs (out of scope).
- Modifying the existing scan-OUT modal (only scan-IN is replaced by drawer).
- Modifying the Reports modal or Wizard modal (separate scopes).
- DROP / ALTER COLUMN / DROP COLUMN / DROP POLICY / TRUNCATE / DELETE on any table.
- main branch touches / force-push / rebase.

If the Executor encounters a need for any forbidden op → escalation file + STOP.

---

## 5. Stop-on-Deviation Triggers (beyond global)

Stop and escalate if:
1. RPC `CREATE OR REPLACE` fails (e.g., dependent function/view error).
2. RPC backward-compat call (8 args) returns error post-extension.
3. `wc -l` on `lens-inventory-partial.html` outside [611, 800] post-edit.
4. `wc -l` on `lens-inventory-modal-shows.js` exceeds 350 (Rule 12 hard cap).
5. Tier C Flow 1/2/3 cannot complete because of UI bug not in scope (e.g., grid refresh breaks for other reason).
6. Demo DB count delta after Tier C ≠ 3 new purchase_receipt rows (or includes Prizma writes).
7. Smoke 7/7 breaks at any commit.
8. Pre-commit verify violations.

---

## 6. Rollback Plan

| What | How |
|---|---|
| Failed Phase C | `git reset --hard pre-m1-inv-unified-flow-phase-c-2026-05-18` |
| Revert RPC extension | `CREATE OR REPLACE` with the original 8-arg body (saved in EXECUTION_REPORT pre-image for traceability) |
| Revert Tier C demo writes | `DELETE FROM purchase_receipt WHERE id IN (<3 ids captured by Tier C>);` + cascade cleanup of stock_lot, stock_movement, supplier_debt (transactional) |
| Revert file edits | `git checkout <PRE_TAG> -- modules/lens-inventory/lens-inventory-partial.html modules/lens-inventory/lens-inventory-modal-shows.js css/lens-inventory-modals.css` |

---

## 7. Out of Scope

- Phase D unified-log undocumented filter (Brief §6).
- Phase E skill harvest (Brief §7).
- New permission keys (Phase A already added the 2 keys for undocumented + manager review).
- Extending `record_adjustment_lost` / `record_adjustment_found` (those are quantity adjustments not stock additions; their RPC stays as-is per Rule 1).
- New CSS files (additions to existing `css/lens-inventory-modals.css` only).
- Modifying the existing scan-OUT modal.
- Reports modal / Wizard modal (orthogonal scopes).
- Manual Add panel cascading dropdown for Design + Variant (Brief §5.2 mentions but to keep scope tight, this SPEC uses the CURRENT-VARIANT-CONTEXT from grid filter selection; explicit dropdowns deferred to a follow-up TECH_DEBT entry).
- Touching MODULE_MAP.md, MODULE_SPEC.md, ROADMAP.md (Pipeline-close Integration Ceremony).

---

## 8. Expected Final State

After Phase C:
- 7 new commits on develop above safety tag.
- Live DB: RPC has 10 args; 3 new purchase_receipt rows on demo (Tier C); 0 Prizma writes.
- Inventory screen has: working Quick Scan drawer (replaces sample-data modal), working Manual Add panel (was cosmetic, now writes to DB with supplier auto-fill + undocumented option), new Full Receive modal that embeds the goods-receipt partial.
- `tab=goods-receipt` deep-link still loads the full-page goods-receipt screen.
- Smoke 7/7 PASS; Tier C 3/3 flows PASS with screenshots.

---

## 9. Commit Plan

| # | Slug | Description |
|---|------|-------------|
| 1 | C-C0 | `chore(spec): seed M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C SPEC + safety tag` |
| 2 | C-C1 | `feat(m1-inv-phase-c): extend m1_create_receipt_from_box RPC to record undocumented additions` |
| 3 | C-C2 | `feat(m1-inv-phase-c): wire Manual Add panel — supplier auto-fill + delivery-note + undocumented checkbox` |
| 4 | C-C3 | `feat(m1-inv-phase-c): replace scan-in modal with Quick Scan drawer + variant lookup` |
| 5 | C-C4 | `feat(m1-inv-phase-c): add Full Receive modal embedding goods-receipt partial` |
| 6 | C-C5 | `docs(m1-inv-phase-c): db-schema.sql Phase 2C section + SPEC §13.A marker` |
| 7 | C-C6 | `chore(m1-inv-phase-c): close — EXECUTION_REPORT + FINDINGS` |

---

## 10. Lessons Already Incorporated

- §0.C Brief drifts (C-1 modal→drawer, C-2 no handler vs redirect, C-3 net-new modal) resolved at author time — prevents executor confusion.
- §3 split into per-flow Tier C criteria (12, 13, 14) so each flow has independent PASS/FAIL — prevents one flow's success masking another's failure.
- §3 row 16 Prizma delta = 0 across multiple tables, restated as in Phases A + B for discipline continuity.
- §7 out-of-scope row for cascading dropdowns explicitly documented (P-AUTHOR-1 cross-phase deferral pattern — though this defers to a future TECH_DEBT not a future phase).
- §0.D RPC extension rehearsed including 4 branch test cases — prevents NULL-comparison loophole.

---

## 11. References

- Brief: `architecture-brief/M1_LENS_INVENTORY_UNIFIED_FLOW_BRIEF.md` §5
- Phase A predecessor (DB substrate): `M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A/`
- Phase B predecessor (settings UI): `M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_B/`
- Existing RPC body: captured at SPEC author time via `pg_get_functiondef` — see C-C1 commit body for full pre-image
- Mockup reference: `architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` (Brief §9 P-AR-16)
- Mockup reference: `architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` (Brief §9 P-AR-16, basis for Full Receive modal content)

---

## 13. Execution Marker (for Iron Rule 32 pre-commit hook)

> SPEC.md will be staged in each commit (C-C1..C-C5) that contains destructive operations. The hook reads §4 above. Executor MUST add SPEC.md alongside the migration / code / doc files in each such commit, appending a `### 13.A` sub-marker per commit with the applied delta.

### 13.A — Migrations + edits applied (Executor, populated per-commit during C-C1..C-C5)

| # | Commit | Type | Affects |
|---|--------|------|---------|
| _(populated at execution time)_ | | | |

*End of SPEC. Foreman-sealed 2026-05-18 evening. Phase C is the largest in the Pipeline — multi-flow Tier C VFV expected.*
