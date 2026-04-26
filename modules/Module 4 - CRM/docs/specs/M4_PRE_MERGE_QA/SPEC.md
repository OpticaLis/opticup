# SPEC — M4_PRE_MERGE_QA

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_QA/SPEC.md`
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Type:** Audit / QA report (read-only — no fixes in this SPEC)
> **Drives:** Comprehensive QA of Module 4 (CRM) on `develop` before merge to `main`. Returns a structured findings report classified by severity (CRITICAL / HIGH / MEDIUM / LOW). No code modifications. After Daniel reviews, follow-up SPECs will fix the findings that warrant action before merge.

---

## 1. Goal

Before merging `develop` to `main`, comprehensively QA Module 4 (CRM) end-to-end on the local environment. Find regressions, dead code, broken flows, security issues, and integration gaps. Return findings to the strategic chat for Daniel's review.

This SPEC produces a **report only** — zero fixes. The report drives subsequent fix SPECs.

After Daniel approves the report, the workflow is:
1. Strategic chat authors fix SPECs for each finding Daniel decides to address pre-merge.
2. Executor runs them.
3. Re-QA (this SPEC re-runs, or a smaller subset).
4. Merge to main (Daniel manually).
5. Event manager testing on Prizma.

## 2. Background

### What just closed
The M4 Campaigns sequence — 5 SPECs across ~3 hours — landed pipeline operational on demo. Make scenario `9126542` syncing 7 campaigns every 4 hours into the CRM Campaigns Screen. This was the last build-phase work for Module 4.

### Why QA before merge
- `develop` has accumulated significant changes since last merge to main (CRM payment lifecycle trio, campaigns build, V1+V2+V3 of body fix, bootstrap-wire fix, several other M4 SPECs).
- Once on `main`, the code reaches Prizma production. Bugs there are visible to real users.
- The bootstrap-wire bug (caught in the campaigns flow) is a regression class: bootstrap REPLACING vs. WRAPPING `showCrmTab`. There may be similar latent regressions across other tabs we haven't tested recently.
- The event manager will be invited for his testing on Prizma soon. We need confidence that the basics are solid before that.

### What's NOT in this SPEC's scope
- **No code fixes.** Every finding goes into the report. Fixes are separate SPECs.
- **No DB writes.** All queries are SELECT.
- **No production touched.** All testing on local + demo tenant. No Prizma data writes.
- **No Make scenario edits.** `9126502` stays as-is.
- **No EF deploys.** EFs are inspected in code, not redeployed.
- **No merge to main.** This is QA only.
- **No deletion of "dead code" found.** Reported, not removed.

## 3. Authority Envelope

### Verification-First Discipline (opticup-guardian protocol)

Every finding classified CRITICAL or HIGH **MUST** have concrete evidence. The executor must follow the opticup-guardian skill's evidence-first protocol:

```
**[SEVERITY] Finding title**
Evidence: [What you actually checked — URL, query, command, screenshot]
Result: [What you actually found]
Action: [What needs to happen]
```

If a claim cannot be verified in the moment, mark it UNVERIFIED with the assumption + verification steps + potential severity. Never present inference as confirmed.

Severity definitions for THIS SPEC's report:
- **CRITICAL** — Blocks merge. Will cause data loss, site downtime, or breaking regression.
- **HIGH** — Should fix before merge. User-facing issue, broken flow, or security concern.
- **MEDIUM** — Can fix post-merge. Cosmetic, minor regression, performance issue.
- **LOW** — Nice-to-have. Tech debt, dead code, doc gaps.
- **INFO** — Observation, no action implied.

### Read-Only Scope

DO:
- Use `mcp__supabase__execute_sql` for SELECT queries only.
- Use `mcp__Claude_in_Chrome__*` to load and inspect localhost pages.
- Read the codebase via `Read`/`Grep`/`Glob`.
- Run `npm run verify:integrity` and `npm run verify --staged` (read-only diagnostics).
- Inspect git history via `git log` / `git diff`.

DO NOT:
- Modify any file in the repo.
- Run any DDL or DML on the DB (no INSERT/UPDATE/DELETE/DROP/ALTER).
- Re-deploy any Edge Function.
- Modify any Make scenario or Data Structure.
- Commit or push anything except the SPEC's own retrospective files.
- Use `git add -A`.

### Test Data Constraints

If the QA requires creating test leads / test events / test attendees on demo tenant for flow testing:
- **Phone numbers:** ONLY `0537889878`, `0503348349`, `0507168471`. Any other number — STOP, ask Daniel.
- **Emails:** ONLY `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`. Any other email — STOP.
- **Tenant:** demo only (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). Never prizma.
- **Cleanup:** at SPEC end, the executor MUST delete test data created during the QA. Document the cleanup queries in EXECUTION_REPORT.

If the QA can be performed without creating test data (read-only inspection of existing demo data) — prefer that path. Test data creation is a last resort.

## 4. Hypothesis Ladder

This is an audit SPEC, not a fix SPEC. There's no hypothesis to ladder — execute the QA passes per §13, classify findings per the verification-first discipline, return the report.

If any pass produces an unexpected error (e.g. localhost server isn't running, MCP unavailable), STOP and report which pass failed. Don't extemporize.

## 5. Success Criteria

All measurable.

### Coverage criteria (mandatory passes)
1. ✅ All 9 visible CRM tabs loaded in browser via Chrome MCP, each tab inspected for: rendering, console errors, network errors, basic interaction (click a row, open a modal).
2. ✅ All Module 4 EFs inspected for: deploy state, recent error logs (last 24h), code review for obvious bugs introduced since last main merge.
3. ✅ All Module 4 RPCs queried for: existence, return shape, security definer flag.
4. ✅ All Module 4 Views queried for: existence, current row counts on demo tenant, whether they reference any orphan tables.
5. ✅ All Module 4 RLS policies on tables enumerated; spot-check 3 random tables for correct JWT-claim USING clause (Iron Rule 15 canonical pattern).
6. ✅ Whitelist enforcement check: identify where phone/email allow-lists live, confirm enforcement is active.
7. ✅ End-to-end flow tests for at least 3 critical CRM flows (see §13 Path 4).
8. ✅ Dead code / orphan scan across Module 4 source files (Rule 21).
9. ✅ Cross-tab regression check: every tab works after switching from another (catches bootstrap-wire-style bugs).
10. ✅ `npm run verify --full` runs cleanly OR all warnings are documented as findings.

### Report criteria
11. ✅ Report file written to `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_QA/QA_REPORT.md` (separate from EXECUTION_REPORT — this is the user-facing finding list).
12. ✅ Every CRITICAL and HIGH finding has Evidence + Result + Action structure per §3.
13. ✅ Findings grouped by severity, then by category (Frontend / Backend / DB / Security / Hygiene).
14. ✅ Total finding count + breakdown by severity in the report's executive summary.
15. ✅ For each finding, a recommended action: fix-before-merge / fix-post-merge / accept-as-debt / dismiss.

### Repo hygiene
16. ✅ `git status` at SPEC end matches session start (3 guardian files + untracked outputs/strays). No file modifications outside the SPEC's own folder.
17. ✅ Pre-commit hooks pass on the retrospective commit.

## 6. Stop-on-Deviation Triggers

1. **STOP** if any QA pass requires writing to the DB beyond the test-data constraints in §3.
2. **STOP** if a finding suggests an active security incident (e.g., RLS missing on a table containing customer data — STOP and ask before publishing).
3. **STOP** if Chrome MCP cannot reach localhost:3000.
4. **STOP** if `mcp__supabase__execute_sql` returns errors that suggest the DB is in an unexpected state.
5. **STOP** if test data creation requires a phone/email outside the whitelist.
6. **STOP** if the executor would need to modify a file to complete a pass — flag in report, don't fix.

## 7. Rollback Plan

This is a read-only SPEC. No rollback needed for the QA itself.

The only writes are: the QA_REPORT.md, EXECUTION_REPORT.md, and FINDINGS.md (the latter is the SPEC's retrospective, distinct from QA_REPORT.md). All committed in one retrospective commit. If any of these have issues — `git revert <hash>` and re-author.

If test data was created and the executor failed to clean it up — flag prominently in EXECUTION_REPORT so Daniel can run cleanup queries manually.

## 8. Out of Scope

- Any code fix.
- Any DB write.
- Any Make scenario edit.
- Any EF redeploy.
- Performance benchmarking beyond what `verify --full` reports.
- Visual UI polish review (already covered in B9 / Visual QA SPEC).
- Module 1, 1.5, 2, 3 testing — only Module 4. (Cross-module integration touchpoints noted as findings, but the test scope is M4.)
- The `M4_CAMPAIGNS_PRIZMA_HISTORICAL_IMPORT` SPEC — separate, deferred.
- The `M4-DEBT-CRM-BOOTSTRAP-WRAP` structural refactor — separate.

## 9. Expected Final State

### Files added to the SPEC folder
```
modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_QA/
  SPEC.md                  (this file, moved from outputs/)
  QA_REPORT.md             (the findings report — Daniel-facing)
  EXECUTION_REPORT.md      (process retrospective)
  FINDINGS.md              (executor-skill / SPEC-author improvement notes — distinct from QA_REPORT)
