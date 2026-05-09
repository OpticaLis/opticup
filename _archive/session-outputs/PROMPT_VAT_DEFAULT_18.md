# פרומפט הפעלה — עדכון VAT default מ-17% ל-18%

> העתק את כל מה שמתחת לקו ל-Claude Code על המכונה שלך.

---

טען את הסקיל `opticup-executor` ובצע את המשימה הבאה.

## רקע

המע"מ בישראל הוא 18% (לא 17%). ה-default ב-`getVatRate()` שנוסף הלילה הוא 17% — זה צריך להיות 18%. בנוסף — סרוק את הריפו לוודא שאין hardcode נוסף של 17 או 0.17 שחמק (הסריקה של הלילה ניקתה 7 מתוך 8 callsites, ה-8 דחוי ל-SPEC נפרד).

## שלבים

1. קרא את `js/shared.js` ומצא את הפונקציה `getVatRate()`. החלף את ה-default מ-17 ל-18.

2. הרץ סריקה כוללת:
   ```
   grep -rn "0\.17\|VAT.*17\|vat.*17" --include="*.js" --include="*.ts" --include="*.html" .
   ```
   - התעלם מ-`receipt-po-compare.js:343` (זה ה-callsite הדחוי, יטופל ב-SPEC נפרד אחר כך).
   - התעלם מקבצי docs/markdown/spec.
   - אם נמצאו hardcodes נוספים בקוד פעיל — החלף ל-`getVatRate() / 100` (אם המספר הוא 0.17) או `getVatRate()` (אם המספר הוא 17 כאחוז).
   - אם לא נמצא כלום נוסף — מצוין, רק ה-default הוחלף.

3. בדיקה אחרי השינוי:
   - `npm run verify:integrity` חייב להחזיר exit 0.
   - פתח את הריפו בדפדפן (localhost:3000), היכנס ל-tenant הדמו, פתח כל מסך שמשתמש במע"מ (קליטת סחורה / חוב), ודא שהמספר שנראה הוא תקין (18%, לא 17%, לא NaN).

4. Commit אחד:
   ```
   git add js/shared.js [+ כל קובץ נוסף ששינית]
   git commit -m "fix(saas): VAT default to 18% (Israel current rate); replace any remaining 17% hardcodes

   getVatRate() default was 17 from overnight setup; Israel VAT is 18% since
   2025. Tenants with vat_rate set in DB are unaffected (they read from DB);
   only the fallback default changes. Also swept repo for any remaining
   hardcoded 17/0.17 values; replaced with getVatRate() helper."
   git push origin develop
   ```

5. דווח חזרה: כמה קבצים השתנו, מה השם של הקומיט hash, ומה תוצאת הסריקה (כמה hardcodes נמצאו, אם בכלל).

## עצור על:

- אם הסריקה מוצאת hardcode במקום שלא ברור איך לטפל — תשאל לפני שינוי.
- אם הבדיקה בדפדפן מראה NaN, undefined, או 0 — תעצור ותדווח.
- אם `verify:integrity` נכשל — תעצור.

---

*End of prompt.*
