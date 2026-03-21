# מודול 1 — פאזה 8: OCR בקבלת סחורה + שיפורי פלואו רכש

> **פאזה השלמה.** חיבור ה-OCR הקיים לקבלת סחורה + סקירה ותיקון
> של כל הפלואו מהזמנת רכש ועד סגירת חוב.
> **זמן משוער: 3-5 ימים.**

---

## 1. סקירת הפלואו המלא: הזמנה → קבלה → חוב → תשלום

### 1.1 הפלואו כמו שהוא היום

```
שלב 1 — זיהוי צורך:
  מנהל רואה התראת מלאי נמוך למותג X
  או: ספק מציע מבצע, מנהל מחליט להזמין

שלב 2 — יצירת הזמנת רכש (PO):
  inventory.html → טאב הזמנות → "הזמנה חדשה"
  → בחירת ספק (Step 1)
  → הוספת פריטים: מותג, דגם, גודל, צבע, כמות, מחיר (Step 2)
  → PO-{supplier_number}-{seq} אוטומטי
  → שמירה כ-draft → שליחה (PDF/Excel לספק) → status: sent

שלב 3 — סחורה מגיעה:
  inventory.html → טאב קבלות → "קבלה חדשה"
  → בחירת סוג מסמך + מספר + ספק
  → אם יש PO פתוח → מוצע לחיבור → פריטים נטענים מה-PO
  → עובד סורק/מזין פריטים, כמויות, מחירים
  → צירוף קובץ (PDF/תמונה)
  → אישור PIN
  → מלאי מתעדכן + cost_price מתעדכן + מסמך ספק נוצר

שלב 4 — חוב:
  suppliers-debt.html → מסמך ספק מופיע אוטומטית
  → מנהל כספים רואה בדשבורד

שלב 5 — תשלום:
  suppliers-debt.html → אשף תשלומים → הקצאה → PIN → חוב נסגר
```

### 1.2 מה עובד טוב

- ✅ PO creation wizard — ברור, שני שלבים
- ✅ PO → receipt linkage — פריטים נטענים אוטומטית
- ✅ Receipt confirmation → auto-create supplier document
- ✅ Price comparison PO vs receipt (>5% = warning)
- ✅ File upload on receipt
- ✅ Mandatory barcode for new items
- ✅ Debt dashboard shows everything
- ✅ Payment wizard with FIFO allocation

### 1.3 מה חסר או שבור

| # | בעיה | חומרה | פתרון |
|---|-------|--------|-------|
| A | **אין OCR בקבלת סחורה** — עובד מקליד הכל ידנית למרות שיש AI שיודע לקרוא חשבוניות | 🔴 | Step 1-2 של פאזה זו |
| B | **קיזוז מקדמה נשאל בקבלה** — עובד תפעולי מקבל החלטה פיננסית | 🟡 | Step 3: העברה ל-suppliers-debt |
| C | **אי-התאמת פריטים מול PO** — המערכת משווה כמויות ומחירים, אבל לא מזהה פריט שהגיע ולא הוזמן | 🟡 | Step 4: item matching |
| D | **אין החלטת מחיר** — כשמחיר שונה מה-PO, אין UI ברור למנהל להחליט | 🟡 | Step 4: price decision |

---

## 2. עיקרון מנחה: הפרדת תפעול מפיננסים

```
┌────────────────────────────┐    ┌──────────────────────────────┐
│   inventory.html           │    │   suppliers-debt.html         │
│   עובד מקבל סחורה          │    │   מנהל כספים                  │
│                            │    │                              │
│   ✅ מה הגיע               │    │   ✅ כמה חייבים              │
│   ✅ כמה                   │    │   ✅ לקזז ממקדמה?            │
│   ✅ באיזה מצב             │    │   ✅ מחיר PO או חשבונית?     │
│   ✅ תואם ל-PO?            │    │   ✅ לשלם / לדחות            │
│                            │    │   ✅ להתכתב עם ספק            │
│   ❌ כמה לשלם              │    │                              │
│   ❌ לקזז ממקדמה           │    │                              │
│   ❌ לאשר מחיר חדש          │    │                              │
└────────────────────────────┘    └──────────────────────────────┘
```

**עובד = "הנה מה שהגיע."** מנהל כספים = "הנה מה שמשלמים."

---

## 3. Step 1 — כפתור OCR בטופס קבלת סחורה

### 3.1 מה בונים

כפתור "🤖 סרוק עם AI" בטופס קבלת סחורה. מופיע אחרי שקובץ הועלה.

### 3.2 הפלואו

