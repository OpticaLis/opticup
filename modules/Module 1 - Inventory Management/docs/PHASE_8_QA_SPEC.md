# מודול 1 — פאזה 8-QA: תיקון באג + סקירת פלואו מקיפה

> **פאזה תיקון + סקירה.** מודול 1 הושלם כולל פאזה 8.
> צ'אט משני חדש — מתחיל מ-0, לא קשור לצ'אט הקודם.
> **שני יעדים:** (1) תיקון באג OCR קריטי (2) סקירת כל הפלואו + הצעות שיפור.

---

## חלק א' — באג קריטי: OCR "ערוך ושמור" duplicate key

### הבעיה

כשלוחצים "ערוך ושמור" ב-OCR review modal, הפונקציה `_ocrSave` נכשלת עם:
```
duplicate key value violates unique constraint
"supplier_documents_tenant_supplier_docnum_unique"
```

זה קורה כי המערכת מנסה לעשות INSERT של מסמך ספק חדש, במקום UPDATE של מסמך קיים שכבר נוצר כשהקובץ הועלה.

### מה ידוע

- 7 ניסיונות תיקון בצ'אט הקודם — אף אחד לא פתר
- הבעיה כנראה בשרשרת wrappers שעוטפים את `showOCRReview`:
  - `debt-info-inject.js` עוטף showOCRReview ומוריד פרמטרים
  - `ai-alerts.js` עוטף showOCRReview ומוריד פרמטרים
  - `ai-batch-ocr.js` לא העביר docId
  - חלק מאלה "תוקנו" אבל השגיאה נשארת
- `_ocrExistingDocId` (global) אמור להחזיק את ה-ID של מסמך קיים, אבל ייתכן שהוא null ברגע השמירה

### איך לתקן — גישה נקייה

**אל תקרא את הניסיונות הקודמים. תתחיל מ-0.**

```
Step 1: מפה את כל שרשרת הקריאה
  - מצא כל מקום שקורא ל-showOCRReview (grep)
  - מצא כל wrapper/proxy שעוטף את הפונקציה
  - תעד: מי קורא → עם אילו פרמטרים → מי מקבל

Step 2: עקוב אחרי docId
  - הוסף console.log בכל נקודה בשרשרת
  - deploy to GitHub Pages (with cache bust)
  - שחזר את התרחיש בדפדפן
  - בדוק: איפה docId קיים ואיפה הוא null

Step 3: תקן את השורש
  - אם wrapper מוריד פרמטר → תקן את ה-wrapper
  - אם docId לא מועבר → תקן את הקורא
  - אם _ocrSave תמיד עושה INSERT → שנה ללוגיקה: if docId → UPDATE, else → INSERT

Step 4: בדוק את כל נקודות הכניסה ל-OCR
  - מ-debt documents tab (מסמך קיים → ערוך)
  - מ-receipt form (מסמך חדש → סרוק)
  - מ-batch upload (מסמכים מרובים)
  - מ-alert click (מסמך שדורש review)
  - כל אחד חייב לעבוד

Step 5: Regression
  - OCR scan חדש (בלי מסמך קיים) → INSERT → עובד
  - OCR edit (מסמך קיים) → UPDATE → עובד
  - Batch OCR → כל מסמך → עובד
  - ידני (בלי OCR) → עובד
```

---

## חלק ב' — סקירת כל הפלואו מקצה לקצה

### מתודולוגיה

**לפני שמתחילים לבדוק באגים — עבור על כל פלואו עסקי ובדוק:**
1. האם הוא שלם? (כל השלבים עובדים מתחילה ועד סוף)
2. האם הוא הגיוני? (האם משתמש רגיל יבין מה לעשות)
3. מה חסר? (שלבים שהיו צריכים להיות ואין)
4. מה אפשר לשפר? (UX, מהירות, בהירות)

**כלים:** Chrome browser access — בדוק כל דבר בפועל, לא רק בקוד.

