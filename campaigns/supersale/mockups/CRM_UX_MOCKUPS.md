# CRM UX/UI Mockups — תיעוד מלא

> **סטטוס:** ✅ גרסאות סופיות מוכנות — FINAL files
> **תאריך:** 2026-04-21 (updated)
> **מטרה:** לבנות מודול CRM מקצועי שמחליף את Monday.com לחלוטין
> **דרישה מדניאל:** "יותר גמיש, יותר סינונים, יותר מקצועי ונוח מ-Monday. פי 100,000 יותר טוב."

---

## 1. הקשר — למה עושים את זה

דניאל עובד היום עם Monday.com לניהול קמפיין SuperSale (אירועי מכירות של מותגי משקפיים).
Monday עושה את העבודה אבל:
- נראה כמו spreadsheet, לא כמו CRM מקצועי
- הסינונים בסיסיים (קבוצות ב-board)
- הודעות מוטמעות בתוך Make.com — לא ניתנות לעריכה בלי להיכנס ל-Make
- אין דשבורד אחוד עם KPIs
- אין מסך ייעודי ליום אירוע
- אין ציר זמן per-lead

**הSכמה כבר מוכנה:** `CRM_SCHEMA_DESIGN.md` v3 — 23 טבלאות, 7 Views, 8 RPCs, 46 RLS policies.
**הנתונים כבר מיובאים:** 893 לידים, 149 משתתפים, 11 אירועים, 695 הערות, 88 רשומות ad_spend.

---

## 2. Design System — שפה עיצובית אחידה

### צבעים

| שימוש | צבע | Hex |
|-------|------|-----|
| Sidebar | אינדיגו כהה | #1e1b4b |
| Sidebar gradient | אינדיגו | #312e81 |
| Accent / CTA | סגול | #8b5cf6 |
| רקע תוכן | לבן / אפור-סגלגל | #f8f7ff / #f9fafb |
| Success / ירוק | ירוק | #22c55e |
| Warning / כתום | כתום | #f59e0b |
| Danger / אדום | אדום | #ef4444 |
| Neutral / אפור | אפור | #6b7280 |

### סטטוסי ליד

| סטטוס | צבע | Hex |
|-------|------|-----|
| חדש | ירוק | #22c55e |
| ממתין לאירוע | כחול | #3b82f6 |
| הוזמן לאירוע | סגול | #8b5cf6 |
| אישר הגעה | ירוק כהה | #16a34a |
| לא מעוניין | אדום | #ef4444 |
| הסיר מרשימה | אפור | #6b7280 |

### סטטוסי אירוע

| סטטוס | צבע | Hex |
|-------|------|-----|
| תכנון | אפור | #9ca3af |
| הרשמה פתוחה | ירוק | #22c55e |
| נסגר | אדום | #ef4444 |
| 2-3 ימים לפני | כתום | #f59e0b |
| יום האירוע | סגול | #8b5cf6 |
| הושלם | אפור | #6b7280 |

### סטטוסי משתתף

| סטטוס | צבע | Hex |
|-------|------|-----|
| חדש (נרשם) | ירוק | #22c55e |
| רשימת המתנה | חום | #92400e |
| אישר (שילם) | ירוק | #22c55e |
| הגיע | ורוד | #ec4899 |
| ביטל | אדום | #ef4444 |

### ערוצי הודעות

| ערוץ | צבע | Hex |
|------|------|-----|
| WhatsApp | ירוק | #25D366 |
| SMS | כחול | #3b82f6 |
| Email | כתום | #f59e0b |

### טיפוגרפיה
- **Font:** Heebo (Google Fonts) — Hebrew-first
- **Weights:** 400 (body), 500 (medium), 700 (bold), 900 (hero numbers)
- **Direction:** RTL (dir="rtl", lang="he")

### טכנולוגיה
- Tailwind CSS via CDN
- Lucide Icons via CDN
- Single-file HTML (no build step)
- Self-contained — אפשר לפתוח בכל דפדפן

