# QA_FOREMAN_RESULTS — M4_ATTENDEE_PAYMENT_AUTOMATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_AUTOMATION/QA_FOREMAN_RESULTS.md`
> **Run by:** opticup-executor (Claude Code, Windows desktop) on behalf of opticup-strategic (Foreman)
> **Run date:** 2026-04-25 (evening)
> **Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
> **URL under test:** `http://localhost:3000/crm.html?t=demo`
> **Phone allowlist enforced:** ✅ no real dispatches reached `crm_message_log` during QA (Path 4 dispatches stalled at Make-webhook localhost quirk per documented F1; engine still fired with total_recipients=2 to allowlisted lead)
> **Commits under test:** `c2dd8eb` (helper) → `328df0d` (wiring) → `ffebabe` (backfill applied) → `b2e3c2d` (retrospective). All on `develop`, HEAD synced before QA.

---

## Recommended Verdict

🟢 **CLOSED — 9/9 paths PASS, 0 FAIL, 0 PARTIAL.**

Both automations work end-to-end. The strict-scope critical test (**Path 2b — `closed` does NOT trigger**) verified positively: closed transition leaves attendees in `pending_payment`, only `completed` transition flips them. FIFO test (Path 4) verified that with 2 credits the OLDER one transfers and the newer stays `credit_pending`. Backfill applied 0 rows on demo (matches forecast). Engine + RPC untouched. 0 messages to non-allowlisted phones.

