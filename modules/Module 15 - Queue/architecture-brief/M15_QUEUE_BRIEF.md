# M15 — Queue (תור-נוכחי-בחנות) — Architecture Brief

**גרסה:** v1
**תאריך:** 2026-05-07
**מחבר:** Architect (skill `opticup-architect`)
**יעד:** Module Strategist של M15.

> זה לא SPEC. שכבת-ביניים בין Master Plan ל-SPEC.

---

## 1. ייעוד M15

המודול שמחזיק את **התור-הנוכחי בחנות** — מי בא, מי ממתין, מי בבדיקה, מי סיים. *לא* קביעת-תורים מראש (זה M14).

**Out of scope:**
- תורים-מתוזמנים-מראש (M14).
- תקשורת-ל-customer (M12).

**Migration scope:** אין-מיגרציה. M15 הוא חדש לחלוטין; פריזמה לא ניהלה queue במערכת לפני.

**Domain neutrality:** M15 הוא domain-neutral. מתאים לכל business עם תור-בחנות (אופטיקה, מספרה, קופ"ח, משרד-ממשלה).

---

## 2. ישויות (גוש 1)

### 2.1 `queue_entries` — הישות-היחידה

**State machine** (enum-Postgres):
- `waiting` — בתור.
- `in_progress` — אצל בעל-מקצוע.
- `done` — סיים, יצא.
- `removed` — הוצא מהתור (התחרט, יצא ללא בדיקה, טעות-הוספה).

**שדות-חובה:**
- `id`, `tenant_id`, `branch_id`.
- `customer_id` (FK ל-M5 customers).
- `appointment_id` (FK ל-M14 appointments — NULL אם walk-in).
- `preferred_resource_id` (FK ל-M14 resources — NULL = משותף, אופציונלי).
- `status` enum (4 ערכים).
- `joined_at` timestamptz NOT NULL — מתי נוסף לתור.
- `started_at` timestamptz — מתי עבר ל-in_progress.
- `completed_at` timestamptz — מתי עבר ל-done/removed.
- `wait_seconds_at_completion int` — מחושב כש-state עובר ל-in_progress (=`started_at - joined_at`). שמור לדוחות.
- `removal_reason_id` (FK ל-`queue_removal_reasons` — NULL כל עוד לא הוסר).
- `notes_internal text`.
- `created_by` (FK staff).
- soft-delete + audit timestamps.

**FKs נכנסים:** אין. Queue הוא ישות-קצה.

### 2.2 `queue_removal_reasons` — סיבות-הסרה (Pattern 13)

**Day-1 שדות:**
- `id`, `tenant_id`, `code`, `name_he`, `name_en`, `is_system`, `is_active`, `sort_order`, soft-delete.

**Seed system rows:**
- "התחרט / יצא"
- "טעות-הוספה"
- "טופל ללא בדיקה" (קיבל אביזר, התייעץ קצרות)
- "אחר"

ה-tenant יכול להוסיף סיבות-משלו (Pattern 13 — system + tenant rows).

### 2.3 הגדרות פר-tenant (ב-`tenant_settings`)

- `queue.warning_threshold_minutes int` — סף-להפיכת-שורה-לכתום (default 20).
- `queue.urgent_threshold_minutes int` — סף-להפיכת-שורה-לאדום (default 30).
- `queue.show_to_public boolean` — האם להציג ל-public surface (default false ב-day-1, deferred-feature אם true).

### 2.4 יחסים — תרשים

```
customers (M5)        ◄──FK── queue_entries
appointments (M14)    ◄──FK── queue_entries (NULL-able)
resources (M14)       ◄──FK── queue_entries.preferred_resource_id (NULL-able)
branches              ◄──FK── queue_entries
queue_removal_reasons ◄──FK── queue_entries.removal_reason_id (NULL-able)
```

---

## 3. חוזים יוצאים (גוש 2)

### 3.1 Views — 3

| View | צרכן | תוכן |
|---|---|---|
| `v_active_queue_for_panel` | M14 admin UI (queue panel) | רשומות-queue פעילות (status IN waiting/in_progress) של היום, מיון לפי has_appointment-ראשון + joined_at-אחר-כך. כולל customer name, customer_number, appointment context, computed wait_minutes. |
| `v_customer_queue_position` | M5 customer card lashonit-1 | אם ללקוח יש queue-entry פעיל — מציג position + wait_minutes + status. |
| `v_queue_history_for_reports` | M11 | היסטוריה מלאה. wait_seconds, removal_reasons, peak-hours analysis, conversion-rate (waiting → done). |

### 3.2 RPCs — 5 ב-day-1

| RPC | חתימה | שימוש |
|---|---|---|
| `add_to_queue` | `(customer_id, branch_id, appointment_id?, preferred_resource_id?) → queue_entry_id` | הוספה-ידנית. אם appointment_id מסופק — מסמן את ה-appointment כ-`arrived` במקביל. |
| `start_queue_entry` | `(queue_entry_id) → success` | מעבר ל-`in_progress`. אם יש appointment_id מקושר — אטומית מסנכרן את ה-appointment.status ל-`in_progress`. |
| `complete_queue_entry` | `(queue_entry_id) → success` | מעבר ל-`done`. סנכרון appointment.status ל-`done`. |
| `remove_from_queue` | `(queue_entry_id, reason_id, notes?) → success` | מעבר ל-`removed`. *לא* מסנכרן appointment (Daniel logic: ביטול-תור הוא flow אחר). |
| `update_queue_thresholds` | `(tenant_id, warning_min, urgent_min) → success` | עדכון tenant-settings. |

**עיקרון אטומיות:** start/complete RPCs מבצעים שני updates בטרנזקציה אחת — queue_entry + linked appointment. אם אחד נכשל, שניהם rollback.

### 3.3 חוזים M15 ↔ M5 (Customers)

- M15 קורא `v_customer_for_queue` של M5 (קיים?) או `v_customer_for_appointment` (משותף).
- M5 customer card lashonit-1 קורא `v_customer_queue_position` של M15.
- M15 לא כותב ל-customers.

### 3.4 חוזים M15 ↔ M14 (Appointments)

- **Reads:** M15 קורא `v_today_appointments_for_queue` של M14 כש-staff מוסיף-ל-queue (בודק אם ללקוח יש תור-יום).
- **Writes:** M15 קורא RPCs של M14 (`mark_arrived`, `mark_in_progress`, `mark_done`) דרך start/complete RPCs.
- **Bidirectional sync:** queue_entry.status ↔ appointment.status מסונכרנים אטומית.
- **לא** קוראים ישירות ל-`appointments` table.

### 3.5 חוזים M15 ↔ M11 (Reports)

`v_queue_history_for_reports` חושפת:
- wait_seconds פר-customer/day/month.
- conversion-rate (waiting → done vs waiting → removed).
- peak-hours analysis.
- average-wait פר-resource/branch/day-of-week.

---

## 4. דפוסים חוצי-מודול (גוש 3)

### 4.1 RLS canonical, soft-delete, audit, defense-in-depth, i18n
כפי ש-M5/M6/M7/M14. אין חידושים.

### 4.2 Pattern 9 — State-machine מפורש
4 states ב-queue_entries. enum-Postgres. transitions דרך RPCs בלבד.

### 4.3 Pattern 13 — System + tenant rows in config table
`queue_removal_reasons` מיישם את ה-pattern. seed rows עם is_system=true; tenant יכול להוסיף.

### 4.4 Pattern 14 — Cross-module atomic state sync (חדש v1)

**Definition:** כש-2 ישויות במודולים שונים מייצגות *את אותו אירוע-עסקי בשני מודלים*, ה-state-transitions שלהן חייבים להיות מסונכרנים אטומית.

**Implementation:**
- RPC במודול-אחד מבצע את שני ה-UPDATE-ים בטרנזקציה אחת.
- אם אחד נכשל — הכל מתבטל.
- ה-RPC חי במודול-המוביל (במקרה שלנו, M15 — כי ה-trigger-המקורי מגיע מהפיזי שהלקוח-בחנות).

**שימוש נוכחי:** queue_entry.status ↔ appointment.status (M15 ↔ M14).

**שימוש עתידי:** order.status ↔ payment.status (M7 ↔ M8) — אם הזמנה-נסגרת, התשלום-הסופי-המקושר חייב לנעול.

---

## 5. סיכונים אסטרטגיים (גוש 4)

### 5.1 Race condition בסנכרון-state
**הסיכון:** queue_entry עבר ל-in_progress, אבל ה-appointment.status לא התעדכן (network failure, conflict).
**טיפול:** Pattern 14 — RPC אטומי. שניהם או אף-אחד.

### 5.2 Queue-entry יתום (orphan)
**הסיכון:** customer נמחק (soft-delete) אבל queue_entry קיים.
**טיפול:** Iron Rule 5.5 (M5 brief): customer soft-delete לא מסתיר FKs. queue_entry נשאר גלוי, מציג "(נמחק)" לצד השם.

### 5.3 כפילויות ב-queue
**הסיכון:** סייעת מוסיפה לקוח שכבר ב-queue.
**טיפול:** `add_to_queue` RPC בודק אם יש queue_entry פעיל (waiting/in_progress) לאותו customer ביום הנוכחי. אם כן — error: "X כבר בתור". UX יציע לפתוח את הקיים.

### 5.4 חוסר-עקיבה אם הצוות שכח לסיים-בדיקה
**הסיכון:** queue_entry נשאר ב-`in_progress` 4 שעות כי האופטומטריסט שכח ללחוץ "סיים".
**טיפול ב-day-1:** הסטטיסטיקה תזהה (wait_seconds_at_completion חריג). UI יציג shortcut "סיים את כל ה-in_progress של אתמול" בבוקר. Auto-close-after-X-hours = deferred.

### 5.5 ביצוע-תקלה: customer קיים אבל זמן-המתנה ארוך מדי
**הסיכון:** מירי דהן ממתינה 45 דקות. UI מציג אדום-בוהק. אבל הצוות לא רואה כי עסוק.
**טיפול ב-day-1:** UI בלבד (אדום + סף-קונפיגורבילי). Notifications-לצוות (push/sound) = deferred.

---

## 6. Deferred List

1. **Public-facing display** (טלוויזיה בחנות / SMS-עדכון / QR-link).
2. **Auto-close-stale-in-progress** — אם state=in_progress > 4h, מסומן.
3. **Notifications-לצוות** כש-wait עובר את הסף.
4. **Multi-resource queues** (תור-נפרד פר-משאב, אם tenant ירצה).
5. **Estimated wait time** — אומדן "עוד X דקות" מבוסס על משך-בדיקה ממוצע.
6. **Walk-in-friendly mode** — סוג-תור שמותאם ל-walk-ins-בלבד (עם או בלי queue).
7. **Queue-entry transfer** — העברת לקוח מ-resource-A ל-resource-B מתוך הפאנל.
8. **Bulk actions** — "סיים את כל ה-in_progress של ד"ר נועה" ב-קליק.

---

## 7. UX / Screens

**Mockup:** `modules/Module 15 - Queue/architecture-brief/M15_QUEUE_MOCKUP.html`.

**עיקרון-עיצוב:** Queue הוא **פאנל מוטבע** במסך-היומן של M14, צד-ימין. רוחב 340px, height auto עד מקסימום של מסך-היומן.

**3 סקציות בפאנל:**
1. **Header:** סטטיסטיקה-מהירה (5 בתור, 2 בבדיקה, 14 הסתיימו, 12' המתנה ממוצעת) + כפתור "+ הוסף לתור".
2. **בבדיקה כעת** (state=in_progress): רשימה קצרה, רקע כחול, כפתור-cta=✓ (סיים).
3. **ממתינים** (state=waiting): מי-שיש-לו-תור ראשון, walk-ins אחרי. צבעי-זמן: רגיל / כתום / אדום.

**Color-coding:**
- ירוק = יש-לו-תור-מראש (badge "תור HH:MM").
- כחול = walk-in.
- אדום-בוהק = ממתין יותר מהסף הקריטי (default 30 דק').

**Interactions:**
- Click on entry → פותח את כרטיס-הלקוח של M5 בטאב-חדש.
- → button → start_queue_entry.
- ✓ button → complete_queue_entry.
- ✕ button → remove_from_queue (דיאלוג: בחר סיבה).

---

## 8. Entry Points ל-Module Strategist

1. קורא קובץ זה.
2. קורא Master Plan §4.
3. קורא M5 brief + M14 brief (חוזי customer + appointment).
4. קורא mockup `M15_QUEUE_MOCKUP.html`.
5. כותב `modules/Module 15 - Queue/MODULE_15_ROADMAP.md`. Phases מומלצות:
   - **Phase A** — Schema + RLS + 3 Views.
   - **Phase B** — RPCs + state-machine + atomic sync עם M14.
   - **Phase C** — UI panel ב-M14 calendar.
   - **Phase D** — Day-1 pilot.
6. כותב MODULE_SPEC.

---

## 9. החלטות-נסגרות

1. ✅ M15 = מודול נפרד מ-M14 (ולא משולב). Daniel directive.
2. ✅ M15 UI = פאנל-מוטבע במסך-יומן של M14, לא מסך-נפרד.
3. ✅ הוספה-ל-queue ידנית בלבד (לא אוטומטית מ-appointments).
4. ✅ 4 states: `waiting`, `in_progress`, `done`, `removed`.
5. ✅ Atomic sync מול appointment.status (Pattern 14 חדש).
6. ✅ תור-אחד-משותף עם `preferred_resource_id` אופציונלי.
7. ✅ Day-1 = internal-only. Public surface = deferred.
8. ✅ שמירת-היסטוריה אוטומטית. אין איפוס-יומי.
9. ✅ זמן-המתנה מחושב אוטומטית עם 2 ספי-צבע (configurable per-tenant).
10. ✅ Pattern 13 על `queue_removal_reasons` (system + tenant rows).
11. ✅ Pattern 14 חדש (cross-module atomic state sync).

---

*סוף M15 Architecture Brief v1. עודכן 2026-05-07.*
*הצעד הבא: M8 (Payments) — חזרה ל-core triplet עם זיכרון-טרי.*
