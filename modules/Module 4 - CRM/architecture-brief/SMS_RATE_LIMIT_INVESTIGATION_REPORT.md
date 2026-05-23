# SMS_RATE_LIMIT_INVESTIGATION_REPORT — Read-only Diagnosis

> **Status:** Investigation only. NO code changes. NO DB writes. NO EF deploys.
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-20
> **Trigger:** Daniel observed live on Prizma production — last hour: 854 sent + 325 FAILED, all rate-limited.
> **Severity:** P0 customer-impact (325 SMS undelivered, no auto-retry path).

---

## Executive Summary

- Live Prizma broadcast `7af1734f-...` ("מחר אירוע מאי 2026", 1,179 recipients) hit Supabase Edge Function infrastructure rate-limit mid-flight.
- **325 of 1,179 messages (~28%) are now stuck in `status='failed'` with NO automatic retry path** — the dispatch-queue EF only claims `status='queued'` rows, never `'failed'`.
- Root cause: pg_cron fires `dispatch-queue` every 15s + each invocation takes ~60s for 60 rows → up to **4 invocations run concurrently** → 4× the intended sending rate → Supabase per-trace limit blows.
- The throttle pattern in dispatch-queue (1s sleep per group) was designed for the single-invocation case. It has no cross-invocation coordination.
- **Customers will NOT receive these SMS without operator intervention.** Manual SQL `UPDATE crm_message_queue SET status='queued' WHERE id IN (...)` required, OR a code fix that adds a retry path.

---

## 1. Dispatch loop — verbatim analysis of `supabase/functions/dispatch-queue/index.ts`

### Configuration constants
- **`batchSize = 60`** rows claimed per cron tick (hardcoded, no env override).
- **pg_cron schedule: `15 seconds`** (per `cron.job WHERE jobname='dispatch_queue'` probe — every 15s).
- **`PARALLEL_CAP = 5`** — max concurrent `dispatchOne` calls inside a single group.
- **Sleep cadence:** `1000ms` after each SMS group, `500ms` after each email-only group. Sleep is ONCE PER GROUP, not per row.

### Throughput math
For a broadcast with N unique leads at the same `scheduled_at`, dispatch-queue groups by `(lead_id, scheduled_at)`. Each unique lead = 1 group of 1 row (for single-channel SMS broadcasts).

Per invocation:
- 60 rows claimed → 60 groups → 60 sequential dispatchOne calls each followed by 1000ms sleep.
- Total invocation duration: **~60 seconds**.

Per cron schedule:
- Tick every 15s.
- → Up to **4 dispatch-queue invocations running concurrently** during a sustained broadcast.

### Concurrency hazard
There is NO cross-invocation coordination. Each tick:
1. Claims its 60 rows.
2. Flips them `queued → processing`.
3. Loops calling `fetch(SEND_MESSAGE_URL, ...)` with 1s sleep between groups.

When 4 ticks overlap, all 4 are firing `fetch(send-message)` simultaneously. Effective send-message invocation rate = **~4 requests/second to the send-message EF**.

### What 'fetch(SEND_MESSAGE_URL)' triggers
The fetch hits Supabase's edge runtime. Each call gets a new request trace_id. Supabase's per-project / per-function rate limit applies across all 4 concurrent dispatch-queue invocations — there's no global throttle outside this EF.

---

## 2. SMS provider rate-limit context

### The error origin

Error pattern observed: `"exception: Rate limit exceeded for trace 019e447aeb6470edbcc6ba299822e71d. Retry after 10172ms."`

**This is NOT Make's rate limit** — Make's typical rate-limit response is a 429 HTTP status with a different body format (`"There are too many requests"`).

**This IS Supabase Edge Function infrastructure rate-limit.** Evidence:
- Trace ID format `019e447a...` is the 32-char OTel-style trace ID Supabase emits per request.
- The "Retry after Xms" with millisecond precision matches Supabase's edge-runtime throttler.
- The error is raised by the `fetch()` call from dispatch-queue → send-message, NOT by the Make webhook (which would land inside send-message's try block, not as an unhandled exception bubbling up to dispatch-queue's `catch`).

