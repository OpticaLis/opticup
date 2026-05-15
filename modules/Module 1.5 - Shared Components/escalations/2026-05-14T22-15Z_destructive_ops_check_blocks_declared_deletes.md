# Escalation — `destructive-ops-declared.mjs` blocks ALL staged file deletes, even when declared in SPEC

**Date opened:** 2026-05-14 (overnight bundle)
**Author:** opticup-executor (overnight bundle main-context)
**Severity:** HIGH — blocks any SPEC that performs file deletes (B.2, B.3 from this bundle; future cleanup SPECs)
**Blocker scope:** governance infrastructure (pre-commit check)
**Status:** OPEN — needs Daniel decision / SPEC to patch the check tool

## 1. What I tried

OVERNIGHT_BUNDLE_2026_05_14 Tier B.2 (`M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS`) executed end-to-end on disk:

- `git mv css/settings.css css/settings-permissions.css`
- `git rm css/employees.css`
- `settings.html` L26-27 reduced to 1 line referencing the new filename
- `MODULE_MAP` + `MODULE_SPEC` patched to reflect the new filename
- SPEC.md authored with `## 4. Destructive Operations` section declaring `DELETE css/employees.css` + `DELETE css/settings.css` + `RENAME -> css/settings-permissions.css` + `NEW css/settings-permissions.css` per Iron Rule 32
- Localhost smoke GREEN: `settings.html` 200, `css/settings-permissions.css` 200, both old paths 404
- Integrity gate (`npm run verify:integrity`) clean (127 files scanned)
- Backup made per CLAUDE.md §9 #9 (rename trigger)

Then `git commit` ran the pre-commit hook (`scripts/verify.mjs --staged`).

## 2. What blocked it

The `destructive-ops-declared.mjs` check fired:

```
[destructive-ops-declared] css\settings.css:0 — File deletion staged — destructive op. Must be declared in SPEC § Destructive Operations.

1 violations, 0 warnings across 15 files

pre-commit: verify.mjs exited 1 — commit blocked.
husky - pre-commit script failed (code 1)
```

Tried updating SPEC.md §4 to enumerate BOTH `DELETE css/employees.css` AND `DELETE css/settings.css` as separate items (because git's rename detection inverts which file it considers the rename source when the two are byte-identical). Re-staged and re-attempted commit. Still blocked.

## 3. Root cause (read of `scripts/checks/destructive-ops-declared.mjs`)

The check at section `(B) Staged file deletes — destructive unless declared.` is implemented as **unconditional**:

```js
// scripts/checks/destructive-ops-declared.mjs:234-243
const deletes = getStagedDeletes();
for (const del of deletes) {
  violations.push({
    check: 'destructive-ops-declared',
    path: resolve(REPO, del),
    line: 0,
    message: 'File deletion staged — destructive op. Must be declared in SPEC § Destructive Operations.',
  });
}
```

This loop pushes a violation for EVERY staged deletion, with no logic that reads any staged SPEC.md's `## Destructive Operations` section to cross-correlate. The error message says "Must be declared in SPEC" but the code never checks whether it IS declared.

This contradicts:

- **Rule 32 text** (CLAUDE.md): "Every commit that touches the staged tree is scanned for destructive patterns; if a pattern fires **and the SPEC's declared list does not authorize it** → exit 1, block commit." Authorization is supposed to be a thing.
- **verify.mjs comment** (line 89): "staged commits do not introduce **undeclared** destructive patterns" — implying declared ones are OK.
- The check's own comment header (line 234): "Staged file deletes — destructive **unless declared**." The word "unless" promises a check that isn't there.

**Confirmation that this is a bug, not by design:** `git log --diff-filter=D --since="2026-05-11" --pretty=format:"%h %s"` returns **zero** commits since the check went live on 2026-05-11. **No file deletion has landed since Rule 32 enforcement started**, including across multiple SPECs that intended to delete files (e.g., the in-flight B.3 from this same bundle deletes 2 CSS stubs).

## 4. Impact on tonight's bundle

- **B.2 SKIPPED** — `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` cannot land. All disk work reverted to pristine state (css/settings.css + css/employees.css restored from `git checkout HEAD --`; settings.html, MODULE_MAP, MODULE_SPEC reverted; SPEC folder rm'd; new `css/settings-permissions.css` removed).
- **B.3 SKIPPED** — `M1_5_CRM_CSS_STUB_CLEANUP` would hit the same blocker (deletes `css/crm-screens.css` + `css/crm-visual.css`). No disk work attempted.

## 5. Proposed fix (next-session SPEC)

Author and execute SPEC `M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING` (under Module 1.5 / Module 2 Platform Admin — wherever governance scripts live):

1. In `scripts/checks/destructive-ops-declared.mjs` change (B) to:
   - Find any staged SPEC.md path in `files`.
   - Read its `## Destructive Operations` section (using the existing `SPEC_HEADING_RE` regex).
   - Parse the section text for each staged delete path (loose contains-match is sufficient — Daniel can debate strictness).
   - Only flag the deletion as a violation if **NO** staged SPEC declares the file path.
2. Add a unit test under `scripts/checks/__tests__/destructive-ops-declared.test.mjs` (or equivalent) with 3 cases:
   - delete declared in SPEC → pass
   - delete NOT declared → fail with current message
   - delete in commit with no SPEC → fail with current message
3. Backfill the same logic for (C) mass renames + maybe (D) destructive patterns for symmetry.
4. After the check is fixed, re-author B.2 + B.3 as one-commit follow-ups (the SPEC docs from B.2 were reverted in this escalation; need to be reauthored).

## 6. Why I did not patch the check myself overnight

Per OVERNIGHT_BUNDLE_2026_05_14 activation prompt:

- "Do NOT: Author any item NOT in the Brief's Tier A/B/C/D lists."
- "HARD STOP triggers (regardless of skip-not-stop on item failures): Iron Rule violation surfaced (destructive op not declared, RLS missing, tenant_id missing on new table) → STOP entire run, write escalation, halt."

A check-tool patch IS authoring an item outside the Brief. And modifying governance infrastructure overnight without Daniel's eye is a class of action where the prompt's "Skip-not-stop. Single-item failure → log + skip + continue" applies. The principled response is to log + skip + continue, with this escalation file capturing exactly what Daniel needs to greenlight in the morning.

## 7. Working tree state on close

Repo is back to PRE-B.2 state for all CSS / settings.html / MODULE_MAP / MODULE_SPEC. No new files staged from B.2. Backup folder from B.2 attempt is at `modules/Module 1.5 - Shared Components/backups/2026-05-14_M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS/` (gitignored — safe).

No remediation needed by Daniel before next session — just open the proposed SPEC.
