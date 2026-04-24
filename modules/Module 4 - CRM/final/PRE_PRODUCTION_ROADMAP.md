# CRM Pre-Production ROADMAP — מה חייב לעשות לפני שעוברים סופית

> **נוצר:** 2026-04-23
> **סטטוס:** טיוטה — ממתין לאישור דניאל
> **הקשר:** כל הקוד של P1–P22 + FINAL_FIXES ממוזג ל-main. GitHub Pages פעיל.
> **עיקרון:** כל סעיף כאן הוא חסם או שדרוג קריטי שחייב לפני P7 (מעבר פריזמה).

---

## סעיף 1 — טופס הרשמה לאירוע מהסטורפרונט

### מה יש היום
- טופס הרשמה ב-`modules/crm/public/event-register.html` (ERP repo, GitHub Pages).
- Edge Function `event-register` עושה GET (bootstrap פרטי אירוע+ליד+טננט) ו-POST (RPC + עדכון שדות).
- ה-URL שנשלח למוזמן: `r.html?e=UUID&l=UUID` → redirect לטופס.
- הטופס מבקש מהמוזמן למלא: שעת הגעה מועדפת, בדיקת ראייה, הערות.
- UUIDs גולמיים ב-URL (לא חתומים).

### מה חסר (לפי דניאל)
1. **הטופס חייב להיות באתר של פריזמה** (`prizma-optic.co.il`), לא ב-`app.opticalis.co.il`.
2. **הטופס חייב להיות pre-filled** — כל הפרטים של המוזמן (שם, טלפון, אימייל, שם אירוע, תאריך, מיקום) כבר מוצגים. המוזמן רק צריך לאשר הגעה (+ אופציונלית: שעה מועדפת, בדיקת ראייה, הערות).
3. **URL חתום (HMAC)** — במקום UUIDs גולמיים, token חתום עם TTL (כמו ב-unsubscribe EF שכבר בנינו).

### עבודה נדרשת
- **סטורפרונט (opticup-storefront):** עמוד Astro חדש `/event-register/` (או `/events/register/`) שקורא ל-Edge Function `event-register` GET ומציג טופס pre-filled ממותג בעיצוב פריזמה. POST שולח אישור.
- **ERP (opticup):** שדרוג `event-register` EF לתמוך ב-HMAC token (כמו `unsubscribe` EF), כולל TTL ו-validation. ה-EF כבר מחזיר את כל הפרטים ב-GET — רק צריך להוסיף token verification.
- **CRM:** `%registration_url%` ב-automation engine משתנה מ-`app.opticalis.co.il/r.html?...` ל-`prizma-optic.co.il/event-register?token=...`.
- **סטטוס `quick_registration`:** קיים ב-schema seed (001_crm_schema.sql שורה 1163) אבל צריך לוודא שהוא seeded על demo + שה-RPC `register_lead_to_event` תומך בו כ-`registration_method`.

### שני ריפואים
ERP repo: EF + URL generation. Storefront repo: עמוד + עיצוב.

---

## סעיף 2 — עמוד הסרה מהסטורפרונט

### מה יש היום
- Edge Function `unsubscribe` (184 שורות) מקבלת GET עם HMAC token, מעדכנת `crm_leads.unsubscribed_at`, ומחזירה עמוד HTML בסיסי בעברית (RTL, success/error).
- העמוד הוא HTML inline בתוך ה-EF — לא ממותג, לא בעיצוב פריזמה.
- `%unsubscribe_url%` כבר מוזרק אוטומטית בכל הודעה ע"י `send-message` EF.

### מה חסר (לפי דניאל)
1. **עמוד ההסרה חייב להיות באתר של פריזמה** — `prizma-optic.co.il/unsubscribe?token=...`.
2. **עיצוב ממותג** — לוגו, צבעים, עיצוב דומה לעמוד הסרה שכבר קיים באתר (דניאל אמר שהעמוד כבר קיים ואפשר להעתיק אותו).

