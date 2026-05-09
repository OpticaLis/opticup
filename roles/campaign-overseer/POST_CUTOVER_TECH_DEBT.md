# Campaign Overseer — Post-Cutover Tech Debt Log

> **Purpose:** capture items observed during pre-cutover QA that are non-blocking for the 2026-05-03 cutover but need follow-up SPECs in the post-cutover backlog.
> **Authority:** Overseer logs items here; Supervisor authors the SPECs; Claude Code executes.
> **Update discipline:** append-only. Newest at top. Mark `RESOLVED` (with SPEC slug + date) when shipped — do NOT delete.

---

## TD-002 — [OPEN] Partial-phone search bug in `crm-incoming-tab.js:109` (same pattern as PHONE_SEARCH_PARTIAL_FIX)

**Date observed:** 2026-05-04 late night
**Status:** ⏳ OPEN — logged as INFO-severity finding by PHONE_SEARCH_PARTIAL_FIX EXECUTION_REPORT.

### What

`crm-incoming-tab.js:109` uses the same `normalizePhone(s)` + `phone.indexOf(sNorm)` pattern that PHONE_SEARCH_PARTIAL_FIX corrected in `crm-leads-tab.js:145-152`. Searching with a partial Israeli local-format string (e.g. `05056`) on the "לידים נכנסים" tab will return 0 results even when leads matching exist.

### Recommended fix

Apply the same 5-line patch from PHONE_SEARCH_PARTIAL_FIX to `crm-incoming-tab.js`. Out of scope for that SPEC by design (one-file-per-SPEC discipline). A future cleanup SPEC can either: (a) duplicate the search-prefix helper into the incoming-tab file, or (b) extract a shared helper into `crm-helpers.js` (e.g. `phoneSearchVariants(s)` returning the array of all forms to test).

### Severity

INFO — affects daily ops on the incoming tab (less heavily used than רשומים, but still a regression for any operator who searches by partial phone there).

### Who logged

Claude Code via the executor's PHONE_SEARCH_PARTIAL_FIX FINDINGS, surfaced during cross-reference grep at Step 1 of that SPEC.

---

## TD-001 — [CLOSED — NOT A BUG] UI label "לא הגיע" investigation

**Date observed:** 2026-05-02 evening (Israel)
**Status:** ✅ CLOSED 2026-05-02 night — investigated, original premise was wrong.

### What I originally claimed
The CRM displays "לא הגיע" as a coupon-delivery status that the code state machine doesn't recognize, suggesting a mismatch between UI label semantics and underlying schema.

### What investigation actually found
"לא הגיע" is **not** a "coupon delivery failed" label. It is a **post-event no-show label**. The exact UI logic in `modules/crm/crm-event-day-coupon.js` `couponCell()`:

```
if (!coupon_sent)         → "שלח" (send button)
if (checked_in_at)        → "✓ הגיע"
if (CrmPayment.eventEnded(ev)) → "⚠️ לא הגיע"
else                      → "📨 נשלח"
```

So "לא הגיע" fires only when: `coupon_sent=true` AND `checked_in_at IS NULL` AND the event has ended (`status='completed'` OR `event_date + end_time` is in the past, Israel TZ — see `crm-payment-helpers.js` `eventEnded()`).

This is a **valid and meaningful operator signal**: "we sent this customer a coupon, the event is now over, they did not show up = no-show." Useful for post-event reporting and re-targeting.

### Why event #7 attendees showed this label
Event #7 has `event_date='2026-05-02'`, `end_time='18:00:00'`, status=`event_day`. Current Israel time is past 18:00 → `eventEnded(ev) === true`. QA-A and QA-B had `coupon_sent=true` (from QA seed; not from a real send) and `checked_in_at IS NULL` → UI correctly fired "לא הגיע".

QA-C had `coupon_sent=false` → UI correctly showed the "שלח" button.

### Production-flow soundness
The send flow in `crm-event-day-coupon.js` `toggleCoupon()` is correct and atomic:
1. Pre-flight checks (event status, attendee status, ceiling, code, phone/email).
2. Call `CrmCouponDispatch.dispatch(target, ev)` to send SMS + email.
3. Only if at least one channel succeeds (`dispatch.anyOk`), UPDATE the row with `{ coupon_sent: true, coupon_sent_at: nowIso }` together. If both channels fail → show error, do NOT set the flag.

So in production: `coupon_sent` and `coupon_sent_at` are always set together after a real successful dispatch. The "flag without timestamp" state observed on QA-A and QA-B is purely a QA-seed artifact (someone manually set `coupon_sent=true` to satisfy the resolver's filter without going through the actual send flow).

### Conclusion
- No code bug.
- No mismatched-state issue between UI and resolver.
- The "לא הגיע" label is well-defined and operationally useful.
- The QA-data anomaly (flag without timestamp) is a QA-only condition that production never produces.

### Lesson for the Overseer
Before declaring "the UI label X doesn't match the code's state X" — read the UI label's actual definition in the rendering code. I conflated "didn't arrive" with "delivery failed" purely from the Hebrew literal translation, without checking the conditions that fire the label. Recorded as a learning pattern: the literal Hebrew of a UI label is not its semantic — read the code.

---

*End of TD-001.*
