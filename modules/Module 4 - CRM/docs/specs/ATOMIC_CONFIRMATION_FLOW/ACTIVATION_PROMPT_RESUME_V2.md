# ACTIVATION PROMPT — Resume ATOMIC_CONFIRMATION_FLOW (v2, corrected state)

> **Authored by:** Campaign Overseer, 2026-05-04
> **Reason for v2:** previous session crashed before writing EXECUTION_REPORT.md. The HANDOFF claimed B.1 was deployed as v5, but verification (git log + Supabase list_edge_functions) shows v5 is Part A ONLY. The B.1 logging commit landed in source but deploy failed 3x. This prompt corrects that.

---

## Paste the block below into a fresh Claude Code session

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

Resume SPEC at modules/Module 4 - CRM/docs/specs/ATOMIC_CONFIRMATION_FLOW/.

VERIFIED STATE (do NOT trust HANDOFF — it's stale):
- automation-engine deployed version = v5 = Part A ONLY (3-button modal commit). Does NOT contain diagnostic logs.
- Source on develop already contains AE-DIAG logs (commit 3e79db9). 17 [AE-DIAG] log calls across engine.ts (7) + prepare-plan.ts (4) + dispatch.ts (6).
- Previous session attempted deploy to v6 three times via Supabase MCP — each returned InternalServerErrorException. Source-side commit landed; EF deploy did not.
- No EXECUTION_REPORT.md exists for this SPEC yet. Previous session crashed before writing it.
- ATTENDEE_COUNTER_DISPLAY_FIX (the queued SPEC #2) is fully closed — EXECUTION_REPORT, FINDINGS, FOREMAN_REVIEW all present, all commits on origin/develop.

EXECUTION ORDER:

1. Run First Action protocol per CLAUDE.md §1 (verify branch=develop, pull latest, integrity gate).

2. Confirm verified state above:
   - `git log --oneline -3 -- supabase/functions/automation-engine/` → top commit should be 3e79db9
   - `grep -c "AE-DIAG" supabase/functions/automation-engine/engine.ts supabase/functions/automation-engine/prepare-plan.ts supabase/functions/automation-engine/dispatch.ts` → 7, 4, 6
   - Use Supabase MCP `list_edge_functions` → automation-engine version=5

3. Resume SPEC §B.1 final step — retry deploy of automation-engine via Supabase MCP `deploy_edge_function`. Goal: v6 active.
   - If deploy succeeds → continue to step 4.
   - If deploy fails again with platform error → STOP, write a partial EXECUTION_REPORT.md noting the 4th failed attempt + timestamp, ask Daniel to escalate to Supabase support or wait for retry window. Do NOT loop the deploy attempt — report and stop.

4. After v6 is live, message Daniel exactly:
   "Step B.1 deployed (v6 with [AE-DIAG] logging). Please reproduce the bug on demo: move an attendee between events with the 'send update' toggle ON. Then I capture logs and proceed to Step B.2."
   STOP and wait for Daniel's confirmation that he reproduced.

5. After Daniel confirms reproduction → run Step B.2:
   - Use Supabase MCP `get_logs` to fetch automation-engine logs filtered by [AE-DIAG] tag, narrowed to a window covering Daniel's reproduction window.
   - Identify the silent-drop point: which AE-DIAG line is the LAST one logged before total_recipients=2 → sent=0 outcome.
   - Write FINDINGS.md (cumulative — Bug 1 + Bug 2 sections) documenting the captured runId + the trace + the identified drop point.
   - STOP and report the diagnosis to Daniel before fixing. He may want to adjust the fix scope.

6. After Daniel approves fix scope → Step B.3:
   - Make the targeted fix (SPEC §8 commit 3 says 1-3 line fix)
   - Single commit: `fix(automation-engine): dispatch silent-drop after recipients identified`
   - Deploy v7 via Supabase MCP
   - Manual QA: Daniel reproduces the same scenario; verify total_recipients=N → sent=N (no longer 0)
   - STOP and confirm with Daniel that the fix works.

7. After Daniel confirms fix → Step B.4 (cleanup):
   - Remove all AE-DIAG log lines from engine.ts + prepare-plan.ts + dispatch.ts (revert the additions, keep the fix)
   - Single commit: `chore(automation-engine): remove temporary diagnostic logging`
   - Deploy v8

8. SPEC close — write EXECUTION_REPORT.md + FINDINGS.md (cumulative across Parts A + B). Foreman review next session by opticup-strategic per protocol.

CONSTRAINTS:
- Test ONLY on demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb). Zero prizma writes without explicit Daniel approval.
- Single commit per step. Push to develop. NEVER merge to main.
- Mandatory clean repo at end of each step.
- If the VM-mount drift bug appears (1700+ "deleted" files, git ls-files returns 0), follow CLAUDE.md §3a Phase 2 — survey untracked first, never `git clean -fd` without Daniel approval.
- Stop on any deviation per CLAUDE.md §9 Bounded Autonomy.

Begin with step 1.
```

---

## What this prompt fixes vs. the original ACTIVATION_PROMPT.md

| # | Original assumption | Actual state | Correction in v2 |
|---|---|---|---|
| 1 | "v5 contains Part A + B.1 logs" | v5 = Part A only | v2 says "v5 = Part A only, deploy v6 to add logs" |
| 2 | "Step B.2 already done" | B.2 never ran (logs never deployed) | v2 sequences B.1 retry → B.2 capture → B.3 fix → B.4 cleanup |
| 3 | Implies deploy block "lifted" | Block never confirmed lifted; just unobserved | v2 explicitly handles 4th-failure case (stop, don't loop) |
| 4 | No reference to EXECUTION_REPORT | Sessions need to leave one even if partial | v2 calls for partial EXECUTION_REPORT on failure |

---

## After Claude Code finishes (next Overseer touchpoint)

When SPEC #1 closes:
1. Update HANDOFF §"ACTIVE WORK — SPEC #1" — mark CLOSED with commit range
2. Add LEARNINGS entry L-003: "previous session HANDOFF claims must be verified against ground truth (git + Supabase) before resuming, not trusted at face value"
3. Update DECISIONS_LOG if any new recommendation arose during the fix
4. Confirm M4 closure status — what other follow-ups (5 from §"Open follow-ups": Realtime, duplicate-emails, MultiSale archive, WhatsApp QR, Campaign metrics UI) move to post-M4 backlog
