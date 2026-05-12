# FINDINGS — SETTINGS_PERMISSIONS_CONSOLIDATION

> **Author:** opticup-executor
> **Date:** 2026-05-12
> **Scope:** Issues / debt / observations surfaced during execution that are NOT in this SPEC's scope. Each gets a Foreman disposition (new SPEC / TECH_DEBT / dismiss).

---

## F1 — `_archive/pre-consolidation/employees.html` script paths still reference live modules

**Severity:** LOW
**Detail:** The archived `_archive/pre-consolidation/employees.html` still has `<script src="modules/permissions/employee-list.js">` etc. relative paths that resolve correctly at the archive URL (HTTP 200 confirmed). If a future cleanup renames or deletes those modules, the archive becomes broken — but it's archive, not production, so the breakage is harmless. Side note: anyone who navigates to `_archive/pre-consolidation/employees.html` in a browser today actually loads a working employees page (since the JS modules still exist at their original paths).
**Recommendation:** Either (a) accept — archive was always meant to be a "snapshot at time of archival", not a forever-live page; OR (b) add a top-level redirect from the archived file to `/settings.html#permissions` so anyone bookmarking the archive lands somewhere current. Option (a) is the cheap default.

## F2 — `urlWithTenant` helper in `index.html` is page-local, not in `shared.js`

**Severity:** LOW
**Detail:** The new `urlWithTenant(u)` helper added to `index.html` is the kind of thing that probably should live in `shared.js` (project-wide URL building). But `index.html` is the only page that builds tenant-scoped URLs from a tile registry — every other page already has the tenant slug baked into its session state. Extracting now would be premature.
**Recommendation:** Defer until a 2nd consumer appears. If it never does, the helper stays where it's used. Conforms to "no premature abstraction" rule.

## F3 — `css/settings.css` ≡ `css/employees.css` byte-identity (carried over from MIGRATION_2 F1)

**Severity:** MEDIUM (unchanged from MIGRATION_2)
**Detail:** Already filed as `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` follow-up SPEC per MIGRATION_2 FOREMAN_REVIEW. This SPEC LOADS BOTH (D2 in EXECUTION_REPORT) which is defense-in-depth; the dedup SPEC will collapse to one file at a future date. Not a blocker. **No new finding** — restating only because the consolidated settings.html now loads both files and the pre-existing follow-up SPEC will need to be aware of the new loader.
**Recommendation:** Update `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` SPEC scope (when it runs) to also remove the `css/employees.css` `<link>` from settings.html.

## F4 — Hash routing on the existing inventory.html pattern uses `class="active"` on `<nav>` button literally, not via `data-tab` lookup at init

**Severity:** LOW (observation, not a defect)
**Detail:** When verifying the existing tab pattern, I noticed inventory.html has `class="active"` literal in the FIRST tab button (`<button data-tab="entry" ... class="active">`). This works because the page always loads with `entry` as default. The consolidated settings.html mirrored this for `data-tab="general"` (default) — but for hash-routed pages where the initial tab can be `permissions`, the literal `class="active"` on the general button would visually flicker before `goSettingsTab(initial)` runs. Risk in practice: low (the JS runs on `DOMContentLoaded`, which is before paint completes in most browsers). I left it as-is for two reasons: (a) matches the project pattern, and (b) the JS swaps the active class before any user interaction is possible.
**Recommendation:** Defer. If a flicker is reported in QA, swap to NO literal active class + always set in JS init.

---

## Summary

| ID | Severity | Recommended action |
|---|---|---|
| F1 | LOW | Accept (archive is snapshot, not live) |
| F2 | LOW | Defer (no 2nd consumer yet) |
| F3 | MEDIUM | Already filed as `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` — update its scope |
| F4 | LOW | Defer (no flicker observed in HTTP tests; no QA report yet) |

No HIGH or CRITICAL findings. No findings block this SPEC's closure.

---

*End of FINDINGS.*
