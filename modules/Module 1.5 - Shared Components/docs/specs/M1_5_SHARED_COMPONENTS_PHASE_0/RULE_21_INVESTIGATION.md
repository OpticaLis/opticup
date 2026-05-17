# RULE_21_INVESTIGATION — M1_5_SHARED_COMPONENTS_PHASE_0

> **Author:** opticup-executor (Claude Code, Windows desktop, 2026-05-17 evening)
> **SPEC:** `M1_5_SHARED_COMPONENTS_PHASE_0/SPEC.md`
> **SPEC_START commit:** `236b6b8` (HEAD at SPEC dispatch)
> **Source Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md` §SPEC 2
> **Why this artifact exists:** SPEC §0 mandates a Rule 21 (No Orphans, No Duplicates) sweep before any new code lands in `shared/`. The Brief's 8-component target is an aspirational MAX, not authorization to duplicate existing infrastructure. Per-component verdict (extend / new / replace+migrate) is required.

---

## 0. Baselines captured at investigation start

| Symbol | Source | Value |
|---|---|---|
| BASE_SHARED_JS_FILES | `ls shared/js/*.js \| wc -l` | 14 |
| BASE_SHARED_CSS_FILES | `ls shared/css/*.css \| wc -l` | 9 (SPEC §0 said 10 — actual is 9; SPEC over-counted by 1) |
| HEAD at investigation start | `git log -1` | `236b6b8` |
| Existing shared/js lines total | `wc -l shared/js/*.js` | 2,672 |
| Existing shared/css lines total | `wc -l shared/css/*.css` | 1,763 |
| Largest existing JS file | `catalog-private-admin.js` | 339 lines (cap 350) |
| Largest existing CSS file | `components.css` | 267 lines |
| `tokens.css` already present? | `ls shared/css/tokens.css` | NO — Brief calls for adding tokens; executor will create it as a NEW file rather than swelling `variables.css` past current 182 lines |

---

## 1. Existing `shared/` inventory cross-reference

| Existing file | Lines | Surface | Overlap risk with Brief's 8 components |
|---|---|---|---|
| `shared/js/table-builder.js` | 298 | `TableBuilder.create({ columns, data, sortable, render, onSort, onRowClick, emptyState, stickyHeader, skeletonRows })` — 7 type renderers (text/number/currency/date/badge/actions/custom) | **HIGH overlap with Brief #6 (data-table)** — provides 80% of the surface. Missing: pagination, permission-gated columns, group-header rows. Verdict candidate: **EXTEND** (additive). |
| `shared/js/sort-utils.js` | 56 | `SortUtils.sortArray/toggle/updateHeaders/getState` | Already covers sortable; TableBuilder integrates via `onSort` callback. No new sort primitive needed. |
| `shared/js/modal-builder.js` | 265 | `Modal.show/confirm/alert/danger/form/close/closeAll` — overlay-centered | LOW overlap. Drawers (Brief #7 #8) are right-pinned, not overlay-centered — different visual model. Verdict candidates: **NEW** for each drawer. |
| `shared/js/modal-wizard.js` | 145 | `Modal.wizard({ steps, onFinish })` — multi-step **in-modal** wizard with own progress bar (`.wizard-progress > .wizard-step`) | **MEDIUM overlap with Brief #4 (wizard-step-indicator)**. modal-wizard scope = inside-modal wizards (overlay context). Brief #4 scope = page-level standalone indicator (PO screen mockup shows `.wizard-steps` AT TOP of full page, no enclosing modal). Visual class names differ (`.wstep / .wstep-circle / .wstep-line` in PO mockup vs `.wizard-step / .wizard-step-num` in modal-wizard.css). Distinct primitive — **NEW** file, no conflict with modal-wizard. CSS class prefixes chosen to NOT collide (`.wstep-*`). |
| `shared/js/cat-sidebar.js` | 192 | `initCatSidebar({ categories, onSelect })` — left-rail vertical category nav | LOW overlap with Brief #3 (side-detail-panel). cat-sidebar is a left-rail nav; side-detail is a right-side per-row detail card. Different concept, different selectors. **NEW** for side-detail-panel. |
| `shared/js/permission-ui.js` | 94 | `PermissionUI.apply/applyTo/check` — scans `[data-permission]` attrs, hide-or-disable | Already exists. Brief #6's `data-permission`-on-`<th>` + `<td>` integrates via this scanner — extension to TableBuilder will emit `data-permission` attrs, then call `PermissionUI.applyTo(container)` post-render. NO new permission primitive needed. |
| `shared/js/table-resize.js` | 215 | `initResizableColumns / initStickyScrollbar` | Orthogonal to data-table extension. |
| `shared/js/supabase-client.js`, `pin-modal.js`, `toast.js`, `activity-logger.js`, `plan-helpers.js`, `theme-loader.js`, `catalog-private-admin.js` | — | Out of scope for SPEC 2 components — orthogonal. | None. |

CSS files:

| Existing CSS | Lines | Surface | Overlap with SPEC 2 tokens |
|---|---|---|---|
| `shared/css/variables.css` | 182 | Tokens for primary/semantic/neutral/bg/typography/spacing/radius/shadow/z/transitions/focus + navy accent | **PARTIAL overlap with SPEC token additions**. Missing tokens (Brief §SPEC 2 tokens list): source-band (`--src-purple/blue/amber-*`), progress (`--progress-*`), dark theme (`--dark-bg/panel/border/text`), gradient (`--gradient-header`), toggle-switch (`--toggle-on/off/thumb`), gold mockup palette (`--gold-active=#c9a555` etc.) Verdict: add as **new file** `shared/css/tokens.css` (extension via additional file rather than swelling variables.css; keeps the two layers — base tokens vs feature tokens — distinct for future audit). |
| `shared/css/modal.css` | 239 | Modal overlay/container/header/body/footer + wizard-progress (.wizard-step/.wizard-step-num/.wizard-step-active/.wizard-step-done) | wizard-progress styles live here for modal-wizard. SPEC 2 wizard-step-indicator uses `.wstep-*` class names (distinct prefix) to avoid collision. **NO modification to modal.css.** |
| `shared/css/table.css` | 174 | TableBuilder styles (.tb-*) | Will EXTEND additively with group-header-row styles + permission-gated column styles. |
| All other CSS (cat-sidebar, components, components-extra, forms, layout, toast) | — | Orthogonal | None. |

---

## 2. Mockup design-token cross-reference

Tokens that appear in 2+ mockup files and are NOT in `shared/css/variables.css`:

| Token need | Mockups that use it | Resolution |
|---|---|---|
| Gold active `#c9a555` | All 7 lens mockups | Add `--gold-active` to new `tokens.css` |
| Gold dark `#b8954a` | All 7 lens mockups | Add `--gold-dark` |
| Gold tint `#faf3e0` | All 7 lens mockups | Add `--gold-tint` |
| Gold mockup neutrals (text `#5d6d7e`, header-bg `#f8f9fb`, label `#475569`, muted `#94a3b8`, sub `#64748b`) | All 7 lens mockups | Add `--mockup-neutral-text/header-bg/label/muted/sub` (or alias to existing slate scale) |
| Source-band purple `bg #faf5ff / fg #6d28d9` | PO + GR mockups | Add `--src-purple-bg/fg` |
| Source-band blue `bg #eff6ff / fg #1e3a8a` | PO + GR + Inventory + Pricing mockups | Add `--src-blue-bg/fg` |
| Source-band amber `bg #fffbeb / fg #92400e` | PO + GR mockups | Add `--src-amber-bg/fg` |
| Status chips (draft/sent/partial/received/overdue/cancelled/stock/custom/customer/manual/complete/discrepancy) | POs list + GR mockups | Already in `lens-tabs.css` per SPEC 1 close — extend to canonical tokens.css for cross-tab reuse |
| Dark theme palette (`--dark-bg #0f172a / --dark-panel #1e293b / --dark-border #334155 / --dark-text #e2e8f0`) | Catalog Admin mockup | Add as `--dark-*` tokens |
| Gradient header (`linear-gradient(135deg, #c9a555 0%, #b8954a 100%)`) | Inventory drawer + Pricing drawer + side panels | Add `--gradient-header` |
| Toggle-switch (`--toggle-on/off/thumb`) | Designs Selection mockup | Add tokens (placeholder values: `--toggle-on: #27ae60 / --toggle-off: #cbd5e1 / --toggle-thumb: #ffffff`) |
| Progress-bar (`--progress-bg/fg/fill-success/partial/empty`) | Multiple receipt screens | Add tokens (`--progress-bg: #e2e8f0 / --progress-fg: #1e3a8a / --progress-fill-success: #10b981 / --progress-fill-partial: #d97706 / --progress-fill-empty: #cbd5e1`) |
| Pricing dual-view toggle (`#f0f2f5` bg, gold thumb) | Pricing mockup | Reuse `--gold-active` + new `--toggle-bg-pill` |

---

## 3. Per-component verdicts (Brief's 8 components)

| # | Brief component | Verdict | Files (new or extended) | Estimated lines | Rationale |
|---|---|---|---|---|---|
| 1 | `chip-filter-row` | **NEW** | `shared/js/chip-filter-row.js` (~150 lines) + `shared/css/chip-filter.css` (~110 lines) | ~260 | No existing chip-filter primitive. Distinct visual model from cat-sidebar (horizontal pill vs vertical nav). API: `ChipFilter.init(container, { chips, onSelect, multiSelect, label })`. Hebrew-aware (RTL). |
| 2 | `stat-card-row` | **NEW** | `shared/js/stat-card-row.js` (~120 lines) + `shared/css/stat-card.css` (~95 lines) | ~215 | No existing stat-card primitive. Grid of 4-5 cards with colored border-right, click-to-filter. API: `StatCardRow.init(container, { cards, onCardClick, activeId })`. |
| 3 | `side-detail-panel` | **NEW** | `shared/js/side-detail-panel.js` (~140 lines) + `shared/css/side-detail.css` (~110 lines) | ~250 | No existing right-pinned detail panel. Different from modal (which is overlay-centered). Sticky gradient header + scrollable body sections. API: `SideDetailPanel.init(container, { title, headerVariant, sections })`. |
| 4 | `wizard-step-indicator` | **NEW** | `shared/js/wizard-step-indicator.js` (~110 lines) + `shared/css/wizard-step-indicator.css` (~90 lines) | ~200 | DISTINCT from `modal-wizard.js` — that's for inside-modal wizards. This is the page-level indicator (PO mockup `.wizard-steps > .wstep`). CSS class prefix `.wstep-*` chosen to avoid collision with modal-wizard's `.wizard-step-*`. API: `WizardSteps.init(container, { steps, activeIndex, onStepClick })`. |
| 5 | `group-header-row` | **NEW** | `shared/js/group-header-row.js` (~55 lines) — CSS lives in `tokens.css` (source-band) + extension to `table.css` (group-header layout) | ~80 | Small helper: renders a `<tr class="tb-group-header tb-group-header-{purple\|blue\|amber}">…</tr>`. API: `GroupHeaderRow.render({ sourceType, label, count, colSpan })`. CSS extension to `table.css` adds `.tb-group-header*` rules referencing tokens. |
| 6 | `data-table` (extension) | **EXTEND** | `shared/js/table-builder.js` (existing 298 lines — additive: ~50 lines for pagination + ~30 for permissions + ~20 for group rows + injecter; SPLIT to `shared/js/table-builder-extensions.js` if 350 cap approached) + `shared/css/table.css` (existing 174 — additive: ~40 lines for `.tb-pagination`, `.tb-th[data-permission]`, `.tb-group-header`) | ~140 added across files | Iron Rule 21 prevents creating a parallel `data-table.js` that duplicates TableBuilder's 80%-overlap surface. The additions: (a) `pagination: { pageSize, currentPage }` config, (b) honor `data-permission` on column defs → emit attrs on `<th>` + `<td>`, call `PermissionUI.applyTo()` post-render, (c) `groupBy` config or accept group-header rows interleaved in data via `_group:true` marker. NO breaking API change. |
| 7 | `quick-receipt-drawer` | **NEW** | `shared/js/quick-receipt-drawer.js` (~260 lines, near cap — split risk acknowledged) + `shared/css/quick-receipt.css` (~140 lines) | ~400 | Right-pinned drawer w/ delivery-note metadata (Section A) + staged items list (Section B) + footer actions. Class prefix `.qrd-*`. API: `QuickReceiptDrawer.init(container, { onSubmit, onCancel, suppliers, modeAllowsBypass })` → returns instance with `.open()`, `.close()`, `.stageItem(item)`, `.clearStaged()`. If line count exceeds 340 → split staged-list logic to `shared/js/quick-receipt-staged-list.js`. |
| 8 | `lens-details-drawer` | **NEW** | `shared/js/lens-details-drawer.js` (~230 lines) + `shared/css/lens-details.css` (~150 lines) | ~380 | Right-pinned 2-tab drawer (לוגים read-only + הערות edit-or-readonly). Class prefix `.ldd-*`. API: `LensDetailsDrawer.init(container, { variantId, mode, onAddNote, onEditNote, onDeleteNote })`. Mode = `'edit'` or `'readonly'`. |

**Tokens** (always net-new, no overlap):
- **NEW** `shared/css/tokens.css` — ~120 lines for source-band, progress, dark theme, gradient, toggle-switch, gold mockup palette, status-chip aliases.

---

## 4. Replace+migrate verdicts: NONE

**No "replace+migrate" verdicts.** SPEC §7 Destructive Operations stays `None.` — no existing `shared/` file is deleted by this Pipeline. All actions are: (a) NEW file, (b) EXTEND existing file additively.

Per SPEC §10 EXCEPTION pathway: if any verdict above changes to "replace+migrate" mid-execution, escalation is mandatory. No such escalation is currently anticipated.

---

## 5. Iron Rule 12 (file-size) risk audit

| File | Pre-SPEC lines | Post-SPEC estimate | Cap | Risk |
|---|---|---|---|---|
| `shared/js/table-builder.js` | 298 | ~390 if all extensions inline | 350 | **HIGH** — extensions likely require split. Plan: if commit pushes past 340 lines, split additions into `shared/js/table-builder-extensions.js` (extension attached via `Object.assign(TableBuilder.prototype, ...)` or by augmenting the instance return). |
| `shared/js/quick-receipt-drawer.js` | NEW (~260) | ~260 | 350 | **MEDIUM** — close to cap if features grow. Acknowledged. |
| `shared/js/lens-details-drawer.js` | NEW (~230) | ~230 | 350 | LOW. |
| All other new JS | NEW | All <200 lines | 350 | LOW. |
| `shared/css/table.css` | 174 | ~215 | 350 | LOW. |
| `shared/css/tokens.css` | NEW | ~120 | 350 | LOW. |
| All other new CSS | NEW | All <150 lines | 350 | LOW. |

**Mitigation rule:** any post-edit file that exceeds 320 lines triggers a split-decision check before commit. The split — if needed — is part of the same commit as the feature it grew.

---

## 6. Tier C smoke test plan

For each component, an isolation-screenshot will be captured by mounting it in a minimal HTML harness (per-component test page under `modules/Module 1.5 - Shared Components/architecture-brief/component-tests/SPEC_2/`). 8 component + 2 consumer-context screenshots = 10 total. Plan committed in CHANGELOG along with the component commits.

**Tier C VFV deferral path** (per SPEC 1 Author Proposal A-2 promoted): if 8-component Tier C runs into scope-bloat in this single session, the executor may defer Tier C VFV to opticup-localhost-tester (with explicit documentation in EXECUTION_REPORT §4) under the `🟡 CLOSED WITH ONE DEFERRED CRITERION` verdict variant. Strong preference is in-session Tier C for at least 4 of 8 components (the simpler ones — chip-filter, stat-card, group-header, wizard-step-indicator).

---

## 7. Execution sequence (commit plan refinement)

Per SPEC §10 + per Iron-Rule-12 risk above:

1. (this commit) `chore(spec): M1_5_SHARED_COMPONENTS_PHASE_0 — Rule 21 investigation`
2. `feat(shared/tokens): add mockup palette + source-band + progress + dark + gradient + toggle tokens (shared/css/tokens.css)` — foundation for all components
3. `feat(shared): chip-filter-row + chip-filter.css` — simplest component first
4. `feat(shared): stat-card-row + stat-card.css`
5. `feat(shared): group-header-row + table.css extensions for group rows`
6. `feat(shared): wizard-step-indicator + wizard-step-indicator.css`
7. `feat(shared): side-detail-panel + side-detail.css`
8. `feat(shared): extend table-builder.js for pagination + permission-gated columns + data-table.css extensions` (split-decision check at commit time)
9. `feat(shared): quick-receipt-drawer + quick-receipt.css` (split-decision check)
10. `feat(shared): lens-details-drawer + lens-details.css`
11. `docs(module-1.5): wire SPEC 2 components into GLOBAL_MAP + MODULE_MAP + SESSION_CONTEXT + ROADMAP + FILE_STRUCTURE` + Tier C smoke screenshots
12. `chore(spec): close M1_5_SHARED_COMPONENTS_PHASE_0 with retrospective`

**Total commits expected:** 11-12 (matches SPEC §3 criterion #2 expectation of 11+).

**Stop-on-deviation:** if at any commit the integrity gate fails, the pre-commit hook fires, or the line count exceeds 340 without a planned split → STOP, log to EXECUTION_REPORT §5, request guidance OR proceed only with explicit additional split commit ahead of feature commit.

---

## 8. Lessons applied from SPEC 1 close (FOREMAN_REVIEW)

- **A-1 applied:** mockup palette tokens are pinned in SPEC §0 already; this investigation extends the table to all 8 components' specific token needs (§2).
- **A-2 noted:** Tier C deferral path documented as optional path in §6 of this investigation.

---

*End of RULE_21_INVESTIGATION. The next commit ships `shared/css/tokens.css` per §7 commit #2.*