---

## 3. המסכים — 5 מסכים × 3 וריאציות = 15 קבצים

### 3.1 דשבורד (01-dashboard)

**מטרה:** מבט אחד על כל ה-CRM — KPIs, אירוע נוכחי, פעילות אחרונה

#### וריאציה A — "Executive" (מקורית משופרת)
- **קובץ:** `01-dashboard-A.html`
- **סגנון:** Clean cards layout — 4 KPI cards + משפך אופקי + activity feed + quick actions
- **מתאים ל:** מנהל שרוצה מבט מהיר
- **layout:** KPIs → Funnel → [Activity | Quick Actions] בשתי עמודות

#### וריאציה B — "Command Center"
- **קובץ:** `01-dashboard-B.html`
- **סגנון:** Dark theme, data-dense. KPIs גדולים עם sparklines, גרף עמודות של אירועים אחרונים, מפת חום של ערים, פיד חי עם פילטרים
- **מתאים ל:** מי שרוצה הרבה מידע במסך אחד
- **layout:** Hero KPIs → [Chart | Heatmap] → [Feed | Events timeline]

#### וריאציה C — "Focus Mode"
- **קובץ:** `01-dashboard-C.html`
- **סגנון:** מינימליסטי. כרטיס אירוע אחד גדול עם כל הפרטים, KPIs כ-inline stats, timeline vertical, quick actions כ-floating buttons
- **מתאים ל:** מי שמנהל אירוע אחד בזמן נתון ורוצה פשטות
- **layout:** Event Hero Card → Vertical Timeline → Floating FAB

---

### 3.2 ניהול לידים (02-leads)

**מטרה:** רשימת לידים עם סינונים חכמים, פרטי ליד נשלפים, bulk actions

#### וריאציה A — "Segment Sidebar" (מקורית משופרת)
- **קובץ:** `02-leads-A.html`
- **סגנון:** Sidebar שמאלי עם סגמנטים + טבלה + פאנל פרטי ליד נשלף מימין
- **חידוש מ-Monday:** סגמנטים חכמים עם ספירות, לא קבוצות סטטיות
- **layout:** [Segments sidebar] | [Table + filters] | [Detail panel]

#### וריאציה B — "Kanban Pipeline"
- **קובץ:** `02-leads-B.html`
- **סגנון:** Kanban boards — כל סטטוס הוא עמודה, כרטיסי לידים ניתנים לגרירה. פאנל פרטים נשלף מלמטה (bottom sheet)
- **חידוש מ-Monday:** ויזואלי, רואים את כל הפייפליין בבת אחת
- **layout:** Filter bar → Kanban columns → Bottom detail sheet

#### וריאציה C — "Hybrid View"
- **קובץ:** `02-leads-C.html`
- **סגנון:** Toggle בין Table / Kanban / Cards. Filters bar חכם עם saved filters. Detail = modal מרכזי גדול (לא sidebar)
- **חידוש מ-Monday:** שלושה views במסך אחד, saved filters
- **layout:** View toggle + smart filters → [Table OR Kanban OR Cards] → Modal detail

---

### 3.3 ניהול אירועים (03-events)

**מטרה:** ניהול אירוע בודד — משתתפים, סטטוסים, הודעות, סטטיסטיקות

#### וריאציה A — "Event Command" (מקורית משופרת)
- **קובץ:** `03-events-A.html`
- **סגנון:** Header + KPI cards + משפך + tabs (משתתפים/הודעות/סטטיסטיקות). קבוצות מתקפלות לפי סטטוס
- **layout:** Event header → KPIs → Funnel → Tabbed content

#### וריאציה B — "Split View"
- **קובץ:** `03-events-B.html`
- **סגנון:** שני פאנלים: שמאל = רשימת משתתפים (Kanban mini), ימין = פרטי משתתף נבחר + timeline + פעולות. Header קומפקטי עם KPIs inline
- **layout:** Compact header → [Attendees kanban | Selected attendee detail]

