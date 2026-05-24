You are in opticalis/opticup (ERP repo). Two edits to the Sunday launch email HTML you authored at
campaigns/supersale/messages/sunday_launch_email.html (commit b2919ea). Authoring only — do NOT write
to the DB, do NOT create a CRM template, do NOT send.

PRE-FLIGHT
1. git branch -> develop. git status -> leave pre-existing WIP untouched; selective add by filename.

CHANGES
2. Replace the "אקסטרא לנרשמים מראש" block (the one mentioning the specific ₪50 off premium) with a
   MORE GENERAL block. Keep the same visual style/position, but change the copy to convey that early
   reservers get extra benefits worth HUNDREDS of shekels — without naming the specific ₪50 figure
   (the ₪50 specific lives on the landing page itself). Suggested copy (refine for quality, premium,
   not salesy):
   Heading: "אקסטרא לנרשמים מראש"
   Body: "מי שמשריין מקום מראש נהנה מהטבות נוספות בשווי מאות שקלים, מעבר למחירי האירוע - על מגוון
   מהמותגים המשתתפים. הקופון האישי נשמר על שמכם ומחכה בקופה."
3. CTA buttons — the email goes out per-lead through the CRM, so use the personal registration link.
   Final two buttons, in this order:
   - PRIMARY (gold, large): "לצפייה בדגמים ובמחירים" -> https://prizma-optic.co.il/supersale-launch/  (keep as is)
   - SECONDARY (outline): change from the WhatsApp link to "לשריון מקום באירוע" -> %registration_url%
     (the per-lead personal registration link; this placeholder is already used in event_invite_new /
     event_registration_open templates, so it resolves correctly). Remove the wa.me WhatsApp button.
   %registration_url% is an approved existing placeholder (Iron Rule 35 OK).

UNCHANGED: header, hook, event-details card, "מה יחכה בעמוד" block (בתי אופנה + יוקרה), FAQ nudge,
sign-off, unsubscribe, design canon. Only the early-reserver block copy + the secondary CTA change.

RULES: email-client safe (inline CSS, table layout), RTL, short hyphen only, no new placeholders
beyond the approved set (%name%, %event_name%, %event_date%, %event_day_of_week%, %event_time%,
%registration_url%, %unsubscribe_url%). Develop only. No DB write, no send.

DELIVER
4. Overwrite campaigns/supersale/messages/sunday_launch_email.html. Report the path + confirm:
   general benefits block (no specific ₪50), secondary CTA now %registration_url% (no wa.me),
   primary CTA still the landing page. Commit by explicit name on develop if tracked; don't touch
   unrelated files.

STOP-ON-DEVIATION: anything needing a new placeholder, DB write, or send — stop and report.