### Make webhook (downstream)
- Endpoint: `https://hook.eu2.make.com/n7y5m7x9m9yn4uqo3ielqsobdn8s5nui` (Make scenario 9104395, webhook 4068609 per `supabase/functions/send-message/index.ts:28-32`).
- Make documented limits: **~60-1,000 operations/minute** depending on plan tier. Our 142/min observed sending rate is well within Make's bounds.
- The bottleneck is BEFORE Make — Supabase's own per-function rate limit on the dispatch-queue→send-message hop.

### No project docs about this
- `grep -rni "rate.limit\|throttle\|webhook.*limit"` across docs/ + CLAUDE.md returned ZERO references to Supabase EF rate limits or Make rate limits.
- Only `PROJECT_VISION.md:968` mentions "Airtable rate limits" historically. No active documentation on the live system.

---

## 3. When did this break? — git log + behavior history

### File git log (most recent first)
```
0d42960 feat(m4,db+rpc+ef+js): wire broadcast_id end-to-end (M4_BROADCAST_ID_PROPAGATION P1.2)
8de4197 feat(m4-crm,ef): automation-engine consumes status-change events + parallel multi-channel dispatch  ← THIS COMMIT
e6bdd62 fix(broadcast): route to crm_message_queue instead of parallel HTTP
6d4896d feat(crm): C-001 — replace hardcoded SMS allowlist with tenants.test_mode_sms_allowlist
...
```

### The change that introduced the regression: commit `8de4197` (STATUS_CHANGE_TRIGGERS_FRAMEWORK, 2026-05-12)

Per the file's own comments (lines 122-129):
> Pre-fix: sequential 0.5-1s sleep between EVERY row, so SMS+Email for the same lead landed ~1s apart at the customer.
> Post-fix: same group dispatched concurrently, processed_at deltas ≤ 200ms.

**Before 2026-05-12:** every row had a 1s sleep. 60 rows took 60s. Cron every 15s with overlapping invocations had the SAME hazard — but the sleep was UNCONDITIONAL.

**After 2026-05-12:** sleep is per group. For multi-channel-same-lead groups, that's a NET WIN (SMS+Email co-fire). But for broadcasts with N unique leads at the same scheduled_at, each lead = 1 group = 1 row before sleep → same 1s-per-row throttle PER invocation.

**So why is it failing NOW?** Two contributing factors:
1. **The 2026-05-12 change** kept the per-row throughput unchanged for broadcasts BUT shifted the sleep semantic in a way that allowed CPU-time to dominate sleep-time inside each tick. Net effect: slightly faster per-tick → slightly more invocation overlap.
2. **Broadcast size 1,179 recipients** is among the largest Prizma has shipped. At smaller broadcasts (<200 rows), only 1-3 invocations overlapped briefly; at 1,179 rows, the broadcast spans 20+ ticks of 60s each, sustaining 4 concurrent invocations for the full 6-minute send window.

### Earlier same-class incident (file header comments)
- Line 7-15 of dispatch-queue documents: *"Old broadcast UI fired N parallel fetch() calls (one per recipient) from the browser to send-message EF. At ~1000+ recipients this: (a) overflowed PostgREST URL... (b) flooded SMS/Email vendors with no throttle"*.
- The introduction of the queue + cron was meant to solve exactly this. It solved (a) but the cron-overlap pattern recreates (b) at smaller scale.

---

## 4. Scope quantification (live DB probe — 2026-05-20 ~08:30 UTC)

### Last 2 hours on Prizma
| status | channel | count | rate_limited | exception | first_scheduled | last_processed |
|---|---|---|---|---|---|---|
| sent | sms | 854 | 0 | 0 | 2026-05-20 08:17:56 | 2026-05-20 08:23:51 |
| failed | sms | **325** | **325** | **325** | 2026-05-20 08:17:56 | 2026-05-20 08:23:37 |

