# CRM Go-Live — Monday.com → Optic Up CRM

> **מטרה:** להעביר את כל תהליך הקמפיין מ-Monday.com + Make ל-CRM פנימי + Make כשליח הודעות בלבד.
>
> **עיקרון מנחה v3 (עדכון 2026-04-22):**
> כל הלוגיקה העסקית — פנימית (Edge Functions, RPCs, CRM UI).
> Make לא מקבל החלטות. Make לא ניגש ל-DB. Make רק מעביר הודעה מוכנה לערוץ השליחה.
> Edge Function `send-message` עושה הכל: שליפת טמפלט, הצבת משתנים, כתיבת לוג.
> Make מקבל הודעה מוכנה (channel + recipient + body) ושולח. נקודה.
> Monday.com לא נוגעים בו — הוא נשאר כגיבוי read-only.
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
│  שכבה 2: שליחת הודעות (Make = צינור שליחה בלבד)     │
│                                                     │
│  Edge Function → Make webhook → SMS/Email            │
│  Make מקבל הודעה מוכנה ושולח. אפס גישה ל-DB.       │
│  3 מודולים: Webhook → Router → SMS | Email           │
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

## P3 — שליח הודעות גנרי ב-Make  ✅

**P3a+P3b הושלמו.** סנריו 9104395 נבנה עם 8 מודולים (כולל Supabase native).

**⚠️ P3b הוחלף ב-P3c (ארכיטקטורה v3, 2026-04-22):**
דניאל החליט ש-Make לא צריך גישה ל-DB בכלל. הסנריו הנוכחי (8 מודולים עם Supabase Search Rows + Create Row) יוחלף בסנריו של 3 מודולים בלבד: Webhook → Router → SMS | Email. כל הלוגיקה (שליפת טמפלט, הצבת משתנים, כתיבת לוג) עוברת ל-Edge Function `send-message` בסופאבייס. ראה P3c+P4 למטה.

---

## P3c+P4 — ארכיטקטורה v3: Edge Function + Make Send-Only + חיבור טריגרים  ✅

**מה נבנה:** תשתית שליחת הודעות מלאה בגישה חדשה.

**עיקרון:** Make = צינור שליחה בלבד. מקבל הודעה מוכנה, שולח. אפס גישה ל-DB.

**רכיבים:**

### חלק 1: Make (דניאל בונה ידנית)
- סנריו חדש: 3 מודולים — Webhook → Router → SMS (Global SMS) | Email (Gmail)
- Webhook מקבל: `{ channel, recipient_phone, recipient_email, subject, body }`
- Body מגיע מוכן — Make לא עושה שום עיבוד
- WhatsApp — לא עכשיו. מחכים ל-API הרשמי של Meta

### חלק 2: Edge Function `send-message` (Claude בונה)
- מקבל: `{ template_slug OR body, channel, recipient, variables, tenant_id, lead_id, event_id }`
- אם template_slug: שולף מ-crm_message_templates, מציב משתנים
- אם body ישיר: משתמש כמות שהוא (broadcast חופשי)
- כותב crm_message_log עם status='pending'
- קורא ל-Make webhook עם הודעה מוכנה
- מעדכן status ל-'sent' או 'failed'

### חלק 3: חיבור טריגרים (Claude בונה)
- ✅ ליד חדש (P1 Edge Function) → send-message → SMS+Email (template `lead_intake_new`)
- ✅ ליד כפול (P1 Edge Function) → send-message → SMS+Email (template `lead_intake_duplicate`)
- ✅ פתיחת אירוע (CRM, שינוי event status) → send-message → SMS+Email (bulk) — P5.5 (dispatchEventStatusMessages)
- ✅ הרשמה לאירוע (CRM) → send-message → SMS+Email — P5.5 (dispatchRegistrationConfirmation)
- ⬜ תזכורות לפני אירוע → scheduled Edge Function → send-message — ידרוש scheduler, SPEC נפרד
- ✅ Broadcast ידני (Messaging Hub) → send-message → SMS/Email לרשימה מסוננת — P5.5 (doWizardSend → CrmMessaging.sendMessage)
- ⬜ Unsubscribe (Edge Function) → עדכון DB ישירות, ללא Make — P5+ scope

**הערה:** P3c+P4 סגר את שני הטריגרים הראשונים (lead-intake). שאר הטריגרים יטופלו כשתוכן ההודעות ייכתב ב-P5 ואחרי שה-scheduler ייבנה.