---

### פלואו 1: הזמנת רכש (PO) — מתחילה ועד סוף

```
בדוק:
1. זיהוי צורך:
   - האם התראות מלאי נמוך מופיעות?
   - האם קל למצוא אילו מותגים חסרים?
   - האם אפשר ליצור PO ישירות מההתראה?

2. יצירת PO:
   - Step 1: בחירת ספק — dropdown עובד? חיפוש?
   - Step 2: הוספת פריטים — cascading dropdowns עובדים?
   - האם אפשר להוסיף פריטים חדשים (שלא קיימים)?
   - האם מחירים נטענים מהיסטוריה (מחיר אחרון)?
   - מספור PO אוטומטי — תקין?
   - שמירה כ-draft — עובד?

3. שליחת PO:
   - PDF export — עברית, RTL, מחירים, כמויות — הכל תקין?
   - Excel export — תקין?
   - שינוי status ל-sent — עובד?
   - האם אפשר לערוך PO אחרי שליחה? (צריך להיות אסור)

4. מעקב:
   - רשימת POs — סינון לפי סטטוס, ספק?
   - כרטיסי סיכום — מספרים נכונים?

שאלות לשיפור:
- האם יש "שכפול הזמנה" (מ-PO ישן)?
- האם יש "הזמנה מהירה" (ספק + פריטים בלי wizard)?
- האם יש אזהרה על כפילות (אותו ספק + אותם פריטים)?
- האם יש תזכורת ל-PO שנשלח ולא הגיעה תשובה?
```

### פלואו 2: קבלת סחורה — כל הווריאציות

```
בדוק כל וריאציה:

2a. קבלה עם PO + חשבונית (Pattern A):
   - יצירת קבלה → בחירת ספק → PO מוצע
   - פריטים נטענים מ-PO
   - OCR: upload חשבונית → סרוק → fields מתמלאים
   - דוח השוואה מול PO: matched, shortage, price gap, not-in-PO
   - החלטות מחיר: PO vs חשבונית
   - פריט לא בהזמנה: קבל / החזר
   - אישור PIN → מלאי + מסמך ספק + חוב
   - PO status מתעדכן (partial/received)

2b. קבלה עם PO + תעודת משלוח (Pattern B):
   - אותו דבר אבל סוג מסמך = "תעודת משלוח"
   - מסמך ספק נוצר כ-delivery_note
   - due_date ריק
   - בהמשך: חשבונית חודשית → קישור תעודות

2c. קבלה בלי PO:
   - לא אמור להציג דוח השוואה
   - עובד מזין הכל ידנית (או OCR)
   - מסמך ספק נוצר

2d. קבלה עם פריטים חדשים:
   - פריט לא במלאי → barcode auto-generate?
   - brand/model/size/color → הכל עובד?
   - OCR מזהה פריט חדש → "new item" flow?

2e. קבלה עם OCR (ה-flow החדש מפאזה 8):
   - upload → סרוק → review → confirm
   - confidence indicators על כל שדה
   - item matching: matched/new/unknown
   - PO auto-suggestion
   - learning: תיקונים נשמרים?

2f. קבלה ידנית (בלי OCR):
   - כל הפלואו הישן עובד בדיוק כמו קודם?
   - אין שום שינוי שנגרם מפאזה 8?

שאלות לשיפור:
- האם יש "קבלה מהירה" (סריקת ברקודים אחד אחד)?
- האם יש סיכום ויזואלי לפני אישור (כמה פריטים, סכום כולל)?
- האם יש אפשרות לבטל קבלה אחרי אישור?
- כמה קל לעובד חדש להבין את הפלואו? (info button עובד?)
```

### פלואו 3: מעקב חובות ספקים — כל הפלואו

