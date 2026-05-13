# FINDINGS — M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC template missing explicit "Destructive Operations: None" declaration

- **Code:** `M3-SPEC-01`
- **Severity:** LOW
- **Discovered during:** §6 Iron-Rule Self-Audit row for Rule 32
- **Location:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (current template) + `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/SPEC.md` (current SPEC).
- **Description:** Iron Rule 32 (CLAUDE.md §6) requires every SPEC.md to declare a `## Destructive Operations` (or `## 4. Destructive Operations`) section. This SPEC does NOT have that section explicitly — Rule 32 is satisfied by-construction because §6 Rollback says "No DB changes. No view changes. No file deletions." and §7 Out of Scope is exhaustive, but the pre-commit `destructive-ops-declared.mjs` gate (when it runs against SPEC.md) might flag it. The gate likely passes today because the SPEC is small enough that no destructive patterns trigger, but the SPEC template should include the explicit declaration for hygiene + Rule-32 compliance audit clarity.
- **Reproduction:**
  ```
  grep -n "## Destructive Operations\|## 4. Destructive Operations" modules/Module\ 3\ -\ Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/SPEC.md
  # returns nothing
  ```
- **Expected vs Actual:**
  - Expected: SPEC.md contains `## Destructive Operations` with `None.` or numbered list per Rule 32.
  - Actual: section absent.
- **Suggested next action:** TECH_DEBT (and concurrent SPEC_TEMPLATE.md amendment by `opticup-strategic`).
- **Rationale for action:** Single trivial fix — append "Destructive Operations: None." to existing/future SPECs. Should happen in the SPEC_TEMPLATE.md edit cycle, not via a dedicated SPEC. Foreman can flag this as a permanent template addition during the FOREMAN_REVIEW writing here.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `gh` CLI not authenticated in the Claude Code executor shell

- **Code:** `M3-OBS-02`
- **Severity:** INFO
- **Discovered during:** §9 Commit Plan, Commit 1 — attempting to open PR via `gh pr create`
- **Location:** Claude Code session shell (Windows desktop, `C:\Users\User\opticup`).
- **Description:** `gh auth status` returns "You are not logged into any GitHub hosts." `env | grep -iE 'GH_TOKEN|GITHUB_TOKEN'` returns empty. The result is that any SPEC that includes `gh` CLI invocations cannot complete those steps autonomously today — workaround is to emit a manual compare URL and let Daniel finalize. This is not a fault in the SPEC or in the executor; it is a one-time setup gap on this machine (or possibly a deliberate "no Claude-initiated PR creation" policy).
- **Reproduction:**
  ```
  $ gh auth status
  You are not logged into any GitHub hosts. To log in, run: gh auth login

  $ env | grep -iE 'GH_TOKEN|GITHUB_TOKEN'
  (empty)
  ```
- **Expected vs Actual:**
  - Expected (for SPECs that say "Open PR to `main`"): `gh pr create` succeeds.
  - Actual: blocked on auth; manual compare URL surfaced as fallback.
- **Suggested next action:** DISMISS (with optional follow-up if Daniel wants to enable `gh`-driven PR creation).
- **Rationale for action:** Manual PR creation is a 30-second human action. If Daniel wants executor-driven PRs, a one-time `gh auth login` on each machine, OR setting `GH_TOKEN` in `$HOME/.optic-up/credentials.env`, OR a Phase 1 autonomy item — but today's workaround (compare URL) is fine and arguably safer (human-gate before PR opens).
- **Foreman override (filled by Foreman in review):** { }

---
