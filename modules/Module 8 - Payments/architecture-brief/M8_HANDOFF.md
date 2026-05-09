# M8 — Payments — Handoff לסשן הבא

**תאריך:** 2026-05-07
**מצב:** טרם התחיל. Daniel ביקש מחקר-מעמיק לפני כל החלטה אסטרטגית.

---

## הקשר אסטרטגי

M5 (Customers v3), M6 (Prescriptions v2), M7 (Orders v1), M14 (Appointments v1), M15 (Queue v1) — סגורים ברמת Architecture Brief.

נשארים: **M8 Payments**, M9 Lab, M11 Reports, M12 Communications, M13 Loyalty.

המודול הבא לפי Master Plan = M8 (חוזר ל-core triplet — M7 → M8).

---

## הוראת-Daniel (2026-05-07, סוף-סשן)

> "אני רוצה להמשיך בסשן חדש של COWORK עם M8. בהתחלה אני רוצה שיעשה המון שיעורי בית לפני שהוא מתחיל את המודול הזה. מצידי שישלח את הקלאוד קוד או בעצמו יעשה מחקר על מה שקיים בשוק ואיך הוא בונה את זה בצורה ההכי מקצועית וההכי 'גמישה' שאפשר שיהיה מותאם לכל סוג של קופה רושמת."

תרגום:
- **לא** מתחילים שאלות-אסטרטגיות מיד.
- **כן** מתחילים בשליחת subagent למחקר-מעמיק.
- **המטרה:** Provider Adapter Pattern — M8 עצמו גמיש, adapters פר-קופה.

---

## הקונטקסט שכבר ידוע

### מ-Master Plan §4 (M8 requirements):

