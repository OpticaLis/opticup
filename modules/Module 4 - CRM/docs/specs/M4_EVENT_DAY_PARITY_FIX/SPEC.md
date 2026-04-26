# SPEC — M4_EVENT_DAY_PARITY_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_EVENT_DAY_PARITY_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session 2026-04-25
> **Authored on:** 2026-04-25
> **Module:** 4 — CRM
> **Phase:** Post-payment-UI parity + small bug fix
> **Predecessor SPECs (closed):** `M4_ATTENDEE_PAYMENT_UI` (`fd38982` + F1 fix `46e9877`)
> **Successor SPEC:** `M4_ATTENDEE_PAYMENT_AUTOMATION` (the third payment SPEC)

**Executor TL;DR (1 sentence):** Wire `CrmPayment.openActionModal()` into `crm-event-day-manage.js` so the event-day screen has the same payment-management capabilities as event-detail (refund / credit / etc., not just "סמן שולם"), AND fix the coupon status logic so a sent-but-not-checked-in attendee shows "📨 קופון נשלח" instead of misleading "⚠️ לא הגיע" while the event is still active.

---

## 1. Goal

Two fixes, one SPEC. Both surface from real Daniel use of the system.

### 1.1 Payment-management parity in event-day screen

Today, `crm-event-day-manage.js` shows the payment status pill (added in SPEC #2) and a "סמן שולם" button — but ONLY mark-paid. There's no path to mark refund-requested, refunded, or open credit from this screen. Daniel must navigate back to event-detail to do those actions, breaking workflow on the day of an event.

Fix: replace the simple "סמן שולם" button + click logic with the same `data-pay-attendee-id` pattern used in `crm-events-detail.js` line 206, which opens `CrmPayment.openActionModal()` — the full action modal with all 4 transition buttons.

### 1.2 Coupon status no longer says "⚠️ לא הגיע" prematurely

Today, `crm-event-day-manage.js:110-115` (`couponCell`) renders:
- if `coupon_sent=false` → button "שלח" (correct)
- if `coupon_sent=true` AND `checked_in_at` → "✓ הגיע" (correct)
- if `coupon_sent=true` AND no `checked_in_at` → **"⚠️ לא הגיע"** (BUG)

The third branch fires the moment a coupon is sent — even seconds after, even if the event hasn't started yet. The label "לא הגיע" is wrong because nobody has had a chance to arrive. Daniel reported this exact friction: he sent a coupon to Dana Cohen at 16:59:40 today; the message log + DB confirm `coupon_sent=true, sent at 16:59:40`; but the UI immediately flipped to "⚠️ לא הגיע".

Fix: introduce a 3-state coupon display:
1. `coupon_sent=false` → button "שלח" (unchanged).
2. `coupon_sent=true` AND `checked_in_at IS NOT NULL` → "✓ הגיע" (unchanged).
3. `coupon_sent=true` AND `checked_in_at IS NULL` AND event is still active → **"📨 נשלח"** (NEW, neutral status).
4. `coupon_sent=true` AND `checked_in_at IS NULL` AND event has ended → **"⚠️ לא הגיע"** (existing label, NOW correctly scoped to post-event).

"Event has ended" is determined by: `event.event_date + COALESCE(event.end_time, '23:59:59') < now()` OR `event.status IN ('completed', 'closed')`.

---

## 2. Background & Motivation

### 2.1 Why parity matters

Two screens for the same job (event-detail vs event-day-manage) are valid — they serve different mental models. event-detail is "manage the event over its lifecycle"; event-day-manage is "what's happening right now, today". But the affordances for an attendee should be consistent across both. Today they're not: event-detail has full payment actions via the action modal, event-day-manage has only mark-paid as a one-shot toggle. A staff member at a live event who needs to issue a refund must context-switch.

### 2.2 Why the coupon bug is urgent

This bug actively misinforms staff. They send a coupon and the UI immediately implies the customer didn't show up. With multiple attendees per event, this could lead a staff member to scroll through "⚠️ לא הגיע" rows and conclude no one arrived — when in fact the event hasn't even started.

### 2.3 Daniel's directive (this session)

> "חשוב שהניהול של הפיקדון כולל ההחזר שלו יהיה גם ב'יום אירוע' בדיוק כמו ב'אירועים' שתהיה אחידות בניהול של הפיקדון... ניסיתי לשלוח קופון... ההודעות גם של האס אמ אס וגם המייל הגיעו... אבל במסך ששלחתי ב'יום אירוע' זה הפך ל'לא הגיע'."

### 2.4 Why this is a small SPEC, not part of SPEC #3

SPEC #3 is about automations. These two fixes are about UI consistency and label correctness — separate concern, faster to ship, lower risk. Bundling them with automations would slow both. Daniel approved running this as a small fix-SPEC before SPEC #3.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value.

### 3.1 File & repo state

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Branch state | On `develop`, clean | `git status` |
| 2 | Commits produced | exactly 2 | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | `crm-event-day-manage.js` size | between 340 and 350 lines (currently 344) | `wc -l` |
| 4 | All CRM JS files ≤350 lines (Rule 12) | 0 violations | `find` |
| 5 | Integrity gate | exit 0 | `npm run verify:integrity` |
| 6 | Pre-commit hooks pass | all pass without `--no-verify` | git commit |

### 3.2 Behavioral — fix #1 (parity)

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 7 | Click on attendee row in event-day-manage opens action modal | modal appears with full 4-button matrix per `payment_status` | QA path 2 |
| 8 | The "סמן שולם" button in `feeCell` is REMOVED (replaced by row-click) | grep `data-toggle-fee` returns 0 hits in event-day-manage | QA path 2 |
| 9 | Mark-refund-requested + mark-refunded + open-credit accessible from event-day | exercise each via the modal | QA path 3 |
| 10 | Bell badge refreshes after action from event-day | `CrmNotificationsBell.refresh()` called | QA path 3 |
| 11 | After action, table re-renders with new pill | call `loadAttendees + renderTable` from action `onUpdate` callback | QA path 3 |

### 3.3 Behavioral — fix #2 (coupon status)

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 12 | Sent coupon, no checkin, event in future → "📨 נשלח" pill | exact text "📨 נשלח" with neutral color (slate or sky) | QA path 4 |
| 13 | Sent coupon, no checkin, event past → "⚠️ לא הגיע" pill (existing) | unchanged behavior | QA path 5 |
| 14 | Sent coupon, has checkin → "✓ הגיע" pill (existing) | unchanged behavior | QA path 4 |
| 15 | No coupon sent → "שלח" button (existing) | unchanged behavior | QA path 4 |
| 16 | "Event past" detection uses event_date + end_time OR status | `eventEnded(event)` helper checks both — see §8.2 | code review |

### 3.4 Backward compat

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 17 | event-detail screen still works as before | open event detail → action modal still opens via attendee click | QA path 6 |
| 18 | Bell + tier 2 highlight still work | unchanged | QA path 6 |
| 19 | All other CRM tabs load without error | spot-check | QA path 6 |
| 20 | `crm-automation-engine.js` untouched | git verify | git verify |
| 21 | DB schema untouched | no migrations | git verify |

### 3.5 Documentation

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 22 | SESSION_CONTEXT updated | new Phase History row | grep |
| 23 | CHANGELOG updated | new section at top | grep |
| 24 | EXECUTION_REPORT.md present | exit 0 | `test -f` |
| 25 | FINDINGS.md present (or absent with reasoning) | inspect | inspect |
| 26 | Push to origin | exit 0, HEAD synced | `git status -uno` |

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do without asking

- Read any file (Level 1).
- Read-only SQL (Level 1).
- Edit `modules/crm/crm-event-day-manage.js` within bounds of §8.
- Edit `modules/crm/crm-payment-helpers.js` ONLY to add the `eventEnded()` helper if needed (lightweight addition; OK to inline in event-day-manage if cleaner).
- Edit MODULE_MAP, SESSION_CONTEXT, CHANGELOG.
- Commit and push to develop per §9.
- Create QA test attendees on demo via UI flow (Level 2; bounded). Soft-disable / hard-delete at QA close.
- Decide internal helper names, exact label wording for "📨 נשלח" (the "📨" emoji can be alternative if cleaner).

### 4.2 What REQUIRES stopping and reporting

- Any DDL.
- Any change to `crm-automation-engine.js`.
- Any change to `crm-events-detail.js` (this SPEC is only about event-day-manage; if the fix requires changing both, STOP).
- Any change to other `crm-event-day*.js` files unless explicitly listed.
- Any new orphan global.
- Pre-commit hook failure that you cannot diagnose in one read.
- `crm-event-day-manage.js` projects above 350.
- "📨 נשלח" pill rendering uses different colors/styling than the SPEC's intent ("neutral" — slate or sky).
- The action modal wiring breaks on event-day-manage because `attendees` cache shape differs from `crm-events-detail.js` (e.g., missing fields). If so, STOP and report; the fix is to extend the `select` clause in event-day-manage's `loadAttendees`.
- More than 2 commits OR fewer than 2.

### 4.3 SQL autonomy

- Level 1 (read-only): unrestricted.
- Level 2 (writes on demo only): allowed for QA via UI flow.
- Level 3 (DDL): NEVER.

---

## 5. Stop-on-Deviation Triggers

1. **The action modal opens but buttons don't fire.** `CrmPayment.openActionModal()` requires the attendee row's `event_id` to fetch the event. Verify `loadAttendees` in event-day-manage selects `event_id` (it does — see line 71).
2. **"📨 נשלח" appears but the pill format breaks the table layout.** The new pill must fit the existing td width.
3. **The `eventEnded()` check uses browser local time without considering event timezone.** All events on demo are Israel time. Use `event.event_date + (event.end_time || '23:59:59')` parsed as Israel time, OR check `event.status` for `'completed' / 'closed'` first (status-based check is timezone-free).
4. **`CrmPayment.openActionModal` is called from event-day-manage but the modal opens with stale attendee data.** The modal re-fetches; this should be OK. Verify post-action that table refresh shows new state.
5. **Tailwind CDN tag accidentally moved.** `grep "cdn.tailwindcss.com" crm.html | wc -l` must remain 1.
6. **More than 2 commits or fewer than 2.** §9 is exact.

---

## 6. Rollback Plan

```
git reset --hard fd38982   # M4_ATTENDEE_PAYMENT_UI close commit (or 46e9877 for post-F1)
git push --force-with-lease origin develop  # ONLY with Daniel's explicit go-ahead
```

DB cleanup (only if QA created stale rows):
```sql
-- Reset QA-modified rows to baseline
UPDATE crm_event_attendees
   SET payment_status='pending_payment', paid_at=NULL, refund_requested_at=NULL,
       refunded_at=NULL, credit_expires_at=NULL, credit_used_for_attendee_id=NULL,
       coupon_sent=false, coupon_sent_at=NULL
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND id IN ('<qa_modified_ids>');
```

Force-push requires Daniel's explicit authorization.

---

## 7. Out of Scope (explicit)

- **Automations.** SPEC #3 territory.
- **Schema changes.** None needed.
- **`crm-events-detail.js` rewrites.** Only used as a reference pattern.
- **Fixing other event-day screens** (`crm-event-day.js`, `crm-event-day-checkin.js`, `crm-event-day-schedule.js`). Only `crm-event-day-manage.js` has the bug.
- **Changing the coupon dispatch path.** It works correctly. Only the display is wrong.
- **`payment_received` template tweaks.** Out of scope.

### Forward-flags

- **Post-SPEC #3:** the "📨 נשלח" state may benefit from a "click to resend" affordance if customers report not receiving. Out of scope here; future polish SPEC if needed.
- **Lead-detail.js (349/350) blocking:** not relevant here; this SPEC doesn't touch it.

---

## 8. Expected Final State

### 8.1 Modified file: `modules/crm/crm-event-day-manage.js` — currently 344 lines, target 343–349

Two surgical changes:

#### Change A — `feeCell` becomes a row-click handler (parity with event-detail)

Current `feeCell`:
```js
function feeCell(r) {
  var pill = window.CrmPayment ? CrmPayment.renderStatusPill(r.payment_status) : '';
  var btn = (r.payment_status === 'paid') ? '' : ' <button type="button" class="' + CLS_TOGGLE_OFF + '" data-toggle-fee="' + escapeHtml(r.id) + '">סמן שולם</button>';
  return pill + btn;
}
```

Replace with:
```js
function feeCell(r) {
  var pill = window.CrmPayment ? CrmPayment.renderStatusPill(r.payment_status) : '';
  // Whole cell is clickable to open the full action modal
  return '<button type="button" class="text-start hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded" data-pay-attendee-id="' + escapeHtml(r.id) + '">' + pill + '</button>';
}
```

And remove the `wireRowActions` block for `[data-toggle-fee]` (or rename it to `[data-pay-attendee-id]` calling `CrmPayment.openActionModal`).

The existing `toggleFee` function may be removed entirely OR kept as a private fallback (executor decides; document choice).

After action modal closes / triggers `onUpdate`, re-call `loadAttendees + renderTable` so the pill reflects the new state.

#### Change B — `couponCell` adds the "📨 נשלח" intermediate state

Current:
```js
function couponCell(r) {
  if (!r.coupon_sent) return '<button ...>שלח</button>';
  return r.checked_in_at
    ? '<span class="bg-emerald-100 text-emerald-700">✓ הגיע</span>'
    : '<span class="bg-amber-100 text-amber-800">⚠️ לא הגיע</span>';
}
```

Replace with:
```js
function couponCell(r) {
  if (!r.coupon_sent) return '<button type="button" class="' + CLS_TOGGLE_OFF + '" data-toggle-coupon="' + escapeHtml(r.id) + '">שלח</button>';
  if (r.checked_in_at) return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✓ הגיע</span>';
  if (eventEnded(_event)) return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">⚠️ לא הגיע</span>';
  return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">📨 נשלח</span>';
}
```

Where `_event` is the event row currently loaded in event-day-manage's state (see existing `_event` or equivalent in `loadEvent`/`renderTable`). If event-day-manage doesn't currently hold the event row, the executor adds a small `_event` cache populated by `loadEvent()`.

Add helper:
```js
function eventEnded(ev) {
  if (!ev) return false;
  if (ev.status === 'completed' || ev.status === 'closed') return true;
  if (!ev.event_date) return false;
  var endTime = ev.end_time || '23:59:59';
  var endDateTime = new Date(ev.event_date + 'T' + endTime + '+03:00');  // Israel time
  return endDateTime.getTime() < Date.now();
}
```

### 8.2 New retrospective files

- `modules/Module 4 - CRM/docs/specs/M4_EVENT_DAY_PARITY_FIX/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_EVENT_DAY_PARITY_FIX/FINDINGS.md` (only if findings)

### 8.3 Files NOT modified

- `crm-payment-helpers.js` — touched only if `eventEnded()` is moved there for reuse (executor's call). If left in event-day-manage, no change.
- `crm-events-detail.js` — untouched.
- `crm-event-day.js`, `crm-event-day-checkin.js`, `crm-event-day-schedule.js` — untouched.
- `crm-leads-detail.js` (349/350) — DO NOT TOUCH.

### 8.4 File-size projection

| File | Currently | Projected |
|---|---|---|
| `crm-event-day-manage.js` | 344 | 343–349 (depends on whether `_event` cache + `eventEnded` helper add 5 lines or `toggleFee` removal subtracts 5; net ~ 0) |

If projects above 350: extract `eventEnded()` to `crm-payment-helpers.js` instead.

---

## 9. Commit Plan

Exactly 2 commits.

### Commit 1 — `fix(crm): parity + coupon-status fix on event-day-manage`

- Files: `modules/crm/crm-event-day-manage.js` (and optionally `crm-payment-helpers.js` if `eventEnded` extracted).
- Both changes (A: action modal wire, B: 3-state coupon) in one commit since they're intertwined (both touch `feeCell`/`couponCell` rendering + wireRowActions).
- Pre-commit hooks pass.

### Commit 2 — `chore(spec): close M4_EVENT_DAY_PARITY_FIX with retrospective`

- Files: EXECUTION_REPORT.md (new), FINDINGS.md (new if any), MODULE_MAP.md, SESSION_CONTEXT.md, CHANGELOG.md.
- NO code changes here.

---

## 10. Test Subjects (Pinned)

### 10.1 Tenant
- demo — `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`.

### 10.2 Pre-flight verification

```sql
-- Total attendees on demo
SELECT count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-…' AND is_deleted=false;
-- Expected: 13

-- Per-status breakdown
SELECT payment_status, count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-…' AND is_deleted=false
 GROUP BY payment_status ORDER BY payment_status;
-- Expected: paid:1, pending_payment:12 (post-F1-cleanup baseline)

-- Find an event with end_time set, in past + future for QA paths 4/5
SELECT id, name, event_date, end_time, status FROM crm_events
 WHERE tenant_id='8d8cfa7e-…' AND end_time IS NOT NULL
 ORDER BY event_date DESC LIMIT 5;
-- Pin: at least 1 future event (QA path 4) + 1 past event (QA path 5)
```

### 10.3 Phone allowlist
- Only `0537889878` and `0503348349` for any QA send. Same as prior SPECs.

---

## 11. Lessons Already Incorporated

Cross-Reference Check 2026-04-25: 0 collisions.
- `eventEnded` global — does not exist (verified via grep).
- `_event` cache — may already exist in event-day-manage (verify with grep before adding).

Lessons applied:
1. **FROM `M4_ATTENDEE_PAYMENT_UI/FOREMAN_REVIEW.md §6 Proposal 1 (re-baseline file sizes at SPEC approval)** → APPLIED in §3 + §8.4: `wc -l` was re-run at SPEC authoring time (344 lines confirmed).
2. **FROM `M4_ATTENDEE_PAYMENT_UI/FOREMAN_REVIEW.md §6 Proposal 2 (persistent UI anchor pattern)** → NOT APPLICABLE here (no new persistent UI element).
3. **FROM `M4_ATTENDEE_PAYMENT_SCHEMA/FOREMAN_REVIEW.md §6 Proposal 1 (criteria-vs-§8 sync check)** → APPLIED in §3: 26 criteria match the 2 commits + 4 file groupings in §8.

---

## 12. Foreman QA Protocol

Delegated to Claude Code on Windows desktop per established workflow.

### 12.1 Path 1 — Pre-flight
SQL queries from §10.2. Confirm baseline.

### 12.2 Path 2 — Click attendee in event-day-manage opens action modal
1. Navigate `crm.html?t=demo` → אירועים → choose an event with attendees → "ניהול יום אירוע".
2. Click on the payment status pill of any attendee → action modal opens with full 4-button matrix.
3. Verify "סמן שולם" toggle button no longer renders (replaced by clickable pill).

### 12.3 Path 3 — Full action chain from event-day
1. Mark a test attendee `refund_requested`.
2. Mark refunded.
3. Reset to pending_payment (test).
4. Mark refund_requested → open credit (+6 months default).
5. Verify table re-renders, bell badge refreshes.

### 12.4 Path 4 — Coupon status, future event
1. Find/create attendee in a future event (event_date > today).
2. Click "שלח" coupon → confirm the SMS+Email send (only to allowlisted phone).
3. Verify pill changes to "📨 נשלח" with sky color, NOT "⚠️ לא הגיע".
4. Simulate check-in → pill becomes "✓ הגיע".

### 12.5 Path 5 — Coupon status, past event
1. Find/create attendee in a past event (event_date < today, status='completed' or just past end_time).
2. With coupon_sent=true and no checked_in_at → pill should be "⚠️ לא הגיע" (existing behavior preserved).
3. Verify status='completed' branch works AND past-end_time branch works.

### 12.6 Path 6 — Backward compat
- event-detail screen: action modal still opens via attendee click.
- Bell still works.
- Tier 2 highlight still works.
- Templates editor still works.
- Automation rules editor still works.
- 0 console errors.

### 12.7 Path 7 — Final cleanup
Reset QA attendees to baseline. Verify:
```sql
SELECT payment_status, count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-…' AND is_deleted=false
 GROUP BY payment_status;
-- Expected: paid:1, pending_payment:12
```
Plus the standard `npm run verify:integrity`, `git status`, Tailwind CDN check.

---

## 13. Pre-Merge Checklist

- [ ] All §3 criteria pass.
- [ ] Integrity gate exit 0.
- [ ] `git status --short` empty (ignoring docs/guardian/*).
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS written.
- [ ] MODULE_MAP / SESSION_CONTEXT / CHANGELOG updated.
- [ ] Rule 12 not breached.
- [ ] No new orphan globals.
- [ ] No SMS/Email to non-allowlisted phone.
- [ ] Tailwind CDN count = 1.

---

## 14. Dependencies / Preconditions

- Branch `develop` current.
- `M4_ATTENDEE_PAYMENT_UI` closed (`fd38982` + F1 fix `46e9877`). ✓
- Local dev server reachable for QA.
- Demo state: 13 attendees, 1 paid + 12 pending_payment.
- At least 1 demo event with `end_time IS NOT NULL` (verified at SPEC author time).

---

*End of SPEC.*

*Ready for execution by opticup-executor. Do not begin until Daniel reviews and approves.*
