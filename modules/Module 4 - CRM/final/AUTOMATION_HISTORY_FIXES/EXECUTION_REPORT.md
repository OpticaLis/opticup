# EXECUTION_REPORT — AUTOMATION_HISTORY_FIXES

## Summary

Three closely-related bugs in the automation-history pipeline made the
example run `6e04a16d-25f9-47e4-bf30-27b1c9fd0849` look healthy on the
surface (status=completed, total=2) while every count column read 0
and one of the two `crm_message_log` rows (the SMS rejection) was
orphaned (`run_id=NULL`). All three are fixed in this SPEC:

1. `send-message` EF now accepts `payload.run_id` and writes it on
   ALL `crm_message_log` inserts — pending, sent, failed, rejected,
   template_not_found. Previously the EF ignored `run_id` entirely
   and the client's `CrmAutomationRuns.stampLog` only ran on the
   success path, leaving rejected rows un-stamped forever.
2. `CrmAutomationRuns.finishRun` now derives the three count columns
   (`sent_count`, `failed_count`, `rejected_count`) from
   `crm_message_log` GROUP BY status WHERE run_id=X immediately
   before the UPDATE on `crm_automation_runs`. The query is the
   single source of truth — survives retries, survives parallelism.
3. The drill-down's `statusBadge` now styles `sent` / `rejected`
   distinctly (emerald / orange) and renders a Hebrew label so the
   per-message rows are readable. The drill-down query had no
   status filter — it was already pulling rejected rows; bug 1 was
   why they didn't appear (run_id=NULL).

The send-message EF deploy via MCP failed with the known infra
error (F2 from OVERNIGHT_M4_SCALE_AND_UI — fifth consecutive failure
on this specific EF). Updated source is on disk; Daniel needs to
run the manual CLI deploy from §"Daniel handoff" below.

## What was done

- **`supabase/functions/send-message/index.ts`** (+4 lines, 329 → 333)
  - Extract `runId = trimOrNull(payload.run_id)` alongside other
    payload fields.
  - Add `run_id: runId` to the three `crm_message_log` INSERTs:
    - line 194: template_not_found path
    - line 227: rejected path (allowlist gate)
    - line 241: pending path (which later becomes sent or failed)
  - **NOT YET DEPLOYED** — see "Daniel handoff" below.

- **`modules/crm/crm-messaging-send.js`** (+1 line, 93 → 94)
  - Pass `run_id: opts.runId || null` in the EF payload so the
    server can stamp it. Pre-existing callers that omit `runId`
    continue to work (sends `null`, EF handles it).

- **`modules/crm/crm-automation-engine.js`** (+1 line, 349 → 350)
  - `dispatchPlanDirect` (the no-modal fallback path) now passes
    `runId: it.run_id || undefined` to `CrmMessaging.sendMessage`.
  - File still at Rule 12 hard cap.

- **`modules/crm/crm-confirm-send.js`** (+1 line, 265 → 266)
  - `approveAndSend` passes `runId: it.run_id || undefined` too.
    This is the path the example bug ran through.

- **`modules/crm/crm-automation-runs.js`** (+16 lines, 71 → 87)
  - `finishRun(runId, status)` now SELECTs status from
    `crm_message_log WHERE run_id=runId`, counts per category,
    and includes `sent_count` / `failed_count` / `rejected_count`
    in the UPDATE on `crm_automation_runs`. Wrapped in try/catch
    so a SELECT error degrades gracefully (counters left at 0,
    status still flips to 'completed').
  - The pre-existing `stampLog` path is now a belt-and-suspenders
    fallback for the brief window where the EF is still on the
    old version (before Daniel runs the manual deploy).

- **`modules/crm/crm-automation-history.js`** (+3 lines, 167 → 170)
  - `STATUS_LABEL` map for `completed/running/failed/sent/rejected/
    pending/queued/delivered/read` — Hebrew labels for the message
    drill-down (reused by both run-level and row-level rendering).
  - `statusBadge` styles: `sent` → emerald, `rejected` → orange,
    `failed` → rose, `running` → amber, `completed` → emerald.
  - The drill-down query at `openDrillDown` line 114-117 is unchanged
    — it was already SELECT-ing all rows for the run with no status
    filter, so once bug 1 is deployed, rejected rows will appear.

- **No DB schema changes.** All three count columns
  (`sent_count`, `failed_count`, `rejected_count`) and `run_id` on
  `crm_message_log` already existed (verified via
  `information_schema.columns`).

- **No backfill of historical runs.** Daniel did not request it.
  The example run `6e04a16d` will continue to display sent=0
  rejected=0 — its rejected message_log row has run_id=NULL and
  finishRun's UPDATE is gated by `.eq('id', runId)`, not
  re-runnable. If a backfill is needed: a one-shot UPDATE could
  pair message_log rows to runs by tenant + lead + created_at
  proximity, but that is its own SPEC.

