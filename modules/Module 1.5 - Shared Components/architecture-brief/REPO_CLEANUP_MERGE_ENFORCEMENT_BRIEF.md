# Brief — Repo Cleanup + Clean-Repo Enforcement + develop→main PR

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `REPO_CLEANUP_MERGE_ENFORCEMENT_ACTIVATION_PROMPT.md` (sibling).
> **Type:** repo hygiene + a RECURRING-failure root-cause fix + a merge-to-main PR for Daniel.
> **Trigger:** working tree found with **2,627 uncommitted files** (mostly `.claude/skills/**` from parallel sessions) while develop is 79 commits ahead of main. Daniel (angry): this has happened before, the clean-repo rule was added before, and it MUST never recur. M5 is done; this cleanup happens BEFORE M6.

---

## 0. One-paragraph summary

Three things, in order: (1) **find out WHY** the existing "Clean Repo at Session End" rule (CLAUDE.md §9 + prior memory) keeps being violated — don't just clean, diagnose; (2) **add real enforcement** (3 layers) so a giant uncommitted pile can never silently accumulate again; (3) **safely resolve** the current 2,627-file pile (commit what's real work, discard what's junk — survey-first, never blind `git clean`), run the safety checks, and produce a **develop→main PR link** for Daniel to merge (Daniel-only; the Architect/team never merges main). Then M6 can start on a clean tree.

## 1. Part A — root-cause: why does clean-repo keep failing? (diagnose FIRST)

The rule already EXISTS (CLAUDE.md §9 "Clean Repo at Session End (mandatory)" + memory `feedback_clean_repo_in_specs` added after past incidents). A rule that keeps being violated has no enforcement. Investigate and write a short root-cause finding:

- **What are the 2,627 files?** Categorize: `.claude/skills/**` edits (skill harvests / pending-entries / decision-log updates from many sessions?), generated artifacts, screenshots, logs, real un-committed work, junk. Get exact counts per category.
- **Why weren't they committed?** Most likely: `.claude/skills/**` edits are orphan changes not owned by any one SPEC, so no SPEC's "clean repo at end" step catches them; parallel sessions each leave skill edits assuming another session commits; no pre-commit/session-end hook actually FAILS on a dirty tree (unlike Iron Rules 14/15/31 which have hooks).
- Output: a `CLEAN_REPO_ROOT_CAUSE.md` finding — what accumulated, why the existing rule didn't fire, and which enforcement layer was missing.

## 2. Part B — add enforcement so it can NEVER recur (3 layers, per Pattern P31)

Make the clean-repo rule infrastructure, not culture:

1. **Layer 1 — detection hook (the missing piece):** add a check (in the existing `scripts/checks/` family + wired into `verify.mjs` / session-end) that FAILS LOUDLY when the tree carries a large uncommitted pile — especially modified/untracked `.claude/skills/**` with no owning SPEC. Same regime as the integrity gate (never bypass with `--no-verify`). Include a regression test.
2. **Layer 2 — periodic detection:** a Sentinel mission (or extend an existing one) that flags a dirty tree / oversized uncommitted pile in `docs/guardian/GUARDIAN_ALERTS.md`.
3. **Layer 3 — session-start reminder:** ensure every pipeline + architect/foreman bootstrap reports the dirty-tree count and refuses to start big work until resolved (the First Action §4 dirty-repo check exists — make it cover `.claude/skills/**` and make it un-skippable).
4. **Ownership rule (document it):** any session that edits a `.claude/skills/**` file COMMITS that edit before ending — no "leave for the next session." Add to the relevant skills' closure checklists.

Keep all governance edits surgical + append-style (Iron Rule 32 — don't delete sections).

## 3. Part C — resolve the current 2,627-file pile (survey-first, SAFE)

**Survey before destroying — non-negotiable** (CLAUDE.md First Action 3a + memory: a past `git clean -fd` deleted real work):

1. List every untracked + modified path, categorized (Part A already did this).
2. For each category decide: **commit** (real work — e.g. genuine skill harvests/pending-entries that should persist) vs **discard** (true junk — generated artifacts, stale logs) vs **gitignore** (things that should never have been tracked).
3. **Commit real work in logical, selectively-added commits** (by explicit filename/group — NEVER `git add -A` / `git add .` / `git commit -a`; that's the discipline that itself failed in an earlier M5 commit).
4. Only discard after the categorization is clear; if ANY path is ambiguous → STOP and ask Daniel before discarding.
5. End state: `git status` clean.

## 4. Part D — safety checks + develop→main PR

After the tree is clean:
1. Run the safety net: `npm run verify:integrity`, smoke tests, advisor check — confirm GREEN, no regressions vs main.
2. Produce the **merge deliverable for Daniel** (NOT a CLI merge — branch protection blocks direct push; PR-only per memory `feedback_main_merge_via_pr`):
   - GitHub compare URL: `https://github.com/OpticaLis/opticup/compare/main...develop`
   - A concise PR title (≤90 chars) summarizing what ships (M5 schema spine + night-run + M5 full UI + visual-fidelity gate + cleanup/enforcement).
3. The team does NOT merge. Daniel opens the URL → Create PR → Merge. Architect waits.

## 5. Constraints

- Branch develop. Demo only for any test. **No merge to main by the team — Daniel-only via PR.**
- Survey-first before any discard; selective git add by explicit filename; never blind `git clean -fd` without Daniel confirming the untracked paths.
- Integrity gate clean. Iron Rule 32 on governance edits (append, don't delete sections).

## 6. What Daniel has at the end

A diagnosed root-cause for the recurring dirty-tree, real 3-layer enforcement so it can't recur, a clean working tree, and a ready PR link to merge 79 commits (all of M5 + the night-run + the fidelity gate) to production. Then M6 starts clean.

---

*End of Brief. Diagnose → enforce → clean → PR. The clean-repo failure becomes un-recurrable. Daniel merges.*
