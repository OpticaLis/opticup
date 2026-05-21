# INCIDENT_REPORT — M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21

> **Severity:** P0 — unintended customer-facing dispatch on production tenant.
> **Date:** 2026-05-21.
> **Tenant impacted:** Prizma only.
> **Customer-facing impact:** 165 messages dispatched in real time to Prizma leads (84 SMS + 81 email) for the `event_registration_open` template on event #25 ("אירוע המותגים - מאי 2026", date 2026-05-29). Zero duplicate-to-same-lead-same-channel sends (verified via `crm_message_log` GROUP BY).
> **Recovered:** ~11,224 additional queue rows cancelled before dispatch. The remaining audience (1,087 SMS + 1,086 email = the still-eligible `status='waiting'` leads) was completed afterwards via Daniel-authorized manual re-enqueue (see §4.2 below).

---

## 1. Timeline (UTC)

| Time | Event |
|---|---|
| 09:35–09:40 | Foreman authored SPEC; Executor added §10 instrumentation commit `ca93db8` |
| 09:40:31 | Operator click "שנה סטטוס → הרשמה פתוחה" on Prizma event #25 (FIRST attempt, instrumented but pre-Fix-D). `previewPromise` enters PENDING state. |
| 09:40:31 + ~10 s | No response — `dispatch_preview` EF returns 26 MB / 76 s response; client fetch keeps pending. Trace stops at `changeEventStatus:beforeProbeAndCommit`. |
| ~09:41 | Executor confirms F4 finding (preview hang). Applies "Fix D" — `Promise.race([previewPromise, 10s_timeout_sentinel])` so the change-status flow can no longer hang on the modal preview. **The fix worked as written — but it was the wrong shape.** |
| 09:41:22 | Page reloaded; SECOND click. Fix D timeout fires at +10 s → silent commit fires → `crm_events.status='registration_open'`. SCE row inserted by the `event_status_change_event_fn` DB trigger. |
| 09:42:19 | First dispatch-queue cron tick drains a batch; 165 messages sent (84 SMS + 81 email). |
| 09:42–09:43 | Operator notices messages going out → user invokes emergency halt. |
| 09:43 | Executor (a) `UPDATE crm_automation_rules SET is_active=false` on both `registration_open` rules. (b) `UPDATE crm_message_queue SET status='cancelled'` on 4,577 rows. |
| 09:50:33 | Daniel-authorized completion: re-enable rule 1 + insert fresh SCE row. Cron consumes. |
| 09:51:35 | Consumer marks SCE consumed, but in the elapsed 62 s the consumer cron fired multiple times in parallel — each producing its own ~2,251-row enqueue batch. ~6,661 queue rows accumulate. |
| 09:52 | Operator notices second mass enqueue. Second emergency halt. Rule 1 re-disabled. Remaining 6,661 rows cancelled. |
| 09:55 | Daniel authorizes a direct manual re-enqueue with explicit dedupe (skip leads who got `sent` log row in last 30 min). |
| 09:55 | Direct INSERT enqueues 1,087 SMS + 1,086 email rows for the still-eligible audience (`status='waiting'`, no prior `sent` log row in 30 min). `ON CONFLICT DO NOTHING` against `uq_crm_message_queue_idem`. Rule stays disabled. |
| 09:58 | Foreman reverts the JS files (Commit 2 + Fix D both gone) → working tree returns to `origin/main` state. Both rules re-enabled. Revert pushed (`94f94b9`). |
| 09:58→onward | dispatch-queue cron drains the 2,173 manually-enqueued rows. |

---

## 2. Root Causes (3 layers, all independent)

### 2.1 — Cascade trigger: SPEC author's reasoning gap (Foreman / me)

The SPEC's §3 Success Criterion 9 ("Iron Rule 34 — Chrome MCP live verification on **Prizma event #25**") instructed the Executor to click the actual status-change dropdown on Prizma. The SPEC §0 Decision Table pre-bound the Executor to apply "Fix D" (timeout) if trace indicated F4 (EF hang).

What the SPEC author MISSED: clicking "הרשמה פתוחה" on Prizma event #25 is itself a destructive operation — it's the trigger for production automation against 1,210 leads. The SPEC pre-flight should have included an explicit "disable the 2 `registration_open` rules BEFORE the live click, re-enable AFTER verification" step.

**Why this slipped:** the original diagnostic (`BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21.md`) reported the silent fail as a bug. The Foreman accepted the framing without realizing the silent fail was inadvertently protecting Prizma from mass dispatch. The "fix" removed the protection. **This is the most important learning** — when a "bug" prevents a destructive operation, you must verify the operation is what was wanted before fixing the bug.

### 2.2 — Consumer race: `consume_status_change_events` has NO row locking

Researcher confirmed by reading `supabase/functions/automation-engine/consumer.ts:99–104`:

```ts
.select(...).is('consumed_at', null)
```

