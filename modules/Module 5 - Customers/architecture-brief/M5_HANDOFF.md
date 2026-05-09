# M5 — Customers — Handoff to Next Session

**תאריך:** 2026-05-07
**מצב:** Architecture Brief v2 קיים מהסשן הקודם. סקיצת מסך-לקוח (5 לשוניות) **נוצרה והוסכמה** בסשן הזה. הצעד הבא הוא להעביר את ה-Brief מ-v2 ל-v3 שיכלול את החלטות-המסך החדשות, ואז להחליט על המודול הבא.

---

## מה נסגר בסשן הזה (2026-05-07)

### 1. M7 (Orders) — Architecture Brief סגור
- 6 סקיצות: 1 ראשית (`M7_ORDERS_FULL_MOCKUP_V6.html`) + 5 טפסים (Order Inspection · Task Form · Outside Framing · Frame Reservation · Repair Form).
- קטלוג טפסים (`M7_ORDERS_PRINT_FORMS.md`) עם "כללי-יסוד משותפים" בראש.
- Brief סופי (`M7_ORDERS_BRIEF.md` v1) — 11 סעיפים, 17 החלטות-נעולות, 8 חוזים cross-module.

### 2. M5 (Customer Card) — סקיצת-מסך הוסכמה
**5 לשוניות:**
1. **פרטים** — פרטי-לקוח + הערות-עסקיות + הערות-רפואיות (Medical Q. + Diagnostics ב-sub-tabs) + **בלוק Queue** (חשוף מ-M14 — תור-בדיקה).
2. **תפקודי ראייה** — בדיקת-ראיה מורחבת של האופטומטריסט (24 בדיקות: ortho/exo, AC/A, NRA, PRA, Bo/Bi, Push-Up, MEM, Stereopsis, וכו'). בורר תאריכי-בדיקות היסטוריות.
3. **בדיקות ראייה** — תצוגת-תקציר על מודול-מרשמים (M6). רשימת-מרשמים בשורות (תאריך · סוג · סטטוס · אופטומטריסט · R/L · תוקף · הערות · פעולות). "פתח ב-M6" עובר למסך-מרשם המלא של M6.
4. **הזמנות** — באנר → פותח את מסך-M7 המלא + תקציר 3 הזמנות.
5. **מסמכים** — מסמכים-רפואיים עם קטגוריות (מרשם-רופא · בדיקה-חיצונית · קופ"ח · אחר), העלאה / סריקה / מחיקה.

**החלטות-מפתח שננעלו:**
- "ערוך" כפתור-בכותרת, לא לשונית.
- שמירה אוטומטית בכל המסך (כמו M7).
- כותרת-עליונה אחידה בכל הלשוניות (שם + גיל + טלפון + פעולות-מהירות).
- Birthday auto-message דחוי למודול-תקשורת/אוטומציות העתידי.
- **מודול-מרשמים (M6) נפרד** מ-M5 — מאפשר scaling לענפים-עתידיים (שיניים/ווטרינריה).
- Queue ב-Details = surface על M14, לא בעלות.
- Docs storage = Supabase Storage Bucket פר-tenant, path בתבנית `tenant_id/customer_id/...` (ללא עברית).

---

## מה צריך לעשות בסשן הבא

### דחוף — לפני המעבר למודול הבא:
1. **לעדכן `M5_CUSTOMERS_BRIEF.md` מ-v2 ל-v3** — להוסיף את החלטות-המסך:
   - מבנה 5-הלשוניות.
   - חוזים מול M6 (View `v_customer_prescriptions_summary`, View `v_customer_vision_function_history`).
   - חוזים מול M14 (View `v_customer_queue_position`, RPCs `add_to_queue`/`remove_from_queue`/`promote_in_queue`).
   - Docs storage architecture.
   - Notes architecture (`customer_notes` עם `note_type` enum).
2. **לעדכן `M6_PRESCRIPTIONS_BRIEF.md` מ-v1 ל-v2** — להוסיף את החוזים שצריך לחשוף לכרטיס-הלקוח.

### בלוקים שנשארו ב-M5/M6 שלא נסגרו במלואם:
- **M5 — מסך-יצירת-לקוח-חדש** (לא בכרטיס-הלקוח, אלא הפלואו של "+ לקוח חדש"). לא תוכנן.
- **M5 — מסך-חיפוש/רשימת-לקוחות** (איך אופטומטריסט מוצא לקוח קיים, מסכי-סינון). לא תוכנן.
- **M6 — מסך-מרשם המלא** (מה שלשונית-3 פותחת — שם נמצאים כל השדות הפרטניים של המרשם, ה-R/L per-eye, ה-keratometer לעדשות-מגע, ניהול recall). לא תוכנן.
- **M6 — פלואו "צור מרשם מתפקודי-ראייה"** (כפתור שמופיע בלשונית 2). לא תוכנן.

---

## המלצה לסדר-המשך

### אופציה A — להמשיך לסיים M5+M6 לעומק (מומלץ)
**רצף:** מסך-יצירת-לקוח-חדש → מסך-חיפוש-לקוחות → מסך-מרשם המלא של M6 → עדכון Briefs ל-v3/v2 → ואז M14 (Queue+Appointments) כי הוא חשוף בכרטיס.
**יתרון:** משאיר את M5/M6 שלמים לפני שעוברים מודול. ה-Module Strategist של M5 ו-M6 יוכלו להתחיל לכתוב SPECs בלי חזרות.
**חסרון:** M14 עדיין לא תוכנן — אבל זה בסדר כי surface אחד שלו (Queue) כבר ידוע.

### אופציה B — לעבור ל-M14 (Queue + Appointments) קודם
**יתרון:** Queue כבר חשוף בכרטיס-לקוח, אז סיגרנו את החוזה. עדיף לסגור גם את הצד-השני.
**חסרון:** משאיר חורים ב-M5/M6.

### אופציה C — לעבור ל-M8 (Payments)
**יתרון:** M7 מחזיק חוזה ל-M8 (`v_order_payment_summary`, אירוע "תשלום ראשון"). זיכרון M7 עוד טרי.
**חסרון:** M5/M6 פתוחים.

### ההמלצה שלי: אופציה A.
הסיבה: המודולים שכבר נגענו בהם (M5, M6, M7) קשורים-הדדית. עדיף לסגור את כל הכרטיס-לקוח-לחלוטין (כולל מסך-יצירה, מסך-חיפוש, מסך-מרשם המלא של M6) לפני שעוברים מודולים חדשים. זה "אזור-הליבה" של המוצר — כל היתר נסמך עליו.

אם הזמן קצר: **אופציה B** קצרה יותר (M14 קטן יחסית) ותסגור חוב.
**אופציה C** רק אם החשש הוא שזיכרון M7 ידהה — אבל ה-Brief של M7 מתועד היטב, אז לא חייבים למהר.

---

## הוראות פתיחה לסשן הבא

משפט-יחיד מספיק:

```
אתה ה-Main Strategic של פרוייקט Optic Up. ממשיכים מ-M5_HANDOFF.md.
```

הסקיל `opticup-main-strategic` ייטען אוטומטית (trigger על "Main Strategic / האסטרטג הראשי / האחראי על כל הפרוייקט"). ה-bootstrap שלו קורא לבד את: MASTER_LIVE_PLAN + DECISIONS_LOG + CLAUDE.md + MEMORY.md. ה-handoff (הקובץ הזה) יוביל אותו לכל היתר.

**אם הסקיל לא נטען אוטומטית** (קרה בסשן הקודם) — תזכיר לו: "טען את הסקיל opticup-main-strategic". הוא יקרא את ה-SKILL.md ויפעל לפיו.

---

## קישורים מרכזיים

- Master Plan: `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md`
- Customer Card mockup: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5_CUSTOMER_CARD_MOCKUP.html`
- M5 Brief v2: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5_CUSTOMERS_BRIEF.md`
- M6 Brief v1: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M6_PRESCRIPTIONS_BRIEF.md`
- M7 Brief v1: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M7_ORDERS_BRIEF.md`
- M7 main mockup: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M7_ORDERS_FULL_MOCKUP_V6.html`
- M7 5 forms: `M7_FORM_*_MOCKUP.html`
- M7 forms catalog: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M7_ORDERS_PRINT_FORMS.md`
- DECISIONS_LOG: `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md`

---

*נוצר 2026-05-07 בסיום הסשן. בסשן הבא — להמשיך לפי המלצה (אופציה A) או לפי בחירת Daniel.*
