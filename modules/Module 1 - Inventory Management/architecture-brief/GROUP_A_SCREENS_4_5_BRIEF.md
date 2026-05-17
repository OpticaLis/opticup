# BRIEF — Group A (SPECs 4 + 5): Designs Selection + Pricing rebuilds

**For:** Claude Code session on Daniel's Windows desktop, acting as opticup-strategic (Foreman). Author both SPECs sequentially under this single Brief, then dispatch each to an executor session on a separate worktree for parallel execution.

**Parent Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md`

**Estimated authoring time (Foreman):** 30-45 min for both SPECs.
**Estimated execution time:** SPEC 4 ~4-5h, SPEC 5 ~6-7h. Parallel → 6-7h wall clock.

---

## Context

Foundation Phase 100% complete (5 SPECs closed, commits `cbe3a8e..ab49429`). Phase 0 shared components ready for consumption. DB schema for delivery notes + `lens_variant_notes` live. Inventory screen integrated with Quick Receipt drawer + price columns. RPC consolidated to 9-args.

Daniel-Architect authorized **Option 3** dispatch strategy: Group A first (Designs + Pricing in parallel worktrees), then Groups B + C after A closes, then SPEC 10 sequential.

This Brief covers Group A only.

---

## Pre-Authoring Mandatory Checks (per opticup-strategic SKILL Step 1.6 + 1.7)

Before sealing EACH of the 2 SPECs, the Foreman MUST:

1. **Path verification** — run `Test-Path` on every literal path the SPEC will cite. Specifically:
   - `modules/lens-active-designs/lens-active-designs-{main,partial,toggle,tree}.{js,html}`
   - `modules/lens-pricing/lens-pricing-{main,partial,bulk,filters,grid,inline-edit}.{js,html}`
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_{DESIGNS_SELECTION,PRICING}_MOCKUP.html`
   - All shared component paths (`shared/js/{chip-filter-row,stat-card-row,side-detail-panel,wizard-step-indicator,group-header-row,data-table,quick-receipt-drawer,lens-details-drawer}.js`)
2. **Consumer grep embedded in §6** — if SPEC §5 claims "only N consumers exist" of any pattern, paste the exact PowerShell command into §6.
3. **DB schema probe** — if SPEC writes to any lookup table, query `information_schema.columns` first.

---

## SPEC 4 — `M1_LENS_DESIGNS_SELECTION_REBUILD`

**Target:** Rebuild `modules/lens-active-designs/` partial + JS to mockup fidelity.

**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html` (699 lines)

**Current state:**
- `lens-active-designs-partial.html` — 22 lines (skeleton)
- `lens-active-designs-main.js` — 58 lines (loader)
- `lens-active-designs-toggle.js` — 37 lines (active toggle state)
- `lens-active-designs-tree.js` — 152 lines (hierarchy rendering)

**Audit verdict:** ~3% mockup-fidelity match. Missing: 4 stat cards, brand grouping, toggle switches, side detail panel.

**Scope:**
- Rebuild partial to mockup structure (header chips + stat-card row + table + side panel)
- Consume `shared/js/chip-filter-row.js`, `shared/js/stat-card-row.js`, `shared/js/data-table.js`, `shared/js/side-detail-panel.js`
- 4 stat cards (mockup-defined): total brands, active brands, total designs, active designs
- Brand grouping in table via `shared/js/group-header-row.js` color bands
- Toggle switches per design (active/inactive) — wire to existing `lens-active-designs-toggle.js` logic
- Side detail panel on row click (variant breakdown + activate-all / deactivate-all actions)
- Permission gate: `lens.designs.manage` for write actions; view-only for `lens.designs.view`
- RTL throughout, gold palette per mockup, dark navy table headers

**Estimated:** 4-5h. Tier C VFV mandatory.

**Key risks:**
- `lens-active-designs-tree.js` is 152 lines — may grow past 350-line cap. Foreman should pre-plan split (e.g., extract `tree-render` from `tree-state`).
- Brand grouping in mockup uses sticky sub-headers — verify `shared/js/group-header-row.js` supports sticky.

---

## SPEC 5 — `M1_LENS_PRICING_REBUILD`

**Target:** Rebuild `modules/lens-pricing/` partial + JS to mockup fidelity. Includes F-5 resolution (sell-price column wiring).

**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html` (1211 lines)

**Current state:**
- `lens-pricing-partial.html` — 28 lines (skeleton)
- 5 JS files totaling ~460 lines (main, bulk, filters, grid, inline-edit)

**Audit verdict:** ~6% mockup-fidelity match. Missing: tabs (פעילים / ממתינים / מבצעים / היסטוריה), bulk toolbar, approval card, 3-column structure, dual view modes, Lens Details drawer.