The consumer reads unconsumed SCE rows with no `FOR UPDATE`, no `SKIP LOCKED`, no advisory lock. If the previous tick's processing takes > 60 s (which it does on large-audience tenants — 1,210 leads × 2 channels × ~10 KB per recipient = ~24 MB of EF→DB work + post-actions), the next cron tick reads the SAME unconsumed SCE row and starts processing it again. Each parallel run enqueues the full audience. We saw 3 parallel runs → ~3× over-enqueue (~6,661 rows vs the 2,251 expected).

This race is fundamental to the consumer's design. It was not surfaced in any prior `FOREMAN_REVIEW.md` (researcher checked).

### 2.3 — Queue inserts bypass the partial unique index

Researcher confirmed by reading `supabase/functions/automation-engine/dispatch.ts:69`:

```ts
await db.from("crm_message_queue").insert(chunk)
```

There is NO `ON CONFLICT DO NOTHING` clause. The partial unique index `uq_crm_message_queue_idem` (on `tenant_id, event_id, lead_id, template_slug, channel WHERE status IN queued/processing/sent`) was created in M4_DUAL_PATH_CLEAN_FIX_2026_05_19 — but the actual insert path doesn't trigger conflict handling. Instead, queue-send.ts (lines 102–120) uses **client-side filtering**: SELECT existing rows first, then filter the new batch. This is non-atomic — two concurrent inserts can both see "no existing row" and both insert. Hence: 6,661 rows in queue, many of them duplicate (lead, channel) tuples.

### 2.4 — The reason no duplicate-to-same-customer dispatches happened was accidental

Researcher confirmed by reading `supabase/functions/dispatch-queue/index.ts:174–192`:

```ts
SELECT ... FROM crm_message_queue WHERE status='queued' ORDER BY ... LIMIT 15
-- then UPDATE ... SET status='processing' WHERE id IN (...) AND status='queued'
```

The `UPDATE ... WHERE status='queued'` is atomic per row. Once a row transitions `queued → processing`, a second concurrent dispatch-queue tick can't grab it. This is what prevented duplicate sends — NOT the `uq_crm_message_queue_idem` index, which was never invoked.

But this is fragile: if the dispatch-queue ever runs without batch limits, parallel workers per row, or with the status-machine relaxed, duplicates would dispatch. **We narrowly avoided sending duplicates by accident.**

---

## 3. Why this can't happen again — the 3 SPECs needed

### 3.1 — `M4_SCE_CONSUMER_RACE_FIX_2026_05_22` (HIGHEST PRIORITY)

Add row-level locking to the consumer's SCE fetch. Replace:

```ts
.select(...).is('consumed_at', null)
```

with:

```sql
-- inside a single transaction
SELECT ... FROM crm_status_change_events
WHERE consumed_at IS NULL
ORDER BY occurred_at
LIMIT batch_size
FOR UPDATE SKIP LOCKED;
```

This guarantees: one SCE row, one consumer, one enqueue batch. Concurrent cron ticks `SKIP LOCKED` and find nothing else to do — they exit cleanly without competing.