```

### Repo state
```
On branch develop
Your branch is ahead of origin/develop by 1 commit  (until push)
Changes not staged for commit:
  modified:   docs/guardian/DAILY_SUMMARY.md
  modified:   docs/guardian/GUARDIAN_ALERTS.md
  modified:   docs/guardian/GUARDIAN_REPORT.md
Untracked files:
  [same as session start]
```

After push: clean (no ahead).

## 10. Commit Plan

**Commit 1 — Retrospective (single commit, all 4 files in the SPEC folder):**
```
chore(spec): close M4_PRE_MERGE_QA — comprehensive QA report before merge to main

Read-only audit of Module 4 (CRM) on develop. Findings classified
CRITICAL / HIGH / MEDIUM / LOW / INFO with verification-first evidence
per opticup-guardian discipline. Strategic chat will author fix SPECs
based on the report.

Coverage: 10 mandatory passes per SPEC §5.1-10. No code modifications,
no DB writes, no Make/EF changes.
```

This is the only commit from this SPEC. Findings → fix SPECs → those have their own commits.

## 11. Pre-flight Checks

1. `git status` matches the post-cleanup state: 3 guardian files modified, outputs/strays untracked + the new FOREMAN_REVIEW from CLEANUP just committed, no staged files.
2. `git log -1` shows the latest CLEANUP FOREMAN_REVIEW commit (whatever its hash is at execution time).
3. Branch is `develop`. Repo is `opticalis/opticup`.
4. **localhost:3000 is running.** If not — STOP and ask Daniel to start it. (The strategic chat assumes it's running because Daniel was just on the campaigns screen.)
5. Chrome MCP can reach localhost:3000 (test with a single navigate call).
6. `mcp__supabase__execute_sql` is available.
7. `mcp__make__*` MCPs are available.

If any pre-flight fails — STOP and report.

## 12. Lessons Already Incorporated

- **opticup-guardian protocol:** every CRITICAL/HIGH finding requires Evidence + Result + Action. No "I assume" findings.
- **Iron Rule 21 (No Orphans):** dead-code scan in §13 Path 8.
- **Iron Rule 23 (no secrets):** the QA report MUST mask any secret values found in code. If a real secret literal is found in code — that's itself a CRITICAL finding (Rule 23 violation), but the report masks the value.
- **Iron Rule 31 (integrity gate):** runs at session start.
- **V3 author-skill Proposal 1 (cross-validate hypotheses):** every finding cites concrete evidence, not extrapolation from a sample.
- **CLEANUP author-skill Proposal 1 (SPEC type classifier):** this SPEC is explicitly typed as Audit/QA — no Hypothesis Ladder needed (§4 documents this absence).

## 13. QA Protocol — 10 Passes

The executor performs all 10 passes in order. Each pass produces findings (or "no findings") for the report.

### Pass 0 — Pre-flight + setup
1. All §11 checks pass.
2. Chrome MCP navigates to `http://localhost:3000/crm.html?t=demo`. Confirm page loads.
3. Login as demo tenant if PIN required. Use Daniel's PIN if available; otherwise ask Daniel via STOP.
4. Capture baseline `git status` to compare at end.

