# RUNG 2 — Activation Prompt — M4_AUTOMATION_ENGINE_SERVER_SIDE

> **Paste this entire block into a fresh Claude Code session. Load the `opticup-executor` skill first.**
> **Reporting language: ENGLISH to Daniel.**
> **Pre-requisite: Rung 1 has shipped + verified. Do NOT start Rung 2 until Daniel confirms Rung 1 is observed working in production for at least one full status-flip cron cycle.**
> **Cutover-blocker?** No (Rung 1 is the blocker). Ideally same-day as Rung 1; may slip up to 7 days post-cutover.

---

## YOUR MANDATE

You are the Executor for Optic Up. Load `opticup-executor`. Then execute Rung 2 of M4_AUTOMATION_ENGINE_SERVER_SIDE per this prompt.

**Read FOREMAN_REVIEW.md first**, especially §3 Rung 2 and §4 §5.4 decision (the approve call must pass the approved plan_items array, not just dry_run=false).

### Pre-flight (mandatory)

1. **Session-start protocol from CLAUDE.md §1** — machine, branch `develop`, pull, two-phase Cowork sync gate, clean-repo check, `npm run verify:integrity` exit 0.
2. **Iron Rules 1–23 + 31** in mind throughout.
3. **Confirm Rung 1 actually shipped:** verify `[functions.automation-engine]` block exists in `supabase/config.toml`; verify `automation-engine` EF is deployed (`mcp__claude_ai_Supabase__list_edge_functions`); verify both `event_day_status_flip` and `event_2_3d_before_status_flip` cron jobs exist with the augmented commands (`SELECT jobname, command FROM cron.job WHERE jobname IN ('event_day_status_flip','event_2_3d_before_status_flip')`). If any of these is missing → STOP, Rung 2 cannot proceed without Rung 1.
4. **Tenant scope:** all QA on **prizma** — UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. NOT demo.
5. **Phone allowlist:** ONLY `0537889878` and `0503348349` for any SMS-triggering test.
6. **Read end-to-end before writing code:**
   - `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/SPEC.md`
   - `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md`
   - `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_ENGINE_SERVER_SIDE/EXECUTION_REPORT.md` (Rung 1's report)
   - `modules/crm/crm-confirm-send.js` (the preview modal — its planItems shape is the contract)
   - `modules/crm/crm-event-actions.js` (line ~217 — caller 1)
   - `modules/crm/crm-event-register.js` (line ~109 — caller 2)
   - `modules/crm/crm-lead-actions.js` (lines ~9 + ~143 — callers 3 and 4)
   - `modules/crm/crm-attendee-move.js` (line ~99 — caller 5)
   - `crm.html` (or whichever HTML loads the CRM admin) — find where the automation files are loaded; you'll need to add the new client there.

### Step 1 — Repo Pre-Flight (Iron Rule 21 — No Orphans, No Duplicates)

```
grep -rn "CrmAutomation\.evaluate" modules/ --include="*.js"
grep -rn "CrmAutomationClient" modules/ --include="*.js" --include="*.html"
grep -rn "crm-automation-client" --include="*.html" --include="*.js"
```

Expected:
- First grep: 5 callsites in 4 files (engine.js itself + 5 caller hits — total ~6 lines including the engine's own `evaluate` definition).
- Second + third greps: 0 hits (the new client doesn't exist yet).

If second or third grep returns hits → STOP, name collision; investigate.

### Step 2 — Build the client

Path: `modules/crm/crm-automation-client.js` (~80 lines). Iron Rule 12: target ≤300 lines, hard cap 350.

Public API:
```javascript
window.CrmAutomationClient = {
  evaluate: async function (triggerType, triggerData) {
    // 1. POST to /functions/v1/automation-engine with body { tenant_id, trigger_type, trigger_data, mode: 'evaluate' }
    //    Use the same anon-key + Authorization header pattern shared.js uses for sb client.
    //    Defense-in-depth: explicitly send tenant_id from getTenantId() (Iron Rule 22).
    // 2. Receive { plan_items, run_id, ... }.
    // 3. If window.CrmConfirmSend && CrmConfirmSend.show:
    //      - Modify CrmConfirmSend.show OR provide a callback so that on approve, we POST again
    //        with { ..., mode: 'dispatch', plan_items: [approved items], run_id }.
    //    Else (no modal loaded — server-side / non-UI fallback):
    //      - POST again immediately with mode='dispatch' and the full plan_items.
    // 4. Return the same shape the old engine returned: { fired, sent, failed, rejected, skipped, queued, run_id, pending_confirm? }
  }
};
```

Authoring discipline:
- Use the existing `sb` client's auth context — it already has tenant JWT for prizma session.
- Mirror the previous engine's return shape exactly so callers don't notice the swap.
- The dispatch call carries the **approved plan_items array** (per FOREMAN_REVIEW §4 §5.4 clarification), not just a flag — this prevents preview/dispatch race conditions on recipient changes.
- Do NOT delete any old engine file in this Rung. Rung 3 owns deletes.

### Step 3 — Edit CrmConfirmSend if needed

Read `modules/crm/crm-confirm-send.js` and decide: does its `show(planItems)` accept an `onApprove` callback today? If yes — reuse it. If no — minimal additive change to support a callback that the new client passes in. The change must be additive (existing callers continue working). If a non-additive change is needed → STOP and Foreman re-review.

### Step 4 — Swap callsites (5 callsites in 4 files)

Surgical edits. **Verbatim swap, zero behavior changes**:

1. `modules/crm/crm-event-actions.js` line ~217 — change `CrmAutomation.evaluate('event_status_change', ...)` to `CrmAutomationClient.evaluate('event_status_change', ...)`. Update the guard on line ~216 from `window.CrmAutomation` to `window.CrmAutomationClient`.
2. `modules/crm/crm-event-register.js` line ~109 — same pattern, trigger_type `'event_registration'`. Update guard line ~108.
3. `modules/crm/crm-lead-actions.js` line ~9 (`fireLeadStatusAutomation`) — `CrmAutomationClient.evaluate('lead_status_change', ...)`. Update inline guard.
4. `modules/crm/crm-lead-actions.js` line ~143 — `CrmAutomationClient.evaluate('lead_intake', ...)`. Update inline guard.
5. `modules/crm/crm-attendee-move.js` line ~99 — `CrmAutomationClient.evaluate('attendee_moved', ...)`. Update guard line ~96.

After each edit, immediately re-grep:
```
grep -rn "CrmAutomation\.evaluate" modules/crm/ --include="*.js"
```
Should reach **1 hit** when done — only `crm-automation-engine.js` line ~231 (the engine's own internal warn-log mentioning its own name; verify by reading the line). Zero hits in caller files.

### Step 5 — Wire the new file into the CRM admin HTML

Find the HTML that loads the CRM admin JS (likely `crm.html` or similar). Add `<script src="modules/crm/crm-automation-client.js"></script>` AFTER `crm-confirm-send.js` (the client depends on the modal) but it can be anywhere relative to the existing engine files (engine still loads — Rung 3 deletes it). Confirm in DevTools: `typeof window.CrmAutomationClient === 'object'` after page load.

### Step 6 — UX QA on prizma

1. Open the CRM admin in a browser as prizma (NOT demo).
2. Pick a real prizma event whose attendee leads include ONLY allowlisted phones (or temporarily filter test data — but verify before any send).
3. **Test each of 5 callsites** with at least one matched rule firing:
   - Open registration on an event → confirm modal renders, click approve, observe `crm_message_log` row appears, observe `crm_automation_runs` shows the run.
   - Register a lead to an event → same drill.
   - Change a lead status (manual) → same.
   - Create a fresh lead via CRM lead-add modal → confirm `lead_intake` rule fires.
   - Move an attendee between events → confirm `attendee_moved` rule fires.
4. Compare row counts and shapes against a Rung-1-time baseline (ask Daniel for the baseline date if not in the Rung 1 EXECUTION_REPORT).

Stop on any UX regression — the modal MUST render exactly as before, the toasts MUST appear, the dispatch counts MUST match.

### Step 7 — Integrity gate + commit

1. `npm run verify:integrity` (exit 0).
2. Pre-commit hooks pass.
3. Add by name:
   - `modules/crm/crm-automation-client.js` (new)
   - `modules/crm/crm-confirm-send.js` (only if you edited it)
   - `modules/crm/crm-event-actions.js`
   - `modules/crm/crm-event-register.js`
   - `modules/crm/crm-lead-actions.js`
   - `modules/crm/crm-attendee-move.js`
   - the CRM admin HTML (script tag added)
4. Commit message: `feat(crm): M4 Rung 2 — route 5 browser automation callsites through automation-engine EF via CrmAutomationClient`
5. Push to `origin develop`.

### Step 8 — Retrospective (MANDATORY)

Update `EXECUTION_REPORT.md` (append a Rung 2 section, do not overwrite Rung 1's content) and update `FINDINGS.md` if anything surfaces. Per FOREMAN_REVIEW §7 executor proposal #2: include a **reverse-callsite report** for `CrmAutomation.evaluate` showing all post-edit hits (should be only the engine's own internal references; engine still loaded, just unreachable via callers).

### Step 9 — Report to Daniel (English, brief)

One sentence on what shipped, status of dual-mode coexistence (engine still present but unreached), and the ONE next question (likely "shall I proceed to Rung 3 deletes?").

### Stop-on-deviation triggers

- Integrity gate exit ≠ 0 → STOP.
- Any callsite produces a different return shape than before (caller logic depends on `.fired / .sent / .pending_confirm` etc.) → STOP.
- The confirmation modal does not render or click-approve does not dispatch → STOP.
- Step 4 grep does not reach the expected ~1 hit (engine self-reference only) → STOP.
- Any HTML 404s on the new client file at page load → STOP.
- An SMS test would have hit a phone other than `0537889878` or `0503348349` → STOP.

### Out of scope for Rung 2

- Do NOT delete any browser-side automation file. Rung 3.
- Do NOT touch `crm-payment-automation.js` — it's a wrapper, not a caller; SPEC §5.5 + FOREMAN_REVIEW agree it stays.
- Do NOT touch the EF (no Rung 1 changes here).

---

*End of Rung 2 activation prompt.*
