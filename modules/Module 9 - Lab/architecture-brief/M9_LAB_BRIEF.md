# M9 — Lab/KDS — Architecture Brief v1

> **מצב:** Draft · 2026-05-10
> **מאשר:** Daniel
> **סקיצות:** 4 קבצי HTML באותה תיקייה
>   - `M9_SKETCHES.html` — מסך-המקדונלדס (סקיצה ג v2)
>   - `M9_SHIPMENTS_SKETCHES.html` — מסך-משלוחים (drawer-נכנסת)
>   - `M9_DASHBOARD_SKETCHES.html` — דשבורד-מנהל (היברידי)
>   - `M9_SETTINGS_SKETCHES.html` — Settings (Sidebar v2)
> **תלוי ב-Briefs נסגרים:** M5 (Customers), M7 (Orders), M8 (Payments), M11 (Reports), M12 (Communications), M13 (Loyalty)
> **תלוי ב-blocker חיצוני:** **M1 הרחבה** — 3 טבלאות-מלאי: עדשות-משקפיים / עדשות-מגע / אביזרים. SPEC נפרד ב-OPEN_TASKS #2.

---

## 1. מטרה

מודול-מעבדה הוא ה-"מערכת מקדונלדס" של האופטיקה — מסך-שליטה תפעולי שמנהל כל מה שזז בין הסניף, המעבדה, ספקי-המעבדה החיצוניים, חברות-השליחויות, והלקוחות. המטרה: **100% שביעות-רצון לקוחות** + **0 הזמנות שנופלות בין הכיסאות**. עובד-מעבדה-מוסמך תמיד צופה במסך-המקדונלדס וודא שאף הזמנה לא מתעכבת.

המודול מאחד 3 תחומים שהיו בעבר נפרדים:
1. **מעקב הזמנות** (KDS) — שלבי-עיבוד מקליטה עד מסירה ללקוח
2. **ניהול משלוחים** ("ארגז") — קופסאות יוצאות + נכנסות (מחליף את מודול-המשלוחים-הישן ב-M1)
3. **זיכויים והחלפות** — מעקב מסעות-החזרה לספקים + ספי-זמן ארוכים

**זה לא:** מסך-תקשורת ללקוח (M12), מסך-קליטה-למלאי (M1), מסך-יצירת-הזמנה (M7), מסך-תשלומים (M8). M9 מקבל מהם נתונים ומחזיר אליהם updates.

---

## 2. החלטות ננעלות (Day-1)

### 2.1 סקופ ופלואו

- **3 פלואו על תת-הזמנה:** (1) מהמלאי + מסגור-פנימי, (2) הזמנת-עדשה + מסגור-פנימי, (3) שליחה ישירה למעבדה-חיצונית (היא מזמינה עדשות + ממסגרת + מחזירה).
- **שדה `lab_flow`** על תת-ההזמנה (לא על הזמנה כולה — לקוח יכול להזמין 2 זוגות בפלואו שונים).
- **קטגוריות** לא מומצאות מחדש — באות מ-M7 (Orders).
- **ברירת-מחדל בפילטר:** מציג רק הזמנות-פתוחות (לא נמסר). אופציה "כולל-נלקח" להיסטוריה.

### 2.2 שעוני-עיכוב

**שני שעונים נפרדים, פר-קטגוריה:**
- **שעון-עיבוד** — מקליטה → עד שליחת-הודעת-מוכן ללקוח. **3 ספים:** צהוב / אדום / פיצוי.
- **שעון-איסוף** — מהודעת-המוכן → עד איסוף-בפועל. **2 ספים:** צהוב / אדום (אין פיצוי — פנימי בלבד, מטרה: דחיפת-עובדים ליצור-קשר).

