# TEST_REPORT — M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX

**Date:** 2026-05-19 16:22Z
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch `develop`, HEAD `2d1e71d`
**Status:** **🟢 GREEN — hotfix verified live; parent SPEC's deferred E2E criteria 14–19 all closed**
**Smoke:** 7/7 PASS
**E2E:** 6/6 PASS (Tests 1–6; criteria 14–19 of parent SPEC)
**D7 forward-only:** PASS (Prizma queue still 0 new event-name rows)
**Iron Rule 34:** N/A (no UI/HTML/JS work — DB migration + trigger function bodies only)

---

## §0 Metadata

| Field | Value |
|---|---|
| SPEC folder | `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/` |
| Parent SPEC | `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/` (RED prior, this report's closure pivots it to 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED) |
| SPEC sealed commit | `fff7bf5` (C1) |
| C2 (migration) | `41fb198` |
| C3 (Executor retrospective) | `0b0ea5b` |
| C4 (Reviewer audit) | `2d1e71d` |
| HEAD at LH-Tester start | `2d1e71d` |
| Machine | Windows desktop (`C:\Users\User\opticup`) |
| Demo tenant_id | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| Demo test lead used | `cb6b343e-e4cc-42b0-990a-91999111a03c` (reused; full_name: "Localhost Tester E2E"; phone: `+972503348349` — allowlist per memory `feedback_test_data_phones`) |
| Demo event used | `a089ed87-db77-45e5-ba23-d233225da2ce` (name: "אירוע המותגים טסט 5.19 - 2") |
| Test attendee created (and deleted at close) | `bcdb33e6-c35a-4e12-8c3d-22c5dbcbf391` |
| Pipeline coordination lock | `_archive/pipeline-sessions/2026-05-19T16-16-24-821Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX_pid-42336-6a2428b7.lock` (claimed) |

---

## §1 Smoke 7/7

Run: `node tests/smoke/baseline.test.mjs`

```
opticup baseline smoke — 7 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (905ms)
  PASS  2. Create CRM lead succeeds (M4)  (111ms)
  PASS  3. Read inventory count for demo tenant (M1)  (183ms)
  PASS  4. Storefront homepage returns 200  (1026ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (828ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (128ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1063ms)

7/7 passed, 0 failed
```

**Verdict:** ✅ Smoke 7/7 PASS. SPEC §3 criterion 22 satisfied.

Pre-test servers:
- ERP http://localhost:3000/index.html → 200 in 217ms
- Storefront http://localhost:4321/ → 200 in 1201ms

---

## §2 E2E Test 1 — CompleteRegistration (parent SPEC criterion 14)

**Pre-state probe** (baseline before any test DML):

```sql
SELECT
  (SELECT count(*) FROM crm_leads WHERE id='cb6b343e-...') AS test_lead_exists,
  (SELECT phone FROM crm_leads WHERE id='cb6b343e-...') AS test_lead_phone,
  (SELECT count(*) FROM crm_capi_dispatch_queue) AS queue_total_pre,
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id='8d8cfa7e-...' AND lead_id='cb6b343e-...' AND event_name IN ('CompleteRegistration','EventAttended','Purchase')) AS test_lead_new_events_pre,
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma') AND event_name IN ('CompleteRegistration','EventAttended','Purchase')) AS prizma_new_events_pre;
```

Result: `test_lead_exists=1 · phone='+972503348349' · queue_total_pre=34 · test_lead_new_events_pre=0 · prizma_new_events_pre=0`. Baseline matches Reviewer's REVIEW.md §2 (queue=34) and the parent SPEC's D7 expectations (Prizma=0).

**Action 1.1 — INSERT attendee:**

```sql
INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status)
VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',
  'cb6b343e-e4cc-42b0-990a-91999111a03c',
  'a089ed87-db77-45e5-ba23-d233225da2ce',
  'registered'
)
RETURNING id, ..., created_at;
```

**Result:** SUCCESS — returned attendee_id=`bcdb33e6-c35a-4e12-8c3d-22c5dbcbf391`. **NOT 42883.** The parent SPEC's regression (SQLSTATE 42883 from `public.uuid_ns_oid` not existing) is RESOLVED. The hotfix's `extensions.`-qualifier change took effect.

**Action 1.2 — probe queue immediately + verify deterministic event_id:**

```sql
SELECT id, event_name, status, event_id,
  extensions.uuid_generate_v5(extensions.uuid_ns_oid(), 'cb6b343e-e4cc-42b0-990a-91999111a03c:CompleteRegistration') AS expected_event_id,
  (event_id = extensions.uuid_generate_v5(extensions.uuid_ns_oid(), 'cb6b343e-e4cc-42b0-990a-91999111a03c:CompleteRegistration')) AS event_id_matches_expected
FROM crm_capi_dispatch_queue
WHERE lead_id='cb6b343e-...' AND event_name='CompleteRegistration';
```

**Result:**
- queue row id: `6bf1e1e7-eaa8-43cb-8af1-292565031ece`
- event_name: `CompleteRegistration`
- status: `queued`
- event_id: `5d9ea603-34e6-504a-9ae9-66f990474f68`
- expected_event_id (recomputed from v5(`uuid_ns_oid()`, `lead_id:CompleteRegistration`)): `5d9ea603-34e6-504a-9ae9-66f990474f68`
- **event_id_matches_expected: TRUE** ✅ — determinism verified per Brief D6 / SPEC §0.4 (Foreman's pre-flight answer).

**Action 1.3 — wait 90s for pg_cron + re-probe:**

```sql
SELECT id, event_name, status, event_id, retries, processed_at, error_message, event_payload, meta_response
FROM crm_capi_dispatch_queue
WHERE lead_id='cb6b343e-...' AND event_name='CompleteRegistration';
```

**Result:**
- status: `sent` (NOT `skipped_no_token` — see footnote)
- processed_at: `2026-05-19 16:18:02.194+00`
- retries: 0
- error_message: NULL
- event_payload: `{"em":"630e...8717","ph":"b5e9...4d1","event_id":"5d9ea603-...","event_name":"CompleteRegistration"}`
- meta_response: `{"messages":[],"fbtrace_id":"AnG8SbgH2bN8AflNbzEVPG3","events_received":1}`

**Verdict for Test 1:** 🟢 PASS. Trigger fired → queue row enqueued with deterministic event_id → pg_cron picked up the row → EF dispatched to Meta → Meta returned `events_received: 1` + `fbtrace_id`. End-to-end working.

**Footnote on `sent` vs `skipped_no_token`:** SPEC §3.5 of the parent and SPEC §0.4 D-AUTH-3 of P2.1 ("Demo has no fb_capi_token") predicted `status='skipped_no_token'` on demo. Observed actual status is `sent` with a real Meta API success response. This means the demo tenant's `fb_capi_token` (and `fb_capi_pixel_id`) IS populated — the parent SPEC's assumption was stale. This is a **stronger** outcome than the SPEC asked for: the entire pipeline (trigger → enqueue → EF → Meta API → ack) is verified working, not just the trigger → enqueue half. The SPEC's criterion 14 is satisfied either way ("queue row enqueued with `event_name='CompleteRegistration'`"); the `sent` ack is bonus evidence.

---

## §3 E2E Test 2 — EventAttended (parent SPEC criterion 15)

**Action 2.1 — UPDATE attendee status='registered' → 'attended':**

```sql
UPDATE crm_event_attendees SET status='attended' WHERE id='bcdb33e6-...';
```

**Action 2.2 — probe queue for EventAttended row:**

```sql
SELECT id, event_name, status, event_id,
  extensions.uuid_generate_v5(extensions.uuid_ns_oid(), 'cb6b343e-...:EventAttended') AS expected_event_id,
  (event_id = extensions.uuid_generate_v5(extensions.uuid_ns_oid(), 'cb6b343e-...:EventAttended')) AS event_id_matches_expected
FROM crm_capi_dispatch_queue
WHERE lead_id='cb6b343e-...' AND event_name='EventAttended';
```

**Result:**
- queue row id: `538b5a4a-db57-46ee-ab11-0e964830fd12`
- event_name: `EventAttended`
- status: `queued` → later `sent` after pg_cron (processed_at `2026-05-19 16:21:02.592+00`)
- event_id: `c7cf0c0e-ecf9-544b-8cd0-de8ab1ed1bbc`
- event_id_matches_expected: TRUE ✅
- meta_response (post-pg_cron): `{"messages":[],"fbtrace_id":"AF1nGSPgRwhdiexI0mkzpUK","events_received":1}` ✅

**Verdict for Test 2:** 🟢 PASS. UPDATE-status trigger fires the WHEN clause `OLD.status IS DISTINCT FROM NEW.status AND NEW.status='attended'`, enqueues with deterministic event_id, EF dispatches successfully.

---

## §4 E2E Test 3 — Purchase (parent SPEC criterion 16)

**Action 3.1 — UPDATE attendee purchase_amount NULL → 500:**

```sql
UPDATE crm_event_attendees SET purchase_amount=500.00 WHERE id='bcdb33e6-...';
```

**Action 3.2 — probe Purchase row immediately:**

```sql
SELECT id, event_name, status, event_id,
  extensions.uuid_generate_v5(extensions.uuid_ns_oid(), 'cb6b343e-...:Purchase') AS expected_event_id,
  (event_id = extensions.uuid_generate_v5(extensions.uuid_ns_oid(), 'cb6b343e-...:Purchase')) AS event_id_matches_expected
FROM crm_capi_dispatch_queue
WHERE lead_id='cb6b343e-...' AND event_name='Purchase';
```

**Result:**
- queue row id: `0663058d-532a-489d-89b9-2b883ca1c1f2`
- event_name: `Purchase`
- status: `queued` → later `sent` (processed_at `2026-05-19 16:21:03.108+00`)
- event_id: `a14ddd16-2937-57d1-bdfe-9143a0f91757`
- event_id_matches_expected: TRUE ✅

**Action 3.3 — wait 90s for pg_cron + EF processing, re-probe:**

`event_payload` (post-dispatch hashed cache stored in the queue row):
```json
{
  "em": "630e37e9ae2d86239bd359df0106bfde48600aad63be44f4502f957aaa418717",
  "ph": "b5e9a2c19ab9d09c7aad09aef1e8a76ffa1c33ae5bc74bbe4b507dfd515a24d1",
  "event_id": "a14ddd16-2937-57d1-bdfe-9143a0f91757",
  "event_name": "Purchase",
  "custom_data": { "value": 500, "currency": "ILS" }
}
```

`meta_response`: `{"messages":[],"fbtrace_id":"Aa8AxfFG_DhF3uUvK71PuKJ","events_received":1}` ✅

**Action 3.4 — EF source verification for OUTGOING Meta API `capiBody`:**

Read `supabase/functions/fb-capi-dispatch/index.ts` lines 159-202. Confirmed:
- Line 177: `purchaseCustomData = { value: Number(attendee.purchase_amount), currency: "ILS" };`
- Line 186: spread into `eventPayload` (the cache stored in queue row): `...(purchaseCustomData ? { custom_data: purchaseCustomData } : {})`
- Line 199: ALSO spread into OUTGOING `capiBody.data[0]`: `...(purchaseCustomData ? { custom_data: purchaseCustomData } : {})`

**Distinction documented for the Reviewer's clarification note:** the `event_payload` jsonb stored in the queue row is the EF's hashed PII cache (`em` + `ph` + `custom_data` if Purchase). The OUTGOING Meta API HTTP body (`capiBody.data[0]`) ALSO includes `custom_data: { value: 500, currency: 'ILS' }` at line 199 of the EF. Both surfaces carry the value+currency for Purchase events; the parent SPEC's brief D6 / criterion 16 spec was satisfied on both. In this E2E run we observed `custom_data` present in BOTH the queue row's `event_payload` AND verified the EF source builds it into `capiBody.data[0]` for the outgoing HTTP call.

**Verdict for Test 3:** 🟢 PASS. Trigger fires WHEN clause `(OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0) AND NEW.purchase_amount > 0`, queue row enqueued with deterministic event_id + `event_payload.custom_data={value:500, currency:'ILS'}`, EF dispatched to Meta with the full custom_data, Meta acked `events_received: 1`.

---

## §5 E2E Test 4 — Idempotency on EventAttended (parent SPEC criterion 17)

**Action 4.1a — redundant UPDATE to same value (`'attended' → 'attended'`):**

```sql
UPDATE crm_event_attendees SET status='attended' WHERE id='bcdb33e6-...';
SELECT count(*) FILTER (WHERE event_name='EventAttended') FROM crm_capi_dispatch_queue WHERE lead_id='cb6b343e-...';
```

Result: count=1. WHEN clause `OLD.status IS DISTINCT FROM NEW.status` blocked the trigger body (OLD='attended' = NEW='attended' → no enqueue attempt).

**Action 4.1b — cancel → attended cycle (force trigger to fire a second time):**

```sql
UPDATE crm_event_attendees SET status='cancelled' WHERE id='bcdb33e6-...';
UPDATE crm_event_attendees SET status='attended' WHERE id='bcdb33e6-...';
SELECT count(*) FILTER (WHERE event_name='EventAttended') FROM crm_capi_dispatch_queue WHERE lead_id='cb6b343e-...';
```

Result: count=**1** (unchanged). The cancel→attended UPDATE's WHEN clause DID match (OLD='cancelled' ≠ NEW='attended' AND NEW='attended'), so the trigger body executed — but `ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING` swallowed the duplicate INSERT against the existing queue row. Both idempotency layers (WHEN clause + unique constraint + ON CONFLICT) verified working.

**Verdict for Test 4:** 🟢 PASS. Idempotency holds across both no-op-UPDATE and re-fire-via-cycle paths.

---

## §6 E2E Tests 5 + 6 — Refund + Typo no-ops (parent SPEC criteria 18, 19)

### §6.1 Test 5 — Refund direction no-op (criterion 18)

**Action 5.1 — UPDATE purchase_amount 500 → 0:**

```sql
UPDATE crm_event_attendees SET purchase_amount=0 WHERE id='bcdb33e6-...';
SELECT count(*) FILTER (WHERE event_name='Purchase') FROM crm_capi_dispatch_queue WHERE lead_id='cb6b343e-...';
```

Result: Purchase count=**1** (unchanged). WHEN clause `NEW.purchase_amount > 0` blocked the trigger (NEW=0 → false). attendee.purchase_amount now `0.00`.

**Verdict for Test 5:** 🟢 PASS.

### §6.2 Test 6 — Typo correction no-op (criterion 19)

**Action 6.1 — restore 0 → 500 (WHEN clause matches: OLD=0 AND NEW=500>0):**

```sql
UPDATE crm_event_attendees SET purchase_amount=500 WHERE id='bcdb33e6-...';
SELECT count(*) FILTER (WHERE event_name='Purchase') FROM crm_capi_dispatch_queue WHERE lead_id='cb6b343e-...';
```

Result: Purchase count=**1** (unchanged). WHEN clause matched, trigger body executed, but ON CONFLICT DO NOTHING swallowed the duplicate against the existing Purchase queue row.

**Action 6.2 — UPDATE purchase_amount 500 → 480 (the actual typo-correction case):**

```sql
UPDATE crm_event_attendees SET purchase_amount=480 WHERE id='bcdb33e6-...';
SELECT count(*) FILTER (WHERE event_name='Purchase') FROM crm_capi_dispatch_queue WHERE lead_id='cb6b343e-...';
```

Result: Purchase count=**1** (unchanged). attendee.purchase_amount now `480.00`. WHEN clause `OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0` blocked the trigger (OLD=500 > 0 → false). No new queue row.

**Verdict for Test 6:** 🟢 PASS. The WHEN clause semantics catch the OLD>0 case without needing ON CONFLICT.

---

## §7 D7 forward-only verification (parent SPEC criterion 29 echo)

```sql
SELECT count(*) FROM crm_capi_dispatch_queue
WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
  AND event_name IN ('CompleteRegistration','EventAttended','Purchase');
```

**Result:** `prizma_new_event_count = 0`. ✅

D7 (forward-only) holds. The 84 historical `purchase_amount > 0` Prizma attendee rows remain un-enqueued (the AFTER INSERT / AFTER UPDATE triggers fire only on fresh DML, not historical rows). No backfill side-effect from the hotfix.

---

## §8 Cleanup confirmation

**Step 5.1 — DELETE the 3 queue rows we created:**

```sql
DELETE FROM crm_capi_dispatch_queue
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND lead_id='cb6b343e-e4cc-42b0-990a-91999111a03c'
  AND event_name IN ('CompleteRegistration','EventAttended','Purchase')
RETURNING id, event_name;
```

Returned 3 rows (the same 3 IDs from Tests 1/2/3). Deleted.

**Step 5.2 — DELETE the test attendee row:**

```sql
DELETE FROM crm_event_attendees WHERE id='bcdb33e6-c35a-4e12-8c3d-22c5dbcbf391'
RETURNING id, tenant_id, lead_id, event_id;
```

Returned 1 row. Deleted. (No fresh test lead inserted — the demo lead `cb6b343e-...` was pre-existing and is preserved.)

**Step 5.3 — final cleanup verification:**

```sql
SELECT
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id='8d8cfa7e-...' AND lead_id='cb6b343e-...' AND event_name IN ('CompleteRegistration','EventAttended','Purchase')) AS demo_test_lead_new_event_rows,
  (SELECT count(*) FROM crm_event_attendees WHERE id='bcdb33e6-...') AS test_attendee_residue,
  (SELECT count(*) FROM crm_leads WHERE id='cb6b343e-...') AS test_lead_preserved,
  (SELECT count(*) FROM crm_capi_dispatch_queue) AS queue_total_final,
  (SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma') AND event_name IN ('CompleteRegistration','EventAttended','Purchase')) AS prizma_new_events_final;
```

Result:
- demo_test_lead_new_event_rows: **0** ✅ (no residue)
- test_attendee_residue: **0** ✅ (deleted)
- test_lead_preserved: **1** ✅ (pre-existing lead intact)
- queue_total_final: **34** ✅ (matches Reviewer baseline of 34; no leak)
- prizma_new_events_final: **0** ✅ (D7 still holds post-test)

**Cleanup verdict:** ✅ Clean. No residue. The DB is in the exact same shape as it was at LH-Tester start.

---

## §9 Parent SPEC dependency closure — explicit table mapping

The parent SPEC `M4_FB_CAPI_PURCHASE_EVENTS` left criteria 14-19 deferred (its TEST_REPORT.md status: 🔴 RED — env-blocker). This hotfix unblocked them. Explicit mapping:

| Parent criterion | This report's section | Verdict | Evidence |
|---|---|:-:|---|
| 14 — Demo E2E test 1: CompleteRegistration | §2 | ✅ | Queue row id `6bf1e1e7-...`; event_id=`5d9ea603-...` matches v5; meta `events_received: 1` |
| 15 — Demo E2E test 2: EventAttended | §3 | ✅ | Queue row id `538b5a4a-...`; event_id=`c7cf0c0e-...` matches v5; meta `events_received: 1` |
| 16 — Demo E2E test 3: Purchase + `custom_data.value/currency` | §4 | ✅ | Queue row id `0663058d-...`; event_id=`a14ddd16-...` matches v5; queue row `event_payload.custom_data={value:500,currency:"ILS"}`; EF source line 199 confirms `capiBody.data[0].custom_data` also carries it; meta `events_received: 1` |
| 17 — Idempotency on EventAttended | §5 | ✅ | Count=1 after no-op + cancel→attended cycle |
| 18 — Refund direction no-op (500→0) | §6.1 | ✅ | Purchase count=1 after `purchase_amount=0` UPDATE |
| 19 — Typo correction no-op (OLD>0 case) | §6.2 | ✅ | Purchase count=1 after 500→480 UPDATE; WHEN clause OLD>0 path verified |
| 29 (parent) — D7 forward-only Prizma queue unchanged | §7 | ✅ | Prizma new_event_count=0 |

**All 6 parent-deferred criteria CLOSED 🟢.** The parent SPEC's RED status is resolvable to 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED at Foreman closure.

---

## §10 Iron Rule 34 — N/A justification

Same as parent SPEC's TEST_REPORT §8: this SPEC's commit range touched ZERO browser-consumed files. The hotfix is purely a DB migration (`supabase/migrations/20260519160605_m4_capi_purchase_events_uuid_fix.sql`) that runs 3 `CREATE OR REPLACE FUNCTION` statements. No HTML, no JS, no CSS modified. Confirmed by Reviewer's REVIEW.md §6:

> ZERO JS/HTML touched (IR34 UI-verification gate does not apply — no UI files in diff).

The parent SPEC's `D-AUTH-7` already specified that the CRM pixel-gap tile (`crm-pixel-gap-tile.js`) was the only IR34-applicable surface in scope, and the Executor opted to skip it. The hotfix narrowed scope further — no UI files in scope at all. **Iron Rule 34 does NOT apply to this SPEC's LH-Tester phase.**

---

## §11 Findings

No new findings. The hotfix landed cleanly; all 6 deferred E2E criteria PASSED on first attempt; cleanup left zero residue.

One non-blocking observation (echoes Reviewer R-1 informationally, not a Tester finding):
- The migration file (73 lines) is 3 lines over SPEC §3.5's declared ≤70 budget. Reviewer's REVIEW.md §7 R-1 recommended Foreman amends §3.5 budget to ≤75 retroactively. Tester defers to Foreman; not in Tester's lane to remediate.

One positive bonus observation:
- The parent SPEC's D-AUTH-3 predicted `status='skipped_no_token'` on demo because "demo has no fb_capi_token". Observed actual behavior: status='sent' with real Meta API `events_received: 1` + `fbtrace_id` for all 3 events. Demo evidently has `fb_capi_token` + `fb_capi_pixel_id` populated. The criteria still PASS (parent text says "or 'skipped_no_token'; both PASS for this criterion") but the stronger observed outcome means the full pipeline (trigger → enqueue → EF → Meta API → ack) is verified end-to-end, not just trigger → enqueue. Worth promoting to a memory at Foreman closure: "demo tenant now has live Meta token; CAPI dispatch goes all the way to Meta in test runs."

---

## Hand-off

🟢 GREEN → handing back to Foreman (opticup-strategic) for closure. SPEC ready to close + parent SPEC dependency satisfied + memory update opportunity surfaced.

**Pipeline mode: full-auto.** 6/6 E2E PASS + 7/7 smoke PASS + D7 PASS + cleanup clean.

**Reports written this phase:**
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/TEST_REPORT.md` (this file)

**Next step (Foreman closure responsibilities):**
- Write FOREMAN_REVIEW.md for THIS SPEC.
- Write CLOSURE_NOTE.md inside parent SPEC folder updating its verdict from 🔴 to 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED.
- Update memory `project_fb_capi_p21_state.md` — promote Purchase events to "live (after UUID_FIX hotfix)" and note demo tenant now dispatches end-to-end to Meta in test runs.
- Promote skill self-improvement proposals P-AUTHOR-1 (Foreman) + P-EXEC-1 (Executor) per SPEC §0 lessons-applied table.

---

*End of TEST_REPORT — M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX — GREEN.*