- מאחד `tb_kabala` (BE) + `tb_credits` (FE, 1,160 רשומות) מ-OpticPlus.
- 8 סוגי תשלום: אשראי 66%, מזומן 28%, העברה, שיק, ביט, ירד-ממשכורת, נסגר (status), ניכוי.
- post-dated (לצ'קים — `tpiraon`).
- adjustments / reversals עם audit trail.
- **Gama Pay** (non-POS, סליקה דיגיטלית) + **Z Credit / Linet** (POS בחנות) — Launch Decision #5 Apr 27.
- חשבונית/קבלה (אבל **לא** עוסק מורשה — מותאם לקיימות פריזמה).

### מ-M7 Brief (חוזה M7 ↔ M8):

- M7 חושף `v_order_payment_summary` ל-M8.
- אירוע "תשלום ראשון" מטריג שינוי-state ב-M7 (draft → active).
- Pattern 14 רלוונטי כאן: order.status ↔ payment-aggregate-status (יישום-עתידי).

### מ-Decision Log:

- Migrations git drift (M4-DEBT-01) — תשלומים-קיימים-בפריזמה לא במיגרציה רגילה. צריך SPEC נפרד.
- Daniel's discipline post-cutover: SPEC + Foreman + Executor flow on every change.

---

## מחקר נדרש (8 קטגוריות)

ה-subagent צריך לחקור:

1. **שוק תוכנות-הקופה בישראל**
   - Z Credit / Linet / CardCom / ICS / יחיד / Heshev — מי מציע מה.
   - APIs פתוחים? פורמטים? handshake-protocols (REST/SOAP/proprietary).
   - חיבור-תוכנה-לחומרה (USB/Bluetooth/IP).

2. **תקני-תשלום בינלאומיים**
   - Stripe / PayPal / Adyen / Square — איך הם מבנים Provider Adapter Pattern.
   - PCI-DSS compliance — מה אנחנו לא יכולים לאחסן ב-DB שלנו.
   - Tokenization — איך לא לאחסן מספרי-כרטיס.

3. **דרישות רשות-המסים בישראל**
   - חשבונית-מס דיגיטלית — תקנות 2024+.
   - מספרי-קבלה ייחודיים, שמירה-7-שנים, חתימה-דיגיטלית.
   - **חשוב:** פריזמה היא לא-עוסק-מורשה היום. אבל tenant-2 כן יכול להיות. ארכיטקטורה צריכה לתמוך בשניהם.

4. **תשלומים-מורכבים**
   - תשלומים-בתשלומים (installments).
   - צ'קים פוסט-דייט.
   - Recurring (חיוב-חודשי — לא היום, אבל אולי מועדון M13).
   - Split payments (חצי-מזומן-חצי-אשראי).

5. **השוואת ארכיטקטורות**
   - Stripe Connect vs PayPal Marketplace vs מודל-עצמאי.
   - Payment Gateway vs Payment Service Provider vs Acquirer.
   - מה מתאים ל-Optic Up multi-tenant.

6. **Gama Pay + Z Credit + Linet ספציפית**
   - APIs (אם פתוחים).
   - Documentation גלוי.
   - מה הם מצפים מאיתנו (כמערכת-לקוח-שלהם).

7. **Edge-cases**
   - Partial refunds, chargebacks, voids.
   - Tip handling.
   - Currency conversion (אם tenant חו"ל יום-אחד).
   - Network failures באמצע-סליקה.

8. **דוחות-תשלומים שאופטומטריסטים מצפים**
   - סוף-יום-קופה.
   - פר-אופטומטריסט / פר-משמרת.
   - פר-סוג-תשלום.
   - פר-קופ"ח (לחישובי-החזר).
   - חודשי / רבעוני / שנתי.

---

## הפלט הצפוי מ-subagent

דו"ח של 1500-2000 מילה, מתומצת, בסעיפים-מסומנים.

לכל קטגוריה:
- **מצב-נוכחי בשוק** (1-2 פסקאות).
- **מה זה אומר עבורנו** (המלצה אחת קצרה).
- **רף-החלטה** (אם יש איזשהו דבר שצריך החלטת-Daniel).

הדו"ח **לא** מדבר על שדות-DB ספציפיים. רק עקרונות, חוזים, dependencies, וריאנטים.

---

## איך לפתוח את הסשן הבא (TL;DR)

הדבק את זה בתיבה של Cowork:

```
אתה ה-Main Strategic של פרוייקט Optic Up. ממשיכים מ-M8_HANDOFF.md.
```

זה מספיק. הסקיל `opticup-main-strategic` ייטען אוטומטית, יקרא את MASTER_LIVE_PLAN + DECISIONS_LOG + MEMORY + CLAUDE.md, ואת ה-handoff הזה. הוא ידע:
- איזה מודולים נסגרו.
- מה הצעד הבא (M8).
- שצריך *לפתוח עם subagent* ולא להתחיל שאלות-מיד (Pattern P23).
- 8 קטגוריות-מחקר.
- מה הפלט הצפוי.

---

## מה ה-Main-Strategic-של-הסשן-הבא צריך לעשות (בסדר)

1. **קריאה ב-bootstrap** — Master Plan + DECISIONS_LOG + MEMORY + CLAUDE.md (אוטומטי לפי SKILL.md).
2. **קריאת ה-handoff הזה.**
3. **שליחת subagent מחקר** (general-purpose) עם 8 הקטגוריות לעיל.
4. **המתנה לתוצאות** (30-45 דקות).
5. **עיבוד הדו"ח** — חיפוש 3-5 רפי-החלטה אסטרטגיים.
6. **שאלה ראשונה ל-Daniel** — לפי Pattern P22 (משפט-יחיד עם המלצה ושאלה).
7. **המשך flow רגיל** של Architecture Brief (כפי ש-M14, M15).

---

## קישורים מרכזיים

- Master Plan: `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md`
- M5 Brief: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5_CUSTOMERS_BRIEF.md` (v3)
- M6 Brief: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M6_PRESCRIPTIONS_BRIEF.md` (v2)
- M7 Brief: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M7_ORDERS_BRIEF.md` (v1)
- M14 Brief: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M14_APPOINTMENTS_BRIEF.md` (v1)
- M15 Brief: `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M15_QUEUE_BRIEF.md` (v1)
- DECISIONS_LOG: `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md`
- SKILL: `.claude/skills/opticup-main-strategic/SKILL.md` (עם Pattern P23 חדש)
- Auto-memory: `MEMORY.md` (תזכורות פר-יום של פרוייקט)

---

*נוצר 2026-05-07 בסוף סשן ארוך. סשן הבא מתחיל עם research-first protocol.*
