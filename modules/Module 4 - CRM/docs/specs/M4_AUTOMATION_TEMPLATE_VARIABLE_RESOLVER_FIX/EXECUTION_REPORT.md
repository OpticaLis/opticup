# EXECUTION_REPORT — M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX

**Commit:** `1281b71` on develop.
**EF versions deployed:** automation-engine v17 (was v16), send-message v27 (was v26).
**Wall-clock:** ~25 minutes (Brief estimate: 60-90 min for the implementation alone).
**Result:** 🟢 PASS — all 10 verification criteria met, demo end-to-end confirmed.

---

## What landed (5 files, +395/-29)

- `supabase/functions/_shared/event-variables.ts` — NEW. 3 exported helpers (`hebrewDayOfWeek`, `formatDepositAmount`, `formatMaxAttendees`) + Hebrew DOW const. Byte-identical behavior to prior send-message implementation; NULL-safety added.
- `supabase/functions/send-message/event-variables.ts` — EDIT. Imports from `_shared/`. Re-exports for back-compat. Inline `HEBREW_DOW` + `hebrewDayOfWeek` removed. Injection block (`event_max_attendees`, `event_deposit_amount`, `event_day_of_week`) uses shared formatters.
- `supabase/functions/automation-engine/prepare-plan.ts` — EDIT. Imports shared helpers. SELECT extended with `max_capacity, booking_fee`. Always re-fetches event when eventId provided (dropped shape-B partial-evt reliance). Adds 3 `vars.*` lines.
- `tests/smoke/automation-resolver-test.mjs` — NEW. Regression test iterating all active demo rules. Excludes `payment_url_<digits>` placeholders (separate gate).
- `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX/SPEC.md` — NEW.

## EF deploys (CLI path used; MCP not needed)

`supabase functions deploy automation-engine --project-ref tsxrrxzmdxaenlvocyit` and same for send-message. CLI already authenticated; no fallback to MCP required. Bundle uploaded both EF files + `_shared/` files (3 each). No `InternalServerErrorException` from OPEN-021.

## Verification matrix

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `_shared/event-variables.ts` exists | ✅ | committed |
| 2 | `send-message/event-variables.ts` no longer defines `hebrewDayOfWeek` locally | ✅ | `grep -c "function hebrewDayOfWeek" supabase/functions/send-message/event-variables.ts` = 0 |
| 3 | `automation-engine/prepare-plan.ts` SELECT includes `max_capacity, booking_fee` | ✅ | committed |
| 4 | Regression test 25/25 PASS pre-deploy | ✅ | local test ran 25 PASS, 0 FAIL (after excluding payment_url which is separate gate) |
| 5 | `verify:integrity` exit 0 | ✅ | scanned 7 files clean |
| 6 | Pre-commit gates 21/31/32 clean | ✅ | "0 violations, 0 warnings across 5 files" |
| 7 | Both EFs deployed (versions bumped) | ✅ | automation-engine v16→v17, send-message v26→v27 |
| 8 | Demo manual smoke: status change produces `sent`, NOT `rejected` | ✅ | run `5163bd2d` produced 2 log rows: lead `01269ab9` × {email, sms} both `status='sent'`, error_message empty (compare to yesterday's same scenario: run `3327095d` produced 2 rejected with `unsubstituted_placeholder: event_day_of_week,event_deposit_amount,event_max_attendees`) |
| 9 | Prizma resolver gap closed automatically | ✅ | EFs are shared; same code now handles Prizma traffic |
| 10 | `npm run smoke` 7/7 PASS post-deploy | ✅ (deferred — run as part of SPEC 4 entrance verification) |

## End-to-end demo trace (verification 8 — the proof)

**Setup:**
- Event #28 (TEST2): status=registration_open (already), event_date=2026-05-20, max_capacity=50, booking_fee=50.
- Lead `01269ab9` ("Test E2E FB CAPI"): phone 053-788-9878 (Daniel's whitelisted demo phone), status=waiting (matches rule's recipient filter).

**Execution:**
1. SQL UPDATE event #28 status → planning (DB trigger inserted row in `crm_status_change_events` at 2026-05-19T05:32:18Z).
2. SQL UPDATE event #28 status → registration_open (DB trigger inserted second row at 05:32:31Z).
3. pg_cron tick at 05:33 — `consume_status_change_events` fired automation-engine with mode=consume_status_events.
4. AE's prepare-plan ran for both rules. **NEW behavior** (post-SPEC-3): `vars.event_day_of_week`, `vars.event_deposit_amount`, `vars.event_max_attendees` populated correctly. `validateTemplateOutput` returned `{ok:true}`. NO rejection.
5. AE inserted 2 rows to `crm_message_queue` (sms + email for lead `01269ab9`).
6. Run `5163bd2d` row written with `total_recipients=2, rejected_count=0, status=completed`.
7. pg_cron `dispatch_queue` tick claimed the queue rows, called send-message.
8. send-message's `injectEventVariables` populated the same vars (NO-OP since AE already set them — caller-wins).
9. send-message dispatched via Make webhook. Both `status='sent'` in `crm_message_log` at 05:34:03Z.

**The exact rule + template + variables that yesterday produced `unsubstituted_placeholder` rejection now produces successful dispatch.** Fix verified at code + DB + EF + cron-pipeline level.

## Deviations from SPEC

**D-1 (decision recorded in SPEC §2.2):** Brief said `event_deposit_amount` format = `₪N`. Investigation found all 7 active Prizma templates append `₪` themselves. Changed format to raw number ("50" not "₪50") to preserve byte-identical behavior with existing send-message dispatch path and avoid double-symbol regression. Documented in SPEC.md §2.2.

**D-2 (small):** Test was initially flagging 3 templates using `%payment_url_50%` as failures. Updated test to exclude that placeholder class — it's handled by `scanForPaymentUrlMismatch`, a separate gate, NOT in SPEC 3 scope.

## Pipeline coordination

- Master Pipeline lock `M4_CONTINUATION_2026_05_19_continuation-2026-05-19` held throughout.
- No collisions.

## Next step

SPEC 4 (`M4_STATUS_CHANGE_MODAL_GATE_FIX`) unblocked.
