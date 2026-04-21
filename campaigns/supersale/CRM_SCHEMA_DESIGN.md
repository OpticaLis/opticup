# SuperSale CRM — Supabase Schema Design v3 (Final)

> **סטטוס:** גרסה סופית לאישור — כל ההחלטות סוכמו
> **תאריך:** 2026-04-20
> **מטרה:** סכמת DB שמחליפה את Monday.com לחלוטין — לידים, אירועים, נוכחות, הודעות, CX, ביצועי קמפיינים
> **מקורות:** FLOW.md + כל 20 הסנריואים המתועדים + 8 בורדי Monday + 3 בורדי Affiliates + חוקים עסקיים
> **v3 שינויים:** counters → Views, crm_ad_spend + crm_unit_economics, campaigner public page, eye_exam → attendees, סגירת כל ההחלטות הפתוחות

---

## 0. החלטות שסוכמו (Q&A Session)

| # | שאלה | החלטה |
|---|-------|-------|
| 1 | prefix `crm_` | ✅ מאושר |
| 2 | התנגשות עם Module 4 CRM | ✅ לא מתנגש — `crm_leads` = גנרי, event-specific fields ב-attendees |
| 3 | "הגיע ולא קנה" כסטטוס | ❌ לא סטטוס — View עם היסטוריית רכישות per event |
| 4 | Optic Summary field | ❌ לא רלוונטי (MultiSale only) |
| 5 | שדות Tier 1 (Instagram, WhatsApp Name, etc.) | ❌ לא רלוונטי |
| 6 | Affiliates board (853 leads) | כפילויות — View + עמוד ציבורי לקמפיינר |
| 7 | terms_approved | פר-ליד (פעם אחת), לא פר-אירוע |
| 8 | Counters | Views מחושבים (לא denormalized) — נפחים קטנים |
| 9 | ייבוא מ-Tier 1 vs Tier 2 | Tier 1 → Tier 2 לפני ייבוא, מקור יחיד |
| 10 | Notes migration | הערה אחת "היסטוריה ממאנדיי" per lead |
| 11 | Campaigner access | עמוד ציבורי עם סיסמה (לא משתמש מערכת) |
| 12 | נתוני הוצאות פרסום | crm_ad_spend (ידני/Make sync) + View מחושב |

---

## 1. עקרונות עיצוב

### עקרונות ליבה (ללא שינוי)
1. **SaaS-first** — כל טבלה עם `tenant_id`, RLS על כולן (Iron Rules 14–15)
2. **מספרים סדרתיים = RPC אטומי** (Iron Rule 11) — event_number, coupon codes
3. **ליד לעולם לא נמחק** — soft delete בלבד (Iron Rule 3), גם "הסר" = סטטוס
4. **Notes = טבלת לוג נפרדת** — לא עמודת טקסט כמו ב-Monday
5. **הודעות = Messaging Hub** — טבלת templates + טבלת log, לא הודעות מוטמעות בקוד
6. **אין ערכים hardcoded** (Iron Rule 9) — סטטוסים, ערוצים, שפות = configurable
7. **קיום מקביל** — הסכמה לא תתנגש עם `storefront_leads` / `cms_leads` הקיימות
8. **Config over code** — שינוי פלואו = שינוי שורות ב-DB, לא שינוי קוד
9. **Monday sync** — כל ליד שומר `monday_item_id`. מיפוי עמודות. ייצוא חזרה בכל רגע
10. **Field-level visibility** — שדה מוגבל לפי role (מתחבר למודול הרשאות הקיים)
11. **Full audit trail** — כל פעולה עם `employee_id` FK
12. **Custom fields** — הוספת שדות מ-UI בלי migration
13. **Tags over arrays** — מערכת תגים גמישה במקום `interests text[]`

### עקרון חדש ב-v3
14. **Views over counters** — counters מחושבים live מ-Views, לא denormalized בטבלאות. נפח הנתונים קטן מספיק (~50 attendees per event) ו-Views מבטלים drift.

---

## 2. ER Diagram

```
                    ┌──────────────────┐
                    │  crm_campaigns   │
                    └────────┬─────────┘
                             │ campaign_id
                    ┌────────▼─────────┐
                    │   crm_events     │◄─── crm_event_status_history
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼─────────┐  ┌─────▼──────────┐  ┌─────▼──────────────┐
│   crm_leads      │  │ crm_event_     │  │ crm_ad_spend       │
│   (Master CRM)   │  │ attendees      │  │ (Facebook data)    │
└────────┬─────────┘  └─────┬──────────┘  └────────────────────┘
         │                  │
    ┌────┼────┬────┐   ┌────▼────┐
    │    │    │    │   │crm_cx_  │
    │    │    │    │   │surveys  │
    │    │    │    │   └─────────┘
    │    │    │    │
    ▼    ▼    ▼    ▼
  notes msgs unsub tags

── Config / Meta ──────────────────────────────
crm_statuses          — configurable statuses per entity
crm_tags              — flexible tagging system
crm_lead_tags         — M:N join
crm_custom_field_defs — field definitions (like Monday columns)
crm_custom_field_vals — field values per entity
crm_field_visibility  — which role sees which field
crm_monday_column_map — Monday ↔ CRM field mapping
crm_message_templates — message templates
crm_automation_rules  — automation triggers
crm_message_log       — sent messages log
crm_broadcasts        — manual mass sends
crm_audit_log         — full audit trail
crm_unit_economics    — campaign type KPI thresholds
crm_campaign_pages    — public page access for campaigner

── Views (computed, not stored) ───────────────
v_crm_event_stats         — replaces denormalized counters
v_crm_lead_event_history  — per-lead event + purchase history
v_crm_campaign_performance — replaces Affiliates board
v_crm_event_dashboard     — event management screen
v_crm_event_attendees_full — attendee list with lead data
v_crm_lead_timeline       — unified timeline (notes + audit + messages)
v_crm_leads_with_tags     — leads with tag arrays
```

---

## 3. שכבת Config — "הלב" של הגמישות

### 3.1 `crm_statuses` — מנוע סטטוסים configurable

