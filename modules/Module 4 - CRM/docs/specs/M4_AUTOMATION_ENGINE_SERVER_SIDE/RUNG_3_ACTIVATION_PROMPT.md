# RUNG 3 — Activation Prompt — M4_AUTOMATION_ENGINE_SERVER_SIDE

> **Paste this entire block into a fresh Claude Code session. Load the `opticup-executor` skill first.**
> **Reporting language: ENGLISH to Daniel.**
> **Pre-requisite: Rungs 1 + 2 shipped + verified for at least 24h in production. Do NOT start Rung 3 until Daniel explicitly confirms "go for deletes" — this Rung removes browser engine files and is irreversible without a `git revert`.**
> **Cutover-blocker?** No. Cleanup only.

---

## YOUR MANDATE

You are the Executor for Optic Up. Load `opticup-executor`. Then execute Rung 3 of M4_AUTOMATION_ENGINE_SERVER_SIDE per this prompt.

**Read FOREMAN_REVIEW.md first**, especially §3 Rung 3 — it modifies the SPEC's §5.5 deletion list (adds `crm-automation-runs.js` to the delete list; explicitly retains `crm-automation-history.js`).

### Pre-flight (mandatory)

1. **Session-start protocol from CLAUDE.md §1** — machine, branch `develop`, pull, two-phase Cowork sync gate, clean-repo check, `npm run verify:integrity` exit 0.
2. **Iron Rules 1–23 + 31** in mind.
3. **Confirm Daniel sign-off received** in the activating message. If not — STOP, wait.
4. **Verify Rungs 1 + 2 are live and stable:**
   - `[functions.automation-engine]` block in config.toml.
   - `automation-engine` EF deployed.
   - Both crons (`event_day_status_flip` augmented, `event_2_3d_before_status_flip` new) running.
   - `modules/crm/crm-automation-client.js` exists and is loaded by the CRM admin HTML.
   - All 5 callsites use `CrmAutomationClient.evaluate` not `CrmAutomation.evaluate` (single grep + verify).
   - Production observation: at least 24h of `crm_automation_runs` rows with `started_at > Rung 2 ship time` showing the EF path is healthy.
5. **Tenant scope:** any QA on **prizma** UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. NOT demo.
6. **Phone allowlist:** ONLY `0537889878` and `0503348349`.

### Step 1 — Reverse-Callsite Report (Iron Rule 21 — mandatory before any delete)

Per FOREMAN_REVIEW §7 executor proposal #2: produce a **reverse-callsite report** for every symbol exported by every file scheduled for deletion. Both inside this repo AND inside the sibling `opticup-storefront` repo (it is unlikely the storefront references CRM internals, but verify — Daniel's storefront-vs-ERP separation guarantees this should be empty).

Files scheduled for deletion:
- `modules/crm/crm-automation-engine.js` — exports `window.CrmAutomation`
- `modules/crm/crm-automation-dispatch.js` — exports `window.CrmAutomationDispatch`
- `modules/crm/crm-automation-recipient-resolvers.js` — exports `window.CrmAutomationRecipients`
- `modules/crm/crm-automation-queue-send.js` — exports `window.CrmAutomationQueueSend`
- `modules/crm/crm-automation-post-actions.js` — exports `window.CrmAutomationPostActions`
- `modules/crm/crm-automation-runs.js` — exports `window.CrmAutomationRuns` (run row creation moves to EF; `stampLog` from `crm-confirm-send.js` is the ONLY reader — see Step 2 below)

Symbols to grep (one rg per symbol, both repos):
```
CrmAutomation              (must hit ONLY engine.js — being deleted — and the new client)
CrmAutomationDispatch      (must hit ONLY dispatch.js — being deleted)
CrmAutomationRecipients    (must hit ONLY recipients.js + engine.js — both being deleted)
CrmAutomationQueueSend     (must hit ONLY queue-send.js + engine.js — both being deleted)
CrmAutomationPostActions   (must hit ONLY post-actions.js + engine.js + crm-confirm-send.js — last is a reader)
CrmAutomationRuns          (must hit ONLY runs.js + engine.js + crm-confirm-send.js — last is a reader)
window.CrmAutomation       (sanity; should match CrmAutomation results)
```

Files NOT being deleted:
- `modules/crm/crm-automation-history.js` — read-only history UI (intentionally retained — FOREMAN_REVIEW §3 Rung 3).
- `modules/crm/crm-payment-automation.js` — wrapper, not a caller (intentionally retained — SPEC §5.5 + FOREMAN_REVIEW agree).
- `modules/crm/crm-confirm-send.js` — preview modal UI (retained; calls `CrmAutomationRuns.stampLog` — see Step 2).
- `modules/crm/crm-automation-client.js` — the new client (Rung 2).

**STOP triggers from the reverse-callsite report:**
- ANY external reader of `CrmAutomationDispatch`, `CrmAutomationRecipients`, `CrmAutomationQueueSend`, `CrmAutomationPostActions` outside the files listed above → STOP, escalate to Foreman.
- ANY reader of `CrmAutomation` outside `crm-automation-engine.js` and `crm-automation-client.js` → STOP, Rung 2 didn't fully migrate.
- ANY hit in `opticup-storefront/` for any of these symbols → STOP, this is a cross-repo coupling that wasn't anticipated.

