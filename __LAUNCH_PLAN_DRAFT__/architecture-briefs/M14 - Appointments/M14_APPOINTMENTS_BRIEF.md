# M14 — Appointments — Architecture Brief

**גרסה:** v1
**תאריך:** 2026-05-07
**מחבר:** Main Strategic (skill `opticup-main-strategic`)
**יעד:** Module Strategist של M14 (סקיל `opticup-strategic`).

> זה לא SPEC. שכבת-ביניים בין Master Plan ל-SPEC. מגדיר ישויות, חוזים, דפוסים וסיכונים — לא Acceptance Criteria, לא שדות מלאים, לא Phases.

---

## 1. ייעוד M14

המודול שמחזיק את **תורים-מתוזמנים-מראש** — תורים-לבדיקה, תורים-לאיסוף, תורים-לתדרוך. מחליף את yoman.co.il שפריזמה משתמשת בו כיום. M14 הוא domain-neutral — מתאים לכל business עם תורים (אופטיקה, רופא, מספרה, מוסך, סטודיו).

**Out of scope:**
- תור-נוכחי-בחנות (queue/walk-in) — זה M15 (מודול נפרד, חיבור-לוגי דרך View).
- ביקורי-בית למוביל-אופטיקה — paused (Master Plan).
- לוגיקת-תקשורת (templates, channels, offsets) — זה M12 (Pattern 10 Fact-vs-Rule).

**Migration scope:** אין-מיגרציית-נתונים. yoman משאיר היסטוריה אצלו; OpticUp מתחיל נקי ביום-ה-cutover.

---

## 2. ישויות (גוש 1)

### 2.1 `appointments` — האירוע-עצמו

ישות-הליבה. תור-יחיד.

**State machine** (enum-Postgres, Pattern 9):
- `pending_approval` — נקבע ב-public booking, מחכה לאישור-צוות (כש-`requires_staff_approval=true`).
- `confirmed` — מאושר. ברירת-מחדל אם `requires_staff_approval=false`.
- `customer_confirmed_via_link` — הלקוח אישר-הגעה דרך הקישור.
- `arrived` — הצוות סימן "הגיע לחנות".
- `in_progress` — הבדיקה התחילה.
- `done` — הסתיימה.
- `no_show` — לא הופיע.
- `cancelled_by_customer` — בוטל ע"י הלקוח.
- `cancelled_by_staff` — בוטל ע"י הצוות.
- `rescheduled` — הועבר. רשומה זו נשמרת + רשומה-חדשה מקושרת ב-`rescheduled_to_id`.

**שדות-חובה:**
- `id`, `tenant_id`, `branch_id` (FK), `customer_id` (FK), `appointment_type_id` (FK), `resource_id` (FK — האופטומטריסט/בעל-מקצוע).
- `start_at`, `end_at` (timestamptz, מחושב מ-duration של ה-type).
- `status` (enum), `tenant_status_id` (FK ל-`appointment_statuses` — אופציונלי, לסטטוסים-tenant-מותאמים).
- `cancellation_token` (uuid, חד-פעמי, ייוצר ב-INSERT).
- `cancellation_reason_id` (FK — NULL כל עוד לא בוטל).
- `notification_sent_on_cancellation boolean` (תוצאה של ה-checkbox).
- `arrived_at`, `in_progress_at`, `done_at` — timestamps.
- `rescheduled_to_id` (FK self-ref).
- `created_via` enum: `public_booking`, `staff`, `migration`.
- `created_by` (FK staff/null).
- `notes_internal` text, `notes_from_customer` text.
- `home_visit_address` (deferred).
- soft-delete + audit timestamps.

**FKs יוצאים:**
- `customer_id` → `customers(id)` (M5).
- `branch_id` → `branches(id)`.
- `appointment_type_id` → `appointment_types(id)`.
- `resource_id` → `resources(id)` — האופטומטריסט/משאב.
- `tenant_status_id` → `appointment_statuses(id)` (NULL-able).
- `cancellation_reason_id` → `cancellation_reasons(id)` (NULL-able).
- `rescheduled_to_id` → `appointments(id)` (NULL-able, self-ref).