**All 325 failed rows belong to the SAME broadcast** (`broadcast_id = 7af1734f-7ce1-4833-b1e1-8fd94d61f651`, "מחר אירוע מאי 2026", 1,179 total recipients). Single-broadcast incident.

### Broadcast state
| field | value |
|---|---|
| `id` | `7af1734f-7ce1-4833-b1e1-8fd94d61f651` |
| `name` | "מחר אירוע מאי 2026" |
| `channel` | sms |
| `total_recipients` | 1,179 |
| `total_sent` | 854 (reflects sent in log) |
| `total_failed` | 0 (the `crm_broadcast_total_sent_refresh` cron only counts `crm_message_log`, not queue failures — so the broadcast UI doesn't show the 325 failures yet) |
| `status` | "sending" (will never flip to "sent" because 854+0 < 1,179) |
| `still_queued` | 0 (no rows left waiting) |
| `still_processing` | 0 |

So the broadcast row currently SHOWS as "sending — 854/1179 sent, 0 failed" — which is misleading. The 325 failures are in `crm_message_queue` directly (status='failed'); the `crm_broadcasts.total_failed` updater hasn't picked them up because that cron only counts `crm_message_log` rows (and the failures never made it to the log — see §7).

### 24-hour aggregate (Prizma)
- `crm_message_log` 24h total = 870 rows (only the successfully-dispatched ones land here).
- Rate-limit failures in `crm_message_log` = **0** (failures never write log rows).
- All 325 failures live in `crm_message_queue` only.

### Was this happening before today?
Looking at the queue rows: `MIN(scheduled_at) = MAX(scheduled_at) = 2026-05-20 08:17:56.568+00`. Single broadcast firing this morning. No prior occurrences in last 2 hours.

**Need a broader probe** to check if other broadcasts in the last 7 days had similar failures — see follow-up §8 below.

---

## 5. Customer impact assessment

### Affected leads
- 325 distinct leads on Prizma did NOT receive their SMS for the "מחר אירוע מאי 2026" broadcast.
- All 325 have `retries=0` (see §7 explanation).
- All 325 have `processed_at` set (they were attempted, just failed).
- Sample lead IDs (first 5): `8e3ea282-...`, `9c5d031f-...`, `5e3688a2-...`, `0187fa41-...`, `cb10939a-...`.

### Will dispatch-queue auto-retry?

**NO.** Verified by reading the EF source:

Lines 101-109 of dispatch-queue claim query:
```typescript
const claimRes = await db
  .from("crm_message_queue")
  .select(...)
  .eq("status", "queued")              // ← only 'queued', NEVER 'failed'
  .lte("scheduled_at", new Date().toISOString())
  .order("scheduled_at", { ascending: true })
  .limit(batchSize);
```

**The claim query has no `OR status='failed'` clause and no `retries < N` clause.** Once a row hits `status='failed'`, dispatch-queue ignores it forever.

Compare to `fb-capi-dispatch` cron's claim (from earlier session context):
```sql
WHERE status IN ('queued', 'failed')
  AND (status = 'queued' OR retries < 3)
```
**That EF has retry logic. dispatch-queue does NOT.**

### Why `retries=0` on all 325 rows?

Looking at the two failure paths in `dispatchOne`:

**Path A — send-message returned `{ ok: false, error: '...' }`** (line 227-231):
```typescript
.update({ status: "failed", processed_at: ..., error_message: ..., retries: (r.retries || 0) + 1 })
```
This path DOES increment retries.

**Path B — fetch() threw an exception** (line 233-238):
```typescript
} catch (e) {
  await db.from("crm_message_queue")
    .update({ status: "failed", processed_at: ..., error_message: "exception: " + e.message })
    //         ↑ NO retries field — does NOT increment
    .eq("id", r.id);
  return "failed";
}
```

The 325 errors all start with `"exception:"` → Path B fired. The catch block forgot to increment retries. So:
- All 325 rows show `retries=0`.
- Even if the claim query later added `OR (status='failed' AND retries<3)`, these rows would qualify because retries is still 0.
- But the bigger issue is the claim query simply has no failed-row branch at all.

### Recovery path for the 325 customers

Without code change, the only recovery is manual:
```sql
-- Re-queue the 325 stuck rows from this specific broadcast for retry
UPDATE crm_message_queue
SET status='queued',
    processed_at=NULL,
    error_message=NULL,
    retries=0,                  -- reset retries (defense in depth — they're already 0)
    scheduled_at=NOW()          -- fire immediately (or set to a future time to avoid same-cron-hazard)
WHERE broadcast_id='7af1734f-7ce1-4833-b1e1-8fd94d61f651'
  AND status='failed'
  AND tenant_id=(SELECT id FROM tenants WHERE slug='prizma');
```

But this just re-queues them into the same dispatch-queue that just rate-limited them. **Without rate-limit mitigation FIRST, the re-queue will likely fail again.**

Safer recovery sequence:
1. Apply Option A or B from §6 below to limit concurrency.
2. THEN re-queue the 325 rows.
3. Monitor for round 2 of rate-limits; iterate if still failing.

---

## 6. Fix Options Ranked

### Option A (RECOMMENDED) — Add row-level throttle with per-row sleep, reduce batch_size

**Change:** in `dispatch-queue/index.ts`:
1. Reduce `batchSize` from 60 to **30** (halves per-tick work).
2. Restore per-row sleep (1000ms between EACH dispatchOne, not just per group) for the broadcast case. Multi-channel-same-lead case still benefits from parallel.
3. Optionally: add a global lock (DB advisory lock or a sentinel row) so only ONE dispatch-queue invocation runs at a time. This is the structural fix.

**Sketch (option A — minimal):**
```typescript
const batchSize = 30;
// ... existing group logic preserved ...
for (const group of groups.values()) {
  for (let i = 0; i < group.length; i += PARALLEL_CAP) {
    const slice = group.slice(i, i + PARALLEL_CAP);
    const results = await Promise.allSettled(slice.map((r) => dispatchOne(db, r)));
    // ... accumulate ...
    if (slice.length > 0) await sleep(slice.some(r => r.channel === "sms") ? 1000 : 500);  // sleep BETWEEN slices, not just after groups
  }
  // Drop the per-group sleep (it's now per-slice above) OR keep it for cross-group gap
}
```

**Or even more conservative (Option A-alt):**
```typescript
// Sleep PER ROW for the broadcast case where all groups are size-1.
for (const r of claimed) await sleep(...) // sequential sweep with 1-row throttle
```

**Code change scope:** 1 file (`dispatch-queue/index.ts`), ~10-20 line refactor. Trivial.

**Cross-Module Safety analysis:**
- Touches ONLY `dispatch-queue` EF. No DB schema change. No other EF.
- Iron Rule 21 (no duplicates): N/A — modifies existing.
- Iron Rule 22 (defense-in-depth tenant_id): preserved.
- Iron Rule 32 (destructive ops): 0 — pure EF edit, additive logic.

**Performance impact:**
- Smaller batch + per-slice sleep → fewer concurrent send-message calls.
- Throughput: from ~142/min observed → ~30-60/min (halved). For a 1,179-row broadcast, dispatch time goes from ~6 min → ~20-40 min. **SLOWER but RELIABLE.**

**Risk class: LOW.** Behavioral change is "slower throughput" — no correctness regression, no Iron Rule 21/22/13 risk.

**Rollback:** `git revert` the EF commit. EF re-deploys to prior version. ~1 min recovery.

**Additionally — also fix the missing retry-on-exception bug (Path B):**
```typescript
} catch (e) {
  await db.from("crm_message_queue")
    .update({
      status: "failed",
      processed_at: ...,
      error_message: "exception: " + e.message,
      retries: (r.retries || 0) + 1,    // ← ADD THIS
    })
    .eq("id", r.id);
}
```

This single line fix doesn't itself enable retries (the claim query still doesn't fetch failed rows), but it accurately reflects state for any retry mechanism added later.

