# SPEC — M1_5_SHARED_COMPONENTS_PHASE_0

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_SHARED_COMPONENTS_PHASE_0/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-17
> **Module:** 1.5 — Shared Components (consumed by Module 1 lens screens)
> **Phase:** Lens rebuild Phase 0 — Foundation (SPEC 2 of 4 sequential)
> **Author signature:** Claude Code Foreman session, Windows desktop, 2026-05-17
> **Source Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md` §SPEC 2

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-17.
- SPEC 1 (`M1_LENS_PALETTE_RETIRE_UNIFIED`) closed 🟡 with `lens-tabs.css` palette aligned to mockups — this SPEC inherits the corrected palette.
- **Rule 21 (No Orphans, No Duplicates) cross-reference sweep performed at SPEC authoring time:**

| Existing `shared/js/` file | Possible overlap with Brief's SPEC 2 component | Executor pre-flight verdict required |
|---|---|---|
| `table-builder.js` | Brief's `data-table.js` (component 6) | **HIGH overlap likely** — executor must read this file in pre-flight and decide: extend / replace+delete / new. If extend → SPEC.md additions are EXTENSIONS not replacements. If replace → declare destructive op + migration plan. |
| `sort-utils.js` | Brief's `data-table.js` (sortable column support) | Likely already covers sortable. Integrate, do not re-implement. |
| `cat-sidebar.js` | None directly — different concept (category sidebar vs cross-tab primitives). Confirm at executor time. | LOW overlap; standalone primitive. |
| `modal-builder.js` | Brief's `quick-receipt-drawer.js` (component 7) + `lens-details-drawer.js` (component 8) | **MEDIUM overlap** — drawers are right-pinned modal variants. May extend modal-builder rather than create separate primitives. Executor decides. |
| `modal-wizard.js` | Brief's `wizard-step-indicator.js` (component 4) | **HIGH overlap likely** — wizard-step-indicator is the visual primitive; modal-wizard may already provide both UI + state. Executor decides: separate concerns (indicator stays presentation-only) OR consolidate. |
| `catalog-private-admin.js` | None for SPEC 2 directly — this is M1 lens consumer, not a shared primitive | Confirm. |
| `pin-modal.js`, `toast.js`, `activity-logger.js`, `theme-loader.js`, `table-resize.js`, `supabase-client.js`, `permission-ui.js`, `plan-helpers.js` | Tangential — confirm at executor time. | LOW overlap. |

**Existing `shared/css/`** likely contains tokens that SPEC 2 wants to add. The executor MUST read `shared/css/variables.css` + `shared/css/components.css` in pre-flight and merge new tokens into the appropriate file rather than creating duplicates.

**Critical Rule 21 enforcement:** the Brief's "8 components to build" is a TARGET set, not an authorization to build duplicates. The executor's pre-flight Step 1.5 (per opticup-executor SKILL.md) MUST cross-reference each Brief-named component against existing `shared/js/` + `shared/css/` and produce a per-component verdict: extend / replace+migrate / new. This SPEC documents the Brief's intent; the executor's first commit MUST be a written `RULE_21_INVESTIGATION.md` artifact under this SPEC folder before any new code lands.

- **Mockup palette tokens pinned** (per SPEC 1 Author Proposal #1 just promoted):
  - Gold active: `#c9a555`
  - Gold dark: `#b8954a`
  - Gold tint: `#faf3e0`
  - Mockup neutrals: `#5d6d7e` (chip text), `#475569` (table-header text), `#f8f9fb` (table-header bg), `#94a3b8` (muted), `#64748b` (label)
  - Status palette (already in lens-tabs.css after SPEC 1): chip-draft / chip-sent / chip-partial / chip-received / chip-overdue / chip-cancelled

- **Source-band tokens** (currently missing in shared/css, required by PO + GR mockups):
  - `--src-purple-bg: #faf5ff` / `--src-purple-fg: #6d28d9` (custom-for-customer rows)
  - `--src-blue-bg: #eff6ff` / `--src-blue-fg: #1e3a8a` (stock/shortage rows)
  - `--src-amber-bg: #fffbeb` / `--src-amber-fg: #92400e` (manual rows)

