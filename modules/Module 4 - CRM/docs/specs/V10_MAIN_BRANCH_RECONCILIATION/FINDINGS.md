# FINDINGS — V10_MAIN_BRANCH_RECONCILIATION

> **Location:** `modules/Module 4 - CRM/docs/specs/V10_MAIN_BRANCH_RECONCILIATION/FINDINGS.md`
> **Written by:** opticup-executor
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Summary

One INFO-severity finding logged below. No HIGH/MEDIUM/LOW findings during this SPEC execution — the audit-bypass-PR sequence ran cleanly with no surprises in the codebase.

---

## Findings

### Finding 1 — `gh` CLI absent on Windows desktop machine

- **Code:** `M0-TOOL-01`
- **Severity:** INFO
- **Discovered during:** Step 4 (PR-open) — the SPEC §10 listed `gh` as a precondition; runtime check via `gh auth status` returned `command not found` in both Git Bash and PowerShell.
- **Location:** Windows desktop development environment (`🖥️ C:\Users\User\opticup`)
- **Description:** The `gh` CLI is not installed (or not on PATH) on this machine. SPEC §10 listed it as a Dependencies/Preconditions item. Worked around by calling the GitHub REST API directly via `curl` using the GitHub OAuth token already stored in the Windows credential manager (`git credential fill`). PR #41 was created successfully via the REST fallback. Note: a background `winget install --id GitHub.cli` was also kicked off and reported exit-code-0 success after the PR was already opened (the install may have landed but the executor had already committed to the REST path).
- **Reproduction:**
  ```
  PS> gh --version
  → 'gh' is not recognized as the name of a cmdlet, function, script file, or operable program.
  bash> command -v gh
  → (no output, exit 1)
  ```
- **Expected vs Actual:**
  - Expected: `gh` available per SPEC §10 precondition.
  - Actual: not on PATH; REST fallback used.
- **Suggested next action:** **TECH_DEBT** (or low-priority NEW_SPEC) — install `gh` on the Windows desktop AND the Mac AND the Windows laptop, then add `command -v gh && gh auth status` to the executor First Action protocol so the gap is detected at session start instead of mid-execution.
- **Rationale for action:** Toolchain consistency across the three development machines (Win desktop / Win laptop / Mac) reduces "works on my machine" friction. The REST fallback is fine but `gh pr view --json mergeable` etc. are more ergonomic than hand-rolled curl + node JSON parsing.
- **Foreman override (filled by Foreman in review):** { }

---

## No other findings

The audit (Step 1) discovered exactly the pattern the SPEC predicted: 21 content-duplicate commits on local main with no real-work commits never pushed. The merge against `origin/main` was conflict-free. No code health, security, RLS, or schema issues were uncovered (and none were searched for — out of scope for this SPEC).