### Pass 1 — All CRM tabs render and respond
For each of the 9 tabs in the CRM sidebar (Dashboard, לידים נכנסים, רשומים, אירועים, קמפיינים, מרכז הודעות, יום אירוע, היסטוריית אוטומציה, תור הודעות, לוג פעילות):
1. Click the tab.
2. Verify: page renders with expected content (tab title + at least one element of expected UI).
3. Read console — note any new errors (not pre-existing warnings like Tailwind CDN).
4. Try basic interaction (click a row → modal opens, click a button → behavior triggers).
5. Switch to another tab, then back — verify tab still works (regression check, catches bootstrap-wire-style bugs).

Findings format for any issue: severity + which tab + what failed + evidence (console error text, screenshot, network response).

### Pass 2 — Edge Function inspection
1. List all M4-related EFs via `mcp__supabase__list_edge_functions` (likely: lead-intake, send-message, event-register, unsubscribe, register_lead_to_event-related, facebook-campaigns-sync, resolve-link, others).
2. For each: confirm `verify_jwt` setting matches expected (most should be `true` except known exceptions like `unsubscribe` and `facebook-campaigns-sync` which are `false` with their own auth).
3. Read recent logs (last 24h) via `mcp__supabase__get_logs` for each EF; flag any 5xx errors or unexpected 4xx patterns.
4. Read source code of EFs via `mcp__supabase__get_edge_function` for any EF that's been modified in the recent commit range — quick sanity check for: hardcoded secrets (Rule 23), tenant_id resolution correctness, error handling.

