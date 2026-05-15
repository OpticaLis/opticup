# Activation: Settings + Permissions Consolidation

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SETTINGS_PERMISSIONS_CONSOLIDATION_BRIEF.md`

**Mission:** Merge `employees.html` (permissions page) into `settings.html` as a tab. Archive employees.html. Update all in-code links. Preserve all functionality and permission gates. Localhost-Tester mandatory.

**Deliverables:**
- `settings.html` restructured as tabbed container with hash-routing
- `employees.html` moved to `_archive/pre-consolidation/employees.html`
- All in-code references to `employees.html` updated to `settings.html#permissions`
- Pre-commit git tag `pre-consolidation-settings-permissions`
- `PRE_CONSOLIDATION_BEHAVIOR.md` cataloging behaviors from both pages
- `TEST_REPORT.md` with localhost verification
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry
- OPEN_TASKS.md update

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything.
- Status lines (one Hebrew line per phase) only.
- Localhost-Tester MANDATORY for both tabs.

**Destructive Operations Envelope:**
- File overwrite: `settings.html` (full restructure to tabbed)
- File move: `employees.html` → `_archive/pre-consolidation/employees.html`
- Sweep edits: every file with string `employees.html` (HTML/JS/SQL/CSS)
- NO file deletes (archive only)
- NO schema changes
- NO DB changes
- NO permission gate logic changes
- NO new tabs beyond what exists naturally
- NO visual redesign (already Hybrid+Navy from Migration #2)
- NO force-push, NO merge to main

**Phases:**

1. **Pre-flight:**
   - Catalog interactive behaviors from settings.html + employees.html → PRE_CONSOLIDATION_BEHAVIOR.md
   - Grep count of `employees.html` references in repo (record baseline)

2. **Consolidation:**
   - Restructure settings.html with tab bar + hash routing
   - Migrate permissions UI (HTML + JS + CSS classes) from employees.html into settings.html as the "הרשאות" tab
   - Move employees.html to `_archive/pre-consolidation/`

3. **Sweep:**
   - Find every reference to `employees.html` across the repo (HTML, JS, SQL, CSS, MD files outside _archive)
   - Replace with `settings.html#permissions`
   - Verify with grep: 0 references remain outside `_archive/` and `.git/`

4. **Verification (Localhost-Tester MANDATORY):**
   - Open `settings.html` → "כללי" tab is default visible
   - Click "הרשאות" tab → permissions UI renders with demo data
   - Open `settings.html#permissions` directly → "הרשאות" tab is active
   - Browser refresh on permissions tab → stays on permissions tab
   - Each cataloged behavior re-verified
   - Permission gate: non-owner role doesn't see "הרשאות" tab (if applicable today)
   - Save findings to TEST_REPORT.md

**Success Criteria (self-verifies):**
1. settings.html has tab bar with כללי + הרשאות tabs (and any other settings sections that naturally exist)
2. employees.html NOT at repo root (only in _archive)
3. `grep -r "employees.html"` outside _archive + .git = 0 matches
4. URL hash routing works (`#permissions` → permissions tab, `#general` or no hash → general tab)
5. Browser refresh preserves active tab
6. All cataloged behaviors work post-consolidation
7. Localhost verified for both tabs on demo tenant
8. Pre-commit git tag `pre-consolidation-settings-permissions` exists
9. `npm run verify:integrity` exit 0
10. `npm run smoke` 7/7 PASS
11. Working tree clean
12. Pushed to `origin/develop`

**Closure:** End with ONE Hebrew summary:

> ✅ Settings + Permissions Consolidation CLOSED 🟢 — employees.html ארכובו, הופך לטאב בתוך settings. כל הקישורים בקוד עודכנו. localhost נבדק. הבא: CRM Migration #3.

Begin with pre-flight cataloging.