**Scope (largest SPEC of the 6):**
- **Dual view modes** (per Daniel decision #12):
  - Edit mode (admin/manager via `lens_pricing.edit` permission key from SPEC 3) — bulk toolbar + approval flow + hierarchy view
  - Read-only mode (worker default) — flat sortable table with quick filters, 10 columns
  - Toggle pill at top switches between modes (UI present in mockup; permissions decide default state)
- **Tabs (mockup §3.1):** פעילים / ממתינים לאישור / מבצעים / היסטוריה
- **Per-row "פרטים נוספים" button** opens `shared/js/lens-details-drawer.js` with 2 tabs:
  - לוגים (price changes + stock movements — read-only always)
  - הערות (read from + write to `lens_variant_notes` table — CRUD per `lens_pricing.edit` permission)
- **Cost-price column** gated by `inventory.view_cost_price` permission (via `data-permission` attr on `<th>` + `<td>`)
- **F-5 resolution:** wire sell-price resolver so the `מחיר מכירה` column in `LENS_INVENTORY_MOCKUP` lots-table + movements-table displays actual price (not `—` placeholder). This is the canonical resolver; Inventory screen consumes it via a `shared/js/lens-price-resolver.js` (NEW — Foreman to decide if this gets extracted to Module 1.5)

**Estimated:** 6-7h. Tier C VFV mandatory + ALSO verify Inventory screen's `מחיר מכירה` column now resolves (regression check on F-5).

**Key risks:**
- Largest SPEC of the 6. May need to split into 5a (Edit mode + tabs) and 5b (Read-only mode + Lens Details drawer + F-5) if scope balloons. Foreman should pre-decide based on partial line-count target.
- `lens_variant_notes` CRUD is new functionality — needs RPCs (`create_lens_variant_note`, `update_lens_variant_note`, `delete_lens_variant_note`) OR direct PostgREST writes with RLS. Foreman to decide.
- Sell-price resolver consumer pattern — needs to support both Inventory (lots-table per variant) and Pricing (table-wide). Test both consumer paths.

---

## Pipeline Coordination — Group A on 2 worktrees

After both SPECs are authored + sealed:

1. **Worktree W-A1** for SPEC 4 (Designs Selection):
   - Branch: `develop` (single-branch coordination enforced by `pipeline-coordination.mjs`)
   - Wait — the tool enforces ONE Pipeline per branch. **Group A cannot run in parallel on develop.**
   - **Recommendation to Daniel-Architect:** either (a) extend `pipeline-coordination.mjs` to allow non-overlapping `files_owned_globs` on same branch, OR (b) run Group A sequentially on develop (Designs first → Pricing).

**Daniel — this is a strategic decision I'm flagging now, not a Foreman decision.** The original parent Brief assumed parallel worktrees would work; SPEC 3's escalation revealed that the coordination tool blocks it. We have two paths:

**Path X — Sequential on develop**: Group A runs Designs (4-5h), then Pricing (6-7h). Total 10-12h sequential. Safer.

**Path Y — Parallel worktrees + extend tool**: Foreman first authors a tiny SPEC `M1_5_PIPELINE_COORDINATION_FILE_GLOB_AWARENESS` (~1-2h) to extend the tool to allow non-overlapping `files_owned_globs` on same branch. Then Group A parallel (6-7h wall clock). Net: 7-9h total.

**Recommendation: Path X (sequential) for Group A.** Sequential Group A gives us empirical data on the rebuild Pipeline shape before we invest in parallel infrastructure. If Group A goes smoothly, we then extend the coordination tool for Groups B + C parallel (more value because 4 SPECs run in parallel instead of 2).

---

## What the Foreman should do

1. **Read this Brief in full + parent Brief.**
2. **Run pre-authoring Step 1.6 + 1.7 checks for SPEC 4** before sealing.
3. **Author `SPEC.md` + `ACTIVATION_PROMPT.md`** for SPEC 4 at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_SELECTION_REBUILD/`.
4. **Run pre-authoring Step 1.6 + 1.7 checks for SPEC 5** before sealing.
5. **Author `SPEC.md` + `ACTIVATION_PROMPT.md`** for SPEC 5 at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PRICING_REBUILD/`.
6. **Commit + push both SPECs to develop.**
7. **Notify Daniel via chat** with the dispatch question (Path X vs Path Y) BEFORE any executor runs.

After Daniel chooses Path X or Y:
- Path X: dispatch SPEC 4 executor → after close, dispatch SPEC 5 executor.
- Path Y: author the coordination tool extension SPEC first, then parallel.

---

## Constraints

- Mockup IS the spec (Pattern P-AR-16). Skeleton-prose partials are wrong.
- Tier C VFV mandatory for both — side-by-side Chrome MCP comparison live vs mockup, CRITICAL/HIGH drift blocks close.
- All 8 shared components from SPEC 2 must be consumed (Iron Rule 21).
- All `permissions` gating via `.col-permission-gated` + `data-permission` attribute pattern.
- Iron Rule 12 (file size <350 lines) — pre-plan splits if growing partial.
- Iron Rule 31 + 32 gates at every commit.
- No Prizma writes during execution (demo tenant only for VFV).

## Stop-on-deviation triggers (Brief-wide for both SPECs)

- Path verification fails for any listed file → STOP, fix Brief, escalate
- Shared component API doesn't fit the consumer need → STOP, propose API change in FINDINGS.md
- `lens_variant_notes` RPC vs PostgREST decision conflicts with existing patterns → STOP, escalate for Daniel decision
- F-5 sell-price resolver requires schema change beyond what SPEC 3 shipped → STOP

---

**END BRIEF**

_Authored by Cowork-Architect (Daniel-via-Cowork session) 2026-05-17 evening. Group A dispatch authorization pending Daniel's Path X vs Path Y decision._
