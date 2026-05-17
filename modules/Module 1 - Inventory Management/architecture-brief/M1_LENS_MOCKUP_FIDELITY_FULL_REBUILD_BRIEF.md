# BRIEF — M1 Lens Mockup-Fidelity Full Rebuild (autonomous run)

**For:** Claude Code on Daniel's Windows desktop. **Dispatch via opticup-strategic skill, NOT opticup-executor** — this Brief authorizes the Foreman to author the SPECs from this Brief. Multiple SPECs flow from this single Brief.

**Type:** Multi-Pipeline rebuild authorization. Daniel-Architect (Cowork) has sealed all design decisions. The Foreman authors SPECs, dispatches Executors, runs the chain end-to-end.

**Estimated total wall clock:** 24-28 hours (parallel-execution on worktrees). Sequential: 33-41h.

**No time budget per Pipeline.** Mockup fidelity (Pattern P-AR-16) is the lawful exit criterion, not a wall-clock cap. The lens-inventory rebuild Pipeline (`M1_LENS_INVENTORY_MOCKUP_1TO1`) is the precedent — proven end-to-end.

---

## Context (sealed decisions to enforce)

Daniel-Architect sealed **16 design decisions** on 2026-05-17 evening, harvested from:
- The fresh audit report: `M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md` (commit `9085c02`)
- Daniel's Q&A in chat with Cowork-Architect
- Round 1 + Round 2 mockup updates (`ae1a5de`, `b2d1a4b`)

**The 16 decisions** (all binding for every SPEC dispatched under this Brief):

1. **Retire `M1_INVENTORY_UNIFIED_SCREEN §1.5 R-1..R-13`** — the lens-CSS retargeting to frames palette. Mark `css/lens-tabs.css` header DEPRECATED. Rewrite to mockup palette (gold accents, dark navy headers, full per-screen chrome).
2. **Phase 0 mandatory** — 5 shared components in Module 1.5 BEFORE any screen rebuild. Iron Rule 21 enforcement.
3. **Recurring patterns → Module 1.5** — tables, drawers, modals appearing in 3+ screens get extracted. The first SPEC builds the extraction list during planning.
4. **Catalog screens 6a + 6b = ONE shared component** with `theme` prop (`dark`/`light`) + `scope` prop (`global`/`tenant`).
5. **6a admin = dark theme. 6b "הקטלוג שלי" = light theme + scope=tenant + identical tooling otherwise.**
6. **Wizard 4-step indicator on PO screen** — keep, mockup-mandated.
7. **"Overdue" stat-card on POs list** — replace existing "received" stat-card per mockup.
8. **No time budget per Pipeline** — mockup fidelity wins.
9. **Quick Receipt drawer = SOLE inventory-entry path.** Scanner, manual-add, bulk-add all funnel through it. NO direct stock writes from any inventory UI.
10. **"הקטלוג שלי" 1:1 visual clone of admin catalog.** Light theme only difference.
11. **Price columns in inventory** — `מחיר מכירה` always visible; `מחיר עלות` gated by `permissions.inventory.view_cost_price`.
12. **Pricing screen dual view mode** — Edit (admin/manager) vs Read-only (worker). Toggle pill at top.
13. **Column permission flexibility** — every column in inventory/catalog tables is `permissions`-gated. Cost-price first instance. Use `.col-permission-gated` class + `data-permission` attribute.
14. **Delivery note mandatory on inventory entry** — `delivery_note_number` TEXT + `supplier_id` UUID + `has_no_invoice` BOOLEAN + `receipt_date` DATE on every receipt session. Checkbox "אין תעודה" for audit override.
15. **Bulk receive in Quick Receipt drawer** — user fills delivery note + supplier ONCE, all N staged items inherit the metadata. NO per-item delivery note.
16. **Invoices Inbox screen NOT in scope** — only DB schema must support it (per decision 14). Placeholder exists at `architecture-brief/INVOICES_INBOX_PLACEHOLDER.md`.

**Plus 2 deeper UX decisions from Round 2:**

17. **Pricing screen "פרטים נוספים" button per row** — opens side drawer with 2 tabs: **לוגים** (price history + stock movements, read-only always) + **הערות** (freeform multi-line text with timestamp + author per note; edit/add/delete in Edit mode, read-only in View mode).
18. **`lens_variant_notes` DB table** — new table for freeform notes per variant. Tenant-scoped, RLS-protected.

---