**FKs נכנסים** (מודולים אחרים מצביעים פנימה):
- M15 (Queue): `queue_entries.appointment_id` — אם המגיע יש-לו תור-יום.
- M12 (Communications): logged messages reference appointment_id.

### 2.2 `appointment_types` — קונפיגורציה per-tenant (P19)

סוגי-מפגשים שה-tenant מציע. **Configurable per-tenant** — לא enum.

**Day-1 שדות (אחרי קיצוץ-Daniel):**
- `id`, `tenant_id`, `code`, `name_he`, `name_en`, `description text`.
- `duration_minutes int NOT NULL` — משך-בדיקה.
- `color_hex` — צבע-פנימי בבלוק היומן.
- `max_per_day_weekday int NULL` — מקסימום-תורים-מסוג-זה ביום-חול. NULL = ללא הגבלה.
- `max_per_day_friday int NULL`, `max_per_day_saturday int NULL`.
- `assigned_resource_ids uuid[]` — רשימת-משאבים זמינים. NULL = כל המשאבים.
- `is_active`, `is_default`, `sort_order`, soft-delete.

**Deferred (לא ב-day-1):** הגבלות-גיל, units-per-appointment, requires-parent, price.

### 2.3 `branches` — Skeleton קיים (M1.5/shared)

כבר קיים ב-Optic Up. M14 דורש 2 שדות לוגיים (יכולים להיכתב על branches קיים):
- `display_hours_start`, `display_hours_end` — שעות-תצוגה ביומן הצוות (e.g., 08-20).
- `booking_hours_start`, `booking_hours_end` — שעות-זמינות-לזימון מצד-לקוח (e.g., 09-19).

**Daniel directive 2026-05-07:** Display ≠ booking. הצוות יכול ידנית לקבוע מחוץ ל-booking-hours בתוך display-hours.

### 2.4 `branch_hours` — שעות-עבודה פר-יום-בשבוע

**Day-1:** שורה פר-יום-בשבוע פר-סניף.
- `id`, `tenant_id`, `branch_id`, `day_of_week` (0-6, או enum).
- `is_open boolean` (false = יום סגור).
- `open_time`, `close_time` — שעות-תצוגה.
- `booking_open_time`, `booking_close_time` — שעות-זימון.
- `lunch_break_start`, `lunch_break_end` — NULL אם אין הפסקה. **מסומן באפור-בהיר ביומן** (Daniel directive).

### 2.5 `branch_hours_exceptions` — חריגות

**Day-1:** שורה פר-תאריך חריג פר-סניף.
- `id`, `tenant_id`, `branch_id`, `exception_date` date.
- `is_closed boolean` — סגור לחלוטין (חג, מילואים, חופשה).
- אם פתוח: `open_time`, `close_time`, `booking_open_time`, `booking_close_time`, `lunch_break_*`.
- `reason text`, `tenant_label text` — להצגה ביומן.

