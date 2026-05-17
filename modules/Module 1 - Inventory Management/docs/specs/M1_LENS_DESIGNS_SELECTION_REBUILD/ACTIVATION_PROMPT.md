# ACTIVATION_PROMPT — SPEC 4: M1_LENS_DESIGNS_SELECTION_REBUILD

**Paste into Claude Code session on Daniel's Windows desktop.** Group A's first SPEC. Dispatch order (sequential vs parallel-with-SPEC-5) per Daniel's Path X / Path Y decision — see SPEC §11.

---

You are **opticup-executor**. Execute the SPEC at:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_SELECTION_REBUILD/SPEC.md
```

Foundation Phase 100% complete. This is the second of 6 lens screen rebuilds (lens-inventory closed in SPEC 4a — `03caea9`). Pattern P-AR-16: mockup IS the spec.

## Bootstrap

1. Load skill `opticup-executor`. First Action protocol.
2. Pre-Action Collision Check:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --spec-slug M1_LENS_DESIGNS_SELECTION_REBUILD --files-owned-globs "modules/lens-active-designs/**,inventory.html,modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_SELECTION_REBUILD/**" --branch-owned develop
   ```
3. Read SPEC.md in full — §0 lists the Brief defects already caught at SPEC authoring (`data-table.js` phantom path + `lens.designs.view` phantom key). Both resolved by Foreman before sealing.

## Execute SPEC

Read `SPEC.md` in full. 4–6 commit plan per §10:

1. **Commit 1 — Partial + main bootstrap rewrite** (~22 → ~250 lines partial, ~58 → ~200 lines main):
   - Replace skeleton partial with mockup-aligned structure (header chips + stat-card-row mount + table mount + side-panel mount)
   - Rewrite main.js bootstrap to init all 5 shared components via SPEC 2's APIs
   - Preserve permission gate (`lens.designs.manage`) + existing `LensAD.bootstrap` global
   - If `inventory.html` doesn't already load the 5 shared components (chip-filter-row, stat-card-row, side-detail-panel, table-builder, table-builder-extensions) + their CSS, add the loads

2. **Commit 2 — 4 stat cards + chip-filter row wired to live data**:
   - Stat values from live DB (Supabase MCP queries during executor pre-flight; cards bind to in-page state)
   - Chip-filter-row mount populated per mockup

3. **Commit 3 — Brand-grouped table + toggle switches via TableBuilder extensions**:
   - Use `TableBuilder.create()` with the SPEC 2 column-permission + group-header extensions
   - Reuse `lens-active-designs-toggle.js` `toggleActive()` for the per-row switch (Iron Rule 21)
   - Sticky brand-group sub-headers per mockup
   - If `tree.js` would exceed 350 lines, split into `tree-render.js` + `tree-state.js` in this same commit

4. **Commit 4 — Side detail panel + activate-all / deactivate-all bulk actions**:
   - Use `SideDetailPanel.init()` from SPEC 2
   - Variant breakdown query (lens_design → lens_variant)
   - Bulk activate/deactivate hits N `tenant_active_offerings` rows in one transaction (existing pattern — use batch helper or fall back to per-row in a Promise.all loop with tenant_id defense-in-depth)

5. **Commit 5 (optional split)** — `lens-active-designs-stat-cards.js` and/or `lens-active-designs-detail-panel.js` if extraction is cleaner than inline

6. **Commit 6 — Closeout** — EXECUTION_REPORT + FINDINGS + screenshots + SESSION_CONTEXT + CHANGELOG

## Tier C VFV is MANDATORY (§8)

Don't skip this. Standard Tier C protocol:

- Start ERP localhost (already running per ongoing M1 sessions — check `Invoke-WebRequest http://localhost:3000/index.html`)
- Chrome MCP: navigate to `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=active-designs`
- Side-by-side screenshot vs `architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html`
- Verify all 4 mockup regions: header chips, 4 stat cards, brand-grouped table, side panel
- Click a row → side panel opens with correct variant data
- Click activate-all in side panel → multiple rows flip (verify via Supabase MCP `SELECT count(*) FROM tenant_active_offerings WHERE ... GROUP BY is_active`)
- **Regression check: navigate to inventory tab → drawer + price columns still work**
- 0 console errors throughout
- ≥3 screenshots saved to SPEC folder `screenshots/`
- Soft-delete any test rows the smoke created (Iron Rule 3)

## Stop-on-deviation triggers (SPEC §6)

- Mockup stat-card values ≠ live DB values → STOP, debug data path
- Toggle click doesn't persist to `tenant_active_offerings` → STOP
- Side detail panel renders but variant list empty → STOP
- `TableBuilder.create()` + extensions can't reproduce mockup table → STOP, propose API change in FINDINGS (do NOT modify shared component)
- Iron Rule 32 hook fires (§4 declares `None.` — any destructive op is a SPEC defect)
- Lens-inventory regression detected during Tier C → STOP, do NOT close

## No time budget

Per parent Brief. ~4–5h estimate; quality wins.

## Closeout

1. EXECUTION_REPORT.md + FINDINGS.md
2. Update Module 1 SESSION_CONTEXT + CHANGELOG (entry under "Lens UI Rebuild Phase 0 — Group A")
3. Commit + push to `origin/develop`
4. Release coordination lock
5. Notify Daniel briefly: SPEC 4 closed, dispatch SPEC 5 (or confirm Path X next step per Daniel's earlier pick)

After SPEC 4 closes 🟢, Cowork-Architect writes brief FOREMAN_REVIEW.md.

**Bounded Autonomy. Stop only on deviation.**
