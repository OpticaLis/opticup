# Claude Code — Execute SPEC: M4_CAMPAIGNS_MAKE_BODY_FIX_V2

> **Purpose:** Execute the SPEC at `outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX_V2.md`. Move it to its canonical location, perform all the steps under Bounded Autonomy with the Hypothesis Ladder, write retrospective.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Session Start (CLAUDE.md §1)

Continuation. Confirm only:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `fe5890a docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX (verdict: 🔴 REOPEN)`.
- `git status`: 3 guardian files modified, untracked outputs/strays, no staged files.

If the state diverges — STOP and report.

---

## Step 0 — Move the SPEC into place

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V2"
mv "outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX_V2.md" "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V2/SPEC.md"
```

Verify with `ls`. Use plain `mv` (not `git mv`) — the SPEC is untracked at this point. (Per V1 FINDINGS F3, this is the correct convention.)

---

## Step 1 — Read the SPEC

Read `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V2/SPEC.md` in full. The SPEC drives the entire task.

---

## Step 2 — Load opticup-executor skill

This is a SPEC execution task. Load the `opticup-executor` skill if not already loaded. Follow its SPEC Execution Protocol.

---

## Step 3 — Execute the SPEC

Follow §11 (Pre-flight) → §13 (QA Protocol) Paths 0–5.

Key reminders, all already in the SPEC:

- **Hypothesis Ladder:** try Rung 1 first (cheapest). Drop to Rung 2 only if Rung 1's smoke test produces non-200. STOP and escalate if both rungs fail (Rung 3).
- **Scenario `9126542` stays DEACTIVATED** except for the smoke-test windows.
- **Do NOT modify the EF.**
- **Do NOT modify Make modules id=1, id=2, id=3.**
- **Do NOT delete Data Structure 573694** — Daniel's decision is to keep it.
- **Mask all secret values** in any output. The new MAKE_SECRET prefix `fbsync_f7acdea0...` is the most you ever expose.
- **Wait window per smoke test:** allow up to 4 minutes per execution (p95 of `9126542` ≈ 193s + buffer). The V1 SPEC's 90s was wrong; this SPEC corrects it.

---

## Step 4 — Documentation

If either Rung succeeded:
- Write `modules/Module 4 - CRM/docs/make-patterns/README.md` per §14 of the SPEC. Use the structure outlined there. Tone: practical and brief.
- If Rung 2 succeeded: also export Data Structure 573694 as JSON via `mcp__make__data-structures_get` and save to `modules/Module 4 - CRM/docs/make-patterns/data-structure-fb-campaigns-sync.json`.
- Commit per §10 of the SPEC.

If both Rungs failed: skip docs entirely. Write only the retrospective (FINDINGS + EXECUTION_REPORT).

---

## Step 5 — At SPEC close

Per the folder-per-SPEC retrospective protocol:
- `EXECUTION_REPORT.md` — required.
- `FINDINGS.md` — only if there are findings to log.
- Commit them in a single `chore(spec): close M4_CAMPAIGNS_MAKE_BODY_FIX_V2 with retrospective`.

After the retrospective commit, hand back to the strategic chat with:
- Which Rung succeeded (or "both failed").
- Final commit hashes.
- Final `git status`.
- DB verification query results (row counts after first and second smoke).
- Confirmation that scenario `9126542` is `isActive: false`.
- Any FINDINGS.

---

## Stop-on-Deviation

Per SPEC §6 + CLAUDE.md §9 globals.

- Both Rungs fail → roll back to pre-SPEC blueprint, deactivate, stop.
- Smoke test returns 200 but DB shows zero rows → flag as finding (EF issue), but Rung is otherwise success.
- HTTP 401 in any smoke test → secret mismatch, out of scope, STOP.

---

## Time Estimate

20–40 minutes. ~5 min Rung 1 update + 4 min smoke + DB verify; if Rung 2 needed, +10 min. Plus 5 min docs + 5 min retrospective + commits.

---

## Iron Rule Compliance

All covered in SPEC §12 + §4 criteria 12, 13, 14, 15. Triple-check Rule 23 — no secrets in any committed file (use the masked prefix `fbsync_***` in docs and reports).

---

*End of dispatcher prompt. Read the SPEC at `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V2/SPEC.md` and execute it.*
