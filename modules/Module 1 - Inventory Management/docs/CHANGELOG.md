# Changelog — מלאי מסגרות + עדשות-ראייה + עדשות-מגע + אביזרים

> כל השינויים במודול ניהול מלאי. 4 קטגוריות מוצר מיום 2026-05-16.

---

## Lens Rebuild — Stage 2A of 5 (Platform Catalog Admin Mockup Fidelity) 🟢 EXECUTOR CLOSED (2026-05-18)

### M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A — 2026-05-18 (🟢 EXECUTOR CLOSED — awaiting Reviewer + Tester)

**Scope:** Mockup-faithful rebuild of the **Platform Catalog Admin** screen (`modules/lens-catalog-admin/`, gated by `is_platform_super_admin` RPC). Stage 2A of architect's 5-stage M1 lens-catalog rebuild plan. Does NOT touch `shared/js/catalog-private-admin.js` (Stage 1's tenant-side surface — that's Stage 4 scope). Stage 2A adds: 2 top-level product-type tabs (glasses / contact_lens) that filter brands + series + variants schema; 4 creation modals replacing `window.prompt()` calls; mockup-faithful detail pane (version badge + adoption count + 3-button save bar); 1 additive DB migration adding `lens_design.version`. Excel import wiring deferred to Stage 2B (buttons rendered DISABLED with tooltip "זמין בשלב 2ב").

**Commits:**
- `96dcb22` feat(db): add lens_design.version column for series-level versioning
- `4fb4ec3` feat(catalog-admin): product-type tabs (glasses + contact_lens) + product_type-aware drill
- `53b597c` feat(catalog-admin): mockup-faithful detail pane + variant modal + supplier modal
- _(this commit)_ chore(spec): close M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A with retrospective

**Files changed:**
- DB MIGRATION `migrations/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql` — ALTER TABLE lens_design ADD COLUMN version integer NOT NULL DEFAULT 1; applied via Supabase MCP. Backfilled to 1 on all 145 existing global designs.
- NEW `modules/lens-catalog-admin/catalog-modal-helpers.js` (160 LOC) — shared modal helpers (openModal / closeModal / wireModal / validateRequired / focusFirstInput).
- NEW `modules/lens-catalog-admin/catalog-variant-modal.js` (226 LOC) — single-variant create modal with schema swap per product_type.
- NEW `css/lens-catalog-admin-tabs-modals.css` (197 LOC) — tabs strip + counts badge + brand-card chrome + modal overlay styles.
- MODIFY `modules/lens-catalog-admin/lens-catalog-admin.js` (169→244 LOC) — state.activeProductTab + switchProductTab + URL ?ptab= hydration + counts badge loader.
- MODIFY `modules/lens-catalog-admin/lens-catalog-admin-partial.html` (126→143 LOC) — product-tabs strip + mockup header + 3 disabled buttons + zero-series hint markup.
- MODIFY `modules/lens-catalog-admin/catalog-designs-col.js` (77→161 LOC) — product_type filter + new `loadDesignsForBrand` export + modal replaces 3 window.prompt() flow.
- MODIFY `modules/lens-catalog-admin/catalog-brands-col.js` (111→170 LOC) — product_type-aware design_count + zero-series hint + per-brand disabled quick-import button + modal replaces window.prompt.
- MODIFY `modules/lens-catalog-admin/catalog-suppliers-col.js` (113→157 LOC) — modal replaces window.prompt + optional supplier_number field.
- MODIFY `modules/lens-catalog-admin/catalog-detail-pane.js` (152→317 LOC) — version badge + adoption count + series fields editor + variants table schema swap + save bar with version-increment save handler.
- MODIFY `inventory.html` — 1 new `<link>` for the new CSS file (line 50).
- Backup: `modules/Module 1 - Inventory Management/backups/2026-05-18_M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/` (13 files; gitignored). Pre-execution git tag: `pre-M1-stage2a-platform-admin-20260518-1910`.

**Verified:**
- §3 criteria 34/34 executor-measurable pass; 6 deferred to Localhost-Tester (S-VFV-*).
- Iron Rule 31 integrity gate exit 0; Iron Rule 32 destructive-ops gate exit 0.
- All JS files ≤350 LOC (max 317 in catalog-detail-pane.js).
- New CSS file 197 LOC (within SPEC §3 180-350 range).
- `shared/js/catalog-private-admin.js` + `shared/css/catalog-private-admin.css` byte-identical (S-PRIVATE-CATALOG-UNTOUCHED).
- 0 `window.prompt(` calls remaining in `modules/lens-catalog-admin/*.js`.
- `lens_design.version` exists with NOT NULL DEFAULT 1; 145 rows backfilled.

**Findings:** See `docs/specs/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/FINDINGS.md`.

---

## Lens Rebuild — Stage 1 of 5 (Mockup Fidelity, Visual Re-Skin) 🟢 EXECUTOR CLOSED (2026-05-18)

### M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 — 2026-05-18 (🟢 EXECUTOR CLOSED — awaiting Reviewer + Localhost-Tester)

**Scope:** Re-skin the shared `CatalogPrivateAdmin` component so its two sub-tabs render two mockup-faithful chromes via page-scope CSS, scoped by `[data-catalog-theme="dark"|"light"]`. Stage 1 of architect's 5-stage M1 lens-catalog rebuild plan. Visual fidelity only — no data, no schema, no RPC, no logic.

**Commits:**
- `70c5a9a` feat(catalog-private-admin): mockup-faithful dark/light re-skin via [data-catalog-theme]
- _(this commit)_ chore(spec): close M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 with retrospective

