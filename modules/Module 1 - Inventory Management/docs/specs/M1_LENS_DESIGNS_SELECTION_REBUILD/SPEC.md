---
spec_id: M1_LENS_DESIGNS_SELECTION_REBUILD
title: Lens Active-Designs screen — 1:1 mockup rebuild
author: opticup-strategic (Foreman)
authored: 2026-05-17 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/GROUP_A_SCREENS_4_5_BRIEF.md
phase: Lens UI Rebuild — Group A, SPEC 4 of 6
---

# SPEC — M1_LENS_DESIGNS_SELECTION_REBUILD

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — ALL PATHS VERIFIED 2026-05-17 IDT)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-active-designs/lens-active-designs-main.js` | ✅ | 58 lines |
| `modules/lens-active-designs/lens-active-designs-partial.html` | ✅ | 22 lines (skeleton) |
| `modules/lens-active-designs/lens-active-designs-toggle.js` | ✅ | 37 lines |
| `modules/lens-active-designs/lens-active-designs-tree.js` | ✅ | 152 lines |
| `modules/inventory/inventory-shell-lens.js` | ✅ | tab perm `lens.designs.manage` (line 45) |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html` | ✅ | 699 lines (target) |
| `shared/js/chip-filter-row.js` | ✅ | SPEC 2 |
| `shared/js/stat-card-row.js` | ✅ | SPEC 2 |
| `shared/js/group-header-row.js` | ✅ | SPEC 2 |
| `shared/js/side-detail-panel.js` | ✅ | SPEC 2 |
| `shared/js/table-builder.js` | ✅ | SPEC 2 EXTENDED — has `data-table` extension at line 59 |
| `shared/js/table-builder-extensions.js` | ✅ | SPEC 2 EXTEND verdict per Rule 21 |
| `shared/css/{chip-filter,stat-card,side-detail,table}.css` | ✅ | SPEC 2 |
| `shared/css/tokens.css` | ✅ | SPEC 2 |
| ~~`shared/js/data-table.js`~~ | ❌ | **BRIEF DEFECT** — Brief cites this file but SPEC 2 EXTENDED `table-builder.js` rather than creating a new file (Rule 21 investigation outcome). Foreman fixed in this SPEC: consumer uses `TableBuilder.create()` with column-permission + group-header extensions. Logged in §13 as Brief-side lesson. |

### Consumer-grep pre-flight (Step 1.7 — N/A for SPEC 4)

SPEC 4 §5 makes no "only N consumers" assertions. No grep mandate.

### DB pre-flight

Tables consumed (READ-only — no DDL in this SPEC):
- `lens_brand` — global catalog (owner_tenant_id NULL = platform)
- `lens_design` — global catalog
- `lens_variant` — global catalog (for stat-card "variants per design" count + side panel)
- `tenant_active_offerings` — per-tenant activation state for `(offering_id, location_id)`
- `tenant_lens_stock` — per-tenant stock projection (for stat cards: total active designs with stock)

Permissions verified live (2026-05-17 IDT):
- `lens.designs.manage` exists per-tenant (×2 tenants, prizma + demo) ✅
- ~~`lens.designs.view`~~ — does NOT exist. Brief §"Permission gate" assumed it. **Foreman decision:** screen access gated by `lens.designs.manage` (matches existing `inventory-shell-lens.js:45` pattern). No view-only fallback needed; users without `lens.designs.manage` don't see the tab. Logged in §13.

### Baselines

| Symbol | Source | Value (captured 2026-05-17 IDT) |
|---|---|---|
| `BASE_PARTIAL_LINES` | `lens-active-designs-partial.html` | 22 |
| `BASE_MAIN_LINES` | `lens-active-designs-main.js` | 58 |
| `BASE_TOGGLE_LINES` | `lens-active-designs-toggle.js` | 37 |
| `BASE_TREE_LINES` | `lens-active-designs-tree.js` | 152 |
| `BASE_MOCKUP_LINES` | mockup | 699 |
| `BASE_TENANT_ACTIVE_OFFERINGS_ROWS_DEMO` | live DB | (executor measures at pre-flight) |

### Lessons applied from prior 3 FOREMAN_REVIEWs in this module

