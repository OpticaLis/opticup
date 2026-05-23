# BRIEF — SuperSale launch v7: taste-cue above tabs + alternating-gold FAQ reorder

**Author:** Events-Operations (Cowork) · **For:** Claude Code in opticup-storefront · 2026-05-22
**Companion:** ACTIVATION_PROMPT_launch_landing_v7_faq_alternating.md
**Edits:** existing /supersale-launch/ (index.astro), latest commit a2de4a4 on develop.

---

## 1. Move the "taste" cue ABOVE the tabs, bolder gold
Currently the micro-line "הצצה מהמבחר - באירוע יחכה לכם הרבה יותר" sits under the hero date chip.
MOVE it to ABOVE the 3 tabs (בתי אופנה נבחרים / קולקציות יוקרה / שאלות ותשובות), as a more
PROMINENT gold line (bigger than the current 12px micro-text; clearly visible gold, centered).
Reason: customers must clearly understand the page is only a sample, not the full event inventory.
Remove it from under the date chip (don't duplicate). Keep AA contrast.

## 2. FAQ — rewrite one answer, delete one Q
(a) Rewrite the answer to "אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?":
    "זה תמיד עדיף, אבל לא חובה. אם אתם צריכים משקפי ראייה לרחוק או לקרוב (חד מוקדי) - אפשר לעשות אצלנו
    בדיקת ראייה באירוע המותגים, אנחנו נתאים לכם את עדשות הראייה לפי המרשם ואת המשקפיים המוכנים נשלח
    לכם עד הבית דרך שירות המשלוחים שלנו, בדרך כלל תוך 2-3 ימי עסקים."
(b) DELETE entirely the Q "אני גר רחוק מאשקלון - איך זה עובד מבחינת הגעה ומשלוח?" (redundant with (a)).

## 3. FAQ — reorder to ALTERNATING gold/white (gold, white, gold, white, ...)
Apply the gold-highlight (.qa-key) to EVERY OTHER question — odd positions gold, even positions white
(1 gold, 2 white, 3 gold, 4 white, ...). This spreads the gold across the screen (more attractive than
clustering) and makes the most important questions pop.

**Final order (after deleting the redundant Q — 11 questions total). Positions 1,3,5,7,9,11 = GOLD;
2,4,6,8,10 = white.** I (Events-Ops) chose which questions are most customer-important for the gold slots:

1. **[GOLD]** מה מיוחד באירועי המותגים שלכם?  (the killer differentiator — lead with it)
2. [white] איך עובדים מחירי האירוע?
3. **[GOLD]** מה זה "מנגנון התחייבות למחיר הזול בישראל"?  (price commitment)
4. [white] למה יש "דמי שריון מקום" ברוב האירועים?
5. **[GOLD]** יש הטבות מעבר למחירי האירוע?  (extra benefits — pulls them in)
6. [white] אפשר להגיע בלי להירשם מראש?
7. **[GOLD]** אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?  (lab/delivery)
8. [white] יש גם משקפי ראייה?
9. **[GOLD]** יש הטבות גם על העדשות עצמן?  (lens benefits — strong pull)
10. [white] איך עובד 1+1 על משקפי ראייה?
11. **[GOLD]** אילו מותגים יהיו באירוע?  (brand list — aspirational)
   (then "למתי האירוע, ואיפה?" — if it remains, keep it last as position 12 white; the alternating
   rule applies to whatever the true final count is. Goal: alternate gold/white, no two same in a row.)

If the true question count differs slightly, keep the ALTERNATING pattern (no two adjacent same color)
and ensure the 3 originally-chosen gold Qs (price-commitment, lab/remote, brand-uniqueness) all land on
gold positions.

## Unchanged
Cards, tabs, sub-toggles, lightbox, pricing, CTA, hero subtitle, takanon link.

## Constraints
Iron Rules 25/26/27/28/32 (gold keeps AA). File ≤350 (currently 332). Develop only, preview only.
full-test must pass. Pre-existing WIP untouched.

## Deliverables + verify
- taste-cue above tabs, prominent gold, removed from under chip.
- remote answer rewritten; redundant Q deleted.
- FAQ alternating gold/white, no two adjacent same color; the 3 key Qs on gold.
- full-test passes; build clean; push develop; report commit SHA (I fetch preview). Clean git status.

## Stop-on-deviation
Build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
