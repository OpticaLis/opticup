# SPEC — M4_DISPATCH_PREVIEW_LAZY_ROWS

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-21 (rev 2 — replaces the original `M4_DISPATCH_PREVIEW_SUMMARY_MODE` design)
> **Module:** 4 — CRM
> **Predecessor:** `M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21` (🔴 ABORTED WITH INCIDENT). See its INCIDENT_REPORT §3.3 for the original prescription, this SPEC for the upgraded design.
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
| Branch | develop, clean WRT this SPEC's intended files |
| Iron Rule 31 gate | exit 0 |
| Pipeline coordination lock | claimed under `M4_EVENT_STATUS_DISPATCH_HARDENING` umbrella for the 3-SPEC series; released between SPECs to allow per-SPEC lock claim |
| automation-engine EF version | v21 (target post-SPEC: v22) |
| dispatch-queue EF version | v15 (untouched by this SPEC) |
| send-message EF version | v27 (untouched by this SPEC) |
| `crm_message_log.template_slug` | **column does not exist.** Only `template_id uuid`. preview.ts:126,131 references the missing column — error currently swallowed at preview.ts:268 catch. This SPEC deletes the offending SELECT entirely. |
| Existing per-row expand UI in V2 modal | YES — `crm-confirm-send-v2.js:90-99` already has expand toggle. The body data is currently pre-loaded; this SPEC only defers body fetch, the UI shell stays. |
| Existing enrichment cost on 1,210 leads | `fetchLeadMeta` cheap (~50 ms); `fetchAttendeeAggregates` cheap (~100 ms); `fetchLastMessages` THE PROBLEM — references missing column + is decorative-only → delete. |
| Existing body-composition cost on 1,210 leads × 2 channels | the ~26 MB / 76 s pathological case. The 2,420 template substitutions are the bulk of it; resolving recipients themselves is fast. |
| Prizma `crm_automation_rules` event-status active count | **0** (all 10 disabled by Daniel after yesterday's incident — no autonomous-fire risk) |
| Demo `crm_automation_rules` event-status active count | **0** (12 rules total, all disabled) — Phase 0 re-enables ONE demo rule temporarily |
| Demo events in `status='planning'` | **0** — Phase 0 creates a fresh demo event |
| Demo `crm_leads` total | 28 (1 waiting) — Phase 0 injects 1,200 synthetic, sentinel-marked, non-allowlisted to mirror Prizma scale |
| Prizma `crm_leads` total | 1,343 (718 waiting) — context only; ZERO Prizma writes by this SPEC |
| Prizma event #25 (the original bug target) | `status='registration_open'` post-incident; left as-is |
| Load scripts ready | `scripts/inject-demo-load-test-leads.mjs` + `scripts/cleanup-demo-load-test-leads.mjs` committed at `5912489`. utm_campaign sentinel `M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21` |

### Runtime-Semantics Rehearsal — lazy-per-row design

**The bug pattern to eliminate** (carry-over from rev 1): TWO concurrent listeners on `previewPromise` in `crm-automation-client.js:206-247` (`probeAndCommit`). Listener A silent-commits on recipients=0 / `.catch`; Listener B opens the modal on recipients≥1. The Prizma 26 MB / 76 s preview hung both. Yesterday's "Fix D" timeout caused Listener A to silent-commit on the synthetic empty payload → mass dispatch.

**The new SHAPE (lazy rows, NOT summary):**

```
sequential flow on status-change click:
  preview = await callEf({mode:'dispatch_preview'})    // fast — no body composition
  if preview === null OR preview.error:
    → show error toast/modal "כשל בטעינת תצוגה מקדימה"; status unchanged.
  elif preview.recipient_count_total === 0:
    → silent commit + Toast (LEGITIMATE no-op path — no rules fired)
  else:
    → open modal hydrated with: counts header + FULL recipient list rendered as
      a table (name, phone, email, chip-driving fields).  Per-row "body preview"
      cell is EMPTY initially.
    → operator may filter, deselect, click into any row to fetch + render that ONE
      recipient's composed body (separate EF call per row click).
    → operator clicks "אישור ושלח" → commit fires. Status changes.
    → operator clicks "ביטול" → no commit. Status unchanged.
```

**Open-time cost is O(counts + list metadata), never O(bodies).**
- Counts: cheap aggregate over plan items (counted, not body-rendered).
- List metadata per recipient: `lead_id, full_name, phone, email, created_at, prior_active_attendee_count, attended_event_count, rule_id, channel`. ZERO body strings.
- 1,210 recipients × ~250 bytes each = ~300 KB payload. Sub-second.
- Compared to current 26 MB / 76 s pathology: 100× smaller, ~80× faster.

**Per-row cost is O(1).**
- Single click → 1 EF call → fetch 1 template + 1 substitute → 1 body returned.
- < 500 ms per click target.
- No batching, no caching client-side beyond modal lifetime. Click row 5, click row 7 — 2 EF calls.

**Why this beats summary-mode (Daniel's reasoning, adopted):**
- The operator NEEDS the full recipient list visible to filter and deselect. Summary-mode forced an opt-in "Show full list" that re-introduced the 26 MB problem.
- Per-row body preview is rare in practice — operator typically spot-checks 3-5 of 1,210. Building all 2,420 bodies up-front is wasted compute.
- Scales linearly with operator clicks, not with audience size. 1,210 audience or 100,000 audience — open-time cost is the same metadata-only query.
- Filter/deselect operates on metadata, never on bodies. Already true in the existing V2 modal codebase; rev 2 just removes the body-load that was attached.

**Test cases mentally walked (silent-commit MUST NOT fire in any of these):**
- A. Open modal under load → operator clicks Cancel. Status unchanged. (Listener-A race gone — no `.then` silent-commit path remains.)
- B. Preview EF returns 503 → error modal shown. Status unchanged.
- C. Preview EF takes >30 s → client-side abort fires → error modal. Status unchanged.
- D. Preview returns `recipient_count_total === 0` → silent commit + Toast. (Allowed — no rules fired.)
- E. Preview returns `recipient_count_total > 0` → modal opens with metadata list. Operator clicks confirm. Commit. Status changes.
- F. Operator clicks one row → EF call fires for that recipient's body → body renders inline. Operator clicks Cancel. Status unchanged. The body-fetch click never commits.
- G. Per-row body EF call fails → row shows "Failed to load preview, click to retry" inline. Other rows still clickable. Modal stays open. Status unchanged.
- H. Operator clicks 10 rows in quick succession → 10 parallel EF calls. Each row independently resolves. (Acceptable parallelism — body-build is cheap per-call.)

---

## 1. Goal

Restructure `dispatch_preview` so the default response is fast metadata-only (counts + recipient list with name/phone/email + chip-driver fields, NO message bodies) and per-recipient bodies are fetched lazily, one at a time, ONLY when the operator clicks into a specific row. Eliminate the silent-commit-on-error fallback that produced yesterday's P0 mass dispatch — operator confirmation in the modal is the only commit path whenever recipients > 0.

Verify under demo load (1,200 injected non-allowlisted leads) that:
1. Modal opens in < 1 s with the full 1,200-row list and accurate channel counts.
2. A single per-row click resolves a composed body in < 500 ms.
3. Status-change clicks NEVER commit without an explicit modal "אישור ושלח" click when recipients > 0.
4. Status-change clicks WITH recipients=0 still silent-commit (no regression on benign transitions).
5. Preview EF errors / timeouts surface as error UI; status stays unchanged.

---

## 2. Background & Motivation

See `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/INCIDENT_REPORT.md` §2 (3 root causes) + §3.3 (this SPEC's prescription).

The root cause is design, not data: two concurrent listeners on the same promise can race, and the silent-commit listener is reachable on every error path including unwanted ones. The original 26 MB / 76 s preview cost came from composing 2,420 message bodies up front — a waste even when no one looks at most of them.

This rev (lazy rows) keeps the full operator UX — recipient list, filter chips, per-row preview, deselection — but stops pre-building bodies. Open-time cost drops by ~100×; scales to 100,000+ audiences without touching the response budget. The operator-confirmation gate is unchanged: every error/timeout/cancel path leaves `crm_events.status` untouched. The only silent-commit branch that remains is `recipient_count_total === 0` (no rules fired — benign transitions like → completed).

This SPEC is the operator-facing safety brake. Even before SPEC B (consumer race) and SPEC C (queue ON CONFLICT) land, A makes mass dispatch impossible without an explicit modal click.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state | On `develop`, clean | `git status --porcelain` returns only the 18 pre-existing paths from session start |
| 2 | Commits produced | 4–6 commits in range | `git log <START_TAG>..HEAD --oneline \| wc -l` between 4 and 6 |
| 3 | SPEC folder populated | 5 files: SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md | `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/` |
| 4 | preview.ts default response shape | `mode='dispatch_preview'` (default) returns `{run_id, fired, queued, skipped, rules, channels, recipient_count_total, recipient_count_by_channel, recipients_by_lead}` where each `recipients_by_lead[i]` carries metadata (lead_id, full_name, phone, email, created_at, prior_active_attendee_count, attended_event_count, rule_id, channel) but **`message_body_sms` and `message_body_email` are NULL**. | inspect EF source + curl payload byte count + assert `null`-body fields |
| 5 | preview.ts NEW per-row mode | `mode='preview_recipient_body'` takes `{tenant_id, trigger_type, trigger_data, lead_id, channel}` and returns `{lead_id, channel, composed_body, language, template_slug}`. Resolves exactly one (lead, channel) — does NOT iterate the full audience. | curl test with single lead_id |
| 6 | Window-open latency (demo, 1,200 injected) | wall-clock from click → modal fully rendered (recipient list visible) < 1 s p95 | TEST_REPORT.md captures from Chrome devtools network tab + Performance trace |
| 7 | Window-open payload size (demo, 1,200 injected) | response Content-Length < 500 KB | network panel |
| 8 | Per-row body fetch latency (demo, 1,200 injected) | wall-clock from row click → body rendered inline < 500 ms p95 (across 5 sampled clicks) | TEST_REPORT.md |
| 9 | `probeAndCommit` silent-commit removed for error / timeout / cancel paths | Source `crm-automation-client.js` — `previewPromise.then` and `.catch` no longer reach `commitCallback({mode:'silent_*'})` in any non-zero-recipient branch. Only one silent path remains: `recipient_count_total === 0`. | source review by Reviewer |
| 10 | Modal cancel path | TEST_REPORT.md: cancel click → modal closes → `crm_events.status` UNCHANGED | DB before/after assertion |
| 11 | Modal preview-error path | TEST_REPORT.md: preview EF errors → error UI shows → operator clicks Cancel → `crm_events.status` UNCHANGED | DB before/after assertion |
| 12 | Modal confirm path | TEST_REPORT.md: operator clicks "אישור ושלח" → `crm_events.status` changes → exactly one SCE row written | DB count assertions |
| 13 | Per-row body click path | TEST_REPORT.md: operator expands one row → exactly one `preview_recipient_body` EF call fires → body renders inline → other rows still in metadata-only state → `crm_events.status` UNCHANGED (clicks DO NOT commit) | network panel + DB assertion |
| 14 | Filter + deselect work pre-confirm | TEST_REPORT.md: operator types in search box → recipient list filters client-side or via list metadata only → no body fetches triggered. Operator deselects 5 rows. Approve button label shows "אישור ושלח הודעות (1,195)". | screenshot |
| 15 | Demo load-test injection | 1,200 ±5 synthetic leads inserted with sentinel `utm_campaign='M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21'` | `SELECT count(*) FROM crm_leads WHERE tenant_id=demo AND utm_campaign='M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21'` |
| 16 | Demo load-test injected leads are non-dispatchable | All 1,200 carry `phone LIKE '05000%'` (not in allowlist) AND `email LIKE '%@demo.opticalis.test'` (.test TLD, not in allowlist) | DB query |
| 17 | Demo load-test cleanup | All 1,200 DELETEd. Demo `crm_leads` returns to baseline count (28). | DB count delta = 0 |
| 18 | Prizma all tables bit-identical pre/post | crm_leads, crm_events, crm_message_queue, crm_message_log, crm_status_change_events, crm_automation_rules row counts on Prizma unchanged | Supabase MCP SELECTs |
| 19 | Iron Rule 31 gate | exit 0 or 2 (no null-byte ERROR) at every commit boundary | `npm run verify:integrity` |
| 20 | Iron Rule 32 declared destructive ops honored | 1,200-row demo INSERT + 1,200-row demo DELETE both tenant-scoped on sentinel predicate; 1 demo rule UPDATE pre/post net zero; 1 demo event UPDATE / archive; 1 EF redeploy | inspect git diff + commits |
| 21 | Iron Rule 33 demo-first | All code changes tested on demo before any consideration of Prizma. ZERO writes to Prizma. | inspect Supabase MCP query log |
| 22 | Iron Rule 34 Chrome MCP live verification | TEST_REPORT.md contains: (a) screenshot of demo crm.html modal showing the 1,200-row recipient list with accurate count header AND a row expanded with body loaded after click; (b) `window.__modalConfirmTrace` showing commit branch fired (sequential `await` → modal-render → confirm-click → commit) OR cancel branch (no commit); (c) DB queries proving status changed AFTER click and NOT BEFORE | inspect TEST_REPORT.md |
| 23 | template_slug drift secondary fix | preview.ts no longer references `crm_message_log.template_slug`. `fetchLastMessages` function deleted entirely. Postgres logs show 0 new `column "template_slug" does not exist` errors during the test run window. | grep + Postgres logs |
| 24 | Smoke baseline | `tests/smoke/baseline.test.mjs` 7/7 PASS post-fix | Localhost-Tester deliverable |
| 25 | Iron Rule 21 — No Duplicates | `prepareRulePlan` not duplicated for the lazy path. New per-row build re-uses prepareRulePlan with a `leadIdFilter` parameter (or equivalent narrow filter) — NOT a parallel implementation. | source review |

### Baselines (captured 2026-05-21 12:24 UTC; rev 2 adds latency baselines)

| Symbol | Source | Pre-value |
|---|---|---|
| `BASE_DEMO_LEADS` | `crm_leads where tenant=demo` | 28 |
| `BASE_DEMO_EVENTS` | `crm_events where tenant=demo and is_deleted=false` | 25 |
| `BASE_PRIZMA_LEADS` | `crm_leads where tenant=prizma` | 1,343 |
| `BASE_PRIZMA_EVENTS` | `crm_events where tenant=prizma and is_deleted=false` | 5 |
| `BASE_AE_VERSION` | automation-engine EF | 21 |
| `BASE_DQ_VERSION` | dispatch-queue EF | 15 |
| `BASE_SM_VERSION` | send-message EF | 27 |
| `BASE_PREVIEW_PAYLOAD_PRIZMA_PRE_FIX` | est. (per INCIDENT_REPORT) | ~26 MB |
| `BASE_PREVIEW_LATENCY_PRIZMA_PRE_FIX` | est. (per INCIDENT_REPORT) | ~76 s |
| `TARGET_PREVIEW_PAYLOAD_DEMO_POST_FIX` | criterion 7 | < 500 KB |
| `TARGET_PREVIEW_LATENCY_DEMO_POST_FIX` | criterion 6 | < 1 s p95 |
| `TARGET_ROW_BODY_LATENCY_POST_FIX` | criterion 8 | < 500 ms p95 |

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking

- Read any file + Level-1 read-only SQL.
- Apply 1 EF redeploy of `automation-engine` (v21 → v22) with the lazy-rows preview.ts + new `mode='preview_recipient_body'` + the new client behavior. **NO DB migrations** for this SPEC.
- Insert 1,200 synthetic demo leads matching §3 criterion 15 via `scripts/inject-demo-load-test-leads.mjs`.
- DELETE the 1,200 synthetic demo leads at end of test via `scripts/cleanup-demo-load-test-leads.mjs`.
- Re-enable ONE demo rule for the live test (rule `b53f6ea5-b41a-4df3-92e7-0a64c5b10b7d`, "שינוי סטטוס: נפתחה הרשמה"), then DISABLE it after the test. Pre/post net zero.
- Create ONE fresh demo event in `status='planning'` for the live test; archive it (`is_deleted=true`) after.
- Spin up localhost via `scripts/start-local.ps1`.
- Use Chrome MCP for the demo click sequence + screenshot + trace dump + per-row click sampling.
- Commit and push to `develop` per §9.
- Run `verify.mjs --staged` between commits.

### What REQUIRES stopping and reporting

- Demo load injection writes any row outside the sentinel predicate → STOP.
- Demo load injection inserts on Prizma by mistake → STOP.
- Any need to apply a DB migration → STOP (this SPEC is EF + JS only).
- Any need to redeploy `dispatch-queue` or `send-message` → STOP.
- Chrome MCP shows status changing BEFORE the operator clicks confirm → STOP (fix did not work).
- Chrome MCP shows a per-row click triggering a body fetch for any OTHER row → STOP (lazy scope leak).
- Any need to click on Prizma's crm.html → STOP. This SPEC runs on **demo only**.
- Window-open latency on demo with 1,200 injected leads exceeds 2 s (2× target) → STOP and investigate query plan.
- Per-row body latency exceeds 1 s p95 → STOP and investigate.
- Iron Rule 31 gate returns exit 1 → STOP.
- Post-cleanup `crm_leads where tenant=demo` count ≠ 28 → STOP (leak).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- Demo Postgres logs during the test show ≥1 new `column "template_slug" does not exist` error after the EF redeploy → drift not fully removed; STOP and re-audit preview.ts changes.
- Synthetic INSERTs return any row count other than 1,200 ±5 → STOP.
- Preview EF response on the 1,200-lead audience exceeds 500 KB → STOP (bodies leaking into default path).
- Demo `crm_message_queue` gets any new INSERTs during the test that are NOT tied to the operator's confirm click → STOP (SCE consumer fired unexpectedly).
- Any per-row body fetch call returns more than ONE recipient's body → STOP (scope leak in new endpoint).

---

## 6. Rollback Plan

- **Pre-write master safety tag** `pre-m4-event-status-dispatch-hardening-2026-05-21` already pushed at `099aa3a` (Foreman pre-flight).
- **Master safety baseline:** `develop` HEAD = `94f94b9` (post-revert of yesterday's instrumentation + Fix D).
- **Rollback path A — code only:** `git checkout <tag> -- supabase/functions/automation-engine/preview.ts modules/crm/crm-automation-client.js modules/crm/crm-confirm-send-v2.js modules/crm/crm-confirm-send-v2-render.js`, then redeploy v21 source via Supabase MCP. Commit revert with `revert(m4): ...`. NEVER `git reset --hard` / `git push --force` without Daniel.
- **Rollback path B — synthetic data:** `scripts/cleanup-demo-load-test-leads.mjs` (sentinel-bound DELETE on demo). Returns demo to pre-test state.
- **Rollback path C — rule re-disable:** `UPDATE crm_automation_rules SET is_active=false WHERE id='b53f6ea5-...' AND tenant_id=demo`.
- **Rollback path D — demo event archive:** `UPDATE crm_events SET is_deleted=true WHERE id=<test_event_id> AND tenant_id=demo`.

---

## Destructive Operations

The following destructive ops are pre-authorized by this SPEC. Any operation outside this list halts execution. **Re-confirmed for the rev-2 design — the set is identical to rev 1** since the EF + JS scope and the demo load-test mechanics are unchanged. Code shape differs; destructive surface does not.

1. **DML mass-INSERT on `crm_leads` for the demo tenant** (1,200 rows ±5, tenant-scoped, sentinel-marked on `utm_campaign`) — Phase 0 load injection.
2. **DML mass-DELETE on `crm_leads` for the demo tenant** (~1,200 rows, tenant-scoped, predicate-bound to `utm_campaign='M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21'` AND `tenant_id=<demo_uuid>`) — Phase 4 cleanup. This is a "DML mass-delete WITH tenant_id-scoped WHERE clause" — Iron Rule 32's prohibited shape is mass-delete WITHOUT tenant scope; not what this is.
3. **DML single-row UPDATE on `crm_automation_rules` (demo only)** — flip ONE rule `is_active=false → true → false`. Pre/post net zero.
4. **DML single-row UPDATE / soft-delete on `crm_events` (demo only)** — live-test event status change (the goal under test) + Phase 4 archive (`is_deleted=true`).
5. **Edge Function redeploy:** `automation-engine` v21 → v22 with new preview.ts (lazy rows + new mode).
6. **File rename (folder rescoping):** Delete `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/SPEC.md` and add `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/SPEC.md`. The folder is renamed in the rev-2 rescoping commit; git tracks as Delete+Add. Content of the new SPEC supersedes the old one; the old folder had no other files (no EXECUTION_REPORT yet, never executed).

NONE of: `git reset --hard`, `git push --force`, `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, any DML mass-delete without tenant scope, any `main` branch modification, any `--no-verify` bypass, any deletion of governance files, any file deletes on the M4 surface, any redeploy of `dispatch-queue` / `send-message` / any other EF, any DB migration.

---

## 7. Out of Scope (explicit)

- **SPEC B + C territory.** Consumer race fix + queue ON CONFLICT are separate SPECs. THIS SPEC does NOT touch `consumer.ts`, `dispatch.ts`, `queue-send.ts`, or any DB migration.
- **Body fetch caching beyond modal lifetime.** Within the modal session, fetched bodies are memoized in `_state.recipientBodies` so re-expanding the same row doesn't re-fetch. Closing + reopening the modal starts fresh. No localStorage / cross-session cache.
- **Parallel-click throttle.** If operator rage-clicks 50 rows in 1 s, 50 parallel EF calls fire. Acceptable for this SPEC; a `Promise.all` throttle is a follow-up FINDINGS item if seen in practice.
- **Prizma data.** Zero writes. Zero clicks on Prizma crm.html.
- **The 12 demo rules' resting state.** Net delta = 0 (re-enable for test, restore after).
- **Other status-change call sites** (lead_status_change, attendee_status_change). They share `probeAndCommit` so inherit the safer flow automatically — but verification path tests ONLY event-status. Verifying lead + attendee is a follow-up FINDINGS item.
- **`send-message` body validation.** Untouched.
- **Merge to main.** Daniel's manual PR is the only path.
- **18 pre-existing modified/untracked files** at session start — left alone.

---

## 8. Expected Final State

### New files
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/SPEC.md` (this file; folder renamed from M4_DISPATCH_PREVIEW_SUMMARY_MODE)
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/FINDINGS.md`
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/TEST_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/FOREMAN_REVIEW.md`

### Modified files
- `supabase/functions/automation-engine/preview.ts` — refactored:
  - `fetchLastMessages` function DELETED entirely (drift fix — the `template_slug` SELECT is gone).
  - `RecipientView` shape keeps `message_body_sms` + `message_body_email` fields but these are populated as **null** in the default path (kept for backward-compat with anything reading the field; the new per-row endpoint is the source of truth).
  - The plan-items iteration that calls `composedBody` skips body composition when `skipBodyComposition` is true (the new default for `mode='dispatch_preview'`). Recipients are resolved + enrichments run + counts computed; no template substitution.
  - New exported `previewRecipientBody(db, {tenantId, triggerType, triggerData, leadId, channel})` resolving exactly one (lead, channel).
- `supabase/functions/automation-engine/prepare-plan.ts` — add `opts` param `{skipBodyComposition?: boolean; leadIdFilter?: string; channelFilter?: string}` (default empty). Pure parameter addition; no behavior change for existing callers.
- `supabase/functions/automation-engine/index.ts` — route `mode='preview_recipient_body'` to the new function.
- `modules/crm/crm-automation-client.js` — `probeAndCommit` rewritten as sequential `await` (no races). Adds `previewRecipientBody(triggerType, triggerData, leadId, channel)` exposed on `window.CrmAutomationClient`.
- `modules/crm/crm-confirm-send-v2.js` — `showAsync` simplified. Per-row expand handler upgraded to lazy-fetch body via `CrmAutomationClient.previewRecipientBody` and populate `_state.recipientBodies[lead_id][channel]`.
- `modules/crm/crm-confirm-send-v2-render.js` — per-row expanded body cell renders loading spinner / error retry / body inline based on `_state.recipientBodies[*]`/`recipientBodyErrors[*]`/`recipientBodyLoading[*]`.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top entry summarizing this SPEC's closure.

### DB state (demo only)
Same as rev 1: 1,200 synthetic leads + 1 rule flipped temporarily + 1 fresh demo event + 1 status change. Phase 4 cleanup returns to baseline. Net delta = 0.

### DB state (Prizma)
ZERO writes. Every Prizma table bit-identical pre/post (criterion 18).

### Docs updated
- M4 SESSION_CONTEXT.md (top entry).
- MASTER_ROADMAP.md NOT required.
- GLOBAL_MAP.md / GLOBAL_SCHEMA.sql NOT required (no DB objects).
- M4 MODULE_MAP.md NOT required.
- M4 CHANGELOG.md: brief one-line entry encouraged.

---

## 9. Commit Plan

Selective `git add <file>` by filename in every commit — never `git add -A`.

- **Commit 1 (DONE — `5912489`)** — `feat(m4): demo load-test inject + cleanup scripts` (already on develop).
- **Commit 2 (DONE — `b26a09c`)** — `docs(m4): SPEC docs for 3-SPEC event-status dispatch hardening series` (already on develop; this rev-2 update commit follows).
- **Commit 3 (THIS REV)** — `docs(m4): rescope SPEC A from summary-mode to lazy-rows (M4_DISPATCH_PREVIEW_LAZY_ROWS)` — renames folder + this updated SPEC + B/C predecessor citations + load-script header pointers.
- **Commit 4 (Executor)** — `feat(m4): automation-engine preview.ts lazy-rows default + previewRecipientBody mode (v22)`
  - Files: `preview.ts`, `prepare-plan.ts`, `index.ts`.
  - Followed by `mcp__claude_ai_Supabase__deploy_edge_function` (side-effect, not a separate commit).
- **Commit 5 (Executor)** — `feat(m4): client probeAndCommit sequential + lazy per-row body fetch in V2 modal`
  - Files: `crm-automation-client.js`, `crm-confirm-send-v2.js`, `crm-confirm-send-v2-render.js`.
- **Commit 6 (Executor/Foreman close)** — `docs(spec): close M4_DISPATCH_PREVIEW_LAZY_ROWS — EXECUTION_REPORT + FINDINGS + TEST_REPORT + FOREMAN_REVIEW + SESSION_CONTEXT`
  - Combined doc-close commit. May split per Pipeline preference. Range 4–6 in criterion 2 measured from Commit 3 (the rev-2 docs commit) forward.

---

## 10. Phase 0 — Load Injection Plan (unchanged from rev 1)

This phase is identical to the original rev 1 SPEC §10 — same scripts, same sentinel, same demo-only safety guarantees. Only the post-injection assertions differ (latency + payload targets replace summary-shape targets).

### Step 0.1 — Demo baseline capture
Pin pre-counts of `crm_leads`, `crm_events`, `crm_automation_rules` (all 12 inactive on demo).

### Step 0.2 — Inject 1,200 synthetic leads via `scripts/inject-demo-load-test-leads.mjs` (committed at `5912489`)
- phone format `05000NNNNN` (Israeli mobile syntax, NOT in any allowlist).
- email format `m4_load_test_NNNN@demo.opticalis.test` (.test TLD, not in any allowlist).
- `utm_campaign='M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21'` (sentinel).
- Post-insert: `count(*) WHERE utm_campaign=sentinel` returns 1,200 ±5.

### Step 0.3 — Re-enable ONE demo rule
`UPDATE crm_automation_rules SET is_active=true WHERE id='b53f6ea5-b41a-4df3-92e7-0a64c5b10b7d' AND tenant_id=<demo>;`

### Step 0.4 — Create fresh demo event in `status='planning'`
Use `next_crm_event_number` RPC. Record returned event_id.

### Step 0.5 — Snapshot Postgres logs start timestamp
For post-test drift assertion (zero new `template_slug` errors).

---

## 11. Phase 1 — Code Changes (rev 2: lazy rows, NOT summary)

### 11.1 — preview.ts refactor

**Default path (`mode='dispatch_preview'`):**
- Load matching rules (unchanged).
- Open run row via `createRun` (unchanged).
- For each rule, call `prepareRulePlan(..., 'evaluate', {skipBodyComposition: true})`.
  - prepare-plan.ts gains `opts.skipBodyComposition` — when true, the inner loop that calls `substituteTemplateVariables` is bypassed. Items return with `composedBody: null` but lead identity + recipient contact + channel are populated.
- Aggregate counts: `recipient_count_total`, `recipient_count_by_channel`.
- Run `fetchLeadMeta` + `fetchAttendeeAggregates` (still needed for chip filters).
- **DELETE the `fetchLastMessages` call entirely.** Drift fix. Remove `last_message_sent_at` + `last_template_slug` fields from RecipientView.
- Return shape: existing `recipients_by_lead: RecipientView[]` with body fields = `null`.

**New path (`mode='preview_recipient_body'`):**
- Input: `{tenant_id, trigger_type, trigger_data, lead_id, channel}`.
- Loads matching rules (re-uses default path's helper).
- Calls `prepareRulePlan(..., 'evaluate', {leadIdFilter: leadId, channelFilter: channel, skipBodyComposition: false})`.
  - prepare-plan.ts honors `leadIdFilter` (narrows resolveRecipients SELECT by `eq('id', leadIdFilter)`) and `channelFilter` (iterates only that channel).
- Returns `{lead_id, channel, composed_body, language, template_slug, full_name, phone, email}`. If lead no longer in audience (e.g. cancelled mid-modal session) → `{error: 'lead_not_in_audience'}`.

**Wire in `index.ts`:** route the new mode.

### 11.2 — prepare-plan.ts surgical params

Pure additive parameter set. No behavior change for existing callers:
```ts
export async function prepareRulePlan(
  db, tenantId, rule, triggerData, tplCache, runId, mode,
  opts: { skipBodyComposition?: boolean; leadIdFilter?: string; channelFilter?: string } = {}
)
```
When `skipBodyComposition` is true, the per-item `composedBody` assignment is skipped (null). When `leadIdFilter` is set, resolveRecipients narrows the recipient SELECT by `eq('id', leadIdFilter)`. When `channelFilter` is set, the channels loop iterates only that channel.

### 11.3 — crm-automation-client.js `probeAndCommit` rewrite

Sequential `await`, no parallel listeners. Full body is in §0 Runtime-Semantics Rehearsal flow. Adds:
```js
window.CrmAutomationClient.previewRecipientBody = async function(triggerType, triggerData, leadId, channel) {
  var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
  if (!tid) return null;
  return await callEf({
    tenant_id: tid, trigger_type: triggerType, trigger_data: triggerData || {},
    mode: 'preview_recipient_body', lead_id: leadId, channel: channel
  });
};
```

### 11.4 — crm-confirm-send-v2.js per-row lazy fetch

`_ensureState` extends to track:
```js
_state.triggerType = triggerType;
_state.triggerData = triggerData;
_state.recipientBodies = {};      // {lead_id: {sms: body, email: body}}
_state.recipientBodyErrors = {};
_state.recipientBodyLoading = {};
```

The `expand` toggle handler in `wireBodyEvents` (existing line ~90) is upgraded: on first-expand of a row, fires `CrmAutomationClient.previewRecipientBody(...)` for each channel applicable to that lead. Cached in `_state.recipientBodies` so subsequent expand-toggles are instant.

### 11.5 — crm-confirm-send-v2-render.js per-row body cell

Expanded body cell renders:
- Loading → `<div class="text-slate-400 text-sm">⏳ טוען תצוגה מקדימה...</div>`
- Error → `<button data-ccsv2-retry-body="1" ...>⚠️ כשל בטעינה. לחץ לנסיון נוסף.</button>`
- Loaded → `<pre class="text-sm whitespace-pre-wrap">${escapeHtml(body)}</pre>`
- Not yet requested → empty

Retry click handler in `wireBodyEvents` clears the error + sets loading + re-fires the fetch.

---

## 12. Phase 2 — Live Test Run (Chrome MCP, demo only)

### 12.1 — Pre-test snapshots
Capture `crm_events.status` for test event_id (expected `'planning'`); demo `crm_message_queue` count (PRE); demo `crm_status_change_events` count where `consumed_at IS NULL` (PRE); demo `crm_message_log` count (PRE).

### 12.2 — Browser instrumentation hook (no source edit)
Via chrome-devtools `evaluate_script`:
```js
window.__modalConfirmTrace = window.__modalConfirmTrace || [];
const orig = window.CrmAutomationClient.probeAndCommit;
window.CrmAutomationClient.probeAndCommit = async function(...args) {
  __modalConfirmTrace.push({step:'probeAndCommit:enter', t:Date.now(), triggerType:args[0]});
  const r = await orig.apply(this, args);
  __modalConfirmTrace.push({step:'probeAndCommit:exit', t:Date.now(), mode:r&&r.mode, committed:r&&r.committed});
  return r;
};
const origBody = window.CrmAutomationClient.previewRecipientBody;
window.CrmAutomationClient.previewRecipientBody = async function(...args) {
  __modalConfirmTrace.push({step:'previewRecipientBody:enter', t:Date.now(), leadId:args[2], channel:args[3]});
  const r = await origBody.apply(this, args);
  __modalConfirmTrace.push({step:'previewRecipientBody:exit', t:Date.now(), hasBody: !!(r && r.composed_body)});
  return r;
};
```

### 12.3 — Drive the click sequence (latency capture)
- Navigate `http://localhost:3000/crm.html?t=demo`. Login (PIN 12345).
- Open the load-test event from §0.4.
- Capture `t0 = performance.now()`.
- Click "שנה סטטוס" → click "הרשמה פתוחה".
- Capture `t1 = performance.now()` after modal visible with 1,200-row list rendered.
- Assert criterion 6: `t1 - t0 < 1000ms`.

### 12.4 — Cancel path test
- DB pre-check: `crm_events.status = 'planning'`.
- Operator click "ביטול". Modal closes.
- DB post-check: `crm_events.status = 'planning'` UNCHANGED. → criterion 10 PASS.

### 12.5 — Per-row body fetch test (criterion 13 + criterion 8)
- Reset (close + reopen modal).
- Click row index 7 → row expands → `previewRecipientBody` EF call fires.
- Capture `t2` at click, `t3` at body render.
- Assert criterion 8: `t3 - t2 < 500ms`.
- Verify `__modalConfirmTrace` shows exactly ONE `previewRecipientBody:enter` for that leadId.
- Verify rows 0-6 and 8+ still in metadata-only state.
- Repeat for rows 50, 200, 700, 1100 — 4 more samples. Average + p95.

### 12.6 — Filter test (criterion 14)
- Type "Load Test Lead 0050" in search box. Verify list narrows to 1 row. NO body fetches triggered.
- Clear search. Verify list returns to 1,200 rows.

### 12.7 — Deselect test (criterion 14)
- Uncheck 5 rows. Verify approve button label updates to "אישור ושלח הודעות (1,195)".

### 12.8 — Confirm path test (criterion 12)
- Click "אישור ושלח".
- Verify `crm_events.status` flips from `planning` → `registration_open`.
- Verify exactly ONE row inserted into `crm_status_change_events`.
- Modal closes; toast shown.

### 12.9 — Preview-error path test (criterion 11)
- Reset event status. Inject JS hook that makes next `dispatch_preview` reject:
  ```js
  const origInvoke = window.sb.functions.invoke;
  let _failNext = true;
  window.sb.functions.invoke = function(name, opts) {
    if (_failNext && name === 'automation-engine' && opts.body.mode === 'dispatch_preview') {
      _failNext = false;
      return Promise.reject(new Error('synthetic preview failure'));
    }
    return origInvoke.apply(this, arguments);
  };
  ```
- Click "שנה סטטוס" → "הרשמה פתוחה".
- Expect: error toast "כשל בטעינת תצוגה מקדימה".
- DB: `crm_events.status` UNCHANGED. → criterion 11 PASS.

### 12.10 — Cleanup browser hooks
Restore `sb.functions.invoke`, `probeAndCommit`, `previewRecipientBody`. Dump `__modalConfirmTrace` into TEST_REPORT.md.

---

## 13. Phase 4 — Cleanup (Demo)

Run `scripts/cleanup-demo-load-test-leads.mjs`. Disable demo rule. Archive test event. Confirm Prizma untouched via 6 row-count queries.

---

## 14. Lessons Already Incorporated (rev 2)

- FROM `M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/INCIDENT_REPORT.md` §3.4 → **APPLIED.** §3 criterion 22 requires demo-only live verification; §4 STOPs on any Prizma click; §10 §13 cleanup keeps net delta zero on demo.
- FROM `feedback_probe_biggest_production_tenant.md` → **APPLIED through inversion.** Honor the SCALE requirement (1,200 leads injected on demo) without honoring the TENANT requirement (don't click on Prizma).
- FROM `feedback_test_data_phones.md` → **APPLIED.** Synthetic phones clearly fake + non-allowlisted; emails use `.test` TLD.
- FROM `feedback_clicks_are_not_actions.md` → **APPLIED.** Success criteria measure DB state, not click events.
- FROM `feedback_vfv_must_use_not_just_inspect.md` → **APPLIED.** §12 actually clicks the modal, expands a row, types in search box.
- FROM `feedback_dont_add_unrequested_features.md` → **APPLIED.** §7 explicitly out-of-scopes B/C territory, body cache beyond modal lifetime, parallel throttle, lead/attendee verification.
- FROM `M4_DUAL_PATH_CLEAN_FIX_2026_05_19/FOREMAN_REVIEW.md` Iron Rule 34 → **APPLIED** in §3 criterion 22 + §12.
- **NEW (rev 2):** Daniel's design override "lazy rows beats summary mode" → **APPLIED.** Default preview path resolves recipients but does NOT compose bodies; bodies fetched per-row, on demand, ONE at a time.

### Author-side cross-reference sweep (SPEC_TEMPLATE §1.5)

- Grepped new names (`previewRecipientBody`, `preview_recipient_body`, `recipient_count_total`, `recipient_count_by_channel`, `skipBodyComposition`, `leadIdFilter`, `channelFilter`, `recipientBodies`, `recipientBodyErrors`, `recipientBodyLoading`, `M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21`) in `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `modules/*/docs/MODULE_MAP.md`, `modules/crm/**/*.js`, `supabase/functions/automation-engine/*.ts` — 0 collisions.
- No new DB objects (tables, columns, views, RPCs, indexes, policies) introduced. Rule 21 satisfied.
- prepareRulePlan gains 1 optional opts param. Existing callers don't change. Rule 21: extends, doesn't duplicate.
- Same load scripts as rev 1 (already committed at `5912489`). Sentinel name unchanged.

---

## 15. Dependencies / Preconditions

- Localhost-Tester has Chrome MCP + `scripts/start-local.ps1` working.
- Supabase MCP available for EF deploy.
- Pipeline coordination lock claimed for this SPEC's slug at Executor start.
- Desktop Claude Code session (not Cowork VM).
- Iron Rule 31 gate exit 0 at SPEC start.
- No concurrent session may touch `modules/crm/crm-automation-client.js`, `modules/crm/crm-confirm-send-v2{,-render}.js`, `supabase/functions/automation-engine/{preview,prepare-plan,index}.ts` while this SPEC runs.

---

## 16. Pre-Merge Checklist

- [ ] All §3 success criteria pass with captured values in EXECUTION_REPORT.md §2.
- [ ] §3 criterion 6 (window-open < 1s) demonstrated.
- [ ] §3 criterion 8 (per-row < 500ms p95 over 5 samples) demonstrated.
- [ ] Iron Rule 31 exit 0 or 2 at every commit.
- [ ] Iron Rule 32 destructive ops declaration honored.
- [ ] Iron Rule 33 demo-first; zero Prizma writes.
- [ ] Iron Rule 34 Chrome MCP evidence in TEST_REPORT.md.
- [ ] `git status --short` returns only the 18 pre-existing paths.
- [ ] HEAD pushed to `origin/develop`.
- [ ] Pipeline-coordination lock released.
- [ ] 4 closing docs present in SPEC folder.
- [ ] M4 SESSION_CONTEXT.md top entry added.
- [ ] Demo `crm_leads` count post-cleanup = 28.
- [ ] Demo rule `b53f6ea5-...` is_active=false post-cleanup.
- [ ] Demo test event archived.
- [ ] Prizma 6 verification queries identical pre/post.

---

*End of SPEC (rev 2 — lazy rows).*
