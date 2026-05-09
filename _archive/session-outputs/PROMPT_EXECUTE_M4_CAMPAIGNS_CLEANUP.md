# Claude Code — Execute SPEC: M4_CAMPAIGNS_CLEANUP

> **Purpose:** Execute the cleanup SPEC at `outputs/SPEC_M4_CAMPAIGNS_CLEANUP.md`. Move it to canonical location, delete the orphan Make Data Structure, update the 3 master docs, optional smoke, write retrospective.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `f12605a fix(crm): wire campaigns tab dispatch in crm-bootstrap (was missing from showCrmTab override)`.
- `git status`: 3 guardian files modified, untracked outputs/strays, no staged files.

If state diverges — STOP and report.

---

## Step 0 — Move the SPEC into place

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_CLEANUP"
mv "outputs/SPEC_M4_CAMPAIGNS_CLEANUP.md" "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_CLEANUP/SPEC.md"
```

Use plain `mv` (untracked file).

---

## Step 1 — Read the SPEC

Read `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_CLEANUP/SPEC.md` in full.

---

## Step 2 — Load opticup-executor skill

Load `opticup-executor` if not already loaded. Follow its SPEC Execution Protocol.

---

## Step 3 — Execute the SPEC

Follow §11 (Pre-flight) → §13 (QA Protocol) Paths 0–7.

Key reminders:

- **DS deletion is the only Make-side change.** No scenario edits, no module changes.
- **Doc updates are bundled in 1 commit.** Three files, one cohesive change.
- **Final smoke (Path 6) is recommended but optional.** If you skipped it, mention so in the EXECUTION_REPORT.
- **Iron Rule 23:** mask any secret values in commit diffs.
- **Iron Rule 21:** the entire purpose of Path 1 is honoring this rule.

---

## Step 4 — At SPEC close

Per the folder-per-SPEC protocol:
- `EXECUTION_REPORT.md` — required.
- `FINDINGS.md` — only if findings to log.
- Commit them: `chore(spec): close M4_CAMPAIGNS_CLEANUP with retrospective`.

After the retrospective commit, hand back to the strategic chat with:
- DS deletion confirmed.
- Doc files updated (which files, line counts).
- Final commit hashes.
- Final `git status`.
- Smoke result (if performed).
- Any FINDINGS.

---

## Stop-on-Deviation

Per SPEC §6 + CLAUDE.md §9.

The most likely stops:
- DS deletion fails (DS still referenced somewhere unexpected) → STOP, investigate.
- Doc structure unexpected → STOP, ask before editing.
- Pre-commit hook fails on doc commit → STOP, fix issue.

---

## Time Estimate

15–25 minutes. ~2 min DS deletion + ~10 min doc reading + editing + ~5 min smoke + ~5 min retrospective + commits.

---

## Iron Rule Compliance

All covered in SPEC §12. Triple-check Rule 23 in doc diffs.

---

*End of dispatcher prompt. Read the SPEC at `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_CLEANUP/SPEC.md` and execute it.*
