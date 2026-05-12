# SPEC — MIGRATION_2_SETTINGS_PERMISSIONS

**Owning module:** Module 1.5 — Shared Components (cross-module visual migration)
**Author:** opticup-strategic (Foreman, Full-Auto Pipeline)
**Date:** 2026-05-11
**Source Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/MIGRATION_2_SETTINGS_PERMISSIONS_BRIEF.md`
**Pipeline mode:** Full-Auto (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review, ONE chat)

---

## 0. Pre-Authoring Reality Check

(Per BATCH_3 + MIGRATION_1 author lessons — verify Brief assumptions against repo reality before sealing the SPEC.)

- Brief read in full on 2026-05-11.
- LIVE files at repo root:
  - `settings.html` — 208 lines (matches Brief §1).
  - `employees.html` — 87 lines (matches Brief §1).
- Both pages have **NO inline `<style>` block** and **NO inline color hex codes** in any `style="..."` attribute. The visual treatment comes from linked CSS:
  - `shared/css/variables.css` (token source — already contains Navy tokens at lines 171–181, added by MIGRATION_1)
  - `css/header.css` (sticky header bar — site-wide)
  - `css/settings.css` (loaded only by `settings.html`)
  - `css/employees.css` (loaded only by `employees.html`)
- **Critical Rule-21 finding:** `css/settings.css` and `css/employees.css` are **byte-identical** (md5 `c318c26079c5009995492cad11024484`, 396 lines each). Both contain the full Module-1 inventory stylesheet plus settings-specific selectors at the bottom. Editing one without the other would orphan the other; editing both with the same change would propagate orphaned styles across them. **Treatment in this SPEC:** do NOT touch either module CSS file. The page-scope CSS-var override pattern (Migration #1) lives entirely in the HTML files. Log the duplication as a finding in `FINDINGS.md` for a future deduplication SPEC; out of scope here.
- **Site-wide CSS files NOT touched in this SPEC** — `shared/css/variables.css`, `css/header.css`, `css/settings.css`, `css/employees.css` are all left untouched. Touching `header.css` would re-skin the header bar on EVERY page, including the 2 not-yet-migrated production pages (CRM, Storefront Studio) and the 17 ERP pages outside this migration scope. Same for `variables.css :root` redefinitions. Same for the duplicate module CSS pair.
- **Page-scope override approach (mirrors Migration #1):** add a small `<style>` block inside `<head>` (after the existing `<link rel="stylesheet">` lines, before `</head>`) on each page that overrides `--primary`, `--primary-dark`, `--primary-light`, `--accent` for `body`. Cascade flows to all DOM in the page (including JS-rendered employees-list / permission-matrix content) via CSS custom property inheritance.
- **Hex baseline (grep, run 2026-05-11):**
  - `grep -ic "26215c\|534ab7"` → 0 / 0 (regression baseline; must STAY 0)
  - `grep -c "1e3a8a"` → 0 / 0 (must become ≥ 1 per file post-edit)
  - `grep -c "<script"` → 20 (settings) / 24 (employees) — must remain identical
  - `grep -c '<link rel="stylesheet"'` → 10 / 10 — must remain identical
- **DOM tag count (PowerShell, 2026-05-11):**
  - `settings.html` opening tags: 137 → ±2% bound = 134–140. New `<style>` adds 1 opening tag → 138 ✅ in bounds.
  - `employees.html` opening tags: 55 → ±2% bound = 54–56. New `<style>` adds 1 opening tag → 56 ✅ at top edge of bounds.
- **Variables.css already has Navy tokens** (lines 171–181 of variables.css). Migration #1 added them. **This SPEC does NOT modify variables.css.**

**Lessons applied from prior FOREMAN_REVIEWs:**
- BATCH_3 Author Proposal #1 + MIGRATION_1 Author Proposal #2 (Palette Pre-Audit / Reality Check) — applied above as §0.
- MIGRATION_1 Author Proposal #1 (no `§` symbol in headings) — this SPEC uses plain `## N. Title`.
- BATCH_3 Executor Proposal #2 (grep verification BEFORE `git add`) — enforced in §10 Commit Plan.
- MIGRATION_1 Executor Proposal #1 (inline-hex audit before edit) — applied in §0 (audit complete; no stranded non-token hexes inside the HTML files require swapping).
- MIGRATION_1 Executor Proposal #2 (Full-Auto leave pre-existing untracked files alone) — applied: pre-existing untracked Brief / Activation Prompt files in `architecture-brief/` and other untracked Brief artifacts are left as-is; this SPEC's `git add` is by explicit filename only.

