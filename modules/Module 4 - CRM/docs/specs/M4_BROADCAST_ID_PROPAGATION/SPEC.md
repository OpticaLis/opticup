# SPEC — M4_BROADCAST_ID_PROPAGATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Phase (if applicable):** Phase 1 P1.2 of `roles/site-overseer/FUNNEL_ROADMAP.md`
> **Author signature:** opticup-strategic, Full-Auto Pipeline chat 2026-05-14
> **Brief:** `modules/Module 4 - CRM/architecture-brief/M4_BROADCAST_ID_PROPAGATION_BRIEF.md`

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14.
- `STATE_TRANSITIONS.md` + `RPC_BODY.sql` read from P1.4. Live RPC body queried (`md5=07e1904a315275e88a223eb088e1d30c`, `pronargs=13`, `pronargdefaults=10`) — confirms P1.1 already swapped the 4-param signature to 13-param + added `_record_touchpoint` calls with `p_broadcast_id := NULL` in 5 terminals.
- `crm_lead_touchpoints` table verified in live DB (12 rows by SELECT): `broadcast_id uuid NULL` column exists from P1.1 — **NO FK yet** (P1.1 SPEC §7 explicitly reserved without FK). This SPEC adds the FK.
- `crm_message_log.broadcast_id` verified: column exists, FK to `crm_broadcasts(id)` exists. **NO composite index on `(tenant_id, broadcast_id, created_at)` yet.** This SPEC adds the index.
- `crm_message_queue.broadcast_id` verified: **does NOT exist.** This SPEC adds column + FK + index.
- `short_link_clicks.broadcast_id` verified: **does NOT exist.** This SPEC adds column + FK + index.
- `short_links` shape verified — has `lead_id`, `event_id`, `message_log_id` (FK→crm_message_log). NO `broadcast_id`. For X1 (chosen — see §1.4) this SPEC adds `short_links.broadcast_id uuid NULL FK + index`.
- `crm_broadcasts` verified: `total_sent integer NOT NULL`, `total_failed integer NOT NULL`, `total_recipients integer NOT NULL`, `status text NOT NULL` (allowed values per KNOWLEDGE_MAP Layer 5: 'queued','sending','sent','failed'). Counter logic must update these in place.
- pg_cron extension active (5 jobs running, including `consume_status_change_events` every minute — the STATUS_CHANGE_TRIGGERS_FRAMEWORK pattern). pg_cron jobname `crm_broadcast_total_sent_refresh` is free (`SELECT jobname FROM cron.job` confirms).
- `_record_touchpoint` RPC signature verified: 18 positional params, `p_broadcast_id uuid` is position 9. Already wired through `register_lead_to_event` with NULL in that slot today.
- `dispatch-queue` EF v current source read: SELECTs `id, tenant_id, run_id, lead_id, event_id, channel, template_slug, body, subject, variables, language` from queue — **does NOT select `broadcast_id` today**. POSTs to send-message with payload that does NOT include `broadcast_id` today.
- `send-message` EF v24 source read: `dispatch.ts` writeDispatchAndSend inserts `crm_message_log` row without `broadcast_id` today. `injectAutoUrls` → `buildRegistrationUrl`/`buildUnsubscribeUrl` → `createShortLink` insert `short_links` row WITHOUT `broadcast_id` today.
- `resolve-link` EF v6 source read: SELECTs `target_url, expires_at, id, click_count, tenant_id, lead_id, event_id` from `short_links` — **does NOT select `broadcast_id`** (column does not exist there yet). Already wired for `recordTouchpointAsync` with `p_broadcast_id: null` placeholder ready to fill.
- `modules/crm/crm-messaging-broadcast-queue.js` read end-to-end. `buildQueueRows(...)` at line 74–98 does NOT include `broadcast_id` — root cause of Layer 5 Gap #1 + Gap #2.
- KNOWLEDGE_MAP Layer 5 Gap #1 (counter never updated) + Gap #2 (broadcast_id never propagated) read — these are the two gaps this SPEC closes.
- FUNNEL_ROADMAP §"Phase 1" P1.2 row verified PLANNED.
- Pre-existing untracked files survey: 79 untracked paths present at session start (selective `git add` by filename throughout — same discipline as P1.1). The Executor leaves them alone.
- Lessons applied from prior `FOREMAN_REVIEW.md` files (3 most recent):
  - **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #1** (rollback-artifact gate-compatibility check) → **APPLIED**: this SPEC's forward path is purely additive (NO `*_down.sql` files at risk). Down-migration content lives inside `ROLLBACK.md` (doc-context) per the codified pattern.
  - **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #2** (Pipeline-mode escalation discipline) → **APPLIED**: §5 Stop-on-Deviation Triggers below pre-enumerate which blockers Daniel-escalate vs. which auto-pivot. MCP→CLI EF deploy fallback is pre-authorized inline (Executor proceeds without AskUserQuestion).
  - **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Executor Proposal #1** (auto-fallback to CLI EF deploy on MCP `InternalServerErrorException`) → **APPLIED**: §4 Autonomy Envelope authorizes the pivot inline.
  - **FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Author Proposal #2** (pre-flight pg_proc probe) → **APPLIED**: §0 Baselines capture live RPC md5 + pronargs + EF versions.
  - **FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1** (baselines from LIVE measurement, never from author memory) → **APPLIED**: every numeric symbol below cites a runnable query.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Object | Metric | Value (captured 2026-05-14 LIVE) | Query |
