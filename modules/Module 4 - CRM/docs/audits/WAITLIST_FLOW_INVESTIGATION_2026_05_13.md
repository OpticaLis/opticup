# Waitlist Flow — Investigation Report

**Date:** 2026-05-13
**Author:** Full Auto Pipeline (Sonnet) per `WAITLIST_FLOW_INVESTIGATION_BRIEF.md`
**Safety tag:** `pre-waitlist-investigation-2026-05-13` → `b27b74f`
**Scope:** READ-ONLY investigation + ONE pre-authorized single-row UPDATE on Prizma (§3.1 of Brief)

---

## 1. Executive Summary

**Verdict: 🟢 Flow IMPLEMENTED end-to-end, but has NEVER fired in production.**

The capacity-reached → `lead.status='waitlist'` flow that Daniel described is fully wired:

- **DB layer:** `sync_lead_status_from_attendee(p_lead_id, p_tenant_id)` RPC exists, maps `attendee.status='waiting_list'` → `lead.status='waitlist'` per spec.
- **RPC layer:** `register_lead_to_event` RPC calls `sync_lead_status_from_attendee` on every code path (new INSERT, soft-deleted revival, invited→registered promote) — including the capacity-hit branch.
- **EF layer:** `event-register` and `quick-register` Edge Functions call `register_lead_to_event` as the canonical entry point.
- **Server-side automation:** `automation-engine/post-actions.ts` (attendeeUpsert post-action for Rules 2.2 and 2.4) also calls the sync RPC after bulk upserts.
- **Status seed:** `crm_statuses` row for `entity_type='lead', slug='waitlist'` exists and is active on BOTH demo and Prizma (`is_active=true`).
- **UI consumption:** `TIER2_STATUSES` array in `modules/crm/crm-helpers.js:93` includes `'waitlist'`. `crm-leads-tab.js:283` renders the move-to-other-event button (↔) for leads in waitlist/invited status. `crm-attendee-move.js` provides the move action.

Yet **0 leads currently carry `status='waitlist'`** (after the §3.1 cleanup), and `activity_log` shows **0 sync-driven `to:waitlist` transitions** in history — only 5 manual flips by Daniel during testing, on demo and the 1 Prizma test row.

**Why the flow hasn't fired:**

1. **Sync RPC was deployed AFTER the only historical capacity-hit event.** Event "אירוע המותגים מרץ 2026" (event_date 2026-03-27, status='completed') has 8 active `waiting_list` attendees. Their lead.status is 'invited' — set by the invitation broadcast BEFORE the sync RPC was deployed in migration `20260429122708` (2026-04-29).
2. **Sync's filter excludes completed events.** Even if sync re-ran for those 8 leads today, the WHERE clause `e.status NOT IN ('completed','cancelled')` would exclude their only attendee row, defaulting them to `'waiting'` — not `'waitlist'`.
3. **Sync's "most-recent-active-attendee wins" rule hides waitlist signal when a lead has parallel registrations.** Demo's only active `waiting_list` attendee belongs to lead "P55 Daniel Secondary", whose lead.status is `'confirmed_verified'` because the lead has a more-recent `attended` row on a different event. Sync correctly picks the higher-progressed state.
4. **No fresh-lead-on-full-event scenario has occurred since 2026-04-29.** All recent active events with capacity ≥ occupied haven't actually capped out with a fresh lead. The path that produces lead.status='waitlist' has not been exercised.

**Recommendation: 🟡 Author a follow-up SPEC** — see §5. The flow's "happy path" works for fresh leads but two architectural quirks prevent the lead-board view Daniel wants ("show me all leads currently on a waitlist somewhere"). A small, well-scoped fix SPEC can close both.

---

## 2. Evidence

### 2.1 Code references found

