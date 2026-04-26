# FINDINGS — COUPON_CAP_AUTO_CLOSE

> Issues surfaced during execution that are NOT in scope of this micro-SPEC.

---

## F1 — Two-toast noise on auto-close path — INFO

**Severity:** INFO
**Location:** `modules/crm/crm-event-day-manage.js:314, 318` —
`toggleCoupon` toasts once for coupon send, once for auto-close.
**Description:** On the final-coupon click, the user sees two toasts in
quick succession: "הקופון נשלח: SMS ✓ | Email ✓" followed by
"האירוע עבר ל'נסגר' — כל הקופונים הונפקו". Behaviour is correct; UX is
slightly noisy. Merging into one longer toast would combine information
but reduce distinct readability.
**Suggested next action:** Keep as-is for now. If Daniel notices the
noise in production, consider a debounced single-toast with both
messages. ~5 line change.

---

## F2 — `changeEventStatus` UPDATE races the auto-close check — LOW

**Severity:** LOW — only relevant at extreme concurrency (multi-operator)
**Location:** `modules/crm/crm-coupon-dispatch.js:checkAndAutoClose`
and `crm-event-actions.js:changeEventStatus`.
**Description:** Two operators A and B click "שלח" on the last two
coupons (imagine max=2, current=0) within ~100 ms. Each client runs
`toggleCoupon` → DB UPDATE `coupon_sent=true` → count query → compare.
If both race the count query before the other's UPDATE commits, each
might see count=1 and skip auto-close. The event would stay
`registration_open` with 2 coupons sent (1 over the intended 1-cap, if
max+extra was 1). Fix would require DB-side enforcement (a trigger that
sets status='closed' when the count flips over ceiling).
**Suggested next action:** Not fixed here — demo-scale operations have
1 operator at a time. If Prizma cutover introduces 2+ staff simultaneously
managing one event's coupons, add a DB trigger:
```sql
CREATE OR REPLACE FUNCTION auto_close_event_on_coupon_cap() RETURNS trigger AS $$
BEGIN ...
  IF (SELECT count(*) FROM crm_event_attendees WHERE event_id=NEW.event_id AND coupon_sent=true) >=
     (SELECT max_coupons + extra_coupons FROM crm_events WHERE id=NEW.event_id)
     AND (SELECT status FROM crm_events WHERE id=NEW.event_id) NOT IN ('closed','completed') THEN
    UPDATE crm_events SET status='closed' WHERE id=NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
Plus a client-side re-fetch to sync the UI. Separate SPEC if needed.

---

## F3 — Event status badge in Event Day view may briefly show stale value — INFO

**Severity:** INFO
**Location:** `modules/crm/crm-event-day.js` (event day top header uses
`ev.status` from state).
**Description:** After auto-close, `ev.status` is patched locally to
'closed' (from the `ac.closed` return in toggleCoupon). The header
badge re-renders on the next `renderTable()` call. Between the auto-close
toast and renderTable, there's a micro-window where the badge may still
show "registration_open". Invisible at human timescales but a slight
consistency concern.
**Suggested next action:** None — current `toggleCoupon` ends with
`renderTable()` which runs synchronously right after the patch. In
practice, users don't see the stale badge. If a future refactor makes
renderTable async, verify the patch + render ordering.