|---|---|---|---|---|
| `BASE_RPC_MD5` | `register_lead_to_event` | `md5(pg_get_functiondef(...))` | `07e1904a315275e88a223eb088e1d30c` | `SELECT md5(pg_get_functiondef('public.register_lead_to_event'::regproc))` |
| `BASE_RPC_PRONARGS` | `register_lead_to_event` | `pronargs` | `13` (will become `14` post-SPEC) | `SELECT pronargs FROM pg_proc WHERE proname='register_lead_to_event'` |
| `BASE_SEND_MESSAGE_VER` | `send-message` EF | version | `24` (will become `≥25`) | `mcp__claude_ai_Supabase__get_edge_function('send-message').version` |
| `BASE_RESOLVE_LINK_VER` | `resolve-link` EF | version | `6` (will become `≥7`) | `mcp__claude_ai_Supabase__get_edge_function('resolve-link').version` |
| `BASE_DISPATCH_QUEUE_VER` | `dispatch-queue` EF | version | (capture pre-flight) (will become +1) | `mcp__claude_ai_Supabase__get_edge_function('dispatch-queue').version` |
| `BASE_PRIZMA_BROADCASTS` | `crm_broadcasts` | `COUNT(*) WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` | (capture pre-flight; MUST be identical post-SPEC) | `SELECT count(*) FROM crm_broadcasts WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` |
| `BASE_PRIZMA_LOG_ROWS` | `crm_message_log` | `COUNT(*) WHERE tenant_id=prizma` | (capture pre-flight; ALLOWED to grow if Prizma has live traffic during run; record the count to evaluate post-run delta) | `SELECT count(*) FROM crm_message_log WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` |
| `BASE_PRIZMA_QUEUE_ROWS` | `crm_message_queue` | same | same | same |
| `BASE_CRON_JOB_COUNT` | `cron.job` | `COUNT(*)` | `5` (will become `6` post-SPEC) | `SELECT count(*) FROM cron.job` |

---

## 1. Goal

Wire `broadcast_id` end-to-end through the messaging chain (`crm_broadcasts` → `crm_message_queue` → `crm_message_log` → `short_links` → `short_link_clicks` → `crm_lead_touchpoints`) so every dispatched message and resulting click can be attributed back to its originating broadcast with certainty. Also restores the `crm_broadcasts.total_sent` counter via a pg_cron periodic aggregation job, closing KNOWLEDGE_MAP Layer 5 Gap #1 + Gap #2.

---

## 2. Background & Motivation

KNOWLEDGE_MAP Layer 5 §"Gap #1" + §"Gap #2" (recorded 2026-05-14): every broadcast since 2026-05-12 (the BROADCAST_QUEUE_INTEGRATION cutover) stays at `status='queued', total_sent=0` forever and `crm_message_log.broadcast_id` is NULL on every row, because (a) the queue-row builder (`crm-messaging-broadcast-queue.js:74-98`) does not stamp `broadcast_id` on `crm_message_queue` rows and (b) no post-drain hook updates the parent `crm_broadcasts` counter. Any UI or report that reads `crm_broadcasts` shows a lie.

Daniel + Architect chose Option X (explicit broadcast_id encoded in every short-link URL emitted by a broadcast) on 2026-05-14, rejecting Option Y (time-window heuristic) — measurement, not guessing, is the bar for the marketing-maturity tier this project is building toward. P1.1 (closed 2026-05-14, commit `7841055`) reserved `crm_lead_touchpoints.broadcast_id` without FK in preparation for this SPEC. P1.4 (closed 2026-05-14) mapped `register_lead_to_event` and surfaced FIND-2 — now closed by P1.1's same-transaction touchpoint inserts.

### 2.1 Foreman decisions (resolved at author time, NOT executor decisions)

**Decision D1 — X1 vs X2 (broadcast attribution mechanism):** **X1 chosen.**
- `short_links` table already carries per-recipient state (`lead_id`, `event_id`, `message_log_id`) — adding `broadcast_id` is the natural extension of the existing pattern, not a new pattern.
- Each broadcast already generates per-recipient short_link rows (unsubscribe + optional registration_url; see KNOWLEDGE_MAP Layer 7 §"%registration_url% is per-recipient unique"). Per-broadcast stamping costs zero extra rows.
- Cleaner SaaS separation: zero URL noise visible to end-users; `/r/<code>` stays opaque.
- `resolve-link` reads `short_links.broadcast_id` at click time without parsing — fewer code paths to test.
- FK gives referential integrity to `crm_broadcasts(id)`.
- X2 (query-string `?b=<broadcast_id>`) would require `resolve-link` to parse query string AND surface it to the redirected target_url, AND require the storefront to forward the `b=` param back to event-register/lead-intake EFs. Cross-repo touch on storefront → larger blast radius — out of proportion to the benefit.

**Decision D2 — counter update mechanism:** **pg_cron periodic aggregation chosen, 1-min schedule, direct SQL (no EF round-trip).**
- Synchronous per-row trigger creates `crm_message_log` lock contention during 1000-recipient drains.
- pg_cron 1-min aggregation idempotent, recoverable, single-source-of-truth from `crm_message_log` count.
- Direct SQL (no EF call): the aggregation is a single `UPDATE ... SET total_sent = (SELECT COUNT ...) ... WHERE status IN ('queued','sending')` — no tenant loop needed (postgres role bypasses RLS), no EF auth hop. Simpler than the existing `consume_status_change_events` pattern (which DOES need the tenant loop because it talks to automation-engine EF). The job updates `total_failed` + flips `status` from 'queued'/'sending' to 'sent' when the queue for that broadcast drains.
- 1-min cadence matches existing patterns (`consume_status_change_events`, `dispatch_queue`). 5-min would lag broadcast UI updates noticeably for ~30-recipient demo blasts.

**Decision D3 — backfill scope:** **NO backfill.** Historical broadcasts (2026-05-12 → 2026-05-14, ~unknown count) stay `total_sent=0` permanently. FINDINGS.md records the unattributed gap. Phase 2.5 dashboards filter "broadcasts after 2026-05-14" for clean charts. Per Brief §1.7 — Option X explicitly rejects heuristic.

---

