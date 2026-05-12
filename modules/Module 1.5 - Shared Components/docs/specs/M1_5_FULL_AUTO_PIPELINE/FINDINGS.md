# FINDINGS — M1_5_FULL_AUTO_PIPELINE

## Findings discovered during execution

### F1 — `destructive-ops-declared.mjs` self-detected its own pattern definitions on first staging (LOW, resolved during commit 2)

**Severity:** LOW (caught and fixed before commit 2 landed)
**Location:** `scripts/checks/destructive-ops-declared.mjs` lines 67-79 (pattern definitions block)
**Description:** On the first staging pass of commit 2, the new check fired against itself: the regex `DROP TABLE`, `git push --force`, `--no-verify`, etc. were inside the check's own pattern-definition source, and the check (correctly) detected them as destructive patterns in the diff. The check was already designed with an `isDocFile()` exemption, but that list did not include `scripts/checks/*.mjs`.
**Resolution applied in same commit:** Extended `isDocFile()` to exempt `scripts/checks/.+\.mjs$` and `scripts/verify.mjs` — these files define/list destructive patterns by name, not by deed. Re-verified clean.
**Status:** RESOLVED within commit 2. No follow-up SPEC needed.
**Suggested next action:** None — the fix is in place.

### F2 — `## Destructive Operations` section format is not schema-validated (MEDIUM, future SPEC candidate)

**Severity:** MEDIUM
**Location:** `scripts/checks/destructive-ops-declared.mjs` — `checkSpecHasSection()` function
**Description:** The check verifies the SPEC.md has a `## Destructive Operations` heading and that the next non-blank line is content. It does NOT verify the content is a numbered list, doesn't enforce a vocabulary for "declared op types" (file deletes, DROPs, renames, etc.), and doesn't cross-reference the declared list against the actual staged diff. A SPEC author could write `## Destructive Operations\n\nyes lots` and the check would pass. The DEFENCE-in-depth pattern catch (D) in the check still works regardless — it scans the actual diff — so this is a strictness gap, not a correctness bug.
**Suggested next action:** Open a future SPEC (proposed slug: `M1_5_DESTRUCTIVE_OPS_SCHEMA_TIGHTEN`) to add a schema: SPEC must contain `## Destructive Operations` followed by either `None.` OR a numbered list of typed ops (one of: file-delete / mass-rename / sql-drop / sql-truncate / sql-alter-drop / force-push / rebase / merge-to-main). The check then cross-references the declared types against the patterns it detects.

### F3 — Bootstrap-exception path is undocumented in skill files (LOW, addressed by EXECUTION_REPORT proposal 1)

**Severity:** LOW
**Location:** `.claude/skills/opticup-executor/SKILL.md` `## Pipeline Hand-off` section
**Description:** When the chain SKILL.md files are themselves being modified in the same session as a SPEC execution (e.g. a meta-SPEC that bootstraps the chain), the executor faces an ambiguity: load Skill: opticup-strategic to author a test SPEC, or fulfil that role in-line? This SPEC encountered it and decided in-line (documented in test SPEC EXECUTION_REPORTs §0). The SKILL.md does not say.
**Suggested next action:** Apply EXECUTION_REPORT §9 proposal 1 in the next opticup-strategic session — add `### Bootstrap-exception clause` under the Hand-off section.

### F4 — `start-local.ps1` Test-Port function may report `STORE=000` on slow first hit (INFO, known issue, not addressed)

**Severity:** INFO
**Location:** `scripts/start-local.ps1` — `Test-Port` function (`Invoke-WebRequest -TimeoutSec 3`)
**Description:** During execution, a fresh `curl -m 3 http://localhost:4321` returned `STORE=000` (timeout) while the storefront was actually up — confirmed by re-running with `scripts/start-local.ps1` (uses `Invoke-WebRequest -TimeoutSec 3`). The history note in start-local.ps1 itself mentions a 3s timeout was chosen for Astro cold-hit. So this is known and tuned for the script's own use; the `curl -m 3` direct invocation hit the same edge but doesn't matter to the pipeline because the script handles it correctly.
**Suggested next action:** None — known and tuned.

## Findings that did NOT surface

- Smoke baseline regressions: none.
- Iron Rule violations in untouched code: none.
- Stale documentation that needed updates beyond this SPEC's scope: none observed.
- Cross-module integrity issues: none observed.
