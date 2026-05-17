# SPEC — M1 Final Night Phase 4: Skill Updates

**Slug:** `M1_FINAL_NIGHT_PHASE_4_SKILL_UPDATES`
**Phase of:** M1 Final Completion Night Pipeline (Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_FINAL_COMPLETION_NIGHT_BRIEF.md`)
**Author + Executor:** opticup-executor (Claude Code, Cowork) — Phase 4 SPEC authored at execution time per Bounded Autonomy (Brief §13)
**Date:** 2026-05-17
**Estimated:** 30-90min (Brief estimated ~30min but realistic per-entry careful editing is closer to 60-90min for 5 entries totaling 711 lines)

---

## 1. Goal

Apply the 5 pending architect entries accumulated in `_archive/architect-pending-entries/` to their target skill files. Each entry contains "File X — append to Y" instructions. After application, delete the consumed entry file (unless the entry's own instruction says to keep it).

Per Brief §6 + §10 op #9.

## 2. Scope (IN)

For each pending entry: read → find target file → append marker text → verify marker exists via grep → delete entry file (or keep, per entry's own retention rule).

Entries this session targets:
1. `2026-05-17_localhost_tester_visual_functional_verification.md` (183 lines) — 3 file targets
2. `2026-05-17_decisions_log_for_autonomous_skill.md` (151 lines) — 1 file target, KEEP entry
3. `2026-05-16_d_m1_09_reframing.md` (101 lines) — 2 file targets
4. `2026-05-15_P42_SELF_VALIDATE_BEFORE_DELIVERY.md` (63 lines) — already-applied (P42 detected at line 1092 of opticup-architect SKILL.md by prior session), entry orphaned
5. `2026-05-15_m1_close_ceremony_skill_updates.md` (213 lines) — **DEFERRED** to next Phase 4 continuation session (largest entry, context-budget realism)

## 2.B Scope (OUT — DEFERRED)

- Entry #5 above (213 lines) is carried forward to a next Phase 4 continuation. Not blocking.

## 3. Target files (after Phase 4 commit)

- `.claude/skills/opticup-localhost-tester/SKILL.md` — Tier C VFV section appended
- `.claude/skills/opticup-architect/SKILL.md` — P-AR-13 + P-AR-15 sections appended
- `.claude/skills/opticup-strategic/SKILL.md` — mandatory §7 VFV template addition appended
- `.claude/skills/opticup-architect/references/decisions/CROSS.md` — Pattern Index of Daniel's decision patterns appended
- `.claude/skills/opticup-architect/references/decisions/M1.md` — D-M1-09 reframing decision appended

## 4. Destructive Operations

Iron Rule 32 — REQUIRED DECLARATION. This SPEC declares the following destructive operations. Any operation **not** in this list is forbidden:

1. **File delete × 2:** `git rm` of consumed pending entry files (matches Brief §10 op #9 authorization):
   - `_archive/architect-pending-entries/2026-05-15_P42_SELF_VALIDATE_BEFORE_DELIVERY.md` (entry already applied to opticup-architect SKILL.md by prior session, orphaned)
   - `_archive/architect-pending-entries/2026-05-16_d_m1_09_reframing.md` (entry's own instruction line 101: "After applying, delete this file.")
   - `_archive/architect-pending-entries/2026-05-17_localhost_tester_visual_functional_verification.md` (entry's own instruction line 183: "delete this file")

   Wait — that's 3 deletions, not 2. Updating: **File delete × 3.**

2. **File append × 5** (additive to existing files; no DROP, no overwrite of prior content):
   - opticup-localhost-tester/SKILL.md
   - opticup-architect/SKILL.md (× 2 entries — P-AR-13 + P-AR-15)
   - opticup-strategic/SKILL.md
   - opticup-architect/references/decisions/CROSS.md
   - opticup-architect/references/decisions/M1.md

**Explicitly NOT authorized:**
- Modification of any source code (.js / .html / .css)
- Modification of any DB schema, RPC, EF, RLS
- Touching main branch
- Force-push, rebase, reset --hard
- Deletion of the 2026-05-17_decisions_log file (entry says KEEP it)
- Deletion of the 2026-05-15_m1_close_ceremony file (DEFERRED to next session)

## 5. Acceptance Criteria

- Each target skill file has the new marker text grep-able (single occurrence, not duplicate).
- Each of 3 deleted entry files is gone from `_archive/architect-pending-entries/`.
- The 2026-05-17_decisions_log file remains in place per its own retention rule.
- Iron Rule 31 + 32 gates exit 0 on commit.
- No source-code, DB, RPC, or EF changes.

## 6. Out of Scope / Carry-Forward

- Entry #5 `2026-05-15_m1_close_ceremony_skill_updates.md` (213 lines, largest) — deferred to next Phase 4 continuation session. Documented for next-session pickup.

## 7. Rollback

If Phase 4 needs to roll back:
1. `git revert <Phase-4-commit>` — restores the deleted pending entries + reverts the skill file appends.
2. No data state to restore (no DB changes).
3. Pre-Pipeline tag `pre-m1-final-completion-2026-05-17` remains valid as the canonical rollback point.

---

*End of Phase 4 SPEC. Iron Rule 32 §Destructive Operations declared. Authorized to commit the work that was performed during this session.*