### עבודה נדרשת
- **סטורפרונט:** עמוד Astro חדש `/unsubscribe/` — מקבל `?token=...`, קורא ל-`unsubscribe` EF, מציג תוצאה ממותגת.
- **ERP:** שינוי ב-`unsubscribe` EF — במקום להחזיר HTML, מחזיר JSON (`{ success: true/false, message }`) כשהקריאה מגיעה עם header מתאים (או: EF redirect ל-storefront עם query param).
- **CRM:** `%unsubscribe_url%` ב-`send-message` EF משתנה מ-URL ישיר ל-EF → URL של הסטורפרונט.

### שני ריפואים
ERP repo: EF refactor (JSON response). Storefront repo: עמוד + עיצוב.

---

## סעיף 3 — אוטומציות v2 (מסך נפרד)

> **עיקרון:** אוטומציות זה לא רק הודעות — זה כל פעולה אוטומטית שהמערכת מבצעת.
> מסך נפרד ב-CRM (nav item 8), לא טאב בתוך Messaging Hub.
> הרמה צריכה להיות הכי גבוהה שאפשר — כל אחד ללא רקע טכני חייב להבין.
> Claude Code מקבל מרחב פעולה מקסימלי לשפר את ה-UX, עם מסילות ברורות.

### מה יש היום
- `crm-messaging-rules.js` (311 שורות) — טאב "כללי אוטומציה" בתוך Messaging Hub. טבלת חוקים עם: שם, טריגר, תנאי, נמענים, ערוץ, תבנית, toggle פעיל/כבוי.
- `crm-automation-engine.js` (225 שורות) — מנוע שמריץ חוקים בזמן אמת (4 trigger types, 4 condition evaluators, 5 recipient types). Action type יחיד: `send_message`.
- 10 חוקי ברירת מחדל seeded על demo.
- Confirmation Gate (P20/P21) — כל dispatch עובר דרך מודאל preview.
- אוטומציות server-side (EF): ליד כפול → 409 + הודעת duplicate. חריגת תקרה → waiting_list + הודעה.

### מה צריך

#### 3A. מסך נפרד "אוטומציות" (nav item 8 ב-CRM)
- מסך ייעודי, לא טאב בתוך Messaging Hub.
- הטאב הישן "כללי אוטומציה" ב-Messaging Hub → מועבר למסך החדש או מוחלף בקישור.
- טבלת חוקים קיימים עם toggle פעיל/כבוי + כפתור "+ כלל חדש" שפותח wizard.

#### 3B. Wizard לבניית כלל — הזרימה
**שלב 1: בורד** — 3 כרטיסים ויזואליים (לידים נכנסים / רשומים / אירועים). בחירה קובעת אילו טריגרים זמינים.

**שלב 2: טריגר** — dropdown מסונן לפי הבורד:
| בורד | טריגרים זמינים |
|------|---------------|
| לידים נכנסים (Tier 1) | ליד חדש נכנס · שינוי סטטוס · ליד כפול |
| רשומים (Tier 2) | שינוי סטטוס · ליד כפול |
| אירועים | שינוי סטטוס אירוע · הרשמה חדשה למשתתף · חריגה מתקרה (מעבר לרשימת המתנה) |

**שלב 3: תנאי** — מסונן לפי הטריגר:
| טריגר | תנאי זמין |
|-------|----------|
| שינוי סטטוס (לידים/אירועים) | dropdown: "לאיזה סטטוס?" (רשימת סטטוסים של הבורד) |
| ליד חדש | dropdown: "עם איזה סטטוס?" (new / quick_registration / pending_terms / ...) |
| הרשמה חדשה | dropdown: "סוג הרשמה?" (registered / quick_registration / waiting_list) |
| ליד כפול | אוטומטי — אין תנאי נוסף |
| חריגה מתקרה | אוטומטי — אין תנאי נוסף |

**שלב 4: פעולה** — מה לעשות כשהתנאי מתקיים. **אפשר לבחור יותר מפעולה אחת (multi-action):**
| סוג פעולה | פרמטרים |
|-----------|---------|
| שלח הודעה | תבנית + ערוץ (SMS/Email) + נמענים (הליד שהפעיל / כל Tier 2 / נרשמים לאירוע / רשימת המתנה) |
| שנה סטטוס | סטטוס יעד (dropdown מסונן לפי הבורד) |
| העבר בורד | Tier 1 → Tier 2 (כולל תנאי: terms_approved?) |
| הוסף הערה | טקסט הערה (template עם משתנים: %name%, %date%, ...) |