**מחליף:** סטטוסים hardcoded בקוד / ב-FLOW.md
**למה:** מחר אם דניאל רוצה להוסיף סטטוס "VIP" — זו שורה חדשה, לא deploy.

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `entity_type` | text | NOT NULL | — | 'lead' / 'attendee' / 'event' |
| `slug` | text | NOT NULL | — | 'new', 'waiting', 'confirmed', etc. |
| `name_he` | text | NOT NULL | — | 'חדש', 'ממתין לאירוע', 'אישר הגעה' |
| `name_en` | text | NULL | — | 'New', 'Waiting', 'Confirmed' |
| `color` | text | NULL | '#22c55e' | צבע להצגה ב-UI (hex) |
| `icon` | text | NULL | — | emoji או icon name |
| `sort_order` | int | NOT NULL | 0 | סדר הצגה ב-dropdown |
| `is_default` | boolean | NOT NULL | false | סטטוס ברירת מחדל ליצירה חדשה |
| `is_terminal` | boolean | NOT NULL | false | סטטוס סופי (completed, cancelled) |
| `triggers_messages` | boolean | NOT NULL | false | האם שינוי לסטטוס הזה מפעיל הודעות |
| `is_active` | boolean | NOT NULL | true | אפשר "לכבות" סטטוס בלי למחוק |
| `created_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(tenant_id, entity_type, slug)` — Iron Rule 18

**נתוני seed — סטטוסי ליד:**

| slug | name_he | color | is_default | triggers_messages |
|------|---------|-------|------------|-------------------|
| `new` | חדש | #22c55e (ירוק) | ✅ | ❌ |
| `invalid_phone` | מספר לא תקין | #9ca3af (אפור) | ❌ | ❌ |
| `too_far` | רחוק מדי | #9ca3af | ❌ | ❌ |
| `no_answer` | לא עונה | #f59e0b (כתום) | ❌ | ❌ |
| `callback` | להתקשר בחזרה | #f59e0b | ❌ | ❌ |
| `waiting` | ממתין לאירוע | #3b82f6 (כחול) | ❌ | ❌ |
| `invited` | הוזמן לאירוע | #8b5cf6 (סגול) | ❌ | ✅ |
| `confirmed` | אישר הגעה | #22c55e | ❌ | ✅ |
| `confirmed_verified` | אישר ווידוא | #16a34a | ❌ | ❌ |
| `not_interested` | לא מעוניין | #ef4444 (אדום) | ❌ | ❌ |
| `unsubscribed` | הסיר מרשימה | #6b7280 | ❌ | ✅ |

**נתוני seed — סטטוסי attendee (10, ממפים 1:1 את Tier 3):**

| slug | name_he | color |
|------|---------|-------|
| `registered` | חדש | #22c55e |
| `waiting_list` | רשימת המתנה | #92400e |
| `duplicate` | כבר נרשם | #9ca3af |
| `quick_registration` | רישום מהיר | #78350f |
| `event_closed` | אירוע נסגר | #166534 |
| `manual_registration` | נרשם ידנית | #78350f |
| `cancelled` | ביטל | #ef4444 |
| `confirmed` | אישר (שילם) | #22c55e |
| `attended` | הגיע | #ec4899 |
| `no_show` | לא הגיע | #831843 |

**נתוני seed — סטטוסי אירוע (10 פעילים):**

| slug | name_he | triggers_messages | is_terminal |
|------|---------|-------------------|-------------|
| `planning` | תכנון | ❌ | ❌ |
| `will_open_tomorrow` | נפתח מחר | ✅ | ❌ |
| `registration_open` | הרשמה פתוחה | ✅ | ❌ |
| `invite_new` | הזמנת חדשים | ✅ | ❌ |
| `closed` | נסגר | ✅ | ❌ |
| `waiting_list` | רשימת המתנה | ✅ | ❌ |
| `2_3d_before` | 2-3 ימים לפני | ✅ | ❌ |
| `event_day` | יום האירוע | ✅ | ❌ |
| `invite_waiting_list` | הזמנת ממתינים | ✅ | ❌ |
| `completed` | הושלם | ❌ | ✅ |

---

### 3.2 `crm_tags` — מערכת תגים גמישה

**מחליף:** `interests text[]` ב-crm_leads

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `name` | text | NOT NULL | — | 'SuperSale', 'VIP', 'לקוח חוזר' |
| `color` | text | NULL | '#3b82f6' | צבע ב-UI |
| `category` | text | NULL | — | 'campaign' / 'segment' / 'manual' |
| `is_auto` | boolean | NOT NULL | false | true = מתויג אוטומטית |
| `auto_condition` | jsonb | NULL | — | תנאי תיוג אוטומטי |
| `sort_order` | int | NOT NULL | 0 | |
| `created_at` | timestamptz | NOT NULL | now() | |
| `is_deleted` | boolean | NOT NULL | false | |

**UNIQUE:** `(tenant_id, name)` — Iron Rule 18

### `crm_lead_tags` — M:N join

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `lead_id` | uuid | NOT NULL | FK → crm_leads(id) |
| `tag_id` | uuid | NOT NULL | FK → crm_tags(id) |
| `tagged_by` | uuid | NULL | FK → employees(id) — NULL for auto |
| `created_at` | timestamptz | NOT NULL | now() |

**PK:** `(tenant_id, lead_id, tag_id)`

---

### 3.3 `crm_custom_field_defs` — הגדרות שדות מותאמים

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `entity_type` | text | NOT NULL | — | 'lead' / 'attendee' / 'event' |
| `field_key` | text | NOT NULL | — | 'insurance_company', etc. |
| `field_name_he` | text | NOT NULL | — | |
| `field_name_en` | text | NULL | — | |
| `field_type` | text | NOT NULL | 'text' | 'text' / 'number' / 'date' / 'boolean' / 'select' / 'multi_select' / 'url' / 'email' / 'phone' |
| `select_options` | jsonb | NULL | — | for select/multi_select |
| `is_required` | boolean | NOT NULL | false | |
| `default_value` | text | NULL | — | |
| `sort_order` | int | NOT NULL | 0 | |
| `is_visible_in_table` | boolean | NOT NULL | true | |
| `is_visible_in_form` | boolean | NOT NULL | false | |
| `is_active` | boolean | NOT NULL | true | |
| `created_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(tenant_id, entity_type, field_key)` — Iron Rule 18

### `crm_custom_field_vals` — ערכי שדות מותאמים

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `field_def_id` | uuid | NOT NULL | FK → crm_custom_field_defs(id) |
| `entity_type` | text | NOT NULL | 'lead' / 'attendee' / 'event' |
| `entity_id` | uuid | NOT NULL | ID של הישות |
| `value_text` | text | NULL | |
| `value_number` | numeric | NULL | |
| `value_date` | timestamptz | NULL | |
| `value_boolean` | boolean | NULL | |
| `value_json` | jsonb | NULL | |
| `updated_at` | timestamptz | NOT NULL | now() |

**UNIQUE:** `(tenant_id, field_def_id, entity_id)` — Iron Rule 18

---

### 3.4 `crm_field_visibility` — הרשאות ברמת שדה

**מתחבר ל:** מודול הרשאות קיים (`roles`, `permissions`, `role_permissions`, `employee_roles`)

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `role_id` | text | NOT NULL | — | FK → roles(id) |
| `entity_type` | text | NOT NULL | — | 'lead' / 'attendee' / 'event' |
| `field_key` | text | NOT NULL | — | 'utm_source', 'total_revenue', etc. |
| `visible` | boolean | NOT NULL | true | |
| `created_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(tenant_id, role_id, entity_type, field_key)` — Iron Rule 18

