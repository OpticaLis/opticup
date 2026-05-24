You are in opticalis/opticup (ERP repo). AUTHOR a new HTML email body (Hebrew, RTL) — the Sunday
"launch teaser" email for the SuperSale event campaign. Full context:
campaigns/supersale/sketches/BRIEF_sunday_launch_email.md — read it first.

IMPORTANT: authoring ONLY. Do NOT write to the database, do NOT create a CRM template, do NOT send
anything. Output the HTML file so it can be previewed for Daniel.

WHAT TO BUILD
A premium, informative-first Hebrew RTL marketing email that drives the reader to the landing page
https://prizma-optic.co.il/supersale-launch/ and to reserve a spot. Wave 1 (Sunday) of a 3-wave push
to ~1,142 invited-not-registered leads. Companion to an already-approved short SMS.

TONE: high quality, premium, NOT salesy. Informative — they want to SEE models + prices. Short hyphen
"-" only. "קולקציות יוקרה" only for the luxury set; designer brands are "בתי אופנה נבחרים".

MUST INCLUDE
1. Opening hook matching the SMS: "הצצה בלעדית למחירי הדגמים שיחכו לכם באירוע הקרוב" — value + exclusivity first.
2. Event facts: יום %event_day_of_week% %event_date%, סניף אשקלון (use the dynamic day-of-week token).
3. What's inside (informative): בתי האופנה הגדולים החל מ-400 ₪ + קולקציות יוקרה נדירות (luxury = exclusive
   event benefits, NO displayed price on luxury).
4. Early-reserver extra benefits mentioned lightly (e.g. extra ₪50 off premium + event benefits) as a
   reason to reserve early.
5. Primary gold CTA button -> https://prizma-optic.co.il/supersale-launch/ ("לצפייה בדגמים ובמחירים").
6. WhatsApp reserve link -> https://wa.me/972533645404 with a short prefilled reserve message (Friday 29.5).
7. Nudge to read the page's שאלות ותשובות (lots of useful info: price commitment, coupon, lab/delivery).
8. Footer + %unsubscribe_url%.

PLACEHOLDERS (use exactly, invent none — Iron Rule 35): %name%, %event_name%, %event_date%,
%event_day_of_week%, %event_time%, %unsubscribe_url%. Landing-page + WhatsApp URLs are static, hardcode.

DESIGN: match the existing Prizma event emails (e.g. read crm_message_templates row
slug='event_registration_open_email_he' for the canon — dark elegant header, single gold #c9a555
family, Rubik/Heebo, RTL, mobile-responsive email-safe TABLE layout, gold CTA button, inline CSS only).
Don't invent a new look. Email-client safe (no external CSS, no flex-only layout).

DELIVER
Write the full HTML to campaigns/supersale/messages/sunday_launch_email.html (create the folder if
needed). Report the path + a 1-paragraph summary. Do NOT create the CRM template or send. Commit the
file by explicit name on develop if you want it tracked, OR just leave it for preview — your call, but
do not touch unrelated files / pre-existing WIP.

STOP-ON-DEVIATION: anything requiring a new placeholder, a DB write, or a send — stop and report.
