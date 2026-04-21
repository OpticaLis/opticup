# המשך תיקונים למודול ניהול מלאי — סעיפים 5-9

## מה בוצע (סעיפים 1-4)

**Commit 1:** `35966de` — merged to main via PR (סעיפים 1-3)
**Commit 2:** `f6881ff` — merged to main via PR (סעיף 4)

### סעיף 1+2: מלאי ראשי — סינון מסומנים + ייצוא Excel + עמודת מ.סופי ✅
- כפתור "רק מסומנים" בסרגל הפילטרים — מופיע רק כשיש סימונים, הורדת סימון מסירה שורה מיד
- ייצוא Excel מייצא רק פריטים מסומנים כשיש סימונים
- עמודת "מ.סופי" (מחיר אחרי הנחה) נוספה לטבלה ול-Excel

### סעיף 3: ספירת מלאי — מצלמה — זום ✅
- תוקן כפתור זום: עכשיו מחזורי 1x → 2x → 3x
- נוסף focus lock (continuous) למניעת הקפצות פוקוס
- **העובד צריך לבדוק מהטלפון** — טרם נבדק

### סעיף 4: ספירת מלאי — מצלמה — חלוניות אחרי סריקה ✅
- כל 4 החלוניות (success, qty, notfound, unknown) הוזזו לתחתית המסך (bottom sheet)
- כפתורים גדולים יותר (min-height:56px, font-size:1.1rem)
- רוחב מלא, פינות עגולות למעלה בלבד
- **העובד צריך לבדוק מהטלפון** — טרם נבדק

### ניקוי שבוצע ✅
- נמחק `modules/Module 1 - Inventory Management/inventory.html` (213KB, גרסה ישנה מיושנת שלא רצה)

---

## מבנה חשוב — הקבצים הנכונים לעבודה על מודול המלאי

**הקובץ שרץ באוויר הוא `inventory.html` ב-ROOT**, לא ב-`modules/Module 1 - Inventory Management/`.
הוא טוען ~30 קבצי JS חיצוניים:

- `inventory.html` (ב-ROOT) — ה-HTML + script tags
- `modules/inventory/inventory-table.js` — רינדור טבלה, פילטרים, תפריט 3 נקודות (⋯)
- `modules/inventory/inventory-export.js` — ייצוא Excel
- `modules/inventory/inventory-edit.js` — selection, bulk update, inline editing
- `modules/inventory/inventory-entry.js` — הכנסה ידנית
- `modules/stock-count/stock-count-camera.js` — מצלמה + זום + סריקה
- `modules/stock-count/stock-count-scan.js` — לוגיקת סריקה
- `modules/stock-count/stock-count-report.js` — דו"ח פערים

**לא** לחפש קוד ב-`modules/Module 1 - Inventory Management/` — התיקייה הזו מכילה רק docs.

---

## סעיפים שנותרו (5-9 מהרשימה המקורית)

### סעיף 5: ספירת מלאי — case insensitive בהשוואת ברקודים
- אם על המסגרת כתוב MY001 ובמערכת רשום my001 — לא מזהה
- צריך: השוואה case-insensitive
- קובץ: `modules/stock-count/stock-count-scan.js` — פונקציית _scNormalizeBarcode

### סעיף 6: ספירת מלאי — מותגים שלא מסומנים נכנסים לספירה
- Papillon, Lemons וכו' — לא מסומנים כמותגים אבל נכנסים לספירה
- צריך לבדוק את הלוגיקה של סינון מותגים בספירה

### סעיף 7: ספירת מלאי — דו"ח פערים — ייצוא Excel רק של פערים
- כרגע ייצוא מוציא את כל הספירה, לא רק פערים
- צריך גם: הערות שעוברות ל-Excel, סינון לפי מותג/דגם/ברקוד בסדר עולה/יורד
- קובץ: `modules/stock-count/stock-count-report.js`

### סעיף 8: הכנסת מלאי — היסטוריית הכנסות — הדפסת ברקודים — להוסיף מחיר מכירה מלא
- קובץ Excel של הברקודים לא מראה מחיר, רק פרטי מסגרות
- קובץ: `modules/inventory/inventory-export.js` — פונקציית exportBarcodesExcel

### סעיף 9: הכנסת מלאי — הכנסה ידנית — שינוי סדר שדות + מחיר סופי
- צריך להחליף סדר: ספק ← מותג ← דגם ← **צבע** ← גודל ← **גשר** ← אורך מוט (להחליף צבע וגשר)
- להוסיף שדה מחיר סופי אחרי הנחה
- קובץ: `modules/inventory/inventory-entry.js` + `inventory.html` (טופס הכנסה)

---

## שיטת עבודה
- סעיף סעיף: עובדים על סעיף, דניאל בודק ב-localhost, ממשיכים הלאה
- בכל שינוי — וידוא שלא נשברים מודולים אחרים
- localhost: `npx http-server . -p 3000 -c-1` מתוך `C:\Users\User\opticup`
- merge ל-main: דרך PR ב-GitHub (יש branch protection, אין gh CLI)
- מכונה: מחשב נייח Windows, `C:\Users\User\opticup`
- branch: `develop` (תמיד)

## קובץ המקור של כל הסעיפים
הקובץ המקורי עם כל הבקשות: `תיקונים לאפליקציה.pdf` — הועלה בתחילת הסשן הקודם.