**ברירות מחדל (seed) — מה מוסתר מעובדים רגילים:**

| entity_type | field_key | visible for `ceo` | visible for `employee` |
|-------------|-----------|--------------------|-----------------------|
| lead | utm_source | ✅ | ❌ |
| lead | utm_medium | ✅ | ❌ |
| lead | utm_campaign | ✅ | ❌ |
| lead | utm_content | ✅ | ❌ |
| lead | utm_term | ✅ | ❌ |
| lead | utm_campaign_id | ✅ | ❌ |
| lead | total_purchases | ✅ | ❌ |
| lead | is_returning_customer | ✅ | ❌ |

---

### 3.5 `crm_audit_log` — Audit Trail מלא

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `employee_id` | uuid | NULL | — | FK → employees(id) — NULL for system |
| `entity_type` | text | NOT NULL | — | 'lead' / 'attendee' / 'event' / 'broadcast' / etc. |
| `entity_id` | uuid | NOT NULL | — | |
| `action` | text | NOT NULL | — | 'create' / 'update' / 'status_change' / 'delete' / 'message_sent' / 'import' / 'export' |
| `field_changed` | text | NULL | — | NULL for create/delete |
| `old_value` | text | NULL | — | |
| `new_value` | text | NULL | — | |
| `metadata` | jsonb | NULL | — | {"source": "make_webhook", "scenario_id": "8247377"} |
| `ip_address` | text | NULL | — | |
| `created_at` | timestamptz | NOT NULL | now() | |

**אין UNIQUE** — append-only log.

---

## 4. Monday.com Sync Layer

### 4.1 `crm_monday_column_map` — מיפוי עמודות Monday ↔ CRM

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `monday_board_id` | text | NOT NULL | '5088674569' |
| `monday_board_name` | text | NOT NULL | 'Tier 2: Master Board' |
| `monday_column_id` | text | NOT NULL | 'phone_mky4a5fq', etc. |
| `monday_column_title` | text | NOT NULL | 'Phone Number', etc. |
| `crm_entity_type` | text | NOT NULL | 'lead' / 'attendee' / 'event' |
| `crm_field_key` | text | NOT NULL | 'phone', 'status', etc. |
| `is_core_field` | boolean | NOT NULL | true | true = field in table, false = custom field |
| `transform_rule` | jsonb | NULL | — | {"monday_value": "ממתין לאירוע", "crm_value": "waiting"} |
| `sync_direction` | text | NOT NULL | 'both' | 'import_only' / 'export_only' / 'both' |
| `is_active` | boolean | NOT NULL | true | |

**UNIQUE:** `(tenant_id, monday_board_id, monday_column_id)` — Iron Rule 18

**`monday_item_id` fields across tables:**
- `crm_leads.monday_item_id` — Tier 2 item ID
- `crm_event_attendees.monday_item_id` — Tier 3 item ID
- `crm_events.monday_item_id` — Events Management item ID

---

## 5. טבלאות Core — פירוט מלא

### 5.1 `crm_campaigns` — סוגי קמפיינים

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `slug` | text | NOT NULL | — | 'supersale', 'multisale' |
| `name` | text | NOT NULL | — | 'אירוע המותגים' |
| `description` | text | NULL | — | |
| `is_active` | boolean | NOT NULL | true | |
| `default_location` | text | NULL | — | 'הרצל 32, אשקלון' |
| `default_hours` | text | NULL | — | '09:00 - 14:00' |
| `default_max_capacity` | int | NULL | 50 | |
| `default_booking_fee` | numeric(10,2) | NULL | 50.00 | |
| `cancellation_hours` | int | NULL | 48 | |
| `created_at` | timestamptz | NOT NULL | now() | |
| `is_deleted` | boolean | NOT NULL | false | |

**UNIQUE:** `(tenant_id, slug)`

---

### 5.2 `crm_events` — אירועים

**v3 שינוי:** הוסרו counters denormalized — מוחלפים ב-`v_crm_event_stats` (§8.1)

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `campaign_id` | uuid | NOT NULL | — | FK → crm_campaigns(id) |
| `event_number` | int | NOT NULL | — | **Atomic RPC** — `next_crm_event_number()` |
| `name` | text | NOT NULL | — | |
| `event_date` | date | NOT NULL | — | |
| `start_time` | time | NOT NULL | '09:00' | |
| `end_time` | time | NOT NULL | '14:00' | |
| `location_address` | text | NOT NULL | — | |
| `location_waze_url` | text | NULL | — | |
| `status` | text | NOT NULL | 'planning' | FK-like → crm_statuses.slug WHERE entity_type='event' |
| `max_capacity` | int | NOT NULL | 50 | |
| `booking_fee` | numeric(10,2) | NOT NULL | 50.00 | |
| `coupon_code` | text | NOT NULL | — | |
| `registration_form_url` | text | NULL | — | |
| `notes` | text | NULL | — | |
| `monday_item_id` | text | NULL | — | Monday Events Management board item ID |
| `created_at` | timestamptz | NOT NULL | now() | |
| `is_deleted` | boolean | NOT NULL | false | |

**UNIQUE:** `(tenant_id, event_number)`

> **למה הוסרו counters:** ב-v2 היו `total_registered`, `total_confirmed`, `total_attended`, `total_purchased`, `total_revenue`, `attempts_after_close` כעמודות denormalized. הבעיה: drift — אם counter לא מסתנכרן עם הנתונים האמיתיים, הסטטיסטיקות שגויות. מכיוון ש-~50 attendees per event, View מחושב הוא מהיר מספיק ותמיד מדויק. ראה `v_crm_event_stats` (§8.1).

---

### 5.3 `crm_event_status_history` — לוג שינויי סטטוס אירוע

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `event_id` | uuid | NOT NULL | FK → crm_events(id) |
| `status` | text | NOT NULL | FK-like → crm_statuses.slug |
| `employee_id` | uuid | NULL | FK → employees(id) — NULL for system |
| `messages_sent` | int | NULL | |
| `created_at` | timestamptz | NOT NULL | now() |

---

### 5.4 `crm_leads` — לידים (ה-CRM המרכזי)

