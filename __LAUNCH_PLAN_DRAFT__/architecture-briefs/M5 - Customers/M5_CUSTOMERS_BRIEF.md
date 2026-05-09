# M5 — Customers — Architecture Brief

**גרסה:** v3 (2026-05-07 — תוספות UX/screens מהסשן של 2026-05-07)
**תאריך:** 2026-05-07
**מחבר:** Main Strategic (skill `opticup-main-strategic`)
**יעד:** Module Strategist של M5 (סקיל `opticup-strategic`) שיכתוב על בסיס המסמך הזה את ה-`MODULE_5_ROADMAP.md`, את ה-MODULE_SPEC, ואת ה-SPECs הפרטיים.

> **שינויים מ-v2 (סשן 2026-05-07):**
> - הוסף סעיף 9 — מסך כרטיס-הלקוח (5 לשוניות).
> - הוסף סעיף 10 — מסך ניהול-לקוחות (רשימה + ניווט-צד + חיפוש).
> - הוסף סעיף 11 — מצב-יצירה (אותו כרטיס, מצב empty+edit).
> - הוסף סעיף 12 — Customer Number = משולב tenant+branch+customer.
> - הוסף סעיף 13 — Iron Rule 32 (חדש) — Sequential Number Cancellation.
> - הוסף סעיף 14 — Customer-list display preferences (configurable per-tenant).
> - הוסף Views חדשים בסעיף 3 (M14 queue, M6 prescription summary).
>
> **שינוי גדול שנשמר מ-v2:** הגבול "M4=לידים, M5=לקוחות" קרס. ישות-יחידה `customers` עם `lifecycle_stage` (prospect/active/dormant). M4 (CRM) קיים אבל מחזיק *אינטראקציות-שיווק*, לא אנשים. ראה סעיף 1.1.

> **זה לא SPEC.** זה Architecture Brief — שכבת-ביניים בין ה-Master Plan ל-SPEC. הוא מגדיר ישויות, חוזים, דפוסים, סיכונים, וקווי-מתאר UX — לא Acceptance Criteria, לא שדות מלאים, לא Phases.

---

## 1. ייעוד M5 — שורת-מטרה אחת

M5 הוא **המודול שמחזיק את ישות-האדם של פריזמה (ובהמשך של כל tenant)** — נקודת-החיבור שכל מודול אחר תלוי בה: M4 (אינטראקציות-CRM), M6 (בדיקות), M7 (הזמנות), M8 (תשלומים), M11 (דוחות), M12 (תקשורת), M13 (מועדון), M14 (תורים).

**Scope migration:**
- 5,028 לקוחות פעילים (≥1 הזמנה) מ-OpticPlus → OpticUp עם `lifecycle_stage='active'`.
- 1158 לידים-קיימים מ-`crm_leads` הנוכחי → migrate לאותה טבלה `customers` עם `lifecycle_stage='prospect'`.
- לא pre-2021. לא לקוחות-בלי-הזמנות-ובלי-אינטראקציה.
- ראה Master Plan §4 / Decision Log Apr 27.

## 1.1 שינוי-גבול מהותי v2 — CRM ↔ Customers (2026-05-06)

**הבעיה ב-v1:** הופרדו ל-`crm_leads` (M4) ו-`customers` (M5). אדם שהוא גם לקוח-קיים וגם נרשם לקמפיין-עתידי לא יכול להיות מתועד נכון. המודל קרס בפועל.

**ההחלטה ב-v2:**

1. **ישות-אדם אחת = `customers`.** כל אדם, בכל שלב.
2. **שדה `lifecycle_stage`** enum: `prospect` (נרשם, לא קנה), `active` (קנה לפחות פעם), `dormant` (לא פעיל 24m+).
3. **`crm_leads` *מתבטל*** כטבלה-נפרדת. כל הרשומות הקיימות (1158) מתגלגלות ל-`customers` עם stage=`prospect` ושמירת UTM/source.
4. **M4 (CRM) נשאר מודול** — תוכנו: *אינטראקציות-שיווק* (`crm_event_attendees`, `crm_facebook_campaigns`, `crm_message_log`). כל אינטראקציה מצביעה ל-`customer_id`.
5. **הפרדת-תצוגה ב-UI** (ולא הפרדת-טבלאות):
   - מסך-לקוחות (קופה/מוכר/אופטומטריסט) — מציג רק `active` + `dormant`.
   - מסך-CRM (CS/מנהל-קמפיינים) — מציג כולם, פילטר-stage לבחירה.
6. **כל ישות-תפעולית** (orders, prescriptions, exams, payments, appointments) מצביעה ל-`customer_id` ללא קשר ל-stage. אדם ב-stage=`prospect` יכול לקבל הצעת-מחיר/מרשם — שמור עליו, ימשיך לעבוד כש-stage יעלה ל-`active` בקנייה הראשונה.

**FK מ-`customers` ל-`crm_leads.id`** (שהוצע ב-v1) — מבוטל. אין יותר crm_leads.

**שינוי lifecycle_stage** — אוטומטי בטריגר: יצירת order ראשונה → stage=`active`. inactive 24m+ → stage=`dormant`.

---

## 2. ישויות (גוש 1)

### 2.1 `customers` — ישות הלקוח עצמה

ישות-הליבה. שדות: כל מה שמופיע בכרטיס-לקוח של OpticPlus (ראה screenshot באודיט) **plus** מה שכבר קיים ב-`crm_leads` (מקור הליד). ה-Module Strategist מחבר את שתי הרשימות מהאודיט.

