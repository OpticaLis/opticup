# SPEC — M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING

**Type:** Tech-debt closure
**Tier:** T2.1 of `OVERNIGHT_BUNDLE_2_2026_05_14`
**Module:** Module 1.5 — Shared Components (check infra)
**Author:** opticup-strategic (Foreman, overnight Bundle 2)
**Date:** 2026-05-14

---

## 1. Why this SPEC exists

Bundle 1 escalation `2026-05-14T22-15Z_destructive_ops_check_blocks_declared_deletes.md` documented: `scripts/checks/destructive-ops-declared.mjs` flags every staged file deletion as a violation, even when the SPEC's `## Destructive Operations` section explicitly authorizes the deletion. This blocked Bundle 1's T2.2 + T2.3 (CSS housekeeping deletions) and would block Bundle 2's combined T2.2+T2.3.

Root cause: the section-B logic at lines 234–243 walks `git diff --cached --name-only --diff-filter=D` and unconditionally creates a violation per staged delete. It never reads the SPEC.md's `## Destructive Operations` section to check authorization.

This SPEC fixes the parser to consult the staged SPEC's authorization list and skip the violation when the deletion is declared.

## 2. Scope

- **Edits:** `scripts/checks/destructive-ops-declared.mjs` (additive — adds authorization-resolution logic).
- **Add:** test fixtures and a regression test under `tests/checks/destructive-ops-declared.test.mjs` (or extend if exists). T2.2+T2.3 will integration-test the live deletion path.
- **Read-only:** `tests/`, `scripts/verify.mjs`, current SPEC bodies (for pattern study).
- **No DB. No Edge Function. No HTML.**

## 3. Acceptance criteria

1. ✅ `destructive-ops-declared.mjs` reads the `## Destructive Operations` section of every staged SPEC.md.
2. ✅ Each staged file deletion (from `git diff --cached --diff-filter=D`) is matched against the section text. Match rules (any of the following triggers authorization):
   - **basename match:** the deleted file's basename appears in the section verbatim (e.g. `crm-screens.css`).
   - **full-relative-path match:** the deleted file's relative path appears in the section (e.g. `css/crm-screens.css`).
   - **directory-prefix match with extension globbing:** if the section contains `css/*.css` or `<dir>/*.<ext>`, deleted files inside that directory with that extension are authorized.
3. ✅ If matched → no violation surfaced for that delete.
4. ✅ If no SPEC.md is staged OR no SPEC's section authorizes the delete → existing behavior preserved (violation raised).
5. ✅ Two regression tests added: (a) authorized deletion passes (no violation), (b) unauthorized deletion fails (violation). Both must run inside `npm run test:integrity-gate` style with no external git operations (simulate via mocked diff output).
6. ✅ Standalone `--scan` mode unchanged.
7. ✅ The existing `null-bytes.mjs`-style standalone help/version flags continue to behave.
8. ✅ Iron Rule 31 integrity gate exit 0 after edits.

## 4. Destructive Operations

**None.** Pure additive edits to `scripts/checks/destructive-ops-declared.mjs` + new test file. No deletions, no DROPs, no rebases, no rewrites of existing logic.

## 5. Plan

1. Read the current `destructive-ops-declared.mjs` (already done in pre-flight).
2. Read the Bundle 1 escalation file (`modules/Module 4 - CRM/escalations/2026-05-14T22-15Z_destructive_ops_check_blocks_declared_deletes.md`).
3. Add `readSpecAuthorizedDeletes(staged) → Set<string>` helper that:
   - Walks `staged` for any path matching `isSpecPath`.
   - Reads each SPEC.md from disk (or from staged content via `git show :path`).
   - Extracts the `## Destructive Operations` (or `## 4. Destructive Operations`) section.
   - Tokenizes the section against deleted filenames (basename / relative path / directory glob).
   - Returns the union set of authorized paths.
4. Modify the default-export check function: before pushing a `File deletion staged` violation for `del`, consult the authorization set. Skip if authorized.
5. Add regression test file `tests/checks/destructive-ops-declared.test.mjs` (Node test runner pattern, similar to existing `tests/integrity-gate.test.mjs` if any). 2 cases minimum:
   - **Case A (authorized):** SPEC.md staged with `## Destructive Operations` listing `css/crm-screens.css`. Mocked `git diff --cached --diff-filter=D` returns `css/crm-screens.css`. Expected: 0 violations from section-B.
   - **Case B (unauthorized):** SPEC.md staged with `## Destructive Operations` = `**None.**`. Mocked delete returns `js/important.js`. Expected: 1 violation from section-B.
6. Add a `npm` script `test:destructive-ops` that runs the test. Wire into `scripts/verify.mjs` if a `test` block exists; if not, leave standalone.
7. Run `npm run verify:integrity` + `npm run test:destructive-ops` → both exit 0.
8. Commit + push.

## 6. Expected outputs

- 1 file modified: `scripts/checks/destructive-ops-declared.mjs` (~70 lines added, no deletions).
- 1 file added: `tests/checks/destructive-ops-declared.test.mjs`.
- 1 `package.json` entry added: `test:destructive-ops` script.
- SPEC closure docs (EXECUTION_REPORT, FINDINGS, FOREMAN_REVIEW) in this folder.

## 7. Test plan

After implementation:

1. **Smoke A (authorized declared):** Build a temp SPEC.md with `## Destructive Operations` listing `css/employees.css`. Stage it together with `git rm css/employees.css`. Run the check via `node scripts/checks/destructive-ops-declared.mjs` invoked through verify.mjs's --staged path. Expected: 0 violations.
2. **Smoke B (unauthorized):** Same stage but section reads `**None.**`. Expected: 1 violation.
3. Both smokes encoded as the regression test file. No external git state needed — test mocks `execSync` for `git diff` calls.

Test plan ⊆ acceptance §5.

End of SPEC.
