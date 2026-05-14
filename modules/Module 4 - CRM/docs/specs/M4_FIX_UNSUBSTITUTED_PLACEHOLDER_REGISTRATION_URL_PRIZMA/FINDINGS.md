# FINDINGS — M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA

**Run date:** 2026-05-14 (overnight Bundle 2 T1.1)
**Outcome:** Diagnostic complete. Repair escalated to Daniel-decision. 0 Prizma writes.

---

## F-1 — Root cause = H1 (broadcast pre-dated BROADCAST_EVENT_LINK_SUPPORT fix)

**Severity:** HIGH (data loss event)
**Status:** CONFIRMED

**Evidence:**

- Broadcast row `ab7341c9-7851-493c-bf0b-b426b5359e08` created 2026-05-13 06:12:18Z, `total_recipients=1135`, `total_sent=0`.
- `filter_criteria` JSON does NOT contain `event_id`. Compare to the later same-day broadcast `702d34f0-…` created 2026-05-13 07:37:34Z (1 hr 25 min later) whose `filter_criteria.event_id="a7c9f174-…"` is present — this is the post-fix broadcast shape.
- The 758 failures fired 2026-05-13 06:13:01 → 06:32:06 (19 minutes), exactly the dispatch wave of broadcast `ab7341c9`.
- Sample row content (`crm_message_log.id = 39ec0ca1-…`) shows fully substituted brand short.gy URL `https://prizmaoptic.short.gy/kuZSCu` AND substituted name `עדי גולדמן`, but the registration line reads literally:

```
להבטיח את המקום שלך 👇
%registration_url%
```

This is the exact failure mode predicted by H1: `injectAutoUrls` in `send-message` EF skipped the registration-token branch because `event_id` arrived NULL on the queue rows. The pre-substitution safety scan in `send-message` then caught the literal placeholder and wrote `status='failed'` + `error_message='unsubstituted_placeholder: registration_url'`.

**Cross-check disproving H2:** Event #24 ("אירוע המותגים - מאי 2026") has a perfectly working `registration_form_url` and the later post-fix broadcast `702d34f0-…` to 1 waitlist recipient with the same event ran without `registration_url` failures (status='sent' for that single recipient in the relevant time window). So the template + event are NOT misconfigured — only the broadcast `ab7341c9` lacked event_id.

**Cross-check disproving H3:** No EF version mismatch needed. The send-message safety scan worked as designed; the input was broken at queue-write time, upstream.

## F-2 — Affected count reconciliation: 758 exact

**Status:** RECONCILED

`crm_message_log` rows for Prizma matching `status='failed' AND error_message='unsubstituted_placeholder: registration_url' AND created_at IN [2026-05-12, 2026-05-15)`:

