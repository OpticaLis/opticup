# SuperSale Make Scenarios — Review Queue

> **הוראות לצ'אט חדש:**
> קרא את `campaigns/supersale/CLAUDE.md` ואת הקובץ הזה.
> עבור על כל סנריו ברשימה, פתח את קובץ התיעוד, והצג לדניאל את הפלואו בצורה ברורה לאישור.
> לכל סנריו: הצג את ה**מצב הקיים** (מה Make עושה היום, כולל הודעות מדויקות) ואת ה**כיוון למערכת חדשה**.
> דניאל לא מפתח — תציג את זה ברמה עסקית, לא טכנית.
> אחרי שדניאל מאשר — סמן ✅ ליד הסנריו ברשימה הזו.

---

## סנריואים לאישור — ✅ כולם אושרו (7/7, אושר 2026-04-20)

### 1. ✅ Scenario 5A — פתיחת אירוע ושליחת הודעות (CORE)
**קובץ:** `make/scenario-5a-open-event.md`
**בקצרה:** כשפותחים הרשמה לאירוע — שולח SMS + Email לכל הלידים שממתינים. כולל הודעת "יפתח מחר" ו"נסגר". תומך בפילטר לפי Interest.

### 2. ✅ Scenario 1B — Send Emails / Register Master Boards
**קובץ:** `make/scenario-1b-send-emails.md`
**בקצרה:** שני מסלולים: (א) מייל "תודה שאישרת תקנון" אחרי הרשמה, (ב) שליחת קישור הרשמה לאירוע ב-SMS + Email. עברית + רוסית.

### 3. ✅ Scenario 2 — רישום משתתפים לאירוע
**קובץ:** `make/scenario-2-register-attendees.md`
**בקצרה:** הסנריו הכי פעיל (1,734 ops). רישום אוטומטי (בלי מספר אירוע) או ידני (עם מספר). כולל סנכרון ל-Facebook Audience ודופליקט ב-DONE group.

### 4. ✅ Scenario 0B — Attendees Acceptance (אישור הגעה)
**קובץ:** `make/scenario-0b-attendees-acceptance.md`
**בקצרה:** כשמשתתף לוחץ על קישור אישור — בודק capacity (עד 50) וסטטוס אירוע. מחזיר דף "אישרת הגעה" או "ההרשמה נסגרה". שולח אלרט לדניאל על ניסיונות כושלים.

### 5. ✅ Scenario 4 — מספור האירוע
**קובץ:** `make/scenario-4-event-numbering.md`
**בקצרה:** כשנוצר אירוע חדש — נותן לו מספר סידורי (MAX+1) ומייצר Form Link אוטומטית. מבדיל בין SuperSale ל-MultiSale.

### 6. ✅ Scenario UN — Unsubscribe
**קובץ:** `make/scenario-un-unsubscribe.md`
**בקצרה:** 3 דרכים להסרה (לפי email, item_id, או phone). מעדכן סטטוס ל-"ביטל" ומעביר ל-"Not Interested". אלרט לדניאל כשליד לא נמצא.

### 7. ✅ Scenario 0A — Automations הודעות משלימות
**קובץ:** `make/scenario-0a-automations.md`
**בקצרה:** 43 מודולים, פעיל אבל לא רץ לאחרונה (מעל חודש). כולל: עדכון אירועים חדשים, גלי תזכורות, follow-up למוזמנים, תזכורת יום לפני. עברית + רוסית. **החלטת דניאל:** אין צורך לבנות מחדש עכשיו — ייבנה כחלק ממערכת ההודעות החדשה (Messaging Hub). יש לשמר את הקופי של הודעות SuperSale מהסנריו הזה לשיפור.

---

## סנריואים שכבר אושרו (מסשנים קודמים)

- ✅ Scenario 1A-S — אישור תקנון (`make/scenario-1a-supersale.md`)
- ✅ Scenario 6 — SuperSale + Manual (`make/scenario-6-supersale-manual.md`)
- ✅ Scenario 7 — אישורי תקנון (`make/scenario-7-terms-approval.md`)
- ✅ Scenario 8 — הודעות תזכורת (`make/scenario-8-event-reminders.md`)
- ✅ Scenario 9+10A+10B — סריקה בכניסה + CX (`make/scenario-9-10a-event-day.md`)
- ✅ Scenario 1WA — WhatsApp (`make/scenario-1wa-whatsapp.md`)