**עיקרון:** Architecture Brief לא מגדיר שדות. הברירת-מחדל היא: כל שדה שקיים ב-OpticPlus + ב-`crm_leads` עובר. Module Strategist מחליט על types/constraints. NULL-able על שדות שלא תמיד מולאים (ת"ז, אימייל, יום-הולדת, מקצוע, קופה).

**FKs יוצאים מ-`customers`:**
- `household_id` → `households(id)` — NULL-able. רוב הלקוחות NULL.
- `health_fund_id` → `health_funds(id)` — NULL-able.
- `home_branch_id` → `branches(id)` — NOT NULL. הסניף שבו הלקוח "נפתח". משמש לדוחות-פר-סניף ולהרכבת ה-customer-number המוצג. ראה סעיף 12.

**שדה lifecycle (v2):**
- `lifecycle_stage` enum: `prospect` / `active` / `dormant`.
- שדות-שיווקיים שעוברים מ-crm_leads: `source`, `utm_*`, `first_interaction_at`, `consent_form_signed_at`.

**שדה customer_number (v3 — סעיף 12):**
- `customer_number` integer NOT NULL — מספר-עוקב פר-tenant, נוצר אטומית ב-RPC, לא משתנה לעולם, לא מתחזר אחרי שמספר-גבוה-ממנו נוצר.
- `UNIQUE (customer_number, tenant_id)` (Iron Rule 18 — tenant-scoped UNIQUE).

### 2.2 `households` — Skeleton בלבד ב-day-1

**Day-1 שדות עסקיים (4):**
- `id` (uuid, PK)
- `tenant_id` (uuid)
- `primary_customer_id` (uuid, FK ל-customers — מי "ראש-המשפחה" לחיוב/תקשורת)
- `created_at`
- `status` enum: `active` / `inactive`
- `is_deleted` + `deleted_at` (soft-delete pattern)

זהו. הישות קיימת בעיקר כדי להחזיק FK עתידי ולא לחייב migration לאחור כשנפעיל family-pooling/billing/marketing משפחתי.

**הסיבה לקיום הישות (חשוב להבהיר):**
- *לא* כדי לעקוף UNIQUE על טלפון. טלפון `UNIQUE (phone, tenant_id)` תמיד.
- *כן* כדי לתמוך ב-M13 family pooling, חיוב משותף עתידי, שיווק משפחתי, יתרת-זיכוי משותפת.

**שיתוף-טלפון בתוך משפחה:** הוא חריג, לא ברירת-מחדל. רוב בני-המשפחה אצל פריזמה — לכל אחד טלפון משלו. שיתוף אמיתי (אמא+ילד-קטין) מטופל כ-UX exception — הדיאלוג ב-UI: "הטלפון רשום ל-X. האם זה אותה משפחה / אותו אדם / טעות". לא אילוץ-סכמה.

### 2.3 `health_funds` — Skeleton קונפיגורציה per-tenant

**Day-1 שדות (5):**
- `id`, `tenant_id`, `name`, `code`, `is_active`
- `created_at`, soft-delete

**מה לא ב-day-1 (deferred — מתועד בסעיף 6):** טבלת הסכמים, חישובי-החזר, תקופות-תוקף.

**הצדקה:** Iron Rule 19 — configurable values are tables, not enums. tenant חדש (במדינה אחרת) יקבל סט-קופות משלו בלי שינוי-קוד.

### 2.3.1 `tenant_languages` — Skeleton קונפיגורציה per-tenant (תוספת 2026-05-06)

**Day-1 שדות (5):**
- `id`, `tenant_id`, `language_code` (ISO: he/ru/en/es/...), `is_active`, `is_default`
- `sort_order`, `created_at`

**הצדקה:** Pattern P19 — tenant 2 יבחר שפות שונות מפריזמה. במקום enum-קשיח HE/RU/EN/ES, טבלה per-tenant. שדה `customers.language_code` הוא string (ISO), ה-UI מסנן רק שפות-פעילות לפי tenant.

ב-day-1 פריזמה: 3 שורות פעילות (he, ru, en) + 1 לא-פעילה (es).

### 2.3.2 `branches` — קיים, עם תוספת lifecycle

ישות `branches` כבר קיימת. M5 דורש:
- `branch_code` integer/string קצר (1-2 ספרות) per-tenant. UNIQUE per-tenant.
- `is_active` + `deactivated_at` — סניף שנסגר עם פעילות עובר ל-inactive, branch_code שלו נשאר תפוס לתמיד.
- `delete_branch` RPC: מאפשר hard-delete רק אם אין קשרי-FK בכלל (אפס לקוחות, אפס הזמנות, אפס תורים, אפס פעילות). ראה סעיף 13 (Iron Rule 32).

### 2.3.3 `customer_notes` — תוספת v3

טבלה נפרדת לתמיכה ב"הערות-עסקיות" + "הערות-רפואיות" שמופיעות בכרטיס-הלקוח (סעיף 9 לשונית 1).

**Day-1 שדות:**
- `id`, `tenant_id`, `customer_id` (FK), `note_type` enum (`business`/`medical_q`/`diagnostics`), `content` text, `created_at`, `created_by`, `is_deleted`, `deleted_at`.

**עיקרון:** הערות-רפואיות *לא נשלחות ללקוח לעולם*. הערות-עסקיות *לעולם לא יוצאות מהמערכת ללא בדיקה*. ה-View `v_customer_for_messaging` לא חושף הערות.

### 2.3.4 `customer_documents` — תוספת v3

טבלה לתמיכה בלשונית-מסמכים (סעיף 9 לשונית 5).

**Day-1 שדות:**
- `id`, `tenant_id`, `customer_id`, `category` enum (`doctor_prescription`/`external_exam`/`health_fund`/`other`), `file_path` text (Storage path), `original_name`, `uploaded_at`, `uploaded_by`, `is_deleted`.

**Storage:** Supabase Storage Bucket per-tenant. Path pattern: `{tenant_id}/{customer_id}/{document_id}.{ext}`. ללא עברית בנתיב. תוקן 2026-05-06 על-בסיס lesson מ-feedback_migration_lessons.

### 2.4 `loyalty_members` — לא ב-M5

מצוין כאן רק כדי להבהיר: M5 **לא** מחזיק את ישות-החבר. זה M13. הקשר: 1:1 אופציונלי, FK מ-`loyalty_members` ל-`customers`.

### 2.5 יחסים — תרשים

```
customers (M5) ─────FK──────► households (M5, skeleton)
    │
    ├─FK──► health_funds (M5, skeleton)
    │
    ├─FK──► branches (M1.5/shared) [home_branch_id]
    │
    ├─FK──► tenant_languages (M5)
    │
    ├──◄FK── customer_notes (M5, v3)
    ├──◄FK── customer_documents (M5, v3)
    │
    ◄──FK── loyalty_members (M13, 1:1 optional)
    ◄──FK── orders (M7), prescriptions (M6), exams (M6),
            payments (M8), appointments (M14), queue_entries (M14)
```

---

## 3. חוזים יוצאים (גוש 2)

**עיקרון מנחה (Iron Rule 13):** אף מודול לא קורא ישירות מ-`customers` או `households`. הכל דרך View. כל פעולת-כתיבה דרך RPC.

### 3.1 Views — 9 ייעודיות per consumer-module (v3 — הוסף M14 + M6 surface)

| View | הצרכן | מה חושף |
|---|---|---|
| `v_customer_for_exam` | M6 | id, full_name, gender, birth_date, health_fund_code, language |
| `v_customer_for_order` | M7 | superset של exam + address, phone, email, id_number, household_id, customer_number_display |
| `v_customer_for_payment` | M8 | id, full_name, id_number, health_fund_id, language |
| `v_customer_full` | M11 | רחב — דמוגרפיה + מטריקות-אגרגציה (סך-קניות, last-purchase, סך-זיכויים) |
| `v_customer_for_messaging` | M12 | id, full_name, phone, email, language, marketing_consent_flags. **לא הערות.** |
| `v_customer_for_loyalty` | M13 | id, full_name, household_id, birth_date, language |
| `v_customer_for_appointment` | M14 | id, full_name, phone, language, household_id |
| **`v_customer_prescriptions_summary`** *(v3)* | M5 customer card tab-3 | M6 prescriptions list — date, type, status, optometrist, R/L summary, expiry, notes count |
| **`v_customer_queue_position`** *(v3)* | M5 customer card tab-1 (Queue block) | M14 queue position for this customer — queue_id, position, wait_minutes, queue_status |

**עיקרון:** כל View חושפת בדיוק את מה שהצרכן צריך — ולא יותר. אם M6 לא צריך טלפון, אסור לחשוף לו טלפון. זה מונע drift סמוי.

### 3.2 RPCs — 5 ב-day-1 (v3 — הוסף 2)

| RPC | חתימה | שימוש |
|---|---|---|
| `create_customer` | `(payload jsonb) → customer_id, customer_number` | יצירה מכל מקור (M4 lead-conversion, M14 walk-in, import). מכיל לוגיקת-dedup קנונית (סעיף 4.7). אטומי, מקצה customer_number באותה טרנזקציה. |
| `merge_customers` | `(primary_id, secondary_id) → primary_id` | מיזוג כפילויות. atomic. מעביר כל FK (orders/exams/payments) ל-primary. customer_number של secondary נשאר ברצף עם marker מיזוג. |
| `assign_to_household` | `(customer_id, household_id)` | שיוך / יצירת משק-בית. atomic. |
| **`delete_last_unused_customer`** *(v3)* | `(customer_id) → success boolean` | Iron Rule 32 — מוחק לקוח אחרון-ברצף אם אין לו פעילות. אטומי, FOR UPDATE, מוודא max + zero FK בתוך הטרנזקציה. |
| **`update_customer_display_preferences`** *(v3)* | `(tenant_id, prefs jsonb)` | עדכון tenant-level display preferences לרשימת-לקוחות (טורים, סדר, צפיפות, sub-line, row-actions). ראה סעיף 14. |

**אסור** למודול אחר לעשות INSERT/UPDATE/DELETE ישיר על `customers` או `households`. הכל דרך RPC.

### 3.3 חוזה M4 ↔ M5 (v2)

`crm_leads` **מבוטל כטבלה-נפרדת**. כל הלידים מתגלגלים ל-`customers` עם stage=`prospect`.

M4 הופך ל**מודול-אינטראקציות**:
- `crm_event_attendees` — מי נרשם לאירוע. FK ל-`customers.id`.
- `crm_facebook_campaigns` — קמפיינים. FK ל-`customers.id` ללקוחות שהומרו.
- `crm_message_log` — הודעות-שיווק שנשלחו. FK ל-`customers.id`.
- אין יותר `crm_leads`.

UI:
- מסך-לקוחות (קופה/מוכר/אופטומטריסט) → רק `lifecycle_stage IN ('active', 'dormant')`.
- מסך-CRM (CS/מנהל-קמפיינים) → כולם, פילטר אופציונלי.

### 3.4 חוזים M5 ↔ M6 (v3)

- `v_customer_prescriptions_summary` — חוזה-קריאה. M5 קורא, M6 מחזיק.
- כפתור "+ מרשם חדש" בכרטיס-הלקוח (לשונית-3) → קורא RPC של M6 (`create_prescription_draft(customer_id)`) → ניווט ל-M6 prescription editor.
- כפתור "פתח ב-M6" על שורה ברשימת-מרשמים → ניווט ל-M6 עם prescription_id.

### 3.5 חוזים M5 ↔ M14 (v3)

- `v_customer_queue_position` — חוזה-קריאה. M5 קורא, M14 מחזיק.
- RPCs של M14 (קריאה מ-M5):
  - `add_to_queue(customer_id, queue_id, queue_type)`
  - `remove_from_queue(customer_id, queue_id)`
  - `promote_in_queue(customer_id, queue_id)` — קידום-מהיר.
- בלוק-Queue בלשונית-1 של כרטיס-הלקוח קורא רק. כל פעולה — דרך RPC של M14.

---

## 4. דפוסי עיצוב חוצי-מודול (גוש 3)

8 דפוסים. כל Module Strategist של M5 (וכל מודול אחר) מחויב ליישם או לתעד "לא רלוונטי".

### 4.1 RLS canonical pattern
**ההחלטה:** שני policies — `service_bypass` ל-service_role + `tenant_isolation` עם JWT-claim. בדיוק כמו `pending_sales`. אין יצירתיות.
**מקור:** Iron Rule 15 / CLAUDE.md §5.

### 4.2 Soft-delete תמיד
**ההחלטה:** `is_deleted boolean default false` + `deleted_at timestamptz` על כל טבלה. כל View: `WHERE is_deleted = false`. כל RPC-מחיקה: עדכון flag.
**מיוחד ב-M5:** customer מחוק = הזמנות-יתום אסורות. soft-delete שומר LTV ל-M11.
**יוצא-מן-הכלל ל-Iron Rule 32:** הלקוח האחרון ברצף, ללא פעילות, יכול לעבור hard-delete (סעיף 13).

### 4.3 Audit trail על שינויי-PII
**ההחלטה:** כל UPDATE לטלפון/ת"ז/אימייל/כתובת/יום-הולדת ב-`customers` נכתב ל-`activity_log` הקיים (M1.5). דרך trigger בטבלה — לא בקוד-אפליקציה.

### 4.4 Draft/Commit
**ההחלטה:** **לא רלוונטי ב-M5.** ב-OpticPlus זה היה ב-prescriptions (`bdka` flag) — שייך ל-M6.

### 4.5 i18n per-record
**ההחלטה:** שדה `language` על הרשומה עצמה (customer, order, exam) — NULL-able עם fallback ל-tenant default.
**עיקרון:** שפה היא תכונת-נתון, לא תכונת-משתמש. PDF/WhatsApp נגזרים מהשפה של הרשומה.

### 4.6 Defense-in-depth on writes
**ההחלטה:** כל INSERT/UPDATE על `customers`/`households` חייב להעביר `tenant_id` במפורש. גם כש-RLS אוכפת.
**מקור:** Iron Rule 22.

### 4.7 Dedup-on-create canonical algorithm
**ההחלטה:** `create_customer` RPC מחיל אלגוריתם קבוע:
1. ת"ז קיימת ב-tenant → החזר את הקיים, אל תיצור.
2. טלפון קיים ב-tenant → התראה ל-UI ("האם אותו אדם / אותה משפחה / טעות?").
3. שם+תאריך-לידה זהים → suggestion רך.

**כולם** משתמשים ב-RPC הזה: M4 lead-conversion, M14 walk-in, migration-tools. אסור INSERT ישיר ל-customers.

### 4.8 Migration-from-OpticPlus pattern
**ההחלטה:** מיגרציה דרך migration-role בלבד, RLS מנוטרל זמנית. ה-Module Strategist כותב SPEC נפרד למיגרציה. הפטרן (migration-role + RLS-off + verification + RLS-on) משותף ל-M6/M7/M8/M9.

### 4.9 Configuration-over-code (v3 reinforced)
**ההחלטה:** כל החלטת-עיצוב-UI שאינה משפיעה על data integrity, security, או cross-tenant contracts → configurable per-tenant. דוגמאות ב-M5: טורי-רשימה, סדר-טורים, צפיפות-שורה, תוכן-sub-line, row-actions. ראה סעיף 14.
**מקור:** Pattern P19 + Iron Rule 19 + Daniel directive 2026-05-07.

---

## 5. סיכונים אסטרטגיים (גוש 4)

### 5.1 מיגרציה לא-נקייה
**הסיכון:** 5,028 לקוחות מכילים כפילויות, טלפונים פגומים, ת"ז חסרות. as-is migration → חוב טכני שיציף M11/M12/M13.
**טיפול:** Migration-SPEC נפרד עם 4 שלבים — dedup-discovery → Daniel-review → phone-fix → INSERT.

### 5.2 Consent — מודל 4-flags עצמאיים (v2 — 2026-05-06)
**ההחלטה:** במקום שדה-יחיד עם 3 ערכים, **4 שדות-Boolean עצמאיים** על customer:

| שדה | תחום | ברירת-מחדל בהגירה (לקוח-וותיק) | ברירת-מחדל בהגירה (ליד) |
|---|---|---|---|
| `customer_marketing_consent` | מבצעים/קופונים מפריזמה ללקוח | `opted_out` | `opted_out` |
| `customer_operational_consent` | תזכורת-בדיקה, מסירת-משקפיים | **`opted_in`** | `opted_out` |
| `crm_marketing_consent` | קמפיינים-שיווקיים של CRM | `opted_out` | `opted_out` |
| `crm_operational_consent` | פרטי-אירוע שנרשם אליו | `opted_out` | `opted_out` |

**כללים:**
- ארבעת השדות **עצמאיים**. אדם יכול להיות מנוי לתפעולי-לקוח אבל לא ל-3 השאר.
- M12 בודק את ה-flag הספציפי לפי סוג ההודעה ומקור-הקריאה (M5 vs M4).
- **Re-subscription רק אקטיבי** — אדם שהוריד את עצמו מ-`crm_marketing_consent` והפך ללקוח-קונה לאחר-מכן **לא** מקבל אותו אוטומטית. אם רוצה לחזור — חייב לפנות ל-CS שיחזיר ידנית.
- שינוי `lifecycle_stage` מ-`prospect` ל-`active` (קנייה-ראשונה) **לא משפיע** על ה-flags.

**מחייב את M5 ואת M12.** ה-Brief של M12 יקבל את זה כדפוס-בסיס לכל בדיקת-consent לפני שליחה.

### 5.3 Household-skeleton-חסר
**הסיכון:** אם נסתפק ב-3 שדות, נצטרך migration כש-M13 ירצה pooling.
**טיפול:** להוסיף `created_at` + `status` כבר ב-day-1. עלות אפסית, חוסך migration.

### 5.4 Health-fund mapping ללא טבלת-מיפוי
**הסיכון:** ב-OpticPlus `kupa` הוא string חופשי / enum-לא-אחיד ("מכבי" / "Maccabi" / "מכ"). מיגרציה גולמית → לקוחות עם `health_fund_id = NULL` שאמורים היו להיות ממופים.
**טיפול:** Migration-SPEC כולל discovery-script + טבלת-מיפוי-ידנית של Daniel (30 דקות).

### 5.5 Customer כמרכז-FK — מה קורה עם delete/merge
**הסיכון:** פקיד טועה / מוחק לקוח עם 12 הזמנות + 8 בדיקות + 24 תשלומים. כל Module Strategist ימציא תשובה שונה.
**ההחלטה האסטרטגית הקנונית:**
1. soft-delete על customer **לא** מסתיר FKs. הזמנות/בדיקות/תשלומים נשארים גלויים בדוחות.
2. `merge_customers` RPC הוא הדרך-היחידה לאחד שני לקוחות.
3. פקיד שמוחק לקוח עם הזמנות-פתוחות מקבל error: "ללקוח X יש 3 הזמנות פתוחות. סגור או השתמש ב-merge."
4. **חריג Iron Rule 32 (v3):** לקוח אחרון-ברצף ללא פעילות יכול לעבור hard-delete דרך `delete_last_unused_customer`. ראה סעיף 13.

**מחייב את M5 + M6 + M7 + M8.**

### 5.6 Customer-number gap — מנקודת-מבט של רואה-חשבון (v3)
**הסיכון:** מנקודת-מבט של מערכת-הנהלת-חשבונות, רצפי-לקוחות עם פערים מעוררים חשד. עם זאת, ההחלטה האסטרטגית של Optic Up היא רצף-נקי בלי-פערים (Iron Rule 32).
**טיפול:** Iron Rule 32 (סעיף 13) — מספר משתחרר רק אם הוא ה-max-הנוכחי וללא פעילות. ביטולים מאוחרים לא משחררים מספר. רצף שלם תמיד.

---

## 6. Deferred List — לא ב-day-1, לתיעוד-עתידי

נשמר כאן כדי שלא יישכח. M5 Module Strategist **אסור לו** להוסיף את אלה ל-day-1 SPEC אלא אם Daniel ביקש במפורש.

1. **`health_fund_agreements`** — תמחור-לפי-קופה: פרוסות (עד-600 / מעל-600), אחוזי-החזר, תקופות-תוקף, סוגי-כיסוי (פלטינום/זהב), שוטף+90/+120.
2. **`households` — שדות עסקיים**: כתובת משותפת, חיוב משותף, יתרת-זיכוי משותפת, סוג-משק-בית, ראש-משק-בית-לחיוב נפרד.
3. **multi-coverage**: לקוח עם 2 קופות (משלים + ראשי). N:M.
4. **`customer_relationships`**: קרבה משפחתית מפורשת (בן/בת/אישה/הורה).
5. **Consent מפורט-לפי-ערוץ**: WhatsApp/SMS/Email/Push בנפרד, במקום flag כללי.
6. **GDPR-anonymize RPC**: מחיקה אמיתית עם anonymization של PII רשומות-קשורות.
7. **Views עתידיות**: `v_customer_for_supplier`, `v_customer_public`, `v_customer_segment_dynamic`.
8. **Family-language**: `households.preferred_language` לתקשורת-משפחתית.
9. **retention-policy על activity_log**: אופטימיזציה אחרי 5+ שנים נתונים.
10. **(v3) Per-user display preferences** — היום הקונפיגורציה היא tenant-level. אם בעתיד נרצה שמשתמש-בודד יוכל להעדיף תצוגה אחרת מה-tenant.
11. **(v3) Customer-list saved views** — שמירת-פילטרים בשם ("הלקוחות שלי השבוע", "מועדון-Gold ב-3 חודשים האחרונים"). תוסף לחיפוש-המתקדם.
12. **(v3) Auto-message ביום-הולדת** — בלשונית-פרטים יש indicator לעתידי. נכנס למודול-אוטומציות-תקשורת (M12 הרחבה / M-future).

---

## 7. Entry Points ל-Module Strategist

כש-Module Strategist (סקיל `opticup-strategic`) פותח סשן על M5, הוא:

1. **קורא את הקובץ הזה.**
2. **קורא את ACCESS_AUDIT_REPORT.md** — לקבל את רשימת-השדות המלאה של `cust_list` ו-`crm_leads`.
3. **קורא Master Plan §4 (M5).**
4. **קורא את הסקיצות של מסך-הלקוחות (`M5_CUSTOMERS_LIST_MOCKUPS.html`) ושל כרטיס-הלקוח (`M5_CUSTOMER_CARD_MOCKUP.html`).**
5. **כותב `modules/Module 5 - Customers/MODULE_5_ROADMAP.md`** — מפצל ל-Phases (לפחות: Phase A — Schema + RLS + Views, Phase B — RPCs + dedup + Iron Rule 32, Phase C — Migration-from-OpticPlus, Phase D — UI customer card, Phase E — UI customer list + create-mode).
6. **כותב `modules/Module 5 - Customers/docs/MODULE_SPEC.md`** — תיאור עסקי + state-machine של customer.
7. **כותב SPEC נפרד למיגרציה** ב-`modules/Module 5 - Customers/docs/specs/M5_MIGRATION/`.

---

## 8. רשימת-החלטות-נסגרות (מתועד גם ב-DECISIONS_LOG.md של Main Strategic)

### החלטות מ-v1/v2:

1. ✅ Customer ו-loyalty_member הם שתי ישויות, יחס 1:1 אופציונלי. Loyalty ב-M13.
2. ✅ Households קיים כ-skeleton. 5 שדות עסקיים ב-day-1 (כולל created_at + status). שאר העסקיות — deferred.
3. ✅ Phone uniqueness `(phone, tenant_id)` תמיד. שיתוף-טלפון = UX exception, לא constraint.
4. ✅ Health funds = טבלה per-tenant (Iron Rule 19). Skeleton ב-day-1, agreements deferred.
5. ✅ Language ברמת customer (לא household). Family-language deferred.
6. ✅ ת"ז nullable על customer.
7. ✅ מין + יום-הולדת ב-M5 (דמוגרפיה תפעולית), לא ב-M6.
8. ✅ Dedup canonical algorithm דרך RPC `create_customer`.
9. ✅ Marketing consent = 4 flags עצמאיים (לא enum 3-ערכים — תוקן ב-v2).
10. ✅ Customer FK rules: soft-delete לא מסתיר FKs. merge הוא הדרך היחידה לאיחוד. error על delete-עם-FKs-פתוחים.
11. ✅ `tenant_languages` קונפיגורציה per-tenant. Pattern P19.
12. ✅ ישות-אדם אחת = customers. lifecycle_stage enum (prospect/active/dormant). crm_leads מבוטל. M4 מחזיק אינטראקציות, לא אנשים.
13. ✅ Consent = 4 flags עצמאיים. הגירה: customer_operational=opted_in ללקוחות-וותיקים, השאר opted_out. Re-subscription רק אקטיבי.

### החלטות חדשות ב-v3 (סשן 2026-05-07):

14. ✅ **Customer Card = 5 לשוניות**: פרטים · תפקודי ראייה · בדיקות ראייה · הזמנות · מסמכים. ראה סעיף 9.
15. ✅ **Edit-mode = כפתור-בכותרת**, לא לשונית. אוטו-שמירה ברירת-מחדל.
16. ✅ **Queue block בלשונית-1** = surface על M14, לא בעלות.
17. ✅ **Prescriptions = M6 נפרד מ-M5** (לא חלק ממנו). Multi-vertical scaling.
18. ✅ **Customer-list screen = Sketch 2 (Split Workspace)**: ניווט-צד 3 קבוצות + רשימה ראשית. ראה סעיף 10.
19. ✅ **Activity-first columns**: name = anchor יחיד. כל השאר — activity (status/order/task/debt). configurable per-tenant.
20. ✅ **Row click = new tab**. Customer card נפתח בטאב חדש לצד הרשימה.
21. ✅ **Row-end actions = 3 buttons configurable**. ברירת-מחדל: 💬 WhatsApp · 📅 Schedule · ➕ New order. Pool of 8.
22. ✅ **Phone button = popover (no auto-dial)**. אין טור-טלפון קבוע.
23. ✅ **Sort + view-range** במסך-הלקוחות. Search bypass-ים את ה-view. Auto-complete dropdown.
24. ✅ **Dual-mode search**: quick-search smart בראש המסך + advanced-panel נפתח.
25. ✅ **Density configurable per-tenant** (compact/expanded with sub-line).
26. ✅ **Customer creation = same screen as customer card** (create mode). ראה סעיף 11. אין מסך-יצירה נפרד.
27. ✅ **Composite Customer Number** = `[TENANT_CODE][BRANCH_CODE][CUSTOMER_NUMBER]`. מוצג בכל מקום. ראה סעיף 12.
28. ✅ **Iron Rule 32 (NEW)** — Sequential Number Cancellation. ראה סעיף 13.
29. ✅ **Customer-list display preferences** = tenant-level config (`tenant_settings`). ראה סעיף 14.
30. ✅ **Branch closure** — soft-delete with branch_code locked, OR hard-delete only if zero activity ever.

---

## 9. Customer Card — מסך כרטיס-הלקוח (v3)

**Mockup:** `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5_CUSTOMER_CARD_MOCKUP.html`

**מבנה — 5 לשוניות:**

### לשונית 1 — פרטים
- **בלוקים:** פרטי-לקוח (שם, ת.ז, טלפון, אימייל, כתובת, גיל, מקצוע, מין, שפה, קופ"ח), הערות-עסקיות, הערות-רפואיות (Medical Q. + Diagnostics ב-sub-tabs).
- **בלוק Queue (חשוף מ-M14):** "תור #2 · ממתין 12 דקות" + פעולות (קדם בתור / הסר מהתור). קורא `v_customer_queue_position`. פעולות דרך RPCs של M14.
- **Indicator עתידי:** "ביום-הולדת תישלח אוטומטית הודעת-WhatsApp + קופון 10% חד-פעמי. (עתיד — מודול-תקשורת/אוטומציות.)"

### לשונית 2 — תפקודי ראייה
- **בדיקה מורחבת של האופטומטריסט** (24 בדיקות: ortho/exo, AC/A, NRA, PRA, Bo/Bi, Push-Up, MEM, Stereopsis, ועוד).
- **בורר תאריכי-בדיקות היסטוריות** — לראות את הבדיקה של תאריך X.
- **כפתור "צור מרשם מתפקודי-ראייה"** — קורא RPC של M6 (`create_prescription_from_vision_function(customer_id, vision_function_id)`). Flow לא תוכנן עדיין, deferred ל-M6 SPEC.

### לשונית 3 — בדיקות ראייה (מרשמים)
- **תצוגת-תקציר על M6** — read-only summary של רשימת-המרשמים.
- **טורים:** תאריך · סוג · סטטוס · אופטומטריסט · R/L summary · תוקף · הערות · פעולות.
- **כפתור "פתח ב-M6"** על שורה — ניווט למסך-מרשם המלא של M6.
- **כפתור "+ מרשם חדש"** בכותרת — קורא `create_prescription_draft` של M6 → ניווט.
- **קורא:** `v_customer_prescriptions_summary`.

### לשונית 4 — הזמנות
- **באנר → פותח מסך-M7 המלא** + תקציר 3 הזמנות אחרונות (date · status · sum · items count).
- כפתור "פתח ב-M7" → ניווט.

### לשונית 5 — מסמכים
- מסמכים-רפואיים בקטגוריות: מרשם-רופא · בדיקה-חיצונית · קופ"ח · אחר.
- העלאה / סריקה / מחיקה.
- Storage: Bucket per-tenant, path `{tenant_id}/{customer_id}/{document_id}.{ext}`. ללא עברית.

**עקרונות-עיצוב-מסך:**
- **כותרת-עליונה אחידה בכל הלשוניות** — שם + גיל + טלפון + פעולות-מהירות (📞 / 💬 / ✏️ / WhatsApp).
- **כפתור "ערוך" בכותרת** — לא לשונית. במצב ערוך, השדות הופכים editable. במצב normal — read-only עם autosave-on-blur.
- **שמירה אוטומטית בכל המסך** — כמו M7. אין כפתור "שמור" (חוץ ממצב-יצירה — סעיף 11).

---

## 10. Customer-List Screen — מסך ניהול-לקוחות (v3)

**Mockup:** `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5_CUSTOMERS_LIST_MOCKUPS.html` (Sketch 2 — Split Workspace).

**מבנה כללי:**

### Left Sidebar — ניווט-צד קבוע

3 קבוצות:

**Group 1 — פעולות מהירות:**
- 📦 מסירת הזמנה — סורק ברקוד → פותח מסך-Order-Inspection של M7.
- 🛠️ תיקונים — דיאלוג "לקוח חדש או קיים?" → flow ל-M7 repair.
- 📋 משימה חדשה — Form: שם + טלפון + שפה + תיאור-משימה. יוצר/מצרף ללקוח, סטטוס "task" בכרטיס.
- 🛒 אביזרים · לקוח כללי — מכירה-מהירה ללקוח-אנונימי. קבלה על שם "לקוח כללי". לא יוצר רשומת-לקוח.

**Group 2 — לקוחות:**
- 👥 כל הלקוחות (default selected)
- ⭐ חברי מועדון
- 🆕 לקוחות חדשים (created last 30d)
- 📞 לידים פתוחים (`lifecycle_stage='prospect'`)
- 🎁 ימי-הולדת השבוע

**Group 3 — מודולים מקושרים:**
- 📅 ניהול תורים (M14)
- 🔬 מעבדה / KDS (M9)
- 📊 דוחות (M11)
- 🏪 ניהול מלאי (M1)
- 💬 תקשורת / WhatsApp (M12)

### Main Area — תוכן הרשימה

**Toolbar (top):**
- שדה חיפוש-מהיר (smart, single field) — אוטו-זיהוי שם / טלפון / ת.ז / מספר-הזמנה.
- 📷 סריקת ברקוד.
- ⚙️ חיפוש מתקדם (פותח פאנל-נפתח).
- + לקוח חדש (פותח כרטיס במצב-יצירה — סעיף 11).

**Auto-complete dropdown** — מהקלדת תו ראשון, נפתח dropdown עם הצעות-לקוחות. מתקצר עם כל אות נוספת. עובד גם למספרים. קליק → פותח כרטיס בטאב חדש.

**Filter pills** (מעל הטבלה) — היום · שבוע · חודש · הכל + פילטרים-נוספים-קצרים (במעבדה / מוכן לאיסוף / חוב פתוח / etc.).

**Sort + View-range selectors** בראש הטבלה:
- **Sort (4):** א-ב · פעילות-אחרונה (default) · בדיקות-אחרונות · הזמנות-אחרונות.
- **View-range (4):** היום · שבוע (default) · חודש · כולם.
- Search bypass-ים את ה-view (מחפש בכל הלקוחות תמיד).

**Customer rows:**
- **Anchor יחיד:** Customer Number (משולב — ראה סעיף 12) + שם.
- **טורי-תוכן configurable per-tenant** (default = activity-first): סטטוס פעיל · הזמנה פעילה · משימה/תיקון · יתרת חוב · חברי-מועדון.
- **Density configurable** (compact / expanded) + sub-line content configurable per column.
- **Row-end actions** (3 buttons configurable): default = 💬 WhatsApp · 📅 Schedule · ➕ New order.
- **Click row → opens customer card in NEW TAB** (לא החלפת-מסך, לא drawer).

### Advanced Search Panel

נפתח מהכפתור "⚙️ חיפוש מתקדם". פאנל-נפתח (drawer מימין) עם 14+ פרמטרים:
- שם-משפחה / שם-פרטי / קוד / ת.ז / טלפון / נייד / מייל
- תאריך-פתיחה (מ–עד) / תאריך-בדיקה (מ–עד)
- שם הבודק / כתובת / עיר
- סיווג / קופ"ח / סיבת-פנייה
- מספר-הזמנה
- Sph/Cyl/Axis (חיפוש לפי-מרשם — joined to M6)
- ☐ לקוחות לא-פעילים / ☐ לקוחות שלא-מוספו

תמיכה ב"שמור-חיפוש" — deferred (סעיף 6 #11).

---

## 11. Create Mode — מצב יצירה (v3)

**אין מסך-יצירה נפרד.** "+ לקוח חדש" → אותו כרטיס-לקוח (סעיף 9), במצב empty + edit.

**שדות-חובה למינימום-יצירה:**
- שם-פרטי
- שם-משפחה
- טלפון
- שפה

כל השאר אופציונלי. הגיון: לקוח מתקשר בבוקר ורוצה תור — לא רוצים לעצור אותו עד שמילאו ת.ז + כתובת + מקצוע.

**Visual cue:**
- Banner-עליון בולט בכותרת: **"לקוח חדש — לא נשמר עדיין"**.
- כפתור "Save" פעיל-במיוחד.
- ה-customer_number **לא** מוצג בכותרת כי עדיין לא הוקצה.

**Tabs 2-5 disabled** עד השמירה הראשונה. tooltip: "שמור את פרטי-הלקוח כדי לפתוח".

**אחרי השמירה הראשונה:**
- Banner נעלם.
- customer_number מופיע בכותרת.
- Tabs 2-5 הופכים פעילים.
- Autosave-on-blur נכנס לפעולה כרגיל.

**Customer number generated only on first save** — אטומי דרך RPC `create_customer`. ביטול במצב-טיוטה (לפני שמירה ראשונה) = אפס מספר נבזבז.

---

## 12. Composite Customer Number (v3)

### עקרון

**Customer Number מוצג בכל-מקום** הוא משולב מ-3 חלקים:

```
[TENANT_CODE][BRANCH_CODE][CUSTOMER_NUMBER]
```

לדוגמה: tenant=4, branch=3, customer=545 → **43545**.

זה **מספר-הלקוח האחד-והיחיד**. נוצר פעם, לא משתנה לעולם, מוצג על קבלות, הזמנות, מסמכים, דוחות, ובמסך-הלקוחות.

### Storage vs Display

- **DB:** `customer_number` integer NOT NULL (פר-tenant, נוצר אטומית) + `home_branch_id` FK.
- **Display:** הקוד מרכיב את המספר-המוצג מ-`tenant.code` + `branch.branch_code` + `customer_number`.
- **לא נשמר כעמודה נפרדת** — מורכב at query time או ב-View. הסיבה: אם branch_code אי-פעם משתנה (תיאורטית — לא צפוי כי תפוס-לתמיד), הצפייה תתעדכן אוטומטית.
- **PK ברמת DB:** עדיין `id` (uuid). `customer_number` הוא human-readable identifier.

### Fixed-width digits

Module Strategist יקבע אורך-קבוע פר-חלק:
- TENANT_CODE: ספרה 1 (אם פחות מ-10 tenants) או 2 (אם יותר).
- BRANCH_CODE: ספרה 1 (אם פחות מ-10 סניפים פר-tenant) או 2 (אם יותר).
- CUSTOMER_NUMBER: padded to 5 digits (e.g., 00545).

**הצעה ל-day-1:** TENANT=2 ספרות, BRANCH=2 ספרות, CUSTOMER=5 ספרות → 9 ספרות אחיד תמיד (e.g., `040300545`).
תצוגה עם מפרידים-עדינים (`04-03-00545`) במסכים פנימיים, ללא מפרידים בייצואים ובמסמכים.

### branch closure

- **branch_code לא משתחרר לעולם** אם הסניף הכיל לקוחות / הזמנות / פעילות. סניף סגור = `is_active=false`, branch_code שלו תפוס לנצח לטובת היסטוריה ודוחות.
- **branch ריק לחלוטין** (אפס FK בכל הטבלאות) → ניתן ל-hard-delete דרך RPC `delete_unused_branch`. branch_code משתחרר לשימוש-חוזר.

### Migration

- לקוחות-קיימים מ-OpticPlus יעברו עם ה-customer_number המקורי שלהם (1-5028 לפריזמה).
- `home_branch_id` של כולם = פריזמה-הרצליה (הסניף-היחיד-של-פריזמה).
- branch_code של פריזמה = `01` (ב-day-1 יש tenant אחד וסניף אחד; יש מקום להתרחבות).
- tenant_code של פריזמה = `01` (זה ה-tenant הראשון; tenant הבא יהיה `02`).
- הלקוח-החדש-הראשון אחרי המיגרציה יקבל customer_number=5029, ויוצג כ-`010105029`.

---

## 13. Iron Rule 32 (NEW) — Sequential Number Cancellation (v3)

> **Iron Rule 32:** מספר-עוקב (customer_number, order_number, receipt_number, return_box_number, וכל מספר-עוקב עתידי) משתחרר חזרה לרצף **אם ורק אם** מתקיימים שני התנאים:
>
> 1. הוא המספר-המקסימלי-הנוכחי במאגר (אין מספר-גבוה-יותר אחריו).
> 2. אין שום פעילות-קשורה לישות (אפס foreign-keys מצביעים אליה מכל טבלה).
>
> **ביצוע:** רק דרך RPC ייעודי (`delete_last_unused_<entity>`), אטומי, עם `FOR UPDATE` lock, שבודק את שני התנאים בתוך הטרנזקציה ומבטל את הפעולה אם אחד נופל.
>
> **מספרים שכבר נחתמו ברצף לא מתחזרים לעולם.** ביטול מאוחר → soft-delete + state=`cancelled`, אבל המספר נשאר ברצף.

### יישום ב-M5

- **`delete_last_unused_customer(customer_id) → boolean`** — RPC חדש.
- **תרחיש:** פקיד יוצר "ליסקר דניאל" #5029. מבין שזו טעות-הקלדה. לוחץ "מחק רשומה אחרונה". RPC בודק: customer #5029 הוא max? אין שום FK מצביעה עליו (אין הזמנות, בדיקות, משימות, הודעות)? אם כן → hard-delete + customer_number=5029 משתחרר. הלקוח-הבא יקבל #5029.
- **תרחיש שכשל:** customer #5029 הוקצה אבל כבר היה לו תור (queue_entry FK). RPC מחזיר false עם error: "ללקוח יש פעילות. השתמש ב-soft-delete".

### יישום ב-M7

- **`delete_last_unused_order(order_id) → boolean`** — מקביל.
- **State machine של order:** הזמנה ב-`draft` לא מקבלת מספר עדיין. הקצאה ב-`draft → active`. ביטול ב-`active` ללא פעילות = ניתן ל-hard-delete + שחרור מספר. ביטול אחרי תשלום-ראשון/הודעה-ראשונה/מעבדה = state=`cancelled`, מספר נשאר.

### יישום עתידי

- M8 (קבלות), M9 (return-boxes, repair-tickets), כל מודול עם sequential number — מיישמים את הכלל אוטומטית.

### יחס ל-Iron Rule 11

- Iron Rule 11 = **WRITE-side** (אטומיות בהקצאה).
- Iron Rule 32 = **CANCEL-side** (אטומיות בשחרור + תנאים).
- שניהם יחד = רצף נקי, מסודר, בלי-פערים.

---

## 14. Customer-List Display Preferences (v3) — Tenant-Level Config

**מיקום:** `tenant_settings` (טבלה קיימת או חדשה — Module Strategist יחליט). שדה `customer_list_preferences jsonb`.

**Schema:**
```jsonc
{
  "columns": [                                    // configurable per tenant
    {"key": "active_status", "show": true, "order": 1, "sub_line": null},
    {"key": "active_order", "show": true, "order": 2, "sub_line": "date_status"},
    {"key": "task_or_repair", "show": true, "order": 3, "sub_line": null},
    {"key": "debt_balance", "show": true, "order": 4, "sub_line": null},
    {"key": "club_membership", "show": true, "order": 5, "sub_line": null},
    {"key": "kupa", "show": false, "order": 6, "sub_line": null},
    {"key": "age", "show": false, "order": 7, "sub_line": null},
    {"key": "language", "show": false, "order": 8, "sub_line": null}
  ],
  "density": "compact",                           // "compact" | "expanded"
  "row_actions": [                                // 3-4 buttons configurable
    "whatsapp",
    "schedule_appointment",
    "new_order"
  ]
}
```

**רשימת טורי-תוכן זמינים (closed list):**
- `active_status` — סטטוס פעיל (פעיל / לקוח חדש / במעבדה / מוכן-לאיסוף / תיקון / משימה / dormant)
- `active_order` — הזמנה פעילה (#מספר + סטטוס)
- `task_or_repair` — משימה/תיקון פתוח
- `debt_balance` — יתרת חוב
- `club_membership` — חברות-מועדון + tier
- `kupa` — קופת-חולים (identity-style)
- `age` — גיל (identity-style)
- `language` — שפה (identity-style)
- `last_exam_date` — תאריך בדיקה אחרונה
- `last_order_date` — תאריך הזמנה אחרונה
- `home_branch` — סניף-בית (relevant for multi-branch tenants)

**רשימת row-actions זמינות (closed list):**
- `whatsapp` — פתח שיחת WhatsApp
- `sms` — שלח SMS-מהיר (template)
- `phone_show` — הצג מספר טלפון (popover)
- `schedule_appointment` — קבע תור (קפיצה ל-M14)
- `new_order` — הזמנה חדשה (קפיצה ל-M7)
- `task` — פתח משימה
- `repair` — פתח תיקון
- `note` — הוסף הערה

**Sub-line content** (כשdensity=expanded):
- `null` — אין sub-line
- `phone_language` — מתאים מתחת לשם
- `date_optometrist` — מתאים מתחת ל-last_exam_date
- `date_status` — מתאים מתחת ל-last_order_date / active_order
- (Module Strategist יוסיף אופציות נוספות לפי הצורך)

**עדכון:** רק tenant admin (`role='admin'`) יכול לשנות. UI: settings → "תצוגת רשימת-לקוחות". RPC: `update_customer_display_preferences(prefs jsonb)`.

**ברירת-מחדל ל-tenant חדש:** הקונפיגורציה ב-JSON לעיל (activity-first עם 5 טורים).

---

*סוף M5 Architecture Brief v3. עודכן 2026-05-07 (תוספות UX/screens + Customer Number + Iron Rule 32).*
*הצעד הבא: M6 — Prescriptions / Eye Exams (עדכון Brief ל-v2 עם החוזים מול M5 + מסך-מרשם המלא).*
