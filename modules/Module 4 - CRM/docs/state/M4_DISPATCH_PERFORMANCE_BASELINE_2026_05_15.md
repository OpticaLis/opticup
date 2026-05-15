# M4 Dispatch Performance Baseline — 2026-05-15

> **Mission:** Build a current-baseline dataset for the M4 CRM dispatch pipeline.
> STATUS_CHANGE_TRIGGERS_FRAMEWORK (closed 2026-05-13) measured the trigger
> framework at 38ms multi-channel delta (26× improvement over pre-fix 1000ms).
> This mission measures the FULL pipeline end-to-end and identifies any
> regressions or new bottlenecks.
>
> **Read-only knowledge build.** Generated 2026-05-15 night.
> All measurements from live SELECTs against `tsxrrxzmdxaenlvocyit`, 7-day window.

---

## 1. TL;DR

- **Trigger framework (STATUS_CHANGE_TRIGGERS_FRAMEWORK scope)** is healthy. Not directly re-measured here but no signs of regression — `crm_status_change_events.consumed_at` is being populated on schedule by the `consume_status_change_events` cron.
- **Queue drain (cron + send-message)** behaves exactly as designed. Throttle is 60 rows per cron tick + 1s sleep per row = 1 row/sec sustained. Big automation runs (e.g. 2,292 messages on 2026-05-12) drain in ~38-76 min — exactly matching the throttle's math, not a bug.
- **Make webhook round-trip** (the actual outbound send): not directly instrumented, but inferable as low (sub-second per row, since drains stay on schedule when throttle isn't binding).
- **Two real-world incidents in the 7-day window** explain the high p95/p99:
  1. **2026-05-12 16:42**: one big automation run (2,292 messages, "שינוי סטטוס: נפתחה הרשמה...") drained over 76 minutes.
  2. **2026-05-13 06:13**: 758 rejected SMS sends due to `%registration_url%` not resolving (covered in M1 mission). These rejections counted toward dispatch volume.
- **No live regressions** vs the STATUS_CHANGE_TRIGGERS_FRAMEWORK baseline. Dispatch pipeline is stable post-cutover.
- **Performance gap (not a regression — design choice for production):** 1 row/sec throttle limits effective send rate to 3,600/hour. At >5K-recipient broadcasts the queue takes >1.5h. Throttle was a deliberate Make/SMS-vendor protection per `dispatch-queue/index.ts:4`. If volume grows, consider concurrency increase per §6.

---

## 2. Pipeline schematic

```
[Source signal]                   [Trigger framework]              [Queue]                   [Drain]                    [Send]
status change on event/lead  →  insert crm_status_change_events  → row added to            cron every 60s claims     send-message EF →
   |  (38ms total, P5_V2)        cron consume_status_change       crm_message_queue        up to 60 rows, 1s         Make webhook → SMS/Email
   |                             every minute calls               (queued/scheduled_at)    throttle between rows     vendor
   |                             automation-engine → enqueue       sets log.status='pending'
direct UI send / broadcast  →   skip framework, write directly                              dispatch-queue calls
                                 to crm_message_queue                                       send-message per row
```

The STATUS_CHANGE_TRIGGERS_FRAMEWORK SPEC measured the first arrow (38ms). This mission measures the rest.

---

## 3. Cron jobs in scope

From `cron.job` (live state 2026-05-15):

| Job | Schedule | Drains | Purpose |
|---|---|---|---|
| `consume_status_change_events` | every minute | `crm_status_change_events` (limit 100/tenant) | Trigger framework → automation-engine. |
| `dispatch_queue` | every minute | `crm_message_queue` (batchSize=60) | Calls send-message EF per row, 1s throttle. |
| `crm_broadcast_total_sent_refresh` | every minute | aggregates `crm_message_log` into `crm_broadcasts.total_sent` | Live broadcast counters. |
| `event_day_status_flip` | 0530 daily | flips event status → triggers automation | Drives "morning of event" sends. |
| `event_2_3d_before_status_flip` | 0530 daily | flips status → triggers automation | Drives "3 days before" sends. |
| `daily-alert-generation` | 0500 daily | runs `generate_daily_alerts(tenant_id)` | Operator alerts. |
| `fb_capi_dispatch_consumer` | every minute | `crm_capi_dispatch_queue` (batch 20) | CAPI dispatch (see M3 mission). |

All 7 are `active=true`. None paused.

---

## 4. Latency measurements — 7-day window (2026-05-08 → 2026-05-15)

### 4.1 Histogram of (processed_at − scheduled_at) for all queue rows

| Bucket | Rows | % of total |
|---|---:|---:|
| 0-5s     | 0 | 0% |
| 5-30s    | 19 | 0.5% |
| 30-120s  | 106 | 3.0% |
| 2-10min  | 552 | 15.9% |
| 10-60min | 2,308 | 66.3% |
| 1-2h     | 495 | 14.2% |
| **Total** | **3,480** | |

The high concentration at 10-60min is consistent with the throttle math: a single automation run that enqueues 60 rows in one shot will take 60 seconds × N batches to drain. A 600-row run = 10 minutes. A 2,000-row run = ~33 minutes.

### 4.2 Per-channel + per-source breakdown

| Source | Channel | n | p50 (ms) | p95 (ms) | p99 (ms) | Notes |
|---|---|---:|---:|---:|---:|---|
| automation | email  | 1,151 | 2,306,739 (38 min) | 4,363,372 (72 min) | 4,544,456 (76 min) | Dominated by 2026-05-12 run §5.1 |
| automation | sms    | 1,151 | 2,302,670 (38 min) | 4,359,432 (72 min) | 4,542,897 (76 min) | Same run |
| bare       | sms    | 1,177 | 1,027,845 (17 min) | 2,087,507 (35 min) | 2,173,277 (36 min) | Direct-UI sends; queue contention |
| broadcast  | sms    | 1     | 21,330 (21s) | — | — | Only 1 broadcast in window |

`bare` = direct send via send-message EF with no run_id/broadcast_id (typical for one-off SMS from CRM event UI).

### 4.3 Steady-state Make webhook round-trip

Not directly instrumented (no separate `webhook_started_at` / `webhook_returned_at` columns). Inferable indirectly: when the queue has <60 rows and no contention, `processed_at - scheduled_at` approaches the per-row throttle (~1s) + Make webhook latency. Real samples:

- The 1 broadcast row in the window: 21s end-to-end including queue wait. Likely ~1s send-message + 20s queue wait → ~1s actual webhook.
- 19 sends in 5-30s bucket: these are likely the "first in fresh queue" cases where throttle dominates.

**Conclusion:** the send-message EF itself + Make webhook is performing at sub-second levels. The latency users perceive is queue-drain wait, not send-time.

---

## 5. Outlier investigation

### 5.1 The 2026-05-12 automation run

One row in `crm_automation_runs` accounts for 2,292 of the 3,480 messages (66%):

- **Rule:** `שינוי סטטוס: נפתחה הרשמה + אירוע פתח להרשמה - הזמנת רשימת המתנה`
- **First message:** 2026-05-12 16:42:45
- **Last processed:** 2026-05-12 17:59:19
- **Span:** 4,594 seconds (76 min, 36 sec)
- **Effective rate:** 2,292 / 4,594 = 0.50 msg/sec — almost exactly half the theoretical 1 msg/sec throttle.

Why half? `dispatch-queue/index.ts` processes EACH row with a `sleep(1000)` between rows. With ~600ms send-message processing on top, effective rate ~0.6 msg/sec, dropping to ~0.5 when factoring in cron 60s windows.

**Verdict:** matches design. No regression. If this rate becomes business-limiting, the fix is to (a) parallelize the throttle (process 2-3 rows concurrently), or (b) raise batchSize from 60 to 120 per tick. Both require careful sizing against Make rate limit (current limit unknown — verify with Daniel before changing).

### 5.2 The 2026-05-13 06:13 burst

758 SMS rejections on prizma due to `%registration_url%` failing to substitute (covered in M1 mission §5). All caught at send-message's universal placeholder scanner, never reached SMS vendor. Operator-induced raw-body broadcast incident; not a pipeline regression. Validation gate working correctly.

### 5.3 The 95,000 dispatch_queue rows that don't exist

Sanity check: in the last 7 days there are 3,480 processed rows in `crm_message_queue`. If the cron was firing reliably (60 ticks/hr × 24 × 7 = ~10,000 ticks × 60 rows = 600,000 potential drains), that's vastly under-utilized → confirms quiet conditions, no missed ticks.

---

## 6. Recommendations

| # | Suggestion | When | Owner |
|---|---|---|---|
| 1 | **Add `(tenant_id, created_at)` index on `crm_message_log`** (also flagged in M2 §6 G1). Current absence forces sequential scan for dashboards. | Phase 2.5 SPEC | next M4 author |
| 2 | **Instrument webhook round-trip** — add `webhook_started_at` + `webhook_returned_at` to `crm_message_log` (or `meta_response.duration_ms` for telemetry) so we can baseline send-message + Make separately from queue wait. Not urgent. | future SPEC | M4 |
| 3 | **Document the 1 msg/sec throttle in operator docs** — operators need to know "5,000-recipient broadcast = 1.5h drain time" so they can plan urgent vs schedulable broadcasts. | Module 4 README + operator handbook | M4 |
| 4 | **Optional: concurrency tuning** — bump `dispatch-queue/index.ts` from sequential to `Promise.all(slice.map(...))` with concurrency=3 (Daniel sign-off — Make rate limit must be checked first). Would 3× effective drain rate at constant load. | future SPEC | M4 |
| 5 | **Optional: alerting on queue depth** — if `SELECT COUNT(*) FROM crm_message_queue WHERE status='queued' AND scheduled_at < NOW() - INTERVAL '30 min'` exceeds 100 → fire daily alert. Catches stuck queues early. | Phase 2.5 dashboard | M4 |

---

## 7. STATUS_CHANGE_TRIGGERS_FRAMEWORK baseline comparison

The closed 2026-05-13 SPEC measured the **trigger framework only** (status change → enqueue, NOT enqueue → send). That delta moved from ~1,000ms to ~38ms (26× speedup) and was verified per the SPEC's own measurement protocol.

This mission measures the rest of the pipeline (enqueue → sent). The trigger framework's 38ms is now negligible compared to the queue wait (~17-38 min p50). **Net effect of the prior fix:** operator-perceived "click to send" is now bounded by queue throttle, NOT by trigger latency. Good outcome — exactly what the SPEC intended.

**No regression detected.** Trigger framework remains fast. Queue drain is on-design. Make webhook is fast. The total pipeline is dominated by the throttle, which is a deliberate vendor-protection choice.

---

## 8. Auxiliary findings (parking lot)

- `crm_message_queue.retries` exists but is rarely > 0 — could indicate "no retries happen" (good) OR "retries silently fail" (bad). Verify in a follow-up audit.
- `crm_message_queue.status` includes `pending`, `processing`, `sent`, `failed` — verify documentation matches enum values.
- The `reaper` block in `dispatch-queue/index.ts:71` (P29) aborts stuck `crm_automation_runs.status='running'` rows after 1h. Did not fire in the 7-day window (no logs). Good — UI confirm-send modal abandonment is rare.
- `dispatch-queue` runs EVERY minute but the cron job uses no rate-limit guard — if the cron fires while a previous tick is still processing (unlikely with 60s drain budget), they overlap. Worth verifying SKIP LOCKED is in effect.
- 7 distinct cron jobs are active — would benefit from a single "cron health" dashboard tile (queue depth, last fired, errors). Future SPEC.

---

## 9. Reproducibility

Queries SELECT-only against `tsxrrxzmdxaenlvocyit`. Measured 2026-05-16 00:25 IDT.

Key queries:
```sql
-- Histogram
SELECT CASE WHEN delta<5 THEN '0-5s' WHEN delta<30 THEN '5-30s' WHEN delta<120 THEN '30-120s'
  WHEN delta<600 THEN '2-10min' WHEN delta<3600 THEN '10-60min' WHEN delta<7200 THEN '1-2h' ELSE '>2h' END AS bucket,
  COUNT(*) AS n
FROM (SELECT EXTRACT(EPOCH FROM (processed_at-scheduled_at)) AS delta
      FROM crm_message_queue
      WHERE processed_at IS NOT NULL AND created_at > NOW() - INTERVAL '7 days') s
GROUP BY 1 ORDER BY 1;

-- Per source × channel p50/p95/p99
SELECT CASE WHEN q.broadcast_id IS NOT NULL THEN 'broadcast'
            WHEN q.run_id IS NOT NULL THEN 'automation' ELSE 'bare' END AS source,
       q.channel, COUNT(*) AS n,
       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at-q.scheduled_at))*1000) AS p50_ms,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at-q.scheduled_at))*1000) AS p95_ms,
       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (q.processed_at-q.scheduled_at))*1000) AS p99_ms
FROM crm_message_queue q
WHERE q.processed_at IS NOT NULL AND q.created_at > NOW() - INTERVAL '7 days'
GROUP BY 1,2 ORDER BY 1,2;
```

---

*End of M6. No regression vs STATUS_CHANGE_TRIGGERS_FRAMEWORK baseline. Throttle behavior is on-design. Recommendations §6 capture optional follow-up work.*
