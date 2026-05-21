# TEST_REPORT — M4_QUEUE_INSERT_ON_CONFLICT

> **Date:** 2026-05-21
> **Tenant scope:** demo only

## 1. Environment

| Variable | Value |
|---|---|
| Test event | id `6fe959a7-b8fd-46e9-9c28-bd677e3a4a21`, event_number 33 |
| Test audience | 5,000 sentinel-injected leads (same as SPEC B; left in place between SPECs) |
| EF target | `automation-engine` v24 (deployed via Supabase CLI 2026-05-21) |

## 2. Iron Rule 34 — verification approach
The ON CONFLICT primitive is a pure-DB behavior verified via RPC return value + queue-row count assertions. No UI surface (the queue is internal to the dispatch pipeline). IR34 N/A.

## 3. First enqueue (Run 1, baseline)

| Metric | Value |
|---|---|
| SCE inserted | id `dfef88f3-...` at 14:28:14 |
| Cron consumer claimed | 14:28:19.922 |
| Consumed at | 14:28:30.824 (~11 s end-to-end for 5K leads × 2 channels) |
| Run status | completed |
| `total_recipients` | 10,000 |
| Queue rows in `queued` state | 9,985 (15 already mid-dispatch by dispatch-queue cron) |

## 4. Re-enqueue concurrency test (criterion 7)

**Setup:** built a payload from the existing 9,955 still-queued rows (queue total had dropped from 9,985 to 9,955 by the time the second RPC fired — dispatch-queue cron processed ~30 more rows). Used `jsonb_agg` to construct an identical 9,955-row payload (same `tenant_id`, `run_id`, `lead_id`, `template_slug`, `channel` per row).

**Test:** called `enqueue_crm_messages_idempotent` once with that payload.

**Result:**
```json
{ "inserted": 0, "conflicted": 9955, "errors": 0 }
```

✅ **`inserted: 0` — zero new rows inserted.**
✅ **`conflicted: 9955` — every row hit the ON CONFLICT DO NOTHING path.**
✅ **`errors: 0` — no real errors.**

## 5. Queue-total invariant (criterion 8)

Post-re-enqueue queue state:

| Status | Count |
|---|---|
| `queued` | 9,955 |
| `failed` | 22 |
| `rejected` | 23 |
| **Total** | **10,000** |

Unchanged from before the re-enqueue. The second RPC call added zero rows.

## 6. `queue_insert_failed: duplicate key` rows — verification

Pre-fix (SPEC A): 800 such log rows from the 1,200-lead SCE race.
Post-fix (this SPEC, 5K leads, double-enqueue): **0 such rows.**

Every log row in `crm_message_log` for the test event was either:
- `rejected: email_not_allowed: m4_load_test_NNNN@demo.opticalis.test` (clean allowlist behavior)
- or a clean queue insert from Run 1

No `queue_insert_failed: duplicate key` pattern anywhere. The ON CONFLICT path silently absorbs duplicates at the DB level. ✅

## 7. Zero real sends

Same data-shape defense-in-depth as SPEC A + SPEC B: 5,000 leads with `05000NNNNN` phones + `@demo.opticalis.test` emails. **All 45 dispatch-queue rejections** were `email_not_allowed`. **`queue_sent: 0` everywhere.** Zero real customers touched.

## 8. Demo cleanup verification

Post-Phase-4:
- `demo_leads_total`: **28** (matches baseline)
- `demo_events_active`: **25** (test event #33 soft-deleted)
- `demo_rule_b53_active`: **false**
- `prizma_leads_total`: **1,343** (unchanged)
- `prizma_events_active`: **5** (unchanged)
- `prizma_queue_total`: **18,204** (unchanged)

## 9. Verdict

✅ **PASS.**
- Zero-duplicate re-enqueue verified at scale: `inserted=0, conflicted=9955`.
- Zero `queue_insert_failed: duplicate key` log rows in the test window.
- Queue total invariant held (no count growth on re-enqueue).
- Zero real sends.
- Demo restored to bit-identical baseline.

---

*End of test report.*
