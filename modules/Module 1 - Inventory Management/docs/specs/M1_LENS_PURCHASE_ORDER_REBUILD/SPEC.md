---
spec_id: M1_LENS_PURCHASE_ORDER_REBUILD
title: 1:1 mockup-fidelity rebuild of lens-purchase-order with 4-step wizard
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/POST_GROUP_A_FIXES_AND_GROUP_B_BRIEF.md
mockup: modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html
phase: Group B — Purchase Order (1 of 3)
---

# SPEC — M1_LENS_PURCHASE_ORDER_REBUILD

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-purchase-order/` (6 .js + 1 .html, 635 lines total) | ✅ | Current implementation to be replaced |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html` (387 lines) | ✅ | The spec (Pattern P-AR-16) |
| `shared/js/wizard-step-indicator.js` | ✅ | Phase 0 shared component (use this) |
| `shared/css/wizard-step-indicator.css` | ✅ | **Brief typo caught:** parent Brief §3 #4 says `shared/css/wizard.css`; actual file is `wizard-step-indicator.css`. Executor MUST use the verified filename, not the Brief's typo. |
| `shared/js/chip-filter-row.js` | ✅ | Phase 0 shared component |
| `shared/js/stat-card-row.js` | ✅ | Phase 0 shared component |
| `shared/js/side-detail-panel.js` | ✅ | Phase 0 shared component (for line drawer/edit panel) |
| `shared/js/table-builder.js` + `table-builder-extensions.js` | ✅ | SPEC 2 EXTENDED — supports {_groupHeader:true} synthetic rows + selection |
| `shared/css/chip-filter.css`, `stat-card.css`, `side-detail.css`, `tokens.css` | ✅ | All present |
| `modules/inventory/inventory-shell-lens.js` line 80-88 — PO manifest | ✅ | 6 JS deps + 1 partial currently registered |

### Step 1.7 — Consumer grep on Purchase Order assets

```
modules/lens-purchase-order/*               — owns this rewrite
modules/inventory/inventory-shell-lens.js   — manifest entries (lines 80-88) — updated by this SPEC
```
**Zero external cross-module callers.** No other module imports lens-purchase-order files. Safe to rewrite in place.

### DB pre-flight (live 2026-05-18 IDT)

| Object | Exists | Notes |
|---|---|---|
| `purchase_order` (table, tenant-isolated, is_deleted soft-delete) | ✅ | 17 columns; status, po_number, supplier_id, expected_delivery_at, sent_to_supplier_at, cancelled_at, cancelled_reason, notes |
| `purchase_order_line` (table) | ✅ | line items per PO |
| `next_purchase_order_number(p_tenant_id)` RPC | ✅ | PO-NNNNNN sequence; atomic per Iron Rule 11 |
| `place_purchase_order(p_tenant_id, p_supplier_id, p_lines, ...)` RPC | ✅ | atomic PO + line array insert |
| `mark_po_sent(p_tenant_id, p_po_id)` RPC | ✅ | draft → sent transition |
| `cancel_purchase_order(p_tenant_id, p_po_id, p_reason)` RPC | ✅ | draft/sent → cancelled with status-check gate |
| `supplier_offering` (view) — Iron Rule 13 contract for offering lookups | ✅ | already consumed by current implementation |

### Baselines

| Symbol | Value |
|---|---|
| `BASE_MOCKUP_LINES` | 387 |
| `BASE_JS_TOTAL_LINES` (existing 6 files) | 560 |
| `BASE_PARTIAL_LINES` | 75 |
| `BASE_INVENTORY_MANIFEST_PO_JS_COUNT` | 6 |
| `EXPECTED_TARGET_JS_LINES` | 800-1100 across 5-7 files (each ≤ 300 lines per Iron Rule 12) |
| `EXPECTED_TARGET_PARTIAL_LINES` | 110-160 (mockup HTML body lifted as mount points) |

### Lessons applied from prior FOREMAN_REVIEWs