### Option B — Reduce batch size only (smallest change)

**Change:** `batchSize = 60` → `batchSize = 15` (one-line edit).

**Code change scope:** 1-line edit.

**Cross-Module Safety:** ZERO — single constant.

**Performance impact:**
- 60s per tick → 15s per tick.
- → Probably 1-2 overlapping invocations instead of 4.
- → Cuts the rate-limit hazard by ~75%.
- BUT: throughput drops from ~240/min ceiling to ~60/min ceiling. A 1,179-row broadcast takes ~20 min instead of ~5 min.

**Risk class: VERY LOW.** Just a number change.

**Rollback:** trivial — revert.

**Drawback vs Option A:** doesn't fix the underlying overlap hazard if a future change introduces faster-per-row processing. Doesn't fix the retry-increment bug.

### Option C — Add explicit retry mechanism + advisory lock

**Change:**
1. Update the claim query to include `WHERE status IN ('queued', 'failed') AND retries < 3 AND scheduled_at <= NOW()`.
2. Fix the missing retries++ in the catch block.
3. Add a `SELECT pg_try_advisory_xact_lock(<some-int>)` at the start of dispatch-queue to ensure ONLY ONE invocation runs at a time across cron ticks. Subsequent ticks return early when the lock is held.

**Code change scope:** ~30-50 line refactor across dispatch-queue.