### עיצוב טמפלטים
- כל טמפלט: עד 3 ערוצים (SMS/Email/WhatsApp) — לא חובה למלא הכל
- Email = HTML מלא ב-body, SMS = טקסט רגיל, WA = טקסט
- משתנים: `%name%`, `%phone%`, `%email%`, `%event_name%`, `%event_date%`, `%event_location%`
- רשימת משתנים זמינים ליד עורך הטמפלטים (copy-paste, בעתיד: חיפים לחיצים)

---

## P5 — תוכן הודעות  ✅

**סגור 2026-04-22.** 20 טמפלטים פעילים בטננט דמו (10 SMS + 10 Email, 10 טריגרים).

**רכיבים שבוצעו:**
- UI: `modules/crm/crm-messaging-templates.js` — פורמט משתנים הועבר מ-`{{var}}` ל-`%var%`, נוסף `%email%`, preview values עודכנו ל-Prizma SuperSale defaults.
- Seed: `modules/Module 4 - CRM/go-live/seed-templates-demo.sql` (artifact לשחזור) מזין 20 טמפלטים: `lead_intake_new`, `lead_intake_duplicate`, `event_will_open_tomorrow`, `event_registration_open`, `event_invite_new`, `event_closed`, `event_waiting_list`, `event_2_3d_before`, `event_day`, `event_invite_waiting_list` — כל אחד ב-SMS + Email.
- תוכן: SMS מ-`campaigns/supersale/FLOW.md`, Email מ-`campaigns/supersale/messages/*.html` (10 HTML עשירים עם inline CSS).
- המרת משתנים: Make `{{X.field}}` → Optic Up `%var%` (name/phone/email/event_name/event_date/event_time/registration_url/unsubscribe_url).
- Rule 21: `seed-message-templates.sql` (C1 seed ישן עם 4 טמפלטים ב-`{{var}}`) נמחק ב-commit זהה.

**לא כלול (ידחה ל-SPEC נפרד):**
- חיבור טריגרים ל-`send-message` (event status → bulk send; scheduler לתזכורות; broadcast wizard send button).
- WhatsApp variants — ממתינים ל-Meta API.
- Russian / English variants — כשיצטרך ערוץ שני.
- Unsubscribe Edge Function — `%unsubscribe_url%` קיים בטמפלטים אך האנדפוינט עצמו עדיין לא נבנה.

---

---

## P5.5 — חיבור טריגרים (CRM → send-message)  ✅

**סגור 2026-04-22.** 3 זרימות CRM חוברו ל-`send-message` Edge Function. כל הודעה שחשבון ממשק משנה סטטוס, רושם משתתף או מפעיל Broadcast — נשלחת בפועל.

