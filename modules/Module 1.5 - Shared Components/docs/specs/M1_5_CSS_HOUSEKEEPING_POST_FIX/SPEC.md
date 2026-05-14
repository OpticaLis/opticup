# SPEC — M1_5_CSS_HOUSEKEEPING_POST_FIX

**Type:** Tech-debt closure (combined T2.2 + T2.3)
**Tier:** T2.2 + T2.3 of `OVERNIGHT_BUNDLE_2_2026_05_14`
**Module:** Module 1.5 — Shared Components
**Author:** opticup-strategic (Foreman, overnight Bundle 2)
**Date:** 2026-05-14

---

## 1. Why this SPEC exists

Bundle 1 surfaced 2 orphan CSS files (T2.2 `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS`) + 1 stub CSS file (T2.3 `M1_5_CRM_CSS_STUB_CLEANUP`) that should have been deleted at their respective B-phase closures but were left in place. Bundle 1's destructive-ops check tool blocked the deletes (now fixed in T2.1 = commits 391b82b + 1246a37). With T2.1 landed, this SPEC executes the 3 deletes + link-ref cleanup in one bundled commit.

## 2. Scope

- **Delete:** `css/employees.css` (396 lines, legacy base styling for the deleted employees screen).
- **Delete:** `css/crm-screens.css` (2 lines, post-B8 residual — comment only, no rules).
- **Delete:** `css/crm-visual.css` (20 lines, post-B8 residual — `.crm-pagination` + `crm-pulse` keyframe, neither used by current `crm.html` or `modules/crm/*.js` per grep).
- **Edit `crm.html`:** remove `<link>` references on lines 54 + 55 + the line-51 comment block describing the 4-file split.
- **Edit `settings.html`:** remove `<link>` reference on line 27.
- **Leave alone:** `_archive/**` references (archived, immutable).

## 3. Acceptance criteria

1. ✅ All 3 files deleted from `css/` directory.
2. ✅ `crm.html` no longer references `crm-screens.css` or `crm-visual.css`.
3. ✅ `settings.html` no longer references `employees.css`.
4. ✅ Iron Rule 31 integrity gate exit 0.
5. ✅ Iron Rule 32 destructive-ops gate exit 0 (this SPEC authorizes the 3 deletes per §4).
6. ✅ Visual smoke: `settings.html` + `crm.html` render without obvious breakage. Verification deferred to localhost-tester (Tier C runtime SPEC). For this SPEC, the file removal is purely deletion of an orphan layer.

## 4. Destructive Operations

Per Iron Rule 32:

1. Delete `css/employees.css` — orphan after `employees.html` was archived to `_archive/pre-consolidation/`.
2. Delete `css/crm-screens.css` — orphan after B8 Tailwind migration (file contains only 2 comment lines).
3. Delete `css/crm-visual.css` — orphan after B8 Tailwind rewrite (its `.crm-pagination` + `crm-pulse` selectors are not referenced anywhere in live `crm.html` or `modules/crm/*.js`).

Total: 3 file deletes. All declared and authorized by this section. The new destructive-ops parser (T2.1) reads this section and skips section-(B) violations for these 3 paths.

## 5. Plan

1. Pre-flight: backup the 3 CSS files + the 2 HTML files into `modules/Module 1.5 - Shared Components/backups/2026-05-14_CSS_HOUSEKEEPING_POST_FIX/`.
2. `git rm css/employees.css` + `git rm css/crm-screens.css` + `git rm css/crm-visual.css`.
3. Edit `crm.html`: remove the 3 lines (comment + 2 `<link>`).
4. Edit `settings.html`: remove the 1 `<link>` line.
5. Run `npm run verify:integrity` → exit 0.
6. Stage the 5 changes (3 deletes + 2 HTML edits + this SPEC + closure docs).
7. Commit + push.
8. Write FINDINGS, EXECUTION_REPORT, FOREMAN_REVIEW.

## 6. Expected outputs

- 3 files deleted (`css/employees.css`, `css/crm-screens.css`, `css/crm-visual.css`).
- 2 HTML files edited (`crm.html`, `settings.html`).
- Backup folder under `modules/Module 1.5 - Shared Components/backups/`.
- 4 SPEC closure docs in this folder.

## 7. Test plan

- `npm run verify:integrity` — exit 0.
- Manual visual check (deferred to localhost-tester or post-merge UAT): settings.html + crm.html still render.

End of SPEC.
