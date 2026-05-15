# Activation: Migration #1 — Suppliers Debt → Hybrid+Navy

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/MIGRATION_1_SUPPLIERS_DEBT_BRIEF.md`

**Mission:** Re-skin the LIVE production page `suppliers-debt.html` (root of ERP repo) to use the Hybrid+Navy design system tokens. ZERO functional change. ZERO JS edits. ZERO DOM-structure changes. This is the FIRST of 4 production migrations — Daniel-approved policy is "migrate all 4 to develop, batch merge to main only after all 4 are QA-clean".

**Deliverables:**
- `suppliers-debt.html` re-skinned in place (inline `<style>` block + any inline `style="..."` literal colors)
- New Navy tokens ADDED to `shared/css/variables.css` (NO deletions of existing tokens — they're still used by other production pages until migrations #2/#3/#4 complete)
- Updates to `css/styles.css` / `css/header.css` ONLY for rule-body token swaps, no rule deletions or renames
- Pre-commit git tag: `pre-migration-suppliers-debt`
- `PRE_MIGRATION_BEHAVIOR.md` in SPEC folder cataloging every interactive flow before the change, for verification after
- `TEST_REPORT.md` from Localhost-Tester with explicit localhost:3000 + demo tenant verification
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- Updates to root `OPEN_TASKS.md`, M1.5 CHANGELOG, DECISIONS_LOG entry

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything — token map + behavior preservation rule are normative.
- Status lines (one Hebrew line per phase) only.
- This is a PRODUCTION migration — Localhost-Tester is MANDATORY, not optional. The page MUST load on localhost:3000 with demo tenant and the supplier list MUST populate with real Supabase data before the SPEC closes.

**Destructive Operations Envelope:**
- 1 in-place file overwrite: `suppliers-debt.html`
- Additions to `shared/css/variables.css` (additions only)
- Rule-body token updates in `css/styles.css` / `css/header.css` (no rule deletions, no selector renames)
- NO JS file changes
- NO DOM structure changes
- NO deletes, renames, schema, force-push
- NO merge to main
- Anything outside this envelope → STOP + escalate

**Token Swap Map (same as previous re-skins):**

| From | To |
|---|---|
| `#534AB7` / purple | `#1e3a8a` / Navy accent |
| `#EEEDFE` / purple-soft | `#e6f1fb` / accent-soft |
| `#26215C` / purple-deep text | `#0f172a` / text-primary |
| `#26215C` / purple-deep bg | `#1e3a8a` with white text |
| `#7F77DD` / purple-mid | `#1e40af` / accent-hover |
| Any `linear-gradient(...)` | Solid Hybrid token |
| `#1F1F1E` / text | `#0f172a` |
| `#5F5E5A` / text-2 | `#475569` |
| Decorative multi-color (non-semantic) | `--text-secondary` or `--accent-soft` |
| Semantic colors (success/warning/danger/info) | KEEP |

**Localhost-Tester Verification Checklist (MANDATORY):**

After the CSS changes, the Localhost-Tester phase MUST:

1. Start ERP via `scripts/start-local.ps1` (or equivalent — `npm run dev` if mapped)
2. Navigate to `http://localhost:3000/suppliers-debt.html` with demo tenant auth
3. Verify:
   - Page loads without console errors (check DevTools console)
   - Supplier list table renders with real demo-tenant data
   - At least one row is clickable / opens a drawer/modal (the existing flow)
   - Stat cards / KPI tiles at top render
   - No layout breaks at 1080p viewport
4. Save findings to `TEST_REPORT.md` in the SPEC folder

If ANY of these fail → write the failure into FINDINGS.md as HIGH-severity, attempt one targeted fix, re-test. If still failing → revert the commit (`git revert HEAD~1`) and STOP + escalate.

**Success Criteria (self-verifies):**
1. `suppliers-debt.html` line count within ±15% of 269
2. `grep -i "26215c\|534ab7" suppliers-debt.html` = 0 matches
3. `grep "1e3a8a" suppliers-debt.html` ≥ 1 match
4. All 10 `<script>` tags preserved verbatim
5. All 3 `<link rel="stylesheet">` tags preserved verbatim
6. DOM tag count within ±2% of original
7. `npm run verify:integrity` exit 0
8. `npm run smoke` 7/7 PASS
9. Localhost render verified (page loads + data renders + no errors), documented in TEST_REPORT.md
10. Pre-commit git tag `pre-migration-suppliers-debt` exists
11. 2 commits total (re-skin + retrospective)
12. Working tree clean at end
13. Pushed to `origin/develop` (NOT `main`)

**Closure:** Pipeline writes FOREMAN_REVIEW.md + applies 2 lessons each to opticup-strategic and opticup-executor. End with ONE Hebrew summary:

> ✅ Migration #1 (Suppliers Debt) CLOSED 🟢 — Hybrid+Navy על develop. localhost נבדק. ממתין ל-Migration #2 (Settings+Permissions).

Begin.
