# SPEC — M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-21
> **Module:** 4 — CRM
> **Brief:** `modules/Module 4 - CRM/architecture-brief/BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21.md`
> **Pipeline mode:** Full-Auto with mandatory Chrome MCP live verification at closure (Iron Rule 34).
> **Priority:** P0 — production blocker. Daniel cannot open registration for the next Prizma event.
> **Tenant scope:** demo for diagnosis-time instrumentation; **Prizma for live verification** of the final fix on event #25.

---

## 0. Pre-Authoring Reality Check

Confirmed 2026-05-21 by Foreman from session-start probes:

| Check | Result |
|---|---|
| origin/main HEAD | `762cec7` (PR #112 merged from develop — bug code IS on main) |
| origin/main..origin/develop count | 4 docs commits — bug-relevant JS+EF files BIT-IDENTICAL on both branches |
| `crm_message_log` column truth | `template_id uuid` exists; **`template_slug` DOES NOT exist** |
| Prizma event #25 status | `planning` (event_id `2e39e884-9811-4b6c-88d0-0699f85ce1b3`, name "אירוע המותגים - מאי 2026", date 2026-05-29) |
| Demo event #30 status | `registration_open` (event_id `a089ed87-db77-45e5-ba23-d233225da2ce`) — already advanced past `planning` per yesterday's diagnostic click |
| Prizma `crm_leads` total | 1343 (status=`waiting`: 1210, `unsubscribed`: 103, others: 30) |
| Demo `crm_leads` total | 28 (status=`waiting`: 6, `waitlist`: 1, `confirmed`: 7, others: 14) |
| Active `event_status_change` rules on Prizma | 2 rules fire on `status_equals=registration_open`: `שינוי סטטוס: נפתחה הרשמה` (tier2 / waiting filter) + `אירוע פתח להרשמה - הזמנת רשימת המתנה` (leads_by_status / waitlist filter) |
| Active rules on demo | Same 2 rules, byte-identical `action_config` (DEMO_PARITY_REPLICATION 2026-05-11) |
| automation-engine EF version | v21, 200 OK on recent calls (100–2700ms range) |
| Iron Rule 31 gate | Will be checked at SPEC start by Executor |
| Untracked file survey | 9 pre-existing untracked paths at Foreman session start (campaign briefs, diagnosis brief, dev-server.log, regopen_email_preview.html). The diagnosis brief is THIS SPEC's input artifact; the other 8 are unrelated work-in-progress and **MUST be left alone** by the Executor. Selective `git add` by filename throughout. |

### Runtime-Semantics Rehearsal (SPEC_TEMPLATE §5.3)

The bug is a silent-return state machine across 3 JS files. Rehearsed mental model:

1. `crm-event-actions.js → changeEventStatus(eventId='reg_open')`
   - Loads event row (SELECT) → `oldStatus='planning'`
   - Defines `commit` closure (which would UPDATE `crm_events.status`)
   - Calls `CrmAutomationClient.probeAndCommit('event_status_change', triggerData, commit, { silentToast: 'סטטוס עודכן' })`

2. `crm-automation-client.js → probeAndCommit(...)` returns a single Promise built around TWO concurrent listeners on the SAME `previewPromise`:
   - **Listener A** (`previewPromise.then`): if `preview?.recipients_by_lead?.length >= 1` → returns silently and leaves modal path to win. ELSE silently runs `commit()` + Toast + `settle({mode:'silent'})`.
   - **Listener B** (`CrmConfirmSendV2.showAsync(previewPromise, …, { suppressEmptyModal: true, onCancel: settle })`): awaits the SAME promise; if recipients ≥ 1 opens modal; if 0 returns silently.
   - The Promise only settles via the silent branch of A, the modal's onChoice (commit then settle), or `onCancel`.

3. **Stuck-state hypotheses (Phase 0 must select between them — Foreman pre-commits decision criteria below):**
   - **H1 — Modal-render failure.** Listener B sees recipients ≥ 1 → calls `_openModalShell` + `_attachHandlers`, but rendering 1210 recipients crashes mid-render. Modal DOM is half-built and never visible; no onChoice/onCancel/handler fires → Promise never settles. Listener A also returns silently (length ≥ 1). Symptom matches: dropdown closes, no commit, no modal, no toast, no DB write.
   - **H2 — EF returns malformed shape.** Preview returns 200 with `recipients_by_lead` as some non-array shape (e.g., `null` or `{}`), so `Array.isArray(...) && .length` is false in BOTH listeners → Listener A's silent-commit branch fires. But then the commit DOES update — contradicts symptom. **H2 ruled out unless the commit `UPDATE` itself is RLS-blocked** (not seen in logs).
   - **H3 — EF returns shape that the two listeners read differently.** E.g., `recipients_by_lead` is a non-array `iterable`; `Array.isArray()` returns false in BOTH checks → Listener A commits. Same result as H2 → contradicts symptom.
   - **H4 — Tenant-scoped row count exceeds an inner pagination limit and the EF returns a shape Listener A reads as length>=1 but Listener B reads as empty (or vice-versa).** Unlikely given identical reads; tagged for investigation if H1 is disproven.
   - **H5 — Modal opens but is rendered off-screen / z-index hidden / behind another modal.** Listener B opens modal; user doesn't see it; no click → no settle. Matches all symptoms.

Phase 0 (live diagnosis via Chrome MCP) selects between H1 / H5 / H4 by reading `window.__statusChangeTrace` populated by 7 lightweight instrumentation points the Executor inserts as Step 0.5 of execution.

### Pre-commit decision criteria (Foreman binds outcomes BEFORE Executor sees the data)

| Phase-0 finding | Phase-1 fix |
|---|---|
| **F1**: Trace shows `previewPromise.then` returned silently (recipients_by_lead.length ≥ 1) AND `CrmConfirmSendV2.showAsync` reached `_openModalShell`, but `Modal.show` returned `null` OR `_attachHandlers` threw mid-execution → **H1 confirmed (modal render failure)** | Apply Fix A (see §3.B): add a try/catch around `_attachHandlers` + `_hydrate` that, on throw, runs the commit silently (`onCancel`-equivalent via a new internal `_fallbackCommit` callback the caller passes) so the Promise settles. Status STILL changes (the original goal). Trace the render error to FINDINGS. |
| **F2**: Trace shows the modal IS shown (`Modal.show` returned non-null, `_attachHandlers` succeeded, footer buttons exist in DOM) but the operator can't see it (offscreen / behind something / z-index) → **H5 confirmed (modal hidden)** | Apply Fix B: investigate the modal's positioning / z-index in `modal-builder.js` against the event-detail modal underneath; ensure the confirmation modal stacks above its parent. |
| **F3**: Trace shows `previewPromise.then` ran the silent commit branch (recipients length === 0 or falsy) AND `commitCallback` was invoked AND the UPDATE returned an error (e.g. RLS, network) → **commit-side failure** | Apply Fix C: surface the commit error via Toast.error; ensure the Promise settles `{committed: false, mode: 'commit_failed'}`. Investigate why the UPDATE fails. |
| **F4**: Trace shows neither listener fired (preview EF never resolved within 10s) → **EF hang** | Apply Fix D: add a 10s timeout to `previewPromise` in `probeAndCommit`. On timeout → silent commit + Toast.warning + log to FINDINGS. |
| **F5**: Trace shows preview returns recipients ≥ 1, modal opens, user sees it but clicking "אישור ושלח הודעות" doesn't commit → **onChoice → commitCallback wiring broken** | Apply Fix E: inspect `_attachHandlers`'s confirm path; verify `commitCallback({ mode: 'confirmed', ... })` actually runs and awaits. |
| **F-OTHER**: Any other finding | STOP — escalate to Foreman with the trace dump. Do NOT improvise fix shape. |

Plus a **separate background finding for FINDINGS.md (independent of which fix path activates):** the EF `preview.ts:126,131` SELECTs `crm_message_log.template_slug` — a column that DOES NOT EXIST on the live DB. The catch at preview.ts:268 swallows the error to console.warn. This drips a permanent error stream into Postgres logs and makes `last_message_sent_at`/`last_template_slug` always null in the modal's recipient panel. This is NOT the cause of the silent-fail bug (the catch lets preview still return recipients_by_lead). It will become `M4_FIX_PREVIEW_TEMPLATE_SLUG_REFERENCE` follow-up — fix the EF SELECT to use `template_id` joined to `crm_message_templates(slug)`. Out of scope here; logged in FINDINGS.

---

## 1. Goal

Restore the ability to change a Prizma `crm_events.status` from `planning` to `registration_open` (and any other status transition) by clicking the dropdown item in the event detail modal — without the silent failure that currently blocks Daniel from opening event #25 for registration. Close with Chrome MCP live verification on **Prizma event #25** specifically (Iron Rule 34), not just demo or unit-level checks.

---

## 2. Background & Motivation

The 2026-05-19 SPEC `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` introduced the probe-then-commit flow (`CrmAutomationClient.probeAndCommit`) replacing the prior dual-path that dispatched messages from both browser and server. Layer 1 of that SPEC says: "`recipients_by_lead.length > 0` → modal opens hydrated from the preview." Demo testing during that SPEC's close ran on demo's 28-lead universe — the modal path was exercised on small recipient lists. **It was never exercised against a Prizma-scale recipient list (1210 leads in `status='waiting'`).**

Today (2026-05-21) the Campaign Lead, while attempting to open event #25 for registration via the live Prizma site, observed: dropdown closes, no commit, no modal, no toast, no console error, no DB write. Demo event #30 worked the same day (advanced to `registration_open` with TWO success toasts). The differentiator is data — Prizma's 1210-lead audience triggers a code path that demo's 6-lead audience never reaches.

This SPEC diagnoses + fixes the specific JS state-machine branch that silently swallows the click, then verifies live on Prizma event #25 per Iron Rule 34.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Commits produced | 3–5 commits in range | `git log <START_COMMIT>..HEAD --oneline \| wc -l` between 3 and 5 |
| 3 | SPEC folder populated | 5 files: SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md | `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/` |
| 4 | Architecture-brief committed | Diagnosis brief is now git-tracked | `git log --diff-filter=A --name-only -- "modules/Module 4 - CRM/architecture-brief/BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21.md"` → non-empty |
| 5 | Phase-0 trace captured | `EXECUTION_REPORT.md` §3 contains the `window.__statusChangeTrace` dump from the Prizma-side reproduction | doc inspection |
| 6 | Root-cause finding | EXECUTION_REPORT.md §4 names F1/F2/F3/F4/F5 (per §0 decision table) | doc inspection |
| 7 | Fix shape matches §0 decision table | Fix code matches the row of the table the finding pointed to | code review by Reviewer |
| 8 | Instrumentation removed before close | `grep -rn "__statusChangeTrace" modules/crm/` → 0 hits | grep |
| 9 | **Iron Rule 34 — Chrome MCP live verification on Prizma event #25** | TEST_REPORT.md contains: (a) screenshot of event #25 status changing from `planning` → `registration_open` on `http://localhost:3000/crm.html?t=prizma` (Localhost-Tester) **AND** a SECOND screenshot taken from the live `https://app.opticalis.co.il/crm.html?t=prizma` after merge OR a clear note that the post-merge live verification is Daniel's manual step; (b) `window.__modalTrace` or equivalent runtime trace showing the expected commit branch fired; (c) DB query `SELECT status FROM crm_events WHERE id='2e39e884-9811-4b6c-88d0-0699f85ce1b3'` returns `'registration_open'` after the click | inspect TEST_REPORT.md |
| 10 | Demo event regression | A demo event that was previously `planning` advances to `registration_open` with TWO toasts AND DB row updates — confirms no regression on the small-audience silent path | TEST_REPORT.md |
| 11 | Prizma `crm_events` count invariant | `SELECT count(*) FROM crm_events WHERE tenant_id=<prizma>` unchanged pre/post (one row UPDATEd, zero rows INSERTed/DELETEd) | `mcp__claude_ai_Supabase__execute_sql` |
| 12 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 13 | Pre-existing untracked files untouched | The 8 pre-existing untracked paths (excluding the diagnosis brief which IS committed by this SPEC) still appear in `git status --porcelain` at session end | `git status --porcelain \| grep '^??' \| wc -l` → exactly 8 |
| 14 | Smoke baseline | `tests/smoke/baseline.test.mjs` 7/7 PASS post-fix | Localhost-Tester deliverable |
| 15 | Cron `pg_cron` / EF `automation-engine` / EF `dispatch-queue` unchanged | No EF redeploy, no migration applied by this SPEC | confirm via Supabase MCP `list_edge_functions` versions equal pre/post |
| 16 | Sentinel doc-drift carry | M4 SESSION_CONTEXT updated with this SPEC's closure line; no schema doc changes needed (no DDL) | confirm with `git diff` on SESSION_CONTEXT.md |

### Baselines

| Symbol | File | Metric | Value (captured 2026-05-21) |
|---|---|---|---|
| `BASE_PRIZMA_LEADS` | `crm_leads` | `count where tenant=prizma` | 1343 |
| `BASE_PRIZMA_WAITING` | `crm_leads` | `count where tenant=prizma and status='waiting'` | 1210 |
| `BASE_PRIZMA_EVENTS` | `crm_events` | `count where tenant=prizma` | (Executor captures pre-flight) |
| `BASE_DEMO_EVENTS` | `crm_events` | `count where tenant=demo` | (Executor captures pre-flight) |
| `BASE_AE_VERSION` | EF `automation-engine` | deployment version | 21 |
| `BASE_DQ_VERSION` | EF `dispatch-queue` | deployment version | 15 |

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking
- Read any file in the repo + run any read-only SQL (Level 1).
- Add temporary `window.__statusChangeTrace.push({...})` instrumentation lines to the 3 JS files in §8 — provided every such line is removed in the final commit (Criterion 8).
- Spin up localhost via `scripts/start-local.ps1` (ERP :3000 + Storefront :4321 health-checked).
- Use Chrome MCP (`mcp__chrome-devtools__*`) to drive the browser through the change-status click sequence, take screenshots, evaluate scripts in page context, inspect console + network panels.
- Apply Fix A / B / C / D / E per the §0 decision table when Phase-0 trace selects one.
- Commit and push to `develop` in the commit plan of §9.
- Run `verify.mjs --staged` / `--full` between phases.
- Use Localhost-Tester for the post-fix smoke baseline (7/7 baseline.test.mjs).

### What REQUIRES stopping and reporting
- Trace finding maps to `F-OTHER` in §0 table → STOP, escalate to Foreman.
- A second-order bug found mid-execution (e.g. `crm_message_log.template_slug` reference is in fact the root cause, not a background drip) → STOP, escalate; do NOT silently re-scope.
- Any need to apply a DB migration, modify an EF, modify `automation-engine` / `dispatch-queue` / `send-message` → STOP (out of scope per §7).
- Any need to merge to main → STOP (Daniel's authorization only, per CLAUDE.md §9 #7).
- Iron Rule 31 gate returns exit 1 at any point → STOP and investigate corruption.
- Live verification on Prizma event #25 FAILS to advance the status → STOP, rollback, escalate.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- Trace shows the bug reproduces on **demo too** (not Prizma-specific) → STOP — the diagnostic premise is wrong, escalate to re-scope.
- `BASE_PRIZMA_LEADS` measured pre-fix differs from post-fix by more than ±5 → STOP (a write touched leads).
- `BASE_PRIZMA_EVENTS` count differs by more than ±0 post-fix (only the one targeted event row may UPDATE) → STOP.
- `npm run dev` (or `scripts/start-local.ps1`) cannot bring localhost up → STOP.
- Chrome MCP cannot drive the page to login (e.g., PIN auth flow broken) → STOP and escalate.
- The instrumentation lines themselves cause a parse / load error → STOP (rollback instrumentation, escalate; the Executor MUST `node -c` or eval-check each JS file after instrumentation insert).

---

## 6. Rollback Plan

- `git tag pre-m4-event-status-prizma-silent-fail-2026-05-21 <START_COMMIT>` BEFORE any code change. Pushed to origin/develop as the master safety baseline.
- If Phase-1 fix breaks demo regression (Criterion 10) or Prizma live verification (Criterion 9): `git reset --hard <pre-tag-commit>` on develop, `git push --force-with-lease origin develop` ONLY after Daniel's explicit go-ahead (CLAUDE.md §9 #7).
- If only the instrumentation needs reverting: remove the instrumentation lines, re-commit a clean fix-only commit.
- DB state: no DB writes by this SPEC except (a) the Prizma event #25 status UPDATE that IS the goal AND (b) the demo regression event's status UPDATE. Both UPDATEs are part of normal CRM operation; no special rollback SQL required.
- Backup folder: this SPEC does NOT meet the 5-file / 100-line / file-rename trigger of CLAUDE.md §9 #9 (touching 1–3 JS files surgically) — no `backups/` folder required.

---

## Destructive Operations

**None.** No `git reset --hard`, no `git push --force`, no file deletes, no mass renames (≥5 files), no SQL `DROP`/`TRUNCATE`, no DML mass-delete, no governance-file deletions, no merge to `main`, no `--no-verify` bypass. The Prizma event #25 status UPDATE is a single-row UPDATE on a tenant-scoped predicate (`WHERE id=… AND tenant_id=…`) — it is the goal, not a destructive op per Iron Rule 32 (mass-delete without tenant scope is the prohibited shape; single-row tenant-scoped UPDATE is not).

If the Phase-1 fix is wrong and rollback is required, that rollback path requires Daniel's go-ahead per §6 and is logged here as a CONDITIONAL declaration: `git push --force-with-lease origin develop` ONLY on Daniel's chat-level authorization. Otherwise it is treated as a stop-trigger, not autonomous.

---

## 7. Out of Scope (explicit)

- **Edge Function changes.** `automation-engine`, `send-message`, `dispatch-queue`, `fb-capi-dispatch`, `lead-intake`, `resolve-link` — none redeployed. The `preview.ts:126` `template_slug` SELECT against a missing column is logged in FINDINGS as a follow-up SPEC, not fixed here.
- **DB migrations / DDL.** No `ALTER TABLE`, no `CREATE INDEX`, no policy changes.
- **Multi-tenant or cross-module impact.** This SPEC touches only browser JS for the M4 event status-change flow. Lead status-change (`crm-lead-actions.js`) and attendee move (`crm-attendee-move.js`) share the same `probeAndCommit` flow but are NOT in this fix scope — they get the same fix if-and-only-if Phase-0 evidence shows they ALSO break in the same way on Prizma. Default: do not touch them; FINDINGS notes that they should be verified by Daniel manually.
- **Merge to main.** This SPEC closes on `develop`. Promotion to `main` (and therefore to live `app.opticalis.co.il`) is Daniel's manual GitHub PR step.
- **Campaign content / templates / placeholders.** This bug is structural, not content-related. The `event_registration_open` template body is fine on both tenants.
- **The 8 pre-existing untracked files** (campaign briefs, regopen email preview, dev-server.log) — left in place exactly as found.

---

## 8. Expected Final State

### New files
- `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/SPEC.md` (this file)
- `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/EXECUTION_REPORT.md` (Executor)
- `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/FINDINGS.md` (Executor)
- `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/TEST_REPORT.md` (Localhost-Tester)
- `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/FOREMAN_REVIEW.md` (Foreman)

### Modified files (one or more of, depending on Phase-0 finding)
- `modules/crm/crm-automation-client.js` — targeted fix to `probeAndCommit` (most likely under F1 / F4 / F5)
- `modules/crm/crm-confirm-send-v2.js` — targeted fix to `showAsync` / `_attachHandlers` (most likely under F1 / F5)
- `modules/crm/crm-confirm-send-v2-render.js` — targeted fix to render path (only if Phase-0 trace pinpoints renderBody as the crash site under F1)
- `modules/crm/modal-builder.js` — only if F2 / H5 confirmed (z-index / positioning fix); unlikely
- `modules/crm/crm-event-actions.js` — defensive guard in `changeEventStatus` (e.g. timeout wrapper) only if F4 confirmed
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top entry summarizing this SPEC's closure

### Architecture-brief committed
- `modules/Module 4 - CRM/architecture-brief/BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21.md` (pre-existing untracked → committed in Commit 1)

### DB state
- Prizma `crm_events` row id `2e39e884-9811-4b6c-88d0-0699f85ce1b3` → `status='registration_open'`. All other Prizma rows unchanged.
- Demo regression test will advance one event from `planning` to `registration_open` (or whichever target the Executor chooses for the regression smoke). That row's new status is the only demo DB delta.
- Zero rows inserted, zero rows deleted, zero columns added.

### Docs updated
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — add top entry. Format mirrors the template used by previous Pipeline-closed M4 SPECs (one paragraph in the existing `> **Today (2026-05-21):**` block style).
- `MASTER_ROADMAP.md` — NOT required (no phase status change).
- `docs/GLOBAL_MAP.md` / `docs/GLOBAL_SCHEMA.sql` — NOT required (no new functions, no DDL).
- M4 `MODULE_MAP.md` — NOT required (no new files, only edits to existing files).
- M4 `CHANGELOG.md` — Executor's choice; brief one-line entry recommended for traceability since this is a P0 production-bug closure.

---

## 9. Commit Plan

The Executor commits in this exact order. Each commit's body cites Iron Rule 31 gate result. **Selective `git add` by filename in every commit — never `git add -A` or `git add .`** (Bounded Autonomy §9 #6, plus the 8 pre-existing untracked paths from §0).

- **Commit 1** — `docs(m4): commit BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21 + SPEC.md`
  - Files added: the diagnosis brief + this SPEC.md.
  - Establishes the SPEC folder + the input artifact in git.
- **Commit 2** — `chore(m4): add temporary __statusChangeTrace instrumentation for Prizma silent-fail diagnosis`
  - Adds the 7 trace points listed in §10 below.
  - Marked clearly as TEMPORARY in the commit body. Will be reverted in Commit 4.
  - Verifies Iron Rule 31 gate exit 0 after stage.
- **Commit 3** — `fix(m4): <one-line-summary-of-Fix-A/B/C/D/E>` (single targeted fix matching §0 decision table)
  - Commit body cites the Phase-0 finding F1/F2/F3/F4/F5 and the exact instrumented trace step that selected it.
  - Iron Rule 32 declaration: `None.` (re-asserted).
- **Commit 4** — `chore(m4): remove __statusChangeTrace instrumentation`
  - Reverts Commit 2's trace lines.
  - Confirms `grep -rn "__statusChangeTrace" modules/crm/` returns 0 hits (Criterion 8).
- **Commit 5** — `docs(spec): close M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21 with EXECUTION_REPORT + FINDINGS + TEST_REPORT + FOREMAN_REVIEW + SESSION_CONTEXT`
  - Combined doc-close commit. Includes M4 SESSION_CONTEXT top-entry.
  - Optional split into 5a (Executor docs) + 5b (Tester) + 5c (Foreman) per Pipeline preference — both shapes count as valid for Criterion 2 (range 3–5).

If only `crm-confirm-send-v2.js` changes, Commit 3 is one file. If multiple JS files change, Commit 3 is multi-file but still one commit per logical fix.

---

## 10. Phase-0 Instrumentation Points

The Executor inserts these 7 trace points BEFORE attempting the Prizma reproduction. Each point pushes one object onto `window.__statusChangeTrace` (created lazily as `window.__statusChangeTrace = window.__statusChangeTrace || []`). Every object includes `t: Date.now()` and a `step` label.

| # | File | Function | Insert location | Trace shape |
|---|---|---|---|---|
| 1 | `crm-event-actions.js` | `changeEventStatus` | first line inside function | `{step:'changeEventStatus:enter', eventId, newStatus}` |
| 2 | `crm-event-actions.js` | `changeEventStatus` | immediately before `await CrmAutomationClient.probeAndCommit(…)` | `{step:'changeEventStatus:beforeProbeAndCommit', triggerData}` |
| 3 | `crm-event-actions.js` | `changeEventStatus` | immediately after the `await CrmAutomationClient.probeAndCommit(…)` returns (capture `result`) | `{step:'changeEventStatus:afterProbeAndCommit', result}` |
| 4 | `crm-automation-client.js` | `probeAndCommit` | inside `previewPromise.then(async function(preview){…})` immediately after the early-return condition is evaluated (capture `preview && Array.isArray(preview.recipients_by_lead) ? preview.recipients_by_lead.length : 'no-array'`) | `{step:'probeAndCommit:listenerA:previewSeen', recipientsLen, previewKeys: Object.keys(preview \|\| {})}` |
| 5 | `crm-automation-client.js` | `probeAndCommit` | inside `CrmConfirmSendV2.showAsync(…, onChoice, …)` — Executor wraps the onChoice in a logger so `{step:'probeAndCommit:onChoice:called', choice}` fires the moment the modal callback runs | as above |
| 6 | `crm-confirm-send-v2.js` | `showAsync` | inside the `suppressEmptyModal` branch — right after `if (!pv2 || …) return;` and right before `_openModalShell` | `{step:'showAsync:openingModal', recipientsLen: pv2.recipients_by_lead.length}` |
| 7 | `crm-confirm-send-v2.js` | `showAsync` | wrap `_openModalShell + _attachHandlers` in `try { … } catch (e) { window.__statusChangeTrace.push({step:'showAsync:renderThrew', error: e && e.message, stack: e && e.stack}); throw e; }` so a render crash is captured | as above |

After the click on Prizma event #25 → "הרשמה פתוחה", Executor inspects `window.__statusChangeTrace` via Chrome MCP `evaluate_script` and pastes the JSON dump into EXECUTION_REPORT.md §3. Reading the trace top-to-bottom determines which §0 decision row applies.

**If the trace stops at step 4 with `recipientsLen >= 1` and never produces step 5/6/7** → F1 confirmed (modal path never reached — bug is somewhere between probeAndCommit's modal-opening line and showAsync's first line; investigate the `showAsync` await `previewPromise` resolution or a missing window global).

**If the trace shows step 6 fires but step 7 catches an error** → F1 confirmed (modal render crashes — fix the renderer; surface the error to the caller as a commit-fallback).

**If the trace shows step 6 fires, step 7 succeeds (no catch), but no step 5 ever fires** → H5 (modal opens but operator doesn't see it — F2).

**If the trace stops at step 2/3 with no step 4** → F4 (preview EF never resolves).

---

## 11. Dependencies / Preconditions

- Localhost-Tester laptop has Chrome MCP available + `scripts/start-local.ps1` working.
- Supabase MCP available for live DB probes (already verified in Foreman's pre-flight).
- Cowork-VM session must NOT run this SPEC — user instructed Desktop-only per the Brief (`Cowork-VM git is unhealthy`). The Pipeline-coordination lock file at `_archive/pipeline-sessions/*.lock` must show this is a Desktop session.
- The Iron Rule 31 gate must return exit 0 or 2 at SPEC start. If the gate fails (exit 1), this SPEC does NOT begin — open a repair SPEC first.
- Pipeline-coordination claim (Executor's first action): `node scripts/pipeline-coordination.mjs claim` with this SPEC's slug.

---

## 12. Lessons Already Incorporated

- FROM `M4_DUAL_PATH_CLEAN_FIX_2026_05_19/FOREMAN_REVIEW.md` — Iron Rule 34 (Chrome MCP live verification mandatory for UI-touching SPECs) → **APPLIED** in §3 Criterion 9 and the Pipeline closure path.
- FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` — Author Proposal "rollback SQL lives in ROLLBACK.md doc-context, not in a `_down.sql` file" → **N/A** (no SQL in this SPEC).
- FROM `M4_DEMO_STATIC_LINKS_BACKFILL/FOREMAN_REVIEW.md` (yesterday, 2026-05-21) — F-01 INFO "Iron Rule 31 gate ERROR repaired by clearing EOF padding" → **APPLIED** mentally by reminding the Executor to gate-check before instrumentation insert.
- FROM `M4_SHORT_LINKS_DASHBOARD_REDESIGN/FOREMAN_REVIEW.md` (recent main merge) — `IR34 bypass granted post 4-round verification` → **NOT APPLIED HERE.** This SPEC's IR34 is mandatory at first close; no bypass requested.
- FROM `feedback_probe_biggest_production_tenant.md` (auto-memory) — "for any data SPEC, pre-flight probes + live verification MUST run on Prizma" → **APPLIED** in §3 Criterion 9 and §4 autonomy envelope. The whole point of this SPEC is that demo testing missed the bug.
- FROM `feedback_clicks_are_not_actions.md` (auto-memory) → **N/A** (no metric/conversion-rate work in this SPEC).
- FROM `feedback_vfv_must_use_not_just_inspect.md` (auto-memory) — VFV must actually use the surface, not just inspect → **APPLIED** in §3 Criterion 9 (Chrome MCP actually clicks the dropdown item, doesn't just verify the dropdown opens).
- FROM `feedback_dont_add_unrequested_features.md` (auto-memory) — "if a SPEC seems to do more than Daniel asked, stop and ask" → **APPLIED** in §7 Out-of-Scope. We DELIBERATELY do not fix the preview.ts template_slug column drift (it's a follow-up); we DELIBERATELY do not extend the fix to lead/attendee status changes; we DELIBERATELY do not refactor `probeAndCommit`.

### Author-side cross-reference sweep (SPEC_TEMPLATE §1.5)

- Grepped `__statusChangeTrace` in `docs/GLOBAL_MAP.md`, `modules/*/docs/MODULE_MAP.md`, and all `modules/crm/*.js` → 0 hits (no name collision; safe to introduce as temporary global).
- No new DB objects, functions, RPCs, views, columns, files, T-constants, or FIELD_MAP entries are introduced by this SPEC.
- Confirmed Rule 21 (No Orphans, No Duplicates): the fix targets EXISTING functions in EXISTING files. No new helper added.

---

## 13. Pre-Merge Checklist (Executor verifies before requesting Reviewer + Tester pass)

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Iron Rule 31:** `npm run verify:integrity` returns exit 0 or 2.
- [ ] **Iron Rule 32:** Destructive Operations declaration above honored (no destructive ops fired). Hook passes.
- [ ] **Iron Rule 34:** TEST_REPORT.md contains Chrome MCP screenshot of Prizma event #25 advancing + runtime trace + DB query result.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] Pipeline-coordination lock released (`node scripts/pipeline-coordination.mjs release`).
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md written in the SPEC folder.
- [ ] M4 SESSION_CONTEXT.md top entry added.
- [ ] `grep -rn "__statusChangeTrace" modules/crm/` returns 0 hits.
- [ ] 8 pre-existing untracked files still present (untouched).

---

*End of SPEC.*
