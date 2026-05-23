You are in opticalis/opticup-storefront on branch develop. Three changes to the existing
/supersale-launch/ page (src/pages/supersale-launch/index.astro, latest commit a2de4a4). Full context:
campaigns/supersale/sketches/BRIEF_launch_landing_v7_faq_alternating.md (ERP repo).

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

CHANGES
2. MOVE the taste cue "הצצה מהמבחר - באירוע יחכה לכם הרבה יותר" from under the hero date chip to
   ABOVE the 3 tabs, as a MORE PROMINENT gold line (bigger than 12px, clearly visible gold, centered).
   Remove it from under the chip (no duplicate). Keep AA contrast.
3. FAQ answer rewrite — "אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?":
   "זה תמיד עדיף, אבל לא חובה. אם אתם צריכים משקפי ראייה לרחוק או לקרוב (חד מוקדי) - אפשר לעשות אצלנו
   בדיקת ראייה באירוע המותגים, אנחנו נתאים לכם את עדשות הראייה לפי המרשם ואת המשקפיים המוכנים נשלח לכם
   עד הבית דרך שירות המשלוחים שלנו, בדרך כלל תוך 2-3 ימי עסקים."
   And DELETE the Q "אני גר רחוק מאשקלון - איך זה עובד מבחינת הגעה ומשלוח?" (redundant).
4. FAQ REORDER + ALTERNATING gold/white. Apply gold (.qa-key) to odd positions, white to even — no two
   adjacent the same color, spread across the screen. Final order (gold = positions 1,3,5,7,9,11):
   1 [GOLD] מה מיוחד באירועי המותגים שלכם?
   2 [white] איך עובדים מחירי האירוע?
   3 [GOLD] מה זה "מנגנון התחייבות למחיר הזול בישראל"?
   4 [white] למה יש "דמי שריון מקום" ברוב האירועים?
   5 [GOLD] יש הטבות מעבר למחירי האירוע?
   6 [white] אפשר להגיע בלי להירשם מראש?
   7 [GOLD] אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?
   8 [white] יש גם משקפי ראייה?
   9 [GOLD] יש הטבות גם על העדשות עצמן?
   10 [white] איך עובד 1+1 על משקפי ראייה?
   11 [GOLD] אילו מותגים יהיו באירוע?
   12 [white] למתי האירוע, ואיפה?  (keep last; if total is 12, this even slot stays white — pattern holds)
   Keep the alternating rule for the true final count; ensure no two adjacent same color.

UNCHANGED: cards 56/56/32/32, tabs, sub-toggles, lightbox, pricing, CTA, hero subtitle, takanon link.

RULES: 25/26/27/28/32. File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
5. node scripts/full-test.mjs --no-build (must pass). Build.
6. Confirm: taste-cue above tabs (prominent gold, not under chip); remote answer rewritten; redundant
   Q deleted; FAQ alternating gold/white with no two adjacent same.
7. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
