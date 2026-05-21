# SPEC — M4_DISPATCH_PREVIEW_SUMMARY_MODE

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-21
> **Module:** 4 — CRM
> **Predecessor:** `M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21` (🔴 ABORTED WITH INCIDENT). See its INCIDENT_REPORT §3.3 for the rationale.
> **Series:** First of 3 — followed by `M4_SCE_CONSUMER_RACE_FIX` (B) + `M4_QUEUE_INSERT_ON_CONFLICT` (C).
> **Pipeline mode:** Full-Auto with mandatory Chrome MCP live verification at closure (Iron Rule 34) — on **demo under injected load**, NOT on Prizma.
> **Priority:** P0 — the operator-confirmation safety brake that must land BEFORE any other event-status fix.
> **Tenant scope:** demo only. Prizma untouched.

---

## 0. Pre-Authoring Reality Check

Confirmed 2026-05-21 by Foreman from live DB + EF + code probes:

| Check | Result |
|---|---|
| origin/main HEAD | `94f94b9` (post-revert of yesterday's Fix D) |
| Branch | develop, clean WRT this SPEC's intended files; 7 pre-existing modified + 11 untracked paths are unrelated WIP, leave alone per Daniel's directive |
| Iron Rule 31 gate | exit 0 (`All clear — 17 files scanned in 3ms`) |
| Pipeline coordination lock | claimed under `M4_EVENT_STATUS_DISPATCH_HARDENING` umbrella for the 3-SPEC series |
| automation-engine EF version | v21 (target post-SPEC: v22) |
| dispatch-queue EF version | v15 (untouched by this SPEC) |
| send-message EF version | v27 (untouched by this SPEC) |
| `crm_message_log.template_slug` | **column does not exist.** Only `template_id uuid`. preview.ts:126,131 references the missing column — error currently swallowed at preview.ts:268 catch |
| `uq_crm_message_queue_idem` | keyed on `(tenant_id, run_id, lead_id, template_slug, channel)` WHERE `run_id IS NOT NULL AND template_slug IS NOT NULL AND status IN queued/processing/sent`. Out of scope for THIS SPEC (handled by SPEC C). |
| Prizma `crm_automation_rules` event-status active count | **0** (all 10 disabled by Daniel after yesterday's incident — confirms no autonomous fire risk during this SPEC) |
| Demo `crm_automation_rules` event-status active count | **0** (12 rules total, all currently disabled — Phase 0 will re-enable ONE demo rule temporarily) |
| Demo events in `status='planning'` | **0** (Phase 0 creates a fresh demo event for the load test) |
| Demo `crm_leads` total | 28 (1 in `status='waiting'`) — Phase 0 injects ~1,200 synthetic leads to mirror Prizma scale |
| Prizma `crm_leads` total | 1,343 (718 in `status='waiting'`) — for context; this SPEC does NOT click anything on Prizma |
| Prizma event #25 (the original bug target) | `status='registration_open'` (post-incident state; left as-is, NOT reverted) |

### Runtime-Semantics Rehearsal

The bug pattern this SPEC must eliminate: TWO concurrent listeners on `previewPromise` in `crm-automation-client.js:206-247` (`probeAndCommit`). Listener A (`previewPromise.then`) silent-commits on recipients=0 or `.catch`; Listener B (`CrmConfirmSendV2.showAsync`) opens the modal on recipients≥1. The Prizma case: a 26MB/76s preview response hangs or partially errors → Listener A's `.catch` fires → silent-commit fires → status changes → SCE row → consumer enqueues → dispatch begins. Operator never saw a confirmation modal.

**Rehearsed new shape — every status-change call goes through exactly ONE listener:**

```
sequential flow:
  preview = await callEf({mode:'dispatch_preview'})       // wait for it; no race
  if preview === null OR preview.error:
    → show error toast/modal "כשל בטעינת תצוגה מקדימה — נסה שוב"
    → DO NOT commit. Status does not change. Operator must explicitly retry.
  elif preview.recipient_count_total === 0:
    → silent commit + Toast (LEGITIMATE no-op path: rules didn't fire for this transition)
  else:
    → open modal with summary counts + sample
    → ONLY operator's click on "אישור ושלח" commits. Cancel/close does not commit.
```

**Test cases mentally walked (silent-commit MUST NOT fire in any of these):**
- A. Preview EF responds 200 with summary {recipient_count_total: 1210}. Modal opens. Operator clicks Cancel. Status MUST NOT change. (Old code: silent-commit via Listener A's `.then` if recipients_by_lead happened to be empty in a malformed response — gone.)
- B. Preview EF returns 503 / network error. Modal shows error retry UI. Status MUST NOT change. (Old code: `.catch` silent-committed. Gone.)
- C. Preview EF takes 30s. Browser keeps awaiting. After 30s a client-side timeout aborts the fetch — error modal. Status MUST NOT change. (Old code: Promise.race-style timeout silent-committed. Gone.)
- D. Preview EF returns 200 with recipient_count_total=0 (e.g., changing status to "completed", no rules match). Silent commit + Toast IS allowed (UX nicer — no needless modal for benign no-op transitions).
- E. Preview EF returns 200 with recipient_count_total=1210. Operator clicks "אישור ושלח". Commit fires. Status changes. SCE row written. Consumer enqueues. SPEC B + C make the consumer + queue path safe; this SPEC's contract ends at "modal-confirm → single UPDATE".

**Why summary-mode is the right shape for the EF too:**
- 1,210 recipients × ~10 KB / RecipientView (full SMS + email body strings + 3 enrichment fields) = ~12 MB payload. JSON parse cost in the browser is non-trivial. Summary mode returns ~2 KB.
- Server-side: 3 enrichment queries (`fetchLeadMeta`, `fetchLastMessages`, `fetchAttendeeAggregates`) each scan ~1,210 lead IDs in chunks of 200 = 18 chunked PostgREST round-trips. Summary mode skips all 3 (only computes counts).
- `fetchLastMessages` is the source of the `crm_message_log.template_slug` DB error — it's the only caller of that column. Removing it from the default path auto-fixes the drift (drop the column reference entirely; `last_template_slug` was decorative in the modal, not used in any decision).
- Full-detail mode remains available behind an explicit operator opt-in (button click in the modal → second EF call with `mode='dispatch_preview', detail_level='full'`).

---

## 1. Goal

Restructure `dispatch_preview` so the default response is a small summary (counts + 5 sample recipients, no body strings, ~2 KB) and explicit operator confirmation in the modal is the ONLY commit path for status transitions with recipients > 0. Eliminate the silent-commit-on-error fallback that produced yesterday's P0 mass dispatch. Verify under demo load (~1,200 injected leads) that:
1. Status-change clicks NEVER commit without an explicit modal "אישור ושלח" click when recipients > 0.
2. Preview EF response under demo load is < 100 KB and < 2 s.
3. Status-change clicks WITH recipients=0 still silent-commit (no regression on benign transitions).
4. Preview EF errors / timeouts surface as error UI; status stays unchanged.

---

## 2. Background & Motivation

See `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/INCIDENT_REPORT.md` §2 (3 root causes) + §3.3 (this SPEC's prescription). The short story:

The original "silent fail" on Prizma was an accidental safety net. The 26 MB / 76 s preview response prevented the modal from opening, which prevented any commit, which prevented mass dispatch. Yesterday's "Fix D" timeout added to the preview promise removed that accidental safety — the timeout sentinel resolved `.then` with a falsy value, which fired Listener A's silent-commit branch. 165 messages went out to Prizma leads before the operator halt. The remaining 2,173 were re-enqueued under Daniel's direct authorization.

The root cause is design, not data: two concurrent listeners on the same promise can race, and the silent-commit listener is reachable on every error path including unwanted ones. This SPEC removes the race by making the flow sequential and removes silent-commit from every path where the operator should have seen a confirmation modal.

This SPEC is the operator-facing safety brake. Even before SPEC B (consumer race) and SPEC C (queue ON CONFLICT) land, A makes mass dispatch impossible without an explicit modal click — the same operator who would have stopped the incident yesterday.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state | On `develop`, clean | `git status --porcelain` returns only the 7 pre-existing modified + 11 untracked paths (count exactly 18) |
| 2 | Commits produced | 4–6 commits in range | `git log <START_TAG>..HEAD --oneline \| wc -l` between 4 and 6 |
| 3 | SPEC folder populated | 5 files: SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md | `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/` |
| 4 | preview.ts default response shape | New `mode='summary'` (default) returns object with keys: `mode, run_id, fired, queued, skipped, rules, channels, recipient_count_total, recipient_count_by_channel, sample_recipients` (no `recipients_by_lead`); old `recipients_by_lead` available only behind explicit `detail_level='full'` request | inspect EF source + curl payload byte count |
| 5 | Preview EF latency on demo with 1,200 injected leads | summary mode: < 2 s p95, < 100 KB payload | TEST_REPORT.md captures wall-clock + Content-Length from Chrome devtools network tab |
| 6 | Preview EF latency on demo with 1,200 injected leads, detail_level='full' | < 30 s p95 (acceptable for opt-in slow path); operator must explicitly click "Show full list" in modal to trigger | TEST_REPORT.md |
| 7 | `probeAndCommit` silent-commit removed for error / timeout / cancel paths | Source `crm-automation-client.js` — `previewPromise.then` and `.catch` no longer call `commitCallback({mode:'silent_after_probe_error'})` or call it in any non-zero-recipient branch. Only one silent path remains: `recipient_count_total === 0`. | source review by Reviewer |
| 8 | Modal cancel path | TEST_REPORT.md documents: cancel click → modal closes → `crm_events.status` UNCHANGED | DB before/after assertion |
| 9 | Modal preview-error path | TEST_REPORT.md documents: preview EF errors → error modal shows → operator clicks "ביטול" → `crm_events.status` UNCHANGED | DB before/after assertion |
| 10 | Modal confirm path | TEST_REPORT.md documents: operator clicks "אישור ושלח" → `crm_events.status` changes to target → exactly one SCE row written → exactly one consumer enqueue cycle | DB count assertions |
| 11 | Demo load-test injection | 1,200 ± 5 synthetic leads inserted on demo with sentinel marker `is_demo_load_test=true` (new column NOT introduced; use existing `notes` field with `M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21` token instead — NO DDL) | `SELECT count(*) FROM crm_leads WHERE tenant_id=demo AND notes LIKE '%M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21%'` → 1,200 ±5 |
| 12 | Demo load-test injected leads are non-dispatchable | All 1,200 injected leads carry `phone=NULL` AND `email LIKE 'm4_load_test_%@demo.opticalis.test'` (test-domain, guaranteed not in any allowlist) → dispatch-queue would mark them as `rejected_phone_not_allowed`/`email_not_allowed` even if dispatch fired | DB query |
| 13 | Demo load-test cleanup | Post-test: all 1,200 injected leads DELETEd via tenant-scoped DELETE on the sentinel predicate. Demo `crm_leads` returns to pre-test count (28). | DB count delta = 0 |
| 14 | Prizma tables bit-identical pre/post | `crm_leads`, `crm_events`, `crm_message_queue`, `crm_message_log`, `crm_status_change_events`, `crm_automation_rules` row counts on Prizma identical pre + post this SPEC | Supabase MCP SELECTs |
| 15 | Iron Rule 31 gate | exit 0 or 2 (no null-byte ERROR) at every commit boundary | `npm run verify:integrity` |
| 16 | Iron Rule 32 destructive ops declared | This SPEC's §"Destructive Operations" honored: 1,200-row demo INSERT + 1,200-row demo DELETE (both tenant-scoped on sentinel predicate). No other destructive ops. | inspect git diff + commits |
| 17 | Iron Rule 33 demo-first | All code changes tested on demo before any consideration of Prizma. This SPEC does NOT touch any Prizma table. | inspect Supabase MCP query log |
| 18 | Iron Rule 34 Chrome MCP live verification | TEST_REPORT.md contains: (a) screenshot of demo crm.html status-change flow under load (modal opens with recipient count > 1,000), (b) `window.__modalConfirmTrace` showing the exact commit branch fired (summary → modal-render → confirm-click → commit), (c) DB query confirming status changed AFTER click and NOT BEFORE | inspect TEST_REPORT.md |
| 19 | template_slug drift secondary fix | preview.ts no longer references `crm_message_log.template_slug` in the default summary path. `fetchLastMessages` deleted or moved behind `detail_level='full'`. Postgres logs show 0 new `column "template_slug" does not exist` errors during the test run. | grep + Postgres logs |
| 20 | Smoke baseline | `tests/smoke/baseline.test.mjs` 7/7 PASS post-fix | Localhost-Tester deliverable |

### Baselines (captured 2026-05-21 12:24 UTC)

| Symbol | Source | Pre-value |
|---|---|---|
| `BASE_DEMO_LEADS` | `crm_leads where tenant=demo` | 28 |
| `BASE_DEMO_LEADS_WAITING` | `crm_leads where tenant=demo and status='waiting' and is_deleted=false` | 1 |
| `BASE_DEMO_EVENTS` | `crm_events where tenant=demo and is_deleted=false` | 25 |
| `BASE_PRIZMA_LEADS` | `crm_leads where tenant=prizma` | 1,343 |
| `BASE_PRIZMA_EVENTS` | `crm_events where tenant=prizma and is_deleted=false` | 5 |
| `BASE_AE_VERSION` | automation-engine EF | 21 |
| `BASE_DQ_VERSION` | dispatch-queue EF | 15 |
| `BASE_SM_VERSION` | send-message EF | 27 |
| `BASE_DEMO_RULES_ACTIVE` | active event_status_change rules on demo | 0 |
| `BASE_PRIZMA_RULES_ACTIVE` | active event_status_change rules on prizma | 0 |

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking

- Read any file in the repo + run any read-only SQL (Level 1).
- Apply 1 EF redeploy of `automation-engine` (v21 → v22) with the modified preview.ts + new client behavior. NO migrations needed for this SPEC.
- Insert 1,200 synthetic demo leads matching §3 criterion 11 (Level 2 — DML on a tenant-scoped predicate, sentinel-marked).
- DELETE the 1,200 synthetic demo leads at end of test (Level 2 — same sentinel predicate, demo-only).
- Re-enable ONE demo rule for the live test (rule `b53f6ea5-b41a-4df3-92e7-0a64c5b10b7d`, "שינוי סטטוס: נפתחה הרשמה"), then DISABLE it after the test. Pre/post DB-snapshot of the rule's `is_active` value.
- Create ONE fresh demo event in `status='planning'` for the live test; archive it (soft-delete or status=completed) after.
- Spin up localhost via `scripts/start-local.ps1`.
- Use Chrome MCP for the demo live click + screenshot + trace dump.
- Commit and push to `develop` per §9.
- Run `verify.mjs --staged` between commits.

### What REQUIRES stopping and reporting

- Demo load injection writes any row outside the sentinel predicate → STOP, rollback, escalate.
- Demo lead injection inserts on Prizma by mistake → STOP, escalate.
- Any need to apply a DB migration (new column, new table, new policy) → STOP (out of scope; this SPEC is EF + JS only).
- Any need to redeploy `dispatch-queue` or `send-message` EF → STOP (out of scope; preview.ts lives in automation-engine only).
- Pre-existing untracked files (the 7 modified + 11 untracked at session start) accidentally staged → STOP, unstage, continue.
- Chrome MCP run shows status changing BEFORE the operator clicks "אישור ושלח" → STOP (the fix did not work; the silent-commit path is still reachable).
- Any need to click anything on Prizma's crm.html → STOP. This SPEC's live verification runs on **demo only**.
- Iron Rule 31 gate returns exit 1 → STOP.
- Post-cleanup `crm_leads where tenant=demo` count ≠ 28 → STOP (synthetic leads leaked).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- Demo Postgres logs during the test show ≥1 new `column "template_slug" does not exist` error after the EF redeploy → the drift is not fully removed; STOP and re-audit the preview.ts changes.
- Synthetic lead INSERTs return any row count other than 1,200 ± 5 (e.g., 600, 2400) → STOP and audit the injection script before any further work.
- Preview EF response size in summary mode exceeds 200 KB on the 1,200-lead audience → STOP. Summary is supposed to be tiny; if it's not, the summary path is leaking rows.
- Demo crm_message_queue gets any new INSERTs during the test that are NOT tied to the test's confirm-click → STOP, the SCE consumer may have fired unexpectedly.
- Any single chrome-devtools script execution returns an error → STOP, take a screenshot, escalate.

---

## 6. Rollback Plan

- **Pre-write master safety tag:** `git tag pre-m4-dispatch-preview-summary-mode-2026-05-21 <START_COMMIT>` BEFORE any code change. Push to origin/develop.
- **Master safety baseline:** `develop` HEAD = `94f94b9` (post-revert of yesterday's instrumentation + Fix D).
- **Rollback path A — EF only:** `git checkout <tag> -- supabase/functions/automation-engine/preview.ts modules/crm/crm-automation-client.js modules/crm/crm-confirm-send-v2.js`, then `mcp__claude_ai_Supabase__deploy_edge_function` with the previous v21 source restored. Commit the revert with `revert(m4): ...` body. NEVER `git reset --hard` / `git push --force` without Daniel's go-ahead.
- **Rollback path B — synthetic data:** `DELETE FROM crm_leads WHERE tenant_id=demo AND notes LIKE '%M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21%'` — fully tenant-scoped on sentinel predicate. Returns demo to pre-test state.
- **Rollback path C — rule re-enable:** if the test re-enabled demo rule `b53f6ea5-...` and forgot to disable, follow up with `UPDATE crm_automation_rules SET is_active=false WHERE id='b53f6ea5-37db-4c10-b6ab-5db1cf598226' AND tenant_id=demo`.
- **Rollback path D — demo event:** if the live-test event was left in `registration_open` / advanced state, archive it via `UPDATE crm_events SET is_deleted=true WHERE id=<test_event_id> AND tenant_id=demo`.

---

## Destructive Operations

The following destructive ops are pre-authorized by this SPEC. Any operation outside this list halts execution.

1. **DML mass-INSERT on `crm_leads` for the demo tenant** (1,200 rows ± 5, tenant-scoped to demo, sentinel marker on `notes` field) — Phase 0 load injection.
2. **DML mass-DELETE on `crm_leads` for the demo tenant** (~1,200 rows, tenant-scoped, predicate-bound to the sentinel marker `notes LIKE '%M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21%'` AND `tenant_id=<demo_uuid>`) — Phase 4 cleanup. This is a "DML mass-delete WITH a tenant_id-scoped WHERE clause" — Iron Rule 32's prohibited shape is mass-delete WITHOUT tenant scope, which is NOT what this is.
3. **DML single-row UPDATE on `crm_automation_rules` (demo only)** — temporarily flip ONE rule (`b53f6ea5-...`) `is_active=false → true → false`. Pre/post identical net state.
4. **DML single-row UPDATE on `crm_events` (demo only)** — the live test click changes one demo event's status. Phase 4 cleanup may archive it via `is_deleted=true`.
5. **Edge Function redeploy:** `automation-engine` v21 → v22 with modified preview.ts. Rollback path A documented above.

NONE of the following are authorized: `git reset --hard`, `git push --force`, `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, any DML mass-delete without tenant scope, any modification of `main` branch, any `--no-verify` bypass, any deletion of governance files (CLAUDE.md, SKILL.md, FOREMAN_REVIEW_TEMPLATE.md), any file deletes on the M4 surface, any redeploy of `dispatch-queue` / `send-message` / any other EF.

---

## 7. Out of Scope (explicit)

- **SPEC B + C territory.** The SCE consumer race fix (FOR UPDATE SKIP LOCKED) and the queue ON CONFLICT fix are separate SPECs. THIS SPEC does NOT touch `consumer.ts`, `dispatch.ts`, `queue-send.ts`, or any DB migration.
- **The 8 pre-existing untracked + 7 pre-existing modified files** (campaign briefs, skill SKILL.md edits, decision logs, regopen_email_preview.html, scripts/tmp-mint-prizma-jwt.mjs, dev-server.log) — left in place exactly as found.
- **Prizma data.** Zero writes. Zero clicks on Prizma crm.html. Zero status changes on any Prizma event. Verification runs on **demo under load** only.
- **The 12 demo rules' resting state.** They are currently all `is_active=false` (Daniel's post-incident state). This SPEC re-enables ONE for the duration of the live click test, then restores. Net delta = 0.
- **Other status-change call sites (lead_status_change, attendee_status_change).** They share `probeAndCommit` so they automatically inherit the safer flow — but this SPEC's verification path tests ONLY the event-status path. Verifying lead + attendee paths is a follow-up FINDINGS item.
- **`send-message` body validation** (`scanForUnsubstitutedPlaceholders` etc.). Untouched. Lives in send-message EF, not preview path.
- **Merge to main.** This SPEC closes on `develop`. Daniel's manual PR is the only path to main.

---

## 8. Expected Final State

### New files
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/SPEC.md` (this file)
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/FINDINGS.md`
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/TEST_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/FOREMAN_REVIEW.md`
- `scripts/inject-demo-load-test-leads.mjs` (Phase 0 helper; ~80 lines; idempotent; sentinel-marked; demo-only with hard assertion `tenant_slug === 'demo'`)
- `scripts/cleanup-demo-load-test-leads.mjs` (Phase 4 helper; tenant + sentinel-predicate bound delete)

### Modified files
- `supabase/functions/automation-engine/preview.ts` — refactored: new `PreviewInput.detail_level?: 'summary' | 'full'` (default `'summary'`); new `PreviewResultSummary` and `PreviewResultFull` types; default path skips `fetchLastMessages` + `fetchAttendeeAggregates` + recipients_by_lead body strings; full path retains all 3 enrichments + bodies. The `crm_message_log.template_slug` SELECT is removed (decorative — not gated on `detail_level='full'`; just deleted entirely with a code comment pointing at this SPEC).
- `modules/crm/crm-automation-client.js` — `probeAndCommit` rewritten as sequential await (no races). New shape:
  - `const preview = await callEf({...mode:'dispatch_preview'})`.
  - If `!preview || preview === null` → show error modal with retry/cancel; commit ONLY if user clicks retry → preview-success path. Cancel → no commit.
  - If `preview.recipient_count_total === 0` (NEW field; legacy `recipients_by_lead` falsy/zero-length also accepted for graceful EF-version transition) → silent commit + Toast.
  - If `preview.recipient_count_total > 0` → open modal hydrated from summary. Modal calls back with `{action:'confirm'}` → commit; `{action:'cancel'}` → no commit.
  - The dual `.then`/`.catch` listener pattern is GONE.
- `modules/crm/crm-confirm-send-v2.js` — `showAsync` becomes sequential too: `const pv = await previewPromise`; remove the parallel-listener machinery; new fields: handle `pv.recipient_count_total` + `pv.sample_recipients` (show in summary view); add "Show full list" button that fires `callEf({mode:'dispatch_preview', detail_level:'full'})` on demand and re-renders with full recipient table. Operator deselection only available in full view. Default view shows "1,210 נמענים, מהם 1,126 SMS + 1,125 אימייל. דוגמה ל-5 הראשונים: ... [Show full list]" and the same "אישור ושלח" / "ביטול" buttons.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top entry summarizing this SPEC's closure.

### DB state (demo only)
- During Phase 0: 1,200 synthetic leads inserted with sentinel marker. ONE demo rule re-enabled. ONE fresh demo event in `status='planning'`.
- During Phase 3 (live test): The fresh demo event's status changes from `planning` → `registration_open` upon modal confirm.
- During Phase 4: 1,200 synthetic leads deleted. Rule re-disabled. Demo event archived (`is_deleted=true`). Net delta = 0 from pre-test state (the 28-lead, 12-disabled-rule, 25-event baseline restored).

### DB state (Prizma)
- ZERO writes. Every Prizma table count + hash bit-identical pre/post (criterion 14).

### Docs updated
- M4 SESSION_CONTEXT.md (top entry).
- MASTER_ROADMAP.md NOT required (no phase boundary).
- docs/GLOBAL_MAP.md / GLOBAL_SCHEMA.sql NOT required (no new DB objects, no new global functions; preview.ts refactor is an internal-shape change).
- M4 MODULE_MAP.md NOT required (no new files beyond the 2 throwaway scripts which DON'T belong in MODULE_MAP since they're test helpers, not module code).
- M4 CHANGELOG.md: brief one-line entry encouraged.

---

## 9. Commit Plan

The Executor commits in this exact order. Each commit's body cites Iron Rule 31 gate result. Selective `git add <file>` by filename in every commit — never `git add -A`.

- **Commit 1** — `docs(m4): commit M4_DISPATCH_PREVIEW_SUMMARY_MODE SPEC.md + sibling SPEC stubs for B+C`
  - Files added: this SPEC.md + `M4_SCE_CONSUMER_RACE_FIX/SPEC.md` + `M4_QUEUE_INSERT_ON_CONFLICT/SPEC.md` (all 3 authored upfront, dispatched serially).
- **Commit 2** — `feat(m4): demo load-test scripts (inject + cleanup) for dispatch-preview verification`
  - Files added: `scripts/inject-demo-load-test-leads.mjs` + `scripts/cleanup-demo-load-test-leads.mjs`.
  - Both scripts have a hardcoded `assert(tenant_slug === 'demo')` guard at the top — refuse to run on any other tenant.
- **Commit 3** — `feat(m4): automation-engine preview.ts summary-mode (default) + full-mode opt-in (v22)`
  - Files modified: `supabase/functions/automation-engine/preview.ts`.
  - Commit body cites: removed `fetchLastMessages` + `fetchAttendeeAggregates` from default path (template_slug drift auto-resolved); new `detail_level` input param; new `PreviewResultSummary` shape.
  - The redeploy of automation-engine v21 → v22 happens via Supabase MCP `deploy_edge_function` between this commit and Commit 4 (deploy is a side-effect, not a separate commit).
- **Commit 4** — `feat(m4): client-side probeAndCommit sequential flow + summary-mode modal`
  - Files modified: `modules/crm/crm-automation-client.js` + `modules/crm/crm-confirm-send-v2.js`.
  - Commit body cites: silent-commit path narrowed to `recipient_count_total === 0` only; preview-error/timeout/cancel all leave status unchanged.
- **Commit 5** — `docs(spec): close M4_DISPATCH_PREVIEW_SUMMARY_MODE — EXECUTION_REPORT + FINDINGS + TEST_REPORT + FOREMAN_REVIEW`
  - Combined doc-close commit. Includes M4 SESSION_CONTEXT top entry.
  - May split into 5a/5b/5c if Pipeline preference dictates; range 4-6 in Criterion 2.

---

## 10. Phase 0 — Load Injection Plan (the critical addition)

This is the part the prior SPEC missed. Demo's 4 leads cannot exercise the bug; Prizma's 1,210 can but we cannot click on Prizma. So: inject 1,200 synthetic leads on demo, all marked with a sentinel, all guaranteed non-dispatchable, then verify the fix under that load.

### Step 0.1 — Capture demo baseline
```sql
SELECT count(*) FROM crm_leads WHERE tenant_id=<demo>;                 -- expected: 28
SELECT count(*) FROM crm_events WHERE tenant_id=<demo> AND is_deleted=false;  -- expected: 25
SELECT id, name, is_active FROM crm_automation_rules
  WHERE tenant_id=<demo> AND trigger_entity='event' ORDER BY name;     -- all 12 inactive
```
Pin these as PRE-snapshot values in EXECUTION_REPORT.md §2.

### Step 0.2 — Inject 1,200 synthetic leads (via `scripts/inject-demo-load-test-leads.mjs`)

Each lead:
```js
{
  tenant_id: '<demo_uuid>',
  full_name: `Load Test Lead ${i.toString().padStart(4,'0')}`,
  phone: null,                                          // unphone — dispatch-queue path naturally rejects
  email: `m4_load_test_${i.toString().padStart(4,'0')}@demo.opticalis.test`,
  status: 'waiting',                                    // matches rule's recipient filter
  notes: 'M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21',    // sentinel
  is_deleted: false,
  language: 'he',
}
```

Insert in chunks of 200 (PostgREST limit). Verify post-insert count via `SELECT count(*) WHERE notes='M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21'` returns 1,200 ±5 (per §3 criterion 11).

### Step 0.3 — Re-enable ONE demo rule
```sql
UPDATE crm_automation_rules SET is_active=true
  WHERE id='b53f6ea5-b41a-4df3-92e7-0a64c5b10b7d' AND tenant_id=<demo>;
```
This is the demo's "שינוי סטטוס: נפתחה הרשמה" rule. It mirrors the Prizma rule whose firing caused the incident — same template_slug, same channel set, same recipient_type. Pin the pre-rule's `is_active` value so Phase 4 can restore.

### Step 0.4 — Create fresh demo event in `planning`
```sql
INSERT INTO crm_events (tenant_id, campaign_id, event_number, name, event_date, ...)
VALUES (<demo>, <demo's default campaign>, <next_seq>, 'M4 Load Test Event 2026-05-21', '2026-06-15', ...);
```
Use `next_crm_event_number` RPC for `event_number`. Record the returned event_id for the live click.

### Step 0.5 — Snapshot Postgres logs starting timestamp

Record `SELECT NOW()` so post-test we can filter Postgres logs for the 30-min window of the test and assert: zero new `column "template_slug" does not exist` errors after EF v22 deploy.

---

## 11. Phase 1 — Code Changes

### 1.1 — preview.ts refactor

**New input shape:**
```ts
export interface PreviewInput {
  tenantId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  detailLevel?: 'summary' | 'full';   // default 'summary'
}
```

**New result shapes (union):**
```ts
export interface PreviewResultSummary {
  mode: 'summary';
  run_id: string | null;
  fired: number;
  queued: number;
  skipped: number;
  rules: Array<{ rule_id; rule_name; template_slug; channels; recipient_count }>;
  channels: string[];
  recipient_count_total: number;
  recipient_count_by_channel: { sms?: number; email?: number; };
  sample_recipients: Array<{ lead_id; full_name; phone; email }>; // first 5, no bodies
}

export interface PreviewResultFull extends Omit<PreviewResultSummary, 'mode'> {
  mode: 'full';
  recipients_by_lead: RecipientView[];   // existing shape, full bodies
}

export type PreviewResult = PreviewResultSummary | PreviewResultFull;
```

**Summary path:** skip `fetchLastMessages` + `fetchAttendeeAggregates` entirely. Skip the per-recipient body assembly loop (lines 222-244 in current code). Just count plan items grouped by `channel` for the by-channel totals. Take first 5 plan items' lead identities for the sample (preserving sort by `full_name` for determinism).

**Full path:** original behavior, but the `fetchLastMessages` call is REMOVED entirely (the SELECT against `crm_message_log.template_slug` errors silently today). `last_message_sent_at` and `last_template_slug` fields are dropped from the `RecipientView` type. The modal's "Last message: ..." decorative line is removed.

**Wire to caller:** `index.ts` reads `body.detail_level` (default 'summary') and forwards to `previewDispatch(db, {tenantId, triggerType, triggerData, detailLevel})`.

### 1.2 — crm-automation-client.js `probeAndCommit` rewrite

```js
async function probeAndCommit(triggerType, triggerData, commitCallback, opts) {
  opts = opts || {};
  var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
  if (!tid || !triggerType || typeof commitCallback !== 'function') {
    // No tenant or invalid args: legitimate fallback (rare; rules can't fire without tenant)
    try { var d0 = await commitCallback({ mode: 'no_tenant_fallback' });
          return { committed: true, mode: 'no_tenant_fallback', data: d0 }; }
    catch (e0) { return { committed: false, mode: 'commit_failed', error: e0 }; }
  }
  if (!window.CrmConfirmSendV2 || typeof CrmConfirmSendV2.showAsync !== 'function') {
    // No modal lib loaded: SECURE fallback = REFUSE to commit + log + toast error.
    // Previously this returned a silent-commit success — flipped to refusal per
    // M4_DISPATCH_PREVIEW_SUMMARY_MODE Iron Rule alignment.
    if (window.Toast) Toast.error('שגיאה: שלב אישור לא נטען. רענן את הדף ונסה שוב.');
    return { committed: false, mode: 'no_modal_refused' };
  }

  // Sequential await. NO race. NO concurrent listeners.
  var preview;
  try {
    preview = await callEf({
      tenant_id: tid, trigger_type: triggerType, trigger_data: triggerData || {},
      mode: 'dispatch_preview'
      // detail_level omitted = 'summary' default on server
    });
  } catch (e) {
    if (window.Toast) Toast.error('כשל בטעינת תצוגה מקדימה. נסה שוב.');
    return { committed: false, mode: 'preview_failed', error: e };
  }
  if (!preview) {
    if (window.Toast) Toast.error('כשל בטעינת תצוגה מקדימה. נסה שוב.');
    return { committed: false, mode: 'preview_null' };
  }

  // SUMMARY-aware count check: prefer new field, fall back to legacy array length.
  var total = (typeof preview.recipient_count_total === 'number')
    ? preview.recipient_count_total
    : (Array.isArray(preview.recipients_by_lead) ? preview.recipients_by_lead.length : 0);

  if (total === 0) {
    // ONLY silent-commit path that remains: zero rules fired for this transition.
    try { var d1 = await commitCallback({ mode: 'silent_zero_recipients', preview: preview });
          if (window.Toast && !opts.suppressSilentToast) Toast.success(opts.silentToast || 'סטטוס עודכן');
          return { committed: true, mode: 'silent_zero_recipients', data: d1 }; }
    catch (e1) { return { committed: false, mode: 'commit_failed', error: e1 }; }
  }

  // recipients > 0 → modal MANDATORY. Operator confirm is the only commit path.
  return await new Promise(function (resolve) {
    var resolved = false;
    var settle = function (v) { if (!resolved) { resolved = true; resolve(v); } };
    CrmConfirmSendV2.showAsync(Promise.resolve(preview), async function (choice, ctx) {
      if (!choice || !choice.dispatch) {
        settle({ committed: false, mode: 'no_notify_choice' });
        return { sent: 0, failed: 0, rejected: 0 };
      }
      try {
        var excludeLeadIds = (ctx && Array.isArray(ctx.excludeLeadIds)) ? ctx.excludeLeadIds : [];
        var recipientSubset = (ctx && Array.isArray(ctx.recipientSubset)) ? ctx.recipientSubset : [];
        var data = await commitCallback({
          mode: 'confirmed',
          preview: (ctx && ctx.previewResponse) || preview,
          excludeLeadIds: excludeLeadIds, recipientSubset: recipientSubset
        });
        var runId = preview.run_id;
        settle({ committed: true, mode: 'confirmed', data: data });
        var planned = total;
        var count = Math.max(0, planned - excludeLeadIds.length);
        return { run_id: runId, queued: count, sent: 0, failed: 0, rejected: 0 };
      } catch (e) {
        settle({ committed: false, mode: 'commit_failed', error: e });
        return { sent: 0, failed: 0, rejected: 0 };
      }
    }, {
      suppressEmptyModal: false,             // we never enter this branch with empty
      hideCommitWithoutNotify: opts.hideCommitWithoutNotify !== false,
      onCancel: function () { settle({ committed: false, mode: 'cancelled' }); }
    });
  });
}
```

### 1.3 — crm-confirm-send-v2.js `showAsync` simplification

- Remove the parallel-listener machinery. `showAsync(previewPromiseOrValue, onChoice, opts)` now expects `previewPromiseOrValue` to already be resolved by the caller (the new `probeAndCommit` always passes `Promise.resolve(preview)`). Keep promise support for backward-compat with the v1 `evaluate` path.
- Add summary-vs-full rendering: if `preview.mode === 'summary'`, show count + sample + "Show full list" button. If `preview.mode === 'full'` OR no `mode` field (legacy v21 EF response), show the existing row-by-row table.
- "Show full list" button click → second `callEf({mode:'dispatch_preview', detail_level:'full'})` → on resolve, swap `_state.previewResponse` + rerender.
- Remove `last_template_slug` + `last_message_sent_at` from any per-row decoration.

### 1.4 — render path (crm-confirm-send-v2-render.js)

Add summary-mode rendering:
- Big numeric count: "X נמענים (Y SMS / Z אימייל)"
- Sample table: 5 rows showing name, phone, email
- "📋 הצג רשימה מלאה" button (only renders in summary mode)

Existing full-mode rendering stays. Both should re-use the existing footer (test send, approve, cancel buttons).

---

## 12. Phase 2 — Live Test Run (Chrome MCP, demo only)

### 2.1 — Pre-test snapshot
- Capture `crm_events.status` for the test event_id (expected: `'planning'`).
- Capture `crm_message_queue` count for tenant=demo (PRE).
- Capture `crm_status_change_events` count for tenant=demo where consumed_at IS NULL (PRE).
- Capture `crm_message_log` count for tenant=demo (PRE).

### 2.2 — Insert instrumentation hook (in browser only)
Run via chrome-devtools `evaluate_script`:
```js
window.__modalConfirmTrace = window.__modalConfirmTrace || [];
const orig = window.CrmAutomationClient.probeAndCommit;
window.CrmAutomationClient.probeAndCommit = async function(...args) {
  __modalConfirmTrace.push({step:'probeAndCommit:enter', t:Date.now(), triggerType:args[0]});
  const r = await orig.apply(this, args);
  __modalConfirmTrace.push({step:'probeAndCommit:exit', t:Date.now(), mode:r&&r.mode, committed:r&&r.committed});
  return r;
};
```
This is BROWSER-ONLY (no source file edit, no commit). Runs in chrome-devtools session. The trace dump goes into TEST_REPORT.md.

### 2.3 — Drive the click
- Navigate to `http://localhost:3000/crm.html?t=demo`.
- Login via PIN (12345).
- Open the load-test event from §0.4.
- Click "שנה סטטוס" → click "הרשמה פתוחה".

### 2.4 — Observe + assert
- Within 3 seconds: modal should open showing "1,200 נמענים (1,200 אימייל)" with sample of 5.
- DB: `crm_events.status` should STILL be `'planning'` (modal opened, no commit yet).
- Operator clicks "ביטול" → modal closes → DB: `crm_events.status` STILL `'planning'`. → **Assert criterion 8.**
- Re-trigger: click "שנה סטטוס" → "הרשמה פתוחה" again. Modal opens.
- This time click "אישור ושלח".
- Within 5 seconds: status changes to `registration_open`, modal closes, SCE row INSERT visible in `crm_status_change_events`. **Assert criterion 10.**

### 2.5 — Preview-error test
- Disable the EF temporarily (Supabase pause? not easy. Alternative: inject a JS hook that makes `callEf` reject for one call):
```js
const origCallEf = window.sb.functions.invoke;
let _failNext = true;
window.sb.functions.invoke = function(name, opts) {
  if (_failNext && name === 'automation-engine' && opts.body.mode === 'dispatch_preview') {
    _failNext = false;
    return Promise.reject(new Error('synthetic preview failure'));
  }
  return origCallEf.apply(this, arguments);
};
```
- Reset demo event back to `planning`.
- Click "שנה סטטוס" → "הרשמה פתוחה".
- Should see error toast "כשל בטעינת תצוגה מקדימה" or error modal.
- DB: `crm_events.status` STILL `'planning'`. → **Assert criterion 9.**

### 2.6 — Cleanup browser hooks
Restore `sb.functions.invoke`. Restore `CrmAutomationClient.probeAndCommit`. Dump `__modalConfirmTrace` for the TEST_REPORT.

---

## 13. Phase 4 — Cleanup (Demo)

### 4.1 — DELETE synthetic leads
```sql
DELETE FROM crm_leads
WHERE tenant_id = <demo_uuid>
  AND notes LIKE '%M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21%'
RETURNING id;
```
Expected: 1,200 ±5 rows returned.

Post-DELETE count assertion: `SELECT count(*) FROM crm_leads WHERE tenant_id=<demo>` = 28 (baseline).

### 4.2 — Disable demo rule
```sql
UPDATE crm_automation_rules SET is_active=false
WHERE id='b53f6ea5-b41a-4df3-92e7-0a64c5b10b7d' AND tenant_id=<demo>;
```

### 4.3 — Archive test event
```sql
UPDATE crm_events SET is_deleted=true
WHERE id=<test_event_id> AND tenant_id=<demo>;
```

### 4.4 — Confirm Prizma untouched
```sql
SELECT 'leads' AS t, count(*) FROM crm_leads WHERE tenant_id=<prizma>
UNION ALL SELECT 'events', count(*) FROM crm_events WHERE tenant_id=<prizma> AND is_deleted=false
UNION ALL SELECT 'queue', count(*) FROM crm_message_queue WHERE tenant_id=<prizma>
UNION ALL SELECT 'log', count(*) FROM crm_message_log WHERE tenant_id=<prizma>
UNION ALL SELECT 'sce', count(*) FROM crm_status_change_events WHERE tenant_id=<prizma>
UNION ALL SELECT 'rules', count(*) FROM crm_automation_rules WHERE tenant_id=<prizma>;
```
Every value identical to the corresponding pre-test value. Document in TEST_REPORT.md.

---

## 14. Lessons Already Incorporated

- FROM `M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/INCIDENT_REPORT.md` §3.4 "Iron-Rule-32-style pre-flight for live verification steps" → **APPLIED.** §3 criterion 18 requires the live click happens on demo only; §4 explicitly STOP-triggers on any Prizma click; §10 §13 cleanup keeps net delta zero on demo.
- FROM `feedback_probe_biggest_production_tenant.md` (auto-memory) → **APPLIED through inversion.** That memory says "live verification must run on Prizma scale". We honor the SCALE requirement but not the TENANT requirement — by injecting 1,200 synthetic leads on demo, we get Prizma scale on a tenant we are allowed to click on. The memory's spirit (don't trust demo's 4 leads) is preserved.
- FROM `feedback_test_data_phones.md` (auto-memory) "demo seeds may only use Daniel's two personal phones" → **APPLIED.** Synthetic leads have `phone=NULL`, NOT real phones. Even if dispatch fires by accident, SMS path skips them (no phone). Email path uses `@demo.opticalis.test` non-allowlisted domain — dispatch-queue rejects with `email_not_allowed` failure class.
- FROM `feedback_clicks_are_not_actions.md` (auto-memory) → **APPLIED.** This SPEC's success criteria measure DB state (`crm_events.status`, queue counts), not click events. The Chrome MCP click is the trigger; the assertion is on the resulting DB rows.
- FROM `feedback_vfv_must_use_not_just_inspect.md` (auto-memory) → **APPLIED.** §12 Phase 2 actually clicks the dropdown item (uses the surface), screenshots the modal in the loaded state, asserts on the post-click DB state. Not just "tab appears".
- FROM `feedback_dont_add_unrequested_features.md` (auto-memory) → **APPLIED.** §7 explicitly out-of-scopes consumer.ts / dispatch.ts / queue-send.ts (SPECs B and C) and lead/attendee status-change verification (a follow-up FINDINGS line).
- FROM `M4_DUAL_PATH_CLEAN_FIX_2026_05_19/FOREMAN_REVIEW.md` "Iron Rule 34 Chrome MCP live verification mandatory for UI-touching SPECs" → **APPLIED** in §3 criterion 18 + §12.
- FROM `M4_DEMO_STATIC_LINKS_BACKFILL/FOREMAN_REVIEW.md` (yesterday) Author Proposal "SPEC Steps should declare backup script paths" → **APPLIED** via §10 + §13 explicit cleanup script paths.

### Author-side cross-reference sweep (SPEC_TEMPLATE §1.5)

- Grepped new names (`PreviewResultSummary`, `PreviewResultFull`, `detail_level`, `recipient_count_total`, `recipient_count_by_channel`, `sample_recipients`, `M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21`) in `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `modules/*/docs/MODULE_MAP.md`, `modules/crm/**/*.js`, `supabase/functions/automation-engine/*.ts` — 0 collisions.
- New scripts `scripts/inject-demo-load-test-leads.mjs` + `scripts/cleanup-demo-load-test-leads.mjs` — `ls scripts/` shows no existing files of those names.
- No new DB objects (tables, columns, views, RPCs, indexes, policies) introduced. Rule 21 (No Duplicates) satisfied.

---

## 15. Dependencies / Preconditions

- Localhost-Tester has Chrome MCP + `scripts/start-local.ps1` working.
- Supabase MCP available for live DB probes + EF deploys (already verified — list_edge_functions ran clean at Foreman pre-flight).
- Pipeline coordination lock at `_archive/pipeline-sessions/2026-05-21T12-24-25-134Z_M4_EVENT_STATUS_DISPATCH_HARDENING_pid-16652-fc81a3bd.lock` (claimed). Executor heartbeats every 5 min.
- This Claude Code session is Desktop (Windows), NOT Cowork VM (Cowork's FUSE-stale state is what initially missed the prior bug; running here keeps git healthy).
- Iron Rule 31 gate exit 0 (already verified).
- No other concurrent session may touch `modules/crm/crm-automation-client.js`, `modules/crm/crm-confirm-send-v2.js`, `supabase/functions/automation-engine/preview.ts` while this SPEC runs.

---

## 16. Pre-Merge Checklist (Executor verifies before requesting Reviewer + Tester pass)

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] Iron Rule 31: `npm run verify:integrity` exit 0 or 2 at every commit.
- [ ] Iron Rule 32: this SPEC's Destructive Operations declaration honored. Hook passes on every commit.
- [ ] Iron Rule 33: every code change verified on demo first; zero Prizma writes.
- [ ] Iron Rule 34: TEST_REPORT.md contains Chrome MCP screenshot, runtime trace, DB before/after queries proving status DID NOT change before operator's confirm click.
- [ ] `git status --short` returns only the 18 pre-existing paths from session start (7 modified + 11 untracked).
- [ ] HEAD pushed to `origin/develop`.
- [ ] Pipeline-coordination lock heartbeated (or released if this is the last SPEC of the series).
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md all present in SPEC folder.
- [ ] M4 SESSION_CONTEXT.md top entry added.
- [ ] Demo `crm_leads` count post-cleanup = 28 (baseline).
- [ ] Demo rule `b53f6ea5-...` `is_active=false` post-cleanup.
- [ ] Demo test event archived (`is_deleted=true`).
- [ ] Prizma all 6 verification queries from §13.4 byte-identical pre/post.

---

*End of SPEC.*