**Files changed:**
- NEW `shared/css/catalog-private-admin.css` (346 LOC) — DARK block from LENS_PLATFORM_CATALOG_ADMIN_MOCKUP (#0f172a / #1e293b / #334155 / #1e3a8a + rgba(30,58,138,0.3) focus-ring), LIGHT block from LENS_INVENTORY_MOCKUP (#f5f6fa / #c9a555 / #b8954a / #34495e Hybrid-Navy palette).
- MODIFY `shared/js/catalog-private-admin.js` (339 → 344 LOC, +5 under +11 budget) — `dataset.catalogTheme` plumbing in `buildShell` + `switchSubtab`.
- MODIFY `inventory.html` — one `<link>` after `cat-sidebar.css` + 2-line comment (28→29 stylesheet links).
- MODIFY `MODULE_MAP.md` — row 80 for new CSS file.
- Backup: NOT triggered (4 files / +5 JS LOC). Pre-execution git tag: `pre-M1-stage1-mockup-fidelity-20260518-1740`.

**Verified:**
- §3 criteria 14/14 executor-measurable pass; 2 deferred to Localhost-Tester (S-LOCALHOST-VFV + S-NO-CONSOLE).
- Iron Rule 31 integrity gate exit 0; Iron Rule 32 destructive-ops gate exit 0 on Commit 1.
- No `:root` mutation in `shared/css/styles.css` (Brief D3 honored).
- No edits to `modules/lens-catalog-admin/**` (out-of-scope per §7).

**Findings:** 1 INFO — F-1: `docs/FILE_STRUCTURE.md` not updated for new CSS file (per CLAUDE.md §10 Integration Ceremony cadence). Foreman to decide TECH_DEBT entry vs append-to-closure-commit vs dismiss.

**Awaiting:** Reviewer commit audit + Localhost-Tester Tier C VFV (4+ screenshots + TEST_REPORT.md) + Foreman FOREMAN_REVIEW.md closure.

---

## Lens UI Rebuild — Group B 🟢 100% COMPLETE (2026-05-18)

### M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE (Module 1.5) — 2026-05-18 (🟢 CLOSED — resolves SPEC 8 F-1)

**Scope:** Hardened 4 `next_*_number` RPCs (next_lot_number, next_receipt_number, next_po_number, next_transfer_number) with regex guard `~ '^[0-9]+$'` before CAST. Placed under Module 1.5 (shared infra). 4 CREATE OR REPLACE migrations; signatures unchanged. Tier C rerun of SPEC 8's blocked smoke succeeds. SPEC 8 verdict upgraded 🟡 → 🟢. Group B 100% COMPLETE.

**Commits:**
- `d683fa8` chore(spec): author M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE SPEC
- `d083dd0` fix(db): harden 4 next_*_number RPCs against non-numeric suffix corruption
- _(this commit)_ chore(spec): close + upgrade SPEC 8 verdict 🟡→🟢

**Files changed:**
- NEW 4 migrations in `supabase/migrations/` (one per RPC)
- NEW SPEC folder under `modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/`
- NEW `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_GOODS_RECEIPT_REBUILD/FOREMAN_REVIEW.md` (SPEC 8 verdict upgrade)

**DB verified live:** all 4 RPCs contain regex pattern; signatures preserved; 3 corrupt `LOT-PO300005-*` rows still present (filtered out, not modified); get_advisors clean of new HIGH/ERROR.

**Findings:** 1 INFO (PROCESS — Tier C cleanup pattern for K2 RPC side-effects on po_line counters; codified into P-AUTHOR-1).

---



### SPEC 8 — M1_LENS_GOODS_RECEIPT_REBUILD — 2026-05-18 (🟡 CLOSED-WITH-HIGH-FINDING — Group B SPEC 3 of 3)

**Scope:** UI rebuild of `modules/lens-goods-receipt/` per `architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` (635 lines). 5-field step-meta header + source-type ChipFilter row + 3 side-panel cards (summary / customer-tied / debt-preview). `p_has_no_invoice` wired to RPC. Debt-decoupling rule enforced in code + UI text. RPC contracts unchanged.

**Status:** UI rebuild verified end-to-end on demo (page load, supplier picker, 3-line auto-load under PO group header, 3 cards, debt-decoupling text). Tier C receipt CREATE smoke ⛔ blocked by F-1 pre-existing demo data corruption (`next_lot_number` cannot parse 3 corrupt `stock_lot.lot_number` values). NOT introduced by this SPEC.

**Pipeline shape:** Single session, ~1.5h. Stop-on-deviation per §6.

**Commits:**
- `5d96549` chore(spec): author Group B SPECs (6 + 7 + 8)
- `e10923a` refactor(lens-goods-receipt): 1:1 mockup rebuild — 3 side-panel cards + chip-filter + has_no_invoice toggle
- _(this commit)_ chore(spec): close M1_LENS_GOODS_RECEIPT_REBUILD with HIGH finding

**Files changed:**
- NEW `css/lens-goods-receipt-page.css` (175 lines)
- `modules/lens-goods-receipt/lens-goods-receipt-partial.html` (92 → 131) — 3-card side panel + chip-filter mount + has_no_invoice checkbox
- `modules/lens-goods-receipt/lens-goods-receipt-main.js` (124 → 182) — orchestrator + ChipFilter + customer-tied list + has_no_invoice toggle
- `modules/lens-goods-receipt/lens-goods-receipt-lines.js` (166 → 171) — sourceFilter integration + PO group-header rows
- `modules/lens-goods-receipt/lens-goods-receipt-close.js` (105 → 106) — wire has_no_invoice from window state; clean stale supplier_debt comment
- Unchanged (RPC integration kept): supplier 81, manual 82, pre-fill 38, shipping-box 17, delivery-note 30
- `inventory.html` +1 CSS link

**Tier C:** Overview + supplier-picked + 3-line auto-load verified (2 screenshots). Close-receipt smoke blocked by F-1.

**Findings:** 1 HIGH (PRE-EXISTING — F-1: 3 corrupt demo `stock_lot.lot_number` values break `next_lot_number`). 2 SKILL proposals (P-AUTHOR-1: next_*_number suffix probe; P-EXEC-1: 22P02 triage).

---

### SPEC 7 — M1_LENS_ACTIVE_POS_LIST_REBUILD — 2026-05-18 (🟢 CLOSED — Group B SPEC 2 of 3)

**Scope:** Full 1:1 rebuild of `modules/lens-pos-list/` per `architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html` (509 lines). 5 stat-cards via StatCardRow with OVERDUE as a DERIVED predicate (not a status enum — Step 5.3 trap codified). Source-type ChipFilter row. SideDetailPanel for selected PO. Progress bar per row, overdue row class, footer summary with alerts.

**Pipeline shape:** Single session, ~1.5h. Path X sequential.

**Commits:**
- `5d96549` chore(spec): author Group B SPECs (6 + 7 + 8)
- `e2eec53` refactor(lens-pos-list): 1:1 mockup rebuild — 5 stat-cards incl. overdue (derived) + side detail panel
- _(this commit)_ chore(spec): close M1_LENS_ACTIVE_POS_LIST_REBUILD with retrospective

**Files changed:**
- NEW `css/lens-pos-list-page.css` (230 lines)
- NEW `modules/lens-pos-list/lens-pos-list-stats.js` (65 lines) — StatCardRow with 5 cards, overdue derived
- NEW `modules/lens-pos-list/lens-pos-list-detail.js` (107 lines) — SideDetailPanel for selected PO
- `modules/lens-pos-list/lens-pos-list-main.js` (55 → 93) — orchestrator + isOverdue + sourceOf
- `modules/lens-pos-list/lens-pos-list-table.js` (139 → 188) — progress bar + source badge + overdue row + footer
- `modules/lens-pos-list/lens-pos-list-filters.js` (36 → 79) — ChipFilter source row + supplier select + search + clear
- `modules/lens-pos-list/lens-pos-list-actions.js` (98 → 97) — mark-sent + cancel + open-detail
- `modules/lens-pos-list/lens-pos-list-partial.html` (55 → 63) — mount points only
- `modules/inventory/inventory-shell-lens.js` +2 manifest entries / -9 header comment lines (file cap workaround)
- `inventory.html` +1 CSS link

**Tier C:** Stat cards verified against live DB (backdate-then-restore for overdue smoke). Side detail panel opens correctly. Filters narrow rows from same loaded array. 3 screenshots. 0 console errors.

**Findings:** 1 LOW (RESOLVED IN-RUN — ChipFilter API mismatch) + 1 INFO (registry file growth, follow-up tech debt).

---

### SPEC 6 — M1_LENS_PURCHASE_ORDER_REBUILD — 2026-05-18 (🟢 CLOSED — Group B SPEC 1 of 3)

**Scope:** Full 1:1 rebuild of `modules/lens-purchase-order/` per `architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html` (387 lines). 4-step wizard via WizardSteps shared component; 3 source-type bands (custom/stock/manual) via GroupHeaderRow. 2-column grid layout with side-panel cards. State-machine driven step transitions. Cancel + mark-sent + back contextually surfaced per step.

**Pipeline shape:** Single session, ~1.5h. Path X sequential.

**Commits:**
- `5d96549` chore(spec): author Group B SPECs (6 + 7 + 8)
- `92c1639` refactor(lens-purchase-order): 1:1 mockup rebuild — 4-step wizard with shared components
- _(this commit)_ chore(spec): close M1_LENS_PURCHASE_ORDER_REBUILD with retrospective

**Files changed:**
- NEW `css/lens-purchase-order-page.css` (243 lines, scoped page-frame)
- `modules/lens-purchase-order/lens-purchase-order-main.js` (106 → 205)
- `modules/lens-purchase-order/lens-purchase-order-supplier.js` (63 → 89)
- `modules/lens-purchase-order/lens-purchase-order-shortages.js` (205 → 209)
- `modules/lens-purchase-order/lens-purchase-order-manual.js` (68 → 72)
- `modules/lens-purchase-order/lens-purchase-order-create.js` (91 → 129; +cancel)
- `modules/lens-purchase-order/lens-purchase-order-partial.html` (75 → 121)
- `modules/lens-purchase-order/lens-purchase-order-pdf.js` UNCHANGED (27)
- `inventory.html` +3 lines (wizard-step-indicator CSS+JS, page CSS link)
- Backup: 14 files in `modules/Module 1 - Inventory Management/backups/M1_LENS_PURCHASE_ORDER_REBUILD_2026-05-18/` (gitignored)

**Tier C:** PO-300006 created on demo (SHALDAG supplier, 14 lines, ₪1,038.40 incl 18% VAT) → mark-sent → cancel with reason → soft-delete. 4 screenshots. 0 errors from new code.

**Findings:** 1 LOW (ABSORBED pre-existing PostgREST join 400 with working fallback). 0 deviations.

---

## Lens UI Rebuild — Post-Group-A Fixes (2026-05-18)

### SPEC FK_FIX — M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX — 2026-05-18 (🟢 CLOSED — unblocks Group B drawer reuse)

**Scope:** Pivot `lens_variant_notes.author_id` FK target from `auth.users(id)` to `employees(id) ON DELETE SET NULL`. Resolves SPEC 5 F-1 (notes CREATE blocked under PIN auth). DB-only — zero JS changes (consumer already passes `employees.id`).

**Pipeline shape:** Single session, ~30 min, Path X sequential (Foreman + Executor in same Claude Code session). Zero findings, zero deviations.

**Commits:**
- `0c88706` chore(spec): author M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX SPEC + parent Brief
- `9356073` fix(db): m1 lens — pivot lens_variant_notes.author_id FK from auth.users to employees
- _(this commit)_ chore(spec): close M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX with retrospective

**Files changed:**
- NEW `supabase/migrations/20260518061712_m1_lens_variant_notes_drop_authusers_fk.sql`
- NEW `supabase/migrations/20260518061713_m1_lens_variant_notes_add_employees_fk.sql`
- `modules/Module 1 - Inventory Management/docs/db-schema.sql` (+33 lines — schema log block)
- 4 SPEC artifacts + 1 Tier C screenshot + parent Brief (co-committed)

**Tier C VFV:** Pricing drawer → notes tab → "➕ הוסף הערה" → smoke body → "שמור" → row inserted (`f9e0db90...`), `author_id` = sessionStorage tenant_employee.id, hard-delete cleanup, 0 console errors, `get_advisors(security)` clean.

**Findings:** 0.

---

## Lens UI Rebuild — Group A (COMPLETE 2026-05-17)

### SPEC 5 — M1_LENS_PRICING_REBUILD — 2026-05-17 (🟢 CLOSED — Group A SPEC 5 of 6, F-5 RESOLVED)

**Scope:** Largest of the 6 lens SPECs (1211-line mockup). 1:1 rebuild of `modules/lens-pricing/` per `architecture-brief/mockups/LENS_PRICING_MOCKUP.html`. Plus F-5 resolution: NEW `shared/js/lens-price-resolver.js` (effective_price RPC wrapper) + lens-inventory lot-pane wired to consume it.

**Pipeline shape:** Single session, straight-through under Bounded Autonomy. ~2.5h. Mid-execution Tier C hotfix (suppliers query). F-1 SPEC 3 schema gap caught + logged + escalated, not absorbed.

**Commits:**
- `52c0b0b` chore(spec): author Group A SPECs (4 + 5)
- `cee4994` feat(shared): lens-price-resolver wraps effective_price RPC + wire lens-inventory lots-table (F-5)
- `41384b6` refactor(lens-pricing): 1:1 mockup rebuild + view-mode toggle + 4 tabs + drawer + cost gating
- `070a30d` fix(lens-pricing): drop nonexistent is_deleted filter from suppliers load
- _(this commit)_ chore(spec): close M1_LENS_PRICING_REBUILD with retrospective

**Files changed:**
- NEW `shared/js/lens-price-resolver.js` (70 lines) — module-1.5 shared helper
- `modules/lens-inventory/lens-inventory-lot-pane.js` (+36 lines, F-5 wire)
- `modules/lens-pricing/lens-pricing-partial.html` (28 → 122)
- `modules/lens-pricing/lens-pricing-main.js` (60 → 200; orchestrator + view-mode + tabs)
- `modules/lens-pricing/lens-pricing-filters.js` (130 → 181; chip-filter mounts + resolver consumer)
- `modules/lens-pricing/lens-pricing-grid.js` (133 → 181; TableBuilder consumer with cost gating)
- NEW `modules/lens-pricing/lens-pricing-stats.js` (41) — StatCardRow with 4 cards
- NEW `modules/lens-pricing/lens-pricing-drawer.js` (149) — LensDetailsDrawer with notes CRUD
- NEW `css/lens-pricing-page.css` (195 lines, scoped)
- `inventory.html` (+5 script/CSS loads)
- `modules/inventory/inventory-shell-lens.js` (+2 manifest entries → 350 hard-cap)
- `docs/GLOBAL_MAP.md` — LensPriceResolver registered as shared cross-module helper

**Tier C VFV:**
- View-mode toggle works (edit ↔ readonly)
- 4 top-tabs switch panes; pending tab badge shows live count (0)
- 3 chip-filter rows populate from live data
- TableBuilder renders 41 offerings with 8 columns + cost permission gating
- Drawer opens with logs + notes tabs
- F-5 resolver path verified via pricing screen's 41-entry effectivePrices
- Inventory tab regression-clean
- 4 screenshots in SPEC folder
- 0 console errors

**Findings (3 logged):**
- F-1 MEDIUM: lens_variant_notes.author_id FK → auth.users (PIN auth incompatibility). SPEC 3 schema gap, follow-up SPEC `M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX` (~30 min) recommended.
- F-2 INFO: F-5 demo-data gap (0/19 stock_lot rows have supplier_offering_id). Optional seed SPEC for cross-tab Tier C history.
- F-3 LOW (ABSORBED): suppliers query bogus is_deleted filter, fixed mid-Tier-C in `070a30d`.

---

### Group A summary (2026-05-17)

Both Group A SPECs closed 🟢:
- SPEC 4 (Designs Selection): 1:1 mockup; 5 shared components; ~70 min execution.
- SPEC 5 (Pricing): largest of the 6; F-5 resolution shipped; ~2.5h execution.
- Total wall clock: ~3.5h (Path X sequential; well under 10–12h estimate).

Cross-cutting findings + recommended follow-up SPECs:
- M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS (SPEC 4 F-1, MEDIUM, ~2-3h)
- M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX (SPEC 5 F-1, MEDIUM, ~30 min)
- M1_DEMO_BACKFILL_STOCK_LOT_OFFERING_IDS (SPEC 5 F-2, optional, ~30 min)

---

### SPEC 4 — M1_LENS_DESIGNS_SELECTION_REBUILD — 2026-05-17 (🟢 CLOSED — Group A SPEC 4 of 6)

**Scope:** 1:1 mockup rebuild of `modules/lens-active-designs/` (Designs Selection screen) per `architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html`. Consumes 5 SPEC 2 shared components (StatCardRow, ChipFilter, TableBuilder + extensions, SideDetailPanel, GroupHeaderRow). 22-line skeleton → mockup-aligned 70-line partial with mount points; 3 thin JS files → 7 module files totaling ~903 lines.

**Pipeline shape:** Single-session straight-through under Bounded Autonomy (Path X sequential per Daniel directive). ~70 min execution. No escalations.

**Commits:**
- `52c0b0b` chore(spec): author Group A SPECs (4 + 5)
- `452d9e6` refactor(lens-active-designs): 1:1 mockup rebuild consuming 5 shared components
- _(this commit)_ chore(spec): close M1_LENS_DESIGNS_SELECTION_REBUILD with retrospective

**Files changed (11 in rebuild + 5 in closeout):**
- Partial rewrite: `modules/lens-active-designs/lens-active-designs-partial.html` (22 → 70)
- Main orchestrator: `modules/lens-active-designs/lens-active-designs-main.js` (58 → 135)
- Data loader: `modules/lens-active-designs/lens-active-designs-tree.js` (152 → 126; renderer retired)
- Toggle extended: `modules/lens-active-designs/lens-active-designs-toggle.js` (37 → 65; +toggleOfferingSilent +toggleMany)
- 4 NEW modules: `lens-active-designs-{stats,filters,table,detail}.js`
- NEW CSS: `css/lens-active-designs-page.css` (260 lines, scoped)
- `inventory.html`: +5 shared JS loads + 3 shared CSS loads
- `modules/inventory/inventory-shell-lens.js`: +4 manifest entries for the new sub-modules

**Tier C VFV (live on demo tenant):**
- 4 stat cards render with live DB values (8/40/0/46) matching pre-flight
- 4 chip-filter rows + 16 brand chips with design counts
- Brand-grouped table renders 9 designs across 3 brand groups
- Row click opens SideDetailPanel with 5-variant table + bulk actions
- Bulk deactivate-all smoke fired Toast successfully; surfaced RPC semantics finding F-1
- 0 console errors (only pre-existing GoTrueClient warns)
- Inventory tab regression check passes (drawer + price columns + permissions intact)
- 3 screenshots in SPEC folder `screenshots/`
- Smoke-test side-effect rows soft-deleted per Iron Rule 3

**Findings (3 logged, not absorbed):**
- F-1 MEDIUM — `toggle_active_offering(p_location_id=null)` creates parallel "all-locations" row rather than flipping per-location actuals. Pre-existing RPC semantics surfaced by new UI. Recommend `M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS` follow-up SPEC (~2-3h).
- F-2 INFO — Bulk action Promise.all (N RPC calls) not single-transaction batch. Bundles with F-1's follow-up.
- F-3 INFO — `inventory-shell-lens.js` 348 lines (pre-existing over-target; SPEC 4 added 4 manifest lines).

---

## Lens UI Rebuild Phase 0 — Foundation (COMPLETE 2026-05-17)

### M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17 — 2026-05-17 (🟢 CLOSED — Foundation cleanup before Groups A/B/C)

**Scope:** Resolve F-2 (RPC overload gap) + F-4 (stub removal) from SPEC 4a FOREMAN_REVIEW before parallel Groups A/B/C dispatch. F-5 (sell-price placeholder) remains DEFERRED to SPEC 5 by design.

**Pipeline shape:** Halted at §6 stop-trigger when pre-flight grep found a 2nd RPC consumer (`modules/lens-goods-receipt/lens-goods-receipt-close.js:65`) outside the SPEC §4 allowlist. Daniel-Architect authorized scope expansion + flagged the recurring "`modules/inventory/` missing `lens-` prefix" typo class. Pipeline resumed with all 4 commits landed.

**Commits:**
- `434ae16` chore(spec): SPEC authored
- `edbd812` feat(db): m1 lens — overload m1_create_receipt_from_box with 9-arg has_no_invoice variant
- `dbe4661` refactor(lens-inventory): pass has_no_invoice through 9-arg RPC, drop 2-step UPDATE workaround
- `6c1e742` chore(repo): migrate GR consumer, DROP 8-arg RPC, remove quick-scan stub + manifest entry
- _(this commit)_ chore(spec): close M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17 with retrospective

**DB migrations applied:**
- `20260517172923_m1_lens_receipt_from_box_9arg_has_no_invoice` (CREATE OR REPLACE 9-arg overload)
- `20260517173411_m1_lens_receipt_from_box_drop_8arg` (DROP FUNCTION 8-arg signature)

**Files changed:**
- `supabase/migrations/` — 2 new migration files
- `modules/lens-inventory/lens-inventory-main.js` — handleQuickReceiptSubmit now passes p_has_no_invoice; 14-line 2-step UPDATE block removed (272 → 260 lines)
- `modules/lens-goods-receipt/lens-goods-receipt-close.js` — added p_has_no_invoice: false literal
- `modules/lens-inventory/lens-inventory-quick-scan.js` — **DELETED** (was a 38-line redirect stub)
- `modules/inventory/inventory-shell-lens.js` — removed the stub's manifest entry
- `modules/Module 1 - Inventory Management/docs/specs/M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17/SPEC.md` — 2 in-execution path-typo fixes (Daniel-authorized allowlist correction class)

**Tier C VFV (live on demo tenant) — PASSED.**
- Drawer staged 1 item, "אין תעודה" checked, supplier Duke selected, submit fired
- Receipt `62335d00-...` landed with `has_no_invoice=TRUE` directly via the 9-arg RPC (no 2-step UPDATE)
- 2 screenshots captured in SPEC folder
- 0 console errors
- Smoke row soft-deleted (Iron Rule 3)

**Findings (logged to FINDINGS.md, not absorbed):**
- F-X MEDIUM — SPEC author path-typo lesson (process)
- F-1 INFO — `inventory-shell-lens.js` over 300-line target (pre-existing)
- F-2 INFO — `LensInvQuickScan` comment retained as documentation
- F-3 LOW — Iron Rule 32 hook path-match strictness (caught the SPEC typo correctly)
- F-4 INFO — Advisor WARN inherited by 9-arg overload (intentional K2 contract pattern)

---

### SPEC 4a — M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION — 2026-05-17 (🟢 CLOSED — FOUNDATION COMPLETE)

**Scope:** Integration SPEC — wires SPEC 2's shared `QuickReceiptDrawer` component into the live lens-inventory screen and consumes SPEC 3's DB schema (`purchase_receipt.has_no_invoice`, permission keys). Applies the Round 1+2 mockup updates per Brief decision #9 (Quick Receipt = SOLE inventory-entry path).

**Pipeline shape:** Single-session, straight-through execution under Bounded Autonomy. No escalations. ~3.5h end-to-end.

**Commits:**
- `4a89cfe` chore(spec): author M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION SPEC — execution blocked pending SPEC 2 + SPEC 3
- `1f41024` feat(lens-inventory): wire Quick Receipt drawer + entry-helper-strip + funnel scanner/manual-add/wizard
- `582448d` feat(lens-inventory): price columns in lots-table + movements-table with cost-price permission gating
- _(this commit)_ chore(spec): close M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION with retrospective

**Files changed:**
- `inventory.html` — added shared/css/tokens.css + shared/css/quick-receipt.css + shared/js/quick-receipt-drawer.js loads
- `modules/lens-inventory/lens-inventory-partial.html` — added "קבל סחורה" top-header button, entry-helper-strip, drawer mount point; movements-table 8 → 9 cols (מחיר מכירה + permission-gated עלות יחידה); manual-add card updates; removed old `#drawer-quick-scan`
- `modules/lens-inventory/lens-inventory-main.js` — `initQuickReceiptDrawer()` + `handleQuickReceiptSubmit()` + PermissionUI.applyTo on bootstrap
- `modules/lens-inventory/lens-inventory-modal-shows.js` — new funnel attachers (`_attachScanInFunnel`, `_attachBulkWizardFunnel`); receive-goods action; manual-add stages to drawer; removed dead `_submitAddStock` + `_loadSuppliersForManualAdd`
- `modules/lens-inventory/lens-inventory-lot-pane.js` — renderLots() 4 → 5 cols (sell_price placeholder + permission-gated cost)
- `modules/lens-inventory/lens-inventory-quick-scan.js` — 146 → 38-line redirect stub (`open()` → `QuickReceiptDrawer.open()`)
- `css/lens-inventory-page.css` — added .entry-helper-strip + .btn-receive + .col-permission-gated styles

**Tier C VFV (live on demo tenant):**
- Drawer opens from "קבל סחורה" with 38 demo suppliers loaded
- Manual-add stages item to drawer Section B correctly
- "סיים קבלה" with `has_no_invoice=true` → RPC returns receipt_id → 2-step UPDATE lands `has_no_invoice=true` in DB → success Toast
- Smoke-test receipt soft-deleted (Iron Rule 3)
- 6 screenshots in SPEC folder `screenshots/` for visual reference
- 0 console errors

**Persistence path:** Drawer's `onSubmit` calls `m1_create_receipt_from_box(8-arg)` then `sb.from('purchase_receipt').update({has_no_invoice}).eq(id).eq(tenant_id)` — 2-step stopgap because the RPC pre-dates SPEC 3's column. Defense-in-depth tenant_id filter on the UPDATE (Iron Rule 22).

**Findings (logged to FINDINGS.md, not absorbed):**
- F-1 INFO — SPEC §3 #3 partial line-count estimate wrong by structure (drawer DOM is in shared component)
- F-2 MEDIUM — `m1_create_receipt_from_box` needs a 9-arg overload accepting `p_has_no_invoice` (eliminate 2-step workaround)
- F-3 INFO — `_submitAddStock` deletion leaves clean RPC ownership (main.js handleQuickReceiptSubmit is sole consumer)
- F-4 LOW — `lens-inventory-quick-scan.js` is a 38-line stub awaiting full removal in next M1 maintenance SPEC
- F-5 MEDIUM — sell-price column shows "—" placeholder until SPEC 5 wires `effective_price` resolver
- F-6 INFO — pre-existing http-server PID 12672 from 2026-05-10 served (worked correctly with `-c-1`)
- F-7 INFO — Chrome MCP bfcache served pre-edit content on first navigate (hard-reload resolved)

---

### Foundation Phase Summary (2026-05-17)

All 4 foundation SPECs CLOSED:

| # | SPEC | Status | Commits | Duration |
|---|------|--------|---------|----------|
| 1 | M1_LENS_PALETTE_RETIRE_UNIFIED | 🟡 (Tier C deferred) | cbe3a8e, eddc8a1, 0949e97 | ~2h |
| 2 | M1_5_SHARED_COMPONENTS_PHASE_0 | 🟡 (Tier C smoke ✅) | 9fafd93..73c50b1 (15 commits) | ~7h |
| 3 | M1_LENS_DB_SCHEMA_RECEIPTS_NOTES | 🟢 | 80cb4cb, 05e28bb, 447f3f6, 999c433, 0e7d524 | ~2h |
| 4a | M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION | 🟢 | 4a89cfe, 1f41024, 582448d, (this) | ~3.5h |

**Total:** ~14.5h across 4 Pipelines (Brief budget 14-17h).

**Downstream:** Groups A/B/C (SPECs 5-10, 6 screen rebuilds) eligible for parallel-worktree dispatch on Daniel's authorization after foundation review by Cowork-Architect.

---

### SPEC 3 — M1_LENS_DB_SCHEMA_RECEIPTS_NOTES — 2026-05-17 (🟢 CLOSED)

**Scope:** Foundation DB deltas for the lens mockup rebuild — 1 column ADD on `purchase_receipt`, 1 new tenant-scoped `lens_variant_notes` table with canonical 2-policy RLS, 2 new permission keys seeded for both tenants × 2 roles.

**Pipeline shape:** Halted-and-resumed (2 sessions). Session A halted at pre-flight with 2 stop-on-deviation triggers (coordination collision with SPEC 2 lock + SPEC §9 template structurally wrong vs live `permissions` schema). Cowork-Architect issued `ARCHITECT_DECISION_001_SPEC3_AMENDMENT.md`; Session B executed against the amendment end-to-end.

**Commits:**
- `80cb4cb` chore(spec): author M1_LENS_DB_SCHEMA_RECEIPTS_NOTES SPEC
- `05e28bb` feat(db): m1 lens — add purchase_receipt.has_no_invoice column
- `447f3f6` feat(db): m1 lens — create lens_variant_notes table with RLS
- `999c433` feat(db): m1 lens — seed inventory.view_cost_price + lens_pricing.edit permission keys
- _(this commit)_ chore(spec): close M1_LENS_DB_SCHEMA_RECEIPTS_NOTES with retrospective

**Migrations applied:**
- `20260517161202_m1_lens_purchase_receipt_has_no_invoice` (ALTER TABLE ADD COLUMN)
- `20260517161421_m1_lens_variant_notes` (CREATE TABLE + 2 indexes + RLS canonical pattern)
- `20260517161725_m1_lens_permission_seeds_view_cost_price_and_lens_pricing_edit` (4 + 8 INSERT seed rows, idempotent via ON CONFLICT)

**Files changed:**
- 3 new migration files in `supabase/migrations/`
- `docs/GLOBAL_SCHEMA.sql` — M1 Lens block annotated with SPEC 3 deltas
- `docs/DB_TABLES_REFERENCE.md` — T.PURCHASE_RECEIPT row extended + new T.LENS_VARIANT_NOTES row
- `modules/Module 1/docs/db-schema.sql` — full SPEC 3 section with applied DDL
- `js/shared.js` — T.LENS_VARIANT_NOTES added (1 line)
- `js/shared-field-map.js` — FIELD_MAP entries for purchase_receipt + lens_variant_notes (+5 entries)
- `TECH_DEBT.md` — #M1_LENS_PERMISSIONS_TEMPLATE_AUTO_REPLICATION entry
- New SPEC folder artifacts: `EXECUTION_REPORT.md`, `FINDINGS.md`, `MIGRATION.md`, `ARCHITECT_DECISION_001_SPEC3_AMENDMENT.md`, `ACTIVATION_PROMPT.md`, `ACTIVATION_PROMPT_v2.md`
- Escalation file renamed `PREFLIGHT_HALT` → `RESOLVED_PREFLIGHT_HALT` per Brief Contract E

**Verification:**
- Live DB confirmed: 4 permissions rows (2 keys × 2 tenants) + 8 role_permissions rows (2 keys × 2 tenants × 2 roles)
- `lens_variant_notes`: rls_enabled=true, 2 policies (service_bypass + tenant_isolation), 7 columns, 3 indexes
- `purchase_receipt.has_no_invoice`: NOT NULL, DEFAULT FALSE, boolean
- `npm run verify:integrity` exit 0 at every commit
- `verify.mjs --staged` 0 violations across all 4 commits
- `get_advisors(security)` — no new HIGH/ERROR after any migration

**Architect amendment:** `ARCHITECT_DECISION_001_SPEC3_AMENDMENT.md` (Cowork-Architect, 2026-05-17) resolved Q1 (ceo+manager grants) / Q2 (both tenants seeded) / Q3 (accepted slug names) / Q4 (Hebrew display strings). Follow-up: TECH_DEBT `#M1_LENS_PERMISSIONS_TEMPLATE_AUTO_REPLICATION` tracks the eventual permissions_template + auto-replication trigger refactor before tenant 3 onboarding.

---

### SPEC 1 — M1_LENS_PALETTE_RETIRE_UNIFIED — 2026-05-17 (🟡 CLOSED with Tier C deferred)

**Scope:** Retire `M1_INVENTORY_UNIFIED_SCREEN §1.5 R-1..R-13` visual-palette rules + rewrite `css/lens-tabs.css` to mockup palette per ratification `D-M1-02..D-M1-14`.

**Commits:**
- `cbe3a8e` chore(spec): author M1_LENS_PALETTE_RETIRE_UNIFIED SPEC
- `eddc8a1` refactor(css): retire unified-screen R-1..R-13 — rewrite lens-tabs.css to mockup palette
- _(this commit)_ chore(spec): close M1_LENS_PALETTE_RETIRE_UNIFIED with retrospective

**Files changed:**
- `css/lens-tabs.css` (368 → 387 lines, +19)
- `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/SPEC.md` (DEPRECATED note inserted at §1.5)
- New SPEC folder artifacts: `SPEC.md`, `EXECUTION_REPORT.md`, `FOREMAN_REVIEW.md`
- New Brief: `architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md`

**Palette swaps (navy `#1e3a8a` → gold `#c9a555`):**
- `.lens-tab-section .chip:hover` + `.chip.active`
- `.lens-tab-section .btn-primary` + `:hover` (gold-dark `#b8954a`)
- `#lensNav button.active` + `:hover`
- `#contactNav button.active` + `#accessoryNav button.active`

**New tokens (mockup-required, previously missing):**
- `.lens-tab-section .chip-overdue { #fee2e2 / #991b1b }` — red for overdue POs
- `.lens-tab-section .stat-card.overdue { #dc2626 border }` — red border for overdue stat-card

**Unchanged (mockup-aligned in their current form, intentional):**
- `.chip-sent` navy text — mockup state indicator for sent POs
- `.chip-received` green text — mockup state indicator
- `.stat-card.active` navy border — mockup selected-card indicator
- Data-table headers light slate — mockup data-tables use light slate

**Next:** SPEC 2 (`M1_5_SHARED_COMPONENTS_PHASE_0`) — 8 shared components in Module 1.5.

---

## M1_5_CAT_SIDEBAR_COMPONENT (consumer-side) — 2026-05-17 morning (🟢 CLOSED — Full Auto Pipeline, ~1.5h)

**Cross-module SPEC owned by Module 1.5.** Module 1 is the consumer-side refactor (inventory.html + css/inventory-shell.css). See `modules/Module 1.5 - Shared Components/docs/specs/M1_5_CAT_SIDEBAR_COMPONENT/` for full SPEC + retrospective.

**M1 impact (2 files modified, 0 added, 0 deleted):**
- `inventory.html` (1200 → 1200 lines net): inline `<aside id="inv-sidebar">` REMOVED (37 lines); replaced by `<div id="cat-sidebar-mount">` + `<script type="module">import { initCatSidebar }...</script>`. Body content wrapped in `.cat-sidebar-host > (.main-content, #cat-sidebar-mount)` grid container. `body class="has-inv-sidebar"` dropped (DG-3.A). `<link href="shared/css/cat-sidebar.css">` added in head.
- `css/inventory-shell.css` (248 → 140 lines, -108): sidebar visual rules + brittle overlap selector list EXTRACTED to `shared/css/cat-sidebar.css`. Kept cross-cutting non-sidebar rules (.supplier-cat-badge, .ul-filter-bar, lens-tab-section).

**Daniel's reported overlap bug (contactNav + accessoryNav underlapping sidebar) RESOLVED STRUCTURALLY** by the grid rule in cat-sidebar.css — applies to all current + future nav strips uniformly.

---

## M1_CONTACT_LENSES_ACCESSORIES — 2026-05-16 evening (🟢 CLOSED — Full Auto Night Pipeline, 11 commits + 1 close + 1 fix loop, ~4.5h wall-clock)

Activated the 2 "בקרוב" sidebar categories (contact lenses + accessories). End state: 4 functional product categories (frames + lens + contact lens + accessory), unified visual design, demo seeded with 95 sample variants. ZERO Prizma writes (verified 3 times).

**11 commits on develop + this close (`c3b1832..71eb0d3` + Foreman close):**

- `c3b1832` chore(spec): seal SPEC.md — 590 lines, 50 measurable §3 criteria, 5 decision gates DG-1..DG-5, 9 Brief-vs-DB findings F-DB-1..F-DB-9, 11 destructive ops declared
- `84fa733` feat(m1): contact-lens schema applied (C-A1) — MCP migration: 1 ENUM + 3 tables + 6 RLS policies + 1 RPC + 4 indexes
- `a90eb98` feat(m1): cross-cutting ALTERs for product_type + axis + CHECK expansion (C-A2) — 8 ALTERs on lens_design/supplier_catalog_offering/pricing_overlay/purchase_*_line/change_approval_log
- `a82afcc` feat(m1): accessory schema applied (C-B1) — 3 tables + 6 RLS policies + 1 RPC + 4 indexes (total Part A+B = 8 indexes, matches S14)
- `8c70a92` feat(m1): activate sidebar entries + nav strips + section shells (C-C1+C-C2 bundled) — inventory-shell.js extended; inventory.html +44 lines (2 nav strips + 12 section shells + 2 script tags)
- `4b2c7c3` feat(m1): contact-lens + accessory UI module layer + permission seed (C-C3+C-C4+C-C5 bundled) — 26 new files (2 loaders + 12 partials + 12 module JS) + CSS aliases + 24 perms + 60 role grants
- `b09f5b2` feat(m1): demo sample catalog seeded — 95 variants + 80 stock + 6 POs + FK drop corrective (C-D1+CORRECTIVE+C-D2+C-D3 bundled)
- `0ce95bc` chore(spec): close executor scope — EXECUTION_REPORT.md (~450 lines) + FINDINGS.md (6 findings)
- `f0642d9` chore(spec): Reviewer REVIEW.md 🟢 PASS — 7 fresh-angle spot-checks + 3 INFO findings
- `decec03` chore(spec): Localhost-Tester TEST_REPORT 🟡 YELLOW — Tier A 35/35 PASS + Tier B caught T-FAIL-1
- `71eb0d3` fix(m1): activate sidebar entries (C-FIX-1, Stage 8b fix loop) — 4-line semantic patch resolves T-FAIL-1; smoke 7/7 PASS post-fix
- _(this commit)_ chore(spec): Foreman FOREMAN_REVIEW + master-doc updates + Hebrew morning summary

**Pipeline stats:**

- 11 Pipeline commits + 1 close = 12 total; 0 merges; 0 amends; 0 force-pushes (Foreman FA-1 verified)
- 0 escalations to Daniel; 4 in-flight executor decisions D-1..D-4 all justified
- 0 Prizma writes (verified 3× across 17 §0.E baseline tables, all match=true)
- 11 SPEC §12.1 Execution Marker lines (one per destructive commit) per Iron Rule 32 gate workaround
- 6 new tables + 1 ENUM + 2 SECDEF RPCs + 8 new indexes + 9 cross-cutting ALTERs + 2 corrective FK drops
- 26 new files (all ≤350 cap); 1 CSS extension; 12 new permission keys × 2 tenants = 24 perms + 60 role grants
- Demo: 95 sample variants (30 lens + 40 CL + 25 accessory) + 80 stock + 6 POs

---

## M1_INVENTORY_UNIFIED_SCREEN — 2026-05-16 afternoon (🟢 CLOSED — Full Auto Pipeline, 9 commits, ~3.5h wall-clock)

Structural consolidation: 8 inventory-related root HTMLs → 1 (inventory.html only). Sidebar moved from visual LEFT to physical RIGHT (RTL-correct). 7 lens screens migrated to lazy-loaded body partials with frames-pattern visual unification. Same DB, same RPCs, same business logic, same permissions.

**5 executor commits + retro + Reviewer + Tester + Foreman close (9 commits, `be5fafc..HEAD`):**

- `be5fafc` chore(spec): seal SPEC.md — 332 lines, §0.A 12-probe pre-flight + §0.B 5 decision gates + §0.C 9 Brief-vs-DB findings + §3 14 measurable criteria
- `46d541b` fix(m1): sidebar position right — RTL logical-property correction (`css/inventory-shell.css` inset-inline-end → inset-inline-start, mirror on margin + border + mobile fallback)
- `ddb926e` feat(m1): lens tab shell + URL param routing in inventory.html. New `modules/inventory/inventory-shell-lens.js` (224 lines lens loader registry). New `css/lens-tabs.css` (324 lines frames-aligned tokens). `inventory.html` +28 lines (lensNav strip + 7 empty lens section shells).
- `a5367ff` fix(m1): lens loader — clear sibling sections + bootstrap re-dispatch on re-activation. Prevents cross-lens DOM-ID collisions.
- `9fce6de` feat(m1): migrate 7 lens screens to partials with frames pattern. 7 new partials at `modules/lens-<screen>/lens-<screen>-partial.html` with semantic markup only. §1.5 Visual Reconciliation Audit 13/14 applied + R-10 INTENT-vs-LITERAL. Tiny bootstrap export added to `modules/lens-catalog-admin/lens-catalog-admin.js`.
- `64a69e7` chore(m1): retire 7 lens HTML shells + lens-nav-strip + update deep-links. `git rm` 7 lens-*.html + `shared/js/lens-nav-strip.js`. 2 deep-link URL updates. SPEC.md §13 Execution Marker for Iron Rule 32 gate.
- `f249c87` chore(spec): close executor scope — EXECUTION_REPORT.md + FINDINGS.md (8 findings: 1 MEDIUM gate gap + 2 LOW + 5 INFO).
- `116f146` chore(spec): Reviewer REVIEW.md 🟢 PASS — 7 fresh-angle spot-checks + 3 new findings.
- `ee6594d` chore(spec): Localhost-Tester TEST_REPORT — 🟢 GREEN. Smoke 7/7 PASS + Chrome MCP 4 screenshots + per-tab probe across all 7 lens tabs.
- _(this commit)_ chore(spec): Foreman FOREMAN_REVIEW.md + master-doc updates + Hebrew summary

**Pipeline stats:**

- 9 commits, all single-concern, all on develop. Tag `pre-inventory-unified-screen-2026-05-16` at parent `8017fc9`.
- 0 escalations. 6 in-flight executor decisions documented (5 INTENT-vs-LITERAL + 1 commit-slicing).
- Iron Rule 31 + 32 gates: exit 0 every commit.
- Smoke 7/7 PASS pre + post. Chrome MCP visual 4/4 saved to SPEC `screenshots/`.
- 0 row delta on Prizma — zero DB writes Pipeline-wide.
- **14/14 SPEC §3 criteria PASS** (first Full-Auto Pipeline of the day at 100%).

**Schema/code delta:**

- 0 new tables / 0 new RPCs / 0 new views / 0 new permission keys / 0 new T-constants / 0 new FIELD_MAP entries.
- 9 new files: `inventory-shell-lens.js` (224), `css/lens-tabs.css` (324), 7 partials (415 total).
- 7 modified files: `inventory.html` (1128→1156), `css/inventory-shell.css` (224→237), `inventory-shell.js` (200→228), `lens-catalog-admin.js` (185→195), `lens-inventory-modals.js` (+3), `lens-goods-receipt-close.js` (+5), 1 SPEC.md addition.
- 8 deleted files: 7 lens-*.html (1104 lines total) + `shared/js/lens-nav-strip.js` (136 lines).
- Root HTML count: 24 → 17 (-7, -29%).

**Findings (11 total):** F-1 MEDIUM → NEW SPEC (IRON_RULE_32_GATE_AUTH_FALLBACK in M1.5); F-2/F-3/F-7/R-FINDING-1 LOW → TECH_DEBT entries (4 new); F-4/F-5/F-6/F-8/R-FINDING-2/R-FINDING-3 INFO → deferred or docs.

**Author/Executor improvement proposals:** P-AUTHOR-1 (corollary-edit anticipation), P-AUTHOR-2 (DOM-collision pre-analysis), P-EXEC-1 (NAME REGISTRY pre-flight), P-EXEC-2 (Iron Rule 32 gate workaround docs) — all 1/3, accumulating in skill files.

---

## M1_INVENTORY_REDESIGN — 2026-05-16 (🟢 CLOSED — Full Auto Pipeline, 9 commits, ~3.5h wall-clock)

UI/UX restructure of the inventory module from 11-tab single-screen to sidebar-driven hub. New unified-log view + UI. Supplier badges from junction tables. Home-card "מחלקת עדשות" removed (lens reachable only via inventory sidebar now). M1 Lens department unchanged.

**6 executor commits + 1 close + Reviewer + Tester (9 commits, `ea2dcd3..20d9225`):**

- `ea2dcd3` chore(spec): seal SPEC.md — 640 lines, §0.A 12-probe pre-flight + §0.B 3 decision gates + §0.C 9 Brief-vs-DB findings + §3 30 measurable success criteria
- `30236fa` feat(m1): inventory sidebar shell — 240px RTL right-rail with 4 product categories + 4 cross-category items. New `css/inventory-shell.css` (224 lines) + `modules/inventory/inventory-shell.js` (200 lines). 4 nav-buttons removed (suppliers, systemlog, access-sync, incoming-invoices); 7 frames buttons remain.
- `d48e579` feat(m1): retarget lens-nav-strip home link `index.html` → `inventory.html` — DG-2 Branch B
- `1e0b4e1` feat(m1): suppliers — category badges + 4 filter pills. `modules/brands/suppliers.js` 171→266 lines. Junction tables `supplier_brand_distribution` + `supplier_catalog_offering` (NOT `brands.supplier_id` — Brief was wrong per SPEC §0.C F-DB-1).
- `e3ebe71` feat(db,m1): unified log — view + UI (combined C5+C6 per TD-2 precedent). View `v_inventory_unified_log` (security_invoker=on, GRANT authenticated, REVOKE anon+PUBLIC after supplementary migration). New `modules/inventory/unified-log.js` (214 lines) + new section in `inventory.html`. 5 filters + free-text search + paginated table.
- `b5c7533` feat(m1): remove lens home-card — `index.html` 390→389 lines. Lens screens reachable only via inventory sidebar.
- `0ac0bba` chore(spec): close executor scope — EXECUTION_REPORT.md + FINDINGS.md + SESSION_CONTEXT.md update
- `63e0bbd` chore(spec): Reviewer REVIEW.md 🟢 PASS — 7/7 fresh-angle spot-checks + 1 new LOW finding R-FINDING-1
- `20d9225` chore(spec): Localhost-Tester TEST_REPORT — GREEN. Smoke 7/7 PASS + Chrome MCP 4/4 visual screenshots
- _(this commit)_ chore(spec): Foreman FOREMAN_REVIEW.md + master-doc updates + Hebrew morning summary

**Pipeline stats:**

- 9 commits, all single-concern, all on develop. Tag `pre-inventory-redesign-2026-05-16` at parent `e58b45e`.
- 0 escalations. 2 in-flight executor deviations (D-1 row counts + D-2 missing REVOKE) handled per INTENT-vs-LITERAL autonomy.
- Iron Rule 31 + 32 gates: exit 0 every commit.
- Smoke 7/7 PASS pre + post. Chrome MCP visual 4/4 saved to `_archive/m1-redesign-2026-05-16/screenshots/`.
- 0 row delta on Prizma across 5 touched tables (inventory_logs, stock_movement, activity_log, sync_log, suppliers).
- 30 SPEC §3 criteria: 27 PASS at Stage 4 + 3 author-defects documented (D2/D3 row counts + B3 card count — all SPEC value-errors with correct underlying behavior).

**Schema/code delta:**

- 1 new view: `v_inventory_unified_log` (security_invoker=on, 4-source UNION, GRANT authenticated only).
- 3 new files: `css/inventory-shell.css` (224), `modules/inventory/inventory-shell.js` (200), `modules/inventory/unified-log.js` (214).
- 4 modified files: `inventory.html` (1046→1128), `index.html` (390→389), `shared/js/lens-nav-strip.js` (135→136), `modules/brands/suppliers.js` (171→266).
- 0 new tables / 0 new RPCs / 0 new permission keys / 0 new T-constants / 0 new FIELD_MAP entries.

**Findings (5 total):** F-1 LOW absorbed via P-AUTHOR-1 (filter-aware arithmetic); F-2 LOW absorbed via P-EXEC-1 (auto-REVOKE — 2nd consecutive firing, counter 2/3); F-3 INFO deferred to next Architect session; F-4 INFO → TECH_DEBT #M1_INV_REDESIGN_ORPHAN_SYSTEMLOG; R-FINDING-1 LOW → TECH_DEBT #M1_INV_REDESIGN_VIEW_REVOKE_BROADENING.

**4 skill improvement proposals queued:** 2 author (P-AUTHOR-1 filter-aware arithmetic + P-AUTHOR-2 deferral hygiene) + 2 executor (P-EXEC-1 auto-REVOKE 2/3 + P-EXEC-2 cross-source UNION view template). Previously-existing P-AUTHOR-1 (UI smoke matrix from M1B_FOUNDATION_PERMISSIONS_HOTFIX) reaches 3/3 → auto-apply triggers next opticup-strategic session.

---

## M1_LENS_PHASE_1B_PROCUREMENT — 2026-05-15 (🟡 CLOSED WITH FOLLOW-UPS — 3 procurement screens + ➕➖ wiring + 11 commits)

Procurement half of Phase 1B — closes Phase 1B alongside the foundation half.

**3 net-new screens (24 net-new files, all ≤217 lines per Iron Rule 12):**
- `lens-purchase-order.html` + `modules/lens-purchase-order/` (6 JS files): main, supplier, shortages (with inline reorder_threshold edit), manual, create (place_purchase_order + mark_po_sent), pdf (window.print + print stylesheet).
- `lens-pos-list.html` + `modules/lens-pos-list/` (4 JS files): main, table, filters, actions (cancel via cancel_purchase_order + mark-sent).
- `lens-goods-receipt.html` + `modules/lens-goods-receipt/` (8 JS files): main, supplier, delivery-note, lines, manual, shipping-box (M9 placeholder), pre-fill (?variant_id deep-link), close (m1_create_receipt_from_box K2 RPC).

**Foundation modification (1 file):** `modules/lens-inventory/lens-inventory-modals.js` 32→195 lines — replaced foundation stub with real ➕➖ wiring. Document-level capture listener on `.qty-btn` records sph/cyl context BEFORE foundation grid's bubble handler dispatches (avoids modifying foundation grid file per SPEC §7).

**Permission seed triplet (a)+(b)+(c):** 6 new keys × 2 tenants = 12 perm rows + 34 role_permission rows. ceo+manager get all 6; team_lead/viewer/worker get view-only (lens.po.view); worker+team_lead also get lens.gr.create (receiving role). Permission OUTCOME smoke matrix: 36/36 PASS (18 positive CEO × 6 keys + 18 negative non-CEO × 6 keys on demo).

**11 commits (`f4a9945` ↔ this):**
- `f4a9945` chore(spec): seal SPEC + BRIEF + ACTIVATION_PROMPT
- `8ccc7b2` feat(m1.permissions): seed 6 keys + 34 role_perms (via execute_sql per SC #9)
- `5d55543` chore(allowlist): root-allowlist.json — 3 new HTML entries
- `c59024a` feat(m1.lens-po): scaffold lens-purchase-order screen + 6 JS files
- `cfb09d1` feat(m1.lens-pos-list): scaffold lens-pos-list screen + 4 JS files
- `b9018e3` feat(m1.lens-gr): scaffold lens-goods-receipt screen + 8 JS files
- `c721f26` feat(m1.lens-inventory): wire ➕➖ — deep-link + PIN-gated adjust
- `80c0fa8` fix(m1.lens-procurement): 5 JS bugs from Phase A smoke (location_id, UUID return, ➖ Phase 2 guard, manual variant filter)
- `c231c60` fix(m1.lens-procurement): fetchAll signature — array-of-tuples
- `ac39ebc` test(m1.procurement): TEST_REPORT — Phase A 11/14 + Phase B 4/4 + Phase C 36/36 — verdict 🟡
- _(this commit)_ chore(spec): close — EXECUTION + FINDINGS + ROLLBACK + SESSION_CONTEXT + CHANGELOG

**Smoke results:** Phase A functional 11/14 + 1 partial + 2 K2-blocked; Phase B UI 4/4 PASS (zero console errors after fetchAll fix); Phase C OUTCOME 36/36 PASS.

**3 HIGH findings (M1B0/M1A foundational gaps, all out of scope per §7):**
- F-1: K2 doesn't update PO state → `M1_K2_RECEIPT_COMPLETION` Phase 2 SPEC queued.
- F-2: K2 cannot accept variant-less manual lines (stock_lot.variant_id NOT NULL) → `M1_RECEIPT_VARIANT_LESS_LINES` Phase 2 SPEC queued.
- F-3: ➖ adjust missing `record_adjustment_lost` RPC + `stock_adjustment` table → `M1_STOCK_ADJUSTMENT_INFRA` Phase 2 SPEC queued.

**Iron Rules:** 17/17 in-scope rules PASS. Iron Rule 32 §Destructive Operations = `None.` Integrity Gate exit 0 across all 11 commits.

**P-AUTHOR-1 counter advances 1/3 → 2/3** (session-cache staleness fired exactly as predicted by foundation hotfix; documented in F-4 INFO).

---

## M1_LENS_PHASE_1B_FOUNDATION — 2026-05-15 (🟢 closing — 3 read screens + 3 RPCs + 9/9 smoke PASS)

Foundation half of Phase 1B — 3 read-heavy lens screens (`lens-inventory.html` + 5 JS files, `lens-active-designs.html` + 3 JS files, `lens-pricing.html` + 5 JS files = 13 JS files all ≤163 lines per Iron Rule 12) + 3 metadata RPCs (`toggle_active_offering` UPSERT on `tenant_active_offerings`, `upsert_pricing_overlay` SELECT-then-UPDATE-or-INSERT, `bulk_apply_pricing_overlay` atomic `INSERT...SELECT FROM unnest`) + 3 permission keys × 2 tenants seeded. All 9 functional smoke cases on demo PASS. One mid-pipeline pivot (Block 2 v1 ON CONFLICT ON CONSTRAINT failed because the partial unique index isn't a constraint — v2 CREATE OR REPLACE with `ON CONFLICT (cols) WHERE pred` index-inference, SPEC §0 D11 pre-authorized fallback). Iron Rule 32 §7 = `None.` throughout 10 commits. Zero Prizma data written. Live-browser smoke (Smoke #9) deferred to Daniel manual QA per Brief plan.

### Commits (M1 Lens Phase 1B Foundation)
- `dfa5e81` chore(spec): open M1_LENS_PHASE_1B_FOUNDATION — SPEC + MIGRATION skeleton + ROLLBACK
- `112435f` feat(m1): seed 3 lens.* permission keys × 2 tenants — Block 1
- `4a939c7` feat(m1): create toggle_active_offering RPC — Block 2 (v1)
- _(v2 fix applied)_ Block 2 v2 — CREATE OR REPLACE with index-inference ON CONFLICT
- `0d6a032` feat(m1): create upsert_pricing_overlay RPC — Block 3
- `af92916` feat(m1): create bulk_apply_pricing_overlay RPC — Block 4
- _(commit)_ feat(lens-inventory): screen + JS folder + root-allowlist entry
- _(commit)_ feat(lens-active-designs): screen + JS folder
- _(commit)_ feat(lens-pricing): screen + JS folder
- _(commit)_ test(m1): functional smoke 9/9 PASS on demo + Block 2 v2 fix
- (this commit) chore(spec): close M1_LENS_PHASE_1B_FOUNDATION — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + FILE_STRUCTURE + SESSION_CONTEXT + CHANGELOG

---

## M1B0_PURCHASE_ORDER_SCHEMA — 2026-05-15 (🟢 closing — 3 tables + 5 RPCs + K2 wiring, 6/6 smoke PASS)

Phase 1B prerequisite — schema-only micro-SPEC. Ships the 3 missing schema objects from Phase 1A (`purchase_order`, `purchase_order_line`, `supplier_debt`) + 5 supporting RPCs + 2 FK back-pointer additions + K2 extension wiring debt creation at receipt close (D-M1-11). All 6 functional smoke cases on demo PASS (place_purchase_order, mark_po_sent, K2 + debt + idempotency, cancel-flow 3 sub-cases, anon-reject 5 RPCs, cross-tenant guard). Iron Rule 32 §7 = `None.` throughout 8 commits. Zero Prizma data written. Legacy `purchase_orders` plural untouched.

### Commits (M1B0 Purchase Order Schema)
- `0c23a15` chore(spec): open M1B0_PURCHASE_ORDER_SCHEMA — SPEC + ROLLBACK skeleton
- `df338c4` feat(m1,schema): create purchase_order + purchase_order_line + supplier_debt tables
- `621b807` feat(m1,schema): add FK back-pointers stock_lot + purchase_receipt → purchase_order
- `441c1f7` feat(m1,rpc): create 4 PO RPCs (next_purchase_order_number, place, mark_sent, cancel)
- `362a330` feat(m1,rpc): create m1_create_supplier_debt_from_receipt + wire K2 (D-M1-11)
- `46ff2d2` feat(shared): T-constants + FIELD_MAP for 3 new M1B0 tables
- `bb39599` test(m1): demo functional smoke — 6/6 PASS (M1B0 schema + RPCs + K2 debt wiring)
- (this commit) chore(spec): close M1B0_PURCHASE_ORDER_SCHEMA — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + SESSION_CONTEXT + CHANGELOG

---

## M1A_OPERATIONS_RPCS_FIX — 2026-05-15 (🟢 closing — 10 fixes, 6/6 smoke PASS)

Phase 1A operations-layer bug-fix Pipeline. 8 originally-enumerated fixes (record_stock_movement double-add + ON CONFLICT, REVOKE/GRANT on 10 SECDEF fns, next_lens_variant_display_id JWT guard, v_suppliers_for_m9 anon ACL, K3 queue idempotency, lens-catalog-import config.toml + fail-closed gate) + 2 mid-pipeline Foreman amendments for pre-existing orchestrator runtime defects (record_transfer 17-arg, record_adjustment_found 20-arg-misaligned). All 6 functional smoke cases on demo PASS. Iron Rule 32 §7 = `None.` throughout.

### Commits (M1A Operations RPCs Fix)
- `b0d44c1` chore(spec): open M1A_OPERATIONS_RPCS_FIX — SPEC + MIGRATION + ROLLBACK
- `54ede72` fix(m1,rpc): record_stock_movement — skip lot update on creation movements + ON CONFLICT WHERE predicate
- `279b12b` fix(m1,sec): REVOKE EXECUTE on 10 Phase 1A SECDEF functions + selective re-GRANT to authenticated
- `0024dd3` fix(m1,sec): next_lens_variant_display_id — JWT-not-null guard inside function body
- `18697f4` fix(m1,sec): v_suppliers_for_m9 — REVOKE default anon/PUBLIC grants (Iron Rule 13)
- `8fe2a1a` fix(m1,m9): pending_lens_advancement_queue idempotency — UNIQUE + K3 trigger ON CONFLICT DO NOTHING
- `474cc6b` fix(ef,sec): lens-catalog-import — invert gate to fail-closed
- `7e52bb8` chore(supabase): config.toml — add [functions.lens-catalog-import] verify_jwt=true block
- `826fc12` fix(m1,rpc): record_transfer — pass 19 positional args (Amendment #1)
- `60d4cd2` fix(m1,rpc): record_adjustment_found — correct 20-arg overflow + position-11 self-ref (Amendment #2)
- `cc95157` test(m1): demo functional smoke — 6/6 PASS
- _(this commit)_ chore(spec): close M1A_OPERATIONS_RPCS_FIX with EXECUTION_REPORT + FINDINGS + GLOBAL_MAP one-line note + SESSION_CONTEXT update

### DB delta
- 7 migrations via MCP (no `supabase/migrations/*.sql` per TD-2 + prior precedent):
  `m1a_record_stock_movement_fix`, `m1a_revoke_execute_phase1a_secdef`,
  `m1a_next_lens_variant_display_id_jwt_guard`, `m1a_v_suppliers_for_m9_revoke_anon`,
  `m1a_k3_queue_idempotency`, `m1a_record_transfer_arg_mismatch_fix`,
  `m1a_record_adjustment_found_arg_mismatch_fix`.
- 1 new UNIQUE INDEX: `pending_lens_advancement_queue_stock_movement_unique`.
- 4 functions with body changes (CREATE OR REPLACE): `record_stock_movement`, `next_lens_variant_display_id`, `m9_lens_received_for_sale_order_trg_fn`, `record_transfer`, `record_adjustment_found`.
- 10 SECDEF functions REVOKEd EXECUTE FROM PUBLIC/anon, 8 re-GRANTed to authenticated.
- 1 view (`v_suppliers_for_m9`) REVOKEd anon/PUBLIC ACL, GRANT SELECT to authenticated.
- 1 EF (`lens-catalog-import`) redeployed v1→v2 with fail-closed gate.
- 1 config block in `supabase/config.toml`.

### Findings disposed
- F-1, F-2 (CRITICAL) — RESOLVED IN-PIPELINE via Amendments.
- F-3, F-8 — Log to TECH_DEBT.md as `M1A-DEBT-04 — Demo lens-catalog seed fixtures`.
- F-4, F-6, F-7 — Dismissed.
- F-5 — Executor-skill improvement proposal (EXECUTION_REPORT §9).

---

## M1A_CURRENCIES_GLOBAL_HOTFIX — 2026-05-14 (✅ M1A-DEBT-01 closed)

Phase 1A corrective hotfix — `public.currencies` converted from per-tenant to GLOBAL ISO-4217 reference table per Iron Rule 14 documented exception. New RLS pattern: read-anywhere + writes gated on `is_platform_super_admin()`. Seeded ILS / USD / EUR. Unblocks tenant-2 onboarding.

### Commits (M1A Currencies Hotfix)
- `bb341fb` docs(m1): seal currencies-global hotfix brief
- `43a35ee` docs(m1,spec): author M1A_CURRENCIES_GLOBAL_HOTFIX SPEC (closes M1A-DEBT-01 planning)
- `eb1a283` feat(m1,db): currencies global reference table (M1A-DEBT-01)
- `ed3196e` docs(m1,schema): align canonical docs with currencies-global hotfix
- _(this commit)_ docs(m1): close M1A-DEBT-01 — MASTER_ROADMAP + D-M1-16 + module artifacts
- _(later)_ chore(spec): close M1A_CURRENCIES_GLOBAL_HOTFIX with retrospective

### DB delta
- `public.currencies` DROP COLUMN: id, tenant_id, is_default + 3 constraints + 2 policies.
- `public.currencies` ADD COLUMN: decimal_digits INT NOT NULL DEFAULT 2.
- `public.currencies` ADD PRIMARY KEY (code).
- `public.currencies` 5 new RLS policies: read_anywhere, write_platform_only, update_platform_only, delete_platform_only, service_bypass.
- Seed: 3 rows (ILS, USD, EUR).

### Migration name
- Supabase: `m1a_currencies_global_hotfix` (applied via MCP only — not in `supabase/migrations/*.sql` per SPEC §7 + TD-2 drift policy).

---

## M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN — 2026-05-14 (✅)

**Phase 1A** of M1 Lens Expansion — schema + Platform Catalog Admin screen.
17 new tables + 9 atomic RPCs + K3 trigger + K5 view + Platform Catalog Admin
screen + lens-catalog-import EF + 17 T-constants + FIELD_MAP entries.

### Commits (Phase 1A)
- `285b5d6` docs(spec): seal M1 Lens Inventory Phase 1A SPEC + 1B stub + ROADMAP extension
- `09d993c` feat(m1,db): create lens_brand + lens_design + lens_variant + supplier_brand_distribution (1/5)
- `255f965` feat(m1,db): create supplier_catalog_offering + pricing_overlay + vat_rates (2/5)
- `d998c6d` feat(m1,db): create tenant_active_offerings + tenant_lens_stock + tenant_location (3/5)
- `7f6018b` feat(m1,db): create FIFO + receipt + governance tables (4/5)
- `ee132c6` feat(m1,db): deploy 9 atomic RPCs + K3 trigger + K5 v_suppliers_for_m9 View (5/5)
- `4a7c6ea` feat(m1,ef): lens-catalog-import EF — JSON catalog rows → tables
- `bbae0ff` feat(m1): Platform Catalog Admin screen (Optic Up team only)
- `48b150c` chore(m1,shared): add 17 T-constants + FIELD_MAP entries
- `0cf6123` docs(global): merge M1 Lens Phase 1A schema + functions + screen + EF into GLOBAL_*
- `<NEXT>` docs(m1): module-level docs reflect Phase 1A close
- `<NEXT>` chore(spec): close M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN with EXECUTION_REPORT + FINDINGS

### Highlights
- Brief sealed in `b4a3745`; Architect's 2-sub-phase split honored
- All 4 Brief §7 open questions resolved by Module Strategist
- 8 SPEC-precision adaptations logged in FINDINGS — `currencies` empty + per-tenant,
  `tenants.default_currency` already exists, hook regex fixes for owner_tenant_id +
  schema prefix + global singleton exemption
- Smoke test on demo tenant: RLS cross-tenant isolation verified
- Phase 1B (6 customer-facing screens) deferred to sibling SPEC

---

## RECEIPT_FORM_FIXES_FROM_MANAGER (HOTFIX bundle) — 2026-05-06

3-fix bundle to the goods-receipt form addressing items 13/14/15 from
the Prizma branch manager. Ships the prevention for the 2026-05-05
receipt 8119464877 mis-pricing (₪3,710.64 over invoice).

### Commits
- `c0391ef` feat(receipts): item 13 — lock receipt-items column sort by default
- `02a5884` feat(receipts): item 14 — add line-total column + invoice-total compare
- `0d27c81` feat(receipts): item 15 — preserve receipt items entry order via sort_order column
- (this commit) chore(spec): close RECEIPT_FORM_FIXES_FROM_MANAGER with retrospective

### Outcome
- **DB schema:** new column `goods_receipt_items.sort_order INT` (nullable,
  back-compat) + `idx_rcpt_items_sort` on `(receipt_id, sort_order)`.
  Migration 068 applied via Supabase MCP. RLS canonical 2-policy pair
  preserved.
- **Front-end:** new file `modules/goods-receipts/receipt-form-validate.js`
  (120 lines) — sort-lock state + toggle + UI init + invoice-compare pure
  function + delta exporter + listener. New 🔒 toggle button, new
  `<th>סה"כ לשורה</th>` column, new `<input id="rcpt-invoice-total">`
  with ✅/❌ status, mismatch confirm-gate before file-attach hard-block.
- **Order preservation:** `items.map((i, idx) => ({…, sort_order: idx+1}))`
  on both INSERT sites; `.order('sort_order', ASC nullsFirst:false)
  .order('id', ASC)` on confirmReceiptCore, openExistingReceipt,
  exportReceiptBarcodes.

### Mid-execution Foreman escalations
1. **SPEC Amendment 1** — `receipt-form-items.js` was 357 lines pre-edit
   (over Iron Rule 12 hard max 350). Foreman issued split: sort-lock +
   invoice-compare into new `receipt-form-validate.js`. Final files all
   under 350.
2. **Hook false-positive blocker (Option 1)** — 50 pre-existing hook
   violations blocked commit 3 (42 quoted-policy-name false positives
   + 2 rule-21 over-match + others). Foreman authorized rename of
   `const rcptNumber` in receipt-excel.js to `rcptNumForExcel` + deferral
   of `db-schema.sql` doc-sync. 2 NEW_SPEC findings logged for hook
   regex fixes (FINDING-A HIGH, FINDING-B MEDIUM).

### Out of scope
- Data correction for receipt 8119464877 (Daniel handles manually).
- db-schema.sql / GLOBAL_SCHEMA.sql doc-sync (FINDING-C, auto-resolves
  when FINDING-A's hook fix lands).

### QA
- 12 of 20 §3 success criteria verified automatically. 8 UI criteria
  scheduled for live Demo walk-through post-deployment.

SPEC folder:
`modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/`
contains SPEC.md, ACTIVATION_PROMPT.md, EXECUTION_REPORT.md, FINDINGS.md.

---

## Permissions Phase 2 Fix (HOTFIX bundle) — 2026-04-27 (night)

8-commit bundle: tenant cleanup + key consolidation + isAdmin decoupling
+ AI bypass fix + DB-driven role badges + matrix all/none buttons.

### Commits
- `003eb9e` chore(perms): pre-flight snapshot
- `ce89ff4` fix(perms): delete 3 unused test-store tenants and cascade (728 rows / 13 tables)
- `439ae5f` refactor(perms): rename long-form keys to canonical short form (28 perm + 80 role_perm rows + 6 inventory.html attrs)
- `f9c277d` fix(inventory): decouple isAdmin global from settings.edit — use granular hasPermission
- `3ebd7dc` fix(debt): replace direct role check in ai-config with hasPermission('ai.config')
- `7d37e62` feat(perms-ui): load ROLE_BADGES from DB + add row select-all/deny-all buttons
- `d8ec90e` chore(cleanup): delete shared/tests/permission-test.html (stale)
- (this commit) docs(m1): close PERMISSIONS_PHASE2_FIX with retrospective

### Outcome
Manager on Demo + Prizma can now use bulk inventory ops as designed.
DB has 2 surviving tenants, 55 distinct canonical perm keys, 10 roles
(ceo/manager/team_lead/worker/viewer × 2 tenants), 0 long-form keys, 0
orphan role_permissions. CSS UX preserved via auth-service.js body-class
toggle. Storefront repo: zero commits.

---

## Studio Brands Visibility Rework (HOTFIX) — 2026-04-27 (evening)

### Files modified
- `storefront-studio.html` — removed dead "🏷️ מותגים" nav link.
- `modules/storefront/studio-brands.js` — replaced 3-control visibility block
  (`sbe-display-mode`, `sbe-exclude-website`, `sbe-page-visibility`) with a
  single 4-mode radio-group (`brand-visibility-mode` = full | hide-card |
  hide-customer-keep-seo | hide-all). Added helpers
  `deriveBrandVisibilityMode`, `applyBrandVisibilityMode`,
  `bulkApplyBrandModeToProducts` (confirmation-gated bulk update of
  `inventory.website_sync` per brand — Iron Rules 7+22). Added CSS-only
  AI-thinking spinner.

### DB UPDATE (audit-trail commit, no repo file change)
- `brands` row McQueen `06b269ce-...`: `exclude_website true→false`,
  `brand_page_enabled false→true`. `display_mode` unchanged. 9 inventory
  rows untouched. LOOL + Tom Ford untouched.

### Commits
- `e31daa4` fix(studio): remove dead Brands link from Studio top-nav
- `ffef713` feat(studio-brands): replace 3-control visibility UI with single 4-mode radio + bulk-mode action + AI spinner
- `52ca2b7` fix(brands): restore Alexander McQueen visibility (exclude_website=false, page_enabled=true)
- (this commit) docs(m1): record studio brands visibility rework

### Outcome
McQueen back on storefront (visible in supersale-stock store_all). New brand
editor UI presents one decision instead of three overlapping ones. No customer
data lost or migrated incorrectly. Storefront repo: zero commits.

---

## Storefront Sync Hierarchy Fix (HOTFIX) — 2026-04-27

### View rewrites (apply_migration via Supabase MCP)
- `v_storefront_products` — visibility now driven by `inventory.website_sync`
  per Daniel's 4-level hierarchy. Previous brand-level fallback removed.
- `v_storefront_brands` — `display_mode` column derived from per-product mix
  (powers supersale-stock API section split).

### Commits
- `26c047f` — `feat(views): drive storefront visibility from inventory.website_sync, not brands.display_mode`
- (this commit) — `docs(m1): record storefront sync hierarchy fix in SESSION_CONTEXT + CHANGELOG`
- (next) — `chore(spec): close STOREFRONT_SYNC_HIERARCHY_FIX with retrospective`

### SPEC folder
`modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/`

### Outcome
- 313 'display' products now correctly resolve to 'catalog' on storefront (was wrong).
- Supersale section 2 (catalog) restored: 0 brands → 11 brands, 147 products.
- Supersale section 1 (store_all): 42 brands, 487 in-stock products.
- HARD RULE 2026-04-27 (no storefront prices) verified intact via Chrome MCP rendered-DOM check.
- Storefront repo untouched (price-guard `d1f67c4` sacred).

---

## Inventory Fixes + Subrow Feature — 2026-04-19

### Stock Count Fixes (9b44831, 7781de7)
- Case-insensitive barcode matching in stock-count-scan.js
- Brand selection required before creating a count in stock-count-filters.js
- Excel export: diffs-only option + sort picker — extracted to stock-count-export.js (new file)

### Inventory Entry Improvements (9b44831)
- Field reorder: color before size, temple_length to first card-row
- Auto-calculated final price field (readonly)
- Auto-fill from previous row

### Inventory Export Fix (9b44831)
- Final price column added to barcode Excel export

### History Column Removal (9b43976, 6c11d3c)
- Removed duplicate history column (already in ⋯ menu)
- Extracted action menu + event delegation to inventory-actions.js (new file)

### Shared Table Resize Fix (3ee7a56, dfd36c9)
- Explicit width calculation for all tables (overrides CSS width:100%)
- Hidden tab guard + ResizeObserver recalc on tab switch

### Subrow Feature (8399d46)
- Bridge + temple_length moved to hidden subrow (toggled via "עוד" in ⋯ menu)
- Inline editing in subrow (admin only)

### New Files
- `modules/inventory/inventory-actions.js` (107 lines) — action menu, event delegation, subrow toggle + edit
- `modules/stock-count/stock-count-export.js` (99 lines) — Excel export with diffs-only + sort picker

---

## Debt Module Upgrades — 2026-03-28

### A-prep: Migration + Doc Type Fix (8fb0c12)
- Fix doc type pass-through in createDocumentFromReceipt — uses receipt type not supplier default
- Remove plain "חשבונית" from receipt doc type dropdown
- Migration 058: document_numbers TEXT[], document_amounts JSONB on supplier_documents

### A1: Supplier Filter Chips (258d029)
- New file: debt-supplier-filters.js — 3 filter groups (type, history, debt)
- loadSuppliersTab enriched with hasReceiptDocs, hasHistory, payments data

### A2: Month Picker + Amount Filters (ce8d33b)
- New file: debt-filter-utils.js — reusable month picker toggle, amount range
- Filters added to main documents tab and supplier detail documents sub-tab

### A3: Payment Flow Fix (b74ab4b)
- openPaymentForDocument pre-fills wizard with specific document
- Multi-select payment from supplier detail with checkboxes + action bar
- Pre-selected docs highlighted blue with ★ in allocation step

### A4+A5: Prepaid Display + Doc Count Expand (845f21f)
- Prepaid column: USED/TOTAL format (green/red)
- Multi-doc expand: count badge + ⋯ toggle → sub-row breakdown

### A6: Full Document Editing (fb86a80)
- changeDocSupplier with PIN + ActivityLog
- Subtotal always editable, status dropdown with valid transitions

### A7: Receipt Header Redesign (eb7681f)
- New file: receipt-doc-numbers.js — dynamic multi-doc inputs
- Field order: supplier → PO → type → count → number → date
- PO availability indicator (green/gray border)

### A-AI-1: Supplier Auto-Detect (d40c23e)
- New file: receipt-ocr-supplier.js — OcrSupplierMatch (alias→exact→fuzzy)
- learnSupplierAlias saves corrections for future matching

### A-AI-2: PO Auto-Match (3edbe00)
- New file: receipt-ocr-po.js — OcrPOMatch (scoring + compareItems)
- Discrepancy highlighting: yellow/orange rows with tooltips

### A-AI-3: Integration Verification (2b0b499)
- Doc type auto-detection, receipt-confirmed learning hooks
- ai_has_po_pattern tracking on suppliers

---

## Flow Review Phase 4 — 2026-03-27

### Bug Fixes
- INV-4: brand_id validation before inventory insert — entry.js, excel-import.js, pending-resolve.js, approve.js (8b31f45, f2e404e)
- IMG-1: Image race condition — delay + retry after Storage upload in inventory-images.js (8b31f45)
- SD-5: receipt-debt.js silent failure — console.error + Toast on all failure paths, non-blocking writeLog (8b31f45, f2e404e)

### PO Notes (PO-1)
- Per-item notes textarea in PO creation (po-items.js), read-only display in PO view (po-view.js) (3cb3804)

### Stock Count Columns (SC-2)
- Color, size, product_type columns in scan session table + approval table (5236014)
- Mobile responsive: hide status + product_type on small screens (5236014)

### Expense Folders (SD-1, SD-2, SD-3, SD-4)
- New table: expense_folders with tenant_id, RLS, CRUD UI (2721dfc)
- New file: debt-expense-folders.js — add/edit/deactivate folders (2721dfc)
- SD-4: changeDocumentType() with PIN verification in debt-doc-actions.js (2721dfc)
- assignToFolder() for non-supplier documents (1fc2550)
- New file: debt-general-invoices.js — filterable general invoices view (1fc2550)
- IN-1: Combined supplier+folder dropdown in incoming-invoices.js (1fc2550)

### Receipt Improvements (RC-1, RC-2, RC-3)
- RC-1: Per-item notes — note column on goods_receipt_items, 💬 button UI (1bf37a9)
- RC-2: Multiple document numbers — TEXT[] array, tag chip UI (1bf37a9)
- RC-3: Editable model/size/color on existing receipt items with writeLog (1bf37a9, d94dcb9)

### Image Modal (IMG-2, IMG-3, IMG-4)
- IMG-3: Model + color + size shown in modal header (9647c2d)
- IMG-2: Previous/Next navigation between items in image modal (9647c2d)
- IMG-4: Camera button in receipt item rows (acdd00f)

### Column Sorting (PO-2, RC-4, INV-5, SC sort)
- New file: shared/js/sort-utils.js — SortUtils.sortArray, toggle, updateHeaders (09786da)
- Sorting on PO items (creation + view), receipt items (DOM reorder), stock count session (09786da)
- Sort indicator CSS: ↕/▲/▼ on th[data-sort-key] (09786da)

### Inventory Improvements (INV-1b, INV-3)
- INV-1b: Bulk edit expanded — product_type, brand, supplier, color, size, status fields (acdd00f)
- INV-3: New file: inventory-resize.js — drag-to-resize columns, sessionStorage, RTL-aware (acdd00f)

---

## Flow Review Phase 3 — 2026-03-24

### Tenant Isolation Hardening
- Added tenant_id to lookup caches, supplier number queries, permissions queries (02a3ccd)
- JWT periodic check every 5 min with tenant claim verification (66c6bb0)
- Hard tenant isolation: URL slug change clears all sessionStorage (66c6bb0)

### File Splits & Trimming
- Split receipt-form.js 559→283+282 (c4e06c7)
- Split receipt-confirm.js 461→274+185 (a95035b)
- Split 4 files: po-view-import, shared, item-history, debt-doc-edit (59a9574)
- Trimmed 11 files under 350 lines — whitespace/comments only (4f1c178)
- Fixed PO supplier dropdown searchable — correct createSearchSelect API (4f1c178)

### Frame Images Feature
- New: inventory-images.js — camera capture (rear), file picker, WEBP conversion (0.82 quality, max 1200px), Storage upload/delete (c9ec727)
- New: inventory-images-bg.js — client-side white background removal via Canvas flood-fill with threshold slider (0e5b2d4)
- ⋯ action menu on inventory table rows replacing inline buttons (c9ec727)
- Migration 051: composite index on inventory_images, Storage bucket documentation (c9ec727)
- T.IMAGES constant added to shared.js (c9ec727)

### Photography Workflow
- Receipt list: 📷 button on confirmed receipts → filter inventory to receipt items (f77d1cd)
- filterByReceipt() switches to inventory tab with blue banner showing filtered count (f77d1cd)
- Post-confirm banner: "📷 הוכנסו X פריטים — רוצה לצלם?" with action buttons (f77d1cd)
- "📷 ללא תמונות" toggle filter in inventory filter bar (f77d1cd)
- Image count badges (📷N) on every inventory row (f77d1cd)

### Quick Improvements
- Added pending_review (לבירור) status for debt documents — migration 052, toolbar toggle button, filter, CSS badge (dc200e2)
- Replaced OCR monkey-patch with clean event dispatch (receipt-confirmed CustomEvent) (dc200e2)

### QA Fixes (22de0b6, 61fb265, 12fbb16)
- Move action menu to first column, escapeHtml on IDs (22de0b6)
- createSignedUrl for private Storage bucket, store paths not URLs (61fb265)
- Phase documentation update (12fbb16)

### remove.bg Integration (a9a162f through cef3bb4)
- New Edge Function: remove-background/index.ts — proxy to remove.bg API (a9a162f)
- remove.bg API key stored as Supabase Edge Function secret (a9a162f)
- Choice dialog: AI (remove.bg) vs Canvas (local), no auto-fallback (51df94f)
- Canvas path retains threshold slider; AI shows before/after comparison (51df94f)
- Auth fix: anon key + apikey headers for Supabase gateway, session_token in body (8427523, 4468124)
- Image delete fix: Modal.confirm uses callbacks not await (50e0bdc)
- Full-size preview overlay with pinch-zoom + download button on images (2f2bb2d)
- Cascade delete: images cleaned from Storage+DB on permanent item removal (50e0bdc)
- Auto-refresh image count badges in table after upload/delete (cef3bb4)
- Removed "remove.bg" branding from UI (cef3bb4)

### Barcode Refactor (a91ab19)
- ONE barcode per product line (brand+model+color+size), not per unit (a91ab19)
- Receipt creates single inventory record with full quantity (a91ab19)
- Excel barcode export repeats same barcode N times for label printing (a91ab19)

### PO Improvements (70b9ace)
- Fix receipt confirm barcode validation: check new items have barcode, not count vs qty (70b9ace)
- Receipt stats show total cost dynamically (70b9ace)
- Not-received items move to bottom of receipt table with opacity (70b9ace)
- PO View: editable sell price + sell discount columns on sent/partial POs (70b9ace)
- PO View: summary row with line count, unit count, grand total (70b9ace)
- PO Creation: brand filter dropdown to focus on one brand (70b9ace)

### Product Type Flow (459ba69, 310f2c1)
- Migration 053: product_type column on goods_receipt_items (459ba69)
- PO creation: product type dropdown (ראייה/שמש) in main items row (459ba69)
- PO View: editable product type column, saved with prices (459ba69)
- Receipt from PO: auto-populates product_type from PO item (459ba69)
- Receipt confirm: reads product_type from item, no more hardcoded eyeglasses (459ba69)
- Inventory table: editable product_type via invEditProductType() (310f2c1)

### Commits
- 02a3ccd, 66c6bb0, c4e06c7, a95035b, 59a9574, 4f1c178, c9ec727, f77d1cd, 0e5b2d4, dc200e2
- 22de0b6, 61fb265, 12fbb16, a9a162f, 9534b17, 2f2bb2d, 51df94f, 50e0bdc, 8427523, 4468124, cef3bb4
- a91ab19, 70b9ace, 459ba69, 310f2c1

---

## Flow Review Phase 2 — 2026-03-24

### DB
- 046: pending_invoice status, missing_price column, goods_receipt_id UNIQUE partial index

### Bug Fixes
- C1: Supplier detail docs not showing (ai-ocr.js monkey-patch dropped opts)
- C2: File gallery delete button added (confirmDialog + DB delete)
- C3: OCR icon refresh (supplier-detail-aware reload)
- PO supplier dropdown searchable (createSearchSelect with hidden input sync)
- PO comparison "back to edit" button
- Prepaid deduction server-side validation
- OCR stub cleanup (_injectOCRScanIcons removed)

### Improvements
- Hard-block confirm without file attachment
- Document always created even with subtotal=0 (missing_price flag)
- Atomic confirm with compensating rollback
- Visual badges on documents (📦 receipt / ✏️ manual / ⚠️ missing price)
- OCR button hidden on receipt-linked documents
- Amount fields readonly on receipt-linked documents
- Cascade settlement info toast

### New Features
- "חשבוניות נכנסות" tab in inventory.html (incoming-invoices.js, 255 lines)
- pending_invoice document status + dashboard banner
- Receipt items displayed on document view
- Entry doc link on inventory item history

### Commits
6230700, c116a4c, 3dd3bf8, 009e284, 43d878c, 16b947e, 39d0fda

---

## Phase 8-QA — Flow Review + Bug Fixes + Infrastructure (2026-03-22)

### OCR + Flow Review
- `0787972` — Phase 8-QA-a: add OCR save diagnostic console.logs
- `584e99b` — Remove OCR debug console.logs — bug confirmed fixed
- `ef1df68` — feat: show goods receipt line items in document view modal
- `a57246e` — feat: add discount column to OCR items + allow zero total amount
- `6be1a16` — chore: bump cache-bust params for ai-ocr, debt-documents, debt-doc-edit

### Bug Fixes (13 bugs from 9-flow review)
- `bf5d629` — Phase 8-QA-e: fix 10 bugs from flow review
  - BUG-13/14: Payment system filtered to payable doc types only
  - BUG-16: due_date auto-calc from supplier payment_terms_days
  - BUG-15: Payment terms editable in supplier detail
  - BUG-12: Total field editable with reverse VAT calculation
  - BUG-7: Shipment settings tab click fixed
  - BUG-8: Weekly report includes opening balances
  - BUG-9/10: OCR buttons larger and more visible

### Tenant Isolation + Access Sync
- `502ce0d` — Critical: hard tenant session isolation on slug change
- `443e0c2` — feat: restrict Access sync to Prizma tenant only

### Multi-File Support
- `4b91c95` — Multi-file support for supplier documents
  - New table: supplier_document_files (migration 040)
  - file-upload.js: pickAndUploadFiles, fetchDocFiles, saveDocFile, renderFileGallery
  - Gallery preview in edit modal + "צרף עוד" button
  - Backward compatible fallback to legacy file_url

### File Splits + Code Organization
- `f326a68` — Split debt-documents.js into debt-doc-new.js (244+196 lines)
- `db53b12` — Fix: restore closeAndRemoveModal removed during split

### Supplier Detail + OCR Scan on Attach
- `f9c924f` — Full document management in supplier detail + OCR scan on file attach
  - renderDocumentsTable accepts opts (targetEl, hideSupplierCol)
  - Supplier card מסמכים sub-tab: all action buttons
  - _editDocAttachMore: choice modal (save only vs save+OCR)

### PO Hotfix
- `3aa8ab8` — Hotfix: restore PO supplier dropdown (native select)
- `4f1779d` — Add cache buster to po-form.js script tag

### Editable Items + OCR Fix
- `fa58ba8` — Fix OCR duplicate key on file attach + editable document items
  - _ocrSave UPDATE path: only financial fields, not identity fields
  - New file: debt-doc-items.js (editable items in edit modal)
  - Auto-calc row totals, add/remove rows, save to ocr_extractions

### New Files
- modules/debt/debt-doc-new.js (196 lines) — new document modal
- modules/debt/debt-doc-items.js (157 lines) — editable items logic
- migrations/040_supplier_document_files.sql — multi-file table + RLS + data migration

---

## Tech Debt + Bug Fixes + Features (2026-03-21)

### Tech Debt
- `85d2463` — Split debt-prepaid.js (429→255+179, new debt-prepaid-detail.js)
- `14050c5` — Split supabase-ops.js (380→201+181, new supabase-alerts-ocr.js)
- `92bfe91` — Show all suppliers toggle + opening balance button + document linking auto-sum
- `c1a1a4a` — Cascading payment settlement (auto-close linked docs when parent paid)

### Bug Fixes
- `ad1cc20` — Fix supplier dropdown (createSearchSelect API) + show-all toggle
- `1b7a3cf` — Fix AI buttons class collision (doc-add-btn → sup-ob-btn)
- `ea582ce` — Batch upload: require supplier selection
- `da0e75b` — Batch upload: default document_type_id
- `bfccde0` — Batch upload: all NOT NULL fields (document_number, date, amounts)
- `b56169b` — OCR auth token fix + button visibility (5 files)
- `fc07569` — Button visibility in OCR modals + upload timestamp display
- `b53d6ad` — Comprehensive white-on-white button sweep (19 files, all inline styles)
- `b8704b5` — Hebrew filename sanitization for Supabase Storage (3 files)
- `545557b` — Default hide cancelled docs + historical import required fields
- `07827e7` — OCR save RLS error fix + sort documents by upload date
- `1a06449` — OCR save: pass document ID through triggerOCR flow
- `ade1b4e` — OCR save: fix showOCRReview wrappers dropping docId param
- `a71dd7e` — OCR save: direct UPDATE instead of batchUpdate for existing docs
- `2e2690d` — Cache-busting query params on AI module scripts

### New Features
- `299893b` — Document edit modal (debt-doc-edit.js) with AI learning from corrections
- `5de358f` — OCR save updates existing documents + return_note doc type + OCR items in edit view
- `33b1220` — Multi-select status filter buttons (פתוח/שולם/מבוטלים) replacing single checkbox
- `8ac85a0` — Reverse document linking (invoice → delivery notes, multi-select with auto-sum)
- `237d001` — AI auto-suggest delivery note linking from invoice OCR data
- `b809dce` — Include return notes (תעודות החזרה) in invoice linking modal

### Infrastructure
- Migration 039: return_note document type for all tenants
- RLS policy fix on 5 tables (app.tenant_id → JWT claims)
- Demo tenant: payment_methods, document_types, ai_agent_config seed data
- Storage policy on supplier-docs bucket

---

## Phase 8 — OCR בקבלת סחורה + שיפורי פלואו רכש (2026-03-21)

### Step 1: Per-field Confidence + PO Auto-suggestion
- `22d2d41` — _rcptOcrFC, _rcptOcrAddConfDot, _rcptOcrSuggestPO in receipt-ocr.js

### Step 2: Item Matching Review UI
- `74095e1` — New file: receipt-ocr-review.js — parse, match, classify, review modal, apply
- `b45b3c7` — Connect receipt-ocr.js to review UI, delete old matching functions

### Step 3: Prepaid Separation (Operations vs Finance)
- `4238395` — Replace auto-deduction with alertPrepaidNewDocument
- `c57e49a` — Move alertPrepaidNewDocument to supabase-ops.js (cross-page)
- `e772efb` — Prepaid badge + deduction button on supplier documents (debt-documents.js)

### Step 4: PO Comparison Report
- `de4a430` — Migration 036: price_decision + po_match_status on goods_receipt_items
- `d6da7f8` — New file: receipt-po-compare.js — pre-confirm report, price decisions, auto-return

### Step 5: Learning Integration
- `b92c876` — Item alias learning + price pattern detection (VAT-inclusive suppliers)

### Step 6: Supplier Opening Balance
- `f44b439` — Migration 037: opening_balance fields on suppliers
- `7d409fd` — Opening balance UI + dashboard calculation with cutoff date

### QA + Fixes
- `7402765` — QA-1: 2 critical fixes (query limit, barcode-less matching), 4 warning fixes
- `4026f4c` — VAT hardcode fix in price pattern learning

---

## Phase 7 — Stock Count Improvements (2026-03-19)

### Step 0: File Split
- `86336c7` — split stock-count-session.js into session + camera (zero logic changes)
- `7bea7de` — split scan logic into stock-count-scan.js — all files under 350 lines

### Step 1: Atomic Delta RPC
- `588b349` — apply_stock_count_delta with FOR UPDATE lock, replaces set_inventory_qty

### Step 2: Unknown Items → Inventory
- `a441555` — unknown items modal: edit and add to inventory from stock count report

### Step 3: Reason + Partial Approval
- `aef7671` — reason field + partial approval with approve/skip checkboxes per item

### Step 4: View Completed Counts
- `5423c48` — view completed stock counts: read-only panel with filters and Excel export

### End of Phase
- `fc685b7` — Phase 7 documentation, backup, ROADMAP ✅

---

## Phase 7 — Hotfix Cycle (2026-03-19 to 2026-03-21)

### Camera & Scanning
- `666e1fd` — camera fullscreen gap fix, barcode scan improvements, error toast debounce (3s cooldown)

### CSS & Layout
- `4a74fec` — stock count mobile layout: right gap fix on Safari
- `5a226eb` — right margin gap on all pages: overflow-x:hidden on all CSS files
- `107a711` — persistent right margin gap: html overflow-x:hidden + remove all 100vw

### Database Constraints
- `03f2209` — barcode UNIQUE per tenant (inventory_barcode_tenant_key), remove D prefix from clone-tenant.sql
- `70f4d7a` — stock_counts count_number UNIQUE per tenant + collision retry in generateCountNumber
- `d337763` — clone-tenant.sql ON CONFLICT composite PK fixes
- `af5e87e` — clone-tenant.sql employee_roles PK fix (employee_id, role_id without tenant_id)

### Stock Count Flow
- `8e35120` — confirmCount all-items-skipped fix, countNumber scoping, undo button CSS
- `1c0e1cd` — PIN modal centered overlay (not scroll-to-top), undo button fix, unknown items warning before approval
- `a16d2c1` — unknown item duplicate barcode handling, scroll-to-top before PIN, completed view shows unknowns
- `b818379` — uncounted items dialog: mark pending items as shortages (כמות 0) or leave uncounted
- `3f17b77` — total_items includes matched unknowns in count list

### Unknown Items
- `770fbca` — unknown item insert uses status `in_stock` instead of `active`
- `c6e5fec` — barcode conflict dialog: ask user to link existing or create new item
- `da7cce6` — loadMaxBarcode silent failure fix + collision retry for generateNextBarcode
- `6a7c143` — loadMaxBarcode uses server-side max (Supabase `.order().limit(1)`) instead of fetching all rows

### Documentation & Rules
- `1c0b517` — TROUBLESHOOTING.md knowledge base created + SaaS rule 19 (UNIQUE + tenant_id) in CLAUDE.md
- `5030905` — TROUBLESHOOTING.md: stale session after tenant re-clone
- `1894028` — TROUBLESHOOTING.md: barcode collision bug
- `66c1ddd` — CLAUDE.md: no-worktree rule (rule 8 in Working Rules)
- `fc685b7` — CLAUDE.md: multi-machine development rule

---

## Stock Count Hotfixes — 2026-03-18

> Extensive hotfix cycle for stock-count camera scanning, UX, unknown item flow, and mobile optimization.

### Commits (in order)
- **Commit:** `dbd6ee8` — hotfix: stock-count manual search — clickable filtered rows + single-result Enter
- **Commit:** `9292568` — hotfix: stock-count pause button + cancel functionality
- **Commit:** `68accf6` — hotfix: stock-count auto-count first scan + quantity modal for re-scan
- **Commit:** `7599173` — hotfix: stock-count status filters + count confirmation + undo
- **Commit:** `929d08f` — hotfix: stock-count fullscreen camera + error debounce + scan logging
- **Commit:** `e7e4bf0` — hotfix: stock-count camera freeze-on-scan + fullscreen fix
- **Commit:** `0573db0` — hotfix: stock-count barcode normalization — handle ZXing format differences
- **Commit:** `c3d8b65` — hotfix: camera overlay stays open on error + defensive error handling
- **Commit:** `53decc4` — temp: visible scan debug overlay for mobile diagnosis
- **Commit:** `a7692eb` — hotfix: fix garbage barcode filter in ZXing callback
- **Commit:** `63c525e` — hotfix: fix scan pause stuck + add zoom toggle + clean up debug UI
- **Commit:** `bbe13d7` — hotfix: quantity input inside camera overlay for re-scanned items
- **Commit:** `260dfad` — hotfix: unknown barcode flow + not-found panel + zoom cleanup
- **Commit:** `984409a` — hotfix: unknown form timeout fix + size field + unknown items in report

### DB Migration
- `032_stock_count_unknown_items.sql` — status CHECK updated to include 'unknown', inventory_id made nullable

---

## Phase QA — Module 1 Final Certification (2026-03-16)

> Comprehensive QA phase: code scan, functional testing (~190 tests, 177 PASS), 9 end-to-end flows, security audit, performance review, UX/mobile/RTL audit, permissions expansion, and extensive bug fixing.

### QA Sub-Phases
- **QA-a: Code scan** — removed dev_bypass query param, removed debug console.logs, fixed innerHTML XSS risks
- **QA-b: Functional testing** — ~190 tests across all 6 pages, 177 PASS, 9 WARN, 4 FAIL (all fixed)
- **QA-c: End-to-end flows** — 9 flows: inventory lifecycle, PO→receipt→debt, stock count, Access sync, supplier returns→shipments, debt→payment, OCR→document, prepaid deal, permissions matrix
- **QA-d/e/j: Edge cases, security, permissions, multi-tenancy, data integrity**
- **QA-f/g/h/i/k: Performance, UX audit, mobile, RTL, documentation**

### Commits — Code Fixes
- **Commit:** `28cc3ba` — QA: remove dev_bypass and debug console.logs
- **Commit:** `daaff18` — QA: fix innerHTML XSS risks in excel-import, po-items, receipt-form, qty-modal
- **Commit:** `54e507e` — QA: fix duplicate headers, remove stale nav links, clean low-stock banner
- **Commit:** `1c56564` — QA: fix PO draft save + receipt sell_price validation
- **Commit:** `d20248a` — QA: home nav in header, OCR toolbar fix, Hebrew PIN error, negative price validation
- **Commit:** `12b8b38` — QA: fix table z-index, qty buttons size, doc/payment cancel, debt resilience, logo upload

### Commits — New Features
- **Commit:** `59e8a12` — add settings.html with business/financial/display settings, wire VAT to tenant config
- **Commit:** `f45a18a` — QA: return credit timeline, stock count realtime search + brand filters
- **Commit:** `e11b4f9` — QA: brand category filter, auto credit note, fast search, consistent PIN modal
- **Commit:** `ad760af` — QA: expand permissions — rename to ניהול הרשאות, add 26 permissions for all modules, enforce on page load

### Commits — Final Fixes
- **Commit:** `472438e` — QA: fix logo persistence, loading states, flash fix, loadReturns error, file splits
- **Commit:** `4c92a65` — QA: fix settings save, logo persistence, toast position

### New Files
- `settings.html` (162 lines) — tenant settings page with 3 sections + logo upload
- `js/pin-modal.js` (87 lines) — reusable PIN prompt modal (shared promptPin())
- `modules/settings/settings-page.js` (227 lines) — settings load/save/logo management
- `modules/stock-count/stock-count-filters.js` (245 lines) — brand/category pre-count filter screen
- `modules/suppliers-debt/debt-info-content.js` (250 lines) — info modal content for all debt screens
- `modules/suppliers-debt/debt-info-inject.js` (182 lines) — monkey-patches to inject info buttons

### Bug Fixes
- Duplicate headers on standalone pages (employees.html, suppliers-debt.html)
- PO draft save failing (null supplier validation)
- Receipt sell_price validation missing
- OCR toolbar scan button not appearing
- PIN Hebrew error message encoding
- Negative prices accepted in entry/edit forms
- Table z-index overlap with modals
- Qty button size too small on mobile
- Document cancel not updating status
- Payment cancel not rolling back allocations
- Debt dashboard resilience when no data
- `loadReturnsData` error when returns tab empty
- Settings save failing (RLS policy missing for tenant self-update)
- Logo persistence across page navigation
- Toast notification position overlap with header

### New Features & Enhancements
- **settings.html** — tenant settings page (business info, financial config, display preferences) + logo upload/delete/preview via tenant-logos Storage bucket
- **Return credit timeline** — visual timeline in debt returns tab showing return status progression
- **Stock count realtime search** — debounced search in stock count session filters by brand/model/barcode
- **Stock count brand/category filters** — pre-count filter screen (stock-count-filters.js)
- **Auto credit note on return credit** — auto-creates credit note document in supplier_documents
- **Consistent PIN modal** — shared promptPin() in js/pin-modal.js replaces inline PIN HTML
- **Loading spinners** — added to all module pages during initial data load
- **Permissions expansion** — 55 permissions across 15 modules, 36 new role_permissions assignments
- **employees.html renamed** to "ניהול הרשאות" (Permission Management) in UI
- **VAT wired to tenant config** — reads vat_rate from tenants table instead of hardcoded 17%
- **Home navigation** — header logo click navigates to index.html

### DB Changes
- `tenants`: RLS policy `tenant_update_own` for tenant self-update
- `stock_counts`: added `filter_criteria JSONB` column
- `tenants`: business info columns (address, phone, email, tax_id, logo_url, vat_rate) — added in settings migration
- 55 permissions across 15 modules (expanded from 29)
- 36 new role_permissions assignments
- 3 migration files: 030_settings_columns.sql, 031_stock_count_filter_criteria.sql, 031_tenants_update_policy.sql

---

## Post-Phase 5.9: Returns Management, Config & Fixes (2026-03-15)

> Returns tabs for inventory + debt, bulk sendToBox, help banners, status chain fixes, reverse sync XLS.

### Commits
- **Commit:** `cbf6d28` — Fix: _createReturnFromReduction — removed non-existent total_items/total_cost columns from supplier_returns insert
- **Commit:** `52d2a6b` — Fix: qty-modal adds "נשלח לזיכוי" reason to dropdown + creates supplier_return via _createReturnFromReduction when reason selected
- **Commit:** `58ae39c` — Fix: category dropdown shows Hebrew labels — uses ENUM_REV (en→he) not ENUM_MAP (he→en)
- **Commit:** `f70635b` — Fix: return status transitions expanded to full chain — pending→ready_to_ship→shipped/agent_picked→received_by_supplier→credited. Added agent_picked status
- **Commit:** `00d46dc` — Returns tab in inventory.html: DB migration (agent_picked_at, received_at, credited_at columns) + inventory-returns-tab.js (265 lines, filters/accordion/badge) + inventory-returns-actions.js (164 lines, markAgentPicked/sendToBox/bulkAction/export)
- **Commit:** `24c3711` — Wire sendToBox: returns tab navigates to shipments wizard with supplierId + returnIds pre-filled via URL params
- **Commit:** `ff331f0` — Fix: returns tab — add agent_picked_at/received_at/credited_at to DB schema, fix bulk selection, remove credited items from inventory returns view
- **Commit:** `fc1d32c` — Debt returns tab in suppliers-debt.html: debt-returns-tab.js (276 lines, global credit management view) + debt-returns-tab-actions.js (154 lines, markCredited/bulkMarkCredited/export)
- **Commit:** `7be6657` — Bulk sendToBox for multiple returns + renderHelpBanner() in shared.js + help text banners on inventory returns, debt returns, shipments list, shipments wizard
- **Commit:** `0e7ddd0` — Reverse sync: export as XLS instead of CSV via SheetJS (bookType: biff8)
- **Commit:** `04c6521` — Fix: all export paths use XLS format — updated comment in sync-watcher.js + README

### New Files
- `modules/inventory/inventory-returns-tab.js` (265 lines) — inventory returns (זיכויים) tab with filters, accordion, bulk selection, badge count
- `modules/inventory/inventory-returns-actions.js` (164 lines) — markAgentPicked, sendToBox, bulkSendToBox, bulkAction, exportReturnsExcel
- `modules/suppliers-debt/debt-returns-tab.js` (276 lines) — global debt returns tab for credit tracking across all suppliers
- `modules/suppliers-debt/debt-returns-tab-actions.js` (154 lines) — markDebtCredited, bulkMarkCredited, exportDebtReturnsExcel

### Updated Files
- `js/shared.js` — added renderHelpBanner() reusable component
- `modules/audit/qty-modal.js` — added "נשלח לזיכוי" reason, calls _createReturnFromReduction
- `modules/inventory/inventory-reduction.js` — fixed _createReturnFromReduction (removed bad columns)
- `modules/suppliers-debt/debt-returns.js` — expanded RETURN_TRANSITIONS + updateReturnStatus with timestamp fields
- `modules/shipments/shipments-items.js` — pre-fill from URL params (returnIds)
- `modules/shipments/shipments-create.js` — pre-fill supplier from URL params
- `modules/shipments/shipments-list.js` — help banner
- `modules/shipments/shipments-couriers.js` — help banner
- `scripts/sync-export.js` — CSV→XLS via SheetJS
- `watcher-deploy/sync-export.js` — CSV→XLS via SheetJS (deployed copy)
- `css/styles.css` — help banner styles, returns tab styles

### DB Changes
- `supplier_returns`: added columns agent_picked_at (TIMESTAMPTZ), received_at (TIMESTAMPTZ), credited_at (TIMESTAMPTZ)
- `supplier_returns`: CHECK constraint updated to include 'agent_picked' status

---

## Phase 5.9 — Shipments & Box Management (2026-03-15)

> Complete new module: shipments.html + 9 JS files + 3 DB tables + 1 RPC + JSONB config system.

### Sub-phases
- **Commit:** `017f5bc` — Phase 5.9a: DB migration — courier_companies, shipments, shipment_items tables + next_box_number RPC (SECURITY DEFINER) + RLS (6 policies) + indexes (9)
- **Commit:** `a50c251` — Phase 5.9b-1: T constants (T.TENANTS, T.COURIERS, T.SHIPMENTS, T.SHIP_ITEMS) + FIELD_MAP + ENUM_MAP (shipment_type, shipment_item_type, shipment_category) in shared.js
- **Commit:** `f003e92` — Phase 5.9b-2: shipments.html (287 lines) + shipments-list.js (231 lines) — list, filters, search, export
- **Commit:** `f21feff` — Phase 5.9c-1: shipments-create.js (294 lines) — wizard steps 1/3 + createBox with next_box_number RPC
- **Commit:** `ef8b76a` — Phase 5.9d: shipments-items.js (306 lines) — wizard step 2 (item entry), staged return picker, return status updates (ready_to_ship → shipped)
- **Commit:** `3ef5cb8` — Phase 5.9e: shipments-lock.js (323 lines) — lock system (configurable timer, auto-lock expired, correction box, edit window add/remove), tenants.shipment_lock_minutes column
- **Commit:** `b7962ed` — Phase 5.9f: shipments-detail.js (345 lines) + shipments-manifest.js (94 lines) — detail slide panel + manifest print
- **Commit:** `fa3e383` — Phase 5.9g: shipments-couriers.js (229 lines) — courier CRUD + shipment settings (4 fields: lock minutes, prefix, require tracking, auto print)
- **Commit:** `89e13bf` — Phase 5.9h: home screen card + 5 permissions (shipments.view/create/edit/lock/settings)
- **Commit:** `40cfe7b` — Fix: permission key format colon → dot notation
- **Commit:** `4225445` — Fix: add T.TENANTS constant to shared.js
- **Commit:** `91aee99` — Fix: add SECURITY DEFINER to next_box_number RPC

### Post-E2E Improvements
- **Commit:** `7a1a51d` — Fix: reduction "לזיכוי" creates supplier_return with status ready_to_ship; bulk return also uses ready_to_ship
- **Commit:** `b8315dd` — JSONB config Part 1: tenants.shipment_config JSONB column + DB seed + config helpers (getFieldConfig, getCustomField, getVisibleCategories, getCategoryLabel, getStep3Config) in shipments-lock.js
- **Commit:** `8bc113c` — JSONB config Part 2: dynamic fields in wizard step 2 based on config, accordion items table (shipments-items-table.js, 125 lines), step 3 validation from config
- **Commit:** `cb7040d` — JSONB config Part 3: shipments-settings.js (309 lines) — settings UI for field visibility per box type, category management, step 3 config, 3 collapsible sub-sections

### Files Added
- shipments.html (287 lines)
- modules/shipments/shipments-list.js (231 lines)
- modules/shipments/shipments-create.js (294 lines)
- modules/shipments/shipments-items.js (306 lines)
- modules/shipments/shipments-items-table.js (125 lines)
- modules/shipments/shipments-lock.js (323 lines)
- modules/shipments/shipments-detail.js (345 lines)
- modules/shipments/shipments-manifest.js (94 lines)
- modules/shipments/shipments-couriers.js (231 lines)
- modules/shipments/shipments-settings.js (309 lines)

### DB Changes
- 3 new tables: courier_companies, shipments, shipment_items
- 1 new RPC: next_box_number (SECURITY DEFINER)
- 5 new columns on tenants: shipment_lock_minutes, box_number_prefix, require_tracking_before_lock, auto_print_on_lock, shipment_config
- 6 new RLS policies (tenant_isolation + service_bypass on each new table)
- 9 new indexes

### Files Modified
- shared.js: T.TENANTS, T.COURIERS, T.SHIPMENTS, T.SHIP_ITEMS + FIELD_MAP + ENUM_MAP additions
- inventory-reduction.js: _createReturnFromReduction creates supplier_return with status ready_to_ship
- inventory-return.js: bulk return status uses ready_to_ship
- index.html: shipments module card added

---

## Access Sync Fix (2026-03-14)

> Not a numbered phase. Comprehensive fixes and enhancements to the Access sync system (originally Phase 2), done after Phase 5.75.

### CSV Support
- **Commit:** `bc88058` — sync-watcher.js: CSV support (was XLSX only). New parseCSVFile() function, BOM stripping, trailing comma handling
- **Commit:** `0df2699` — access-sales.js + inventory-reduction.js: CSV support for manual browser import

### Security
- **Commit:** `bbc01a9` — sync-watcher.js: tenant_id added to all 4 insert operations (pending_sales, inventory_logs, sync_log x2)
- **Commit:** `1c209c3` — sync-watcher.js: switched to service_role key via OPTICUP_SERVICE_ROLE_KEY env var

### Heartbeat + Status Indicator
- **Commit:** `be376f3` — sync-watcher.js: heartbeat every 60s to watcher_heartbeat table. access-sync.js: watcher status indicator (green/yellow/red dot)

### Pending Panel Redesign
- **Commit:** `082f07b` — pending-panel.js + pending-resolve.js: complete rewrite — table view + detail panel
- **Commit:** `dff070e` — DB: 4 new columns on pending_sales (brand, model, size, color). Watcher + manual import save them. Pending panel shows them
- **Commit:** `9c7a72b` — Fix CHECK constraint error on resolve. Add refresh button. Show product fields in sync detail modal
- **Commit:** `98448e3` — Major restructure: detail modal becomes work center, pending button becomes filter toggle, inline resolve with PIN at entry
- **Commit:** `f869cc3` — Fix pending_sales query: 'filename' column not 'sync_filename'
- **Commit:** `afab388` — New sync_log status 'handled' (orange). Badge counts files not items
- **Commit:** `a53b41b` — Brand/model clickable in detail modal → search in inventory
- **Commit:** `18939ff` — Help button "הסבר לתיקון ידני" in detail modal. start-watcher.bat launcher

### Configurable Watch Directory
- **Commit:** `eed515a` — OPTICUP_WATCH_DIR env var — configurable watch directory

### Reverse Sync (Export New Inventory to Access)
- **Commit:** `f302b0b` — Migrations run: access_exported column on inventory, sync_log source_ref allows 'export'. Batch update in groups of 100. Export logs with 📤 icon
- **Commit:** `e0ffbec` — New file: scripts/sync-export.js. Reverse sync exports new inventory to CSV every 30s. OPTICUP_EXPORT_DIR env var

### Standalone Deployment Package
- **Commit:** `6affea9` — watcher-deploy/ standalone package (8 files): sync-watcher.js, sync-export.js, install-service.js, uninstall-service.js, setup.bat (Hebrew interactive installer), uninstall.bat, package.json, README.txt (Hebrew UTF-8 BOM). Designed to be copied via USB/Dropbox to any Windows machine with Node.js

### DB Changes
- 4 new columns on pending_sales: brand, model, size, color
- 1 new column on inventory: access_exported BOOLEAN DEFAULT false
- Partial index: idx_inventory_access_unexported (tenant_id, access_exported) WHERE access_exported = false AND is_deleted = false
- sync_log status CHECK now includes 'handled'
- sync_log source_ref CHECK now includes 'export'

---

## Phase 5.75 — Communications & Knowledge Infrastructure (2026-03-14)

### 5.75a: Spec + Migration SQL
**Commit:** `dbbe96a`
- PHASE_5.75_SPEC.md added to docs/
- Migration file: phase5_75_communications_knowledge.sql
- 6 new tables: conversations, conversation_participants, messages, knowledge_base, message_reactions, notification_preferences
- 20 custom indexes + 3 UNIQUE constraints
- GIN index on knowledge_base.tags
- RLS tenant isolation + service_bypass on all 6 tables

### 5.75b: Run Migration + Verify
- Migration executed in Supabase SQL Editor — "Success. No rows returned"
- Verification: 6 tables exist, all tenant_id NOT NULL, all RLS enabled, 29 indexes (20 custom + 6 PK + 3 UNIQUE), 12 policies (2 per table)

### 5.75c: Backup + Documentation Update
- Backup to M1F5.75_2026-03-14/
- Updated: ROADMAP.md, db-schema.sql, MODULE_SPEC.md, CHANGELOG.md, SESSION_CONTEXT.md, MODULE_MAP.md, CLAUDE.md
- Zero-UI phase — no JS files added

---

## Phase 5.5 — Stability, Scale & Batch Operations (2026-03-13)

### 5.5a-1: SQL Migrations — Atomic RPCs + Schema Additions
**Commit:** `dbaa77d`
- 2 new RPC functions: `next_internal_doc_number(p_tenant_id UUID)` and `update_ocr_template_stats(p_template_id UUID, p_corrections JSONB, p_extracted_data JSONB)`
- 3 new columns on supplier_documents: `file_hash TEXT`, `batch_id TEXT`, `is_historical BOOLEAN DEFAULT false`
- 3 new indexes: idx_sup_docs_file_hash, idx_sup_docs_batch, idx_sup_docs_historical
- Migrations: phase5_5a_atomic_rpcs.sql, phase5_5b_schema_additions.sql

### 5.5a-2: batchWriteLog + FIELD_MAP
**Commits:** `d4acf1f`, `8242e1a`
- `batchWriteLog(logs)` in supabase-ops.js — batch insert multiple log entries
- FIELD_MAP updated with Hebrew translations for file_hash (גיבוב קובץ), batch_id (מזהה קבוצה), is_historical (מסמך היסטורי)

### 5.5b: RPCs Applied in JS
**Commit:** `235e42b`
- `generateDocInternalNumber()` in debt-documents.js rewritten to use `next_internal_doc_number` RPC (atomic, race-condition-safe)
- `updateOCRTemplate()` in supabase-ops.js rewritten to use `update_ocr_template_stats` RPC (atomic accuracy calculation)
- receipt-debt.js `createDocumentFromReceipt()` uses `next_internal_doc_number` RPC

### 5.5c: pg_cron Daily Alert Generation
**Commit:** `0168846`
- pg_cron job `daily-alert-generation` scheduled at 05:00 UTC
- Calls `generate_daily_alerts()` with fault isolation: each alert type (payment_due, payment_overdue, prepaid_low) wrapped in BEGIN/EXCEPTION blocks
- Migration: phase5_5c_pgcron_alerts.sql

### 5.5d: Stability Fixes
**Commit:** `5aecfad`
- Weekly report: snapshot cache with tenant_id fix
- alerts-badge.js: try/catch wrappers around all async operations
- `validateOCRData(extractedData)` — 7 business rules: required fields, date validation, amount consistency, supplier match, document type, currency format, duplicate document number
- `createAlert()` skips historical documents (checks `is_historical` flag)
- CLAUDE.md: corrected alerts table description

### 5.5e: UX Fixes
**Commit:** `9284538`
- Remove file button added to receipt form (clear attached file without reload)
- AI info modal for OCR scanning in goods receipt (explains what the AI does)

### 5.5f: Advanced Document Filtering
**Commit:** `c119c6b`
- Created modules/suppliers-debt/debt-doc-filters.js (242 lines)
- Replaces simple filter bar from debt-documents.js
- 8 filter criteria: status, document type, supplier (searchable), date range (from/to), amount range (from/to), source (historical/current)
- Saved filter favorites via localStorage (max 5 per tenant)
- Collapsible filter panel with count display
- Right-click to delete saved favorites

### 5.5g: Batch Document Upload
**Commit:** `e8535b6`
- Created modules/suppliers-debt/ai-batch-upload.js (332 lines)
- Drag-and-drop upload modal with file preview
- SHA-256 file hash dedup: checks within batch + against DB (file_hash column)
- Two modes: upload-only (creates draft documents) or upload+OCR (chains to batch OCR)
- Progress bar, per-file status icons, cleanup on close/beforeunload
- Max 50 files per batch, validates type (PDF/JPG/PNG) and size (10MB)
- Monkey-patches renderDocFilterBar to inject toolbar button

### 5.5h-1: Batch OCR with Pipelining
**Commit:** `9969ff4`
- Created modules/suppliers-debt/ai-batch-ocr.js (297 lines)
- Sequential OCR processing via `window._startBatchOCR(batchId, docIds)`
- Pause/resume queue, retry failed documents, retry single document
- Review individual docs via existing showOCRReview modal
- Auto-approve valid documents (above confidence threshold from ai_agent_config)
- Summary modal showing total/success/failed and average confidence
- validateOCRData integration for error flagging

### 5.5h-2: Historical Document Import
**Commit:** `bbef876`
- Created modules/suppliers-debt/ai-historical-import.js (330 lines)
- Import old/historical documents for AI learning without inventory impact
- Documents marked `is_historical=true` — no alerts generated, no inventory changes
- Default status selection: paid (default), open, or per-document
- Chains to batch OCR after upload for AI template learning
- Learning summary modal: per-supplier scan count, confidence, template accuracy
- Monkey-patches renderDocFilterBar to inject toolbar button

### 5.5i: Documentation & Backup
**Commits:** `d1f0511` (backup), current (docs)
- Backup to M1F5.5_2026-03-13/
- All documentation files updated

---

## Phase 5 — AI Agent for Supplier Management (2026-03-13)

### 5a: DB Tables — 5 New Tables
**Commit:** `d82fb25`
- Created 5 new tables: ai_agent_config, supplier_ocr_templates, ocr_extractions, alerts, weekly_reports
- RLS + tenant isolation on all 5 tables (tenant_isolation + service_bypass policies)
- 9 indexes (tenant_id composites on all tables)
- Seed data: ai_agent_config row for Prizma tenant with default settings
- T constants added to shared.js: AI_CONFIG, OCR_TEMPLATES, OCR_EXTRACTIONS, ALERTS, WEEKLY_REPORTS
- Migration: phase5a_ai_agent_tables.sql

### 5b: Edge Function — OCR Extract
**Commit:** `70124b4`
- Created supabase/functions/ocr-extract/index.ts (349 lines)
- Claude Vision API integration using claude-sonnet-4-20250514
- JWT validation via Supabase auth
- File fetch from Supabase Storage (supplier-docs bucket)
- Supplier fuzzy matching (name similarity)
- PO matching by supplier + status
- Template hints integration (from supplier_ocr_templates)
- Full error handling: 404 (file not found), 429 (rate limit), 504 (timeout), 422 (validation)
- Deployed to Supabase Edge Functions

### 5c: OCR Review Screen
**Commit:** `bcf627a`
- Created modules/suppliers-debt/ai-ocr.js (317 lines, later 342 after 5e)
- Side-by-side review modal: extracted fields on left, document preview on right
- Confidence indicators per field (green ≥0.9, yellow ≥0.7, red <0.7)
- Correction tracking: records diff between AI extraction and user corrections
- Creates supplier_document on confirm with all extracted fields
- Integrated into suppliers-debt.html as "סריקת חשבונית" button

### 5d: OCR in Goods Receipt
**Commit:** `f66a37b`
- Created modules/goods-receipts/receipt-ocr.js (297 lines)
- "סרוק עם AI" button in receipt form (visible only when file attached)
- Auto-fills: supplier selection, document type/number/date, receipt items
- Inventory matching by model ILIKE query
- Confidence banner showing match count and overall confidence
- Non-blocking: user can modify all auto-filled fields

### 5e: Learning System
**Commit:** `1024ef2`
- updateOCRTemplate() in supabase-ops.js: creates/updates supplier_ocr_templates
- buildHintsFromCorrections(): generates field hints from correction history
- Templates created on first scan per supplier+document_type, updated on subsequent scans
- Accuracy rate tracking: (total_scans - corrections) / total_scans per template
- Stats display in OCR review modal (scan count, accuracy %, last scan date)
- Patches receipt-confirm.js for learning trigger on goods receipt OCR confirm

### 5f-1: Alerts Badge + Daily Alert SQL
**Commit:** `ab2be62`
- Created js/alerts-badge.js (323 lines)
- Bell icon (🔔) with unread count badge on all 4 HTML pages
- Dropdown panel showing last 10 alerts with type icons
- Action buttons: view document, dismiss, mark as read
- Hebrew time-ago display (לפני X דקות/שעות/ימים)
- Created generate_daily_alerts SQL RPC function (phase5f_alert_generation.sql)
- 3 daily alert types: payment_due (7 days), payment_overdue, prepaid_low (<20% remaining)
- Idempotent: skips if alert already exists for same source

### 5f-2: Event-Driven Alerts
**Commit:** `3ba3d9d`
- Created modules/suppliers-debt/ai-alerts.js (219 lines)
- 4 event alert types: price_anomaly (>10% change), duplicate_document, amount_mismatch (receipt vs PO), ocr_low_confidence (<70%)
- Auto-dismiss: payment alerts dismissed when payment saved, OCR alerts dismissed when extraction accepted
- Duplicate document check before save in debt-documents.js
- Non-breaking monkey-patches: wraps existing functions without modifying originals
- All alerts include metadata JSON for drill-down

### 5g: Weekly Report
**Commit:** `6176385`
- Created modules/suppliers-debt/ai-weekly-report.js (274 lines)
- New "דוח שבועי" tab added to suppliers-debt.html
- 4 report sections: debt summary, upcoming payments, prepaid deals status, OCR statistics
- Week navigation (prev/next week buttons)
- PDF export via html2canvas + jsPDF (loaded from CDN)
- Data snapshot saved to weekly_reports table (JSONB)
- Auto-generates report on tab load if not exists for current week

### 5h: AI Config Screen
**Commits:** `dfce880`, `b9c1ab0`
- Created modules/suppliers-debt/ai-config.js (223 lines)
- Settings modal accessible to CEO/Manager only (permission check)
- 3 config sections: OCR settings, Alerts settings, Weekly Report settings
- Confidence threshold slider (50%-100%)
- Toggle switches for alert types and auto-generation
- Usage statistics display (total scans, templates, alerts, reports)
- Emoji rendering fix: replaced surrogate pair emojis with simple text in modal headings

---

## Phase 4 — Supplier Debt Tracking & Enhanced Goods Receipt (2026-03-13)

### 4a: DB Schema — 11 New Tables
**Commit:** `1c4b2b9`
- Created 11 new tables: document_types, payment_methods, currencies, supplier_documents, document_links, supplier_payments, payment_allocations, prepaid_deals, prepaid_checks, supplier_returns, supplier_return_items
- Added 5 columns to suppliers: default_document_type, default_currency, payment_terms_days, has_prepaid_deal
- All tables with tenant_id UUID NOT NULL, RLS tenant isolation, service_bypass
- Indexes on tenant_id + composite indexes (tenant+supplier, tenant+status, tenant+due_date)
- Seed data: 4 document_types, 4 payment_methods, 3 currencies (ILS, USD, EUR)
- T constants added to shared.js: DOC_TYPES, SUP_DOCS, SUP_PAYMENTS, DOC_LINKS, PAY_ALLOC, PAY_METHODS, PREPAID_DEALS, PREPAID_CHECKS, SUP_RETURNS, SUP_RETURN_ITEMS

### 4a+: Patch — Withholding Tax, Internal Numbering, Duplicate Prevention
**Commit:** `384a3bf`
- Added withholding_tax_rate, withholding_tax_amount, net_amount to supplier_payments
- Added status (approved/pending/rejected), approved_by, approved_at to supplier_payments
- Added internal_number to supplier_documents with partial unique index
- Added UNIQUE constraint on (tenant_id, supplier_id, document_number)
- Added withholding_tax_rate, tax_exempt_certificate, tax_exempt_until to suppliers

### 4b-1: Split receipt-actions.js
**Commit:** `013a79c`
- Extracted receipt-confirm.js from receipt-actions.js (confirmReceipt, confirmReceiptCore, confirmReceiptById, createNewInventoryFromReceiptItem)
- Zero logic changes — pure structural split

### 4b-2: Auto-Create Supplier Documents on Receipt Confirm
**Commit:** `56b1097`
- Created receipt-debt.js with createDocumentFromReceipt()
- Auto-creates supplier_documents record when goods receipt is confirmed
- Calculates subtotal/VAT/total from item costs
- Generates DOC-NNNN internal number
- Uses supplier's default_document_type and payment_terms_days

### 4b-3: Mandatory Barcodes + Employee Guide
**Commit:** `1ff908f`
- Barcode now mandatory on new receipt items (pre-assigned via generateNextBarcode)
- showReceiptGuide() — modal overlay with quick-reference employee guide (RECEIPT_GUIDE_TEXT constant)
- ℹ️ info button in receipt form header

### 4c: Debt Dashboard Skeleton
**Commit:** `daff9ce`
- Created suppliers-debt.html — standalone page with 4 tabs (suppliers, documents, payments, prepaid)
- Created modules/suppliers-debt/ folder
- Created debt-dashboard.js — loadDebtSummary() with 4 summary cards (total debt, due this week, overdue, paid this month)
- Added debt module card to index.html MODULES array
- formatILS() utility added to shared.js

### 4d: Documents Tab
**Commit:** `54a6ab4`
- Created debt-documents.js (300 lines) — loadDocumentsTab, CRUD with PIN verification
- Created debt-doc-link.js (72 lines) — delivery note → invoice linking
- Filter bar: supplier, type, status, date range, overdue checkbox
- openNewDocumentModal with auto-calc VAT
- generateDocInternalNumber (DOC-NNNN sequential)
- Status badge rendering (DOC_STATUS_MAP)

### 4e: Payments Tab
**Commit:** `6ea1124`
- Created debt-payments.js (168 lines) — loadPaymentsTab, filters, payment detail modal
- Created debt-payment-wizard.js (146 lines) — steps 1-2: supplier selection with debt summary, payment details with auto-calc withholding tax
- Created debt-payment-alloc.js (254 lines) — steps 3-4: FIFO document allocation, PIN confirmation, save payment + allocations + update document paid_amount/status
- T.PAY_ALLOC + T.PAY_METHODS added to shared.js

### 4f: Prepaid Deals Tab
**Commit:** `edad755`
- Created debt-prepaid.js (285 lines) — deal CRUD, check management, progress bars, status badges
- Auto-deduction from active prepaid deal on receipt confirmation (added to receipt-debt.js)
- Deal status transitions: active → completed/cancelled
- Check status transitions: pending → cashed/bounced

### 4g: Suppliers Table + Detail View
**Commit:** `7516714`
- Created debt-supplier-detail.js (~328 lines) — slide-in panel with supplier summary + 4 sub-tabs
- Extended debt-dashboard.js with loadSuppliersTab + renderSuppliersTable + openPaymentForSupplier
- Suppliers table: aggregated open docs, total debt, overdue, next due date, prepaid deal info
- Timeline tab: merged docs + payments sorted by date with icons
- Sub-tabs: timeline (default), documents, payments, returns

### 4h: Supplier Returns
**Commit:** `d9e2f4e`
- Created debt-returns.js (~230 lines) — loadReturnsForSupplier, renderReturnsTable, viewReturnDetail, status management
- Created inventory-return.js (~185 lines) — openSupplierReturnModal (validates selection, same-supplier check), _doConfirmSupplierReturn (PIN, creates return + items, decrements inventory)
- generateReturnNumber: RET-{supplier_number}-{seq 4-digit}
- "זיכוי לספק" button in inventory bulk operations bar
- Return statuses: pending → ready_to_ship → shipped → received_by_supplier → credited

### 4i: Documentation Update
**Commit:** `96c4886`
- Backup to M1F4_2026-03-13/
- ROADMAP.md: Phase 4 ⬜ → ✅
- SESSION_CONTEXT.md: full update with all commits
- CHANGELOG.md: this section
- MODULE_SPEC.md: overwritten with Phase 4 current state
- MODULE_MAP.md: verified (updated incrementally during 4a-4h)
- db-schema.sql: verified (updated during 4a/4a+)
- CLAUDE.md: updated T constants + file structure

### Phase 4 QA Fixes + File Upload
**Commit:** `043f3ec`
- **batchUpdate RLS violation (CRITICAL)** — replaced .upsert() with individual .update().eq('id') calls + tenant_id
- **inventory-return.js 'in' filter (CRITICAL)** — fixed fetchAll filter from parenthesized string to array; same fix in debt-returns.js
- **Payment wizard rollback (CRITICAL)** — _wizSavePayment rolls back (deletes payment + allocations) if document update fails
- **supplierNumCache fallback (CRITICAL)** — generateReturnNumber fetches supplier_number from DB when cache empty
- **Document filter missing "cancelled" (minor)** — added "מבוטל" option
- **cost_price formatting (minor)** — wrapped with formatILS() in inventory-return.js
- **file-upload.js (NEW)** — uploadSupplierFile, getSupplierFileUrl, renderFilePreview, pickAndUploadFile
- Receipt form: "צרף מסמך" button, _pendingReceiptFile, warning if no file before confirm
- receipt-debt.js: uploads file after creating supplier document
- Documents tab: viewDocument modal with file preview + 📎 attach/replace button

### Phase 4 — Auto-Update cost_price + PO Price Comparison
**Commit:** `6ab6cfe`
- receipt-confirm.js: confirmReceiptCore auto-updates inventory cost_price from receipt item unit_cost via batchUpdate + writeLog('cost_update')
- checkPoPriceDiscrepancies() — new function: fetches PO items, matches by brand+model+size+color, flags >5% price differences, shows Hebrew warning dialog, adds price_discrepancy note to supplier_documents. Non-blocking.

### Phase 4 — Aging Report on Debt Dashboard
**Commit:** `25cb50c`
- debt-dashboard.js: loadAgingReport(docs) — 5 aging buckets (שוטף, 1-30, 31-60, 61-90, 90+ days) by due_date. Colored bars proportional to total. No extra DB queries — reuses loadDebtSummary data.
- suppliers-debt.html: aging section between summary cards and tabs, responsive flex layout with color-coded bars (green → red)

---

## Phase 3.8 — Sticky Header (2026-03-12)

- Created css/header.css (98 lines) — sticky header: 60px, z-index 1000, RTL, 3-zone layout (logo+store | app name | employee+logout), responsive below 600px
- Created js/header.js (58 lines) — initHeader() fetches tenant name/logo from DB, buildHeader() injects header as first child of body, uses escapeHtml() for all dynamic values, logout wired to clearSession()
- Updated index.html — added header.css link + header.js script tag
- Updated inventory.html — added header.css link + header.js script tag
- Updated employees.html — added header.css link + header.js script tag
- Fallback SVG glasses icon when tenant logo_url is null
- No DB changes — reads from existing tenants table (Phase 3.75)
- E2E tested: login → header on all 3 screens → logout → no header pre-login, zero console errors

---

## Phase 3.75 — Multi-Tenancy Foundation (March 2026)

- Created tenants table + seeded Prizma as tenant #1
- Added tenant_id UUID NOT NULL to 20 tables, backfilled 13,457 rows
- Added 25 indexes (single + composite)
- Deployed pin-auth Edge Function (PIN → JWT with tenant_id claim)
- Updated auth flow: sb client uses JWT Bearer token after login
- Added tenant_id to all writes (15 direct + 3 helpers)
- Added tenant_id filter to all reads (~60 direct selects)
- JWT-based RLS tenant isolation active on all 20 tables
- Added getTenantId(), verifyPinOnly() to shared/auth modules

---

## v3.5 — Phase 3.5: מסך בית + דפים עצמאיים (מרץ 2026)

- phase 3.5: rename index.html → inventory.html
- phase 3.5: clearSession redirects to index.html
- phase 3.5: add home screen index.html with module cards
- phase 3.5: add employees.html standalone page
- phase 3.5: employees card links to employees.html
- fix: homeBtn nav link width and text color
- phase 3.5: remove employees tab from inventory.html
- phase 3.5: redesign logout button with יציאה label (inventory.html + employees.html)
- phase 3.5: showUserButton sets employee name in adminBtnName span
- phase 3.5: permission-based lock on module cards in index.html
- docs: add SaaS/multi-tenant rules to CLAUDE.md
- docs: update SESSION_CONTEXT and ROADMAP
- style: add global logout-btn class to styles.css
- style: move logout button to header, home link always visible in nav (inventory.html + employees.html)

---

## v3.0 — Phase 3: Auth & Permissions

Date: March 2026

Commits: e0d7a28, 31b2bac, 450d5b5, 0c34bd5, 6b74bc4, b21067c, 2706d4d, c850392, cd8dd04, 908111a, 98ff6c7, 8c4d4d7, 3b167ee, 253f0f2, a21145f

### DB (migration 016)
- New tables: roles (5 system roles: ceo, manager, team_lead, worker, viewer)
- New tables: permissions (35 granular permissions across 9 modules)
- New tables: role_permissions (94 default role→permission mappings)
- New tables: employee_roles, auth_sessions (token-based, 8h expiry)
- ALTER employees: added email, phone, branch_id, created_by, last_login, failed_attempts, locked_until
- RLS: added INSERT/UPDATE/DELETE policies on employees table
- pin_length CHECK constraint added but commented out (pre-production TODO)
- Added purchase_order.view permission (was missing, caused PO tab to be hidden)

### New Files
- js/auth-service.js — 287 lines, 14 functions: full auth engine
- modules/employees/employee-list.js — 283 lines, 8 functions: employee CRUD + permission matrix

### Features
- Login screen: 5-box PIN modal, fullscreen overlay, session restore on reload
- Session management: token-based, 8h expiry, permission snapshot in sessionStorage
- PIN lockout: 5 failed attempts → sessionStorage lock + server-side locked_until (15min)
- Role-based access: 5 roles with 35 granular permissions across 9 modules
- UI guards: 10 nav tabs + 21 action buttons gated by data-permission attributes
- Employee management screen: add/edit/deactivate, role assignment, permission matrix
- User display button: shows logged-in employee name + logout on click
- Dev bypass: ?dev_bypass=opticup2024 (TODO: remove before production)

### Refactoring
- 8 legacy PIN call sites replaced with verifyEmployeePIN()
- admin.js: removed toggleAdmin(), checkAdmin() — replaced with hasPermission('settings.edit')
- writeLog(): auto-populates employee_id from getCurrentEmployee()
- loadData(): session guard added (returns early if no active session)
- stock-count-session.js: skips PIN modal if active session exists
- empSummaryCard: renamed from summaryCard to avoid global name collision with access-sync.js

### QA
- 32 E2E tests run across all 5 roles
- 29/32 passed on first run
- 3 bugs found and fixed: purchase_order.view missing, summary cards "undefined", PIN lockout client-side only

### Deferred to Future Features
- impersonateUser, previewUIAsRole, generatePermissionSnapshot
- writePermissionLog, validateActionIntegrity
- Rate limiting, multi-branch roles, custom permission groups
- Supabase Auth, configurable session timeout

---

## [Phase 2b] — 2026-03-11

### Added
- scripts/sync-watcher.js — InventorySync Folder Watcher (chokidar, idempotency guards, 30s debounce)
- modules/access-sync/sync-details.js — sync details modal, failed file download via Supabase Storage
- Supabase Storage bucket: failed-sync-files
- migrations/015 — storage_path + errors columns on sync_log

### Changed
- modules/access-sync/access-sync.js — full sync screen with summary cards, log table, action buttons
- scripts/sync-watcher.js — uploads failed files to Supabase Storage

## [Phase 2 fixes] — 2026-03-11

### Fixed
- Stock count: PIN verified before count created in DB
- Stock count: unscanned items now appear in diff report as "לא נספר"
- Stock count: unified smart search field (brand/model/color/barcode)
- Sync watcher: idempotency guards prevent duplicate DB rows
- Sync watcher: 30-second cooldown prevents duplicate file processing

---

## [Phase 2a] — 2026-03-11

### Added
- modules/stock-count/stock-count-list.js — list screen, summary cards, generateCountNumber (SC-YYYY-NNNN), startNewCount
- modules/stock-count/stock-count-session.js — worker PIN entry, camera scanning (ZXing), handleScan, updateCountItem
- modules/stock-count/stock-count-report.js — diff report, confirmCount (manager PIN + RPC + writeLog), cancelCount, exportCountExcel
- migrations/013_stock_count.sql — stock_counts + stock_count_items tables
- migrations/014_stock_count_scanned_by.sql — added scanned_by column to stock_count_items
- Supabase RPC: set_inventory_qty(inv_id, new_qty)

### Changed
- index.html — added 📊 ספירת מלאי tab + ZXing library
- js/shared.js — added T.STOCK_COUNTS, T.STOCK_COUNT_ITEMS

---

## [Goal 0] — 2026-03-10

### Changed
- `receipt-actions.js` — `confirmReceiptCore()`: atomic increment via RPC
- `qty-modal.js` — `confirmQtyChange()`: atomic increment/decrement via RPC
- `pending-resolve.js` — `confirmResolvePending()`: atomic increment/decrement via RPC
- `inventory-reduction.js` — `processRedExcel()`: atomic decrement via RPC
- `inventory-reduction.js` — `confirmReduction()`: atomic decrement via RPC

### Added
- `migrations/012_atomic_qty_rpc.sql` — `increment_inventory` + `decrement_inventory` RPC functions

---

## Phase 1: Airtable Era (V1.1A → V1.6A)

### V1.3A — Initial Release
**Commit:** `e6a68b8` | 2026-03-08 08:36
- **Initial commit** — Prizma Optics inventory system V1.3A
- Single-file HTML app connected to Airtable
- 6 tabs: הכנסת מלאי, הורדת מלאי, הזמנת רכש, מלאי ראשי, ניהול מותגים, ניהול ספקים
- Hebrew RTL, dark blue + white + gray theme
- Admin mode with password 1234
- API token stored in code

### V1.4A — Bulk Operations
**Commit:** `37102fc` | 2026-03-08 10:00
- Inventory table: bulk operations (select multiple → bulk update/delete)
- Cleaner columns layout
- Test data integration (1,189 items from Excel)

### V1.5A — Token Security
**Commit:** `4fe4f0c` | 2026-03-08 10:43
- API token moved from code to localStorage
- Token entry modal on first use
- Logout button added

### V1.6A — Sync & Sorting
**Commit:** `f40bb03` | 2026-03-08 11:05
- Sync field editing (website_sync dropdown)
- Image preview modal
- Column sorting (click header → asc/desc/none)
- Sync validation logic

---

## Phase 2: Supabase Migration (V1.7A)

### V1.7A — Backend Migration
**Commit:** `ca6e023` | 2026-03-08 15:20
- **Complete migration from Airtable to Supabase**
- PostgreSQL schema with proper types, FKs, constraints
- Compatibility layer: rowToRecord/fieldsToRow/fetchAll/batchCreate
- Hebrew↔English field mapping (FIELD_MAP)
- Enum mapping (ENUM_MAP) for product_type, status, website_sync, brand_type
- Supplier/brand lookup caches (name↔UUID)
- 1,189 records migrated via upload script

---

## Phase 3: Barcode System

### Unique Barcode Validation
**Commit:** `a7cf013` | 2026-03-08 19:09
- UNIQUE constraint on barcode (WHERE NOT NULL)
- Duplicate detection: within batch + against DB

### Barcode Format BBDDDDD
**Commit:** `e5d9037` | 2026-03-08 19:19
- New format: 2-digit branch code + 5-digit sequence
- `loadMaxBarcode()` — scans all barcodes in branch prefix
- Reuse barcode for duplicate items (same brand+model+size+color)
- Max 99,999 items per branch

---

## Phase 4: Excel & Export

### Export to Excel
**Commit:** `c1e0621` | 2026-03-08 19:22
- `exportInventoryExcel()` — filtered inventory to .xlsx
- Hebrew column headers
- SheetJS (xlsx) library

### Excel Bulk Import
**Commit:** `ceab6ac` | 2026-03-08 19:30
- `handleExcelImport()` — parse Excel with column name normalization
- Hebrew/English column aliases
- Required field validation
- Preview table with stats and error display
- `confirmExcelImport()` — batch create with writeLog

### Mobile Responsive
**Commit:** `ec9fd53` | 2026-03-08 19:37
- Nav bar horizontal scroll on mobile
- Tables responsive with horizontal scroll
- Forms stack vertically on small screens

### Inventory Module v1.0
**Commit:** `9c9f45e` | 2026-03-08 19:40
- Module milestone marker

---

## Phase 5: Audit & Logs Module

### pg_trgm + Brand Exclusion
**Commit:** `1b1381f` | 2026-03-08 20:14
- `CREATE EXTENSION pg_trgm` for fuzzy text search
- GIN indexes on model and color columns
- `exclude_website` field added to brands table

### Schema: Logs + Employees + Soft Delete
**Commit:** `188aea1` | 2026-03-08 20:26
- `employees` table with PIN authentication
- `inventory_logs` table — 15 action types, qty/price before/after tracking
- Soft delete columns on inventory (is_deleted, deleted_at/by/reason)
- Migration file: `002_logs_and_soft_delete.sql`
- Default admin employee: מנהל ראשי, PIN 1234

### writeLog Engine + Action Hooks
**Commit:** `65489f9` | 2026-03-08 20:31
- `writeLog(action, inventoryId, details)` function
- ACTION_MAP constant — 16 action types with icon/label/color
- Integrated into: submitEntry (entry_manual), submitFromPO (entry_po), confirmExcelImport (entry_excel), saveInventoryChanges (edit_*), markSold (sale)
- Non-blocking async — never blocks main operations

### Soft Delete with PIN + Recycle Bin
**Commit:** `d8ce2f8` | 2026-03-08 20:41
- `confirmSoftDelete()` — PIN verification, is_deleted=true, log
- `openRecycleBin()` — view deleted items
- `restoreItem()` — restore with log
- `permanentDelete()` — double PIN, DELETE + log
- Deleted items filtered out of main inventory view

### Item History Modal
**Commit:** `bf46750` | 2026-03-08 20:48
- 📋 button per inventory row
- `openItemHistory()` — colored timeline of all actions
- `exportHistoryExcel()` — export to Excel
- Color-coded by action category (green/red/blue/gray/amber)

### System Log Screen
**Commit:** `46e4107` | 2026-03-08 21:04
- Admin-only tab "📋 לוג מערכת"
- 4 summary cards (active count, entries/deletions/edits this week)
- 6 filters: date range, branch, action, employee, free text
- Paginated table (50 rows/page)
- Color-coded rows by category
- `exportSystemLog()` — Excel export with filters

### Audit & Logs v1.0
**Commit:** `39595f3` | 2026-03-08 21:18
- Full smoke test passed (7 tests)
- writeLog, soft delete, recycle bin, item history, system log all verified
- RLS policies added: DELETE + UPDATE on inventory_logs
- Migration file updated with new policies

---

## Phase 6: Quantity Control

### Add/Remove Quantity with PIN
**Commit:** `0649848` | 2026-03-08 21:35
- Quantity cell made readonly — no direct edit allowed
- ➕➖ buttons (admin-only) with modal
- `openQtyModal(inventoryId, mode)` — add/remove with reason dropdown
- `confirmQtyChange()` — PIN verification, over-remove protection
- writeLog('edit_qty') for every quantity change
- Stripped כמות from saveInventoryChanges() — enforces ➕➖ only
- writeLog added to Red Excel sales path (processRedExcel)

---

## Phase 7: Goods Receipt

### Goods Receipt Module
**Commit:** `eab834d` | 2026-03-08 22:25
- DB: `goods_receipts` + `goods_receipt_items` tables with RLS
- Migration: `003_goods_receipts.sql`
- New tab "📦 קבלת סחורה" (visible to all)
- 2-step flow: receipt list → receipt form
- Receipt types: תעודת משלוח, חשבונית, חשבונית מס
- Barcode search → existing item auto-fill
- Manual add → new item with generated barcode
- Excel import for receipt items
- `confirmReceipt()` — full flow: save → process items → update inventory → writeLog('entry_receipt')
- Draft/Confirmed/Cancelled status management
- View-only mode for confirmed/cancelled
- Summary cards: drafts, confirmed this week, items received
- ACTION_MAP: added `entry_receipt` (17th action type)
- SLOG_ROW_CATEGORIES: added entry_receipt → 'entry' category

---

## Phase 8: Architecture — Modularize + DB Prep

### Module v1.0 Docs Archive
**Commit:** `50d49de` | 2026-03-08
- Archived Module 1 — Inventory Management docs (SPEC, CHANGELOG, schema, guide)

### Snapshot v1.0 + Cleanup
**Commit:** `a0aa965` | 2026-03-09
- Snapshot of monolith before split
- Archived legacy scripts/data/schema to subdirs

### Repo Cleanup
**Commit:** `d832a68` | 2026-03-09
- Moved legacy scripts, data files, and schema files to organized subdirs

### Extract CSS
**Commit:** `a8e9bbc` | 2026-03-09
- All styles extracted from index.html to `css/styles.css`

### Split into 7 JS Modules
**Commit:** `bf7a3a8` | 2026-03-09
- Monolith index.html split into 7 JS files:
  - `js/shared.js` — Supabase init, constants, caches, utilities
  - `js/inventory-core.js` — inventory reduction + main table
  - `js/inventory-entry.js` — entry forms (manual + Excel)
  - `js/goods-receipt.js` — goods receipt + system log
  - `js/audit-log.js` — soft delete, recycle bin, history, qty modal
  - `js/brands-suppliers.js` — brands + suppliers management
  - `js/admin.js` — admin mode + app init
- index.html now just HTML shell + script tags

### DB Prep — min_stock_qty + Remove contact_lenses
**Commit:** `62542d4` | 2026-03-09
- Migration: `brands.min_stock_qty` integer column added
- Removed contact_lenses product type references

### Brands — min_stock_qty Inline Editing
**Commit:** `c26be57` | 2026-03-09
- `saveBrandField()` — immediate save on min_stock_qty input change
- Placeholder shows default threshold by brand type (יוקרה=5, מותג=15)

---

## Phase 9: Purchase Orders Module

### DB Schema for Purchase Orders
**Commit:** `6c39f2c` | 2026-03-09
- `purchase_orders` table (po_number, supplier_id, status, notes, etc.)
- `purchase_order_items` table (po_id, brand_id, model, size, color, quantity, cost_price, etc.)
- `po_id` FK added to goods_receipts for PO→receipt linkage
- Migration: `005_purchase_orders.sql`

### PO List View + Summary Cards
**Commit:** `e4763dd` | 2026-03-09
- New tab "הזמנות רכש" with summary cards (draft/sent/received counts)
- Filterable PO list by status + supplier
- Color-coded status badges

### PO Form — Create/Edit Draft with Items
**Commit:** `2750ab3` | 2026-03-09
- PO creation and editing form
- Item rows with brand, model, size, color, quantity, cost price
- Draft save functionality

### Fix: po_number Field Name
**Commits:** `d647715`, `41f5000` | 2026-03-09
- Renamed order_number → po_number in FIELD_MAP and legacy PO entry flow

### PO Status Management
**Commit:** `0087908` | 2026-03-09
- `sendPurchaseOrder()` — marks PO as sent
- `cancelPO()` — cancels PO
- `openViewPO()` — read-only view for sent/received POs
- `openEditPO()` — edit mode for drafts

### CLAUDE.md Project Guide
**Commit:** `6c13809` | 2026-03-09
- Added initial CLAUDE.md with project structure, rules, and conventions

### Remove Legacy PO Tab
**Commit:** `dad9ec6` | 2026-03-09
- Removed old "הזמנת רכש" tab and all legacy PO functions
- Replaced with new purchase-orders.js module

### Refactor: Goods Receipt into Entry Tab
**Commit:** `90a467f` | 2026-03-09
- Moved קבלת סחורה from standalone tab into הכנסת מלאי as third entry mode
- Entry tab now has 3 modes: manual, Excel import, goods receipt

---

## Phase 10: Inventory Reduction Improvements

### Fix: Entry Audit Issues
**Commit:** `3574460` | 2026-03-09
- Fixed status handling in entry flow
- Fixed barcode generation edge cases
- Cleaned dead code

### Reduction — Model Dropdown + PIN + Reasons + writeLog
**Commit:** `dd1b585` | 2026-03-09
- `loadModelsForBrand()` — brand-based model datalist
- `openReductionModal()` / `confirmReduction()` — replaces old markSold()
- REDUCE_REASONS: נמכר, נשבר, לא נמצא, נשלח לזיכוי, הועבר לסניף אחר
- PIN verification via employees table
- writeLog('sale') with reason tracking

### Reduction — Cascading Size + Color Dropdowns
**Commit:** `e046dd0` | 2026-03-09
- `loadSizesAndColors(brandName, model)` — populates size/color datalists
- Full cascading chain: brand → model → size + color

---

## Phase 11: Excel Import + Entry History

### Excel Import — Barcode-First Flow
**Commit:** `6488c8f` | 2026-03-09
- Barcode matching: existing items get qty increment, new items go to pending list
- `generatePendingBarcodes()` / `exportPendingBarcodes()` — barcode generation for new items
- `showExcelResultsModal()` — results summary with stats

### Help Modal
**Commit:** `98efebe` | 2026-03-09
- `openHelpModal()` / `closeHelpModal()` — operating instructions modal
- Help button in nav bar

### Entry History Modal
**Commit:** `1655338` | 2026-03-09
- `openEntryHistory()` — browse entries grouped by date (accordion)
- `renderEntryHistory()` — timeline view per date group
- `toggleHistGroup(date)` — expand/collapse date groups
- `exportDateGroupBarcodes(date)` — export barcodes for a specific date

---

## Phase 12: PO Enhancements

### Bug Fixes — PO + Entry History
**Commit:** `847f1bc` | 2026-03-09
- `loadPOsForSupplier()` guard for missing supplier_id
- Entry history accordion UI fixes

### PO Form — Two-Step Wizard + Brand Datalist
**Commit:** `51a7486` | 2026-03-09
- Two-step wizard: step 1 = select supplier, step 2 = generate PO# + edit items
- `proceedToPOItems()` bridges the two steps
- `ensurePOBrandDatalist()` — brand datalist for PO items
- Fixed duplicate row issues

### PO Items — Cascading Dropdowns + Stock Alert + Validation
**Commit:** `e6eb96c` | 2026-03-09
- `loadPOModelsForBrand()` / `loadPOColorsAndSizes()` — cascading dropdowns
- Low stock alert integration in PO item rows
- Required field validation before save
- Deduplication of PO items

### PO Export — Excel + PDF
**Commit:** `fdd6da5` | 2026-03-09
- `exportPOExcel()` — PO to xlsx with supplier info + item details
- `exportPOPdf()` — PO to PDF for supplier delivery

### Excel Import — Format Popup
**Commit:** `b45e010` | 2026-03-09
- `openExcelFormatPopup()` / `closeExcelFormatPopup()` — sample format guide
- Replaces old direct sample file download

---

## Phase 13: Supplier + Brand Management

### Supplier Numbers + PO Format + View Export
**Commit:** `281141e` | 2026-03-09
- `supplier_number` column (UNIQUE, ≥ 10) on suppliers table
- PO number format: `PO-{supplier_number}-{4-digit-seq}`
- Export buttons available in PO view mode

### Supplier Numbers — Edit Mode + PO Lock + Swap
**Commit:** `561d144` | 2026-03-09
- `toggleSupplierNumberEdit()` / `cancelSupplierNumberEdit()` — edit mode toggle
- `saveSupplierNumbers()` — validation (≥ 10, no duplicates), PO lock check, temp negative swap for UNIQUE constraint
- `getNextSupplierNumber()` — gap-filling (lowest available ≥ 10)
- Rollback on save failure

### Brands — Stock Qty Column with Low Stock Highlight
**Commit:** `2ceb635` | 2026-03-09
- `brandStockByBrand` — aggregated inventory qty per brand
- Stock qty column in brands table
- Color logic: red + ⚠️ if below min_stock_qty, green if above, default if no min set

### Brands — Active Field + Filter Bar + Toggle
**Commit:** `2271728` | 2026-03-09
- Migration: `009_brands_active.sql` — `brands.active` boolean column
- `allBrandsData[]` + `brandsEdited[]` — full dataset vs filtered view
- 3 filter dropdowns: active (פעיל/לא פעיל/הכל), sync, type
- `setBrandActive()` — immediate DB save on checkbox toggle
- Filter count label

---

## Phase 14: Documentation

### CLAUDE.md — Full Module Map
**Commit:** `3793842` | 2026-03-09
- Comprehensive project guide: file structure, DB tables, all modules with functions + globals
- 12 documented conventions
- Known issues section

---

## Phase 1.5: Improvements & Bug Fixes

### CLAUDE.md — Brands Filter Conventions
**Commit:** `a6b01de` | 2026-03-09
- Updated CLAUDE.md conventions section with brands filter documentation
- Documented `allBrandsData[]`, `renderBrandsTable()` filter logic, `setBrandActive()` pattern

### Brands — Low Stock Filter
**Commit:** `e7b86b3` | 2026-03-09
- Added 4th filter dropdown `brand-filter-low-stock` to brands table
- Options: הכל / מתחת לסף / מעל הסף / ללא סף
- `renderBrandsTable()` now applies 4 filters (active, sync, type, low stock)
- Uses `currentQty` vs `min_stock_qty` comparison from `allBrandsData`

### Goods Receipt — Bug Fixes (4 fixes)
**Commit:** `d9a251a` | 2026-03-09
- **writeLog fix**: `confirmReceiptCore()` now passes `null` as inventoryId for receipt-level logs instead of PO id
- **Confirm refactor**: extracted `confirmReceiptCore(receiptId, rcptNumber, poId)` as shared logic for both `confirmReceipt()` (DOM-based) and `confirmReceiptById()` (DB-based)
- **Duplicate barcode check**: `addReceiptItemRow()` and `searchReceiptBarcode()` now reject items with barcodes already in the receipt table
- **Qty=0 validation**: `getReceiptItems()` now throws on qty < 1 instead of silently defaulting to 1; all callers wrapped in try/catch

### Sell Price + Sync + Image Validations
**Commit:** `5bfb824` | 2026-03-09
- **Sell price required in goods receipt**: `confirmReceipt()` and `saveReceiptDraft()` block on missing sell price
- **Sell price required before barcode**: `generateBarcodes()` validates sell price > 0 before generating
- **brandSyncCache**: `loadData()` and `saveBrands()` build `window.brandSyncCache` (brand name → default sync)
- **Receipt sync field**: `addReceiptItemRow()` adds sync select (auto-set from brand default) + image file input (new items only)
- **Image validation**: `confirmReceipt()` blocks new items with sync=מלא/תדמית missing images; `validateEntryRows()` adds sync-based image check
- **Brand default sync**: `createNewInventoryFromReceiptItem()` uses `getBrandSync()` instead of hardcoded `'none'`
- Receipt table headers updated: +סנכרון, +תמונות columns

---

## פאזה 2 — גשר Access

### Migration 010: Access Bridge Tables
**Commit:** `dbc44fa` | 2026-03-09
- 3 new tables: `sync_log`, `pending_sales`, `watcher_heartbeat`
- `sync_log` — tracks each imported file with row counts and status
- `pending_sales` — holds rows whose barcode was not found in inventory
- `watcher_heartbeat` — single-row table for watcher uptime monitoring
- Indexes on created_at, filename, status, order_number
- RLS policies (all open for now)
- Migration: `010_access_bridge.sql`

### Access Sync Tab — Skeleton
**Commit:** `ae41e1a` | 2026-03-09
- New tab "🔄 סנכרון Access" with heartbeat status, sync log table, pending badge
- `js/access-sync.js` — new module file
- `loadHeartbeat()` — green/red/gray indicator based on watcher_heartbeat.last_beat
- `loadSyncLog()` — displays sync history with status badges
- `loadPendingBadge()` — COUNT pending WHERE status='pending', updates button style

### Pending Sales Panel — Resolve, Search, Ignore
**Commit:** `7a25bd5` | 2026-03-09
- `renderPendingPanel()` — overlay with cards per pending sale
- `loadSuggestions()` — up to 5 barcode-matched inventory suggestions
- `resolvePending()` — maps pending row to inventory item, updates qty
- `toggleFreeSearch()` / `runPendingSearch()` — free text search fallback
- `ignorePending()` — marks pending row as "not in inventory"

### Inventory Core — Access Sales Excel Import
**Commit:** `2ccdffe` | 2026-03-09
- `processAccessSalesFile(workbook, filename)` in inventory-core.js
- Detects `sales_template` sheet, skips 2 metadata rows
- Validates barcode, qty, date, order_number per row
- Barcode found → updates inventory qty + writeLog
- Barcode not found → inserts into pending_sales
- Creates sync_log entry with final row counts

### Goods Receipt — Export to Access Excel
**Commit:** `4ad76c5` | 2026-03-09
- `exportReceiptToAccess(receiptId)` in goods-receipt.js
- Exports confirmed receipt items as Excel with `new_inventory` sheet
- 📤 button visible only on confirmed receipts in list view

### Scripts — Sync Watcher
**Commit:** `0e1888a` | 2026-03-10
- `scripts/sync-watcher.js` — Node.js file watcher using chokidar
- Watches Dropbox folder for .xlsx/.xls files
- Processes `sales_template` sheet → inventory updates / pending_sales
- Retry logic (3 attempts, 30s delay) for network errors
- Heartbeat every 5min to watcher_heartbeat table
- Graceful SIGTERM/SIGINT shutdown
- `scripts/config.json` (gitignored) + `scripts/config.example.json`
- `scripts/package.json` with chokidar, xlsx, supabase-js dependencies

### Scripts — Windows Service + README
**Commit:** `5e7379b` | 2026-03-10
- `scripts/install-service.js` / `scripts/uninstall-service.js` — node-windows service wrapper
- `scripts/README.md` — Hebrew installation guide
- OpticTop folder path structure for Dropbox sync

### Migration 011 — Inventory Logs Sale Fields
**Commit:** `528183e` | 2026-03-10
- 12 new columns on `inventory_logs`: sale_amount, discount, discount_1, discount_2, final_amount, coupon_code, campaign, employee_id, lens_included, lens_category, order_number, sync_filename
- `writeLog()` in shared.js updated to accept 13 additional Access sale fields
- `sync-watcher.js` direct INSERT updated with same fields
- Migration: `011_inventory_logs_sale_fields.sql`

### Fix HIGH — Config Leak, Crash Risk, Security Gates
**Commit:** `977b87d` | 2026-03-10
- `scripts/config.json` added to .gitignore + untracked from git
- `scripts/config.example.json` created with placeholder key
- `moveToProcessed()` wrapped in try/catch with copy+delete fallback
- `resolvePending()` gated with confirmDialog + PIN verification

### Fix MEDIUM — Pagination, Optimistic Lock, Dedup, Labels, Table Names
**Commit:** `3ffbb0c` | 2026-03-10
- `loadSyncLog()` rewritten with `.range()` pagination (20 rows/page)
- `resolvePending()` uses optimistic lock: UPDATE WHERE status='pending' before inventory changes
- Duplicate filename check changed from `.eq()` to `.ilike()` (case-insensitive) in both web + watcher
- `SOURCE_LABELS` map for source_ref display (🤖 Watcher / 👤 ידני)
- `TABLES` const in sync-watcher.js — replaced all hardcoded table name strings

### Fix LOW — Error Logging, XSS, Dead Code, Heartbeat Refresh
**Commit:** `7dbef27` | 2026-03-10
- `processAccessSalesFile()` row-level catch now logs `console.warn` with barcode
- Duplicate check catch replaced with warning + toast instead of silent proceed
- All inline `onclick`/`oninput` handlers in access-sync.js replaced with `data-*` attributes + delegated event listeners (XSS prevention)
- Removed dead `patterns[1]` computation in `loadSuggestions()`
- Removed unused `orderNumber` parameter from `ignorePending()`
- Added `startHeartbeatRefresh()` / `stopHeartbeatRefresh()` with 60s auto-refresh interval

---

## Debt Module Upgrades — 2026-03-28

### Phase A-prep — Migration + doc type fix
**Commit:** `8fb0c12` | 2026-03-25
- Fix doc type pass-through in `createDocumentFromReceipt`
- Remove plain "חשבונית" from receipt document type dropdown
- Migration 058: `document_numbers` TEXT[] and `document_amounts` JSONB on `supplier_documents`
- FIELD_MAP additions: document_numbers, document_amounts

### Phase A1 — Supplier filter chips
**Commit:** `258d029` | 2026-03-25
- New file: `debt-supplier-filters.js` (102 lines)
- 3 filter groups: type, history, debt — client-side filtering on `_supTabData`
- `loadSuppliersTab` enriches with hasReceiptDocs/hasHistory flags

### Phase A2 — Month picker + amount filters
**Commit:** `ce8d33b` | 2026-03-26
- New file: `debt-filter-utils.js` — reusable month picker + amount range filter
- Supplier detail documents sub-tab now has full filter bar

### Phase A3 — Payment flow fixes
**Commit:** `b74ab4b` | 2026-03-26
- `openPaymentForDocument(docId)` — payment wizard pre-filled for specific doc
- Step 3 allocation: pre-selected docs highlighted blue with ★
- Supplier detail: checkboxes on payable docs + "שלם נבחרים" action bar

### Phase A4+A5 — Prepaid display + doc count expand
**Commit:** `845f21f` | 2026-03-26
- Prepaid column: totalPrepaid (green) / totalUsed (red)
- Multi-doc expand: count badge + sub-row with breakdown table
- `_toggleDocSubRow` function

### Phase A6 — Full document editing
**Commit:** `fb86a80` | 2026-03-26
- `changeDocSupplier` with PIN + ActivityLog
- "📌 שייך לספק" button on orphan documents
- Subtotal always editable, status dropdown with valid transitions

### Phase A7 — Receipt header redesign
**Commit:** `eb7681f` | 2026-03-26
- New field order: ספק → PO → סוג מסמך → כמות → מספר → תאריך
- New file: `receipt-doc-numbers.js` — `_onDocCountChange`, `getRcptDocAmounts`
- PO availability indicator (green border)

### Phase A-AI-1 — Supplier auto-detect from OCR
**Commit:** `d40c23e` | 2026-03-27
- New file: `receipt-ocr-supplier.js` — OcrSupplierMatch module
- `matchSupplier`: alias → exact → fuzzy → none pipeline
- `learnSupplierAlias`: saves OCR name for future matching
- Migration 059: `supplier_name_aliases`, `ai_has_po_pattern`

### Phase A-AI-2 — PO auto-match from OCR
**Commit:** `3edbe00` | 2026-03-27
- New file: `receipt-ocr-po.js` — OcrPOMatch module
- `findBestPO`: scores POs by item count + amount + item matches (0-100)
- `compareItems`: match/qty_mismatch/price_mismatch/not_in_po/missing

### Phase A-AI-3 — Doc type learning + integration
**Commit:** `2b0b499` | 2026-03-27
- Doc type auto-detection from OCR with confidence
- `receipt-confirmed` event listener: snapshot OCR, learn aliases, save corrections

### QA + Bug Fixes
**Commits:** `b9c0ef5`, `f4b2d0e`, `10e5c01`, `93a6cbc`, `8cef6e3`, `4374e3b`, `b4d260e` | 2026-03-27–28
- try/catch on AI calls, wizard state cleanup
- OCR flow: PO choice modal, cached re-scan
- Compare button placement and visibility fixes
- Doc number learning, receipt table readability

### Shared Components + Generalization
**Commits:** `7463b2b`, `3bb0188` | 2026-03-28
- New shared file: `shared/js/table-resize.js` (103 lines)
- Generalize resizable columns with sticky scrollbar to all data tables

### Post-QA Fixes
**Commits:** `ae9ec76`, `80fecd0`, `44db0cd`, `e26af09` | 2026-03-28
- PO choice modal on manual supplier select, prevent double review modal
- Fix comparison matching, sticky scrollbar, remove double scrollbar
- Payment flow: refresh suppliers table + documents after payment
- Prepaid display colors (green=prepaid, red=charged) + auto-deduct from deal on invoice creation
- `autoDeductPrepaid()` in receipt-debt.js, `_autoDeductFromPrepaid()` in debt-doc-new.js

### Phase Summary
- **24 commits**: 8fb0c12..e26af09
- **10 new files**: debt-supplier-filters.js, debt-filter-utils.js, receipt-doc-numbers.js, receipt-ocr-supplier.js, receipt-ocr-po.js, receipt-ocr-flow.js, debt-expense-folders.js, debt-general-invoices.js, shared/js/table-resize.js, shared/js/sort-utils.js
- **35 files changed**: +3,521 / -324 lines
- **2 migrations**: 058 (document_numbers), 059 (supplier_name_aliases, ai_has_po_pattern)
- **2 new shared components**: table-resize.js, sort-utils.js