- **From `M1_LENS_PRICING_REBUILD` F-3 (ABSORBED)** — never query a column without verifying it exists in `information_schema.columns` first. Applied: §0 confirms `purchase_order` column shape live.
- **From `M1_LENS_DESIGNS_SELECTION_REBUILD` F-1** — every new RPC consumer must verify the RPC arity matches what the SPEC plans to pass. Applied: §0 names the 4 RPCs this SPEC uses; Executor must call them via their existing signatures (no new arity).
- **From `M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17` (Step 1.6 + 1.7 harvest)** — pre-seal path-check caught a Brief-side typo for the wizard CSS filename. Applied: §0 documents the correct filename.
- **From `M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX` (just-closed today)** — keep DDL-touching SPECs minimal. Applied: this SPEC ships ZERO DDL. RPCs already exist; tables already exist.

---

## 1. Goal

1:1 rebuild of `modules/lens-purchase-order/` per the mockup at
`architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html`. Replace current 6-file imperative implementation with a mockup-aligned 4-step wizard UI consuming Phase 0 shared components (`wizard-step-indicator`, `chip-filter-row`, `side-detail-panel`, `table-builder`). Keep RPC contracts unchanged (`place_purchase_order`, `mark_po_sent`, `next_purchase_order_number`, `cancel_purchase_order`).

## 2. Background

Current `lens-purchase-order/` is the pre-mockup imperative form. The mockup defines a 4-step wizard (Supplier → Shortages → Manual Lines → Review/Send) that the rebuild must implement faithfully. RPCs and tables are unchanged — this SPEC is UI-layer + orchestrator refactor only.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch state | `git status` post-push | clean |
| S2 | Commits | `git log {start}..HEAD --oneline | wc -l` | 3-5 |
| S3 | All 4 wizard steps render in correct order | DOM contains `.wizard-step-indicator` with 4 steps; data-step="supplier","shortages","manual","review" | yes |
| S4 | Each step mounts shared component(s) | DOM contains `.wizard-step-indicator`, `.chip-filter-row`, `.side-detail-panel` (line edit), `[data-tb-table]` (line table) | all present |
| S5 | RPC contracts unchanged | grep modules/lens-purchase-order — only 4 RPC names appear: place_purchase_order, mark_po_sent, cancel_purchase_order, next_purchase_order_number | 4 / 0 others |
| S6 | No DDL applied | `git diff {start}..HEAD -- supabase/migrations/` | empty |
| S7 | Each JS file ≤ 300 lines (Iron Rule 12 target) | `wc -l modules/lens-purchase-order/*.js \| awk '$1>300'` | empty |
| S8 | inventory-shell-lens.js manifest updated | grep `lens-purchase-order` paths still resolve to existing files | all paths resolve |
| S9 | Tier C: open Purchase Order tab on demo → wizard step 1 visible | Chrome MCP `take_snapshot` finds wizard-step-indicator | yes |
| S10 | Tier C: pick demo supplier → step 2 (shortages) loads | Chrome MCP navigate, click "המשך", verify step 2 visible | yes |
| S11 | Tier C: create a smoke PO end-to-end | step 4 click "צור הזמנה" → `place_purchase_order` returns success → row appears in `purchase_order` table | 1 row inserted (status='draft') |
| S12 | Tier C: smoke PO has correct tenant_id + supplier_id + po_number | DB query `SELECT po_number, status FROM purchase_order WHERE id={smoke_id}` | matches and po_number matches `PO-NNNNNN` pattern |
| S13 | Tier C: cancel the smoke PO via cancel button | UI cancel flow → `cancel_purchase_order` RPC → row status='cancelled' | yes |
| S14 | Tier C: Iron Rule 3 — cleanup via soft-delete | `UPDATE purchase_order SET is_deleted=true WHERE id={smoke_id}` | succeeded |
| S15 | Zero console errors during Tier C | Chrome MCP `list_console_messages` filtered to type=error | 0 (pre-existing GoTrueClient warns OK) |
| S16 | Integrity gate | `npm run verify:integrity` | exit 0 |
| S17 | Iron Rule 32 (destructive ops) | pre-commit | 0 violations (§4 declares None.) |
| S18 | EXECUTION_REPORT + FINDINGS in SPEC folder | `ls` | files exist |
| S19 | 4+ screenshots (one per wizard step + 1 review/sent) | `ls screenshots/` | ≥ 4 .png |
| S20 | Module ROADMAP + CHANGELOG updated | grep | entries appended |