| File | Line | Reference |
|------|------|-----------|
| `modules/crm/crm-helpers.js` | 93 | `'waitlist'` in `TIER2_STATUSES` array (M4_LEAD_STATUS_WAITLIST_SYNC, 2026-04-28) |
| `modules/crm/crm-attendee-move.js` | 4 | Move-action commentary referencing waitlist/invited as Tier-2 statuses |
| `modules/crm/crm-leads-tab.js` | 283 | Renders move-to-other-event button (↔) for `r.status === 'waitlist'` or `'invited'` |
| `modules/crm/crm-event-register.js` | 55 | `ATTENDEE_ADD_STATUSES = ['waiting', 'waitlist', 'invited']` — manual attendee-add filter |
| `modules/crm/crm-automation-post-actions.js` | 127 | Client-side call to `sync_lead_status_from_attendee` (M4_LEAD_STATUS_WAITLIST_SYNC) |
| `modules/crm/crm-automation-recipient-resolvers.js` | 119–120 | `cross_event_active_waitlist` resolver — Rule 2.4 (parallel-event opens invite the waitlist) |
| `modules/crm/crm-event-day-coupon.js` | 18 | Coupon-eligibility commentary excludes `waitlist` lifecycle |
| `supabase/functions/automation-engine/post-actions.ts` | 85–94 | Server-side `attendeeUpsert` post-action — best-effort `sync_lead_status_from_attendee` per upserted lead |
| `supabase/functions/automation-engine/recipients.ts` | 116–117 | `cross_event_active_waitlist` recipient resolver |
| `supabase/functions/event-register/index.ts` | 270 | Calls `register_lead_to_event` RPC; `index.ts:318` selects `event_waiting_list_confirmation` template when result.status='waiting_list' |
| `supabase/functions/event-register/capacity.ts` | 1, 34, 46 | `checkAndTransitionToWaitingList` post-register helper — flips event.status to `waiting_list` when at-cap |
| `supabase/functions/quick-register/index.ts` | 307–308 | Calls `register_lead_to_event` RPC (canonical path) |
| `supabase/functions/quick-register/dispatch.ts` | 49–50 | Selects `event_waiting_list_confirmation` template when finalStatus='waiting_list' |

`supabase/functions/submit-lead/` — no waitlist references (it routes via lead-intake, then optionally to register; the canonical at-cap routing lives in `register_lead_to_event`). No `supabase/migrations/` files reference `waitlist` directly — all DB changes flow through the Supabase migrations table.

### 2.2 DB function bodies that mention waitlist

`SELECT proname FROM pg_proc WHERE prosrc ILIKE '%waitlist%'`:

- `sync_lead_status_from_attendee` — the canonical mapper (see §3 below).

Indirectly via `'waiting_list'`:

- `register_lead_to_event` — capacity-hit branch INSERTs attendee with `status='waiting_list'` then PERFORMs sync.
- `move_attendee_between_events` — referenced by the auto-move branch.

### 2.3 Automation rules that touch waitlist (`crm_automation_rules`)

8 rules total reference `waitlist` or `waiting_list`. All on both tenants (demo + Prizma each have a copy).

| name | trigger_entity | trigger_event | condition | action template | is_active |
|------|----------------|---------------|-----------|-----------------|-----------|
| הרשמה: אישור רשימת המתנה (×2) | attendee | created | status_equals waiting_list | `event_waiting_list` (sms+email, recipient=trigger_lead) | ✅ |
| אירוע פתח להרשמה - הזמנת רשימת המתנה (×2) | event | status_change | status_equals registration_open | `event_invite_waiting_list` (recipient=leads_by_status, filter=[waitlist]) | ✅ |
| שינוי סטטוס: הזמנה ממתינים (×2) | event | status_change | status_equals invite_waiting_list | `event_invite_waiting_list` (recipient=leads_by_status, filter=[waitlist]) | ✅ |
| שינוי סטטוס: רשימת המתנה (×2) | event | status_change | status_equals waiting_list | `event_waiting_list` (recipient=attendees_all_statuses) | ❌ (deactivated) |

