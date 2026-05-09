# הוראות עבור דניאל — הגדרת MAKE_SECRET ב-Supabase

> מסמך זה מסביר שלב-שלב מה לעשות אחרי שקלוד קוד מייצר את ה-secret וכותב אותו לקובץ.
> זמן משוער: 3-5 דקות.

---

## רקע קצר

קלוד קוד ייצר ערך חדש ל-secret ושמר אותו בקובץ אצלך במחשב. עכשיו אתה צריך לקחת את הערך הזה ולהכניס אותו לאחד משני מקומות ב-Supabase כדי שה-Edge Function החדש יוכל לקרוא אותו ממשתנה סביבה במקום מקוד מקומי.

הקובץ נמצא כאן:
```
~/.optic-up/make-secret.txt
```
על ה-Mac זה `/Users/danielsmac/.optic-up/make-secret.txt`. על Windows זה בתיקייה ביתית של המשתמש שלך.

הקובץ מחוץ לריפו של הפרויקט, מוגן בהרשאות 600 (רק אתה יכול לקרוא), ולא נכנס ל-git לעולם.

---

## שתי דרכים — בחר את הנוחה לך

### דרך 1 — Supabase Dashboard (מומלצת, הכי פשוטה)

#### שלב 1.1 — פתיחת הדאשבורד
1. היכנס ל: https://supabase.com/dashboard/project/tsxrrxzmdxaenlvocyit
2. אם תתבקש להתחבר — התחבר עם החשבון שלך.

#### שלב 1.2 — ניווט ל-Edge Functions
1. בתפריט הצדדי השמאלי, מצא את **Edge Functions** (סמל של `</>` או "Functions"). לחץ.
2. אתה אמור לראות רשימה של Edge Functions, ביניהם `facebook-campaigns-sync`.

#### שלב 1.3 — מעבר לניהול secrets
1. בעמוד ה-Edge Functions, חפש בצדדים או למעלה כפתור **"Manage secrets"** או **"Secrets"** או טאב בשם **Secrets**.
   - בגרסאות חדשות יותר של Supabase Dashboard זה לפעמים תחת **Project Settings → Edge Functions → Secrets**.
2. לחץ עליו.

#### שלב 1.4 — פתיחת הקובץ עם הערך
1. פתח טרמינל (Terminal על Mac, או cmd/PowerShell על Windows).
2. הקלד:
   ```bash
   cat ~/.optic-up/make-secret.txt
   ```
   (על Windows: `type C:\Users\User\.optic-up\make-secret.txt`)
3. הטרמינל יציג את הערך — מחרוזת שמתחילה ב-`fbsync_` באורך 71 תווים.
4. **סמן את כל המחרוזת** (מ-`f` של `fbsync_` עד התו האחרון) והעתק (`Cmd+C` / `Ctrl+C`).

#### שלב 1.5 — הוספת ה-secret
1. בדאשבורד, לחץ **"Add new secret"** או **"+ New secret"**.
2. בשדה **Name** (השם): הקלד בדיוק:
   ```
   MAKE_SECRET
   ```
   (אותיות גדולות, עם קו תחתון. בדיוק ככה. בלי רווחים.)
3. בשדה **Value** (הערך): הדבק את הערך שהעתקת.
4. לחץ **"Save"** או **"Add secret"**.
5. אתה אמור לראות את `MAKE_SECRET` ברשימת ה-secrets, עם הערך מוסתר (כוכביות).

#### שלב 1.6 — אימות
ברשימת ה-secrets — `MAKE_SECRET` צריך להופיע. אם הוא שם — סיימת. **אל תפעיל deploy מהדאשבורד** — קלוד קוד ידאג לזה בשלב הבא.

---

### דרך 2 — Supabase CLI (אם נוח לך עם טרמינל)

#### דרישות מקדימות
- Supabase CLI מותקן (`supabase --version` עובד).
- אתה מחובר (`supabase login` נעשה בעבר).

#### שלב 2.1 — קריאת הערך
```bash
SECRET_VALUE=$(cat ~/.optic-up/make-secret.txt)
```

#### שלב 2.2 — הגדרת ה-secret
```bash
supabase secrets set MAKE_SECRET="$SECRET_VALUE" --project-ref tsxrrxzmdxaenlvocyit
```

הפלט אמור להיות שורה כמו:
```
Setting secret: MAKE_SECRET
✓ Set secret: MAKE_SECRET
```

#### שלב 2.3 — אימות
```bash
supabase secrets list --project-ref tsxrrxzmdxaenlvocyit | grep MAKE_SECRET
```

אמור להופיע:
```
MAKE_SECRET   <some-hash>   <timestamp>
```

(הערך עצמו מוסתר — Supabase לא יראה אותו אחרי שהוגדר. זה תקין ולפי התקן.)

---

## אחרי שהכל מוגדר

חזור לסשן Cowork (כאן) ותגיד פשוט:
> **"הגדרתי את ה-secret. תן את הפרומפט הבא."**

אני אכתוב את פרומפט החלק השני שיגיד לקלוד קוד להמשיך מ-Step 3 של התוכנית המקורית: לערוך את הקוד של ה-EF, לדפלוי, לעדכן את Make, ולעשות commit.

---

## אם משהו לא הולך

### "אני לא רואה Edge Functions בתפריט"
- ייתכן שהפרויקט שלך לא במצב פעיל. נסה: https://supabase.com/dashboard/project/tsxrrxzmdxaenlvocyit/functions ישירות.

### "אני לא רואה Manage secrets"
- בגרסאות חדשות של Supabase, secrets נמצאים תחת **Project Settings → Vault → Secrets** או **Project Settings → Functions**. נווט שם.
- אם לא מוצא — תגיד לי בצ'אט ואני אנחה אותך.

### "ה-CLI מחזיר 'not authenticated'"
- הרץ `supabase login` ופתח את הדפדפן להזדהות. נסה שוב.

### "אני לא בטוח שהערך נשמר"
- הרץ:
  ```bash
  supabase secrets list --project-ref tsxrrxzmdxaenlvocyit
  ```
  או הסתכל ברשימת ה-secrets בדאשבורד. אם `MAKE_SECRET` שם — נשמר.

### "אני לא רוצה שהקובץ יישאר במחשב שלי"
- אחרי שכל התהליך יסתיים (אחרי פרומפט החלק השני), אני אדאג שקלוד קוד ימחק את הקובץ. עד אז — תשאיר אותו, נצטרך אותו לאימות.

---

## אבטחה

- הקובץ `~/.optic-up/make-secret.txt` הוא **אך ורק במחשב שלך**, בהרשאות 600. אף משתמש אחר במערכת לא יכול לקרוא אותו.
- הוא לא ב-git. לא נכנס לקומיט. לא יעלה ל-GitHub.
- אחרי שתגדיר את ה-secret ב-Supabase, הערך יחיה בשני מקומות בלבד: בקובץ הזה ובמשתני הסביבה של Supabase. אחרי שכל התהליך יסתיים — נמחק גם את הקובץ. הערך יחיה רק ב-Supabase ובתוך Make scenario `9126542` (שגם הוא לא ב-git).

---

*סוף הוראות. הצלחה!*