**ספים לדוגמה (Prizma Day-1):**
| קטגוריה | עיבוד-צהוב | עיבוד-אדום | עיבוד-פיצוי | איסוף-צהוב | איסוף-אדום |
|---|---|---|---|---|---|
| מולטיפוקל | 10 ימים | 14 ימים | 17 ימים | 3 ימים | 7 ימים |
| אופיס | 10 ימים | 14 ימים | 17 ימים | 3 ימים | 7 ימים |
| ביפוקל | 10 ימים | 14 ימים | 17 ימים | 3 ימים | 7 ימים |
| מדף הזמנה | 48 שעות | 5 ימים | 7 ימים | 3 ימים | 7 ימים |
| מדף מלאי | 24 שעות | 72 שעות | — | 3 ימים | 7 ימים |
| תיקון | 3 ימים | 7 ימים | 10 ימים | 3 ימים | 7 ימים |
| ייצור | 5 ימים | 10 ימים | 14 ימים | 3 ימים | 7 ימים |

**הקפאה ידנית** — עובד יכול להקפיא שעון-עיבוד עם סיבה-חובה (חסרים-פרטים / לקוח-לא-זמין / ספק-לא-עונה). הזמן-המוקפא נשמר נפרד ב-log.

### 2.3 פיצויים

- **פיצוי לא קשור למועדון.** כל לקוח (גם ללא-מועדון) יכול לקבל פיצוי. שקיבל-פיצוי-ראשון = נוצרת אוטומטית "חברות-בסיסית-חינם" ב-M13 (לא משלם דמי-חבר, לא מקבל בונוסי-תיר, מקבל קרדיטים).
- **מטריצת-פיצויים מוגדרת מראש** פר-(קטגוריה × רמת-עיכוב). מדרגות-פיצוי: פיצוי-1 (אדום+X ימים), פיצוי-2 (אדום+Y ימים), וכו'. ללא-מגבלת-מדרגות (מנהל קובע).
- **סכום-פיצוי** = סכום ב-₪ + סוג (עדשות / מסגרות).
- **שיקול-דעת-מנהל:** המערכת ממליצה, מנהל יכול: לאשר / להוריד / להעלות / לבטל / להמיר-סוג. כל שינוי מצריך סיבה-חובה.
- **סף-עליון מוחלט = תוספת-מקסימלית מעל הפיצוי-המוגדר.** דוגמה: פיצוי-מוגדר=200₪, סף-עליון=+500₪ → המנהל יכול לתת עד 700₪. חריגה = דורש אישור-בעלים.
- **תשתית-AI:** יום-1 הכל ידני. תשתית בנויה לאוטומציה-עתידית (Pattern P17 — foundation-first).

### 2.4 ניהול משלוחים

**2 ישויות מלאות:**
- **קופסה-יוצאת** — נוצרת ע"י אופטיקאי. סטטוסים: טיוטה → נשלחה → נסגרה (כשכל ההזמנות שלה חזרו).
- **קופסה-נכנסת** — 3 סוגים:
  - **חזרה-ממעבדה** (הזמנות שחזרו מספק)
  - **סחורה-למלאי** (משלוח חדש מספק → תעודות+חשבוניות → קליטה ב-M1)
  - **בין-סניפי** (Day-N — Prizma=סניף-יחיד)

**יחס רבים-לרבים:** קופסה-יוצאת אחת יכולה להחזיר את ההזמנות שבה במספר קופסאות-נכנסות שונות.

**ברקודים:**
- **ברקוד-יציאה** — של חברת-השליחויות (כץ). נסרק בעת-יצירת-הקופסה.
- **ברקוד-טופס-הזמנה** — מ-M7. נסרק לתוך הקופסה-היוצאת = ההזמנה משויכת לקופסה.
- **ברקוד-ספק** — על קופסה-נכנסת. נסרק בעת-קבלה. "נדבק" לכל ההזמנות בקופסה לחיפוש-עתידי.

**זרימה דו-כיוונית:**
- **שליחה:** drawer פותח טיוטה → סורקים ברקודי-הזמנה לתוך → סוגרים ושולחים.
- **קבלה:** כפתור "+ קבלת קופסה" → drawer → סוג + חברה + ברקוד-ספק → סורקים/בוחרים הזמנות → מסמנים תקין/פגום → "סיים-וסגור".