### Pass 3 — RPC inspection
Query for all M4-related RPCs (functions in the public schema):
```sql
SELECT proname, prosecdef AS security_definer,
       pg_get_function_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname LIKE '%lead%' OR proname LIKE '%crm%' OR proname LIKE '%event%' OR proname LIKE '%campaign%' OR proname LIKE '%registration%' OR proname LIKE '%attendee%'
ORDER BY proname;
```
For each: note name, args, security definer flag. Flag any RPC that should be `SECURITY DEFINER` but isn't, or vice versa.

### Pass 4 — View inspection
1. List all M4-related views (similar query, change `pg_proc` → `pg_views`).
2. For each: COUNT(*) on demo tenant. Flag any that return 0 unexpectedly, or that reference dropped tables.
3. Spot-check `v_crm_campaign_performance` returns 7 rows (post-cleanup state we know to be true).

### Pass 5 — RLS audit
1. List all M4-related tables (existing query in `docs/GLOBAL_SCHEMA.sql` should help, or query `pg_tables`).
2. Pick 3 random tables.
3. For each: query their RLS policies via:
   ```sql
   SELECT polname, polqual::text AS using_clause
   FROM pg_policy
   WHERE polrelid = '<table_name>'::regclass;
   ```
4. Verify USING clause matches Iron Rule 15 canonical pattern:
   `tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid`
5. Flag any deviation as HIGH.

### Pass 6 — Whitelist enforcement
1. Search the codebase (`grep -rn` across `js/`, `modules/`, `supabase/functions/`):
   - Test phones: `0537889878`, `0503348349`, `0507168471` (and `+972...` variants).
   - Test emails: `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`.