## 4. Destructive Operations

**None.** This SPEC ships zero DDL, zero file-deletes (rewrites in place), zero git history mutations. Old JS files are overwritten by new ones with the same names; if any file from the old set becomes unnecessary it is removed via a single `git rm` call **declared in this section** before commit. Foreman declares the following file removals as pre-authorized **only if** the new design genuinely supersedes them (Executor's call — never invent file removals):

- `modules/lens-purchase-order/lens-purchase-order-pdf.js` (27 lines) — if mockup-driven rebuild does not preserve PDF export, this file may be removed. Otherwise: kept and updated.

All other files are rewritten in place. No table drops. No column drops. No RPC drops. No policy changes.

## 5. Autonomy Envelope

**Can do without asking:**
- Read all 387 lines of the mockup
- Read all current `modules/lens-purchase-order/*.js` files
- Read `modules/lens-pricing/*.js` (just-shipped Group A reference)
- Backup current PO files per Iron Rule 9 backup protocol before rewrites > 100 lines OR > 5 files
- Rewrite each JS file with the new design
- Update `modules/inventory/inventory-shell-lens.js` lines 80-88 manifest if file set changes
- Update `inventory.html` if a new CSS link or JS script tag is needed
- 3-5 commits per §10
- Tier C smoke creates 1 demo PO; cancel + soft-delete cleanup
- Take screenshots into `screenshots/`

**MUST stop and report:**
- Any RPC fails on demo tenant with a non-401 error (401 means permission gating; investigate locally)
- File-size hook (Iron Rule 12) fires
- Iron Rule 32 hook fires (only acceptable if §4 amended after declaring it; otherwise STOP)
- Tier C creates a PO row but `place_purchase_order` returns success without writing a row (integrity surprise)
- Step 4 (Review) discovers a missing data dependency not anticipated in §0
- Any change required to `place_purchase_order` / `mark_po_sent` / `cancel_purchase_order` signatures — escalate, this SPEC has no DDL scope

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals + §5 above:
- Any wizard step rendering ≥ 5 console errors → STOP (likely shared-component contract drift)
- If `place_purchase_order` returns the inserted po_number but the row doesn't match `PO-NNNNNN` regex → STOP (next_purchase_order_number contract drift)
- If existing Group A screens (Inventory, Designs, Pricing) regress after this rebuild → STOP (manifest/CSS load-order issue)

## 7. Out of Scope (explicit)

- Any DB schema change (no migrations, no DDL, no policy changes)
- Any RPC modification (signatures, bodies, GRANTs)
- Adding new functions to `shared/js/` (this SPEC consumes existing shared components only)
- PDF export rewrite (kept or removed; no enhancement)
- Reordering wizard steps (mockup is the spec)
- Multi-supplier PO (mockup is single-supplier-per-PO)
- Any change to `lens-pos-list/` or `lens-goods-receipt/` (those are SPEC 7 + 8)
- Toggle-semantics work (deferred per Foreman recommendation)

## 8. QA / Tier C Verification Plan

1. Start local servers if not running (`scripts/start-local.ps1`)
2. Chrome MCP navigate → `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=purchase-order`
3. Verify wizard-step-indicator visible with all 4 steps; step 1 active.
4. Click supplier (any demo supplier, e.g., SHALDAG); advance to step 2.
5. Verify shortages chip filter row visible; demo data populates.
6. Add 1 line via "+ הוסף שורה ידנית" (step 3 manual), pick offering + qty=1.
7. Step 4 review — verify totals + summary card.
8. Click "צור הזמנה" — wait for Toast success; capture po_id from DOM (or DB query by created_at).
9. DB verify: `SELECT id, po_number, status, supplier_id, tenant_id FROM purchase_order WHERE id={smoke_id}` — status='draft', po_number matches `^PO-\d{6}$`.
10. UI: click "שלח לספק" (sends; mark_po_sent) — verify status flips to 'sent' in DB.
11. UI: cancel the smoke PO with a reason string — `cancel_purchase_order` RPC; verify DB status='cancelled' with cancelled_reason populated.
12. Cleanup: `UPDATE purchase_order SET is_deleted=true, deleted_at=now() WHERE id={smoke_id} AND tenant_id={demo_tid}`.
13. Console error count = 0 (ignoring GoTrueClient warns).
14. Screenshots: step 1, step 2, step 3, step 4, post-send Toast (5 minimum).

## 9. Expected Final State

### Repo
- `modules/lens-purchase-order/` — 5-7 JS files + 1 partial.html, mockup-aligned
- `modules/inventory/inventory-shell-lens.js` — manifest reflects the new file set
- `inventory.html` — any new CSS links added; no removals
- `modules/Module 1 - Inventory Management/backups/M1_LENS_PURCHASE_ORDER_REBUILD_2026-05-18/` — full backup of the old set + CLAUDE.md / module docs
- SPEC folder: SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT + FINDINGS + ≥ 4 screenshots

### Docs
- Module ROADMAP — SPEC 6 marked ✅
- Module CHANGELOG — entry under "Group B"
- Module SESSION_CONTEXT — updated post-close
- Module db-schema.sql — unchanged (no DDL)
- `docs/GLOBAL_MAP.md` — unchanged (no new functions registered; RPCs already there)

### DB
- 0 schema changes
- 0 persistent rows added (Tier C smoke PO created + cancelled + soft-deleted)

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_PURCHASE_ORDER_REBUILD SPEC` (Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `refactor(lens-purchase-order): 1:1 mockup rebuild — 4-step wizard with shared components` | all rewritten JS + partial + manifest + inventory.html if needed + backup folder |
| 3 | (optional) `fix(lens-purchase-order): {hotfix subject}` | mid-Tier-C hotfix only if a defect surfaces during smoke |
| 4 | `chore(spec): close M1_LENS_PURCHASE_ORDER_REBUILD with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + SESSION_CONTEXT + CHANGELOG + ROADMAP |

Expected total: 3-5 commits.

## 11. Pipeline Coordination

`files_owned_globs` for `pipeline-coordination.mjs claim`:
```
modules/lens-purchase-order/**
modules/inventory/inventory-shell-lens.js
inventory.html
modules/Module 1 - Inventory Management/backups/M1_LENS_PURCHASE_ORDER_REBUILD_2026-05-18/**
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PURCHASE_ORDER_REBUILD/**
```

Branch: `develop`. No worktree. Path X sequential.

## 12. Rollback Plan

If Tier C reveals a fundamental design issue not surfaced by §0:
- Restore old PO files from backup folder
- Revert manifest + inventory.html
- Two commits: `revert: revert M1_LENS_PURCHASE_ORDER_REBUILD` + `chore(spec): reopen M1_LENS_PURCHASE_ORDER_REBUILD`
- Tier C smoke row (if landed): soft-delete it
- DDL: N/A — none applied to roll back

If a single wizard step fails but the rest works:
- Land the working steps in commit 2
- Open a follow-up SPEC `M1_LENS_PURCHASE_ORDER_REBUILD_FOLLOWUP_{step}` rather than ship a partial close

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean after closure
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] ≥ 4 Tier C screenshots in `screenshots/`
- [ ] Tier C smoke PO cancelled + soft-deleted (Iron Rule 3)
- [ ] Module ROADMAP + CHANGELOG + SESSION_CONTEXT updated

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Pre-seal Step 1.6 caught 1 Brief-side phantom path (wizard.css → wizard-step-indicator.css); documented in §0. Step 1.7: zero external consumers — safe to rewrite in place._
