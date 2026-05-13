# FINDINGS — M3_QUICK_REGISTER_ROLLBACK

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_ROLLBACK/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC pre-state assumption was wrong by 1 commit; need a pre-flight gate for rollback SPECs

- **Code:** `M3-SPEC-02`
- **Severity:** MEDIUM
- **Discovered during:** Pre-flight verification of `git log origin/main..origin/develop --oneline` before any revert
- **Location:** `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_ROLLBACK/SPEC.md §3 Criterion 6`
- **Description:** SPEC §3 Criterion 6 stated "2 commits on `develop` ahead of main BEFORE this SPEC; 0 commits ahead of main AFTER". Both halves of the claim were wrong:
  - **BEFORE:** Only 1 commit was ahead of main (`84e7e88`). The other commit (`ac6eef6`) had already been merged to main via PR #21 between the two prior SPECs.
  - **AFTER:** With the SPEC's explicit two-revert instruction in §10, `develop` ends 3 commits ahead of main (the original `84e7e88` + the 2 revert commits), not 0. To reach 0, the reverts would also need to land on main — a Daniel-only operation not authorized within this SPEC.
- **Reproduction:**
  ```
  git fetch origin
  git log origin/main..origin/develop --oneline | wc -l   # Returns 1, not 2
  git log origin/main..HEAD --oneline | wc -l             # After both reverts: returns 3, not 0
  ```
- **Expected vs Actual:**
  - SPEC's BEFORE expectation: 2 commits ahead.
  - Actual BEFORE: 1 commit ahead.
  - SPEC's AFTER expectation: 0 commits ahead.
  - Actual AFTER (post-revert): 3 commits ahead.
- **Suggested next action:** TECH_DEBT (target the executor SKILL.md improvement in EXECUTION_REPORT §8 Proposal 1 — pre-flight gate for rollback SPECs). Plus a Foreman-side template addition: rollback SPECs should require the author to re-run `git log origin/main..origin/develop --oneline | wc -l` at draft time and write the result into the SPEC's pre-state criterion verbatim, not from memory.
- **Rationale for action:** Affects SPEC-author-quality + executor-pre-flight robustness. Not a code bug, but a process-quality issue that surfaced as a SPEC-vs-reality contradiction during execution. The right fix is layered:
  1. Foreman: re-verify counts at SPEC-author time. (SPEC_TEMPLATE addition.)
  2. Executor: pre-flight gate that STOPs when counts don't match. (Executor SKILL §1.5b.)
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Page-terminology lock arrived after the cost was paid

- **Code:** `M3-TERM-01`
- **Severity:** LOW
- **Discovered during:** Reading SPEC §12 "Lessons Already Incorporated", which cites L-SITE-002 ("Daniel's terminology for 'supersale page' always means `/supersale/`") as "Already locked in `SITE_OVERSEER_SKILL.md` (commit pending)"
- **Location:** `roles/site-overseer/SITE_OVERSEER_SKILL.md` (pending) + the original two SPECs `M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/SPEC.md` + `M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION/SPEC.md`
- **Description:** The root cause of this rollback is that the SPEC author (Foreman, Site-Overseer hat) wrote two SPECs targeting `/quick-register/` (Module 4 CRM walk-in registration page) when Daniel had been referring to `/supersale/` (the public SuperSale landing/lead-form page). Both pages serve "lead-form-for-SuperSale-customers" semantically, which made the confusion easy. The lesson is now being locked into the Site Overseer skill — but only AFTER two SPECs landed and one of them reached production (`ac6eef6` was merged via PR #21 into main and Vercel-deployed). The legal-compliance fix that motivated REC-SITE-020 (pre-tick removal) is still NEEDED — just on the correct page `/supersale/`.
- **Reproduction:** Not reproducible (one-time terminology mismatch). The fix is preventative.
- **Expected vs Actual:**
  - Expected: SPEC author confirms page slug against live URL before authoring. Either by `curl https://www.prizma-optic.co.il/quick-register/` + `curl https://www.prizma-optic.co.il/supersale/` and comparing rendered forms, OR by asking Daniel "you mean the page at slug X, right?" before drafting.
  - Actual: SPEC author worked from memory + the original 2026-05-13 audit notes that referenced "/quick-register/" — the audit may itself have used the wrong slug consistently, so the SPEC inherited the error.
- **Suggested next action:** NEW_SPEC (the L-SITE-002 lock + SITE_OVERSEER_SKILL.md commit) + DISMISS for this finding once the lock lands. Also: the correct-page work `M3_SUPERSALE_MARKETING_CHECKBOX` will need its own SPEC.
- **Rationale for action:** The structural fix (skill lesson lock) is already in motion per SPEC §12. The historical cost (one rollback SPEC) is sunk. Logging this finding here is signal for the FOREMAN_REVIEW to confirm the lesson is fully harvested.
- **Foreman override (filled by Foreman in review):** { }

---