**v3 שינויים:**
- `eye_exam_needed` הועבר ל-`crm_event_attendees` (per-event, לא per-lead)
- הוסרו `total_events_attended`, `total_purchases`, `last_event_id`, `is_returning_customer` — מוחלפים ב-`v_crm_lead_event_history` (§8.2)

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK — זה גם ה"קופון" (Lead ID = QR) |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `full_name` | text | NOT NULL | — | |
| `phone` | text | NOT NULL | — | כולל קידומת בינלאומית |
| `email` | text | NULL | — | |
| `city` | text | NULL | — | |
| `language` | text | NOT NULL | 'he' | 'he' / 'ru' / 'en' |
| `status` | text | NOT NULL | 'new' | FK-like → crm_statuses.slug WHERE entity_type='lead' |
| `source` | text | NULL | — | 'facebook', 'walk_in', 'referral', 'website' |
| `utm_source` | text | NULL | — | **field_visibility: owner only** |
| `utm_medium` | text | NULL | — | **field_visibility: owner only** |
| `utm_campaign` | text | NULL | — | **field_visibility: owner only** |
| `utm_content` | text | NULL | — | **field_visibility: owner only** |
| `utm_term` | text | NULL | — | **field_visibility: owner only** |
| `utm_campaign_id` | text | NULL | — | **field_visibility: owner only** |
| `client_notes` | text | NULL | — | |
| `terms_approved` | boolean | NOT NULL | false | פעם אחת, per-lead |
| `terms_approved_at` | timestamptz | NULL | — | |
| `marketing_consent` | boolean | NOT NULL | false | |
| `unsubscribed_at` | timestamptz | NULL | — | |
| `verified_phone` | boolean | NOT NULL | false | |
| `monday_item_id` | text | NULL | — | Tier 2 item ID |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |
| `is_deleted` | boolean | NOT NULL | false | |

**UNIQUE:** `(tenant_id, phone)`

> **למה הוסרו counters מ-leads:** `total_events_attended`, `total_purchases`, `last_event_id`, `is_returning_customer` — כולם ניתנים לחישוב live מ-`crm_event_attendees`. ה-View `v_crm_lead_event_history` (§8.2) מחזיר כל ליד + היסטוריית אירועים + סכום רכישות. אותה סיבה כמו event counters — Views מדויקים יותר מ-counters.

---

### 5.5 `crm_event_attendees` — נוכחות באירוע

**v3 שינוי:** `eye_exam_needed` הועבר לכאן (per-event, לא per-lead)

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `lead_id` | uuid | NOT NULL | — | FK → crm_leads(id) |
| `event_id` | uuid | NOT NULL | — | FK → crm_events(id) |
| `status` | text | NOT NULL | 'registered' | FK-like → crm_statuses.slug WHERE entity_type='attendee' |
| `registration_method` | text | NOT NULL | 'form' | 'form' / 'manual' / 'qr_quick' |
| `registered_at` | timestamptz | NOT NULL | now() | |
| `confirmed_at` | timestamptz | NULL | — | |
| `checked_in_at` | timestamptz | NULL | — | |
| `purchased_at` | timestamptz | NULL | — | |
| `cancelled_at` | timestamptz | NULL | — | |
| `purchase_amount` | numeric(10,2) | NULL | — | **field_visibility: owner only** |
| `booking_fee_paid` | boolean | NOT NULL | false | |
| `booking_fee_refunded` | boolean | NOT NULL | false | |
| `coupon_sent` | boolean | NOT NULL | false | |
| `coupon_sent_at` | timestamptz | NULL | — | |
| `scheduled_time` | text | NULL | — | |
| `eye_exam_needed` | text | NULL | — | per-event (moved from leads in v3) |
| `client_notes` | text | NULL | — | |
| `waiting_list_position` | int | NULL | — | |
| `monday_item_id` | text | NULL | — | Tier 3 item ID |
| `created_at` | timestamptz | NOT NULL | now() | |
| `is_deleted` | boolean | NOT NULL | false | |

**UNIQUE:** `(tenant_id, lead_id, event_id)`

---

### 5.6 `crm_lead_notes` — הערות ידניות

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `lead_id` | uuid | NOT NULL | FK → crm_leads(id) |
| `event_id` | uuid | NULL | FK → crm_events(id) |
| `content` | text | NOT NULL | |
| `employee_id` | uuid | NULL | FK → employees(id) — NULL for system/import |
| `created_at` | timestamptz | NOT NULL | now() |

> **Monday import:** כל Notes ממאנדיי נכנסות כהערה אחת: "--- היסטוריה ממאנדיי (ייבוא {date}) ---\n{original content}". לא מפרסרים — מייבאים כ-text כמו שזה.

---

### 5.7–5.12 טבלאות Messaging (ללא שינוי מ-v2)

**`crm_message_templates`** — templates per channel/language/trigger

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `slug` | text | NOT NULL | 'registration_confirmation', etc. |
| `name` | text | NOT NULL | |
| `channel` | text | NOT NULL | 'whatsapp' / 'sms' / 'email' |
| `language` | text | NOT NULL | 'he' |
| `subject` | text | NULL | for email |
| `body` | text | NOT NULL | template with {{placeholders}} |
| `is_active` | boolean | NOT NULL | true |
| `created_at` | timestamptz | NOT NULL | now() |

**UNIQUE:** `(tenant_id, slug, channel, language)`

**`crm_automation_rules`** — trigger → action definitions

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `name` | text | NOT NULL | |
| `trigger_entity` | text | NOT NULL | 'attendee' / 'lead' / 'event' |
| `trigger_event` | text | NOT NULL | 'status_change' / 'created' / 'updated' |
| `trigger_condition` | jsonb | NOT NULL | {"new_status": "confirmed"} |
| `action_type` | text | NOT NULL | 'send_message' / 'update_status' / 'create_note' |
| `action_config` | jsonb | NOT NULL | {"template_slug": "confirmation_msg", "delay_minutes": 0} |
| `sort_order` | int | NOT NULL | 0 |
| `is_active` | boolean | NOT NULL | true |
| `created_at` | timestamptz | NOT NULL | now() |

**UNIQUE:** `(tenant_id, name)`

**`crm_message_log`** — every message sent

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `lead_id` | uuid | NOT NULL | FK → crm_leads(id) |
| `event_id` | uuid | NULL | FK → crm_events(id) |
| `template_id` | uuid | NULL | FK → crm_message_templates(id) |
| `broadcast_id` | uuid | NULL | FK → crm_broadcasts(id) |
| `channel` | text | NOT NULL | 'whatsapp' / 'sms' / 'email' |
| `content` | text | NOT NULL | actual sent content |
| `status` | text | NOT NULL | 'sent' / 'delivered' / 'read' / 'failed' |
| `external_id` | text | NULL | provider message ID |
| `error_message` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | now() |