**Key observation:** The "אירוע פתח להרשמה - הזמנת רשימת המתנה" rule (active) targets `leads_by_status` where `recipient_status_filter=['waitlist']`. If `lead.status='waitlist'` is never populated, this rule resolves to **0 recipients every time it fires.** Daniel's "when a parallel event opens, invite the active waitlist" automation depends on lead.status='waitlist' being populated. Today it never resolves.

### 2.4 Historical evidence (`activity_log`)

`SELECT * FROM activity_log WHERE details::text ILIKE '%waitlist%'` returns 5 rows total:

| created_at | tenant | from → to |
|------------|--------|-----------|
| 2026-05-13 07:36:27 | prizma | confirmed → **waitlist** |
| 2026-05-12 02:28:47 | demo | waiting → **waitlist** |
| 2026-05-12 02:28:20 | demo | waitlist → waiting |
| 2026-05-11 19:18:39 | demo | waitlist → waiting |
| 2026-05-11 19:18:28 | demo | waitlist → waiting |

All 5 are **manual operator changes** (most are Daniel testing on demo). The Prizma row at 07:36:27 is the test lead Daniel created on 2026-05-04 (and which §3.1 of this run moved back to `waiting`). **Zero sync-driven `to:waitlist` events in the entire activity log.**

### 2.5 Schema: `sync_lead_status_from_attendee` (current live body)

Picks the most-recent active attendee row per lead and maps to lead.status:

```sql
WHEN 'confirmed'           THEN 'confirmed'
WHEN 'registered'          THEN 'confirmed'   -- standard registration → confirmed
WHEN 'manual_registration' THEN 'confirmed'
WHEN 'quick_registration'  THEN 'confirmed'
WHEN 'attended'            THEN 'confirmed_verified'
WHEN 'purchased'           THEN 'confirmed_verified'
WHEN 'no_show'             THEN 'confirmed'
WHEN 'invited'             THEN 'invited'
WHEN 'waiting_list'        THEN 'waitlist'   -- TARGET MAPPING
WHEN 'event_closed'        THEN 'waiting'
WHEN 'duplicate'           THEN 'waiting'
ELSE 'waiting'  -- no active attendee → default Tier-2
```

Filters: `a.is_deleted=false AND a.status<>'cancelled' AND e.status NOT IN ('completed','cancelled') AND e.is_deleted=false`. Terminal lifecycle statuses (`not_interested`, `unsubscribed`) are never overridden.

Sort: `ORDER BY COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC LIMIT 1`.

### 2.6 Trigger surface on attendee + event tables

Only one relevant trigger: `trg_attendee_status_change_event` on `crm_event_attendees` UPDATE → logs the diff to `crm_status_change_events`. **It does NOT call sync.** No trigger exists on `crm_events.status` changes, and no pg_cron job re-syncs leads when their event completes.

### 2.7 Pre/post-state counts (Prizma)

| Metric | Pre-§3.1 | Post-§3.1 |
|--------|----------|-----------|
| Prizma leads `status='waitlist'`, `is_deleted=false` | 1 | **0** ✓ |
| Prizma leads `status='waiting'`, `is_deleted=false` | 1 | 2 (+test lead) |
| Demo leads `status='waitlist'` | 0 | 0 |
| Prizma attendees `status='waiting_list'`, `is_deleted=false` | 8 | 8 |
| Demo attendees `status='waiting_list'`, `is_deleted=false` | 1 | 1 |

---

## 3. Current behavior — actual capacity-reached flow

Trace for "fresh lead clicks `%registration_url%` for a full event":