```
בדוק:

3a. דשבורד:
   - כרטיסי סיכום מציגים מספרים נכונים?
   - Aging report — 5 קטגוריות עובדות?
   - כל הסכומים ב-ILS (המרה ממט"ח)?

3b. מסמכים:
   - יצירת מסמך ידנית — כל השדות?
   - צפייה במסמך — עם preview של קובץ?
   - צירוף/החלפת קובץ?
   - סינון מתקדם — כל הפילטרים?
   - מספור פנימי אוטומטי?
   - ביטול מסמך — סכומים מתעדכנים?
   - עריכת מסמך (debt-doc-edit)?

3c. קישור תעודות לחשבונית:
   - חשבונית חודשית → בחירת תעודות → סכום מתאים?
   - Auto-sum: "₪X מתוך ₪Y"?
   - AI auto-suggest linking?
   - Return notes מופיעות עם ↩️?

3d. תשלומים:
   - wizard 4 שלבים — כל שלב עובד?
   - FIFO allocation — מחלק מהישן?
   - תשלום חלקי → partially_paid?
   - תשלום מלא → paid + cascading (תעודות נסגרות)?
   - withholding tax — מחשב נכון?
   - rollback on error?

3e. עסקאות מקדמה:
   - יצירת עסקה + צ'קים?
   - Badge "מקדמה" על מסמכים?
   - כפתור "קזז מעסקה" (אחרי phase 8) — עובד?
   - Progress bar + alert threshold?

3f. פרטי ספק:
   - slide-in panel — timeline?
   - sub-tabs: מסמכים, תשלומים, החזרות?
   - יתרת פתיחה (opening balance)?

שאלות לשיפור:
- האם הדשבורד מספיק ברור למנהל שלא טכני?
- האם אפשר לראות "מתי שילמנו לאחרונה" בתצוגה מהירה?
- האם יש דוח ספק (כל הפעילות בתקופה)?
```

### פלואו 4: זיכויים לספקים — Full lifecycle

```
בדוק:

4a. יצירת זיכוי:
   - בחירת פריטים ב-inventory → "זיכוי לספק"
   - בחירת סוג (agent_pickup, ship_to_supplier, pending_in_store)
   - PIN → כמות יורדת + supplier_return נוצר?

4b. Staged → ארגז:
   - פריטי זיכוי ב-staged → staged picker ב-shipments?
   - הכנסה לארגז → status = shipped אוטומטית?
   - הוצאה מארגז (בחלון עריכה) → חזרה ל-staged?

4c. זיכוי שהתקבל:
   - רישום credit note → סכום validated?
   - Credit note אוטומטי → חוב קטן?
   - Timeline מציג את כל ההיסטוריה?

4d. טאב זיכויים:
   - ב-inventory — רשימת זיכויים + סינון?
   - ב-suppliers-debt — זיכויים ככרטיס/טאב?

שאלות לשיפור:
- האם יש "bulk return" — בחירת הרבה פריטים בבת אחת?
- האם יש סיכום: "כמה כסף ממתין לזיכוי מספקים"?
- האם יש התראה על זיכוי שלא התקבל (30/60 יום)?
```

### פלואו 5: ארגזים ומשלוחים

```
בדוק:

5a. יצירת ארגז:
   - כל 4 סוגים: מסגור, זיכוי, תיקון, משלוח
   - Wizard 3 שלבים — כל שלב?
   - JSONB config — required/optional/hidden עובד?
   - Custom fields?
   - Custom categories?
   - BOX number auto-generated?

5b. Staged picker (ארגז זיכוי):
   - מציג רק staged items של הספק הנבחר?
   - בחירה → status shipped אוטומטית?

5c. חלון עריכה:
   - 30 דקות (או configurable)?
   - Timer מוצג?
   - הוספה/הסרה עובדת?
   - הסרת פריט זיכוי → חזרה ל-staged?
   - Auto-lock אחרי timeout?
   - Manual lock עם PIN?

5d. ארגז נעול:
   - Immutable — אי אפשר לערוך?
   - ארגז תיקון — יוצר ארגז חדש מקושר?

5e. Manifest:
   - הדפסה — כל השדות נכונים?
   - עברית RTL בהדפסה?
   - חתימת מקבל — שורה ריקה?

שאלות לשיפור:
- האם קל למצוא ארגז ישן (חיפוש לפי BOX number)?
- האם יש "שכפול ארגז" (מאותו ספק עם אותם פרטים)?
- האם ה-manifest מספיק ברור לשליח?
```

