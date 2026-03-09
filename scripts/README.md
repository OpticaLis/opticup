# OpticUp Sync Watcher — הוראות התקנה

## דרישות מקדימות
- Node.js 18+ מותקן
- הרצה כ-Administrator

## הגדרה ראשונית
1. פתח את `scripts/config.json`
2. עדכן `watchFolder` לנתיב התיקייה המקומית של Dropbox
3. החלף `REPLACE_WITH_SERVICE_ROLE_KEY` במפתח ה-Service Role מ:
   Supabase Dashboard → Project Settings → API → service_role key

## התקנה כ-Windows Service
```
cd scripts
npm install
npm run install-service
```
השירות יופעל אוטומטית עם Windows ויאתחל לאחר כשלים.

## הסרה
```
npm run uninstall-service
```

## הרצה ידנית (ללא service)
```
npm start
```

## מבנה תיקיות
```
Dropbox/OpticTop/Inventory/Frames/
  sales/       ← Access מניח כאן קבצים
  processed/   ← קבצים שעובדו בהצלחה
  error/       ← קבצים שנכשלו + קובץ שגיאה
```

## ניטור
- סטטוס Watcher גלוי בטאב "סנכרון Access" באפליקציה
- ירוק = פעיל (heartbeat < 10 דקות)
- אדום = לא מגיב
