# ACTIVATION PROMPT — Resume ATOMIC_CONFIRMATION_FLOW (v3, CLI-bypass path)

> **Authored by:** Campaign Overseer, 2026-05-04
> **Reason for v3:** Daniel chose CLI bypass after 4 cumulative Supabase Management API deploy failures (option 3 from EXECUTION_REPORT §8). v6 is to be deployed by Daniel via `npx supabase functions deploy automation-engine` from his local terminal BEFORE this prompt is dispatched.

---

## STEP 0 — Daniel deploys v6 via CLI (BEFORE pasting the prompt)

Run from your local terminal in the opticup repo root:

```
npx supabase functions deploy automation-engine --project-ref tsxrrxzmdxaenlvocyit
```

**Expected outcome:**
- CLI prints success + new version number (should be 6).
- Verify in another terminal or via Supabase dashboard: `automation-engine` version=6.

**If the CLI deploy ALSO fails:**
- Do NOT paste the activation prompt. Tell me (Overseer) the exact CLI error output.
- That would mean the block is in the EF source itself, not the API path — different SPEC needed.

**If the CLI deploy succeeds:**
- Paste the block below into a fresh Claude Code session.

---

## Paste the block below into a fresh Claude Code session

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

Resume SPEC at modules/Module 4 - CRM/docs/specs/ATOMIC_CONFIRMATION_FLOW/.

VERIFIED STATE (CLI-bypass path — Daniel deployed v6 manually):
- automation-engine deployed version = v6 = Part A + diagnostic logging. Daniel deployed via CLI directly because the Management API was blocked 4× in prior sessions.
- Source on develop = commit 3e79db9 (no new commits expected before this session starts).
- Partial EXECUTION_REPORT.md exists at d8e8f4c documenting the 4 failed Management API attempts. You will REPLACE it (or append to it — your call) with the full execution record once SPEC closes.
- DO NOT attempt any Supabase MCP `deploy_edge_function` calls in this session. The deploy path is CLI-only for this SPEC. If you need a redeploy mid-session (e.g., for B.3 fix), STOP and ask Daniel to run the CLI deploy.

EXECUTION ORDER:

1. Run First Action protocol per CLAUDE.md §1 (verify branch=develop, pull latest, integrity gate).

2. Confirm verified state:
   - `git log --oneline -5 -- supabase/functions/automation-engine/` → top should be 3e79db9
   - Use Supabase MCP `list_edge_functions` → automation-engine version MUST be 6 (NOT 5). If it shows 5, the CLI deploy didn't actually land — STOP and ask Daniel to verify before proceeding.

3. Skip Step B.1 (already complete via Daniel's CLI deploy). Advance directly to B.2 reproduction phase.

4. Message Daniel exactly:
   "Step B.1 verified live (v6 via CLI bypass, [AE-DIAG] logs in production). Please reproduce the bug on demo: move an attendee between events with the 'send update' toggle ON. After you confirm reproduction, I capture logs and proceed to Step B.2."
   STOP and wait for Daniel's confirmation that he reproduced.

5. After Daniel confirms reproduction → run Step B.2:
   - Use Supabase MCP `get_logs` to fetch automation-engine logs filtered by [AE-DIAG] tag. Narrow to the window covering Daniel's reproduction (ask him for the timestamp if not provided).
   - Identify the silent-drop point: which AE-DIAG line is the LAST one logged before total_recipients=2 → sent=0 outcome.
   - Write FINDINGS.md (cumulative — Bug 1 from Part A QA + Bug 2 silent-drop trace) documenting: captured runId, the trace, the identified drop point, the most likely root cause hypothesis.
   - STOP and report the diagnosis to Daniel before fixing. He may want to adjust the fix scope.

6. After Daniel approves fix scope → Step B.3:
   - Make the targeted fix in the EF source (SPEC §8 commit 3 expects 1-3 line fix)
   - Single commit: `fix(automation-engine): dispatch silent-drop after recipients identified`
   - Push to develop
   - STOP and ask Daniel to run the CLI deploy for v7: `npx supabase functions deploy automation-engine --project-ref tsxrrxzmdxaenlvocyit`
   - Wait for Daniel's confirmation that v7 is live (verify via list_edge_functions).
   - Manual QA: Daniel reproduces the same scenario; verify total_recipients=N → sent=N (no longer 0)
   - STOP and confirm with Daniel that the fix works.

7. After Daniel confirms fix → Step B.4 (cleanup):
   - Remove all AE-DIAG log lines from engine.ts + prepare-plan.ts + dispatch.ts (revert the additions, keep the fix)
   - Single commit: `chore(automation-engine): remove temporary diagnostic logging`
   - Push to develop
   - STOP and ask Daniel to run the CLI deploy for v8 (same command).
   - Wait for v8 confirmation.

8. SPEC close — write/replace EXECUTION_REPORT.md (full version replacing the d8e8f4c partial) + cumulative FINDINGS.md across Parts A + B. Foreman review by opticup-strategic in next session per protocol.

CONSTRAINTS:
- Test ONLY on demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb). Zero prizma writes without explicit Daniel approval.
- Single commit per step. Push to develop. NEVER merge to main.
- Mandatory clean repo at end of each step.
- DO NOT call Supabase MCP `deploy_edge_function` — CLI-only for this SPEC.
- If the VM-mount drift bug appears (1700+ "deleted" files, git ls-files returns 0), follow CLAUDE.md §3a Phase 2 — survey untracked first, never `git clean -fd` without Daniel approval.
- Stop on any deviation per CLAUDE.md §9 Bounded Autonomy.

Begin with step 1.
```

---

## What this prompt fixes vs. V2

| # | V2 behavior | V3 behavior | Why |
|---|---|---|---|
| 1 | Executor attempts Supabase MCP deploy | Executor explicitly forbidden from MCP deploy | Management API path is broken 4× — bypass it entirely |
| 2 | Executor advances B.1 | B.1 is pre-completed by Daniel's CLI | v6 is already live before session starts |
| 3 | Single deploy mid-session | Deploys for v7 + v8 also via CLI (Daniel runs each) | Consistent path; if API recovers later it doesn't matter |

---

## After SPEC closes (next Overseer touchpoint)

When Claude Code reports SPEC fully closed:
1. Update HANDOFF §"ACTIVE WORK — SPEC #1" — mark CLOSED, list commit range
2. Confirm M4 closure status against the 5 follow-ups (Realtime, duplicate-emails, MultiSale archive, WhatsApp QR, Campaign metrics UI) — which move to post-M4 backlog vs require a wrap-up SPEC
3. Recommend Foreman review trigger for opticup-strategic