**שלב 5: סיכום** — כרטיס קריא בעברית:
> **"כאשר** ליד חדש נכנס לבורד לידים נכנסים עם סטטוס רישום מהיר,
> **אז** (1) שלח SMS אישור הרשמה למוזמן **ו-**(2) שנה סטטוס ל-"ממתין לאישור"

#### 3C. כל הוריאציות העסקיות — חייבות להיות ניתנות לבנייה מהממשק

**בורד לידים נכנסים:**
- ליד חדש + סטטוס `new` = "ליד חדש שנרשם דרך טופס" → שלח SMS+Email אישור קבלה
- ליד חדש + סטטוס `quick_registration` = "רישום מהיר" → שלח SMS אישור מקוצר
- ליד חדש + סטטוס `pending_terms` = "נרשם ידנית" → שלח SMS עם קישור לאישור תנאים
- ליד כפול (טלפון קיים) → שלח SMS "כבר נרשמת" + שנה סטטוס ל-`duplicate`
- שינוי סטטוס ל-`waiting` → העבר ל-Tier 2

**בורד רשומים:**
- שינוי סטטוס ל-`invited` → שלח SMS+Email הזמנה לאירוע
- שינוי סטטוס ל-`confirmed` → שלח SMS אישור הגעה
- ליד כפול → שלח SMS "כבר נרשמת"

**בורד אירועים:**
- שינוי סטטוס אירוע ל-`registration_open` → שלח SMS+Email הזמנה לכל Tier 2 (חוץ מרשומים)
- שינוי סטטוס אירוע ל-`invite_new` → שלח SMS+Email רק ללידים חדשים מאז הפתיחה
- שינוי סטטוס אירוע ל-`event_closed` → שלח SMS+Email סיום לכל המשתתפים (registered+confirmed+attended+purchased+no_show)
- הרשמה חדשה + סטטוס `registered` → שלח SMS+Email אישור הרשמה
- הרשמה חדשה + סטטוס `quick_registration` → שלח SMS אישור מהיר
- הרשמה חדשה + סטטוס `waiting_list` → שלח SMS "נרשמת לרשימת המתנה"
- חריגה מתקרה → שלח SMS "האירוע מלא, הועברת לרשימת המתנה"

#### 3D. אירועי מערכת מובנים (built-in)
אירועים שקורים ברמת ה-Edge Function / RPC (server-side), לא client-side:
- **ליד כפול ב-lead-intake EF** → 409 + dispatch `lead_intake_duplicate` — כבר עובד
- **חריגת תקרה ב-register_lead_to_event RPC** → waiting_list — כבר עובד
- **אלה מופיעים במסך אוטומציות כ-"כללים מובנים"** — toggle הפעלה/כיבוי + אפשרות לבחור תבנית הודעה, אבל לא ניתן למחוק או לשנות את הטריגר עצמו

#### 3E. ארכיטקטורה — מודל נתונים
**שדרוג טבלת `crm_automation_rules`:**
```
board:              'incoming' | 'registered' | 'events'    ← חדש
trigger_type:       'status_change' | 'new_entry' | 'new_registration' | 'duplicate_detected' | 'capacity_exceeded'
trigger_condition:  { status: '...', registration_method: '...' }
actions:            [                                       ← חדש: array של פעולות (multi-action)
                      { type: 'send_message', config: { template_slug, channel, recipient_type } },
                      { type: 'change_status', config: { target_status } },
                      { type: 'move_board', config: { target_tier } },
                      { type: 'add_note', config: { text } }
                    ]
```

**הערה חשובה:** שדה `actions` מחליף את `action_type` + `action_config` הנוכחי. Migration צריכה להמיר את החוקים הקיימים (10 חוקים, כולם `send_message`) לפורמט החדש.

#### 3F. Claude Code — מרחב פעולה + מסילות

**מרחב פעולה (יכול לשפר):**
- עיצוב ה-Wizard, layout, animations, UX patterns — יכול לבחור הגישה הכי טובה
- הצגת טבלת החוקים (כרטיסים / טבלה / hybrid) — יכול להחליט
- הצגת הסיכום (שלב 5) — יכול לעצב
- error handling, validation, empty states — יכול לעצב
- סדר שלבי ה-wizard (אם יש רעיון יותר טוב מ-5 שלבים — יכול להציע)
- הצעה לוריאציות עסקיות נוספות שחסרות ברשימה

