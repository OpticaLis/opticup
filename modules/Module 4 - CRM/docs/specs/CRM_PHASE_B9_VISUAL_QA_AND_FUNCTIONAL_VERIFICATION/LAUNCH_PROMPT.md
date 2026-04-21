הרץ את SPEC B9 של מודול CRM — ניסיון שני.

SPEC נמצא כאן:
`modules/Module 4 - CRM/docs/specs/CRM_PHASE_B9_VISUAL_QA_AND_FUNCTIONAL_VERIFICATION/SPEC.md`

ביקורת פורמן של הניסיון הראשון (שנכשל):
`modules/Module 4 - CRM/docs/specs/CRM_PHASE_B9_VISUAL_QA_AND_FUNCTIONAL_VERIFICATION/FOREMAN_REVIEW.md`

תקרא את שניהם לפני שמתחיל. הניסיון הראשון נכשל כי למבצע לא הייתה גישה לדפדפן. **לך יש גישה** — אתה Claude Code על המחשב המקומי.

---

## מה לעשות

### שלב 1 — Pre-flight
1. `git pull origin develop`
2. `node --check` על כל 18 קבצי JS ב-`modules/crm/`
3. בדוק אפס null bytes: `cat crm.html css/crm*.css modules/crm/*.js | tr -cd '\0' | wc -c` → 0

### שלב 2 — בדיקה ויזואלית (העבודה העיקרית)
כתובת: http://localhost:3000/crm.html?t=prizma

מוקאפים מאושרים:
- `campaigns/supersale/mockups/FINAL-01-dashboard.html`
- `campaigns/supersale/mockups/FINAL-02-leads.html`
- `campaigns/supersale/mockups/FINAL-03-events.html`
- `campaigns/supersale/mockups/FINAL-04-messaging.html`
- `campaigns/supersale/mockups/FINAL-05-event-day.html`

לכל מסך (סדר: Dashboard → Leads → Events → Messaging → Event Day):
1. פתח את הטאב ב-http://localhost:3000/crm.html?t=prizma
2. צלם מסך
3. קרא את ה-HTML של המוקאפ המתאים (FINAL-0X)
4. השווה: layout, צבעים, spacing, רכיבים
5. אם יש פערים → תקן את פונקציית ה-render ב-JS המתאים, צלם שוב, וודא התאמה
6. `node --check` אחרי כל שמירת קובץ

**חשוב:** אל תדלג על מסך. אל תסגור את ה-SPEC בלי שכל 5 המסכים נבדקו ותוקנו.

### שלב 3 — בדיקה פונקציונלית
כתובת דמו: http://localhost:3000/crm.html?t=demo

אם לדמו אין דאטה, השתמש ב-`?t=prizma` לבדיקה read-only:
- ניווט בין 5 טאבים
- פתיחת ליד, מעבר בין תצוגות (טבלה/קנבן/כרטיסים)
- פתיחת אירוע, מודל פרטים
- כניסה ליום אירוע
- מסכי הודעות — 4 תתי-טאבים
- 0 שגיאות קונסול

### שלב 4 — סגירה
1. עדכן `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
2. עדכן `modules/Module 4 - CRM/docs/CHANGELOG.md`
3. כתוב `EXECUTION_REPORT.md` ו-`FINDINGS.md` בתיקיית ה-SPEC
4. קומיט ופוש ל-develop

---

## כללים קריטיים
- אל תשנה קבצים מחוץ ל: `crm.html`, `css/crm*.css`, `modules/crm/*.js`, ודוקומנטציה של המודול
- אל תשנה `shared/css/*.css` או `shared/js/*.js`
- אל תעשה שינויי DB
- אם קובץ JS חורג מ-350 שורות → עצור ופצל
- אם יש שגיאות RLS בקונסול → עצור ודווח
