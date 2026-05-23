You are in opticalis/opticup-storefront on branch develop. Three fixes to the existing /supersale-launch/
page (src/pages/supersale-launch/index.astro, latest commit 1dcf40d). Full context:
campaigns/supersale/sketches/BRIEF_launch_landing_v6_remote_fix.md (ERP repo).

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

FIXES
2. FACTUAL FIX — rewrite BOTH "remote/lab" FAQ answers. At the brand events we do NOT do framing on
   the spot; instead: eye exam can be done AT the event, finished glasses delivered to the customer's
   HOME (~2-3 days). Customer does NOT leave the event with the glasses. New verbatim:
   Q "אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?"
   A "לא צריך. אם דרושים לכם משקפי ראייה - אפשר לעשות אצלנו בדיקת ראייה כבר באירוע, ואת המשקפיים
   המוכנים נשלח לכם עד הבית דרך שירות המשלוחים שלנו, בדרך כלל תוך 2-3 ימים. כך שגם אם הגעתם מרחוק,
   אתם לא צריכים לחזור שוב."
   Q "אני גר רחוק מאשקלון - איך זה עובד מבחינת הגעה ומשלוח?"
   A "פשוט מאוד. מגיעים לאירוע בסניף הרצל 32 אשקלון, בוחרים, ואם צריך - עושים בדיקת ראייה במקום. את
   המשקפיים המוכנים נשלח אליכם עד הבית דרך שירות המשלוחים שלנו (בדרך כלל תוך 2-3 ימים). נציג יתאם את
   הפרטים והעלות לפי היעד."
3. LINK FIX — inside the "מה מיוחד באירועי המותגים שלכם?" answer, make "בכפוף לתקנון" a link to
   /supersale-takanon/ (match the hero pledge's existing takanon link styling).
4. "TASTE" cue near the TOP — subtle, do NOT add bulk (hero already has subtitle + chip). Weave a
   small muted micro-line into the hero area (e.g. tiny text near the date chip), suggested copy
   "הצצה מהמבחר - באירוע יחכה לכם הרבה יותר". Your call on cleanest placement; keep it light, no new block.

UNCHANGED: tabs, cards 56/56/32/32, sub-toggles, lightbox, gold-highlight FAQ, pricing, CTA, subtitle.

RULES: 25/26/27/28/32. File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
5. node scripts/full-test.mjs --no-build (must pass). Build.
6. Confirm: both remote answers rewritten (no "15-90 min in-store"); takanon link in brand-event
   answer; subtle taste-cue near top.
7. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