**חגי-ישראל** (ל"ג בעומר, יום-העצמאות, וכו') יסומנו ביומן אוטומטית מ-built-in calendar; tenant יכול להוסיף חריגות-משלו.

### 2.6 `resources` — צוות + משאבים

ישות "מי/מה זמין לקיים תור". יכולה להיות אופטומטריסט (אדם) או משאב-פיזי (חדר-בדיקה).

**Day-1 שדות:**
- `id`, `tenant_id`, `name`, `resource_type` enum: `staff`, `room`, `equipment`.
- `staff_id` (FK ל-`users` — NULL אם זה משאב פיזי, NOT NULL אם staff).
- `phone`, `email` — לקבלת-תזכורות (resource-level, ראה סעיף 3.4).
- `send_notifications boolean` — checkbox "שלח הודעות למשאב".
- `sms_enabled boolean`, `email_enabled boolean` — אילו ערוצים פעילים.
- `assigned_branches uuid[]` — סניפים שהמשאב פעיל בהם (multi-branch tenants).
- `description text`, `color_hex`, `is_active`, `sort_order`, soft-delete.

**Daniel insight (yoman tour):** משאב-staff מקבל הודעה כשנקבעת לו פגישה — לא רק הלקוח. דפוס-חדש למודול-תקשורת (M12) להכיר.

### 2.7 `resource_shifts` — משמרות

**Day-1:** מתי משאב זמין לקבוע אצלו פגישות.

- `id`, `tenant_id`, `resource_id`, `branch_id`, `shift_date` date OR `day_of_week` (recurring).
- `start_time`, `end_time`.
- `is_recurring boolean` — recurring vs one-off.
- `notes text`, soft-delete.

ב-day-1: מודל פשוט. Recurring shifts פר-יום-בשבוע + one-off exceptions.

### 2.8 `appointment_statuses` — סטטוסים configurable (Pattern 13 — system + tenant rows)

**Day-1 שדות:**
- `id`, `tenant_id`, `code`, `name_he`, `name_en`.
- `outline_color_hex` — צבע-מסגרת-חיצונית בבלוק היומן.
- `is_system boolean` — קבוע ע"י המערכת (cannot delete, color editable only).
- `applies_to_state` enum — איזה state-machine value זה מייצג (e.g., `cancelled`, `done`).
- `is_active`, `sort_order`, soft-delete.

**Seed system rows (7):**
| code | name_he | applies_to_state |
|---|---|---|
| `customer_confirmed` | לקוח אישר באתר | confirmed |
| `awaiting_staff_approval` | ממתין-לאישור-צוות | pending_approval |
| `arrived` | הגיע לחנות | arrived |
| `in_progress` | בבדיקה | in_progress |
| `done` | בוצע | done |
| `no_show` | לא הופיע | no_show |
| `cancelled` | בוטל | cancelled_by_customer / cancelled_by_staff |

**Tenant-rows:** ה-tenant יכול להוסיף סטטוסים-משלו עם צבע משלו (לדוגמה "VIP", "ממתין-לבדיקת-קופ"ח", "צריך-להחזיר-טלפון"). הצבעים תמיד מופיעים כ-outline.

### 2.9 `cancellation_reasons` — סיבות-ביטול configurable

**Day-1:**
- `id`, `tenant_id`, `code`, `name_he`, `name_en`, `cancelled_by` enum (`customer`/`staff`/`both`), `is_system`, `is_active`, `sort_order`, soft-delete.

**Seed rows:**
- "אופטומטריסט חולה" (staff)
- "סגירה חירום" (staff)
- "טעות-בקביעה" (staff)
- "אילוץ אישי" (customer)
- "מצאתי תור אחר" (customer)
- "אחר" (both)

### 2.10 `appointment_blocks` — חסימות-זמן

**Day-1:** רגעים-זמן ספציפיים שאסור לקבוע בהם תור (פגישת-צוות, חופשה-קצרה, ספירת-מלאי).

- `id`, `tenant_id`, `branch_id` (NULL = חסימה לכל הסניפים).
- `resource_id` (NULL = כל המשאבים בסניף).
- `start_at`, `end_at`.
- `reason_text`, `created_by`, soft-delete.

### 2.11 `otp_attempts` — ניסיונות OTP

לאכיפת rate-limiting + lockout (Daniel's 24h-block-after-3-attempts).

- `id`, `phone` (לא-FK, נשמר as-is), `tenant_id`, `attempted_at`, `successful boolean`, `ip_hash`.

ניתן ל-cleanup אחרי 30 ימים (deferred).

### 2.12 יחסים — תרשים

```
customers (M5) ◄──FK──── appointments
                              │
                              ├──FK──► appointment_types (M14 config)
                              ├──FK──► resources (M14 config)
                              ├──FK──► branches (shared)
                              ├──FK──► appointment_statuses (M14 config, system+tenant)
                              ├──FK──► cancellation_reasons (M14 config)
                              └──FK──► appointments (self, rescheduled_to_id)

branches ◄──FK── branch_hours (M14)
         ◄──FK── branch_hours_exceptions (M14)
         ◄──FK── appointment_blocks (M14)

resources ◄──FK── resource_shifts (M14)

queue_entries (M15) ──FK──► appointments  (אופציונלי — תור עם תור-יום-קבוע-מראש)
```

---

## 3. חוזים יוצאים (גוש 2)

### 3.1 Views — 6 ייעודיות

| View | צרכן | תוכן |
|---|---|---|
| `v_appointments_for_calendar` | M14 admin calendar UI | כל התורים בטווח-תאריך + customer name + type + resource + status (system+tenant). |
| `v_appointments_for_reminder` | M12 (Communications) | תורים-מחר + פרטי-לקוח + שפה + טלפון + email + recall axis. **No PII leaks** — only reminder-relevant fields. |
| `v_appointments_for_resource_notification` | M12 | תור-חדש שנקבע + פרטי-המשאב (phone/email/preferences). לשליחת-הודעה לאופטומטריסט עצמו. |
| `v_today_appointments_for_queue` | M15 (Queue) | תורי-יום-נוכחי + customer_id + status. ה-queue יודע מי קבע תור מראש. |
| `v_customer_queue_position` | M5 customer card | אם ללקוח יש תור-היום, מציג ב-block ה-Queue בלשונית-1. |
| `v_appointments_full_for_reports` | M11 | כל-תור + customer + type + resource + status + duration + cancellation_data. ל-reports analytics. |

### 3.2 RPCs — 8 ב-day-1

| RPC | חתימה | שימוש |
|---|---|---|
| `create_appointment_public` | `(tenant_id, type_id, slot_start, customer_data jsonb) → appointment_id, cancellation_token` | יצירת-תור מצד-לקוח. מטפל ב-customer dedup דרך M5. אם OTP מופעל — חוזר עם `requires_otp=true`. |
| `create_appointment_staff` | `(...)` | יצירה מצד-צוות. דומה אבל ללא OTP, ויכול לקבוע מחוץ ל-booking-hours (בתוך display-hours). |
| `cancel_appointment_via_token` | `(token, reason_id?) → success` | ביטול מצד-לקוח דרך הקישור. בודק-תוקף-token + window. |
| `cancel_appointment_staff` | `(appointment_id, reason_id, send_notification boolean) → success` | ביטול מצד-צוות. send_notification = ה-checkbox. |
| `reschedule_appointment` | `(appointment_id, new_slot_start, send_notification boolean) → new_appointment_id` | DELETE-old + CREATE-new. שני events ב-reports. |
| `verify_otp` | `(phone, otp_code) → token` | מאמת קוד. אחרי 3 ניסיונות = 24h lockout. |
| `mark_arrived` | `(appointment_id) → success` | סימון "הגיע לחנות". מקדם state, מוסיף ל-M15 queue. |
| `mark_no_show` | `(appointment_id) → success` | סימון "לא הופיע". בודק 3+ ב-12m → flag ב-M5 customer card. |

### 3.3 חוזים M14 ↔ M5

**Reads:**
- M14 קורא `v_customer_for_appointment` של M5 כשמציג פרטי-לקוח.
- M5 customer card lashonit-1 קורא `v_customer_queue_position` של M14/M15.

**Writes:**
- M14 קורא `create_customer` RPC של M5 ב-public-booking flow (יוצר prospect או מחבר ל-existing).
- M14 לא כותב ישירות ל-customers.

### 3.4 חוזים M14 ↔ M12 (Pattern 10 — Fact-vs-Rule)

**M14 = facts:**
- "תור #X נקבע."
- "תור #X בוטל."
- "תור #X הועבר."
- "תור #X מחר ב-10:00."

**M12 = rules:**
- "שלח אישור-תור מיידי."
- "שלח תזכורת 24h לפני."
- "שלח הודעת-ביטול ללקוח (אם flag-checkbox=on)."
- "שלח הודעה למשאב (אופטומטריסט) כשנקבע לו תור-חדש." ← **חדש מ-yoman**.

**Bridge:** Views (`v_appointments_for_reminder`, `v_appointments_for_resource_notification`).

**M12 לא קוראת מ-`appointments` ישירות.**

### 3.5 חוזים M14 ↔ M15 (Queue)

**Reads:** M15 קורא `v_today_appointments_for_queue` ויודע מי בא עם תור.

**Writes:** M15 לא כותב ל-`appointments`. הוא יוצר רשומת `queue_entries` עם FK ל-`appointment_id` (NULL ל-walk-ins).

**Logical priority:** ב-queue, walk-ins עם `appointment_id != NULL` + `status='arrived'` מקבלים עדיפות עליונה.

### 3.6 חוזים M14 ↔ M11 (Reports)

`v_appointments_full_for_reports` חושפת קטעי-מטריקה: utilization-rate, no-show-rate, cancellation-rate, avg-duration, popular-types-by-day.

---

## 4. דפוסי עיצוב חוצי-מודול (גוש 3)

### 4.1 RLS canonical pattern
ראה M5 / Iron Rule 15. שני policies (service_bypass + tenant_isolation עם JWT-claim).

### 4.2 Soft-delete תמיד
Iron Rule 3.

### 4.3 Audit trail
כל שינוי-state ב-`appointments` נכתב ל-`activity_log` (M1.5).

### 4.4 i18n per-record
לקוח עם שפה=ru → תזכורת ב-WhatsApp ברוסית.

### 4.5 Defense-in-depth
Iron Rule 22.

### 4.6 Dedup-on-create (M5)
public-booking flow תמיד דרך `create_customer` של M5, לא INSERT ישיר.

### 4.7 Configuration-over-code (Pattern P19 reinforced)
appointment_types, statuses, cancellation_reasons — כולם פר-tenant.

### 4.8 Pattern 13 — System rows + tenant rows in same config table (חדש v1)

**Definition:** טבלת-קונפיגורציה שיש בה ערכים-מערכת (קבועים, נדרשים-לתפקוד-קוד) + ערכי-tenant (חופשיים).

**Implementation:**
- `is_system boolean` flag על כל שורה.
- System rows: seed-loaded, `code` הוא הזהות-לקוד, ניתן רק לערוך color/name (לא למחוק).
- Tenant rows: free-form, full-edit/delete.
- Code branches על `code` של system rows בלבד; tenant rows אינם מובנים-בקוד.

**שימושים נוכחיים:**
- M14: `appointment_statuses`, `cancellation_reasons`.
- M5/M6 ניתן להחיל אם רלוונטי (prescription_types is similar).

**עיקרון:** מאפשר tenant להרחיב מבלי לסכן את ה-flow-המערכתי. ה-Module Strategist של M14 כותב את ה-seed migration.

### 4.9 Pattern 10 — Fact-vs-Rule
M14 facts → M12 rules. כפי שב-M6 / M7.

### 4.10 Sequential numbers (Iron Rule 32)

ל-`appointments` יש `appointment_number` (sequential פר-tenant). Iron Rule 32 חל:
- ביטול-מיידי-של-תור-חדש (בלי activity) → ניתן ל-hard-delete + שחרור-מספר.
- ביטול אחרי הגעה / שינוי-state / הודעה-נשלחה → soft-delete בלבד, מספר נשאר.

---

## 5. סיכונים אסטרטגיים (גוש 4)

### 5.1 התקנת WhatsApp תזכורות לפני cutover
**הסיכון:** Master Plan §6 #1 — WhatsApp **חייב** להיות פעיל ב-day-1. אם M14 שלוח דרך M12 ו-M12 לא מוכן, אין תזכורות-תור.
**טיפול:** M14 SPEC תלוי ב-M12 SPEC. ה-Module Strategist של M14 מתקן את הסדר עם Module Strategist של M12 לפני SPECs פר-מודול.

### 5.2 OTP - מניעת abuse + עלות-SMS
**הסיכון:** בוטים יכולים לבזבז SMS-credits של ה-tenant.
**טיפול:** 3 ניסיונות-קוד-שגוי = 24h lockout (`otp_attempts` table). אין rate-limit על שליחת-OTP אבל יש על אישור-קוד. הצגת WhatsApp-link כ-fallback.

### 5.3 Privacy ב-public booking
**הסיכון:** חשיפת מידע על לקוחות-קיימים ב-flow של "טלפון תואם משפחה".
**טיפול (Daniel directive):** server **לא** מחזיר רשימת-שמות. רק שואל "הזן שם" ומחפש פר-טלפון+שם. אין-leakage על מי קיים.

### 5.4 אובדן תזכורות בקיצוץ-עלות-SMS
**הסיכון:** tenant חוסך כסף ומבטל SMS — לקוחות לא מקבלים תזכורות → no-shows גוברים.
**טיפול:** M12 brief צריך להגדיר fallback (WhatsApp-free → SMS-paid). ב-day-1 פריזמה: WhatsApp רק.

### 5.5 Resource-notification spam לאופטומטריסט
**הסיכון:** אופטומטריסט מקבל 30 SMS ביום על כל פגישה-חדשה — אי-נוחות.
**טיפול:** `resource.send_notifications` כברירת-מחדל = false. tenant מפעיל ידנית. + סלקטור-ערוצים פר-משאב (SMS/email/none).

### 5.6 Conflict בין booking-hours ל-display-hours בעת shift-changes
**הסיכון:** tenant מקצר shift אבל יש כבר תור בשעה הזו.
**טיפול:** SPEC לטפל ב-edge-case: שינוי-shift לא-מבטל-תורים-קיימים, רק חוסם-תורים-חדשים.

### 5.7 Multi-branch resource sharing
**הסיכון:** אופטומטריסט עובד יום בסניף-A, יום בסניף-B. לוח-יומן מתבלבל.
**טיפול:** `resource_shifts.branch_id` חובה. View מסנן פר-branch_id-של-המשתמש-המחובר.

---

## 6. Deferred List

1. **חוקי-זימון מתקדמים** — gap-בין-פגישות, רצף-שעות-מינימלי, max-per-resource-per-day.
2. **Recurring appointments** — תור פעם-בשנה אוטומטי.
3. **Multi-participant appointments** — סדנאות, שיעורי-יוגה.
4. **Family booking** — כמה תורים יחד למשפחה (yoman מציע).
5. **Google Calendar sync** (2-way) — סנכרון לאופטומטריסטים.
6. **Home visits** — בעתיד אם מובייל-אופטיקה יחזור.
7. **Advanced utilization reports** — אחוזי-נצילות פר-יום/פר-אופטומטריסט/פר-סוג.
8. **SMS-package management** — ניהול-יחידות-SMS פר-tenant.
9. **Appointment categories/groups** — קבוצות של appointment_types.
10. **OTP throttling — block-lift early** — מנהל יכול לשחרר 24h-lockout ידנית.
11. **Resource-tags filter** ב-yoman — תיוג-משאבים לסינון-מהיר.
12. **Custom dynamic fields** ב-public booking (yoman: שדות-נוספים-לפי-tenant).
13. **iCal feed/embed** — tenant מקבל URL לפיד-יומן ל-Google Calendar/Outlook.

---

## 7. UX / Screens (חדש v1)

**4 Mockups:**
- `M14_APPOINTMENTS_MOCKUP.html` — מסך-יומן ראשי (week-view, dual-color appointments, sidebar עם משאבים+מקרא).
- `M14_APPOINTMENTS_SCREENS.html` — 3 מסכי-משנה:
  - הגדרות יומן (8 sub-sections, ניווט-צד).
  - Public booking page (4 שלבים, OTP אופציונלי).
  - ניהול-תור (קישור-מהודעה, 6 פעולות).

**עיקרי-עיצוב:**

- **Dual-color appointments:** רקע=סוג, מסגרת=סטטוס. שני מקורות-מידע בו-זמנית.
- **Display-hours ≠ booking-hours.** שעות-תצוגה רחבות יותר; הצוות יכול ידנית לקבוע מחוץ ל-booking, אבל זה במכוון.
- **Lunch break = אפור-בהיר.** בולט אך לא חוסם.
- **Today = highlighted בצהבהב** (column-header + day-column subtle).
- **Saturday = closed-by-default** עם אזור אפור-מלא.
- **Holiday band** — חגי-ישראל מוצגים אוטומטית כ-band עליון על-פני היום.
- **Cancelled appointments = stay visible** עם opacity-מופחת + line-through. לא נמחקים מהמסך.
- **No-show appointments = red border** + badge "no-show #3" אם זה ה-flagging-threshold.

---

## 8. Entry Points ל-Module Strategist

1. קורא קובץ זה.
2. קורא Master Plan §4 (M14).
3. קורא M5 brief (חוזה customer + dedup pattern).
4. קורא 4 ה-mockups.
5. כותב `modules/Module 14 - Appointments/MODULE_14_ROADMAP.md` עם Phases:
   - **Phase A** — Schema + RLS + 6 Views.
   - **Phase B** — RPCs + state-machine transitions.
   - **Phase C** — Public booking page (URL + UI).
   - **Phase D** — Admin calendar UI (week-view, day-view, click-handlers, drag-drop).
   - **Phase E** — Settings UI.
   - **Phase F** — Customer-management page (manage-link).
   - **Phase G** — M12 integration (reminder rules + Pattern 10).
   - **Phase H** — Day-1 pilot on Prizma (live cutover from yoman).
6. כותב `modules/Module 14/docs/MODULE_SPEC.md`.
7. SPEC נפרד לכל phase.

---

## 9. החלטות-נסגרות

1. ✅ M14 = Appointments only. **M15 = Queue (separate module)**.
2. ✅ Day-1 scope = essentials, deferred = the rest (10+ items).
3. ✅ Public booking page = M14 own URL (book.opticalis.co.il/{tenant}), not embedded in M3.
4. ✅ Booking minimum fields: name + phone + type + slot. Email optional.
5. ✅ Family-phone privacy: server doesn't list customers; asks for name; matches phone+name.
6. ✅ OTP tenant-configurable, default off. 3 wrong attempts = 24h lockout.
7. ✅ Working hours: 2-layer (`branch_hours` + `branch_hours_exceptions`).
8. ✅ Display hours ≠ booking hours.
9. ✅ Reminders flow through M12 (Pattern 10).
10. ✅ Cancellation: customer side = single "manage" link (not 2 separate). Staff side = reason + checkbox-suppress-message.
11. ✅ Reschedule = DELETE-old + CREATE-new (2 events).
12. ✅ Duplicate-booking = warn but allow.
13. ✅ No-show: manual-mark + reason + 3+/12m flag.
14. ✅ Confirm-arrival button (from yoman) + .ics + Google Calendar links.
15. ✅ Appointment types simple: name + duration + max-per-day + color + assigned-resource. No age limits.
16. ✅ Resource selection in booking flow tenant-configurable. Resource-label string ("optometrist"/"doctor"/etc.).
17. ✅ Branch selection in booking (if multi-branch).
18. ✅ Calendar interactions: click-empty=quick-create, right-click=block, drag=reschedule, double-click=details.
19. ✅ Default view: Day (most productive). Week+Month available.
20. ✅ Dashboard = action-oriented (not metric-dashboard like yoman).
21. ✅ Dual-color appointments: type-fill + status-outline (always both).
22. ✅ Statuses = system-rows (7 fixed) + tenant-rows (free). Pattern 13.
23. ✅ Lunch break = light-gray-shaded, bookable but discouraged.
24. ✅ Resource-level reminders (yoman insight): each resource has phone+email+toggle.
25. ✅ "Awaiting staff approval" status → tenant-configurable toggle (default off).
26. ✅ 4 mockups (1 main + 3 sub-screens) approved.

---

*סוף M14 Architecture Brief v1. עודכן 2026-05-07.*
*הצעד הבא: M15 (Queue) — מודול קטן, חוזה ל-M14 כבר ידוע.*
