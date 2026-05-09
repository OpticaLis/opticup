# Activation Prompt — Modules Home Unification SPEC

> **For:** Claude Code on 🖥️ Windows desktop
> **Working dir:** `C:\Users\User\opticup`
> **Skill:** opticup-executor

---

## Copy-paste into Claude Code:

```
Execute the SPEC at __LAUNCH_PLAN_DRAFT__/architecture-briefs/MODULES_HOME_UNIFICATION_SPEC.md.

LOAD SKILL: opticup-executor

This is the SECOND structural cleanup SPEC in 24 hours. The first (PROJECT_STRUCTURE_CLEANUP) ran successfully — your work was excellent (5 author-bug catches in pre-flight, all resolved cleanly). Daniel asked the deeper question: "why are in-design modules in __LAUNCH_PLAN_DRAFT__/ when built modules are in modules/?" The answer was historical accident. This SPEC fixes that — One Home Per Module, regardless of life stage.

CRITICAL — read this carefully:
- This SPEC removes __LAUNCH_PLAN_DRAFT__/ entirely.
- 8 module Brief folders move to modules/Module N - Name/architecture-brief/.
- Operational role folders (campaign-overseer, site-overseer) move to a new roles/ at repo root.
- access-audit + supervisor-system + 8 meta-files about the previous SPEC → _archive/.
- All references to __LAUNCH_PLAN_DRAFT__/ in CLAUDE.md, MASTER_ROADMAP.md, FILE_STRUCTURE.md, SKILL.md, and per-module decisions/ files MUST be rewritten.
- 4 Daniel approvals are pre-locked in §10 (you may proceed without re-asking — see "Q answers" below).

Daniel's pre-locked answers to §10 Open Questions:
- Q1: ARCHIVE supervisor-system/ → _archive/supervisor-system/
- Q2: ARCHIVE access-audit/ → _archive/access-audit/
- Q3: roles/ AT REPO ROOT (not inside modules/)
- Q4: Use architecture-brief/ (singular) inside each module folder

Proceed accordingly.

Process:
1. Run the standard First Action protocol (CLAUDE.md §1) — Windows desktop.
2. Run §6 Pre-Flight Checks (5 checks). Save the grep output for "__LAUNCH_PLAN_DRAFT__" references — you'll need it for Commit 6.
3. If §6 reveals pre-existing uncommitted work → handle with PRE-SPEC commits first (same pattern as previous SPEC).
4. Execute Commits 1-9 in order. Push after each commit. Verify clean tree before next commit.
5. After Commit 9: paste the §11 verification block.

If anything diverges from the SPEC's assumptions → STOP and report. The previous SPEC taught us that pre-flight catches author bugs; trust the catches.

After completion, return clean to Daniel and standby. Cowork Main Strategic will run Module Close Ceremony for this SPEC.
```

---

## What to expect

- **Time:** 60-90 min (less than previous SPEC because mostly moves, fewer edge cases).
- **Commits:** 9 SPEC commits + possibly 1-3 Pre-SPEC commits if pre-existing work exists.
- **Risk:** Medium — many file moves, but all tracked moves use `git mv` (preserves history).

When done, come back to Cowork Main Strategic with: "executor finished MODULES_HOME_UNIFICATION SPEC, all commits + verification clean."

---

*Authored 2026-05-09 by Main Strategic. Successor to PROJECT_STRUCTURE_CLEANUP_SPEC (executed earlier today).*
