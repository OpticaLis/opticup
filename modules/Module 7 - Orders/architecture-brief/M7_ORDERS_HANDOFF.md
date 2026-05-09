# M7 — Orders — Handoff to Next Session

**תאריך:** 2026-05-06
**מצב:** הסשן הקודם נעצר לפני התחלת מסודרת. M7 ייפתח בסשן ייעודי חדש.

---

## למה סשן ייעודי

M7 מורכב משאר המודולים:
- 9,805 הזמנות ב-OpticPlus, 146 עמודות בטבלה השטוחה.
- 25 וריאנטי דוחות (rp_order_*).
- שלבי-מעבדה משולבים.
- 12 קטגוריות-תיוג.
- תמחור עם הנחה-יחסית מעדשות-למסגרת.
- זוג-כפול (17% מהנפח).
- 7 סוגי-מסמכים שנגזרים מהזמנה (Daniel הראה ב-Miro: A=הקפאה-בחוץ, B/C/D=ביקורות, E=טופס-תשלום, F=קבלה, G=הצעת-מחיר).

ההחלטות-האסטרטגיות יידרשו ריכוז מלא — לכן סשן נפרד.

---

## הקשר שצריך לסשן הבא

הסשן החדש פותח כ-Main Strategic. הוא צריך לקרוא:

1. **`_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md`** — תוכנית-אם.
2. **`modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_BRIEF.md` (v2)** — חוזה M7→M5.
3. **`modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTIONS_BRIEF.md` (v1)** — חוזה M7→M6 (הזמנה ממשת מרשם).
4. **קובץ זה** — להבין מאיפה ממשיכים.
5. **סקיצת-Miro של Daniel** (URL נשמר בצ'אט הקודם) — צריך לראות את התמונה לפני התחלה. אם אין גישה → לבקש צילום-מסך.
6. **`.claude/skills/opticup-main-strategic/SKILL.md`** — לקרוא את **כל הפטרנים P1–P22**, במיוחד:
   - **P22** (פורמט קשיח לכל שאלה — 3 שורות, אין נתוני-אודיט בצ'אט, אין אפשרויות א'/ב', אין מילים-טכניות).
   - **P19** (configuration-driven — טבלאות עם capability flags במקום enums).
   - **P21** (pressure-test entity boundaries).
   - **P17** (Foundation-first, defer rich behavior).

---

## רעיון-מרכזי שכבר נסגר ב-M7 (מהסקיצה של Daniel)

הזמנה היא **ישות-נתונים-אחת** שיוצרת **משפחה של מסמכים** (7 סוגים: A-G). כלומר:
- בסיס-נתונים יחיד עם שורת-כותרת + פריטים.
- 7 תבניות-תצוגה שמופקות לפי stage או מטרה (הצעת-מחיר, ביקורת-מעבדה, קבלה, וכו').

זה מה שצריך לאשר אצל Daniel בשאלה הראשונה של הסשן החדש (formatted by P22).

---

## המלצת-המשך (כיוון לסשן החדש)

הסשן החדש ייפתח עם:

**שאלה ראשונה:** האם להזמנה יש בסיס-נתונים אחד עם 7 תבניות-תצוגה, או שכל מסמך הוא ישות-נפרדת?
**ההמלצה:** בסיס-נתונים אחד עם 7 תבניות.
**הסיבה:** שינוי בהזמנה לא דורש סנכרון בין 7 רשומות.

אחרי האישור — לעבור לגוש 1 (ישויות):
- האם הזמנה = ראש + פריטים, או הזמנה-שטוחה?
- מה הקשר בין פריט-בהזמנה למרשם?
- שלבי-מעבדה — פר-פריט או פר-הזמנה?
- זוג-כפול — איך מתבטא במבנה?

לאחר מכן: גוש 2 (חוזים), גוש 3 (דפוסים), גוש 4 (סיכונים), כתיבת brief לקובץ.

---

## הוראות פתיחה לסשן החדש (העתק לדניאל)

```
אתה האחראי על כל הפרוייקט. אתה ה-Main Strategic.

קרא:
1. _archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md
2. modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_BRIEF.md (v2)
3. modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTIONS_BRIEF.md (v1)
4. modules/Module 7 - Orders/architecture-brief/M7_ORDERS_HANDOFF.md (הקובץ הזה)
5. .claude/skills/opticup-main-strategic/SKILL.md — את כל הפטרנים, במיוחד P22 (פורמט-קשיח לשאלות).
6. .claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md (היסטוריה).

אנחנו ממשיכים מאיפה שעצרנו: M7 (Orders) — Architecture Brief.
ב-M7 כבר ראיתי את סקיצת ה-Miro של Daniel ויש רעיון-מרכזי מתועד ב-handoff.

תקפיד: P22 — שאלות בפורמט 3-שורות, ללא נתוני-אודיט בצ'אט, ללא אפשרויות א'/ב', ללא מילים-טכניות (טבלה/שדה/RPC/View/enum). הסיבה לקיומו: דניאל הוא בעלים אסטרטגי, לא מפתח.

תתחיל בשאלה הראשונה של גוש 1 — האם הזמנה היא בסיס-נתונים אחד עם 7 תבניות, או 7 ישויות נפרדות?
```

---

## סיכום ההישגים בסשן הזה (M5 + M6 + תיקון מהותי)

**Architecture Briefs נכתבו (2):**
- M5 v2 — Customers + households + health_funds + tenant_languages. כולל **איחוד crm_leads ל-customers** (תיקון מהותי mid-process). consent = 4 flags עצמאיים.
- M6 v1 — eye_exams + prescriptions_glasses + prescriptions_contacts + prescription_types. State-machines. recall split fact-vs-rule (M6=עובדה, M12=כלל).

**Patterns חדשים שהוספתי לסקיל (P17–P22):**
- P17 — Foundation-first, defer rich behavior.
- P18 — Audit הוא הרשימת-שדות, ה-Brief הוא המבנה.
- P19 — Configuration-driven by default; enum רק ל-state-machines וקודי-משפט.
- P20 — אין מילים-טכניות בצ'אט (חלש; הוחלף ב-P22).
- P21 — Pressure-test boundaries with overlap stories.
- P22 — STRICT 3-line format לכל שאלה לדניאל.

**DECISIONS_LOG.md** — 13 entries חדשים, כל אחד עם lesson חוצה-סשנים.

**Master Plan §9** — עודכן עם סטטוס ה-Briefs.