#### וריאציה C — "Timeline Focus"
- **קובץ:** `03-events-C.html`
- **סגנון:** ציר זמן אופקי של האירוע (Planning → Open → Closed → Event Day → Completed) כ-stepper עליון. תחתיו: תוכן דינמי לפי שלב. KPIs כ-sidebar ימני קבוע
- **layout:** Timeline stepper → [Dynamic content per stage | KPI sidebar]

---

### 3.4 מרכז הודעות (04-messaging)

**מטרה:** כל ההודעות במקום אחד — templates, עריכה, שליחה, לוג

#### וריאציה A — "Editor Pro" (מקורית משופרת)
- **קובץ:** `04-messaging-A.html`
- **סגנון:** שמאל = רשימת templates, ימין = עורך עם preview. Broadcast panel למטה
- **layout:** [Templates list | Editor + Preview] → Broadcast panel

#### וריאציה B — "Visual Flow"
- **קובץ:** `04-messaging-B.html`
- **סגנון:** תצוגת flowchart — כל trigger מחובר לactions בקווים. לחיצה על node פותחת editor. Broadcast כ-floating panel. Message log כ-drawer
- **layout:** Flow diagram → Node editor (modal) → Floating broadcast

#### וריאציה C — "Campaign Calendar"
- **קובץ:** `04-messaging-C.html`
- **סגנון:** לוח שנה עם הודעות מתוזמנות, templates כ-sidebar ימני, editor כ-modal. Dashboard של delivery stats למעלה
- **layout:** Delivery stats → [Calendar | Templates sidebar] → Editor modal

---

### 3.5 יום אירוע (05-event-day)

**מטרה:** מסך tablet לצ'ק-אין מהיר ביום האירוע

#### וריאציה A — "POS Style" (מקורית משופרת)
- **קובץ:** `05-event-day-A.html`
- **סגנון:** חיפוש גדול + כרטיסי משתתפים + פיד חי + סטטיסטיקות. מותאם למגע
- **layout:** [Search + Attendee cards | Live feed] → Stats bar

#### וריאציה B — "Kiosk Mode"
- **קובץ:** `05-event-day-B.html`
- **סגנון:** מסך מלא, מינימלי. שדה חיפוש ענקי במרכז, תוצאה אחת בזמן (כרטיס גדול), כפתור צ'ק-אין ירוק ענקי. סטטיסטיקות בסרגל עליון. בלי פיד — רק פעולה
- **layout:** Stats bar → HUGE search → Single result card → Giant check-in button

#### וריאציה C — "Split Dashboard"
- **קובץ:** `05-event-day-C.html`
- **סגנון:** שלושה עמודות: שמאל = רשימת ממתינים (שטרם הגיעו), אמצע = חיפוש + צ'ק-אין, ימין = הגיעו + רכישות. Counter bar למעלה עם אנימציות
- **layout:** Counter bar → [Waiting list | Check-in center | Arrived + purchases]

---

## 4. מה שונה מ-Monday — העקרונות

| Monday.com | CRM חדש |
|------------|---------|
| קבוצות סטטיות (All Leads / Not Interested) | סגמנטים חכמים עם ספירות דינמיות |
| טבלה אחת, אין toggle | Table / Kanban / Cards / Timeline toggle |
| הודעות בתוך Make.com | מרכז הודעות מובנה עם editor ו-preview |
| אין דשבורד | דשבורד עם KPIs, משפך, activity feed |
| אין מסך יום אירוע | מסך tablet ייעודי לצ'ק-אין |
| אין ציר זמן per-lead | Timeline tab בכרטיס ליד |
| סינון בסיסי | Smart filters עם saved presets |
| אין bulk actions | Bulk actions: שנה סטטוס, תייג, שלח הודעה |
| "לא מעוניין" = קבוצה נפרדת | סגמנט אוטומטי + חזרה אוטומטית ברישום מחדש |
| Design = spreadsheet | Design = SaaS premium (Attio/HubSpot level) |

