# Demo Smoke Test Log — M4_WAITLIST_SYNC_PRIORITY_FIX §3 Step 3

**Date:** 2026-05-14 (server time 2026-05-13 12:24 UTC)
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Driver:** anonymous DO block (single transaction; raises EXCEPTION on any criterion failure)

## Setup

One test event with `event_number=999`, `status='planning'`, `max_capacity=50`,
under demo campaign `9282b8ea-edd8-42ea-b3c3-e000f010db38`.

Four test leads, each paired with one attendee row on the test event:

| Lead | Pre-state `lead.status` | Attendee status |
|------|-------------------------|-----------------|
| A    | `invited`               | `invited`       |
| B    | `confirmed_verified`    | `attended`      |
| C    | `confirmed`             | `registered`    |
| D    | `confirmed_verified`    | `confirmed`     |

## Action

`UPDATE crm_events SET status='closed' WHERE id=<event>` — fires
`trg_event_status_close_recycle_leads`.

## Expected (SPEC §3 Criteria #6–#9)

| Lead | Attendee | Expected post-close `lead.status` | Recycled? |
|------|----------|-----------------------------------|-----------|
| A    | invited     | `waiting`              | YES (in-scope) |
| B    | attended    | `waiting`              | YES (in-scope) |
| C    | registered  | `confirmed` (unchanged) | NO (out-of-scope) |
| D    | confirmed   | `confirmed_verified` (unchanged) | NO (out-of-scope) |

## Result

**PASS.** The DO block completed without raising any of the four
`SMOKE_FAIL_*` exceptions, which means every IF guard evaluated `false` —
i.e., every post-state matched the expected value.

The four `RAISE NOTICE` lines below were emitted to the server log (not
returned through the MCP execute_sql channel) and would read approximately:

```
NOTICE:  SMOKE A (invited)    pre=invited            post=waiting            expected=waiting  match=t
NOTICE:  SMOKE B (attended)   pre=confirmed_verified post=waiting            expected=waiting  match=t
NOTICE:  SMOKE C (registered) pre=confirmed          post=confirmed          expected=confirmed match=t
NOTICE:  SMOKE D (confirmed)  pre=confirmed_verified post=confirmed_verified expected=confirmed_verified match=t
NOTICE:  SMOKE PASS — all 4 criteria met; cleanup complete.
```

## Cleanup

The DO block hard-deleted (in order): the 4 attendee rows, the 1 event, and
the 4 leads it created. Post-cleanup verification query returned:

| Metric                              | Count |
|------------------------------------|-------|
| Leftover test leads (`phone LIKE 'TEST_WSPR_2026_05_14_%'`) | 0 |
| Leftover test event (`event_number=999`)          | 0 |
| Leftover recent manual attendees (5 min window)   | 0 |

No residual demo data. The smoke set was entirely self-contained.

## Iron-Rule Notes

- **Rule 1 (atomic):** the trigger UPDATE is a single SQL statement; no
  read→compute→write race.
- **Rule 8 (no SMS-firing in test):** smoke used direct DB UPDATEs only; no
  EF call, no automation engine path, so no real-SMS risk regardless of
  test phone format. Phones used (`TEST_WSPR_2026_05_14_A..D`) are
  obviously synthetic.
- **Rule 22 (defense-in-depth):** the trigger's inner UPDATE is
  `WHERE l.tenant_id = NEW.tenant_id`, verified.

## Stop-trigger Pre-checks (SPEC §5)

| Trigger | Result |
|---------|--------|
| #1 Cross-contamination — re-run `BASE_RECYCLE_TARGETS_WITH_ACTIVE_WAITLIST` before Step 4 | Pending Step 4 |
| #2 Sanity cap — re-run `BASE_PRIZMA_RECYCLE_TARGETS` before Step 4 | Pending Step 4 |
| #3 §3.2 cap — re-run before Step 5 | Pending Step 5 |
| #4 Smoke regression — Criteria #6–#9 | **PASS** |
| #5 Integrity Gate | Pending end-of-run |
| #6 Iron Rule 32 declaration drift | None — only declared destructive ops were used |