**`crm_broadcasts`** — manual mass sends

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `employee_id` | uuid | NOT NULL | FK → employees(id) |
| `name` | text | NOT NULL | |
| `channel` | text | NOT NULL | |
| `template_id` | uuid | NULL | FK → crm_message_templates(id) |
| `filter_criteria` | jsonb | NOT NULL | {"tags": ["SuperSale"], "status": ["waiting"]} |
| `total_recipients` | int | NOT NULL | 0 |
| `total_sent` | int | NOT NULL | 0 |
| `total_failed` | int | NOT NULL | 0 |
| `status` | text | NOT NULL | 'draft' / 'sending' / 'completed' / 'failed' |
| `created_at` | timestamptz | NOT NULL | now() |

---

### 5.13 `crm_cx_surveys` — סקרי שביעות רצון

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `attendee_id` | uuid | NOT NULL | FK → crm_event_attendees(id) |
| `rating` | int | NULL | 1–5 |
| `comment` | text | NULL | |
| `google_review_sent` | boolean | NOT NULL | false |
| `callback_requested` | boolean | NOT NULL | false |
| `callback_done` | boolean | NOT NULL | false |
| `created_at` | timestamptz | NOT NULL | now() |

---

### 5.14 `crm_unsubscribes` — Compliance log

| עמודה | סוג | NULL? | הערות |
|-------|------|-------|-------|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | FK → tenants(id) |
| `lead_id` | uuid | NOT NULL | FK → crm_leads(id) |
| `channel` | text | NOT NULL | 'all' / 'whatsapp' / 'sms' / 'email' |
| `reason` | text | NULL | |
| `method` | text | NOT NULL | 'link' / 'reply' / 'manual' |
| `created_at` | timestamptz | NOT NULL | now() |

---

## 6. טבלאות Campaign Performance — **חדש ב-v3**

### 6.1 `crm_ad_spend` — נתוני הוצאות פרסום

**מחליף:** בורד Facebook ADS ב-Monday (עמודות Total Spend, Daily Budget)
**מקור נתונים:** עדכון ידני או Make sync מ-Facebook API
**למה טבלה נפרדת:** נתוני הוצאות מגיעים מ-Facebook (לא מה-CRM). הנתונים שהCRM תורם (לידים, קונים, הכנסה) מגיעים מ-Views. השילוב ב-`v_crm_campaign_performance` (§8.3) נותן תמונה מלאה.

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `campaign_id` | uuid | NOT NULL | — | FK → crm_campaigns(id) |
| `ad_campaign_name` | text | NOT NULL | — | שם הקמפיין בפייסבוק |
| `ad_campaign_id` | text | NULL | — | Facebook Campaign ID (120241393285210789) |
| `status` | text | NOT NULL | 'active' | 'active' / 'paused' / 'stopped' |
| `event_type` | text | NULL | — | 'SuperSale' / 'MultiSale' |
| `total_spend` | numeric(10,2) | NOT NULL | 0 | סה"כ הוצאה |
| `daily_budget` | numeric(10,2) | NULL | — | תקציב יומי |
| `utm_campaign` | text | NULL | — | UTM campaign value — link to leads |
| `utm_content` | text | NULL | — | UTM content value — link to leads |
| `utm_term` | text | NULL | — | UTM term value (city) |
| `last_synced_at` | timestamptz | NULL | — | מתי עודכן לאחרונה |
| `created_at` | timestamptz | NOT NULL | now() | |
| `is_deleted` | boolean | NOT NULL | false | |

**UNIQUE:** `(tenant_id, ad_campaign_id)` — Iron Rule 18

> **איך מתחבר לCRM:** השדות `utm_campaign`, `utm_content`, `utm_term` מקשרים לשדות UTM ב-`crm_leads`. ה-View `v_crm_campaign_performance` (§8.3) סופר כמה לידים עם אותו UTM, כמה קנו, וכמה הכניסו — ומחלק ב-total_spend כדי לחשב CAC/CPL.

---

### 6.2 `crm_unit_economics` — ספי KPI per event type

**מחליף:** בורד Unit Economics ב-Monday
**למה:** הקמפיינר צריך לדעת מתי לעצור (Kill) או להגביר (Scale) קמפיין. הערכים האלה שונים per event type.

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `campaign_id` | uuid | NOT NULL | — | FK → crm_campaigns(id) |
| `gross_margin_pct` | numeric(5,2) | NOT NULL | — | 0.20 for SuperSale, 0.50 for MultiSale |
| `kill_multiplier` | numeric(5,2) | NOT NULL | — | 4 for SuperSale |
| `scaling_multiplier` | numeric(5,2) | NOT NULL | — | 6 for SuperSale |
| `updated_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(tenant_id, campaign_id)` — Iron Rule 18

> **איך הView משתמש בזה:**
> - `Kill CAC = (avg purchase amount × gross_margin_pct) / kill_multiplier`
> - `Scaling CAC = (avg purchase amount × gross_margin_pct) / scaling_multiplier`
> - `Decision = CASE WHEN actual_CAC > kill_CAC THEN 'STOP' WHEN actual_CAC < scaling_CAC THEN 'SCALE' ELSE 'TEST' END`

---

### 6.3 `crm_campaign_pages` — עמודים ציבוריים לקמפיינר

**מטרה:** הקמפיינר (חיצוני, לא user במערכת) צריך לראות ביצועי קמפיינים. במקום ליצור לו user ו-role — עמוד ציבורי עם סיסמה.

| עמודה | סוג | NULL? | ברירת מחדל | הערות |
|-------|------|-------|------------|-------|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `tenant_id` | uuid | NOT NULL | — | FK → tenants(id) |
| `slug` | text | NOT NULL | — | URL slug: 'campaign-performance' |
| `name` | text | NOT NULL | — | 'ביצועי קמפיינים' |
| `password_hash` | text | NOT NULL | — | hashed password for access |
| `view_name` | text | NOT NULL | — | 'v_crm_campaign_performance' — which View to expose |
| `visible_columns` | jsonb | NOT NULL | '[]' | which columns the campaigner can see |
| `is_active` | boolean | NOT NULL | true | |
| `last_accessed_at` | timestamptz | NULL | — | |
| `created_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(tenant_id, slug)` — Iron Rule 18

> **איך זה עובד:**
> 1. דניאל מגדיר עמוד ציבורי עם סיסמה ורשימת עמודות גלויות
> 2. הקמפיינר ניגש ל-URL (למשל `app.opticalis.co.il/p/campaign-performance`)
> 3. מזין סיסמה → רואה View מסונן לפי `visible_columns`
> 4. אין צורך ב-user account, אין role, אין JWT — רק password-protected public page
> 5. דניאל שולט מה הקמפיינר רואה (Revenue? UTMs? Lead names?)

---

## 7. RPCs אטומיים (Iron Rule 11)

### RPCs מ-v1/v2 (עודכנו):

