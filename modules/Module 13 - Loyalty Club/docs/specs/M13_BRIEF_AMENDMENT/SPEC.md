# SPEC — M13 Brief Amendment (basic-free tier)

**Mode:** Full-Auto Pipeline (single chat, Foreman + Executor + Reviewer collapsed)
**Authored:** 2026-05-12
**Closed:** 2026-05-12
**Brief origin:** `modules/Module 13 - Loyalty Club/architecture-brief/M13_BRIEF_AMENDMENT_BRIEF.md`
**Owning module:** Module 13 — Loyalty Club

---

## 1. Goal

Apply the M13 Brief Amendment authored at `M13_BRIEF_AMENDMENT_BRIEF.md` (Architect, 2026-05-11) to the canonical M13 documentation. Add `basic-free` membership tier (D14) — auto-enrolled on first M9 compensation event or future Referral bonus, no fee, credits-only, upgradable to paid tiers preserving credits. Documentation-only amendment.

## 2. Source of Truth

This SPEC is a thin execution wrapper around the Architect's Brief at:
`modules/Module 13 - Loyalty Club/architecture-brief/M13_BRIEF_AMENDMENT_BRIEF.md`

The Brief is normative. This SPEC.md exists only to anchor the retrospective trio (EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md) per the folder-per-SPEC protocol.

## 3. Success Criteria

Per Brief §6 Quality Bar:
1. ✅ `M13_LOYALTY_BRIEF.md` §2 Tiers Prizma table includes `basic-free` row
2. ✅ `M13_LOYALTY_BRIEF.md` has dedicated `Tier basic-free` sub-section with full description (creation triggers, what it includes/excludes, upgrade path, schema impact, enrollment clarification)
3. ✅ `M13_LOYALTY_BRIEF.md` §11 Decisions Log has D14 row + amendment note
4. ✅ `M13_DECISIONS_FOR_LOG.md` has 2026-05-12 amendment section with full D14 entry
5. ✅ `decisions/M13.md` has 2026-05-12 module-level entry
6. ✅ `DECISIONS_LOG.md` has cross-module entry #24 + M13 sub-table entry #3
7. ✅ `OPEN_TASKS.md` task #6 closed, moved to "Completed recently"
8. ✅ `npm run verify:integrity` exit 0 (pre-commit + pre-push hooks pass)
9. ✅ Working tree clean of tracked changes
10. ✅ Pushed to `origin/develop` (NOT main) — commit `274d874`

## 4. Destructive Operations

**None.** Per Brief §7 — documentation-only amendment, content additions only. Iron Rule 32 satisfied with the explicit `None.` declaration.

The OPEN_TASKS.md task closure (move from Active table to Completed section) is the only edit that could be read as "removal" — but per project convention this IS the closure mechanism for tasks, and the task content is preserved verbatim in the new Completed entry. No semantic loss.

## 5. Out of Scope

- Code changes (M13 doesn't exist in code yet — this is doc-only)
- DB changes (same)
- Sketch updates (basic-free has no separate sketch — internal config row, not customer-facing tier)
- Re-running M13 Module Close Ceremony (already done 2026-05-10)
- Touching pre-existing untracked files in the repo (Full-Auto leave-alone rule)

## 6. Expected Final State

After execution:
- 5 tracked files modified, 1 commit created (selective `git add` by filename)
- 4 new files in this SPEC folder: SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- Pre-existing untracked files in the repo remain untracked (per Full-Auto rule)
- Branch: develop, pushed to origin

## 7. Commit Plan

Single commit:
- Subject: `docs(m13): D14 basic-free tier — Brief amendment per M13_BRIEF_AMENDMENT_BRIEF`
- Body: bullets per file + D14 summary + gap origin + M9 build SPEC contract
- Co-Author: Claude Opus 4.7

(Retrospective trio committed in a follow-up commit if Foreman review surfaces lessons.)

---

*This SPEC is a thin wrapper. The Architect's Brief is the source of truth.*
