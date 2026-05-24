You are in opticalis/opticup (ERP repo). ONE small copy edit to the Sunday launch email at
campaigns/supersale/messages/sunday_launch_email.html (commit b89736f). Authoring only — no DB write,
no CRM template, no send.

PRE-FLIGHT
1. git branch -> develop. git status -> leave pre-existing WIP untouched; selective add by filename.

CHANGE
2. The early-reserver block — update BOTH the heading and the body:
   Heading (was "אקסטרא לנרשמים מראש") -> "הטבות נוספות לנרשמים מראש"
   Body -> "הטבות נוספות בשווי של מאות שקלים לנרשמים מראש. אקסטרא הנחות על מחירי המותגים מקטגוריית
   ה'פרימיום' + הטבות שוות על עדשות הראייה - רק למי שמשריין מקום מראש!"
   Keep the same block styling/position (dark card, gold eyebrow heading, border). Short hyphen only.

UNCHANGED: everything else (header, hook, event card, "מה יחכה בעמוד", CTAs incl %registration_url%
secondary + landing-page primary, FAQ nudge, sign-off, unsubscribe, design).

RULES: email-safe inline CSS, RTL, no new placeholders. Develop only. No DB write, no send.

DELIVER
3. Overwrite the file. Confirm the new heading + body present, ₪50 still absent, everything else
   unchanged. Commit by explicit name on develop if tracked; don't touch unrelated files.

STOP-ON-DEVIATION: anything needing a new placeholder, DB write, or send — stop and report.
