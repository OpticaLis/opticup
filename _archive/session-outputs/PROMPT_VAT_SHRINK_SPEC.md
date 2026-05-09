# פרומפט הפעלה — SPEC: M1_RECEIPT_PO_COMPARE_SHRINK

> העתק את כל מה שמתחת לקו ל-Claude Code על המכונה שלך.
> **חשוב:** הרץ את הפרומפט הזה רק אחרי שעדכון ה-VAT default ל-18% (PROMPT_VAT_DEFAULT_18) הסתיים והקומיט שלו עלה ל-develop.

---

טען את הסקיל `opticup-executor`.

יש SPEC מוכן ב-`outputs/M1_RECEIPT_PO_COMPARE_SHRINK_SPEC_DRAFT.md`. הוא כתוב כ-draft ע"י Cowork; המשימה שלך:

## שלב 1 — העברת ה-SPEC לתיקייה הנכונה

1. צור את התיקייה: `modules/Module 1 - Inventory/docs/specs/M1_RECEIPT_PO_COMPARE_SHRINK/`
2. העתק את התוכן של `outputs/M1_RECEIPT_PO_COMPARE_SHRINK_SPEC_DRAFT.md` לתוך:
   `modules/Module 1 - Inventory/docs/specs/M1_RECEIPT_PO_COMPARE_SHRINK/SPEC.md`
3. **השמט את הסעיף האחרון** של הקובץ ("How Daniel uses this draft") — הוא רלוונטי רק ל-Cowork. כל היתר נשאר.
4. Commit:
   ```
   git add "modules/Module 1 - Inventory/docs/specs/M1_RECEIPT_PO_COMPARE_SHRINK/SPEC.md"
   git commit -m "docs(spec): add M1_RECEIPT_PO_COMPARE_SHRINK to close 8/8 VAT cleanup"
   ```

## שלב 2 — ביצוע ה-SPEC

קרא את `modules/Module 1 - Inventory/docs/specs/M1_RECEIPT_PO_COMPARE_SHRINK/SPEC.md` והרץ אותו end-to-end לפי Bounded Autonomy. ה-SPEC כולל הכל: success criteria, stop triggers, commit plan, QA paths.

תקציר מהיר של מה שהוא עושה:
- מוחק שורה אחת (קומנט אסתטי בשורה 2 של `receipt-po-compare.js`) כדי לפנות מקום.
- מחליף את ה-`0.17` הקבוע בשורה 343 ל-`getVatRate() / 100`.
- מאמת בדפדפן שהזרימה של PO comparison עובדת.
- Commit אחד.

## שלב 3 — סגירת הלולאה

אחרי שהקוד עלה:
1. כתוב `EXECUTION_REPORT.md` ו-`FINDINGS.md` (אם יש) באותה תיקייה.
2. Commit את הריטרוספקטיבה.
3. דווח חזרה: hashes של 3 הקומיטים (SPEC, code, retro), כמה קריטריונים עברו, ואם יש ממצאים פתוחים.

## עצור על:

- כל סטייה מ-stop-triggers ב-§5 של ה-SPEC.
- אם הסריקה של VAT default (PROMPT הקודם) לא הושלמה ב-develop — עצור, אל תתחיל. תדווח.

---

*End of prompt.*
