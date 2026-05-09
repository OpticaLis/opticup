# פרומפט הפעלה — תיקון 2 ה-HIGH findings מ-QA

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

## רקע

QA נסגר ב-`M4_PRE_MERGE_QA` (commit cef5618). אין CRITICAL findings. שני HIGH findings צריכים תיקון לפני merge ל-main:

1. **HIGH-1:** `crm-activity-log.js:81` בוחר `full_name` מטבלת `employees` — אבל העמודה האמיתית נקראת `name`. כתוצאה: כל שורה בלוג הפעילות מציגה UUID prefix במקום שם העובד.

2. **HIGH-2:** מספר הטלפון `0507168471` חסר ברשימה הלבנה של 2 Edge Functions — `send-message` ו-`dispatch-queue` (כרגע יש שם רק `["0537889878", "0503348349"]`).

שני ה-HIGH הנוספים (3+4) נשארים כחוב מתועד.

## משימה

### שלב 1 — תיקון HIGH-1

ערוך `modules/crm/crm-activity-log.js`. בשורה 81 (בערך) — מצא את ה-SELECT שבוחר מ-`employees` table. החלף `full_name` ל-`name`.

ודא שאין עוד מקומות בקובץ שמשתמשים ב-`full_name` בהקשר של employees.

### שלב 2 — תיקון HIGH-2

ערוך 2 קבצים:

1. `supabase/functions/send-message/index.ts` — מצא את ההגדרה `["0537889878", "0503348349"]` (allowlist של מספרי טלפון). הוסף `"0507168471"` לרשימה.

2. `supabase/functions/dispatch-queue/index.ts` — אותו דבר.

### שלב 3 — דפלוי ה-EFs המעודכנים

```
supabase functions deploy send-message
supabase functions deploy dispatch-queue
```

או דרך MCP. אם MCP נכשל — fallback ל-CLI (כפי שעשינו עם facebook-campaigns-sync).

### שלב 4 — אימות

1. Activity Log:
   - פתח `http://localhost:3000` בדפדפן (chrome-devtools MCP), היכנס לדמו → CRM → לוג פעילות.
   - ודא ששמות עובדים מופיעים נכון (לא UUID prefix).
   - אם אין נתונים — בצע פעולה אחת ב-CRM (שינוי סטטוס ליד) ואז רענן את הלוג.

2. Phone allowlist:
   - curl test — נסה לשלוח SMS ל-`0507168471` דרך `send-message` EF.
   - אמור להחזיר 200, לא 403/blocked.

### שלב 5 — Commits

2 commits נפרדים:

**Commit 1:**
```
git add modules/crm/crm-activity-log.js
git commit -m "fix(crm): activity log selects employees.name (was: full_name) — HIGH-1 from M4_PRE_MERGE_QA"
git push origin develop
```

**Commit 2:**
```
git add supabase/functions/send-message/index.ts supabase/functions/dispatch-queue/index.ts
git commit -m "fix(crm): add 0507168471 to phone allowlist in send-message + dispatch-queue — HIGH-2 from M4_PRE_MERGE_QA"
git push origin develop
```

### שלב 6 — דיווח

דווח חזרה בעברית קצרה:
- Hash של 2 הקומיטים.
- האם 2 ה-EFs נדפלוי בהצלחה.
- האם Activity Log מציג עכשיו שמות עובדים נכון.
- האם ה-curl test ל-`0507168471` החזיר 200.

## עצור על

- אם בקובץ של Activity Log יש יותר ממקום אחד עם `full_name` בהקשר של employees — דווח לפני שמתקן הכל. ייתכן שיש עקרון.
- אם 2 ה-EFs לא מסכימים על המבנה של ה-allowlist (אחד עם array, השני עם const string) — דווח.
- אם curl נכשל אחרי deploy — בדוק logs של ה-EF.

---

*End of prompt.*