## Bootstrap (mandatory for each SPEC dispatched under this Brief)

Every Pipeline started under this Brief MUST:

1. **Load skill `opticup-strategic`** (Foreman role).
2. **Read Brief in full** (this file).
3. **Read 7 canonical mockups** (the design spec):
   - `architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` (1503 lines — Quick Receipt drawer + price cols)
   - `architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html`
   - `architecture-brief/mockups/LENS_PRICING_MOCKUP.html` (1211 lines — dual-view + lens-details drawer + notes)
   - `architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html`
   - `architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html`
   - `architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html`
   - `architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`
4. **Read audit report** `M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md` (commit `9085c02`).
5. **Read 2 update Briefs** (`M1_LENS_MOCKUP_UPDATES_2026_05_17_BRIEF.md` + `..._ROUND2_...`).
6. **Read Iron Rules + Module 1 docs + Module 1.5 docs** per opticup-strategic First Action.
7. **Read `INVOICES_INBOX_PLACEHOLDER.md`** to understand DB schema constraints for delivery notes.
8. **Confirm parallel coordination** — register session in `_archive/pipeline-sessions/*.lock` per CLAUDE.md §9 Parallel Pipeline Coordination.

---

## Pipeline Plan (8 SPECs total)

### SPEC 1 — `M1_LENS_PALETTE_RETIRE_UNIFIED` (~2-3h, sequential, BLOCKING)

**Purpose:** Retire R-1..R-13 from `M1_INVENTORY_UNIFIED_SCREEN`. Rewrite `css/lens-tabs.css` from frames-aligned palette to mockup palette. This unblocks every subsequent SPEC.

**Scope:**
- Mark `M1_INVENTORY_UNIFIED_SCREEN` SPEC as DEPRECATED for the §1.5 R-1..R-13 block only — add deprecation note pointing to this rebuild Brief
- Rewrite `css/lens-tabs.css` header — remove "frames-aligned" goal, replace with "mockup-aligned per `D-M1-02..D-M1-14` ratification 2026-05-14"
- Replace navy-on-light chip palette with gold-on-light (per mockups)
- Replace light-slate table headers with dark navy table headers (per mockups)
- Restore per-screen chrome that R-7 stripped (filter banners, action buttons)
- Restore `.btn-*` classes per mockups (drop the "reuse frames" override of R-8)
- Update chip palette per R-13 to mockup values

**Success criteria:**
- Visual check via Chrome MCP on `inventory.html` — gold accents visible on lens tabs, dark navy table headers, per-screen chrome present
- `git diff` on `css/lens-tabs.css` shows the rewrite
- All other lens screens (which haven't been rebuilt yet) still render without console errors (graceful degradation — they look "ugly" but don't crash)

**Stop-on-deviation:** if rewriting lens-tabs.css breaks the lens-inventory screen (the one already at 1:1) → STOP, escalate. We don't want to regress the only working screen.

---

### SPEC 2 — `M1_5_SHARED_COMPONENTS_PHASE_0` (~7-8h, sequential, BLOCKING)

**Purpose:** Extract 5 shared components to Module 1.5 + add missing CSS tokens. Defines the building blocks every subsequent SPEC consumes.

**Components to build:**

1. **`shared/js/chip-filter-row.js` + `shared/css/chip-filter.css`** (~1h)
   - Gold pill (active) / outline grey (inactive)
   - Supports icons + count badges
   - Used in 5 mockups (Inventory, Designs, Pricing, POs, GR)
   - API: `ChipFilter.init(container, { chips, onSelect, multiSelect })` — pattern matches lens-inventory precedent

2. **`shared/js/stat-card-row.js` + `shared/css/stat-card.css`** (~1h)
   - 4-5 cards with colored border-right + label + value + sub
   - Click-to-filter integration
   - Used in 3 mockups (Designs, Pricing, POs)
   - API: `StatCardRow.init(container, { cards, onCardClick })`

3. **`shared/js/side-detail-panel.js` + `shared/css/side-detail.css`** (~1.5h)
   - Right-pinned card with gradient header
   - Used in 4 mockups (Inventory, Designs, Pricing, GR)
   - Sticky header + body section
   - API: `SideDetailPanel.init(container, { title, headerVariant, sections })`

4. **`shared/js/wizard-step-indicator.js` + `shared/css/wizard.css`** (~1.5h)
   - 4 circles with connecting lines, active/done/upcoming states
   - Used in 2 mockups (Inventory bulk-add, PO 4-step)
   - API: `WizardSteps.init(container, { steps, activeIndex, onStepClick })`