### פלואו 6: ספירת מלאי (פאזה 7 — חדש)

```
בדוק:

6a. יצירת ספירה:
   - סריקת ברקוד / חיפוש ידני?
   - Unknown items — מטופלים?
   - Pause/resume?

6b. דוח סיום:
   - matched / discrepancy / unknown — כל הסטטוסים?
   - Approve/skip per item?
   - Reason per discrepancy?
   - Atomic delta RPC — מחשב מ-current (לא מ-expected)?

6c. עודפים:
   - Unknown → modal → הוסף למלאי?
   - שני מסלולי ברקוד (readonly / auto-generate)?

6d. צפייה בספירות סגורות:
   - Read-only?
   - פילטרים?
   - Excel export?

6e. Regression:
   - שינוי כמות ב-DB בזמן ספירה → delta נכון?
```

### פלואו 7: סנכרון Access

```
בדוק:
- Heartbeat — 🟢/🔴 מדויק?
- CSV import — עובד?
- Pending → resolve → כמות מתעדכנת?
- Reverse sync — CSV ל-new/?
- Manual upload — CSV + XLSX?
```

### פלואו 8: AI / OCR

```
בדוק:

8a. OCR מ-suppliers-debt:
   - Upload → סרוק → review → save
   - Confidence indicators
   - Learning: תיקון → template מתעדכן?
   - Batch upload + OCR

8b. OCR מ-goods receipt (פאזה 8):
   - Upload → סרוק → auto-fill form
   - Item matching: matched/new/unknown
   - PO suggestion

8c. התראות:
   - Bell icon on all pages?
   - payment_due / overdue / prepaid_low?
   - Auto-dismiss?

8d. דוח שבועי:
   - מסך → נתונים נכונים?
   - PDF export?
```

### פלואו 9: הגדרות + הרשאות

```
בדוק:
- Settings: עסק, פיננסי, תצוגה, לוגו?
- Employees: CRUD + roles + permissions?
- Permission matrix: 55 permissions across 15 modules?
- Role enforcement: worker can't delete, viewer can't edit?
```

---

## חלק ג' — פורמט דיווח

### באגים

```
BUG-{number}: {title}
Severity: 🔴 Critical / 🟡 Medium / 🟢 Low / 💅 Visual
Page: {page}
Steps: 1. ... 2. ... 3. ...
Expected: ...
Actual: ...
```

### הצעות שיפור

```
IMPROVE-{number}: {title}
Flow: {which flow}
Current: מה קורה היום
Suggested: מה צריך לקרות
Priority: 🔴 חשוב / 🟡 נחמד / 🟢 עתידי
Effort: קטן / בינוני / גדול
```

---

## חלק ד' — סדר ביצוע

```
Phase 8-QA-a — תיקון באג OCR duplicate key (חלק א')
Phase 8-QA-b — סקירת פלואו 1-3 (PO, קבלה, חובות)
Phase 8-QA-c — סקירת פלואו 4-6 (זיכויים, ארגזים, ספירה)
Phase 8-QA-d — סקירת פלואו 7-9 (Access, AI, הגדרות)
Phase 8-QA-e — תיקון באגים שנמצאו
Phase 8-QA-f — יישום שיפורים שאושרו
Phase 8-QA-g — Regression + documentation
```

**חשוב: באג ה-OCR קודם לכל. בלי זה — פאזה 8 לא סגורה.**
