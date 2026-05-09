# פרומפט הפעלה — תיקון VAT 18%: DB + OCR alert

> העתק את כל מה שמתחת לקו ל-Claude Code על המכונה שלך.

---

טען את הסקיל `opticup-executor`.

## רקע

המע"מ בישראל הוא 18%. בדיקה גילתה שהקוד `getVatRate()` תקין כפי שהוא (default=0 הוא בכוונה — loud failure ל-tenants ללא קונפיג). הבעיה היא:
1. ייתכן ש-`tenant_config.vat_rate` ב-DB עדיין 17 או ריק עבור פריזמה/דמו.
2. `js/supabase-alerts-ocr.js:171` מסנן התראות עם hardcode `!== 17` — צריך 18.

## שלבים

### שלב 1 — בדיקת DB

הרץ שאילתה:
```sql
SELECT id, slug, name, ui_config->>'vat_rate' AS vat_rate
FROM tenants
WHERE slug IN ('prizma', 'demo')
ORDER BY slug;
```
(אם `vat_rate` יושב בעמודה אחרת, התאם את השאילתה לפי schema הנוכחי.)

דווח: מה הערך עבור כל אחד.

### שלב 2 — עדכון DB אם צריך

אם הערך הוא 17, ריק, או null עבור פריזמה או דמו — עדכן ל-18:
```sql
UPDATE tenants
SET ui_config = jsonb_set(ui_config, '{vat_rate}', '18')
WHERE slug IN ('prizma', 'demo')
  AND (ui_config->>'vat_rate' IS NULL OR ui_config->>'vat_rate' = '17');
```
(התאם את ה-JSONB path אם הסכמה שונה.)

אם הערך הוא 18 כבר — דלג, אין מה לעדכן.

### שלב 3 — תיקון OCR alert

קרא `js/supabase-alerts-ocr.js`. בשורה 171 (בערך) יש:
```js
... Number(vatRate) !== 17 ...
```
החלף ל:
```js
... Number(vatRate) !== 18 ...
```
(אם יש שם דפוסים נוספים של `17` באותו הקשר — תקן את כולם.)

### שלב 4 — בדיקה

1. `npm run verify:integrity` → exit 0.
2. רענן את ה-ERP בדפדפן (localhost:3000), היכנס לדמו, פתח מסך קליטת סחורה. ודא שה-VAT שמופיע ברשומה חדשה הוא 18% (אם הוא נטען מ-DB) או 0 עם warning ב-console (אם לא — לא קריטי, רק לוודא שהקוד חי).
3. אם יש מסך הגדרות tenant — ודא שמופיע 18% שם.

### שלב 5 — Commit

```
git add js/supabase-alerts-ocr.js
git commit -m "fix(saas): OCR alert filter expects 18% VAT (Israel current rate)

The OCR receipt scanner flagged invoices as 'unusual VAT' if rate != 17,
but Israel's VAT is 18% since 2025. Updated the threshold."
git push origin develop
```

עבור עדכון ה-DB — תיעוד בלבד בדיווח (לא commit), כי זה data change ולא code change.

### שלב 6 — דיווח

דווח חזרה:
- ערכי DB לפני ואחרי (פריזמה + דמו).
- האם ה-OCR alert תוקן.
- Commit hash.
- האם הבדיקה בדפדפן עברה.

## עצור על:

- אם הסכמה של `tenant_config` שונה ממה שתיארתי — עצור ותדווח, אל תנחש את המבנה.
- אם יש tenants נוספים מעבר לפריזמה ודמו — עצור ושאל לפני שאתה מעדכן אותם.
- אם השינוי ב-OCR alert יש לו השלכות נוספות (פונקציות אחרות שמסתמכות על 17) — עצור ותדווח.

---

*End of prompt.*
