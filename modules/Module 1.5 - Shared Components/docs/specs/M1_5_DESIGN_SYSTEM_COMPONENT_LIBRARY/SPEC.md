# SPEC — M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-10
> **Module:** 1.5 — Shared Components
> **Phase (in Design System initiative):** 2 of 4
> **Parent brief:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_BRIEF.md`
> **Depends on:** `M1_5_DESIGN_TOKENS_FOUNDATION` (Phase 1) — must be 🟢 CLOSED before this SPEC executes
> **Author signature:** opticup-strategic / 2026-05-10 design-system phase-2 draft

---

## 1. Goal

Verify that every component CSS file in `shared/css/` consumes ONLY tokens from `variables.css` — no hardcoded hex colors, no `var(--token, #fallback)` patterns with stale fallback hexes — and add a WCAG-AA-compliant `:focus-visible` baseline to every interactive element across Modal, Toast, TableBuilder, PIN modal, buttons, inputs, selects, textareas. JS component APIs (`Modal.show`, `Toast.success`, `TableBuilder.create`, `promptPin`) MUST remain bit-identical; this is a CSS-only restyle pass.

---

## 2. Background & Motivation

Phase 1 swapped `variables.css` to neutral defaults. But `shared/css/modal.css`, `forms.css`, `components.css`, etc. were written incrementally and contain `var(--color-X, #literalFallback)` patterns where the literal fallback was the OLD Indigo or a different Gray hex than what `variables.css` now declares (proven by grep at SPEC-author time: `modal.css` line 25 has `var(--color-bg-card, #ffffff)`, line 161 has `var(--color-primary, #1a237e)` — a navy hex that NO LONGER MATCHES variables.css and would render only if variables.css fails to load). Those fallbacks are dead code today but create three real problems: (a) audits report "hardcoded color" findings that aren't real, (b) if variables.css ever does fail to load, components silently render with WRONG colors (#1a237e navy header but #4f46e5-era Indigo buttons), (c) Iron Rule 9 (no hardcoded business values) is technically violated.

Additionally, the brief's Contract D (Accessibility minimum) requires every component to expose a visible `:focus-visible` style — many existing components use `:focus` (which lights up on mouse click too) instead of the WCAG-AA-friendly `:focus-visible` (keyboard-only). Auditing what's there vs what's needed is a Phase 2 deliverable.

Phase 2 is CSS-only. No JS, no DB, no HTML. The component JS APIs are CONTRACT-FROZEN by Brief Contract B.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Phase 1 SPEC closed | `M1_5_DESIGN_TOKENS_FOUNDATION` has `EXECUTION_REPORT.md` + `FINDINGS.md` + `FOREMAN_REVIEW.md` (or combined-review note) | `ls "modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/"` shows all 3 retros |
| 3 | Total commits produced | 5 commits | `git log origin/develop..HEAD --oneline \| wc -l` → 5 |
| 4 | Zero hardcoded hex literals inside `var(...)` fallbacks across `shared/css/` | 0 matches | `grep -rE "var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,8}\b" shared/css/ \| wc -l` → `0` |
| 5 | Zero raw hex literals outside `:root` in `shared/css/` | 0 matches | `grep -rE "^\s*[a-z-]+:\s*#[0-9a-fA-F]{3,8};" shared/css/ \| grep -v "variables.css" \| grep -v "/\*" \| wc -l` → `0` |
| 6 | `:focus-visible` selector present in components.css, forms.css, modal.css, table.css, toast.css | each file has at least 1 `:focus-visible` rule | `for f in shared/css/{components,forms,modal,table,toast}.css; do grep -c ":focus-visible" "$f"; done` → all ≥ 1 |
| 7 | Old `:focus { outline:` rules replaced by `:focus-visible { outline:` | no remaining `:focus\s*\{[^}]*outline:` that isn't also `:focus-visible` | `grep -rE ":focus\s*\{[^}]*outline" shared/css/` → only paired with `:focus-visible` siblings |
| 8 | New focus-ring token in variables.css | `--color-focus-ring: #0f172a` (defaults to primary; tenant override may set blue for high-contrast) | `grep "^\s*--color-focus-ring:" shared/css/variables.css` → exists |
| 9 | New focus-ring shadow token in variables.css | `--shadow-focus: 0 0 0 3px rgba(15, 23, 42, 0.35)` | `grep "^\s*--shadow-focus:" shared/css/variables.css` → exists |
| 10 | JS component API surface UNCHANGED | `Modal`, `Toast`, `TableBuilder`, `promptPin` global names + their method signatures identical to pre-SPEC | `git diff origin/develop..HEAD -- "shared/js/" \| wc -l` → `0` (no JS changes at all) |
| 11 | Component test pages render without errors | `shared/tests/ui-test.html`, `modal-test.html`, `toast-test.html`, `db-test.html`, `table-test.html`, `permission-test.html`, `activity-log-test.html` all open with zero console errors on demo + Prizma | Localhost-Tester runs Chrome over each test page, captures console; expected: 0 errors per page per tenant |
| 12 | Smoke test pass — demo tenant | `npm run smoke` exits 0 with all baseline tests PASS | `npm run smoke` → exit 0 |
| 13 | Visual: Modal renders with token-driven primary on both tenants | Prizma modal header BG = Indigo `#4f46e5`; demo modal header BG = demo's `ui_config` override (NOT Slate, NOT Indigo) | Localhost-Tester: open `modal-test.html` on `?t=prizma` and `?t=demo`, snapshot computed `background-color` on a wizard-step-active element |
| 14 | Visual: button focus-visible ring visible only on keyboard navigation | Tab to a `.btn` → ring visible; mouse-click on `.btn` → NO ring | Localhost-Tester: drive Tab key on ui-test.html, snapshot computed `box-shadow` includes `--shadow-focus` value; mouse-click → `box-shadow: none` |
| 15 | M1.5 MODULE_MAP.md updated | §1 file index lines for the 8 shared/css/ files show "Phase 2 design-system audit pass: zero fallback literals, focus-visible baseline added." note | `grep -n "Phase 2 design-system" "modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md"` → ≥ 1 hit |
| 16 | M1.5 CHANGELOG.md entry | new section dated 2026-05-1X referencing this SPEC slug | `grep -n "M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY" "modules/Module 1.5 - Shared Components/docs/CHANGELOG.md"` → ≥ 1 hit |
| 17 | M1.5 SESSION_CONTEXT.md updated | "Design System Phase 2" line present | `grep -n "Design System Phase 2" "modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md"` → 1 hit |
| 18 | EXECUTION_REPORT.md + FINDINGS.md present | files exist in SPEC folder | `ls` shows both |
| 19 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 20 | HEAD pushed to `origin/develop` | yes | `git rev-parse HEAD` === `git rev-parse origin/develop` |
| 21 | Clean tree at SPEC close | empty | `git status --short` → empty |
| 22 | File size cap (Iron Rule 12) | every `shared/css/*.css` file ≤ 350 lines | `wc -l shared/css/*.css \| awk '$1 > 350'` → empty |

**Authoring-time audit data captured (per BLOG_PRE_MERGE_FIXES Proposal 1 — re-enumerate before authoring):**
Grep at 2026-05-10 against HEAD `develop`: `var(--color-X, #hex)` patterns in `shared/css/modal.css` lines 25, 38, 44, 58, 69, 76, 77, 96, 97, 100, 106, 114, 123, 132, 141, 154, 155, 161, 165, 166, 169, 172, 173 — that's at minimum 23 in modal.css alone. Other shared/css/ files: executor MUST grep at SPEC-start time and capture in EXECUTION_REPORT §2 row 0 before any change. The total count is the rollback baseline AND the criterion-#4 zero-target. Phase 1's value swap (Phase 1 commits 1+2) means many of the stale fallback hexes (e.g. `#1a237e`) are even FURTHER from current truth — Phase 2's value here is even higher than at brief-write time.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Edit every file in `shared/css/` to (a) remove the `, #fallback` part of every `var(...)` call — making `var(--color-X)` the only form, (b) introduce `:focus-visible` rules where missing, (c) replace existing `:focus { outline: ... }` rules with `:focus-visible { outline: ..., box-shadow: var(--shadow-focus) }`.
- Add 2 new tokens to `shared/css/variables.css`: `--color-focus-ring` and `--shadow-focus` (see §8).
- Run `npm run smoke`, `npm run verify:integrity`, `npm run verify --staged`.
- Commit and push per §9.
- Skip any file already at zero `var(...,fallback)` patterns AND already using `:focus-visible` — note as VERIFY-ONLY in EXECUTION_REPORT §2.
- Apply executor-improvement proposals from BLOG_PRE_MERGE_FIXES, M4_CLOSURE, M4_HARDCODED_DEMO_PHONE_CLEANUP that are still applicable.

### What REQUIRES stopping and reporting
- Any file in `shared/js/` modified — JS APIs are CONTRACT-FROZEN.
- Any page CSS (`css/inventory.css`, `css/employees.css`, etc.) modified — those are page-level, not shared-components scope.
- Any new component invented (button variant, modal type, toast type that didn't exist) — Phase 2 is restyle, not add.
- `shared/css/variables.css` modified beyond adding `--color-focus-ring` + `--shadow-focus` — other token changes belong to Phase 4.
- `shared/tests/*.html` modified — those are reference fixtures.
- Any file > 350 lines after edit — Iron Rule 12.
- A `:focus-visible` rule whose `outline` would render INVISIBLE against the element's background (focus indicator that fails WCAG 2.4.7) — STOP and report. Don't ship a focus style that doesn't actually focus.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If Phase 1 SPEC is NOT in `🟢 CLOSED` state at execution start → STOP (this SPEC builds on Phase 1's token values).
- If `shared/css/variables.css` does NOT contain `--color-primary: #0f172a` at execution start → STOP (Phase 1 didn't deliver what Phase 2 assumes).
- If `git diff origin/develop..HEAD -- "shared/js/"` ever returns non-empty during execution → STOP (JS contract violated).
- If criterion #4 grep returns > 0 after Commit 3 → STOP and re-audit (one slipped through; don't ship).
- If criterion #14 visual test shows focus ring present on mouse-click → STOP (`:focus` regression hiding inside `:focus-visible`).
- If any `shared/css/*.css` file's line count exceeds 350 after edits → STOP and ask Foreman whether to split (Iron Rule 12).

---

## 6. Rollback Plan

If the SPEC fails partway:
1. `git reset --hard {START_COMMIT}` — START_COMMIT captured in EXECUTION_REPORT §1 BEFORE the first edit.
2. No DB changes in this SPEC → no DB rollback.
3. Notify Foreman; SPEC marked REOPEN.

The 5-commit plan in §9 is designed so partial-rollback is possible — Commits 1–4 are independent passes (each on a different file or concern), so a single bad commit can be `git revert`ed individually.

---

## 7. Out of Scope (explicit)

- **JS code** (`shared/js/*.js`) — frozen by Brief Contract B.
- **DOM structure** of any test page — no HTML edits in `shared/tests/`.
- **Page CSS** (`css/inventory.css`, `css/shipments.css`, `css/employees.css`, `css/settings.css`) — those are page-scope, not shared. They'll be touched in per-module migration SPECs (not in this initiative).
- **New variables in variables.css** beyond `--color-focus-ring` + `--shadow-focus`. (Rationale: enlarging the token namespace is Phase 4's tenant-theming scope, not Phase 2's audit-pass scope.)
- **3-direction mockups** — Phase 3 work.
- **axe-core integration into smoke test** — Phase 4 work; this SPEC writes focus-visible rules but does NOT enforce axe-core CI.
- **`styles.css` (legacy)** — still used by `suppliers-debt.html`; out of scope per M1.5 SESSION_CONTEXT.md (deferred to finance module migration).
- **Storefront repo** — out of scope.
- **Tenant ui_config rows** — no DB writes in Phase 2.

---

## 8. Expected Final State

### Modified files

#### `shared/css/variables.css`

ADD 2 new tokens at the end of the existing `:root` block, just before the closing `}` brace (after the Transitions section at line ~160):

```css
  /* =========================================================================
     11. FOCUS — accessibility (Phase 2 — Design System)
     Source: WCAG 2.4.7 (Focus Visible) + Brief Contract D
     ========================================================================= */
  --color-focus-ring:     var(--color-primary);  /* tracks primary by default; tenant can override to a contrasting color */
  --shadow-focus:         0 0 0 3px rgba(15, 23, 42, 0.35);  /* 3px ring, near-black at 35% — visible on light AND on primary-colored backgrounds */
```

#### `shared/css/modal.css`, `forms.css`, `components.css`, `components-extra.css`, `layout.css`, `table.css`, `toast.css`

For each file:
1. Replace every `var(--TOKEN, #LITERAL)` with `var(--TOKEN)` — remove the `, #LITERAL` part. Examples from current `modal.css`:
   - `var(--color-bg-card, #ffffff)` → `var(--color-bg-card)`
   - `var(--color-primary, #1a237e)` → `var(--color-primary)`
   - 23 known sites in modal.css alone (see §3 row 0).
2. Wherever a `:focus { outline: ... }` rule exists, replace with:
   ```css
   .selector:focus { outline: none; }  /* visual handled by :focus-visible below */
   .selector:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; box-shadow: var(--shadow-focus); }
   ```
   Apply to: `.btn`, all input variants in `components.css`/`forms.css`, `.modal-close-btn`, `.toast-close-btn`, `.tb-th-sortable`, all sortable headers in `table.css`.
3. For elements that had NO focus rule at all but ARE interactive (anything with `cursor: pointer`, anything tabbable), ADD a `:focus-visible` rule using the same template.

#### `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md`

In §1 File Index — shared/css/, append to each affected row's "Responsibility" cell: ` Phase 2 design-system audit pass (2026-05-11): zero var() fallback literals; :focus-visible baseline.`

#### `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`

Prepend a new section:

```markdown
## 2026-05-1X — Design System Phase 2: Component library token-only + focus-visible baseline

SPEC: `M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY` ([folder](specs/M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/))

- All 7 component CSS files (modal/forms/components/components-extra/layout/table/toast) now use bare `var(--token)` references — no `, #fallback` literals left. variables.css is the only source of color truth.
- New tokens: `--color-focus-ring` (tracks primary), `--shadow-focus` (3px near-black ring at 35% opacity). WCAG 2.4.7 baseline.
- `:focus-visible` replaces bare `:focus` on every interactive element across all 7 files. Mouse-click no longer triggers a focus ring; keyboard Tab does.
- JS APIs UNCHANGED (Modal/Toast/TableBuilder/promptPin frozen per Brief Contract B).

Rationale: prep for Phase 3 (3-direction mockups) — directions can override `--color-focus-ring` per-direction without touching JS.
```

#### `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`

Update Last-updated line + prepend Phase-2 section before existing 2026-05-11 Phase-1 section.

### New files
- `EXECUTION_REPORT.md` + `FINDINGS.md` inside this SPEC folder (written by executor at close).

### Deleted files
None.

### DB state
No DB changes.

### Docs updated (MUST include — per M4_CLOSURE Proposal 2)
- `MODULE_MAP.md` (M1.5) ✅
- `CHANGELOG.md` (M1.5) ✅
- `SESSION_CONTEXT.md` (M1.5) ✅
- `MASTER_ROADMAP.md` — APPEND one line under §3 noting Design System Phase 2 closed.
- `docs/GLOBAL_MAP.md` — NO change (no new functions/contracts).
- `docs/GLOBAL_SCHEMA.sql` — NO change (no DDL).

### File classification (MUST / MAY / VERIFY-ONLY)
- **MUST-EDIT:** `shared/css/variables.css`, `shared/css/modal.css`, `shared/css/forms.css`, `shared/css/components.css`, `shared/css/components-extra.css`, `shared/css/layout.css`, `shared/css/table.css`, `shared/css/toast.css`, `MODULE_MAP.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md`, `MASTER_ROADMAP.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`.
- **MAY-EDIT (conditional):** none — all 7 CSS files are MUST-EDIT (they ALL have fallback literals per the grep audit; if any one comes back zero-fallback at start, downgrade to VERIFY-ONLY in EXECUTION_REPORT and document why).
- **VERIFY-ONLY:** every file under `shared/js/`, every file under `shared/tests/`, every file under `css/` (page CSS), `js/pin-modal.js` redirect file, `suppliers-debt.html`'s legacy `styles.css` reference (untouched). Touching any of these = stop-trigger.

---

## 9. Commit Plan

- **Commit 1** — `feat(m1.5): add --color-focus-ring + --shadow-focus tokens (Design System Phase 2)`
  Files: `shared/css/variables.css` (additions only — no token-value changes).

- **Commit 2** — `refactor(m1.5): remove var() fallback literals across shared/css/ — variables.css is single source`
  Files: `shared/css/modal.css`, `forms.css`, `components.css`, `components-extra.css`, `layout.css`, `table.css`, `toast.css`. CSS-only, no behavior change.

- **Commit 3** — `feat(m1.5): :focus-visible baseline for all interactive elements (WCAG 2.4.7)`
  Files: same 7 component CSS files.

- **Commit 4** — `docs(m1.5): Phase 2 — MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP`
  Files: M1.5 MODULE_MAP.md, CHANGELOG.md, SESSION_CONTEXT.md, MASTER_ROADMAP.md.

- **Commit 5** — `chore(spec): close M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY with retrospective`
  Files: this SPEC folder's EXECUTION_REPORT.md + FINDINGS.md.

Push after Commit 5. If any commit fails the Integrity Gate or any verify-after-commit grep, STOP and report.

---

## 10. Dependencies / Preconditions

- `M1_5_DESIGN_TOKENS_FOUNDATION` (Phase 1) must be 🟢 CLOSED.
- `shared/css/variables.css` `--color-primary` value === `#0f172a` (verifies Phase 1 landed correctly).
- `npm run smoke` was passing before Phase 1 (verified by Phase 1's criterion #18) and is still passing at Phase 2 start.
- `localhost:3000` (ERP) and `localhost:4321` (Storefront) reachable for Localhost-Tester verification.

---

## 11. Lessons Already Incorporated

- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 1 (re-enumerate prior counts) → APPLIED — §3 row 0 captures the live grep count of `var() fallback` patterns at SPEC-start; executor must record actuals before any change so the criterion #4 zero-target is provable against a known baseline.
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 2 (name ONE canonical form) → APPLIED — §8 explicitly names `var(--TOKEN)` (bare, no fallback) as THE canonical form. The `var(--TOKEN, #fallback)` form is what's being eliminated, not "either is OK."
- FROM `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` Proposal 2 (MASTER_ROADMAP touch) → APPLIED — §8 Docs updated.
- FROM `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` Executor Proposal 1 (re-run grep AFTER commit) → APPLIED — criterion #4 explicitly post-commit grep; executor pastes output into EXECUTION_REPORT §2 after Commit 2 AND after Commit 3.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 1 (criterion vs §5 template literal scan) → APPLIED — every example hex in §8 (e.g. `#0f172a`, `#1a237e`, `#ffffff`) was scanned against §3 criteria: §3 row #5 forbids raw hex outside `:root` — the literals in §8 examples are all SHOWN as values being REMOVED, never written into final state.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 2 (CHANGELOG always in scope) → APPLIED.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Executor Proposal 2 (MUST/MAY/VERIFY classification) → APPLIED in §8.

**Cross-Reference Check (Iron Rule 21):** completed 2026-05-10 against GLOBAL_SCHEMA.sql + GLOBAL_MAP.md + DB_TABLES_REFERENCE.md + FILE_STRUCTURE.md + module map. New names introduced: `--color-focus-ring` (0 collisions across repo), `--shadow-focus` (0 collisions across repo), `:focus-visible` (CSS pseudo-class — standard, no collision). SPEC slug `M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY` (0 collisions in `modules/Module 1.5 - Shared Components/docs/specs/`). **0 collisions / 0 hits resolved.**

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** exit 0 or 2.
- [ ] `git status --short` empty.
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT.md + FINDINGS.md in SPEC folder.
- [ ] M1.5 docs (MODULE_MAP, CHANGELOG, SESSION_CONTEXT) updated.
- [ ] MASTER_ROADMAP touched (Phase 2 close line).
- [ ] Smoke + visual tests pass on both tenants.
- [ ] Zero JS diff: `git diff origin/develop..HEAD -- "shared/js/"` returns empty.

---

## 13. Hand-off to next phase

After this SPEC closes 🟢:
- Phase 3 (`M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS`) becomes unblocked.
- Components are now token-driven cleanly; any of the 3 directions can override tokens at the direction-folder level without touching component CSS.
- Focus indicators meet WCAG 2.4.7 baseline; directions can THEME the ring color but not REMOVE it.
- Per Daniel directive 2026-05-10 (this session): the combined FOREMAN_REVIEW for Phases 1–4 will be written at the end of Phase 4, covering all four. Each phase still produces its own EXECUTION_REPORT.md + FINDINGS.md.
