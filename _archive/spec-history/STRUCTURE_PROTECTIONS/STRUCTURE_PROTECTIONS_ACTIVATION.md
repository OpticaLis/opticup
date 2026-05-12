# Activation Prompt — Structure Protections SPEC

> **For:** Claude Code on 🖥️ Windows desktop
> **Working dir:** `C:\Users\User\opticup`
> **Skill:** opticup-executor
> **Estimated:** 45-75 min
> **Risk:** LOW (additions only)

---

## Copy-paste into Claude Code:

```
Execute the SPEC at modules/Module 5 - Customers/architecture-brief/STRUCTURE_PROTECTIONS_SPEC.md.

LOAD SKILL: opticup-executor

This is the THIRD structural SPEC in 24 hours. Two predecessors (PROJECT_STRUCTURE_CLEANUP, MODULES_HOME_UNIFICATION) cleaned up the project. This SPEC INSTALLS THE INFRASTRUCTURE that prevents the cleanup from drifting away.

Three protection layers:
1. Pre-commit hook addition: scripts/checks/check-root-discipline.mjs (blocks new disallowed root files)
2. Sentinel Mission 10: daily audit of root + module-home compliance
3. architect skill bootstrap: Step 4.5 auto-checks Module Close Ceremony backlog

NOTE — temporary SPEC location: This SPEC sits at modules/Module 5 - Customers/architecture-brief/ as a placeholder because no infrastructure-specific module home exists yet. The SPEC is NOT about Module 5 — it's a cross-cutting infrastructure SPEC. After execution, the SPEC + retrospective will be moved to _archive/spec-history/STRUCTURE_PROTECTIONS/ as part of Module Close Ceremony. Do not let the location confuse the scope.

Process:
1. Run standard First Action protocol (CLAUDE.md §1) — Windows desktop.
2. Run §6 Pre-Flight Checks (6 checks). Report findings before Commit 1.
3. If pre-existing uncommitted work → handle with PRE-SPEC commits (same pattern as previous 2 SPECs).
4. Execute Commits 1-8 in order. Each commit independently revertable.
5. After Commit 8: paste the §11 verification block.

Risk profile: LOW — this SPEC only adds new files + adds new checks. The only existing behavior modified is verify.mjs (Commit 3), which adds a check; if it misbehaves, revert with git revert.

Two callouts to be especially careful about:
- Commit 3 (wiring check into verify.mjs): if the check blocks the SPEC's OWN subsequent commits, that's a bug in the check or the allowlist. STOP and report — don't disable the check to unblock the SPEC.
- Commit 4 (test script): the test stashes/unstashes the working tree. If anything goes wrong mid-test, the user's tree might be in an unexpected state. Verify clean restoration before proceeding to Commit 5.

After completion, return to Daniel and standby. Cowork Architect runs the Module Close Ceremony.
```

---

## What this SPEC achieves

✅ **Pre-commit prevention:** Adding any new root-level file outside the allowlist will block the commit immediately. No need to remember the rule — git refuses.
✅ **Periodic detection:** Sentinel Mission 10 audits the structural rules daily. Any drift surfaces in `GUARDIAN_ALERTS.md` within 24h.
✅ **Session-start reminder:** Every Cowork Architect session starts with a self-audit of Module Close Ceremony backlog. Modules that closed without ceremony are flagged immediately.

After this — **the structural rules are infrastructure, not culture.** They cannot be silently undone by a future session that didn't read CLAUDE.md.

---

*Authored 2026-05-09 by Architect. Successor to PROJECT_STRUCTURE_CLEANUP_SPEC + MODULES_HOME_UNIFICATION_SPEC.*
