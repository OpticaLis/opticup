# Diagnostic Report — Event 24 Lead Funnel Shortfall

> **SPEC:** `M4_EVENT_24_LEAD_FUNNEL_DIAGNOSTIC`
> **Mode:** Read-only. Zero DB writes; zero code/EF changes.
> **Authored:** 2026-05-14 by opticup-executor.
> **Status:** Final.

---

## 0. Executive Summary

**The funnel did not "drop 4-7×". The funnel shape changed.** Events 20/22/23 (baseline 56-90 attendees) were populated by a now-deprecated Monday.com/Make pipeline that wrote attendee rows directly at registration time. Event 24 is the **first event** that ran end-to-end on the new architecture: `lead-intake` Edge Function → `crm_automation_rules` broadcasts → manual form completion via SMS link. The 12 attendees on event 24 are a measurement of the new pipeline's actual conversion rate, not a regression.

**The 154 "invited" leads are NOT failed registrations.** `crm_leads.status='invited'` was set as a *broadcast-side-effect* (the recipient cohort marker for the `event_registration_open` rule) — not as evidence of an attempted registration. Of the 154 leads who received the broadcast on 2026-05-12 16:42 IDT, **12 (7.8%) completed the form** within ~10 hours; **142 did not**. That 7.8% is the funnel KPI to act on.

**Root cause is not a code bug.** The 154 invited leads have ZERO attendee rows because the automation rule that fired (`registration_open` → tier2-broadcast) is intentionally a *messaging-only* rule — unlike the sibling `invite_new` rule which carries `post_action_attendee_upsert: {status:'invited'}` in its `action_config`. Event 24 transitioned `planning → registration_open` directly and **never passed through `invite_new`**, so no attendee-creation side-effect ever fired in bulk. The EF's T5 path (which DOES create attendee rows) only fired for 3 fresh leads after event 24 was already published — and all 3 got correct attendee rows.

**Top recommended fix (NOT executed in this SPEC):** treat the `registration_open` broadcast as informational and re-route the rescheduled event through `invite_new` first (or extend the `registration_open` rule's `action_config` with a `post_action_attendee_upsert` block matching `invite_new`'s contract), so attendee rows materialize at broadcast time and the funnel KPI becomes "attendee rows / broadcast cohort" rather than "lead.status=invited / 12 registrations".

---

## 1. Method

Read-only investigation against live prizma data (tenant_id `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`). All SQL was `SELECT`-only. Edge Function bodies (`supabase/functions/lead-intake/dispatch.ts`, `index.ts`) read from git-tracked source. RPC `register_lead_to_event` body read via `pg_get_functiondef`. Automation rules read from `crm_automation_rules`. No writes to any table; no deploys; no code edits.

---

## 2. Measured Facts

### 2.1 Window cohort (created_at ∈ [2026-05-03, 2026-05-14])

| `crm_leads.status` | total | active | soft-deleted |
|---|---|---|---|
| invited | 154 | 154 | 0 |
| new | 18 | 1 | 17 |
| unsubscribed | 8 | 8 | 0 |
| confirmed | 4 | 4 | 0 |
| waiting | 4 | 3 | 1 |
| pending_terms | 1 | 0 | 1 |
| **Total** | **189** | **170** | **19** |

Confirms the Foreman's pre-flight: 189 leads total, 154 active "invited".

### 2.2 Lead-to-attendee reconciliation (Criterion 2)

For each active lead in the window, does it have ANY `crm_event_attendees` row (any event, any status)?

| lead_status | leads | with_any_attendee | without_attendee | with_event24_attendee |
|---|---|---|---|---|
| invited | 154 | **0** | **154** | 0 |
| unsubscribed | 8 | 0 | 8 | 0 |
| confirmed | 4 | 4 | 0 | 4 |
| waiting | 3 | 3 | 0 | 3 |
| new | 1 | 0 | 1 | 0 |

**Every one of the 154 "invited" leads has zero attendee rows.** The 7 with attendee rows for event 24 (4 confirmed + 3 waiting) are exactly the leads that completed the form (or were promoted/migrated through the RPC).

### 2.3 Event 24 details (Criterion 3)

