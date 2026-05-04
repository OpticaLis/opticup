# FINDINGS — ATOMIC_CONFIRMATION_FLOW

> **Location:** `modules/Module 4 - CRM/docs/specs/ATOMIC_CONFIRMATION_FLOW/FINDINGS.md`
> **Written by:** opticup-executor (Step B.2 diagnosis run, 2026-05-04; cumulative update at SPEC close 2026-05-04)
> **Cumulative across:** Part A QA notes + Part B silent-drop trace + B.4 CLI redeploy
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`
> **Last updated:** 2026-05-04 (SPEC close — Finding 1 status "FIX LANDED" annotation added; Finding 4 added from B.4 CLI deploy observation).

---

## Part A — Atomic Modal Commit (shipped as v5, signed off by Daniel)

> No findings worth filing. Part A delivered as specified in SPEC §3 + §A.5. Daniel ran the 3-button modal QA on demo (status change → cancel / confirm-no-notify / confirm-and-notify) and signed off in the prior session before B.1 dispatch. The defect surface that caused Bug 1 (state leak — post-action committing before user confirmation) is closed: in `engine.ts` post-actions + queue_send are gated on `mode === 'dispatch'`, and `dispatch_messages` cleanly separates "commit only" from "commit + send."

---

## Part B — Silent Message Drop (Bug 2)

### Finding 1 — Confirmation modal closes prematurely from a race against reloadDetail

- **Code:** `M4-CRM-AUTOMATION-CLIENT-01`
- **Severity:** **CRITICAL** (silent message drop on every attendee-move with notify=ON; reproduces deterministically)
- **Status (2026-05-04 SPEC close):** ✅ **FIX LANDED** — Option A (`onAfterConfirm` callback in `CrmAutomationClient.evaluate`) shipped in commits `c474756` + `201bcf6`. Daniel verified GREEN on demo: confirmation modal stays visible until user clicks; dispatch fires; `crm_message_log` rows created on the new run_id. Live EF v7 (no source change in B.3, EF was unaffected — purely client-side fix). The 3 fire-and-forget callsites in `crm-event-actions.js` + `crm-lead-actions.js` (×2) were left untouched as documented in `c474756` commit message; they don't have the await-then-sync-cleanup pattern that triggers the race.
- **Discovered during:** Step B.2 — analysis of run row state + client wiring
- **Locations:**
  - Race trigger: `modules/crm/crm-events-detail.js:236-242` (`reloadDetail` closure — calls global `Modal.close()`)
  - Race victim: `modules/crm/crm-attendee-move.js:96-115` (callsite — closes its own modal then awaits `ctx.onAfter` which is `reloadDetail`)
  - Modal stack semantics: `shared/js/modal-builder.js:9` (`_stack = []`), `:148-150` (`close()` pops top of stack)
  - Confirmation modal opens at: `modules/crm/crm-confirm-send.js:245` (`Modal.show(...)` pushes onto stack)
  - Client returns early without awaiting modal: `modules/crm/crm-automation-client.js:86-88`

- **Captured runId:** `725393a3-bcfa-4f14-8a9b-9f5b63b28b36`
  - tenant: demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
  - rule: "העברת משתתף ידנית - לא שילם" (rule_id `355e229d-1cd2-470e-987a-cdbc67ef6789`)
  - trigger_type: `attendee_moved`
  - trigger_data: leadId `efc0bd54...`, eventId `e0e3435a...` (target), sourceEventId `9ab165db...`
  - **total_recipients=2, sent_count=0, failed_count=0, rejected_count=0, status=completed**
  - started_at 2026-05-04 09:15:56.851 UTC, finished_at 09:15:57.554 UTC (~700ms)
  - **Pattern is deterministic:** 5 of 5 most recent automation_runs on demo (back to 06:53 UTC today) have the same `total_recipients>=1 / sent=failed=rejected=0` shape, including across both `attendee_moved` and `event_status_change` triggers.

- **Trace** (reconstructed from DB state + code review; full `[AE-DIAG]` server-stdout trace was NOT obtainable — see Finding 2):
  ```
  Daniel clicks "העבר" → CrmAttendeeMove confirmBtn handler:
    [crm-attendee-move.js:90]  await sb.rpc('move_attendee_between_events', ...)  → ok
    [crm-attendee-move.js:99]  await CrmAutomationClient.evaluate('attendee_moved', triggerData)
      [crm-automation-client.js:42]  callEf({ mode: 'evaluate' })   → POST to v6 EF
        [engine.ts]   createRun()  → run row 725393a3 written, status='running'
        [engine.ts]   prepareRulePlan()  → 1 lead × 2 channels (sms+email) = 2 plan items
        [engine.ts]   total_recipients UPDATE → 2 ✓ (matches observed)
        [engine.ts]   mode === 'evaluate' branch → finishRun(completed) → return plan_items
      [crm-automation-client.js:69]  CrmConfirmSend.show(planItems, callback)  → modal pushed
      [crm-automation-client.js:88]  return firedBase  ← evaluate() RETURNS HERE
    [crm-attendee-move.js:111]  Toast.success('המשתתף הועבר בהצלחה')
    [crm-attendee-move.js:112]  modal.close()                  ← pops attendee-move (specific handle)
    [crm-attendee-move.js:114]  await ctx.onAfter()  → reloadDetail():
                                  Modal.close()                ← pops TOP OF STACK = CONFIRMATION MODAL
                                  setTimeout(reopen detail, 50ms)
  → Confirmation modal gone before Daniel can click. Dispatch call never made.
  → 0 rows in crm_message_log for this run_id.
  → finishRun derives sent=failed=rejected=0 from message_log → matches observed.
  ```

- **The "exact line that should have come next":** `crm-automation-client.js:71` — the `await callEf({ mode: 'dispatch', plan_items: approved, dispatch_messages: choice.dispatch === true })` inside the `CrmConfirmSend.show` callback. That line never executes because the callback (which fires only on confirm-button click) is never invoked — the modal is destroyed before the user can click.

- **Expected vs Actual:**
  - Expected: 2 run rows per attendee-move-with-notify (one mode=evaluate, one mode=dispatch). 2 message_log rows (sms + email). SMS + email actually sent.
  - Actual: 1 run row (evaluate only). 0 message_log rows. No messages sent. Lead does move (independent code path via `move_attendee_between_events` RPC).

- **Reproduction:**
  ```sql
  -- Verify the run-row footprint on demo:
  SELECT id, rule_name, trigger_type, total_recipients,
         sent_count, failed_count, rejected_count, status, started_at, finished_at
  FROM crm_automation_runs
  WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  ORDER BY started_at DESC LIMIT 5;
  -- All recent rows show total_recipients>=1, sent=failed=rejected=0.

  -- Verify zero message_log rows for the captured runId:
  SELECT count(*) FROM crm_message_log
  WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND run_id = '725393a3-bcfa-4f14-8a9b-9f5b63b28b36';
  -- Returns 0.
  ```

- **Most likely root cause hypothesis:** Confirmation modal is destroyed by an unrelated `Modal.close()` (top-of-stack pop) called from `reloadDetail`'s post-success cleanup, before the user has a chance to click any button. The confirmation modal's `onChoice` callback (which contains the dispatch call to the EF) never fires.

  The bug is specifically a **modal-stack race**, NOT a server-side dispatch bug. The server-side `engine.ts` dispatch logic at lines 200-232 is correct; it just never receives the dispatch call because the client-side flow's modal hand-off is broken.

- **Why this got past Part A QA:** Daniel's Part A QA scenario (per SPEC §A.5) tested the modal on **event status changes** opened from a non-modal events list, where there is no parent modal that triggers a `reloadDetail` race. The bug surfaces only when the confirmation modal opens on top of an existing modal stack AND the calling flow's success cleanup includes a global `Modal.close()`. Attendee-move (called from the events-detail modal's attendees sub-tab) is the first such flow.

- **Suggested fix scope:** Larger than the SPEC §8 commit-3 estimate of 1-3 lines. The minimal correct fix is ~5-10 lines across 2 files:

  **Option A (recommended) — make `CrmAutomationClient.evaluate` accept an `onAfterConfirm` callback, defer cleanup until after dispatch completes:**
  ```js
  // crm-automation-client.js — extend evaluate signature:
  async function evaluate(triggerType, triggerData, onAfterConfirm) {
    ...
    CrmConfirmSend.show(planItems, async function (choice, approved) {
      var dispatchRes = await callEf({ mode: 'dispatch', plan_items: approved, run_id: runId, dispatch_messages: choice.dispatch === true, ... });
      if (typeof onAfterConfirm === 'function') { try { await onAfterConfirm(); } catch (_) {} }
      return dispatchRes || { sent: 0, failed: choice.dispatch ? approved.length : 0, rejected: 0 };
    });
    firedBase.pending_confirm = true;
    return firedBase;
  }
  ```
  ```js
  // crm-attendee-move.js — pass cleanup as onAfterConfirm; only inline-cleanup if no modal pending:
  var evalRes = await CrmAutomationClient.evaluate('attendee_moved', triggerData, async function () {
    if (typeof modal.close === 'function') modal.close();
    if (ctx && typeof ctx.onAfter === 'function') { try { await ctx.onAfter(); } catch (_) {} }
  });
  if (!evalRes || !evalRes.pending_confirm) {
    if (typeof modal.close === 'function') modal.close();
    if (ctx && typeof ctx.onAfter === 'function') { try { await ctx.onAfter(); } catch (_) {} }
  }
  ```
  Net delta ≈ 8-10 lines. Same pattern needs to be applied at the other 4 callsites of `CrmAutomationClient.evaluate` (`crm-event-actions.js`, `crm-event-register.js`, `crm-lead-actions.js` ×2) — each gets a similar 4-line wrap. **Cumulative: ~25-30 lines across 5 files.**

  **Option B (minimal but UX-compromised) — guard the inline cleanup; user must manually close lingering attendee-move modal after confirm:**
  ```js
  // crm-attendee-move.js — only ~3 lines added:
  var evalRes = await CrmAutomationClient.evaluate('attendee_moved', triggerData);
  if (evalRes && evalRes.pending_confirm) return;   // skip cleanup; confirmation modal owns the flow
  // existing modal.close() + ctx.onAfter() unchanged
  ```
  Net delta: 2-3 lines. But the attendee-move modal stays open behind the confirmation modal until the user clicks Cancel/X on it. Confusing UX. The events list reload doesn't happen until the user manually closes the attendee-move modal. Same lazy fix needed at 4 other callsites.

  **Option C (architectural — change `reloadDetail` itself) — not recommended:** would require capturing the detail-modal handle and using it instead of `Modal.close()`. Affects a single file but moves complexity into a heavily-shared helper. Risks breaking other reload paths.

- **Suggested next action:** **NEW_SPEC** (or scope-bump on this one). Foreman + Daniel decide between Option A (correct, larger) vs Option B (smaller, UX cost). I cannot pick autonomously — the trade-off is product-shaped.

- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Supabase MCP `get_logs` returns gateway-only logs, not function-stdout

- **Code:** `M4-TOOL-DIAG-01`
- **Severity:** MEDIUM (diagnostic tooling gap; blocks confirming `[AE-DIAG]` traces from this session)
- **Discovered during:** Step B.2 — attempted to fetch `[AE-DIAG]` traces via `mcp__claude_ai_Supabase__get_logs(service='edge-function')`
- **Location:** `mcp__claude_ai_Supabase__get_logs` MCP tool

- **Description:** The `service: "edge-function"` enum returns only the **gateway/router** log stream — every `event_message` is shaped `METHOD | STATUS | URL` (e.g. `"POST | 200 | https://....supabase.co/functions/v1/automation-engine"`). It does NOT include the EF runtime's `console.log`/`console.error` stdout. The 17 `[AE-DIAG]` log lines added in commit `3e79db9` are written via `console.log()` and would appear in Supabase's separate "Edge Function Logs" stream (visible in Studio Functions → automation-engine → Logs tab), but that stream is not exposed by this MCP tool's enum.

- **Impact this session:** I could not capture the actual `[AE-DIAG]` trace for runId `725393a3-bcfa-4f14-8a9b-9f5b63b28b36`. The root-cause analysis in Finding 1 is reconstructed from DB-side state (run row state, message_log absence, run-row-count vs expected) plus client-side code review. The hypothesis is strongly supported but not log-confirmed.

- **Reproduction:**
  ```
  mcp__claude_ai_Supabase__get_logs({ project_id: ..., service: 'edge-function' })
  → returns last 24h, every entry shaped "METHOD | STATUS | URL", no stdout
  ```

- **Expected vs Actual:**
  - Expected: function-stdout content including `console.log` output
  - Actual: gateway-only request-summary lines

- **Suggested next action:** **TECH_DEBT** (or upstream issue). Add a follow-up note in tooling docs that for stdout-bearing logs, use Supabase Studio UI or `npx supabase functions logs <name>` from CLI. The Foreman session's "executor-skill improvement proposals" should add an entry pointing executors at the CLI fallback when stdout traces are needed.

- **Workaround for THIS SPEC's B.3 phase:** Daniel can fetch the `[AE-DIAG]` trace for runId `725393a3` via either:
  - Supabase Studio → Functions → automation-engine → Logs tab → filter "AE-DIAG"
  - CLI: `npx supabase functions logs automation-engine --project-ref tsxrrxzmdxaenlvocyit | grep "725393a3"`

  This would CONFIRM whether evaluate-mode early-return fires (expected per Finding 1's hypothesis: yes — the mode='evaluate' EARLY RETURN line should be the LAST `[AE-DIAG]` for runId 725393a3, with NO subsequent `dispatch decision` / `dispatchPlanDirect ENTRY` lines). If the trace shows a subsequent dispatch-mode entry, my hypothesis is wrong and we need to look elsewhere.

- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Schema column drift: `crm_automation_runs` lacks `created_at`, `crm_message_log` lacks `template_slug`

- **Code:** `M4-DOC-DIAG-01`
- **Severity:** LOW
- **Discovered during:** Step B.2 SQL queries
- **Location:**
  - `crm_automation_runs` has `started_at` + `updated_at`, NO `created_at` (intentional? but documented inconsistently)
  - `crm_message_log` has `template_id` (FK), NO `template_slug` (the EF code at `dispatch.ts:60` references `item.template_slug` for the request payload, but the log row has `template_id` only)

- **Description:** Two schema/doc drift findings surfaced when my first SQL queries failed with column-not-found errors:
  - `crm_automation_runs.created_at` does not exist (SPEC docs and prior code references suggest it might). The actual columns are `started_at` (set on insert), `finished_at` (set on completion), `updated_at` (set on every UPDATE).
  - `crm_message_log` has `template_id UUID` (FK to `crm_message_templates.id`) but no `template_slug TEXT`. Code that filters logs by template_slug must JOIN against `crm_message_templates` first.

- **Impact:** None for this SPEC's scope. Logged because it cost ~2 minutes of executor time and the SPEC's QA queries reference these columns implicitly.

- **Suggested next action:** **DISMISS** (LOW severity, no functional impact) OR **TECH_DEBT** if the project's `docs/DB_TABLES_REFERENCE.md` documents these tables — fix the docs to match.

- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Supabase CLI deploy short-circuits identical-content uploads (no new version)

- **Code:** `M4-TOOL-DEPLOY-01`
- **Severity:** INFO
- **Discovered during:** Step B.4 CLI redeploy of `automation-engine` after the [AE-DIAG] cleanup
- **Location:** `npx supabase functions deploy automation-engine --project-ref tsxrrxzmdxaenlvocyit` (Supabase CLI, version unknown — Daniel's local install)

- **Description:** Daniel ran the CLI deploy command **twice** in his terminal during B.4. Supabase's deploy pipeline created **only ONE** new version (v7), short-circuiting the second invocation because the uploaded ezbr (the bundled JS payload) was byte-identical to the first deploy. This contradicts the SPEC §8 commit-plan's implicit assumption that v7 (B.3 fix) and v8 (B.4 cleanup) would be sequential numbers. The actual sequence was v5 (Part A) → v6 (B.1 diag, CLI bypass after 4 Management API failures) → v7 (B.4 cleanup, CLI). v8 was never reached.

- **Reproduction:**
  ```
  $ npx supabase functions deploy automation-engine --project-ref tsxrrxzmdxaenlvocyit
  # ✓ deploy succeeds, new version v7 active
  $ npx supabase functions deploy automation-engine --project-ref tsxrrxzmdxaenlvocyit
  # ✓ deploy returns success, but ezbr_sha256 unchanged → no new version row
  $ # list_edge_functions still shows version=7
  ```

- **Expected vs Actual:**
  - Expected (per SPEC's implicit assumption): every successful deploy CLI invocation produces a new version number.
  - Actual: Supabase pipeline checks ezbr_sha256 against the current ACTIVE version; if identical, the deploy is a no-op (success response, no version increment).

- **Impact:** Functionally **no impact** — the desired source IS live (v7 has the cleaned source per ezbr_sha256 `80cd8605d74b3f37371a4a5d902155095d10f4d5b60c9354e3624be8949ded79`). But version-numbering plans in future SPECs that assume sequential increments per deploy will drift if any deploy is a content-no-op.

- **Suggested next action:** **DISMISS** (informational; no action required). Optionally, future SPECs can sidestep this by NOT pre-committing to specific version numbers in their commit plans (e.g. write "next version" instead of "v7"). Foreman may want to flag this in `docs/CONVENTIONS.md` or the executor SKILL: "Supabase Edge Function deploys are idempotent on byte-identical content — version numbers are NOT a 1:1 count of deploy invocations."

- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS. 4 findings logged across the SPEC: Finding 1 (CRITICAL, FIX LANDED), Finding 2 (MEDIUM, workaround documented), Finding 3 (LOW, cosmetic), Finding 4 (INFO, deploy idempotency). All findings dispositioned. Awaiting Foreman review per protocol.*
