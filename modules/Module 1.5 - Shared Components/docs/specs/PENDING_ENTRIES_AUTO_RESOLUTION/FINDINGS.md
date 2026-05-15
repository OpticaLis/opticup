# FINDINGS — PENDING_ENTRIES_AUTO_RESOLUTION

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/FINDINGS.md`
> **Written by:** opticup-executor (Full-Auto Pipeline)
> **Date:** 2026-05-15 evening
> **Total findings:** 2 (1 LOW · 1 LOW)

---

## F-1 — Pending file content fidelity ("merged to main" wording is aspirational)

- **Severity:** LOW
- **Class:** Content fidelity
- **Location:** `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` line 50 (the newly inserted row #32, header "STOREFRONT_PUBLIC_DATA_LAYER closed + merged to main")
- **What:** The pending file's row text (copied verbatim per its own placement instructions) declares "STOREFRONT_PUBLIC_DATA_LAYER closed + merged to main — foundational architectural shift" and adds detail "merged to main as **5th merge of the day**". However, per `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` and the STOREFRONT_PUBLIC_DATA_LAYER FOREMAN_REVIEW.md §6 ("Awaiting Daniel approval for develop → main merge — the 7 implementation commits + 1 close commit are the merge candidate"), the merge has NOT actually happened yet. The pending file was authored 2026-05-15 late evening by Cowork Architect with aspirational wording assuming the merge would land.
- **Why this matters:** The DECISIONS_LOG is the architect's strategic single-source-of-truth. A row claiming a merge that didn't happen creates documentation drift. If Daniel never approves the merge (or approves it differently), the row stays wrong.
- **Why I did not edit:** The pending file's "Placement instructions" said "copy the row VERBATIM". The Sweep protocol I just added to executor SKILL.md says "Apply the prescribed change to the named target file" — verbatim. Silent rewriting at execution time of strategic content authored by the Architect-tier role would corrupt the trust contract.
- **Suggested next action:** Foreman post-review decides one of:
  - (a) Leave as-is — when the merge happens, the row will be retrospectively accurate.
  - (b) Edit the row in a follow-up commit (`chore(decisions): amend row #32 — merge wording pending main merge`) — pre-merge accuracy, but a separate edit cycle.
  - (c) Wait for the actual merge → add a new row #33 marking the actual merge — preserves history.
- **Owner:** Foreman (post-review decision).

---

## F-2 — Iron Rule 32 auth-parser only reads STAGED SPEC.md files (tooling gap)

- **Severity:** LOW (didn't fire this SPEC; will fire a future Full-Auto SPEC with tracked deletes)
- **Class:** Tooling — pre-commit hook
- **Location:** `scripts/destructive-ops-auth-parser.mjs` lines 77–99 (`collectAuthorizedDeletes`); invoked from `scripts/checks/destructive-ops-declared.mjs` lines 258–267 (section B).
- **What:** The auth-parser filters its source set to `stagedFiles.filter(p => isSpecPath(p, repoAbs))` (line 81). `stagedFiles` comes from verify.mjs's `git diff --cached --name-only --diff-filter=ACM` (verify.mjs line 52) — i.e., only Added/Copied/Modified files in the CURRENT staging set. Already-committed SPEC.md files in earlier commits on the same SPEC chain are NOT read. Result: in Full-Auto Pipeline mode, where SPEC.md is committed first (e.g., C0) and the destructive op lands in a later commit (e.g., C5), the auth-parser would NOT see the SPEC's §Destructive Operations declaration → flag as violation.
- **Why this didn't fire here:** The pending file in this SPEC turned out to be untracked. `git diff --cached --name-only --diff-filter=D` returned empty at C5 → section B of `destructive-ops-declared.mjs` had nothing to scan → auth-parser was never invoked. Lucky path.
- **What this means going forward:** Any future SPEC that performs a tracked-file delete in a commit OTHER than the SPEC.md authoring commit will hit this gap. The work-around in this SPEC (which I had planned but didn't need): re-stage SPEC.md by adding a 1-line execution-log footer to it in the destructive-op commit. Works but is hacky.
- **Suggested next action:**
  - **Short-term mitigation** (no new SPEC, just a SKILL.md note): document the work-around in `opticup-executor` SKILL.md so the next executor knows about it — see EXECUTION_REPORT.md §9 Proposal 2.
  - **Long-term fix** (future SPEC): extend `collectAuthorizedDeletes` to scan recent HEAD SPEC.md files (e.g., commits in the current SPEC's chain — identifiable via pre-commit tag pattern `pre-<spec-slug>-*`). Future SPEC stub: `M1_5_DESTRUCTIVE_OPS_AUTH_PARSER_HEAD_SCAN` (small SPEC, ~30 min). Queue in OPEN_TASKS if the Foreman accepts.
- **Owner:** Foreman → queue follow-up SPEC stub if accepted.

---

## Summary

| # | Severity | Class | Disposition (Executor recommendation) |
|---|---|---|---|
| F-1 | LOW | Content fidelity | Foreman decides (a/b/c). Most likely (a) — leave as-is. |
| F-2 | LOW | Tooling — pre-commit hook | (1) Codify work-around in opticup-executor SKILL.md (Executor Proposal 2 already covers it). (2) Optionally queue `M1_5_DESTRUCTIVE_OPS_AUTH_PARSER_HEAD_SCAN` future SPEC. |

No HIGH or MEDIUM findings. No security findings. No Iron-Rule violations. No documentation drift outside F-1's specific row.
