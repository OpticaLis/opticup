# Activation Prompt — Repo Cleanup + Clean-Repo Enforcement + PR

> Paste into a Claude Code session (desktop — git write ops + safety net).
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/REPO_CLEANUP_MERGE_ENFORCEMENT_BRIEF.md`

---

```
Repo hygiene + recurring-failure root-cause fix + a develop→main PR for Daniel. The working tree has ~2,627 uncommitted files (mostly .claude/skills/** from parallel sessions); develop is 79 commits ahead of main. Daniel: this dirty-tree pile has happened BEFORE and the clean-repo rule was already added before — it MUST be made un-recurrable, not just cleaned. M5 is done; this happens BEFORE M6. No merge to main by you — Daniel-only via PR.

Brief: modules/Module 1.5 - Shared Components/architecture-brief/REPO_CLEANUP_MERGE_ENFORCEMENT_BRIEF.md

Activate `opticup-strategic` → author SPEC at modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_MERGE_ENFORCEMENT/SPEC.md → execute. Read the Brief end-to-end FIRST.

PART A — root-cause FIRST (diagnose, don't just clean):
- Categorize all ~2,627 uncommitted paths (exact counts): .claude/skills/** edits / generated artifacts / screenshots / logs / real work / junk.
- Determine WHY the existing CLAUDE.md §9 "Clean Repo at Session End" rule + memory feedback_clean_repo_in_specs did NOT prevent this (likely: skill edits are orphan changes owned by no SPEC; parallel sessions each leave them; no hook actually FAILS on a dirty tree like Iron Rules 14/15/31 do).
- Write modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_MERGE_ENFORCEMENT/CLEAN_REPO_ROOT_CAUSE.md.

PART B — add 3-layer enforcement so it CANNOT recur (Pattern P31):
- Layer 1: a new scripts/checks/ check wired into verify.mjs + session-end that FAILS LOUDLY on a large uncommitted pile, especially modified/untracked .claude/skills/** with no owning SPEC. Same regime as the integrity gate (no --no-verify bypass). + a regression test.
- Layer 2: a Sentinel mission (new or extend existing) flagging a dirty/oversized tree in docs/guardian/GUARDIAN_ALERTS.md.
- Layer 3: make First Action §4 dirty-repo check cover .claude/skills/** + un-skippable; pipeline + architect/foreman bootstraps report dirty-tree count and refuse big work until resolved.
- Ownership rule: any session editing a .claude/skills/** file commits it before ending — document in the relevant skills' closure checklists.
- Governance edits surgical + append-style (Iron Rule 32 — don't delete sections).

PART C — resolve the 2,627 pile (SURVEY-FIRST, SAFE):
- List every untracked+modified path categorized. For each: commit (real work) / discard (true junk) / gitignore (never-should-be-tracked).
- Commit real work in logical commits by EXPLICIT FILENAME — NEVER git add -A / git add . / git commit -a (that exact discipline failed in an earlier M5 commit).
- Discard only after categorization is clear. ANY ambiguous path → STOP + ask Daniel before discarding. Never blind git clean -fd without Daniel confirming the untracked paths.
- End: git status clean.

PART D — safety checks + PR for Daniel:
- Run npm run verify:integrity + smoke tests + advisor check → confirm GREEN, no regressions vs main.
- Produce the merge deliverable (PR-only — branch protection blocks direct push):
    https://github.com/OpticaLis/opticup/compare/main...develop
    + a concise PR title (≤90 chars) summarizing what ships (M5 schema spine + night-run + full M5 UI + visual-fidelity gate + cleanup/enforcement).
- DO NOT merge. Daniel opens the URL → Create PR → Merge. You stop at the link.

Branch develop. Demo only for tests. No merge to main by you. Selective git add by explicit filename. Survey before any discard. Integrity gate clean. Stop on deviation.

Return ONE Hebrew status line:
  "ניקוי-ריפו + אכיפה [🟢]: שורש-הבעיה (clean-repo החוזר) אובחן + 3 שכבות-אכיפה הותקנו כך שלא יחזור; העץ נקי. בדיקות-בטיחות GREEN. קישור-PR למיזוג develop→main מוכן לאישורך: <compare-url> · כותרת: <title>."
Plus the root-cause file path so the Architect can review the diagnosis.
```

---

## Pre-flight checklist for Daniel

- [ ] Claude Code on the desktop (git write + safety net)
- [ ] Branch = develop
- [ ] You'll be asked before ANY ambiguous file is discarded
- [ ] At the end you get a PR link — you click Create PR → Merge (merge is yours alone)

---

*End of activation prompt. Diagnose → enforce (un-recurrable) → clean → PR. Then M6.*
