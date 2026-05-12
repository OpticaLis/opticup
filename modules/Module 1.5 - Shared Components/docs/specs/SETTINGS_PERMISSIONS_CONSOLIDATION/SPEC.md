# SPEC — SETTINGS_PERMISSIONS_CONSOLIDATION

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SETTINGS_PERMISSIONS_CONSOLIDATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Full-Auto Pipeline)
> **Authored on:** 2026-05-12
> **Module:** 1.5 — Shared Components
> **Phase:** Tactical migration consolidation (post-Migration #2)
> **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SETTINGS_PERMISSIONS_CONSOLIDATION_BRIEF.md`

---

## 0. Pre-Authoring Reality Check

Brief read in full on 2026-05-12. Repo state confirmed against Brief assumptions:

- `settings.html` exists at repo root, 212 lines, loads `modules/settings/settings-page.js`. Permission gate: `settings.view`. Page-scoped Hybrid+Navy override already present (from `MIGRATION_2_SETTINGS_PERMISSIONS`, 2026-05-11).
- `employees.html` exists at repo root, 91 lines, loads `modules/permissions/employee-list.js` + `modules/permissions/permission-matrix.js`. Permission gate: `employees.view`. Same Hybrid+Navy override block.
- `css/settings.css` and `css/employees.css` are byte-identical (md5 `c318c26079c5009995492cad11024484` for both — finding F1 from MIGRATION_2 confirmed). Loading either alone is sufficient for the consolidated page.
- LIVE in-code references to `employees.html` (HTML/JS/SQL outside `_archive/`): exactly **1 location** — `index.html:156` (modules-grid registry). All other 64 grep hits are docs / SPECs / archive — out of scope per Brief §6 criterion 3.
- `scripts/checks/root-allowlist.json` lists `employees.html` under `category_3_html_entrypoints` — must be removed when the file moves to `_archive/`, otherwise the root-discipline gate flags the move as moving-an-allowlisted-file (cosmetic mismatch, not a block).
- **Existing tab pattern (Iron Rule 21 — REUSE):** `js/shared-ui.js` defines `showTab(name)` already; project-wide convention is `<nav id="mainNav">` + `<button data-tab="X" data-tab-permission="X.view" onclick="showTab('X')">` + `<section id="tab-X" class="tab">...</section>` (`.tab{display:none}.tab.active{display:block}` already in `css/settings.css`). Inventory.html, shipments.html, and others use this same pattern. The consolidated settings.html MUST reuse it — no new `activateTab` / `switchTab` invented.
- **Existing permission gating (Iron Rule 21 — REUSE):** `shared/js/permission-ui.js` exposes `PermissionUI.apply()` which scans `[data-tab-permission]` and hides/disables elements whose permission the user lacks. `js/auth-service.js:309` calls `PermissionUI.apply()` automatically after `loadSession()`. The two tab buttons just declare `data-tab-permission` and gating is automatic.
- `window.location.hash` not used in any production ERP file — safe new addition for hash-based tab routing.
- `_archive/` exists at repo root (Category 2 directory in `root-allowlist.json`). Sub-folder `pre-consolidation/` does not yet exist; will be created by the file move.
- `loadEmployeesTab()` (in `modules/permissions/employee-list.js`) requires `loadData()` (in `js/data-loading.js`) to have run first (preloads cached data). Consolidated page must load `js/data-loading.js` before `modules/permissions/*` and call `loadData()` once at session-ready time.

### Lessons applied from prior FOREMAN_REVIEWs in Module 1.5

| Source | Lesson | Applied? |
|---|---|---|
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author #1 | Heading convention `## N. Title` (no `§` prefix — pre-commit hook regex) | YES — all headings use plain `## N. Title`. |
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author #2 | §0 Pre-Authoring Reality Check mandatory | YES — this section exists. |
| `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author #1 | §3a Shared Edit Block for multi-file identical edits | NOT APPLICABLE — N=1 for the major restructure (only `settings.html`); the sweep edits are 2 different files (index.html + root-allowlist.json) with 2 different edits. §3a omitted. |
| `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author #2 | Baselines as `BASE_*` symbols in §0 | YES — table below. §3 references symbolically. |
| `MIGRATION_2_SETTINGS_PERMISSIONS/EXECUTION_REPORT.md` Executor #1 | `<style>` placement convention (top of `<head>`, page-scope override) | NOT APPLICABLE — this SPEC does not modify the page-scope CSS override (already in place from MIGRATION_2). |
| `MIGRATION_2_SETTINGS_PERMISSIONS/EXECUTION_REPORT.md` Executor #2 | Use `;` separator not `&&` for chained PowerShell verifications | YES — Executor will use `;` per habit. |

### Cross-Reference Check (Iron Rule 21 — completed 2026-05-12)

Names this SPEC introduces / touches and their grep results against `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `modules/*/docs/MODULE_MAP.md`, and the live source tree:

| New name / pattern | Grep result | Resolution |
|---|---|---|
| Tab activator function | `showTab()` in `js/shared-ui.js` | REUSE existing (Rule 21). No new function created. |
| Tab CSS class `.tab` / `.tab.active` | Already in `css/settings.css`, `css/employees.css`, `css/inventory.css`, `css/shipments.css`, `css/styles.css` | REUSE existing class. |
| Tab-bar element `<nav id="mainNav">` + `data-tab` buttons | Already used by `inventory.html` line 37–50 | REUSE pattern. |
| `data-tab-permission` attribute gating | Already implemented in `shared/js/permission-ui.js` lines 39–53 | REUSE — automatic gating via `PermissionUI.apply()`. |
| `window.location.hash` for tab routing | Not used in production ERP code | Genuinely new — no collision. |
| Page section IDs `tab-general` / `tab-permissions` | `tab-general` not found anywhere in repo. `tab-permissions` not found anywhere. | New IDs are clean. |
| Permission keys `settings.view` / `employees.view` | Already exist in DB role permissions (used by current `settings.html` and `employees.html` gates) | REUSE. No new permission key. |

**0 collisions / 7 hits resolved.** Cross-Reference Check complete.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File | Metric | Value (captured 2026-05-12) |
|---|---|---|---|
| `BASE_LINES_settings` | `settings.html` | `wc -l` | 212 |
| `BASE_LINES_employees` | `employees.html` | `wc -l` | 91 |
| `BASE_SCRIPTS_settings` | `settings.html` | `grep -c "<script"` | 20 |
| `BASE_SCRIPTS_employees` | `employees.html` | `grep -c "<script"` | 24 |
| `BASE_LINKS_settings` | `settings.html` | `grep -c '<link rel="stylesheet"'` | 10 |
| `BASE_LINKS_employees` | `employees.html` | `grep -c '<link rel="stylesheet"'` | 10 |
| `BASE_REFS_employees_html_LIVE` | repo (HTML/JS/SQL outside `_archive/`) | `grep -r "employees.html" --include='*.html' --include='*.js' --include='*.sql' --exclude-dir=_archive --exclude-dir=.git` | 1 (only `index.html:156`) |
| `BASE_CSS_md5_settings_employees` | `css/settings.css` ≡ `css/employees.css` | `md5sum` identity check | match (`c318c26079c5009995492cad11024484`) |

---

## 1. Goal

Merge the standalone `employees.html` (permission management page) into `settings.html` as a `הרשאות` tab, so the user has one Settings hub with internal tabs (Brief §1). Archive `employees.html` to `_archive/pre-consolidation/`. Update the single LIVE in-code link. Preserve every interactive behavior on both pages bit-identically. Localhost-Tester verifies both tabs on demo tenant.

## 2. Background & Motivation

The Hybrid+Navy mockup `architecture-brief/design-system-mockups/hybrid-final/permissions.html` showed Settings + Permissions as a tabbed single page. Migration #2 (closed 2026-05-11, commits `b79a778` + `3c6618c`) deferred the structural change — only the visual re-skin landed. This SPEC executes the deferred consolidation. Today's pipeline is mature (5 prior Full-Auto SPECs closed in this module since 2026-05-09); the consolidation is small enough to fit one Pipeline run while still touching the most security-sensitive part of the app (permissions UI), which is why Localhost-Tester is mandatory.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state at close | On `develop`, clean | `git status --porcelain` → empty |
| 2 | Pre-commit safety tag exists | `pre-consolidation-settings-permissions` points to HEAD-before-changes | `git tag --list pre-consolidation-settings-permissions` → 1 line |
| 3 | `employees.html` not at repo root | absent | `test ! -f employees.html; echo $?` → 0 |
| 4 | `employees.html` archived | present | `test -f _archive/pre-consolidation/employees.html; echo $?` → 0 |
| 5 | `settings.html` has tab bar | `<nav id="mainNav">` containing `data-tab="general"` AND `data-tab="permissions"` buttons | `grep -c 'data-tab="general"\|data-tab="permissions"' settings.html` → 2 |
| 6 | `settings.html` has both tab content sections | `id="tab-general"` AND `id="tab-permissions"` | `grep -c 'id="tab-general"\|id="tab-permissions"' settings.html` → 2 |
| 7 | Permissions tab contains the employees container | `id="employees-container"` present inside `tab-permissions` section | `grep -c 'id="employees-container"' settings.html` → 1 |
| 8 | All scripts from old `employees.html` integrated | `settings.html` `<script>` count ≥ `BASE_SCRIPTS_settings` (20) + delta for added permission scripts. Concretely contains: `shared/js/table-resize.js`, `shared/js/plan-helpers.js`, `js/data-loading.js`, `modules/permissions/employee-list.js`, `modules/permissions/permission-matrix.js` | `grep -c 'modules/permissions/employee-list\|modules/permissions/permission-matrix\|js/data-loading\|shared/js/table-resize\|shared/js/plan-helpers' settings.html` → 5 |
| 9 | All CSS from old `employees.html` available | `css/employees.css` either loaded by settings.html OR equivalent (settings.css already byte-identical per `BASE_CSS_md5_settings_employees`). The SPEC chooses: load `css/employees.css` IN ADDITION TO `css/settings.css` so that any future divergence does not silently regress | `grep -c '"css/employees.css"\|"css/settings.css"' settings.html` → 2 |
| 10 | Hash routing wired | settings.html contains `location.hash` reader AND `hashchange` listener AND a `goSettingsTab` (or equivalent) function that calls `showTab` and updates hash | `grep -c 'window.location.hash\|hashchange' settings.html` → ≥ 2 |
| 11 | LIVE in-code references to `employees.html` | 0 in HTML/JS/SQL outside `_archive/` | `grep -r "employees.html" --include='*.html' --include='*.js' --include='*.sql' --exclude-dir=_archive --exclude-dir=.git . \| wc -l` → 0 |
| 12 | `index.html` modules tile updated | `url: 'settings.html#permissions'` AND no `'employees.html'` literal | `grep -c "settings.html#permissions" index.html` → 1 ; `grep -c "url: 'employees.html'" index.html` → 0 |
| 13 | `index.html` URL builder is hash-aware | tile renderer inserts `?t=...` BEFORE any `#fragment` (so `settings.html?t=demo#permissions`, NOT `settings.html#permissions?t=demo`) | inspect line in `index.html` `renderModules()` — verify a helper that splits on `#` before appending `?t=...` |
| 14 | `root-allowlist.json` cleaned | `employees.html` removed from `category_3_html_entrypoints` | `grep -c '"employees.html"' scripts/checks/root-allowlist.json` → 0 |
| 15 | `PRE_CONSOLIDATION_BEHAVIOR.md` exists in SPEC folder | file present, ≥ 30 lines, lists every form / button / Supabase call from BOTH original pages | `wc -l "modules/.../PRE_CONSOLIDATION_BEHAVIOR.md"` ≥ 30 |
| 16 | `TEST_REPORT.md` exists in SPEC folder | file present, GREEN verdict for both tabs on demo tenant | `grep -c "GREEN\|🟢" "modules/.../TEST_REPORT.md"` ≥ 1 |
| 17 | `EXECUTION_REPORT.md` + `FINDINGS.md` + `FOREMAN_REVIEW.md` exist | all 3 files in SPEC folder | `ls modules/.../{EXECUTION_REPORT,FINDINGS,FOREMAN_REVIEW}.md` → 3 lines |
| 18 | Smoke test | 7/7 PASS on demo tenant | `npm run smoke` → exit 0 |
| 19 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 20 | Pushed to `origin/develop` (NOT main) | HEAD on `origin/develop`, no commits on `origin/main` from this SPEC | `git log origin/develop..HEAD --oneline` → empty AFTER push |

---

## 4. Destructive Operations

This SPEC declares the following destructive operations (Iron Rule 32):

1. **In-place file overwrite of `settings.html`** — full restructure to tabbed container. Reversible via `git reset --hard pre-consolidation-settings-permissions` (the §6 rollback tag).
2. **File rename via `git mv`:** `employees.html` → `_archive/pre-consolidation/employees.html`. 1 rename — well below the 5-file mass-rename threshold. The destination subfolder `_archive/pre-consolidation/` will be created as a side effect of the rename.
3. **In-place edit of `index.html`** — line 156 module-tile URL changed from `'employees.html'` → `'settings.html#permissions'`; URL builder around line 173 made hash-aware.
4. **In-place edit of `scripts/checks/root-allowlist.json`** — removal of `"employees.html"` from `category_3_html_entrypoints`.

**No file deletes** (employees.html is archived, not deleted).
**No DB schema changes.** **No DML changes.**
**No `git rebase`. No `git reset --hard` invocations** unless rollback fires (then exactly one: `git reset --hard pre-consolidation-settings-permissions`).
**No `git push --force`. No merge to `main`.**

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

Specific to this SPEC:

- If post-sweep grep (Criterion 11) returns > 0 LIVE references to `employees.html` — STOP, do not commit the sweep, investigate which file was missed.
- If Localhost-Tester finds the permissions tab does NOT render with demo data (empty matrix, console error, missing `loadEmployeesTab` symbol) — STOP, do not push, escalate.
- If Localhost-Tester finds tab routing broken (URL `settings.html#permissions` opens to general tab, OR refresh on permissions tab loses the active state) — STOP, do not push.
- If `npm run smoke` drops below 7/7 — STOP. Smoke baseline is not a soft target.
- If `git diff --stat pre-consolidation-settings-permissions..HEAD` shows changes outside this set: `settings.html`, `employees.html`, `_archive/pre-consolidation/employees.html`, `index.html`, `scripts/checks/root-allowlist.json`, the SPEC folder itself — STOP, scope creep.

---

## 6. Rollback Plan

If the SPEC fails partway:

1. `git reset --hard pre-consolidation-settings-permissions` — restores all 4 modified files + un-archives employees.html in one operation.
2. No DB rollback needed (zero DB changes).
3. Notify via escalation file under `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_settings_permissions_rollback.md`.
4. Mark SPEC `🔴 REOPEN` (not CLOSED) in FOREMAN_REVIEW.

The pre-commit tag MUST be created BEFORE the first edit. If it is missing → STOP before editing anything; create the tag first.

---

## 7. Out of Scope (explicit)

- **Visual redesign.** Both pages are already Hybrid+Navy (page-scope override) from MIGRATION_2. No additional visual changes.
- **Other settings tabs.** The Hybrid mockup (`hybrid-final/settings.html`) shows 8 mocked tabs (חנות / סניפים / שיטות תשלום / מס ומטבע / ברקוד ותג / שעות פעילות / התראות / אינטגרציות). This SPEC ships ONLY the 2 tabs that exist as actual implemented pages today: כללי + הרשאות. Adding the other 6 mocked tabs is out of scope (Brief §3 + §9).
- **DB schema changes.** None.
- **Permission gate logic changes.** Existing keys `settings.view` and `employees.view` continue to gate exactly what they gate today; only the rendering surface changes.
- **The `css/settings.css` ≡ `css/employees.css` deduplication** (FINDING F1 from MIGRATION_2). Already filed as a follow-up SPEC `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS`. This SPEC keeps both CSS files loaded (defense-in-depth) and leaves dedup to the followup.
- **MD/docs updates** that name `employees.html` as a historical reference — Brief §6 criterion 3 explicitly scopes the grep to HTML/JS/SQL only. Historical references in docs are correct (the file did exist at that path on that date). The main exception: `OPEN_TASKS.md` + `Module 1.5 CHANGELOG.md` + `DECISIONS_LOG.md` will gain new entries for THIS closure (additive, normal closure procedure).
- **Re-skin of any other LIVE pages** (Migrations #3 / #4 are separate SPECs).

---

## 8. Expected Final State

### New files
- `modules/Module 1.5 - Shared Components/docs/specs/SETTINGS_PERMISSIONS_CONSOLIDATION/SPEC.md` (this file).
- `modules/Module 1.5 - Shared Components/docs/specs/SETTINGS_PERMISSIONS_CONSOLIDATION/PRE_CONSOLIDATION_BEHAVIOR.md` (Phase 1 deliverable).
- `modules/Module 1.5 - Shared Components/docs/specs/SETTINGS_PERMISSIONS_CONSOLIDATION/EXECUTION_REPORT.md` (close).
- `modules/Module 1.5 - Shared Components/docs/specs/SETTINGS_PERMISSIONS_CONSOLIDATION/FINDINGS.md` (close).
- `modules/Module 1.5 - Shared Components/docs/specs/SETTINGS_PERMISSIONS_CONSOLIDATION/TEST_REPORT.md` (close).
- `modules/Module 1.5 - Shared Components/docs/specs/SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` (close).
- `_archive/pre-consolidation/employees.html` (file relocated via `git mv`).

### Modified files
- `settings.html` — restructured to tabbed container. Keeps existing 4 settings sections nested inside `<section id="tab-general" class="tab active">`. Adds `<nav id="mainNav">` with כללי + הרשאות buttons. Adds `<section id="tab-permissions" class="tab">` containing `<div id="employees-container">טוען...</div>`. Adds 5 scripts that were on employees.html. Adds `css/employees.css` link. Adds inline JS for hash routing + lazy permissions init. Page entry permission check widened to "settings.view OR employees.view".
- `index.html` — line 156 url field changed; URL builder helper made hash-aware.
- `scripts/checks/root-allowlist.json` — `"employees.html"` removed from `category_3_html_entrypoints`. Bump `_last_updated` to `2026-05-12`.

### Deleted files
- None.

### DB state
- Unchanged.

### Docs to update at close
- `OPEN_TASKS.md` — Active task #2 sub-bullet: consolidation closed; next-up still Migration #3 (CRM).
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — new entry at top.
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — cross-module entry recording the consolidation.
- `MASTER_ROADMAP.md` — NOT updated (no module phase closure, no roadmap shift; tactical migration only).
- `docs/GLOBAL_MAP.md` — NOT updated (no new public functions / contracts; `goSettingsTab` is page-local).
- `docs/GLOBAL_SCHEMA.sql` — NOT updated (no DB changes).

---

## 9. Commit Plan

Five commits, each surgical:

| # | Type | Files | Message |
|---|---|---|---|
| C0 | tag (no commit) | — | `git tag pre-consolidation-settings-permissions` at HEAD before any edit |
| C1 | docs | `modules/.../SETTINGS_PERMISSIONS_CONSOLIDATION/SPEC.md` + `PRE_CONSOLIDATION_BEHAVIOR.md` | `docs(spec): author SETTINGS_PERMISSIONS_CONSOLIDATION SPEC + behavior catalog` |
| C2 | feat | `settings.html` (restructure) + `_archive/pre-consolidation/employees.html` (git mv from root) | `feat(settings): consolidate permissions into settings.html as tabbed page` |
| C3 | refactor | `index.html` + `scripts/checks/root-allowlist.json` | `refactor(links): redirect employees.html → settings.html#permissions + clean root allowlist` |
| C4 | chore | `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` + `FOREMAN_REVIEW.md` + `OPEN_TASKS.md` + `modules/.../CHANGELOG.md` + `DECISIONS_LOG.md` | `chore(spec): close SETTINGS_PERMISSIONS_CONSOLIDATION 🟢 — retrospective + master-doc updates` |

Push at end: `git push origin develop` + `git push origin pre-consolidation-settings-permissions`.

---

## 10. Dependencies / Preconditions

- MIGRATION_2_SETTINGS_PERMISSIONS closed (it is — commits `b79a778` + `3c6618c` on develop, 2026-05-11).
- Local stack startable via `scripts/start-local.ps1` (ERP on :3000, demo tenant).
- `npm run smoke` baseline currently 7/7 PASS (last verified 2026-05-11 in MIGRATION_2 closure).
- Node `npm run verify:integrity` returns 0 or 2 currently (no null-byte ERROR).
- `git tag --list "pre-consolidation-settings-permissions"` returns empty BEFORE C0 (collision check).

---

## 11. Lessons Already Incorporated

Recorded in §0 "Lessons applied from prior FOREMAN_REVIEWs in Module 1.5" table. Summary:

- Heading convention `## N. Title` (no `§`) — applied throughout.
- §0 Pre-Authoring Reality Check — present.
- §0 Baselines as `BASE_*` symbols — present, referenced in §3.
- §3a Shared Edit Block — not applicable for this SPEC (single major-edit file).
- `<style>` placement convention — not applicable (CSS untouched).
- PowerShell `;` separator over `&&` — Executor habit, no SPEC change needed.
- Iron Rule 21 cross-reference at author time (§0 Cross-Reference Check sub-section) — completed; 0 collisions.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria 1–20 pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`. Pre-consolidation tag pushed.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md all written in the SPEC folder.
- [ ] Module 1.5 CHANGELOG, OPEN_TASKS, DECISIONS_LOG updated.
- [ ] Localhost-Tester TEST_REPORT shows GREEN for both `settings.html` (general) and `settings.html#permissions` (permissions) on demo tenant.
- [ ] Smoke 7/7 PASS.

---

*End of SPEC.*