**רכיבים שבוצעו:**
- `modules/crm/crm-event-actions.js` (+75 שורות) — `dispatchEventStatusMessages(eventId, newStatus, event)` ממפה 8 סטטוסי אירוע ל-template base slugs (event_will_open_tomorrow, event_registration_open, event_invite_new, event_closed, event_waiting_list, event_2_3d_before, event_day, event_invite_waiting_list) + 4 סוגי נמענים (tier2 / tier2_excl_registered / attendees / attendees_waiting). כפול-ערוץ: SMS תמיד + Email אם יש אימייל, באמצעות `Promise.allSettled`. `changeEventStatus()` מבצע fire-and-forget dispatch אחרי ה-UPDATE.
- `modules/crm/crm-event-register.js` (+23 שורות) — `dispatchRegistrationConfirmation()` נקרא אחרי `register_lead_to_event` מוצלח. מיפוי סטטוס → טמפלט: `registered` → `event_registration_confirmation`, `waiting_list` → `event_waiting_list_confirmation`. SMS + Email.
- `modules/crm/crm-messaging-broadcast.js` (`doWizardSend` נכתב מחדש) — שלב 5 של אשף השליחה כעת מושך את כל שורות הלידים הנבחרים, קורא `CrmMessaging.sendMessage()` לכל ליד (מצב טמפלט אם נבחר, מצב body-גולמי אם לא), עוקב אחר הצלחות/כשלים, ומעדכן את `crm_broadcasts` עם counts אמיתיים + status (`completed` או `partial`).
- 4 טמפלטי אישור חדשים על טננט דמו: `event_registration_confirmation_{sms,email}_he` + `event_waiting_list_confirmation_{sms,email}_he` (סה"כ 24 טמפלטים על דמו).

**תיקוני קצה שנחשפו בזמן QA:**
- `TIER2_STATUSES` fallback ב-`crm-event-actions.js` יושר מול הקוד החי (`crm-helpers.js` — 6 slugs אמיתיים).
- `crm_broadcasts.employee_id` NOT NULL הוזנח מאז B5 — INSERT בברודקאסט נכשל עד עכשיו; הטופס סיפק `getCurrentEmployee().id` ושחרר את הכפתור.
- `send-message` Edge Function דורש `variables.phone` / `variables.email` גם במצב body-גולמי — ברודקאסט לא העביר אותם; תוקן עם fetch שורות מלאות בתוך `doWizardSend`.

**לא כלול (ידחה ל-SPEC נפרד):**
- תזכורות מתוזמנות (2-3 ימים לפני אירוע, בוקר האירוע) — דורש Edge Function עם scheduler.
- WhatsApp channel — ממתין ל-Meta API.
- Unsubscribe endpoint — `%unsubscribe_url%` קיים בטמפלטים אך האנדפוינט עצמו לא נבנה.
- Automation rules execution engine — `crm-messaging-rules.js` נשאר CRUD-UI בלבד; מיפוי ה-trigger→template של P5.5 הוא hardcoded לפי תכנון המוצר לגו-לייב.

---

## P6 — הרצה מלאה על דמו  ✅

**סגור 2026-04-22.** End-to-end test של כל הסייקל על טננט דמו עבר בהצלחה.

**מה נבדק:**
1. ✅ Lead-intake EF (phone `+972537889878`) → HTTP 409 duplicate → SMS + Email dispatched (`lead_intake_duplicate_{sms,email}_he`, both `status=sent`)
2. ✅ CRM `?t=demo` loaded on localhost:3000 — 0 app console errors (only favicon 404 + known Tailwind-CDN warning)
3. ✅ Registered tab shows 2 P55 leads; lead detail modal opens; status change `confirmed → waiting` via tier-filtered dropdown → DB updated + note "סטטוס שונה מ-אישר הגעה ל-ממתין לאירוע" inserted
4. ✅ Tier 1→2 transfer — SQL-set lead to `new` (Tier 1) → UI "אשר ✓" button → lead moved to registered tab, status=`waiting`, note "הועבר ל-Tier 2 (אושר)" inserted
5. ✅ Event creation — "יצירת אירוע +" → event #2 "P6 Test Event" created with auto-number
6. ✅ Event status change `planning → registration_open` → 4 log rows dispatched (2 Tier 2 leads × SMS+Email, all `status=sent`, template `event_registration_open`)
7. ✅ Register lead to event — search dialog → click lead → `register_lead_to_event` RPC → 2 confirmation log rows (SMS+Email, templates `event_registration_confirmation`)
8. ✅ Broadcast wizard — template mode (SMS, `event_invite_new`) → `crm_broadcasts.status=completed`, total_sent=2, total_failed=0
9. ✅ Broadcast wizard — raw mode (email, free-text body with `%name%`) → `crm_broadcasts.status=completed`, total_sent=2, total_failed=0
10. ✅ WhatsApp channel guard — `CrmMessaging.sendMessage({channel:'whatsapp'})` returns `{ok:false, error:'invalid_channel:whatsapp'}` before any EF call; 0 new log rows
11. ✅ Template-not-found error — `send-message` EF with nonexistent slug → log row with `status='failed'`, `error_message='template_not_found: nonexistent_template_that_does_not_exist_sms_he'`

**תוצאה סופית בדמו:** baseline משוחזר בדיוק — 2 leads (statuses מקוריים), 0 log, 0 broadcasts, 0 attendees, 1 event (P5.5 pre-existing), 0 notes, 24 templates. כל נתוני ה-P6 נמחקו.

**תיעוד קוד:** JSDoc "CALLER CONTRACT" בלוק נוסף ל-`modules/crm/crm-messaging-send.js` (93 שורות total) — מסמך את חוזה `variables.phone`/`variables.email` של ה-Edge Function (סוגר את M4-BUG-P55-03).

**פרטים מלאים:** `modules/Module 4 - CRM/go-live/specs/P6_FULL_CYCLE_TEST/` — SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md.

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
