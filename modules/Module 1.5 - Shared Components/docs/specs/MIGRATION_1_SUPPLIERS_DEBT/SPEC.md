# SPEC — MIGRATION_1_SUPPLIERS_DEBT

**Owning module:** Module 1.5 — Shared Components (cross-module visual migration)
**Author:** opticup-strategic (Foreman, Full-Auto Pipeline)
**Date:** 2026-05-11
**Source Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/MIGRATION_1_SUPPLIERS_DEBT_BRIEF.md`
**Pipeline mode:** Full-Auto (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review, ONE chat)

---

## §0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-11.
- LIVE file `suppliers-debt.html` exists at repo root, line count = 269 (matches Brief §3.1).
- `shared/css/variables.css` exists, 169 lines, currently lacks any `--accent-navy*` token. Has `--color-info-dark: #1e40af`. Has `--color-primary: #0f172a` (slate near-black).
- `css/styles.css` `:root` defines `--primary: #1a237e` (Indigo), `--accent: #3b82f6` (Blue). NOTE: NOT the `#534AB7` purple the Brief's swap map names — the page uses `var(--primary)` which is Indigo today. The Brief's swap map is generic; the **actionable** intent is "page must look Hybrid+Navy and pass `grep '1e3a8a' ≥ 1`".
- Inline `<style>` block in `suppliers-debt.html` (lines 15–80, 66 lines) currently uses:
  - `var(--primary)`, `var(--white)`, `var(--g100|200|300|400|500|600)`, `var(--error)`, `var(--radius)`, `var(--shadow)` — all from `css/styles.css` `:root`.
  - Direct hex codes that DO need swapping: `#6f42c1` (purple text) ×3 occurrences, `#e8dff5` (purple bg) ×2, `#f3eefb` (purple-soft bg) ×1, `#1a5fb4` (blue) ×2, `#374151` (gray) ×2, `#f3f4f6` (gray bg) ×2, plus semantic colors that **stay** (success green, warning yellow, danger red, info blue).