---

## 5. התאמה ל-Schema

כל mockup חייב לתאום ל-`CRM_SCHEMA_DESIGN.md` v3:

| mockup | טבלאות DB רלוונטיות | Views רלוונטיים |
|--------|---------------------|-----------------|
| Dashboard | crm_events, crm_leads, crm_campaigns | v_crm_event_stats, v_crm_event_dashboard |
| Leads | crm_leads, crm_lead_tags, crm_tags, crm_statuses, crm_custom_field_vals | v_crm_leads_with_tags, v_crm_lead_event_history, v_crm_lead_timeline |
| Events | crm_events, crm_event_attendees, crm_event_status_history | v_crm_event_stats, v_crm_event_attendees_full, v_crm_event_dashboard |
| Messaging | crm_message_templates, crm_automation_rules, crm_broadcasts, crm_message_log | — |
| Event Day | crm_event_attendees, crm_events | v_crm_event_attendees_full |

---

## 6. קבצים — מצב נוכחי

### V0 (הגרסה הראשונה — approved by Daniel)
| קובץ | סטטוס |
|-------|-------|
| `01-dashboard.html` | ✅ V0 מאושר |
| `02-leads.html` | ✅ V0 מאושר |
| `03-events.html` | ✅ V0 מאושר |
| `04-messaging.html` | ✅ V0 מאושר |
| `05-event-day.html` | ✅ V0 מאושר |

### V1 — 3 וריאציות (✅ הושלם 2026-04-20)
| קובץ | סטטוס | סגנון | גודל |
|-------|-------|-------|------|
| `01-dashboard-A.html` | ✅ | Executive — clean cards, donut chart, sparklines | 50KB |
| `01-dashboard-B.html` | ✅ | Command Center — dark theme, bar charts, gauges | 44KB |
| `01-dashboard-C.html` | ✅ | Focus Mode — hero card, minimal, Apple-like | 23KB |
| `02-leads-A.html` | ✅ | Segment Sidebar — icons, sliding detail panel | 62KB |
| `02-leads-B.html` | ✅ | Kanban Pipeline — drag columns, bottom sheet | 50KB |
| `02-leads-C.html` | ✅ | Hybrid View — toggle views, modal, saved filters | 34KB |
| `03-events-A.html` | ✅ | Event Command — SVG funnel, KPI sparklines | 49KB |
| `03-events-B.html` | ✅ | Split View — attendee kanban + detail panel | 34KB |
| `03-events-C.html` | ✅ | Timeline Focus — stepper + KPI sidebar | 28KB |
| `04-messaging-A.html` | ✅ | Editor Pro — code editor feel, phone preview | 59KB |
| `04-messaging-B.html` | ✅ | Visual Flow — flowchart nodes, SVG lines | 25KB |
| `04-messaging-C.html` | ✅ | Campaign Calendar — monthly grid, delivery stats | 41KB |
| `05-event-day-A.html` | ✅ | POS Style — big search, confetti animation | 39KB |
| `05-event-day-B.html` | ✅ | Kiosk Mode — single focus, giant buttons | 18KB |
| `05-event-day-C.html` | ✅ | Split Dashboard — 3 columns, waiting/check-in/arrived | 22KB |

---

## 7. החלטות שנלקחו