### 2.5 התראות

- **שעון-עיבוד עובר לאדום** → סאונד במסך-המקדונלדס.
- **שעון-עיבוד עובר לפיצוי** → סאונד + WhatsApp לאופטיקאי-משמרת + מנהל-סניף.
- **תזכורת-איסוף** → אוטומטית ללקוח דרך M12 (WhatsApp / SMS, עם confirmation-gate-עובד).
- **התראת "קופסה-יוצאת ללא-חזרה X ימים"** → לאופטיקאי, פר-ספק (ספי-זמן שונים לכל ספק).
- **משלוח ללקוח יוצא** → הודעה ללקוח עם ברקוד-מעקב (אוטומטי דרך M12).

### 2.6 הרשאות

- **לא נבנית מטריצה פנימית ל-M9.** מתממשקים ל-מודול-ההרשאות-המרכזי (Iron Rule 21 — No Duplicates).
- **תפקידים שצורכים M9:** מוכר / קופאי / אופטיקאי-משמרת / מנהל-סניף / בעלים. כל אחד מקבל permissions ספציפיים מ-מודול-ההרשאות.
- **דגש:** רק האופטיקאי-המחובר-באותה-משמרת יכול לסמן "תקין/פגום" — נושא-באחריות אם משהו השתבש.

### 2.7 דוחות

מודול M11 (דוחות) בונה מעל-Views של M9. **3 דוחות-ליבה:**
1. **דוח-עיכובים** — פר-קטגוריה / פר-עובד / פר-ספק / פר-חודש
2. **דוח-זמן-טיפול** — ממוצעים, מגמות
3. **דוח-משחק-של-אופטיקאי** — KPI אישי לאופטיקאי-משמרת

**דשבורד מנהל = ב-M11** (לא ב-M9). M9 רק חושף Views.

### 2.8 מועדון לקוחות

- **חבר-בסיסי-חינם** (חדש ב-M13) — נוצר אוטומטית בקבלת-פיצוי-ראשון או Referral. מקבל קרדיטים, אין בונוסי-tier, אין צבירה-מקניות.
- **חבר-משלם** (קיים ב-M13) — ₪50/₪100 דמי-חבר, כל הבונוסים.
- **עמוד-הצטרפות אחד באתר** עם 2 כפתורים: "₪50 — חברות-מלאה + ₪150 בונוס" / "חינם — דיוור-מבצעים בלבד".
- **קישור עדכוני-Brief ב-M13:** סעיף "החלטות D5 — הצטרפות" צריך להתעדכן: גם הצטרפות-בסיסית-חינם דרך-עמוד-האתר, וגם הצטרפות-בסיסית-אוטומטית דרך-פיצוי/Referral.

---

## 3. ישויות (8 entities)

### 3.1 `lab_jobs` — ההזמנה במעבדה

מקור-אמת לסטטוס-הזמנה מתוך perspective של M9. אחת לכל **תת-הזמנה** מ-M7 (זוג-זוג).

**שדות עיקריים:**
- `tenant_id`, `branch_id`, `lab_id`
- `order_id` (FK ל-M7), `sub_order_id` (FK ל-M7 sub-orders)
- `customer_id`, `category_id`, `lab_flow` (in_stock / lens_order_internal / external)
- `status` (state-machine: new / sent_for_framing / waiting_lens / waiting_client / ready / delivered / re_do)
- `received_at` (קליטה), `sent_for_framing_at`, `lens_ordered_at`, `returned_at`, `ready_notification_sent_at`, `picked_up_at`
- `processing_clock_paused_at`, `processing_clock_paused_reason`, `processing_paused_minutes_total`
- `seller_employee_id` (מי ביצע ההזמנה), `lab_optician_employee_id` (אופטיקאי-משמרת בעת-הטיפול)
- `compensation_status` (none / threshold_passed / proposed / approved / paid / overridden), `compensation_amount`, `compensation_type` (lenses/frames), `compensation_approved_by`, `compensation_reason`
- `manual_override` (slot עתידי — VIP)

