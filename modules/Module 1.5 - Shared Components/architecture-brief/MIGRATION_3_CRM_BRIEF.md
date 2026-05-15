# Production Migration #3 — CRM Navy Accent Addition

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 1.5
**Target file:** `crm.html` + `css/crm*.css` (production ERP CRM)

---

## 1. Purpose

Third of 4 production-page migrations. CRM is the largest production page (419 lines HTML + 4 CSS files + 74 JS files).

**Discovery from pre-flight inspection 2026-05-11:** CRM is ALREADY using a modern, neutral palette — Slate 900 (`#0f172a`) per `--color-primary`, Slate-tones across the board. The legacy purple-deep (`#26215C`) is NOT present in CRM CSS. Daniel's decision after seeing this: do NOT do a full Migration; add Navy accent ONLY in the right places.

Goal: minimal-touch enhancement. Navy (`#1e3a8a`) becomes the accent color in CRM for: primary action buttons, active nav indicator, focus rings, selected-row backgrounds, badge accents, hover states. Slate 900 stays as the primary text/bg color. Everything else stays as-is.

## 2. Strategy: Add Accent, Don't Replace Palette

### What changes
1. **Navy accent insertion** in `css/crm.css` + `css/crm-components.css` + `css/crm-screens.css` + `css/crm-visual.css`:
   - Primary action buttons (`.btn-primary`, `.crm-btn-primary`, "צור ליד" "+", etc.) — background → `#1e3a8a` (Navy)
   - Active nav item indicator — left-border or background → `#1e3a8a` or `--accent-soft #e6f1fb`
   - Focus rings on inputs/buttons → `#1e3a8a` outline
   - Selected row in tables — background → `--accent-soft #e6f1fb`
   - Badge accent / unread indicator → `#1e3a8a` or `--accent-soft`
   - Sidebar active item background → `--accent-soft #e6f1fb` (already-modern + Navy adds the family-marker)
   - Tab active indicator — `#1e3a8a` underline
2. **New Navy tokens added** to `shared/css/variables.css`:
   - `--accent` `#1e3a8a` (alias for Navy)
   - `--accent-hover` `#1e40af`
   - `--accent-soft` `#e6f1fb`
   - `--accent-text` `#ffffff`
   (only if not already added by Migrations #1 / #2)

### What does NOT change
- Slate 900 stays as `--color-primary` for body text
- Slate 100/200/300/etc stays for borders, dividers, surface tints
- Sidebar dark theme (dark navy sidebar with white text) — NO CHANGE; that was an intentional design choice
- Page background, card background — NO CHANGE
- DOM structure — NO CHANGE
- All 74 JS files — ZERO CHANGES
- All event handlers, IDs, data attributes
- Supabase RPC calls, RLS, tenant_id flow
- The 5 sub-screen layouts in `crm-screens.css` — NO STRUCTURAL CHANGE

### Visual reference
`modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/crm.html` informs WHICH elements get Navy. The mockup's structural layout is NOT the migration target — production CRM's layout stays as it is.

## 3. Functional Preservation

For each accent-color change, the Executor MUST verify:
1. Element still visible (no contrast issues — Navy on white = AA contrast OK; Navy on near-black sidebar = poor, so sidebar accent uses `--accent-soft` or stays Slate-toned)
2. Hover/focus/active states all still distinguishable from default
3. No CSS specificity wars (Navy override actually applies)

### Localhost verification (MANDATORY)
1. Page loads at `localhost:3000/crm.html` on demo tenant
2. Sidebar nav: each nav item is distinct from active item
3. Primary buttons ("+ ליד חדש", "+ אירוע חדש") are visibly Navy
4. Click a table row → background changes to `--accent-soft`
5. Click "צור" → form opens, focus ring is Navy
6. Active tab indicator is Navy
7. Console: 0 errors

If ANY behavior breaks → `git revert HEAD~1` + STOP + escalate.

## 4. Scope — Out

- Sidebar dark background — STAYS DARK (Slate 800/900)
- Any structural HTML changes — out
- JS changes — out
- DB or Supabase changes — out
- The 4 CSS files' rule SELECTORS — stay; only RULE BODIES update with accent values
- Adding new components or removing existing ones — out
- M1 Inventory — Daniel directive, no touch
- Other migrations (Storefront Studio is #4)

## 5. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Navy accent insertion only — NOT full palette replacement | Daniel 2026-05-11 |
| 2 | Slate 900 stays as primary text color | Architect 2026-05-11 |
| 3 | Sidebar dark theme stays — uses `--accent-soft` for active item | Architect 2026-05-11 |
| 4 | New Navy tokens ADDED to variables.css (idempotent — skip if exists) | Architect 2026-05-11 |
| 5 | Migration to develop only — batch merge to main after Migration #4 | Daniel 2026-05-11 |
| 6 | Pre-commit git tag `pre-migration-crm` | Architect 2026-05-11 |
| 7 | Localhost-Tester mandatory | Architect — production code |
| 8 | Continuous-Run Mandate | Daniel 2026-05-11 |

## 6. Quality Bar — Acceptance Criteria

1. `crm.html` line count unchanged (±2% — no DOM changes expected)
2. `grep "1e3a8a" css/crm*.css` returns ≥1 match per file that needed accent
3. `grep "26215c\|534ab7" css/crm*.css` returns 0 matches (no legacy palette anywhere — sanity check)
4. All 74 JS file references unchanged
5. All `<script>` tags in crm.html preserved verbatim
6. Sidebar dark theme preserved (Slate 800/900 backgrounds)
7. Navy visible on: primary buttons + active nav + focus rings + selected row + tab underline
8. Pre-commit git tag `pre-migration-crm` exists
9. `npm run verify:integrity` exit 0
10. `npm run smoke` 7/7 PASS
11. Localhost render verified, documented in TEST_REPORT.md
12. Working tree clean
13. Pushed to `origin/develop` (NOT main)

## 7. Destructive Operations

Declared:
- File overwrite: `crm.html` (likely zero or minimal change — accent is in CSS)
- Rule-body token updates: `css/crm.css`, `css/crm-components.css`, `css/crm-screens.css`, `css/crm-visual.css`
- Additions only to `shared/css/variables.css` (idempotent — skip if Navy tokens already exist)

NO file deletes. NO renames. NO schema. NO JS changes. NO DOM changes. NO force-push. NO merge to main.

## 8. Continuous-Run Mandate

Run end-to-end in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- Localhost smoke fails
- A page no longer renders
- CSS specificity prevents Navy from showing where expected (escalate with details)

## 9. Anti-Patterns

- DO NOT replace Slate 900 with Navy — Slate stays as primary
- DO NOT touch JS files
- DO NOT change DOM
- DO NOT remove the sidebar's dark theme
- DO NOT add new tokens to variables.css if Navy tokens already exist (idempotent — check first)
- DO NOT skip the localhost check
- DO NOT merge to main

## 10. References

- LIVE files: `crm.html` + `css/crm*.css` at repo root
- Visual target: `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/crm.html`
- Pattern: Migration #1 + #2 already added Navy tokens to variables.css if they didn't exist before — verify

---

*End of brief.*
