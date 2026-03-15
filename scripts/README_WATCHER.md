# הפעלת Watcher לסנכרון Access

ה-Watcher צופה על תיקיית Dropbox ומעבד אוטומטית קבצי CSV שמגיעים מ-Access.

---

## אפשרות 1: Windows Service (מומלץ)

שירות שרץ ברקע — שורד הפעלות מחדש, לא צריך חלון פתוח, המפתח מאוחסן בצורה מאובטחת.

### התקנה (פעם אחת, כמנהל מערכת)

1. פתח Command Prompt **כמנהל מערכת** (לחיצה ימנית → Run as administrator)
2. נווט לתיקיית הפרויקט:
   ```
   cd C:\prizma
   ```
3. הרץ את פקודת ההתקנה:
   ```
   node scripts/install-service.js --key=YOUR_KEY_HERE --watch-dir="C:\Users\User\Dropbox\InventorySync\sales"
   ```
   - החלף `YOUR_KEY_HERE` ב-Service Role Key מ-Supabase Dashboard:
     - היכנס ל: https://supabase.com/dashboard
     - Settings → API → service_role → Reveal
   - שנה את הנתיב אם תיקיית ה-Dropbox נמצאת במיקום אחר

   או הרץ באופן אינטראקטיבי (יבקש את הפרטים):
   ```
   node scripts/install-service.js
   ```

### מה קורה
- השירות מותקן ומתחיל לרוץ מיד
- השירות עולה אוטומטית עם הפעלת Windows
- אם השירות קורס — הוא מתחיל מחדש אוטומטית
- המפתח מאוחסן כמשתנה סביבה של המערכת (לא בקובץ)

### הסרה
```
node scripts/uninstall-service.js
```

---

## אפשרות 2: הרצה ידנית עם BAT (לבדיקות בלבד)

לבדיקות ודיבוג — דורש חלון פתוח כל הזמן.

### הגדרה
1. צור קובץ `scripts/start-watcher.bat` (לא נשמר ב-git מטעמי אבטחה)
2. הכנס את התוכן הבא:
   ```bat
   @echo off
   set OPTICUP_SERVICE_ROLE_KEY=YOUR_KEY_HERE
   set OPTICUP_WATCH_DIR=C:\Users\User\Dropbox\InventorySync\sales
   cd /d %~dp0\..
   node scripts\sync-watcher.js
   ```
3. החלף `YOUR_KEY_HERE` במפתח האמיתי
4. לחיצה כפולה על הקובץ להפעלה

### חשוב
- **אל תסגור** את החלון השחור — ה-Watcher חייב שהחלון יישאר פתוח
- הקובץ הזה **לא נשמר ב-git** כי הוא מכיל את המפתח

---

## סנכרון הפוך — ייצוא מלאי חדש ל-Access

כשמוסיפים פריטים חדשים ב-Optic Up, ה-Watcher מייצא אותם אוטומטית כ-XLS לתיקיית "new" כדי ש-Access יוכל לקלוט אותם.

### איך זה עובד
- כל 30 שניות, ה-Watcher בודק אם יש פריטי מלאי חדשים שטרם יוצאו
- אם יש — נוצר קובץ XLS (בפורמט biff8) בתיקיית הייצוא (ברירת מחדל: `InventorySync\new`)
- הפריטים מסומנים כ-`access_exported = true` כדי לא לייצא אותם שוב
- הקובץ נכתב באמצעות SheetJS (תואם עברית ב-Access)
- שם הקובץ: `export_YYYYMMDD_HHmmss.xls`

### הגדרה
- משתנה סביבה: `OPTICUP_EXPORT_DIR` — נתיב תיקיית הייצוא
- ברירת מחדל: תיקיית `new` ליד תיקיית ה-watch (למשל `InventorySync\new`)
- בקובץ BAT, מוגדר: `set OPTICUP_EXPORT_DIR=C:\Users\User\Dropbox\InventorySync\new`

---

## בדיקה
- ב-inventory.html → טאב סנכרון Access → אמור להופיע "🟢 Watcher פעיל"
- ה-Watcher צופה על התיקייה שהוגדרה ומעבד כל קובץ CSV חדש
