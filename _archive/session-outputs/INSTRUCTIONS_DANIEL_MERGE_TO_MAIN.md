# הוראות עבור דניאל — Merge develop → main

> מסמך זה מסביר איך לבצע את ה-merge ידנית. זמן משוער: 5-10 דקות.
> **חשוב:** רק אתה יכול לאשר ולבצע את ה-merge ל-main. שום סוכן AI לא יבצע את זה במקומך, גם לא קלאוד קוד.

---

## רקע קצר

מודול 4 (CRM) סגור על develop. כל ה-build phases הסתיימו. ה-QA המקדים הסתיים נקי. שני התיקונים האחרונים (HIGH-1 + HIGH-2) ירדו והכל מאומת. זה הזמן להעביר את הקוד ל-main כך שייכנס לשרת הייצור (https://app.opticalis.co.il).

הקומיט האחרון על develop: `f7ca532` (FOREMAN_REVIEW for M4_PRE_MERGE_HIGH_FIXES).

לפני ה-merge בפועל יהיה עוד קומיט אחד שקלאוד קוד יוסיף — עדכון `SESSION_CONTEXT.md`. אחרי שזה יורד, תפעיל את הצעדים למטה.

---

## סדר הצעדים — שלב-שלב

### שלב 1 — פתיחת טרמינל בתיקיית הריפו

1. פתח טרמינל ב-Windows (PowerShell או Git Bash).
2. נווט לתיקיית הפרויקט:
   ```
   cd C:\Users\User\opticup
   ```

### שלב 2 — אימות שאתה על develop ועדכני

```
git status
git branch
```

**אמור להציג:**
- Branch: `develop` (כוכבית * ליד develop)
- ייתכנו 3 קבצי `docs/guardian/*` modified — לא נוגעים בהם (Sentinel autorestores אותם).

```
git pull origin develop
```

אמור להחזיר `Already up to date.` (כי הסשן הנוכחי שלנו דחף לשרת את כל מה שהיה).

### שלב 3 — בדיקה אחרונה — שום דבר חשוב לא pending

```
git log --oneline origin/main..origin/develop | head -20
```

זה מציג את כל הקומיטים שעוברים ב-merge. אמור לראות שורות כמו:
- `f7ca532 docs(spec): FOREMAN_REVIEW for M4_PRE_MERGE_HIGH_FIXES`
- `4cce9d8 chore(spec): retroactively close M4_PRE_MERGE_HIGH_FIXES`
- `0d7f4f5 fix(crm): add 0507168471 to phone allowlist`
- `c190751 fix(crm): activity log selects employees.name`
- ... ועוד

**אם אתה רואה משהו שאתה לא מזהה — STOP. אל תמשיך לפני שתבין.** תחזור לצ'אט עם רשימת הקומיטים, ואני אעבור איתך עליהם.

### שלב 4 — ביצוע ה-merge

זה רצף 4 פקודות. **תריץ אחת-אחת**, ובדוק שכל אחת מסתיימת ללא שגיאה לפני שתעבור לבאה.

```
git checkout main
```
**צפוי:** `Switched to branch 'main'`. אם רואה שגיאה כמו "uncommitted changes" — STOP, חזור לצ'אט.

```
git pull origin main
```
**צפוי:** `Already up to date.` או fast-forward של מה ש-main קיבלה בייצור. אם conflicts — STOP.

```
git merge develop
```
**צפוי:** הודעה כמו `Updating xxxxxxx..f7ca532` ואז `Fast-forward` או merge commit. **אם conflicts — STOP, חזור לצ'אט.**

```
git push origin main
```
**צפוי:** `xxxxxxx..f7ca532  main -> main`.

### שלב 5 — חזרה ל-develop

```
git checkout develop
```

**צפוי:** `Switched to branch 'develop'`.

זהו. ה-merge הושלם.

### שלב 6 — אימות ב-GitHub Actions

1. נווט בדפדפן ל: https://github.com/opticalis/opticup/actions
2. אמור להופיע build חדש שרץ על main (CI deployment ל-GitHub Pages).
3. חכה ~2-3 דקות עד שהוא יסתיים בירוק (✅).
4. אם הוא נכשל (❌) — חזור לצ'אט עם הלוג של ה-failure.

### שלב 7 — אימות שהאתר בייצור עודכן

1. נווט בדפדפן ל: https://app.opticalis.co.il/crm.html?t=demo
2. **Hard refresh** (`Ctrl+Shift+R`).
3. ודא שהטאב "📈 קמפיינים" מופיע בסיידבר.
4. ודא שהוא מציג את 7 הקמפיינים האמיתיים מ-Make.

אם הכל תקין — **אנחנו על main בייצור.** מודול 4 פעיל.

---

## אחרי ה-merge — הצעדים הבאים

חזור לצ'אט ותגיד "Merged successfully, אישרתי על main". אז:

1. **הזמנת האחראי על אירועים לטסטים על פריזמה.** הוא יבדוק את הflows (לידים, אירועים, רישום, וכו').
2. **תיקונים** לפי מה שיגלה.
3. **SPECs נפרדים** ל-:
   - HIGH-3: SECURITY DEFINER views audit.
   - HIGH-4: STOREFRONT_ORIGIN per-tenant (תנאי מקדים ל-P7).
   - MED-1 + MED-2: Tab heading binding (יחד).
   - LOW findings — לפי עדיפות.
4. **ייבוא היסטורי** (לקמפיינים + לקוחות מ-Monday לפריזמה).
5. **P7 cutover** — שינוי `tenant_slug` ב-Make scenario מ-`demo` ל-`prizma`.

---

## אם משהו השתבש

### "git merge נכשל עם conflicts"
- אל תיגע בקבצים. **חזור לצ'אט מיידית** עם:
  - הפלט המלא של `git status`.
  - שמות הקבצים בקונפליקט.
- אני אנחה אותך איך לפתור.

### "git push נדחה"
- ייתכן שמישהו דחף ל-main בינתיים. הרץ `git pull origin main`, ואז `git push origin main` שוב.
- אם זה לא עוזר — חזור לצ'אט.

### "הbuild ב-GitHub Actions נכשל"
- חזור לצ'אט עם הלינק ל-failure run.
- בינתיים: אתה יכול לבטל את ה-merge ב-`git revert <merge_commit>` ואז `git push origin main`. אבל **אל תעשה את זה בלי לדבר איתי קודם**.

### "האתר בייצור לא עודכן אחרי 5 דקות"
- בדוק את GitHub Pages settings: https://github.com/opticalis/opticup/settings/pages
- אם הכל בסדר שם — חכה עוד 2-3 דקות (Cloudflare cache).
- אם עדיין לא — חזור לצ'אט.

---

## אבטחה

- ה-merge עצמו לא חושף שום secret. כל ה-secrets יושבים ב-Supabase env (לא בקוד שמועבר).
- הקוד ב-main נגיש לכל מי שיש לו גישת קריאה לריפו (כמו develop) — אין שינוי בנגישות.
- האתר בייצור (https://app.opticalis.co.il) משתמש באותם מפתחות `MAKE_SECRET` שהגדרת קודם.

---

*סוף הוראות. הצלחה!*