- **Pre-existing untracked files surveyed:** none new beyond what's already tracked. Leave alone.

### Lessons applied from prior SPECs

- **From `M1_5_CAT_SIDEBAR_COMPONENT/FOREMAN_REVIEW.md`:** the component extraction pattern (cat-sidebar → shared) used a 2-step approach: (1) extract CSS to `shared/css/cat-sidebar.css`, (2) extract JS module to `shared/js/cat-sidebar.js` with init() API. This SPEC mandates the same pattern.
- **From `M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/`:** there's been prior design-system work — executor MUST read this SPEC folder's outputs in pre-flight to avoid re-building primitives that already exist in some form.
- **From this Pipeline's SPEC 1 (M1_LENS_PALETTE_RETIRE_UNIFIED) FOREMAN_REVIEW.md:** Author Proposal A-1 (pin mockup palette tokens in §0 Baselines) was applied above. Author Proposal A-2 (`🟡 CLOSED WITH ONE DEFERRED CRITERION` verdict variant) is available for use if Tier C is deferrable.

### Baselines

| Symbol | File | Metric | Value (captured 2026-05-17) |
|---|---|---|---|
| `BASE_SHARED_JS_FILES` | `shared/js/` | `ls shared/js/*.js \| wc -l` | 14 |
| `BASE_SHARED_CSS_FILES` | `shared/css/` | `ls shared/css/*.css \| wc -l` | 10 |
| `BASE_GLOBAL_MAP_LINES` | `docs/GLOBAL_MAP.md` | `wc -l` | (captured at executor pre-flight) |

---

## 1. Goal

Build (or extend, per Rule 21 investigation) the foundation set of shared UI components in Module 1.5 that the 6 subsequent lens screen rebuilds (SPECs 4-9) consume. Honors Iron Rule 21 by reusing/extending existing `shared/` infrastructure where possible and only building net-new components for primitives not already covered.

---

## 2. Background & Motivation

The audit `M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md` §9.2 identified 5 visual primitives appearing in 3+ mockups that should be extracted to Module 1.5 BEFORE per-screen rebuilds, to avoid duplicating the primitives 6 times (Iron Rule 21 violation). The Brief expanded this to 8 components after planning analysis. Without this Phase 0 foundation, each of the 6 screen-rebuild Pipelines would re-implement the same chip-filter / stat-card / side-panel patterns, multiplying maintenance debt.

**SPEC 4a depends on this SPEC's quick-receipt-drawer + lens-details-drawer + data-table-column-permission components.** SPECs 4-9 each depend on the chip-filter + stat-card + side-detail-panel components.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | `develop`, clean post-push | `git status` → "nothing to commit" |
| 2 | Commits produced | 1 + 8N + 1 + 1 = 11+ (author + 1 per-component + tokens + close) | `git log {SPEC_START}..HEAD --oneline \| wc -l` |
| 3 | `RULE_21_INVESTIGATION.md` exists in SPEC folder | file present, ≥ 100 lines | `wc -l <path>` |
| 4 | Per-component verdict recorded | for each of the 8 Brief-named components: extend / replace+migrate / new — with file paths cited | grep verdict markers in RULE_21_INVESTIGATION.md |
| 5 | New / extended files exist under `shared/js/` + `shared/css/` | per component verdicts in §4 | `ls` exits 0 for each |
| 6 | All new components registered in `docs/GLOBAL_MAP.md` | each has a §entry | grep component name in GLOBAL_MAP.md |
| 7 | Source-band CSS tokens added | tokens in `shared/css/variables.css` | grep `--src-purple-bg` etc. |
| 8 | Iron Rule 12 — no shared file > 350 lines | all new/extended files ≤ 350 lines | `wc -l shared/{js,css}/*` |
| 9 | Iron Rule 21 — no orphans of replaced files | if any "replace+migrate" verdict: old file is DELETED in same commit as new file ships | `ls` of expected-deleted files exits 1 |
| 10 | Module 1.5 SESSION_CONTEXT + MODULE_MAP + ROADMAP updated | files reflect SPEC 2 closure | grep SPEC name in each |
| 11 | Tier C smoke — each component renders in isolation + 2 usage examples (one per consumer screen, e.g. lens-inventory uses quick-receipt-drawer) | Chrome MCP screenshots in SPEC folder | screenshots/ subdir present |
| 12 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| 13 | Pre-commit hooks clean per commit | 0 violations, 0 warnings | committed commits' pre-commit output |
| 14 | EXECUTION_REPORT + FOREMAN_REVIEW written | files exist in SPEC folder | `ls` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Create new files under `shared/js/`, `shared/css/`
- EXTEND existing files in `shared/js/`, `shared/css/` (additive)
- Run read-only SQL (Level 1 autonomy) — no DB writes in this SPEC
- Commit and push to `develop`
- Decide extend / replace+migrate / new per component based on Rule 21 investigation
- Update Module 1.5 docs (SESSION_CONTEXT, MODULE_MAP, ROADMAP)

