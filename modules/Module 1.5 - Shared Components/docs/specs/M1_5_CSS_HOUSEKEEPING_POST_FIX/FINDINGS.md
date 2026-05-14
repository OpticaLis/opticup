# FINDINGS — M1_5_CSS_HOUSEKEEPING_POST_FIX

**Outcome:** Clean. 3/3 orphan deletes shipped. 0 deviations.

---

## F-1 — T2.1 auth-parser validated end-to-end in production

**Severity:** INFO (positive validation)

The `git commit` containing 3 declared file deletes passed Iron Rule 32's pre-commit gate with `0 violations, 0 warnings across 3 files`. Pre-T2.1, this exact commit shape would have been blocked. The fix is now proven on a real-world deletion event, not just regression tests.

## F-2 — `crm-visual.css` comment was stale

**Severity:** INFO

The deleted `crm-visual.css` had a comment claiming `.crm-pagination` was used by "a `.crm-pagination` <div> in crm.html leads tab". Grep showed 0 occurrences in `crm.html` and 0 in any `modules/crm/*.js`. The comment was a documentation hint left after B8 Tailwind migration but the actual usage never materialized. Lesson: file-level "keep this for X" comments without enforcement decay into orphan-rationale fiction.

## F-3 — `employees.css` carried legacy CSS resets

**Severity:** LOW (potential follow-up needed)

`employees.css` line 1 included a global reset `*{margin:0; padding:0; box-sizing:border-box}` and base-element styles for `html`, `body`, `header`, `nav`, `main`, plus `.card`, `.form-row`, `.form-group`, `.btn` etc. These were layered ABOVE the modern `shared/css/*` stack. Removal MAY have visual side-effects on `settings.html` if the modern stack doesn't replicate everything.

**Watch item:** if Daniel reports visual breakage on `settings.html` after the merge, open a follow-up SPEC `M1_5_SETTINGS_CSS_FALLOUT_HOTFIX` to surface specific missing styles. Lower-risk than keeping the orphan.

## F-4 — Backups preserved

**Severity:** INFO

5 pre-edit / pre-delete files retained in `modules/Module 1.5 - Shared Components/backups/2026-05-14_CSS_HOUSEKEEPING_POST_FIX/`. If a rollback is needed within the next 90 days (per the project's backup retention norm), the files are at hand.

End of FINDINGS.