| Metric | Value |
|---|---|
| Total failed rows | **758** |
| Distinct `broadcast_id` | 0 (all NULL — broadcast_id not yet propagated to log) |
| Distinct `template_id` | 0 (all NULL — pre-event-link template_id wasn't stamped on log either) |
| Distinct `event_id` | 0 (all NULL — root cause) |
| Distinct `lead_id` | 758 (one log row per recipient) |
| Channel mix | 100% `sms` |
| Window | 2026-05-13 06:13:01.713 → 06:32:06.886 UTC (~19 minutes) |
| Aggregate digest (id+lead+ch+ts ordered by ts, md5) | `7b66b5789a3c61658d01c3a6366daee9` |

**Broadcast `total_recipients=1135` vs failures=758:** the gap (377 rows) is plausibly composed of unsubscribed leads (defense-in-depth gate added 2026-05-06 by `M4_UNSUB_SUPPRESSION_CRIT`) + duplicate suppression + provider 4 timeouts (separate error class `make_webhook_400: timeout exceeded`, n=4 on the same date). The 758 number is precisely the population that reached `send-message` and was rejected at safety-scan.

## F-3 — Brands event #24 current state

| Field | Value |
|---|---|
| `id` | `a7c9f174-a099-48b7-88bb-e4d0fa6236e2` |
| `event_number` | 24 |
| `name` | אירוע המותגים - מאי 2026 |
| `event_date` | 2026-05-15 (Friday — **TOMORROW** as of run date) |
| `start_time / end_time` | 09:00 – 14:00 |
| `status` | **`closed`** ← currently not accepting new registrations |
| `max_capacity` | 50 |
| `active_registered` | 9 (status NOT IN cancelled/duplicate/invited) |
| `waiting_list` | 0 |
| `invited` | 3 |

**The event is closed with 9/50 capacity used.** Closure may be deliberate (pre-event freeze) or accidental — Daniel must confirm before any re-send is authorized.

## F-4 — Of the 758 failed leads, how many already self-registered through some other channel?

| Cohort | Count |
|---|---|
| Total failed (unique lead) | 758 |
| Of those, now-attendees on ANY event | 125 (16.5%) |
| Of those, now-attendees on brands event #24 specifically | **3** |

→ **755 of 758 (99.6%) never reached the brands event by any route.** Either the marketing SMS was their only invitation channel (and they never got the working version), or they declined silently. Without re-send, this 755 cohort is the actual customer-facing data-loss surface.

## F-5 — Daniel-decision question (drives the escalation)

**Question:** Should we re-send to the 755 customers (the 758 minus the 3 already registered)?

**Constraints:**
1. Event is `closed` and only 9/50 registered — strongly suggests Daniel wanted the door closed.
2. Event is tomorrow. SMS today reads "register for an event tomorrow", with capacity 41 still open.
3. If we re-open + re-send, the `register_lead_to_event` RPC routes new sign-ups based on event status. With `status='closed'`, the RPC returns `'event_closed'` (FIND-1 from `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP`, closed 2026-05-14). Customers would see "the event is closed" and bounce.
4. If we flip event back to `registration_open`, sign-ups go to active or waiting_list.
5. The original broadcast was triggered ~06:13 on 2026-05-13. There were 1 day 23 hours between the failed wave and "tomorrow's event" at the time of sending. Now it is 1 day 6 hours. Delivery latency margin is shrinking.

**Options for Daniel (pick one):**

| Option | What it does | Trade-offs |
|---|---|---|
| A — re-open event + re-send to 755 | Flip status `closed → registration_open`, re-enqueue 755 SMS via new SPEC (event_id now propagated), customers register normally | Last-minute marketing push; risk of over-capacity if response rate >5%; signals "event was never really closed" |
| B — keep closed + re-send anyway | Re-send as-is; customers who try to register hit `event_closed` response | Awful UX; customers receive marketing then friction |
| C — keep closed + accept loss | Mark the 758 as accepted data loss in this SPEC's FINDINGS, no resend | Cleanest; preserves Daniel's apparent intent; 755 customers got a broken SMS but no further follow-up | 
| D — partial re-send | Re-send only to the 26 customers currently in `status='waiting'` for this event AND in the 755 cohort (TODO query) | Most surgical; respects waitlist; need to confirm overlap |

**Recommended path forward:** Daniel reviews this FINDINGS doc in the morning, picks one, then triggers a follow-up SPEC (`M4_RESEND_BRANDS_EVENT_INVITES_2026_05_14` or accept-loss closure note). The 758-row backup at `BACKUP_758_ROWS.json` lets any chosen path re-build the queue rows deterministically.

## F-6 — Adjacent finding (out-of-scope): 4 make_webhook timeouts on 2026-05-13 13:00

Not part of the 758. Separate root cause (Make webhook 400 timeout). 4 rows, 13:00:57 → 13:01:52 UTC on Prizma. Probably a transient Make-side outage. Recommend opening a TECH_DEBT line for review of Make's reliability if these recur. Out of scope here.

## F-7 — Adjacent failure-mode spot-check (CLEARED): no prior-day cohort exists

The 2026-05-12 broadcast `abb415e7-…` (1170 recipients, `filter_criteria.events: []`, no event_id) ALSO pre-dated the BROADCAST_EVENT_LINK_SUPPORT fix, so the same failure mode could have been latent.

Spot check 2026-05-12 `crm_message_log` for Prizma — **0 failures**. 3542 rows, all `status='sent'`, no `error_message`. The 2026-05-12 broadcast's template did NOT contain `%registration_url%` (or used a different RPC path that resolved). The 758-row data loss is contained to the single 2026-05-13 06:12 broadcast `ab7341c9` — does not generalize to other broadcasts in the prior window. Good news.

---

End of FINDINGS.