5. **`shared/js/group-header-row.js`** (~0.5h)
   - Table sub-headers with colored band (purple/blue/amber for source-type)
   - Used in 2 mockups (PO, GR)
   - Reusable across data-tables for source-grouping
   - API: `GroupHeaderRow.render(sourceType, label, count)`

**Plus extract:**

6. **`shared/js/data-table.js` + `shared/css/data-table.css`** (~2h, NEW — surfaced during planning)
   - Generic data-table with header + sortable cols + filter row + pagination + row-actions
   - Supports `data-permission` attribute on `<th>` + `<td>` for column-gating
   - Used in EVERY screen (8+ usages). Iron Rule 21 violator if not extracted.
   - API: `DataTable.init(container, { columns, data, sortable, pagination, permissions, onRowAction })`

7. **`shared/js/quick-receipt-drawer.js` + `shared/css/quick-receipt.css`** (~2h, surfaced during planning)
   - Right-pinned drawer with delivery-note + supplier + staged items
   - Used by Inventory screen (already mockup-defined)
   - **Will be reused** when M9 (Goods Receipt) builds its full module
   - API: `QuickReceiptDrawer.init(container, { onSubmit, onCancel })`

8. **`shared/js/lens-details-drawer.js` + `shared/css/lens-details.css`** (~2h, surfaced during planning)
   - Right-pinned drawer with 2 tabs (logs read-only + notes editable-by-permission)
   - Used by Pricing screen (already mockup-defined)
   - **Will be reused** by any future screen that needs variant-level details (Inventory side-panel, M7 Orders detail view, etc.)
   - API: `LensDetailsDrawer.init(container, { variantId, mode: 'edit'|'readonly' })`

**Plus add to `shared/css/tokens.css`** (~0.5h):

- chip-overdue (red): `--chip-overdue-bg: #fee2e2; --chip-overdue-fg: #991b1b;`
- chip-stock / chip-custom / chip-customer / chip-manual / chip-discrepancy (per receipt mockup)
- Source-group banding: `--src-purple-bg: #faf5ff; --src-blue-bg: #eff6ff; --src-amber-bg: #fffbeb;`
- Progress-bar widget: `--progress-bg / --progress-fg`
- Dark theme palette: `--dark-bg: #0f172a; --dark-panel: #1e293b; --dark-border: #334155; --dark-text: #e2e8f0;`
- Gradient header card: `--gradient-header: linear-gradient(...)`
- Toggle-switch widget: `--toggle-on / --toggle-off / --toggle-thumb`

**Wire into Module 1.5 index + add to `docs/GLOBAL_MAP.md`** (~0.5h)
**Tier C smoke test** — each component renders in isolation + 2 usage examples (~1-2h)

**Success criteria:**
- 8 components ship under `shared/js/` + `shared/css/`
- All registered in `docs/GLOBAL_MAP.md`
- Iron Rule 12 — no component file exceeds 350 lines
- Iron Rule 21 — no duplicate of existing functionality (cross-reference check against existing `shared/`)
- Module 1.5 SESSION_CONTEXT + MODULE_MAP + ROADMAP updated

**Stop-on-deviation:** if any component overlaps with existing `shared/` code (Rule 21) → STOP, propose merge instead of new file.

---

### SPEC 3 — `M1_LENS_DB_SCHEMA_RECEIPTS_NOTES` (~2h, sequential, BLOCKING)

**Purpose:** Add DB schema for delivery notes (decision 14) + lens variant notes (decision 18). This unblocks Pricing + Inventory rebuilds.

**Migrations to apply (via Supabase MCP):**

1. **Add to `lens_variant_stock_entries` (or equivalent receipt-event table — find the actual name in current schema)**:
   ```sql
   ALTER TABLE lens_variant_stock_entries
     ADD COLUMN delivery_note_number TEXT,
     ADD COLUMN supplier_id UUID REFERENCES suppliers(id),
     ADD COLUMN has_no_invoice BOOLEAN NOT NULL DEFAULT FALSE,
     ADD COLUMN receipt_date DATE NOT NULL DEFAULT CURRENT_DATE;
   ```
   (Verify against `docs/GLOBAL_SCHEMA.sql` for the actual entry table — could be `stock_entries`, `lens_stock_movements`, etc. Use whatever exists.)