## 3. Success Criteria (Measurable)

Every criterion has an EXACT expected value. Copy-paste-runnable when possible.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at session end | On `develop`, clean | `git status --porcelain` → empty |
| 2 | New SPEC commits | exactly **4** Executor commits + 1 Localhost-Tester commit + 1 Foreman-close commit = **6** in commit range (acceptable drift: Executor may consolidate into ≥2 commits, see §10) | `git log <START_COMMIT>..HEAD --oneline \| wc -l` → ≥4 and ≤7 |
| 3 | `crm_message_queue.broadcast_id` column exists, type=uuid, nullable | column row in `information_schema.columns` with `is_nullable='YES'`, `data_type='uuid'` | `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name='crm_message_queue' AND column_name='broadcast_id'` → 1 row |
| 4 | `crm_message_queue` has FK `crm_message_queue_broadcast_id_fkey` → `crm_broadcasts(id)` | constraint exists | `SELECT 1 FROM pg_constraint WHERE conname='crm_message_queue_broadcast_id_fkey'` → 1 row |
| 5 | `crm_message_queue` has composite index `idx_crm_message_queue_tenant_broadcast_created` on `(tenant_id, broadcast_id, created_at)` WHERE `broadcast_id IS NOT NULL` | index row exists | `SELECT indexdef FROM pg_indexes WHERE indexname='idx_crm_message_queue_tenant_broadcast_created'` → 1 row, partial WHERE clause present |
| 6 | `crm_message_log` has composite index `idx_crm_message_log_tenant_broadcast_created` on `(tenant_id, broadcast_id, created_at)` WHERE `broadcast_id IS NOT NULL` | index row exists | `SELECT indexdef FROM pg_indexes WHERE indexname='idx_crm_message_log_tenant_broadcast_created'` → 1 row |
| 7 | `short_link_clicks.broadcast_id` column exists, type=uuid, nullable | column row exists | `SELECT 1 FROM information_schema.columns WHERE table_name='short_link_clicks' AND column_name='broadcast_id'` → 1 row |
| 8 | `short_link_clicks` has FK `short_link_clicks_broadcast_id_fkey` → `crm_broadcasts(id)` ON DELETE SET NULL | constraint exists | `SELECT 1 FROM pg_constraint WHERE conname='short_link_clicks_broadcast_id_fkey'` → 1 row |
| 9 | `short_link_clicks` has composite index `idx_short_link_clicks_tenant_broadcast_clicked` on `(tenant_id, broadcast_id, clicked_at)` WHERE `broadcast_id IS NOT NULL` | index exists | `SELECT 1 FROM pg_indexes WHERE indexname='idx_short_link_clicks_tenant_broadcast_clicked'` → 1 row |
| 10 | `short_links.broadcast_id` column exists, type=uuid, nullable (X1 substrate) | column row exists | `SELECT 1 FROM information_schema.columns WHERE table_name='short_links' AND column_name='broadcast_id'` → 1 row |
| 11 | `short_links` has FK `short_links_broadcast_id_fkey` → `crm_broadcasts(id)` ON DELETE SET NULL | constraint exists | `SELECT 1 FROM pg_constraint WHERE conname='short_links_broadcast_id_fkey'` → 1 row |
| 12 | `short_links` has partial index `idx_short_links_tenant_broadcast` on `(tenant_id, broadcast_id)` WHERE `broadcast_id IS NOT NULL` | index exists | `SELECT 1 FROM pg_indexes WHERE indexname='idx_short_links_tenant_broadcast'` → 1 row |
| 13 | `crm_lead_touchpoints` gains FK `crm_lead_touchpoints_broadcast_id_fkey` → `crm_broadcasts(id)` ON DELETE SET NULL (column already exists from P1.1) | constraint exists | `SELECT 1 FROM pg_constraint WHERE conname='crm_lead_touchpoints_broadcast_id_fkey'` → 1 row |
| 14 | `crm_lead_touchpoints` gains composite index `idx_crm_lead_touchpoints_tenant_broadcast_occurred` on `(tenant_id, broadcast_id, occurred_at)` WHERE `broadcast_id IS NOT NULL` | index exists | `SELECT 1 FROM pg_indexes WHERE indexname='idx_crm_lead_touchpoints_tenant_broadcast_occurred'` → 1 row |
| 15 | `register_lead_to_event` signature expanded to 14 params with `p_broadcast_id uuid DEFAULT NULL` added as final param; old 13-arg callers still work | `pronargs=14`, `pronargdefaults=11`; body md5 ≠ `BASE_RPC_MD5` | `SELECT pronargs, pronargdefaults FROM pg_proc WHERE proname='register_lead_to_event'` → `14, 11` |
| 16 | 13-arg backward-compat call returns normal happy-path on demo | `{success:true, attendee_id, status:'registered'}` | demo test scenario A in §3.1 |
| 17 | `dispatch-queue` EF deployed at version ≥ `BASE_DISPATCH_QUEUE_VER + 1`; SELECTs `broadcast_id` from queue + forwards in send-message payload | `get_edge_function` version bumped | `mcp__claude_ai_Supabase__get_edge_function('dispatch-queue').version` ≥ baseline + 1 |
| 18 | `send-message` EF deployed at version ≥ `BASE_SEND_MESSAGE_VER + 1` (≥25); writes `broadcast_id` to `crm_message_log` row; threads through `injectAutoUrls` → `createShortLink` to stamp `short_links.broadcast_id` | EF version bumped, contents include `broadcast_id` propagation | `get_edge_function('send-message').version` ≥ 25 |
| 19 | `resolve-link` EF deployed at version ≥ `BASE_RESOLVE_LINK_VER + 1` (≥7); SELECTs `broadcast_id` from short_links; INSERTs `short_link_clicks` with `broadcast_id`; passes `broadcast_id` to `_record_touchpoint` | EF version bumped | `get_edge_function('resolve-link').version` ≥ 7 |
| 20 | `crm-messaging-broadcast-queue.js` `buildQueueRows` stamps `broadcast_id` on every row (single-line addition + signature change to accept `broadcastId` param) | grep finds the new field | `grep -c 'broadcast_id:.*broadcastId' "modules/crm/crm-messaging-broadcast-queue.js"` ≥ 1 |
| 21 | pg_cron job `crm_broadcast_total_sent_refresh` exists, schedule = `* * * * *`, active=true | row in `cron.job` | `SELECT schedule, active FROM cron.job WHERE jobname='crm_broadcast_total_sent_refresh'` → `('* * * * *', true)` |
| 22 | After 2-minute wait, the cron job has run ≥1 time + `crm_broadcasts.total_sent` reflects accurate `COUNT(*) FROM crm_message_log WHERE status='sent'` per broadcast (verified on the demo broadcast inserted in scenario C below) | demo broadcast's `total_sent` increments from 0 → recipient count after queue drains (≥1 minute observed) | scenario C in §3.1 captures pre/post counter values |
| 23 | Demo broadcast chain test (scenario C) — every row in the chain has matching broadcast_id: queue rows, log rows, short_links rows, short_link_clicks rows, crm_lead_touchpoints rows | all rows carry `broadcast_id = <demo broadcast id>` | scenario C in §3.1 SQL verification |
| 24 | All 3 existing callers of `register_lead_to_event` continue working without modification (event-register EF v?, quick-register EF v?, crm-event-register.js) — they still pass 13 args, the new 14th param defaults to NULL | scenarios A + E in §3.1 PASS | demo integration tests |
| 25 | Touchpoint INSERT chain (P1.1 wiring) continues to fire — `event_register` touchpoint emitted on demo registration, `short_link_click` touchpoint emitted on demo redirect | scenarios C + D in §3.1 PASS | demo integration tests |
| 26 | Prizma bit-identical pre/post for `crm_broadcasts.id` set: no new Prizma broadcast rows created during SPEC run; existing Prizma broadcast row count = `BASE_PRIZMA_BROADCASTS` | counts match | SQL probe pre/post |
| 27 | Smoke 7/7 PASS pre-migration AND post-migration | both runs 7/7 | `npm run smoke` (run by opticup-localhost-tester) |
| 28 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 29 | KNOWLEDGE_MAP.md Layer 5 (Broadcasts) + Layer 7 (Click Tracking) updated documenting the broadcast_id chain; Gap #1 + Gap #2 marked RESOLVED with commit reference | grep finds the resolution markers | `grep -c 'RESOLVED.*M4_BROADCAST_ID_PROPAGATION\|broadcast_id.*RESOLVED' roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` ≥ 1 |
| 30 | FUNNEL_ROADMAP.md P1.2 status flipped from PLANNED to ✅ CLOSED | grep finds the flip | `grep -c 'P1\.2.*✅\|✅.*P1\.2\|M4_BROADCAST_ID_PROPAGATION.*CLOSED' roles/site-overseer/FUNNEL_ROADMAP.md` ≥ 1 |
| 31 | M4 SESSION_CONTEXT.md updated with P1.2 closure paragraph dated 2026-05-14 | new paragraph present | `grep -c '2026-05-14.*M4_BROADCAST_ID_PROPAGATION\|M4_BROADCAST_ID_PROPAGATION.*closed' "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"` ≥ 1 |
| 32 | M4 db-schema.sql appended with new columns + FKs + indices + cron job definition | grep finds | `grep -c 'broadcast_id.*crm_message_queue\|crm_broadcast_total_sent_refresh' "modules/Module 4 - CRM/docs/db-schema.sql"` ≥ 1 |

