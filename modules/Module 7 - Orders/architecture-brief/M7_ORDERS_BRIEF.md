# M7 — Orders — Architecture Brief

**גרסה:** v1
**תאריך:** 2026-05-07
**מחבר:** Architect (skill `opticup-architect`)
**יעד:** Module Strategist של M7 (skill `opticup-strategic`).

> **Canonical Sketch (locked 2026-05-11):** [`M7_ORDERS_FULL_MOCKUP_V7.html`](./M7_ORDERS_FULL_MOCKUP_V7.html) (Variant A — שני-פאנלים אופקיים + רצועת-כלים דביקה). Selected by Daniel 2026-05-11 from a 3-variant comparison (`M7_CENTER_REDESIGN_V7_VARIANTS.html`). Predecessor v6 mockup and the two non-selected variants archived at [`_archive/m7-sketches-v6-prior/`](../../../_archive/m7-sketches-v6-prior/). Authorizing SPEC: [`docs/specs/M7_CLOSURE_V7_VARIANT_A/`](../docs/specs/M7_CLOSURE_V7_VARIANT_A/).

> זה לא SPEC. שכבת-ביניים בין Master Plan ל-SPEC. מגדיר ישויות, חוזים, דפוסים, סיכונים — לא acceptance criteria, לא שדות-מלאים, לא phases.

---

## 1. ייעוד M7 — שורת-מטרה אחת

M7 הוא **המודול-המרכזי-התפעולי** של פריזמה. כל מכירה, כל תיקון, כל שמירת-מסגרת, כל הצעת-מחיר — חיים כאן. כל שאר המודולים (M5/M6/M1/M8/M9/M11/M12/M13) מתחברים אל M7 באמצעות חוזים מוגדרים.

**Scope migration:** 9,805 הזמנות + 25 וריאנטי-דוחות מ-OpticPlus. 146 עמודות שטוחות → orders + sub_orders + items.

**ה-Strategic-Decision המרכזי:** הזמנה היא **ראש (orders)** + רשימת **תת-הזמנות (sub_orders)** + רשימת **פריטים (sub_order_items)**. לא טבלה שטוחה.

---

## 2. ישויות (גוש 1)

### 2.1 `orders` — ראש-ההזמנה

ישות-עליונה. אדם-אחד, ביקור-אחד, מספר-הזמנה-אחד. כל סך-תשלום ושפה-אחת מצטברים כאן.

**שדות-מנהליים:**
- `id` (uuid, PK), `tenant_id`, `branch_id`, `customer_id` (FK ל-M5).
- `order_number` (int, atomic RPC עם FOR UPDATE pattern לפי Iron Rule 11). פר-tenant, פר-branch.
- `created_at`, `created_by`, `closed_at`, `closed_by`.
- `language` (FK ל-`tenant_languages` של M5).
- `status` enum: `active` / `quote` / `cancelled`. ראה state machine סעיף 3.
- soft-delete (Iron Rule 3).

