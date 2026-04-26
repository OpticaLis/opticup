# Templates Mockup B — Stacked Accordion

## איך הוא בנוי

- **Sidebar**: כמו ב-Mockup A — רשימה לפי base slug עם תגי ערוצים.
- **Editor**: 3 סקציות אקורדיון ערומות אנכית, אחת לכל ערוץ (SMS / WhatsApp / אימייל).
  - **כל סקציה היא "קוביה" עצמאית** עם:
    - Header צבעוני (sky/emerald/amber) עם איקון, שם הערוץ, וטוגל "ערוץ פעיל".
    - Body editor (אם הסקציה פתוחה).
    - Preview קטן בתחתית הסקציה.
  - **פתיחת/סגירת סקציה בלחיצה**. אפשר לפתוח כמה במקביל — נוח להשוואה.
  - סקציה "לא פעילה" (checkbox מבוטל) — נצבעת אפור ושוליים מעומעמים, בלתי ניתנת לעריכה עד שמסמנים "פעיל".
- **Header** של התבנית (שם + שפה + slug) במלבן נפרד מעל הסקציות.
- **Action bar** בתחתית: שמור הכל / טיוטה / מחק.

## יתרונות

1. **השוואה ויזואלית מיידית**: פותחים את כל הסקציות הפעילות, רואים את כל הגרסאות — אורך SMS מול אורך אימייל, אילו משתנים בכל אחד.
2. **קונספט "ערוצים אופציונליים" ברור מאוד**: התוגל "ערוץ פעיל" מודגש בכל header. הבחירה "אין WhatsApp לתבנית הזו" קופצת לעיניים.
3. **טוב לאימייל**: סקציית האימייל ארוכה (HTML 10K+ תווים) — האקורדיון מאפשר לקפל אותה כשמסיימים לערוך.
4. **שורה אחת ב-DB לכל ערוץ פעיל** — ב-save, מסתכלים על ה-checkbox של כל סקציה ומחליטים INSERT/UPDATE/DELETE.

## חולשות

1. **גלילה אנכית גדולה** במצב "כל הסקציות פתוחות" + body editor של אימייל. אורך כולל יכול להגיע ל-1500px.
2. **לחיצות מיותרות**: סקציה סגורה בברירת מחדל = משתמש חייב לפתוח לפני שעורך. אם מיד אחרי שמירה הסקציה נסגרת — חוזרים לפתוח.
3. **State management מורכב יותר**: open/closed × active/inactive × focused — 4 מצבים.
4. **Preview נפרד בכל סקציה** = קוד preview נכפל × 3 (אבל אפשר factor out).

## איך הוא מטפל ב-4 קטגוריות הטריגר של Daniel

**לא רלוונטי ישירות** (זהה ל-Mockup A — Templates ולא Automation).
ההבדל הוא רק במבנה העורך, לא בקשר לבורדים. תוסף "סינון לפי בורד" ב-sidebar אפשרי באותה מתודה.

## כמה זמן ייקח לבנות

**~12–16 שעות עבודה.**

| Sub-task | שעות |
|---|---|
| Refactor sidebar (זהה ל-Mockup A) | 2–3 |
| Section-per-channel rendering: state object {sms, whatsapp, email} עם open/active flags | 3–4 |
| Open/close logic + animation (max-height transition או simply hidden) | 1–2 |
| Body editor + Preview ×3 (factored out פעם אחת, נקרא 3 פעמים) | 3 |
| Save logic — diff between original and current state, INSERT/UPDATE/DELETE per channel | 2 |
| QA — מספר edge cases (כל הסקציות לא פעילות = שמירה ריקה? error?) | 1–2 |
| RTL polish + mobile (עוברים לטור אחד ממילא) | 1 |
