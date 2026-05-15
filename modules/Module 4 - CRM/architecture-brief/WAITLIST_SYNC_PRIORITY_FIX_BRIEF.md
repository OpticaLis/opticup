# Waitlist Sync Priority Fix + Event-Close Lead Recycle — Brief

**Brief version:** v1
**Date:** 2026-05-14 (early hours)
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~1.5-2 hours)
**Model preference:** Sonnet (well-scoped RPC fix + trigger/automation + retro-backfill)
**Owning module:** Module 4 — CRM

---

## 1. Purpose

The Waitlist Flow Investigation (`modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md`) confirmed:

- The capacity-reached → `lead.status='waitlist'` sync **exists and is wired correctly** through `sync_lead_status_from_attendee` RPC.
- It has **never fired in production** because (a) it was deployed AFTER the past sold-out events (#22, #23), and (b) its "most-recent-active-wins" rule absorbs the waitlist signal when a lead has another newer `attended` row elsewhere.
- 8 Prizma leads from a completed March event are stuck in `waiting_list` attendance status with leads still on their pre-March status, never having been flagged.

This Brief closes the gap with two coordinated fixes plus one new event-close behavior Daniel requested in chat 2026-05-14.

---

## 2. Daniel's Locked Decisions (chat 2026-05-14)

| # | Topic | Decision |
|---|---|---|
| 1 | Waitlist priority in sync logic | Give `waitlist` precedence over `confirmed_verified`/`attended` when a lead has rows in both. The waitlist signal is the most relevant signal for "next event". |
| 2 | Retroactive sync for sold-out historical events | YES — re-run sync once on every completed event's attendees so the existing `waiting_list` attendees finally flag their leads. |
| 3 | NEW: event-close lead recycle | When an event transitions to status `closed` OR `completed`, every lead whose attendee row on THAT event has `status IN ('invited', 'attended')` returns to `lead.status='waiting'` on the Tier 2 board, READY for the next event. |
| 4 | Out of recycle scope: attendee statuses NOT in {invited, attended} | Leads with attendee status `waiting_list`, `registered`, `confirmed_verified`, `cancelled`, etc. on the closing event — DO NOT TOUCH. Their lead status follows the normal sync rules. |
| 5 | "Customer" / "purchased" recognition | NOT in this SPEC. Future tag work — Daniel will design that separately. Today, even `attended` leads recycle back to `waiting`. |

---

## 3. Scope

### 3.1 Fix the sync RPC priority logic (`sync_lead_status_from_attendee`)

Today's logic: "lead.status = most recent active attendee row's mapped status". This drops the waitlist signal when there's a newer attended row elsewhere.

New logic (Decision #1):
- If ANY of the lead's non-deleted attendee rows has `status='waiting_list'` AND event is not closed/completed → `lead.status = 'waitlist'`. Waitlist takes precedence.
- Otherwise, fall back to existing "most recent active wins" rule.

This is a small RPC body edit. No DDL.

### 3.2 Retroactive sync — one-shot historical backfill

After §3.1 lands, run the sync once on every lead currently attached to a `waiting_list` attendee row on Prizma. Expected effect: the 8 stuck Prizma leads flip from their current status to `waitlist`. NO `closed`/`completed` event recycle yet — that's §3.3 below.

Acceptance: post-run, the count of Prizma leads with `status='waitlist'` matches the count of distinct leads carrying a `waiting_list` attendee row on a non-closed/non-completed event.

### 3.3 Event-close lead recycle (NEW BEHAVIOR per Decision #3)

When an event's status transitions to `closed` OR `completed`:
- Identify all attendee rows on the event with `status IN ('invited', 'attended')` and `is_deleted=false`.
- For the leads of those attendees, set `lead.status='waiting'` on the Tier 2 board (`crm_leads.status`).
- Other attendee statuses are NOT touched. Their lead status is governed by the existing sync rules.
- This happens via DB trigger on `crm_events` status change (or via the existing automation framework — Pipeline decides which is cleaner; both are acceptable).

This is a NEW behavior, not a bug fix. It runs going forward; for past events that are ALREADY closed/completed, see §3.4.

### 3.4 Retroactive recycle for past closed/completed events

Apply §3.3 logic ONCE to every Prizma + Demo event already in `closed` or `completed` status. Audit the row counts:
- Expected: dozens to ~150 Prizma leads currently on stale `invited`/`attended` statuses get flipped to `waiting`.
- Daniel approves the volume as part of this Brief — no need to surface for individual approval.

**Important:** the recycle MUST only affect leads whose attendee row is on a closed/completed event AND the attendee status is `invited` or `attended`. A lead that simultaneously has a `waiting_list` attendee row on a non-closed event MUST stay in `waitlist` (sync's waitlist priority wins). Order of operations matters — see §5.

---

## 4. Safety Envelope

### 4.1 Safety tag
First action:
```
git tag -a pre-waitlist-sync-priority-fix-2026-05-14 -m "Pre-waitlist-sync-priority-fix baseline"
git push origin pre-waitlist-sync-priority-fix-2026-05-14
```

### 4.2 Order of operations (critical — locks the result)
1. Land RPC priority fix (§3.1) on develop.
2. Land event-close recycle mechanism (§3.3) on develop.
3. Smoke test on demo: create a test event, register a test lead with attendee status `invited`, close the event, verify lead recycled to `waiting`. Repeat with `attended`. Verify `registered`/`confirmed_verified` did NOT recycle.
4. ONLY AFTER §3 above is green, run §3.4 retroactive recycle on past Prizma + Demo events.
5. ONLY AFTER §3.4 is green, run §3.2 retroactive sync for `waiting_list` leads. (§3.2 runs LAST because §3.4 may have already touched some of these leads — running §3.2 last lets waitlist priority win the final state.)

### 4.3 Prizma writes
- Multiple Prizma writes ARE expected and explicitly authorized:
  - §3.2: ~8 lead row UPDATEs (the stuck `waiting_list` leads).
  - §3.4: dozens to ~150 lead row UPDATEs (historical `invited`/`attended` recycle).
- All writes are on `crm_leads.status` column only. No other column touched. No row deletes. Reversible via master tag + per-row pre-state snapshot (executor captures in EXECUTION_REPORT.md §2 before any UPDATE).

### 4.4 DDL
- One DB trigger creation on `crm_events` for §3.3. Pre-approved.
- One RPC body update for §3.1. Pre-approved.
- NO other DDL.

### 4.5 No merges to main
- Daniel handles via PR after he reviews.

### 4.6 Commit budget
- 5-7 commits expected. Cap at 8.

### 4.7 Stop triggers
- If any UPDATE in §3.2 or §3.4 would affect a lead whose attendee row is on a non-closed/non-completed event with `status='waiting_list'` → STOP, that lead should NOT recycle. Re-check ordering.
- If demo smoke test §4.2 step 3 fails (wrong status recycled) → STOP.
- If retroactive recycle would affect more than 300 Prizma rows → STOP, surface to Daniel. (300 is a sanity cap; we expect ~150.)

---

## 5. Pipeline Selection

Standard Full Auto Pipeline:
- `opticup-strategic` (Foreman) authors SPEC.
- `opticup-executor` implements RPC + trigger + backfill.
- `opticup-reviewer` audits the SQL.
- `opticup-localhost-tester` smokes demo per §4.2 step 3.
- `opticup-strategic` (Foreman-Review) closes.

Sonnet model.

---

## 6. Communication

English status updates between phases. ONE concise English summary at end pointing to:
- Final HEAD on develop.
- Count of leads recycled (per §3.4).
- Count of leads waitlisted (per §3.2).
- Demo smoke results.
- Whether ready for develop→main PR.

---

*End of Brief. Activation prompt at `WAITLIST_SYNC_PRIORITY_FIX_ACTIVATION_PROMPT.md`.*