| | |
|---|---|
| id | `a7c9f174-a099-48b7-88bb-e4d0fa6236e2` |
| event_number | 24 |
| name | אירוע המותגים - מאי 2026 |
| event_date | 2026-05-15 (Friday) |
| start_time | 09:00 |
| status | `closed` |
| max_capacity | 50 |
| created_at | 2026-05-03 11:16 UTC |
| campaign_id | `32423133-5f25-4ce4-8bf2-66207c29a50f` |
| **Attendee rows alive** | **12** (10 `registered`, 2 `invited`; +1 soft-deleted) |
| Attendee rows ever | 13 |

Per-event creation window (Criterion 3 baseline):

| event | name | date | event_status | attendee_rows | rows_in_window |
|---|---|---|---|---|---|
| 20 | אירוע המכירות פברואר 26 | 2026-02-20 | completed | 56 | 57 (all bulk-imported 2026-05-03 morning) |
| 22 | אירוע המותגים מרץ 2026 | 2026-03-27 | completed | 90 | 91 (bulk-imported) |
| 23 | אירוע חיסול מלאי אפריל 2026 | 2026-04-30 | completed | 73 | 73 (bulk-imported) |
| 24 | אירוע המותגים - מאי 2026 | 2026-05-15 | closed | 12 | 13 |

**Apples-to-oranges caveat:** events 20/22/23 attendee rows were bulk-migrated from Monday.com on 2026-05-03 09:29-13:19 UTC (single-second timestamps, source=`monday_legacy` / `monday_tier1_import`). Those numbers reflect the OLD Monday/Make funnel's lifetime conversion, not the new pipeline. The new pipeline (lead-intake EF + automation rules + form completion) has no apples-to-apples baseline yet — event 24 IS the first sample.

### 2.4 Timeline of event 24 + activity (Criterion 4)

`audit_log` does not exist in this schema. Reconstructed timeline via `crm_automation_runs.trigger_data`, `crm_message_log.created_at`, and `crm_event_attendees.created_at`:

| Timestamp (UTC) | Event |
|---|---|
| 2026-05-03 09:29 | Bulk import #1 (`monday_legacy`, 57 leads, all single-second). UTM=`fb` campaigns supersaletreview / supersaleugc_name |
| 2026-05-03 10:35 | Event 24 row materializes in history (event_created timestamp shared with 20/22/23) |
| 2026-05-03 10:20-13:19 | Bulk import #2 (`monday_tier1_import`, 6 leads) |
| 2026-05-03 11:16 | Event 24 `created_at` recorded (likely in `planning` status) |
| 2026-05-03 14:02 → 2026-05-12 15:20 | New fresh leads arrive via `lead-intake` EF (n=91, source=`shortcode_lead_form` with full T1 dispatch). All 91 receive `lead_intake_new_sms_he`+`lead_intake_new_email_he` because the EF's active-event predicate (`status IN ('registration_open','waiting_list')`) returned no row — event 24 was still in `planning` |
| **2026-05-12 03:54** | First `event_status_change → registration_open` automation_run fires (rule `8b2edc76`). Rule pulls 1999 tier2 leads filtered by `lead.status='waiting'`. msg_sent=0 (likely held in queue) |
| 2026-05-12 03:55, 03:56, 15:49, 16:10, 16:10:32, 16:20:35, 16:20:57, 16:41:58, 16:42:44 | EIGHT additional `registration_open` runs fire on the same event ID (some on `total_recipients=2325`, some on `2295`). Multiple status-toggle events captured in `trigger_data.event.status` snapshots (`"status":"planning"` even after the rule's `newStatus` says `registration_open` — points to status oscillation or trigger replay) |
| 2026-05-12 13:09-15:20 | First T5 / event_registration_open messages start landing in `crm_message_log` (template_id NULL for 251 of them — likely test fires / broadcast-engine direct sends) |
| 2026-05-12 16:20:35 → 16:41:58 | The single successful mass-broadcast (run `c633310a-...`) sends **2,292 of 2,295 attempted messages** in ~30 minutes; this is the run that actually delivered SMS+email to the entire tier2 audience |
| 2026-05-12 16:21:00 → 17:59:18 | 154 leads in our window receive `event_registration_open_{sms,email}_he` (intersected from the 2292) |
| 2026-05-12 16:55 | First attendee row created for event 24 (`status='invited'`, method `form`) |
| 2026-05-12 18:05, 18:57, 19:24 | THREE T5 (`event_invite_new`) automation_runs fire from `dispatchFreshLead` — three new leads arrived AFTER publish; each got SMS+email AND an attendee row with `status='invited'`. All three flowed correctly. |
| 2026-05-13 03:42 | LAST attendee row created (50 hours before event start) |
| (later) | Event status changes to `closed` (not captured in automation_runs) |

### 2.5 `dispatchFreshLead()` predicate (Criterion 5) — VERBATIM

`supabase/functions/lead-intake/dispatch.ts` lines 144-176:

```typescript
export async function dispatchFreshLead(
  db: any, tenantId: string, leadId: string, name: string, phone: string, email: string | null,
): Promise<void> {
  const { data: ev } = await db.from("crm_events")
    .select("id").eq("tenant_id", tenantId)
    .in("status", ["registration_open", "waiting_list"])
    .eq("is_deleted", false)
    .order("event_date", { ascending: true })
    .limit(1).maybeSingle();
  if (ev?.id) {
    await dispatchIntakeMessages(db, tenantId, leadId, "event_invite_new", name, phone, email, ev.id);
    await db.from("crm_event_attendees").upsert(
      { tenant_id: tenantId, event_id: ev.id, lead_id: leadId, status: "invited" },
      { onConflict: "tenant_id,lead_id,event_id", ignoreDuplicates: false },
    );
    try {
      await db.from("crm_leads")
        .update({ status: "invited", updated_at: new Date().toISOString() })
        .eq("id", leadId).eq("tenant_id", tenantId);
    } catch (e) { console.error("..."); }
  } else {
    await dispatchIntakeMessages(db, tenantId, leadId, "lead_intake_new", name, phone, email);
  }
}
```

**Active-event predicate:** `status IN ('registration_open', 'waiting_list') AND is_deleted = false`, ordered by `event_date ASC LIMIT 1`.

**Edge cases that return no event (or wrong event):**
1. **Event in `planning` / `draft` / `closed` / `completed` status → no match.** Event 24 was in `planning` for the May 3-11 inflow → all 91 fresh leads went down the ELSE branch (T1 lead_intake_new) and got NO attendee row. **This is the dominant path.**
2. **Event in `invite_new` or `invite_waiting_list` status → no match.** Those statuses are intermediate (per `crm_automation_rules` row contents). If an event is parked at `invite_new` to send invitations, fresh leads arriving during that window do NOT match the EF predicate — surprising semantics.
3. **Multiple eligible events → picks earliest `event_date`.** Reasonable for tenants with one active event at a time; would silently mis-route a new lead to the wrong event for tenants running parallel events.
4. **The upsert at line 153 is fire-and-forget — no `.select()`, no error check.** A silent RLS/FK failure on attendee insertion would still allow the lead.status='invited' update at line 167 to succeed, creating exactly the orphan-invited symptom we see. **However**, that's NOT what happened here: the lead.status='invited' update is INSIDE the `if (ev?.id)` block, so when no active event matches, lead.status stays `'new'`. The orphan-invited leads got their `status='invited'` from somewhere else.
5. **`maybeSingle()` quietly returns null on either zero rows OR an unexpected multi-row result. If two events were `registration_open` simultaneously, the SDK throws and the EF falls to T1.** Not observed today but a latent landmine.

### 2.6 `register_lead_to_event` RPC (Criterion 6)

Read in full via `pg_get_functiondef`. SECURITY DEFINER, JWT-claim tenant gate, FOR UPDATE lock on event row. Behavior summary:

- If lead already has an `invited/waiting_list` attendee on a DIFFERENT non-closed event → **auto-moves** via `move_attendee_between_events`. *(could surprise users if Daniel toggles event status and a lead bounces between two events)*
- If lead already has an attendee on THIS event:
  - `invited` → promotes to `registered` (capacity allowing — note: as of 2026-05-13 hotfix `M4_INVITED_GHOST_ATTENDEE_FIX`, `invited` no longer counts toward capacity), else `waiting_list` (or `event_closed` if event status=closed)
  - any other live status → returns `already_registered` (idempotent)
  - soft-deleted → re-activates as `registered`
- Else inserts fresh row: `registered` if under cap, `waiting_list` if at cap, `event_closed` if event closed.

**RPC predicate that picks event status:** uses `v_event.status` (the event row already fetched FOR UPDATE) only to choose between `waiting_list` vs `event_closed` on capacity hit. It does NOT pick which event to register to — the event_id is a parameter. So this RPC is invoked from a known-event context (the form, the admin UI) and cannot misroute a registration.

**Conclusion: the RPC is innocent of the funnel shortfall.** The form-completion path (the 12 successful registrations) went through this RPC correctly.

### 2.7 Make / webhook hypothesis (Criterion 7)

Grep across `js/`, `modules/`, `supabase/functions/`, `shared/`, `campaigns/`, `scripts/`, `migrations/` for `crm_event_attendees` INSERT operations: **32 files matched**. Excluding migration audit trails, SPEC docs, and rollback scripts, the live INSERT paths are:

1. **`supabase/functions/lead-intake/dispatch.ts` line 153** — the upsert in `dispatchFreshLead`. Fired 3× for event 24 (post-publish T5 leads).
2. **`register_lead_to_event` RPC** — fired ~12× for event 24 (form completions).
3. **`move_attendee_between_events` RPC** — moves rows between events, doesn't create from scratch.
4. **`campaigns/supersale/scripts/import-monday-builders.mjs`** — Monday.com bulk-import script (historical, ran on 2026-05-03 — the source of the events 20/22/23 attendee rows). Has NOT run for event 24.

**No Make/webhook code path was found that creates attendee rows.** The Make scenarios (where they still exist) feed `crm_leads` only, not attendees. This rules out hypothesis (b) from the SPEC §2 ("154 leads were invited to a different event via Make").

### 2.8 Sample 5 orphan-invited leads (Criterion 8)

Picked the 5 oldest orphan-invited leads:

| Lead | created_at | source | utm_campaign | total_msgs | templates | first_msg | last_msg |
|---|---|---|---|---|---|---|---|
| לירן קריכלי | 2026-05-03 09:29:20 | monday_legacy | supersaletreview | 3 | event_registration_open_{sms,email}_he | 2026-05-12 13:43 | 2026-05-12 17:58 |
| שירה מרדכי | 2026-05-03 09:29:20 | monday_legacy | supersaleugc_name | 4 | event_registration_open_{sms,email}_he | 2026-05-12 13:42 | 2026-05-13 06:31 |
| אוראל יעדן | 2026-05-03 09:29:20 | monday_legacy | (null) | 4 | event_registration_open_{sms,email}_he | 2026-05-12 13:42 | 2026-05-13 06:31 |
| נור עלי | 2026-05-03 09:29:20 | monday_legacy | supersaletreview | 3 | event_registration_open_{sms,email}_he | 2026-05-12 13:43 | 2026-05-12 17:57 |
| שרה מיכאלי | 2026-05-03 09:29:20 | monday_legacy | supersaleugc_name | 3 | event_registration_open_{sms,email}_he | 2026-05-12 13:10 | 2026-05-12 16:47 |

**Strikingly consistent pattern:**
- All 5 sit dormant for 9 days after import (no messages sent)
- All 5 receive their FIRST contact on 2026-05-12 (the day registration opened)
- The first contact is the registration-open broadcast — not a welcome message, not an event-invite — they're meeting the brand for the first time WITH the registration ask
- None completed the form

This profile (monday_legacy / fb / supersale UTM) is the dominant pattern in the orphan cohort: **57 of 154** are bulk-imported Monday legacy leads, **79 more** are `shortcode_lead_form` source with `acquired_via` NULL (likely older imports with metadata gaps).

### 2.9 Conversion math

| Metric | Value |
|---|---|
| Leads receiving `event_registration_open` broadcast (in window) | 154 |
| Leads that became attendee=registered | 10 (form-completed) |
| Leads that have attendee=invited (T5 EF path) | 2 (+1 soft-deleted) |
| **Broadcast → form completion conversion** | **7.79%** |
| Hours between LAST registration and event start | 50.3 hours |
| Time between broadcast end and event start | ~64 hours |
| Capacity utilized | 12/50 = 24% |
| Total messages sent for event 24 | 2,352 (across 1,165 distinct leads, run `c633310a`: 2,292 of 2,295 broadcast attempts succeeded) |

### 2.10 What actually flipped `lead.status` to `'invited'` (mechanism, not bug)

`crm_automation_rules` row for `registration_open` (id `8b2edc76-d0e7-439e-abd8-720cfe0397af`):

```json
{
  "name": "שינוי סטטוס: נפתחה הרשמה",
  "trigger_entity": "event",
  "trigger_event": "status_change",
  "trigger_condition": {"type": "status_equals", "status": "registration_open"},
  "action_type": "send_message",
  "action_config": {
    "channels": ["sms", "email"],
    "template_slug": "event_registration_open",
    "recipient_type": "tier2",
    "recipient_status_filter": ["waiting"]
  },
  "is_active": true
}
```

Key contrast — the sibling rule `שינוי סטטוס: הזמנה חדשה` (id `b95a46a1-...`, status=`invite_new`):

```json
{
  "action_config": {
    "channels": ["sms", "email"],
    "template_slug": "event_invite_new",
    "recipient_type": "tier2_excl_registered",
    "post_action_attendee_upsert": {"status": "invited"}    ← KEY DIFFERENCE
  }
}
```

The `invite_new` rule has `post_action_attendee_upsert: {status:'invited'}` — when it fires on a broadcast, it creates an attendee row per recipient. **The `registration_open` rule does not.** It only sends the message and (by some side-effect — likely "tier2" recipient_type promotes the cohort) flips `lead.status` from `'waiting'` to `'invited'`.

Event 24's published path was `planning → registration_open` directly — `invite_new` was never triggered. So no bulk attendee-row creation happened for the 154 leads on broadcast. That is the mechanism behind the orphan cohort.

---

## 3. Ranked Hypotheses

### H1 (HIGH likelihood — the dominant explanation): **Semantic confusion about what "invited" means**

**Claim:** The 154 "invited" leads are **not a registration funnel** — they are the recipient cohort of the May 12 mass-broadcast that announced registration was open. The funnel that actually matters (registration via form) shows 12/154 ≈ 7.8% conversion, which is the metric to act on.

**Prediction if true:** (a) The 154 leads have ZERO attendee rows ✓ (confirmed §2.2). (b) The 154 leads received exactly one template family: `event_registration_open` ✓ (§2.5/§2.8). (c) The `registration_open` automation rule has NO `post_action_attendee_upsert` clause ✓ (§2.10). (d) Events 20/22/23 baselines were created under a different pipeline ✓ (§2.3 monday_legacy bulk-import). (e) The 3 leads that did flow through the EF's T5 path (post-publish) got attendee rows correctly ✓ (§2.4 timeline + verified IDs `3480e9b4`, `9d4c36ec`, `b48227b2`).

**Disconfirming evidence:** None observed.

**What "wrong" is here:** Nothing is technically broken. But the KPI reporting confuses an *audience size* metric (154 broadcast recipients) with a *funnel-leak* metric (only 12 registrations).

### H2 (MEDIUM likelihood — contributing factor): **Insufficient touch-points + cold list + late publish**

**Claim:** The cohort received its first event communication only ~64 hours before event start. 57 of 154 are bulk-imported Monday legacy leads that sat dormant for 9 days before any contact. The 91 EF-acquired leads received `lead_intake_new` (a tenant welcome message with no event context) up to 9 days before getting `event_registration_open` — a fragmented first impression.

**Prediction if true:** (a) Conversion would correlate inversely with time-since-acquisition (later-acquired leads convert better). (b) The Monday-legacy cohort would underperform the EF-acquired cohort. (c) Sending more touchpoints before the broadcast would lift conversion. (d) The 12 actual registrations are clustered close to broadcast time.

**Confirming evidence:** Last attendee created 2026-05-13 03:42 — i.e., bulk of action happened in the 10 hours after the 16:42 broadcast, then trailing off. The 3 leads that went through T5 (acquired after publish, with event-context welcome) all became attendees (100% attendee creation rate — though not all completed the form). 5 sampled orphan leads ALL came from the cold monday_legacy pool.

**Disconfirming evidence:** Conversion analysis by cohort (monday_legacy vs shortcode_lead_form vs monday_tier1_import) was not performed in this diagnostic — recommended as a follow-up cut.

### H3 (LOW likelihood — to rule out): **Status-oscillation thrash spammed/desensitized recipients**

**Claim:** The 9 separate `registration_open` automation runs on May 12 (03:54, 03:55, 03:55:59, 03:56:52, 15:49, 16:10, 16:10:32, 16:20:35, 16:20:57, 16:41:58, 16:42:44) suggest the event status was toggled multiple times by an operator. If duplicate messages went out, recipients may have flagged them as spam.

**Prediction if true:** (a) Many recipients received the same template multiple times in 30-60 min. (b) message_log shows duplicate sends per lead_id.

**Confirming evidence:** message_log shows 251 messages with `template_id IS NULL` to 154 distinct leads (avg 1.6 NULL-template msgs/lead) — these might be the test/duplicate sends. The 5 sample leads each have 3-4 messages, consistent with one SMS + one email per channel (expected) but suggestive of duplicates if message bodies overlap.

**Disconfirming evidence:** Only ONE `c633310a-...` run actually delivered (msg_sent=2292). The other 8 `registration_open` runs all show `msg_sent=0` — they likely deduped or self-terminated. Probably not the dominant cause.

### H4 (LOW likelihood — to rule out): **The EF's T5 path silently failed for May 3-11 leads**

**Claim:** Maybe event 24 WAS in `registration_open` status briefly on May 3-11 and the EF's attendee-upsert silently failed (RLS, FK error) for 91 leads, but the lead-status update at line 167 succeeded.

**Prediction if true:** 91 leads would have received `event_invite_new` template (not `lead_intake_new`).

**Disconfirming evidence:** ZERO leads in the cohort have `event_invite_new` template logged. All 91 EF-acquired leads got `lead_intake_new` (T1). The `else` branch fired — proves event 24 was NOT `registration_open` during their arrival.

**Conclusion: H4 falsified.**

### H5 (LOW likelihood — to rule out): **Form attribution / link tracking is broken**

**Claim:** Many recipients clicked the SMS link but the form submission didn't reach the EF (CORS, broken short-link, deno cold-start timeout).

**Prediction if true:** EF logs would show 4xx/5xx for `lead-intake` requests at May 12-13.

**Disconfirming evidence:** Not investigated in this diagnostic (no EF log access in scope). Best evidence available: the EF successfully accepted 3 fresh leads in the post-publish window (all 3 produced clean attendee rows + T5 messages), so the EF is operational. Form-side telemetry was not measured here — flag as a follow-up cut, not a primary hypothesis.

---

## 4. Recommended Fix Plan (RECOMMENDATION ONLY — NOT EXECUTED)

The "fix" depends on which hypothesis the team accepts as primary. Two parallel options worth queuing as separate SPECs:

### Option A (matches H1 — reframe KPI + close the audit gap)

**SPEC name:** `M4_EVENT_FUNNEL_TELEMETRY_AND_INVITED_SEMANTICS`

**Scope:**
1. Add a `post_action_attendee_upsert: {status:'invited'}` clause to the `registration_open` automation rule (matches the `invite_new` rule). After the next broadcast, every recipient receives an attendee row at broadcast time, so the funnel KPI in `v_crm_event_dashboard` correctly reflects `attendee_invited → attendee_registered → attendee_confirmed`.
2. Add a `v_crm_event_funnel_v2` view or extend `v_crm_event_dashboard` to expose: broadcast_recipients (attendee_invited), form_completions (attendee_registered), confirmation_rate, hours_lead_time. Surface these in the campaign-overseer dashboard.
3. Document `lead.status='invited'` officially as "received an event invitation broadcast" — distinct from "registered for an event".

**Rollback risk:** LOW. Adding `post_action_attendee_upsert` to an existing rule is a JSON-patch to one `crm_automation_rules` row, reversible by re-setting the prior `action_config`. View changes are reversible.

**Verify-on-demo:** Create a demo event in `planning`, flip to `registration_open`, observe N attendee rows materialize matching the recipient cohort. Then call `register_lead_to_event` on one of those leads → row should promote `invited → registered` (this exercises the just-fixed ghost-attendee fix from 2026-05-13 as a side benefit).

### Option B (matches H2 — fix the next event's calendar)

**SPEC name:** `M4_RESCUE_EVENT_24_CALENDAR_REDESIGN`

**Scope:**
1. For the rescheduled event 24 (date 2026-05-22 per the M4_INVITED_GHOST_ATTENDEE_FIX SPEC), route through `invite_new` status BEFORE `registration_open`. This fires the rule that DOES create attendee rows at broadcast time, AND gives a 5-day notice between first contact and event date.
2. Pre-warm the monday_legacy cohort: before flipping to `registration_open`, send a soft "save the date" template (NEW template, or reuse `event_invite_new` with adjusted body). Cohort is the same `tier2 status='waiting'` filter.
3. Add a 24-hour-before-event reminder template — none was fired for event 24 (no automation_run for `reminder_24h` template, no `crm_message_log` row with that template_id between 2026-05-14 09:00 and 15:00).

**Rollback risk:** MEDIUM (operational, not technical) — depends on whether all customers can receive a second contact within the same campaign.

**Verify-on-demo:** Walk the demo event through `planning → invite_new → registration_open` and observe (a) attendee rows materialize at `invite_new`, (b) registration form sends to attendee rows in `invited` state, (c) RPC promotes them correctly.

### Recommended sequencing

**Option A first**, then Option B. Option A makes the metric correct so Option B's effects are measurable. Both should land before the 2026-05-22 rescue event.

---

## 5. Out-of-Scope Findings (NOT acted on; logged for next SPEC)

1. **9 `registration_open` automation_runs on the same event in one day.** This points to either status oscillation by the operator or a missing dedup/idempotency guard on the rule engine. Worth investigating but not on the funnel critical path.
2. **`event_status_at_trigger='planning'` AFTER `newStatus='registration_open'`** in 6 of 9 runs. The trigger snapshot is taken AFTER the status update but reads the pre-update value — suggests the trigger fires inside the same transaction before the row commits.
3. **3 attendee rows show `lead.status='waiting'`** for the post-publish T5 leads (§2.4 last 3 entries), but `dispatchFreshLead` sets lead.status='invited' on line 167. Something later flipped them to 'waiting'. Likely the event-close transition cascaded.
4. **No template_id on 251 of 2352 messages** (10.7%) for event 24. Direct-send path (broadcast engine without template registration) exists somewhere and isn't observable via crm_message_templates joins.
5. **`crm_events` has no `updated_at` column.** Status history is unreconstructable from the row itself — relies on `crm_automation_runs.trigger_data` snapshots, which are lossy (only fire on the change rule). Consider adding `updated_at` + a status-change ledger.
6. **No `audit_log` table exists** despite the SPEC SC4 anticipating one. Worth recording as a TECH_DEBT item.

---

## 6. Limitations of this diagnostic

- No access to deployed EF logs (`supabase functions logs`) — couldn't observe 4xx/5xx on `lead-intake` for May 12.
- No access to SMS/email provider delivery reports — couldn't verify how many of the 2,292 broadcast sends actually reached devices.
- Conversion broken down by cohort (monday_legacy vs shortcode vs monday_tier1) not computed — recommended cut for the follow-up SPEC.
- Form-side telemetry (clicks, page loads, partial submits) not in this DB — out of scope for a DB-only diagnostic.

---

## 7. One-line conclusion

The "funnel drop" is mostly a measurement artifact: events 20/22/23 came from a different pipeline, and `crm_leads.status='invited'` on event 24 marks broadcast recipients (154) not registration attempts. The real KPI — broadcast → form completion — was 7.8%, on a list with cold-import bias and only 64 hours of lead-time before the event. Fix the metric, then fix the calendar.

---

*End of DIAGNOSTIC_REPORT.md.*