The payment trio is now fully verified end-to-end across schema (#1) + UI (#2) + automations (#3).

---

## Pre-QA Baseline & Drift

| Metric | Value | Match SPEC §10.2 |
|---|---|---|
| Total attendees on demo (is_deleted=false) | **12** at session start | ⚠️ — SPEC says 13; actual is 12. Same observation as the executor's EXECUTION_REPORT §5 (carryover from inter-SPEC drift, no QA artifact) |
| Per-status (start) | paid:1, pending_payment:11 | matches the actual baseline (12 = 1 + 11) |
| WLDF_QA status (start) | `completed` | ⚠️ — leftover from executor's QA Path 2; reset to `invite_new` as part of Path 0 to provide a clean Path-2 subject |
| Future events with end_time | present (טסט 123, POST_WL_FIXES_QA, WAITING_LIST_QA, WLDF_QA) | ✅ |
| `crm_message_log` rows in last 5 min before QA | 0 | ✅ baseline clean |
| Integrity gate at start | clean (3 files scanned) | ✅ |

---

## Path-by-Path Results

### Path 0 — Baseline reset ✅ PASS

12 attendees confirmed (paid:1 + pending:11) — matches the **actual** post-trio baseline (executor noted in `FINDINGS.md F3` that the original "13" figure in §10.2 was carryover from a predecessor SPEC's documentation). Captured event-status snapshot for end-of-QA restoration. Reset WLDF_QA from `completed` (executor leftover) → `invite_new` to enable Path 2's clean test.

### Path 1 — Module load ✅ PASS

- `typeof window.CrmPaymentAutomation === 'object'` → `true` ✓
- `typeof window.CrmPaymentAutomation.markUnpaidForCompletedEvent === 'function'` → `true` ✓
- `typeof window.CrmPaymentAutomation.transferOpenCreditOnRegistration === 'function'` → `true` ✓
- `Object.keys(...)` returns exactly the 2 documented methods ✓
- Console errors at fresh load: 0 ✓

### Path 2 — Auto-unpaid on event completion ✅ PASS

Subject: WLDF_QA `9ab165db` (event #10), event_date 2026-05-20. Pre-state: status=`invite_new`, 2 attendees (Daniel `5843fc89` + Dana `10b6a739`) both `pending_payment`, no checkin.

UI flow: events list → row click → "שנה סטטוס" → "הושלם" (completed) → modal closes.

Post-state SQL:

| Subject | event_status | payment_status |
|---|---|---|
| WLDF_QA | completed ✓ | — |
| Daniel `5843fc89` | — | **unpaid** ✓ |
| Dana `10b6a739` | — | **unpaid** ✓ |
| Dana `69eedb90` (paid in טסט 123, different event) | — | **paid** (untouched) ✓ — confirms criterion 14 |

Console log: `[CrmPaymentAutomation] markUnpaidForCompletedEvent: event=9ab165db-... flipped=2` ✓

### Path 2b 🔴 — `closed` does NOT trigger ✅ PASS (CRITICAL)

This is the most important test in this SPEC. Two sub-tests both pass.

**Sub-test 1 — registration_open → closed (must NOT flip):**

Subject: TEST333 `21621d40` (event #4). Pre-state: status=`registration_open`, 1 attendee Dana `380ad445` `pending_payment` no-checkin.

UI flow: row click → "שנה סטטוס" → "נסגר" (closed).

Post-state:

| Subject | event_status | payment_status |
|---|---|---|
| TEST333 | closed ✓ | — |
| Dana `380ad445` | — | **pending_payment** (UNCHANGED) ✓ |

Helper correctly skipped on `closed`. **Critical scope held.**

**Sub-test 2 — closed → completed (must flip):**

Same modal, "שנה סטטוס" → "הושלם" (completed).

Post-state:

| Subject | event_status | payment_status |
|---|---|---|
| TEST333 | completed ✓ | — |
| Dana `380ad445` | — | **unpaid** ✓ |

Helper correctly fired on completed transition.

**Bonus 3rd verification (incidental):** during my first-attempt of sub-test 1 there was a UI selector slip-up — my "נסגר" click went to WLDF_QA's modal (which was on top after the previous Path 2 modal hadn't been fully closed). WLDF_QA went `completed → closed` via that mis-click. Helper correctly did NOT touch the existing `unpaid` attendees on WLDF_QA (no `unpaid → unpaid` re-flip and no other transitions). I reset and re-ran sub-test 1 cleanly. The accidental observation is itself a third confirmation that `closed` newStatus is a no-op — the helper's strict guard `(newStatus === 'completed' && oldStatus !== 'completed')` correctly filters out all non-completed transitions.

### Path 3 — Trigger only on transition INTO completed ✅ PASS

Subject: TEST333 (now in `completed` from Path 2b). Reset Dana's `380ad445` payment_status back to `pending_payment` via SQL, then directly invoked the helper with `(eventId, 'completed', 'completed')`.

```js
window.CrmPaymentAutomation.markUnpaidForCompletedEvent('21621d40-...', 'completed', 'completed')
→ {flipped: 0, eventId: '21621d40-...', skipped: true}
```

Post-state SQL: Dana's `380ad445` still `pending_payment` ✓ — re-save with same status correctly skips.

### Path 4 🔴 — Auto-credit-transfer on new registration ✅ PASS (incl. FIFO)

**Setup:** Daniel (lead `efc0bd54`, allowlisted phone `+972503348349`) had two attendee rows: `5843fc89` (WLDF_QA) and `c3a42396` (TEST543). Both set to `credit_pending` via SQL with different `credit_expires_at`:

| attendee_id | event | credit_expires_at | role |
|---|---|---|---|
| `5843fc89` | WLDF_QA | NOW + 30 days (oldest) | should transfer |
| `c3a42396` | TEST543 | NOW + 60 days (newer) | should NOT transfer |

UI flow: events list → טסט 123 (status=`registration_open`) → "רשום משתתף +" → search "Daniel" → click Daniel's lead row.

Post-state SQL:

| attendee_id | event | payment_status | credit_used_for_attendee_id | Verification |
|---|---|---|---|---|
| `679f08dc` (NEW) | טסט 123 | **paid** | null | ✅ new attendee paid via RPC |
| `5843fc89` (oldest credit) | WLDF_QA | **credit_used** | `679f08dc` | ✅ FIFO oldest transferred |
| `c3a42396` (newer credit) | TEST543 | **credit_pending** (UNCHANGED) | null | ✅ FIFO non-oldest preserved |

Console log: `[CrmPaymentAutomation] transferOpenCreditOnRegistration: lead=efc0bd54-... old=5843fc89-... new=679f08dc-...` ✓

**Phone allowlist verification:** the registration triggered the existing engine rule "הרשמה: אישור הרשמה" which dispatches SMS+Email to the registered lead. `crm_automation_runs` shows `total_recipients=2` for Daniel's lead `efc0bd54` (phone `+972503348349` allowlisted). 0 messages reached `crm_message_log` because dispatches stalled at the Make webhook (localhost quirk per F1) — but even if they had completed, the recipient was the allowlisted phone. ✅

### Path 5 — No transfer if no open credit OR expired credit ✅ PASS

Tested both negative cases via direct helper call:

**5A — lead with 0 open credits** (Dana `f49d4d8e` — has 10 attendees, 0 in `credit_pending`):

```js
window.CrmPaymentAutomation.transferOpenCreditOnRegistration('f49d4d8e-...', '00000000-...')
→ {transferred: false, oldAttendeeId: null, newAttendeeId: '00000000-...'}
```

Console: `[CrmPaymentAutomation] transferOpenCreditOnRegistration: no eligible credit_pending for lead=f49d4d8e-...` ✓

**5B — lead with only an expired credit** (Daniel `efc0bd54` after I set `c3a42396.credit_expires_at = NOW() - 1 day`):

```js
window.CrmPaymentAutomation.transferOpenCreditOnRegistration('efc0bd54-...', '00000000-...')
→ {transferred: false, oldAttendeeId: null, newAttendeeId: '00000000-...'}
```

Post-state SQL: `c3a42396` still `credit_pending` with the expired date — UNTOUCHED ✓ (the SELECT's `gt('credit_expires_at', nowIso)` filter excluded it correctly).

### Path 6 — Backward compat ✅ PASS

| Surface | Result |
|---|---|
| Bell anchor across 10 tab-cycle stops | ✅ all present |
| event-detail action modal opens via attendee click | ✅ |
| Templates editor (`📝 תבניות`) loaded | ✅ (verified by content "payment_received" + "event_registration_confirmation" present) |
| Automation rules editor (`⚡ כללי אוטומציה`) loads | ✅ 87 rule rows |
| `CrmAutomation.evaluate` still callable | ✅ exposed and functional |
| New console errors related to this SPEC | **0** ✅ |
| Pre-existing 400 (`/employees`) | 1 (unchanged from prior SPECs, not in scope) |

### Path 7 — Existing automations still fire ✅ PASS

`crm_automation_runs` query (last 15 min) shows the engine evaluated rule "הרשמה: אישור הרשמה" with `trigger_type='event_registration'` and `total_recipients=2` for Daniel's Path-4 registration to טסט 123. Rule evaluated correctly; recipients resolved. Status='running' is the documented localhost-Make-webhook stall (F1, NOT a regression).

This positively confirms `CrmAutomation.evaluate` is reachable from the modified `dispatchRegistrationConfirmation` call site — the new credit-transfer block (added BEFORE evaluate) does NOT short-circuit the existing engine path.

### Path 8 — Final cleanup + integrity ✅ PASS

```sql
-- Restore event statuses
UPDATE crm_events SET status='invite_new'        WHERE id='9ab165db-...';
UPDATE crm_events SET status='registration_open' WHERE id='21621d40-...';

-- Clear FK + delete QA-created attendee + reset payment state
UPDATE crm_event_attendees SET credit_used_for_attendee_id=NULL WHERE id='5843fc89-...';
DELETE FROM crm_event_attendees WHERE id='679f08dc-...';
UPDATE crm_event_attendees SET payment_status='pending_payment', paid_at=NULL,
       refund_requested_at=NULL, refunded_at=NULL,
       credit_expires_at=NULL, credit_used_for_attendee_id=NULL
 WHERE id IN ('5843fc89-...','c3a42396-...','10b6a739-...','380ad445-...');
```

Final state:

| Verification | Result |
|---|---|
| `SELECT payment_status, count(*) ... GROUP BY` | paid:1, pending_payment:11 (matches Path 0 baseline) ✅ |
| Event statuses restored | WLDF_QA=`invite_new`, TEST333=`registration_open` ✅ |
| `npm run verify:integrity` | exit 0 ("All clear — 3 files scanned") ✅ |
| `git status --short` | only pre-existing guardian/* docs ✅ |
| `git log origin/develop..HEAD --oneline` | empty (no unpushed commits) ✅ |
| `grep -c "cdn.tailwindcss.com" crm.html` | 1 ✅ |

No QA-created leads (used existing demo leads). 0 deletes on `crm_leads`. The single deleted `crm_event_attendees` row was the QA-created Daniel registration on טסט 123.

---

## Iron Rule self-audit (regression watch)

| Rule | Status | Notes |
|---|---|---|
| 1 (atomic quantity) | N/A | No quantity changes. |
| 2 (writeLog) | ✅ | Activity log + helper console logs both fire on transitions. |
| 7 (DB helpers) | ⚠️ | Helper uses `sb.from()` directly — pre-existing CRM pattern, not new debt. |
| 8 (escapeHtml) | N/A | No new HTML rendering. |
| 12 (≤350) | ✅ | crm-payment-automation.js: 100; crm-event-actions.js: 297; crm-event-register.js: 192; helpers: 272. |
| 14/15 (tenant_id+RLS) | ✅ | Both helper UPDATE/SELECT queries filter `tenant_id`. |
| 21 (no orphans) | ✅ | `tid → _regTid` rename pre-empted Rule-21 hook collision; commits all clean. |
| 22 (defense-in-depth) | ✅ | SELECTs filter on tenant_id. |
| 23 (no secrets) | ✅ | None added. |
| 31 (integrity gate) | ✅ | Clean at start AND end. |

---

## Findings to Process

| # | Severity | Status | Finding |
|---|---|---|---|
| F1 (from EXECUTION_REPORT) | INFO | OPEN — dev quirk | `crm_automation_runs` stuck `status='running'` on localhost-Make-webhook path. Confirmed again here for Path 4 (1 fresh run). No production impact. Suggested follow-up: dev-server mock for Make webhook. |
| F2 (from EXECUTION_REPORT) | INFO | OPEN — process | SPEC §3 file-size criterion baselines were stale (350/150 vs actual 295/179). Lesson: extend the M4_ATTENDEE_PAYMENT_UI proposal #1 ("re-baseline file sizes at SPEC approval") to ALL files in §3, not just the most-recently-edited one. |
| F3 (from EXECUTION_REPORT) | INFO | OPEN — bookkeeping | Total attendee count was 12 not 13 at session start. No QA artifacts; SPEC §10.2 expected number is stale carryover. Suggested follow-up: executor's proposal #2 ("compute expected_count delta") would prevent this. |
| F4 (NEW, this QA) | INFO | OPEN — UI selector hygiene | Stacked detail modals can cause `Array.from(...).find(...offsetParent)` to target the wrong modal (my Path 2b first attempt clicked WLDF_QA's "נסגר" instead of TEST333's). Browser-driven QA scripts should explicitly close all open modals before opening a new one (or scope the selector to the topmost dialog). Already coding around this in current scripts; future QA helper could expose `closeAllModals()`. |

No BLOCKER, no NON-BLOCKING findings. All 4 are INFO process/dev observations.

---

## Additional observation (out-of-paths)

- **Backfill verification at QA time:** the migration `2026_04_25_payment_backfill_closed_events.sql` was applied by the executor as commit 3. I confirmed the demo state across QA paths consistently showed `paid:1 + (pending_payment:11 or 12)` — never any `unpaid` rows (until QA Path 2/2b explicitly created them, then cleaned up). The backfill's 0-row outcome is consistent throughout. ✅

- **Phone allowlist held throughout:** the only registration that triggered engine dispatch (Path 4) targeted Daniel's lead `efc0bd54` (phone `+972503348349`, ✅ allowlisted, email `danylis92@gmail.com` = Daniel's personal). 0 dispatches went anywhere else. The Make-webhook stall (F1) means the messages never actually went out, which is fine for QA — even if they had, they would have gone to the allowlisted destination.

---

## Summary

**9/9 PASS, 0 FAIL, 0 PARTIAL.** Recommended verdict: 🟢 **CLOSED**.

The payment lifecycle trio (#1 schema → #2 UI → #3 automations) is now end-to-end verified on demo. Both new automations behave per SPEC strict scope:

- **`markUnpaidForCompletedEvent`** fires ONLY on transition INTO `completed` (not `closed`, not on re-save). Only `pending_payment + no-checkin` rows touched. Other statuses untouched.
- **`transferOpenCreditOnRegistration`** does FIFO oldest-first transfer when an unexpired credit_pending row exists for the lead. No-op on no-credit and expired-credit cases. Fires before the engine's confirmation message (so message reflects updated state).

Engine + RPC untouched (criteria 27 + 28). Backfill applied 0 rows (criterion 24-26). Demo state restored to baseline (criterion 30-equivalent). Module 4 ready for P7 (Prizma cutover).

---

*End of QA_FOREMAN_RESULTS.md.*