1. **Storefront** generates an HMAC-signed token containing `(leadId, tenantId, eventId, exp)`.
2. **Lead clicks the link** → browser hits `event-register` EF (or `quick-register` if no token).
3. **EF** verifies HMAC, then calls `db.rpc("register_lead_to_event", { p_tenant_id, p_lead_id, p_event_id, p_method })`.
4. **`register_lead_to_event` RPC:**
   - `FOR UPDATE` lock on the event row.
   - Auto-move check: if lead has an active `waiting_list`/`invited` attendee on a DIFFERENT event → move it here, return early. (Does NOT call sync — out-of-scope finding.)
   - Existing-attendee check: if the lead already has an attendee row on this event with `is_deleted=false` and `status='invited'` → promote with capacity check. Calls sync.
   - Existing-attendee check (soft-deleted): revive as `registered`. Calls sync.
   - **Fresh-INSERT path:** count active attendees on event (excluding `cancelled`, `duplicate`, `invited`).
     - If `count >= max_capacity` AND `event.status = 'closed'` → INSERT attendee status='`event_closed`'.
     - If `count >= max_capacity` AND `event.status ≠ 'closed'` → **INSERT attendee status='`waiting_list`'**.
     - Else → INSERT attendee status='`registered`'.
   - On every INSERT/UPDATE branch: `PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id)`.
5. **`sync_lead_status_from_attendee`:**
   - Loads lead. If lead.status ∈ ('not_interested','unsubscribed') → no-op.
   - Picks the most-recent active attendee. For a fresh lead this IS the just-inserted `waiting_list` row.
   - Maps `waiting_list` → `waitlist`. UPDATEs `crm_leads.status='waitlist'`.
6. **EF post-RPC:**
   - `event-register/index.ts:318` selects `event_waiting_list_confirmation` template → sends to lead.
   - `capacity.ts:46` (post-register helper) — if just hit cap, flips event.status to `waiting_list`, which triggers automation rule "אירוע פתח להרשמה - הזמנת רשימת המתנה" on FUTURE registration_open events.
7. **`crm_status_change_events`** captures the attendee status change (for downstream automation engine consumption).
8. **automation-engine `dispatch-queue` cron** picks up the change and runs the matching rule (`הרשמה: אישור רשימת המתנה`), which **may also send `event_waiting_list`** — see §6 Out-of-Scope Notes for the potential duplicate-notification risk.

**Outcome: For a fresh lead with no other active attendee rows, the flow produces `lead.status='waitlist'` correctly.**

But there are two architectural quirks that hide it from the leads board today:

- **Quirk A (sync priority):** A lead with one `attended`/`registered` row on event X AND one `waiting_list` row on event Y → sync's most-recent-active picks the highest-progressed one → lead.status = `confirmed_verified` or `confirmed`. The waitlist signal is silently absorbed.
- **Quirk B (completed-event drift):** When event Y completes, the sync filter excludes that row. The lead's `lead.status` does NOT get re-derived automatically (no trigger on `crm_events.status`). The lead keeps whatever value sync last set — could be stale.

---

## 4. Gap analysis vs Daniel's intent

**Daniel's product intent (verbatim Brief §1):** "when a lead registers for a full event, the lead's `crm_leads.status` on the main Tier 2 board changes to `'waitlist'`. The relevant signal is the LEAD's status, not the attendee row's status."

**Gap 1 — Quirk A: "Most-recent-active wins" overrides waitlist when the lead has any other active registered/attended attendee.**

This is the dominant failure mode. As Daniel grows the audience and the same lead reaches multiple events, this becomes more common. Today: demo's 1 waiting_list attendee belongs to a lead whose lead.status is `confirmed_verified` because of an `attended` row elsewhere.

**Gap 2 — Quirk B: Lead.status doesn't drift after event completes.** Historical leads (8 on Prizma) carry `lead.status='invited'` from their old invitation broadcast even though their only attendee row is on a completed event. Sync would now default them to `'waiting'` if it ran, but nothing re-triggers it. Acceptable for now, but Daniel's intent could include "leads whose only waitlist event hasn't yet completed should show 'waitlist' UNTIL the event is over, then revert to 'waiting'."

**Gap 3 — No event has actually capped out with a fresh lead since 2026-04-29.** The flow's happy path is untested in production data. The 8 historical waiting_list attendees pre-date the sync RPC.

### 4.1 Three options for closing the gaps

#### Option A — "Most-recent-active" → "Has-any-active-waitlist wins"