---

## 1. Goal

Re-skin the two LIVE production pages `settings.html` (Settings) + `employees.html` (Permissions) to the Hybrid+Navy design system **with zero functional change** — no JS edits, no DOM-structural changes, no Supabase contract changes, no merge of the two pages into a tabbed UI. The two pages stay separate (Daniel decision 2026-05-11; tab-consolidation deferred to a separate SPEC).

This is Migration #2 of 4. Runs on `develop` only; merge to `main` is OUT OF SCOPE per Daniel's batch-merge-after-all-4-land policy.

## 2. Success Criteria (every item measurable)

| # | Criterion | Verification command / check |
|---|---|---|
| C1 | `settings.html` line count within ±15% of 208 (177 ≤ N ≤ 239) | `(Get-Content settings.html \| Measure-Object -Line).Lines` |
| C2 | `employees.html` line count within ±15% of 87 (74 ≤ N ≤ 100) | `(Get-Content employees.html \| Measure-Object -Line).Lines` |
| C3 | `grep -i "26215c\|534ab7" settings.html employees.html` returns 0 (regression check — already 0 baseline) | grep |
| C4 | `grep -c "1e3a8a" settings.html` returns ≥ 1 AND `grep -c "1e3a8a" employees.html` returns ≥ 1 | grep |
| C5 | All `<script>` tags preserved verbatim (settings: 20 lines, employees: 24 lines) | `grep -c "<script" settings.html` = 20; `grep -c "<script" employees.html` = 24 |
| C6 | All `<link rel="stylesheet">` tags preserved verbatim (settings: 10, employees: 10) | `grep -c '<link rel="stylesheet"' settings.html` = 10; same for employees.html |
| C7 | DOM opening-tag count within ±2% of original per file (settings: 134–140 → expected 138; employees: 54–56 → expected 56) | PowerShell `(Select-String -Pattern '<[a-zA-Z]' -AllMatches).Matches.Count` |
| C8 | `npm run verify:integrity` exits 0 | Run script |
| C9 | `npm run smoke` shows 7/7 PASS | Run script |
| C10 | Localhost render verified for BOTH pages on demo tenant on `http://localhost:3000`, no console errors, all behaviors in `PRE_MIGRATION_BEHAVIOR.md` still functional. Documented in `TEST_REPORT.md` with one section per page. | Localhost-Tester phase |
| C11 | Pre-commit git tags exist: `pre-migration-settings` at HEAD before any edit; `pre-migration-employees` at HEAD after the settings commit (so each page can be reverted independently) | `git tag --list pre-migration-settings pre-migration-employees` shows 2 tags |
| C12 | Exactly 3 commits land: (1) settings re-skin, (2) employees re-skin, (3) retrospective | `git log --oneline pre-migration-settings..HEAD` shows 3 commits |
| C13 | Working tree clean at end (`git status --porcelain` empty for files this SPEC touched; pre-existing untracked files in repo stay untracked per Full-Auto leave-files-alone rule) | git status |
| C14 | Pushed to `origin/develop`, NOT `main`. Tags `pre-migration-settings` + `pre-migration-employees` pushed to origin. | `git rev-parse --abbrev-ref HEAD` = `develop`; `git push origin develop` succeeded; `git push origin pre-migration-settings pre-migration-employees` succeeded |

## 3. Token-Swap Plan (page-scoped only)

### 3.1 No changes to `shared/css/variables.css`

Variables.css already contains the Navy/slate aliases (lines 171–181, added by MIGRATION_1):
- `--accent-navy: #1e3a8a`
- `--accent-navy-hover: #1e40af`
- `--accent-navy-soft: #e6f1fb`
- `--accent-navy-text: #ffffff`
- `--text-slate-primary: #0f172a`
- `--text-slate-secondary: #475569`

This SPEC does not add, remove, or modify any token in `variables.css`.

### 3.2 No changes to `css/header.css`, `css/settings.css`, `css/employees.css`