```
"קבלה חדשה" → "צרף מסמך" (upload PDF/תמונה)
                    │
                    ▼
         [🤖 סרוק עם AI]  ← כפתור חדש
                    │
                    ▼
         Loading: "סורק את המסמך..."
                    │
                    ▼
         AI מחזיר תוצאות → מילוי אוטומטי של הטופס
```

### 3.3 מה ה-OCR ממלא

| שדה | מילוי | פעולה |
|------|--------|-------|
| ספק | auto-select ב-dropdown | AI מזהה שם ספק → fuzzy match מול suppliers table |
| סוג מסמך | auto-select | חשבונית מס / תעודת משלוח / חשבונית זיכוי |
| מספר מסמך | auto-fill | המספר שמופיע על המסמך |
| תאריך מסמך | auto-fill | התאריך שמופיע על המסמך |
| PO מוצע | auto-suggest | אם יש PO פתוח לספק → מציע חיבור |
| רשימת פריטים | auto-fill שורות | כל פריט: תיאור, כמות, מחיר |

### 3.4 Confidence indicators

כל שדה שמולא ע"י AI מקבל אינדיקטור:
- ✅ ירוק (confidence > 0.9) — סביר שנכון
- ⚠️ צהוב (0.7-0.9) — כדאי לבדוק
- 🔴 אדום (< 0.7) — כנראה לא נכון, חייב בדיקה

### 3.5 Technical

- קורא ל-Edge Function `ocr-extract` הקיים — אפס שינוי בצד השרת
- משתמש ב-`supplier_ocr_templates` ללמידה — אותו מנגנון כמו ב-suppliers-debt
- קובץ חדש: `modules/goods-receipts/receipt-ocr.js`
- שינוי קטן ב-`receipt-form.js` — הוספת כפתור + hook

---

## 4. Step 2 — Review + התאמת פריטים

### 4.1 הבעיה

OCR מחזיר תיאורי פריטים כטקסט חופשי ("Ray-Ban RB5154 51mm Black").
צריך להתאים לפריטים שקיימים במלאי, או לזהות שזה פריט חדש.

### 4.2 שלושה מצבים per item

```
┌────────────────────────────────────────────┐
│ OCR מחזיר פריט                              │
├────────────────────────────────────────────┤
│                                            │
│  מצב 1: MATCHED ✅                         │
│  מותג+דגם מזוהים → פריט קיים במלאי         │
│  → barcode auto-filled                     │
│  → שדות readonly (מהמלאי)                  │
│  → עובד רק מאשר כמות                       │
│                                            │
│  מצב 2: NEW ITEM ➕                         │
│  מותג מזוהה אבל דגם לא קיים               │
│  → brand auto-filled, model from OCR       │
│  → barcode = auto-generate (BBDDDDD)       │
│  → עובד ממלא: size, color                  │
│  → פריט נוצר ב-inventory                   │
│                                            │
│  מצב 3: UNKNOWN ❓                          │
│  OCR לא מצליח לזהות מותג                   │
│  → שורה מסומנת באדום                       │
│  → עובד ממלא הכל ידנית                     │
│  → או: "דלג" → פריט לא נכנס לקבלה         │
│                                            │
└────────────────────────────────────────────┘
```

### 4.3 UI — רשימת פריטים אחרי OCR

```
┌──────────────────────────────────────────────────────────────┐
│ פריטים מהסריקה (7)                                          │
├──────────────────────────────────────────────────────────────┤
│ ✅ Ray-Ban RB5154 │ 0012345 │ ×3 │ ₪350 │ matched          │
│ ✅ Ray-Ban RB3025 │ 0012346 │ ×5 │ ₪420 │ matched          │
│ ➕ Ray-Ban RB7047 │ (חדש)   │ ×2 │ ₪380 │ [ממלא פרטים...] │
│ ✅ Oakley OX8046  │ 0013201 │ ×4 │ ₪290 │ matched          │
│ ❓ שורה 5        │ ???     │ ×1 │ ₪??? │ [מלא ידנית/דלג] │
│ ✅ Oakley OX8053  │ 0013205 │ ×2 │ ₪310 │ matched          │
│ ✅ Ray-Ban RB4171 │ 0012400 │ ×3 │ ₪275 │ matched          │
│                                                              │
│ סה"כ: 7 פריטים │ 5 matched │ 1 חדש │ 1 לא מזוהה           │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 Matching logic

```
1. OCR מחזיר: { description: "Ray-Ban RB5154 51mm Black", qty: 3, price: 350 }