Change the sync RPC's selection logic so a `waiting_list` attendee on any active event takes priority over `registered`/`attended` on other events. Add a priority CASE before the ORDER BY: `WHEN status='waiting_list' THEN 1 WHEN status='invited' THEN 2 ELSE 3`, then sort by sort_key DESC within priority.

- **Pros:** Daniel's leads board reflects "currently waitlisted" correctly. Minimal code change (one CASE in one RPC).
- **Cons:** A confirmed-attended lead who later waitlists for another event would lose their `confirmed_verified` status on the leads board. Single-value lead.status remains a lossy encoding for parallel-event reality.
- **Effort:** S (RPC body update + backfill). Single-row Brief in scope.

#### Option B — Drop sync from owning lead.status, add a derived view

Stop letting sync override lead.status from attendee state. Instead, expose a Postgres view `v_crm_lead_lifecycle_signals` that joins `crm_leads` with `crm_event_attendees` and returns: `lead_id, lead_status, has_active_waitlist, has_active_invited, has_active_registered, has_attended_any`. Leads board reads from this view.

- **Pros:** Lossless. The view surfaces every signal Daniel might want. Lead.status remains a pure lifecycle field (waiting → invited → confirmed → confirmed_verified → terminal).
- **Cons:** UI refactor to read from view + filter on derived columns. Larger SPEC (M-sized). Existing 'waitlist' value in lead.status becomes vestigial.
- **Effort:** M-L (DB view + RPC + UI changes in crm-leads-tab).

#### Option C — Hybrid: Keep sync as-is, add re-sync trigger on event completion + manual "Recompute Statuses" admin action

Leave sync's "most-recent-active" rule alone (it's correct lifecycle semantics). Add:
1. AFTER UPDATE trigger on `crm_events` that re-runs sync for every affected lead when `event.status` transitions to completed/cancelled.
2. A small admin action ("Recompute lead statuses") that re-runs sync for all active leads — for historical cleanup.
3. Accept that "leads currently waitlisted but also confirmed elsewhere" won't show as `waitlist` (the rare case).

- **Pros:** Smallest change. Aligns historical data with current sync rules. Stops the drift gap.
- **Cons:** Quirk A remains — Daniel's leads board still won't surface concurrent-event-waitlist signal for already-confirmed leads.
- **Effort:** S (trigger + 1 RPC call).

---

## 5. Recommendation

**Author one follow-up SPEC: Option A + Option C.** Together they close the dominant gap without an UI refactor.

Rationale:
- **Option A** fixes Quirk A — the dominant pattern Daniel will hit as the audience grows. Single small RPC change.
- **Option C's trigger** fixes Quirk B — keeps lead.status fresh after event completion. Backstop hygiene.
- Combined they are a single tight SPEC (~2–3 commits): edit sync RPC priority CASE + add trigger + one backfill run on demo first then Prizma.
- **Option B's view** is the "right" long-term answer but its surface area (UI changes in crm-leads-tab, filter chips, etc.) makes it a poor fit for an immediate fix — defer to a follow-up if Daniel later needs the lossless multi-event signal.

The SPEC should NOT be authored as part of this Brief — Daniel's directive (Brief §2 row 4) is "Decision after Daniel reads the report." This report exists so Daniel can pick A+C / B / defer.

### 5.1 Suggested SPEC slug (for the eventual author)

`M4_WAITLIST_SYNC_PRIORITY_FIX` — would extend the existing `M4_LEAD_STATUS_WAITLIST_SYNC` SPEC's design with Option A's priority CASE and Option C's event-completion trigger.

### 5.2 SPEC-internal sanity checks the author should plan

- Backfill must verify zero `confirmed_verified` leads silently demoted to `waitlist` without justification.
- Add a test scenario: a lead with `attended` on event X + `waiting_list` on event Y → sync produces `waitlist` (under Option A) but lead's `attended` event is still reachable via the attendees view.
- Backfill on demo first, then Prizma in a separate commit, per the standing cross-tenant cutover pattern.
- Verify the active automation rule "אירוע פתח להרשמה - הזמנת רשימת המתנה" (recipient_status_filter=['waitlist']) actually resolves to recipients after the fix.

