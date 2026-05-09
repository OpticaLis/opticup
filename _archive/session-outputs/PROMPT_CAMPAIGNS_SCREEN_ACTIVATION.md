# פרומפט הפעלה — SPEC: M4_CAMPAIGNS_SCREEN (v2 — מותאם לתשתית קיימת)

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

יש SPEC חדש מוכן ב-`outputs/M4_CAMPAIGNS_SCREEN_SPEC_DRAFT.md`. **זה v2** — נכתב מחדש אחרי שהתגלה שיש תשתית קיימת ב-DB. ה-v1 הקודם בוטל.

## שלב 1 — העברת ה-SPEC

1. ודא שהתיקייה כבר קיימת: `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/`
2. **אם יש בה קבצים מההרצה הכושלת הקודמת** (כמו commit d4044ef שלך) — מחק את התוכן (נשאיר רק את התיקייה הריקה).
3. העתק את התוכן של `outputs/M4_CAMPAIGNS_SCREEN_SPEC_DRAFT.md` לתוך:
   `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/SPEC.md`
4. **השמט את הסעיף האחרון** ("End of SPEC v2 draft. Author: opticup-strategic..." הוא בסדר — לא להשמיט אותו, רק את הסעיף שמתחיל ב-"How to use this draft" אם הוא קיים).
5. Commit:
   ```
   git add "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/SPEC.md"
   git commit -m "docs(spec): add M4_CAMPAIGNS_SCREEN v2 — adapted to existing infrastructure"
   ```

## שלב 2 — ניקוי שאריות מהריצה הקודמת

לפני ביצוע ה-SPEC, צריך לוודא שמצב ה-DB נקי משינויים מהריצה הקודמת:

1. הרץ:
   ```sql
   SELECT count(*) FROM crm_facebook_campaigns;  -- צריך להיות 0
   SELECT count(*) FROM crm_unit_economics;       -- צריך להיות 2 (prizma)
   SELECT count(*) FROM crm_ad_spend;             -- צריך להיות 88 (prizma, שיימחק במיגרציה)
   ```

2. ודא שאין שאריות של RLS policies שנוצרו בריצה הקודמת בפורמט canonical שלא היה קיים קודם — אם יש, זה תקין (לא צריך rollback, ה-SPEC ירדפיין אותם בכל מקרה).

## שלב 3 — ביצוע ה-SPEC

קרא את `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/SPEC.md` והרץ אותו end-to-end לפי Bounded Autonomy.

תקציר חשוב:
- **3 commits**: DB foundation → Edge Function → Frontend screen.
- **חופש לעדכן sxhemas:** Daniel אישר DROP+CREATE על `crm_ad_spend`, `crm_unit_economics`, `v_crm_campaign_performance`. הנתונים הקיימים יימחקו (88 ad_spend rows + 2 unit_economics rows) — Daniel אישר כי P7 יבצע ייבוא מחדש מ-Monday בכל מקרה.
- **OFF LIMITS:** הטבלה `crm_campaigns` (שמות מבלבל — היא בעצם templates של event-types, בשימוש פעיל ב-21 events). אסור לגעת בה.
- **Mockup C כמראה** (`outputs/campaign-mockups/C-dashboard-drill.html`).
- **לוגיקת החלטה:** multipliers (`kill_multiplier × gross_margin_pct/100 × 1000`).

## שלב 4 — סגירת הלולאה

לאחר 3 commits של הקוד:

1. כתוב `EXECUTION_REPORT.md` ו-`FINDINGS.md` (אם יש).
2. כתוב **בנוסף** את `outputs/MAKE_SCENARIO_FB_CAMPAIGNS_SPEC.md` עבור Daniel — מסביר איך לבנות Make scenario:
   - 3 מודולים: Facebook Insights → JSON aggregator → HTTP POST.
   - URL של ה-EF.
   - Schema של ה-payload (מ-§8.2 של ה-SPEC).
   - תדירות: כל 4 שעות.
3. Commit את הריטרוספקטיבה.
4. דווח חזרה: hashes של 4-5 הקומיטים, מה עבר, מה נשאר פתוח.

## עצור על:

- כל סטייה מ-stop-triggers ב-§5 של ה-SPEC.
- אם cross-reference grep מצא קוד פעיל שמשתמש בטבלאות שלפני ה-DROP — עצור.
- אם `crm_campaigns` (בלי `_facebook_`) מופיע באיזה DDL מוצע — עצור מיד, זאת הטבלה הלא נכונה.
- אם `js/shared.js` נדרש לעדכון FIELD_MAP — עצור (יש דחיית M4-DEBT-P18-01).
- אם cross-tenant data שייך ל-tenant אחר נחשף — עצור.

---

*End of prompt.*
