טען את `opticup-strategic` (Foreman). אתה כותב SPEC חדש בלבד, לא מבצע אותו.

**הקשר:** דניאל סקר את שלוש השפות מ-v2 (Linear/Stripe/Notion). הוא בחר ב-Stripe (B) כבסיס, ביקש שתי התאמות ספציפיות מ-Linear (A), והחליף את צבע ה-accent מסגול לכחול-נייבי.

**ה-Brief נמצא ב:**
`modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_HYBRID_BRIEF.md`

קרא אותו במלואו, ואז כתוב SPEC יחיד ב:
`modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/SPEC.md`

ה-SPEC חייב:

1. **§1 Goal:** ייצור הגרסה הסופית של שפת העיצוב — Hybrid — שלוקחת את ה-structure מ-Language B (Stripe) ואת ה-navigation pattern מ-Language A (Linear), עם פלטת Navy Blue.

2. **§2 Background:** הזכר במפורש את שתי הגרסאות הקודמות (v1 staticized = נכשל; v2 שלוש שפות = הצליח אבל בחירה דרשה האחדה). הסבר למה זה SPEC יחיד ולא 3.

3. **§3 Success Criteria (מדידים) — 13 קריטריונים:**
   - 7 קבצים חדשים נוצרו תחת `architecture-brief/design-system-mockups/hybrid-final/`
   - Sidebar קיים בכל המסכים (חיפוש `class="sidebar"` ב-grep — חייב להיות בכל 5 ה-HTMLs)
   - Hero block קיים בכל המסכים (חיפוש `class="hero"`)
   - Metrics row של 4 cards בכל מסך
   - אין violet בשום מקום (`grep -i "635bff\|violet\|purple" *.html *.css` = 0 matches)
   - אין serif בשום מקום (`grep -i "Source Serif" *.html *.css` = 0 matches; `font-serif` ב-tokens מותר רק כ-fallback)
   - 1080p viewport מציג 6+ שורות data בטבלאות בלי גלילה
   - Real data: Luxottica, Safilo, Marcolin, Hoya, Carl Zeiss Vision, Optical Frame Israel
   - Hebrew RTL בכל הקבצים
   - `_tokens.css` מכיל `--accent: #1e3a8a` ו-`--accent-soft: #e6f1fb`
   - `_tokens.css` לא מכיל `#635bff` או `#a78bfa` או שום נגזרת של violet
   - `npm run verify:integrity` exit 0
   - `npm run smoke` 7/7 PASS

4. **§4 Autonomy Envelope — Continuous-Run Mandate (CRITICAL):**
   - ריצה רצופה אחת בצ'אט קלוד-קוד יחיד, אין צורך לפצל
   - ה-Executor מחליט בעצמו על כל פרטי העיצוב במסגרת ההגדרות
   - אסור לעצור לשאול את דניאל "איזה כפתור", "איזה padding"
   - **חובה להשתמש ב-Claude Designs**, לא staticization של HTML production
   - מותר להשתמש ב-v2-B (Stripe) כ-structural reference ולכתוב מחדש עם palette + sidebar חדש

5. **§5 Stop-Triggers (מצומצמים):**
   - Integrity gate נכשל
   - Iron Rule violation
   - Success criterion שלא ניתן להשגה

6. **§6 Out of Scope:**
   - **אין לעדכן production HTML.** רק mockups חדשים.
   - אין לגעת ב-3 התיקיות הישנות (`language-a-linear/`, `language-b-stripe/`, `language-c-notion/`) — נשארות כ-reference.
   - אין מודולים נוספים — רק 5 המסכים מהבריף.

7. **§7 Expected Final State:**
   - תיקייה חדשה: `architecture-brief/design-system-mockups/hybrid-final/`
   - 7 קבצים בתוכה: `INDEX.html`, `_tokens.css`, ו-5 מסכים
   - 3 התיקיות הקודמות (`language-a/b/c`) ללא שינוי
   - SESSION_CONTEXT + MODULE_MAP + CHANGELOG מעודכנים

8. **§8 Commit Plan:**
   - Commit 1: scaffold (`_tokens.css` עם Navy palette + `INDEX.html` עם tab nav)
   - Commit 2: 5 module HTMLs
   - Commit 3: docs (SESSION_CONTEXT/MODULE_MAP/CHANGELOG) + EXECUTION_REPORT + FINDINGS

9. **§9 Anti-Patterns (חייב להזכיר במפורש):**
   - אסור violet — אפילו לא כצבע משני
   - אסור serif — אפילו לא לכותרות
   - אסור topbar — sidebar בלבד
   - אסור gradients ברקעי metric cards — solid bg + accent bar בלבד
   - אסור staticization — Claude Designs בלבד
   - אסור לעצור באמצע

10. **§10 Reference Files:**
   - `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_HYBRID_BRIEF.md` (ה-brief)
   - `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-b-stripe/*.html` (structural reference — להעתיק מבנה, לא צבעים/פונטים)
   - `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-a-linear/*.html` (sidebar pattern reference)

**מה אתה עושה אחרי כתיבת ה-SPEC:**
- Commit את ה-SPEC ל-develop
- חזור לדניאל ב-Cowork עם הודעה: "SPEC Hybrid Final מוכן. דניאל יפעיל Executor בצ'אט קלוד-קוד טרי."

**מה אתה לא עושה:**
- אל תפעיל את ה-Executor
- אל תפצל לסאב-SPECs
- אל תוסיף phases

התחל.