## Daniel handoff (CLI deploy required)

The send-message EF MCP deploy returned `InternalServerErrorException`
(known infra issue, F2 from overnight findings). Source is correct on
disk. Run from PowerShell on the Windows desktop:

```powershell
supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
```

(no `--no-verify-jwt` — send-message keeps `verify_jwt=true`; only the
public-form `event-register` EF needs the false flag.)

After deploy, verify with the QA flow:
- Create TEST LEAD with phone `050-000-0002` (NOT on allowlist) and
  email `daniel.test@prizma-optic.co.il` on the demo tenant.
- Approve terms → transfer to "רשומים" (triggers status_change rule).
- Open הגדרות → היסטוריית אוטומציה.
- New run row should show: `total=2`, `sent=1`, `rejected=1`.
- Click פירוט: 2 rows — אימייל / נשלח (emerald), SMS / נדחה (orange)
  with `phone_not_allowed: 0500000002` in the שגיאה column.

## Deviations from SPEC

None. The user's prompt named the three bugs precisely; the fixes
land where the prompt said they'd land.

## Decisions made in real time

1. **Fix where run_id originates (server-side stamp), not just where
   it's missing (client-side stampLog).** stampLog could have been
   extended to ALSO stamp rejected rows by tracking the log_id
   the EF returns on rejection — but the EF doesn't return the
   rejected log's id (it returns `{ok:false, error:'phone_not_allowed'}`
   without `log_id`). Adding `log_id` to the rejected response
   would also work, but stamping in the EF at insert time is
   atomic and survives the EF crashing between insert and
   response.
2. **Counters via SELECT, not local in-memory tally.** Daniel
   listed two options (α post-dispatch query vs β in-loop counter).
   Picked α because (i) it survives retries — running finishRun
   again after retry-failed updates the counts to the new totals;
   (ii) the in-loop counter wouldn't see template_not_found
   rejections that the EF inserts but never returns to the
   client (in some race conditions); (iii) the message_log
   table is the audit source of truth and the runs table is
   derived — this is the canonical direction.
3. **Style `rejected` differently from `failed`.** A failed
   message means a system error; rejected means policy gate
   (here: not on allowlist). Different colors so Daniel can
   triage at a glance.
4. **Hebrew status labels in drill-down only.** The run-level
   table already shows `total/sent/failed/rejected` headers in
   Hebrew; the cell values are numbers. The drill-down's per-row
   status was the only place raw English was leaking.
5. **Did NOT touch the existing `stampLog` path.** It remains a
   belt-and-suspenders backup for the few minutes between this
   commit landing and Daniel running the manual deploy.

## What would have helped me go faster

A working MCP deploy for send-message. This is the fifth SPEC where
that specific EF's deploy bounces with the same internal error;
F2 from OVERNIGHT_M4_SCALE_AND_UI tracks it.

## Self-assessment

| Dimension | Score | Justification |
|---|---|---|
| (a) adherence to SPEC | 10 | All three bugs addressed; QA flow ready for Daniel post-deploy. |
| (b) adherence to Iron Rules | 10 | Tenant-scoped reads in finishRun (Rule 22). Rule 12 respected (350 cap on engine). No raw DB access (Rule 7). |
| (c) commit hygiene | 10 | Single concern (3 related bugs, one logical fix). |
| (d) documentation currency | 9 | EXECUTION_REPORT + FINDINGS in place. SESSION_CONTEXT not updated yet — folded into Daniel's morning handoff. |

## 2 proposals to improve opticup-executor

1. **Add a "deploy queue" in EXECUTION_REPORT_TEMPLATE.md.** When
   a SPEC's correctness depends on EFs that the executor cannot
   deploy (MCP infra issues), the report should have a dedicated
   `## Deploy Queue` section listing each EF + the exact CLI
   command Daniel needs to run, separated from the rest of the
   "Daniel handoff" prose. Today this info is buried in the
   summary; a fixed section makes it machine-readable for the
   next executor that might re-run QA.
2. **Add a pre-flight check that grep's the deploy-failure
   history.** Before attempting `mcp__claude_ai_Supabase__deploy_edge_function`
   for `send-message` or `event-register`, the executor should
   grep the last 5 SPEC FINDINGS for known-failing EFs (a marker
   like `EF-DEPLOY-FAIL: send-message`). If it finds 2+ matches,
   skip MCP entirely and write straight to disk + Daniel handoff,
   saving the round trip. Concrete: add a section to SKILL.md
   §"SPEC Execution Protocol" Step 1 — after harvesting
   FOREMAN_REVIEW.md proposals, also harvest a list of
   known-bad-MCP EFs from FINDINGS.md.
