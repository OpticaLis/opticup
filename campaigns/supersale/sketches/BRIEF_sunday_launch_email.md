# BRIEF — Sunday "launch teaser" EMAIL for the SuperSale event campaign

**Author:** Events-Operations (Cowork) · **For:** Claude Code in the opticup (ERP) repo · 2026-05-22
**Companion:** ACTIVATION_PROMPT_sunday_launch_email.md
**Output:** a NEW HTML email template body (Hebrew, RTL) — Daniel will review a visual preview before
anything is created in the CRM or sent. This brief is for AUTHORING the HTML only; do NOT insert into
the DB or send. Deliver the .html so Events-Ops can render a preview for Daniel.

---

## Context — the campaign
This is Wave 1 (Sunday) of a 3-wave push to convert ~1,142 invited-but-not-registered leads to register
for the upcoming brand event. The matching SMS (already approved) is short; this EMAIL is the rich,
longer companion. Both lead to the landing page **https://prizma-optic.co.il/supersale-launch/**.

The event: brand collections launch, **Friday 29.5**, Ashkelon branch (Herzl 32). Audience: leads who
were invited and haven't registered yet. The email's job: make them WANT to open the landing page and
then reserve a spot (via WhatsApp on the page).

## Tone (Daniel directive)
- High quality, premium, NOT cheap/salesy. Informative-first: people want to SEE the models + prices.
- Hebrew, RTL. Short hyphen "-" only, never em-dash. "קולקציות יוקרה" reserved for the luxury brand
  set (John Dalia/Cazal/KameManNen/Matsuda/Fred); the designer brands (Prada/MiuMiu/Tiffany/Versace/
  Ray-Ban/Gucci/Dior/etc.) are "בתי אופנה נבחרים".
- Longer + more interesting than the SMS, but every line earns its place.

## Must include
1. **Opening (stop-the-scroll), matching the SMS hook:** "הצצה בלעדית למחירי הדגמים שיחכו לכם באירוע
   הקרוב" — give value immediately (prices/models), exclusivity, curiosity.
2. **The event facts:** יום %event_day_of_week% %event_date%, סניף אשקלון. (Use the dynamic
   day-of-week placeholder, NOT a hardcoded "שישי".)
3. **What's inside (informative, not salesy):** בתי האופנה הגדולים החל מ-400 ₪, plus קולקציות יוקרה
   נדירות (luxury = exclusive event benefits, NOT a displayed price — do not attach a price to luxury).
4. **Extra benefit for early reservers:** mention there are אקסטרא הטבות לנרשמים מראש (e.g. the extra
   ₪50 off on the premium tier + the event benefits) — frame as a reason to reserve early, lightly.
5. **Primary CTA button → the landing page** https://prizma-optic.co.il/supersale-launch/
   ("לצפייה בדגמים ובמחירים" or similar).
6. **WhatsApp link** to reserve directly: https://wa.me/972533645404 (053-364-5404) with a short
   prefilled message about reserving a spot for the Friday 29.5 event.
7. **Nudge to read the FAQ:** mention that the landing page has a שאלות ותשובות section with a lot of
   useful info (price commitment, coupon, lab/delivery, etc.) and it's worth reading.
8. Standard footer + **%unsubscribe_url%**.

## Placeholders available (use these exact tokens)
%name%, %event_name%, %event_date%, %event_day_of_week%, %event_time%, %unsubscribe_url%.
Do NOT invent new placeholders (Iron Rule 35). Links to the landing page + WhatsApp are static URLs
(not per-lead), so hardcode them.

## Design
Follow the Prizma email design language used by the existing event emails (e.g.
event_registration_open_email_he): dark/elegant header, ONE gold (#c9a555 family), Rubik/Heebo, RTL,
mobile-responsive table layout, gold CTA button. Match that canon — don't invent a new look.

## Constraints
Authoring only — do NOT touch the DB, do NOT send. Output the HTML file. Hebrew RTL, inline CSS
(email-safe table layout). Keep it rendering correctly in email clients (no external CSS, no flexbox-
only layouts). Deliver to a path Events-Ops can preview.

## Deliverable
- One HTML email body file (e.g. campaigns/supersale/messages/sunday_launch_email.html) — full,
  preview-ready, with the placeholders in place. Report the path. Do NOT create the CRM template or
  send — Events-Ops will render it for Daniel, then handle demo-first + template creation separately.

## Stop-on-deviation
Anything requiring a new placeholder, DB write, or send — stop and report.