1. **`next_crm_event_number(p_tenant_id, p_campaign_id)`** — מספור אירוע אטומי
2. **`register_lead_to_event(p_tenant_id, p_lead_id, p_event_id, p_method)`** — רישום + בדיקת קיבולת (count from attendees, not counter) + בדיקת כפילויות
3. **`check_in_attendee(p_tenant_id, p_attendee_id)`** — סריקת QR + עדכון סטטוס
4. **`record_purchase(p_tenant_id, p_attendee_id, p_amount)`** — רישום רכישה

> **שינוי ב-v3:** RPCs 2–4 כבר לא מעדכנים counters (כי הם הוסרו מ-`crm_events`). RPC 2 בודק capacity ב-`SELECT COUNT(*) FROM crm_event_attendees WHERE event_id = ... AND status NOT IN ('cancelled', 'duplicate') FOR UPDATE`.

### RPCs חדשים/עודכנו ב-v2:

5. **`import_leads_from_monday(p_tenant_id, p_board_id, p_items jsonb)`** — ייבוא מ-Monday
6. **`export_leads_to_monday(p_tenant_id, p_filters jsonb)`** — ייצוא ל-Monday
7. **`get_visible_fields(p_tenant_id, p_role_id, p_entity_type)`** — שדות visible ל-role

### RPC חדש ב-v3:

8. **`verify_campaign_page_password(p_tenant_id, p_page_slug, p_password)`** — מוודא סיסמת עמוד ציבורי, מחזיר `visible_columns` אם נכון. מעדכן `last_accessed_at`.

---

## 8. Views — **מורחב משמעותית ב-v3**

### 8.1 `v_crm_event_stats` — **חדש: מחליף counters**

**מחליף:** `total_registered`, `total_confirmed`, `total_attended`, `total_purchased`, `total_revenue`, `attempts_after_close` שהיו ב-`crm_events`

```sql
CREATE VIEW v_crm_event_stats AS
SELECT 
  e.id AS event_id,
  e.tenant_id,
  e.event_number,
  e.name,
  e.event_date,
  e.status,
  e.max_capacity,
  
  -- Counters (computed live from attendees)
  COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelled', 'duplicate') AND a.is_deleted = false) 
    AS total_registered,
  COUNT(a.id) FILTER (WHERE a.status = 'confirmed' AND a.is_deleted = false) 
    AS total_confirmed,
  COUNT(a.id) FILTER (WHERE a.status = 'attended' AND a.is_deleted = false) 
    AS total_attended,
  COUNT(a.id) FILTER (WHERE a.purchase_amount IS NOT NULL AND a.purchase_amount > 0 AND a.is_deleted = false) 
    AS total_purchased,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.is_deleted = false), 0) 
    AS total_revenue,
  COUNT(a.id) FILTER (WHERE a.status = 'event_closed' AND a.is_deleted = false) 
    AS attempts_after_close,
    
  -- Derived metrics
  e.max_capacity - COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelled', 'duplicate') AND a.is_deleted = false) 
    AS spots_remaining,
  CASE WHEN COUNT(a.id) FILTER (WHERE a.status = 'attended' AND a.is_deleted = false) > 0
    THEN ROUND(
      COUNT(a.id) FILTER (WHERE a.purchase_amount IS NOT NULL AND a.purchase_amount > 0 AND a.is_deleted = false)::numeric / 
      COUNT(a.id) FILTER (WHERE a.status = 'attended' AND a.is_deleted = false) * 100, 1
    )
    ELSE 0 
  END AS purchase_rate_pct
  
FROM crm_events e
LEFT JOIN crm_event_attendees a ON e.id = a.event_id AND e.tenant_id = a.tenant_id
WHERE e.is_deleted = false
GROUP BY e.id;
```

---

### 8.2 `v_crm_lead_event_history` — **חדש: היסטוריית אירועים per lead**

**מחליף:** `total_events_attended`, `total_purchases`, `last_event_id`, `is_returning_customer` שהיו ב-`crm_leads` + מענה לשאלת "הגיע ולא קנה"

```sql
CREATE VIEW v_crm_lead_event_history AS
SELECT
  l.id AS lead_id,
  l.tenant_id,
  l.full_name,
  l.phone,
  
  -- Aggregates across all events
  COUNT(a.id) FILTER (WHERE a.status = 'attended') AS total_events_attended,
  COALESCE(SUM(a.purchase_amount), 0) AS total_purchases,
  COUNT(a.id) FILTER (WHERE a.purchase_amount > 0) > 0 AS is_returning_customer,
  MAX(e.event_date) FILTER (WHERE a.status = 'attended') AS last_attended_date,
  
  -- Per-event detail as JSON array
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'event_id', e.id,
        'event_number', e.event_number,
        'event_name', e.name,
        'event_date', e.event_date,
        'status', a.status,
        'purchase_amount', a.purchase_amount,
        'checked_in_at', a.checked_in_at
      ) ORDER BY e.event_date DESC
    ) FILTER (WHERE a.id IS NOT NULL),
    '[]'::jsonb
  ) AS event_history

FROM crm_leads l
LEFT JOIN crm_event_attendees a ON l.id = a.lead_id AND l.tenant_id = a.tenant_id AND a.is_deleted = false
LEFT JOIN crm_events e ON a.event_id = e.id
WHERE l.is_deleted = false
GROUP BY l.id;
```

> **שימוש:** ה-UI יציג per-lead כרטיס עם טבלת "אירועים" — לכל אירוע: מספר, תאריך, סטטוס, סכום רכישה. בדיוק מה שדניאל ביקש במקום "הגיע ולא קנה" כסטטוס.

---

### 8.3 `v_crm_campaign_performance` — **חדש: מחליף Affiliates + Facebook ADS boards**

**מטרה:** עמוד אחד שמראה לקמפיינר את כל מה שהוא צריך: כמה הוציא, כמה לידים, כמה קנו, CAC, CPL, Kill/Scale decision — הכל אוטומטי.