These would propagate site-wide (header.css) or are byte-identical duplicates owning the full app stylesheet (settings.css ≡ employees.css per md5). Touching them violates the staged page-by-page migration discipline. This SPEC does not modify them.

### 3.3 In-page `<style>` block — added to each HTML, page-scoped override

Insert this block inside `<head>`, immediately before `</head>`, on EACH of the 2 pages (it must come AFTER the existing `<link rel="stylesheet">` lines so the cascade order overrides shared CSS):

```html
<!-- Hybrid+Navy migration (page-scoped override, MIGRATION_2 2026-05-11) -->
<style>
  body{--primary:#1e3a8a;--primary-dark:#0f172a;--primary-light:#e6f1fb;--accent:#1e40af}
</style>
```

**Why this works:** CSS custom properties cascade through the DOM tree. `<body>` is the ancestor of all visible content. Setting `--primary` on `body` overrides the value defined in `:root` (variables.css line 27 + settings.css/employees.css line 1) for every descendant, but ONLY on this page (other ERP pages keep their `:root` value).

**What changes visually:**
- Header bar background (`.app-header { background: var(--primary); }` in header.css) → Navy `#1e3a8a`
- Settings section titles (`.settings-title { color: var(--primary); }`) → Navy
- Save button (`.btn-p { background: var(--accent); }`) → Navy hover variant `#1e40af`
- Permissions matrix (rendered by JS using `var(--primary)` references inside settings.css/employees.css selectors) → Navy
- Focus rings, badges, summary-card numbers → Navy

**What does NOT change:**
- Semantic colors (success green, warning orange, danger red, info blue) — unchanged because they don't use `var(--primary)`.
- Header CSS literal fallbacks `var(--primary, #1a237e)` in header.css — the `#1a237e` is a fallback only when `--primary` is undefined, which it never is on these pages.

### 3.4 Files NOT touched

- `shared/css/variables.css` — Migration #1 already added the Navy tokens.
- `css/styles.css` — site-wide.
- `css/header.css` — site-wide.
- `css/settings.css` and `css/employees.css` — duplicate pair; out-of-scope mutation risk.
- Any JS file under `js/`, `shared/js/`, `modules/settings/`, `modules/permissions/` — zero edits (Brief §2.2 anti-pattern).
- DOM tags in `settings.html` / `employees.html` — only addition is the new `<style>` block in `<head>` (1 opening tag per file). No element removed, renamed, re-IDed, or re-classed.
- Text content (Hebrew labels, headings, button labels) — zero edits.

## 4. Destructive Operations

Declared (Iron Rule 32):

1. **2 in-place file overwrites** — `settings.html`, `employees.html` (each appended with one `<style>` block in `<head>`; pre-commit git tags `pre-migration-settings` + `pre-migration-employees` provide independent rollback per page).

NOT in this envelope (any of these → STOP and escalate via `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_SETTINGS_PERMISSIONS.md` + one Hebrew line + halt):

- File deletes, file renames, `git rm`, mass renames
- `git rebase`, `git reset --hard`, `git push --force`
- SQL DDL or DML of any kind
- JS file edits
- DOM structural edits to either HTML (no add/remove/rename of any element other than the new `<style>` block; no class renames; no id changes; no text changes)
- Edits to `shared/css/variables.css`, `css/styles.css`, `css/header.css`, `css/settings.css`, `css/employees.css`
- Touching `admin.html` (M2 Platform Admin)
- Touching `crm.html`, `suppliers-debt.html`, or any Storefront Studio file
- Consolidation of the 2 pages into tabs (deferred SPEC per Daniel 2026-05-11)
- Merge to `main`

## 5. Autonomy Envelope (what executor MAY do without asking)

- Read any file under repo root.
- Run `git tag pre-migration-settings`, `git tag pre-migration-employees`, `git add` (explicit filenames only — never `-A` or `.`), `git commit`, `git push origin develop`, `git push origin <tag>`.
- Run `npm run verify:integrity`, `npm run smoke`, `npm run dev` or `scripts/start-local.ps1`.
- Edit only the two HTML files named in §3.3.
- Create the `PRE_MIGRATION_BEHAVIOR.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md` files in this SPEC folder.

## 6. Stop-On-Deviation Triggers (beyond global §9 of CLAUDE.md)