### 3.1 Demo Integration Test Scenarios (criteria 16/22/23/24/25)

All run against demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug=`demo`, PIN=12345). Phone whitelist: `0537889878`, `0503348349`, `0507168471`. Email whitelist: `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`, `danylis92@gmail.com`. **Every scenario writes ONLY to demo; ZERO Prizma writes**; pre/post Prizma row-count probes confirm.

| # | Scenario | Setup | Expected outcome |
|---|---|---|---|
| A | **13-arg backward-compat (criterion 16/24)** | Call `register_lead_to_event(p_tenant_id, p_lead_id, p_event_id, p_method:='manual', p_utm_source:='backward_compat_test', p_utm_medium:=NULL, p_utm_campaign:=NULL, p_utm_content:=NULL, p_utm_term:=NULL, p_utm_campaign_id:=NULL, p_referrer_url:=NULL, p_landing_url:=NULL, p_short_link_code:=NULL)` — 13 named args, NO broadcast_id passed. Use a fresh demo lead + open demo event with capacity. | RPC returns `{success:true, attendee_id:<uuid>, status:'registered'}`. New touchpoint row: `touchpoint_type='event_register'`, `lead_id=<set>`, `event_id=<set>`, `broadcast_id=NULL` (the new param defaults to NULL when not passed). |
| B | **14-arg with broadcast_id (criterion 15/25)** | Call same RPC with new 14th param `p_broadcast_id := <a manually-inserted test broadcast id>`. Fresh demo lead + event. | RPC returns `{success:true, attendee_id, status:'registered'}`. New touchpoint row carries `broadcast_id=<test id>`. |
| C | **End-to-end broadcast chain (criterion 22/23/25)** | (1) Manually INSERT a `crm_broadcasts` row on demo with `status='queued', total_sent=0, total_recipients=1, channel='sms', name='M4_BROADCAST_ID_PROPAGATION_demo_test', employee_id=<demo admin>`. (2) Manually INSERT 1 `crm_message_queue` row with `broadcast_id=<that id>`, `lead_id=<demo lead>`, `channel='sms'`, `status='queued'`, `template_slug=<existing demo template>`, `language='he'`, `event_id=<demo open event>`, `scheduled_at=now()-interval '1 second'`. (3) Wait ≤90s for `dispatch_queue` cron tick → `send-message` POST. (4) Observe `crm_message_log` row inserted with `broadcast_id`. (5) Observe `short_links` row(s) inserted with `broadcast_id` (via `injectAutoUrls` → `createShortLink`). (6) Hit one of the resulting `/r/<code>` short links → observe `short_link_clicks.broadcast_id` set + `crm_lead_touchpoints.broadcast_id` set. (7) Wait ≤2 minutes → observe `crm_broadcasts.total_sent` updated from 0 → 1 by `crm_broadcast_total_sent_refresh` cron. | All 7 verifications PASS: queue row has broadcast_id; log row has broadcast_id; short_links has broadcast_id; short_link_clicks has broadcast_id; touchpoint has broadcast_id; counter incremented. Chain length 6, every hop carries the broadcast_id. |
| D | **Click without broadcast (regression — criterion 25)** | Manually INSERT `short_links` row with `broadcast_id=NULL`, `lead_id=NULL`, `code='m4p2d01'`, `target_url='https://...'`. Hit `/r/m4p2d01`. | `short_link_clicks` row with `broadcast_id=NULL`. `crm_lead_touchpoints` row with `broadcast_id=NULL` (regression-safe — P1.1 wiring still fires when broadcast_id is absent). |
| E | **All 3 existing RPC callers (criterion 24)** | Manual probe: dispatch from event-register EF (POST to its endpoint with demo lead body — uses 13-arg call). Dispatch from quick-register EF via demo quick-register URL. Dispatch from ERP `crm-event-register.js` UI path (12345 PIN login → demo board → register fresh demo lead to demo open event). | All 3 callers return success without error. New attendee rows present. New `event_register` touchpoints present, each with `broadcast_id=NULL` (none of them pass broadcast_id — backward compat preserved). |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo.
- Run read-only SQL (Level 1) via `mcp__claude_ai_Supabase__execute_sql`.
- Apply DDL migrations via `mcp__claude_ai_Supabase__apply_migration` (Level 3 — pre-authorized for the migrations enumerated in §8).
- Schedule a pg_cron job via `apply_migration` with `cron.schedule(...)` — pre-authorized for the single new job `crm_broadcast_total_sent_refresh`.
- Deploy Edge Functions via `mcp__claude_ai_Supabase__deploy_edge_function` (3 EF deploys: dispatch-queue, send-message, resolve-link).
- **MCP→CLI fallback for EF deploys (pre-authorized per P1.1 Executor Proposal #1):** if `deploy_edge_function` returns 5xx/InternalServerErrorException, retry ONCE with simplified payload. If second attempt fails: do NOT escalate via AskUserQuestion. Write the EF source to `supabase/functions/<name>/index.ts` directly in the repo, emit one chat line: "⚠️ MCP deploy_edge_function failed (OPEN-021). Source written to repo; please run `supabase functions deploy <name>` from your shell, then say done." Proceed to next EF.
- Create, edit, move files listed in §8 "Expected Final State".
- Commit and push to `develop` with selective `git add` by filename (NEVER `-A` / `.`).
- Run `npm run verify:integrity` + `npm run smoke`.
- Edit `crm-messaging-broadcast-queue.js` (the 1-line broadcast_id stamp in buildQueueRows + thread broadcastId into the call site).

### What REQUIRES stopping and reporting

- Any DDL or DML against the Prizma tenant (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`).
- Any change to `crm_broadcasts` schema beyond the FKs receiving the new broadcast_id columns from referencing tables.
- Any change to `crm_message_log.broadcast_id` semantics (FK already exists; only adding index).
- Any change to the canonical RLS policies on touched tables (`crm_message_queue`, `crm_message_log`, `short_link_clicks`, `crm_lead_touchpoints`, `short_links`, `crm_broadcasts`). The new columns inherit tenant_id-scoped RLS automatically — **DO NOT** add redundant policies (per Brief §7 constraint).
- Any merge to `main` or `git checkout main`.
- Any failure of smoke 7/7 pre-migration (signals upstream regression).
- Any caller of `register_lead_to_event` that breaks on the new param.
- The pg_cron `crm_broadcast_total_sent_refresh` job updating the wrong counter or running against the wrong tenant.
- `send-message` EF failing to drain after redeploy (production breaker).
- Touchpoint INSERT chain (P1.1) regressing.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. RPC body md5 at session start ≠ `BASE_RPC_MD5` → STOP. Something changed since P1.1 closure.
2. The new `register_lead_to_event` migration produces a body that breaks the 13-arg callers (event-register EF, quick-register EF, crm-event-register.js) → STOP, rewrite to ensure the 14th param is the LAST positional param with NULL default.
3. The `crm_broadcast_total_sent_refresh` cron job UPDATEs the wrong counter (e.g. `total_attempted` or a different table) → STOP, fix the query before next tick.
4. The cron job runs against the wrong tenant or bypasses tenant_id scoping in a way that updates Prizma rows that this SPEC isn't allowed to touch → STOP. (Note: the UPDATE itself runs as postgres role bypassing RLS, but the query MUST be tenant-agnostic in code AND only touch broadcasts based on their own status/broadcast_id — never read or filter by tenant_id='6ad0781b...' literally.)
5. `send-message` EF redeploy fails to drain `crm_message_queue` → STOP. Production breaker.
6. Touchpoint INSERT inside `register_lead_to_event` raises a constraint violation under the new 14-arg signature → STOP, the `_record_touchpoint` call must continue threading correctly.
7. `resolve-link` SELECT post-redeploy fails to find `broadcast_id` on `short_links` → STOP, migration ordering issue.
8. Smoke 7/7 PASS does NOT hold pre-migration → STOP, regression upstream of this SPEC.
9. Any RLS policy added or modified on touched tables → STOP, no policy changes in this SPEC (Brief §7 constraint).
10. Any new Prizma broadcast row created during the SPEC's run → STOP, capture which row + investigate.
11. The `crm-messaging-broadcast-queue.js` edit accidentally breaks an existing automation path (lead-intake auto-message, event automations, manual sends) → STOP, the change must be purely additive on the queue row builder.
12. Any commit message without `M4_BROADCAST_ID_PROPAGATION` reference → STOP, scope drift.

---

## 6. Rollback Plan

### Pre-flight safety tag

Before applying migration #1, push a master safety tag `pre-m4-broadcast-id-propagation-2026-05-14` pointing at HEAD; push tag to origin. Anchor for full rollback.

### Migrations down-path

If a STOP fires AND Daniel authorizes rollback, apply the down-migration SQL embedded in `ROLLBACK.md` (in this folder) in REVERSE order:
1. Re-deploy `dispatch-queue` (pre-version), `send-message` v24, `resolve-link` v6.
2. `cron.unschedule('crm_broadcast_total_sent_refresh')`.
3. Revert `register_lead_to_event` to BASE_RPC_MD5 body verbatim via `CREATE OR REPLACE`.
4. Drop new indices.
5. Drop new FKs.
6. Drop new `broadcast_id` columns from queue + clicks + short_links (touchpoint column stays — pre-existed).
7. Hard-restore working tree to safety tag.

Rollback verification: smoke 7/7 PASS; RPC md5 = `BASE_RPC_MD5`; `crm_message_queue.broadcast_id` no longer exists.

---

## 7. Out of Scope (explicit)

The Executor MUST NOT touch any of the following:

- **Backfill of historical broadcasts** (Brief §1.7 + D3 decision). The 2026-05-12 → 2026-05-14 gap stays as known-unattributed; FINDINGS.md records.
- **Per-channel broadcast attribution** (SMS vs Email vs WhatsApp distinction at touchpoint level) — already covered by existing `crm_message_log.channel`.
- **Broadcast performance dashboard UI** — Phase 2.5.1 territory.
- **CAPI integration** — Phase 2 P2.1 territory.
- **Broadcast targeting / audience selection / scheduling business logic** — DO NOT touch beyond broadcast_id propagation.
- **New broadcast types or templates** — out of scope.
- **Storefront repo** — out of scope. No `opticup-storefront/` writes. X1 chosen specifically to avoid storefront touch.
- **`crm_broadcasts.status` lifecycle beyond the cron job's flip from 'queued'/'sending' → 'sent'** — out of scope. 'failed' transitions, 'cancelled' states, etc. stay as-is.
- **`crm_message_log.broadcast_id` FK** — ALREADY EXISTS. Do not re-add.
- **`crm_lead_touchpoints.broadcast_id` column add** — ALREADY EXISTS (from P1.1). Only the FK + composite index are new in this SPEC.
- **Adding RLS policies on the new columns** (Brief §7 + Stop trigger #9) — RLS is enforced by the parent table's existing tenant_id policies; new FK columns inherit. No new policies needed.
- **`MASTER_ROADMAP.md`** — P1.2 is the 3rd of 4 Phase 1 SPECs; cross-module roadmap touches when Phase 1 closes (after P1.3 lands), not per-SPEC.
- **`docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql`** — deferred to next M4 Integration Ceremony.

---

## 8. Expected Final State

### New files (tracked by git)

| Path | Purpose |
|---|---|
| `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/SPEC.md` | This file |
| `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/EXECUTION_REPORT.md` | Executor's run report |
| `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/FINDINGS.md` | Executor's findings |
| `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/TEST_REPORT.md` | Localhost-Tester smoke report |
| `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` | Foreman's closure review |
| `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/ROLLBACK.md` | Rollback SQL (doc-context per gate-compat rule) |

### Files outside git (mandatory local safety net per CLAUDE.md §9.9)

Path: `modules/Module 4 - CRM/backups/2026-05-14_M4_BROADCAST_ID_PROPAGATION/` — **gitignored**:
- `RPC_BODY_PRE.sql` — pre-edit copy of `register_lead_to_event` (md5 `07e1904a...`).
- `SEND_MESSAGE_INDEX_PRE.ts` + `SEND_MESSAGE_DISPATCH_PRE.ts` + `SEND_MESSAGE_EVENT_VARIABLES_PRE.ts` + `SEND_MESSAGE_URL_BUILDERS_PRE.ts` — pre-edit copies of send-message v24 source.
- `RESOLVE_LINK_INDEX_PRE.ts` — pre-edit copy of resolve-link v6 source.
- `DISPATCH_QUEUE_INDEX_PRE.ts` — pre-edit copy of dispatch-queue source.
- `CRM_MESSAGING_BROADCAST_QUEUE_PRE.js` — pre-edit copy of the ERP JS file.
- `CLAUDE_md_PRE.md`.
- M4 `SESSION_CONTEXT_PRE.md`, `MODULE_SPEC_PRE.md`, `MODULE_MAP_PRE.md`, `ROADMAP_PRE.md`, `CHANGELOG_PRE.md`, `db-schema_PRE.sql`.

### Modified files (tracked by git)

| Path | Change |
|---|---|
| `modules/crm/crm-messaging-broadcast-queue.js` | (a) Thread `broadcastId` parameter into `buildQueueRows` signature; (b) Add `broadcast_id: broadcastId` field on each queue row in the `.map(...)` body; (c) Reorder `enqueueBroadcast` to pass `broadcastId` to `buildQueueRows` AFTER `insertBroadcastRecord` returns the id. |
| `supabase/functions/dispatch-queue/index.ts` | SELECT `broadcast_id` from queue rows; thread `broadcast_id` into `dispatchOne` payload. |
| `supabase/functions/send-message/index.ts` | Extract `broadcast_id` from payload; thread through to `injectAutoUrls` + `writeDispatchAndSend` + every `crm_message_log` insert (success path + each early-exit fail/reject path: unsubscribed, template_not_found, missing_required_variable, payment_url_mismatch, unsubstituted_placeholder, phone_not_allowed, email_not_allowed). |
| `supabase/functions/send-message/dispatch.ts` | Accept `broadcastId` in `DispatchParams`; write to `crm_message_log` insert object. |
| `supabase/functions/send-message/event-variables.ts` | `injectAutoUrls` accepts `broadcastId` param; threads through to `buildRegistrationUrl` + `buildUnsubscribeUrl`. |
| `supabase/functions/send-message/url-builders.ts` | `buildRegistrationUrl` + `buildUnsubscribeUrl` accept `broadcastId`; `createShortLink` accepts `broadcastId` and stamps on `short_links` insert row. |
| `supabase/functions/resolve-link/index.ts` | SELECT `broadcast_id` from `short_links`; pass to `recordClickAsync` (writes to `short_link_clicks.broadcast_id`); pass to `recordTouchpointAsync` (replaces `p_broadcast_id: null` placeholder with the actual value). |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Prepend one closure paragraph dated 2026-05-14 describing P1.2 close. |
| `modules/Module 4 - CRM/docs/db-schema.sql` | Append section with: new columns (5: queue, clicks, short_links — touchpoint already documented from P1.1), new FKs (5), new indices (6, including touchpoint composite added here), new cron job definition. |
| `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` | Update Layer 5 (Broadcasts) to reflect broadcast_id propagation now wired; mark Gap #1 + Gap #2 RESOLVED with this SPEC reference. Update Layer 7 (Click Tracking) to note `short_link_clicks.broadcast_id` + `short_links.broadcast_id` (X1 substrate). |
| `roles/site-overseer/FUNNEL_ROADMAP.md` | Flip P1.2 row from PLANNED to ✅ CLOSED. |

### DB state after migrations

- `crm_message_queue` gains `broadcast_id uuid NULL`, FK → `crm_broadcasts(id)` ON DELETE SET NULL, partial index `(tenant_id, broadcast_id, created_at) WHERE broadcast_id IS NOT NULL`.
- `crm_message_log` gains partial index `(tenant_id, broadcast_id, created_at) WHERE broadcast_id IS NOT NULL` (column + FK already exist).
- `short_link_clicks` gains `broadcast_id uuid NULL`, FK → `crm_broadcasts(id)` ON DELETE SET NULL, partial index `(tenant_id, broadcast_id, clicked_at) WHERE broadcast_id IS NOT NULL`.
- `short_links` gains `broadcast_id uuid NULL`, FK → `crm_broadcasts(id)` ON DELETE SET NULL, partial index `(tenant_id, broadcast_id) WHERE broadcast_id IS NOT NULL`.
- `crm_lead_touchpoints` gains FK `crm_lead_touchpoints_broadcast_id_fkey` → `crm_broadcasts(id)` ON DELETE SET NULL, partial index `(tenant_id, broadcast_id, occurred_at) WHERE broadcast_id IS NOT NULL`.
- `register_lead_to_event` reshaped to 14 params (added `p_broadcast_id uuid DEFAULT NULL` as final positional param); body propagates `p_broadcast_id` into each `_record_touchpoint` call in place of the current `NULL` literal at position 9.
- pg_cron job `crm_broadcast_total_sent_refresh`:
  ```
  SELECT cron.schedule(
    'crm_broadcast_total_sent_refresh',
    '* * * * *',
    $$
    UPDATE crm_broadcasts b
       SET total_sent   = COALESCE(s.sent_count, 0),
           total_failed = COALESCE(s.failed_count, 0),
           status = CASE
             WHEN (COALESCE(s.sent_count,0) + COALESCE(s.failed_count,0) + COALESCE(s.rejected_count,0)) >= b.total_recipients
                  AND b.status IN ('queued','sending')
               THEN 'sent'
             WHEN b.status = 'queued' AND COALESCE(s.sent_count,0) > 0
               THEN 'sending'
             ELSE b.status
           END
      FROM (
        SELECT broadcast_id,
               COUNT(*) FILTER (WHERE status='sent')     AS sent_count,
               COUNT(*) FILTER (WHERE status='failed')   AS failed_count,
               COUNT(*) FILTER (WHERE status='rejected') AS rejected_count
          FROM crm_message_log
         WHERE broadcast_id IS NOT NULL
         GROUP BY broadcast_id
      ) s
     WHERE s.broadcast_id = b.id
       AND b.status IN ('queued','sending');
    $$
  );
  ```
  The WHERE on `b.status IN ('queued','sending')` makes the job idempotent — finished broadcasts are never re-updated. The query is tenant-agnostic and only reads/writes via broadcast_id JOIN; no Prizma-specific filter (per Stop trigger #4).

---

## 9. Commit Plan

| # | Author | Type | Files | Message |
|---|---|---|---|---|
| 1 | Foreman | spec | SPEC.md (this file) | `docs(spec): seal M4_BROADCAST_ID_PROPAGATION SPEC + Brief reality check` |
| 2 | Executor | feat (DB) | migration files (4 up + corresponding down in ROLLBACK.md) | `feat(m4,db): broadcast_id columns + FKs + indices + crm_broadcast_total_sent_refresh cron job (M4_BROADCAST_ID_PROPAGATION P1.2)` |
| 3 | Executor | feat (RPC+EF+JS) | `register_lead_to_event` updated (via apply_migration), 3 EFs deployed via MCP/CLI, `crm-messaging-broadcast-queue.js` 1-line stamp | `feat(m4,rpc+ef): wire broadcast_id end-to-end through dispatch-queue + send-message + resolve-link + register_lead_to_event RPC (M4_BROADCAST_ID_PROPAGATION P1.2)` |
| 4 | Executor | docs | M4 SESSION_CONTEXT + db-schema, KNOWLEDGE_MAP, FUNNEL_ROADMAP | `docs(m4,site-overseer): close P1.2 in FUNNEL_ROADMAP + update KNOWLEDGE_MAP Layer 5/7 + M4 SC + db-schema (M4_BROADCAST_ID_PROPAGATION)` |
| 5 | Executor | chore (spec) | EXECUTION_REPORT.md + FINDINGS.md + ROLLBACK.md | `chore(spec): M4_BROADCAST_ID_PROPAGATION execution retrospective + ROLLBACK` |
| 6 | Localhost-Tester | chore (spec) | TEST_REPORT.md | `chore(spec): M4_BROADCAST_ID_PROPAGATION localhost-tester smoke report (7/7 pre + post)` |
| 7 | Foreman | chore (spec) | FOREMAN_REVIEW.md | `chore(spec): close M4_BROADCAST_ID_PROPAGATION with retrospective + Phase 1 P1.2 ✅` |

Acceptable drift: Executor may collapse commits 2+3 (if MCP-applied migrations don't reflect as files on disk, the `register_lead_to_event` migration may land in commit 2 alongside the column adds). Document collapse in EXECUTION_REPORT §5.

---

## 10. Dependencies / Preconditions

- P1.4 (`M4_REGISTER_LEAD_TO_EVENT_RPC_MAP`) — ✅ CLOSED 2026-05-14.
- P1.1 (`M3_UTM_TRIPLE_LAYER_PERSISTENCE`) — ✅ CLOSED 2026-05-14 (commit `7841055`). Provides `crm_lead_touchpoints.broadcast_id` column (NO FK), `_record_touchpoint` RPC with `p_broadcast_id` param, `resolve-link` v6 with `recordTouchpointAsync` placeholder ready.
- `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX` — ✅ CLOSED 2026-05-14.
- Live RPC body md5 = `BASE_RPC_MD5` (`07e1904a315275e88a223eb088e1d30c`).
- `send-message` v24 deployed, `resolve-link` v6 deployed.
- `dispatch-queue` deployed (version captured pre-flight).
- pg_cron extension active; jobname `crm_broadcast_total_sent_refresh` is free.
- Supabase project id: `tsxrrxzmdxaenlvocyit`.
- Demo tenant: `8d8cfa7e-ef58-49af-9702-a862d459cccb`. Prizma: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` — DO NOT WRITE.
- Whitelisted phones + emails available for test scenarios.

---

## 11. Lessons Already Incorporated

- **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #1 (rollback-artifact gate-compat):** §8 keeps all rollback SQL inside `ROLLBACK.md` (doc-context). Zero standalone `*_down.sql` files. The Iron-Rule-32 destructive-ops-gate will not trip.
- **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #2 + Executor Proposal #1 (Pipeline-mode escalation discipline + MCP→CLI EF deploy fallback):** §4 pre-authorizes the CLI pivot inline. Executor proceeds without AskUserQuestion on OPEN-021.
- **FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Author Proposal #2 (pre-flight pg_proc probe):** §0 Baselines pin RPC md5/pronargs from live measurement.
- **FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 (live-measured baselines):** every numeric baseline in §0 cites the runnable query that produced it.
- **FROM the pg_cron pattern (`consume_status_change_events` + `dispatch_queue`):** the new `crm_broadcast_total_sent_refresh` job uses direct SQL UPDATE rather than http_post-to-EF — simpler than the consumer pattern because aggregation needs no per-tenant routing.
- **FROM Brief §7 constraint (no redundant RLS):** §7 Out-of-Scope explicitly disallows new policies on touched tables. The new FK columns inherit tenant_id-scoped RLS automatically.
- **FROM the Brief's D3 decision (no backfill):** §7 Out-of-Scope locks this in; FINDINGS.md will record the 2026-05-12 → 2026-05-14 gap.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria (1-32) pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] All §3.1 demo scenarios (A-E) PASS.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] Smoke 7/7 PASS pre-migration AND post-migration (Localhost-Tester deliverable in TEST_REPORT.md).
- [ ] `git status --porcelain` returns empty at close.
- [ ] HEAD pushed to `origin/develop`.
- [ ] All 6 SPEC-folder artifacts present: SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, ROLLBACK.md, TEST_REPORT.md, FOREMAN_REVIEW.md.
- [ ] M4 SESSION_CONTEXT.md, FUNNEL_ROADMAP.md (P1.2 ✅), KNOWLEDGE_MAP.md (Layer 5 + 7), M4 db-schema.sql updated per §8.
- [ ] No new Prizma broadcast rows (criterion 26).
- [ ] RPC pre-flight md5 confirmed = `BASE_RPC_MD5` at session start.
- [ ] pg_cron job `crm_broadcast_total_sent_refresh` verified active + observed firing ≥ 1 time in the 2-minute integration test window.

---

## Destructive Operations

**None.**

- All migrations are additive: column adds + FK adds + index creates + RPC `CREATE OR REPLACE` (not destructive per Iron Rule 32) + `cron.schedule(...)` (additive).
- EF deploys are version increments (not destructive).
- ERP JS edit is purely additive (new field on row object + new param threaded).
- Zero DROP, zero ALTER…DROP, zero file deletions, zero historical backfill writes, zero `main` writes, zero `git rebase`/`reset --hard`/`push --force`.
- Down-migration content lives inside `ROLLBACK.md` (doc-context per `isDocFile()` regex in `scripts/checks/destructive-ops-declared.mjs`).

If any deviation surfaces requiring a destructive op mid-run → STOP, emit escalation, halt the pipeline.

---

*End of SPEC.md.*
