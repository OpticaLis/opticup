# Activation Prompt — MODULE_REPO_SPLIT

> Paste the block below into a fresh Claude Code chat.
> **DO NOT dispatch until Phase 2 quartet (#1-#4) all closed 🟢 + merged.**
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/MODULE_REPO_SPLIT_BRIEF.md`

---

```
Full Auto Pipeline — MODULE_REPO_SPLIT (largest infrastructure SPEC; budget 1-2 days).

Brief: modules/Module 1.5 - Shared Components/architecture-brief/MODULE_REPO_SPLIT_BRIEF.md

Activate `opticup-strategic`. Skill state inherits all harvested patterns.

GOAL: split opticalis/opticup into per-module repos + opticup-shared. Enables parallel
Pipelines on M7 + M9 + future modules without git contention. After this SPEC, M7/M9 start
fresh on their own repos.

Read Brief end-to-end (it's long). Run §6 probes (8 — full file inventory via git ls-files,
cross-module dep graph via grep, file count per top-level dir, GitHub Pages config, deploy
mechanism, package.json shape, .npmrc check, GitHub Packages availability — last one Daniel
verifies manually).

Decide Option A1 (submodules), A2 (npm/GitHub Packages), A3 (build-time copy), or A4
(monorepo). Architect recommendation: A2. Module Strategist may override with evidence.

Build the exhaustive file catalog for §0 Pre-Authoring Reality Check — classify every git-
tracked file as shared / module-specific / ambiguous.

Author SPEC at:
  modules/Module 1.5 - Shared Components/docs/specs/MODULE_REPO_SPLIT/SPEC.md

Required SPEC sections: §0 (probes + 2 mandatory audits + Concurrent-Pipeline envelope + full
file catalog), §1 purpose, §2 (6 phases: A repo design, B catalog, C creation + setup, D CI/CD,
E migration steps with git filter-repo, F skill+plugin distribution), §3 (20+ criteria from
Brief §5), §4 autonomy envelope (Level-3 DDL + Level-3 GitHub admin), §5 stop triggers, §6
rollback plan (per-phase, per-repo), §7 Destructive Operations DECLARED (git filter-repo history
rewrite + archive flag + no file deletes from original), §10 commit plan, §11 lessons.

Hand off to `opticup-executor`:
- Phase A: confirm Option choice + set up GitHub Packages auth if A2.
- Phase B: validate file catalog against live repo state.
- Phase C: create opticup-shared + opticup-m1-inventory + opticup-m2-platform + opticup-m4-crm
  on GitHub via gh CLI; copy files with git filter-repo preserving history.
- Phase D: GitHub Actions workflows in each new repo (verify.mjs --full + schema-diff + tests).
- Phase E: per-repo dependency wiring; verify shared updates propagate.
- Phase F: skills distribution (submodule or copy mechanism).
- **MANDATORY FUNCTIONAL SMOKE** (Brief §2): 12 steps verifying every existing screen, every
  existing CI, every existing deploy, plus the new parallel-Pipeline concurrency test (run two
  Pipelines simultaneously on M1 + M4 develop branches without conflicts). 12/12 PASS required
  for 🟢. Storefront repo unaffected; its baseline tests must still pass.
- Archive original opticalis/opticup with README pointing to new repos.

Then `opticup-reviewer` re-verifies every criterion + spot-checks each new repo independently +
validates skill loading from each.

Then `opticup-strategic` Foreman-reviews + triggers Module 1 Close Ceremony (closes the M1 era).
Writes FOREMAN_REVIEW.md with skill proposals (especially repo-split patterns that future
similar SPECs can reuse).

Pipeline returns ONE Hebrew status line:
  "MODULE_REPO_SPLIT [🟢/🟡/🔴]. ארבעת הריפוים החדשים פעילים, M7+M9 פתוחים לבנייה."

Iron Rules in sharp focus: 6 (index.html per repo), 12, 21, 31, 32 (declared destructive ops
honored).

Out of scope:
- M7 / M9 repo creation (their own SPEC; not here)
- Storefront migration (already separate)
- Public open-sourcing (stays private)
- Migrating to different git host
- Rewriting shared.js / auth-service.js (move-only, no refactoring)
- Plugin marketplace publishing
- Cleaning up legacy frames-era files

On escalation: write escalations/{ISO_TS}_{topic}.md across the affected repo. Halt all sub-Pipelines.

Stop on deviation, not on success. This is the most impactful infrastructure SPEC of the
project — get it right, it can't be unwound easily. Trust the discipline; the 12-step smoke is
the gate.

Budget: 1-2 days end-to-end. Single uninterrupted Pipeline if possible.
```

---

*End of activation prompt. Closes Phase 2 quartet + opens M7/M9 build era.*