2. **Create `lens_variant_notes`**:
   ```sql
   CREATE TABLE lens_variant_notes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     variant_id UUID NOT NULL REFERENCES lens_variant(id) ON DELETE CASCADE,
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     author_id UUID NOT NULL REFERENCES auth.users(id),
     body TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   -- RLS (Iron Rule 15 canonical pattern)
   ALTER TABLE lens_variant_notes ENABLE ROW LEVEL SECURITY;
   CREATE POLICY service_bypass ON lens_variant_notes TO service_role USING (true);
   CREATE POLICY tenant_isolation ON lens_variant_notes TO public
     USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);
   ```

3. **Add 2 permission keys to `permissions` table** (via existing permission seeding pattern — check Module 1.5 patterns):
   - `inventory.view_cost_price` (admin only by default)
   - `lens_pricing.edit` (admin + manager by default)

**Success criteria:**
- `docs/GLOBAL_SCHEMA.sql` updated with new schema
- `docs/DB_TABLES_REFERENCE.md` updated with T constant for `lens_variant_notes`
- Module 1 db-schema.sql updated
- Migrations applied via MCP, recorded in MIGRATIONS log
- Iron Rule 14, 15, 18 all satisfied (tenant_id, RLS, no global UNIQUEs)

**Stop-on-deviation:** if the receipt-event table name guess is wrong → STOP, verify against live schema before applying.

---

### SPEC 4-9 — 6 screen rebuilds (parallel-able on 3 worktrees)

After SPECs 1+2+3 land, all 6 screens can rebuild. The Foreman authors a folder-per-SPEC for each, dispatches to Executor, reviews on close.

**Group A (worktree 1):**
- **SPEC 4** — `M1_LENS_DESIGNS_SELECTION_REBUILD` (~4-5h)
- **SPEC 5** — `M1_LENS_PRICING_REBUILD` (~6-7h, includes dual-view + lens-details drawer)

**Group B (worktree 2):**
- **SPEC 6** — `M1_LENS_PURCHASE_ORDER_REBUILD` (~5-6h, includes 4-step wizard)
- **SPEC 7** — `M1_LENS_ACTIVE_POS_LIST_REBUILD` (~3-4h, includes overdue stat-card)

**Group C (worktree 3):**
- **SPEC 8** — `M1_LENS_GOODS_RECEIPT_REBUILD` (~5-6h, full goods-receipt screen — distinct from Quick Receipt drawer)
- **SPEC 9** — `M1_LENS_PLATFORM_CATALOG_REBUILD` (~5-6h, builds shared catalog component with theme prop)

**Group D (sequential after Group C SPEC 9):**
- **SPEC 10** — `M1_LENS_PRIVATE_CATALOG_INSTANCE` (~3-4h, consumes the catalog component built in SPEC 9 with theme=light, scope=tenant)

**Per-screen success criteria (template — Foreman expands per SPEC):**
- Live screen visually 1:1 to its mockup file via Chrome MCP comparison
- Tier C VFV (Visual Fidelity Verification) passes — side-by-side element classification, zero CRITICAL/HIGH drift
- All shared components from SPEC 2 used (no inline duplication — Iron Rule 21)
- All DB writes go through the path defined in SPEC 3 (delivery notes captured on every receipt)
- All `permissions`-gated columns have `.col-permission-gated` + `data-permission` attribute
- Iron Rule 31 + 32 gates green at every commit
- `EXECUTION_REPORT.md` + `FINDINGS.md` written per folder-per-SPEC protocol

**Inventory screen update (incorporates earlier 1:1 work):**

The inventory screen is ALREADY at 1:1 (Pipeline `M1_LENS_INVENTORY_MOCKUP_1TO1`, merged 2026-05-18). The Round 1+2 mockup updates added:
- Quick Receipt drawer (replaces all direct-to-stock paths)
- Price columns in lots-table + movements-table (cost gated)
- Helper strip below scanner

**SPEC 4a (or insert as SPEC 3.5)** — `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION` (~3-4h) — applies the Round 1+2 mockup updates to the existing inventory screen. Use the already-built shared components from SPEC 2 (Quick Receipt drawer + data-table column gating + Lens Details drawer). Sequenced after SPEC 2 + 3.

---

## Pipeline Coordination

