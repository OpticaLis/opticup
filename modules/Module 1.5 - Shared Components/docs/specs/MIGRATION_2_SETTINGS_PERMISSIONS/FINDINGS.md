# FINDINGS — MIGRATION_2_SETTINGS_PERMISSIONS

Findings discovered during execution that are NOT in this SPEC's scope. Each entry has a severity, location, description, and suggested next action. Per `opticup-executor` SKILL.md §3, findings are logged and forwarded — never silently fixed inside this SPEC.

---

## F1 — `css/settings.css` and `css/employees.css` are byte-identical (Rule 21 violation, pre-existing)

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Location | `css/settings.css` (396 lines) ≡ `css/employees.css` (396 lines) |
| Discovered by | Pre-Authoring Reality Check (SPEC §0) |
| Evidence | `md5sum css/settings.css css/employees.css` → both `c318c26079c5009995492cad11024484` |
| Description | Both files contain the FULL Module-1 inventory stylesheet plus settings-specific selectors (`.settings-container`, `.settings-title`, `.settings-section`, etc.) appended at the bottom. Neither file has any selector specific to the employees / permissions UI. The two file paths are loaded by different HTML pages (`settings.html` loads `css/settings.css`, `employees.html` loads `css/employees.css`) but the served content is identical. This is a Rule 21 (No Orphans, No Duplicates) violation. It pre-dates this SPEC and was not introduced here. |
| Why we did not fix | Brief §5 (Out-of-Scope) and SPEC §8 explicitly forbid touching either file in MIGRATION_2. Deduplication is a separate concern requiring a careful migration: one of the two files must be deleted, the surviving file may need to be renamed (e.g., to `css/settings-employees.css` or split into `css/inventory-base.css` + `css/settings-page.css` + `css/employees-page.css`), and BOTH HTML pages need their `<link rel="stylesheet">` line updated. Doing this inside MIGRATION_2 would violate the one-concern-per-task rule and risk a regression in production. |
| Suggested next action | New SPEC `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` (small, ~1-2 commits): (1) split the shared part out as `css/page-base.css` (or rename to `css/styles-shared.css`); (2) keep the settings-specific tail (lines 380–397) in `css/settings.css`; (3) create a tiny `css/employees.css` with only employees-specific overrides (currently empty); (4) update both HTML `<link>` lines. Recommend running this AFTER all 4 visual migrations land and before the batch merge to `main`. |
| Risk if not addressed | Future edits to either file must be applied to the OTHER file too, or they silently drift. Drift creates a confusing bug where `settings.html` and `employees.html` render different layouts despite "the same" stylesheet. |

---

## F2 — `css/header.css` literal fallback `var(--primary, #1a237e)` becomes stale across migrations

| Field | Value |
|---|---|
| Severity | LOW |
| Location | `css/header.css` lines 185, 272–278, 302–311, 317 |
| Discovered by | Reality Check + post-edit reasoning |
| Description | `header.css` uses the pattern `var(--primary, #1a237e)` and `color: var(--primary, #1a237e)` in several places — `--primary` is the live token, `#1a237e` (Indigo) is the fallback for cases where the variable is undefined. After all 4 visual migrations land, the live `--primary` will be Navy `#1e3a8a` on those 4 pages and slate `#0f172a` on the rest (via `shared/css/variables.css`). The Indigo fallback `#1a237e` will NEVER be reached at runtime — it's purely cosmetic-debt. |
| Why we did not fix | Out of scope. Removing the fallback is a `header.css` mutation; changing the fallback to Navy is a header.css mutation. Either propagates site-wide. Deferred. |
| Suggested next action | After all 4 migrations + the planned variables.css cleanup SPEC, sweep `css/header.css` (and any other shared CSS) and replace `var(--primary, #1a237e)` with plain `var(--primary)` everywhere. Or update fallback to the slate platform default `#0f172a`. Not urgent. |

---

*End of FINDINGS.md. Pending Reviewer + Localhost-Tester additions if they discover anything new.*