2. פירוק description:
   → brand keywords: "Ray-Ban" → חיפוש ב-brands table → brand_id
   → model keywords: "RB5154" → חיפוש ב-inventory WHERE brand_id AND model ILIKE
   → size: "51mm" → "51"
   → color: "Black" → "שחור" (future: translation table)

3. אם נמצא match → inventory_id + barcode
   אם נמצא brand אבל לא model → new item
   אם לא נמצא brand → unknown

4. supplier_ocr_templates.extraction_hints יכולים לשפר:
   → "הספק הזה כותב 'RB' במקום 'Ray-Ban'"
   → "העמודות: תיאור, כמות, מחיר ליח', סה״כ"
```

---

## 5. Step 3 — העברת קיזוז מקדמה ל-suppliers-debt

### 5.1 מה משתנה

**היום:** `receipt-debt.js` שואל "לקזז מעסקה מראש?" ברגע אישור הקבלה.
**אחרי:** הקיזוז עובר ל-suppliers-debt.html. עובד מקבל סחורה = תפעולי בלבד.

### 5.2 הפלואו החדש

```
inventory.html (עובד):
  קבלה מאושרת → מלאי מתעדכן → מסמך ספק נוצר
  → Toast: "קבלה אושרה, מסמך ספק #{num} נוצר"
  → אפס שאלות פיננסיות

suppliers-debt.html (מנהל כספים):
  רואה מסמך חדש בדשבורד
  אם לספק יש עסקת מקדמה פעילה:
    → badge/notification: "מסמך חדש — יש עסקה מראש"
    → מנהל בוחר: "קזז מעסקה" / "לא — תשלום רגיל"
    → אם קיזוז: מנהל בוחר סכום (מלא/חלקי)
    → PIN → קיזוז מתבצע
```

### 5.3 שינויים בקוד

**`receipt-debt.js`:**
- הסר את הלוגיקה של `checkPrepaidDeal()` ו-"לקזז מעסקה?"
- השאר רק: יצירת supplier_document + חיבור ל-receipt

**`debt-documents.js` או `debt-prepaid.js`:**
- הוסף indicator למסמכים של ספקים עם עסקת מקדמה
- הוסף כפתור "קזז מעסקה" על מסמך שעוד לא קוזז
- כפתור פותח modal: בחירת עסקה + סכום + PIN

### 5.4 Alert חדש

כשנוצר מסמך ספק עם prepaid deal פעיל:
```
alert_type: 'prepaid_new_document'
title: "מסמך חדש מ-{supplier} — יש עסקת מקדמה פעילה"
severity: 'info'
```

מנהל הכספים רואה ב-bell icon → נכנס לטפל.

---

## 6. Step 4 — השוואת פריטים מול PO + החלטות

### 6.1 מה בונים

כשקבלה מקושרת ל-PO, המערכת משווה את מה שהגיע למה שהוזמן ומציגה **דוח התאמה** לפני אישור.

### 6.2 דוח התאמה

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 השוואה מול הזמנה PO-15-0042                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ תואם (4 פריטים):                                         │
│   RB5154 ×3  │ הוזמן: 3  │ הגיע: 3  │ ₪350 = ₪350          │
│   RB3025 ×5  │ הוזמן: 5  │ הגיע: 5  │ ₪420 = ₪420          │
│   OX8046 ×4  │ הוזמן: 4  │ הגיע: 4  │ ₪290 = ₪290          │
│   RB4171 ×3  │ הוזמן: 3  │ הגיע: 3  │ ₪275 = ₪275          │
│                                                              │
│ ⚠️ חוסר (1 פריט):                                            │
│   OX8053     │ הוזמן: 4  │ הגיע: 2  │ חסרות 2              │
│                                                              │
│ ⚠️ פער מחיר (1 פריט):                                        │
│   RB7047     │ הוזמן: ₪350  │ הגיע: ₪380  │ +₪30 (+8.6%)   │
│              │ [קבל במחיר PO] [קבל במחיר חשבונית]           │
│                                                              │
│ 🔴 לא בהזמנה (1 פריט):                                       │
│   RB9999 ×2  │ ₪450  │ לא מופיע ב-PO                        │
│              │ [קבל בכל זאת] [החזר לספק]                     │
│                                                              │
│ ─── סיכום ─────────────────────────────────────              │
│ תואם: 4  │  חוסר: 1  │  פער מחיר: 1  │  לא בהזמנה: 1       │
│                                                              │
│              [← חזרה]    [אשר קבלה ▶]                        │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 החלטות per item

**חוסר (הוזמן X, הגיע Y < X):**
- אין החלטה נדרשת — הקבלה מתעדת מה שהגיע
- PO נשאר "partial" — ההפרש ימתין למשלוח הבא
- הערה אוטומטית על ה-PO: "חוסר ב-{items}, ממתין להשלמה"

**פער מחיר (מחיר חשבונית ≠ מחיר PO):**
- **[קבל במחיר PO]** → cost_price = מחיר PO. מסמך ספק = מחיר חשבונית. הערה: "פער מחיר — ₪30 לטיפול". מנהל כספים יראה את ההערה ב-suppliers-debt.
- **[קבל במחיר חשבונית]** → cost_price = מחיר חשבונית. הכל מתאים. סוף.
- **ברירת מחדל:** אם העובד לא בוחר — מחיר חשבונית (מה שבפועל).

**לא בהזמנה (פריט שהגיע ולא הוזמן):**
- **[קבל בכל זאת]** → פריט נכנס למלאי כרגיל. הערה על מסמך ספק.
- **[החזר לספק]** → פריט לא נכנס למלאי. supplier_return נוצר אוטומטית בסטטוס 'pending'. הערה: "פריט לא הוזמן — מוחזר".

### 6.4 מה קורה עם ה-PO

| מצב | PO status |
|------|-----------|
| כל הפריטים הגיעו, כמויות מלאות | → 'received' (סגור) |
| חלק מהפריטים הגיעו | → 'partial' (ממתין להשלמה) |
| כל הפריטים הגיעו אבל כמויות חלקיות | → 'partial' |
| הכל הגיע + פריטים נוספים | → 'received' + הערה על תוספות |

---

## 7. Step 5 — Learning + תיקונים

### 7.1 מה קורה כשעובד מתקן שדה

```
OCR מילא: ספק = "רייבן"  (שגוי — צריך "רייבאן")
עובד מתקן → בוחר "רייבאן" מה-dropdown