---

## 6. Out-of-Scope Notes

Surfaced during this investigation; flagging for separate consideration. **NOT addressed in this report's scope.**

1. **Potential duplicate `event_waiting_list` notification.** The EF code (`event-register/index.ts:318`, `quick-register/dispatch.ts:49`) selects the `event_waiting_list_confirmation` template directly and sends it to the newly-placed waitlist lead. Separately, the automation rule "הרשמה: אישור רשימת המתנה" (×2, both active) is triggered on `attendee.created + status_equals=waiting_list` and sends the `event_waiting_list` template via `dispatch-queue`. If both fire for a single registration, the lead receives 2 messages. Inspect by triggering an at-cap registration on demo and counting messages in `crm_message_log`. (NOT verified in this READ-ONLY pass.)

2. **Duplicate automation rules.** Multiple `crm_automation_rules` rows have identical names ("הרשמה: אישור רשימת המתנה" ×2; "אירוע פתח להרשמה..." ×2; "שינוי סטטוס: רשימת המתנה" ×2; "שינוי סטטוס: הזמנה ממתינים" ×2). Each pair likely is one row per tenant (demo + Prizma) but the duplicate names make audit queries noisy. Consider a `name + tenant_id` audit pass.

3. **Soft-deleted lead pile-up.** Prizma has 37 leads with `status='waiting'` and `is_deleted=true`. The original Overnight Audit's "38 leads with status='waiting' on Prizma" count conflated active + soft-deleted. Worth a separate audit on whether these soft-deleted leads should be hard-purged at some retention horizon (Iron Rule 3 says soft-delete only; that's fine — but the count noise suggests the leads board's "waiting" badge may be miscounting).

4. **Auto-move branch in `register_lead_to_event` does NOT call sync.** If a lead with an active waiting_list/invited attendee on event A registers for event B, the RPC moves the attendee from A to B via `move_attendee_between_events` and returns early — without calling `sync_lead_status_from_attendee`. The lead's status may be stale after the move. (Verify whether `move_attendee_between_events` itself calls sync.)

5. **No pg_cron job re-syncs leads on any schedule.** Combined with Quirk B (no event-completion trigger), `lead.status` can drift arbitrarily over time. Option C's trigger addresses event-completion specifically; a periodic full re-sync may also be worth considering for tenant-onboarding hygiene.

6. **Demo's only active waiting_list attendee is a Daniel test row.** Lead "P55 Daniel Secondary" / event TEST543 — useful for QA when the fix SPEC is authored. Cap=1, occupied=1, status='waiting_list'.

---

## 7. Verification of Brief §3.1 Compliance

- Pre-UPDATE query returned exactly 1 row (`23a96795-ae7e-4cc6-8a8b-786b58b55491`, "דניאל טסט 2", phone `+972537889878` — Daniel's whitelisted test phone, email `daniel@prizma-optic.co.il`). ✓
- UPDATE affected exactly 1 row (RETURNING confirmed). ✓
- Post-state on Prizma: 0 leads with `status='waitlist'`, `is_deleted=false`. ✓
- Post-state on demo: 0 leads with `status='waitlist'`. ✓
- `crm_statuses` row for waitlist on both tenants: **untouched, still active** (`is_active=true`). ✓
- Master safety tag `pre-waitlist-investigation-2026-05-13` at HEAD `b27b74f`. Rollback path: `git reset --hard pre-waitlist-investigation-2026-05-13`.

---

*End of report. Pointer: `M4_LEAD_STATUS_WAITLIST_SYNC` SPEC at `modules/Module 4 - CRM/docs/specs/M4_LEAD_STATUS_WAITLIST_SYNC/SPEC.md` is the design ancestor; the suggested follow-up `M4_WAITLIST_SYNC_PRIORITY_FIX` would extend it.*
