# FINDINGS — M4_EVENT_DAY_PARITY_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_EVENT_DAY_PARITY_FIX/FINDINGS.md`
> **Written by:** opticup-executor

---

## Findings

### Finding 1 — `crm-payment-helpers.js` selects non-existent column `event_time`

- **Code:** `M4-BUG-PAYHELP-01`
- **Severity:** HIGH (functional + console pollution)
- **Discovered during:** QA Path 3 console-error inspection.
- **Location:** `modules/crm/crm-payment-helpers.js` lines 48 (`_eventStartDate`) and 221 (`openActionModal`).
- **Description:** Both spots reference `event.event_time` / select `event_time`. The actual `crm_events` schema has `start_time` and `end_time` — there is no `event_time` column. Confirmed via `information_schema.columns`. The select in `openActionModal` triggers a real **HTTP 400** from PostgREST (10 such 400s observed in QA Path 3 alone).
- **Impact:**
  1. **Console pollution.** Every action-modal open generates a 400. The shared Promise resolves with `evRes.data === undefined`, the code falls back to `ev = {}`, the modal still works — but the console is dirty.
  2. **48h refund rule is silently disabled.** `_eventStartDate(eventRow)` reads `eventRow.event_time` which is always undefined (no row ever has it; the column does not exist), so `_eventStartDate` returns `null`, so `isRefundEligibleByTime` returns `true` (permissive default per code comment). **The 48h hard rule never fires in production**, despite being a SPEC #2 acceptance criterion.
  3. **F2 below depends on this** — once F1 is fixed, the new `eventEnded` helper should also benefit by reading the same canonical column.
- **Why this isn't a regression of THIS SPEC:** the `event_time` references existed in the predecessor SPEC `M4_ATTENDEE_PAYMENT_UI` as committed in `f22bc20`. This SPEC's QA caught them; previous QA missed them.
- **Suggested next action:** new follow-up SPEC `M4_PAYMENT_HELPERS_COLUMN_FIX` (or fold into `M4_ATTENDEE_PAYMENT_AUTOMATION` pre-flight). Two-line change: `event_time → start_time` in lines 48 and 221, plus a `start_time` fallback to '09:00'. Also add `start_time` and `end_time` to the SELECT in line 221 so future helpers (like F2) have what they need.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `eventEnded()` uses hardcoded `+03:00` offset (DST-blind)

- **Code:** `M4-TZ-PARITY-02`
- **Severity:** LOW
- **Discovered during:** Implementation §8.2 helper choice.
- **Location:** `modules/crm/crm-payment-helpers.js` `eventEnded()` (added in this SPEC).
- **Description:** The helper computes `new Date(event_date + 'T' + endTime + '+03:00')`. In Israel, summer is UTC+3 (DST) and winter is UTC+2. Hardcoding +03:00 means a winter event whose `end_time` is `14:00` will be parsed as `14:00 +03:00` = `13:00 +02:00 local`, off by 1 hour. The status-first check (`status='completed'/'closed'`) avoids this for events that are explicitly closed; the bug only surfaces for events still in `registration_open`/etc. AFTER their `end_time` passes, during winter months.
- **Impact:** Edge case — most events are explicitly transitioned to `closed` after the day, so the `status` branch wins. Only matters for events that linger in `registration_open` past their day in Nov-Feb.
- **Suggested next action:** TECH_DEBT — replace `'+03:00'` with the same Mar-Oct DST month-based heuristic that `_eventStartDate` already uses (line ~46). Or, better: import a small TZ helper. Either way, deferred. Same fix would also apply to `_eventStartDate`.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `crm-payment-helpers.js` `_eventStartDate` will need updating once F1 lands

- **Code:** `M4-DEBT-PARITY-03`
- **Severity:** INFO
- **Discovered during:** Reading existing helpers code.
- **Location:** `modules/crm/crm-payment-helpers.js` `_eventStartDate` (line ~46).
- **Description:** Once F1 is fixed (column rename to `start_time`), `_eventStartDate` will start receiving real data and the 48h hard rule will activate for the first time. This may surface latent UX questions (e.g., should the rule apply when an event has no `start_time`? Currently the function returns `null` → permissive). Re-validate the 48h flow on real data after F1 ships.
- **Suggested next action:** include in `M4_PAYMENT_HELPERS_COLUMN_FIX` SPEC a verification step that `isRefundEligibleByTime` returns `false` for an attendee whose event is within 48 hours.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