### What REQUIRES stopping and reporting
- Any "replace+migrate" verdict — the deletion of an existing `shared/` file is a destructive op per Iron Rule 32. The SPEC.md §Destructive Operations is `None.` by default; if executor's pre-flight finds a "replace" verdict for any component, executor STOPS and escalates a SPEC amendment proposal.
- Any consumer-screen change (lens-inventory.html, etc.) — those are SPECs 4-9, not this SPEC
- DB writes — not in scope
- Any merge to `main`
- Component API contradicting the Brief's listed API without justified rationale

### Component-by-component Brief intent (executor expands)

For each, the executor's pre-flight produces:
- Verdict: extend / replace+migrate / new
- If extend: which existing file + what to add
- If new: file path + API contract + estimated lines
- If replace: deletion plan + migration plan

| # | Brief-named component | Brief estimate | Brief API hint |
|---|---|---|---|
| 1 | `chip-filter-row.js` + `chip-filter.css` | ~1h | `ChipFilter.init(container, { chips, onSelect, multiSelect })` |
| 2 | `stat-card-row.js` + `stat-card.css` | ~1h | `StatCardRow.init(container, { cards, onCardClick })` |
| 3 | `side-detail-panel.js` + `side-detail.css` | ~1.5h | `SideDetailPanel.init(container, { title, headerVariant, sections })` |
| 4 | `wizard-step-indicator.js` + `wizard.css` | ~1.5h | `WizardSteps.init(container, { steps, activeIndex, onStepClick })` |
| 5 | `group-header-row.js` | ~0.5h | `GroupHeaderRow.render(sourceType, label, count)` |
| 6 | `data-table.js` + `data-table.css` | ~2h | `DataTable.init(container, { columns, data, sortable, pagination, permissions, onRowAction })` — supports `data-permission` on `<th>` + `<td>` |
| 7 | `quick-receipt-drawer.js` + `quick-receipt.css` | ~2h | `QuickReceiptDrawer.init(container, { onSubmit, onCancel })` — wraps the markup already in LENS_INVENTORY_MOCKUP.html |
| 8 | `lens-details-drawer.js` + `lens-details.css` | ~2h | `LensDetailsDrawer.init(container, { variantId, mode: 'edit'|'readonly' })` — wraps the markup already in LENS_PRICING_MOCKUP.html |

### Token additions (always net-new — no overlap)

