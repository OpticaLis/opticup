# Claude Code — Execute SPEC: M4_PRE_MERGE_HIGH_FIXES

> **Purpose:** Surgical fixes for HIGH-1 (Activity Log column drift) + HIGH-2 (phone allowlist gap). After this lands, develop is merge-ready.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `cef5618 chore(spec): close M4_PRE_MERGE_QA — comprehensive QA report before merge to main`.
- `git status`: 3 guardian files modified, untracked outputs/strays, no staged files.
- localhost:3000 is running.

If state diverges — STOP and report.

---

## Step 0 — Move the SPEC into place

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES"
mv "outputs/SPEC_M4_PRE_MERGE_HIGH_FIXES.md" "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/SPEC.md"
```

Use plain `mv` (untracked file).

---

## Step 1 — Read the SPEC

Read `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/SPEC.md` in full.

This is a Fix SPEC — 2 surgical fixes, 2 commits, 1 retrospective commit. Total ~3 commits.

---

## Step 2 — Load opticup-executor skill

Load `opticup-executor` if not already loaded. Follow its SPEC Execution Protocol.

---

## Step 3 — Execute the SPEC

Follow §8 (Pre-flight) → §9 (QA Protocol) Paths 1–6.

Key reminders:

- **HIGH-1 is 2 lines.** Don't refactor or "improve" the file beyond fixing the 2 column references. The Rule 7 violation (raw `sb.from()`) and any other smell is OUT OF SCOPE — already noted in QA_REPORT.
- **HIGH-2 is appending `"0507168471"` to one array literal in each of 2 EFs.** Don't refactor the allowlist into env vars or anything fancy — out of scope.
- **2 separate commits.** Don't bundle. The QA_REPORT cited them as 2 separate findings; commit history should reflect.
- **Both EFs must be redeployed** for HIGH-2 to actually take effect. Source-only commit isn't enough.
- **Chrome MCP spot-check after HIGH-1** is mandatory (§9 Path 2). Catches any deeper bug we missed.
- **Stop on deviation:** if line numbers drifted from QA_REPORT, scope creep, hooks fail, redeploy fails 2× — STOP.

---

## Step 4 — At SPEC close

Per the folder-per-SPEC retrospective protocol:
- `EXECUTION_REPORT.md` — required.
- `FINDINGS.md` — only if findings to log.
- Single commit: `chore(spec): close M4_PRE_MERGE_HIGH_FIXES with retrospective`.

After the retrospective commit, hand back to the strategic chat with §10 output format from the SPEC.

---

## Stop-on-Deviation

Per SPEC §6:
- File state at the cited lines doesn't match QA_REPORT → STOP.
- EF redeploy fails 2× via MCP → fall back to CLI; if CLI also fails, STOP.
- Chrome MCP shows new errors post-HIGH-1 fix → STOP.
- Diff scope creep → STOP.
- Activity Log still shows UUIDs after HIGH-1 → STOP, deeper bug.

---

## Time Estimate

20–30 minutes.
- HIGH-1 edit + commit + Chrome MCP verify: ~10 min.
- HIGH-2 edit + commit + 2 redeploys + verify: ~15 min.
- Retrospective + final commits: ~5 min.

---

## Iron Rule Compliance

All covered in SPEC §11. The 2 pre-existing rule violations (Rule 7 raw sb.from in HIGH-1 file, Rule 9 hardcoded allowlist in HIGH-2 EFs) are NOT fixed in this SPEC — already noted in QA_REPORT for follow-up.

---

*End of dispatcher prompt. Read the SPEC at `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/SPEC.md` and execute it.*
