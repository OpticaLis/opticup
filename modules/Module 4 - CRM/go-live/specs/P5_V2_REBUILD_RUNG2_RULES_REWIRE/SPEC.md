# SPEC — P5_V2_REBUILD_RUNG2_RULES_REWIRE

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG2_RULES_REWIRE/`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-28
> **Parent SPEC:** `../P5_V2_TEMPLATE_REBUILD/SPEC.md`
> **Status:** READY FOR EXECUTION (Rung 1 must close first)
> **Priority:** Pre-cutover blocker — must land BEFORE M4 P7 (2026-05-03). Target: Saturday 2026-05-02 EOD.
> **Origin:** Foreman split of P5_V2_TEMPLATE_REBUILD per Decision #1.

---

## 1. Goal

Wire the 7 V2 automation rules (2.1–2.7) into the live CRM rule engine on the demo tenant — including the engine + lead-intake EF extensions they require — so the SuperSale event flow runs end-to-end on rule-driven dispatch with V2 templates loaded by Rung 1. After this Rung the demo tenant runs the full V2 flow autonomously: lead-intake fires T5/T1 conditionally, over-capacity registration fires T6, parallel-event opening fires T7 to the active waitlist, scheduled rules T8/T9 are queued at attendee-confirmation time, and manual moves (toggle ON) fire the appropriate paid/unpaid pair (Rule 2.7). T10 is fully retired in this Rung.

---

## 2. Background & Motivation

Rung 1 loaded the V2 template bodies and extended the substitution engine. The `crm_automation_rules` table is healthy and 10 rules are seeded today (`seed-automation-rules-demo.sql`). The current engine (`crm-automation-engine.js`, 349 lines) supports:

- **Triggers:** `event_status_change`, `event_registration`, `lead_status_change`, `lead_intake` (client-side).
- **Conditions:** `always`, `status_equals`, `count_threshold`, `source_equals`.
- **Recipient types:** `trigger_lead`, `tier2`, `tier2_excl_registered`, `attendees`, `attendees_waiting` (+ P21's `recipient_status_filter`).
- **Post-actions:** `promoteWaitingLeadsToInvited` (per-dispatch) and `executePostActions` reading `action_config.post_action_status_update`.
- **Scheduling infrastructure:** `crm_message_queue` table + `dispatch-queue` EF + `pg_cron` minute-tick (built in OVERNIGHT_M4_SCALE_AND_UI). NOT YET wired to the rule engine.

Rule 2.1 needs server-side change to `lead-intake/index.ts` (the EF still dispatches T1/T2 hardcoded — that was P8's documented out-of-scope item). Rules 2.4/2.5/2.6/2.7 each need a small new engine capability. Rule 2.3 maps cleanly onto the existing `event_registration` trigger with a slug change. T10 retirement is two SQL UPDATEs.

---

## 3. Success Criteria (Measurable)

### Part A — Engine extensions

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | New recipient type `cross_event_active_waitlist` exists in `resolveRecipients` | Returns leads with `crm_event_attendees.status IN ('המתנה','הוזמן')` for events OTHER than the triggering event whose `crm_events.status IN ('open_for_registration','waitlist_full')` for the same tenant. Filters out unsubscribed. | `grep -c "cross_event_active_waitlist" modules/crm/crm-automation-engine.js` ≥ 2; manual test against demo. |
| 2 | New post-action `attendee_upsert` writes a `crm_event_attendees` row | When rule's `action_config.post_action_attendee_upsert={status:'הוזמן'}` is set, after dispatch the engine UPSERTs the (event_id, lead_id) pair with that status. ON CONFLICT updates status only (does not overwrite payment_status, notes, etc.). | `grep -c "attendee_upsert" modules/crm/crm-automation-post-actions.js` ≥ 2; manual test. |
| 3 | New action_type `queue_send` enqueues `crm_message_queue` rows instead of immediate dispatch | When rule's `action_type='queue_send'` and `action_config.schedule={offset_days:N, send_time:'HH:MM'}` are set, engine inserts ONE row per resolved recipient × channel into `crm_message_queue` with `scheduled_at = event_date - offset_days + send_time` (Israel TZ), `status='queued'`, idempotent on (tenant_id, event_id, lead_id, template_slug, channel). | `grep -c "queue_send" modules/crm/crm-automation-engine.js` ≥ 2; SQL select on queue after firing rule. |
| 4 | Engine size remains ≤350 lines (Rule 12) | `wc -l` ≤ 350 | If exceeded, executor splits per Stop-Trigger #5 (extract `recipient-resolvers.js` or extend `crm-automation-post-actions.js`). |
| 5 | Engine deployed in browser load order: helpers → engine → post-actions → confirm-send | `crm.html` script tag order unchanged | `grep -A1 "crm-automation-engine" crm.html` shows post-actions tag immediately after. |

### Part B — Rule 2.1 (lead-intake EF server-side)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 6 | `lead-intake/index.ts` checks for active event after lead INSERT (success path only — duplicate path keeps T2) | EF queries `crm_events` for `tenant_id=lead.tenant_id AND status IN ('open_for_registration','waitlist_full') AND is_deleted=false` ORDER BY `event_date` ASC LIMIT 1 | `grep -c "open_for_registration\|waitlist_full" supabase/functions/lead-intake/index.ts` ≥ 1 |
| 7 | If active event found: dispatches T5 (`event_invite_new_*_he`) with `event_id` populated. If none: dispatches T1 (`lead_intake_new_*_he`) | Same outcome as today for T1; new T5 path | Test: insert demo event with status=`open_for_registration`, then create new lead via lead-intake → log row shows `event_invite_new_*_he`, not `lead_intake_new_*_he`. |
| 8 | After T5 dispatch succeeds, EF UPSERTs `crm_event_attendees(tenant_id, event_id, lead_id, status='הוזמן')` | Row exists post-send | `SELECT status FROM crm_event_attendees WHERE event_id=$1 AND lead_id=$2` → `הוזמן` |
| 9 | If no active event: existing T1 dispatch unchanged. Duplicate path (409) still fires T2. | Regression-tested | Re-run demo lead-intake test with no active event → T1 fires, no attendee row. |
| 10 | EF size ≤350 lines | `wc -l supabase/functions/lead-intake/index.ts` ≤ 350 | Stop-trigger #5. |
| 11 | EF deployed | New version active in Supabase | `mcp supabase.list_edge_functions` |

### Part C — Rule database wiring on demo tenant

7 rules total — 4 rewires + 3 new INSERTs.

| # | Criterion | Expected |
|---|-----------|----------|
| 12 | Rule "שינוי סטטוס: רשימת המתנה" (existing) — repointed: `action_config.template_slug` changes from `event_waiting_list` (V1 — fires on event_status_change=waiting_list) to remain as-is for the V1 status-change semantic. **Repurpose:** rename rule + retarget to fire ONLY on `event_registration` with `outcome='waiting_list'` so over-capacity registration fires T6. The V1 status-change firing is removed (Daniel directive: T6 is now the over-capacity registration response, not a bulk send on status change). | UPDATE 1 row; verify in DB. (Foreman note: this aligns with the existing rule #10 "הרשמה: אישור רשימת המתנה" — see below.) |
| 13 | Rule #10 existing "הרשמה: אישור רשימת המתנה" — `action_config.template_slug` changes from `event_waiting_list_confirmation` → `event_waiting_list` (T6). | 1 row updated; the slug `event_waiting_list_confirmation` is now orphan — keep its rows in `crm_message_templates` (not touched in this Rung) but no rule fires it. |
| 14 | Rule "שינוי סטטוס: הזמנה ממתינים" — repointed: trigger changes from `event_status_change` to `event_status_change` (same) but RECIPIENT changes from `attendees_waiting` to NEW `cross_event_active_waitlist`. Slug stays `event_invite_waiting_list` (T7). | UPDATE 1 row; verify recipient_type. |
| 15 | Rule "שינוי סטטוס: 2-3 ימים לפני" — repointed: `action_type` changes from `send_message` to NEW `queue_send`. `action_config` adds `schedule={offset_days:3, send_time:'10:00'}`. `recipient_type='attendees'` with `recipient_status_filter=['confirmed']` (status `מאושר`). | UPDATE 1 row. |
| 16 | Rule "שינוי סטטוס: יום אירוע" — same shape as #15 with `schedule={offset_days:0, send_time:'08:00'}`. | UPDATE 1 row. |
| 17 | NEW Rule 2.4: "אירוע פתח להרשמה - הזמנת רשימת המתנה" — trigger `event_status_change`, condition `status_equals: registration_open`, `recipient_type='cross_event_active_waitlist'`, slug T7 (`event_invite_waiting_list`), post-action `attendee_upsert={status:'הוזמן'}` for the NEW event. | INSERT 1 row. |
| 18 | NEW Rule 2.7 (manual-move): trigger NEW `attendee_moved` (manual, fires from RPC in Rung 3), condition `status_equals: <payment_status>`, branched: 2 separate rules — `attendee_moved_unpaid` fires `event_attendee_moved_unpaid_*_he`, `attendee_moved_paid` fires `event_attendee_moved_paid_*_he`. Both with `recipient_type='trigger_lead'`. | INSERT 2 rows (one per branch). |
| 19 | Rule 2.2 mechanism: existing rule "שינוי סטטוס: הזמנה חדשה" (event_status_change → invite_new) retains its slug `event_invite_new` (T5). The lead-intake server-side T5 path (criterion #8) handles the auto-attendee-upsert there. The bulk status-change-driven T5 send (existing rule) gains `post_action_attendee_upsert={status:'הוזמן'}`. | UPDATE 1 row to add post-action. |
| 20 | T10 retirement: rule "שינוי סטטוס: אירוע נסגר" `is_active` flips to `false` (or rule slug repoints to `event_2_3d_before` etc. — Foreman recommends `is_active=false` since the event_closed flow was retired by Daniel). | UPDATE 1 row. |
| 21 | T10 templates `is_active=false`: `event_closed_sms_he` + `event_closed_email_he` rows for demo. | UPDATE 2 rows. |
| 22 | Rule count after this Rung on demo: 11 active rules (10 existing − 1 retired + 1 new 2.4 + 2 new 2.7 = 12; minus 1 rule 2.3 reshape = 11. Executor MUST baseline pre-state and verify post-state arithmetic.) | `SELECT count(*) FROM crm_automation_rules WHERE tenant_id='demo-uuid' AND is_active=true` |

### Part D — End-to-end smoke test on demo

| # | Criterion | Expected |
|---|-----------|----------|
| 23 | Lead-intake EF: insert new lead while active event exists → log row shows T5 sent + attendee row created with status `הוזמן`. | `SELECT slug FROM crm_message_log JOIN crm_message_templates ... WHERE created_at > <test_start>` shows `event_invite_new_*_he`. Attendee row exists. |
| 24 | Lead-intake EF: insert new lead while NO active event exists → T1 sent, no attendee row. | Reverse of #23. |
| 25 | Over-capacity registration: register a lead via `register_lead_to_event` to event with `current_attendees >= max_capacity` → T6 fires (not standard confirmation), attendee status `המתנה`. | Curl + log query. |
| 26 | Parallel event opens: create event B with status `planning` → flip to `registration_open` (with event A already at `registration_open` and ≥1 lead on waitlist of A) → T7 fires to event A's waitlist leads referencing event B. Attendee upsert creates rows on event B with status `הוזמן`. | SQL: log rows + attendee rows. |
| 27 | Scheduled rule queue insertion: when an attendee becomes `confirmed` for event with `event_date='2026-05-10', booking_fee=50`, queue rows appear with `scheduled_at='2026-05-07 10:00:00+03'` (T8) and `scheduled_at='2026-05-10 08:00:00+03'` (T9), `status='queued'`. | `SELECT scheduled_at, template_slug FROM crm_message_queue WHERE event_id=$1 AND lead_id=$2` |
| 28 | Idempotency: re-firing the trigger does not produce duplicate queue rows. | Same SELECT yields same row count. |
| 29 | T10 dead path: change event status to `closed` → 0 dispatch (rule inactive). | 0 new log rows. |
| 30 | All renders show ZERO literal `%X%` (Rung 1 plumbing carries through). | Grep log rows. |

### Part E — Repo + DB hygiene

| # | Criterion | Expected |
|---|-----------|----------|
| 31 | Iron Rule 31 integrity gate passes at every commit. | exit 0 |
| 32 | Demo baseline restored at session end (test data cleaned). | Same lead/event/attendee counts as Rung 1 close + 1 new active event needed for criterion #25 (or scrubbed if Daniel prefers) |
| 33 | All approved phones used (`+972537889878`, `+972503348349`, `+972507168471`). | No other phone in any test path. |
| 34 | Commits produced | 5–8 commits |

---

## 4. Autonomy Envelope

**HIGH AUTONOMY** with these checkpoints (reports, not asks):

- After Part A (engine extensions, ~commits 1-2): report file sizes + sanity test of new recipient_type.
- After Part B (lead-intake EF deploy): report deploy success + lead-intake regression test.
- After Part D (smoke test): full report including queue contents and log diff.

### CAN do without asking

- Modify `crm-automation-engine.js`, `crm-automation-post-actions.js`.
- Modify `supabase/functions/lead-intake/index.ts`.
- Deploy `lead-intake` EF (this SPEC pre-authorizes the redeploy).
- Read/write SQL on demo tenant per Parts C and D.
- INSERT/UPDATE rows in `crm_automation_rules` for demo.
- INSERT into `crm_message_queue` via the rule engine path (engine writes — not the executor directly).
- Update `SESSION_CONTEXT.md`, `go-live/ROADMAP.md`, the existing `seed-automation-rules-demo.sql` (regenerate it as a snapshot).
- Browser QA on `localhost:3000/crm.html?t=demo`.

### REQUIRES stopping

- Any DDL — including any `crm_message_queue` schema change. Rung 2 must use the queue table as-is. If a missing column blocks `queue_send` (e.g., no `scheduled_at` field) — STOP and surface; that becomes a sub-spec.
- Any change to `register_lead_to_event` RPC — that's Rung 3.
- Any change to `dispatch-queue` EF beyond what's already supported — STOP and design with Foreman.
- Any change to V2 template copy.
- Any UPDATE on production tenant `83bd9d0a-...` (Prizma).
- More than 8 commits — scope creep signal.
- Rules touching trigger types not in `TRIGGER_TYPES` map without first registering them.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9)

1. `crm_message_queue` table schema does NOT contain the columns the engine needs for `queue_send` insert (executor MUST verify columns at start: at minimum `tenant_id, event_id, lead_id, channel, template_slug, scheduled_at, status, variables, language`).
2. Lead-intake EF regression — duplicate path stops firing T2 — STOP, do not deploy.
3. Engine file or lead-intake EF exceeds 350 lines after edits.
4. Any rule INSERT/UPDATE writes a `template_slug` that does not exist in `crm_message_templates` for demo (post-Rung-1 there should be 22 base slugs).
5. Smoke test (Part D) shows ANY misfire — wrong template, wrong recipient list, missing attendee upsert — STOP, do not commit.
6. Iron Rule 31 fails at any commit.
7. `mcp supabase.execute_sql` returns an unexpected schema for `crm_event_attendees` status enum — Daniel confirmed status values include `מאושר`, `המתנה`, `הוזמן`, `מבוטל-עבר`. If the live DB rejects any of these, STOP.

---

## 6. Rollback Plan

- **Code:** `git revert` the Rung 2 commits in reverse order. Engine + post-actions revert cleanly; lead-intake EF redeploys to previous version.
- **Lead-intake EF:** Supabase keeps version history — one-click rollback.
- **Rules:** restore from snapshot `seed-automation-rules-demo.sql` (executor regenerates this as commit 1's first task to capture pre-state).
- **Templates:** untouched in Rung 2 except T10 `is_active` flip — `UPDATE crm_message_templates SET is_active=true WHERE slug LIKE 'event_closed_%_he' AND tenant_id='demo-uuid'`.
- **Queue rows:** `DELETE FROM crm_message_queue WHERE tenant_id='demo-uuid' AND created_at > <session start>` — append-only, harmless.

---

## 7. Out of Scope

- `register_lead_to_event` RPC modifications — Rung 3.
- Manual-move admin UI dialog with toggle — Rung 3.
- Storefront / public registration form — unaffected.
- Production tenant migration of rules — separate cutover SPEC (P7).
- Visual flow builder, complex AND/OR conditions, action chains beyond post-action attendee_upsert — Level 2/3.
- WhatsApp channel — awaiting Meta API.
- Russian/English variants — unaffected.
- `crm_message_queue` schema changes — out of scope; if needed, escalate to Foreman.
- MODULE_MAP / GLOBAL_MAP updates — Integration Ceremony.
- Adjusting `dispatch-queue` EF behavior — separate SPEC if needed.

---

## 8. Expected Final State

### Modified files

| File | Current | Expected | Change |
|------|---------|----------|--------|
| `modules/crm/crm-automation-engine.js` | 349 | ~340 (≤350; refactor if needed) | + `cross_event_active_waitlist` recipient resolver, + `queue_send` action type branch. May extract recipient resolvers to a sibling file if necessary. |
| `modules/crm/crm-automation-post-actions.js` | 101 | ~140 | + `attendee_upsert` post-action. |
| `supabase/functions/lead-intake/index.ts` | TBD (executor verifies) | ≤350 | + active-event lookup + T5/T1 branch + attendee upsert on T5 path. |

### New files

- `modules/crm/crm-automation-recipient-resolvers.js` — IF engine would exceed 350 lines. Optional split.

### DB state (demo tenant only)

- `crm_automation_rules`: net change reflects criteria #12-#21. Executor records pre/post counts.
- `crm_message_queue`: 0 rows added in non-test execution; smoke test #27 adds + cleans test rows.
- `crm_message_templates`: only T10 `is_active=false` flip (criterion #21). Bodies unchanged from Rung 1.
- `crm_event_attendees`: smoke test creates rows, cleans afterwards.

### Docs

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P5_V2_REBUILD_RUNG2_RULES_REWIRE CLOSED.
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — close the rung.
- `modules/Module 4 - CRM/go-live/seed-automation-rules-demo.sql` — regenerate snapshot capturing the new rule set.

---

## 9. Commit Plan

| # | Message | Files |
|---|---------|-------|
| 1 | `feat(crm): extend automation engine with cross-event-waitlist recipient + queue_send action` | `crm-automation-engine.js` + (optional) `crm-automation-recipient-resolvers.js` + `crm.html` script tag |
| 2 | `feat(crm): add attendee_upsert post-action for invitation rules` | `crm-automation-post-actions.js` |
| 3 | `feat(lead-intake): conditionally dispatch T5 with attendee upsert when active event exists` | `supabase/functions/lead-intake/index.ts` (+ deploy artifact note) |
| 4 | `feat(crm): rewire automation rules for V2 message flow on demo tenant` | DB SQL (rules table updates + inserts), regenerated `seed-automation-rules-demo.sql` |
| 5 | `chore(crm): retire T10 — deactivate event_closed rule and templates on demo` | DB SQL (1 rule + 2 templates flipped) |
| 6 | `docs(crm): mark P5_V2_REBUILD_RUNG2_RULES_REWIRE CLOSED` | `SESSION_CONTEXT.md` + `ROADMAP.md` |
| 7 | `chore(spec): close P5_V2_REBUILD_RUNG2_RULES_REWIRE with retrospective` | `EXECUTION_REPORT.md` + `FINDINGS.md` |

Budget: 7 commits ± 1 fix.

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verify |
|------------|--------|--------|
| Rung 1 CLOSED | ⚠️ HARD BLOCKER | Foreman confirms before activating this Rung |
| Rung 1 `injectEventVariables` deployed | ⚠️ confirms above | `mcp supabase.get_edge_function send-message` shows new version |
| `crm_message_queue` table has columns: `tenant_id, event_id, lead_id, channel, template_slug, scheduled_at, status, variables, language, created_at` (or equivalent) | ⚠️ EXECUTOR VERIFIES STEP 1 | `SELECT column_name FROM information_schema.columns WHERE table_name='crm_message_queue' ORDER BY ordinal_position` — capture in EXECUTION_REPORT pre-state |
| `dispatch-queue` EF currently active and draining | ✅ VERIFIED | OVERNIGHT_M4_SCALE_AND_UI close |
| `crm_automation_rules` UNIQUE (tenant_id, name) constraint exists | ✅ VERIFIED | `001_crm_schema.sql:259` |
| Demo lead with approved phone exists | ✅ STABLE | P10 baseline |
| Demo event seedable for tests | ✅ STABLE | P9 confirmed event creation flow |

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| WORKING_TREE_RECOVERY FR Proposal 1 — STATE_SNAPSHOT before destructive | Pre-state baseline captured for rules + templates + queue + attendees | ✅ Criterion #22 + Dependencies row |
| WORKING_TREE_RECOVERY FR Proposal 2 — Execution-environment parity | Smoke tests run against deployed EF and live DB | ✅ Part D |
| POST_WAITING_LIST_FIXES F1 — pg_get_functiondef snapshot before RPC edits | N/A — no RPC changes here (Rung 3) |
| OVERNIGHT_M4_SCALE_AND_UI — phone allowlist | All test sends use approved phones | ✅ Stop-trigger #4 |
| EVENT_CLOSE_COMPLETE_STATUS_FLOW — post-actions as first-class | New `attendee_upsert` post-action follows the established pattern in `crm-automation-post-actions.js` | ✅ Part A criterion #2 |
| **Cross-Reference Check 2026-04-28:** | | |
| — `cross_event_active_waitlist` recipient_type | 0 hits → unique | ✅ |
| — `attendee_upsert` post-action key | 0 hits → unique | ✅ |
| — `queue_send` action_type | 0 hits → unique | ✅ |
| — `attendee_moved` trigger_event | 0 hits → unique (note: Rung 3 will fire this from RPC) | ✅ |
| — Rule names (3 new): "אירוע פתח להרשמה - הזמנת רשימת המתנה", "העברת משתתף ידנית - לא שילם", "העברת משתתף ידנית - שילם" | 0 hits in seed → unique within tenant | ✅ |
| **0 collisions. Cross-reference complete.** | | |

---

## 12. Pre-Merge Checklist (Iron Rule 31)

- Before any commit: `npm run verify:integrity` exit 0.
- Before Part B EF deploy: confirm previous lead-intake EF version tagged for rollback.
- Before final push: `git status` clean, integrity gate clean, `seed-automation-rules-demo.sql` matches live DB rules for demo (snapshot fidelity).

---

## 13. Technical Design

### 13.1 New recipient type — `cross_event_active_waitlist`

Pseudo-code in engine:

```js
case 'cross_event_active_waitlist': {
  var triggerEventId = triggerData.eventId;
  var att = await sb.from('crm_event_attendees')
    .select('lead_id, crm_leads(id, full_name, phone, email, unsubscribed_at)')
    .eq('tenant_id', tenantId)
    .in('status', ['המתנה','הוזמן'])
    .neq('event_id', triggerEventId);
  // Filter: only attendees whose event is currently active
  var eventIds = (att.data || []).map(r => r.event_id /* TODO confirm column name */);
  var activeEvents = await sb.from('crm_events')
    .select('id')
    .in('id', eventIds)
    .in('status', ['open_for_registration','waitlist_full']);
  var activeSet = new Set((activeEvents.data || []).map(e => e.id));
  return (att.data || [])
    .filter(r => activeSet.has(r.event_id))
    .map(r => r.crm_leads)
    .filter(l => l && !l.unsubscribed_at);
}
```

### 13.2 New action_type — `queue_send`

```js
if (rule.action_type === 'queue_send') {
  var schedule = rule.action_config.schedule || {};
  var offsetDays = parseInt(schedule.offset_days, 10) || 0;
  var sendTime = schedule.send_time || '10:00';
  var event = triggerData.event; // engine fetches if not provided
  var dt = computeIsraelLocalDateTime(event.event_date, offsetDays, sendTime);
  // For each resolved recipient × channel: INSERT into crm_message_queue with
  // ON CONFLICT (tenant_id, event_id, lead_id, template_slug, channel) DO NOTHING
  for (var lead of recipients) {
    for (var ch of rule.action_config.channels || ['sms','email']) {
      await sb.from('crm_message_queue').insert({
        tenant_id: tenantId,
        event_id: event.id,
        lead_id: lead.id,
        channel: ch,
        template_slug: rule.action_config.template_slug + '_' + ch + '_he',
        scheduled_at: dt.toISOString(),
        status: 'queued',
        variables: { /* engine-built */ },
        language: 'he'
      });
    }
  }
  return { fired: 1, queued: recipients.length * channels.length };
}
```

`computeIsraelLocalDateTime(date, offsetDays, sendTime)`: anchor `event_date` as Israel-local date, subtract `offsetDays`, set time-of-day to `sendTime`. Use `+03:00` offset (Israel doesn't observe DST during the SuperSale window — confirmed against Daniel's calendar).

**Idempotency:** rely on a UNIQUE INDEX `(tenant_id, event_id, lead_id, template_slug, channel)` if it exists; otherwise pre-SELECT check. Executor verifies index existence at Step 1 and adds it (Rung 2 IS authorized to add this single index since it's purely additive and protects the queue rule).

### 13.3 New post-action — `attendee_upsert`

```js
async function attendeeUpsert(planItems, results, ruleConfig) {
  var status = ruleConfig.post_action_attendee_upsert?.status;
  if (!status) return { upserted: 0 };
  // Group by (event_id, lead_id) where dispatch succeeded
  var pairs = {};
  planItems.forEach((it, i) => {
    var ok = results[i]?.value?.ok;
    if (!ok || !it.event_id || !it.lead_id) return;
    pairs[it.event_id + '|' + it.lead_id] = { event_id: it.event_id, lead_id: it.lead_id };
  });
  for (var p of Object.values(pairs)) {
    await sb.from('crm_event_attendees').upsert(
      { tenant_id: tenantId(), event_id: p.event_id, lead_id: p.lead_id, status: status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,lead_id', ignoreDuplicates: false }
    );
  }
  return { upserted: Object.keys(pairs).length };
}
```

### 13.4 Lead-intake EF extension

After successful INSERT into `crm_leads` (success path only, NOT duplicate):

```ts
// Existing: dispatch lead_intake_new_sms_he + _email_he
// NEW:
const { data: events } = await db
  .from('crm_events')
  .select('id, name, event_date, max_capacity, booking_fee')
  .eq('tenant_id', tenantId)
  .in('status', ['open_for_registration', 'waitlist_full'])
  .eq('is_deleted', false)
  .order('event_date', { ascending: true })
  .limit(1);
const activeEvent = events?.[0];

if (activeEvent) {
  // T5 path
  await dispatch('event_invite_new', { eventId: activeEvent.id });
  await db.from('crm_event_attendees').upsert(
    { tenant_id: tenantId, event_id: activeEvent.id, lead_id: leadId, status: 'הוזמן' },
    { onConflict: 'event_id,lead_id' }
  );
} else {
  // T1 path — existing behavior
  await dispatch('lead_intake_new');
}
```

### 13.5 Rule database snapshot

After this Rung, executor regenerates `go-live/seed-automation-rules-demo.sql` reflecting the live state. The snapshot serves rollback + onboarding parity for production.

### 13.6 Smoke test sequence

1. Capture pre-state (rule count, template count, attendee count, queue count, log count).
2. Test #23: insert demo event with status=registration_open, max_capacity=2; insert lead via lead-intake → verify T5 + attendee row.
3. Test #25: with the event now at 2 attendees (max), register a 3rd lead via `register_lead_to_event` → verify T6 + attendee status=`המתנה`.
4. Test #26: create event B, flip to registration_open → verify T7 fires to event A's `המתנה` lead, attendee upsert on event B with status `הוזמן`.
5. Test #27: confirm an attendee for an event with future date (≥4 days) → verify queue rows for T8 + T9 with correct `scheduled_at`.
6. Test #28: re-fire — no new queue rows.
7. Test #29: change event status to `closed` → 0 dispatch (T10 retired).
8. Cleanup: delete test data, restore demo baseline.

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `crm_message_queue` lacks UNIQUE index for idempotency → duplicate scheduled rows | MEDIUM | HIGH | Executor adds index in commit 1 if missing. Daniel pre-authorized this single additive index in §4 envelope. |
| Lead-intake EF regression on duplicate path | LOW | CRITICAL | Stop-trigger #2; criterion #9 explicit regression test. |
| `cross_event_active_waitlist` resolver pulls from past/closed events | MEDIUM | HIGH (sends wrong audience) | Resolver explicitly filters by `crm_events.status IN ('open_for_registration','waitlist_full')`. Criterion #1 + smoke #26 verify. |
| Engine file exceeds 350 lines | MEDIUM | LOW | Extract to `crm-automation-recipient-resolvers.js` if needed. Stop-trigger #3. |
| Israel-TZ math off by an hour (DST edge) | LOW | LOW | Anchor `+03:00`; SuperSale events occur outside DST shifts in May 2026. Document assumption in EXECUTION_REPORT. |
| Trigger `attendee_moved` fires from a context (Rung 3 RPC) that doesn't exist yet | KNOWN | NONE | Rule 2.7 rows are inert until Rung 3 RPC fires the trigger. Inserting them in Rung 2 is safe — they sit in DB until called. |
| Rule renames break the existing CRM rules UI labels | LOW | LOW | Rule UI displays the `name` column verbatim; Hebrew names match what Daniel expects from the rule editor. |
| `seed-automation-rules-demo.sql` snapshot drift vs live DB after Rung 2 | LOW | MEDIUM | Executor regenerates snapshot in commit 4 from `mcp supabase.execute_sql` SELECT, not by hand. |

---

*End of SPEC — P5_V2_REBUILD_RUNG2_RULES_REWIRE*