To `shared/css/variables.css` or `shared/css/tokens.css` (executor decides which):
- Source-band tokens (`--src-purple-*`, `--src-blue-*`, `--src-amber-*`)
- Progress-bar tokens (`--progress-bg`, `--progress-fg`, `--progress-fill-success`, `--progress-fill-partial`, `--progress-fill-empty`)
- Dark theme palette (`--dark-bg: #0f172a; --dark-panel: #1e293b; --dark-border: #334155; --dark-text: #e2e8f0;`) — required by catalog-admin screen rebuild (SPEC 9)
- Gradient header card (`--gradient-header: linear-gradient(135deg, #c9a555 0%, #b8954a 100%);`)
- Toggle-switch widget tokens (per LENS_DESIGNS_SELECTION_MOCKUP)

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- If Rule 21 investigation finds a "replace+migrate" verdict for any component → STOP, escalate SPEC amendment (the destructive op needs explicit authorization)
- If any new component file exceeds 350 lines (Iron Rule 12) → STOP, split before continuing
- If any existing consumer (lens-inventory which is currently at 1:1) breaks due to a shared component API change → STOP, this SPEC must not regress existing work
- If Tier C smoke can't render any new component in isolation → STOP, the component's API is incorrect

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:
- `git reset --hard {SPEC_START}` where SPEC_START = the commit hash before the SPEC authoring commit (record in EXECUTION_REPORT)
- No DB changes in this SPEC — no DB rollback needed
- Notify Foreman; SPEC marked REOPEN

---

## 7. Destructive Operations

`None.` (default — no file deletes authorized at SPEC authoring time)

**EXCEPTION pathway:** if executor's Rule 21 investigation produces a "replace+migrate" verdict for any component (e.g., `data-table.js` replacing `table-builder.js`), executor STOPS and writes an escalation file at `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_data_table_replace_table_builder.md` with the migration plan. Foreman amends §Destructive Operations of this SPEC.md with the explicit deletion authorization + migration commit before executor proceeds. No silent replacement.

---

## 8. Out of Scope (explicit)

- Consumer-screen rebuilds (SPECs 4-9) — only the shared primitives, not their wiring into screens
- DB schema changes — that's SPEC 3
- The Inventory screen update (SPEC 4a) — that's the next sequential SPEC
- Any change to existing consumer-screen code (lens-inventory.* files)
- Any change outside `modules/Module 1.5 - Shared Components/`, `shared/`, `docs/`

---

## 9. Expected Final State

### Rule 21 Investigation artifact (mandatory first deliverable)

- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_SHARED_COMPONENTS_PHASE_0/RULE_21_INVESTIGATION.md`
  - Per-component verdict table
  - For each "extend": file + line range to modify, additive content
  - For each "new": file path + reason no existing file covers
  - For each "replace+migrate" (if any): blocker → escalation file required

### Per-component file outcomes (executor produces, format depends on verdict)

Per the Brief's 8 components, each maps to one of:
- **Extend** existing `shared/js/<file>.js` + `shared/css/<file>.css` (no new files)
- **New** `shared/js/<component>.js` + `shared/css/<component>.css`
- **Replace+migrate** (blocked pending Foreman amendment)

### Token additions

- `shared/css/variables.css` (extend) OR new `shared/css/tokens.css` (executor decides) with the source-band / progress / dark / gradient / toggle tokens listed in §4

### Module 1.5 docs (updated)

- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` (single entry)
- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` (per-component entries)
- `modules/Module 1.5 - Shared Components/ROADMAP.md` (mark SPEC 2 ✅)

### Cross-module docs (updated)

- `docs/GLOBAL_MAP.md` — per-component §entries under "Module 1.5 — Shared Components"
- `docs/FILE_STRUCTURE.md` — new file paths under `shared/js/` + `shared/css/`

### New SPEC folder artifacts

- `SPEC.md` (this file)
- `RULE_21_INVESTIGATION.md` (first deliverable)
- `EXECUTION_REPORT.md` (at close)
- `FINDINGS.md` (if findings)
- `FOREMAN_REVIEW.md` (at close)
- `screenshots/` (Tier C evidence)

---

## 10. Commit Plan

| # | Subject | Trigger |
|---|---------|---------|
| 1 | `chore(spec): author M1_5_SHARED_COMPONENTS_PHASE_0 SPEC` | SPEC.md authoring |
| 2 | `chore(spec): M1_5_SHARED_COMPONENTS_PHASE_0 — Rule 21 investigation` | RULE_21_INVESTIGATION.md drop after executor pre-flight |
| 3-10 (up to 8) | `feat(shared): <component>.js + <component>.css per M1_5_SHARED_COMPONENTS_PHASE_0` | One commit per component (extend or new) — verdict-driven |
| N | `feat(shared/tokens): add source-band + progress + dark + gradient + toggle tokens` | Token additions commit |
| N+1 | `docs(module-1.5): GLOBAL_MAP + MODULE_MAP + SESSION_CONTEXT for SPEC 2 closure` | Doc-update commit |
| N+2 | `chore(spec): close M1_5_SHARED_COMPONENTS_PHASE_0 with retrospective` | EXECUTION_REPORT + FOREMAN_REVIEW + screenshots/ |

Total: 11-12 commits expected.

---

## 11. Dependencies / Preconditions

- **Previous SPEC:** SPEC 1 (`M1_LENS_PALETTE_RETIRE_UNIFIED`) must be closed — done as of 2026-05-17 (commit `0949e97`)
- **Tools:** standard Bash + Edit + Chrome MCP for Tier C smoke
- **No DB writes** (this SPEC is UI-layer only)
- **Repo on develop**, integrity gate clean (confirmed at SPEC authoring time)

---

## 12. Lessons Already Incorporated

- **FROM** `M1_5_CAT_SIDEBAR_COMPONENT/FOREMAN_REVIEW.md` → "extract pattern: CSS first, JS second with init() API" → APPLIED in §9 component file structure
- **FROM** `M1_LENS_PALETTE_RETIRE_UNIFIED/FOREMAN_REVIEW.md` Author Proposal A-1 (pin mockup palette tokens in §0) → APPLIED in §0 Mockup palette tokens pinned
- **FROM** opticup-strategic SKILL.md SPEC Authoring Protocol §1.5 (Cross-Reference Check) → APPLIED in §0 Rule 21 sweep + pushed to executor's pre-flight for actual file-content cross-references
- **FROM** Iron Rule 21 enforcement at author time → APPLIED by NOT pretending the Brief's 8 components are all net-new; explicitly flagging overlap candidates and requiring per-component verdicts before any new code lands

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2
- [ ] `git status --short` returns empty after closure commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT.md + FOREMAN_REVIEW.md written in the SPEC folder
- [ ] Module 1.5 + cross-module docs updated per §9 expected final state
- [ ] Tier C screenshots/ subdir populated (≥ 8 component-in-isolation + ≥ 2 consumer-context screenshots)

---

## 14. Authoring Note — Why This SPEC Was Authored But Not Executed In The Same Session

(Foreman transparency note for the executor + Daniel reviewer.)

This SPEC was authored by opticup-strategic during the M1 lens mockup-fidelity rebuild Pipeline marathon on 2026-05-17 (after SPEC 1 closure). The Brief estimates execution at 7-8h; the Brief also pre-warns that a real Rule 21 investigation against existing `shared/` may surface "replace+migrate" verdicts that block silent execution.

The Foreman judged that this SPEC's execution is properly a dedicated session, not a sub-step in a multi-SPEC marathon. The risk is:

- **Quality:** rushing 8 components in a single context risks shallow API design + missed Rule 21 overlaps
- **Reversibility:** components shipped poorly need refactor SPECs to fix; better to ship slowly + well
- **Tester load:** Tier C smoke for 8 components is itself a multi-hour task; collapsing it into the same session as authoring risks shortcuts

**Recommended execution path:**

1. Open a fresh opticup-executor session
2. Read this SPEC + the Brief
3. Step 1.5 DB Pre-Flight (none needed — no DB changes) + Rule 21 deep-dive against existing `shared/js/` + `shared/css/`
4. Write `RULE_21_INVESTIGATION.md` as first commit
5. Per-component execution (extend or new) in sequence
6. Tokens + docs + closure as planned in §10

The SPEC's success criteria are measurable; the executor inherits a clear plan + the Brief's design intent. This authoring-without-execution pattern is honest hand-off, not abandoned work.

---

*End of SPEC. Authored 2026-05-17 by opticup-strategic (Foreman) — execution deferred to dedicated session.*
