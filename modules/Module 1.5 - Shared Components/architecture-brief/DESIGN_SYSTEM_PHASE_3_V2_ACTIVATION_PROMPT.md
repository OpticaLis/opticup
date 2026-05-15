טען את `opticup-strategic` (Foreman). אתה כותב SPEC חדש בלבד, לא מבצע אותו.

**הקשר חירום:** Phase 3 v1 של מערכת העיצוב נכשל. ה-Executor יצר 45 קבצי HTML אבל הוא staticized את ה-HTML של production והוסיף 3 קבצי tokens מינימליים (6-7 tokens כל אחד — רק spacing/typography). שלושת ה-"directions" משתפים את אותו color palette, אותו DOM, אותן components. דניאל לא יכול לבחור ביניהם — כי הם נראים זהים בערך 95%.

**הברירף החדש נמצא ב:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_PHASE_3_V2_BRIEF.md`

קרא אותו במלואו, ואז כתוב SPEC יחיד ב:
`modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/SPEC.md`

ה-SPEC חייב לכלול:

1. **§1 Goal:** ייצור 3 שפות עיצוב **שונות לחלוטין** (לא וריאציות) עבור 5 מסכים: Storefront Studio, Permissions, Shipments+Boxes, Settings, Suppliers Debt. כולן רקע בהיר. אין מצב כהה.

2. **§2 Background:** הזכר במפורש את כישלון v1 ולמה הוא נכשל (staticization במקום עיצוב). זה ימנע חזרה על הטעות.

3. **§3 Success Criteria (מדידים):**
   - 21 קבצי HTML חדשים נוצרו (3 שפות × 7 קבצים — 5 מודולים + INDEX + _tokens)
   - מבחן הבחנה ויזואלית: דניאל יכול להבחין בין השפות תוך 2 שניות במבט
   - אין רקעים כהים (כל הצבעים מעל `#f0`)
   - 3 התיקיות הישנות `direction-1/2/3` הועברו ל-`_archive/design-system-mockups-v1-staticized/`
   - כל קובץ HTML עובד עצמאית בדפדפן (אין assets חסרים)
   - Hebrew RTL בכל הקבצים
   - `npm run verify:integrity` exit 0
   - `npm run smoke` 7/7 PASS

4. **§4 Autonomy Envelope (CRITICAL — שונה מ-SPECs רגילים):**
   - **ריצה רצופה אחת בצ'אט קלוד-קוד יחיד.** דניאל אישר שיש 1M token window — אין צורך לפצל.
   - **ה-Executor רץ עד הסוף בלי לעצור.** כל החלטות עיצוב במסגרת ההגדרות של השפות (פלטה/טיפוגרפיה/density) הן שלו. אסור לעצור לשאול את דניאל "איזה כפתור עיגול".
   - **חובה להשתמש ב-Claude Designs**, לא staticization. כל מסך מעוצב מאפס לפי השפה הנבחרת.
   - מותר לעצור רק על: corruption, integrity gate failure, Iron Rule violation, או success criterion שלא ניתן להשגה.

5. **§5 Stop-Triggers (מצומצמים מאוד):**
   - Integrity gate נכשל
   - Iron Rule הפרה (במיוחד 9, 12, 21)
   - אין דרך לעמוד ב-success criterion ספציפי

6. **§6 Out of Scope (חשוב במיוחד):**
   - **M1 Inventory — אסור לגעת.** הדגש זאת.
   - M4 CRM — out לאיטרציה זו
   - M5-M15 — out לאיטרציה זו
   - שינוי במודולי production — out (זה רק mockups)

7. **§7 Expected Final State:**
   - תיקייה חדשה: `architecture-brief/design-system-mockups/language-a-linear/` עם 7 קבצים
   - תיקייה חדשה: `architecture-brief/design-system-mockups/language-b-stripe/` עם 7 קבצים
   - תיקייה חדשה: `architecture-brief/design-system-mockups/language-c-notion/` עם 7 קבצים
   - תיקייה: `_archive/design-system-mockups-v1-staticized/` עם 3 תיקיות הישנות

8. **§8 Commit Plan:**
   - Commit 1: ארכוב v1 ל-`_archive/`
   - Commit 2-4: Language A — tokens + 5 modules + INDEX
   - Commit 5-7: Language B — tokens + 5 modules + INDEX
   - Commit 8-10: Language C — tokens + 5 modules + INDEX
   - Commit 11: docs (CHANGELOG, MODULE_MAP, SESSION_CONTEXT update) + EXECUTION_REPORT + FINDINGS

9. **§9 Anti-Patterns (CRITICAL — להזכיר במפורש):**
   - אסור staticization של HTML production
   - אסור קובץ tokens ריק או כמעט-ריק
   - אסור פלטה דומה בין שפות — כל שפה חייבת פלטה שונה
   - אסור DOM זהה בין שפות — מבנה הניווט יכול להשתנות לפי השפה
   - אסור לעצור באמצע לשאול את דניאל

10. **§10 Reference Files:** Brief at the path above + existing module sketches ב-`modules/Module N - Name/architecture-brief/MN_SKETCHES.html` כשרלוונטי (לצורך מבנה המידע, לא לעיצוב).

**מה אתה לא עושה:**
- אל תפעיל את ה-Executor
- אל תכתוב activation prompt לדניאל
- אל תפצל לסאב-SPECs
- אל תוסיף phases — זה SPEC אחד, ריצה אחת

**מה אתה עושה אחרי שה-SPEC כתוב:**
- Commit את ה-SPEC ל-develop
- חזור לדניאל ב-Cowork עם הודעה בעברית בת שורה אחת: "SPEC v2 מוכן ב-{path}. דניאל יפעיל Executor בצ'אט קלוד-קוד טרי."

התחל. השתמש בכל הזמן שצריך לכתיבת SPEC טוב. זה ה-SPEC היחיד שייכתב בסשן הזה, אז אין מגבלת זמן.