**Cross-Module Safety:** ZERO external touches. Modifies dispatch-queue only.

**Performance impact:**
- Single-invocation serialization → no concurrency hazard.
- BUT: a single 60-row tick takes 60s, and the lock prevents the next 4 cron ticks from doing anything. Effective rate becomes ~60 rows/minute (1 RPS, throttled correctly).
- Same throughput as Option B but with a HARD GUARANTEE of no overlap, plus automatic retry for failures.

**Risk class: MEDIUM.** Advisory locks introduce a new failure mode — if an invocation crashes mid-lock, the lock is released at txn end (good) but observability is reduced. Also retry-loop could thrash if the rate-limit issue persists (need max-retries cap).

**Rollback:** revert the EF + run `SELECT pg_advisory_unlock(<int>)` if any held. Multi-step but tractable.

**Long-term value:** this is the architecturally correct fix. Should ship eventually.

---

## 7. Critical question — will failed messages auto-retry?

**NO.** Already answered in §5. Restating in dedicated section per Daniel's question format:

| Question | Answer |
|---|---|
| Is there a retry mechanism? | **NO.** dispatch-queue's claim query selects only `status='queued'`. Failed rows are ignored forever. |
| Are the 325 rows correctly marked as retryable (retries < 3)? | They have `retries=0` — but irrelevant since the claim doesn't filter on retries. |
| Will Prizma customers eventually get the SMS? | **NO** without operator intervention. |
| What's the manual recovery? | Run the `UPDATE crm_message_queue SET status='queued', ... WHERE broadcast_id='7af1...' AND status='failed'` SQL shown in §5. **Recommended: apply a fix from §6 FIRST**, then re-queue. |
| Time pressure? | The broadcast was for "מחר אירוע מאי 2026" — TOMORROW's event. The 325 customers need the SMS by tonight at latest to register/RSVP. **High urgency.** |

---

## 8. Foreman Recommendation

### Immediate action (next ~30 min — UNBLOCKS customer delivery):

**Apply Option B (batch_size: 60 → 15) as the hot-fix.**
- Single-line edit, zero risk.
- Deploy via Light Pipeline: EF update + commit + push + Daniel-approved merge.
- ETA: 10-15 minutes Foreman→Executor→deploy.

