# Automation Mockup B — Visual Flowchart

## איך הוא בנוי

- **המסך כולו = "מפת אוטומציות"** — לא טבלה, לא רשימה.
- **4 lanes אופקיים**, אחד לכל בורד: 📥 לידים נכנסים / 👥 רשומים / 📅 אירועים / ✅ נרשמים לאירוע. כל lane בצבע משלו.
- **Header של כל lane**: אייקון + שם בורד + ספירת חוקים + כפתור "+ חוק חדש".
- **כל חוק = שורה ויזואלית בתוך ה-lane**:
  - **Trigger node** (מימין): "ליד חדש נוצר" / "סטטוס משתנה ל-X" / "סטטוס אירוע משתנה ל-Y".
  - **חץ קישור** ◀.
  - **Action node** (משמאל): "שלח SMS+EMAIL מתוך תבנית Z → לנמענים W".
- **Lane עם הרבה חוקים** (אירועים = 8) — מסודר ב-grid דחוס: שורה לחוק, badges קטנים יותר.
- **חוק כבוי** = node שקוף (opacity 60%) עם אייקון ⏸ במקום ⚡.
- **לחיצה על node** = פתיחת panel עריכה (slide-in מימין, או modal). שינוי = INSERT/UPDATE מיידי.

## יתרונות

1. **תמונת על-מצב מערכתית**: עין אחת רואה את כל ה-13 חוקים מאורגנים לפי בורד. שום ממשק אחר לא נותן את זה.
2. **Daniel ישר רואה איזה בורד "ריק" או "לא פעיל"** — לידים נכנסים רק עם 1 חוק = pop visually.
3. **גישה אינטואיטיבית להוספת חוק חדש**: רואים lane, לוחצים "+", זה מובן.
4. **קונספטית עוצמתית**: דניאל ראה Make/Zapier, יודע איך flowchart נראה. UX מוכר.
5. **Future-proof**: כש-step חוקים יותר מורכבים יוצרו (chain: אחרי SMS, חכה 2 ימים → שלח reminder), המסגרת קיימת.

## חולשות

1. **יקר לבניה — הכי כבד מבין השלוש.** Layout grid עם node positioning, slide-in panels, drag-drop אופציונלי, animations.
2. **Lane של אירועים (8 חוקים)** דחוס. Mobile = יורד לרשימה רגילה ממילא, אז המוטיב הויזואלי נעלם.
3. **הוספת תנאים מורכבים** (סינון לפי סטטוס ליד) דורשת sub-detail בתוך ה-node — או panel נפרד. לא תמיד יושב טוב על flowchart.
4. **קל לבנות 80%, קשה ל-100%**: נראה יפה ב-mockup, אבל edge cases (חוק חדש, גרירה, חוקים זהים, dropdown ארוכים בתוך panel) מאריכים את הזמן.
5. **State management מסובך**: כל שינוי = re-render של ה-lane המתאים, אופטימיזציות.

## איך הוא מטפל ב-4 קטגוריות הטריגר של Daniel

**מבני: 1 lane = 1 קטגוריה.** ההתאמה היא 1:1, exact:

| קטגוריה Daniel | Lane | צבע |
|---|---|---|
| A. שינוי סטטוס אירוע | 📅 אירועים | violet-50/200/700 |
| B. שינוי סטטוס ליד | 👥 רשומים | blue-50/200/700 |
| C. הרשמה למערכת (lead_intake) | 📥 לידים נכנסים | orange-50/200/700 |
| D. הרשמה לאירוע + סטטוס | ✅ נרשמים לאירוע | emerald-50/200/700 |

המבנה הויזואלי הוא ההסבר עצמו — אין צורך בלמדה.

## כמה זמן ייקח לבנות

**~28–40 שעות עבודה.** הכי גדול. שווה לשקול אם מצב מערכת זה מצדיק את ההשקעה.

| Sub-task | שעות |
|---|---|
| Lanes layout: 4 lanes × responsive (lg= horizontal, mobile= stacked) | 3–4 |
| Node component: trigger + action variants × hover/active/disabled states | 4–5 |
| Render בתוך lane דחוס (אירועים, 8 חוקים) — grid כפול-עמודות, mini-rows | 3–4 |
| Slide-in panel עריכה (או fallback ל-modal) | 3–5 |
| Add-rule mini-wizard בתוך ה-lane (פותח node ריק עם עורך) | 3–4 |
| Drag-drop אופציונלי (להזיז חוק בין lanes — לרוב לא ייתכן, אבל אם רוצים לאפשר) | 4–6 (skip-able) |
| Drag-drop של node "+ palette" → lane (אם רוצים visual creation) | 3–5 (skip-able) |
| Edit-in-place: שינוי תבנית, ערוצים, נמענים — INSERT/UPDATE/render-update | 2–3 |
| Disabled state visual + toggle | 1 |
| QA — בדיקה של כל קומבינציה על demo, performance עם lanes צפופים | 2–3 |
| RTL polish + mobile fallback | 2 |