- `grep -i "26215c\|534ab7"` returns ≥ 1 in either edited file (regression — should never happen since baseline is 0 on both).
- `grep "1e3a8a"` returns 0 in either edited file after the per-page commit (Navy never landed).
- `git diff` shows changes to ANY file other than `settings.html`, `employees.html`, or this SPEC folder.
- `git diff` on either edited HTML file shows a change beyond a single new `<style>` block insertion in `<head>` (e.g., a class rename, a text change, a script reorder) — STOP.
- A pre-existing functional behavior cataloged in `PRE_MIGRATION_BEHAVIOR.md` no longer works after the change.
- Console errors on `localhost:3000/settings.html` or `localhost:3000/employees.html` post-change.
- Settings inputs do not render OR cannot be focused/typed.
- Employees container shows "טוען..." indefinitely (employees-list / permission-matrix JS not running).
- `npm run verify:integrity` exits non-zero.
- `npm run smoke` reports < 7/7.
- `<script>` count or `<link rel="stylesheet">` count on either page changes from baseline.

## 7. Rollback Plan

If Localhost-Tester reports a HIGH-severity behavior break OR `npm run smoke` fails post-migration:

**One-page failure (revert only the failing page):**
- Settings broke: `git revert <settings-commit-hash>` (creates a new revert commit; preserves the employees commit).
- Employees broke: `git revert <employees-commit-hash>`.

**Both pages broke:** `git revert <employees-commit-hash> <settings-commit-hash>` (two separate revert commits in reverse order).

**Catastrophic — both reverts dirty the tree:** `git checkout pre-migration-settings -- settings.html employees.html` then re-stage + commit a manual restore.

In all cases:
1. Document the rollback decision and failure mode in `FINDINGS.md`.
2. STOP pipeline. One Hebrew line to Daniel via `EXECUTION_REPORT.md` summary.
3. Tags `pre-migration-settings` + `pre-migration-employees` remain in place for forensic comparison.

## 8. Out of Scope

