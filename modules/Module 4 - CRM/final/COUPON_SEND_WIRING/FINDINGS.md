# FINDINGS — COUPON_SEND_WIRING

> Findings surfaced during execution that are NOT in scope of this SPEC.
> Do not fix here — each is a suggested next action for the Foreman.

---

## F1 — SMS template has zero variables (static body) — INFO

**Severity:** INFO
**Location:** `crm_message_templates WHERE slug='event_coupon_delivery_sms_he'` (body 257 chars)
**Description:** The SMS body is entirely static text: `"🎫 שריון המקום
שלך הושלם! הקופון האישי נשלח אלייך למייל..."`. It does not reference
`%name%`, `%coupon_code%`, `%event_date%`, `%phone%`, or `%unsubscribe_url%`.
The message tells the recipient "the personal coupon was sent to you by
email" — which is consistent with the design (QR + coupon code live in the
email template, SMS is just a notification), but it has two consequences:
1. **Unpersonalized.** Every SMS looks identical. If 50 attendees get the
   same SMS on the same day, they cannot distinguish their own delivery.
2. **Legal / unsubscribe.** Israeli ISPs and international best practice
   require marketing SMS to include an unsubscribe link. Other SMS
   templates in the project (`event_registration_confirmation_sms_he`,
   `event_day_sms_he`) include `%unsubscribe_url%`. This one does not.
**Suggested next action:** Foreman decides whether to add a variable-rich
SMS (e.g., `"%name%, הקופון %coupon_code% שלך מוכן. פרטים במייל..."`) or
keep it static. Either way, add `%unsubscribe_url%` for legal parity. A
small template-level UPDATE fixes this — no EF or code change.

---

## F2 — `crm_events.coupon_code` is per-event, not per-attendee — LOW

**Severity:** LOW (product design question, not a bug)
**Location:** `crm_events.coupon_code` (schema); referenced by
`CrmCouponDispatch.dispatch` variable binding.
**Description:** Today every attendee of a given event receives the same
`coupon_code` string (e.g., all attendees of "אירוע SuperSale טסט" receive
`SUPERSALE3`). That's what the SPEC assumed and what this SPEC ships. But
the email template shows the coupon code as `"(הקופון אישי וחד-פעמי)"` —
"personal and one-time". This framing contradicts the implementation:
anyone who forwards the email to a friend shares the same code, and there
is no enforcement that a code is redeemed only once.
**Suggested next action:** If the product truly intends per-attendee
unique codes:
1. Add `crm_event_attendees.coupon_code TEXT` column.
2. RPC `mint_attendee_coupon(attendee_id)` that generates `<event_coupon>-<random5>` atomically (Rule 11 — sequential-via-RPC).
3. Redemption-tracking table `crm_coupon_redemptions` or flag on attendee.
4. `CrmCouponDispatch.dispatch` pulls `attendee.coupon_code` instead of `event.coupon_code`.
This is a meaningful product change, warranting its own SPEC.

---

## F3 — Autocrlf warning on SMS.txt (noise, not corruption) — INFO

**Severity:** INFO
**Location:** `campaigns/supersale/MESSAGES UPDATE/COUPON/SMS.txt` (commit `f621b49`).
**Description:** Observed `warning: in the working copy of '...SMS.txt', LF
will be replaced by CRLF the next time Git touches it` on commit B of the
prior session. The integrity gate (Iron Rule 31) is green, no null-byte
corruption, no truncation. Git is applying autocrlf correctly for Windows.
**Suggested next action:** None required — this is expected Windows behavior
without `.gitattributes`. If the project ever adds `.gitattributes` to pin
`*.txt` LF, the warning disappears. Not worth a SPEC on its own.
