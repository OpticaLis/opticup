# SPEC — M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION/`
> **Type:** Meta / consolidation SPEC (post-hoc, no new code)
> **Authored by:** opticup-executor (dispatched by Daniel, 2026-05-11)
> **Predecessor SPECs:** `M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE`, `M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN`, `M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL`

---

## 1. Goal

Reconcile and ship the local-only history that accumulated from three parallel
executions of the 3-direction design-system mockups SPECs (3A / 3B / 3C). The
working tree was 14 commits ahead of `origin/develop`. Commit attribution had
drifted across the parallel runs — e.g. `94c9c57 chore(spec): close 3A...`
actually contains three `direction-2-modern-clean/` HTML outputs that belong
to the 3B execution.

This SPEC has no code deliverable. Its only outputs are: (1) verifying the
on-disk artifacts are complete and uncorrupted, (2) pushing the 14 commits as
they stand, (3) documenting the merge + concurrency findings for the Foreman.

## 2. Why this exists

Daniel ran 3A, 3B, 3C as three parallel executor sessions against the same
working tree. The sessions interleaved file writes and commits without
per-direction branches, producing:

- 14 commits ahead of `origin/develop` that span all three directions.
- At least one commit message that names one direction but ships another
  direction's files.
- Three independent SPEC folders, each with its own EXECUTION_REPORT.md and
  FINDINGS.md, that have no shared synthesis.

A rebase / squash / reset would risk losing the on-disk artifacts. The
ground-truth output (45 files = 3 directions × (13 HTMLs + INDEX.html +
_tokens.css)) is intact. The user's explicit instruction was: **the messy
history is preferable to risking the artifacts.**

## 3. Success Criteria (measurable)

1. `git log --oneline origin/develop..HEAD` returns 14 lines (before push).
2. `git ls-tree` confirms 3 direction folders, each containing exactly 15
   files (13 module HTMLs `M1, M3, M4, M5, M6, M7, M8, M9, M11, M12, M13,
   M14, M15` + `INDEX.html` + `_tokens.css`).
3. `npm run verify:integrity` → exit 0 (no null-byte corruption).
4. `npm run smoke` → 7/7 passed.
5. `git push origin develop` succeeds. After push: `git rev-parse HEAD ==
   git rev-parse origin/develop`.
6. Three new files committed in this SPEC folder: `SPEC.md` (this),
   `EXECUTION_REPORT.md`, `FINDINGS.md`.

## 4. Autonomy Envelope

- **Allowed:** read-only inspection of all 14 commits and all 45 mockup files,
  `npm run verify:integrity`, `npm run smoke`, `git push origin develop`,
  writing the three SPEC files, single retrospective commit + push.
- **Forbidden:** `git rebase`, `git reset --hard`, `git squash`, `git
  commit --amend`, `git filter-branch`, force-push, branch deletion, any
  edit to mockup HTMLs / tokens / docs.

## 5. Stop-on-Deviation Triggers

- `verify:integrity` exit ≠ 0.
- `smoke` fails any test.
- File-count mismatch in any of the 3 direction folders (expected 15 each).
- `git push` rejected.
- Any commit ahead of origin that touches files outside
  `modules/Module 1.5 - Shared Components/`.

## 6. Rollback Plan

If the push is accepted but a downstream consumer reports a broken artifact,
the rollback is **forward-only**: write a follow-up SPEC that re-generates
the affected HTML from its direction's tokens. Do not `git revert` the merge
— it would invert the artifact set and lose the on-disk work.

## 7. Out-of-Scope

- Rewriting commit messages to correct the attribution drift.
- Splitting `94c9c57` into "close 3A" (docs only) + a new
  "feat(direction-2): M13/M14/M15" commit.
- Choosing a winning direction.
- Promoting any direction's tokens into the live design system.
- Fixing the underlying concurrency hazards (see FINDINGS.md) — they belong
  to a future infra SPEC.

## 8. Expected Final State

- `origin/develop` is at the same SHA as local `develop` (16 commits beyond
  the pre-SPEC origin: 14 design-system commits + 1 SPEC retrospective +
  whatever follow-up the Foreman writes).
- The three predecessor SPEC folders remain unchanged.
- This SPEC folder contains exactly `SPEC.md`, `EXECUTION_REPORT.md`,
  `FINDINGS.md`. No FOREMAN_REVIEW.md yet (the Foreman writes that).

## 9. Commit Plan

One retrospective commit at the end:

```
chore(spec): close M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION with retrospective

- Documents the merge of 14 mixed commits from parallel 3A/3B/3C runs.
- No code changes; only adds SPEC.md, EXECUTION_REPORT.md, FINDINGS.md.
- Three concurrency findings logged for unified Foreman review.
```

The 14 pre-existing design-system commits are pushed before this commit is
created, so the SPEC folder is itself the only diff in the close commit.