- M1 Inventory pages (Daniel directive — no touch).
- `admin.html` (M2 Platform Admin — separate module).
- Migrations #3 (CRM) and #4 (Storefront Studio) — separate Pipelines.
- Deleting or renaming any token in `shared/css/variables.css`.
- Any change to `css/styles.css`, `css/header.css`, `css/settings.css`, `css/employees.css` (Rule-21 dedup of the latter pair is its own SPEC).
- Settings + Permissions tab consolidation (deferred SPEC, after all 4 visual migrations land).
- New features.
- DB schema changes.
- Merge to `main`.
- Touching pre-existing untracked files anywhere in the repo (per MIGRATION_1 Executor Proposal #2).

## 9. Expected Final State

After the pipeline closes:
- `settings.html` visually Hybrid+Navy via the new page-scope `<style>` block in `<head>`. All 20 `<script>` tags + 10 `<link rel="stylesheet">` tags preserved verbatim. DOM opening-tag count = 138.
- `employees.html` visually Hybrid+Navy via the new page-scope `<style>` block in `<head>`. All 24 `<script>` tags + 10 `<link rel="stylesheet">` tags preserved verbatim. DOM opening-tag count = 56.
- `shared/css/variables.css` unchanged (already has Navy tokens from MIGRATION_1).
- 3 new commits on `origin/develop`:
  - C1: `feat(settings): migrate to Hybrid+Navy design system`
  - C2: `feat(employees): migrate to Hybrid+Navy design system`
  - C3: `chore(spec): close MIGRATION_2_SETTINGS_PERMISSIONS with retrospective + skill improvements`
- Tag `pre-migration-settings` exists at the commit BEFORE C1 (HEAD at SPEC start).
- Tag `pre-migration-employees` exists at C1 (the post-settings, pre-employees state) → enables independent revert.
- SPEC folder contains: `SPEC.md`, `PRE_MIGRATION_BEHAVIOR.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md`.
- `OPEN_TASKS.md` updated — Migration #2 marked ✅; Migration #3 (CRM) now next-up.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` has a new entry for this SPEC.
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` cross-module section has a new entry.
- Working tree clean for files this SPEC touched (pre-existing untracked Brief / Activation-Prompt files left as-is per Full-Auto leave-files-alone rule).
- Pushed to `origin/develop` (single push for all 3 commits + 2 tags). NOT pushed to `main`.

## 10. Commit Plan

**Pre-commit step (mandatory, before C1 is staged):**
```
git tag pre-migration-settings    # tags HEAD = pre-change baseline for settings
```

**C1 — Settings re-skin commit:**
- Files staged: `settings.html`, `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_2_SETTINGS_PERMISSIONS/SPEC.md`, `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_2_SETTINGS_PERMISSIONS/PRE_MIGRATION_BEHAVIOR.md`
- **Verification order (per BATCH_3 + MIGRATION_1 executor improvements):** AFTER the Edit and BEFORE `git add`:
  1. Re-read `settings.html` to confirm only the new `<style>` block was added.
  2. Run grep checks: `grep -i "26215c\|534ab7" settings.html` = 0; `grep "1e3a8a" settings.html` ≥ 1; `grep -c "<script" settings.html` = 20; `grep -c '<link rel="stylesheet"' settings.html` = 10.
  3. PowerShell DOM tag count = 138.
  4. `npm run verify:integrity` exits 0.
  - If any check fails → STOP, do NOT stage, escalate.
- Then `git add` the named files only → `git commit -m "feat(settings): migrate to Hybrid+Navy design system"`.

**Mid-commit tag (between C1 and C2):**
```
git tag pre-migration-employees    # tags C1 = pre-change baseline for employees
```

**C2 — Employees re-skin commit:**
- Files staged: `employees.html`
- **Verification order:** identical pattern — grep checks for employees.html, DOM count = 56, integrity 0 → only then stage.
- `git commit -m "feat(employees): migrate to Hybrid+Navy design system"`.

**C3 — Retrospective commit:**
- Files staged:
  - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_2_SETTINGS_PERMISSIONS/EXECUTION_REPORT.md`
  - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_2_SETTINGS_PERMISSIONS/FINDINGS.md` (if any findings)
  - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_2_SETTINGS_PERMISSIONS/TEST_REPORT.md`
  - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md`
  - `OPEN_TASKS.md`
  - `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`
  - `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`
  - Any skill files updated by FOREMAN_REVIEW improvement proposals (will be enumerated in C3 staging)
- `git commit -m "chore(spec): close MIGRATION_2_SETTINGS_PERMISSIONS with retrospective + skill improvements"`.

**Final push (after Reviewer + Localhost-Tester both pass):**
- `git push origin develop` (single push for all 3 commits).
- `git push origin pre-migration-settings pre-migration-employees` — push both tags.

## 11. Lessons Already Incorporated

- **Cross-Reference Check (Rule 21 sweep)** completed 2026-05-11 against `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `shared/css/variables.css`: 0 collisions (no new token names introduced; no new CSS class names; no new function names; no new file paths). The byte-identical `css/settings.css` ≡ `css/employees.css` pair is a PRE-EXISTING Rule-21 violation outside this SPEC's authorship — flagged for a future deduplication SPEC, not a blocker here.
- **Palette / Brief Reality-Check** (per MIGRATION_1 Author Proposal #2) — applied as §0. Brief's swap map (`#534AB7`, `#26215C`, etc.) does not literally match either HTML file (both have 0 hex codes inline). The actionable change is the same page-scope `body{--primary:...}` override pattern that succeeded for Migration #1.
- **Heading convention** (per MIGRATION_1 Author Proposal #1) — this SPEC uses plain `## N. Title` everywhere. No `§` symbols. Iron Rule 32 hook will accept the `## 4. Destructive Operations` heading.
- **Verification-before-`git add` ordering** (per BATCH_3 Executor Proposal #2 + MIGRATION_1 §10) — codified in §10 for both C1 and C2 staging.
- **Inline-hex audit before edit** (per MIGRATION_1 Executor Proposal #1) — applied in §0; both HTML files have ZERO hex codes inline, so no swap list to audit beyond the `<style>` block being added.
- **Full-Auto leave-files-alone** (per MIGRATION_1 Executor Proposal #2) — pre-existing untracked Brief / Activation-Prompt files stay untracked; explicit-filename `git add` only; "scope-clean" rather than "tree-clean" success bar.

---

*End of SPEC. Authored 2026-05-11 by opticup-strategic in Full-Auto Pipeline mode.*
