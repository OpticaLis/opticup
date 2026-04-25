# Templates Mockup C — Side-by-Side

## איך הוא בנוי

- **רשימת תבניות = pill bar אופקי בראש** (במקום sidebar). כי העורך תופס מסך רחב, לא נשאר מקום לעמודה צידית.
- **Header של תבנית** (שם + שפה + slug + action buttons) בשורה משלו מעל ה-3 עמודות.
- **3 עמודות ערוך זה ליד זה** — SMS / WhatsApp / אימייל:
  - **Header צבעוני** מלא (לא רק accent) עם אייקון + שם ערוץ + checkbox "פעיל".
  - **Body editor + Preview קטן** בתוך כל עמודה.
  - **עמודה לא פעילה** = empty-state אפור עם קריאה "סמן 'פעיל' להפעלה".
- כל ה-3 עמודות מיושרות לפי גובה (flex 1).
- **דורש breakpoint רחב**: ב-`lg:` (1024px) זה 3 עמודות, ב-mobile זה falls back to stacked (similar to Mockup B).

## יתרונות

1. **השוואה אולטימטיבית**: כל 3 הערוצים בשדה ראייה אחד, באמת אפשר להבחין מיד אם המסר עקבי.
2. **עריכה מקבילה**: אפשר לכתוב SMS, ובאותו זמן לראות מה נשאר באימייל. שינוי של משתנה קופץ לעיניים בכל 3 העמודות (אם נבחר עיצוב כזה).
3. **רשימת התבניות בראש** (pill bar) משחררת את כל הרוחב למסך העורך — הרבה יותר מקום לעורך.

## חולשות

1. **דורש מסך רחב** (1280px+) באמת. בלפטופ קטן או tablet זה צפוף.
2. **מורכב לבנייה**: 3 textareas פעילים, 3 previews, sync של variables בין כולם, scroll פנימי בכל עמודה.
3. **אימייל HTML**: textarea של 10K תווים בעמודה צרה היא חוויה גרועה. אולי דורש "expand" / "fullscreen" mode ייעודי לעמודת האימייל.
4. **רשימת התבניות בראש** — עם 26+ תבניות, ה-pill bar יהיה ארוך ויחייב גלילה אופקית. פחות נוח מ-sidebar אנכי.
5. **State הכי מורכב**: focus יכול להיות בכל אחת מ-3 עמודות, undo per-column, save-all או save-per-column?

## איך הוא מטפל ב-4 קטגוריות הטריגר של Daniel

**לא רלוונטי ישירות** (זהה ל-A ו-B). אותה הצעה לסינון לפי בורד אפשרית ב-pill bar.

## כמה זמן ייקח לבנות

**~16–22 שעות עבודה.**

| Sub-task | שעות |
|---|---|
| Pill bar: scroll אופקי, מצב פעיל/לא פעיל, מענה למסך צר | 2 |
| Header + action bar (פשוט) | 1 |
| 3 עמודות עורך — layout עם flex/grid + responsive fallback | 2–3 |
| 3 body editors + 3 mini previews — factored out פעם אחת, instantiated 3 פעמים | 4–5 |
| Sync של variables בין העמודות (אם רוצים שינסור: שינוי משתנה ב-1 משפיע על כולם) | 2–3 |
| Empty state ל-עמודות לא פעילות + flow של הפעלה דינמית | 1–2 |
| Email column "expand to fullscreen" mode | 2–3 |
| QA — focus management, save semantics, mobile fallback | 2 |
| RTL polish + Tailwind tweaks | 1 |