**מסילות (לא יכול לחרוג):**
- הזרימה: בורד → טריגר → תנאי → פעולה. לא ניתן לדלג על שלבים
- כל הוריאציות מ-§3C חייבות להיות ניתנות לבנייה מהממשק
- אירועים מובנים (§3D) לא ניתנים למחיקה, רק toggle
- Multi-action חובה — כלל אחד יכול להפעיל כמה פעולות
- Confirmation Gate (P20/P21) חייב להישמר — כל dispatch עובר דרך מודאל preview
- כל הקבצים ≤350 שורות (Rule 12)
- RTL + עברית בכל ה-UI
- מסך נפרד (nav item), לא טאב בתוך Messaging Hub

---

## סעיף 4 — מסך מדידת שיווק (ADS Management)

> **הקשר:** במאנדיי היו 3 בורדים: Affiliates, Facebook ADS, Unit Economics.
> דניאל מעריך שבתוכנה החדשה מספיק בורד אחד מאוחד.
> התיעוד קיים במסמכי Monday (`campaigns/supersale/monday/` + DATA_DISCOVERY_REPORT).

### מה צריך
- מסך חדש ב-CRM (או module נפרד) למדידת ביצועי קמפיינים.
- מאחד את 3 הבורדים של Monday לתצוגה אחת.
- נתונים: עלות פרסום (`crm_ad_spend` — 88 שורות כבר imported), conversions (leads → registrations → attended → purchased), ROI per campaign.
- `utm_campaign_id` (Facebook Ads enrichment מהאפיליאטס בורד) מתחבר לנתוני הלידים.

### תכנון
- SPEC נפרד אחרי שסעיפים 1-3 סגורים.
- לא חוסם P7 — אפשר להתחיל מעבר פריזמה בלי זה.

---

## סדר ביצוע מוצע

```
סעיף 1 (טופס הרשמה)  ←→  סעיף 2 (עמוד הסרה)     ← יכולים לרוץ במקביל, בניה מהירה
         ↓                        ↓
         └────────────────────────┘
                    ↓
   סעיף 3 (אוטומציות v2 — מסך נפרד)    ← הכי משוכלל, מרחב פעולה ל-Claude Code
                    ↓
               P7 (מעבר פריזמה)          ← סעיפים 1-3 חייבים להיות סגורים
                    ↓
        סעיף 4 (ADS Management)          ← לא חוסם P7, אחרי המעבר
```

### הערכת היקף
| סעיף | SPECs משוערים | ריפואים | מורכבות | עדיפות |
|------|-------------|---------|---------|--------|
| 1 — טופס הרשמה | 2 SPECs (ERP + Storefront) | opticup + opticup-storefront | בינונית | חוסם P7 |
| 2 — עמוד הסרה | 1-2 SPECs (ERP refactor + Storefront page) | opticup + opticup-storefront | נמוכה | חוסם P7 |
| 3 — אוטומציות v2 | 3-4 SPECs (מסך + engine + wizard + built-ins) | opticup | גבוהה | חוסם P7 |
| 4 — ADS Management | 1-2 SPECs | opticup | בינונית | אחרי P7 |

---

## מה לא בתוך ה-ROADMAP הזה (דברים שיכולים לחכות)

- WhatsApp channel (ממתין ל-Meta API)
- Scheduled reminders (scheduler EF) — אוטומציות מתוזמנות, שלב 2
- Token-based registration URL — **עכשיו חלק מסעיף 1** (לא נפרד)
- Tech-debt: `_shared/send-message-client.ts` extraction
- Event detail auto-refresh (M4-QA-07)
- Accessibility fixes (M4-QA-08)
- CRM Demo Seed SPEC

---

> **הערה:** זהו מסמך אסטרטגי. דניאל אישר את הכיוון של סעיפים 1-3.
> סעיף 4 (ADS) — לדיון אחרי שסעיפים 1-3 סגורים.
> SPECs ייכתבו ע"י opticup-strategic ויאושרו ע"י דניאל לפני כל ביצוע.
