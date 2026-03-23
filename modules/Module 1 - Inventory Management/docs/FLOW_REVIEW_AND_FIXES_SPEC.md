# מודול 1 — סקירת פלואו + תיקונים

> **צ'אט משני חדש. שלושה שלבים בסדר הזה:**
> 1. **הבן** — עבור על כל הקוד והפלואו, קח תמונה מלאה
> 2. **ייעץ** — הצג ממצאים + הצעות שיפור → דניאל מחליט
> 3. **תקן** — תיקונים ושיפורים שאושרו

---

## שלב 1 — מיפוי: איך הכל עובד היום

**לפני שמתקנים משהו — תבין הכל.**

קרא את הקבצים, עקוב אחרי הפלואו בקוד, ותן סיכום מלא.

### 1.1 מה לקרוא

```
Files to read (in order):
1. CLAUDE.md (root) — project rules
2. modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md — current state
3. modules/Module 1 - Inventory Management/docs/MODULE_SPEC.md — what exists

Then read these code files and trace the full flow:

Purchase Orders:
- modules/purchasing/*.js (all 5 files)

Goods Receipts:
- modules/goods-receipts/*.js (all files)
  - especially: receipt-form.js, receipt-confirm.js, receipt-debt.js
  - especially: receipt-ocr.js, receipt-ocr-review.js, receipt-po-compare.js

Supplier Debt:
- modules/debt/*.js (all files)
- modules/debt/ai/*.js (all files)
  - especially: debt-documents.js, debt-doc-edit.js, debt-doc-new.js
  - especially: debt-payments.js, debt-payment-wizard.js, debt-payment-alloc.js
  - especially: debt-prepaid.js, debt-prepaid-detail.js
  - especially: debt-supplier-detail.js, debt-doc-link.js

Returns:
- modules/inventory/inventory-return.js
- modules/inventory/inventory-returns-tab.js
- modules/inventory/inventory-returns-actions.js
- modules/debt/debt-returns.js

Shipments:
- modules/shipments/*.js (all files)
```

### 1.2 מה לתעד

לכל פלואו, תן סיכום:

```
פלואו: [שם]
מה קורה: step-by-step מה המשתמש עושה ומה המערכת עושה
קבצים מעורבים: [רשימה]
DB tables: [רשימה]
נקודות חיבור: איפה הפלואו הזה מתחבר לפלואו אחר
חסרונות/בעיות: מה שמתי לב שחסר או שבור
```

**פלואו שצריך לתעד:**

1. **הזמנת רכש** — מזיהוי צורך ועד שליחה לספק
2. **קבלת סחורה ידנית** — בלי OCR, בלי PO
3. **קבלת סחורה עם PO** — חיבור, השוואת פריטים, אישור
4. **קבלת סחורה עם OCR** — upload → scan → review → confirm
5. **מסמך ספק ידני** — יצירה ישירה ב-suppliers-debt
6. **מסמך ספק מ-OCR** — upload → scan → save
7. **קישור תעודות לחשבונית** — Pattern B (תעודות + חשבונית חודשית)
8. **תשלום לספק** — wizard 4 שלבים, FIFO, withholding
9. **קיזוז ממקדמה** — מ-suppliers-debt (אחרי phase 8)
10. **זיכוי לספק** — pending → staged → box → shipped → credit
11. **ארגז משלוח** — כל 4 סוגים

---

## שלב 2 — ייעוץ: מה לשפר

**אחרי שהבנת הכל — הצג ממצאים.**

### 2.1 באגים ידועים לתקן

```
🔴 קריטי:
1. מסמכים לא מופיעים בכרטיס ספק
   (loadSupplierDocuments לא מסנן נכון)
2. אין כפתור מחיקת קובץ בגלריה
   (multi-file — חסר ✕ על thumbnail)
3. 🤖 לא נעלם מרשימה אחרי סריקה
   (state לא מתעדכן אחרי OCR מוצלח)

🟡 בינוני:
4. ai-ocr.js ב-366 שורות — צריך פיצול
5. debt-supplier-detail.js ב-387 שורות — צריך פיצול
6. PO dropdown = native select (createSearchSelect נכשל)
```

### 2.2 הצעות שיפור

לכל פלואו שסקרת, הצג:
- **מה עובד טוב** — לא לגעת
- **מה מבלבל את המשתמש** — UX issues
- **מה חסר** — שלבים שהיו צריכים להיות
- **מה מיותר** — שלבים שאפשר להסיר/לפשט

**פורמט:**
```
IMPROVE-{num}: {title}
Flow: {which flow}
Current: מה קורה היום
Suggested: מה צריך לקרות
Priority: 🔴 חשוב / 🟡 נחמד / 🟢 עתידי
```

### 2.3 שיחה עם דניאל

אחרי שמציג ממצאים — **עצור וחכה לאישור.** דניאל יחליט מה לתקן ומה לדחות. אל תתחיל לתקן לפני שיש אישור.

---

## שלב 3 — תיקונים

**רק אחרי אישור דניאל.**

סדר עדיפות:
1. 🔴 באגים קריטיים (3)
2. 🟡 באגים בינוניים (3)
3. שיפורי פלואו שאושרו
4. Regression testing

**כלל ברזל:** אחרי כל תיקון — verify zero console errors on all pages.

---

## חשוב

- **לא לשנות לוגיקה בשלב 1.** רק לקרוא ולתעד.
- **לא לתקן בשלב 2.** רק להציע ולחכות לאישור.
- **שלב 3 = שלב אחד בכל פעם.** לא לעשות הכל בבת אחת.
- **עיקרון הפרדה:** עובד מקבל סחורה = תפעולי. מנהל כספים = פיננסי. אפס שאלות כספיות בקבלת סחורה.
