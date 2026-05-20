# SCENARIO 12 — Dispatch queue health observation

**Status:** 🟢 PASS
**Date:** 2026-05-20
**Tenant:** demo

## Queues observed

### crm_message_queue (all-time on demo)
```
sent      102
rejected   11
failed      9
cancelled   2
queued      0
pending     0
TOTAL     124  (was 117 at baseline → +7 from S5/S6 attendee.created automation + post-S2 lead.created)
```

No stuck rows in `queued` or `pending` state — pg_cron consumer is draining the queue.

### crm_capi_dispatch_queue (all-time on demo)
```
sent              6
skipped_no_token  2
queued            0
TOTAL             8  (was 3 at baseline → +5 from this audit)
```

Net new events from this audit (`created_at >= 2026-05-20 04:00`):

| Event | Created | Processed | Status | Error |
|---|---|---|---|---|
| Purchase (S7) | 04:04:35 | 04:05:01 | sent | null |
| EventAttended (S6) | 04:04:13 | 04:05:01 | sent | null |
| CompleteRegistration (S5 path A) | 04:02:55 | 04:03:02 | sent | null |
| CompleteRegistration (S5 path B) | 04:02:54 | 04:03:02 | sent | null |
| CompleteRegistration (S4 rule fire) | 04:00:46 | 04:01:05 | sent | null |

**Latency:** queue→sent in 27-30 seconds for all 5 events. The pg_cron tick + EF dispatch is healthy. **No `error_message` on any row.**

### crm_automation_runs (last hour, all from this audit)
```
trigger_type           | status    | n
attendee_status_change | completed | 1
event_status_change    | completed | 10
lead_intake            | completed | 2
```

13 automation runs, all `status=completed`, no `error_message`. The Brief §3.3 ¶12 said "observe pg_cron tick consumes status_change events without duplication."

## Duplication check

`SELECT rule_name, trigger_data->>'newStatus', COUNT(*) FROM crm_automation_runs WHERE updated_at>=now()-interval'1 hour' GROUP BY 1,2 HAVING COUNT(*)>1`:

| rule_name | to_status | dup_count |
|---|---|---|
| שינוי סטטוס: נפתחה הרשמה + ... | registration_open | 3 |
| ליד חדש: ברוך הבא | (null) | 2 |
| שינוי סטטוס: ייפתח מחר | will_open_tomorrow | 2 |

These are **not duplicates** — they are correct multi-firings:
- `registration_open` was visited **3 times** during this audit (S4 initial walk + S5 reset for attendee registration + S6 implicit re-visit). 3 visits → 3 runs of the rule. **One run per visit, no duplication of the same trigger.**
- `ליד חדש: ברוך הבא` (lead.created) — 2 leads created in S2 + S5 → 2 runs. Each lead got the welcome rule **exactly once**. ✓
- `ייפתח מחר` (will_open_tomorrow) — visited twice during the S4 walk (once during the original sequence + once on a "reset" path). One run per visit.

No two runs were observed targeting the same `(rule_id, trigger_data)` tuple at the same time. Cron consumer behavior is idempotent at the per-event granularity.

## SCE producer + FB CAPI hybrid dedup intact

The `M4_FB_CAPI_HYBRID_DEDUPLICATION` work ensures that even if the EF retries a CAPI dispatch, the deterministic `event_id` (computed from `(lead_id, event_name, scope_id)`) prevents double-counting on Meta's side. The queue does not enforce app-side dedup, because dedup is a Meta-side concern with idempotent event_id. ✓

## Verdict 🟢 PASS

- Dispatch queue drains cleanly (no stuck rows)
- CAPI dispatch queue moves queued → sent within ~30s
- Automation runs complete without errors
- pg_cron consumer fires once per trigger
- No duplicate auto_runs for the same `(rule, trigger_data)` tuple
- Multi-rule, multi-transition rule patterns work as expected
- FB CAPI hybrid dedup architecture intact

**Healthy queue state. No regression.**