### Step 2 — Resolve `CrmAutomationRuns.stampLog` reader in `crm-confirm-send.js`

`crm-confirm-send.js` line ~199 calls `CrmAutomationRuns.stampLog(v.logId, runId)` after a successful approve-dispatch. This is the only remaining reader of `CrmAutomationRuns` after Rung 2.

Two options for Rung 3:
- **(a)** Move `stampLog` responsibility into the EF: when `CrmAutomationClient.evaluate(... mode: 'dispatch' ...)` returns, the EF has already stamped the log row with the run_id (server-side write). Then `crm-confirm-send.js` no longer needs `CrmAutomationRuns` at all — delete the call.
- **(b)** Keep `stampLog` as a tiny browser-side helper. Means we cannot delete `crm-automation-runs.js` — only its `createRun` / `finishRun` are obsolete. Slim `crm-automation-runs.js` to just `stampLog` (~15 lines).

**Decision rule:** if Rung 1's EF already stamps log rows with run_id at dispatch time (check `EXECUTION_REPORT.md` from Rung 1), choose (a). Else choose (b). State the choice in this Rung's EXECUTION_REPORT and explain why.

### Step 3 — HTML script-tag cleanup

Find the HTML files that load the to-be-deleted scripts. Likely a single CRM admin HTML, possibly more. For each script tag pointing at a deleted file, remove the tag. Confirm via reverse-grep that no `<script src=".../crm-automation-engine.js">` (etc.) remains in any HTML.

### Step 4 — Delete the files

Files to delete (5 if Step 2 chose (a); 4 if Step 2 chose (b) — `crm-automation-runs.js` survives in slim form):

```
git rm modules/crm/crm-automation-engine.js
git rm modules/crm/crm-automation-dispatch.js
git rm modules/crm/crm-automation-recipient-resolvers.js
git rm modules/crm/crm-automation-queue-send.js
git rm modules/crm/crm-automation-post-actions.js
# IF Step 2 chose (a):
git rm modules/crm/crm-automation-runs.js
```

### Step 5 — Verify the app still loads

1. Open the CRM admin in a browser as prizma.
2. Open DevTools → Console. Expect ZERO 404s. Expect ZERO `ReferenceError: CrmAutomation is not defined` (or any of the deleted globals).
3. Smoke-test ONE callsite from each of the 4 caller files (per Rung 2's manual QA, but lighter — just confirm the modal renders + dispatch goes through).
4. Open the automation history UI (`crm-automation-history.js`) — it must still load past runs from `crm_automation_runs` (read-only, untouched table).

### Step 6 — Update MODULE_MAP

Edit `modules/Module 4 - CRM/docs/MODULE_MAP.md`:
- Remove entries for the deleted files.
- Add entry for `crm-automation-client.js` (added in Rung 2 if not already mapped).
- Note that the CrmAutomation* globals are now server-side EF (`automation-engine`).

### Step 7 — Integrity gate + commit

1. `npm run verify:integrity` (exit 0).
2. Pre-commit hooks pass.
3. Add by name (the deletes are already staged by `git rm`):
   - All 4 or 5 deleted files (staged automatically).
   - `modules/crm/crm-automation-runs.js` (modified, if option (b)).
   - `modules/crm/crm-confirm-send.js` (modified, if option (a)).
   - The CRM admin HTML (script tags removed).
   - `modules/Module 4 - CRM/docs/MODULE_MAP.md` (updated).
4. Commit message: `feat(crm): M4 Rung 3 — delete browser automation engine files; engine is now server-side only`
5. Push to `origin develop`.

### Step 8 — Retrospective (MANDATORY)

Append Rung 3 section to `EXECUTION_REPORT.md`. Update `FINDINGS.md` if any surprises. Per FOREMAN_REVIEW §7 executor proposal #2: the reverse-callsite report from Step 1 is mandatory in EXECUTION_REPORT.md.

### Step 9 — Report to Daniel (English, brief)

One sentence on what shipped (e.g., "Browser automation engine deleted; CRM admin verified clean; engine is now exclusively server-side via automation-engine EF."). State that the SPEC is now closed pending Foreman post-execution review. ONE next question if any.

### Stop-on-deviation triggers

- Integrity gate exit ≠ 0 → STOP.
- Reverse-callsite report (Step 1) shows ANY unexpected external reader → STOP, escalate.
- Any 404 in DevTools after delete → STOP, revert the script-tag removal commit and investigate.
- Any `ReferenceError` for a deleted global → STOP, revert.
- Storefront repo reference detected → STOP, this is a cross-repo issue requiring Foreman.

### Out of scope for Rung 3

- Do NOT touch the EF (no Rung 1 changes).
- Do NOT touch the cron jobs (no Rung 1 changes).
- Do NOT touch `crm-automation-history.js`, `crm-payment-automation.js`, or `crm-automation-client.js`.
- Do NOT delete `crm-confirm-send.js` (it stays — Daniel directive is keep-the-modal browser-side).
- Do NOT migrate any DB rule data.

---

*End of Rung 3 activation prompt.*
