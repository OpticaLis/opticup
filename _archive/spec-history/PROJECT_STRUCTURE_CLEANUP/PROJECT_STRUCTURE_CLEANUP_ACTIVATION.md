# Activation Prompt — Project Structure Cleanup SPEC

> **For:** Claude Code on 🖥️ Windows desktop
> **Working dir:** `C:\Users\User\opticup`
> **Skill:** opticup-executor

---

## Copy-paste into Claude Code:

```
Execute the SPEC at __LAUNCH_PLAN_DRAFT__/architecture-briefs/PROJECT_STRUCTURE_CLEANUP_SPEC.md.

LOAD SKILL: opticup-executor

This is a Bounded Autonomy execution. The SPEC has explicit success criteria, autonomy envelope, stop-triggers, commit plan, and rollback plan. Read the entire SPEC end-to-end before starting.

CRITICAL — read this carefully:
- This SPEC touches the modules/ directory and many root files. It is medium-risk.
- Daniel has explicitly approved the approach: ONE comprehensive cleanup, applying a "Root Discipline Rule" to the entire repo, plus the Module 1 fix.
- Stop on deviation, not on success. Match each commit's expected state before moving to the next.
- Do not improvise — the SPEC has 7 commits in exact order. Execute them in order.
- If any pre-flight check (Commit 3 collision detection, source code reference grep) returns an unexpected result, STOP and report.
- After each commit: verify `git status --short` is clean before the next.
- After Commit 7: run `npm run verify:integrity` and verify exit code 0.

Before starting:
1. Run the standard First Action protocol (CLAUDE.md §1) — Windows desktop, no Cowork sync needed.
2. Verify branch = develop, repo = opticup.
3. Save baseline `git status --short` output.
4. Confirm to Daniel: "Project Structure Cleanup SPEC loaded. 7 commits planned. Beginning Commit 1."

After completion:
- Final report per SPEC §10 — paste the verification block exactly.
- Wait for Daniel's confirmation before any further work.

The SPEC is the authority. If you find ambiguity in the SPEC, STOP and ask Daniel — do not improvise.
```

---

## What to expect

- **Time:** 75-120 minutes.
- **Updates:** the executor will report after each of the 7 commits.
- **Stops:** if anything unexpected (collision in Module 1 SPECs, source code reference to a moved path, integrity gate failure) — it will stop and report.
- **At end:** a verification block per SPEC §10 with all checks passing.

When done, come back to the Cowork Architect session with: "executor finished cleanup SPEC, all 7 commits + verification clean."

---

*Authored 2026-05-09 by Architect.*