2. Identify where the whitelists live (likely in `lead-intake` EF, `send-message` EF, or a `crm-config.js` somewhere).
3. Read the enforcement code: confirm the check is active (not commented out, not behind a debug flag that's off).
4. Confirm `0507168471` is in the list. If not — that's a HIGH finding (Daniel wants it added).
5. Confirm both emails are in the list (or in their respective enforcement). If not — HIGH.
6. Note any enforcement gap (e.g. whitelist exists in lead-intake but not in send-message) — likely HIGH.

### Pass 7 — End-to-end flow tests
Run 3 critical flows on demo tenant via Chrome MCP. **Use only whitelisted test data.** Clean up at end.

**Flow A — Lead intake from public form:**
1. Open `localhost:3000/[whatever the public lead form path is — investigate first]?event_id=<a known demo event>`.
2. Submit a lead with phone `0507168471` (the new whitelisted number).
3. Verify: lead appears in CRM "לידים נכנסים" tab.
4. Verify: confirmation message dispatched (check `crm_message_log`).
5. Verify: HTTP 200 from EF, no errors in console or network.
6. Cleanup: soft-delete the test lead via SQL at end.

**Flow B — Event registration:**
1. As admin in CRM, register the test lead from Flow A to an existing demo event.
2. Verify: attendee row created with correct status.
3. Verify: confirmation SMS+email dispatched.
4. Verify: registration appears in event detail modal.
5. Cleanup: soft-delete attendee at end.

**Flow C — Campaign drill-down:**
1. Open Campaigns tab.
2. Click a campaign row to open drill-down.
3. Verify: drill-down modal renders with all metadata + multiplier explanation.
4. Click gear icon to open Unit Economics settings.
5. Verify: settings load. (Don't save — read-only verification.)
6. No cleanup needed (no writes).

For each flow: report pass/fail + evidence per step.

### Pass 8 — Dead code / orphan scan
1. For each .js file in `modules/crm/`, grep for whether the file is loaded anywhere (`crm.html` script tags, dynamic imports, etc.).
2. Flag any .js file in `modules/crm/` that is NOT referenced anywhere — Rule 21 violation candidate. (Could be misconfigured load order; investigate before flagging as dead.)
3. For each function exported from `modules/crm/*.js` (window.X = ...), grep for its usage. Flag any function defined but never called as LOW (likely dead).
4. Check for duplicate function names across the codebase (`window.X` defined in 2+ files — like the bootstrap-wire bug). Flag as MEDIUM.

### Pass 9 — Cross-tab regression
1. Open Dashboard.
2. Click each other tab in sequence: לידים נכנסים → רשומים → אירועים → קמפיינים → מרכז הודעות → יום אירוע → אוטומציה → תור הודעות → לוג פעילות.
3. After each tab switch, verify: tab loads, no console error, basic UI elements present.
4. After all tabs visited, click back to Dashboard. Verify: still works.
5. Capture which tabs (if any) require a hard reload to recover.

### Pass 10 — Verify scripts + integrity gate
1. `npm run verify:integrity` — exit 0 expected. If exit 2, document warnings as findings.
2. `npm run verify --staged` — clean expected (no staged files at this point).
3. `npm run verify --full` — run if it exists. Document any warnings as findings.
4. Note: don't fix anything found by verify. Report only.

### Pass 11 — Composing the report
1. Write `QA_REPORT.md` in the SPEC folder with the following structure:
   ```
   # M4 Pre-Merge QA Report
   
   ## Executive Summary
   - Total findings: N
   - CRITICAL: X | HIGH: Y | MEDIUM: Z | LOW: W | INFO: V
   - Recommended action: [merge-ready / blocked-on-CRITICAL / blocked-on-HIGH / fix-N-then-merge]
   
   ## Findings by Severity
   
   ### CRITICAL
   [each with Evidence / Result / Action]
   
   ### HIGH
   [each with Evidence / Result / Action]
   
   ### MEDIUM
   [each with Evidence — recommended but not mandatory per opticup-guardian]
   
   ### LOW / INFO
   [brief mentions, evidence optional]
   
   ## Findings by Category
   - Frontend: [count]
   - Backend (EFs/RPCs): [count]
   - DB (RLS, schema, views): [count]
   - Security (whitelists, secrets, RLS gaps): [count]
   - Hygiene (dead code, orphans, doc gaps): [count]
   
   ## Recommended Action Per Finding
   [table: finding ID | severity | recommended fix timing]
   
   ## Cleanup Performed
   [list of any test data created and cleaned up during the QA]
   ```

2. Compile the executor's process retrospective in `EXECUTION_REPORT.md`.
3. Compile any executor-skill / author-skill findings (process learnings) in `FINDINGS.md`.

### Pass 12 — Cleanup
1. Delete any test leads created during Flow tests (verified soft-delete already happened, hard-delete the soft-deleted ones if needed for cleanliness).
2. Re-run `git status` — confirm clean delta.

### Pass 13 — Commit retrospective
1. `git add` the 4 files in the SPEC folder explicitly.
2. Run integrity gate.
3. Commit per §10.
4. Push.

---

## 14. Output Format

The executor returns to the strategic chat with:

1. **Brief execution summary:** how many passes completed cleanly, how many encountered issues.
2. **Path to QA_REPORT.md:** so Daniel can open and read it.
3. **Top 5 highest-severity findings inline:** so Daniel sees the most important issues immediately without opening the file.
4. **Final repo state:** `git log -3`, `git status`.
5. **Test data cleanup confirmation:** did all test data get cleaned, or are there leftovers?
6. **Recommended next step:** "merge-ready" / "X CRITICAL findings need fixes" / "Y HIGH findings recommend fixes."

---

## 15. Iron Rule Compliance

- **Rule 21 (No Orphans):** Pass 8 enforces.
- **Rule 22 (defense-in-depth):** noted in any RLS finding.
- **Rule 23 (no secrets):** Pass 2 + Pass 6 search for hardcoded secrets. Any found = CRITICAL.
- **Rule 31 (integrity gate):** Pass 10.
- **opticup-guardian:** every CRITICAL / HIGH finding has Evidence + Result + Action.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26 evening.*
