# הפעלת Watcher לסנכרון Access

## הגדרה (פעם אחת)
1. פתח את הקובץ `start-watcher.bat` בעורך טקסט (לחיצה ימנית → ערוך)
2. החלף את `YOUR_KEY_HERE` ב-Service Role Key מ-Supabase Dashboard:
   - היכנס ל: https://supabase.com/dashboard
   - Settings → API → service_role → Reveal
   - העתק את כל ה-key
3. שמור את הקובץ

## הפעלה
- לחיצה כפולה על `start-watcher.bat`
- חלון שחור ייפתח עם הודעת "Watcher started"
- אל תסגור את החלון — הוא חייב להישאר פתוח

## מה קורה
- ה-Watcher צופה על תיקיית: C:\Users\User\Dropbox\InventorySync\sales
- כל קובץ CSV שמגיע מ-Access מעובד אוטומטית
- אם ה-Watcher נעצר — הוא מתחיל מחדש אוטומטית אחרי 5 שניות

## בדיקה
- ב-inventory.html → טאב סנכרון Access → אמור להופיע "🟢 Watcher פעיל"
