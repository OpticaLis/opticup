# Handoff — P8 Automation Engine (Level 1)

> הדבק את כל התוכן הזה בתחילת סשן Cowork חדש. הסשן צריך לטעון את הסקיל `opticup-strategic` ולכתוב SPEC מלא.

---

## ההחלטה האסטרטגית

בשיחה עם Daniel ב-22 באפריל 2026, הוחלט להוסיף **מנוע אוטומציות (רמה 1)** ל-CRM לפני המעבר לפריזמה (P7). הסיבה: כל האוטומציות של פריזמה ב-Monday+Make היו מסוג "קרה משהו → שלח הודעה" — בלי תזמונים או בדיקות תקופתיות. רמה 1 מכסה 100% מהתרחישים הקיימים ומאפשרת ל-Daniel לנהל אותם מתוך ממשק ה-CRM בלי תלות בפיתוח.

**סדר הביצוע המעודכן:**
```
P6 (בדיקת מחזור מלא — בביצוע כרגע) → P8 (מנוע אוטומציות) → P7 (מעבר פריזמה)
```

P8 בא לפני P7 כי Daniel רוצה שהמערכת תהיה מוכנה עם יכולת ניהול אוטומציות עצמאי **לפני** שפריזמה עוברת.

---

## מה זה "מנוע אוטומציות רמה 1"

מנוע חוקים פשוט שבו Daniel מגדיר מתוך ממשק ה-CRM:

**"כש-[טריגר] ו-[תנאי] → [שלח הודעה מתבנית]"**

### דוגמאות לחוקים שצריכים להיות אפשריים:

1. **"כשנרשמים 50 אנשים לאירוע → שלח לכל נרשם מ-51 והלאה הודעת רשימת המתנה"**
   - טריגר: הרשמה לאירוע
   - תנאי: מספר נרשמים > 50
   - פעולה: שלח תבנית "waiting_list"

2. **"כשליד חדש נכנס מהאתר → שלח לו הודעת ברוכים הבאים"**
   - טריגר: ליד חדש (lead-intake)
   - תנאי: (ללא, או: רק אם הגיע מדף X)
   - פעולה: שלח תבנית "welcome"
   - הערה: היום זה hardcoded ב-lead-intake Edge Function. עם P8 זה הופך לחוק שאפשר לערוך/לכבות

3. **"כשסטטוס אירוע משתנה ל'נפתחה הרשמה' → שלח הודעה לכל לידים מדרגה 2"**
   - טריגר: שינוי סטטוס אירוע
   - תנאי: סטטוס חדש = registration_open
   - פעולה: שלח תבנית "event_registration_open" לכל TIER2
   - הערה: היום גם זה hardcoded ב-crm-event-actions.js (P5.5). עם P8 זה חוק שניתן לעריכה

4. **כל תרחיש אחר מסוג "קרה משהו → שלח הודעה עכשיו"**

### מה **לא** נכנס לרמה 1:
- תזמונים ("חכה 3 ימים ואז שלח") — דורש scheduler, זה רמה 2
- שרשרת פעולות ("שלח הודעה וגם עדכן סטטוס") — רמה 2
- תנאים מורכבים עם AND/OR מרובים — רמה 2
- flow ויזואלי בסגנון Make/Zapier — רמה 3

---

## ארכיטקטורה צפויה (רמה גבוהה — הסקיל האסטרטגי יפרט)

### DB:
- טבלה חדשה `crm_automation_rules` — tenant_id, trigger_type, trigger_config (JSON), condition_type, condition_config (JSON), action_type, action_config (JSON), is_active, name, description
- RLS בפטרן הקנוני (JWT claim)

