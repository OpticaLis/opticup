# Claude Code — Execute SPEC: M4_MERGE_PREP

> **Purpose:** Final SESSION_CONTEXT update before Daniel runs the manual merge to main. The merge instructions for Daniel are already in `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md`.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `f7ca532 docs(spec): FOREMAN_REVIEW for M4_PRE_MERGE_HIGH_FIXES (verdict: 🟢 CLOSED retroactively — develop merge-ready)`.
- `git status`: 3 guardian files modified, untracked outputs/strays, no staged files.

If state diverges — STOP and report.

---

## Step 0 — Move the SPEC into place

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_MERGE_PREP"
mv "outputs/SPEC_M4_MERGE_PREP.md" "modules/Module 4 - CRM/docs/specs/M4_MERGE_PREP/SPEC.md"
```

Use plain `mv`.

---

## Step 1 — Read the SPEC

Read `modules/Module 4 - CRM/docs/specs/M4_MERGE_PREP/SPEC.md` in full. This is a Housekeeping SPEC — no code, no DB.

---

## Step 2 — Load opticup-executor skill

Load it. Follow its protocol.

---

## Step 3 — Execute

Follow §6 (Pre-flight) → §7 (QA Protocol) Paths 1–4.

Key reminders:
- Edit ONLY `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`. Don't touch any code file.
- The instructions file `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md` already exists (strategic chat created it). Verify it exists. Don't overwrite.
- 1 doc commit + 1 retrospective commit. Total 2 commits.
- ≤30 lines added to SESSION_CONTEXT.md.

---

## Step 4 — At SPEC close

Per the folder-per-SPEC retrospective protocol:
- `EXECUTION_REPORT.md` — required.
- `FINDINGS.md` — only if findings to log.
- Single retrospective commit.

After the retrospective commit, hand back to the strategic chat with §8 output format from the SPEC.

---

## Stop-on-Deviation

Per SPEC §5:
- SESSION_CONTEXT structure unexpected → STOP and ask before editing.
- Code file accidentally staged → STOP.
- Pre-commit fails → STOP.

---

## Time Estimate

10–15 minutes. Doc edit + 2 commits + push.

---

## Iron Rule Compliance

All covered in SPEC §9.

---

*End of dispatcher prompt. Read the SPEC at `modules/Module 4 - CRM/docs/specs/M4_MERGE_PREP/SPEC.md` and execute it.*
