---
spec_id: M1_LENS_GOODS_RECEIPT_REBUILD
title: 1:1 mockup-fidelity rebuild of lens-goods-receipt full-screen with group-header bands
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/POST_GROUP_A_FIXES_AND_GROUP_B_BRIEF.md
mockup: modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html
phase: Group B — Goods Receipt (3 of 3)
---

# SPEC — M1_LENS_GOODS_RECEIPT_REBUILD

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-goods-receipt/` (8 .js + 1 .html, 735 lines total) | ✅ | Current implementation to be replaced |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` (635 lines) | ✅ | The spec (Pattern P-AR-16) — largest Group B mockup |
| `shared/js/group-header-row.js` | ✅ | Phase 0 shared component for group-header bands |
| `shared/js/chip-filter-row.js` + `shared/css/chip-filter.css` | ✅ | Phase 0 shared component |
| `shared/js/table-builder.js` + `table-builder-extensions.js` | ✅ | SPEC 2 EXTENDED supports `{_groupHeader: true, sourceType, label, count, icon}` synthetic rows — required for source-type bands |
| `shared/js/side-detail-panel.js` | ✅ | Phase 0 shared component (per-line edit) |
| `shared/js/quick-receipt-drawer.js` | ✅ | DISTINCT from this SPEC — Quick Receipt is the drawer reused by Inventory screen (SPEC 4a). Goods Receipt screen is a FULL-screen flow. Mockup confirms they are separate surfaces. |
| `modules/inventory/inventory-shell-lens.js` line 108-118 — GR manifest | ✅ | 8 JS deps + 1 partial currently registered |
| `modules/lens-purchase-order/` (SPEC 6 sibling) | ✅ | Runs BEFORE this SPEC per Path X sequential |

### Step 1.7 — Consumer grep on Goods Receipt assets

```
modules/lens-goods-receipt/*                — owns this rewrite
modules/inventory/inventory-shell-lens.js   — manifest entries (lines 108-118) — updated by this SPEC
```