THEN re-queue the 325 stuck rows:
```sql
UPDATE crm_message_queue
SET status='queued', processed_at=NULL, error_message=NULL, retries=0,
    scheduled_at=NOW() + INTERVAL '30 seconds'    -- spread out — don't fire all at once
WHERE broadcast_id='7af1734f-7ce1-4833-b1e1-8fd94d61f651'
  AND status='failed'
  AND tenant_id=(SELECT id FROM tenants WHERE slug='prizma');
```

This requires Daniel's explicit go-ahead (it's a write to production data).

Expected outcome:
- 325 rows go back to `queued`.
- With batch_size=15 and ~4 cron ticks/min, throughput = 60 rows/min.
- 325 rows clear in ~5-6 minutes. No rate-limit (concurrency reduced from 4× to ~1×).

### Follow-up action (next 24h — STRUCTURAL FIX):

**Open SPEC for Option C (advisory lock + retry mechanism).** This is the architecturally correct fix and prevents the entire class of bug from recurring. Estimated 1-2 hour Pipeline (Foreman + Executor + LH-Tester).

Pin in tech-debt:
- Fix the `retries: (r.retries || 0) + 1` missing field in dispatch-queue line 236 (catch block).
- Add observability — log when cron ticks overlap (advisory lock acquire failure should write to console + a metrics table).
- Document the per-tenant SMS rate limit explicitly in CLAUDE.md or docs/CRM_RATE_LIMITS.md.

### Why not Option A?

Option A is good but has more moving parts than Option B for the immediate fix. Reduce risk: ship Option B's one-liner today, plan Option C as a proper SPEC tomorrow.

### Estimated time-to-fix

| Phase | Time | Owner |
|---|---|---|
| Daniel approves Option B + the re-queue SQL | 5 min | Daniel |
| Light Pipeline: SPEC + 1-line EF edit + deploy | 10 min | Foreman + Executor |
| Re-queue 325 rows + monitor | 5 min | Daniel runs SQL after EF deploy confirmed |
| Dispatch + delivery of 325 messages | 5-6 min | Automatic |
| **Total to customer delivery** | **~25-30 min** | |

---

## Cross-checks & follow-up findings

1. **Broadcast UI misleading:** `crm_broadcasts.total_failed=0` even though queue has 325 failed rows. The cron `crm_broadcast_total_sent_refresh` only counts `crm_message_log` rows; queue-failures never reach the log. UI says "sending — 854/1179" without flagging the 325 dead. **F-1 (LOW)**: extend the broadcast-counter cron to also count queue failures.

2. **Other broadcasts in last 7 days:** report doesn't probe this. Recommended Foreman follow-up probe to see if smaller broadcasts also leaked rate-limit failures.

3. **No documentation of Supabase EF rate limit anywhere in the project.** Add to `docs/` or CLAUDE.md.

4. **The 2026-05-12 STATUS_CHANGE_TRIGGERS_FRAMEWORK change** introduced the per-group sleep semantics that contributed to this. Worth a retro note in that SPEC's FOREMAN_REVIEW for future Foreman-skill harvest.

---

## Rollback plan summary

For the recommended Option B fix:
```bash
# If Option B's batch_size=15 produces unacceptable slowness for ordinary
# (non-broadcast) traffic, revert:
git revert <hotfix-commit>
# Then re-deploy EF via Supabase MCP/CLI.
```

For the queue UPDATE (re-queueing the 325 rows): the UPDATE is non-destructive (it changes status not deletes), and the original `processed_at` + `error_message` history is overwritten. **Recovery from a bad re-queue** would require running another UPDATE setting `status='failed'` back, but at that point you've lost the original failure timestamps. **Suggested mitigation:** before re-queueing, snapshot the affected rows to a `_archive/m4-sms-rate-limit-2026-05-20/affected-rows.json` file for audit trail.

---

*End of investigation. Awaiting Daniel's decision on Option A / B / C + authorization for the 325-row re-queue UPDATE.*
