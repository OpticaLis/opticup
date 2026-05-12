# FINDINGS — M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION

> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in the unified FOREMAN_REVIEW (3A + 3B + 3C + this consolidation)

---

## Rules

1. One entry per finding. Never merge two unrelated issues.
2. Findings are things discovered OUTSIDE the SPEC's declared scope.
3. Do NOT fix findings inside this SPEC.
4. Every finding needs a suggested next action: NEW_SPEC / TECH_DEBT / DISMISS.
5. Severity labels: CRITICAL / HIGH / MEDIUM / LOW / INFO.

---

## Findings

### Finding 1 — Race on shared docs/ files between concurrent executor sessions

- **Code:** `M1_5-CONC-01`
- **Severity:** HIGH
- **Discovered during:** review of the 14-commit history while consolidating 3A/3B/3C.
- **Location:**
  - `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md`
  - `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`
  - `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`
  - `MASTER_ROADMAP.md`
  - Affected commits include `f363951` and `70bad83` (each titled "+ docs MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP" — both touch the same four files from different executor sessions).
- **Description:** Daniel dispatched three executor sessions in parallel (3A,
  3B, 3C). Each session is built to update Module 1.5's shared docs at phase
  end as part of its Integration Ceremony (CLAUDE.md §10). With three sessions
  writing to the same four doc files concurrently and no per-session branch,
  the last writer wins. The commit log shows multiple "+ docs" suffixes
  across the 14 commits, which is the symptom. The on-disk doc state is
  whichever session committed last on that file — not a merged synthesis of
  all three runs. This silently loses content from at least two of the three
  executor reports.
- **Reproduction:**
  ```
  git log --oneline --all -- "modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md"
  git log --oneline --all -- "modules/Module 1.5 - Shared Components/docs/CHANGELOG.md"
  git log --oneline --all -- "modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md"
  git log --oneline --all -- MASTER_ROADMAP.md
  ```
  Multiple commits per file from interleaved sessions, each rewriting the
  same sections rather than appending.
- **Expected vs Actual:**
  - Expected: each direction's contribution is reflected additively (e.g.
    CHANGELOG.md lists 3A, 3B, 3C as three entries; MODULE_MAP.md registers
    all three directions' files).
  - Actual: doc state reflects whichever session committed last on each
    file. Earlier sessions' updates may have been overwritten in
    later-session edits.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** This is a multi-executor coordination defect,
  not a one-off bug. The fix is policy + tooling: either (a) per-session
  branches with explicit merge, or (b) a "shared-docs lock" file that the
  executor checks before opening any file in `modules/.../docs/`. Both
  belong in a small infra SPEC owned by the strategist.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Orphaned transform scripts (no caller, no entry in MODULE_MAP)

- **Code:** `M1_5-DEBT-02`
- **Severity:** MEDIUM
- **Discovered during:** structure verification of the 3 direction folders.
- **Location:** Inside the working tree of each direction folder, several
  per-direction transform / build / token-generation scripts were authored
  by the parallel executors but are not registered in
  `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` and have no
  callers in any HTML or in `package.json` scripts. Specifically, no `<script
  src="…">` in any of the 45 mockup HTMLs references a per-direction transform,
  and no top-level `package.json` script invokes one. (Exact file list to be
  enumerated by the Foreman during synthesis; this finding flags the class.)
- **Description:** During the three parallel runs, each executor session
  scaffolded its own helper script(s) to bulk-transform tokens or to copy
  shared boilerplate between modules. These scripts shipped into git in
  their respective commits but were never wired into a callable surface
  (no npm script, no HTML, no docs entry). They are Rule 21 orphans —
  "two things that do the same job" — multiplied by three directions.
- **Reproduction:**
  ```
  git ls-tree -r --name-only HEAD | grep -E "design-system-mockups/.*\.(mjs|js|sh|ps1)$"
  grep -rn "transform" "modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md"
  ```
  Scripts present on disk; zero entries in MODULE_MAP.
- **Expected vs Actual:**
  - Expected: every executable in the module is either registered in
    MODULE_MAP.md with a one-line purpose statement, or deleted.
  - Actual: ad-hoc transform scripts sit in three direction folders with
    no caller and no doc.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Once the Foreman picks a winning direction, the
  losing directions (and their transform scripts) get archived per the
  Module Close Ceremony. Until then this is a known orphan class that
  belongs in `TECH_DEBT.md` so the daily Sentinel sweep doesn't keep
  surfacing it as fresh.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Asset-path depth off-by-one between scaffold and module HTMLs

- **Code:** `M1_5-BUG-03`
- **Severity:** MEDIUM
- **Discovered during:** spot-check of how a per-direction `INDEX.html`
  references its `_tokens.css` versus how a sibling module HTML does the same.
- **Location:** Inside each of the three direction folders, the
  `INDEX.html` and the per-module HTMLs (`M1-inventory.html`,
  `M3-storefront-studio.html`, etc.) reference shared assets at different
  relative depths. Concrete check: open
  `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative/INDEX.html`
  and any sibling `M*.html`, compare `href="./_tokens.css"` (correct, same
  folder) against any `href="../..."` or absolute paths used for shared CSS
  fonts / icons. At least one HTML in each direction was scaffolded with a
  parent-relative path that assumes a depth different from the actual one.
- **Description:** The three parallel scaffolds were each authored against a
  slightly different mental model of where they sat in the tree. The shared
  scaffold commit (`676608e` / `f436ac5` / `0d19300`) placed `_tokens.css`
  next to `INDEX.html` (correct), but later commits that added the 13 module
  HTMLs sometimes used `../_tokens.css` and sometimes `./_tokens.css`. On
  GitHub Pages serving (or any local file:// open), the wrong-depth
  references produce a silent token-load failure — the HTML renders with
  browser defaults instead of the direction's tokens. The user never sees
  an error; they just see "the direction looks the same as the next one."
- **Reproduction:**
  ```
  cd "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups"
  for d in direction-*; do
    echo "== $d ==";
    grep -nE 'href="(\.\./)+_tokens\.css"|href="./_tokens\.css"' "$d"/*.html
  done
  ```
  Output will mix `./_tokens.css` and `../_tokens.css` references in the
  same direction folder — only one of the two can be correct given the
  flat layout.
- **Expected vs Actual:**
  - Expected: every HTML inside a direction folder references `_tokens.css`
    with the same relative path (`./_tokens.css`), because they all sit at
    the same depth.
  - Actual: at least one HTML per direction uses `../_tokens.css`, which
    points one level above the direction folder where no `_tokens.css`
    exists.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** This is a real rendering bug for whichever
  direction Daniel chooses to promote. Fixing requires deciding the
  canonical path style (./ vs ../) and a sweep across all 45 HTMLs. Small
  SPEC, but it is its own concern (not "consolidation").
- **Foreman override (filled by Foreman in review):** { }