**Alternative (if FOR UPDATE SKIP LOCKED isn't easy via supabase-js):** set `consumed_at = NOW()` **before** processing, and only process SCE rows where the UPDATE returned exactly the expected rows. The cost: if the processing fails mid-way, the SCE is marked consumed even though work didn't complete — would need an additional `processed_at` distinct from `consumed_at` for clean retry semantics. The FOR UPDATE approach is cleaner.

Estimated work: ~1 hour. Test plan: SLEEP-inject in the consumer body to force overlap; verify second tick finds 0 rows to lock.

### 3.2 — `M4_QUEUE_INSERT_ON_CONFLICT_2026_05_22` (HIGH PRIORITY)

Change `dispatch.ts:69` and `queue-send.ts` to use the existing `uq_crm_message_queue_idem` partial unique index by switching from `.insert(chunk)` to:

```ts
await db.from("crm_message_queue").insert(chunk, { onConflict: 'tenant_id,event_id,lead_id,template_slug,channel' }).ignoreDuplicates();
```

or equivalent raw SQL `ON CONFLICT (...) DO NOTHING`. This makes the dedup explicit at the database level, not at the client-filter level. Defense in depth on top of 3.1.

Estimated work: ~30 minutes. Test plan: call enqueue twice in a row; verify second call inserts 0 rows.

### 3.3 — `M4_DISPATCH_PREVIEW_SUMMARY_MODE_2026_05_22` (MEDIUM PRIORITY — the original bug from this SPEC)

`dispatch_preview` should switch to **summary mode** when audience exceeds a threshold (e.g., 50). Instead of returning `recipients_by_lead: [...1210 rows with full body strings...]`, return:

```json
{
  "summary_mode": true,
  "recipients_count_by_channel": { "sms": 1126, "email": 1125 },
  "rule_summary": [...],
  "sample_first_5": [...]
}
```

The modal shows: "שולח ל-1,126 ב-SMS + 1,125 באימייל — אישור?" with **explicit operator confirmation** before any commit happens. The status-change dropdown click would always wait for the modal (no silent timeout, no race window). Operator hits "ביטול" → no commit, no dispatch. Operator hits "אישור" → commit + cron consumes one SCE under 3.1's locking → 2,251 rows enqueued atomically, dispatched cleanly.

Estimated work: ~2 hours. Test plan: trigger preview on Prizma in summary mode; verify response < 100 KB / < 2 s.

### 3.4 — Bonus: SPEC author discipline (Foreman / me)

Add to `opticup-strategic` skill (next session's harvest): **Iron-Rule-32-style pre-flight for live verification steps.** Any SPEC with §3 criteria that include "click X on Prizma production data" must explicitly call out the destructive side-effects of that click and require a guard step (disable rules / use sandbox event / mirror to demo) BEFORE the click. Without that guard, the SPEC is incomplete.

---

## 4. Recovery actions taken (audit trail)

### 4.1 — Immediate halt sequence

1. `UPDATE crm_automation_rules SET is_active=false WHERE id IN (8b2edc76, d2585fc4)` — 2 rules disabled.
2. `UPDATE crm_message_queue SET status='cancelled' WHERE event_id=#25 AND status IN (queued, processing)` — 4,577 rows cancelled.
3. After Daniel-authorized re-fire attempt: same UPDATE cancelled another 6,661 rows.
4. `UPDATE crm_status_change_events SET skip_reason='manual_halt_…'` — marked the manually-inserted SCE so future consumers wouldn't re-process.

### 4.2 — Daniel-authorized clean completion

Direct INSERT into `crm_message_queue` for 1,087 SMS + 1,086 email = 2,173 rows. Predicate: `crm_leads.tenant_id = prizma AND status = 'waiting' AND is_deleted = false` × (sms if phone, email if email) × `NOT EXISTS (SELECT 1 FROM crm_message_log WHERE … AND status='sent' AND created_at > NOW() - INTERVAL '30 minutes')`. `ON CONFLICT DO NOTHING` against `uq_crm_message_queue_idem`. dispatch-queue cron then drained these naturally.

### 4.3 — Code revert

`git checkout origin/main -- modules/crm/crm-{event-actions,automation-client,confirm-send-v2}.js`, then commit `94f94b9` pushed to develop. This undoes both the instrumentation (Commit 2 = `ca93db8`) and the uncommitted Fix D timeout. The change-status dropdown returns to its pre-SPEC behavior on develop.

### 4.4 — Rule re-enable

`UPDATE crm_automation_rules SET is_active=true WHERE id IN (8b2edc76, d2585fc4)`. Both `registration_open` rules are back ACTIVE. Future events that legitimately transition to registration_open WILL fire the automation — until SPECs 3.1 / 3.2 / 3.3 ship, the consumer race + queue-insert-without-on-conflict gaps remain latent. **Operator awareness required:** any large-audience event-status transition could trigger over-enqueue (but dispatch-queue status-machine still prevents duplicate sends per §2.4).

---

## 5. Lessons captured (proposals for skill self-improvement)

| Proposal | For skill | Why |
|---|---|---|
| Live-verification-on-production destructive-op gate | opticup-strategic | The §0 Decision Table pre-committed Executor to apply Fix D on F4. The pre-flight should have separately gated whether the live click itself is allowed on production data. |
| Treat "silent fail" as a possible safety net | opticup-strategic | When a UX bug prevents a backend action, verify the action is wanted before "fixing" the UX. |
| Researcher subagent for incident debugging | opticup-executor | This incident's root-cause analysis (consumer race, missing ON CONFLICT, accidental dispatch-queue dedupe) was found by a 500-word researcher prompt in 67 s. Future incident retros should default to launching a parallel researcher. |
| FOREMAN_REVIEW must explicitly cover "what protections did we rely on; are they real" | opticup-strategic | M4_DUAL_PATH_CLEAN_FIX_2026_05_19 added `uq_crm_message_queue_idem` as Layer 2 "defense in depth" — but the engine never USES it. Layer-2 protections need a "verified-invoked" line item in the closing review. |

---

## 6. Final state (2026-05-21)

- `crm_events.id=2e39e884-9811-4b6c-88d0-0699f85ce1b3` → `status='registration_open'`, unchanged from the click that started this.
- `crm_automation_rules` Prizma `registration_open` × 2 → `is_active=true`.
- `crm_message_queue` for event #25 → 0 queued, 0 processing, ~2,173 sent + 165 prior sent + 11,224 cancelled.
- `develop` HEAD = `94f94b9` (revert commit). origin/main untouched.
- 3 follow-up SPECs queued (see §3): consumer race, queue ON CONFLICT, preview summary mode.
- Pipeline lock for this SPEC will be released after this report is committed.
- Original SPEC.md + this INCIDENT_REPORT.md replace the "EXECUTION_REPORT / FINDINGS / TEST_REPORT / FOREMAN_REVIEW" closure shape — too much happened to fit the standard template. The FOREMAN_REVIEW that would normally follow is incorporated into §2 + §3 + §5 above.
- Verdict: 🔴 **ABORTED WITH INCIDENT.** SPEC original goal (fix the silent fail on Prizma event #25 status change) is NOT closed. Original bug remains. Three follow-up SPECs must close it properly.

*End of report.*
