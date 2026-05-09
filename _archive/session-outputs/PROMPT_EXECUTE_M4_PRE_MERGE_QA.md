# Claude Code — Execute SPEC: M4_PRE_MERGE_QA

> **Purpose:** Comprehensive QA of Module 4 (CRM) on `develop` before merge to `main`. Read-only audit. Returns a findings report classified by severity (CRITICAL / HIGH / MEDIUM / LOW / INFO) per the opticup-guardian verification-first protocol. No code fixes in this SPEC.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows the latest commit (FOREMAN_REVIEW for M4_CAMPAIGNS_CLEANUP).
- `git status`: 3 guardian files modified, untracked outputs/strays + this prompt itself, no staged files.
- localhost:3000 IS running (Daniel was just on the campaigns screen).

If state diverges — STOP and report.

---

## Step 0 — Move the SPEC into place

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_QA"
mv "outputs/SPEC_M4_PRE_MERGE_QA.md" "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_QA/SPEC.md"
```

Use plain `mv` (untracked file).

---

## Step 1 — Read the SPEC

Read `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_QA/SPEC.md` in full.

This is an Audit/QA SPEC — no Hypothesis Ladder, no fix work. Pure read-only inspection per §13's 13 passes (Pass 0 through Pass 13).

---

## Step 2 — Load skills

Load both skills:
- `opticup-executor` — for the SPEC execution discipline.
- `opticup-guardian` — MANDATORY for this SPEC. Every CRITICAL/HIGH finding requires Evidence + Result + Action.

If `opticup-guardian` isn't available — STOP and report. The SPEC requires it.

---

## Step 3 — Execute the SPEC

Follow §13 Passes 0–13 in order. Key reminders:

- **Read-only.** No DB writes, no file mods, no Make edits, no EF deploys, no commits except the retrospective.
- **Test data:** if Flow tests in Pass 7 require creating leads/attendees, ONLY use the whitelisted phones (`0537889878`, `0503348349`, `0507168471`) and emails (`daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`). Any other value — STOP, ask Daniel.
- **Cleanup:** at SPEC end, delete any test data created during Flow tests. Document the cleanup in EXECUTION_REPORT.
- **opticup-guardian:** every CRITICAL/HIGH finding has Evidence + Result + Action. Never present inference as confirmed. Use the UNVERIFIED escape hatch when needed.
- **Stop on deviation:** if any pass requires writing or modifying outside the SPEC's scope — STOP, flag in report, don't fix.

---

## Step 4 — Findings discipline

Each finding goes into `QA_REPORT.md` (NOT `FINDINGS.md` — that file is for executor-skill / SPEC-author improvement notes, distinct from the QA findings).

QA_REPORT.md structure per §13 Pass 11:
- Executive summary with severity counts.
- Findings grouped by severity (CRITICAL → HIGH → MEDIUM → LOW → INFO), each with Evidence + Result + Action.
- Findings grouped by category at the bottom.
- Recommended action per finding (fix-before-merge / fix-post-merge / accept-as-debt / dismiss).
- Test data cleanup confirmation.

---

## Step 5 — At SPEC close

Per the folder-per-SPEC retrospective protocol:
- `QA_REPORT.md` — the user-facing findings (the deliverable).
- `EXECUTION_REPORT.md` — process retrospective.
- `FINDINGS.md` — executor-skill / SPEC-author notes (distinct from QA_REPORT).
- Single commit: `chore(spec): close M4_PRE_MERGE_QA — comprehensive QA report before merge to main`.

After the commit, hand back to the strategic chat with the §14 output format from the SPEC.

---

## Stop-on-Deviation

Per SPEC §6:
- Any DB write needed → STOP.
- localhost:3000 unreachable → STOP.
- MCP error → STOP.
- Test data outside whitelist → STOP.
- Active security incident found → STOP, ask before publishing.
- File modification needed mid-execution → STOP, flag in report.

---

## Time Estimate

90–180 minutes. This is the most comprehensive QA we've run on Module 4. Don't rush.

Pass-level rough estimates:
- Pass 0: 5 min
- Pass 1: 15-25 min (9 tabs × ~2 min each)
- Pass 2: 10-15 min
- Pass 3: 5-10 min
- Pass 4: 5-10 min
- Pass 5: 10 min
- Pass 6: 10 min
- Pass 7: 30-45 min (3 flows)
- Pass 8: 20-30 min (codebase scan)
- Pass 9: 10 min
- Pass 10: 5 min
- Pass 11: 20-30 min (composing the report)
- Pass 12: 5 min
- Pass 13: 5 min

If you finish under 90 min — recheck Pass 7 and Pass 8 thoroughness. If over 180 min — STOP, you're going too deep; flag in report and submit what you have.

---

## Iron Rule Compliance

All covered in SPEC §15. Triple-check Rule 23 — any hardcoded secret found is CRITICAL.

---

*End of dispatcher prompt. Read the SPEC at `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_QA/SPEC.md` and execute it.*