→ correction נשמר: { "supplier_name": { "ai": "רייבן", "user": "רייבאן" } }
→ ocr_extractions.corrections מתעדכן
→ supplier_ocr_templates.extraction_hints מתעדכן:
   → "הספק הזה נקרא רייבאן, לא רייבן"
→ בפעם הבאה: AI מקבל hint → מזהה נכון
```

### 7.2 מה ספציפי לקבלת סחורה (לעומת debt)

- **Item matching learning:** אם עובד תיקן match (OCR אמר פריט A, עובד בחר פריט B) → שמור: "כשהספק כותב X, הכוונה ל-Y"
- **Price pattern:** אם ספק תמיד כותב מחיר עם מע"מ (כולל) → hint: "prices_include_vat: true"
- **Layout learning:** אם ספק X תמיד שם את מספר המסמך בפינה הימנית → hint עם מיקום

---

## 8. קובץ חדש + שינויים

### 8.1 קבצים חדשים

```
modules/goods-receipts/
  receipt-ocr.js            — OCR trigger, result parsing, item matching, review UI
```

### 8.2 קבצים שמשתנים

```
modules/goods-receipts/
  receipt-form.js           — הוספת כפתור "🤖 סרוק", hook ל-receipt-ocr
  receipt-confirm.js        — PO comparison report (item matching + price decisions)
  receipt-debt.js           — הסרת prepaid deal question

modules/debt/
  debt-documents.js         — badge "עסקת מקדמה" על מסמכים רלוונטיים
  debt-prepaid.js           — כפתור "קזז מעסקה" + modal

modules/debt/ai/
  ai-alerts.js              — alert חדש: prepaid_new_document
```

### 8.3 שום שינוי ב:

- Edge Function `ocr-extract` — עובד כמו שהוא
- supplier_ocr_templates — אותו מנגנון
- ocr_extractions — אותה טבלה
- DB schema — אפס טבלאות חדשות

---

## 9. DB Changes

```sql
-- אפס טבלאות חדשות.
-- שינוי יחיד אפשרי:

-- הוספת שדה על goods_receipt_items לתיעוד החלטת מחיר:
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS price_decision TEXT;
  -- 'po_price'      — נבחר מחיר PO
  -- 'invoice_price'  — נבחר מחיר חשבונית
  -- NULL             — לא היה פער / לא מקושר ל-PO

-- הוספת שדה על goods_receipt_items לתיעוד פריט לא בהזמנה:
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS po_match_status TEXT;
  -- 'matched'        — פריט תואם ל-PO
  -- 'not_in_po'      — פריט לא בהזמנה, התקבל
  -- 'returned'       — פריט לא בהזמנה, הוחזר
  -- NULL             — קבלה לא מקושרת ל-PO
