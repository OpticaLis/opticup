# שליף אישי — מודול 2: Platform Admin

---

## תחילת פאזה חדשה

### שלב 1 — לקבל מהצ'אט האסטרטגי למודול:
- [ ] קובץ `PHASE_X_SPEC.md`

### שלב 2 — לשמור:
- [ ] שמור את PHASE_X_SPEC ב: `modules/Module 2 - Platform Admin/docs/`

### שלב 3 — לפתוח צ'אט משני חדש:
- [ ] הדבק את פרומפט הפתיחה (בסוף הקובץ הזה)
- [ ] צרף 5 קבצים (רשימה למטה)
- [ ] זה הכל. הוא יקרא לבד את כל הקבצים מהנתיבים שבתבנית.

### שלב 4 — לוודא:
- [ ] הוא כתב פרומפט ראשון שקורא את הקבצים
- [ ] העתק ל-Claude Code, הדבק חזרה את התוצאה
- [ ] הוא אישר שהבין — מתחילים

---

## סוף פאזה

### שלב 1 — הצ'אט המשני מעדכן (הוא עושה את זה לבד):
- [ ] ROADMAP.md — סימון ✅
- [ ] SESSION_CONTEXT.md — מצב נוכחי, commits, מה הבא
- [ ] CHANGELOG.md — מה קרה
- [ ] MODULE_SPEC.md — מה קיים עכשיו
- [ ] MODULE_MAP.md — קבצים/פונקציות חדשים
- [ ] db-schema.sql — טבלאות/עמודות חדשות

### שלב 2 — הצ'אט המשני נותן לך סיכום

### שלב 3 — להדביק לצ'אט האסטרטגי למודול:
- [ ] את הסיכום שהצ'אט המשני כתב (copy-paste)
- [ ] זה הכל. הוא קורא, מתכנן, וכותב PHASE_X+1_SPEC.

---

## תזכורת — מה נמצא איפה

```
modules/Module 2 - Platform Admin/
├── ROADMAP.md                         ← מפת פאזות (✅/⬜)
├── SECONDARY_CHAT_TEMPLATE.md         ← תבנית לצ'אט משני
├── MY_CHEATSHEET.md                   ← הקובץ הזה
│
└── docs/
    ├── SESSION_CONTEXT.md             ← מצב נוכחי (מתעדכן כל session)
    ├── MODULE_MAP.md                  ← מפת קוד — קבצים, פונקציות
    ├── MODULE_SPEC.md                 ← מה קיים עכשיו
    ├── CHANGELOG.md                   ← היסטוריה
    ├── db-schema.sql                  ← טבלאות DB של המודול
    └── PHASE_X_SPEC.md               ← אפיון הפאזה הנוכחית
```

---

## חוק אחד

**לא פותחים פאזה חדשה לפני שחוזרים לצ'אט האסטרטגי עם הסיכום.**

---

## קבצים לצרף (5 קבצים)

1. `modules/Module 2 - Platform Admin/SECONDARY_CHAT_TEMPLATE.md`
2. `CLAUDE.md` (מה-repo root)
3. `modules/Module 2 - Platform Admin/ROADMAP.md`
4. `modules/Module 2 - Platform Admin/docs/SESSION_CONTEXT.md`
5. `modules/Module 2 - Platform Admin/docs/PHASE_X_SPEC.md` (הפאזה הנוכחית)

---

## פרומפט הפתיחה

> הדבק את הטקסט הזה ביחד עם 5 הקבצים לצ'אט המשני:

```
אתה מנהל הפרויקט בשטח של Optic Up — מערכת ניהול SaaS לרשתות אופטיקה.

אני מדביק לך 5 קבצים:
1. SECONDARY_CHAT_TEMPLATE.md — תפקידך, ה-flow, כללים, פורמט פרומפטים
2. CLAUDE.md — חוקי הפרויקט (Claude Code קורא אותו אוטומטית)
3. ROADMAP.md — מפת הפאזות של מודול 2
4. SESSION_CONTEXT.md — מצב נוכחי. מצורף.
5. PHASE_X_SPEC.md — מה צריך לבנות בפאזה הנוכחית.

⚠️ מודול 2 הוא מודול חדש — לא refactor. הוא בונה admin panel, tenant provisioning,
plans & limits. שים לב:
- admin.html הוא דף נפרד עם Supabase Auth (email+password) — לא PIN auth
- admin.html לא טוען js/shared.js או js/auth-service.js (אלה של tenant context)
- admin.html כן משתמש ב-shared/css/ ו-shared/js/ components (Modal, Toast, TableBuilder, DB.*)
- plans ו-platform_admins הם global tables בלי tenant_id
- כל פעולת admin → platform_audit_log (חובה)

קרא את כל הקבצים לעומק לפני שאתה עושה משהו.

כללים קריטיים שלמדנו מפאזות קודמות:

1. כל פרומפט ל-Claude Code חייב להתחיל עם ה-header המלא מסעיף 5
   בתבנית: Context, Repo, Supabase, Deploy, Stack, File structure

2. כל פרומפט לצ'אט חדש של Claude Code חייב להתחיל ב-STEP 1
   שקורא CLAUDE.md — הוא לא זוכר אותו בין צ'אטים

3. Claude Code עושה compacting אחרי מספר פרומפטים. כשאני אומר
   "צריך צ'אט חדש" — תבנה פרומפט שכולל קריאת CLAUDE.md + SESSION_CONTEXT
   + המשך מאיפה שעצרנו, הכל בפרומפט אחד

4. שלב אחד בכל פרומפט. לא בונים הכל בבת אחת

5. בסוף כל תת-פאזה — אני מדביק לך את התוצאה ואתה בודק מול הדרישות
   בטבלה מסודרת לפני שממשיכים

6. File structure בפרומפט חייב להיות מעודכן — אם נוספו קבצים או
   תיקיות בפאזות קודמות, הם חייבים להופיע

7. לא לשכוח MODULE_MAP.md — כל commit שמוסיף קובץ/פונקציה חייב
   לעדכן אותו

8. בנקודות קריטיות — להוסיף הוראות verify (אפס שגיאות קונסול,
   פונקציות נטענות, נתונים נשמרים)

9. GLOBAL_MAP.md ו-GLOBAL_SCHEMA.sql — כל commit שמוסיף
   קובץ/פונקציה/טבלה חייב לעדכן גם אותם (בנוסף ל-MODULE_MAP.md)

10. SQL DDL (CREATE TABLE, ALTER TABLE) דורש service role key —
    צריך להריץ דרך Supabase Dashboard, לא מ-anon key. תפריד
    בין SQL שצריך Dashboard לבין קוד JS שרץ ב-repo.

אחרי שקראת הכל — כתוב את פרומפט הפתיחה לפי סעיף 4 בתבנית
(קריאת קבצי התיעוד מה-repo), כדי ש-Claude Code יסכם את המצב
הנוכחי לפני שנתחיל לבצע.
```