```sql
CREATE VIEW v_crm_campaign_performance AS
SELECT
  ad.id AS ad_spend_id,
  ad.tenant_id,
  ad.ad_campaign_name,
  ad.ad_campaign_id,
  ad.status AS ad_status,
  ad.event_type,
  ad.total_spend,
  ad.daily_budget,
  
  -- CRM data: count leads matching this ad's UTM
  COUNT(DISTINCT l.id) AS total_leads,
  
  -- CRM data: count buyers (leads who attended any event and purchased)
  COUNT(DISTINCT l.id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM crm_event_attendees a 
      WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id 
        AND a.purchase_amount > 0 AND a.is_deleted = false
    )
  ) AS total_buyers,
  
  -- CRM data: total revenue from leads of this campaign
  COALESCE((
    SELECT SUM(a2.purchase_amount) 
    FROM crm_event_attendees a2 
    JOIN crm_leads l2 ON a2.lead_id = l2.id AND a2.tenant_id = l2.tenant_id
    WHERE l2.utm_campaign = ad.utm_campaign 
      AND (ad.utm_content IS NULL OR l2.utm_content = ad.utm_content)
      AND (ad.utm_term IS NULL OR l2.utm_term = ad.utm_term)
      AND l2.tenant_id = ad.tenant_id
      AND a2.purchase_amount > 0 AND a2.is_deleted = false
  ), 0) AS total_revenue,
  
  -- Calculated KPIs
  CASE WHEN COUNT(DISTINCT l.id) > 0 
    THEN ROUND(ad.total_spend / COUNT(DISTINCT l.id), 2) 
    ELSE NULL 
  END AS cpl,
  
  -- Gross Profit (revenue × margin)
  COALESCE((
    SELECT SUM(a2.purchase_amount) 
    FROM crm_event_attendees a2 
    JOIN crm_leads l2 ON a2.lead_id = l2.id AND a2.tenant_id = l2.tenant_id
    WHERE l2.utm_campaign = ad.utm_campaign 
      AND (ad.utm_content IS NULL OR l2.utm_content = ad.utm_content)
      AND (ad.utm_term IS NULL OR l2.utm_term = ad.utm_term)
      AND l2.tenant_id = ad.tenant_id
      AND a2.purchase_amount > 0 AND a2.is_deleted = false
  ), 0) * COALESCE(ue.gross_margin_pct, 0) AS gross_profit,
  
  -- Kill/Scaling thresholds
  ue.gross_margin_pct,
  ue.kill_multiplier,
  ue.scaling_multiplier,
  
  -- Decision (auto-calculated)
  CASE 
    WHEN COUNT(DISTINCT l.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM crm_event_attendees a 
        WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id 
          AND a.purchase_amount > 0 AND a.is_deleted = false
      )
    ) = 0 THEN 'TEST'
    WHEN ad.total_spend / NULLIF(COUNT(DISTINCT l.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM crm_event_attendees a 
        WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id 
          AND a.purchase_amount > 0 AND a.is_deleted = false
      )
    ), 0) > COALESCE(ue.kill_multiplier, 4) * COALESCE(ue.gross_margin_pct, 0.2) * 1000 
    THEN 'STOP'
    WHEN ad.total_spend / NULLIF(COUNT(DISTINCT l.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM crm_event_attendees a 
        WHERE a.lead_id = l.id AND a.tenant_id = l.tenant_id 
          AND a.purchase_amount > 0 AND a.is_deleted = false
      )
    ), 0) < COALESCE(ue.scaling_multiplier, 6) * COALESCE(ue.gross_margin_pct, 0.2) * 1000 
    THEN 'SCALE'
    ELSE 'TEST'
  END AS decision

FROM crm_ad_spend ad
LEFT JOIN crm_leads l ON l.utm_campaign = ad.utm_campaign 
  AND (ad.utm_content IS NULL OR l.utm_content = ad.utm_content)
  AND (ad.utm_term IS NULL OR l.utm_term = ad.utm_term)
  AND l.tenant_id = ad.tenant_id 
  AND l.is_deleted = false
LEFT JOIN crm_campaigns c ON ad.campaign_id = c.id
LEFT JOIN crm_unit_economics ue ON ue.campaign_id = c.id AND ue.tenant_id = ad.tenant_id
WHERE ad.is_deleted = false
GROUP BY ad.id, ue.gross_margin_pct, ue.kill_multiplier, ue.scaling_multiplier;
```

> **מה הקמפיינר רואה (באמצעות `crm_campaign_pages`):**
> שם קמפיין | סטטוס | הוצאה | תקציב יומי | לידים | קונים | הכנסה | CPL | CAC | Gross Profit | החלטה (STOP/SCALE/TEST)
> 
> **מה לא רואה** (נשלט ב-`visible_columns`): lead names, UTM details, revenue (אם דניאל מחליט)

---

### 8.4 `v_crm_event_dashboard` — מסך ניהול אירוע

```sql
CREATE VIEW v_crm_event_dashboard AS
SELECT 
  e.*,
  c.name AS campaign_name,
  c.slug AS campaign_slug,
  s.total_registered,
  s.total_confirmed,
  s.total_attended,
  s.total_purchased,
  s.total_revenue,
  s.spots_remaining,
  s.purchase_rate_pct
FROM crm_events e
JOIN crm_campaigns c ON e.campaign_id = c.id
LEFT JOIN v_crm_event_stats s ON e.id = s.event_id
WHERE e.is_deleted = false;
```

---

### 8.5 `v_crm_event_attendees_full` — רשימת משתתפים מורחבת

```sql
CREATE VIEW v_crm_event_attendees_full AS
SELECT
  a.*,
  l.full_name,
  l.phone,
  l.email,
  l.city,
  l.language,
  l.terms_approved,
  e.event_number,
  e.event_date,
  e.coupon_code,
  s.name_he AS status_name,
  s.color AS status_color
FROM crm_event_attendees a
JOIN crm_leads l ON a.lead_id = l.id AND a.tenant_id = l.tenant_id
JOIN crm_events e ON a.event_id = e.id AND a.tenant_id = e.tenant_id
LEFT JOIN crm_statuses s ON s.slug = a.status AND s.entity_type = 'attendee' AND s.tenant_id = a.tenant_id
WHERE a.is_deleted = false;
```

---

### 8.6 `v_crm_lead_timeline` — ציר זמן per lead

```sql
CREATE VIEW v_crm_lead_timeline AS
SELECT lead_id, tenant_id, created_at, 'note' AS type, content AS detail, employee_id 
  FROM crm_lead_notes
UNION ALL
SELECT entity_id, tenant_id, created_at, 'audit', 
  action || ': ' || COALESCE(field_changed,'') || ' → ' || COALESCE(new_value,''), employee_id
  FROM crm_audit_log WHERE entity_type = 'lead'
UNION ALL
SELECT lead_id, tenant_id, created_at, 'message', 
  channel || ' — ' || status, NULL
  FROM crm_message_log
ORDER BY created_at DESC;
```

---

### 8.7 `v_crm_leads_with_tags` — לידים + tags

```sql
CREATE VIEW v_crm_leads_with_tags AS
SELECT l.*, 
  COALESCE(array_agg(t.name ORDER BY t.sort_order) FILTER (WHERE t.id IS NOT NULL), '{}') AS tag_names,
  COALESCE(array_agg(t.color ORDER BY t.sort_order) FILTER (WHERE t.id IS NOT NULL), '{}') AS tag_colors
FROM crm_leads l
LEFT JOIN crm_lead_tags lt ON l.id = lt.lead_id AND l.tenant_id = lt.tenant_id
LEFT JOIN crm_tags t ON lt.tag_id = t.id
WHERE l.is_deleted = false
GROUP BY l.id;
```