- **From `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FOREMAN_REVIEW.md`** (F-1) — FIELD_MAP lives in `js/shared-field-map.js`, NOT `js/shared.js`. If this SPEC adds new DB fields → update the correct file. (SPEC 4 doesn't add DB fields → N/A.)
- **From `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FOREMAN_REVIEW.md`** (F-3) — Rule-15 hook scans MAP docs identically to migration files. If `module/docs/db-schema.sql` mentions `CREATE TABLE foo (...)` it must include literal `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` keywords in the same file. (SPEC 4 doesn't change DB → N/A.)
- **From `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FOREMAN_REVIEW.md`** (partial line-count estimate) — when consuming shared components, partial growth is much less than mockup-line-count would suggest (component supplies its own DOM at init time). Applied to §3 #3 estimate.
- **From `M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17/FOREMAN_REVIEW.md`** (A-1 + A-2) — path-typo + consumer-grep both promoted to opticup-strategic SKILL Step 1.6 + 1.7. Both ran for this SPEC. Brief defect on `data-table.js` caught (see §0 path table).

---

## 1. Goal

Rebuild the `modules/lens-active-designs/` screen to 1:1 mockup fidelity per Pattern P-AR-16 ("mockup IS the spec"). Replace the current 22-line skeleton partial + 3 thin JS files with mockup-aligned structure: header chips, 4 stat cards, brand-grouped table with toggle switches, side detail panel. All UI built by consuming the 5 shared components from SPEC 2 (Iron Rule 21 — no DOM reinvention).

---

## 2. Background

Foundation Phase complete. Mockup audit gave current implementation ~3% fidelity match (mostly the perm-gate + bootstrap shell). The rebuild applies the 1:1 pattern from `M1_LENS_INVENTORY_MOCKUP_1TO1` (commit `eddc8a1`+`05e28bb`+`447f3f6`+`582448d`) to the second of 6 lens screens. Group A also includes SPEC 5 (Pricing rebuild); dispatch order depends on Path X vs Y decision (parent Brief §"Pipeline Coordination").

---

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch state | `git status` | clean post-push |
| S2 | Commits produced | `git log {start}..HEAD --oneline | wc -l` | 4–6 (author + 2–4 execution + close) |
| S3 | `lens-active-designs-partial.html` line count | `wc -l` | 180–280 (mockup-fidelity rebuild; large delta from BASE_PARTIAL_LINES=22) |
| S4 | 4 stat cards rendered | live page DOM: `document.querySelectorAll('.lens-tab-section[data-tab="active-designs"] .stat-card').length` | 4 |
| S5 | Stat-card values bound to live data | reload page, stat values match DB counts (executor verifies via Supabase MCP) | match |
| S6 | Brand-grouped table renders with sticky sub-headers | DOM check: each brand has `<tr class="tb-group-header-*">` row above its designs | grouped |
| S7 | Toggle switch per design row | DOM check: `.toggle-switch` or equivalent input per design row; existing `lens-active-designs-toggle.js` `toggleActive()` logic invoked on click | wired |
| S8 | Side detail panel opens on row click | Chrome MCP click → `.side-detail-panel.active` exists with variant breakdown | open |
| S9 | Activate-all / Deactivate-all bulk actions in side panel | DOM check + Chrome MCP click → multiple rows flip in one transaction | wired |
| S10 | Permission gate via `lens.designs.manage` (screen access) | user without key sees access-gate; user with key sees screen | gated |
| S11 | All 5 shared components consumed (Iron Rule 21) | grep on partial + main.js for `ChipFilterRow.init`, `StatCardRow.init`, `TableBuilder.create`, `SideDetailPanel.init`, `GroupHeaderRow.*` (or wired through table-builder-extensions) | 5/5 |
| S12 | Iron Rule 12 — no file >350 lines | `wc -l` on every modified JS file in `modules/lens-active-designs/` | ≤350 each |
| S13 | Iron Rule 31 (integrity gate) | `npm run verify:integrity` | exit 0 or 2 |
| S14 | Pre-commit hooks per commit | committed output | 0 violations, warnings only |
| S15 | RTL + gold-palette per mockup | Chrome MCP screenshot: header gold accent, navy table header, RTL flow | per mockup |
| S16 | No console errors on page load | Chrome MCP `list_console_messages` filtered to error+warn | 0 errors |
| S17 | No regression on lens-inventory screen | Chrome MCP navigate to inventory tab → drawer + price columns still work | scope-clean |
| S18 | Tier C VFV side-by-side mockup vs live screenshots in SPEC folder `screenshots/` | files exist | ≥3 screenshots |
| S19 | `inventory.html` script-load + CSS-load updated if SPEC 2 components weren't already loaded | grep on `inventory.html` for the 5 consumed component scripts | all loaded |
| S20 | Defense-in-depth tenant_id filter on every `sb.from()` read in modified JS | code review | per Iron Rule 22 |
| S21 | EXECUTION_REPORT + FINDINGS written in SPEC folder | `ls` | files exist |

---

## 4. Destructive Operations

`None.`

This SPEC performs only additive + restructuring edits:
- Rewrite `lens-active-designs-partial.html` (skeleton → mockup structure) — content replacement, file remains
- Rewrite `lens-active-designs-main.js` (loader → full bootstrap with shared-component init) — content replacement, file remains
- Optionally split `lens-active-designs-tree.js` if it grows past 350 lines (file split is structural, not destructive — both halves committed in same commit)
- Add new files if needed (`-stat-cards.js`, `-detail-panel.js`) — additive
- Preserve `lens-active-designs-toggle.js` (37 lines — toggle state logic reused)

**Forbidden:**
- Any DB DDL (out of scope — SPEC 3 owns lens schema)
- Any change to `lens_brand` / `lens_design` / `lens_variant` schemas or seed data
- Any change to other lens screens (inventory, pricing, PO, GR, catalog-admin)
- Any change to `shared/js/*` shared components (Iron Rule 21 — consume only)
- Any Prizma data write (demo tenant only for Tier C VFV)
- Any `git push --force`, `git reset --hard`, `git rebase` on shared branches
- Any change outside `modules/lens-active-designs/`, `inventory.html` (if shared-component script-loads need updating), `modules/Module 1 - Inventory Management/docs/`

---

## 5. Autonomy Envelope

**Can do without asking:**
- Read all referenced files + mockup + Brief
- Read tables `lens_brand`, `lens_design`, `lens_variant`, `tenant_active_offerings`, `tenant_lens_stock` (Level 1 SQL)
- Edit `modules/lens-active-designs/*` files
- Edit `inventory.html` script-load + CSS-load if any of the 5 shared components aren't yet loaded
- Run `node scripts/verify.mjs --staged` between commits
- 4-6 commits per §10
- Tier C VFV via Chrome MCP on `localhost:3000/inventory.html?t=demo&cat=lenses&tab=active-designs`

**MUST stop and report:**
- Any shared-component API doesn't fit the consumer need → propose API change in FINDINGS, do NOT modify the component
- Tier C VFV reveals lens-inventory regression (broken drawer or missing price columns) → STOP, do NOT close SPEC
- `lens-active-designs-tree.js` or any rewritten file grows past 350 lines without a clear logical split available → STOP, propose split structure to Foreman
- Any DB DDL would be needed → STOP (out of scope)
- Iron Rule 32 hook fires on any commit (this SPEC declares §4 destructive ops as `None.` — any destructive pattern is a SPEC defect)

---

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- Mockup deviates from live in any of the 4 stat-card values (data binding bug) → STOP, debug data path before continuing
- Toggle switch click doesn't persist to `tenant_active_offerings` row → STOP, verify `lens-active-designs-toggle.js` still works after partial rewrite
- Side detail panel renders but variant breakdown is empty → STOP, verify variant query joins through `lens_design.id`
- `TableBuilder.create()` with column-permission + group-header extensions can't reproduce the mockup table → STOP, propose API change to SPEC 2's components in FINDINGS (do NOT inline a workaround)

---

## 7. Out of Scope (explicit)

- Any change to `modules/lens-inventory/` (SPEC 4a's territory — closed)
- Any change to `modules/lens-pricing/` (SPEC 5's territory — parallel/sequential per Daniel's Path decision)
- Any change to `modules/lens-purchase-order/`, `modules/lens-pos-list/`, `modules/lens-goods-receipt/`, `modules/lens-catalog-admin/`, `modules/lens-private-catalog/` (Groups B+C + SPEC 10)
- DB schema changes (SPEC 3 closed; no further DDL until Pricing rebuild's resolver — that's SPEC 5)
- Sell-price column wiring in inventory lots-table (F-5 — owned by SPEC 5)
- Any change to `shared/js/*` or `shared/css/*` (consume only, never modify — Iron Rule 21)
- Permissions seeding (lens.designs.manage already seeded per pre-flight; no new keys)

---

## 8. QA / Verification Plan

1. After Commit 1 (partial + main bootstrap rewrite): page loads without console errors; access-gate behavior preserved.
2. After Commit 2 (stat cards + chip filters): 4 cards render with live values; filter chips visually present (functional wiring optional for this commit).
3. After Commit 3 (table + toggle + group headers): brand grouping renders; toggle click flips `tenant_active_offerings.is_active`; existing `lens-active-designs-toggle.js` logic reused.
4. After Commit 4 (side detail panel + bulk actions): row click opens panel; activate-all / deactivate-all hits N rows in one transaction.
5. Tier C VFV mandatory:
   - Chrome MCP navigate to `localhost:3000/inventory.html?t=demo&cat=lenses&tab=active-designs`
   - Side-by-side screenshot vs mockup; verify all 4 mockup regions (header chips, stat-card row, brand-grouped table, side panel)
   - Click a row → side panel opens with correct variant breakdown
   - Click activate-all → multiple `tenant_active_offerings` rows update (verify via Supabase MCP) → undo with deactivate-all
   - Verify lens-inventory regression check: navigate to inventory tab → drawer opens, מחיר מכירה column present
   - 0 console errors throughout
   - ≥3 screenshots in `screenshots/` subdir
6. Soft-delete any test-data rows the smoke created (Iron Rule 3).

---

## 9. Expected Final State

### Modified files

- `modules/lens-active-designs/lens-active-designs-partial.html` (22 → ~250 lines) — full mockup-aligned structure with mount points for shared components
- `modules/lens-active-designs/lens-active-designs-main.js` (58 → ~200–280 lines) — bootstrap that wires all 5 shared components, loads data, exposes window.LensAD.*
- `modules/lens-active-designs/lens-active-designs-tree.js` (152 → ≤350 lines OR split into `-tree-render.js` + `-tree-state.js` if it grows past target)
- `modules/lens-active-designs/lens-active-designs-toggle.js` (37 lines — likely unchanged; toggle logic still owns `is_active` flip via `tenant_active_offerings`)
- `inventory.html` (only if shared-component script/CSS loads are missing — likely SPEC 2 didn't pre-load all of them since lens-inventory only needed 2)

### Possibly new files (Foreman pre-decided splits if growth pressure)

- `modules/lens-active-designs/lens-active-designs-stat-cards.js` — stat-card data binding (~80–120 lines if needed)
- `modules/lens-active-designs/lens-active-designs-detail-panel.js` — side panel renderer + bulk-action handlers (~80–120 lines if needed)

### NOT modified

- Any other lens screen module
- Any shared component (Iron Rule 21)
- Any DB schema or seed data
- CLAUDE.md, GLOBAL_MAP.md, GLOBAL_SCHEMA.sql (no new globals)

### Docs updated (same commit cluster, NOT separate commits)

- Module 1 SESSION_CONTEXT — entry for SPEC 4 closure
- Module 1 CHANGELOG — entry under "Lens UI Rebuild Phase 0 — Group A"
- MODULE_MAP — verify completeness (likely no change unless new files split)

---

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_DESIGNS_SELECTION_REBUILD SPEC` (this commit, by Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `refactor(lens-active-designs): partial + main bootstrap to mockup structure` | partial.html + main.js + (if needed) inventory.html shared-component loads |
| 3 | `feat(lens-active-designs): 4 stat cards + chip-filter row wired to live data` | main.js + stat-cards.js (if extracted) |
| 4 | `feat(lens-active-designs): brand-grouped table + toggle switches via TableBuilder extensions` | partial.html + main.js + tree.js (may split here if growth pressure) + toggle.js (preserve) |
| 5 | `feat(lens-active-designs): side detail panel + activate-all/deactivate-all bulk actions` | partial.html + main.js + detail-panel.js (if extracted) |
| 6 | `chore(spec): close M1_LENS_DESIGNS_SELECTION_REBUILD with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + SESSION_CONTEXT + CHANGELOG |

Total: 4–6 commits expected.

---

## 11. Pipeline Coordination

This SPEC's `files_owned_globs` for `pipeline-coordination.mjs claim`:

```
modules/lens-active-designs/**
inventory.html
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_SELECTION_REBUILD/**
```

Branch: `develop` (per Daniel's pending Path X / Path Y decision — see Brief).

**No overlap with SPEC 5** (SPEC 5 owns `modules/lens-pricing/**` + possibly `shared/js/lens-price-resolver.js` if extracted; this SPEC owns `modules/lens-active-designs/**`). If Daniel picks Path Y (parallel + coordination-tool extension), the two SPECs can run concurrently. If Path X (sequential), this runs first.

---

## 12. Rollback Plan

- Pre-commit tag `pre-m1-lens-designs-rebuild-2026-05-17` placed by executor at Commit 1.
- `git reset --hard <tag>` restores all 4 module files to current state.
- No DB rollback needed (this SPEC performs zero DDL/DML beyond toggle persistence via existing RPC).

---

## 13. Lessons Already Incorporated + Brief defects logged for Architect

**Lessons applied:**
- 1:1 rebuild pattern from `M1_LENS_INVENTORY_MOCKUP_1TO1` — partial mirrors mockup structure, JS substitutes live data; shared components are init-and-go
- Drawer/component DOM lives inside the shared component (don't estimate partial growth from mockup line count)
- Path-check (Step 1.6) caught `shared/js/data-table.js` Brief defect at SPEC authoring
- Pre-flight DB column probe caught `lens.designs.view` Brief assumption (key doesn't exist)
- Reuse existing `lens-active-designs-toggle.js` `toggleActive()` rather than rewriting (Iron Rule 21)

**Brief defects logged for Architect harvest:**

1. **`shared/js/data-table.js` is a phantom path.** Brief §"Scope" + §"Pre-Authoring" lists this file. Reality: SPEC 2's Rule 21 investigation chose to EXTEND `shared/js/table-builder.js` (with `shared/js/table-builder-extensions.js`) rather than create a separate `data-table.js`. Brief inherited the pre-investigation naming. Foreman fixed in §0 + §S11; logged for Architect to fix in the next sibling Brief.

2. **`lens.designs.view` permission key is a phantom key.** Brief §"Scope" calls for "view-only for `lens.designs.view`". Live DB has only `lens.designs.manage` (per-tenant ×2). The existing screen gates the WHOLE tab on `lens.designs.manage` per `inventory-shell-lens.js:45`. Foreman decision: keep that pattern — no view-only fallback needed; users without `lens.designs.manage` simply don't see the tab. If Daniel wants a future view-only mode, file a follow-up SPEC seeding the new key + adjusting the gate.

3. **Step 1.6 + 1.7 in opticup-strategic SKILL.md fired correctly on this Brief.** Both defects caught at SPEC-author time before sealing, per the 2-strike rule applied 2026-05-17 morning. The harvest is working as designed.

---

## 14. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT §2
- [ ] Integrity gate exit 0 or 2 at every commit
- [ ] `git status --short` returns scope-clean after closure commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written in SPEC folder
- [ ] ≥3 Tier C screenshots in `screenshots/` subdir
- [ ] Tier C VFV demo-tenant smoke complete (page loads, stat cards bind, table renders, toggle persists, side panel opens, bulk actions transact)
- [ ] Regression check: lens-inventory tab still works (drawer + price columns + permission gating) — no spillover damage from shared CSS additions if any

---

**END SPEC**

_Authored 2026-05-17 IDT by opticup-strategic (Foreman). Sealed after Step 1.6 (path-check) + Step 1.7 (consumer-grep N/A) + DB pre-flight passed with 2 Brief defects caught and resolved._