**RLS:** tenant_isolation (canonical JWT pattern).

### 3.2 `lab_categories` — קטגוריות

טבלת-config (Pattern P19 — per-tenant). מסונכרן עם M7.

**שדות עיקריים:**
- `tenant_id`, `slug`, `name_he/en/ru`, `display_order`, `color`
- `default_lab_flow` (ברירת-מחדל בעת-יצירת-הזמנה)
- `processing_yellow_threshold_minutes`, `processing_red_threshold_minutes`, `processing_compensation_threshold_minutes`
- `pickup_yellow_threshold_minutes`, `pickup_red_threshold_minutes`
- `is_active`, `is_default`

### 3.3 `lab_compensation_tiers` — מדרגות-פיצוי

פר-(קטגוריה × רמת-מדרגה).

**שדות עיקריים:**
- `tenant_id`, `lab_category_id`
- `tier_label` (פיצוי-1 / פיצוי-2 / וכו'), `tier_order`
- `trigger_days_after_red` — אחרי כמה ימים מהסף-האדום הופעל
- `compensation_amount_ils`
- `compensation_type` (lenses / frames)
- `is_active`

**Settings גלובלי (per-tenant):**
- `manager_compensation_max_addition_ils` — תוספת-מקסימלית מעל ההמלצה (Daniel correction 2026-05-10).

### 3.4 `lab_status_log` — היסטוריית-סטטוסים

`activity_log` המרכזי הוא מקור-אמת. View `v_m9_status_log` מסנן את הרלוונטיים. **לא טבלה נפרדת** (Iron Rule 2 + 21).

### 3.5 `lab_notes` — הערות-אופטיקאי

הערות חופשיות שנכתבות ב-sub-row של מסך-המקדונלדס.

**שדות עיקריים:**
- `tenant_id`, `lab_job_id`, `note_text`, `created_by_user_id`, `created_at`

### 3.6 `shipping_boxes` — קופסאות-משלוח

**ישות מאוחדת לכל סוגי-המשלוחים** (החליפה את מודול-המשלוחים-הישן ב-M1).

**שדות עיקריים:**
- `tenant_id`, `branch_id`
- `direction` (outgoing / incoming)
- `box_type` (return_from_lab / outgoing_to_lab / outgoing_to_customer / outgoing_credit / outgoing_replace / outgoing_repair / stock_inbound / inter_branch_inbound / inter_branch_outbound)
- `target_or_source_id` — FK פוליפורמי (supplier_id או customer_id)
- `courier_company_id`, `courier_barcode` (ברקוד-יציאה — עבור outgoing), `supplier_barcode` (ברקוד-ספק — עבור incoming)
- `status` (draft / sent / received / handled / closed)
- `created_by_user_id`, `handled_by_user_id`
- `created_at`, `sent_at`, `received_at`, `handled_at`
- `expected_return_threshold_days` — לקופסה-יוצאת (פר-ספק)

### 3.7 `shipping_box_items` — פריטים בקופסה

**שדות עיקריים:**
- `tenant_id`, `shipping_box_id`
- `lab_job_id` (FK — אם הפריט הוא הזמנה)
- `quality_status` (pending / ok / damaged / not_inspected) — רלוונטי לקופסה-נכנסת
- `damage_reason_id` (FK ל-`lab_damage_reasons`) — אם damaged
- `linked_outgoing_box_id` — קישור היסטורי לקופסה-יוצאת
- `linked_incoming_box_id` — קישור היסטורי לקופסה-נכנסת
- `delivery_doc_numbers` (JSONB array — תעודות-משלוח/חשבוניות, רלוונטי ל-stock_inbound)

### 3.8 `lab_damage_reasons` — סיבות-פגם (config)

טבלת-config פר-tenant, ניתן להרחיב.

**שדות עיקריים:**
- `tenant_id`, `slug`, `name_he`, `is_active`, `display_order`

**Seed לפריזמה:** שריטה / לא-מתאים-מרשם / שבור / חסר-חלק / איכות-ירודה.

### 3.9 `lab_couriers` — חברות-שליחויות (config)

**שדות עיקריים:**
- `tenant_id`, `name`, `barcode_pattern_regex`, `is_default`, `is_active`

### 3.10 `lab_supplier_thresholds` — ספי-החזר פר-ספק

**שדות עיקריים:**
- `tenant_id`, `supplier_id` (FK ל-M1)
- `expected_return_days` — אחרי כמה ימים נחשב "מאוחר"
- `auto_alert_at_days`

---

## 4. מנועים (5 engines)

### 4.1 Clock Engine

**Trigger:** Cron job כל דקה / pg_cron.

**Flow:**
1. סרוק כל `lab_jobs` שלא נמסרו ולא בהקפאה.
2. חשב זמן-עיבוד-עובר (ניכוי זמן-מוקפא).
3. השווה לסף-קטגוריה.
4. אם חצה סף-חדש → UPDATE `status_color` + INSERT-לוג.
5. אם חצה סף-פיצוי → INSERT `compensation_status='threshold_passed'` + Notification (סאונד + WhatsApp).

### 4.2 Compensation Engine

**Trigger:** מנהל לוחץ "אשר פיצוי" במסך.

**Flow:**
1. בדוק שהפיצוי המבוקש ≤ פיצוי-המוגדר + manager_max_addition.
2. אם לא — דורש אישור-בעלים.
3. קרא ל-`loyalty_grant_credit_compensation` ב-M13 (יוצרת חבר-בסיסי-חינם אם אין).
4. UPDATE `compensation_status='approved'` + INSERT-לוג.

### 4.3 Shipping Box Engine

**Trigger:** אופטיקאי לוחץ "+ קופסה" / סוגר drawer.

**Flow:**
1. INSERT `shipping_boxes` + INSERT `shipping_box_items`.
2. כל ההזמנות שנכנסות לקופסה-יוצאת — UPDATE `lab_jobs.status='sent_for_framing'` + UPDATE `sent_for_framing_at`.
3. עבור קופסה-נכנסת:
   - אם פריט תקין → UPDATE `lab_jobs.status='returned_from_framing'` + UPDATE `returned_at`.
   - אם פריט פגום → INSERT קופסה-יוצאת חדשה (סוג=outgoing_credit/replace/repair) + UPDATE `lab_jobs.status='re_do'`.

### 4.4 Notification Engine

M9 קורא ל-M12 `send_message_by_template` בנקודות:

| Event | Template | Target |
|---|---|---|
| תזכורת-איסוף-צהוב | `m9_pickup_reminder_yellow` | לקוח |
| תזכורת-איסוף-אדום | `m9_pickup_reminder_red` | לקוח + טלפון-אופטיקאי |
| התראה-אדום פנימית | `m9_internal_red_alert` | אופטיקאי-משמרת + מנהל |
| התראה-פיצוי פנימית | `m9_internal_compensation_alert` | אופטיקאי + מנהל + בעלים |
| משלוח-יוצא-ללקוח | `m9_customer_shipping_out` | לקוח |
| קופסה-יוצאת ללא-חזרה | `m9_overdue_outbound_box` | אופטיקאי |

### 4.5 Inventory Receipt Engine

**Trigger:** סוגרים קופסה-נכנסת מסוג `stock_inbound`.

**Flow:**
1. שמור תעודות+חשבוניות ב-`shipping_boxes.delivery_doc_numbers`.
2. כשסוחרים קולטים את הסחורה ב-M1 (במסך-קליטת-סחורה), הקליטה משייכת בחזרה לקופסה הזו.

---

## 5. חוזים מול מודולים אחרים

| מ-מודול | חוזה |
|---|---|
| **M1 (Inventory)** | M1 הוא source-of-truth לספקים. M9 מסנכרן read-only. M9 מציג ספקים-נעולים-מ-M1. M9 מייתר את מודול-המשלוחים-הישן של M1. **תלוי ב-M1-extension** (3 טבלאות חדשות). |
| **M5 (Customers)** | M5 source-of-truth ללקוחות. M9 קורא לקריאה. אין אינטראקציה כתיבה. |
| **M7 (Orders)** | M7 יוצר ההזמנה + תת-ההזמנה (עם `lab_flow`). M7 מדפיס טופס-עם-ברקוד שנכנס לקופסה. M7 שולח הודעת-מוכן ידנית מכרטיס-ההזמנה (M9 רק מסמן). M9 מציג קישור-קפיצה לכרטיס-הזמנה ב-M7. |
| **M8 (Payments)** | פיצוי = קרדיט-לקוח (לא תשלום-נטו). M9 קורא ל-M13 (לא ל-M8 ישירות). M8 רואה credits כקטגוריה ב-EOD reconciliation. |
| **M11 (Reports)** | M9 חושף 3 Views: `v_lab_delays_by_supplier`, `v_lab_processing_time`, `v_lab_optician_kpi`. M11 בונה דשבורד-מנהל מעל. |
| **M12 (Communications)** | M9 קורא `send_message_by_template` ב-6 נקודות (§4.4). M12 מטפל בערוץ + locale + variables. |
| **M13 (Loyalty)** | M9 קורא `loyalty_grant_credit_compensation` בעת-אישור-פיצוי. M13 יוצרת חבר-בסיסי-חינם אם אין. M13 צריך עדכון Brief: D5 + הצטרפות-בסיסית-אוטומטית. |
| **מודול-הרשאות** | M9 מצהיר על כ-15 permission keys. אין מטריצה פנימית ב-M9. |

---

## 6. סקיצות (4 מסכים)

| # | מסך | קובץ | בחירה |
|---|---|---|---|
| S1 | מסך-מקדונלדס (KDS ראשי) | `M9_SKETCHES.html` | סקיצה ג v2 |
| S2 | מסך-משלוחים | `M9_SHIPMENTS_SKETCHES.html` | סקיצה א v3 + drawer |
| S3 | דשבורד-מנהל | `M9_DASHBOARD_SKETCHES.html` | סקיצה ג היברידי (יבנה ב-M11) |
| S4 | Settings (8 תחומים) | `M9_SETTINGS_SKETCHES.html` | Sidebar v2 |

**Settings כולל מטריצת-פיצויים** (סקיצה ב — טופס פר-קטגוריה, מ-`M9_COMPENSATION_SKETCHES.html`).

---

## 7. Future-proofing slots

- **F1 — מעבדה-ראשית רב-סניפית.** מודול-נפרד עתידי. לא ב-M9. שדה `lab_id` ב-`lab_jobs` כבר מוכן.
- **F2 — אינטגרציה ל-API של ספקים** (Hoya/Essilor/Shamir). תשתית `lab_supplier_thresholds` + ברקודים מוכנים. כשתגיע אפשרות אמיתית — נוסיף adapter.
- **F3 — אפליקציית-עובד.** `lab_optician_employee_id` כבר נשמר על כל אירוע. push-notifications יתווספו על תשתית M12 הקיימת.
- **F4 — אוטומציית-פיצוי-AI.** טבלת `lab_compensation_tiers` כבר עם כל הנתונים הנדרשים. AI agent יקרא RPC קיים, ידלג על שלב המנהל הידני.
- **F5 — אינטגרציה ל-API של חברות-שליחויות** (כץ). `courier_barcode` כבר נשמר. מעקב-אוטומטי יוסיף עדכוני סטטוס-משלוח ללא-מגע.
- **F6 — VIP override.** `manual_override` ב-`lab_jobs` (slot ריק).

---

## 8. סיכונים זוהו

| # | סיכון | מענה |
|---|---|---|
| R1 | אופטיקאי שוכח לסמן "תקין/פגום" → הזמנות תקועות | תזכורת-יומית ב-Notification Engine |
| R2 | מנהל מאשר פיצוי-יתר עקב לחץ-לקוח | סף-עליון מנהל + log אישורים |
| R3 | הקפאה-לרעה של שעון לפצות-עובד | log כל הקפאה עם סיבה + דוח-מנהל-חודשי |
| R4 | ברקוד-ספק מתנגש בין משלוחים | UNIQUE constraint על `(supplier_id, supplier_barcode)` |
| R5 | קופסה-יוצאת תקועה ללא-חזרה | sentinel-job יומי + התראה |
| R6 | פגומה-חוזרת-בלולאה (re_do אינסופי) | counter `re_do_count`, אזהרה מעל 2 |
| R7 | נמסר-בטעות (אופטיקאי לחץ "נמסר" בטעות) | undo בתוך 5 דקות + log |
| R8 | קטגוריה ב-M9 ≠ קטגוריה ב-M7 | M7 הוא source-of-truth; M9 קורא בלבד |

---

## 9. To-dos לפני LIVE

- [ ] **M1-extension SPEC** — 3 טבלאות-מלאי (עדשות, עדשות-מגע, אביזרים). Blocker.
- [ ] **M7 SPEC** — לכלול `lab_flow` כשדה על תת-הזמנה + 3 כפתורים בטופס-יצירה + טופס-הדפסה-עם-ברקוד-לקופסה.
- [ ] **M13 Brief update** — D5 הצטרפות + שני סוגי-חברות (בסיסי-חינם / משלם).
- [ ] **M11 SPEC** — דשבורד-מנהל היברידי (KPI + גרף + טבלאות) מעל-Views של M9.
- [ ] **M12 templates** — 6 templates (§4.4) ב-3 שפות × 3 ערוצים.
- [ ] **מודול-הרשאות update** — 15 permission keys חדשים של M9.
- [ ] **Cron jobs:** Clock Engine (כל דקה), Box-overdue check (יומי).
- [ ] **Migration plan** — אין migration נדרש (M9 מתחיל-נקי). מודול-משלוחים-הישן של M1 לא בשימוש פעיל.

---

## 10. Out-of-scope ל-LIVE day-1

- מעבדה-ראשית רב-סניפית (F1)
- API לספקים (F2)
- אפליקציית-עובד (F3)
- אוטומציית-פיצוי-AI (F4)
- API לחברות-שליחויות (F5)
- VIP override (F6)
- תמונת-תעודת-משלוח / משקל-קופסה
- מעקב-אוטומטי של פגיעות-מ-טמפרטורה / צילום-פגם

---

## 11. Decisions Log — 25 החלטות

ראה `decisions/M9.md` לתיעוד-מלא של כל 25 ההחלטות שנעשו במהלך כתיבת ה-Brief.

תקציר:
| # | נושא | החלטה |
|---|---|---|
| D1 | סקופ | מערכת-מקדונלדס מלאה, חיצוני+פנימי, מודול-חובה |
| D2 | תוכנית הישנה | לבטל "M9 מרחיב shipments" — בונים עצמאי |
| D3 | מודול-משלוחים-ישן M1 | מבוטל; הכל עובר ל-M9 |
| D4 | שני שעונים | עיבוד + איסוף, נפרדים |
| D5 | מסך-מקדונלדס | סקיצה ג v2 (עדיפות מסכן + sub-row) |
| D6 | הודעת-מוכן | ידני מ-M7 (לא אוטומטי) |
| D7 | קטגוריות + פלואו | קטגוריות מ-M7 + שדה `lab_flow` חדש בתת-הזמנה |
| D8 | שינוי-פלואו | אזהרה + סיבה-חובה |
| D9 | פיצוי | מטריצה מוגדרת מראש, פר-(קטגוריה × רמת-עיכוב), שיקול-דעת-מנהל |
| D10 | מבנה-סניפים | תשתית מלאה, פריזמה=סניף-יחיד |
| D11 | סף = פר-קטגוריה | (לא פר-פלואו) |
| D12 | 3 ספים | צהוב / אדום / פיצוי (עיבוד) + צהוב / אדום (איסוף) |
| D13 | התראות | סאונד מסך + WhatsApp בפיצוי-בלבד |
| D14 | זיכויים | טבלה-נפרדת ב-M9 + שעון-זיכוי פר-ספק |
| D15 | קופסה-יוצאת ↔ נכנסת | רבים-לרבים (לא 1:1) |
| D16 | ברקוד-ספק "נדבק" | להזמנות שבקופסה |
| D17 | היסטוריית-משלוחים-להזמנה | מסלול-מעקב מלא ב-M7 |
| D18 | קופסה-נכנסת | drawer לטיפול-יחיד-מקצה-לקצה |
| D19 | קופסה-נכנסת = ישות-מלאה | 3 סוגים: חזרה / סחורה / בין-סניפי |
| D20 | פלואו-3 | שולחים ישר למעבדה-חיצונית (לא 2 שלבים) |
| D21 | סטטוסים | 5 עמודות-תאריך אחידות + תווית-דינמית פר-פלואו |
| D22 | הרשאות | מודול-מרכזי, אין מטריצה ב-M9 |
| D23 | דוחות | 3 דוחות-ליבה ב-M11 |
| D24 | מועדון | חבר-בסיסי-חינם נוצר אוטומטית בקבלת-פיצוי |
| D25 | דשבורד-מנהל | סקיצה ג היברידי, ברירת-מחדל גמישה |

---

## 12. Skill improvement proposals

(Foreman self-review — to apply before next module's Brief)

### Author-skill (opticup-architect)

**Proposal 1:** When user describes a process from a legacy system (Access in Prizma's case), apply Pattern P32 (Anti-Legacy-Pattern Check) automatically. Don't replicate workarounds for tech limitations we don't have. M9 had 3 instances: cumbersome lab-tracking in Access (only 7.4% recorded `dworka` start dates) → M9 now enforces logging from box-creation; manual code-passing to family-redemption (M13 D13) → shared household pool; 5 ספים on every event manually → automated clock engine.

**Proposal 2:** When entity-relationships are complex (M9 had 8 entities + 5 engines), build sketches BEFORE the Brief (Pattern P34) AND show the user 3 alternatives per screen before committing. M9 had 4 sketch-cycles; each one improved by user feedback before settling. Time spent on sketches saves 4x the time on Brief revisions.

**Proposal 3:** Always probe "what's the equivalent in the existing system?" before designing. M9 used Access's existing 12-column table as a starting point — not invented from scratch. Saves rejection-risk + matches user mental model.

### Executor-skill (opticup-executor)

**Proposal 1:** M9 has 8 entities + 5 engines. Each engine is independently-testable. SPEC should split M9 into ~6 phases: (1) Schema + RLS + seed data, (2) Clock engine + delay calculations, (3) KDS screen + sub-row, (4) Shipping boxes (outbound + inbound), (5) Compensation matrix + manager workflow, (6) Reports views + dashboard wiring. Don't ship as one phase.

**Proposal 2:** M9 is a P19 (config-driven) module with 8 config tables (`lab_categories`, `lab_compensation_tiers`, `lab_damage_reasons`, `lab_couriers`, `lab_supplier_thresholds`, etc.). Settings UI should be built in Phase 1 alongside schema — not as Phase 6 polish. Otherwise development is blocked on hardcoded test values.

---

## 13. Open follow-ups

- M13 Brief needs minor amendment (basic-free membership type)
- M7 SPEC needs `lab_flow` field on sub-orders + 3-button form
- M1 extension is a hard blocker — must be specced first

---

*Brief drafted 2026-05-10. 25 decisions locked. 4 sketch files in same folder. Ready for Module Strategist to write SPECs.*
