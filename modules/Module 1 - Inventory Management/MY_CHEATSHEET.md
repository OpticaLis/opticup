# שליף אישי — איך מנהלים פאזות

---

## תחילת פאזה חדשה

### שלב 1 — לקבל ממני (הצ'אט האסטרטגי):
- [ ] קובץ `PHASE_X_SPEC.md`

### שלב 2 — לשמור:
- [ ] שמור את PHASE_X_SPEC ב: `modules/Module 1 - Inventory Management/docs/`

### שלב 3 — לפתוח צ'אט משני חדש:
- [ ] הדבק את התבנית (`SECONDARY_CHAT_TEMPLATE_FINAL.md`)
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
- [ ] db-schema.sql — אם היה שינוי DB

### שלב 2 — הצ'אט המשני נותן לך סיכום

### שלב 3 — להדביק לי (הצ'אט האסטרטגי):
- [ ] את הסיכום שהצ'אט המשני כתב (copy-paste)
- [ ] זה הכל. אני קורא, מתכנן, וכותב PHASE_X+1_SPEC.

---

## תזכורת — מה נמצא איפה

```
modules/Module 1 - Inventory Management/
├── ROADMAP.md                    ← מפת פאזות (✅/⬜)
├── SECONDARY_CHAT_TEMPLATE_FINAL.md  ← תבנית לצ'אט משני
├── MY_CHEATSHEET.md              ← הקובץ הזה
│
└── docs/
    ├── SESSION_CONTEXT.md        ← מצב נוכחי (מתעדכן כל session)
    ├── MODULE_MAP.md             ← מפת קוד מלאה (856 שורות)
    ├── MODULE_SPEC.md            ← מה קיים עכשיו
    ├── CHANGELOG.md              ← היסטוריה
    ├── db-schema.sql             ← DB
    └── PHASE_X_SPEC.md           ← אפיון הפאזה הנוכחית
```

---

## חוק אחד

**לא פותחים פאזה חדשה לפני שחוזרים אליי עם הסיכום.**
