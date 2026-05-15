# Activation: Migration #3 — CRM Navy Accent Addition

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/MIGRATION_3_CRM_BRIEF.md`

**Mission:** Add Navy accent (`#1e3a8a`) to CRM's primary actions, active nav, focus rings, selected rows, and tab indicators. CRM is already using Slate 900 (neutral, modern). Slate 900 STAYS as primary text. Sidebar dark theme STAYS dark. This is accent insertion, NOT palette replacement. ZERO JS edits. ZERO DOM changes.

**Deliverables:**
- `css/crm.css` + `css/crm-components.css` + `css/crm-screens.css` + `css/crm-visual.css` — accent token updates only
- `shared/css/variables.css` — Navy tokens added if not already present (idempotent)
- `crm.html` — likely zero changes (CSS-only)
- Pre-commit git tag `pre-migration-crm`
- `PRE_MIGRATION_BEHAVIOR.md` cataloging CRM behaviors
- `TEST_REPORT.md` with localhost verification
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything.
- Status lines (one Hebrew line per phase) only.
- Localhost-Tester MANDATORY.

**Destructive Operations Envelope:**
- Rule-body token updates in 4 CRM CSS files
- Additions only to variables.css (skip if Navy tokens exist)
- Possible zero changes to crm.html (most accent work is CSS)
- NO JS changes
- NO DOM changes
- NO new files
- NO file deletes
- NO selector renames
- NO Slate 900 replacement
- NO sidebar theme change
- NO force-push, NO merge to main

**Where Navy goes (be precise — only these elements):**
- Primary action buttons (`.btn-primary`, "+", "create" buttons) — background → Navy
- Active nav item in sidebar — accent treatment via `--accent-soft` background OR Navy left-border
- Focus rings on inputs / buttons → Navy outline
- Selected table row — background → `--accent-soft #e6f1fb`
- Active tab underline → Navy
- Hover state on links → Navy or Navy-soft

**Where Navy does NOT go:**
- Body text — stays Slate 900
- Card backgrounds — stay white
- Page background — stays as-is
- Sidebar background — stays dark Slate
- Sidebar text color — stays as-is
- Borders, dividers — stay Slate 200/300

**Localhost Verification (MANDATORY):**

1. `npm run dev` (or equivalent) → ERP on `localhost:3000`
2. Navigate to `localhost:3000/crm.html` with demo tenant auth
3. Verify:
   - Page loads, 0 console errors
   - Sidebar nav: active item visually distinct (Navy accent visible)
   - Click "+" / primary buttons → Navy background visible
   - Click a lead row → row background → `--accent-soft` (light Navy tint)
   - Focus an input → focus ring is Navy
   - Click a tab in any sub-screen → tab underline is Navy
   - All other CRM screens (incoming / dashboard / events) work as before
4. Save findings to TEST_REPORT.md

If ANY behavior breaks → `git revert HEAD~1` → STOP → escalate.

**Success Criteria:**
1. `grep "1e3a8a" css/crm*.css` ≥ 1 match per file that has primary buttons / active states
2. `grep "26215c\|534ab7" css/crm*.css` = 0 matches
3. All 74 `<script>` tags in crm.html preserved verbatim
4. crm.html line count within ±2% of 419 (no DOM changes)
5. Localhost render verified per checklist
6. Pre-commit git tag `pre-migration-crm` exists
7. `npm run verify:integrity` exit 0
8. `npm run smoke` 7/7 PASS
9. Working tree clean
10. Pushed to `origin/develop` (NOT main)

**Closure:** End with ONE Hebrew summary:

> ✅ Migration #3 (CRM Navy Accent) CLOSED 🟢 — Navy מבליט פעולות עיקריות + active nav + focus rings. Slate 900 נשמר כצבע ראשי. localhost נבדק. הבא: Migration #4 (Storefront Studio).

Begin.