Also relevant (NOT external consumers, but the RPC's other call sites):
```
modules/lens-purchase-order/   — NOT a consumer of m1_create_receipt_from_box (just naming alignment)
```

**Zero external cross-module callers.** Safe to rewrite in place.

### DB pre-flight (live 2026-05-18 IDT)

| Object | Exists | Notes |
|---|---|---|
| `purchase_receipt` (table, tenant-isolated, is_deleted soft-delete) | ✅ | Now includes `has_no_invoice BOOLEAN` (SPEC 3 + M1_FOUNDATION_CLOSE_CLEANUP 2026-05-17) |
| `purchase_receipt_line` (table) | ✅ | line items |
| `stock_lot` (table) | ✅ | created by `m1_create_receipt_from_box` per line |
| `m1_create_receipt_from_box` RPC — **9-arg signature** (current canonical) | ✅ | `(p_tenant_id, p_supplier_id, p_delivery_note_number, p_lines, p_box_id, p_box_supplier_barcode, p_supplier_number, p_confirmed_by, p_has_no_invoice)` — writes purchase_receipt.has_no_invoice atomically inside the same transaction. **8-arg signature DROPPED 2026-05-17.** This SPEC's Executor MUST call the 9-arg signature with `p_has_no_invoice` explicit. |
| `next_receipt_number(p_tenant_id)` | ✅ | atomic per Iron Rule 11 |
| `tenant_location` (table) | ✅ | required — `stock_lot.location_id NOT NULL` per current GR module's note |
| Inventory module never creates supplier debt (canonical rule) | ✅ | M1_INVENTORY_DEBT_DECOUPLING removed debt-creation from inventory-side RPC path 2026-05-17. SPEC 8 MUST preserve this: zero references to `supplier_debt` or `m1_create_supplier_debt_from_receipt` in the rebuild. |

### Status-column / source-type semantics

Mockup uses **source-type bands** (not status enum) as group headers:
- 🧍 עדשות ללקוחות (sale-order linked)
- 📦 רגיל / מלאי (stock/regular)
- 💰 חוב שייווצר (debt-creation preview — read-only summary card; actual debt creation is the supplier-debt module's concern per the rule above)

**The "חוב שייווצר" band is a PREVIEW summary card, NOT a write to supplier_debt.** Executor MUST NOT INSERT into `supplier_debt` from this rebuild. The debt-creation path is the supplier-debt module's responsibility (post-receipt-close, idempotent per `m1_create_supplier_debt_from_receipt` which lives outside inventory).

### Baselines

| Symbol | Value |
|---|---|
| `BASE_MOCKUP_LINES` | 635 |
| `BASE_JS_TOTAL_LINES` (existing 8 files) | 643 |
| `BASE_PARTIAL_LINES` | 92 |
| `BASE_INVENTORY_MANIFEST_GR_JS_COUNT` | 8 |
| `EXPECTED_TARGET_JS_LINES` | 900-1300 across 6-8 files (each ≤ 300 lines per Iron Rule 12) |
| `EXPECTED_TARGET_PARTIAL_LINES` | 120-180 |
| `EXPECTED_BAND_COUNT` | 3 (sale-order, stock, debt-preview) |

### Lessons applied from prior FOREMAN_REVIEWs

- **From `M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17` (this morning)** — 8-arg → 9-arg `m1_create_receipt_from_box` overload consolidation was already shipped. Applied: §0 names the 9-arg signature explicitly so Executor calls correctly.
- **From `M1_INVENTORY_DEBT_DECOUPLING`** — inventory never creates supplier_debt rows; the rule is codified in auto-memory. Applied: §3 S6 + S8 explicitly forbid debt INSERTs in this rebuild.
- **From `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION` (SPEC 4a)** — Quick Receipt drawer ≠ Goods Receipt screen. Applied: §0 documents the distinction; out-of-scope §7 reinforces it.
- **From `M1_LENS_DESIGNS_SELECTION_REBUILD` (Group A)** — RPC arity audit before sealing. Applied: §0 explicitly names 9-arg signature; Executor MUST call with all 9 args.
- **From `M1_LENS_PRICING_REBUILD` F-3 (ABSORBED)** — silent 0-row filter trap. Applied: §0 ground-truth tells the Executor the exact tables involved.

---

## 1. Goal

1:1 rebuild of `modules/lens-goods-receipt/` per the mockup at
`architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html`. Full-screen receipt workflow with 3 source-type bands (sale-order / stock / debt-preview) and per-line editing via side detail panel. RPC unchanged — call existing 9-arg `m1_create_receipt_from_box` signature. Zero `supplier_debt` writes from inventory module (debt-decoupling rule).

## 2. Background

Current `lens-goods-receipt/` is the pre-mockup imperative flow. The mockup defines a full-screen wizard-light flow with source-type bands distinguishing receipts that fulfil sale orders vs receipts that land into stock. The "חוב שייווצר" band is a PREVIEW summary (informational) — actual debt creation happens elsewhere via `m1_create_supplier_debt_from_receipt` (outside inventory).

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch state | `git status` post-push | clean |
| S2 | Commits | `git log {start}..HEAD --oneline | wc -l` | 3-5 |
| S3 | 3 source-type bands render via group-header synthetic rows | DOM contains 3 `[data-tb-group-header]` rows with sourceType in {'sale-order','stock','debt-preview'} | yes |
| S4 | Each band shows count + total | DOM has count badge + total ₪ per band | yes |
| S5 | `m1_create_receipt_from_box` called with 9 args (NOT 8) | grep `m1_create_receipt_from_box` in modules/lens-goods-receipt/ — call site must pass `p_has_no_invoice` named arg | yes |
| S6 | Zero `supplier_debt` INSERTs from this module | grep `modules/lens-goods-receipt/` for `supplier_debt\|m1_create_supplier_debt_from_receipt` (in INSERT/RPC context, not commentary) | 0 INSERT/RPC sites |
| S7 | No DDL applied | `git diff {start}..HEAD -- supabase/migrations/` | empty |
| S8 | Each JS file ≤ 300 lines | `wc -l modules/lens-goods-receipt/*.js \| awk '$1>300'` | empty |
| S9 | inventory-shell-lens.js manifest updated | grep `lens-goods-receipt` paths all resolve to existing files | all resolve |
| S10 | Tier C: open Goods Receipt tab on demo — 3 bands visible | Chrome MCP snapshot | yes |
| S11 | Tier C: create a smoke receipt with 1 line (1 demo stock_lot will be created) | RPC succeeds; `purchase_receipt` row inserted; `stock_lot` row inserted; row has `has_no_invoice` set | yes |
| S12 | Tier C: smoke receipt has correct tenant + supplier + receipt_number pattern | `SELECT receipt_number FROM purchase_receipt WHERE id={smoke_id}` matches expected pattern | yes |
| S13 | Tier C: stock_lot row links back to the receipt | `SELECT count(*) FROM stock_lot WHERE purchase_receipt_id={smoke_id}` | 1 (matches the 1-line smoke) |
| S14 | Tier C: cleanup soft-deletes receipt + stock_lot | `UPDATE purchase_receipt SET is_deleted=true...; UPDATE stock_lot SET is_deleted=true...` | both succeed |
| S15 | Tier C: zero `supplier_debt` rows inserted by this smoke | `SELECT count(*) FROM supplier_debt WHERE created_at > {smoke_start} AND tenant_id={demo_tid}` | 0 |
| S16 | Zero console errors | Chrome MCP `list_console_messages` filter type=error | 0 (pre-existing GoTrueClient warns OK) |
| S17 | Integrity gate | `npm run verify:integrity` | exit 0 |
| S18 | Iron Rule 32 | pre-commit | 0 violations (§4 declares None.) |
| S19 | EXECUTION_REPORT + FINDINGS in SPEC folder | `ls` | files exist |
| S20 | ≥ 3 screenshots (overview + bands populated + post-receipt success) | `ls screenshots/` | ≥ 3 .png |

## 4. Destructive Operations

**None.** Zero DDL. Old JS files are overwritten in place. File count may shrink from 8 to 6 if natural decomposition warrants (Executor declares in EXECUTION_REPORT). No table drops. No column drops. No RPC drops. No policy changes.

## 5. Autonomy Envelope

**Can do without asking:**
- Read mockup in full (635 lines) + current `modules/lens-goods-receipt/*.js`
- Read SPEC 4a (Quick Receipt drawer) deliverables as the canonical contract reference for `m1_create_receipt_from_box`
- Read SPEC 6 + SPEC 7 deliverables (just-shipped siblings) for Phase 0 component patterns
- Backup old files per Iron Rule 9 (> 5 files affected)
- Rewrite each JS file
- Update inventory-shell-lens.js manifest if file count changes
- 3-5 commits per §10
- Tier C smoke creates 1 demo receipt + 1 stock_lot; soft-deletes both for cleanup

**MUST stop and report:**
- §0 RPC arity probe shows `m1_create_receipt_from_box` is NOT 9-arg (would indicate the morning's consolidation didn't land cleanly)
- S6 grep finds a `supplier_debt` INSERT/RPC — STOP, violates the debt-decoupling rule
- File-size hook fires
- Iron Rule 32 hook fires
- S13 returns 0 stock_lot rows after smoke receipt close (stock_lot insertion failed)

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals + §5 above:
- If §0 RPC arity probe reveals 8-arg signature still callable → STOP (drop migration didn't land or rolled back)
- If `m1_create_receipt_from_box` raises an unexpected error on demo tenant → STOP, capture full error in escalation
- Group A or SPEC 6/7 regression from this rebuild → STOP

## 7. Out of Scope (explicit)

- Any DB schema change
- Any RPC modification (`m1_create_receipt_from_box`, `next_receipt_number`, etc.)
- Any change to the `m1_create_supplier_debt_from_receipt` RPC or supplier-debt module
- INSERTing into `supplier_debt` from inventory module (debt-decoupling rule)
- Quick Receipt drawer modifications (separate surface; out of scope per §0)
- Any change to `lens-purchase-order/` or `lens-pos-list/`
- Toggle-semantics work (deferred per Foreman recommendation)
- Lens-pricing screen changes
- PDF export of receipt (separate concern)

## 8. QA / Tier C Verification Plan

1. Start local servers
2. Chrome MCP navigate → `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=goods-receipt`
3. Verify 3 source-type bands visible (sale-order, stock, debt-preview) with count+total badges
4. Pick a demo supplier (any with offerings, e.g., SHALDAG)
5. Add 1 manual line: pick an offering, qty=1, the line falls into the "stock" band (no sale-order link)
6. Verify "חוב שייווצר" preview card updates (informational only — should NOT trigger any DB write yet)
7. Click "סגור קבלה" (close receipt) — triggers `m1_create_receipt_from_box` 9-arg
8. DB verify:
   - `SELECT id, receipt_number, has_no_invoice FROM purchase_receipt ORDER BY created_at DESC LIMIT 1` — fresh row
   - `SELECT count(*) FROM stock_lot WHERE purchase_receipt_id={smoke_id}` — 1
   - `SELECT count(*) FROM supplier_debt WHERE created_at > {smoke_start}` — debt module may or may not have inserted (out of this SPEC's scope); inventory module did NOT insert
9. Cleanup:
   - `UPDATE stock_lot SET is_deleted=true WHERE purchase_receipt_id={smoke_id}`
   - `UPDATE purchase_receipt SET is_deleted=true WHERE id={smoke_id}`
   - If supplier_debt created a row from this smoke (via its own trigger/path): note in EXECUTION_REPORT but DO NOT delete from this module
10. Console errors = 0
11. Screenshots: overview (3 bands), bands populated mid-flow, post-close Toast (3 minimum)

## 9. Expected Final State

### Repo
- `modules/lens-goods-receipt/` — 6-8 JS files + 1 partial.html, mockup-aligned
- `modules/inventory/inventory-shell-lens.js` — manifest reflects new file set (lines 108-118)
- `inventory.html` — any new CSS links added if needed
- `modules/Module 1 - Inventory Management/backups/M1_LENS_GOODS_RECEIPT_REBUILD_2026-05-18/` — full backup
- SPEC folder: SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT + FINDINGS + ≥ 3 screenshots

### Docs
- Module ROADMAP — SPEC 8 marked ✅
- Module CHANGELOG — entry under "Group B"
- Module SESSION_CONTEXT — updated post-close
- Module db-schema.sql — unchanged (no DDL)

### DB
- 0 schema changes
- 0 persistent rows added from this module (Tier C cleans up its own writes)
- supplier_debt rows from auxiliary path (if any) noted in FINDINGS but NOT touched

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_GOODS_RECEIPT_REBUILD SPEC` (Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `refactor(lens-goods-receipt): 1:1 mockup rebuild — 3 source-type bands + 9-arg RPC + debt-decoupled preview` | rewritten JS + partial + manifest + inventory.html + backup folder |
| 3 | (optional) `fix(lens-goods-receipt): {hotfix subject}` | hotfix only on Tier C deviation |
| 4 | `chore(spec): close M1_LENS_GOODS_RECEIPT_REBUILD with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + SESSION_CONTEXT + CHANGELOG + ROADMAP |

Expected total: 3-5 commits.

## 11. Pipeline Coordination

`files_owned_globs` for `pipeline-coordination.mjs claim`:
```
modules/lens-goods-receipt/**
modules/inventory/inventory-shell-lens.js
inventory.html
modules/Module 1 - Inventory Management/backups/M1_LENS_GOODS_RECEIPT_REBUILD_2026-05-18/**
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_GOODS_RECEIPT_REBUILD/**
```

Branch: `develop`. No worktree. Path X sequential (runs AFTER SPEC 7 closes 🟢).

## 12. Rollback Plan

If Tier C reveals a fundamental design issue:
- Restore old GR files from backup folder
- Revert manifest + inventory.html
- Two commits: `revert` + `chore(spec): reopen`
- Tier C smoke: soft-delete receipt + stock_lot

If RPC contract changed (very unlikely given pre-flight):
- Land working portion if any
- Open follow-up SPEC `M1_LENS_GOODS_RECEIPT_REBUILD_RPC_FOLLOWUP`

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean after closure
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] ≥ 3 Tier C screenshots
- [ ] Tier C smoke receipt + stock_lot soft-deleted
- [ ] Module ROADMAP + CHANGELOG + SESSION_CONTEXT updated
- [ ] S5 grep confirms 9-arg RPC call
- [ ] S6 grep confirms zero supplier_debt writes from this module
- [ ] S15 DB query confirms inventory created no supplier_debt rows

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Pre-seal Step 1.6 (paths clean — Quick-Receipt-drawer-vs-GR-screen distinction documented) + Step 1.7 (zero external consumers) + 9-arg RPC arity verified live (M1_FOUNDATION_CLOSE_CLEANUP shipped this morning) + debt-decoupling rule enforced in §3 S6 + S8._