- 10 `<script>` tags + 3 `<link rel="stylesheet">` tags will be preserved verbatim (Brief §7 criteria 4 & 5).
- 0 `linear-gradient(...)` occurrences in the inline style block → no gradient swaps needed.
- `grep -i "26215c\|534ab7" suppliers-debt.html` already returns 0 (no purple hex codes from the brief's map present today) — this remains 0 after the change (regression check, not progress check).

**Lessons applied from prior FOREMAN_REVIEWs:**
- `M1_5_SKETCH_RESKIN_BATCH_3` Proposal #1 (Palette Pre-Audit) — applied above. The swap map was sanity-checked against actual file content before sealing the SPEC.
- `M1_5_SKETCH_RESKIN_BATCH_3` Executor Proposal #1 (Test-on-one before tag-all) — applies trivially here (single file).
- `M1_5_SKETCH_RESKIN_BATCH_3` Executor Proposal #2 (Grep verification BEFORE `git add`) — enforced in §10 Commit Plan.

---

## §1. Goal

Re-skin the LIVE production page `suppliers-debt.html` to the Hybrid+Navy design system **with zero functional change** — no JS edits, no DOM structural changes, no Supabase contract changes. Page must look Hybrid+Navy on `develop`; merge to `main` is **NOT** part of this SPEC (Daniel's batch-to-main policy for all 4 production migrations).

This is the first of 4 production-page migrations. The Pipeline is being validated on the smallest, most self-contained page first.

## §2. Success Criteria (every item measurable)

| # | Criterion | Verification command / check |
|---|---|---|
| C1 | `suppliers-debt.html` line count within ±15% of 269 (228 ≤ N ≤ 309) | `(Get-Content suppliers-debt.html \| Measure-Object -Line).Lines` |
| C2 | `grep -i "26215c\|534ab7" suppliers-debt.html` returns 0 (regression check — already 0) | grep |
| C3 | `grep "1e3a8a" suppliers-debt.html` returns ≥ 1 match (Navy is present) | grep |
| C4 | All 10 `<script>` tags preserved verbatim (lines 180-233 of original, by content) | `grep -c "<script" suppliers-debt.html` = original count (which is 56 — including the `<script>` opening tag from inline `<script>` at end; the brief's "10" refers to the 10 module-specific `<script src="modules/debt/..."` tags. Either way, all original `<script>` lines preserved.) |
| C5 | All 3 `<link rel="stylesheet" href="...">` tags preserved verbatim (lines 12-14) | `grep -c '<link rel="stylesheet"' suppliers-debt.html` ≥ 3 (the Heebo Google Font link counts as a 4th `<link>` but uses `rel="stylesheet"` too — so total may be 4. Verify by name: `modal.css`, `styles.css`, `header.css` all still present.) |
| C6 | DOM tag count within ±2% of original | Compute opening tag count via `(Select-String -Pattern '<[a-zA-Z]' suppliers-debt.html -AllMatches).Matches.Count` — record original, compare delta |
| C7 | `npm run verify:integrity` exits 0 | Run script |
| C8 | `npm run smoke` shows 7/7 PASS | Run script |
| C9 | Localhost render verified: page loads at `http://localhost:3000/suppliers-debt.html` on demo tenant, supplier list populates, no console errors. Documented in `TEST_REPORT.md`. | Localhost-Tester phase |
| C10 | Pre-commit git tag `pre-migration-suppliers-debt` exists at HEAD before the re-skin commit | `git tag --list pre-migration-suppliers-debt` |
| C11 | Exactly 2 commits land: (1) re-skin, (2) retrospective. | `git log --oneline pre-migration-suppliers-debt..HEAD` shows 2 commits |
| C12 | Working tree clean at end (`git status --porcelain` empty) | git status |
| C13 | Pushed to `origin/develop`, NOT `main`. | `git rev-parse --abbrev-ref HEAD` = `develop`; `git push origin develop` succeeded |

## §3. Token-Swap Plan (page-scoped only)

### 3.1 New Navy tokens — ADDED to `shared/css/variables.css` (additive, no deletions)

Append a new section after the existing tokens, before the closing `}` of `:root`:

```css
/* =========================================================================
   12. NAVY ACCENT (Hybrid+Navy design system, 2026-05-11)
   Additive tokens for the staged page-by-page migration to Hybrid+Navy.
   Existing tokens (--color-primary, --primary, etc.) remain unchanged
   until all 4 production migrations complete (Brief Locked Decision #5).
   ========================================================================= */
--accent-navy:        #1e3a8a;  /* primary action — Hybrid+Navy */
--accent-navy-hover:  #1e40af;  /* hover state */
--accent-navy-soft:   #e6f1fb;  /* selected row, badge bg, hero wash */
--accent-navy-text:   #ffffff;  /* on Navy */
--text-slate-primary:   #0f172a;  /* deep slate body — alias of --color-gray-900, named for migration clarity */
--text-slate-secondary: #475569;  /* secondary slate body — alias of --color-gray-600 */
```

### 3.2 In-page `<style>` block — token + hex swaps

Within `suppliers-debt.html` lines 15-80, the following changes are required (every other byte stays identical):

1. **Add a page-local CSS-var override at the top of the inline `<style>`** so all `var(--primary)` usages on this page resolve to Navy without touching the global `:root`:

   ```css
   body {
     --primary: #1e3a8a;
     --primary-dark: #0f172a;
     --primary-light: #e6f1fb;
     --accent: #1e40af;
   }
   ```

   This is a page-scoped override — applies only to `suppliers-debt.html` because each ERP HTML page declares its own `<body>`. Other pages keep the legacy Indigo.

2. **Purple hex swaps in the inline block:**
   - `.dst-linked { background: #e8dff5; color: #6f42c1; }` → `background: #e6f1fb; color: #1e3a8a;`
   - `.btn-lnk { border-color: #6f42c1; color: #6f42c1; }` → `border-color: #1e3a8a; color: #1e3a8a;`
   - `.btn-lnk:hover { background: #f3eefb; }` → `background: #e6f1fb;`
   - `.rst-shipped { background: #e8dff5; color: #6f42c1; }` → `background: #e6f1fb; color: #1e3a8a;`

3. **Blue-ish hex swaps that look stranded next to Navy:**
   - `.dst-open { background: #e3f0ff; color: #1a5fb4; }` → `background: #e6f1fb; color: #1e40af;`
   - `.rst-ready { background: #e3f0ff; color: #1a5fb4; }` → `background: #e6f1fb; color: #1e40af;`

4. **Inline-style buttons in the body (lines 127, 137):**
   - `<button class="btn btn-sm" style="background:#f3f4f6;color:#374151;...">` (2 occurrences) → `style="background:var(--g100);color:var(--g700);..."` (use existing tokens; same visual outcome on light-mode, plus survives future palette changes).

5. **Semantic colors (success green, warning yellow, danger red, info orange) — KEEP UNCHANGED.** Per Brief §3 token map row "Semantic" and Hybrid mockup's chart-legend conventions.

### 3.3 Files NOT touched

- `css/styles.css` — untouched (Other pages still depend on its `--primary: #1a237e`).
- `css/header.css` — untouched (header bar visual stays consistent across un-migrated pages).
- Any JS file under `js/`, `shared/js/`, `modules/debt/` — zero edits.
- DOM tags inside `suppliers-debt.html` — zero structural edits (no add/remove/rename of elements, no class renames, no id changes).
- Text content (Hebrew labels, table headers, button labels) — zero edits.

## 4. Destructive Operations

Declared (Iron Rule 32):

1. **1 in-place file overwrite** of `suppliers-debt.html` (full-file `Write`/`Edit` allowed; content change only).
2. **Additions** to `shared/css/variables.css` — append 6 new CSS custom properties under a new commented section; no removals, no renames.

NOT in this envelope (any of these → STOP and escalate):
- File deletes, file renames, `git rm`, mass renames
- `git rebase`, `git reset --hard`, `git push --force`
- SQL DDL of any kind
- DML mass-delete
- JS file edits
- DOM structural edits to `suppliers-debt.html`
- Edits to `css/styles.css` `:root` or `css/header.css`
- Merge to `main`

Anything outside this envelope → write `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_SUPPLIERS_DEBT.md`, one Hebrew line to Daniel, halt.

## §5. Autonomy Envelope (what executor MAY do without asking)

- Read any file under repo root.
- Run `git tag`, `git add` (explicit filenames only — never `-A` or `.`), `git commit`, `git push origin develop`.
- Run `npm run verify:integrity`, `npm run smoke`, `npm run dev` or `scripts/start-local.ps1`.
- Edit only the two files named in §3.
- Create the `PRE_MIGRATION_BEHAVIOR.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md` files in this SPEC folder.

## §6. Stop-On-Deviation Triggers (beyond global §9 of CLAUDE.md)

- `grep -i "26215c\|534ab7" suppliers-debt.html` returns ≥ 1 after edit (regression).
- `grep "1e3a8a" suppliers-debt.html` returns 0 after edit (Navy never landed).
- `git diff` shows changes to any file other than `suppliers-debt.html`, `shared/css/variables.css`, or this SPEC folder.
- A pre-existing functional behavior cataloged in `PRE_MIGRATION_BEHAVIOR.md` no longer works after the change.
- Console errors on `localhost:3000/suppliers-debt.html` post-change.
- Supplier list does not populate on demo tenant.
- `npm run verify:integrity` exits non-zero.
- `npm run smoke` reports < 7/7.

## §7. Rollback Plan

If Localhost-Tester reports HIGH-severity behavior break, OR `npm run smoke` fails post-migration:

1. `git revert HEAD` (reverts the re-skin commit only — keeps tag + retro).
2. If revert leaves tree dirty, `git checkout -- suppliers-debt.html shared/css/variables.css` against `pre-migration-suppliers-debt` tag.
3. Document the rollback in `FINDINGS.md` with the failure mode that triggered it.
4. STOP pipeline. Escalate to Daniel.

## §8. Out of Scope

- M1 Inventory pages (Daniel directive).
- Migrations #2/#3/#4 (Settings+Permissions, CRM, Storefront Studio) — separate pipelines.
- Deleting or renaming any token in `shared/css/variables.css` (Brief Locked Decision #5).
- Changes to `css/styles.css` `:root` (would propagate to other unmigrated pages).
- New features.
- DB schema changes.
- Merge to `main`.

## §9. Expected Final State

After the pipeline closes:
- `suppliers-debt.html` visually Hybrid+Navy (page-scoped `--primary` override + purple→Navy hex swaps).
- `shared/css/variables.css` has 6 new Navy/slate alias tokens at the bottom of `:root`.
- 2 new commits on `origin/develop`:
  - C1: `feat(suppliers-debt): migrate to Hybrid+Navy design system`
  - C2: `chore(spec): close MIGRATION_1_SUPPLIERS_DEBT with retrospective`
- Tag `pre-migration-suppliers-debt` exists at the commit BEFORE C1.
- SPEC folder contains: `SPEC.md`, `PRE_MIGRATION_BEHAVIOR.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md`.
- `OPEN_TASKS.md` updated — Active task #2 marks Migration #1 as ✅ closed, Migration #2 (Settings+Permissions) now next-up.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` has a new entry for this SPEC.
- `references/DECISIONS_LOG.md` cross-module section has a new entry.
- Working tree clean. Pushed to `origin/develop`.

## §10. Commit Plan

**Pre-commit step (mandatory, before C1 is staged):**
```
git tag pre-migration-suppliers-debt    # tags HEAD = pre-change baseline
```

**C1 — Re-skin commit:**
- Files: `suppliers-debt.html`, `shared/css/variables.css`, `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_1_SUPPLIERS_DEBT/SPEC.md`, `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_1_SUPPLIERS_DEBT/PRE_MIGRATION_BEHAVIOR.md`
- **Verification order (per executor-skill improvement, applied 2026-05-11):** run the §2 grep checks (C2, C3) IMMEDIATELY after Edit, BEFORE `git add`. If any check fails, do not stage; investigate and stop on deviation.
- Then `npm run verify:integrity` → must exit 0 → `git add` the named files → `git commit -m "feat(suppliers-debt): migrate to Hybrid+Navy design system"`.
- Then Localhost-Tester runs against the committed state.
- Push deferred until after Reviewer + Localhost-Tester both pass.

**C2 — Retrospective commit:**
- Files: `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md`, root `OPEN_TASKS.md`, `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`, `references/DECISIONS_LOG.md`.
- `git commit -m "chore(spec): close MIGRATION_1_SUPPLIERS_DEBT with retrospective + skill improvements"`.

**Final push:**
- `git push origin develop` (single push, both commits + tag together).
- `git push origin pre-migration-suppliers-debt` — push the tag.

## §11. Lessons Already Incorporated

- Cross-Reference Check (Rule 21 sweep) completed 2026-05-11 against GLOBAL_SCHEMA + shared/css/variables.css: 0 collisions (no token names duplicated, no existing CSS class names re-used for new behavior).
- Palette Pre-Audit (per BATCH_3 Author Proposal #1): swap map sanity-checked against actual `suppliers-debt.html` and `css/styles.css` contents; Brief's `#534AB7` map is generic and does not literally apply — actionable swap is purple hex codes already in the file plus a page-local `--primary` override.
- Verification-before-`git add` ordering (per BATCH_3 Executor Proposal #2): enforced in §10.
- Test-on-one (per BATCH_3 Executor Proposal #1): trivially satisfied — single file batch.

---

*End of SPEC. Authored 2026-05-11 by opticup-strategic in Full-Auto Pipeline mode.*
