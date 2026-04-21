# CRM Go-Live — Monday.com → Optic Up CRM

> **מטרה:** להעביר את כל תהליך הקמפיין מ-Monday.com + Make ל-CRM פנימי + Make כשליח הודעות בלבד.
>
> **עיקרון מנחה v2 (עדכון 2026-04-21):**
> כל הלוגיקה העסקית — פנימית (Edge Functions, RPCs, CRM UI).
> Make לא מקבל החלטות. Make רק שולח הודעות.
> הטפסים שלנו. ה-CRM שלנו. הנתונים ישירות לסופאבייס.
> Monday.com לא נגעים בו — הוא נשאר כגיבוי read-only.
>
> **למה שינינו גישה:** הגישה הקודמת (C1–C9 ישן) ניסתה לשכפל כל סנריו מ-Make
> ולהחליף Monday ב-HTTP calls לסופאבייס. זה יצר סנריואים שבירים (ראוטרים שבורים,
> קונפליקטי `{{}}`, חוסר error handling) וכפל של לוגיקה שכבר קיימת ב-CRM.
> בגישה החדשה — הלוגיקה פנימית, Make הופך לצינור דקיק לשליחת הודעות.
>
> **ליד בדיקות:** טלפון `0537889878`, מייל `danylis92@gmail.com`
> **טננט דמו:** slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`
> **תיעוד מקור:** `campaigns/supersale/FLOW.md`, `campaigns/supersale/make/scenarios-overview.md`

---

## ארכיטקטורה חדשה — שלוש שכבות

```
┌─────────────────────────────────────────────────────┐
│  שכבה 1: טפסים ולוגיקה (הכל פנימי)                │
│                                                     │
│  סטורפרונט → Edge Function → Supabase              │
│  CRM UI → Supabase RPCs                             │
│  אין Make. אין Monday. ישירות ל-DB.                │
├─────────────────────────────────────────────────────┤
│  שכבה 2: שליחת הודעות (Make בלבד)                  │
│                                                     │
│  CRM/Edge Function → Make webhook → SMS/Email/WA    │
│  Make קורא טמפלט מ-DB, מציב משתנים, שולח, כותב לוג │
│  סנריואים גנריים — לא per-flow                      │
├─────────────────────────────────────────────────────┤
│  שכבה 3: תוכן (בסוף)                               │
│                                                     │
│  טמפלטים ב-crm_message_templates                    │
│  Email = HTML מלא, SMS = טקסט, WA = טקסט            │
│  דניאל עורך מה-CRM Messaging Hub                    │
└─────────────────────────────────────────────────────┘
```

---

## סדר ביצוע

```
P1 → P2 → P3 → P4 → P5 → P6 → P7
│         │         │         │
│  צינור  │  שליח   │  מחזור  │
│  פנימי  │  הודעות │  מלא    │
│  מלא    │  ב-Make │  על דמו │
└─────────┘         │         │
                    │    P7 = מעבר פריזמה
                    └─────────┘
