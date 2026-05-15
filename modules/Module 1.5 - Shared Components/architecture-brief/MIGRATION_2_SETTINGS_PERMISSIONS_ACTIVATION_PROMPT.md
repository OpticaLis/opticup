# Activation: Migration #2 — Settings + Permissions → Hybrid+Navy

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/MIGRATION_2_SETTINGS_PERMISSIONS_BRIEF.md`

**Mission:** Re-skin TWO production pages (`settings.html` + `employees.html`) to Hybrid+Navy. ZERO functional change. ZERO JS edits. ZERO DOM-structure changes. The 2 pages STAY SEPARATE — Daniel deferred their tab-consolidation to a separate SPEC. This is Migration #2 of 4, develop-only, batch-merge-to-main after all 4 land.

**Deliverables:**
- `settings.html` re-skinned in place
- `employees.html` re-skinned in place
- Navy tokens added to `shared/css/variables.css` (additions only — no deletions)
- Rule-body token swaps in `css/styles.css` / `css/header.css` / module CSS as needed (no rule deletions, no selector renames)
- Pre-commit git tags: `pre-migration-settings`, `pre-migration-employees`
- `PRE_MIGRATION_BEHAVIOR.md` cataloging interactive flows for BOTH pages
- `TEST_REPORT.md` with localhost:3000 + demo tenant verification for BOTH pages
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- M1.5 CHANGELOG + DECISIONS_LOG entry

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything — token map + behavior preservation rule are normative.
- Status lines (one Hebrew line per phase) only.
- This is production code — Localhost-Tester is MANDATORY for BOTH pages.

**Destructive Operations Envelope:**
- 2 in-place file overwrites: `settings.html`, `employees.html`
- Additions to `shared/css/variables.css`
- Rule-body token updates in shared/module CSS (no rule deletions, no selector renames)
- NO JS file changes
- NO DOM structure changes
- NO consolidation of the 2 pages (deferred SPEC)
- NO deletes, renames, schema, force-push, merge to main
- NO touching admin.html (M2 Platform Admin — out of scope)
- NO touching CRM, Storefront Studio, or Suppliers Debt (other migrations)
- Anything outside this envelope → STOP + escalate

**Token Swap Map (same as Migration #1):**

| From | To |
|---|---|
| `#534AB7` / purple | `#1e3a8a` / Navy |
| `#EEEDFE` / purple-soft | `#e6f1fb` |
| `#26215C` / purple-deep text | `#0f172a` |
| `#26215C` / purple-deep bg | `#1e3a8a` + white text |
| `#7F77DD` / purple-mid | `#1e40af` |
| `linear-gradient(...)` | Solid Hybrid token |
| `#1F1F1E` / text | `#0f172a` |
| `#5F5E5A` / text-2 | `#475569` |
| Decorative multi-color (non-semantic) | `--text-secondary` or `--accent-soft` |
| Semantic (success/warning/danger/info) | KEEP |

**Localhost Verification (MANDATORY, BOTH pages):**

**settings.html on localhost:3000 + demo tenant:**
- Page loads, no console errors
- Each settings section renders (business / financial / display / AI)
- At least one settings input is editable
- Permission gates work as before

**employees.html on localhost:3000 + demo tenant:**
- Page loads, no console errors
- Users table renders with demo data
- Roles / permission matrix renders
- Click a user → role-edit UI opens
- (Do NOT actually save changes during test — just verify form opens)

Save findings to `TEST_REPORT.md`. If ANY behavior breaks for EITHER page → write HIGH-severity finding, attempt one targeted fix, re-test. Still failing → `git revert HEAD~N` (revert the failing migration's commit) + STOP + escalate.

**Success Criteria (self-verifies):**
1. `settings.html` line count within ±15% of 208 lines
2. `employees.html` line count within ±15% of 87 lines
3. `grep -i "26215c\|534ab7" settings.html employees.html` = 0 matches
4. `grep "1e3a8a" settings.html employees.html` ≥ 1 match per file
5. All `<script>` tags preserved verbatim in both files
6. All `<link rel="stylesheet">` tags preserved verbatim in both files
7. DOM tag count within ±2% of original per file
8. `npm run verify:integrity` exit 0
9. `npm run smoke` 7/7 PASS
10. Localhost render verified for BOTH pages, in TEST_REPORT.md
11. Pre-commit git tags `pre-migration-settings` + `pre-migration-employees` exist
12. 3 commits total (2 page migrations + 1 retrospective). Per-page commits = independent revert capability.
13. Working tree clean at end
14. Pushed to `origin/develop` (NOT `main`)

**Closure:** Pipeline writes FOREMAN_REVIEW.md + applies 2 lessons each. End with ONE Hebrew summary:

> ✅ Migration #2 (Settings + Permissions) CLOSED 🟢 — 2 דפים ב-Hybrid+Navy על develop. localhost נבדק לשניהם. ממתין ל-Migration #3 (CRM).

Begin.