| # | החלטה | הסבר |
|---|-------|------|
| 1 | Sidebar navigation אחיד בכל המסכים | ה-user מנווט בין מסכי CRM דרך sidebar קבוע |
| 2 | RTL Hebrew first | כל הUI בעברית, dir="rtl", font Heebo |
| 3 | Tailwind CSS + Lucide Icons | CDN only, no build step |
| 4 | Single file HTML | כל mockup עצמאי — אפשר לפתוח בדפדפן |
| 5 | Sample data מאירוע #22 | 87 registered → 69 confirmed → 32 attended → 31 purchased → ₪39,460 |
| 6 | Monday "groups" → Smart Segments | "לא מעוניינים" לא נעלמים, אלא מסוננים אוטומטית |
| 7 | Detail panel = sliding (לא modal) | בוריאציה A — sliding panel. בוריאציות אחרות: modal או bottom sheet |
| 8 | Event Day = מסך tablet ייעודי | בלי sidebar, כפתורים גדולים, high contrast |

---

## 8. בחירות דניאל (2026-04-21)

| מסך | וריאציה שנבחרה | סיבה |
|-----|----------------|------|
| Dashboard | **B — Command Center** | כרטיסים צבעוניים גדולים, הרבה מידע במסך אחד |
| Leads | **C — Hybrid View** | טבלה נקייה + מודאל, toggle בין views |
| Events | **A — Event Command** | טיימליין + סטטיסטיקות מפורטות, SVG funnel |
| Messaging | **A — Editor Pro** | עורך מתקדם + preview של 3 ערוצים |
| Event Day | **C — Split Dashboard** | 3 עמודות, מינימלי לטאבלט |

---

## 9. דרישות חדשות (2026-04-21)

### 9.1 Role-Based Visibility
- **מימוש:** Toggle בין "מנהל ראשי" ל-"צוות" בכל מסך
- **צוות לא רואה:** סכומי כסף כוללים (הכנסות, ₪ totals, revenue KPIs)
- **צוות כן רואה:** ספירות משתתפים, שיעורי המרה, סטטוסים
- **טכני:** `data-admin-only` attributes + CSS class toggle

### 9.2 סריקת ברקוד במסך הראשי (Event Day)
- **שדה סריקה גדול** ובולט בראש המסך — auto-focus בעת טעינת הדף
- **בלי לחיצה על כפתור** — סורק ברקוד פיזי שולח Enter אוטומטית
- **התאמה אוטומטית** לשם המשתתף + צ'ק-אין מיידי
- חיפוש טקסט נשאר כאופציה משנית

### 9.3 הזנת סכום רכישה (Event Day)
- **אחרי צ'ק-אין:** המשתתף עובר לעמודה "הגיעו" עם סטטוס "ממתינים לקנייה"
- **תזכורת עדינה:** badge כתום "💰 הזן סכום" מופיע (non-blocking)
- **הזנת סכום:** לחיצה על כרטיס → שדה input פשוט + כפתור "שמור"
- **כפתור "היסטוריה":** מראה רשימת כל מי שעדיין לא הוזן לו סכום — batch update קל
- **לא חוסם את הסריקה** — הכל ברקע

---

## 10. קבצים סופיים (FINAL)

| קובץ | מבוסס על | תוספות | גודל |
|-------|----------|--------|------|
| `FINAL-01-dashboard.html` | B — Command Center | Role toggle, unified sidebar | 45KB |
| `FINAL-02-leads.html` | C — Hybrid View | Role toggle (revenue column hidden), unified sidebar | 37KB |
| `FINAL-03-events.html` | A — Event Command | Role toggle (revenue KPIs + purchase amounts hidden), unified sidebar | 51KB |
| `FINAL-04-messaging.html` | A — Editor Pro | Role indicator, unified sidebar | 60KB |
| `FINAL-05-event-day.html` | C — Split Dashboard | Role toggle, barcode scanner, purchase amount entry, history button | 36KB |

---

## 11. הצעד הבא

1. ✅ דניאל מאשר את ה-FINAL mockups
2. ⬜ בונים את המודול האמיתי עם Supabase data (893 לידים, 149 משתתפים, 11 אירועים)
3. ⬜ מחברים ל-schema v3 (23 טבלאות, 7 Views, 8 RPCs)
4. ⬜ מחליפים את Monday.com לחלוטין

---

*עדכון אחרון: 2026-04-21*