---

## 9. RLS Policies (Iron Rules 14–15)

**Canonical JWT pattern** על כל טבלה — 2 policies per table:

```sql
-- 1. Service bypass (for service_role)
CREATE POLICY service_bypass ON crm_[table]
  FOR ALL TO service_role USING (true);

-- 2. Tenant isolation (for public)
CREATE POLICY tenant_isolation ON crm_[table]
  FOR ALL TO public USING (
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
  );
```

**ספירה:** 22 טבלאות × 2 policies = **44 RLS policies**

---

## 10. סיכום — 22 טבלאות, 8 RPCs, 7 Views, 44 RLS policies

### טבלאות Core (6)

| # | טבלה | מחליפה | שורות צפויות |
|---|-------|--------|-------------|
| 1 | `crm_campaigns` | עמודת Interests | 2–5 |
| 2 | `crm_events` | Events Management board | ~30 |
| 3 | `crm_event_status_history` | (חדש — לוג) | ~300 |
| 4 | `crm_leads` | Tier 2 (after Tier 1 merge) | ~850 |
| 5 | `crm_event_attendees` | Tier 3 + Events Record | ~400 |
| 6 | `crm_lead_notes` | עמודת Notes | ~3,000 |

### טבלאות Config (6)

| # | טבלה | תפקיד | שורות צפויות |
|---|-------|--------|-------------|
| 7 | `crm_statuses` | מנוע סטטוסים configurable | ~30 (seed) |
| 8 | `crm_tags` | תגים גמישים | ~10–20 |
| 9 | `crm_lead_tags` | M:N join | ~2,000 |
| 10 | `crm_custom_field_defs` | הגדרות שדות מותאמים | ~5–15 |
| 11 | `crm_custom_field_vals` | ערכי שדות מותאמים | ~5,000 |
| 12 | `crm_field_visibility` | הרשאות ברמת שדה | ~50 (seed) |

### טבלאות Messaging (4)

| # | טבלה | מחליפה | שורות צפויות |
|---|-------|--------|-------------|
| 13 | `crm_message_templates` | הודעות בתוך Make | ~30 |
| 14 | `crm_automation_rules` | לוגיקה בתוך Make | ~10–15 |
| 15 | `crm_message_log` | Make execution log | ~10,000 |
| 16 | `crm_broadcasts` | שליחות ידניות | ~50 |

### טבלאות Audit/Sync (2)

| # | טבלה | תפקיד | שורות צפויות |
|---|-------|--------|-------------|
| 17 | `crm_audit_log` | Audit trail מלא | ~20,000 |
| 18 | `crm_monday_column_map` | Monday ↔ CRM mapping | ~40 |

### טבלאות CX/Compliance (2)

| # | טבלה | תפקיד | שורות צפויות |
|---|-------|--------|-------------|
| 19 | `crm_cx_surveys` | סקרי שביעות רצון | ~200 |
| 20 | `crm_unsubscribes` | Compliance log | ~50 |

### טבלאות Campaign Performance — **חדש ב-v3** (3)

| # | טבלה | מחליפה | שורות צפויות |
|---|-------|--------|-------------|
| 21 | `crm_ad_spend` | Facebook ADS board | ~20–50 |
| 22 | `crm_unit_economics` | Unit Economics board | 2–5 |
| 23 | `crm_campaign_pages` | Affiliates access | 1–3 |

### Views (7)

| # | View | תפקיד |
|---|------|--------|
| V1 | `v_crm_event_stats` | Counters מחושבים per event |
| V2 | `v_crm_lead_event_history` | היסטוריית אירועים + רכישות per lead |
| V3 | `v_crm_campaign_performance` | ביצועי קמפיינים (replaces Affiliates board) |
| V4 | `v_crm_event_dashboard` | מסך ניהול אירוע |
| V5 | `v_crm_event_attendees_full` | רשימת משתתפים מורחבת |
| V6 | `v_crm_lead_timeline` | ציר זמן per lead |
| V7 | `v_crm_leads_with_tags` | לידים + tags |

---

## 11. "SaaS Litmus Test" — הסכמה עוברת?

| בדיקה | תשובה |
|--------|--------|
| סטטוסים שונים? | ✅ `crm_statuses` — per tenant |
| שפות שונות? | ✅ `name_he`, `name_en` + שפות בהודעות |
| שדות מותאמים? | ✅ `crm_custom_field_defs` — per tenant |
| תגים שונים? | ✅ `crm_tags` — per tenant |
| roles שונים? | ✅ מודול הרשאות קיים + `crm_field_visibility` per tenant |
| סוגי קמפיינים? | ✅ `crm_campaigns` — per tenant |
| revenue/visibility? | ✅ `tenant_id` + RLS + field visibility |
| הודעות שונות? | ✅ `crm_message_templates` — per tenant |
| Monday sync? | ✅ `crm_monday_column_map` — optional, per tenant |
| KPI thresholds? | ✅ `crm_unit_economics` — per tenant per campaign |
| Campaigner access? | ✅ `crm_campaign_pages` — per tenant |

**✅ עובר את מבחן SaaS** — אפס שינויי קוד לטנאנט חדש.

---

## 12. כל ההחלטות — סגורות ✅

| # | שאלה | החלטה | סטטוס |
|---|-------|-------|-------|
| 1 | Prefix `crm_` | כן | ✅ סגור |
| 2 | התנגשות Module 4 | לא מתנגש | ✅ סגור |
| 3 | Counters approach | Views מחושבים | ✅ סגור |
| 4 | terms_approved scope | Per-lead, פעם אחת | ✅ סגור |
| 5 | Import source | Tier 2 בלבד (Tier 1 → Tier 2 ידנית לפני) | ✅ סגור |
| 6 | Notes migration | הערה אחת "היסטוריה ממאנדיי" | ✅ סגור |
| 7 | Campaigner access | עמוד ציבורי עם סיסמה | ✅ סגור |
| 8 | Campaigner data | crm_ad_spend + View מחושב | ✅ סגור |
| 9 | "הגיע ולא קנה" | View (v_crm_lead_event_history), לא סטטוס | ✅ סגור |
| 10 | eye_exam_needed | per-event ב-attendees | ✅ סגור |
| 11 | Unsubscribe retention | לא מוגבל — compliance log שומר הכל | ✅ סגור |
| 12 | Custom fields limit | אין הגבלה בסכמה — UI יכול להגביל | ✅ סגור |

---

> **הערה:** מסמך זה הוא עיצוב סכמה בלבד. לא נכתב קוד, לא נוצרו טבלאות, לא בוצעו שינויים ב-DB.
> השלב הבא: אישור דניאל → SPEC לביצוע → יצירת migration SQL.