**שדות-עסקיים:**
- `thanks_message_sent_at` — חותמת השליחה האוטומטית. NULL כל עוד הלקוח לא הגיע ל-active+תשלום.
- `general_discount_amount` — סכום מצטבר של הנחות-כלליות (VIP, קופון, קופ"ח). מחושב מ-`order_general_discounts`.

**יחסים:**
- 1:N → `sub_orders`.
- 1:N → `payments` (M8).
- 1:N → `order_general_discounts`.
- 1:N → `messages_log` (M12).

### 2.2 `sub_orders` — תת-הזמנה

יחידת-משלוח-עצמאית. עד 8 תת-הזמנות פר-הזמנה. כל אחת עם תאריכים-משלה, סטטוס-משלו, הודעות-משלה.

**שדות-מנהליים:**
- `id` (uuid, PK), `tenant_id`, `order_id`, `letter` (`A`/`B`/`C`/...).
- `letter` קבועה לכל-החיים — אחרי soft-delete לא ממוחזרת.
- `created_at`, soft-delete.

**שדות-טיפוס וסטטוס:**
- `kind` enum: `frame` / `lenses` / `contacts` / `accessories`. **4 סוגים בלבד.**
- `state` enum: `active` / `quote` / `reservation`. בלעדיים-זה-לזה.
- `is_repair` boolean — דגל-נוסף שיכול להתלוות ל-active.
- `has_open_task` boolean — דגל-נוסף שיכול להתלוות לכל state.
- `location` enum: `shop` / `lab` / `at_customer` / `outside_lab`. שדה-מעקב פיזי.
- `current_external_company` (nullable) — שם חברת-המעבדה שכרגע מטפלת אם `location=outside_lab`.

**שדות-תאריכי-זרימה (timestamp + actor שלם):**
- `sent_for_framing_at` / `sent_for_framing_by`.
- `lenses_ordered_at` / `lenses_ordered_by` (כשעדשות הוזמנו לספק).
- `ready_at` / `ready_by` — מתעדכן רק אם הודעת "הזמנה מוכנה" נשלחה בהצלחה.
- `delivered_at` / `delivered_by` — מתעדכן ברגע שהלקוח אסף.
- ראה state machine סעיף 3.

**שדות-תיקון (אם `is_repair`):**
- `repair_mode` enum: `internal` / `outside`.
- `repair_description` text.
- `repair_origin` enum: `own_shop` / `elsewhere`.
- `repair_origin_order_id` (FK ל-orders אם `own_shop`).
- `repair_external_company` (nullable).

**שדות-משימה (אם `has_open_task`):**
- `task_description` text.
- `task_status` enum: `open` / `in_progress` / `waiting_reply` / `closed`.
- `task_assignee` (FK ל-users של M2).
- `task_due_date`.
- `task_resolution`, `task_closed_at`, `task_closed_by`.

**שדות-שמירה (אם `state=reservation`):**
- `reservation_expires_at` — קונפיגורבילי פר-tenant (ברירת-מחדל 7 ימים).

**שדות-מרשם (אם `kind` כולל עדשות):**
- `prescription_glasses_id` (FK ל-M6, nullable כשטרם מצורף).
- `prescription_contacts_id` (FK ל-M6).

**שדות-תמחור פר-תת-הזמנה:**
- `subtotal_before_discount` — סכום-מצטבר של `sub_order_items`.
- `category_discount_frame_pct`, `category_discount_lenses_pct`, `category_discount_contacts_pct`, `category_discount_accessories_pct`.
- `subtotal_after_category_discount`.

**יחסים:**
- 1:N → `sub_order_items`.
- 1:N → `messages_log` (פר-תת-הזמנה — "נשלח-למסגור" / "ההזמנה מוכנה").
- N:1 → `orders`.

### 2.3 `sub_order_items` — פריט בתת-הזמנה

פריט-בודד. תת-הזמנה אחת יכולה להכיל מספר פריטים בכפוף לסוג שלה.

**שדות:**
- `id`, `tenant_id`, `sub_order_id`, `position` (סדר-הצגה).
- `item_type` enum: `frame` / `lens_pair` / `contact_lenses` / `accessory` / `free_text`.
- `inventory_id` (FK ל-M1, nullable ל-`free_text`).
- `unit_price` (snapshot בעת ההזמנה — לא מתעדכן עם שינויי-מחירון של M1).
- `quantity` (default 1).
- `decrements_inventory` boolean — מחושב לפי `item_type` + הגדרת-קטלוג של M1.
- `notes` text.
- soft-delete.

**אילוצים פר-`kind` של תת-הזמנה:**
- `kind=frame`: `frame` × 1 + `lens_pair` × 0..1 (זוג עדשות אופציונלי).
- `kind=lenses`: `lens_pair` × 1 (למסגרת קיימת של הלקוח).
- `kind=contacts`: `contact_lenses` × 1 (סוג אחד, qty חופשי בתוך הפריט).
- `kind=accessories`: `accessory` × 1..5.
- `free_text` יכול להיות בכל kind, דורש PIN-מנהל.

### 2.4 `order_general_discounts` — הנחות כלליות

הנחות שחלות על כל-ההזמנה (לא פר-תת-הזמנה).

**שדות:**
- `id`, `tenant_id`, `order_id`.
- `discount_type` enum: `coupon` / `health_fund` / `loyalty` / `manual`.
- `source_id` (FK לקופון/loyalty-tier וכו'; nullable ל-manual).
- `amount` או `pct`.
- `applied_at`, `applied_by`, `requires_pin_role` (לדוגמה manual דורש מנהל).

### 2.5 `order_sequences` — קונפיגורציה למספור פר-tenant

טבלת-counter פר-tenant + branch. מקור-האמת ל-`order_number`.

**שדות:**
- `tenant_id`, `branch_id`, `next_number`.
- atomic via RPC עם FOR UPDATE.

---

## 3. State Machine של תת-הזמנה (גוש 2)

המצבים המרכזיים בלעדיים-זה-לזה:

```
quote ──→ active ──→ (זרימת-מעבדה) ──→ ready ──→ delivered
   │
   └──→ reservation ──→ active (Convert to Order)
```

**מעברים:**
- `quote → active`: לחיצת "Convert to Order" + תשלום ≥ ₪1.
- `quote → cancelled`: ידני, PIN-מנהל.
- `reservation → active`: לחיצת "Convert to Order". תשלום אינו תנאי הכרחי, אבל בפועל הוא יבוא.
- `reservation → expired`: cron כש-`reservation_expires_at < now()` ולא הומר. שדה-נפרד `is_expired`.
- `active → cancelled`: PIN-מנהל. flow מלא לכסף-ששולם (החזר/קרדיט).

**זרימת-מעבדה (תת-state בתוך active, שדות-תאריך):**
- `created` (default).
- `sent_for_framing` (אם הוזמן מסגור-חיצוני).
- `lenses_ordered` (אם הוזמנו עדשות לספק).
- `at_lab` (במעבדה הפנימית או חיצונית).
- `ready` — רק אחרי שליחת-הודעה מוצלחת.
- `delivered` — בעת איסוף.

**State של ההזמנה הראשית (`orders.status`):**
- `active` כל עוד יש תת-הזמנה אחת לפחות active.
- `quote` כש-**כל** התת-הזמנות quote.
- `cancelled` כש-**כל** התת-הזמנות cancelled.

**אגרגציה אוטומטית:**
- `orders.is_ready_aggregate` = AND על כל תתי-ההזמנות (`ready_at IS NOT NULL`).
- `orders.is_delivered_aggregate` = AND על כל תתי-ההזמנות (`delivered_at IS NOT NULL`).

---

## 4. חוזים מול מודולים אחרים (גוש 2)

### 4.1 M5 — Customers
- `orders.customer_id` FK חובה. `customer.lifecycle_stage` יכול להיות prospect/active/dormant.
- View `v_order_customer_summary` ל-M7 לקרוא נתוני-לקוח (שם, טלפון, ת"ז, קופ"ח, שפה, household).
- כשהזמנה ראשונה לקוח-prospect מגיעה ל-`active`+תשלום → trigger מ-M5 שמעדכן `lifecycle_stage='active'`. M7 לא נוגע ב-customer ישירות, רק קורא לטריגר.

### 4.2 M6 — Prescriptions
- `sub_orders.prescription_glasses_id` / `prescription_contacts_id` FK.
- M6 מספק View `v_active_prescriptions_for_customer` ל-M7 להצעת-בחירה.
- שינוי-מרשם ב-M6 לא משפיע על הזמנה קיימת — snapshot-ID נשמר.

### 4.3 M1 — Inventory
- `sub_order_items.inventory_id` FK.
- atomic RPC `decrement_inventory(inventory_id, quantity)` עם FOR UPDATE — נקרא בעת `state→active` (וב-`reservation` למסגרות + עדשות-מגע).
- atomic RPC `increment_inventory` בעת ביטול / מחיקת-תת-הזמנה.
- עדשות-משקפיים: ירידה במלאי **רק** אם `decrements_inventory=true` (special-order לא יורד).

### 4.4 M8 — Payments
- `payments.order_id` FK.
- M8 מספק View `v_order_payment_summary(order_id)` → `total_paid`, `last_payment_at`, `payment_methods_used`.
- אירוע "תשלום ראשון" שולח event ל-M7 שטריגר את שליחת "תודה" אם `state=active`.

### 4.5 M9 — Lab ("McDonalds App")
- M9 סורק ברקוד `<branch>-<order>-<sub>` ומעדכן `sub_orders.location` + שדות-זרימה.
- M9 מספק View `v_lab_queue` ל-M7 לסינון.
- M7 מחזיק את ה-source-of-truth של הזמנה. M9 הוא subordinate flow.

### 4.6 M12 — Communications
- M7 לא שולח הודעות ישירות. הוא קורא ל-Edge Function `send-message(order_id, sub_order_id?, template_code, language)` של M12.
- Trigger-rules ("שליחה תעדכן Order-Ready") נמצאים ב-M12 / מודול-אוטומציות עתידי. M7 רק מחזיק את החוזה: הודעה-נשלחה-בהצלחה → תאריך-מתעדכן.
- בעתיד-הקרוב כל ההודעות ב-M7 ידניות. אוטומציות יבואו מאוחר יותר.

### 4.7 M13 — Loyalty
- בעת תשלום מלא → M13 trigger מצבר נקודות-זיכוי. M7 לא יודע על loyalty ישירות.
- קופון-מועדון = `order_general_discounts` עם `discount_type=loyalty` + `source_id=loyalty_member_id`.

### 4.8 M4 — CRM
- משימה ללא-מוצר → ב-M4. עם-מוצר → ב-M7 (`has_open_task`).
- M4 מספק "Lead → Customer auto-promotion" כשתשלום ראשון נכנס. M7 קורא ל-RPC ולא משנה את ה-customer ישירות.

---

## 5. דפוסי-עיצוב מפתח (גוש 3)

### 5.1 Multi-state via flag, not type-explosion
תת-הזמנה יכולה להיות `active`/`quote`/`reservation` עם דגלים נוספים `is_repair`, `has_open_task`. **לא** ליצור `repair_orders`/`reservations` כטבלאות-נפרדות. אותם 3 שדות JOIN-able ב-Views.

### 5.2 State-dependent UI
כפתורי-הדפסה זמינים רק כשמצב מתאים: Frame Reservation רק ב-`reservation`, Repair Form רק ב-`is_repair`, Task Form רק ב-`has_open_task`. הוגדר בקטלוג-טפסים.

### 5.3 Source-of-truth dual track
טופס-מודפס מציג מצב-זמני (סימון-ידני). מחשב הוא source-of-truth (סריקה ב-M9 / לחיצה ב-M7). שני הצדדים יכולים לחיות זה-לצד-זה — אדם רואה נייר, מחשב יודע אמת.

### 5.4 Granularity tiers (חזק לדפדוף)
כל ארטיפקט (הודעה / טופס / תאריך) שייך לרמת-גרעין אחת בלבד: order / sub_order / item. אין ערבוב. מומלץ ל-Module Strategist לכלול עמודה `granularity_tier` בכל טבלת-events / messages / forms.

### 5.5 Sequential numbering atomic
`order_number` תמיד דרך RPC עם FOR UPDATE לפי Iron Rule 11. אסור client-side `MAX+1`.

### 5.6 Snapshots vs live-data
תמחור פריטים (`unit_price`), שדות-לקוח-בהזמנה (`customer_name_snapshot` אם נדרש), מרשם (FK + תאריך) — snapshots בעת יצירה. שינוי-מרשם / שינוי-מחיר-במלאי לא משפיע על הזמנה קיימת.

### 5.7 Configuration over enum
- 6 צ'קבוקסים בטופס Outside Framing → טבלה קונפיגורבילית פר-tenant.
- שפות (HE/RU/EN/+) → `tenant_languages` של M5.
- תוקף-Reservation, מקדמה-מינימלית, אחוז-מע"מ → `tenant_config`.
- enum נשמר ל-state machines ולקודי-משפט בלבד (Pattern P19).

### 5.8 Tenant-isolation
כל טבלה: `tenant_id UUID NOT NULL` + RLS עם הפטרן הקנוני (Iron Rule 15). Views חיצוניים (M9, M12) קוראים דרך RPC בלבד.

---

## 6. סיכונים ונושאים-לתשומת-לב (גוש 4)

1. **Frame-Reservation ו-Inventory.** ירידה-ממלאי בעת `reservation` → תת-הזמנה שפג-תוקפה ולא הומרה דורשת **החזרה אוטומטית למלאי** + לוג. Module Strategist יבחן edge-cases של "החזרה-חלקית" (חלק נמכר במקביל).

2. **Letter immutability.** אות-תת-הזמנה (A/B/...) קבועה לכל-החיים גם אחרי soft-delete. Module Strategist יוודא ש-UI מציג מחוקים בעמום ולא מקצה את האות מחדש. אינדקס פרטי `(order_id, letter)` עם UNIQUE — צריך לכלול גם is_deleted=true.

3. **Conversion flow מ-Quote / Reservation → Active.** Daniel קבע ידני (לא אוטומטי גם אם מקדמה ≥ 50%). Module Strategist יוסיף trail-מלא: timestamp, actor, מקור-המעבר.

4. **Trigger לעדכון customer.lifecycle_stage.** אם M7 קורא ל-RPC של M5, יש לוודא Idempotency — קריאה כפולה לא תכפיל העלאת-stage.

5. **AI Auto-fill לטפסי-Outside (Outside Framing, Outside Repair).** דרישה עתידית (sprint נפרד). Module Strategist יוודא שהטופס המודפס פתוח להזרקת-נתונים-חיצונית — שדות מובנים ולא רק טקסט-חופשי.

6. **שדה Location מול שדות-זרימה.** Location הוא מצב-נוכחי (איפה זה עכשיו). שדות-זרימה (`sent_for_framing_at` וכו') הם היסטוריה (מתי זה הגיע למצב). שניהם דרושים — לא לבחור ביניהם. Module Strategist יוודא שהמעברים מסונכרנים: סריקה ב-M9 → מעדכנת גם Location וגם השדה-תאריך הרלוונטי.

7. **Multi-currency / Multi-VAT.** בטווח-הקצר tenant=פריזמה=ILS+18%. אבל Iron Rule 19/20 דורש שלא נכניס "₪" או "18" לקוד. כל המספרים → `tenant_config`. Module Strategist יוודא שגם בטפסים המודפסים אין hardcode.

8. **Order Inspection without Tear-off.** אם פריזמה תרצה תלוש-לקוח לפני שיש POS API — ניצור טופס Customer Receipt נפרד פר-הזמנה. כרגע לא חלק מ-M7.

---

## 7. דרישות-מערכת לא-בטפסים (גוש 5)

### 7.1 מסכי-עזר ל-M7
- **כל-השמירות-הפעילות** — סינון לפי תוקף, לקוח, אחראי. הצגה במסך-בית.
- **כל-המשימות-הפתוחות** — סינון לפי סטטוס, אחראי, יעד.
- **כל-התיקונים-הפעילים** — סינון לפי מצב, אחראי, מקור-מסגרת.
- **הזמנות-מוכנות-שלא-נאספו** — דיגום של הזמנות עם `is_ready_aggregate=true` ו-`is_delivered_aggregate=false`. תומך bulk-message.
- **תור-מעבדה** — View משולב עם M9.

### 7.2 Bulk operations
- שליחת-הודעת-תזכורת-איסוף לרשימה (היום ידני, מודול-אוטומציות בעתיד).
- ייצוא רשימה ל-Excel (Iron Rule pattern).

### 7.3 Audit
- כל שינוי ב-`sub_orders.state` / `is_repair` / `has_open_task` / שדה-תאריך-זרימה → רישום ב-`activity_log` של M1.5 (Iron Rule 2).
- שינוי הנחה ידנית → PIN + רישום.
- מחיקת-פריט מתת-הזמנה → soft-delete + writeLog.

---

## 8. החלטות-מפורשות שננעלו בסבב הזה

1. **4 סוגי תת-הזמנה בלבד.** מסגרת/עדשות/עדשות-מגע/אביזרים. "מסגרת+עדשות" = תוכן ולא סוג.
2. **מסך M7 = טאב בכרטיס-לקוח.** לא ישות עצמאית במסך.
3. **3 טורים:** ימין = רכבת-תת-הזמנות + תשלום (ימין-תחתון). אמצע = עורך. שמאל = תקשורת+log.
4. **עד 8 תת-הזמנות.** תקרה-קשיחה.
5. **אות-תת-הזמנה קבועה לכל-החיים.**
6. **הנחות-פר-תת-הזמנה (4 קטגוריות) + הנחות-כלליות פר-הזמנה.** שתי שכבות מצטברות.
7. **שמירה אוטומטית, Undo/Redo.** אין כפתור "שמור".
8. **טלפון בלבד למסך** (לא ת"ז). סכום-קנייה ב-12 חודשים אחרונים.
9. **ניווט תחתון רק בין הזמנות-של-אותו-לקוח.**
10. **5 טפסים נסגרו:** Order Inspection, Task Form, Outside Framing, Frame Reservation, Repair Form (Internal+Outside).
11. **לוגיקת "תודה":** state=active **AND** payment ≥ ₪1. Reservation עם מקדמה לא מפעילה.
12. **כל ההודעות ב-M7 ידניות בשלב ראשון.** אוטומציות יבואו במודול-תקשורת/אוטומציות עתידי.
13. **טפסי M7 פנימיים בלבד.** קבלה/חשבונית — קופה/POS API חיצוני.
14. **סטטוס-מעבדה dual-track:** טופס-ידני + מחשב-אוטומטי-עם-ברקוד.
15. **תוקף-Reservation:** 7 ימים ברירת-מחדל, קונפיגורבילי.
16. **מקדמה לא ממירה אוטומטית.** "Convert to Order" ידני תמיד.
17. **לידים פותחים תיקונים/שמירות.** תשלום-ראשון מוביל ל-promotion → customer.

---

## 9. מה לא ב-Brief הזה (Day-1 skeleton — דחוי לעתיד)

לפי Pattern P17 (Foundation-first):

- **Customer-facing status window** ("דומינוס פיצה" — מסך לקוח לראות סטטוס) — לא ב-M7.
- **AI Auto-fill לטפסים חיצוניים** — sprint נפרד לאחר M7-MVP.
- **Trigger engine מלא If-Then** — דחוי למודול-אוטומציות.
- **Customer Receipt טופס** — דחוי. POS API יטפל.
- **Bulk-WhatsApp לאוסף-לקוחות** — UI קיים, האוטומציה במודול-אוטומציות.
- **תזכורת-איסוף אוטומטית** — דחוי למודול-אוטומציות.
- **גישה-מהירה לתיקון מהמסך-הראשי** — דחוי למסך-ראשי של ה-ERP.

---

## 10. הצעדים הבאים (לקראת SPEC)

1. **Module Strategist** טוען את ה-Brief ל-skill `opticup-strategic`.
2. כותב **MODULE_7_ROADMAP.md** עם phases.
3. כותב **MODULE_SPEC.md** של M7.
4. מתחיל **SPEC ראשון** — Phase 0: Audit + Schema Design (סקירת `tb_order_*` ב-OpticPlus, מיפוי 146 העמודות → orders + sub_orders + items).
5. SPECs הבאים: Phase 1 — Editor UI; Phase 2 — Forms; Phase 3 — State machine; Phase 4 — Cross-module contracts; Phase 5 — Migration script.

---

## 11. קישורים

- סקיצת מסך M7 הראשית: `M7_ORDERS_FULL_MOCKUP_V6.html`
- Feature Inventory: `M7_ORDERS_FEATURE_INVENTORY.md`
- 5 טפסים: `M7_FORM_*_MOCKUP.html`
- קטלוג טפסים: `M7_ORDERS_PRINT_FORMS.md`
- Master Plan: `_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md`
- Briefs קודמים: M5_CUSTOMERS_BRIEF.md, M6_PRESCRIPTIONS_BRIEF.md
- DECISIONS_LOG: `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`

---

*נוצר 2026-05-07. Brief סגור — Module Strategist יכול להתחיל לכתוב SPECs.*