```

---

## P1 — צינור כניסת ליד (פנימי)  ⬜

**מה נבנה:** Edge Function שמקבל submit מטופס הסטורפרונט ומכניס ליד ישירות לסופאבייס.

**רכיבים:**
- Edge Function `lead-intake` — מקבל POST עם שם/טלפון/מייל/UTMs, בודק כפילויות (phone), יוצר ליד ב-`crm_leads` עם status=`new`, מחזיר תשובה לטופס
- עדכון טופס הסטורפרונט — POST ל-Edge Function במקום webhook ל-Make
- אוטו-ולידציה: פורמט טלפון, שדות חובה, sanitization

**לא כולל:** שליחת הודעות (P3), שינויי סטטוס ידניים (P2)

---

## P2 — ניהול לידים ואירועים (CRM פנימי)  ⬜

**מה נבנה:** הפיצ'רים ב-CRM שמאפשרים לנהל לידים, לשנות סטטוסים, להעביר tier, ליצור ולנהל אירועים, ולרשום לידים לאירוע.

**רכיבים:**
- שינוי סטטוס ליד (Tier 1 + Tier 2) — כפתורי פעולה + writeLog
- הוספת הערות לליד
- העברת ליד מ-Tier 1 ל-Tier 2 (כפתור "אשר והעבר")
- אוטו-אישור: ליד עם טלפון+מייל תקינים + לא כפילות → אוטומטי ל-Tier 2
- יצירת אירוע (מספור אוטומטי, `next_crm_event_number` RPC כבר קיים)
- פתיחת/סגירת הרשמה לאירוע (שינוי event status)
- רישום ליד לאירוע (`register_lead_to_event` RPC כבר קיים)
- Check-in ביום אירוע (`check_in_attendee` RPC כבר קיים)
- רישום רכישה (`record_purchase` RPC כבר קיים)

**הערה:** רוב ה-RPCs כבר קיימים מ-Phase A. ה-UI לחלק מהפעולות כבר קיים מ-B3–B7. צריך לחבר כפתורים → RPCs.

---

## P3 — שליח הודעות גנרי ב-Make  ⬜

**מה נבנה:** סנריואים גנריים ב-Make שמקבלים webhook ושולחים הודעה. לא מכילים לוגיקה עסקית.

**רכיבים:**
- Supabase connection ב-Make (חד-פעמי — URL + service_role key)
- סנריו "Send SMS" — webhook → קריאת טמפלט (Supabase module) → הצבת משתנים → Global SMS → POST log ל-`crm_message_log`
- סנריו "Send Email" — webhook → קריאת טמפלט → הצבת משתנים → Gmail → POST log
- סנריו "Bulk Notify" — scheduled/webhook → שליפת נמענים מסופאבייס → לולאה → SMS+Email → log
- סנריו "WhatsApp Incoming" — webhook מ-Green API → ניתוב לפי תוכן → תשובה אוטומטית
- Error handler על כל סנריו — הודעה ל-events@ + log ב-DB

**עיקרון:** ה-webhook payload פשוט: `{ recipient_phone, recipient_email, template_slug, variables: { name, event_name, ... } }`. Make לא מחליט מה לשלוח — הוא רק שולח מה שנאמר לו.

---

## P4 — חיבור CRM ← → Make  ⬜

**מה נבנה:** הנקודות שבהן ה-CRM או Edge Functions קוראים ל-Make webhook כדי לשלוח הודעות.

**trigger points:**
- ליד חדש (P1 Edge Function) → Make webhook → SMS+Email "נרשמת בהצלחה"
- ליד כפול (P1 Edge Function) → Make webhook → SMS "כבר רשום"
- פתיחת אירוע (P2 CRM, שינוי event status) → Make bulk webhook → SMS+Email לכל ה-Tier 2
- הרשמה לאירוע (P2 CRM) → Make webhook → SMS+Email "אישור הרשמה"
- תזכורות לפני אירוע → Make scheduled → SMS+Email
- Check-in (P2 CRM) → Make webhook → post-scan actions
- אחרי אירוע → Make webhook → סקר שביעות רצון
- Unsubscribe (Edge Function) → עדכון DB ישירות, ללא Make

---

## P5 — תוכן הודעות  ⬜

**מה נבנה:** כתיבת כל הטמפלטים ושמירה ב-`crm_message_templates`.

**רכיבים:**
- העתקת כל הודעות ה-SMS מ-FLOW.md לטבלה (כבר חלקית מ-C1)
- העתקת כל Email templates כ-HTML (מתיקיית `messages/`)
- הגדרת placeholders אחידים (לא `{{}}` — פורמט שלא מתנגש עם Make)
- הוספת טמפלטים לכל trigger: lead_new, lead_duplicate, event_open, event_reminder, registration_confirm, checkin, cx_survey, unsubscribe

---

## P6 — הרצה מלאה על דמו  ⬜

**מה נבנה:** End-to-end test של כל הסייקל על טננט דמו.

**סדר הבדיקה:**
1. ליד חדש נרשם בטופס → מופיע ב-CRM, מקבל SMS+Email
2. ליד כפול → הודעת "כבר רשום", לא נוצר שוב
3. מאשרים ומעבירים ל-Tier 2
4. יוצרים אירוע, פותחים הרשמה → כל Tier 2 מקבל הודעה
5. ליד נרשם לאירוע → אישור הרשמה
6. תזכורות → SMS+Email לנרשמים
7. סריקת ברקוד → check-in
8. רישום רכישה
9. סקר שביעות רצון
10. Unsubscribe

**קריטריון הצלחה:** 0 שגיאות, כל הנתונים ב-CRM מדויקים, כל ההודעות נשלחו ונרשמו ב-log.

---

## P7 — מעבר פריזמה  ⬜

**מה נבנה:** כיבוי Monday, הפעלת הצינור החדש על פריזמה.

**סדר:**
1. אישור דניאל שדמו עובד 100%
2. גיבוי Monday (export כל הבורדים)
3. החלפת Webhook בטופס SuperSale → Edge Function החדש
4. העברת סנריואים מ-Demo לתיקייה ראשית
5. כיבוי סנריואים ישנים (שמדברים עם Monday)
6. Monday נשאר כגיבוי read-only
7. מעקב 48 שעות

**⚠️ לא מתחילים P7 עד שדניאל אישר אישית שדמו עובד.**

---

## חוקים לביצוע

1. **כל שלב נבדק לפני שמציגים אותו** — אם לא עובד, לא קיים
2. **ליד בדיקות:** טלפון `0537889878`, מייל `danylis92@gmail.com` — תמיד
3. **טננט דמו בסופאבייס** — slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`
4. **כל 30 חוקי הברזל** — תקפים לכל קוד שנכתב
5. **SPECs** נכתבים לתוך `go-live/specs/` בפורמט folder-per-SPEC
6. **Make — Native Supabase modules** — לא HTTP גנרי. Connection אחד, מודולים ייעודיים.
7. **הודעות בסוף** — לא נוגעים בתוכן הודעות עד P5