### טריגרים אפשריים (enum או configurable):
- `lead_intake` — ליד חדש נכנס
- `event_status_change` — סטטוס אירוע השתנה
- `event_registration` — מישהו נרשם לאירוע
- `lead_status_change` — סטטוס ליד השתנה
- (הרחבה עתידית: `broadcast_sent`, `terms_approved`, וכו')

### תנאים אפשריים:
- `always` — תמיד (ללא תנאי)
- `count_threshold` — כשספירה עוברת סף (הדוגמה של 50 נרשמים)
- `status_equals` — כשסטטוס = ערך מסוים
- `source_equals` — כשמקור = ערך מסוים (דף נחיתה X)

### פעולה (רמה 1 — רק סוג אחד):
- `send_message` — שלח הודעה מתבנית דרך הצינור הקיים (CrmMessaging.sendMessage → send-message EF → Make)

### ממשק:
- דף חדש / טאב ב-CRM: "אוטומציות"
- רשימת חוקים קיימים (שם, טריגר, פעיל/לא פעיל)
- כפתור "חוק חדש" → wizard פשוט עם dropdown-ים: בחר טריגר → בחר תנאי → בחר תבנית הודעה → שמור
- מתג on/off לכל חוק

### שינוי מבני קריטי:
ה-hardcoded dispatch שבנינו ב-P5.5 (ב-`crm-event-actions.js`, `crm-event-register.js`, ואולי חלק מ-`lead-intake`) צריך להפוך ל-**rule evaluation** — במקום "שלח תמיד כשסטטוס משתנה", הקוד יבדוק "האם יש חוק פעיל שמתאים לטריגר הזה?" ואם כן, יבצע את הפעולה. ה-hardcoded triggers של P5.5 יהפכו ל-"חוקי ברירת מחדל" שמוגדרים בטבלה.

---

## קבצים שחייבים להיקרא לפני כתיבת ה-SPEC

### הקשר כללי:
1. `CLAUDE.md` — Iron Rules, במיוחד §9 QA (כלל טלפונים מאושרים)
2. `MASTER_ROADMAP.md` — סדר מודולים ומצב כללי
3. `docs/GLOBAL_MAP.md` — Rule 21 cross-reference
4. `docs/GLOBAL_SCHEMA.sql` — Rule 21 cross-reference
5. `docs/guardian/GUARDIAN_ALERTS.md` — התראות פעילות

### הקשר CRM Go-Live:
6. `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — מצב נוכחי של M4
7. `modules/Module 4 - CRM/go-live/ROADMAP.md` — ארכיטקטורת v3 (3 שכבות: EF → Make → SMS/Email), סדר ביצוע
8. `modules/Module 4 - CRM/docs/MODULE_MAP.md` — מפת הקוד של CRM

### לקחים מ-P5 ו-P5.5 (חובה — harvest proposals):
9. `modules/Module 4 - CRM/go-live/specs/P5/FOREMAN_REVIEW.md`
10. `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/FOREMAN_REVIEW.md` — 8 followups, 2 author proposals, 2 executor proposals
11. `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/EXECUTION_REPORT.md` — pain points ולקחים

### קוד שיושפע ישירות:
12. `modules/crm/crm-event-actions.js` (341 שורות) — dispatch לאחר שינוי סטטוס אירוע (P5.5)
13. `modules/crm/crm-event-register.js` (144 שורות) — dispatch לאחר הרשמה (P5.5)
14. `modules/crm/crm-messaging-send.js` (69 שורות) — CrmMessaging.sendMessage helper
15. `modules/crm/crm-messaging-broadcast.js` (348 שורות) — broadcast wizard (P5.5)
16. `supabase/functions/lead-intake/index.ts` — dispatch לאחר lead intake (P2)

### סקילים (מעודכנים 2026-04-22):
17. `.claude/skills/opticup-strategic/SKILL.md` — Cross-Reference Check עם bullets 6+7 חדשים
18. `.claude/skills/opticup-executor/SKILL.md` — step 4.5 (phone check) + bullet 10 (INSERT audit)

---

## הערכת מורכבות

- **SPEC אחד, גדול** — בערך פי 2 מ-P5.5
- **הערכת ריצה:** 3-4 שעות Claude Code + 1-2 שעות QA
- **טבלת DB חדשה:** `crm_automation_rules` (עם RLS)
- **ממשק חדש:** דף/טאב "אוטומציות" ב-CRM
- **שינוי בקוד קיים:** refactor של dispatch ב-3 קבצים (event-actions, event-register, lead-intake) מ-hardcoded ל-rule-based
- **Rule 12 risk:** `crm-event-actions.js` כבר ב-341 שורות. הוספת rule evaluation עלולה לחרוג מ-350. ייתכן שצריך לפצל dispatch engine לקובץ נפרד (`crm-automation-engine.js`)

---

## הוראה לסשן

טען את הסקיל `opticup-strategic`. קרא את כל הקבצים ברשימה למעלה. פעל לפי ה-SPEC Authoring Protocol (Step 1 ואילך). תיקיית ה-SPEC: `modules/Module 4 - CRM/go-live/specs/P8_AUTOMATION_ENGINE/`. כתוב `SPEC.md` + `ACTIVATION_PROMPT.md`.

שים לב: Daniel ביקש שה-P8 ייכנס **לפני P7** (מעבר פריזמה). סדר הביצוע: P6 (בדיקת מחזור, רץ כרגע) → P8 (מנוע אוטומציות) → P7 (מעבר פריזמה).