```

---

## 10. מה לא נכנס לפאזה 8

| פיצ'ר | למה לא | מתי |
|--------|---------|-----|
| Camera scan ישירות (בלי upload) | דורש WebRTC integration | Future |
| Auto-scan ברגע upload (בלי לחיצת כפתור) | עובד צריך שליטה | Future |
| תרגום אוטומטי צבעים (English → Hebrew) | שימושי אבל scope creep | Future |
| Smart reorder (AI מציע הזמנה חדשה) | מודול נפרד | Future |
| ספק שמשלוח שלו תמיד שונה מההזמנה — alert | Analytics | Future |
| Split receipt (חצי מהסחורה עכשיו, חצי אח"כ) | PO partial כבר מכסה | — |
| Multi-currency OCR (זיהוי מטבע ממסמך) | OCR כבר מחזיר currency | ✅ קיים |

---

## 11. Verification Checklist

### OCR:
- [ ] כפתור "🤖 סרוק" מופיע אחרי upload
- [ ] כפתור מוסתר אם אין קובץ
- [ ] Loading state בזמן סריקה
- [ ] ספק ממולא אוטומטית → dropdown נבחר
- [ ] סוג מסמך ממולא
- [ ] מספר מסמך ממולא
- [ ] PO מוצע אם קיים
- [ ] Confidence indicators על כל שדה

### Item matching:
- [ ] פריט קיים → matched + barcode
- [ ] פריט חדש (מותג מוכר, דגם חדש) → new + auto-barcode
- [ ] פריט לא מזוהה → unknown + red indicator
- [ ] עובד יכול לתקן כל שדה
- [ ] עובד יכול לדלג על פריט unknown

### PO comparison:
- [ ] דוח התאמה מוצג כשקבלה מקושרת ל-PO
- [ ] פריטים תואמים מוצגים ב-✅
- [ ] חוסר מוצג ב-⚠️ עם כמויות
- [ ] פער מחיר מוצג עם שתי אפשרויות בחירה
- [ ] פריט לא בהזמנה מוצג ב-🔴 עם קבל/החזר
- [ ] PO status מתעדכן נכון (partial/received)
- [ ] הערות על PO מתעדכנות

### Price decisions:
- [ ] "קבל במחיר PO" → cost_price = PO price, הערה על מסמך
- [ ] "קבל במחיר חשבונית" → cost_price = invoice price
- [ ] ברירת מחדל = מחיר חשבונית
- [ ] price_decision נשמר ב-goods_receipt_items

### Not-in-PO items:
- [ ] "קבל בכל זאת" → פריט נכנס למלאי + הערה
- [ ] "החזר לספק" → supplier_return נוצר + פריט לא נכנס
- [ ] po_match_status נשמר ב-goods_receipt_items

### Prepaid migration:
- [ ] receipt-debt.js לא שואל על קיזוז
- [ ] מסמך ספק נוצר בלי קיזוז אוטומטי
- [ ] suppliers-debt מציג badge "עסקת מקדמה"
- [ ] כפתור "קזז מעסקה" עובד עם PIN
- [ ] Alert נוצר כשמסמך חדש + prepaid deal

### Learning:
- [ ] תיקון ספק → נשמר ב-corrections
- [ ] תיקון item match → נשמר ב-hints
- [ ] סריקה שנייה מאותו ספק → דיוק משופר
- [ ] ocr_extractions record נוצר

### Regression:
- [ ] קבלה ידנית (בלי OCR) עובדת בדיוק כמו קודם
- [ ] קבלה בלי PO עובדת
- [ ] קבלה עם PO (בלי OCR) עובדת
- [ ] File upload עובד
- [ ] Confirm → inventory + debt updates עובד
- [ ] Prepaid deals עובדים מ-suppliers-debt
- [ ] כל הדפים טוענים בלי errors

---

## 12. סדר ביצוע

```
Step 0  — בדיקת מצב: האם receipt-ocr.js קיים? מה בדיוק בנוי ומה לא?
Step 1  — כפתור OCR + חיבור ל-Edge Function (receipt-ocr.js)
Step 2  — Item matching logic + review UI (matched/new/unknown)
Step 3  — העברת prepaid question ל-suppliers-debt
Step 4  — PO comparison report (item matching + price decisions + not-in-PO)
Step 5  — Learning integration (corrections → templates)
QA      — Full regression + כל ה-verifications
```

כל step עצמאי — אפשר לעצור אחרי כל אחד ויש ערך.