- Worktree per Group (3 worktrees: A, B, C). Each worktree per CLAUDE.md §9 Parallel Pipeline Coordination — registers lock file at `_archive/pipeline-sessions/*.lock` at start.
- SPECs 1 + 2 + 3 + 4a (inventory integration) run **sequentially** on develop branch. No worktrees during foundation.
- SPECs 4-9 run **in parallel** on worktrees after SPECs 1+2+3+4a close.
- SPEC 10 runs **sequentially** after SPEC 9 (depends on Group C output).
- Each Pipeline closes with FOREMAN_REVIEW.md before the next worktree starts on the same group.

## Cross-cutting requirements (apply to EVERY SPEC)

- **Mockup IS the spec** (Pattern P-AR-16). If a Brief description conflicts with the mockup HTML, the mockup wins.
- **Tier C VFV mandatory** — every SPEC §12 QA path must include Chrome MCP side-by-side comparison of live vs mockup. CRITICAL/HIGH drift = SPEC cannot close 🟢.
- **No Prizma writes** — all testing on demo tenant. Verify in §0.E baseline-tables match check.
- **Iron Rules 1-32 enforced** at every commit via pre-commit hooks. No bypasses.
- **Folder-per-SPEC protocol** — every SPEC ships SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md in its folder.
- **Module integration** — at end of each Pipeline group, merge MODULE_MAP into GLOBAL_MAP per Integration Ceremony.

## Stop-on-deviation triggers (Brief-wide)

- Any SPEC requires touching `main` branch → STOP, escalate (Daniel-only authority)
- Any SPEC requires Prizma data writes → STOP, escalate
- Any SPEC discovers a 7th lens screen not in this Brief → STOP, escalate (could be phase-letter drift from other repo)
- Mockup file missing or malformed → STOP, escalate
- Shared component from SPEC 2 needs API change after consumption → STOP, propose breaking change in FINDINGS.md

## What this Brief AUTHORIZES

- Foreman to author 10+ SPECs based on this Brief without per-SPEC Daniel approval
- Executor to dispatch under Bounded Autonomy per Iron Rule 9
- Reviewer + Localhost-Tester chain to run per agent-chain-protocol
- Worktree parallelization per CLAUDE.md §9
- DB schema changes per SPEC 3 (delivery notes + variant notes + permission keys)
- CSS rewrite (lens-tabs.css per SPEC 1)
- New files under `shared/js/`, `shared/css/`, `modules/lens-*` (consumers)
- Tier C testing on demo tenant
- Merge to develop (each SPEC). Daniel-only merge to main after full M1 lens compliance achieved.

## What this Brief DOES NOT authorize

- `git push --force` (any history rewrite)
- Direct push to main (Daniel-only)
- Modifications outside `modules/Module 1`, `modules/Module 1.5`, `shared/`, `css/`, `js/`, `docs/`, `inventory.html`
- New external dependencies (npm packages)
- DB schema beyond SPEC 3's exact list
- Sentinel SKILL.md changes
- Other Module 1.5 SKILL.md changes beyond Integration Ceremony updates

## Final reporting

After all SPECs close 🟢 (estimated 24-28h wall clock):

- Foreman writes consolidated `M1_LENS_REBUILD_FINAL_REPORT.md` in `architecture-brief/`
- All 6 screens documented as 🟢 1:1 mockup-compliant
- All SPECs folder-per-SPEC artifacts intact in `modules/Module 1 - Inventory Management/docs/specs/`
- MASTER_ROADMAP.md updated reflecting M1 lens UI 🟢 COMPLETE
- Hand-off message to Daniel: "🟢 M1 lens UI mockup-fidelity rebuild complete. {N} commits across {SPEC count} Pipelines. Ready for merge to main after your visual approval."

Daniel reviews → authorizes PR develop→main → ships.

---

## Where to begin

Foreman authoring order:

1. SPEC 1 (lens-tabs.css rewrite) — author + execute + close
2. SPEC 2 (shared components Phase 0) — author + execute + close
3. SPEC 3 (DB schema) — author + execute + close
4. SPEC 4a (inventory integration) — author + execute + close
5. **Pause + report to Daniel** before launching parallel groups A/B/C
6. Daniel reviews foundation work, authorizes parallel dispatch
7. Group A/B/C in parallel worktrees, SPECs 4-9
8. SPEC 10 (private catalog) after Group C closes
9. Final report + Daniel approval gate

---

**END BRIEF**

_Sealed by Cowork-Architect (Daniel-approved Q&A 2026-05-17 evening). All design decisions binding. No re-litigation without explicit Daniel-Architect override._
